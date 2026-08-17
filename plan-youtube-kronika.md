# Kronika = YouTube videa z kanálu @Objev-Bulibana (klik pro přehrání)

## Kontext

Stránka Zážehy/Kronika (`src/pages/zazehy.astro`) se předělá tak, že každá karta = jedno YouTube video z kanálu @Objev-Bulibana (kanál `UC_Lbn8cBBqyKEJrl_5S2aCw`) — běžná videa i shorts dohromady v jedné mřížce. Stávající 4 placeholderové záznamy se využijí a jejich obsah se nahradí podle skutečných videí.

Zásadní omezení: projekt **záměrně nemá cookie lištu** (PLAN.md:235 zakazuje klasický YouTube embed). Řešení je façade vzor: do kliknutí návštěvníka nejde na Google **žádný** požadavek — náhled se servíruje z vlastní domény, teprve klik na play vloží iframe z `www.youtube-nocookie.com`.

**Odpověď na otázku s popisky: na YouTube nic vyplňovat nemusíte.** Název, datum a popisek karty se píšou do frontmatteru .md souboru v repu (jako dosud). Jediné, co se z YouTube bere, je ID videa (a náhledový obrázek, ten se ale stáhne při buildu a servíruje z vlastního webu). Přidat video do kroniky = vytvořit malý .md soubor s ~5 řádky.

Konvence projektu: čeština v kódu i názvech (CLAUDE.md), Tailwind v4 tokeny (`noc-*`, `plamen-400/500`, `kour-400`, `uhel-300`), `focus-visible:ring-2 ring-plamen-400` na interaktivních prvcích.

## Kroky

### 1. Schéma — `src/content.config.ts`

Do kolekce `zazehy` přidat (s českými doc-komentáři jako u ostatních polí):

```ts
/** ID videa na YouTube (11 znaků z adresy). Přehrává se až po kliknutí. */
youtube: z.string().regex(/^[\w-]{11}$/).optional(),
/** Poměr stran videa; shorts jsou '9:16'. */
youtubePomer: z.enum(['16:9', '4:3', '9:16']).default('16:9'),
```

Pole `video` (lokální smyčky) a `obrazek` v schématu zůstávají — `obrazek` nově slouží jako ruční přepis náhledu, `video` se na kartách přestane používat, ale schéma se nerozbíjí.

### 2. Náhledy z YouTube bez requestů návštěvníků — `astro.config.mjs`

Povolit build-time optimalizaci vzdálených obrázků:

```js
image: { domains: ['i.ytimg.com'] },
```

Astro pak `<Image src={'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'} …>` při buildu **stáhne, zoptimalizuje a servíruje z vlastní domény** (`_astro/…`). Návštěvník na Google nesáhne. Priorita náhledu v kartě: `obrazek` (ruční přepis) → i.ytimg thumbnail (automaticky z ID) → `Plamen`.

Pozn.: build tím získá síťovou závislost na i.ytimg.com — při výpadku spadne build, ne web. Přijatelné.

### 3. Nová komponenta — `src/components/YoutubePrehravac.astro`

Props: `videoId: string`, `pomer: '16:9' | '4:3' | '9:16'`, `popis: string`. Náhled dodá volající slotem. Struktura v obalu `relative h-full w-full` s `data-video={videoId}` a `data-pomer`:

1. **Náhled** (slot) přes celou kartu, `object-cover`; hover-scale (`group-hover:scale-[1.04]`) jen na této vrstvě, ne na iframu.
2. **Rozostření** — skrytá vrstva (`hidden`) `absolute inset-0 backdrop-blur-xl bg-noc-950/50`; odkryje se s iframem a vyplní zbytek karty za letterbox/pillarbox videem.
3. **Jeviště** — vycentrovaný blok se skutečným poměrem videa; statická mapa tříd (Tailwind neumí interpolaci):
   ```ts
   const pomery = { '16:9': 'aspect-video', '4:3': 'aspect-[4/3]', '9:16': 'aspect-[9/16]' };
   ```
   Pro 9:16 `max-h-full` (pillarbox), pro 16:9 `max-w-full` (tenký letterbox), 4:3 vyplní kartu celou.
4. **Tlačítko** `<button data-prehrat>` přes `absolute inset-0 z-10`, uvnitř kruh s play ikonou (inline SVG): `bg-noc-950/70 backdrop-blur`, hover `bg-plamen-500 text-noc-950`, `focus-visible:ring-2 focus-visible:ring-plamen-400 focus-visible:outline-none`, `aria-label={'Přehrát video: ' + popis}`.

Skript (vanilla TS ve stylu `Video.astro`, komentáře česky): na `click` (`{ once: true }`):

```ts
const iframe = document.createElement('iframe');
iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
iframe.title = popis;
iframe.className = 'h-full w-full';
```

vložit do jeviště, odkrýt rozostření, odstranit tlačítko, `iframe.focus()`. `autoplay=1` je i s `prefers-reduced-motion` v pořádku — jde o výslovnou akci uživatele. Žádný `preconnect`/`prefetch` na Google domény před kliknutím.

### 4. Karta — `src/pages/zazehy.astro`

Náhledová část karty (řádky 68–93) se zjednoduší: kronika jsou jen YouTube videa, takže větev s lokální smyčkou (`Video`) se odstraní:

```astro
{zazeh.data.youtube ? (
  <YoutubePrehravac videoId={zazeh.data.youtube} pomer={zazeh.data.youtubePomer}
    popis={`Zážeh ${zazeh.data.nazev}`}>
    <Image
      src={zazeh.data.obrazek ?? `https://i.ytimg.com/vi/${zazeh.data.youtube}/hqdefault.jpg`}
      alt="" width={800} height={600} widths={[400, 800]}
      sizes="(max-width: 640px) 100vw, 33vw"
      class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
  </YoutubePrehravac>
) : ( <div class="flex h-full w-full items-center justify-center"><Plamen …/></div> )}
```

(U vzdálené adresy vyžaduje `<Image>` `width`/`height` — u hqdefault je to 480×360, případně použít `inferSize`.) `alt=""` — popis nese aria-label tlačítka. Odznaku pořadí (řádek 90) přidat `pointer-events-none z-20`.

### 5. Data — `src/content/zazehy/*.md`

Do všech 4 stávajících záznamů doplnit `youtube: <ID>` (+ `youtubePomer: '9:16'` u shortů) a přepsat `nazev`/`datum`/`popis` podle skutečných videí. **ID a texty dodá uživatel** — při implementaci se ho zeptat, případně dočasně nechat zástupné ID a jasně to označit. Řádek `obrazek:` ze záznamů odstranit (náhled půjde z YouTube); .webp soubory zatím nechat na místě.

## Ověření

1. `npm run dev` → `/zazehy/`
2. Network tab: před kliknutím **žádný** požadavek na `youtube*`, `ytimg`, `google*`, `doubleclick`; náhledy jdou z vlastní domény; žádné cookies třetích stran.
3. Klik na play → iframe z `youtube-nocookie.com`, video hraje; short = pillarbox, 16:9 = letterbox, okolí vyplní rozmazaný náhled.
4. Klávesnice: Tab → ring na tlačítku, Enter → přehrání, fokus skončí v iframu.
5. `npm run build` projde (stažení náhledů z i.ytimg.com při buildu) a `npm run check` bez chyb.
