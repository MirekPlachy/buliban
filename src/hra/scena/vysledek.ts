/**
 * Výsledek levelu a konec hry.
 *
 * Signature prvek — **„linka rovnosti"**: jedna svítící vodorovná linka ve
 * výši cíle a u každého panáku odchylka nad/pod ní. Vysvětlí skóre beze slov.
 *
 * Od chvíle, kdy se rovnoměrnost měří proti cíli a ne proti průměru, leží
 * linka přesně tam, kde v prvních dvou levelech svítí orientační ryska.
 * Jedna a tatáž linka tedy po celou hru znamená „tolik měl mít každý" —
 * napřed jako nápověda, potom jako vysvětlení.
 *
 * Rozpad bodů je proto **nahoře v panelu**, ne přes scénu: linka a panáky
 * jsou to podstatné a čísla jim nesmí stát v cestě.
 */

import * as texty from '../texty.ts';
import type { StavRozlevani } from '../jadro/rozlevani.ts';
import type { VysledekLevelu } from '../jadro/skore.ts';
import { pruhledne } from './barvy.ts';
import type { Paleta } from './barvy.ts';
import type { Platno } from './platno.ts';
import { odstavec, sirkaTextu, text, vyskaOdstavce } from './pismo.ts';
import { kresliLinku, kresliPanel, stitek, zaobleny } from './prvky.ts';
import { sloupecX, stred } from './rozvrh.ts';
import type { Rozvrh } from './rozvrh.ts';
import { kresliPanaky, podilCile } from './stul.ts';

/** Jedna řádka rozpadu bodů: popis vlevo, hodnota vpravo. */
interface Polozka {
  popis: string;
  hodnota: string;
  barva: (paleta: Paleta) => string;
  /** Součet — silnější linka nad ním a výraznější písmo. */
  soucet?: boolean;
}

/**
 * Rozpad bodů za celý level. Fáze jdou v pořadí, ve kterém se hrály —
 * otevření, rozlévání, zážeh — aby se dal přečíst jako záznam, ne jako
 * tabulka. Nulové položky se vynechávají; prázdný řádek „Zážeh 0" by jen
 * opakoval to, co hráč před chvílí viděl na scéně.
 */
function rozpad(vl: VysledekLevelu): Polozka[] {
  const v = vl.rozlevani;
  const radky: Polozka[] = [];

  if (vl.otevirani > 0) {
    radky.push({
      popis: texty.vysledek.otevirani,
      hodnota: `${vl.otevirani}`,
      barva: (p) => p.par,
    });
  }

  radky.push({
    popis: texty.vysledek.rovnomernost,
    hodnota: `${v.rovnomernost}`,
    barva: (p) => p.par,
  });
  if (v.casovyBonus > 0) {
    radky.push({ popis: texty.vysledek.cas, hodnota: `+${v.casovyBonus}`, barva: (p) => p.par });
  }
  if (v.pokutaPreliti > 0) {
    radky.push({
      popis: texty.vysledek.preliti,
      hodnota: `−${v.pokutaPreliti}`,
      barva: (p) => p.zhava,
    });
  }
  if (v.pokutaRozlito > 0) {
    radky.push({
      popis: texty.vysledek.rozlito,
      hodnota: `−${v.pokutaRozlito}`,
      barva: (p) => p.zhava,
    });
  }
  if (v.pokutaZbytek > 0) {
    radky.push({
      popis: `${texty.vysledek.zbytek} (${v.zbytekMl.toFixed(0)} ml)`,
      hodnota: `−${v.pokutaZbytek}`,
      barva: (p) => p.zhava,
    });
  }
  if (v.presnaRuka) {
    radky.push({
      popis: texty.vysledek.presnaRuka,
      hodnota: '+500 · ×1,2',
      barva: (p) => p.zazeh,
    });
  }
  if (vl.zazeh > 0) {
    radky.push({
      popis: texty.vysledek.zazehBody,
      hodnota: `+${vl.zazeh}`,
      barva: (p) => p.zazeh,
    });
  }
  radky.push({
    popis: texty.vysledek.celkem,
    hodnota: `${vl.celkem}`,
    barva: (p) => p.rumSvetlo,
    soucet: true,
  });
  return radky;
}

export function kresliVysledek(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  stav: StavRozlevani,
  vl: VysledekLevelu,
): void {
  const { ctx } = platno;
  const u = r.ui;
  const v = vl.rozlevani;

  ctx.fillStyle = pruhledne(paleta.sklo, 0.78);
  ctx.fillRect(0, 0, r.sirka, r.vyska);

  // Odnesené panáky se ve výsledku vrátí — hráč má vidět, co vlastně nalil.
  kresliPanaky(platno, r, paleta, stav, true);

  const cilY = r.stulY - podilCile(stav) * r.panakVyska;
  ctx.strokeStyle = paleta.zazeh;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = paleta.zazeh;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(0, cilY);
  ctx.lineTo(r.sirka, cilY);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Popisek linky patří NAD řadu, ne k lince samotné: linka leží uvnitř
  // panáků a na užší obrazovce sahá řada až ke kraji, takže popisek u linky
  // přistane přes první sklo.
  stitek(
    ctx,
    texty.vysledek.linka,
    16 * u,
    r.stulY - r.panakVyska - 22 * u,
    r,
    pruhledne(paleta.zazeh, 0.9),
  );

  // Odchylka se píše nad linku, když je panák přelitý, a pod ni, když
  // chybí — poloha nese totéž co znaménko. Pod ní ale leží rum a nad ní
  // sklo, takže obojí potřebuje vlastní podklad; bez něj se čísla ztratí
  // přesně na těch panácích, kde na nich záleží nejvíc.
  const velikostOdchylky = Math.min(13 * u, r.rozestup / 4.4);
  v.odchylkyMl.forEach((odchylka, i) => {
    const presne = Math.abs(odchylka) < 0.5;
    const napis = {
      velikost: velikostOdchylky,
      barva: presne ? paleta.zazeh : paleta.zhava,
      zarovnani: 'center' as const,
      svisle: 'middle' as const,
      pismo: 'cisla' as const,
    };
    const obsah = `${odchylka >= 0 ? '+' : '−'}${Math.abs(odchylka).toFixed(1)}`;
    const x = stred(r, i);
    const y = cilY + (odchylka >= 0 ? -1 : 1) * velikostOdchylky * 1.35;
    const sirkaChipu = sirkaTextu(ctx, obsah, napis) + 10 * u;
    const vyskaChipu = velikostOdchylky * 1.5;

    zaobleny(ctx, x - sirkaChipu / 2, y - vyskaChipu / 2, sirkaChipu, vyskaChipu, vyskaChipu / 2);
    ctx.fillStyle = pruhledne(paleta.sklo, 0.82);
    ctx.fill();
    text(ctx, obsah, x, y, napis);
  });

  // ----------------------------------------------------------- panel s body
  const radky = rozpad(vl);
  const nazev = v.medaile ? texty.medaile[v.medaile] : texty.bezMedaile;
  const sirka = Math.min(r.sloupec, 420 * u);
  const odsazeni = 24 * u;
  const nadpis = {
    velikost: 23 * u,
    barva: v.medaile ? paleta.rumSvetlo : pruhledne(paleta.par, 0.75),
    zarovnani: 'center' as const,
    pismo: 'nadpis' as const,
    tucne: true,
  };
  const vyskaRadku = 22 * u;
  const vyskaNadpisu = vyskaOdstavce(ctx, nazev, sirka - 2 * odsazeni, nadpis, 1.2);
  const vyska = 20 * u + vyskaNadpisu + 16 * u + radky.length * vyskaRadku + 22 * u;

  const x = (r.sirka - sirka) / 2;
  const y = r.plochaY + 14 * u;
  kresliPanel(ctx, paleta, r, x, y, sirka, vyska, {
    obrys: pruhledne(v.medaile ? paleta.rum : paleta.par, 0.24),
  });

  let kurzor = y + 20 * u;
  text(ctx, nazev, r.sirka / 2, kurzor, { ...nadpis, svisle: 'top' });
  kurzor += vyskaNadpisu + 14 * u;

  for (const polozka of radky) {
    if (polozka.soucet) {
      kresliLinku(
        ctx,
        x + odsazeni,
        x + sirka - odsazeni,
        kurzor,
        pruhledne(paleta.par, 0.14),
      );
      kurzor += 2 * u;
    }
    const velikost = (polozka.soucet ? 15 : 13.5) * u;
    text(ctx, polozka.popis, x + odsazeni, kurzor + vyskaRadku / 2, {
      velikost,
      barva: pruhledne(paleta.par, polozka.soucet ? 0.9 : 0.65),
      svisle: 'middle',
    });
    text(ctx, polozka.hodnota, x + sirka - odsazeni, kurzor + vyskaRadku / 2, {
      velikost,
      barva: polozka.barva(paleta),
      zarovnani: 'right',
      svisle: 'middle',
      pismo: 'cisla',
    });
    kurzor += vyskaRadku;
  }

  text(ctx, texty.vysledek.dal, r.sirka / 2, r.spodniListaY + (r.vyska - r.spodniListaY) / 2, {
    velikost: 13 * u,
    barva: pruhledne(paleta.par, 0.55),
    zarovnani: 'center',
    svisle: 'middle',
  });
}

export function kresliKonec(
  platno: Platno,
  r: Rozvrh,
  paleta: Paleta,
  skore: number,
  medaile: string[],
): void {
  const { ctx } = platno;
  const u = r.ui;
  ctx.fillStyle = paleta.sklo;
  ctx.fillRect(0, 0, r.sirka, r.vyska);

  const sirka = r.sloupec;
  const x = sloupecX(r);
  const titul = {
    velikost: 30 * u,
    barva: paleta.rumSvetlo,
    zarovnani: 'center' as const,
    pismo: 'nadpis' as const,
    tucne: true,
  };
  // Titul se na užší obrazovce zalomí, takže výška panelu z něj musí plynout,
  // ne být zapsaná číslem.
  const vyskaTitulu = vyskaOdstavce(ctx, texty.titul(skore), sirka - 52 * u, titul, 1.2);
  const vyska = vyskaTitulu + 196 * u;
  const y = Math.max(r.plochaY, (r.vyska - vyska) / 2);
  kresliPanel(ctx, paleta, r, x, y, sirka, vyska, { obrys: pruhledne(paleta.rum, 0.28) });

  let kurzor = y + 26 * u;
  stitek(ctx, texty.konec.nadpis, r.sirka / 2, kurzor, r, pruhledne(paleta.rum, 0.9), 'center');

  kurzor += 26 * u;
  odstavec(ctx, texty.titul(skore), r.sirka / 2, kurzor, sirka - 52 * u, titul, 1.2);

  kurzor += vyskaTitulu + 16 * u;
  text(ctx, `${skore}`, r.sirka / 2, kurzor, {
    velikost: 34 * u,
    barva: paleta.par,
    zarovnani: 'center',
    svisle: 'top',
    pismo: 'cisla',
  });
  kurzor += 42 * u;
  stitek(ctx, texty.konec.body, r.sirka / 2, kurzor, r, pruhledne(paleta.par, 0.45), 'center');

  kurzor += 24 * u;
  kresliLinku(ctx, x + 40 * u, x + sirka - 40 * u, kurzor, pruhledne(paleta.par, 0.12));
  kurzor += 14 * u;
  text(ctx, medaile.join('  '), r.sirka / 2, kurzor, {
    velikost: 17 * u,
    barva: pruhledne(paleta.par, 0.7),
    zarovnani: 'center',
    svisle: 'top',
    pismo: 'cisla',
  });

  text(ctx, texty.konec.znovu, r.sirka / 2, r.spodniListaY + (r.vyska - r.spodniListaY) / 2, {
    velikost: 14 * u,
    barva: pruhledne(paleta.par, 0.6),
    zarovnani: 'center',
    svisle: 'middle',
  });
}
