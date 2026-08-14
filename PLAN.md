# Buliban.cz — plán přechodu na vlastní web

_Zpracováno 14. 8. 2026. Doména `buliban.cz` je vedená na účtu u CZECHIA.COM, starý web běží na šabloně inPage (téma AURORA). Rozhodnutí o stacku už padla — viz kapitolu 8._

---

## 1. Shrnutí (TL;DR)

| Vrstva | Řešení | Cena |
|---|---|---|
| Registrátor domény | zůstat u CZECHIA.COM | stávající poplatek za doménu |
| DNS | **zůstat u CZECHIA.COM** — mění se jen A záznamy, nameservery ne | 0 Kč |
| Hosting | **GitHub Pages** | 0 Kč |
| Generátor webu | **Astro** + Tailwind CSS | 0 Kč |
| Deploy | `git push` → GitHub Actions → publikace | 0 Kč |
| Formulář | **Web3Forms** + Cloudflare Turnstile | 0 Kč (250 zpráv/měsíc) |
| Analytika | **Cloudflare Web Analytics** (bez cookies) | 0 Kč |

**Měsíční náklady na provoz webu: 0 Kč.** Platí se jen doména.

Webhosting u CZECHIA.COM (inPage) půjde zrušit — ale až úplně na konci a až po ověření pošty (kapitola 6).

**Bonus:** nová analytika nepoužívá cookies, takže nový web **nepotřebuje cookie lištu**, kterou má ten starý.

---

## 2. Proč GitHub Pages

Zdrojový kód je stejně na GitHubu, takže hosting přímo tam je nejkratší cesta: žádná další služba, žádný další účet, deploy je běžný `git push`.

**Co to umí:**

- provoz zdarma, HTTPS certifikát automaticky a zdarma
- vlastní doména přes obyčejné **A záznamy** → **nameservery se nemění**, doména i pošta zůstávají tam, kde jsou
- nasazení řídí soubor [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — každý push do `main` spustí build a publikaci

**Limity, se kterými je potřeba počítat:**

| Limit | Hodnota | Vadí nám? |
|---|---|---|
| Repozitář musí být **veřejný** (na free plánu) | — | Ne — recesistická prezentace, veřejný zdroják je v pohodě |
| Velikost webu | max. 1 GB | Ne — jednostránka s optimalizovanými obrázky má jednotky MB |
| Přenos dat | měkký limit ~100 GB/měsíc | Ne |
| **Žádný serverový kód** | — | Ano → formulář řeší externí služba (kapitola 6) |
| **Žádné vlastní HTTP hlavičky ani skutečná 301** | — | Ano → přesměrování starých URL se řeší v Astru (fáze 3, krok 9) |

**Kdyby to jednou přestalo stačit:** celý web je jen statická složka `dist/`. Přesun na Cloudflare Pages znamená propojit tentýž repozitář (build `npm run build`, výstup `dist`), přidat doménu jako zónu do Cloudflare a přepnout nameservery. **V kódu se nemění nic.**

---

## 3. Čím je web postavený

Zadání „moderní scrollovací web" = jednostránka s výraznými sekcemi a animacemi při scrollování. Základ už stojí:

- **Astro 7** — statický generátor. Generuje čisté HTML bez zbytečného JavaScriptu (rychlost a SEO), komponenty pro sekce, automatická optimalizace obrázků (WebP/AVIF, lazy loading).
- **Tailwind CSS 4** přes `@tailwindcss/vite` — stylování bez boje s CSS soubory.
- **`@astrojs/sitemap`** — `sitemap-index.xml` se generuje sám, [`public/robots.txt`](public/robots.txt) na něj už odkazuje.
- **Fonty Cinzel + Inter** — Astro si je stáhne **při buildu** a servíruje z vlastní domény. Prohlížeč návštěvníka nevolá na Google → žádné cookies, žádné starosti s GDPR.
- **Designový systém** — barvy a písma na jednom místě, v bloku `@theme` v [`src/styles/global.css`](src/styles/global.css). Tmavá základna (noc v mlžném údolí) + akcenty plamen / jiskra / kouř.
- **Animace při scrollu** — `IntersectionObserver` (třída `.reveal`) s plným respektem k `prefers-reduced-motion`. Kdo má vypnuté animace, uvidí obsah rovnou.

Kdyby později přišla chuť na složitější choreografii, dá se doplnit GSAP ScrollTrigger nebo Motion One. Kdyby přišla chuť editovat texty z webového rozhraní, dá se nad tentýž repozitář nasadit Decap/Sveltia CMS.

---

## 4. Mapa obsahu — ze starých stránek do nových sekcí

Starý web má 9 položek menu. Z téhle tabulky vychází jednak stavba stránky, jednak konfigurace přesměrování (fáze 3, krok 9) — kotvy proto musí sedět přesně.

| Stará URL | Nová sekce | Kotva |
|---|---|---|
| `/` | Hero — „Zkroť svůj plamen" | — |
| `/inpage/co-je-to-buliban/` | Nauka — definice rituálu | `#nauka` |
| `/inpage/historie-bulibana/` | Časová osa („mlžná údolí dávných hor" → dnešek) | `#historie` |
| `/inpage/zpusoby-zahrivani/` | Karty / galerie technik | `#zahrivani` |
| `/inpage/vertikalni-versus-horizontalni/` | Srovnávací sekce (dva sloupce) | `#vertikalni-horizontalni` |
| `/inpage/jak-vypustit-bulibana/` | Návod krok za krokem | `#jak-vypustit` |
| `/inpage/opakovane-zapaleni/` | Pokračování návodu / FAQ | `#opakovane-zapaleni` |
| `/inpage/buliban-dnes/` | Komunita, výzva ke sdílení | `#dnes` |
| `/inpage/kontaktni-formular/` | Formulář v patičce | `#kontakt` |

**Podklady:** kompletní extrakt starého webu je ve složce [`obsah/`](obsah/) — jeden soubor na sekci, v každém hlavní myšlenky, návrh zkráceného textu a zadání obrázku. Rozcestník a tón webu v [`obsah/README.md`](obsah/README.md).

**Texty:** psát nově — staré slouží jen jako inspirace a jako zdroj klíčových slov. Aby se tím neshodily pozice ve vyhledávačích, drží se dvě pojistky: přesměrování všech starých URL a zachování stejných témat i názvosloví v nadpisech.

**Obrázky:** stáhnout ze starého webu jako zálohu, ale nová grafika se generuje (viz kapitolu 5a). Ty stávající jsou z Pixlru.

### Samostatné stránky mimo jednostránku

| Stránka | URL | Stav |
|---|---|---|
| Výstřely — kronika jednotlivých výstřelů | `/vystrely/` | hotová kostra, plní se z Markdownu |
| Minihra | `/minihra/` | zástupná stránka, obsah vymyslíme později |

**Výstřely** jsou Astro content collection: jeden výstřel = jeden soubor v `src/content/vystrely/`. Přidat záznam znamená přidat soubor, nic jiného se nemění. Schéma je v [`src/content.config.ts`](src/content.config.ts) — název, datum, popis, nepovinný obrázek a nepovinná videosmyčka.

---

## 5. Postup realizace — krok za krokem

Pořadí je záměrné: **na ostrou doménu se sahá až v předposlední fázi**, kdy je nový web hotový a otestovaný. Do té doby starý web běží nedotčený a nehrozí, že bude buliban.cz chvíli nedostupný.

### Fáze 0 — hotovo ✅

Výchozí stav, ne úkol:

- [x] repozitář `MirekPlachy/buliban` na GitHubu
- [x] Astro 7 + Tailwind 4, sitemap, robots.txt, favicon
- [x] workflow [`deploy.yml`](.github/workflows/deploy.yml) pro GitHub Pages
- [x] designové tokeny v [`global.css`](src/styles/global.css), layout [`Base.astro`](src/layouts/Base.astro)
- [x] kostra jednostránky v [`index.astro`](src/pages/index.astro) se zástupným textem

### Fáze 1 — rozchodit nasazení naprázdno (~20 minut)

Cílem je ověřit potrubí dřív, než se do něj nalije obsah.

- [x] **Repozitář je veřejný** — podmínka Pages na bezplatném plánu, ověřeno.
- [x] **Odstraněn [`public/CNAME`](public/CNAME).** Když je tenhle soubor v nasazeném výstupu, GitHub si podle něj nastaví vlastní doménu — jenže `buliban.cz` zatím na GitHub nemíří a odpovídá na ní starý web. Soubor se vrátí ve fázi 4.
- [x] **Zaveden náhledový režim.** Náhled běží v podadresáři `/buliban/`, kdežto ostrý web v kořeni domény. Bez ošetření by odkazy na CSS a fonty mířily do kořene `mirekplachy.github.io` a stránka by se načetla **úplně bez stylů**. Řeší to proměnná `NAHLED` v [`astro.config.mjs`](astro.config.mjs), kterou nastavuje [`deploy.yml`](.github/workflows/deploy.yml); přepíná `base` i `site` naráz. Náhled navíc dostane `noindex`, aby se ve vyhledávačích nepral se starým webem.

**Zbývá jediný ruční krok — udělat ho musí majitel repozitáře:**

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**

   Dokud tohle není zapnuté, workflow doběhne do půlky: krok `build` projde, `deploy` spadne. (Tak dopadly oba dosavadní běhy.)

2. Pak **Actions →** spustit workflow znovu a ověřit zelený běh — trvá zhruba dvě minuty.
3. Web musí naběhnout na **`https://mirekplachy.github.io/buliban/`** — se styly, fonty i favicon.

### Fáze 2 — obsah a design (hlavní práce)

Kostra stojí: navigace, patička, stránka Výstřely, zástupná Minihra, komponenty `Video` a `Plamen`. Zbývá naplnit obsahem.


5. Naskládat sekce podle tabulky v kapitole 4. **Každá sekce dostane `id` přesně podle sloupce „Kotva"** — na tom pak stojí přesměrování.
6. Napsat texty, doplnit obrázky přes `astro:assets` (Astro je sám převede do WebP/AVIF).
7. Sticky hlavička s odkazy na kotvy, responzivita, kontrast, viditelný focus stav pro klávesnici.
8. Průběžná kontrola: `npm run dev` lokálně, po každém pushi náhled na github.io adrese.

### Fáze 2a — grafika a video

Podrobný postup je v kapitole 5a. Ve zkratce: reference → styl → obrázky → smyčky.

### Fáze 3 — doplňky, které musí být hotové před přepnutím (~1 večer)

9. **Kontaktní formulář — Web3Forms.** `<form action="https://api.web3forms.com/submit" method="POST">` + skryté pole `access_key`, honeypot proti botům, widget Cloudflare Turnstile a stránka `/odeslano/` jako potvrzení. Přístupový klíč je veřejný identifikátor, ne tajemství — může být klidně v repozitáři.
10. **Přesměrování starých URL** — klíčem `redirects` v [`astro.config.mjs`](astro.config.mjs), osm položek podle tabulky v kapitole 4. Astro ve statickém buildu vygeneruje pro každou starou cestu HTML stránku s `meta refresh` a `<link rel="canonical">`.
    > Není to plnohodnotné HTTP 301 — to GitHub Pages neumí. Vyhledávače ale meta refresh na kanonickou adresu jako přesměrování berou.
11. **Stránka 404** — `src/pages/404.astro`. GitHub Pages ji servíruje automaticky.
12. **SEO a sdílení** — doplnit `og:image` (1200 × 630 px) do [`Base.astro`](src/layouts/Base.astro), kde zatím chybí; projít `title` a `description`.
13. **Analytika** — v Cloudflare dashboardu přidat web do Web Analytics (jde to i pro web mimo Cloudflare) a vložit beacon skript do `Base.astro`.

### Fáze 4 — přepnutí domény (jediný riskantní krok)

14. **V DNS manažeru u CZECHIA.COM** přidat pro `buliban.cz`:

    | Typ | Název | Hodnota |
    |---|---|---|
    | A | `@` | `185.199.108.153` |
    | A | `@` | `185.199.109.153` |
    | A | `@` | `185.199.110.153` |
    | A | `@` | `185.199.111.153` |
    | CNAME | `www` | `mirekplachy.github.io.` |

    Volitelně i AAAA pro IPv6: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`

    **MX a TXT záznamy nechat být.** Nameservery se nemění, pošty se nedotýkáme.

15. **Vypnout náhledový režim a vrátit doménu:** smazat blok `env: NAHLED` z [`deploy.yml`](.github/workflows/deploy.yml) (tím se `base` vrátí na `/` a `site` na `https://buliban.cz`, což zároveň shodí `noindex`) a založit `public/CNAME` s jediným řádkem `buliban.cz`. Pushnout.
16. **Settings → Pages → Custom domain →** `buliban.cz` → Save. GitHub si ověří DNS; může to trvat i pár hodin.
17. Až kontrola projde, zaškrtnout **Enforce HTTPS**. Certifikát se vystaví sám.
18. **Otestovat:** apex i `www`, HTTPS, mobil i desktop, všech osm starých URL a odeslání formuláře.

### Fáze 5 — úklid

19. **Ověřit, že pošta na doméně chodí** — poslat si testovací zprávu. Teprve pak dál.
20. Zrušit starou inPage prezentaci u CZECHIA.COM. Pokud na stejném tarifu visí i schránka, nejdřív vyřešit její přesun (kapitola 6).
21. Google Search Console: ověřit doménu a odeslat `https://buliban.cz/sitemap-index.xml`.

---

## 5a. Grafika a video

Web má působit svižně a dynamicky. Většinu té dynamiky ale nedělá video — dělá ji kód, který nestojí ani bajt přenosu navíc: scroll efekty, animovaný SVG plamen ([`Plamen.astro`](src/components/Plamen.astro)), světelné mlhy v pozadí a mikroanimace při najetí. Video je koření, ne základ.

### Rozdělení rolí

| Nástroj | K čemu | Proč právě on |
|---|---|---|
| **Recraft V3** | statické obrázky | Umí z referencí vyrobit **vlastní styl** (`style_id`) a ten pak drží napříč vším. Konzistence není otázka toho, jak dobře je napsaný prompt. |
| **fal.ai** | rozpohybování obrázků na smyčky | Image-to-video: smyčka vzniká **z hotového obrázku**, ne z vlastního promptu. Nemůže tedy ujet jinam než zbytek webu. Platba za kus, bez předplatného. |

Klíče patří do `.env` (vzor v [`.env.example`](.env.example)), který je v `.gitignore`. Web ani jeho nasazení klíče nepotřebují — jsou jen pro skripty.

### Co u Recraftu koupit

**Neplatit měsíční předplatné.** Recraft má dva oddělené peněžní systémy a pro nás je správný ten druhý:

| | Kredity předplatného | **API jednotky** |
|---|---|---|
| K čemu | webová aplikace Recraftu | **naše skripty** |
| Platba | měsíčně (Basic $10, Advanced $27…) | dobití předem, 1 000 jednotek = $1 |
| Platnost | resetují se každý měsíc, nepřevádějí se | nevyprší |

Tlačítko na vygenerování API tokenu se v profilu objeví, **až když je zůstatek API jednotek nad nulou**. Předplatné ho neodemkne.

Ceník podstatných operací (V4.1):

| Operace | Jednotky | Cena |
|---|---|---|
| Založení vlastního stylu | 40 | $0,04 |
| Rastrový obrázek | 35 | $0,035 |
| Vektorový obrázek (SVG) | 80 | $0,08 |

Pět obrázků ze `zadani.json` stojí $0,18. I s bohatým experimentováním (~25 pokusů a pár variant stylu) se první verze webu vejde zhruba do **$1**. Dobití za $10 tedy vydrží dlouho — a protože jsou **API jednotky nevratné a nestornovatelné**, nemá cenu kupovat víc.

### Postup

1. Do `grafika/reference/` vložit 1–5 obrázků s náladou, jakou má web mít.
2. `npm run styl` — založí v Recraftu vlastní styl a jeho ID zapíše do `grafika/styl.json`.
3. `npm run obrazky` — vygeneruje vše z `grafika/zadani.json`. Hotové soubory přeskakuje, takže opakované spuštění nic nestojí.
4. `npm run video` — rozpohybuje vybrané obrázky podle `grafika/video.json`. Když je po ruce ffmpeg, dodělá rovnou WebM (AV1) a plakátový obrázek.

Přidat další obrázek znamená přidat položku do `grafika/zadani.json`. Prompty jsou tím pádem verzované v gitu — za rok bude jasné, jak která grafika vznikla, a dá se přegenerovat.

### Kolik videa web unese

GitHub Pages dává 1 GB na web a měkký limit ~100 GB přenosu měsíčně. Video je zdaleka největší soubor na stránce, takže:

- **hero smyčka do 4 MB**, klipy u sekcí do ~2 MB
- vždy dvojice `.webm` (AV1, dostane ji většina návštěvníků) + `.mp4` (záchranná síť pro starší Safari)
- [`Video.astro`](src/components/Video.astro) načítá až v dohledu (`preload="none"` + IntersectionObserver), takže klip na konci stránky nestáhne nikdo, kdo tam nedojede
- autoplay zapíná JavaScript, ne HTML — jinak by video jelo i lidem se zapnutým omezením pohybu
- **YouTube embed ne** — vrátil by cookies, a s nimi cookie lištu, kterou jsme si zrušili

**Pozor na video u každého výstřelu.** Při čtyřech záznamech je to v pohodě, při čtyřiceti ne. Až se kronika rozroste, přesunout klipy na externí úložiště (Cloudflare R2 má štědrý free tier) — pole `video` ve schématu bere i absolutní URL, takže to je změna v datech, ne v kódu.

---

## 6. Dvě věci, na které se zapomíná

### E-mail na doméně

Dobrá zpráva: protože **se nemění nameservery**, zůstávají MX, SPF i DKIM záznamy netknuté a pošta při přepnutí webu nijak netrpí.

Zbývá jediné skutečné riziko, a přijde až ve fázi 5: schránka typu `info@buliban.cz` bývá u CZECHIA.COM navázaná na **tentýž tarif jako webhosting**. Jeho zrušením o ni lze přijít. Možnosti:

- ponechat u CZECHIA.COM jen mailovou službu (nejjednodušší, pokud to jde objednat samostatně),
- **Cloudflare Email Routing** (zdarma) — přeposílá poštu z `cokoli@buliban.cz` na existující e-mail; odesílat z té adresy ale neumí,
- externí schránka (Zoho Mail, Fastmail, Google Workspace) podle toho, jestli je potřeba i odesílat.

Ať tak či tak: **krok 19 před krokem 20.**

### Kontaktní formulář na statickém webu

GitHub Pages nemá backend — nic na něm nemůže zpracovat odeslaný formulář. Řeší to **Web3Forms**: formulář odešle data na jejich API a ta přijdou e-mailem.

- 250 zpráv měsíčně zdarma, **bez zakládání účtu** — přístupový klíč přijde na e-mail
- HTML zůstává vlastní, žádný cizí iframe
- proti spamu: **Cloudflare Turnstile** (zdarma) + honeypot pole

Alternativa, kdyby limit přestal stačit: Formspree. Netlify Forms ani Cloudflare Pages Functions nepřipadají v úvahu — patří k jinému hostingu.

---

## 7. Rizika a jak je ošetřit

| Riziko | Ošetření |
|---|---|
| Free plán vyžaduje veřejný repozitář | Ověřeno ve fázi 1, krok 2. Veřejný zdroják recesistické prezentace nevadí. |
| `public/CNAME` shodí náhled na github.io adrese | Odstraněn ve fázi 1, vrací se ve fázi 4 (krok 15) |
| Náhled v podadresáři by se načetl bez stylů | Proměnná `NAHLED` přepíná `base` i `site`; vypíná se ve fázi 4 (krok 15) |
| Náhled na github.io se dostane do vyhledávačů | `noindex` se přidá automaticky, dokud `site` neukazuje na `buliban.cz` |
| Výpadek webu při přepnutí DNS | Nový web je hotový a otestovaný na github.io ještě **před** krokem 14; propagace bývá do hodin |
| Ztráta e-mailu na doméně | Nameservery se nemění → MX nedotčené. Pozor jen na pořadí: krok 19 před krokem 20. |
| Ztráta pozic ve vyhledávačích | Přesměrování všech osmi starých URL (krok 10) + zachovaná témata a názvosloví v nadpisech |
| Meta refresh není plnohodnotné 301 | Doplněn `rel="canonical"`; sitemapa odeslaná do Search Console (krok 21) |
| Spam z formuláře | Turnstile + honeypot (krok 9) |
| Ztráta obsahu starého webu | Před vypnutím inPage stáhnout kompletní zálohu textů i obrázků |
| Závislost na GitHubu | Web je v Gitu jako statické soubory — přesun jinam je otázka minut (kapitola 2) |

---

## 8. Rozhodnutý stav

Log rozhodnutí, ať je za půl roku jasné proč:

| Otázka | Rozhodnutí | Proč |
|---|---|---|
| Hosting | **GitHub Pages** | Kód je stejně na GitHubu; vlastní doména bez zásahu do nameserverů |
| Repozitář | **veřejný** (`MirekPlachy/buliban`) | Podmínka Pages na free plánu; u téhle prezentace nevadí |
| Generátor | **Astro + Tailwind** | Čisté HTML bez zbytečného JS, komponenty, optimalizace obrázků |
| DNS | **zůstává u CZECHIA.COM** | Mění se jen A záznamy; pošta zůstává nedotčená |
| Formulář | **Web3Forms** + Turnstile | Zdarma, bez účtu, vlastní HTML; GH Pages nemá backend |
| Analytika | **Cloudflare Web Analytics** | Zdarma, bez cookies → není potřeba cookie lišta |
| Texty | **psát nově** | Staré jen jako inspirace; SEO jistí přesměrování a zachované nadpisy |

**Zbývá doladit při stavbě:** vizuální poloha webu — jak vážně má působit. Základ v `global.css` je zatím laděný pseudo-sakrálně a majestátně (tmavá noc + zlatý plamen), s prostorem pro vtip v detailech.
