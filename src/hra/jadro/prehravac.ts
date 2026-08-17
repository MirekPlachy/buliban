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
 * Obsluhuje **obě fáze**. Rozlévání se přehrává ze scénáře držení, rituál
 * z plánu (jak rychle třít a kdy sáhnout po zápalce) — tam totiž není vstupem
 * délka stisku, ale dráha ruky.
 */

import { KROK_S, TEPLOTA_MAX } from '../ladeni.ts';
import { ZADNY_VSTUP, krokRitualu, zalozRitual } from './ritual.ts';
import type { StavRitualu, VstupRitualu } from './ritual.ts';
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

// ------------------------------------------ fáze 3 · zahřátí a vypuštění

/**
 * Model tření: kolik výšek láhve hráč projede za sekundu.
 *
 * Jeden tah nahoru a dolů po celé láhvi jsou dvě její výšky. Svižné tření je
 * tedy zhruba dvě výšky za sekundu; pomalé jedna, zběsilé čtyři. Odsud se
 * ladí `ZAHRATI_ZA_DRAHU` tak, aby zahřátí trvalo 4–5 sekund.
 */
export const TRENI_SVIZNE = 2;

export interface PlanRitualu {
  /** Rychlost tření ve výškách láhve za sekundu. */
  treniZaS: number;
  /** Při jaké teplotě sáhnout po zápalce. */
  vzitPri: number;
}

/**
 * Odehraje rituál podle plánu: tře, dokud není dost horko, pak vezme zápalku
 * a drží ji u hrdla, dokud to nechytne nebo nedohoří.
 *
 * Vrací stav po doznění — tedy včetně toho, jestli se Buliban vypustil
 * a za kolik bodů.
 */
export function prehrajRitual(
  cisloLevelu: number,
  seed: number,
  plan: PlanRitualu,
): StavRitualu {
  const stav = zalozRitual(cisloLevelu, seed);
  const treni = plan.treniZaS * KROK_S;

  let pojistka = 0;
  while (stav.faze !== 'hotovo' && pojistka < 40000) {
    let vstup: VstupRitualu = ZADNY_VSTUP;

    if (stav.faze === 'zahrivani') {
      // Dokud není dost horko, tře se. Pak se sáhne po zápalce.
      vstup =
        stav.teplota < plan.vzitPri
          ? { treni, drziZapalku: false, uHrdla: false }
          : { treni: 0, drziZapalku: true, uHrdla: false };
    } else if (stav.faze === 'zapalka') {
      vstup = { treni: 0, drziZapalku: true, uHrdla: true };
    }

    krokRitualu(stav, vstup);
    pojistka += 1;
  }

  return stav;
}

/**
 * Při jaké teplotě sáhnout po zápalce, aby zážeh přišel uprostřed pásma.
 *
 * Půlením intervalu na simulaci samotné, takže to zohlední i to, kolik láhev
 * vychladne, než zápalka doputuje k hrdlu a než to chytne. Přesně tohle musí
 * hráč odhadnout od oka — a ukázka na levelu 1 mu to předvede.
 */
export function idealniVzitPri(
  cisloLevelu: number,
  seed: number,
  treniZaS = TRENI_SVIZNE,
): number {
  let lo = 0;
  let hi = TEPLOTA_MAX;

  for (let pokus = 0; pokus < 26; pokus += 1) {
    const stred = (lo + hi) / 2;
    const stav = prehrajRitual(cisloLevelu, seed, { treniZaS, vzitPri: stred });
    // Teplota v okamžiku zážehu roste s tím, při jaké se sáhlo po zápalce —
    // dá se tedy půlit, i když mezi tím leží celý zbytek fáze.
    if (stav.teplota < stav.pasmo.stred) lo = stred;
    else hi = stred;
  }

  return (lo + hi) / 2;
}

/** Plán, který na daném levelu vede na co nejlepší zážeh. Slouží ukázce. */
export function idealniPlan(cisloLevelu: number, seed: number): PlanRitualu {
  return {
    treniZaS: TRENI_SVIZNE,
    vzitPri: idealniVzitPri(cisloLevelu, seed),
  };
}

/** Jak dlouho se při dané rychlosti tře, než je láhev dost horká. */
export function dobaTreniS(cisloLevelu: number, seed: number, treniZaS = TRENI_SVIZNE): number {
  const stav = zalozRitual(cisloLevelu, seed);
  const vzitPri = idealniVzitPri(cisloLevelu, seed, treniZaS);
  const treni = treniZaS * KROK_S;

  let kroku = 0;
  while (stav.teplota < vzitPri && kroku < 40000) {
    krokRitualu(stav, { treni, drziZapalku: false, uHrdla: false });
    kroku += 1;
  }
  return kroku * KROK_S;
}
