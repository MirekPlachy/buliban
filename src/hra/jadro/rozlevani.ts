/**
 * Fáze 2 — rozlévání. Jádro celé hry (kap. 4).
 *
 * Železná pravidla, ze kterých vychází celý zbytek souboru:
 *  - do každého panáku se lije **právě jednou**, včetně posledního,
 *  - po puštění se láhev sama přesune nad další panák, hráč cíl nevybírá,
 *  - **není návrat** — do panáku, kde už něco je, se nedá dolít,
 *  - co zůstane v láhvi, je chyba: barman v láhvi nenechá nic.
 *
 * Poslední pravidlo nahradilo dřívější automatické dolití posledního panáku.
 * Tím se ale ztratil trest za špatný odhad celkového objemu, takže ho musí
 * nést bodování: `skore.ts` měří odchylku od **cíle**, ne od dosaženého
 * průměru. Bez té dvojice by stačilo lít konzistentně cokoli.
 *
 * Stav se mění na místě, ne kopírováním — při šedesáti krocích za sekundu
 * je to zbytečný odpad. Testovatelnost tím netrpí: `krok()` nesahá na nic
 * mimo předaný stav a bez prohlížeče běží stejně.
 */

import {
  CIL_MAX_ML,
  CIL_MIN_ML,
  DOBEH_S,
  DOKAP_MAX_ML,
  DOKAP_MIN_ML,
  DOZNENI_S,
  GRAVITACE_ROZSAH,
  GRAVITACE_ZAKLAD,
  KAPACITA_LAHVE_ML,
  KAPACITA_PANAKU_ML,
  KROK_S,
  NAKLON_S,
  PRELITI_S,
  PRESUN_S,
} from '../ladeni.ts';
import { level } from '../levely.ts';
import type { Level } from '../levely.ts';
import { profil } from './lahev.ts';
import type { ProfilLahve } from './lahev.ts';
import { nahoda } from './nahoda.ts';
import type { Nahoda } from './nahoda.ts';
import { profilPanaku } from './panak.ts';
import type { ProfilPanaku } from './panak.ts';
import { gravitace, naklon, prutok, prutokMaxProLevel } from './prutok.ts';

export interface Konfigurace {
  level: Level;
  panaku: number;
  /** Kolik má být v každém panáku. Hráči se neukazuje (výjimka: ryska na L1–L2). */
  cilMl: number;
  objemMl: number;
  /** Vždy 0,5 l. Zůstává v konfiguraci, ať se model průtoku nemusí ptát jinam. */
  kapacitaLahveMl: number;
  prutokMax: number;
  lahev: ProfilLahve;
  panak: ProfilPanaku;
  seed: number;
}

export type FazeRozlevani =
  | 'ceka'
  | 'naklani'
  | 'leje'
  | 'dokapava'
  | 'presouva'
  | 'dozniva'
  | 'hotovo';

export interface StavRozlevani {
  konfig: Konfigurace;
  /** Kolik ml je v kterém panáku. Délka `N`. */
  panaky: number[];
  /** Modifikátor „host si panák odnese" — jen pro vykreslení, do skóre se počítá. */
  odnesene: boolean[];
  aktivni: number;
  zbytekMl: number;
  faze: FazeRozlevani;
  /** Herní čas fáze 2 v sekundách. Jde z kroků, ne z hodin. */
  casS: number;
  drzeniS: number;
  /** Náklon láhve ⟨0,1⟩. Teče se až při jedničce. */
  naklonPodil: number;
  fazeBublani: number;
  casovacS: number;
  dokapCelkemMl: number;
  dokapDodanoMl: number;
  dokapUplynuloS: number;
  rozlitoMl: number;
  /** Kolik se rozlilo u kterého panáku. Kaluž na stole má zůstat tam, kde vznikla. */
  rozlitoUPanaku: number[];
  prelitiPocet: number;
  prelitoTed: boolean;
  /** Doběh animace přelití. Herní čas, ne hodiny prohlížeče. */
  prelitiCasS: number;
  /** Poslední spočítaný průtok v ml/s. Pro vykreslení a zvuk. */
  prutokMlS: number;
  nahoda: Nahoda;
}

function zaokrouhli(x: number, desetinnych: number): number {
  const m = 10 ** desetinnych;
  return Math.round(x * m) / m;
}

/**
 * Vylosuje podmínky levelu. Ze stejného seedu a čísla levelu vyjde vždycky
 * totéž — základ reprodukce chyb z playtestu i případné denní výzvy.
 */
export function zalozKonfiguraci(cisloLevelu: number, seed: number): Konfigurace {
  const l = level(cisloLevelu);
  const r = nahoda(seed).odbocka(l.cislo);

  const cilMl = zaokrouhli(r.rozsah(CIL_MIN_ML, CIL_MAX_ML), 1);

  return {
    // Kopie, ne sdílený řádek tabulky: debug panel umí amplitudu bublání
    // vypnout a nesmí tím rozbít level pro všechny další běhy.
    level: { ...l, modifikatory: [...l.modifikatory] },
    panaku: l.panaku,
    cilMl,
    objemMl: zaokrouhli(cilMl * l.panaku, 1),
    kapacitaLahveMl: KAPACITA_LAHVE_ML,
    prutokMax: prutokMaxProLevel(l.cislo),
    lahev: profil(l.tvar),
    panak: profilPanaku(l.panak),
    seed,
  };
}

export function zalozStav(konfig: Konfigurace): StavRozlevani {
  return {
    konfig,
    panaky: new Array<number>(konfig.panaku).fill(0),
    odnesene: new Array<boolean>(konfig.panaku).fill(false),
    aktivni: 0,
    zbytekMl: konfig.objemMl,
    faze: 'ceka',
    casS: 0,
    drzeniS: 0,
    naklonPodil: 0,
    fazeBublani: 0,
    casovacS: 0,
    dokapCelkemMl: 0,
    dokapDodanoMl: 0,
    dokapUplynuloS: 0,
    rozlitoMl: 0,
    rozlitoUPanaku: new Array<number>(konfig.panaku).fill(0),
    prelitiPocet: 0,
    prelitoTed: false,
    prelitiCasS: 0,
    prutokMlS: 0,
    nahoda: nahoda(konfig.seed).odbocka(konfig.level.cislo + 1000),
  };
}

/**
 * Nalije do aktivního panáku. Co se nevejde, se rozlije a je nenávratně pryč
 * — hra nikde nedovolí přebytek zachránit.
 */
function nalij(stav: StavRozlevani, ml: number): void {
  const vzato = Math.min(Math.max(0, ml), stav.zbytekMl);
  if (vzato <= 0) return;

  stav.zbytekMl -= vzato;
  const i = stav.aktivni;
  const misto = KAPACITA_PANAKU_ML - stav.panaky[i];

  if (vzato <= misto) {
    stav.panaky[i] = stav.panaky[i] + vzato;
    return;
  }

  stav.panaky[i] = KAPACITA_PANAKU_ML;
  stav.rozlitoMl += vzato - misto;
  stav.rozlitoUPanaku[i] += vzato - misto;
  stav.prelitiCasS = PRELITI_S;
  // Přelití je jedna událost za panák, ne pokuta za každý krok simulace.
  if (!stav.prelitoTed) {
    stav.prelitiPocet += 1;
    stav.prelitoTed = true;
  }
}

function zahajDokap(stav: StavRozlevani): void {
  // Kolik dokape, je DETERMINISTICKÉ — plyne z náklonu a z toho, kolik je
  // v láhvi. Rozsah 1,5–3 ml z kap. 4.4 tedy popisuje rozpětí napříč
  // podmínkami, ne los při každém puštění.
  //
  // Je to výklad, ne doslovné čtení dokumentu, a stojí za ním jeho vlastní
  // věta: „Dokapání je to, co se hráč učí předvídat, a tedy hlavní osa
  // zlepšování." Náhodných 1,5–3 ml na cíl 10–40 ml se předvídat nedá.
  const podilToku =
    naklon(stav.drzeniS) *
    (gravitace(stav.zbytekMl, stav.konfig.kapacitaLahveMl) /
      (GRAVITACE_ZAKLAD + GRAVITACE_ROZSAH));
  const zaklad = DOKAP_MIN_ML + (DOKAP_MAX_ML - DOKAP_MIN_ML) * podilToku;

  stav.dokapCelkemMl = Math.min(zaklad, stav.zbytekMl);
  stav.dokapDodanoMl = 0;
  stav.dokapUplynuloS = 0;
  stav.prutokMlS = 0;
  stav.faze = 'dokapava';
}

function zahajDozneni(stav: StavRozlevani): void {
  stav.casovacS = DOZNENI_S;
  stav.faze = 'dozniva';
}

function posun(stav: StavRozlevani): void {
  if (stav.konfig.level.modifikatory.includes('host-odnese')) {
    stav.odnesene[stav.aktivni] = true;
  }

  // Poslední panák uzavřen, nebo došel rum dřív než panáky. Zbývající
  // zůstanou prázdné a odchylka od cíle to spočítá.
  if (stav.aktivni + 1 >= stav.konfig.panaku || stav.zbytekMl <= 0) {
    zahajDozneni(stav);
    return;
  }

  stav.aktivni += 1;
  stav.prelitoTed = false;
  stav.faze = 'ceka';
}

/**
 * Jeden pevný krok simulace. `drzi` je stav tlačítka / prstu / mezerníku —
 * hra nerozlišuje čím, gesto je na všech platformách stejné.
 *
 * Vrací fázi po kroku. Volající ji potřebuje číst z návratové hodnoty:
 * překladač nevidí, že se stav uvnitř mění, a ve smyčce by si `stav.faze`
 * zúžil na hodnotu před prvním voláním.
 */
export function krok(stav: StavRozlevani, drzi: boolean): FazeRozlevani {
  if (stav.faze === 'hotovo') return stav.faze;

  stav.casS += KROK_S;
  stav.prelitiCasS = Math.max(0, stav.prelitiCasS - KROK_S);

  // Náklon láhve dojíždí sám podle toho, jestli se má lít. Jedna proměnná
  // pro obě strany pohybu: při puštění během naklánění se láhev stejnou
  // rychlostí narovná zpátky.
  const cilNaklonu = stav.faze === 'naklani' || stav.faze === 'leje' ? 1 : 0;
  const zmena = Math.min(KROK_S / NAKLON_S, Math.abs(cilNaklonu - stav.naklonPodil));
  stav.naklonPodil += Math.sign(cilNaklonu - stav.naklonPodil) * zmena;

  switch (stav.faze) {
    case 'ceka': {
      if (drzi) {
        stav.faze = 'naklani';
        stav.drzeniS = 0;
        stav.fazeBublani = stav.nahoda.rozsah(0, Math.PI * 2);
      }
      break;
    }

    case 'naklani': {
      // Puštění během otáčení nic nestojí — nic se nenalilo, panák zůstává
      // otevřený a láhev se narovná. Trestat záměr by bylo nespravedlivé.
      if (!drzi) {
        stav.faze = 'ceka';
        break;
      }
      if (stav.naklonPodil >= 1) stav.faze = 'leje';
      break;
    }

    case 'leje': {
      if (!drzi || stav.zbytekMl <= 0) {
        zahajDokap(stav);
        break;
      }
      stav.drzeniS += KROK_S;
      stav.prutokMlS = prutok({
        prutokMax: stav.konfig.prutokMax,
        drzeniS: stav.drzeniS,
        casS: stav.casS,
        zbytekMl: stav.zbytekMl,
        kapacitaLahveMl: stav.konfig.kapacitaLahveMl,
        amplituda: stav.konfig.level.amplituda,
        faze: stav.fazeBublani,
        sum: stav.nahoda.dalsi(),
      });
      nalij(stav, stav.prutokMlS * KROK_S);
      break;
    }

    case 'dokapava': {
      stav.dokapUplynuloS += KROK_S;
      const u = Math.min(1, stav.dokapUplynuloS / DOBEH_S);
      // Integrál lineárně slábnoucího proudu. Počítá se z celkového podílu,
      // ne po přírůstcích, aby se za těch devět kroků nenasčítala odchylka.
      const maBytDodano = stav.dokapCelkemMl * (1 - (1 - u) * (1 - u));
      nalij(stav, maBytDodano - stav.dokapDodanoMl);
      stav.dokapDodanoMl = maBytDodano;

      if (u >= 1) {
        stav.casovacS = PRESUN_S;
        stav.faze = 'presouva';
      }
      break;
    }

    case 'presouva': {
      stav.casovacS -= KROK_S;
      if (stav.casovacS <= 0) posun(stav);
      break;
    }

    case 'dozniva': {
      stav.casovacS -= KROK_S;
      if (stav.casovacS <= 0) stav.faze = 'hotovo';
      break;
    }
  }

  return stav.faze;
}

/** Kolik panáků ještě čeká. Plánování je legitimní součást hry (kap. 4.5). */
export function zbyvaPanaku(stav: StavRozlevani): number {
  return stav.konfig.panaku - stav.aktivni - 1;
}

/**
 * Podíl výšky hladiny ve svisle stojící láhvi ⟨0,1⟩ — přes profil tvaru,
 * ne lineárně. Vykreslování si při náklonu počítá hladinu z objemu samo
 * (`profil.ts`, `rovinaProObjem`); tohle je to, co odečítá hráč.
 */
export function hladinaVLahvi(stav: StavRozlevani): number {
  return stav.konfig.lahev.vyskaZObjemu(stav.zbytekMl / stav.konfig.kapacitaLahveMl);
}

/**
 * Podíl výšky hladiny v panáku ⟨0,1⟩. Taky přes profil — u kónického
 * a břichatého panáku je „do poloviny" jiný objem než polovina.
 */
export function hladinaVPanaku(stav: StavRozlevani, index: number): number {
  return stav.konfig.panak.vyskaZObjemu(stav.panaky[index] / KAPACITA_PANAKU_ML);
}
