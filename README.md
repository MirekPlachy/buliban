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
src/content/zazehy/            kronika zážehů — jeden soubor = jeden zážeh
src/content.config.ts          schéma kroniky
src/assets/generovane/         obrázky z `npm run obrazky` — ke každému je zadání
src/assets/vlastni/            obrázky přidané ručně, mimo generátor
src/pages/index.astro          jednostránka
src/pages/zazehy.astro         kronika zážehů
src/pages/minihra.astro        stránka minihry (holá, hra běží přes celé okno)
src/hra/                       minihra „Vypusť Bulibana!" — vlastní CLAUDE.md
src/styles/global.css          barvy, písma, animace — designový systém webu
grafika/                       stylová bible a zadání pro generování obrázků
kandidati/                     neposouzení kandidáti obrázků (mimo git)
scripts/                       generování grafiky a videa
astro.config.mjs               doména, náhledový režim, sitemap, fonty
```

**Barvy a písma se mění na jednom místě:** v bloku `@theme` v `src/styles/global.css`.

### Přidání zážehu do kroniky

Nový soubor v `src/content/zazehy/`:

```markdown
---
nazev: Název zážehu
datum: 2026-08-14
popis: Krátký popis do karty.
# obrazek: ./nazev.png     volitelně
# video: /video/zazeh-05   volitelně, bez přípony
---

Delší vyprávění do detailu.
```

Nic dalšího se nemění — stránka se přestaví sama.

---

## Minihra

Kód hry žije v `src/hra/` jako soběstačná složka s vlastním
[CLAUDE.md](src/hra/CLAUDE.md). Herní design je v
[buliban-minihra-herni-design.md](buliban-minihra-herni-design.md).

Hotová je **fáze 2 — rozlévání**, tedy jádro hry: devět levelů, tvary lahví
i panáků, ukázka s výkladem, bodování a medaile. Běží na `/minihra/`.
Chybí fáze 1 a 3 (korek, zahřátí, zážeh), věková brána, zvuk a ukládání.

```bash
npm test                                          # invarianty simulace
npm run hra -- --level=3 --seed=1 --drzeni=1.8,1.7 # přehrání levelu v terminálu
npm run hra -- --level=7 --seed=42 --ideal        # jak vypadá dokonalá hra
npm run hra -- --hraci                            # medaile podle modelu hráče
npm run hra -- --prehled                          # dosažitelnost napříč levely
```

Simulace v `src/hra/jadro/` **nesmí sáhnout na DOM ani canvas.** Díky tomu
se ladí příkazem v terminálu, ne klikáním, a testy běží pod holým Node bez
prohlížeče. Obtížnost se nastavuje přes `--hraci`, ne přes `--ideal`:
dokonalé držení je lepší než kdokoli živý.

Adresa hry bere `?seed=vecirek` (stejné podmínky pro všechny hráče),
`?level=7` a `?debug=1` (objemy, průtok, fáze v reálném čase, přepínač levelu).

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

npm run obrazky -- --jen=og      # jen jeden kus
npm run obrazky -- --znovu       # přepsat i hotové
```

Položka se `zamceno: true` v `grafika/zadani.json` je schválený obrázek —
hromadné `--znovu` ji přeskočí a v běhu se ohlásí zámkem. Přepsat ji jde
jen adresně: `npm run obrazky -- --jen=nauka --znovu`.

### Výběr z kandidátů

`--znovu` hotový soubor **přepíše**. U scén s lidmi, kde projde zhruba
každý třetí pokus, to znamená, že povedený obrázek zmizí pod horším —
a zpátky ho nikdo nedostane. Na opakování je proto druhý skript, který
generuje bokem do `kandidati/` a v projektu nesáhne na nic:

```bash
npm run kandidati -- --jen=dnes --pocet=4   # vygeneruje výběr
npm run kandidati -- --jen=dnes --nasad=2   # vítěz jde do projektu
```

Kandidáti se generují souběžně, takže čtyři kusy trvají stejně jako jeden.
Složka `kandidati/` je v `.gitignore`; do repozitáře jde až nasazený vítěz.

Podrobnosti a limity velikosti videa jsou v [PLAN.md](PLAN.md), kapitola 5a.

### Dvě pravidla, která se nesmí porušit

Nejsou to stylové preference, ale popis toho, co Buliban je. Zákazy k oběma
drží společný negativní seznam v `grafika/styl.json`, takže platí na každý
obrázek; v promptech se k nim dopisuje kladné znění.

1. **Nádoba je vždycky láhev rumu, a je prázdná** — pár mililitrů na dně, nic
   víc. Žádné víno, žádné skleničky, žádná karafa. Bez téhle věty v promptu
   sklouzne scéna do barového zátiší: ze zadání „zahřívání fénem" vyšla parta
   se sklenkami vína.
2. **Plamen hoří uvnitř skla, nikdy nad hrdlem.** Buliban je ten plamen, co
   po zahřátí vzplane u dna láhve a během vteřiny spálí i uvolněný plyn —
   celé se to odehrává za sklem. „Modrý plamen u hrdla" si model vyloží jako
   svářecí hořák nebo olejovou lampu s knotem; obojí už z generátoru vyšlo.

Jediná výjimka je `nauka` — těsný detail nad hrdlem, který zadavatel schválil.
Proto je zamčený.

### Co se při psaní promptů osvědčilo

Zkušenosti z první hotové sady. Ušetří peníze, protože každý pokus stojí $0,04.

- **Krátký prompt vyhrává.** Zamčený styl je silný; ze čtyř vět si model vezme
  jednu. Konkrétní zadání proto jde do API **před** `spolecnyPrompt` a je
  vysloveně věcné.
- **Do `spolecnyPrompt` nepatří scéna.** Jakmile tam stálo „warm golden lantern
  light“ a „friends around“, přebilo to konkrétní zadání a z hera vyšel nalévaný
  panák. Společný prompt popisuje jen film, tmu a zrno.
- **Slovo, které pojmenovává věc, tu věc přimaluje.** „Lantern“ udělalo z lucerny
  hlavní motiv a láhev zmizela. Píše se „teplé zlaté světlo“, ne zdroj.
- **A přimaluje i to, co k té věci patří.** „Long nozzle of a kitchen gas
  lighter“ nedalo zapalovač, ale zahnutou hubici, a k ní model dokreslil celý
  svářecí hořák nad láhví. Nástroj se pojmenovává celý a jednoduše — „hořící
  špejle“ —, ne po jeho součástce.
- **„Wide shot“ neznamená odstup, ale libovolný úhel.** U tření z něj vyšel
  půdorys stolu s useknutými hlavami. Spolehlivě zabírá „seen from the side at
  eye level, their faces lit and visible“ plus zákaz `view from above`.
- **Modrá se rozlije, kde se nezakáže.** U scén s teplým světlem patří do
  `negativni` položky `blue light, blue clothing`, jinak vyjde noční modř.
  Naopak u zážehu se modrá zakázat nesmí — je to celý smysl webu.
- **Zátiší vycházejí spolehlivě, scény s lidmi ne.** Láhev, plamen a zapalovadlo
  sednou na první pokus. U scény, kde má několik lidí dělat konkrétní věc, projde
  zhruba každý třetí pokus — na to je `npm run kandidati`.
- **Věta začíná činností, ne kulisou.** „Three friends sit at a table…“ dalo partu
  u stolu a metoda zmizela: u tření jen položená ruka, u fénu žádná láhev.
  Podmětem musí být ten, kdo s láhví něco dělá; parta patří až do druhé věty.
- **Barvu neuhlídá zákaz, jen kladné znění — a stejně je potřeba obojí.** Modrá
  se do nočních scén tahá sama. „blue sweater“ v zákazech nestačilo, „krémový
  svetr, teplé jantarové tóny“ v promptu taky ne; teprve dohromady to sedlo.
- **Geometrii nepřepíšete slovy, jen jinou geometrií.** Dokud mířila hořící
  špejle k hrdlu, dělal z toho model pochodeň a plamen vytáhl ven. Pomohlo až
  přepsat scénu tak, že je zapalovadlo už odtažené. Totéž u řady lahví: hrdla
  prostě nejsou v záběru, a plamen tak nemá kam utéct.
- **Content filtry hlídají i nevinná spojení.** Recraft odmítl „rubs the bottle
  between his knees“, fal.ai odmítl „the flame shoots up from the neck and dies
  down“. Pomáhá neutrální sloveso.

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

### Ostrá doména

Web běží na **https://buliban.cz** (18. 8. 2026). Doména má u
Regzone/CZECHIA.COM čtyři A záznamy na `@` (`185.199.108–111.153`), čtyři
AAAA (`2606:50c0:800{0,1,2,3}::153`) a CNAME `www` na
`mirekplachy.github.io.`. Adresu `www.buliban.cz` GitHub sám přesměruje na
apex.

**Na `buliban.cz` běží pošta** (MX na Zoner, SPF, DKIM klíče `zdkim-s1m` a
`zdkim-s2m`, CNAME `autoconfig`). Web ji nijak neovlivňuje — mění se jen A a
AAAA záznamy — ale do sekcí MX a TXT se nesahá a **nameservery se nestěhují**.

### Druhá doména: buliban.eu

`buliban.eu` přesměrovává na `buliban.cz`. GitHub Pages umí jednomu
repozitáři přiřadit jen jednu doménu, takže přesměrování obsluhuje vlastní
repozitář [MirekPlachy/buliban-eu](https://github.com/MirekPlachy/buliban-eu):
jedna HTML stránka, která zachová cestu i kotvu, plus její kopie v `404.html`,
aby fungovala každá adresa. Nasazuje se z větve, ne přes Actions.

Obsah se tedy udržuje **jen tady**. Do druhého repozitáře se sahá jen tehdy,
kdyby se měnily samotné domény.

**Dvě věci, které při přepínání domény zdržely — ať se to příště neopakuje:**

1. Při nasazení přes GitHub Actions **soubor `public/CNAME` vlastní doménu
   nenastaví.** To platí jen pro nasazení z větve. Doménu je potřeba zadat
   v **Settings → Pages → Custom domain**, případně příkazem
   `gh api -X PUT repos/MirekPlachy/buliban/pages -f cname=buliban.cz`.
   Soubor v repozitáři přesto nechte — drží nastavení, kdyby se způsob
   nasazení někdy měnil.
2. Po nastavení domény je potřeba **workflow spustit znovu**. Do té doby
   GitHub na doméně vrací „Site not found", i když je build zelený.

### Náhledový režim (historie)

Než web dostal vlastní doménu, běžel na `mirekplachy.github.io/buliban/`,
tedy v podadresáři. Řešila to proměnná `NAHLED=1`, která v
[astro.config.mjs](astro.config.mjs) přepnula `base` i `site` a přidala
`noindex`. Z workflow už je pryč, ale v konfiguraci zůstala — kdyby bylo
potřeba náhled znovu postavit, stačí `NAHLED=1 npm run build`.

---

## Případný přechod na Cloudflare Pages

Celý web je jen statická složka `dist/`, takže migrace znamená:
propojit stejný repozitář v Cloudflare Pages (build `npm run build`,
výstup `dist`), přidat doménu jako zónu do Cloudflare a přepnout
nameservery. Nic z kódu se nemění.
