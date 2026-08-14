/**
 * Vyrobí z referenčních obrázků vlastní styl v Recraftu a jeho ID zapíše
 * do grafika/styl.json.
 *
 * Tohle je ten krok, který drží grafiku pohromadě: od chvíle, kdy je
 * `styleId` vyplněné, jde každý další obrázek přes stejný styl a nezáleží
 * na tom, jak přesně je napsaný prompt.
 *
 * Použití:
 *   1. do grafika/reference/ dejte 1–5 obrázků, jak má web vypadat
 *      (klidně stažených odjinud, slouží jen jako vzor stylu)
 *   2. npm run styl
 */
import { readdir, readFile } from 'node:fs/promises';
import { klic, nactiJson, ulozJson, cesta, posli } from './lib.mjs';

const API = 'https://external.api.recraft.ai/v1';
const PODPOROVANE = /\.(png|jpe?g|webp)$/i;

const token = klic('RECRAFT_API_TOKEN', 'https://www.recraft.ai/ → API');
const styl = await nactiJson('grafika/styl.json');

let soubory;
try {
  soubory = (await readdir(cesta('grafika/reference'))).filter((s) =>
    PODPOROVANE.test(s),
  );
} catch {
  soubory = [];
}

if (soubory.length === 0) {
  console.error('\nVe složce grafika/reference/ nejsou žádné obrázky.');
  console.error('Vložte tam 1–5 vzorů (png/jpg/webp) a spusťte znovu.\n');
  process.exit(1);
}

console.log(`Zakládám styl z ${soubory.length} referencí: ${soubory.join(', ')}`);

const telo = new FormData();
telo.append('style', styl.zakladniStyl);
for (const soubor of soubory.slice(0, 5)) {
  const data = await readFile(cesta('grafika/reference', soubor));
  telo.append('file', new Blob([data]), soubor);
}

const odpoved = await posli(`${API}/styles`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: telo,
});

const vysledek = await odpoved.json();
const id = vysledek.id ?? vysledek.style_id;

if (!id) {
  console.error('Odpověď neobsahuje ID stylu:', JSON.stringify(vysledek));
  process.exit(1);
}

styl.styleId = id;
await ulozJson('grafika/styl.json', styl);

console.log(`\n✓ Styl založen: ${id}`);
console.log('  Zapsáno do grafika/styl.json — od teď ho použije každý obrázek.');
console.log('  Dalším krokem je `npm run obrazky`.\n');
