/**
 * Složení scény. Jediné, co o vykreslování ví zbytek hry.
 *
 * Level má tři fáze a **každá kreslí do téhož rámu**: horní lišta se stavem,
 * herní plocha, spodní pás s nápovědou. Fáze se liší jen tím, co je uvnitř
 * plochy — láhev s korkem, řada panáků, nebo teploměr a dlaždice. Kdyby si
 * každá fáze držela vlastní obrazovku, vypadaly by jako tři různé hry.
 *
 * Pořadí vrstev u rozlévání je záměrné: pozadí, stůl, panáky, proud, láhev,
 * teprve pak rám a lišty. Láhev se při nalévání naklání nad panák a musí být
 * nad ním, jinak proud vytéká „zpod" skla. Lišty jsou nade vším, protože dno
 * vyhoupnuté láhve jim jinak leze do textu.
 */

import { KAPACITA_PANAKU_ML } from '../ladeni.ts';
import { vPasmu } from '../jadro/ritual.ts';
import type { StavRitualu } from '../jadro/ritual.ts';
import type { StavRozlevani } from '../jadro/rozlevani.ts';
import type { VysledekLevelu } from '../jadro/skore.ts';
import * as texty from '../texty.ts';
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
  napovedaRozlevani,
} from './hud.ts';
import type { StredListy } from './hud.ts';
import { kresliLahev } from './nadoby.ts';
import type { Platno } from './platno.ts';
import { text } from './pismo.ts';
import { kresliPanel } from './prvky.ts';
import { kresliRitual, popisPokusu } from './ritual.ts';
import type { Bod, PolohaLahve, Rozvrh } from './rozvrh.ts';
import { kresliDesku, kresliPanaky, kresliProud, kresliRysku } from './stul.ts';
import { kresliKonec, kresliVysledek } from './vysledek.ts';

/**
 * Fáze levelu tak, jak je vidí scéna. Ukázka je vlastní režim, ne příznak:
 * kreslí se v ní komentář a pobídka k přeskočení, a hlavně se v ní nesmí
 * objevit nápověda určená hráči.
 */
export type Rezim =
  | 'karta'
  | 'ukazkaRozlevani'
  | 'rozlevani'
  | 'ukazkaRitual'
  | 'ritual'
  | 'vysledek'
  | 'konec';

/** Kreslí se v tomhle režimu řada panáků a láhev nad ní? */
function jeRozlevani(rezim: Rezim): boolean {
  return rezim === 'ukazkaRozlevani' || rezim === 'rozlevani' || rezim === 'vysledek';
}

function jeUkazka(rezim: Rezim): boolean {
  return rezim === 'ukazkaRozlevani' || rezim === 'ukazkaRitual';
}

export interface Pohled {
  rezim: Rezim;
  stav: StavRozlevani;
  ritual: StavRitualu | null;
  vysledek: VysledekLevelu | null;
  /** Dno láhve a její náklon při rozlévání. Hrdlo z toho plyne. */
  poloha: PolohaLahve;
  /** Kde je prst nebo myš při rituálu. `null`, když se nedrží. */
  ukazatel: Bod | null;
  skore: number;
  karta: Karta | null;
  patkaKarty: string;
  /** Hráč právě přebírá tutéž láhev po ukázce. Řekne se to místo nápovědy. */
  poUkazce: boolean;
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

/** Co má stát uprostřed lišty. Každá fáze měří postup něčím jiným. */
function stredListy(pohled: Pohled): StredListy {
  const { stav } = pohled;

  if (pohled.rezim === 'ritual' || pohled.rezim === 'ukazkaRitual') {
    return {
      popis: texty.hud.pokus,
      hodnota: pohled.ritual ? popisPokusu(pohled.ritual) : '–',
    };
  }
  // `aktivni` po dolití zůstane na posledním panáku, takže „N / N" sedí
  // i po rozlití a lišta se v půlce hry nepřepisuje na jiný údaj.
  return {
    popis: texty.hud.panak,
    hodnota: `${stav.aktivni + 1} / ${stav.konfig.panaku}`,
  };
}

/** Nápověda pro spodní pás a jestli je to povel, nebo jen popis děje. */
function napoveda(pohled: Pohled): { obsah: string; povel: boolean } {
  switch (pohled.rezim) {
    case 'rozlevani':
      return {
        obsah: napovedaRozlevani(pohled.stav, pohled.poUkazce),
        povel: pohled.stav.faze === 'ceka',
      };
    case 'ritual': {
      const r = pohled.ritual;
      if (!r) return { obsah: '', povel: false };
      // Jakmile je láhev dost horká, nápověda se přepne z „třít" na „vzít
      // zápalku". Je to jediné místo, kde se hráč dozví, že už má přestat.
      const obsah =
        r.faze === 'zahrivani' && vPasmu(r)
          ? texty.napovedaVezmiZapalku
          : texty.napovedyRitualu[r.faze];
      return { obsah, povel: r.faze === 'zahrivani' || r.faze === 'zapalka' };
    }
    default:
      return { obsah: '', povel: false };
  }
}

/** Komentář běžící ukázky. Váže se na stav fáze, ne na stopky. */
function komentar(pohled: Pohled): string {
  switch (pohled.rezim) {
    case 'ukazkaRitual':
      return pohled.ritual ? texty.komentarRitualu(pohled.ritual) : '';
    default:
      return texty.komentarUkazky(
        pohled.stav.faze,
        pohled.stav.aktivni,
        pohled.stav.konfig.panaku,
      );
  }
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
    pohled.ritual
      ? `rituál ${pohled.ritual.faze}   teplota ${pohled.ritual.teplota.toFixed(1)}   ` +
        `pásmo ${pohled.ritual.pasmo.stred}±${(pohled.ritual.pasmo.sirka / 2).toFixed(1)}   ` +
        `tření ${pohled.ritual.treniTed.toFixed(3)}   pokus ${pohled.ritual.pokus}`
      : 'rituál –',
    `scéna ${r.sirka}×${r.vyska}   ui ${r.ui.toFixed(2)}   panák ${r.panakSirka.toFixed(0)} px`,
    '[ ] level   R seed   N šum   S zpomalení   D panel',
  ];

  const vyska = radky.length * 15 + 16;
  const y = r.spodniListaY - vyska - 8;
  kresliPanel(platno.ctx, paleta, r, 8, y, 520, vyska, { kryti: 0.9 });
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

  if (jeRozlevani(pohled.rezim)) {
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
  } else if (pohled.ritual) {
    kresliRitual(platno, r, paleta, stav, pohled.ritual, pohled.ukazatel);
  }

  // Lišty až nad scénu: vyhoupnuté dno láhve i překryv výsledku by jim jinak
  // vlezly do textu.
  kresliListu(platno, r, paleta, stav.konfig.level.cislo, stredListy(pohled), pohled.skore);

  if (jeUkazka(pohled.rezim)) {
    kresliPreskoceni(platno, r, paleta);
    kresliKomentarUkazky(platno, r, paleta, komentar(pohled));
  } else if (pohled.rezim !== 'vysledek' && pohled.rezim !== 'karta') {
    const { obsah, povel } = napoveda(pohled);
    kresliNapovedu(platno, r, paleta, obsah, povel);
  }

  if (pohled.rezim === 'karta' && pohled.karta) {
    kresliKartu(platno, r, paleta, pohled.karta, stav.konfig.level.cislo, pohled.patkaKarty);
  }

  if (pohled.debug) kresliDebug(platno, r, paleta, pohled);
}

/** Kolik ml odpovídá plnému panáku. Vystaveno kvůli ladicímu panelu. */
export const PLNY_PANAK_ML = KAPACITA_PANAKU_ML;
