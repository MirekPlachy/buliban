/**
 * Katalog panáků. Hlídá jedinou vlastnost, na které záleží:
 * **každý tvar pojme stejný objem** a hladina se v něm chová podle profilu.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KAPACITA_PANAKU_ML } from '../ladeni.ts';
import { profil } from './lahev.ts';
import { profilPanaku, vsechnyPanaky } from './panak.ts';

describe('tvary panáků', () => {
  it('všechny pojmou celý objem a nic navíc', () => {
    for (const id of vsechnyPanaky()) {
      const p = profilPanaku(id);
      assert.ok(Math.abs(p.objemZVysky(0)) < 1e-9, `${id}: prázdný`);
      assert.ok(Math.abs(p.objemZVysky(1) - 1) < 1e-9, `${id}: plný`);
    }
  });

  it('převod výška ↔ objem je obousměrný', () => {
    for (const id of vsechnyPanaky()) {
      const p = profilPanaku(id);
      for (let i = 1; i < 100; i += 1) {
        const h = i / 100;
        assert.ok(Math.abs(p.vyskaZObjemu(p.objemZVysky(h)) - h) < 0.01, `${id} na ${h}`);
      }
    }
  });

  it('jen rovný panák má hladinu úměrnou objemu', () => {
    // Tohle je celý smysl tvarů: „nalít do všech stejně vysoko" je správná
    // odpověď jen u válce. Jinde je to past.
    assert.ok(Math.abs(profilPanaku('valec').objemZVysky(0.5) - 0.5) < 1e-6);

    for (const id of vsechnyPanaky()) {
      if (id === 'valec') continue;
      const odchylka = Math.abs(profilPanaku(id).objemZVysky(0.5) - 0.5);
      assert.ok(odchylka > 0.02, `${id}: v polovině výšky je skoro přesně polovina objemu`);
    }
  });

  it('kónický a břichatý lžou opačným směrem', () => {
    // Kónický se rozšiřuje vzhůru: půl výšky je MÍŇ než půl objemu.
    assert.ok(profilPanaku('konicky').objemZVysky(0.5) < 0.5);
    // Břichatý je nejširší uprostřed: půl výšky je VÍC než půl objemu.
    assert.ok(profilPanaku('brichaty').objemZVysky(0.5) > 0.5);
  });

  it('kalíšek vyskočí na prvních mililitrech', () => {
    // Úzké dno: prvních 10 % objemu zabere podstatně víc než 10 % výšky.
    assert.ok(profilPanaku('kalisek').vyskaZObjemu(0.1) > 0.18);
  });

  it('kapacita panáku je konstanta hry, ne vlastnost tvaru', () => {
    assert.equal(KAPACITA_PANAKU_ML, 40);
  });
});

describe('ústí láhve', () => {
  it('je vrchol profilu, ne nejužší místo hrdla', () => {
    for (const id of ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const) {
      const p = profil(id);
      assert.equal(p.ustiPolomer, p.polomer(1));
      // Užší než tělo — jinak by to nebylo hrdlo.
      assert.ok(p.ustiPolomer < 0.5, `${id}: ústí je široké ${p.ustiPolomer}`);
      assert.ok(p.ustiPolomer > 0, `${id}: láhev musí mít čím téct`);
    }
  });
});
