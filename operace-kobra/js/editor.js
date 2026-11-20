/*
 * Editor kódu se zvýrazněním syntaxe (CSS, HTML, JavaScript, Python)
 * Textarea s průhledným textem nad zvýrazněným <pre>: čísla řádků, zvýraznění řádku s chybou,
 * automatické odsazování podle jazyka, vkládání úryvků z palety.
 */
(function (global) {
  'use strict';

  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const span = (cls, s) => `<span class="tk-${cls}">${esc(s)}</span>`;

  /* ---------------- JavaScript ---------------- */
  const JS_KW = /^(const|let|var|function|return|if|else|for|while|do|break|continue|new|class|this|true|false|null|undefined|typeof|of|in|switch|case|default|try|catch|finally|throw|async|await)$/;
  const JS_GLOBAL = /^(document|window|console|Math|Number|String|Array|JSON|Date|parseInt|parseFloat|alert|localStorage|setTimeout|setInterval|event)$/;
  const JS_RE = /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|(`(?:[^`\\]|\\[\s\S])*`?|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$À-ſ][\w$À-ſ]*)|(\s+)|([\s\S])/g;
  function hlJs(code) {
    let out = '';
    let m;
    let prev = '';
    JS_RE.lastIndex = 0;
    while ((m = JS_RE.exec(code))) {
      const [all, com, str, num, word, ws] = m;
      if (com) out += span('com', com);
      else if (str) out += span('str', str);
      else if (num) out += span('num', num);
      else if (word) {
        const rest = code.slice(JS_RE.lastIndex);
        if (JS_KW.test(word)) out += span('kw', word);
        else if (prev === '.') out += span(/^\s*\(/.test(rest) ? 'fn' : 'prop', word);
        else if (JS_GLOBAL.test(word)) out += span('glob', word);
        else if (/^\s*\(/.test(rest)) out += span('fn', word);
        else out += span('var', word);
      } else if (ws) out += ws;
      else out += /[{}()[\]]/.test(all) ? span('br', all) : /[+\-*/%=<>!&|?:]/.test(all) ? span('op', all) : esc(all);
      if (!ws) prev = all;
    }
    return out;
  }

  /* ---------------- CSS ---------------- */
  function hlCssValue(v) {
    return v.replace(/(!important)|(#[0-9a-fA-F]{3,8}\b)|(-?\d*\.?\d+(?:px|em|rem|%|vh|vw|s|ms|deg|fr|turn)?)|([a-zA-Z-]+(?=\())|([a-zA-Z-]+)|([^\w#!.-]+|[\s\S])/g,
      (all, imp, col, num, fn, word, other) => {
        if (imp) return span('kw', imp);
        if (col) return `<span class="tk-color" style="--sw:${col}">${esc(col)}</span>`;
        if (num) return span('num', num);
        if (fn) return span('fn', fn);
        if (word) return span('val', word);
        return esc(all);
      });
  }
  function hlCss(code) {
    let out = '';
    const stack = []; // 'rules' | 'kf' | 'decls'
    let ctx = 'rules';
    let inValue = false;
    let i = 0;
    let buf = '';
    const flush = () => {
      if (!buf) return;
      if (ctx === 'decls') out += inValue ? hlCssValue(buf) : buf.replace(/([^\s]+)/g, w => span('prop', w));
      else out += buf.replace(/(@[\w-]+)|([^\s,]+)/g, (a, at, sel) => (at ? span('kw', at) : span(ctx === 'kf' ? 'num' : 'sel', sel)));
      buf = '';
    };
    while (i < code.length) {
      const c = code[i];
      if (c === '/' && code[i + 1] === '*') {
        flush();
        const end = code.indexOf('*/', i + 2);
        const j = end < 0 ? code.length : end + 2;
        out += span('com', code.slice(i, j));
        i = j;
        continue;
      }
      if (c === '"' || c === "'") {
        flush();
        let j = i + 1;
        while (j < code.length && code[j] !== c && code[j] !== '\n') j++;
        out += span('str', code.slice(i, j + 1));
        i = j + 1;
        continue;
      }
      if (c === '{') {
        const prelude = buf.trim();
        flush();
        out += span('br', c);
        stack.push(ctx);
        if (ctx === 'kf') ctx = 'decls';
        else if (/^@keyframes/.test(prelude)) ctx = 'kf';
        else if (/^@(media|supports|layer)/.test(prelude)) ctx = 'rules';
        else ctx = 'decls';
        inValue = false;
        i++;
        continue;
      }
      if (c === '}') {
        flush();
        out += span('br', c);
        ctx = stack.length ? stack.pop() : 'rules';
        inValue = false;
        i++;
        continue;
      }
      if (ctx === 'decls' && c === ':' && !inValue) { flush(); out += span('op', c); inValue = true; i++; continue; }
      if (ctx === 'decls' && c === ';') { flush(); out += span('op', c); inValue = false; i++; continue; }
      buf += c;
      i++;
    }
    flush();
    return out;
  }

  /* ---------------- HTML ---------------- */
  function hlTag(tag) {
    // tag = "<name attr=...>" nebo "</name>"
    const m = tag.match(/^(<\/?)([\w-]*)([\s\S]*?)(\/?>)?$/);
    if (!m) return esc(tag);
    const attrs = m[3].replace(/([\w-:@]+)(\s*=\s*)?("[^"]*"?|'[^']*'?|[^\s"'>]+)?/g, (all, name, eq, val) =>
      span('attr', name) + (eq ? span('op', eq) : '') + (val ? span('str', val) : ''));
    return span('tag', m[1] + m[2]) + attrs + (m[4] ? span('tag', m[4]) : '');
  }
  function hlHtml(code) {
    let out = '';
    let i = 0;
    while (i < code.length) {
      if (code.startsWith('<!--', i)) {
        const end = code.indexOf('-->', i + 4);
        const j = end < 0 ? code.length : end + 3;
        out += span('com', code.slice(i, j));
        i = j;
        continue;
      }
      if (code[i] === '<' && /[a-zA-Z!/]/.test(code[i + 1] || '')) {
        let j = i + 1;
        let q = null;
        while (j < code.length) {
          const ch = code[j];
          if (q) { if (ch === q) q = null; } else if (ch === '"' || ch === "'") q = ch; else if (ch === '>') break;
          j++;
        }
        const tag = code.slice(i, Math.min(j + 1, code.length));
        out += code[i + 1] === '!' ? span('kw', tag) : hlTag(tag);
        i = j + 1;
        const nm = (tag.match(/^<([a-zA-Z]+)/) || [])[1];
        if (nm && /^(script|style)$/i.test(nm) && !/\/>$/.test(tag)) {
          const close = code.toLowerCase().indexOf('</' + nm.toLowerCase(), i);
          const end = close < 0 ? code.length : close;
          const inner = code.slice(i, end);
          out += nm.toLowerCase() === 'script' ? hlJs(inner) : hlCss(inner);
          i = end;
        }
        continue;
      }
      let j = code.indexOf('<', i + 1);
      if (j < 0) j = code.length;
      out += span('text', code.slice(i, j));
      i = j;
    }
    return out;
  }

  /* ---------------- Python ---------------- */
  const PY_KW = /^(def|return|if|elif|else|for|while|in|not|and|or|is|import|from|as|break|continue|pass|lambda|class|try|except|finally|raise|with|global|nonlocal|yield|del|assert)$/;
  const PY_CONST = /^(True|False|None)$/;
  const PY_BUILTIN = /^(print|len|range|int|float|str|list|dict|tuple|set|bool|sorted|sum|min|max|abs|round|enumerate|zip|ord|chr|input|isinstance|reversed|any|all|map|filter|type)$/;
  const PY_RE = /(#[^\n]*)|([fFrRbB]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?))|(\b\d+(?:\.\d+)?\b)|([A-Za-z_À-ſ][\wÀ-ſ]*)|(\s+)|([\s\S])/g;
  function hlPython(code) {
    let out = '';
    let m;
    let prevWord = '';
    PY_RE.lastIndex = 0;
    while ((m = PY_RE.exec(code))) {
      const [all, com, str, num, word, ws] = m;
      if (com) out += span('com', com);
      else if (str) out += span('str', str);
      else if (num) out += span('num', num);
      else if (word) {
        const rest = code.slice(PY_RE.lastIndex);
        if (PY_KW.test(word)) out += span('kw', word);
        else if (PY_CONST.test(word)) out += span('const', word);
        else if (prevWord === 'def') out += span('def', word);
        else if (PY_BUILTIN.test(word) && /^\s*\(/.test(rest)) out += span('builtin', word);
        else if (/^\s*\(/.test(rest)) out += span('fn', word);
        else out += span('var', word);
      } else if (ws) out += ws;
      else out += /[{}()[\]]/.test(all) ? span('br', all) : /[+\-*/%=<>!&|:]/.test(all) ? span('op', all) : esc(all);
      if (word) prevWord = word; else if (!ws) prevWord = '';
    }
    return out;
  }

  const HL = { js: hlJs, css: hlCss, html: hlHtml, python: hlPython };
  const highlight = (code, lang) => (HL[lang] || (s => esc(s)))(code);

  const VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i;

  class CodeEditor {
    constructor(root, opts) {
      this.opts = Object.assign({ lang: 'js', tab: 2 }, opts || {});
      root.classList.add('editor');
      root.innerHTML = `
        <div class="ed-scroll">
          <div class="ed-inner">
            <div class="ed-gutter" aria-hidden="true"></div>
            <div class="ed-area">
              <div class="ed-mark run" hidden></div>
              <div class="ed-mark err" hidden></div>
              <pre class="ed-hl" aria-hidden="true"></pre>
              <textarea class="ed-ta" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="${this.opts.label || 'Editor kódu'}"></textarea>
            </div>
          </div>
        </div>`;
      this.root = root;
      this.scroll = root.querySelector('.ed-scroll');
      this.gutter = root.querySelector('.ed-gutter');
      this.hl = root.querySelector('.ed-hl');
      this.ta = root.querySelector('.ed-ta');
      this.runMark = root.querySelector('.ed-mark.run');
      this.errMark = root.querySelector('.ed-mark.err');
      this.runLine = 0;
      this.errLine = 0;
      this.listeners = [];
      this.ta.addEventListener('input', () => { this.refresh(); this.listeners.forEach(f => f(this.value)); });
      this.ta.addEventListener('keydown', e => this.onKey(e));
      global.addEventListener('resize', () => this.refresh());
      /* když editor vyplňuje volné místo v panelu, při změně jeho velikosti se přepočítá */
      if (global.ResizeObserver) {
        let raf = 0;
        let lastH = 0;
        this.ro = new ResizeObserver(() => {
          const h = this.scroll.clientHeight;
          if (h === lastH) return;
          lastH = h;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => this.refresh());
        });
        this.ro.observe(this.scroll);
      }
    }

    get value() { return this.ta.value; }
    set value(v) { this.ta.value = v; this.clearMarks(); this.refresh(); }
    setLang(lang) { this.opts.lang = lang; this.refresh(); }
    onChange(f) { this.listeners.push(f); }
    focus() { this.ta.focus(); }
    setReadOnly(ro) { this.ta.readOnly = !!ro; this.root.classList.toggle('readonly', !!ro); }

    metrics() {
      const cs = getComputedStyle(this.ta);
      const lh = parseFloat(cs.lineHeight) || 22;
      const pad = parseFloat(cs.paddingTop) || 10;
      const key = cs.font;
      if (!this.charW || this.charKey !== key) {
        const probe = document.createElement('span');
        probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font}`;
        probe.textContent = 'M'.repeat(50);
        document.body.appendChild(probe);
        this.charW = probe.getBoundingClientRect().width / 50 || 8.4;
        this.charKey = key;
        probe.remove();
      }
      return { lh, pad };
    }

    refresh() {
      const v = this.ta.value;
      this.hl.innerHTML = highlight(v, this.opts.lang) + '\n';
      const lines = v.split('\n');
      const { lh, pad } = this.metrics();
      let g = '';
      for (let i = 1; i <= lines.length; i++) g += `<div${i === this.errLine ? ' class="err"' : i === this.runLine ? ' class="run"' : ''}>${i}</div>`;
      this.gutter.innerHTML = g;
      const longest = Math.max(...lines.map(l => l.length));
      const w = Math.max(this.scroll.clientWidth - this.gutter.offsetWidth - 2, longest * this.charW + pad * 2 + 24);
      /* textové pole sahá až ke spodnímu okraji editoru, aby šlo kliknout kamkoli pod kód */
      const contentH = lines.length * lh + pad * 2;
      this.ta.style.height = contentH + 'px';
      const boxH = this.scroll.clientHeight;
      if (boxH > contentH) this.ta.style.height = boxH + 'px';
      this.ta.style.width = w + 'px';
      this.hl.style.width = w + 'px';
      this.placeMark(this.runMark, this.runLine);
      this.placeMark(this.errMark, this.errLine);
    }
    placeMark(el, line) {
      if (!line) { el.hidden = true; return; }
      const { lh, pad } = this.metrics();
      el.hidden = false;
      el.style.top = (pad + (line - 1) * lh) + 'px';
      el.style.height = lh + 'px';
    }
    refreshGutter() {
      [...this.gutter.children].forEach((d, i) => { d.className = i + 1 === this.errLine ? 'err' : i + 1 === this.runLine ? 'run' : ''; });
    }
    markRun(line) { if (line === this.runLine) return; this.runLine = line || 0; this.refreshGutter(); this.placeMark(this.runMark, this.runLine); if (line) this.scrollToLine(line); }
    markError(line) { this.errLine = line || 0; this.refreshGutter(); this.placeMark(this.errMark, this.errLine); if (line) this.scrollToLine(line); }
    clearMarks() { this.runLine = 0; this.errLine = 0; this.refreshGutter(); this.placeMark(this.runMark, 0); this.placeMark(this.errMark, 0); }
    scrollToLine(line) {
      const { lh, pad } = this.metrics();
      const y = pad + (line - 1) * lh;
      const s = this.scroll;
      if (y < s.scrollTop + lh || y > s.scrollTop + s.clientHeight - lh * 2) s.scrollTop = Math.max(0, y - s.clientHeight / 3);
    }
    goToLine(line) {
      const lines = this.ta.value.split('\n');
      let pos = 0;
      for (let i = 0; i < line - 1 && i < lines.length; i++) pos += lines[i].length + 1;
      this.ta.focus();
      this.ta.setSelectionRange(pos, pos + (lines[line - 1] || '').length);
      this.scrollToLine(line);
    }

    insertText(text) {
      this.ta.focus();
      let ok = false;
      try { ok = document.execCommand('insertText', false, text); } catch (e) { ok = false; }
      if (!ok) {
        this.ta.setRangeText(text, this.ta.selectionStart, this.ta.selectionEnd, 'end');
        this.ta.dispatchEvent(new Event('input'));
      }
    }
    lineInfo() {
      const v = this.ta.value;
      const pos = this.ta.selectionStart;
      const start = v.lastIndexOf('\n', pos - 1) + 1;
      let end = v.indexOf('\n', pos);
      if (end < 0) end = v.length;
      const line = v.slice(start, end);
      const indent = (line.match(/^[ \t]*/) || [''])[0];
      return { v, pos, start, end, line, indent, before: v.slice(start, pos), after: v.slice(pos, end) };
    }

    /* úryvek z palety; „|“ = kam se postaví kurzor */
    insertSnippet(code, inline) {
      if (this.ta.readOnly) return;
      this.ta.focus();
      if (inline) {
        const caret = code.indexOf('|');
        const start = this.ta.selectionStart;
        this.insertText(code.replace('|', ''));
        if (caret >= 0) this.ta.setSelectionRange(start + caret, start + caret);
        return;
      }
      const info = this.lineInfo();
      const indent = info.indent;
      let text = code.split('\n').map((l, i) => (i === 0 ? l : indent + l)).join('\n');
      if (info.line.trim() !== '') {
        this.ta.setSelectionRange(info.end, info.end);
        text = '\n' + indent + text;
      } else {
        this.ta.setSelectionRange(info.start + indent.length, info.end);
      }
      const caret = text.indexOf('|');
      const startPos = this.ta.selectionStart;
      this.insertText(text.replace('|', ''));
      if (caret >= 0) this.ta.setSelectionRange(startPos + caret, startPos + caret);
      this.refresh();
    }

    opensBlock(before) {
      const lang = this.opts.lang;
      const t = before.replace(/\s+$/, '');
      if (lang === 'python') return /:$/.test(t.replace(/#.*$/, '').trim());
      if (lang === 'html') {
        const m = t.match(/<([a-zA-Z][\w-]*)(?:\s[^<>]*)?>$/);
        if (m && !VOID.test(m[1]) && !/\/>$/.test(t)) return true;
        return /[{([]$/.test(t) && /<script|<style/i.test(this.ta.value);
      }
      return /[{([]$/.test(t);
    }

    onKey(e) {
      const ta = this.ta;
      const unit = ' '.repeat(this.opts.tab);
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (this.opts.onRun) this.opts.onRun(); return; }
      if (ta.readOnly) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
        if (s !== en && v.slice(s, en).includes('\n')) {
          const ls = v.lastIndexOf('\n', s - 1) + 1;
          const block = v.slice(ls, en);
          const re = new RegExp('^ {1,' + this.opts.tab + '}', 'gm');
          const changed = e.shiftKey ? block.replace(re, '') : block.replace(/^/gm, unit);
          ta.setSelectionRange(ls, en);
          this.insertText(changed);
          ta.setSelectionRange(ls, ls + changed.length);
        } else if (e.shiftKey) {
          const info = this.lineInfo();
          const rm = info.line.match(new RegExp('^ {1,' + this.opts.tab + '}'));
          if (rm) { ta.setSelectionRange(info.start, info.start + rm[0].length); this.insertText(''); }
        } else this.insertText(unit);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const info = this.lineInfo();
        const opens = this.opensBlock(info.before);
        const lang = this.opts.lang;
        const closesNext = lang === 'html' ? /^\s*<\//.test(info.after) : /^\s*[}\])]/.test(info.after);
        let indent = info.indent;
        if (lang === 'python' && /^\s*(return\b|pass\b|break\b|continue\b|raise\b)/.test(info.line) && !opens) indent = indent.slice(0, Math.max(0, indent.length - this.opts.tab));
        if (opens && closesNext && lang !== 'python') {
          const inner = '\n' + indent + unit;
          this.insertText(inner + '\n' + indent);
          const p = info.pos + inner.length;
          ta.setSelectionRange(p, p);
        } else {
          this.insertText('\n' + indent + (opens ? unit : ''));
        }
        return;
      }
      if (e.key === '}' && this.opts.lang !== 'python') {
        const info = this.lineInfo();
        if (/^\s+$/.test(info.before) && info.before.length >= this.opts.tab) {
          e.preventDefault();
          ta.setSelectionRange(info.pos - this.opts.tab, info.pos);
          this.insertText('}');
        }
      }
    }
  }

  global.CodeEditor = CodeEditor;
  global.Highlight = highlight;
})(typeof window !== 'undefined' ? window : globalThis);
