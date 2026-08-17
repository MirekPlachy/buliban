/**
 * Vykreslení fáze 3 — zahřátí a vypuštění Bulibana.
 *
 * Do téhož rámu jako obě předchozí fáze. Láhev je tatáž kresba, jen prázdná
 * a podle volby buď nastojato, nebo na boku.
 *
 * **Modrá je vyhrazená zážehu** (kap. 7.1). Teploměr, pásmo i dlaždice proto
 * kreslí jantarová a pár odstínů páry; modrá se v celé hře objeví jen tady
 * a jen v tu jednu vteřinu, a proto má váhu.
 *
 * Rozvržení dlaždic je **exportované**, protože jím hra trefuje kliknutí.
 * Kdyby si scéna kreslila jinam, než kam se dá kliknout, byla by to ta
 * nejhůř dohledatelná chyba v celé hře.
 */

import { TEPLOTA_MAX, ZAZEH_POKUSU } from '../ladeni.ts';
import { poziceSkrtnuti, volbyRitualu } from '../jadro/ritual.ts';
import type { StavRitualu } from '../jadro/ritual.ts';
import type { StavRozlevani } from '../jadro/rozlevani.ts';
import * as texty from '../texty.ts';
import { pruhledne } from './barvy.ts';
import type { Paleta } from './barvy.ts';
import { kresliLahev } from './nadoby.ts';
import type { Platno } from './platno.ts';
import { odstavec, text } from './pismo.ts';
import { kresliPanel, stitek, zaobleny } from './prvky.ts';
import { vlozLahev } from './rozvrh.ts';
import type { PolohaLahve, Rozvrh } from './rozvrh.ts';

/** Svislé rozdělení plochy: láhev, teploměr, dlaždice. */
const TEPLOMER_Y = 0.56;
const DLAZDICE_OD = 0.66;
const DLAZDICE_DO = 0.98;

/** Volný pruh nad lahví a mezi lahví a štítkem teploměru, v návrhových px. */
const OKRAJ_LAHVE = 16;
const NAD_TEPLOMEREM = 26;

const TEPLOMER_VYSKA = 18;
const SLOUPCU = 2;

export interface Dlazdice {
  x: number;
  y: number;
  sirka: number;
  vyska: number;
}

/**
 * Mřížka dlaždic. Dva sloupce, protože dlaždice nese název i podrobnost —
 * ve čtyřech sloupcích se text na telefonu zalomí na tři řádky.
 */
export function rozvrhDlazdic(r: Rozvrh, pocet: number): Dlazdice[] {
  if (pocet <= 0) return [];
  const radku = Math.ceil(pocet / SLOUPCU);
  const sirkaCelkem = r.sloupec;
  const x0 = (r.sirka - sirkaCelkem) / 2;
  const y0 = r.plochaY + r.plochaVyska * DLAZDICE_OD;
  const vyskaCelkem = r.plochaVyska * (DLAZDICE_DO - DLAZDICE_OD);

  const mezera = 8 * r.ui;
  const sirka = (sirkaCelkem - mezera * (SLOUPCU - 1)) / SLOUPCU;
  const vyska = (vyskaCelkem - mezera * (radku - 1)) / radku;

  return Array.from({ length: pocet }, (_, i) => ({
    x: x0 + (i % SLOUPCU) * (sirka + mezera),
    y: y0 + Math.floor(i / SLOUPCU) * (vyska + mezera),
    sirka,
    vyska,
  }));
}

/** Která dlaždice je pod bodem? `-1`, když žádná. */
export function dlazdicePod(r: Rozvrh, pocet: number, x: number, y: number): number {
  return rozvrhDlazdic(r, pocet).findIndex(
    (d) => x >= d.x && x <= d.x + d.sirka && y >= d.y && y <= d.y + d.vyska,
  );
}

/**
 * Pás plochy, ve kterém stojí láhev: od horní hrany po štítek teploměru.
 * Exportované, protože se to testuje — láhev z něj nesmí vylézt na žádné
 * obrazovce ani na žádném levelu.
 */
export function lahevRitualu(r: Rozvrh): ReturnType<typeof vlozLahev> {
  return vlozLahev(
    r,
    r.plochaY + OKRAJ_LAHVE * r.ui,
    r.plochaY + r.plochaVyska * TEPLOMER_Y - NAD_TEPLOMEREM * r.ui,
  );
}

/**
 * Kam posadit láhev. Nastojato stojí na dně, naležato míří hrdlem doprava.
 *
 * Otáčí se kolem dna, stejně jako při rozlévání — jen tady je úhel daný
 * volbou hráče, ne náklonem k panáku. Obě polohy se centrují na týž bod,
 * takže se láhev při volbě jen otočí a nepodskočí.
 */
function polohaProRitual(
  vsazena: ReturnType<typeof vlozLahev>,
  stav: StavRitualu,
): PolohaLahve {
  const { cx, cy } = vsazena;
  const H = vsazena.rozvrh.lahevVyska;

  if (stav.poloha === 'horizontalni') {
    return { x: cx - H / 2, y: cy, uhel: Math.PI / 2 };
  }
  return { x: cx, y: cy + H / 2, uhel: 0 };
}

/** Teploměr 0–100 stylizovaných jednotek s vyznačeným cílovým pásmem. */
function kresliTeplomer(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavRitualu,
): void {
  const { ctx } = platno;
  const sirka = r.sloupec;
  const x = (r.sirka - sirka) / 2;
  const y = r.plochaY + r.plochaVyska * TEPLOMER_Y;
  const v = TEPLOMER_VYSKA * r.ui;

  stitek(ctx, texty.hud.teplota, x, y - 15 * r.ui, r, pruhledne(paleta.par, 0.45));

  zaobleny(ctx, x, y, sirka, v, v / 2);
  ctx.fillStyle = pruhledne(paleta.skloStin, 0.9);
  ctx.fill();
  ctx.strokeStyle = pruhledne(paleta.par, 0.14);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Cílové pásmo. Jantarové, ne modré — modrá patří až plameni.
  const odX = x + ((stav.pasmo.stred - stav.pasmo.sirka / 2) / TEPLOTA_MAX) * sirka;
  const sirkaPasma = (stav.pasmo.sirka / TEPLOTA_MAX) * sirka;
  ctx.fillStyle = pruhledne(paleta.rum, 0.5);
  ctx.fillRect(odX, y, sirkaPasma, v);

  // Náplň po aktuální teplotu. Zežhne, jakmile hrozí prasknutí.
  const podil = Math.min(1, stav.teplota / TEPLOTA_MAX);
  const horko = stav.teplota > stav.pasmo.stred + stav.pasmo.sirka / 2;
  ctx.save();
  zaobleny(ctx, x, y, sirka, v, v / 2);
  ctx.clip();
  ctx.fillStyle = pruhledne(horko ? paleta.zhava : paleta.rumSvetlo, 0.85);
  ctx.fillRect(x, y, podil * sirka, v);
  ctx.restore();

  // Ručička na hraně náplně — bez ní se u okraje pásma nepozná, kde přesně je.
  ctx.fillStyle = paleta.par;
  ctx.fillRect(x + podil * sirka - 1 * r.ui, y - 4 * r.ui, 2 * r.ui, v + 8 * r.ui);
}

/** Lišta škrtání zápalkou. Tentýž prvek jako korek, jen svižnější a menší. */
function kresliSkrtani(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavRitualu,
): void {
  const { ctx } = platno;
  const sirka = r.sloupec * 0.7;
  const x = (r.sirka - sirka) / 2;
  const y = r.plochaY + r.plochaVyska * DLAZDICE_OD;
  const v = 14 * r.ui;

  zaobleny(ctx, x, y, sirka, v, v / 2);
  ctx.fillStyle = pruhledne(paleta.skloStin, 0.9);
  ctx.fill();
  ctx.strokeStyle = pruhledne(paleta.par, 0.14);
  ctx.lineWidth = 1;
  ctx.stroke();

  const pasmo = 0.3 * sirka;
  ctx.fillStyle = pruhledne(paleta.rum, 0.45);
  ctx.fillRect(x + sirka / 2 - pasmo / 2, y, pasmo, v);

  ctx.fillStyle = paleta.rumSvetlo;
  ctx.fillRect(x + poziceSkrtnuti(stav) * sirka - 1.5 * r.ui, y - 4 * r.ui, 3 * r.ui, v + 8 * r.ui);
}

/**
 * Plamen u hrdla. `sila` řídí výšku a barvu — od nesmělého modrého
 * po dlouhý modrožlutý, přesně jak to popisuje kap. 5.3.
 */
function kresliPlamen(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  x: number,
  y: number,
  smer: number,
  sila: number,
  casS: number,
): void {
  const { ctx } = platno;
  // Jemné chvění, ať plamen nestojí. Dvě nesouměřitelné frekvence, aby se
  // vzor neopakoval každou vteřinu.
  const chveni = 1 + 0.06 * Math.sin(casS * 17) + 0.04 * Math.sin(casS * 7.3);
  const delka = r.lahevPolomer * (1.1 + 2.6 * sila) * chveni;
  const sirka = r.lahevPolomer * (0.5 + 0.35 * sila);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(smer);

  const prechod = ctx.createLinearGradient(0, 0, 0, -delka);
  prechod.addColorStop(0, pruhledne(paleta.zazeh, 0.95));
  prechod.addColorStop(0.55, pruhledne(paleta.zazeh, 0.6));
  // Špička žloutne až u silného zážehu — slabý plamen zůstane celý modrý.
  prechod.addColorStop(1, pruhledne(sila > 0.6 ? paleta.rumSvetlo : paleta.zazeh, 0));

  ctx.beginPath();
  ctx.moveTo(-sirka / 2, 0);
  ctx.quadraticCurveTo(-sirka / 2, -delka * 0.6, 0, -delka);
  ctx.quadraticCurveTo(sirka / 2, -delka * 0.6, sirka / 2, 0);
  ctx.closePath();
  ctx.fillStyle = prechod;
  ctx.shadowColor = paleta.zazeh;
  ctx.shadowBlur = 18 * (0.4 + sila);
  ctx.fill();
  ctx.restore();
}

function kresliDlazdice(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavRitualu,
): void {
  const { ctx } = platno;
  const volby = volbyRitualu(stav);
  const mrizka = rozvrhDlazdic(r, volby.length);

  volby.forEach((volba, i) => {
    const d = mrizka[i];
    const popis = texty.popisVolby(volba);
    // Vybraná metoda zůstává zvýrazněná — hráč musí vidět, čím zrovna hřeje,
    // i když zrovna nedrží.
    const vybrana = volba.druh === 'metoda' && volba.metoda === stav.metodaId;

    kresliPanel(ctx, paleta, r, d.x, d.y, d.sirka, d.vyska, {
      kryti: vybrana ? 0.98 : 0.86,
      obrys: pruhledne(vybrana ? paleta.rumSvetlo : paleta.par, vybrana ? 0.7 : 0.16),
    });

    text(ctx, popis.nazev, d.x + 12 * r.ui, d.y + d.vyska * 0.36, {
      velikost: Math.min(14 * r.ui, d.vyska * 0.34),
      barva: vybrana ? paleta.rumSvetlo : pruhledne(paleta.par, 0.9),
      svisle: 'middle',
    });
    text(ctx, popis.detail, d.x + 12 * r.ui, d.y + d.vyska * 0.72, {
      velikost: Math.min(11 * r.ui, d.vyska * 0.26),
      barva: pruhledne(paleta.par, 0.5),
      svisle: 'middle',
    });
  });
}

/**
 * Hláška po zážehu, tichu nebo prasknutí.
 *
 * Sedí **v pásu dlaždic**, ne na teploměru: teploměr je v tu chvíli pořád
 * vidět a hráč z něj čte, jak moc minul. Napsat hlášku přes něj by schovalo
 * přesně to, co ji vysvětluje. Dlaždice tam v těchhle fázích žádné nejsou.
 */
function kresliHlasku(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavRitualu,
): void {
  const obsah =
    stav.faze === 'zazeh'
      ? texty.zazeh.uspech
      : stav.faze === 'prasklo'
        ? texty.zazeh.prasklo
        : stav.pokus >= ZAZEH_POKUSU
          ? texty.zazeh.konecPokusu
          : texty.zazeh.ticho;

  const barva =
    stav.faze === 'zazeh' ? paleta.zazeh : stav.faze === 'prasklo' ? paleta.zhava : paleta.par;

  odstavec(
    platno.ctx,
    obsah,
    r.sirka / 2,
    r.plochaY + r.plochaVyska * DLAZDICE_OD,
    r.sloupec,
    {
      velikost: 21 * r.ui,
      barva,
      zarovnani: 'center',
      pismo: 'nadpis',
      tucne: true,
    },
    1.3,
  );
}

export function kresliRitual(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  rozlevani: StavRozlevani,
  stav: StavRitualu,
): void {
  // Láhev se vsadí nad teploměr a zmenší, aby se tam vešla. Bez toho jí na
  // notebooku vylezlo ústí za horní lištu — a s ním i plamen.
  const vsazena = lahevRitualu(r);
  const rl = vsazena.rozvrh;
  const poloha = polohaProRitual(vsazena, stav);
  kresliLahev(platno, rl, paleta, rozlevani, poloha);

  // Ústí: u stojící láhve nahoře, u ležící vpravo. Plamen i směr z toho plyne.
  const H = rl.lahevVyska;
  const ustiX = poloha.x + H * Math.sin(poloha.uhel);
  const ustiY = poloha.y - H * Math.cos(poloha.uhel);

  const horiPlamen = stav.faze === 'ceka' || stav.faze === 'kresa';
  if (horiPlamen) {
    kresliPlamen(platno, rl, paleta, ustiX, ustiY, poloha.uhel, 0.18, stav.casS);
  }
  if (stav.faze === 'zazeh') {
    // Zážeh vychází Z láhve, ne z ruky — proto stejný bod, ale mnohem větší
    // plamen řízený kvalitou zásahu.
    kresliPlamen(platno, rl, paleta, ustiX, ustiY, poloha.uhel, stav.kvalita, stav.casS);
  }

  if (stav.faze !== 'poloha') kresliTeplomer(platno, r, paleta, stav);

  if (stav.faze === 'skrtani') kresliSkrtani(platno, r, paleta, stav);
  else kresliDlazdice(platno, r, paleta, stav);

  if (stav.faze === 'zazeh' || stav.faze === 'ticho' || stav.faze === 'prasklo') {
    kresliHlasku(platno, r, paleta, stav);
  }
}

/** Štítek pokusu do horní lišty. Tři pokusy na level a hráč to musí vidět. */
export function popisPokusu(stav: StavRitualu): string {
  return `${Math.min(stav.pokus, ZAZEH_POKUSU)} / ${ZAZEH_POKUSU}`;
}
