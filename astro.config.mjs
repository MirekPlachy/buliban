// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Náhledový režim: web běží na mirekplachy.github.io/buliban/, tedy
// v PODADRESÁŘI. Bez správného `base` by odkazy na CSS a fonty mířily do
// kořene domény a stránka by se načetla úplně bez stylů.
// Zapíná ho proměnná NAHLED, kterou nastavuje workflow. Až se web přepne
// na vlastní doménu, řádek s NAHLED se z workflow smaže (viz PLAN.md, fáze 4).
const nahled = process.env.NAHLED === '1';

// https://astro.build/config
export default defineConfig({
  // Adresa webu. Používá se pro sitemap.xml a kanonické odkazy.
  site: nahled ? 'https://mirekplachy.github.io' : 'https://buliban.cz',
  base: nahled ? '/buliban' : '/',

  // Potvrzení po odeslání formuláře do sitemapy nepatří — samo o sobě
  // nic neříká a ve výsledcích hledání by jen mátlo.
  integrations: [sitemap({ filter: (url) => !url.includes('/odeslano') })],

  // Staré adresy inPage prezentace. Astro pro každou vygeneruje HTML stránku
  // s `meta refresh` a kanonickým odkazem — plnohodnotnou 301 GitHub Pages
  // neumí. Cíle jsou kotvy z `src/data/kapitoly.ts` a nesmí se rozejít
  // (viz PLAN.md, kapitola 4 a fáze 3, krok 10).
  //
  // Na cíl přesměrování Astro základní cestu nelepí, takže se v náhledovém
  // režimu musí předsadit ručně — jinak by odkaz vedl mimo podadresář.
  redirects: Object.fromEntries(
    Object.entries({
      '/inpage/co-je-to-buliban': '#nauka',
      '/inpage/historie-bulibana': '#historie',
      '/inpage/zpusoby-zahrivani': '#zahrivani',
      '/inpage/vertikalni-versus-horizontalni': '#vertikalni-horizontalni',
      '/inpage/jak-vypustit-bulibana': '#jak-vypustit',
      '/inpage/opakovane-zapaleni': '#opakovane-zapaleni',
      '/inpage/buliban-dnes': '#dnes',
      '/inpage/kontaktni-formular': '#kontakt',
    }).map(([stara, kotva]) => [stara, (nahled ? '/buliban' : '') + '/' + kotva]),
  ),


  // Náhledy YouTube videí v kronice: Astro je při buildu stáhne z i.ytimg.com,
  // zoptimalizuje a servíruje z vlastní domény. Návštěvník na Google nesáhne.
  image: { domains: ['i.ytimg.com'] },

  vite: {
    plugins: [tailwindcss()],
  },

  // Fonty si Astro stáhne při buildu a naservíruje z vlastní domény.
  // Žádné volání na Google při návštěvě webu = žádné cookies, žádné GDPR starosti.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Cinzel',
      cssVariable: '--font-display-raw',
      weights: [400, 600, 700],
      subsets: ['latin', 'latin-ext'],
    },
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-body-raw',
      weights: [400, 500, 700],
      subsets: ['latin', 'latin-ext'],
    },
  ],
});
