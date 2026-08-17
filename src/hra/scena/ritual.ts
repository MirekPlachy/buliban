/**
 * Vykreslení fáze 3 — zahřátí třením a vypuštění Bulibana.
 *
 * Do téhož rámu jako rozlévání. Láhev je tatáž kresba, jen prázdná a stojící.
 *
 * **Hrdlo musí být vidět a musí nad ním být místo.** V první verzi seděla
 * láhev v rozměrech spočítaných pro rozlévání, takže jí ústí vylezlo za horní
 * lištu — a s ním plamen, tedy pointa celé hry. Proto se láhev vsazuje do
 * pásu, který nad hrdlem nechává rezervu na plamen (`PROSTOR_PLAMENE`).
 *
 * **Modrá je vyhrazená zážehu** (kap. 7.1). Teploměr i zápalka kreslí
 * jantarovou; modrá se objeví jen v tu jednu vteřinu, a proto má váhu.
 *
 * Geometrie je **exportovaná**, protože jí hra trefuje prst: tření platí jen
 * po skle a zážeh jen u hrdla. Kdyby se kreslilo jinam, než kam se dá sáhnout,
 * byla by to ta nejhůř dohledatelná chyba v celé hře.
 */

import { TEPLOTA_MAX, ZAPALKA_HORI_S, ZAZEH_POKUSU } from '../ladeni.ts';
import { kvalitaZasahu, vPasmu } from '../jadro/ritual.ts';
import type { StavRitualu } from '../jadro/ritual.ts';
import type { StavRozlevani } from '../jadro/rozlevani.ts';
import * as texty from '../texty.ts';
import { pruhledne } from './barvy.ts';
import type { Paleta } from './barvy.ts';
import { kresliLahev } from './nadoby.ts';
import type { Platno } from './platno.ts';
import { odstavec } from './pismo.ts';
import { stitek, zaobleny } from './prvky.ts';
import { vlozLahev } from './rozvrh.ts';
import type { Bod, PolohaLahve, Rozvrh } from './rozvrh.ts';

/** Kde končí pás láhve a začíná teploměr. Podíl výšky plochy. */
const TEPLOMER_Y = 0.86;
const TEPLOMER_VYSKA = 18;

/** Rezerva nad hrdlem na plamen, v násobcích poloměru láhve. */
const PROSTOR_PLAMENE = 4.6;

/** Volný pruh nad plamenem a mezi lahví a teploměrem, v návrhových px. */
const OKRAJ = 14;
const NAD_TEPLOMEREM = 30;

/** Jak daleko od osy láhve leží zápalka, v násobcích poloměru láhve. */
const ZAPALKA_ODSTUP = 3.2;

/** Dosah hrdla — jak blízko musí být zápalka, aby to chytlo. V poloměrech. */
const DOSAH_HRDLA = 1.9;

export interface GeometrieRitualu {
  /** Rozvrh se zmenšenou lahví, ve kterém se kreslí. */
  rozvrh: Rozvrh;
  poloha: PolohaLahve;
  /** Ústí láhve — sem se přikládá zápalka a odsud šlehne plamen. */
  usti: Bod;
  /** Kde zápalka leží, dokud ji hráč nevezme. */
  zapalkaDoma: Bod;
  polomer: number;
  vyska: number;
}

/**
 * Rozvržení scény rituálu.
 *
 * Láhev stojí ve spodní části pásu, aby nad hrdlem zbylo na plamen. Bez té
 * rezervy je ústí buď za horní lištou, nebo se plamen kreslí mimo plochu.
 */
export function geometrieRitualu(r: Rozvrh): GeometrieRitualu {
  const horni = r.plochaY + OKRAJ * r.ui;
  const dolni = r.plochaY + r.plochaVyska * TEPLOMER_Y - NAD_TEPLOMEREM * r.ui;

  // Prostor na plamen je v poloměrech láhve a zmenšuje se spolu s ní —
  // řeší ho `vlozLahev` v jedné rovnici. Násobek 1,15 kryje kmitání plamene:
  // ve špičce je o kus delší než `PROSTOR_PLAMENE` (viz `kresliPlamen`).
  const vsazena = vlozLahev(r, horni, dolni, PROSTOR_PLAMENE * 1.15);

  const rl = vsazena.rozvrh;
  const H = rl.lahevVyska;
  // Dno na spodní hraně pásu; ústí tedy leží o výšku láhve výš a nad ním
  // zbývá celá rezerva na plamen.
  const dno = dolni;
  const poloha: PolohaLahve = { x: r.sirka / 2, y: dno, uhel: 0 };

  return {
    rozvrh: rl,
    poloha,
    usti: { x: poloha.x, y: dno - H },
    // Zápalka leží vedle láhve, ve výšce hrdla — odtud se bere a k hrdlu
    // přikládá, což je nejkratší a nejčitelnější cesta.
    zapalkaDoma: { x: poloha.x + ZAPALKA_ODSTUP * rl.lahevPolomer, y: dno - H * 0.72 },
    polomer: rl.lahevPolomer,
    vyska: H,
  };
}

/**
 * Je bod na skle láhve? Jen tam se třením hřeje.
 *
 * Schválně velkorysý obdélník, ne přesný obrys: trefovat na telefonu prstem
 * zužující se hrdlo by bylo mučení, a hra tu neměří mířidlo, ale pohyb.
 */
export function naLahvi(g: GeometrieRitualu, x: number, y: number): boolean {
  const dno = g.poloha.y;
  if (y > dno || y < dno - g.vyska) return false;
  return Math.abs(x - g.poloha.x) <= g.polomer * 1.6;
}

/** Je bod na odložené zápalce? */
export function naZapalce(g: GeometrieRitualu, x: number, y: number): boolean {
  const d = g.polomer * 2.2;
  return Math.abs(x - g.zapalkaDoma.x) <= d && Math.abs(y - g.zapalkaDoma.y) <= d;
}

/** Je zápalka dost blízko hrdla, aby to chytlo? */
export function uHrdla(g: GeometrieRitualu, x: number, y: number): boolean {
  return Math.hypot(x - g.usti.x, y - g.usti.y) <= g.polomer * DOSAH_HRDLA;
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

  const odX = x + ((stav.pasmo.stred - stav.pasmo.sirka / 2) / TEPLOTA_MAX) * sirka;
  const sirkaPasma = (stav.pasmo.sirka / TEPLOTA_MAX) * sirka;
  ctx.fillStyle = pruhledne(paleta.rum, 0.5);
  ctx.fillRect(odX, y, sirkaPasma, v);

  const podil = Math.min(1, stav.teplota / TEPLOTA_MAX);
  ctx.save();
  zaobleny(ctx, x, y, sirka, v, v / 2);
  ctx.clip();
  ctx.fillStyle = pruhledne(paleta.rumSvetlo, 0.85);
  ctx.fillRect(x, y, podil * sirka, v);
  ctx.restore();

  ctx.fillStyle = paleta.par;
  ctx.fillRect(x + podil * sirka - 1 * r.ui, y - 4 * r.ui, 2 * r.ui, v + 8 * r.ui);

  // Pásmo se rozsvítí, jakmile je láhev dost horká. Je to jediné místo, kde
  // hráč pozná, že už má sáhnout po zápalce.
  if (vPasmu(stav)) {
    ctx.strokeStyle = pruhledne(paleta.rumSvetlo, 0.9);
    ctx.lineWidth = 2;
    ctx.strokeRect(odX, y, sirkaPasma, v);
  }
}

/** Zápalka: dřívko se žhavou hlavičkou. Hoří, jen když ji hráč drží. */
function kresliZapalku(
  platno: Platno,
  g: GeometrieRitualu,
  paleta: Paleta,
  x: number,
  y: number,
  hori: boolean,
  casS: number,
): void {
  const { ctx } = platno;
  const delka = g.polomer * 2.4;
  const tloustka = Math.max(2, g.polomer * 0.18);

  ctx.save();
  ctx.translate(x, y);

  // Dřívko míří šikmo dolů, jako když ji člověk drží v ruce.
  ctx.rotate(0.4);
  ctx.fillStyle = pruhledne(paleta.par, 0.75);
  zaobleny(ctx, -tloustka / 2, 0, tloustka, delka, tloustka / 2);
  ctx.fill();

  ctx.fillStyle = paleta.zhava;
  ctx.beginPath();
  ctx.arc(0, 0, tloustka * 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (!hori) return;

  const chveni = 1 + 0.12 * Math.sin(casS * 19) + 0.07 * Math.sin(casS * 8.1);
  const v = g.polomer * 1.15 * chveni;
  const prechod = ctx.createLinearGradient(x, y, x, y - v);
  prechod.addColorStop(0, pruhledne(paleta.zhava, 0.95));
  prechod.addColorStop(1, pruhledne(paleta.rumSvetlo, 0));

  ctx.beginPath();
  ctx.moveTo(x - v * 0.32, y);
  ctx.quadraticCurveTo(x - v * 0.3, y - v * 0.7, x, y - v);
  ctx.quadraticCurveTo(x + v * 0.3, y - v * 0.7, x + v * 0.32, y);
  ctx.closePath();
  ctx.fillStyle = prechod;
  ctx.shadowColor = paleta.zhava;
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.shadowBlur = 0;
}

/** Modrý zážeh z hrdla. `sila` řídí výšku i barvu — od nesmělého po dlouhý. */
function kresliZazeh(
  platno: Platno,
  g: GeometrieRitualu,
  paleta: Paleta,
  sila: number,
  casS: number,
): void {
  const { ctx } = platno;
  const chveni = 1 + 0.06 * Math.sin(casS * 17) + 0.04 * Math.sin(casS * 7.3);
  const delka = g.polomer * (1.2 + PROSTOR_PLAMENE * 0.78 * sila) * chveni;
  const sirka = g.polomer * (0.55 + 0.4 * sila);
  const { x, y } = g.usti;

  const prechod = ctx.createLinearGradient(x, y, x, y - delka);
  prechod.addColorStop(0, pruhledne(paleta.zazeh, 0.95));
  prechod.addColorStop(0.55, pruhledne(paleta.zazeh, 0.6));
  prechod.addColorStop(1, pruhledne(sila > 0.6 ? paleta.rumSvetlo : paleta.zazeh, 0));

  ctx.beginPath();
  ctx.moveTo(x - sirka / 2, y);
  ctx.quadraticCurveTo(x - sirka / 2, y - delka * 0.6, x, y - delka);
  ctx.quadraticCurveTo(x + sirka / 2, y - delka * 0.6, x + sirka / 2, y);
  ctx.closePath();
  ctx.fillStyle = prechod;
  ctx.shadowColor = paleta.zazeh;
  ctx.shadowBlur = 18 * (0.4 + sila);
  ctx.fill();
  ctx.shadowBlur = 0;
}

/** Naznačení, kudy třít. Zhasne, jakmile hráč začne — pak by překáželo. */
function kresliVoditko(
  platno: Platno,
  g: GeometrieRitualu,
  paleta: Paleta,
  stav: StavRitualu,
): void {
  if (stav.teplota > 4) return;
  const { ctx } = platno;
  const x = g.poloha.x + g.polomer * 2.1;
  const od = g.poloha.y - g.vyska * 0.78;
  const do_ = g.poloha.y - g.vyska * 0.18;

  ctx.strokeStyle = pruhledne(paleta.par, 0.35);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(x, od);
  ctx.lineTo(x, do_);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const [y, smer] of [
    [od, -1],
    [do_, 1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x - 4 * g.rozvrh.ui, y + smer * 6 * g.rozvrh.ui);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 4 * g.rozvrh.ui, y + smer * 6 * g.rozvrh.ui);
    ctx.stroke();
  }
}

/**
 * Hláška po zážehu nebo tichu. Ve výkladovém pruhu — nápověda je v těch
 * fázích prázdná, takže je pruh volný a hláška nepřekáží plameni nad hrdlem.
 */
function kresliHlasku(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavRitualu,
): void {
  const uspech = stav.faze === 'zazeh';
  const obsah = uspech
    ? texty.zazeh.uspech
    : stav.pokus >= ZAZEH_POKUSU
      ? texty.zazeh.konecPokusu
      : texty.zazeh.ticho;

  const velikost = 22 * r.ui;
  odstavec(
    platno.ctx,
    obsah,
    r.sirka / 2,
    (r.hornilistaY + r.plochaY) / 2 - velikost * 0.65,
    r.sloupec,
    {
      velikost,
      barva: uspech ? paleta.zazeh : paleta.par,
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
  /** Kde je prst nebo myš. `null`, když se nikde nedrží. */
  ukazatel: Bod | null,
): void {
  const g = geometrieRitualu(r);
  kresliLahev(platno, g.rozvrh, paleta, rozlevani, g.poloha);

  if (stav.faze === 'zahrivani') kresliVoditko(platno, g, paleta, stav);

  // Zápalka: buď leží vedle láhve, nebo ji hráč drží u prstu.
  if (stav.faze === 'zahrivani') {
    kresliZapalku(platno, g, paleta, g.zapalkaDoma.x, g.zapalkaDoma.y, false, stav.casS);
  } else if (stav.faze === 'zapalka') {
    // Bez ukazatele drží zápalku ukázka — ta ji má u hrdla, ne na odkládacím
    // místě. Kreslit ji zpátky vedle láhve by ukázku ukazovalo obráceně.
    const kde = ukazatel ?? { x: g.usti.x, y: g.usti.y + g.polomer * 0.5 };
    kresliZapalku(platno, g, paleta, kde.x, kde.y, true, stav.casS);
  }

  if (stav.faze === 'zazeh') kresliZazeh(platno, g, paleta, stav.kvalita, stav.casS);

  kresliTeplomer(platno, r, paleta, stav);

  if (stav.faze === 'zazeh' || stav.faze === 'ticho') {
    kresliHlasku(platno, r, paleta, stav);
  }

  // Dohořívající zápalka jako tenký proužek pod teploměrem. Je to jediné
  // místo, kde hráč vidí, kolik času mu na přiložení zbývá.
  if (stav.faze === 'zapalka') {
    const podil = Math.max(0, stav.zapalkaZbyvaS / ZAPALKA_HORI_S);
    const sirka = r.sloupec * 0.5;
    const x = (r.sirka - sirka) / 2;
    const y = r.plochaY + r.plochaVyska * TEPLOMER_Y + 34 * r.ui;
    platno.ctx.fillStyle = pruhledne(paleta.par, 0.12);
    platno.ctx.fillRect(x, y, sirka, 3 * r.ui);
    platno.ctx.fillStyle = pruhledne(podil < 0.3 ? paleta.zhava : paleta.rum, 0.9);
    platno.ctx.fillRect(x, y, sirka * podil, 3 * r.ui);
  }
}

/** Štítek pokusu do horní lišty. Tři pokusy na level a hráč to musí vidět. */
export function popisPokusu(stav: StavRitualu): string {
  return `${Math.min(stav.pokus, ZAZEH_POKUSU)} / ${ZAZEH_POKUSU}`;
}

/** Jak blízko je teplota pásmu ⟨0,1⟩. Pro ladicí panel. */
export function blizkostPasma(stav: StavRitualu): number {
  return kvalitaZasahu(stav.teplota, stav.pasmo);
}
