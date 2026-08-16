/**
 * Bodování a hraniční hodnoty odchylky (kap. 4.7, kap. 15).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CIL_MAX_ML,
  CIL_MIN_ML,
  KAPACITA_PANAKU_ML,
  POKUTA_ZA_ML,
  PRESNA_RUKA_ODCHYLKA,
} from '../ladeni.ts';
import { levely } from '../levely.ts';
import { nahoda } from './nahoda.ts';
import { lidskeDrzeni, prehraj } from './prehravac.ts';
import { zalozKonfiguraci, zalozStav } from './rozlevani.ts';
import { medaileZPodilu, odchylkaOdCile, tolerancePro, vyhodnot } from './skore.ts';

/** Stav s ručně nastavenými panáky — bodování se testuje bez simulace. */
function stavSPanaky(cisloLevelu: number, panaky: number[], casS = 0) {
  const konfig = zalozKonfiguraci(cisloLevelu, 1);
  const stav = zalozStav(konfig);
  stav.panaky = panaky;
  stav.casS = casS;
  stav.faze = 'hotovo';
  stav.zbytekMl = Math.max(0, konfig.objemMl - panaky.reduce((a, b) => a + b, 0));
  return stav;
}

describe('odchylka od cíle', () => {
  it('přesně nalité panáky mají odchylku nula', () => {
    assert.equal(odchylkaOdCile([25, 25, 25], 25), 0);
  });

  it('měří i systematickou chybu, ne jen rozdíly mezi panáky', () => {
    // Tohle je ta vlastnost, kvůli které se metrika měnila: variační
    // koeficient by u obou dal nulu, protože panáky jsou mezi sebou shodné.
    assert.equal(odchylkaOdCile([20, 20, 20], 20), 0);
    assert.ok(Math.abs(odchylkaOdCile([10, 10, 10], 20) - 0.5) < 1e-12);
  });

  it('prázdné panáky nedají dělení nulou', () => {
    assert.equal(odchylkaOdCile([0, 0], 0), Number.POSITIVE_INFINITY);
  });
});

describe('bodování', () => {
  it('dokonalé rozlití bere plný základ a zlatou medaili', () => {
    const konfig = zalozKonfiguraci(4, 1);
    const stav = stavSPanaky(4, new Array<number>(konfig.panaku).fill(konfig.cilMl), 100);
    const v = vyhodnot(stav);
    assert.equal(v.odchylka, 0);
    assert.equal(v.vyrovnanost, 1);
    assert.equal(v.rovnomernost, konfig.level.zakladBodu);
    assert.equal(v.medaile, 'zlato');
    assert.ok(v.presnaRuka);
  });

  it('rovnoměrně málo nalité panáky nejsou dokonalá hra', () => {
    // Jádro celé změny bodování. Se starým `CV` okolo průměru by tenhle
    // případ dal nulovou odchylku a zlato — hráč by nalil do všech stejně
    // a nechal si půl láhve stranou.
    const konfig = zalozKonfiguraci(4, 1);
    const polovina = new Array<number>(konfig.panaku).fill(konfig.cilMl / 2);
    const v = vyhodnot(stavSPanaky(4, polovina, 5));

    assert.ok(Math.abs(v.odchylka - 0.5) < 1e-12, 'odchylka od cíle má být 50 %');
    assert.equal(v.medaile, null);
    assert.ok(v.pokutaZbytek > 0, 'a ještě pokuta za rum, který zůstal v láhvi');
  });

  it('mimo toleranci je za rovnoměrnost nula, ale level se dokončí', () => {
    const v = vyhodnot(stavSPanaky(4, [40, 2, 40, 2], 100));
    assert.ok(v.odchylka > v.tolerance);
    assert.equal(v.rovnomernost, 0);
    assert.equal(v.medaile, null);
    assert.ok(v.celkem >= 0, 'skóre nesmí spadnout pod nulu');
  });

  it('přesně na hranici tolerance je nula, ne záporná hodnota', () => {
    const konfig = zalozKonfiguraci(4, 1);
    const t = tolerancePro(konfig.level, konfig.cilMl);
    const panaky = new Array<number>(konfig.panaku).fill(konfig.cilMl * (1 + t));
    const v = vyhodnot(stavSPanaky(4, panaky));
    assert.ok(Math.abs(v.odchylka - t) < 1e-12);
    // Přesně na hranici zbude z `1 − odchylka/tolerance` numerický prach;
    // podstatné je, že se z něj nesmí stát body ani záporná hodnota.
    assert.ok(v.vyrovnanost >= 0 && v.vyrovnanost < 1e-9);
    assert.equal(v.rovnomernost, 0);
  });

  it('bonus za čas se nikdy nepropadne do minusu', () => {
    const konfig = zalozKonfiguraci(4, 1);
    const panaky = new Array<number>(konfig.panaku).fill(konfig.cilMl);
    assert.equal(vyhodnot(stavSPanaky(4, panaky, 9999)).casovyBonus, 0);
  });

  it('přelití, rozlití i zbytek v láhvi se počítají zvlášť', () => {
    const konfig = zalozKonfiguraci(4, 1);
    const stav = stavSPanaky(4, new Array<number>(konfig.panaku).fill(konfig.cilMl), 5);
    stav.prelitiPocet = 1;
    stav.rozlitoMl = 10;
    stav.zbytekMl = 20;

    const v = vyhodnot(stav);
    assert.equal(v.pokutaPreliti, 150);
    assert.equal(v.pokutaRozlito, 10 * POKUTA_ZA_ML);
    assert.equal(v.pokutaZbytek, 20 * POKUTA_ZA_ML);
    assert.equal(v.pokuty, v.pokutaPreliti + v.pokutaRozlito + v.pokutaZbytek);
  });

  it('odchylky se počítají od cíle, ne od průměru — linka rovnosti leží na cíli', () => {
    const konfig = zalozKonfiguraci(3, 1);
    const v = vyhodnot(stavSPanaky(3, [konfig.cilMl - 5, konfig.cilMl + 5]));
    assert.equal(v.cilMl, konfig.cilMl);
    assert.deepEqual(v.odchylkyMl, [-5, 5]);
  });

  it('přesná ruka je vzácná — těsně nad prahem už nepatří', () => {
    const konfig = zalozKonfiguraci(4, 1);
    const nad = konfig.cilMl * (1 + PRESNA_RUKA_ODCHYLKA * 1.1);
    assert.equal(
      vyhodnot(stavSPanaky(4, new Array<number>(konfig.panaku).fill(nad))).presnaRuka,
      false,
    );
  });
});

describe('medaile', () => {
  it('prahy se měří na vyrovnanosti E', () => {
    assert.equal(medaileZPodilu(0.95), 'zlato');
    assert.equal(medaileZPodilu(0.777), 'zlato');
    assert.equal(medaileZPodilu(0.77), 'stribro');
    assert.equal(medaileZPodilu(0.611), 'stribro');
    assert.equal(medaileZPodilu(0.5), 'bronz');
    assert.equal(medaileZPodilu(0.43), null);
  });

  it('zlato odpovídá odchylce kolem pětiny tolerance', () => {
    const konfig = zalozKonfiguraci(4, 1);
    const t = tolerancePro(konfig.level, konfig.cilMl);
    const uvnitr = konfig.cilMl * (1 + t * 0.2);
    const vne = konfig.cilMl * (1 + t * 0.3);
    assert.equal(vyhodnot(stavSPanaky(4, new Array<number>(konfig.panaku).fill(uvnitr))).medaile, 'zlato');
    assert.notEqual(vyhodnot(stavSPanaky(4, new Array<number>(konfig.panaku).fill(vne))).medaile, 'zlato');
  });
});

describe('spravedlnost vůči vylosovanému cíli', () => {
  // Cíl se losuje a hráč ho nezná. Nesmí tedy rozhodovat o tom, jak přísně
  // se hodnotí — jinak dostane stejný výkon jednou zlato a jindy nic.

  it('cíl se vejde do panáku i s chybou', () => {
    assert.ok(
      CIL_MAX_ML <= KAPACITA_PANAKU_ML * 0.8,
      'nad cílem musí zbýt kus panáku, kam přetéct',
    );
    assert.ok(CIL_MIN_ML > 0);
  });

  it('tolerance v mililitrech se s malým cílem nesmršťuje úměrně', () => {
    for (const l of levely) {
      const male = tolerancePro(l, CIL_MIN_ML) * CIL_MIN_ML;
      const velke = tolerancePro(l, CIL_MAX_ML) * CIL_MAX_ML;
      // Čistě poměrná tolerance by dala 10/30 = 0,33. Absolutní složka
      // chyby (nepřesné puštění) se ale s cílem nezmenšuje.
      assert.ok(
        male / velke > 0.55,
        `L${l.cislo}: u malého cíle je tolerance jen ${((male / velke) * 100).toFixed(0)} % té velké`,
      );
      assert.ok(male < velke, 'větší cíl musí mít větší toleranci v ml');
      assert.ok(
        tolerancePro(l, CIL_MIN_ML) > tolerancePro(l, CIL_MAX_ML),
        'v procentech to naopak musí být u malého cíle volnější',
      );
    }
  });

  it('stejný hráč dopadne u malého i velkého cíle stejně', () => {
    // Ne teorie, ale přehrání: model hráče na levelu, kde se to dřív
    // rozcházelo šestnáctinásobně.
    const hrac = { odhad: 0.16, casovani: 0.1 };
    const r = nahoda(4242);
    const male: number[] = [];
    const velke: number[] = [];

    for (let seed = 1; seed <= 240; seed += 1) {
      const konfig = zalozKonfiguraci(7, seed);
      const { vysledek } = prehraj(7, seed, lidskeDrzeni(7, seed, hrac, r));
      const kos = konfig.cilMl < 16 ? male : konfig.cilMl > 24 ? velke : null;
      kos?.push(vysledek.vyrovnanost);
    }

    assert.ok(male.length > 20 && velke.length > 20, 'málo vzorků na porovnání');
    const median = (v: number[]) => v.sort((a, b) => a - b)[v.length >> 1];
    const rozdil = Math.abs(median(male) - median(velke));
    assert.ok(
      rozdil < 0.1,
      `medián vyrovnanosti: malý cíl ${median(male).toFixed(3)}, ` +
        `velký ${median(velke).toFixed(3)} — los rozhoduje víc, než smí`,
    );
  });
});

describe('seedovaná náhoda', () => {
  it('stejný seed dá stejnou posloupnost', () => {
    const a = nahoda(7);
    const b = nahoda(7);
    for (let i = 0; i < 50; i += 1) assert.equal(a.dalsi(), b.dalsi());
  });

  it('odbočky se navzájem neovlivňují', () => {
    const zaklad = nahoda(7);
    const prvni = zaklad.odbocka(1).dalsi();
    zaklad.dalsi();
    zaklad.dalsi();
    assert.equal(nahoda(7).odbocka(1).dalsi(), prvni);
    assert.notEqual(nahoda(7).odbocka(2).dalsi(), prvni);
  });

  it('hodnoty leží v ⟨0, 1)', () => {
    const r = nahoda(12345);
    for (let i = 0; i < 5000; i += 1) {
      const v = r.dalsi();
      assert.ok(v >= 0 && v < 1, `mimo rozsah: ${v}`);
    }
  });
});
