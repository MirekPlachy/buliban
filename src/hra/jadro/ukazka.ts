/**
 * Ukázky na začátku levelu 1 — hra si zahraje sama sebe.
 *
 * Není to animace ani video. Je to **tentýž `krok()`**, jen vstup místo
 * hráče dodává dokonalé řešení dohledané půlením intervalu. Ukázka se proto
 * nemůže rozejít s pravidly hry: kdyby se změnil model průtoku nebo
 * setrvačnost metody, změní se i ona.
 *
 * Ukázku má **každá ze tří fází** levelu 1, protože každá se ovládá jinak:
 * otevírání ťukáním a timing klikem, rozlévání držením, rituál volbou
 * dlaždic. Od levelu 2 se nehraje žádná — hráč už ví, co dělat.
 *
 * Bez DOM — driver je čistý stav a testuje se stejně jako zbytek jádra.
 */

import { KROK_S } from '../ladeni.ts';
import { pozice } from './otevirani.ts';
import type { StavOtevirani } from './otevirani.ts';
import { idealniDrzeni, idealniPlan } from './prehravac.ts';
import type { PlanRitualu } from './prehravac.ts';
import { poziceSkrtnuti } from './ritual.ts';
import type { StavRitualu, VstupRitualu } from './ritual.ts';
import type { StavRozlevani } from './rozlevani.ts';

/** Pauza před každým nalitím, ať je komentář čitelný. */
const PAUZA_S = 1.6;

/** Pauza před každým rozhodnutím v rituálu — dlaždice se musí stihnout přečíst. */
const PAUZA_VOLBY_S = 2.2;

/** Jak přesně ukázka trefuje střed lišty. Ne nula: má to vypadat jako ruka. */
const PRESNOST_KLIKU = 0.04;

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

/** Rytmus ťukání do pečeti. Pomalejší než by šlo — má se to dát sledovat. */
const TUKNUTI_S = 0.16;

export interface UkazkaOtevirani {
  stisk(stav: StavOtevirani): boolean;
}

/**
 * Ukázka otevírání. Pečeť sedře pravidelným ťukáním, korek trefí uprostřed
 * lišty — a protože trefuje přesně, vytáhne ho dvěma zásahy.
 */
export function pripravUkazkuOtevirani(): UkazkaOtevirani {
  let odTuknutiS = 0;

  return {
    stisk(stav) {
      odTuknutiS += KROK_S;

      if (stav.faze === 'pecet') {
        if (odTuknutiS < TUKNUTI_S) return false;
        odTuknutiS = 0;
        return true;
      }

      if (stav.faze === 'korek') {
        // Trefit se dá jen v čase — ukazatel kmitá sám. Ukázka tedy čeká,
        // až projde středem, a teprve tam zmáčkne.
        if (Math.abs(pozice(stav) - 0.5) > PRESNOST_KLIKU) return false;
        // Dvě zmáčknutí v sousedních krocích by druhé zahodila na zaseknutí,
        // proto rozestup i tady.
        if (odTuknutiS < TUKNUTI_S) return false;
        odTuknutiS = 0;
        return true;
      }

      return false;
    },
  };
}

export interface UkazkaRitualu {
  vstup(stav: StavRitualu): VstupRitualu;
  readonly plan: PlanRitualu;
}

const bezVstupu: VstupRitualu = { drzi: false, stisk: false, volba: null };

/**
 * Ukázka rituálu. Plán (poloha, metoda, čím zapálit a hlavně **při jaké
 * teplotě pustit**) je dohledaný půlením intervalu na simulaci samotné,
 * takže zohlední setrvačnost metody i to, kolik láhev vychladne během
 * uzávěru a zápalky.
 *
 * Tohle je celý smysl ukázky: hráč má vidět, že se pouští **dřív**, než
 * ručička doleze do pásma. Vysvětlit se to slovy dá, ukázat je to lepší.
 */
export function pripravUkazkuRitualu(cisloLevelu: number, seed: number): UkazkaRitualu {
  const plan = idealniPlan(cisloLevelu, seed);
  let pauzaS = 0;
  /**
   * Dohřáto? Bez tohohle se ukázka zacyklí: po dosažení cílové teploty čeká,
   * během čekání láhev vychladne pod cíl, ukázka zase začne hřát — a takhle
   * donekonečna. Rozhodnutí přestat hřát musí být jednosměrné.
   */
  let dohrato = false;
  let pokus = 1;

  return {
    plan,
    vstup(stav) {
      pauzaS += KROK_S;
      // Nepovedený zážeh vrací na zahřívání a hřát se musí znovu.
      if (stav.pokus !== pokus) {
        pokus = stav.pokus;
        dohrato = false;
      }

      const cekej = (): boolean => {
        if (pauzaS < PAUZA_VOLBY_S) return true;
        pauzaS = 0;
        return false;
      };

      switch (stav.faze) {
        case 'poloha':
          return cekej()
            ? bezVstupu
            : { ...bezVstupu, volba: { druh: 'poloha', poloha: plan.poloha } };

        case 'zahrivani': {
          // Pauza je jen před ČTENÍM dlaždic. Od chvíle, kdy je láhev horká,
          // se ukázka nezdržuje — protože se nezdržovat je přesně ta lekce.
          if (!stav.metodaId) {
            return cekej()
              ? bezVstupu
              : { ...bezVstupu, volba: { druh: 'metoda', metoda: plan.metodaId } };
          }
          if (!dohrato && stav.teplota < plan.pustitPri) {
            pauzaS = 0;
            return { ...bezVstupu, drzi: true };
          }
          dohrato = true;
          return { ...bezVstupu, volba: { druh: 'uzaver' } };
        }

        case 'ohen':
          return { ...bezVstupu, volba: { druh: 'ohen', ohen: plan.ohen } };

        case 'skrtani':
          return {
            ...bezVstupu,
            stisk: Math.abs(poziceSkrtnuti(stav) - 0.5) <= PRESNOST_KLIKU,
          };

        case 'ceka':
          pauzaS = 0;
          return { ...bezVstupu, drzi: true };

        default:
          pauzaS = 0;
          return bezVstupu;
      }
    },
  };
}
