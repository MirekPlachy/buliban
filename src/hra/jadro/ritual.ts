/**
 * Fáze 3 — zahřátí prázdné láhve a vypuštění Bulibana (kap. 5).
 *
 * Dva úkony, obojí rukou, žádná nabídka:
 *
 *  1. **Tření.** Hráč jezdí prstem nebo myší po láhvi nahoru a dolů. Hřeje
 *     jen pohyb **po skle** — mimo láhev se nic neděje. Trvá to 4–5 sekund
 *     svižného tření, než se láhev dostane do pásma, kde chytne.
 *  2. **Zápalka.** Leží vedle láhve. Vzít a přiložit k hrdlu; po chvíli to
 *     chytne. Zápalka mezitím dohořívá, takže se nedá čekat donekonečna.
 *
 * Dřív tu byla nabídka sedmi metod zahřívání, volba polohy láhve, uzávěr
 * a timing lišta na škrtnutí. Všechno pryč: **rituál se má dělat rukama, ne
 * proklikat.** Tření je zároveň jediná mechanika ve hře, která odpovídá tomu,
 * co člověk u stolu doopravdy dělá.
 *
 * Tření se měří v **podílech výšky láhve**, ne v pixelech. Tentýž pohyb tak
 * na telefonu i na monitoru zahřeje stejně; v pixelech by byla hra na velké
 * obrazovce několikrát rychlejší.
 *
 * Bez DOM — trefování láhve a hrdla řeší scéna a sem posílá hotová čísla.
 */

import {
  CHLADNUTI,
  KROK_S,
  PASMO_MIN_SIRKA,
  PASMO_STRED,
  PASMO_UBYTEK_ZA_LEVEL,
  PASMO_ZAKLAD_SIRKA,
  TEPLOTA_MAX,
  TEPLOTA_PO_NEUSPECHU,
  ZAHRATI_ZA_DRAHU,
  ZAPALKA_HORI_S,
  ZAZEH_DOZNENI_S,
  ZAZEH_POKUSU,
  ZAZEH_PRODLEVA_MAX_S,
  ZAZEH_PRODLEVA_MIN_S,
  ZAZEH_SRAZKA_ZA_POKUS,
  ZAZEH_ZAKLAD_BODU,
} from '../ladeni.ts';
import { level } from '../levely.ts';
import type { Level } from '../levely.ts';
import { nahoda } from './nahoda.ts';
import type { Nahoda } from './nahoda.ts';

export type FazeRitualu = 'zahrivani' | 'zapalka' | 'zazeh' | 'ticho' | 'hotovo';

export interface Pasmo {
  stred: number;
  sirka: number;
}

export interface StavRitualu {
  level: Level;
  faze: FazeRitualu;
  pasmo: Pasmo;
  /** Zahřátí ve stylizovaných jednotkách 0–100. Nikdy ve °C (kap. 11). */
  teplota: number;
  pokus: number;
  casS: number;
  casovacS: number;
  /** Kolik zápalce zbývá hoření. */
  zapalkaZbyvaS: number;
  /** Kolik ještě musí hráč držet plamen u hrdla, než to chytne. */
  zazehZaS: number;
  /**
   * Ohořelou zápalku je nutné napřed zahodit. Bez tohohle si hráč, který
   * po dohoření nepustil tlačítko, vzal v témže kroku novou — a tři pokusy
   * mu proletěly mezi prsty, aniž by stihl cokoli udělat.
   */
  zahodZapalku: boolean;
  /** Dráha tření za poslední krok — jen pro odezvu ve scéně. */
  treniTed: number;
  kvalita: number;
  body: number;
  nahoda: Nahoda;
}

export interface VstupRitualu {
  /**
   * Dráha, kterou ukazatel urazil **po láhvi** za tenhle krok, v podílech
   * výšky láhve. Mimo sklo nebo bez stisku je nula.
   */
  treni: number;
  /** Hráč právě drží zápalku (vzal ji a nepustil). */
  drziZapalku: boolean;
  /** Zápalka je u hrdla. */
  uHrdla: boolean;
}

export const ZADNY_VSTUP: VstupRitualu = { treni: 0, drziZapalku: false, uHrdla: false };

/**
 * Cílové pásmo. Zužuje se s levelem — dokument pro fázi 3 žádné škálování
 * nemá, ale bez něj je rituál na posledním levelu stejně těžký jako na prvním.
 */
export function pasmoProLevel(cisloLevelu: number): Pasmo {
  return {
    stred: PASMO_STRED,
    sirka: Math.max(
      PASMO_MIN_SIRKA,
      PASMO_ZAKLAD_SIRKA - PASMO_UBYTEK_ZA_LEVEL * (cisloLevelu - 1),
    ),
  };
}

export function zalozRitual(cisloLevelu: number, seed: number): StavRitualu {
  const l = level(cisloLevelu);
  return {
    level: l,
    faze: 'zahrivani',
    pasmo: pasmoProLevel(l.cislo),
    teplota: 0,
    pokus: 1,
    casS: 0,
    casovacS: 0,
    zapalkaZbyvaS: 0,
    zazehZaS: 0,
    zahodZapalku: false,
    treniTed: 0,
    kvalita: 0,
    body: 0,
    nahoda: nahoda(seed).odbocka(l.cislo + 2000),
  };
}

/** `Q` z kap. 5.3: 1 uprostřed pásma, 0 na jeho okraji a dál. */
export function kvalitaZasahu(teplota: number, pasmo: Pasmo): number {
  const odchylka = Math.abs(teplota - pasmo.stred);
  return Math.min(1, Math.max(0, 1 - odchylka / (pasmo.sirka / 2)));
}

/** Je láhev dost horká, aby to chytlo? Scéna z toho barví teploměr. */
export function vPasmu(stav: StavRitualu): boolean {
  return kvalitaZasahu(stav.teplota, stav.pasmo) > 0;
}

function vezmiZapalku(stav: StavRitualu): void {
  stav.zapalkaZbyvaS = ZAPALKA_HORI_S;
  // Prodleva do zážehu se losuje při vzetí zápalky, ne při přiložení k hrdlu:
  // jinak by šlo ucuknutím losovat znovu, dokud nepadne krátká, a napětí by
  // se dalo obejít.
  stav.zazehZaS = stav.nahoda.rozsah(ZAZEH_PRODLEVA_MIN_S, ZAZEH_PRODLEVA_MAX_S);
  stav.faze = 'zapalka';
}

function vyhodnotZazeh(stav: StavRitualu): void {
  stav.kvalita = kvalitaZasahu(stav.teplota, stav.pasmo);
  stav.casovacS = ZAZEH_DOZNENI_S;

  // Mimo pásmo se nestane nic. Plamen dohoří, láhev byla vlažná — a hráč
  // dostane další pokus, ne konec.
  if (stav.kvalita <= 0) {
    stav.faze = 'ticho';
    return;
  }

  const srazka = Math.max(0, 1 - ZAZEH_SRAZKA_ZA_POKUS * (stav.pokus - 1));
  stav.body = Math.round(ZAZEH_ZAKLAD_BODU * stav.kvalita * srazka);
  stav.faze = 'zazeh';
}

/** Pokus selhal: zpět k tření, nebo konec fáze, když už žádný nezbývá. */
function selhal(stav: StavRitualu): void {
  if (stav.pokus >= ZAZEH_POKUSU) {
    stav.faze = 'hotovo';
    return;
  }
  stav.pokus += 1;
  stav.zapalkaZbyvaS = 0;
  // Novou zápalku dostane, až tu ohořelou zahodí. Jinak by mu tři pokusy
  // proletěly mezi prsty za dvanáct vteřin jednoho stisku.
  stav.zahodZapalku = true;
  // Láhev si drží část tepla — odpovídá „opakovanému zapálení" na webu.
  stav.teplota *= TEPLOTA_PO_NEUSPECHU;
  stav.faze = 'zahrivani';
}

export function krokRitualu(stav: StavRitualu, vstup: VstupRitualu): FazeRitualu {
  if (stav.faze === 'hotovo') return stav.faze;

  stav.casS += KROK_S;
  stav.treniTed = vstup.treni;

  switch (stav.faze) {
    case 'zahrivani': {
      // Chladne pořád. Bez toho by šlo natřít láhev do pásma a pak si dát
      // načas — a celý časový stres fáze by zmizel.
      stav.teplota = Math.max(0, stav.teplota - CHLADNUTI * KROK_S);
      stav.teplota = Math.min(TEPLOTA_MAX, stav.teplota + vstup.treni * ZAHRATI_ZA_DRAHU);

      // Puštění zahodí ohořelou zápalku a uvolní ruku pro novou.
      if (!vstup.drziZapalku) stav.zahodZapalku = false;
      else if (!stav.zahodZapalku) vezmiZapalku(stav);
      break;
    }

    case 'zapalka': {
      stav.teplota = Math.max(0, stav.teplota - CHLADNUTI * KROK_S);
      stav.zapalkaZbyvaS -= KROK_S;

      // Puštění zápalky je ucuknutí: bezpečné, bez ztráty pokusu. Zápalka
      // zhasne a musí se vzít nová, čímž se ztratí jen čas.
      if (!vstup.drziZapalku) {
        stav.zapalkaZbyvaS = 0;
        stav.faze = 'zahrivani';
        break;
      }
      if (stav.zapalkaZbyvaS <= 0) {
        selhal(stav);
        break;
      }
      // Odpočet běží jen u hrdla. Držet zápalku stranou nic nedělá.
      if (!vstup.uHrdla) break;

      stav.zazehZaS -= KROK_S;
      if (stav.zazehZaS <= 0) vyhodnotZazeh(stav);
      break;
    }

    case 'zazeh': {
      stav.casovacS -= KROK_S;
      if (stav.casovacS <= 0) stav.faze = 'hotovo';
      break;
    }

    case 'ticho': {
      stav.casovacS -= KROK_S;
      if (stav.casovacS <= 0) selhal(stav);
      break;
    }
  }

  return stav.faze;
}

/** Zážeh se povedl? Rozhoduje o postupu do dalšího levelu. */
export function vypusteno(stav: StavRitualu): boolean {
  return stav.body > 0;
}
