/* Autopilot Orel – automatické testy (otevři tests/test.html v prohlížeči) */
(function () {
  'use strict';
  const S = window.OrelSim;
  const C = window.OrelContent;
  const out = document.getElementById('out');
  const results = [];
  let fails = 0;
  let html = '';
  const log = (ok, text) => {
    results.push({ ok, text });
    if (!ok) fails++;
    html += `<div class="${ok ? 'ok' : 'bad'}">${ok ? '✔' : '✘'} ${String(text).replace(/</g, '&lt;')}</div>`;
  };
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  const lvl = (rules, flights, extra) => Object.assign({ id: 900 + Math.floor(Math.random() * 1e6), fn: 'autopilot', io: 'hv', rules, flights, bonus: { check: () => true } }, extra);
  const fly = (L, code) => S.runLevel(L, code).flights[0];

  /* ---------- fyzika ---------- */
  html += '<h2>Fyzika letu</h2>';
  {
    const f = fly(lvl({ goal: 'land', fuel: 500, timeLimit: 20 }, [{ name: 'T', h: 100, v: 0 }]), `def autopilot(vyska, klesani):\n    return ${S.HOVER}\n`);
    const last = f.frames[f.frames.length - 1];
    log(near(last[1], 100, 0.01) && near(last[2], 0, 0.001), `tah ${S.fmt(S.HOVER, 2)} % udrží Orla ve vznášení (výška ${S.fmt(last[1], 2)} m)`);
    log(near(f.fuelStart - f.fuelLeft, 20 * S.PHYS.BURN * S.HOVER / 100, 0.05), `spotřeba paliva odpovídá tahu (${S.fmt(f.fuelStart - f.fuelLeft, 2)} kg za 20 s)`);
  }
  {
    const f = fly(lvl({ goal: 'land', fuel: 100 }, [{ name: 'T', h: 50, v: 0 }]), 'def autopilot(vyska, klesani):\n    return 0\n');
    const v = Math.sqrt(2 * S.PHYS.G * 50);
    log(!f.ok && f.reason === 'crash' && near(f.touch.v, v, 0.3), `volný pád z 50 m skončí havárií rychlostí ≈ ${S.fmt(v)} m/s (${S.fmt(f.touch.v)})`);
  }
  {
    const f = fly(lvl({ goal: 'land', fuel: 2 }, [{ name: 'T', h: 300, v: 10 }]), 'def autopilot(vyska, klesani):\n    return 100\n');
    log(f.outOfFuel && f.events.some(e => e.type === 'warn' && /palivo/.test(e.text)), 'když dojde palivo, motor zhasne a deník to zapíše');
  }
  {
    const f = fly(lvl({ goal: 'land', fuel: 100 }, [{ name: 'T', h: 100, v: 5 }]), 'def autopilot(vyska, klesani):\n    while True:\n        pass\n');
    log(!f.ok && f.reason === 'alarm1202' && f.error && f.error.type === 'Timeout', 'nekonečná smyčka v autopilotu → PROGRAM ALARM 1202');
  }
  {
    const f = fly(lvl({ goal: 'land', fuel: 100, clamp: 'strict' }, [{ name: 'T', h: 100, v: 5 }]), 'def autopilot(vyska, klesani):\n    return 150\n');
    log(!f.ok && f.reason === 'fault', 'přísný motor: tah 150 % = porucha');
  }
  {
    const f = fly(lvl({ goal: 'land', fuel: 100, int: true }, [{ name: 'T', h: 100, v: 5 }]), 'def autopilot(vyska, klesani):\n    return 50.5\n');
    log(!f.ok && f.reason === 'fault' && /celé číslo/.test(f.msg), 'motor jen na celá čísla: 50.5 = porucha');
  }
  {
    const f = fly(lvl({ goal: 'land', fuel: 100 }, [{ name: 'T', h: 100, v: 5 }]), 'def autopilot(vyska, klesani):\n    x = 1 / 0\n    return 50\n');
    log(!f.ok && f.reason === 'error' && f.error.type === 'ZeroDivisionError' && f.error.line === 2, 'chyba Pythonu v autopilotu se ohlásí i s řádkem');
  }
  {
    const f = fly(lvl({ goal: 'land', fuel: 100 }, [{ name: 'T', h: 100, v: 5 }]), 'def autopilot(vyska, klesani):\n    if vyska < 50:\n        print("blízko", round(vyska))\n    return 0\n');
    log(f.log.length > 0 && /blízko/.test(f.log[0][1]), 'výpis print() se objeví v palubním deníku s časem');
  }
  {
    const L = lvl({ goal: 'land', fuel: 100, ignitions: 3 }, [{ name: 'T', h: 100, v: 5 }]);
    const f = fly(L, 'def autopilot(vyska, klesani):\n    if klesani > 2:\n        return 100\n    return 0\n');
    log(!f.ok && f.reason === 'fault' && f.ignitions === 4, 'čtvrté zapálení motoru s limitem 3 = porucha');
  }
  {
    const L = lvl({ goal: 'land', fuel: 300, pad: { x: 0, w: 10 } }, [{ name: 'T', h: 40, v: 2, x: 30, vx: 0 }], { io: 'hvxv', side: true });
    const f = fly(L, 'def autopilot(vyska, klesani, x, vx):\n    return 40 + 15 * (klesani - 2), 0\n');
    log(!f.ok && f.reason === 'offpad', 'přistání 30 m vedle plochy se nepočítá');
  }

  /* ---------- úrovně ---------- */
  html += '<h2>Úrovně</h2>';
  for (const l of C.LEVELS) {
    log(!!(l.bonus.how || l.hints.some(h => /bonus/i.test(h))), `L${l.id}: hráč se dozví, jak získat bonus`);
    const r = S.runLevel(l, l.solution);
    log(r.allPass, `L${l.id} ${l.title}: vzorové řešení – lety ${r.passed}/${r.total}${l.unit ? `, testy funkce ${r.unit.filter(t => t.pass).length}/${r.unit.length}` : ''}`);
    log(r.allPass && r.bonus, `L${l.id}: bonus „${l.bonus.text}“ jde splnit`);
    const s = S.runLevel(l, l.starter);
    log(!s.allPass && !(s.error && /Syntax|Indentation/.test(s.error.type)), `L${l.id}: výchozí kód je spustitelný, ale úroveň nesplní (${s.missing ? 'chybí ' + s.missing + '()' : s.passed + '/' + s.total + ' letů'})`);
    l.wrong.forEach((w, i) => {
      const x = S.runLevel(l, w);
      log(!x.allPass, `L${l.id}: typická chyba #${i + 1} neprojde (${x.passed}/${x.total} letů${x.unit.length ? `, testy ${x.unit.filter(t => t.pass).length}/${x.unit.length}` : ''})`);
    });
    log(l.hints.length === 3 && l.palette.length >= 3 && l.learn.length === 2 && l.brief.length >= 2, `L${l.id}: má briefing, 3 nápovědy, tahák a úryvky`);
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
  window.checkLessons(log, { label: 'Lekce', levels: window.OrelContent.LEVELS, lessons: window.OrelContent.LESSONS, kind: 'python', solution: l => l.solution });

  html += `<h2 class="${fails ? 'bad' : 'ok'}">${fails ? fails + ' chyb' : 'Vše v pořádku'} – ${results.filter(r => r.ok).length} kontrol</h2>`;
  out.innerHTML = html;
  document.getElementById('summary').innerHTML = `<span class="${fails ? 'bad' : 'ok'}">${fails ? '✘ ' + fails + ' chyb' : '✔ Vše v pořádku'} – ${results.filter(r => r.ok).length} kontrol prošlo</span>`;
  window.__results = results;
  window.__fails = fails;
  window.__done = true;
})();
