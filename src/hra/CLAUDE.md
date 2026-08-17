# Minihra „Vypusť Bulibana!"

Kotva pro práci na hře. Konvence webu (Astro stránky, obsah, generovaná
grafika) sem nepatří a nejsou potřeba — hra je soběstačná složka.

## Kde co je

```
ladeni.ts            VŠECHNY ladicí konstanty (🔧 z designu). Nikde jinde číslo neměň.
levely.ts            tabulka osmi levelů jako data
texty.ts             všechny texty a výklad — jediné místo, kde se píše česky
hra.ts               smyčka, vstup, průchod třemi fázemi levelu
index.ts             mount pro stránku, čtení parametrů adresy
jadro/               bez DOM, bez canvasu — čistá matematika a čistý stav
  profil.ts          převod výška ↔ objem + hladina v NAKLONĚNÉ nádobě
  lahev.ts           tvary A–G, viditelnost hladiny, poloha hrdla
  panak.ts           tvary panáků, každý na 40 ml
  metody.ts          katalog metod zahřívání (fáze 3)
  nahoda.ts          seedovaný generátor
  pasmo.ts           kmitající ukazatel — sdílí ho korek i škrtnutí zápalkou
  prutok.ts          model průtoku
  otevirani.ts       stav fáze 1 (pečeť, korek) a `krokOtevirani()`
  rozlevani.ts       stav fáze 2 a `krok()`
  ritual.ts          stav fáze 3 (poloha, zahřátí, zážeh) a `krokRitualu()`
  skore.ts           odchylka od cíle, body, medaile + složení celého levelu
  prehravac.ts       přehrání všech tří fází ze scénáře + model hráče
  ukazka.ts          hra hrající sama sebe (level 1, všechny tři fáze)
harness.ts           headless CLI na ladění konstant
scena/               vykreslování; jen `rozvrh.ts` má vliv na hratelnost
  index.ts           dispečink podle režimu + nápovědy a komentáře
  rozvrh.ts          rám obrazovky + měřítko; jediný soubor scény s testy
  otevirani.ts       pečeť, korek, timing lišta
  ritual.ts          teploměr, dlaždice, plamen; ROZVRH DLAŽDIC je exportovaný,
                     protože jím `hra.ts` trefuje kliknutí
  pismo.ts           tři role písma, velikosti v návrhových px × `rozvrh.ui`
  prvky.ts           panel, linka, verzálkový štítek — sdílené pro všechny fáze
```

## Level = tři fáze

`otevření → rozlévání → rituál → výsledek`, a bez vypuštění Bulibana se dál
nepostupuje (kap. 5.3) — tři neúspěšné zážehy hru ukončí. Je to **jediný fail
state ve hře**; fáze 1 a 2 se prohrát nedají.

Level 1 má před **každou** fází ukázku, ve které hra hraje sama sebe; od
levelu 2 žádnou. Ukázky jsou v `jadro/ukazka.ts` a jedou přes tytéž `krok*()`
funkce jako hráč, takže se nemůžou rozejít s pravidly.

Vstup má tři kanály, protože fáze dělají s lahví tři různé věci: **držení**
(nalévání, zahřívání), **hrana stisku** (ťukání do pečeti, timing klik) a
**volba dlaždice** (poloha, metoda, čím zapálit). Hrana i volba se v `hra.ts`
frontují — přijdou asynchronně z prohlížeče, ale spotřebuje je právě jeden
krok simulace.

## Rám obrazovky

Scéna je **horní lišta / herní plocha / spodní pás**, spočítané v `rozvrh.ts`
(`hornilistaY`, `plochaY`, `plochaVyska`, `spodniListaY`, `sloupec`). Všechny
tři fáze kreslí do téhož rámu a liší se jen obsahem plochy — jsou to `rezim`y
v `scena/index.ts`, ne vlastní obrazovky vedle hry. Lišta i spodní pás proto
nezávisí na tom, co je zrovna v ploše: prostřední skupina lišty dostává
`StredListy` (panák k/N, otevírání, pokus k/3), nápověda dostává hotový text.

Velikosti písma a odsazení se zadávají v **návrhových pixelech** a násobí se
`rozvrh.ui` (0,85–1,3 podle plochy). Bez toho je text na telefonu naducaný
a na velkém monitoru drobný pod obří lahví.

## Tři pravidla, která drží náklady dole

1. **`jadro/` nesmí sáhnout na `document`, `window` ani `canvas`.** Kvůli tomu
   běží testy i harness pod holým Node bez prohlížeče. Kdyby se ta hranice
   protrhla, jediný způsob ověřování by zůstaly screenshoty.
2. **Nečti celý designový dokument.** `buliban-minihra-herni-design.md` má
   30 kB. Levelová tabulka je v `levely.ts`, konstanty v `ladeni.ts` — do
   dokumentu se chodí jen pro konkrétní kapitolu (fáze 2 = kap. 4, bodování
   = kap. 4.7, rituál = kap. 5).
3. **Soubor 150–400 řádků.** Čtyřtisícový soubor se musí načíst celý pokaždé,
   když se v něm mění jedno číslo.

## Dvě pasti, na které se šláplo

Obě vypadaly jako detail vykreslování a obě byly vidět na první pohled.

**Hladinu v nakloněné láhvi nejde odvodit z výšky ve svislé.** Rovina hladiny
protíná osu šikmo, řezy přestanou být celé kruhy a z přenesené výšky vyjde
jiný objem — hráč pak při naklápění vidí rum přibývat a mizet. Řeší to
`rovinaProObjem()` v `jadro/profil.ts`: sečte kruhové úseče a polohu roviny
dohledá půlením. Ověřeno nezávislým vzorkováním v `profil.test.ts`
(shoda do 1,2 % napříč všemi tvary a úhly), stojí 0,07 ms na snímek.

**Ústí láhve je vrchol profilu (`y = 1`), ne nejužší místo hrdla.** Hledat
výtok jako minimum poloměru vypadá chytře, ale u láhve s ramenem leží nejužší
místo 28 % výšky pod okrajem a proud pak vytéká zprostřed skla. Navíc rum
přepadá přes **spodní okraj** ústí, ne přes jeho střed — viz `ustiHrdla()`
v `scena/rozvrh.ts`. Láhev se přitom otáčí kolem **středu** ústí, protože
u svislé láhve žádný spodní okraj není a kotvit ho by znamenalo poskočení
při prvním stupni náklonu.

**Ústí musí při naklánění klesat k panáku** (`lahevSpust`). Ústí je vrchol
láhve, takže u stojící visí celou její délku nad stolem; když si tu výšku
drží i při nalévání, padá rum do panáku ze čtyř set pixelů. Druhý, méně
zřejmý důsledek: bez klesání potřebuje scéna nad lahví pruh prázdna vysoký
jako polovina jejího rozmachu, který je zbytek času k ničemu — panáky pak na
notebooku vyjdou o třetinu menší. Obojí hlídá test „ústí míří nad panák
a při naklánění k němu klesá".

## Ověření

```bash
npm test                                          # invarianty z kap. 15
npm run hra -- --level=3 --seed=1 --drzeni=1.8,1.7
npm run hra -- --level=7 --seed=42 --ideal        # jak vypadá dokonalá hra
npm run hra -- --hraci                            # medaile podle modelu hráče
npm run hra -- --prehled                          # dosažitelnost napříč levely
npm run hra -- --faze                             # otevření a rituál napříč levely
npm run check                                     # typy
```

**Scéna se testuje proti falešnému plátnu** (`scena/kresleni.test.ts`). Nepozná,
jestli to vypadá dobře — od toho je oko — ale chytí to, co typová kontrola
nechytí: že režim sáhl na stav fáze, který je zrovna `null`. Ta chyba spadne
až v prohlížeči uprostřed levelu a v terminálu po ní nezůstane nic.

**Ukázky mají vlastní test proti zaseknutí** (`jadro/ukazka.test.ts`). Ukázka
řídí vstup místo hráče, takže když se netrefí do lišty nebo zapomene na
dlaždici, fáze nikdy neskončí — a protože běží sama, nemá to kdo odklikat.

**Tolerance v `levely.ts` neměň bez `--hraci` před a po.** Ideální držení je
lepší než kdokoli živý, takže se podle něj obtížnost nastavit nedá. Cíl
z kap. 4.7: nováček ≤ 10 % zlatých, zkušený hráč 40–60 % napříč hrou.
Aktuální stav: nováček 9 %, pokročilý 21 %, zkušený 52 %.

Druhá věc, kterou `--hraci` neuvidí: **rozptyl podle vylosovaného cíle.**
Hlídá ho test „stejný hráč dopadne u malého i velkého cíle stejně"
v `skore.test.ts`. Když se sáhne na `TOLERANCE_ZAKLAD_ML`, model průtoku
nebo rozsah cíle, projet ho znovu.

## Kde se kód rozchází s dokumentem

Všechno je okomentované i na místě; tady jen ať se to nehledá.

- **Odchylka se měří od cíle, ne od průměru** (`jadro/skore.ts`). Dokud
  poslední panák dostával zbytek automaticky, hlídalo špatný odhad objemu
  zúčtování. Teď lije hráč i posledního, takže to musí hlídat vzorec —
  jinak by stačilo nalít do všech stejně málo a nechat si půl láhve.
- **Dokapání je deterministické**, ne losované z 1,5–3 ml
  (`jadro/rozlevani.ts`, `zahajDokap`). Náhodný los se nedá naučit
  předvídat, což je přesně to, co po něm dokument chce.
- **Medaile se měří na `E`, ne na bodech** (`ladeni.ts`, `MEDAILE_*`). Prahy
  90/75/55 % proti `base × E^1,5` by od L6 výš vyšly pod kvantováním kroku
  simulace, tedy nedosažitelně.
- **Osm levelů se stropem osm panáků**, dva úvodní po dvou panácích
  (`levely.ts`). Nekonečný režim odpadl.
- **Tolerance se přepočítává na vylosovaný cíl** (`skore.ts`, `tolerancePro`).
  Chyba hráče má poměrnou složku (odhad hladiny) i absolutní (nepřesné
  puštění při stále stejném průtoku). Čistě poměrná tolerance tu druhou
  ignoruje a u malého cíle z ní udělá obrovské procento — na L6 to dělalo
  16násobný rozdíl v šanci na zlato podle losu, který hráč nevidí.
- **Cíl je nejvýš 30 ml, ne 40** (`ladeni.ts`, `CIL_MAX_ML`). Dokument uvádí
  40 s odůvodněním „aby se vešel i s chybou", jenže 40 ml je celý panák po
  okraj a na chybu tam nezbývá nic.
- **Rozteč panáků je vlastnost řady, ne obrazovky** (`rozvrh.ts`, `ROZTEC`).
  Dřív se počítala jako „dostupná šířka děleno počtem", takže dva panáky
  stály na notebooku sedm set pixelů od sebe. Mezera má vypadat stejně u dvou
  i u osmi; obrazovka rozhoduje jen o velikosti skla. Řada se pak centruje.
- **Slepé finále má čiré hrdlo** (`lahev.ts`, `neprusvitneDo`). Dokument
  počítá jen se sluchovými vodítky; tohle je jejich vizuální obdoba. Nad
  hranicí neprůhlednosti jsou 4 % objemu láhve, zatímco na L8 je v ní
  16–64 % — hladina se tam tedy ve stojící láhvi nikdy nedostane a hrdlo
  prozradí jen to, že a jak silně teče.

### Fáze 1 (kap. 3)

- **Pečeť se ťuká, netrhá krouživým tahem** (`otevirani.ts`, `PECET_STISKU`).
  Dokument nabízí obojí; hra dělá jen ťukání, na všech platformách stejně.
  Kap. 4.3 staví na tom, že gesto je na mobilu i desktopu identické, a krouživý
  tah by přidal druhý vstupní kanál, který navíc nejde přehrát v headless testu.
- **Strop fáze 1 je ~220 bodů, ne 280.** Dokument počítá 3 × 60 + 100, ale dva
  perfektní zásahy korek vytáhnou dřív než tři zelené (0,5 + 0,5 = 1). Perfektní
  zásah se tedy vyplácí **časem**, ne body — rychlejší otevření = větší bonus.
- **Šířka perfektního jádra je 30 % zeleného pásma** (`PERFEKTNI_PODIL`).
  Dokument jádro zmiňuje, ale šířku neuvádí.

### Fáze 3 (kap. 5)

- **Střed pásma (72) a jeho základní šířka (24) jsou doplněk.** Dokument udává
  jen změnu podle polohy (±6 jednotek). Střed je schválně vysoko: kdyby ležel
  v polovině škály, „nad plamenem" by nebyla riskantní metoda, ale prostě rychlá.
- **Pásmo se zužuje s levelem** (`PASMO_UBYTEK_ZA_LEVEL`). Dokument dává fázi 3
  progresi jen přes odemykání metod, takže by rituál byl na L8 stejně těžký
  jako na L1 — což si odporuje s „složitost levelu se stále zvyšuje" z kap. 4.2.
- **Násobitel metody je vážený průměr podle dodaného tepla** (`nasobitelMetody`).
  Dokument vzorec s jednou „metodou" předpokládá, ale metody se mají kombinovat
  (kvůli stropu u oděvu). Poslední použitá metoda by šla zneužít: dohřát
  plamenem a ťuknout dlaněmi pro ×1,25.
- **Zapalovač hoří, dokud hráč chce.** Dokument mu dobu hoření nedává. Je to
  celý rozdíl proti zápalce: ta dává +15 %, ale hoří 4 s a může ji sfouknout
  průvan — zapalovač je klidný a bez bonusu.
- **Pouští se NAD pásmem, ne pod ním.** Setrvačnost teplotu po puštění zvedne,
  ale chladnutí během uzávěru, zápalky a čekání na zážeh je silnější — u dlaní
  o 3,3 jednotky, u plamene o 7,3. Kolik přesně, ukáže `npm run hra -- --faze`.
  Je to vlastnost metody, ne levelu, a hráč se to učí u každé zvlášť.
- **Bonusové kolo „opakované zapálení" chybí.** Je v diagramu kap. 2, ale
  nikde v textu se nepopisuje, takže by se muselo vymyslet. „Opakované
  zapálení" z webu pokrývá návrat na zahřívání po neúspěchu (kap. 5.3).
- **Medaile zůstává za rozlévání**, ne za celý level (`skore.ts`, `slozLevel`).
  Je to jádro hry a jediná fáze s tolerancí vyladěnou proti modelu hráče;
  kdyby ji ředil zážeh, přestala by měřit to, kvůli čemu existuje.

## Stav

Hotové: **všechny tři fáze** a jejich složení do levelu — otevírání (pečeť,
korek, timing lišta), rozlévání (tvary lahví i panáků, náklon a proud z hrdla,
přelití), rituál (poloha, sedm metod zahřívání s odemykáním, uzávěr, zápalka
i zapalovač, čekání na zážeh, prasklé sklo), bodování všech tří, medaile,
ukázky u všech tří fází na levelu 1, výsledek levelu a závěrečná obrazovka.

Chybí: věková brána 18+, ukládání postupu, zvuk, sdílecí karta, přístupnost
pro odečítače, angličtina.

**Neověřené okem.** Fáze 1 a 3 mají testy na logiku i na to, že vykreslení
nespadne, ale jak scéna doopravdy vypadá, nikdo neviděl — rozvržení teploměru,
dlaždic a plamene je první návrh. Sem míří první playtest.

## Otevřená otázka: za pomalé zahřívání se nikde neplatí

`npm run hra -- --faze` to ukáže na jednom řádku. Doba držení do pásma:

| Metoda | Násobitel | Držet |
| --- | --- | --- |
| Tření v dlaních | ×1,25 | 18,8 s |
| Teplý ručník | ×1,10 | 21,1 s |
| Fén | ×1,00 | 8,5 s |
| Nad plamenem | ×0,85 | 4,0 s |

Fáze 3 **nemá bonus za čas** (dokument jí ho nedává, na rozdíl od fáze 2).
Pomalá metoda tak nestojí nic než trpělivost, ale platí nejvíc — takže pro
klidného hráče jsou dlaně vždycky správná volba a zbytek katalogu je výzdoba.
Zároveň je devatenáct vteřin držení tlačítka na level rozpočtovaný na 30–60 s
(kap. 1) hodně.

Obojí plyne z čísel dokumentu (rychlosti 🔧 4–20 j/s) a z `PASMO_STRED`, což je
naopak konstanta bez opory v dokumentu. Tři cesty, kdyby se to mělo řešit:

1. **Bonus za čas i ve fázi 3**, stejný tvar jako `casovaRezervaS` u rozlévání.
   Nejmenší zásah, všechna čísla dokumentu zůstanou. Rychlé metody tím dostanou
   to, co jim dokument slibuje („riziko odměňuje rychlé"), ale nedává.
2. **Snížit `PASMO_STRED`** ze 72 níž. Zkrátí to všechna držení úměrně, ale
   současně odzbrojí plamen: prasknutí nad 95 přestane hrozit a nejrizikovější
   metoda se stane nejbezpečnější.
3. **Nechat být** a ověřit playtestem, jestli to vadí. Možná je „drž a počkej si"
   u rituálu záměrná změna tempa po hektickém rozlévání.

Rozhodnout se to má **playtestem, ne od stolu** — proto to tu leží jako otázka.
