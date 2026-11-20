/*
 * Testy úrovní: zadání neprojde, vzorové řešení projde i s bonusem,
 * typické chyby skončí přesně na očekávaných kontrolách. Plus testy auditoru přístupnosti.
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
  const W = window.WBB;
  const solutionOf = l => W.applyFix(l.files, l.fix);
  const failed = r => r.checks.filter(c => !c.ok).map(c => c.id || c.text);
  const ids = (l, r) => r.checks.map((c, i) => (c.ok ? null : l.checks[i].id)).filter(Boolean);

  /* ---------- auditor ---------- */
  const frameFiles = html => ({ html, css: '', js: '' });
  const probe = await (async () => {
    const lvl = { checks: [{ id: 'x', who: 'karel', text: 'x', run: () => true }] };
    return A11y.test(lvl, frameFiles(`<!doctype html><html lang="cs"><head><title>T</title></head><body>
      <h1>Nadpis</h1><nav><a href="#a">A</a></nav><main><label for="i">Jméno</label><input id="i" required>
      <label><input type="checkbox"> Souhlas</label><button aria-expanded="false">Více</button>
      <img src="x.png"><img src="y.png" alt=""><a href="#"><svg><title>Domů</title></svg></a></main></body></html>`), document.body);
  })();
  const texts = probe.lines.map(l => l.text);
  ok(texts[0] === 'stránka, T', 'čtečka začne názvem stránky: ' + texts[0]);
  ok(texts.includes('nadpis úroveň 1, Nadpis'), 'čtečka čte nadpis s úrovní');
  ok(texts.includes('editační pole, Jméno, povinné, prázdné'), 'pole s popiskem a required: ' + texts.find(t => /editační/.test(t)));
  ok(texts.includes('zaškrtávací políčko, Souhlas, nezaškrtnuto'), 'obalující label u políčka');
  ok(texts.includes('tlačítko, Více, sbaleno'), 'aria-expanded čte stav');
  ok(texts.some(t => /^obrázek bez popisu, x\.png$/.test(t)), 'obrázek bez altu');
  ok(!texts.some(t => /y\.png/.test(t)), 'obrázek s alt="" se přeskočí');
  ok(texts.includes('odkaz, Domů'), 'jméno odkazu ze SVG title');
  ok(texts.includes('oblast navigace') && texts.includes('oblast hlavní obsah'), 'oblasti stránky');
  ok(Math.abs(A11y.contrastColors(A11y.fromHex('#767676'), A11y.fromHex('#ffffff')) - 4.54) < 0.02, 'kontrast #767676 na bílé ≈ 4,54');
  ok(A11y.contrastColors(A11y.fromHex('#000000'), A11y.fromHex('#ffffff')) > 20.9, 'černá na bílé 21 : 1');
  const sug = A11y.suggest('#999999', '#ffffff', 4.5);
  ok(sug && A11y.contrastColors(A11y.fromHex(sug), A11y.fromHex('#ffffff')) >= 4.5, 'návrh barvy splní kontrast: ' + sug);
  ok(/__g\(\) && \(true\)/.test(A11y.instrumentLoops('while (true) { x++; }')), 'pojistka cyklu while');

  /* ---------- úrovně ---------- */
  ok(W.LEVELS.length === 12, 'úrovní je 12');
  for (const l of W.LEVELS) {
    ok(!!(l.bonus.how || l.hints.some(h => /bonus/i.test(h))), `Ú${l.id}: hráč se dozví, jak získat bonus`);
    const tag = `Ú${l.id} ${l.title}`;
    // obsah úrovně
    ok(l.hints.length === 3 && l.learn.length === 3 && l.brief.length >= 3 && l.palette.length && l.task && l.reward, `${tag}: má zadání, briefing, 3 nápovědy, tahák a úryvky`);
    ok(l.checks.every(c => c.id && W.PERSONAS[c.who] || c.who === 'klient'), `${tag}: každá kontrola má id a testera`);
    ok(new Set(l.checks.map(c => c.id)).size === l.checks.length, `${tag}: id kontrol jsou jedinečná`);
    let sol;
    try { sol = solutionOf(l); ok(true, `${tag}: řešení jde sestavit`); } catch (e) { ok(false, `${tag}: řešení: ${e.message}`); continue; }
    // zadání
    const r0 = await A11y.test(l, l.files, document.body);
    ok(!r0.allPass, `${tag}: zadání neprojde (${r0.passed}/${r0.total}, padá ${ids(l, r0).join(', ')})`);
    ok(!r0.errors.length, `${tag}: zadání běží bez chyby JS ${r0.errors.map(e => e.msg).join('; ')}`);
    // řešení
    const r1 = await A11y.test(l, sol, document.body);
    ok(r1.allPass, `${tag}: řešení projde (${r1.passed}/${r1.total}${r1.allPass ? '' : ', padá ' + ids(l, r1).join(', ') + ' :: ' + r1.checks.filter(c => !c.ok).map(c => c.fix).join(' | ')}${r1.errors.length ? ' JS: ' + r1.errors.map(e => e.msg).join('; ') : ''})`);
    ok(r1.bonus, `${tag}: řešení má bonus`);
    const badC = r1.contrast.filter(c => !c.ok);
    ok(!badC.length, `${tag}: v řešení má všechen text dost kontrastu ${badC.map(c => `${c.text} ${c.fg}/${c.bg} ${c.ratio.toFixed(2)}`).join('; ')}`);
    // typické chyby
    for (const w of l.wrong || []) {
      let files;
      try { files = W.applyFix(w.base === 'starter' ? l.files : sol, w.fix); } catch (e) { ok(false, `${tag} / ${w.label}: ${e.message}`); continue; }
      const r = await A11y.test(l, files, document.body);
      const f = ids(l, r);
      if (w.expect.error) ok(r.errors.length && !r.allPass, `${tag} / ${w.label}: chyba JS (${r.errors.map(e => e.msg).join('; ')})`);
      else if (w.expect.pass) ok(r.allPass && (w.expect.bonus === undefined || r.bonus === w.expect.bonus), `${tag} / ${w.label}: projde, bonus ${r.bonus} (padá ${f.join(', ') || 'nic'})`);
      else ok(!r.allPass && JSON.stringify(f.slice().sort()) === JSON.stringify(w.expect.fail.slice().sort()), `${tag} / ${w.label}: padá ${f.join(', ')} (čekáno ${w.expect.fail.join(', ')})`);
    }
  }
  // test, že kontroly vracejí české zprávy s mluvčím
  const l1 = W.LEVELS[0];
  const r = await A11y.test(l1, l1.files, document.body);
  const c = r.checks.find(x => !x.ok);
  ok(c && c.say && c.fix, 'neúspěšná kontrola vrací větu testera i radu: ' + (c ? c.say : ''));

  /* ---------- lekce: každá úroveň má úplnou lekci a příklad je platný kód, který neprozradí řešení ---------- */
  window.checkLessons(ok, { label: 'Lekce', levels: window.WBB.LEVELS, lessons: window.WBB.LESSONS, kind: 'web', solution: l => JSON.stringify(l.fix || '') });

  const fails = results.filter(x => !x.ok).length;
  document.getElementById('sum').textContent = `${results.length - fails} z ${results.length} testů prošlo.`;
  document.getElementById('sum').className = fails ? 'bad' : 'ok';
  window.__results = results;
  window.__fails = fails;
  window.__done = true;
})();
