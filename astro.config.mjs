// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Ostrá adresa webu. Používá se pro sitemap.xml a kanonické odkazy.
  site: 'https://buliban.cz',

  integrations: [sitemap()],

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
