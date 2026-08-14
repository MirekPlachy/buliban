# Kontakt

**Stará URL:** `/inpage/kontaktni-formular/` · **Kotva:** `#kontakt`

---

## Hlavní myšlenky ze staré stránky

Stránka se jmenuje „Kontaktní formulář", ale nadpis uvnitř zní **„Propagace vašeho alkoholu"** — je to nabídka spolupráce, ne obecný kontakt.

- Nabídka platí zájemcům o propagaci alkoholu, **zejména rumu**.
- Propagace probíhá **na webu i na YouTube kanálu**.
- Slib zadavateli: „Váš alkohol může být vidět a slyšet na komunitních videích zobrazujících vypuštění Bulibana."
- Kontakt jde přes formulář pod textem. Jiná cesta (e-mail, telefon) na starém webu není.
- Formulář byl na inPage dynamická sekce, konkrétní pole nejsou v HTML čitelná — sestavíme je nově.

**Toto je jediné místo, kde web něco chce.** Zbytek stránek nic neprodává. Tomu má odpovídat i tón: sebevědomý, věcný, s jednou vtipnou větou — ne prosba.

**K ověření u zadavatele:**

- Existuje YouTube kanál a jaká je jeho adresa? Ve výzvě v sekci [Buliban dnes](07-buliban-dnes.md) se na něj odkazuje.
- Existuje instagramový profil, nebo jen hashtag?
- Má formulář sloužit jen partnerům, nebo i lidem, kteří chtějí poslat vlastní výstřel do kroniky? To rozhoduje o tom, jestli bude mít pole „důvod zprávy".

---

## Návrh nového textu

> ## Propagace vašeho alkoholu
>
> Vyrábíte rum? Buliban se dělá z toho, co zbylo na dně — a na dně bývá vidět etiketa.
>
> Vaše láhev může být vidět a slyšet v komunitních videích na webu i na YouTube. Napište nám, domluvíme se.

Alternativa, pokud má být sekce zároveň obecným kontaktem:

> ## Ozvěte se
>
> **Máte alkohol k propagaci?** Zejména rum. Vaše láhev může být vidět a slyšet v komunitních videích na webu i na YouTube.
>
> **Nebo se vám povedl výstřel?** Pošlete ho a může skončit v [kronice](/vystrely/).

---

## Formulář

Podle [PLAN.md](../PLAN.md), kroku 9, jde o Web3Forms + Cloudflare Turnstile.

| Pole | Typ | Povinné |
|---|---|---|
| Jméno | `text` | ano |
| E-mail | `email` | ano |
| Zpráva | `textarea` | ano |
| Důvod zprávy | `select` — propagace / výstřel do kroniky / jiné | ne (jen pokud sekce slouží obojímu) |
| `botcheck` | honeypot, skrytý | — |
| `access_key` | skryté | — |

**Texty kolem formuláře:**

- Tlačítko: **Odeslat**
- Po odeslání (stránka `/odeslano/`): „Zpráva odešla. Ozveme se — obvykle rychleji, než trvá zahřát láhev." Věta je delší než vteřina, takže vtip sedí.
- Pod formulářem drobným písmem: „Údaje použijeme jen na odpověď. Nikam je nedáváme."

---

## Obrázek

Sekce sedí v patičce a **žádný velký obrázek nepotřebuje** — před ní je výzva ke sdílení a dva silné vizuály za sebou by se tloukly.

- Stačí tmavé pozadí a doznívající světlo z předchozí sekce.
- Pokud je potřeba grafický prvek: **animovaný SVG plamínek** ([Plamen.astro](../src/components/Plamen.astro)) vedle nadpisu. Nestojí ani bajt přenosu a uzavře stránku stejným motivem, kterým začala.
- Zvážit jemné zátiší láhve rumu v teplém světle jako pozadí za formulářem, hodně ztmavené — sekce je o propagaci alkoholu, takže láhev tu má co dělat. Nesmí ale konkurovat čitelnosti polí.
