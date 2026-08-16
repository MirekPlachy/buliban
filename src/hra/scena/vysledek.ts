/**
 * Výsledek levelu a konec hry.
 *
 * Signature prvek — **„linka rovnosti"**: jedna svítící vodorovná linka ve
 * výši cíle a u každého panáku odchylka nad/pod ní. Vysvětlí skóre beze slov.
 *
 * Od chvíle, kdy se rovnoměrnost měří proti cíli a ne proti průměru, leží
 * linka přesně tam, kde v prvních dvou levelech svítí orientační ryska.
 * Jedna a tatáž linka tedy po celou hru znamená „tolik měl mít každý" —
 * napřed jako nápověda, potom jako vysvětlení.
 */

import * as texty from '../texty.ts';
import type { StavRozlevani } from '../jadro/rozlevani.ts';
import type { Vysledek } from '../jadro/skore.ts';
import { pruhledne } from './barvy.ts';
import type { Paleta } from './barvy.ts';
import type { Platno } from './platno.ts';
import { CISLA, text } from './pismo.ts';
import { stred } from './rozvrh.ts';
import type { Rozvrh } from './rozvrh.ts';
import { kresliPanaky, podilCile } from './stul.ts';

function polozka(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  y: number,
  popis: string,
  hodnota: string,
  barva: string,
): void {
  const sirka = Math.min(r.sirka - 56, 380);
  const x = (r.sirka - sirka) / 2;
  text(platno.ctx, popis, x, y, { velikost: 14, barva: pruhledne(paleta.par, 0.7) });
  text(platno.ctx, hodnota, x + sirka, y, {
    velikost: 14,
    barva,
    zarovnani: 'right',
    pismo: CISLA,
  });
}

export function kresliVysledek(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavRozlevani,
  v: Vysledek,
): void {
  const { ctx } = platno;

  ctx.fillStyle = pruhledne(paleta.sklo, 0.8);
  ctx.fillRect(0, 0, r.sirka, r.vyska);

  // Odnesené panáky se ve výsledku vrátí — hráč má vidět, co vlastně nalil.
  kresliPanaky(platno, r, paleta, stav, true);

  const cilY = r.stulY - podilCile(stav) * r.panakVyska;
  ctx.strokeStyle = paleta.zazeh;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = paleta.zazeh;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(0, cilY);
  ctx.lineTo(r.sirka, cilY);
  ctx.stroke();
  ctx.shadowBlur = 0;

  text(ctx, texty.vysledek.linka, 14, cilY - 9, {
    velikost: 11,
    barva: pruhledne(paleta.zazeh, 0.85),
  });

  v.odchylkyMl.forEach((odchylka, i) => {
    const presne = Math.abs(odchylka) < 0.5;
    text(
      ctx,
      `${odchylka >= 0 ? '+' : '−'}${Math.abs(odchylka).toFixed(1)}`,
      stred(r, i),
      odchylka >= 0 ? cilY - 22 : cilY + 26,
      {
        velikost: Math.min(13, r.rozestup / 4.2),
        barva: presne ? paleta.zazeh : paleta.zhava,
        zarovnani: 'center',
        pismo: CISLA,
      },
    );
  });

  let y = Math.max(64, r.vyska * 0.12);
  const nazev = v.medaile ? texty.medaile[v.medaile] : texty.bezMedaile;
  text(ctx, nazev, r.sirka / 2, y, {
    velikost: 26,
    barva: v.medaile ? paleta.rumSvetlo : pruhledne(paleta.par, 0.7),
    zarovnani: 'center',
    tucne: true,
  });

  y += 34;
  polozka(platno, r, paleta, y, texty.vysledek.rovnomernost, `${v.rovnomernost}`, paleta.par);
  y += 21;
  if (v.casovyBonus > 0) {
    polozka(platno, r, paleta, y, texty.vysledek.cas, `+${v.casovyBonus}`, paleta.par);
    y += 21;
  }
  if (v.pokutaPreliti > 0) {
    polozka(platno, r, paleta, y, texty.vysledek.preliti, `−${v.pokutaPreliti}`, paleta.zhava);
    y += 21;
  }
  if (v.pokutaRozlito > 0) {
    polozka(platno, r, paleta, y, texty.vysledek.rozlito, `−${v.pokutaRozlito}`, paleta.zhava);
    y += 21;
  }
  if (v.pokutaZbytek > 0) {
    polozka(
      platno,
      r,
      paleta,
      y,
      `${texty.vysledek.zbytek} (${v.zbytekMl.toFixed(0)} ml)`,
      `−${v.pokutaZbytek}`,
      paleta.zhava,
    );
    y += 21;
  }
  if (v.presnaRuka) {
    polozka(platno, r, paleta, y, texty.vysledek.presnaRuka, '+500 · ×1,2', paleta.zazeh);
    y += 21;
  }

  y += 6;
  polozka(platno, r, paleta, y, texty.vysledek.celkem, `${v.celkem}`, paleta.rumSvetlo);

  text(ctx, texty.vysledek.dal, r.sirka / 2, r.vyska - 18, {
    velikost: 14,
    barva: pruhledne(paleta.par, 0.55),
    zarovnani: 'center',
  });
}

export function kresliKonec(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  skore: number,
  medaile: string[],
): void {
  const { ctx } = platno;
  ctx.fillStyle = paleta.sklo;
  ctx.fillRect(0, 0, r.sirka, r.vyska);

  let y = Math.max(90, r.vyska / 2 - 110);
  text(ctx, texty.konec.nadpis, r.sirka / 2, y, {
    velikost: 30,
    barva: paleta.par,
    zarovnani: 'center',
    tucne: true,
  });

  y += 52;
  text(ctx, texty.titul(skore), r.sirka / 2, y, {
    velikost: 24,
    barva: paleta.rumSvetlo,
    zarovnani: 'center',
  });

  y += 40;
  text(ctx, `${skore} bodů`, r.sirka / 2, y, {
    velikost: 18,
    barva: pruhledne(paleta.par, 0.8),
    zarovnani: 'center',
    pismo: CISLA,
  });

  y += 34;
  text(ctx, medaile.join('  '), r.sirka / 2, y, {
    velikost: 15,
    barva: pruhledne(paleta.par, 0.6),
    zarovnani: 'center',
    pismo: CISLA,
  });

  text(ctx, texty.konec.znovu, r.sirka / 2, r.vyska - 40, {
    velikost: 15,
    barva: pruhledne(paleta.par, 0.6),
    zarovnani: 'center',
  });
}
