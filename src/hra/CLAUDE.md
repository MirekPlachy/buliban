# Minihra „Vypusť Bulibana!"

Kotva pro práci na hře. Konvence webu (Astro stránky, obsah, generovaná
grafika) sem nepatří a nejsou potřeba — hra je soběstačná složka.

## Kde co je

```
ladeni.ts            VŠECHNY ladicí konstanty (🔧 z designu). Nikde jinde číslo neměň.
levely.ts            tabulka devíti levelů jako data
texty.ts             všechny texty a výklad — jediné místo, kde se píše česky
hra.ts               smyčka, vstup, průchod levely
index.ts             mount pro stránku, čtení parametrů adresy
jadro/               bez DOM, bez canvasu — čistá matematika a čistý stav
  profil.ts          převod výška ↔ objem + hladina v NAKLONĚNÉ nádobě
  lahev.ts           tvary A–G, viditelnost hladiny, poloha hrdla
  panak.ts           tvary panáků, každý na 40 ml
  nahoda.ts          seedovaný generátor
  prutok.ts          model průtoku
  rozlevani.ts       stav fáze 2 a `krok()`
  skore.ts           odchylka od cíle, body, medaile
  prehravac.ts       přehrání ze scénáře + model hráče pro kalibraci
  ukazka.ts          hra hrající sama sebe (level 1)
harness.ts           headless CLI na ladění konstant
scena/               vykreslování; jen `rozvrh.ts` má vliv na hratelnost
  rozvrh.ts          rám obrazovky + měřítko; jediný soubor scény s testy
  pismo.ts           tři role písma, velikosti v návrhových px × `rozvrh.ui`
  prvky.ts           panel, linka, verzálkový štítek — sdílené pro všechny fáze
```

## Rám obrazovky

Scéna je **horní lišta / herní plocha / spodní pás**, spočítané v `rozvrh.ts`
(`hornilistaY`, `plochaY`, `plochaVyska`, `spodniListaY`, `sloupec`). Fáze 1
a fáze 3 mají do téhož rámu kreslit taky — přibudou jako další `rezim`
v `scena/index.ts`, ne jako vlastní obrazovka vedle hry. Lišta i spodní pás
proto nezávisí na tom, co je zrovna v ploše.

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
npm run check                                     # typy
```

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

## Stav

Hotové: celá fáze 2 — rozlévání, tvary lahví i panáků, náklon láhve a proud
z hrdla, přelití, bodování, medaile, ukázka a výklad, závěrečná obrazovka.
Rám obrazovky a typografie jsou postavené tak, aby je fáze 1 a 3 převzaly
beze změny.

Chybí: fáze 1 (pečeť, korek), fáze 3 (zahřátí, zážeh), věková brána 18+,
ukládání postupu, zvuk, sdílecí karta, přístupnost pro odečítače, angličtina.
