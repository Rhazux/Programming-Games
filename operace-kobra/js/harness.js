/*
 * Operace Kobra – testovací rozhraní misí
 * Spustí hráčův kód v Mini-Pythonu, zavolá testovanou funkci s různými vstupy
 * a porovná výsledky se vzorovým řešením. Simuluje i „zařízení“ (trezor, server s alarmem).
 */
(function (global) {
  'use strict';

  const P = global.MiniPython;
  const STEP_LIMIT = 1500000;

  /* simulovaná zařízení, která mise poskytují jako vestavěné funkce */
  const DEVICES = {
    zamek(rt, setup, stats) {
      const pin = setup ? setup.pin : '7351';
      stats.calls = 0;
      rt.set('zamek', rt.builtin('zamek', args => {
        stats.calls++;
        if (args.length !== 1) throw P.err('TypeError', `zamek() takes exactly one argument (${args.length} given)`);
        const p = args[0];
        if (typeof p !== 'string') throw P.err('TypeError', `zamek() potřebuje PIN jako text (str), ne ${P.typeName(p)} – převeď ho pomocí str()`);
        if (stats.calls > 30000) throw P.err('RuntimeError', 'Trezor se zablokoval: příliš mnoho pokusů');
        return p === pin;
      }));
    },
    hadej(rt, setup, stats) {
      const secret = BigInt(setup ? setup.secret : 271828);
      stats.calls = 0;
      rt.set('hadej', rt.builtin('hadej', args => {
        stats.calls++;
        if (stats.calls > 30) throw P.err('RuntimeError', 'ALARM! Víc než 30 pokusů – server smazal důkazy');
        if (args.length !== 1) throw P.err('TypeError', `hadej() takes exactly one argument (${args.length} given)`);
        const n = args[0];
        if (typeof n !== 'bigint' && typeof n !== 'boolean') {
          throw P.err('TypeError', `hadej() potřebuje celé číslo (int), ne ${P.typeName(n)}${typeof n === 'number' ? ' – použij celočíselné dělení // místo /' : ''}`);
        }
        const v = typeof n === 'boolean' ? (n ? 1n : 0n) : n;
        if (v === secret) return 'správně';
        return secret > v ? 'víc' : 'míň';
      }));
    }
  };

  /* přísné porovnání: stejný typ i hodnota (5 ≠ "5", [1] ≠ (1,)) */
  function same(a, b) {
    const ta = P.typeName(a);
    if (ta !== P.typeName(b)) return false;
    if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
    if (a instanceof P.PyTuple) return a.items.length === b.items.length && a.items.every((x, i) => same(x, b.items[i]));
    if (a instanceof P.PyDict) return a.size === b.size && a.entries().every(([k, v]) => b.has(k) && same(v, b.get(k)));
    return P.pyEq(a, b);
  }

  const TYPE_CZ = { int: 'celé číslo (int)', float: 'desetinné číslo (float)', str: 'text (str)', list: 'seznam (list)', dict: 'slovník (dict)', tuple: 'n-tici (tuple)', bool: 'True/False (bool)', NoneType: 'None' };
  function whyDifferent(got, exp, printed) {
    const tg = P.typeName(got);
    const te = P.typeName(exp);
    if (got === null && te !== 'NoneType') {
      return printed ? 'Funkce nic nevrátila (None) – výsledek jen vypsala pomocí print(). Hodnotu je potřeba vrátit: return …'
        : 'Funkce vrátila None – chybí return, nebo se k němu program vůbec nedostal.';
    }
    if (tg !== te) {
      let s = `Čekám ${TYPE_CZ[te] || te}, ale funkce vrátila ${TYPE_CZ[tg] || tg}.`;
      if (tg === 'float' && te === 'int') s += ' Pro celé číslo použij celočíselné dělení // místo /.';
      if ((tg === 'str' && te === 'int') || (tg === 'int' && te === 'str')) s += ' Pozor: "5" (text) a 5 (číslo) nejsou totéž.';
      if (tg === 'tuple' && te === 'list') s += ' Vrať seznam v hranatých závorkách [ ].';
      return s;
    }
    if (te === 'str') {
      let i = 0;
      while (i < got.length && i < exp.length && got[i] === exp[i]) i++;
      if (i === got.length && got.length < exp.length) return `Text je moc krátký – chybí konec od znaku č. ${i + 1}: ${P.repr(exp.slice(i))}.`;
      if (i === exp.length) return `Text je moc dlouhý – navíc je ${P.repr(got.slice(i))}.`;
      return `Text se liší od znaku č. ${i + 1}: máš ${P.repr(got.slice(i, i + 12))}, má být ${P.repr(exp.slice(i, i + 12))}.`;
    }
    if (te === 'list' && got.length !== exp.length) return `Seznam má mít ${exp.length} ${exp.length >= 2 && exp.length <= 4 ? 'prvky' : exp.length === 1 ? 'prvek' : 'prvků'}, tvůj má ${got.length}.`;
    if (te === 'bool') return `Pro tenhle vstup má vyjít ${P.repr(exp)}, tvoje funkce vrátila ${P.repr(got)}.`;
    return `Má vyjít ${P.repr(exp).slice(0, 80)}, tvoje funkce vrátila ${P.repr(got).slice(0, 80)}.`;
  }

  /* očekávané výsledky spočítá vzorové řešení (jednou, pak z mezipaměti) */
  const cache = new Map();
  function expectedFor(m) {
    if (cache.has(m.id)) return cache.get(m.id);
    const rt = new P.Runtime({ maxSteps: STEP_LIMIT * 5 });
    if (m.device) DEVICES[m.device](rt, null, {});
    if (m.prelude) { const r = rt.exec(m.prelude); if (!r.ok) throw new Error('Data mise nejdou načíst: ' + r.error.text); }
    const r = rt.exec(m.solution);
    if (!r.ok) throw new Error('Vzorové řešení mise ' + m.id + ' selhalo: ' + r.error.text);
    rt.takeOutput();
    const vals = m.tests.map(t => {
      if (m.device) DEVICES[m.device](rt, t.setup, {});
      const v = rt.evalExpr(t.call, { maxSteps: STEP_LIMIT * 5 });
      if (!v.ok) throw new Error(`Vzorové řešení mise ${m.id} selhalo v testu ${t.call}: ${v.error.text}`);
      rt.takeOutput();
      return v.value;
    });
    cache.set(m.id, vals);
    return vals;
  }

  /* hlavní funkce: spustí kód hráče a všechny testy mise */
  function runMission(m, code) {
    const res = { output: '', error: null, missingFn: false, tests: [], passed: 0, total: m.tests.length, allPass: false, bonus: false, ast: null, errorTypes: [] };
    try { res.ast = P.parse(code); } catch (e) { res.ast = null; }
    const rt = new P.Runtime({ maxSteps: STEP_LIMIT });
    if (m.device) DEVICES[m.device](rt, null, {});
    if (m.prelude) rt.exec(m.prelude);
    const r = rt.exec(code);
    res.output = rt.takeOutput();
    if (!r.ok) {
      res.error = r.error;
      res.errorTypes.push(r.error.type);
      return res;
    }
    const f = rt.get(m.fn);
    if (!f || P.typeName(f) !== 'function') { res.missingFn = true; return res; }
    const expected = expectedFor(m);
    let stuck = false;
    m.tests.forEach((t, i) => {
      if (stuck) {
        res.tests.push({ call: t.call, hidden: !!t.hidden, setup: t.setup || null, pass: false, skipped: true, expected: P.repr(expected[i]) });
        return;
      }
      const stats = {};
      if (m.device) DEVICES[m.device](rt, t.setup, stats);
      const call = rt.evalExpr(t.call, { maxSteps: STEP_LIMIT });
      const printed = rt.takeOutput();
      const exp = expected[i];
      const tr = { call: t.call, hidden: !!t.hidden, setup: t.setup || null, calls: stats.calls, output: printed, expected: P.repr(exp) };
      if (!call.ok) {
        tr.pass = false;
        tr.error = call.error;
        res.errorTypes.push(call.error.type);
        if (call.error.type === 'Timeout' || call.error.type === 'OutputLimit') stuck = true;   // další testy by se zasekly taky
      } else {
        tr.got = P.repr(call.value);
        tr.pass = same(call.value, exp);
        if (!tr.pass) tr.why = whyDifferent(call.value, exp, printed);
      }
      res.tests.push(tr);
    });
    res.passed = res.tests.filter(t => t.pass).length;
    res.allPass = res.passed === res.total;
    if (res.allPass && res.ast) {
      try { res.bonus = !!m.bonus.check({ ast: res.ast, tests: res.tests, src: code }); } catch (e) { res.bonus = false; }
    }
    return res;
  }

  global.KobraHarness = { runMission, expectedFor, same, DEVICES };
})(typeof window !== 'undefined' ? window : globalThis);
