import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync, renameSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KOREN = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Cesta relativní ke kořeni projektu, ať skripty fungují odkudkoli. */
export const cesta = (...casti) => resolve(KOREN, ...casti);

export async function nactiJson(relativni) {
  return JSON.parse(await readFile(cesta(relativni), 'utf8'));
}

export async function ulozJson(relativni, data) {
  await writeFile(cesta(relativni), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Přečte klíč z prostředí. Skripty se spouštějí přes `node --env-file=.env`,
 * takže klíč nikdy nesmí skončit v gitu.
 */
export function klic(nazev, kdeVzit) {
  const hodnota = process.env[nazev];
  if (!hodnota) {
    console.error(`\nChybí ${nazev}.\n`);
    console.error(`  1. Vezměte klíč zde: ${kdeVzit}`);
    console.error(`  2. Zapište ho do souboru .env v kořeni projektu:`);
    console.error(`       ${nazev}=...\n`);
    console.error(`  (.env je v .gitignore, do repozitáře se nedostane.)\n`);
    process.exit(1);
  }
  return hodnota;
}

export async function zajistiSlozku(souborovaCesta) {
  await mkdir(dirname(souborovaCesta), { recursive: true });
}

export const existuje = (relativni) => existsSync(cesta(relativni));

/** Stáhne výsledek generování a uloží ho na disk. */
export async function stahni(url, cilRelativni) {
  const odpoved = await fetch(url);
  if (!odpoved.ok) {
    throw new Error(`Stažení selhalo (${odpoved.status}): ${url}`);
  }
  const cil = cesta(cilRelativni);
  await zajistiSlozku(cil);
  await writeFile(cil, Buffer.from(await odpoved.arrayBuffer()));
  return cil;
}

export const maFfmpeg = () =>
  spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

/**
 * Převede stažený obrázek do formátu, který odpovídá jeho příponě.
 *
 * Recraft vrací WebP bez ohledu na to, jak si soubor pojmenujeme. Uložit ho
 * jako `.jpg` znamená, že server pošle hlavičku `image/jpeg` s WebP obsahem —
 * prohlížeče to obvykle přežijí, ale scrapery náhledů pro sociální sítě
 * takový obrázek odmítnou. Navíc chodí v plné velikosti, klidně přes 2 MB.
 *
 * `uprava` je volitelný filtr pro ffmpeg, např. ořez a zmenšení na přesný
 * rozměr otevíracího obrázku.
 */
export function preved(cilRelativni, uprava) {
  const cil = cesta(cilRelativni);
  const docasny = `${cil}.stazeno`;

  renameSync(cil, docasny);

  const prepinace = ['-y', '-i', docasny];
  if (uprava) prepinace.push('-vf', uprava);
  if (/\.jpe?g$/i.test(cil)) prepinace.push('-q:v', '4');
  prepinace.push(cil);

  const vysledek = spawnSync('ffmpeg', prepinace, { stdio: 'ignore' });

  if (vysledek.status !== 0) {
    // Radši nechat původní soubor než skončit s ničím.
    renameSync(docasny, cil);
    return false;
  }

  unlinkSync(docasny);
  return true;
}

/**
 * Volání API s opakováním. Generátory občas vrátí 429 nebo 5xx a zopakování
 * po chvíli projde — nemá cenu kvůli tomu shodit celý běh.
 *
 * Dvě věci navíc, obojí vyplavalo při přegenerování celé sady:
 *
 * 1. **Strop na dobu čekání.** `fetch` sám o sobě čeká, jak dlouho je potřeba.
 *    Jeden požadavek na Recraft se takhle zasekl na čtyři minuty a skončil
 *    stavem 499 (server zahodil spojení), zatímco tentýž prompt normálně
 *    doběhne za čtyři vteřiny. Bez stropu tenhle stav zdrží celý běh.
 * 2. **Opakování i na 499 a na spadlé spojení.** Obojí je porucha přenosu,
 *    ne odmítnutí zadání — a bez toho stačí jedno škytnutí sítě, aby se
 *    dvacetikusová dávka zabila hned na prvním obrázku.
 */
export async function posli(url, nastaveni, pokusu = 3, limitMs = 120000) {
  for (let pokus = 1; pokus <= pokusu; pokus++) {
    const posledni = pokus === pokusu;
    let odpoved;

    try {
      odpoved = await fetch(url, {
        ...nastaveni,
        signal: AbortSignal.timeout(limitMs),
      });
    } catch (chyba) {
      // Vypršelý strop i spadlé spojení končí tady, ne návratovým kódem.
      if (posledni) throw new Error(`${url} → spojení selhalo: ${chyba.message}`);
      console.warn(`  ⚠ ${chyba.message}, zkouším znovu…`);
      await new Promise((hotovo) => setTimeout(hotovo, pokus * 4000));
      continue;
    }

    if (odpoved.ok) return odpoved;

    const telo = await odpoved.text();
    const zkusitZnovu =
      odpoved.status === 429 || odpoved.status === 499 || odpoved.status >= 500;

    if (posledni || !zkusitZnovu) {
      throw new Error(`${url} → ${odpoved.status}\n${telo.slice(0, 500)}`);
    }

    const cekat = pokus * 4000;
    console.warn(`  ⚠ ${odpoved.status}, zkouším znovu za ${cekat / 1000} s…`);
    await new Promise((hotovo) => setTimeout(hotovo, cekat));
  }
}

/** Argumenty typu `--jen=og` nebo `--znovu`. */
export function argumenty() {
  const args = process.argv.slice(2);
  return {
    znovu: args.includes('--znovu'),
    jen: args.find((a) => a.startsWith('--jen='))?.split('=')[1] ?? null,
  };
}
