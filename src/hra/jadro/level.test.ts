/**
 * Level jako celek: otevření → rozlévání → rituál → body.
 *
 * Jednotlivé fáze si hlídají vlastní testy. Tenhle soubor hlídá **jejich
 * složení** — tedy to, co se dřív nedalo pokazit, protože level měl jen
 * jednu fázi: že se sečtou body ze všech tří a že se bez vypuštění Bulibana
 * nepostupuje dál (kap. 2 a 5.3).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ZAZEH_POKUSU } from '../ladeni.ts';
import { POSLEDNI_LEVEL, level } from '../levely.ts';
import { bodyZaOtevirani } from './otevirani.ts';
import { idealniDrzeni, idealniPlan, prehrajOtevirani, prehrajRitual } from './prehravac.ts';
import { prehraj } from './prehravac.ts';
import { vypusteno } from './ritual.ts';
import { slozLevel, vyhodnot } from './skore.ts';

/** Odehraje celý level tak, jak ho hraje dokonalý hráč. */
function odehrajLevel(cisloLevelu: number, seed: number) {
  const otevirani = prehrajOtevirani(cisloLevelu);
  const { stav } = prehraj(cisloLevelu, seed, idealniDrzeni(cisloLevelu, seed));
  const ritual = prehrajRitual(cisloLevelu, seed, idealniPlan(cisloLevelu, seed));

  return {
    otevirani,
    ritual,
    vysledek: slozLevel(
      bodyZaOtevirani(otevirani),
      vyhodnot(stav),
      ritual.body,
      vypusteno(ritual),
    ),
  };
}

describe('level má tři fáze', () => {
  it('všechny tři doběhnou na každém levelu', () => {
    for (let l = 1; l <= POSLEDNI_LEVEL; l += 1) {
      const seed = 300 + l;
      const { otevirani, ritual } = odehrajLevel(l, seed);
      assert.equal(otevirani.faze, 'hotovo', `L${l}: láhev se neotevřela`);
      assert.equal(ritual.faze, 'hotovo', `L${l}: rituál nedoběhl`);
    }
  });

  it('body se sečtou ze všech tří fází', () => {
    const { vysledek } = odehrajLevel(3, 303);
    assert.ok(vysledek.otevirani > 0, 'otevření má dát body');
    assert.ok(vysledek.rozlevani.celkem > 0, 'rozlévání má dát body');
    assert.ok(vysledek.zazeh > 0, 'zážeh má dát body');
    assert.equal(
      vysledek.celkem,
      vysledek.otevirani + vysledek.rozlevani.celkem + vysledek.zazeh,
    );
  });

  it('dokonalá hra vypustí Bulibana na každém levelu', () => {
    for (let l = 1; l <= POSLEDNI_LEVEL; l += 1) {
      const seed = 300 + l;
      const { vysledek } = odehrajLevel(l, seed);
      assert.ok(vysledek.vypusteno, `L${l}: bez vypuštění se nepostupuje dál`);
      assert.equal(vysledek.medaile, 'zlato', `L${l}: dokonalé rozlití má brát zlato`);
    }
  });

  it('rozlévání zůstává největší složkou skóre', () => {
    // Kap. 2 dělí body 10 / 50 / 40 %. Přesné podíly se doladí playtestem,
    // ale jádro hry nesmí přebít ani otevření, ani zážeh — jinak by se
    // vyplatilo rozlévání odbýt.
    for (let l = 1; l <= POSLEDNI_LEVEL; l += 1) {
      const seed = 300 + l;
      const { vysledek } = odehrajLevel(l, seed);
      assert.ok(
        vysledek.rozlevani.celkem > vysledek.otevirani,
        `L${l}: otevření (${vysledek.otevirani}) přebilo rozlévání (${vysledek.rozlevani.celkem})`,
      );
      assert.ok(
        vysledek.rozlevani.celkem > vysledek.zazeh,
        `L${l}: zážeh (${vysledek.zazeh}) přebil rozlévání (${vysledek.rozlevani.celkem})`,
      );
    }
  });

  it('otevření je záměrně drobné — do pár stovek bodů', () => {
    for (let l = 1; l <= POSLEDNI_LEVEL; l += 1) {
      const otevirani = prehrajOtevirani(l);
      assert.ok(
        bodyZaOtevirani(otevirani) <= 280,
        `L${l}: strop fáze 1 z kap. 3.2 je ~280, je ${bodyZaOtevirani(otevirani)}`,
      );
    }
  });
});

describe('bez vypuštění se nepostupuje', () => {
  it('studená láhev znamená nula za zážeh a konec hry', () => {
    const otevirani = prehrajOtevirani(2);
    const { stav } = prehraj(2, 55, idealniDrzeni(2, 55));
    // Pustit hned na začátku: láhev zůstane studená a všechny tři pokusy
    // skončí tichem po pěšině.
    const ritual = prehrajRitual(2, 55, {
      poloha: 'horizontalni',
      metodaId: 'dlane',
      ohen: 'zapalovac',
      pustitPri: 1,
    });

    const vysledek = slozLevel(
      bodyZaOtevirani(otevirani),
      vyhodnot(stav),
      ritual.body,
      vypusteno(ritual),
    );

    assert.equal(vysledek.zazeh, 0);
    assert.equal(vysledek.vypusteno, false, 'tohle je jediný fail state ve hře');
    assert.equal(ritual.pokus, ZAZEH_POKUSU, 'musí se vyčerpat všechny pokusy');
    // Rozlévání se přesto počítá — fáze 2 se prohrát nedá (kap. 4.8).
    assert.ok(vysledek.rozlevani.celkem > 0);
    assert.ok(vysledek.celkem > 0);
  });

  it('medaile zůstává za rozlévání, ne za zážeh', () => {
    const otevirani = prehrajOtevirani(2);
    const { stav } = prehraj(2, 55, idealniDrzeni(2, 55));
    const nevypusteno = slozLevel(bodyZaOtevirani(otevirani), vyhodnot(stav), 0, false);

    assert.equal(
      nevypusteno.medaile,
      'zlato',
      'dokonalé rozlití má brát zlato i bez vypuštění Bulibana',
    );
  });
});

describe('ukázky', () => {
  it('hraje se jen na prvním levelu, a to u všech tří fází', () => {
    assert.equal(level(1).ukazka, true);
    for (let l = 2; l <= POSLEDNI_LEVEL; l += 1) {
      assert.equal(level(l).ukazka, false, `L${l} už ukázku mít nemá`);
    }
  });
});
