/**
 * Tabulka levelů jako data.
 *
 * Osm levelů, strop osm panáků, žádný nekonečný režim — hra má konec.
 * Úvod je schválně pomalý: **dva levely po dvou panácích**, z toho jen
 * první s ryskou a s ukázkou. Než se přidá panák, musí hráč pochopit, že se
 * nedá dolít; obojí naráz je moc.
 *
 * Samostatný soubor proto, že session ladící obtížnost vystačí s ním
 * a nemusí načítat 30 kB prózy z herního designu.
 */

import type { PanakId } from './jadro/panak.ts';

/** Tvary lahví z katalogu v `jadro/lahev.ts`. Druhá osa obtížnosti. */
export type TvarId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export type Modifikator = 'host-odnese' | 'slepe';

export interface Level {
  cislo: number;
  panaku: number;
  tvar: TvarId;
  panak: PanakId;
  /**
   * Kolik smí být relativní odchylka od cíle, než je za rovnoměrnost nula.
   * Není to `CV` okolo průměru — měří se odchylka od **skutečného cíle**,
   * takže rovnoměrně málo nalité panáky se počítají jako chyba. Viz `skore.ts`.
   */
  tolerance: number;
  /** Amplituda bublání. Roste, aby proud šel hůř odhadnout. */
  amplituda: number;
  zakladBodu: number;
  modifikatory: Modifikator[];
  /** Orientační linka na panácích ve výši cíle. Jen úvodní dva levely. */
  ryska: boolean;
  /** Level se napřed zahraje sám, s výkladem a bez bodování. */
  ukazka: boolean;
}

export const STROP_PANAKU = 8;

function radek(
  cislo: number,
  panaku: number,
  tvar: TvarId,
  panak: PanakId,
  tolerance: number,
  amplituda: number,
  modifikatory: Modifikator[] = [],
  ryska = false,
  ukazka = false,
): Level {
  return {
    cislo,
    panaku,
    tvar,
    panak,
    tolerance,
    amplituda,
    // Roste s levelem, ne s počtem panáků: dva úvodní levely mají shodně
    // dva panáky, ale zdaleka nejsou stejně těžké.
    zakladBodu: 400 * (cislo + 1),
    modifikatory,
    ryska,
    ukazka,
  };
}

/**
 * Tolerance jsou vyladěné proti modelu hráče (`npm run hra -- --hraci`), ne
 * proti dokonalému držení — to je lepší než kdokoli živý a obtížnost se
 * podle něj nastavit nedá. Cíl z kap. 4.7: nováček ≤ 10 % zlatých,
 * zkušený hráč 40–60 % napříč hrou. Aktuálně 9 % a 52 %.
 *
 * Nejsou to procenta odchylky napřímo — přepočítávají se na vylosovaný cíl,
 * viz `tolerancePro()` a `TOLERANCE_ZAKLAD_ML`. Bez toho by malý cíl znamenal
 * mnohem těžší level, aniž by to hráč mohl poznat nebo ovlivnit.
 *
 * **Skok mezi L1 a L2 je záměrný, ne překlep.** Na L1 svítí ryska, takže
 * hráč cíl vidí a tolerance může být přísná. Od L2 ho musí odhadnout z výšky
 * hladiny, a to je řádově těžší úloha — se stejnou přísností by na ni nikdo
 * nedosáhl. Teprve odtud tolerance zase klesá.
 */
export const levely: Level[] = [
  radek(1, 2, 'A', 'valec', 0.123, 0.05, [], true, true),
  // První „ostrý" level: stejné zadání jako L1, ale bez rysky. Teprve tady
  // hráč poprvé sám odhaduje, kolik je v láhvi.
  radek(2, 2, 'A', 'valec', 0.224, 0.07),
  radek(3, 3, 'B', 'valec', 0.258, 0.08),
  radek(4, 4, 'C', 'konicky', 0.278, 0.09),
  radek(5, 5, 'D', 'brichaty', 0.282, 0.1),
  radek(6, 6, 'E', 'kalisek', 0.282, 0.12, ['host-odnese']),
  radek(7, 7, 'F', 'valec', 0.271, 0.14, ['host-odnese']),
  // Slepé finále. Hladina není vidět vůbec, takže panáky na stole jsou
  // jediná zbylá reference — proto se tu hosté panáků nedotýkají.
  // Tolerance je víc než dvojnásobná: se stejnou přísností jako u průhledné
  // láhve by medaile byla čistě náhodná a hráč by neměl důvod to opakovat.
  radek(8, 8, 'G', 'valec', 0.698, 0.15, ['slepe']),
];

export const POSLEDNI_LEVEL = levely.length;

export function level(cislo: number): Level {
  const index = Math.min(Math.max(1, Math.floor(cislo)), levely.length);
  return levely[index - 1];
}
