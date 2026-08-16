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
 * Bez DOM, aby to šlo testovat pod holým Node.
 */

import { KAPACITA_PANAKU_ML } from '../ladeni.ts';
import type { ProfilLahve } from '../jadro/lahev.ts';
import type { ProfilPanaku } from '../jadro/panak.ts';

/** Náklon plně otočené láhve. Za svislicí, aby opravdu tekla. */
export const MAX_UHEL = 1.92;

export interface Rozvrh {
  sirka: number;
  vyska: number;
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
  /** px³ na mililitr. Společné pro láhev i panáky — v tom je celý vtip. */
  meritko: number;
}

const OKRAJ = 20;
const HORNI_LISTA = 54;
const SPODNI_LISTA = 46;
const MEZERA_NAD_PANAKY = 30;

export function stred(rozvrh: Rozvrh, index: number): number {
  return rozvrh.prvniPanakX + rozvrh.rozestup * index + rozvrh.rozestup / 2;
}

export function spocitejRozvrh(
  sirka: number,
  vyska: number,
  panaku: number,
  kapacitaLahveMl: number,
  lahev: ProfilLahve,
  panak: ProfilPanaku,
): Rozvrh {
  const dostupnaSirka = Math.max(120, sirka - 2 * OKRAJ);
  const rozestup = dostupnaSirka / panaku;

  let panakSirka = Math.min(rozestup * 0.74, 64);
  const stulY = vyska - SPODNI_LISTA;

  const rozmery = (sirkaPanaku: number) => {
    const vyskaPanaku = panak.tvar.stihlost * sirkaPanaku;
    const meritko =
      (Math.PI * (sirkaPanaku / 2) ** 2 * vyskaPanaku * panak.objemJednotkovy) /
      KAPACITA_PANAKU_ML;
    // Objem láhve = π · R² · H · ∫r²dy, a H = 2 · štíhlost · R.
    const jmenovatel = 2 * Math.PI * lahev.tvar.stihlost * lahev.objemJednotkovy;
    return {
      meritko,
      vyskaPanaku,
      polomer: Math.cbrt((kapacitaLahveMl * meritko) / jmenovatel),
    };
  };

  let m = rozmery(panakSirka);
  let vyskaLahve = 2 * lahev.tvar.stihlost * m.polomer;

  // Dvě omezení najednou, obě kvůli tomu, že se láhev při nalévání otáčí
  // kolem ústí a dno opíše oblouk dlouhý skoro jako celá láhev. Půllitrová
  // láhev je přitom vedle čtyřicetimililitrového panáku čtyřikrát vyšší.
  //
  // Svisle: nad ústím musí zbýt místo na vyhoupnuté dno — a to nejen na osu
  // láhve, ale i na její šířku, protože nakloněné dno je nahoře nejvyšší
  // svým okrajem, ne středem. Odtud ten člen se štíhlostí.
  // Vodorovně: bez stropu by láhev při nalévání do krajního panáku vyjela
  // ze scény — a hráč ji potřebuje vidět celou.
  const svislaRezerva =
    1 +
    Math.abs(Math.cos(MAX_UHEL)) +
    Math.abs(Math.sin(MAX_UHEL)) / (2 * lahev.tvar.stihlost);
  const mistoNaLahev = Math.min(
    (stulY - m.vyskaPanaku - MEZERA_NAD_PANAKY - HORNI_LISTA) / svislaRezerva,
    sirka * 0.5,
  );

  // Nevejde-li se, zmenší se scéna jako celek. Zmenšit jen láhev nelze —
  // tím by přestal platit společný poměr a hra by lhala.
  if (vyskaLahve > mistoNaLahev) {
    panakSirka *= mistoNaLahev / vyskaLahve;
    m = rozmery(panakSirka);
    vyskaLahve = 2 * lahev.tvar.stihlost * m.polomer;
  }

  return {
    sirka,
    vyska,
    stulY,
    panakSirka,
    panakVyska: m.vyskaPanaku,
    rozestup,
    prvniPanakX: OKRAJ,
    lahevPolomer: m.polomer,
    lahevVyska: vyskaLahve,
    lahevDnoY: stulY - m.vyskaPanaku - MEZERA_NAD_PANAKY,
    meritko: m.meritko,
  };
}

export interface Bod {
  x: number;
  y: number;
}

/**
 * Kde je ústí hrdla po otočení láhve o `uhel` kolem dna.
 *
 * Hrdlo se dohledává v profilu tvaru (`lahev.hrdloY`), ne zadává ručně —
 * jinak by u každého nového tvaru bylo potřeba číslo doladit a proud by
 * u některé láhve vytékal ze skla.
 */
/**
 * Bod, ze kterého vytéká rum: **spodní okraj ústí** nakloněné láhve.
 *
 * Ústí je kruh o poloměru `ustiPolomer` na vrcholu osy. Při náklonu z něj
 * rum přepadá přes nejnižší bod toho kruhu, ne přes jeho střed a rozhodně ne
 * zprostřed hrdla. Rozdíl je vidět na první pohled: proud jinak vytéká ze
 * skla kus pod okrajem.
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
 * Tři věci, které nejsou zřejmé:
 *
 * 1. Kotvou je **střed ústí, ne dno**. Ústí drží stálou výšku nad panákem
 *    a dno kolem něj opisuje oblouk — přesně jako když někdo naklání láhev
 *    v ruce. Kdyby se otáčelo kolem dna, ústí by při plném náklonu ujelo
 *    stranou i dolů.
 * 2. Kotvou je střed ústí, ale rum přepadá přes jeho **spodní okraj**
 *    (`ustiHrdla`). Kotvit rovnou okraj by nešlo: u svislé láhve žádný
 *    „spodní okraj" není a láhev by při prvním stupni náklonu poskočila.
 * 3. Láhev se naklání **směrem ke středu scény**. U krajního panáku by
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
  // Střed ústí drží výšku, kterou má u rovně stojící láhve.
  const ustiYSveta = rozvrh.lahevDnoY - H;

  return {
    uhel,
    x: cilX - H * Math.sin(uhel),
    y: ustiYSveta + H * Math.cos(uhel),
  };
}
