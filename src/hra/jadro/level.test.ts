/**
 * Level jako celek: rozlévání → rituál → body.
 *
 * Jednotlivé fáze si hlídají vlastní testy. Tenhle soubor hlídá **jejich
 * složení** — že se sečtou body z obou a že se bez vypuštění Bulibana
 * nepostupuje dál (kap. 2 a 5.3).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ZAZEH_POKUSU } from '../ladeni.ts';
import { POSLEDNI_LEVEL, level } from '../levely.ts';
import {
  TRENI_SVIZNE,
  idealniDrzeni,
  idealniPlan,
  prehraj,
  prehrajRitual,
} from './prehravac.ts';
import { vypusteno } from './ritual.ts';
import { slozLevel, vyhodnot } from './skore.ts';

/** Odehraje celý level tak, jak ho hraje dokonalý hráč. */
function odehrajLevel(cisloLevelu: number, seed: number) {
  const { stav } = prehraj(cisloLevelu, seed, idealniDrzeni(cisloLevelu, seed));
  const ritual = prehrajRitual(cisloLevelu, seed, idealniPlan(cisloLevelu, seed));

  return {
    ritual,
    vysledek: slozLevel(vyhodnot(stav), ritual.body, vypusteno(ritual)),
  };
}

describe('level má dvě fáze', () => {
  it('obě doběhnou na každém levelu', () => {
    for (let l = 1; l <= POSLEDNI_LEVEL; l += 1) {
      const { ritual } = odehrajLevel(l, 300 + l);
      assert.equal(ritual.faze, 'hotovo', `L${l}: rituál nedoběhl`);
    }
  });

  it('body se sečtou z obou fází', () => {
    const { vysledek } = odehrajLevel(3, 303);
    assert.ok(vysledek.rozlevani.celkem > 0, 'rozlévání má dát body');
    assert.ok(vysledek.zazeh > 0, 'zážeh má dát body');
    assert.equal(vysledek.celkem, vysledek.rozlevani.celkem + vysledek.zazeh);
  });

  it('dokonalá hra vypustí Bulibana na každém levelu', () => {
    for (let l = 1; l <= POSLEDNI_LEVEL; l += 1) {
      const { vysledek } = odehrajLevel(l, 300 + l);
      assert.ok(vysledek.vypusteno, `L${l}: bez vypuštění se nepostupuje dál`);
      assert.equal(vysledek.medaile, 'zlato', `L${l}: dokonalé rozlití má brát zlato`);
    }
  });

  it('rozlévání zůstává největší složkou skóre', () => {
    // Kap. 2 dělá z rozlévání jádro hry. Kdyby ho zážeh přebil, vyplatilo by
    // se rozlévání odbýt — a hra by přestala být o tom, o čem má být.
    for (let l = 1; l <= POSLEDNI_LEVEL; l += 1) {
      const { vysledek } = odehrajLevel(l, 300 + l);
      assert.ok(
        vysledek.rozlevani.celkem > vysledek.zazeh,
        `L${l}: zážeh (${vysledek.zazeh}) přebil rozlévání (${vysledek.rozlevani.celkem})`,
      );
    }
  });
});

describe('bez vypuštění se nepostupuje', () => {
  it('studená láhev znamená nula za zážeh a konec hry', () => {
    const { stav } = prehraj(2, 55, idealniDrzeni(2, 55));
    // Sáhnout po zápalce hned: láhev zůstane studená a všechny tři pokusy
    // skončí tichem po pěšině.
    const ritual = prehrajRitual(2, 55, { treniZaS: TRENI_SVIZNE, vzitPri: 1 });
    const vysledek = slozLevel(vyhodnot(stav), ritual.body, vypusteno(ritual));

    assert.equal(vysledek.zazeh, 0);
    assert.equal(vysledek.vypusteno, false, 'tohle je jediný fail state ve hře');
    assert.equal(ritual.pokus, ZAZEH_POKUSU, 'musí se vyčerpat všechny pokusy');
    // Rozlévání se přesto počítá — fáze 2 se prohrát nedá (kap. 4.8).
    assert.ok(vysledek.rozlevani.celkem > 0);
    assert.ok(vysledek.celkem > 0);
  });

  it('medaile zůstává za rozlévání, ne za zážeh', () => {
    const { stav } = prehraj(2, 55, idealniDrzeni(2, 55));
    const nevypusteno = slozLevel(vyhodnot(stav), 0, false);

    assert.equal(
      nevypusteno.medaile,
      'zlato',
      'dokonalé rozlití má brát zlato i bez vypuštění Bulibana',
    );
  });
});

describe('ukázky', () => {
  it('hrají se jen na prvním levelu, a to u obou fází', () => {
    assert.equal(level(1).ukazka, true);
    for (let l = 2; l <= POSLEDNI_LEVEL; l += 1) {
      assert.equal(level(l).ukazka, false, `L${l} už ukázku mít nemá`);
    }
  });
});
