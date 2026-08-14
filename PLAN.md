# Buliban.cz — plán přechodu na vlastní web

_Zpracováno 14. 8. 2026. Doména `buliban.cz` je vedená na účtu u CZECHIA.COM, web dnes běží na šabloně inPage (téma AURORA)._

---

## 1. Shrnutí doporučení (TL;DR)

| Vrstva | Doporučení | Cena |
|---|---|---|
| Registrátor domény | zůstat u CZECHIA.COM | stávající poplatek za doménu |
| DNS | převést nameservery na Cloudflare | 0 Kč |
| Hosting | **Cloudflare Pages** (napojený na GitHub) | 0 Kč |
| Generátor webu | **Astro** + Tailwind CSS | 0 Kč |
| Deploy | `git push` → automatický build a nasazení | 0 Kč |
| Formulář | Cloudflare Pages Function nebo Web3Forms / Formspree | 0 Kč (do limitu) |
| Analytika | Cloudflare Web Analytics (bez cookies) | 0 Kč |

**Celkové měsíční náklady na hosting: 0 Kč.** Platíte jen doménu. Webhosting u CZECHIA.COM (inPage) můžete po přesměrování zrušit — ale nejdřív viz kapitolu o e-mailu.

---

## 2. Kde web hostovat — možnosti

### A) Cloudflare Pages — ⭐ doporučeno

- **Cena:** free plán trvale zdarma
- **Přenos dat:** neomezený (Cloudflare pro Pages neuvádí limit bandwidthu) — u konkurence je to obvykle 100 GB/měsíc
- **Limity free plánu:** 500 buildů měsíčně, 1 build najednou, max. 20 000 souborů na web, max. 25 MiB na soubor, až 100 custom domén na projekt
- **Deploy:** propojíte GitHub repo, každý `push` do `main` spustí build a nasazení; každý PR dostane preview URL
- **HTTPS:** certifikát automaticky a zdarma
- **CDN:** globální, web je rychlý i mimo ČR
- **Háček:** pro **apex doménu** (`buliban.cz` bez `www`) je nutné přidat doménu jako zónu do Cloudflare a **změnit nameservery**. Pro pouhou subdoménu (`www.buliban.cz`) by stačil CNAME u stávajícího DNS. → Doporučuji NS převést; Cloudflare DNS je zdarma, rychlejší a dá vám navíc redirecty, cache a analytiku.

### B) GitHub Pages — nejjednodušší, když nechcete sahat na DNS

- **Cena:** zdarma
- **Limity:** web max. 1 GB, měkký limit 100 GB přenosu/měsíc, měkký limit 10 buildů/hodinu (neplatí při vlastním GitHub Actions workflow)
- **Háček:** na free plánu musí být repozitář **veřejný**. Apex doména se řeší A záznamy, takže **nameservery měnit nemusíte** — stačí přepsat A záznamy v DNS manažeru u CZECHIA.COM.
- Vhodné, pokud chcete mít DNS i doménu na jednom místě a nevadí vám veřejný repozitář.

### C) Netlify

- Zdarma 100 GB přenosu a 300 build minut měsíčně. Silná stránka: **vestavěné formuláře** bez vlastního backendu (free tier je omezený počtem odeslání/měsíc). Deploy z Gitu stejně pohodlný.
- Proti Cloudflare prohrává na bandwidth limitu; při překročení se řeší doplacením.

### D) Vercel

- Free „Hobby" plán, ale je určený pro **nekomerční** projekty a má limity na přenos. Pro Astro/statický web je to overkill — Vercel má smysl hlavně u Next.js.

### E) Český webhosting (WEDOS, Forpsi, Endora, Český hosting…)

- Řádově desítky až nízké stovky Kč měsíčně. Dostanete PHP + MySQL + e-mailové schránky.
- **Kdy dává smysl:** chcete-li v jednom balíku i poštu na doméně a serverový kód (PHP), nebo trváte na provozu v ČR.
- **Kdy ne:** deploy přes FTP je krok zpět oproti `git push`, a pro statický web platíte za výkon, který nevyužijete.

### F) VPS (vlastní server)

- Maximální kontrola, ale musíte řešit aktualizace, zálohy, certifikáty a bezpečnost. Pro prezentační web zbytečná zátěž. **Nedoporučuji.**

---

## 3. Čím web postavit

Zadání „moderní scrollovací web" = one-page (nebo pár stránek) s výraznými sekcemi, plynulými přechody a animacemi při scrollování.

**Doporučený stack:**

- **Astro** — statický generátor. Generuje čisté HTML bez zbytečného JavaScriptu (skvělá rychlost a SEO), obsah lze psát v Markdownu/MDX, komponenty pro sekce, automatická optimalizace obrázků (WebP/AVIF, lazy loading).
- **Tailwind CSS** — rychlé stylování bez boje s CSS soubory. Alternativa: čisté CSS, pokud vám Tailwind nesedí.
- **Animace při scrollu** — nativní CSS scroll-driven animations (dnes už podporované napříč prohlížeči) + `IntersectionObserver` pro reveal efekty. Pokud budete chtít složitější choreografii, doplnit **GSAP ScrollTrigger** nebo **Motion One**.
- **Obsah** — jednotlivé sekce jako Markdown soubory, aby se dal text upravovat bez zásahu do kódu.

**Alternativy:**

- **Čisté HTML/CSS/JS** — u jedné stránky legitimní a nejrychlejší start; horší, jakmile se web rozroste.
- **Hugo / Eleventy** — také výborné statické generátory; Astro volím pro nejpříjemnější komponentový model a práci s obrázky.
- **Headless CMS** (Decap/Sveltia CMS nad tím samým repozitářem) — dá se dodělat kdykoli později, když budete chtít editovat obsah z webového rozhraní.

---

## 4. Co vytěžit ze stávajícího webu

Současná struktura má 9 položek menu. Návrh, jak je přemapovat do scrollovací jednostránky:

| Stávající stránka | Nová sekce |
|---|---|
| Úvodní stránka | Hero — slogan „Zkroť svůj plamen – objev buliban v sobě!", výrazné vizuální pozadí |
| Co je to Buliban? | Sekce „Nauka" — definice rituálu |
| Historie Bulibanu | Časová osa („mlžná údolí dávných hor" → dnešek) |
| Způsoby zahřívání | Karty / galerie technik |
| Vertikální versus horizontální | Srovnávací sekce (dva sloupce, přepínač) |
| Jak vypustit Bulibana? | Návod krok za krokem |
| Opakované zapálení | Pokračování návodu / FAQ |
| Buliban dnes | Komunita, výzva ke sdílení |
| Kontaktní formulář | Patička s formulářem |

**Prakticky:** stáhnout texty i obrázky ze stávajícího webu (`wget --mirror` nebo ručně), texty přepsat do Markdownu, obrázky přegenerovat/optimalizovat. Fotky jsou dnes z Pixlru — počítejte s tím, že část budete chtít nahradit kvalitnějšími.

**Bonus:** stávající web má cookie lištu kvůli trackovacím cookies. Nový web s Cloudflare Web Analytics (nepoužívá cookies) **žádnou cookie lištu potřebovat nebude.**

---

## 5. Postup realizace — krok za krokem

### Fáze 1 — příprava (1 večer)

1. Založit prázdný repozitář `buliban` na GitHubu (klidně privátní — Cloudflare Pages privátní repa umí i na free plánu).
2. Stáhnout zálohu stávajícího webu (texty + obrázky) do složky `_old/` pro referenci.
3. `npm create astro@latest` v `C:\dev\buliban`, přidat Tailwind, první commit.

### Fáze 2 — stavba webu (hlavní práce)

4. Postavit layout, typografii, barevnou paletu a vizuální styl kultu.
5. Naskládat sekce podle tabulky výše, obsah jako Markdown.
6. Doplnit scroll animace, responzivitu, `prefers-reduced-motion`.
7. SEO základ: `<title>`, meta description, Open Graph obrázek, `sitemap.xml`, `robots.txt`, favicon.

### Fáze 3 — nasazení na testovací adresu (30 minut)

8. V Cloudflare dashboardu: **Workers & Pages → Create → Pages → Connect to Git**, vybrat repozitář, framework preset „Astro", build command `npm run build`, output `dist`.
9. Ověřit, že web běží na `buliban.pages.dev`. **V tuhle chvíli se ostrého webu nic netýká** — stará prezentace stále běží.

### Fáze 4 — přepnutí domény (pozor, tady se to může rozbít)

10. **Nejprve si vyexportovat/opsat všechny stávající DNS záznamy** v DNS manažeru u CZECHIA.COM — zejména **MX záznamy (pošta)**, SPF/DKIM TXT záznamy a případné subdomény.
11. Přidat `buliban.cz` jako zónu do Cloudflare (free plán). Cloudflare většinu záznamů naimportuje sám — **zkontrolovat řádek po řádku**, hlavně MX.
12. V administraci CZECHIA.COM změnit nameservery domény na ty od Cloudflare. U `.cz` domény jde změna přes zákaznický portál; u gTLD (com/net/org) přes autorizovaný požadavek na podporu, max. 3 nameservery. Propagace obvykle do několika hodin.
13. V projektu na Cloudflare Pages přidat **Custom domain** `buliban.cz` i `www.buliban.cz`, nechat jednu variantu přesměrovat na druhou (doporučuji apex jako hlavní, `www` → redirect).
14. Ověřit HTTPS (certifikát se vystaví automaticky), otestovat na mobilu i desktopu.

### Fáze 5 — úklid a doplňky

15. Teprve po ověření, že web i pošta fungují, zrušit webhosting/inPage u CZECHIA.COM.
16. Zprovoznit kontaktní formulář (viz níže).
17. Zapnout Cloudflare Web Analytics.
18. Nastavit 301 přesměrování ze starých URL (`/co-je-to-buliban` apod.) na kotvy nové jednostránky — přes soubor `public/_redirects`.

---

## 6. Dvě věci, na které se zapomíná

### E-mail na doméně

Pokud dnes máte schránku typu `info@buliban.cz` u CZECHIA.COM, **zrušením webhostingu o ni přijdete**. Možnosti:

- ponechat u CZECHIA.COM jen mailovou službu a v Cloudflare DNS nastavit jejich MX záznamy,
- použít **Cloudflare Email Routing** (zdarma) — přeposílá poštu z `cokoli@buliban.cz` na váš existující e-mail; odesílat z té adresy ale přímo neumí,
- externí schránka (Zoho Mail, Fastmail, Google Workspace) podle toho, jestli potřebujete i odesílat.

### Kontaktní formulář na statickém webu

Statický hosting nemá backend, formulář potřebuje pomoc:

- **Cloudflare Pages Function** (serverless funkce v repozitáři) + odeslání přes API poskytovatele pošty, např. Resend (free tier). Nejvíc pod kontrolou.
- **Web3Forms / Formspree** — vložíte `action` URL do HTML, hotovo za 5 minut, free tier stačí.
- **Netlify Forms** — pouze pokud byste zvolil Netlify.
- Nezapomenout na ochranu proti spamu (Cloudflare Turnstile je zdarma).

---

## 7. Rizika a jak je ošetřit

| Riziko | Ošetření |
|---|---|
| Při změně NS přestane chodit pošta | Před změnou opsat MX/SPF/DKIM a ověřit je v Cloudflare zóně |
| Výpadek webu během přepnutí | Nový web nasadit a otestovat na `pages.dev` ještě před sáhnutím na DNS |
| Ztráta obsahu starého webu | Před vypnutím inPage stáhnout kompletní zálohu |
| Ztráta pozic ve vyhledávačích | 301 redirecty ze starých URL, zachovat texty a nadpisy |
| Závislost na jednom providerovi | Celý web je v Gitu jako statické soubory — přenesení na jiný hosting je otázka minut |

---

## 8. Rozhodnutí, která potřebuji od vás

1. **Hosting:** Cloudflare Pages (doporučeno) × GitHub Pages (bez zásahu do NS, ale veřejné repo) × něco jiného?
2. **Generátor:** Astro × čisté HTML/CSS × jiný?
3. **Repozitář:** veřejný, nebo privátní?
4. **E-mail:** máte dnes na doméně funkční schránku, kterou je nutné zachovat?
5. **Vizuální směr:** jak vážně/nevážně má web působit — pseudo-sakrální a majestátní, retro-ezoterický, nebo současný minimalismus s vtipem v detailech?
