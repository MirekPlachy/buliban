# buliban.cz

Webová prezentace Bulibanu. Statický web postavený v [Astro](https://astro.build)
s Tailwind CSS, nasazovaný automaticky na GitHub Pages.

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

## Nasazení — jednorázové nastavení

### 1. Repozitář na GitHubu

Založte repozitář (třeba `buliban`) a nahrajte do něj tento adresář:

```bash
git init
git add .
git commit -m "Základ webu"
git branch -M main
git remote add origin https://github.com/UZIVATEL/buliban.git
git push -u origin main
```

> Na bezplatném GitHub plánu musí být repozitář **veřejný**, aby fungovaly Pages.

### 2. Zapnutí GitHub Pages

V repozitáři **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Tím se aktivuje workflow `.github/workflows/deploy.yml`. Průběh nasazení
uvidíte v záložce **Actions**. První běh trvá zhruba dvě minuty.

Ověřte, že web běží na `https://UZIVATEL.github.io/buliban/`.
(Než je nastavená vlastní doména, obrázky a odkazy v podadresáři nemusí sedět —
po nasazení domény bude web v kořeni a problém zmizí.)

### 3. DNS u CZECHIA.COM

V DNS manažeru u domény `buliban.cz` nastavte:

| Typ | Název | Hodnota |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `UZIVATEL.github.io.` |

Volitelně i AAAA záznamy pro IPv6:
`2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`

**Nameservery se nemění** — doména i pošta zůstávají tam, kde jsou.
Stávající MX záznamy nechte být.

### 4. Vlastní doména v GitHubu

**Settings → Pages → Custom domain** → `buliban.cz` → Save.
GitHub si ověří DNS (může trvat i pár hodin) a pak zpřístupní volbu
**Enforce HTTPS** — tu zaškrtněte. Certifikát se vystaví automaticky.

Soubor `public/CNAME` už doménu obsahuje, takže se nastavení
nepřepíše při dalším nasazení.

### 5. Až potom vypnout starý web

Teprve když nová adresa funguje včetně HTTPS, zrušte u CZECHIA.COM
starou inPage prezentaci. Pozor na e-mailové schránky na doméně —
ty na webhostingu často visí taky.

---

## Případný přechod na Cloudflare Pages

Celý web je jen statická složka `dist/`, takže migrace znamená:
propojit stejný repozitář v Cloudflare Pages (build `npm run build`,
výstup `dist`), přidat doménu jako zónu do Cloudflare a přepnout
nameservery. Nic z kódu se nemění.
