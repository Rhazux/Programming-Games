/*
 * Noc v galerii – lekce ke každému obrazu
 * Výklad techniky + vlastní příklad (jiné tvary a čísla než v obraze, ať lekce neprozradí řešení).
 * Příklad se v lekci hned vykresluje a hráč ho může upravovat.
 */
(function (global) {
  'use strict';

  const L = {
    1: {
      title: 'Kruh a zaoblení: `border-radius`',
      text: [
        '`border-radius` zakulatí rohy prvku. Malé číslo, třeba `16px`, jen obrousí rohy. Hodnota `50%` udělá ze čtverce **kruh** a z obdélníku **elipsu**.',
        'Na kruh tedy potřebuješ **stejnou šířku a výšku** a k tomu `border-radius: 50%`. Barvu dodá `background`.'
      ],
      example: `.mince {
  width: 90px;
  height: 90px;
  background: #e0a526;
  border-radius: 50%;
}

.karta {
  width: 150px;
  height: 90px;
  background: #3f7d6e;
  border-radius: 16px;
}`,
      html: '<div class="mince"></div><div class="karta"></div>',
      try: 'U mince změň `50%` na `20%` a sleduj, jak se z kruhu stane zaoblený čtverec. Co udělá `border-radius: 50%` s obdélníkovou kartou?',
      pitfall: 'Když šířka a výška nejsou stejné, `50%` neudělá kruh, ale elipsu (vejce).',
      fact: 'Kulaté profilové fotky na sociálních sítích jsou obyčejné čtvercové obrázky s `border-radius: 50%`.'
    },
    2: {
      title: 'Přesné místo: `position: absolute`',
      text: [
        'Prvek s `position: absolute` vystoupí z běžného toku stránky a ty mu řekneš, kde přesně má být: `top` je vzdálenost od horního okraje, `left` od levého.',
        'Měří se od nejbližšího předka, který má `position: relative`. V galerii je to vždycky plátno `.obraz`, takže počítáš od jeho levého horního rohu.'
      ],
      example: `.platno {
  position: relative;
  width: 260px;
  height: 160px;
  background: #cfe3ea;
}

.balon {
  position: absolute;
  top: 30px;
  left: 40px;
  width: 50px;
  height: 64px;
  border-radius: 50%;
  background: #d9534f;
}

.ptak {
  position: absolute;
  top: 70px;
  left: 170px;
  width: 40px;
  height: 14px;
  background: #33414e;
}`,
      html: '<div class="platno"><div class="balon"></div><div class="ptak"></div></div>',
      try: 'Posuň balon doprava: zvyš `left` na `120px`. Pak zkus `top: 0` a balon se přilepí k hornímu okraji plátna.',
      pitfall: 'Bez `position: absolute` se `top` a `left` neprojeví. A bez `position: relative` u rodiče by se poloha počítala od celé stránky.',
      fact: 'Souřadnice na webu rostou doprava a **dolů**. V matematice je to obráceně, tam y roste nahoru.'
    },
    3: {
      title: 'Co je navrchu: pořadí a `z-index`',
      text: [
        'Když se prvky překrývají, prohlížeč je kreslí v pořadí, v jakém jsou v HTML: **pozdější prvek je navrchu**.',
        '`z-index` tohle pořadí změní. Funguje u prvků s `position` a vyšší číslo znamená blíž k divákovi. Prvek se `z-index: 2` překryje prvek se `z-index: 1`.'
      ],
      example: `.karta {
  position: absolute;
  width: 110px;
  height: 80px;
  border-radius: 10px;
}

.modra {
  top: 40px;
  left: 60px;
  background: #3f6fb5;
}

.zluta {
  top: 70px;
  left: 120px;
  background: #f2c14e;
}

.modra { z-index: 1; }`,
      base: '.stul{position:relative;width:300px;height:190px}',
      html: '<div class="stul"><div class="karta modra"></div><div class="karta zluta"></div></div>',
      try: 'Smaž poslední řádek `.modra { z-index: 1; }`. Žlutá karta je v HTML později, takže skočí navrch. Pak jí dej `z-index: 5`.',
      pitfall: '`z-index` nefunguje u prvku bez `position`. Když se nic nemění, zkontroluj, jestli prvek `position` má.',
      fact: 'Vyskakovací okna na webech mívají obrovský `z-index`, třeba 9999, aby byla určitě nad vším.'
    },
    4: {
      title: 'Trojúhelník z okrajů (`border`)',
      text: [
        'Okraje prvku se v rozích potkávají **šikmo**. Když má prvek nulovou šířku i výšku, zbudou z něj jen čtyři trojúhelníčky okrajů, jak ukazuje barevný čtverec.',
        'Když dva boční okraje necháš **průhledné** (`transparent`) a spodní obarvíš, zůstane jeden trojúhelník. Šířka základny je levý + pravý okraj, výška je spodní okraj.'
      ],
      example: `.ukazka {
  width: 0;
  height: 0;
  border-top: 50px solid #e07a5f;
  border-right: 50px solid #3d405b;
  border-bottom: 50px solid #81b29a;
  border-left: 50px solid #f2cc8f;
}

.stan {
  width: 0;
  height: 0;
  border-left: 60px solid transparent;
  border-right: 60px solid transparent;
  border-bottom: 80px solid #6a994e;
}`,
      html: '<div class="ukazka"></div><div class="stan"></div>',
      try: 'U barevného čtverce změň tři barvy na `transparent` a nech jen jednu. Kam trojúhelník ukazuje? U stanu zkus spodní okraj `120px`.',
      pitfall: 'Když zapomeneš `width: 0; height: 0;`, zůstane mezi okraji obdélník a místo trojúhelníku vznikne lichoběžník.',
      fact: 'Tímhle trikem se dlouho kreslily šipky u bublin s nápovědou, a to bez jediného obrázku.'
    },
    5: {
      title: 'Plynulý přechod: `linear-gradient`',
      text: [
        '`background: linear-gradient(barva1, barva2, …)` namaluje plynulý přechod barev. Bez úhlu jde **shora dolů**, s úhlem `90deg` zleva doprava.',
        'Za barvu můžeš napsat pozici, kde má být barva čistá. `linear-gradient(#fff, #f90 30%, #600)` znamená, že oranžová je přesně ve 30 % výšky.'
      ],
      example: `.nebe {
  width: 150px;
  height: 120px;
  background: linear-gradient(#8ecae6, #ffb703 70%, #fb8500);
}

.duha {
  width: 150px;
  height: 120px;
  background: linear-gradient(90deg, #ef476f, #ffd166, #06d6a0);
}`,
      html: '<div class="nebe"></div><div class="duha"></div>',
      try: 'U nebe změň `70%` na `20%` a žlutá vyjede nahoru. U duhy přepiš `90deg` na `45deg`.',
      pitfall: 'Přechod je **obrázek**, takže patří do `background` (nebo `background-image`). V `background-color` nefunguje.',
      fact: 'Barevné přechody na tlačítkách a pozadích webů jsou skoro vždycky `linear-gradient`, žádné obrázky.'
    },
    6: {
      title: 'Kruhy dokola: `repeating-radial-gradient`',
      text: [
        '`radial-gradient` maluje přechod od středu ven v kruzích. `repeating-radial-gradient` ho **opakuje** pořád dokola, takže vzniknou soustředné kroužky. `circle at 90px 70px` určí, kde je střed.',
        'Dvojice čísel za barvou dělá ostrý proužek: `#c1121f 0 12px` je červená od 0 do 12 px, `#fdf0d5 12px 24px` světlá od 12 do 24 px. Pak se vzor opakuje.'
      ],
      example: `.terc {
  width: 180px;
  height: 140px;
  background: repeating-radial-gradient(
    circle at 90px 70px,
    #c1121f 0 12px,
    #fdf0d5 12px 24px);
}`,
      html: '<div class="terc"></div>',
      try: 'Posuň střed na `circle at 0 0`, tedy do levého horního rohu. Pak zkus proužky `0 4px` a `4px 8px` a kroužky zhoustnou.',
      pitfall: 'Když na sebe pozice nenavazují (např. `0 12px` a pak `14px 24px`), vznikne mezi barvami rozmazaný přechod místo ostrého okraje.',
      fact: 'Takhle se v CSS kreslí terče, vlnky nebo hypnotické spirály bez jediného obrázku.'
    },
    7: {
      title: 'Proužky: `repeating-linear-gradient`',
      text: [
        '`repeating-linear-gradient` opakuje proužky. První je **úhel**: `0deg` vede zdola nahoru (proužky jsou vodorovné), `90deg` zleva doprava (proužky svislé), `45deg` šikmo.',
        'Proužek zapíšeš barvou a dvěma pozicemi: `#222 0 12px` je tmavá od 0 do 12 px a `#ffd60a 12px 24px` žlutá od 12 do 24 px. Kde jedna barva končí a další začíná, je ostrý okraj.'
      ],
      example: `.paska {
  width: 220px;
  height: 60px;
  background: repeating-linear-gradient(
    45deg,
    #222 0 12px,
    #ffd60a 12px 24px);
}

.tricko {
  width: 120px;
  height: 120px;
  background: repeating-linear-gradient(
    0deg,
    #1d3557 0 10px,
    #f1faee 10px 20px);
}`,
      html: '<div class="paska"></div><div class="tricko"></div>',
      try: 'Pásce i tričku změň úhel na `90deg`. Pak udělej proužky trička tlustší: `0 20px` a `20px 40px`.',
      pitfall: 'Bez úhlu jde přechod shora dolů, takže proužky jsou vodorovné. Na svislé potřebuješ `90deg`.',
      fact: 'Žlutočerná výstražná páska ze staveniště nebo pruhovaná markýza je v CSS jediný řádek.'
    },
    8: {
      title: 'Kopie tvaru: `box-shadow`',
      text: [
        '`box-shadow: x y barva` nakreslí kopii tvaru prvku posunutou o **x doprava** a **y dolů**. Záporná čísla posouvají doleva a nahoru. Kopie má stejné zaoblení jako prvek.',
        'Stínů můžeš napsat kolik chceš, oddělených čárkou. Jeden malý prvek tak namaluje celou skupinu teček a do HTML nemusíš nic přidávat.'
      ],
      example: `.kostka {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 16px;
  background: #ffffff;
}

.tecka {
  position: absolute;
  left: 20px;
  top: 20px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #222;
  box-shadow: 30px 30px #222,
              60px 60px #222;
}`,
      bg: '#2b2d42',
      html: '<div class="kostka"><div class="tecka"></div></div>',
      try: 'Přidej stíny `60px 0 #222` a `0 60px #222` a z trojky na kostce bude pětka. Zkus i rozmazaný stín `0 0 12px #f00`.',
      pitfall: 'Každý stín se počítá od **původní polohy prvku**, ne od předchozího stínu.',
      fact: 'Někteří výtvarníci kreslí v CSS celé obrázky z jediného prvku. Hledej „single div CSS art“.'
    },
    9: {
      title: 'Otočit, zmáčknout, posunout: `transform`',
      text: [
        '`transform` mění tvar prvku až při kreslení: `rotate(30deg)` ho otočí, `scale(1.5)` zvětší, `scaleX(1.6)` roztáhne do šířky, `scaleY(0.5)` zmáčkne na polovinu výšky a `translate(20px, 0)` posune.',
        'Všechno se děje kolem **středu** prvku. Funkcí můžeš napsat víc za sebou a **záleží na pořadí**: na tvar se použijí zprava doleva. `scaleX(1.6) rotate(45deg)` tedy čtverec nejdřív otočí a pak roztáhne.'
      ],
      example: `.dlazdice {
  width: 70px;
  height: 70px;
  background: #e76f51;
}

.otocena {
  transform: rotate(30deg);
}

.placata {
  transform: scaleX(1.6) rotate(45deg);
}`,
      html: '<div class="dlazdice"></div><div class="dlazdice otocena"></div><div class="dlazdice placata"></div>',
      try: 'U třetí dlaždice prohoď pořadí na `rotate(45deg) scaleX(1.6)` a vznikne jiný tvar. Pak zkus druhé dlaždici `translate(0, -30px)`.',
      pitfall: 'Dva řádky `transform` se nesčítají, druhý přepíše první. Všechny funkce patří do **jednoho** `transform`, oddělené mezerou.',
      fact: 'Animace webů používají `transform` rády, protože ho prohlížeč umí přepočítat velmi rychle.'
    },
    10: {
      title: 'Mřížka: `display: grid`',
      text: [
        '`display: grid` rozdělí prvek na řádky a sloupce. `grid-template-columns: 60px 1fr 1fr` znamená: první sloupec má 60 px a zbytek místa se rozdělí na dva stejné díly (`fr` je díl zbylého místa). Stejně funguje `grid-template-rows` pro řádky.',
        '`gap` dělá mezery mezi poli a `padding` okraj kolem nich. Pole se roztáhne přes víc buněk pomocí `grid-column: span 2` (dva sloupce) nebo `grid-row: span 2` (dva řádky).'
      ],
      example: `.okno {
  display: grid;
  grid-template-columns: 60px 1fr 1fr;
  grid-template-rows: 50px 70px;
  gap: 8px;
  width: 260px;
  padding: 8px;
  background: #264653;
}

.okno div { background: #e9c46a; }
.x { grid-row: span 2; background: #e76f51; }
.y { grid-column: span 2; }`,
      html: '<div class="okno"><div class="x"></div><div class="y"></div><div></div><div></div></div>',
      try: 'Změň `.y` na `grid-column: span 1`. Co se stane s posledními poli? Zkus i `gap: 2px` nebo sloupce `60px 2fr 1fr`.',
      pitfall: '`fr` dělí jen místo, které **zbude** po pevných rozměrech a mezerách. Pole s `span` se počítá jako víc buněk, takže ostatní pole se posunou.',
      fact: 'Fotogalerie, e-shopy i přehledy s grafy na webech stojí většinou na gridu.'
    },
    11: {
      title: 'Vystřihnout tvar: `clip-path: polygon(…)`',
      text: [
        '`clip-path: polygon(…)` ořízne prvek podle obrysu, který zadáš body. Každý bod je dvojice **„x y“** a body se oddělují čárkou. Počítá se od levého horního rohu prvku, v procentech nebo pixelech.',
        'Body se spojují postupně a poslední se sám spojí s prvním. Trojúhelníku tedy stačí tři body: `polygon(50% 0, 100% 100%, 0 100%)`.'
      ],
      example: `.vlajka {
  width: 160px;
  height: 100px;
  background: #2a9d8f;
  clip-path: polygon(0 0, 100% 0, 75% 50%, 100% 100%, 0 100%);
}

.sipka {
  width: 120px;
  height: 80px;
  background: #e9c46a;
  clip-path: polygon(0 30%, 60% 30%, 60% 0, 100% 50%,
                     60% 100%, 60% 70%, 0 70%);
}`,
      html: '<div class="vlajka"></div><div class="sipka"></div>',
      try: 'U vlajky změň bod `75% 50%` na `40% 50%` a zářez se prohloubí. Zvládneš šestiúhelník ze šesti bodů?',
      pitfall: 'Mezi `x` a `y` jednoho bodu patří **mezera**, mezi body **čárka**. Když je prohodíš, je celý polygon neplatný a prvek se neořízne vůbec.',
      fact: 'Body nemusíš počítat zpaměti. Grafici je naklikají v nástrojích typu Clippy a CSS si zkopírují.'
    },
    12: {
      title: 'Prvky navíc: `::before` a `::after`',
      text: [
        'Každý prvek má dva „neviditelné“ prvky navíc: `::before` na začátku a `::after` na konci. Objeví se, jen když dostanou vlastnost `content`. Na ozdoby stačí prázdné `content: ""`.',
        'Pak je styluješ úplně jako obyčejné prvky: `position: absolute`, rozměry, barvy, `border-radius`, `transform`… a v HTML přitom nepřibude ani řádek.'
      ],
      example: `.prase {
  position: relative;
  width: 120px;
  height: 90px;
  border-radius: 50%;
  background: #f4a7b9;
}

.prase::before,
.prase::after {
  content: "";
  position: absolute;
  top: 30px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3a2e39;
}

.prase::before { left: 30px; }
.prase::after { left: 76px; }`,
      html: '<div class="prase"></div>',
      try: 'Smaž řádek `content: "";` a oči zmizí, protože bez `content` pseudo-prvky nevzniknou. Pak zkus očím přidat `transform: scaleY(1.6)`.',
      pitfall: '`::before` a `::after` jsou **uvnitř** prvku, takže se jejich `position: absolute` počítá od něj. Proto má prase `position: relative`.',
      fact: 'Ikonky, uvozovky nebo ozdobné čárky u nadpisů na webech bývají právě `::before` a `::after`.'
    }
  };

  Object.values(L).forEach(x => { x.kind = 'css'; x.file = 'priklad.css'; });
  global.Gallery.LESSONS = L;
})(typeof window !== 'undefined' ? window : globalThis);
