/**
 * Vykreslení fáze 1 — otevření láhve.
 *
 * Kreslí do **téhož rámu** jako rozlévání: horní lišta, herní plocha, spodní
 * pás. Láhev je tatáž a na témže místě, jen stojí rovně a má navrch pečeť
 * a korek. Kdyby se fáze lišila i scénou, vypadala by jako jiná hra.
 *
 * Timing lišta sedí dole v ploše, kde jinak stojí panáky — tedy tam, kam se
 * hráč stejně dívá.
 */

import { pozice } from '../jadro/otevirani.ts';
import type { StavOtevirani } from '../jadro/otevirani.ts';
import type { StavRozlevani } from '../jadro/rozlevani.ts';
import { PERFEKTNI_PODIL } from '../ladeni.ts';
import { pruhledne } from './barvy.ts';
import type { Paleta } from './barvy.ts';
import { kresliLahev } from './nadoby.ts';
import type { Platno } from './platno.ts';
import { text } from './pismo.ts';
import { zaobleny } from './prvky.ts';
import { ustiHrdla, vlozLahev } from './rozvrh.ts';
import type { PolohaLahve, Rozvrh } from './rozvrh.ts';

/** Kde leží timing lišta. Podíl výšky plochy od jejího horního okraje. */
const LISTA_Y = 0.82;
const LISTA_VYSKA = 16;

/** Volný pruh nad lahví a mezi lahví a lištou, v návrhových pixelech. */
const OKRAJ_LAHVE = 16;
const NAD_LISTOU = 40;

/**
 * Pás plochy, ve kterém stojí láhev: od horní hrany po timing lištu.
 *
 * Bez tohohle sedí láhev tam, kde při rozlévání — tedy nad řadou panáků,
 * která tu ale žádná není. Nechávala pod sebou pruh prázdna a na velké
 * obrazovce sahala až k liště.
 */
export function lahevOtevirani(r: Rozvrh): ReturnType<typeof vlozLahev> {
  return vlozLahev(
    r,
    r.plochaY + OKRAJ_LAHVE * r.ui,
    r.plochaY + r.plochaVyska * LISTA_Y - NAD_LISTOU * r.ui,
  );
}

/**
 * Pečeť kolem hrdla. Ubývá zdola nahoru, jak ji hráč sedírá — tedy tak, jak
 * se staniol strhává rukou, ne jako mizející průhlednost.
 */
function kresliPecet(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavOtevirani,
  hrdloX: number,
  hrdloY: number,
  polomer: number,
): void {
  if (stav.pecetPodil >= 1) return;
  const { ctx } = platno;
  const vyska = r.lahevVyska * 0.13;
  const zbyva = 1 - stav.pecetPodil;

  ctx.save();
  zaobleny(
    ctx,
    hrdloX - polomer * 1.18,
    hrdloY,
    polomer * 2.36,
    vyska * zbyva,
    polomer * 0.35,
  );
  ctx.fillStyle = pruhledne(paleta.rumSvetlo, 0.75);
  ctx.fill();
  ctx.strokeStyle = pruhledne(paleta.par, 0.35);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** Korek vyjíždí z hrdla. Při jedničce je venku celý. */
function kresliKorek(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavOtevirani,
  hrdloX: number,
  hrdloY: number,
  polomer: number,
): void {
  const { ctx } = platno;
  const delka = r.lahevVyska * 0.11;
  // Zasunutý korek kouká jen kouskem; vytažený stojí celý nad hrdlem.
  const vyjeto = stav.korekPodil * delka * 1.4;
  const y = hrdloY - vyjeto;

  ctx.save();
  zaobleny(ctx, hrdloX - polomer * 0.86, y - delka * 0.5, polomer * 1.72, delka, polomer * 0.3);
  ctx.fillStyle = pruhledne(paleta.rum, 0.92);
  ctx.fill();
  ctx.strokeStyle = pruhledne(paleta.par, 0.4);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/**
 * Timing lišta: zelené pásmo, perfektní jádro uvnitř a kmitající ukazatel.
 *
 * Pásmo je vždycky uprostřed lišty — jeho poloha není součást úlohy, jen
 * šířka. Kdyby se stěhovalo, měřila by hra postřeh, ne rytmus.
 */
function kresliListu(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavOtevirani,
): void {
  const { ctx } = platno;
  const sirka = r.sloupec;
  const x = (r.sirka - sirka) / 2;
  const y = r.plochaY + r.plochaVyska * LISTA_Y;
  const v = LISTA_VYSKA * r.ui;

  zaobleny(ctx, x, y, sirka, v, v / 2);
  ctx.fillStyle = pruhledne(paleta.skloStin, 0.9);
  ctx.fill();
  ctx.strokeStyle = pruhledne(paleta.par, 0.14);
  ctx.lineWidth = 1;
  ctx.stroke();

  const zelenaSirka = stav.sirkaPasma * sirka;
  ctx.fillStyle = pruhledne(paleta.rum, 0.45);
  ctx.fillRect(x + sirka / 2 - zelenaSirka / 2, y, zelenaSirka, v);

  const jadro = zelenaSirka * PERFEKTNI_PODIL;
  ctx.fillStyle = pruhledne(paleta.zazeh, 0.55);
  ctx.fillRect(x + sirka / 2 - jadro / 2, y, jadro, v);

  // Ukazatel. Během záseku zůstává, ale zšedne — hráč má vidět, že mačkat
  // teď nemá cenu, a přitom neztratit rytmus.
  const zaseknuto = stav.faze === 'zasek';
  const ux = x + pozice(stav) * sirka;
  ctx.fillStyle = zaseknuto ? pruhledne(paleta.par, 0.3) : paleta.rumSvetlo;
  ctx.fillRect(ux - 1.5 * r.ui, y - 4 * r.ui, 3 * r.ui, v + 8 * r.ui);
}

/** Odezva na poslední zásah. Krátká, u lišty, ať je vidět příčina i následek. */
function kresliOdezvu(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavOtevirani,
): void {
  if (!stav.posledni || stav.posledniPredS > 0.7) return;
  const obsah =
    stav.posledni === 'perfektni'
      ? 'Přesně!'
      : stav.posledni === 'zeleny'
        ? 'Dobrý'
        : 'Vedle';
  const barva =
    stav.posledni === 'perfektni'
      ? paleta.zazeh
      : stav.posledni === 'zeleny'
        ? paleta.rumSvetlo
        : paleta.zhava;

  text(
    platno.ctx,
    obsah,
    r.sirka / 2,
    r.plochaY + r.plochaVyska * LISTA_Y - 22 * r.ui,
    {
      velikost: 15 * r.ui,
      barva: pruhledne(barva, Math.max(0, 1 - stav.posledniPredS / 0.7)),
      zarovnani: 'center',
      svisle: 'middle',
      pismo: 'nadpis',
      tucne: true,
    },
  );
}

export function kresliOtevirani(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  rozlevani: StavRozlevani,
  stav: StavOtevirani,
): void {
  // Láhev stojí rovně uprostřed — stejná kresba jako při rozlévání, jen bez
  // náklonu a vsazená nad lištu. Rum v ní už je, protože rozlévat se bude z ní.
  const vsazena = lahevOtevirani(r);
  const rl = vsazena.rozvrh;
  const poloha: PolohaLahve = {
    x: vsazena.cx,
    y: vsazena.cy + rl.lahevVyska / 2,
    uhel: 0,
  };
  kresliLahev(platno, rl, paleta, rozlevani, poloha);

  const usti = ustiHrdla(rl, rozlevani.konfig.lahev, poloha);
  const polomerHrdla = rozlevani.konfig.lahev.ustiPolomer * rl.lahevPolomer;

  kresliKorek(platno, rl, paleta, stav, usti.x, usti.y, polomerHrdla);
  kresliPecet(platno, rl, paleta, stav, usti.x, usti.y, polomerHrdla);

  if (stav.faze === 'korek' || stav.faze === 'zasek') {
    kresliListu(platno, r, paleta, stav);
    kresliOdezvu(platno, r, paleta, stav);
  }
}
