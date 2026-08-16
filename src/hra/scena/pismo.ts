/**
 * Text na plátně. Zalamování a jednotné písmo na jednom místě, ať se
 * nastavení kontextu neopakuje u každého nápisu.
 */

export const PISMO = 'ui-sans-serif, system-ui, sans-serif';
/** Tabulkové číslice — objemy a odchylky mají vypadat jako z měřidla. */
export const CISLA = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export interface Napis {
  velikost: number;
  barva: string;
  zarovnani?: CanvasTextAlign;
  pismo?: string;
  tucne?: boolean;
}

export function text(
  ctx: CanvasRenderingContext2D,
  obsah: string,
  x: number,
  y: number,
  napis: Napis,
): void {
  ctx.font = `${napis.tucne ? '600 ' : ''}${napis.velikost}px ${napis.pismo ?? PISMO}`;
  ctx.fillStyle = napis.barva;
  ctx.textAlign = napis.zarovnani ?? 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(obsah, x, y);
}

/** Rozdělí text na řádky, které se vejdou do `sirka`. */
export function zalom(
  ctx: CanvasRenderingContext2D,
  obsah: string,
  sirka: number,
  napis: Napis,
): string[] {
  ctx.font = `${napis.velikost}px ${napis.pismo ?? PISMO}`;
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

/** Vypíše zalomený odstavec a vrátí `y` pod ním. */
export function odstavec(
  ctx: CanvasRenderingContext2D,
  obsah: string,
  x: number,
  y: number,
  sirka: number,
  napis: Napis,
  rozestup = 1.45,
): number {
  const radky = zalom(ctx, obsah, sirka, napis);
  radky.forEach((radek, i) => {
    text(ctx, radek, x, y + i * napis.velikost * rozestup, napis);
  });
  return y + radky.length * napis.velikost * rozestup;
}
