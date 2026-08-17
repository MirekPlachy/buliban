/**
 * Rozvržení scény — a hlavně jediná věc na vykreslování, na které opravdu
 * záleží: **láhev a panáky musí být ve stejném měřítku.**
 *
 * Hra stojí na tom, že hráč odhadne, kolik panáků se z láhve nalije. Kdyby
 * byla láhev nakreslená „aby vypadala dobře", byl by ten odhad neřešitelný
 * a hra by se rozpadla na hádání. Proto se měřítko počítá z objemů:
 * z panáku vyjde počet pixelů³ na mililitr a láhev se tomu podřídí.
 *
 * Objem roste s **třetí** mocninou rozměru, takže půllitrová láhev vedle
 * čtyřicetimililitrového panáku není 12,5× větší, ale 2,3× — nakreslit ji
 * „dvanáctkrát větší" by hráče spolehlivě obelhalo.
 *
 * Druhá věc, kterou soubor drží, je **rám obrazovky**: horní lišta se stavem,
 * spodní pás s nápovědou a mezi nimi herní plocha. Fáze 1 (otevírání láhve)
 * a fáze 3 (zahřívání a zážeh) budou kreslit do téhož rámu — proto tu pásma
 * jsou pojmenovaná a spočítaná, i když je zatím používá jen rozlévání.
 *
 * Bez DOM, aby to šlo testovat pod holým Node.
 */

import { KAPACITA_PANAKU_ML } from '../ladeni.ts';
import type { ProfilLahve } from '../jadro/lahev.ts';
import type { ProfilPanaku } from '../jadro/panak.ts';

/** Náklon plně otočené láhve. Za svislicí, aby opravdu tekla. */
export const MAX_UHEL = 1.92;

/** Výška horní lišty v návrhových pixelech (× `ui`). */
const HORNI_LISTA = 58;

/**
 * Výkladový pruh pod horní lištou, v návrhových pixelech (× `ui`).
 *
 * Jediné místo pro **všechen průvodní text**: nápovědu, komentář ukázky,
 * pobídku „dál" i hlášku po zážehu. Herní plocha začíná až pod ním.
 *
 * Dva důvody. Panel položený volně na plochu podlezla láhev: kompozice smí
 * plochu vyplnit celou, takže na výšku omezené obrazovce panel přeřízl
 * hrdlo, tedy přesně to místo, kam ukázka míří proudem i zápalkou. A spodní
 * pás s nápovědou nutil hráče těkat očima mezi horní lištou a dolním okrajem
 * — teď se všechno čte na jednom místě a spodní pás odpadl úplně.
 */
const VYKLAD = 104;

/** Boční okraj scény v návrhových pixelech. */
const OKRAJ = 24;

/**
 * Rozteč panáků v násobcích jejich šířky. 1,0 = sklo na sklo.
 *
 * Dřív se počítala jako „dostupná šířka děleno počtem", takže dva panáky na
 * notebooku stály sedm set pixelů od sebe a scéna se rozpadla na dvě půlky.
 * Rozteč je vlastnost **řady**, ne obrazovky: mezera mezi panáky má vypadat
 * stejně u dvou i u osmi. Šířka obrazovky rozhoduje jen o tom, jak velké
 * sklo se do ní vejde.
 */
const ROZTEC = 1.46;

/**
 * Mezera mezi dnem stojící láhve a okrajem panáků, v šířkách panáku.
 *
 * `ZAKLAD` je minimum, `STROP` hranice, po kterou se mezera roztahuje, když
 * scéně zbyde svislé místo. Roztažení je jediný způsob, jak volnou výšku
 * použít: šířku panáku často drží něco jiného (rozmach láhve na telefonu),
 * takže „zvětšit celou scénu" nejde a bez roztažení by dole i nahoře zůstal
 * pruh prázdna.
 */
const MEZERA_ZAKLAD = 0.5;
const MEZERA_STROP = 3.4;

/**
 * Volný pás pod deskou a nad kompozicí, v návrhových pixelech.
 * Bez nich se hrdlo láhve dotýká horní lišty a panáky stojí na hraně spodní.
 */
const PODSTAVA = 18;
const VZDUCH = 14;

/**
 * Jak vysoko nad okrajem panáku je ústí, když je láhev plně nakloněná.
 * V násobcích výšky panáku (plus poloměr hrdla, viz `lahevSpust`).
 *
 * Ústí je vrchol láhve, takže u stojící láhve visí celou její délku nad
 * stolem. Kdyby si tu výšku držela i při nalévání, padal by rum do panáku
 * z pěti set pixelů jako z okapu — a scéna by kvůli rozmachu potřebovala
 * o polovinu délky láhve víc místa nad ní, které je pak zbytek času prázdné.
 * Proto láhev při naklánění zároveň klesá k panáku, jak to dělá i ruka.
 */
const VYLITI_NAD_PANAKEM = 0.9;

/** Strop výšky kompozice. Nad ním scéna neroste, jen se vycentruje. */
const MAX_VYSKA_SCENY = 760;

/**
 * Zmenšení celé kompozice proti tomu, co by se na plochu vešlo.
 *
 * Láhev a panáky přes celou plochu působily obrovsky — sklo má na stole
 * stát, ne zabírat obrazovku od lišty k liště. Vzduch okolo si rozebere
 * roztažená mezera nad panáky, takže se zmenšením neroste pruh prázdna
 * dole, ale odstup láhve od hrdla panáků.
 */
const ZMENSENI = 0.85;

/** Šířka obsahového sloupce (karty, panely, odstavce). */
const MAX_SLOUPEC = 560;

export interface Rozvrh {
  sirka: number;
  vyska: number;
  /**
   * Měřítko textu a odsazení; 1 = návrhová velikost. Fixní velikosti písma
   * vypadají na malém telefonu naducaně a na velkém monitoru jako drobné
   * písmo pod obří lahví — proto se s plochou škálují.
   */
  ui: number;
  /** Horní lišta se stavem: pás 0…`hornilistaY`. */
  hornilistaY: number;
  /** Herní plocha od výkladového pruhu k dolní hraně. Sem kreslí obě fáze. */
  plochaY: number;
  plochaVyska: number;
  /** Šířka vycentrovaného obsahového sloupce pro panely a odstavce. */
  sloupec: number;
  /** Podstava panáků — společná linka stolu. */
  stulY: number;
  panakSirka: number;
  panakVyska: number;
  rozestup: number;
  prvniPanakX: number;
  lahevPolomer: number;
  lahevVyska: number;
  /** Výška, ve které je dno neotočené láhve. Otáčí se kolem tohoto bodu. */
  lahevDnoY: number;
  /** O kolik ústí klesne mezi stojící a plně nakloněnou lahví. */
  lahevSpust: number;
  /** px³ na mililitr. Společné pro láhev i panáky — v tom je celý vtip. */
  meritko: number;
}

export function stred(rozvrh: Rozvrh, index: number): number {
  return rozvrh.prvniPanakX + rozvrh.rozestup * index + rozvrh.rozestup / 2;
}

/** Levý okraj vycentrovaného obsahového sloupce. */
export function sloupecX(rozvrh: Rozvrh): number {
  return (rozvrh.sirka - rozvrh.sloupec) / 2;
}

function meritkoUi(sirka: number, vyska: number): number {
  return Math.min(1.3, Math.max(0.85, Math.min(sirka / 1100, vyska / 760)));
}

export function spocitejRozvrh(
  sirka: number,
  vyska: number,
  panaku: number,
  kapacitaLahveMl: number,
  lahev: ProfilLahve,
  panak: ProfilPanaku,
): Rozvrh {
  const ui = meritkoUi(sirka, vyska);
  const hornilista = HORNI_LISTA * ui;
  const plochaY = hornilista + VYKLAD * ui;
  const plochaVyska = Math.max(120, vyska - plochaY);
  const plochaSirka = Math.max(120, sirka - 2 * OKRAJ * ui);

  // Celá scéna je násobek jedné veličiny — šířky panáku. Stačí ji tedy najít
  // tak velkou, aby prošla všemi omezeními, a ostatní rozměry z ní plynou.
  // Objem láhve = π · R² · H · ∫r²dy, a H = 2 · štíhlost · R.
  const stihlostPanaku = panak.tvar.stihlost;
  const meritkoJednotkove =
    (Math.PI * 0.25 * stihlostPanaku * panak.objemJednotkovy) / KAPACITA_PANAKU_ML;
  const jmenovatel = 2 * Math.PI * lahev.tvar.stihlost * lahev.objemJednotkovy;
  const polomerPodil = Math.cbrt((kapacitaLahveMl * meritkoJednotkove) / jmenovatel);
  const vyskaLahvePodil = 2 * lahev.tvar.stihlost * polomerPodil;

  // Rozmach: nad ústím musí zbýt místo na vyhoupnuté dno — a to nejen na osu
  // láhve, ale i na její šířku, protože nakloněné dno je nahoře nejvyšší svým
  // okrajem, ne středem. Odtud ten člen se štíhlostí.
  const rozmach =
    1 +
    Math.abs(Math.cos(MAX_UHEL)) +
    Math.abs(Math.sin(MAX_UHEL)) / (2 * lahev.tvar.stihlost);

  /**
   * Kolik místa nad dnem stojící láhve scéna potřebuje: buď na ni samotnou,
   * nebo na její rozmach zmenšený o to, o co při naklánění klesne. Spuštění
   * ústí k panáku tak platí i za výšku scény — bez něj by nad lahví zůstal
   * pruh prázdna vysoký jako polovina jejího rozmachu.
   */
  const nadDnem = (mezeraPodil: number) => {
    const spust = Math.max(
      0,
      mezeraPodil +
        vyskaLahvePodil -
        (VYLITI_NAD_PANAKEM * stihlostPanaku + Math.abs(Math.cos(MAX_UHEL)) * polomerPodil),
    );
    return { spust, vyska: Math.max(vyskaLahvePodil, vyskaLahvePodil * rozmach - spust) };
  };

  const vyskaPodil = nadDnem(MEZERA_ZAKLAD).vyska + MEZERA_ZAKLAD + stihlostPanaku;

  // Vodorovný dojezd: u krajního panáku se láhev naklání ke středu a dno
  // opíše oblouk skoro přes celou svou délku. Půlka řady ten oblouk vykryje,
  // proto se odečítá — u osmi panáků žádné omezení nezbyde, u dvou ano.
  // Vodorovně z dna vyčnívá jen jeho průmět, tedy poloměr × |cos| náklonu;
  // při plném náklonu leží láhev skoro naplocho a šířkou míří vzhůru.
  const dosahPodil =
    Math.abs(Math.sin(MAX_UHEL)) * vyskaLahvePodil +
    Math.abs(Math.cos(MAX_UHEL)) * polomerPodil -
    (ROZTEC * (panaku - 1)) / 2;

  const vzduch = VZDUCH * ui;
  const vyskaKVyplneni = Math.max(120, plochaVyska - (PODSTAVA + VZDUCH) * ui);
  const meze = [
    Math.min(vyskaKVyplneni, MAX_VYSKA_SCENY * ui) / vyskaPodil,
    plochaSirka / (panaku * ROZTEC),
  ];
  if (dosahPodil > 0) meze.push(sirka / 2 / dosahPodil);

  const panakSirka = Math.max(10, Math.min(...meze) * ZMENSENI);
  const panakVyska = stihlostPanaku * panakSirka;
  const rozestup = ROZTEC * panakSirka;

  // Zbylou výšku spolkne mezera nad panáky: láhev se zvedne a scéna se
  // rozkročí, místo aby zůstal pruh prázdna nad ní i pod ní.
  const volno = Math.max(0, vyskaKVyplneni - vyskaPodil * panakSirka);
  const mezera =
    MEZERA_ZAKLAD * panakSirka +
    Math.min(volno * 0.7, (MEZERA_STROP - MEZERA_ZAKLAD) * panakSirka);

  const nad = nadDnem(mezera / panakSirka);
  const vyskaKompozice = nad.vyska * panakSirka + mezera + panakVyska;
  const vyskaKlidu = vyskaLahvePodil * panakSirka + mezera + panakVyska;

  // Kompozice se svisle centruje podle **stojící** láhve plus části jejího
  // rozmachu. Podle rozmachu samotného ne: je vidět zlomek času a scéna by
  // v klidu sedla u spodní hrany. Podle klidu samotného taky ne: na vysoké
  // obrazovce by pak celé volno spadlo pod stůl. Rozmach se každopádně musí
  // vejít — o to se stará spodní mez.
  const stulY =
    plochaY +
    vzduch +
    Math.min(
      Math.max(
        (vyskaKVyplneni + vyskaKlidu + 0.65 * (vyskaKompozice - vyskaKlidu)) / 2,
        vyskaKompozice,
      ),
      vyskaKVyplneni,
    );

  return {
    sirka,
    vyska,
    ui,
    hornilistaY: hornilista,
    plochaY,
    plochaVyska,
    sloupec: Math.min(plochaSirka, MAX_SLOUPEC * ui),
    stulY,
    panakSirka,
    panakVyska,
    rozestup,
    prvniPanakX: (sirka - rozestup * panaku) / 2,
    lahevPolomer: polomerPodil * panakSirka,
    lahevVyska: vyskaLahvePodil * panakSirka,
    lahevDnoY: stulY - panakVyska - mezera,
    lahevSpust: nad.spust * panakSirka,
    meritko: meritkoJednotkove * panakSirka ** 3,
  };
}

/**
 * Vsadí láhev do zadaného pásu plochy a vrátí rozvrh s **přeškálovanou**
 * lahví plus střed, kolem kterého se má posadit.
 *
 * Proč to existuje: rozměry láhve v `Rozvrh` jsou spočítané pro kompozici
 * rozlévání, kde láhev stojí nad řadou panáků a smí být přes celou plochu.
 * Fáze 1 a 3 mají pod lahví ještě timing lištu, teploměr a dlaždice — a do
 * zbylého pásu se láhev v původní velikosti nevejde. Na notebooku jí ústí
 * vylezlo nad horní lištu a tělo leželo přes teploměr, takže **nebyl vidět
 * plamen**, což je pointa celé hry.
 *
 * Zmenšuje se podle výšky pásu a šířky sloupce proti **stojící** láhvi.
 * Dřív se šířka poměřovala s výškou láhve kvůli poloze „na boku" — ta ale
 * z rituálu vypadla, a strop podle ní dělal z láhve na výšku orientované
 * obrazovce trpaslíka: nalévalo se z láhve přes půl plochy a zahřívala se
 * poloviční. Velikost má mezi fázemi držet, je to táž láhev.
 *
 * `rezervaNad` je místo nad hrdlem v **poloměrech láhve** (na plamen).
 * Je součástí téže rovnice, ne krok po vsazení: rezerva se zmenšuje spolu
 * s lahví, takže `m·(H + rezerva·R) = pás`. Počítat ji z nezmenšené láhve
 * znamenalo srazit láhev víc, než kolik plamen doopravdy potřebuje.
 */
export function vlozLahev(
  rozvrh: Rozvrh,
  horni: number,
  dolni: number,
  rezervaNad = 0,
): { rozvrh: Rozvrh; cx: number; cy: number } {
  const vyska = Math.max(40, dolni - horni);
  const sirka = Math.max(40, rozvrh.sloupec);
  const meritko = Math.min(
    1,
    vyska / (rozvrh.lahevVyska + rezervaNad * rozvrh.lahevPolomer),
    sirka / (2 * rozvrh.lahevPolomer),
  );

  return {
    rozvrh: {
      ...rozvrh,
      lahevVyska: rozvrh.lahevVyska * meritko,
      lahevPolomer: rozvrh.lahevPolomer * meritko,
    },
    cx: rozvrh.sirka / 2,
    cy: (horni + dolni) / 2,
  };
}

export interface Bod {
  x: number;
  y: number;
}

/**
 * Bod, ze kterého vytéká rum: **spodní okraj ústí** nakloněné láhve.
 *
 * Ústí je kruh o poloměru `ustiPolomer` na vrcholu osy (`y = 1`), ne nejužší
 * místo hrdla — u láhve s ramenem leží nejužší místo 28 % výšky pod okrajem
 * a proud by vytékal zprostřed skla. Při náklonu z něj rum přepadá přes
 * nejnižší bod toho kruhu, ne přes jeho střed.
 */
export function ustiHrdla(rozvrh: Rozvrh, lahev: ProfilLahve, poloha: PolohaLahve): Bod {
  const s = Math.sin(poloha.uhel);
  const c = Math.cos(poloha.uhel);
  const H = rozvrh.lahevVyska;
  // Nejnižší bod kružnice ústí leží na straně, kam je láhev nakloněná.
  const okraj = Math.sign(s) * lahev.ustiPolomer * rozvrh.lahevPolomer;

  return {
    x: poloha.x + okraj * c + H * s,
    y: poloha.y + okraj * s - H * c,
  };
}

export interface PolohaLahve {
  /** Dno láhve ve světě — bod, kolem kterého se obrys kreslí a otáčí. */
  x: number;
  y: number;
  /** Náklon se znaménkem. Kladný = hrdlo doprava. */
  uhel: number;
}

/**
 * Kam posadit láhev, aby hrdlo mířilo přesně nad panák.
 *
 * Čtyři věci, které nejsou zřejmé:
 *
 * 1. Kotvou je **střed ústí, ne dno**. Ústí zůstává nad panákem a dno kolem
 *    něj opisuje oblouk — přesně jako když někdo naklání láhev v ruce. Kdyby
 *    se otáčelo kolem dna, ústí by při plném náklonu ujelo stranou i dolů.
 * 2. Ústí přitom **klesá k panáku** (`lahevSpust`), protože u stojící láhve
 *    visí celou její délku nad stolem. Bez klesání padá rum do panáku
 *    z výšky celé láhve a scéna navíc platí za rozmach místem, které je pak
 *    zbytek času prázdné.
 * 3. Kotvou je střed ústí, ale rum přepadá přes jeho **spodní okraj**
 *    (`ustiHrdla`). Kotvit rovnou okraj by nešlo: u svislé láhve žádný
 *    „spodní okraj" není a láhev by při prvním stupni náklonu poskočila.
 * 4. Láhev se naklání **směrem ke středu scény**. U krajního panáku by
 *    jinak dno vyjelo z obrazu. Odpovídá to i tomu, co dělá člověk u stolu:
 *    nakloní láhev dovnitř, ne přes okraj.
 */
export function polohaLahve(
  rozvrh: Rozvrh,
  lahev: ProfilLahve,
  cilX: number,
  naklonPodil: number,
): PolohaLahve {
  const smer = cilX < rozvrh.sirka / 2 ? -1 : 1;
  const uhel = smer * naklonPodil * MAX_UHEL;
  const H = rozvrh.lahevVyska;
  const ustiYSveta = rozvrh.lahevDnoY - H + naklonPodil * rozvrh.lahevSpust;

  return {
    uhel,
    x: cilX - H * Math.sin(uhel),
    y: ustiYSveta + H * Math.cos(uhel),
  };
}
