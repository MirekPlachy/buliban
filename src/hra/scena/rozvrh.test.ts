/**
 * Rozvržení je jediná část vykreslování, která ovlivňuje hratelnost, a proto
 * jako jediná ze `scena/` má testy: kdyby láhev nebyla ve stejném měřítku
 * jako panáky, nešel by objem odhadnout a hra by se rozpadla na hádání.
 *
 * `rozvrh.ts` proto nesahá na DOM — testuje se pod holým Node.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KAPACITA_PANAKU_ML } from '../ladeni.ts';
import { POSLEDNI_LEVEL } from '../levely.ts';
import { rozsahOtoceni } from '../jadro/profil.ts';
import { zalozKonfiguraci } from '../jadro/rozlevani.ts';
import { polohaLahve, spocitejRozvrh, stred, ustiHrdla } from './rozvrh.ts';

/** Objem nakreslené nádoby v px³, spočítaný z jejího profilu. */
function objemVPx(
  polomer: (y: number) => number,
  polomerPx: number,
  vyskaPx: number,
): number {
  const kroku = 4000;
  let soucet = 0;
  for (let i = 0; i < kroku; i += 1) {
    const y = (i + 0.5) / kroku;
    soucet += Math.PI * (polomer(y) * polomerPx) ** 2 * (vyskaPx / kroku);
  }
  return soucet;
}

const ROZLISENI: [number, number][] = [
  [390, 720], // telefon na výšku
  [820, 1180], // tablet
  [1440, 820], // notebook
  [360, 640], // starý malý telefon
];

function rozvrhPro(cislo: number, sirka: number, vyska: number, seed = 5) {
  const k = zalozKonfiguraci(cislo, seed);
  return { k, r: spocitejRozvrh(sirka, vyska, k.panaku, k.kapacitaLahveMl, k.lahev, k.panak) };
}

describe('měřítko scény', () => {
  it('nakreslená láhev pojme přesně tolik, kolik říká konfigurace', () => {
    for (const [sirka, vyska] of ROZLISENI) {
      for (let cislo = 1; cislo <= POSLEDNI_LEVEL; cislo += 1) {
        const { k, r } = rozvrhPro(cislo, sirka, vyska);
        const ml = objemVPx(k.lahev.polomer, r.lahevPolomer, r.lahevVyska) / r.meritko;
        const chyba = Math.abs(ml - k.kapacitaLahveMl) / k.kapacitaLahveMl;
        assert.ok(
          chyba < 0.01,
          `${sirka}×${vyska} L${cislo}: láhev nakreslená na ${ml.toFixed(0)} ml ` +
            `místo ${k.kapacitaLahveMl} ml`,
        );
      }
    }
  });

  it('každý tvar panáku drží 40 ml ve stejném měřítku jako láhev', () => {
    for (let cislo = 1; cislo <= POSLEDNI_LEVEL; cislo += 1) {
      const { k, r } = rozvrhPro(cislo, 1440, 820);
      const ml = objemVPx(k.panak.polomer, r.panakSirka / 2, r.panakVyska) / r.meritko;
      assert.ok(
        Math.abs(ml - KAPACITA_PANAKU_ML) < 0.5,
        `L${cislo} (${k.panak.tvar.id}): panák nakreslený na ${ml.toFixed(1)} ml`,
      );
    }
  });

  it('scéna se vejde na obrazovku i na nejmenším telefonu', () => {
    for (const [sirka, vyska] of ROZLISENI) {
      for (let cislo = 1; cislo <= POSLEDNI_LEVEL; cislo += 1) {
        const { k, r } = rozvrhPro(cislo, sirka, vyska, 9);
        assert.ok(r.lahevDnoY - r.lahevVyska > 0, `${sirka}×${vyska} L${cislo}: láhev leze nad obraz`);
        assert.ok(r.panakVyska > 8, `${sirka}×${vyska} L${cislo}: panák je nekreslitelně malý`);
        const posledni = stred(r, k.panaku - 1) + r.panakSirka / 2;
        assert.ok(posledni <= sirka, `${sirka}×${vyska} L${cislo}: poslední panák přetéká vpravo`);
      }
    }
  });
});

describe('geometrie nalévání', () => {
  it('svislá láhev má ústí nahoře a přesně nad dnem', () => {
    const { k, r } = rozvrhPro(4, 820, 1180);
    const p = polohaLahve(r, k.lahev, 300, 0);
    const usti = ustiHrdla(r, k.lahev, p);
    assert.ok(Math.abs(usti.x - 300) < 1e-9, 'svisle stojící láhev nemá ústí bokem');
    assert.ok(Math.abs(usti.y - (p.y - r.lahevVyska)) < 1e-9, 'ústí je na vrcholu láhve');
  });

  it('proud vytéká z okraje ústí, ne zprostřed skla', () => {
    // Ústí je vrchol profilu. Kdyby se bralo nejužší místo hrdla, u láhve
    // s ramenem by proud vycházel 28 % pod okrajem — a je to vidět.
    for (const [sirka, vyska] of ROZLISENI) {
      for (let cislo = 1; cislo <= POSLEDNI_LEVEL; cislo += 1) {
        const { k, r } = rozvrhPro(cislo, sirka, vyska);
        for (let i = 0; i < k.panaku; i += 1) {
          const p = polohaLahve(r, k.lahev, stred(r, i), 1);
          const usti = ustiHrdla(r, k.lahev, p);

          // Vzdálenost od dna po výtokový bod musí odpovídat okraji ústí:
          // √(H² + ρ²), ne nic menšího.
          const rho = k.lahev.ustiPolomer * r.lahevPolomer;
          const vzdalenost = Math.hypot(usti.x - p.x, usti.y - p.y);
          assert.ok(
            Math.abs(vzdalenost - Math.hypot(r.lahevVyska, rho)) < 0.01,
            `${sirka}×${vyska} L${cislo}: výtok není na okraji ústí`,
          );
          // A leží na té straně, kam je láhev nakloněná — přes ni rum přepadá.
          const stredUsti = {
            x: p.x + r.lahevVyska * Math.sin(p.uhel),
            y: p.y - r.lahevVyska * Math.cos(p.uhel),
          };
          assert.ok(usti.y > stredUsti.y, 'výtok musí být pod středem ústí');
        }
      }
    }
  });

  it('ústí míří nad panák a při naklánění k němu klesá, ne od něj', () => {
    // Ústí je vrchol láhve, takže u stojící visí celou její délku nad stolem.
    // Při naklánění klesá k panáku — jinak by rum padal z pěti set pixelů
    // a scéna by nad lahví držela prázdný pruh na rozmach. Klesání musí být
    // jednosměrné: kdyby se ústí cestou vracelo nahoru, poskočila by láhev.
    for (const [sirka, vyska] of ROZLISENI) {
      for (let cislo = 1; cislo <= POSLEDNI_LEVEL; cislo += 1) {
        const { k, r } = rozvrhPro(cislo, sirka, vyska);
        for (let i = 0; i < k.panaku; i += 1) {
          const cil = stred(r, i);
          let predchoziY = -Infinity;

          for (const podil of [0, 0.3, 0.7, 1]) {
            const p = polohaLahve(r, k.lahev, cil, podil);
            const stredX = p.x + r.lahevVyska * Math.sin(p.uhel);
            const stredY = p.y - r.lahevVyska * Math.cos(p.uhel);
            assert.ok(
              Math.abs(stredX - cil) < 0.001,
              `${sirka}×${vyska} L${cislo} panák ${i}: ústí je vedle panáku`,
            );
            assert.ok(
              stredY >= predchoziY - 1e-9,
              `${sirka}×${vyska} L${cislo}: ústí se při naklánění vrací nahoru`,
            );
            predchoziY = stredY;

            const usti = ustiHrdla(r, k.lahev, p);
            assert.ok(
              usti.y < r.stulY - r.panakVyska,
              'výtok musí zůstat nad okrajem panáku',
            );
            assert.ok(
              Math.abs(usti.x - cil) < r.panakSirka / 2,
              'výtok musí mířit dovnitř panáku',
            );
          }

          // Nalévá se z ruky, ne z okapu: při plném náklonu smí být výtok nad
          // panákem nejvýš o jeho vlastní výšku.
          const usti = ustiHrdla(r, k.lahev, polohaLahve(r, k.lahev, cil, 1));
          assert.ok(
            r.stulY - r.panakVyska - usti.y < r.panakVyska,
            `${sirka}×${vyska} L${cislo}: rum padá do panáku z ` +
              `${(r.stulY - r.panakVyska - usti.y).toFixed(0)} px`,
          );
        }
      }
    }
  });

  it('otočená láhev se vejde do scény i na výšku', () => {
    for (const [sirka, vyska] of ROZLISENI) {
      for (let cislo = 1; cislo <= POSLEDNI_LEVEL; cislo += 1) {
        const { k, r } = rozvrhPro(cislo, sirka, vyska);
        const p = polohaLahve(r, k.lahev, stred(r, 0), 1);
        const rozsah = rozsahOtoceni(k.lahev.polomer, r.lahevPolomer, r.lahevVyska, p.uhel);
        assert.ok(
          p.y + rozsah.min > 0,
          `${sirka}×${vyska} L${cislo}: nakloněná láhev leze nad obraz`,
        );
      }
    }
  });

  it('láhev se naklání ke středu scény, ne přes okraj', () => {
    // Dno smí při plném náklonu z obrazu vyčnívat — na úzkém displeji to
    // jinak nejde. Nesmí ale zamířit ven: naklonit se má dovnitř scény.
    for (const [sirka, vyska] of ROZLISENI) {
      for (let cislo = 1; cislo <= POSLEDNI_LEVEL; cislo += 1) {
        const { k, r } = rozvrhPro(cislo, sirka, vyska);
        for (let i = 0; i < k.panaku; i += 1) {
          const cil = stred(r, i);
          const p = polohaLahve(r, k.lahev, cil, 1);
          const dovnitr = cil < sirka / 2 ? p.x > cil : p.x < cil;
          assert.ok(dovnitr, `${sirka}×${vyska} L${cislo} panák ${i}: láhev se naklonila ven`);
          assert.ok(
            p.x > -sirka / 2 && p.x < sirka * 1.5,
            `${sirka}×${vyska} L${cislo} panák ${i}: dno odletělo na ${p.x.toFixed(0)} px`,
          );
        }
      }
    }
  });

  it('rovně stojící láhev se vejde nad panáky celá', () => {
    for (const [sirka, vyska] of ROZLISENI) {
      for (let cislo = 1; cislo <= POSLEDNI_LEVEL; cislo += 1) {
        const { k, r } = rozvrhPro(cislo, sirka, vyska);
        const p = polohaLahve(r, k.lahev, stred(r, 0), 0);
        assert.ok(Math.abs(p.y - r.lahevDnoY) < 0.001, 'rovná láhev stojí na svém dně');
        assert.ok(p.y - r.lahevVyska > 0, `${sirka}×${vyska} L${cislo}: láhev leze nad obraz`);
        assert.ok(p.y < r.stulY - r.panakVyska, 'láhev nesmí zasahovat do panáků');
      }
    }
  });
});
