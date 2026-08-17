/**
 * Fáze 3 — zahřátí třením a vypuštění Bulibana (kap. 5).
 *
 * Dvě věci, které musí sedět, jinak fáze ztratí smysl: **tření hřeje jen
 * tehdy, když se opravdu jezdí po láhvi**, a **chladnutí běží pořád** — jinak
 * by šlo natřít láhev do pásma a dát si načas, čímž by zmizel časový stres.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CHLADNUTI,
  KROK_S,
  PASMO_MIN_SIRKA,
  TEPLOTA_PO_NEUSPECHU,
  ZAPALKA_HORI_S,
  ZAZEH_POKUSU,
} from '../ladeni.ts';
import { POSLEDNI_LEVEL } from '../levely.ts';
import { TRENI_SVIZNE, dobaTreniS, idealniPlan, prehrajRitual } from './prehravac.ts';
import {
  ZADNY_VSTUP,
  krokRitualu,
  kvalitaZasahu,
  pasmoProLevel,
  vPasmu,
  vypusteno,
  zalozRitual,
} from './ritual.ts';
import type { FazeRitualu, StavRitualu } from './ritual.ts';

/** Tření o dané rychlosti (výšek láhve za sekundu) na jeden krok. */
const tri = (zaS = TRENI_SVIZNE) => ({
  treni: zaS * KROK_S,
  drziZapalku: false,
  uHrdla: false,
});

function triS(stav: StavRitualu, sekund: number, zaS = TRENI_SVIZNE): void {
  const kroku = Math.round(sekund / KROK_S);
  for (let i = 0; i < kroku; i += 1) krokRitualu(stav, tri(zaS));
}

describe('cílové pásmo', () => {
  it('zužuje se s levelem, ale nespadne pod podlahu', () => {
    for (let l = 1; l <= POSLEDNI_LEVEL; l += 1) {
      assert.ok(pasmoProLevel(l).sirka >= PASMO_MIN_SIRKA, `L${l}`);
    }
    assert.ok(
      pasmoProLevel(POSLEDNI_LEVEL).sirka < pasmoProLevel(1).sirka,
      'rituál musí být na konci hry těžší než na začátku',
    );
  });

  it('Q je jedna uprostřed, nula na okraji a nula mimo', () => {
    const p = pasmoProLevel(1);
    assert.equal(kvalitaZasahu(p.stred, p), 1);
    assert.ok(Math.abs(kvalitaZasahu(p.stred + p.sirka / 2, p)) < 1e-9);
    assert.equal(kvalitaZasahu(p.stred + p.sirka, p), 0);
    assert.equal(kvalitaZasahu(0, p), 0);
  });
});

describe('zahřívání třením', () => {
  it('bez tření se láhev nezahřeje', () => {
    const stav = zalozRitual(1, 1);
    for (let i = 0; i < 600; i += 1) krokRitualu(stav, ZADNY_VSTUP);
    assert.equal(stav.teplota, 0, 'mimo sklo se nesmí zahřát nic');
  });

  it('svižné tření zahřeje láhev za 4–5 sekund', () => {
    // Tohle je zadaná délka fáze. Kdyby se sáhlo na ZAHRATI_ZA_DRAHU nebo
    // CHLADNUTI, tenhle test to zachytí dřív než hráč.
    for (let l = 1; l <= POSLEDNI_LEVEL; l += 1) {
      const doba = dobaTreniS(l, 1, TRENI_SVIZNE);
      assert.ok(doba >= 3.5 && doba <= 5.5, `L${l}: zahřátí trvá ${doba.toFixed(1)} s`);
    }
  });

  it('pomalé tření trvá výrazně dýl — chladnutí ukusuje pořád stejně', () => {
    assert.ok(dobaTreniS(1, 1, 1) > dobaTreniS(1, 1, 2) * 1.8);
  });

  it('chladne i během tření, takže se nedá dohřát nekonečně pomalu', () => {
    const stav = zalozRitual(1, 1);
    triS(stav, 2);
    const horke = stav.teplota;

    for (let i = 0; i < 60; i += 1) krokRitualu(stav, ZADNY_VSTUP);
    assert.ok(stav.teplota < horke, 'po sekundě bez tření musí být chladnější');
    assert.ok(
      Math.abs(horke - stav.teplota - CHLADNUTI) < 0.2,
      'za sekundu má ubýt zhruba CHLADNUTI jednotek',
    );
  });

  it('`vPasmu` se rozsvítí, teprve když je dost horko', () => {
    const stav = zalozRitual(1, 1);
    assert.equal(vPasmu(stav), false);

    let kroku = 0;
    while (!vPasmu(stav) && kroku < 1200) {
      krokRitualu(stav, tri());
      kroku += 1;
    }
    assert.ok(vPasmu(stav), 'třením se do pásma dostat musí');
    assert.ok(kroku * KROK_S < 5.5, 'a nemá to trvat věčnost');
  });

  it('přetřít pásmo není konec — chladnutí ho vrátí zpátky dolů', () => {
    // Tohle dělá fázi odpustitelnou: kdo přetře, jen počká, až láhev
    // vychladne zpátky do pásma. Trestá se teprve nepozornost v obou směrech.
    const stav = zalozRitual(1, 1);
    triS(stav, 8);
    assert.ok(stav.teplota > stav.pasmo.stred + stav.pasmo.sirka / 2, 'má být přetřeno');

    let kroku = 0;
    while (!vPasmu(stav) && kroku < 1200) {
      krokRitualu(stav, ZADNY_VSTUP);
      kroku += 1;
    }
    assert.ok(vPasmu(stav), 'vychladnutím se do pásma vrátit musí');
  });
});

describe('zápalka', () => {
  /** Natře láhev do pásma a vezme zápalku. */
  function sZapalkou(cisloLevelu = 1, seed = 1): StavRitualu {
    const stav = zalozRitual(cisloLevelu, seed);
    triS(stav, 5);
    krokRitualu(stav, { treni: 0, drziZapalku: true, uHrdla: false });
    return stav;
  }

  it('vzetí zápalky přepne fázi a zápalka začne hořet', () => {
    const stav = sZapalkou();
    assert.equal(stav.faze, 'zapalka');
    assert.ok(stav.zapalkaZbyvaS > 0);
  });

  it('mimo hrdlo se nic neodpočítává', () => {
    const stav = sZapalkou();
    const zbyvalo = stav.zazehZaS;
    for (let i = 0; i < 60; i += 1) {
      krokRitualu(stav, { treni: 0, drziZapalku: true, uHrdla: false });
    }
    assert.equal(stav.zazehZaS, zbyvalo, 'držet zápalku stranou nesmí nic dělat');
    assert.equal(stav.faze, 'zapalka');
  });

  it('puštění zápalky je ucuknutí — bezpečné, bez ztráty pokusu', () => {
    const stav = sZapalkou();
    const pokus = stav.pokus;
    krokRitualu(stav, ZADNY_VSTUP);

    assert.equal(stav.faze, 'zahrivani', 'zápalka zhasne a jde se zpátky třít');
    assert.equal(stav.pokus, pokus, 'ucuknutí nesmí stát pokus');
  });

  it('dohořelá zápalka stojí pokus, ale láhev zůstane teplá', () => {
    const stav = sZapalkou();
    const teplaPred = stav.teplota;
    const kroku = Math.ceil(ZAPALKA_HORI_S / KROK_S) + 2;
    for (let i = 0; i < kroku; i += 1) {
      krokRitualu(stav, { treni: 0, drziZapalku: true, uHrdla: false });
    }

    assert.equal(stav.faze, 'zahrivani');
    assert.equal(stav.pokus, 2, 'dohoření je ztracený pokus');
    assert.ok(stav.teplota > 0 && stav.teplota < teplaPred);
  });

  it('ohořelou zápalku je nutné napřed zahodit', () => {
    // Bez tohohle si hráč, který po dohoření nepustil tlačítko, vzal
    // v témže kroku novou — a tři pokusy mu proletěly mezi prsty.
    const stav = sZapalkou();
    const kroku = Math.ceil(ZAPALKA_HORI_S / KROK_S) + 2;
    for (let i = 0; i < kroku; i += 1) {
      krokRitualu(stav, { treni: 0, drziZapalku: true, uHrdla: false });
    }
    assert.equal(stav.pokus, 2);

    // Držení pokračuje — a nesmí samo sáhnout po další zápalce.
    for (let i = 0; i < 120; i += 1) {
      krokRitualu(stav, { treni: 0, drziZapalku: true, uHrdla: false });
    }
    assert.equal(stav.faze, 'zahrivani', 'nová zápalka až po puštění');
    assert.equal(stav.pokus, 2, 'a rozhodně ne další ztracený pokus');

    // Po puštění se vzít dá.
    krokRitualu(stav, ZADNY_VSTUP);
    krokRitualu(stav, { treni: 0, drziZapalku: true, uHrdla: false });
    assert.equal(stav.faze, 'zapalka');
  });
});

describe('vypuštění', () => {
  it('dokonale odehraný rituál Bulibana vypustí', () => {
    for (let l = 1; l <= POSLEDNI_LEVEL; l += 1) {
      const seed = 700 + l;
      const stav = prehrajRitual(l, seed, idealniPlan(l, seed));
      assert.equal(stav.faze, 'hotovo', `L${l} nedoběhl`);
      assert.ok(vypusteno(stav), `L${l}: ideální plán nevypustil Bulibana`);
      assert.ok(stav.kvalita > 0.9, `L${l}: Q jen ${stav.kvalita.toFixed(3)}`);
    }
  });

  it('studená láhev znamená ticho po pěšině, ne konec hry', () => {
    const stav = prehrajRitual(1, 9, { treniZaS: TRENI_SVIZNE, vzitPri: 1 });
    assert.equal(stav.faze, 'hotovo');
    assert.equal(vypusteno(stav), false);
    assert.equal(stav.pokus, ZAZEH_POKUSU, 'všechny pokusy se mají vyčerpat');
  });

  it('přehřátá láhev taky nechytne — pásmo má dva okraje', () => {
    const stav = prehrajRitual(1, 9, { treniZaS: TRENI_SVIZNE, vzitPri: 99 });
    assert.equal(vypusteno(stav), false, 'nad pásmem se nesmí nic stát');
  });

  it('po neúspěchu si láhev drží část tepla', () => {
    const stav = zalozRitual(1, 5);
    triS(stav, 3);
    const teplaPred = stav.teplota;

    // Ručně do „ticha" — testuje se chování po nepovedeném zážehu.
    stav.faze = 'ticho';
    stav.casovacS = 0;
    krokRitualu(stav, ZADNY_VSTUP);

    assert.equal(stav.faze, 'zahrivani');
    assert.equal(stav.pokus, 2);
    assert.ok(
      Math.abs(stav.teplota - teplaPred * TEPLOTA_PO_NEUSPECHU) < 0.5,
      'teplota má klesnout na daný podíl, ne na nulu',
    );
  });

  it('pozdější pokusy dávají míň bodů', () => {
    const prvni = prehrajRitual(3, 11, idealniPlan(3, 11));
    assert.ok(prvni.body > 0);

    // Týž zážeh na třetí pokus musí být levnější.
    const stav = zalozRitual(3, 11);
    stav.pokus = 3;
    stav.teplota = stav.pasmo.stred;
    stav.faze = 'zapalka';
    stav.zapalkaZbyvaS = ZAPALKA_HORI_S;
    stav.zazehZaS = 0.01;

    let faze: FazeRitualu = stav.faze;
    let pojistka = 0;
    while (faze === 'zapalka' && pojistka < 60) {
      faze = krokRitualu(stav, { treni: 0, drziZapalku: true, uHrdla: true });
      pojistka += 1;
    }
    assert.equal(faze, 'zazeh');
    assert.ok(stav.body < prvni.body, 'třetí pokus se má krátit');
  });
});

describe('determinismus', () => {
  it('stejný seed a plán dají identický výsledek', () => {
    const plan = { treniZaS: TRENI_SVIZNE, vzitPri: 60 };
    const a = prehrajRitual(4, 12345, plan);
    const b = prehrajRitual(4, 12345, plan);
    assert.equal(a.body, b.body);
    assert.equal(a.kvalita, b.kvalita);
    assert.equal(a.pokus, b.pokus);
  });
});
