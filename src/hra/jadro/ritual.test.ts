/**
 * Fáze 3 — zahřátí a vypuštění Bulibana (kap. 5).
 *
 * Dvě věci, které musí sedět, jinak se rituál rozpadne na klikačku:
 * **setrvačnost** (pásmo se přestřeluje po puštění) a **chladnutí**, které
 * běží i během uzávěru a zápalky. Bez druhého by nebyl žádný časový stres.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  KROK_S,
  PASMO_MIN_SIRKA,
  PRASKNE_NAD,
  TEPLOTA_PO_NEUSPECHU,
  UZAVER_S,
  ZAPALKA_BONUS,
  ZAZEH_POKUSU,
} from '../ladeni.ts';
import { POSLEDNI_LEVEL } from '../levely.ts';
import { metoda, metodyProLevel, vsechnyMetody } from './metody.ts';
import { idealniPlan, prehrajRitual } from './prehravac.ts';
import {
  krokRitualu,
  kvalitaZasahu,
  nasobitelMetody,
  nasobitelPolohy,
  pasmoProLevel,
  volbyRitualu,
  vypusteno,
  zalozRitual,
} from './ritual.ts';
import type { FazeRitualu, StavRitualu, VstupRitualu } from './ritual.ts';

const nic: VstupRitualu = { drzi: false, stisk: false, volba: null };
const drz: VstupRitualu = { drzi: true, stisk: false, volba: null };

/** Vybere polohu i metodu a nechá stav na zahřívání. */
function pripravZahrivani(
  cisloLevelu = 1,
  seed = 1,
  metodaId: 'dlane' | 'odev' | 'voda' | 'plamen' = 'dlane',
): StavRitualu {
  const stav = zalozRitual(cisloLevelu, seed);
  krokRitualu(stav, { ...nic, volba: { druh: 'poloha', poloha: 'horizontalni' } });
  krokRitualu(stav, { ...nic, volba: { druh: 'metoda', metoda: metodaId } });
  return stav;
}

function drzS(stav: StavRitualu, sekund: number): void {
  const kroku = Math.round(sekund / KROK_S);
  for (let i = 0; i < kroku; i += 1) krokRitualu(stav, drz);
}

describe('cílové pásmo', () => {
  it('vertikální poloha je užší, ale platí se za ni násobitelem', () => {
    const svisle = pasmoProLevel(1, 'vertikalni');
    const lezmo = pasmoProLevel(1, 'horizontalni');

    assert.ok(svisle.sirka < lezmo.sirka, 'svislá láhev má mít užší pásmo');
    assert.equal(lezmo.sirka - svisle.sirka, 12, '±6 jednotek z kap. 5.1');
    assert.ok(nasobitelPolohy('vertikalni') > nasobitelPolohy('horizontalni'));
    assert.equal(nasobitelPolohy('vertikalni'), 1.3);
  });

  it('zužuje se s levelem, ale nespadne pod podlahu', () => {
    for (let l = 1; l <= POSLEDNI_LEVEL; l += 1) {
      for (const poloha of ['vertikalni', 'horizontalni'] as const) {
        const p = pasmoProLevel(l, poloha);
        assert.ok(p.sirka >= PASMO_MIN_SIRKA, `L${l} ${poloha}: ${p.sirka}`);
      }
    }
    assert.ok(
      pasmoProLevel(POSLEDNI_LEVEL, 'horizontalni').sirka <
        pasmoProLevel(1, 'horizontalni').sirka,
      'rituál musí být na konci hry těžší než na začátku',
    );
  });

  it('Q je jedna uprostřed, nula na okraji a nula mimo', () => {
    const p = pasmoProLevel(1, 'horizontalni');
    assert.equal(kvalitaZasahu(p.stred, p), 1);
    assert.ok(Math.abs(kvalitaZasahu(p.stred + p.sirka / 2, p)) < 1e-9);
    assert.equal(kvalitaZasahu(p.stred + p.sirka, p), 0);
    assert.equal(kvalitaZasahu(0, p), 0);
  });
});

describe('zahřívání', () => {
  it('bez vybrané metody se nehřeje', () => {
    const stav = zalozRitual(1, 1);
    krokRitualu(stav, { ...nic, volba: { druh: 'poloha', poloha: 'horizontalni' } });
    drzS(stav, 2);
    assert.equal(stav.teplota, 0, 'napřed se musí vybrat metoda');
  });

  it('přes oděv se nedá dohřát nad strop', () => {
    const stav = pripravZahrivani(1, 1, 'odev');
    drzS(stav, 120);
    assert.ok(stav.teplota <= metoda('odev').strop!, `dohřálo na ${stav.teplota}`);
    assert.ok(stav.teplota >= metoda('odev').strop! - 1e-6, 'ke stropu se dostat musí');
  });

  it('setrvačnost se přičte při puštění, ne průběžně', () => {
    const stav = pripravZahrivani(1, 1, 'voda');
    drzS(stav, 2);
    const pred = stav.teplota;

    krokRitualu(stav, nic);
    const poPusteni = stav.teplota;
    assert.ok(poPusteni > pred, 'po puštění má teplota povyskočit');

    // A dál už jen chladne — setrvačnost je jednorázová.
    krokRitualu(stav, nic);
    assert.ok(stav.teplota < poPusteni, 'druhý krok už musí chladnout');
  });

  it('teplota klesá i během uzávěru a volby ohně — to je časový stres', () => {
    const stav = pripravZahrivani(1, 1, 'dlane');
    drzS(stav, 6);
    krokRitualu(stav, { ...nic, volba: { druh: 'uzaver' } });
    const priUzaveru = stav.teplota;

    for (let i = 0; i < Math.ceil(UZAVER_S / KROK_S) + 2; i += 1) krokRitualu(stav, nic);
    assert.equal(stav.faze, 'ohen');
    assert.ok(stav.teplota < priUzaveru, 'během sundávání uzávěru musí láhev chladnout');

    const priOhni = stav.teplota;
    for (let i = 0; i < 60; i += 1) krokRitualu(stav, nic);
    assert.ok(stav.teplota < priOhni, 'a při volbě ohně taky');
  });

  it('uzávěr nejde sundat, dokud se nezačalo hřát', () => {
    const stav = pripravZahrivani(1, 1, 'dlane');
    krokRitualu(stav, { ...nic, volba: { druh: 'uzaver' } });
    assert.equal(stav.faze, 'zahrivani', 'fázi nejde proklikat na nulu');
  });

  it('nad plamenem praskne sklo a zážeh je za nula', () => {
    // 20 j/s, takže 95 jednotek padne kolem páté sekundy. Držet dýl nemá
    // smysl — po prasknutí už jen doznívá hláška.
    const stav = pripravZahrivani(5, 1, 'plamen');
    drzS(stav, 6);
    assert.ok(stav.teplota > PRASKNE_NAD, `teplota ${stav.teplota.toFixed(1)}`);
    assert.equal(stav.faze, 'prasklo');
    assert.equal(stav.body, 0);

    // Fáze se čte z návratové hodnoty: překladač nevidí, že ji `krokRitualu`
    // uvnitř mění, a `stav.faze` by si zúžil na hodnotu před prvním voláním.
    let faze: FazeRitualu = stav.faze;
    let pojistka = 0;
    while (faze !== 'hotovo' && pojistka < 600) {
      faze = krokRitualu(stav, nic);
      pojistka += 1;
    }
    assert.equal(vypusteno(stav), false);
  });

  it('násobitel je vážený průměr metod podle dodaného tepla', () => {
    const stav = pripravZahrivani(5, 1, 'dlane');
    drzS(stav, 5);
    assert.ok(Math.abs(nasobitelMetody(stav) - metoda('dlane').nasobitel) < 1e-9);

    // Dohřát rychlou a levnou metodou musí násobitel stáhnout dolů.
    krokRitualu(stav, { ...nic, volba: { druh: 'metoda', metoda: 'voda' } });
    drzS(stav, 3);
    const smiseny = nasobitelMetody(stav);
    assert.ok(smiseny < metoda('dlane').nasobitel);
    assert.ok(smiseny > metoda('voda').nasobitel);
  });
});

describe('odemykání metod', () => {
  it('level 1 nabízí tři metody, další levely přidávají', () => {
    assert.deepEqual(
      metodyProLevel(1).map((m) => m.id),
      ['dlane', 'odev', 'voda'],
    );
    for (let l = 2; l <= POSLEDNI_LEVEL; l += 1) {
      assert.ok(
        metodyProLevel(l).length >= metodyProLevel(l - 1).length,
        `L${l}: nabídka se nesmí zmenšit`,
      );
    }
    assert.equal(metodyProLevel(POSLEDNI_LEVEL).length, vsechnyMetody().length);
  });

  it('dlaždice zahřívání nabízejí metody levelu plus uzávěr', () => {
    const stav = zalozRitual(1, 1);
    krokRitualu(stav, { ...nic, volba: { druh: 'poloha', poloha: 'horizontalni' } });
    const volby = volbyRitualu(stav);
    assert.equal(volby.length, metodyProLevel(1).length + 1);
    assert.equal(volby[volby.length - 1].druh, 'uzaver');
  });

  it('metodu z vyššího levelu nejde na levelu 1 vybrat', () => {
    const stav = zalozRitual(1, 1);
    krokRitualu(stav, { ...nic, volba: { druh: 'poloha', poloha: 'horizontalni' } });
    const dostupne = volbyRitualu(stav)
      .filter((v) => v.druh === 'metoda')
      .map((v) => (v.druh === 'metoda' ? v.metoda : ''));
    assert.ok(!dostupne.includes('plamen'), 'plamen se odemyká až na L5');
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

  it('zápalka dává víc bodů než zapalovač při stejné teplotě', () => {
    const seed = 4242;
    const sZapalkou = prehrajRitual(3, seed, {
      poloha: 'horizontalni',
      metodaId: 'dlane',
      ohen: 'zapalka',
      pustitPri: 0,
    });
    const sZapalovacem = prehrajRitual(3, seed, {
      poloha: 'horizontalni',
      metodaId: 'dlane',
      ohen: 'zapalovac',
      pustitPri: 0,
    });
    // Oba plány jsou stejně (ne)zahřáté, takže rozdíl může být jen v bonusu.
    if (sZapalkou.body > 0 && sZapalovacem.body > 0) {
      assert.ok(sZapalkou.body > sZapalovacem.body);
      assert.ok(Math.abs(sZapalkou.body / sZapalovacem.body - ZAPALKA_BONUS) < 0.02);
    }
  });

  it('studená láhev znamená ticho po pěšině, ne konec hry', () => {
    const stav = prehrajRitual(1, 9, {
      poloha: 'horizontalni',
      metodaId: 'dlane',
      ohen: 'zapalovac',
      pustitPri: 1,
    });
    assert.equal(stav.faze, 'hotovo');
    assert.equal(vypusteno(stav), false);
    assert.equal(stav.pokus, ZAZEH_POKUSU, 'všechny pokusy se mají vyčerpat');
  });

  it('po neúspěchu si láhev drží část tepla', () => {
    const stav = pripravZahrivani(1, 5, 'dlane');
    drzS(stav, 4);
    krokRitualu(stav, nic);
    const teplaPred = stav.teplota;

    // Ručně do „ticha" — chování po neúspěšném zážehu je to, co se testuje.
    stav.faze = 'ticho';
    stav.casovacS = 0;
    krokRitualu(stav, nic);

    assert.equal(stav.faze, 'zahrivani', 'po neúspěchu se jde zpátky hřát');
    assert.equal(stav.pokus, 2);
    assert.ok(
      Math.abs(stav.teplota - teplaPred * TEPLOTA_PO_NEUSPECHU) < 0.5,
      'teplota má klesnout na daný podíl, ne na nulu',
    );
  });

  it('ucuknutí nestojí pokus — jen se přestane odpočítávat', () => {
    const seed = 31;
    const stav = pripravZahrivani(1, seed, 'dlane');
    drzS(stav, 6);
    krokRitualu(stav, { ...nic, volba: { druh: 'uzaver' } });

    let pojistka = 0;
    while (stav.faze !== 'ceka' && pojistka < 2000) {
      krokRitualu(
        stav,
        stav.faze === 'ohen'
          ? { ...nic, volba: { druh: 'ohen', ohen: 'zapalovac' } }
          : nic,
      );
      pojistka += 1;
    }
    assert.equal(stav.faze, 'ceka');

    const pokusPred = stav.pokus;
    const zbyvaloPred = stav.zazehZaS;
    for (let i = 0; i < 20; i += 1) krokRitualu(stav, nic);

    assert.equal(stav.pokus, pokusPred, 'ucuknutí je bezpečné');
    assert.equal(stav.zazehZaS, zbyvaloPred, 'odpočet se má zastavit, ne resetovat');
  });
});

describe('determinismus', () => {
  it('stejný seed a plán dají identický výsledek', () => {
    const plan = {
      poloha: 'vertikalni' as const,
      metodaId: 'dlane' as const,
      ohen: 'zapalka' as const,
      pustitPri: 60,
    };
    const a = prehrajRitual(4, 12345, plan);
    const b = prehrajRitual(4, 12345, plan);
    assert.equal(a.body, b.body);
    assert.equal(a.kvalita, b.kvalita);
    assert.equal(a.pokus, b.pokus);
  });
});
