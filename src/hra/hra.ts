/**
 * Herní smyčka, vstup a průchod levely.
 *
 * Simulace běží na **pevný krok**, vykreslování na snímky. Bez toho by hráč
 * na 144Hz monitoru naléval jinak než na 60Hz a celá hra o přesnosti
 * dávkování by se rozpadla (kap. 9).
 *
 * Ovládání je jedno gesto: drž. Myš, prst i mezerník dělají totéž — proto
 * hra funguje na mobilu i desktopu bez kompromisu (kap. 4.3).
 */

import { KROK_S, MAX_KROKU_ZA_SNIMEK } from './ladeni.ts';
import { POSLEDNI_LEVEL, level } from './levely.ts';
import { krok, zalozKonfiguraci, zalozStav } from './jadro/rozlevani.ts';
import type { StavRozlevani } from './jadro/rozlevani.ts';
import { vyhodnot } from './jadro/skore.ts';
import type { Medaile, Vysledek } from './jadro/skore.ts';
import { pripravUkazku } from './jadro/ukazka.ts';
import type { Ukazka } from './jadro/ukazka.ts';
import * as texty from './texty.ts';
import { nactiPaletu } from './scena/barvy.ts';
import { pripravPlatno } from './scena/platno.ts';
import { polohaLahve, spocitejRozvrh, stred } from './scena/rozvrh.ts';
import { vykresli } from './scena/index.ts';
import type { Rezim } from './scena/index.ts';

export interface Nastaveni {
  seed: number;
  level: number;
  debug: boolean;
}

/** Jak rychle láhev dojíždí nad další panák. Jen vzhled, na simulaci nesahá. */
const DOJEZD = 9;

const ZNACKY_MEDAILI: Record<Exclude<Medaile, null>, string> = {
  zlato: '🥇',
  stribro: '🥈',
  bronz: '🥉',
};

export function spustHru(canvas: HTMLCanvasElement, nastaveni: Nastaveni): () => void {
  const platno = pripravPlatno(canvas);
  const paleta = nactiPaletu();

  let seed = nastaveni.seed;
  let cisloLevelu = nastaveni.level;
  let debug = nastaveni.debug;
  let bezSumu = false;
  let casovyNasobek = 1;

  let rezim: Rezim = 'karta';
  let stav: StavRozlevani;
  let ukazka: Ukazka | null = null;
  let vysledek: Vysledek | null = null;
  let skore = 0;
  let medaile: string[] = [];

  let cilXPlynule = -1;
  let drzi = false;
  let cekaNaPusteni = false;
  let poUkazce = false;
  let bezi = true;

  function novyStav(): StavRozlevani {
    const konfig = zalozKonfiguraci(cisloLevelu, seed);
    if (bezSumu) konfig.level.amplituda = 0;
    return zalozStav(konfig);
  }

  /**
   * Připraví level. Karta se ukáže vždy, když pro level nějaká je.
   *
   * Sled obrazovek levelu je **karta → (ukázka) → hra → výsledek**, tedy
   * jedno odehrání levelu, a před ním nejvýš jedna ukázka. Ukázku má podle
   * `levely.ts` jen level 1 — hlídá to invariant „ryska svítí jen v prvním
   * levelu a ukázka taky jen v něm" v `rozlevani.test.ts`.
   */
  function zalozLevel(): void {
    stav = novyStav();
    ukazka = null;
    vysledek = null;
    drzi = false;
    cekaNaPusteni = false;
    poUkazce = false;
    cilXPlynule = -1;
    rezim = texty.karty[cisloLevelu] ? 'karta' : 'hra';
  }

  stav = novyStav();
  zalozLevel();

  /** Ukázka hraje na TÉŽE láhvi, kterou pak dostane hráč. */
  function spustUkazku(): void {
    stav = novyStav();
    ukazka = pripravUkazku(cisloLevelu, seed);
    cilXPlynule = -1;
    rezim = 'ukazka';
  }

  function spustHrani(): void {
    stav = novyStav();
    ukazka = null;
    cilXPlynule = -1;
    rezim = 'hra';
    // Kdo držel, když ukázka dojela, by jinak začal lít prvnímu panáku,
    // aniž by o tom rozhodl. Nalití musí být vždy nový stisk.
    drzi = false;
    cekaNaPusteni = true;
  }

  function dalsiLevel(): void {
    if (cisloLevelu >= POSLEDNI_LEVEL) {
      rezim = 'konec';
      return;
    }
    cisloLevelu += 1;
    zalozLevel();
  }

  function znovu(): void {
    seed = (seed + 1) >>> 0;
    cisloLevelu = 1;
    skore = 0;
    medaile = [];
    zalozLevel();
  }

  // ------------------------------------------------------------- vstup

  function stisk(): void {
    if (cekaNaPusteni) return;

    switch (rezim) {
      case 'karta':
        if (level(cisloLevelu).ukazka) spustUkazku();
        else spustHrani();
        break;
      case 'ukazka':
        spustHrani();
        break;
      case 'vysledek':
        dalsiLevel();
        break;
      case 'konec':
        znovu();
        break;
      case 'hra':
        drzi = true;
        break;
    }
    // Přechod nesmí spadnout rovnou do dalšího: jeden stisk, jeden krok.
    if (rezim !== 'hra') cekaNaPusteni = true;
  }

  function pusteni(): void {
    drzi = false;
    cekaNaPusteni = false;
  }

  const naPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    stisk();
  };
  const naPointerUp = (): void => pusteni();

  const naKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      // `repeat` by po chvíli držení generoval další stisky; pro hru, kde je
      // jeden stisk jedno nalití, by to byla tichá katastrofa.
      if (!e.repeat) stisk();
      return;
    }
    if (!debug) return;

    if (e.key === '[') {
      cisloLevelu = Math.max(1, cisloLevelu - 1);
      zalozLevel();
    } else if (e.key === ']') {
      cisloLevelu = Math.min(POSLEDNI_LEVEL, cisloLevelu + 1);
      zalozLevel();
    } else if (e.key.toLowerCase() === 'r') {
      seed = (seed + 1) >>> 0;
      zalozLevel();
    } else if (e.key.toLowerCase() === 'n') {
      bezSumu = !bezSumu;
      zalozLevel();
    } else if (e.key.toLowerCase() === 's') {
      casovyNasobek = casovyNasobek === 1 ? 0.25 : 1;
    } else if (e.key.toLowerCase() === 'd') {
      debug = !debug;
    }
  };

  const naKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code === 'Enter') pusteni();
  };

  // Odchod myši nebo prstu ze stránky musí nalévání ukončit. Kdyby ne,
  // zůstala by láhev otevřená a rozlila by se mimo obraz.
  const naOdchod = (): void => pusteni();

  canvas.addEventListener('pointerdown', naPointerDown);
  canvas.addEventListener('pointerup', naPointerUp);
  canvas.addEventListener('pointercancel', naPointerUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', naKeyDown);
  window.addEventListener('keyup', naKeyUp);
  window.addEventListener('blur', naOdchod);

  // ------------------------------------------------------------- smyčka

  let posledni = performance.now();
  let dluh = 0;
  let ram = 0;

  const naViditelnost = (): void => {
    if (document.hidden) return;
    // Návrat ze skryté záložky: čas se nedohání. Jinak by se do jednoho
    // snímku vlila celá doba nepřítomnosti a láhev by se vylila na pozadí.
    posledni = performance.now();
    dluh = 0;
  };
  document.addEventListener('visibilitychange', naViditelnost);

  function odkrokuj(): void {
    const bezici = rezim === 'hra' || rezim === 'ukazka';
    if (!bezici || document.hidden) return;

    let kroku = 0;
    while (dluh >= KROK_S && kroku < MAX_KROKU_ZA_SNIMEK) {
      krok(stav, ukazka ? ukazka.drzi(stav) : drzi);
      dluh -= KROK_S;
      kroku += 1;
    }
    if (dluh > KROK_S * MAX_KROKU_ZA_SNIMEK) dluh = 0;

    if (stav.faze !== 'hotovo') return;

    if (rezim === 'ukazka') {
      // Ukázka doběhla — hráč dostane tutéž láhev. Předání je potřeba říct
      // nahlas: scéna se nezmění, jen se ovládání předá hráči, a bez toho
      // to prvních pár sekund vypadá jako pokračování ukázky.
      spustHrani();
      poUkazce = true;
      return;
    }
    vysledek = vyhodnot(stav);
    skore += vysledek.celkem;
    medaile.push(vysledek.medaile ? ZNACKY_MEDAILI[vysledek.medaile] : '·');
    rezim = 'vysledek';
    // Pokud hráč v tu chvíli ještě drží, výsledek nesmí hned odskočit.
    cekaNaPusteni = drzi;
  }

  function snimek(t: number): void {
    if (!bezi) return;
    ram = requestAnimationFrame(snimek);

    const dt = Math.min((t - posledni) / 1000, 0.25);
    posledni = t;
    dluh += dt * casovyNasobek;
    odkrokuj();

    const r = spocitejRozvrh(
      platno.sirka,
      platno.vyska,
      stav.konfig.panaku,
      stav.konfig.kapacitaLahveMl,
      stav.konfig.lahev,
      stav.konfig.panak,
    );

    const cil = stred(r, Math.max(0, stav.aktivni));
    cilXPlynule =
      cilXPlynule < 0 ? cil : cilXPlynule + (cil - cilXPlynule) * Math.min(1, dt * DOJEZD);

    vykresli(platno, r, paleta, {
      rezim,
      stav,
      vysledek,
      poloha: polohaLahve(r, stav.konfig.lahev, cilXPlynule, stav.naklonPodil),
      skore,
      karta: texty.karty[stav.konfig.level.cislo] ?? null,
      patkaKarty: texty.vysledek.dal,
      // Předání po ukázce zmizí, jakmile hráč poprvé nalije — dál už je
      // nápověda potřebnější než upozornění, že je na řadě.
      poUkazce: poUkazce && stav.aktivni === 0 && stav.faze === 'ceka',
      komentar: texty.komentarUkazky(stav.faze, stav.aktivni, stav.konfig.panaku),
      medaile,
      debug,
      seed,
    });
  }

  ram = requestAnimationFrame(snimek);

  return () => {
    bezi = false;
    cancelAnimationFrame(ram);
    platno.znic();
    canvas.removeEventListener('pointerdown', naPointerDown);
    canvas.removeEventListener('pointerup', naPointerUp);
    canvas.removeEventListener('pointercancel', naPointerUp);
    window.removeEventListener('keydown', naKeyDown);
    window.removeEventListener('keyup', naKeyUp);
    window.removeEventListener('blur', naOdchod);
    document.removeEventListener('visibilitychange', naViditelnost);
  };
}
