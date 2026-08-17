/**
 * Ukázky na začátku levelu 1 — hra si zahraje sama sebe.
 *
 * Není to animace ani video. Je to **tentýž `krok()`**, jen vstup místo
 * hráče dodává dokonalé řešení dohledané půlením intervalu. Ukázka se proto
 * nemůže rozejít s pravidly hry: kdyby se změnil model průtoku nebo rychlost
 * zahřívání, změní se i ona.
 *
 * Ukázku mají **obě fáze** levelu 1, protože každá se ovládá jinak: rozlévání
 * držením, rituál třením a přiložením zápalky. Od levelu 2 se nehraje žádná —
 * hráč už ví, co dělat.
 *
 * Bez DOM — driver je čistý stav a testuje se stejně jako zbytek jádra.
 */

import { KROK_S } from '../ladeni.ts';
import { idealniDrzeni, idealniVzitPri, TRENI_SVIZNE } from './prehravac.ts';
import type { StavRitualu, VstupRitualu } from './ritual.ts';
import type { StavRozlevani } from './rozlevani.ts';

/**
 * Pauza před každým nalitím, ať je komentář čitelný. V simulovaných
 * vteřinách — skutečná délka je ještě ÷ `UKAZKA_ZPOMALENI` (ladeni.ts),
 * protože celá ukázka běží zpomaleně.
 */
const PAUZA_S = 2.2;

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

export interface UkazkaRitualu {
  vstup(stav: StavRitualu): VstupRitualu;
  /** Při jaké teplotě ukázka bere zápalku. Pro ladění a testy. */
  readonly vzitPri: number;
}

/**
 * Ukázka rituálu: tře svižně po láhvi, a jakmile je dost horko, vezme
 * zápalku a přiloží ji k hrdlu.
 *
 * Teplota, při které sahá po zápalce, je dohledaná půlením intervalu na
 * simulaci samotné — zohlední tedy i to, kolik láhev vychladne, než zápalka
 * doputuje k hrdlu a než to chytne. To je celá lekce ukázky: **nečeká se,
 * až teploměr doleze doprostřed pásma**, protože pak už je pozdě.
 */
export function pripravUkazkuRitualu(cisloLevelu: number, seed: number): UkazkaRitualu {
  const vzitPri = idealniVzitPri(cisloLevelu, seed);
  const treni = TRENI_SVIZNE * KROK_S;
  /**
   * Sáhnuto po zápalce? Bez tohohle by se ukázka zacyklila: po dosažení
   * teploty chvíli čeká, během čekání láhev vychladne pod cíl a ukázka by
   * začala třít znovu. Rozhodnutí přestat třít musí být jednosměrné.
   */
  let sahnuto = false;
  let pokus = 1;

  return {
    vzitPri,
    vstup(stav) {
      // Nepovedený zážeh vrací k tření a hřát se musí znovu.
      if (stav.pokus !== pokus) {
        pokus = stav.pokus;
        sahnuto = false;
      }

      switch (stav.faze) {
        case 'zahrivani': {
          if (!sahnuto && stav.teplota < vzitPri) {
            return { treni, drziZapalku: false, uHrdla: false };
          }
          // Po zápalce se sahá hned. Pauza „ať je to vidět" by ukázku
          // rozešla s plánem: láhev za ni vychladne a zážeh vyjde jinde,
          // než kam ho půlení intervalu mířilo.
          sahnuto = true;
          return { treni: 0, drziZapalku: true, uHrdla: false };
        }

        case 'zapalka':
          return { treni: 0, drziZapalku: true, uHrdla: true };

        default:
          return { treni: 0, drziZapalku: false, uHrdla: false };
      }
    },
  };
}
