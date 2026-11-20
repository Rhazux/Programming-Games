/*
 * Lekce – výklad nové techniky s živým příkladem (společné pro všechny hry)
 *
 *   Lesson.html(les, o)        HTML lekce: výklad, upravitelný příklad, výsledek, „Zkus si“, „Pozor“
 *   Lesson.mount(root, les, o) oživí příklad v lekci (editor + náhled / výstup / časová osa)
 *   Lesson.steps(list, o)      HTML průvodce úrovní po krocích (např. Příběh → Lekce → Úkol)
 *   Lesson.wire(root, list, o) přepínání kroků, tlačítka Dál / Zpět
 *   Lesson.stars(rows)         přehled, za co jsou hvězdy
 *
 * Druhy příkladů (les.kind):
 *   css    – CSS se hned vykreslí v náhledu (HTML příkladu je v les.html)
 *   web    – celé HTML i se <script>, náhled je živá stránka, dá se na ni klikat
 *   python – Mini-Python hry, po spuštění ukáže výstup programu
 *   async  – JavaScript s await, ukáže, co se kdy stalo (virtuální minuty)
 *   bajt   – program robota; spouští ho hra (o.run)
 */
(function (global) {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const md = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const RM = () => !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const fmt = n => String(Math.round(n * 10) / 10).replace('.', ',');

  const OUT = {
    css: '👀 Výsledek se kreslí hned',
    web: '👀 Živá stránka, můžeš klikat',
    python: '🖥️ Výstup programu',
    async: '⏱️ Co se stalo a kdy',
    bajt: '🤖 Co udělá robot'
  };
  const RUNNABLE = { python: 1, async: 1, bajt: 1 };
  const LANG = { css: 'css', web: 'html', python: 'python', async: 'js', bajt: 'js' };

  /* ---------- HTML lekce ---------- */
  function html(les, o) {
    o = o || {};
    const kind = les.kind || o.kind || 'css';
    const texts = [].concat(les.text || []);
    return `<section class="lesson" data-kind="${kind}">
      <header class="ls-head">
        <p class="ls-kicker"><span aria-hidden="true">📖</span> ${esc(o.kicker || 'Lekce: nová technika')}</p>
        <h3 class="ls-title">${md(les.title || o.title || '')}</h3>
      </header>
      <div class="ls-text">${texts.map(t => `<p>${md(t)}</p>`).join('')}</div>
      <div class="ls-lab">
        <div class="ls-pane ls-code">
          <div class="ls-bar"><span class="ls-cap">✏️ Příklad${les.file ? ` <code>${esc(les.file)}</code>` : ''}<small>můžeš ho upravit</small></span><button type="button" class="btn small ghost ls-btn" data-ls-reset title="Vrátit příklad do původní podoby">↺ Původní</button></div>
          <div class="ls-editor"></div>
          ${les.html && kind === 'css' ? `<p class="ls-html"><span>HTML příkladu:</span> <code>${esc(les.html.replace(/\s*\n\s*/g, ' ').trim())}</code></p>` : ''}
        </div>
        <div class="ls-pane ls-out">
          <div class="ls-bar"><span class="ls-cap">${esc(les.outLabel || OUT[kind] || '👀 Výsledek')}</span>${RUNNABLE[kind] ? '<button type="button" class="btn small primary ls-btn" data-ls-run>▶ Spustit příklad</button>' : ''}</div>
          <div class="ls-result" ${kind === 'css' || kind === 'web' ? '' : 'aria-live="polite"'}></div>
        </div>
      </div>
      <div class="ls-notes">
        ${les.try ? `<p class="ls-note ls-try"><span class="ls-ico" aria-hidden="true">🧪</span><span><b>Zkus si:</b> ${md(les.try)}</span></p>` : ''}
        ${les.pitfall ? `<p class="ls-note ls-pit"><span class="ls-ico" aria-hidden="true">⚠️</span><span><b>Pozor:</b> ${md(les.pitfall)}</span></p>` : ''}
        ${les.fact ? `<p class="ls-note ls-fact"><span class="ls-ico" aria-hidden="true">💡</span><span><b>Zajímavost:</b> ${md(les.fact)}</span></p>` : ''}
      </div>
    </section>`;
  }

  /* ---------- běh příkladů ---------- */
  function frame(out, sandbox, title) {
    let f = out.querySelector('iframe.ls-frame');
    if (!f) {
      out.innerHTML = '';
      f = document.createElement('iframe');
      f.className = 'ls-frame';
      f.setAttribute('sandbox', sandbox);
      f.setAttribute('title', title || 'Náhled příkladu');
      out.appendChild(f);
    }
    return f;
  }
  const page = (head, body, lang) => `<!doctype html><html lang="${lang || 'cs'}"><head><meta charset="utf-8">${head}</head><body>${body}</body></html>`;
  const CSS_BASE = 'html,body{margin:0;height:100%}body{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;align-content:center;gap:18px;padding:14px;box-sizing:border-box;font:15px/1.4 system-ui,"Segoe UI",sans-serif;color:#1b1b1f;background:BG}';
  const WEB_BASE = 'body{margin:0;padding:14px;font:15px/1.5 system-ui,"Segoe UI",sans-serif;color:#1b1b1f;background:#fff}';

  const RUN = {
    css(code, out, les, o) {
      const f = frame(out, '', 'Náhled příkladu z lekce');
      f.srcdoc = page(`<style>${CSS_BASE.replace('BG', les.bg || o.bg || '#f3f1ec')}${les.base || ''}\n${code}</style>`, les.html || '');
    },
    web(code, out, les) {
      const f = frame(out, 'allow-scripts', 'Živá stránka z příkladu');
      f.srcdoc = page(`<style>${WEB_BASE}${les.base || ''}</style>`, code);
    },
    python(code, out, les) {
      const P = global.MiniPython;
      if (!P) { out.innerHTML = '<p class="ls-err">Python se nenačetl.</p>'; return; }
      const rt = new P.Runtime({ maxSteps: 400000 });
      if (les.prelude) { rt.exec(les.prelude); rt.takeOutput(); }
      const r = rt.exec(code);
      const text = rt.takeOutput();
      let h = text ? esc(text.replace(/\n$/, '')) : '<span class="ls-dim">(program nic nevypsal – výpis dělá print)</span>';
      if (!r.ok) {
        const e = r.error;
        h += `${text ? '\n' : ''}<span class="ls-err">✘ ${esc(e.text)}${e.line ? ` (řádek ${e.line})` : ''}${e.czech ? `\n  ${esc(e.czech.replace(/`/g, ''))}` : ''}</span>`;
      }
      out.innerHTML = `<pre class="ls-console">${h}</pre>`;
      out.classList.remove('ls-flash'); void out.offsetWidth; out.classList.add('ls-flash');
    },
    async(code, out, les) {
      /* kód běží v izolovaném rámu; čas je virtuální (minuty), rám posílá záznamy zpět */
      if (out._lsCleanup) out._lsCleanup();
      out.innerHTML = '<div class="ls-clock" aria-hidden="true"><span class="ls-dial">⏱️</span> <b class="ls-now">0</b> min</div><ol class="ls-timeline"></ol>';
      const list = out.querySelector('.ls-timeline');
      const now = out.querySelector('.ls-now');
      const f = document.createElement('iframe');
      f.setAttribute('sandbox', 'allow-scripts');
      f.className = 'ls-hidden-frame';
      f.setAttribute('aria-hidden', 'true');
      f.tabIndex = -1;
      const rows = [];
      let done = false;
      let timer = 0;
      const STEP = RM() ? 0 : 140; /* ms na virtuální minutu při přehrávání */
      const show = () => {
        /* přehraje záznamy podle virtuálního času */
        let i = 0;
        let shownT = 0;
        const next = () => {
          if (i >= rows.length) { if (done) list.insertAdjacentHTML('beforeend', `<li class="ls-end"><span class="t">${fmt(shownT)} min</span><span>🏁 Hotovo, celkem ${fmt(shownT)} min</span></li>`); return; }
          const r = rows[i++];
          const wait = Math.max(0, (r.t - shownT) * STEP);
          timer = setTimeout(() => {
            shownT = r.t;
            now.textContent = fmt(r.t);
            list.insertAdjacentHTML('beforeend', `<li class="${r.err ? 'ls-err' : ''}"><span class="t">${fmt(r.t)} min</span><span>${esc(r.msg)}</span></li>`);
            list.scrollTop = list.scrollHeight;
            next();
          }, wait);
        };
        next();
      };
      const onMsg = e => {
        if (e.source !== f.contentWindow || !e.data || e.data.ls !== 1) return;
        if (e.data.type === 'log') rows.push({ t: e.data.t, msg: e.data.msg });
        if (e.data.type === 'error') rows.push({ t: e.data.t, msg: '✘ ' + e.data.msg, err: true });
        if (e.data.type === 'done') { done = !rows.some(r => r.err); cleanup(false); show(); }
      };
      const cleanup = all => {
        global.removeEventListener('message', onMsg);
        if (f.parentNode) f.remove();
        if (all) clearTimeout(timer);
      };
      out._lsCleanup = () => cleanup(true);
      global.addEventListener('message', onMsg);
      const prelude = `
        const __post = (type, extra) => parent.postMessage(Object.assign({ ls: 1, type, t: __now }, extra), '*');
        let __now = 0, __seq = 0, __timers = [];
        const cekej = min => new Promise(res => __timers.push({ t: __now + Math.max(0, +min || 0), res, s: __seq++ }));
        const fmtArg = a => typeof a === 'string' ? a : JSON.stringify(a);
        const console = { log: (...a) => __post('log', { msg: a.map(fmtArg).join(' ') }) };
        const log = console.log;
        ${les.prelude || ''}
        window.onerror = (m, s, l) => { __post('error', { msg: String(m).replace(/^Uncaught /, '') }); __post('done'); };
        window.addEventListener('unhandledrejection', e => { __post('error', { msg: String(e.reason && e.reason.message || e.reason) }); });
        const __tick = () => new Promise(r => setTimeout(r, 0));
        async function __drive(main) {
          let p;
          try { p = main(); } catch (e) { __post('error', { msg: String(e.message || e) }); }
          if (p && p.catch) p.catch(e => __post('error', { msg: String(e.message || e) }));
          await __tick();
          let guard = 0;
          while (__timers.length && guard++ < 2000) {
            __timers.sort((a, b) => a.t - b.t || a.s - b.s);
            const t = __timers[0].t;
            const due = __timers.filter(x => x.t === t);
            __timers = __timers.filter(x => x.t !== t);
            __now = t;
            due.forEach(x => x.res());
            await __tick(); await __tick();
          }
          await __tick();
          __post('done');
        }`;
      /* dva skripty: když má příklad chybu v zápisu, první skript ji ještě stihne nahlásit */
      f.srcdoc = page(`<script>${prelude}<\/script><script>__drive(async () => {\n${code.replace(/<\/script/gi, '<\\/script')}\n});<\/script>`, '');
      out.appendChild(f);
      setTimeout(() => { if (!done && !rows.length && f.parentNode) { rows.push({ t: 0, msg: '✘ Příklad se nedoběhl – zkontroluj, jestli v něm nechybí závorka nebo await.', err: true }); cleanup(false); show(); } }, 2500);
    }
  };

  /* ---------- oživení lekce ---------- */
  function mount(root, les, o) {
    o = o || {};
    const sec = root.classList && root.classList.contains('lesson') ? root : root.querySelector('.lesson');
    if (!sec) return null;
    const kind = sec.dataset.kind;
    const Ed = o.Editor || global.CodeEditor || (global.BajtEditor && global.BajtEditor.CodeEditor);
    const box = sec.querySelector('.ls-editor');
    const out = sec.querySelector('.ls-result');
    const lang = les.lang || LANG[kind];
    const runner = o.run || RUN[kind];
    let t = 0;
    let ran = false;
    const go = () => {
      ran = true;
      try { runner(ed ? ed.value : les.example, out, les, o); } catch (e) { out.innerHTML = `<p class="ls-err">✘ ${esc(e.message)}</p>`; }
    };
    let ed = null;
    if (Ed) {
      ed = new Ed(box, { lang, tab: lang === 'python' ? 4 : 2, label: 'Příklad z lekce (můžeš ho upravit)', onRun: () => go() });
      ed.value = les.example;
      if (!RUNNABLE[kind]) ed.onChange(() => { clearTimeout(t); t = setTimeout(go, 160); });
    } else {
      box.innerHTML = `<pre class="code">${esc(les.example)}</pre>`;
    }
    const runBtn = sec.querySelector('[data-ls-run]');
    if (runBtn) runBtn.addEventListener('click', go);
    sec.querySelector('[data-ls-reset]').addEventListener('click', () => { if (ed) ed.value = les.example; go(); });
    if (!RUNNABLE[kind] || o.autorun !== false) go();
    return { ed, go, get ran() { return ran; }, stop: () => { if (out._lsCleanup) out._lsCleanup(); } };
  }

  /* ---------- kroky úrovně ---------- */
  function steps(list, o) {
    o = o || {};
    return `<div class="stepper">
      <ol class="st-nav" aria-label="Kroky">${list.map((s, i) => `<li><button type="button" class="st-tab" data-step="${i}"><span class="st-n" aria-hidden="true">${i + 1}</span><span class="st-l">${esc(s.label)}</span></button></li>`).join('')}</ol>
      ${list.map((s, i) => `<section class="st-page" data-page="${i}" aria-label="${esc(s.label)}"${i ? ' hidden' : ''}>${s.html}</section>`).join('')}
      <div class="st-foot"><button type="button" class="btn ghost" data-st-prev hidden>← Zpět</button><span class="st-gap"></span><button type="button" class="btn primary big" data-st-next data-focus>Dál</button></div>
    </div>`;
  }
  function wire(root, list, o) {
    o = o || {};
    const st = root.querySelector('.stepper');
    const pages = [...st.querySelectorAll('.st-page')];
    const tabs = [...st.querySelectorAll('.st-tab')];
    const prev = st.querySelector('[data-st-prev]');
    const next = st.querySelector('[data-st-next]');
    let at = -1;
    const show = (i, focus) => {
      if (i === at) return;
      at = i;
      pages.forEach((p, k) => { p.hidden = k !== i; });
      tabs.forEach((b, k) => {
        b.classList.toggle('on', k === i);
        b.classList.toggle('past', k < i);
        if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      prev.hidden = i === 0;
      next.textContent = i === list.length - 1 ? (o.done || 'Jdu na to') : `Dál: ${list[i + 1].label} →`;
      next.classList.toggle('go', i === list.length - 1);
      const box = st.closest('.modal-box');
      if (box) box.scrollTop = 0;
      if (list[i].onShow) list[i].onShow();
      if (focus) next.focus({ preventScroll: true });
    };
    next.addEventListener('click', () => { if (at < list.length - 1) show(at + 1, true); else if (o.finish) o.finish(); });
    prev.addEventListener('click', () => show(at - 1, true));
    tabs.forEach((b, k) => b.addEventListener('click', () => show(k)));
    show(Math.max(0, Math.min(list.length - 1, o.start || 0)));
    return { show, get at() { return at; } };
  }

  /* ---------- za co jsou hvězdy ---------- */
  const stars = rows => `<ul class="ls-stars">${rows.map(r => `<li><span class="s" aria-hidden="true">★</span><span><b>${md(r.t)}</b>${r.d ? ` <span class="d">${md(r.d)}</span>` : ''}</span></li>`).join('')}</ul>`;
  const plain = s => String(s || '').replace(/[`*]/g, '');

  /* ---------- úvod úrovně v jednom okně: Příběh → Lekce → Úkol ----------
     o = { modal, close, head, story, lesson, task, stars, done, first, start, onClose, mountOpts } */
  function intro(o) {
    let lab = null;
    let m = null;
    const list = [
      o.story && { label: o.storyLabel || 'Příběh', html: o.story },
      o.lesson && { label: 'Lekce', html: html(o.lesson, o.lessonOpts), onShow: () => { if (!lab) lab = mount(m, o.lesson, o.mountOpts); } },
      { label: 'Úkol', html: `${o.task || ''}${o.stars ? `<h3 class="st-sub">⭐ Za co dostaneš hvězdy</h3>${stars(o.stars)}` : ''}` }
    ].filter(Boolean);
    m = o.modal(`<div class="briefing lv-intro${o.animate ? ' typing' : ''}">${o.head || ''}${steps(list)}</div>`, { cls: 'brief-modal steps-modal' });
    wire(m, list, { done: o.done, finish: o.close, start: o.start });
    if (o.onClose) {
      const obs = new MutationObserver(() => { if (!document.body.contains(m)) { obs.disconnect(); if (lab) lab.stop(); o.onClose(m); } });
      obs.observe(document.body, { childList: true });
    }
    return m;
  }

  /* ---------- samotná lekce v okně (tlačítko 📖 Lekce) ---------- */
  function open(o) {
    const m = o.modal(`${html(o.lesson, { kicker: o.kicker })}<div class="btn-row"><button class="btn primary" data-close data-focus>${esc(o.back || 'Zpět ke hře')}</button></div>`, { cls: 'lesson-modal', label: 'Lekce: ' + plain(o.lesson.title) });
    mount(m, o.lesson, o.mountOpts);
    return m;
  }

  /* příběh jako bublina s postavou (pro hry, které nemají vlastní chat) */
  const story = (ico, who, text) => `<div class="st-story"><span class="ava" aria-hidden="true">${ico}</span><div class="bubble">${who ? `<span class="who">${esc(who)}</span>` : ''}<p>${md(text)}</p></div></div>`;

  global.Lesson = { html, mount, steps, wire, stars, intro, open, story, md, esc, plain, RUN };
})(typeof window !== 'undefined' ? window : globalThis);
