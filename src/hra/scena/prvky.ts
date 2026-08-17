/**
 * Drobné kreslicí prvky, které používá HUD i výsledek: panel, linka, štítek.
 *
 * Jsou tady proto, aby se panel kreslil ve hře **jedním způsobem**. Když měl
 * každý nápis vlastní obdélník a vlastní průhlednost, vypadala každá
 * obrazovka jinak, přestože všechny říkaly totéž.
 *
 * Fáze 1 a 3 dostanou stejné panely — o to víc se vyplatí je mít na jednom
 * místě, ne rozepsané v každé obrazovce zvlášť.
 */

import { pruhledne } from './barvy.ts';
import type { Paleta } from './barvy.ts';
import { text } from './pismo.ts';
import type { Napis } from './pismo.ts';
import type { Rozvrh } from './rozvrh.ts';

export function zaobleny(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  sirka: number,
  vyska: number,
  polomer: number,
): void {
  const r = Math.min(polomer, sirka / 2, vyska / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + sirka, y, x + sirka, y + vyska, r);
  ctx.arcTo(x + sirka, y + vyska, x, y + vyska, r);
  ctx.arcTo(x, y + vyska, x, y, r);
  ctx.arcTo(x, y, x + sirka, y, r);
  ctx.closePath();
}

export interface Panel {
  /** Sytost pozadí. 1 = plná melasa, míň = scéna prosvítá. */
  kryti?: number;
  /** Barva obrysu. Bez ní panel žádný nemá. */
  obrys?: string;
}

/** Panel na scéně: melasové pozadí, tenký obrys, jemný stín pod hranou. */
export function kresliPanel(
  ctx: CanvasRenderingContext2D,
  paleta: Paleta,
  r: Rozvrh,
  x: number,
  y: number,
  sirka: number,
  vyska: number,
  volby: Panel = {},
): void {
  ctx.save();
  ctx.shadowColor = pruhledne('#000000', 0.45);
  ctx.shadowBlur = 24 * r.ui;
  ctx.shadowOffsetY = 6 * r.ui;
  zaobleny(ctx, x, y, sirka, vyska, 14 * r.ui);
  ctx.fillStyle = pruhledne(paleta.skloStin, volby.kryti ?? 0.96);
  ctx.fill();
  ctx.restore();

  if (volby.obrys) {
    zaobleny(ctx, x, y, sirka, vyska, 14 * r.ui);
    ctx.strokeStyle = volby.obrys;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** Vlasová linka. Odděluje lišty od scény a položky v panelu. */
export function kresliLinku(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  barva: string,
): void {
  ctx.strokeStyle = barva;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, Math.round(y) + 0.5);
  ctx.lineTo(x2, Math.round(y) + 0.5);
  ctx.stroke();
}

/**
 * Verzálkový štítek nad hodnotou („LEVEL", „SKÓRE").
 *
 * Prostrkání není ozdoba: verzálky bez něj drží k sobě a v malé velikosti se
 * slijí do bloku, ve kterém se nedá přečíst nic.
 */
export function stitek(
  ctx: CanvasRenderingContext2D,
  obsah: string,
  x: number,
  y: number,
  r: Rozvrh,
  barva: string,
  zarovnani: CanvasTextAlign = 'left',
): void {
  text(ctx, obsah.toUpperCase(), x, y, {
    velikost: 9.5 * r.ui,
    barva,
    zarovnani,
    svisle: 'top',
    prostrkani: 1.4 * r.ui,
  } satisfies Napis);
}
