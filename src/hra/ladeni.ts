/**
 * Všechny ladicí konstanty hry na jednom místě.
 *
 * V herním designu (`buliban-minihra-herni-design.md`) jsou označené 🔧 a
 * dokument o nich výslovně říká, že patří do jednoho konfiguračního souboru.
 * Důvod je praktický: po playtestu se doostřují všechny naráz a hledat je
 * roztroušené po kódu je ta nejdražší část ladění.
 *
 * Pravidlo: v `jadro/` ani v `scena/` nesmí být žádné číslo, které se dá
 * po playtestu chtít změnit. Buď je tady, nebo v `levely.ts`.
 */

// ---------------------------------------------------------------- simulace

/**
 * Pevný krok simulace. Odděluje herní čas od snímkové frekvence — bez toho
 * by hráč na 144Hz monitoru naléval jinak než na 60Hz, což je u hry
 * o přesnosti dávkování zabiják (kap. 9).
 */
export const KROK_S = 1 / 60;

/** Kolik kroků simulace smí jeden snímek dohnat, než se zbytek zahodí. */
export const MAX_KROKU_ZA_SNIMEK = 5;

// ------------------------------------------------------------------ nádoby

/** Každý panák pojme přesně tolik, ať má jakýkoli tvar. */
export const KAPACITA_PANAKU_ML = 40;

/**
 * Láhev je vždycky půllitrová, na všech levelech a u všech tvarů. Mění se
 * jen tvar a to, kolik je v ní nalito — nikdy velikost.
 *
 * Na úvodních levelech je v ní proto jen 20–80 ml, tedy 4–16 % výšky. Je to
 * záměr: tam má hráč rysku a hladinu odhadovat nemusí. Sedí to i s pravidlem
 * webu, že láhev rumu je vždycky skoro prázdná.
 */
export const KAPACITA_LAHVE_ML = 500;

/**
 * Cílový díl na panák se losuje z tohohle rozsahu.
 *
 * Herní design uvádí 10–40 ml s odůvodněním „aby se vešel i s chybou".
 * Horních 40 ml ale to odůvodnění porušuje: to je celý panák po okraj, takže
 * na chybu nezbývá nic a každé přestřelení se rozlije. Změřeno na modelu
 * hráče: při cíli 40 ml vyskočí chyba na dvojnásobek oproti 35 ml. Strop
 * je proto o čtvrtinu panáku níž — zbyde místo, kam přetéct.
 */
export const CIL_MIN_ML = 10;
export const CIL_MAX_ML = 30;

// ------------------------------------------------------------------ průtok

/** Plný proud na levelu 1 a na levelu 8; mezi tím se interpoluje. */
export const PRUTOK_MAX_L1 = 22;
export const PRUTOK_MAX_L8 = 30;

/**
 * Otočení láhve po stisku. Teprve po něm začne téct z hrdla.
 *
 * Je to jiná věc než náběh proudu níž a proto vlastní konstanta: otáčení je
 * mechanický pohyb láhve, náběh je rozjezd proudu v už nakloněné láhvi.
 * Hráč se učí obě zpoždění zvlášť a obě mu ubližují jinak.
 */
export const NAKLON_S = 0.35;

/** Náběh proudu po dokončení náklonu. */
export const NABEH_S = 0.3;

/**
 * Doběh po puštění a kolik za tu dobu dokape.
 * Tohle je hlavní zdroj chyby začátečníka a zároveň to, co se hráč učí
 * předvídat — tedy hlavní osa zlepšování (kap. 4.4).
 */
export const DOBEH_S = 0.15;
export const DOKAP_MIN_ML = 1.5;
export const DOKAP_MAX_ML = 3;

/** Bublání: perioda a šum navrch. Amplituda `A` je per level. */
export const PERIODA_BUBLANI_S = 0.45;
export const SUM_PRUTOKU = 0.03;

/** `gravity = ZAKLAD + ROZSAH × sqrt(naplnění)` — prázdná láhev teče hůř. */
export const GRAVITACE_ZAKLAD = 0.55;
export const GRAVITACE_ROZSAH = 0.45;

/** Prodleva, než se láhev přesune nad další panák. */
export const PRESUN_S = 0.4;

/**
 * Doznění po uzavření posledního panáku, než přijde výsledek. Hráč má mít
 * chvíli na to, aby viděl, co nalil, dřív než mu to hra spočítá.
 */
export const DOZNENI_S = 0.8;

/** Jak dlouho běží animace přelití. Řídí ji herní čas, ne hodiny prohlížeče. */
export const PRELITI_S = 0.9;

// ----------------------------------------------------------------- bodování

/** Bonus za čas: `(rezerva − t) × ZA_S`, rezerva `6 + 3N` sekund. */
export const CASOVY_BONUS_ZA_S = 15;
export function casovaRezervaS(panaku: number): number {
  return 6 + 3 * panaku;
}

/**
 * Kolik mililitrů „přičíst k cíli", než se z tolerance udělá procento.
 *
 * Bez tohohle je hra nespravedlivá, a je to měřitelné. Chyba hráče má dvě
 * složky: **poměrnou** (špatně odhadne, kolik je v láhvi — mýlí se o desetinu
 * bez ohledu na velikost) a **absolutní** (nepřesně pustí — proud teče pořád
 * stejně rychle, takže z toho vyjde chyba v mililitrech, ne v procentech).
 *
 * Tolerance počítaná čistě poměrně tu druhou složku ignoruje, a u malého
 * vylosovaného cíle pak z ní udělá obrovské procento. Změřeno na modelu
 * hráče na levelu 7: při cíli okolo 12 ml bral zlato v 1 % případů, při cíli
 * okolo 36 ml v 16 % — šestnáctinásobný rozdíl daný losem, který hráč nikdy
 * neuvidí a nemůže ovlivnit.
 *
 * Skládají se proto jako nezávislé chyby, tedy kvadraticky:
 * `tolerance_ml = tolerance × √(cíl² + ZAKLAD²)`.
 *
 * Hodnota není odhadnutá, ale doladěná měřením: při ní vyjde stejnému hráči
 * u malého i velkého vylosovaného cíle stejně vyčerpaná tolerance (poměr
 * 0,99 místo 1,43 bez opravy). Rozklad naměřené chyby dával 12 ml, ale ten
 * nezachytí, že u malého cíle je nalití kratší než náběh proudu a dokapání
 * z něj ukrojí větší část.
 */
export const TOLERANCE_ZAKLAD_ML = 20;

export const POKUTA_PRELITI = 150;

/**
 * Sazba za mililitr, který neskončil v panáku — ať se rozlil vedle, nebo
 * zůstal v láhvi. Zbytek v láhvi je sice potrestaný už samotnou odchylkou
 * od cíle, ale hráč musí vidět důvod, ne jen nižší číslo.
 */
export const POKUTA_ZA_ML = 3;

/** „Přesná ruka" — vzácný bonus, ať je co honit. Práh na odchylce od cíle. */
export const PRESNA_RUKA_ODCHYLKA = 0.02;
export const PRESNA_RUKA_BODY = 500;
export const PRESNA_RUKA_NASOBEK = 1.2;

/**
 * Prahy medailí — měří se na `E` (vyrovnanost), ne na bodech.
 *
 * Herní design uvádí prahy 90 / 75 / 55 % „podílu na teoretickém maximu"
 * a vedle nich orientační sloupec „~odpovídá CV na L3": zlato ≲ 0,020 při
 * toleranci 0,090. Dohromady to nevychází — proti bodům `base × E^1,5` by
 * zlato na L3 znamenalo odchylku ≤ 0,006, což je pod kvantováním kroku
 * simulace (1/60 s ≈ 0,4 ml), tedy mimo dosah i pro dokonalou hru.
 *
 * Platí proto sloupec s odchylkou, protože jako jediný sedí s kalibračním
 * cílem dokumentu („u zkušeného hráče 40–60 % zlatých"): zlato při zhruba
 * pětině tolerance, 0,020 / 0,090 = 0,22 → `E` ≥ 0,78.
 *
 * Prahy zůstávají pevné; ladí se **tolerance v `levely.ts`**, ne tyhle tři
 * hodnoty. Ověřuje se harnessem: `npm run hra -- --prehled`.
 */
export const MEDAILE_ZLATO = 0.777; // odchylka ≤ 0,222 × tolerance
export const MEDAILE_STRIBRO = 0.611; // odchylka ≤ 0,389 × tolerance
export const MEDAILE_BRONZ = 0.444; // odchylka ≤ 0,556 × tolerance
