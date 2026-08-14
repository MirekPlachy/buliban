/**
 * Vygeneruje obrázky podle grafika/zadani.json přes Recraft V3.
 *
 * Hotové soubory přeskakuje, takže opakované spuštění nestojí nic a
 * negeneruje znovu to, co už na disku je. Přegenerovat jde cíleně:
 *
 *   npm run obrazky              všechno, co chybí
 *   npm run obrazky -- --jen=hero    jen jeden kus
 *   npm run obrazky -- --znovu       přepsat i to, co existuje
 */
import { statSync } from 'node:fs';
import {
  klic, nactiJson, existuje, stahni, posli, argumenty,
  preved, maFfmpeg, cesta,
} from './lib.mjs';

const API = 'https://external.api.recraft.ai/v1';

const prevadet = maFfmpeg();
if (!prevadet) {
  console.warn(
    '\n⚠ ffmpeg není na PATH — obrázky zůstanou jako WebP pod cizí příponou\n' +
      '  a v plné velikosti. Doinstalujte ho a pusťte znovu s --znovu.\n',
  );
}

const token = klic('RECRAFT_API_TOKEN', 'https://www.recraft.ai/ → API');
const styl = await nactiJson('grafika/styl.json');
const zadani = await nactiJson('grafika/zadani.json');
const { znovu, jen } = argumenty();

if (!styl.styleId) {
  console.warn(
    '\n⚠ grafika/styl.json nemá styleId — jedu na základní styl.\n' +
      '  Pro opravdu jednotnou grafiku nejdřív spusťte `npm run styl`.\n',
  );
}

const kUdelani = zadani.filter((polozka) => {
  if (jen && polozka.id !== jen) return false;
  if (!znovu && existuje(polozka.cil)) {
    console.log(`· ${polozka.id} — už existuje, přeskakuji`);
    return false;
  }
  return true;
});

if (kUdelani.length === 0) {
  console.log('\nNení co generovat.\n');
  process.exit(0);
}

for (const polozka of kUdelani) {
  console.log(`\n▸ ${polozka.id} — ${polozka.popis}`);

  // Společný prompt jde vždy první: určuje atmosféru, konkrétní zadání ji
  // jen upřesňuje. Díky tomu drží všechny obrázky pohromadě.
  const vstup = {
    prompt: `${styl.spolecnyPrompt} ${polozka.prompt}`,
    negative_prompt: styl.negativni,
    model: styl.model ?? 'recraftv3',
    size: polozka.velikost,
    n: 1,
    response_format: 'url',
  };

  // style_id a style se vzájemně vylučují — API odmítne oba naráz.
  // Bez vlastního stylu se aspoň vnutí značková paleta přes controls.
  if (styl.styleId) {
    vstup.style_id = styl.styleId;
  } else {
    vstup.style = styl.zakladniStyl;
    vstup.controls = { colors: styl.barvy.map(({ rgb }) => ({ rgb })) };
  }

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
  if (!url) throw new Error(`Odpověď bez obrázku: ${JSON.stringify(data)}`);

  await stahni(url, polozka.cil);

  // Recraft vrací WebP bez ohledu na příponu, kterou si zvolíme, a v plné
  // velikosti. Převod srovná formát s příponou a soubor zmenší.
  if (prevadet) {
    if (preved(polozka.cil, polozka.uprava)) {
      const mb = statSync(cesta(polozka.cil)).size / 1048576;
      console.log(`  ✓ ${polozka.cil} (${mb.toFixed(2)} MB)`);
    } else {
      console.warn(`  ⚠ ${polozka.cil} — převod selhal, ponechán původní soubor`);
    }
  } else {
    console.log(`  ✓ ${polozka.cil} (bez převodu — chybí ffmpeg)`);
  }
}

console.log('\nHotovo. Obrázky v src/assets/ zpracuje Astro samo;');
console.log('ty v public/ se kopírují tak, jak jsou.\n');
