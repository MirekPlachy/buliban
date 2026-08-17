/**
 * Katalog tvarů panáků.
 *
 * **Každý panák pojme přesně 40 ml, ať vypadá jakkoli.** To je celý vtip:
 * hráč má na stole nádoby různého tvaru, ale stejného objemu, takže „nalít
 * do všech stejně vysoko" je špatná odpověď. Zrada z láhve se tím přesouvá
 * i na stranu, kam hráč lije.
 *
 * Tvary se zavádějí uprostřed hry, kde jsou tvary lahví (C, D, E) ještě
 * naučitelné. Na L7 a L8, kde je celá obtížnost v neviditelné hladině,
 * zůstává válec — dvě nové zrady naráz by z levelu udělaly loterii.
 */

import { hrbol, postavProfil, prechod } from './profil.ts';
import type { Profil } from './profil.ts';

export type PanakId = 'valec' | 'konicky' | 'brichaty' | 'kalisek';

export interface TvarPanaku {
  id: PanakId;
  nazev: string;
  /** Poměr výšky ku šířce nejširšího místa. */
  stihlost: number;
  polomer(y: number): number;
}

const tvary: Record<PanakId, TvarPanaku> = {
  valec: {
    id: 'valec',
    nazev: 'rovný',
    stihlost: 1.55,
    // Výchozí panák. Výška hladiny odpovídá objemu, takže se dá poměřovat
    // od oka — to je ta dovednost, kterou si hráč v prvních levelech staví.
    polomer: () => 1,
  },
  konicky: {
    id: 'konicky',
    nazev: 'kónický',
    stihlost: 1.5,
    // Rozšiřuje se vzhůru: první polovina výšky nese míň než polovinu
    // objemu. Kdo lije „do poloviny", nalije málo.
    polomer: (y) => 0.72 + 0.28 * y,
  },
  brichaty: {
    id: 'brichaty',
    nazev: 'břichatý',
    stihlost: 1.35,
    // Nejširší uprostřed. Opačná chyba než u kónického.
    polomer: (y) => 0.78 + hrbol(y, 0.45, 0.32, 0.22),
  },
  kalisek: {
    id: 'kalisek',
    nazev: 'kalíšek',
    stihlost: 1.7,
    // Úzké dno, náhlé rozšíření. První mililitry vyskočí vysoko, pak se
    // hladina skoro zastaví — nejnepříjemnější panák v katalogu.
    polomer: (y) => 0.5 + 0.5 * prechod(y, 0.05, 0.42),
  },
};

export interface ProfilPanaku extends Profil {
  tvar: TvarPanaku;
}

const mezipamet = new Map<PanakId, ProfilPanaku>();

export function profilPanaku(id: PanakId): ProfilPanaku {
  let hotovy = mezipamet.get(id);
  if (!hotovy) {
    const tvar = tvary[id];
    hotovy = { ...postavProfil(tvar.polomer), tvar };
    mezipamet.set(id, hotovy);
  }
  return hotovy;
}

export function vsechnyPanaky(): PanakId[] {
  return Object.keys(tvary) as PanakId[];
}
