/*
 * Autopilot Orel – aplikace: obrazovky, přehrávání letů, postup hráče, hvězdy, odznaky a měření pokroku
 */
(function () {
  'use strict';

  const { $, $$, esc } = Kit;
  const C = window.OrelContent;
  const S = window.OrelSim;
  const V = window.OrelScene;
  const PY = window.MiniPython;
  const LEVELS = C.LEVELS;
  const LESSONS = C.LESSONS || {};
  const MAX_STARS = LEVELS.length * 3;
  const KEY = 'autopilotOrel.v1';
  const app = $('#app');
  const fmt = S.fmt;

  let P = Kit.read(KEY, null);
  let view = null;
  Kit.soundOn = Kit.read('autopilotOrel.sound', true);

  const BADGES = [
    { id: 'first', icon: '🚀', name: 'Zážeh', desc: 'Dokonči první úroveň' },
    { id: 'oneshot', icon: '🎯', name: 'Na první pokus', desc: 'Vyřeš úroveň hned prvním spuštěním' },
    { id: 'feather', icon: '🪶', name: 'Pírko', desc: 'Dosedni rychlostí pod 0,5 m/s' },
    { id: 'ch1', icon: '🎛️', name: 'Absolvent simulátoru', desc: 'Dokonči kapitolu 1' },
    { id: 'ch2', icon: '🔥', name: 'Zkušební pilot', desc: 'Dokonči kapitolu 2' },
    { id: 'ch3', icon: '🌕', name: 'Moře klidu', desc: 'Dokonči kapitolu 3' },
    { id: 'alarm', icon: '🚨', name: 'GO na alarm 1202', desc: 'Překonej alarm 1202 a úroveň dokonči' },
    { id: 'crater', icon: '💥', name: 'Kráterolog', desc: 'Nabourej 10× a nevzdej to' },
    { id: 'nohints', icon: '🧠', name: 'Bez nápovědy', desc: 'Dokonči celou kapitolu bez nápovědy' },
    { id: 'all', icon: '🦅', name: 'Orel přistál', desc: 'Dokonči všech 12 úrovní' },
    { id: 'perfect', icon: '⭐', name: 'Legenda Řízení', desc: 'Získej všech 36 hvězd' },
    { id: 'gain', icon: '📈', name: 'Velký skok', desc: 'Normalizovaný zisk v testech aspoň 0,5' }
  ];
  const RANKS = [[0, '🧑‍🎓', 'Kadet'], [10, '🛰️', 'Letový inženýr'], [20, '🚀', 'Zkušební pilot'], [30, '🦅', 'Velitel mise Orel']];
  const WHO = { marketa: ['M', 'Markéta, vedoucí palubního softwaru'], capcom: ['Ř', 'Řízení letu'] };

  /* ---------------- profil ---------------- */
  function newProfile(name) {
    return { v: 1, name, form: Math.random() < 0.5 ? 'A' : 'B', pre: null, post: null, levels: {}, badges: [], events: [], errorTypes: {}, seen: {}, crashes: 0, alarms: 0, softest: null, created: Date.now() };
  }
  const save = () => { if (P) Kit.write(KEY, P); topStats(); };
  const lState = id => P.levels[id] || (P.levels[id] = {
    done: false, stars: [false, false, false], runs: 0, runsTotal: 0, hints: 0, solution: false, timeMs: 0, code: null,
    firstTry: false, wonAt: null, errors: {}, crashes: 0, alarm: false, bestTouch: null, bestFuel: null
  });
  const isDone = id => !!(P && P.levels[id] && P.levels[id].done);
  const unlocked = id => id === 1 || isDone(id - 1);
  const starCount = () => (P ? Object.values(P.levels).reduce((n, s) => n + s.stars.filter(Boolean).length, 0) : 0);
  const doneCount = () => LEVELS.filter(l => isDone(l.id)).length;
  const chapterOf = l => C.CHAPTERS.find(c => c.id === l.chapter);
  const gainOf = () => (P && P.pre && P.post ? Kit.gain(Kit.quizStats(P.pre.answers).ratio, Kit.quizStats(P.post.answers).ratio) : null);
  const fmtTime = ms => { const s = Math.round((ms || 0) / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`; };
  const pad2 = n => String(n).padStart(2, '0');
  const md = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const hl = code => Highlight(code, 'python');
  function logEvent(type, data) {
    P.events.push(Object.assign({ t: Date.now(), type }, data));
    if (P.events.length > 600) P.events.splice(0, P.events.length - 600);
  }

  function topStats() {
    $('#topStars').innerHTML = `<span class="ico">★</span>${starCount()}/${MAX_STARS}`;
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

  function checkBadges(ctx) {
    ctx = ctx || {};
    const earned = [];
    const award = id => { if (!P.badges.includes(id)) { P.badges.push(id); earned.push(id); } };
    const chDone = ch => LEVELS.filter(l => l.chapter === ch.id).every(l => isDone(l.id));
    if (doneCount() >= 1) award('first');
    if (ctx.oneshot) award('oneshot');
    if (P.softest !== null && P.softest < 0.5) award('feather');
    C.CHAPTERS.forEach(ch => { if (chDone(ch)) award('ch' + ch.id); });
    if (LEVELS.some(l => isDone(l.id) && P.levels[l.id].alarm)) award('alarm');
    if (P.crashes >= 10 && doneCount() >= 1) award('crater');
    if (C.CHAPTERS.some(ch => chDone(ch) && LEVELS.filter(l => l.chapter === ch.id).every(l => !P.levels[l.id].hints && !P.levels[l.id].solution))) award('nohints');
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

  /* ---------------- přehrávač letu (sdílený úvodem i úrovní) ---------------- */
  function makePlayer(canvas, graphCanvas, hooks) {
    const fv = new V.FlightView(canvas);
    const gr = graphCanvas ? new V.Graph(graphCanvas) : null;
    const pl = { fv, gr, t: 0, playing: false, speed: 1, raf: 0, last: 0, ended: false, loop: false };
    pl.load = (level, flight, res, opts) => {
      opts = opts || {};
      fv.set(level, flight, res);
      if (gr) gr.set(level, flight, res);
      pl.level = level;
      pl.res = res;
      pl.t = 0;
      pl.ended = false;
      pl.speed = opts.speed || pl.autoSpeed();
      if (hooks && hooks.onLoad) hooks.onLoad(pl);
      pl.frame();
      if (opts.play) pl.play(); else pl.pause();
    };
    pl.autoSpeed = () => {
      const d = fv.duration;
      const want = d / 7;
      return [1, 2, 4, 8, 16].find(s => s >= want) || 16;
    };
    pl.frame = () => {
      fv.draw(pl.t);
      if (gr) gr.draw(pl.t);
      if (hooks && hooks.onFrame) hooks.onFrame(pl, fv.stateAt(pl.t));
    };
    const tick = now => {
      if (!pl.playing) return;
      const dt = Math.min(0.1, (now - pl.last) / 1000);
      pl.last = now;
      pl.t = Math.min(fv.duration, pl.t + dt * pl.speed);
      pl.frame();
      if (pl.t >= fv.duration) {
        if (!pl.ended) { pl.ended = true; if (hooks && hooks.onEnd) hooks.onEnd(pl); }
        if (pl.loop) { pl.loopWait = (pl.loopWait || 0) + dt; if (pl.loopWait > 2.2) { pl.loopWait = 0; pl.t = 0; pl.ended = false; } }
        else { pl.playing = false; if (hooks && hooks.onState) hooks.onState(pl); return; }
      }
      pl.raf = requestAnimationFrame(tick);
    };
    pl.play = () => {
      if (pl.t >= fv.duration) { pl.t = 0; pl.ended = false; }
      pl.playing = true;
      pl.last = performance.now();
      cancelAnimationFrame(pl.raf);
      pl.raf = requestAnimationFrame(tick);
      if (hooks && hooks.onState) hooks.onState(pl);
    };
    pl.pause = () => { pl.playing = false; cancelAnimationFrame(pl.raf); if (hooks && hooks.onState) hooks.onState(pl); };
    pl.seek = t => {
      pl.t = Math.max(0, Math.min(fv.duration, t));
      if (pl.t < fv.duration) pl.ended = false;
      pl.frame();
      if (pl.t >= fv.duration && !pl.ended) { pl.ended = true; if (hooks && hooks.onEnd) hooks.onEnd(pl); }
    };
    pl.stop = () => { pl.playing = false; cancelAnimationFrame(pl.raf); };
    /* překreslení při změně velikosti okna (i když se nepřehrává) */
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(() => { if (!pl.playing && pl.res) pl.frame(); }); ro.observe(canvas); }
    pl.destroy = () => { pl.stop(); if (ro) ro.disconnect(); };
    return pl;
  }

  /* počáteční stav letu (před spuštěním simulace) */
  function previewRes(level, fl) {
    const R = Object.assign({}, level.rules, fl.rules);
    const g = S.makeGround(fl);
    const h = Math.max(fl.h, g(fl.x || 0));
    return { name: fl.name, frames: [[0, h, fl.v || 0, fl.x || 0, fl.vx || 0, 0, 0, fl.fuel !== undefined ? fl.fuel : R.fuel]], events: [], log: [], preview: true, gatesPassed: [], fuelStart: R.fuel };
  }

  /* ---------------- úvod ---------------- */
  function renderIntro() {
    leave();
    crumb([]);
    const cont = P
      ? `<div class="welcome">
           <p>Vítej zpět, <b>${esc(P.name)}</b>.</p>
           <p class="muted">Splněno ${doneCount()} z ${LEVELS.length} úrovní, ★ ${starCount()} z ${MAX_STARS}.</p>
         </div>
         <div class="btn-row"><button class="btn primary big" id="contBtn" data-focus>${P.pre ? 'Pokračovat v misi' : 'Pokračovat vstupním testem'}</button>
           <button class="btn ghost" id="resetBtn">Začít znovu</button></div>`
      : `<label class="field">Tvoje jméno v týmu<input id="name" maxlength="24" autocomplete="nickname" placeholder="např. Markéta"></label>
         <div class="btn-row"><button class="btn primary big" id="startBtn">Nastoupit do týmu</button></div>`;
    app.innerHTML = `
      <section class="screen">
        <div class="intro">
          <div class="intro-copy">
            <h1 class="logo">Autopilot <span>Orel</span></h1>
            <p class="lead">Přistávací modul Orel letí k Měsíci a v kabině nikdo nestihne řídit motor ručně. Píšeš <b>skutečný Python</b>, který desetkrát za sekundu rozhoduje o tahu motoru: zabrzdí pád, přeletí kráter a dosedne na plochu. Jestli přistaneš, nebo vyhloubíš nový kráter, záleží jen na tvém kódu.</p>
            ${cont}
          </div>
          <div class="intro-visual">
            <div class="window">
              <canvas id="demoCv" aria-label="Ukázka: Orel řízený programem v Pythonu přeletí kráter a přistane"></canvas>
              <div class="demo-tag" id="demoTag">Ukázka z finále: tenhle let řídí ${LEVELS[LEVELS.length - 1].solution.trim().split('\n').length} řádků Pythonu</div>
            </div>
          </div>
        </div>
        <ol class="steps">
          <li><b>Vstupní test</b><small>10 otázek, asi 3 minuty. Zjistíme, co už v Pythonu umíš.</small></li>
          <li><b>12 úrovní ve 3 kapitolách</b><small>Od prvního zážehu přes plynulé brzdění až k přistání v Moři klidu.</small></li>
          <li><b>Výstupní test a výsledky</b><small>Uvidíš, v čem ses zlepšil(a), dovednost po dovednosti.</small></li>
        </ol>
      </section>`;
    /* ukázkový let: finále řízené vzorovým řešením */
    let pl = null;
    try {
      const L = LEVELS[LEVELS.length - 1];
      const r = S.runLevel(L, L.solution);
      pl = makePlayer($('#demoCv'), null, {});
      pl.loop = true;
      pl.load(L, L.flights[0], r.flights[0], { speed: 2.5, play: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
    } catch (e) { console.error(e); }
    view = { cleanup: () => { if (pl) pl.destroy(); } };
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
        const name = $('#name').value.trim() || 'Pilot';
        P = newProfile(name);
        logEvent('start', { form: P.form });
        save();
        Kit.sound('ok');
        renderQuiz('pre');
      };
      $('#startBtn').addEventListener('click', go);
      $('#name').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    }
  }

  /* ---------------- testy ---------------- */
  function renderQuiz(which) {
    leave();
    const pre = which === 'pre';
    const form = pre ? P.form : (P.form === 'A' ? 'B' : 'A');
    crumb(pre ? [{ label: 'Vstupní test' }] : [{ label: 'Mapa mise', go: renderMap }, { label: 'Výstupní test' }]);
    app.innerHTML = `
      <section class="screen" id="quizBox">
        <div class="card narrow quiz-intro">
          <span class="pill">${pre ? 'Krok 1 ze 3' : 'Krok 3 ze 3'}</span>
          <h1>${pre ? 'Vstupní test' : 'Výstupní test'}</h1>
          <p class="lead">${pre
            ? 'Než tě pustíme k simulátoru, zjistíme, co už o Pythonu víš. Výsledek se nijak nehodnotí, slouží jen k porovnání s koncem hry.'
            : 'Ukaž, co ses naučil(a). Otázky jsou podobné jako na začátku, ale ne stejné. Každá míří na jednu dovednost z úrovní.'}</p>
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
        highlight: (code, lang) => (lang === 'text' ? esc(code) : hl(code)),
        lang: 'python',
        onDone(answers) {
          view = null;
          P[which] = { form, answers, at: Date.now() };
          logEvent('quiz', { which, form, correct: answers.filter(a => a.correct).length });
          save();
          if (pre) afterPre(); else { checkBadges(); save(); renderResults(); Kit.confetti(['🦅', '★', '🌕', '🚀'], ['#79e08f', '#ffc94a', '#9ecbff', '#eceae4']); }
        }
      });
      view = { cleanup: () => quiz.stop() };
    });
  }

  function afterPre() {
    const s = Kit.quizStats(P.pre.answers);
    renderMap();
    const m = Kit.modal(`
      <h2>Vstupní test hotový</h2>
      <p>Správně <b>${s.correct} z ${s.n}</b>${s.dunno ? `, „nevím“ ${s.dunno}×` : ''}. Na konci uvidíš, o kolik ses posunul(a).</p>
      <p>Čeká tě <b>12 úrovní</b>. V každé napíšeš kus palubního softwaru v Pythonu a simulátor s ním proletí několik letů.</p>
      <ul class="vstats">
        <li class="ok">▶ Spustit simulaci (Ctrl+Enter) proletí všechny lety. Uvidíš přistání i graf rychlosti.</li>
        <li class="ok">🐍 Chyby Pythonu ti palubní deník vysvětlí česky a ukáže řádek.</li>
        <li class="ok">★ Hvězdy: za splnění, za nejvýš 3 spuštění a za bonusový úkol.</li>
      </ul>
      <div class="btn-row"><button class="btn primary big" data-play data-focus>Začít úroveň 1</button><button class="btn ghost" data-close>Na mapu</button></div>`);
    $('[data-play]', m).addEventListener('click', () => renderLevel(1));
  }

  /* ---------------- mapa ---------------- */
  function renderMap() {
    leave();
    if (!P || !P.pre) { renderIntro(); return; }
    crumb([{ label: 'Mapa mise' }]);
    const done = doneCount();
    const nextId = (LEVELS.find(l => !isDone(l.id)) || {}).id;
    const canPost = done >= 8;
    const btn = l => {
      const s = P.levels[l.id];
      const open = unlocked(l.id);
      const cls = isDone(l.id) ? 'done' : l.id === nextId ? 'next' : open ? 'open' : 'locked';
      const stars = [0, 1, 2].map(i => `<i class="${s && s.stars[i] ? 'on' : ''}">★</i>`).join('');
      return `<button class="node ${cls}" data-l="${l.id}" ${open ? '' : 'disabled aria-disabled="true"'} aria-label="Úroveň ${l.id}: ${esc(l.title)}">
          <span class="n-num">${open ? l.id : '🔒'}</span>
          <span class="n-title">${esc(l.title)}</span>
          <span class="n-sub">${esc(l.concept)}</span>
          <span class="n-stars" aria-label="${s ? s.stars.filter(Boolean).length : 0} hvězd ze 3">${stars}</span>
        </button>`;
    };
    const nextL = LEVELS.find(l => l.id === nextId);
    const nextC = nextL ? chapterOf(nextL) : null;
    app.innerHTML = `
      <section class="screen">
        <div class="map-hero">
          <div>
            <h1>Mapa mise</h1>
            <p>${esc(P.name)}, úrovně se odemykají postupně. Každá končí sérií letů a projde jen funkční autopilot.</p>
            <div class="meter"><span class="bar"><span class="post" style="width:${Kit.pct(done, LEVELS.length)}%"></span></span>
              <span>${done}/${LEVELS.length} úrovní</span><span class="muted">★ ${starCount()}/${MAX_STARS}</span></div>
          </div>
          <div class="btn-row">
            <button class="btn" id="cheatBtn">📖 Tahák</button>
            ${P.post ? '<button class="btn primary" id="resBtn">📊 Výsledky</button>' : ''}
          </div>
        </div>
        ${nextL ? `<div class="next-up">
            <span class="nu-num">${pad2(nextL.id)}</span>
            <div class="nu-text"><small>Další úroveň: kapitola ${nextC.id}, ${esc(nextC.title)}</small><b>${esc(nextL.title)}</b></div>
            <button class="btn primary big" data-l="${nextL.id}">▶ Letět úroveň ${nextL.id}</button>
          </div>` : ''}
        ${C.CHAPTERS.map(ch => {
          const ls = LEVELS.filter(l => l.chapter === ch.id);
          return `<section class="track c${ch.id}">
            <div class="track-head"><span class="t-ico">${ch.icon}</span><div><h2>Kapitola ${ch.id}: ${esc(ch.title)}</h2><small>${esc(ch.desc)}</small></div>
              <span class="t-count">${ls.filter(l => isDone(l.id)).length}/${ls.length} hotovo</span></div>
            <div class="nodes">${ls.map(btn).join('')}</div>
          </section>`;
        }).join('')}
        <section class="card final">
          <div>
            <h2>Výstupní test</h2>
            ${P.post
              ? `<p>Hotovo! Vstupní test ${Kit.quizStats(P.pre.answers).correct}/10, výstupní ${Kit.quizStats(P.post.answers).correct}/10.</p>`
              : canPost
                ? `<p>Máš za sebou ${done} úrovní, můžeš si změřit pokrok. ${done < LEVELS.length ? 'Doporučujeme ale nejdřív dohrát všech 12.' : 'Orel přistál, gratulujeme!'}</p>`
                : `<p class="muted">Odemkne se po splnění 8 úrovní (zatím ${done}). Pak porovnáme, co jsi uměl(a) na začátku a co umíš teď.</p>`}
          </div>
          ${P.post ? '<button class="btn primary big" id="resBtn2">Zobrazit výsledky</button>'
            : canPost ? '<button class="btn primary big" id="postBtn">Spustit výstupní test</button>' : ''}
        </section>
      </section>`;
    $$('[data-l]').forEach(b => b.addEventListener('click', () => { Kit.sound('click'); renderLevel(+b.dataset.l); }));
    $('#cheatBtn').addEventListener('click', cheatSheet);
    ['#resBtn', '#resBtn2'].forEach(s => { const b = $(s); if (b) b.addEventListener('click', renderResults); });
    const pb = $('#postBtn');
    if (pb) pb.addEventListener('click', () => renderQuiz('post'));
  }

  function cheatSheet() {
    const lesBtn = x => LESSONS[x.id] ? `<button class="btn small" data-lesson="${x.id}">📖 Lekce s příkladem</button>` : '';
    const items = LEVELS.map(l => (isDone(l.id)
      ? `<div class="learn"><b>Úroveň ${l.id}: ${esc(l.concept)}</b><p>${md(l.learn[0])}</p><pre class="code">${hl(l.learn[1])}</pre>${lesBtn(l)}</div>`
      : unlocked(l.id) ? `<div class="learn"><b>Úroveň ${l.id}: ${esc(l.concept)}</b><p class="small muted">Tahle úroveň tě ještě čeká. Lekci si můžeš projít už teď.</p>${lesBtn(l)}</div>`
      : `<div class="learn locked"><b>🔒 Úroveň ${l.id}: ${esc(l.concept)}</b><p class="small muted">Odemkne se po splnění úrovně.</p></div>`)).join('');
    const cm = Kit.modal(`<h2>📖 Tahák Pythonu</h2><p class="muted small">Všechno, co ses v úrovních naučil(a), na jednom místě.</p><div class="cheat">${items}</div>`, { cls: 'wide' });
    Kit.$$('[data-lesson]', cm).forEach(btn => btn.addEventListener('click', () => openLesson(LEVELS.find(x => x.id === +btn.dataset.lesson))));
  }

  /* ---------------- briefing ---------------- */
  function briefing(l, first, onClose, start) {
    const msgs = l.brief.map(([who, text], i) => `<div class="msg ${who}" style="animation-delay:${first ? 0.25 + i * 0.7 : 0}s"><span class="ava" aria-hidden="true">${WHO[who][0]}</span><div class="bubble"><span class="who">${WHO[who][1]}</span>${md(text)}</div></div>`).join('');
    return Lesson.intro({
      modal: Kit.modal, close: () => Kit.closeModal(), first, animate: first, onClose, start,
      head: `<p class="b-kicker">${chapterOf(l).icon} Kapitola ${l.chapter}: ${esc(chapterOf(l).title)} · úroveň ${l.id} z ${LEVELS.length}</p><h2>${esc(l.title)}</h2>`,
      story: `<div class="radio">${msgs}</div>`,
      storyLabel: 'Briefing',
      lesson: LESSONS[l.id],
      task: `<div class="b-task"><b>Úkol:</b> ${md(l.task)}</div>`,
      stars: [
        { t: 'Všechny lety', d: 'Simulace pustí tvůj autopilot na několik letů a každý musí dopadnout dobře: měkké dosednutí a všechna pravidla úrovně.' },
        { t: 'Nejvýš 3 spuštění', d: 'Simulaci spusť nejvýš třikrát. Než ji pustíš, projdi si kód s čísly ze zadání.' },
        { t: 'Bonus navíc', d: l.bonus.text }
      ],
      done: 'Rozumím, jdu programovat 🚀'
    });
  }

  function openLesson(l) {
    if (LESSONS[l.id]) Lesson.open({ modal: Kit.modal, lesson: LESSONS[l.id], kicker: `Lekce k úrovni ${l.id}: ${l.title}`, back: 'Zpět k úrovni' });
  }

  /* ---------------- úroveň ---------------- */
  function renderLevel(id) {
    leave();
    const l = LEVELS.find(x => x.id === id);
    if (!l || !unlocked(id)) { renderMap(); return; }
    const ch = chapterOf(l);
    const ls = lState(id);
    const ses = { runs: 0, fails: 0, solution: false, t0: performance.now(), timers: [], running: false, res: null, sel: 0, speedFixed: null, sawAlarm: false };
    const later = (f, ms) => ses.timers.push(setTimeout(f, ms));
    crumb([{ label: 'Mapa mise', go: renderMap }, { label: `Kapitola ${ch.id}` }, { label: `${l.id}. ${l.title}` }]);
    const prev = LEVELS.find(x => x.id === id - 1);
    const next = LEVELS.find(x => x.id === id + 1);
    const R = Object.assign({ goal: 'land', maxTouch: 3, maxSide: 1, clamp: 'auto' }, l.rules);
    const file = l.io === 'pick' ? 'vyber_misto.py' : l.io === 'drop' ? 'sonda.py' : 'autopilot.py';

    /* pravidla letu jako štítky */
    const rules = [];
    if (R.goal === 'climb') rules.push(['🎯', `cíl: výška ${R.target} m`], ['⏱', `do ${R.timeLimit} s`]);
    if (R.goal === 'land') rules.push(['⬇', `dosednutí ≤ ${fmt(R.maxTouch)} m/s`]);
    if (R.goal === 'drop') rules.push(['🎯', `zásah do ${fmt(R.hitTol)} m od cíle`]);
    if (R.pad) rules.push(['▭', `plocha ±${fmt(R.pad.w / 2, 0)} m`]);
    if (l.side && R.goal === 'land') rules.push(['↔', `boční rychlost ≤ ${fmt(R.maxSide)} m/s`]);
    if (R.slopeMax) rules.push(['⛰', `sklon ≤ ${fmt(R.slopeMax)} m na 10 m`]);
    if (R.gates) R.gates.forEach(g => rules.push(['⛳', `${g.h} m: ≤ ${fmt(g.v)} m/s`]));
    if (R.ignitions) rules.push(['🔥', `nejvýš ${R.ignitions} zapálení`]);
    if (R.clamp === 'strict') rules.push(['⚠', 'tah jen 0–100']);
    if (R.int) rules.push(['#', 'tah jen celé číslo']);
    const tl = l.flights.map(f => f.rules && f.rules.timeLimit).filter(Boolean);
    if (tl.length) rules.push(['⏱', `okno ${tl.join(' / ')} s`]);
    rules.push(['⛽', `palivo ${R.fuel} kg`]);

    const sides = !!l.side && l.io !== 'drop';
    app.innerHTML = `
      <section class="ws-screen fit">
        <header class="mbar">
          <span class="mb-num" aria-label="Úroveň ${l.id}">${pad2(l.id)}</span>
          <div class="mb-text"><span class="mb-where">${ch.icon} Kapitola ${ch.id}: ${esc(ch.title)}<code class="mb-concept" title="Co se v úrovni procvičuje">${esc(l.concept)}</code></span><h1>${esc(l.title)}</h1></div>
          <div class="mb-right">
            <ul class="goals" id="goals" aria-label="Hvězdy za úroveň"></ul>
            <nav class="mb-nav">
              <button class="icon-btn" id="prevBtn" title="Předchozí úroveň" aria-label="Předchozí úroveň" ${prev ? '' : 'disabled'}>◀</button>
              <button class="icon-btn" id="nextBtn" title="Další úroveň" aria-label="Další úroveň" ${next && isDone(id) ? '' : 'disabled'}>▶</button>
            </nav>
          </div>
        </header>
        <section class="panel brief-strip">
          <div class="bs-text">
            <p class="task">${md(l.task)}</p>
            <ul class="rules" aria-label="Pravidla letu">${rules.map(([i, t]) => `<li><span aria-hidden="true">${i}</span>${esc(t)}</li>`).join('')}</ul>
            <p class="bonus-line"><span class="bl-star" aria-hidden="true">★</span> <b>Bonus navíc:</b> ${md(l.bonus.text)}</p>
          </div>
          <div class="brief-actions">
            <button class="btn small" id="briefBtn">📻 Briefing</button>
            <button class="btn small" id="lessonBtn" title="Nová věc z Pythonu na příkladu, který si můžeš hned spustit">📖 Lekce</button>
            <button class="btn small" id="hintBtn"></button>
            <button class="btn small ghost" id="tourBtn" title="Průvodce obrazovkou: co je kde a k čemu to slouží">❔ Průvodce</button>
            <button class="btn small ghost" id="solBtn" hidden>👀 Ukázat řešení</button>
          </div>
          <div class="hints" id="hints"></div>
        </section>
        <div class="ws wide-left">
          <div class="col flight-col">
            <section class="panel flight" aria-label="Simulace letu">
              <div class="fl-head">
                <div class="fl-tabs" id="tabs" role="tablist" aria-label="Lety">${l.flights.map((f, i) => `<button class="fl-tab ${i ? '' : 'on'}" role="tab" aria-selected="${i ? 'false' : 'true'}" data-f="${i}">${esc(f.name)}<i class="st" aria-hidden="true"></i></button>`).join('')}</div>
                <div class="fl-ctrl">
                  <button class="icon-btn" id="playBtn" title="Přehrát / pozastavit" aria-label="Přehrát">▶</button>
                  <button class="icon-btn" id="replayBtn" title="Přehrát znovu od začátku" aria-label="Přehrát znovu">↺</button>
                  <div class="speed" role="group" aria-label="Rychlost přehrávání">${[1, 2, 4, 8, 16].map(s => `<button data-s="${s}">${s}×</button>`).join('')}</div>
                  <button class="icon-btn" id="endBtn" title="Skočit na konec letu" aria-label="Na konec">⏭</button>
                </div>
              </div>
              <div class="fv-wrap">
                <canvas class="fv" id="fv" aria-label="Pohled na přistávací modul"></canvas>
                <div class="fv-banner" id="banner" aria-live="polite"></div>
              </div>
              <input class="scrub" id="scrub" type="range" min="0" max="1000" value="0" aria-label="Čas letu">
              <div class="dsky" id="dsky">
                <div class="cell"><small>Výška</small><b id="dH">–</b><em>m</em></div>
                <div class="cell"><small>Klesání</small><b id="dV">–</b><em>m/s</em></div>
                ${sides ? '<div class="cell"><small>Od plochy</small><b id="dX">–</b><em>m</em></div><div class="cell"><small>Bokem</small><b id="dVX">–</b><em>m/s</em></div>' : ''}
                <div class="cell"><small>Tah</small><b id="dT">–</b><em>%</em><span class="mini"><span id="dTb"></span></span></div>
                <div class="cell"><small>Palivo</small><b id="dF">–</b><em>kg</em><span class="mini"><span id="dFb"></span></span></div>
                <div class="cell"><small>Čas</small><b id="dC">–</b><em>s</em></div>
                <div class="lamps" aria-label="Kontrolky">
                  <span class="lamp" id="lC">Kontakt</span><span class="lamp" id="lF">Palivo</span><span class="lamp" id="lA">Alarm</span>
                </div>
              </div>
              <canvas class="graph" id="graph" aria-label="Graf výšky, rychlosti a tahu v čase"></canvas>
            </section>
          </div>
          <div class="col">
            <section class="panel code-pane">
              <div class="file-head"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>${file}<span class="sp"></span><button class="btn small ghost" id="resetBtn" title="Vrátit výchozí kód úrovně">↺ Výchozí kód</button></div>
              <div id="editor"></div>
              <details class="snips" data-snips="autopilotOrel.snips" ${Kit.snipsOpen('autopilotOrel.snips', false) ? 'open' : ''}><summary>🧩 Úryvky kódu <small>když nevíš, jak něco zapsat</small></summary><div class="palette" id="palette"></div></details>
              <div class="runbar">
                <button class="btn go big" id="runBtn">▶ Spustit simulaci <kbd>Ctrl+Enter</kbd></button>
              </div>
              <div class="status" id="status" aria-live="polite"></div>
              <div class="results">
                <div class="flights-sum" id="fsum"></div>
                <div class="tests" id="unit"></div>
                <div class="terminal" id="term"></div>
              </div>
            </section>
          </div>
        </div>
      </section>`;

    const ed = new CodeEditor($('#editor'), { lang: 'python', tab: 4, onRun: () => run(), label: 'Editor ' + file });
    ed.value = ls.code != null ? ls.code : l.starter;

    /* úryvky */
    const SYMS = [':', '()', '[]', '==', '+= '];
    $('#palette').innerHTML = l.palette.map((p, i) => `<button class="chip" data-p="${i}">${esc(p.replace(/\|/g, ''))}</button>`).join('') +
      SYMS.map((x, i) => `<button class="chip sym" data-s="${i}">${esc(x.trim())}</button>`).join('');
    $$('#palette [data-p]').forEach(b => b.addEventListener('click', () => {
      const p = l.palette[+b.dataset.p];
      if (/:\s*$/.test(p)) ed.insertSnippet(p + '\n    |');
      else ed.insertSnippet(p.includes('|') ? p : p + '|', true);
      Kit.sound('type');
    }));
    $$('#palette [data-s]').forEach(b => b.addEventListener('click', () => {
      const x = SYMS[+b.dataset.s];
      const map = { '()': '(|)', '[]': '[|]' };
      ed.insertSnippet(map[x] || x + '|', true);
      Kit.sound('type');
    }));
    let saveT = 0;
    ed.onChange(() => { clearTimeout(saveT); saveT = setTimeout(() => { ls.code = ed.value; save(); }, 600); });

    /* ---------- přehrávač a telemetrie ---------- */
    const lampOn = (el, on, cls) => { el.className = 'lamp' + (on ? ' on ' + cls : ''); };
    const pl = makePlayer($('#fv'), $('#graph'), {
      onFrame(p, s) {
        if (!s) return;
        const fl = l.flights[ses.sel];
        const g = S.makeGround(fl);
        const res = p.res;
        $('#dH').textContent = fmt(Math.max(0, s[1] - g(s[3])), 1);
        $('#dV').textContent = fmt(s[2], 1);
        if (sides) { $('#dX').textContent = fmt(s[3] - (R.pad ? R.pad.x : 0), 1); $('#dVX').textContent = fmt(s[4], 1); }
        $('#dT').textContent = fmt(s[5], 0);
        $('#dTb').style.width = Math.min(100, s[5]) + '%';
        const f0 = res.fuelStart || R.fuel;
        $('#dF').textContent = fmt(s[7], 1);
        $('#dFb').style.width = Kit.pct(s[7], f0) + '%';
        $('#dC').textContent = fmt(s[0], 1);
        const end = p.t >= p.fv.duration - 1e-6 && !res.preview;
        const alarmEv = (res.events || []).find(e => e.type === 'alarm');
        lampOn($('#lC'), end && res.touch && res.ok, 'green');
        lampOn($('#lF'), s[7] < f0 * 0.15, 'amber');
        lampOn($('#lA'), (alarmEv && p.t >= alarmEv.t) || (end && !res.ok), 'red');
        if (!ses.scrubbing) $('#scrub').value = Math.round((p.t / (p.fv.duration || 1)) * 1000);
        if (!end) banner(null);
      },
      onEnd(p) {
        const res = p.res;
        if (res.preview) return;
        banner(res);
        if (!ses.muteEnd) Kit.sound(res.ok ? 'ok' : res.reason === 'alarm1202' ? 'alarm' : 'fail');
        if (ses.onPlayEnd) { const f = ses.onPlayEnd; ses.onPlayEnd = null; f(); }
      },
      onState(p) {
        $('#playBtn').textContent = p.playing ? '❚❚' : '▶';
        $('#playBtn').setAttribute('aria-label', p.playing ? 'Pozastavit' : 'Přehrát');
        $$('.speed [data-s]').forEach(b => b.classList.toggle('on', +b.dataset.s === p.speed));
      }
    });
    function banner(res) {
      const b = $('#banner');
      if (!res) { if (b.dataset.on) { b.className = 'fv-banner'; b.innerHTML = ''; delete b.dataset.on; } return; }
      b.dataset.on = '1';
      const title = res.ok ? (res.reason === 'climbed' ? 'Cíl dosažen' : res.reason === 'hit' ? 'Zásah' : 'Orel přistál') : res.reason === 'alarm1202' ? 'Program alarm 1202' : res.reason === 'error' ? 'Chyba programu' : res.reason === 'fault' ? 'Porucha motoru' : res.reason === 'miss' ? 'Vedle' : res.reason === 'timeout' || res.reason === 'nodrop' ? 'Mise nesplněna' : 'Havárie';
      b.className = 'fv-banner show ' + (res.ok ? 'ok' : 'bad') + (R.goal === 'climb' ? ' low' : '');
      const sub = res.msg.replace(/^(Havárie|Porucha motoru): /, '');
      b.innerHTML = `<b>${esc(title)}</b><span>${esc(sub.charAt(0).toUpperCase() + sub.slice(1))}</span>`;
    }
    function showFlight(i, play) {
      ses.sel = i;
      $$('#tabs .fl-tab').forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-selected', String(k === i)); });
      const fl = l.flights[i];
      const res = ses.res && ses.res.flights[i] ? ses.res.flights[i] : previewRes(l, fl);
      pl.load(l, fl, res, { speed: ses.speedFixed || undefined, play: !!play && !res.preview });
      if (res.preview) pl.seek(0);
      renderLog();
    }
    $$('#tabs .fl-tab').forEach(t => t.addEventListener('click', () => { Kit.sound('click'); ses.onPlayEnd = null; showFlight(+t.dataset.f, true); }));
    $('#playBtn').addEventListener('click', () => { if (pl.res && pl.res.preview) return; if (pl.playing) pl.pause(); else pl.play(); });
    $('#replayBtn').addEventListener('click', () => { if (pl.res && pl.res.preview) return; pl.seek(0); pl.play(); });
    $('#endBtn').addEventListener('click', () => { pl.pause(); pl.seek(pl.fv.duration); });
    $$('.speed [data-s]').forEach(b => b.addEventListener('click', () => { ses.speedFixed = +b.dataset.s; pl.speed = ses.speedFixed; $$('.speed [data-s]').forEach(x => x.classList.toggle('on', x === b)); }));
    const scrub = $('#scrub');
    scrub.addEventListener('input', () => { ses.scrubbing = true; pl.pause(); pl.seek((scrub.value / 1000) * pl.fv.duration); });
    scrub.addEventListener('change', () => { ses.scrubbing = false; });

    /* ---------- palubní deník a souhrn letů ---------- */
    const term = $('#term');
    function errBlock(e) {
      const loc = e.line ? `Řádek ${e.line}${e.func ? ` (ve funkci ${esc(e.func)})` : ''}` : '';
      return `<div class="err">✘ ${loc ? loc + ': ' : ''}${esc(e.text)}</div>` +
        (e.czech ? `<div class="explain"><b>Co to znamená:</b> ${esc(e.czech)}${e.line ? ` <button class="line-link" data-line="${e.line}">ř. ${e.line}</button>` : ''}</div>` : '');
    }
    const prompt = cmd => `<div class="prompt">orel@palubni-pocitac:~$ <b>${esc(cmd)}</b></div>`;
    function renderLog() {
      const r = ses.res;
      if (!r) { term.innerHTML = prompt(`python3 ${file}`) + '<div class="out muted">Simulace zatím neběžela.</div>'; return; }
      let html = prompt(`python3 ${file}`);
      if (r.output) html += `<div class="out">${esc(r.output.slice(0, 2000))}</div>`;
      if (r.error) { term.innerHTML = html + errBlock(r.error); bindLines(); return; }
      if (r.missing) {
        const fresh = !new RegExp('def ' + r.missing + '\\(').test(l.starter);
        term.innerHTML = html + `<div class="err">✘ V kódu chybí funkce ${esc(r.missing)}()${fresh ? '' : ' – nesmazal(a) jsi ji, nebo jsi ji nepřejmenoval(a)?'}</div>` +
          (fresh ? `<div class="explain"><b>Co dělat:</b> funkci je potřeba napsat. Začni řádkem <code>def ${esc(r.missing)}(${r.missing === 'brzdna_draha' ? 'rychlost' : '…'}):</code> a pod něj odsazené tělo s <code>return</code>.</div>` : '');
        return;
      }
      const f = r.flights[ses.sel];
      if (!f) { term.innerHTML = html; return; }
      html += `<div class="log-h">Palubní deník: ${esc(f.name)}</div>`;
      const rows = [];
      (f.events || []).forEach(e => rows.push([e.t, e.type, e.text]));
      (f.log || []).forEach(([t, line]) => rows.push([t, 'print', line]));
      rows.sort((a, b) => a[0] - b[0] || (a[1] === 'print') - (b[1] === 'print'));
      html += rows.slice(0, 320).map(([t, type, text]) => `<div class="lg ${type}"><span class="lt">${fmt(t, 1).padStart(5, ' ')} s</span>${type === 'print' ? '<span class="pr">print</span> ' : ''}${esc(text)}</div>`).join('');
      if (f.logCut) html += `<div class="lg info">… a dalších ${f.logCut} řádků výpisu (print se volá při každém kroku, zkus vypisovat jen někdy)</div>`;
      html += `<div class="lg ${f.ok ? 'ok' : 'alarm'}"><span class="lt">${fmt(f.time, 1).padStart(5, ' ')} s</span>${f.ok ? '✔' : '✘'} ${esc(f.msg)}${f.detail ? ` – ${esc(f.detail)}` : ''}</div>`;
      if (f.error) html += errBlock(f.error);
      term.innerHTML = html;
      bindLines();
    }
    function bindLines() { $$('#term [data-line], #unit [data-line]').forEach(b => b.addEventListener('click', () => ed.goToLine(+b.dataset.line))); }
    function renderSummary() {
      const r = ses.res;
      const fsum = $('#fsum');
      if (!r || r.error || r.missing) { fsum.innerHTML = ''; return; }
      fsum.innerHTML = r.flights.map((f, i) => {
        const stats = [];
        if (f.touch && f.ok && R.goal === 'land') stats.push(`dosednutí ${fmt(f.touch.v)} m/s`);
        if (f.probe && f.probe.hit !== undefined) stats.push(`odchylka ${fmt(Math.abs(f.probe.hit))} m`);
        stats.push(`palivo ${fmt(f.fuelLeft, 0)} kg`, `${fmt(f.time, 1)} s`);
        return `<button class="fsum ${f.ok ? 'ok' : 'bad'} ${i === ses.sel ? 'on' : ''}" data-f="${i}" title="${esc(f.msg + (f.detail ? ' – ' + f.detail : ''))}"><span class="st">${f.ok ? '✔' : '✘'}</span><b>${esc(f.name)}</b><span class="m">${esc(f.msg)}</span><small>${esc(stats.join(' · '))}</small></button>`;
      }).join('');
      $$('#fsum [data-f]').forEach(b => b.addEventListener('click', () => { ses.onPlayEnd = null; showFlight(+b.dataset.f, true); renderSummary(); }));
      $$('#tabs .fl-tab').forEach((t, i) => { const f = r.flights[i]; t.querySelector('.st').textContent = f ? (f.ok ? '✔' : '✘') : ''; t.classList.toggle('ok', !!f && f.ok); t.classList.toggle('bad', !!f && !f.ok); });
    }
    function renderUnit() {
      const r = ses.res;
      const box = $('#unit');
      if (!l.unit || !r || r.error || r.missing) { box.innerHTML = ''; return; }
      const seen = new Set();
      box.innerHTML = `<div class="log-h">Testy funkce ${esc(l.unit.tests[0].call.split('(')[0])}()</div>` + r.unit.map(t => {
        if (t.pass) return `<div class="test pass"><span class="st">✔</span>${hl(t.call)} <span class="meta">→</span> ${esc(t.got)}</div>`;
        if (t.error && seen.has(t.error.text)) return `<div class="test fail"><span class="st">✘</span>${hl(t.call)} <span class="meta">– stejná chyba jako výše</span></div>`;
        if (t.error) seen.add(t.error.text);
        let body = `<div class="gotline">${hl(t.call)}</div><div><span class="meta">očekáváno:</span> ${esc(t.expected)}${t.tol ? ` <span class="meta">(± ${fmt(t.tol, 2)})</span>` : ''}</div>`;
        if (t.error) body += errBlock(t.error);
        else body += `<div><span class="meta">vráceno:</span> ${esc(t.got)}</div>${t.why ? `<div class="why">💡 ${esc(t.why)}</div>` : ''}`;
        return `<div class="test fail"><span class="st">✘</span><div class="tb">${body}</div></div>`;
      }).join('');
      bindLines();
    }

    function goals() {
      const runsNow = ls.done ? ses.runs : ls.runs;
      $('#goals').innerHTML = Kit.goals([
        { got: ls.stars[0], text: 'Všechny lety', title: 'Hvězda za to, že všechny lety dopadnou dobře' },
        { got: ls.stars[1], text: 'Nejvýš 3 spuštění', val: `${runsNow}/3`, title: `Hvězda za vyřešení nejvýš na 3 spuštění simulace (${ls.done ? 'teď' : 'zatím'} ${runsNow})` },
        { got: ls.stars[2], text: 'Bonus', title: 'Bonus navíc: ' + l.bonus.text.replace(/`/g, '') }
      ]);
    }
    const bonusLine = `Bonusová hvězda: ${esc(l.bonus.text)}`;
    Kit.status($('#status'), 'idle', ls.done ? 'Úroveň je splněná. Zkus získat všechny hvězdy.' : 'Napiš program a spusť simulaci', ls.done ? bonusLine : 'Ctrl+Enter spustí simulaci. Tvoje funkce pak řídí motor 10× za sekundu a graf ukáže, co se dělo.');

    /* ---------- spuštění ---------- */
    function run() {
      if (ses.running) return;
      ses.running = true;
      $('#runBtn').disabled = true;
      ed.clearMarks();
      pl.pause();
      Kit.status($('#status'), 'run', 'Simuluji lety…');
      setTimeout(() => {
        try { execute(); } catch (e) { console.error(e); Kit.status($('#status'), 'bad', 'Simulace selhala', esc(e.message)); } finally { ses.running = false; $('#runBtn').disabled = false; }
      }, 30);
    }

    function execute() {
      const code = ed.value;
      ses.runs++;
      if (!ls.done) ls.runs++;
      ls.runsTotal++;
      ls.code = code;
      const res = S.runLevel(l, code);
      ses.res = res;
      res.errorTypes.forEach(t => { ls.errors[t] = (ls.errors[t] || 0) + 1; P.errorTypes[t] = (P.errorTypes[t] || 0) + 1; });
      const crashes = res.flights.filter(f => f.touch && !f.ok && ['crash', 'tipped'].includes(f.reason)).length;
      ls.crashes += crashes;
      P.crashes += crashes;
      if (res.flights.some(f => f.reason === 'alarm1202') || res.unit.some(t => t.error && t.error.type === 'Timeout')) { ls.alarm = true; P.alarms++; ses.sawAlarm = true; }
      res.flights.forEach(f => {
        if (f.ok && f.touch && R.goal === 'land') {
          ls.bestTouch = ls.bestTouch === null ? f.touch.v : Math.min(ls.bestTouch, f.touch.v);
          P.softest = P.softest === null ? f.touch.v : Math.min(P.softest, f.touch.v);
        }
      });
      if (res.allPass) ls.bestFuel = Math.max(ls.bestFuel || 0, Math.min(...res.flights.map(f => f.fuelLeft)));
      logEvent('run', { level: l.id, passed: res.passed, total: res.total, unit: res.unit.filter(t => t.pass).length, error: res.error ? res.error.type : null, reasons: res.flights.map(f => f.reason) });

      renderSummary();
      renderUnit();
      const firstErr = res.error || (res.unit.find(t => t.error) || {}).error || (res.flights.find(f => f.error && f.error.line) || {}).error;
      if (firstErr && firstErr.line) ed.markError(firstErr.line);

      if (res.error) {
        Kit.status($('#status'), 'bad', `Program spadl: ${esc(res.error.type || 'chyba')}${res.error.line ? ` na řádku ${res.error.line}` : ''}`, esc(res.error.czech || res.error.text || ''));
        showFlight(0, false);
      } else if (res.missing) {
        Kit.status($('#status'), 'bad', `V kódu chybí funkce ${esc(res.missing)}()`, res.missing === 'brzdna_draha' ? 'Napiš ji: def brzdna_draha(rychlost): …' : 'Nepřejmenoval(a) jsi ji, nebo jsi nesmazal(a) řádek def?');
        showFlight(0, false);
      } else {
        const badUnit = res.unit.find(t => !t.pass);
        const badF = res.flights.findIndex(f => !f.ok);
        if (res.allPass) Kit.status($('#status'), 'ok', `Všechny lety úspěšné (${res.passed}/${res.total})`, res.bonus ? 'Bonus splněn, máš všechno.' : 'Bonus zatím ne. ' + bonusLine);
        else if (badUnit && badUnit.error && badUnit.error.type === 'Timeout') Kit.status($('#status'), 'bad', `Program alarm 1202 v ${esc(badUnit.call)}`, 'Funkce se zacyklila: podmínka cyklu while pořád platí. Mění se uvnitř cyklu proměnná, na které podmínka závisí?');
        else if (badUnit && badF >= 0) Kit.status($('#status'), 'bad', `Test funkce neprošel: ${esc(badUnit.call)}`, badUnit.error ? esc(badUnit.error.czech || badUnit.error.type) : `vrátila ${esc(badUnit.got)}, čeká se ${esc(badUnit.expected)}`);
        else if (badF >= 0) { const f = res.flights[badF]; Kit.status($('#status'), 'bad', `${esc(f.name)}: ${esc(f.msg)}`, esc(f.detail || '')); }
        else if (badUnit) Kit.status($('#status'), 'bad', `Lety prošly, ale test funkce ne: ${esc(badUnit.call)}`, badUnit.error ? esc(badUnit.error.czech || badUnit.error.type) : `vrátila ${esc(badUnit.got)}, čeká se ${esc(badUnit.expected)}`);
        const sel = badF >= 0 ? badF : 0;
        if (res.allPass) ses.onPlayEnd = () => onWin(res);
        showFlight(sel, true);
        renderSummary();
      }
      if (!res.allPass) onFail(res);
      save();
    }

    function onFail(res) {
      ses.fails++;
      if (res.error || res.missing) Kit.sound(res.error && /Syntax|Indentation/.test(res.error.type) ? 'error' : 'fail');
      if (ses.fails >= 2 && ls.hints < l.hints.length) Kit.toast('💡 Zasekl(a) ses? Zkus nápovědu nad simulací.', 2600);
      if (ses.fails >= 3 && ls.hints >= l.hints.length) $('#solBtn').hidden = false;
      goals();
    }

    function onWin(res) {
      const first = !ls.done;
      const runsUsed = first ? ls.runs : ses.runs;
      const got = [true, runsUsed <= 3 && !ses.solution, res.bonus && !ses.solution];
      const before = ls.stars.slice();
      if (first) {
        addTime();
        ls.done = true;
        ls.firstTry = ls.runs === 1 && !ls.solution;
        ls.wonAt = Date.now();
      }
      ls.stars = ls.stars.map((x, i) => x || got[i]);
      logEvent('win', { level: l.id, runs: runsUsed, stars: got.filter(Boolean).length, first, bonus: res.bonus });
      const badges = checkBadges({ oneshot: ses.runs === 1 && !ses.solution });
      save();
      goals();
      Kit.sound('win');
      $('#nextBtn').disabled = !next;
      later(() => victory(got, before, runsUsed, res, badges), 700);
    }

    function victory(got, before, runsUsed, res, badges) {
      const fl = res.flights;
      const extra = R.goal === 'land' ? ` Nejměkčí dosednutí: ${fmt(Math.min(...fl.map(f => f.touch ? f.touch.v : 99)))} m/s.`
        : R.goal === 'drop' ? ` Největší odchylka sondy: ${fmt(Math.max(...fl.map(f => Math.abs(f.probe.hit))))} m.` : '';
      /* hodnocení: u každé hvězdy věta, co se povedlo, a u chybějící, jak ji získat */
      function starRows() {
        const solCode = `<pre class="code">${hl(l.solution)}</pre>`;
        const tip = Kit.bonusTip(l.hints);
        const rows = [
          { got: true, title: 'Všechny lety dopadly dobře', text: `Lety: ${res.passed} z ${res.total}${l.unit ? `, testy funkce ${res.unit.length} z ${res.unit.length}` : ''}.${extra} Nejmenší zbytek paliva: ${fmt(Math.min(...fl.map(f => f.fuelLeft)), 0)} kg.` },
          Kit.runsStar({ runs: runsUsed, limit: 3, solution: ses.solution, title: 'Nejvýš 3 spuštění', did: 'Simulaci jsi spustil(a)', retry: 'Zkusit znovu' }),
          got[2]
            ? { got: true, title: 'Bonus navíc', text: `${md(l.bonus.text)}. Povedlo se!` }
            : ses.solution
            ? { got: ls.stars[2], title: 'Bonus navíc', text: 'Se vzorovým řešením se bonusová hvězda nepočítá.' + (ls.stars[2] ? ' Hvězdu ale už máš z dřívějška.' : ''), how: `Klikni na <b>Zkusit znovu</b> a vyřeš to po svém, i s bonusem: ${md(l.bonus.text)}` }
            : { got: ls.stars[2], title: 'Bonus navíc', text: `Tentokrát ne. Bonus chtěl: ${md(l.bonus.text)}.${ls.stars[2] ? ' Hvězdu ale už máš z dřívějška.' : ''}`, how: `<b>Jak na to:</b> ${l.bonus.how ? md(l.bonus.how) + (l.bonus.example ? `<pre class="code">${hl(l.bonus.example)}</pre>` : '') : (tip ? md(tip) : 'Vzorové řešení bonus splňuje, porovnej ho se svým kódem.')}` }
        ];
        return Kit.starReport(rows) + Kit.solutionBox(`<p>Celé vzorové řešení. Tvoje řešení může vypadat jinak, důležité je, že všechny lety dopadnou dobře.</p>${solCode}`, false);
      }
      const mdl = Kit.modal(`
        <div class="victory">
          <div class="granted">${l.id === LEVELS.length ? '🦅 Orel přistál' : R.goal === 'climb' ? '🚀 Start úspěšný' : R.goal === 'drop' ? '🎯 Zásah' : '✔ Přistání úspěšné'}</div>
          <div class="big-stars">${got.map((g, i) => `<i class="${ls.stars[i] ? 'on' : ''} ${ls.stars[i] && !before[i] ? 'new' : ''}" style="animation-delay:${0.15 + i * 0.25}s">★</i>`).join('')}</div>
          ${starRows()}
          <div class="reward">📻 ${esc(l.reward)}</div>
          <div class="learn"><b>📖 Tahák: ${esc(l.concept)}</b><p>${md(l.learn[0])}</p><pre class="code">${hl(l.learn[1])}</pre></div>
          <div class="btn-row center">
            ${next ? '<button class="btn primary big" data-next data-focus>Další úroveň</button>'
              : (P.post ? '<button class="btn primary big" data-res data-focus>📊 Výsledky</button>' : '<button class="btn primary big" data-post data-focus>Výstupní test</button>')}
            <button class="btn" data-retry>↺ Zkusit znovu</button>
            <button class="btn ghost" data-map>🗺️ Mapa</button>
          </div>
        </div>`, { cls: 'win' });
      got.forEach((g, i) => { if (ls.stars[i]) setTimeout(() => Kit.sound('star'), 300 + i * 250); });
      if (got.every(Boolean) || l.id === LEVELS.length) Kit.confetti(['★', '🦅', '🌕', '✦'], ['#79e08f', '#ffc94a', '#9ecbff', '#eceae4']);
      const on = (sel, f) => { const b = $(sel, mdl); if (b) b.addEventListener('click', f); };
      on('[data-next]', () => renderLevel(next.id));
      on('[data-post]', () => renderQuiz('post'));
      on('[data-res]', renderResults);
      on('[data-map]', renderMap);
      on('[data-retry]', () => { Kit.closeModal(); ses.runs = 0; ses.solution = false; goals(); ed.focus(); });
      if (badges.length) logEvent('badges', { ids: badges });
    }

    function addTime() {
      if (!ls.done) ls.timeMs += Math.min(30 * 60 * 1000, performance.now() - ses.t0);
      ses.t0 = performance.now();
    }

    function showHints() {
      $('#hints').innerHTML = l.hints.slice(0, ls.hints).map((h, i) => `<div class="hint"><b>💡 ${i + 1}.</b> ${md(h)}</div>`).join('');
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
    $('#solBtn').addEventListener('click', () => Kit.confirm('Ukázat vzorové řešení? Úroveň pak v tomhle pokusu dokončíš jen za 1 hvězdu. Nejvíc se naučíš, když řešení projdeš řádek po řádku a pak ho zkusíš napsat sám/sama.', 'Ukázat řešení', () => {
      ses.solution = true;
      ls.solution = true;
      logEvent('solution', { level: l.id });
      ed.value = l.solution;
      save();
    }));
    $('#resetBtn').addEventListener('click', () => Kit.confirm('Vrátit výchozí kód úrovně? Tvoje úpravy se smažou.', 'Vrátit výchozí kód', () => {
      ed.value = l.starter;
      ls.code = null;
      save();
    }));
    $('#briefBtn').addEventListener('click', () => briefing(l, false));
    $('#lessonBtn').addEventListener('click', () => openLesson(l));
    $('#runBtn').addEventListener('click', run);
    $('#prevBtn').addEventListener('click', () => prev && renderLevel(prev.id));
    $('#nextBtn').addEventListener('click', () => next && isDone(id) && renderLevel(next.id));

    goals();
    showHints();
    renderLog();
    showFlight(0, false);
    const focusEd = () => { if (window.matchMedia('(min-width: 1100px)').matches) { ed.ta.setSelectionRange(0, 0); ed.ta.focus({ preventScroll: true }); } };
    /* průvodce obrazovkou: poprvé se spustí sám, pak tlačítkem ❔ */
    const tourSteps = () => [
      { el: '.brief-strip .bs-text', title: 'Zadání a pravidla letu', text: 'Co má Orel zvládnout, cíl, časový limit a palivo. Pod tím je <b>bonus navíc</b> za třetí hvězdu.' },
      { el: '.fv-wrap', title: 'Simulace', text: 'Tady uvidíš, jak tvůj program Orla řídí. Po spuštění si let přehraješ, zrychlíš a posuvníkem projdeš krok po kroku.' },
      { el: '#dsky', title: 'Přístroje', text: 'Výška, rychlost klesání, tah motoru, palivo a čas v každém okamžiku letu.' },
      { el: '#graph', title: 'Graf letu', text: 'Jak se během letu měnila výška, rychlost a tah. Podle grafu poznáš, kdy brzdíš moc pozdě nebo zbytečně brzy.' },
      { el: '#editor', title: 'Tvůj autopilot', text: 'Sem píšeš Python. Funkce <code>autopilot</code> dostane 10× za sekundu údaje z přístrojů a vrátí tah motoru v procentech. Co vypíšeš přes <code>print()</code>, uvidíš v palubním deníku.' },
      { el: '#runBtn', title: 'Spustit simulaci', text: 'Spustí všechny lety úrovně (nebo Ctrl+Enter). Na hvězdu stačí nejvýš 3 spuštění.' },
      { el: '.results', title: 'Výsledky a palubní deník', text: 'Které lety se povedly a proč ne, chyby Pythonu vysvětlené česky a výpisy z tvého programu.' },
      { el: '#goals', title: 'Tři hvězdy', text: 'Všechny lety, nejvýš 3 spuštění a bonus. Úroveň můžeš kdykoli zopakovat a hvězdy dobrat.' },
      { el: '.brief-strip .brief-actions', title: 'Když nevíš kudy kam', text: '📖 <b>Lekce</b> vysvětlí novou věc z Pythonu na příkladu, který si můžeš hned spustit a upravit. 💡 <b>Nápověda</b> radí postupně. Po všech nápovědách a třech pokusech se ukáže i řešení, ale jen za 1 hvězdu. 📻 Briefing znovu přehraje rádio a ❔ Průvodce tuhle prohlídku.' }
    ];
    const TOUR_KEY = KEY + '.tour';
    const startTour = () => Tour.start(tourSteps(), { onEnd: () => { Kit.write(TOUR_KEY, true); focusEd(); } });
    $('#tourBtn').addEventListener('click', startTour);
    const afterBrief = () => { if (!Kit.read(TOUR_KEY, false)) later(startTour, 250); else focusEd(); };
    if (!P.seen[id]) { P.seen[id] = true; save(); later(() => briefing(l, true, afterBrief), 150); }
    else if (!Kit.read(TOUR_KEY, false)) later(startTour, 400);
    else setTimeout(focusEd, 50);
    view = {
      cleanup() {
        clearTimeout(saveT);
        ses.timers.forEach(clearTimeout);
        pl.destroy();
        ls.code = ed.value;
        addTime();
        save();
      }
    };
  }

  /* ---------------- výsledky ---------------- */
  function renderResults() {
    leave();
    if (!P || !P.pre) { renderIntro(); return; }
    crumb([{ label: 'Mapa mise', go: renderMap }, { label: 'Výsledky' }]);
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
    const errs = Object.entries(P.errorTypes).sort((a, b) => b[1] - a[1]);
    const review = (ans, form) => ans.map(a => {
      const q = C.QUIZ[form][a.q];
      return `<div class="rev"><b>${a.correct ? '<span class="ok">✔</span>' : a.dontKnow ? '<span class="dk">?</span>' : '<span class="bad">✗</span>'} ${esc(q.q)}</b>
        ${q.code ? `<pre class="code">${hl(q.code)}</pre>` : ''}
        <div class="small">${a.correct ? '' : `Tvoje odpověď: ${a.dontKnow ? 'nevím' : esc(q.a[a.choice])} · `}Správně: <b>${esc(q.a[q.ok])}</b></div></div>`;
    }).join('');
    app.innerHTML = `
      <section class="screen result">
        <div class="card res-hero">
          <div class="rank-icon">${rank[1]}</div>
          <div>
            <h1>${esc(P.name)}: ${rank[2]}</h1>
            <p>★ ${stars} z ${MAX_STARS}, splněno ${done.length} z ${LEVELS.length} úrovní.</p>
            ${post ? `<div class="index">Normalizovaný zisk <b>g = ${g === null ? '–' : Kit.fmt(g, 2)}</b></div>
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
            <h2>Jak se ti programovalo</h2>
            <div class="stat-row">
              <div class="stat"><b>${firstTry}</b><small>úrovní na 1. pokus</small></div>
              <div class="stat"><b>${Kit.fmt(avgRuns)}</b><small>spuštění na úroveň</small></div>
              <div class="stat"><b>${hints}</b><small>nápověd</small></div>
              <div class="stat"><b>${P.crashes}</b><small>havárií cestou</small></div>
              <div class="stat"><b>${P.softest === null ? '–' : fmt(P.softest, 2)}</b><small>nejměkčí dosednutí (m/s)</small></div>
              <div class="stat"><b>${fmtTime(time)}</b><small>čas do splnění</small></div>
            </div>
            <div class="table-wrap"><table class="tbl">
              <thead><tr><th>Úroveň</th><th>★</th><th>Spuštění</th><th>Nápovědy</th><th>Havárie</th><th>Čas</th></tr></thead>
              <tbody>${LEVELS.map(l => {
                const s = st(l.id);
                return `<tr><td>${l.id}. ${esc(l.title)}</td><td>${s.done ? '★'.repeat(s.stars.filter(Boolean).length) : '–'}</td>
                  <td>${s.done ? s.runs : s.runsTotal ? s.runsTotal + ' (nesplněno)' : '–'}</td><td>${s.hints || 0}${s.solution ? ' + řešení' : ''}</td>
                  <td>${s.crashes || '–'}</td><td>${s.done ? fmtTime(s.timeMs) : '–'}</td></tr>`;
              }).join('')}</tbody></table></div>
            <p class="small muted" style="margin-bottom:.2rem">Chyby Pythonu, které jsi potkal(a) a překonal(a):</p>
            <div class="errlist">${errs.length ? errs.map(([t, n]) => `<span><b>${esc(t === 'Timeout' ? 'alarm 1202 (nekonečná smyčka)' : t === 'ReturnError' ? 'špatná návratová hodnota' : t)}</b> ×${n}</span>`).join('') : '<span>žádné – čistá práce!</span>'}</div>
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
      Kit.download(`autopilot-orel-${P.name.replace(/[^\w-]+/g, '_')}.json`, exportData());
      Kit.toast('Výsledky staženy ✔');
    });
  }

  function exportData() {
    const pre = Kit.quizStats(P.pre.answers);
    const post = P.post ? Kit.quizStats(P.post.answers) : null;
    return {
      game: 'Autopilot Orel', version: 1, exportedAt: new Date().toISOString(), player: P.name,
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
      levels: LEVELS.map(l => Object.assign({ id: l.id, title: l.title, concept: l.concept }, P.levels[l.id] || { done: false })),
      errorTypes: P.errorTypes,
      totals: { stars: starCount(), maxStars: MAX_STARS, levelsDone: doneCount(), crashes: P.crashes, alarms1202: P.alarms, softestTouchdown: P.softest },
      badges: P.badges,
      events: P.events
    };
  }

  /* ---------------- lišta ---------------- */
  $('#homeBtn').addEventListener('click', renderIntro);
  $('#mapBtn').addEventListener('click', renderMap);
  $('#soundBtn').addEventListener('click', () => {
    Kit.soundOn = !Kit.soundOn;
    Kit.write('autopilotOrel.sound', Kit.soundOn);
    topStats();
    if (Kit.soundOn) Kit.sound('ok');
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  topStats();
  if (P && P.pre) renderMap(); else renderIntro();
})();
