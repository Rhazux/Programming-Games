/*
 * CSS Parkour – aplikace: obrazovky, postup hráče, hvězdy, odznaky a měření pokroku
 */
(function () {
  'use strict';

  const { $, $$, esc } = Kit;
  const C = window.ParkourContent;
  const E = window.ParkourEngine;
  const LEVELS = C.LEVELS;
  const LESSONS = C.LESSONS || {};
  const MAX_STARS = LEVELS.length * 3;
  const KEY = 'cssParkour.v1';
  const app = $('#app');

  let P = Kit.read(KEY, null);
  let view = null;
  Kit.soundOn = Kit.read('cssParkour.sound', true);

  const FAIL = {
    lava: '🔥 Pixel spadl do lávy!',
    spikes: '🗡️ Au! Pixel narazil na bodáky.',
    fall: '🕳️ Pixel spadl mimo scénu.',
    stuck: '🔁 Pixel se zasekl – chodí sem a tam a k vlajce se nedostane.',
    timeout: '⏰ Čas vypršel.'
  };

  const BADGES = [
    { id: 'first', icon: '👣', name: 'První krůček', desc: 'Dokonči první level' },
    { id: 'oneshot', icon: '🎯', name: 'Na první dobrou', desc: 'Vyhraj level hned prvním spuštěním' },
    { id: 'world1', icon: '📏', name: 'Pán rozměrů', desc: 'Dokonči svět 1' },
    { id: 'world2', icon: '🧱', name: 'Flexbox ninja', desc: 'Dokonči svět 2' },
    { id: 'world3', icon: '🚀', name: 'Animátor', desc: 'Dokonči svět 3' },
    { id: 'inspector', icon: '🔍', name: 'Inspektor', desc: 'Prozkoumej box model inspektorem' },
    { id: 'debug', icon: '🐞', name: 'Lovec chyb', desc: 'Oprav chybu v CSS a vyhraj' },
    { id: 'nohints', icon: '🧠', name: 'Bez nápovědy', desc: 'Dokonči celý svět bez jediné nápovědy' },
    { id: 'lean', icon: '✂️', name: 'Úsporný kodér', desc: 'Získej 3 hvězdy v 6 levelech' },
    { id: 'all', icon: '🏁', name: 'Parkourista', desc: 'Dokonči všech 12 levelů' },
    { id: 'perfect', icon: '🌟', name: 'Perfekcionista', desc: 'Získej všech 36 hvězd' },
    { id: 'gain', icon: '📈', name: 'Velký skok', desc: 'Normalizovaný zisk v testech aspoň 0,5' }
  ];
  const RANKS = [[0, '🐣', 'Začátečník'], [10, '🎨', 'Stylista'], [20, '🥷', 'Layout ninja'], [30, '🧙', 'Mistr CSS']];

  /* ---------------- profil a postup ---------------- */
  function newProfile(name) {
    return { v: 1, name, form: Math.random() < 0.5 ? 'A' : 'B', pre: null, post: null, levels: {}, badges: [], events: [], inspector: false, fast: false, created: Date.now() };
  }
  const save = () => { if (P) Kit.write(KEY, P); topStats(); };
  const lvlState = id => P.levels[id] || (P.levels[id] = {
    done: false, stars: [false, false, false], runs: 0, runsTotal: 0, fails: {}, hints: 0, solution: false,
    warnRuns: 0, timeMs: 0, coins: 0, coinsTotal: 0, decl: null, code: null, firstTry: false, wonAt: null
  });
  const isDone = id => !!(P && P.levels[id] && P.levels[id].done);
  const unlocked = id => id === 1 || isDone(id - 1);
  const starCount = () => (P ? Object.values(P.levels).reduce((n, s) => n + s.stars.filter(Boolean).length, 0) : 0);
  const coinCount = () => (P ? Object.values(P.levels).reduce((n, s) => n + (s.coins || 0), 0) : 0);
  const coinTotal = () => LEVELS.reduce((n, l) => n + l.fixed.filter(f => f[1].includes('coin')).length, 0);
  const doneCount = () => LEVELS.filter(l => isDone(l.id)).length;
  const worldOf = l => C.WORLDS.find(w => w.id === l.world);
  const gainOf = () => (P && P.pre && P.post ? Kit.gain(Kit.quizStats(P.pre.answers).ratio, Kit.quizStats(P.post.answers).ratio) : null);
  const pad2 = n => String(n).padStart(2, '0');
  const fmtTime = ms => { const s = Math.round((ms || 0) / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`; };
  function logEvent(type, data) {
    P.events.push(Object.assign({ t: Date.now(), type }, data));
    if (P.events.length > 500) P.events.splice(0, P.events.length - 500);
  }

  function topStats() {
    $('#topStars').innerHTML = `<span class="ico">★</span>${starCount()}/${MAX_STARS}`;
    $('#topCoins').innerHTML = `<span class="ico">🪙</span>${coinCount()}`;
    $('#mapBtn').hidden = !(P && P.pre);
    $('#soundBtn').textContent = Kit.soundOn ? '🔊' : '🔇';
    $('#soundBtn').setAttribute('aria-pressed', String(Kit.soundOn));
  }
  function crumb(parts) {
    $('#crumb').innerHTML = parts.map((p, i) => (p.go ? `<button class="link" data-crumb="${i}">${esc(p.label)}</button>` : esc(p.label))).join(' › ');
    $$('#crumb [data-crumb]').forEach(b => b.addEventListener('click', () => parts[+b.dataset.crumb].go()));
  }
  function leave() {
    if (view && view.cleanup) view.cleanup();
    view = null;
    Kit.closeModal();
    window.scrollTo(0, 0);
  }
  /* scéna 800×400 se zmenší na šířku sloupce */
  function fit(wrap) {
    const frame = $('iframe', wrap);
    const apply = () => { frame.style.transform = `scale(${wrap.clientWidth / 800})`; };
    apply();
    if (window.ResizeObserver) { const ro = new ResizeObserver(apply); ro.observe(wrap); return () => ro.disconnect(); }
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }

  function checkBadges(ctx) {
    ctx = ctx || {};
    const earned = [];
    const award = id => { if (!P.badges.includes(id)) { P.badges.push(id); earned.push(id); } };
    const worldDone = w => LEVELS.filter(l => l.world === w.id).every(l => isDone(l.id));
    if (doneCount() >= 1) award('first');
    if (ctx.oneshot) award('oneshot');
    C.WORLDS.forEach(w => { if (worldDone(w)) award('world' + w.id); });
    if (P.inspector) award('inspector');
    if (ctx.debug) award('debug');
    if (C.WORLDS.some(w => worldDone(w) && LEVELS.filter(l => l.world === w.id).every(l => !P.levels[l.id].hints && !P.levels[l.id].solution))) award('nohints');
    if (Object.values(P.levels).filter(s => s.stars.every(Boolean)).length >= 6) award('lean');
    if (doneCount() === LEVELS.length) award('all');
    if (starCount() === MAX_STARS) award('perfect');
    const g = gainOf();
    if (g !== null && g >= 0.5) award('gain');
    earned.forEach((id, i) => {
      const b = BADGES.find(x => x.id === id);
      setTimeout(() => { Kit.toast(`🏅 Nový odznak: <b>${b.icon} ${esc(b.name)}</b>`, 3600); Kit.sound('star'); }, 700 + i * 800);
    });
    return earned;
  }

  /* ---------------- úvod ---------------- */
  function renderIntro() {
    leave();
    crumb([]);
    const cont = P
      ? `<div class="welcome">
           <p>Vítej zpět, <b>${esc(P.name)}</b>!</p>
           <p class="muted">Hotovo ${doneCount()} z ${LEVELS.length} levelů, ★ ${starCount()} z ${MAX_STARS}.</p>
         </div>
         <div class="btn-row"><button class="btn primary big" id="contBtn" data-focus>${P.pre ? 'Pokračovat ve hře' : 'Pokračovat vstupním testem'}</button>
           <button class="btn ghost" id="resetBtn">Začít znovu</button></div>`
      : `<label class="field">Jak ti máme říkat?<input id="name" maxlength="24" autocomplete="nickname" placeholder="tvoje jméno nebo přezdívka"></label>
         <div class="btn-row"><button class="btn primary big" id="startBtn">Začít hrát</button></div>`;
    app.innerHTML = `
      <section class="screen">
        <div class="intro">
          <div class="intro-copy">
            <h1 class="logo">CSS Parkour<small>Postav Pixelovi cestu</small></h1>
            <p class="lead">Pixel umí jen jedno: chodit rovně. Mosty, plošiny i výtahy mu postavíš <b>ty, skutečným CSS</b>.
              Každý řádek, který napíšeš, hned změní herní svět. Stačí chyba v jednotkách a Pixel skončí v lávě.</p>
            ${cont}
          </div>
          <div class="intro-visual demo">
            <div class="stage-wrap" id="demoWrap"><iframe title="Ukázka hry" tabindex="-1" aria-hidden="true"></iframe></div>
            <span class="demo-label">Ukázka: CSS staví most</span>
            <pre class="code demo-code" id="demoCode"></pre>
          </div>
        </div>
        <ol class="steps">
          <li><b>Vstupní test</b><small>10 otázek, asi 3 minuty. Zjistíme, co už umíš.</small></li>
          <li><b>12 levelů ve 3 světech</b><small>Rozměry a box model, flexbox, pozice, transformace a animace.</small></li>
          <li><b>Výstupní test a výsledky</b><small>Uvidíš, v čem ses zlepšil(a), dovednost po dovednosti.</small></li>
        </ol>
      </section>`;
    if (P) {
      $('#contBtn').addEventListener('click', () => (P.pre ? renderMap() : renderQuiz('pre')));
      $('#resetBtn').addEventListener('click', () => Kit.confirm('Smazat celý postup, hvězdy i výsledky testů?', 'Smazat a začít znovu', () => {
        localStorage.removeItem(KEY);
        P = null;
        topStats();
        renderIntro();
      }));
    } else {
      const go = () => {
        const name = $('#name').value.trim() || 'Parkourista';
        P = newProfile(name);
        logEvent('start', { form: P.form });
        save();
        Kit.sound('ok');
        renderQuiz('pre');
      };
      $('#startBtn').addEventListener('click', go);
      $('#name').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    }
    view = { cleanup: startDemo($('#demoWrap'), $('#demoCode')) };
  }

  /* ukázka na úvodu: most roste podle CSS a Pixel přeběhne */
  function startDemo(wrap, codeEl) {
    const unfit = fit(wrap);
    let alive = true;
    const timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (alive) f(); }, ms));
    const st = new E.Stage($('iframe', wrap), { end: () => later(cycle, 1700) });
    const show = w => {
      const css = `.bridge {\n  width: ${w}px;\n}`;
      st.setCss(css);
      codeEl.innerHTML = Highlight(css, 'css');
    };
    function cycle() {
      let w = 0;
      show(0);
      const grow = () => {
        w = Math.min(320, w + 10);
        show(w);
        if (w < 320) later(grow, 30);
        else later(() => st.start({}), 450);
      };
      later(grow, 900);
    }
    st.load(LEVELS[0], '').then(() => { if (alive) cycle(); });
    return () => { alive = false; timers.forEach(clearTimeout); st.stop(); unfit(); };
  }

  /* ---------------- testy ---------------- */
  function renderQuiz(which) {
    leave();
    const pre = which === 'pre';
    const form = pre ? P.form : (P.form === 'A' ? 'B' : 'A');
    crumb(pre ? [{ label: 'Vstupní test' }] : [{ label: 'Mapa', go: renderMap }, { label: 'Výstupní test' }]);
    app.innerHTML = `
      <section class="screen" id="quizBox">
        <div class="card narrow quiz-intro">
          <span class="pill">${pre ? 'Krok 1 ze 3' : 'Krok 3 ze 3'}</span>
          <h1>${pre ? 'Vstupní test' : 'Výstupní test'}</h1>
          <p class="lead">${pre
            ? 'Než vyrazíš, zjistíme, co už o CSS víš. Výsledek se nijak nehodnotí, slouží jen k porovnání s koncem hry.'
            : 'Ukaž, co ses naučil(a). Otázky jsou podobné jako na začátku, ale ne stejné. Každá míří na jednu dovednost z parkouru.'}</p>
          <ul>
            <li>10 otázek s výběrem odpovědi. Odpovídat můžeš i klávesami 1–5.</li>
            <li>Když nevíš, zvol <b>Nevím</b>. Je to poctivější než hádat a měření je pak přesnější.</li>
            <li>Správné odpovědi uvidíš ${pre ? 'na konci hry' : 'hned ve výsledcích'}.</li>
          </ul>
          <div class="btn-row"><button class="btn primary big" id="quizGo" data-focus>Začít test</button></div>
        </div>
      </section>`;
    $('#quizGo').addEventListener('click', () => {
      const quiz = Kit.runQuiz({
        container: $('#quizBox'),
        label: pre ? 'Vstupní test' : 'Výstupní test',
        items: C.QUIZ[form],
        highlight: Highlight,
        lang: 'css',
        onDone(answers) {
          view = null;
          P[which] = { form, answers, at: Date.now() };
          logEvent('quiz', { which, form, correct: answers.filter(a => a.correct).length });
          save();
          if (pre) afterPre(); else { checkBadges(); save(); renderResults(); Kit.confetti(['★', '{', '}', ';'], ['#22d3ee', '#f472b6', '#fde047', '#4ade80']); }
        }
      });
      view = { cleanup: () => quiz.stop() };
    });
  }

  /* skloňování: 1 deklarace / 2 deklarace / 5 deklarací (a „má 1 deklaraci“) */
  const declNom = n => (n >= 1 && n <= 4 ? 'deklarace' : 'deklarací');
  const declAcc = n => (n === 1 ? 'deklaraci' : n >= 2 && n <= 4 ? 'deklarace' : 'deklarací');

  function afterPre() {
    const s = Kit.quizStats(P.pre.answers);
    renderMap();
    const m = Kit.modal(`
      <h2>Vstupní test hotový</h2>
      <p>Správně <b>${s.correct} z ${s.n}</b>${s.dunno ? `, „nevím“ ${s.dunno}×` : ''}. Na konci uvidíš, o kolik ses posunul(a).</p>
      <p>Teď tě čeká <b>12 levelů</b>. V každém píšeš CSS, které mění herní svět, a pak pošleš Pixela k vlajce.</p>
      <ul class="vstats">
        <li class="ok">✏️ Scéna se mění hned, jak píšeš. Zkoušej a sleduj.</li>
        <li class="ok">🔍 Inspektor ukáže box model prvků: margin, border, padding a obsah.</li>
        <li class="ok">★ Hvězdy: za vlajku, za nejvýš 3 spuštění a za úsporné CSS.</li>
      </ul>
      <div class="btn-row"><button class="btn primary big" data-play data-focus>Hrát level 1</button><button class="btn ghost" data-close>Na mapu</button></div>`);
    $('[data-play]', m).addEventListener('click', () => renderLevel(1));
  }

  /* ---------------- mapa světů ---------------- */
  function renderMap() {
    leave();
    if (!P || !P.pre) { renderIntro(); return; }
    crumb([{ label: 'Mapa světů' }]);
    const done = doneCount();
    const nextId = (LEVELS.find(l => !isDone(l.id)) || {}).id;
    const canPost = done >= 8;
    const lvlBtn = l => {
      const s = P.levels[l.id];
      const open = unlocked(l.id);
      const cls = isDone(l.id) ? 'done' : l.id === nextId ? 'next' : open ? 'open' : 'locked';
      const stars = [0, 1, 2].map(i => `<i class="${s && s.stars[i] ? 'on' : ''}">★</i>`).join('');
      return `<button class="node ${cls}" data-lvl="${l.id}" ${open ? '' : 'disabled aria-disabled="true"'} aria-label="Level ${l.id}: ${esc(l.title)}">
          <span class="n-num">${open ? l.id : '🔒'}</span>
          <span class="n-title">${esc(l.title)}</span>
          <span class="n-sub">${esc(l.concept)}</span>
          <span class="n-stars" aria-label="${((n) => `${n} ${Kit.plural(n, 'hvězda', 'hvězdy', 'hvězd')} ze 3`)(s ? s.stars.filter(Boolean).length : 0)}">${stars}</span>
        </button>`;
    };
    const nextL = LEVELS.find(l => l.id === nextId);
    const nextW = nextL ? worldOf(nextL) : null;
    app.innerHTML = `
      <section class="screen">
        <div class="map-hero">
          <div>
            <h1>Mapa světů</h1>
            <p>Ahoj, ${esc(P.name)}! Každý svět je jedna oblast CSS. Další level se odemkne, jakmile dokončíš ten předchozí.</p>
            <div class="meter"><span class="bar"><span class="post" style="width:${Kit.pct(done, LEVELS.length)}%"></span></span>
              <span>${done}/${LEVELS.length} levelů</span><span class="muted">★ ${starCount()}/${MAX_STARS}</span></div>
          </div>
          <div class="btn-row">
            <button class="btn" id="cheatBtn">📖 Tahák</button>
            ${P.post ? '<button class="btn primary" id="resBtn">📊 Výsledky</button>' : ''}
          </div>
        </div>
        ${nextL ? `<div class="next-up">
            <span class="nu-num">${pad2(nextL.id)}</span>
            <div class="nu-text"><small>Pokračuj tady: svět ${nextW.id}, ${esc(nextW.title)}</small><b>${esc(nextL.title)}</b></div>
            <button class="btn primary big" data-lvl="${nextL.id}">▶ Hrát level ${nextL.id}</button>
          </div>` : ''}
        ${C.WORLDS.map(w => {
          const ls = LEVELS.filter(l => l.world === w.id);
          return `<section class="track w${w.id}">
            <div class="track-head"><span class="t-ico">${w.icon}</span><div><h2>Svět ${w.id}: ${esc(w.title)}</h2></div>
              <span class="t-count">${ls.filter(l => isDone(l.id)).length}/${ls.length} hotovo</span></div>
            <div class="nodes">${ls.map(lvlBtn).join('')}</div>
          </section>`;
        }).join('')}
        <section class="card final">
          <div>
            <h2>Výstupní test</h2>
            ${P.post
              ? `<p>Hotovo! Vstupní test ${Kit.quizStats(P.pre.answers).correct}/10, výstupní ${Kit.quizStats(P.post.answers).correct}/10.</p>`
              : canPost
                ? `<p>Máš za sebou ${done} levelů, můžeš si změřit pokrok. ${done < LEVELS.length ? 'Doporučujeme ale nejdřív dohrát všech 12.' : 'Gratulujeme k dohrání všech levelů!'}</p>`
                : `<p class="muted">Odemkne se po dokončení 8 levelů (zatím ${done}). Pak porovnáme, co jsi uměl(a) na začátku a co umíš teď.</p>`}
          </div>
          ${P.post ? '<button class="btn primary big" id="resBtn2">Zobrazit výsledky</button>'
            : canPost ? '<button class="btn primary big" id="postBtn">Spustit výstupní test</button>' : ''}
        </section>
      </section>`;
    $$('[data-lvl]').forEach(b => b.addEventListener('click', () => { Kit.sound('click'); renderLevel(+b.dataset.lvl); }));
    $('#cheatBtn').addEventListener('click', cheatSheet);
    ['#resBtn', '#resBtn2'].forEach(s => { const b = $(s); if (b) b.addEventListener('click', renderResults); });
    const pb = $('#postBtn');
    if (pb) pb.addEventListener('click', () => renderQuiz('post'));
  }

  // Lekce otevřená z taháku: tlačítko „Zpět k taháku“ tahák znovu otevře a vrátí fokus na lekci, ze které hráč přišel.
  function openLesson(v) {
    if (!v || !LESSONS[v.id]) return;
    const m = Lesson.open({ modal: Kit.modal, lesson: LESSONS[v.id], kicker: `Lekce k levelu ${v.id}: ${v.title}`, back: 'Zpět k taháku' });
    const back = Kit.$('.modal-box > .btn-row [data-close]', m);
    if (back) back.addEventListener('click', () => setTimeout(() => {
      cheatSheet();
      const b = Kit.$(`.modal [data-lesson="${v.id}"]`);
      if (b) b.focus();
    }));
  }

  function cheatSheet() {
    const lesBtn = x => LESSONS[x.id] ? `<button class="btn small" data-lesson="${x.id}">📖 Lekce s příkladem</button>` : '';
    const items = LEVELS.map(l => (isDone(l.id)
      ? `<div class="learn"><b>Level ${l.id}: <code>${esc(l.concept)}</code></b><p>${esc(l.learn.text)}</p><pre class="code">${Highlight(l.learn.code, 'css')}</pre>${lesBtn(l)}</div>`
      : unlocked(l.id) ? `<div class="learn"><b>Level ${l.id}: <code>${esc(l.concept)}</code></b><p class="small muted">Tenhle level tě ještě čeká. Lekci si můžeš projít už teď.</p>${lesBtn(l)}</div>`
      : `<div class="learn locked"><b>🔒 Level ${l.id}: <code>${esc(l.concept)}</code></b><p class="small muted">Odemkne se po dokončení levelu.</p></div>`)).join('');
    const cm = Kit.modal(`<h2>📖 Tahák CSS</h2><p class="muted small">Všechno, co sis v parkouru vyzkoušel(a), na jednom místě.</p><div class="cheat">${items}</div>`, { cls: 'wide' });
    Kit.$$('[data-lesson]', cm).forEach(btn => btn.addEventListener('click', () => openLesson(LEVELS.find(x => x.id === +btn.dataset.lesson))));
  }

  /* ---------------- level ---------------- */
  function renderLevel(id) {
    leave();
    const l = LEVELS.find(x => x.id === id);
    if (!l || !unlocked(id)) { renderMap(); return; }
    const w = worldOf(l);
    const ls = lvlState(id);
    const ses = { runs: 0, fails: 0, warned: false, solution: false, running: false, t0: performance.now(), an: null, runAn: null, runCss: '', timers: [] };
    const later = (f, ms) => ses.timers.push(setTimeout(f, ms));
    crumb([{ label: 'Mapa', go: renderMap }, { label: `Svět ${w.id}` }, { label: `Level ${l.id}: ${l.title}` }]);

    const lockRules = E.parseCss(l.lock.replace(/(^|\n)@/g, '$1')).rules;
    const prev = LEVELS.find(x => x.id === id - 1);
    const next = LEVELS.find(x => x.id === id + 1);
    app.innerHTML = `
      <section class="ws-screen fit">
        <header class="mbar">
          <span class="mb-num" aria-label="Level ${l.id}">${pad2(l.id)}</span>
          <div class="mb-text"><span class="mb-where">${w.icon} Svět ${w.id}: ${esc(w.title)}<code class="mb-concept" title="Co se v levelu procvičuje">${esc(l.concept)}</code></span><h1>${esc(l.title)}</h1></div>
          <div class="mb-right">
            <ul class="goals" id="goals" aria-label="Hvězdy za level"></ul>
            <nav class="mb-nav">
              <button class="icon-btn" id="prevBtn" title="Předchozí level" aria-label="Předchozí level" ${prev ? '' : 'disabled'}>◀</button>
              <button class="icon-btn" id="nextBtn" title="Další level" aria-label="Další level" ${next && isDone(id) ? '' : 'disabled'}>▶</button>
            </nav>
          </div>
        </header>
        <section class="panel brief brief-strip">
          <div class="bs-text">
            <p class="task"><b>Úkol:</b> ${Lesson.md(l.task)}</p>
            <p class="story">${esc(l.story)}</p>
            <p class="bonus-line"><span class="bl-star" aria-hidden="true">★</span> <b>Úsporné CSS:</b> stačí ${l.maxDecl} ${declNom(l.maxDecl)}. Deklarace je jeden řádek <code>vlastnost: hodnota;</code>. <span class="bs-state" id="declState" aria-live="polite"></span></p>
          </div>
          <div class="brief-actions">
            <button class="btn small" id="lessonBtn" title="Vlastnost z levelu na příkladu, který si můžeš hned vyzkoušet">📖 Lekce</button>
            <button class="btn small" id="hintBtn"></button>
            <button class="btn small ghost" id="tourBtn" title="Průvodce obrazovkou: co je kde a k čemu to slouží">❔ Průvodce</button>
            <button class="btn small ghost" id="solBtn" hidden>👀 Ukázat řešení</button>
          </div>
          <div class="hints" id="hints"></div>
        </section>
        <div class="ws wide-left">
          <div class="col">
            <section class="panel stage-panel world-pane">
              <div class="stage-wrap" id="stageWrap">
                <iframe id="stage" title="Herní scéna – výsledek tvého CSS"></iframe>
                <div class="banner" id="banner" hidden></div>
              </div>
              <div class="stage-tools">
                <button class="btn small" id="inspBtn" aria-pressed="false" title="Ukázat box model prvků pod myší">🔍 Inspektor box modelu</button>
                <button class="btn small" id="speedBtn" aria-pressed="${!!P.fast}" title="Zrychlit Pixela">⏩ Rychle 2×</button>
                <span class="coin-count" id="coins"></span>
              </div>
            </section>
          </div>
          <div class="col">
            <section class="panel code-pane">
              <div class="tabs" role="tablist">
                <button class="tab on" role="tab" data-tab="css">style.css <small>tvůj kód</small></button>
                <button class="tab" role="tab" data-tab="html">index.html</button>
                <button class="tab" role="tab" data-tab="level">level.css</button>
              </div>
              <div class="pane" data-pane="css">
                <div id="editor"></div>
                <details class="snips" data-snips="cssParkour.snips" ${Kit.snipsOpen('cssParkour.snips', window.innerHeight >= 820 || window.innerWidth < 1100) ? 'open' : ''}><summary>🧩 Vložit kód <small>klikni a vloží se do editoru</small></summary><div class="palette" id="palette"></div></details>
              </div>
              <div class="pane" data-pane="html" hidden>
                <pre class="code">${Highlight(E.visibleHtml(l), 'html')}</pre>
                <p class="pane-note">HTML scény. Podle tříd (<code>class</code>) a <code>id</code> píšeš selektory. HTML se měnit nedá, jen CSS.</p>
              </div>
              <div class="pane" data-pane="level" hidden>
                <pre class="code">${Highlight(l.css, 'css')}</pre>
                <p class="pane-note">CSS, které už level obsahuje. Tvoje <code>style.css</code> se načítá <b>po něm</b>, takže ho může přepsat.
                  Tyhle vlastnosti jsou ale <b>🔒 zamčené</b>, aby se úkol nedal obejít:</p>
                <ul class="lock-list">${lockRules.map(r => `<li><code>${esc(r.selector)}</code>: ${r.decls.map(d => esc(d.prop)).join(', ')}</li>`).join('')}
                  <li>kulisy (zem, láva, start, vlajka, mince) celé</li></ul>
              </div>
              <div class="runbar">
                <button class="btn go big" id="runBtn">▶ Spustit Pixela <kbd>Ctrl+Enter</kbd></button>
                <button class="btn big" id="stopBtn" hidden>⏹ Zastavit <kbd>Esc</kbd></button>
                <button class="btn ghost" id="resetBtn" title="Vrátit výchozí kód levelu">↺ Výchozí kód</button>
              </div>
              <div class="status" id="status" aria-live="polite"></div>
              <div class="console" id="console"><div id="anaLog"></div><div id="runLog"></div></div>
            </section>
          </div>
        </div>
      </section>`;

    const ed = new CodeEditor($('#editor'), { lang: 'css', tab: 2, onRun: () => run(), label: 'Editor style.css' });
    ed.value = ls.code != null ? ls.code : l.starter;
    const stage = new E.Stage($('#stage'), {
      coin: s => { Kit.sound('coin'); $('#coins').textContent = `🪙 ${s.coins.size}/${coinsHere}`; },
      land: () => Kit.sound('step'),
      end: r => onEnd(r)
    });
    const coinsHere = l.fixed.filter(f => f[1].includes('coin')).length;
    const unfit = fit($('#stageWrap'));
    let fast = !!P.fast;

    /* paleta: vlastnosti z levelu + symboly, které se na mobilu špatně píšou */
    const SYMS = ['{ }', ':', ';', 'px', '-'];
    $('#palette').innerHTML = l.props.map((p, i) => `<button class="chip" data-p="${i}">${esc(p)}</button>`).join('') +
      SYMS.map((s, i) => `<button class="chip sym" data-s="${i}">${esc(s)}</button>`).join('');
    $$('#palette [data-p]').forEach(b => b.addEventListener('click', () => insertProp(l.props[+b.dataset.p])));
    $$('#palette [data-s]').forEach(b => b.addEventListener('click', () => {
      const s = SYMS[+b.dataset.s];
      if (s === '{ }') ed.insertSnippet(' {\n  |\n}', true); else ed.insertSnippet(s + (s === ':' ? ' ' : '') + '|', true);
    }));
    function insertProp(p) {
      if (/\{\s*\}$/.test(p)) ed.insertSnippet(p.replace(/\{\s*\}$/, '{\n  |\n}'));
      else if (/;\s*$|\}\s*$/.test(p)) ed.insertSnippet(p);
      else ed.insertSnippet(p + '|', true);
      Kit.sound('type');
    }

    /* záložky */
    $$('.tab').forEach(t => t.addEventListener('click', () => {
      $$('.tab').forEach(x => x.classList.toggle('on', x === t));
      $$('.pane').forEach(p => { p.hidden = p.dataset.pane !== t.dataset.tab; });
      if (t.dataset.tab === 'css') ed.refresh();
    }));

    /* živý náhled – scéna se mění při psaní */
    let applyT = 0;
    let saveT = 0;
    ed.onChange(() => {
      ses.result = null;
      clearTimeout(applyT);
      applyT = setTimeout(() => { if (!ses.running) { stage.setCss(ed.value); analyze(); } }, 110);
      clearTimeout(saveT);
      saveT = setTimeout(() => { ls.code = ed.value; save(); }, 600);
    });

    function analyze() {
      if (!stage.doc) return null;
      const an = E.analyzeCss(ed.value, stage.doc);
      ses.an = an;
      $('#anaLog').innerHTML = an.warnings.length
        ? an.warnings.map(x => `<div class="log warn"><button class="line-link" data-line="${x.line}">ř. ${x.line}</button> ⚠ ${esc(x.msg)}</div>`).join('')
        : '';
      if (!ses.running && !ses.result) {
        if (an.warnings.length) Kit.status($('#status'), 'warn', `V CSS ${an.warnings.length === 1 ? 'je chyba' : an.warnings.length <= 4 ? `jsou ${an.warnings.length} chyby` : `je ${an.warnings.length} chyb`} (ř. ${an.warnings[0].line})`, 'Prohlížeč neplatné řádky potichu ignoruje. Oprav je, ať Pixel nespadne.');
        else Kit.status($('#status'), 'idle', ls.done ? 'Level máš hotový. Zkus získat všechny hvězdy.' : 'Napiš CSS a spusť Pixela', 'Scéna se mění hned, jak píšeš. Ctrl+Enter spustí Pixela.');
      }
      $$('#anaLog [data-line]').forEach(b => b.addEventListener('click', () => ed.goToLine(+b.dataset.line)));
      goals();
      return an;
    }
    function goals() {
      const runsNow = ls.done ? ses.runs : ls.runs;
      const d = ses.an ? ses.an.decls : '?';
      $('#goals').innerHTML = Kit.goals([
        { got: ls.stars[0], text: 'Dojít k vlajce', title: 'Hvězda za to, že Pixel dojde k vlajce' },
        { got: ls.stars[1], text: 'Nejvýš 3 spuštění', val: `${runsNow}/3`, title: `Hvězda za vyřešení nejvýš na 3 spuštění (${ls.done ? 'teď' : 'zatím'} ${runsNow})` },
        { got: ls.stars[2], text: `Nejvýš ${l.maxDecl} ${declNom(l.maxDecl)}`, val: `máš ${d}`, title: `Hvězda za úsporné CSS: nejvýš ${l.maxDecl} ${declNom(l.maxDecl)} (teď ${d})` }
      ]);
      const ds = $('#declState');
      if (ds && ses.an) {
        const n = ses.an.decls;
        const okD = n > 0 && n <= l.maxDecl;
        ds.textContent = n === 0 ? '· teď máš 0' : okD ? `✓ teď máš ${n}` : `· teď máš ${n}, o ${n - l.maxDecl} víc`;
        ds.classList.toggle('ok', okD);
      }
      if (!ses.running) $('#coins').textContent = `🪙 ${ls.coins || 0}/${coinsHere}`;
    }
    function runLog(text, cls) {
      $('#runLog').innerHTML = text ? `<div class="log ${cls || 'info'}">${text}</div>` : '';
    }
    let bannerT = 0;
    function banner(text, cls, ms) {
      const b = $('#banner');
      b.className = 'banner ' + cls;
      b.textContent = text;
      b.hidden = false;
      clearTimeout(bannerT);
      bannerT = setTimeout(() => { b.hidden = true; }, ms || 2600);
    }
    function setRunning(on) {
      ses.running = on;
      $('#runBtn').hidden = on;
      $('#stopBtn').hidden = !on;
      ed.setReadOnly(on);
      $$('#palette .chip').forEach(c => { c.disabled = on; });
      $('#resetBtn').disabled = on;
    }

    function run() {
      if (ses.running || !stage.doc) return;
      clearTimeout(applyT);
      stage.setCss(ed.value);
      const an = analyze();
      ses.runs++;
      if (!ls.done) ls.runs++;
      ls.runsTotal++;
      if (an.warnings.length) { ls.warnRuns++; ses.warned = true; ed.markError(an.warnings[0].line); } else ed.clearMarks();
      ses.runAn = an;
      ses.runCss = ed.value;
      setRunning(true);
      $('#banner').hidden = true;
      runLog(`▶ Spuštění č. ${ls.done ? ses.runs : ls.runs}: Pixel vyráží!`, 'info');
      ses.result = 'run';
      Kit.status($('#status'), 'run', 'Pixel běží…', 'Sleduj scénu. Esc ho zastaví.');
      goals();
      $('#coins').textContent = `🪙 0/${coinsHere}`;
      Kit.sound('whoosh');
      logEvent('run', { level: l.id, warnings: an.warnings.length, decl: an.decls });
      save();
      stage.start({ speed: fast ? 2 : 1 });
    }
    function stop() {
      if (!ses.running) return;
      stage.stop();
      stage.placeHero();
      setRunning(false);
      runLog('⏹ Zastaveno. Uprav CSS a zkus to znovu.', 'info');
      ses.result = null;
      Kit.status($('#status'), 'idle', 'Zastaveno', 'Uprav CSS a spusť Pixela znovu.');
    }
    function onEnd(r) {
      setRunning(false);
      if (r.win) onWin(r); else onFail(r);
    }
    function onFail(r) {
      ses.fails++;
      ls.fails[r.reason] = (ls.fails[r.reason] || 0) + 1;
      const msg = FAIL[r.reason] || 'Pixel to nezvládl.';
      banner(msg, 'bad');
      Kit.sound('fail');
      // vysvětlení: nejdřív chyba v zápisu CSS, pak co se v tomhle levelu nejspíš pokazilo, nakonec rada s nápovědou
      const w = ses.runAn && ses.runAn.warnings[0];
      let tip = '';
      if (w) tip = `Řádek ${w.line}: ${w.msg} Prohlížeč neplatné řádky potichu ignoruje, takže se neprojevily.`;
      else if (l.fails && l.fails[r.reason]) tip = l.fails[r.reason];
      else if (r.reason === 'stuck') tip = 'Zkontroluj, jestli cesta k vlajce nikde nekončí zdí nebo schodem.';
      if (ses.fails >= 2 && ls.hints < l.hints.length) tip += (tip ? ' ' : '') + 'Nevíš si rady? Zkus 💡 nápovědu.';
      runLog('', 'info');
      ses.result = 'fail';
      Kit.status($('#status'), 'bad', esc(msg), esc(tip) || 'Uprav CSS a zkus to znovu.');
      if (ses.fails >= 3 && ls.hints >= l.hints.length) $('#solBtn').hidden = false;
      logEvent('fail', { level: l.id, reason: r.reason });
      save();
      goals();
      later(() => { if (!ses.running && stage.doc) stage.placeHero(); }, 1900);
    }
    function onWin(r) {
      const an = ses.runAn;
      const first = !ls.done;
      const runsUsed = first ? ls.runs : ses.runs;
      const got = [true, runsUsed <= 3 && !ses.solution, an.decls <= l.maxDecl && !ses.solution];
      const before = ls.stars.slice();
      if (first) {
        addTime();
        ls.done = true;
        ls.firstTry = ls.runs === 1 && !ls.solution;
        ls.wonAt = Date.now();
        ls.decl = an.decls;
      } else ls.decl = Math.min(ls.decl == null ? 99 : ls.decl, an.decls);
      ls.stars = ls.stars.map((s, i) => s || got[i]);
      ls.coins = Math.max(ls.coins || 0, r.coins);
      ls.coinsTotal = r.coinsTotal;
      ls.code = ses.runCss;
      logEvent('win', { level: l.id, runs: runsUsed, decl: an.decls, stars: got.filter(Boolean).length, first, time: Math.round(r.time * 10) / 10 });
      const badges = checkBadges({ debug: ses.warned && !an.warnings.length, oneshot: ses.runs === 1 && !ses.solution });
      save();
      goals();
      banner('🏁 Vlajka! Level hotový!', 'good');
      ses.result = 'win';
      Kit.status($('#status'), 'ok', 'Vlajka! Level hotový.', `Hvězdy: ${got.filter(Boolean).length} ze 3`);
      Kit.sound('win');
      $('#nextBtn').disabled = !next;
      later(() => victory(got, before, runsUsed, an, r, badges), 1100);
    }
    /* hodnocení: u každé hvězdy věta, co se povedlo, a u chybějící, jak ji získat */
    function starRows(got, runsUsed, an, r) {
      const solCode = `<pre class="code">${Highlight(l.solution, 'css')}</pre>`;
      const rows = [
        { got: true, title: 'Pixel došel k vlajce', text: `Za ${Kit.fmt(r.time)} s. Mince: ${r.coins} z ${r.coinsTotal}.` },
        Kit.runsStar({ runs: runsUsed, limit: 3, solution: ses.solution, title: 'Nejvýš 3 spuštění', did: 'Pixela jsi spustil(a)', retry: 'Hrát znovu' }),
        ses.solution
          ? { got: false, title: `Úsporné CSS: nejvýš ${l.maxDecl} ${declNom(l.maxDecl)}`, text: 'Použil(a) jsi vzorové řešení, takže se tahle hvězda tentokrát nepočítá.', how: 'Klikni na <b>Hrát znovu</b> a napiš CSS po svém.' }
          : got[2]
            ? { got: true, title: `Úsporné CSS: nejvýš ${l.maxDecl} ${declNom(l.maxDecl)}`, text: `Tvoje CSS má ${an.decls} ${declAcc(an.decls)}. Nic zbytečného!` }
            : { got: false, title: `Úsporné CSS: nejvýš ${l.maxDecl} ${declNom(l.maxDecl)}`, text: `Tvoje CSS má ${an.decls} ${declAcc(an.decls)}, na hvězdu stačí ${l.maxDecl}.`, how: `<b>Jak na to:</b> nech jen řádky, které Pixel k vlajce opravdu potřebuje. Vzorové řešení si vystačí s ${l.maxDecl}:${solCode}` }
      ];
      return Kit.starReport(rows) + (got[2] || ses.solution ? Kit.solutionBox(`<p>Takhle to vyřešilo vzorové řešení:</p>${solCode}`, false) : '');
    }
    function victory(got, before, runsUsed, an, r, badges) {
      const m = Kit.modal(`
        <div class="victory">
          <div class="big-stars">${got.map((g, i) => `<i class="${ls.stars[i] ? 'on' : ''} ${ls.stars[i] && !before[i] ? 'new' : ''}" style="animation-delay:${0.15 + i * 0.25}s">★</i>`).join('')}</div>
          <h2>${got.every(Boolean) ? 'Dokonalé! Tři hvězdy!' : 'Level hotový!'}</h2>
          ${starRows(got, runsUsed, an, r)}
          <div class="learn"><b>📖 Tahák: <code>${esc(l.concept)}</code></b><p>${esc(l.learn.text)}</p><pre class="code">${Highlight(l.learn.code, 'css')}</pre></div>
          <div class="btn-row center">
            ${next ? '<button class="btn primary big" data-next data-focus>Další level</button>'
              : (P.post ? '<button class="btn primary big" data-res data-focus>📊 Výsledky</button>' : '<button class="btn primary big" data-post data-focus>Výstupní test</button>')}
            <button class="btn" data-retry>↺ Hrát znovu</button>
            <button class="btn ghost" data-map>🗺️ Mapa</button>
          </div>
        </div>`, { cls: 'win' });
      got.forEach((g, i) => { if (ls.stars[i]) setTimeout(() => Kit.sound('star'), 300 + i * 250); });
      if (got.every(Boolean)) Kit.confetti(['★', '{', '}', ';', 'px'], ['#22d3ee', '#f472b6', '#fde047', '#4ade80']);
      const on = (sel, f) => { const b = $(sel, m); if (b) b.addEventListener('click', f); };
      on('[data-next]', () => renderLevel(next.id));
      on('[data-post]', () => renderQuiz('post'));
      on('[data-res]', renderResults);
      on('[data-map]', renderMap);
      on('[data-retry]', () => { Kit.closeModal(); stage.placeHero(); ses.runs = 0; ses.solution = false; ses.result = null; analyze(); ed.focus(); });
      if (badges.length) logEvent('badges', { ids: badges });
    }
    function addTime() {
      if (!ls.done) ls.timeMs += Math.min(30 * 60 * 1000, performance.now() - ses.t0);
      ses.t0 = performance.now();
    }

    /* nápovědy, řešení, reset */
    function showHints() {
      $('#hints').innerHTML = l.hints.slice(0, ls.hints).map((h, i) => `<div class="hint"><b>💡 ${i + 1}.</b> ${Lesson.md(h)}</div>`).join('');
      const left = l.hints.length - ls.hints;
      $('#hintBtn').textContent = left ? `💡 Nápověda (${left})` : '💡 Nápovědy použity';
      $('#hintBtn').disabled = !left;
      if (!left && ses.fails >= 3) $('#solBtn').hidden = false;
    }
    $('#hintBtn').addEventListener('click', () => {
      if (ls.hints >= l.hints.length) return;
      ls.hints++;
      logEvent('hint', { level: l.id, n: ls.hints });
      save();
      showHints();
      Kit.sound('click');
    });
    $('#solBtn').addEventListener('click', () => Kit.confirm('Ukázat vzorové řešení? Level pak v tomhle pokusu dokončíš jen za 1 hvězdu – ale nejvíc se naučíš, když řešení pochopíš a pak ho zkusíš napsat sám/sama.', 'Ukázat řešení', () => {
      ses.solution = true;
      ls.solution = true;
      logEvent('solution', { level: l.id });
      ed.value = l.solution;
      stage.setCss(ed.value);
      analyze();
      save();
    }));
    $('#resetBtn').addEventListener('click', () => Kit.confirm('Vrátit výchozí kód levelu? Tvoje úpravy se smažou.', 'Vrátit výchozí kód', () => {
      ed.value = l.starter;
      stage.setCss(ed.value);
      analyze();
      ls.code = null;
      save();
    }));

    /* ovládání */
    $('#runBtn').addEventListener('click', run);
    $('#stopBtn').addEventListener('click', stop);
    $('#speedBtn').addEventListener('click', e => {
      fast = !fast;
      P.fast = fast;
      save();
      e.currentTarget.setAttribute('aria-pressed', String(fast));
    });
    $('#inspBtn').addEventListener('click', e => {
      const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
      e.currentTarget.setAttribute('aria-pressed', String(on));
      stage.setInspector(on);
      $('#stageWrap').classList.toggle('inspecting', on);
      if (on) {
        banner('🔍 Najeď myší na prvek scény: oranžová = margin, žlutá = border, zelená = padding, modrá = obsah', 'info', 4200);
        if (!P.inspector) { P.inspector = true; checkBadges(); save(); }
      }
    });
    $('#prevBtn').addEventListener('click', () => prev && renderLevel(prev.id));
    $('#nextBtn').addEventListener('click', () => next && isDone(id) && renderLevel(next.id));
    const onKey = e => {
      if (e.key === 'Escape' && ses.running && !$('.modal')) { e.preventDefault(); stop(); }
    };
    document.addEventListener('keydown', onKey);

    showHints();
    stage.load(l, ed.value).then(() => {
      analyze();
      runLog('', 'info');
    });
    /* průvodce obrazovkou: poprvé se spustí sám, pak tlačítkem ❔ */
    const focusEd = () => { if (window.matchMedia('(min-width: 1081px)').matches) ed.focus(); };
    const tourSteps = () => [
      { el: '.brief-strip .bs-text', title: 'Zadání', text: 'Co musí Pixel zvládnout. Pod zadáním je limit pro <b>úsporné CSS</b> (třetí hvězda) a kolik deklarací máš teď.' },
      { el: '#stageWrap', title: 'Herní svět', text: 'Svět je postavený z HTML a CSS. Tvoje CSS ho mění hned, jak píšeš: sleduj, jak se mosty a plošiny posouvají. Pixel vyběhne až po spuštění.' },
      { el: '.stage-tools', title: 'Nástroje', text: '🔍 <b>Inspektor</b> ukáže box model: obsah, padding, border a margin každého prvku. ⏩ Rychle zrychlí běh.' },
      { el: '.code-pane .tabs', title: 'Soubory', text: 'Píšeš do <code>style.css</code>. Záložky <code>index.html</code> a <code>level.css</code> ukazují zbytek světa: ty jen čteš, abys věděl(a), jaké třídy prvky mají.' },
      { el: '#editor', title: 'Tvoje CSS', text: 'Sem píšeš. Deklarace je jeden řádek <code>vlastnost: hodnota;</code>. 🧩 Vložit kód nabídne hotové kousky.' },
      { el: '#runBtn', title: 'Spustit Pixela', text: 'Pixel vyběhne a zkusí dojít k vlajce (nebo Ctrl+Enter). Spuštění se počítají: na hvězdu stačí nejvýš 3.' },
      { el: '#status', title: 'Hlášení', text: 'Tady se dozvíš, co se stalo: chyby v CSS s číslem řádku a proč Pixel spadl.' },
      { el: '#goals', title: 'Tři hvězdy', text: 'Vlajka, nejvýš 3 spuštění a úsporné CSS. U hvězd vidíš, jak na tom právě jsi.' },
      { el: '.brief-strip .brief-actions', title: 'Když nevíš kudy kam', text: '📖 <b>Lekce</b> vysvětlí vlastnost z levelu na příkladu, který si můžeš hned upravit. 💡 <b>Nápověda</b> radí postupně. Po všech nápovědách a třech pokusech se ukáže i řešení, ale level pak dostaneš jen za 1 hvězdu. ❔ Průvodce spustíš znovu.' }
    ];
    const TOUR_KEY = KEY + '.tour';
    const startTour = () => Tour.start(tourSteps(), { onEnd: () => { Kit.write(TOUR_KEY, true); focusEd(); } });
    $('#tourBtn').addEventListener('click', startTour);
    /* úvod levelu: příběh → lekce → úkol (poprvé sám, lekce pak tlačítkem 📖) */
    const intro = (first, onClose) => Lesson.intro({
      modal: Kit.modal, close: () => Kit.closeModal(), first, onClose,
      head: `<p class="b-kicker">${w.icon} Svět ${w.id}: ${esc(w.title)} · level ${l.id} z ${LEVELS.length}</p><h2>${esc(l.title)}</h2>`,
      story: Lesson.story('🏃', '', l.story),
      lesson: LESSONS[l.id],
      task: `<div class="st-task"><p><b>Úkol:</b> ${Lesson.md(l.task)}</p></div>`,
      stars: [
        { t: 'Doběhni k vlajce', d: 'Pixel doběhne k vlajce a nespadne do lávy ani na bodáky.' },
        { t: 'Nejvýš 3 spuštění', d: 'Změny vidíš na scéně hned, jak píšeš. Pixela pusť, až si budeš jistý(á).' },
        { t: 'Úsporné CSS', d: `Stačí ${l.maxDecl} ${declNom(l.maxDecl)}. Deklarace je jeden řádek \`vlastnost: hodnota;\`.` }
      ],
      done: 'Jdu na to 🏃'
    });
    $('#lessonBtn').addEventListener('click', () => Lesson.open({ modal: Kit.modal, lesson: LESSONS[l.id], kicker: `Lekce k levelu ${l.id}: ${l.title}`, back: 'Zpět k levelu' }));
    const afterIntro = () => { if (!Kit.read(TOUR_KEY, false)) later(startTour, 250); else focusEd(); };
    P.seen = P.seen || {};
    if (!P.seen[id] && LESSONS[id]) { P.seen[id] = true; save(); later(() => intro(true, afterIntro), 300); }
    else if (!Kit.read(TOUR_KEY, false)) later(startTour, 700);
    else setTimeout(focusEd, 50);
    view = {
      cleanup() {
        clearTimeout(applyT);
        clearTimeout(saveT);
        clearTimeout(bannerT);
        ses.timers.forEach(clearTimeout);
        ls.code = ed.value;
        addTime();
        save();
        stage.stop();
        unfit();
        document.removeEventListener('keydown', onKey);
      }
    };
  }

  /* ---------------- výsledky ---------------- */
  function renderResults() {
    leave();
    if (!P || !P.pre) { renderIntro(); return; }
    crumb([{ label: 'Mapa', go: renderMap }, { label: 'Výsledky' }]);
    const pre = Kit.quizStats(P.pre.answers);
    const post = P.post ? Kit.quizStats(P.post.answers) : null;
    const g = gainOf();
    const stars = starCount();
    const rank = RANKS.filter(r => stars >= r[0]).pop();
    const done = LEVELS.filter(l => isDone(l.id));
    const st = id => P.levels[id] || {};
    const firstTry = done.filter(l => st(l.id).firstTry).length;
    const avgRuns = done.length ? done.reduce((n, l) => n + st(l.id).runs, 0) / done.length : 0;
    const hints = LEVELS.reduce((n, l) => n + (st(l.id).hints || 0), 0);
    const time = done.reduce((n, l) => n + (st(l.id).timeMs || 0), 0);
    const warnRuns = LEVELS.reduce((n, l) => n + (st(l.id).warnRuns || 0), 0);
    const gainText = g === null ? '–' : Kit.fmt(g, 2);
    const review = (ans, form) => ans.map(a => {
      const q = C.QUIZ[form][a.q];
      return `<div class="rev"><b>${a.correct ? '<span class="ok">✔</span>' : a.dontKnow ? '<span class="dk">?</span>' : '<span class="bad">✗</span>'} ${esc(q.q)}</b>
        ${q.code ? `<pre class="code">${Highlight(q.code, 'css')}</pre>` : ''}
        <div class="small">${a.correct ? '' : `Tvoje odpověď: ${a.dontKnow ? 'nevím' : esc(q.a[a.choice])} · `}Správně: <b>${esc(q.a[q.ok])}</b></div></div>`;
    }).join('');
    app.innerHTML = `
      <section class="screen result">
        <div class="card res-hero">
          <div class="rank-icon">${rank[1]}</div>
          <div>
            <h1>${esc(P.name)}: ${rank[2]}</h1>
            <p>★ ${stars} z ${MAX_STARS}, hotovo ${done.length} z ${LEVELS.length} levelů, 🪙 ${coinCount()} z ${coinTotal()} mincí.</p>
            ${post ? `<div class="index">Normalizovaný zisk <b>g = ${gainText}</b></div>
              <p class="small muted" style="margin:.5rem 0 0">g říká, jakou část z toho, co jsi na začátku ještě neuměl(a), ses naučil(a): 0 = nic, 1 = všechno.</p>` : ''}
          </div>
          <div class="prepost">
            <div class="pp"><b>${pre.correct}/${pre.n}</b><small>před hrou</small></div>
            <span class="arrow" aria-hidden="true">→</span>
            <div class="pp after"><b>${post ? post.correct + '/' + post.n : '–'}</b><small>po hře</small></div>
          </div>
        </div>
        <div class="grid-2">
          <div class="card">
            <h2>Test před a po hře</h2>
            ${Kit.bar('Vstupní test', pre.pct, pre.correct + '/' + pre.n, 'pre')}
            ${post ? Kit.bar('Výstupní test', post.pct, post.correct + '/' + post.n, post.pct >= pre.pct ? 'post' : 'lo') : '<p class="muted">Výstupní test ještě čeká – najdeš ho na mapě.</p>'}
            <div class="stat-row">
              <div class="stat"><b>${pre.pct} %</b><small>před hrou</small></div>
              <div class="stat"><b class="${post && post.pct > pre.pct ? 'up' : ''}">${post ? post.pct + ' %' : '–'}</b><small>po hře</small></div>
              <div class="stat"><b>${pre.dunno} → ${post ? post.dunno : '–'}</b><small>odpovědí „nevím“</small></div>
            </div>
            ${post ? Kit.conceptTable(C.CONCEPTS, P.pre.answers, P.post.answers) : ''}
          </div>
          <div class="card">
            <h2>Jak se ti hrálo</h2>
            <div class="stat-row">
              <div class="stat"><b>${firstTry}</b><small>levelů na 1. pokus</small></div>
              <div class="stat"><b>${Kit.fmt(avgRuns)}</b><small>spuštění na level</small></div>
              <div class="stat"><b>${hints}</b><small>nápověd</small></div>
              <div class="stat"><b>${fmtTime(time)}</b><small>čas do výher</small></div>
            </div>
            <div class="table-wrap"><table class="tbl">
              <thead><tr><th>Level</th><th>★</th><th>Spuštění</th><th>Nápovědy</th><th>Deklarace</th><th>Čas</th></tr></thead>
              <tbody>${LEVELS.map(l => {
                const s = st(l.id);
                return `<tr><td>${l.id}. ${esc(l.title)}</td><td>${s.done ? '★'.repeat(s.stars.filter(Boolean).length) : '–'}</td>
                  <td>${s.done ? s.runs : s.runsTotal ? s.runsTotal + ' (nedokončeno)' : '–'}</td><td>${s.hints || 0}${s.solution ? ' + řešení' : ''}</td>
                  <td>${s.decl == null ? '–' : s.decl + ' / ' + l.maxDecl}</td><td>${s.done ? fmtTime(s.timeMs) : '–'}</td></tr>`;
              }).join('')}</tbody></table></div>
            <p class="small muted">Spuštění s chybou v CSS (neplatná hodnota, chybějící jednotka…): ${warnRuns}×</p>
          </div>
        </div>
        <div class="card">
          <h2>Odznaky <small class="muted">${P.badges.length} z ${BADGES.length}</small></h2>
          <div class="badges">${BADGES.map(b => `<div class="badge ${P.badges.includes(b.id) ? 'got' : ''}"><span>${b.icon}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div>
        </div>
        ${post ? `<div class="card"><details class="answers-review"><summary>Projít odpovědi výstupního testu (varianta ${P.post.form})</summary>${review(P.post.answers, P.post.form)}</details>
          <details class="answers-review"><summary>Projít odpovědi vstupního testu (varianta ${P.pre.form})</summary>${review(P.pre.answers, P.pre.form)}</details></div>` : ''}
        <div class="btn-row center">
          <button class="btn primary" id="mapBtn2">🗺️ Zpět na mapu</button>
          <button class="btn" id="expBtn">⬇️ Stáhnout výsledky (JSON)</button>
          <button class="btn ghost" id="cheat2">📖 Tahák</button>
        </div>
      </section>`;
    $('#mapBtn2').addEventListener('click', renderMap);
    $('#cheat2').addEventListener('click', cheatSheet);
    $('#expBtn').addEventListener('click', () => {
      Kit.download(`css-parkour-${P.name.replace(/[^\w-]+/g, '_')}.json`, exportData());
      Kit.toast('Výsledky staženy ✔');
    });
  }

  function exportData() {
    const pre = Kit.quizStats(P.pre.answers);
    const post = P.post ? Kit.quizStats(P.post.answers) : null;
    return {
      game: 'CSS Parkour', version: 1, exportedAt: new Date().toISOString(), player: P.name,
      tests: {
        pre: { form: P.pre.form, correct: pre.correct, n: pre.n, dontKnow: pre.dunno, answers: P.pre.answers },
        post: post ? { form: P.post.form, correct: post.correct, n: post.n, dontKnow: post.dunno, answers: P.post.answers } : null,
        normalizedGain: gainOf()
      },
      concepts: Object.keys(C.CONCEPTS).map(c => {
        const a = P.pre.answers.find(x => x.c === c);
        const b = P.post ? P.post.answers.find(x => x.c === c) : null;
        return { concept: c, label: C.CONCEPTS[c], pre: a ? a.correct : null, post: b ? b.correct : null };
      }),
      levels: LEVELS.map(l => Object.assign({ id: l.id, title: l.title, concept: l.concept, maxDecl: l.maxDecl }, P.levels[l.id] || { done: false })),
      totals: { stars: starCount(), maxStars: MAX_STARS, coins: coinCount(), levelsDone: doneCount() },
      badges: P.badges,
      events: P.events
    };
  }

  /* ---------------- horní lišta ---------------- */
  $('#homeBtn').addEventListener('click', renderIntro);
  $('#mapBtn').addEventListener('click', renderMap);
  $('#soundBtn').addEventListener('click', () => {
    Kit.soundOn = !Kit.soundOn;
    Kit.write('cssParkour.sound', Kit.soundOn);
    topStats();
    if (Kit.soundOn) Kit.sound('ok');
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  topStats();
  if (P && P.pre) renderMap(); else renderIntro();
})();
