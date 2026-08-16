/**
 * Seedovaný generátor náhody.
 *
 * Objem v láhvi, fáze bublání i dokapání jdou odtud, ne z `Math.random()`.
 * Bez toho se chyba nahlášená z playtestu nedá zopakovat a denní výzva se
 * stejnými podmínkami pro všechny nedá udělat (kap. 9).
 */

export interface Nahoda {
  /** Další číslo z ⟨0, 1). */
  dalsi(): number;
  /** Další číslo z ⟨od, do). */
  rozsah(od: number, do_: number): number;
  /** Odbočka s vlastním proudem — ať přidání jednoho losu nerozhodí zbytek. */
  odbocka(znacka: number): Nahoda;
}

/**
 * mulberry32. Vybraný proto, že je to devět řádků bez závislostí a projde
 * testem opakovatelnosti; kvalita rozdělení je pro minihru silně nadbytečná.
 */
export function nahoda(seed: number): Nahoda {
  let stav = seed >>> 0;

  const dalsi = (): number => {
    stav = (stav + 0x6d2b79f5) >>> 0;
    let t = stav;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    dalsi,
    rozsah: (od, do_) => od + dalsi() * (do_ - od),
    odbocka: (znacka) => nahoda((seed ^ Math.imul(znacka + 1, 0x9e3779b9)) >>> 0),
  };
}

/**
 * Seed z textu, aby šlo do adresy napsat `?seed=vecirek` a dostat pokaždé
 * stejnou hru. Bez tohohle by se seedy sdílely jako devítimístná čísla.
 */
export function seedZTextu(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
