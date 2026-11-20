/* Async Bistro – automatické testy (otevři tests/test.html v prohlížeči) */
(async function () {
  'use strict';
  const B = window.Bistro;
  const C = window.BistroContent;
  const out = document.getElementById('out');
  const results = [];
  let fails = 0;
  let html = '';
  const log = (ok, text) => {
    results.push({ ok, text });
    if (!ok) fails++;
    html += `<div class="${ok ? 'ok' : 'bad'}">${ok ? '✔' : '✘'} ${String(text).replace(/</g, '&lt;')}</div>`;
  };
  const lvl = (orders, extra, sc) => Object.assign({ id: 900, entry: 'smena', rules: { start: 12 }, recipes: ['špagety', 'toust'], stations: [], bonus: { check: () => true }, shifts: [Object.assign({ name: 'T', orders }, sc)] }, extra);
  const shift = async (L, code) => (await B.runLevel(L, code)).shifts[0];
  const o = (stul, jidlo, limit) => ({ stul, jidlo, limit });

  /* ---------- kuchyně ---------- */
  html += '<h2>Kuchyně a virtuální čas</h2>';
  {
    const s = await shift(lvl([o(1, 'káva', 5)], { entry: 'obsluz' }), 'async function obsluz(o) { podej(o, kavovar()); }');
    log(!s.ok && /Promise/.test(s.error.msg) && s.error.line === 1, 'podání bez await: chyba „Podáváš Promise“ na řádku 1');
  }
  {
    const s = await shift(lvl([o(1, 'špagety', 20)]), "async function smena(ob) {\n  const t = await plotna('těstoviny');\n  const m = await plotna('omáčka');\n  podej(ob[0], sloz(t, m));\n}");
    const p = await shift(lvl([o(1, 'špagety', 20)]), "async function smena(ob) {\n  const [t, m] = await Promise.all([plotna('těstoviny'), plotna('omáčka')]);\n  podej(ob[0], sloz(t, m));\n}");
    log(s.ok && s.servedAll === 14 && p.ok && p.servedAll === 8, `po sobě 14 min, přes Promise.all 8 min (${s.servedAll} / ${p.servedAll})`);
  }
  {
    const s = await shift(lvl([o(1, 'káva', 20), o(2, 'káva', 20), o(3, 'káva', 20)]), 'async function smena(ob) { await Promise.all(ob.map(async x => podej(x, await kavovar()))); }');
    log(s.ok && s.orders.map(x => x.servedAt).join() === '2,4,6' && s.jobs.some(j => j.start > j.queuedAt), 'obsazená stanice: další práce čeká ve frontě (2, 4, 6 min)');
  }
  {
    const s = await shift(lvl([o(1, 'pizza', 30)], {}, { burn: [1] }), "async function smena(ob) { podej(ob[0], await trouba('pizza')); }");
    log(!s.ok && s.reason === 'burnt' && s.burnt === 1, 'spálená pizza bez try/catch shodí směnu');
  }
  {
    const s = await shift(lvl([o(1, 'polévka', 30), o(2, 'polévka', 30), o(3, 'polévka', 30)]), "async function smena(ob) { await Promise.all(ob.map(async x => rozvez(x, await plotna('polévka')))); }");
    log(!s.ok && s.rejected >= 1 && s.reason === 'courier', 'třetí současný rozvoz: „Žádný volný kurýr“');
  }
  {
    const s = await shift(lvl([o(1, 'káva', 5)]), 'async function smena(ob) { ob.forEach(async x => podej(x, await kavovar())); }');
    log(!s.ok && s.orders[0].status === 'closed', 'práce bez await po konci funkce smena se nepočítá (stav „po zavíračce“)');
  }
  {
    const s = await shift(lvl([o(1, 'káva', 5)]), 'async function smena(ob) { await new Promise(() => {}); }');
    log(!s.ok && s.reason === 'deadlock', 'await na slib, který se nikdy nesplní → kuchyně stojí');
  }
  {
    const s = await shift(lvl([o(1, 'káva', 5)]), 'async function smena(ob) {\n  let i = 0;\n  while (i < 5) { }\n}');
    log(!s.ok && s.error && s.error.type === 'NekonečnýCyklus' && s.error.line === 3, 'nekonečný while se zastaví a ukáže řádek 3');
  }
  {
    const s = await shift(lvl([o(1, 'káva', 5)]), "async function smena(ob) {\n  podej(ob[0], await kavovar();\n}");
    log(!s.ok && s.reason === 'syntax' && s.error.line === 2, `chyba syntaxe se ohlásí s řádkem (${s.error && s.error.line})`);
  }
  {
    const s = await shift(lvl([o(1, 'toust', 20), o(2, 'špagety', 20)], { rules: { start: 12, together: true } }), "async function smena(ob) {\n  const [c, s] = await Promise.all([trouba('chléb'), prkenko('sýr')]);\n  podej(ob[0], sloz(c, s));\n  const [t, m] = await Promise.all([plotna('těstoviny'), plotna('omáčka')]);\n  podej(ob[1], sloz(t, m));\n}");
    log(!s.ok && s.reason === 'together', 'pravidlo „celý stůl najednou“ odhalí postupné podávání');
  }
  {
    const L = lvl([o(1, 'rizoto', 9)], { recipes: ['rizoto'], rules: { start: 18, freshWithin: 3 } }, { supplier: { 'lanýž': 2 }, stock: ['lanýž'] });
    const s = await shift(L, "async function smena(ob) { podej(ob[0], sloz(await plotna('rýže'), zasoba('lanýž'))); }");
    log(!s.ok && s.orders[0].status === 'wrong', 'mražený lanýž, i když čerstvý dorazil do 3 minut → špatně');
  }
  {
    const s = await shift(lvl([o(1, 'káva', 5)]), "async function smena(ob) { console.log('ahoj', 42); podej(ob[0], await kavovar()); }");
    log(s.ok && s.log.some(l => l[2] === 'log' && /ahoj 42/.test(l[1])), 'console.log jde do deníku s časem');
  }
  {
    const s = await shift(lvl([o(1, 'toust', 9)]), "async function smena(ob) { podej(ob[0], sloz(await trouba('chléb'), await plotna('omáčka'))); }");
    log(!s.ok && /nesložíš/.test(s.error && s.error.msg), 'neexistující recept: srozumitelná chyba sloz()');
  }

  /* ---------- úrovně ---------- */
  html += '<h2>Úrovně</h2>';
  for (const l of C.LEVELS) {
    log(!!(l.bonus.how || l.hints.some(h => /bonus/i.test(h))), `L${l.id}: hráč se dozví, jak získat bonus`);
    const r = await B.runLevel(l, l.solution);
    log(r.allPass, `L${l.id} ${l.title}: vzorové řešení – směny ${r.passed}/${r.total}`);
    log(r.allPass && r.bonus, `L${l.id}: bonus „${l.bonus.text}“ jde splnit`);
    const s = await B.runLevel(l, l.starter);
    log(!s.allPass && !(s.shifts[0] && s.shifts[0].reason === 'syntax'), `L${l.id}: výchozí kód je spustitelný, ale úroveň nesplní (${s.passed}/${s.total})`);
    for (let i = 0; i < l.wrong.length; i++) {
      const x = await B.runLevel(l, l.wrong[i]);
      log(!x.allPass, `L${l.id}: typická chyba #${i + 1} neprojde (${x.passed}/${x.total} směn)`);
    }
    log(l.hints.length === 3 && l.palette.length >= 3 && l.learn.length === 2 && l.brief.length >= 2, `L${l.id}: má briefing, 3 nápovědy, kuchařku a úryvky`);
  }

  /* ---------- kvíz ---------- */
  html += '<h2>Vstupní a výstupní test</h2>';
  ['A', 'B'].forEach(form => {
    const Q = C.QUIZ[form];
    log(Q.length === 10, `varianta ${form}: 10 otázek`);
    log(Q.every(q => q.ok >= 0 && q.ok < q.a.length && new Set(q.a).size === q.a.length), `varianta ${form}: každá otázka má platnou a jedinečnou správnou odpověď`);
    log(Object.keys(C.CONCEPTS).every(c => Q.filter(q => q.c === c).length === 1), `varianta ${form}: každá dovednost má právě jednu otázku`);
  });

  /* ---------- lekce: každá úroveň má úplnou lekci a příklad je platný kód, který neprozradí řešení ---------- */
  window.checkLessons(log, { label: 'Lekce', levels: window.BistroContent.LEVELS, lessons: window.BistroContent.LESSONS, kind: 'async', solution: l => l.solution });

  html += `<h2 class="${fails ? 'bad' : 'ok'}">${fails ? fails + ' chyb' : 'Vše v pořádku'} – ${results.filter(r => r.ok).length} kontrol</h2>`;
  out.innerHTML = html;
  document.getElementById('summary').innerHTML = `<span class="${fails ? 'bad' : 'ok'}">${fails ? '✘ ' + fails + ' chyb' : '✔ Vše v pořádku'} – ${results.filter(r => r.ok).length} kontrol prošlo</span>`;
  window.__results = results;
  window.__fails = fails;
  window.__done = true;
})();
