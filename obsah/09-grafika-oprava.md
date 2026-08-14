# Grafika — proč vyšla kovárna a jak to spravit

Dosavadní generované obrázky ([nauka.webp](../src/assets/generovane/nauka.webp), [historie.webp](../src/assets/generovane/historie.webp), [zahrivani.webp](../src/assets/generovane/zahrivani.webp)) ukazují kovárnu: výheň, řetězy, kladiva, sud. S Bulibanem nemají nic společného. Není to selhání modelu — je to přesně to, co bylo zadané.

---

## Kde se to zlomilo

**1. Referenční obrázky.** Ve složce `grafika/reference/` leží `vzor-kovadlina.webp` a `vzor-vyhen.webp`. Z nich `npm run styl` vyrobil zamčený styl `39de046c-…`, kterým od té chvíle prochází **každý** obrázek. Styl se učí z referencí — dostal kovárnu, vrací kovárnu.

**2. Společný prompt.** V [styl.json](../grafika/styl.json) stojí, že motivem má být „raw fire, glowing embers, drifting smoke, weathered stone, old wood and **hand-forged iron**". Kované železo je v zadání doslova. Slovo **láhev** v celém souboru není ani jednou.

**3. Negativní prompt zakazuje lidi.** `people, person, human figure, silhouette of a person` — jenže Buliban je společenská záležitost. Ze zadání, které zakazuje ruce i tváře, nemůže vyjít nic než prázdné obřadní zátiší.

**4. Nálada míří jinam než web.** „Solemn, quiet, ceremonial mood" popisuje sakrální ticho. Starý web měl teplé zlaté světlo, lucerny a smějící se lidi — a byl v tom vtip. Vážná tvář patří do **textu**, ne do obrázků. Když je obřadní obojí, zbyde jen obřad.

---

## Co má nová grafika ukazovat

Vizuální jazyk starého webu stál na třech motivech a všechny tři byly správně:

| Motiv | Popis | Použití |
|---|---|---|
| **Modrý plamen** | Ruka drží malou skleněnou lahvičku, z hrdla šlehá čistě modrý plamen. Pozadí černé, modrá záře se odráží na prstech. | Hero, Co je to Buliban, Vertikální/horizontální |
| **Parta u teplého světla** | Zlaté světlo lucerny, plážový bar nebo chalupa, někdo drží láhev mezi koleny, ostatní se smějí. | Zahřívání, Buliban dnes |
| **Láhev jako hrdina** | Láhev rumu nasvícená ohněm, cihly, uhlíky, řemeslné zátiší. | Historie, mezisekce |

Celý vizuální systém stojí na kontrastu dvou světel: **teplá zlatá** u lidí a **studená modrá** u zážehu. Nic víc není potřeba.

**Železné pravidlo: na obrázku musí být láhev, nebo člověk, ideálně obojí.** Kdyby na něm nebylo ani jedno, není to Buliban.

---

## Konkrétní zásah

### Krok 1 — vyměnit reference

Z `grafika/reference/` odstranit `vzor-kovadlina.webp` a `vzor-vyhen.webp`. Místo nich vložit dva až tři obrázky, které skutečně trefují web — nejrychlejší cesta je vzít je ze starého webu:

| Zdroj | Co dodá |
|---|---|
| `https://www.buliban.cz/obrazek/3/chatgpt-image-30-9-2025-22-34-30-png/` | modrý plamen z hrdla láhve na černém pozadí — ikona značky |
| `https://www.buliban.cz/obrazek/3/treni-png/` | parta v teplém světle, láhev mezi koleny |
| `https://www.buliban.cz/obrazek/3/ohniste-png/` | láhev rumu nasvícená ohněm |

Trojice drží pohromadě: všechny jsou tmavé, mají jeden zdroj světla a ve všech je láhev.

### Krok 2 — přepsat `spolecnyPrompt` ve [styl.json](../grafika/styl.json)

Stávající text vyměnit za popis, který sedí na Buliban:

> `Low-key photograph shot on 35mm film, deep darkness fills most of the frame. The subject is a glass liquor bottle and the hands holding it. A short blue alcohol flame from the bottle neck is the coldest and brightest thing in the frame; warm golden lantern light fills the rest. Human hands and out-of-focus faces belong in the scene. Fine film grain, muted colors outside the light source, large dark areas around the subject. Night, close friends, quiet anticipation.`

Podstatné změny oproti současnému stavu: **láhev je v zadání**, **lidé jsou povolení**, **modrá je uvnitř plamene** a nálada je „noční, mezi přáteli" místo „obřadná".

### Krok 3 — upravit `negativni`

- **vyhodit:** `people, person, human figure, silhouette of a person` — lidé na obrázky patří
- **vyhodit:** `indoor room` — bar a chalupa jsou vnitřní prostory
- **doplnit:** `anvil, blacksmith, forge, hammer, chains, tongs, workshop tools, barrel, church interior, altar, candelabra`
- **ponechat:** ochrany proti neonu, textu, dennímu světlu a dopravním kuželům. Ty fungují a poznámka `_spolecnyPrompt` v souboru dobře vysvětluje proč.

Pozor: `turquoise sky` a `aurora` v seznamu zůstat mají, ale **modrá u plamene ne**. Zákaz musí mířit na modrou oblohu, ne na modrý oheň.

### Krok 4 — přepsat prompty v [zadani.json](../grafika/zadani.json)

Všech pět položek popisuje scény bez láhve („mlžné údolí", „kamenné mohyly", „rituální předměty na stole"). Nové znění vychází z obrázkových zadání v jednotlivých souborech této složky:

| `id` | Nový prompt (česky, k přeložení do angličtiny) |
|---|---|
| `hero` | Ruka drží malou skleněnou láhev, z hrdla šlehá vysoký modrý plamen. Černé pozadí, kompozice mimo střed, vlevo volné tmavé místo na text. |
| `nauka` | Těsný detail hrdla láhve ve chvíli zážehu, modrý plamen vyrůstá přímo z hrdla, ve skle se zrcadlí modrá záře. |
| `historie` | Láhev rumu na kovové mřížce nad uhlíky, cihlová zeď, teplé oranžové světlo, kovářské kleště mimo záběr. |
| `zahrivani` | Muž sedící na stoličce si třením zahřívá láhev mezi koleny, kolem něj rozostření a smějící se přátelé, lucerny, teplé zlaté světlo. |
| `og` | Ruka s láhví a modrým plamenem uprostřed tmy, kompozice na střed, po stranách volné tmavé místo. |

### Krok 5 — přegenerovat

```
npm run styl      # nový styleId z nových referencí
npm run obrazky   # hotové soubory přeskakuje → staré nejdřív smazat
npm run video
```

**Než se sáhne na `npm run styl`:** starý `styleId` si někam odložit. Kdyby nová sada dopadla hůř, je návrat otázkou vrácení jednoho řádku — přegenerování stylu stojí 40 jednotek, tedy $0,04, ale ztracené ID se nedá vrátit. Celá nová sada pěti obrázků vyjde na $0,18 podle ceníku v [PLAN.md](../PLAN.md).

---

## Kontrolní otázka před nasazením

U každého vygenerovaného obrázku: **poznal by návštěvník, který o Bulibanu nikdy neslyšel, že jde o láhev a oheň?**

Kovárna touhle otázkou neprošla. Modrý plamen z hrdla láhve jí projde okamžitě — proto na něm starý web stál.
