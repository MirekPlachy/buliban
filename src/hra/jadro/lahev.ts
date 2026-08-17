/**
 * Katalog tvarů lahví (kap. 4.2 herního designu).
 *
 * Tvar láhve je druhá osa obtížnosti, nezávislá na počtu panáků, a zároveň
 * hlavní intelektuální překážka hry: **tvar láhve hráči lže.** Jen u válce
 * platí, že polovina výšky je polovina objemu.
 *
 * Všechny láhve mají stejný objem 0,5 l — mění se jen to, jak snadno se
 * z výšky hladiny odvodí, kolik v ní je.
 *
 * Matematiku převodu drží `profil.ts`, sdíleně s panáky.
 */

import type { TvarId } from '../levely.ts';
import { hrbol, hrdlo, postavProfil } from './profil.ts';
import type { Profil } from './profil.ts';

/** Jak dobře je vidět hladina. Obtížnost posledních dvou levelů. */
export type Viditelnost = 'plna' | 'castecna' | 'zadna';

export interface Tvar {
  id: TvarId;
  nazev: string;
  viditelnost: Viditelnost;
  /** Poměr výšky ku šířce těla. Jen pro vykreslení, na objem nemá vliv. */
  stihlost: number;
  /** Pásmo výšky zakryté etiketou. Jen u `viditelnost: 'castecna'`. */
  etiketa?: { od: number; do: number };
  /**
   * Podíl výšky, do kterého je sklo neprůhledné. Nad ním je hrdlo čiré.
   *
   * Slepé finále díky tomu není úplná tma: hladinu v těle hráč nevidí, ale
   * **proud v hrdle ano**. Je to vizuální obdoba sluchových vodítek, které
   * pro tenhle level žádá kap. 4.2 — řekne to, že teče a jak silně, ale ne
   * kolik zbývá. Aby to zůstalo poctivé, musí být nad touhle hranicí jen
   * zlomek objemu láhve; hlídá to test.
   */
  neprusvitneDo?: number;
  polomer(y: number): number;
}

const tvary: Record<TvarId, Tvar> = {
  A: {
    id: 'A',
    nazev: 'válec',
    viditelnost: 'plna',
    stihlost: 3.1,
    // Jediný tvar, kde výška opravdu odpovídá objemu. Referenční bod, proti
    // kterému hráč všechny ostatní levely poměřuje. Drží první dva levely.
    polomer: (y) => hrdlo(y, 1, 0.34, 0.84, 0.9),
  },
  B: {
    id: 'B',
    nazev: 'láhev s ramenem',
    viditelnost: 'plna',
    stihlost: 3.4,
    // Lineární v těle, prudký zlom v rameni. Zrada je v tom, že poslední
    // třetina výšky nese sotva desetinu objemu.
    polomer: (y) => hrdlo(y, 1, 0.32, 0.55, 0.72),
  },
  C: {
    id: 'C',
    nazev: 'kónická',
    viditelnost: 'plna',
    stihlost: 3.2,
    // dV/dh klesá s výškou — nahoře je „míň, než to vypadá".
    polomer: (y) => hrdlo(y, 1 - 0.5 * Math.min(y / 0.78, 1), 0.3, 0.78, 0.88),
  },
  D: {
    id: 'D',
    nazev: 'břichatá',
    viditelnost: 'plna',
    stihlost: 2.7,
    // dV/dh má maximum uprostřed: hladina v polovině výšky je NAD polovinou
    // objemu. Přesně opačná intuice než u C, a proto jdou hned po sobě.
    polomer: (y) => hrdlo(y, 0.72 + hrbol(y, 0.38, 0.3, 0.34), 0.3, 0.8, 0.9),
  },
  E: {
    id: 'E',
    nazev: 'karafa',
    viditelnost: 'plna',
    stihlost: 2.5,
    // Nemonotónní průběh — dvě protichůdné intuice v jedné láhvi.
    polomer: (y) =>
      hrdlo(y, 0.45 + hrbol(y, 0.16, 0.13, 0.5) + hrbol(y, 0.55, 0.15, 0.42), 0.3, 0.78, 0.88),
  },
  F: {
    id: 'F',
    nazev: 'poloprůhledná',
    viditelnost: 'castecna',
    stihlost: 3.4,
    etiketa: { od: 0.28, do: 0.6 },
    // Geometrie klasické láhve; obtížnost dělá etiketa přes hladinu.
    polomer: (y) => hrdlo(y, 1, 0.32, 0.55, 0.72),
  },
  G: {
    id: 'G',
    nazev: 'neprůhledná',
    viditelnost: 'zadna',
    stihlost: 3.4,
    // Tělo je slepé, hrdlo čiré. Hranice leží nad ramenem, kde už láhev
    // skoro nic nepojme — v hrdle je pár procent objemu, takže se z něj
    // o zbytku nedá nic vyčíst.
    neprusvitneDo: 0.74,
    polomer: (y) => hrdlo(y, 1, 0.32, 0.55, 0.72),
  },
};

export interface ProfilLahve extends Profil {
  tvar: Tvar;
  /**
   * Poloměr ústí, tedy horního okraje láhve, v poměru k poloměru těla.
   *
   * Ústí je **vrchol profilu** (`y = 1`), ne nejužší místo hrdla. Zní to jako
   * detail, ale není: u láhve s ramenem leží nejužší místo profilu 28 % pod
   * okrajem a proud by z ní vytékal zprostřed skla.
   */
  ustiPolomer: number;
}

const mezipamet = new Map<TvarId, ProfilLahve>();

export function profil(id: TvarId): ProfilLahve {
  let hotovy = mezipamet.get(id);
  if (!hotovy) {
    const tvar = tvary[id];
    hotovy = { ...postavProfil(tvar.polomer), tvar, ustiPolomer: tvar.polomer(1) };
    mezipamet.set(id, hotovy);
  }
  return hotovy;
}

export function vsechnyTvary(): TvarId[] {
  return Object.keys(tvary) as TvarId[];
}
