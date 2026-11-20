/*
 * Robot Bajt – obsah hry: kapitoly, levely, generátory map, testy znalostí, příručka
 */
(function (global) {
  'use strict';

  /* ---------- pomocné funkce pro generátory map ---------- */
  function corridor(tiles, opts) {
    // tiles: pole znaků mezi robotem a cílem, robot vlevo, cíl vpravo
    const row = '#>' + tiles.join('') + 'G#';
    const wall = '#'.repeat(row.length);
    return Object.assign({ map: [wall, row, wall] }, opts || {});
  }
  function randInt(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
  function pickBits(r, n, prob, min, max) {
    let arr;
    let guard = 0;
    do {
      arr = Array.from({ length: n }, () => (r() < prob ? 'b' : '.'));
      const c = arr.filter(x => x === 'b').length;
      if (c >= min && c <= max) break;
    } while (++guard < 50);
    return arr;
  }

  /* Bludiště (rekurzivní backtracking), robot vlevo nahoře, cíl nejdál, před cílem velký bug */
  function maze(r, cw, ch) {
    const W = cw * 2 + 1, H = ch * 2 + 1;
    const g = Array.from({ length: H }, () => Array(W).fill('#'));
    const seen = Array.from({ length: ch }, () => Array(cw).fill(false));
    const stack = [[0, 0]];
    seen[0][0] = true;
    g[1][1] = '.';
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .map(([dx, dy]) => [cx + dx, cy + dy, dx, dy])
        .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen[ny][nx]);
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny, dx, dy] = nb[Math.floor(r() * nb.length)];
      seen[ny][nx] = true;
      g[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = '.';
      g[ny * 2 + 1][nx * 2 + 1] = '.';
      stack.push([nx, ny]);
    }
    // nejvzdálenější buňka od startu (BFS po dlaždicích)
    const dist = Array.from({ length: H }, () => Array(W).fill(-1));
    const prev = {};
    const q = [[1, 1]];
    dist[1][1] = 0;
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (g[ny][nx] !== '#' && dist[ny][nx] < 0) {
          dist[ny][nx] = dist[y][x] + 1;
          prev[nx + ',' + ny] = [x, y];
          q.push([nx, ny]);
        }
      }
    }
    let best = [1, 1];
    for (let y = 1; y < H; y += 2) for (let x = 1; x < W; x += 2) if (dist[y][x] > dist[best[1]][best[0]]) best = [x, y];
    const [gx, gy] = best;
    g[gy][gx] = 'G';
    const [bx, by] = prev[gx + ',' + gy]; // dlaždice těsně před cílem
    g[by][bx] = 'X';
    g[1][1] = '>';
    return { map: g.map(row => row.join('')) };
  }

  /* ---------- kapitoly ---------- */
  const CHAPTERS = [
    {
      id: 1, title: 'Sekvence', icon: '▶️', concept: 'sekvence',
      intro: [
        'Program je <b>posloupnost příkazů</b>. Počítač je provede přesně v tom pořadí, v jakém je napíšeš – nic nedomýšlí.',
        'Každý příkaz robota končí závorkami a středníkem, například <code>krok();</code>. Robot vždy jde tam, kam se dívá.'
      ],
      example: 'krok();\nkrok();\nvpravo();\nkrok();'
    },
    {
      id: 2, title: 'Cyklus for', icon: '🔁', concept: 'for',
      intro: [
        'Když se něco opakuje, nepiš to desetkrát. <b>Cyklus for</b> zopakuje blok kódu, kolikrát chceš.',
        '<code>i</code> je počítadlo: začne na 0, a dokud platí <code>i &lt; 5</code>, provede blok a zvýší se o 1 (<code>i++</code>). Blok se tedy provede 5×.'
      ],
      example: 'for (let i = 0; i < 5; i++) {\n  krok();\n}'
    },
    {
      id: 3, title: 'Podmínky', icon: '🔀', concept: 'if',
      intro: [
        'Robot má <b>senzory</b>, které odpovídají <code>true</code> (ano) nebo <code>false</code> (ne). Podle nich se program rozhodne pomocí <b>if / else</b>.',
        'Od teď se mapy mění! Každý level má několik <b>testů</b> s různými mapami – program musí projít všemi. Tak se testuje i skutečný software.'
      ],
      example: 'if (jeBit()) {\n  seber();\n} else {\n  krok();\n}'
    },
    {
      id: 4, title: 'Cyklus while', icon: '♾️', concept: 'while',
      intro: [
        '<b>while</b> opakuje blok, <b>dokud platí podmínka</b>. Hodí se, když předem nevíš, kolikrát se má něco opakovat.',
        '<code>!</code> znamená NE: <code>!jeCil()</code> = „nejsem v cíli“. Pozor na <b>nekonečný cyklus</b> – uvnitř se musí něco změnit, aby podmínka jednou přestala platit.'
      ],
      example: 'while (!jeCil()) {\n  krok();\n}'
    },
    {
      id: 5, title: 'Funkce a proměnné', icon: '🧩', concept: 'funkce',
      intro: [
        '<b>Funkce</b> je tvůj vlastní příkaz. Jednou ji nadefinuješ a pak ji voláš, kolikrát chceš – kód je kratší a přehlednější.',
        '<b>Proměnná</b> si pamatuje hodnotu: <code>let pocet = 0;</code> vytvoří počítadlo a <code>pocet++;</code> ho zvýší o 1.'
      ],
      example: 'function otocSe() {\n  vlevo();\n  vlevo();\n}\n\nlet pocet = 0;\notocSe();\npocet++;'
    }
  ];

  /* ---------- levely ---------- */
  const LEVELS = [
    /* ===== Kapitola 1: Sekvence ===== */
    {
      id: '1-1', chapter: 1, title: 'Probuzení', concepts: ['sekvence'],
      story: 'Systém se restartoval a robot Bajt se probudil daleko od nabíječky. Dostaň ho tam!',
      task: 'Dojeď na nabíječku ⚡.',
      spec: { map: ['#######', '#>...G#', '#######'] },
      battery: 20, sizeStar: 4, stepStar: 4,
      palette: ['krok', 'vlevo', 'vpravo'],
      starter: '// Napiš příkazy pro robota – každý na nový řádek.\n// Spusť program tlačítkem ▶ nebo Ctrl + Enter.\nkrok();\n',
      solution: 'krok();\nkrok();\nkrok();\nkrok();',
      hints: ['Robot musí udělat 4 kroky. Jeden už v programu máš.', 'Zkopíruj řádek `krok();` ještě třikrát.']
    },
    {
      id: '1-2', chapter: 1, title: 'Zatáčka', concepts: ['sekvence'],
      story: 'Chodbička mezi čipy se dvakrát lomí. Robot se umí jen otáčet na místě – pozor, kam se dívá!',
      task: 'Dojeď na nabíječku ⚡.',
      spec: { map: ['########', '#>..####', '###.####', '###..G##', '########'] },
      battery: 30, sizeStar: 8, stepStar: 8,
      palette: ['krok', 'vlevo', 'vpravo'],
      starter: 'krok();\nkrok();\n',
      solution: 'krok();\nkrok();\nvpravo();\nkrok();\nkrok();\nvlevo();\nkrok();\nkrok();',
      hints: ['`vpravo()` a `vlevo()` robota jen otočí, nikam nejde. Pak teprve `krok()`.', 'Doprava, když se robot dívá na východ, znamená otočit se dolů (na jih).']
    },
    {
      id: '1-3', chapter: 1, title: 'Sběr bitů', concepts: ['sekvence'],
      story: 'Po pádu systému se rozsypaly bity. Seber je všechny, než se z nich stane šum.',
      task: 'Seber všechny bity 💠 a dojeď na nabíječku ⚡.',
      spec: { map: ['#########', '#>b.b.b.#', '#######G#', '#########'] },
      battery: 30, sizeStar: 11, stepStar: 11,
      palette: ['krok', 'vlevo', 'vpravo', 'seber'],
      starter: 'krok();\nseber();\n',
      solution: 'krok();\nseber();\nkrok();\nkrok();\nseber();\nkrok();\nkrok();\nseber();\nkrok();\nvpravo();\nkrok();',
      hints: ['`seber()` funguje jen na poli, kde bit leží – nejdřív na něj dojeď.', 'Na konci chodby se otoč vpravo a udělej poslední krok.']
    },

    /* ===== Kapitola 2: Cyklus for ===== */
    {
      id: '2-1', chapter: 2, title: 'Dlouhá chodba', concepts: ['for'],
      story: 'Nekonečně dlouhá datová sběrnice. Psát dvanáctkrát krok() by byla nuda.',
      task: 'Dojeď na nabíječku ⚡. Na ⭐ za krátký kód použij cyklus `for`.',
      spec: { map: ['###############', '#>...........G#', '###############'] },
      battery: 40, sizeStar: 2, stepStar: 12,
      palette: ['krok', 'vlevo', 'vpravo', 'for'],
      starter: 'for (let i = 0; i < 3; i++) {\n  krok();\n}\n',
      solution: 'for (let i = 0; i < 12; i++) {\n  krok();\n}',
      hints: ['Cyklus v programu udělá 3 kroky. Kolik jich potřebuješ?', 'Spočítej políčka mezi robotem a nabíječkou a změň číslo 3.']
    },
    {
      id: '2-2', chapter: 2, title: 'Schody', concepts: ['for'],
      story: 'Schodiště vede k horní sběrnici. Každý schod je stejný – vzor se opakuje.',
      task: 'Vyšlapej schody až na nabíječku ⚡.',
      spec: { map: ['#########', '######G##', '#####..##', '####..###', '###..####', '##..#####', '#>.######', '#########'] },
      battery: 60, sizeStar: 5, stepStar: 20,
      palette: ['krok', 'vlevo', 'vpravo', 'for'],
      starter: '',
      solution: 'for (let i = 0; i < 5; i++) {\n  krok();\n  vlevo();\n  krok();\n  vpravo();\n}',
      hints: ['Jeden schod = krok dopředu, otočit nahoru, krok nahoru, otočit zpátky.', 'Ty čtyři příkazy dej do cyklu `for`, který se zopakuje 5×.']
    },
    {
      id: '2-3', chapter: 2, title: 'O jeden víc', concepts: ['for', 'offbyone'], debug: true,
      story: 'Kolega napsal program, ale robot pokaždé narazí do zdi. Klasická chyba „o jedničku“ (off-by-one).',
      task: '🐞 Oprav program tak, aby robot zastavil na nabíječce ⚡.',
      spec: { map: ['#########', '#>.....G#', '#########'] },
      battery: 30, sizeStar: 2, stepStar: 6,
      palette: ['krok', 'for'],
      starter: '// 🐞 Tenhle program je rozbitý: robot narazí do zdi.\n// Najdi chybu a oprav ji.\nfor (let i = 0; i <= 6; i++) {\n  krok();\n}\n',
      solution: 'for (let i = 0; i < 6; i++) {\n  krok();\n}',
      hints: ['Kolikrát se provede cyklus, když `i` jde od `0` a podmínka je `i <= 6`?', 'Hodnoty 0, 1, 2, 3, 4, 5, 6 – to je 7 opakování. Potřebuješ jich 6.']
    },
    {
      id: '2-4', chapter: 2, title: 'Čtverec', concepts: ['for', 'vnoreny'],
      story: 'Kolem procesoru leží v kruhu bity. Obejdi ho celý a vrať se na start – je tam nabíječka.',
      task: 'Seber všech 16 bitů 💠 a vrať se na nabíječku ⚡ (stojíš na ní).',
      spec: { map: ['#######', '#@bbbb#', '#b###b#', '#b###b#', '#b###b#', '#bbbbb#', '#######'], dir: 'E', extraBits: [[1, 1]] },
      battery: 80, sizeStar: 5, stepStar: 36,
      palette: ['krok', 'vlevo', 'vpravo', 'seber', 'for'],
      starter: '',
      solution: 'for (let s = 0; s < 4; s++) {\n  for (let i = 0; i < 4; i++) {\n    krok();\n    seber();\n  }\n  vpravo();\n}',
      hints: ['Jedna strana čtverce = 4× (`krok()` + `seber()`). Stran jsou 4 a po každé se otočíš vpravo.', 'Vnořený cyklus: `for` uvnitř `for`. Vnější cyklus = strany, vnitřní = kroky po straně.']
    },

    /* ===== Kapitola 3: Podmínky ===== */
    {
      id: '3-1', chapter: 3, title: 'Kde jsou bity?', concepts: ['if'],
      story: 'Bity jsou pokaždé jinde. Program, který jen opakuje stejné kroky, tady nestačí – robot se musí dívat.',
      task: 'Projdi chodbu, seber všechny bity 💠 a dojeď na nabíječku ⚡. Program musí projít všemi testy.',
      gen: r => corridor(pickBits(r, 8, 0.5, 2, 6)),
      seeds: [101, 202, 303], randomTests: 2,
      battery: 40, sizeStar: 4,
      palette: ['krok', 'seber', 'for', 'if', 'jeBit'],
      starter: 'for (let i = 0; i < 9; i++) {\n  krok();\n  // seber bit, jen když tu nějaký leží\n}\n',
      solution: 'for (let i = 0; i < 9; i++) {\n  krok();\n  if (jeBit()) {\n    seber();\n  }\n}',
      hints: ['`seber()` na prázdném poli je chyba. Zeptej se senzoru `jeBit()`.', 'Uvnitř cyklu: `if (jeBit()) { seber(); }`']
    },
    {
      id: '3-2', chapter: 3, title: 'Zap!', concepts: ['if'],
      story: 'Do chodby se nasoukaly bugy 🐞. Když na ně robot vjede, kousnou ho. Antivirový paprsek zap() je zničí.',
      task: 'Znič bugy, seber bity 💠 a dojeď na nabíječku ⚡.',
      gen: r => {
        const tiles = pickBits(r, 8, 0.4, 1, 4);
        const free = tiles.map((t, i) => (t === '.' ? i : -1)).filter(i => i >= 0);
        const bugCount = Math.min(free.length, randInt(r, 1, 3));
        for (let k = 0; k < bugCount; k++) {
          const idx = free.splice(Math.floor(r() * free.length), 1)[0];
          tiles[idx] = 'x';
        }
        return corridor(tiles);
      },
      seeds: [11, 12, 13], randomTests: 2,
      battery: 50, sizeStar: 6,
      palette: ['krok', 'seber', 'zap', 'for', 'if', 'jeBit', 'jeBug'],
      starter: 'for (let i = 0; i < 9; i++) {\n  krok();\n  if (jeBit()) {\n    seber();\n  }\n}\n',
      solution: 'for (let i = 0; i < 9; i++) {\n  if (jeBug()) {\n    zap();\n  }\n  krok();\n  if (jeBit()) {\n    seber();\n  }\n}',
      hints: ['`jeBug()` se dívá na pole PŘED robotem. Zeptej se ho dřív, než uděláš krok.', 'Před `krok();` přidej: `if (jeBug()) { zap(); }`']
    },
    {
      id: '3-3', chapter: 3, title: 'Rozcestí', concepts: ['if', 'else'],
      story: 'Na konci chodby je rozcestí. Cesta vede jednou doleva, jindy doprava – záleží na testu.',
      task: 'Dojeď na nabíječku ⚡, ať je vlevo, nebo vpravo.',
      gen: r => {
        const left = r() < 0.5;
        return {
          map: ['#########', left ? '#G...####' : '####...G#', '####.####', '####.####', '####^####', '#########']
        };
      },
      seeds: [7, 1, 12], randomTests: 2,
      battery: 30, sizeStar: 7,
      palette: ['krok', 'vlevo', 'vpravo', 'for', 'if', 'else', 'vlevoVolno', 'vpravoVolno'],
      starter: 'for (let i = 0; i < 3; i++) {\n  krok();\n}\n// tady se rozhodni: doleva, nebo doprava?\n',
      solution: 'for (let i = 0; i < 3; i++) {\n  krok();\n}\nif (vlevoVolno()) {\n  vlevo();\n} else {\n  vpravo();\n}\nfor (let i = 0; i < 3; i++) {\n  krok();\n}',
      hints: ['Senzor `vlevoVolno()` řekne, jestli je po levé ruce cesta.', '`if (vlevoVolno()) { vlevo(); } else { vpravo(); }` – a pak ještě 3 kroky.']
    },

    /* ===== Kapitola 4: Cyklus while ===== */
    {
      id: '4-1', chapter: 4, title: 'Neznámá délka', concepts: ['while'],
      story: 'Chodba je v každém testu jinak dlouhá. Kolikrát má robot udělat krok? To nevíš – a nemusíš.',
      task: 'Dojeď na nabíječku ⚡ v chodbě libovolné délky.',
      gen: r => corridor(Array(randInt(r, 2, 12)).fill('.')),
      seeds: [7, 8, 9], randomTests: 2,
      battery: 40, sizeStar: 2,
      palette: ['krok', 'while', 'jeCil', 'jeZed', 'jeVolno', 'not'],
      starter: '// Opakuj, dokud robot není v cíli\n',
      solution: 'while (!jeCil()) {\n  krok();\n}',
      hints: ['`while (podmínka) { … }` opakuje, dokud podmínka platí.', '`while (!jeCil()) { krok(); }` – „dokud nejsi v cíli, jdi“.']
    },
    {
      id: '4-2', chapter: 4, title: 'Laserová brána', concepts: ['while'],
      story: 'Bezpečnostní lasery se zapínají a vypínají. Vjet do zapnutého laseru = spálené obvody.',
      task: 'Proklouzni lasery až na nabíječku ⚡. Senzor `laser()` hlídá pole před tebou.',
      gen: r => {
        const n = 10;
        const tiles = Array(n).fill('.');
        const lasers = [];
        let x = randInt(r, 1, 3);
        while (x < n - 1) {
          tiles[x] = 'L';
          lasers.push({ period: 4, on: 2, phase: randInt(r, 0, 3) });
          x += randInt(r, 2, 4);
        }
        return corridor(tiles, { lasers });
      },
      seeds: [41, 42, 43], randomTests: 2,
      battery: 80, sizeStar: 4,
      palette: ['krok', 'cekej', 'while', 'jeCil', 'laser', 'not'],
      starter: 'while (!jeCil()) {\n  krok();\n}\n',
      solution: 'while (!jeCil()) {\n  while (laser()) {\n    cekej();\n  }\n  krok();\n}',
      hints: ['Před každým krokem: dokud je laser před tebou zapnutý, čekej.', 'Uvnitř cyklu: `while (laser()) { cekej(); }` a teprve pak `krok();`']
    },
    {
      id: '4-3', chapter: 4, title: 'Zacyklený robot', concepts: ['while', 'nekonecny'], debug: true,
      story: 'Robot se zasekl a točí se v cyklu pořád dokola. Procesor se přehřívá!',
      task: '🐞 Oprav program, aby robot posbíral bity 💠 a dojel na nabíječku ⚡.',
      gen: r => corridor(pickBits(r, randInt(r, 5, 10), 0.45, 1, 6)),
      seeds: [5, 6, 3], randomTests: 1,
      battery: 50, sizeStar: 4,
      palette: ['krok', 'seber', 'while', 'if', 'jeCil', 'jeBit', 'not'],
      starter: '// 🐞 Robot se zasekl a točí se pořád dokola.\n// Najdi chybu a oprav ji.\nwhile (!jeCil()) {\n  if (jeBit()) {\n    seber();\n  }\n}\n',
      solution: 'while (!jeCil()) {\n  krok();\n  if (jeBit()) {\n    seber();\n  }\n}',
      hints: ['Mění se uvnitř cyklu něco, co jednou ukončí podmínku `!jeCil()`?', 'Robot se v cyklu vůbec nehne. Chybí mu `krok();`']
    },

    /* ===== Kapitola 5: Funkce a proměnné ===== */
    {
      id: '5-1', chapter: 5, title: 'Vlastní příkaz', concepts: ['funkce'],
      story: 'V chodbě stojí firewally. Každý se dá obejít stejným manévrem horem – ideální práce pro vlastní funkci.',
      task: 'Dojeď na nabíječku ⚡. Podmínka: napiš a použij vlastní funkci (`function`).',
      requireFunction: true,
      gen: r => {
        const len = 14;
        const top = Array(len + 2).fill('#');
        const mid = ['#', '>'].concat(Array(len - 2).fill('.'), ['G', '#']);
        let b = randInt(r, 3, 5);
        while (b <= len - 2) {
          mid[b] = '#';
          top[b - 1] = '.'; top[b] = '.'; top[b + 1] = '.';
          b += randInt(r, 3, 5);
        }
        const wall = '#'.repeat(len + 2);
        return { map: [wall, top.join(''), mid.join(''), wall] };
      },
      seeds: [21, 22, 23], randomTests: 1,
      battery: 120, sizeStar: 13,
      palette: ['krok', 'vlevo', 'vpravo', 'while', 'if', 'else', 'jeCil', 'jeZed', 'function', 'not'],
      starter: 'function obejdi() {\n  // sem napiš manévr kolem firewallu\n}\n\nwhile (!jeCil()) {\n  krok();\n}\n',
      solution: 'function obejdi() {\n  vlevo();\n  krok();\n  vpravo();\n  krok();\n  krok();\n  vpravo();\n  krok();\n  vlevo();\n}\n\nwhile (!jeCil()) {\n  if (jeZed()) {\n    obejdi();\n  } else {\n    krok();\n  }\n}',
      hints: ['Obejití: nahoru, dva kroky vpravo, zase dolů. Robot se při tom musí správně otáčet.', 'V cyklu: `if (jeZed()) { obejdi(); } else { krok(); }`']
    },
    {
      id: '5-2', chapter: 5, title: 'Inventura', concepts: ['promenne'],
      story: 'Správce systému chce vědět, kolik bitů robot sebral. Robot si to musí pamatovat – v proměnné.',
      task: 'Seber všechny bity 💠, dojeď na nabíječku ⚡ a nakonec ohlas, kolik bitů jsi sebral(a): `ohlas(pocet);`',
      check: 'bitCount',
      gen: r => corridor(pickBits(r, randInt(r, 6, 11), 0.45, 1, 7)),
      seeds: [61, 62, 63], randomTests: 2,
      battery: 60, sizeStar: 7,
      palette: ['krok', 'seber', 'ohlas', 'while', 'if', 'jeCil', 'jeBit', 'let', 'not'],
      starter: 'let pocet = 0;\n\nwhile (!jeCil()) {\n  krok();\n  if (jeBit()) {\n    seber();\n  }\n}\n',
      solution: 'let pocet = 0;\nwhile (!jeCil()) {\n  krok();\n  if (jeBit()) {\n    seber();\n    pocet++;\n  }\n}\nohlas(pocet);',
      hints: ['Pokaždé, když sebereš bit, zvyš počítadlo: `pocet++;`', 'Úplně na konci programu (za cyklem) zavolej `ohlas(pocet);`']
    },
    {
      id: '5-3', chapter: 5, title: 'Velký Bug', concepts: ['algoritmus', 'while', 'if'], boss: true,
      story: 'Finále! Velký Bug se zabydlel v bludišti procesoru těsně před nabíječkou. Bludiště je v každém testu jiné – potřebuješ obecný algoritmus.',
      task: 'Najdi cestu bludištěm na nabíječku ⚡ a cestou znič Velkého Buga (3 zásahy).',
      gen: r => maze(r, 6, 4),
      seeds: [31, 32, 33], randomTests: 1,
      battery: 300, sizeStar: 9,
      palette: ['krok', 'vlevo', 'vpravo', 'zap', 'while', 'if', 'else', 'jeCil', 'jeZed', 'vpravoVolno', 'jeBug', 'not', 'function'],
      starter: '// Tip: pravidlo pravé ruky – drž se pořád pravé stěny.\nwhile (!jeCil()) {\n  krok();\n}\n',
      solution: 'while (!jeCil()) {\n  if (vpravoVolno()) {\n    vpravo();\n  } else {\n    while (jeZed()) {\n      vlevo();\n    }\n  }\n  while (jeBug()) {\n    zap();\n  }\n  krok();\n}',
      hints: [
        'Pravidlo pravé ruky: když je vpravo volno, otoč se vpravo. Jinak se otáčej vlevo, dokud máš před sebou zeď. Pak udělej krok.',
        'Před každým krokem: `while (jeBug()) { zap(); }` – Velký Bug vydrží 3 zásahy.'
      ]
    }
  ];

  /* ---------- paleta příkazů (vkládání do editoru) ---------- */
  const SNIPPETS = {
    krok: { label: 'krok()', code: 'krok();' },
    vlevo: { label: 'vlevo()', code: 'vlevo();' },
    vpravo: { label: 'vpravo()', code: 'vpravo();' },
    seber: { label: 'seber()', code: 'seber();' },
    cekej: { label: 'cekej()', code: 'cekej();' },
    zap: { label: 'zap()', code: 'zap();' },
    ohlas: { label: 'ohlas(…)', code: 'ohlas(pocet);' },
    for: { label: 'for', code: 'for (let i = 0; i < 3; i++) {\n  |\n}', block: true },
    while: { label: 'while', code: 'while (!jeCil()) {\n  |\n}', block: true },
    if: { label: 'if', code: 'if (jeBit()) {\n  |\n}', block: true },
    else: { label: 'if / else', code: 'if (vlevoVolno()) {\n  |\n} else {\n  \n}', block: true },
    function: { label: 'function', code: 'function mujPrikaz() {\n  |\n}', block: true },
    let: { label: 'let', code: 'let pocet = 0;' },
    not: { label: '!', code: '!', inline: true },
    jeBit: { label: 'jeBit()', code: 'jeBit()', inline: true },
    jeBug: { label: 'jeBug()', code: 'jeBug()', inline: true },
    jeCil: { label: 'jeCil()', code: 'jeCil()', inline: true },
    jeZed: { label: 'jeZed()', code: 'jeZed()', inline: true },
    jeVolno: { label: 'jeVolno()', code: 'jeVolno()', inline: true },
    vlevoVolno: { label: 'vlevoVolno()', code: 'vlevoVolno()', inline: true },
    vpravoVolno: { label: 'vpravoVolno()', code: 'vpravoVolno()', inline: true },
    laser: { label: 'laser()', code: 'laser()', inline: true }
  };

  /* ---------- testy znalostí (dvě rovnocenné sady) ---------- */
  const CONCEPTS = {
    sekvence: 'Posloupnost příkazů',
    for: 'Cyklus for (počet opakování)',
    vnoreny: 'Vnořené cykly',
    if: 'Podmínky if / else',
    while: 'Cyklus while',
    nekonecny: 'Nekonečný cyklus',
    promenne: 'Proměnné',
    funkce: 'Funkce',
    offbyone: 'Chyba o jedničku (off-by-one)',
    negace: 'Senzory a negace (!)'
  };

  const QUIZ = {
    A: [
      { c: 'sekvence', q: 'Robot se dívá na sever (nahoru). Kde skončí po tomto programu?', code: 'krok();\nvpravo();\nkrok();\nkrok();',
        a: ['1 pole nahoru a 2 pole doprava', '2 pole nahoru a 1 pole doprava', '1 pole nahoru a 2 pole doleva', '3 pole nahoru'], ok: 0 },
      { c: 'for', q: 'Kolik kroků robot udělá?', code: 'for (let i = 0; i < 4; i++) {\n  krok();\n  krok();\n}',
        a: ['8', '4', '6', '10'], ok: 0 },
      { c: 'vnoreny', q: 'Kolikrát se zavolá seber()?', code: 'for (let a = 0; a < 3; a++) {\n  for (let b = 0; b < 4; b++) {\n    seber();\n  }\n}',
        a: ['12', '7', '3', '4'], ok: 0 },
      { c: 'if', q: 'Co robot ohlásí?', code: 'let x = 3;\nif (x > 5) {\n  ohlas("A");\n} else {\n  ohlas("B");\n}',
        a: ['B', 'A', 'A i B', 'Nic'], ok: 0 },
      { c: 'while', q: 'Co robot ohlásí?', code: 'let n = 10;\nwhile (n > 0) {\n  n = n - 4;\n}\nohlas(n);',
        a: ['-2', '0', '2', '-4'], ok: 0 },
      { c: 'nekonecny', q: 'Který program se nikdy nezastaví?',
        a: ['let i = 0;\nwhile (i < 3) {\n  ohlas(i);\n}', 'let i = 0;\nwhile (i < 3) {\n  i++;\n}', 'for (let i = 0; i < 3; i++) {\n  ohlas(i);\n}', 'let i = 5;\nwhile (i < 3) {\n  ohlas(i);\n}'], ok: 0, codeAnswers: true },
      { c: 'promenne', q: 'Co robot ohlásí?', code: 'let s = 0;\nfor (let i = 1; i <= 4; i++) {\n  s = s + i;\n}\nohlas(s);',
        a: ['10', '4', '6', '15'], ok: 0 },
      { c: 'funkce', q: 'Kolik kroků robot celkem udělá?', code: 'function tam() {\n  krok();\n  krok();\n  vpravo();\n}\n\ntam();\nkrok();\ntam();',
        a: ['5', '3', '4', '6'], ok: 0 },
      { c: 'offbyone', q: 'Robot má udělat přesně 5 kroků. Který cyklus je správně?',
        a: ['for (let i = 0; i < 5; i++)', 'for (let i = 0; i <= 5; i++)', 'for (let i = 1; i < 5; i++)', 'for (let i = 5; i < 0; i++)'], ok: 0, codeAnswers: true },
      { c: 'negace', q: 'Co dělá tento program?', code: 'while (!jeZed()) {\n  krok();\n}',
        a: ['Jde rovně, dokud před ním není zeď', 'Jde rovně, dokud před ním je zeď', 'Udělá jeden krok a zastaví', 'Otáčí se, dokud nenajde zeď'], ok: 0 }
    ],
    B: [
      { c: 'sekvence', q: 'Robot se dívá na východ (doprava). Kde skončí po tomto programu?', code: 'krok();\nkrok();\nvlevo();\nkrok();',
        a: ['2 pole doprava a 1 pole nahoru', '2 pole doprava a 1 pole dolů', '1 pole doprava a 2 pole nahoru', '3 pole doprava'], ok: 0 },
      { c: 'for', q: 'Kolik kroků robot udělá?', code: 'for (let i = 0; i < 3; i++) {\n  krok();\n  krok();\n  krok();\n}',
        a: ['9', '3', '6', '12'], ok: 0 },
      { c: 'vnoreny', q: 'Kolikrát se zavolá seber()?', code: 'for (let a = 0; a < 2; a++) {\n  for (let b = 0; b < 5; b++) {\n    seber();\n  }\n}',
        a: ['10', '7', '5', '2'], ok: 0 },
      { c: 'if', q: 'Co robot ohlásí?', code: 'let x = 5;\nif (x >= 5) {\n  ohlas("ANO");\n} else {\n  ohlas("NE");\n}',
        a: ['ANO', 'NE', 'ANO i NE', 'Nic'], ok: 0 },
      { c: 'while', q: 'Co robot ohlásí?', code: 'let n = 1;\nwhile (n < 20) {\n  n = n * 3;\n}\nohlas(n);',
        a: ['27', '9', '20', '81'], ok: 0 },
      { c: 'nekonecny', q: 'Který program se nikdy nezastaví?',
        a: ['let k = 10;\nwhile (k > 0) {\n  ohlas(k);\n}', 'let k = 10;\nwhile (k > 0) {\n  k--;\n}', 'let k = 0;\nwhile (k > 0) {\n  ohlas(k);\n}', 'for (let k = 10; k > 0; k--) {\n  ohlas(k);\n}'], ok: 0, codeAnswers: true },
      { c: 'promenne', q: 'Co robot ohlásí?', code: 'let p = 0;\nfor (let i = 0; i < 5; i++) {\n  p = p + 2;\n}\nohlas(p);',
        a: ['10', '5', '2', '12'], ok: 0 },
      { c: 'funkce', q: 'Robot se na začátku dívá na sever. Kterým směrem se dívá na konci?', code: 'function otoc() {\n  vlevo();\n  vlevo();\n}\n\notoc();\notoc();\nvpravo();',
        a: ['Na východ', 'Na sever', 'Na západ', 'Na jih'], ok: 0 },
      { c: 'offbyone', q: 'Robot má udělat přesně 3 kroky. Který cyklus je správně?',
        a: ['for (let i = 1; i <= 3; i++)', 'for (let i = 0; i <= 3; i++)', 'for (let i = 1; i < 3; i++)', 'for (let i = 3; i < 3; i++)'], ok: 0, codeAnswers: true },
      { c: 'negace', q: 'Co dělá tento program?', code: 'while (!jeCil()) {\n  krok();\n}',
        a: ['Jde rovně, dokud nestojí v cíli', 'Jde rovně, dokud stojí v cíli', 'Neudělá nic – vykřičník program zastaví', 'Udělá přesně jeden krok'], ok: 0 }
    ]
  };

  /* ---------- příručka ---------- */
  const HANDBOOK = [
    { chapter: 1, title: 'Příkazy robota', items: ['krok', 'vlevo', 'vpravo', 'seber'] },
    { chapter: 2, title: 'Cyklus for', code: 'for (let i = 0; i < 5; i++) {\n  krok();   // provede se 5×\n}', text: 'i začne na 0, blok se opakuje, dokud platí i < 5, a po každém kole se i zvýší o 1.' },
    { chapter: 3, title: 'Senzory a podmínky', items: ['jeBit', 'jeBug', 'zap', 'vlevoVolno', 'vpravoVolno'], code: 'if (jeBug()) {\n  zap();\n} else {\n  krok();\n}' },
    { chapter: 4, title: 'Cyklus while', items: ['jeCil', 'jeZed', 'jeVolno', 'laser', 'cekej'], code: 'while (!jeCil()) {   // ! = NE\n  krok();\n}', text: 'Porovnání: === (rovná se), !== (nerovná se), <, >, <=, >=. Spojky: && (a zároveň), || (nebo).' },
    { chapter: 5, title: 'Funkce a proměnné', items: ['ohlas'], code: 'function otocSe() {\n  vlevo();\n  vlevo();\n}\n\nlet pocet = 0;\npocet++;        // pocet = pocet + 1\notocSe();\nohlas(pocet);' }
  ];

  const ROBOT_LINES = {
    start: ['Jdu na to!', 'Spouštím program…', 'Kompiluji odvahu…', 'Jedeme!'],
    bit: ['Mňam, bit!', '+1 bit', 'Bitík!', 'Sbírám data!'],
    crash: ['Au! Zeď.', 'Bonk!', 'Kdo sem dal zeď?!'],
    laser: ['Pálí to!', 'Ťsss!', 'Au au au!'],
    bug: ['Kousl mě bug!', 'Fuj, bug!'],
    zap: ['Pííu!', 'Zap!', 'Antivirus aktivní!'],
    infinite: ['Točí se mi hlava… 😵', 'Pořád dokola… dokola…'],
    battery: ['Baterka… dochází… 🔋'],
    nobit: ['Tady nic není!', 'Prázdno…'],
    win: ['Hotovo! ✨', 'Mise splněna!', 'Nabíjím se ⚡', 'Jsem hvězda!'],
    fail: ['Hmm, to nevyšlo.', 'Skoro!', 'Zkusíme to znovu?']
  };

  global.BajtContent = { CHAPTERS, LEVELS, SNIPPETS, QUIZ, CONCEPTS, HANDBOOK, ROBOT_LINES, helpers: { corridor, maze, pickBits } };
})(typeof window !== 'undefined' ? window : globalThis);
