/**
 * Fáze 3 — zahřátí prázdné láhve a vypuštění Bulibana (kap. 5).
 *
 * Jediné místo ve hře s **časovým stresem**: jakmile hráč přestane hřát,
 * teplota klesá a běží to i během sundávání uzávěru a škrtání zápalky.
 * Fáze 2 je o odhadu bez spěchu; tahle je její protiváha.
 *
 * Sled kroků: poloha → zahřívání → uzávěr → oheň → drž a čekej → zážeh.
 *
 * Tři věci, které dělají rozhodnutí zajímavými:
 *  - **násobitel jde proti rychlosti.** Plamen dohřeje za pět vteřin, ale
 *    bere 0,85× a nad 95 jednotkami praskne sklo. Dlaně jsou pětkrát pomalejší
 *    a berou 1,25×.
 *  - **setrvačnost.** Po puštění teplota ještě povyskočí, u teplé vody o pět
 *    jednotek. Trefit pásmo tedy znamená pustit dřív, než se ho dosáhne.
 *  - **zápalka vs. zapalovač.** Zápalka dává +15 %, ale hoří čtyři vteřiny
 *    a může ji sfouknout průvan. Zapalovač je klidný a bez bonusu.
 *
 * Vstup má tři kanály, protože fáze má tři různé úkony: `drzi` (hřát, držet
 * plamen u hrdla), `stisk` (škrtnout zápalkou) a `volba` (dlaždice). Fáze 2
 * si vystačí s držením — tady by to nešlo, aniž by se z výběru metody stalo
 * cyklické proklikávání.
 */

import {
  KROK_S,
  NASOBEK_HORIZONTALNI,
  NASOBEK_VERTIKALNI,
  PASMO_HORIZONTALNI,
  PASMO_MIN_SIRKA,
  PASMO_STRED,
  PASMO_UBYTEK_ZA_LEVEL,
  PASMO_VERTIKALNI,
  PASMO_ZAKLAD_SIRKA,
  SKRTNUTI_PASMO,
  SKRTNUTI_RYCHLOST,
  TEPLOTA_MAX,
  TEPLOTA_PO_NEUSPECHU,
  UZAVER_S,
  ZAPALKA_BONUS,
  ZAPALKA_HORI_S,
  ZAPALKA_PRUVAN,
  ZAPALOVAC_PRODLEVA_S,
  ZAPALOVAC_SELHANI,
  ZAZEH_DOZNENI_S,
  ZAZEH_POKUSU,
  ZAZEH_PRODLEVA_MAX_S,
  ZAZEH_PRODLEVA_MIN_S,
  ZAZEH_SRAZKA_ZA_POKUS,
  ZAZEH_ZAKLAD_BODU,
} from '../ladeni.ts';
import { level } from '../levely.ts';
import type { Level } from '../levely.ts';
import { metoda, metodyProLevel } from './metody.ts';
import type { MetodaId } from './metody.ts';
import { nahoda } from './nahoda.ts';
import type { Nahoda } from './nahoda.ts';
import { polohaUkazatele, vyhodnotZasah } from './pasmo.ts';

export type Poloha = 'vertikalni' | 'horizontalni';
export type Ohen = 'zapalka' | 'zapalovac';

export type FazeRitualu =
  | 'poloha'
  | 'zahrivani'
  | 'uzaver'
  | 'ohen'
  | 'skrtani'
  | 'kresa'
  | 'ceka'
  | 'zazeh'
  | 'ticho'
  | 'prasklo'
  | 'hotovo';

export interface Pasmo {
  stred: number;
  sirka: number;
}

export interface StavRitualu {
  level: Level;
  faze: FazeRitualu;
  poloha: Poloha | null;
  pasmo: Pasmo;
  /** Zahřátí ve stylizovaných jednotkách 0–100. Nikdy ve °C (kap. 11). */
  teplota: number;
  metodaId: MetodaId | null;
  ohen: Ohen | null;
  /** Vážený průměr násobitelů podle toho, kolik která metoda dodala tepla. */
  soucetNasobitelu: number;
  dodanoJednotek: number;
  pokus: number;
  casS: number;
  casovacS: number;
  /** Zbytek hoření zápalky. U zapalovače se nepoužívá. */
  ohenZbyvaS: number;
  /** Kdy zápalku sfoukne průvan. `null` = tenhle pokus vydrží. */
  pruvanVS: number | null;
  /** Kolik ještě musí hráč držet plamen u hrdla, než to chytne. */
  zazehZaS: number;
  ukazatelCasS: number;
  /**
   * Drželo se v minulém kroku? Setrvačnost se přičítá na **hraně puštění**,
   * ne průběžně — jinak by se přičítala každý krok, co hráč nedrží, a teplota
   * by po puštění rostla do stropu.
   */
  drzelo: boolean;
  /** Vyhodnocení posledního zážehu — `Q`, body, hláška. */
  kvalita: number;
  body: number;
  nahoda: Nahoda;
}

export interface VstupRitualu {
  drzi: boolean;
  /** Hrana stisku — jen pro škrtnutí zápalkou. */
  stisk: boolean;
  /** Vybraná dlaždice, nebo `null`. */
  volba: VolbaRitualu | null;
}

export type VolbaRitualu =
  | { druh: 'poloha'; poloha: Poloha }
  | { druh: 'metoda'; metoda: MetodaId }
  | { druh: 'uzaver' }
  | { druh: 'ohen'; ohen: Ohen };

/**
 * Cílové pásmo. Vertikální poloha ho zúží o 6 jednotek a platí za to
 * násobitelem 1,3 — risk/reward, který zároveň učí lore webu.
 *
 * Zúžení podle levelu dokument nemá; bez něj je ale rituál na L8 stejně
 * těžký jako na L1. Viz `PASMO_UBYTEK_ZA_LEVEL`.
 */
export function pasmoProLevel(cisloLevelu: number, poloha: Poloha): Pasmo {
  const podleLevelu = PASMO_ZAKLAD_SIRKA - PASMO_UBYTEK_ZA_LEVEL * (cisloLevelu - 1);
  const podlePolohy = poloha === 'vertikalni' ? PASMO_VERTIKALNI : PASMO_HORIZONTALNI;
  return {
    stred: PASMO_STRED,
    sirka: Math.max(PASMO_MIN_SIRKA, podleLevelu + podlePolohy),
  };
}

export function nasobitelPolohy(poloha: Poloha): number {
  return poloha === 'vertikalni' ? NASOBEK_VERTIKALNI : NASOBEK_HORIZONTALNI;
}

export function zalozRitual(cisloLevelu: number, seed: number): StavRitualu {
  const l = level(cisloLevelu);
  return {
    level: l,
    faze: 'poloha',
    poloha: null,
    // Než hráč vybere polohu, drží se základní pásmo — scéna má co kreslit.
    pasmo: pasmoProLevel(l.cislo, 'horizontalni'),
    teplota: 0,
    metodaId: null,
    ohen: null,
    soucetNasobitelu: 0,
    dodanoJednotek: 0,
    pokus: 1,
    casS: 0,
    casovacS: 0,
    ohenZbyvaS: 0,
    pruvanVS: null,
    zazehZaS: 0,
    ukazatelCasS: 0,
    drzelo: false,
    kvalita: 0,
    body: 0,
    nahoda: nahoda(seed).odbocka(l.cislo + 2000),
  };
}

/** Metody dostupné na levelu. Level 1 tři, každý další o jednu víc. */
export function dostupneMetody(stav: StavRitualu): MetodaId[] {
  return metodyProLevel(stav.level.cislo).map((m) => m.id);
}

/** Co si hráč právě může vybrat. Scéna z toho staví dlaždice. */
export function volbyRitualu(stav: StavRitualu): VolbaRitualu[] {
  switch (stav.faze) {
    case 'poloha':
      return [
        { druh: 'poloha', poloha: 'vertikalni' },
        { druh: 'poloha', poloha: 'horizontalni' },
      ];
    case 'zahrivani':
      return [
        ...dostupneMetody(stav).map((m): VolbaRitualu => ({ druh: 'metoda', metoda: m })),
        { druh: 'uzaver' },
      ];
    case 'ohen':
      return [
        { druh: 'ohen', ohen: 'zapalka' },
        { druh: 'ohen', ohen: 'zapalovac' },
      ];
    default:
      return [];
  }
}

function zapalOhen(stav: StavRitualu, druh: Ohen): void {
  stav.ohen = druh;
  // Prodleva do zážehu se losuje TEĎ, ne až se začne držet: kdyby se losovala
  // při každém přiblížení, dalo by se ucuknutím losovat znovu, dokud nepadne
  // krátká. Napětí by se tím dalo obejít.
  stav.zazehZaS = stav.nahoda.rozsah(ZAZEH_PRODLEVA_MIN_S, ZAZEH_PRODLEVA_MAX_S);

  if (druh === 'zapalka') {
    stav.ohenZbyvaS = ZAPALKA_HORI_S;
    // Průvan je jeden los na pokus, ne hod každou vteřinu — jinak by delší
    // držení bylo trestané dvakrát (jednou časem, jednou pravděpodobností).
    stav.pruvanVS =
      stav.nahoda.dalsi() < ZAPALKA_PRUVAN
        ? stav.nahoda.rozsah(0.4, ZAPALKA_HORI_S * 0.9)
        : null;
    stav.faze = 'ceka';
    return;
  }

  stav.ohenZbyvaS = Number.POSITIVE_INFINITY;
  stav.pruvanVS = null;
  // Zapalovač občas nechytne napoprvé. Stojí to jen prodlevu, ve které láhev
  // chladne — proto je to trest, i když se nic „nestane".
  if (stav.nahoda.dalsi() < ZAPALOVAC_SELHANI) {
    stav.casovacS = ZAPALOVAC_PRODLEVA_S;
    stav.faze = 'kresa';
    return;
  }
  stav.faze = 'ceka';
}

export function vyber(stav: StavRitualu, volba: VolbaRitualu): void {
  switch (volba.druh) {
    case 'poloha': {
      if (stav.faze !== 'poloha') return;
      stav.poloha = volba.poloha;
      stav.pasmo = pasmoProLevel(stav.level.cislo, volba.poloha);
      stav.faze = 'zahrivani';
      break;
    }
    case 'metoda': {
      if (stav.faze !== 'zahrivani') return;
      stav.metodaId = volba.metoda;
      break;
    }
    case 'uzaver': {
      // Bez zahřátí nemá smysl pokračovat — jinak by šlo fázi proklikat
      // a dostat nulu rychleji, než ji odehrát.
      if (stav.faze !== 'zahrivani' || stav.teplota <= 0) return;
      stav.casovacS = UZAVER_S;
      stav.faze = 'uzaver';
      break;
    }
    case 'ohen': {
      if (stav.faze !== 'ohen') return;
      // Zapalovač chytne rovnou. Zápalka se musí škrtnout — timing klik,
      // teprve po něm hoří.
      if (volba.ohen === 'zapalovac') {
        zapalOhen(stav, 'zapalovac');
      } else {
        stav.ohen = 'zapalka';
        stav.ukazatelCasS = 0;
        stav.faze = 'skrtani';
      }
      break;
    }
  }
}

/** Vážený průměr násobitelů metod podle dodaného tepla. */
export function nasobitelMetody(stav: StavRitualu): number {
  if (stav.dodanoJednotek <= 0) return 1;
  return stav.soucetNasobitelu / stav.dodanoJednotek;
}

function chladni(stav: StavRitualu): void {
  const m = stav.metodaId ? metoda(stav.metodaId) : null;
  if (!m) return;
  stav.teplota = Math.max(0, stav.teplota - m.chladnuti * KROK_S);
}

function hrej(stav: StavRitualu): void {
  if (!stav.metodaId) return;
  const m = metoda(stav.metodaId);
  const strop = Math.min(TEPLOTA_MAX, m.strop ?? TEPLOTA_MAX);
  if (stav.teplota >= strop) return;

  const pridano = Math.min(m.rychlost * KROK_S, strop - stav.teplota);
  stav.teplota += pridano;
  stav.soucetNasobitelu += m.nasobitel * pridano;
  stav.dodanoJednotek += pridano;
}

/** Setrvačnost po puštění. Tohle je to, čím se pásmo přestřelí. */
function doraz(stav: StavRitualu): void {
  if (!stav.metodaId) return;
  const m = metoda(stav.metodaId);
  const strop = Math.min(TEPLOTA_MAX, m.strop ?? TEPLOTA_MAX);
  stav.teplota = Math.min(strop, stav.teplota + m.setrvacnost);
}

/** Praskne sklo? Jen u plamene a jen nad 95 jednotkami. */
function praskne(stav: StavRitualu): boolean {
  if (!stav.metodaId) return false;
  const mez = metoda(stav.metodaId).praskneNad;
  return mez !== undefined && stav.teplota > mez;
}

/** `Q` z kap. 5.3: 1 uprostřed pásma, 0 na jeho okraji a dál. */
export function kvalitaZasahu(teplota: number, pasmo: Pasmo): number {
  const odchylka = Math.abs(teplota - pasmo.stred);
  return Math.min(1, Math.max(0, 1 - odchylka / (pasmo.sirka / 2)));
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

  const srazka = 1 - ZAZEH_SRAZKA_ZA_POKUS * (stav.pokus - 1);
  stav.body = Math.round(
    ZAZEH_ZAKLAD_BODU *
      stav.kvalita *
      nasobitelPolohy(stav.poloha ?? 'horizontalni') *
      nasobitelMetody(stav) *
      (stav.ohen === 'zapalka' ? ZAPALKA_BONUS : 1) *
      Math.max(0, srazka),
  );
  stav.faze = 'zazeh';
}

/** Pokus selhal: zpět k zahřívání, nebo konec fáze, když už žádný nezbývá. */
function selhal(stav: StavRitualu): void {
  if (stav.pokus >= ZAZEH_POKUSU) {
    stav.faze = 'hotovo';
    return;
  }
  stav.pokus += 1;
  stav.ohen = null;
  stav.ohenZbyvaS = 0;
  stav.pruvanVS = null;
  // Láhev si drží část tepla — odpovídá „opakovanému zapálení" na webu.
  stav.teplota *= TEPLOTA_PO_NEUSPECHU;
  stav.faze = 'zahrivani';
}

export function krokRitualu(stav: StavRitualu, vstup: VstupRitualu): FazeRitualu {
  if (stav.faze === 'hotovo') return stav.faze;

  stav.casS += KROK_S;
  stav.ukazatelCasS += KROK_S;
  if (vstup.volba) vyber(stav, vstup.volba);

  switch (stav.faze) {
    case 'poloha':
      break;

    case 'zahrivani': {
      if (vstup.drzi && stav.metodaId) {
        hrej(stav);
        if (praskne(stav)) {
          stav.body = 0;
          stav.casovacS = ZAZEH_DOZNENI_S;
          stav.faze = 'prasklo';
        }
      } else {
        // Puštění napřed dorazí setrvačností a teprve pak se chladne. Kdo
        // chce trefit pásmo, musí pustit dřív, než se ho dosáhne.
        if (stav.drzelo) {
          doraz(stav);
          if (praskne(stav)) {
            stav.body = 0;
            stav.casovacS = ZAZEH_DOZNENI_S;
            stav.faze = 'prasklo';
            break;
          }
        }
        chladni(stav);
      }
      break;
    }

    case 'uzaver': {
      chladni(stav);
      stav.casovacS -= KROK_S;
      if (stav.casovacS <= 0) stav.faze = 'ohen';
      break;
    }

    case 'ohen': {
      chladni(stav);
      break;
    }

    case 'skrtani': {
      chladni(stav);
      if (vstup.stisk) {
        const zasah = vyhodnotZasah(
          polohaUkazatele(stav.ukazatelCasS, SKRTNUTI_RYCHLOST),
          SKRTNUTI_PASMO,
        );
        // Škrtnutí nemá odstíny: buď chytne, nebo se škrtá znovu. Minutí
        // stojí jen čas, ve kterém láhev chladne.
        if (zasah !== 'mimo') zapalOhen(stav, 'zapalka');
      }
      break;
    }

    case 'kresa': {
      chladni(stav);
      stav.casovacS -= KROK_S;
      if (stav.casovacS <= 0) stav.faze = 'ceka';
      break;
    }

    case 'ceka': {
      chladni(stav);
      stav.ohenZbyvaS -= KROK_S;

      // Průvan sfoukne zápalku bez ohledu na to, jestli hráč drží. Pokus je
      // pryč, ale láhev je pořád teplá.
      if (stav.pruvanVS !== null && ZAPALKA_HORI_S - stav.ohenZbyvaS >= stav.pruvanVS) {
        selhal(stav);
        break;
      }
      if (stav.ohenZbyvaS <= 0) {
        selhal(stav);
        break;
      }

      // Ucuknout jde kdykoli — bezpečně a bez bodů. Odpočet se tím jen
      // zastaví, nelosuje se znovu.
      if (!vstup.drzi) break;

      stav.zazehZaS -= KROK_S;
      if (stav.zazehZaS <= 0) vyhodnotZazeh(stav);
      break;
    }

    case 'zazeh':
    case 'prasklo': {
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

  stav.drzelo = vstup.drzi;
  return stav.faze;
}

/** Zážeh se povedl? Rozhoduje o postupu do dalšího levelu. */
export function vypusteno(stav: StavRitualu): boolean {
  return stav.body > 0;
}

/** Poloha ukazatele při škrtání ⟨0,1⟩. Scéna i ukázka ji čtou odsud. */
export function poziceSkrtnuti(stav: StavRitualu): number {
  return polohaUkazatele(stav.ukazatelCasS, SKRTNUTI_RYCHLOST);
}
