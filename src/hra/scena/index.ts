/**
 * Složení scény. Jediné, co o vykreslování ví zbytek hry.
 *
 * Pořadí vrstev je záměrné: panáky, pak proud, pak láhev. Láhev se při
 * nalévání naklání nad panák a musí být nad ním, jinak proud vytéká „zpod"
 * skla.
 */

import { KAPACITA_PANAKU_ML } from '../ladeni.ts';
import type { StavRozlevani } from '../jadro/rozlevani.ts';
import type { Vysledek } from '../jadro/skore.ts';
import * as texty from '../texty.ts';
import type { Karta } from '../texty.ts';
import { pruhledne } from './barvy.ts';
import type { Paleta } from './barvy.ts';
import { kresliKartu, kresliKomentarUkazky, kresliListu, kresliNapovedu } from './hud.ts';
import { kresliLahev } from './nadoby.ts';
import type { Platno } from './platno.ts';
import { CISLA, text } from './pismo.ts';
import type { PolohaLahve, Rozvrh } from './rozvrh.ts';
import { kresliDesku, kresliPanaky, kresliProud, kresliRysku } from './stul.ts';
import { kresliKonec, kresliVysledek } from './vysledek.ts';

export type Rezim = 'karta' | 'ukazka' | 'hra' | 'vysledek' | 'konec';

export interface Pohled {
  rezim: Rezim;
  stav: StavRozlevani;
  vysledek: Vysledek | null;
  /** Dno láhve a její náklon. Hrdlo z toho plyne. */
  poloha: PolohaLahve;
  skore: number;
  karta: Karta | null;
  patkaKarty: string;
  komentar: string;
  medaile: string[];
  debug: boolean;
  seed: number;
}

function kresliDebug(platno: Platno, r: Rozvrh, paleta: Paleta, pohled: Pohled): void {
  const { stav } = pohled;
  const { konfig } = stav;
  const radky = [
    `seed ${pohled.seed}   level ${konfig.level.cislo}   ${pohled.rezim}`,
    `láhev ${konfig.lahev.tvar.id} ${konfig.kapacitaLahveMl} ml   panák ${konfig.panak.tvar.id}`,
    `obsah ${konfig.objemMl.toFixed(1)} ml   cíl ${konfig.cilMl.toFixed(1)} ml   zbývá ${stav.zbytekMl.toFixed(1)} ml`,
    `fáze ${stav.faze}   náklon ${stav.naklonPodil.toFixed(2)}   průtok ${stav.prutokMlS.toFixed(1)} ml/s`,
    `panáky ${stav.panaky.map((v) => v.toFixed(1)).join(' · ')}`,
    `rozlito ${stav.rozlitoMl.toFixed(1)} ml   přelití ${stav.prelitiPocet}×   tolerance ${konfig.level.tolerance}`,
    '[ ] level   R seed   N šum   S zpomalení   D panel',
  ];

  platno.ctx.fillStyle = pruhledne(paleta.sklo, 0.88);
  platno.ctx.fillRect(8, r.vyska - 20 - radky.length * 15, 460, radky.length * 15 + 12);
  radky.forEach((radek, i) => {
    text(platno.ctx, radek, 16, r.vyska - 22 - (radky.length - 1 - i) * 15, {
      velikost: 11.5,
      barva: paleta.zazeh,
      pismo: CISLA,
    });
  });
}

export function vykresli(platno: Platno, r: Rozvrh, paleta: Paleta, pohled: Pohled): void {
  const { ctx } = platno;
  const { stav } = pohled;

  ctx.fillStyle = paleta.sklo;
  ctx.fillRect(0, 0, r.sirka, r.vyska);

  if (pohled.rezim === 'konec') {
    kresliKonec(platno, r, paleta, pohled.skore, pohled.medaile);
    if (pohled.debug) kresliDebug(platno, r, paleta, pohled);
    return;
  }

  kresliDesku(platno, r, paleta);
  kresliPanaky(platno, r, paleta, stav);

  // Ryska svítí jen dokud se hraje. Ve výsledku ji nahradí linka rovnosti,
  // která leží na témže místě — proto by se překrývaly.
  if (stav.konfig.level.ryska && pohled.rezim !== 'vysledek') {
    kresliRysku(platno, r, paleta, stav);
  }

  kresliProud(platno, r, paleta, stav, pohled.poloha);
  kresliLahev(platno, r, paleta, stav, pohled.poloha);

  kresliListu(platno, r, paleta, stav, pohled.skore);

  if (pohled.rezim === 'ukazka') {
    kresliKomentarUkazky(platno, r, paleta, pohled.komentar);
    text(ctx, texty.ukazka.preskocit, r.sirka / 2, r.vyska - 88, {
      velikost: 12,
      barva: pruhledne(paleta.par, 0.45),
      zarovnani: 'center',
    });
  } else if (pohled.rezim === 'hra') {
    kresliNapovedu(platno, r, paleta, stav);
  }

  if (pohled.rezim === 'vysledek' && pohled.vysledek) {
    kresliVysledek(platno, r, paleta, stav, pohled.vysledek);
  }

  if (pohled.rezim === 'karta' && pohled.karta) {
    kresliKartu(platno, r, paleta, pohled.karta, pohled.patkaKarty);
  }

  if (pohled.debug) kresliDebug(platno, r, paleta, pohled);
}

/** Kolik ml odpovídá plnému panáku. Vystaveno kvůli ladicímu panelu. */
export const PLNY_PANAK_ML = KAPACITA_PANAKU_ML;
