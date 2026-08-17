/**
 * Stůl: deska, řada panáků, proud z hrdla, přelití a kaluže.
 *
 * Rozpočet efektů je záměrně nízký — veškerá odvaha se utrácí na dvou
 * místech, „lince rovnosti" ve výsledku a (později) na zážehu. Přelití je
 * třetí výjimka: musí být okamžitě čitelné, protože je to jediná chyba,
 * kterou hráč udělá a hned vidí.
 */

import { KAPACITA_PANAKU_ML, PRELITI_S } from '../ladeni.ts';
import { hladinaVPanaku } from '../jadro/rozlevani.ts';
import type { StavRozlevani } from '../jadro/rozlevani.ts';
import { pruhledne } from './barvy.ts';
import type { Paleta } from './barvy.ts';
import { kresliPanak } from './nadoby.ts';
import type { Platno } from './platno.ts';
import { stred, ustiHrdla } from './rozvrh.ts';
import type { PolohaLahve, Rozvrh } from './rozvrh.ts';

/** Podíl výšky, kde má být hladina při dosažení cíle. Ryska i linka rovnosti. */
export function podilCile(stav: StavRozlevani): number {
  return stav.konfig.panak.vyskaZObjemu(stav.konfig.cilMl / KAPACITA_PANAKU_ML);
}

/**
 * Deska stolu. Jedna linka byla málo: bez desky panáky nestály na ničem
 * a scéna se rozpadla na předměty plovoucí v prázdnu.
 */
export function kresliDesku(platno: Platno, r: Rozvrh, paleta: Paleta): void {
  const { ctx } = platno;
  const hloubka = Math.min(r.vyska - r.stulY, 70 * r.ui);
  if (hloubka > 0) {
    const prechod = ctx.createLinearGradient(0, r.stulY, 0, r.stulY + hloubka);
    prechod.addColorStop(0, pruhledne(paleta.skloStin, 0.5));
    prechod.addColorStop(1, pruhledne(paleta.skloStin, 0));
    ctx.fillStyle = prechod;
    ctx.fillRect(0, r.stulY, r.sirka, hloubka);
  }

  // Světlo na hraně desky. Nejsytější pod panáky, ke krajům se vytrácí —
  // scéna tím dostane střed, aniž by se do ní kreslila lampa.
  const zaostreni = ctx.createLinearGradient(0, 0, r.sirka, 0);
  zaostreni.addColorStop(0, pruhledne(paleta.par, 0.04));
  zaostreni.addColorStop(0.5, pruhledne(paleta.par, 0.3));
  zaostreni.addColorStop(1, pruhledne(paleta.par, 0.04));
  ctx.strokeStyle = zaostreni;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, Math.round(r.stulY) + 0.5);
  ctx.lineTo(r.sirka, Math.round(r.stulY) + 0.5);
  ctx.stroke();
}

function kresliKaluz(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  x: number,
  ml: number,
): void {
  if (ml <= 0) return;
  const { ctx } = platno;
  // Kaluž roste s odmocninou objemu — plocha na stole, ne délka.
  const sirka = Math.min(r.rozestup * 0.9, r.panakSirka * 0.5 + Math.sqrt(ml) * 5);
  ctx.fillStyle = pruhledne(paleta.rum, 0.5);
  ctx.beginPath();
  ctx.ellipse(x, r.stulY + 2, sirka / 2, Math.min(7, 2 + Math.sqrt(ml)), 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Přetékající rum stékající po stěně panáku. Jen po dobu animace. */
function kresliPreteceni(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  x: number,
  sila: number,
): void {
  if (sila <= 0) return;
  const { ctx } = platno;
  const okraj = r.panakSirka / 2;
  const delka = r.panakVyska * Math.min(1, sila * 1.6);

  ctx.strokeStyle = pruhledne(paleta.zhava, 0.55 + 0.35 * sila);
  ctx.lineWidth = 2 + 2 * sila;
  ctx.lineCap = 'round';
  for (const strana of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + strana * okraj, r.stulY - r.panakVyska);
    ctx.lineTo(x + strana * (okraj + 2), r.stulY - r.panakVyska + delka);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

export function kresliPanaky(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavRozlevani,
  odhalitVse = false,
): void {
  const { konfig } = stav;
  const sila = stav.prelitiCasS / PRELITI_S;

  for (let i = 0; i < konfig.panaku; i += 1) {
    const x = stred(r, i);
    kresliKaluz(platno, r, paleta, x, stav.rozlitoUPanaku[i]);

    const preteka = sila > 0 && i === stav.aktivni;
    kresliPanak(platno, r, paleta, konfig.panak, {
      index: i,
      x,
      ml: stav.panaky[i],
      podil: hladinaVPanaku(stav, i),
      aktivni: i === stav.aktivni && stav.faze !== 'hotovo' && stav.faze !== 'dozniva',
      odnesen: !odhalitVse && stav.odnesene[i],
      // Otřes jde z herního času, ne z hodin prohlížeče — jinak by běžel
      // jinak rychle při zpomalení v debug panelu.
      otres: preteka ? Math.sin(stav.casS * 46) * 3 * sila : 0,
    });

    if (preteka) kresliPreteceni(platno, r, paleta, x, sila);
  }
}

/** Orientační ryska ve výši cíle. Jediné místo, kde hráč cíl vidí. */
export function kresliRysku(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavRozlevani,
): void {
  const { ctx } = platno;
  const y = r.stulY - podilCile(stav) * r.panakVyska;

  ctx.strokeStyle = pruhledne(paleta.zazeh, 0.55);
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1;
  for (let i = 0; i < stav.konfig.panaku; i += 1) {
    if (stav.odnesene[i]) continue;
    const x = stred(r, i);
    ctx.beginPath();
    ctx.moveTo(x - r.panakSirka / 2 - 4, y);
    ctx.lineTo(x + r.panakSirka / 2 + 4, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

export function kresliProud(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavRozlevani,
  poloha: PolohaLahve,
): void {
  if (stav.faze !== 'leje' && stav.faze !== 'dokapava') return;

  const { ctx } = platno;
  const usti = ustiHrdla(r, stav.konfig.lahev, poloha);
  const cilX = stred(r, stav.aktivni);
  const hladina = r.stulY - hladinaVPanaku(stav, stav.aktivni) * r.panakVyska;
  const dokapava = stav.faze === 'dokapava';

  ctx.strokeStyle = pruhledne(paleta.rumSvetlo, dokapava ? 0.45 : 0.92);
  ctx.lineWidth = dokapava ? 1.5 : Math.max(2, stav.prutokMlS / 6);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(usti.x, usti.y);
  // Proud se mírně prohýbá k panáku, ať to není přímka mezi dvěma body.
  ctx.quadraticCurveTo((usti.x + cilX) / 2, (usti.y + hladina) / 2 + 6, cilX, hladina);
  ctx.stroke();
  ctx.lineCap = 'butt';
}
