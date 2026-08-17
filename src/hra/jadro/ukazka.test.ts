/**
 * Ukázky na levelu 1.
 *
 * Tohle je test proti **zaseknutí**. Ukázka řídí vstup místo hráče, takže
 * když se nedokáže trefit do lišty nebo zapomene na některou dlaždici,
 * fáze nikdy neskončí a level 1 se nedá dohrát — a protože běží sama,
 * nemá to kdo odklikat. Jediná obrana je projet ji celou bez prohlížeče.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KROK_S } from '../ladeni.ts';
import { krokOtevirani, zalozOtevirani } from './otevirani.ts';
import { krokRitualu, vypusteno, zalozRitual } from './ritual.ts';
import { krok, zalozKonfiguraci, zalozStav } from './rozlevani.ts';
import {
  pripravUkazku,
  pripravUkazkuOtevirani,
  pripravUkazkuRitualu,
} from './ukazka.ts';

/** Strop kroků na jednu ukázku — třicet vteřin herního času bohatě stačí. */
const STROP = Math.ceil(30 / KROK_S);

describe('ukázka otevírání', () => {
  it('sedře pečeť a vytáhne korek, aniž by se do toho někdo musel opřít', () => {
    const stav = zalozOtevirani(1);
    const ukazka = pripravUkazkuOtevirani();

    let kroku = 0;
    while (stav.faze !== 'hotovo' && kroku < STROP) {
      krokOtevirani(stav, ukazka.stisk(stav));
      kroku += 1;
    }

    assert.equal(stav.faze, 'hotovo', `zasekla se na fázi ${stav.faze}`);
    assert.ok(stav.body > 0, 'ukázka má trefovat pásmo, ne mlátit vedle');
    assert.ok(kroku * KROK_S < 12, `trvala ${(kroku * KROK_S).toFixed(1)} s — to nikdo nedokouká`);
  });
});

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
  it('projde všemi kroky a Bulibana opravdu vypustí', () => {
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

    // Předvést se má celý sled, ne jen jeho konec — hráč ho pak zopakuje.
    for (const faze of ['poloha', 'zahrivani', 'uzaver', 'ohen', 'ceka']) {
      assert.ok(videno.has(faze), `ukázka přeskočila fázi ${faze}`);
    }
  });

  it('hřeje přes střed pásma, protože láhev do zážehu vychladne', () => {
    // Tohle je ta lekce, kvůli které ukázka existuje. U dlaní (setrvačnost
    // +1, chladnutí 1,5 j/s) sebere uzávěr, zápalka a čekání na zážeh víc,
    // než kolik setrvačnost přidá — pouštět se tedy musí NAD pásmem.
    // Kdyby to hráč zkusil „pustit v pásmu", zapálí studenou láhev.
    const ukazka = pripravUkazkuRitualu(1, 7);
    const stav = zalozRitual(1, 7);
    assert.ok(
      ukazka.plan.pustitPri > stav.pasmo.stred,
      `plán pouští při ${ukazka.plan.pustitPri.toFixed(1)}, střed pásma je ${stav.pasmo.stred}`,
    );
    // Ale ne o moc — jinak by pásmo nešlo trefit vůbec.
    assert.ok(
      ukazka.plan.pustitPri < stav.pasmo.stred + stav.pasmo.sirka,
      'kompenzace nesmí být větší než celé pásmo',
    );
  });
});
