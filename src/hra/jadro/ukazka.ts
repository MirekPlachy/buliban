/**
 * Ukázka na začátku levelu 1 — hra si zahraje sama sebe.
 *
 * Není to animace ani video. Je to **tentýž `krok()`**, jen vstup místo
 * hráče dodává dokonalé držení dohledané půlením intervalu. Ukázka se proto
 * nemůže rozejít s pravidly hry: kdyby se změnil model průtoku, změní se
 * i ona.
 *
 * Bez DOM — driver je čistý stav a testuje se stejně jako zbytek jádra.
 */

import { KROK_S } from '../ladeni.ts';
import { idealniDrzeni } from './prehravac.ts';
import type { StavRozlevani } from './rozlevani.ts';

/** Pauza před každým nalitím, ať je komentář čitelný. */
const PAUZA_S = 1.6;

export interface Ukazka {
  /** Vstup místo hráče: má se v tuhle chvíli držet? */
  drzi(stav: StavRozlevani): boolean;
  /** Délky stisků, které ukázka přehrává. Pro ladění. */
  readonly drzeni: number[];
}

export function pripravUkazku(cisloLevelu: number, seed: number): Ukazka {
  const drzeni = idealniDrzeni(cisloLevelu, seed);
  let drzenoS = 0;
  let pauzaS = 0;

  return {
    drzeni,
    drzi(stav) {
      switch (stav.faze) {
        case 'ceka': {
          pauzaS += KROK_S;
          if (pauzaS < PAUZA_S) return false;
          drzenoS = 0;
          return true;
        }
        case 'naklani':
        case 'leje': {
          pauzaS = 0;
          drzenoS += KROK_S;
          // Za hranicí scénáře pustit — to je celý povel k nalití.
          return drzenoS <= (drzeni[stav.aktivni] ?? 0);
        }
        default:
          drzenoS = 0;
          return false;
      }
    },
  };
}
