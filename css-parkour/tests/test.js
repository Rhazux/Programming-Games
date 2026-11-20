/* CSS Parkour – automatické ověření všech levelů (otevři tests/test.html v prohlížeči) */
(async function () {
  'use strict';
  const { LEVELS } = window.ParkourContent;
  const { Stage, analyzeCss } = window.ParkourEngine;
  const out = document.getElementById('out');
  const stage = new Stage(document.getElementById('frame'));
  const results = [];
  let fails = 0;
  const log = (ok, text) => {
    results.push({ ok, text });
    if (!ok) fails++;
    out.innerHTML += `<div class="${ok ? 'ok' : 'bad'}">${ok ? '✔' : '✘'} ${text.replace(/</g, '&lt;')}</div>`;
  };
  out.textContent = '';

  /* doplňkové varianty řešení, které by také měly projít */
  const EXTRA_OK = {
    4: ['.plank {\n  padding: 0 100px;\n}', '.plank {\n  border-right: 200px solid #b45309;\n}'],
    6: ['.dock {\n  justify-content: space-around;\n}'],
    8: ['.row {\n  flex-direction: row-reverse;\n}'],
    9: ['.toolbox {\n  position: static;\n}\n.bridge {\n  position: absolute;\n  left: 300px;\n  top: 300px;\n}'],
    11: ['.bridge-row .plank:nth-child(3),\n.bridge-row .plank:nth-child(6) {\n  height: 18px;\n}', '.plank {\n  height: 18px !important;\n}'],
    12: ['.lift {\n  animation: jizda 1s linear forwards;\n}\n@keyframes jizda {\n  to { transform: translateY(-210px); }\n}',
      '.lift {\n  animation: jizda 2s linear infinite alternate;\n}\n@keyframes jizda {\n  to { transform: translateY(-200px); }\n}',
      '.lift {\n  animation: jizda 4s ease infinite alternate;\n}\n@keyframes jizda {\n  from { transform: translateY(0); }\n  to { transform: translateY(-200px); }\n}',
      '.lift {\n  animation: jizda 5s ease-in-out infinite alternate;\n}\n@keyframes jizda {\n  to { transform: translateY(-200px); }\n}',
      '.lift {\n  animation: jizda 3s infinite;\n}\n@keyframes jizda {\n  50% { transform: translateY(-200px); }\n}']
  };

  async function run(level, css) {
    await stage.load(level, css);
    return stage.start({ sync: true, maxSeconds: (level.timeout || 22) + 2 });
  }

  for (const level of LEVELS) {
    const t0 = performance.now();
    // 1) vzorové řešení vyhraje a sebere všechny mince
    let r = await run(level, level.solution);
    log(r && r.win, `L${level.id} ${level.title}: řešení vyhraje (${r ? r.reason + ', ' + r.time.toFixed(1) + ' s' : 'bez výsledku'})`);
    if (r && r.win) log(r.coins === r.coinsTotal, `L${level.id}: řešení sebere mince ${r.coins}/${r.coinsTotal}`);
    // 2) počet deklarací řešení ≤ maxDecl, bez varování
    await stage.load(level, level.solution);
    const a = analyzeCss(level.solution, stage.doc);
    log(a.decls <= level.maxDecl, `L${level.id}: řešení má ${a.decls} deklarací (limit ${level.maxDecl})`);
    log(a.warnings.length === 0, `L${level.id}: řešení bez varování ${a.warnings.map(w => w.msg).join(' | ')}`);
    // 3) výchozí kód hráče a typické chyby prohrají
    r = await run(level, level.starter);
    log(r && !r.win, `L${level.id}: výchozí kód prohraje (${r ? r.reason : '-'})`);
    for (const wrong of level.wrong) {
      r = await run(level, wrong);
      log(r && !r.win, `L${level.id}: chyba prohraje (${r ? r.reason : '-'}): ${wrong.replace(/\s+/g, ' ')}`);
    }
    for (const extra of EXTRA_OK[level.id] || []) {
      r = await run(level, extra);
      log(r && r.win, `L${level.id}: jiné správné řešení projde (${r ? r.reason + ', ' + r.time.toFixed(1) + ' s' : '-'}): ${extra.replace(/\s+/g, ' ')}`);
    }
    // 4) hráč nesmí podvádět – zamčené kulisy se nehnou
    r = await run(level, level.solution + '\n#stage .lava, .lava, .danger { display: none; width: 0; transform: scale(0); }\n#flag, .flag { left: 30px; top: 264px; }');
    log(r && (r.win === true), `L${level.id}: přepsání kulis nic nezmění (${r ? r.reason : '-'})`);
    r = await run(level, level.starter + '\n.lava, .danger { display: none !important; width: 0 !important; transform: scale(0) !important; }\n#flag { left: 30px !important; }');
    log(r && !r.win, `L${level.id}: ani !important kulisy nepřepíše (${r ? r.reason : '-'})`);
    results.push({ ok: true, text: `L${level.id} hotovo za ${Math.round(performance.now() - t0)} ms` });
  }

  /* analýza CSS – typické chyby začátečníků */
  await stage.load(LEVELS[0], '');
  const chk = (css, needle, label) => {
    const a = analyzeCss(css, stage.doc);
    const hit = a.warnings.some(w => w.msg.includes(needle));
    log(hit, `analýza: ${label} → ${a.warnings.map(w => 'ř.' + w.line + ' ' + w.msg).join(' | ') || 'žádné varování'}`);
  };
  chk('.bridge {\n  width: 320;\n}', 'chybí jednotka', 'chybějící jednotka');
  chk('.bridge {\n  widht: 320px;\n}', 'width', 'překlep ve vlastnosti');
  chk('.brige {\n  width: 320px;\n}', 'nenašel', 'selektor bez prvku');
  chk('.bridge {\n  width 320px;\n}', 'dvojtečka', 'chybějící dvojtečka');
  chk('.bridge {\n  width: 320px\n  height: 10px;\n}', 'středník', 'chybějící středník');
  chk('.bridge {\n  width: 320px;\n', 'Chybí „}“', 'neuzavřený blok');
  chk('.bridge {\n  width: 320px;\n}}', 'Přebývá', 'přebytečná závorka');
  const cnt = analyzeCss('.a { width: 1px; height: 2px; }\n@keyframes k { to { transform: none; } }', stage.doc);
  log(cnt.decls === 3, `analýza: počítání deklarací = ${cnt.decls} (čekám 3)`);

  /* ---------- lekce: každá úroveň má úplnou lekci a příklad je platný kód, který neprozradí řešení ---------- */
  window.checkLessons(log, { label: 'Lekce', levels: window.ParkourContent.LEVELS, lessons: window.ParkourContent.LESSONS, kind: 'css', solution: l => l.solution });

  out.innerHTML += `<h2 class="${fails ? 'bad' : 'ok'}">${fails ? fails + ' chyb' : 'Vše v pořádku'} – ${results.filter(r => r.ok).length} kontrol</h2>`;
  document.getElementById('summary').innerHTML = `<span class="${fails ? 'bad' : 'ok'}">${fails ? '✘ ' + fails + ' chyb' : '✔ Vše v pořádku'} – ${results.filter(r => r.ok).length} kontrol prošlo</span>`;
  window.__results = results;
  window.__fails = fails;
  window.__done = true;
})();
