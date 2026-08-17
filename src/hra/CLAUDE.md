# Minihra „Vypusť Bulibana!"

Kotva pro práci na hře. Konvence webu (Astro stránky, obsah, generovaná
grafika) sem nepatří a nejsou potřeba — hra je soběstačná složka.

## Kde co je

```
ladeni.ts            VŠECHNY ladicí konstanty (🔧 z designu). Nikde jinde číslo neměň.
levely.ts            tabulka osmi levelů jako data
texty.ts             všechny texty a výklad — jediné místo, kde se píše česky
hra.ts               smyčka, vstup, průchod oběma fázemi levelu
index.ts             mount pro stránku, čtení parametrů adresy
jadro/               bez DOM, bez canvasu — čistá matematika a čistý stav
  profil.ts          převod výška ↔ objem + hladina v NAKLONĚNÉ nádobě
  lahev.ts           tvary A–G, viditelnost hladiny, poloha hrdla
  panak.ts           tvary panáků, každý na 40 ml
  nahoda.ts          seedovaný generátor
  prutok.ts          model průtoku
  rozlevani.ts       stav rozlévání a `krok()`
  ritual.ts          stav rituálu (tření, zápalka, zážeh) a `krokRitualu()`
  skore.ts           odchylka od cíle, body, medaile + složení celého levelu
  prehravac.ts       přehrání obou fází ze scénáře + model hráče
  ukazka.ts          hra hrající sama sebe (level 1, obě fáze)
harness.ts           headless CLI na ladění konstant
scena/               vykreslování; jen `rozvrh.ts` má vliv na hratelnost
  index.ts           dispečink podle režimu + nápovědy a komentáře
  rozvrh.ts          rám obrazovky + měřítko; jediný soubor scény s testy
  ritual.ts          láhev, teploměr, zápalka, plamen; GEOMETRIE je exportovaná,
                     protože jí `hra.ts` trefuje prst (sklo, zápalka, hrdlo)
  pismo.ts           tři role písma, velikosti v návrhových px × `rozvrh.ui`
  prvky.ts           panel, linka, verzálkový štítek — sdílené pro obě fáze
```

## Level = dvě fáze

`rozlévání → rituál → výsledek`, a bez vypuštění Bulibana se dál nepostupuje
(kap. 5.3) — tři neúspěšné zážehy hru ukončí. Je to **jediný fail state ve
hře**; rozlévání se prohrát nedá.

Level 1 má před **oběma** fázemi ukázku, ve které hra hraje sama sebe; od
levelu 2 žádnou. Ukázky jsou v `jadro/ukazka.ts` a jedou přes tytéž `krok*()`
funkce jako hráč, takže se nemůžou rozejít s pravidly.

**Fáze „otevření láhve" (pečeť + korek) byla zrušena** — nudná a nefunkční.
S ní odpadl i sdílený kmitající ukazatel (`pasmo.ts`), protože zápalka se už
neškrtá timing klikem. Kapitola 3 designu tedy popisuje něco, co ve hře není.

### Vstup

Rozlévání bere **držení**. Rituál bere **tažení** a rozlišuje, kde:

| Kde se drží | Co to dělá |
| --- | --- |
| po skle láhve | tře, a tím hřeje |
| na odložené zápalce | vezme ji |
| se zápalkou u hrdla | odpočítává zážeh |

Tření se měří jako **dráha mezi dvěma kroky simulace, v podílech výšky láhve**
— ne v pixelech a ne za snímek. Pixely by znamenaly, že na velkém monitoru
je hra několikrát rychlejší (láhev je tam větší); počítání za snímek by z ní
udělalo hru o snímkové frekvenci.

## Rám obrazovky

Scéna je **horní lišta / herní plocha / spodní pás**, spočítané v `rozvrh.ts`
(`hornilistaY`, `plochaY`, `plochaVyska`, `spodniListaY`, `sloupec`). Všechny
obě fáze kreslí do téhož rámu a liší se jen obsahem plochy — jsou to `rezim`y
v `scena/index.ts`, ne vlastní obrazovky vedle hry. Lišta i spodní pás proto
nezávisí na tom, co je zrovna v ploše: prostřední skupina lišty dostává
`StredListy` (panák k/N, nebo pokus k/3), nápověda dostává hotový text.

**Láhev se do plochy vsazuje, ne kreslí v původní velikosti** (`vlozLahev()`
v `rozvrh.ts`). Rozměry v `Rozvrh` jsou spočítané pro kompozici rozlévání,
kde láhev stojí nad řadou panáků a smí zabrat celou plochu. Rituál má pod ní
ještě teploměr a nad hrdlem musí zbýt na plamen — v původní velikosti vylezlo
na notebooku ústí za horní lištu a s ním pointa celé hry.

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
npm run hra -- --faze                             # rituál a doba tření
npm run check                                     # typy
```

**Scéna se testuje proti falešnému plátnu** (`scena/kresleni.test.ts`). Nepozná,
jestli to vypadá dobře — od toho je oko — ale chytí dvě věci, které typová
kontrola nechytí: že režim sáhl na stav fáze, který je zrovna `null`, a že
**geometrie rituálu sedí** — láhev se vejde nad teploměr i s prostorem na
plamen, na hrdlo a na zápalku jde sáhnout a nepletou se. Kdyby se kreslilo
jinam, než kam se dá sáhnout, byla by to nejhůř dohledatelná chyba ve hře.

**Ukázky mají vlastní test proti zaseknutí** (`jadro/ukazka.test.ts`). Ukázka
řídí vstup místo hráče, takže když zapomene na některý krok, fáze nikdy
neskončí — a protože běží sama, nemá to kdo odklikat.

**Délku tření hlídá test** („svižné tření zahřeje láhev za 4–5 sekund"). Když
se sáhne na `ZAHRATI_ZA_DRAHU`, `CHLADNUTI` nebo `PASMO_STRED`, ozve se dřív
než hráč.

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

### Rituál (kap. 5)

Fáze byla po playtestu **zjednodušená na dva úkony rukou**: natřít láhev
a přiložit zápalku. Původní nabídka sedmi metod zahřívání, volba polohy láhve,
uzávěr a timing lišta na škrtnutí jsou pryč — rituál se má dělat rukama, ne
proklikat. Z kapitoly 5 tedy platí jen kostra (teplota 0–100, cílové pásmo,
`Q`, tři pokusy, srážka za pokus) a všechno ostatní je jinak.

- **Zahřívá se třením po skle**, ne výběrem metody. Dráha se měří v podílech
  výšky láhve, takže tentýž pohyb zahřeje stejně na telefonu i na monitoru.
  Svižné tření (dvě výšky láhve za sekundu) dohřeje za ~4,5 s; ověřuje to
  test i `npm run hra -- --faze`.
- **Násobitele metody a polohy odpadly.** Body za zážeh jsou `700 × Q ×`
  srážka za pokus, nic víc.
- **Střed pásma (72) a jeho šířka jsou doplněk.** Dokument udává jen změnu
  podle polohy (±6 jednotek), kterou hra nemá. Střed určuje, jak dlouho se tře.
- **Pásmo se zužuje s levelem** (`PASMO_UBYTEK_ZA_LEVEL`). Dokument dává fázi
  progresi jen přes odemykání metod, které odpadlo — bez tohohle by byl rituál
  na L8 stejně těžký jako na L1.
- **Bere se NAD středem pásma**, o zhruba 3,7 jednotky: než zápalka doputuje
  k hrdlu a než to chytne, láhev kus tepla ztratí. Přetřít se dá bez trestu —
  chladnutí hladinu vrátí zpátky do pásma, takže se trestá teprve nepozornost
  v obou směrech.
- **Ohořelou zápalku je nutné napřed zahodit** (`zahodZapalku`). Bez toho si
  hráč, který po dohoření nepustil tlačítko, vzal v témže kroku novou a tři
  pokusy mu proletěly mezi prsty za dvanáct vteřin jednoho stisku.
- **Zapalovač, průvan i prasknutí skla odpadly** spolu s metodami. Zápalka je
  jediný oheň, hoří 4 s a její dohoření je jediný způsob, jak přijít o pokus
  jinak než minutím pásma.
- **Bonusové kolo „opakované zapálení" chybí.** Je v diagramu kap. 2, ale
  nikde v textu se nepopisuje, takže by se muselo vymyslet. „Opakované
  zapálení" z webu pokrývá návrat k tření po neúspěchu (kap. 5.3).
- **Medaile zůstává za rozlévání**, ne za celý level (`skore.ts`, `slozLevel`).
  Je to jediná fáze s tolerancí vyladěnou proti modelu hráče; kdyby ji ředil
  zážeh, přestala by měřit to, kvůli čemu existuje.

## Stav

Hotové: **obě fáze** a jejich složení do levelu — rozlévání (tvary lahví
i panáků, náklon a proud z hrdla, přelití) a rituál (zahřátí třením, zápalka,
zážeh, tři pokusy), bodování obojího, medaile, ukázky u obou fází na levelu 1,
výsledek levelu a závěrečná obrazovka.

Chybí: věková brána 18+, ukládání postupu, zvuk, sdílecí karta, přístupnost
pro odečítače, angličtina.

**Neověřené okem.** Rituál má testy na logiku, na geometrii i na to, že
vykreslení nespadne, ale jak scéna doopravdy vypadá, nikdo neviděl. Sem míří
další playtest.
