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
public/                        soubory kopírované 1:1 (favicon, robots.txt, video)
src/layouts/Base.astro         HTML kostra, meta tagy, fonty, navigace, patička
src/components/                Navigace, Paticka, Video, Plamen
src/content/vystrely/          kronika výstřelů — jeden soubor = jeden výstřel
src/content.config.ts          schéma kroniky
src/pages/index.astro          jednostránka
src/pages/vystrely.astro       kronika výstřelů
src/pages/minihra.astro        zástupná stránka minihry
src/styles/global.css          barvy, písma, animace — designový systém webu
grafika/                       stylová bible a zadání pro generování obrázků
scripts/                       generování grafiky a videa
astro.config.mjs               doména, náhledový režim, sitemap, fonty
```

**Barvy a písma se mění na jednom místě:** v bloku `@theme` v `src/styles/global.css`.

### Přidání výstřelu do kroniky

Nový soubor v `src/content/vystrely/`:

```markdown
---
nazev: Název výstřele
datum: 2026-08-14
popis: Krátký popis do karty.
# obrazek: ./nazev.png      volitelně
# video: /video/vystrel-05  volitelně, bez přípony
---

Delší vyprávění do detailu.
```

Nic dalšího se nemění — stránka se přestaví sama.

---

## Grafika

Obrázky dělá **Recraft**, smyčky **fal.ai** (image-to-video z hotových
obrázků, aby video nemohlo ujet jinam než zbytek webu).

### API klíče

Klíče patří **výhradně do souboru `.env`** v kořeni projektu:

```bash
cp .env.example .env     # a doplnit hodnoty
```

`.env` je v `.gitignore`, takže se do repozitáře nedostane. Navíc je tu
pojistka — hák, který commit s klíčem zastaví. **Jednou po naklonování**
ho zapněte (nastavení háků se neklonuje):

```bash
git config core.hooksPath .githooks
```

Klíče potřebují jen skripty v `scripts/`, které běží u vás na počítači.
Web ani jeho nasazení na GitHub Pages je nepoužívají, takže do nastavení
repozitáře na GitHubu nepatří.

> **Nikdy nepojmenujte proměnnou `PUBLIC_…`** — takové Astro záměrně vloží
> do JavaScriptu poslaného do prohlížeče a klíč by byl veřejný.

```bash
# 1. do grafika/reference/ vložte 1–5 obrázků s cílovou náladou
npm run styl        # založí vlastní styl a zapíše jeho ID do grafika/styl.json
npm run obrazky     # vygeneruje vše z grafika/zadani.json
npm run video       # rozpohybuje vybrané obrázky podle grafika/video.json

npm run obrazky -- --jen=hero    # jen jeden kus
npm run obrazky -- --znovu       # přepsat i hotové
```

Podrobnosti a limity velikosti videa jsou v [PLAN.md](PLAN.md), kapitola 5a.

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
