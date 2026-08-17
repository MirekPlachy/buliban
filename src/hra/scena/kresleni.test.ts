/**
 * Kouřová zkouška vykreslování.
 *
 * Scéna se nedá otestovat na to, jestli **vypadá** dobře — to pozná jen oko.
 * Dá se ale otestovat, že se vůbec nakreslí: že žádný režim nesahá na stav,
 * který v něm ještě neexistuje, a že se všechny fáze projdou bez výjimky.
 *
 * Přesně tahle chyba je totiž nejdražší: spadne až v prohlížeči, uprostřed
 * levelu, a v terminálu po ní nezůstane nic. Typová kontrola ji nechytí,
 * protože `ritual` je v pohledu schválně `| null`.
 *
 * Druhá věc, kterou soubor hlídá, je **geometrie rituálu**: láhev se musí
 * vejít nad teploměr i s prostorem na plamen a zápalka musí ležet tak, aby
 * na ni šlo sáhnout. Obojí se dá spočítat bez plátna.
 *
 * Plátno je náhražka — `Proxy`, který spolkne každé volání.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { krokRitualu, zalozRitual } from '../jadro/ritual.ts';
import type { FazeRitualu, StavRitualu } from '../jadro/ritual.ts';
import { zalozKonfiguraci, zalozStav } from '../jadro/rozlevani.ts';
import { slozLevel, vyhodnot } from '../jadro/skore.ts';
import * as texty from '../texty.ts';
import type { Paleta } from './barvy.ts';
import { vykresli } from './index.ts';
import type { Pohled, Rezim } from './index.ts';
import type { Platno } from './platno.ts';
import { geometrieRitualu, naLahvi, naZapalce, uHrdla } from './ritual.ts';
import { polohaLahve, spocitejRozvrh } from './rozvrh.ts';
import type { Rozvrh } from './rozvrh.ts';

const paleta: Paleta = {
  sklo: '#0d1f1a',
  skloStin: '#16302a',
  rum: '#c8862b',
  rumSvetlo: '#e8b25c',
  par: '#cfe3d8',
  zazeh: '#5bd1ff',
  zhava: '#ff6b35',
};

/** Kontext, který všechno spolkne. Vrací jen to, na co se kód ptá zpět. */
function falesnyKontext(): CanvasRenderingContext2D {
  const prechod = { addColorStop: () => {} };
  const cil = {
    measureText: () => ({ width: 42 }),
    createLinearGradient: () => prechod,
    createRadialGradient: () => prechod,
  } as unknown as Record<string, unknown>;

  return new Proxy(cil, {
    get(_t, klic) {
      if (klic in cil) return cil[klic as string];
      return typeof klic === 'string' && klic.startsWith('create')
        ? () => prechod
        : () => {};
    },
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
}

function falesnePlatno(sirka: number, vyska: number): Platno {
  return { ctx: falesnyKontext(), sirka, vyska, svet: () => {}, znic: () => {} };
}

/** Rozvrh pro daný level a plochu. */
function rozvrhPro(sirka: number, vyska: number, cisloLevelu = 3): Rozvrh {
  const stav = zalozStav(zalozKonfiguraci(cisloLevelu, 1));
  return spocitejRozvrh(
    sirka,
    vyska,
    stav.konfig.panaku,
    stav.konfig.kapacitaLahveMl,
    stav.konfig.lahev,
    stav.konfig.panak,
  );
}

/** Rituál natřený do pásma a se zápalkou v ruce. */
function ritualSeZapalkou(): StavRitualu {
  const stav = zalozRitual(3, 3);
  for (let i = 0; i < 400; i += 1) {
    krokRitualu(stav, { treni: 2 / 60, drziZapalku: false, uHrdla: false });
  }
  krokRitualu(stav, { treni: 0, drziZapalku: true, uHrdla: false });
  return stav;
}

function pohledPro(rezim: Rezim, r: Rozvrh): Pohled {
  const stav = zalozStav(zalozKonfiguraci(3, 1));
  return {
    rezim,
    stav,
    ritual: ritualSeZapalkou(),
    vysledek: slozLevel(vyhodnot(stav), 640, true),
    poloha: polohaLahve(r, stav.konfig.lahev, r.sirka / 2, 0),
    ukazatel: { x: r.sirka / 2, y: r.plochaY + r.plochaVyska / 2 },
    skore: 4321,
    karta: texty.karty[1] ?? null,
    patkaKarty: texty.vysledek.dal,
    poUkazce: false,
    medaile: ['🥇', '🥈'],
    debug: false,
    seed: 1,
  };
}

const REZIMY: Rezim[] = [
  'karta',
  'ukazkaRozlevani',
  'rozlevani',
  'ukazkaRitual',
  'ritual',
  'vysledek',
  'konec',
];

/** Od nejmenšího telefonu po velký monitor — rozvrh se s plochou mění. */
const PLOCHY: [number, number][] = [
  [320, 480],
  [390, 844],
  [1024, 768],
  [1920, 1080],
];

describe('vykreslení nespadne', () => {
  it('v žádném režimu a na žádné obrazovce', () => {
    for (const [sirka, vyska] of PLOCHY) {
      const r = rozvrhPro(sirka, vyska);
      for (const rezim of REZIMY) {
        assert.doesNotThrow(
          () => vykresli(falesnePlatno(sirka, vyska), r, paleta, pohledPro(rezim, r)),
          `${rezim} na ${sirka}×${vyska}`,
        );
      }
    }
  });

  it('i s ladicím panelem', () => {
    const r = rozvrhPro(1024, 768);
    for (const rezim of REZIMY) {
      assert.doesNotThrow(() =>
        vykresli(falesnePlatno(1024, 768), r, paleta, {
          ...pohledPro(rezim, r),
          debug: true,
        }),
      );
    }
  });

  it('když stav fáze ještě neexistuje — režim se přepíná dřív než stav', () => {
    const r = rozvrhPro(1024, 768);
    for (const rezim of REZIMY) {
      assert.doesNotThrow(
        () =>
          vykresli(falesnePlatno(1024, 768), r, paleta, {
            ...pohledPro(rezim, r),
            ritual: null,
            vysledek: null,
            karta: null,
            ukazatel: null,
          }),
        `${rezim} bez stavu fáze`,
      );
    }
  });

  it('ve všech fázích rituálu', () => {
    const r = rozvrhPro(1024, 768, 5);
    const faze: FazeRitualu[] = ['zahrivani', 'zapalka', 'zazeh', 'ticho'];

    for (const f of faze) {
      const ritual = ritualSeZapalkou();
      ritual.faze = f;
      ritual.kvalita = 0.8;
      assert.doesNotThrow(
        () =>
          vykresli(falesnePlatno(1024, 768), r, paleta, {
            ...pohledPro('ritual', r),
            ritual,
          }),
        `fáze ${f}`,
      );
    }
  });
});

describe('geometrie rituálu', () => {
  it('láhev se vejde nad teploměr i s prostorem na plamen', () => {
    // Regrese: rozměry láhve v `Rozvrh` jsou spočítané pro kompozici
    // rozlévání a do zbytku plochy se nevejdou. Na notebooku vylezlo ústí
    // za horní lištu a s ním i plamen — tedy pointa celé hry.
    for (const [sirka, vyska] of PLOCHY) {
      for (const cisloLevelu of [1, 4, 8]) {
        const r = rozvrhPro(sirka, vyska, cisloLevelu);
        const g = geometrieRitualu(r);
        const kde = `${sirka}×${vyska} L${cisloLevelu}`;

        assert.ok(g.usti.y > r.plochaY, `${kde}: ústí vyjelo nad plochu`);
        assert.ok(
          g.poloha.y <= r.plochaY + r.plochaVyska * 0.86,
          `${kde}: dno leze na teploměr`,
        );
        assert.ok(g.vyska > 40, `${kde}: láhev se zmenšila na nic`);

        // Nad hrdlem musí zbýt na plamen — jinak nebude vidět zážeh.
        assert.ok(
          g.usti.y - r.plochaY >= g.polomer * 3,
          `${kde}: nad hrdlem není místo na plamen`,
        );
      }
    }
  });

  it('na hrdlo i na zápalku se dá sáhnout a nepletou se', () => {
    for (const [sirka, vyska] of PLOCHY) {
      const g = geometrieRitualu(rozvrhPro(sirka, vyska));
      const kde = `${sirka}×${vyska}`;

      assert.ok(uHrdla(g, g.usti.x, g.usti.y), `${kde}: hrdlo nejde trefit`);
      assert.ok(naZapalce(g, g.zapalkaDoma.x, g.zapalkaDoma.y), `${kde}: zápalka nejde vzít`);
      assert.ok(
        !uHrdla(g, g.zapalkaDoma.x, g.zapalkaDoma.y),
        `${kde}: zápalka leží rovnou v hrdle, tím by se fáze přeskočila`,
      );
    }
  });

  it('tře se jen po skle, ne vedle láhve', () => {
    const g = geometrieRitualu(rozvrhPro(1024, 768));
    const stred = g.poloha.y - g.vyska / 2;

    assert.ok(naLahvi(g, g.poloha.x, stred), 'střed láhve musí platit');
    assert.ok(naLahvi(g, g.poloha.x, g.poloha.y - g.vyska * 0.95), 'i horní část');
    assert.ok(!naLahvi(g, g.poloha.x + g.polomer * 4, stred), 'vedle láhve ne');
    assert.ok(!naLahvi(g, g.poloha.x, g.poloha.y + 60), 'pod dnem ne');
    assert.ok(!naLahvi(g, g.poloha.x, g.usti.y - 60), 'nad hrdlem ne');
  });

  it('zápalka leží stranou od láhve, aby ji tření nezvedalo', () => {
    for (const [sirka, vyska] of PLOCHY) {
      const g = geometrieRitualu(rozvrhPro(sirka, vyska));
      assert.ok(
        !naLahvi(g, g.zapalkaDoma.x, g.zapalkaDoma.y),
        `${sirka}×${vyska}: zápalka leží na skle — sáhnutí po ní by hřálo`,
      );
    }
  });
});
