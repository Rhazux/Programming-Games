/* Web Studio Tycoon – automatické testy (otevři tests/test.html v prohlížeči) */
(async function () {
  'use strict';
  const S = window.Studio;
  const C = window.StudioContent;
  const frame = document.getElementById('frame');
  const out = document.getElementById('out');
  const results = [];
  let fails = 0;
  let html = '';
  const log = (ok, text) => {
    results.push({ ok, text });
    if (!ok) fails++;
    html += `<div class="${ok ? 'ok' : 'bad'}">${ok ? '✔' : '✘'} ${String(text).replace(/</g, '&lt;')}</div>`;
    out.innerHTML = html;
  };
  const codeOf = (o, part) => ({ html: (part && part.html) ?? o.html, css: (part && part.css) ?? o.css, js: (part && part.js) ?? o.js });

  /* --- běhové prostředí --- */
  html += '<h2>Běhové prostředí</h2>';
  const inst = S.instrumentLoops('let i = 0;\nwhile (i < 3) { i++; }\nfor (let j = 0; j < 2; j++) {}\nfor (;;) { break; }\nfor (const x of [1, 2]) {}\nconst s = "while (true)"; // for (;;)\n');
  log(inst.split('\n').length === 7 && inst.includes('while (__g() && (i < 3))') && inst.includes('for (let j = 0; __g() && ( j < 2); j++)') && inst.includes('for (; __g();)') && inst.includes('for (const x of [1, 2])') && inst.includes('"while (true)"'), 'instrumentace cyklů nemění řádky ani texty v uvozovkách: ' + inst.replace(/\n/g, ' ⏎ '));
  await S.loadFrame(frame, S.buildDoc({ html: '<p id="x"></p>', css: '', js: 'let n = 0;\nwhile (true) { n++; }\ndocument.querySelector("#x").textContent = "konec";' }));
  let errs = frame.contentWindow.__log.filter(l => l.kind === 'error');
  log(errs.length === 1 && /nekonečný cyklus/.test(errs[0].msg) && errs[0].line === 2, `nekonečný cyklus se zastaví a nahlásí na ř. 2: ${errs.map(e => e.msg + ' @' + e.line).join(' | ')}`);
  await S.loadFrame(frame, S.buildDoc({ html: '<button id="b">x</button>', css: '', js: '// komentář\nconst b = document.querySelector("#b");\nb.addEventListener("click", function () {\n  nedefinovano();\n});' }));
  frame.contentDocument.querySelector('#b').click();
  errs = frame.contentWindow.__log.filter(l => l.kind === 'error');
  log(errs.length === 1 && /nedefinovano is not defined/.test(errs[0].msg) && errs[0].line === 4, `chyba v obsluze události hlásí správný řádek (4): ${errs.map(e => e.msg + ' @' + e.line).join(' | ')}`);
  log(/neexistuje/.test(S.explainJs(errs[0] && errs[0].msg)), 'české vysvětlení ReferenceError');
  await S.loadFrame(frame, S.buildDoc({ html: '', css: '', js: 'const a = 1;\nconst b = ;\n' }));
  errs = frame.contentWindow.__log.filter(l => l.kind === 'error');
  log(errs.length === 1 && /SyntaxError/.test(errs[0].msg) && errs[0].line === 2, `syntaktická chyba hlásí řádek 2: ${errs.map(e => e.msg + ' @' + e.line).join(' | ')}`);
  await S.loadFrame(frame, S.buildDoc({ html: '<p id="p"></p>', css: '', js: 'document.querySelector("#neni").textContent = "x";' }));
  errs = frame.contentWindow.__log.filter(l => l.kind === 'error');
  log(errs.length === 1 && /nenašel/.test(S.explainJs(errs[0].msg)), `null z querySelector se vysvětlí: ${errs.map(e => e.msg).join(' | ')}`);
  await S.loadFrame(frame, S.buildDoc({ html: '<form><button id="o">Odeslat</button></form>', css: '', js: 'console.log("ahoj", 42, [1, 2]);' }));
  frame.contentDocument.querySelector('#o').click();
  const lg = frame.contentWindow.__log;
  log(lg.some(l => l.kind === 'log' && l.msg === 'ahoj 42 [1,2]') && lg.some(l => l.kind === 'warn' && /preventDefault/.test(l.msg)) && !!frame.contentDocument.querySelector('#o'), 'console.log se zachytí a odeslání formuláře stránku nezničí');
  const v = S.validateHtml('<h1>Ahoj</h2>\n<ul>\n  <li>a\n</ul>\n<buton>x</buton>\n<img src="a.png">\n<p id="x">1</p><p id="x">2</p>\n<a href="x>odkaz</a>\n<div>');
  const msgs = v.map(w => w.line + ':' + w.msg).join(' | ');
  log(/neuzavřen|nemá k sobě/.test(msgs) && /<button>/.test(msgs) && /alt/.test(msgs) && /podruhé/.test(msgs) && /uvozovka/.test(msgs) && /<div> z řádku/.test(msgs), 'kontrola HTML najde typické chyby: ' + msgs);

  /* --- zakázky --- */
  html += '<h2>Zakázky</h2>';
  for (const o of C.ORDERS) {
    const sol = codeOf(o, o.solution);
    const r = await S.runChecks(o, sol, frame);
    const wishR = r.results.find(x => x.wish);
    log(!!wishR && wishR.pass, `Z${o.id}: vzorové řešení splní i přání navíc „${o.wish.text}“${wishR && !wishR.pass ? ' → ' + wishR.msg : ''}`);
    log(!!(o.wish.how && o.wish.example), `Z${o.id}: přání navíc má vysvětlení a ukázku pro hráče`);
    const failed = r.results.filter(x => !x.pass);
    log(failed.length === 0, `Z${o.id} ${o.client.business}: vzorové řešení splní ${r.results.length - failed.length}/${r.results.length}${failed.map(f => ' | ' + f.text + ' → ' + f.msg).join('')}`);
    log(r.errors.length === 0, `Z${o.id}: vzorové řešení bez chyb v konzoli ${r.errors.map(e => e.msg).join(' | ')}`);
    const vw = S.validateHtml(sol.html);
    log(vw.length === 0, `Z${o.id}: HTML řešení bez varování ${vw.map(w => w.line + ':' + w.msg).join(' | ')}`);
    const st = await S.runChecks(o, codeOf(o), frame);
    const stFail = st.results.filter(x => !x.pass && !x.wish);
    log(stFail.length > 0, `Z${o.id}: výchozí kód nesplní požadavky (${stFail.length} nesplněno, např. „${stFail[0] && stFail[0].msg}“)`);
    for (const [i, w] of o.wrong.entries()) {
      const x = await S.runChecks(o, codeOf(o, w), frame);
      const xf = x.results.filter(y => !y.pass && !y.wish);
      log(xf.length > 0, `Z${o.id}: typická chyba #${i + 1} neprojde → ${xf[0] ? xf[0].msg : 'PROŠLA!'}`);
    }
  }
  /* ---------- lekce: každá úroveň má úplnou lekci a příklad je platný kód, který neprozradí řešení ---------- */
  window.checkLessons(log, { label: 'Lekce', levels: window.StudioContent.ORDERS, lessons: window.StudioContent.LESSONS, kind: 'web', solution: o => typeof o.solution === 'object' ? Object.values(o.solution).join('\n') : String(o.solution) });

  html += `<h2 class="${fails ? 'bad' : 'ok'}">${fails ? fails + ' chyb' : 'Vše v pořádku'} – ${results.filter(r => r.ok).length} kontrol</h2>`;
  out.innerHTML = html;
  document.getElementById('summary').innerHTML = `<span class="${fails ? 'bad' : 'ok'}">${fails ? '✘ ' + fails + ' chyb' : '✔ Vše v pořádku'} – ${results.filter(r => r.ok).length} kontrol prošlo</span>`;
  window.__results = results;
  window.__fails = fails;
  window.__done = true;
})();
