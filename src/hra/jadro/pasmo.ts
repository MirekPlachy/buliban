/**
 * Kmitající ukazatel a cílové pásmo — timing klik.
 *
 * Používá ho korek ve fázi 1 (kap. 3.2) i škrtnutí zápalky ve fázi 3
 * (kap. 5.3). Obojí je tentýž prvek: ukazatel putuje po liště tam a zpět
 * a hráč se ho snaží zmáčknout uprostřed.
 *
 * Trojúhelníková vlna, ne sinus. Sinus se u obrátky zpomaluje, takže by se
 * v krajích lišty dal trefit snadněji než ve středu — a hráč by se naučil
 * čekat u kraje, což je opak toho, co má prvek učit.
 *
 * Čistá matematika, žádný stav.
 */

import {
  PASMO_MIN,
  PASMO_SIRKA_L1,
  PASMO_UBYTEK,
  PERFEKTNI_PODIL,
  UKAZATEL_RYCHLOST_L1,
  UKAZATEL_ZRYCHLENI,
} from '../ladeni.ts';

export type Zasah = 'perfektni' | 'zeleny' | 'mimo';

/**
 * Poloha ukazatele ⟨0,1⟩ v čase. `rychlost` je počet cest tam a zpět za
 * sekundu; jedna perioda je tedy `1 / rychlost`.
 */
export function polohaUkazatele(casS: number, rychlost: number): number {
  const faze = (casS * rychlost) % 1;
  return faze < 0.5 ? faze * 2 : 2 - faze * 2;
}

/** Rychlost ukazatele podle levelu: `1,0 + 0,12 × (level − 1)` (kap. 3.2). */
export function rychlostProLevel(cisloLevelu: number): number {
  return UKAZATEL_RYCHLOST_L1 + UKAZATEL_ZRYCHLENI * (cisloLevelu - 1);
}

/** Šířka zeleného pásma podle levelu: `0,26 − 0,015 × (level − 1)`, min 0,14. */
export function sirkaPasmaProLevel(cisloLevelu: number): number {
  return Math.max(PASMO_MIN, PASMO_SIRKA_L1 - PASMO_UBYTEK * (cisloLevelu - 1));
}

/**
 * Vyhodnotí stisk. Pásmo leží uprostřed lišty, perfektní jádro uvnitř něj.
 *
 * `sirka` je celá šířka zeleného pásma, ne poloviční — hranice je tedy
 * `0,5 ± sirka/2`. Vzdálenost od středu se počítá jednou a porovnává dvakrát.
 */
export function vyhodnotZasah(pozice: number, sirka: number): Zasah {
  const odchylka = Math.abs(pozice - 0.5);
  if (odchylka <= (sirka * PERFEKTNI_PODIL) / 2) return 'perfektni';
  if (odchylka <= sirka / 2) return 'zeleny';
  return 'mimo';
}

/**
 * Kdy ukazatel příště projde středem pásma. Slouží **ukázce** — ta musí
 * trefit zásah bez toho, aby zkoušela stisk každý krok a doufala.
 *
 * Vrací čas nejbližšího průchodu polohou 0,5 od `casS` dál. Ukazatel jím
 * projde dvakrát za periodu, ve čtvrtině a ve třech čtvrtinách.
 */
export function dalsiPruchodStredem(casS: number, rychlost: number): number {
  const perioda = 1 / rychlost;
  const faze = ((casS / perioda) % 1 + 1) % 1;
  const dalsi = faze < 0.25 ? 0.25 : faze < 0.75 ? 0.75 : 1.25;
  return casS + (dalsi - faze) * perioda;
}
