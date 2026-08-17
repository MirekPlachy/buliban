/**
 * Herní smyčka, vstup a průchod levely.
 *
 * **Jeden level = tři fáze:** otevření láhve → rozlévání → rituál. Teprve
 * když je Buliban vypuštěný, jde se dál (kap. 2). Level 1 má před každou
 * fází ukázku, ve které hra hraje sama sebe; od levelu 2 už žádnou.
 *
 * Simulace běží na **pevný krok**, vykreslování na snímky. Bez toho by hráč
 * na 144Hz monitoru naléval jinak než na 60Hz a celá hra o přesnosti
 * dávkování by se rozpadla (kap. 9).
 *
 * Vstup má tři kanály, protože fáze dělají s lahví tři různé věci:
 *  - **držení** — nalévání a zahřívání,
 *  - **hrana stisku** — ťukání do pečeti, timing klik do korku a zápalky,
 *  - **volba dlaždice** — poloha, metoda, čím zapálit.
 *
 * Hrana i volba se **frontují**: přijdou asynchronně z prohlížeče, ale spotřebuje
 * je právě jeden krok simulace. Bez fronty by se rychlé ťuknutí mezi dvěma
 * kroky ztratilo, což je u timing kliku ta nejhůř hlášená chyba.
 */

import { KROK_S, MAX_KROKU_ZA_SNIMEK } from './ladeni.ts';
import { POSLEDNI_LEVEL, level } from './levely.ts';
import { bodyZaOtevirani, krokOtevirani, zalozOtevirani } from './jadro/otevirani.ts';
import type { StavOtevirani } from './jadro/otevirani.ts';
import { krokRitualu, volbyRitualu, vypusteno, zalozRitual } from './jadro/ritual.ts';
import type { StavRitualu, VolbaRitualu } from './jadro/ritual.ts';
import { krok, zalozKonfiguraci, zalozStav } from './jadro/rozlevani.ts';
import type { StavRozlevani } from './jadro/rozlevani.ts';
import { slozLevel, vyhodnot } from './jadro/skore.ts';
import type { Medaile, VysledekLevelu } from './jadro/skore.ts';
import {
  pripravUkazku,
  pripravUkazkuOtevirani,
  pripravUkazkuRitualu,
} from './jadro/ukazka.ts';
import type { Ukazka, UkazkaOtevirani, UkazkaRitualu } from './jadro/ukazka.ts';
import * as texty from './texty.ts';
import { nactiPaletu } from './scena/barvy.ts';
import { pripravPlatno } from './scena/platno.ts';
import { dlazdicePod } from './scena/ritual.ts';
import { polohaLahve, spocitejRozvrh, stred } from './scena/rozvrh.ts';
import type { Rozvrh } from './scena/rozvrh.ts';
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
  let stavOtevirani: StavOtevirani | null = null;
  let stavRitualu: StavRitualu | null = null;
  let ukazka: Ukazka | null = null;
  let ukazkaOtevirani: UkazkaOtevirani | null = null;
  let ukazkaRitualu: UkazkaRitualu | null = null;
  let vysledek: VysledekLevelu | null = null;
  let skore = 0;
  let medaile: string[] = [];

  let cilXPlynule = -1;
  let drzi = false;
  let cekaStisk = false;
  let cekaVolba: VolbaRitualu | null = null;
  let cekaNaPusteni = false;
  let poUkazce = false;
  let bezi = true;
  /** Poslední spočítaný rozvrh — potřebuje ho trefování dlaždic myší. */
  let rozvrh: Rozvrh | null = null;

  function novyStav(): StavRozlevani {
    const konfig = zalozKonfiguraci(cisloLevelu, seed);
    if (bezSumu) konfig.level.amplituda = 0;
    return zalozStav(konfig);
  }

  function maUkazky(): boolean {
    return level(cisloLevelu).ukazka;
  }

  // ------------------------------------------------------- fáze levelu

  function spustOtevirani(sUkazkou: boolean): void {
    stavOtevirani = zalozOtevirani(cisloLevelu);
    ukazkaOtevirani = sUkazkou ? pripravUkazkuOtevirani() : null;
    rezim = sUkazkou ? 'ukazkaOtevirani' : 'otevirani';
    drzi = false;
    cekaStisk = false;
  }

  function spustRozlevani(sUkazkou: boolean): void {
    // Ukázka i hráč dostanou TUTÉŽ láhev — stav se proto zakládá znovu.
    stav = novyStav();
    ukazka = sUkazkou ? pripravUkazku(cisloLevelu, seed) : null;
    cilXPlynule = -1;
    rezim = sUkazkou ? 'ukazkaRozlevani' : 'rozlevani';
    // Kdo držel, když ukázka dojela, by jinak začal lít prvnímu panáku,
    // aniž by o tom rozhodl. Nalití musí být vždy nový stisk.
    drzi = false;
    cekaNaPusteni = !sUkazkou;
    poUkazce = !sUkazkou && maUkazky();
  }

  function spustRitual(sUkazkou: boolean): void {
    stavRitualu = zalozRitual(cisloLevelu, seed);
    ukazkaRitualu = sUkazkou ? pripravUkazkuRitualu(cisloLevelu, seed) : null;
    rezim = sUkazkou ? 'ukazkaRitual' : 'ritual';
    drzi = false;
    cekaStisk = false;
    cekaVolba = null;
  }

  /**
   * Připraví level. Sled je **karta → (ukázka) fáze 1 → (ukázka) fáze 2 →
   * (ukázka) fáze 3 → výsledek**. Ukázku má podle `levely.ts` jen level 1.
   */
  function zalozLevel(): void {
    stav = novyStav();
    stavOtevirani = null;
    stavRitualu = null;
    ukazka = null;
    ukazkaOtevirani = null;
    ukazkaRitualu = null;
    vysledek = null;
    drzi = false;
    cekaStisk = false;
    cekaVolba = null;
    cekaNaPusteni = false;
    poUkazce = false;
    cilXPlynule = -1;
    rezim = texty.karty[cisloLevelu] ? 'karta' : 'otevirani';
    if (rezim === 'otevirani') spustOtevirani(maUkazky());
  }

  stav = novyStav();
  zalozLevel();

  function dokoncLevel(): void {
    const rozlevani = vyhodnot(stav);
    vysledek = slozLevel(
      stavOtevirani ? bodyZaOtevirani(stavOtevirani) : 0,
      rozlevani,
      stavRitualu?.body ?? 0,
      stavRitualu ? vypusteno(stavRitualu) : false,
    );
    skore += vysledek.celkem;
    medaile.push(vysledek.medaile ? ZNACKY_MEDAILI[vysledek.medaile] : '·');
    rezim = 'vysledek';
    cekaNaPusteni = drzi;
  }

  function dalsiLevel(): void {
    // Bez vypuštění Bulibana se dál nepostupuje (kap. 5.3): tři neúspěšné
    // pokusy o zážeh hru ukončí. Je to jediný fail state v celé hře.
    if (!vysledek?.vypusteno || cisloLevelu >= POSLEDNI_LEVEL) {
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

  /** Dlaždice pod bodem, nebo `null`. Jen v rituálu a jen když se vybírá. */
  function volbaPod(x: number, y: number): VolbaRitualu | null {
    if (rezim !== 'ritual' || !stavRitualu || !rozvrh) return null;
    const volby = volbyRitualu(stavRitualu);
    if (volby.length === 0) return null;
    const index = dlazdicePod(rozvrh, volby.length, x, y);
    return index >= 0 ? volby[index] : null;
  }

  function stisk(x?: number, y?: number): void {
    if (cekaNaPusteni) return;

    switch (rezim) {
      case 'karta':
        spustOtevirani(maUkazky());
        break;
      // Stisk během ukázky ji přeskočí — hráč přebírá tutéž fázi.
      case 'ukazkaOtevirani':
        spustOtevirani(false);
        break;
      case 'ukazkaRozlevani':
        spustRozlevani(false);
        break;
      case 'ukazkaRitual':
        spustRitual(false);
        break;
      case 'vysledek':
        dalsiLevel();
        break;
      case 'konec':
        znovu();
        break;
      case 'otevirani':
        cekaStisk = true;
        break;
      case 'rozlevani':
        drzi = true;
        break;
      case 'ritual': {
        // Klik do dlaždice vybírá, klik jinam hřeje nebo škrtá. Bez tohohle
        // rozlišení by výběr metody zároveň začal hřát tou předchozí.
        const volba = x !== undefined && y !== undefined ? volbaPod(x, y) : null;
        if (volba) cekaVolba = volba;
        else {
          cekaStisk = true;
          drzi = true;
        }
        break;
      }
    }

    // Přechod nesmí spadnout rovnou do dalšího: jeden stisk, jeden krok.
    if (rezim === 'karta' || rezim === 'vysledek' || rezim === 'konec') cekaNaPusteni = true;
  }

  function pusteni(): void {
    drzi = false;
    cekaNaPusteni = false;
  }

  const naPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    stisk(e.clientX - rect.left, e.clientY - rect.top);
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

    // Číslice vybírají dlaždici — plné ovládání klávesnicí (kap. 10).
    if (rezim === 'ritual' && stavRitualu && e.key >= '1' && e.key <= '9') {
      const volby = volbyRitualu(stavRitualu);
      const index = Number(e.key) - 1;
      if (index < volby.length) {
        e.preventDefault();
        cekaVolba = volby[index];
      }
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

  /** Jeden krok simulace té fáze, která zrovna běží. */
  function krokFaze(): void {
    if (rezim === 'otevirani' || rezim === 'ukazkaOtevirani') {
      if (!stavOtevirani) return;
      const vstup = ukazkaOtevirani ? ukazkaOtevirani.stisk(stavOtevirani) : cekaStisk;
      cekaStisk = false;
      if (krokOtevirani(stavOtevirani, vstup) !== 'hotovo') return;

      if (rezim === 'ukazkaOtevirani') spustOtevirani(false);
      else spustRozlevani(maUkazky());
      return;
    }

    if (rezim === 'rozlevani' || rezim === 'ukazkaRozlevani') {
      if (krok(stav, ukazka ? ukazka.drzi(stav) : drzi) !== 'hotovo') return;

      if (rezim === 'ukazkaRozlevani') spustRozlevani(false);
      else spustRitual(maUkazky());
      return;
    }

    if (rezim === 'ritual' || rezim === 'ukazkaRitual') {
      if (!stavRitualu) return;
      const vstup = ukazkaRitualu
        ? ukazkaRitualu.vstup(stavRitualu)
        : { drzi, stisk: cekaStisk, volba: cekaVolba };
      cekaStisk = false;
      cekaVolba = null;
      if (krokRitualu(stavRitualu, vstup) !== 'hotovo') return;

      if (rezim === 'ukazkaRitual') spustRitual(false);
      else dokoncLevel();
    }
  }

  function bezici(): boolean {
    return rezim !== 'karta' && rezim !== 'vysledek' && rezim !== 'konec';
  }

  function odkrokuj(): void {
    if (!bezici() || document.hidden) return;

    let kroku = 0;
    while (dluh >= KROK_S && kroku < MAX_KROKU_ZA_SNIMEK && bezici()) {
      krokFaze();
      dluh -= KROK_S;
      kroku += 1;
    }
    if (dluh > KROK_S * MAX_KROKU_ZA_SNIMEK) dluh = 0;
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
    rozvrh = r;

    const cil = stred(r, Math.max(0, stav.aktivni));
    cilXPlynule =
      cilXPlynule < 0 ? cil : cilXPlynule + (cil - cilXPlynule) * Math.min(1, dt * DOJEZD);

    vykresli(platno, r, paleta, {
      rezim,
      stav,
      otevirani: stavOtevirani,
      ritual: stavRitualu,
      vysledek,
      poloha: polohaLahve(r, stav.konfig.lahev, cilXPlynule, stav.naklonPodil),
      skore,
      karta: texty.karty[stav.konfig.level.cislo] ?? null,
      patkaKarty: texty.vysledek.dal,
      // Předání po ukázce zmizí, jakmile hráč poprvé nalije — dál už je
      // nápověda potřebnější než upozornění, že je na řadě.
      poUkazce: poUkazce && stav.aktivni === 0 && stav.faze === 'ceka',
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
