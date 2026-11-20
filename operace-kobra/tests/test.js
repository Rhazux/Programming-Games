/* Operace Kobra – automatické testy (otevři tests/test.html v prohlížeči) */
(function () {
  'use strict';
  const P = window.MiniPython;
  const C = window.KobraContent;
  const H = window.KobraHarness;
  const out = document.getElementById('out');
  const results = [];
  let fails = 0;
  let html = '';
  const log = (ok, text) => {
    results.push({ ok, text });
    if (!ok) fails++;
    html += `<div class="${ok ? 'ok' : 'bad'}">${ok ? '✔' : '✘'} ${text.replace(/</g, '&lt;')}</div>`;
  };

  html += '<h2>Mini-Python vs. CPython</h2>';
  for (const c of window.CPYTHON_CASES) {
    const rt = new P.Runtime({ maxSteps: 5e6 });
    const r = rt.exec(c.code);
    const err = r.ok ? '' : r.error.text;
    const ok = rt.out === c.out && err === c.err;
    log(ok, `${c.name}${ok ? '' : `\n  CPython: ${JSON.stringify(c.out.slice(0, 200))} ${c.err}\n  Mini:    ${JSON.stringify(rt.out.slice(0, 200))} ${err}`}`);
  }

  html += '<h2>Mise</h2>';
  for (const m of C.MISSIONS) {
    log(!!m.bonus.how && !!m.bonus.example, `M${m.id}: bonus má pro hráče vysvětlení a ukázku`);
    const r = H.runMission(m, m.solution);
    log(r.allPass, `M${m.id} ${m.title}: vzorové řešení ${r.passed}/${r.total}`);
    const rb = m.bonusSolution ? H.runMission(m, m.bonusSolution) : r;
    log(rb.allPass && rb.bonus, `M${m.id}: bonus „${m.bonus.text}“ jde splnit`);
    const s = H.runMission(m, m.starter);
    log(!s.allPass && !(s.error && /Syntax|Indentation/.test(s.error.type)), `M${m.id}: výchozí kód je spustitelný, ale testy neprojdou (${s.passed}/${s.total})`);
    m.wrong.forEach((w, i) => {
      const x = H.runMission(m, w);
      log(!x.allPass, `M${m.id}: typická chyba #${i + 1} neprojde (${x.passed}/${x.total})`);
    });
  }

  /* ---------- lekce: každá úroveň má úplnou lekci a příklad je platný kód, který neprozradí řešení ---------- */
  window.checkLessons(log, { label: 'Lekce', levels: window.KobraContent.MISSIONS, lessons: window.KobraContent.LESSONS, kind: 'python', solution: m => m.solution + '\n' + (m.bonusSolution || '') });

  html += `<h2 class="${fails ? 'bad' : 'ok'}">${fails ? fails + ' chyb' : 'Vše v pořádku'} – ${results.filter(r => r.ok).length} kontrol</h2>`;
  out.innerHTML = html;
  document.getElementById('summary').innerHTML = `<span class="${fails ? 'bad' : 'ok'}">${fails ? '✘ ' + fails + ' chyb' : '✔ Vše v pořádku'} – ${results.filter(r => r.ok).length} kontrol prošlo</span>`;
  window.__results = results;
  window.__fails = fails;
  window.__done = true;
})();
