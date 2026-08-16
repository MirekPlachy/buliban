/**
 * Rozliší čtyři plameny v obrázku `opakovane` — barvou a tvarem.
 *
 *   npm run plameny
 *
 * Proč tenhle krok vůbec existuje: Recraft ze čtyř lahví v řadě udělá čtyři
 * stejně modré plameny a přemluvit se nedá. Zkoušel se inpaint i
 * image-to-image; inpaint z každého plamene udělal svíčku i s čajovou svíčkou
 * na dně, image-to-image plameny naopak jen rozmazal a do čtvrté láhve
 * přimaloval druhou láhev. Obojí navíc sáhlo na sklo, které je přitom
 * v pořádku. Tohle je proto obyčejné počítání nad pixely, žádný model.
 *
 * Trik je v tom, že plamen na snímku je čistá modrá emise (R≈0, B až 249) na
 * tmavém skle (R>G>B, hodnoty do 21). Jde tedy vzít jako svítící vrstva:
 * originál se o ni „očistí“ na tón nesvítícího skla, vrstva se zvlášť
 * přeškáluje kolem svého dna, obarví a přičte zpátky. Cokoli, co není modré,
 * zůstává bit po bitu na svém — sklo, hrdla, odlesky i pozadí.
 *
 * Vstupem je ZÁKLAD v `grafika/zaklad/`, ne hotový obrázek v `src/`. Bez toho
 * by druhé spuštění obarvilo už obarvené plameny. Když se `opakovane`
 * přegeneruje (`npm run obrazky -- --jen=opakovane --znovu`), patří nový
 * výsledek nejdřív do `grafika/zaklad/` a teprve pak sem.
 */
import { writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { cesta, maFfmpeg } from './lib.mjs';

const ZAKLAD = 'grafika/zaklad/opakovane.webp';
const CIL = 'src/assets/generovane/opakovane.webp';
const W = 1820, H = 780;

const SKLO = [13, 10, 8];   // tón nesvítícího skla, kterým se plamen podmázne
const SHORA = 310;          // výš jsou na ramenou jen odlesky, ty se nechávají

/**
 * Horní okraj vrstvy se musí rozplynout, ne useknout. Ostrá hranice udělá
 * z plamene rovně zaříznutý sloup a po zesílení teplé špičky je ten šev vidět
 * ze všeho nejvíc. Do 315 px je vrstva nulová, od 350 px plná.
 */
const doslabu = (y) => Math.max(0, Math.min(1, (y - 315) / 35));

const ZLUTA = [1, 0.72, 0.12];
const CERVENA = [1, 0.26, 0.05];

/**
 * `od`/`do` je vodorovný rozsah láhve, `sx`/`sy` roztažení plamene kolem jeho
 * dna, `ton` teplý nádech špičky. Kapitola je o opakovaném zapálení, takže
 * čtyři zážehy po sobě mají vypadat jako čtyři různé zážehy, ne jako kopie.
 */
const LAHVE = [
  // sy nesmí přes 1: vyšší plamen narazí na horní hranici vrstvy a uřízne se.
  { od: 380, do: 592, sx: 0.90, sy: 1.00, ton: ZLUTA, sila: 0.92 },
  { od: 668, do: 870, sx: 1.00, sy: 0.94, ton: CERVENA, sila: 0.88 },
  { od: 944, do: 1154, sx: 0.80, sy: 0.80, ton: null, sila: 0 },
  { od: 1220, do: 1423, sx: 1.30, sy: 1.00, ton: null, sila: 0 },
];

if (!maFfmpeg()) {
  console.error('\nChybí ffmpeg — bez něj se obrázek nedá načíst ani uložit.\n');
  process.exit(1);
}
if (!existsSync(cesta(ZAKLAD))) {
  console.error(`\nChybí ${ZAKLAD}. Je to vygenerovaný obrázek před obarvením plamenů.\n`);
  process.exit(1);
}

const zdroj = spawnSync('ffmpeg',
  ['-v', 'error', '-i', cesta(ZAKLAD), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
  { maxBuffer: 1e9 }).stdout;

if (zdroj.length !== W * H * 3) {
  console.error(`\n${ZAKLAD} má jiný rozměr, než se čeká (${W}×${H}). Souřadnice lahví by seděly jinam.\n`);
  process.exit(1);
}

const cil = Buffer.from(zdroj);
const alfa = (R, B, y) => Math.max(0, Math.min(1, (B - R - 15) / 55)) * doslabu(y);

for (const lahev of LAHVE) {
  // 1. Kde plamen je: těžiště, dno a výška se počítají z obrázku, ať se
  //    souřadnice nemusí opisovat ručně.
  let yMin = H, yMax = 0, xSum = 0, vaha = 0;
  for (let y = SHORA; y < H; y++) for (let x = lahev.od; x < lahev.do; x++) {
    const i = (y * W + x) * 3, a = alfa(zdroj[i], zdroj[i + 2], y);
    if (a > 0.05) { if (y < yMin) yMin = y; if (y > yMax) yMax = y; xSum += x * a; vaha += a; }
  }
  const cx = xSum / vaha, yDno = yMax, vyska = yMax - yMin;
  // Roztažený plamen je řidší, stažený hustší — jas se dorovná podle plochy.
  const jas = 1 / Math.sqrt(lahev.sx * lahev.sy);

  // 2. Původní plamen z obrázku ven, zůstane nesvítící sklo.
  for (let y = SHORA; y < H; y++) for (let x = lahev.od; x < lahev.do; x++) {
    const i = (y * W + x) * 3, a = alfa(zdroj[i], zdroj[i + 2], y);
    if (a > 0) for (let k = 0; k < 3; k++) cil[i + k] = Math.round(zdroj[i + k] * (1 - a) + SKLO[k] * a);
  }

  const vzorek = (fx, fy) => {
    if (fx < lahev.od || fx >= lahev.do - 1 || fy < SHORA || fy >= H - 1) return null;
    const x0 = Math.floor(fx), y0 = Math.floor(fy), dx = fx - x0, dy = fy - y0;
    let G = 0, B = 0;
    for (const [xx, yy, w] of [[x0, y0, (1 - dx) * (1 - dy)], [x0 + 1, y0, dx * (1 - dy)],
                              [x0, y0 + 1, (1 - dx) * dy], [x0 + 1, y0 + 1, dx * dy]]) {
      const i = (yy * W + xx) * 3, a = alfa(zdroj[i], zdroj[i + 2], yy);
      G += w * a * zdroj[i + 1]; B += w * a * zdroj[i + 2];
    }
    return [G, B];
  };

  // 3. Vrstva zpátky — přeškálovaná kolem dna a obarvená.
  for (let y = SHORA; y < H; y++) for (let x = lahev.od; x < lahev.do; x++) {
    const v = vzorek(cx + (x - cx) / lahev.sx, yDno + (y - yDno) / lahev.sy);
    if (!v) continue;
    const [G, B] = v;
    if (B < 2) continue;

    // Barva se míchá při zachovaném jasu. Prosté přičtení červené k modré
    // dá růžovou; tohle otočí odstín a jas nechá na plameni.
    let barva = [0, G / B, 1];
    let zesileni = 1;
    if (lahev.ton) {
      // Teplý nádech patří ke špičce, ne k patě — dole plamen zůstává modrý,
      // přesně jak to popisuje text kapitoly první.
      const h = Math.max(0, Math.min(1, (yDno - y) / vyska));
      const t = Math.max(0, Math.min(1, (h - 0.25) / 0.4)) * lahev.sila;
      barva = barva.map((c, k) => c * (1 - t) + lahev.ton[k] * t);
      // Teplá část plamene je i jasnější, jinak z ní zbude bledá šmouha.
      zesileni = 1 + 0.9 * t;
    }
    const I = B * jas * zesileni;
    const i = (y * W + x) * 3;
    for (let k = 0; k < 3; k++) cil[i + k] = Math.min(255, Math.round(cil[i + k] + I * barva[k]));
  }
}

const docasny = cesta('grafika/zaklad/.plameny.raw');
writeFileSync(docasny, cil);
const hotovo = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
  '-s', `${W}x${H}`, '-i', docasny, cesta(CIL)]);
spawnSync('node', ['-e', `require('fs').unlinkSync(${JSON.stringify(docasny)})`]);

if (hotovo.status !== 0) {
  console.error('\nUložení přes ffmpeg selhalo.\n');
  process.exit(1);
}

console.log(`\n✓ ${CIL} — čtyři plameny: žlutá špička, červená špička, menší, širší\n`);
