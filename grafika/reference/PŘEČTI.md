# Referenční obrázky

Z těchhle souborů vyrobí `npm run styl` zamčený styl v Recraftu a jeho ID zapíše
do [styl.json](../styl.json). Od té chvíle jím projde **každý** generovaný
obrázek — takže co je tady, to bude na webu.

## Co tu leží

| Soubor | Co dodává |
|---|---|
| `vzor-modry-plamen.jpg` | Ruka drží malou skleněnou lahvičku, z hrdla šlehá čistě modrý plamen, pozadí černé. **Ikona celé značky.** |
| `vzor-parta.jpg` | Teplé zlaté světlo lucerny, muž na stoličce s láhví mezi koleny, kolem něj smějící se parta. Odsud se styl učí, jak mají vypadat **nasvícené tváře**. |
| `vzor-lahev-u-ohne.jpg` | Láhev rumu na kovové mřížce nad ohněm, cihly. Teplé řemeslné zátiší. |

Všechny tři jsou ze starého webu buliban.cz, kde vizuální jazyk seděl. Drží
pohromadě: tmavé, jeden zdroj světla, ve všech je láhev.

## Proč zrovna tyhle

Předchozí sada byla `vzor-kovadlina.webp` a `vzor-vyhen.webp`. Z nich se styl
naučil kovárnu a vracel výheň, řetězy a kleště — s Bulibanem nemají nic
společného. Nebyla to chyba modelu, ale zadání: styl se učí z referencí, dostal
kovárnu, vracel kovárnu.

Proto je `vzor-lahev-u-ohne.jpg` oproti originálu **oříznutý zleva**. V rohu
původního snímku ležely kovářské kleště a cihlové ohniště vypadalo jako výheň.
Jedna taková věc v referenci stačí, aby se přes ni model svezl zpátky.

## Když se sada mění

1. Vyměnit soubory tady (1–5 kusů, PNG/JPG/WEBP, celkem do 5 MB).
2. `npm run styl` — přepíše `styleId` v [styl.json](../styl.json).
3. Staré ID si předtím odložit. Přegenerování stylu stojí $0,04, ale ztracené ID
   se nedá vrátit.
4. `npm run obrazky -- --znovu` — jinak se hotové soubory přeskočí a na webu
   zůstane míchanice dvou stylů.

Když není z čeho vyjít, `npm run vzory` nechá kandidáty vygenerovat Recraftem do
podsložky `kandidati/` (ta je v `.gitignore`). Vybrané se přesunou sem.

**Kontrolní otázka u každé reference:** je na ní láhev, nebo člověk? Když ani
jedno, nepatří sem.
