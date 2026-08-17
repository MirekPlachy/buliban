/**
 * Headless ladicí nástroj. Přehraje level ze scénáře držení a vytiskne, co
 * z toho vyšlo — bez prohlížeče, bez canvasu, bez klikání.
 *
 * ```
 * node src/hra/harness.ts --level=3 --seed=1 --drzeni=1.8,1.7,1.9
 * node src/hra/harness.ts --level=7 --seed=42 --ideal
 * node src/hra/harness.ts --prehled --seedu=200
 * node src/hra/harness.ts --hraci
 * node src/hra/harness.ts --faze          # rituál napříč levely
 * ```
 *
 * Tohle je hlavní způsob, jak se doostřují konstanty v `ladeni.ts`. Ověřovat
 * model průtoku obrázky by znamenalo dívat se na výsledek místo na příčinu.
 */

import { KAPACITA_PANAKU_ML } from './ladeni.ts';
import { levely } from './levely.ts';
import { nahoda } from './jadro/nahoda.ts';
import {
  TRENI_SVIZNE,
  dobaTreniS,
  idealniDrzeni,
  idealniPlan,
  lidskeDrzeni,
  prehraj,
  prehrajRitual,
} from './jadro/prehravac.ts';
import type { Hrac } from './jadro/prehravac.ts';
import { pasmoProLevel, vypusteno } from './jadro/ritual.ts';
import { odchylkaOdCile, prumer } from './jadro/skore.ts';

function argument(jmeno: string): string | undefined {
  const predpona = `--${jmeno}=`;
  const nalezeny = process.argv.find((a) => a.startsWith(predpona));
  return nalezeny?.slice(predpona.length);
}

function prepinac(jmeno: string): boolean {
  return process.argv.includes(`--${jmeno}`);
}

function cislo(jmeno: string, vychozi: number): number {
  const hodnota = argument(jmeno);
  return hodnota === undefined ? vychozi : Number(hodnota);
}

const ml = (x: number): string => `${x.toFixed(1).padStart(6)} ml`;

/** Sloupeček z bloků — na rozeznání nerovnoměrnosti stačí a nic to nestojí. */
function pruh(podil: number, sirka = 28): string {
  const plnych = Math.round(Math.min(1, Math.max(0, podil)) * sirka);
  return '█'.repeat(plnych) + '·'.repeat(sirka - plnych);
}

function detail(cisloLevelu: number, seed: number, drzeni: number[]): void {
  const { konfig, stav, vysledek, dokonceno } = prehraj(cisloLevelu, seed, drzeni);

  console.log(
    `\nLevel ${cisloLevelu}  ·  seed ${seed}  ·  láhev ${konfig.lahev.tvar.id} ` +
      `(${konfig.lahev.tvar.nazev})  ·  panák ${konfig.panak.tvar.nazev}`,
  );
  console.log(
    `láhev ${konfig.kapacitaLahveMl} ml, obsah ${konfig.objemMl.toFixed(1)} ml, ` +
      `cíl ${konfig.cilMl.toFixed(1)} ml/panák, tolerance ${konfig.level.tolerance}`,
  );
  if (konfig.level.modifikatory.length > 0) {
    console.log(`modifikátory: ${konfig.level.modifikatory.join(', ')}`);
  }
  if (!dokonceno) console.log('POZOR: scénář nedodal dost nalití, level zůstal rozehraný.');
  console.log('');

  stav.panaky.forEach((v, i) => {
    const odchylka = v - konfig.cilMl;
    const znamenka = odchylka >= 0 ? '+' : '−';
    console.log(
      `  ${String(i + 1).padStart(2)}. ${pruh(v / KAPACITA_PANAKU_ML)} ${ml(v)}  ` +
        `${znamenka}${Math.abs(odchylka).toFixed(1).padStart(5)} ml od cíle`,
    );
  });

  console.log('');
  console.log(`  cíl           ${konfig.cilMl.toFixed(2)} ml   (průměr nalitého ${vysledek.prumerMl.toFixed(2)})`);
  console.log(
    `  odchylka      ${vysledek.odchylka.toFixed(4)}   ` +
      `(tolerance ${vysledek.tolerance.toFixed(4)} = ${(vysledek.tolerance * konfig.cilMl).toFixed(1)} ml, ` +
      `základ levelu ${konfig.level.tolerance})`,
  );
  console.log(`  vyrovnanost E ${vysledek.vyrovnanost.toFixed(3)}`);
  console.log(`  čas           ${stav.casS.toFixed(2)} s`);
  console.log('');
  console.log(`  rovnoměrnost  ${vysledek.rovnomernost}`);
  console.log(`  bonus za čas  ${vysledek.casovyBonus}`);
  console.log(
    `  pokuty        ${vysledek.pokuty}  (přelití ${stav.prelitiPocet}× = ${vysledek.pokutaPreliti}, ` +
      `rozlito ${stav.rozlitoMl.toFixed(1)} ml = ${vysledek.pokutaRozlito}, ` +
      `zbylo v láhvi ${vysledek.zbytekMl.toFixed(1)} ml = ${vysledek.pokutaZbytek})`,
  );
  if (vysledek.presnaRuka) console.log('  přesná ruka   ano (+500, ×1,2)');
  console.log(`  CELKEM        ${vysledek.celkem}   medaile: ${vysledek.medaile ?? '—'}`);
  console.log('');
}

/**
 * Přehled napříč seedy s ideálním držením. Odpovídá na otázku, kterou
 * playtest sám nezodpoví: je level vůbec zahratelný na plné body, nebo mu
 * v tom brání model průtoku?
 */
function prehled(seedu: number): void {
  console.log(`\nIdeální držení, ${seedu} seedů na level.\n`);
  console.log('   L   N  láhev  panák       medián   nejhorší   tolerance   zlatých');
  console.log('  ───────────────────────────────────────────────────────────────────');

  for (const l of levely) {
    const odchylky: number[] = [];
    let zlatych = 0;
    for (let seed = 1; seed <= seedu; seed += 1) {
      const { vysledek } = prehraj(l.cislo, seed, idealniDrzeni(l.cislo, seed));
      odchylky.push(vysledek.odchylka);
      if (vysledek.medaile === 'zlato') zlatych += 1;
    }
    odchylky.sort((a, b) => a - b);
    const median = odchylky[Math.floor(odchylky.length / 2)];
    const nejhorsi = odchylky[odchylky.length - 1];
    console.log(
      `  ${String(l.cislo).padStart(2)}  ${String(l.panaku).padStart(2)}    ${l.tvar}    ` +
        `${l.panak.padEnd(9)}  ${median.toFixed(4).padStart(7)}   ${nejhorsi.toFixed(4).padStart(8)}   ` +
        `${l.tolerance.toFixed(3).padStart(9)}   ${String(Math.round((zlatych / seedu) * 100)).padStart(5)} %`,
    );
  }
  console.log('');
}

/**
 * Rozložení medailí pro model hráče. Tohle je ten skutečný kalibrační
 * nástroj: cíl dokumentu je „u nováčka ≤ 10 % zlatých, u zkušeného 40–60 %"
 * a proti ideálnímu držení se to změřit nedá — to je lepší než kdokoli živý.
 */
function hraci(seedu: number): void {
  const typy: [string, Hrac][] = [
    ['nováček', { odhad: 0.3, casovani: 0.16 }],
    ['pokročilý', { odhad: 0.16, casovani: 0.1 }],
    ['zkušený', { odhad: 0.08, casovani: 0.06 }],
  ];

  for (const [jmeno, hrac] of typy) {
    console.log(`\n${jmeno}  (odhad ±${hrac.odhad * 100} %, časování ±${hrac.casovani} s)\n`);
    console.log('   L   N   tolerance   medián odchylky   zlato   stříbro   bronz   nic');
    console.log('  ─────────────────────────────────────────────────────────────────────');

    for (const l of levely) {
      // Pevný seed hráčovy chyby: dva běhy harnessu musí dát stejnou tabulku,
      // jinak se nepozná, jestli se změnila hra, nebo jen kostky.
      const r = nahoda(90210 + l.cislo);
      const odchylky: number[] = [];
      const pocty = { zlato: 0, stribro: 0, bronz: 0, nic: 0 };

      for (let seed2 = 1; seed2 <= seedu; seed2 += 1) {
        const drzeni = lidskeDrzeni(l.cislo, seed2, hrac, r);
        const { vysledek } = prehraj(l.cislo, seed2, drzeni);
        odchylky.push(vysledek.odchylka);
        pocty[vysledek.medaile ?? 'nic'] += 1;
      }

      odchylky.sort((a, b) => a - b);
      const pct = (n: number) => `${Math.round((n / seedu) * 100)} %`.padStart(6);
      console.log(
        `  ${String(l.cislo).padStart(2)}  ${String(l.panaku).padStart(2)}   ` +
          `${l.tolerance.toFixed(3).padStart(9)}   ${odchylky[Math.floor(seedu / 2)].toFixed(4).padStart(14)}   ` +
          `${pct(pocty.zlato)}  ${pct(pocty.stribro)}  ${pct(pocty.bronz)}  ${pct(pocty.nic)}`,
      );
    }
  }
  console.log('');
}

/**
 * Rituál napříč levely.
 *
 * Odpovídá na to, co se z rozlévání vyčíst nedá: **jak dlouho se tře**, než
 * je láhev dost horká, a **o kolik se musí přetřít**, aby nevychladla pod
 * pásmo, než zápalka doputuje k hrdlu. To druhé je číslo, které hráč nikde
 * nevidí a musí ho vycítit — takže když vyjde větší než půl pásma, je level
 * nehratelný a jinak než odsud se to nepozná.
 */
function faze(seedu: number): void {
  console.log(`\nDokonalá hra, ${seedu} seedů na level.\n`);
  console.log('   L   ⌀ rozlévání   zážeh     pásmo   tření   vzít při   přetřít o   vypuštěno');
  console.log('  ──────────────────────────────────────────────────────────────────────────────');

  for (const l of levely) {
    let rozlevani = 0;
    let zazeh = 0;
    let vzitPri = 0;
    let vypustenych = 0;

    for (let seed2 = 1; seed2 <= seedu; seed2 += 1) {
      rozlevani += prehraj(l.cislo, seed2, idealniDrzeni(l.cislo, seed2)).vysledek.celkem;
      const plan = idealniPlan(l.cislo, seed2);
      const stav = prehrajRitual(l.cislo, seed2, plan);
      zazeh += stav.body;
      vzitPri += plan.vzitPri;
      if (vypusteno(stav)) vypustenych += 1;
    }

    const p = pasmoProLevel(l.cislo);
    const d = (x: number) => x / seedu;
    console.log(
      `  ${String(l.cislo).padStart(2)}   ${d(rozlevani).toFixed(0).padStart(11)}   ` +
        `${d(zazeh).toFixed(0).padStart(5)}   ${`${p.stred}±${(p.sirka / 2).toFixed(1)}`.padStart(9)}   ` +
        `${dobaTreniS(l.cislo, 1).toFixed(1).padStart(4)} s   ${d(vzitPri).toFixed(1).padStart(7)}   ` +
        `${(d(vzitPri) - p.stred).toFixed(1).padStart(9)}   ` +
        `${String(Math.round((vypustenych / seedu) * 100)).padStart(6)} %`,
    );
  }

  // Jak dlouho se tře podle toho, jak svižně hráč jezdí. Zadání je 4–5 s
  // při svižném tření; pomalé smí trvat dýl, ale ne donekonečna.
  console.log('\nDoba zahřátí podle rychlosti tření (level 1):\n');
  for (const rychlost of [0.75, 1, 1.5, 2, 3, 4]) {
    const doba = dobaTreniS(1, 1, rychlost);
    console.log(
      `  ${rychlost.toFixed(2).padStart(4)} výšek láhve/s  →  ${doba.toFixed(1).padStart(5)} s` +
        `${rychlost === TRENI_SVIZNE ? '   ← svižné tření, cíl 4–5 s' : ''}`,
    );
  }
  console.log('');
}

const cisloLevelu = cislo('level', 1);
const seed = cislo('seed', 1);

if (prepinac('hraci')) {
  hraci(cislo('seedu', 60));
} else if (prepinac('faze')) {
  faze(cislo('seedu', 20));
} else if (prepinac('prehled')) {
  prehled(cislo('seedu', 50));
} else if (prepinac('ideal')) {
  detail(cisloLevelu, seed, idealniDrzeni(cisloLevelu, seed));
} else {
  const zadane = argument('drzeni');
  const drzeni = zadane ? zadane.split(',').map(Number) : [];
  if (drzeni.length === 0) {
    console.log(
      'Chybí --drzeni=1.8,1.7,… nebo --ideal, --prehled, --hraci, --faze. ' +
        'Viz komentář v souboru.',
    );
    process.exit(1);
  }
  detail(cisloLevelu, seed, drzeni);
}

// Kolik chyby hráč neovlivní. Stejné držení napříč seedy musí dát skoro
// stejný objem — co se rozchází, je čistý šum a hráč se proti němu nemá jak
// bránit. Kdyby tohle číslo vylezlo blízko toleranci, je hra loterie.
if (prepinac('sum')) {
  const vzorky: number[] = [];
  for (let seed2 = 1; seed2 <= 200; seed2 += 1) {
    const { stav } = prehraj(cisloLevelu, seed2, [1.5]);
    vzorky.push(stav.panaky[0]);
  }
  const stred = prumer(vzorky);
  console.log(
    `Stejné držení 1,5 s napříč 200 seedy: průměr ${stred.toFixed(2)} ml, ` +
      `rozptyl ${odchylkaOdCile(vzorky, stred).toFixed(4)} — to je nespravedlivá část chyby.`,
  );
}
