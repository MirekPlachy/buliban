/**
 * Kouřová zkouška vykreslování.
 *
 * Scéna se nedá otestovat na to, jestli **vypadá** dobře — to pozná jen oko.
 * Dá se ale otestovat, že se vůbec nakreslí: že žádný režim nesahá na stav,
 * který v něm ještě neexistuje, a že se všechny fáze projdou bez výjimky.
 *
 * Přesně tahle chyba je totiž nejdražší: spadne až v prohlížeči, uprostřed
 * levelu, a v terminálu po ní nezůstane nic. Typová kontrola ji nechytí,
 * protože `otevirani` i `ritual` jsou v pohledu schválně `| null`.
 *
 * Plátno je náhražka — `Proxy`, který spolkne každé volání. Nic nekreslí,
 * jen dovolí kód projet pod holým Node.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { zalozOtevirani, krokOtevirani } from '../jadro/otevirani.ts';
import type { StavOtevirani } from '../jadro/otevirani.ts';
import { krokRitualu, zalozRitual } from '../jadro/ritual.ts';
import type { FazeRitualu, StavRitualu } from '../jadro/ritual.ts';
import { zalozKonfiguraci, zalozStav } from '../jadro/rozlevani.ts';
import { slozLevel, vyhodnot } from '../jadro/skore.ts';
import * as texty from '../texty.ts';
import type { Paleta } from './barvy.ts';
import { vykresli } from './index.ts';
import type { Pohled, Rezim } from './index.ts';
import { lahevOtevirani } from './otevirani.ts';
import type { Platno } from './platno.ts';
import { lahevRitualu } from './ritual.ts';
import { polohaLahve, spocitejRozvrh } from './rozvrh.ts';

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
      // Vlastnosti (fillStyle, font, …) se čtou i zapisují; metody se volají.
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

/** Rituál dohnaný do konkrétní fáze, ať se dá vykreslit každá. */
function ritualVeFazi(cil: FazeRitualu): StavRitualu {
  const stav = zalozRitual(5, 3);
  const nic = { drzi: false, stisk: false, volba: null };

  krokRitualu(stav, { ...nic, volba: { druh: 'poloha', poloha: 'horizontalni' } });
  if (cil === 'zahrivani') return stav;

  krokRitualu(stav, { ...nic, volba: { druh: 'metoda', metoda: 'dlane' } });
  for (let i = 0; i < 400; i += 1) krokRitualu(stav, { ...nic, drzi: true });
  krokRitualu(stav, { ...nic, volba: { druh: 'uzaver' } });
  if (cil === 'uzaver') return stav;

  let faze: FazeRitualu = stav.faze;
  let pojistka = 0;
  while (faze !== 'ohen' && pojistka < 400) {
    faze = krokRitualu(stav, nic);
    pojistka += 1;
  }
  if (cil === 'ohen') return stav;

  krokRitualu(stav, {
    ...nic,
    volba: { druh: 'ohen', ohen: cil === 'skrtani' ? 'zapalka' : 'zapalovac' },
  });
  if (cil === 'skrtani') return stav;

  pojistka = 0;
  while (stav.faze !== cil && pojistka < 4000) {
    krokRitualu(stav, { ...nic, drzi: true });
    pojistka += 1;
  }
  return stav;
}

function otevraniVeFazi(cil: 'pecet' | 'korek'): StavOtevirani {
  const stav = zalozOtevirani(3);
  if (cil === 'pecet') return stav;
  let pojistka = 0;
  while (stav.faze !== 'korek' && pojistka < 2000) {
    krokOtevirani(stav, stav.faze === 'pecet');
    pojistka += 1;
  }
  return stav;
}

function pohledPro(rezim: Rezim, r: ReturnType<typeof spocitejRozvrh>): Pohled {
  const stav = zalozStav(zalozKonfiguraci(3, 1));
  const rozlevani = vyhodnot(stav);

  return {
    rezim,
    stav,
    otevirani: otevraniVeFazi('korek'),
    ritual: ritualVeFazi('zahrivani'),
    vysledek: slozLevel(180, rozlevani, 640, true),
    poloha: polohaLahve(r, stav.konfig.lahev, r.sirka / 2, 0),
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
  'ukazkaOtevirani',
  'otevirani',
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
      const stav = zalozStav(zalozKonfiguraci(3, 1));
      const r = spocitejRozvrh(
        sirka,
        vyska,
        stav.konfig.panaku,
        stav.konfig.kapacitaLahveMl,
        stav.konfig.lahev,
        stav.konfig.panak,
      );

      for (const rezim of REZIMY) {
        assert.doesNotThrow(
          () => vykresli(falesnePlatno(sirka, vyska), r, paleta, pohledPro(rezim, r)),
          `${rezim} na ${sirka}×${vyska}`,
        );
      }
    }
  });

  it('i s ladicím panelem', () => {
    const stav = zalozStav(zalozKonfiguraci(3, 1));
    const r = spocitejRozvrh(
      1024,
      768,
      stav.konfig.panaku,
      stav.konfig.kapacitaLahveMl,
      stav.konfig.lahev,
      stav.konfig.panak,
    );
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
    // Přesně tohle nastane mezi kartou a první fází: `rezim` už je jinde,
    // ale `otevirani` i `ritual` jsou pořád `null`.
    const stav = zalozStav(zalozKonfiguraci(1, 1));
    const r = spocitejRozvrh(
      1024,
      768,
      stav.konfig.panaku,
      stav.konfig.kapacitaLahveMl,
      stav.konfig.lahev,
      stav.konfig.panak,
    );

    for (const rezim of REZIMY) {
      assert.doesNotThrow(
        () =>
          vykresli(falesnePlatno(1024, 768), r, paleta, {
            ...pohledPro(rezim, r),
            otevirani: null,
            ritual: null,
            vysledek: null,
            karta: null,
          }),
        `${rezim} bez stavu fáze`,
      );
    }
  });
});

describe('všechny fáze rituálu se dají nakreslit', () => {
  it('od volby polohy po prasklé sklo', () => {
    const stav = zalozStav(zalozKonfiguraci(5, 3));
    const r = spocitejRozvrh(
      1024,
      768,
      stav.konfig.panaku,
      stav.konfig.kapacitaLahveMl,
      stav.konfig.lahev,
      stav.konfig.panak,
    );

    const faze: FazeRitualu[] = [
      'poloha',
      'zahrivani',
      'uzaver',
      'ohen',
      'skrtani',
      'ceka',
      'zazeh',
      'ticho',
      'prasklo',
    ];

    for (const f of faze) {
      const ritual = ritualVeFazi(f);
      // `ritualVeFazi` se do některých fází dostat nemusí (zážeh závisí na
      // losu) — kreslí se tedy to, co vyšlo, plus ručně nastavená fáze.
      ritual.faze = f;
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

describe('láhev se vejde do svého pásu', () => {
  it('v rituálu nevyleze nad plochu ani přes teploměr', () => {
    // Regrese: rozměry láhve v `Rozvrh` jsou spočítané pro kompozici
    // rozlévání a do zbytku plochy se nevejdou. Na notebooku vylezlo ústí
    // za horní lištu a s ním i plamen — tedy pointa celé hry.
    for (const [sirka, vyska] of PLOCHY) {
      for (const cisloLevelu of [1, 4, 8]) {
        const stav = zalozStav(zalozKonfiguraci(cisloLevelu, 1));
        const r = spocitejRozvrh(
          sirka,
          vyska,
          stav.konfig.panaku,
          stav.konfig.kapacitaLahveMl,
          stav.konfig.lahev,
          stav.konfig.panak,
        );
        const { rozvrh: rl, cy } = lahevRitualu(r);
        const H = rl.lahevVyska;
        const kde = `${sirka}×${vyska} L${cisloLevelu}`;

        // Nastojato: od dna po ústí. Naležato: totéž, jen vodorovně.
        assert.ok(cy - H / 2 >= r.plochaY, `${kde}: ústí vyjelo nad plochu`);
        assert.ok(
          cy + H / 2 <= r.plochaY + r.plochaVyska * 0.56,
          `${kde}: dno leze přes teploměr`,
        );
        assert.ok(H <= r.sloupec, `${kde}: ležatá láhev je širší než sloupec`);
        assert.ok(H > 40, `${kde}: láhev se zmenšila na nic (${H.toFixed(0)} px)`);
      }
    }
  });

  it('při otevírání nevyleze nad plochu ani na timing lištu', () => {
    for (const [sirka, vyska] of PLOCHY) {
      const stav = zalozStav(zalozKonfiguraci(3, 1));
      const r = spocitejRozvrh(
        sirka,
        vyska,
        stav.konfig.panaku,
        stav.konfig.kapacitaLahveMl,
        stav.konfig.lahev,
        stav.konfig.panak,
      );
      const { rozvrh: rl, cy } = lahevOtevirani(r);
      const H = rl.lahevVyska;
      const kde = `${sirka}×${vyska}`;

      assert.ok(cy - H / 2 >= r.plochaY, `${kde}: ústí vyjelo nad plochu`);
      assert.ok(
        cy + H / 2 <= r.plochaY + r.plochaVyska * 0.82,
        `${kde}: dno leze na timing lištu`,
      );
      assert.ok(H > 40, `${kde}: láhev se zmenšila na nic`);
    }
  });
});

describe('všechny fáze otevírání se dají nakreslit', () => {
  it('od pečeti po vytažený korek', () => {
    const stav = zalozStav(zalozKonfiguraci(3, 1));
    const r = spocitejRozvrh(
      1024,
      768,
      stav.konfig.panaku,
      stav.konfig.kapacitaLahveMl,
      stav.konfig.lahev,
      stav.konfig.panak,
    );

    for (const f of ['pecet', 'pecetHotova', 'korek', 'zasek', 'hotovo'] as const) {
      const otevirani = otevraniVeFazi(f === 'pecet' ? 'pecet' : 'korek');
      otevirani.faze = f;
      assert.doesNotThrow(
        () =>
          vykresli(falesnePlatno(1024, 768), r, paleta, {
            ...pohledPro('otevirani', r),
            otevirani,
          }),
        `fáze ${f}`,
      );
    }
  });
});
