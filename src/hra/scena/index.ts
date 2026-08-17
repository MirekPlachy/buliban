/**
 * Složení scény. Jediné, co o vykreslování ví zbytek hry.
 *
 * Pořadí vrstev je záměrné: pozadí, stůl, panáky, proud, láhev, teprve pak
 * rám a lišty. Láhev se při nalévání naklání nad panák a musí být nad ním,
 * jinak proud vytéká „zpod" skla. Lišty jsou nahoře nade všemi, protože
 * dno vyhoupnuté láhve jim jinak leze do textu.
 *
 * Rám scény (`plochaY`…`spodniListaY`) je společný všem fázím. Fáze 1
 * a fáze 3 se sem přidají jako další `rezim` — proto tady jde o volbu
 * vrstvy, ne o zvláštní obrazovku vedle hry.
 */

import { KAPACITA_PANAKU_ML } from '../ladeni.ts';
import type { StavRozlevani } from '../jadro/rozlevani.ts';
import type { Vysledek } from '../jadro/skore.ts';
import type { Karta } from '../texty.ts';
import { pruhledne } from './barvy.ts';
import type { Paleta } from './barvy.ts';
import {
  kresliKartu,
  kresliKomentarUkazky,
  kresliListu,
  kresliNapovedu,
  kresliPreskoceni,
  kresliRam,
} from './hud.ts';
import { kresliLahev } from './nadoby.ts';
import type { Platno } from './platno.ts';
import { text } from './pismo.ts';
import { kresliPanel } from './prvky.ts';
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
  /** Hráč právě přebírá tutéž láhev po ukázce. Řekne se to místo nápovědy. */
  poUkazce: boolean;
  komentar: string;
  medaile: string[];
  debug: boolean;
  seed: number;
}

/**
 * Pozadí: tmavé sklo se světlem nad stolem.
 *
 * Plochá barva dělala z obrazovky prázdný list, ve kterém předměty plavaly
 * bez místa. Světlo je jedno, měkké a nad panáky — scéna tím dostane střed.
 */
function kresliPozadi(platno: Platno, r: Rozvrh, paleta: Paleta): void {
  const { ctx } = platno;
  ctx.fillStyle = paleta.sklo;
  ctx.fillRect(0, 0, r.sirka, r.vyska);

  const zdroj = ctx.createRadialGradient(
    r.sirka / 2,
    r.stulY - r.panakVyska,
    0,
    r.sirka / 2,
    r.stulY - r.panakVyska,
    Math.max(r.sirka, r.vyska) * 0.72,
  );
  zdroj.addColorStop(0, pruhledne(paleta.skloStin, 0.85));
  zdroj.addColorStop(1, pruhledne(paleta.skloStin, 0));
  ctx.fillStyle = zdroj;
  ctx.fillRect(0, 0, r.sirka, r.vyska);
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
    `scéna ${r.sirka}×${r.vyska}   ui ${r.ui.toFixed(2)}   panák ${r.panakSirka.toFixed(0)} px`,
    '[ ] level   R seed   N šum   S zpomalení   D panel',
  ];

  const vyska = radky.length * 15 + 16;
  const y = r.spodniListaY - vyska - 8;
  kresliPanel(platno.ctx, paleta, r, 8, y, 470, vyska, { kryti: 0.9 });
  radky.forEach((radek, i) => {
    text(platno.ctx, radek, 20, y + 8 + i * 15, {
      velikost: 11.5,
      barva: paleta.zazeh,
      svisle: 'top',
      pismo: 'cisla',
    });
  });
}

export function vykresli(platno: Platno, r: Rozvrh, paleta: Paleta, pohled: Pohled): void {
  const { stav } = pohled;

  if (pohled.rezim === 'konec') {
    kresliKonec(platno, r, paleta, pohled.skore, pohled.medaile);
    if (pohled.debug) kresliDebug(platno, r, paleta, pohled);
    return;
  }

  kresliPozadi(platno, r, paleta);
  kresliRam(platno, r, paleta);
  kresliDesku(platno, r, paleta);
  kresliPanaky(platno, r, paleta, stav);

  // Ryska svítí jen dokud se hraje. Ve výsledku ji nahradí linka rovnosti,
  // která leží na témže místě — proto by se překrývaly.
  if (stav.konfig.level.ryska && pohled.rezim !== 'vysledek') {
    kresliRysku(platno, r, paleta, stav);
  }

  kresliProud(platno, r, paleta, stav, pohled.poloha);
  kresliLahev(platno, r, paleta, stav, pohled.poloha);

  if (pohled.rezim === 'vysledek' && pohled.vysledek) {
    kresliVysledek(platno, r, paleta, stav, pohled.vysledek);
  }

  // Lišty až nad scénu: vyhoupnuté dno láhve i překryv výsledku by jim jinak
  // vlezly do textu.
  kresliListu(platno, r, paleta, stav, pohled.skore);

  if (pohled.rezim === 'ukazka') {
    kresliPreskoceni(platno, r, paleta);
    kresliKomentarUkazky(platno, r, paleta, pohled.komentar);
  } else if (pohled.rezim === 'hra') {
    kresliNapovedu(platno, r, paleta, stav, pohled.poUkazce);
  }

  if (pohled.rezim === 'karta' && pohled.karta) {
    kresliKartu(platno, r, paleta, pohled.karta, stav.konfig.level.cislo, pohled.patkaKarty);
  }

  if (pohled.debug) kresliDebug(platno, r, paleta, pohled);
}

/** Kolik ml odpovídá plnému panáku. Vystaveno kvůli ladicímu panelu. */
export const PLNY_PANAK_ML = KAPACITA_PANAKU_ML;
