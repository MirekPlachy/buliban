/**
 * Canvas: rozlišení, DPR a reakce na změnu velikosti.
 *
 * Jediná část vykreslování, která se nezajímá o to, co se kreslí.
 */

export interface Platno {
  ctx: CanvasRenderingContext2D;
  /** Rozměry v CSS pixelech; kreslí se v nich, ne v zařízených. */
  sirka: number;
  vyska: number;
  /**
   * Vrátí souřadnice do světa scény. Potřebuje to kreslení kapaliny
   * v otočené láhvi: obrys se ořízne v soustavě láhve, ale hladina musí
   * zůstat vodorovná ve světě — jinak by se tekutina naklonila s lahví.
   */
  svet(): void;
  znic(): void;
}

export function pripravPlatno(canvas: HTMLCanvasElement): Platno {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D není k dispozici.');

  let dpr = 1;
  const platno: Platno = {
    ctx,
    sirka: 0,
    vyska: 0,
    svet: () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0),
    znic: () => {},
  };

  const prepocitej = (): void => {
    const rect = canvas.getBoundingClientRect();
    // Strop na dvojnásobku: na telefonech s DPR 3 by trojnásobné plátno
    // spolykalo výkon, který hra potřebuje na plynulých 60 fps.
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    platno.sirka = Math.max(1, Math.round(rect.width));
    platno.vyska = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(platno.sirka * dpr);
    canvas.height = Math.round(platno.vyska * dpr);
    platno.svet();
  };

  prepocitej();
  const sledovac = new ResizeObserver(prepocitej);
  sledovac.observe(canvas);
  platno.znic = () => sledovac.disconnect();

  return platno;
}
