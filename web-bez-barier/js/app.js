/*
 * Web bez bariér – aplikace: obrazovky, prohlížeč s pohledy testerů (čtečka, klávesnice, kontrast, pohyb),
 * testování s lidmi, hvězdy, odznaky a měření pokroku.
 */
(function () {
  'use strict';

  const { $, $$, esc } = Kit;
  const C = window.WBB;
  const LEVELS = C.LEVELS;
  const LESSONS = C.LESSONS || {};
  const PERSONAS = C.PERSONAS;
  const MAX_STARS = LEVELS.length * 3;
  const KEY = 'webBezBarier.v1';
  const app = $('#app');
  const RM = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let P = Kit.read(KEY, null);
  let view = null;
  Kit.soundOn = Kit.read('webBezBarier.sound', true);

  const BADGES = [
    { id: 'first', icon: '🚪', name: 'Otevřené dveře', desc: 'Dokonči první zakázku' },
    { id: 'oneshot', icon: '🎯', name: 'Na první pokus', desc: 'Projdi testy hned prvním spuštěním' },
    { id: 'listen', icon: '🎧', name: 'Ucho na stránce', desc: 'Poslechni si stránku nahlas v pohledu Čtečka' },
    { id: 'tabwalk', icon: '🚶', name: 'Procházka Tabem', desc: 'Projdi celou stránku Tabem v pohledu Klávesnice' },
    { id: 'ch1', icon: '🔊', name: 'Slyšitelný web', desc: 'Dokonči kapitolu 1' },
    { id: 'ch2', icon: '⌨️', name: 'Bez myši', desc: 'Dokonči kapitolu 2' },
    { id: 'ch3', icon: '🔔', name: 'Živá stránka', desc: 'Dokonči kapitolu 3' },
    { id: 'aaa', icon: '🔆', name: 'Kontrast AAA', desc: 'Získej v kině bonus za kontrast 7 : 1' },
    { id: 'nohints', icon: '🧠', name: 'Bez nápovědy', desc: 'Dokonči celou kapitolu bez nápovědy' },
    { id: 'all', icon: '♿', name: 'Web pro všechny', desc: 'Dokonči všech 12 zakázek' },
    { id: 'perfect', icon: '⭐', name: 'Zlatý standard', desc: 'Získej všech 36 hvězd' },
    { id: 'gain', icon: '📈', name: 'Velký skok', desc: 'Normalizovaný zisk v testech aspoň 0,5' }
  ];
  const RANKS = [[0, '🔍', 'Stážista přístupnosti'], [10, '🧪', 'Tester přístupnosti'], [20, '📋', 'Auditor přístupnosti'], [30, '🏅', 'Hlavní auditor přístupnosti']];
  const DOMAINS = { 1: 'pekarna-ulipy.cz', 2: 'knihovna-hradek.cz', 3: 'keramika-hrnek.cz', 4: 'kt-sutr.cz', 5: 'kino-aurora.cz', 6: 'zoo-hradek.cz', 7: 'divadlo-nakopecku.cz', 8: 'obec-lhota.cz', 9: 'pulmaraton-hradek.cz', 10: 'kavarna-podvezi.cz', 11: 'ck-vlnka.cz', 12: 'kolo-pro-vsechny.cz' };
  const VIEWS = [
    { id: 'page', label: 'Stránka', ico: '🖥️' },
    { id: 'reader', label: 'Čtečka', ico: '🦯', who: 'karel' },
    { id: 'keys', label: 'Klávesnice', ico: '⌨️', who: 'tomas' },
    { id: 'contrast', label: 'Kontrast', ico: '👓', who: 'jana' },
    { id: 'motion', label: 'Pohyb', ico: '🌀', who: 'eliska' }
  ];
  const FILES = [['html', 'index.html', 'html'], ['css', 'style.css', 'css'], ['js', 'script.js', 'js']];
  const CLIENT_COLOR = '#4f5b70';
  const VAGUE = /^(zde|tady|sem|klikn\w*( (sem|zde|tady))?|cist dal|cist vic|vice|vic|dalsi|odkaz|info|podrobnosti|here|click here|more|read more)$/;

  /* ---------------- profil ---------------- */
  function newProfile(name) {
    return { v: 1, name, form: Math.random() < 0.5 ? 'A' : 'B', pre: null, post: null, levels: {}, badges: [], events: [], problems: {}, seen: {}, listened: false, walked: false, created: Date.now() };
  }
  const save = () => { if (P) Kit.write(KEY, P); topStats(); };
  const lState = id => P.levels[id] || (P.levels[id] = {
    done: false, stars: [false, false, false], runs: 0, runsTotal: 0, hints: 0, solution: false, timeMs: 0, code: null,
    firstTry: false, wonAt: null, fails: 0
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
  /* rady testerů: značky a atributy ukážeme jako kód */
  const fixFmt = s => String(s || '').split(/(<\/?[a-z][^>]*>|\b[a-z-]+="[^"]*")/gi).map((part, i) => (i % 2 ? `<code>${esc(part)}</code>` : md(part))).join('');
  const hl = (code, lang) => Highlight(code, lang || 'html');
  const fold = C.H.fold;
  function logEvent(type, data) {
    P.events.push(Object.assign({ t: Date.now(), type }, data));
    if (P.events.length > 600) P.events.splice(0, P.events.length - 600);
  }
  const personaOf = (l, who) => (who === 'klient'
    ? { name: l.client.name, role: l.client.role, ico: l.client.ico, color: CLIENT_COLOR, short: 'klient', ok: 'Takhle je to v pořádku.' }
    : PERSONAS[who]);
  function announce(text) {
    const a = $('#announcer');
    a.textContent = '';
    setTimeout(() => { a.textContent = text; }, 60);
  }

  function topStats() {
    $('#topStars').innerHTML = `<span class="ico" aria-hidden="true">★</span>${starCount()}/${MAX_STARS}`;
    $('#topStars').setAttribute('aria-label', `Hvězdy: ${starCount()} z ${MAX_STARS}`);
    $('#mapBtn').hidden = !(P && P.pre);
    $('#soundBtn').textContent = Kit.soundOn ? '🔊' : '🔇';
    $('#soundBtn').setAttribute('aria-pressed', String(Kit.soundOn));
  }
  function crumb(parts) {
    $('#crumb').innerHTML = parts.map((p, i) => (p.go ? `<button class="link" data-crumb="${i}">${esc(p.label)}</button>` : `<span${i === parts.length - 1 ? ' aria-current="page"' : ''}>${esc(p.label)}</span>`)).join('<span class="sep" aria-hidden="true"> › </span>');
    $$('#crumb [data-crumb]').forEach(b => b.addEventListener('click', () => parts[+b.dataset.crumb].go()));
    document.title = (parts.length ? parts[parts.length - 1].label + ' – ' : '') + 'Web bez bariér';
  }
  function leave() {
    if (view && view.cleanup) view.cleanup();
    view = null;
    Kit.closeModal(true);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    window.scrollTo(0, 0);
  }
  /* po přechodu na novou obrazovku dostane fokus její hlavní nadpis (čtečka hned ví, kde je) */
  function focusHeading() {
    const h = $('#app h1');
    if (!h) return;
    h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  }

  function checkBadges(ctx) {
    ctx = ctx || {};
    const earned = [];
    const award = id => { if (!P.badges.includes(id)) { P.badges.push(id); earned.push(id); } };
    const chDone = ch => LEVELS.filter(l => l.chapter === ch.id).every(l => isDone(l.id));
    if (doneCount() >= 1) award('first');
    if (ctx.oneshot) award('oneshot');
    if (P.listened) award('listen');
    if (P.walked) award('tabwalk');
    C.CHAPTERS.forEach(ch => { if (chDone(ch)) award('ch' + ch.id); });
    if (P.levels[5] && P.levels[5].stars[2]) award('aaa');
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

  /* ---------------- úvod ---------------- */
  const DEMO = [
    ['čtečka', 'stránka, Pekárna U Lípy'],
    ['čtečka', 'obrázek bez popisu, chleba.svg'],
    ['Karel', '„Co to je? Chleba, nebo koláč?“'],
    ['kód', '<img src="chleba.svg" alt="Kváskový chléb">'],
    ['čtečka', 'obrázek, Kváskový chléb'],
    ['Karel', '„Konečně vím, co pečete!“']
  ];
  function renderIntro() {
    leave();
    crumb([]);
    const cont = P
      ? `<div class="welcome">
           <p>Vítej zpět, <b>${esc(P.name)}</b>.</p>
           <p class="muted">Splněno ${doneCount()} z ${LEVELS.length} zakázek, ★ ${starCount()} z ${MAX_STARS}.</p>
         </div>
         <div class="btn-row"><button class="btn primary big" id="contBtn">${P.pre ? 'Pokračovat v zakázkách' : 'Pokračovat vstupním testem'}</button>
           <button class="btn ghost" id="resetBtn">Začít znovu</button></div>`
      : `<label class="field" for="name">Jak ti máme říkat?</label>
         <input class="field-input" id="name" maxlength="24" autocomplete="nickname" placeholder="např. Bára">
         <div class="btn-row"><button class="btn primary big" id="startBtn">Nastoupit do studia</button></div>`;
    app.innerHTML = `
      <section class="screen">
        <div class="intro">
          <div class="intro-copy">
            <h1 class="logo"><span>Web bez bariér</span></h1>
            <p class="lead">Nastupuješ do malého studia, které opravuje weby. Klienti mají hezké stránky, jenže je nezvládnou <b>skuteční lidé</b>: Karel se čtečkou obrazovky, Tomáš jen s klávesnicí, slabozraká Jana a Eliška, které se dělá zle z pohybu. Opravíš <b>HTML, CSS a JavaScript</b> a oni stránku hned vyzkouší.</p>
            ${cont}
          </div>
          <div class="intro-visual">
            <div class="paving" aria-hidden="true">
              <div class="speech">
                <div class="sp-head"><span class="sp-dot"></span>Co slyší Karel</div>
                <ol class="sp-feed" id="feed"></ol>
              </div>
            </div>
          </div>
        </div>
        <h2 class="testers-h">Tvoji testeři</h2>
        <ul class="persona-row">${Object.values(PERSONAS).map(p => `
          <li class="persona" style="--pc:${p.color}"><span class="ava" aria-hidden="true">${p.ico}</span>
            <div><b>${esc(p.name)}, ${p.age} let</b><small>${esc(p.role)}</small></div></li>`).join('')}
        </ul>
        <ol class="steps">
          <li><b>Vstupní test</b><small>10 otázek, asi 3 minuty. Zjistíme, co už o přístupnosti víš.</small></li>
          <li><b>12 zakázek ve 3 kapitolách</b><small>Pekárna, knihovna, kino, divadlo, úřad… a na konci e-shop.</small></li>
          <li><b>Výstupní test a výsledky</b><small>Uvidíš, v čem ses zlepšil(a), dovednost po dovednosti.</small></li>
        </ol>
      </section>`;
    const feed = $('#feed');
    const timers = [];
    DEMO.forEach(([who, text], i) => timers.push(setTimeout(() => {
      feed.insertAdjacentHTML('beforeend', `<li class="${who === 'kód' ? 'code' : who === 'Karel' ? 'person' : ''}"><span class="f-w">${esc(who)}</span><span class="f-x">${esc(text)}</span></li>`);
    }, RM() ? 0 : 400 + i * 900)));
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
        const name = $('#name').value.trim() || 'Auditor';
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
    crumb(pre ? [{ label: 'Vstupní test' }] : [{ label: 'Zakázky', go: renderMap }, { label: 'Výstupní test' }]);
    app.innerHTML = `
      <section class="screen" id="quizBox">
        <div class="card narrow quiz-intro">
          <span class="pill">${pre ? 'Krok 1 ze 3' : 'Krok 3 ze 3'}</span>
          <h1>${pre ? 'Vstupní test' : 'Výstupní test'}</h1>
          <p class="lead">${pre
            ? 'Než dostaneš první zakázku, zjistíme, co už o přístupnosti webu víš. Výsledek se nehodnotí, slouží jen k porovnání s koncem hry.'
            : 'Ukaž, co ses naučil(a). Otázky jsou podobné jako na začátku, ale ne stejné. Každá míří na jednu dovednost ze zakázek.'}</p>
          <ul>
            <li>10 otázek s výběrem odpovědi. Odpovídat můžeš i klávesami 1–5.</li>
            <li>Když nevíš, zvol <b>Nevím</b>. Je to poctivější než hádat a měření je pak přesnější.</li>
            <li>Správné odpovědi uvidíš ${pre ? 'na konci hry' : 'hned ve výsledcích'}.</li>
          </ul>
          <div class="btn-row"><button class="btn primary big" id="quizGo" data-focus>Začít test</button></div>
        </div>
      </section>`;
    focusHeading();
    $('#quizGo').addEventListener('click', () => {
      const quiz = Kit.runQuiz({
        container: $('#quizBox'),
        label: pre ? 'Vstupní test' : 'Výstupní test',
        items: C.QUIZ[form],
        highlight: (code, lang) => hl(code, lang || 'html'),
        lang: 'html',
        onAnswer() { setTimeout(() => { const h = $('#quizBox h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }, 0); },
        onDone(answers) {
          view = null;
          P[which] = { form, answers, at: Date.now() };
          logEvent('quiz', { which, form, correct: answers.filter(a => a.correct).length });
          save();
          if (pre) afterPre(); else { checkBadges(); save(); renderResults(); Kit.confetti(['★', '♿', '✔'], ['#ffd400', '#14213d', '#6d3fb5', '#1d4ed8']); }
        }
      });
      const h = $('#quizBox h2');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      view = { cleanup: () => quiz.stop() };
    });
  }

  function afterPre() {
    const s = Kit.quizStats(P.pre.answers);
    renderMap();
    const m = Kit.modal(`
      <h2>Vstupní test hotový</h2>
      <p>Správně <b>${s.correct} z ${s.n}</b>${s.dunno ? `, „nevím“ ${s.dunno}×` : ''}. Na konci uvidíš, o kolik ses posunul(a).</p>
      <p>Čeká tě <b>12 zakázek</b>. V každé opravíš kód webu a testeři ho hned vyzkouší.</p>
      <ul class="vstats">
        <li class="ok">👁 Nad stránkou přepínáš pohledy: co slyší čtečka, kudy vede Tab, jaký má text kontrast a co se hýbe.</li>
        <li class="ok">▶ Otestovat s lidmi (Ctrl+Enter) pustí na web všechny testery. Každý ti řekne, co ho zastavilo.</li>
        <li class="ok">★ Hvězdy: za spokojené testery, za nejvýš 3 testy a za bonusový úkol.</li>
      </ul>
      <div class="btn-row"><button class="btn primary big" data-play data-focus>Začít zakázku 1</button><button class="btn ghost" data-close>Na přehled zakázek</button></div>`);
    $('[data-play]', m).addEventListener('click', () => renderLevel(1));
  }

  /* ---------------- mapa ---------------- */
  function renderMap() {
    leave();
    if (!P || !P.pre) { renderIntro(); return; }
    crumb([{ label: 'Zakázky' }]);
    const done = doneCount();
    const nextId = (LEVELS.find(l => !isDone(l.id)) || {}).id;
    const canPost = done >= 8;
    const btn = l => {
      const s = P.levels[l.id];
      const open = unlocked(l.id);
      const cls = isDone(l.id) ? 'done' : l.id === nextId ? 'next' : open ? 'open' : 'locked';
      const n = s ? s.stars.filter(Boolean).length : 0;
      const stars = [0, 1, 2].map(i => `<i class="${s && s.stars[i] ? 'on' : ''}">★</i>`).join('');
      return `<button class="node ${cls}" data-l="${l.id}" ${open ? '' : 'disabled'} aria-label="Zakázka ${l.id}: ${esc(l.title)}, ${esc(l.concept)}${open ? `, hvězdy ${n} ze 3` : ', zamčeno'}">
          <span class="n-num" aria-hidden="true">${open ? l.client.ico : '🔒'}</span>
          <span class="n-title" aria-hidden="true">${esc(l.title)}</span>
          <span class="n-sub" aria-hidden="true">${l.id}. ${esc(l.concept)}</span>
          <span class="n-stars" aria-hidden="true">${stars}</span>
        </button>`;
    };
    const nextL = LEVELS.find(l => l.id === nextId);
    app.innerHTML = `
      <section class="screen">
        <div class="map-hero">
          <div>
            <h1>Zakázky studia</h1>
            <p>${esc(P.name)}, zakázky se odemykají postupně. Hotovo je, až když web zvládnou všichni testeři.</p>
            <div class="meter"><span class="bar" role="progressbar" aria-label="Hotové zakázky" aria-valuemin="0" aria-valuemax="${LEVELS.length}" aria-valuenow="${done}"><span class="post" style="width:${Kit.pct(done, LEVELS.length)}%"></span></span>
              <span>${done}/${LEVELS.length} zakázek</span><span class="muted">★ ${starCount()}/${MAX_STARS}</span></div>
          </div>
          <div class="btn-row">
            <button class="btn" id="cheatBtn">📖 Tahák přístupnosti</button>
            ${P.post ? '<button class="btn primary" id="resBtn">📊 Výsledky</button>' : ''}
          </div>
        </div>
        ${nextL ? `<div class="next-up">
            <span class="nu-num" aria-hidden="true">${pad2(nextL.id)}</span>
            <div class="nu-text"><small>Další zakázka: ${esc(chapterOf(nextL).title.toLowerCase())}</small><b>${esc(nextL.title)}</b><span class="nu-who">${nextL.personas.map(w => `<span class="mini-ava" style="--pc:${PERSONAS[w].color}" title="${esc(PERSONAS[w].name)}">${PERSONAS[w].ico}</span>`).join('')} ${nextL.personas.length > 1 ? 'testují' : 'testuje'} ${nextL.personas.map(w => esc(PERSONAS[w].name)).join(', ')}</span></div>
            <button class="btn primary big" data-l="${nextL.id}">▶ Pustit se do zakázky ${nextL.id}</button>
          </div>` : ''}
        ${C.CHAPTERS.map(ch => {
          const ls = LEVELS.filter(l => l.chapter === ch.id);
          return `<section class="track c${ch.id}" aria-labelledby="ch${ch.id}">
            <div class="track-head"><span class="t-ico" aria-hidden="true">${ch.icon}</span><div><h2 id="ch${ch.id}">Kapitola ${ch.id}: ${esc(ch.title)}</h2><small>${esc(ch.desc)}</small></div>
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
                ? `<p>Máš za sebou ${done} zakázek, můžeš si změřit pokrok. ${done < LEVELS.length ? 'Doporučujeme ale nejdřív dokončit všech 12.' : 'E-shop je přístupný, gratulujeme!'}</p>`
                : `<p class="muted">Odemkne se po splnění 8 zakázek (zatím ${done}). Pak porovnáme, co jsi uměl(a) na začátku a co umíš teď.</p>`}
          </div>
          ${P.post ? '<button class="btn primary big" id="resBtn2">Zobrazit výsledky</button>'
            : canPost ? '<button class="btn primary big" id="postBtn">Spustit výstupní test</button>' : ''}
        </section>
      </section>`;
    focusHeading();
    $$('[data-l]').forEach(b => b.addEventListener('click', () => { Kit.sound('click'); renderLevel(+b.dataset.l); }));
    $('#cheatBtn').addEventListener('click', cheatSheet);
    ['#resBtn', '#resBtn2'].forEach(s => { const b = $(s); if (b) b.addEventListener('click', renderResults); });
    const pb = $('#postBtn');
    if (pb) pb.addEventListener('click', () => renderQuiz('post'));
  }

  function cheatSheet() {
    const lesBtn = x => LESSONS[x.id] ? `<button class="btn small" data-lesson="${x.id}">📖 Lekce s příkladem</button>` : '';
    const items = LEVELS.map(l => (isDone(l.id)
      ? `<div class="learn"><b>${l.id}. ${esc(l.title)}: ${esc(l.concept)}</b><p>${md(l.learn[0])}</p><pre class="code">${hl(l.learn[1], l.learn[2])}</pre>${lesBtn(l)}</div>`
      : unlocked(l.id) ? `<div class="learn"><b>${l.id}. ${esc(l.title)}: ${esc(l.concept)}</b><p class="small muted">Tahle zakázka tě ještě čeká. Lekci si můžeš projít už teď.</p>${lesBtn(l)}</div>`
      : `<div class="learn locked"><b>🔒 ${l.id}. ${esc(l.concept)}</b><p class="small muted">Odemkne se po dokončení zakázky.</p></div>`)).join('');
    const cm = Kit.modal(`<h2>📖 Tahák přístupnosti</h2>
      <p class="muted small">Pravidla, která jsi při zakázkách použil(a). Vycházejí z WCAG 2.2, mezinárodních pravidel přístupnosti webu.</p>
      <div class="rules-grid">
        <div><b>🦯 Čtečka obrazovky</b><span>čte stránku nahlas a skáče po nadpisech, odkazech, polích a oblastech</span></div>
        <div><b>⌨️ Klávesnice</b><span>Tab dál, Shift+Tab zpět, Enter a mezerník spustí, šipky přepínají</span></div>
        <div><b>👓 Kontrast</b><span>běžný text 4,5 : 1, velký text 3 : 1, rámeček fokusu 3 : 1</span></div>
        <div><b>🌀 Pohyb</b><span>prefers-reduced-motion v CSS i JS, delší pohyb jde zastavit</span></div>
      </div>
      <div class="cheat">${items}</div>`, { cls: 'wide' });
    Kit.$$('[data-lesson]', cm).forEach(btn => btn.addEventListener('click', () => openLesson(LEVELS.find(x => x.id === +btn.dataset.lesson))));
  }

  /* ---------------- briefing ---------------- */
  /* lekce: živý náhled příkladu + co z něj přečte čtečka (stejný auditor jako ve hře) */
  function lessonRun(code, out, les) {
    let f = out.querySelector('iframe.ls-frame');
    if (!f) {
      out.innerHTML = '<iframe class="ls-frame" title="Náhled příkladu z lekce"></iframe><div class="ls-reader"><p class="ls-reader-h">🔊 Čtečka obrazovky přečte:</p><ol></ol></div>';
      f = out.querySelector('iframe');
    }
    const list = out.querySelector('.ls-reader ol');
    const tok = (out._tok = (out._tok || 0) + 1);
    A11y.load(f, { html: '<style>body{margin:12px;font:16px/1.5 system-ui,"Segoe UI",sans-serif;color:#1b1b1f}</style>' + code, css: '', js: '' }, { settle: 60, assets: les && les.assets }).then(({ doc }) => {
      if (tok !== out._tok || !doc || !doc.body) return;
      const read = () => {
        let lines = [];
        try { lines = A11y.linearize(doc).map(x => x.text).filter(Boolean); } catch (e) { lines = []; }
        list.innerHTML = lines.length ? lines.map(t => `<li>${esc(t)}</li>`).join('') : '<li>(stránka je pro čtečku prázdná)</li>';
      };
      read();
      const again = () => setTimeout(read, 80);
      ['click', 'input', 'keyup'].forEach(ev => doc.addEventListener(ev, again, true));
    });
  }
  const LESSON_OPTS = { run: lessonRun };
  function openLesson(l) {
    if (LESSONS[l.id]) Lesson.open({ modal: Kit.modal, lesson: LESSONS[l.id], kicker: `Lekce k zakázce ${l.id}: ${l.title}`, back: 'Zpět k zakázce', mountOpts: LESSON_OPTS });
  }

  function briefing(l, first, onClose, start) {
    const ava = who => { const p = personaOf(l, who); return `<span class="ava" style="--pc:${p.color}" aria-hidden="true">${p.ico}</span>`; };
    const msgs = l.brief.map(([who, text], i) => {
      const p = personaOf(l, who);
      return `<div class="msg ${who === 'klient' ? 'client' : 'tester'}" style="--pc:${p.color}; animation-delay:${first && !RM() ? 0.2 + i * 0.6 : 0}s">${ava(who)}<div class="bubble"><span class="who">${esc(p.name)}<small>${esc(who === 'klient' ? p.role : p.short)}</small></span>${md(text)}</div></div>`;
    }).join('');
    const pv = VIEWS.find(v => v.who === l.personas[0]);
    const m = Lesson.intro({
      modal: Kit.modal, close: () => Kit.closeModal(), first, animate: first, start,
      onClose: onClose ? (box => onClose(box.dataset.view)) : null,
      head: `<p class="b-kicker">${chapterOf(l).icon} ${esc(chapterOf(l).title)} · zakázka ${l.id} z ${LEVELS.length}</p><h2>${esc(l.title)}</h2>`,
      story: `<div class="chat">${msgs}</div>`,
      lesson: LESSONS[l.id], mountOpts: LESSON_OPTS,
      task: `<div class="b-task"><b>Úkol:</b> ${md(l.task)}</div>${pv ? `<p class="st-view"><button class="btn" type="button" data-view="${pv.id}">${pv.ico} Ukázat pohled ${esc(pv.label)}</button> <span class="small muted">Uvidíš web tak, jak ho vnímá tester.</span></p>` : ''}`,
      stars: [
        { t: 'Všichni spokojení', d: 'Každý tester zvládne web po svém: se čtečkou, jen klávesnicí, se slabým zrakem i bez rušivého pohybu. Projdou všechny kontroly zakázky.' },
        { t: 'Nejvýš 3 testy', d: 'Testy spusť nejvýš třikrát. Mezi tím si web prohlédni v pohledech testerů, ty se mění hned, jak píšeš.' },
        { t: 'Bonus navíc', d: l.bonus.text }
      ],
      done: 'Jdu na to ♿'
    });
    const vb = $('[data-view]', m);
    if (vb) vb.addEventListener('click', () => { m.dataset.view = vb.dataset.view; Kit.closeModal(); });
    return m;
  }

  /* ---------------- zakázka (úroveň) ---------------- */
  function renderLevel(id) {
    leave();
    const l = LEVELS.find(x => x.id === id);
    if (!l || !unlocked(id)) { renderMap(); return; }
    const ch = chapterOf(l);
    const ls = lState(id);
    const ses = {
      runs: 0, fails: 0, solution: false, t0: performance.now(), timers: [], running: false, res: null,
      view: l.startView || 'page', reduce: true, jana: false, showAll: false, walk: null, pv: 0, readerFilter: 'all', speaking: false,
      file: l.edit[0], pdoc: null, pwin: null, focusInfo: null
    };
    const later = (f, ms) => { const t = setTimeout(f, ms); ses.timers.push(t); return t; };
    crumb([{ label: 'Zakázky', go: renderMap }, { label: ch.title }, { label: `${l.id}. ${l.title}` }]);
    const prev = LEVELS.find(x => x.id === id - 1);
    const next = LEVELS.find(x => x.id === id + 1);
    const shownFiles = FILES.filter(([k]) => l.edit.includes(k) || (l.files[k] || '').trim());
    const code = Object.assign({}, l.files, ls.code || {});
    const files = () => ({ html: code.html, css: code.css, js: code.js });
    const testers = l.personas.concat(l.checks.some(c => c.who === 'klient') ? ['klient'] : []);

    app.innerHTML = `
      <section class="ws-screen fit">
        <header class="mbar">
          <span class="mb-num" aria-hidden="true">${pad2(l.id)}</span>
          <div class="mb-text"><span class="mb-where">${ch.icon} ${esc(ch.title)}<code class="mb-concept" title="Co se v zakázce procvičuje">${esc(l.concept)}</code></span><h1><span class="sr-only">Zakázka ${l.id}: </span>${esc(l.title)}</h1></div>
          <div class="mb-right">
            <ul class="goals" id="goals" aria-label="Hvězdy za zakázku"></ul>
            <nav class="mb-nav" aria-label="Další zakázky">
              <button class="icon-btn" id="prevBtn" title="Předchozí zakázka" aria-label="Předchozí zakázka" ${prev ? '' : 'disabled'}>◀</button>
              <button class="icon-btn" id="nextBtn" title="Další zakázka" aria-label="Další zakázka" ${next && isDone(id) ? '' : 'disabled'}>▶</button>
            </nav>
          </div>
        </header>
        <section class="panel brief-strip" aria-label="Zadání">
          <div class="bs-client"><span class="ava" aria-hidden="true">${l.client.ico}</span><span><b>${esc(l.client.name)}</b><small>${esc(l.client.role)}</small></span></div>
          <div class="bs-text">
            <p class="task">${md(l.task)}</p>
            <p class="bonus-line"><span class="bl-star" aria-hidden="true">★</span> <b>Bonus navíc:</b> ${md(l.bonus.text)}</p>
          </div>
          <div class="brief-actions">
            <button class="btn small" id="briefBtn">💬 Briefing</button>
            <button class="btn small" id="lessonBtn" title="Nová věc o přístupnosti na živém příkladu i s tím, co přečte čtečka">📖 Lekce</button>
            <button class="btn small" id="hintBtn"></button>
            <button class="btn small ghost" id="tourBtn" title="Průvodce obrazovkou: co je kde a k čemu to slouží">❔ Průvodce</button>
            <button class="btn small ghost" id="solBtn" hidden>👀 Ukázat řešení</button>
          </div>
          <div class="hints" id="hints" aria-live="polite"></div>
        </section>
        <div class="ws wide-left">
          <div class="col browser-col">
            <section class="panel browser" aria-label="Prohlížeč s webem klienta">
              <div class="views" role="tablist" aria-label="Pohledy na web">${VIEWS.map(v => {
                const on = v.id === ses.view;
                const p = v.who ? PERSONAS[v.who] : null;
                const tests = p && l.personas.includes(v.who);
                return `<button role="tab" class="vtab ${tests ? 'tests' : ''}" id="vt-${v.id}" data-v="${v.id}" aria-selected="${on}" aria-controls="viewport" tabindex="${on ? 0 : -1}"${p ? ` style="--pc:${p.color}"` : ''}><span aria-hidden="true">${v.ico}</span> ${v.label}${tests ? '<i class="vdot" aria-hidden="true"></i><span class="sr-only"> (testuje ' + esc(p.name) + ')</span>' : ''}</button>`;
              }).join('')}</div>
              <div class="addr"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="url"><span aria-hidden="true">🔒</span> ${DOMAINS[l.id] || 'web.cz'}</span><button class="icon-btn small" id="reloadBtn" title="Načíst stránku znovu" aria-label="Načíst stránku znovu">↻</button></div>
              <div class="viewport" id="viewport" role="tabpanel" aria-labelledby="vt-${ses.view}">
                <iframe id="preview" title="Web klienta: ${esc(l.title)}"></iframe>
                <div class="ov" id="ov" aria-hidden="true"></div>
                <div class="reader" id="reader" hidden></div>
              </div>
              <div class="vbar" id="vbar"></div>
            </section>
          </div>
          <div class="col">
            <section class="panel code-pane" aria-label="Kód webu">
              <div class="tabs" role="tablist" aria-label="Soubory">${shownFiles.map(([k, nm]) => {
                const ro = !l.edit.includes(k);
                return `<button class="tab ${k === ses.file ? 'on' : ''} ${ro ? 'ro' : ''}" role="tab" id="ft-${k}" data-f="${k}" aria-selected="${k === ses.file}" tabindex="${k === ses.file ? 0 : -1}" aria-controls="editor"${ro ? ' title="Tenhle soubor v zakázce jen čteš"' : ''}>${nm}${ro ? '<span aria-hidden="true"> 🔒</span><span class="sr-only">, jen ke čtení</span>' : ''}</button>`;
              }).join('')}<span class="sp"></span><button class="btn small ghost" id="snipBtn" aria-expanded="false" aria-controls="paletteWrap" title="Úryvky kódu, když nevíš, jak něco zapsat">🧩 Úryvky</button><button class="btn small ghost" id="resetBtn" title="Vrátit původní kód zakázky">↺ Původní</button></div>
              <div class="palette-wrap" id="paletteWrap" hidden><div class="palette" id="palette"></div></div>
              <div id="editor" role="tabpanel" aria-labelledby="ft-${ses.file}"></div>
              <p class="sr-only" id="edHelp">Editor kódu. Klávesa Tab odsazuje, Esc a potom Tab přesune fokus z editoru dál. Ctrl+Enter spustí test.</p>
              <div class="runbar">
                <button class="btn go big" id="runBtn">▶ Otestovat s lidmi <kbd>Ctrl+Enter</kbd></button>
                <div class="status" id="status"></div>
              </div>
              <div class="results" id="results"></div>
            </section>
          </div>
        </div>
      </section>`;

    /* ---------- editor a soubory ---------- */
    const ed = new CodeEditor($('#editor'), { lang: ses.file, tab: 2, onRun: () => run(), label: 'Editor souboru', describedBy: 'edHelp' });
    function showFile(k) {
      ses.file = k;
      ed.setReadOnly(!l.edit.includes(k));
      ed.setLang(FILES.find(f => f[0] === k)[2]);
      ed.value = code[k] || '';
      $$('.code-pane .tab').forEach(t => { const on = t.dataset.f === k; t.classList.toggle('on', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      $('#editor').setAttribute('aria-labelledby', 'ft-' + k);
      ed.ta.setAttribute('aria-label', `Editor souboru ${FILES.find(f => f[0] === k)[1]}${l.edit.includes(k) ? '' : ', jen ke čtení'}`);
      renderPalette();
      markErrors();
    }
    function renderPalette() {
      const items = l.palette.filter(p => p.f === ses.file);
      $('#palette').innerHTML = items.length
        ? items.map((p, i) => `<button class="chip" data-p="${l.palette.indexOf(p)}" ${l.edit.includes(ses.file) ? '' : 'disabled'}>${esc(p.s.replace(/\|/g, '').replace(/\n\s*/g, ' '))}</button>`).join('')
        : `<span class="p-label">${l.edit.includes(ses.file) ? 'Pro tenhle soubor tu nic není.' : 'Tenhle soubor v zakázce neměníš.'}</span>`;
      $$('#palette [data-p]').forEach(b => b.addEventListener('click', () => {
        const s = l.palette[+b.dataset.p].s;
        ed.insertSnippet(s.includes('|') ? s : s + '|', !s.includes('\n'));
        Kit.sound('type');
      }));
    }
    $$('.code-pane .tab').forEach(t => t.addEventListener('click', () => { Kit.sound('click'); showFile(t.dataset.f); }));
    const snipOpen = open => {
      $('#paletteWrap').hidden = !open;
      $('#snipBtn').setAttribute('aria-expanded', String(open));
      $('#snipBtn').classList.toggle('on', open);
      Kit.write('webBezBarier.snips', open);
    };
    snipOpen(!!Kit.read('webBezBarier.snips', false));
    $('#snipBtn').addEventListener('click', () => { Kit.sound('click'); snipOpen($('#paletteWrap').hidden); });
    tabKeys($('.code-pane .tabs'), '.tab', b => showFile(b.dataset.f));
    let saveT = 0;
    let liveT = 0;
    ed.onChange(v => {
      if (!l.edit.includes(ses.file)) return;
      code[ses.file] = v;
      clearTimeout(saveT);
      saveT = setTimeout(() => { ls.code = pickEditable(); save(); }, 600);
      clearTimeout(liveT);
      liveT = setTimeout(() => refreshPreview(), 800);
    });
    const pickEditable = () => { const o = {}; l.edit.forEach(k => { o[k] = code[k]; }); return o; };

    /* ---------- prohlížeč a pohledy ---------- */
    const frame = $('#preview');
    const ovEl = $('#ov');
    const reader = $('#reader');
    let drawRaf = 0;
    const schedDraw = () => { cancelAnimationFrame(drawRaf); drawRaf = requestAnimationFrame(drawOverlay); };
    let mo = null;
    function previewOpts() {
      return { assets: l.assets, focus: ses.view === 'keys', motion: ses.view === 'motion' ? (ses.reduce ? 'reduce' : 'normal') : undefined };
    }
    async function refreshPreview() {
      stopWalk(true);
      const token = ++ses.pv;
      const { doc, win } = await A11y.load(frame, files(), previewOpts());
      if (token !== ses.pv || !document.contains(frame)) return;
      ses.pdoc = doc;
      ses.pwin = win;
      ses.focusInfo = null;
      try {
        win.addEventListener('scroll', schedDraw, { passive: true });
        win.addEventListener('resize', schedDraw);
        if (mo) mo.disconnect();
        mo = new MutationObserver(() => { schedDraw(); if (ses.view === 'reader') renderReader(); if (ses.view === 'motion' || ses.view === 'contrast') renderVbar(); });
        mo.observe(doc.body, { subtree: true, childList: true, attributes: true, characterData: true });
        // stránka hráče nesmí odvést prohlížeč jinam
        doc.addEventListener('keydown', e => { if (e.key === 'Escape' && ses.walk) stopWalk(); });
      } catch (e) { /* stránka bez body */ }
      renderView();
    }
    function renderView() {
      frame.classList.toggle('jana', ses.view === 'contrast' && ses.jana);
      reader.hidden = ses.view !== 'reader';
      frame.setAttribute('aria-hidden', String(ses.view === 'reader'));
      frame.tabIndex = ses.view === 'reader' ? -1 : 0;
      $('#viewport').setAttribute('aria-labelledby', 'vt-' + ses.view);
      $('#viewport').dataset.v = ses.view;
      if (ses.view === 'reader') renderReader();
      renderVbar();
      drawOverlay();
    }
    function setView(v, keepFocus) {
      if (ses.view === v) return;
      const before = ses.view;
      ses.view = v;
      if (window.speechSynthesis && ses.speaking) { window.speechSynthesis.cancel(); ses.speaking = false; }
      $$('.views .vtab').forEach(b => { const on = b.dataset.v === v; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      const needReload = (before === 'keys') !== (v === 'keys') || before === 'motion' || v === 'motion';
      if (needReload) refreshPreview(); else renderView();
      if (!keepFocus) { const b = $(`#vt-${v}`); if (b) b.focus({ preventScroll: true }); }
    }
    $$('.views .vtab').forEach(b => b.addEventListener('click', () => { Kit.sound('click'); setView(b.dataset.v, true); }));
    tabKeys($('.views'), '.vtab', b => setView(b.dataset.v));
    $('#reloadBtn').addEventListener('click', () => { Kit.sound('click'); refreshPreview(); });

    /* --- čtečka --- */
    const RFILTERS = [['all', 'Vše'], ['h', 'Nadpisy'], ['k', 'Odkazy'], ['f', 'Ovládací prvky'], ['d', 'Oblasti']];
    const RF = { all: () => true, h: x => x.kind === 'heading', k: x => x.kind === 'link', f: x => ['field', 'button', 'group'].includes(x.kind), d: x => x.kind === 'landmark' };
    const RK = { title: 'stránka', heading: 'nadpis', link: 'odkaz', button: 'tlačítko', img: 'obrázek', field: 'pole', landmark: 'oblast', end: 'konec', list: 'seznam', group: 'skupina', live: 'oznámení', text: 'text' };
    function problemOf(x) {
      if (x.kind === 'img' && x.noAlt) return 'Obrázek nemá alt.';
      if ((x.kind === 'link' || x.kind === 'button' || x.kind === 'field') && x.noName) return 'Prvek nemá přístupné jméno.';
      if (x.kind === 'field' && x.from === 'placeholder') return 'Pole má jen placeholder, ne popisek.';
      if (x.kind === 'link' && VAGUE.test(fold(x.name))) return 'Text odkazu neříká, kam vede.';
      if (/▾|▸|►|▼/.test(x.text)) return 'Čtečka čte ozdobný znak.';
      if (x.kind === 'heading' && !x.name) return 'Prázdný nadpis.';
      return '';
    }
    function readerLines() {
      if (!ses.pdoc || !ses.pdoc.body) return [];
      const mouse = A11y.mouseOnly(ses.pdoc);
      return A11y.linearize(ses.pdoc).map(x => {
        let pr = problemOf(x);
        if (!pr && x.kind === 'text' && x.el && mouse.some(m => m.contains(x.el))) pr = 'Na tohle jde kliknout jen myší. Čtečka to ohlásí jako obyčejný text.';
        return Object.assign({}, x, { el: undefined, pr });
      });
    }
    function renderReader() {
      if (!ses.pdoc) return;
      const all = readerLines();
      const lang = A11y.pageInfo(ses.pdoc).lang;
      const shown = all.filter(RF[ses.readerFilter]);
      const empty = { h: 'Na stránce nejsou žádné nadpisy. Karel nemá kam skákat.', k: 'Na stránce nejsou žádné odkazy.', f: 'Na stránce nejsou žádná tlačítka ani pole.', d: 'Stránka nemá žádné oblasti (header, nav, main, footer). Karel nemá kam skočit.', all: 'Stránka je pro čtečku prázdná.' };
      const probs = all.filter(x => x.pr).length;
      const sig = ses.readerFilter + '|' + ses.speaking + '|' + lang + '|' + shown.map(x => x.text + (x.pr ? '!' : '')).join('\n');
      if (reader.dataset.sig === sig) return;
      reader.dataset.sig = sig;
      const had = reader.contains(document.activeElement) ? (document.activeElement.dataset.rf ? `[data-rf="${document.activeElement.dataset.rf}"]` : document.activeElement.id ? '#' + document.activeElement.id : '') : '';
      reader.innerHTML = `
        <div class="rd-head">
          <span class="rd-who"><span class="ava" aria-hidden="true">🦯</span> Co slyší Karel</span>
          <div class="rd-filters" role="group" aria-label="Co má čtečka vypsat">${RFILTERS.map(([k, t]) => `<button class="rf ${ses.readerFilter === k ? 'on' : ''}" data-rf="${k}" aria-pressed="${ses.readerFilter === k}">${t}</button>`).join('')}</div>
          <button class="btn small" id="speakBtn">${ses.speaking ? '■ Zastavit čtení' : '🔊 Přečíst nahlas'}</button>
        </div>
        ${shown.length ? `<ol class="rd-list" id="rdList">${shown.map((x, i) => {
          const pr = x.pr;
          return `<li class="rd k-${x.kind} ${pr ? 'warn' : ''}" data-i="${i}"><span class="rk">${esc(RK[x.kind] || x.kind)}${x.kind === 'heading' ? ' ' + x.level : ''}</span><span class="rt">${esc(x.text)}</span>${pr ? `<span class="rw" title="${esc(pr)}"><span aria-hidden="true">⚠</span><span class="sr-only">${esc(pr)}</span></span>` : ''}</li>`;
        }).join('')}</ol>` : `<p class="rd-empty">${empty[ses.readerFilter]}</p>`}
        <p class="rd-foot ${/^cs\b/i.test(lang) ? '' : 'warn'}">Jazyk stránky: <b>${esc(lang || 'neuvedený')}</b>${/^cs\b/i.test(lang) ? ', čtečka čte českým hlasem.' : ', čtečka čte cizím hlasem.'}${probs ? ` <span class="rd-probs">⚠ ${probs} ${probs === 1 ? 'problém' : probs < 5 ? 'problémy' : 'problémů'}</span>` : ''}</p>`;
      $$('#reader [data-rf]').forEach(b => b.addEventListener('click', () => { ses.readerFilter = b.dataset.rf; Kit.sound('click'); renderReader(); const nb = $(`#reader [data-rf="${ses.readerFilter}"]`); if (nb) nb.focus(); }));
      $('#speakBtn').addEventListener('click', () => toggleSpeak(shown, lang));
      if (had) { const el = $(had, reader); if (el) el.focus({ preventScroll: true }); }
    }
    function toggleSpeak(lines, lang) {
      const synth = window.speechSynthesis;
      if (!synth) { Kit.toast('Tenhle prohlížeč neumí číst nahlas.'); return; }
      if (ses.speaking) { synth.cancel(); ses.speaking = false; renderReader(); $('#speakBtn').focus(); return; }
      const want = (lang || 'en').toLowerCase().split('-')[0];
      const voices = synth.getVoices();
      const voice = voices.find(v => v.lang.toLowerCase().startsWith(want)) || null;
      if (!voice && want === 'cs') Kit.toast('Na tomhle počítači chybí český hlas. Čtečka použije výchozí.', 3600);
      synth.cancel();
      ses.speaking = true;
      renderReader();
      $('#speakBtn').focus();
      lines.slice(0, 40).forEach((x, i) => {
        const u = new SpeechSynthesisUtterance(x.text);
        u.lang = want === 'cs' ? 'cs-CZ' : want === 'en' ? 'en-US' : want;
        if (voice) u.voice = voice;
        u.rate = 1.08;
        u.onstart = () => { $$('#rdList .rd').forEach(li => li.classList.toggle('now', +li.dataset.i === i)); const li = $(`#rdList .rd[data-i="${i}"]`); if (li) li.scrollIntoView({ block: 'nearest' }); };
        u.onend = () => { if (i === Math.min(lines.length, 40) - 1) { ses.speaking = false; if (ses.view === 'reader') renderReader(); } };
        synth.speak(u);
      });
      if (!P.listened) { P.listened = true; logEvent('listen', { level: l.id }); checkBadges(); save(); }
    }

    /* --- pruh pod prohlížečem --- */
    function keepFocus(fn) {
      const a = document.activeElement;
      try { return fn(); } finally { if (a && a !== document.activeElement && document.contains(a) && a.focus && a !== frame) a.focus({ preventScroll: true }); }
    }
    function keysInfo() {
      if (!ses.pdoc || !ses.pdoc.body) return { order: [], vis: [], mouse: [] };
      if (ses.focusInfo) return ses.focusInfo;
      const order = A11y.tabOrder(ses.pdoc);
      const vis = keepFocus(() => order.map(el => A11y.focusIndicator(el)));
      ses.focusInfo = { order, vis, mouse: A11y.mouseOnly(ses.pdoc) };
      return ses.focusInfo;
    }
    function setBar(html, bind) {
      const bar = $('#vbar');
      if (bar.dataset.sig === html) return;
      const had = bar.contains(document.activeElement) ? document.activeElement.id : '';
      bar.innerHTML = html;
      bar.dataset.sig = html;
      if (bind) bind();
      if (had) { const el = document.getElementById(had); if (el) el.focus({ preventScroll: true }); }
    }
    function renderVbar() {
      const v = ses.view;
      if (v === 'page') {
        setBar(`<p class="vb-tip">Takhle web vidí většina lidí. Jak ho zažívají testeři, ukážou pohledy nahoře. Do stránky můžeš klikat i psát.</p>`);
      } else if (v === 'reader') {
        setBar(`<p class="vb-tip">Karel stránku nevidí, jen poslouchá. Filtry nahoře fungují jako zkratky čteček: H nadpisy, K odkazy, D oblasti.</p>`);
      } else if (v === 'keys') {
        const k = keysInfo();
        const nov = k.vis.filter(x => !x.ok).length;
        setBar(`<div class="vb-row">
            <button class="btn small" id="walkBtn">${ses.walk ? '■ Zastavit' : '▶ Projít Tabem'}</button>
            <span class="pill">Zastávek Tabu: <b>${k.order.length}</b></span>
            <span class="pill ${nov ? 'bad' : 'good'}">Bez viditelného fokusu: <b>${nov}</b></span>
            <span class="pill ${k.mouse.length ? 'bad' : 'good'}">Jen pro myš: <b>${k.mouse.length}</b></span>
          </div>
          <p class="vb-tip">Čísla ukazují pořadí Tabu. Zkus to i sám: klikni do stránky a mačkej Tab, Enter a mezerník.</p>`, () => $('#walkBtn').addEventListener('click', tabWalk));
      } else if (v === 'contrast') {
        const items = contrastItems();
        const bad = items.filter(x => !x.ok);
        setBar(`<div class="vb-row">
            <label class="switch"><input type="checkbox" id="janaChk" ${ses.jana ? 'checked' : ''}> <span aria-hidden="true">👓</span> Jak to vidí Jana</label>
            <label class="switch"><input type="checkbox" id="allChk" ${ses.showAll ? 'checked' : ''}> Ukázat i texty, které projdou</label>
            <span class="pill ${bad.length ? 'bad' : 'good'}">${bad.length ? `Neprojde ${bad.length} z ${items.length} textů` : `Všech ${items.length} textů projde`}</span>
          </div>
          ${bad.length ? `<ul class="cfix" aria-label="Texty s malým kontrastem">${bad.slice(0, 12).map(x => `<li><span class="sw" style="color:${x.fg};background:${x.bg}" aria-hidden="true">Aa</span><span class="ct">${esc(x.text)}</span><b>${C.H.num(x.ratio)} : 1</b><span class="need">potřebuje ${x.need === 3 ? '3' : '4,5'}</span>${x.sug ? `<button class="chip" data-copy="${x.sug}" title="Zkopírovat barvu">zkus <i class="sw2" style="background:${x.sug}" aria-hidden="true"></i>${x.sug}</button>` : ''}</li>`).join('')}</ul>` : ''}`, () => {
          $('#janaChk').addEventListener('change', e => { ses.jana = e.target.checked; frame.classList.toggle('jana', ses.jana); });
          $('#allChk').addEventListener('change', e => { ses.showAll = e.target.checked; drawOverlay(); });
          $$('#vbar [data-copy]').forEach(b => b.addEventListener('click', () => copyText(b.dataset.copy)));
        });
      } else if (v === 'motion') {
        const moving = ses.pdoc && ses.pdoc.body ? A11y.movingElements(ses.pdoc) : [];
        const timers = ses.pwin ? A11y.timers(ses.pwin, 1000) : [];
        setBar(`<div class="vb-row">
            <label class="switch"><input type="checkbox" id="reduceChk" ${ses.reduce ? 'checked' : ''}> <span aria-hidden="true">🌀</span> Zapnuté „Omezit pohyb“, jako má Eliška</label>
            <span class="pill ${moving.length ? 'bad' : 'good'}">Nekonečné animace: <b>${moving.length}</b></span>
            <span class="pill ${timers.length ? 'bad' : 'good'}">Opakované časovače: <b>${timers.length}</b></span>
          </div>
          <p class="vb-tip">${ses.reduce ? 'Takhle web vidí Eliška. Pohyb, který tu zůstal, ji obtěžuje.' : 'Takhle web vidí ostatní návštěvníci. Pohyb tu klidně zůstat může.'}</p>`, () => $('#reduceChk').addEventListener('change', e => { ses.reduce = e.target.checked; refreshPreview(); }));
      }
    }
    function contrastItems() {
      if (!ses.pdoc || !ses.pdoc.body) return [];
      return A11y.textElements(ses.pdoc).map(el => {
        const c = A11y.contrast(el);
        return { el, text: A11y.norm(el.textContent).slice(0, 34), ratio: c.ratio, ok: c.ok, need: c.need, fg: c.fg, bg: c.bg, sug: c.ok ? '' : A11y.suggest(c.fg, c.bg, c.need) };
      });
    }
    function copyText(t) {
      const done = () => { Kit.toast(`Barva <b>${esc(t)}</b> zkopírovaná. Vlož ji do style.css.`, 2600); Kit.sound('click'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => Kit.toast(`Barva: <b>${esc(t)}</b>`, 4000));
      else Kit.toast(`Barva: <b>${esc(t)}</b>`, 4000);
    }

    /* --- vrstva nad stránkou --- */
    function drawOverlay() {
      const v = ses.view;
      if (!ses.pdoc || !ses.pdoc.body || v === 'page' || v === 'reader') { ovEl.innerHTML = ''; return; }
      const W = frame.clientWidth;
      const Hh = frame.clientHeight;
      const box = (r, cls, label, extra) => {
        if (r.bottom < 0 || r.top > Hh || r.right < 0 || r.left > W || (r.width < 1 && r.height < 1)) return '';
        return `<span class="ob ${cls}" style="left:${Math.round(r.left)}px;top:${Math.round(r.top)}px;width:${Math.round(r.width)}px;height:${Math.round(r.height)}px">${label ? `<i>${label}</i>` : ''}${extra || ''}</span>`;
      };
      let html = '';
      if (v === 'keys') {
        const k = keysInfo();
        k.mouse.forEach(el => { html += box(el.getBoundingClientRect(), 'mouse', '✋ jen myš'); });
        k.order.forEach((el, i) => {
          const cur = ses.walk && ses.walk.i === i;
          const bad = k.vis[i] && !k.vis[i].ok;
          html += box(el.getBoundingClientRect(), `kb ${bad ? 'nofocus' : ''} ${cur ? 'cur' : ''}`, String(i + 1),
            cur ? `<b class="walkcap ${bad ? 'bad' : ''} ${el.getBoundingClientRect().left > W - 280 ? 'right' : ''}">${i + 1}/${k.order.length} ${esc(A11y.name(el).text || el.tagName.toLowerCase()).slice(0, 30)} ${bad ? '✘ fokus není vidět' : '✔ fokus je vidět'}</b>` : '');
        });
      } else if (v === 'contrast') {
        contrastItems().forEach(x => { if (!x.ok || ses.showAll) html += box(x.el.getBoundingClientRect(), `ct ${x.ok ? 'pass' : 'fail'}`, `${C.H.num(x.ratio)}${x.ok ? '' : ' ✘'}`); });
      } else if (v === 'motion') {
        A11y.movingElements(ses.pdoc).forEach(m => { html += box(m.el.getBoundingClientRect(), 'mv', '🌀 pořád se hýbe'); });
      }
      ovEl.innerHTML = html;
    }
    window.addEventListener('resize', schedDraw);

    /* --- procházka Tabem --- */
    function tabWalk() {
      if (ses.walk) { stopWalk(); return; }
      const k = keysInfo();
      if (!k.order.length) { Kit.toast('Na stránce není nic, kam by se dalo dojít Tabem.'); return; }
      ses.walk = { i: -1, n: k.order.length, opener: document.activeElement };
      renderVbar();
      step();
    }
    function step() {
      const w = ses.walk;
      if (!w) return;
      const k = keysInfo();
      w.i++;
      if (w.i >= k.order.length) { finishWalk(); return; }
      const el = k.order[w.i];
      try { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); } catch (e) { /* prvek zmizel */ }
      drawOverlay();
      Kit.sound(k.vis[w.i] && !k.vis[w.i].ok ? 'error' : 'step');
      w.t = later(step, RM() ? 1100 : 800);
    }
    function finishWalk() {
      const k = keysInfo();
      const bad = k.vis.filter(x => !x.ok).length;
      const opener = ses.walk && ses.walk.opener;
      ses.walk = null;
      renderVbar();
      drawOverlay();
      const b = $('#walkBtn');
      if (b) b.focus({ preventScroll: true }); else if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
      const msg = bad ? `Procházka hotová: na ${bad} z ${k.order.length} zastávek Tomáš neviděl fokus.` : `Procházka hotová: ${k.order.length} zastávek a fokus byl vidět všude.`;
      Kit.toast(msg, 3200);
      announce(msg);
      if (!P.walked) { P.walked = true; logEvent('tabwalk', { level: l.id }); checkBadges(); save(); }
    }
    function stopWalk(silent) {
      if (!ses.walk) return;
      clearTimeout(ses.walk.t);
      ses.walk = null;
      if (!silent) { renderVbar(); drawOverlay(); const b = $('#walkBtn'); if (b) b.focus({ preventScroll: true }); }
    }

    /* ---------- testeři a výsledek ---------- */
    function testerCards(res, reveal) {
      return testers.map((who, gi) => {
        const p = personaOf(l, who);
        const cks = l.checks.map((c, i) => ({ c, r: res ? res.checks[i] : null })).filter(x => x.c.who === who);
        const good = res ? cks.filter(x => x.r.ok).length : 0;
        const allOk = res && good === cks.length;
        const bad = res && cks.find(x => !x.r.ok);
        const say = !res ? '' : allOk ? p.ok : (bad.r.say || bad.r.fix);
        return `<article class="tester ${!res ? 't-wait' : allOk ? 't-ok' : 't-bad'} ${reveal ? 'reveal' : ''}" style="--pc:${p.color}; --d:${(gi * 0.22).toFixed(2)}s" aria-label="${esc(p.name)}: ${!res ? 'čeká na test' : allOk ? 'vše v pořádku' : `${good} z ${cks.length} v pořádku`}">
          <header><span class="ava" aria-hidden="true">${p.ico}</span><div class="t-name"><b>${esc(p.name)}</b><small>${esc(who === 'klient' ? p.role : p.short)}</small></div>
            <span class="score">${!res ? 'čeká na test' : allOk ? '✔ v pořádku' : `${good} z ${cks.length}`}</span></header>
          ${say ? `<p class="say">${esc(say)}</p>` : ''}
          <ul class="cl">${cks.map(x => `<li class="${!x.r ? '' : x.r.ok ? 'c-ok' : 'c-bad'}"><span class="m" aria-hidden="true">${!x.r ? '○' : x.r.ok ? '✔' : '✘'}</span><span>${esc(x.c.text)}${x.r ? `<span class="sr-only">${x.r.ok ? ': splněno' : ': nesplněno'}</span>` : ''}${x.r && !x.r.ok && x.r.fix ? `<small>${fixFmt(x.r.fix)}</small>` : ''}</span></li>`).join('')}</ul>
        </article>`;
      }).join('');
    }
    function renderResults(reveal) {
      const r = ses.res;
      let html = '';
      if (r && r.errors.length) {
        html += `<div class="console" role="group" aria-label="Chyby JavaScriptu">${r.errors.slice(0, 3).map(e => `<div class="log err">✘ ${e.line ? `script.js, řádek ${e.line}: ` : ''}${esc(e.msg)}</div>${e.czech ? `<div class="log info"><b>Co to znamená:</b> ${esc(e.czech)}${e.line ? ` <button class="line-link" data-line="${e.line}">ř. ${e.line}</button>` : ''}</div>` : ''}`).join('')}</div>`;
      }
      const warns = r ? r.logs.filter(x => x.kind === 'warn') : [];
      if (warns.length) html += `<div class="console"><div class="log warn">! ${esc(warns[0].msg)}</div></div>`;
      html += `<div class="testers">${testerCards(r, reveal)}</div>`;
      $('#results').innerHTML = html;
      $$('#results [data-line]').forEach(b => b.addEventListener('click', () => { if (ses.file !== 'js' && l.edit.includes('js')) showFile('js'); ed.goToLine(+b.dataset.line); }));
    }
    function markErrors() {
      ed.clearMarks();
      const e = ses.res && ses.res.errors.find(x => x.line);
      if (e && ses.file === 'js') ed.markError(e.line);
    }

    function goals() {
      const runsNow = ls.done ? ses.runs : ls.runs;
      $('#goals').innerHTML = Kit.goals([
        { got: ls.stars[0], text: 'Všichni spokojení', title: 'Hvězda za to, že web zvládnou všichni testeři' },
        { got: ls.stars[1], text: 'Nejvýš 3 testy', val: `${runsNow}/3`, title: `Hvězda za hotovou zakázku nejvýš na 3 testy (${ls.done ? 'teď' : 'zatím'} ${runsNow})` },
        { got: ls.stars[2], text: 'Bonus', title: 'Bonus navíc: ' + l.bonus.text.replace(/`/g, '') }
      ]);
    }
    const bonusLine = `★ Bonus: ${esc(l.bonus.text)}`;
    Kit.status($('#status'), 'idle', ls.done ? 'Zakázka je hotová. Zkus získat všechny hvězdy.' : 'Oprav web a otestuj ho', ls.done ? bonusLine : 'Ctrl+Enter pustí na web testery. Každý ti řekne, kde se zasekl.');

    /* ---------- spuštění testu ---------- */
    async function run() {
      if (ses.running) return;
      ses.running = true;
      $('#runBtn').disabled = true;
      stopWalk(true);
      Kit.status($('#status'), 'run', 'Testeři zkoušejí web…');
      Kit.sound('whoosh');
      try { await execute(); } catch (e) { console.error(e); Kit.status($('#status'), 'bad', 'Test selhal', esc(e.message)); } finally {
        ses.running = false;
        $('#runBtn').disabled = false;
      }
    }
    async function execute() {
      ses.runs++;
      if (!ls.done) ls.runs++;
      ls.runsTotal++;
      ls.code = pickEditable();
      const res = await A11y.test(l, files(), document.body);
      res.checks.forEach((c, i) => { c.id = l.checks[i].id; });
      ses.res = res;
      res.checks.filter(c => !c.ok).forEach(c => { const k = `${l.id}:${c.id}`; P.problems[k] = (P.problems[k] || 0) + 1; });
      logEvent('run', { level: l.id, passed: res.passed, total: res.total, failed: res.checks.filter(c => !c.ok).map(c => c.id), errors: res.errors.length });
      renderResults(true);
      markErrors();
      if (ses.file !== 'js' && res.errors.some(e => e.line)) { /* chyba je vidět v konzoli, editor necháme */ }
      refreshPreview();
      if (res.errors.length) {
        const e = res.errors[0];
        Kit.status($('#status'), 'bad', `Chyba JavaScriptu${e.line ? `, řádek ${e.line}` : ''}`, esc(e.czech || e.msg));
        announce('Web spadl na chybě JavaScriptu. ' + (e.czech || e.msg));
      } else if (res.allPass) {
        Kit.status($('#status'), 'ok', `Všichni spokojení (${res.passed}/${res.total})`, res.bonus ? '★ Bonus splněný, máš všechno.' : 'Bonus zatím ne. ' + bonusLine);
        announce(`Všichni testeři jsou spokojení. ${res.passed} z ${res.total}.`);
      } else {
        const i = res.checks.findIndex(c => !c.ok);
        const c = res.checks[i];
        const p = personaOf(l, c.who);
        Kit.status($('#status'), 'bad', `${res.passed} z ${res.total} v pořádku`, `${esc(p.name)}: ${esc(l.checks[i].text)}`);
        announce(`Splněno ${res.passed} z ${res.total}. ${p.name}: ${c.say || c.fix}`);
      }
      if (res.allPass) onWin(res); else onFail(res);
      save();
    }

    function onFail(res) {
      ses.fails++;
      ls.fails++;
      Kit.sound(res.errors.length ? 'error' : 'fail');
      if (ses.fails >= 2 && ls.hints < l.hints.length) Kit.toast('💡 Zasekl(a) ses? Zkus nápovědu nahoře v zadání.', 2600);
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
      later(() => Kit.sound('win'), 400);
      $('#nextBtn').disabled = !next;
      later(() => victory(got, before, runsUsed, res, badges), RM() ? 300 : 1300);
    }

    function victory(got, before, runsUsed, res, badges) {
      /* hodnocení: u každé hvězdy věta, co se povedlo, a u chybějící, jak ji získat */
      function starRows() {
        const FN = { html: 'index.html', css: 'style.css', js: 'script.js' };
        /* vzorové řešení jako změny: co bylo v zadání (−) a co je v řešení (+) */
        const solCode = '<p class="small">Vzorové řešení změnilo tyhle řádky (<span class="d-del">−</span> před, <span class="d-add">+</span> po):</p>' + Object.entries(l.fix).map(([k, pairs]) => `<span class="sol-file">${FN[k] || k}</span><pre class="code">${pairs.map(([a, b]) => (a === null ? '' : `<span class="d-del" aria-hidden="true">− </span>${hl(a, k)}\n`) + `<span class="d-add" aria-hidden="true">+ </span>${hl(b, k)}`).join('\n\n')}</pre>`).join('');
        const tip = Kit.bonusTip(l.hints);
        const rows = [
          { got: true, title: 'Web zvládnou všichni testeři', text: `${res.passed} z ${res.total} kontrol je v pořádku.` },
          Kit.runsStar({ runs: runsUsed, limit: 3, solution: ses.solution, title: 'Nejvýš 3 testy', did: 'Web jsi testoval(a)', retry: 'Zkusit znovu' }),
          got[2]
            ? { got: true, title: 'Bonus navíc', text: `${md(l.bonus.text)} Povedlo se!` }
            : ses.solution
            ? { got: ls.stars[2], title: 'Bonus navíc', text: 'Se vzorovým řešením se bonusová hvězda nepočítá.' + (ls.stars[2] ? ' Hvězdu ale už máš z dřívějška.' : ''), how: `Klikni na <b>Zkusit znovu</b> a vyřeš to po svém, i s bonusem: ${md(l.bonus.text)}` }
            : { got: ls.stars[2], title: 'Bonus navíc', text: `Tentokrát ne. Bonus chtěl: ${md(l.bonus.text)}${ls.stars[2] ? ' Hvězdu ale už máš z dřívějška.' : ''}`, how: `<b>Jak na to:</b> ${l.bonus.how ? md(l.bonus.how) + (l.bonus.example ? `<pre class="code">${hl(l.bonus.example, l.bonus.lang || 'html')}</pre>` : '') : (tip ? md(tip) : 'Vzorové řešení bonus splňuje.')}` }
        ];
        return Kit.starReport(rows) + Kit.solutionBox(solCode, false, '📘 Vzorové řešení: co se změnilo oproti zadání');
      }
      const mdl = Kit.modal(`
        <div class="victory">
          <div class="granted">${l.id === LEVELS.length ? '♿ E-shop pro všechny' : '✔ Web zvládnou všichni'}</div>
          <h2>${esc(l.title)}</h2>
          <div class="big-stars" role="img" aria-label="Hvězdy: ${ls.stars.filter(Boolean).length} ze 3">${got.map((g, i) => `<i class="${ls.stars[i] ? 'on' : ''} ${ls.stars[i] && !before[i] ? 'new' : ''}" style="animation-delay:${0.15 + i * 0.25}s" aria-hidden="true">★</i>`).join('')}</div>
          ${starRows()}
          <div class="thanks">${l.personas.map(w => `<div class="thx" style="--pc:${PERSONAS[w].color}"><span class="ava" aria-hidden="true">${PERSONAS[w].ico}</span><span><b>${esc(PERSONAS[w].name)}:</b> „${esc(PERSONAS[w].ok)}“</span></div>`).join('')}</div>
          <div class="reward"><span aria-hidden="true">${l.client.ico}</span> ${esc(l.reward)}</div>
          <div class="learn"><b>📖 Tahák: ${esc(l.concept)}</b><p>${md(l.learn[0])}</p><pre class="code">${hl(l.learn[1], l.learn[2])}</pre></div>
          <div class="btn-row center">
            ${next ? '<button class="btn primary big" data-next data-focus>Další zakázka</button>'
              : (P.post ? '<button class="btn primary big" data-res data-focus>📊 Výsledky</button>' : '<button class="btn primary big" data-post data-focus>Výstupní test</button>')}
            <button class="btn" data-retry>↺ Zkusit znovu</button>
            <button class="btn ghost" data-map>🗺️ Zakázky</button>
          </div>
        </div>`, { cls: 'win' });
      got.forEach((g, i) => { if (ls.stars[i]) setTimeout(() => Kit.sound('star'), 300 + i * 250); });
      if (got.every(Boolean) || l.id === LEVELS.length) Kit.confetti(['★', '♿', '✔'], ['#ffd400', '#14213d', '#6d3fb5', '#1d4ed8', '#0f766e']);
      const on = (sel, f) => { const b = $(sel, mdl); if (b) b.addEventListener('click', f); };
      on('[data-next]', () => renderLevel(next.id));
      on('[data-post]', () => renderQuiz('post'));
      on('[data-res]', renderResults2);
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
      $('#hintBtn').textContent = left ? `💡 Nápověda (${left})` : '💡 Nápovědy použité';
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
    $('#solBtn').addEventListener('click', () => Kit.confirm('Ukázat vzorové řešení? Zakázku pak v tomhle pokusu dokončíš jen za 1 hvězdu. Nejvíc se naučíš, když řešení projdeš řádek po řádku a pak ho zkusíš napsat sám/sama.', 'Ukázat řešení', () => {
      ses.solution = true;
      ls.solution = true;
      logEvent('solution', { level: l.id });
      const sol = C.applyFix(l.files, l.fix);
      l.edit.forEach(k => { code[k] = sol[k]; });
      ls.code = pickEditable();
      showFile(ses.file);
      refreshPreview();
      save();
    }));
    $('#resetBtn').addEventListener('click', () => Kit.confirm('Vrátit původní kód zakázky? Tvoje úpravy se smažou.', 'Vrátit původní kód', () => {
      l.edit.forEach(k => { code[k] = l.files[k]; });
      ls.code = null;
      showFile(ses.file);
      refreshPreview();
      save();
    }));
    $('#briefBtn').addEventListener('click', () => briefing(l, false, v => { if (v) setView(v); }));
    $('#lessonBtn').addEventListener('click', () => openLesson(l));
    $('#runBtn').addEventListener('click', run);
    $('#prevBtn').addEventListener('click', () => prev && renderLevel(prev.id));
    $('#nextBtn').addEventListener('click', () => next && isDone(id) && renderLevel(next.id));

    showFile(ses.file);
    goals();
    showHints();
    renderResults(false);
    refreshPreview();
    const focusEd = () => {
      if (window.matchMedia('(min-width: 1100px)').matches) { ed.ta.setSelectionRange(0, 0); ed.ta.focus({ preventScroll: true }); }
      else focusHeading();
    };
    /* průvodce obrazovkou: poprvé se spustí sám, pak tlačítkem ❔ */
    const tourSteps = () => [
      { el: '.brief-strip .bs-text', title: 'Zadání', text: 'Co chce klient opravit. Pod zadáním je <b>bonus navíc</b> za třetí hvězdu.' },
      { el: '.browser .views', title: 'Pohledy testerů', text: '<b>Stránka</b> ukazuje web, jak ho vidí většina lidí. <b>Čtečka</b>, <b>Klávesnice</b>, <b>Kontrast</b> a <b>Pohyb</b> ukazují, jak ho zažívají testeři Karel, Tomáš, Jana a Eliška.' },
      { el: '#viewport', title: 'Web klienta', text: 'Živý náhled webu. Mění se hned, jak píšeš, a můžeš do něj klikat i mačkat Tab.' },
      { el: '.code-pane .tabs', title: 'Soubory', text: 'Opravuješ <code>index.html</code>, <code>style.css</code> nebo <code>script.js</code>, podle zakázky. Soubor se zámečkem jen čteš. 🧩 Úryvky vloží hotové kousky kódu.' },
      { el: '#editor', title: 'Kód', text: 'Sem píšeš. Esc a potom Tab tě z editoru pustí dál.' },
      { el: '#runBtn', title: 'Otestovat s lidmi', text: 'Pustí na web všechny testery (nebo Ctrl+Enter). Na hvězdu stačí nejvýš 3 testy.' },
      { el: '#results', title: 'Co říkají testeři', text: 'Každý tester vlastními slovy řekne, kde se zasekl, a pod tím je rada, jak to opravit.' },
      { el: '#goals', title: 'Tři hvězdy', text: 'Všichni spokojení, nejvýš 3 testy a bonus. Zakázku můžeš kdykoli zopakovat a hvězdy dobrat.' },
      { el: '.brief-strip .brief-actions', title: 'Když nevíš kudy kam', text: '📖 <b>Lekce</b> vysvětlí novou věc na živém příkladu a ukáže, co z něj přečte čtečka. 💡 <b>Nápověda</b> radí postupně. Po všech nápovědách a třech pokusech se ukáže i řešení, ale jen za 1 hvězdu. 💬 Briefing znovu ukáže klienta a ❔ Průvodce tuhle prohlídku.' }
    ];
    const TOUR_KEY = KEY + '.tour';
    const startTour = () => Tour.start(tourSteps(), { onEnd: () => { Kit.write(TOUR_KEY, true); focusEd(); } });
    $('#tourBtn').addEventListener('click', startTour);
    if (!P.seen[id]) {
      P.seen[id] = true;
      save();
      later(() => briefing(l, true, v => { if (v) setView(v); else if (!Kit.read(TOUR_KEY, false)) later(startTour, 250); else focusEd(); }), 150);
    } else if (!Kit.read(TOUR_KEY, false)) later(startTour, 400);
    else setTimeout(focusEd, 50);
    view = {
      cleanup() {
        clearTimeout(saveT);
        clearTimeout(liveT);
        stopWalk(true);
        ses.timers.forEach(clearTimeout);
        cancelAnimationFrame(drawRaf);
        window.removeEventListener('resize', schedDraw);
        if (mo) mo.disconnect();
        ses.pv++;
        ls.code = pickEditable();
        addTime();
        save();
      }
    };
  }

  /* šipky v řadě záložek (vzor ARIA tabs) */
  function tabKeys(list, sel, activate) {
    list.addEventListener('keydown', e => {
      const tabs = $$(sel, list);
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let j = -1;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tabs.length - 1;
      if (j < 0) return;
      e.preventDefault();
      tabs[j].focus();
      activate(tabs[j]);
    });
  }

  /* ---------------- výsledky ---------------- */
  function renderResults2() {
    leave();
    if (!P || !P.pre) { renderIntro(); return; }
    crumb([{ label: 'Zakázky', go: renderMap }, { label: 'Výsledky' }]);
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
    const helped = Object.keys(PERSONAS).map(w => ({ w, n: done.reduce((s, l) => s + l.checks.filter(c => c.who === w).length, 0), total: LEVELS.reduce((s, l) => s + l.checks.filter(c => c.who === w).length, 0) }));
    const problems = Object.entries(P.problems || {}).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => {
      const [lid, cid] = k.split(':');
      const l = LEVELS.find(x => x.id === +lid);
      const c = l && l.checks.find(x => x.id === cid);
      return c ? { l, c, n } : null;
    }).filter(Boolean);
    const review = (ans, form) => ans.map(a => {
      const q = C.QUIZ[form][a.q];
      return `<div class="rev"><b>${a.correct ? '<span class="ok">✔</span>' : a.dontKnow ? '<span class="dk">?</span>' : '<span class="bad">✗</span>'} ${esc(q.q)}</b>
        ${q.code ? `<pre class="code">${hl(q.code, q.lang)}</pre>` : ''}
        <div class="small">${a.correct ? '' : `Tvoje odpověď: ${a.dontKnow ? 'nevím' : esc(q.a[a.choice])}. `}Správně: <b>${esc(q.a[q.ok])}</b></div></div>`;
    }).join('');
    app.innerHTML = `
      <section class="screen result">
        <div class="card res-hero">
          <div class="rank-icon" aria-hidden="true">${rank[1]}</div>
          <div>
            <h1>${esc(P.name)}: ${rank[2]}</h1>
            <p>★ ${stars} z ${MAX_STARS}, hotovo ${done.length} z ${LEVELS.length} zakázek.</p>
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
            <h2>Test před hrou a po ní</h2>
            ${Kit.bar('Vstupní test', pre.pct, pre.correct + '/' + pre.n, 'pre')}
            ${post ? Kit.bar('Výstupní test', post.pct, post.correct + '/' + post.n, post.pct >= pre.pct ? 'post' : 'lo') : '<p class="muted">Výstupní test ještě čeká, najdeš ho v přehledu zakázek.</p>'}
            <div class="stat-row">
              <div class="stat"><b>${pre.pct} %</b><small>před hrou</small></div>
              <div class="stat"><b class="${post && post.pct > pre.pct ? 'up' : ''}">${post ? post.pct + ' %' : '–'}</b><small>po hře</small></div>
              <div class="stat"><b>${pre.dunno} → ${post ? post.dunno : '–'}</b><small>odpovědí „nevím“</small></div>
            </div>
            ${post ? Kit.conceptTable(C.CONCEPTS, P.pre.answers, P.post.answers) : ''}
          </div>
          <div class="card">
            <h2>Jak se ti pracovalo</h2>
            <div class="stat-row">
              <div class="stat"><b>${firstTry}</b><small>zakázek na 1. test</small></div>
              <div class="stat"><b>${Kit.fmt(avgRuns)}</b><small>testů na zakázku</small></div>
              <div class="stat"><b>${hints}</b><small>nápověd</small></div>
              <div class="stat"><b>${fmtTime(time)}</b><small>čas do splnění</small></div>
            </div>
            <div class="table-wrap"><table class="tbl">
              <thead><tr><th>Zakázka</th><th>★</th><th>Testy</th><th>Nápovědy</th><th>Čas</th></tr></thead>
              <tbody>${LEVELS.map(l => {
                const s = st(l.id);
                return `<tr><td>${l.id}. ${esc(l.title)}</td><td>${s.done ? '★'.repeat(s.stars.filter(Boolean).length) : '–'}</td>
                  <td>${s.done ? s.runs : s.runsTotal ? s.runsTotal + ' (nehotovo)' : '–'}</td><td>${s.hints || 0}${s.solution ? ' + řešení' : ''}</td>
                  <td>${s.done ? fmtTime(s.timeMs) : '–'}</td></tr>`;
              }).join('')}</tbody></table></div>
          </div>
        </div>
        <div class="grid-2">
          <div class="card">
            <h2>Komu jsi pomohl(a)</h2>
            <ul class="helped">${helped.map(h => { const p = PERSONAS[h.w]; return `<li style="--pc:${p.color}"><span class="ava" aria-hidden="true">${p.ico}</span><div><b>${esc(p.name)}</b><small>${esc(p.role)}</small>${Kit.bar('Odstraněné překážky', Kit.pct(h.n, h.total), `${h.n}/${h.total}`, 'post')}</div></li>`; }).join('')}</ul>
          </div>
          <div class="card">
            <h2>Překážky, na které jsi narážel(a) nejčastěji</h2>
            ${problems.length ? `<ol class="problems">${problems.map(x => { const p = personaOf(x.l, x.c.who); return `<li><span class="mini-ava" style="--pc:${p.color}" aria-hidden="true">${p.ico}</span><span><b>${esc(x.c.text)}</b><small>${x.l.id}. ${esc(x.l.title)}, ${esc(p.name)}</small></span><span class="n">${x.n}×</span></li>`; }).join('')}</ol>` : '<p class="muted">Zatím žádné. Čistá práce!</p>'}
          </div>
        </div>
        <div class="card">
          <h2>Odznaky <small class="muted">${P.badges.length} z ${BADGES.length}</small></h2>
          <div class="badges">${BADGES.map(b => `<div class="badge ${P.badges.includes(b.id) ? 'got' : ''}"><span aria-hidden="true">${b.icon}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small><span class="sr-only">${P.badges.includes(b.id) ? 'získáno' : 'zatím nezískáno'}</span></div>`).join('')}</div>
        </div>
        ${post ? `<div class="card"><details class="answers-review"><summary>Projít odpovědi výstupního testu (varianta ${P.post.form})</summary>${review(P.post.answers, P.post.form)}</details>
          <details class="answers-review"><summary>Projít odpovědi vstupního testu (varianta ${P.pre.form})</summary>${review(P.pre.answers, P.pre.form)}</details></div>` : ''}
        <div class="btn-row center">
          <button class="btn primary" id="mapBtn2">🗺️ Zpět na zakázky</button>
          <button class="btn" id="expBtn">⬇️ Stáhnout výsledky (JSON)</button>
          <button class="btn ghost" id="cheat2">📖 Tahák přístupnosti</button>
        </div>
      </section>`;
    focusHeading();
    $('#mapBtn2').addEventListener('click', renderMap);
    $('#cheat2').addEventListener('click', cheatSheet);
    $('#expBtn').addEventListener('click', () => {
      Kit.download(`web-bez-barier-${P.name.replace(/[^\w-]+/g, '_')}.json`, exportData());
      Kit.toast('Výsledky stažené ✔');
    });
  }
  const renderResults = renderResults2;

  function exportData() {
    const pre = Kit.quizStats(P.pre.answers);
    const post = P.post ? Kit.quizStats(P.post.answers) : null;
    return {
      game: 'Web bez bariér', version: 1, exportedAt: new Date().toISOString(), player: P.name,
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
      levels: LEVELS.map(l => Object.assign({ id: l.id, title: l.title, concept: l.concept, testers: l.personas }, (({ code, ...rest }) => rest)(P.levels[l.id] || { done: false }))),
      problems: P.problems,
      totals: { stars: starCount(), maxStars: MAX_STARS, levelsDone: doneCount(), listened: P.listened, tabWalk: P.walked },
      badges: P.badges,
      events: P.events
    };
  }

  /* ---------------- lišta ---------------- */
  $('#homeBtn').addEventListener('click', renderIntro);
  $('#mapBtn').addEventListener('click', renderMap);
  $('#soundBtn').addEventListener('click', () => {
    Kit.soundOn = !Kit.soundOn;
    Kit.write('webBezBarier.sound', Kit.soundOn);
    topStats();
    if (Kit.soundOn) Kit.sound('ok');
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (window.speechSynthesis) { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices(); }
  topStats();
  if (P && P.pre) renderMap(); else renderIntro();
})();
