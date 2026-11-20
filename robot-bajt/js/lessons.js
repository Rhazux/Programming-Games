/*
 * Robot Bajt – lekce ke každé misi
 * Výklad + příklad, který robot hned předvede na malé ukázkové mapě (a hráč ho může upravit).
 * Mapy a programy jsou jiné než v misích, ať lekce neprozradí řešení.
 * Mapa: # zeď, . podlaha, b bit, G nabíječka, x bug, L laser, > v < ^ robot a jeho směr.
 */
(function (global) {
  'use strict';

  const L = {
    '1-1': {
      title: 'Program je posloupnost příkazů',
      text: [
        'Program je **seznam příkazů**, které počítač provede přesně v tom pořadí, v jakém je napíšeš. Nic nedomýšlí a nic nepřeskočí.',
        'Každý příkaz robota končí závorkami a středníkem: `krok();` posune robota o jedno pole tam, kam se právě dívá.'
      ],
      example: 'krok();\nkrok();',
      map: { map: ['######', '#>...#', '######'] },
      try: 'Přidej třetí `krok();` a spusť příklad znovu. Co se stane, když přidáš i čtvrtý? Robot narazí do zdi.',
      pitfall: 'Zapomenutý středník nebo závorky jsou chyba. Robot pak program vůbec nespustí a hra ukáže číslo řádku.',
      fact: 'První počítačové programy byly taky jen dlouhé seznamy příkazů, vyděrované do papírových štítků.'
    },
    '1-2': {
      title: 'Otáčení: `vlevo()` a `vpravo()`',
      text: [
        '`vlevo();` a `vpravo();` robota **otočí** o 90 stupňů na místě. Nikam nepojede, jen se podívá jiným směrem. Až další `krok();` ho posune novým směrem.',
        'Vlevo a vpravo se počítá **z pohledu robota**, ne podle obrazovky. Když robot jede dolů, jeho „vlevo“ je na obrazovce vpravo.'
      ],
      example: 'krok();\nkrok();\nvpravo();\nkrok();\nkrok();',
      map: { map: ['#####', '#>..#', '###.#', '###.#', '#####'] },
      try: 'Napiš místo `vpravo();` příkaz `vlevo();`. Robot se otočí nahoru a narazí do zdi.',
      pitfall: 'Otočka sama robota neposune. Za `vpravo();` musí přijít `krok();`.',
      fact: 'Robotický vysavač se doma orientuje podobně: kousek jede, otočí se a zase jede.'
    },
    '1-3': {
      title: 'Akce na místě: `seber()`',
      text: [
        'Některé příkazy robota nepohnou, ale udělají něco na poli, kde stojí. `seber();` sebere bit 💠, který tam leží.',
        'Na pořadí záleží: robot musí na pole s bitem nejdřív **dojet** a teprve potom `seber();`.'
      ],
      example: 'krok();\nseber();\nkrok();\nkrok();\nseber();',
      map: { map: ['#######', '#>b.b.#', '#######'] },
      try: 'Prohoď první dva řádky, aby `seber();` bylo před `krok();`, a sleduj, co se stane.',
      pitfall: 'Na poli bez bitu `seber();` nic nesebere a bit, pro který jsi jel(a), zůstane ležet.',
      fact: 'Skladoví roboti jezdí podle podobných příkazů: dojeď, zvedni, dojeď, polož.'
    },
    '2-1': {
      title: 'Opakování: cyklus `for`',
      text: [
        'Když se něco opakuje, nepiš to desetkrát. Cyklus `for` zopakuje **blok** ve složených závorkách, kolikrát chceš.',
        '`for (let i = 0; i < 4; i++)` znamená: počítadlo `i` začne na 0, dokud platí `i < 4`, provede blok a zvýší `i` o 1. Blok se tedy provede **4×** (pro i = 0, 1, 2, 3).'
      ],
      example: 'for (let i = 0; i < 4; i++) {\n  krok();\n}',
      map: { map: ['##########', '#>.......#', '##########'] },
      try: 'Změň `4` na `7` a robot dojede až ke zdi. Kolik řádků by to bylo bez cyklu?',
      pitfall: 'Blok cyklu je mezi `{` a `}`. Příkaz za zavírací závorkou se provede až po celém cyklu, jen jednou.',
      fact: 'Počítadlu se odjakživa říká `i`, z anglického index. Uvidíš ho skoro v každém programu.'
    },
    '2-2': {
      title: 'Víc příkazů v jednom cyklu',
      text: [
        'Do bloku cyklu můžeš dát **víc příkazů**. V každém kole se provedou všechny, v pořadí shora dolů.',
        'Schody jsou opakovaný **vzor**: krok, otočka, krok, otočka zpět. Stačí najít, co se opakuje, a dát to do cyklu.'
      ],
      example: 'for (let i = 0; i < 3; i++) {\n  krok();\n  vpravo();\n  krok();\n  vlevo();\n}\nkrok();',
      map: { map: ['#######', '#>.####', '##..###', '###..##', '####..#', '#######'] },
      try: 'Zkus z cyklu smazat `vlevo();`. Robot se začne točit dokola a schody nesejde.',
      pitfall: 'Na konci každého kola musí být robot natočený stejně jako na začátku. Jinak se další kolo pokazí.',
      fact: 'Najít opakující se vzor je jedna z nejdůležitějších dovedností programátora.'
    },
    '2-3': {
      title: 'Chyba o jedničku',
      text: [
        'Nejčastější chyba v cyklech: cyklus proběhne o jedno kolo **víc** nebo **míň**, než má. Říká se jí chyba o jedničku (anglicky off-by-one).',
        '`for (let i = 0; i < 3; i++)` proběhne 3×, ale s `i <= 3` už **4×** (pro i = 0, 1, 2, 3). Když počítáš od nuly, použij `<`.'
      ],
      example: 'for (let i = 0; i <= 3; i++) {\n  krok();\n}',
      map: { map: ['######', '#>..G#', '######'] },
      try: 'Robot narazí, protože cyklus proběhl 4×. Změň `<=` na `<` a robot zastaví přesně na nabíječce.',
      pitfall: 'Když si nejsi jistý(á), vypiš si hodnoty `i` na papír: 0, 1, 2… a spočítej, kolikrát podmínka platí.',
      fact: 'Programátorský vtip: „V programování jsou dvě nejtěžší věci: pojmenovávání, mazání mezipaměti a chyby o jedničku.“'
    },
    '2-4': {
      title: 'Cyklus v cyklu',
      text: [
        'Cyklus může být **uvnitř jiného cyklu**. Vnitřní cyklus proběhne celý při každém kole vnějšího. Dva cykly se 4 a 2 koly dají 4 × 2 = 8 kroků.',
        'Vnořený cyklus potřebuje **jiné počítadlo**, třeba `j`, aby si s vnějším `i` nepřepisovaly hodnotu.'
      ],
      example: 'for (let i = 0; i < 4; i++) {\n  for (let j = 0; j < 2; j++) {\n    krok();\n  }\n  vpravo();\n}',
      map: { map: ['#####', '#>..#', '#...#', '#...#', '#####'] },
      try: 'Změň vnitřní počet na `1` a čtverec se zmenší. Kolikrát se teď celkem provede `krok();`?',
      pitfall: 'Když vnitřnímu cyklu dáš stejné počítadlo `i` jako vnějšímu, přepisují si ho a oba cykly se rozbijí.',
      fact: 'Vnořené cykly procházejí třeba všechny pixely obrázku: řádek po řádku a v každém řádku pixel po pixelu.'
    },
    '3-1': {
      title: 'Rozhodování: `if` a senzory',
      text: [
        'Robot má **senzory**, které odpovídají `true` (ano) nebo `false` (ne). Třeba `jeZed()` zjistí, jestli je přímo před robotem zeď.',
        '`if (podmínka) { … }` provede blok, jen když podmínka platí. Program pak funguje na **různých mapách**, protože se rozhoduje podle toho, co robot zrovna vidí.'
      ],
      example: 'for (let i = 0; i < 4; i++) {\n  if (jeZed()) {\n    vpravo();\n  }\n  krok();\n}',
      map: { map: ['#####', '#>..#', '###.#', '###.#', '#####'] },
      try: 'Změň `vpravo();` na `vlevo();`. Robot se u zdi otočí nahoru a narazí.',
      pitfall: 'Podmínka patří do kulatých závorek a senzor má vlastní závorky: `if (jeZed())`. Zapomenuté `()` je častá chyba.',
      fact: 'Na otázku „je přede mnou překážka?“ se ptají i robotické sekačky nebo auta s nouzovým brzděním.'
    },
    '3-2': {
      title: 'Senzor a akce: `jeBug()` a `zap()`',
      text: [
        'Podmínka může hlídat cokoli, co robot umí zjistit. `jeBug()` odpoví `true`, když je **přímo před robotem** bug, a `zap();` po něm vystřelí antivirový paprsek.',
        'Typický vzor: **zeptej se senzoru** a podle odpovědi udělej akci. Program tak zvládne bug, ať je na cestě kdekoli.'
      ],
      example: 'for (let i = 0; i < 4; i++) {\n  if (jeBug()) {\n    zap();\n  }\n  krok();\n}',
      map: { map: ['#######', '#>.x..#', '#######'] },
      try: 'Smaž celé `if` i se `zap();` a nech jen `krok();`. Co se stane, když robot vjede do bugu?',
      pitfall: '`zap();` střílí jen dopředu, na pole před robotem. Na bug za zatáčkou nebo vedle robota nedosáhne.',
      fact: 'Chybě v programu se říká bug, brouk. Slavná historka vypráví o můře, kterou v roce 1947 našli uvízlou v počítači Mark II.'
    },
    '3-3': {
      title: 'Buď, anebo: `if` a `else`',
      text: [
        '`else` říká, co se má stát, když podmínka **neplatí**. Program tak vždycky vybere jednu ze dvou cest.',
        'Senzory `vlevoVolno()` a `vpravoVolno()` zjistí, jestli je volno po stranách robota. Podle nich se robot na rozcestí rozhodne, kam zatočit.'
      ],
      example: 'krok();\nkrok();\nif (vlevoVolno()) {\n  vlevo();\n} else {\n  vpravo();\n}\nkrok();',
      map: { map: ['#####', '#>..#', '###.#', '#####'] },
      try: 'Prohoď ve větvích `vlevo();` a `vpravo();`. Robot zatočí špatně a narazí do zdi.',
      pitfall: '`else` nemá vlastní podmínku. Patří vždycky k `if`, které je těsně před ním.',
      fact: 'Navigace v autě se rozhoduje podobně: na každé křižovatce vybere jednu z cest.'
    },
    '4-1': {
      title: 'Dokud platí: cyklus `while`',
      text: [
        '`while (podmínka) { … }` opakuje blok, **dokud** podmínka platí. Hodí se, když předem nevíš, kolikrát se má něco opakovat, třeba jak je chodba dlouhá.',
        '`!` znamená NE: `!jeZed()` je „není přede mnou zeď“. `while (!jeZed()) { krok(); }` tedy jede, dokud nedojede ke zdi, a zastaví se těsně před ní.'
      ],
      example: 'while (!jeZed()) {\n  krok();\n}\nvpravo();\nvpravo();',
      map: { map: ['##########', '#>.......#', '##########'] },
      try: 'Stejný program funguje pro chodbu jakékoli délky. Zkus místo `!jeZed()` napsat `jeZed()`: robot se vůbec nerozjede.',
      pitfall: 'Podmínka se kontroluje **před každým kolem**. Když neplatí hned na začátku, blok se neprovede ani jednou.',
      fact: 'Hry běží v cyklu while: dokud hráč nevyhrál ani neprohrál, pokračuj dalším kolem.'
    },
    '4-2': {
      title: 'Čekání na správnou chvíli: `laser()` a `cekej()`',
      text: [
        'Senzor `laser()` zjistí, jestli na **poli před robotem** svítí laser. `cekej();` nechá robota jeden takt stát a laser se mezitím může vypnout.',
        'Cyklus `while (laser()) { cekej(); }` čeká, **dokud** laser svítí. Pak robot bezpečně projede.'
      ],
      example: 'krok();\nwhile (laser()) {\n  cekej();\n}\nkrok();\nkrok();\nkrok();',
      map: { map: ['#######', '#>.L..#', '#######'], lasers: [{ period: 4, on: 2, phase: 0 }] },
      try: 'Smaž cyklus `while` a pusť robota rovnou. Podaří se mu proklouznout, nebo ho laser zasáhne?',
      pitfall: 'Laser se zapíná a vypíná podle taktů. Jeden `cekej();` nestačí vždycky, proto se čeká v cyklu, dokud laser nezhasne.',
      fact: 'Semafor na přechodu je stejný princip: čekej, dokud svítí červená, pak jdi.'
    },
    '4-3': {
      title: 'Nekonečný cyklus',
      text: [
        'Když se uvnitř `while` nic nezmění, podmínka platí **navždy** a cyklus se nikdy nezastaví. Robot se pak točí pořád dokola: **nekonečný cyklus**.',
        'Robota zastaví až prázdná baterka a ve hře navíc hlídač, který pozná, že se program zacyklil. Oprava je vždycky stejná: uvnitř cyklu se musí dít něco, co podmínku jednou změní.'
      ],
      example: 'while (!jeZed()) {\n  vpravo();\n  vlevo();\n}',
      map: { map: ['#######', '#>....#', '#######'] },
      battery: 16,
      try: 'Robot se točí na místě, dokud mu nedojde baterka. Přidej do cyklu `krok();` a spusť příklad znovu.',
      pitfall: 'Otočka ani `cekej();` robota neposune. Když podmínka hlídá zeď před robotem, musí se robot k té zdi opravdu blížit.',
      fact: 'Nekonečný cyklus umí „zamrazit“ i velké aplikace. Proto mají prohlížeče hlídače, který zaseknutou stránku nabídne zavřít.'
    },
    '5-1': {
      title: 'Vlastní příkaz: funkce',
      text: [
        '**Funkce** je tvůj vlastní příkaz. Jednou ji nadefinuješ slovem `function` a pak ji voláš jménem, kolikrát chceš. Program je kratší a čitelnější.',
        'Funkce `otocSe()` třeba obsahuje dvě otočky. Kdekoli pak stačí napsat `otocSe();`.'
      ],
      example: 'function otocSe() {\n  vpravo();\n  vpravo();\n}\n\nfunction dojedKeZdi() {\n  while (!jeZed()) {\n    krok();\n  }\n}\n\ndojedKeZdi();\nseber();\notocSe();\ndojedKeZdi();',
      map: { map: ['#######', '#>...b#', '#######'] },
      try: 'Přidej na konec ještě `otocSe();` a `dojedKeZdi();`. Robot jezdí tam a zpátky a kód zůstává čitelný.',
      pitfall: 'Definice funkce sama nic neudělá. Robot se pohne, až funkci **zavoláš** i se závorkami: `otocSe();`.',
      fact: 'Velké programy mají tisíce funkcí. Dobré jméno funkce řekne, co dělá, a nemusíš číst, jak to dělá.'
    },
    '5-2': {
      title: 'Proměnná: robot si pamatuje číslo',
      text: [
        '**Proměnná** si pamatuje hodnotu. `let kroky = 0;` vytvoří počítadlo s nulou a `kroky++;` ho zvýší o 1.',
        '`ohlas(kroky);` nechá robota hodnotu nahlas říct. Hodí se, když potřebuješ něco **spočítat**, třeba kroky nebo bity.'
      ],
      example: 'let kroky = 0;\nwhile (!jeZed()) {\n  krok();\n  kroky++;\n}\nohlas(kroky);',
      map: { map: ['########', '#>.....#', '########'] },
      try: 'Ať se počítadlo zvyšuje o 2: `kroky = kroky + 2;`. Co robot ohlásí?',
      pitfall: '`let` se píše jen jednou, když proměnnou vytváříš. Uvnitř cyklu by počítadlo pokaždé vynulovalo.',
      fact: 'Krokoměr v mobilu je v jádru taky jen proměnná, která se s každým krokem zvýší o 1.'
    },
    '5-3': {
      title: 'Algoritmus: pravidlo ruky na zdi',
      text: [
        '**Algoritmus** je obecný postup, který funguje pro každou mapu, ne jen pro jednu. Bludiště projdeš třeba tak, že se budeš pořád držet jedné zdi, jako bys po ní přejížděl(a) rukou.',
        'Tady se robot drží **levé** zdi: když je vlevo volno, zatočí doleva a jede. Jinak, když je před ním volno, jede rovně. Jinak se otočí doprava. A celé to opakuje, dokud není v cíli.'
      ],
      example: 'while (!jeCil()) {\n  if (vlevoVolno()) {\n    vlevo();\n    krok();\n  } else if (!jeZed()) {\n    krok();\n  } else {\n    vpravo();\n  }\n}',
      map: { map: ['#######', '#>..#.#', '##.##.#', '#..#..#', '#.##.##', '#....G#', '#######'] },
      try: 'Přepiš program tak, aby se robot držel **pravé** zdi: místo `vlevoVolno` a `vlevo` použij `vpravoVolno` a `vpravo` (a naopak).',
      pitfall: 'Pravidlo ruky na zdi projde každé bludiště bez ostrůvků. Když je cíl uprostřed ostrůvku, může robot kroužit dokola.',
      fact: 'Pravidlo ruky na zdi znali už staří stavitelé labyrintů a dodnes ho používají i roboti v soutěžích.'
    }
  };

  Object.values(L).forEach(x => { x.kind = 'bajt'; x.file = 'program.js'; });
  global.BajtContent.LESSONS = L;
})(typeof window !== 'undefined' ? window : globalThis);
