/**
 * Přehrání levelu ze scénáře, bez prohlížeče.
 *
 * Tohle je to, co nahrazuje klikání a screenshoty. Ladit `FLOW_MAX`,
 * dokapání nebo `CV_max` jde jedním příkazem v terminálu (`harness.ts`)
 * a stejná funkce pak slouží testům.
 *
 * Ze seedu a záznamu vstupů musí vzejít identický výsledek — základ
 * reprodukce chyb z playtestu (kap. 15).
 *
 * Obsluhuje **všechny tři fáze**. Fáze 2 se přehrává ze scénáře držení,
 * fáze 1 a 3 z plánu (kam mířit, jakou metodou hřát, čím zapálit) — protože
 * u nich je vstup rozhodnutí, ne délka stisku.
 */

import { KROK_S, SKRTNUTI_RYCHLOST } from '../ladeni.ts';
import { metoda } from './metody.ts';
import type { MetodaId } from './metody.ts';
import { krokOtevirani, pozice, zalozOtevirani } from './otevirani.ts';
import type { StavOtevirani } from './otevirani.ts';
import { dalsiPruchodStredem } from './pasmo.ts';
import {
  krokRitualu,
  kvalitaZasahu,
  poziceSkrtnuti,
  zalozRitual,
} from './ritual.ts';
import type { Ohen, Poloha, StavRitualu, VstupRitualu } from './ritual.ts';
import { krok, zalozKonfiguraci, zalozStav } from './rozlevani.ts';
import type { FazeRozlevani, Konfigurace, StavRozlevani } from './rozlevani.ts';
import { vyhodnot } from './skore.ts';
import type { Vysledek } from './skore.ts';
import type { Nahoda } from './nahoda.ts';

export interface Prehrani {
  konfig: Konfigurace;
  stav: StavRozlevani;
  vysledek: Vysledek;
  /** `false`, když scénář nedodal dost nalití a level zůstal rozehraný. */
  dokonceno: boolean;
}

/** Kolik kroků smí trvat doběh a přesun, než to prohlásíme za zacyklení. */
const POJISTKA = 10_000;

function dojedNalevani(stav: StavRozlevani): void {
  let faze: FazeRozlevani = stav.faze;
  let pojistka = 0;
  while (faze !== 'ceka' && faze !== 'hotovo' && pojistka < POJISTKA) {
    faze = krok(stav, false);
    pojistka += 1;
  }
}

/**
 * `drzeni` je posloupnost délek stisku v sekundách, jedna položka na panák.
 * Hráč lije i posledního, takže smysluplný scénář má `N` položek.
 *
 * Pozor: stisk kratší než `NAKLON_S` láhev jen nakloní a zase narovná, aniž
 * by cokoli nateklo — panák zůstane otevřený a další položka scénáře jde
 * do něj.
 */
export function prehraj(cisloLevelu: number, seed: number, drzeni: number[]): Prehrani {
  const konfig = zalozKonfiguraci(cisloLevelu, seed);
  const stav = zalozStav(konfig);

  for (const delka of drzeni) {
    let faze: FazeRozlevani = stav.faze;
    if (faze === 'hotovo') break;
    const kroku = Math.max(1, Math.round(delka / KROK_S));
    for (let i = 0; i < kroku && faze !== 'hotovo'; i += 1) faze = krok(stav, true);
    dojedNalevani(stav);
  }

  dojedNalevani(stav);

  return { konfig, stav, vysledek: vyhodnot(stav), dokonceno: stav.faze === 'hotovo' };
}

/**
 * Scénář „dokonalý barman": drží přesně tak dlouho, aby v každém panáku byl
 * cílový díl. Délku hledá půlením intervalu na simulaci samotné, takže
 * zohlední i náklon láhve, náběh, bublání a dokapání.
 *
 * Slouží ke dvěma věcem: ověřit, že hra vůbec jde zahrát na plný počet bodů
 * (kdyby nešla, je špatně model průtoku, ne hráč), a přehrát ukázku na
 * začátku levelu 1 — hra tam hraje sama sebe, po stejném `krok()`.
 */
export function idealniDrzeni(cisloLevelu: number, seed: number): number[] {
  return drzeniProCil(cisloLevelu, seed, zalozKonfiguraci(cisloLevelu, seed).cilMl);
}

/**
 * Držení, které do každého panáku dostane `cilMl`. Půlením intervalu na
 * simulaci samotné, takže zohlední náklon láhve, náběh, bublání i dokapání.
 */
export function drzeniProCil(cisloLevelu: number, seed: number, cilMl: number): number[] {
  const konfig = zalozKonfiguraci(cisloLevelu, seed);
  const delky: number[] = [];

  for (let i = 0; i < konfig.panaku; i += 1) {
    let lo = 0;
    let hi = 8;
    for (let pokus = 0; pokus < 24; pokus += 1) {
      const stred = (lo + hi) / 2;
      const { stav } = prehraj(cisloLevelu, seed, [...delky, stred]);
      if (stav.panaky[i] < cilMl) lo = stred;
      else hi = stred;
    }
    delky.push((lo + hi) / 2);
  }

  return delky;
}

/**
 * Model hráče z masa a kostí. Slouží **ke kalibraci tolerancí** — ideální
 * držení je lepší než kdokoli živý, takže se podle něj obtížnost nastavit
 * nedá.
 *
 * Dvě chyby, každá jiné povahy:
 *  - `odhad` je systematický: hráč špatně přečte, kolik je v láhvi, a mýlí
 *    se pak stejným směrem u všech panáků. Tohle je ta chyba, kterou hra
 *    chce měřit, a proto ji staré bodování okolo průměru vůbec nevidělo.
 *  - `casovani` je náhodné: každé puštění je o kousek dřív nebo později.
 */
export interface Hrac {
  /** Relativní chyba odhadu objemu v láhvi (0,10 = plete se o desetinu). */
  odhad: number;
  /** Rozptyl přesnosti puštění v sekundách. */
  casovani: number;
}

/** Normální rozdělení z rovnoměrného. Box–Muller. */
function gauss(r: Nahoda): number {
  const u = Math.max(1e-12, r.dalsi());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r.dalsi());
}

export function lidskeDrzeni(
  cisloLevelu: number,
  seed: number,
  hrac: Hrac,
  r: Nahoda,
): number[] {
  const konfig = zalozKonfiguraci(cisloLevelu, seed);

  // Ryska cíl ukazuje, takže odhad nemá kde selhat. Slepá láhev ho naopak
  // znemožňuje — tam hráč střílí a tolerance to musí unést.
  let odhad = hrac.odhad;
  if (konfig.level.ryska) odhad *= 0.15;
  if (konfig.level.modifikatory.includes('slepe')) odhad *= 3;

  const domnelyCil = konfig.cilMl * (1 + gauss(r) * odhad);
  const zaklad = drzeniProCil(cisloLevelu, seed, Math.max(1, domnelyCil));

  return zaklad.map((d) => Math.max(0, d + gauss(r) * hrac.casovani));
}

// ------------------------------------------------- fáze 1 · otevření láhve

/**
 * Otevře láhev. `presnost` je podíl šířky zeleného pásma, do kterého se
 * scénář trefuje: 0,35 spolehlivě uvnitř zeleného, nad 0,5 už občas vedle.
 *
 * Mířit „přesně doprostřed" nejde a je to vlastnost hry, ne scénáře:
 * ukazatel se testuje jednou za krok simulace a za ten urazí
 * `2 × rychlost × KROK_S`, tedy na posledním levelu přes šest procent lišty.
 * Nekonečně úzký cíl by se dal minout i při dokonalém načasování — proto se
 * míří na **pásmo**, ne na bod.
 */
export function prehrajOtevirani(cisloLevelu: number, presnost = 0.35): StavOtevirani {
  const stav = zalozOtevirani(cisloLevelu);

  // Pečeť: stisk, pauza, stisk. Souvislé držení by nesedřelo nic.
  let pojistka = 0;
  while (stav.faze === 'pecet' && pojistka < 4000) {
    krokOtevirani(stav, true);
    krokOtevirani(stav, false);
    pojistka += 1;
  }

  const cil = presnost * stav.sirkaPasma;
  pojistka = 0;
  while (stav.faze !== 'hotovo' && pojistka < 20000) {
    const trefa = stav.faze === 'korek' && Math.abs(pozice(stav) - 0.5) <= cil;
    krokOtevirani(stav, trefa);
    pojistka += 1;
  }

  return stav;
}

// ------------------------------------------ fáze 3 · zahřátí a vypuštění

export interface PlanRitualu {
  poloha: Poloha;
  metodaId: MetodaId;
  /** Při jaké teplotě pustit. Setrvačnost a chladnutí přijdou až potom. */
  pustitPri: number;
  ohen: Ohen;
}

const nic: VstupRitualu = { drzi: false, stisk: false, volba: null };
const drz: VstupRitualu = { drzi: true, stisk: false, volba: null };

/**
 * Odehraje rituál podle plánu. Vrací stav po doznění — tedy včetně toho,
 * jestli se Buliban vypustil a za kolik bodů.
 *
 * Škrtnutí zápalkou i držení plamene jsou vedené na jistotu: cílem téhle
 * funkce je změřit, co udělá **teplota**, ne jestli hráč trefí zápalku.
 */
export function prehrajRitual(
  cisloLevelu: number,
  seed: number,
  plan: PlanRitualu,
): StavRitualu {
  const stav = zalozRitual(cisloLevelu, seed);
  krokRitualu(stav, { ...nic, volba: { druh: 'poloha', poloha: plan.poloha } });
  krokRitualu(stav, { ...nic, volba: { druh: 'metoda', metoda: plan.metodaId } });

  let pojistka = 0;
  while (stav.faze === 'zahrivani' && stav.teplota < plan.pustitPri && pojistka < 20000) {
    krokRitualu(stav, drz);
    pojistka += 1;
  }
  if (stav.faze === 'zahrivani') {
    krokRitualu(stav, { ...nic, volba: { druh: 'uzaver' } });
  }

  pojistka = 0;
  while (stav.faze !== 'hotovo' && pojistka < 40000) {
    let vstup: VstupRitualu = drz;

    if (stav.faze === 'ohen') {
      vstup = { ...nic, volba: { druh: 'ohen', ohen: plan.ohen } };
    } else if (stav.faze === 'skrtani') {
      // Škrtnout přesně ve chvíli, kdy ukazatel míří středem.
      vstup = { ...nic, stisk: Math.abs(poziceSkrtnuti(stav) - 0.5) < 0.06 };
    } else if (stav.faze === 'zahrivani') {
      // Další pokus po neúspěchu: dohřát a jít znovu.
      vstup =
        stav.teplota < plan.pustitPri ? drz : { ...nic, volba: { druh: 'uzaver' } };
    }

    krokRitualu(stav, vstup);
    pojistka += 1;
  }

  return stav;
}

/**
 * Při jaké teplotě pustit, aby zážeh přišel přesně uprostřed pásma.
 *
 * Půlením intervalu na simulaci samotné, takže to zohlední setrvačnost
 * metody i to, o kolik láhev vychladne během uzávěru, volby ohně a čekání
 * na zážeh. Přesně tohle je ta věc, kterou musí hráč odhadnout z pocitu —
 * a ukázka na levelu 1 mu ji předvede.
 */
export function idealniPustitPri(
  cisloLevelu: number,
  seed: number,
  poloha: Poloha,
  metodaId: MetodaId,
  ohen: Ohen,
): number {
  const m = metoda(metodaId);
  const strop = m.strop ?? 100;
  let lo = 0;
  let hi = strop;

  for (let pokus = 0; pokus < 26; pokus += 1) {
    const stred = (lo + hi) / 2;
    const stav = prehrajRitual(cisloLevelu, seed, {
      poloha,
      metodaId,
      pustitPri: stred,
      ohen,
    });
    // Teplota v okamžiku zážehu roste s tím, při jaké se pustilo — takže se
    // dá půlit, i když mezi tím leží celá zbylá fáze.
    if (stav.teplota < stav.pasmo.stred) lo = stred;
    else hi = stred;
  }

  return (lo + hi) / 2;
}

/** Plán, který na daném levelu vede na co nejlepší zážeh. Slouží ukázce. */
export function idealniPlan(cisloLevelu: number, seed: number): PlanRitualu {
  // Dlaně a zápalka: nejvyšší násobitel metody i bonus za tradici. Vertikální
  // poloha bere 1,3×, ale pásmo je o šest jednotek užší — pro ukázku se hodí
  // spíš to, co se dá předvést spolehlivě.
  const poloha: Poloha = 'horizontalni';
  const metodaId: MetodaId = 'dlane';
  const ohen: Ohen = 'zapalka';
  return {
    poloha,
    metodaId,
    ohen,
    pustitPri: idealniPustitPri(cisloLevelu, seed, poloha, metodaId, ohen),
  };
}

/** Jak dobrý zážeh plán dá. Pro harness a testy. */
export function kvalitaPlanu(cisloLevelu: number, seed: number, plan: PlanRitualu): number {
  const stav = prehrajRitual(cisloLevelu, seed, plan);
  return kvalitaZasahu(stav.teplota, stav.pasmo);
}

/** Kdy ukazatel škrtání příště projde středem. Pro ukázku. */
export function dalsiSkrtnuti(casS: number): number {
  return dalsiPruchodStredem(casS, SKRTNUTI_RYCHLOST);
}
