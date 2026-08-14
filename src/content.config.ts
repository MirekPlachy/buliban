import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// Astro 7 svůj re-export `z` označilo za zastaralý — zod se importuje přímo.
import { z } from 'zod';

/**
 * Jednotlivé zážehy — kronika pozoruhodných okamžiků.
 *
 * Každý záznam je jeden Markdown soubor v `src/content/zazehy/`.
 * Přidat nový zážeh znamená přidat soubor; nic dalšího se nemění.
 */
const zazehy = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/zazehy' }),
  schema: ({ image }) =>
    z.object({
      nazev: z.string(),
      datum: z.coerce.date(),
      /** Krátký popis do karty; delší vyprávění patří do těla souboru. */
      popis: z.string(),
      /** Obrázek vedle Markdownu. Zatím nepovinný — než bude grafika hotová. */
      obrazek: image().optional(),
      /**
       * Cesta ke smyčce bez přípony, např. `/video/zazeh-01`.
       * Očekává dvojici `.webm` + `.mp4` v `public/`.
       */
      video: z.string().optional(),
      /** Vlastní pořadí v kronice; když chybí, řadí se podle data. */
      poradi: z.number().optional(),
    }),
});

export const collections = { zazehy };
