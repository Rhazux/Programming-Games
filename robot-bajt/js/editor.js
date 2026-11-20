/*
 * Robot Bajt – editor kódu
 * Textarea s průhledným textem nad zvýrazněným <pre>: barevná syntaxe, čísla řádků,
 * zvýraznění právě prováděného řádku a řádku s chybou, automatické odsazování.
 */
(function (global) {
  'use strict';

  const { BUILTINS } = global.BajtLang;
  const KW = /^(let|const|var|if|else|while|for|function|return|break|continue|true|false|null|undefined)$/;
  const TOKEN_RE = /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$À-ſ][\w$À-ſ]*)|(\s+)|([\s\S])/g;

  function esc(s) {
    return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }

  function highlight(code) {
    let out = '';
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(code))) {
      const [all, comment, str, num, word, ws] = m;
      if (comment) out += `<span class="tk-com">${esc(comment)}</span>`;
      else if (str) out += `<span class="tk-str">${esc(str)}</span>`;
      else if (num) out += `<span class="tk-num">${num}</span>`;
      else if (word) {
        if (KW.test(word)) out += `<span class="tk-kw">${word}</span>`;
        else if (BUILTINS[word]) out += `<span class="${BUILTINS[word].kind === 'sensor' ? 'tk-sen' : 'tk-cmd'}">${word}</span>`;
        else {
          const rest = code.slice(TOKEN_RE.lastIndex);
          out += /^\s*\(/.test(rest) ? `<span class="tk-fn">${esc(word)}</span>` : `<span class="tk-var">${esc(word)}</span>`;
        }
      } else if (ws) out += ws;
      else out += /[{}()]/.test(all) ? `<span class="tk-br">${esc(all)}</span>` : /[+\-*/%=<>!&|]/.test(all) ? `<span class="tk-op">${esc(all)}</span>` : esc(all);
    }
    return out + '\n';
  }

  class CodeEditor {
    constructor(root, opts) {
      this.opts = opts || {};
      root.classList.add('editor');
      root.innerHTML = `
        <div class="ed-scroll">
          <div class="ed-inner">
            <div class="ed-gutter" aria-hidden="true"></div>
            <div class="ed-area">
              <div class="ed-mark run" hidden></div>
              <div class="ed-mark err" hidden></div>
              <pre class="ed-hl" aria-hidden="true"></pre>
              <textarea class="ed-ta" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Kód programu pro robota"></textarea>
            </div>
          </div>
        </div>`;
      this.root = root;
      this.scroll = root.querySelector('.ed-scroll');
      this.area = root.querySelector('.ed-area');
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
      window.addEventListener('resize', () => this.refresh());
      /* když editor vyplňuje volné místo v panelu, při změně jeho velikosti se přepočítá */
      if (window.ResizeObserver) {
        let raf = 0;
        let lastH = 0;
        new ResizeObserver(() => {
          const hh = this.scroll.clientHeight;
          if (hh === lastH) return;
          lastH = hh;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => this.refresh());
        }).observe(this.scroll);
      }
    }

    get value() { return this.ta.value; }
    set value(v) {
      this.ta.value = v;
      this.clearMarks();
      this.refresh();
    }
    onChange(f) { this.listeners.push(f); }
    focus() { this.ta.focus(); }
    setReadOnly(ro) { this.ta.readOnly = !!ro; this.root.classList.toggle('readonly', !!ro); }

    metrics() {
      const cs = getComputedStyle(this.ta);
      const lh = parseFloat(cs.lineHeight) || 22;
      const pad = parseFloat(cs.paddingTop) || 10;
      if (!this.charW) {
        const probe = document.createElement('span');
        probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font}`;
        probe.textContent = 'M'.repeat(50);
        document.body.appendChild(probe);
        this.charW = probe.getBoundingClientRect().width / 50 || 8.4;
        probe.remove();
      }
      return { lh, pad };
    }

    refresh() {
      const v = this.ta.value;
      this.hl.innerHTML = highlight(v);
      const lines = v.split('\n');
      const { lh, pad } = this.metrics();
      let g = '';
      for (let i = 1; i <= lines.length; i++) {
        const cls = i === this.errLine ? ' class="err"' : i === this.runLine ? ' class="run"' : '';
        g += `<div${cls}>${i}</div>`;
      }
      this.gutter.innerHTML = g;
      const longest = Math.max(...lines.map(l => l.length));
      const h = lines.length * lh + pad * 2;
      const w = Math.max(this.scroll.clientWidth - this.gutter.offsetWidth - 2, longest * this.charW + pad * 2 + 24);
      /* textové pole sahá až ke spodnímu okraji editoru, aby šlo kliknout kamkoli pod kód */
      this.ta.style.height = h + 'px';
      const boxH = this.scroll.clientHeight;
      if (boxH > h) this.ta.style.height = boxH + 'px';
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

    markRun(line) {
      if (line === this.runLine) return;
      this.runLine = line || 0;
      this.refreshGutter();
      this.placeMark(this.runMark, this.runLine);
      if (line) this.scrollToLine(line);
    }
    markError(line) {
      this.errLine = line || 0;
      this.refreshGutter();
      this.placeMark(this.errMark, this.errLine);
      if (line) this.scrollToLine(line);
    }
    clearMarks() { this.runLine = 0; this.errLine = 0; this.refreshGutter(); this.placeMark(this.runMark, 0); this.placeMark(this.errMark, 0); }
    refreshGutter() {
      [...this.gutter.children].forEach((d, i) => { d.className = i + 1 === this.errLine ? 'err' : i + 1 === this.runLine ? 'run' : ''; });
    }
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

    /* vložení textu se zachováním historie Ctrl+Z */
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
      const indent = (line.match(/^\s*/) || [''])[0];
      return { v, pos, start, end, line, indent, before: v.slice(start, pos), after: v.slice(pos, end) };
    }

    /* vložení úryvku z palety; „|“ označuje, kam se postaví kurzor */
    insertSnippet(snip) {
      if (this.ta.readOnly) return;
      this.ta.focus();
      if (snip.inline) { this.insertText(snip.code); return; }
      const info = this.lineInfo();
      const indent = info.indent;
      let text = snip.code.split('\n').map((l, i) => (i === 0 ? l : indent + l)).join('\n');
      if (info.line.trim() !== '') {
        // vložit na nový řádek pod aktuální
        this.ta.setSelectionRange(info.end, info.end);
        text = '\n' + indent + text;
      } else {
        this.ta.setSelectionRange(info.start + indent.length, info.end);
      }
      const caret = text.indexOf('|');
      const clean = text.replace('|', '');
      const startPos = this.ta.selectionStart;
      this.insertText(clean);
      if (caret >= 0) this.ta.setSelectionRange(startPos + caret, startPos + caret);
      this.refresh();
    }

    onKey(e) {
      const ta = this.ta;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (this.opts.onRun) this.opts.onRun();
        return;
      }
      if (ta.readOnly) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        const v = ta.value;
        if (s !== en && v.slice(s, en).includes('\n')) {
          const ls = v.lastIndexOf('\n', s - 1) + 1;
          const block = v.slice(ls, en);
          const changed = e.shiftKey ? block.replace(/^ {1,2}/gm, '') : block.replace(/^/gm, '  ');
          ta.setSelectionRange(ls, en);
          this.insertText(changed);
          ta.setSelectionRange(ls, ls + changed.length);
        } else if (e.shiftKey) {
          const info = this.lineInfo();
          const rm = info.line.match(/^ {1,2}/);
          if (rm) {
            ta.setSelectionRange(info.start, info.start + rm[0].length);
            this.insertText('');
          }
        } else {
          this.insertText('  ');
        }
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const info = this.lineInfo();
        const opens = /\{\s*$/.test(info.before);
        const closesNext = /^\s*\}/.test(info.after);
        if (opens && closesNext) {
          const inner = '\n' + info.indent + '  ';
          this.insertText(inner + '\n' + info.indent);
          const p = info.pos + inner.length;
          ta.setSelectionRange(p, p);
        } else {
          this.insertText('\n' + info.indent + (opens ? '  ' : ''));
        }
        return;
      }
      if (e.key === '}') {
        const info = this.lineInfo();
        if (/^\s+$/.test(info.before) && info.before.length >= 2) {
          e.preventDefault();
          ta.setSelectionRange(info.pos - 2, info.pos);
          this.insertText('}');
        }
      }
    }
  }

  global.BajtEditor = { CodeEditor, highlight };
})(typeof window !== 'undefined' ? window : globalThis);
