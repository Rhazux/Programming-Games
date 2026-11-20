/*
 * Async Bistro – obsah hry: úrovně (směny, objednávky, pravidla), nápovědy, kvíz
 *
 * Každá úroveň má:
 *   brief   – zprávy od šéfkuchaře Bohouše (sef) a číšníka Pepy (cisnik)
 *   entry   – funkce, kterou kuchyně volá: obsluz(objednavka) nebo smena(objednavky)
 *   starter – výchozí kód, solution – vzorové řešení (musí získat všechny hvězdy)
 *   shifts  – směny: objednávky { stul, jidlo, limit } a zvláštnosti (spálení v troubě, dodavatel…)
 *   rules   – start (hodina), together (celý stůl najednou), freshWithin (čerstvý lanýž)
 *   bonus   – třetí hvězda: { text, check(ctx) } – ctx.code, ctx.plain (bez řetězců a komentářů), ctx.shifts
 *   wrong   – typické chybné pokusy (automatické testy ověří, že neprojdou)
 */
(function (global) {
  'use strict';

  const CHAPTERS = [
    { id: 1, title: 'Ranní směna', icon: '☕', desc: 'await, posloupnost, objekty, podmínky, cykly' },
    { id: 2, title: 'Polední špička', icon: '🔥', desc: 'Promise.all, map, try/catch, async funkce vrací hodnotu' },
    { id: 3, title: 'Večerní provoz', icon: '🌙', desc: 'Promise.race, fronta s while, řazení, finále' }
  ];

  const playerLogs = s => s.log.filter(l => l[2] === 'log');
  const all = (c, f) => c.shifts.every(f);
  const o = (stul, jidlo, limit) => ({ stul, jidlo, limit });

  /* společné kusy kódu pro výchozí kód */
  const SNIDANE = `async function obsluz(objednavka) {
  if (objednavka.jidlo === 'káva') {
    podej(objednavka, await kavovar());
  } else if (objednavka.jidlo === 'vajíčko') {
    podej(objednavka, await plotna('vajíčko'));
  } else {
    const chleba = await trouba('chléb');
    const syr = await prkenko('sýr');
    podej(objednavka, sloz(chleba, syr));
  }
}`;

  const LEVELS = [
    /* ================= KAPITOLA 1: RANNÍ SMĚNA ================= */
    {
      id: 1, chapter: 1, title: 'Ranní káva', concept: 'await',
      brief: [
        ['sef', 'Vítej v **Async Bistru**! Tady se nevaří postaru: celou kuchyni řídíš kódem v JavaScriptu.'],
        ['sef', 'Každá stanice – kávovar, trouba, plotna – hned vrátí **Promise**: slib, že jídlo bude. Jídlo v ruce máš, až na něj počkáš slovem `await`.'],
        ['cisnik', 'Stůl jedna, jedno espresso! Host spěchá do práce.']
      ],
      task: 'Uvař kávu a podej ji hostovi. Na kávu počkej pomocí `await`, jinak hostovi podáš jen slib (Promise).',
      entry: 'obsluz', rules: { start: 7 }, stations: ['kavovar'],
      starter: `async function obsluz(objednavka) {
  const kava = kavovar();        // kávovar vrací Promise
  podej(objednavka, kava);
}
`,
      solution: `async function obsluz(objednavka) {
  const kava = await kavovar();
  console.log('Káva je hotová:', kava.nazev);
  podej(objednavka, kava);
}
`,
      wrong: [
        `async function obsluz(objednavka) {
  const kava = await kavovar;
  podej(objednavka, kava);
}
`,
        `async function obsluz(objednavka) {
  kavovar();
  podej(objednavka, 'káva');
}
`
      ],
      shifts: [{ name: 'Směna 1', orders: [o(1, 'káva', 4)] }],
      hints: [
        '`kavovar()` hned vrátí Promise – slib, že káva bude. Káva sama tam ještě není.',
        'Napiš před volání slovo `await`: `const kava = await kavovar();`. Funkce pak počká, až je káva hotová.',
        'Pro bonus přidej řádek `console.log(\'Káva hotová\')`. Uvidíš ho v deníku i s časem.'
      ],
      bonus: { text: 'Zapiš do deníku, co se děje: `console.log(…)`', check: c => all(c, s => playerLogs(s).length > 0) },
      learn: ['Funkce stanic vrací Promise – slib budoucí hodnoty. await (jen uvnitř async funkce) počká, až se slib splní, a vrátí hotovou hodnotu.', 'async function obsluz(objednavka) {\n  const kava = await kavovar();\n  podej(objednavka, kava);\n}'],
      palette: ['await ', 'const kava = await kavovar();', "console.log('…');", 'podej(objednavka, kava);'],
      reward: 'Host odchází s kávou a úsměvem. Kávovar ti začíná věřit.'
    },
    {
      id: 2, chapter: 1, title: 'Toust se sýrem', concept: 'postup kroků',
      brief: [
        ['sef', 'Toust je chléb z trouby a sýr z prkénka. Každá surovina má svou stanici a výsledky pak spojíš funkcí `sloz()`.'],
        ['sef', 'Výsledek každého `await` si ulož do proměnné (`const`) a předej ho dál. Takhle teče jídlo kuchyní.'],
        ['cisnik', 'Dvojka chce toust se sýrem. Do šesti minut, prosím!']
      ],
      task: 'Upeč chléb, nakrájej sýr, slož z nich toust `sloz(chleba, syr)` a podej ho. Host čeká nejvýš **6 minut**.',
      entry: 'obsluz', rules: { start: 7 }, stations: ['trouba', 'prkenko'], recipes: ['toust'],
      starter: `async function obsluz(objednavka) {
  const chleba = await trouba('chléb');
  // TODO: nakrájej sýr na prkénku a slož toust: sloz(chleba, syr)
  podej(objednavka, chleba);
}
`,
      solution: `async function obsluz(objednavka) {
  const chleba = await trouba('chléb');
  const syr = await prkenko('sýr');
  const toust = sloz(chleba, syr);
  podej(objednavka, toust);
}
`,
      wrong: [
        `async function obsluz(objednavka) {
  const chleba = await trouba('chléb');
  const syr = prkenko('sýr');
  podej(objednavka, sloz(chleba, syr));
}
`,
        `async function obsluz(objednavka) {
  const chleba = await trouba('chléb');
  const syr = await prkenko('sýr');
  podej(objednavka, syr);
}
`
      ],
      shifts: [{ name: 'Směna 1', orders: [o(2, 'toust', 6)] }],
      hints: [
        'Sýr nakrájíš stejně jako chléb upečeš: `const syr = await prkenko(\'sýr\');`',
        'Hotový toust vznikne ze dvou surovin: `const toust = sloz(chleba, syr);` a ten podej.',
        'Pro bonus používej jen `const` – každá hodnota se tu vytvoří jednou a už se nemění.'
      ],
      bonus: { text: 'Jen `const` – žádné `let` ani `var`', check: c => !/\b(let|var)\b/.test(c.plain) },
      learn: ['Každý await počká na jeden krok. Výsledek si ulož do proměnné a předej dalšímu kroku – tak vzniká postup práce. const vytvoří proměnnou, která se už nemění.', "const chleba = await trouba('chléb');\nconst syr = await prkenko('sýr');\npodej(objednavka, sloz(chleba, syr));"],
      palette: ["const syr = await prkenko('sýr');", 'sloz(chleba, syr)', "await trouba('chléb')", 'podej(objednavka, toust);'],
      reward: 'Křupavý toust, roztečený sýr. Dvojka si objednala ještě jeden.'
    },
    {
      id: 3, chapter: 1, title: 'Snídaňový lístek', concept: 'objekty a if',
      brief: [
        ['cisnik', 'Šéfe, ráno je nával a každý chce něco jiného!'],
        ['sef', 'Objednávka je objekt, třeba `{ stul: 3, jidlo: \'káva\', limit: 4 }`. Co host chce, zjistíš z `objednavka.jidlo` a podle toho se rozhodneš.'],
        ['sef', 'Káva je z kávovaru, vajíčko z plotny (`plotna(\'vajíčko\')`) a toust znáš. Porovnávej třemi rovnítky `===`.']
      ],
      task: 'Podle `objednavka.jidlo` uvař správné jídlo: kávu, vajíčko, nebo toust. Každá ze tří směn přinese jinou objednávku.',
      entry: 'obsluz', rules: { start: 7 }, stations: ['kavovar', 'trouba', 'prkenko', 'plotna'], recipes: ['toust'],
      starter: `async function obsluz(objednavka) {
  // objednavka = { stul: …, jidlo: 'káva' | 'vajíčko' | 'toust', limit: … }
  // TODO: podle objednavka.jidlo uvař správné jídlo
  const chleba = await trouba('chléb');
  const syr = await prkenko('sýr');
  podej(objednavka, sloz(chleba, syr));
}
`,
      solution: `async function obsluz(objednavka) {
  switch (objednavka.jidlo) {
    case 'káva':
      podej(objednavka, await kavovar());
      break;
    case 'vajíčko':
      podej(objednavka, await plotna('vajíčko'));
      break;
    default: {
      const chleba = await trouba('chléb');
      const syr = await prkenko('sýr');
      podej(objednavka, sloz(chleba, syr));
    }
  }
}
`,
      wrong: [
        `async function obsluz(objednavka) {
  if (objednavka === 'káva') {
    podej(objednavka, await kavovar());
  } else {
    const chleba = await trouba('chléb');
    const syr = await prkenko('sýr');
    podej(objednavka, sloz(chleba, syr));
  }
}
`,
        `async function obsluz(objednavka) {
  if (objednavka.jidlo = 'káva') {
    podej(objednavka, await kavovar());
  }
}
`
      ],
      shifts: [
        { name: 'Směna 1', orders: [o(3, 'káva', 3)] },
        { name: 'Směna 2', orders: [o(5, 'vajíčko', 5)] },
        { name: 'Směna 3', orders: [o(1, 'toust', 6)] }
      ],
      hints: [
        'Podmínka: `if (objednavka.jidlo === \'káva\') { … } else if (objednavka.jidlo === \'vajíčko\') { … } else { … }`.',
        'Pozor na jedno `=`: to je přiřazení, ne porovnání. Porovnává se `===`.',
        'Pro bonus zkus `switch (objednavka.jidlo) { case \'káva\': … break; … }` – pro víc možností je přehlednější.'
      ],
      bonus: { text: 'Rozhodni se pomocí `switch`', check: c => /\bswitch\s*\(/.test(c.plain) },
      learn: ['Objekt nese pojmenované hodnoty: objednavka.jidlo, objednavka.stul. if / else if / else vybere jednu cestu, switch je přehlednější varianta pro mnoho možností.', "switch (objednavka.jidlo) {\n  case 'káva':\n    podej(objednavka, await kavovar());\n    break;\n  default:\n    // toust\n}"],
      palette: ["if (objednavka.jidlo === 'káva') {", '} else if (objednavka.jidlo === \'vajíčko\') {', 'switch (objednavka.jidlo) {', "case 'káva':"],
      reward: 'Každý dostal, co chtěl. Pepa už nemusí křičet dvakrát.'
    },
    {
      id: 4, chapter: 1, title: 'Ranní fronta', concept: 'pole a for…of',
      brief: [
        ['cisnik', 'U pultu stojí fronta! Objednávky ti nesu všechny najednou v poli.'],
        ['sef', 'Teď kuchyně volá funkci `smena(objednavky)`, kde `objednavky` je pole. Projdi je cyklem `for (const objednavka of objednavky)` a každou obsluž.'],
        ['sef', 'A pozor: směna končí, jakmile funkce `smena` doběhne. Na každou objednávku proto počkej pomocí `await`.']
      ],
      task: 'Obsluž **všechny** objednávky z pole, jednu po druhé: v cyklu `for…of` volej `await obsluz(objednavka)`.',
      entry: 'smena', rules: { start: 7 }, stations: ['kavovar', 'trouba', 'prkenko', 'plotna'], recipes: ['toust'],
      starter: `${SNIDANE}

async function smena(objednavky) {
  // objednavky = pole objednávek: [{ stul: 1, jidlo: 'káva', limit: 3 }, …]
  await obsluz(objednavky[0]);   // TODO: obsluž všechny, jednu po druhé
}
`,
      solution: `${SNIDANE}

async function smena(objednavky) {
  for (const objednavka of objednavky) {
    console.log(\`Stůl \${objednavka.stul} chce \${objednavka.jidlo}\`);
    await obsluz(objednavka);
  }
}
`,
      wrong: [
        `${SNIDANE}

async function smena(objednavky) {
  objednavky.forEach(objednavka => obsluz(objednavka));
}
`,
        `${SNIDANE}

async function smena(objednavky) {
  for (let i = 1; i < objednavky.length; i++) {
    await obsluz(objednavky[i]);
  }
}
`
      ],
      shifts: [
        { name: 'Směna 1', orders: [o(1, 'káva', 3), o(2, 'toust', 9), o(3, 'káva', 12), o(4, 'vajíčko', 16)] },
        { name: 'Směna 2', orders: [o(6, 'vajíčko', 5), o(2, 'káva', 8), o(3, 'toust', 14), o(7, 'toust', 20), o(1, 'káva', 24)] }
      ],
      hints: [
        'Cyklus: `for (const objednavka of objednavky) { … }` projde všechny prvky pole od prvního do posledního.',
        'V těle cyklu napiš `await obsluz(objednavka);`. Bez `await` by funkce `smena` skončila hned a stoly by nic nedostaly.',
        'Pro bonus vypisuj šablonovým řetězcem: `console.log(`Stůl ${objednavka.stul} chce ${objednavka.jidlo}`)` – pozor na zpětné apostrofy.'
      ],
      bonus: { text: 'Šablonový řetězec v deníku: console.log(`Stůl ${…}`)', check: c => /`[^`]*\$\{/.test(c.code) && all(c, s => playerLogs(s).length > 0) },
      learn: ['for…of projde pole prvek po prvku. Když je v těle await, další objednávka začne až po té předchozí. Šablonový řetězec v `…` vloží hodnoty přes ${…}.', 'for (const objednavka of objednavky) {\n  console.log(`Stůl ${objednavka.stul}`);\n  await obsluz(objednavka);\n}'],
      palette: ['for (const objednavka of objednavky) {', 'await obsluz(objednavka);', 'console.log(`Stůl ${objednavka.stul}`);', 'objednavky.length'],
      reward: 'Fronta je pryč. Ranní směna přežila bez jediné stížnosti.'
    },

    /* ================= KAPITOLA 2: POLEDNÍ ŠPIČKA ================= */
    {
      id: 5, chapter: 2, title: 'Dvě plotny', concept: 'Promise.all',
      brief: [
        ['sef', 'Poledne! Špagety jsou těstoviny a omáčka. Když je vaříš po sobě, trvá to 14 minut. Ale máme **dvě plotny**!'],
        ['sef', '`Promise.all([plotna(\'těstoviny\'), plotna(\'omáčka\')])` spustí obojí najednou a počká, až je hotové všechno. Výsledky dostaneš v poli ve stejném pořadí.'],
        ['cisnik', 'Čtyřka chce špagety do 9 minut a dvojka burger do 6. Fofrem!']
      ],
      task: 'Vař suroviny **souběžně** pomocí `Promise.all`. Špagety musí být hotové do 9 minut, burger (maso, houska, salát) do 6.',
      entry: 'obsluz', rules: { start: 12 }, stations: ['plotna', 'friteza', 'trouba', 'prkenko'], recipes: ['špagety', 'burger'],
      starter: `async function obsluz(objednavka) {
  if (objednavka.jidlo === 'špagety') {
    const testoviny = await plotna('těstoviny');   // 8 min
    const omacka = await plotna('omáčka');         // 6 min
    podej(objednavka, sloz(testoviny, omacka));
  } else {
    const maso = await friteza('maso');            // 5 min
    const houska = await trouba('houska');         // 3 min
    const salat = await prkenko('salát');          // 2 min
    podej(objednavka, sloz(maso, houska, salat));
  }
}
`,
      solution: `async function obsluz(objednavka) {
  if (objednavka.jidlo === 'špagety') {
    const [testoviny, omacka] = await Promise.all([plotna('těstoviny'), plotna('omáčka')]);
    podej(objednavka, sloz(testoviny, omacka));
  } else {
    const [maso, houska, salat] = await Promise.all([friteza('maso'), trouba('houska'), prkenko('salát')]);
    podej(objednavka, sloz(maso, houska, salat));
  }
}
`,
      wrong: [
        `async function obsluz(objednavka) {
  if (objednavka.jidlo === 'špagety') {
    const [testoviny, omacka] = Promise.all([plotna('těstoviny'), plotna('omáčka')]);
    podej(objednavka, sloz(testoviny, omacka));
  }
}
`,
        `async function obsluz(objednavka) {
  if (objednavka.jidlo === 'špagety') {
    const [testoviny, omacka] = await Promise.all([plotna('těstoviny'), plotna('omáčka')]);
    podej(objednavka, sloz(testoviny, omacka));
  } else {
    const maso = await friteza('maso');
    const [houska, salat] = await Promise.all([trouba('houska'), prkenko('salát')]);
    podej(objednavka, sloz(maso, houska, salat));
  }
}
`
      ],
      shifts: [
        { name: 'Směna 1', orders: [o(4, 'špagety', 9)] },
        { name: 'Směna 2', orders: [o(2, 'burger', 6)] }
      ],
      hints: [
        '`Promise.all([a, b])` spustí obě stanice najednou a vrátí jeden slib, který se splní, až jsou hotové obě.',
        'Výsledek je pole, rozbal ho rovnou: `const [testoviny, omacka] = await Promise.all([plotna(\'těstoviny\'), plotna(\'omáčka\')]);`',
        'Burger stejně, jen se třemi stanicemi: fritéza, trouba a prkénko běží současně.'
      ],
      bonus: { text: 'Rozbal výsledek: `const [a, b] = await Promise.all(…)`', check: c => /const\s*\[[^\]]+\]\s*=\s*await\s+Promise\.all\s*\(/.test(c.plain) },
      learn: ['Promise.all([…]) čeká na víc slibů najednou. Práce běží souběžně, takže to trvá jen tak dlouho jako ta nejpomalejší. Výsledky přijdou v poli ve stejném pořadí.', "const [testoviny, omacka] = await Promise.all([\n  plotna('těstoviny'),\n  plotna('omáčka')\n]);"],
      palette: ['await Promise.all([|])', "const [testoviny, omacka] = await Promise.all([plotna('těstoviny'), plotna('omáčka')]);", "friteza('maso')", "trouba('houska')"],
      reward: 'Dvě plotny, jedna myšlenka. Špagety za 8 minut místo 14!'
    },
    {
      id: 6, chapter: 2, title: 'Plný stůl', concept: 'map + Promise.all',
      brief: [
        ['cisnik', 'Šéfe, sedmička je skupina. Pět objednávek naráz a všichni mají hlad!'],
        ['sef', 'Když je obsloužíš jednu po druhé, poslední host bude čekat věčnost. Spusť **všechny objednávky najednou**: `objednavky.map(o => obsluz(o))` udělá pole slibů a `Promise.all` na ně počká.'],
        ['sef', 'Kuchyně si poradí sama: když je stanice obsazená, další práce počká ve frontě. Nový recept: bruschetta je chléb z trouby a rajče z prkénka.']
      ],
      task: 'Obsluž všechny objednávky **souběžně**: `await Promise.all(objednavky.map(o => obsluz(o)))`. Doplň i recept na bruschettu. Každá objednávka má limit 9 minut.',
      entry: 'smena', rules: { start: 12 }, stations: ['kavovar', 'trouba', 'prkenko', 'plotna'], recipes: ['toust', 'bruschetta'],
      starter: `async function obsluz(objednavka) {
  if (objednavka.jidlo === 'káva') {
    podej(objednavka, await kavovar());
  } else if (objednavka.jidlo === 'polévka') {
    podej(objednavka, await plotna('polévka'));
  } else if (objednavka.jidlo === 'vajíčko') {
    podej(objednavka, await plotna('vajíčko'));
  } else {
    // toust (TODO: bruschetta = chléb z trouby + rajče z prkénka)
    const [chleba, syr] = await Promise.all([trouba('chléb'), prkenko('sýr')]);
    podej(objednavka, sloz(chleba, syr));
  }
}

async function smena(objednavky) {
  for (const objednavka of objednavky) {
    await obsluz(objednavka);      // jedna po druhé – moc pomalé!
  }
}
`,
      solution: `async function obsluz(objednavka) {
  if (objednavka.jidlo === 'káva') {
    podej(objednavka, await kavovar());
  } else if (objednavka.jidlo === 'polévka') {
    podej(objednavka, await plotna('polévka'));
  } else if (objednavka.jidlo === 'vajíčko') {
    podej(objednavka, await plotna('vajíčko'));
  } else {
    const druha = objednavka.jidlo === 'toust' ? 'sýr' : 'rajče';
    const [chleba, priloha] = await Promise.all([trouba('chléb'), prkenko(druha)]);
    podej(objednavka, sloz(chleba, priloha));
  }
}

async function smena(objednavky) {
  await Promise.all(objednavky.map(o => obsluz(o)));
}
`,
      wrong: [
        `async function obsluz(objednavka) {
  if (objednavka.jidlo === 'káva') {
    podej(objednavka, await kavovar());
  } else if (objednavka.jidlo === 'polévka') {
    podej(objednavka, await plotna('polévka'));
  } else if (objednavka.jidlo === 'vajíčko') {
    podej(objednavka, await plotna('vajíčko'));
  } else {
    const druha = objednavka.jidlo === 'toust' ? 'sýr' : 'rajče';
    const [chleba, priloha] = await Promise.all([trouba('chléb'), prkenko(druha)]);
    podej(objednavka, sloz(chleba, priloha));
  }
}

async function smena(objednavky) {
  objednavky.map(o => obsluz(o));
}
`,
        `async function obsluz(objednavka) {
  if (objednavka.jidlo === 'káva') {
    podej(objednavka, await kavovar());
  } else if (objednavka.jidlo === 'polévka') {
    podej(objednavka, await plotna('polévka'));
  } else {
    const [chleba, syr] = await Promise.all([trouba('chléb'), prkenko('sýr')]);
    podej(objednavka, sloz(chleba, syr));
  }
}

async function smena(objednavky) {
  await Promise.all(objednavky.map(o => obsluz(o)));
}
`
      ],
      shifts: [
        { name: 'Směna 1', orders: [o(7, 'káva', 9), o(7, 'polévka', 9), o(7, 'toust', 9), o(7, 'káva', 9)] },
        { name: 'Směna 2', orders: [o(3, 'vajíčko', 9), o(3, 'toust', 9), o(3, 'bruschetta', 9), o(3, 'káva', 9), o(3, 'polévka', 9)] }
      ],
      hints: [
        '`objednavky.map(o => obsluz(o))` zavolá `obsluz` pro každou objednávku a vrátí pole slibů. Všechny se začnou vařit hned.',
        'Na pole slibů počkej: `await Promise.all(objednavky.map(o => obsluz(o)));`. Bez `await` by směna skončila dřív, než se dovaří.',
        'Bruschetta je jako toust, jen místo sýra nakrájíš rajče: `prkenko(\'rajče\')`.'
      ],
      bonus: { text: 'Bez cyklu `for` – jen `map()`', check: c => /\.map\s*\(/.test(c.plain) && !/\bfor\s*\(/.test(c.plain) },
      learn: ['pole.map(f) vytvoří nové pole: pro každý prvek zavolá f. U async funkce vznikne pole slibů, na které počkáš přes Promise.all. Stanice si vytvoří frontu samy.', 'await Promise.all(\n  objednavky.map(o => obsluz(o))\n);'],
      palette: ['objednavky.map(o => obsluz(o))', 'await Promise.all(|)', "prkenko('rajče')", "objednavka.jidlo === 'bruschetta'"],
      reward: 'Celý stůl jí najednou. Kuchyně jede na plný výkon a nic nestojí.'
    },
    {
      id: 7, chapter: 2, title: 'Spálená pizza', concept: 'try / catch',
      brief: [
        ['sef', 'Naše stará trouba občas pizzu spálí. Slib se pak nesplní, ale **skončí chybou** a ta ti shodí celou směnu.'],
        ['sef', 'Chybu chytíš pomocí `try { … } catch (chyba) { … }`. Když se pizza spálí, upeč ji znovu. A klidně i potřetí – trouba je nevyzpytatelná.'],
        ['cisnik', 'Šéfe, z kuchyně je cítit spálenina…']
      ],
      task: 'Upeč pizzy pro všechny objednávky. Když trouba vyhodí chybu (spálená pizza), chyť ji a peč znovu, dokud se nepovede.',
      entry: 'smena', rules: { start: 12 }, stations: ['trouba'], recipes: [],
      starter: `async function obsluz(objednavka) {
  const pizza = await trouba('pizza');    // může skončit chybou!
  podej(objednavka, pizza);
}

async function smena(objednavky) {
  for (const objednavka of objednavky) {
    await obsluz(objednavka);
  }
}
`,
      solution: `async function upecPizzu() {
  while (true) {
    try {
      return await trouba('pizza');
    } catch (chyba) {
      console.log('Znovu do trouby:', chyba.message);
    }
  }
}

async function obsluz(objednavka) {
  podej(objednavka, await upecPizzu());
}

async function smena(objednavky) {
  for (const objednavka of objednavky) {
    await obsluz(objednavka);
  }
}
`,
      wrong: [
        `async function obsluz(objednavka) {
  let pizza;
  try {
    pizza = await trouba('pizza');
  } catch (chyba) {
    pizza = await trouba('pizza');
  }
  podej(objednavka, pizza);
}

async function smena(objednavky) {
  for (const objednavka of objednavky) {
    await obsluz(objednavka);
  }
}
`,
        `async function obsluz(objednavka) {
  try {
    podej(objednavka, await trouba('pizza'));
  } catch (chyba) {
    console.log(chyba.message);
  }
}

async function smena(objednavky) {
  for (const objednavka of objednavky) {
    await obsluz(objednavka);
  }
}
`
      ],
      shifts: [
        { name: 'Směna 1', burn: [1], orders: [o(1, 'pizza', 15)] },
        { name: 'Směna 2', burn: [1, 2], orders: [o(4, 'pizza', 22)] },
        { name: 'Směna 3', burn: [2], orders: [o(2, 'pizza', 8), o(5, 'pizza', 22)] }
      ],
      hints: [
        'Kód, který může selhat, dej do `try { … }`. Když selže, provede se `catch (chyba) { … }` a program jede dál.',
        'Opakuj, dokud se nepovede: `while (true) { try { return await trouba(\'pizza\'); } catch (chyba) { … } }` – `return` cyklus ukončí.',
        'Pro bonus v `catch` vypiš `console.log(chyba.message)`. V deníku uvidíš, co se pokazilo.'
      ],
      bonus: { text: 'Zapiš chybu do deníku: `console.log(chyba.message)`', check: c => all(c, s => !s.burnt || playerLogs(s).some(l => /spálil/.test(l[1]))) },
      learn: ['Když slib skončí chybou, await ji vyhodí jako výjimku. try { … } catch (chyba) { … } ji zachytí a program pokračuje; chyba.message obsahuje popis. Ve smyčce můžeš akci zkusit znovu.', "while (true) {\n  try {\n    return await trouba('pizza');\n  } catch (chyba) {\n    console.log(chyba.message);\n  }\n}"],
      palette: ['try {', '} catch (chyba) {', 'while (true) {', "return await trouba('pizza');"],
      reward: 'Spálené pizzy skončily v koši, hosté dostali dokonalé. Nikdo nic nepoznal.'
    },
    {
      id: 8, chapter: 2, title: 'Stůl pro čtyři', concept: 'async vrací hodnotu',
      brief: [
        ['cisnik', 'Šéfe, osmička je oslava a chce **jíst všichni najednou**. Kdo dostane jídlo dřív, tomu vystydne.'],
        ['sef', 'Rozděl práci na dvě části: funkce `priprav(objednavka)` jídlo jen uvaří a **vrátí** ho (`return`). Podávat se bude až potom, všem naráz.'],
        ['sef', '`await Promise.all(objednavky.map(priprav))` ti vrátí pole hotových jídel ve stejném pořadí jako objednávky.']
      ],
      task: 'Napiš `async function priprav(objednavka)`, která jídlo uvaří a vrátí. Ve `smena` nejdřív připrav všechno a pak všem podej **ve stejnou chvíli**.',
      entry: 'smena', rules: { start: 12, together: true }, stations: ['friteza', 'trouba', 'prkenko', 'plotna', 'kavovar'], recipes: ['burger', 'špagety', 'toust'],
      starter: `async function priprav(objednavka) {
  // TODO: uvař jídlo a VRAŤ ho (return), nepodávej ho tady
}

async function obsluz(objednavka) {
  if (objednavka.jidlo === 'burger') {
    const [maso, houska, salat] = await Promise.all([friteza('maso'), trouba('houska'), prkenko('salát')]);
    podej(objednavka, sloz(maso, houska, salat));
  } else if (objednavka.jidlo === 'špagety') {
    const [testoviny, omacka] = await Promise.all([plotna('těstoviny'), plotna('omáčka')]);
    podej(objednavka, sloz(testoviny, omacka));
  } else if (objednavka.jidlo === 'hranolky') {
    podej(objednavka, await friteza('hranolky'));
  } else {
    podej(objednavka, await kavovar());
  }
}

async function smena(objednavky) {
  await Promise.all(objednavky.map(o => obsluz(o)));
}
`,
      solution: `async function priprav(objednavka) {
  if (objednavka.jidlo === 'burger') {
    const [maso, houska, salat] = await Promise.all([friteza('maso'), trouba('houska'), prkenko('salát')]);
    return sloz(maso, houska, salat);
  } else if (objednavka.jidlo === 'špagety') {
    const [testoviny, omacka] = await Promise.all([plotna('těstoviny'), plotna('omáčka')]);
    return sloz(testoviny, omacka);
  } else if (objednavka.jidlo === 'hranolky') {
    return await friteza('hranolky');
  } else {
    return await kavovar();
  }
}

async function smena(objednavky) {
  const jidla = await Promise.all(objednavky.map(priprav));
  objednavky.forEach((objednavka, i) => podej(objednavka, jidla[i]));
}
`,
      wrong: [
        `async function priprav(objednavka) {
  if (objednavka.jidlo === 'burger') {
    const [maso, houska, salat] = await Promise.all([friteza('maso'), trouba('houska'), prkenko('salát')]);
    sloz(maso, houska, salat);
  } else if (objednavka.jidlo === 'špagety') {
    const [testoviny, omacka] = await Promise.all([plotna('těstoviny'), plotna('omáčka')]);
    sloz(testoviny, omacka);
  } else if (objednavka.jidlo === 'hranolky') {
    await friteza('hranolky');
  } else {
    await kavovar();
  }
}

async function smena(objednavky) {
  const jidla = await Promise.all(objednavky.map(priprav));
  objednavky.forEach((objednavka, i) => podej(objednavka, jidla[i]));
}
`,
        `async function priprav(objednavka) {
  if (objednavka.jidlo === 'burger') {
    const [maso, houska, salat] = await Promise.all([friteza('maso'), trouba('houska'), prkenko('salát')]);
    return sloz(maso, houska, salat);
  } else if (objednavka.jidlo === 'špagety') {
    const [testoviny, omacka] = await Promise.all([plotna('těstoviny'), plotna('omáčka')]);
    return sloz(testoviny, omacka);
  } else if (objednavka.jidlo === 'hranolky') {
    return await friteza('hranolky');
  } else {
    return await kavovar();
  }
}

async function smena(objednavky) {
  for (const objednavka of objednavky) {
    podej(objednavka, await priprav(objednavka));
  }
}
`
      ],
      shifts: [
        { name: 'Směna 1', orders: [o(8, 'burger', 12), o(8, 'hranolky', 12)] },
        { name: 'Směna 2', orders: [o(8, 'špagety', 14), o(8, 'burger', 14), o(8, 'káva', 14)] },
        { name: 'Směna 3', orders: [o(8, 'burger', 18), o(8, 'burger', 18), o(8, 'hranolky', 18), o(8, 'špagety', 18)] }
      ],
      hints: [
        'Přesuň vaření z `obsluz` do `priprav` a místo `podej(objednavka, …)` napiš `return …`. Async funkce pak vrací slib hotového jídla.',
        '`const jidla = await Promise.all(objednavky.map(priprav));` – pole jídel ve stejném pořadí jako objednávky.',
        'Nakonec všem podej v cyklu bez čekání: `objednavky.forEach((objednavka, i) => podej(objednavka, jidla[i]));`'
      ],
      bonus: { text: 'Podávej ve `forEach` s indexem: `(objednavka, i) => …`', check: c => /\.forEach\s*\(\s*\(\s*\w+\s*,\s*\w+\s*\)\s*=>/.test(c.plain) },
      learn: ['async funkce může hodnotu vrátit příkazem return – kdo ji zavolá s await, dostane hotový výsledek. Promise.all vrátí pole výsledků ve stejném pořadí, v jakém byly sliby.', 'const jidla = await Promise.all(objednavky.map(priprav));\nobjednavky.forEach((objednavka, i) => {\n  podej(objednavka, jidla[i]);\n});'],
      palette: ['return sloz(maso, houska, salat);', 'const jidla = await Promise.all(objednavky.map(priprav));', 'objednavky.forEach((objednavka, i) => podej(objednavka, jidla[i]));', 'return await kavovar();'],
      reward: 'Talíře přistály na stole ve stejné vteřině. Oslavenec tleská!'
    },

    /* ================= KAPITOLA 3: VEČERNÍ PROVOZ ================= */
    {
      id: 9, chapter: 3, title: 'Lanýž na cestě', concept: 'Promise.race',
      brief: [
        ['sef', 'Večer vaříme rizoto s lanýžem: rýže z plotny a lanýž, který veze dodavatel. Jenže dodavatel jezdí, jak se mu zachce.'],
        ['sef', 'Pravidlo podniku: když lanýž dorazí **do 3 minut**, musí být čerstvý. Když ne, vezmi mražený ze zásoby – host nesmí čekat.'],
        ['sef', '`Promise.race([…])` vrátí výsledek toho slibu, který skončí **první**. Závod mezi dodavatelem a časovačem `cekej(3)` je přesně ono.']
      ],
      task: 'Rýži vař souběžně s čekáním na lanýž. Lanýž ber od `dodavatel(\'lanýž\')`, ale když nedorazí do 3 minut, použij `zasoba(\'lanýž\')`. Rizoto musí být na stole do 7 minut.',
      entry: 'obsluz', rules: { start: 18, freshWithin: 3 }, stations: ['plotna', 'dodavatel'], recipes: ['rizoto'],
      starter: `async function obsluz(objednavka) {
  const ryze = await plotna('rýže');               // 6 min
  const lanyz = await dodavatel('lanýž');          // kdo ví, jak dlouho…
  // náhrada: zasoba('lanýž') vrátí mražený lanýž hned
  // časovač: cekej(3) se splní za 3 minuty
  podej(objednavka, sloz(ryze, lanyz));
}
`,
      solution: `function sLimitem(slib, minuty, nahrada) {
  return Promise.race([slib, cekej(minuty).then(nahrada)]);
}

async function obsluz(objednavka) {
  const [ryze, lanyz] = await Promise.all([
    plotna('rýže'),
    sLimitem(dodavatel('lanýž'), 3, () => zasoba('lanýž'))
  ]);
  console.log('Lanýž je', lanyz.z === 'dodavatel' ? 'čerstvý' : 'mražený');
  podej(objednavka, sloz(ryze, lanyz));
}
`,
      wrong: [
        `async function obsluz(objednavka) {
  const ryze = await plotna('rýže');
  podej(objednavka, sloz(ryze, zasoba('lanýž')));
}
`,
        `async function obsluz(objednavka) {
  const [ryze, lanyz] = await Promise.all([plotna('rýže'), dodavatel('lanýž')]);
  podej(objednavka, sloz(ryze, lanyz));
}
`
      ],
      shifts: [
        { name: 'Směna 1', supplier: { 'lanýž': 2 }, stock: ['lanýž'], orders: [o(1, 'rizoto', 7)] },
        { name: 'Směna 2', supplier: { 'lanýž': 12 }, stock: ['lanýž'], orders: [o(6, 'rizoto', 7)] },
        { name: 'Směna 3', supplier: { 'lanýž': 5 }, stock: ['lanýž'], orders: [o(3, 'rizoto', 7)] }
      ],
      hints: [
        'Časovač s náhradou: `cekej(3).then(() => zasoba(\'lanýž\'))` – za 3 minuty se splní mraženým lanýžem.',
        'Závod: `const lanyz = await Promise.race([dodavatel(\'lanýž\'), cekej(3).then(() => zasoba(\'lanýž\'))]);` – vyhraje, kdo je dřív.',
        'Rýži vař zároveň: obal oboje do `Promise.all([plotna(\'rýže\'), …závod…])`. Pro bonus si závod schovej do vlastní funkce, třeba `sLimitem(slib, minuty, nahrada)`.'
      ],
      bonus: {
        text: 'Závod schovej do vlastní funkce (např. `sLimitem`) a zavolej ji',
        check: c => {
          const names = [...c.plain.matchAll(/(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)/g)].map(m => m[1] || m[2]).filter(n => n && n !== 'obsluz' && n !== 'smena');
          return /Promise\.race/.test(c.plain) && names.some(n => (c.plain.match(new RegExp(`\\b${n}\\s*\\(`, 'g')) || []).length >= 2);
        }
      },
      learn: ['Promise.race([…]) se splní výsledkem slibu, který doběhne první. Se slibem časovače tak uděláš limit: když se práce nestihne, vyhraje náhrada. .then(f) zavolá f, až se slib splní.', "const lanyz = await Promise.race([\n  dodavatel('lanýž'),\n  cekej(3).then(() => zasoba('lanýž'))\n]);"],
      palette: ['Promise.race([|])', "cekej(3).then(() => zasoba('lanýž'))", "dodavatel('lanýž')", "await Promise.all([plotna('rýže'), |])"],
      reward: 'Čerstvý, když to jde, mražený, když to hoří. Hosté nečekali ani minutu navíc.'
    },
    {
      id: 10, chapter: 3, title: 'Rozvoz', concept: 'fronta a while',
      brief: [
        ['cisnik', 'Šéfe, objednávky z aplikace! Musíme je rozvézt.'],
        ['sef', 'Máme jen **dva kurýry**. `rozvez(objednavka, jidlo)` trvá 5 minut a když jsou oba na cestě, vyhodí chybu „Žádný volný kurýr“.'],
        ['sef', 'Udělej si frontu a dva pracovníky. Každý pracovník si v cyklu `while` bere další objednávku (`fronta.shift()`), uvaří ji a rozveze. Oba pusť najednou přes `Promise.all`.']
      ],
      task: 'Rozvez všechny objednávky včas. Nikdy neposílej víc rozvozů najednou, než máš kurýrů: dva pracovníci berou objednávky z fronty, dokud není prázdná.',
      entry: 'smena', rules: { start: 18 }, stations: ['plotna', 'trouba', 'kuryr'], recipes: [],
      starter: `async function doruc(objednavka) {
  const jidlo = objednavka.jidlo === 'pizza' ? await trouba('pizza') : await plotna('polévka');
  await rozvez(objednavka, jidlo);           // 5 min, kurýři jsou jen dva!
}

async function smena(objednavky) {
  for (const objednavka of objednavky) {
    await doruc(objednavka);                 // jedna po druhé – moc pomalé
  }
}
`,
      solution: `async function doruc(objednavka) {
  const jidlo = objednavka.jidlo === 'pizza' ? await trouba('pizza') : await plotna('polévka');
  await rozvez(objednavka, jidlo);
}

async function smena(objednavky) {
  const fronta = [...objednavky];
  async function pracovnik() {
    while (fronta.length > 0) {
      const objednavka = fronta.shift();
      await doruc(objednavka);
    }
  }
  await Promise.all([pracovnik(), pracovnik()]);
}
`,
      wrong: [
        `async function doruc(objednavka) {
  const jidlo = objednavka.jidlo === 'pizza' ? await trouba('pizza') : await plotna('polévka');
  await rozvez(objednavka, jidlo);
}

async function smena(objednavky) {
  await Promise.all(objednavky.map(doruc));
}
`,
        `async function doruc(objednavka) {
  const jidlo = objednavka.jidlo === 'pizza' ? await trouba('pizza') : await plotna('polévka');
  await rozvez(objednavka, jidlo);
}

async function smena(objednavky) {
  const fronta = [...objednavky];
  async function pracovnik() {
    if (fronta.length > 0) {
      await doruc(fronta.shift());
    }
  }
  await Promise.all([pracovnik(), pracovnik()]);
}
`
      ],
      shifts: [
        { name: 'Směna 1', orders: [o(11, 'polévka', 11), o(12, 'polévka', 11), o(13, 'polévka', 21), o(14, 'polévka', 21), o(15, 'polévka', 31), o(16, 'polévka', 31)] },
        { name: 'Směna 2', orders: [o(21, 'pizza', 13), o(22, 'polévka', 11), o(23, 'polévka', 23), o(24, 'pizza', 28), o(25, 'polévka', 30)] }
      ],
      hints: [
        'Kopie pole jako fronta: `const fronta = [...objednavky];` a další objednávku vytáhneš `fronta.shift()`.',
        'Pracovník: `async function pracovnik() { while (fronta.length > 0) { await doruc(fronta.shift()); } }` – dělá, dokud fronta není prázdná.',
        'Pusť dva pracovníky najednou a počkej na oba: `await Promise.all([pracovnik(), pracovnik()]);`'
      ],
      bonus: { text: 'Ani jednou neodmítnutý kurýr', check: c => all(c, s => s.rejected === 0) },
      learn: ['Fronta je pole, ze kterého bereš zepředu: fronta.shift(). Cyklus while běží, dokud platí podmínka. Dva async „pracovníci“ nad stejnou frontou omezí, kolik věcí běží najednou.', 'const fronta = [...objednavky];\nasync function pracovnik() {\n  while (fronta.length > 0) {\n    await doruc(fronta.shift());\n  }\n}\nawait Promise.all([pracovnik(), pracovnik()]);'],
      palette: ['const fronta = [...objednavky];', 'while (fronta.length > 0) {', 'fronta.shift()', 'await Promise.all([pracovnik(), pracovnik()]);'],
      reward: 'Kurýři jezdí jako hodinky – žádný nestojí, žádný se nepřetrhne.'
    },
    {
      id: 11, chapter: 3, title: 'Kdo spěchá', concept: 'řazení pole',
      brief: [
        ['cisnik', 'Šéfe, lidi u stolů mají různě času. Paní u devítky odchází do divadla!'],
        ['sef', 'Pizza i koláč jdou do **jedné trouby** a ta peče jednu věc po druhé, v tom pořadí, v jakém je zadáš. Paralelismus ti tady nepomůže – rozhoduje **pořadí**.'],
        ['sef', 'Seřaď objednávky podle limitu: `objednavky.sort((a, b) => a.limit - b.limit)`. Kdo spěchá nejvíc, jde první.']
      ],
      task: 'Upeč všechno tak, aby každý host dostal jídlo do svého limitu. Objednávky přicházejí neseřazené – seřaď je podle `limit` (nejmenší první).',
      entry: 'smena', rules: { start: 18 }, stations: ['trouba'], recipes: [],
      starter: `async function obsluz(objednavka) {
  const jidlo = await trouba(objednavka.jidlo);   // pizza 7 min, koláč 8 min
  podej(objednavka, jidlo);
}

async function smena(objednavky) {
  // TODO: kdo má nejmenší limit, musí přijít na řadu první
  for (const objednavka of objednavky) {
    await obsluz(objednavka);
  }
}
`,
      solution: `async function obsluz(objednavka) {
  const jidlo = await trouba(objednavka.jidlo);
  podej(objednavka, jidlo);
}

async function smena(objednavky) {
  const poradi = [...objednavky].sort((a, b) => a.limit - b.limit);
  for (const objednavka of poradi) {
    await obsluz(objednavka);
  }
}
`,
      wrong: [
        `async function obsluz(objednavka) {
  const jidlo = await trouba(objednavka.jidlo);
  podej(objednavka, jidlo);
}

async function smena(objednavky) {
  const poradi = [...objednavky].sort((a, b) => b.limit - a.limit);
  for (const objednavka of poradi) {
    await obsluz(objednavka);
  }
}
`,
        `async function obsluz(objednavka) {
  const jidlo = await trouba(objednavka.jidlo);
  podej(objednavka, jidlo);
}

async function smena(objednavky) {
  const poradi = [...objednavky].sort();
  for (const objednavka of poradi) {
    await obsluz(objednavka);
  }
}
`
      ],
      shifts: [
        { name: 'Směna 1', orders: [o(4, 'koláč', 30), o(9, 'pizza', 7), o(2, 'pizza', 15)] },
        { name: 'Směna 2', orders: [o(5, 'pizza', 40), o(1, 'koláč', 16), o(8, 'pizza', 23), o(3, 'koláč', 8)] },
        { name: 'Směna 3', orders: [o(6, 'pizza', 22), o(7, 'pizza', 29), o(2, 'koláč', 15), o(9, 'pizza', 7)] }
      ],
      hints: [
        '`pole.sort(porovnej)` seřadí pole. Porovnávací funkce vrací záporné číslo, když má `a` jít před `b`.',
        '`(a, b) => a.limit - b.limit` seřadí od nejmenšího limitu. Obráceně (`b.limit - a.limit`) by šli první ti, co mají nejvíc času.',
        'Pro bonus netřiď pole, které jsi dostal(a) – seřaď kopii: `[...objednavky].sort(…)`.'
      ],
      bonus: { text: 'Seřaď kopii pole: `[...objednavky].sort(…)`', check: c => /\[\s*\.\.\.\s*objednavky\s*\]\s*\.sort\s*\(|objednavky\s*\.\s*slice\s*\(\s*\)\s*\.sort\s*\(/.test(c.plain) },
      learn: ['sort(porovnej) seřadí pole na místě. Porovnávací funkce (a, b) => a.limit - b.limit dá dopředu menší čísla. Bez ní by sort řadil jako text. [...pole] vytvoří kopii, takže původní pole zůstane netknuté.', 'const poradi = [...objednavky]\n  .sort((a, b) => a.limit - b.limit);'],
      palette: ['objednavky.sort((a, b) => a.limit - b.limit)', '[...objednavky]', 'const poradi = ', 'for (const objednavka of poradi) {'],
      reward: 'Paní od devítky stihla divadlo. A dezert si dala o přestávce.'
    },
    {
      id: 12, chapter: 3, title: 'Gastrokritik', concept: 'vše dohromady',
      brief: [
        ['cisnik', 'Šéfe! U pětky sedí **gastrokritik**. Objednal si celou degustaci a s ním plný sál.'],
        ['sef', 'Všechno, co umíš: vař souběžně, trouba občas spálí pizzu, lanýž bere dodavatel jen do 3 minut a hostům, co mají limit, nesmí jídlo vychladnout v kuchyni.'],
        ['sef', 'Recepty: špagety, burger, rizoto, pizza, káva. Tohle je tvoje noc. Ukaž mu, co umí async kuchyně!']
      ],
      task: 'Obsluž celý sál včas: všechny objednávky souběžně, spálené pizzy peč znovu, lanýž od dodavatele s limitem 3 minuty (jinak ze zásoby).',
      entry: 'smena', rules: { start: 19, freshWithin: 3 }, stations: ['kavovar', 'trouba', 'prkenko', 'plotna', 'friteza', 'dodavatel'], recipes: ['špagety', 'burger', 'rizoto'],
      starter: `async function priprav(objednavka) {
  switch (objednavka.jidlo) {
    case 'káva':
      return await kavovar();
    case 'pizza':
      return await trouba('pizza');                  // TODO: může se spálit
    case 'špagety': {
      const testoviny = await plotna('těstoviny');
      const omacka = await plotna('omáčka');           // TODO: souběžně
      return sloz(testoviny, omacka);
    }
    case 'burger': {
      const [maso, houska, salat] = await Promise.all([friteza('maso'), trouba('houska'), prkenko('salát')]);
      return sloz(maso, houska, salat);
    }
    case 'rizoto': {
      const ryze = await plotna('rýže');
      const lanyz = await dodavatel('lanýž');         // TODO: limit 3 minuty
      return sloz(ryze, lanyz);
    }
  }
}

async function smena(objednavky) {
  for (const objednavka of objednavky) {             // TODO: souběžně
    podej(objednavka, await priprav(objednavka));
  }
}
`,
      solution: `async function sOpakovanim(akce) {
  while (true) {
    try {
      return await akce();
    } catch (chyba) {
      console.log(chyba.message);
    }
  }
}

function sLimitem(slib, minuty, nahrada) {
  return Promise.race([slib, cekej(minuty).then(nahrada)]);
}

async function priprav(objednavka) {
  switch (objednavka.jidlo) {
    case 'káva':
      return await kavovar();
    case 'pizza':
      return await sOpakovanim(() => trouba('pizza'));
    case 'špagety': {
      const [testoviny, omacka] = await Promise.all([plotna('těstoviny'), plotna('omáčka')]);
      return sloz(testoviny, omacka);
    }
    case 'burger': {
      const [maso, houska, salat] = await Promise.all([friteza('maso'), sOpakovanim(() => trouba('houska')), prkenko('salát')]);
      return sloz(maso, houska, salat);
    }
    case 'rizoto': {
      const [ryze, lanyz] = await Promise.all([plotna('rýže'), sLimitem(dodavatel('lanýž'), 3, () => zasoba('lanýž'))]);
      return sloz(ryze, lanyz);
    }
  }
}

async function smena(objednavky) {
  await Promise.all(objednavky.map(async objednavka => {
    podej(objednavka, await priprav(objednavka));
  }));
}
`,
      wrong: [
        `async function priprav(objednavka) {
  switch (objednavka.jidlo) {
    case 'káva':
      return await kavovar();
    case 'pizza':
      return await trouba('pizza');
    case 'špagety': {
      const [testoviny, omacka] = await Promise.all([plotna('těstoviny'), plotna('omáčka')]);
      return sloz(testoviny, omacka);
    }
    case 'burger': {
      const [maso, houska, salat] = await Promise.all([friteza('maso'), trouba('houska'), prkenko('salát')]);
      return sloz(maso, houska, salat);
    }
    case 'rizoto': {
      const [ryze, lanyz] = await Promise.all([plotna('rýže'), Promise.race([dodavatel('lanýž'), cekej(3).then(() => zasoba('lanýž'))])]);
      return sloz(ryze, lanyz);
    }
  }
}

async function smena(objednavky) {
  await Promise.all(objednavky.map(async objednavka => {
    podej(objednavka, await priprav(objednavka));
  }));
}
`
      ],
      shifts: [
        { name: 'Směna 1', burn: [2], supplier: { 'lanýž': 2 }, stock: ['lanýž'], orders: [o(5, 'špagety', 12), o(5, 'pizza', 22), o(2, 'burger', 14), o(3, 'káva', 6), o(4, 'rizoto', 13)] },
        { name: 'Směna 2', burn: [1], supplier: { 'lanýž': 9 }, stock: ['lanýž'], orders: [o(5, 'rizoto', 9), o(1, 'pizza', 22), o(6, 'burger', 28), o(7, 'špagety', 12), o(8, 'káva', 6), o(9, 'káva', 8)] },
        { name: 'Směna 3', burn: [], supplier: { 'lanýž': 4 }, stock: ['lanýž'], orders: [o(5, 'burger', 9), o(2, 'burger', 14), o(3, 'pizza', 25), o(4, 'rizoto', 10), o(6, 'špagety', 14)] }
      ],
      hints: [
        'Začni tím, co už znáš: všechny objednávky souběžně (`Promise.all` + `map`) a špagety přes `Promise.all`.',
        'Spálená pizza: obal pečení do opakování s `try/catch`. Ideální je obecná funkce `sOpakovanim(akce)`, které předáš `() => trouba(\'pizza\')`.',
        'Lanýž: `Promise.race([dodavatel(\'lanýž\'), cekej(3).then(() => zasoba(\'lanýž\'))])` a rýži vař zároveň přes `Promise.all`.'
      ],
      bonus: { text: 'Poslední jídlo na stole nejpozději v 19:20', check: c => all(c, s => s.servedAll <= 20) },
      learn: ['Velké asynchronní programy skládáš z malých nástrojů: Promise.all (souběh), Promise.race (limit), try/catch ve smyčce (opakování) a funkce, které vrací výsledky. Každý dělá jednu věc a dají se kombinovat.', "await Promise.all(objednavky.map(async o => {\n  podej(o, await priprav(o));\n}));"],
      palette: ['await Promise.all(objednavky.map(async objednavka => {|}));', 'try {', '} catch (chyba) {', "Promise.race([dodavatel('lanýž'), cekej(3).then(() => zasoba('lanýž'))])"],
      reward: 'Kritik odkládá příbor: „Async Bistro – pět hvězd, rychlejší než mikrovlnka.“'
    }
  ];

  /* ---------- vstupní / výstupní test (varianty A a B) ---------- */
  const CONCEPTS = {
    await: 'await a Promise',
    seq: 'Postup kroků a proměnné',
    cond: 'Objekty a podmínky',
    loop: 'Pole a cyklus for…of',
    all: 'Souběh: Promise.all',
    map: 'Metoda map a šipkové funkce',
    err: 'Chyby: try / catch',
    ret: 'Async funkce vrací hodnotu',
    race: 'Promise.race a časovač',
    sort: 'Řazení pole (sort)'
  };

  const QUIZ = {
    A: [
      { c: 'await', q: 'Co vypíše tento kód?', code: "async function f() {\n  const kava = kavovar();\n  console.log(kava);\n}", a: ['Promise (slib, káva ještě není hotová)', 'Hotovou kávu', 'undefined', 'Chybu SyntaxError'], ok: 0 },
      { c: 'seq', q: 'Trouba peče chléb 3 minuty, prkénko krájí sýr 2 minuty. Za jak dlouho doběhne funkce?', code: "async function toust() {\n  const chleba = await trouba('chléb');\n  const syr = await prkenko('sýr');\n  return sloz(chleba, syr);\n}", a: ['5 minut', '3 minuty', '2 minuty', 'Okamžitě'], ok: 0 },
      { c: 'cond', q: 'Co vypíše tento kód?', code: "const objednavka = { stul: 3, jidlo: 'káva' };\nif (objednavka.jidlo === 'čaj') {\n  console.log('A');\n} else if (objednavka.stul > 2) {\n  console.log('B');\n} else {\n  console.log('C');\n}", a: ['B', 'A', 'C', 'B a C'], ok: 0 },
      { c: 'loop', q: 'Kolikrát se zavolá obsluz?', code: "const objednavky = ['káva', 'toust', 'káva'];\nfor (const o of objednavky) {\n  await obsluz(o);\n}", a: ['3×', '2×', '1×', '4×'], ok: 0 },
      { c: 'all', q: 'Plotny jsou dvě. Těstoviny se vaří 8 minut, omáčka 6. Za jak dlouho je hotovo?', code: "const [t, o] = await Promise.all([\n  plotna('těstoviny'),\n  plotna('omáčka')\n]);", a: ['8 minut', '14 minut', '6 minut', '2 minuty'], ok: 0 },
      { c: 'map', q: 'Co vrátí tento výraz?', code: '[1, 2, 3].map(x => x * 10)', a: ['[10, 20, 30]', '60', '[1, 2, 3]', 'undefined'], ok: 0, codeAnswers: true },
      { c: 'err', q: 'Trouba vyhodí chybu „Spáleno!“. Co se vypíše?', code: "try {\n  await trouba('pizza');\n  console.log('hotovo');\n} catch (chyba) {\n  console.log('znovu');\n}", a: ['znovu', 'hotovo', 'hotovo a pak znovu', 'Nic – program spadne'], ok: 0 },
      { c: 'ret', q: 'Co bude v proměnné x?', code: "async function priprav() {\n  const kava = await kavovar();\n}\nconst x = await priprav();", a: ['undefined – funkce nic nevrací', 'Hotová káva', 'Promise', 'Chyba'], ok: 0 },
      { c: 'race', q: 'Dodavatel jede 10 minut, časovač má 3. Co vrátí race?', code: "await Promise.race([\n  dodavatel('lanýž'),\n  cekej(3).then(() => 'zásoba')\n]);", a: ["'zásoba' po 3 minutách", 'Lanýž po 10 minutách', 'Obojí v poli', 'Chybu'], ok: 0 },
      { c: 'sort', q: 'Jaké pořadí limitů vznikne?', code: 'const limity = [15, 7, 30];\nlimity.sort((a, b) => a - b);', a: ['[7, 15, 30]', '[30, 15, 7]', '[15, 7, 30]', '[15, 30, 7]'], ok: 0, codeAnswers: true }
    ],
    B: [
      { c: 'await', q: 'Kde smíš použít slovo await?', a: ['Uvnitř funkce označené async', 'Kdekoli v kódu', 'Jen uvnitř cyklu for', 'Jen v podmínce if'], ok: 0 },
      { c: 'seq', q: 'Kolik minut trvá tato funkce, když vajíčko trvá 4 minuty a káva 2?', code: "async function snidane() {\n  const v = await plotna('vajíčko');\n  const k = await kavovar();\n  return [v, k];\n}", a: ['6 minut', '4 minuty', '2 minuty', '8 minut'], ok: 0 },
      { c: 'cond', q: 'Proč tato podmínka nefunguje správně?', code: "if (objednavka.jidlo = 'káva') {\n  …\n}", a: ['Jedno = je přiřazení, porovnává se ===', 'Chybí středník', 'Řetězec musí být v dvojitých uvozovkách', 'Funguje správně'], ok: 0 },
      { c: 'loop', q: 'Co vypíše tento cyklus?', code: "const stoly = [4, 7];\nfor (const s of stoly) {\n  console.log(`Stůl ${s}`);\n}", a: ['Stůl 4, pak Stůl 7', 'Stůl 0, pak Stůl 1', 'Stůl 4,7', 'Stůl ${s} dvakrát'], ok: 0 },
      { c: 'all', q: 'Co vrátí await Promise.all([a, b])?', a: ['Pole výsledků [výsledek a, výsledek b] ve stejném pořadí', 'Jen výsledek, který doběhl dřív', 'Jen výsledek b', 'Počet hotových slibů'], ok: 0 },
      { c: 'map', q: 'Co dělá tento řádek?', code: 'await Promise.all(objednavky.map(o => obsluz(o)));', a: ['Spustí obsluhu všech objednávek najednou a počká na všechny', 'Obslouží objednávky jednu po druhé', 'Obslouží jen první objednávku', 'Nic – map s async nefunguje'], ok: 0 },
      { c: 'err', q: 'Co se stane, když slib skončí chybou a nikde není try/catch?', a: ['Chyba se šíří dál a async funkce skončí chybou', 'Chyba se tiše ignoruje', 'Await vrátí undefined', 'Slib se automaticky zkusí znovu'], ok: 0 },
      { c: 'ret', q: 'Co vrací každá async funkce, když ji zavoláš bez await?', a: ['Promise (slib svého výsledku)', 'Přímo hodnotu za return', 'Vždy undefined', 'Funkci'], ok: 0 },
      { c: 'race', q: 'Kdy se splní Promise.race([a, b])?', a: ['Jakmile skončí první z nich', 'Až skončí oba', 'Nikdy, pokud jeden selže', 'Hned při zavolání'], ok: 0 },
      { c: 'sort', q: 'Čím seřadíš objednávky od nejmenšího limitu?', a: ['objednavky.sort((a, b) => a.limit - b.limit)', 'objednavky.sort((a, b) => b.limit - a.limit)', 'objednavky.sort()', 'objednavky.reverse()'], ok: 0, codeAnswers: true }
    ]
  };

  /* ---------------- jak získat bonus u úrovní, kde o něm nemluví nápověda ---------------- */
  const BONUS_HOW = {
    5: { how: '`Promise.all` vrátí pole výsledků ve stejném pořadí, v jakém jsi stanice zadal(a). Destrukturováním `const [a, b] = …` ho rozbalíš rovnou do pojmenovaných proměnných.', example: "const [testoviny, omacka] = await Promise.all([\n  plotna('těstoviny'),\n  plotna('omáčka')\n]);" },
    6: { how: '`map()` z každé objednávky udělá slib (`obsluz(o)` je async, takže vrací Promise). Celé pole slibů pak předáš `Promise.all` a počkáš na všechny najednou, bez cyklu `for`.', example: 'await Promise.all(objednavky.map(o => obsluz(o)));' },
    8: { how: '`forEach` dává do funkce i index položky jako druhý parametr. Jídla z `Promise.all` jsou ve stejném pořadí jako objednávky, takže `jidla[i]` patří k `objednavka` se stejným `i`.', example: 'const jidla = await Promise.all(objednavky.map(priprav));\nobjednavky.forEach((objednavka, i) => podej(objednavka, jidla[i]));' },
    10: { how: 'Kurýři jsou jen dva. Nespouštěj rozvoz všech objednávek najednou, ale udělej dva „pracovníky“: každý si z fronty bere další objednávku, až když tu předchozí doručí.', example: 'async function pracovnik() {\n  while (fronta.length > 0) {\n    await doruc(fronta.shift());\n  }\n}\nawait Promise.all([pracovnik(), pracovnik()]);' },
    12: { how: 'Rychlost dělá souběh: všechny objednávky vař najednou přes `Promise.all` a `map`. Každé jídlo podej hned, jak je hotové, a nečekej na ostatní.', example: 'await Promise.all(objednavky.map(async objednavka => {\n  podej(objednavka, await priprav(objednavka));\n}));' }
  };
  LEVELS.forEach(l => Object.assign(l.bonus, BONUS_HOW[l.id] || {}));

  global.BistroContent = { CHAPTERS, LEVELS, QUIZ, CONCEPTS };
})(typeof window !== 'undefined' ? window : globalThis);
