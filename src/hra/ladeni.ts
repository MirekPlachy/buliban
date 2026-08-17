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

// ----------------------------------------------------- fáze 1 · otevření láhve

/**
 * Kolik stisků sedře pečeť. Při svižném ťukání vyjde ~1,2 s z kap. 3.1.
 *
 * Dokument nabízí krouživý tah myší **nebo** opakovaný stisk. Hra dělá jen to
 * druhé — na obou platformách stejně. Kap. 4.3 staví na tom, že gesto je na
 * mobilu i desktopu identické, a krouživý tah by k držení přidal druhý vstupní
 * kanál, který se navíc nedá přehrát v headless testu.
 */
export const PECET_STISKU = 8;

/** Prodleva po sedřené pečeti, ať je vidět, že je hrdlo volné. */
export const PECET_DOZNENI_S = 0.35;

/**
 * O kolik korek povyjede za zásah. Tři zelené (3 × ⅓) nebo dva perfektní
 * zásahy korek vytáhnou — proto se sčítá do jedné, ne počítají zásahy.
 */
export const KOREK_PERFEKTNI = 0.5;
export const KOREK_ZELENY = 1 / 3;

export const BODY_PERFEKTNI = 60;
export const BODY_ZELENY = 40;

/** Zásek po minutí: prodleva, žádná ztráta bodů. Fáze 1 se nedá prohrát. */
export const KOREK_ZASEK_S = 0.5;

/** Kolik sekund trvá cesta ukazatele tam a zpět na levelu 1. */
export const UKAZATEL_RYCHLOST_L1 = 1;
export const UKAZATEL_ZRYCHLENI = 0.12;

/** Šířka zeleného pásma; klesá s levelem, ale ne pod `PASMO_MIN`. */
export const PASMO_SIRKA_L1 = 0.26;
export const PASMO_UBYTEK = 0.015;
export const PASMO_MIN = 0.14;

/**
 * Jak velká část zeleného pásma je perfektní jádro. Dokument jádro zmiňuje,
 * ale šířku neuvádí — tohle je doplněk, ne citace.
 */
export const PERFEKTNI_PODIL = 0.3;

/** Bonus za svižnost: `(REZERVA − t) × ZA_S`, do ~100 bodů. */
export const SVIZNOST_REZERVA_S = 4;
export const SVIZNOST_ZA_S = 25;

// ------------------------------------------- fáze 3 · zahřátí a vypuštění

/** Stylizovaná škála zahřátí. Kap. 11: žádné °C, nikde a nikdy. */
export const TEPLOTA_MAX = 100;

/**
 * Střed cílového pásma. Dokument udává jen jeho **změnu** podle polohy
 * (±6 jednotek), samotný střed ani základní šířku ne — obojí je doplněk.
 *
 * Střed je schválně vysoko: kdyby ležel v polovině škály, „nad plamenem"
 * (20 j/s, praskne nad 95) by nebyla riskantní metoda, ale prostě rychlá.
 */
export const PASMO_STRED = 72;
export const PASMO_ZAKLAD_SIRKA = 24;
export const PASMO_VERTIKALNI = -6;
export const PASMO_HORIZONTALNI = 6;

/**
 * O kolik se pásmo zúží za level. Dokument pro fázi 3 žádné škálování nemá —
 * progresi staví jen na odemykání metod. Bez tohohle je ale rituál na L8
 * stejně těžký jako na L1, což si odporuje s „složitost levelu se stále
 * zvyšuje" z kap. 4.2.
 */
export const PASMO_UBYTEK_ZA_LEVEL = 1;
export const PASMO_MIN_SIRKA = 10;

export const NASOBEK_VERTIKALNI = 1.3;
export const NASOBEK_HORIZONTALNI = 1;

/** Nad touhle teplotou praskne sklo při zahřívání nad plamenem. */
export const PRASKNE_NAD = 95;

/** Sundání uzávěru — jeden klik a animace. */
export const UZAVER_S = 0.4;

export const ZAPALKA_HORI_S = 4;
export const ZAPALKA_PRUVAN = 0.12;
/** Zápalka dává +15 % za tradici; zapalovač nic. */
export const ZAPALKA_BONUS = 1.15;
export const ZAPALOVAC_SELHANI = 0.15;
export const ZAPALOVAC_PRODLEVA_S = 0.6;

/** Škrtnutí zápalky je timing klik — proto vlastní, svižnější ukazatel. */
export const SKRTNUTI_RYCHLOST = 1.6;
export const SKRTNUTI_PASMO = 0.3;

/** Jak dlouho se drží plamen u hrdla, než to chytne. Tohle napětí je pointa. */
export const ZAZEH_PRODLEVA_MIN_S = 0.5;
export const ZAZEH_PRODLEVA_MAX_S = 2;

export const ZAZEH_ZAKLAD_BODU = 700;
export const ZAZEH_POKUSU = 3;
/** Srážka za každý další pokus: `1 − 0,25 × (pokus − 1)`. */
export const ZAZEH_SRAZKA_ZA_POKUS = 0.25;

/**
 * Kolik tepla si láhev nechá po nepovedeném zážehu. Odpovídá „opakovanému
 * zapálení" z webu — láhev je pořád vlažná, jen ne dost.
 */
export const TEPLOTA_PO_NEUSPECHU = 0.6;

/** Jak dlouho se ukazuje hláška po zážehu i po „tichu po pěšině". */
export const ZAZEH_DOZNENI_S = 1.8;
