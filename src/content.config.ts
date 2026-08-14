import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// Astro 7 svůj re-export `z` označilo za zastaralý — zod se importuje přímo.
import { z } from 'zod';

/**
 * Jednotlivé výstřely — kronika pozoruhodných okamžiků.
 *
 * Každý záznam je jeden Markdown soubor v `src/content/vystrely/`.
 * Přidat nový výstřel znamená přidat soubor; nic dalšího se nemění.
 */
const vystrely = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/vystrely' }),
  schema: ({ image }) =>
    z.object({
      nazev: z.string(),
      datum: z.coerce.date(),
      /** Krátký popis do karty; delší vyprávění patří do těla souboru. */
      popis: z.string(),
      /** Obrázek vedle Markdownu. Zatím nepovinný — než bude grafika hotová. */
      obrazek: image().optional(),
      /**
       * Cesta ke smyčce bez přípony, např. `/video/vystrel-01`.
       * Očekává dvojici `.webm` + `.mp4` v `public/`.
       */
      video: z.string().optional(),
      /** Vlastní pořadí v kronice; když chybí, řadí se podle data. */
      poradi: z.number().optional(),
    }),
});

export const collections = { vystrely };
