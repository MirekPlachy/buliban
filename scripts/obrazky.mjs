/**
 * Vygeneruje obrázky podle grafika/zadani.json přes Recraft V3.
 *
 * Hotové soubory přeskakuje, takže opakované spuštění nestojí nic a
 * negeneruje znovu to, co už na disku je. Přegenerovat jde cíleně:
 *
 *   npm run obrazky              všechno, co chybí
 *   npm run obrazky -- --jen=og      jen jeden kus
 *   npm run obrazky -- --znovu       přepsat i to, co existuje
 *
 * Položka se `zamceno: true` je schválený obrázek, který se hromadnému
 * `--znovu` neposkytne. Přegenerovat ji jde jen adresně přes `--jen=`.
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

  // Zámek na schválené obrázky. Bez něj stačí jedno `--znovu` a hotová věc,
  // kterou si zadavatel vybral, je nenávratně přegenerovaná — přesně to se
  // stalo obrázku `nauka`. Adresné `--jen=` zámek obejde, protože tam je
  // úmysl zjevný.
  if (polozka.zamceno && !jen) {
    console.log(`🔒 ${polozka.id} — schválený obrázek, přeskakuji`);
    return false;
  }

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

  // Konkrétní zadání jde první, společný styl za ním. Obráceně to nefunguje:
  // model si z dlouhého společného úvodu vezme scénu ("teplé světlo lucerny,
  // parta kolem") a konkrétní scénu za ním už jen dobarví. Jednotnost drží
  // zamčený styleId, ne pozice v promptu.
  const vstup = {
    prompt: `${polozka.prompt} ${styl.spolecnyPrompt}`,
    // Zákazy z bible platí všude; položka si může přidat vlastní. Nutné kvůli
    // barvě plamene: u modrého zážehu je oranžový plamen chyba, ale u táboráku
    // a svíčky je to přesně ono, takže do společného seznamu patřit nemůže.
    //
    // Pořadí je stejné jako u promptu a ze stejného důvodu: konkrétní zadání
    // první. Seznam je dlouhý a model bere začátek vážněji než konec — když
    // byly zákazy z bible vpředu, „blue light, blue clothing“ na konci se
    // ztratilo a ze zahřívání vodou vyšla scéna v modrém.
    negative_prompt: [polozka.negativni, styl.negativni]
      .filter(Boolean)
      .join(', '),
    model: styl.model ?? 'recraftv3',
    size: polozka.velikost,
    n: 1,
    response_format: 'url',
  };

  // Bez seedu je každý běh loterie. Jakmile se obrázek povede, seed z výpisu
  // níže patří do zadani.json — pak ho jde přegenerovat beze změny výsledku.
  if (polozka.seed !== undefined) vstup.random_seed = polozka.seed;

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
