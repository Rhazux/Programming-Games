/*
 * Web bez bariér – auditor přístupnosti
 *  1) sestaví stránku hráče (HTML + CSS + JS) do iframe, s ochranou proti nekonečným cyklům
 *  2) spočítá, co z ní „slyší“ čtečka obrazovky (role, přístupná jména, lineární čtení)
 *  3) projde stránku klávesnicí (pořadí Tab, viditelné zaměření, stisky kláves)
 *  4) změří kontrast textu podle WCAG 2 a zkontroluje omezení pohybu (prefers-reduced-motion)
 *  5) spustí kontroly úrovně za jednotlivé testery
 */
(function (global) {
  'use strict';

  /* ---------------- ochrana proti nekonečným cyklům ---------------- */
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

  /* ---------------- sestavení stránky ---------------- */
  /* zachytí chyby a výpisy, sleduje časovače a posluchače kliknutí, zabrání odchodu ze stránky */
  const BOOT = `(function () {
  var W = window;
  W.__log = [];
  var push = function (kind, msg, line) { if (W.__log.length < 200) W.__log.push({ kind: kind, msg: String(msg), line: line || 0 }); };
  W.addEventListener('error', function (e) {
    var line = 0;
    if (e.error && e.error.stack) { var m = /script\\.js:(\\d+)/.exec(e.error.stack); if (m) line = +m[1]; }
    if (!line && /script\\.js/.test(e.filename || '')) line = e.lineno;
    push('error', e.message, line);
  });
  W.addEventListener('unhandledrejection', function (e) { push('error', 'Uncaught (in promise) ' + (e.reason && e.reason.message || e.reason)); });
  ['log', 'warn', 'error'].forEach(function (k) {
    var orig = console[k];
    console[k] = function () { push(k, [].map.call(arguments, function (v) { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch (x) { return String(v); } }).join(' ')); try { orig.apply(console, arguments); } catch (x) {} };
  });
  W.__n = 0;
  W.__g = function () { if (++W.__n > 2000000) { W.__n = 0; throw new Error('Cyklus se opakuje pořád dokola – nekonečný cyklus?'); } return true; };
  W.alert = function (m) { push('log', '[alert] ' + m); };
  W.confirm = function () { return true; };
  W.prompt = function () { return ''; };
  W.__timers = {};
  var sI = W.setInterval, cI = W.clearInterval, sT = W.setTimeout, cT = W.clearTimeout;
  W.setInterval = function (fn, ms) { var id = sI.apply(W, arguments); W.__timers['i' + id] = { ms: +ms || 0, repeat: true }; return id; };
  W.clearInterval = function (id) { delete W.__timers['i' + id]; return cI.call(W, id); };
  W.setTimeout = function (fn, ms) {
    var rest = [].slice.call(arguments, 2), id;
    id = sT.call(W, function () { delete W.__timers['t' + id]; if (typeof fn === 'function') fn.apply(W, rest); }, ms);
    W.__timers['t' + id] = { ms: +ms || 0, repeat: false };
    return id;
  };
  W.clearTimeout = function (id) { delete W.__timers['t' + id]; return cT.call(W, id); };
  var aEL = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, o) {
    if (this && this.nodeType === 1) {
      if (/^(click|mousedown|mouseup|pointerdown|pointerup|dblclick)$/.test(type)) this.__click = true;
      if (/^key(down|up|press)$/.test(type)) this.__keys = true;
    }
    return aEL.call(this, type, fn, o);
  };
  W.addEventListener('submit', function (e) { if (!e.defaultPrevented) { e.preventDefault(); push('warn', 'Formulář se odeslal a stránka by se znovu načetla. V obsluze submit zavolej event.preventDefault().'); } });
  W.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented) return;
    var href = a.getAttribute('href') || '';
    e.preventDefault();
    if (href.charAt(0) === '#') {
      var t = href.length > 1 && document.getElementById(decodeURIComponent(href.slice(1)));
      if (t) { if (t.tabIndex < 0 && !t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); try { t.scrollIntoView({ block: 'start' }); } catch (x) {} }
    } else push('log', '[odkaz] ' + href);
  });
  @@MOTION@@
})();`;
  const mmStub = val => `var mm = W.matchMedia.bind(W);
  var fake = function (q, m) { return { matches: m, media: q, onchange: null, addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {}, dispatchEvent: function () { return false; } }; };
  W.matchMedia = function (q) {
    if (/prefers-reduced-motion\\s*:\\s*reduce/.test(q)) return fake(q, ${val});
    if (/prefers-reduced-motion\\s*:\\s*no-preference/.test(q)) return fake(q, ${!val});
    if (/prefers-reduced-motion\\s*\\)/.test(q)) return fake(q, ${val});
    return mm(q);
  };`;

  const ALWAYS = '(min-width: 0px)';
  const NEVER = '(max-width: -1px)';
  /* úpravy CSS pro testovací sestavení */
  function transformCss(css, opts) {
    let out = css || '';
    if (opts.focus) {
      // zaměření z kódu (el.focus()) se pak chová jako zaměření Tabem
      out = out.replace(/:focus-visible/g, ':focus');
      // výchozí rámeček prohlížeče; vrstva @layer má nižší prioritu než jakékoli pravidlo autora (jako styl prohlížeče)
      out = '@layer prohlizec { :focus { outline: auto 1px; } }\n' + out;
    }
    if (opts.motion === 'reduce' || opts.motion === 'normal') {
      const red = opts.motion === 'reduce';
      out = out
        .replace(/\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/g, red ? ALWAYS : NEVER)
        .replace(/\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)/g, red ? NEVER : ALWAYS)
        .replace(/\(\s*prefers-reduced-motion\s*\)/g, red ? ALWAYS : NEVER);
    }
    return out;
  }
  function replaceAssets(html, assets) {
    if (!assets) return html;
    let out = html;
    for (const [nm, url] of Object.entries(assets)) {
      const e = nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const safe = String(url).replace(/"/g, '%22');
      out = out.replace(new RegExp(`(\\ssrc\\s*=\\s*)(["']?)${e}\\2(?=[\\s>/])`, 'g'), () => ` src="${safe}" data-src="${nm}"`);
    }
    return out;
  }
  function build(files, opts) {
    opts = opts || {};
    const css = transformCss(files.css, opts).replace(/<\/style/gi, '<\\/style');
    const js = instrumentLoops(files.js || '').replace(/<\/script/gi, '<\\/script');
    const boot = BOOT.replace('@@MOTION@@', opts.motion === 'reduce' ? mmStub(true) : opts.motion === 'normal' ? mmStub(false) : '');
    let html = replaceAssets(files.html || '', opts.assets);
    // i skripty napsané přímo v HTML dostanou pojistku proti nekonečným cyklům
    html = html.replace(/<script(?![^>]*\bsrc\s*=)([^>]*)>([\s\S]*?)<\/script\s*>/gi, (m, attrs, body) => `<script${attrs}>${instrumentLoops(body)}<\/script>`);
    // odkazy na vlastní soubory nahradíme jejich obsahem
    html = html.replace(/<link\b[^>]*href\s*=\s*["']?style\.css["']?[^>]*>/gi, '')
      .replace(/<script\b[^>]*src\s*=\s*["']?script\.js["']?[^>]*>\s*<\/script\s*>/gi, '');
    const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script>${boot}<\/script><style>${css}</style>`;
    const tail = `<script>${js}\n//# sourceURL=script.js\n<\/script>`;
    if (/<html[\s>]/i.test(html)) {
      if (/<head[^>]*>/i.test(html)) html = html.replace(/<head([^>]*)>/i, `<head$1>${head}`);
      else html = html.replace(/<html([^>]*)>/i, `<html$1><head>${head}</head>`);
      html = /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${tail}</body>`) : html + tail;
      return /^\s*<!doctype/i.test(html) ? html : '<!doctype html>' + html;
    }
    return `<!doctype html><html><head>${head}</head><body>${html}${tail}</body></html>`;
  }
  function load(frame, files, opts) {
    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        frame.onload = null;
        setTimeout(() => resolve({ doc: frame.contentDocument, win: frame.contentWindow }), (opts && opts.settle) || 40);
      };
      frame.onload = finish;
      frame.srcdoc = build(files, opts);
      setTimeout(finish, 3000);
    });
  }

  /* ---------------- strom přístupnosti ---------------- */
  const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const fold = s => norm(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function cs(el) { return el.ownerDocument.defaultView.getComputedStyle(el); }
  function isHidden(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (e.hasAttribute('hidden') || e.getAttribute('aria-hidden') === 'true' || e.hasAttribute('inert')) return true;
      const s = cs(e);
      if (s.display === 'none') return true;
      if (e === el && s.visibility === 'hidden') return true;
      const p = e.parentElement;
      if (p && p.tagName === 'DETAILS' && !p.open && e.tagName !== 'SUMMARY') return true;
    }
    return false;
  }
  /* vidět to není vůbec (na rozdíl od aria-hidden, které skryje prvek jen čtečce) */
  function visuallyGone(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (e.hasAttribute('hidden')) return true;
      const s = cs(e);
      if (s.display === 'none') return true;
      if (e === el && s.visibility === 'hidden') return true;
      const p = e.parentElement;
      if (p && p.tagName === 'DETAILS' && !p.open && e.tagName !== 'SUMMARY') return true;
    }
    return false;
  }
  /* skryté jen očím (třída „sr-only“, posun mimo obrazovku) – čtečka je přečte */
  function visuallyHidden(el) {
    const r = el.getBoundingClientRect();
    const s = cs(el);
    const win = el.ownerDocument.defaultView;
    return (r.width <= 2 && r.height <= 2) || s.clipPath === 'inset(50%)' || /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test(s.clip) || parseFloat(s.opacity) === 0 ||
      r.right <= 0 || r.bottom <= 0 || r.left >= Math.max(win.innerWidth, el.ownerDocument.documentElement.scrollWidth) || r.top < -500;
  }
  const INPUT_ROLE = { button: 'button', submit: 'button', reset: 'button', image: 'button', checkbox: 'checkbox', radio: 'radio', range: 'slider', number: 'spinbutton', search: 'searchbox' };
  function inSection(el) { return !!el.parentElement && !!el.parentElement.closest('article, aside, main, nav, section'); }
  function role(el) {
    const r = (el.getAttribute('role') || '').trim().split(/\s+/)[0];
    if (r) return r === 'presentation' ? 'none' : r;
    const t = el.tagName.toLowerCase();
    switch (t) {
      case 'a': return el.hasAttribute('href') ? 'link' : 'generic';
      case 'button': case 'summary': return 'button';
      case 'input': {
        const ty = (el.getAttribute('type') || 'text').toLowerCase();
        if (ty === 'hidden') return 'none';
        return INPUT_ROLE[ty] || 'textbox';
      }
      case 'textarea': return 'textbox';
      case 'select': return el.multiple || el.size > 1 ? 'listbox' : 'combobox';
      case 'img': return el.getAttribute('alt') === '' ? 'none' : 'img';
      case 'svg': return el.querySelector('title') || el.getAttribute('aria-label') ? 'img' : 'generic';
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return 'heading';
      case 'ul': case 'ol': return 'list';
      case 'li': return 'listitem';
      case 'nav': return 'navigation';
      case 'main': return 'main';
      case 'header': return inSection(el) ? 'generic' : 'banner';
      case 'footer': return inSection(el) ? 'generic' : 'contentinfo';
      case 'aside': return 'complementary';
      case 'section': return el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') ? 'region' : 'generic';
      case 'form': return 'form';
      case 'fieldset': return 'group';
      case 'table': return 'table';
      case 'dialog': return 'dialog';
      case 'output': return 'status';
      case 'p': return 'paragraph';
      default: return 'generic';
    }
  }
  const NAME_FROM_CONTENT = new Set(['button', 'link', 'heading', 'checkbox', 'radio', 'tab', 'menuitem', 'option', 'cell', 'columnheader', 'rowheader', 'switch', 'treeitem', 'tooltip']);
  function textOf(node, depth) {
    if (depth > 30) return '';
    if (node.nodeType === 3) return node.nodeValue;
    if (node.nodeType !== 1) return '';
    const el = node;
    if (isHidden(el)) return '';
    if (el.hasAttribute('aria-label') && norm(el.getAttribute('aria-label'))) return ' ' + el.getAttribute('aria-label') + ' ';
    const t = el.tagName.toLowerCase();
    if (t === 'img') return ' ' + (el.getAttribute('alt') || '') + ' ';
    if (t === 'input' && /^(button|submit|reset)$/i.test(el.type)) return ' ' + (el.value || '') + ' ';
    if (t === 'input' || t === 'select' || t === 'textarea') return '';
    if (t === 'script' || t === 'style' || t === 'template') return '';
    let s = '';
    el.childNodes.forEach(c => { s += textOf(c, depth + 1); });
    return /^(div|p|li|h\d|br|tr|td|th|section|article|title)$/.test(t) ? ' ' + s + ' ' : s;
  }
  /* přístupné jméno – zjednodušený algoritmus accname */
  function name(el) {
    const doc = el.ownerDocument;
    const lb = el.getAttribute('aria-labelledby');
    if (lb) {
      const s = norm(lb.split(/\s+/).map(id => { const x = doc.getElementById(id); return x ? textOf(x, 0) : ''; }).join(' '));
      if (s) return { text: s, from: 'aria-labelledby' };
    }
    const al = el.getAttribute('aria-label');
    if (al && norm(al)) return { text: norm(al), from: 'aria-label' };
    const t = el.tagName.toLowerCase();
    if (t === 'img') { if (el.hasAttribute('alt')) return { text: norm(el.getAttribute('alt')), from: 'alt' }; }
    if (t === 'svg') { const ti = el.querySelector('title'); if (ti && norm(ti.textContent)) return { text: norm(ti.textContent), from: 'title' }; }
    if (t === 'input' || t === 'select' || t === 'textarea') {
      if (t === 'input' && /^(button|submit|reset)$/i.test(el.type)) return { text: norm(el.value || (el.type === 'submit' ? 'Odeslat' : '')), from: 'value' };
      const labels = el.labels ? [...el.labels] : [];
      const s = norm(labels.map(l => textOf(l, 0)).join(' '));
      if (s) return { text: s, from: 'label' };
    }
    if (t === 'fieldset') { const lg = el.querySelector(':scope > legend'); if (lg) return { text: norm(textOf(lg, 0)), from: 'legend' }; }
    if (NAME_FROM_CONTENT.has(role(el))) {
      const s = norm(textOf(el, 0));
      if (s) return { text: s, from: 'content' };
    }
    if (el.hasAttribute('title') && norm(el.getAttribute('title'))) return { text: norm(el.getAttribute('title')), from: 'title' };
    if (el.hasAttribute('placeholder') && norm(el.getAttribute('placeholder'))) return { text: norm(el.getAttribute('placeholder')), from: 'placeholder' };
    return { text: '', from: '' };
  }
  function description(el) {
    const ids = el.getAttribute('aria-describedby');
    if (!ids) return '';
    return norm(ids.split(/\s+/).map(id => { const x = el.ownerDocument.getElementById(id); return x && !x.hasAttribute('hidden') ? textOf(x, 0) : ''; }).join(' '));
  }
  const fileOf = el => { const s = el.getAttribute('data-src') || el.getAttribute('src') || ''; return s.startsWith('data:') ? 'obrázek' : s.split('/').pop(); };
  function pageInfo(doc) {
    return { title: norm(doc.title), lang: (doc.documentElement.getAttribute('lang') || '').trim() };
  }

  /* lineární čtení stránky (jako čtečka, když se šipkou čte řádek po řádku) */
  const LANDMARK = { navigation: 'navigace', main: 'hlavní obsah', banner: 'záhlaví', contentinfo: 'zápatí', complementary: 'doplňkový obsah', search: 'hledání', form: 'formulář', region: 'oblast', dialog: 'dialog' };
  const INLINE = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'label', 'br', 'wbr']);
  const FIELD_ROLES = ['textbox', 'searchbox', 'spinbutton', 'checkbox', 'radio', 'combobox', 'listbox', 'slider', 'switch'];
  function linearize(doc) {
    const out = [];
    let buf = '';
    let bufEl = null;
    const flush = () => { const s = norm(buf); if (s) out.push({ kind: 'text', role: 'text', text: s, name: s, el: bufEl }); buf = ''; bufEl = null; };
    const push = o => { flush(); out.push(o); };
    function controlLine(el, r) {
      const n = name(el);
      const parts = [];
      const nm = n.text && n.from !== 'placeholder' ? n.text : '';
      if (r === 'textbox' || r === 'searchbox' || r === 'spinbutton') {
        parts.push(r === 'searchbox' ? 'pole hledání' : 'editační pole', nm || 'bez popisku');
        if (el.required || el.getAttribute('aria-required') === 'true') parts.push('povinné');
        if (el.getAttribute('aria-invalid') === 'true') parts.push('neplatné');
        parts.push(el.value ? `obsahuje ${el.value}` : 'prázdné');
        if (!nm && el.getAttribute('placeholder')) parts.push(`(jen nápověda v poli: ${el.getAttribute('placeholder')})`);
      } else if (r === 'checkbox' || r === 'switch') {
        parts.push('zaškrtávací políčko', nm || 'bez popisku', (el.checked || el.getAttribute('aria-checked') === 'true') ? 'zaškrtnuto' : 'nezaškrtnuto');
      } else if (r === 'radio') {
        parts.push('přepínač', nm || 'bez popisku', (el.checked || el.getAttribute('aria-checked') === 'true') ? 'vybráno' : 'nevybráno');
        if (el.required) parts.push('povinné');
      } else if (r === 'combobox' || r === 'listbox') {
        const opt = el.options && el.options[el.selectedIndex];
        parts.push('rozbalovací seznam', nm || 'bez popisku', opt ? norm(opt.textContent) : '');
      } else if (r === 'slider') parts.push('posuvník', nm || 'bez popisku', el.value);
      const desc = description(el);
      if (desc) parts.push(desc);
      return { kind: 'field', role: r, text: parts.filter(Boolean).join(', '), name: nm, el, from: n.from, noName: !nm };
    }
    function walk(node) {
      if (node.nodeType === 3) { if (norm(node.nodeValue)) { if (!bufEl) bufEl = node.parentElement; buf += node.nodeValue; } return; }
      if (node.nodeType !== 1) return;
      const el = node;
      const t = el.tagName.toLowerCase();
      if (t === 'script' || t === 'style' || t === 'template' || t === 'noscript' || t === 'head' || t === 'title') return;
      if (isHidden(el)) return;
      const r = role(el);
      if (t === 'br') { buf += ' '; return; }
      if (r === 'alert' || r === 'status' || r === 'log') {
        const s = norm(textOf(el, 0));
        if (s) push({ kind: 'live', role: r, text: `${r === 'alert' ? 'upozornění' : 'oznámení'}: ${s}`, name: s, el });
        return;
      }
      if (LANDMARK[r] && !(r === 'form' && !name(el).text)) {
        const nm = name(el).text;
        push({ kind: 'landmark', role: r, text: `oblast ${LANDMARK[r]}${nm ? `, ${nm}` : ''}`, name: nm, el });
        [...el.childNodes].forEach(walk);
        flush();
        out.push({ kind: 'end', role: r, text: `konec oblasti ${LANDMARK[r]}`, el });
        return;
      }
      if (r === 'heading') {
        const lv = +(el.getAttribute('aria-level') || (/^h(\d)$/.exec(t) || [0, 2])[1]);
        const nm = name(el).text;
        push({ kind: 'heading', role: r, level: lv, text: `nadpis úroveň ${lv}, ${nm || '(prázdný)'}`, name: nm, el });
        return;
      }
      if (r === 'link' || r === 'button') {
        const nm = name(el).text;
        let st = '';
        if (el.hasAttribute('aria-expanded')) st += el.getAttribute('aria-expanded') === 'true' ? ', rozbaleno' : ', sbaleno';
        if (el.hasAttribute('aria-pressed')) st += el.getAttribute('aria-pressed') === 'true' ? ', stisknuto' : ', nestisknuto';
        if (el.disabled || el.getAttribute('aria-disabled') === 'true') st += ', nedostupné';
        push({ kind: r, role: r, text: `${r === 'link' ? 'odkaz' : 'tlačítko'}, ${nm || 'bez popisku'}${st}`, name: nm, el, noName: !nm });
        return;
      }
      if (r === 'img') {
        const n = name(el);
        if (t === 'img' && !el.hasAttribute('alt') && !n.text) push({ kind: 'img', role: r, text: `obrázek bez popisu, ${fileOf(el)}`, name: '', el, noAlt: true });
        else push({ kind: 'img', role: r, text: `obrázek, ${n.text || fileOf(el)}`, name: n.text, el });
        return;
      }
      if (r === 'none' && (t === 'img' || t === 'svg')) return;
      if (FIELD_ROLES.includes(r)) { push(controlLine(el, r)); return; }
      if (r === 'list') {
        const n = [...el.children].filter(c => !isHidden(c) && role(c) === 'listitem').length;
        push({ kind: 'list', role: r, text: `seznam, ${n} ${n === 1 ? 'položka' : n > 1 && n < 5 ? 'položky' : 'položek'}`, el });
        [...el.childNodes].forEach(walk);
        flush();
        return;
      }
      if (r === 'group' && t === 'fieldset') {
        const nm = name(el).text;
        push({ kind: 'group', role: r, text: `skupina${nm ? `, ${nm}` : ''}`, name: nm, el });
        [...el.childNodes].filter(c => !(c.nodeType === 1 && c.tagName === 'LEGEND')).forEach(walk);
        flush();
        return;
      }
      if (t === 'label' && el.control) {
        // popisek přečte samo pole; když pole obaluje, přečteme jen pole
        if (el.contains(el.control)) walk(el.control);
        return;
      }
      const inline = INLINE.has(t) && cs(el).display.startsWith('inline');
      if (!inline) flush();
      [...el.childNodes].forEach(walk);
      if (!inline) flush();
    }
    const info = pageInfo(doc);
    out.push({ kind: 'title', role: 'document', text: `stránka, ${info.title || 'bez názvu'}`, name: info.title });
    if (doc.body) walk(doc.body);
    flush();
    return out;
  }

  /* ---------------- klávesnice ---------------- */
  function focusable(el) {
    if (isHidden(el)) return false;
    if (el.disabled) return false;
    const t = el.tagName.toLowerCase();
    const ti = el.getAttribute('tabindex');
    if (ti !== null && ti.trim() !== '' && !isNaN(+ti)) return +ti >= 0;
    if (t === 'a') return el.hasAttribute('href');
    if (t === 'input') return el.type !== 'hidden';
    if (['button', 'select', 'textarea', 'iframe'].includes(t)) return true;
    if (t === 'summary') return !!el.parentElement && el.parentElement.tagName === 'DETAILS' && el.parentElement.querySelector('summary') === el;
    if (el.isContentEditable) return true;
    return false;
  }
  function tabOrder(doc) {
    const all = [...doc.body.querySelectorAll('*')].filter(focusable);
    const pos = all.filter(e => +(e.getAttribute('tabindex') || 0) > 0).sort((a, b) => +a.getAttribute('tabindex') - +b.getAttribute('tabindex'));
    const zero = all.filter(e => !(+(e.getAttribute('tabindex') || 0) > 0));
    // přepínače se stejným jménem: Tab skočí jen na jeden ze skupiny (na vybraný, jinak na první)
    const list = pos.concat(zero);
    const pick = new Map();
    list.forEach(e => {
      if (e.type !== 'radio' || !e.name) return;
      const key = e.name;
      const cur = pick.get(key);
      if (!cur || (e.checked && !cur.checked)) pick.set(key, e);
    });
    return list.filter(e => !(e.type === 'radio' && e.name) || pick.get(e.name) === e);
  }
  /* kam skočí další Tab, když je zaměřený prvek el (třeba cíl odkazu „Přeskočit na obsah“) */
  function nextTabAfter(doc, el) {
    return tabOrder(doc).find(x => x !== el && (el.compareDocumentPosition(x) & 4)) || null;
  }
  /* prvky, na které jde kliknout myší, ale klávesnicí se k nim nedostaneš */
  function mouseOnly(doc) {
    const out = [];
    doc.body.querySelectorAll('*').forEach(el => {
      if (isHidden(el) || focusable(el)) return;
      const t = el.tagName;
      if (t === 'LABEL' || t === 'OPTION' || t === 'HTML' || t === 'BODY') return;
      const clicky = el.__click || el.hasAttribute('onclick') || (cs(el).cursor === 'pointer' && !(el.parentElement && cs(el.parentElement).cursor === 'pointer'));
      if (!clicky) return;
      let p = el.parentElement;
      while (p && p !== doc.body) { if (focusable(p) || p.tagName === 'LABEL') return; p = p.parentElement; }
      if (out.some(o => o.contains(el))) return;
      out.push(el);
    });
    return out;
  }
  const STYLE_KEYS = ['outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset', 'boxShadow', 'borderTopColor', 'borderTopWidth', 'borderBottomColor', 'borderBottomWidth', 'backgroundColor', 'color', 'textDecorationLine'];
  function snapshot(el) { const s = cs(el); const o = {}; STYLE_KEYS.forEach(k => { o[k] = s[k]; }); return o; }
  function shadowColors(bs) {
    if (!bs || bs === 'none') return [];
    return (bs.match(/rgba?\([^)]*\)/g) || []).map(parse).filter(c => c.a > 0.3);
  }
  /* je zaměření (focus) vidět? porovná vzhled prvku bez zaměření a se zaměřením */
  function focusIndicator(el) {
    const doc = el.ownerDocument;
    if (doc.activeElement && doc.activeElement !== doc.body && doc.activeElement.blur) doc.activeElement.blur();
    const a = snapshot(el);
    el.focus({ preventScroll: true });
    const focused = doc.activeElement === el;
    const b = snapshot(el);
    el.blur();
    const around = bgOf(el.parentElement || el);
    const own = bgOf(el);
    const ow = parseFloat(b.outlineWidth) || 0;
    const res = { ok: false, how: 'none', why: '', ratio: 0, focused };
    if (!focused) { res.why = 'prvek nejde zaměřit'; return res; }
    if (b.outlineStyle === 'auto') return { ok: true, how: 'výchozí rámeček prohlížeče', ratio: 21, focused };
    const cands = [];
    if (b.outlineStyle !== 'none' && ow >= 2) {
      const c = blend(parse(b.outlineColor), around);
      const offset = parseFloat(b.outlineOffset) || 0;
      cands.push({ how: `obrys ${Kit_fmt(ow)} px`, color: c, ratio: offset > 0 ? contrastColors(c, around) : Math.max(contrastColors(c, around), contrastColors(c, own)) });
    }
    if (b.boxShadow !== a.boxShadow && b.boxShadow !== 'none') {
      shadowColors(b.boxShadow).forEach(sc => { const c = blend(sc, around); cands.push({ how: 'stín (box-shadow)', color: c, ratio: contrastColors(c, around) }); });
    }
    const bw = Math.max(parseFloat(b.borderTopWidth) || 0, parseFloat(b.borderBottomWidth) || 0);
    if ((b.borderTopColor !== a.borderTopColor || b.borderBottomColor !== a.borderBottomColor) && bw >= 2) {
      const c = blend(parse(b.borderBottomColor), around);
      cands.push({ how: 'rámeček (border)', color: c, ratio: Math.max(contrastColors(c, around), contrastColors(c, own)) });
    }
    if (b.backgroundColor !== a.backgroundColor) {
      const ca = blend(parse(a.backgroundColor), around);
      const cb = blend(parse(b.backgroundColor), around);
      const r = contrastColors(ca, cb);
      if (r >= 1.5) cands.push({ how: 'změna pozadí', color: cb, ratio: Math.max(r, contrastColors(cb, around)) });
    }
    if (cands.length) {
      const best = cands.reduce((m, c) => (c.ratio > m.ratio ? c : m));
      return { ok: true, how: best.how, ratio: best.ratio, color: hex(best.color), against: hex(around), focused };
    }
    if (b.textDecorationLine !== a.textDecorationLine && /underline/.test(b.textDecorationLine)) return { ok: true, how: 'podtržení', ratio: 3, focused };
    if (b.outlineStyle !== 'none' && ow > 0) { res.how = 'tenký obrys'; res.why = `obrys má jen ${Kit_fmt(ow)} px – je skoro neviditelný`; return res; }
    res.why = 'při zaměření se vzhled vůbec nezmění';
    return res;
  }
  const Kit_fmt = n => String(Math.round(n * 10) / 10).replace('.', ',');
  /* stisk klávesy jako od uživatele: klávesa jde vždy do zaměřeného prvku; nativní prvky reagují samy */
  function press(el, key, opts) {
    const doc = el.ownerDocument;
    const win = doc.defaultView;
    const code = key === ' ' ? 'Space' : key;
    const init = Object.assign({ key, code, bubbles: true, cancelable: true, view: win }, opts || {});
    el.focus({ preventScroll: true });
    const target = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : doc.body;
    const notPrevented = target.dispatchEvent(new win.KeyboardEvent('keydown', init));
    const t = target.tagName.toLowerCase();
    if (notPrevented && target === el) {
      if (key === 'Enter' && ((t === 'a' && target.hasAttribute('href')) || t === 'button' || t === 'summary' || (t === 'input' && /^(button|submit|reset|image)$/i.test(target.type)))) target.click();
      else if (key === 'Enter' && t === 'input' && target.form && !/^(checkbox|radio|button)$/i.test(target.type)) {
        const sb = target.form.querySelector('button:not([type=button]):not([type=reset]), input[type=submit]');
        if (sb) sb.click(); else target.form.dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
      }
    }
    target.dispatchEvent(new win.KeyboardEvent('keyup', init));
    if (notPrevented && target === el && key === ' ' && (t === 'button' || t === 'summary' || (t === 'input' && /^(checkbox|radio|button|submit|reset)$/i.test(target.type)))) target.click();
    return target === el;
  }
  function type(el, text) {
    const win = el.ownerDocument.defaultView;
    el.focus({ preventScroll: true });
    el.value = text;
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
    el.dispatchEvent(new win.Event('change', { bubbles: true }));
  }

  /* ---------------- kontrast (WCAG 2) ---------------- */
  function parse(c) {
    const m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:[ ,/]+([\d.]+%?))?\s*\)/.exec(c || '');
    if (!m) return { r: 0, g: 0, b: 0, a: 0 };
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  const blend = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  function lum(c) {
    const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function contrastColors(a, b) { const l1 = lum(a); const l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
  function bgOf(el) {
    const layers = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const c = parse(cs(e).backgroundColor);
      if (c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) bg = blend(layers[i], bg);
    return bg;
  }
  const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  function fromHex(h) { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(h); return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16), a: 1 } : null; }
  function contrast(el) {
    const s = cs(el);
    const bg = bgOf(el);
    const fg = blend(parse(s.color), bg);
    const size = parseFloat(s.fontSize);
    const bold = parseInt(s.fontWeight, 10) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const ratio = contrastColors(fg, bg);
    const need = large ? 3 : 4.5;
    return { ratio, fg: hex(fg), bg: hex(bg), large, need, ok: ratio >= need - 1e-6, size, bold };
  }
  /* nejbližší barva textu se stejným odstínem, která na daném pozadí splní požadovaný kontrast */
  function suggest(fgHex, bgHex, need) {
    const fg = fromHex(fgHex);
    const bg = fromHex(bgHex);
    if (!fg || !bg) return '';
    const mix = (c, t, k) => ({ r: c.r + (t.r - c.r) * k, g: c.g + (t.g - c.g) * k, b: c.b + (t.b - c.b) * k, a: 1 });
    const black = { r: 0, g: 0, b: 0, a: 1 };
    const white = { r: 255, g: 255, b: 255, a: 1 };
    let best = null;
    [black, white].forEach(target => {
      for (let k = 0; k <= 1.0001; k += 0.02) {
        const c = mix(fg, target, k);
        if (contrastColors(c, bg) >= need + 0.05) { if (!best || k < best.k) best = { k, c }; break; }
      }
    });
    return best ? hex(best.c) : '';
  }
  /* všechny viditelné prvky s vlastním textem */
  function textElements(doc) {
    const out = [];
    doc.body.querySelectorAll('*').forEach(el => {
      if (['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'OPTION', 'TITLE'].includes(el.tagName)) return;
      if (![...el.childNodes].some(n => n.nodeType === 3 && norm(n.nodeValue))) return;
      if (visuallyGone(el) || visuallyHidden(el)) return;
      out.push(el);
    });
    return out;
  }

  /* ---------------- pohyb ---------------- */
  function movingElements(doc) {
    const out = [];
    doc.body.querySelectorAll('*').forEach(el => {
      if (visuallyGone(el)) return;
      const s = cs(el);
      if (s.animationName && s.animationName !== 'none') {
        const durs = s.animationDuration.split(',').map(x => parseFloat(x) * (/ms/.test(x) ? 0.001 : 1));
        const its = s.animationIterationCount.split(',');
        const dur = Math.max(...durs);
        const infinite = its.some(x => /infinite/.test(x) || parseFloat(x) > 3);
        if (dur > 0.05 && infinite && !/paused/.test(s.animationPlayState)) out.push({ el, dur, name: s.animationName.split(',')[0].trim() });
      }
    });
    return out;
  }
  /* aktivní časovače stránky (setInterval a delší setTimeout) */
  function timers(win, minMs) {
    const t = win.__timers || {};
    return Object.values(t).filter(x => x.repeat ? x.ms >= (minMs || 0) : x.ms >= Math.max(1000, minMs || 0));
  }

  /* ---------------- živé oblasti ---------------- */
  function liveRegions(doc) {
    return [...doc.body.querySelectorAll('[role], [aria-live], output')].filter(el => {
      const r = role(el);
      const live = (el.getAttribute('aria-live') || '').toLowerCase();
      return (r === 'alert' || r === 'status' || r === 'log' || live === 'polite' || live === 'assertive') && !isHidden(el);
    }).map(el => ({ el, text: norm(textOf(el, 0)), role: role(el), live: el.getAttribute('aria-live') || '' }));
  }
  function inLive(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const r = role(e);
      const live = (e.getAttribute('aria-live') || '').toLowerCase();
      if (r === 'alert' || r === 'status' || r === 'log' || live === 'polite' || live === 'assertive') return true;
      if (live === 'off') return false;
    }
    return false;
  }

  /* ---------------- chyby JS česky ---------------- */
  function explainJs(msg) {
    let m;
    const s = String(msg || '').replace(/^Uncaught\s+/, '');
    if ((m = /ReferenceError: (\S+) is not defined/.exec(s))) return `Jméno „${m[1]}“ neexistuje. Překlep? Pozor na velká a malá písmena.`;
    if (/Cannot (?:read|set) properties of null/.test(s)) return 'Prvek se nenašel (null). Zkontroluj, jestli selektor v querySelector přesně sedí s id nebo třídou v HTML.';
    if ((m = /Cannot (?:read|set) properties of undefined \((?:reading|setting) '(.+?)'\)/.exec(s))) return `Hodnota je undefined a sahá se do ní pro „${m[1]}“. Překlep v názvu vlastnosti?`;
    if ((m = /TypeError: (.+?) is not a function/.exec(s))) return `„${m[1]}“ není funkce. Překlep v názvu metody (addEventListener, setAttribute…)?`;
    if (/Unexpected end of input/.test(s)) return 'Kód skončil uprostřed, nejspíš chybí zavírací } nebo ).';
    if (/Unexpected token|Unexpected identifier|missing \)|Invalid or unexpected token/.test(s)) return 'Chyba v zápisu kódu. Zkontroluj závorky, čárky a uvozovky kolem řádku s chybou.';
    if (/nekonečný cyklus/.test(s)) return 'Cyklus nikdy neskončí, podmínka while/for zůstává pořád pravdivá.';
    if (/Assignment to constant variable/.test(s)) return 'Do proměnné vytvořené přes const nejde znovu přiřadit, použij let.';
    if (/has already been declared/.test(s)) return 'Proměnná s tímhle jménem už existuje. Vytvoř ji jen jednou.';
    return '';
  }

  /* ---------------- běh kontrol úrovně ---------------- */
  /*
   * level.checks = [{ who, text, mode: 'normal'|'focus'|'motion', run(ctx) → true | 'zpráva' | { say, fix } }]
   * level.scenario(ctxs) – nepovinné: provede akce (stisky, psaní) a výsledky uloží do ctxs.S
   * host – prvek, do kterého se na dobu testu vloží skryté rámy
   */
  function makeCtx(doc, win, files, level, frame, opts) {
    const ctx = {
      doc, win, files, level, frame, S: null,
      $: s => { try { return ctx.doc.querySelector(s); } catch (e) { return null; } },
      $$: s => { try { return [...ctx.doc.querySelectorAll(s)]; } catch (e) { return []; } },
      lines: () => linearize(ctx.doc),
      tab: () => tabOrder(ctx.doc),
      next: el => nextTabAfter(ctx.doc, el),
      mouseOnly: () => mouseOnly(ctx.doc),
      role, name: el => name(el).text, nameInfo: name, describe: description, isHidden, visuallyHidden, focusable, focusIndicator, press, type, contrast, bgOf, hex,
      textElements: () => textElements(ctx.doc), moving: () => movingElements(ctx.doc), timers: ms => timers(ctx.win, ms),
      live: () => liveRegions(ctx.doc), inLive, info: () => pageInfo(ctx.doc),
      norm, fold, log: () => ctx.win.__log || [],
      errors: () => (ctx.win.__log || []).filter(x => x.kind === 'error'),
      async fresh() { const r = await load(frame, files, opts); ctx.doc = r.doc; ctx.win = r.win; return ctx; },
      wait: ms => new Promise(r => setTimeout(r, ms))
    };
    return ctx;
  }
  async function test(level, files, host) {
    const res = { checks: [], passed: 0, total: level.checks.length, allPass: false, bonus: false, errors: [], logs: [], lines: [], tab: [], contrast: [], moving: [], mouseOnly: [], lang: '', title: '' };
    const modes = [...new Set(['normal'].concat(level.checks.map(c => c.mode || 'normal'), level.bonus && level.bonus.mode ? [level.bonus.mode] : []))];
    const prevFocus = document.activeElement;
    const box = document.createElement('div');
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:fixed;left:-12000px;top:0;width:1024px;height:720px;overflow:hidden;pointer-events:none';
    (host || document.body).appendChild(box);
    const ctxs = {};
    try {
      for (const mode of modes) {
        const frame = document.createElement('iframe');
        frame.setAttribute('tabindex', '-1');
        frame.title = 'test';
        frame.style.cssText = 'width:1024px;height:720px;border:0';
        box.appendChild(frame);
        const opts = { assets: level.assets, focus: mode === 'focus', motion: mode === 'motion' ? 'reduce' : 'normal' };
        const { doc, win } = await load(frame, files, opts);
        ctxs[mode] = makeCtx(doc, win, files, level, frame, opts);
      }
      const n = ctxs.normal;
      // vlastnosti stránky hned po načtení (než ji kontroly začnou mačkat)
      const info = pageInfo(n.doc);
      res.lang = info.lang;
      res.title = info.title;
      res.lines = linearize(n.doc).map(l => ({ kind: l.kind, role: l.role, text: l.text, level: l.level, noAlt: !!l.noAlt, noName: !!l.noName, from: l.from || '' }));
      res.contrast = textElements(n.doc).map(el => { const c = contrast(el); return { text: norm(el.textContent).slice(0, 48), ratio: c.ratio, ok: c.ok, need: c.need, fg: c.fg, bg: c.bg, large: c.large, tag: el.tagName.toLowerCase(), cls: el.className && typeof el.className === 'string' ? el.className.split(/\s+/)[0] : '' }; });
      res.mouseOnly = mouseOnly(n.doc).map(el => ({ tag: el.tagName.toLowerCase(), text: norm(el.textContent).slice(0, 40), cls: typeof el.className === 'string' ? el.className.split(/\s+/)[0] : '' }));
      const fdoc = (ctxs.focus || n).doc;
      res.tab = tabOrder(fdoc).map(el => ({ role: role(el), name: name(el).text, tag: el.tagName.toLowerCase(), visible: ctxs.focus ? focusIndicator(el).ok : null }));
      if (ctxs.motion) res.moving = movingElements(ctxs.motion.doc).map(m => ({ name: m.name, tag: m.el.tagName.toLowerCase(), cls: typeof m.el.className === 'string' ? m.el.className.split(/\s+/)[0] : '', dur: m.dur }));
      res.errors = n.errors().map(x => Object.assign({}, x, { czech: explainJs(x.msg) }));
      res.logs = n.log().slice(0, 80);
      if (level.scenario) {
        const S = {};
        Object.values(ctxs).forEach(c => { c.S = S; });
        try { await level.scenario(ctxs, S); } catch (e) { S.crash = e.message; }
      }
      for (const c of level.checks) {
        const ctx = ctxs[c.mode || 'normal'];
        let out;
        try { out = await c.run(ctx, ctxs); } catch (e) { out = { say: 'Na stránce se něco pokazilo a nedostal(a) jsem se dál.', fix: `Kontrola narazila na chybu: ${e.message}` }; }
        const ok = out === true;
        const o = ok ? {} : typeof out === 'object' && out ? out : { fix: String(out || 'Nesplněno.') };
        res.checks.push({ who: c.who, text: c.text, ok, say: o.say || '', fix: o.fix || '' });
      }
      // chyby, které vznikly až při kontrolách (kliknutí, stisky)
      const later = n.errors().map(x => Object.assign({}, x, { czech: explainJs(x.msg) }));
      if (later.length > res.errors.length) res.errors = later;
      res.passed = res.checks.filter(c => c.ok).length;
      res.allPass = res.passed === res.total && !res.errors.length;
      if (res.allPass && level.bonus) {
        try {
          const bctx = ctxs[level.bonus.mode || 'normal'];
          res.bonus = !!(await level.bonus.check(bctx, ctxs));
        } catch (e) { res.bonus = false; }
      }
    } finally {
      box.remove();
      if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
    }
    return res;
  }

  global.A11y = {
    build, load, test, linearize, tabOrder, nextTabAfter, mouseOnly, focusable, focusIndicator, press, type,
    contrast, contrastColors, suggest, parse, hex, fromHex, bgOf, textElements, movingElements, timers, liveRegions, inLive,
    role, name, description, pageInfo, isHidden, visuallyHidden, visuallyGone, explainJs, norm, fold, instrumentLoops
  };
})(typeof window !== 'undefined' ? window : globalThis);
