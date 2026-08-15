/**
 * Vygeneruje několik kandidátů jedné položky ze zadani.json BOKEM, do složky
 * `kandidati/`, a v projektu nesáhne na nic.
 *
 * Proč to existuje: scény s lidmi vycházejí na první pokus zhruba jednou ze
 * tří, takže se opakuje `--znovu`. Jenže to hotový soubor přepíše — a když
 * je nový pokus horší než ten předchozí, povedený obrázek je nenávratně
 * pryč. Takhle se nejdřív vygeneruje výběr, člověk se podívá a teprve pak
 * vítěze nasadí:
 *
 *   npm run kandidati -- --jen=dnes --pocet=4
 *   npm run kandidati -- --jen=dnes --nasad=2     vítěz jde do projektu
 *
 * Kandidáti se generují souběžně, takže čtyři kusy trvají stejně jako jeden.
 */
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import {
  klic, nactiJson, stahni, posli, cesta, preved, maFfmpeg,
} from './lib.mjs';

const API = 'https://external.api.recraft.ai/v1';
const SLOZKA = 'kandidati';

const args = process.argv.slice(2);
const jen = args.find((a) => a.startsWith('--jen='))?.split('=')[1] ?? null;
const pocet = Number(args.find((a) => a.startsWith('--pocet='))?.split('=')[1] ?? 3);
const nasad = args.find((a) => a.startsWith('--nasad='))?.split('=')[1] ?? null;

if (!jen) {
  console.error('\nChybí --jen=<id>. Například: npm run kandidati -- --jen=dnes\n');
  process.exit(1);
}

const zadani = await nactiJson('grafika/zadani.json');
const polozka = zadani.find((p) => p.id === jen);
if (!polozka) {
  console.error(`\nV zadani.json není položka s id "${jen}".\n`);
  process.exit(1);
}

// --- nasazení vítěze -------------------------------------------------------
if (nasad) {
  const zdroj = cesta(SLOZKA, `${jen}-${nasad}${prip(polozka.cil)}`);
  copyFileSync(zdroj, cesta(polozka.cil));

  // Ořez z `uprava` se dělá až tady, ne u kandidátů — ti mají být vidět celí.
  // Bez tohohle kroku by ručně nasazený obrázek měl jiné rozměry než ten
  // z `npm run obrazky`, což je přesně ten druh tichého rozdílu, který se
  // pak hledá půl dne.
  if (polozka.uprava && maFfmpeg() && !preved(polozka.cil, polozka.uprava)) {
    console.warn(`  ⚠ ořez „${polozka.uprava}“ neprošel, soubor zůstal celý`);
  }

  console.log(`\n✓ kandidát ${nasad} nasazen do ${polozka.cil}\n`);
  process.exit(0);
}

// --- generování ------------------------------------------------------------
const token = klic('RECRAFT_API_TOKEN', 'https://www.recraft.ai/ → API');
const styl = await nactiJson('grafika/styl.json');
const prevadet = maFfmpeg();

mkdirSync(cesta(SLOZKA), { recursive: true });

console.log(`\n▸ ${jen} — ${pocet} kandidátů\n`);

const vstup = {
  // Stejné pořadí jako v obrazky.mjs: konkrétní zadání první, styl za ním.
  prompt: `${polozka.prompt} ${styl.spolecnyPrompt}`,
  negative_prompt: [polozka.negativni, styl.negativni].filter(Boolean).join(', '),
  model: styl.model ?? 'recraftv3',
  size: polozka.velikost,
  n: 1,
  response_format: 'url',
  ...(styl.styleId ? { style_id: styl.styleId } : {}),
};

await Promise.all(
  Array.from({ length: pocet }, (_, i) => udelej(i + 1)),
);

console.log(`\nProhlédněte si ${SLOZKA}/ a vítěze nasaďte:`);
console.log(`  npm run kandidati -- --jen=${jen} --nasad=<číslo>\n`);

async function udelej(cislo) {
  const cil = `${SLOZKA}/${jen}-${cislo}${prip(polozka.cil)}`;
  try {
    const odpoved = await posli(`${API}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vstup),
    });
    const { data } = await odpoved.json();
    const url = data?.[0]?.url;
    if (!url) throw new Error('odpověď bez obrázku');

    await stahni(url, cil);
    // Ořez se schválně NEdělá — kandidát má být vidět celý, ať je poznat,
    // co se ořezem ztratí. Nasazený vítěz projde převodem až v obrazky.mjs.
    if (prevadet) preved(cil);
    console.log(`  ✓ ${cil}`);
  } catch (chyba) {
    console.warn(`  ⚠ kandidát ${cislo} neprošel: ${chyba.message}`);
  }
}

function prip(cesta) {
  return cesta.slice(cesta.lastIndexOf('.'));
}
