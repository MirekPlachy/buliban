/**
 * Invarianty fáze 2 z kap. 15 herního designu.
 *
 * Běží bez prohlížeče: `npm test`
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DOZNENI_S,
  KAPACITA_LAHVE_ML,
  KAPACITA_PANAKU_ML,
  KROK_S,
  NAKLON_S,
} from '../ladeni.ts';
import { POSLEDNI_LEVEL, STROP_PANAKU, level, levely } from '../levely.ts';
import { idealniDrzeni, prehraj } from './prehravac.ts';
import { krok, zalozKonfiguraci, zalozStav } from './rozlevani.ts';
import type { FazeRozlevani } from './rozlevani.ts';

const soucet = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/** Scénář, který nalije do každého panáku stejně dlouho. */
const stejne = (panaku: number, delka: number): number[] =>
  new Array<number>(panaku).fill(delka);

describe('konfigurace levelu', () => {
  it('objem se rovná N × cíl a vejde se do panáků na stole', () => {
    for (let cislo = 1; cislo <= POSLEDNI_LEVEL; cislo += 1) {
      for (let seed = 1; seed <= 40; seed += 1) {
        const k = zalozKonfiguraci(cislo, seed);
        assert.ok(Math.abs(k.objemMl - k.panaku * k.cilMl) < 1e-9, `L${cislo} seed ${seed}`);
        assert.ok(k.cilMl <= KAPACITA_PANAKU_ML, 'cíl se musí vejít do panáku');
        assert.ok(k.objemMl <= k.panaku * KAPACITA_PANAKU_ML, 'obsah láhve se musí vejít na stůl');
      }
    }
  });

  it('láhev je vždycky půllitrová', () => {
    for (let cislo = 1; cislo <= POSLEDNI_LEVEL; cislo += 1) {
      const k = zalozKonfiguraci(cislo, 3);
      assert.equal(k.kapacitaLahveMl, KAPACITA_LAHVE_ML);
      assert.ok(k.objemMl < KAPACITA_LAHVE_ML, 'obsah se musí do láhve vejít');
    }
  });

  it('osm levelů, strop osm panáků, žádný nekonečný režim', () => {
    assert.equal(POSLEDNI_LEVEL, 8);
    assert.equal(level(1).panaku, 2);
    assert.equal(level(2).panaku, 2);
    assert.equal(level(3).panaku, 3);
    assert.equal(level(8).panaku, STROP_PANAKU);
    assert.equal(level(50).cislo, 8, 'za posledním levelem se hra nepokračuje');
    for (const l of levely) assert.ok(l.panaku <= STROP_PANAKU, `L${l.cislo} má ${l.panaku} panáků`);
  });

  it('ryska svítí jen v prvním levelu a ukázka taky jen v něm', () => {
    assert.deepEqual(
      levely.filter((l) => l.ryska).map((l) => l.cislo),
      [1],
    );
    assert.deepEqual(
      levely.filter((l) => l.ukazka).map((l) => l.cislo),
      [1],
    );
  });
});

describe('zachování objemu', () => {
  it('nalito + rozlito + zbytek = objem láhve', () => {
    for (let cislo = 1; cislo <= POSLEDNI_LEVEL; cislo += 1) {
      for (let seed = 1; seed <= 15; seed += 1) {
        const konfig = zalozKonfiguraci(cislo, seed);
        const { stav, dokonceno } = prehraj(cislo, seed, stejne(konfig.panaku, 1.4));

        assert.ok(dokonceno, `L${cislo} seed ${seed}: level nedoběhl`);
        assert.ok(
          Math.abs(soucet(stav.panaky) + stav.rozlitoMl + stav.zbytekMl - konfig.objemMl) < 1e-6,
          `L${cislo} seed ${seed}: objem se neshoduje`,
        );
      }
    }
  });

  it('žádný panák nepřeteče přes svoji kapacitu', () => {
    const konfig = zalozKonfiguraci(8, 3);
    const { stav } = prehraj(8, 3, stejne(konfig.panaku, 4));
    for (const v of stav.panaky) {
      assert.ok(v <= KAPACITA_PANAKU_ML + 1e-9, `panák má ${v} ml`);
    }
    assert.ok(stav.prelitiPocet > 0, 'čtyřsekundové nalití musí přetéct');
    assert.ok(stav.rozlitoMl > 0, 'přebytek se má rozlít, ne zmizet');
  });

  it('přelití jednoho panáku je jedna událost, ne pokuta za každý krok', () => {
    const { stav } = prehraj(8, 3, [4]);
    assert.equal(stav.prelitiPocet, 1);
  });

  it('přelití spustí animaci, kterou pohání herní čas', () => {
    const { konfig } = prehraj(8, 3, [4]);
    const stav = zalozStav(konfig);
    for (let i = 0; i < 240; i += 1) krok(stav, true);
    assert.ok(stav.prelitiCasS > 0, 'po přelití má běžet animace');
  });
});

describe('železná pravidla', () => {
  it('posledního panáka lije hráč — automaticky se nedolévá nic', () => {
    const konfig = zalozKonfiguraci(4, 11);
    // Skoupá nalití: v láhvi musí zbýt rum, protože ho nikdo nedolije.
    const { stav } = prehraj(4, 11, stejne(konfig.panaku, 0.55));
    assert.ok(stav.zbytekMl > 1, `v láhvi mělo zbýt, zbylo ${stav.zbytekMl.toFixed(1)} ml`);
    const posledni = stav.panaky[konfig.panaku - 1];
    const prvni = stav.panaky[0];
    assert.ok(
      Math.abs(posledni - prvni) < prvni * 0.5,
      'poslední panák už není zúčtování, lije se do něj jako do ostatních',
    );
  });

  it('do panáku, kde už něco je, se nedá dolít', () => {
    const konfig = zalozKonfiguraci(6, 7);
    const stav = zalozStav(zalozKonfiguraci(6, 7));

    const uzavrene: number[] = [];
    let faze: FazeRozlevani = stav.faze;
    for (let index = 0; index < konfig.panaku; index += 1) {
      const kroku = Math.round(1.1 / KROK_S);
      for (let i = 0; i < kroku && faze !== 'hotovo'; i += 1) faze = krok(stav, true);
      while (faze !== 'ceka' && faze !== 'hotovo') faze = krok(stav, false);
      uzavrene.push(stav.panaky[index]);
    }

    for (let i = 0; i < uzavrene.length; i += 1) {
      assert.ok(Math.abs(stav.panaky[i] - uzavrene[i]) < 1e-9, `panák ${i} se po uzavření změnil`);
    }
  });

  it('hraje se i s dvěma panáky', () => {
    const { stav, konfig, dokonceno } = prehraj(1, 5, [1.0, 1.0]);
    assert.ok(dokonceno);
    assert.equal(konfig.panaku, 2);
    assert.ok(
      Math.abs(soucet(stav.panaky) + stav.rozlitoMl + stav.zbytekMl - konfig.objemMl) < 1e-6,
    );
  });

  it('když rum dojde dřív než panáky, zbývající zůstanou prázdné', () => {
    const konfig = zalozKonfiguraci(9, 21);
    const { stav, dokonceno } = prehraj(9, 21, stejne(konfig.panaku, 6));
    assert.ok(dokonceno);
    assert.ok(stav.zbytekMl < 1e-9);
    assert.ok(
      stav.panaky.some((v) => v === 0),
      'na poslední panáky nemělo zbýt',
    );
  });
});

describe('náklon láhve', () => {
  it('teče až po otočení láhve, ne hned po stisku', () => {
    const stav = zalozStav(zalozKonfiguraci(5, 2));
    const kroku = Math.floor((NAKLON_S / KROK_S) * 0.8);
    for (let i = 0; i < kroku; i += 1) krok(stav, true);
    assert.equal(stav.faze, 'naklani');
    assert.equal(stav.panaky[0], 0, 'během otáčení nesmí nic natéct');
    assert.ok(stav.naklonPodil > 0 && stav.naklonPodil < 1);
  });

  it('puštění během otáčení nic nestojí a panák zůstane otevřený', () => {
    const stav = zalozStav(zalozKonfiguraci(5, 2));
    for (let i = 0; i < 10; i += 1) krok(stav, true);
    for (let i = 0; i < 60; i += 1) krok(stav, false);

    assert.equal(stav.faze, 'ceka', 'láhev se má narovnat a čekat');
    assert.equal(stav.aktivni, 0, 'panák se nesmí uzavřít');
    assert.equal(stav.panaky[0], 0);
    assert.ok(stav.naklonPodil < 1e-9, 'láhev se má narovnat úplně');

    // A pak se do téhož panáku dá normálně nalít.
    for (let i = 0; i < 120; i += 1) krok(stav, true);
    assert.ok(stav.panaky[0] > 0);
  });
});

describe('doznění před výsledkem', () => {
  it('mezi posledním panákem a výsledkem je prodleva', () => {
    const konfig = zalozKonfiguraci(1, 4);
    const stav = zalozStav(konfig);
    let faze: FazeRozlevani = stav.faze;
    let videnoDozniva = false;

    for (let i = 0; i < 4000 && faze !== 'hotovo'; i += 1) {
      // Drží první tři čtvrtiny každé vteřiny — projde tím celý level.
      faze = krok(stav, i % 90 < 66);
      if (faze === 'dozniva') videnoDozniva = true;
    }

    assert.equal(faze, 'hotovo');
    assert.ok(videnoDozniva, 'fáze doznění se má objevit');
    assert.ok(DOZNENI_S > 0);
  });
});

describe('determinismus', () => {
  it('stejný seed a stejné vstupy dají identický výsledek', () => {
    const drzeni = [1.2, 0.8, 1.5, 0.4, 2.0, 1.1];
    const a = prehraj(7, 424242, drzeni);
    const b = prehraj(7, 424242, drzeni);
    assert.deepEqual(a.stav.panaky, b.stav.panaky);
    assert.equal(a.vysledek.celkem, b.vysledek.celkem);
    assert.equal(a.vysledek.odchylka, b.vysledek.odchylka);
  });

  it('jiný seed dá jiné podmínky', () => {
    assert.notEqual(zalozKonfiguraci(4, 1).cilMl, zalozKonfiguraci(4, 2).cilMl);
  });
});

describe('hratelnost', () => {
  it('dokonalé rozlití je dosažitelné na každém levelu', () => {
    for (const l of levely) {
      const seed = 1234 + l.cislo;
      const { vysledek } = prehraj(l.cislo, seed, idealniDrzeni(l.cislo, seed));
      assert.ok(
        vysledek.medaile === 'zlato',
        `L${l.cislo}: ideální držení dalo odchylku ${vysledek.odchylka.toFixed(4)} ` +
          `při toleranci ${l.tolerance} — na zlato to nestačí`,
      );
    }
  });
});
