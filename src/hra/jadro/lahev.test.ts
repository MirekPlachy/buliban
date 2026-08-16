/**
 * Tvary lahví — ověřuje, že profily opravdu dělají to, co slibuje katalog
 * v kap. 4.2. Kdyby ne, je z druhé osy obtížnosti jen jiná kresba.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CIL_MAX_ML, KAPACITA_LAHVE_ML } from '../ladeni.ts';
import { POSLEDNI_LEVEL, level } from '../levely.ts';
import { profil, vsechnyTvary } from './lahev.ts';

const KROKU = 200;

describe('profil láhve', () => {
  it('objem roste s výškou od nuly do jedné', () => {
    for (const id of vsechnyTvary()) {
      const p = profil(id);
      assert.ok(Math.abs(p.objemZVysky(0)) < 1e-9, `${id}: prázdná láhev`);
      assert.ok(Math.abs(p.objemZVysky(1) - 1) < 1e-9, `${id}: plná láhev`);

      let predchozi = 0;
      for (let i = 1; i <= KROKU; i += 1) {
        const v = p.objemZVysky(i / KROKU);
        assert.ok(v >= predchozi - 1e-12, `${id}: objem klesl mezi ${i - 1} a ${i}`);
        predchozi = v;
      }
    }
  });

  it('převod výška ↔ objem je obousměrný', () => {
    for (const id of vsechnyTvary()) {
      const p = profil(id);
      for (let i = 1; i < KROKU; i += 1) {
        const h = i / KROKU;
        const zpet = p.vyskaZObjemu(p.objemZVysky(h));
        assert.ok(Math.abs(zpet - h) < 0.01, `${id}: výška ${h} → ${zpet}`);
      }
    }
  });
});

describe('katalog tvarů', () => {
  it('A je v těle lineární — polovina výšky je polovina objemu', () => {
    const p = profil('A');
    // Poměřuje se uvnitř těla, ne přes hrdlo: hrdlo linearitu láme u všech tvarů.
    const pomer = p.objemZVysky(0.4) / p.objemZVysky(0.8);
    assert.ok(Math.abs(pomer - 0.5) < 0.02, `poměr ${pomer.toFixed(4)}`);
  });

  it('B má rameno — poslední třetina výšky nese zlomek objemu', () => {
    const p = profil('B');
    const nadRamenem = 1 - p.objemZVysky(0.66);
    assert.ok(nadRamenem < 0.12, `nad ramenem je ${(nadRamenem * 100).toFixed(1)} % objemu`);
  });

  it('C se zužuje vzhůru — dV/dh nikde neroste', () => {
    const p = profil('C');
    for (let i = 1; i <= 78; i += 1) {
      const r0 = p.polomer((i - 1) / 100);
      const r1 = p.polomer(i / 100);
      assert.ok(r1 <= r0 + 1e-9, `poloměr vzrostl na výšce ${i / 100}`);
    }
  });

  it('D je břichatá — hladina v polovině výšky je nad polovinou objemu', () => {
    const p = profil('D');
    assert.ok(p.objemZVysky(0.5) > 0.55, `objem v polovině výšky: ${p.objemZVysky(0.5)}`);

    // Definiční znak: dV/dh má maximum uvnitř, ne na dně.
    const r0 = p.polomer(0);
    const rStred = p.polomer(0.38);
    assert.ok(rStred > r0, 'břicho musí být širší než dno');
  });

  it('E je nemonotónní — dvě protichůdné intuice v jedné láhvi', () => {
    const p = profil('E');
    let vrcholu = 0;
    for (let i = 1; i < 78; i += 1) {
      const a = p.polomer((i - 1) / 100);
      const b = p.polomer(i / 100);
      const c = p.polomer((i + 1) / 100);
      if (b > a && b >= c) vrcholu += 1;
    }
    assert.ok(vrcholu >= 2, `karafa má mít dvě vypoukliny, našel jsem ${vrcholu}`);
  });

  it('F a G se liší viditelností, ne geometrií', () => {
    assert.equal(profil('F').tvar.viditelnost, 'castecna');
    assert.equal(profil('G').tvar.viditelnost, 'zadna');
    assert.ok(profil('F').tvar.etiketa, 'poloprůhledná láhev má mít pásmo etikety');
    for (let i = 0; i <= 20; i += 1) {
      assert.ok(Math.abs(profil('F').polomer(i / 20) - profil('G').polomer(i / 20)) < 1e-9);
    }
  });
});

describe('slepé finále — čiré hrdlo', () => {
  it('neprůhledná láhev má čiré hrdlo, ostatní ne', () => {
    assert.ok(profil('G').tvar.neprusvitneDo !== undefined);
    for (const id of vsechnyTvary()) {
      if (id === 'G') continue;
      assert.equal(
        profil(id).tvar.neprusvitneDo,
        undefined,
        `${id}: průhledná láhev nemá co zakrývat`,
      );
    }
  });

  it('v čirém hrdle je jen zlomek objemu láhve', () => {
    const p = profil('G');
    const podilVHrdle = 1 - p.objemZVysky(p.tvar.neprusvitneDo!);
    assert.ok(
      podilVHrdle < 0.06,
      `hrdlo pojme ${(podilVHrdle * 100).toFixed(1)} % láhve — to už by prozrazovalo`,
    );
  });

  it('ve stojící láhvi hladina do hrdla nikdy nedosáhne', () => {
    // Tohle je celá záruka, že vodítko zůstane poctivé: hráč vidí, ŽE teče,
    // ale mezi nalitími, kdy láhev stojí rovně, mu hrdlo neřekne nic.
    const finale = level(POSLEDNI_LEVEL);
    assert.ok(finale.modifikatory.includes('slepe'));
    assert.equal(finale.tvar, 'G');

    const p = profil('G');
    const nejvicMozno = (finale.panaku * CIL_MAX_ML) / KAPACITA_LAHVE_ML;
    const hraniceObjemu = p.objemZVysky(p.tvar.neprusvitneDo!);
    assert.ok(
      nejvicMozno < hraniceObjemu,
      `i plná dávka (${(nejvicMozno * 100).toFixed(0)} % láhve) sahá nad neprůhledné ` +
        `tělo (${(hraniceObjemu * 100).toFixed(0)} %)`,
    );
  });
});
