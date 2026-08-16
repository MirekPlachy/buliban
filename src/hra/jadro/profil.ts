/**
 * Sdílený převod mezi výškou hladiny a objemem.
 *
 * Láhev i panák jsou tentýž problém: rotační těleso, u kterého se z výšky
 * hladiny má odvodit objem. Jen u dokonalého válce platí, že polovina výšky
 * je polovina objemu — jakmile se nádoba někde rozšíří nebo zúží, přestává
 * to platit, a přesně na tomhle nedorozumění hra stojí.
 *
 * Nádoba je popsaná funkcí `polomer(y)` pro `y` ⟨0, 1⟩ zdola nahoru.
 * Objem do výšky `h` je `∫₀ʰ π r(y)² dy`, znormalizovaný na 1.
 *
 * Bez DOM a bez canvasu — čistá matematika, testovatelná bez prohlížeče.
 */

/** Plynulý přechod 0 → 1 na intervalu ⟨a, b⟩. Ostrý zlom by vypadal jako chyba. */
export function prechod(y: number, a: number, b: number): number {
  const t = Math.min(1, Math.max(0, (y - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Prolnutí těla do užšího hrdla přes přechodové pásmo. */
export function hrdlo(
  y: number,
  telo: number,
  sirkaHrdla: number,
  od: number,
  do_: number,
): number {
  return telo + (sirkaHrdla - telo) * prechod(y, od, do_);
}

/** Vypouklina se středem `stred`, šířkou `sirka` a výškou `vyska`. */
export function hrbol(y: number, stred: number, sirka: number, vyska: number): number {
  const d = (y - stred) / sirka;
  return vyska * Math.exp(-d * d);
}

const VZORKU = 512;

export interface Profil {
  polomer(y: number): number;
  /** Podíl výšky ⟨0,1⟩ → podíl objemu ⟨0,1⟩. */
  objemZVysky(podilVysky: number): number;
  /** Podíl objemu ⟨0,1⟩ → podíl výšky ⟨0,1⟩. */
  vyskaZObjemu(podilObjemu: number): number;
  /**
   * `∫₀¹ r(y)² dy` — objem nádoby o jednotkové výšce i poloměru, bez π.
   * Potřebuje ho vykreslování, aby šla láhev nakreslit ve stejném měřítku
   * jako panáky. Kdyby ve stejném měřítku nebyly, byl by odhad objemu
   * neřešitelný a hra by se rozpadla na hádání.
   */
  objemJednotkovy: number;
}

/**
 * Kumulativní tabulka objemu. Počítá se jednou na tvar a pak se jen
 * interpoluje — inverze integrálu za běhu by byla zbytečná práce v každém
 * z šedesáti kroků simulace za sekundu.
 */
export function postavProfil(polomer: (y: number) => number): Profil {
  const kumulativne = new Float64Array(VZORKU + 1);
  const dy = 1 / VZORKU;
  let soucet = 0;

  for (let i = 1; i <= VZORKU; i += 1) {
    // Lichoběžník přes plochu řezu; pro hladké profily s 512 vzorky je chyba
    // hluboko pod tím, co jde na obrazovce rozeznat.
    const r0 = polomer((i - 1) * dy);
    const r1 = polomer(i * dy);
    soucet += ((r0 * r0 + r1 * r1) / 2) * dy;
    kumulativne[i] = soucet;
  }

  const celkem = kumulativne[VZORKU];
  for (let i = 0; i <= VZORKU; i += 1) kumulativne[i] = kumulativne[i] / celkem;

  const objemZVysky = (podilVysky: number): number => {
    const h = Math.min(1, Math.max(0, podilVysky)) * VZORKU;
    const i = Math.min(VZORKU - 1, Math.floor(h));
    const t = h - i;
    return kumulativne[i] + (kumulativne[i + 1] - kumulativne[i]) * t;
  };

  const vyskaZObjemu = (podilObjemu: number): number => {
    const cil = Math.min(1, Math.max(0, podilObjemu));
    let lo = 0;
    let hi = VZORKU;
    while (hi - lo > 1) {
      const stred = (lo + hi) >> 1;
      if (kumulativne[stred] < cil) lo = stred;
      else hi = stred;
    }
    const a = kumulativne[lo];
    const b = kumulativne[hi];
    const t = b > a ? (cil - a) / (b - a) : 0;
    return (lo + t) / VZORKU;
  };

  return { polomer, objemZVysky, vyskaZObjemu, objemJednotkovy: celkem };
}

// ---------------------------------------------------- hladina v nakloněné nádobě

/**
 * Kolik zbývá vyřešit: kde je hladina, když je nádoba **nakloněná**.
 *
 * Ve svislé láhvi stačí tabulka výše — rovina hladiny je kolmá na osu.
 * Jakmile se láhev nakloní, rovina osu protíná šikmo a řezy přestanou být
 * celé kruhy. Nedá se proto vzít výška hladiny ze svislé láhve a přenést ji
 * na otočený obrys: vyšel by z toho jiný objem, než kolik v láhvi doopravdy
 * je, a hráč by při naklánění viděl rum přibývat nebo mizet.
 *
 * Řeší se to přímo: pro danou rovinu se spočítá objem pod ní a poloha roviny
 * se pak dohledá půlením intervalu.
 */

const VZORKU_ROVINY = 128;
const PULENI = 22;

/** Obsah kruhové úseče `a ≥ a0` v kruhu o poloměru `R`. */
function usec(R: number, a0: number): number {
  if (a0 <= -R) return Math.PI * R * R;
  if (a0 >= R) return 0;
  return R * R * Math.acos(a0 / R) - a0 * Math.sqrt(R * R - a0 * a0);
}

export interface RozsahY {
  min: number;
  max: number;
}

/**
 * Svislý rozsah nádoby po otočení o `uhel`, měřeno od dna (čepu otáčení).
 * Kladné hodnoty jsou níž — je to plátnová soustava.
 */
export function rozsahOtoceni(
  polomer: (y: number) => number,
  polomerPx: number,
  vyskaPx: number,
  uhel: number,
): RozsahY {
  const s = Math.sin(uhel);
  const c = Math.cos(uhel);
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let i = 0; i <= VZORKU_ROVINY; i += 1) {
    const y = i / VZORKU_ROVINY;
    const r = polomer(y) * polomerPx;
    const h = -y * vyskaPx;
    for (const a of [r, -r]) {
      const py = a * s + h * c;
      if (py < min) min = py;
      if (py > max) max = py;
    }
  }
  return { min, max };
}

/**
 * Objem té části nádoby, která leží pod vodorovnou rovinou.
 *
 * `k` je poloha roviny vůči dnu, kladná směrem dolů. Nádoba je rotační
 * těleso, takže každý řez kolmý na osu je kruh o poloměru `r(h)`; šikmá
 * rovina z něj ukrojí úseč a stačí je posčítat po celé výšce.
 */
export function objemPodRovinou(
  polomer: (y: number) => number,
  polomerPx: number,
  vyskaPx: number,
  uhel: number,
  k: number,
): number {
  const s = Math.abs(Math.sin(uhel));
  const c = Math.cos(uhel);
  const dh = vyskaPx / VZORKU_ROVINY;
  let soucet = 0;

  // Svislá (nebo obrácená) láhev: rovina je kolmá na osu, řezy jsou celé
  // kruhy. Znaménko `sin` je jedno — nádoba je osově souměrná.
  if (s < 1e-9) {
    for (let i = 0; i < VZORKU_ROVINY; i += 1) {
      const h = (i + 0.5) * dh;
      if (-h * c < k) continue;
      const R = polomer(h / vyskaPx) * polomerPx;
      soucet += Math.PI * R * R * dh;
    }
    return soucet;
  }

  for (let i = 0; i < VZORKU_ROVINY; i += 1) {
    const h = (i + 0.5) * dh;
    const R = polomer(h / vyskaPx) * polomerPx;
    soucet += usec(R, (k + h * c) / s) * dh;
  }
  return soucet;
}

/**
 * Poloha hladiny (vůči dnu, kladná dolů) pro daný podíl naplnění.
 *
 * Objem pod rovinou s `k` klesá, takže stačí půlit interval mezi nejvyšším
 * a nejnižším bodem otočené nádoby.
 */
export function rovinaProObjem(
  polomer: (y: number) => number,
  polomerPx: number,
  vyskaPx: number,
  uhel: number,
  podilObjemu: number,
): number {
  const rozsah = rozsahOtoceni(polomer, polomerPx, vyskaPx, uhel);
  const podil = Math.min(1, Math.max(0, podilObjemu));
  if (podil <= 0) return rozsah.max;
  if (podil >= 1) return rozsah.min;

  // Celek se měří toutéž kvadraturou jako části, aby se diskretizační chyba
  // vykrátila a plná láhev vycházela přesně plná.
  const cil =
    podil * objemPodRovinou(polomer, polomerPx, vyskaPx, uhel, rozsah.min);

  let lo = rozsah.min;
  let hi = rozsah.max;
  for (let i = 0; i < PULENI; i += 1) {
    const stred = (lo + hi) / 2;
    if (objemPodRovinou(polomer, polomerPx, vyskaPx, uhel, stred) > cil) lo = stred;
    else hi = stred;
  }
  return (lo + hi) / 2;
}
