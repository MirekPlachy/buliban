# buliban.cz

Webová prezentace Bulibanu. Statický web postavený v [Astro](https://astro.build)
s Tailwind CSS, nasazovaný automaticky na GitHub Pages.

> **Postup prací a rozhodnutí najdete v [PLAN.md](PLAN.md).** Tenhle soubor
> popisuje jen technické zacházení s repozitářem.

---

## Lokální vývoj

```bash
npm install     # jednou po naklonování
npm run dev     # dev server na http://localhost:4321
npm run build   # produkční build do dist/
npm run preview # náhled produkčního buildu
```

Node.js 22 nebo novější.

---

## Struktura

```
.github/workflows/deploy.yml   automatické nasazení na GitHub Pages
public/                        soubory kopírované 1:1 (CNAME, favicon, robots.txt)
src/layouts/Base.astro         HTML kostra, meta tagy, načtení fontů, scroll efekt
src/pages/index.astro          obsah jednostránky
src/styles/global.css          barvy, písma, animace — designový systém webu
astro.config.mjs               doména, sitemap, fonty
```

**Barvy a písma se mění na jednom místě:** v bloku `@theme` v `src/styles/global.css`.

---

## Nasazení

Repozitář: `https://github.com/MirekPlachy/buliban`. Každý push do `main`
spustí workflow `.github/workflows/deploy.yml`, který web postaví a publikuje.
Průběh sledujte v záložce **Actions**; běh trvá zhruba dvě minuty.

### Jednorázové zapnutí Pages

**Settings → General:** repozitář musí být **veřejný** — bez toho Pages na
bezplatném plánu neběží.

**Settings → Pages → Build and deployment → Source: GitHub Actions.**

Web pak naběhne na `https://mirekplachy.github.io/buliban/`.

### Náhledový režim

Dokud web běží na github.io, běží v **podadresáři** `/buliban/`. Proto
workflow staví s proměnnou `NAHLED=1`, která v `astro.config.mjs` přepne
`base` na `/buliban` a `site` na `https://mirekplachy.github.io`. Bez toho
by odkazy na CSS a fonty mířily do kořene domény a stránka by se načetla
bez stylů. Náhled zároveň dostane `noindex`.

Lokálně si stejný režim vyzkoušíte přes `NAHLED=1 npm run build`.

**Při přepnutí na vlastní doménu** (podle [PLAN.md](PLAN.md), fáze 4) se
blok `env: NAHLED` z workflow smaže a založí se `public/CNAME` s řádkem
`buliban.cz`. Ten soubor v repozitáři schválně **není** — jakmile je
v nasazeném výstupu, GitHub si podle něj nastaví vlastní doménu, a dokud
na něj nemíří A záznamy, byl by web nedostupný na obou adresách.

### Přepnutí na vlastní doménu

Celý postup včetně pořadí kroků je v [PLAN.md](PLAN.md), fáze 4 a 5.
Ve zkratce — v DNS manažeru u CZECHIA.COM nastavit:

| Typ | Název | Hodnota |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `mirekplachy.github.io.` |

Volitelně i AAAA záznamy pro IPv6:
`2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`

**Nameservery se nemění** — doména i pošta zůstávají tam, kde jsou.
Stávající MX a TXT záznamy nechte být.

Pak vrátit `public/CNAME`, v **Settings → Pages → Custom domain** zadat
`buliban.cz` a po úspěšné kontrole DNS zaškrtnout **Enforce HTTPS**.

---

## Případný přechod na Cloudflare Pages

Celý web je jen statická složka `dist/`, takže migrace znamená:
propojit stejný repozitář v Cloudflare Pages (build `npm run build`,
výstup `dist`), přidat doménu jako zónu do Cloudflare a přepnout
nameservery. Nic z kódu se nemění.
