/*
 * Noc v galerii – obsah: sály, postavy, 12 obrazů (katalog = vzorové CSS, vybledlé plátno = zadání),
 * nápovědy, bonusy a vstupní / výstupní test.
 */
(function (global) {
  'use strict';

  const CHAPTERS = [
    { id: 1, icon: '◯', title: 'Sál tvarů', desc: 'Kruhy, obdélníky a trojúhelníky: border-radius, position, z-index a trojúhelník z borderů.' },
    { id: 2, icon: '🌅', title: 'Sál barev a světla', desc: 'Přechody, kruhové vlny, pruhy a stíny: linear-gradient, repeating-…-gradient a box-shadow.' },
    { id: 3, icon: '🏛️', title: 'Sál mistrů', desc: 'Otáčení, mřížka, ořez a pseudoprvky: transform, grid, clip-path, ::before a ::after.' }
  ];
  const WHO = {
    reditelka: { name: 'Ludmila Rámová', role: 'ředitelka galerie', ico: '🖼️' },
    hlidac: { name: 'Bedřich', role: 'noční hlídač', ico: '🔦' }
  };

  /* plátno je ve všech obrazech stejné */
  const CANVAS = `.obraz {
  position: relative;
  width: 400px;
  height: 300px;
  overflow: hidden;`;

  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const ruleFor = (rules, re) => rules.filter(r => re.test(r.sel));
  const nc = css => String(css || '').replace(/\/\*[\s\S]*?\*\//g, ''); // CSS bez komentářů

  const LEVELS = [
    /* ---------------- Sál 1: tvary ---------------- */
    {
      id: 1, chapter: 1, title: 'Ranní slunce', artist: 'Ema Kružítková', year: 1931, concept: 'border-radius',
      brief: [
        ['reditelka', 'Ráno v osm otevíráme výstavu **Geometrie snů** a hlídač Bedřich mi právě volal, že z obrazů v noci **zmizely barvy**. Zbyla jen plátna a náš katalog s fotkami.'],
        ['hlidac', 'Začneme u dveří. Ranní slunce od paní Kružítkové. Kopec je ještě vidět, ale slunce zmizelo úplně. V CSS má jen polohu.'],
        ['reditelka', 'Slunce je **kruh**. V CSS je kruh čtverec, kterému zakulatíš rohy přes `border-radius: 50%`.']
      ],
      task: 'Dokresli **slunce**: dej mu šířku a výšku **140 px**, barvu z katalogu a zakulacení `border-radius: 50%`.',
      html: `<div class="obraz">
  <div class="slunce"></div>
  <div class="kopec"></div>
</div>
`,
      starter: `${CANVAS}
  background: #f3e3c3;
}

.slunce {
  position: absolute;
  left: 130px;
  top: 50px;
  /* sem doplň šířku, výšku, barvu a zakulacení */
}

.kopec {
  position: absolute;
  left: -60px;
  top: 200px;
  width: 520px;
  height: 260px;
  background: #7d9a78;
  border-radius: 50%;
}
`,
      solution: `${CANVAS}
  background: #f3e3c3;
}

.slunce {
  position: absolute;
  left: 130px;
  top: 50px;
  width: 140px;
  height: 140px;
  background: #e2673f;
  border-radius: 50%;
}

.kopec {
  position: absolute;
  left: -60px;
  top: 200px;
  width: 520px;
  height: 260px;
  background: #7d9a78;
  border-radius: 50%;
}
`,
      bonus: { text: 'Barvu slunce sis vzal(a) pipetou: klikni v katalogu na slunce a barva se zkopíruje.', check: c => !!c.stats.picked },
      hints: [
        'Do pravidla `.slunce` připiš `width: 140px;` a `height: 140px;`. Teprve pak bude slunce vidět.',
        'Barvu zjistíš pipetou: najeď myší v katalogu na slunce a klikni. Barva se zkopíruje, vlož ji do `background: …;`.',
        'Kruh vznikne ze čtverce přes `border-radius: 50%;`. Polovina strany je poloměr zakulacení.'
      ],
      learn: ['**border-radius** zakulatí rohy. Hodnota 50 % udělá ze čtverce kruh a z obdélníku elipsu, jako u kopce.', '.slunce {\n  width: 140px;\n  height: 140px;\n  background: #e2673f;\n  border-radius: 50%;\n}'],
      reward: 'První obraz visí. Bedřich: „Ten kruh je kulatější než moje svačina.“',
      palette: ['width: |px;', 'height: |px;', 'background: #|;', 'border-radius: 50%;']
    },
    {
      id: 2, chapter: 1, title: 'Tři okna', artist: 'Bořek Pravítko', year: 1928, concept: 'position: absolute',
      brief: [
        ['hlidac', 'Pan Pravítko maloval domy jako architekt: všechno na milimetr. Okna se ale v noci sesypala do levého horního rohu.'],
        ['reditelka', 'Každý prvek s `position: absolute` se umisťuje od rohu plátna: **top** je vzdálenost shora, **left** zleva.'],
        ['hlidac', 'Souřadnice zjistíš pravítkem. Když najedeš myší na katalog, nad obrazy uvidíš souřadnice x a y.']
      ],
      task: 'Vrať **okna** na místo: všem dej `top: 86px` a každému vlastní `left` (44, 159 a 274 px). Ověř si to pravítkem v katalogu.',
      html: `<div class="obraz">
  <div class="strecha"></div>
  <div class="okno a"></div>
  <div class="okno b"></div>
  <div class="okno c"></div>
  <div class="dvere"></div>
</div>
`,
      starter: `${CANVAS}
  background: #e9d5b0;
}

.strecha {
  position: absolute;
  left: 0;
  top: 0;
  width: 400px;
  height: 46px;
  background: #9c3f2b;
}

.okno {
  position: absolute;
  width: 70px;
  height: 96px;
  background: #2c4a63;
  border: 6px solid #f6ecd8;
}

.a {
}

.b {
}

.c {
}

.dvere {
  position: absolute;
  left: 170px;
  top: 216px;
  width: 60px;
  height: 84px;
  background: #6d3b2a;
  border-radius: 30px 30px 0 0;
}
`,
      solution: `${CANVAS}
  background: #e9d5b0;
}

.strecha {
  position: absolute;
  left: 0;
  top: 0;
  width: 400px;
  height: 46px;
  background: #9c3f2b;
}

.okno {
  position: absolute;
  top: 86px;
  width: 70px;
  height: 96px;
  background: #2c4a63;
  border: 6px solid #f6ecd8;
}

.a {
  left: 44px;
}

.b {
  left: 159px;
}

.c {
  left: 274px;
}

.dvere {
  position: absolute;
  left: 170px;
  top: 216px;
  width: 60px;
  height: 84px;
  background: #6d3b2a;
  border-radius: 30px 30px 0 0;
}
`,
      bonus: {
        text: 'Společné `top` je jen jednou ve třídě `.okno`, okna `.a`, `.b` a `.c` mají jen `left`.',
        check: c => { const ok = ruleFor(c.rules, /^\.okno$/).some(r => r.style.top); const each = ruleFor(c.rules, /(^|\s|\.okno)\.(a|b|c)\b/); return ok && each.length >= 3 && each.every(r => !r.style.top); }
      },
      hints: [
        'Všechna okna mají stejnou výšku nad zemí, takže `top: 86px;` patří do společného pravidla `.okno`.',
        'Pak doplň `left`: `.a { left: 44px; }`, `.b { left: 159px; }`, `.c { left: 274px; }`.',
        'Proč 159? Okno je široké 70 px a k tomu 2 × 6 px rámeček, celkem 82 px. Na střed plátna: (400 − 82) / 2 = 159.'
      ],
      learn: ['**position: absolute** vytáhne prvek z běžného toku a umístí ho podle **top**, **left** (nebo **right**, **bottom**) od nejbližšího předka s `position: relative`. Tady je to plátno `.obraz`.', '.okno { position: absolute; top: 86px; }\n.a { left: 44px; }\n.b { left: 159px; }'],
      reward: 'Pan Pravítko by měřil pravítkem. Bedřich: „Sedí to na pixel, přeměřil jsem to baterkou.“',
      palette: ['top: |px;', 'left: |px;']
    },
    {
      id: 3, chapter: 1, title: 'Půlměsíc', artist: 'Luna Nocová', year: 1936, concept: 'z-index a pořadí',
      brief: [
        ['reditelka', 'Paní Nocová malovala srpek měsíce chytře: na žlutý kruh položila druhý kruh v barvě nebe. Zůstane jen srpek.'],
        ['hlidac', 'Jenže stínový kruh teď leží přesně pod měsícem a je schovaný. Měsíc je v úplňku!'],
        ['reditelka', 'Prvek, který je v HTML **později**, se kreslí **navrch**. Pořadí změní i `z-index`: vyšší číslo je výš.']
      ],
      task: 'Posuň **stín** na `left: 178px; top: 52px` a dostaň ho **nad měsíc**: buď `z-index`, nebo přehozením prvků v HTML.',
      html: `<div class="obraz">
  <div class="stin"></div>
  <div class="mesic"></div>
  <div class="hvezda h1"></div>
  <div class="hvezda h2"></div>
  <div class="hvezda h3"></div>
</div>
`,
      starter: `${CANVAS}
  background: #1d2b4a;
}

.mesic {
  position: absolute;
  left: 140px;
  top: 70px;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: #f2d27a;
}

.stin {
  position: absolute;
  left: 140px;
  top: 70px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #1d2b4a;
}

.hvezda {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f2d27a;
}
.h1 { left: 70px; top: 60px; }
.h2 { left: 320px; top: 214px; }
.h3 { left: 96px; top: 226px; }
`,
      solution: `${CANVAS}
  background: #1d2b4a;
}

.mesic {
  position: absolute;
  left: 140px;
  top: 70px;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: #f2d27a;
}

.stin {
  position: absolute;
  left: 178px;
  top: 52px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #1d2b4a;
  z-index: 1;
}

.hvezda {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f2d27a;
}
.h1 { left: 70px; top: 60px; }
.h2 { left: 320px; top: 214px; }
.h3 { left: 96px; top: 226px; }
`,
      bonus: {
        text: 'Srpek bez `z-index`: stín je v HTML až za měsícem, a proto navrchu.',
        check: c => !/z-index/i.test(nc(c.css)) && (() => { const i = c.els.findIndex(e => e.classList.contains('stin')); const j = c.els.findIndex(e => e.classList.contains('mesic')); return i > j && j >= 0; })()
      },
      hints: [
        'Nejdřív stín posuň: v `.stin` změň `left` na 178px a `top` na 52px.',
        'Stín je pořád pod měsícem. Přidej do `.stin` řádek `z-index: 1;`.',
        'Pro bonus místo z-index přesuň v souboru index.html řádek s `class="stin"` až pod řádek s `class="mesic"`.'
      ],
      learn: ['Prvky se kreslí v pořadí, v jakém jsou v HTML: pozdější navrch. **z-index** pořadí změní (funguje u prvků s position). Vyšší číslo je blíž k divákovi.', '.stin {\n  left: 178px;\n  top: 52px;\n  z-index: 1;\n}'],
      reward: 'Srpek svítí. Bedřich: „Teď konečně vím, kdy je v galerii noc.“',
      palette: ['z-index: 1;', 'left: |px;', 'top: |px;']
    },
    {
      id: 4, chapter: 1, title: 'Hory', artist: 'Tonda Trojan', year: 1925, concept: 'trojúhelník z borderů',
      brief: [
        ['hlidac', 'Pan Trojan maloval jen trojúhelníky. Zadní hora přežila, přední hora a sníh na vrcholku zmizely.'],
        ['reditelka', 'CSS trojúhelník je trik: prvek s nulovou šířkou a výškou a třemi okraji. Dva boční jsou **průhledné**, spodní barevný. Potkají se ve špičce.'],
        ['hlidac', 'Podívej se, jak je napsaná zadní hora, a udělej to podle ní.']
      ],
      task: 'Podle zadní hory dokresli **přední horu** (boky 115 px, výška 140 px, barva `#3c4d5c`) a **sněhovou čepici** (boky 30 px, výška 42 px, bílá).',
      html: `<div class="obraz">
  <div class="slunce"></div>
  <div class="hora zadni"></div>
  <div class="hora predni"></div>
  <div class="snih"></div>
</div>
`,
      starter: `${CANVAS}
  background: #a9cbd8;
}

.slunce {
  position: absolute;
  left: 300px;
  top: 40px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f6e7a6;
}

.hora {
  position: absolute;
  width: 0;
  height: 0;
}

.zadni {
  left: 10px;
  top: 120px;
  border-left: 130px solid transparent;
  border-right: 130px solid transparent;
  border-bottom: 180px solid #5c7183;
}

.predni {
  left: 170px;
  top: 160px;
}

.snih {
  position: absolute;
  left: 110px;
  top: 120px;
}
`,
      solution: `${CANVAS}
  background: #a9cbd8;
}

.slunce {
  position: absolute;
  left: 300px;
  top: 40px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f6e7a6;
}

.hora {
  position: absolute;
  width: 0;
  height: 0;
}

.zadni {
  left: 10px;
  top: 120px;
  border-left: 130px solid transparent;
  border-right: 130px solid transparent;
  border-bottom: 180px solid #5c7183;
}

.predni {
  left: 170px;
  top: 160px;
  border-left: 115px solid transparent;
  border-right: 115px solid transparent;
  border-bottom: 140px solid #3c4d5c;
}

.snih {
  position: absolute;
  left: 110px;
  top: 120px;
  width: 0;
  height: 0;
  border-left: 30px solid transparent;
  border-right: 30px solid transparent;
  border-bottom: 42px solid #ffffff;
}
`,
      bonus: {
        text: 'Barvy hor máš v proměnných (`--hora: …`) a používáš je přes `var(…)`.',
        check: c => /--[\w-]+\s*:/.test(nc(c.css)) && /var\(\s*--/.test(nc(c.css))
      },
      hints: [
        'Přední hora: zkopíruj tři řádky `border-…` ze zadní hory a změň čísla na 115px, 115px a 140px a barvu na `#3c4d5c`.',
        'Sníh potřebuje i `width: 0; height: 0;`, protože nemá třídu `.hora`. Pak boky 30px a spodek `42px solid #ffffff`.',
        'Bonus: nahoru do `.obraz` napiš `--hora: #5c7183;` a v zadní hoře pak `border-bottom: 180px solid var(--hora);`.'
      ],
      learn: ['Prvek s **nulovou šířkou a výškou** je celý jen z okrajů. Okraje se potkávají šikmo, takže dva **průhledné** boky a jeden barevný spodek dají trojúhelník. Šířka základny je součet boků, výška je spodní okraj.', '.snih {\n  width: 0;\n  height: 0;\n  border-left: 30px solid transparent;\n  border-right: 30px solid transparent;\n  border-bottom: 42px solid #ffffff;\n}'],
      reward: 'Hory jsou zpátky. Bedřich: „Na tu přední bych nevylezl, je moc špičatá.“',
      palette: ['border-left: |px solid transparent;', 'border-right: |px solid transparent;', 'border-bottom: |px solid #;', 'width: 0;\nheight: 0;']
    },

    /* ---------------- Sál 2: barvy a světlo ---------------- */
    {
      id: 5, chapter: 2, title: 'Západ nad mořem', artist: 'Vlasta Přechodová', year: 1934, concept: 'linear-gradient',
      brief: [
        ['reditelka', 'Paní Přechodová nesnášela rovné barvy. Nebe jí přechází ze žluté přes oranžovou do fialové a moře tmavne ke dnu.'],
        ['hlidac', 'Teď je nebe jen oranžové a moře jedna modrá. Vypadá to jako přebal sešitu.'],
        ['reditelka', 'Přechod je obrázek: `background: linear-gradient(barva1, barva2 55%, barva3)`. Bez úhlu jde shora dolů a procenta říkají, kde má barva být.']
      ],
      task: 'Nebe (`.obraz`): přechod `#f8c96b` → `#e8743f` na **55 %** → `#7b3b5e`. Moře (`.more`): přechod z `#21405f` do `#0f2238`.',
      html: `<div class="obraz">
  <div class="slunce"></div>
  <div class="more"></div>
</div>
`,
      starter: `${CANVAS}
  background: #e8743f;
}

.slunce {
  position: absolute;
  left: 140px;
  top: 112px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #fde6b0;
}

.more {
  position: absolute;
  left: 0;
  top: 182px;
  width: 400px;
  height: 118px;
  background: #21405f;
}
`,
      solution: `${CANVAS}
  background: linear-gradient(#f8c96b, #e8743f 55%, #7b3b5e);
}

.slunce {
  position: absolute;
  left: 140px;
  top: 112px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #fde6b0;
}

.more {
  position: absolute;
  left: 0;
  top: 182px;
  width: 400px;
  height: 118px;
  background: linear-gradient(#21405f, #0f2238);
}
`,
      bonus: { text: 'Zlatý rám: celé CSS má nejvýš 330 znaků (mezery se nepočítají). Pomůže `inset` a zkrácené zápisy.', limit: 330, check: c => c.size <= 330 },
      hints: [
        'V `.obraz` nahraď `background: #e8743f;` řádkem `background: linear-gradient(#f8c96b, #e8743f 55%, #7b3b5e);`.',
        'V `.more` stejně: `background: linear-gradient(#21405f, #0f2238);`. Dvě barvy bez procent se rozprostřou rovnoměrně.',
        'Bonus: `left: 0; top: 182px; width: 400px;` jde zkrátit na `inset: 182px 0 0;` (nahoře, vpravo a vlevo, dole). Pak už stačí smazat `height`.'
      ],
      learn: ['**linear-gradient** maluje plynulý přechod barev. Bez úhlu vede shora dolů. Za barvu můžeš napsat pozici (55 %), kde má být čistá.', '.obraz {\n  background: linear-gradient(#f8c96b, #e8743f 55%, #7b3b5e);\n}'],
      reward: 'Slunce zapadá znovu. Bedřich si k obrazu přinesl židli: „Takový západ jsem neviděl ani u moře.“',
      palette: ['background: linear-gradient(|);', ', #e8743f 55%', 'inset: |;']
    },
    {
      id: 6, chapter: 2, title: 'Kruhy na vodě', artist: 'Kamil Kapka', year: 1938, concept: 'repeating-radial-gradient',
      brief: [
        ['hlidac', 'Tohle je moje oblíbená. Kapka spadne do rybníka a kolem jdou kruhy. Teď tam zbyla jen kapka v zeleném nic.'],
        ['reditelka', 'Kruhy se opakují pořád stejně, takže na ně stačí **jeden řádek**: `repeating-radial-gradient`. Střed nastavíš přes `circle at 200px 150px`.'],
        ['reditelka', 'Každý kruh je 18 px tmavé vody a 8 px světlé. Pak se to opakuje.']
      ],
      task: 'Namaluj **kruhy**: `.obraz` dostane `repeating-radial-gradient(circle at 200px 150px, #2a6f6b 0 18px, #4f9c94 18px 26px)`.',
      html: `<div class="obraz">
  <div class="kapka"></div>
</div>
`,
      starter: `${CANVAS}
  background: #2a6f6b;
}

.kapka {
  position: absolute;
  left: 191px;
  top: 141px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e3f4ef;
}
`,
      solution: `${CANVAS}
  background: repeating-radial-gradient(circle at 200px 150px, #2a6f6b 0 18px, #4f9c94 18px 26px);
}

.kapka {
  position: absolute;
  left: 191px;
  top: 141px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e3f4ef;
}
`,
      bonus: {
        text: 'Jediný prvek: kapku smaž z HTML a namaluj ji druhým přechodem ve stejném pozadí.',
        check: c => c.els.length === 1
      },
      hints: [
        'Do `.obraz` místo `background: #2a6f6b;` napiš celý řádek ze zadání. Dvě čísla za barvou (`0 18px`) říkají, odkud kam barva sahá.',
        'Přechod opakující se do nekonečna je `repeating-radial-gradient`. Obyčejný `radial-gradient` by udělal jen jeden kruh.',
        'Bonus: pozadí může mít víc vrstev oddělených čárkou. Navrch dej `radial-gradient(circle at 200px 150px, #e3f4ef 0 9px, transparent 9px)` a pak opakované kruhy. Prvek `.kapka` z HTML smaž.'
      ],
      learn: ['**radial-gradient** maluje kruhový přechod, **repeating-radial-gradient** ho opakuje dokola. Dvojice čísel za barvou (`18px 26px`) dělá ostré proužky.', '.obraz {\n  background: repeating-radial-gradient(\n    circle at 200px 150px,\n    #2a6f6b 0 18px, #4f9c94 18px 26px);\n}'],
      reward: 'Hladina se zase vlní. Bedřich hodil do kašny korunu pro štěstí.',
      palette: ['background: repeating-radial-gradient(circle at 200px 150px, |);', 'radial-gradient(circle at 200px 150px, #e3f4ef 0 9px, transparent 9px), ']
    },
    {
      id: 7, chapter: 2, title: 'Markýza', artist: 'Ludmila Proužková', year: 1930, concept: 'repeating-linear-gradient',
      brief: [
        ['reditelka', 'Kavárna na náměstí, jak ji viděla paní Proužková: pruhovaná markýza a ubrus s šikmými proužky. Obojí vybledlo do jedné barvy.'],
        ['hlidac', 'Pruhy se opakují, takže zase stačí jeden řádek. Svislé pruhy jsou přechod pod úhlem **90deg**, šikmé pod **45deg**.'],
        ['reditelka', 'Markýza: 34 px červená, 34 px krémová. Ubrus: 14 px žlutá, 14 px krémová.']
      ],
      task: 'Markýza: `repeating-linear-gradient(90deg, #c8553d 0 34px, #f7efe1 34px 68px)`. Ubrus podobně pod úhlem **45deg** s barvami `#e3a72f` a `#f7efe1` po **14 px**.',
      html: `<div class="obraz">
  <div class="markyza"></div>
  <div class="okno"></div>
  <div class="ubrus"></div>
</div>
`,
      starter: `${CANVAS}
  background: #efe1c6;
}

.markyza {
  position: absolute;
  left: 30px;
  top: 30px;
  width: 340px;
  height: 70px;
  background: #c8553d;
}

.okno {
  position: absolute;
  left: 60px;
  top: 100px;
  width: 280px;
  height: 110px;
  background: #2f4858;
}

.ubrus {
  position: absolute;
  left: 0;
  top: 230px;
  width: 400px;
  height: 70px;
  background: #e3a72f;
}
`,
      solution: `${CANVAS}
  background: #efe1c6;
}

.markyza {
  position: absolute;
  left: 30px;
  top: 30px;
  width: 340px;
  height: 70px;
  background: repeating-linear-gradient(90deg, #c8553d 0 34px, #f7efe1 34px 68px);
}

.okno {
  position: absolute;
  left: 60px;
  top: 100px;
  width: 280px;
  height: 110px;
  background: #2f4858;
}

.ubrus {
  position: absolute;
  left: 0;
  top: 230px;
  width: 400px;
  height: 70px;
  background: repeating-linear-gradient(45deg, #e3a72f 0 14px, #f7efe1 14px 28px);
}
`,
      bonus: { text: 'Zlatý rám: celé CSS má nejvýš 430 znaků (mezery se nepočítají).', limit: 430, check: c => c.size <= 430 },
      hints: [
        'Do `.markyza` dej místo jedné barvy celý řádek ze zadání. 90deg znamená, že přechod jde zleva doprava, takže pruhy stojí svisle.',
        'Ubrus: `background: repeating-linear-gradient(45deg, #e3a72f 0 14px, #f7efe1 14px 28px);`.',
        'Bonus: společné `position: absolute;` dej do jednoho pravidla pro všechny tři prvky (`.markyza, .okno, .ubrus { position: absolute; }`) a u ubrusu nahraď left, top, width a height zápisem `inset: 230px 0 0;`.'
      ],
      learn: ['**repeating-linear-gradient** opakuje proužky. Úhel říká směr: 90deg vede doleva doprava (pruhy svisle), 45deg šikmo. Stejná pozice konce jedné a začátku další barvy dělá ostrý okraj.', '.markyza {\n  background: repeating-linear-gradient(\n    90deg, #c8553d 0 34px, #f7efe1 34px 68px);\n}'],
      reward: 'Kavárna zase láká. Bedřich: „Dal bych si kafe. V šest ráno.“',
      palette: ['background: repeating-linear-gradient(|deg, );', '#c8553d 0 34px, #f7efe1 34px 68px']
    },
    {
      id: 8, chapter: 2, title: 'Souhvězdí', artist: 'Stella Stínová', year: 1939, concept: 'box-shadow',
      brief: [
        ['hlidac', 'Paní Stínová namalovala Velký vůz. Na plátně zbyla jediná hvězda vlevo dole.'],
        ['reditelka', 'Stín v CSS je kopie tvaru prvku. `box-shadow: 64px -26px #ffd56b` nakreslí stejnou kulatou hvězdu o 64 px vpravo a 26 px výš. A stínů může být víc, oddělených čárkou.'],
        ['hlidac', 'Pozice hvězd změříš pravítkem. Od první hvězdy jen odečteš, o kolik je která dál.']
      ],
      task: 'Dokresli zbylých **6 hvězd**. Můžeš přidat prvky do HTML, ale mistr to zvládne **jedním prvkem a stíny** (`box-shadow`).',
      html: `<div class="obraz">
  <div class="hvezda"></div>
</div>
`,
      starter: `${CANVAS}
  background: radial-gradient(circle at 70% 20%, #2a3b66, #111a33 70%);
}

.hvezda {
  position: absolute;
  left: 60px;
  top: 190px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffd56b;
}
`,
      solution: `${CANVAS}
  background: radial-gradient(circle at 70% 20%, #2a3b66, #111a33 70%);
}

.hvezda {
  position: absolute;
  left: 60px;
  top: 190px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffd56b;
  box-shadow: 64px -26px #ffd56b, 120px -6px #ffd56b, 176px -38px #ffd56b,
    226px -88px #ffd56b, 286px -60px #ffd56b, 270px 6px #ffd56b;
}
`,
      bonus: { text: 'Všech sedm hvězd je jediný prvek (zbytek jsou stíny).', check: c => c.els.length === 2 },
      hints: [
        'Pravítkem najdi levý horní roh každé hvězdy. První je na x = 60, y = 190. Druhá je na 124, 164, tedy o 64 vpravo a 26 nahoru: `64px -26px`.',
        'Další hvězdy jsou na 180, 184 · 236, 152 · 286, 102 · 346, 130 · 330, 196. Od každé odečti 60 a 190.',
        'Celý řádek: `box-shadow: 64px -26px #ffd56b, 120px -6px #ffd56b, 176px -38px #ffd56b, 226px -88px #ffd56b, 286px -60px #ffd56b, 270px 6px #ffd56b;`.'
      ],
      learn: ['**box-shadow** nakreslí kopii tvaru prvku (i se zakulacením) posunutou o x a y. Stínů může být libovolně mnoho, oddělených čárkou, takže jeden prvek namaluje celé souhvězdí.', '.hvezda {\n  box-shadow: 64px -26px #ffd56b,\n              120px -6px #ffd56b;\n}'],
      reward: 'Vůz svítí. Bedřich podle něj prý našel Polárku i vypínač v depozitáři.',
      palette: ['box-shadow: |;', '64px -26px #ffd56b']
    },

    /* ---------------- Sál 3: mistři ---------------- */
    {
      id: 9, chapter: 3, title: 'Kosočtverec', artist: 'Otto Otáčka', year: 1932, concept: 'transform',
      brief: [
        ['reditelka', 'Pan Otáčka maloval čtverce a pak je otáčel. Na plátně zůstaly rovné, jako by se nic nestalo.'],
        ['hlidac', 'Malý čtverec stačí otočit o 45 stupňů. Velký je ale **kosočtverec**, placatý diamant. Toho otočením nevyrobíš.'],
        ['reditelka', 'Transformace jde skládat: `transform: scaleY(0.6) rotate(45deg)` čtverec otočí a pak zmáčkne na výšku. Pořadí funkcí rozhoduje!']
      ],
      task: 'Malý **čtverec** otoč o 45°. Velký udělej **kosočtverec**: otoč ho o 45° a zmáčkni na 0,6 výšky (`scaleY(0.6)`).',
      html: `<div class="obraz">
  <div class="osa"></div>
  <div class="kosoctverec"></div>
  <div class="ctverec"></div>
</div>
`,
      starter: `${CANVAS}
  background: #f1e3d3;
}

.osa {
  position: absolute;
  left: 30px;
  top: 148px;
  width: 340px;
  height: 4px;
  background: #264653;
}

.kosoctverec {
  position: absolute;
  left: 120px;
  top: 70px;
  width: 160px;
  height: 160px;
  background: #2a9d8f;
}

.ctverec {
  position: absolute;
  left: 175px;
  top: 125px;
  width: 50px;
  height: 50px;
  background: #e76f51;
}
`,
      solution: `${CANVAS}
  background: #f1e3d3;
}

.osa {
  position: absolute;
  left: 30px;
  top: 148px;
  width: 340px;
  height: 4px;
  background: #264653;
}

.kosoctverec {
  position: absolute;
  left: 120px;
  top: 70px;
  width: 160px;
  height: 160px;
  background: #2a9d8f;
  transform: scaleY(0.6) rotate(45deg);
}

.ctverec {
  position: absolute;
  left: 175px;
  top: 125px;
  width: 50px;
  height: 50px;
  background: #e76f51;
  transform: rotate(45deg);
}
`,
      bonus: {
        text: 'Kosočtverec má jediný `transform` se dvěma funkcemi (otočení i zmáčknutí).',
        check: c => ruleFor(c.rules, /kosoctverec/).some(r => (String(r.style.transform || '').match(/[a-z]+\(/gi) || []).length >= 2)
      },
      hints: [
        'Malý čtverec: do `.ctverec` připiš `transform: rotate(45deg);`. Otáčí se kolem svého středu.',
        'Kosočtverec: `transform: scaleY(0.6) rotate(45deg);`. Funkce se provádějí zprava doleva: nejdřív otočit, pak zmáčknout.',
        'Zkus si funkce prohodit (`rotate(45deg) scaleY(0.6)`) a uvidíš, proč na pořadí záleží: vznikne otočený obdélník.'
      ],
      learn: ['**transform** prvek otočí (`rotate`), zvětší či zmáčkne (`scale`, `scaleY`) nebo posune (`translate`) kolem jeho středu. Funkcí může být víc a záleží na pořadí.', '.kosoctverec {\n  transform: scaleY(0.6) rotate(45deg);\n}'],
      reward: 'Diamanty se točí, jak mají. Bedřich: „Pan Otáčka by byl hrdý. Mně se z toho točí hlava.“',
      palette: ['transform: rotate(|deg);', 'transform: scaleY(|) rotate(45deg);']
    },
    {
      id: 10, chapter: 3, title: 'Mozaika', artist: 'Gréta Mřížková', year: 1935, concept: 'grid',
      brief: [
        ['reditelka', 'Paní Mřížková skládala obrazy z obdélníků oddělených černými spárami. Barevná pole ale v noci spadla na hromádku.'],
        ['hlidac', 'Na takovou skládačku je v CSS **mřížka**: `display: grid`. Řekneš, jak široké jsou sloupce a jak vysoké řádky, a pole se samy srovnají.'],
        ['reditelka', 'Černé spáry nejsou čáry. Je to mezera mezi poli (`gap`), kterou prosvítá tmavé plátno.']
      ],
      task: 'Z plátna udělej mřížku: sloupce `150px 1fr 1fr`, řádky `100px 1fr 72px`, mezery a okraj **10 px**. Pole **a** zabere 2 řádky, **b** a **f** po 2 sloupcích.',
      html: `<div class="obraz">
  <div class="a"></div>
  <div class="b"></div>
  <div class="c"></div>
  <div class="d"></div>
  <div class="e"></div>
  <div class="f"></div>
</div>
`,
      starter: `${CANVAS}
  box-sizing: border-box;
  background: #22232a;
  /* tady z plátna udělej mřížku */
}

.a { background: #c0392b; }
.b { background: #f4efe3; }
.c { background: #f4efe3; }
.d { background: #1f4e79; }
.e { background: #f4efe3; }
.f { background: #f1c40f; }
`,
      solution: `${CANVAS}
  box-sizing: border-box;
  background: #22232a;
  display: grid;
  grid-template-columns: 150px 1fr 1fr;
  grid-template-rows: 100px 1fr 72px;
  gap: 10px;
  padding: 10px;
}

.a { background: #c0392b; grid-row: span 2; }
.b { background: #f4efe3; grid-column: span 2; }
.c { background: #f4efe3; }
.d { background: #1f4e79; }
.e { background: #f4efe3; }
.f { background: #f1c40f; grid-column: span 2; }
`,
      bonus: { text: 'Rozložení popíšeš mapou: `grid-template-areas` a u polí `grid-area`.', check: c => /grid-template-areas\s*:/.test(nc(c.css)) && /grid-area\s*:/.test(nc(c.css)) },
      hints: [
        'Do `.obraz` připiš `display: grid;`, `grid-template-columns: 150px 1fr 1fr;` a `grid-template-rows: 100px 1fr 72px;`.',
        'Spáry: `gap: 10px;` a okraj `padding: 10px;`. Pak pole roztáhni: `.a { grid-row: span 2; }`, `.b` a `.f` dostanou `grid-column: span 2;`.',
        'Bonus: `grid-template-areas: "a b b" "a c d" "e f f";` a každé pole pak `grid-area: a;` (podle svého písmena).'
      ],
      learn: ['**display: grid** udělá z prvku mřížku. `grid-template-columns` a `grid-template-rows` určí velikosti (fr je díl zbylého místa), `gap` mezery a `span` roztáhne pole přes víc buněk.', '.obraz {\n  display: grid;\n  grid-template-columns: 150px 1fr 1fr;\n  gap: 10px;\n}\n.a { grid-row: span 2; }'],
      reward: 'Mozaika drží pohromadě. Bedřich: „Skládal jsem puzzle 20 let a tohle bylo rychlejší.“',
      palette: ['display: grid;', 'grid-template-columns: |;', 'grid-template-rows: |;', 'gap: 10px;', 'grid-row: span 2;', 'grid-column: span 2;']
    },
    {
      id: 11, chapter: 3, title: 'Severka', artist: 'Petra Polygonová', year: 1937, concept: 'clip-path',
      brief: [
        ['hlidac', 'Severka a hřebeny hor. Teď jsou z nich obyčejné obdélníky, žlutý a tmavý.'],
        ['reditelka', 'Tvar vystřihneš nůžkami `clip-path: polygon(…)`. Vypíšeš body obrysu, třeba `50% 0` je nahoře uprostřed a `0 100%` vlevo dole.'],
        ['hlidac', 'Hvězda má 8 bodů, střídavě špičky a vnitřní rohy. Hory si změříš pravítkem.']
      ],
      task: 'Vystřihni **hvězdu**: `polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%)`. Pak **hory** podle katalogu (hřeben má 7 bodů).',
      html: `<div class="obraz">
  <div class="hvezda"></div>
  <div class="hory"></div>
</div>
`,
      starter: `${CANVAS}
  background: linear-gradient(#0b1d3a, #24406b);
}

.hvezda {
  position: absolute;
  left: 130px;
  top: 30px;
  width: 140px;
  height: 140px;
  background: #f4d35e;
}

.hory {
  position: absolute;
  left: 0;
  top: 170px;
  width: 400px;
  height: 130px;
  background: #13233f;
}
`,
      solution: `${CANVAS}
  background: linear-gradient(#0b1d3a, #24406b);
}

.hvezda {
  position: absolute;
  left: 130px;
  top: 30px;
  width: 140px;
  height: 140px;
  background: #f4d35e;
  clip-path: polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%);
}

.hory {
  position: absolute;
  left: 0;
  top: 170px;
  width: 400px;
  height: 130px;
  background: #13233f;
  clip-path: polygon(0 100%, 0 45%, 18% 20%, 34% 55%, 52% 10%, 70% 50%, 86% 30%, 100% 55%, 100% 100%);
}
`,
      bonus: { text: 'Zlatý rám: celé CSS má nejvýš 430 znaků (mezery se nepočítají). Pomůže `inset`.', limit: 430, check: c => c.size <= 430 },
      hints: [
        'Hvězda: do `.hvezda` vlož `clip-path:` s polygonem ze zadání. Procenta se počítají z rozměrů prvku (140 × 140 px).',
        'Hory začínají vlevo dole `0 100%` a končí vpravo dole `100% 100%`. Mezi tím je hřeben: `0 45%, 18% 20%, 34% 55%, 52% 10%, 70% 50%, 86% 30%, 100% 55%`.',
        'Jak to změřit? Hory začínají na y = 170 a jsou vysoké 130 px. Vrchol na y = 183 je (183 − 170) / 130 = 10 % výšky. Na x = 208 je 52 % ze 400.'
      ],
      learn: ['**clip-path: polygon(…)** ořízne prvek podle obrysu. Body se zapisují jako „x y“ oddělené čárkou, v procentech nebo pixelech od levého horního rohu prvku.', '.hvezda {\n  clip-path: polygon(50% 0, 60% 40%, 100% 50%,\n    60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%);\n}'],
      reward: 'Severka svítí nad horami. Bedřich podle ní konečně našel cestu z depozitáře.',
      palette: ['clip-path: polygon(|);', '50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%']
    },
    {
      id: 12, chapter: 3, title: 'Sova Půlnoc', artist: 'Ludmila Rámová', year: 2026, concept: '::before a ::after',
      brief: [
        ['reditelka', 'Poslední obraz je můj. Sova Půlnoc, maskot galerie. Visí u vchodu a ráno ji uvidí každý návštěvník.'],
        ['hlidac', 'Zbylo z ní jen tělo, měsíc a větev. Uši, oči i zobák jsou pryč. Je jí to trochu líto.'],
        ['reditelka', 'Uši nemají vlastní prvky. Udělej je z **pseudoprvků** `.sova::before` a `.sova::after`: dva trojúhelníky na hlavě, trochu natočené. Oči a zobák zvládneš vším, co ses dnes v noci naučil(a).']
      ],
      task: 'Vrať sově **uši** (`::before` a `::after`: trojúhelníky z borderů 22 + 22 px, výška 44 px, natočené o ∓18°), **oči** (bílé kruhy s tmavou zornicí) a oranžový **zobák**.',
      html: `<div class="obraz">
  <div class="mesic"></div>
  <div class="sova">
    <div class="oci"></div>
    <div class="zobak"></div>
  </div>
  <div class="vetev"></div>
</div>
`,
      starter: `${CANVAS}
  background: #22253b;
}

.mesic {
  position: absolute;
  left: 300px;
  top: 30px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f2e3a6;
}

.sova {
  position: absolute;
  left: 120px;
  top: 70px;
  width: 160px;
  height: 190px;
  border-radius: 50% 50% 45% 45%;
  background: radial-gradient(ellipse at 50% 78%, #d9b48f 0 34%, #8a5a3c 35%);
}

/* uši: .sova::before a .sova::after */

.oci {
  position: absolute;
  left: 14px;
  top: 34px;
  width: 132px;
  height: 62px;
}

.zobak {
  position: absolute;
  left: 68px;
  top: 92px;
  width: 24px;
  height: 26px;
}

.vetev {
  position: absolute;
  left: 40px;
  top: 254px;
  width: 320px;
  height: 14px;
  border-radius: 7px;
  background: #5b3a29;
}
`,
      solution: `${CANVAS}
  background: #22253b;
}

.mesic {
  position: absolute;
  left: 300px;
  top: 30px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f2e3a6;
}

.sova {
  position: absolute;
  left: 120px;
  top: 70px;
  width: 160px;
  height: 190px;
  border-radius: 50% 50% 45% 45%;
  background: radial-gradient(ellipse at 50% 78%, #d9b48f 0 34%, #8a5a3c 35%);
}

.sova::before,
.sova::after {
  content: "";
  position: absolute;
  top: -18px;
  width: 0;
  height: 0;
  border-left: 22px solid transparent;
  border-right: 22px solid transparent;
  border-bottom: 44px solid #8a5a3c;
}
.sova::before { left: 6px; transform: rotate(-18deg); }
.sova::after { right: 6px; transform: rotate(18deg); }

.oci {
  position: absolute;
  left: 14px;
  top: 34px;
  width: 132px;
  height: 62px;
  background:
    radial-gradient(circle at 31px 31px, #1b1b1f 0 12px, #ffffff 12px 30px, transparent 30px),
    radial-gradient(circle at 101px 31px, #1b1b1f 0 12px, #ffffff 12px 30px, transparent 30px);
}

.zobak {
  position: absolute;
  left: 68px;
  top: 92px;
  width: 24px;
  height: 26px;
  background: #f4a259;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}

.vetev {
  position: absolute;
  left: 40px;
  top: 254px;
  width: 320px;
  height: 14px;
  border-radius: 7px;
  background: #5b3a29;
}
`,
      bonus: { text: 'Uši jsou z `::before` a `::after` a v HTML nepřibyl žádný prvek.', check: c => c.rules.some(r => /::?before/.test(r.sel)) && c.rules.some(r => /::?after/.test(r.sel)) && c.els.length <= 6 },
      hints: [
        'Uši: `.sova::before, .sova::after { content: ""; position: absolute; top: -18px; width: 0; height: 0; border-left: 22px solid transparent; border-right: 22px solid transparent; border-bottom: 44px solid #8a5a3c; }`. Bez `content` pseudoprvek nevznikne!',
        'Pak je rozmísti a natoč: `.sova::before { left: 6px; transform: rotate(-18deg); }` a `.sova::after { right: 6px; transform: rotate(18deg); }`. Zobák: barva `#f4a259` a `clip-path: polygon(0 0, 100% 0, 50% 100%)`.',
        'Oči jsou dva kruhové přechody v pozadí `.oci`: `radial-gradient(circle at 31px 31px, #1b1b1f 0 12px, #ffffff 12px 30px, transparent 30px)` a druhý stejný s `101px 31px`, oddělené čárkou.'
      ],
      learn: ['**::before** a **::after** jsou dva „prvky navíc“ uvnitř prvku. Vzniknou jen s vlastností `content` a stylují se jako obyčejné prvky. Ideální na ozdoby, které nemají v HTML co dělat.', '.sova::before {\n  content: "";\n  position: absolute;\n  border-bottom: 44px solid #8a5a3c;\n}'],
      reward: 'Sova mrká na první ranní návštěvníky. Ředitelka Rámová: „Výstava je zachráněná. A kdo by to řekl, že se dá malovat kódem.“',
      palette: ['content: "";', '.sova::before {\n  |\n}', 'transform: rotate(|deg);', 'clip-path: polygon(0 0, 100% 0, 50% 100%);', 'radial-gradient(circle at 31px 31px, #1b1b1f 0 12px, #ffffff 12px 30px, transparent 30px)']
    }
  ];

  /* ---------------- vstupní a výstupní test ---------------- */
  const CONCEPTS = {
    tvar: 'Kruh a zakulacení (border-radius)',
    pozice: 'Umístění (position, top, left)',
    vrstvy: 'Vrstvy a pořadí (z-index)',
    ramecek: 'Trojúhelník z okrajů (border)',
    prechod: 'Přechody (gradient)',
    stin: 'Stíny (box-shadow)',
    transformace: 'Transformace (transform)',
    mrizka: 'Mřížka (grid)',
    orez: 'Ořez (clip-path)',
    pseudo: 'Pseudoprvky (::before, ::after)'
  };
  const QUIZ = {
    A: [
      { c: 'tvar', q: 'Jak z čtverce 100 × 100 px udělat kruh?', a: ['border-radius: 50%;', 'border: circle;', 'shape: round;', 'radius: 100px;'], ok: 0, codeAnswers: true, alang: 'css' },
      { c: 'pozice', q: 'Prvek má position: absolute; top: 40px; left: 60px. Kde bude jeho levý horní roh?', a: ['60 px zleva a 40 px shora od předka s position: relative', '40 px zleva a 60 px shora', 'uprostřed stránky', 'tam, kde by byl bez position'], ok: 0 },
      { c: 'vrstvy', q: 'Dva prvky s position: absolute se překrývají a ani jeden nemá z-index. Který je vidět navrchu?', a: ['Ten, který je v HTML později', 'Ten, který je v HTML dřív', 'Ten menší', 'Ten s tmavší barvou'], ok: 0 },
      { c: 'ramecek', q: 'Co vykreslí tento kód?', code: '.x {\n  width: 0;\n  height: 0;\n  border-left: 50px solid transparent;\n  border-right: 50px solid transparent;\n  border-bottom: 80px solid red;\n}', lang: 'css', a: ['Červený trojúhelník se špičkou nahoru', 'Červený čtverec', 'Nic, prvek má nulovou velikost', 'Červenou čáru'], ok: 0 },
      { c: 'prechod', q: 'Co vykreslí background: linear-gradient(red 50%, blue 50%)?', a: ['Horní polovina červená, dolní modrá, s ostrým předělem', 'Fialovou plochu', 'Plynulý přechod přes celou výšku', 'Červené a modré pruhy'], ok: 0 },
      { c: 'stin', q: 'Kolik kopií tvaru navíc nakreslí box-shadow: 10px 0 red, 20px 0 blue?', a: ['Dvě', 'Jednu', 'Tři', 'Žádnou, stín je jen rozmazaný okraj'], ok: 0 },
      { c: 'transformace', q: 'Co udělá transform: rotate(45deg) se čtvercem?', a: ['Otočí ho o 45° kolem jeho středu, vznikne „diamant“', 'Posune ho o 45 px', 'Zkosí ho na kosodélník', 'Otočí ho kolem levého horního rohu stránky'], ok: 0 },
      { c: 'mrizka', q: 'Co udělá grid-template-columns: 1fr 2fr?', a: ['Dva sloupce, druhý je dvakrát širší', 'Dva řádky', 'Tři sloupce', 'Jeden sloupec široký 3 díly'], ok: 0 },
      { c: 'orez', q: 'Jaký tvar dá clip-path: polygon(50% 0, 100% 100%, 0 100%)?', a: ['Trojúhelník se špičkou nahoře uprostřed', 'Čtverec', 'Kruh', 'Trojúhelník se špičkou dole'], ok: 0 },
      { c: 'pseudo', q: 'Proč se .x::before nevykreslí, i když má šířku, výšku a barvu?', a: ['Chybí mu content: ""', 'Pseudoprvky se nevykreslují nikdy', 'Musí mít position: fixed', 'Chybí mu z-index'], ok: 0 }
    ],
    B: [
      { c: 'tvar', q: 'Obdélník 200 × 100 px má border-radius: 50%. Co vznikne?', a: ['Elipsa', 'Kruh o průměru 100 px', 'Obdélník se zakulacenými rohy 50 px', 'Nic se nezmění'], ok: 0 },
      { c: 'pozice', q: 'Co znamená right: 0 u prvku s position: absolute?', a: ['Pravý okraj prvku je na pravém okraji předka', 'Prvek se posune o 0 px doprava, tedy nikam', 'Prvek zmizí', 'Prvek se zarovná na střed'], ok: 0 },
      { c: 'vrstvy', q: 'Prvek A má z-index: 1, prvek B z-index: 5, oba s position: absolute. Který je navrchu?', a: ['B', 'A', 'Ten, který je v HTML později', 'Žádný, z-index nefunguje'], ok: 0 },
      { c: 'ramecek', q: 'Proč má CSS trojúhelník z okrajů width: 0 a height: 0?', a: ['Aby se okraje potkaly v jednom bodě a vznikla špička', 'Aby byl průhledný', 'Aby se vešel na stránku', 'Jinak by okraje nešly obarvit'], ok: 0 },
      { c: 'prechod', q: 'Jak v CSS namalovat opakující se pruhy jedním řádkem?', a: ['repeating-linear-gradient(…)', 'linear-gradient(…) repeat', 'background-stripes: …', 'border-style: striped'], ok: 0, codeAnswers: true, alang: 'css' },
      { c: 'stin', q: 'Co určuje první číslo v box-shadow: 30px 10px #000?', a: ['Posun stínu doprava', 'Posun stínu dolů', 'Rozmazání', 'Velikost stínu'], ok: 0 },
      { c: 'transformace', q: 'Kolem kterého bodu se prvek ve výchozím stavu otáčí?', a: ['Kolem svého středu', 'Kolem levého horního rohu', 'Kolem středu stránky', 'Kolem bodu, kde je myš'], ok: 0 },
      { c: 'mrizka', q: 'Jak roztáhnout pole mřížky přes dva sloupce?', a: ['grid-column: span 2;', 'width: 2;', 'colspan: 2;', 'grid-size: 2;'], ok: 0, codeAnswers: true, alang: 'css' },
      { c: 'orez', q: 'Co znamená bod „0 100%“ v clip-path: polygon(…)?', a: ['Levý dolní roh prvku', 'Pravý horní roh', 'Střed prvku', 'Levý horní roh'], ok: 0 },
      { c: 'pseudo', q: 'Kolik pseudoprvků ::before a ::after může mít jeden prvek?', a: ['Dva: jeden ::before a jeden ::after', 'Neomezeně', 'Žádný, jen obrázky', 'Jeden'], ok: 0 }
    ]
  };

  /* ---------------- jak získat bonus: vysvětlení a ukázka (ukazuje se po pověšení obrazu) ---------------- */
  const BONUS_HELP = {
    1: { how: 'Barvu nemusíš opisovat. Najeď myší v katalogu na slunce a klikni: barva se zkopíruje a v CSS ji vložíš přes Ctrl+V. Z klávesnice: Tab na katalog, šipky a Enter. Stejně fungují i barevná kolečka pod obrazy.' },
    2: { how: 'Všechna tři okna jsou stejně vysoko, takže `top` stačí napsat jednou do společné třídy `.okno`. Okna `.a`, `.b` a `.c` pak mají jen svoje `left`. Kód je kratší a kdybys okna posouval(a) nahoru nebo dolů, změníš jediné číslo.',
      example: '.okno {\n  position: absolute;\n  top: 86px;\n  /* velikost, barva a rámeček */\n}\n\n.a { left: 44px; }\n.b { left: 159px; }\n.c { left: 274px; }' },
    3: { how: 'Prvky se kreslí v pořadí, v jakém jsou v HTML: pozdější je navrchu. Když v souboru index.html přesuneš řádek se stínem až pod měsíc, stín je navrchu i bez `z-index`. V CSS pak `z-index` smaž.',
      example: '<div class="obraz">\n  <div class="mesic"></div>\n  <div class="stin"></div>\n  …\n</div>', lang: 'html' },
    4: { how: 'Barvu, kterou používáš víckrát, si pojmenuj jako proměnnou (začíná dvěma pomlčkami) a pak ji vlož přes `var(…)`. Když ji budeš chtít změnit, stačí to udělat na jednom místě.',
      example: '.obraz {\n  /* … */\n  --hora: #5c7183;\n}\n\n.zadni {\n  border-bottom: 180px solid var(--hora);\n}' },
    5: { how: 'Zlatý rám chce kratší CSS. Moře má čtyři řádky `left`, `top`, `width` a `height`. Totéž řekne jediný řádek `inset`: 182 px shora a 0 zprava, zdola i zleva. Mezery a komentáře se do limitu nepočítají.',
      example: '.more {\n  position: absolute;\n  inset: 182px 0 0;\n  background: linear-gradient(#21405f, #0f2238);\n}' },
    6: { how: 'Kapka nemusí být samostatný prvek. Pozadí může mít víc vrstev oddělených čárkou a první vrstva je navrchu. Kapka je malý kruhový přechod nad vlnami, takže prvek `.kapka` můžeš z HTML smazat.',
      example: '.obraz {\n  /* … */\n  background:\n    radial-gradient(circle at 200px 150px, #e3f4ef 0 9px, transparent 9px),\n    repeating-radial-gradient(circle at 200px 150px, #2a6f6b 0 18px, #4f9c94 18px 26px);\n}' },
    7: { how: 'Okno i ubrus jdou zapsat přes `inset`. `inset: 100px 60px 90px` znamená 100 px shora, 60 px zprava i zleva a 90 px zdola. Ušetříš tím celé řádky `left`, `top`, `width` a `height`.',
      example: '.okno {\n  position: absolute;\n  inset: 100px 60px 90px;\n  background: #2f4858;\n}\n\n.ubrus {\n  position: absolute;\n  inset: 230px 0 0;\n  /* pruhy */\n}' },
    8: { how: 'Všech sedm hvězd je jeden prvek. První hvězda je prvek sám a dalších šest jsou jeho stíny: každý stín je kopie tvaru posunutá o x a y. Nové prvky do HTML nepřidávej.',
      example: '.hvezda {\n  /* první hvězda */\n  box-shadow:\n    64px -26px #ffd56b,\n    120px -6px #ffd56b,\n    176px -38px #ffd56b; /* … */\n}' },
    9: { how: 'Jeden `transform` může mít víc funkcí za sebou a provedou se zprava doleva. `scaleY(0.6) rotate(45deg)` čtverec nejdřív otočí na kosočtverec a pak ho zmáčkne na 60 % výšky. V opačném pořadí vznikne jiný tvar.',
      example: '.kosoctverec {\n  transform: scaleY(0.6) rotate(45deg);\n}' },
    10: { how: 'Rozložení mozaiky jde nakreslit jako mapa. Každý řetězec v `grid-template-areas` je jeden řádek mřížky a stejné písmeno znamená stejné pole. Pole pak jen pojmenuješ přes `grid-area`.',
      example: '.obraz {\n  display: grid;\n  grid-template-areas:\n    "a b b"\n    "a c d"\n    "e f f";\n}\n\n.a { grid-area: a; }\n.b { grid-area: b; }\n/* … */' },
    11: { how: 'Hory zabírají celou spodní část plátna. Místo čtyř řádků `left`, `top`, `width` a `height` stačí `inset: 170px 0 0`, tedy 170 px shora a 0 zprava, zdola i zleva.',
      example: '.hory {\n  position: absolute;\n  inset: 170px 0 0;\n  background: #13233f;\n  clip-path: polygon(/* … */);\n}' },
    12: { how: 'Uši nejsou v HTML. Dělají je pseudoprvky `.sova::before` a `.sova::after`: každý potřebuje `content: ""`, jinak se nevykreslí. Společné vlastnosti napiš jednou pro oba a zvlášť jen polohu a otočení.',
      example: '.sova::before,\n.sova::after {\n  content: "";\n  position: absolute;\n  /* trojúhelník z okrajů */\n}\n.sova::before { left: 6px; transform: rotate(-18deg); }\n.sova::after { right: 6px; transform: rotate(18deg); }' }
  };
  LEVELS.forEach(l => Object.assign(l.bonus, BONUS_HELP[l.id] || {}));

  global.Gallery = { CHAPTERS, WHO, LEVELS, CONCEPTS, QUIZ, fold };
})(typeof window !== 'undefined' ? window : globalThis);
