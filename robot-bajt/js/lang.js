/*
 * Robot Bajt – jazyk
 * ------------------
 * Interpret podmnožiny JavaScriptu: let/const/var, if/else, while, for, function, return,
 * break/continue, čísla, řetězce, booleany, aritmetika, porovnání, && || !, ++ -- += -= …
 * Kód se nespouští přes eval – vlastní parser a interpret hlídají nekonečné cykly
 * a hlásí chyby česky s číslem řádku.
 */
(function (global) {
  'use strict';

  class LangError extends Error {
    constructor(message, line, kind) {
      super(message);
      this.line = line || 0;
      this.kind = kind || 'syntax'; // syntax | runtime | infinite | crash | laser | bug | battery | nobit
    }
  }

  /* Vestavěné příkazy robota. kind: action = stojí energii, sensor = jen se zeptá */
  const BUILTINS = {
    krok: { kind: 'action', arity: 0, sig: 'krok()', desc: 'Udělá jeden krok dopředu.' },
    vlevo: { kind: 'action', arity: 0, sig: 'vlevo()', desc: 'Otočí se o 90° doleva.' },
    vpravo: { kind: 'action', arity: 0, sig: 'vpravo()', desc: 'Otočí se o 90° doprava.' },
    seber: { kind: 'action', arity: 0, sig: 'seber()', desc: 'Sebere bit z pole, na kterém stojí.' },
    cekej: { kind: 'action', arity: 0, sig: 'cekej()', desc: 'Chvilku počká (jeden takt).' },
    zap: { kind: 'action', arity: 0, sig: 'zap()', desc: 'Vystřelí antivirový paprsek na pole před sebou.' },
    ohlas: { kind: 'action', arity: 1, sig: 'ohlas(hodnota)', desc: 'Robot nahlas řekne hodnotu (číslo nebo text).' },
    'console.log': { kind: 'print', arity: -1, sig: 'console.log(hodnota)', desc: 'Vypíše hodnotu do výpisu (jako v JavaScriptu).' },
    jeZed: { kind: 'sensor', arity: 0, sig: 'jeZed()', desc: 'Je přímo přede mnou zeď? (true / false)' },
    jeVolno: { kind: 'sensor', arity: 0, sig: 'jeVolno()', desc: 'Je přede mnou volno (žádná zeď)?' },
    vlevoVolno: { kind: 'sensor', arity: 0, sig: 'vlevoVolno()', desc: 'Je po mé levé ruce volno?' },
    vpravoVolno: { kind: 'sensor', arity: 0, sig: 'vpravoVolno()', desc: 'Je po mé pravé ruce volno?' },
    jeBit: { kind: 'sensor', arity: 0, sig: 'jeBit()', desc: 'Leží na mém poli bit?' },
    jeCil: { kind: 'sensor', arity: 0, sig: 'jeCil()', desc: 'Stojím v cíli (na nabíječce)?' },
    jeBug: { kind: 'sensor', arity: 0, sig: 'jeBug()', desc: 'Je přímo přede mnou bug?' },
    laser: { kind: 'sensor', arity: 0, sig: 'laser()', desc: 'Je pole přede mnou laser, který je právě zapnutý?' }
  };

  const KEYWORDS = new Set(['let', 'const', 'var', 'if', 'else', 'while', 'for', 'function', 'return', 'break', 'continue',
    'true', 'false', 'null', 'undefined', 'do', 'switch', 'case', 'class', 'new', 'try', 'catch', 'this', 'of', 'in']);
  const UNSUPPORTED = new Set(['do', 'switch', 'case', 'class', 'new', 'try', 'catch', 'this']);
  const OPS = ['===', '!==', '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=',
    '+', '-', '*', '/', '%', '<', '>', '=', '!', '(', ')', '{', '}', ';', ',', '.', '[', ']', ':', '?'];
  const ID_START = /[A-Za-z_$À-ÖØ-öø-ſ]/;
  const ID_PART = /[A-Za-z0-9_$À-ÖØ-öø-ſ]/;

  /* ------------------------------------------------------------------ *
   *  Tokenizer
   * ------------------------------------------------------------------ */
  function tokenize(src) {
    const toks = [];
    let i = 0, line = 1;
    while (i < src.length) {
      const c = src[i];
      if (c === '\n') { line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r' || c === ' ') { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') {
        const startLine = line;
        i += 2;
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
        if (i >= src.length) throw new LangError('Komentář /* … */ není ukončený – chybí */.', startLine);
        i += 2;
        continue;
      }
      if (/[0-9]/.test(c)) {
        let j = i;
        while (j < src.length && /[0-9]/.test(src[j])) j++;
        if (src[j] === '.' && /[0-9]/.test(src[j + 1] || '')) { j++; while (j < src.length && /[0-9]/.test(src[j])) j++; }
        if (ID_START.test(src[j] || '')) throw new LangError(`Název nesmí začínat číslicí („${src.slice(i, j + 1)}…“).`, line);
        toks.push({ t: 'num', v: parseFloat(src.slice(i, j)), line });
        i = j;
        continue;
      }
      if (ID_START.test(c)) {
        let j = i;
        while (j < src.length && ID_PART.test(src[j])) j++;
        const w = src.slice(i, j);
        toks.push({ t: KEYWORDS.has(w) ? 'kw' : 'id', v: w, line });
        i = j;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        const q = c;
        let j = i + 1, s = '';
        while (j < src.length && src[j] !== q) {
          if (src[j] === '\n') throw new LangError('Text v uvozovkách není ukončený – chybí uzavírací uvozovka.', line);
          if (src[j] === '\\' && j + 1 < src.length) {
            const e = src[j + 1];
            s += e === 'n' ? '\n' : e === 't' ? '\t' : e;
            j += 2;
          } else { s += src[j]; j++; }
        }
        if (j >= src.length) throw new LangError('Text v uvozovkách není ukončený – chybí uzavírací uvozovka.', line);
        toks.push({ t: 'str', v: s, line });
        i = j + 1;
        continue;
      }
      const op = OPS.find(o => src.startsWith(o, i));
      if (op) { toks.push({ t: 'op', v: op, line }); i += op.length; continue; }
      if (c === '„' || c === '“' || c === '”') throw new LangError('Použij obyčejné uvozovky " nebo \' (ne české „ “).', line);
      throw new LangError(`Neznámý znak „${c}“.`, line);
    }
    toks.push({ t: 'eof', v: '', line });
    return toks;
  }

  /* ------------------------------------------------------------------ *
   *  Parser → AST
   * ------------------------------------------------------------------ */
  function parse(src) {
    const toks = tokenize(src);
    let p = 0;
    let loopDepth = 0;
    let funcDepth = 0;
    const cur = () => toks[p];
    const at = (t, v) => toks[p].t === t && (v === undefined || toks[p].v === v);
    const op = v => at('op', v);
    const kw = v => at('kw', v);
    const take = () => toks[p++];
    const fail = (msg, tok) => { throw new LangError(msg, (tok || cur()).line, 'syntax'); };
    const describe = tok => (tok.t === 'eof' ? 'konec programu' : tok.t === 'str' ? 'text "' + tok.v + '"' : '„' + tok.v + '“');
    function expect(v, msg) {
      if (!op(v)) fail(msg || `Očekávám „${v}“, ale je tu ${describe(cur())}.`);
      return take();
    }
    function semi() { if (op(';')) take(); }

    function program() {
      const body = [];
      while (!at('eof')) body.push(statement(true));
      return { type: 'Program', body, line: 1 };
    }

    function statement(top) {
      const t = cur();
      if (op('{')) return block();
      if (op(';')) { take(); return { type: 'Empty', line: t.line }; }
      if (op('}')) fail('Přebývá „}“ – k téhle závorce nepatří žádná otevírací „{“.');
      if (t.t === 'kw') {
        if (UNSUPPORTED.has(t.v)) fail(`Konstrukci „${t.v}“ robot Bajt nezná. Vystačíš si s if, while, for a function.`);
        switch (t.v) {
          case 'let': case 'const': case 'var': { const d = varDecl(); semi(); return d; }
          case 'if': return ifStmt();
          case 'while': return whileStmt();
          case 'for': return forStmt();
          case 'function':
            if (!top) fail('Funkci definuj na nejvyšší úrovni programu – ne uvnitř cyklu, podmínky ani jiné funkce.');
            return funcDecl();
          case 'return': {
            take();
            let arg = null;
            if (!op(';') && !op('}') && !at('eof') && cur().line === t.line) arg = expression();
            semi();
            return { type: 'Return', arg, line: t.line };
          }
          case 'break':
          case 'continue':
            take();
            if (loopDepth === 0) fail(`„${t.v}“ může být jen uvnitř cyklu (for nebo while).`, t);
            semi();
            return { type: t.v === 'break' ? 'Break' : 'Continue', line: t.line };
          case 'else':
            fail('„else“ bez „if“ – else musí následovat hned za blokem if { … }.');
            break;
          default:
            break;
        }
      }
      const e = expression();
      semi();
      return { type: 'ExprStmt', expr: e, line: t.line };
    }

    function block() {
      const open = expect('{');
      const body = [];
      while (!op('}')) {
        if (at('eof')) fail(`Chybí „}“ – blok otevřený na řádku ${open.line} není uzavřený.`, open);
        body.push(statement(false));
      }
      take();
      return { type: 'Block', body, line: open.line };
    }

    function varDecl() {
      const k = take();
      const decls = [];
      do {
        const id = cur();
        if (id.t !== 'id') fail(id.t === 'kw' ? `„${id.v}“ je klíčové slovo – proměnnou pojmenuj jinak.` : `Za „${k.v}“ patří název proměnné, např. ${k.v} pocet = 0;`);
        take();
        let init = null;
        if (op('=')) { take(); init = assignment(); }
        else if (k.v === 'const') fail(`Konstanta „${id.v}“ musí mít hodnotu, např. const ${id.v} = 5;`);
        decls.push({ name: id.v, init, line: id.line });
      } while (op(',') && take());
      return { type: 'VarDecl', kind: k.v, decls, line: k.line };
    }

    function condition(word) {
      if (!op('(')) fail(`Za „${word}“ patří podmínka v kulatých závorkách, např. ${word} (jeBit()) { … }`);
      take();
      if (op(')')) fail(`Podmínka v ${word} ( ) je prázdná.`);
      const test = expression();
      if (test.type === 'Assign' && test.op === '=') fail('V podmínce je „=“ (přiřazení). Pro porovnání použij „===“ nebo „==“.', test);
      expect(')', `Chybí „)“ za podmínkou ${word}.`);
      return test;
    }

    function ifStmt() {
      const t = take();
      const test = condition('if');
      if (op(';')) fail('Za podmínkou if nepatří středník – ten by z if udělal prázdný příkaz.');
      const cons = statement(false);
      let alt = null;
      if (kw('else')) {
        take();
        if (op(';')) fail('Za else nepatří středník.');
        alt = statement(false);
      }
      return { type: 'If', test, cons, alt, line: t.line };
    }

    function whileStmt() {
      const t = take();
      const test = condition('while');
      if (op(';')) fail('Za while ( … ) nepatří středník – cyklus by neměl tělo a točil by se navždy.');
      loopDepth++;
      const body = statement(false);
      loopDepth--;
      return { type: 'While', test, body, line: t.line };
    }

    function forStmt() {
      const t = take();
      if (!op('(')) fail('Za „for“ patří závorka: for (let i = 0; i < 5; i++) { … }');
      take();
      let init = null;
      if (op(';')) take();
      else {
        if (kw('let') || kw('var') || kw('const')) init = varDecl();
        else init = { type: 'ExprStmt', expr: expression(), line: cur().line };
        init.forInit = true; // hlavička for se nepočítá jako samostatný příkaz
        if (kw('of') || kw('in')) fail('for … of / for … in Bajt nezná. Použij klasické for (let i = 0; i < 5; i++).');
        expect(';', 'V hlavičce for chybí „;“ – správný tvar je for (let i = 0; i < 5; i++)');
      }
      let test = null;
      if (!op(';')) test = expression();
      if (op(')')) fail('V hlavičce for chybí druhý „;“ – správný tvar je for (let i = 0; i < 5; i++)');
      expect(';', 'V hlavičce for chybí „;“ – správný tvar je for (let i = 0; i < 5; i++)');
      let update = null;
      if (!op(')')) update = expression();
      expect(')', 'Chybí „)“ na konci hlavičky for.');
      if (op(';')) fail('Za for ( … ) nepatří středník – cyklus by neměl tělo.');
      loopDepth++;
      const body = statement(false);
      loopDepth--;
      return { type: 'For', init, test, update, body, line: t.line };
    }

    function funcDecl() {
      const t = take();
      const id = cur();
      if (id.t !== 'id') fail('Za „function“ patří název funkce, např. function otocSe() { … }');
      if (BUILTINS[id.v]) fail(`„${id.v}“ už je vestavěný příkaz robota – svou funkci pojmenuj jinak.`);
      take();
      expect('(', `Za názvem funkce „${id.v}“ chybí „(“.`);
      const params = [];
      if (!op(')')) {
        do {
          const pt = cur();
          if (pt.t !== 'id') fail('Parametr funkce musí být název.');
          take();
          params.push(pt.v);
        } while (op(',') && take());
      }
      expect(')', 'Chybí „)“ za parametry funkce.');
      if (!op('{')) fail('Tělo funkce musí být ve složených závorkách { … }.');
      const savedLoop = loopDepth;
      loopDepth = 0;
      funcDepth++;
      const body = block();
      funcDepth--;
      loopDepth = savedLoop;
      return { type: 'FuncDecl', name: id.v, params, body, line: t.line };
    }

    /* Výrazy (od nejnižší priority) */
    function expression() { return assignment(); }

    function assignment() {
      const left = logicalOr();
      if (op('=') || op('+=') || op('-=') || op('*=') || op('/=') || op('%=')) {
        const o = take();
        if (left.type !== 'Ident') fail('Přiřadit hodnotu jde jen do proměnné – vlevo od „=“ musí být její název.', o);
        const value = assignment();
        return { type: 'Assign', op: o.v, name: left.name, value, line: o.line };
      }
      return left;
    }

    function binaryLevel(next, ops) {
      return function () {
        let left = next();
        while (at('op') && ops.includes(cur().v)) {
          const o = take();
          const right = next();
          left = { type: o.v === '&&' || o.v === '||' ? 'Logical' : 'Binary', op: o.v, left, right, line: o.line };
        }
        return left;
      };
    }

    function unary() {
      if (op('!') || op('-') || op('+')) {
        const o = take();
        return { type: 'Unary', op: o.v, arg: unary(), line: o.line };
      }
      if (op('++') || op('--')) {
        const o = take();
        const arg = unary();
        if (arg.type !== 'Ident') fail(`„${o.v}“ jde použít jen na proměnnou.`, o);
        return { type: 'Update', op: o.v, prefix: true, name: arg.name, line: o.line };
      }
      return postfix();
    }

    function postfix() {
      const e = primary();
      if (op('++') || op('--')) {
        const o = take();
        if (e.type !== 'Ident') fail(`„${o.v}“ jde použít jen na proměnnou.`, o);
        return { type: 'Update', op: o.v, prefix: false, name: e.name, line: o.line };
      }
      return e;
    }

    function primary() {
      const t = cur();
      if (t.t === 'num' || t.t === 'str') { take(); return { type: 'Lit', value: t.v, line: t.line }; }
      if (t.t === 'kw' && (t.v === 'true' || t.v === 'false')) { take(); return { type: 'Lit', value: t.v === 'true', line: t.line }; }
      if (t.t === 'kw' && (t.v === 'null' || t.v === 'undefined')) { take(); return { type: 'Lit', value: t.v === 'null' ? null : undefined, line: t.line }; }
      if (op('(')) {
        take();
        if (op(')')) fail('Prázdné závorky ( ) tady nedávají smysl.');
        const e = expression();
        expect(')', 'Chybí „)“.');
        return e;
      }
      if (t.t === 'id') {
        take();
        let name = t.v;
        if (op('.')) {
          take();
          const m = cur();
          if (m.t !== 'id') fail('Za tečkou čekám název.');
          take();
          if (name === 'robot') name = m.v;
          else if (name === 'console' && m.v === 'log') name = 'console.log';
          else fail(`„${name}.${m.v}“ Bajt nezná. Příkazy robota piš rovnou, např. krok();`, t);
          if (!op('(')) fail(`Za „${name}“ chybí závorky – správně ${name}();`, t);
        }
        if (op('(')) {
          take();
          const args = [];
          if (!op(')')) {
            do {
              if (op(')')) break;
              args.push(assignment());
            } while (op(',') && take());
          }
          expect(')', `Chybí „)“ na konci volání ${name}(…).`);
          return { type: 'Call', name, args, line: t.line };
        }
        return { type: 'Ident', name, line: t.line };
      }
      if (t.t === 'eof') fail('Program nečekaně skončil – něco chybí (závorka nebo výraz?).');
      if (op('[') || op(']')) fail('Hranaté závorky (pole) robot Bajt nepotřebuje.');
      if (t.t === 'kw') fail(`Klíčové slovo „${t.v}“ sem nepatří.`);
      fail(`Tady nečekám ${describe(t)}.`);
      return null;
    }

    const multiplicative = binaryLevel(unary, ['*', '/', '%']);
    const additive = binaryLevel(multiplicative, ['+', '-']);
    const relational = binaryLevel(additive, ['<', '>', '<=', '>=']);
    const equality = binaryLevel(relational, ['===', '!==', '==', '!=']);
    const logicalAnd = binaryLevel(equality, ['&&']);
    const logicalOr = binaryLevel(logicalAnd, ['||']);

    const ast = program();
    analyze(ast);
    return ast;
  }

  /* ------------------------------------------------------------------ *
   *  Statická kontrola: neznámé příkazy, chybějící závorky, počet parametrů
   * ------------------------------------------------------------------ */
  function stripDia(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i].concat(new Array(n).fill(0)));
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[m][n];
  }
  function suggest(name, candidates) {
    const plain = stripDia(name).toLowerCase();
    let best = null, bestD = Infinity;
    for (const c of candidates) {
      if (stripDia(c).toLowerCase() === plain) return c;
      const dist = levenshtein(plain, c.toLowerCase());
      if (dist < bestD) { bestD = dist; best = c; }
    }
    return bestD <= Math.max(1, Math.floor(name.length / 3)) ? best : null;
  }

  function analyze(ast) {
    const funcs = new Map();
    for (const s of ast.body) {
      if (s.type === 'FuncDecl') {
        if (funcs.has(s.name)) throw new LangError(`Funkce „${s.name}“ je definovaná dvakrát.`, s.line);
        funcs.set(s.name, s);
      }
    }
    ast.funcs = funcs;
    const names = Object.keys(BUILTINS).concat([...funcs.keys()]);
    walk(ast, node => {
      if (node.type === 'Call') {
        if (BUILTINS[node.name]) {
          const b = BUILTINS[node.name];
          if (b.arity >= 0 && node.args.length !== b.arity) {
            if (b.arity === 0) {
              const extra = node.name === 'krok' ? ' Na víc kroků použij cyklus.' : '';
              throw new LangError(`Příkaz ${node.name}() nemá žádné parametry – nech závorky prázdné.${extra}`, node.line);
            }
            throw new LangError(`Příkaz ${b.sig} potřebuje ${b.arity} parametr.`, node.line);
          }
        } else if (funcs.has(node.name)) {
          const f = funcs.get(node.name);
          if (f.params.length !== node.args.length) {
            throw new LangError(`Funkce ${node.name} čeká ${f.params.length} parametr(ů), ale dostala ${node.args.length}.`, node.line);
          }
        } else {
          const s = suggest(node.name, names);
          throw new LangError(`Neznámý příkaz „${node.name}()“.${s ? ` Nemyslel(a) jsi „${s}()“?` : ''}`, node.line, 'syntax');
        }
      }
      if (node.type === 'ExprStmt' && node.expr.type === 'Ident') {
        const n = node.expr.name;
        if (BUILTINS[n] || funcs.has(n)) throw new LangError(`„${n}“ je příkaz – za ním patří závorky: ${n}();`, node.line);
        const s = suggest(n, names);
        if (s && !/^[a-z]$/.test(n)) throw new LangError(`„${n}“ – nemyslel(a) jsi příkaz „${s}();“?`, node.line);
      }
    });
  }

  function walk(node, fn) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(n => walk(n, fn)); return; }
    if (node.type) fn(node);
    for (const k in node) {
      if (k === 'funcs') continue;
      const v = node[k];
      if (v && typeof v === 'object') walk(v, fn);
    }
  }

  /* Statistiky programu – kolik má příkazů a jaké konstrukce používá */
  const COUNTED = new Set(['VarDecl', 'ExprStmt', 'If', 'While', 'For', 'FuncDecl', 'Return', 'Break', 'Continue']);
  function stats(ast) {
    let size = 0;
    const used = new Set();
    walk(ast, n => {
      if (COUNTED.has(n.type) && !n.forInit) size++;
      if (n.type === 'For') used.add('for');
      if (n.type === 'While') used.add('while');
      if (n.type === 'If') { used.add('if'); if (n.alt) used.add('else'); }
      if (n.type === 'FuncDecl') used.add('function');
      if (n.type === 'VarDecl') used.add('variable');
      if (n.type === 'Logical') used.add('logic');
      if (n.type === 'Unary' && n.op === '!') used.add('not');
      if (n.type === 'Call' && BUILTINS[n.name] && BUILTINS[n.name].kind === 'sensor') used.add('sensor');
      if (n.type === 'Call' && ast.funcs && ast.funcs.has(n.name)) used.add('call');
    });
    return { size, used: [...used] };
  }

  /* ------------------------------------------------------------------ *
   *  Interpret
   * ------------------------------------------------------------------ */
  class Signal {
    constructor(kind, value, line) { this.kind = kind; this.value = value; this.line = line; }
  }

  class Scope {
    constructor(parent) { this.vars = new Map(); this.parent = parent; }
    find(name) {
      let s = this;
      while (s) { if (s.vars.has(name)) return s; s = s.parent; }
      return null;
    }
  }

  const truthy = v => !!v;

  function run(ast, host, limits) {
    const maxOps = (limits && limits.maxOps) || 200000;
    const funcs = ast.funcs || new Map();
    let ops = 0;
    let depth = 0;
    const globalScope = new Scope(null);

    function tick(line) {
      if (++ops > maxOps) {
        throw new LangError('Program běží pořád dokola – nejspíš nekonečný cyklus. Mění se uvnitř cyklu něco, co ho jednou ukončí?', line, 'infinite');
      }
    }

    function unknownName(name, line) {
      const s = suggest(name, [...Object.keys(BUILTINS), ...funcs.keys()]);
      if (BUILTINS[name] || funcs.has(name)) return new LangError(`„${name}“ je příkaz – volá se se závorkami: ${name}()`, line, 'runtime');
      return new LangError(`Neznámá proměnná „${name}“. Nejdřív ji vytvoř: let ${name} = …;${s ? ` (Nebo jsi myslel(a) „${s}()“?)` : ''}`, line, 'runtime');
    }

    function declare(scope, name, kind, value, line) {
      if (scope.vars.has(name)) throw new LangError(`Proměnná „${name}“ už tu existuje – podruhé ji nedeklaruj, jen do ní přiřaď: ${name} = …;`, line, 'runtime');
      scope.vars.set(name, { value, kind });
    }
    function getVar(scope, name, line) {
      const s = scope.find(name);
      if (!s) throw unknownName(name, line);
      return s.vars.get(name).value;
    }
    function setVar(scope, name, value, line) {
      const s = scope.find(name);
      if (!s) throw new LangError(`Proměnná „${name}“ neexistuje – nejdřív ji vytvoř: let ${name} = …;`, line, 'runtime');
      const v = s.vars.get(name);
      if (v.kind === 'const') throw new LangError(`„${name}“ je konstanta (const) – její hodnotu nejde změnit. Použij let.`, line, 'runtime');
      v.value = value;
    }

    function execList(list, scope) {
      for (const s of list) exec(s, scope);
    }

    function exec(node, scope) {
      tick(node.line);
      switch (node.type) {
        case 'Empty':
        case 'FuncDecl':
          return;
        case 'Block':
          execList(node.body, new Scope(scope));
          return;
        case 'VarDecl':
          for (const d of node.decls) declare(scope, d.name, node.kind, d.init ? evaluate(d.init, scope) : undefined, d.line);
          return;
        case 'ExprStmt':
          evaluate(node.expr, scope);
          return;
        case 'If':
          if (truthy(evaluate(node.test, scope))) exec(node.cons, scope);
          else if (node.alt) exec(node.alt, scope);
          return;
        case 'While':
          while (truthy(evaluate(node.test, scope))) {
            try {
              exec(node.body, scope);
            } catch (e) {
              if (e instanceof Signal && e.kind === 'break') break;
              if (e instanceof Signal && e.kind === 'continue') { tick(node.line); continue; }
              throw e;
            }
            tick(node.line);
          }
          return;
        case 'For': {
          const fs = new Scope(scope);
          if (node.init) exec(node.init, fs);
          while (node.test ? truthy(evaluate(node.test, fs)) : true) {
            try {
              exec(node.body, new Scope(fs));
            } catch (e) {
              if (e instanceof Signal && e.kind === 'break') break;
              if (!(e instanceof Signal && e.kind === 'continue')) throw e;
            }
            if (node.update) evaluate(node.update, fs);
            tick(node.line);
          }
          return;
        }
        case 'Return':
          throw new Signal('return', node.arg ? evaluate(node.arg, scope) : undefined, node.line);
        case 'Break':
          throw new Signal('break', undefined, node.line);
        case 'Continue':
          throw new Signal('continue', undefined, node.line);
        default:
          throw new LangError('Neznámý příkaz.', node.line, 'runtime');
      }
    }

    function arith(o, a, b, line) {
      switch (o) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/':
          if (b === 0) throw new LangError('Dělení nulou!', line, 'runtime');
          return a / b;
        case '%':
          if (b === 0) throw new LangError('Zbytek po dělení nulou nejde spočítat.', line, 'runtime');
          return a % b;
        case '<': return a < b;
        case '>': return a > b;
        case '<=': return a <= b;
        case '>=': return a >= b;
        case '===': return a === b;
        case '!==': return a !== b;
        case '==': return a == b; // eslint-disable-line eqeqeq
        case '!=': return a != b; // eslint-disable-line eqeqeq
        default: throw new LangError(`Neznámý operátor ${o}`, line, 'runtime');
      }
    }

    function evaluate(node, scope) {
      tick(node.line);
      switch (node.type) {
        case 'Lit': return node.value;
        case 'Ident': return getVar(scope, node.name, node.line);
        case 'Unary': {
          const v = evaluate(node.arg, scope);
          if (node.op === '!') return !truthy(v);
          if (node.op === '-') return -v;
          return +v;
        }
        case 'Update': {
          const old = Number(getVar(scope, node.name, node.line));
          const nv = node.op === '++' ? old + 1 : old - 1;
          setVar(scope, node.name, nv, node.line);
          return node.prefix ? nv : old;
        }
        case 'Logical': {
          const l = evaluate(node.left, scope);
          if (node.op === '&&') return truthy(l) ? evaluate(node.right, scope) : l;
          return truthy(l) ? l : evaluate(node.right, scope);
        }
        case 'Binary':
          return arith(node.op, evaluate(node.left, scope), evaluate(node.right, scope), node.line);
        case 'Assign': {
          let v = evaluate(node.value, scope);
          if (node.op !== '=') v = arith(node.op[0], getVar(scope, node.name, node.line), v, node.line);
          setVar(scope, node.name, v, node.line);
          return v;
        }
        case 'Call':
          return call(node, scope);
        default:
          throw new LangError('Neznámý výraz.', node.line, 'runtime');
      }
    }

    function call(node, scope) {
      const args = node.args.map(a => evaluate(a, scope));
      const f = funcs.get(node.name);
      if (f) {
        if (depth >= 150) throw new LangError(`Funkce „${node.name}“ volá sama sebe pořád dokola (příliš hluboká rekurze).`, node.line, 'infinite');
        depth++;
        const fs = new Scope(globalScope);
        f.params.forEach((pname, i) => fs.vars.set(pname, { value: args[i], kind: 'let' }));
        try {
          execList(f.body.body, fs);
        } catch (e) {
          if (e instanceof Signal && e.kind === 'return') return e.value;
          throw e;
        } finally {
          depth--;
        }
        return undefined;
      }
      return host.call(node.name, args, node.line);
    }

    try {
      execList(ast.body, globalScope);
    } catch (e) {
      if (e instanceof Signal) {
        if (e.kind === 'return') return; // return na nejvyšší úrovni ukončí program
        throw new LangError(`„${e.kind}“ může být jen uvnitř cyklu.`, e.line, 'syntax');
      }
      throw e;
    }
  }

  global.BajtLang = { LangError, BUILTINS, tokenize, parse, run, stats, walk, suggest };
})(typeof window !== 'undefined' ? window : globalThis);
