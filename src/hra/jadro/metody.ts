/**
 * Katalog metod zahřívání (kap. 5.2).
 *
 * Celá tabulka stojí na jednom kompromisu: **násobitel odměňuje pomalé
 * a tradiční metody, riziko odměňuje rychlé.** Kdo spěchá, hraje o body.
 * Tření v dlaních je nejpomalejší bez rizika a má nejvyšší násobitel;
 * plamen dohřeje za pět vteřin, ale nad 95 jednotkami praskne sklo.
 *
 * „Zahřívání přes oděv" má strop 55 jednotek schválně — samo nedohřeje
 * a nutí metody kombinovat. Web to tak popisuje taky.
 *
 * Teplota je ve **stylizovaných jednotkách 0–100, nikdy ve °C** (kap. 11).
 * Hra není návod a tahle škála je to, co ji od návodu drží.
 */

import { PRASKNE_NAD } from '../ladeni.ts';

export type MetodaId = 'dlane' | 'kolena' | 'odev' | 'rucnik' | 'fen' | 'voda' | 'plamen';

export interface Metoda {
  id: MetodaId;
  nazev: string;
  /** Přírůstek zahřátí za sekundu držení. */
  rychlost: number;
  /** Jednorázové přetečení po puštění — tím se přestřelí cílové pásmo. */
  setrvacnost: number;
  /** Úbytek za sekundu, když se nedrží. */
  chladnuti: number;
  /** Strop, přes který metoda sama nedohřeje. Jen „přes oděv". */
  strop?: number;
  /** Nad touhle teplotou praskne sklo. Jen „nad plamenem". */
  praskneNad?: number;
  nasobitel: number;
  /** Od kterého levelu je metoda k dispozici. */
  odemcenoOd: number;
}

/**
 * Pořadí je pořadí dlaždic na obrazovce a zároveň pořadí z dokumentu —
 * od nejtradičnější k nejrizikovější. Hráč tak čte tabulku shora dolů jako
 * škálu „bezpečné a pomalé → rychlé a drahé".
 */
const katalog: Metoda[] = [
  {
    id: 'dlane',
    nazev: 'Tření v dlaních',
    rychlost: 4,
    setrvacnost: 1,
    chladnuti: 1.5,
    nasobitel: 1.25,
    odemcenoOd: 1,
  },
  {
    id: 'kolena',
    nazev: 'Tření o kolena',
    rychlost: 5,
    setrvacnost: 1,
    chladnuti: 1.5,
    nasobitel: 1.2,
    odemcenoOd: 2,
  },
  {
    id: 'odev',
    nazev: 'Přes oděv',
    rychlost: 2.5,
    setrvacnost: 0.5,
    chladnuti: 1,
    // Sám nedohřeje. Je to jediná metoda se stropem a jediný důvod, proč se
    // metody vůbec musí kombinovat.
    strop: 55,
    nasobitel: 1.15,
    odemcenoOd: 1,
  },
  {
    id: 'rucnik',
    nazev: 'Teplý ručník',
    rychlost: 3.5,
    setrvacnost: 2,
    // Drží teplo nejdéle — nejpomalejší chladnutí v katalogu. Vyplatí se,
    // když hráč potřebuje čas na uzávěr a zápalku.
    chladnuti: 0.8,
    nasobitel: 1.1,
    odemcenoOd: 3,
  },
  {
    id: 'fen',
    nazev: 'Fén',
    rychlost: 9,
    setrvacnost: 3,
    chladnuti: 2,
    nasobitel: 1,
    odemcenoOd: 4,
  },
  {
    id: 'voda',
    nazev: 'Teplá voda',
    rychlost: 12,
    setrvacnost: 5,
    chladnuti: 2.5,
    nasobitel: 0.95,
    odemcenoOd: 1,
  },
  {
    id: 'plamen',
    nazev: 'Nad plamenem',
    rychlost: 20,
    setrvacnost: 9,
    chladnuti: 3.5,
    praskneNad: PRASKNE_NAD,
    nasobitel: 0.85,
    odemcenoOd: 5,
  },
];

const podleId = new Map<MetodaId, Metoda>(katalog.map((m) => [m.id, m]));

export function metoda(id: MetodaId): Metoda {
  const nalezena = podleId.get(id);
  if (!nalezena) throw new Error(`Neznámá metoda zahřívání: ${id}`);
  return nalezena;
}

/**
 * Metody dostupné na levelu. Level 1 nabízí tři (dlaně, oděv, teplá voda),
 * každý další odemkne jednu — od L5 je k dispozici celý katalog.
 *
 * Odemykání je jediná progrese, kterou dokument fázi 3 dává, a je to důvod
 * hrát dál: nová metoda mění, jak se dá pásmo trefit.
 */
export function metodyProLevel(cisloLevelu: number): Metoda[] {
  return katalog.filter((m) => m.odemcenoOd <= cisloLevelu);
}

/** Metody, které se odemykají právě teď. Karta levelu je vyjmenuje. */
export function noveMetody(cisloLevelu: number): Metoda[] {
  return katalog.filter((m) => m.odemcenoOd === cisloLevelu && cisloLevelu > 1);
}

export function vsechnyMetody(): Metoda[] {
  return [...katalog];
}
