/*
 * Testy Noci v galerii:
 *  - malíř vykreslí HTML + CSS přesně a bezpečně (skripty a on… atributy se nespustí),
 *  - porovnávač dá zadání 0 %, vzorovému řešení 100 % a typickým chybám méně než 95 %,
 *  - kontrola CSS česky pozná překlepy, chybějící jednotky, středníky a závorky,
 *  - každý obraz má zadání, nápovědy, tahák a splnitelný bonus.
 */
(async function () {
  'use strict';
  const results = [];
  const out = document.getElementById('out');
  const ok = (cond, text) => {
    results.push({ ok: !!cond, text });
    const li = document.createElement('li');
    li.className = cond ? 'ok' : 'bad';
    li.textContent = (cond ? '✔ ' : '✘ ') + text;
    out.appendChild(li);
  };
  const P = window.Painter;
  const G = window.Gallery;
  const PASS = 95;
  const MASTER = 99;
  const f1 = v => v.toFixed(1).replace('.', ',');
  const L = id => G.LEVELS.find(l => l.id === id);

  /* ---------- malíř ---------- */
  const box = (css, html) => P.render(html || '<div class="x"></div>', css);
  let img = await box('.x { position: absolute; inset: 0; background: #123456; }');
  ok(img.width === 400 && img.height === 300, 'plátno má 400 × 300 px');
  ok(P.pick(img, 0, 0) === '#123456' && P.pick(img, 399, 299) === '#123456', 'barva pozadí sedí v rozích: ' + P.pick(img, 0, 0));
  img = await box('.x { position: absolute; left: 0; top: 0; width: 100px; height: 100px; border-radius: 50%; background: #e2673f; }');
  ok(P.pick(img, 50, 50) === '#e2673f' && P.pick(img, 3, 3) === '#ffffff', 'border-radius: 50 % udělá kruh (střed barevný, roh bílý)');
  img = await box('.x { position: absolute; left: 100px; top: 100px; width: 0; height: 0; border-left: 50px solid transparent; border-right: 50px solid transparent; border-bottom: 80px solid #00ff00; }');
  ok(P.pick(img, 150, 170) === '#00ff00' && P.pick(img, 105, 105) === '#ffffff', 'trojúhelník z okrajů se vykreslí');
  img = await box('.x { position: absolute; inset: 0; background: linear-gradient(90deg, #ff0000 50%, #0000ff 50%); }');
  ok(P.pick(img, 100, 150) === '#ff0000' && P.pick(img, 300, 150) === '#0000ff', 'linear-gradient se vykreslí');
  img = await box('.x::before { content: ""; position: absolute; left: 10px; top: 10px; width: 20px; height: 20px; background: #000000; }');
  ok(P.pick(img, 20, 20) === '#000000', 'pseudoprvek ::before se vykreslí');

  // bezpečnost: skripty a obsluhy událostí z hráčova HTML se nespustí
  const svg = P.build('<img src="nic.png" onerror="window.__xss = 1"><script>window.__xss = 2<\/script><div onclick="x()"></div>', '');
  ok(!/onerror|onclick|<script/i.test(svg), 'build odstraní <script> a on… atributy');
  await P.render('<img src="nic.png" onerror="window.__xss = 1"><script>window.__xss = 2<\/script>', '');
  const els = P.elements('<img src="nic2.png" onerror="window.__xss = 3"><div><span></span></div>');
  await new Promise(r => setTimeout(r, 400));
  ok(window.__xss === undefined, 'hráčův kód se při vykreslení ani počítání prvků nespustí');
  ok(els.length === 3, 'počítání prvků v HTML: ' + els.length);
  ok(P.size('.a {\n  width: 10px; /* poznámka */\n}') === 15, 'délka CSS bez mezer a komentářů: ' + P.size('.a {\n  width: 10px; /* poznámka */\n}'));
  const rr = P.rules('.a { color: red; } @media (min-width: 1px) { .b::after { content: ""; } }');
  ok(rr.length === 2 && rr[1].sel === '.b::after', 'rozbor pravidel CSS pro bonusy (i uvnitř @media)');

  /* ---------- porovnávač ---------- */
  const l1 = L(1);
  const t1 = await P.render(l1.html, l1.solution);
  const s1 = await P.render(l1.html, l1.starter);
  const cat1 = P.prepare(t1, s1);
  ok(P.score(cat1, t1).score === 100, 'stejný obraz má shodu 100 %');
  ok(Math.abs(P.score(cat1, s1).score) < 0.01, 'vybledlé zadání má shodu 0 %');
  const d = P.diffImage(cat1, s1);
  ok(d.width === 400 && d.height === 300, 'obrázek rozdílů má 400 × 300 px');
  const pal = P.palette(t1, 6);
  ok(['#f3e3c3', '#7d9a78', '#e2673f'].every(c => pal.includes(c)), 'paleta katalogu najde barvy obrazu: ' + pal.join(' '));

  /* ---------- kontrola CSS ---------- */
  const lintCase = (css, type, label, extra) => {
    const r = P.lint(css);
    const hit = r.find(x => x.type === type);
    ok(hit && (!extra || extra(hit, r)), `kontrola CSS: ${label} → ${hit ? hit.type + ' (ř. ' + hit.line + '): ' + hit.msg : 'nic nenašla: ' + JSON.stringify(r)}`);
  };
  ok(P.lint('.a { width: 10px; height: 0; background: #fff; }').length === 0, 'kontrola CSS: správný kód nehlásí nic');
  lintCase('.a { widht: 10px; }', 'neznámá vlastnost', 'překlep widht', h => /width/.test(h.msg));
  lintCase('.a { backgorund: red; }', 'neznámá vlastnost', 'překlep backgorund', h => /background/.test(h.msg));
  lintCase('.a { width: 10; }', 'chybí jednotka', 'číslo bez jednotky');
  ok(P.lint('.a { width: 0; top: 0; }').length === 0, 'kontrola CSS: nula jednotku nepotřebuje');
  lintCase('.a { color: #12345; }', 'špatná barva', 'barva s 5 znaky');
  lintCase('.a { color: #ggg; }', 'špatná barva', 'barva s písmenem g');
  lintCase('.a {\n  width: 10px\n  height: 5px;\n}', 'středník', 'chybějící středník', h => h.line === 2);
  lintCase('.a { width: 10px;', 'závorka', 'chybějící }');
  lintCase('.a { width: 10px; }\n}', 'závorka', 'přebývající }', h => h.line === 2);
  lintCase('.a { background: linear-gradient(red blue); }', 'chyba v přechodu', 'přechod bez čárky');
  lintCase('.a { clip-path: polygon(0 0, 100% 0 50% 100%); }', 'chyba v polygonu', 'polygon bez čárky');
  lintCase('.a { color: ; }', 'chybí hodnota', 'vlastnost bez hodnoty');
  lintCase('.a { color: red; }\n/* neuzavřený', 'komentář', 'neuzavřený komentář', h => h.line === 2);
  lintCase('{ color: red; }', 'selektor', 'chybějící selektor');
  lintCase('.a..b { color: red; }', 'selektor', 'rozbitý selektor');
  lintCase('\n\n.a { widht: 1px; }', 'neznámá vlastnost', 'číslo řádku', h => h.line === 3);
  ok(P.lint('.sova::before { content: ""; } .x:hover::after { content: "a"; }').length === 0, 'kontrola CSS: pseudoprvky jsou v pořádku');
  ok(P.lint('@media (min-width: 1px) { .a { color: red; } }').length === 0, 'kontrola CSS: @media je v pořádku');
  ok(P.lint(':root { --c: #fff; }\n.a { color: var(--c); border: 1px solid var(--c); }').length === 0, 'kontrola CSS: proměnné jsou v pořádku');
  ok(P.lint('.a {\n  background:\n    radial-gradient(circle at 10px 10px, #000 0 5px, transparent 5px),\n    #fff;\n}').length === 0, 'kontrola CSS: víceřádková hodnota je v pořádku');

  /* ---------- obrazy ---------- */
  ok(G.LEVELS.length === 12, 'obrazů je 12');
  ok(G.LEVELS.every((l, i) => l.id === i + 1), 'obrazy jsou očíslované 1–12');
  ok([1, 2, 3].every(c => G.LEVELS.filter(l => l.chapter === c).length === 4) && G.CHAPTERS.length === 3, 'tři sály po čtyřech obrazech');
  const cats = {};
  const BONUS_ALT = new Set([3, 4, 6, 10]); // bonus jde jinou cestou, ověří ho pokusy níže
  for (const l of G.LEVELS) {
    ok(!!l.bonus.how, `${l.id}. ${l.title}: bonus má pro hráče vysvětlení`);
    const tag = `${l.id}. ${l.title}`;
    ok(l.artist && l.year && l.concept && l.task && l.reward && l.brief.length >= 2, `${tag}: má autora, rok, techniku, briefing a odměnu`);
    ok(l.hints.length === 3 && l.learn.length === 2 && l.palette.length >= 2, `${tag}: 3 nápovědy, tahák a úryvky`);
    ok(l.bonus && l.bonus.text && typeof l.bonus.check === 'function', `${tag}: má bonus`);
    ok(l.brief.every(([who]) => G.WHO[who]), `${tag}: všechny postavy briefingu existují`);
    const t = await P.render(l.html, l.solution);
    const s = await P.render(l.html, l.starter);
    const cat = P.prepare(t, s);
    cats[l.id] = cat;
    const r1 = P.score(cat, t).score;
    const r0 = P.score(cat, s).score;
    ok(r0 < 1, `${tag}: vybledlé zadání má ${f1(r0)} %`);
    ok(r1 >= 99.9, `${tag}: vzorové řešení má ${f1(r1)} %`);
    const area = cat.base / (P.W * P.H) * 100;
    ok(area > 0.5, `${tag}: zadání se od katalogu liší asi na ${f1(area)} % plochy`);
    const ls = P.lint(l.solution);
    ok(!ls.length, `${tag}: vzorové řešení projde kontrolou CSS ${ls.map(x => x.msg).join('; ')}`);
    const l0 = P.lint(l.starter);
    ok(!l0.length, `${tag}: zadání projde kontrolou CSS ${l0.map(x => x.msg).join('; ')}`);
    const ctx = (css, html) => ({ html: html || l.html, css, rules: P.rules(css), size: P.size(css), els: P.elements(html || l.html), stats: { picked: true } });
    if (l.bonus.limit) ok(P.size(l.solution) > l.bonus.limit && P.size(l.starter) < l.bonus.limit, `${tag}: zlatý rám vyžaduje zkrácení (řešení ${P.size(l.solution)} > ${l.bonus.limit} znaků)`);
    else if (BONUS_ALT.has(l.id)) ok(!l.bonus.check(ctx(l.solution)), `${tag}: bonus chce jinou cestu než vzorové řešení`);
    else ok(l.bonus.check(ctx(l.solution)), `${tag}: vzorové řešení splní bonus`);
    const pal2 = P.palette(t, 6);
    ok(pal2.length >= 2 && pal2.length <= 6, `${tag}: paleta katalogu má ${pal2.length} barvy`);
  }

  /* ---------- typické pokusy hráče ---------- */
  // fail = pod 95 %, pass = 95–99 %, master = aspoň 99 %
  const tries = [
    [1, 'čtverec bez zakulacení', 'fail', l => l.solution.replace('  border-radius: 50%;\n}\n\n.kopec', '}\n\n.kopec')],
    [1, 'barva orange místo #e2673f', 'fail', l => l.solution.replace('background: #e2673f;', 'background: orange;')],
    [1, 'border-radius 40 %', 'fail', l => l.solution.replace('  border-radius: 50%;\n}\n\n.kopec', '  border-radius: 40%;\n}\n\n.kopec')],
    [1, 'slunce o 3 px vedle', 'pass', l => l.solution.replace('left: 130px;', 'left: 133px;')],
    [2, 'okna o 5 px vedle', 'fail', l => l.solution.replace('left: 44px;', 'left: 49px;').replace('left: 159px;', 'left: 164px;').replace('left: 274px;', 'left: 279px;')],
    [2, 'jen top bez left', 'fail', l => l.solution.replace('left: 44px;', '').replace('left: 159px;', '').replace('left: 274px;', '')],
    [3, 'jen z-index bez posunu', 'fail', l => l.starter.replace('  background: #1d2b4a;\n}\n\n.hvezda', '  background: #1d2b4a;\n  z-index: 1;\n}\n\n.hvezda')],
    [3, 'posun bez z-index', 'fail', l => l.solution.replace('  z-index: 1;\n', '')],
    [3, 'stín v HTML až za měsícem', 'master', l => l.solution.replace('  z-index: 1;\n', ''), true, l => l.html.replace('  <div class="stin"></div>\n  <div class="mesic"></div>', '  <div class="mesic"></div>\n  <div class="stin"></div>')],
    [4, 'barvy hor v proměnných', 'master', l => l.solution.replace('  background: #a9cbd8;\n}', '  background: #a9cbd8;\n  --hora: #5c7183;\n  --hora2: #3c4d5c;\n}').replace('180px solid #5c7183', '180px solid var(--hora)').replace('140px solid #3c4d5c', '140px solid var(--hora2)'), true],
    [4, 'bez sněhu na špičce', 'fail', l => l.solution.replace('  border-bottom: 42px solid #ffffff;\n', '')],
    [5, 'nebe jednou barvou', 'fail', l => l.solution.replace('background: linear-gradient(#21405f, #0f2238);', 'background: #21405f;')],
    [5, 'zlatý rám přes inset', 'master', l => l.solution.replace('  left: 0;\n  top: 182px;\n  width: 400px;\n  height: 118px;', '  inset: 182px 0 0;'), true],
    [6, 'radial-gradient bez repeating', 'fail', l => l.solution.replace('repeating-radial-gradient', 'radial-gradient')],
    [6, 'kapka jako další vrstva pozadí', 'master', l => l.solution.replace('background: repeating-radial-gradient(', 'background: radial-gradient(circle at 200px 150px, #e3f4ef 0 9px, transparent 9px), repeating-radial-gradient(').replace(/\.kapka \{[\s\S]*?\}\n/, ''), true, l => l.html.replace('  <div class="kapka"></div>\n', '')],
    [7, 'pruhy pod úhlem 45°', 'fail', l => l.solution.replace('repeating-linear-gradient(90deg', 'repeating-linear-gradient(45deg')],
    [7, 'zlatý rám přes inset', 'master', l => l.solution.replace('  left: 60px;\n  top: 100px;\n  width: 280px;\n  height: 110px;', '  inset: 100px 60px 90px;').replace('  left: 0;\n  top: 230px;\n  width: 400px;\n  height: 70px;', '  inset: 230px 0 0;'), true],
    [8, 'jen 3 hvězdy ze 7', 'fail', l => l.solution.replace(',\n    226px -88px #ffd56b, 286px -60px #ffd56b, 270px 6px #ffd56b', '')],
    [9, 'transformace v opačném pořadí', 'fail', l => l.solution.replace('scaleY(0.6) rotate(45deg)', 'rotate(45deg) scaleY(0.6)')],
    [9, 'jen rotate', 'fail', l => l.solution.replace('scaleY(0.6) rotate(45deg)', 'rotate(45deg)')],
    [10, 'mřížka bez span', 'fail', l => l.solution.replace(' grid-row: span 2;', '').replace(/ grid-column: span 2;/g, '')],
    [10, 'mapa grid-template-areas', 'master', l => l.solution.replace('  gap: 10px;', '  grid-template-areas: "a b b" "a c d" "e f f";\n  gap: 10px;').replace(' grid-row: span 2;', ' grid-area: a;').replace('.b { background: #f4efe3; grid-column: span 2; }', '.b { background: #f4efe3; grid-area: b; }').replace('.f { background: #f1c40f; grid-column: span 2; }', '.f { background: #f1c40f; grid-area: f; }').replace('.c { background: #f4efe3; }', '.c { background: #f4efe3; grid-area: c; }').replace('.d { background: #1f4e79; }', '.d { background: #1f4e79; grid-area: d; }').replace('.e { background: #f4efe3; }', '.e { background: #f4efe3; grid-area: e; }'), true],
    [11, 'jen hvězda bez hor', 'fail', l => l.solution.replace(/  clip-path: polygon\(0 100%[^;]*;\n/, '')],
    [11, 'zlatý rám přes inset', 'master', l => l.solution.replace('  left: 0;\n  top: 170px;\n  width: 400px;\n  height: 130px;', '  inset: 170px 0 0;'), true],
    [12, 'sova bez uší', 'fail', l => l.solution.replace(/\.sova::before,\n\.sova::after \{[\s\S]*?\}\n\.sova::before[^\n]*\n\.sova::after[^\n]*\n/, '')],
    [12, 'sova bez očí', 'fail', l => l.solution.replace(/  background:\n    radial-gradient[\s\S]*?transparent 30px\);\n/, '')],
    [12, 'uši jako dva prvky navíc', 'master', l => l.solution.replace(/\.sova::before,\n\.sova::after \{/, '.ucho {').replace('.sova::before {', '.ucho.l {').replace('.sova::after {', '.ucho.p {').replace(/\s*content: "";/, ''), false, l => l.html.replace('<div class="sova">', '<div class="sova"><div class="ucho l"></div><div class="ucho p"></div>')]
  ];
  for (const [id, label, want, f, bonus, fh] of tries) {
    const l = L(id);
    const css = f(l);
    const html = fh ? fh(l) : l.html;
    if (css === l.solution && want !== 'master') { ok(false, `${id}. ${l.title}: pokus „${label}“ nic nezměnil`); continue; }
    const r = P.score(cats[id], await P.render(html, css)).score;
    const got = r >= MASTER ? 'master' : r >= PASS ? 'pass' : 'fail';
    ok(got === want, `${id}. ${l.title}: pokus „${label}“ má ${f1(r)} % (${got === 'fail' ? 'nejde pověsit' : got === 'pass' ? 'jde pověsit' : 'mistrovská shoda'})`);
    if (bonus !== undefined) {
      const c = { html, css, rules: P.rules(css), size: P.size(css), els: P.elements(html), stats: { picked: false } };
      ok(!!l.bonus.check(c) === bonus, `${id}. ${l.title}: pokus „${label}“ ${bonus ? 'splní' : 'nesplní'} bonus${l.bonus.limit ? ` (${c.size} / ${l.bonus.limit} znaků)` : ''}`);
    }
  }

  /* ---------- testy na začátku a na konci ---------- */
  const keys = Object.keys(G.CONCEPTS);
  for (const v of ['A', 'B']) {
    const q = G.QUIZ[v];
    ok(q.length === 10, `test ${v}: 10 otázek`);
    ok(keys.every(k => q.filter(x => x.c === k).length === 1), `test ${v}: každý pojem jednou`);
    ok(q.every(x => x.a.length === 4 && x.ok >= 0 && x.ok < 4 && new Set(x.a).size === 4), `test ${v}: 4 různé odpovědi a platná správná`);
  }
  ok(G.QUIZ.A.every((x, i) => x.q !== G.QUIZ.B[i].q), 'varianty A a B mají jiné otázky');
  ok(G.LEVELS.every(l => l.palette.every(p => typeof p === 'string')), 'úryvky jsou text');

  /* ---------- lekce: každá úroveň má úplnou lekci a příklad je platný kód, který neprozradí řešení ---------- */
  window.checkLessons(ok, { label: 'Lekce', levels: window.Gallery.LEVELS, lessons: window.Gallery.LESSONS, kind: 'css', solution: l => l.solution });

  const fails = results.filter(x => !x.ok).length;
  document.getElementById('sum').textContent = `${results.length - fails} z ${results.length} testů prošlo.`;
  document.getElementById('sum').className = fails ? 'bad' : 'ok';
  window.__results = results;
  window.__fails = fails;
  window.__done = true;
})();
