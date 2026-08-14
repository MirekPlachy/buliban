# Obsah webu — podklady ze starých stránek

Extrakt ze všech devíti stránek starého webu `www.buliban.cz` (inPage, šablona AURORA), staženo 14. 8. 2026.

Každý soubor v této složce obsahuje tři věci:

1. **Hlavní myšlenky** — co ze staré stránky musí přežít. Odsud se čerpá, když se text píše znovu.
2. **Návrh nového textu** — zkrácená, čtivější verze připravená k vložení do sekce. Není to zákon, je to výchozí bod.
3. **Obrázek** — co má sekce ukazovat a proč.

Staré texty se nekopírují doslova. Zůstávají ale **stejná témata a stejné názvosloví v nadpisech** — na tom stojí SEO (viz [PLAN.md](../PLAN.md), kapitola 4).

---

## O čem Buliban je

Buliban je **recesistický rituál se skutečným fyzikálním základem.** V téměř prázdné láhvi od tvrdého alkoholu (typicky rumu) zbyde pár mililitrů. Láhev se zahřeje — nejčastěji třením mezi dlaněmi — v hrdle se nahromadí alkoholové páry a ty se zapálí. Vyšlehne krátký, většinou modrý plamen. Trvá zhruba vteřinu.

To je celé. A přesně v tom je ta věc: **kolem jednovteřinového plamínku je vystavěná celá mytologie.** Dávný horský kmen Bulibanů, vize v ohni, stařešina, šíření rituálu po námořních cestách, vědecká rozprava o tom, v čem to dělali, když sklo ještě neexistovalo. Web hraje tuhle hru s naprosto vážnou tváří — a právě proto je vtipný.

### Tři vrstvy, které musí být v každé sekci cítit

| Vrstva | Projev v textu |
|---|---|
| **Mýtus** | Vážný, obřadný tón. Duchové v láhvi, vize v plameni, odkaz předků, „staří Bulibanové". |
| **Fyzika** | Věcné informace, které fakt sedí. 40–50 °C, modrý plamen, málo alkoholu = bezpečno. |
| **Parta** | Rituál je společenská záležitost. Někdo drží, ostatní koukají, pak se to natočí na mobil. |

### Kde je vtip

Nikdy ne v nadsázce nadpisu — vždy až uvnitř, v jedné větě, řečené naprosto vážně. Staré stránky to umí a je to jejich největší přednost:

- tření láhve mezi koleny „vyvolává úsměvné situace, mnohdy vedoucí k (mylným) představám o intimním pokračování večera"
- fén sice funguje, ale „hluk kazí atmosféru a narušuje odkazy starých předků"
- ohřev nad plamenem: „neneseme žádnou odpovědnost za případné ztráty na prstech či životech"
- doplnit alkohol na další pokus jde, ale „tímto způsobem porušujete tradice původních vynálezců"
- efekt trvá asi 1 s — „jednu sekundu neboli jednu vteřinu, podle toho, v jaké době jste se narodili"

**Pravidlo pro psaní:** nikdy nemrkat na čtenáře. Nikde „samozřejmě je to nadsázka". Ve chvíli, kdy web přizná, že si dělá legraci, přestane být vtipný.

### Čemu se vyhnout

- **Nadužívání slova magický.** Na starém webu je skoro v každém odstavci. V novém stačí jednou za sekci.
- **Opakování téhož.** Stránky „Buliban dnes" a úvodní stránka říkají prakticky totéž. Na jednostránce to bude vedle sebe a bude to bít do očí.
- **Vata.** Věty typu „každý Buliban je jedinečný, záleží na náladě, společnosti, prostředí i fantazii" nic nesdělují. Škrtat.

---

## Vizuální směr

**Tohle je nejdůležitější poznámka celé složky.** Dosavadní generovaná grafika (kovárna, kovadlina, řetězy, svíčky) je mimo — nemá s Bulibanem nic společného. Příčina je dohledatelná: referenční obrázky v `grafika/reference/` jsou kovadlina a výheň, a `spolecnyPrompt` ve [styl.json](../grafika/styl.json) přímo žádá „weathered stone, old wood and hand-forged iron" a zakazuje lidi. Z takového zadání kovárna vyjít **musí**.

Starý web měl vizuální jazyk správně. Jeho obrázky (generované v ChatGPT / Pixlru) drží tři motivy:

| Motiv | Popis | Kde se používá |
|---|---|---|
| **Modrý plamen** | Ruka drží malou skleněnou lahvičku, z hrdla šlehá čistě modrý plamen, pozadí černé. **Tohle je ikona celé značky.** | Hero, „Co je to Buliban" |
| **Parta u ohně** | Teplé zlaté světlo, lucerny, plážový bar nebo chalupa, někdo drží láhev mezi koleny, ostatní se smějí. | Zahřívání, Buliban dnes |
| **Láhev jako hrdina** | Láhev rumu nasvícená ohněm, cihly, uhlíky, řemeslné zátiší. | Historie, mezisekce |

Nová grafika má být **lepší provedení téhož**, ne jiný svět. Konkrétně:

- **Modrá patří dovnitř plamene**, ne do pozadí. Pozadí je černá nebo hluboká noční modř, plamen je jediný zdroj světla.
- **Lidé na obrázcích být musí.** Rituál je společenský — bez rukou a bez tváří to vypadá jako oltář, ne jako večer s přáteli. Současný negativní prompt lidi výslovně zakazuje; to je potřeba zrušit.
- **Hrdinou obrazu je láhev.** Ne oheň obecně, ne kámen, ne nářadí. Láhev.
- **Teplé zlaté světlo** u společenských scén, **studená modrá** u samotného zážehu. Kontrast těch dvou je celý vizuální systém.
- Referenční obrázky vyměnit — kovadlina a výheň ven, místo nich záběr s modrým plamenem z hrdla láhve a záběr party u teplého světla.

---

## Mapa: stará stránka → nová sekce

| Soubor | Stará URL | Nová sekce | Kotva |
|---|---|---|---|
| [01-co-je-buliban.md](01-co-je-buliban.md) | `/inpage/co-je-to-buliban/` | Nauka | `#nauka` |
| [02-historie.md](02-historie.md) | `/inpage/historie-bulibana/` | Časová osa | `#historie` |
| [03-zpusoby-zahrivani.md](03-zpusoby-zahrivani.md) | `/inpage/zpusoby-zahrivani/` | Karty technik | `#zahrivani` |
| [04-vertikalni-horizontalni.md](04-vertikalni-horizontalni.md) | `/inpage/vertikalni-versus-horizontalni/` | Srovnání dvou sloupců | `#vertikalni-horizontalni` |
| [05-jak-vypustit.md](05-jak-vypustit.md) | `/inpage/jak-vypustit-bulibana/` | Návod krok za krokem | `#jak-vypustit` |
| [06-opakovane-zapaleni.md](06-opakovane-zapaleni.md) | `/inpage/opakovane-zapaleni/` | Pokračování návodu | `#opakovane-zapaleni` |
| [07-buliban-dnes.md](07-buliban-dnes.md) | `/inpage/buliban-dnes/` | Komunita a výzva | `#dnes` |
| [08-kontakt.md](08-kontakt.md) | `/inpage/kontaktni-formular/` | Formulář v patičce | `#kontakt` |
| [00-hero.md](00-hero.md) | `/` | Hero | — |

Ze starého webu **nepřebíráme:** cookie lištu (nová analytika ji nepotřebuje), vyhledávací pole v hlavičce, patičku „Běží na inPage s AI".
