/**
 * Geometrie nádob, a hlavně **hladina v nakloněné láhvi**.
 *
 * Kvadratura v `profil.ts` se tu ověřuje nezávislou metodou — náhodným
 * vzorkováním objemu. Kdyby byl vzorec na kruhovou úseč špatně, obě metody
 * se rozejdou; kdyby se ověřoval sám sebou, nepoznalo by se nic.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { profil, vsechnyTvary } from './lahev.ts';
import { nahoda } from './nahoda.ts';
import { objemPodRovinou, rovinaProObjem, rozsahOtoceni } from './profil.ts';

const POLOMER = 60;
const VYSKA = 380;
const VZORKU = 400_000;

/**
 * Objem nádoby a objem pod několika rovinami, spočítaný náhodným
 * vzorkováním kvádru kolem nádoby. Jeden průchod pro všechny roviny.
 */
function vzorkovanim(
  polomer: (y: number) => number,
  uhel: number,
  roviny: number[],
): { celkem: number; pod: number[] } {
  const r = nahoda(20260816);
  const s = Math.sin(uhel);
  const c = Math.cos(uhel);
  const objemKvadru = (2 * POLOMER) ** 2 * VYSKA;

  let uvnitr = 0;
  const pod = new Array<number>(roviny.length).fill(0);

  for (let i = 0; i < VZORKU; i += 1) {
    const a = r.rozsah(-POLOMER, POLOMER);
    const b = r.rozsah(-POLOMER, POLOMER);
    const h = r.rozsah(0, VYSKA);
    const R = polomer(h / VYSKA) * POLOMER;
    if (a * a + b * b > R * R) continue;

    uvnitr += 1;
    // Hloubka v ose otáčení na svislou souřadnici nemá vliv.
    const y = a * s - h * c;
    for (let j = 0; j < roviny.length; j += 1) if (y >= roviny[j]) pod[j] += 1;
  }

  return {
    celkem: (uvnitr / VZORKU) * objemKvadru,
    pod: pod.map((n) => (n / VZORKU) * objemKvadru),
  };
}

describe('hladina v nakloněné nádobě', () => {
  it('objem pod rovinou sedí s nezávislým vzorkováním', () => {
    for (const id of ['A', 'D', 'E'] as const) {
      const p = profil(id);
      for (const uhel of [0.6, 1.2, 1.9]) {
        const rozsah = rozsahOtoceni(p.polomer, POLOMER, VYSKA, uhel);
        const roviny = [0.25, 0.5, 0.75].map(
          (t) => rozsah.min + t * (rozsah.max - rozsah.min),
        );
        const mc = vzorkovanim(p.polomer, uhel, roviny);

        roviny.forEach((k, i) => {
          const kvadratura = objemPodRovinou(p.polomer, POLOMER, VYSKA, uhel, k);
          const chyba = Math.abs(kvadratura - mc.pod[i]) / mc.celkem;
          assert.ok(
            chyba < 0.01,
            `${id} @ ${uhel}: kvadratura ${kvadratura.toFixed(0)} vs vzorkování ` +
              `${mc.pod[i].toFixed(0)} (rozdíl ${(chyba * 100).toFixed(1)} % objemu)`,
          );
        });
      }
    }
  });

  it('naklonění láhve nezmění množství rumu v ní', () => {
    // Tohle je ta vlastnost, kvůli které výpočet vznikl: hráč naklápí láhev
    // a obsah mu nesmí před očima přibývat ani mizet.
    for (const id of vsechnyTvary()) {
      const p = profil(id);
      for (const podil of [0.08, 0.25, 0.6, 0.95]) {
        const mc: number[] = [];
        for (const uhel of [0, 0.7, 1.4, 1.92]) {
          const k = rovinaProObjem(p.polomer, POLOMER, VYSKA, uhel, podil);
          const vzorek = vzorkovanim(p.polomer, uhel, [k]);
          mc.push(vzorek.pod[0] / vzorek.celkem);
        }
        for (const skutecny of mc) {
          assert.ok(
            Math.abs(skutecny - podil) < 0.012,
            `${id}: při naplnění ${podil} vyšlo ${skutecny.toFixed(3)} ` +
              `(napříč úhly ${mc.map((v) => v.toFixed(3)).join(', ')})`,
          );
        }
      }
    }
  });

  it('prázdná i plná láhev sedí přesně', () => {
    for (const id of vsechnyTvary()) {
      const p = profil(id);
      for (const uhel of [0, 0.9, 1.92]) {
        const rozsah = rozsahOtoceni(p.polomer, POLOMER, VYSKA, uhel);
        assert.equal(rovinaProObjem(p.polomer, POLOMER, VYSKA, uhel, 0), rozsah.max);
        assert.equal(rovinaProObjem(p.polomer, POLOMER, VYSKA, uhel, 1), rozsah.min);
      }
    }
  });

  it('svislá láhev dá totéž co tabulka profilu', () => {
    // Dvě nezávislé cesty ke stejnému číslu: kvadratura přes kruhové úseče
    // a kumulativní tabulka. Musí se potkat.
    for (const id of vsechnyTvary()) {
      const p = profil(id);
      for (const podil of [0.1, 0.3, 0.55, 0.9]) {
        const k = rovinaProObjem(p.polomer, POLOMER, VYSKA, 0, podil);
        const zTabulky = -p.vyskaZObjemu(podil) * VYSKA;
        assert.ok(
          Math.abs(k - zTabulky) < VYSKA * 0.006,
          `${id} @ ${podil}: ${k.toFixed(1)} vs ${zTabulky.toFixed(1)}`,
        );
      }
    }
  });

  it('rozsah otočení odpovídá skutečnému obrysu', () => {
    const p = profil('D');
    for (const uhel of [0, 0.5, 1.2, 1.92]) {
      const rozsah = rozsahOtoceni(p.polomer, POLOMER, VYSKA, uhel);
      assert.ok(rozsah.max > rozsah.min);
      // Mimo rozsah nesmí být ani kapka, uvnitř musí být všechno.
      assert.ok(objemPodRovinou(p.polomer, POLOMER, VYSKA, uhel, rozsah.max) < 1);
      const plny = objemPodRovinou(p.polomer, POLOMER, VYSKA, uhel, rozsah.min);
      const svisly = objemPodRovinou(p.polomer, POLOMER, VYSKA, 0, -VYSKA * 2);
      assert.ok(
        Math.abs(plny - svisly) / svisly < 0.01,
        `otočení o ${uhel} změnilo celkový objem z ${svisly.toFixed(0)} na ${plny.toFixed(0)}`,
      );
    }
  });
});
