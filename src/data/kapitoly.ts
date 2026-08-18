/**
 * Jediný zdroj pravdy o kapitolách jednostránky.
 *
 * Bere si odtud text hlavička, patička, karty „další kapitola" i samotné
 * sekce v index.astro — aby přejmenování nadpisu nešlo udělat na půl.
 *
 * `id` jsou kotvy do URL. Míří na ně navigace, patička i karty „další
 * kapitola" a objevují se ve sdílených odkazech na jednotlivé sekce —
 * přejmenování je tedy rozbije.
 */
export interface Kapitola {
  /** Kotva bez #. Míří na ni odkazy v navigaci i sdílené adresy sekcí. */
  id: string;
  /** Římské číslo do výpisů. */
  cislo: string;
  /** Nadočko nad nadpisem sekce. */
  poradi: string;
  /** Text <h2> a popisek všude, kde je místo na plný název. */
  nazev: string;
  /** Jednoslovný popisek do horní lišty, kde je místa málo. */
  zkratka: string;
  /** Barva nadočka. Střídá se, ať má stránka rytmus. */
  akcent: 'kour' | 'jiskra';
}

export const kapitoly: Kapitola[] = [
  {
    id: 'nauka',
    cislo: 'I.',
    poradi: 'Kapitola první',
    nazev: 'Co je to Buliban?',
    zkratka: 'Nauka',
    akcent: 'kour',
  },
  {
    id: 'historie',
    cislo: 'II.',
    poradi: 'Kapitola druhá',
    nazev: 'Historie Bulibana',
    zkratka: 'Historie',
    akcent: 'jiskra',
  },
  {
    id: 'zahrivani',
    cislo: 'III.',
    poradi: 'Kapitola třetí',
    nazev: 'Způsoby zahřívání',
    zkratka: 'Zahřívání',
    akcent: 'kour',
  },
  {
    id: 'vertikalni-horizontalni',
    cislo: 'IV.',
    poradi: 'Kapitola čtvrtá',
    nazev: 'Vertikálně, nebo horizontálně?',
    zkratka: 'Poloha',
    akcent: 'jiskra',
  },
  {
    id: 'jak-vypustit',
    cislo: 'V.',
    poradi: 'Kapitola pátá',
    nazev: 'Jak vypustit Bulibana',
    zkratka: 'Vypuštění',
    akcent: 'kour',
  },
  {
    id: 'opakovane-zapaleni',
    cislo: 'VI.',
    poradi: 'Kapitola šestá',
    nazev: 'Opakované zapálení',
    zkratka: 'Opakování',
    akcent: 'jiskra',
  },
  {
    id: 'dnes',
    cislo: 'VII.',
    poradi: 'Kapitola sedmá',
    nazev: 'Buliban dnes',
    zkratka: 'Dnes',
    akcent: 'kour',
  },
];

/** Poslední sekce jednostránky. Není číslovaná kapitola, ale scrolluje se k ní stejně. */
export const kontakt: Kapitola = {
  id: 'kontakt',
  cislo: '',
  poradi: 'Spolupráce',
  nazev: 'Ozvěte se',
  zkratka: 'Ozvěte se',
  akcent: 'jiskra',
};

/** Všechno, co je na jednostránce — v pořadí, v jakém se to při scrollování potká. */
export const sekce: Kapitola[] = [...kapitoly, kontakt];

/** Samostatné stránky mimo jednostránku. */
export const stranky = [
  { cil: '/zazehy/', text: 'Zážehy' },
  { cil: '/minihra/', text: 'Minihra' },
];

/**
 * Co následuje po dané sekci. Za sedmou kapitolou je kontakt, za kontaktem nic —
 * tam už je patička s celým rozcestníkem.
 */
export function dalsiPo(id: string): Kapitola | undefined {
  return sekce[sekce.findIndex((s) => s.id === id) + 1];
}

/**
 * Tailwind si třídy hledá v kódu jako doslovné řetězce, takže se nedají skládat
 * z proměnné (`text-${akcent}-400` scanner nenajde). Odtud tedy mapa.
 */
export const akcentTrida: Record<Kapitola['akcent'], string> = {
  kour: 'text-kour-400',
  jiskra: 'text-jiskra-400',
};
