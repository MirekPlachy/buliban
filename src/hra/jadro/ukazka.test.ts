/**
 * Ukázky na levelu 1.
 *
 * Tohle je test proti **zaseknutí**. Ukázka řídí vstup místo hráče, takže
 * když se netrefí nebo zapomene na některý krok, fáze nikdy neskončí a level 1
 * se nedá dohrát — a protože běží sama, nemá to kdo odklikat. Jediná obrana
 * je projet ji celou bez prohlížeče.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KROK_S } from '../ladeni.ts';
import { krokRitualu, vypusteno, zalozRitual } from './ritual.ts';
import { krok, zalozKonfiguraci, zalozStav } from './rozlevani.ts';
import { pripravUkazku, pripravUkazkuRitualu } from './ukazka.ts';

/** Strop kroků na jednu ukázku — třicet vteřin herního času bohatě stačí. */
const STROP = Math.ceil(30 / KROK_S);

describe('ukázka rozlévání', () => {
  it('rozlije láhev do všech panáků', () => {
    const konfig = zalozKonfiguraci(1, 7);
    const stav = zalozStav(konfig);
    const ukazka = pripravUkazku(1, 7);

    let kroku = 0;
    while (stav.faze !== 'hotovo' && kroku < STROP) {
      krok(stav, ukazka.drzi(stav));
      kroku += 1;
    }

    assert.equal(stav.faze, 'hotovo');
    assert.ok(stav.zbytekMl < 1, `v láhvi zbylo ${stav.zbytekMl.toFixed(1)} ml`);
  });
});

describe('ukázka rituálu', () => {
  it('natře láhev, vezme zápalku a Bulibana opravdu vypustí', () => {
    const stav = zalozRitual(1, 7);
    const ukazka = pripravUkazkuRitualu(1, 7);

    const videno = new Set<string>();
    let kroku = 0;
    while (stav.faze !== 'hotovo' && kroku < STROP) {
      videno.add(stav.faze);
      krokRitualu(stav, ukazka.vstup(stav));
      kroku += 1;
    }

    assert.equal(stav.faze, 'hotovo', `zasekla se na fázi ${stav.faze}`);
    assert.ok(vypusteno(stav), 'ukázka musí předvést úspěch, ne ticho po pěšině');
    for (const faze of ['zahrivani', 'zapalka']) {
      assert.ok(videno.has(faze), `ukázka přeskočila fázi ${faze}`);
    }
  });

  it('je krátká — nikdo nebude čekat půl minuty', () => {
    const stav = zalozRitual(1, 7);
    const ukazka = pripravUkazkuRitualu(1, 7);

    let kroku = 0;
    while (stav.faze !== 'hotovo' && kroku < STROP) {
      krokRitualu(stav, ukazka.vstup(stav));
      kroku += 1;
    }
    assert.ok(kroku * KROK_S < 12, `trvala ${(kroku * KROK_S).toFixed(1)} s`);
  });

  it('bere zápalku dřív, než teploměr doleze doprostřed pásma', () => {
    // Tohle je lekce, kvůli které ukázka existuje: než zápalka doputuje
    // k hrdlu a než to chytne, láhev kus tepla ztratí. Kdo čeká na střed
    // pásma, zapaluje už vychladlou láhev.
    const ukazka = pripravUkazkuRitualu(1, 7);
    const stav = zalozRitual(1, 7);
    assert.ok(
      ukazka.vzitPri > stav.pasmo.stred,
      `bere při ${ukazka.vzitPri.toFixed(1)}, střed pásma je ${stav.pasmo.stred}`,
    );
    assert.ok(
      ukazka.vzitPri < stav.pasmo.stred + stav.pasmo.sirka,
      'ale ne tak vysoko, aby pásmo přeletěla',
    );
  });
});
