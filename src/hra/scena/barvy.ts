/**
 * Paleta hry načtená z designového systému webu.
 *
 * Canvas potřebuje hotový řetězec, ne CSS třídu, ale zdroj barev musí zůstat
 * jeden — jinak by se `global.css` a hra rozešly a nikdo by si toho nevšiml.
 * Proto se hodnoty čtou z CSS proměnných, ne přepisují do konstant.
 */

const NAZVY = {
  sklo: '--color-hra-sklo',
  skloStin: '--color-hra-sklo-stin',
  rum: '--color-hra-rum',
  rumSvetlo: '--color-hra-rum-svetlo',
  par: '--color-hra-par',
  zazeh: '--color-hra-zazeh',
  zhava: '--color-hra-zhava',
} as const;

/** Kdyby se stylopis nenačetl, hra musí být pořád vidět. */
const ZALOHA: Record<keyof typeof NAZVY, string> = {
  sklo: '#0d1f1a',
  skloStin: '#16302a',
  rum: '#c8862b',
  rumSvetlo: '#e8b25c',
  par: '#cfe3d8',
  zazeh: '#5bd1ff',
  zhava: '#ff6b35',
};

export type Paleta = Record<keyof typeof NAZVY, string>;

export function nactiPaletu(): Paleta {
  const styl = getComputedStyle(document.documentElement);
  const paleta = {} as Paleta;
  for (const klic of Object.keys(NAZVY) as (keyof typeof NAZVY)[]) {
    paleta[klic] = styl.getPropertyValue(NAZVY[klic]).trim() || ZALOHA[klic];
  }
  return paleta;
}

/** Barva s průhledností. Canvas neumí `color-mix`, tak alespoň takhle. */
export function pruhledne(barva: string, alfa: number): string {
  const h = barva.replace('#', '');
  const plne = h.length === 3 ? h.split('').map((z) => z + z).join('') : h;
  const r = parseInt(plne.slice(0, 2), 16);
  const g = parseInt(plne.slice(2, 4), 16);
  const b = parseInt(plne.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}
