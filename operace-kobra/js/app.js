/*
 * Operace Kobra – aplikace: obrazovky, postup hráče, hvězdy, odznaky a měření pokroku
 */
(function () {
  'use strict';

  const { $, $$, esc } = Kit;
  const C = window.KobraContent;
  const H = window.KobraHarness;
  const MISSIONS = C.MISSIONS;
  const LESSONS = C.LESSONS || {};
  const MAX_STARS = MISSIONS.length * 3;
  const KEY = 'operaceKobra.v1';
  const app = $('#app');

  let P = Kit.read(KEY, null);
  let view = null;
  Kit.soundOn = Kit.read('operaceKobra.sound', true);

  const BADGES = [
    { id: 'first', icon: '🔌', name: 'Připojen', desc: 'Dokonči první misi' },
    { id: 'oneshot', icon: '🎯', name: 'Čistý zásah', desc: 'Vyřeš misi hned prvním spuštěním' },
    { id: 'crypto', icon: '🔐', name: 'Kryptograf', desc: 'Prolom Caesarovu šifru (mise 4)' },
    { id: 'sector1', icon: '🎓', name: 'Absolvent výcviku', desc: 'Dokonči sektor 1' },
    { id: 'sector2', icon: '📜', name: 'Datový analytik', desc: 'Dokonči sektor 2' },
    { id: 'sector3', icon: '🕵️', name: 'Lovec Šakala', desc: 'Dokonči sektor 3' },
    { id: 'bugs', icon: '🐞', name: 'Sběratel chyb', desc: 'Potkej 5 různých typů chyb – a nevzdej to' },
    { id: 'binary', icon: '✂️', name: 'Půlič', desc: 'Najdi kód v misi 10 nejvýš na 20 pokusů' },
    { id: 'nohints', icon: '🧠', name: 'Bez nápovědy', desc: 'Dokonči celý sektor bez nápovědy' },
    { id: 'all', icon: '🐍', name: 'Pythonista', desc: 'Dokonči všech 12 misí' },
    { id: 'perfect', icon: '⭐', name: 'Elitní agent', desc: 'Získej všech 36 hvězd' },
    { id: 'gain', icon: '📈', name: 'Velký skok', desc: 'Normalizovaný zisk v testech aspoň 0,5' }
  ];
  const RANKS = [[0, '🥚', 'Nováček'], [10, '🔎', 'Analytik'], [20, '🛡️', 'Specialista'], [30, '🐍', 'Elitní agent KOBRA']];

  /* ---------------- profil ---------------- */
  function newProfile(name) {
    return { v: 1, name, form: Math.random() < 0.5 ? 'A' : 'B', pre: null, post: null, missions: {}, badges: [], events: [], errorTypes: {}, seen: {}, created: Date.now() };
  }
  const save = () => { if (P) Kit.write(KEY, P); topStats(); };
  const mState = id => P.missions[id] || (P.missions[id] = {
    done: false, stars: [false, false, false], runs: 0, runsTotal: 0, hints: 0, solution: false, timeMs: 0, code: null,
    firstTry: false, wonAt: null, errors: {}, bestPassed: 0
  });
  const isDone = id => !!(P && P.missions[id] && P.missions[id].done);
  const unlocked = id => id === 1 || isDone(id - 1);
  const starCount = () => (P ? Object.values(P.missions).reduce((n, s) => n + s.stars.filter(Boolean).length, 0) : 0);
  const doneCount = () => MISSIONS.filter(m => isDone(m.id)).length;
  const sectorOf = m => C.SECTORS.find(s => s.id === m.sector);
  const gainOf = () => (P && P.pre && P.post ? Kit.gain(Kit.quizStats(P.pre.answers).ratio, Kit.quizStats(P.post.answers).ratio) : null);
  const fmtTime = ms => { const s = Math.round((ms || 0) / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`; };
  const pad2 = n => String(n).padStart(2, '0');
  const md = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
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
    const sectorDone = s => MISSIONS.filter(m => m.sector === s.id).every(m => isDone(m.id));
    if (doneCount() >= 1) award('first');
    if (ctx.oneshot) award('oneshot');
    if (isDone(4)) award('crypto');
    C.SECTORS.forEach(s => { if (sectorDone(s)) award('sector' + s.id); });
    if (Object.keys(P.errorTypes).length >= 5 && doneCount() >= 1) award('bugs');
    if (P.missions[10] && P.missions[10].stars[2]) award('binary');
    if (C.SECTORS.some(s => sectorDone(s) && MISSIONS.filter(m => m.sector === s.id).every(m => !P.missions[m.id].hints && !P.missions[m.id].solution))) award('nohints');
    if (doneCount() === MISSIONS.length) award('all');
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
  const BOOT = [
    ['', 'KOBRA OS 3.13 · zabezpečený terminál'],
    ['ok', '[ OK ] Načítám interpret Pythonu'],
    ['ok', '[ OK ] Šifrované spojení s velitelstvím navázáno'],
    ['warn', '[ !! ] Detekována aktivita hackerské skupiny ŠAKAL'],
    ['bad', '[ !! ] Napadené servery: 3 · uniklé účty: 1 204'],
    ['', '> Jednotka KOBRA hledá agenty, kteří umí Python.']
  ];
  function renderIntro() {
    leave();
    crumb([]);
    const cont = P
      ? `<div class="welcome">
           <p>Vítej zpět, agente <b>${esc(P.name)}</b>.</p>
           <p class="muted">Splněno ${doneCount()} z ${MISSIONS.length} misí, ★ ${starCount()} z ${MAX_STARS}.</p>
         </div>
         <div class="btn-row"><button class="btn primary big" id="contBtn" data-focus>${P.pre ? 'Pokračovat v misích' : 'Pokračovat vstupním testem'}</button>
           <button class="btn ghost" id="resetBtn">Začít znovu</button></div>`
      : `<label class="field">Krycí jméno agenta<input id="name" maxlength="24" autocomplete="nickname" placeholder="např. Zmije"></label>
         <div class="btn-row"><button class="btn primary big" id="startBtn">Nastoupit do služby</button></div>`;
    app.innerHTML = `
      <section class="screen">
        <div class="intro">
          <div class="intro-copy">
            <h1 class="logo">Operace<b>Kobra</b></h1>
            <p class="lead">Hackerská skupina <b>Šakal</b> útočí na město. Jako nový agent jednotky KOBRA píšeš <b>skutečný Python</b>:
              dešifruješ zachycené zprávy, analyzuješ logy, počítáš s bity, otevřeš trezor hrubou silou a nakonec Šakala dopadneš.</p>
            ${cont}
          </div>
          <div class="intro-visual boot-wrap">
            <div class="boot" id="boot" aria-live="polite"><div class="term-bar" aria-hidden="true"><i></i><i></i><i></i></div></div>
            <span class="stamp" aria-hidden="true">Přísně tajné</span>
          </div>
        </div>
        <ol class="steps">
          <li><b>Vstupní test</b><small>10 otázek, asi 3 minuty. Zjistíme, co už v Pythonu umíš.</small></li>
          <li><b>12 misí ve 3 sektorech</b><small>Funkce a podmínky, seznamy, slovníky a bity, nakonec algoritmy a hashe.</small></li>
          <li><b>Výstupní test a výsledky</b><small>Uvidíš, v čem ses zlepšil(a), dovednost po dovednosti.</small></li>
        </ol>
      </section>`;
    // bootovací sekvence
    const boot = $('#boot');
    const timers = [];
    BOOT.forEach(([cls, text], i) => timers.push(setTimeout(() => {
      const d = document.createElement('div');
      d.className = cls;
      d.textContent = text;
      boot.appendChild(d);
      if (i === BOOT.length - 1) { const c = document.createElement('span'); c.className = 'cursor'; d.appendChild(document.createTextNode(' ')); d.appendChild(c); }
      if (cls === 'bad') Kit.sound('type');
    }, 250 + i * 380)));
    view = { cleanup: () => timers.forEach(clearTimeout) };
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
        const name = $('#name').value.trim() || 'Zmije';
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
    crumb(pre ? [{ label: 'Vstupní test' }] : [{ label: 'Mapa', go: renderMap }, { label: 'Výstupní test' }]);
    app.innerHTML = `
      <section class="screen" id="quizBox">
        <div class="card narrow quiz-intro">
          <span class="pill">${pre ? 'Krok 1 ze 3' : 'Krok 3 ze 3'}</span>
          <h1>${pre ? 'Vstupní test' : 'Výstupní test'}</h1>
          <p class="lead">${pre
            ? 'Než tě pustíme k ostrým datům, zjistíme, co už o Pythonu víš. Výsledek se nijak nehodnotí, slouží jen k porovnání s koncem hry.'
            : 'Ukaž, co ses naučil(a). Otázky jsou podobné jako na začátku, ale ne stejné. Každá míří na jednu dovednost z misí.'}</p>
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
        highlight: (code, lang) => (lang === 'text' ? esc(code) : Highlight(code, lang || 'python')),
        lang: 'python',
        onDone(answers) {
          view = null;
          P[which] = { form, answers, at: Date.now() };
          logEvent('quiz', { which, form, correct: answers.filter(a => a.correct).length });
          save();
          if (pre) afterPre(); else { checkBadges(); save(); renderResults(); Kit.confetti(['🐍', '{', '}', ':'], ['#ffd43b', '#5a9bd5', '#5fd38d', '#eadbb0']); }
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
      <p>Čeká tě <b>12 misí</b>. V každé napíšeš funkci v Pythonu a tvůj kód projde sadou testů, jako u skutečných programátorů.</p>
      <ul class="vstats">
        <li class="ok">▶ Tlačítko Spustit testy (Ctrl+Enter) spustí tvůj kód. Uvidíš výpis i výsledky testů.</li>
        <li class="ok">🐍 Chybové hlášky Pythonu ti terminál vysvětlí česky a ukáže řádek.</li>
        <li class="ok">★ Hvězdy: za splnění, za nejvýš 3 spuštění a za bonusový úkol.</li>
      </ul>
      <div class="btn-row"><button class="btn primary big" data-play data-focus>Začít misi 1</button><button class="btn ghost" data-close>Na mapu</button></div>`);
    $('[data-play]', m).addEventListener('click', () => renderMission(1));
  }

  /* ---------------- mapa ---------------- */
  function renderMap() {
    leave();
    if (!P || !P.pre) { renderIntro(); return; }
    crumb([{ label: 'Operační mapa' }]);
    const done = doneCount();
    const nextId = (MISSIONS.find(m => !isDone(m.id)) || {}).id;
    const canPost = done >= 8;
    const btn = m => {
      const s = P.missions[m.id];
      const open = unlocked(m.id);
      const cls = isDone(m.id) ? 'done' : m.id === nextId ? 'next' : open ? 'open' : 'locked';
      const stars = [0, 1, 2].map(i => `<i class="${s && s.stars[i] ? 'on' : ''}">★</i>`).join('');
      return `<button class="node ${cls}" data-m="${m.id}" ${open ? '' : 'disabled aria-disabled="true"'} aria-label="Mise ${m.id}: ${esc(m.title)}">
          <span class="n-num">${open ? m.id : '🔒'}</span>
          <span class="n-title">${esc(m.title)}</span>
          <span class="n-sub">${esc(m.concept)}</span>
          <span class="n-stars" aria-label="${s ? s.stars.filter(Boolean).length : 0} hvězd ze 3">${stars}</span>
        </button>`;
    };
    const nextM = MISSIONS.find(m => m.id === nextId);
    const nextS = nextM ? sectorOf(nextM) : null;
    app.innerHTML = `
      <section class="screen">
        <div class="map-hero">
          <div>
            <h1>Operační mapa</h1>
            <p>Agente ${esc(P.name)}, mise se odemykají postupně. Každá končí testy, projdou jen funkční programy.</p>
            <div class="meter"><span class="bar"><span class="post" style="width:${Kit.pct(done, MISSIONS.length)}%"></span></span>
              <span>${done}/${MISSIONS.length} misí</span><span class="muted">★ ${starCount()}/${MAX_STARS}</span></div>
          </div>
          <div class="btn-row">
            <button class="btn" id="cheatBtn">📖 Tahák</button>
            ${P.post ? '<button class="btn primary" id="resBtn">📊 Výsledky</button>' : ''}
          </div>
        </div>
        ${nextM ? `<div class="next-up">
            <span class="nu-num">${pad2(nextM.id)}</span>
            <div class="nu-text"><small>Další mise: sektor ${nextS.id}, ${esc(nextS.title)}</small><b>${esc(nextM.title)}</b></div>
            <button class="btn primary big" data-m="${nextM.id}">▶ Spustit misi ${nextM.id}</button>
          </div>` : ''}
        ${C.SECTORS.map(s => {
          const ms = MISSIONS.filter(m => m.sector === s.id);
          return `<section class="track s${s.id}">
            <div class="track-head"><span class="t-ico">${s.icon}</span><div><h2>Sektor ${s.id}: ${esc(s.title)}</h2><small>${esc(s.desc)}</small></div>
              <span class="t-count">${ms.filter(m => isDone(m.id)).length}/${ms.length} hotovo</span></div>
            <div class="nodes">${ms.map(btn).join('')}</div>
          </section>`;
        }).join('')}
        <section class="card final">
          <div>
            <h2>Výstupní test</h2>
            ${P.post
              ? `<p>Hotovo! Vstupní test ${Kit.quizStats(P.pre.answers).correct}/10, výstupní ${Kit.quizStats(P.post.answers).correct}/10.</p>`
              : canPost
                ? `<p>Máš za sebou ${done} misí, můžeš si změřit pokrok. ${done < MISSIONS.length ? 'Doporučujeme ale nejdřív dohrát všech 12.' : 'Šakal je dopaden, gratulujeme!'}</p>`
                : `<p class="muted">Odemkne se po splnění 8 misí (zatím ${done}). Pak porovnáme, co jsi uměl(a) na začátku a co umíš teď.</p>`}
          </div>
          ${P.post ? '<button class="btn primary big" id="resBtn2">Zobrazit výsledky</button>'
            : canPost ? '<button class="btn primary big" id="postBtn">Spustit výstupní test</button>' : ''}
        </section>
      </section>`;
    $$('[data-m]').forEach(b => b.addEventListener('click', () => { Kit.sound('click'); renderMission(+b.dataset.m); }));
    $('#cheatBtn').addEventListener('click', cheatSheet);
    ['#resBtn', '#resBtn2'].forEach(s => { const b = $(s); if (b) b.addEventListener('click', renderResults); });
    const pb = $('#postBtn');
    if (pb) pb.addEventListener('click', () => renderQuiz('post'));
  }

  // Lekce otevřená z taháku: tlačítko „Zpět k taháku“ tahák znovu otevře a vrátí fokus na lekci, ze které hráč přišel.
  function openLesson(v) {
    if (!v || !LESSONS[v.id]) return;
    const m = Lesson.open({ modal: Kit.modal, lesson: LESSONS[v.id], kicker: `Lekce k misi ${v.id}: ${v.title}`, back: 'Zpět k taháku' });
    const back = Kit.$('.modal-box > .btn-row [data-close]', m);
    if (back) back.addEventListener('click', () => setTimeout(() => {
      cheatSheet();
      const b = Kit.$(`.modal [data-lesson="${v.id}"]`);
      if (b) b.focus();
    }));
  }

  function cheatSheet() {
    const lesBtn = x => LESSONS[x.id] ? `<button class="btn small" data-lesson="${x.id}">📖 Lekce s příkladem</button>` : '';
    const items = MISSIONS.map(m => (isDone(m.id)
      ? `<div class="learn"><b>Mise ${m.id}: ${esc(m.concept)}</b><p>${esc(m.learn[0])}</p><pre class="code">${Highlight(m.learn[1], 'python')}</pre>${lesBtn(m)}</div>`
      : unlocked(m.id) ? `<div class="learn"><b>Mise ${m.id}: ${esc(m.concept)}</b><p class="small muted">Tahle mise tě ještě čeká. Lekci si můžeš projít už teď.</p>${lesBtn(m)}</div>`
      : `<div class="learn locked"><b>🔒 Mise ${m.id}: ${esc(m.concept)}</b><p class="small muted">Odemkne se po splnění mise.</p></div>`)).join('');
    const cm = Kit.modal(`<h2>📖 Tahák Pythonu</h2><p class="muted small">Všechno, co ses v misích naučil(a), na jednom místě.</p><div class="cheat">${items}</div>`, { cls: 'wide' });
    Kit.$$('[data-lesson]', cm).forEach(btn => btn.addEventListener('click', () => openLesson(MISSIONS.find(x => x.id === +btn.dataset.lesson))));
  }

  /* ---------------- mise ---------------- */
  function renderMission(id) {
    leave();
    const m = MISSIONS.find(x => x.id === id);
    if (!m || !unlocked(id)) { renderMap(); return; }
    const s = sectorOf(m);
    const ms = mState(id);
    const ses = { runs: 0, fails: 0, solution: false, t0: performance.now(), timers: [], running: false, sawError: false };
    const later = (f, ms2) => ses.timers.push(setTimeout(f, ms2));
    crumb([{ label: 'Mapa', go: renderMap }, { label: `Sektor ${s.id}` }, { label: `Mise ${m.id}: ${m.title}` }]);
    const prev = MISSIONS.find(x => x.id === id - 1);
    const next = MISSIONS.find(x => x.id === id + 1);
    let expected = [];
    try { expected = H.expectedFor(m); } catch (e) { console.error(e); }
    const visible = m.tests.map((t, i) => ({ t, i })).filter(x => !x.t.hidden);
    const hiddenCount = m.tests.length - visible.length;
    const P2 = window.MiniPython;

    const sig = `def ${(m.starter.match(new RegExp(`def ${m.fn}\\(([^)]*)\\)`)) || ['', ''])[0].replace(/^def /, '') || m.fn + '(…)'}:`;
    app.innerHTML = `
      <section class="ws-screen fit">
        <header class="mbar">
          <span class="mb-num" aria-label="Mise ${m.id}">${pad2(m.id)}</span>
          <div class="mb-text"><span class="mb-where">${s.icon} Sektor ${s.id}: ${esc(s.title)}<code class="mb-concept" title="Co se v misi procvičuje">${esc(m.concept)}</code></span><h1>${esc(m.title)}</h1></div>
          <div class="mb-right">
            <ul class="goals" id="goals" aria-label="Hvězdy za misi"></ul>
            <nav class="mb-nav">
              <button class="icon-btn" id="prevBtn" title="Předchozí mise" aria-label="Předchozí mise" ${prev ? '' : 'disabled'}>◀</button>
              <button class="icon-btn" id="nextBtn" title="Další mise" aria-label="Další mise" ${next && isDone(id) ? '' : 'disabled'}>▶</button>
            </nav>
          </div>
        </header>
        <div class="ws wide-right">
          <div class="col">
            <section class="dossier">
              <h2 class="panel-h">Spis mise ${pad2(m.id)} <small>spojení s velitelstvím</small></h2>
              <div class="comms" id="comms"></div>
              <div class="task-box">
                <p class="task"><b>Úkol:</b> ${md(m.task)}</p>
                <pre class="code sig">${Highlight(sig, 'python')}</pre>
                <p class="bonus-line"><span class="bl-star" aria-hidden="true">★</span> <b>Bonus navíc:</b> ${md(m.bonus.text)}</p>
              </div>
              <div class="brief-actions">
                <button class="btn small" id="lessonBtn" title="Nová věc z Pythonu na příkladu, který si můžeš hned spustit">📖 Lekce</button>
                <button class="btn small" id="hintBtn"></button>
                <button class="btn small ghost" id="tourBtn" title="Průvodce obrazovkou: co je kde a k čemu to slouží">❔ Průvodce</button>
                <button class="btn small ghost" id="solBtn" hidden>👀 Ukázat řešení</button>
              </div>
              <div class="hints" id="hints"></div>
            </section>
            <section class="panel">
              <h2 class="panel-h">Příklady z testů <small>volání → očekávaný výsledek</small></h2>
              <table class="examples"><tbody>${visible.map(({ t, i }) => `<tr><td>${Highlight(t.call, 'python')}${t.setup ? `<div class="small muted">${t.setup.pin ? `(PIN trezoru: ${t.setup.pin})` : `(tajný kód: ${t.setup.secret})`}</div>` : ''}</td><td class="arrow">→</td><td class="exp">${esc(expected[i] !== undefined ? P2.repr(expected[i]) : '?')}</td></tr>`).join('')}</tbody></table>
              <p class="small muted" style="margin:.5rem 0 0">Navíc ${hiddenCount} ${hiddenCount === 1 ? 'skrytý test hlídá' : hiddenCount < 5 ? 'skryté testy hlídají' : 'skrytých testů hlídá'} okrajové případy.</p>
            </section>
            ${m.prelude ? `<details class="panel"><summary>📁 Data mise: proměnné, které můžeš použít</summary><pre class="code data-pre">${Highlight(m.prelude, 'python')}</pre></details>` : ''}
            ${m.device ? `<section class="panel"><h2 class="panel-h">🔧 Zařízení</h2><p class="small" style="margin:0">${m.device === 'zamek' ? 'Funkce <code>zamek(pin)</code> je už připravená. Volej ji s textem o 4 číslicích. Při ručním spuštění je v trezoru cvičný PIN.' : 'Funkce <code>hadej(n)</code> je už připravená. Po 30 pokusech spustí alarm. Při ručním spuštění hlídá cvičný kód.'}</p></section>` : ''}
          </div>
          <div class="col">
            <section class="panel code-pane">
              <div class="file-head"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>reseni.py<span class="sp"></span><button class="btn small ghost" id="resetBtn" title="Vrátit výchozí kód mise">↺ Výchozí kód</button></div>
              <div id="editor"></div>
              <details class="snips" data-snips="operaceKobra.snips" ${Kit.snipsOpen('operaceKobra.snips', false) ? 'open' : ''}><summary>🧩 Úryvky kódu <small>když nevíš, jak něco zapsat</small></summary><div class="palette" id="palette"></div></details>
              <div class="runbar">
                <button class="btn go big" id="runBtn">▶ Spustit testy <kbd>Ctrl+Enter</kbd></button>
              </div>
              <div class="status" id="status" aria-live="polite"></div>
              <div class="results">
                <div class="terminal" id="term"></div>
                <div class="tests" id="tests"></div>
              </div>
            </section>
          </div>
        </div>
      </section>`;

    const ed = new CodeEditor($('#editor'), { lang: 'python', tab: 4, onRun: () => run(), label: 'Editor reseni.py' });
    ed.value = ms.code != null ? ms.code : m.starter;

    /* úvod mise (příběh → lekce → úkol) se poprvé ukáže v okně; spis pod ním je pak už vypsaný */
    const firstIntro = !!(LESSONS[id] && !(P.intro && P.intro[id]));
    if (firstIntro) { P.intro = P.intro || {}; P.intro[id] = true; P.seen[id] = true; save(); }
    /* spojení s velitelstvím – zprávy se „píšou“ jen poprvé */
    const comms = $('#comms');
    const msgHtml = ([who, text]) => `<div class="msg ${who}"><span class="ava">${who === 'sakal' ? '☠' : 'N'}</span><div class="bubble"><span class="who">${who === 'sakal' ? 'Zachycená zpráva od Šakala' : 'Nora, velitelka'}</span>${md(text)}</div></div>`;
    if (P.seen[id]) comms.innerHTML = m.brief.map(msgHtml).join('');
    else {
      let k = 0;
      const skip = document.createElement('button');
      skip.className = 'skip';
      skip.textContent = 'Zobrazit celé zadání';
      const typing = document.createElement('div');
      typing.className = 'typing';
      const showNext = () => {
        if (k >= m.brief.length) { typing.remove(); skip.remove(); P.seen[id] = true; save(); return; }
        typing.textContent = m.brief[k][0] === 'sakal' ? 'zachytávám přenos ' : 'Nora píše ';
        comms.appendChild(typing);
        later(() => {
          typing.remove();
          comms.insertAdjacentHTML('beforeend', msgHtml(m.brief[k]));
          Kit.sound(m.brief[k][0] === 'sakal' ? 'alarm' : 'type');
          k++;
          comms.appendChild(skip);
          later(showNext, 450);
        }, 650);
      };
      skip.addEventListener('click', () => { ses.timers.forEach(clearTimeout); comms.innerHTML = m.brief.map(msgHtml).join(''); P.seen[id] = true; save(); });
      comms.appendChild(skip);
      showNext();
    }

    /* paleta úryvků */
    const SYMS = [':', '()', '[]', '""', '==', '+= '];
    $('#palette').innerHTML = m.palette.map((p, i) => `<button class="chip" data-p="${i}">${esc(p.replace(/\|/g, '').replace(/\n\s*/g, ' ⏎ '))}</button>`).join('') +
      SYMS.map((x, i) => `<button class="chip sym" data-s="${i}">${esc(x.trim())}</button>`).join('');
    const insert = p => {
      if (p.includes('\n')) ed.insertSnippet(p.includes('|') ? p : p + '|');
      else if (/:\s*$/.test(p)) ed.insertSnippet(p + '\n    |');
      else ed.insertSnippet(p.includes('|') ? p : p + '|', true);
      Kit.sound('type');
    };
    $$('#palette [data-p]').forEach(b => b.addEventListener('click', () => insert(m.palette[+b.dataset.p])));
    $$('#palette [data-s]').forEach(b => b.addEventListener('click', () => {
      const x = SYMS[+b.dataset.s];
      const map = { '()': '(|)', '[]': '[|]', '""': '"|"' };
      ed.insertSnippet(map[x] || x + '|', true);
      Kit.sound('type');
    }));

    let saveT = 0;
    ed.onChange(() => {
      clearTimeout(saveT);
      saveT = setTimeout(() => { ms.code = ed.value; save(); }, 600);
    });

    function goals() {
      const runsNow = ms.done ? ses.runs : ms.runs;
      $('#goals').innerHTML = Kit.goals([
        { got: ms.stars[0], text: 'Projdou všechny testy', title: 'Hvězda za to, že projdou všechny testy' },
        { got: ms.stars[1], text: 'Nejvýš 3 spuštění', val: `${runsNow}/3`, title: `Hvězda za vyřešení nejvýš na 3 spuštění testů (${ms.done ? 'teď' : 'zatím'} ${runsNow})` },
        { got: ms.stars[2], text: 'Bonus', title: 'Bonus navíc: ' + m.bonus.text.replace(/`/g, '') }
      ]);
    }
    const term = $('#term');
    function prompt(cmd) { return `<div class="prompt">kobra@hq:~/mise${pad2(m.id)}$ <b>${esc(cmd)}</b></div>`; }
    term.innerHTML = prompt('python3 reseni.py') + '<div class="out muted">Zatím nespuštěno.</div>';
    const bonusLine = `Bonusová hvězda: ${esc(m.bonus.text)}`;
    Kit.status($('#status'), 'idle', ms.done ? 'Mise je splněná. Zkus získat všechny hvězdy.' : 'Napiš funkci a spusť testy', ms.done ? bonusLine : 'Ctrl+Enter spustí testy. Každý test zavolá tvoji funkci a porovná, co vrátila, s tím, co měla vrátit.');

    function errBlock(e, where) {
      const loc = e.line ? `Řádek ${e.line}${e.func ? ` (ve funkci ${esc(e.func)})` : ''}` : (where || '');
      return `<div class="err">✘ ${loc ? loc + ': ' : ''}${esc(e.text)}</div>` +
        (e.czech ? `<div class="explain"><b>Co to znamená:</b> ${esc(e.czech)}${e.line ? ` <button class="line-link" data-line="${e.line}">ř. ${e.line}</button>` : ''}</div>` : '');
    }

    function run() {
      if (ses.running) return;
      ses.running = true;
      $('#runBtn').disabled = true;
      ed.clearMarks();
      term.innerHTML = prompt('python3 reseni.py') + '<div class="out muted">spouštím…</div>';
      Kit.status($('#status'), 'run', 'Spouštím testy…');
      $('#tests').innerHTML = '';
      setTimeout(() => {
        try { execute(); } finally { ses.running = false; $('#runBtn').disabled = false; }
      }, 30);
    }

    function execute() {
      const code = ed.value;
      ses.runs++;
      if (!ms.done) ms.runs++;
      ms.runsTotal++;
      ms.code = code;
      const t0 = performance.now();
      const res = H.runMission(m, code);
      const dt = Math.round(performance.now() - t0);
      // terminál: výpis programu a chyba na úrovni modulu
      let html = prompt('python3 reseni.py');
      if (res.output) html += `<div class="out">${esc(res.output.length > 4000 ? res.output.slice(0, 4000) + '\n…' : res.output)}</div>`;
      if (res.error) html += errBlock(res.error);
      else if (res.missingFn) html += `<div class="err">✘ V kódu chybí funkce ${esc(m.fn)}() – nepřejmenoval(a) jsi ji, nebo jsi nesmazal(a) řádek def?</div>`;
      else html += prompt('python3 -m testy') + `<div class="${res.allPass ? 'ok' : 'err'}">${res.allPass ? '✔' : '✘'} testy: ${res.passed}/${res.total} prošlo (${dt} ms)</div>`;
      term.innerHTML = html;
      // výsledky testů
      if (!res.error && !res.missingFn) renderTests(res);
      $$('#term [data-line], #tests [data-line]').forEach(b => b.addEventListener('click', () => ed.goToLine(+b.dataset.line)));
      // chyby → zvýraznit řádek, statistika typů chyb
      const firstErr = res.error || (res.tests.find(t => t.error) || {}).error;
      if (firstErr && firstErr.line) ed.markError(firstErr.line);
      res.errorTypes.forEach(t => { ms.errors[t] = (ms.errors[t] || 0) + 1; P.errorTypes[t] = (P.errorTypes[t] || 0) + 1; });
      if (res.errorTypes.length) ses.sawError = true;
      ms.bestPassed = Math.max(ms.bestPassed || 0, res.passed);
      logEvent('run', { mission: m.id, passed: res.passed, total: res.total, error: res.error ? res.error.type : null, testErrors: res.errorTypes.length });
      if (res.error) Kit.status($('#status'), 'bad', `Program spadl: ${esc(res.error.type || 'chyba')}${res.error.line ? ` na řádku ${res.error.line}` : ''}`, esc(res.error.czech || res.error.text || ''));
      else if (res.missingFn) Kit.status($('#status'), 'bad', `V kódu chybí funkce ${esc(m.fn)}()`, 'Nepřejmenoval(a) jsi ji, nebo jsi nesmazal(a) řádek def?');
      else if (res.allPass) Kit.status($('#status'), 'ok', `Všechny testy prošly (${res.passed}/${res.total})`, res.bonus ? 'Bonus splněn, máš všechno.' : 'Bonus zatím ne. ' + bonusLine);
      else {
        const bad = res.tests.find(t => !t.pass);
        const why = bad ? (bad.error ? `${bad.hidden ? 'Skrytý test' : esc(bad.call)}: ${esc(bad.error.type || 'chyba')}` : bad.hidden ? 'Neprošel skrytý test, hlídá okrajový případ.' : `${esc(bad.call)} vrátilo ${esc(bad.got)}, čekalo se ${esc(bad.expected)}`) : '';
        Kit.status($('#status'), 'bad', `Prošlo ${res.passed} z ${res.total} testů`, why);
      }
      if (res.allPass) onWin(res);
      else onFail(res);
      save();
    }

    function renderTests(res) {
      let shownHiddenFail = false;
      const seenErr = new Set();
      const rows = res.tests.map((t, i) => {
        const label = t.hidden ? `skrytý test #${i + 1}` : `test #${i + 1}`;
        const tries = m.device && t.calls ? ` <span class="meta">· ${t.calls.toLocaleString('cs-CZ')} ${t.calls === 1 ? 'pokus' : t.calls < 5 ? 'pokusy' : 'pokusů'}</span>` : '';
        if (t.pass) {
          return `<div class="test pass"><span class="st">✔</span>${t.hidden ? `<span class="meta">${label}</span>` : `${Highlight(t.call, 'python')} <span class="meta">→</span> ${esc(t.got)}`}${tries}</div>`;
        }
        if (t.error && seenErr.has(t.error.text)) {
          return `<div class="test fail"><span class="st">✘</span>${t.hidden ? `<span class="meta">${label}</span>` : Highlight(t.call, 'python')} <span class="meta">– stejná chyba jako výše</span></div>`;
        }
        if (t.error) seenErr.add(t.error.text);
        if (t.skipped) return `<div class="test fail"><span class="st">–</span><span class="meta">${label}: nespuštěn (předchozí test se zacyklil)</span></div>`;
        if (t.hidden && shownHiddenFail) return `<div class="test fail"><span class="st">✘</span><span class="meta">${label}</span></div>`;
        if (t.hidden) shownHiddenFail = true;
        const setup = t.setup ? ` <span class="meta">(${t.setup.pin ? 'PIN ' + t.setup.pin : 'kód ' + t.setup.secret})</span>` : '';
        let body = `<div class="gotline">${Highlight(t.call, 'python')}${setup}</div><div><span class="meta">očekáváno:</span> ${esc(t.expected)}</div>`;
        if (t.error) body += errBlock(t.error);
        else body += `<div><span class="meta">vráceno:</span> ${esc(t.got)}</div>${t.why ? `<div class="why">💡 ${esc(t.why)}</div>` : ''}`;
        if (t.output) body += `<div class="meta">výpis funkce: ${esc(t.output.slice(0, 300))}</div>`;
        if (m.device && t.calls) body += `<div class="meta">pokusů na zařízení: ${t.calls.toLocaleString('cs-CZ')}</div>`;
        return `<div class="test fail"><span class="st">✘</span><div class="tb">${t.hidden ? `<span class="meta">${label}</span>` : ''}${body}</div></div>`;
      });
      $('#tests').innerHTML = rows.join('');
    }

    function onFail(res) {
      ses.fails++;
      Kit.sound(res.error && /Syntax|Indentation/.test(res.error.type) ? 'error' : res.tests.some(t => t.error && /ALARM/.test(t.error.text)) ? 'alarm' : 'fail');
      if (ses.fails >= 2 && ms.hints < m.hints.length) Kit.toast('💡 Zasekl(a) ses? Zkus nápovědu ve spisu mise.', 2600);
      if (ses.fails >= 3 && ms.hints >= m.hints.length) $('#solBtn').hidden = false;
      goals();
    }

    function onWin(res) {
      const first = !ms.done;
      const runsUsed = first ? ms.runs : ses.runs;
      const got = [true, runsUsed <= 3 && !ses.solution, res.bonus && !ses.solution];
      const before = ms.stars.slice();
      if (first) {
        addTime();
        ms.done = true;
        ms.firstTry = ms.runs === 1 && !ms.solution;
        ms.wonAt = Date.now();
      }
      ms.stars = ms.stars.map((x, i) => x || got[i]);
      logEvent('win', { mission: m.id, runs: runsUsed, stars: got.filter(Boolean).length, first, bonus: res.bonus });
      const badges = checkBadges({ oneshot: ses.runs === 1 && !ses.solution });
      save();
      goals();
      Kit.sound('win');
      $('#nextBtn').disabled = !next;
      later(() => victory(got, before, runsUsed, res, badges), 500);
    }

    function victory(got, before, runsUsed, res, badges) {
      const devInfo = m.device ? ` Pokusů na zařízení: ${res.tests.map(t => t.calls).join(', ')}.` : '';
      function starRows() {
        const solCode = c => `<pre class="code">${Highlight(c, 'python')}</pre>`;
        const rows = [
          { got: true, title: 'Projdou všechny testy', text: `${res.passed} z ${res.total} testů je v pořádku.${devInfo}` },
          Kit.runsStar({ runs: runsUsed, limit: 3, solution: ses.solution, title: 'Nejvýš 3 spuštění', did: 'Testy jsi spustil(a)', retry: 'Zkusit znovu' }),
          got[2]
            ? { got: true, title: 'Bonus navíc', text: `${md(m.bonus.text)}. Povedlo se!` }
            : ses.solution
            ? { got: ms.stars[2], title: 'Bonus navíc', text: 'Se vzorovým řešením se bonusová hvězda nepočítá.' + (ms.stars[2] ? ' Hvězdu ale už máš z dřívějška.' : ''), how: `Klikni na <b>Zkusit znovu</b> a vyřeš to po svém, i s bonusem: ${md(m.bonus.text)}` }
            : { got: ms.stars[2], title: 'Bonus navíc', text: `Tentokrát ne. Bonus chtěl: ${md(m.bonus.text)}.${ms.stars[2] ? ' Hvězdu ale už máš z dřívějška.' : ''}`, how: `<b>Jak na to:</b> ${md(m.bonus.how || '')}${m.bonus.example ? solCode(m.bonus.example) : ''}` }
        ];
        return Kit.starReport(rows) + Kit.solutionBox(`<p>Celé vzorové řešení${m.bonusSolution ? ' i s bonusem' : ''}. Tvoje řešení může vypadat jinak, důležité je, že projdou testy.</p>${solCode(m.bonusSolution || m.solution)}`, false);
      }
      const mdl = Kit.modal(`
        <div class="victory">
          <div class="granted">🔓 Přístup povolen</div>
          <div class="big-stars">${got.map((g, i) => `<i class="${ms.stars[i] ? 'on' : ''} ${ms.stars[i] && !before[i] ? 'new' : ''}" style="animation-delay:${0.15 + i * 0.25}s">★</i>`).join('')}</div>
          ${starRows(got, runsUsed, res)}
          <div class="reward">📡 ${esc(m.reward)}</div>
          <div class="learn"><b>📖 Tahák: ${esc(m.concept)}</b><p>${esc(m.learn[0])}</p><pre class="code">${Highlight(m.learn[1], 'python')}</pre></div>
          <div class="btn-row center">
            ${next ? '<button class="btn primary big" data-next data-focus>Další mise</button>'
              : (P.post ? '<button class="btn primary big" data-res data-focus>📊 Výsledky</button>' : '<button class="btn primary big" data-post data-focus>Výstupní test</button>')}
            <button class="btn" data-retry>↺ Zkusit znovu</button>
            <button class="btn ghost" data-map>🗺️ Mapa</button>
          </div>
        </div>`, { cls: 'win' });
      got.forEach((g, i) => { if (ms.stars[i]) setTimeout(() => Kit.sound('star'), 300 + i * 250); });
      if (got.every(Boolean)) Kit.confetti(['🐍', '{', '}', ':', '01'], ['#ffd43b', '#5a9bd5', '#5fd38d', '#eadbb0']);
      const on = (sel, f) => { const b = $(sel, mdl); if (b) b.addEventListener('click', f); };
      on('[data-next]', () => renderMission(next.id));
      on('[data-post]', () => renderQuiz('post'));
      on('[data-res]', renderResults);
      on('[data-map]', renderMap);
      on('[data-retry]', () => { Kit.closeModal(); ses.runs = 0; ses.solution = false; goals(); ed.focus(); });
      if (badges.length) logEvent('badges', { ids: badges });
    }

    function addTime() {
      if (!ms.done) ms.timeMs += Math.min(30 * 60 * 1000, performance.now() - ses.t0);
      ses.t0 = performance.now();
    }

    function showHints() {
      $('#hints').innerHTML = m.hints.slice(0, ms.hints).map((h, i) => `<div class="hint"><b>💡 ${i + 1}.</b> ${esc(h)}</div>`).join('');
      const left = m.hints.length - ms.hints;
      $('#hintBtn').textContent = left ? `💡 Nápověda (${left})` : '💡 Nápovědy použity';
      $('#hintBtn').disabled = !left;
      if (!left && ses.fails >= 3) $('#solBtn').hidden = false;
    }
    $('#hintBtn').addEventListener('click', () => {
      if (ms.hints >= m.hints.length) return;
      ms.hints++;
      logEvent('hint', { mission: m.id, n: ms.hints });
      save();
      showHints();
      Kit.sound('click');
    });
    $('#solBtn').addEventListener('click', () => Kit.confirm('Ukázat vzorové řešení? Misi pak v tomhle pokusu dokončíš jen za 1 hvězdu. Nejvíc se naučíš, když řešení projdeš řádek po řádku a pak ho zkusíš napsat sám/sama.', 'Ukázat řešení', () => {
      ses.solution = true;
      ms.solution = true;
      logEvent('solution', { mission: m.id });
      ed.value = m.solution;
      save();
    }));
    $('#resetBtn').addEventListener('click', () => Kit.confirm('Vrátit výchozí kód mise? Tvoje úpravy se smažou.', 'Vrátit výchozí kód', () => {
      ed.value = m.starter;
      ms.code = null;
      save();
    }));
    $('#runBtn').addEventListener('click', run);
    $('#prevBtn').addEventListener('click', () => prev && renderMission(prev.id));
    $('#nextBtn').addEventListener('click', () => next && isDone(id) && renderMission(next.id));

    goals();
    showHints();
    /* průvodce obrazovkou: poprvé se spustí sám, pak tlačítkem ❔ */
    const focusEd = () => { if (window.matchMedia('(min-width: 1081px)').matches) ed.focus(); };
    const tourSteps = () => [
      { el: '#comms', title: 'Spis mise', text: 'Velitelka Nora ti tu vysvětlí, o co v misi jde.' },
      { el: '.task-box', title: 'Úkol', text: 'Co má tvoje funkce dělat a jakou má hlavičku. Pod tím je <b>bonus navíc</b> za třetí hvězdu.' },
      { el: '.examples', title: 'Příklady z testů', text: 'Takhle testy tvoji funkci zavolají a co od ní čekají. Navíc je tu i skrytý test na okrajové případy.' },
      { el: '#editor', title: 'Tvůj kód', text: 'Sem píšeš Python. 🧩 Úryvky kódu vloží hotové kousky.' },
      { el: '#runBtn', title: 'Spustit testy', text: 'Každý test zavolá tvoji funkci a porovná, co vrátila, s tím, co vrátit měla (nebo Ctrl+Enter). Na hvězdu stačí nejvýš 3 spuštění.' },
      { el: '.results', title: 'Výsledky testů', text: 'Který test prošel a který ne: co se čekalo a co tvoje funkce vrátila. Chyby Pythonu jsou vysvětlené česky i s číslem řádku.' },
      { el: '#goals', title: 'Tři hvězdy', text: 'Všechny testy, nejvýš 3 spuštění a bonus. Misi můžeš kdykoli zopakovat a hvězdy dobrat.' },
      { el: '.dossier .brief-actions', title: 'Když nevíš kudy kam', text: '📖 <b>Lekce</b> vysvětlí novou věc z Pythonu na příkladu, který si můžeš hned spustit a upravit. 💡 <b>Nápověda</b> radí postupně. Po všech nápovědách a třech pokusech se ukáže i řešení, ale misi pak dostaneš jen za 1 hvězdu. ❔ Průvodce spustíš znovu.' }
    ];
    const TOUR_KEY = KEY + '.tour';
    const startTour = () => Tour.start(tourSteps(), { onEnd: () => { Kit.write(TOUR_KEY, true); focusEd(); } });
    $('#tourBtn').addEventListener('click', startTour);
    const intro = (first, onClose) => Lesson.intro({
      modal: Kit.modal, close: () => Kit.closeModal(), first, onClose,
      head: `<p class="b-kicker">${s.icon} Sektor ${s.id}: ${esc(s.title)} · mise ${m.id} z ${MISSIONS.length}</p><h2>${esc(m.title)}</h2>`,
      story: m.brief.map(([who, text]) => Lesson.story(who === 'sakal' ? '☠️' : '🕵️‍♀️', who === 'sakal' ? 'Zachycená zpráva od Šakala' : 'Nora, velitelka', text)).join(''),
      lesson: LESSONS[m.id],
      task: `<div class="st-task"><p><b>Úkol:</b> ${md(m.task)}</p><pre class="code sig">${Highlight(sig, 'python')}</pre></div>`,
      stars: [
        { t: 'Projdou všechny testy', d: 'Funkce vrátí pro každý vstup to, co testy čekají, i v jednom skrytém testu na okrajový případ.' },
        { t: 'Nejvýš 3 spuštění', d: 'Testy spusť nejvýš třikrát. Než je pustíš, porovnej kód s příklady z testů.' },
        { t: 'Bonus navíc', d: m.bonus.text }
      ],
      done: 'Jdu na to 🐍'
    });
    $('#lessonBtn').addEventListener('click', () => Lesson.open({ modal: Kit.modal, lesson: LESSONS[m.id], kicker: `Lekce k misi ${m.id}: ${m.title}`, back: 'Zpět k misi' }));
    const afterIntro = () => { if (!Kit.read(TOUR_KEY, false)) later(startTour, 250); else focusEd(); };
    if (firstIntro) later(() => intro(true, afterIntro), 300);
    else if (!Kit.read(TOUR_KEY, false)) later(startTour, 900);
    else setTimeout(focusEd, 50);
    view = {
      cleanup() {
        clearTimeout(saveT);
        ses.timers.forEach(clearTimeout);
        ms.code = ed.value;
        addTime();
        save();
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
    const done = MISSIONS.filter(m => isDone(m.id));
    const st = id => P.missions[id] || {};
    const firstTry = done.filter(m => st(m.id).firstTry).length;
    const avgRuns = done.length ? done.reduce((n, m) => n + st(m.id).runs, 0) / done.length : 0;
    const hints = MISSIONS.reduce((n, m) => n + (st(m.id).hints || 0), 0);
    const time = done.reduce((n, m) => n + (st(m.id).timeMs || 0), 0);
    const errs = Object.entries(P.errorTypes).sort((a, b) => b[1] - a[1]);
    const review = (ans, form) => ans.map(a => {
      const q = C.QUIZ[form][a.q];
      return `<div class="rev"><b>${a.correct ? '<span class="ok">✔</span>' : a.dontKnow ? '<span class="dk">?</span>' : '<span class="bad">✗</span>'} ${esc(q.q)}</b>
        ${q.code ? `<pre class="code">${Highlight(q.code, 'python')}</pre>` : ''}
        <div class="small">${a.correct ? '' : `Tvoje odpověď: ${a.dontKnow ? 'nevím' : esc(q.a[a.choice])} · `}Správně: <b>${esc(q.a[q.ok])}</b></div></div>`;
    }).join('');
    app.innerHTML = `
      <section class="screen result">
        <div class="card res-hero">
          <div class="rank-icon">${rank[1]}</div>
          <div>
            <h1>Agent ${esc(P.name)}: ${rank[2]}</h1>
            <p>★ ${stars} z ${MAX_STARS}, splněno ${done.length} z ${MISSIONS.length} misí.</p>
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
              <div class="stat"><b>${firstTry}</b><small>misí na 1. pokus</small></div>
              <div class="stat"><b>${Kit.fmt(avgRuns)}</b><small>spuštění na misi</small></div>
              <div class="stat"><b>${hints}</b><small>nápověd</small></div>
              <div class="stat"><b>${fmtTime(time)}</b><small>čas do splnění</small></div>
            </div>
            <div class="table-wrap"><table class="tbl">
              <thead><tr><th>Mise</th><th>★</th><th>Spuštění</th><th>Nápovědy</th><th>Chyby</th><th>Čas</th></tr></thead>
              <tbody>${MISSIONS.map(m => {
                const s = st(m.id);
                const nErr = Object.values(s.errors || {}).reduce((a, b) => a + b, 0);
                return `<tr><td>${m.id}. ${esc(m.title)}</td><td>${s.done ? '★'.repeat(s.stars.filter(Boolean).length) : '–'}</td>
                  <td>${s.done ? s.runs : s.runsTotal ? s.runsTotal + ' (nesplněno)' : '–'}</td><td>${s.hints || 0}${s.solution ? ' + řešení' : ''}</td>
                  <td>${nErr || '–'}</td><td>${s.done ? fmtTime(s.timeMs) : '–'}</td></tr>`;
              }).join('')}</tbody></table></div>
            <p class="small muted" style="margin-bottom:.2rem">Chyby Pythonu, které jsi potkal(a) a překonal(a):</p>
            <div class="errlist">${errs.length ? errs.map(([t, n]) => `<span><b>${esc(t)}</b> ×${n}</span>`).join('') : '<span>žádné – čistá práce!</span>'}</div>
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
      Kit.download(`operace-kobra-${P.name.replace(/[^\w-]+/g, '_')}.json`, exportData());
      Kit.toast('Výsledky staženy ✔');
    });
  }

  function exportData() {
    const pre = Kit.quizStats(P.pre.answers);
    const post = P.post ? Kit.quizStats(P.post.answers) : null;
    return {
      game: 'Operace Kobra', version: 1, exportedAt: new Date().toISOString(), player: P.name,
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
      missions: MISSIONS.map(m => Object.assign({ id: m.id, title: m.title, concept: m.concept }, P.missions[m.id] || { done: false })),
      errorTypes: P.errorTypes,
      totals: { stars: starCount(), maxStars: MAX_STARS, missionsDone: doneCount() },
      badges: P.badges,
      events: P.events
    };
  }

  /* ---------------- lišta ---------------- */
  $('#homeBtn').addEventListener('click', renderIntro);
  $('#mapBtn').addEventListener('click', renderMap);
  $('#soundBtn').addEventListener('click', () => {
    Kit.soundOn = !Kit.soundOn;
    Kit.write('operaceKobra.sound', Kit.soundOn);
    topStats();
    if (Kit.soundOn) Kit.sound('ok');
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  topStats();
  if (P && P.pre) renderMap(); else renderIntro();
})();
