/**
 * Vygeneruje kandidáty na referenční obrázky.
 *
 * Řeší slepici a vejce: `npm run styl` potřebuje vzory toho, jak má web
 * vypadat — jenže když žádné nemáte, není kde začít. Tenhle skript nechá
 * vzory vyrobit samotný Recraft. Vy z nich vyberete ty, které trefily
 * náladu, a z těch se teprve zamkne styl.
 *
 * Celý postup:
 *   1. npm run vzory                       → grafika/reference/kandidati/
 *   2. prohlédnout, 1–3 nejlepší přesunout o složku výš do reference/
 *   3. npm run styl                        → zamkne styl podle nich
 *   4. npm run obrazky                     → grafika webu pod tím stylem
 *
 * Kandidáti jsou jednorázoví, do gitu nepatří. Vybrané vzory ano —
 * dokumentují, jak vzhled webu vznikl.
 */
import { klic, nactiJson, stahni, posli } from './lib.mjs';

const API = 'https://external.api.recraft.ai/v1';
const POCET = 6; // horní mez, kterou API zvládne na jedno volání

const token = klic('RECRAFT_API_TOKEN', 'https://www.recraft.ai/ → API');
const styl = await nactiJson('grafika/styl.json');

console.log(`Generuji ${POCET} kandidátů na vzor…`);
console.log(`Model: ${styl.model}\n`);

const odpoved = await posli(`${API}/images/generations`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    // Záměrně jen společný prompt bez konkrétního zadání: hledá se
    // atmosféra webu, ne jedna určitá scéna.
    prompt: styl.spolecnyPrompt,
    negative_prompt: styl.negativni,
    model: styl.model ?? 'recraftv3',
    style: styl.zakladniStyl,
    controls: { colors: styl.barvy.map(({ rgb }) => ({ rgb })) },
    size: '1365x1024',
    n: POCET,
    response_format: 'url',
  }),
});

const { data } = await odpoved.json();

if (!data?.length) {
  console.error('Odpověď neobsahuje obrázky.');
  process.exit(1);
}

for (const [poradi, polozka] of data.entries()) {
  const cil = `grafika/reference/kandidati/kandidat-${poradi + 1}.png`;
  await stahni(polozka.url, cil);
  console.log(`  ✓ ${cil}`);
}

console.log(`
Hotovo — ${data.length} kandidátů v grafika/reference/kandidati/

Dalším krokem je výběr:
  1. Prohlédněte si je a vyberte 1–3, které nejlíp trefily náladu webu.
     Vybírejte podle atmosféry a barev, ne podle konkrétního motivu.
  2. Přesuňte je o složku výš, přímo do grafika/reference/
  3. npm run styl
`);
