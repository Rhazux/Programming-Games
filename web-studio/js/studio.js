/*
 * Web Studio Tycoon – běhové prostředí
 *  1) sestaví stránku hráče (index.html + style.css + script.js) do iframe
 *  2) ochrání prohlížeč před nekonečnými cykly (instrumentace while/for)
 *  3) zkontroluje HTML (neuzavřené značky, překlepy, duplicitní id…)
 *  4) spustí automatické testy požadavků klienta (klikání, psaní, klávesy)
 *  5) vysvětlí chyby JavaScriptu česky
 */
(function (global) {
  'use strict';

  /* =====================================================================
   *  1) Ochrana proti nekonečným cyklům
   * ===================================================================== */
  const ID_START = /[A-Za-z_$À-￿]/;
  const ID_CHAR = /[A-Za-z0-9_$À-￿]/;

  /* přeskočí řetězec, komentář nebo šablonu začínající na indexu i; vrátí index za ní (nebo -1) */
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
  /* do podmínky každého while/for vloží __g(), která po milionech opakování cyklus zastaví (řádky se nemění) */
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

  /* =====================================================================
   *  2) Kontrola HTML
   * ===================================================================== */
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const KNOWN = new Set(('html head body title meta link style script noscript header footer main nav section article aside h1 h2 h3 h4 h5 h6 hgroup ' +
    'p div span a em strong b i u s small mark sub sup br hr ul ol li dl dt dd figure figcaption blockquote q cite code pre kbd samp var abbr time address ' +
    'img picture source video audio track canvas svg path circle rect line polyline polygon g text iframe embed object ' +
    'table caption thead tbody tfoot tr th td colgroup col form fieldset legend label input button select option optgroup textarea output progress meter datalist ' +
    'details summary dialog template slot data wbr ins del bdi bdo ruby rt rp map area center font').split(' '));
  const OPTIONAL_END = new Set(['li', 'p', 'option', 'tr', 'td', 'th', 'dt', 'dd', 'thead', 'tbody', 'tfoot', 'optgroup']);
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function suggestTag(t) {
    let best = null;
    let bd = 9;
    for (const k of KNOWN) { const d = lev(t, k); if (d < bd) { bd = d; best = k; } }
    return bd <= 2 ? best : null;
  }

  function validateHtml(html) {
    const warnings = [];
    const stack = [];
    const ids = new Map();
    const lineAt = idx => html.slice(0, idx).split('\n').length;
    let i = 0;
    while (i < html.length) {
      const lt = html.indexOf('<', i);
      if (lt < 0) break;
      if (html.startsWith('<!--', lt)) {
        const end = html.indexOf('-->', lt + 4);
        if (end < 0) { warnings.push({ line: lineAt(lt), msg: 'Komentář <!-- není uzavřený (chybí -->).' }); break; }
        i = end + 3;
        continue;
      }
      if (/^<!doctype/i.test(html.slice(lt, lt + 9))) { i = html.indexOf('>', lt) + 1 || html.length; continue; }
      const m = /^<(\/?)([a-zA-Z][\w-]*)/.exec(html.slice(lt, lt + 60));
      if (!m) { i = lt + 1; continue; }
      // najdi konec značky (respektuj uvozovky)
      let j = lt + m[0].length;
      let q = null;
      let gt = -1;
      for (; j < html.length; j++) {
        const ch = html[j];
        if (q) { if (ch === q) q = null; else if (ch === '\n' && false) q = null; continue; }
        if (ch === '"' || ch === "'") { q = ch; continue; }
        if (ch === '>') { gt = j; break; }
        if (ch === '<') break;
      }
      const line = lineAt(lt);
      const tag = m[2].toLowerCase();
      if (q) { warnings.push({ line, msg: `Ve značce <${tag}> chybí uzavírací uvozovka ${q}.` }); i = lt + 1; continue; }
      if (gt < 0) { warnings.push({ line, msg: `Značka <${m[1]}${tag} není uzavřená znakem >.` }); i = lt + 1; continue; }
      const attrs = html.slice(lt + m[0].length, gt);
      i = gt + 1;
      if (!KNOWN.has(tag) && !tag.includes('-')) {
        const s = suggestTag(tag);
        warnings.push({ line, msg: `Neznámá značka <${tag}>${s ? ` – nemyslel(a) jsi <${s}>?` : '.'}` });
      }
      if (tag === 'script') warnings.push({ line, msg: 'JavaScript piš do záložky script.js, ne do HTML.' });
      if (m[1]) {
        // uzavírací značka
        if (VOID.has(tag)) { warnings.push({ line, msg: `Značka <${tag}> se neuzavírá – </${tag}> smaž.` }); continue; }
        const k = stack.map(x => x.tag).lastIndexOf(tag);
        if (k < 0) { warnings.push({ line, msg: `Uzavírací </${tag}> nemá k sobě otevírací <${tag}>.` }); continue; }
        for (let x = stack.length - 1; x > k; x--) {
          if (!OPTIONAL_END.has(stack[x].tag)) warnings.push({ line: stack[x].line, msg: `Značka <${stack[x].tag}> z řádku ${stack[x].line} není uzavřená (chybí </${stack[x].tag}>).` });
        }
        stack.length = k;
        continue;
      }
      // otevírací značka – atributy
      const idm = /(?:^|\s)id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
      if (idm) {
        const id = idm[1] ?? idm[2] ?? idm[3];
        if (/\s/.test(id)) warnings.push({ line, msg: `id „${id}“ obsahuje mezeru – id musí být jedno slovo.` });
        if (ids.has(id)) warnings.push({ line, msg: `id „${id}“ je na stránce podruhé (poprvé na řádku ${ids.get(id)}) – každé id musí být jedinečné.` });
        else ids.set(id, line);
      }
      if (tag === 'img' && !/(?:^|\s)alt\s*=/.test(attrs)) warnings.push({ line, msg: 'Obrázek <img> nemá alt – popisek pro nevidomé a pro případ, že se obrázek nenačte.' });
      if (/(?:^|\s)(clas|calss|clss|ide|scr|herf|hrf)\s*=/.test(attrs)) {
        const bad = /(?:^|\s)(clas|calss|clss|ide|scr|herf|hrf)\s*=/.exec(attrs)[1];
        const fix = { clas: 'class', calss: 'class', clss: 'class', ide: 'id', scr: 'src', herf: 'href', hrf: 'href' }[bad];
        warnings.push({ line, msg: `Atribut „${bad}“ neexistuje – nemyslel(a) jsi „${fix}“?` });
      }
      if (!VOID.has(tag) && !/\/\s*$/.test(attrs)) stack.push({ tag, line });
    }
    for (const x of stack) {
      if (!OPTIONAL_END.has(x.tag) && !['html', 'body', 'head'].includes(x.tag)) warnings.push({ line: x.line, msg: `Značka <${x.tag}> z řádku ${x.line} není uzavřená (chybí </${x.tag}>).` });
    }
    return warnings.sort((a, b) => a.line - b.line);
  }

  /* =====================================================================
   *  3) Sestavení stránky
   * ===================================================================== */
  const BOOT = `(function () {
  var W = window;
  W.__log = [];
  var fmt = function (v) {
    if (typeof v === 'string') return v;
    try { if (v instanceof Element) return '<' + v.tagName.toLowerCase() + (v.id ? '#' + v.id : '') + '>'; return JSON.stringify(v); } catch (e) { return String(v); }
  };
  var push = function (kind, msg, line) {
    var item = { kind: kind, msg: msg, line: line || 0 };
    W.__log.push(item);
    try { if (W.parent && W.parent.__studioLog) W.parent.__studioLog(W.__frameTag, item); } catch (e) {}
  };
  W.addEventListener('error', function (e) {
    var file = (e.filename || ''), line = 0;
    if (/script\\.js/.test(file)) line = /SyntaxError/.test(e.message) && W.__jsLine0 && e.lineno >= W.__jsLine0 ? e.lineno - W.__jsLine0 + 1 : e.lineno;
    else if (e.error && e.error.__line) line = e.error.__line;
    else if (e.error && e.error.stack && /script\\.js:(\\d+)/.test(e.error.stack)) line = +/script\\.js:(\\d+)/.exec(e.error.stack)[1];
    else if (W.__jsLine0 && e.lineno >= W.__jsLine0) line = e.lineno - W.__jsLine0 + 1;
    push('error', e.message, line);
  });
  W.addEventListener('unhandledrejection', function (e) { push('error', 'Uncaught (in promise) ' + (e.reason && e.reason.message || e.reason)); });
  ['log', 'info', 'warn', 'error'].forEach(function (k) {
    var orig = console[k];
    console[k] = function () { push(k === 'info' ? 'log' : k, [].map.call(arguments, fmt).join(' ')); try { orig.apply(console, arguments); } catch (e) {} };
  });
  W.__n = 0;
  W.__g = function () {
    if (++W.__n > 3000000) {
      W.__n = 0;
      var err = new Error('Cyklus se opakuje pořád dokola (víc než 3 000 000×) – nemáš nekonečný cyklus?');
      var m = /script\\.js:(\\d+)/.exec(err.stack || '');
      if (m) err.__line = +m[1];
      throw err;
    }
    return true;
  };
  ['click', 'input', 'change', 'keydown', 'keyup', 'submit', 'DOMContentLoaded', 'load'].forEach(function (t) { W.addEventListener(t, function () { W.__n = 0; }, true); });
  var st = W.setTimeout, si = W.setInterval;
  W.setTimeout = function (f, ms) { var a = [].slice.call(arguments, 2); return st(typeof f === 'function' ? function () { W.__n = 0; return f.apply(this, a); } : f, ms); };
  W.setInterval = function (f, ms) { var a = [].slice.call(arguments, 2); return si(typeof f === 'function' ? function () { W.__n = 0; return f.apply(this, a); } : f, ms); };
  W.alert = function (m) { push('log', '[alert] ' + m); };
  W.prompt = function () { push('warn', 'prompt() tu nefunguje – použij <input>.'); return null; };
  W.confirm = function () { return true; };
  W.addEventListener('submit', function (e) {
    if (!e.defaultPrevented) { e.preventDefault(); push('warn', 'Formulář se odeslal a skutečná stránka by se znovu načetla (a vše by zmizelo). V obsluze události submit zavolej event.preventDefault().'); }
  });
  W.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented) return;
    var href = a.getAttribute('href') || '';
    if (href.charAt(0) === '#') {
      e.preventDefault();
      var t = href.length > 1 && document.getElementById(decodeURIComponent(href.slice(1)));
      if (t) t.scrollIntoView({ behavior: 'smooth' }); else push('warn', 'Odkaz ' + href + ' nikam nevede – na stránce není prvek s id „' + href.slice(1) + '“.');
      return;
    }
    e.preventDefault();
    push('log', '🔗 Odkaz na ' + href + (a.target === '_blank' ? ' (otevřel by se v nové záložce)' : '') + ' – v náhledu se neotevírá.');
  });
})();`;

  function replaceAssets(html, assets) {
    if (!assets) return html;
    let out = html;
    for (const [name, url] of Object.entries(assets)) {
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      out = out.replace(new RegExp(`(\\s(?:src|href)\\s*=\\s*)(["']?)${esc}\\2`, 'g'), `$1"${url}" data-src="${name}"`);
    }
    return out;
  }

  function buildDoc(code, opts) {
    opts = opts || {};
    const js = (opts.instrument === false ? code.js : instrumentLoops(code.js)).replace(/<\/script/gi, '<\\/script');
    const css = (code.css || '').replace(/<\/style/gi, '<\\/style');
    const head = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style>`;
    const body = `</head><body>${replaceAssets(code.html, opts.assets)}<script>`;
    // řádek, kde ve stránce začíná script.js (pro chyby syntaxe, které prohlížeč hlásí v řádcích dokumentu)
    const bootTpl = `<script>window.__frameTag=${JSON.stringify(opts.tag || '')};window.__jsLine0=@@;${BOOT}<\/script>`;
    const before = head + bootTpl + body;
    const line0 = before.split('\n').length;
    return before.replace('@@', String(line0)) + `${js}\n//# sourceURL=script.js\n<\/script></body></html>`;
  }

  function loadFrame(frame, doc) {
    return new Promise(resolve => {
      let done = false;
      const finish = () => { if (done) return; done = true; setTimeout(resolve, 15); };
      frame.onload = finish;
      frame.srcdoc = doc;
      setTimeout(finish, 2500);
    });
  }

  /* =====================================================================
   *  4) Testy požadavků
   * ===================================================================== */
  class Fail extends Error { }
  const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const digits = s => String(s == null ? '' : s).replace(/\D/g, '');
  const ltrim = s => norm(s).toLowerCase();

  function makeTester(frame, code, opts) {
    const t = {
      code,
      html: code.html,
      js: code.js,
      css: code.css,
      get w() { return frame.contentWindow; },
      get d() { return frame.contentDocument; },
      norm, digits,
      low: ltrim,
      fail(msg) { throw new Fail(msg); },
      assert(cond, msg) { if (!cond) throw new Fail(msg); },
      $(sel) { return this.d.querySelector(sel); },
      $$(sel) { return [...this.d.querySelectorAll(sel)]; },
      need(sel, what) {
        let el = null;
        try { el = this.d.querySelector(sel); } catch (e) { el = null; }
        if (!el) throw new Fail(`Na stránce chybí ${what || `prvek ${sel}`}.`);
        return el;
      },
      text(sel, what) { return norm(this.need(sel, what).textContent); },
      click(sel, times, what) {
        const el = typeof sel === 'string' ? this.need(sel, what) : sel;
        for (let k = 0; k < (times || 1); k++) el.click();
      },
      type(sel, value, what) {
        const el = typeof sel === 'string' ? this.need(sel, what) : sel;
        el.focus();
        el.value = value;
        el.dispatchEvent(new this.w.Event('input', { bubbles: true }));
        el.dispatchEvent(new this.w.KeyboardEvent('keyup', { bubbles: true, key: String(value).slice(-1) || 'Backspace' }));
        el.dispatchEvent(new this.w.Event('change', { bubbles: true }));
      },
      key(key) {
        const target = this.d.activeElement && this.d.activeElement !== this.d.body && !/input|textarea|select/i.test(this.d.activeElement.tagName) ? this.d.activeElement : this.d.body;
        target.dispatchEvent(new this.w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
        target.dispatchEvent(new this.w.KeyboardEvent('keyup', { key, bubbles: true }));
      },
      visible(el) {
        if (!el || !el.isConnected) return false;
        if (el.hidden) return false;
        const cs = this.w.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        return el.getClientRects().length > 0;
      },
      errors() { return (this.w.__log || []).filter(l => l.kind === 'error'); },
      wait(ms) { return new Promise(r => setTimeout(r, ms || 0)); },
      /* načte stránku znovu, volitelně s upraveným kódem (např. jiná data v poli) */
      async load(changes) {
        const c2 = Object.assign({}, this.code, changes || {});
        await loadFrame(frame, buildDoc(c2, opts));
      }
    };
    return t;
  }

  function withTimeout(p, ms) {
    return Promise.race([Promise.resolve(p), new Promise((_, rej) => setTimeout(() => rej(new Fail('Test trval příliš dlouho – stránka nereaguje.')), ms))]);
  }

  /* spustí všechny požadavky zakázky – každý na čerstvě načtené stránce */
  async function runChecks(order, code, frame, opts) {
    opts = Object.assign({ assets: order.assets, tag: 'test' }, opts || {});
    const list = order.reqs.map(r => Object.assign({ wish: false }, r)).concat(order.wish ? [Object.assign({ wish: true }, order.wish)] : []);
    const results = [];
    const errorsSeen = [];
    const noted = new Set();
    for (const req of list) {
      await loadFrame(frame, buildDoc(code, opts));
      const t = makeTester(frame, code, opts);
      let pass = false;
      let msg = '';
      try {
        const r = await withTimeout(req.test(t), 3000);
        pass = r !== false;
        if (!pass) msg = 'Požadavek není splněný.';
      } catch (e) {
        pass = false;
        msg = e instanceof Fail || (e && e.constructor && e.constructor.name === 'Fail') ? e.message : `Test narazil na chybu: ${e && e.message}`;
      }
      const errs = t.errors();
      errs.forEach(x => errorsSeen.push(x));
      if (!pass && errs.length && !noted.has(errs[0].msg)) {
        noted.add(errs[0].msg);
        msg += ` · Při testu spadl JavaScript: ${errs[0].msg}${errs[0].line ? ` (script.js, ř. ${errs[0].line})` : ''}`;
      }
      results.push({ text: req.text, wish: req.wish, pass, msg });
    }
    return { results, errors: errorsSeen };
  }

  /* =====================================================================
   *  5) Chyby JavaScriptu česky
   * ===================================================================== */
  function explainJs(msg) {
    let m;
    const s = String(msg || '').replace(/^Uncaught\s+/, '');
    if ((m = /ReferenceError: (\S+) is not defined/.exec(s))) return `Jméno „${m[1]}“ neexistuje. Překlep? Pozor na velká a malá písmena (document, ne Document). Nebo proměnnou používáš dřív, než ji vytvoříš.`;
    if ((m = /Cannot (?:read|set) properties of null \((?:reading|setting) '(.+?)'\)/.exec(s))) return `Pracuješ s prvkem, který se nenašel (null). querySelector / getElementById nic nevrátil – zkontroluj, jestli id nebo třída v HTML přesně sedí s tím v JS (#id pro id, .trida pro třídu).`;
    if ((m = /Cannot (?:read|set) properties of undefined \((?:reading|setting) '(.+?)'\)/.exec(s))) return `Hodnota je undefined – sahá se do ní pro „${m[1]}“. Nemáš překlep v názvu vlastnosti nebo nesaháš do pole mimo rozsah?`;
    if ((m = /TypeError: (.+?) is not a function/.exec(s))) return `„${m[1]}“ není funkce. Překlep v názvu metody (addEventListner, querySelecor…)? Nebo voláš metodu na něčem, co ji nemá – querySelectorAll vrací seznam, na jeden prvek použij querySelector.`;
    if ((m = /is not iterable/.exec(s))) return 'Snažíš se procházet cyklem něco, co není pole ani seznam.';
    if (/Assignment to constant variable/.test(s)) return 'Do proměnné vytvořené přes const nejde znovu přiřadit. Když se má hodnota měnit, použij let.';
    if ((m = /Identifier '(.+?)' has already been declared/.exec(s))) return `Proměnnou „${m[1]}“ vytváříš dvakrát (let/const). Podruhé už jen přiřaď: ${m[1]} = …`;
    if (/missing \) after argument list/.test(s)) return 'Chybí zavírací závorka ) za argumenty funkce – nebo čárka mezi argumenty.';
    if (/Unexpected end of input/.test(s)) return 'Kód skončil uprostřed – nejspíš chybí zavírací } nebo ).';
    if (/Invalid or unexpected token/.test(s)) return 'Neplatný znak – často neukončený text (chybí uvozovka) nebo typografické uvozovky „ “ místo " ".';
    if (/Unexpected token|Unexpected identifier|Unexpected string|Unexpected number/.test(s)) return 'Chyba v zápisu kódu – zkontroluj závorky, čárky, středníky a uvozovky kolem řádku s chybou.';
    if (/Maximum call stack size exceeded/.test(s)) return 'Funkce volá sama sebe pořád dokola (nekonečná rekurze).';
    if (/nekonečný cyklus/.test(s)) return 'Cyklus nikdy neskončí – podmínka while/for zůstává pořád pravdivá. Měníš uvnitř cyklu proměnnou z podmínky?';
    if (/Cannot access '(.+?)' before initialization/.test(s)) return 'Proměnnou používáš dřív, než je vytvořená (let/const). Přesuň deklaraci výš.';
    if (/toFixed is not a function|toLowerCase is not a function|toUpperCase is not a function|includes is not a function/.test(s)) return 'Metodu voláš na hodnotě špatného typu (třeba na čísle místo textu).';
    if (/SyntaxError/.test(s)) return 'Chyba v zápisu kódu – prohlížeč ho nedokázal přečíst, takže se nespustil vůbec.';
    return '';
  }

  global.Studio = { instrumentLoops, validateHtml, buildDoc, loadFrame, runChecks, makeTester, explainJs, Fail, norm, digits };
})(typeof window !== 'undefined' ? window : globalThis);
