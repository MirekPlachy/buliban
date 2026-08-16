# Vlastní obrázky

Sem patří obrázky, které **nedělá generátor** — vyfocené, stažené, ručně
upravené. Astro je zpracuje stejně jako ty generované: zmenší na velikost,
v jaké se opravdu vykreslují, převede do WebP a do názvu souboru dá hash.

Zapojení do stránky:

```astro
import obrMuj from '../assets/vlastni/muj-obrazek.webp';

<Image src={obrMuj} alt="…" class="aspect-square w-full object-cover" />
```

Zdroj klidně velký; ořez a zmenšení řeší `Image` při buildu. WebP je ideální,
JPG i PNG projdou taky. Názvy malými písmeny, bez diakritiky, se spojovníky.

## Proč vlastní složka, a ne `generovane/`

Ke každému souboru v [../generovane/](../generovane/) existuje položka
v [grafika/zadani.json](../../../grafika/zadani.json) s promptem, seedem
a zámkem — u kteréhokoli obrázku jde dohledat, proč vypadá, jak vypadá.
Ručně přidaný soubor by tenhle předpoklad rozbil. Smazat by ho `npm run
obrazky` sice nesmazal (zapisuje jen cesty ze zadání), ale dohledatelnost
by přestala platit.

## Co sem naopak nepatří

- **Obrázek k zážehu do kroniky** — ten leží vedle svého `.md`
  v [src/content/zazehy/](../../content/zazehy/) a v hlavičce se odkáže
  názvem souboru.
- **Soubor, který potřebuje pevnou URL** (náhled do sociálních sítí, favicon,
  video) — ten patří do `public/`, kde se kopíruje 1:1 bez optimalizace.
