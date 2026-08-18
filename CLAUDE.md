# buliban.cz

Astro jednostránka o rituálu Buliban + minihra „Vypusť Bulibana!".
Čeština všude — v kódu, komentářích i názvech souborů.

Tenhle soubor je **rozcestník**, ne popis kódu. Načítá se do každé session,
takže se v něm nepopisuje nic, co jde přečíst ze zdroje za pár vteřin.

## Kam jít podle úkolu

| Úkol | Čti | Nečti |
|---|---|---|
| Minihra (cokoli v `src/hra/`) | [src/hra/CLAUDE.md](src/hra/CLAUDE.md) a dost | zbytek téhle tabulky |
| Text webu | [obsah/](obsah/) = podklady, [src/pages/index.astro](src/pages/index.astro) = nasazený text | PLAN.md |
| Nadpis, kotva, navigace | [src/data/kapitoly.ts](src/data/kapitoly.ts) — jediný zdroj | index.astro celý |
| Barvy, písma, animace | `@theme` v [src/styles/global.css](src/styles/global.css) | |
| Generování obrázků | [grafika/zadani.json](grafika/zadani.json) + kap. „Grafika" v README | |
| Kronika zážehů | [src/content/zazehy/](src/content/zazehy/), schéma v [src/content.config.ts](src/content.config.ts) | |
| Nasazení, GitHub Pages | kap. „Nasazení" v [README.md](README.md) | PLAN.md |

## Tři soubory, které se nikdy nečtou celé

Dohromady 62 kB prózy. Přečíst je „pro kontext" spolyká třetinu rozpočtu
session a v drtivé většině úkolů z nich není potřeba ani odstavec.

- **[buliban-minihra-herni-design.md](buliban-minihra-herni-design.md)** (30 kB) —
  chodí se do něj **na konkrétní kapitolu**, s `offset`/`limit`:
  fáze 1 ř. 86, fáze 2 ř. 109, bodování ř. 241, fáze 3 ř. 275, vizuál ř. 346,
  přístupnost ř. 429, právní rámec ř. 440, testování ř. 492.
  Levelová tabulka a konstanty v dokumentu jsou **neaktuální** — platí
  `src/hra/levely.ts` a `src/hra/ladeni.ts`.
- **[PLAN.md](PLAN.md)** (20 kB) — plán přechodu ze starých stránek. Je
  hotový a **historický**. Otevřít jen kvůli mapě starých URL (kap. 4).
- **[README.md](README.md)** (12 kB) — pro člověka, ne pro agenta. Cílit
  na sekci, ne číst od začátku.

## Co je zamčené

- **`id` v `kapitoly.ts`** jsou kotvy do URL. Míří na ně navigace i sdílené
  odkazy na jednotlivé sekce, takže přejmenování je rozbije.
- **Obrázky s `_zamceno` v `grafika/zadani.json`** jsou schválené zadavatelem.
  Hromadné `--znovu` je přeskočí; přepsat jde jen adresně
  (`npm run obrazky -- --jen=nauka --znovu`) a jen na výslovné přání.
- **Dvě železná pravidla grafiky** (`_pravidla` v `zadani.json`): na obrázku je
  láhev nebo člověk, a oheň hoří **uvnitř** prázdné láhve, ne nad hrdlem.
  Znění promptu je vyzkoušené — nepřepisovat od oka.
- **API klíče jen v `.env`.** Nikdy proměnná s prefixem `PUBLIC_` — to Astro
  pošle do prohlížeče. Klíče potřebují jen skripty v `scripts/`.

## Příkazy

```bash
npm run dev          # web
npm test             # testy minihry (bez prohlížeče)
npm run check        # typy (astro check)
npm run hra -- --prehled    # kalibrace obtížnosti, viz src/hra/CLAUDE.md
npm run obrazky      # generování grafiky, potřebuje .env
```

## Rozsah souborů

Cíl je 150–400 řádků. [src/pages/index.astro](src/pages/index.astro) má 1051 a
je jediné místo, kde se to poruší — kdo v něm mění jednu sekci, ať si najde
její kotvu přes Grep a čte jen ji.
