/**
 * Rám obrazovky: horní lišta se stavem, spodní pás s nápovědou a karta
 * s výkladem před levelem.
 *
 * Lišty jsou **stejné pro všechny fáze**. Fáze 1 (otevírání láhve) a fáze 3
 * (zahřívání a zážeh) budou mít v ploše něco úplně jiného než panáky, ale
 * level, postup a skóre se čtou pořád na témže místě — jinak by každá fáze
 * vypadala jako jiná hra.
 *
 * Karta před levelem vysvětluje **jen to, co je nové**. Kdyby opakovala
 * všechna pravidla pokaždé, naučila by hráče kartu přeskakovat — a pak by
 * přehlédl i to jedno, na čem záleží.
 */

import { POSLEDNI_LEVEL } from '../levely.ts';
import { hud, napovedaPosledni, napovedy, ukazka as textyUkazky } from '../texty.ts';
import type { Karta } from '../texty.ts';
import type { StavRozlevani } from '../jadro/rozlevani.ts';
import { pruhledne } from './barvy.ts';
import type { Paleta } from './barvy.ts';
import type { Platno } from './platno.ts';
import { odstavec, text, vyskaOdstavce } from './pismo.ts';
import { kresliLinku, kresliPanel, stitek, zaobleny } from './prvky.ts';
import { sloupecX } from './rozvrh.ts';
import type { Rozvrh } from './rozvrh.ts';

/** Účaří štítku a hodnoty v liště, v podílech její výšky. */
const STITEK_Y = 0.22;
const HODNOTA_Y = 0.46;

function skupina(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  x: number,
  popis: string,
  hodnota: string,
  barva: string,
  zarovnani: CanvasTextAlign,
  cisla = false,
): void {
  stitek(platno.ctx, popis, x, r.hornilistaY * STITEK_Y, r, pruhledne(paleta.par, 0.45), zarovnani);
  text(platno.ctx, hodnota, x, r.hornilistaY * HODNOTA_Y, {
    velikost: 17 * r.ui,
    barva,
    zarovnani,
    svisle: 'top',
    pismo: cisla ? 'cisla' : 'nadpis',
  });
}

/**
 * Prostřední skupina lišty. Každá fáze tam píše něco jiného — panák k/N,
 * název otevírání, pokus k/3 — ale **na témže místě a stejným písmem**,
 * takže se lišta mezi fázemi nepřestavuje.
 */
export interface StredListy {
  popis: string;
  hodnota: string;
}

export function kresliListu(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  cisloLevelu: number,
  stred: StredListy,
  skore: number,
): void {
  const { ctx } = platno;
  const okraj = 20 * r.ui;

  ctx.fillStyle = pruhledne(paleta.skloStin, 0.55);
  ctx.fillRect(0, 0, r.sirka, r.hornilistaY);
  kresliLinku(ctx, 0, r.sirka, r.hornilistaY, pruhledne(paleta.par, 0.12));

  // Postup hrou jako vlásek na spodní hraně lišty. Osm levelů je krátká
  // hra a hráč má vidět, že se blíží konec — ne až na závěrečné obrazovce.
  ctx.fillStyle = pruhledne(paleta.rum, 0.75);
  ctx.fillRect(0, r.hornilistaY - 2, (r.sirka * cisloLevelu) / POSLEDNI_LEVEL, 2);

  skupina(
    platno,
    r,
    paleta,
    okraj,
    hud.level,
    `${cisloLevelu} / ${POSLEDNI_LEVEL}`,
    paleta.par,
    'left',
  );
  skupina(
    platno,
    r,
    paleta,
    r.sirka / 2,
    stred.popis,
    stred.hodnota,
    pruhledne(paleta.par, 0.85),
    'center',
    true,
  );
  skupina(
    platno,
    r,
    paleta,
    r.sirka - okraj,
    hud.skore,
    `${skore}`,
    paleta.rumSvetlo,
    'right',
    true,
  );
}

/**
 * Spodní pás s nápovědou. Jedna věta, vždy na témže místě — hráč se na ni
 * naučí dívat právě proto, že se nestěhuje.
 *
 * `povel` odlišuje „teď máš něco udělat" od „tohle se právě děje". Zvýrazněná
 * nápověda je pobídka, matná je popis; bez toho rozdílu hráč nepozná, kdy je
 * na řadě.
 */
export function kresliNapovedu(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  obsah: string,
  povel = false,
): void {
  if (!obsah) return;

  text(platno.ctx, obsah, r.sirka / 2, r.spodniListaY + (r.vyska - r.spodniListaY) / 2, {
    velikost: 14 * r.ui,
    barva: pruhledne(povel ? paleta.rumSvetlo : paleta.par, povel ? 0.95 : 0.5),
    zarovnani: 'center',
    svisle: 'middle',
  });
}

/** Nápověda pro rozlévání — zná pravidlo o posledním panáku a předání po ukázce. */
export function napovedaRozlevani(stav: StavRozlevani, poUkazce: boolean): string {
  if (stav.faze === 'hotovo') return '';
  const posledni = stav.aktivni === stav.konfig.panaku - 1;
  if (poUkazce) return textyUkazky.patka;
  return posledni && stav.faze === 'ceka' ? napovedaPosledni : napovedy[stav.faze];
}

/**
 * Komentář běžící při ukázce.
 *
 * Sedí **nahoře v ploše**, ne dole u nápovědy: dole stojí panáky a hladina
 * v nich je to hlavní, co má ukázka předvést — panel přes ně schová přesně
 * to, na co se hráč má koukat. Nahoře nejvýš na chvíli překryje kus láhve.
 * Je to tedy stejné místo, kde pak vysvětluje výsledek levelu.
 */
export function kresliKomentarUkazky(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  obsah: string,
): void {
  const { ctx } = platno;
  const napis = {
    velikost: 14.5 * r.ui,
    barva: pruhledne(paleta.par, 0.92),
    zarovnani: 'center' as const,
  };
  const sirka = r.sloupec;
  const x = sloupecX(r);
  const odsazeni = 18 * r.ui;
  const vyskaTextu = vyskaOdstavce(ctx, obsah, sirka - 2 * odsazeni, napis, 1.4);
  const vyska = vyskaTextu + 42 * r.ui;
  const y = r.plochaY + 14 * r.ui;

  kresliPanel(ctx, paleta, r, x, y, sirka, vyska, {
    kryti: 0.94,
    obrys: pruhledne(paleta.zazeh, 0.28),
  });

  // Značka „Ukázka" sedí v hraně panelu, ať je jasné, že to hraje hra.
  stitek(
    ctx,
    textyUkazky.znacka,
    r.sirka / 2,
    y + 13 * r.ui,
    r,
    pruhledne(paleta.zazeh, 0.85),
    'center',
  );
  odstavec(ctx, obsah, r.sirka / 2, y + 30 * r.ui, sirka - 2 * odsazeni, napis, 1.4);
}

/** Pobídka „Přeskočit ukázku" ve spodní liště — tam, kde jinak bývá nápověda. */
export function kresliPreskoceni(platno: Platno, r: Rozvrh, paleta: Paleta): void {
  text(
    platno.ctx,
    textyUkazky.preskocit,
    r.sirka / 2,
    r.spodniListaY + (r.vyska - r.spodniListaY) / 2,
    {
      velikost: 12.5 * r.ui,
      barva: pruhledne(paleta.par, 0.45),
      zarovnani: 'center',
      svisle: 'middle',
    },
  );
}

/**
 * Karta s výkladem před levelem. Přes celou scénu, protože je to jediná
 * chvíle, kdy má hráč číst a ne mířit.
 *
 * Panel se napřed **změří a pak posadí**. Dřív začínal na pevném `y` a rostl
 * dolů, takže karta o jednom odstavci visela vysoko a karta o čtyřech lezla
 * do spodní lišty.
 */
export function kresliKartu(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  karta: Karta,
  cisloLevelu: number,
  patka: string,
): void {
  const { ctx } = platno;
  const u = r.ui;
  const sirka = r.sloupec;
  const odsazeni = 26 * u;
  const textSirka = sirka - 2 * odsazeni;

  const nadpis = {
    velikost: 27 * u,
    barva: paleta.rumSvetlo,
    zarovnani: 'center' as const,
    pismo: 'nadpis' as const,
    tucne: true,
  };
  const telo = { velikost: 15.5 * u, barva: pruhledne(paleta.par, 0.86) };

  const vyskaNadpisu = vyskaOdstavce(ctx, karta.nadpis, textSirka, nadpis, 1.2);
  const mezera = 12 * u;
  const vyskaRadku = karta.radky.map((radek) => vyskaOdstavce(ctx, radek, textSirka, telo));
  const vyskaObsahu =
    22 * u + vyskaNadpisu + 22 * u + vyskaRadku.reduce((a, b) => a + b + mezera, -mezera);
  const vyska = vyskaObsahu + 42 * u + 38 * u;

  ctx.fillStyle = pruhledne(paleta.sklo, 0.86);
  ctx.fillRect(0, 0, r.sirka, r.vyska);

  const x = sloupecX(r);
  const y = Math.max(r.plochaY, (r.vyska - vyska) / 2);
  kresliPanel(ctx, paleta, r, x, y, sirka, vyska, { obrys: pruhledne(paleta.rum, 0.28) });

  let kurzor = y + 20 * u;
  stitek(
    ctx,
    `${hud.level} ${cisloLevelu}`,
    r.sirka / 2,
    kurzor,
    r,
    pruhledne(paleta.rum, 0.9),
    'center',
  );

  kurzor += 22 * u;
  kurzor = odstavec(ctx, karta.nadpis, r.sirka / 2, kurzor, textSirka, nadpis, 1.2);

  kurzor += 11 * u;
  kresliLinku(ctx, r.sirka / 2 - 22 * u, r.sirka / 2 + 22 * u, kurzor, pruhledne(paleta.rum, 0.5));
  kurzor += 11 * u;

  for (const radek of karta.radky) {
    kurzor = odstavec(ctx, radek, x + odsazeni, kurzor, textSirka, telo) + mezera;
  }

  // Patka sedí na spodní hraně panelu, ne pod obrazovkou: karta je jedna věc,
  // a pobídka k ní patří.
  const patkaY = y + vyska - 38 * u;
  kresliLinku(ctx, x + odsazeni, x + sirka - odsazeni, patkaY, pruhledne(paleta.par, 0.1));
  text(ctx, patka, r.sirka / 2, patkaY + 19 * u, {
    velikost: 13 * u,
    barva: pruhledne(paleta.par, 0.55),
    zarovnani: 'center',
    svisle: 'middle',
  });
}

/** Rámeček kolem celé plochy — rám scény, do kterého se kreslí každá fáze. */
export function kresliRam(platno: Platno, r: Rozvrh, paleta: Paleta): void {
  const { ctx } = platno;
  const okraj = 10 * r.ui;
  zaobleny(
    ctx,
    okraj,
    r.plochaY + okraj,
    r.sirka - 2 * okraj,
    r.plochaVyska - 2 * okraj,
    16 * r.ui,
  );
  ctx.strokeStyle = pruhledne(paleta.par, 0.06);
  ctx.lineWidth = 1;
  ctx.stroke();
}
