/*
 * Robot Bajt – aplikace: obrazovky, průběh hry, měření pokroku
 */
(function () {
  'use strict';

  const { CHAPTERS, LEVELS, SNIPPETS, QUIZ, CONCEPTS, HANDBOOK, ROBOT_LINES } = window.BajtContent;
  const { runProgram, testSpecs, rng, parFor, formatValue } = window.BajtWorld;
  const { WorldView, Player } = window.BajtRender;
  const { CodeEditor, highlight } = window.BajtEditor;
  const LESSONS = window.BajtContent.LESSONS || {};
  /* hodnocení po misi: u každé hvězdy věta, co se povedlo, a u chybějící, jak ji získat */
  const Kit_starReport = rows => `<ol class="starlist">${rows.map(r => `<li class="${r.got ? 'got' : 'miss'}"><span class="st" aria-hidden="true">${r.got ? '★' : '☆'}</span><div class="sl-body"><b>${r.title}<span class="sr-only">${r.got ? ': hvězda získána.' : ': hvězda zatím chybí.'}</span></b><p>${r.text}</p>${r.how ? `<div class="how">${r.how}</div>` : ''}</div></li>`).join('')}</ol>`;
  const { BUILTINS, parse, stats: codeStats } = window.BajtLang;

  const STORE = 'robotBajt.v1';
  const HISTORY = 'robotBajt.history';
  const SETTINGS = 'robotBajt.settings';
  const SPEEDS = [0.5, 1, 2, 4, 10];
  const SPEED_LABELS = ['🐢 0,5×', '🚶 1×', '🏃 2×', '🚀 4×', '⚡ 10×'];
  const POST_UNLOCK = 12;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  function read(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* plné úložiště / soukromý režim */ } }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  const settings = Object.assign({ sound: true, speed: 1 }, read(SETTINGS, {}));
  let P = read(STORE, null); // profil hráče

  /* ------------------------------------------------------------------ *
   *  Zvuky (Web Audio, žádné soubory)
   * ------------------------------------------------------------------ */
  let actx = null;
  function sound(type) {
    if (!settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const seq = {
        step: [[520, 0.04, 'square', 0.03]],
        turn: [[380, 0.03, 'square', 0.025]],
        bit: [[880, 0.05, 'square', 0.05], [1320, 0.08, 'square', 0.05]],
        zap: [[1400, 0.12, 'sawtooth', 0.05, 300]],
        hit: [[300, 0.08, 'square', 0.06]],
        kill: [[200, 0.25, 'sawtooth', 0.07, 60]],
        fail: [[300, 0.12, 'sawtooth', 0.06], [180, 0.25, 'sawtooth', 0.06]],
        error: [[150, 0.25, 'square', 0.05]],
        win: [[523, 0.1, 'square', 0.05], [659, 0.1, 'square', 0.05], [784, 0.1, 'square', 0.05], [1047, 0.25, 'square', 0.05]],
        click: [[900, 0.02, 'square', 0.03]],
        star: [[1200, 0.12, 'triangle', 0.08]]
      }[type] || [];
      let t = actx.currentTime;
      for (const [f, d, wave, vol, to] of seq) {
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
  }

  /* ------------------------------------------------------------------ *
   *  Profil a měření
   * ------------------------------------------------------------------ */
  function newProfile(name) {
    const preForm = Math.random() < 0.5 ? 'A' : 'B';
    return {
      v: 1, name, createdAt: new Date().toISOString(),
      pre: { form: preForm, answers: [] },
      post: { form: preForm === 'A' ? 'B' : 'A', answers: [] },
      levels: {}, seenChapters: [], badges: [], crashes: 0, infinite: 0
    };
  }
  function save() { if (P) write(STORE, P); }
  function L(id) {
    if (!P.levels[id]) P.levels[id] = { runs: 0, errors: {}, solved: false, skipped: false, stars: [false, false, false], hints: 0, timeMs: 0, opened: 0 };
    return P.levels[id];
  }
  const levelIndex = id => LEVELS.findIndex(l => l.id === id);
  const isUnlocked = i => i === 0 || (P.levels[LEVELS[i - 1].id] && (P.levels[LEVELS[i - 1].id].solved || P.levels[LEVELS[i - 1].id].skipped));
  const solvedCount = () => LEVELS.filter(l => P.levels[l.id] && P.levels[l.id].solved).length;
  const starCount = () => LEVELS.reduce((a, l) => a + (P.levels[l.id] ? P.levels[l.id].stars.filter(Boolean).length : 0), 0);
  const postUnlocked = () => solvedCount() >= POST_UNLOCK || (P.levels['5-3'] && P.levels['5-3'].solved);

  const BADGES = {
    hello: { icon: '👋', name: 'Hello, world!', desc: 'Vyřeš první level.' },
    loop: { icon: '🔁', name: 'Cyklista', desc: 'Vyřeš level s cyklem for.' },
    ifelse: { icon: '🔀', name: 'Rozhodný', desc: 'Vyřeš level s podmínkou if.' },
    infinite: { icon: '😵', name: 'Nekonečno a ještě dál', desc: 'Vyrob nekonečný cyklus (a pak ho oprav).' },
    debugger: { icon: '🐞', name: 'Debugger', desc: 'Oprav oba rozbité programy.' },
    golf: { icon: '⛳', name: 'Golfista', desc: 'Získej 5 hvězd za krátký kód.' },
    perfect: { icon: '🌟', name: 'Perfekcionista', desc: 'Získej 3 hvězdy v 5 levelech.' },
    firsttry: { icon: '🎯', name: 'Napoprvé', desc: 'Vyřeš 3 levely hned na první spuštění.' },
    func: { icon: '🧩', name: 'Architekt', desc: 'Napiš vlastní funkci.' },
    boss: { icon: '👾', name: 'Lovec bugů', desc: 'Poraz Velkého Buga.' },
    growth: { icon: '📈', name: 'Rostu!', desc: 'Měj lepší výstupní test než vstupní.' }
  };
  function award(id) {
    if (!P || P.badges.includes(id)) return;
    P.badges.push(id);
    save();
    toast(`${BADGES[id].icon} Odznak: <b>${BADGES[id].name}</b>`);
    sound('star');
  }
  function checkBadges() {
    const lv = P.levels;
    const solved = LEVELS.filter(l => lv[l.id] && lv[l.id].solved);
    if (solved.length) award('hello');
    if (solved.some(l => (lv[l.id].used || []).includes('for'))) award('loop');
    if (solved.some(l => (lv[l.id].used || []).includes('if'))) award('ifelse');
    if (solved.some(l => (lv[l.id].used || []).includes('function'))) award('func');
    if (P.infinite > 0 && lv['4-3'] && lv['4-3'].solved) award('infinite');
    if (lv['2-3'] && lv['2-3'].solved && lv['4-3'] && lv['4-3'].solved) award('debugger');
    if (LEVELS.filter(l => lv[l.id] && lv[l.id].stars[1]).length >= 5) award('golf');
    if (LEVELS.filter(l => lv[l.id] && lv[l.id].stars.every(Boolean)).length >= 5) award('perfect');
    if (LEVELS.filter(l => lv[l.id] && lv[l.id].solvedAtRun === 1).length >= 3) award('firsttry');
    if (lv['5-3'] && lv['5-3'].solved) award('boss');
  }

  /* ------------------------------------------------------------------ *
   *  UI pomocníci: toast, modal, horní lišta
   * ------------------------------------------------------------------ */
  function toast(html) {
    let w = $('.toasts');
    if (!w) { w = document.createElement('div'); w.className = 'toasts'; document.body.appendChild(w); }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = html;
    w.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3000);
    setTimeout(() => t.remove(), 3500);
  }

  function modal(html, opts) {
    closeModal();
    const m = document.createElement('div');
    m.className = 'modal' + (opts && opts.cls ? ' ' + opts.cls : '');
    m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true">${opts && opts.noClose ? '' : '<button class="x" data-close aria-label="Zavřít">✕</button>'}${html}</div>`;
    m.addEventListener('click', e => {
      if ((e.target === m && !(opts && opts.noClose)) || e.target.closest('[data-close]')) closeModal();
    });
    document.body.appendChild(m);
    const f = $('[data-focus]', m) || $('button:not(.x)', m);
    if (f) f.focus({ preventScroll: true });
    return m;
  }
  function closeModal() { const m = $('.modal'); if (m) m.remove(); }

  function confirmBox(text, yes, onYes) {
    const m = modal(`<h2>Opravdu?</h2><p>${text}</p><div class="btn-row"><button class="btn danger" data-yes>${yes}</button><button class="btn ghost" data-close>Zpět</button></div>`);
    $('[data-yes]', m).addEventListener('click', () => { closeModal(); onYes(); });
  }

  function topbar(crumb) {
    $('#crumb').innerHTML = crumb || '';
    $('#starsTotal').innerHTML = P ? `<span class="ico">★</span>${starCount()}/${LEVELS.length * 3}` : '';
    $('#starsTotal').hidden = !P;
    $('#soundBtn').textContent = settings.sound ? '🔊' : '🔇';
  }

  /* stavový řádek pod tlačítkem Spustit: idle | run | ok | bad | warn */
  function status(state, html, sub) {
    const el = $('#status');
    if (!el) return;
    const ICON = { idle: '▶', run: '•', ok: '✔', bad: '✘', warn: '!' };
    el.className = 'status ' + (state || 'idle');
    el.innerHTML = `<span class="s-ico" aria-hidden="true">${ICON[state] || '▶'}</span><span class="s-text">${html}${sub ? `<small>${sub}</small>` : ''}</span>`;
  }

  function showScreen(html, crumb) {
    leaveLevel();
    $('#game').hidden = true;
    const s = $('#screen');
    s.hidden = false;
    s.innerHTML = html;
    topbar(crumb);
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------------ *
   *  Úvod
   * ------------------------------------------------------------------ */
  function showIntro() {
    const has = P && P.pre && P.pre.answers.length;
    showScreen(`
      <div class="intro">
        <div class="intro-copy">
          <h1 class="logo">Robot<b>Bajt</b></h1>
          <p class="lead">Bajt je úklidový robot uvnitř počítače. Po pádu systému se ztratil mezi čipy a poslouchá jen <b>JavaScript</b>.
            Napiš mu program, sbírej bity, střílej po bugách, proklouzni lasery a nakonec poraz Velkého Buga.</p>
          ${has ? `
            <div class="welcome"><p>Vítej zpátky, <b>${esc(P.name)}</b>!</p><p class="muted">Vyřešeno ${solvedCount()} z ${LEVELS.length} misí, ★ ${starCount()} z ${LEVELS.length * 3}.</p></div>
            <div class="btn-row">
              <button class="btn primary big" data-action="map">Pokračovat v misích</button>
              <button class="btn ghost" data-action="newGame">Nová hra</button>
            </div>` : `
            <label class="field">Tvoje přezdívka<input id="name" maxlength="24" placeholder="např. Ada Lovelace" value="${esc((P && P.name) || '')}" autocomplete="off"></label>
            <div class="btn-row"><button class="btn primary big" data-action="start">Zapnout robota</button></div>`}
          <p class="muted small" style="margin-top:1rem">Hra trvá 30 až 60 minut a dá se kdykoli přerušit. Postup se ukládá v prohlížeči.</p>
        </div>
        <div class="intro-visual bot-stage" aria-hidden="true">
          <span class="chip-label">U1 BAJT-16</span>
          <canvas class="hero-bot" id="heroBot" width="160" height="160"></canvas>
          <div class="code-teaser">${highlight('while (!jeCil()) {\n  if (jeBug()) {\n    zap();\n  }\n  krok();\n}')}</div>
        </div>
      </div>
      <ol class="steps">
        <li><b>Vstupní test</b><small>10 krátkých otázek. Zjistíme, co už umíš.</small></li>
        <li><b>16 misí v 5 kapitolách</b><small>Sekvence, cyklus for, podmínky, while, funkce a proměnné.</small></li>
        <li><b>Výstupní test</b><small>Jiné otázky stejné obtížnosti. Změříme, co ses naučil(a).</small></li>
      </ol>`, '');
    drawHeroBot();
    const n = $('#name');
    if (n && matchMedia('(pointer:fine)').matches) n.focus();
  }

  function drawHeroBot() {
    const c = $('#heroBot');
    if (!c) return;
    const view = new WorldView(c, null);
    view.cols = 1; view.rows = 1; view.tile = 160; view.dpr = 1;
    view.walls = new Set(); view.lasers = []; view.goal = null; view.bits = new Set(); view.bugs = [];
    view.robot = { x: 0, y: 0, px: 0, py: 0, dir: 0, angle: 0, squash: 0 };
    view.staticLayer = document.createElement('canvas');
    let start = performance.now();
    const loop = now => {
      if (!document.body.contains(c)) return;
      view.robot.angle = Math.sin((now - start) / 900) * 0.6;
      view.robot.squash = Math.max(0, Math.sin((now - start) / 300)) * 0.4;
      const ctx = c.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, 160, 160);
      view.drawRobot(ctx, now / 1000);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  function startGame() {
    const name = ($('#name') && $('#name').value.trim()) || 'Anonymní programátor';
    P = newProfile(name);
    save();
    sound('click');
    showQuizIntro('pre');
  }

  /* ------------------------------------------------------------------ *
   *  Testy znalostí
   * ------------------------------------------------------------------ */
  let quiz = null;
  function showQuizIntro(kind) {
    const pre = kind === 'pre';
    showScreen(`
      <section class="card narrow quiz-intro">
        <span class="pill">${pre ? 'Krok 1 ze 3: vstupní test' : 'Krok 3 ze 3: výstupní test'}</span>
        <h1>${pre ? 'Co už umíš?' : 'Ukaž, co ses naučil(a)!'}</h1>
        <p class="lead">${pre
          ? 'Než robota nahodíš, odpověz na 10 krátkých otázek o kódu. Nejde o známku, jen změříme, odkud startuješ.'
          : 'Deset nových otázek stejné obtížnosti jako na začátku, ale jiných. Bez nápovědy a bez příručky. Porovnáme je se vstupním testem.'}</p>
        <ul>
          <li>Klikni na odpověď, nebo stiskni klávesu 1–5.</li>
          <li>Když odpověď nevíš, zvol <b>Nevím</b>. Je to lepší než tipovat.</li>
        </ul>
        <div class="btn-row"><button class="btn primary big" data-action="quizBegin" data-kind="${kind}">Začít test</button></div>
      </section>`, pre ? 'Vstupní test' : 'Výstupní test');
  }

  function quizBegin(kind) {
    const T = P[kind];
    T.answers = [];
    T.startedAt = new Date().toISOString();
    quiz = { kind, i: 0, items: QUIZ[T.form].map((q, idx) => ({ ...q, idx, order: shuffle([0, 1, 2, 3]) })) };
    showQuizQuestion();
  }

  function showQuizQuestion() {
    const q = quiz.items[quiz.i];
    quiz.shownAt = performance.now();
    const n = quiz.items.length;
    const opts = q.order.map((oi, k) => {
      const text = q.a[oi];
      const body = q.codeAnswers ? `<pre class="code small">${highlight(text)}</pre>` : `<span>${esc(text)}</span>`;
      return `<button class="answer" data-action="quizAnswer" data-choice="${oi}"><kbd>${k + 1}</kbd>${body}</button>`;
    }).join('');
    showScreen(`
      <section class="card narrow quiz">
        <div class="quiz-head"><span class="q-label">${quiz.kind === 'pre' ? 'Vstupní test' : 'Výstupní test'}: otázka ${quiz.i + 1} z ${n}</span>
          <div class="progress"><span style="width:${pct(quiz.i, n)}%"></span></div></div>
        <h2>${esc(q.q)}</h2>
        ${q.code ? `<pre class="code">${highlight(q.code)}</pre>` : ''}
        <div class="answers">${opts}
          <button class="answer dunno" data-action="quizAnswer" data-choice="-1"><kbd>5</kbd><span>🤷 Nevím</span></button>
        </div>
      </section>`, quiz.kind === 'pre' ? 'Vstupní test' : 'Výstupní test');
  }

  function quizAnswer(choice) {
    if (!quiz) return;
    const q = quiz.items[quiz.i];
    P[quiz.kind].answers.push({
      c: q.c, q: q.idx, choice, correct: choice === q.ok, dontKnow: choice === -1,
      timeMs: Math.round(performance.now() - quiz.shownAt)
    });
    sound('click');
    quiz.i++;
    if (quiz.i < quiz.items.length) { showQuizQuestion(); save(); return; }
    P[quiz.kind].doneAt = new Date().toISOString();
    const kind = quiz.kind;
    quiz = null;
    save();
    if (kind === 'pre') showMap(true);
    else { P.finishedAt = new Date().toISOString(); save(); showResults(true); }
  }

  /* ------------------------------------------------------------------ *
   *  Mapa misí
   * ------------------------------------------------------------------ */
  function starsHtml(st) {
    return st.map(s => `<i class="${s ? 'on' : ''}">★</i>`).join('');
  }

  function showMap(fresh) {
    if (!P) return showIntro();
    const solved = solvedCount();
    const nextIdx = LEVELS.findIndex((l, i) => isUnlocked(i) && !(P.levels[l.id] && P.levels[l.id].solved));
    const nextId = nextIdx >= 0 ? LEVELS[nextIdx].id : null;
    const chapters = CHAPTERS.map(ch => {
      const lvls = LEVELS.map((l, i) => ({ l, i })).filter(o => o.l.chapter === ch.id);
      const tiles = lvls.map(({ l, i }) => {
        const s = P.levels[l.id];
        const unlocked = isUnlocked(i);
        const done = s && s.solved;
        const isNext = !done && unlocked && l.id === nextId;
        return `<button class="node ${!unlocked ? 'locked' : done ? 'done' : isNext ? 'next' : s && s.skipped ? 'skipped open' : 'open'}${l.boss ? ' boss' : ''}" ${unlocked ? `data-action="openLevel" data-id="${l.id}"` : 'disabled'} aria-label="Mise ${l.id}: ${esc(l.title)}">
          <span class="n-num">${unlocked ? l.id : '🔒'}</span>
          <span class="n-title">${l.debug ? '🐞 ' : l.boss ? '👾 ' : ''}${esc(l.title)}</span>
          <span class="n-sub">${l.debug ? 'oprav rozbitý kód' : l.boss ? 'finále' : s && s.skipped && !done ? 'přeskočeno' : ''}</span>
          <span class="n-stars" aria-label="${s ? s.stars.filter(Boolean).length : 0} hvězd ze 3">${starsHtml(s ? s.stars : [false, false, false])}</span>
        </button>`;
      }).join('');
      const chSolved = lvls.filter(o => P.levels[o.l.id] && P.levels[o.l.id].solved).length;
      return `<section class="track">
        <div class="track-head"><span class="t-ico">${ch.icon}</span><div><h2>Kapitola ${ch.id}: ${esc(ch.title)}</h2></div><span class="t-count">${chSolved}/${lvls.length} vyřešeno</span></div>
        <div class="nodes">${tiles}</div>
      </section>`;
    }).join('');
    const post = P.post.answers.length === QUIZ.A.length;
    const nextL = LEVELS.find(l => l.id === nextId);
    const nextCh = nextL ? CHAPTERS.find(c => c.id === nextL.chapter) : null;
    showScreen(`
      <div class="map-hero">
        <div>
          <h1>Mise robota Bajta</h1>
          <p>${esc(P.name)}, mise se odemykají postupně. Každá končí testem: robot musí úkol splnit na všech mapách.</p>
          <div class="meter"><span class="bar"><span class="post" style="width:${pct(solved, LEVELS.length)}%"></span></span>
            <span>${solved}/${LEVELS.length} misí</span><span class="muted">★ ${starCount()}/${LEVELS.length * 3}</span></div>
        </div>
        <div class="btn-row">
          ${post ? '<button class="btn primary" data-action="results">📊 Výsledky</button>' : ''}
          <button class="btn ghost" data-action="newGame">↺ Nová hra</button>
        </div>
      </div>
      ${nextL ? `<div class="next-up">
          <span class="nu-num">${esc(nextL.id)}</span>
          <div class="nu-text"><small>Pokračuj tady: kapitola ${nextCh.id}, ${esc(nextCh.title)}</small><b>${esc(nextL.title)}</b></div>
          <button class="btn primary big" data-action="openLevel" data-id="${nextL.id}">▶ Spustit misi ${esc(nextL.id)}</button>
        </div>` : ''}
      ${chapters}
      <section class="card final">
        <div>
          <h2>Výstupní test</h2>
          ${post ? `<p>Hotovo! Vstupní test ${P.pre.answers.filter(a => a.correct).length}/10, výstupní ${P.post.answers.filter(a => a.correct).length}/10.</p>`
            : postUnlocked() ? '<p>Můžeš si změřit, co ses naučil(a). Doporučujeme ale nejdřív dohrát všechny mise.</p>'
              : `<p class="muted">Odemkne se po vyřešení ${POST_UNLOCK} misí (zatím ${solved}). Pak porovnáme, co jsi uměl(a) na začátku a co umíš teď.</p>`}
        </div>
        ${post ? '<button class="btn primary big" data-action="results">Zobrazit výsledky</button>'
          : postUnlocked() ? '<button class="btn primary big" data-action="postTest">Spustit výstupní test</button>' : ''}
      </section>`, 'Mise');
    if (fresh && solved === 0) toast('Test hotový! Teď začíná ta zábavná část 🤖');
  }

  /* ------------------------------------------------------------------ *
   *  Level
   * ------------------------------------------------------------------ */
  let G = null; // stav otevřeného levelu
  let editor = null;
  let view = null;
  let rafId = 0;

  function ensureGameUI() {
    if (editor) return;
    editor = new CodeEditor($('#editor'), { onRun: () => run(false) });
    editor.onChange(() => {
      if (!G) return;
      if (G.player && !G.player.done) stopRun(true);
      editor.markError(0);
      G.code = editor.value;
      L(G.level.id).code = G.code;
      clearTimeout(G.saveT);
      G.saveT = setTimeout(save, 400);
      updateSizeInfo();
    });
    view = new WorldView($('#world'), $('#worldOverlay'));
    window.addEventListener('resize', () => { if (G) { fitWorld(); view.resize(); editor.refresh(); } });
    $('#speed').addEventListener('input', e => {
      settings.speed = +e.target.value;
      write(SETTINGS, settings);
      $('#speedLabel').textContent = SPEED_LABELS[settings.speed];
      if (G && G.player) G.player.speed = SPEEDS[settings.speed];
    });
    let last = performance.now();
    const loop = now => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (G && !$('#game').hidden) {
        if (G.player) G.player.update(dt);
        view.update(dt);
        view.draw(now);
        updateHud();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function openLevel(id) {
    if (!P) return showIntro();
    const i = levelIndex(id);
    if (i < 0 || !isUnlocked(i)) return;
    const level = LEVELS[i];
    const ch = CHAPTERS.find(c => c.id === level.chapter);
    const newChapter = !P.seenChapters.includes(ch.id);
    if (newChapter && !LESSONS[id]) {
      P.seenChapters.push(ch.id);
      save();
      showChapterIntro(ch, () => openLevel(id));
      return;
    }
    leaveLevel();
    $('#screen').hidden = true;
    $('#game').hidden = false;
    ensureGameUI();
    const st = L(id);
    st.opened++;
    G = { level, i, openedAt: performance.now(), player: null, result: null, hintShown: 0, code: st.code || level.starter || '' };
    save();
    topbar(`<button class="link" data-action="map">Mise</button> › ${level.id} ${esc(level.title)}`);
    // mise
    $('#lvlId').textContent = level.id;
    $('#lvlWhere').textContent = `${ch.icon} Kapitola ${ch.id}: ${ch.title}${level.debug ? ' (oprav rozbitý kód)' : level.boss ? ' (finále)' : ''}`;
    $('#lvlTitle').textContent = (level.debug ? '🐞 ' : level.boss ? '👾 ' : '') + level.title;
    const snips = $('#snips');
    snips.open = read('robotBajt.snips', window.innerHeight >= 820 || window.innerWidth < 1100) !== false;
    if (!snips.dataset.bound) { snips.dataset.bound = '1'; snips.addEventListener('toggle', () => write('robotBajt.snips', snips.open)); }
    $('#lvlStory').textContent = level.story;
    $('#lvlTask').textContent = level.task;
    $('#hintBox').innerHTML = '';
    $('#hintBtn').textContent = `💡 Nápověda (${level.hints.length})`;
    $('#hintBtn').disabled = false;
    renderStarGoals();
    // paleta
    $('#palette').innerHTML = level.palette.map(k => {
      const s = SNIPPETS[k];
      const b = BUILTINS[k];
      const cls = b ? (b.kind === 'sensor' ? 'sen' : 'cmd') : k === 'not' ? 'op' : 'kw';
      return `<button class="chip ${cls}" data-action="snippet" data-k="${k}" title="${esc(b ? b.desc : 'Vloží ' + s.label)}">${esc(s.label)}</button>`;
    }).join('');
    // svět – náhled první mapy
    const specs = testSpecs(level, 0);
    G.previewSpecs = specs;
    fitWorld();
    view.setSpec(specs[0].spec);
    renderChips(specs.map(s => ({ label: s.label, state: 'idle' })), level);
    // editor
    editor.value = G.code;
    editor.setReadOnly(false);
    updateSizeInfo();
    $('#speed').value = settings.speed;
    $('#speedLabel').textContent = SPEED_LABELS[settings.speed];
    clearConsole();
    if (level.debug && !st.solved) status('warn', 'Debug mise: program je napsaný, ale obsahuje chybu', 'Spusť ho, podívej se, co se stane, a oprav ho.');
    else status('idle', st.solved ? 'Mise je splněná. Zkus získat všechny hvězdy.' : 'Napiš program a spusť ho',
      level.gen ? `Program se spustí na ${level.seeds.length} testech${level.randomTests ? ` a ${level.randomTests} náhodných mapách` : ''}. Musí projít všemi.` : 'Ctrl+Enter spustí program. Krokování ukáže, který řádek se právě provádí.');
    setControls('idle');
    updateSkip();
    window.scrollTo(0, 0);
    /* úvod mise: (nová kapitola +) příběh → lekce → úkol; poprvé sám, lekce pak tlačítkem 📖 */
    const afterIntro = () => { if (!read('robotBajt.tour', false)) setTimeout(() => { if (G && G.level === level && !$('.modal')) startTour(); }, 250); else if (matchMedia('(min-width: 1100px)').matches) editor.ta.focus({ preventScroll: true }); };
    P.intro = P.intro || {};
    if (LESSONS[level.id] && !P.intro[level.id]) {
      P.intro[level.id] = true;
      if (newChapter) P.seenChapters.push(ch.id);
      save();
      setTimeout(() => { if (G && G.level === level) levelIntro(level, ch, newChapter, afterIntro); }, 250);
    } else if (!read('robotBajt.tour', false)) setTimeout(() => { if (G && G.level === level && !$('.modal')) startTour(); }, 500);
  }

  /* lekce: robot předvede příklad na malé ukázkové mapě */
  const RMq = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function lessonRun(code, out, les) {
    if (out._stop) out._stop();
    out.innerHTML = '<div class="world-wrap ls-world"><canvas class="ls-canvas" role="img" aria-label="Robot předvádí příklad z lekce"></canvas></div><p class="ls-bmsg" aria-live="polite">Robot se chystá…</p>';
    const c = $('canvas', out);
    const msg = $('.ls-bmsg', out);
    const v = new WorldView(c, null);
    v.maxHeight = 210;
    let res;
    try { res = runProgram({ id: 'lekce-' + (les.title || ''), battery: les.battery || 60, requireBits: false, stepStar: 999 }, code, { specs: [{ spec: les.map, label: 'lekce' }] }); }
    catch (e) { msg.textContent = '✘ ' + e.message; msg.className = 'ls-bmsg bad'; return; }
    let stopped = false;
    let raf = 0;
    let last = performance.now();
    const loop = (player) => now => {
      if (stopped || !document.body.contains(c)) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (player) player.update(dt);
      v.update(dt);
      v.draw(now);
      raf = requestAnimationFrame(loop(player));
    };
    out._stop = () => { stopped = true; cancelAnimationFrame(raf); };
    if (res.compileError) {
      v.setSpec(les.map);
      msg.innerHTML = `✘ Chyba v kódu na řádku ${res.compileError.line}: ${esc(res.compileError.message)}`;
      msg.className = 'ls-bmsg bad';
      raf = requestAnimationFrame(loop(null));
      return;
    }
    const t = res.tests[0];
    v.setSpec(t.spec);
    const said = [];
    const player = new Player(v, t.events, {
      line: () => {},
      print: x => { said.push(x); msg.textContent = '🤖 Robot hlásí: ' + x; },
      sound: () => {},
      done: () => {
        if (t.error) { msg.innerHTML = '✘ ' + esc(t.error.message); msg.className = 'ls-bmsg bad'; v.setMood('sad', 1500); }
        else { msg.innerHTML = '✔ Hotovo' + (said.length ? ', robot ohlásil: ' + esc(said.join(', ')) : '') + '.'; msg.className = 'ls-bmsg ok'; }
      }
    });
    player.speed = RMq() ? 10 : t.events.length > 40 ? 4 : 2;
    msg.textContent = 'Robot provádí příklad…';
    raf = requestAnimationFrame(loop(player));
  }
  const LESSON_OPTS = { run: lessonRun };

  function levelIntro(level, ch, newChapter, onClose) {
    const chapterBox = newChapter ? `<div class="st-chapter"><span class="pill">Nová kapitola ${ch.id}</span><b>${ch.icon} ${esc(ch.title)}</b>${ch.intro.map(p => `<p>${p}</p>`).join('')}</div>` : '';
    Lesson.intro({
      modal, close: closeModal, first: true, onClose,
      head: `<p class="b-kicker">${ch.icon} Kapitola ${ch.id}: ${esc(ch.title)} · mise ${esc(level.id)}</p><h2>${esc(level.title)}</h2>`,
      story: chapterBox + Lesson.story('🤖', 'Bajt', level.story),
      lesson: LESSONS[level.id], mountOpts: LESSON_OPTS,
      task: `<div class="st-task"><p><b>Úkol:</b> ${esc(level.task)}</p></div>`,
      stars: [
        { t: level.gen ? 'Všechny testy' : 'Splnit úkol', d: level.gen ? 'Program projde všemi testovacími mapami, i náhodnými, které se mění při každém spuštění.' : 'Robot splní úkol mise a nenarazí.' },
        { t: `Nejvýš ${level.sizeStar} příkazů`, d: 'Krátký kód: počítá se každý příkaz v programu. Pomůžou cykly a funkce.' },
        { t: 'Úsporný robot', d: 'Robot udělá nejvýš tolik akcí jako vzorové řešení. Žádné zbytečné kroky a otočky.' }
      ],
      done: 'Jdu na to 🤖'
    });
  }
  function openLessonModal() {
    if (!G || !LESSONS[G.level.id]) return;
    Lesson.open({ modal, lesson: LESSONS[G.level.id], kicker: `Lekce k misi ${G.level.id}: ${G.level.title}`, back: 'Zpět k misi', mountOpts: LESSON_OPTS });
  }

  /* průvodce obrazovkou mise: poprvé se spustí sám, pak tlačítkem ❔ */
  function startTour() {
    if (!window.Tour) return;
    Tour.start([
      { el: '#game .brief-strip .bs-text', title: 'Úkol', text: 'Co má robot udělat. Pod tím jsou dvě hvězdy navíc: <b>krátký kód</b> (málo příkazů) a <b>úsporný robot</b> (málo akcí).' },
      { el: '.world-stage', title: 'Svět robota', text: 'Mapa, po které Bajt chodí. Po spuštění uvidíš, jak tvůj program provádí krok za krokem.' },
      { el: '.world-status', title: 'Testy, energie a bity', text: 'Štítky ukazují mapy, na kterých se program zkouší: musí projít všemi. Každá akce robota stojí 1 energii.' },
      { el: '#editor', title: 'Program', text: 'Sem píšeš JavaScript pro robota, třeba <code>krok();</code> nebo <code>vlevo();</code>. Počítadlo nahoře ukazuje, kolik příkazů program má.' },
      { el: '#snips', title: 'Příkazy a bloky', text: 'Všechny příkazy, které robot zná, a bloky jako cyklus nebo podmínka. Kliknutím je vložíš do kódu.' },
      { el: '#game .runbar', title: 'Spuštění a krokování', text: '▶ Spustit (Ctrl+Enter) provede celý program. ⏯ Krokovat ho provádí po jednom příkazu, takže vidíš, který řádek dělá co. ⏹ zastaví a ⏩ přeskočí animaci.' },
      { el: '#console', title: 'Konzole', text: 'Chyby v programu s číslem řádku a vysvětlením, co je špatně, a co robot hlásí během mise.' },
      { el: '#starGoals', title: 'Tři hvězdy', text: 'Splněný úkol, krátký kód a úsporný robot. Misi můžeš kdykoli zopakovat a hvězdy dobrat.' },
      { el: '#game .brief-actions', title: 'Když nevíš kudy kam', text: '📖 <b>Lekce</b> vysvětlí novou věc a robot ji předvede na malé mapě. Příklad si můžeš upravit a pustit znovu. 💡 <b>Nápověda</b> radí postupně. ❔ Průvodce spustíš znovu.' }
    ], { onEnd: () => { write('robotBajt.tour', true); if (matchMedia('(min-width: 1100px)').matches && editor) editor.ta.focus({ preventScroll: true }); } });
  }

  /* na velké obrazovce se mapa vejde do volné výšky sloupce, aby byl vidět celý level bez posouvání */
  function fitWorld() {
    const fit = matchMedia('(min-width: 1100px) and (min-height: 640px)').matches;
    const col = $('#world').closest('.col');
    if (!fit || !col) { view.maxHeight = 520; return; }
    const statusH = $('.world-status').offsetHeight;
    view.maxHeight = Math.max(200, col.clientHeight - statusH - 44);
  }

  function leaveLevel() {
    if (!G) return;
    const st = L(G.level.id);
    st.timeMs += Math.round(performance.now() - G.openedAt);
    if (G.player) G.player = null;
    if (editor) { st.code = editor.value; }
    save();
    G = null;
  }

  function showChapterIntro(ch, then) {
    const m = modal(`
      <span class="pill">Kapitola ${ch.id}</span>
      <h2 style="margin-top:.6rem">${ch.icon} ${esc(ch.title)}</h2>
      ${ch.intro.map(p => `<p>${p}</p>`).join('')}
      <pre class="code">${highlight(ch.example)}</pre>
      <div class="btn-row"><button class="btn primary big" data-go data-focus>Jdu na to</button></div>`, { noClose: true });
    $('[data-go]', m).addEventListener('click', () => { closeModal(); then(); });
  }

  function renderStarGoals() {
    const level = G.level;
    const st = L(level.id);
    const parTxt = level.gen ? 'jako vzorové řešení v každém testu' : `≤ ${parFor(level, level.spec)}`;
    const goal = (got, text, title) => `<li class="goal ${got ? 'got' : ''}" title="${esc(title)}"><i aria-hidden="true">★</i>${text}</li>`;
    $('#starGoals').innerHTML =
      goal(st.stars[0], level.gen ? 'Všechny testy' : 'Splnit úkol', 'Hvězda za splnění úkolu' + (level.gen ? ' ve všech testech' : '')) +
      goal(st.stars[1], `Nejvýš ${level.sizeStar} příkazů`, `Hvězda za krátký kód: nejvýš ${level.sizeStar} příkazů`) +
      goal(st.stars[2], 'Úsporný robot', `Hvězda za úsporného robota: akcí ${parTxt}`);
    const ls = $('#lvlStars');
    if (ls) ls.innerHTML = `<span class="bl-star" aria-hidden="true">★</span> <b>Hvězdy navíc:</b> krátký kód (nejvýš ${level.sizeStar} příkazů) a úsporný robot (${level.gen ? 'akcí nejvýš jako vzorové řešení' : `nejvýš ${parFor(level, level.spec)} akcí`}).`;
  }

  function updateSizeInfo() {
    if (!G) return;
    let txt;
    try {
      const s = codeStats(parse(editor.value)).size;
      txt = `Příkazů: <b class="${s <= G.level.sizeStar ? 'ok' : ''}">${s}</b> / ⭐ ${G.level.sizeStar}`;
    } catch (e) {
      txt = 'Příkazů: <b>?</b>';
    }
    $('#sizeInfo').innerHTML = txt;
  }

  function renderChips(items, level) {
    $('#chips').innerHTML = items.map((c, i) => `<button class="tchip ${c.state}" data-action="viewTest" data-i="${i}" ${c.state === 'idle' && !(G && G.result) ? 'disabled' : ''}>${c.state === 'ok' ? '✓' : c.state === 'bad' ? '✗' : c.state === 'run' ? '▶' : '•'} ${esc(c.label)}</button>`).join('')
      + (level && level.gen && level.randomTests && !(G && G.result) ? `<span class="muted small">+ ${level.randomTests} náhodné při spuštění</span>` : '');
  }

  function updateHud() {
    if (!G) return;
    const battery = G.level.battery;
    const used = view.energy;
    $('#energyBar').style.width = Math.max(0, 100 - pct(used, battery)) + '%';
    $('#energyTxt').textContent = `${battery - used}/${battery}`;
    const total = view.bits.size + view.collected;
    $('#bitsTxt').textContent = total ? `${view.collected}/${total}` : '–';
  }

  /* ---------- konzole ---------- */
  function clearConsole() { $('#console').innerHTML = ''; }
  function log(text, type, line) {
    const c = $('#console');
    const d = document.createElement('div');
    d.className = 'log ' + (type || '');
    d.innerHTML = (line ? `<button class="line-link" data-action="gotoLine" data-line="${line}">ř. ${line}</button> ` : '') + esc(text);
    c.appendChild(d);
    while (c.children.length > 120) c.firstChild.remove();
    c.scrollTop = c.scrollHeight;
  }

  function setControls(state) {
    G && (G.state = state);
    const running = state === 'run' || state === 'step';
    $('#runBtn').disabled = running && state === 'run';
    $('#runBtn').innerHTML = running ? '▶ Znovu' : '▶ Spustit <kbd>Ctrl+Enter</kbd>';
    $('#stepBtn').innerHTML = state === 'step' ? '⏭ Další krok' : '⏯ Krokovat';
    $('#stopBtn').disabled = !running;
    $('#fastBtn').disabled = !running;
    $('#game').classList.toggle('running', running);
  }

  /* ---------- spuštění ---------- */
  function run(step) {
    if (!G) return;
    if (G.player && !G.player.done) {
      if (step && G.player.stepMode) { G.player.stepOnce(); return; }
      stopRun(true);
    }
    const level = G.level;
    const st = L(level.id);
    const code = editor.value;
    st.code = code;
    st.runs++;
    editor.markError(0);
    clearConsole();
    const res = runProgram(level, code);
    G.result = res;
    // měření: druh výsledku
    let kind = 'ok';
    if (res.compileError) kind = 'syntax';
    else if (!res.ok) {
      const bad = res.tests.find(t => !t.ok);
      kind = bad ? (bad.error ? bad.error.kind : 'problem') : 'requirement';
    }
    st.errors[kind] = (st.errors[kind] || 0) + 1;
    if (kind === 'crash') P.crashes++;
    if (kind === 'infinite') P.infinite++;
    save();
    sound('click');

    if (res.compileError) {
      const e = res.compileError;
      log(`Chyba v kódu: ${e.message}`, 'err', e.line);
      status('bad', `Chyba v kódu na řádku ${e.line}`, esc(e.message));
      editor.markError(e.line);
      view.reset();
      view.bubble(`Nerozumím řádku ${e.line} 🤔`, 'err');
      view.setMood('sad', 1500);
      sound('error');
      setControls('idle');
      renderChips((G.previewSpecs || []).map(s => ({ label: s.label, state: 'idle' })), level);
      updateSkip();
      return;
    }
    G.replay = false;
    const failIdx = res.tests.findIndex(t => !t.ok);
    const idx = failIdx >= 0 ? failIdx : 0;
    log(`▶ Spouštím program na ${res.tests.length} ${res.tests.length === 1 ? 'mapě' : 'testech'}…`, 'info');
    status('run', 'Robot provádí tvůj program…', res.tests.length > 1 ? `Program se zkouší na ${res.tests.length} mapách.` : '');
    playTest(idx, step);
  }

  function playTest(idx, step) {
    const res = G.result;
    const test = res.tests[idx];
    G.playing = idx;
    view.setSpec(test.spec);
    renderChips(res.tests.map((t, i) => ({ label: t.label, state: i === idx ? 'run' : 'pending' })), null);
    view.bubble(pick(ROBOT_LINES.start));
    const player = new Player(view, test.events, {
      line: l => editor.markRun(l),
      print: t => log(t, 'out'),
      sound,
      done: () => finishTest(idx)
    });
    player.speed = SPEEDS[settings.speed];
    player.stepMode = !!step;
    G.player = player;
    setControls(step ? 'step' : 'run');
    if (step) {
      log('Režim krokování: každým kliknutím na „⏭ Další krok“ provedeš jednu akci. Žlutý řádek ukazuje, kde program právě je.', 'info');
      status('run', 'Krokování', 'Klikej na „⏭ Další krok“. Žlutý řádek ukazuje, kde program právě je.');
    }
  }

  function finishTest(idx) {
    if (!G || !G.result) return;
    const res = G.result;
    const test = res.tests[idx];
    editor.markRun(0);
    setControls('idle');
    renderChips(res.tests.map(t => ({ label: t.label, state: t.ok ? 'ok' : 'bad' })), null);
    const passed = res.tests.filter(t => t.ok).length;
    if (test.error) {
      const e = test.error;
      log(`${test.label}: ${e.message}`, 'err', e.line);
      editor.markError(e.line);
      view.bubble(pick(ROBOT_LINES[e.kind] || ROBOT_LINES.fail), 'err');
      if (e.kind === 'infinite') { view.setMood('dizzy', 3000); log('Tip: v cyklu while se musí něco měnit (třeba robot musí udělat krok), jinak podmínka platí navždy.', 'warn'); }
      if (['infinite', 'runtime', 'syntax'].includes(e.kind)) sound('error');
    } else if (test.problems.length) {
      test.problems.forEach(p => log(`${test.label}: ${p}`, 'err'));
      view.bubble(pick(ROBOT_LINES.fail), 'err');
      view.setMood('sad', 1800);
      sound('fail');
    }
    if (res.tests.length > 1) log(`Testy: prošlo ${passed} z ${res.tests.length}.`, passed === res.tests.length ? 'ok' : 'warn');
    if (!test.error && !test.problems.length && !res.ok) {
      if (res.requirements.length) res.requirements.forEach(r => log(r, 'err'));
      else {
        const bad = res.tests.findIndex(t => !t.ok);
        if (bad >= 0) log(`Klikni na ${res.tests[bad].label}, ať vidíš, co se tam pokazilo.`, 'warn');
      }
      sound('fail');
    }
    if (res.ok) status('ok', 'Mise splněna!', res.tests.length > 1 ? `Prošly všechny testy (${res.tests.length}).` : '');
    else if (test.error) status('bad', `${esc(test.label)}: ${esc(test.error.message)}`, test.error.line ? `Řádek ${test.error.line} je v editoru zvýrazněný.` : '');
    else if (test.problems.length) status('bad', `${esc(test.label)}: ${esc(test.problems[0])}`, passed < res.tests.length && res.tests.length > 1 ? `Prošlo ${passed} z ${res.tests.length} testů.` : '');
    else if (!res.ok) {
      const badIdx = res.tests.findIndex(t => !t.ok);
      status('bad', res.requirements.length ? esc(res.requirements[0]) : `Prošlo ${passed} z ${res.tests.length} testů`, badIdx >= 0 ? `Klikni na ${esc(res.tests[badIdx].label)} pod mapou a uvidíš, co se pokazilo.` : '');
    }
    if (res.ok && !G.replay) victory();
    updateSkip();
  }

  function stopRun(silent) {
    if (!G) return;
    G.player = null;
    view.reset();
    editor.markRun(0);
    setControls('idle');
    if (!silent) { log('⏹ Zastaveno.', 'info'); status('idle', 'Zastaveno', 'Uprav program a spusť ho znovu.'); }
  }

  function viewTest(i) {
    if (!G || !G.result || !G.result.tests[i]) return;
    stopRun(true);
    G.replay = true;
    playTest(i, false);
  }

  /* ---------- výhra ---------- */
  function victory() {
    const level = G.level;
    const res = G.result;
    const st = L(level.id);
    const now = [true, res.size <= level.sizeStar, res.parOk];
    const before = st.stars.slice();
    const wasSolved = st.solved;
    st.stars = st.stars.map((s, i) => s || now[i]);
    if (!wasSolved) {
      st.solved = true;
      st.solvedAtRun = st.runs;
      st.timeToSolveMs = st.timeMs + Math.round(performance.now() - G.openedAt);
      st.hintsAtSolve = st.hints;
    }
    st.bestSize = Math.min(st.bestSize || Infinity, res.size);
    st.bestSteps = Math.min(st.bestSteps || Infinity, res.steps);
    st.used = Array.from(new Set([...(st.used || []), ...res.used]));
    save();
    view.setMood('happy', 4000);
    view.bubble(pick(ROBOT_LINES.win), 'ok');
    view.burst(view.robot.x, view.robot.y, '#a3e635', 40, 3);
    sound('win');
    log('✔ Mise splněna!', 'ok');
    renderStarGoals();
    checkBadges();
    topbar(`<button class="link" data-action="map">Mise</button> › ${level.id} ${esc(level.title)}`);
    const next = LEVELS[G.i + 1];
    /* hodnocení: u každé hvězdy věta, co se povedlo, a u chybějící, jak ji získat */
    const prikazu = n => (n === 1 ? 'příkaz' : n >= 2 && n <= 4 ? 'příkazy' : 'příkazů');
    const akci = n => (n === 1 ? 'akci' : n >= 2 && n <= 4 ? 'akce' : 'akcí');
    function starRows() {
      const solCode = `<pre class="code">${highlight(level.solution)}</pre>`;
      const par = level.gen ? null : parFor(level, level.spec);
      const sizeTip = level.chapter === 1 ? 'některé příkazy jsou zbytečné. Smaž ty, bez kterých robot k cíli dojde taky.'
        : level.chapter <= 3 ? 'příkazy, které se opakují, zabal do cyklu <code>for</code>: napíšeš je jen jednou.'
        : level.chapter === 4 ? 'opakování zabal do cyklu <code>while</code>, který běží, dokud platí podmínka.'
        : 'opakující se kus kódu dej do vlastní funkce nebo do cyklu.';
      const bothMiss = !now[1] && !now[2];
      const rows = [
        { got: true, title: 'Mise splněna', text: `Prošly všechny testy (${res.tests.length}). Program jsi spustil(a) ${st.runs}×.` },
        now[1]
          ? { got: true, title: `Krátký kód: nejvýš ${level.sizeStar} příkazů`, text: `Tvůj program má ${res.size} ${prikazu(res.size)}.` }
          : { got: st.stars[1], title: `Krátký kód: nejvýš ${level.sizeStar} příkazů`, text: `Tvůj program má ${res.size} ${prikazu(res.size)}, na hvězdu stačí ${level.sizeStar}.${st.stars[1] ? ' Hvězdu ale už máš z dřívějška.' : ''}`, how: `<b>Jak na to:</b> ${sizeTip} Takhle to zvládne vzorové řešení:${solCode}` },
        now[2]
          ? { got: true, title: 'Úsporný robot', text: `Robot udělal ${res.steps} ${akci(res.steps)}${level.gen ? ' (nejvíc v jednom testu) a nic zbytečného' : `, cíl je nejvýš ${par}`}.` }
          : { got: st.stars[2], title: 'Úsporný robot', text: `Robot udělal ${res.steps} ${akci(res.steps)}${level.gen ? ' (nejvíc v jednom testu), vzorové řešení jich potřebuje méně' : `, na hvězdu stačí ${par}`}.${st.stars[2] ? ' Hvězdu ale už máš z dřívějška.' : ''}`, how: `<b>Jak na to:</b> robot dělá akce navíc, třeba se otáčí víckrát, než musí, nebo chodí tam a zpátky. Každá akce stojí energii. ${bothMiss ? 'Porovnej svůj program se vzorovým řešením výš.' : `Vzorové řešení:${solCode}`}` }
      ];
      const showSol = now[1] && now[2];
      return Kit_starReport(rows) + (showSol ? `<details class="sol"><summary>📘 Vzorové řešení: porovnej ho se svým kódem</summary><div class="sol-body">${solCode}</div></details>` : '');
    }
    setTimeout(() => {
      if (!G || G.level.id !== level.id) return;
      const m = modal(`
        <div class="victory">
          <div class="big-stars">${now.map((s, i) => `<i class="${s ? 'on' : ''} ${s && !before[i] ? 'new' : ''}" style="animation-delay:${0.15 + i * 0.25}s">★</i>`).join('')}</div>
          <h2>Mise ${level.id} splněna!</h2>
          ${starRows()}
          <div class="btn-row center">
            ${next ? `<button class="btn primary big" data-action="openLevel" data-id="${next.id}" data-focus>Další mise</button>` : `<button class="btn primary big" data-action="postTest" data-focus>Výstupní test</button>`}
            <button class="btn ghost" data-close>↺ Zkusit znovu</button>
          </div>
        </div>`, { cls: 'win' });
      confetti();
      $$('.big-stars i.on', m).forEach((s, i) => setTimeout(() => sound('star'), 200 + i * 250));
    }, 700);
  }

  function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div');
    box.className = 'confetti';
    const items = ['0', '1', '★', '{', '}', '⚡', '🤖', ';'];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('span');
      s.textContent = items[i % items.length];
      s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDelay = Math.random() * 0.8 + 's';
      s.style.animationDuration = 2 + Math.random() * 1.5 + 's';
      s.style.color = ['#f0b43c', '#7ef0b2', '#6fe0ff', '#ffb0d0'][i % 4];
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4500);
  }

  /* ---------- nápověda, přeskočení, reset ---------- */
  function showHint() {
    if (!G) return;
    const level = G.level;
    if (G.hintShown >= level.hints.length) return;
    G.hintShown++;
    L(level.id).hints++;
    save();
    $('#hintBox').innerHTML = level.hints.slice(0, G.hintShown).map((h, i) => `<p class="hint">💡 ${i + 1}. ${esc(h)}</p>`).join('');
    $('#hintBtn').textContent = G.hintShown < level.hints.length ? '💡 Další nápověda' : '💡 Víc nápověd není';
    $('#hintBtn').disabled = G.hintShown >= level.hints.length;
  }

  function updateSkip() {
    if (!G) return;
    const st = L(G.level.id);
    const can = !st.solved && !st.skipped && st.runs >= 6 && LEVELS[G.i + 1];
    $('#skipBtn').hidden = !can;
  }
  function skipLevel() {
    confirmBox('Mise zůstane nevyřešená (bez hvězd), ale odemkne se další. Kdykoli se k ní můžeš vrátit.', 'Přeskočit', () => {
      const st = L(G.level.id);
      st.skipped = true;
      save();
      const next = LEVELS[G.i + 1];
      if (next) openLevel(next.id); else showMap();
    });
  }

  /* ------------------------------------------------------------------ *
   *  Příručka
   * ------------------------------------------------------------------ */
  function showHandbook() {
    if (quiz) { toast('Během testu je příručka zavřená 🙂'); return; }
    const maxCh = P ? Math.max(1, ...LEVELS.filter((l, i) => isUnlocked(i)).map(l => l.chapter)) : 1;
    const sections = HANDBOOK.filter(h => h.chapter <= maxCh).map(h => `
      <section class="hb">
        <h3>${esc(h.title)}</h3>
        ${h.items ? `<ul class="api">${h.items.map(k => `<li><code class="${BUILTINS[k].kind === 'sensor' ? 'tk-sen' : 'tk-cmd'}">${esc(BUILTINS[k].sig)}</code> ${esc(BUILTINS[k].desc)}</li>`).join('')}</ul>` : ''}
        ${h.code ? `<pre class="code">${highlight(h.code)}</pre>` : ''}
        ${h.text ? `<p>${esc(h.text)}</p>` : ''}
      </section>`).join('');
    const open = P ? LEVELS.filter((l, i) => isUnlocked(i) && LESSONS[l.id]) : [];
    const lessonList = open.length ? `<section class="hb"><h3>📖 Lekce s příklady</h3><p class="muted small">Ke každé odemčené misi patří lekce. Robot ti v ní příklad předvede na malé mapě.</p><div class="hb-lessons">${open.map(l => `<button class="btn small" data-lesson="${l.id}">${l.id} ${esc(LESSONS[l.id].title.replace(/`/g, ''))}</button>`).join('')}</div></section>` : '';
    const hb = modal(`<h2>📘 Příručka programátora</h2>
      <p class="muted small">Robot rozumí podmnožině JavaScriptu: <code>let</code>, <code>const</code>, <code>if</code>/<code>else</code>, <code>for</code>, <code>while</code>, <code>function</code>, <code>return</code>, <code>break</code>, <code>continue</code>. Středníky jsou nepovinné. Další části příručky se odemknou s kapitolami.</p>
      ${sections}
      ${lessonList}
      <p class="muted small">Klávesy v editoru: <kbd>Ctrl</kbd>+<kbd>Enter</kbd> spustí program, <kbd>Tab</kbd> odsadí, <kbd>Ctrl</kbd>+<kbd>Z</kbd> vrátí změnu.</p>`, { cls: 'wide' });
    // Lekce z příručky: „Zpět do příručky“ příručku znovu otevře a vrátí fokus na lekci, ze které hráč přišel.
    $$('[data-lesson]', hb).forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.lesson;
      const lv = LEVELS.find(l => l.id === id);
      const m = Lesson.open({ modal, lesson: LESSONS[id], kicker: `Lekce k misi ${id}${lv ? ': ' + lv.title : ''}`, back: 'Zpět do příručky', mountOpts: LESSON_OPTS });
      const back = $('.modal-box > .btn-row [data-close]', m);
      if (back) back.addEventListener('click', () => setTimeout(() => {
        showHandbook();
        const nb = $(`.modal [data-lesson="${id}"]`);
        if (nb) nb.focus();
      }));
    }));
  }

  /* ------------------------------------------------------------------ *
   *  Výsledky a měření pokroku
   * ------------------------------------------------------------------ */
  function summary() {
    const qs = T => {
      const n = T.answers.length;
      const correct = T.answers.filter(a => a.correct).length;
      return { n, correct, pctv: pct(correct, n), ratio: n ? correct / n : 0, dunno: T.answers.filter(a => a.dontKnow).length, timeMs: T.answers.reduce((a, x) => a + x.timeMs, 0) };
    };
    const pre = qs(P.pre), post = qs(P.post);
    const gain = pre.ratio < 1 && post.n ? (post.ratio - pre.ratio) / (1 - pre.ratio) : null;
    const lv = LEVELS.map(l => ({ l, s: P.levels[l.id] })).filter(o => o.s);
    const solved = lv.filter(o => o.s.solved);
    const runs = lv.reduce((a, o) => a + o.s.runs, 0);
    const errors = {};
    lv.forEach(o => Object.entries(o.s.errors).forEach(([k, v]) => { errors[k] = (errors[k] || 0) + v; }));
    const firstTry = solved.filter(o => o.s.solvedAtRun === 1).length;
    const stars = starCount();
    const used = new Set();
    solved.forEach(o => (o.s.used || []).forEach(u => used.add(u)));
    const index = Math.round(0.5 * post.pctv + 0.3 * pct(solved.length, LEVELS.length) + 0.2 * pct(stars, LEVELS.length * 3));
    const ranks = [
      [95, '🏆', 'Hacker legenda', 'Kód píšeš jako básník a ladíš jako detektiv.'],
      [80, '🧑‍💻', 'Senior developer', 'Cykly, podmínky i funkce máš v malíčku.'],
      [60, '💻', 'Medior developer', 'Základy programování ti jdou. Zbývá vychytat detaily.'],
      [40, '⌨️', 'Junior developer', 'Rozjíždíš to! Každá chyba tě něco naučila.'],
      [0, '🐣', 'Stážista', 'Začátek je za tebou. Zkus mise znovu a sbírej hvězdy.']
    ];
    const rank = ranks.find(r => index >= r[0]);
    return { pre, post, gain, solved: solved.length, skipped: lv.filter(o => o.s.skipped && !o.s.solved).length, runs, errors, firstTry, stars, used: [...used], index, rank,
      avgRuns: solved.length ? solved.reduce((a, o) => a + o.s.solvedAtRun, 0) / solved.length : 0,
      timeMin: Math.round(lv.reduce((a, o) => a + o.s.timeMs, 0) / 60000),
      hints: lv.reduce((a, o) => a + o.s.hints, 0) };
  }

  function showResults(fresh) {
    if (!P || P.post.answers.length < QUIZ.A.length) return showMap();
    const R = summary();
    if (R.post.correct > R.pre.correct) award('growth');
    if (fresh) {
      const hist = read(HISTORY, []);
      hist.unshift({ date: new Date().toISOString(), name: P.name, pre: R.pre.pctv, post: R.post.pctv, solved: R.solved, stars: R.stars, index: R.index, rank: R.rank[2] });
      write(HISTORY, hist.slice(0, 20));
    }
    const conceptRows = Object.keys(CONCEPTS).map(c => {
      const a = P.pre.answers.find(x => x.c === c);
      const b = P.post.answers.find(x => x.c === c);
      const mark = x => (!x ? '–' : x.correct ? '<span class="ok">✔</span>' : x.dontKnow ? '<span class="dk">?</span>' : '<span class="bad">✗</span>');
      const trend = a && b ? (!a.correct && b.correct ? '<span class="ok">↑ naučeno</span>' : a.correct && !b.correct ? '<span class="bad">↓</span>' : a.correct ? 'umíš' : '<span class="bad">procvičit</span>') : '';
      return `<tr><td>${esc(CONCEPTS[c])}</td><td>${mark(a)}</td><td>${mark(b)}</td><td>${trend}</td></tr>`;
    }).join('');
    const ERR = { syntax: 'Chyba v zápisu kódu', crash: 'Náraz do zdi', bug: 'Kousnutí bugem', laser: 'Zásah laserem', nobit: 'seber() na prázdném poli', infinite: 'Nekonečný cyklus', battery: 'Došla baterka', runtime: 'Chyba za běhu', problem: 'Nesplněný úkol', requirement: 'Chybějící funkce', ok: 'Úspěšné spuštění' };
    const errMax = Math.max(1, ...Object.values(R.errors));
    const errRows = Object.entries(R.errors).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
      `<div class="bar-row"><span class="bar-label">${esc(ERR[k] || k)}</span><span class="bar"><span class="${k === 'ok' ? 'hi' : 'lo'}" style="width:${pct(v, errMax)}%"></span></span><span class="bar-val">${v}</span></div>`).join('');
    const CONS = { for: 'cyklus for', while: 'cyklus while', if: 'podmínka if', else: 'else', sensor: 'senzory', not: 'negace !', logic: '&& / ||', variable: 'proměnné', function: 'vlastní funkce', call: 'volání funkce' };
    const chapters = CHAPTERS.map(ch => {
      const ls = LEVELS.filter(l => l.chapter === ch.id);
      const sv = ls.filter(l => P.levels[l.id] && P.levels[l.id].solved);
      const avg = sv.length ? (sv.reduce((a, l) => a + P.levels[l.id].solvedAtRun, 0) / sv.length).toFixed(1).replace('.', ',') : '–';
      return `<tr><td>${ch.icon} ${esc(ch.title)}</td><td>${sv.length}/${ls.length}</td><td>${avg}</td><td>${ls.reduce((a, l) => a + (P.levels[l.id] ? P.levels[l.id].stars.filter(Boolean).length : 0), 0)}/${ls.length * 3}</td></tr>`;
    }).join('');
    const hist = read(HISTORY, []);
    showScreen(`
      <section class="card res-hero result">
        <div class="rank-icon">${R.rank[1]}</div>
        <div>
          <h1>${esc(P.name)}: ${R.rank[2]}</h1>
          <p>${R.rank[3]}</p>
          <div class="index">Vývojářský index <b>${R.index}</b>/100</div>
          <p class="muted small" style="margin:.4rem 0 0">50 % výstupní test, 30 % vyřešené mise, 20 % hvězdy.</p>
        </div>
        <div class="prepost">
          <div class="pp"><b>${R.pre.correct}/${R.pre.n}</b><small>před hrou</small></div>
          <span class="arrow" aria-hidden="true">→</span>
          <div class="pp after"><b>${R.post.correct}/${R.post.n}</b><small>po hře</small></div>
        </div>
      </section>
      <div class="grid-2">
        <section class="card">
          <h2>Měření pokroku</h2>
          <div class="bar-row"><span class="bar-label">Vstupní test</span><span class="bar big"><span class="pre" style="width:${R.pre.pctv}%"></span></span><span class="bar-val">${R.pre.correct}/${R.pre.n}</span></div>
          <div class="bar-row"><span class="bar-label">Výstupní test</span><span class="bar big"><span class="post" style="width:${R.post.pctv}%"></span></span><span class="bar-val">${R.post.correct}/${R.post.n}</span></div>
          <div class="stat-row">
            <div class="stat"><b class="${R.post.pctv - R.pre.pctv > 0 ? 'up' : ''}">${R.post.pctv - R.pre.pctv > 0 ? '+' : ''}${R.post.pctv - R.pre.pctv} p. b.</b><small>změna úspěšnosti</small></div>
            <div class="stat"><b>${R.gain === null ? '—' : Math.round(R.gain * 100) + ' %'}</b><small>normalizovaný zisk</small></div>
            <div class="stat"><b>${R.pre.dunno} → ${R.post.dunno}</b><small>odpovědí „Nevím“</small></div>
          </div>
          <table class="tbl"><thead><tr><th>Dovednost</th><th>Před</th><th>Po</th><th></th></tr></thead><tbody>${conceptRows}</tbody></table>
        </section>
        <section class="card">
          <h2>Jak se ti programovalo</h2>
          <div class="stat-row">
            <div class="stat"><b>${R.solved}/${LEVELS.length}</b><small>vyřešených misí</small></div>
            <div class="stat"><b>${R.stars}/${LEVELS.length * 3}</b><small>hvězd</small></div>
            <div class="stat"><b>${R.firstTry}</b><small>vyřešeno napoprvé</small></div>
            <div class="stat"><b>${String(R.avgRuns.toFixed(1)).replace('.', ',')}</b><small>spuštění na misi</small></div>
            <div class="stat"><b>${R.hints}</b><small>nápověd</small></div>
            <div class="stat"><b>${R.timeMin} min</b><small>čistý čas</small></div>
          </div>
          <table class="tbl"><thead><tr><th>Kapitola</th><th>Vyřešeno</th><th>Pokusů/misi</th><th>Hvězdy</th></tr></thead><tbody>${chapters}</tbody></table>
        </section>
      </div>
      <section class="card">
        <h2>Co se při ladění dělo</h2>
        <p class="muted small">Každé spuštění programu skončilo buď úspěchem, nebo nějakou chybou. Chyby jsou při programování normální – důležité je, že ses z nich dostal(a).</p>
        <div class="bars">${errRows || '<p class="muted">Zatím žádná data.</p>'}</div>
      </section>
      <section class="card">
        <h2>Co jsi použil(a) ve svém kódu</h2>
        <div class="cons">${Object.entries(CONS).map(([k, n]) => `<span class="con ${R.used.includes(k) ? 'on' : ''}">${R.used.includes(k) ? '✔' : '○'} ${n}</span>`).join('')}</div>
      </section>
      <section class="card">
        <h2>Odznaky <small class="muted">${P.badges.length} z ${Object.keys(BADGES).length}</small></h2>
        <div class="badges">${Object.entries(BADGES).map(([k, b]) => `<div class="badge ${P.badges.includes(k) ? 'got' : ''}" title="${esc(b.desc)}"><span>${b.icon}</span><b>${b.name}</b><small>${b.desc}</small></div>`).join('')}</div>
      </section>
      <section class="card">
        <h2>Historie v tomto prohlížeči</h2>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>Kdy</th><th>Hráč</th><th>Vstup</th><th>Výstup</th><th>Mise</th><th>Hvězdy</th><th>Úroveň</th></tr></thead><tbody>
          ${hist.slice(0, 8).map(h => `<tr><td>${new Date(h.date).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td>${esc(h.name)}</td><td>${h.pre} %</td><td>${h.post} %</td><td>${h.solved}</td><td>${h.stars}</td><td>${esc(h.rank)}</td></tr>`).join('')}
        </tbody></table></div>
      </section>
      <div class="btn-row center">
        <button class="btn primary big" data-action="map">🤖 Zpět k misím</button>
        <button class="btn ghost" data-action="export">⬇️ Stáhnout data (JSON)</button>
        <button class="btn ghost" data-action="newGame">↺ Nová hra</button>
      </div>`, 'Výsledky');
    if (fresh) { confetti(); sound('win'); }
  }

  function exportData() {
    const R = summary();
    const data = {
      game: 'Robot Bajt', version: 1, exportedAt: new Date().toISOString(),
      player: P.name, createdAt: P.createdAt, finishedAt: P.finishedAt || null,
      summary: { ...R, rank: R.rank[2], gain: R.gain === null ? null : +R.gain.toFixed(3) },
      preTest: P.pre, postTest: P.post,
      levels: Object.fromEntries(Object.entries(P.levels).map(([k, v]) => [k, { ...v, code: undefined, finalCode: v.code }])),
      badges: P.badges
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `robot-bajt-${P.name.replace(/[^\w-]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ------------------------------------------------------------------ *
   *  Události
   * ------------------------------------------------------------------ */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b || b.disabled) return;
    const a = b.dataset.action;
    switch (a) {
      case 'start': startGame(); break;
      case 'home': closeModal(); showIntro(); break;
      case 'map': closeModal(); showMap(); break;
      case 'newGame':
        confirmBox('Smaže se celý postup (mise, hvězdy, testy). Historie výsledků zůstane.', 'Začít znovu', () => { localStorage.removeItem(STORE); P = null; showIntro(); });
        break;
      case 'quizBegin': quizBegin(b.dataset.kind); break;
      case 'quizAnswer': quizAnswer(+b.dataset.choice); break;
      case 'openLevel': closeModal(); openLevel(b.dataset.id); break;
      case 'postTest':
        closeModal();
        if (!postUnlocked()) { toast(`Výstupní test se odemkne po vyřešení ${POST_UNLOCK} misí.`); break; }
        if (P.post.answers.length === QUIZ.A.length) confirmBox('Výstupní test už máš hotový. Chceš ho udělat znovu? Přepíše se předchozí výsledek.', 'Znovu', () => showQuizIntro('post'));
        else showQuizIntro('post');
        break;
      case 'results': showResults(false); break;
      case 'export': exportData(); break;
      case 'handbook': showHandbook(); break;
      case 'sound':
        settings.sound = !settings.sound;
        write(SETTINGS, settings);
        $('#soundBtn').textContent = settings.sound ? '🔊' : '🔇';
        break;
      case 'run': run(false); break;
      case 'step': run(true); break;
      case 'stop': stopRun(false); break;
      case 'fast': if (G && G.player) G.player.finishNow(); break;
      case 'snippet': if (G) { editor.insertSnippet(SNIPPETS[b.dataset.k]); updateSizeInfo(); } break;
      case 'hint': showHint(); break;
      case 'tour': startTour(); break;
      case 'lesson': openLessonModal(); break;
      case 'skip': skipLevel(); break;
      case 'resetCode':
        confirmBox('Tvůj kód se nahradí výchozím kódem mise.', 'Obnovit', () => { editor.value = G.level.starter || ''; L(G.level.id).code = editor.value; save(); updateSizeInfo(); });
        break;
      case 'viewTest': viewTest(+b.dataset.i); break;
      case 'gotoLine': editor.goToLine(+b.dataset.line); break;
      default: break;
    }
  });

  document.addEventListener('keydown', e => {
    if ($('.modal')) {
      if (e.key === 'Escape' && !$('.modal [data-go]')) closeModal();
      return;
    }
    if (quiz && !e.target.matches('input, textarea')) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 5) {
        const btns = $$('.answer');
        if (btns[n - 1]) btns[n - 1].click();
      }
      return;
    }
    if (e.target.matches('#name') && e.key === 'Enter') { startGame(); return; }
    if (G && (e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(false); }
  });

  document.addEventListener('visibilitychange', () => {
    if (!G) return;
    if (document.hidden) { L(G.level.id).timeMs += Math.round(performance.now() - G.openedAt); save(); }
    else G.openedAt = performance.now();
  });

  /* start */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (P && P.pre && P.pre.answers.length === QUIZ.A.length) showMap();
  else showIntro();

  window.__bajt = { get P() { return P; }, get G() { return G; }, openLevel, run, summary };
})();
