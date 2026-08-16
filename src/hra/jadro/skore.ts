/**
 * Bodování fáze 2 (kap. 4.7).
 *
 * Klíčová věc: odchylka se měří od **cíle** (obsah láhve ÷ N), ne od
 * dosaženého průměru. Kdo nalije do všech panáků stejně málo a nechá půl
 * láhve stranou, je dokonale konzistentní — a přesto to má být špatně.
 * Herní design to říká v kap. 4.2: *„musí trefit správný díl, ne jen být
 * konzistentní."* Dokud poslední panák dostával zbytek automaticky, hlídalo
 * to zúčtování; teď lije hráč i posledního, takže to musí hlídat vzorec.
 *
 * Hra se nedá prohrát, jde jen získat málo bodů. Pro minihru na webu je
 * tvrdý fail state zbytečná bariéra — hráč má odejít s „příště líp".
 */

import {
  CASOVY_BONUS_ZA_S,
  MEDAILE_BRONZ,
  MEDAILE_STRIBRO,
  MEDAILE_ZLATO,
  POKUTA_PRELITI,
  POKUTA_ZA_ML,
  PRESNA_RUKA_BODY,
  PRESNA_RUKA_NASOBEK,
  PRESNA_RUKA_ODCHYLKA,
  TOLERANCE_ZAKLAD_ML,
  casovaRezervaS,
} from '../ladeni.ts';
import type { Level } from '../levely.ts';
import type { StavRozlevani } from './rozlevani.ts';

export type Medaile = 'zlato' | 'stribro' | 'bronz' | null;

export interface Vysledek {
  panaky: number[];
  cilMl: number;
  prumerMl: number;
  /** Odchylka každého panáku od cíle — podklad pro „linku rovnosti". */
  odchylkyMl: number[];
  /** Relativní odchylka od cíle. Nula = dokonalé. */
  odchylka: number;
  /** Tolerance přepočtená na vylosovaný cíl — s tou se `odchylka` poměřuje. */
  tolerance: number;
  /** `E` = jak blízko dokonalosti, 1 = přesně, 0 = mimo toleranci. */
  vyrovnanost: number;
  rovnomernost: number;
  casovyBonus: number;
  pokutaPreliti: number;
  pokutaRozlito: number;
  pokutaZbytek: number;
  pokuty: number;
  zbytekMl: number;
  presnaRuka: boolean;
  celkem: number;
  medaile: Medaile;
}

/**
 * Odmocnina ze střední kvadratické odchylky od cíle, dělená cílem.
 * Na rozdíl od variačního koeficientu zahrnuje i systematickou chybu —
 * tedy „lil jsem rovnoměrně, ale málo".
 */
export function odchylkaOdCile(panaky: number[], cilMl: number): number {
  if (panaky.length === 0 || cilMl <= 0) return Number.POSITIVE_INFINITY;
  let ctverce = 0;
  for (const v of panaky) ctverce += (v - cilMl) * (v - cilMl);
  return Math.sqrt(ctverce / panaky.length) / cilMl;
}

export function prumer(hodnoty: number[]): number {
  if (hodnoty.length === 0) return 0;
  let soucet = 0;
  for (const v of hodnoty) soucet += v;
  return soucet / hodnoty.length;
}

/**
 * Tolerance levelu přepočtená na **skutečně vylosovaný cíl**.
 *
 * Vrací se jako poměrná hodnota (aby šla srovnat s `odchylka`), ale nepočítá
 * se poměrně: absolutní složka chyby se s malým cílem nezmenšuje, takže
 * u malých cílů musí být tolerance v procentech volnější. Podrobnosti
 * u `TOLERANCE_ZAKLAD_ML`.
 */
export function tolerancePro(level: Level, cilMl: number): number {
  if (cilMl <= 0) return 0;
  return (level.tolerance * Math.hypot(cilMl, TOLERANCE_ZAKLAD_ML)) / cilMl;
}

export function medaileZPodilu(podil: number): Medaile {
  if (podil >= MEDAILE_ZLATO) return 'zlato';
  if (podil >= MEDAILE_STRIBRO) return 'stribro';
  if (podil >= MEDAILE_BRONZ) return 'bronz';
  return null;
}

export function vyhodnot(stav: StavRozlevani): Vysledek {
  const { konfig } = stav;
  const cilMl = konfig.cilMl;
  const odchylka = odchylkaOdCile(stav.panaky, cilMl);

  const tolerance = tolerancePro(konfig.level, cilMl);
  const vyrovnanost = Math.min(1, Math.max(0, 1 - odchylka / tolerance));
  const rovnomernost = Math.round(konfig.level.zakladBodu * vyrovnanost ** 1.5);

  // Bonus za čas je schválně drobný — hra je o odhadu, ne o reflexech,
  // a spěch by hráče tlačil přesně opačným směrem, než kam má.
  const rezerva = casovaRezervaS(konfig.panaku);
  const casovyBonus = Math.max(0, Math.round((rezerva - stav.casS) * CASOVY_BONUS_ZA_S));

  const pokutaPreliti = stav.prelitiPocet * POKUTA_PRELITI;
  const pokutaRozlito = Math.round(stav.rozlitoMl * POKUTA_ZA_ML);
  // Zbytek v láhvi je potrestaný už odchylkou od cíle. Vlastní položka je tu
  // proto, aby hráč viděl důvod, ne jen nižší číslo.
  const pokutaZbytek = Math.round(stav.zbytekMl * POKUTA_ZA_ML);
  const pokuty = pokutaPreliti + pokutaRozlito + pokutaZbytek;

  const presnaRuka = odchylka <= PRESNA_RUKA_ODCHYLKA;
  const zaklad = rovnomernost + casovyBonus - pokuty + (presnaRuka ? PRESNA_RUKA_BODY : 0);
  const celkem = Math.max(0, Math.round(zaklad * (presnaRuka ? PRESNA_RUKA_NASOBEK : 1)));

  return {
    panaky: [...stav.panaky],
    cilMl,
    prumerMl: prumer(stav.panaky),
    odchylkyMl: stav.panaky.map((v) => v - cilMl),
    odchylka,
    tolerance,
    vyrovnanost,
    rovnomernost,
    casovyBonus,
    pokutaPreliti,
    pokutaRozlito,
    pokutaZbytek,
    pokuty,
    zbytekMl: stav.zbytekMl,
    presnaRuka,
    // Body a medaile schválně měří jinou křivkou: body přes `E^1,5`, aby se
    // odměna za posledních pár procent přesnosti strmě zvedala, medaile přes
    // holé `E`, aby zůstaly dosažitelné. Viz komentář u prahů v `ladeni.ts`.
    celkem,
    medaile: medaileZPodilu(vyrovnanost),
  };
}
