import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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

/**
 * Volání API s opakováním. Generátory občas vrátí 429 nebo 5xx a zopakování
 * po chvíli projde — nemá cenu kvůli tomu shodit celý běh.
 */
export async function posli(url, nastaveni, pokusu = 3) {
  for (let pokus = 1; pokus <= pokusu; pokus++) {
    const odpoved = await fetch(url, nastaveni);
    if (odpoved.ok) return odpoved;

    const telo = await odpoved.text();
    const posledni = pokus === pokusu;
    const zkusitZnovu = odpoved.status === 429 || odpoved.status >= 500;

    if (posledni || !zkusitZnovu) {
      throw new Error(`${url} → ${odpoved.status}\n${telo.slice(0, 500)}`);
    }

    const cekat = pokus * 4000;
    console.warn(`  ⚠ ${odpoved.status}, zkouším znovu za ${cekat / 1000} s…`);
    await new Promise((hotovo) => setTimeout(hotovo, cekat));
  }
}

/** Argumenty typu `--jen=hero` nebo `--znovu`. */
export function argumenty() {
  const args = process.argv.slice(2);
  return {
    znovu: args.includes('--znovu'),
    jen: args.find((a) => a.startsWith('--jen='))?.split('=')[1] ?? null,
  };
}
