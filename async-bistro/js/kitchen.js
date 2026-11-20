/*
 * Async Bistro – kuchyně s virtuálním časem
 * Hráčův JavaScript (async/await) volá kuchyňské stanice. Každá stanice vrací Promise,
 * která se splní, až virtuální hodiny dojdou na konec přípravy. Simulace je deterministická,
 * běží zlomek sekundy a zaznamená časovou osu (pro Ganttův diagram) i všechny podané objednávky.
 */
(function (global) {
  'use strict';

  /* ---------------- stanice a recepty ---------------- */
  const STATIONS = {
    kavovar: { name: 'Kávovar', icon: '☕', cap: 1, items: { 'káva': 2 } },
    prkenko: { name: 'Prkénko', icon: '🔪', cap: 1, items: { 'sýr': 2, 'salát': 2, 'rajče': 2, 'šunka': 2, 'cibule': 2 } },
    trouba: { name: 'Trouba', icon: '♨️', cap: 1, items: { 'chléb': 3, 'houska': 3, 'pizza': 7, 'koláč': 8 } },
    plotna: { name: 'Plotna', icon: '🔥', cap: 2, items: { 'těstoviny': 8, 'omáčka': 6, 'polévka': 5, 'vajíčko': 4, 'rýže': 6 } },
    friteza: { name: 'Fritéza', icon: '🍟', cap: 1, items: { 'hranolky': 4, 'maso': 5 } },
    dodavatel: { name: 'Dodavatel', icon: '🚚', cap: 9, items: {} },
    kuryr: { name: 'Kurýři', icon: '🛵', cap: 2, hard: true, items: {} }
  };
  /* jídla, která jdou rovnou na talíř (bez skládání) */
  const DIRECT = { 'káva': 'kavovar', 'vajíčko': 'plotna', 'polévka': 'plotna', 'pizza': 'trouba', 'hranolky': 'friteza', 'koláč': 'trouba' };
  /* složená jídla: z čeho a odkud */
  const RECIPES = {
    'toust': [['chléb', 'trouba'], ['sýr', 'prkenko']],
    'bruschetta': [['chléb', 'trouba'], ['rajče', 'prkenko']],
    'špagety': [['těstoviny', 'plotna'], ['omáčka', 'plotna']],
    'burger': [['maso', 'friteza'], ['houska', 'trouba'], ['salát', 'prkenko']],
    'rizoto': [['rýže', 'plotna'], ['lanýž', null]]
  };
  const FROM_CZ = { kavovar: 'z kávovaru', prkenko: 'z prkénka', trouba: 'z trouby', plotna: 'z plotny', friteza: 'z fritézy', dodavatel: 'od dodavatele', zasoba: 'ze zásoby', sloz: 'složené' };
  const recipeText = name => RECIPES[name].map(([n, s]) => `${n} ${s ? FROM_CZ[s] : ''}`.trim()).join(' + ');

  /* ---------------- ochrana proti nekonečným cyklům (vloží __g() do podmínek while/for) ---------------- */
  const ID_START = /[A-Za-z_$À-￿]/;
  const ID_CHAR = /[A-Za-z0-9_$À-￿]/;
  function skipLiteral(src, i) {
    const c = src[i];
    const n = src.length;
    if (c === '/' && src[i + 1] === '/') { const j = src.indexOf('\n', i); return j < 0 ? n : j; }
    if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); return j < 0 ? n : j + 2; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
      return Math.min(n, j + 1);
    }
    if (c === '`') {
      let j = i + 1;
      while (j < n && src[j] !== '`') {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '$' && src[j + 1] === '{') {
          let depth = 1;
          j += 2;
          while (j < n && depth) {
            const k = skipLiteral(src, j);
            if (k >= 0) { j = k; continue; }
            if (src[j] === '{') depth++;
            else if (src[j] === '}') depth--;
            j++;
          }
          continue;
        }
        j++;
      }
      return Math.min(n, j + 1);
    }
    return -1;
  }
  function matchParen(src, open) {
    let depth = 0;
    for (let j = open; j < src.length; j++) {
      const k = skipLiteral(src, j);
      if (k >= 0) { j = k - 1; continue; }
      if (src[j] === '(') depth++;
      else if (src[j] === ')') { depth--; if (depth === 0) return j; }
    }
    return -1;
  }
  function splitTop(s, sep) {
    const parts = [];
    let depth = 0;
    let last = 0;
    for (let j = 0; j < s.length; j++) {
      const k = skipLiteral(s, j);
      if (k >= 0) { j = k - 1; continue; }
      const c = s[j];
      if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) depth--;
      else if (c === sep && depth === 0) { parts.push(s.slice(last, j)); last = j + 1; }
    }
    parts.push(s.slice(last));
    return parts;
  }
  function instrumentLoops(src) {
    let out = '';
    let i = 0;
    const n = src.length;
    while (i < n) {
      const k = skipLiteral(src, i);
      if (k >= 0) { out += src.slice(i, k); i = k; continue; }
      const c = src[i];
      if (ID_START.test(c) && (i === 0 || !ID_CHAR.test(src[i - 1]))) {
        let j = i + 1;
        while (j < n && ID_CHAR.test(src[j])) j++;
        const w = src.slice(i, j);
        const prevDot = /\.\s*$/.test(src.slice(Math.max(0, i - 3), i));
        if ((w === 'while' || w === 'for') && !prevDot) {
          let p = j;
          while (p < n && /\s/.test(src[p])) p++;
          if (src[p] === '(') {
            const close = matchParen(src, p);
            if (close > 0) {
              const head = src.slice(p + 1, close);
              let newHead = head;
              if (w === 'while') newHead = `__g() && (${head})`;
              else {
                const parts = splitTop(head, ';');
                if (parts.length === 3) newHead = `${parts[0]};${parts[1].trim() ? ` __g() && (${parts[1]})` : ' __g()'};${parts[2]}`;
                else newHead = head.replace(/^(\s*(?:const|let|var)?\s*[\w$\s,[\]{}:]+?\s+of\s+)([\s\S]+)$/, '$1__gi($2)');
              }
              out += src.slice(i, p + 1) + instrumentLoops(newHead) + ')';
              i = close + 1;
              continue;
            }
          }
        }
        out += w;
        i = j;
        continue;
      }
      out += c;
      i++;
    }
    return out;
  }
  /* kód bez řetězců a komentářů (pro bonusové kontroly) */
  function stripCode(src) {
    let out = '';
    let i = 0;
    while (i < src.length) {
      const k = skipLiteral(src, i);
      if (k >= 0) { const lit = src.slice(i, k); out += lit[0] === '`' ? lit.replace(/[^`$\n{}]/g, ' ') : lit.replace(/[^\n]/g, ' '); i = k; continue; }
      out += src[i];
      i++;
    }
    return out;
  }

  /* ---------------- chyby JavaScriptu česky ---------------- */
  function explainJs(msg) {
    let m;
    const s = String(msg || '').replace(/^Uncaught\s+/, '');
    if (/Podáváš Promise|ještě není hotov/.test(s)) return 'Funkce stanice vrací Promise – slib, že jídlo bude. Hotové jídlo dostaneš, až na ni počkáš: `const jidlo = await trouba(…)`.';
    if ((m = /ReferenceError: (\S+) is not defined/.exec(s))) return `Jméno „${m[1]}“ neexistuje. Překlep? Pozor na háčky a velká písmena (\`prkenko\`, ne \`prkénko\`). Nebo proměnnou používáš dřív, než ji vytvoříš.`;
    if ((m = /Cannot (?:read|set) properties of undefined \((?:reading|setting) '(.+?)'\)/.exec(s))) return `Hodnota je \`undefined\` – sahá se do ní pro „${m[1]}“. Překlep v názvu vlastnosti (\`objednavka.jidlo\`)? Nebo pole nemá prvek s tímhle indexem?`;
    if ((m = /Cannot (?:read|set) properties of null/.exec(s))) return 'Hodnota je `null` – pracuješ s něčím, co neexistuje.';
    if ((m = /TypeError: (.+?) is not a function/.exec(s))) return `„${m[1]}“ není funkce. Překlep v názvu? \`Promise.all\` a \`Promise.race\` se píšou s velkým P.`;
    if (/is not iterable/.test(s)) return 'Rozbaluješ nebo procházíš něco, co není pole. Nezapomněl(a) jsi `await` před `Promise.all(…)`? A `Promise.all` potřebuje pole: `Promise.all([a, b])`.';
    if (/await is only valid in async functions/.test(s)) return '`await` jde použít jen uvnitř funkce označené `async`: `async function obsluz(…) { … }`.';
    if (/Assignment to constant variable/.test(s)) return 'Do proměnné vytvořené přes `const` nejde znovu přiřadit. Když se má hodnota měnit, použij `let`.';
    if ((m = /Identifier '(.+?)' has already been declared/.exec(s))) return `Proměnnou nebo funkci „${m[1]}“ vytváříš dvakrát. Podruhé už jen přiřaď, nebo ji pojmenuj jinak.`;
    if (/missing \) after argument list/.test(s)) return 'Chybí zavírací závorka `)` za argumenty funkce – nebo čárka mezi argumenty.';
    if (/Unexpected end of input/.test(s)) return 'Kód skončil uprostřed – nejspíš chybí zavírací `}` nebo `)`.';
    if (/Invalid or unexpected token/.test(s)) return 'Neplatný znak – často neukončený text (chybí uvozovka) nebo typografické uvozovky „ “ místo `" "`.';
    if (/Unexpected token|Unexpected identifier|Unexpected string|Unexpected number/.test(s)) return 'Chyba v zápisu kódu – zkontroluj závorky, čárky a uvozovky kolem řádku s chybou.';
    if (/Maximum call stack size exceeded/.test(s)) return 'Funkce volá sama sebe pořád dokola (nekonečná rekurze).';
    if (/nekonečný cyklus/.test(s)) return 'Cyklus nikdy neskončí – podmínka `while`/`for` zůstává pořád pravdivá. Měníš uvnitř cyklu proměnnou z podmínky?';
    if (/Cannot access '(.+?)' before initialization/.test(s)) return 'Proměnnou používáš dřív, než je vytvořená (`let`/`const`). Přesuň deklaraci výš.';
    if (/spálil|Spálen/.test(s)) return 'Trouba jídlo spálila a Promise skončila chybou. Chybu chyť pomocí `try { … } catch (chyba) { … }` a jídlo upeč znovu.';
    if (/volný kurýr/.test(s)) return 'Kurýři jsou jen dva. Neposílej najednou víc rozvozů, než kolik je kurýrů – nech dva „kuchaře“ brát objednávky z fronty jednu po druhé.';
    if (/SyntaxError/.test(s)) return 'Chyba v zápisu kódu – prohlížeč ho nedokázal přečíst, takže se nespustil vůbec.';
    return '';
  }

  /* ---------------- překlad kódu hráče ---------------- */
  const NAMES = ['kavovar', 'prkenko', 'trouba', 'plotna', 'friteza', 'sloz', 'podej', 'cekej', 'dodavatel', 'zasoba', 'rozvez', 'console', '__g', '__gi'];
  const ENTRIES = ['obsluz', 'smena'];
  let LINE0 = 1;   // o kolik řádků je kód hráče posunutý v přeloženém skriptu
  const lineFromStack = stack => { const m = /bistro\.js:(\d+):(\d+)/.exec(stack || ''); return m ? Math.max(1, +m[1] - LINE0) : 0; };
  function compile(code) {
    const body = instrumentLoops(code);
    const tail = `\n;return { ${ENTRIES.map(e => `${e}: typeof ${e} === 'function' ? ${e} : undefined`).join(', ')} };`;
    if (global.document && global.document.createElement) {
      const src = `window.__bistroFactory = function (${NAMES.join(', ')}) { 'use strict';\n${body}${tail}\n};\n//# sourceURL=bistro.js`;
      let syntax = null;
      const onErr = e => {
        if (e.error instanceof SyntaxError || /SyntaxError/.test(e.message || '')) {
          syntax = { type: 'SyntaxError', msg: String(e.message || '').replace(/^Uncaught\s+/, ''), line: Math.max(1, (e.lineno || 2) - 1) };
          e.preventDefault();
        }
      };
      global.__bistroFactory = null;
      global.addEventListener('error', onErr);
      const s = global.document.createElement('script');
      s.textContent = src;
      global.document.head.appendChild(s);
      s.remove();
      global.removeEventListener('error', onErr);
      if (syntax) return { error: syntax };
      const f = global.__bistroFactory;
      global.__bistroFactory = null;
      if (!f) return { error: { type: 'SyntaxError', msg: 'Kód nejde přečíst', line: 0 } };
      LINE0 = 1;
      return { factory: f };
    }
    LINE0 = 3;
    try {
      // eslint-disable-next-line no-new-func
      return { factory: new Function(...NAMES, `'use strict';\n${body}${tail}\n//# sourceURL=bistro.js`) };
    } catch (e) {
      return { error: { type: 'SyntaxError', msg: `${e.name}: ${e.message}`, line: 0 } };
    }
  }

  /* počká na další „makroúlohu“ – mezitím doběhnou všechny rozpracované await */
  let mc = null;
  const queue = [];
  function macrotask() {
    return new Promise(res => {
      if (typeof setImmediate === 'function') setImmediate(res);
      else if (typeof MessageChannel !== 'undefined') {
        if (!mc) { mc = new MessageChannel(); mc.port1.onmessage = () => { const f = queue.shift(); if (f) f(); }; }
        queue.push(res);
        mc.port2.postMessage(0);
      } else setTimeout(res, 0);
    });
  }

  const fmtNum = n => String(+Number(n).toFixed(1)).replace('.', ',');
  const clock = (start, t) => { const m = Math.round(start * 60 + t); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };

  /* ---------------- jedna směna ---------------- */
  async function runShift(level, sc, code) {
    const R = Object.assign({ maxTime: 120, start: 12 }, level.rules, sc.rules);
    const res = {
      name: sc.name, ok: false, reason: '', msg: '', detail: '', jobs: [], orders: [], log: [], logCut: 0, error: null, end: 0,
      start: R.start, rejected: 0, burnt: 0
    };
    const fail = (reason, msg, detail) => { if (!res.reason) { res.reason = reason; res.msg = msg; res.detail = detail || ''; } };

    /* ---------- stav kuchyně ---------- */
    let now = 0;
    let seq = 0;
    let timers = [];
    const st = {};
    Object.keys(STATIONS).forEach(k => { st[k] = { id: k, def: STATIONS[k], running: [], queue: [], slots: Array(STATIONS[k].cap).fill(null), uses: 0 }; });
    const made = new WeakMap();      // předmět z kuchyně → { job, parts }
    const orders = sc.orders.map((o, i) => Object.freeze(Object.assign({}, o)));
    const orderIdx = new Map(orders.map((o, i) => [o, i]));
    res.orders = orders.map(o => ({ stul: o.stul, jidlo: o.jidlo, limit: o.limit, servedAt: null, ok: false, status: 'waiting', msg: '' }));
    let guard = 0;
    let fatal = null;
    const at = (t, fn) => { timers.push({ t, s: seq++, fn }); };
    const callLine = () => lineFromStack(new Error().stack);
    const logPush = (text, kind) => { if (res.log.length < 300) res.log.push([now, text, kind || 'log']); else res.logCut++; };

    const isThenable = v => v && (typeof v === 'object' || typeof v === 'function') && typeof v.then === 'function';
    function item(nazev, from, job, parts) {
      const it = Object.freeze({ nazev, z: from });
      made.set(it, { job, parts: parts || [] });
      return it;
    }
    function checkArg(fn, v) {
      if (isThenable(v)) throw new Error(`${fn}(): dáváš Promise – surovina ještě není hotová. Chybí await?`);
    }
    function pump(s) {
      while (s.running.length < s.def.cap && s.queue.length) {
        const job = s.queue.shift();
        job.start = now;
        job.slot = s.slots.indexOf(null);
        s.slots[job.slot] = job;
        s.running.push(job);
        at(now + job.dur, () => finish(s, job));
      }
    }
    function finish(s, job) {
      s.running.splice(s.running.indexOf(job), 1);
      s.slots[job.slot] = null;
      job.end = now;
      const r = job.make();
      if (r instanceof Error) { job.burnt = true; res.burnt++; r.__line = job.line; job.reject(r); logPush(r.message, 'bad'); }
      else job.resolve(r);
      pump(s);
    }
    function task(sid, label, dur, make) {
      const s = st[sid];
      const line = callLine();
      let resolve;
      let reject;
      const p = new Promise((a, b) => { resolve = a; reject = b; });
      p.catch(() => {});
      const job = { id: res.jobs.length, station: sid, label, dur, queuedAt: now, start: null, end: null, slot: 0, order: null, burnt: false, line, resolve, reject };
      job.make = () => make(job);
      res.jobs.push(job);
      s.uses++;
      s.queue.push(job);
      pump(s);
      return p;
    }
    function station(sid, co) {
      const def = STATIONS[sid];
      if (sid !== 'kavovar') {
        checkArg(sid, co);
        if (typeof co !== 'string') throw new Error(`${sid}() potřebuje text s názvem suroviny, např. ${sid}('${Object.keys(def.items)[0]}').`);
        if (!(co in def.items)) throw new Error(`${def.name} neumí „${co}“. Umí: ${Object.keys(def.items).join(', ')}.`);
      }
      const name = sid === 'kavovar' ? 'káva' : co;
      const nth = st[sid].uses + 1;
      return task(sid, name, def.items[name], job => {
        if (sid === 'trouba' && (sc.burn || []).includes(nth)) return new Error(`${name.charAt(0).toUpperCase() + name.slice(1)} se v troubě spálil${name === 'pizza' ? 'a' : ''}! 🔥`);
        return item(name, sid, job);
      });
    }

    const api = {
      kavovar: () => station('kavovar'),
      prkenko: co => station('prkenko', co),
      trouba: co => station('trouba', co),
      plotna: co => station('plotna', co),
      friteza: co => station('friteza', co),
      dodavatel: co => {
        checkArg('dodavatel', co);
        const d = (sc.supplier && sc.supplier[co]) || 3;
        return task('dodavatel', String(co), d, job => item(String(co), 'dodavatel', job));
      },
      zasoba: co => {
        checkArg('zasoba', co);
        if (!(sc.stock || []).includes(co)) throw new Error(`Zásoba „${co}“ nemáme. Ve spíži je: ${(sc.stock || []).join(', ') || 'nic'}.`);
        logPush(`Ze zásoby: ${co} (mražený)`, 'info');
        return item(String(co), 'zasoba', null);
      },
      cekej: min => {
        if (typeof min !== 'number' || !(min >= 0)) throw new Error('cekej() potřebuje počet minut, např. cekej(3).');
        return new Promise(r => at(now + min, r));
      },
      sloz: (...casti) => {
        casti.forEach(c => checkArg('sloz', c));
        casti.forEach(c => { if (!made.has(c)) throw new Error('sloz(): tohle nepřišlo z kuchyně – skládej jen to, co vrátily stanice.'); });
        const got = casti.map(c => [c.nazev, c.z]);
        const match = Object.keys(RECIPES).find(name => {
          const need = RECIPES[name];
          if (need.length !== got.length) return false;
          const left = got.slice();
          return need.every(([n, s]) => { const i = left.findIndex(([gn, gs]) => gn === n && (!s || gs === s)); if (i < 0) return false; left.splice(i, 1); return true; });
        });
        if (!match) {
          const names = got.map(([n, s]) => `${n} ${FROM_CZ[s] || ''}`.trim()).join(' + ');
          throw new Error(`Z „${names}“ nic nesložíš. Recepty: ${Object.keys(RECIPES).filter(r => (level.recipes || []).includes(r)).map(r => `${r} = ${recipeText(r)}`).join('; ') || 'žádné'}.`);
        }
        return item(match, 'sloz', null, casti);
      },
      podej: (objednavka, jidlo) => serve('podej', objednavka, jidlo, now),
      rozvez: (objednavka, jidlo) => {
        const k = st.kuryr;
        checkArg('rozvez', jidlo);
        if (k.running.length >= k.def.cap) {
          res.rejected++;
          const line = callLine();
          res.jobs.push({ id: res.jobs.length, station: 'kuryr', label: 'odmítnuto', dur: 0, queuedAt: now, start: now, end: now, slot: 0, order: orderIdx.has(objednavka) ? orderIdx.get(objednavka) : null, rejected: true, line });
          logPush('Žádný volný kurýr!', 'bad');
          const e = new Error('Žádný volný kurýr – oba právě rozvážejí.');
          e.__line = line;
          return Promise.reject(e);
        }
        const valid = check('rozvez', objednavka, jidlo);
        return task('kuryr', valid ? `stůl ${objednavka.stul}` : 'rozvoz', 5, job => {
          job.order = orderIdx.has(objednavka) ? orderIdx.get(objednavka) : null;
          if (valid) serve('rozvez', objednavka, jidlo, now, true);
          return true;
        });
      },
      console: {
        log: (...a) => logPush(a.map(fmtVal).join(' '), 'log'),
        info: (...a) => logPush(a.map(fmtVal).join(' '), 'log'),
        warn: (...a) => logPush(a.map(fmtVal).join(' '), 'warn'),
        error: (...a) => logPush(a.map(fmtVal).join(' '), 'bad')
      },
      __g: () => { if (++guard > 1000000) { const e = new Error('Cyklus se opakuje pořád dokola (víc než 1 000 000×) – nekonečný cyklus?'); e.__loop = true; fatal = fatal || e; throw e; } return true; },
      __gi: function* (it) { for (const x of it) { api.__g(); yield x; } }
    };
    function fmtVal(v) {
      if (typeof v === 'string') return v;
      if (isThenable(v)) return 'Promise { <čeká> }';
      if (v && made.has(v)) return `{ nazev: '${v.nazev}', z: '${v.z}' }`;
      try { return JSON.stringify(v); } catch (e) { return String(v); }
    }
    /* kontrola předávaného jídla (podej i rozvez) – vyhodí chybu pro programátorské omyly */
    function check(fn, o, jidlo) {
      if (!orderIdx.has(o)) throw new Error(`${fn}(objednavka, jidlo): první argument musí být objednávka ze seznamu (třeba objednavka nebo objednavky[0]).`);
      if (isThenable(jidlo)) throw new Error(`Podáváš Promise – jídlo ještě není hotové. Chybí await?`);
      if (jidlo === undefined || jidlo === null) throw new Error(`${fn}() nedostal jídlo (${jidlo}). Vracíš ho z funkce příkazem return?`);
      if (!made.has(jidlo)) throw new Error(`Tohle jídlo nepřišlo z kuchyně. Podávej jen to, co uvařily stanice nebo složila funkce sloz().`);
      return true;
    }
    const served = new Set();
    let doneAtVal = null;
    const doneAtRef = () => doneAtVal;
    const hasFrozen = it => { const m = made.get(it); return it.z === 'zasoba' || (m && m.parts.some(hasFrozen)); };
    function serve(fn, o, jidlo, t, delivered) {
      if (!delivered) check(fn, o, jidlo);
      const i = orderIdx.get(o);
      const ro = res.orders[i];
      const line = delivered ? 0 : callLine();
      const tag = (ok, status, msg) => { ro.ok = ok; ro.status = status; ro.msg = msg; ro.servedAt = t; ro.line = line; };
      // obarvi práci, ze které jídlo vzniklo
      const paint = it => { const m = made.get(it); if (!m) return; if (m.job && m.job.order === null) m.job.order = i; m.parts.forEach(paint); };
      paint(jidlo);
      if (ro.status !== 'waiting') { logPush(`Stůl ${o.stul} už jídlo dostal – podáváš podruhé.`, 'warn'); return; }
      if (served.has(jidlo)) { tag(false, 'wrong', `Tohle jídlo už dostal jiný stůl.`); logPush(`Stůl ${o.stul}: ${ro.msg}`, 'bad'); return; }
      served.add(jidlo);
      const isDish = DIRECT[jidlo.nazev] === jidlo.z || jidlo.z === 'sloz';
      if (!isDish || jidlo.nazev !== o.jidlo) {
        const what = isDish ? jidlo.nazev : `jen ${jidlo.nazev} ${FROM_CZ[jidlo.z] || ''}`.trim();
        tag(false, 'wrong', `Host chtěl ${o.jidlo}, dostal ${what}.`);
        logPush(`Stůl ${o.stul}: ${ro.msg}`, 'bad');
        return;
      }
      if (doneAtRef() !== null && t > doneAtRef() + 1e-9) {
        tag(false, 'closed', `${o.jidlo} dorazilo až v ${clock(R.start, t)}, ale funkce ${level.entry}() skončila už v ${clock(R.start, doneAtRef())}.`);
        logPush(`Stůl ${o.stul}: ${o.jidlo} po konci směny`, 'bad');
        return;
      }
      if (R.freshWithin !== undefined && hasFrozen(jidlo) && ((sc.supplier || {})['lanýž'] || 3) <= R.freshWithin) {
        tag(false, 'wrong', `Lanýž od dodavatele dorazil za ${(sc.supplier || {})['lanýž']} min, a ty jsi použil(a) mražený ze zásoby.`);
        logPush(`Stůl ${o.stul}: mražený lanýž, přitom čerstvý byl na cestě`, 'bad');
        return;
      }
      if (t > o.limit + 1e-9) { tag(false, 'late', `Pozdě: ${clock(R.start, t)} (měl dostat do ${clock(R.start, o.limit)})`); logPush(`Stůl ${o.stul}: ${o.jidlo} pozdě (${clock(R.start, t)})`, 'warn'); return; }
      tag(true, 'ok', `${o.jidlo} ${delivered ? 'doručeno' : 'podáno'} v ${clock(R.start, t)}`);
      logPush(`Stůl ${o.stul}: ${o.jidlo} ${delivered ? 'doručeno' : 'podáno'} ✔`, 'ok');
    }

    /* ---------- překlad a spuštění ---------- */
    const comp = compile(code);
    if (comp.error) {
      res.error = Object.assign({}, comp.error, { text: comp.error.msg, czech: explainJs(comp.error.msg) });
      fail('syntax', `Chyba v zápisu kódu${comp.error.line ? ` na řádku ${comp.error.line}` : ''}`, res.error.czech);
      return res;
    }
    let exp;
    try {
      exp = comp.factory(...NAMES.map(n => api[n]));
    } catch (e) {
      res.error = errInfo(e);
      fail('error', `Program spadl hned při načtení: ${e.name}`, res.error.czech);
      return res;
    }
    const entry = exp[level.entry];
    if (typeof entry !== 'function') { res.missing = level.entry; fail('missing', `V kódu chybí funkce \`${level.entry}()\``); return res; }

    let settled = false;
    let failure = null;
    guard = 0;
    let doneAt = null;
    Promise.resolve().then(() => entry(level.entry === 'obsluz' ? orders[0] : orders.slice()))
      .then(() => { settled = true; doneAt = now; doneAtVal = now; }, e => { settled = true; doneAt = now; doneAtVal = now; failure = e; });
    let steps = 0;
    for (;;) {
      await macrotask();
      if (fatal) break;
      if (!timers.length) break;
      timers.sort((a, b) => a.t - b.t || a.s - b.s);
      const tm = timers.shift();
      now = tm.t;
      if (now > R.maxTime) { now = R.maxTime; res.timeout = true; break; }
      try { tm.fn(); } catch (e) { fatal = e; break; }
      if (++steps > 20000) { res.timeout = true; break; }
    }
    res.end = Math.max(now, ...res.jobs.map(j => j.end || 0));
    res.settled = settled;

    /* ---------- vyhodnocení ---------- */
    if (fatal) {
      res.error = errInfo(fatal);
      fail('error', fatal.__loop ? 'Nekonečný cyklus' : fatal.name === 'Error' && fatal.message ? fatal.message.slice(0, 110) : `Program spadl: ${fatal.name}`, res.error.czech);
    } else if (failure) {
      res.error = errInfo(failure);
      const burn = /spálil/.test(failure && failure.message);
      const courier = /volný kurýr/.test(failure && failure.message);
      const plain = failure && failure.name === 'Error' && failure.message ? failure.message : null;
      fail(burn ? 'burnt' : courier ? 'courier' : 'error', burn ? 'Spálené jídlo a neošetřená chyba' : courier ? 'Kurýr odmítl zakázku a chyba nebyla ošetřená' : plain ? plain.slice(0, 110) : `Program spadl: ${failure && failure.name ? failure.name : 'chyba'}`, res.error.czech || res.error.text);
    } else if (!settled) {
      if (res.timeout) fail('timeout', `Směna skončila v ${clock(R.start, R.maxTime)} a kuchyně pořád vaří`, 'Nečekáš někde v nekonečné smyčce na `cekej()`?');
      else fail('deadlock', 'Kuchyně čeká na něco, co nikdy nepřijde', 'Funkce pořád čeká na `await`, který se nikdy nesplní (třeba Promise, kterou nikdo nevyřeší).');
    }
    res.orders.forEach((o, i) => { if (o.status === 'waiting') { o.status = 'missing'; o.msg = 'Nedostal nic.'; } });
    res.doneAt = doneAt;
    if (!res.reason && R.together && res.orders.every(o => o.ok)) {
      const ts = res.orders.map(o => o.servedAt);
      const spread = Math.max(...ts) - Math.min(...ts);
      if (spread > 0.5) {
        res.orders.forEach(o => { if (o.servedAt < Math.max(...ts) - 0.5) { o.ok = false; o.status = 'cold'; o.msg = `Dostal jídlo o ${fmtNum(Math.max(...ts) - o.servedAt)} min dřív než ostatní – vystydlo, než ostatní dostali své.`; } });
        fail('together', `Stůl dostal jídla postupně (rozestup ${fmtNum(spread)} min)`, 'Celý stůl chce jíst najednou: nejdřív všechno připrav (vrať jídla z funkcí) a pak všem podej ve stejnou chvíli.');
      }
    }
    const bad = res.orders.filter(o => !o.ok);
    if (!res.reason && bad.length) {
      const first = res.orders.findIndex(o => !o.ok);
      const o = res.orders[first];
      const why = {
        missing: res.burnt ? 'Něco se spálilo a nikdo to neupekl znovu.' : 'Program skončil, ale tenhle stůl nic nedostal. Prošel(a) jsi všechny objednávky?',
        late: 'Vaří se moc pomalu. Co jde dělat souběžně, spusť najednou (`Promise.all`).',
        closed: 'Funkce skončila dřív, než se dovařilo. Na rozpracovanou práci musíš počkat: `await`, u více věcí `await Promise.all(…)`.',
        wrong: '', cold: ''
      };
      fail(o.status, `Stůl ${o.stul}: ${o.status === 'missing' ? `${o.jidlo} nebylo podáno` : o.msg}`, why[o.status] || '');
    }
    if (!res.reason) {
      res.ok = true;
      res.reason = 'ok';
      const last = clock(R.start, Math.max(...res.orders.map(o => o.servedAt)));
      res.msg = res.orders.length === 1 ? `Podáno včas v ${last}` : `Všech ${res.orders.length} objednávek včas, poslední v ${last}`;
    }
    res.jobs.forEach(j => { delete j.resolve; delete j.reject; delete j.make; });
    res.servedAll = Math.max(0, ...res.orders.map(o => o.servedAt || 0));
    return res;
  }

  function errInfo(e) {
    if (!e || typeof e !== 'object') return { type: 'Error', text: `Chyba: ${String(e)}`, msg: String(e), line: 0, czech: explainJs(String(e)) };
    const text = `${e.name || 'Error'}: ${e.message}`;
    const line = e.__line || lineFromStack(e.stack);
    return { type: e.__loop ? 'NekonečnýCyklus' : (e.name || 'Error'), text, msg: e.message, line, czech: explainJs(text) };
  }

  /* ---------------- celá úroveň ---------------- */
  async function runLevel(level, code) {
    const res = { shifts: [], passed: 0, total: level.shifts.length, allPass: false, bonus: false, error: null, missing: null, errorTypes: [] };
    for (const sc of level.shifts) {
      const r = await runShift(level, sc, code);
      res.shifts.push(r);
      if (r.error) res.errorTypes.push(r.error.type);
      if (r.reason === 'syntax' || r.reason === 'missing') {
        res.error = r.error;
        res.missing = r.missing || null;
        break;
      }
    }
    res.passed = res.shifts.filter(s => s.ok).length;
    res.allPass = res.passed === res.total;
    if (res.allPass) {
      try { res.bonus = !!level.bonus.check({ code, plain: stripCode(code), shifts: res.shifts }); } catch (e) { res.bonus = false; }
    }
    return res;
  }

  global.Bistro = { STATIONS, DIRECT, RECIPES, recipeText, FROM_CZ, runShift, runLevel, instrumentLoops, stripCode, explainJs, clock, fmtNum, compile };
})(typeof window !== 'undefined' ? window : globalThis);
