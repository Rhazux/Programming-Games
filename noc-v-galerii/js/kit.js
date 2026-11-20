/*
 * Kit – společné pomůcky her (úložiště, zvuky, okna, kvíz, export)
 * Čistý JavaScript bez knihoven.
 */
(function (global) {
  'use strict';

  const Kit = {};
  Kit.$ = (s, r) => (r || document).querySelector(s);
  Kit.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  Kit.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  Kit.pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  Kit.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  Kit.shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  Kit.read = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } };
  Kit.write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* plné úložiště */ } };
  Kit.fmt = (n, d) => String(+Number(n).toFixed(d === undefined ? 1 : d)).replace('.', ',');

  /* ---------- zvuky (Web Audio) ---------- */
  Kit.soundOn = true;
  let actx = null;
  const SOUNDS = {
    click: [[900, 0.02, 'square', 0.03]],
    type: [[1400, 0.012, 'square', 0.015]],
    ok: [[660, 0.06, 'square', 0.05], [990, 0.1, 'square', 0.05]],
    coin: [[988, 0.05, 'square', 0.05], [1319, 0.12, 'square', 0.05]],
    jump: [[300, 0.12, 'square', 0.05, 700]],
    step: [[220, 0.02, 'triangle', 0.03]],
    fail: [[300, 0.12, 'sawtooth', 0.05], [160, 0.3, 'sawtooth', 0.05]],
    error: [[150, 0.25, 'square', 0.05]],
    alarm: [[880, 0.12, 'square', 0.04], [660, 0.12, 'square', 0.04], [880, 0.12, 'square', 0.04]],
    win: [[523, 0.1, 'square', 0.05], [659, 0.1, 'square', 0.05], [784, 0.1, 'square', 0.05], [1047, 0.28, 'square', 0.05]],
    star: [[1200, 0.12, 'triangle', 0.08]],
    cash: [[1568, 0.05, 'square', 0.04], [2093, 0.15, 'square', 0.04]],
    whoosh: [[200, 0.25, 'sawtooth', 0.03, 900]]
  };
  Kit.sound = function (type) {
    if (!Kit.soundOn) return;
    try {
      actx = actx || new (global.AudioContext || global.webkitAudioContext)();
      let t = actx.currentTime;
      for (const [f, d, wave, vol, to] of SOUNDS[type] || []) {
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = wave;
        o.frequency.setValueAtTime(f, t);
        if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(actx.destination);
        o.start(t);
        o.stop(t + d + 0.02);
        t += d;
      }
    } catch (e) { /* zvuk není nutný */ }
  };

  /* ---------- toasty, okna, konfety ---------- */
  Kit.toast = function (html, ms) {
    let w = Kit.$('.toasts');
    if (!w) { w = document.createElement('div'); w.className = 'toasts'; document.body.appendChild(w); }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = html;
    w.appendChild(t);
    setTimeout(() => t.classList.add('out'), ms || 3000);
    setTimeout(() => t.remove(), (ms || 3000) + 500);
  };

  /* dialog: Esc zavře, Tab zůstane uvnitř, po zavření se fokus vrátí tam, odkud přišel */
  let modalOpener = null;
  Kit.modal = function (html, opts) {
    opts = opts || {};
    const opener = Kit.$('.modal') ? modalOpener : document.activeElement;
    Kit.closeModal(true);
    modalOpener = opener;
    const m = document.createElement('div');
    m.className = 'modal' + (opts.cls ? ' ' + opts.cls : '');
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true"${opts.label ? ` aria-label="${Kit.esc(opts.label)}"` : ''}>${opts.noClose ? '' : '<button class="x" data-close aria-label="Zavřít">✕</button>'}${html}</div>`;
    const box = Kit.$('.modal-box', m);
    const h = Kit.$('h1, h2', box);
    if (h && !opts.label) { h.id = h.id || 'dlg-' + Date.now(); box.setAttribute('aria-labelledby', h.id); }
    m.addEventListener('click', e => {
      if ((e.target === m && !opts.noClose) || e.target.closest('[data-close]')) Kit.closeModal();
    });
    m.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !opts.noClose) { e.stopPropagation(); Kit.closeModal(); return; }
      if (e.key !== 'Tab') return;
      const f = Kit.$$('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])', box).filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.body.appendChild(m);
    const f = Kit.$('[data-focus]', m) || Kit.$('button:not(.x)', m);
    if (f) f.focus({ preventScroll: true });
    return m;
  };
  Kit.closeModal = function (keepOpener) {
    const m = Kit.$('.modal');
    if (m) m.remove();
    if (!keepOpener && modalOpener) {
      const o = modalOpener;
      modalOpener = null;
      if (document.contains(o) && o.focus) o.focus({ preventScroll: true });
    }
  };
  Kit.confirm = function (text, yes, onYes) {
    const m = Kit.modal(`<h2>Opravdu?</h2><p>${text}</p><div class="btn-row"><button class="btn danger" data-yes>${yes}</button><button class="btn ghost" data-close>Zpět</button></div>`);
    Kit.$('[data-yes]', m).addEventListener('click', () => { Kit.closeModal(); onYes(); });
  };

  Kit.confetti = function (items, colors) {
    if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div');
    box.className = 'confetti';
    items = items || ['★', '✦', '●'];
    colors = colors || ['#f59e0b', '#22d3ee', '#a3e635', '#f472b6'];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('span');
      s.textContent = items[i % items.length];
      s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDelay = Math.random() * 0.8 + 's';
      s.style.animationDuration = 2 + Math.random() * 1.5 + 's';
      s.style.color = colors[i % colors.length];
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4500);
  };

  Kit.download = function (filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  /* ---------- kvíz (vstupní / výstupní test) ---------- */
  /*
   * opts: { container, label, items: [{c, q, code, a: [...], ok, codeAnswers}], highlight(code, lang), lang,
   *         onAnswer(answer), onDone(answers) }
   * Pořadí odpovědí se míchá, „Nevím“ je vždy poslední.
   */
  Kit.runQuiz = function (opts) {
    const items = opts.items.map((q, idx) => ({ ...q, idx, order: Kit.shuffle(q.a.map((_, i) => i)) }));
    const answers = [];
    let i = 0;
    let shownAt = 0;
    const hl = opts.highlight || (s => Kit.esc(s));
    function show() {
      const q = items[i];
      shownAt = performance.now();
      const opt = q.order.map((oi, k) => {
        const text = q.a[oi];
        const body = q.codeAnswers && !(q.textAnswers || []).includes(oi) ? `<pre class="code small">${hl(text, q.alang || q.lang || opts.lang)}</pre>` : `<span>${Kit.esc(text)}</span>`;
        return `<button class="answer" data-choice="${oi}"><kbd>${k + 1}</kbd>${body}</button>`;
      }).join('');
      opts.container.innerHTML = `
        <section class="card narrow quiz">
          <div class="quiz-head"><span class="q-label">${Kit.esc(opts.label)}: otázka ${i + 1} z ${items.length}</span>
            <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${i}"><span style="width:${Kit.pct(i, items.length)}%"></span></div></div>
          <h2>${Kit.esc(q.q)}</h2>
          ${q.code ? `<pre class="code">${hl(q.code, q.lang || opts.lang)}</pre>` : ''}
          <div class="answers">${opt}
            <button class="answer dunno" data-choice="-1"><kbd>${q.a.length + 1}</kbd><span>🤷 Nevím</span></button>
          </div>
        </section>`;
      Kit.$$('.answer', opts.container).forEach(b => b.addEventListener('click', () => answer(+b.dataset.choice)));
      global.scrollTo(0, 0);
    }
    function answer(choice) {
      const q = items[i];
      const a = { c: q.c, q: q.idx, choice, correct: choice === q.ok, dontKnow: choice === -1, timeMs: Math.round(performance.now() - shownAt) };
      answers.push(a);
      Kit.sound('click');
      if (opts.onAnswer) opts.onAnswer(a, answers);
      i++;
      if (i < items.length) show();
      else { document.removeEventListener('keydown', onKey); opts.onDone(answers); }
    }
    function onKey(e) {
      if (Kit.$('.modal') || e.target.matches('input, textarea')) return;
      const n = parseInt(e.key, 10);
      const btns = Kit.$$('.answer', opts.container);
      if (n >= 1 && n <= btns.length) btns[n - 1].click();
    }
    document.addEventListener('keydown', onKey);
    show();
    return { stop() { document.removeEventListener('keydown', onKey); } };
  };

  /* Stavový řádek pod tlačítkem Spustit: idle | run | ok | bad | warn */
  Kit.status = function (el, state, html, sub) {
    if (!el) return;
    const ICON = { idle: '▶', run: '•', ok: '✔', bad: '✘', warn: '!' };
    el.className = 'status ' + (state || 'idle');
    el.innerHTML = `<span class="s-ico" aria-hidden="true">${ICON[state] || '▶'}</span><span class="s-text">${html}${sub ? `<small>${sub}</small>` : ''}</span>`;
  };

  /* Hvězdné cíle v liště mise: [{ got, text, val, title }] */
  Kit.goals = list => list.map(g => `<li class="goal ${g.got ? 'got' : ''}"${g.title ? ` title="${Kit.esc(g.title)}"` : ''}><i aria-hidden="true">★</i>${g.text}${g.val !== undefined && g.val !== '' ? ` <small>${g.val}</small>` : ''}</li>`).join('');

  /* ---------- hodnocení po vyřešení úrovně ----------
   * Každá hvězda dostane jasnou větu: co se povedlo (se skutečnými čísly),
   * a když hvězda chybí, krátké vysvětlení, jak ji příště získat.
   * rows: [{ got, title, text, how }] */
  Kit.starReport = rows => `<ol class="starlist">${rows.map(r => `<li class="${r.got ? 'got' : 'miss'}"><span class="st" aria-hidden="true">${r.got ? '★' : '☆'}</span><div class="sl-body"><b>${r.title}<span class="sr-only">${r.got ? ': hvězda získána.' : ': hvězda zatím chybí.'}</span></b><p>${r.text}</p>${r.how ? `<div class="how">${r.how}</div>` : ''}</div></li>`).join('')}</ol>`;
  /* hvězda za počet spuštění – stejné pravidlo ve všech hrách */
  Kit.runsStar = o => {
    const title = o.title;
    if (o.solution) return { got: false, title, text: 'Použil(a) jsi vzorové řešení, takže se tahle hvězda tentokrát nepočítá.', how: `Klikni na <b>${o.retry}</b> a vyřeš to vlastním kódem. Počítadlo začne znovu od nuly.` };
    if (o.runs <= o.limit) return { got: true, title, text: `${o.did} ${o.runs}× a vešel(a) ses do limitu ${o.limit}×.` };
    return { got: false, title, text: `${o.did} ${o.runs}×, na hvězdu stačí nejvýš ${o.limit}×.`, how: `Klikni na <b>${o.retry}</b>, počítadlo začne od nuly. Před každým dalším spuštěním si přečti, co hlásilo to minulé, a oprav přesně to.` };
  };
  /* rozbalovací vzorové řešení pod hodnocením */
  Kit.solutionBox = (inner, open, label) => `<details class="sol"${open ? ' open' : ''}><summary>${label || '📘 Vzorové řešení: porovnej ho se svým kódem'}</summary><div class="sol-body">${inner}</div></details>`;
  /* nápověda, která mluví o bonusu, pokud ji úroveň má */
  Kit.bonusTip = hints => {
    const h = (hints || []).find(x => typeof x === 'string' && /bonus/i.test(x));
    if (!h) return '';
    // jen část od věty, která o bonusu mluví (začátek nápovědy bývá o hlavním úkolu)
    const parts = h.split(/(?<=[.!?])\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ„])/);
    const i = parts.findIndex(x => /bonus/i.test(x));
    return parts.slice(Math.max(0, i)).join(' ');
  };

  /* Rozbalovací pruh s úryvky kódu si pamatuje, jestli ho hráč nechal otevřený */
  Kit.snipsOpen = (key, def) => !!Kit.read(key, def);
  if (global.document) {
    global.document.addEventListener('toggle', e => {
      const d = e.target;
      if (d && d.dataset && d.dataset.snips) Kit.write(d.dataset.snips, d.open);
    }, true);
  }

  /* Souhrn testu */
  Kit.quizStats = function (answers) {
    const n = answers.length;
    const correct = answers.filter(a => a.correct).length;
    return { n, correct, pct: Kit.pct(correct, n), ratio: n ? correct / n : 0, dunno: answers.filter(a => a.dontKnow).length };
  };
  /* Normalizovaný zisk podle Hakea: kolik z možného zlepšení hráč získal */
  Kit.gain = (preRatio, postRatio) => (preRatio < 1 ? (postRatio - preRatio) / (1 - preRatio) : null);

  Kit.bar = (label, p, val, cls) =>
    `<div class="bar-row"><span class="bar-label">${label}</span><span class="bar"><span class="${cls || 'post'}" style="width:${Math.max(0, Math.min(100, p))}%"></span></span><span class="bar-val">${val}</span></div>`;

  /* Tabulka „dovednost před / po“ */
  Kit.conceptTable = function (concepts, pre, post) {
    const mark = x => (!x ? '–' : x.correct ? '<span class="ok">✔</span>' : x.dontKnow ? '<span class="dk">?</span>' : '<span class="bad">✗</span>');
    const rows = Object.keys(concepts).map(c => {
      const a = pre.find(x => x.c === c);
      const b = post.find(x => x.c === c);
      const trend = a && b ? (!a.correct && b.correct ? '<span class="ok">↑ naučeno</span>' : a.correct && !b.correct ? '<span class="bad">↓</span>' : a.correct ? 'umíš' : '<span class="bad">procvičit</span>') : '';
      return `<tr><td>${Kit.esc(concepts[c])}</td><td>${mark(a)}</td><td>${mark(b)}</td><td>${trend}</td></tr>`;
    }).join('');
    return `<table class="tbl"><thead><tr><th>Dovednost</th><th>Před</th><th>Po</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  };

  global.Kit = Kit;
})(typeof window !== 'undefined' ? window : globalThis);
