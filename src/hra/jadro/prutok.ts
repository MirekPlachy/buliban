/**
 * Model průtoku z kap. 4.4.
 *
 * ```
 * tilt(t)  = easeOutCubic( min(holdTime / 0,30 , 1) )
 * fill     = zbytekMl / kapacitaLahve
 * gravity  = 0,55 + 0,45 × sqrt(fill)
 * glug     = 1 + A × sin(2π t / T + φ) + rng(−0,03; 0,03)
 * flow     = FLOW_MAX × tilt × gravity × glug
 * ```
 *
 * Šum musí být čitelný a naučitelný, ne nespravedlivý — proto je bublání
 * periodické se seedovanou fází a náhodná je jen malá porucha navrch.
 *
 * Samé čisté funkce. Žádný stav, žádný DOM.
 */

import {
  GRAVITACE_ROZSAH,
  GRAVITACE_ZAKLAD,
  NABEH_S,
  PERIODA_BUBLANI_S,
  PRUTOK_MAX_L1,
  PRUTOK_MAX_L8,
  SUM_PRUTOKU,
} from '../ladeni.ts';

/** Náběh proudu po stisku. Krátké ťuknutí nalije míň, než by čas napovídal. */
export function naklon(drzeniS: number): number {
  const t = Math.min(1, Math.max(0, drzeniS / NABEH_S));
  const zbytek = 1 - t;
  return 1 - zbytek * zbytek * zbytek;
}

/** Prázdná láhev teče hůř — poslední panáky se lijí jinak než první. */
export function gravitace(zbytekMl: number, kapacitaLahveMl: number): number {
  const naplneni = Math.min(1, Math.max(0, zbytekMl / kapacitaLahveMl));
  return GRAVITACE_ZAKLAD + GRAVITACE_ROZSAH * Math.sqrt(naplneni);
}

/**
 * Bublání. `sum` je jedno číslo z ⟨0,1) od seedovaného generátoru — volající
 * ho dodá, aby tahle funkce zůstala čistá a šla otestovat bez generátoru.
 */
export function bublani(casS: number, amplituda: number, faze: number, sum: number): number {
  const vlna = amplituda * Math.sin((2 * Math.PI * casS) / PERIODA_BUBLANI_S + faze);
  const porucha = (sum * 2 - 1) * SUM_PRUTOKU;
  return Math.max(0, 1 + vlna + porucha);
}

/**
 * Plný proud podle levelu. Dokument udává 22 ml/s na L1 a 30 ml/s na L8;
 * mezi tím lineárně, nad L8 už dál neroste — jinak by se pozdější levely
 * staly testem reflexů, což je přesně to, čemu se hra vyhýbá.
 */
export function prutokMaxProLevel(cisloLevelu: number): number {
  const t = Math.min(1, Math.max(0, (cisloLevelu - 1) / 7));
  return PRUTOK_MAX_L1 + (PRUTOK_MAX_L8 - PRUTOK_MAX_L1) * t;
}

export interface PodminkyPrutoku {
  prutokMax: number;
  drzeniS: number;
  casS: number;
  zbytekMl: number;
  kapacitaLahveMl: number;
  amplituda: number;
  faze: number;
  sum: number;
}

/** Okamžitý průtok v ml/s. */
export function prutok(p: PodminkyPrutoku): number {
  return (
    p.prutokMax *
    naklon(p.drzeniS) *
    gravitace(p.zbytekMl, p.kapacitaLahveMl) *
    bublani(p.casS, p.amplituda, p.faze, p.sum)
  );
}
