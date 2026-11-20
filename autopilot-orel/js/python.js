/*
 * Mini-Python – interpret podmnožiny Pythonu 3 napsaný v čistém JavaScriptu.
 *
 * Umí: int (libovolně velká, BigInt), float, bool, None, str, list, tuple, dict, set, range,
 * f-stringy a format(), def (výchozí hodnoty, pojmenované argumenty, vnořené funkce, rekurze), lambda,
 * if/elif/else, while, for (rozbalování), break/continue, try/except/else/finally, raise, assert,
 * global/nonlocal, del, comprehensions (list/dict/set/generátor), řezy, řetězené porovnání,
 * bitové operace, moduly math, string, random a desítky vestavěných funkcí a metod.
 *
 * Chyby mají stejné texty jako skutečný Python 3.12+ a navíc vysvětlení v češtině.
 * Počet kroků je omezený, takže nekonečný cyklus prohlížeč nezasekne.
 */
(function (global) {
  'use strict';

  /* =====================================================================
   *  Hodnoty
   * ===================================================================== */
  class PyTuple { constructor(items) { this.items = items; } }
  class PyDict {
    constructor() { this.map = new Map(); }
    get size() { return this.map.size; }
    has(k) { return this.map.has(hkey(k)); }
    get(k) { const e = this.map.get(hkey(k)); return e ? e[1] : undefined; }
    set(k, v) { const h = hkey(k); const e = this.map.get(h); if (e) e[1] = v; else this.map.set(h, [k, v]); }
    del(k) { return this.map.delete(hkey(k)); }
    keys() { return [...this.map.values()].map(e => e[0]); }
    values() { return [...this.map.values()].map(e => e[1]); }
    entries() { return [...this.map.values()]; }
  }
  class PySet {
    constructor(items) { this.map = new Map(); if (items) for (const v of items) this.add(v); }
    get size() { return this.map.size; }
    has(v) { return this.map.has(hkey(v)); }
    add(v) { const h = hkey(v); if (!this.map.has(h)) this.map.set(h, v); }
    del(v) { return this.map.delete(hkey(v)); }
    values() { return [...this.map.values()]; }
  }
  class PyRange { constructor(start, stop, step) { this.start = start; this.stop = stop; this.step = step; } }
  class PyFunction {
    constructor(name, params, body, scope, def, isLambda) {
      this.name = name; this.params = params; this.body = body; this.scope = scope; this.def = def; this.isLambda = !!isLambda;
    }
  }
  class PyBuiltin { constructor(name, fn, self) { this.name = name; this.fn = fn; this.self = self; } }
  class PyType { constructor(name, call, base, exc) { this.name = name; this.call = call; this.base = base || null; this.exc = !!exc; } }
  class PyModule { constructor(name, attrs) { this.name = name; this.attrs = attrs; } }
  class PyIter { constructor(name, it) { this.name = name; this.it = it; } }
  class PyView { constructor(kind, dict) { this.kind = kind; this.dict = dict; } }
  class PyExc { constructor(type, args) { this.type = type; this.args = args; } }

  /* signály – vyhozené výjimky */
  class PyThrow { constructor(exc, line, trace) { this.exc = exc; this.line = line; this.trace = trace; } }
  class Timeout { constructor(steps) { this.steps = steps; } }
  class OutputLimit { }
  const BREAK = { sig: 'break' };
  const CONTINUE = { sig: 'continue' };
  class Ret { constructor(v) { this.v = v; } }

  let addrCounter = 0x7f3a2c10;
  const fakeAddr = () => '0x' + (addrCounter += 0x30).toString(16).padStart(12, '0');

  /* klíč pro slovníky a množiny – stejný pro 1, 1.0 a True (jako v Pythonu) */
  function hkey(v) {
    switch (typeof v) {
      case 'string': return 's' + v;
      case 'bigint': return 'n' + v.toString();
      case 'boolean': return v ? 'n1' : 'n0';
      case 'number':
        if (Number.isInteger(v)) return 'n' + BigInt(v).toString();
        return 'f' + v;
      default:
        if (v === null) return 'N';
        if (v instanceof PyTuple) return 't(' + v.items.map(hkey).join(',') + ')';
        if (Array.isArray(v) || v instanceof PyDict || v instanceof PySet || v instanceof PyView) throw err('TypeError', `unhashable type: '${typeName(v)}'`);
        if (!v.__id) Object.defineProperty(v, '__id', { value: fakeAddr() });
        return 'o' + v.__id;
    }
  }

  function typeName(v) {
    switch (typeof v) {
      case 'bigint': return 'int';
      case 'number': return 'float';
      case 'boolean': return 'bool';
      case 'string': return 'str';
      case 'undefined': return 'NoneType';
      default:
        if (v === null) return 'NoneType';
        if (Array.isArray(v)) return 'list';
        if (v instanceof PyTuple) return 'tuple';
        if (v instanceof PyDict) return 'dict';
        if (v instanceof PySet) return 'set';
        if (v instanceof PyRange) return 'range';
        if (v instanceof PyFunction) return 'function';
        if (v instanceof PyBuiltin) return v.self !== undefined ? 'builtin_function_or_method' : 'builtin_function_or_method';
        if (v instanceof PyType) return 'type';
        if (v instanceof PyModule) return 'module';
        if (v instanceof PyIter) return v.name;
        if (v instanceof PyView) return 'dict_' + v.kind;
        if (v instanceof PyExc) return v.type.name;
        return 'object';
    }
  }

  const isIntLike = v => typeof v === 'bigint' || typeof v === 'boolean';
  const isNum = v => typeof v === 'bigint' || typeof v === 'number' || typeof v === 'boolean';
  const big = v => (typeof v === 'boolean' ? (v ? 1n : 0n) : v);
  const num = v => (typeof v === 'number' ? v : Number(big(v)));

  function truthy(v) {
    switch (typeof v) {
      case 'boolean': return v;
      case 'bigint': return v !== 0n;
      case 'number': return v !== 0;
      case 'string': return v.length > 0;
      default:
        if (v === null || v === undefined) return false;
        if (Array.isArray(v)) return v.length > 0;
        if (v instanceof PyTuple) return v.items.length > 0;
        if (v instanceof PyDict || v instanceof PySet) return v.size > 0;
        if (v instanceof PyRange) return rangeLen(v) > 0n;
        if (v instanceof PyView) return v.dict.size > 0;
        return true;
    }
  }

  /* ---------- výpis hodnot ---------- */
  function floatRepr(x) {
    if (Number.isNaN(x)) return 'nan';
    if (x === Infinity) return 'inf';
    if (x === -Infinity) return '-inf';
    if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0';
    let [mant, ex] = x.toExponential().split('e');
    const e = parseInt(ex, 10);
    let sign = '';
    if (mant[0] === '-') { sign = '-'; mant = mant.slice(1); }
    const digits = mant.replace('.', '');
    if (e < -4 || e >= 16) {
      const m = digits[0] + (digits.length > 1 ? '.' + digits.slice(1) : '');
      return sign + m + 'e' + (e < 0 ? '-' : '+') + String(Math.abs(e)).padStart(2, '0');
    }
    let s;
    if (e >= 0) s = digits.length <= e + 1 ? digits + '0'.repeat(e + 1 - digits.length) + '.0' : digits.slice(0, e + 1) + '.' + digits.slice(e + 1);
    else s = '0.' + '0'.repeat(-e - 1) + digits;
    return sign + s;
  }

  function strRepr(s) {
    const q = s.includes("'") && !s.includes('"') ? '"' : "'";
    let out = q;
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (ch === q || ch === '\\') out += '\\' + ch;
      else if (ch === '\n') out += '\\n';
      else if (ch === '\t') out += '\\t';
      else if (ch === '\r') out += '\\r';
      else if (c < 32 || c === 127) out += '\\x' + c.toString(16).padStart(2, '0');
      else out += ch;
    }
    return out + q;
  }

  function repr(v, seen) {
    switch (typeof v) {
      case 'string': return strRepr(v);
      case 'bigint': return v.toString();
      case 'number': return floatRepr(v);
      case 'boolean': return v ? 'True' : 'False';
      case 'undefined': return 'None';
      default: break;
    }
    if (v === null) return 'None';
    seen = seen || [];
    if (Array.isArray(v) || v instanceof PyTuple || v instanceof PyDict || v instanceof PySet) {
      if (seen.includes(v)) return Array.isArray(v) ? '[...]' : v instanceof PyDict ? '{...}' : '(...)';
      seen.push(v);
      let s;
      if (Array.isArray(v)) s = '[' + v.map(x => repr(x, seen)).join(', ') + ']';
      else if (v instanceof PyTuple) s = '(' + v.items.map(x => repr(x, seen)).join(', ') + (v.items.length === 1 ? ',)' : ')');
      else if (v instanceof PyDict) s = '{' + v.entries().map(([k, x]) => repr(k, seen) + ': ' + repr(x, seen)).join(', ') + '}';
      else s = v.size ? '{' + v.values().map(x => repr(x, seen)).join(', ') + '}' : 'set()';
      seen.pop();
      return s;
    }
    if (v instanceof PyRange) return v.step === 1n ? `range(${v.start}, ${v.stop})` : `range(${v.start}, ${v.stop}, ${v.step})`;
    if (v instanceof PyFunction) return v.isLambda ? `<function <lambda> at ${addrOf(v)}>` : `<function ${v.name} at ${addrOf(v)}>`;
    if (v instanceof PyBuiltin) return v.self !== undefined ? `<built-in method ${v.name} of ${typeName(v.self)} object at ${addrOf(v)}>` : `<built-in function ${v.name}>`;
    if (v instanceof PyType) return `<class '${v.name}'>`;
    if (v instanceof PyModule) return `<module '${v.name}'>`;
    if (v instanceof PyIter) return `<${v.name} object at ${addrOf(v)}>`;
    if (v instanceof PyView) return `dict_${v.kind}([${viewItems(v).map(x => repr(x, seen)).join(', ')}])`;
    if (v instanceof PyExc) return `${v.type.name}(${v.args.map(x => repr(x, seen)).join(', ')})`;
    return '<object>';
  }
  function addrOf(v) { if (!v.__id) Object.defineProperty(v, '__id', { value: fakeAddr() }); return v.__id; }
  function str(v) {
    if (typeof v === 'string') return v;
    if (v instanceof PyExc) {
      if (v.args.length === 1) return v.type === EXC.KeyError ? repr(v.args[0]) : str(v.args[0]);
      return v.args.length ? repr(new PyTuple(v.args)) : '';
    }
    return repr(v);
  }
  function viewItems(v) {
    if (v.kind === 'keys') return v.dict.keys();
    if (v.kind === 'values') return v.dict.values();
    return v.dict.entries().map(([k, x]) => new PyTuple([k, x]));
  }

  /* =====================================================================
   *  Chyby
   * ===================================================================== */
  const EXC = {};
  function excType(name, base) { EXC[name] = new PyType(name, null, base ? EXC[base] : null, true); }
  excType('BaseException');
  excType('Exception', 'BaseException');
  ['ArithmeticError', 'LookupError', 'ValueError', 'TypeError', 'NameError', 'AttributeError', 'RuntimeError', 'AssertionError',
    'StopIteration', 'ImportError', 'SyntaxError', 'OSError'].forEach(n => excType(n, 'Exception'));
  excType('ZeroDivisionError', 'ArithmeticError');
  excType('OverflowError', 'ArithmeticError');
  excType('IndexError', 'LookupError');
  excType('KeyError', 'LookupError');
  excType('UnboundLocalError', 'NameError');
  excType('RecursionError', 'RuntimeError');
  excType('NotImplementedError', 'RuntimeError');
  excType('ModuleNotFoundError', 'ImportError');
  excType('IndentationError', 'SyntaxError');
  excType('TabError', 'IndentationError');
  excType('UnicodeError', 'ValueError');

  function err(type, msg) { return new PyThrow(new PyExc(EXC[type], [msg]), 0, null); }
  function excIsA(t, base) { for (let x = t; x; x = x.base) if (x === base) return true; return false; }

  class PySyntaxError {
    constructor(type, msg, line, col) { this.type = type; this.msg = msg; this.line = line; this.col = col || 0; }
  }

  /* =====================================================================
   *  Lexer
   * ===================================================================== */
  const KEYWORDS = new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
    'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield', 'async', 'await']);
  const OPS = ['**=', '//=', '>>=', '<<=', '...', '**', '//', '==', '!=', '<=', '>=', '->', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', ':=',
    '+', '-', '*', '/', '%', '<', '>', '=', '(', ')', '[', ']', '{', '}', ',', ':', '.', ';', '@', '&', '|', '^', '~'];
  const ID_START = /[A-Za-z_À-￿]/;
  const ID_CHAR = /[A-Za-z0-9_À-￿]/;

  function tokenize(src) {
    src = src.replace(/\r\n?/g, '\n');
    const toks = [];
    const indents = [0];
    const brackets = [];   // [char, line]
    let i = 0;
    let line = 1;
    let atLineStart = true;
    const n = src.length;
    const push = (t, v, l, c) => toks.push({ t, v, line: l || line, col: c || 0 });
    while (i < n) {
      if (atLineStart && brackets.length === 0) {
        // odsazení na začátku logického řádku
        let col = 0;
        let j = i;
        while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '\f')) { col = src[j] === '\t' ? (Math.floor(col / 8) + 1) * 8 : col + 1; j++; }
        if (j >= n) { i = j; break; }
        if (src[j] === '\n' || src[j] === '#') {
          // prázdný řádek nebo komentář – odsazení se nepočítá
          while (j < n && src[j] !== '\n') j++;
          i = j + 1;
          line++;
          continue;
        }
        if (src[j] === '\\' && src[j + 1] === '\n') { i = j + 2; line++; continue; }
        const top = indents[indents.length - 1];
        if (col > top) {
          indents.push(col);
          push('indent', col, line, 0);
        } else if (col < top) {
          while (indents.length && col < indents[indents.length - 1]) { indents.pop(); push('dedent', col, line, 0); }
          if (indents[indents.length - 1] !== col) throw new PySyntaxError('IndentationError', 'unindent does not match any outer indentation level', line, col);
        }
        i = j;
        atLineStart = false;
        continue;
      }
      const c = src[i];
      if (c === '\n') {
        if (brackets.length === 0) { if (toks.length && toks[toks.length - 1].t !== 'nl') push('nl', null); atLineStart = true; }
        line++;
        i++;
        continue;
      }
      if (c === ' ' || c === '\t' || c === '\f') { i++; continue; }
      if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '\\' && src[i + 1] === '\n') { i += 2; line++; continue; }
      if (c === '\\') throw new PySyntaxError('SyntaxError', 'unexpected character after line continuation character', line);
      const startCol = i - src.lastIndexOf('\n', i - 1) - 1;
      // čísla
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        let m = /^0[xX][0-9a-fA-F_]+|^0[bB][01_]+|^0[oO][0-7_]+/.exec(src.slice(i, i + 200));
        if (m) {
          const txt = m[0].replace(/_/g, '');
          push('num', BigInt(txt), line, startCol);
          i += m[0].length;
          continue;
        }
        m = /^(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?[jJ]?/.exec(src.slice(i, i + 400));
        const txt = m[0].replace(/_/g, '');
        if (/[jJ]$/.test(txt)) throw new PySyntaxError('SyntaxError', 'komplexní čísla tu nejsou podporovaná', line);
        if (/[.eE]/.test(txt)) push('num', parseFloat(txt), line, startCol);
        else {
          if (/^0\d/.test(txt) && /[1-9]/.test(txt)) throw new PySyntaxError('SyntaxError', 'leading zeros in decimal integer literals are not permitted; use an 0o prefix for octal integers', line);
          push('num', BigInt(txt), line, startCol);
        }
        i += m[0].length;
        if (i < n && ID_START.test(src[i])) throw new PySyntaxError('SyntaxError', 'invalid decimal literal', line);
        continue;
      }
      // řetězce (i s předponou r, f, rf…)
      const pm = /^([rRfFbBuU]{1,2})?(['"])/.exec(src.slice(i, i + 4));
      if (pm && (pm[1] ? /^(r|f|rf|fr|b|br|rb|u)$/i.test(pm[1]) : true)) {
        const prefix = (pm[1] || '').toLowerCase();
        if (prefix.includes('b')) throw new PySyntaxError('SyntaxError', 'bajtové řetězce (b"…") tu nejsou podporované', line);
        const q = pm[2];
        let j = i + (pm[1] ? pm[1].length : 0);
        const triple = src.substr(j, 3) === q + q + q;
        const qlen = triple ? 3 : 1;
        j += qlen;
        const startLine = line;
        let raw = '';
        let closed = false;
        while (j < n) {
          const ch = src[j];
          if (ch === '\\') {
            raw += ch + (src[j + 1] || '');
            if (src[j + 1] === '\n') line++;
            j += 2;
            continue;
          }
          if (triple ? src.substr(j, 3) === q + q + q : ch === q) { closed = true; j += qlen; break; }
          if (ch === '\n') {
            if (!triple) break;
            line++;
          }
          raw += ch;
          j++;
        }
        if (!closed) {
          throw new PySyntaxError('SyntaxError', triple ? `unterminated triple-quoted string literal (detected at line ${line})` : `unterminated string literal (detected at line ${startLine})`, startLine);
        }
        push('str', { raw, f: prefix.includes('f'), r: prefix.includes('r') }, startLine, startCol);
        i = j;
        continue;
      }
      // jména
      if (ID_START.test(c)) {
        let j = i + 1;
        while (j < n && ID_CHAR.test(src[j])) j++;
        const w = src.slice(i, j);
        push(KEYWORDS.has(w) ? 'kw' : 'name', w, line, startCol);
        i = j;
        continue;
      }
      // operátory
      let op = null;
      for (const o of OPS) if (src.startsWith(o, i)) { op = o; break; }
      if (!op) {
        if (c === '!' ) throw new PySyntaxError('SyntaxError', 'invalid syntax', line);
        if (c === '$' || c === '?' || c === '`') throw new PySyntaxError('SyntaxError', 'invalid syntax', line);
        throw new PySyntaxError('SyntaxError', `invalid character '${c}' (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`, line);
      }
      if ('([{'.includes(op)) brackets.push([op, line]);
      else if (')]}'.includes(op)) {
        const open = brackets.pop();
        if (!open) throw new PySyntaxError('SyntaxError', `unmatched '${op}'`, line);
        const want = { '(': ')', '[': ']', '{': '}' }[open[0]];
        if (want !== op) {
          throw new PySyntaxError('SyntaxError', open[1] === line ? `closing parenthesis '${op}' does not match opening parenthesis '${open[0]}'`
            : `closing parenthesis '${op}' does not match opening parenthesis '${open[0]}' on line ${open[1]}`, line);
        }
      }
      push('op', op, line, startCol);
      i += op.length;
    }
    if (brackets.length) {
      const [b, l] = brackets[brackets.length - 1];
      throw new PySyntaxError('SyntaxError', `'${b}' was never closed`, l);
    }
    if (toks.length && toks[toks.length - 1].t !== 'nl') push('nl', null);
    while (indents.length > 1) { indents.pop(); push('dedent', 0, line, 0); }
    push('eof', null, line, 0);
    return toks;
  }

  function unescape(raw, line) {
    let out = '';
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c !== '\\') { out += c; continue; }
      const d = raw[++i];
      switch (d) {
        case 'n': out += '\n'; break;
        case 't': out += '\t'; break;
        case 'r': out += '\r'; break;
        case '0': out += '\0'; break;
        case '\\': out += '\\'; break;
        case "'": out += "'"; break;
        case '"': out += '"'; break;
        case 'a': out += '\x07'; break;
        case 'b': out += '\b'; break;
        case 'f': out += '\f'; break;
        case 'v': out += '\v'; break;
        case '\n': break;
        case 'x': { const h = raw.substr(i + 1, 2); if (!/^[0-9a-fA-F]{2}$/.test(h)) throw new PySyntaxError('SyntaxError', '(unicode error) truncated \\xXX escape', line); out += String.fromCharCode(parseInt(h, 16)); i += 2; break; }
        case 'u': { const h = raw.substr(i + 1, 4); if (!/^[0-9a-fA-F]{4}$/.test(h)) throw new PySyntaxError('SyntaxError', '(unicode error) truncated \\uXXXX escape', line); out += String.fromCharCode(parseInt(h, 16)); i += 4; break; }
        case 'U': { const h = raw.substr(i + 1, 8); out += String.fromCodePoint(parseInt(h, 16)); i += 8; break; }
        default: out += '\\' + (d === undefined ? '' : d);
      }
    }
    return out;
  }

  /* =====================================================================
   *  Parser → AST
   * ===================================================================== */
  const AUG = new Set(['+=', '-=', '*=', '/=', '//=', '%=', '**=', '&=', '|=', '^=', '>>=', '<<=']);
  const COMP_OPS = new Set(['<', '>', '==', '>=', '<=', '!=']);
  const STMT_NAMES = { if: "'if' statement", elif: "'elif' statement", else: "'else' statement", while: "'while' statement", for: "'for' statement",
    def: 'function definition', try: "'try' statement", except: "'except' statement", finally: "'finally' statement" };

  class Parser {
    constructor(toks) { this.toks = toks; this.p = 0; this.funcDepth = 0; this.loopDepth = 0; }
    get tok() { return this.toks[this.p]; }
    peek(k) { return this.toks[this.p + (k || 0)]; }
    next() { return this.toks[this.p++]; }
    is(t, v) { const k = this.tok; return k.t === t && (v === undefined || k.v === v); }
    isOp(v) { return this.is('op', v); }
    isKw(v) { return this.is('kw', v); }
    accept(t, v) { if (this.is(t, v)) return this.next(); return null; }
    fail(msg, tok, type) { const t = tok || this.tok; throw new PySyntaxError(type || 'SyntaxError', msg || 'invalid syntax', t.line, t.col); }
    expect(t, v, msg) { if (this.is(t, v)) return this.next(); this.fail(msg || (v ? `expected '${v}'` : 'invalid syntax')); return null; }

    parseFile() {
      const body = [];
      while (!this.is('eof')) {
        if (this.accept('nl')) continue;
        if (this.is('indent')) this.fail('unexpected indent', null, 'IndentationError');
        body.push(...this.statement());
      }
      return body;
    }

    statement() {
      const t = this.tok;
      if (t.t === 'kw') {
        switch (t.v) {
          case 'if': return [this.ifStmt()];
          case 'while': return [this.whileStmt()];
          case 'for': return [this.forStmt()];
          case 'def': return [this.defStmt()];
          case 'try': return [this.tryStmt()];
          case 'class': this.fail('třídy (class) tahle hra zatím nepodporuje – použij funkce, seznamy a slovníky'); break;
          case 'with': this.fail('příkaz with tahle hra nepodporuje'); break;
          case 'elif': case 'else': case 'except': case 'finally': this.fail('invalid syntax'); break;
          default: break;
        }
      }
      return this.simpleStmts();
    }

    simpleStmts() {
      const out = [this.smallStmt()];
      while (this.accept('op', ';')) {
        if (this.is('nl')) break;
        out.push(this.smallStmt());
      }
      if (!this.accept('nl')) {
        if (this.is('eof')) return out;
        const t = this.tok;
        if (t.t === 'str' && out.length === 1 && out[0].k === 'expr' && out[0].e.k === 'name' && out[0].e.id === 'print') {
          this.fail("Missing parentheses in call to 'print'. Did you mean print(...)?", out[0].e.tok);
        }
        if (t.t === 'op' && t.v === '=' ) this.fail('invalid syntax. Maybe you meant \'==\' or \':=\' instead of \'=\'?');
        this.fail('invalid syntax', t);
      }
      return out;
    }

    smallStmt() {
      const t = this.tok;
      const line = t.line;
      if (t.t === 'kw') {
        switch (t.v) {
          case 'pass': this.next(); return { k: 'pass', line };
          case 'break': this.next(); if (!this.loopDepth) this.fail("'break' outside loop", t); return { k: 'break', line };
          case 'continue': this.next(); if (!this.loopDepth) this.fail("'continue' not properly in loop", t); return { k: 'continue', line };
          case 'return': {
            this.next();
            if (!this.funcDepth) this.fail("'return' outside function", t);
            const value = this.is('nl') || this.isOp(';') || this.is('eof') ? null : this.testList();
            return { k: 'return', value, line };
          }
          case 'global': case 'nonlocal': {
            this.next();
            const names = [this.expect('name').v];
            while (this.accept('op', ',')) names.push(this.expect('name').v);
            return { k: t.v, names, line };
          }
          case 'del': {
            this.next();
            const targets = [this.orExpr()];
            while (this.accept("op", ",")) targets.push(this.orExpr());
            return { k: 'del', targets, line };
          }
          case 'import': {
            this.next();
            const names = [];
            do {
              let name = this.expect('name').v;
              while (this.accept('op', '.')) name += '.' + this.expect('name').v;
              const as = this.accept('kw', 'as') ? this.expect('name').v : null;
              names.push({ name, as });
            } while (this.accept('op', ','));
            return { k: 'import', names, line };
          }
          case 'from': {
            this.next();
            let module = this.expect('name').v;
            while (this.accept('op', '.')) module += '.' + this.expect('name').v;
            this.expect('kw', 'import');
            const names = [];
            const paren = this.accept('op', '(');
            if (this.accept('op', '*')) names.push({ name: '*', as: null });
            else {
              do {
                if (paren && this.isOp(')')) break;
                const name = this.expect('name').v;
                const as = this.accept('kw', 'as') ? this.expect('name').v : null;
                names.push({ name, as });
              } while (this.accept('op', ','));
            }
            if (paren) this.expect('op', ')');
            return { k: 'from', module, names, line };
          }
          case 'raise': {
            this.next();
            const exc = this.is('nl') || this.is('eof') ? null : this.test();
            if (this.accept('kw', 'from')) this.test();
            return { k: 'raise', exc, line };
          }
          case 'assert': {
            this.next();
            const test = this.test();
            const msg = this.accept('op', ',') ? this.test() : null;
            return { k: 'assert', test, msg, line };
          }
          default: break;
        }
      }
      // výraz, přiřazení, rozšířené přiřazení
      const first = this.testListStar();
      if (this.is('op') && AUG.has(this.tok.v)) {
        const op = this.next().v;
        this.checkTarget(first, true);
        const value = this.testList();
        return { k: 'aug', target: first, op: op.slice(0, -1), value, line };
      }
      if (this.isOp('=')) {
        const targets = [first];
        let value;
        while (this.accept('op', '=')) {
          value = this.testListStar();
          if (this.isOp('=')) targets.push(value);
        }
        targets.forEach(x => this.checkTarget(x, false));
        return { k: 'assign', targets, value, line };
      }
      if (this.isOp(':') && first.k === 'name') {
        // anotace typu: x: int = 5
        this.next();
        this.test();
        if (this.accept('op', '=')) return { k: 'assign', targets: [first], value: this.test(), line };
        return { k: 'pass', line };
      }
      return { k: 'expr', e: first, line };
    }

    checkTarget(e, aug) {
      const bad = what => this.fail(`cannot assign to ${what}${aug ? '' : " here. Maybe you meant '==' instead of '='?"}`);
      switch (e.k) {
        case 'name': if (['True', 'False', 'None'].includes(e.id)) bad(e.id); return;
        case 'index': case 'attr': return;
        case 'tuple': case 'list':
          if (aug) this.fail(`'${e.k}' is an illegal expression for augmented assignment`);
          e.elts.forEach(x => this.checkTarget(x, aug));
          return;
        case 'starred': return;
        case 'call': this.fail(aug ? "'function call' is an illegal expression for augmented assignment" : "cannot assign to function call here. Maybe you meant '==' instead of '='?"); return;
        case 'const': bad(repr(e.v)); return;
        case 'num': case 'str': this.fail(aug ? "'literal' is an illegal expression for augmented assignment" : "cannot assign to literal here. Maybe you meant '==' instead of '='?"); return;
        default: this.fail(aug ? "'expression' is an illegal expression for augmented assignment" : "cannot assign to expression here. Maybe you meant '==' instead of '='?");
      }
    }

    block(kind, headTok) {
      if (!this.isOp(':')) {
        if (this.isOp('=')) this.fail("invalid syntax. Maybe you meant '==' or ':=' instead of '='?");
        this.fail("expected ':'");
      }
      this.next();
      if (!this.is('nl')) return this.simpleStmts();
      this.next();
      if (!this.is('indent')) this.fail(`expected an indented block after ${STMT_NAMES[kind] || 'statement'} on line ${headTok.line}`, this.tok, 'IndentationError');
      this.next();
      const body = [];
      while (!this.is('dedent') && !this.is('eof')) {
        if (this.accept('nl')) continue;
        if (this.is('indent')) this.fail('unexpected indent', null, 'IndentationError');
        body.push(...this.statement());
      }
      this.accept('dedent');
      return body;
    }

    ifStmt() {
      const head = this.next();
      const test = this.test();
      const body = this.block(head.v, head);
      let orelse = [];
      if (this.isKw('elif')) { const n = this.ifStmt(); n.elif = true; orelse = [n]; }
      else if (this.isKw('else')) { const e = this.next(); orelse = this.block('else', e); }
      return { k: 'if', test, body, orelse, line: head.line };
    }
    whileStmt() {
      const head = this.next();
      const test = this.test();
      this.loopDepth++;
      const body = this.block('while', head);
      this.loopDepth--;
      let orelse = [];
      if (this.isKw('else')) { const e = this.next(); orelse = this.block('else', e); }
      return { k: 'while', test, body, orelse, line: head.line };
    }
    forStmt() {
      const head = this.next();
      const target = this.targetList();
      if (!this.isKw('in')) this.fail("invalid syntax");
      this.next();
      const iter = this.testList();
      this.loopDepth++;
      const body = this.block('for', head);
      this.loopDepth--;
      let orelse = [];
      if (this.isKw('else')) { const e = this.next(); orelse = this.block('else', e); }
      return { k: 'for', target, iter, body, orelse, line: head.line };
    }
    targetList() {
      const first = this.orExpr();
      if (!this.isOp(',')) { this.checkTarget(first, false); return first; }
      const elts = [first];
      while (this.accept('op', ',')) { if (this.isKw('in') || this.isOp('=')) break; elts.push(this.orExpr()); }
      const t = { k: 'tuple', elts, line: first.line };
      this.checkTarget(t, false);
      return t;
    }
    defStmt() {
      const head = this.next();
      const nameTok = this.expect('name', undefined, 'invalid syntax');
      if (!this.isOp('(')) this.fail("expected '('");
      this.next();
      const params = this.params(')');
      this.expect('op', ')');
      if (this.accept('op', '->')) this.test();
      const savedLoop = this.loopDepth;
      this.funcDepth++;
      this.loopDepth = 0;
      const body = this.block('def', head);
      this.funcDepth--;
      this.loopDepth = savedLoop;
      const node = { k: 'def', name: nameTok.v, params, body, line: head.line };
      analyzeScope(node);
      return node;
    }
    params(end) {
      const params = [];
      let seenDefault = false;
      while (!this.isOp(end)) {
        if (this.isOp('*') || this.isOp('**')) {
          const star = this.next().v;
          const name = this.expect('name').v;
          params.push({ name, star });
        } else {
          const name = this.expect('name', undefined, 'invalid syntax').v;
          if (end === ')' && this.accept('op', ':')) this.test();
          let def = null;
          if (this.accept('op', '=')) { def = this.test(); seenDefault = true; } else if (seenDefault && !params.some(p => p.star)) this.fail('parameter without a default follows parameter with a default');
          if (params.some(p => p.name === name)) this.fail(`duplicate argument '${name}' in function definition`);
          params.push({ name, def });
        }
        if (!this.accept('op', ',')) break;
      }
      return params;
    }
    tryStmt() {
      const head = this.next();
      const body = this.block('try', head);
      const handlers = [];
      while (this.isKw('except')) {
        const h = this.next();
        let type = null;
        let name = null;
        if (!this.isOp(':')) {
          type = this.test();
          if (this.accept('kw', 'as')) name = this.expect('name').v;
        }
        handlers.push({ type, name, body: this.block('except', h), line: h.line });
      }
      let orelse = [];
      let final = [];
      if (this.isKw('else')) { const e = this.next(); orelse = this.block('else', e); }
      if (this.isKw('finally')) { const f = this.next(); final = this.block('finally', f); }
      if (!handlers.length && !final.length) this.fail("expected 'except' or 'finally' block");
      return { k: 'try', body, handlers, orelse, final, line: head.line };
    }

    /* ---------- výrazy ---------- */
    testList() {
      const first = this.test();
      if (!this.isOp(',')) return first;
      const elts = [first];
      while (this.accept('op', ',')) {
        if (this.endOfList()) break;
        elts.push(this.test());
      }
      return { k: 'tuple', elts, line: first.line };
    }
    testListStar() {
      const one = () => (this.isOp('*') ? (this.next(), { k: 'starred', e: this.orExpr(), line: this.tok.line }) : this.test());
      const first = one();
      if (!this.isOp(',')) return first;
      const elts = [first];
      while (this.accept('op', ',')) {
        if (this.endOfList()) break;
        elts.push(one());
      }
      return { k: 'tuple', elts, line: first.line };
    }
    endOfList() {
      const t = this.tok;
      return t.t === 'nl' || t.t === 'eof' || (t.t === 'op' && ['=', ')', ']', '}', ';', ':'].includes(t.v)) || (t.t === 'op' && AUG.has(t.v));
    }
    test() {
      if (this.isKw('lambda')) return this.lambda();
      const line = this.tok.line;
      const e = this.orTest();
      if (this.isKw('if') ) {
        const save = this.p;
        this.next();
        const cond = this.orTest();
        if (!this.isKw('else')) { this.p = save; this.fail("expected 'else' after 'if' expression"); }
        this.next();
        const orelse = this.test();
        return { k: 'ifexp', test: cond, body: e, orelse, line };
      }
      if (this.isOp(':=')) this.fail('mroží operátor := tahle hra nepodporuje');
      return e;
    }
    testNoCond() { return this.isKw('lambda') ? this.lambda(true) : this.orTest(); }
    lambda(noCond) {
      const t = this.next();
      const params = this.params(':');
      this.expect('op', ':');
      this.funcDepth++;
      const body = noCond ? this.testNoCond() : this.test();
      this.funcDepth--;
      const node = { k: 'lambda', params, body, line: t.line };
      node.locals = new Set(params.map(p => p.name));
      node.globals = new Set();
      node.nonlocals = new Set();
      return node;
    }
    orTest() {
      let e = this.andTest();
      if (!this.isKw('or')) return e;
      const vals = [e];
      while (this.accept('kw', 'or')) vals.push(this.andTest());
      return { k: 'bool', op: 'or', vals, line: e.line };
    }
    andTest() {
      let e = this.notTest();
      if (!this.isKw('and')) return e;
      const vals = [e];
      while (this.accept('kw', 'and')) vals.push(this.notTest());
      return { k: 'bool', op: 'and', vals, line: e.line };
    }
    notTest() {
      if (this.isKw('not')) { const t = this.next(); return { k: 'not', e: this.notTest(), line: t.line }; }
      return this.comparison();
    }
    comparison() {
      const first = this.orExpr();
      const ops = [];
      const rest = [];
      for (;;) {
        const t = this.tok;
        let op = null;
        if (t.t === 'op' && COMP_OPS.has(t.v)) { op = t.v; this.next(); }
        else if (t.t === 'kw' && t.v === 'in') { op = 'in'; this.next(); }
        else if (t.t === 'kw' && t.v === 'not' && this.peek(1).t === 'kw' && this.peek(1).v === 'in') { op = 'not in'; this.next(); this.next(); }
        else if (t.t === 'kw' && t.v === 'is') { this.next(); op = this.accept('kw', 'not') ? 'is not' : 'is'; }
        else break;
        ops.push(op);
        rest.push(this.orExpr());
      }
      if (!ops.length) return first;
      return { k: 'cmp', first, ops, rest, line: first.line };
    }
    binLevel(next, ops) {
      let e = next();
      while (this.is('op') && ops.includes(this.tok.v)) {
        const op = this.next().v;
        const r = next();
        e = { k: 'bin', op, l: e, r, line: e.line };
      }
      return e;
    }
    orExpr() { return this.binLevel(() => this.xorExpr(), ['|']); }
    xorExpr() { return this.binLevel(() => this.andExpr(), ['^']); }
    andExpr() { return this.binLevel(() => this.shiftExpr(), ['&']); }
    shiftExpr() { return this.binLevel(() => this.arith(), ['<<', '>>']); }
    arith() { return this.binLevel(() => this.term(), ['+', '-']); }
    term() { return this.binLevel(() => this.factor(), ['*', '/', '//', '%', '@']); }
    factor() {
      if (this.is('op') && ['-', '+', '~'].includes(this.tok.v)) {
        const t = this.next();
        const e = this.factor();
        if (t.v === '-' && e.k === 'num') return { k: 'num', v: typeof e.v === 'bigint' ? -e.v : -e.v, line: t.line };
        return { k: 'unary', op: t.v, e, line: t.line };
      }
      return this.power();
    }
    power() {
      const base = this.primary();
      if (this.isOp('**')) { this.next(); const ex = this.factor(); return { k: 'bin', op: '**', l: base, r: ex, line: base.line }; }
      return base;
    }
    primary() {
      let e = this.atom();
      for (;;) {
        if (this.isOp('(')) { e = this.callTrailer(e); continue; }
        if (this.isOp('[')) {
          const t = this.next();
          const idx = this.subscript();
          this.expect('op', ']');
          e = { k: 'index', obj: e, idx, line: t.line };
          continue;
        }
        if (this.isOp('.')) {
          this.next();
          const name = this.tok;
          if (name.t !== 'name' && name.t !== 'kw') this.fail('invalid syntax');
          this.next();
          e = { k: 'attr', obj: e, name: name.v, line: name.line };
          continue;
        }
        return e;
      }
    }
    callTrailer(f) {
      const t = this.next();
      const args = [];
      const kwargs = [];
      while (!this.isOp(')')) {
        if (this.isOp('*') || this.isOp('**')) {
          const s = this.next().v;
          const v = this.test();
          if (s === '*') args.push({ k: 'starred', e: v, line: v.line }); else kwargs.push({ name: null, value: v, dstar: true });
        } else if (this.is('name') && this.peek(1).t === 'op' && this.peek(1).v === '=') {
          const name = this.next().v;
          this.next();
          if (kwargs.some(k => k.name === name)) this.fail(`keyword argument repeated: ${name}`);
          kwargs.push({ name, value: this.test() });
        } else {
          if (kwargs.length) this.fail('positional argument follows keyword argument');
          let a = this.test();
          if (this.isKw('for')) a = this.compFor('genexp', a, null, a.line);
          args.push(a);
        }
        if (!this.accept('op', ',')) break;
      }
      if (!this.isOp(')')) {
        if (this.is('name') || this.is('num') || this.is('str')) this.fail('invalid syntax. Perhaps you forgot a comma?');
        this.fail("invalid syntax");
      }
      this.next();
      return { k: 'call', f, args, kwargs, line: t.line };
    }
    subscript() {
      const line = this.tok.line;
      const part = () => (this.isOp(':') || this.isOp(']') || this.isOp(',') ? null : this.test());
      const lo = part();
      if (!this.isOp(':')) {
        if (this.isOp(',')) {
          const elts = [lo];
          while (this.accept('op', ',')) { if (this.isOp(']')) break; elts.push(this.test()); }
          return { k: 'tuple', elts, line };
        }
        return lo;
      }
      this.next();
      const hi = part();
      let step = null;
      if (this.accept('op', ':')) step = part();
      return { k: 'slice', lo, hi, step, line };
    }
    atom() {
      const t = this.tok;
      switch (t.t) {
        case 'num': this.next(); return { k: 'num', v: t.v, line: t.line };
        case 'str': return this.strings();
        case 'name': this.next(); return { k: 'name', id: t.v, line: t.line, tok: t };
        case 'kw':
          if (t.v === 'True' || t.v === 'False' || t.v === 'None') { this.next(); return { k: 'const', v: t.v === 'True' ? true : t.v === 'False' ? false : null, line: t.line }; }
          if (t.v === 'lambda') return this.lambda();
          if (t.v === 'yield') this.fail('generátory (yield) tahle hra nepodporuje');
          this.fail('invalid syntax');
          break;
        case 'op':
          if (t.v === '(') return this.parenAtom();
          if (t.v === '[') return this.listAtom();
          if (t.v === '{') return this.dictAtom();
          if (t.v === '...') { this.next(); return { k: 'const', v: null, line: t.line }; }
          this.fail('invalid syntax');
          break;
        case 'indent': this.fail('unexpected indent', t, 'IndentationError'); break;
        case 'nl': case 'eof': this.fail('invalid syntax'); break;
        default: this.fail('invalid syntax');
      }
      return null;
    }
    strings() {
      const first = this.tok;
      const parts = [];
      let isF = false;
      while (this.is('str')) {
        const t = this.next();
        if (t.v.f) { isF = true; parts.push(...parseFString(t.v.raw, t.v.r, t.line)); }
        else parts.push(t.v.r ? t.v.raw : unescape(t.v.raw, t.line));
      }
      if (!isF) return { k: 'str', v: parts.join(''), line: first.line };
      const merged = [];
      for (const p of parts) {
        if (typeof p === 'string' && typeof merged[merged.length - 1] === 'string') merged[merged.length - 1] += p;
        else merged.push(p);
      }
      return { k: 'fstr', parts: merged, line: first.line };
    }
    parenAtom() {
      const t = this.next();
      if (this.accept('op', ')')) return { k: 'tuple', elts: [], line: t.line };
      const first = this.isOp('*') ? (this.next(), { k: 'starred', e: this.orExpr(), line: t.line }) : this.test();
      if (this.isKw('for')) { const g = this.compFor('genexp', first, null, t.line); this.expect('op', ')'); return g; }
      if (this.accept('op', ')')) return first.k === 'starred' ? this.fail('cannot use starred expression here') : Object.assign({}, first, { paren: true });
      const elts = [first];
      while (this.accept('op', ',')) {
        if (this.isOp(')')) break;
        elts.push(this.isOp('*') ? (this.next(), { k: 'starred', e: this.orExpr(), line: t.line }) : this.test());
      }
      if (!this.isOp(')')) this.fail(this.is('name') || this.is('num') || this.is('str') ? 'invalid syntax. Perhaps you forgot a comma?' : "invalid syntax");
      this.next();
      return { k: 'tuple', elts, line: t.line };
    }
    listAtom() {
      const t = this.next();
      if (this.accept('op', ']')) return { k: 'list', elts: [], line: t.line };
      const first = this.isOp('*') ? (this.next(), { k: 'starred', e: this.orExpr(), line: t.line }) : this.test();
      if (this.isKw('for')) { const c = this.compFor('listcomp', first, null, t.line); this.expect('op', ']'); return c; }
      const elts = [first];
      while (this.accept('op', ',')) {
        if (this.isOp(']')) break;
        elts.push(this.isOp('*') ? (this.next(), { k: 'starred', e: this.orExpr(), line: t.line }) : this.test());
      }
      if (!this.isOp(']')) this.fail(this.is('name') || this.is('num') || this.is('str') ? 'invalid syntax. Perhaps you forgot a comma?' : "invalid syntax");
      this.next();
      return { k: 'list', elts, line: t.line };
    }
    dictAtom() {
      const t = this.next();
      if (this.accept('op', '}')) return { k: 'dict', keys: [], vals: [], line: t.line };
      if (this.isOp('**')) this.fail('rozbalování ** ve slovníku tahle hra nepodporuje');
      const first = this.test();
      if (this.accept('op', ':')) {
        const val = this.test();
        if (this.isKw('for')) { const c = this.compFor('dictcomp', first, val, t.line); this.expect('op', '}'); return c; }
        const keys = [first];
        const vals = [val];
        while (this.accept('op', ',')) {
          if (this.isOp('}')) break;
          keys.push(this.test());
          this.expect('op', ':', "':' expected after dictionary key");
          vals.push(this.test());
        }
        this.expect('op', '}', "invalid syntax");
        return { k: 'dict', keys, vals, line: t.line };
      }
      if (this.isKw('for')) { const c = this.compFor('setcomp', first, null, t.line); this.expect('op', '}'); return c; }
      const elts = [first];
      while (this.accept('op', ',')) { if (this.isOp('}')) break; elts.push(this.test()); }
      this.expect('op', '}', 'invalid syntax');
      return { k: 'set', elts, line: t.line };
    }
    compFor(kind, elt, val, line) {
      const gens = [];
      while (this.isKw('for')) {
        this.next();
        const target = this.targetList();
        this.expect('kw', 'in');
        const iter = this.orTest();
        const ifs = [];
        while (this.isKw('if')) { this.next(); ifs.push(this.testNoCond()); }
        gens.push({ target, iter, ifs });
      }
      return kind === 'dictcomp' ? { k: kind, key: elt, val, gens, line } : { k: kind, elt, gens, line };
    }
  }

  /* f-string → části: text nebo { e, conv, spec } */
  function parseFString(raw, isRaw, line) {
    const parts = [];
    let lit = '';
    let i = 0;
    const flush = () => { if (lit) { parts.push(isRaw ? lit : unescape(lit, line)); lit = ''; } };
    while (i < raw.length) {
      const c = raw[i];
      if (c === '{') {
        if (raw[i + 1] === '{') { lit += '{'; i += 2; continue; }
        flush();
        // najdi konec výrazu
        let depth = 0;
        let j = i + 1;
        let q = null;
        let exprEnd = -1;
        let conv = null;
        let specStart = -1;
        for (; j < raw.length; j++) {
          const ch = raw[j];
          if (q) { if (ch === q) q = null; continue; }
          if (ch === '"' || ch === "'") { q = ch; continue; }
          if ('([{'.includes(ch)) depth++;
          else if (')]}'.includes(ch)) {
            if (depth === 0 && ch === '}') { if (exprEnd < 0) exprEnd = j; break; }
            depth--;
          } else if (depth === 0 && ch === '!' && raw[j + 1] !== '=' && exprEnd < 0) { exprEnd = j; conv = raw[j + 1]; j++; }
          else if (depth === 0 && ch === ':' && specStart < 0) { if (exprEnd < 0) exprEnd = j; specStart = j + 1; break; }
        }
        if (specStart >= 0) {
          // formátovací specifikace může obsahovat vnořené {…}
          let d = 0;
          let k = specStart;
          for (; k < raw.length; k++) {
            if (raw[k] === '{') d++;
            else if (raw[k] === '}') { if (d === 0) break; d--; }
          }
          if (k >= raw.length) throw new PySyntaxError('SyntaxError', "f-string: expecting '}'", line);
          const exprSrc = raw.slice(i + 1, exprEnd);
          const spec = parseFString(raw.slice(specStart, k), true, line);
          parts.push({ e: parseExprSrc(exprSrc, line), conv, spec, src: exprSrc });
          i = k + 1;
          continue;
        }
        if (j >= raw.length) throw new PySyntaxError('SyntaxError', "f-string: expecting '}'", line);
        let exprSrc = raw.slice(i + 1, exprEnd);
        let debug = false;
        if (/=\s*$/.test(exprSrc) && !/[=!<>]=\s*$/.test(exprSrc)) { debug = true; }
        if (!exprSrc.trim()) throw new PySyntaxError('SyntaxError', 'f-string: valid expression required before \'}\'', line);
        const e = parseExprSrc(debug ? exprSrc.replace(/=\s*$/, '') : exprSrc, line);
        if (debug) parts.push(exprSrc);
        parts.push({ e, conv: conv || (debug ? 'r' : null), spec: null, src: exprSrc });
        i = j + 1;
        continue;
      }
      if (c === '}') {
        if (raw[i + 1] === '}') { lit += '}'; i += 2; continue; }
        throw new PySyntaxError('SyntaxError', "f-string: single '}' is not allowed", line);
      }
      if (c === '\\' && !isRaw) { lit += c + (raw[i + 1] || ''); i += 2; continue; }
      lit += c;
      i++;
    }
    flush();
    return parts;
  }
  function parseExprSrc(src, line) {
    let toks;
    try { toks = tokenize('(' + src.replace(/\n/g, ' ') + ')'); } catch (e) { if (e instanceof PySyntaxError) e.line = line; throw e; }
    toks.forEach(t => { t.line = line; });
    const p = new Parser(toks);
    p.funcDepth = 1;
    const e = p.test();
    p.accept('nl');
    if (!p.is('eof')) throw new PySyntaxError('SyntaxError', 'f-string: invalid syntax', line);
    return e;
  }

  /* lokální proměnné funkce (jako Python: co se ve funkci přiřazuje, je lokální) */
  function analyzeScope(def) {
    const locals = new Set(def.params.map(p => p.name));
    const globals = new Set();
    const nonlocals = new Set();
    const target = t => {
      if (!t) return;
      if (t.k === 'name') locals.add(t.id);
      else if (t.k === 'tuple' || t.k === 'list') t.elts.forEach(target);
      else if (t.k === 'starred') target(t.e);
    };
    const walk = stmts => {
      for (const s of stmts) {
        switch (s.k) {
          case 'assign': s.targets.forEach(target); break;
          case 'aug': target(s.target); break;
          case 'for': target(s.target); walk(s.body); walk(s.orelse); break;
          case 'while': walk(s.body); walk(s.orelse); break;
          case 'if': walk(s.body); walk(s.orelse); break;
          case 'try': walk(s.body); s.handlers.forEach(h => { if (h.name) locals.add(h.name); walk(h.body); }); walk(s.orelse); walk(s.final); break;
          case 'def': locals.add(s.name); break;
          case 'import': s.names.forEach(n => locals.add(n.as || n.name.split('.')[0])); break;
          case 'from': s.names.forEach(n => { if (n.name !== '*') locals.add(n.as || n.name); }); break;
          case 'global': s.names.forEach(n => globals.add(n)); break;
          case 'nonlocal': s.names.forEach(n => nonlocals.add(n)); break;
          case 'del': s.targets.forEach(target); break;
          default: break;
        }
      }
    };
    walk(def.body);
    globals.forEach(n => locals.delete(n));
    nonlocals.forEach(n => locals.delete(n));
    def.locals = locals;
    def.globals = globals;
    def.nonlocals = nonlocals;
  }

  function parse(src) {
    const toks = tokenize(src);
    return new Parser(toks).parseFile();
  }

  /* =====================================================================
   *  Formátování (format(), f-stringy, str.format)
   * ===================================================================== */
  const SPEC_RE = /^(?:([\s\S])?([<>=^]))?([+\- ])?(z)?(#)?(0)?(\d+)?([,_])?(?:\.(\d+))?([bcdeEfFgGnosxX%])?$/;
  function groupDigits(s, sep) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, sep); }
  function formatValue(v, spec) {
    if (spec === '' || spec == null) return str(v);
    const m = SPEC_RE.exec(spec);
    if (!m) throw err('ValueError', 'Invalid format specifier \'' + spec + '\' for object of type \'' + typeName(v) + '\'');
    let [, fill, align, sign, , alt, zero, width, grouping, prec, type] = m;
    if (!align && fill) { align = fill; fill = undefined; }
    fill = fill === undefined ? ' ' : fill;
    width = width ? parseInt(width, 10) : 0;
    prec = prec !== undefined ? parseInt(prec, 10) : null;
    let body;
    let signStr = '';
    let isNumber = false;
    if (typeof v === 'string') {
      if (type && type !== 's') throw err('ValueError', `Unknown format code '${type}' for object of type 'str'`);
      if (sign) throw err('ValueError', 'Sign not allowed in string format specifier');
      body = prec !== null ? v.slice(0, prec) : v;
      align = align || '<';
    } else if (isNum(v)) {
      isNumber = true;
      let isInt = isIntLike(v);
      if (!type) type = isInt ? 'd' : (prec !== null ? 'g' : '');
      if ('bcdoxXn'.includes(type)) {
        if (!isInt) throw err('ValueError', `Unknown format code '${type}' for object of type 'float'`);
        let b = big(v);
        if (b < 0n) { signStr = '-'; b = -b; }
        if (type === 'c') body = String.fromCodePoint(Number(b));
        else {
          const base = { b: 2, o: 8, x: 16, X: 16, d: 10, n: 10 }[type];
          body = b.toString(base);
          if (type === 'X') body = body.toUpperCase();
          if (grouping) body = type === 'd' || type === 'n' ? groupDigits(body, grouping) : body.replace(/\B(?=(\w{4})+(?!\w))/g, grouping);
          if (alt && type !== 'd') body = '0' + type + body;
        }
      } else {
        let x = num(v);
        if (x < 0 || Object.is(x, -0)) { signStr = '-'; x = -x; }
        if (type === '') body = floatRepr(x);
        else if (type === 'f' || type === 'F') body = Number.isFinite(x) ? x.toFixed(prec === null ? 6 : prec) : floatRepr(x);
        else if (type === '%') body = (x * 100).toFixed(prec === null ? 6 : prec) + '%';
        else if (type === 'e' || type === 'E') {
          body = x.toExponential(prec === null ? 6 : prec).replace(/e([+-])(\d)$/, 'e$10$2');
          if (type === 'E') body = body.toUpperCase();
        } else if (type === 'g' || type === 'G') {
          const p = prec === null ? 6 : prec || 1;
          const ex = x === 0 ? 0 : Math.floor(Math.log10(x));
          if (ex < -4 || ex >= p) body = x.toExponential(p - 1).replace(/\.?0+e/, 'e').replace(/e([+-])(\d)$/, 'e$10$2');
          else body = x.toFixed(Math.max(0, p - 1 - ex)).replace(/\.?0+$/, '') || '0';
          if (type === 'G') body = body.toUpperCase();
        } else throw err('ValueError', `Unknown format code '${type}' for object of type '${typeName(v)}'`);
        if (grouping) { const [ip, fp] = body.split('.'); body = groupDigits(ip, grouping) + (fp !== undefined ? '.' + fp : ''); }
      }
      if (!signStr && sign === '+') signStr = '+';
      else if (!signStr && sign === ' ') signStr = ' ';
      if (zero && !align) { fill = '0'; align = '='; }
      align = align || '>';
    } else {
      if (spec) throw err('TypeError', `unsupported format string passed to ${typeName(v)}.__format__`);
      body = str(v);
    }
    const total = signStr.length + body.length;
    if (width <= total) return signStr + body;
    const pad = width - total;
    switch (align) {
      case '<': return signStr + body + fill.repeat(pad);
      case '>': return fill.repeat(pad) + signStr + body;
      case '^': { const l = Math.floor(pad / 2); return fill.repeat(l) + signStr + body + fill.repeat(pad - l); }
      case '=': return signStr + fill.repeat(pad) + body;
      default: return isNumber ? fill.repeat(pad) + signStr + body : signStr + body + fill.repeat(pad);
    }
  }

  /* =====================================================================
   *  Operace
   * ===================================================================== */
  const OPNAME = { '+': '+', '-': '-', '*': '*', '/': '/', '//': '//', '%': '%', '**': '** or pow()', '&': '&', '|': '|', '^': '^', '<<': '<<', '>>': '>>', '@': '@' };

  function floorDivBig(a, b) {
    const q = a / b;
    return (a % b !== 0n && ((a < 0n) !== (b < 0n))) ? q - 1n : q;
  }
  function modBig(a, b) { const r = a % b; return r !== 0n && ((r < 0n) !== (b < 0n)) ? r + b : r; }
  function modFloat(a, b) { const r = a % b; return r !== 0 && ((r < 0) !== (b < 0)) ? r + b : (r === 0 ? (b < 0 ? -0 : 0) : r); }

  function binop(op, a, b) {
    const ta = typeof a;
    const tb = typeof b;
    // čísla
    if (isNum(a) && isNum(b)) {
      if (isIntLike(a) && isIntLike(b) && op !== '/') {
        const x = big(a);
        const y = big(b);
        switch (op) {
          case '+': return x + y;
          case '-': return x - y;
          case '*': return x * y;
          case '//': if (y === 0n) throw err('ZeroDivisionError', 'integer division or modulo by zero'); return floorDivBig(x, y);
          case '%': if (y === 0n) throw err('ZeroDivisionError', 'integer modulo by zero'); return modBig(x, y);
          case '**':
            if (y < 0n) { if (x === 0n) throw err('ZeroDivisionError', 'zero to a negative power'); return Math.pow(Number(x), Number(y)); }
            if (y > 100000n && (x > 1n || x < -1n)) throw err('OverflowError', 'výsledek je příliš velké číslo');
            return x ** y;
          case '&': return x & y;
          case '|': return x | y;
          case '^': return x ^ y;
          case '<<': if (y < 0n) throw err('ValueError', 'negative shift count'); if (y > 100000n) throw err('OverflowError', 'výsledek je příliš velké číslo'); return x << y;
          case '>>': if (y < 0n) throw err('ValueError', 'negative shift count'); return x >> y;
          default: break;
        }
      } else {
        if ('&|^<<>>'.includes(op) && op.length <= 2 && ['&', '|', '^', '<<', '>>'].includes(op)) {
          throw err('TypeError', `unsupported operand type(s) for ${OPNAME[op]}: '${typeName(a)}' and '${typeName(b)}'`);
        }
        const x = num(a);
        const y = num(b);
        switch (op) {
          case '+': return x + y;
          case '-': return x - y;
          case '*': return x * y;
          case '/': if (y === 0) throw err('ZeroDivisionError', isIntLike(a) && isIntLike(b) ? 'division by zero' : 'float division by zero'); return x / y;
          case '//': if (y === 0) throw err('ZeroDivisionError', 'float floor division by zero'); return Math.floor(x / y);
          case '%': if (y === 0) throw err('ZeroDivisionError', 'float modulo by zero'); return modFloat(x, y);
          case '**': {
            if (x === 0 && y < 0) throw err('ZeroDivisionError', 'zero to a negative power');
            const r = Math.pow(x, y);
            if (Number.isNaN(r) && x < 0) throw err('ValueError', 'výsledek by bylo komplexní číslo – to tu nepodporujeme');
            if (!Number.isFinite(r) && Number.isFinite(x) && Number.isFinite(y)) throw err('OverflowError', "(34, 'Numerical result out of range')");
            return r;
          }
          default: break;
        }
      }
    }
    if (ta === 'string' && tb === 'string') {
      if (op === '+') return a + b;
      if (op === '%') return percentFormat(a, b);
    }
    if (ta === 'string' && op === '%') return percentFormat(a, b);
    if (op === '*') {
      if (ta === 'string' && isIntLike(b)) return repeatSeq(a, b);
      if (tb === 'string' && isIntLike(a)) return repeatSeq(b, a);
      if (Array.isArray(a) && isIntLike(b)) return repeatSeq(a, b);
      if (Array.isArray(b) && isIntLike(a)) return repeatSeq(b, a);
      if (a instanceof PyTuple && isIntLike(b)) return new PyTuple(repeatSeq(a.items, b));
      if (b instanceof PyTuple && isIntLike(a)) return new PyTuple(repeatSeq(b.items, a));
      if ((ta === 'string' || Array.isArray(a) || a instanceof PyTuple) && tb === 'number') throw err('TypeError', `can't multiply sequence by non-int of type 'float'`);
      if ((ta === 'string' || Array.isArray(a) || a instanceof PyTuple) && !isNum(b)) throw err('TypeError', `can't multiply sequence by non-int of type '${typeName(b)}'`);
    }
    if (op === '+') {
      if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
      if (a instanceof PyTuple && b instanceof PyTuple) return new PyTuple(a.items.concat(b.items));
      if (ta === 'string') throw err('TypeError', `can only concatenate str (not "${typeName(b)}") to str`);
      if (Array.isArray(a)) throw err('TypeError', `can only concatenate list (not "${typeName(b)}") to list`);
      if (a instanceof PyTuple) throw err('TypeError', `can only concatenate tuple (not "${typeName(b)}") to tuple`);
    }
    if (a instanceof PySet && b instanceof PySet) {
      switch (op) {
        case '|': return new PySet([...a.values(), ...b.values()]);
        case '&': return new PySet(a.values().filter(x => b.has(x)));
        case '-': return new PySet(a.values().filter(x => !b.has(x)));
        case '^': return new PySet([...a.values().filter(x => !b.has(x)), ...b.values().filter(x => !a.has(x))]);
        default: break;
      }
    }
    if (a instanceof PyDict && b instanceof PyDict && op === '|') {
      const d = new PyDict();
      a.entries().forEach(([k, v]) => d.set(k, v));
      b.entries().forEach(([k, v]) => d.set(k, v));
      return d;
    }
    throw err('TypeError', `unsupported operand type(s) for ${OPNAME[op] || op}: '${typeName(a)}' and '${typeName(b)}'`);
  }
  function repeatSeq(seq, n) {
    const k = Number(big(n));
    if (typeof seq === 'string') {
      if (k <= 0) return '';
      if (seq.length * k > 5e6) throw err('MemoryError', 'text by byl příliš dlouhý');
      return seq.repeat(k);
    }
    if (k <= 0) return [];
    if (seq.length * k > 2e6) throw err('MemoryError', 'seznam by byl příliš dlouhý');
    let out = [];
    for (let i = 0; i < k; i++) out = out.concat(seq);
    return out;
  }
  EXC.MemoryError = new PyType('MemoryError', null, EXC.Exception, true);

  function percentFormat(fmt, args) {
    const vals = args instanceof PyTuple ? args.items.slice() : [args];
    let i = 0;
    const out = fmt.replace(/%([-+ 0#]*)(\d+)?(?:\.(\d+))?([sdifrx%])/g, (m, flags, w, p, t) => {
      if (t === '%') return '%';
      if (i >= vals.length) throw err('TypeError', 'not enough arguments for format string');
      const v = vals[i++];
      let spec = (flags.includes('-') ? '<' : '') + (flags.includes('+') ? '+' : '') + (flags.includes('0') ? '0' : '') + (w || '') + (p !== undefined ? '.' + p : '');
      if (t === 's') return formatValue(str(v), spec.replace('+', ''));
      if (t === 'r') return formatValue(repr(v), spec);
      if (t === 'd' || t === 'i') return formatValue(isIntLike(v) ? v : BigInt(Math.trunc(num(v))), spec + 'd');
      if (t === 'f') return formatValue(num(v), spec + 'f');
      if (t === 'x') return formatValue(v, spec + 'x');
      return m;
    });
    if (i < vals.length) throw err('TypeError', 'not all arguments converted during string formatting');
    return out;
  }

  function pyEq(a, b) {
    if (a === b) return typeof a !== 'number' || !Number.isNaN(a);
    if (isNum(a) && isNum(b)) {
      if (typeof a === 'number' && typeof b === 'number') return a === b;
      if (typeof a === 'number') return a == big(b); // eslint-disable-line eqeqeq
      if (typeof b === 'number') return b == big(a); // eslint-disable-line eqeqeq
      return big(a) === big(b);
    }
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return false;
    if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => pyEq(x, b[i]));
    if (a instanceof PyTuple) return b instanceof PyTuple && a.items.length === b.items.length && a.items.every((x, i) => pyEq(x, b.items[i]));
    if (a instanceof PyDict) return b instanceof PyDict && a.size === b.size && a.entries().every(([k, v]) => b.has(k) && pyEq(v, b.get(k)));
    if (a instanceof PySet) return b instanceof PySet && a.size === b.size && a.values().every(x => b.has(x));
    if (a instanceof PyRange) return b instanceof PyRange && rangeLen(a) === rangeLen(b) && (rangeLen(a) === 0n || (a.start === b.start && (rangeLen(a) === 1n || a.step === b.step)));
    if (a instanceof PyView && b instanceof PyView && a.kind !== 'values') return a.kind === b.kind && pyEq(new PySet(viewItems(a)), new PySet(viewItems(b)));
    return false;
  }

  function pyLt(a, b, op) {
    if (isNum(a) && isNum(b)) {
      if (typeof a === 'number' || typeof b === 'number') return a < b; // JS umí porovnat BigInt s Number přesně
      return big(a) < big(b);
    }
    if (typeof a === 'string' && typeof b === 'string') return a < b;
    if ((Array.isArray(a) && Array.isArray(b)) || (a instanceof PyTuple && b instanceof PyTuple)) {
      const x = Array.isArray(a) ? a : a.items;
      const y = Array.isArray(b) ? b : b.items;
      for (let i = 0; i < Math.min(x.length, y.length); i++) {
        if (!pyEq(x[i], y[i])) return pyLt(x[i], y[i], '<');
      }
      return x.length < y.length;
    }
    if (a instanceof PySet && b instanceof PySet) return a.size < b.size && a.values().every(x => b.has(x));
    throw err('TypeError', `'${op || '<'}' not supported between instances of '${typeName(a)}' and '${typeName(b)}'`);
  }
  function compare(op, a, b) {
    switch (op) {
      case '==': return pyEq(a, b);
      case '!=': return !pyEq(a, b);
      case '<': checkComparable(a, b, '<'); return pyLt(a, b, '<');
      case '>': checkComparable(a, b, '>'); return pyLt(b, a, '>');
      case '<=': checkComparable(a, b, '<='); return pyLt(a, b, '<=') || pyEq(a, b);
      case '>=': checkComparable(a, b, '>='); return pyLt(b, a, '>=') || pyEq(a, b);
      case 'in': return contains(b, a);
      case 'not in': return !contains(b, a);
      case 'is': return a === b || (a === null && b === null) || (typeof a === 'bigint' && typeof b === 'bigint' && a === b);
      case 'is not': return !(a === b || (typeof a === 'bigint' && typeof b === 'bigint' && a === b));
      default: throw err('TypeError', 'bad comparison');
    }
  }
  function checkComparable(a, b, op) {
    if (isNum(a) && isNum(b)) return;
    if (typeof a === 'string' && typeof b === 'string') return;
    if ((Array.isArray(a) && Array.isArray(b)) || (a instanceof PyTuple && b instanceof PyTuple) || (a instanceof PySet && b instanceof PySet)) return;
    throw err('TypeError', `'${op}' not supported between instances of '${typeName(a)}' and '${typeName(b)}'`);
  }
  function contains(c, x) {
    if (typeof c === 'string') {
      if (typeof x !== 'string') throw err('TypeError', `'in <string>' requires string as left operand, not ${typeName(x)}`);
      return c.includes(x);
    }
    if (Array.isArray(c)) return c.some(y => pyEq(y, x));
    if (c instanceof PyTuple) return c.items.some(y => pyEq(y, x));
    if (c instanceof PyDict) return c.has(x);
    if (c instanceof PySet) return c.has(x);
    if (c instanceof PyRange) {
      if (!isNum(x)) return false;
      if (typeof x === 'number' && !Number.isInteger(x)) return false;
      const v = typeof x === 'number' ? BigInt(x) : big(x);
      if (c.step > 0n ? !(v >= c.start && v < c.stop) : !(v <= c.start && v > c.stop)) return false;
      return (v - c.start) % c.step === 0n;
    }
    if (c instanceof PyView) return c.kind === 'keys' ? c.dict.has(x) : viewItems(c).some(y => pyEq(y, x));
    if (c instanceof PyIter) { for (let r = c.it.next(); !r.done; r = c.it.next()) if (pyEq(r.value, x)) return true; return false; }
    throw err('TypeError', `argument of type '${typeName(c)}' is not iterable`);
  }

  function rangeLen(r) {
    if (r.step > 0n) return r.stop > r.start ? (r.stop - r.start + r.step - 1n) / r.step : 0n;
    return r.start > r.stop ? (r.start - r.stop - r.step - 1n) / -r.step : 0n;
  }

  /* procházení (for, list(), …) */
  function iterOf(v) {
    if (Array.isArray(v)) { let i = 0; return { next: () => (i < v.length ? { value: v[i++], done: false } : { value: undefined, done: true }) }; }
    if (typeof v === 'string') { let i = 0; return { next: () => (i < v.length ? { value: v[i++], done: false } : { value: undefined, done: true }) }; }
    if (v instanceof PyTuple) return iterOf(v.items);
    if (v instanceof PyDict) return iterOf(v.keys());
    if (v instanceof PySet) return iterOf(v.values());
    if (v instanceof PyRange) {
      let cur = v.start;
      const { stop, step } = v;
      return { next: () => ((step > 0n ? cur < stop : cur > stop) ? { value: (cur += step) - step, done: false } : { value: undefined, done: true }) };
    }
    if (v instanceof PyIter) return v.it;
    if (v instanceof PyView) return iterOf(viewItems(v));
    throw err('TypeError', `'${typeName(v)}' object is not iterable`);
  }
  function toArray(v) {
    if (Array.isArray(v)) return v.slice();
    if (typeof v === 'string') return v.split('');
    if (v instanceof PyTuple) return v.items.slice();
    if (v instanceof PyDict) return v.keys();
    if (v instanceof PySet) return v.values();
    if (v instanceof PyView) return viewItems(v);
    const it = iterOf(v);
    const out = [];
    for (let r = it.next(); !r.done; r = it.next()) { out.push(r.value); if (out.length > 5e6) throw err('MemoryError', 'příliš mnoho prvků'); }
    return out;
  }

  function pyLen(v) {
    if (typeof v === 'string' || Array.isArray(v)) return v.length;
    if (v instanceof PyTuple) return v.items.length;
    if (v instanceof PyDict || v instanceof PySet) return v.size;
    if (v instanceof PyRange) return Number(rangeLen(v));
    if (v instanceof PyView) return v.dict.size;
    throw err('TypeError', `object of type '${typeName(v)}' has no len()`);
  }

  function toIndex(i, what) {
    if (isIntLike(i)) return Number(big(i));
    throw err('TypeError', `${what} indices must be integers or slices, not ${typeName(i)}`);
  }
  function sliceIdx(len, lo, hi, step) {
    const st = step == null ? 1 : Number(big(checkSliceInt(step)));
    if (st === 0) throw err('ValueError', 'slice step cannot be zero');
    const norm = (x, def, isHi) => {
      if (x == null) return def;
      let k = Number(big(checkSliceInt(x)));
      if (k < 0) { k += len; if (k < 0) k = st < 0 ? -1 : 0; } else if (k >= len) k = st < 0 ? len - 1 : len;
      return k;
    };
    const a = norm(lo, st < 0 ? len - 1 : 0);
    const b = norm(hi, st < 0 ? -1 : len, true);
    const out = [];
    if (st > 0) for (let i = a; i < b; i += st) out.push(i);
    else for (let i = a; i > b; i += st) out.push(i);
    return out;
  }
  function checkSliceInt(x) {
    if (isIntLike(x)) return x;
    throw err('TypeError', 'slice indices must be integers or None or have an __index__ method');
  }

  function getItem(obj, idx) {
    if (idx && idx.__slice) {
      const s = idx;
      if (typeof obj === 'string') { const ix = sliceIdx(obj.length, s.lo, s.hi, s.step); return s.step == null || s.step === 1n ? obj.slice(ix[0] ?? 0, ix.length ? ix[ix.length - 1] + 1 : 0) : ix.map(i => obj[i]).join(''); }
      if (Array.isArray(obj)) return sliceIdx(obj.length, s.lo, s.hi, s.step).map(i => obj[i]);
      if (obj instanceof PyTuple) return new PyTuple(sliceIdx(obj.items.length, s.lo, s.hi, s.step).map(i => obj.items[i]));
      if (obj instanceof PyRange) { const items = toArray(obj); const ix = sliceIdx(items.length, s.lo, s.hi, s.step); return ix.map(i => items[i]); }
      throw err('TypeError', `'${typeName(obj)}' object is not subscriptable`);
    }
    if (typeof obj === 'string') {
      let i = toIndex(idx, 'string');
      if (i < 0) i += obj.length;
      if (i < 0 || i >= obj.length) throw err('IndexError', 'string index out of range');
      return obj[i];
    }
    if (Array.isArray(obj)) {
      let i = toIndex(idx, 'list');
      if (i < 0) i += obj.length;
      if (i < 0 || i >= obj.length) throw err('IndexError', 'list index out of range');
      return obj[i];
    }
    if (obj instanceof PyTuple) {
      let i = toIndex(idx, 'tuple');
      if (i < 0) i += obj.items.length;
      if (i < 0 || i >= obj.items.length) throw err('IndexError', 'tuple index out of range');
      return obj.items[i];
    }
    if (obj instanceof PyDict) {
      const v = obj.get(idx);
      if (v === undefined) throw new PyThrow(new PyExc(EXC.KeyError, [idx]), 0, null);
      return v;
    }
    if (obj instanceof PyRange) {
      let i = toIndex(idx, 'range');
      const n = Number(rangeLen(obj));
      if (i < 0) i += n;
      if (i < 0 || i >= n) throw err('IndexError', 'range object index out of range');
      return obj.start + BigInt(i) * obj.step;
    }
    if (obj === null) throw err('TypeError', "'NoneType' object is not subscriptable");
    if (obj instanceof PyFunction || obj instanceof PyBuiltin) throw err('TypeError', `'${typeName(obj)}' object is not subscriptable`);
    throw err('TypeError', `'${typeName(obj)}' object is not subscriptable`);
  }
  function setItem(obj, idx, v) {
    if (Array.isArray(obj)) {
      if (idx && idx.__slice) {
        const ix = sliceIdx(obj.length, idx.lo, idx.hi, idx.step);
        const vals = toArray(v);
        if (idx.step == null || idx.step === 1n) {
          const start = ix.length ? ix[0] : Math.max(0, Math.min(obj.length, idx.lo == null ? 0 : (Number(big(idx.lo)) < 0 ? Number(big(idx.lo)) + obj.length : Number(big(idx.lo)))));
          obj.splice(start, ix.length, ...vals);
          return;
        }
        if (vals.length !== ix.length) throw err('ValueError', `attempt to assign sequence of size ${vals.length} to extended slice of size ${ix.length}`);
        ix.forEach((i, k) => { obj[i] = vals[k]; });
        return;
      }
      let i = toIndex(idx, 'list');
      if (i < 0) i += obj.length;
      if (i < 0 || i >= obj.length) throw err('IndexError', 'list assignment index out of range');
      obj[i] = v;
      return;
    }
    if (obj instanceof PyDict) { obj.set(idx, v); return; }
    if (typeof obj === 'string') throw err('TypeError', "'str' object does not support item assignment");
    if (obj instanceof PyTuple) throw err('TypeError', "'tuple' object does not support item assignment");
    throw err('TypeError', `'${typeName(obj)}' object does not support item assignment`);
  }
  function delItem(obj, idx) {
    if (Array.isArray(obj)) {
      if (idx && idx.__slice) { const ix = sliceIdx(obj.length, idx.lo, idx.hi, idx.step).sort((a, b) => b - a); ix.forEach(i => obj.splice(i, 1)); return; }
      let i = toIndex(idx, 'list');
      if (i < 0) i += obj.length;
      if (i < 0 || i >= obj.length) throw err('IndexError', 'list assignment index out of range');
      obj.splice(i, 1);
      return;
    }
    if (obj instanceof PyDict) { if (!obj.del(idx)) throw new PyThrow(new PyExc(EXC.KeyError, [idx]), 0, null); return; }
    throw err('TypeError', `'${typeName(obj)}' object doesn't support item deletion`);
  }

  /* =====================================================================
   *  Rozsahy proměnných
   * ===================================================================== */
  class Scope {
    constructor(parent, def) {
      this.vars = new Map();
      this.parent = parent;
      this.def = def || null;          // AST funkce (kvůli lokálním jménům)
    }
  }

  /* =====================================================================
   *  Interpret
   * ===================================================================== */
  class Interp {
    constructor(opts) {
      opts = opts || {};
      this.maxSteps = opts.maxSteps || 3000000;
      this.maxOut = opts.maxOut || 200000;
      this.maxDepth = opts.maxDepth || 200;
      this.steps = 0;
      this.out = '';
      this.line = 0;
      this.stack = [];      // [{name, line}]
      this.depth = 0;
      this.globals = new Scope(null, null);
      this.builtins = makeBuiltins(this);
      this.modules = makeModules(this);
      this.handling = [];   // právě ošetřované výjimky (pro holé raise)
      this.calls = 0;
    }

    tick() { if (++this.steps > this.maxSteps) throw new Timeout(this.steps); }
    write(s) {
      this.out += s;
      if (this.out.length > this.maxOut) throw new OutputLimit();
    }

    /* ---------- jména ---------- */
    lookup(name, scope) {
      for (let s = scope; s; s = s.parent) {
        if (s.def && s === scope && s.def.globals.has(name)) return this.lookup(name, this.globals);
        const v = s.vars.get(name);
        if (v !== undefined) return v;
        if (s.def && s.def.locals.has(name)) {
          throw err('UnboundLocalError', `cannot access local variable '${name}' where it is not associated with a value`);
        }
      }
      const b = this.builtins.get(name);
      if (b !== undefined) return b;
      const e = err('NameError', `name '${name}' is not defined`);
      e.exc.name = name;
      const fnScope = scope.def ? scope : null;
      e.exc.candidates = [fnScope ? [...fnScope.vars.keys()] : [], [...this.globals.vars.keys()], [...this.builtins.keys(), 'True', 'False', 'None']];
      throw e;
    }
    store(name, v, scope) {
      if (scope.def) {
        if (scope.def.globals.has(name)) { this.globals.vars.set(name, v); return; }
        if (scope.def.nonlocals.has(name)) {
          for (let s = scope.parent; s; s = s.parent) if (s.def && (s.vars.has(name) || s.def.locals.has(name))) { s.vars.set(name, v); return; }
        }
      }
      scope.vars.set(name, v);
    }
    unstore(name, scope) {
      const s = scope.def && scope.def.globals.has(name) ? this.globals : scope;
      if (!s.vars.has(name)) {
        if (this.builtins.has(name) || s === this.globals) throw err('NameError', `name '${name}' is not defined`);
        throw err('UnboundLocalError', `cannot access local variable '${name}' where it is not associated with a value`);
      }
      s.vars.delete(name);
    }

    /* ---------- spuštění modulu ---------- */
    runModule(ast) {
      const r = this.execBlock(ast, this.globals);
      return r;
    }

    execBlock(stmts, scope) {
      for (let i = 0; i < stmts.length; i++) {
        const r = this.exec(stmts[i], scope);
        if (r !== undefined) return r;
      }
      return undefined;
    }

    exec(s, scope) {
      if (++this.steps > this.maxSteps) throw new Timeout(this.steps);
      this.line = s.line;
      switch (s.k) {
        case 'expr': this.ev(s.e, scope); return undefined;
        case 'assign': {
          const v = this.ev(s.value, scope);
          for (const t of s.targets) this.assign(t, v, scope);
          return undefined;
        }
        case 'aug': return this.augAssign(s, scope);
        case 'if': {
          if (truthy(this.ev(s.test, scope))) return this.execBlock(s.body, scope);
          return s.orelse.length ? this.execBlock(s.orelse, scope) : undefined;
        }
        case 'while': {
          while (truthy(this.ev(s.test, scope))) {
            this.tick();
            const r = this.execBlock(s.body, scope);
            if (r === BREAK) return undefined;
            if (r === CONTINUE) { this.line = s.line; continue; }
            if (r !== undefined) return r;
            this.line = s.line;
          }
          return s.orelse.length ? this.execBlock(s.orelse, scope) : undefined;
        }
        case 'for': {
          const it = iterOf(this.ev(s.iter, scope));
          for (let x = it.next(); !x.done; x = it.next()) {
            this.tick();
            this.line = s.line;
            this.assign(s.target, x.value, scope);
            const r = this.execBlock(s.body, scope);
            if (r === BREAK) return undefined;
            if (r === CONTINUE) continue;
            if (r !== undefined) return r;
          }
          return s.orelse.length ? this.execBlock(s.orelse, scope) : undefined;
        }
        case 'break': return BREAK;
        case 'continue': return CONTINUE;
        case 'pass': return undefined;
        case 'return': return new Ret(s.value ? this.ev(s.value, scope) : null);
        case 'def': {
          const defaults = s.params.map(p => (p.def ? this.ev(p.def, scope) : undefined));
          const f = new PyFunction(s.name, s.params.map((p, i) => ({ name: p.name, def: defaults[i], star: p.star })), s.body, scope, s, false);
          this.store(s.name, f, scope);
          return undefined;
        }
        case 'global': case 'nonlocal': return undefined;
        case 'del': {
          for (const t of s.targets) {
            if (t.k === 'name') this.unstore(t.id, scope);
            else if (t.k === 'index') delItem(this.ev(t.obj, scope), this.evIndex(t.idx, scope));
            else if (t.k === 'tuple' || t.k === 'list') t.elts.forEach(e => this.exec({ k: 'del', targets: [e], line: s.line }, scope));
            else throw err('SyntaxError', 'cannot delete expression');
          }
          return undefined;
        }
        case 'import': {
          for (const n of s.names) {
            const m = this.importModule(n.name);
            this.store(n.as || n.name.split('.')[0], m, scope);
          }
          return undefined;
        }
        case 'from': {
          const m = this.importModule(s.module);
          for (const n of s.names) {
            if (n.name === '*') { for (const [k, v] of Object.entries(m.attrs)) if (!k.startsWith('_')) this.store(k, v, scope); continue; }
            if (!(n.name in m.attrs)) throw err('ImportError', `cannot import name '${n.name}' from '${s.module}'`);
            this.store(n.as || n.name, m.attrs[n.name], scope);
          }
          return undefined;
        }
        case 'raise': {
          if (!s.exc) {
            const cur = this.handling[this.handling.length - 1];
            if (!cur) throw err('RuntimeError', 'No active exception to reraise');
            throw cur;
          }
          let e = this.ev(s.exc, scope);
          if (e instanceof PyType && e.exc) e = new PyExc(e, []);
          if (!(e instanceof PyExc)) throw err('TypeError', 'exceptions must derive from BaseException');
          throw new PyThrow(e, s.line, null);
        }
        case 'assert': {
          if (!truthy(this.ev(s.test, scope))) throw new PyThrow(new PyExc(EXC.AssertionError, s.msg ? [this.ev(s.msg, scope)] : []), s.line, null);
          return undefined;
        }
        case 'try': return this.execTry(s, scope);
        default: throw err('SyntaxError', 'neznámý příkaz ' + s.k);
      }
    }

    execTry(s, scope) {
      let result;
      let pending = null;
      let raised = false;
      try {
        result = this.execBlock(s.body, scope);
      } catch (e) {
        if (!(e instanceof PyThrow)) throw e;           // časový limit apod. se nedá zachytit
        raised = true;
        this.fillThrow(e);
        let handler = null;
        for (const h of s.handlers) {
          if (!h.type) { handler = h; break; }
          const t = this.ev(h.type, scope);
          const types = t instanceof PyTuple ? t.items : [t];
          let match = false;
          for (const ty of types) {
            if (!(ty instanceof PyType) || !ty.exc) throw err('TypeError', 'catching classes that do not inherit from BaseException is not allowed');
            if (excIsA(e.exc.type, ty)) match = true;
          }
          if (match) { handler = h; break; }
        }
        if (!handler) pending = e;
        else {
          if (handler.name) this.store(handler.name, e.exc, scope);
          this.handling.push(e);
          try { result = this.execBlock(handler.body, scope); } catch (e2) { if (!(e2 instanceof PyThrow)) throw e2; pending = e2; } finally { this.handling.pop(); }
          if (handler.name) scope.vars.delete(handler.name);
        }
      }
      if (!raised && result === undefined && s.orelse.length) {
        try { result = this.execBlock(s.orelse, scope); } catch (e3) { if (!(e3 instanceof PyThrow)) throw e3; pending = e3; }
      }
      if (s.final.length) {
        const fr = this.execBlock(s.final, scope);
        if (fr !== undefined) return fr;
      }
      if (pending) throw pending;
      return result;
    }

    fillThrow(e) {
      if (!e.line) e.line = this.line;
      if (!e.trace) {
        const frames = [];
        let caller = '<module>';
        for (const f of this.stack) { frames.push({ name: caller, line: f.line }); caller = f.name; }
        frames.push({ name: caller, line: this.line });
        e.trace = frames;
      }
      return e;
    }

    augAssign(s, scope) {
      const t = s.target;
      if (t.k === 'name') {
        const cur = this.lookup(t.id, scope);
        this.store(t.id, this.inplace(s.op, cur, this.ev(s.value, scope)), scope);
      } else if (t.k === 'index') {
        const obj = this.ev(t.obj, scope);
        const idx = this.evIndex(t.idx, scope);
        const cur = getItem(obj, idx);
        setItem(obj, idx, this.inplace(s.op, cur, this.ev(s.value, scope)));
      } else if (t.k === 'attr') {
        throw err('AttributeError', `nelze měnit atribut '${t.name}'`);
      }
      return undefined;
    }
    inplace(op, a, b) {
      if (op === '+' && Array.isArray(a)) { const items = toArray(b); for (const x of items) a.push(x); return a; }
      if (op === '|' && a instanceof PySet && b instanceof PySet) { b.values().forEach(x => a.add(x)); return a; }
      return binop(op, a, b);
    }

    assign(t, v, scope) {
      switch (t.k) {
        case 'name': this.store(t.id, v, scope); return;
        case 'index': setItem(this.ev(t.obj, scope), this.evIndex(t.idx, scope), v); return;
        case 'attr': throw err('AttributeError', `'${typeName(this.ev(t.obj, scope))}' object attribute '${t.name}' is read-only`);
        case 'tuple': case 'list': {
          const items = toArray(v);
          const starIdx = t.elts.findIndex(e => e.k === 'starred');
          if (starIdx < 0) {
            if (items.length > t.elts.length) throw err('ValueError', `too many values to unpack (expected ${t.elts.length})`);
            if (items.length < t.elts.length) throw err('ValueError', `not enough values to unpack (expected ${t.elts.length}, got ${items.length})`);
            t.elts.forEach((e, i) => this.assign(e, items[i], scope));
          } else {
            const after = t.elts.length - starIdx - 1;
            if (items.length < t.elts.length - 1) throw err('ValueError', `not enough values to unpack (expected at least ${t.elts.length - 1}, got ${items.length})`);
            t.elts.slice(0, starIdx).forEach((e, i) => this.assign(e, items[i], scope));
            this.assign(t.elts[starIdx].e, items.slice(starIdx, items.length - after), scope);
            t.elts.slice(starIdx + 1).forEach((e, i) => this.assign(e, items[items.length - after + i], scope));
          }
          return;
        }
        default: throw err('SyntaxError', 'cannot assign to expression');
      }
    }

    importModule(name) {
      const m = this.modules[name];
      if (!m) { const e = err('ModuleNotFoundError', `No module named '${name}'`); throw e; }
      return m;
    }

    evIndex(idx, scope) {
      if (idx.k === 'slice') return { __slice: true, lo: idx.lo ? this.ev(idx.lo, scope) : null, hi: idx.hi ? this.ev(idx.hi, scope) : null, step: idx.step ? this.ev(idx.step, scope) : null };
      return this.ev(idx, scope);
    }

    ev(e, scope) {
      switch (e.k) {
        case 'num': return e.v;
        case 'str': return e.v;
        case 'const': return e.v;
        case 'name': return this.lookup(e.id, scope);
        case 'fstr': {
          let s = '';
          for (const p of e.parts) {
            if (typeof p === 'string') { s += p; continue; }
            let v = this.ev(p.e, scope);
            if (p.conv === 'r') v = repr(v); else if (p.conv === 's') v = str(v);
            const spec = p.spec ? p.spec.map(x => (typeof x === 'string' ? x : formatValue(this.ev(x.e, scope), ''))).join('') : '';
            s += formatValue(v, spec);
          }
          return s;
        }
        case 'bin': return binop(e.op, this.ev(e.l, scope), this.ev(e.r, scope));
        case 'unary': {
          const v = this.ev(e.e, scope);
          if (e.op === '-') {
            if (isIntLike(v)) return -big(v);
            if (typeof v === 'number') return -v;
            throw err('TypeError', `bad operand type for unary -: '${typeName(v)}'`);
          }
          if (e.op === '+') { if (isNum(v)) return isIntLike(v) ? big(v) : v; throw err('TypeError', `bad operand type for unary +: '${typeName(v)}'`); }
          if (e.op === '~') { if (isIntLike(v)) return ~big(v); throw err('TypeError', `bad operand type for unary ~: '${typeName(v)}'`); }
          break;
        }
        case 'not': return !truthy(this.ev(e.e, scope));
        case 'bool': {
          let v;
          if (e.op === 'and') { for (const x of e.vals) { v = this.ev(x, scope); if (!truthy(v)) return v; } return v; }
          for (const x of e.vals) { v = this.ev(x, scope); if (truthy(v)) return v; }
          return v;
        }
        case 'cmp': {
          let a = this.ev(e.first, scope);
          for (let i = 0; i < e.ops.length; i++) {
            const b = this.ev(e.rest[i], scope);
            if (!compare(e.ops[i], a, b)) return false;
            a = b;
          }
          return true;
        }
        case 'ifexp': return truthy(this.ev(e.test, scope)) ? this.ev(e.body, scope) : this.ev(e.orelse, scope);
        case 'list': return this.evElts(e.elts, scope);
        case 'tuple': return new PyTuple(this.evElts(e.elts, scope));
        case 'set': return new PySet(this.evElts(e.elts, scope));
        case 'dict': {
          const d = new PyDict();
          for (let i = 0; i < e.keys.length; i++) d.set(this.ev(e.keys[i], scope), this.ev(e.vals[i], scope));
          return d;
        }
        case 'listcomp': { const out = []; this.comp(e, scope, cs => out.push(this.ev(e.elt, cs))); return out; }
        case 'genexp': { const out = []; this.comp(e, scope, cs => out.push(this.ev(e.elt, cs))); return new PyIter('generator', iterOf(out)); }
        case 'setcomp': { const out = new PySet(); this.comp(e, scope, cs => out.add(this.ev(e.elt, cs))); return out; }
        case 'dictcomp': { const out = new PyDict(); this.comp(e, scope, cs => { const k = this.ev(e.key, cs); out.set(k, this.ev(e.val, cs)); }); return out; }
        case 'lambda': {
          const defaults = e.params.map(p => (p.def ? this.ev(p.def, scope) : undefined));
          return new PyFunction('<lambda>', e.params.map((p, i) => ({ name: p.name, def: defaults[i], star: p.star })), e.body, scope, e, true);
        }
        case 'call': return this.evCall(e, scope);
        case 'attr': return getAttr(this, this.ev(e.obj, scope), e.name);
        case 'index': return getItem(this.ev(e.obj, scope), this.evIndex(e.idx, scope));
        case 'slice': throw err('SyntaxError', 'invalid syntax');
        case 'starred': throw err('SyntaxError', "can't use starred expression here");
        default: break;
      }
      throw err('SyntaxError', 'neznámý výraz ' + e.k);
    }
    evElts(elts, scope) {
      const out = [];
      for (const x of elts) {
        if (x.k === 'starred') out.push(...toArray(this.ev(x.e, scope)));
        else out.push(this.ev(x, scope));
      }
      return out;
    }
    comp(e, scope, collect) {
      const cs = new Scope(scope, null);
      const gens = e.gens;
      const loop = gi => {
        if (gi === gens.length) { collect(cs); return; }
        const g = gens[gi];
        const it = iterOf(this.ev(g.iter, gi === 0 ? scope : cs));
        for (let r = it.next(); !r.done; r = it.next()) {
          this.tick();
          this.assign(g.target, r.value, cs);
          let ok = true;
          for (const c of g.ifs) if (!truthy(this.ev(c, cs))) { ok = false; break; }
          if (ok) loop(gi + 1);
        }
      };
      loop(0);
    }
    evCall(e, scope) {
      const f = this.ev(e.f, scope);
      const args = [];
      for (const a of e.args) {
        if (a.k === 'starred') args.push(...toArray(this.ev(a.e, scope)));
        else args.push(this.ev(a, scope));
      }
      let kwargs = null;
      if (e.kwargs.length) {
        kwargs = new Map();
        for (const k of e.kwargs) {
          if (k.dstar) {
            const d = this.ev(k.value, scope);
            if (!(d instanceof PyDict)) throw err('TypeError', 'argument after ** must be a mapping');
            d.entries().forEach(([kk, vv]) => kwargs.set(str(kk), vv));
          } else kwargs.set(k.name, this.ev(k.value, scope));
        }
      }
      const line = this.line;
      const r = this.call(f, args, kwargs);
      this.line = line;
      return r;
    }

    call(f, args, kwargs) {
      if (f instanceof PyFunction) return this.callFunction(f, args, kwargs);
      if (f instanceof PyBuiltin) return f.fn(args, kwargs || EMPTY, f.self);
      if (f instanceof PyType) {
        if (f.exc) return new PyExc(f, args);
        return f.call(args, kwargs || EMPTY);
      }
      throw err('TypeError', `'${typeName(f)}' object is not callable`);
    }

    callFunction(f, args, kwargs) {
      this.calls++;
      if (this.depth >= this.maxDepth) throw err('RecursionError', 'maximum recursion depth exceeded');
      const scope = new Scope(f.scope, f.def);
      const params = f.params;
      const fname = f.name;
      const nPos = params.filter(p => !p.star).length;
      let ai = 0;
      const starParam = params.find(p => p.star === '*');
      const kwParam = params.find(p => p.star === '**');
      for (const p of params) {
        if (p.star) continue;
        if (ai < args.length) scope.vars.set(p.name, args[ai++]);
      }
      if (ai < args.length) {
        if (starParam) scope.vars.set(starParam.name, new PyTuple(args.slice(ai)));
        else {
          const given = args.length;
          const req = params.filter(p => !p.star && p.def === undefined).length;
          const takes = req === nPos ? `${nPos} positional argument${nPos === 1 ? '' : 's'}` : `from ${req} to ${nPos} positional arguments`;
          throw err('TypeError', `${fname}() takes ${takes} but ${given} ${given === 1 ? 'was' : 'were'} given`);
        }
      } else if (starParam) scope.vars.set(starParam.name, new PyTuple([]));
      let extra = null;
      if (kwargs) {
        for (const [k, v] of kwargs) {
          const p = params.find(x => x.name === k && !x.star);
          if (!p) {
            if (kwParam) { extra = extra || new PyDict(); extra.set(k, v); continue; }
            throw err('TypeError', `${fname}() got an unexpected keyword argument '${k}'`);
          }
          if (scope.vars.has(k)) throw err('TypeError', `${fname}() got multiple values for argument '${k}'`);
          scope.vars.set(k, v);
        }
      }
      if (kwParam) scope.vars.set(kwParam.name, extra || new PyDict());
      const missing = params.filter(p => !p.star && !scope.vars.has(p.name) && p.def === undefined).map(p => p.name);
      if (missing.length) {
        const q = missing.map(m => `'${m}'`);
        const list = q.length === 1 ? q[0] : q.length === 2 ? q.join(' and ') : q.slice(0, -1).join(', ') + ', and ' + q[q.length - 1];
        throw err('TypeError', `${fname}() missing ${missing.length} required positional argument${missing.length === 1 ? '' : 's'}: ${list}`);
      }
      for (const p of params) if (!p.star && !scope.vars.has(p.name)) scope.vars.set(p.name, p.def);
      this.stack.push({ name: fname, line: this.line });
      this.depth++;
      try {
        if (f.isLambda) return this.ev(f.body, scope);
        const r = this.execBlock(f.body, scope);
        if (r instanceof Ret) return r.v;
        return null;
      } catch (e) {
        if (e instanceof PyThrow) this.fillThrow(e);
        else if (e instanceof RangeError) { const x = err('RecursionError', 'maximum recursion depth exceeded'); this.fillThrow(x); throw x; }
        throw e;
      } finally {
        this.depth--;
        this.stack.pop();
      }
    }
  }
  const EMPTY = new Map();

  /* =====================================================================
   *  Atributy a metody
   * ===================================================================== */
  function kw(kwargs, name, def) { return kwargs && kwargs.has(name) ? kwargs.get(name) : def; }
  function noKw(fname, kwargs, allowed) {
    if (!kwargs) return;
    for (const k of kwargs.keys()) if (!allowed || !allowed.includes(k)) throw err('TypeError', `${fname}() takes no keyword arguments`);
  }
  function argc(fname, args, min, max) {
    if (args.length < min || args.length > max) {
      if (min === max) throw err('TypeError', `${fname}() takes exactly ${min === 1 ? 'one argument' : min + ' arguments'} (${args.length} given)`);
      if (args.length < min) throw err('TypeError', `${fname}() takes at least ${min} argument${min === 1 ? '' : 's'} (${args.length} given)`);
      throw err('TypeError', `${fname}() takes at most ${max} argument${max === 1 ? '' : 's'} (${args.length} given)`);
    }
  }
  function needStr(fname, v, pos) {
    if (typeof v !== 'string') throw err('TypeError', `${fname}() argument ${pos || 1} must be str, not ${typeName(v)}`);
    return v;
  }
  const WS = /\s/;
  function stripChars(s, chars, left, right) {
    let a = 0;
    let b = s.length;
    const test = chars == null ? ch => WS.test(ch) : ch => chars.includes(ch);
    if (left) while (a < b && test(s[a])) a++;
    if (right) while (b > a && test(s[b - 1])) b--;
    return s.slice(a, b);
  }
  function splitWs(s, maxsplit) {
    const out = [];
    let i = 0;
    const n = s.length;
    while (i < n) {
      while (i < n && WS.test(s[i])) i++;
      if (i >= n) break;
      if (maxsplit >= 0 && out.length === maxsplit) { out.push(s.slice(i).replace(/\s+$/, '')); return out; }
      let j = i;
      while (j < n && !WS.test(s[j])) j++;
      out.push(s.slice(i, j));
      i = j;
    }
    return out;
  }
  const isCased = ch => ch.toLowerCase() !== ch.toUpperCase();

  function sortList(I, arr, keyFn, reverse) {
    const keys = keyFn && keyFn !== null ? arr.map(x => I.call(keyFn, [x], null)) : arr;
    const idx = arr.map((_, i) => i);
    idx.sort((i, j) => {
      const a = keys[i];
      const b = keys[j];
      if (reverse) { if (pyLt(b, a)) return -1; if (pyLt(a, b)) return 1; return 0; }
      if (pyLt(a, b)) return -1;
      if (pyLt(b, a)) return 1;
      return 0;
    });
    return idx.map(i => arr[i]);
  }

  const STR_METHODS = {
    upper: (s, a) => (argc('str.upper', a, 0, 0), s.toUpperCase()),
    lower: (s, a) => (argc('str.lower', a, 0, 0), s.toLowerCase()),
    casefold: s => s.toLowerCase(),
    capitalize: s => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s),
    title: s => { let out = ''; let prev = false; for (const ch of s) { const c = isCased(ch); out += c ? (prev ? ch.toLowerCase() : ch.toUpperCase()) : ch; prev = c; } return out; },
    swapcase: s => [...s].map(c => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join(''),
    strip: (s, a) => (argc('strip', a, 0, 1), stripChars(s, a[0] == null ? null : needStr('strip', a[0]), true, true)),
    lstrip: (s, a) => (argc('lstrip', a, 0, 1), stripChars(s, a[0] == null ? null : needStr('lstrip', a[0]), true, false)),
    rstrip: (s, a) => (argc('rstrip', a, 0, 1), stripChars(s, a[0] == null ? null : needStr('rstrip', a[0]), false, true)),
    split: (s, a, k) => {
      const sep = a.length > 0 ? a[0] : kw(k, 'sep', null);
      const max = Number(big(a.length > 1 ? a[1] : kw(k, 'maxsplit', -1n)));
      if (sep === null) return splitWs(s, max);
      needStr('split', sep);
      if (sep === '') throw err('ValueError', 'empty separator');
      const parts = s.split(sep);
      if (max >= 0 && parts.length > max + 1) return parts.slice(0, max).concat([parts.slice(max).join(sep)]);
      return parts;
    },
    rsplit: (s, a, k) => {
      const sep = a.length > 0 ? a[0] : kw(k, 'sep', null);
      const max = Number(big(a.length > 1 ? a[1] : kw(k, 'maxsplit', -1n)));
      if (sep === null) { const p = splitWs(s, -1); if (max < 0 || p.length <= max + 1) return p; return [p.slice(0, p.length - max).join(' ')].concat(p.slice(p.length - max)); }
      const parts = s.split(sep);
      if (max >= 0 && parts.length > max + 1) return [parts.slice(0, parts.length - max).join(sep)].concat(parts.slice(parts.length - max));
      return parts;
    },
    splitlines: s => { const p = s.split(/\r\n|\r|\n/); if (p.length && p[p.length - 1] === '') p.pop(); return p; },
    join: (s, a) => {
      argc('str.join', a, 1, 1);
      const items = toArray(a[0]);
      items.forEach((x, i) => { if (typeof x !== 'string') throw err('TypeError', `sequence item ${i}: expected str instance, ${typeName(x)} found`); });
      return items.join(s);
    },
    replace: (s, a) => {
      argc('replace', a, 2, 3);
      needStr('replace', a[0], 1);
      needStr('replace', a[1], 2);
      const count = a.length > 2 ? Number(big(a[2])) : -1;
      if (count < 0) return a[0] === '' ? a[1] + s.split('').join(a[1]) + a[1] : s.split(a[0]).join(a[1]);
      let out = s;
      let pos = 0;
      for (let i = 0; i < count; i++) {
        const k = out.indexOf(a[0], pos);
        if (k < 0) break;
        out = out.slice(0, k) + a[1] + out.slice(k + a[0].length);
        pos = k + a[1].length;
      }
      return out;
    },
    startswith: (s, a) => {
      argc('startswith', a, 1, 3);
      const start = a.length > 1 && a[1] !== null ? Number(big(a[1])) : 0;
      const pre = a[0] instanceof PyTuple ? a[0].items : [a[0]];
      return pre.some(p => { if (typeof p !== 'string') throw err('TypeError', `startswith first arg must be str or a tuple of str, not ${typeName(p)}`); return s.startsWith(p, start); });
    },
    endswith: (s, a) => {
      argc('endswith', a, 1, 3);
      const suf = a[0] instanceof PyTuple ? a[0].items : [a[0]];
      return suf.some(p => { if (typeof p !== 'string') throw err('TypeError', `endswith first arg must be str or a tuple of str, not ${typeName(p)}`); return s.endsWith(p); });
    },
    find: (s, a) => { argc('find', a, 1, 3); needStr('find', a[0]); return BigInt(s.indexOf(a[0], a.length > 1 ? Number(big(a[1])) : 0)); },
    rfind: (s, a) => { argc('rfind', a, 1, 3); needStr('rfind', a[0]); return BigInt(s.lastIndexOf(a[0])); },
    index: (s, a) => { argc('index', a, 1, 3); needStr('index', a[0]); const k = s.indexOf(a[0], a.length > 1 ? Number(big(a[1])) : 0); if (k < 0) throw err('ValueError', 'substring not found'); return BigInt(k); },
    rindex: (s, a) => { const k = s.lastIndexOf(needStr('rindex', a[0])); if (k < 0) throw err('ValueError', 'substring not found'); return BigInt(k); },
    count: (s, a) => {
      argc('count', a, 1, 3);
      const sub = needStr('count', a[0]);
      if (sub === '') return BigInt(s.length + 1);
      let c = 0;
      let p = 0;
      for (;;) { const k = s.indexOf(sub, p); if (k < 0) break; c++; p = k + sub.length; }
      return BigInt(c);
    },
    isdigit: s => s.length > 0 && /^[0-9²³¹٠-٩]+$/.test(s),
    isdecimal: s => s.length > 0 && /^[0-9]+$/.test(s),
    isnumeric: s => s.length > 0 && /^[0-9²³¹¼-¾]+$/.test(s),
    isalpha: s => s.length > 0 && /^\p{L}+$/u.test(s),
    isalnum: s => s.length > 0 && /^[\p{L}\p{N}]+$/u.test(s),
    isspace: s => s.length > 0 && /^\s+$/.test(s),
    isupper: s => [...s].some(isCased) && s === s.toUpperCase(),
    islower: s => [...s].some(isCased) && s === s.toLowerCase(),
    istitle: s => s.length > 0 && s === STR_METHODS.title(s) && [...s].some(isCased),
    isidentifier: s => /^[A-Za-z_À-￿][A-Za-z0-9_À-￿]*$/.test(s),
    zfill: (s, a) => {
      argc('zfill', a, 1, 1);
      const w = Number(big(a[0]));
      if (s.length >= w) return s;
      const sign = s[0] === '-' || s[0] === '+' ? s[0] : '';
      return sign + '0'.repeat(w - s.length) + s.slice(sign.length);
    },
    center: (s, a) => { argc('center', a, 1, 2); const w = Number(big(a[0])); const f = a.length > 1 ? a[1] : ' '; if (s.length >= w) return s; const tot = w - s.length; const l = Math.floor(tot / 2) + (tot & w & 1); return f.repeat(l) + s + f.repeat(tot - l); },
    ljust: (s, a) => { argc('ljust', a, 1, 2); const w = Number(big(a[0])); return s.length >= w ? s : s + (a[1] || ' ').repeat(w - s.length); },
    rjust: (s, a) => { argc('rjust', a, 1, 2); const w = Number(big(a[0])); return s.length >= w ? s : (a[1] || ' ').repeat(w - s.length) + s; },
    partition: (s, a) => { const sep = needStr('partition', a[0]); const k = s.indexOf(sep); return k < 0 ? new PyTuple([s, '', '']) : new PyTuple([s.slice(0, k), sep, s.slice(k + sep.length)]); },
    rpartition: (s, a) => { const sep = needStr('rpartition', a[0]); const k = s.lastIndexOf(sep); return k < 0 ? new PyTuple(['', '', s]) : new PyTuple([s.slice(0, k), sep, s.slice(k + sep.length)]); },
    format: (s, a, k) => strFormat(s, a, k),
    removeprefix: (s, a) => (s.startsWith(a[0]) ? s.slice(a[0].length) : s),
    removesuffix: (s, a) => (a[0] && s.endsWith(a[0]) ? s.slice(0, s.length - a[0].length) : s),
    encode: () => { throw err('AttributeError', "bajty (bytes) tu nejsou podporované"); }
  };

  function strFormat(s, args, kwargs) {
    let auto = 0;
    return s.replace(/\{\{|\}\}|\{([^{}!:]*)(?:!([rs]))?(?::([^{}]*))?\}/g, (m, field, conv, spec) => {
      if (m === '{{') return '{';
      if (m === '}}') return '}';
      let v;
      if (field === '') { if (auto >= args.length) throw err('IndexError', `Replacement index ${auto} out of range for positional args tuple`); v = args[auto++]; }
      else if (/^\d+$/.test(field)) { const k = parseInt(field, 10); if (k >= args.length) throw err('IndexError', `Replacement index ${k} out of range for positional args tuple`); v = args[k]; }
      else {
        const [name, ...rest] = field.split('.');
        if (!kwargs || !kwargs.has(name)) throw new PyThrow(new PyExc(EXC.KeyError, [name]), 0, null);
        v = kwargs.get(name);
        if (rest.length) throw err('AttributeError', 'atributy ve format() nejsou podporované');
      }
      if (conv === 'r') v = repr(v); else if (conv === 's') v = str(v);
      return formatValue(v, spec || '');
    });
  }

  const LIST_METHODS = {
    append: (l, a) => { argc('list.append', a, 1, 1); l.push(a[0]); return null; },
    extend: (l, a) => { argc('list.extend', a, 1, 1); for (const x of toArray(a[0])) l.push(x); return null; },
    insert: (l, a) => { argc('insert', a, 2, 2); let i = Number(big(a[0])); if (i < 0) i = Math.max(0, i + l.length); l.splice(Math.min(i, l.length), 0, a[1]); return null; },
    pop: (l, a) => {
      argc('pop', a, 0, 1);
      if (!l.length) throw err('IndexError', 'pop from empty list');
      let i = a.length ? Number(big(a[0])) : l.length - 1;
      if (i < 0) i += l.length;
      if (i < 0 || i >= l.length) throw err('IndexError', 'pop index out of range');
      return l.splice(i, 1)[0];
    },
    remove: (l, a) => { argc('list.remove', a, 1, 1); const k = l.findIndex(x => pyEq(x, a[0])); if (k < 0) throw err('ValueError', 'list.remove(x): x not in list'); l.splice(k, 1); return null; },
    index: (l, a) => { argc('index', a, 1, 3); const k = l.findIndex((x, i) => i >= (a.length > 1 ? Number(big(a[1])) : 0) && pyEq(x, a[0])); if (k < 0) throw err('ValueError', `${repr(a[0])} is not in list`); return BigInt(k); },
    count: (l, a) => { argc('list.count', a, 1, 1); return BigInt(l.filter(x => pyEq(x, a[0])).length); },
    sort: (l, a, k, I) => {
      if (a.length) throw err('TypeError', 'sort() takes no positional arguments');
      const sorted = sortList(I, l, kw(k, 'key', null), truthy(kw(k, 'reverse', false)));
      l.splice(0, l.length, ...sorted);
      return null;
    },
    reverse: l => { l.reverse(); return null; },
    copy: l => l.slice(),
    clear: l => { l.length = 0; return null; }
  };

  const DICT_METHODS = {
    get: (d, a) => { argc('get', a, 1, 2); const v = d.get(a[0]); return v === undefined ? (a.length > 1 ? a[1] : null) : v; },
    keys: d => new PyView('keys', d),
    values: d => new PyView('values', d),
    items: d => new PyView('items', d),
    pop: (d, a) => {
      argc('pop', a, 1, 2);
      const v = d.get(a[0]);
      if (v === undefined) { if (a.length > 1) return a[1]; throw new PyThrow(new PyExc(EXC.KeyError, [a[0]]), 0, null); }
      d.del(a[0]);
      return v;
    },
    popitem: d => { const e = d.entries(); if (!e.length) throw new PyThrow(new PyExc(EXC.KeyError, ['popitem(): dictionary is empty']), 0, null); const [k, v] = e[e.length - 1]; d.del(k); return new PyTuple([k, v]); },
    setdefault: (d, a) => { const v = d.get(a[0]); if (v !== undefined) return v; const dv = a.length > 1 ? a[1] : null; d.set(a[0], dv); return dv; },
    update: (d, a, k) => {
      if (a.length) {
        const o = a[0];
        if (o instanceof PyDict) o.entries().forEach(([x, y]) => d.set(x, y));
        else toArray(o).forEach(pair => { const p = toArray(pair); if (p.length !== 2) throw err('ValueError', `dictionary update sequence element #0 has length ${p.length}; 2 is required`); d.set(p[0], p[1]); });
      }
      if (k) for (const [x, y] of k) d.set(x, y);
      return null;
    },
    copy: d => { const c = new PyDict(); d.entries().forEach(([x, y]) => c.set(x, y)); return c; },
    clear: d => { d.map.clear(); return null; }
  };

  const SET_METHODS = {
    add: (s, a) => { argc('set.add', a, 1, 1); s.add(a[0]); return null; },
    remove: (s, a) => { if (!s.del(a[0])) throw new PyThrow(new PyExc(EXC.KeyError, [a[0]]), 0, null); return null; },
    discard: (s, a) => { s.del(a[0]); return null; },
    pop: s => { const v = s.values(); if (!v.length) throw new PyThrow(new PyExc(EXC.KeyError, ['pop from an empty set']), 0, null); s.del(v[0]); return v[0]; },
    union: (s, a) => new PySet([...s.values(), ...a.flatMap(x => toArray(x))]),
    intersection: (s, a) => { let r = s.values(); a.forEach(x => { const o = new PySet(toArray(x)); r = r.filter(v => o.has(v)); }); return new PySet(r); },
    difference: (s, a) => { let r = s.values(); a.forEach(x => { const o = new PySet(toArray(x)); r = r.filter(v => !o.has(v)); }); return new PySet(r); },
    symmetric_difference: (s, a) => binop('^', s, new PySet(toArray(a[0]))),
    issubset: (s, a) => { const o = new PySet(toArray(a[0])); return s.values().every(v => o.has(v)); },
    issuperset: (s, a) => toArray(a[0]).every(v => s.has(v)),
    isdisjoint: (s, a) => toArray(a[0]).every(v => !s.has(v)),
    update: (s, a) => { a.forEach(x => toArray(x).forEach(v => s.add(v))); return null; },
    copy: s => new PySet(s.values()),
    clear: s => { s.map.clear(); return null; }
  };

  function getAttr(I, obj, name) {
    let table = null;
    if (typeof obj === 'string') table = STR_METHODS;
    else if (Array.isArray(obj)) table = LIST_METHODS;
    else if (obj instanceof PyDict) table = DICT_METHODS;
    else if (obj instanceof PySet) table = SET_METHODS;
    else if (obj instanceof PyModule) {
      if (name in obj.attrs) return obj.attrs[name];
      throw err('AttributeError', `module '${obj.name}' has no attribute '${name}'`);
    } else if (obj instanceof PyTuple) {
      if (name === 'count') return new PyBuiltin('count', a => BigInt(obj.items.filter(x => pyEq(x, a[0])).length), obj);
      if (name === 'index') return new PyBuiltin('index', a => { const k = obj.items.findIndex(x => pyEq(x, a[0])); if (k < 0) throw err('ValueError', 'tuple.index(x): x not in tuple'); return BigInt(k); }, obj);
    } else if (obj instanceof PyExc) {
      if (name === 'args') return new PyTuple(obj.args);
    } else if (obj instanceof PyType || obj instanceof PyFunction) {
      if (name === '__name__') return obj.name;
      const t = obj instanceof PyType ? { str: STR_METHODS, list: LIST_METHODS, dict: DICT_METHODS, set: SET_METHODS }[obj.name] : null;
      if (t && Object.prototype.hasOwnProperty.call(t, name)) {
        return new PyBuiltin(name, (args, kwargs) => {
          if (!args.length) throw err('TypeError', `unbound method ${obj.name}.${name}() needs an argument`);
          return t[name](args[0], args.slice(1), kwargs === EMPTY ? null : kwargs, I);
        });
      }
    } else if (typeof obj === 'number') {
      if (name === 'is_integer') return new PyBuiltin('is_integer', () => Number.isInteger(obj), obj);
      if (name === 'real') return obj;
    } else if (isIntLike(obj)) {
      if (name === 'bit_length') return new PyBuiltin('bit_length', () => { const b = big(obj); return BigInt((b < 0n ? -b : b).toString(2).replace(/^0$/, '').length); }, obj);
      if (name === 'real') return big(obj);
    }
    if (table && Object.prototype.hasOwnProperty.call(table, name)) {
      const fn = table[name];
      return new PyBuiltin(name, (args, kwargs) => fn(obj, args, kwargs === EMPTY ? null : kwargs, I), obj);
    }
    const e = err('AttributeError', `'${typeName(obj)}' object has no attribute '${name}'`);
    e.exc.attr = { obj: typeName(obj), name, options: table ? Object.keys(table) : [] };
    throw e;
  }

  /* =====================================================================
   *  Vestavěné funkce a moduly
   * ===================================================================== */
  function toInt(v, base) {
    if (base !== undefined) {
      if (typeof v !== 'string') throw err('TypeError', "int() can't convert non-string with explicit base");
      const b = Number(big(base));
      let s = v.trim().replace(/_/g, '').toLowerCase();
      let sign = 1n;
      if (s[0] === '-' || s[0] === '+') { if (s[0] === '-') sign = -1n; s = s.slice(1); }
      if (b === 16) s = s.replace(/^0x/, ''); else if (b === 2) s = s.replace(/^0b/, ''); else if (b === 8) s = s.replace(/^0o/, '');
      const digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, b);
      if (!s || [...s].some(c => !digits.includes(c))) throw err('ValueError', `invalid literal for int() with base ${b}: ${repr(v)}`);
      let r = 0n;
      for (const c of s) r = r * BigInt(b) + BigInt(digits.indexOf(c));
      return sign * r;
    }
    if (isIntLike(v)) return big(v);
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw err(Number.isNaN(v) ? 'ValueError' : 'OverflowError', Number.isNaN(v) ? 'cannot convert float NaN to integer' : 'cannot convert float infinity to integer');
      return BigInt(Math.trunc(v));
    }
    if (typeof v === 'string') {
      const s = v.trim();
      if (/^[+-]?\d+(_\d+)*$/.test(s)) return BigInt(s.replace(/_/g, '').replace(/^\+/, ''));
      throw err('ValueError', `invalid literal for int() with base 10: ${repr(v)}`);
    }
    throw err('TypeError', `int() argument must be a string, a bytes-like object or a real number, not '${typeName(v)}'`);
  }
  function toFloat(v) {
    if (typeof v === 'number') return v;
    if (isIntLike(v)) return Number(big(v));
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase().replace(/_/g, '');
      if (/^[+-]?(inf|infinity)$/.test(s)) return s[0] === '-' ? -Infinity : Infinity;
      if (/^[+-]?nan$/.test(s)) return NaN;
      if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(s)) return parseFloat(s);
      throw err('ValueError', `could not convert string to float: ${repr(v)}`);
    }
    throw err('TypeError', `float() argument must be a string or a real number, not '${typeName(v)}'`);
  }

  function roundHalfEven(x) {
    const f = Math.floor(x);
    const d = x - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  }

  function makeBuiltins(I) {
    const B = new Map();
    const def = (name, fn) => B.set(name, new PyBuiltin(name, fn));
    const T = {};
    const type = (name, call) => { T[name] = new PyType(name, call); B.set(name, T[name]); };

    def('print', (args, k) => {
      const sep = kw(k, 'sep', ' ');
      const end = kw(k, 'end', '\n');
      if (sep !== null && typeof sep !== 'string') throw err('TypeError', `sep must be None or a string, not ${typeName(sep)}`);
      if (end !== null && typeof end !== 'string') throw err('TypeError', `end must be None or a string, not ${typeName(end)}`);
      I.write(args.map(str).join(sep === null ? ' ' : sep) + (end === null ? '\n' : end));
      return null;
    });
    def('input', () => { throw err('RuntimeError', 'input() tady nefunguje – data dostane tvoje funkce v parametrech'); });
    def('len', a => { argc('len', a, 1, 1); return BigInt(pyLen(a[0])); });
    def('repr', a => repr(a[0]));
    def('abs', a => { argc('abs', a, 1, 1); const v = a[0]; if (isIntLike(v)) { const b = big(v); return b < 0n ? -b : b; } if (typeof v === 'number') return Math.abs(v); throw err('TypeError', `bad operand type for abs(): '${typeName(v)}'`); });
    type('range', a => {
      argc('range', a, 1, 3);
      a.forEach(x => { if (!isIntLike(x)) throw err('TypeError', `'${typeName(x)}' object cannot be interpreted as an integer`); });
      const v = a.map(big);
      if (v.length === 1) return new PyRange(0n, v[0], 1n);
      if (v[2] === 0n) throw err('ValueError', 'range() arg 3 must not be zero');
      return new PyRange(v[0], v[1], v.length > 2 ? v[2] : 1n);
    });
    type('int', (a, k) => {
      if (!a.length) return 0n;
      const base = a.length > 1 ? a[1] : kw(k, 'base', undefined);
      return toInt(a[0], base);
    });
    type('float', a => (a.length ? toFloat(a[0]) : 0));
    type('str', a => (a.length ? str(a[0]) : ''));
    type('bool', a => (a.length ? truthy(a[0]) : false));
    type('list', a => (a.length ? toArray(a[0]) : []));
    type('tuple', a => new PyTuple(a.length ? toArray(a[0]) : []));
    type('set', a => new PySet(a.length ? toArray(a[0]) : []));
    type('dict', (a, k) => {
      const d = new PyDict();
      if (a.length) DICT_METHODS.update(d, [a[0]], null);
      if (k) for (const [x, y] of k) d.set(x, y);
      return d;
    });
    type('type', a => {
      argc('type', a, 1, 1);
      const n = typeName(a[0]);
      if (T[n]) return T[n];
      if (a[0] instanceof PyExc) return a[0].type;
      return new PyType(n, () => { throw err('TypeError', `cannot create '${n}' instances`); });
    });
    T.NoneType = new PyType('NoneType', () => null);
    T.function = new PyType('function', () => { throw err('TypeError', "cannot create 'function' instances"); });
    def('isinstance', a => {
      argc('isinstance', a, 2, 2);
      const types = a[1] instanceof PyTuple ? a[1].items : [a[1]];
      const n = typeName(a[0]);
      return types.some(t => {
        if (!(t instanceof PyType) && !(t instanceof PyBuiltin)) throw err('TypeError', 'isinstance() arg 2 must be a type, a tuple of types, or a union');
        if (t.name === n) return true;
        if (t.name === 'int' && n === 'bool') return true;
        if (t.exc && a[0] instanceof PyExc) return excIsA(a[0].type, t);
        return false;
      });
    });
    def('min', (a, k) => minmax(I, a, k, 'min'));
    def('max', (a, k) => minmax(I, a, k, 'max'));
    def('sum', (a, k) => {
      argc('sum', a, 1, 2);
      let acc = a.length > 1 ? a[1] : kw(k, 'start', 0n);
      if (typeof acc === 'string') throw err('TypeError', "sum() can't sum strings [use ''.join(seq) instead]");
      let comp = 0;            // Neumaierova kompenzace jako v Pythonu 3.12+
      let useComp = false;
      for (const x of toArray(a[0])) {
        if (typeof acc === 'number' && isNum(x)) {
          const y = num(x);
          const t = acc + y;
          if (Number.isFinite(t)) comp += Math.abs(acc) >= Math.abs(y) ? (acc - t) + y : (y - t) + acc;
          acc = t;
          useComp = true;
          continue;
        }
        if (useComp) { acc += comp; comp = 0; useComp = false; }
        acc = binop('+', acc, x);
      }
      if (useComp && comp && Number.isFinite(comp)) acc += comp;
      return acc;
    });
    def('sorted', (a, k) => { argc('sorted', a, 1, 1); return sortList(I, toArray(a[0]), kw(k, 'key', null), truthy(kw(k, 'reverse', false))); });
    def('reversed', a => {
      argc('reversed', a, 1, 1);
      const v = a[0];
      if (!(Array.isArray(v) || typeof v === 'string' || v instanceof PyTuple || v instanceof PyRange || v instanceof PyDict)) throw err('TypeError', `'${typeName(v)}' object is not reversible`);
      return new PyIter(Array.isArray(v) ? 'list_reverseiterator' : typeof v === 'string' ? 'reversed' : 'reversed', iterOf(toArray(v).reverse()));
    });
    def('enumerate', (a, k) => {
      argc('enumerate', a, 1, 2);
      const it = iterOf(a[0]);
      let i = big(a.length > 1 ? a[1] : kw(k, 'start', 0n));
      return new PyIter('enumerate', { next: () => { const r = it.next(); return r.done ? r : { value: new PyTuple([i++, r.value]), done: false }; } });
    });
    def('zip', a => {
      const its = a.map(iterOf);
      return new PyIter('zip', { next: () => { if (!its.length) return { done: true }; const vals = []; for (const it of its) { const r = it.next(); if (r.done) return { done: true }; vals.push(r.value); } return { value: new PyTuple(vals), done: false }; } });
    });
    def('map', a => {
      if (a.length < 2) throw err('TypeError', 'map() must have at least two arguments.');
      const f = a[0];
      const its = a.slice(1).map(iterOf);
      return new PyIter('map', { next: () => { const vals = []; for (const it of its) { const r = it.next(); if (r.done) return { done: true }; vals.push(r.value); } return { value: I.call(f, vals, null), done: false }; } });
    });
    def('filter', a => {
      argc('filter', a, 2, 2);
      const f = a[0];
      const it = iterOf(a[1]);
      return new PyIter('filter', { next: () => { for (;;) { const r = it.next(); if (r.done) return r; if (truthy(f === null ? r.value : I.call(f, [r.value], null))) return r; } } });
    });
    def('iter', a => new PyIter('iterator', iterOf(a[0])));
    def('next', a => {
      const v = a[0];
      if (!(v instanceof PyIter)) throw err('TypeError', `'${typeName(v)}' object is not an iterator`);
      const r = v.it.next();
      if (r.done) { if (a.length > 1) return a[1]; throw new PyThrow(new PyExc(EXC.StopIteration, []), 0, null); }
      return r.value;
    });
    def('any', a => { argc('any', a, 1, 1); const it = iterOf(a[0]); for (let r = it.next(); !r.done; r = it.next()) if (truthy(r.value)) return true; return false; });
    def('all', a => { argc('all', a, 1, 1); const it = iterOf(a[0]); for (let r = it.next(); !r.done; r = it.next()) if (!truthy(r.value)) return false; return true; });
    def('round', (a, k) => {
      argc('round', a, 1, 2);
      const v = a[0];
      const nd = a.length > 1 ? a[1] : kw(k, 'ndigits', null);
      if (!isNum(v)) throw err('TypeError', `type ${typeName(v)} doesn't define __round__ method`);
      if (nd === null || nd === undefined) {
        if (isIntLike(v)) return big(v);
        if (!Number.isFinite(v)) throw err(Number.isNaN(v) ? 'ValueError' : 'OverflowError', Number.isNaN(v) ? 'cannot convert float NaN to integer' : 'cannot convert float infinity to integer');
        return BigInt(roundHalfEven(v));
      }
      const n = Number(big(nd));
      if (isIntLike(v)) {
        if (n >= 0) return big(v);
        const p = 10n ** BigInt(-n);
        const b = big(v);
        const q = floorDivBig(b, p);
        const r = b - q * p;
        let res = q;
        if (r * 2n > p || (r * 2n === p && q % 2n !== 0n)) res = q + 1n;
        return res * p;
      }
      if (!Number.isFinite(v)) return v;
      if (n >= 0) {
        if (Math.abs(v) >= 1e21 || n > 70) return v;
        const s = v.toFixed(Math.min(100, n + 25));
        const dot = s.indexOf('.');
        const tail = s.slice(dot + 1 + n);
        if (/^50*$/.test(tail)) {
          const kept = s.slice(0, dot + 1 + n).replace(/\.$/, '');
          const last = parseInt(kept.replace(/[-.]/g, '').slice(-1), 10);
          if (last % 2 === 0) return parseFloat(kept);
        }
        return parseFloat(v.toFixed(n));
      }
      const p = Math.pow(10, -n);
      return roundHalfEven(v / p) * p;
    });
    def('ord', a => {
      argc('ord', a, 1, 1);
      if (typeof a[0] !== 'string') throw err('TypeError', `ord() expected string of length 1, but ${typeName(a[0])} found`);
      if (a[0].length !== 1) throw err('TypeError', `ord() expected a character, but string of length ${a[0].length} found`);
      return BigInt(a[0].charCodeAt(0));
    });
    def('chr', a => {
      argc('chr', a, 1, 1);
      if (!isIntLike(a[0])) throw err('TypeError', `'${typeName(a[0])}' object cannot be interpreted as an integer`);
      const c = Number(big(a[0]));
      if (c < 0 || c > 0x10FFFF) throw err('ValueError', 'chr() arg not in range(0x110000)');
      return String.fromCodePoint(c);
    });
    const radix = (name, base, prefix) => def(name, a => {
      argc(name, a, 1, 1);
      if (!isIntLike(a[0])) throw err('TypeError', `'${typeName(a[0])}' object cannot be interpreted as an integer`);
      const b = big(a[0]);
      return (b < 0n ? '-' : '') + prefix + (b < 0n ? -b : b).toString(base);
    });
    radix('bin', 2, '0b');
    radix('oct', 8, '0o');
    radix('hex', 16, '0x');
    def('divmod', a => { argc('divmod', a, 2, 2); return new PyTuple([binop('//', a[0], a[1]), binop('%', a[0], a[1])]); });
    def('pow', a => {
      argc('pow', a, 2, 3);
      if (a.length === 3) {
        let b = big(a[0]); let e = big(a[1]); const m = big(a[2]);
        if (m === 0n) throw err('ValueError', 'pow() 3rd argument cannot be 0');
        let r = 1n; b = modBig(b, m);
        while (e > 0n) { if (e & 1n) r = r * b % m; b = b * b % m; e >>= 1n; }
        return modBig(r, m);
      }
      return binop('**', a[0], a[1]);
    });
    def('format', a => { argc('format', a, 1, 2); return formatValue(a[0], a.length > 1 ? needStr('format', a[1], 2) : ''); });
    def('callable', a => a[0] instanceof PyFunction || a[0] instanceof PyBuiltin || a[0] instanceof PyType);
    def('hash', a => { const h = hkey(a[0]); let x = 0; for (const c of h) x = (x * 31 + c.charCodeAt(0)) | 0; return BigInt(x); });
    def('id', a => BigInt(parseInt(addrOf(typeof a[0] === 'object' && a[0] ? a[0] : {}), 16)));
    def('exit', () => { throw err('RuntimeError', 'exit() tady nefunguje'); });
    for (const name of Object.keys(EXC)) B.set(name, EXC[name]);
    B.set('__name__', '__main__');
    return B;
  }

  function minmax(I, a, k, name) {
    const keyFn = kw(k, 'key', null);
    const hasDef = k && k.has('default');
    let items;
    if (a.length === 1) items = toArray(a[0]);
    else if (a.length > 1) items = a;
    else throw err('TypeError', `${name} expected at least 1 argument, got 0`);
    if (!items.length) {
      if (hasDef) return k.get('default');
      throw err('ValueError', `${name}() iterable argument is empty`);
    }
    let best = items[0];
    let bestKey = keyFn ? I.call(keyFn, [best], null) : best;
    for (let i = 1; i < items.length; i++) {
      const kv = keyFn ? I.call(keyFn, [items[i]], null) : items[i];
      if (name === 'min' ? pyLt(kv, bestKey) : pyLt(bestKey, kv)) { best = items[i]; bestKey = kv; }
    }
    return best;
  }

  function makeModules(I) {
    const f = (name, fn) => new PyBuiltin(name, fn);
    const fl = v => { if (!isNum(v)) throw err('TypeError', `must be real number, not ${typeName(v)}`); return num(v); };
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
    return {
      math: new PyModule('math', {
        pi: Math.PI, e: Math.E, tau: 2 * Math.PI, inf: Infinity, nan: NaN,
        sqrt: f('sqrt', a => { const x = fl(a[0]); if (x < 0) throw err('ValueError', 'math domain error'); return Math.sqrt(x); }),
        isqrt: f('isqrt', a => { let n = big(a[0]); if (n < 0n) throw err('ValueError', 'isqrt() argument must be nonnegative'); if (n < 2n) return n; let x = BigInt(Math.floor(Math.sqrt(Number(n)))); while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return x; }),
        floor: f('floor', a => (isIntLike(a[0]) ? big(a[0]) : BigInt(Math.floor(fl(a[0]))))),
        ceil: f('ceil', a => (isIntLike(a[0]) ? big(a[0]) : BigInt(Math.ceil(fl(a[0]))))),
        trunc: f('trunc', a => (isIntLike(a[0]) ? big(a[0]) : BigInt(Math.trunc(fl(a[0]))))),
        fabs: f('fabs', a => Math.abs(fl(a[0]))),
        pow: f('pow', a => Math.pow(fl(a[0]), fl(a[1]))),
        log: f('log', a => { const x = fl(a[0]); if (x <= 0) throw err('ValueError', 'math domain error'); return a.length > 1 ? Math.log(x) / Math.log(fl(a[1])) : Math.log(x); }),
        log2: f('log2', a => { const x = fl(a[0]); if (x <= 0) throw err('ValueError', 'math domain error'); return Math.log2(x); }),
        log10: f('log10', a => { const x = fl(a[0]); if (x <= 0) throw err('ValueError', 'math domain error'); return Math.log10(x); }),
        exp: f('exp', a => Math.exp(fl(a[0]))),
        sin: f('sin', a => Math.sin(fl(a[0]))), cos: f('cos', a => Math.cos(fl(a[0]))), tan: f('tan', a => Math.tan(fl(a[0]))),
        gcd: f('gcd', a => { let x = big(a[0] ?? 0n); let y = big(a[1] ?? 0n); if (x < 0n) x = -x; if (y < 0n) y = -y; while (y) [x, y] = [y, x % y]; return x; }),
        factorial: f('factorial', a => { if (!isIntLike(a[0])) throw err('TypeError', "'float' object cannot be interpreted as an integer"); const n = big(a[0]); if (n < 0n) throw err('ValueError', 'factorial() not defined for negative values'); let r = 1n; for (let i = 2n; i <= n; i++) r *= i; return r; }),
        isclose: f('isclose', a => Math.abs(fl(a[0]) - fl(a[1])) <= 1e-9 * Math.max(Math.abs(fl(a[0])), Math.abs(fl(a[1])))),
        hypot: f('hypot', a => Math.hypot(...a.map(fl)))
      }),
      string: new PyModule('string', {
        ascii_lowercase: 'abcdefghijklmnopqrstuvwxyz',
        ascii_uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        ascii_letters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        digits: '0123456789',
        hexdigits: '0123456789abcdefABCDEF',
        octdigits: '01234567',
        punctuation: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
        whitespace: ' \t\n\r\x0b\x0c'
      }),
      random: new PyModule('random', {
        seed: f('seed', a => { seed = Number(big(a[0] ?? 0n)) & 0x7fffffff; return null; }),
        random: f('random', () => rnd()),
        randint: f('randint', a => { const lo = big(a[0]); const hi = big(a[1]); return lo + BigInt(Math.floor(rnd() * Number(hi - lo + 1n))); }),
        choice: f('choice', a => { const items = toArray(a[0]); if (!items.length) throw err('IndexError', 'Cannot choose from an empty sequence'); return items[Math.floor(rnd() * items.length)]; }),
        shuffle: f('shuffle', a => { const l = a[0]; for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return null; })
      })
    };
  }

  /* =====================================================================
   *  Vysvětlení chyb česky
   * ===================================================================== */
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  /* návrh podobného jména – stejný algoritmus jako CPython (Python/suggestions.c) */
  const MOVE_COST = 2;
  function subCost(a, b) {
    if ((a.charCodeAt(0) & 31) !== (b.charCodeAt(0) & 31)) return MOVE_COST;
    if (a === b) return 0;
    return a.toLowerCase() === b.toLowerCase() ? 1 : MOVE_COST;
  }
  function pyLev(a, b, maxCost) {
    let s = 0;
    while (s < a.length && s < b.length && a[s] === b[s]) s++;
    a = a.slice(s); b = b.slice(s);
    while (a.length && b.length && a[a.length - 1] === b[b.length - 1]) { a = a.slice(0, -1); b = b.slice(0, -1); }
    if (!a.length || !b.length) return (a.length + b.length) * MOVE_COST;
    if (Math.abs(a.length - b.length) * MOVE_COST > maxCost) return maxCost + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j * MOVE_COST);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i * MOVE_COST];
      let rowMin = cur[0];
      for (let j = 1; j <= b.length; j++) {
        const v = Math.min(prev[j] + MOVE_COST, cur[j - 1] + MOVE_COST, prev[j - 1] + subCost(a[i - 1], b[j - 1]));
        cur.push(v);
        if (v < rowMin) rowMin = v;
      }
      if (rowMin > maxCost) return maxCost + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  function pySuggest(name, items) {
    let best = null;
    let bestD = name.length;
    if (name.length > 40 || items.length > 750) return null;
    for (const item of items) {
      if (item === name || item.length > 40) continue;
      let maxD = Math.floor((name.length + item.length + 3) * MOVE_COST / 6);
      if (bestD - 1 < maxD) maxD = bestD - 1;
      const d = pyLev(name, item, maxD);
      if (d > maxD) continue;
      if (!best || d < bestD) { best = item; bestD = d; }
    }
    return best;
  }

  function closest(word, options) {
    let best = null;
    let bd = 99;
    for (const o of options) { const x = lev(word.toLowerCase(), o.toLowerCase()); if (x < bd) { bd = x; best = o; } }
    return bd <= Math.max(1, Math.floor(word.length / 3)) ? best : null;
  }
  const TYPE_CZ = { int: 'celé číslo (int)', float: 'desetinné číslo (float)', str: 'text (str)', list: 'seznam (list)', dict: 'slovník (dict)', tuple: 'n-tice (tuple)', bool: 'pravdivostní hodnota (bool)', NoneType: 'None', set: 'množina (set)', function: 'funkce' };
  const tcz = t => TYPE_CZ[t] || t;

  function explain(type, msg, ctx) {
    ctx = ctx || {};
    let m;
    switch (type) {
      case 'NameError':
        if ((m = /name '(.+)' is not defined/.exec(msg))) {
          const name = m[1];
          const sug = ctx.suggestion || null;
          if (/^(true|false|none)$/i.test(name)) return `Python rozlišuje velká písmena: piš ${name[0].toUpperCase() + name.slice(1).toLowerCase()}.`;
          if (['printf', 'echo', 'console', 'println'].includes(name)) return 'V Pythonu se vypisuje funkcí print(...).';
          return `Python nezná jméno „${name}“. ${sug ? `Nemyslel(a) jsi „${sug}“? ` : ''}Je to překlep, nebo proměnnou používáš dřív, než do ní něco uložíš? Pokud je to text, dej ho do uvozovek.`;
        }
        break;
      case 'UnboundLocalError':
        return 'Proměnnou ve funkci měníš (přiřazuješ do ní), takže ji Python bere jako lokální – jenže ji čteš dřív, než má hodnotu. Nastav ji na začátku funkce (např. pocet = 0).';
      case 'TypeError':
        if ((m = /can only concatenate str \(not "(.+)"\) to str/.exec(msg))) return `Text (str) a ${tcz(m[1])} nejde spojit pomocí +. Převeď hodnotu na text: str(x), nebo použij f-string: f"…{x}…".`;
        if ((m = /unsupported operand type\(s\) for (.+): '(.+)' and '(.+)'/.exec(msg))) {
          if (m[2] === 'NoneType' || m[3] === 'NoneType') return 'Počítáš s hodnotou None – nejspíš nějaká funkce nic nevrací (chybí return).';
          if ((m[2] === 'int' || m[2] === 'float') && m[3] === 'str') return `Nejde ${m[1] === '+' ? 'sečíst' : 'počítat s'} číslo a text. Pokud text obsahuje číslo, převeď ho: int(text).`;
          return `Operátor ${m[1]} nejde použít na ${tcz(m[2])} a ${tcz(m[3])}.`;
        }
        if ((m = /'(.+)' not supported between instances of '(.+)' and '(.+)'/.exec(msg))) {
          if ((m[2] === 'str' && (m[3] === 'int' || m[3] === 'float')) || (m[3] === 'str' && (m[2] === 'int' || m[2] === 'float'))) return 'Porovnáváš text s číslem – Python neví, co je víc. Převeď text na číslo pomocí int(...).';
          return `Hodnoty typu ${tcz(m[2])} a ${tcz(m[3])} nejde porovnat pomocí ${m[1]}.`;
        }
        if ((m = /(.+)\(\) missing (\d+) required positional arguments?: (.+)/.exec(msg))) return `Funkci ${m[1]} voláš s málo argumenty – chybí ${m[3]}. Při volání musíš dodat hodnotu pro každý parametr.`;
        if ((m = /(.+)\(\) takes (.+) but (\d+) (?:was|were) given/.exec(msg))) return `Funkci ${m[1]} posíláš víc argumentů, než má parametrů. Zkontroluj závorky při volání a hlavičku def.`;
        if ((m = /'(.+)' object is not iterable/.exec(msg))) return m[1] === 'int' ? 'Cyklem for nejde procházet číslo. Chtěl(a) jsi range(n)?' : m[1] === 'NoneType' ? 'Procházíš None – nějaká funkce asi nic nevrací (chybí return).' : `Typ ${tcz(m[1])} se nedá procházet cyklem.`;
        if ((m = /'(.+)' object is not subscriptable/.exec(msg))) return m[1] === 'NoneType' ? 'Používáš [] na None – nějaká funkce asi nic nevrací (chybí return).' : m[1] === 'function' || m[1] === 'builtin_function_or_method' ? 'Funkci se volá kulatými závorkami (), ne hranatými [].' : `Hranaté závorky [] fungují u seznamů, textů a slovníků, ne u typu ${tcz(m[1])}.`;
        if ((m = /'(.+)' object is not callable/.exec(msg))) return `${tcz(m[1])} není funkce – nejde ho volat pomocí (). Nepřepsal(a) jsi omylem jméno funkce proměnnou? Nebo chybí mezi hodnotami operátor (např. *)?`;
        if ((m = /(list|string|tuple) indices must be integers or slices, not (.+)/.exec(msg))) return `Index musí být celé číslo, ne ${tcz(m[2])}.${m[2] === 'str' ? ' Chtěl(a) jsi slovník (dict)? Nebo převeď text na číslo int(...).' : m[2] === 'float' ? ' Použij celočíselné dělení //.' : ''}`;
        if ((m = /object of type '(.+)' has no len\(\)/.exec(msg))) return `len() umí změřit text, seznam nebo slovník – ne ${tcz(m[1])}.${m[1] === 'int' ? ' Počet číslic zjistíš přes len(str(cislo)).' : ''}`;
        if (/'str' object does not support item assignment/.test(msg)) return 'Text (str) nejde měnit po znacích. Vytvoř nový text – třeba postupným přidáváním: vysledek = vysledek + znak.';
        if ((m = /unhashable type: '(.+)'/.exec(msg))) return `${tcz(m[1])} nemůže být klíčem ve slovníku ani prvkem množiny. Použij n-tici (tuple) nebo text.`;
        if (/sequence item \d+: expected str instance/.test(msg)) return 'join() spojuje jen texty. Převeď prvky na text: "".join(str(x) for x in seznam).';
        if (/'(.+)' object cannot be interpreted as an integer/.test(msg)) return 'Tady je potřeba celé číslo (int). U range() a podobných nejde použít float ani text – převeď hodnotu přes int(...).';
        if (/can't multiply sequence by non-int/.test(msg)) return 'Text nebo seznam jde násobit jen celým číslem.';
        if (/ord\(\) expected a character/.test(msg)) return 'ord() bere jen jeden znak. Projdi text cyklem a volej ord(znak) pro každý znak zvlášť.';
        if (/sum\(\) can't sum strings/.test(msg)) return 'Texty se nespojují přes sum(), ale přes "".join(seznam).';
        if (/got an unexpected keyword argument/.test(msg)) return 'Funkce nemá parametr s tímhle jménem.';
        if (/'in <string>' requires string as left operand/.test(msg)) return 'U textu se přes in hledá zase text: např. "a" in slovo. Číslo převeď na text pomocí str(...).';
        return 'Hodnota má jiný typ, než operace čeká. Zkontroluj, jestli nemícháš text a čísla.';
      case 'IndexError':
        if (/list index out of range/.test(msg)) return 'Sahas mimo seznam. Seznam s n prvky má indexy 0 až n − 1 (poslední prvek je seznam[-1]).';
        if (/string index out of range/.test(msg)) return 'Sahas mimo text. Text délky n má indexy 0 až n − 1.';
        if (/pop from empty list/.test(msg)) return 'Seznam je prázdný – není co vyndat.';
        return 'Index je mimo rozsah.';
      case 'KeyError': return `Klíč ${msg} ve slovníku není. Použij slovnik.get(klic, vychozi) nebo se nejdřív zeptej: if klic in slovnik.`;
      case 'ValueError':
        if ((m = /invalid literal for int\(\) with base (\d+): (.+)/.exec(msg))) return `Text ${m[2]} není celé číslo${m[1] !== '10' ? ` v soustavě o základu ${m[1]}` : ''}, int() ho nepřevede.${/[.,]/.test(m[2]) ? ' Desetinné číslo převeď přes float().' : ''}`;
        if (/could not convert string to float/.test(msg)) return 'Text není číslo, float() ho nepřevede. (Desetinná tečka, ne čárka!)';
        if (/too many values to unpack/.test(msg)) return 'Na levé straně je méně proměnných, než kolik hodnot rozbaluješ.';
        if (/not enough values to unpack/.test(msg)) return 'Na levé straně je víc proměnných, než kolik je hodnot.';
        if (/is not in list|x not in list/.test(msg)) return 'Hledaná hodnota v seznamu není. Zeptej se nejdřív: if x in seznam.';
        if (/substring not found/.test(msg)) return 'Hledaný text tam není. Metoda find() místo chyby vrátí −1.';
        if (/arg is an empty sequence|iterable argument is empty/.test(msg)) return 'min()/max() dostaly prázdný seznam.';
        return 'Hodnota má správný typ, ale nedává smysl (např. převod textu, který není číslo).';
      case 'ZeroDivisionError': return 'Dělení nulou. Před dělením zkontroluj, že dělitel není 0.';
      case 'AttributeError': {
        if ((m = /'(.+)' object has no attribute '(.+)'/.exec(msg))) {
          const t = m[1];
          const a = m[2];
          const special = { push: 'append', length: 'len(x)', size: 'len(x)', add: t === 'list' ? 'append' : null, toUpperCase: 'upper', toLowerCase: 'lower', contains: 'in', trim: 'strip', indexOf: 'find / index', len: 'len(x)' };
          const sug = special[a] || ctx.suggestion || null;
          if (t === 'NoneType') return 'Voláš metodu na None – nějaká funkce asi nic nevrací (chybí return), nebo jsi uložil(a) výsledek metody, která vrací None (např. seznam.sort()).';
          return `${tcz(t)} nemá metodu/vlastnost „${a}“.${sug ? ` Nemyslel(a) jsi ${sug.includes('(') || sug.includes(' ') ? sug : '„' + sug + '“'}?` : ''}`;
        }
        return 'Tenhle typ takovou metodu nemá.';
      }
      case 'RecursionError': return 'Funkce volá sama sebe pořád dokola. Chybí ukončovací podmínka (např. if n == 0: return …).';
      case 'IndentationError':
        if (/expected an indented block/.test(msg)) return 'Za řádkem končícím dvojtečkou (:) musí přijít odsazený blok. Odsaď další řádek o 4 mezery.';
        if (/unexpected indent/.test(msg)) return 'Tenhle řádek je odsazený, i když nemá být. Zarovnej ho s řádkem nad ním.';
        if (/unindent does not match/.test(msg)) return 'Odsazení nesedí s žádnou úrovní nad ním. Používej vždy 4 mezery na úroveň.';
        return 'Chyba v odsazení. V Pythonu odsazení určuje, co patří do bloku.';
      case 'SyntaxError':
        if (/expected ':'/.test(msg)) return 'Na konci řádku s if / elif / else / for / while / def chybí dvojtečka (:).';
        if (/Maybe you meant '==' or ':=' instead of '='/.test(msg)) return 'V podmínce se porovnává pomocí ==. Jedno = znamená přiřazení.';
        if (/Maybe you meant '==' instead of '='/.test(msg)) return 'Na levé straně = musí být proměnná. Pokud jsi chtěl(a) porovnávat, použij ==.';
        if (/was never closed/.test(msg)) return 'Závorka se otevřela, ale nikde se nezavřela.';
        if (/unmatched/.test(msg)) return 'Zavírací závorka nemá k sobě otevírací.';
        if (/does not match opening parenthesis/.test(msg)) return 'Závorky nesedí – např. ( zavíráš pomocí ].';
        if (/unterminated (triple-quoted )?string literal/.test(msg)) return 'Text nemá ukončovací uvozovku.';
        if (/Missing parentheses in call to 'print'/.test(msg)) return 'V Pythonu 3 je print funkce: print("text").';
        if (/'return' outside function/.test(msg)) return 'return smí být jen uvnitř funkce (def). Zkontroluj odsazení.';
        if (/'break' outside loop|'continue' not properly in loop/.test(msg)) return 'break/continue smí být jen uvnitř cyklu for nebo while.';
        if (/Perhaps you forgot a comma/.test(msg)) return 'Mezi hodnotami chybí čárka.';
        if (/invalid decimal literal/.test(msg)) return 'Jméno proměnné nesmí začínat číslicí.';
        if (/leading zeros/.test(msg)) return 'Celé číslo nesmí začínat nulou (piš 7, ne 07). Text „0007“ dej do uvozovek.';
        if (/invalid character/.test(msg)) return 'V kódu je znak, kterému Python nerozumí (třeba typografické uvozovky „ “ – použij " ).';
        if (/cannot assign to/.test(msg)) return 'Přiřadit (=) jde jen do proměnné, prvku seznamu nebo slovníku.';
        if (/expected 'else' after 'if' expression/.test(msg)) return 'Podmíněný výraz má tvar: a if podminka else b.';
        if (/třídy|nepodporuje|není podporovan|nejsou podporovan/.test(msg)) return msg;
        return 'Python tomuhle zápisu nerozumí. Zkontroluj dvojtečky, závorky, uvozovky a čárky.';
      case 'ModuleNotFoundError': return 'Tenhle modul v terminálu KOBRA není. K dispozici jsou math, string a random.';
      case 'ImportError': return 'Modul takovou funkci nemá.';
      case 'Timeout': return 'Program běží moc dlouho. Nemáš nekonečný cyklus? U while zkontroluj, že se podmínka někdy stane nepravdivou (měníš proměnnou uvnitř cyklu?).';
      case 'OutputLimit': return 'Program vypsal obrovské množství textu – nejspíš print v nekonečném cyklu.';
      case 'AssertionError': return 'Podmínka v assert neplatí.';
      case 'OverflowError': return 'Číslo je příliš velké.';
      case 'MemoryError': return 'Vytváříš příliš velký seznam nebo text.';
      case 'StopIteration': return 'Iterátor už nemá další prvky.';
      case 'RuntimeError': return msg;
      default: break;
    }
    return '';
  }

  /* =====================================================================
   *  Veřejné API
   * ===================================================================== */
  function errorInfo(e, I) {
    if (e instanceof PySyntaxError) {
      return { type: e.type, msg: e.msg, line: e.line, func: null, text: `${e.type}: ${e.msg}`, czech: explain(e.type, e.msg), syntax: true };
    }
    if (e instanceof Timeout) return { type: 'Timeout', msg: `program překročil limit ${I ? I.maxSteps.toLocaleString('cs-CZ') : ''} kroků`, line: I ? I.line : 0, func: null, text: 'Časový limit: program běží příliš dlouho', czech: explain('Timeout') };
    if (e instanceof OutputLimit) return { type: 'OutputLimit', msg: 'příliš mnoho výstupu', line: I ? I.line : 0, func: null, text: 'Příliš mnoho výstupu', czech: explain('OutputLimit') };
    if (e instanceof PyThrow) {
      if (I) I.fillThrow(e);
      const t = e.exc.type.name;
      const msg = t === 'KeyError' && e.exc.args.length ? repr(e.exc.args[0]) : str(e.exc);
      const names = I ? [...I.globals.vars.keys(), ...I.builtins.keys(), ...(e.trace ? [] : [])] : [];
      const trace = e.trace || [];
      const top = trace[trace.length - 1];
      const ctx = { names, options: e.exc.attr ? e.exc.attr.options : [] };
      let text = msg ? `${t}: ${msg}` : t;
      let suggestion = null;
      if (t === 'NameError' && e.exc.name) {
        suggestion = pySuggest(e.exc.name, [].concat(...(e.exc.candidates || [names])));
        if (suggestion) text += `. Did you mean: '${suggestion}'?`;
        else if (['math', 'string', 'random'].includes(e.exc.name)) text += `. Did you forget to import '${e.exc.name}'?`;
      }
      if (t === 'AttributeError' && e.exc.attr) {
        suggestion = pySuggest(e.exc.attr.name, e.exc.attr.options);
        if (suggestion) text += `. Did you mean: '${suggestion}'?`;
      }
      if (suggestion) ctx.suggestion = suggestion;
      return { type: t, msg, line: e.line || (top && top.line) || 0, func: top && top.name !== '<module>' ? top.name : null, trace, text, czech: explain(t, msg, ctx) };
    }
    if (e instanceof RangeError) return { type: 'RecursionError', msg: 'maximum recursion depth exceeded', line: I ? I.line : 0, text: 'RecursionError: maximum recursion depth exceeded', czech: explain('RecursionError') };
    throw e;
  }

  class Runtime {
    constructor(opts) {
      this.I = new Interp(opts);
    }
    get globals() { return this.I.globals; }
    get out() { return this.I.out; }
    takeOutput() { const o = this.I.out; this.I.out = ''; return o; }
    /* spustí kód modulu; vrátí { ok, error } – výstup je v this.out */
    exec(src) {
      let ast;
      try { ast = parse(src); } catch (e) { return { ok: false, error: errorInfo(e, null) }; }
      return this.execAst(ast);
    }
    execAst(ast) {
      try { this.I.runModule(ast); return { ok: true, error: null }; } catch (e) { return { ok: false, error: errorInfo(e, this.I) }; }
    }
    /* vyhodnotí výraz (např. volání testované funkce) v globálním rozsahu */
    evalExpr(src, opts) {
      const I = this.I;
      if (opts && opts.maxSteps) { I.maxSteps = opts.maxSteps; }
      I.steps = 0;
      I.depth = 0;
      I.stack = [];
      let e;
      try { e = parseExprSrc(src, 0); } catch (x) { return { ok: false, error: errorInfo(x, null) }; }
      try { return { ok: true, value: I.ev(e, I.globals) }; } catch (x) { return { ok: false, error: errorInfo(x, I) }; }
    }
    set(name, value) { this.I.globals.vars.set(name, value); }
    get(name) { return this.I.globals.vars.get(name); }
    has(name) { return this.I.globals.vars.has(name); }
    builtin(name, fn) { return new PyBuiltin(name, (args, kwargs) => fn(args, kwargs === EMPTY ? null : kwargs)); }
    /* zavolá funkci hráče s hotovými argumenty (bez parsování výrazu) – pro řídicí smyčku simulace */
    call(f, args, opts) {
      const I = this.I;
      if (opts && opts.maxSteps) I.maxSteps = opts.maxSteps;
      I.steps = 0;
      I.depth = 0;
      I.stack = [];
      try { return { ok: true, value: I.call(f, args, null) }; } catch (x) { return { ok: false, error: errorInfo(x, I) }; }
    }
    get steps() { return this.I.steps; }
  }

  /* převod jednoduchých JS hodnot na Python (pro testy) */
  function fromJS(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return Number.isInteger(v) ? BigInt(v) : v;
    if (typeof v === 'string' || typeof v === 'boolean' || typeof v === 'bigint') return v;
    if (Array.isArray(v)) return v.map(fromJS);
    if (typeof v === 'object') { const d = new PyDict(); Object.entries(v).forEach(([k, x]) => d.set(k, fromJS(x))); return d; }
    return v;
  }

  /* pro bonusové cíle: projde AST a zavolá f(uzel) pro každý uzel */
  function walkAst(node, f) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(n => walkAst(n, f)); return; }
    if (node.k) f(node);
    for (const key of Object.keys(node)) {
      if (key === 'line' || key === 'tok' || key === 'locals' || key === 'globals' || key === 'nonlocals') continue;
      const v = node[key];
      if (v && typeof v === 'object') walkAst(v, f);
    }
  }

  global.MiniPython = {
    Runtime, parse, tokenize, repr, str, pyEq, typeName, truthy, fromJS, walkAst, explain, formatValue,
    PyTuple, PyDict, PySet, PyThrow, PyExc, EXC, err, toArray
  };
})(typeof window !== 'undefined' ? window : globalThis);
