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
  site: nahled ? 'https://mirekplachy.github.io' : 'https://buliban.eu',
  base: nahled ? '/buliban' : '/',

  // Potvrzení po odeslání formuláře do sitemapy nepatří — samo o sobě
  // nic neříká a ve výsledcích hledání by jen mátlo.
  integrations: [sitemap({ filter: (url) => !url.includes('/odeslano') })],

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
