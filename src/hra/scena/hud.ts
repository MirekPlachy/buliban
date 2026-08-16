/**
 * Horní lišta, nápovědy a vysvětlující karty.
 *
 * Karta před levelem vysvětluje **jen to, co je nové**. Kdyby opakovala
 * všechna pravidla pokaždé, naučila by hráče kartu přeskakovat — a pak by
 * přehlédl i to jedno, na čem záleží.
 */

import { napovedaPosledni, napovedy, ukazka as textyUkazky } from '../texty.ts';
import type { Karta } from '../texty.ts';
import type { StavRozlevani } from '../jadro/rozlevani.ts';
import { pruhledne } from './barvy.ts';
import type { Paleta } from './barvy.ts';
import type { Platno } from './platno.ts';
import { CISLA, odstavec, text } from './pismo.ts';
import type { Rozvrh } from './rozvrh.ts';

export function kresliListu(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavRozlevani,
  skore: number,
): void {
  const { ctx } = platno;
  const { konfig } = stav;
  const hotovo = stav.faze === 'hotovo' || stav.faze === 'dozniva';

  text(ctx, `Level ${konfig.level.cislo}`, 20, 30, { velikost: 15, barva: paleta.par });
  text(
    ctx,
    hotovo ? 'rozlito' : `panák ${stav.aktivni + 1} / ${konfig.panaku}`,
    r.sirka / 2,
    30,
    { velikost: 15, barva: pruhledne(paleta.par, 0.75), zarovnani: 'center', pismo: CISLA },
  );
  text(ctx, `${skore}`, r.sirka - 20, 30, {
    velikost: 15,
    barva: paleta.rumSvetlo,
    zarovnani: 'right',
    pismo: CISLA,
  });
}

export function kresliNapovedu(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavRozlevani,
): void {
  if (stav.faze === 'hotovo') return;
  const posledni = stav.aktivni === stav.konfig.panaku - 1;
  const obsah = posledni && stav.faze === 'ceka' ? napovedaPosledni : napovedy[stav.faze];
  if (!obsah) return;

  text(platno.ctx, obsah, r.sirka / 2, r.vyska - 18, {
    velikost: 14,
    barva: pruhledne(paleta.par, 0.6),
    zarovnani: 'center',
  });
}

/** Komentář běžící pod ukázkou. Drží se dole, ať nezakrývá scénu. */
export function kresliKomentarUkazky(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  obsah: string,
): void {
  const { ctx } = platno;
  const sirka = Math.min(r.sirka - 40, 560);
  const napis = { velikost: 15, barva: paleta.par, zarovnani: 'center' as const };
  const vyska = 62;

  ctx.fillStyle = pruhledne(paleta.skloStin, 0.92);
  ctx.fillRect((r.sirka - sirka) / 2, r.vyska - vyska - 14, sirka, vyska);
  ctx.strokeStyle = pruhledne(paleta.zazeh, 0.3);
  ctx.lineWidth = 1;
  ctx.strokeRect((r.sirka - sirka) / 2, r.vyska - vyska - 14, sirka, vyska);

  text(ctx, textyUkazky.znacka.toUpperCase(), r.sirka / 2, r.vyska - vyska + 4, {
    velikost: 10,
    barva: pruhledne(paleta.zazeh, 0.8),
    zarovnani: 'center',
  });
  odstavec(ctx, obsah, r.sirka / 2, r.vyska - vyska + 26, sirka - 32, napis, 1.35);
}

/**
 * Karta s výkladem před levelem. Přes celou scénu, protože je to jediná
 * chvíle, kdy má hráč číst a ne mířit.
 */
export function kresliKartu(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  karta: Karta,
  patka: string,
): void {
  const { ctx } = platno;
  const sirka = Math.min(r.sirka - 48, 520);
  const x = (r.sirka - sirka) / 2;

  ctx.fillStyle = pruhledne(paleta.sklo, 0.92);
  ctx.fillRect(0, 0, r.sirka, r.vyska);

  let y = Math.max(110, r.vyska / 2 - 120);
  text(ctx, karta.nadpis, r.sirka / 2, y, {
    velikost: 28,
    barva: paleta.rumSvetlo,
    zarovnani: 'center',
    tucne: true,
  });
  y += 40;

  for (const radek of karta.radky) {
    y = odstavec(ctx, radek, x, y, sirka, {
      velikost: 16,
      barva: pruhledne(paleta.par, 0.88),
    });
    y += 14;
  }

  text(ctx, patka, r.sirka / 2, r.vyska - 40, {
    velikost: 14,
    barva: pruhledne(paleta.par, 0.55),
    zarovnani: 'center',
  });
}
