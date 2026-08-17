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
import { metoda, noveMetody } from './jadro/metody.ts';
import type { FazeOtevirani } from './jadro/otevirani.ts';
import type { FazeRitualu, StavRitualu, VolbaRitualu } from './jadro/ritual.ts';
import type { FazeRozlevani } from './jadro/rozlevani.ts';
import type { Medaile } from './jadro/skore.ts';

/** Štítky horní lišty. Stejné ve všech fázích, proto vedle nápověd. */
export const hud = {
  level: 'Level',
  panak: 'Panák',
  skore: 'Skóre',
  /** Název právě běžící fáze — v liště místo počtu panáků, kde se nelije. */
  otevirani: 'Otevírání',
  ritual: 'Rituál',
  teplota: 'Zahřátí',
  pokus: 'Pokus',
};

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

export const napovedyOtevirani: Record<FazeOtevirani, string> = {
  pecet: 'Ťukej — sedři pečeť',
  pecetHotova: 'Pečeť dole',
  korek: 'Zmáčkni, když je ukazatel uprostřed',
  zasek: 'Zaseklo se. Znovu.',
  hotovo: '',
};

export const napovedyRitualu: Record<FazeRitualu, string> = {
  poloha: 'Jak bude láhev ležet?',
  zahrivani: 'Drž a hřej. Po puštění láhev chladne a zapalování chvíli trvá.',
  uzaver: 'Sundává se uzávěr…',
  ohen: 'Čím to zapálíš?',
  skrtani: 'Škrtni — zmáčkni uprostřed',
  kresa: 'Nechytlo. Ještě jednou…',
  ceka: 'Drž plamen u hrdla a čekej',
  zazeh: '',
  ticho: '',
  prasklo: '',
  hotovo: '',
};

/** Hlášky po zážehu. Tón podle kap. 8: věcně, bez moralizování. */
export const zazeh = {
  uspech: 'Buliban vypuštěn.',
  ticho: 'Ticho po pěšině. Láhev byla vlažná.',
  prasklo: 'Prasklo sklo. Nad plamenem to chce míru.',
  konecPokusu: 'Tři pokusy pryč. Láhev zůstala studená.',
  ucuknuti: 'Můžeš ucuknout — bezpečně, ale bez bodů.',
};

export const polohy = {
  vertikalni: { nazev: 'Vertikálně', detail: 'Dnem dolů. Užší pásmo, ale ×1,3.' },
  horizontalni: { nazev: 'Horizontálně', detail: 'Na boku. Širší pásmo, bez bonusu.' },
};

export const ohne = {
  zapalka: { nazev: 'Zápalka', detail: 'Škrtnout, hoří 4 s, může ji sfouknout. +15 %.' },
  zapalovac: { nazev: 'Zapalovač', detail: 'Hoří, dokud chceš. Bez bonusu.' },
};

export const uzaver = { nazev: 'Sundat uzávěr', detail: 'Dost bylo hřátí — jde se zapalovat.' };

/**
 * Popisek dlaždice. Scéna kreslí, jádro rozhoduje — proto se překlad z volby
 * na text děje tady, a ne v `ritual.ts`, které nesmí vědět nic o češtině
 * mimo názvy z katalogu metod.
 */
export function popisVolby(volba: VolbaRitualu): { nazev: string; detail: string } {
  switch (volba.druh) {
    case 'poloha':
      return polohy[volba.poloha];
    case 'ohen':
      return ohne[volba.ohen];
    case 'uzaver':
      return uzaver;
    case 'metoda': {
      const m = metoda(volba.metoda);
      const zvlastnost = m.strop
        ? `strop ${m.strop} j`
        : m.praskneNad
          ? `nad ${m.praskneNad} j praskne`
          : `${m.rychlost} j/s`;
      return { nazev: m.nazev, detail: `${zvlastnost} · ×${m.nasobitel.toFixed(2)}` };
    }
  }
}

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
    nadpis: 'Celý rituál od začátku',
    radky: [
      'Level má tři části: otevřít láhev, rozlít ji mezi panáky a z prázdné láhve vypustit Bulibana.',
      'Rozlévání je jádro — obsah má skončit ve všech panácích stejně a dolít se nedá.',
      'Zahřátá prázdná láhev se pak zapaluje. Bez vypuštění se dál nepostupuje.',
      'Každou část ti nejdřív předvedu. Body zatím nehrajou roli.',
    ],
  },
  2: {
    nadpis: 'Ryska zhasla',
    radky: [
      'Odteď musíš odhadnout sám, kolik je v láhvi, a vydělit to počtem panáků.',
      'Co zůstane v láhvi, se počítá jako chyba.',
    ],
  },
  3: {
    nadpis: 'Tři panáky a láhev s ramenem',
    radky: [
      'Tahle láhev se nahoře zužuje: poslední třetina výšky pojme sotva desetinu obsahu.',
      'Výška hladiny už neodpovídá množství.',
    ],
  },
  4: {
    nadpis: 'Kónický panák',
    radky: [
      'Panák se rozšiřuje vzhůru. Do poloviny výšky se vejde míň než polovina.',
      'Láhev se zužuje taky — nahoře je jí míň, než to vypadá.',
    ],
  },
  5: {
    nadpis: 'Všechno je břichaté',
    radky: [
      'Láhev i panák jsou nejširší uprostřed. Přesně opačná past než minule.',
      'Hladina v půlce výšky je nad polovinou obsahu.',
    ],
  },
  6: {
    nadpis: 'Hosté si panáky odnášejí',
    radky: [
      'Nalitý panák zmizí ze stolu. Porovnávat nebude s čím — zbývá paměť a hladina v láhvi.',
      'Karafa má dvě vypoukliny a každá tvrdí něco jiného.',
    ],
  },
  7: {
    nadpis: 'Etiketa přes hladinu',
    radky: ['Kus láhve není vidět. Odhadnout to jde, ale bude to bolet.'],
  },
  8: {
    nadpis: 'Naslepo',
    radky: [
      'Neprůhledná láhev. Kolik je v těle, se nedozvíš.',
      'Čiré zůstalo jen hrdlo — uvidíš, že teče a jak silně, ale ne kolik zbývá.',
      'Tolerance je tu mnohem volnější. Ber to jako historku, ne jako zkoušku.',
    ],
  },
};

/**
 * Řádek o odemčených metodách. Doplňuje se ke kartě levelu, protože jinak by
 * se nová metoda objevila mezi dlaždicemi a nikdo by si jí nevšiml.
 */
export function odemceneMetody(cisloLevelu: number): string | null {
  const nove = noveMetody(cisloLevelu);
  if (nove.length === 0) return null;
  const jmena = nove.map((m) => m.nazev.toLowerCase()).join(' a ');
  return nove.length === 1
    ? `Nová metoda zahřívání: ${jmena}.`
    : `Nové metody zahřívání: ${jmena}.`;
}

/** Komentář k ukázce otevírání. Váže se na fázi, ne na stopky. */
export function komentarOtevirani(faze: FazeOtevirani): string {
  switch (faze) {
    case 'pecet':
      return 'Kolem hrdla je staniolová pečeť. Sedře se opakovaným ťukáním.';
    case 'pecetHotova':
      return 'Pečeť dole. Teď korek.';
    case 'korek':
      return 'Ukazatel kmitá. Zmáčknout se má uprostřed — čím přesněji, tím víc korek povyjede.';
    case 'zasek':
      return 'Mimo pásmo se korek zasekne. Nestojí to body, jen čas.';
    default:
      return 'Korek venku. Za rychlé otevření je bonus.';
  }
}

/** Komentář k ukázce rituálu. Bere celý stav — fází je tu víc než u ostatních. */
export function komentarRitualu(stav: StavRitualu): string {
  switch (stav.faze) {
    case 'poloha':
      return 'Láhev je prázdná a začíná rituál. Napřed poloha: nastojato je pásmo užší, ale platí líp.';
    case 'zahrivani':
      return stav.metodaId
        ? 'Hřeje se přes pásmo. Než přijde zážeh, láhev kus tepla ztratí — a s tím se počítá.'
        : 'Nejdřív metoda. Pomalé a tradiční berou vyšší násobitel.';
    case 'uzaver':
      return 'Uzávěr dolů. Od téhle chvíle láhev jen chladne.';
    case 'ohen':
      return 'Zápalka dává víc bodů, ale hoří jen chvíli. Zapalovač počká.';
    case 'skrtani':
      return 'Zápalka se musí škrtnout. Zase uprostřed.';
    case 'kresa':
      return 'Nechytlo napoprvé. Stojí to jen vteřinu — a v ní láhev chladne.';
    case 'ceka':
      return 'A teď držet plamen u hrdla a čekat. Chytne to samo, jen ne hned.';
    case 'zazeh':
      return 'Buliban vypuštěn. Přesně uprostřed pásma.';
    case 'ticho':
      return 'Mimo pásmo se nestane nic. Láhev byla vlažná.';
    case 'prasklo':
      return 'Nad plamenem to praskne. Proto má nejnižší násobitel.';
    default:
      return 'Hotovo. Takhle to má vypadat.';
  }
}

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
  /**
   * Předání ovládání po ukázce. Ukazuje se místo nápovědy, dokud hráč
   * nenalije — scéna se v tu chvíli nezmění, takže se to musí říct.
   */
  patka: 'Teď ty. Drž a nalévej.',
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
  otevirani: 'Otevření láhve',
  zazehBody: 'Zážeh',
  rozlevaniBody: 'Rozlévání',
  celkem: 'Celkem',
  dal: 'Klikni nebo stiskni mezerník',
};

export const konec = {
  nadpis: 'Rozlito do dna',
  body: 'bodů celkem',
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
