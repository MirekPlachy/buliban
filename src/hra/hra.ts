/**
 * Herní smyčka, vstup a průchod levely.
 *
 * **Jeden level = dvě fáze:** rozlévání → rituál. Teprve když je Buliban
 * vypuštěný, jde se dál (kap. 2). Level 1 má před každou fází ukázku, ve které
 * hra hraje sama sebe; od levelu 2 už žádnou.
 *
 * Simulace běží na **pevný krok**, vykreslování na snímky. Bez toho by hráč
 * na 144Hz monitoru naléval jinak než na 60Hz a celá hra o přesnosti
 * dávkování by se rozpadla (kap. 9).
 *
 * Vstup má dva tvary, protože fáze dělají s lahví dvě různé věci:
 *  - **držení** — nalévání,
 *  - **tažení** — tření po skle a přiložení zápalky k hrdlu.
 *
 * Tření se měří jako **dráha po láhvi mezi dvěma kroky simulace**, v podílech
 * výšky láhve. Pixely by znamenaly, že na velkém monitoru je hra několikrát
 * rychlejší, protože láhev je tam větší.
 */

import { KROK_S, MAX_KROKU_ZA_SNIMEK, UKAZKA_ZPOMALENI } from './ladeni.ts';
import { POSLEDNI_LEVEL, level } from './levely.ts';
import { ZADNY_VSTUP, krokRitualu, vypusteno, zalozRitual } from './jadro/ritual.ts';
import type { StavRitualu, VstupRitualu } from './jadro/ritual.ts';
import { krok, zalozKonfiguraci, zalozStav } from './jadro/rozlevani.ts';
import type { StavRozlevani } from './jadro/rozlevani.ts';
import { slozLevel, vyhodnot } from './jadro/skore.ts';
import type { Medaile, VysledekLevelu } from './jadro/skore.ts';
import { pripravUkazku, pripravUkazkuRitualu } from './jadro/ukazka.ts';
import type { Ukazka, UkazkaRitualu } from './jadro/ukazka.ts';
import * as texty from './texty.ts';
import { nactiPaletu } from './scena/barvy.ts';
import { tlacitkoZpet } from './scena/hud.ts';
import { pripravPlatno } from './scena/platno.ts';
import { geometrieRitualu, naLahvi, naZapalce, uHrdla } from './scena/ritual.ts';
import { polohaLahve, spocitejRozvrh, stred } from './scena/rozvrh.ts';
import type { Bod, Rozvrh } from './scena/rozvrh.ts';
import { vykresli } from './scena/index.ts';
import type { Rezim } from './scena/index.ts';

export interface Nastaveni {
  seed: number;
  level: number;
  debug: boolean;
  /** Adresa, kam vede tlačítko „zpět na web" v horní liště. */
  zpet: string;
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
  let stavRitualu: StavRitualu | null = null;
  let ukazka: Ukazka | null = null;
  let ukazkaRitualu: UkazkaRitualu | null = null;
  let vysledek: VysledekLevelu | null = null;
  let skore = 0;
  let medaile: string[] = [];

  let cilXPlynule = -1;
  let drzi = false;
  let cekaNaPusteni = false;
  let poUkazce = false;
  let bezi = true;

  /** Poslední spočítaný rozvrh — potřebuje ho trefování láhve a zápalky. */
  let rozvrh: Rozvrh | null = null;
  /** Kde je prst nebo myš, dokud se drží. */
  let ukazatel: Bod | null = null;
  /** Kde byl v minulém kroku simulace — z rozdílu plyne dráha tření. */
  let ukazatelMinule: Bod | null = null;
  /** Hráč vzal zápalku a ještě ji nepustil. */
  let drziZapalku = false;

  function novyStav(): StavRozlevani {
    const konfig = zalozKonfiguraci(cisloLevelu, seed);
    if (bezSumu) konfig.level.amplituda = 0;
    return zalozStav(konfig);
  }

  function maUkazky(): boolean {
    return level(cisloLevelu).ukazka;
  }

  // ------------------------------------------------------- fáze levelu

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
    drziZapalku = false;
    ukazatel = null;
    ukazatelMinule = null;
  }

  /**
   * Připraví level. Sled je **karta → (ukázka) rozlévání → (ukázka) rituál →
   * výsledek**. Ukázku má podle `levely.ts` jen level 1.
   */
  function zalozLevel(): void {
    stav = novyStav();
    stavRitualu = null;
    ukazka = null;
    ukazkaRitualu = null;
    vysledek = null;
    drzi = false;
    drziZapalku = false;
    ukazatel = null;
    ukazatelMinule = null;
    cekaNaPusteni = false;
    poUkazce = false;
    cilXPlynule = -1;
    rezim = texty.karty[cisloLevelu] ? 'karta' : 'rozlevani';
    if (rezim === 'rozlevani') spustRozlevani(maUkazky());
  }

  stav = novyStav();
  zalozLevel();

  function dokoncLevel(): void {
    vysledek = slozLevel(
      vyhodnot(stav),
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

  function stisk(x?: number, y?: number): void {
    // Tlačítko zpět žije v liště, která se nekreslí jen na závěrečné
    // obrazovce — jinde funguje kdykoli, i uprostřed čekání na puštění.
    if (x !== undefined && y !== undefined && rozvrh && rezim !== 'konec') {
      const t = tlacitkoZpet(platno.ctx, rozvrh);
      if (x >= t.x && x <= t.x + t.sirka && y >= t.y && y <= t.y + t.vyska) {
        window.location.href = nastaveni.zpet;
        return;
      }
    }

    if (cekaNaPusteni) return;

    switch (rezim) {
      case 'karta':
        spustRozlevani(maUkazky());
        break;
      // Stisk během ukázky ji přeskočí — hráč přebírá tutéž fázi.
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
      case 'rozlevani':
        drzi = true;
        break;
      case 'ritual': {
        if (x === undefined || y === undefined || !rozvrh || !stavRitualu) break;
        ukazatel = { x, y };
        ukazatelMinule = { x, y };
        // Sáhnout se dá po zápalce, nebo na sklo. Zápalka se bere jen
        // z místa, kde leží — jinak by ji šlo „vzít" odkudkoli.
        const g = geometrieRitualu(rozvrh);
        if (stavRitualu.faze === 'zahrivani' && naZapalce(g, x, y)) drziZapalku = true;
        break;
      }
    }

    // Přechod nesmí spadnout rovnou do dalšího: jeden stisk, jeden krok.
    if (rezim === 'karta' || rezim === 'vysledek' || rezim === 'konec') cekaNaPusteni = true;
  }

  function pusteni(): void {
    drzi = false;
    cekaNaPusteni = false;
    drziZapalku = false;
    ukazatel = null;
    ukazatelMinule = null;
  }

  const bodZUdalosti = (e: PointerEvent): Bod => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const naPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const bod = bodZUdalosti(e);
    stisk(bod.x, bod.y);
  };

  const naPointerMove = (e: PointerEvent): void => {
    if (!ukazatel) return;
    e.preventDefault();
    // Jen se zaznamená, kde prst je. Dráhu spočítá až krok simulace —
    // jinak by na 144Hz monitoru tření hřálo víc než na 60Hz.
    ukazatel = bodZUdalosti(e);
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
  canvas.addEventListener('pointermove', naPointerMove);
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

  /**
   * Vstup rituálu za jeden krok simulace.
   *
   * Tření platí **jen po skle**: dráha se počítá z posunu ukazatele, a to
   * jen tehdy, když je i jeho nová poloha na láhvi. Dělí se výškou láhve,
   * takže tentýž pohyb zahřeje stejně na telefonu i na monitoru.
   */
  function vstupRitualu(): VstupRitualu {
    if (!rozvrh || !stavRitualu || !ukazatel) return ZADNY_VSTUP;
    const g = geometrieRitualu(rozvrh);

    let treni = 0;
    if (!drziZapalku && ukazatelMinule && naLahvi(g, ukazatel.x, ukazatel.y)) {
      const draha = Math.hypot(
        ukazatel.x - ukazatelMinule.x,
        ukazatel.y - ukazatelMinule.y,
      );
      treni = draha / g.vyska;
    }
    ukazatelMinule = { ...ukazatel };

    return {
      treni,
      drziZapalku,
      uHrdla: drziZapalku && uHrdla(g, ukazatel.x, ukazatel.y),
    };
  }

  /** Jeden krok simulace té fáze, která zrovna běží. */
  function krokFaze(): void {
    if (rezim === 'rozlevani' || rezim === 'ukazkaRozlevani') {
      if (krok(stav, ukazka ? ukazka.drzi(stav) : drzi) !== 'hotovo') return;

      if (rezim === 'ukazkaRozlevani') spustRozlevani(false);
      else spustRitual(maUkazky());
      return;
    }

    if (rezim === 'ritual' || rezim === 'ukazkaRitual') {
      if (!stavRitualu) return;
      const vstup = ukazkaRitualu ? ukazkaRitualu.vstup(stavRitualu) : vstupRitualu();
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
    // Ukázka běží zpomaleně, ať se komentáře dají dočíst. Je to násobek
    // času, ne jiná simulace — na výsledek ukázky nemá vliv.
    const ukazkaBezi = rezim === 'ukazkaRozlevani' || rezim === 'ukazkaRitual';
    dluh += dt * casovyNasobek * (ukazkaBezi ? UKAZKA_ZPOMALENI : 1);
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
      ritual: stavRitualu,
      vysledek,
      poloha: polohaLahve(r, stav.konfig.lahev, cilXPlynule, stav.naklonPodil),
      // Ukázka drží zápalku „sama", takže scéna nemá kde vzít její polohu —
      // dostane `null` a nakreslí ji u hrdla.
      ukazatel: ukazkaRitualu ? null : ukazatel,
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
    canvas.removeEventListener('pointermove', naPointerMove);
    canvas.removeEventListener('pointerup', naPointerUp);
    canvas.removeEventListener('pointercancel', naPointerUp);
    window.removeEventListener('keydown', naKeyDown);
    window.removeEventListener('keyup', naKeyUp);
    window.removeEventListener('blur', naOdchod);
    document.removeEventListener('visibilitychange', naViditelnost);
  };
}
