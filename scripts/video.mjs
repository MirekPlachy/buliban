/**
 * Rozpohybuje hotové obrázky na krátké smyčky (image-to-video přes fal.ai).
 *
 * Proč z obrázků a ne z promptu: video pak vychází přímo z grafiky, která
 * už prošla zamčeným stylem v Recraftu. Kdyby se generovalo samostatně,
 * vymyslelo by si vlastní estetiku a web by se rozpadl na dva světy.
 *
 * Po stažení MP4 se pokusí zavolat ffmpeg a dodělat:
 *   - .webm (AV1) — řádově menší soubor, který dostane většina návštěvníků
 *   - .jpg plakát — první snímek, který drží místo, než se video načte
 * Bez ffmpegu skript doběhne taky, jen zůstane u MP4 a řekne, co dodělat.
 *
 *   npm run video
 *   npm run video -- --jen=vertikalni
 *   npm run video -- --znovu
 */
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fal } from '@fal-ai/client';
import { klic, nactiJson, cesta, existuje, stahni, argumenty } from './lib.mjs';

const token = klic('FAL_KEY', 'https://fal.ai/dashboard/keys');
fal.config({ credentials: token });

const zadani = await nactiJson('grafika/video.json');
const { znovu, jen } = argumenty();

const maFfmpeg =
  spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

if (!maFfmpeg) {
  console.warn(
    '\n⚠ ffmpeg není na PATH — vznikne jen MP4.\n' +
      '  WebM a plakát se pak musí dodělat ručně (příkazy vypíšu na konci).\n',
  );
}

const kUdelani = zadani.smycky.filter((smycka) => {
  if (jen && smycka.id !== jen) return false;
  if (!znovu && existuje(`${smycka.cil}.mp4`)) {
    console.log(`· ${smycka.id} — už existuje, přeskakuji`);
    return false;
  }
  if (!existuje(smycka.zdroj)) {
    console.warn(`· ${smycka.id} — chybí zdrojový obrázek ${smycka.zdroj}`);
    console.warn('  Nejdřív spusťte `npm run obrazky`.');
    return false;
  }
  return true;
});

if (kUdelani.length === 0) {
  console.log('\nNení co generovat.\n');
  process.exit(0);
}

for (const smycka of kUdelani) {
  console.log(`\n▸ ${smycka.id} — ${smycka.popis}`);

  // fal potřebuje obrázek na své straně; klient se o nahrání postará sám.
  const data = await readFile(cesta(smycka.zdroj));
  const nazev = smycka.zdroj.split('/').pop();
  const pripona = nazev.split('.').pop().toLowerCase();
  const typ = { png: 'image/png', webp: 'image/webp' }[pripona] ?? 'image/jpeg';
  const adresaObrazku = await fal.storage.upload(
    new File([data], nazev, { type: typ }),
  );
  console.log('  · obrázek nahrán');

  // Jedna odmítnutá smyčka nesmí shodit zbytek běhu. Nejčastější důvod je
  // content checker fal.ai — ten hlídá i slova, která ve spojení s ohněm
  // vypadají nevinně („shoots“, „dies down“), takže se to stává.
  let vysledek;
  try {
    vysledek = await fal.subscribe(zadani.model, {
      input: {
        image_url: adresaObrazku,
        prompt: smycka.prompt,
        duration: smycka.delka,
      },
      logs: false,
      onQueueUpdate: (stav) => {
        if (stav.status === 'IN_PROGRESS') process.stdout.write('.');
      },
    });
  } catch (chyba) {
    const detail = chyba?.body?.detail?.[0]?.msg ?? chyba.message;
    console.warn(`\n  ⚠ ${smycka.id} přeskočena: ${detail}`);
    continue;
  }

  const adresaVidea = vysledek.data?.video?.url ?? vysledek.data?.url;
  if (!adresaVidea) {
    throw new Error(`Odpověď bez videa: ${JSON.stringify(vysledek.data)}`);
  }

  await stahni(adresaVidea, `${smycka.cil}.mp4`);
  console.log(`\n  ✓ ${smycka.cil}.mp4`);

  if (maFfmpeg) {
    const mp4 = cesta(`${smycka.cil}.mp4`);

    // AV1 ve WebM: výrazně menší soubor při stejné kvalitě. CRF 34 je
    // u tmavého záběru s plamenem dobrý kompromis.
    spawnSync(
      'ffmpeg',
      ['-y', '-i', mp4, '-c:v', 'libsvtav1', '-crf', '34', '-an',
       cesta(`${smycka.cil}.webm`)],
      { stdio: 'ignore' },
    );

    // Plakát = první snímek.
    spawnSync(
      'ffmpeg',
      ['-y', '-i', mp4, '-vframes', '1', '-q:v', '4',
       cesta(`${smycka.cil}-plakat.jpg`)],
      { stdio: 'ignore' },
    );

    console.log(`  ✓ ${smycka.cil}.webm + plakát`);
  }
}

if (!maFfmpeg) {
  console.log('\nDodělat po instalaci ffmpegu:');
  for (const s of kUdelani) {
    console.log(`  ffmpeg -i ${s.cil}.mp4 -c:v libsvtav1 -crf 34 -an ${s.cil}.webm`);
    console.log(`  ffmpeg -i ${s.cil}.mp4 -vframes 1 -q:v 4 ${s.cil}-plakat.jpg`);
  }
}

console.log('\nHotovo. Zkontrolujte velikost souborů — klipy u sekcí do ~2 MB.\n');
