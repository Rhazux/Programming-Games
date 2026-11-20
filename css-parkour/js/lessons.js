/*
 * CSS Parkour – lekce ke každému levelu
 * Výklad vlastnosti + vlastní příklad (jiné prvky a čísla než v levelu, ať lekce neprozradí řešení).
 * Příklad se v lekci hned vykresluje a hráč ho může upravovat.
 */
(function (global) {
  'use strict';

  const L = {
    1: {
      title: 'Šířka: `width` a jednotky',
      text: [
        '`width` nastavuje šířku prvku. Číslo v CSS skoro vždycky potřebuje **jednotku**: `px` jsou pixely na obrazovce, `%` je díl šířky rodiče.',
        'Zápis bez jednotky, třeba `width: 200`, je neplatný a prohlížeč ho **potichu ignoruje**, jako by tam vůbec nebyl. Výjimkou je nula: `width: 0` platí.'
      ],
      example: `.lavka {
  width: 240px;
  height: 20px;
  background: #8d5524;
}

.provaz {
  width: 50%;
  height: 6px;
  background: #c9a227;
}`,
      base: 'body{flex-direction:column}',
      html: '<div class="lavka"></div><div class="provaz"></div>',
      try: 'Změň šířku lavičky na `120px` a pak schválně smaž `px`. Lavička zmizí, protože `width: 120` prohlížeč zahodí.',
      pitfall: 'Mezi číslem a jednotkou nesmí být mezera. `240 px` je stejně neplatné jako `240`.',
      fact: 'Jednotek má CSS přes dvacet. Kromě `px` a `%` třeba `em` (podle velikosti písma) nebo `vw` (procento šířky okna).'
    },
    2: {
      title: 'Výška: `height`',
      text: [
        '`height` nastavuje výšku prvku. Když prvek stojí na spodní hraně (ve hře má `bottom: 0`), roste **odspodu nahoru**, jako sloupec v grafu.',
        'Jeho vršek je pak ve výšce rodiče mínus `height`. Scéna ve hře je vysoká 400 px, takže blok s výškou 100 px má vršek na y = 300.'
      ],
      example: `.sloupec {
  width: 40px;
  background: #2a9d8f;
}

.po { height: 60px; }
.ut { height: 120px; }
.st { height: 90px; }`,
      base: '.graf{display:flex;align-items:flex-end;gap:10px;height:160px;padding:0 12px;border-bottom:3px solid #264653}',
      html: '<div class="graf"><div class="sloupec po"></div><div class="sloupec ut"></div><div class="sloupec st"></div></div>',
      try: 'Udělej středeční sloupec nejvyšší: dej mu `height: 150px`. Sloupce rostou nahoru, protože stojí na společné čáře.',
      pitfall: 'Výška v procentech (`height: 50%`) funguje, jen když má rodič pevnou výšku. Jinak se nemá od čeho počítat.',
      fact: 'Sloupcové grafy na webech bývají přesně tohle: obyčejné bloky s různou `height`.'
    },
    3: {
      title: 'Vnější okraj: `margin`',
      text: [
        '`margin` je **průhledný prostor kolem prvku**. Odstrčí prvek od okolí, ale prvek sám se nezvětší.',
        '`margin-left: 80px` posune prvek o 80 px doprava, `margin-top` dolů. Zkratka `margin: 10px 20px` nastaví nahoře a dole 10 px, vlevo a vpravo 20 px.'
      ],
      example: `.kamen {
  width: 60px;
  height: 60px;
  background: #6c757d;
  border-radius: 12px;
}

.druhy {
  margin-left: 80px;
}`,
      base: '.rada{display:flex;align-items:flex-start;width:320px;min-height:120px;padding:10px;background:#d8e2dc}',
      html: '<div class="rada"><div class="kamen"></div><div class="kamen druhy"></div></div>',
      try: 'Zvětši mezeru na `margin-left: 150px`. Pak přidej druhému kamenu `margin-top: 40px`.',
      pitfall: 'Záporný margin (`margin-left: -20px`) prvek naopak přitáhne a prvky se můžou překrýt.',
      fact: 'Zápisem `margin: 0 auto` se dá blok s pevnou šířkou vycentrovat. Tak se dřív centrovaly celé weby.'
    },
    4: {
      title: 'Box model: `padding` a celková šířka',
      text: [
        'Každý prvek je krabice z vrstev: **obsah** (`width`), **vnitřní okraj** (`padding`), **rámeček** (`border`) a nakonec vnější okraj (`margin`).',
        'Ve výchozím nastavení platí: **celková šířka = width + padding vlevo i vpravo + rámeček**. Padding je uvnitř krabice a má barvu pozadí, takže krabice naroste, i když se `width` nezmění.'
      ],
      example: `.krabice {
  width: 100px;
  height: 40px;
  background: #f4a261;
}

.nafouknuta {
  padding-right: 80px;
  border: 4px solid #264653;
}`,
      base: 'body{flex-direction:column;align-items:flex-start;padding-left:30px}',
      html: '<div class="krabice"></div><div class="krabice nafouknuta"></div>',
      try: 'Spočítej celkovou šířku druhé krabice: 100 + 80 + 4 + 4 = 188 px. Pak jí přidej `box-sizing: border-box;` a krabice se vrátí na 100 px.',
      pitfall: 'Padding se do celkové šířky počítá, margin ne. Margin je průhledný prostor **mimo** krabici.',
      fact: 'Spousta webů má na začátku CSS `* { box-sizing: border-box; }`, aby se rozměry počítaly snadněji.'
    },
    5: {
      title: 'Schovat prvek: `display`, `visibility`, `opacity`',
      text: [
        'Prvek jde schovat třemi způsoby a každý dělá něco jiného.',
        '`display: none` prvek **úplně vyřadí** a ostatní se posunou na jeho místo. `visibility: hidden` ho zneviditelní, ale **místo mu nechá**. `opacity: 0` ho jen zprůhlední: dál zabírá místo a „překáží“.'
      ],
      example: `.kostka {
  width: 60px;
  height: 60px;
  background: #e76f51;
}

.b {
  visibility: hidden;
}`,
      base: '.rada{display:flex;gap:10px;padding:10px;background:#e9edc9}',
      html: '<div class="rada"><div class="kostka a"></div><div class="kostka b"></div><div class="kostka c"></div></div>',
      try: 'Přepiš `visibility: hidden` na `display: none` a sleduj třetí kostku: posune se doleva. Pak zkus `opacity: 0.3`.',
      pitfall: '`display: none` a `visibility: hidden` vypadají stejně, dokud nesleduješ sousedy. Jen u `visibility` zůstane po prvku díra.',
      fact: 'Weby přes `display: none` schovávají třeba zavřená menu.'
    },
    6: {
      title: 'Flexbox: `justify-content`',
      text: [
        '`display: flex` udělá z prvku **pružný kontejner** a jeho děti seřadí do řady. Kam v řadě se posunou, řekne `justify-content`, a to po **hlavní ose** (u řady vodorovně).',
        'Hodnoty: `flex-start` (na začátek), `center` (doprostřed), `flex-end` (na konec), `space-between` (mezery mezi položkami) a `space-around` (mezery i kolem).'
      ],
      example: `.police {
  display: flex;
  justify-content: flex-end;
  width: 320px;
  padding: 10px;
  background: #dde5b6;
}

.kniha {
  width: 30px;
  height: 70px;
  margin: 0 3px;
  background: #6a994e;
}`,
      html: '<div class="police"><div class="kniha"></div><div class="kniha"></div><div class="kniha"></div></div>',
      try: 'Vyzkoušej postupně `flex-start`, `center`, `space-between` a `space-around`. Kterou hodnotou dostaneš knihy doprostřed police?',
      pitfall: '`justify-content` se píše **kontejneru** (rodiči), ne položkám. A bez `display: flex` nedělá nic.',
      fact: 'Flexbox se do prohlížečů dostal kolem roku 2015 a konečně vyřešil věčný problém: jak něco vycentrovat.'
    },
    7: {
      title: 'Flexbox: `align-items` a dvě osy',
      text: [
        'Flexbox má **dvě osy**. Hlavní vede ve směru řady (vodorovně) a řídí ji `justify-content`. Příčná je na ni kolmá (svisle) a řídí ji `align-items`.',
        '`align-items: flex-start` dá položky nahoru, `center` doprostřed a `flex-end` dolů. S oběma vlastnostmi dostaneš položku do kteréhokoli místa kontejneru.'
      ],
      example: `.akvarium {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 300px;
  height: 160px;
  background: #a8dadc;
}

.ryba {
  width: 50px;
  height: 26px;
  border-radius: 50%;
  background: #e63946;
}`,
      html: '<div class="akvarium"><div class="ryba"></div></div>',
      try: 'Pošli rybu do pravého horního rohu: `justify-content: flex-end` a `align-items: flex-start`.',
      pitfall: '`align-items` má smysl, jen když je kontejner **vyšší** než položky. Jinak není kam posouvat.',
      fact: '`justify-content: center` spolu s `align-items: center` je nejznámější způsob, jak dát něco přesně doprostřed.'
    },
    8: {
      title: 'Pořadí ve flexboxu: `order`',
      text: [
        'Položky flexboxu jdou v pořadí podle HTML. Vlastnost `order` to pořadí změní, aniž bys sahal(a) do HTML. Výchozí hodnota je `0`.',
        'Položka s **větším** číslem jde **dál**, se záporným dopředu. Celou řadu naráz otočí `flex-direction: row-reverse` na kontejneru.'
      ],
      example: `.vlak {
  display: flex;
  gap: 6px;
}

.vuz {
  display: grid;
  place-items: center;
  width: 60px;
  height: 40px;
  color: white;
  background: #457b9d;
}

.lokomotiva {
  background: #e63946;
  order: 1;
}`,
      html: '<div class="vlak"><div class="vuz lokomotiva">L</div><div class="vuz">1</div><div class="vuz">2</div></div>',
      try: 'Dej lokomotivě `order: -1` a vrátí se dopředu. Co udělá `flex-direction: row-reverse` na `.vlak`?',
      pitfall: 'Prvky se stejným `order` zůstanou v pořadí podle HTML. `order: 1` tedy pošle prvek za všechny, které mají výchozí `0`.',
      fact: '`order` mění jen vzhled. Čtečka obrazovky i klávesa Tab jdou dál podle HTML, proto se s ním má zacházet opatrně.'
    },
    9: {
      title: 'Přesné místo: `position: absolute`',
      text: [
        '`position: absolute` vytáhne prvek z běžného toku a umístí ho přesně podle `left` a `top` (případně `right` a `bottom`).',
        'Měří se od nejbližšího předka, který má `position` jinou než výchozí `static`, nejčastěji `relative`. Když žádný takový předek není, měří se od celé stránky.'
      ],
      example: `.mapa {
  position: relative;
  width: 280px;
  height: 160px;
  background: #b7e4c7;
}

.poklad {
  position: absolute;
  left: 200px;
  top: 100px;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: #ffb703;
}`,
      html: '<div class="mapa"><div class="poklad"></div></div>',
      try: 'Zahrab poklad do levého horního rohu: `left: 0; top: 0;`. Pak smaž `position: relative;` u mapy a sleduj, odkud se teď měří.',
      pitfall: '`left` a `top` u prvku bez `position` nefungují. A měří se od předka s `position`, ne automaticky od rodiče.',
      fact: 'Odznaky s počtem zpráv nebo štítky „Sleva“ přes fotky bývají právě `position: absolute`.'
    },
    10: {
      title: 'Posunout a natáhnout: `transform`',
      text: [
        '`transform` mění jen **vykreslení** prvku: `translateY(40px)` ho posune o 40 px dolů, `scaleX(2)` ho roztáhne na dvojnásobnou šířku a `rotate(10deg)` ho natočí.',
        'Okolní prvky se kvůli tomu **nehnou** a chovají se, jako by prvek zůstal na místě. Víc funkcí napíšeš do jednoho `transform` a oddělíš je mezerou.'
      ],
      example: `.kvadr {
  width: 60px;
  height: 30px;
  background: #8338ec;
}

.zmeneny {
  transform: translateY(40px) scaleX(2);
}`,
      html: '<div class="kvadr"></div><div class="kvadr zmeneny"></div><div class="kvadr"></div>',
      try: 'Zkus `scaleX(3)` a sleduj, že třetí kvádr zůstává na místě. Pak přidej na konec `rotate(20deg)`.',
      pitfall: 'Dva řádky `transform` se nesčítají, druhý první přepíše. Všechny funkce patří do jednoho `transform`.',
      fact: '`scale` zvětšuje od středu prvku. Když má prvek růst od kraje, pomůže `transform-origin: left`.'
    },
    11: {
      title: 'Kdo vyhraje: specificita selektorů',
      text: [
        'Když dvě pravidla nastavují stejnou vlastnost, vyhraje **specifičtější selektor**. Počítá se jako trojice: id (1,0,0) > třída, atribut nebo pseudotřída (0,1,0) > název značky (0,0,1).',
        'Při stejné specificitě vyhraje pravidlo, které je v CSS **později**. `!important` přebije všechno, ale je to nouzová brzda.'
      ],
      example: `/* (0,1,0) jedna třída */
.stitek {
  background: #adb5bd;
}

/* (0,2,0) dvě třídy: vyhraje */
.seznam .stitek {
  background: #2a9d8f;
}

/* (0,3,0) jen třetí štítek */
.seznam .stitek:nth-child(3) {
  background: #e76f51;
}`,
      base: '.seznam{display:flex;gap:8px}.seznam div{padding:12px 16px;color:#fff;font-weight:700;border-radius:8px}',
      html: '<div class="seznam"><div class="stitek">1</div><div class="stitek">2</div><div class="stitek">3</div><div class="stitek">4</div></div>',
      try: 'Přesuň první pravidlo `.stitek` až na konec. Změní se něco? Nezmění, dvě třídy pořád přebijí jednu.',
      pitfall: 'Pořadí v CSS rozhoduje **jen** při stejné specificitě. „Napsat to později“ nestačí, když má druhé pravidlo silnější selektor.',
      fact: 'Vývojářské nástroje v prohlížeči (F12) ukazují přeškrtnuté vlastnosti, které prohrály se specifičtějším pravidlem.'
    },
    12: {
      title: 'Animace: `@keyframes` a `animation`',
      text: [
        '`@keyframes jmeno { … }` popisuje, jak se má prvek v čase měnit: od `from` do `to`, nebo po procentech (`0%`, `50%`, `100%`).',
        'Vlastnost `animation` ji spustí: **název**, **délka** (`0.6s`), průběh (`ease-out`), počet opakování (`6` nebo `infinite`) a směr (`alternate` = tam a zpátky).'
      ],
      example: `@keyframes skok {
  from { transform: translateY(0); }
  to { transform: translateY(-60px); }
}

.mic {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #f77f00;
  animation: skok 0.6s ease-out 6 alternate;
}`,
      html: '<div class="mic"></div>',
      try: 'Zpomal skok na `2s` a změň `ease-out` na `linear`. Pak místo `6` napiš `infinite`.',
      pitfall: 'Jméno v `animation` musí přesně odpovídat jménu v `@keyframes`, včetně velkých a malých písmen. Jinak se nic nehne a prohlížeč chybu nehlásí.',
      fact: 'Načítací kolečka na webech jsou většinou jen `@keyframes` s `rotate` a `infinite`.'
    }
  };

  Object.values(L).forEach(x => { x.kind = 'css'; x.file = 'priklad.css'; });
  global.ParkourContent.LESSONS = L;
})(typeof window !== 'undefined' ? window : globalThis);
