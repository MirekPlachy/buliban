/**
 * Text na plátně.
 *
 * Tři role písma, ale **jeden zdroj**: display i tělo si hra bere z téhož
 * designového systému jako web (`--font-display`, `--font-body`), stejně jako
 * si z něj bere barvy. Dokud tu stály natvrdo `system-ui` a `ui-monospace`,
 * vypadala hra jako cizí kus softwaru vlepený do stránky.
 *
 * Číslice zůstávají monospace záměrně — objemy a odchylky mají působit jako
 * z měřidla a hlavně nesmí poskakovat, když se mění o desetinu.
 *
 * Velikosti se zadávají v **návrhových pixelech** a volající je násobí
 * `rozvrh.ui`. Fixní velikosti vypadaly na telefonu naducaně a na velkém
 * monitoru jako drobné písmo pod obří lahví.
 */

/** Role písma, ne konkrétní rodina — tu určí designový systém. */
export type Rez = 'nadpis' | 'text' | 'cisla';

const ZALOHA: Record<Rez, string> = {
  nadpis: "Georgia, 'Times New Roman', serif",
  text: 'ui-sans-serif, system-ui, sans-serif',
  cisla: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

let rodiny: Record<Rez, string> | null = null;

/** Rodiny se čtou jednou; `getComputedStyle` na každý nápis by stálo snímky. */
function rodina(rez: Rez = 'text'): string {
  if (!rodiny) {
    rodiny = { ...ZALOHA };
    if (typeof document !== 'undefined') {
      const styl = getComputedStyle(document.documentElement);
      for (const klic of ['nadpis', 'text'] as const) {
        const nazev = klic === 'nadpis' ? '--font-display' : '--font-body';
        const hodnota = styl.getPropertyValue(nazev).trim();
        if (hodnota) rodiny[klic] = hodnota;
      }
    }
  }
  return rodiny[rez];
}

export interface Napis {
  velikost: number;
  barva: string;
  zarovnani?: CanvasTextAlign;
  /** Výchozí `alphabetic`. Pro odsazení odshora se hodí `top`. */
  svisle?: CanvasTextBaseline;
  pismo?: Rez;
  tucne?: boolean;
  /** Prostrkání v pixelech. Jen pro verzálkové štítky. */
  prostrkani?: number;
}

/**
 * Nastaví kontext podle nápisu. Odděleně od kreslení proto, že měření šířky
 * musí použít **přesně stejné** nastavení — jinak se zalomený odstavec
 * vejde na papíře a přeteče na obrazovce.
 */
function nastav(ctx: CanvasRenderingContext2D, napis: Napis): void {
  ctx.font = `${napis.tucne ? '600 ' : ''}${napis.velikost}px ${rodina(napis.pismo)}`;
  ctx.letterSpacing = `${napis.prostrkani ?? 0}px`;
  ctx.textAlign = napis.zarovnani ?? 'left';
  ctx.textBaseline = napis.svisle ?? 'alphabetic';
}

export function text(
  ctx: CanvasRenderingContext2D,
  obsah: string,
  x: number,
  y: number,
  napis: Napis,
): void {
  nastav(ctx, napis);
  ctx.fillStyle = napis.barva;
  ctx.fillText(obsah, x, y);
}

export function sirkaTextu(
  ctx: CanvasRenderingContext2D,
  obsah: string,
  napis: Napis,
): number {
  nastav(ctx, napis);
  return ctx.measureText(obsah).width;
}

/** Rozdělí text na řádky, které se vejdou do `sirka`. */
export function zalom(
  ctx: CanvasRenderingContext2D,
  obsah: string,
  sirka: number,
  napis: Napis,
): string[] {
  nastav(ctx, napis);
  const radky: string[] = [];
  let radek = '';

  for (const slovo of obsah.split(' ')) {
    const pokus = radek ? `${radek} ${slovo}` : slovo;
    if (ctx.measureText(pokus).width <= sirka || !radek) {
      radek = pokus;
    } else {
      radky.push(radek);
      radek = slovo;
    }
  }
  if (radek) radky.push(radek);
  return radky;
}

/** Výška zalomeného odstavce, aniž by se cokoli nakreslilo. */
export function vyskaOdstavce(
  ctx: CanvasRenderingContext2D,
  obsah: string,
  sirka: number,
  napis: Napis,
  rozestup = 1.5,
): number {
  return zalom(ctx, obsah, sirka, napis).length * napis.velikost * rozestup;
}

/**
 * Vypíše zalomený odstavec a vrátí `y` pod ním.
 *
 * `y` je **horní hrana** prvního řádku, ne účaří: skládat panely z účaří
 * znamená u každého odstavce dopočítávat, o kolik text vystoupá nad zadaný
 * bod, a přesně tam vznikaly nakřivo posazené karty.
 */
export function odstavec(
  ctx: CanvasRenderingContext2D,
  obsah: string,
  x: number,
  y: number,
  sirka: number,
  napis: Napis,
  rozestup = 1.5,
): number {
  const vyskaRadku = napis.velikost * rozestup;
  const radky = zalom(ctx, obsah, sirka, napis);
  radky.forEach((radek, i) => {
    text(ctx, radek, x, y + i * vyskaRadku, { ...napis, svisle: 'top' });
  });
  return y + radky.length * vyskaRadku;
}
