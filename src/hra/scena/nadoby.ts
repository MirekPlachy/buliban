/**
 * Kreslení nádob — láhve a panáků.
 *
 * Obojí je rotační těleso popsané funkcí `polomer(y)`, takže obrys se staví
 * jedním kódem. Rozdíl je jen v tom, že láhev se otáčí a panák ne.
 *
 * Hladina se kreslí přes ořez: obrys se ořízne v soustavě nádoby, pak se
 * souřadnice vrátí do světa a kapalina se vyplní **vodorovně**. Bez toho by
 * se rum v nakloněné láhvi naklonil s ní, což je hned vidět jako chyba.
 */

import { KAPACITA_PANAKU_ML } from '../ladeni.ts';
import { rovinaProObjem } from '../jadro/profil.ts';
import type { StavRozlevani } from '../jadro/rozlevani.ts';
import { pruhledne } from './barvy.ts';
import type { Paleta } from './barvy.ts';
import type { Platno } from './platno.ts';
import type { PolohaLahve, Rozvrh } from './rozvrh.ts';

const VZORKU = 84;

/** Obrys nádoby v místní soustavě: dno v počátku, roste vzhůru. */
export function cestaNadoby(
  ctx: CanvasRenderingContext2D,
  polomer: (y: number) => number,
  polomerPx: number,
  vyskaPx: number,
): void {
  ctx.beginPath();
  for (let i = 0; i <= VZORKU; i += 1) {
    const y = i / VZORKU;
    const px = polomer(y) * polomerPx;
    const py = -y * vyskaPx;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = VZORKU; i >= 0; i -= 1) {
    const y = i / VZORKU;
    ctx.lineTo(-polomer(y) * polomerPx, -y * vyskaPx);
  }
  ctx.closePath();
}

export function kresliLahev(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavRozlevani,
  poloha: PolohaLahve,
): void {
  const { ctx } = platno;
  const { lahev } = stav.konfig;

  ctx.save();
  ctx.translate(poloha.x, poloha.y);
  ctx.rotate(poloha.uhel);
  cestaNadoby(ctx, lahev.polomer, r.lahevPolomer, r.lahevVyska);

  ctx.fillStyle = pruhledne(paleta.skloStin, 0.55);
  ctx.fill();

  // Hladina v láhvi je celá první polovina hry, a dohledává se z OBJEMU,
  // ne z výšky ve svislé láhvi. Přenést výšku ze svislé láhve na otočený
  // obrys nejde: při naklánění by rum viditelně přibýval a ubýval, přestože
  // se v láhvi nic nezměnilo.
  const hladinaY =
    poloha.y +
    rovinaProObjem(
      lahev.polomer,
      r.lahevPolomer,
      r.lahevVyska,
      poloha.uhel,
      stav.zbytekMl / stav.konfig.kapacitaLahveMl,
    );

  ctx.clip();
  platno.svet();
  ctx.fillStyle = pruhledne(paleta.rum, 0.9);
  ctx.fillRect(0, hladinaY, r.sirka, r.vyska - hladinaY);
  ctx.fillStyle = paleta.rumSvetlo;
  ctx.fillRect(0, hladinaY - 1.5, r.sirka, 1.5);
  ctx.restore();

  // Slepé finále: tělo se přetře neprůhledně AŽ TEĎ, přes už nakreslený rum.
  // Hrdlo nad hranicí zůstane čiré, takže hráč vidí, že a jak silně teče —
  // ale ne, kolik v láhvi zbývá. Nad hranicí je jen zlomek objemu láhve,
  // takže se z hrdla o zbytku nedá nic vyčíst (hlídá test v `lahev.test.ts`).
  const neprusvitneDo = lahev.tvar.neprusvitneDo;
  if (neprusvitneDo !== undefined) {
    ctx.save();
    ctx.translate(poloha.x, poloha.y);
    ctx.rotate(poloha.uhel);
    cestaNadoby(ctx, lahev.polomer, r.lahevPolomer, r.lahevVyska);
    ctx.clip();
    ctx.fillStyle = paleta.skloStin;
    ctx.fillRect(
      -r.lahevPolomer * 1.1,
      -neprusvitneDo * r.lahevVyska,
      r.lahevPolomer * 2.2,
      neprusvitneDo * r.lahevVyska,
    );
    ctx.restore();
  }

  // Etiketa a obrys jdou nad kapalinu, ať ji zakrývají.
  ctx.save();
  ctx.translate(poloha.x, poloha.y);
  ctx.rotate(poloha.uhel);

  const etiketa = lahev.tvar.etiketa;
  if (etiketa) {
    ctx.save();
    cestaNadoby(ctx, lahev.polomer, r.lahevPolomer, r.lahevVyska);
    ctx.clip();
    ctx.fillStyle = paleta.skloStin;
    ctx.fillRect(
      -r.lahevPolomer,
      -etiketa.do * r.lahevVyska,
      r.lahevPolomer * 2,
      (etiketa.do - etiketa.od) * r.lahevVyska,
    );
    ctx.strokeStyle = pruhledne(paleta.rumSvetlo, 0.35);
    ctx.lineWidth = 1;
    ctx.strokeRect(
      -r.lahevPolomer,
      -etiketa.do * r.lahevVyska,
      r.lahevPolomer * 2,
      (etiketa.do - etiketa.od) * r.lahevVyska,
    );
    ctx.restore();
  }

  cestaNadoby(ctx, lahev.polomer, r.lahevPolomer, r.lahevVyska);
  ctx.strokeStyle = pruhledne(paleta.par, 0.5);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

export interface PanakKresba {
  index: number;
  x: number;
  /** Kolik ml je v panáku. */
  ml: number;
  /** Podíl výšky hladiny — přes profil, ne lineárně z objemu. */
  podil: number;
  aktivni: boolean;
  odnesen: boolean;
  /** Posun rozechvěním při přelití. */
  otres: number;
}

export function kresliPanak(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  panak: { polomer(y: number): number },
  kresba: PanakKresba,
): void {
  const { ctx } = platno;
  const cx = kresba.x + kresba.otres;

  if (kresba.odnesen) {
    // Host si panák odnesl. Zůstane kroužek na stole — hráč přijde
    // o vizuální referenci a zbývá mu paměť a hladina v láhvi.
    ctx.strokeStyle = pruhledne(paleta.par, 0.16);
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.ellipse(cx, r.stulY, r.panakSirka / 2, r.panakSirka / 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }

  ctx.save();
  ctx.translate(cx, r.stulY);
  cestaNadoby(ctx, panak.polomer, r.panakSirka / 2, r.panakVyska);
  ctx.fillStyle = pruhledne(paleta.skloStin, 0.7);
  ctx.fill();

  if (kresba.ml > 0) {
    ctx.save();
    ctx.clip();
    const h = kresba.podil * r.panakVyska;
    ctx.fillStyle = paleta.rum;
    ctx.fillRect(-r.panakSirka, -h, r.panakSirka * 2, h);
    ctx.fillStyle = paleta.rumSvetlo;
    ctx.fillRect(-r.panakSirka, -h - 2, r.panakSirka * 2, 2);
    ctx.restore();
  }

  const plny = kresba.ml >= KAPACITA_PANAKU_ML - 1e-9;
  cestaNadoby(ctx, panak.polomer, r.panakSirka / 2, r.panakVyska);
  ctx.strokeStyle = plny ? paleta.zhava : pruhledne(paleta.par, kresba.aktivni ? 0.95 : 0.32);
  ctx.lineWidth = kresba.aktivni ? 2 : 1;
  ctx.stroke();
  ctx.restore();
}
