/**
 * Vstupní bod hry — jediné, co o ní stránka ví.
 *
 * Adresa umí:
 *   ?seed=vecirek   pevné podmínky, sdílitelné mezi hráči
 *   ?level=7        skok na level
 *   ?debug=1        ladicí panel: objemy, průtok, fáze, přepínač levelu
 *
 * Ladicí panel je tu od začátku schválně. Dokument ho v kap. 9 označuje za
 * věc, kterou je nutné postavit jako první — bez něj se hra nedá vyladit.
 */

import { POSLEDNI_LEVEL } from './levely.ts';
import { seedZTextu } from './jadro/nahoda.ts';
import { spustHru } from './hra.ts';

function seedZAdresy(parametry: URLSearchParams): number {
  const zadany = parametry.get('seed');
  if (!zadany) return Math.floor(Math.random() * 0xffffffff) >>> 0;
  const cislo = Number(zadany);
  return Number.isFinite(cislo) && zadany.trim() !== '' ? cislo >>> 0 : seedZTextu(zadany);
}

export function pripoj(canvas: HTMLCanvasElement): () => void {
  const parametry = new URLSearchParams(window.location.search);
  const zadanyLevel = Number(parametry.get('level'));
  const level =
    Number.isFinite(zadanyLevel) && zadanyLevel >= 1
      ? Math.min(POSLEDNI_LEVEL, Math.floor(zadanyLevel))
      : 1;

  return spustHru(canvas, {
    seed: seedZAdresy(parametry),
    level,
    debug: parametry.get('debug') === '1',
  });
}
