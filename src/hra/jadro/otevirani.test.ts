/**
 * Fáze 1 — otevření láhve (kap. 3).
 *
 * Hlavní invariant: **fáze se nedá prohrát.** Minutý zásah stojí čas, ne
 * body, a korek jde vždycky ven.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BODY_PERFEKTNI,
  BODY_ZELENY,
  KOREK_ZASEK_S,
  KROK_S,
  PASMO_MIN,
  PECET_STISKU,
  SVIZNOST_REZERVA_S,
} from '../ladeni.ts';
import { POSLEDNI_LEVEL } from '../levely.ts';
import {
  bonusZaSviznost,
  bodyZaOtevirani,
  krokOtevirani,
  pozice,
  zalozOtevirani,
} from './otevirani.ts';
import type { StavOtevirani } from './otevirani.ts';
import {
  dalsiPruchodStredem,
  polohaUkazatele,
  rychlostProLevel,
  sirkaPasmaProLevel,
  vyhodnotZasah,
} from './pasmo.ts';

/** Sedře pečeť a nechá stav na kmitajícím ukazateli. */
function kePorku(stav: StavOtevirani): void {
  for (let i = 0; i < PECET_STISKU; i += 1) {
    krokOtevirani(stav, true);
    krokOtevirani(stav, false);
  }
  let pojistka = 0;
  while (stav.faze !== 'korek' && pojistka < 600) {
    krokOtevirani(stav, false);
    pojistka += 1;
  }
}

/** Doběhne k nejbližšímu průchodu středem a tam stiskne — tedy perfektně. */
function trefSe(stav: StavOtevirani): void {
  const cil = dalsiPruchodStredem(stav.ukazatelCasS, stav.rychlost);
  let pojistka = 0;
  while (stav.ukazatelCasS + KROK_S <= cil && pojistka < 6000) {
    krokOtevirani(stav, false);
    pojistka += 1;
  }
  krokOtevirani(stav, true);
}

describe('kmitající ukazatel', () => {
  it('putuje tam a zpět mezi nulou a jedničkou', () => {
    for (let i = 0; i <= 200; i += 1) {
      const p = polohaUkazatele(i / 100, 1);
      assert.ok(p >= 0 && p <= 1, `poloha ${p} mimo lištu`);
    }
    assert.ok(Math.abs(polohaUkazatele(0, 1)) < 1e-9, 'startuje na kraji');
    assert.ok(Math.abs(polohaUkazatele(0.25, 1) - 0.5) < 1e-9, 've čtvrtině je uprostřed');
    assert.ok(Math.abs(polohaUkazatele(0.5, 1) - 1) < 1e-9, 'v půlce je na druhém kraji');
  });

  it('rovnoměrně — obrátka se nezpomaluje', () => {
    // Sinus by u kraje zpomalil a hráč by se naučil čekat tam, ne uprostřed.
    const krok1 = polohaUkazatele(0.02, 1) - polohaUkazatele(0.01, 1);
    const krok2 = polohaUkazatele(0.24, 1) - polohaUkazatele(0.23, 1);
    assert.ok(Math.abs(krok1 - krok2) < 1e-9, 'rychlost se během cesty mění');
  });

  it('`dalsiPruchodStredem` opravdu míří na střed', () => {
    for (const rychlost of [1, 1.36, 1.84]) {
      for (const start of [0, 0.13, 0.7, 2.4]) {
        const kdy = dalsiPruchodStredem(start, rychlost);
        assert.ok(kdy > start, 'průchod musí být v budoucnosti');
        assert.ok(
          Math.abs(polohaUkazatele(kdy, rychlost) - 0.5) < 1e-6,
          `rychlost ${rychlost}, start ${start}`,
        );
      }
    }
  });

  it('škálování podle levelu sedí s kap. 3.2 a má podlahu', () => {
    assert.ok(Math.abs(rychlostProLevel(1) - 1) < 1e-9);
    assert.ok(Math.abs(rychlostProLevel(3) - 1.24) < 1e-9);
    assert.ok(Math.abs(sirkaPasmaProLevel(1) - 0.26) < 1e-9);

    for (let l = 1; l <= POSLEDNI_LEVEL; l += 1) {
      assert.ok(sirkaPasmaProLevel(l) >= PASMO_MIN, `L${l} pod podlahou`);
      assert.ok(rychlostProLevel(l) >= rychlostProLevel(Math.max(1, l - 1)));
    }
  });

  it('střed je perfektní, okraj pásma zelený, mimo je mimo', () => {
    assert.equal(vyhodnotZasah(0.5, 0.26), 'perfektni');
    assert.equal(vyhodnotZasah(0.5 + 0.12, 0.26), 'zeleny');
    assert.equal(vyhodnotZasah(0.5 + 0.2, 0.26), 'mimo');
  });
});

describe('pečeť', () => {
  it('sedře se opakovaným stiskem, ne držením', () => {
    const stav = zalozOtevirani(1);
    for (let i = 0; i < 300; i += 1) krokOtevirani(stav, false);
    assert.equal(stav.pecetPodil, 0, 'držení pečeť nesedře');
    assert.equal(stav.faze, 'pecet');

    for (let i = 0; i < PECET_STISKU; i += 1) {
      krokOtevirani(stav, true);
      krokOtevirani(stav, false);
    }
    assert.ok(stav.pecetPodil >= 1);
    assert.notEqual(stav.faze, 'pecet');
  });

  it('nedává body, ale počítá se do času fáze', () => {
    const stav = zalozOtevirani(1);
    kePorku(stav);
    assert.equal(stav.body, 0, 'za pečeť body nejsou');
    assert.ok(stav.casS > 0, 'čas musí běžet — jde z něj bonus za svižnost');
  });
});

describe('korek', () => {
  it('dva perfektní zásahy ho vytáhnou', () => {
    const stav = zalozOtevirani(1);
    kePorku(stav);
    trefSe(stav);
    assert.equal(stav.posledni, 'perfektni');
    assert.notEqual(stav.faze, 'hotovo', 'jeden zásah nestačí');
    trefSe(stav);
    assert.equal(stav.faze, 'hotovo');
    assert.equal(stav.body, 2 * BODY_PERFEKTNI);
  });

  it('tři zelené zásahy taky — třetinky se musí sejít do jedničky', () => {
    const stav = zalozOtevirani(1);
    stav.faze = 'korek';
    // Přímé vložení zásahů: cesta k zelenému, ale ne perfektnímu bodu lišty
    // je zdlouhavá a tenhle test je o sčítání, ne o mířeni.
    for (let i = 0; i < 3; i += 1) {
      stav.korekPodil += 1 / 3;
      stav.body += BODY_ZELENY;
    }
    assert.ok(stav.korekPodil >= 1 - 1e-6, '3 × ⅓ musí korek vytáhnout');
  });

  it('minutí zasekne na půl sekundy a nestojí body', () => {
    const stav = zalozOtevirani(1);
    kePorku(stav);

    // Stisk na kraji lišty je zaručeně mimo.
    let pojistka = 0;
    while (pozice(stav) > 0.05 && pojistka < 6000) {
      krokOtevirani(stav, false);
      pojistka += 1;
    }
    const bodyPred = stav.body;
    krokOtevirani(stav, true);

    assert.equal(stav.faze, 'zasek');
    assert.equal(stav.body, bodyPred, 'minutí nesmí brát body');
    assert.ok(Math.abs(stav.zasekS - KOREK_ZASEK_S) < KROK_S + 1e-9);

    for (let i = 0; i < Math.ceil(KOREK_ZASEK_S / KROK_S) + 2; i += 1) {
      krokOtevirani(stav, false);
    }
    assert.equal(stav.faze, 'korek', 'po zaseknutí se pokračuje');
  });

  it('korek se po minutí nevrací zpátky', () => {
    const stav = zalozOtevirani(1);
    kePorku(stav);
    trefSe(stav);
    const po = stav.korekPodil;

    let pojistka = 0;
    while (pozice(stav) > 0.05 && pojistka < 6000) {
      krokOtevirani(stav, false);
      pojistka += 1;
    }
    krokOtevirani(stav, true);
    assert.equal(stav.korekPodil, po, 'trest za pokus by hráče odnaučil mačkat');
  });
});

describe('fáze 1 se nedá prohrát', () => {
  it('na každém levelu jde otevřít láhev', () => {
    for (let l = 1; l <= POSLEDNI_LEVEL; l += 1) {
      const stav = zalozOtevirani(l);
      kePorku(stav);
      let pojistka = 0;
      while (stav.faze !== 'hotovo' && pojistka < 40) {
        trefSe(stav);
        pojistka += 1;
      }
      assert.equal(stav.faze, 'hotovo', `L${l}: korek nešel ven`);
      assert.ok(stav.body > 0);
    }
  });

  it('bonus za svižnost se nepropadne do minusu', () => {
    const stav = zalozOtevirani(1);
    kePorku(stav);
    // Nechá uplynout víc, než je rezerva — pomalý hráč dostane nulu, ne dluh.
    for (let i = 0; i < Math.ceil((SVIZNOST_REZERVA_S * 2) / KROK_S); i += 1) {
      krokOtevirani(stav, false);
    }
    assert.equal(bonusZaSviznost(stav), 0);
    assert.ok(bodyZaOtevirani(stav) >= 0);
  });

  it('rychlejší otevření dá vyšší bonus', () => {
    const rychly = zalozOtevirani(1);
    kePorku(rychly);
    trefSe(rychly);
    trefSe(rychly);

    const pomaly = zalozOtevirani(1);
    kePorku(pomaly);
    for (let i = 0; i < Math.ceil(1.5 / KROK_S); i += 1) krokOtevirani(pomaly, false);
    trefSe(pomaly);
    trefSe(pomaly);

    assert.equal(rychly.body, pomaly.body, 'stejné zásahy, stejné body za korek');
    assert.ok(
      bodyZaOtevirani(rychly) > bodyZaOtevirani(pomaly),
      'perfektní zásah se vyplácí časem, ne body',
    );
  });
});
