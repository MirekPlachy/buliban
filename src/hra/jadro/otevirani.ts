/**
 * Fáze 1 — otevření láhve (kap. 3).
 *
 * Krátká, svižná, **nelze ji prohrát** — jde jen být pomalý. Proto tu není
 * žádná pokuta: minutý zásah stojí půl sekundy a ta se odečte z bonusu za
 * svižnost. Trestat bodově něco, co se hraje pět vteřin na začátku levelu,
 * by hráče naučilo, že hra začíná ztrátou.
 *
 * Dva úkony za sebou:
 *  1. **pečeť** — opakovaný stisk, body 0, ale čas běží,
 *  2. **korek** — timing klik do kmitajícího pásma, tři zelené nebo dva
 *     perfektní zásahy a korek je venku.
 *
 * Vstup je **hrana, ne držení**: `krok()` bere `stisk`, který je pravdivý jen
 * v tom kroku, kdy tlačítko sjelo dolů. Fáze 2 naopak drží — a je to tak
 * schválně, protože obojí dělá s lahví něco jiného.
 *
 * Bez DOM, jako celé `jadro/`.
 */

import {
  BODY_PERFEKTNI,
  BODY_ZELENY,
  KOREK_PERFEKTNI,
  KOREK_ZASEK_S,
  KOREK_ZELENY,
  KROK_S,
  PECET_DOZNENI_S,
  PECET_STISKU,
  SVIZNOST_REZERVA_S,
  SVIZNOST_ZA_S,
} from '../ladeni.ts';
import { level } from '../levely.ts';
import type { Level } from '../levely.ts';
import { rychlostProLevel, sirkaPasmaProLevel, vyhodnotZasah } from './pasmo.ts';
import type { Zasah } from './pasmo.ts';

export type FazeOtevirani = 'pecet' | 'pecetHotova' | 'korek' | 'zasek' | 'hotovo';

export interface StavOtevirani {
  level: Level;
  faze: FazeOtevirani;
  /** Sedřená část pečeti ⟨0,1⟩. */
  pecetPodil: number;
  /** Jak daleko je korek venku ⟨0,1⟩. Při jedničce je fáze hotová. */
  korekPodil: number;
  /** Herní čas celé fáze. Počítá se do bonusu za svižnost (kap. 3.1). */
  casS: number;
  /**
   * Čas, který pohání kmitání ukazatele. Běží i během záseku, aby se
   * ukazatel po prodlevě neobjevil skokem jinde, než kde zmizel.
   */
  ukazatelCasS: number;
  zasekS: number;
  /** Rychlost ukazatele a šířka pásma podle levelu. */
  rychlost: number;
  sirkaPasma: number;
  body: number;
  zasahu: number;
  /** Poslední zásah a jak dávno — pro odezvu ve scéně. */
  posledni: Zasah | null;
  posledniPredS: number;
}

export function zalozOtevirani(cisloLevelu: number): StavOtevirani {
  const l = level(cisloLevelu);
  return {
    level: l,
    faze: 'pecet',
    pecetPodil: 0,
    korekPodil: 0,
    casS: 0,
    ukazatelCasS: 0,
    zasekS: 0,
    rychlost: rychlostProLevel(l.cislo),
    sirkaPasma: sirkaPasmaProLevel(l.cislo),
    body: 0,
    zasahu: 0,
    posledni: null,
    posledniPredS: 0,
  };
}

function zaznamenej(stav: StavOtevirani, zasah: Zasah): void {
  stav.posledni = zasah;
  stav.posledniPredS = 0;

  if (zasah === 'mimo') {
    // Zasekne se. Korek zůstane, kde byl — nevrací se, to by bylo trestání
    // za pokus a hráč by přestal mačkat.
    stav.zasekS = KOREK_ZASEK_S;
    stav.faze = 'zasek';
    return;
  }

  stav.zasahu += 1;
  stav.body += zasah === 'perfektni' ? BODY_PERFEKTNI : BODY_ZELENY;
  stav.korekPodil += zasah === 'perfektni' ? KOREK_PERFEKTNI : KOREK_ZELENY;

  // Tři zelené dají 0,999… — proto se porovnává s rezervou, ne s jedničkou.
  if (stav.korekPodil >= 1 - 1e-6) {
    stav.korekPodil = 1;
    stav.faze = 'hotovo';
  }
}

/**
 * Jeden pevný krok. `stisk` je **hrana** — pravdivý jen v kroku, kdy
 * tlačítko sjelo dolů. Držení tady nic nedělá.
 *
 * Vrací fázi po kroku; volající si ji musí přečíst z návratové hodnoty,
 * ne ze `stav.faze` před voláním.
 */
export function krokOtevirani(stav: StavOtevirani, stisk: boolean): FazeOtevirani {
  if (stav.faze === 'hotovo') return stav.faze;

  stav.casS += KROK_S;
  stav.ukazatelCasS += KROK_S;
  stav.posledniPredS += KROK_S;

  switch (stav.faze) {
    case 'pecet': {
      if (stisk) {
        stav.pecetPodil = Math.min(1, stav.pecetPodil + 1 / PECET_STISKU);
        if (stav.pecetPodil >= 1) {
          stav.zasekS = PECET_DOZNENI_S;
          stav.faze = 'pecetHotova';
        }
      }
      break;
    }

    case 'pecetHotova': {
      // Krátká prodleva, ať je vidět, že je hrdlo volné, než začne kmitat
      // ukazatel. Bez ní obě části splynou v jedno mačkání.
      stav.zasekS -= KROK_S;
      if (stav.zasekS <= 0) {
        stav.faze = 'korek';
        stav.ukazatelCasS = 0;
      }
      break;
    }

    case 'korek': {
      if (stisk) zaznamenej(stav, vyhodnotZasah(pozice(stav), stav.sirkaPasma));
      break;
    }

    case 'zasek': {
      stav.zasekS -= KROK_S;
      if (stav.zasekS <= 0) stav.faze = 'korek';
      break;
    }
  }

  return stav.faze;
}

/** Poloha ukazatele ⟨0,1⟩. Scéna i ukázka ji čtou odsud, ne z vlastního času. */
export function pozice(stav: StavOtevirani): number {
  const faze = (stav.ukazatelCasS * stav.rychlost) % 1;
  return faze < 0.5 ? faze * 2 : 2 - faze * 2;
}

/**
 * Body za fázi 1: zásahy plus bonus za svižnost (kap. 3.2).
 *
 * Dokument uvádí strop ~280 bodů, což počítá se třemi zásahy po 60. Dva
 * perfektní zásahy ale korek vytáhnou dřív, takže skutečný strop je nižší
 * (~120 + bonus) — a přesně o to jde: perfektní zásah se vyplácí časem,
 * ne body. Rychlejší otevření = větší bonus.
 */
export function bodyZaOtevirani(stav: StavOtevirani): number {
  const sviznost = Math.max(0, Math.round((SVIZNOST_REZERVA_S - stav.casS) * SVIZNOST_ZA_S));
  return stav.body + sviznost;
}

export function bonusZaSviznost(stav: StavOtevirani): number {
  return Math.max(0, Math.round((SVIZNOST_REZERVA_S - stav.casS) * SVIZNOST_ZA_S));
}
