/**
 * Všechny texty hry na jednom místě.
 *
 * Dva důvody, oba praktické. Kap. 10 herního designu chce texty oddělené kvůli
 * pozdější angličtině. A doplnit výklad je pak edit jednoho souboru, ne
 * hledání řetězců rozsypaných po vykreslování.
 *
 * Tón podle kap. 8: aktivní, věcný, bez omluv a bez moralizování.
 */

import type { Level } from './levely.ts';
import type { FazeRozlevani } from './jadro/rozlevani.ts';
import type { Medaile } from './jadro/skore.ts';

export const napovedy: Record<FazeRozlevani, string> = {
  ceka: 'Drž a nalévej',
  naklani: 'Láhev se otáčí…',
  leje: 'Pusť, až bude dost',
  dokapava: 'Ještě dokapává',
  presouva: 'Do tohohle už nedolijeme',
  dozniva: 'A je rozlito',
  hotovo: '',
};

export const napovedaPosledni = 'Poslední panák — v láhvi nesmí nic zůstat';

/**
 * Karta před levelem. Vysvětluje **jen to, co je nové** — opakovat pokaždé
 * všechna pravidla by hráče naučilo kartu přeskakovat.
 */
export interface Karta {
  nadpis: string;
  radky: string[];
}

export const karty: Record<number, Karta> = {
  1: {
    nadpis: 'Rozlij to spravedlivě',
    radky: [
      'Obsah láhve má skončit rozdělený mezi panáky na stole. Ve všech stejně.',
      'Drž — teče. Pustíš — přestane a láhev se posune k dalšímu.',
      'Do panáku se lije jednou. Dolít se nedá.',
      'Nejdřív se na to podívej. Body zatím nehrajou roli.',
    ],
  },
  2: {
    nadpis: 'Teď ty',
    radky: [
      'Ryska na panáku ukazuje, kam až nalít.',
      'Pozor na dokapávání — po puštění ještě chvíli teče.',
    ],
  },
  3: {
    nadpis: 'Ryska zhasla',
    radky: [
      'Odteď musíš odhadnout sám, kolik je v láhvi, a vydělit to počtem panáků.',
      'Co zůstane v láhvi, se počítá jako chyba.',
    ],
  },
  4: {
    nadpis: 'Tři panáky a láhev s ramenem',
    radky: [
      'Tahle láhev se nahoře zužuje: poslední třetina výšky pojme sotva desetinu obsahu.',
      'Výška hladiny už neodpovídá množství.',
    ],
  },
  5: {
    nadpis: 'Kónický panák',
    radky: [
      'Panák se rozšiřuje vzhůru. Do poloviny výšky se vejde míň než polovina.',
      'Láhev se zužuje taky — nahoře je jí míň, než to vypadá.',
    ],
  },
  6: {
    nadpis: 'Všechno je břichaté',
    radky: [
      'Láhev i panák jsou nejširší uprostřed. Přesně opačná past než minule.',
      'Hladina v půlce výšky je nad polovinou obsahu.',
    ],
  },
  7: {
    nadpis: 'Hosté si panáky odnášejí',
    radky: [
      'Nalitý panák zmizí ze stolu. Porovnávat nebude s čím — zbývá paměť a hladina v láhvi.',
      'Karafa má dvě vypoukliny a každá tvrdí něco jiného.',
    ],
  },
  8: {
    nadpis: 'Etiketa přes hladinu',
    radky: ['Kus láhve není vidět. Odhadnout to jde, ale bude to bolet.'],
  },
  9: {
    nadpis: 'Naslepo',
    radky: [
      'Neprůhledná láhev. Kolik je v těle, se nedozvíš.',
      'Čiré zůstalo jen hrdlo — uvidíš, že teče a jak silně, ale ne kolik zbývá.',
      'Tolerance je tu mnohem volnější. Ber to jako historku, ne jako zkoušku.',
    ],
  },
};

/** Komentář k ukázce. Váže se na fázi a panák, ne na stopky — nemůže se rozejít. */
export function komentarUkazky(faze: FazeRozlevani, aktivni: number, panaku: number): string {
  if (faze === 'ceka') {
    return aktivni === 0
      ? 'V láhvi je rum. Na stole dva panáky. Do každého má přijít stejně.'
      : 'Láhev se sama posunula. Zpátky už to nejde.';
  }
  if (faze === 'naklani') return 'Stisk láhev nakloní. Teprve pak začne téct z hrdla.';
  if (faze === 'leje') return 'Drží se, dokud neteče dost. Ryska ukazuje kam.';
  if (faze === 'dokapava') return 'Po puštění to ještě dokape. Tohle se hráč učí předvídat.';
  if (faze === 'presouva') {
    return aktivni + 1 >= panaku ? 'Hotovo.' : 'A jde se k dalšímu panáku.';
  }
  return 'V láhvi nic nezůstalo a v panácích je stejně. Takhle to má vypadat.';
}

export const ukazka = {
  znacka: 'Ukázka',
  patka: 'Tohle si teď zkusíš sám',
  preskocit: 'Přeskočit ukázku',
};

export const medaile: Record<Exclude<Medaile, null>, string> = {
  zlato: 'Zlatý Buliban',
  stribro: 'Stříbrný Buliban',
  bronz: 'Bronzový Buliban',
};

export const bezMedaile = 'Bez medaile';

export const vysledek = {
  linka: 'Tolik měl mít každý',
  rovnomernost: 'Přesnost',
  cas: 'Bonus za čas',
  preliti: 'Přelito',
  rozlito: 'Rozlito vedle',
  zbytek: 'Zůstalo v láhvi',
  presnaRuka: 'Přesná ruka',
  celkem: 'Celkem',
  dal: 'Klikni nebo stiskni mezerník',
};

export const konec = {
  nadpis: 'Rozlito do dna',
  znovu: 'Hrát znovu',
};

/** Tituly podle celkového skóre (kap. 6). */
const tituly: [number, string][] = [
  [28000, 'Velký Bulibán'],
  [18000, 'Strážce plamene'],
  [10000, 'Bulibanista'],
  [4000, 'Nalévač'],
  [0, 'Nováček u stolu'],
];

export function titul(skore: number): string {
  for (const [prah, jmeno] of tituly) if (skore >= prah) return jmeno;
  return tituly[tituly.length - 1][1];
}

export function popisLevelu(l: Level): string {
  return `Level ${l.cislo} · ${l.panaku} ${l.panaku < 5 ? 'panáky' : 'panáků'}`;
}
