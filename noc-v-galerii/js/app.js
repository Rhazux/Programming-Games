/*
 * Noc v galerii – aplikace: obrazovky, stěna galerie (katalog vs. tvoje plátno), živé hodnocení shody,
 * pipeta a pravítko, kontrola CSS, hvězdy, odznaky, výstava a měření pokroku.
 */
(function () {
  'use strict';

  const { $, $$, esc } = Kit;
  const G = window.Gallery;
  const LEVELS = G.LEVELS;
  const LESSONS = G.LESSONS || {};
  const MAX_STARS = LEVELS.length * 3;
  const KEY = 'nocVGalerii.v1';
  const app = $('#app');
  const RM = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PASS = 95;
  const MASTER = 99;

  let P = Kit.read(KEY, null);
  let view = null;
  Kit.soundOn = Kit.read('nocVGalerii.sound', true);

  const BADGES = [
    { id: 'first', icon: '🖌️', name: 'První tah štětcem', desc: 'Obnov první obraz' },
    { id: 'master', icon: '🎯', name: 'Mistrovská shoda', desc: 'Pověs obraz se shodou aspoň 99 %' },
    { id: 'pipette', icon: '💧', name: 'Pipeta', desc: 'Vezmi barvu přímo z katalogu' },
    { id: 'diff', icon: '🔍', name: 'Oko restaurátora', desc: 'Najdi chyby v režimu Rozdíly' },
    { id: 'ch1', icon: '◯', name: 'Sál tvarů', desc: 'Obnov všechny obrazy v sále tvarů' },
    { id: 'ch2', icon: '🌅', name: 'Sál barev a světla', desc: 'Obnov všechny obrazy v sále barev' },
    { id: 'ch3', icon: '🏛️', name: 'Sál mistrů', desc: 'Obnov všechny obrazy v sále mistrů' },
    { id: 'golf', icon: '🖼️', name: 'Zlatý rám', desc: 'Vejdi se do limitu znaků CSS' },
    { id: 'nohints', icon: '🧠', name: 'Bez nápovědy', desc: 'Obnov celý sál bez nápovědy' },
    { id: 'all', icon: '🌄', name: 'Ráno včas', desc: 'Obnov všech 12 obrazů do rána' },
    { id: 'perfect', icon: '⭐', name: 'Mistr restaurátor', desc: 'Získej všech 36 hvězd' },
    { id: 'gain', icon: '📈', name: 'Velký skok', desc: 'Normalizovaný zisk v testech aspoň 0,5' }
  ];
  const RANKS = [[0, '🧹', 'Pomocník v depozitáři'], [10, '🖌️', 'Restaurátor'], [20, '🎨', 'Mistr restaurátor'], [30, '🏛️', 'Hlavní kurátor galerie']];

  /* ---------------- profil ---------------- */
  function newProfile(name) {
    return { v: 1, name, form: Math.random() < 0.5 ? 'A' : 'B', pre: null, post: null, levels: {}, badges: [], events: [], lint: {}, seen: {}, picked: false, diffUsed: false, created: Date.now() };
  }
  const save = () => { if (P) Kit.write(KEY, P); topStats(); };
  const lState = id => P.levels[id] || (P.levels[id] = {
    done: false, stars: [false, false, false], best: 0, hung: 0, hangs: 0, hints: 0, solution: false, timeMs: 0, code: null, edits: 0, size: 0, wonAt: null, firstTry: false
  });
  const isDone = id => !!(P && P.levels[id] && P.levels[id].done);
  const unlocked = id => id === 1 || isDone(id - 1);
  const starCount = () => (P ? Object.values(P.levels).reduce((n, s) => n + s.stars.filter(Boolean).length, 0) : 0);
  const doneCount = () => LEVELS.filter(l => isDone(l.id)).length;
  const chapterOf = l => G.CHAPTERS.find(c => c.id === l.chapter);
  const gainOf = () => (P && P.pre && P.post ? Kit.gain(Kit.quizStats(P.pre.answers).ratio, Kit.quizStats(P.post.answers).ratio) : null);
  const fmtTime = ms => { const s = Math.round((ms || 0) / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`; };
  const pad2 = n => String(n).padStart(2, '0');
  const pct = v => String(Math.floor(v * 10) / 10).replace('.', ',');
  const clock = () => { const m = 22 * 60 + doneCount() * 40; return `${pad2(Math.floor(m / 60) % 24)}:${pad2(m % 60)}`; };
  const md = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const hl = (code, lang) => Highlight(code, lang || 'css');
  function logEvent(type, data) {
    P.events.push(Object.assign({ t: Date.now(), type }, data));
    if (P.events.length > 600) P.events.splice(0, P.events.length - 600);
  }
  function announce(text) {
    const a = $('#announcer');
    a.textContent = '';
    setTimeout(() => { a.textContent = text; }, 60);
  }
  function codeOf(l) {
    const s = P && P.levels[l.id];
    return { html: (s && s.code && s.code.html) || l.html, css: (s && s.code && s.code.css) || l.starter };
  }

  function topStats() {
    $('#topStars').innerHTML = `<span class="ico" aria-hidden="true">★</span>${starCount()}/${MAX_STARS}`;
    $('#topStars').setAttribute('aria-label', `Hvězdy: ${starCount()} z ${MAX_STARS}`);
    $('#topClock').innerHTML = `<span class="ico" aria-hidden="true">🕰️</span>${P ? clock() : '22:00'}`;
    $('#topClock').setAttribute('aria-label', `Čas v galerii ${P ? clock() : '22:00'}`);
    $('#mapBtn').hidden = !(P && P.pre);
    $('#soundBtn').textContent = Kit.soundOn ? '🔊' : '🔇';
    $('#soundBtn').setAttribute('aria-pressed', String(Kit.soundOn));
  }
  function crumb(parts) {
    $('#crumb').innerHTML = parts.map((p, i) => (p.go ? `<button class="link" data-crumb="${i}">${esc(p.label)}</button>` : `<span${i === parts.length - 1 ? ' aria-current="page"' : ''}>${esc(p.label)}</span>`)).join('<span class="sep" aria-hidden="true"> › </span>');
    $$('#crumb [data-crumb]').forEach(b => b.addEventListener('click', () => parts[+b.dataset.crumb].go()));
    document.title = (parts.length ? parts[parts.length - 1].label + ' – ' : '') + 'Noc v galerii';
  }
  function leave() {
    if (view && view.cleanup) view.cleanup();
    view = null;
    Kit.closeModal(true);
    window.scrollTo(0, 0);
  }
  function focusHeading() {
    const h = $('#app h1');
    if (!h) return;
    h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  }
  function copyText(t, what) {
    const done = () => { Kit.toast(`${what || 'Barva'} <b>${esc(t)}</b> je ve schránce. Vlož ji do CSS (Ctrl+V).`, 2600); Kit.sound('click'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => Kit.toast(`Barva: <b>${esc(t)}</b>`, 4000));
    else Kit.toast(`Barva: <b>${esc(t)}</b>`, 4000);
  }

  /* katalog každého obrazu se počítá jen jednou */
  const CAT = new Map();
  async function catalogOf(l) {
    if (CAT.has(l.id)) return CAT.get(l.id);
    const t = await Painter.render(l.html, l.solution);
    const s = await Painter.render(l.html, l.starter);
    const cat = Painter.prepare(t, s);
    cat.palette = Painter.palette(t, 6);
    CAT.set(l.id, cat);
    return cat;
  }
  const THUMB = new Map();
  async function thumb(html, css, scale) {
    const k = (scale || 0.4) + '|' + html + '|' + css;
    if (THUMB.has(k)) return THUMB.get(k);
    let url = '';
    try { url = await Painter.renderURL(html, css, scale || 0.4); } catch (e) { url = ''; }
    THUMB.set(k, url);
    return url;
  }

  function checkBadges(ctx) {
    ctx = ctx || {};
    const earned = [];
    const award = id => { if (!P.badges.includes(id)) { P.badges.push(id); earned.push(id); } };
    const chDone = ch => LEVELS.filter(l => l.chapter === ch.id).every(l => isDone(l.id));
    if (doneCount() >= 1) award('first');
    if (LEVELS.some(l => P.levels[l.id] && P.levels[l.id].stars[1])) award('master');
    if (P.picked) award('pipette');
    if (P.diffUsed) award('diff');
    G.CHAPTERS.forEach(ch => { if (chDone(ch)) award('ch' + ch.id); });
    if (LEVELS.some(l => l.bonus.limit && P.levels[l.id] && P.levels[l.id].stars[2])) award('golf');
    if (G.CHAPTERS.some(ch => chDone(ch) && LEVELS.filter(l => l.chapter === ch.id).every(l => !P.levels[l.id].hints && !P.levels[l.id].solution))) award('nohints');
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
           <p>Vítej zpět, <b>${esc(P.name)}</b>.</p>
           <p class="muted">Obnoveno ${doneCount()} z ${LEVELS.length} obrazů, ★ ${starCount()} z ${MAX_STARS}. V galerii je ${clock()}.</p>
         </div>
         <div class="btn-row"><button class="btn primary big" id="contBtn">${P.pre ? 'Vrátit se do galerie' : 'Pokračovat vstupním testem'}</button>
           <button class="btn ghost" id="resetBtn">Začít znovu</button></div>`
      : `<label class="field" for="name">Jak se jmenuje noční restaurátor(ka)?</label>
         <input class="field-input" id="name" maxlength="24" autocomplete="nickname" placeholder="např. Bára">
         <div class="btn-row"><button class="btn primary big" id="startBtn">Odemknout galerii</button></div>`;
    app.innerHTML = `
      <section class="screen">
        <div class="intro">
          <div class="intro-copy">
            <p class="kicker">Galerie Hrádek, 22:00</p>
            <h1 class="logo">Noc v galerii</h1>
            <p class="lead">Ráno v osm otevíráme výstavu <i>Geometrie snů</i>, jenže z obrazů v noci zmizely barvy. Zbyl jen katalog s fotkami. Do rána je namaluješ znovu, a to <b>v CSS</b>. Galerie tvoje plátno porovná s katalogem pixel po pixelu.</p>
            ${cont}
          </div>
          <div class="intro-visual" aria-hidden="true">
            <div class="spot"></div>
            <figure class="art demo">
              <div class="frame"><img id="demoImg" alt="" width="400" height="300"></div>
              <figcaption><b id="demoPct">0 %</b> obnoveno</figcaption>
            </figure>
            <pre class="code demo-code" id="demoCode"></pre>
          </div>
        </div>
        <ol class="steps">
          <li><b>Vstupní test</b><small>10 otázek, asi 3 minuty. Zjistíme, co už o CSS víš.</small></li>
          <li><b>12 obrazů ve 3 sálech</b><small>Tvary, barvy a světlo, mistři. Každý obraz naučí jednu techniku CSS.</small></li>
          <li><b>Výstupní test a tvoje výstava</b><small>Uvidíš své obrazy na stěně a co ses naučil(a).</small></li>
        </ol>
      </section>`;
    const timers = [];
    view = { cleanup: () => timers.forEach(clearTimeout) };
    introDemo(timers);
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
        const name = $('#name').value.trim() || 'Restaurátor';
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
  /* ukázka v úvodu: slunce se postupně vrací na plátno */
  async function introDemo(timers) {
    const l = LEVELS[0];
    const steps = [
      { add: '', css: l.starter },
      { add: '  width: 140px;\n  height: 140px;\n  background: #e2673f;', css: l.starter.replace('  /* sem doplň šířku, výšku, barvu a zakulacení */', '  width: 140px;\n  height: 140px;\n  background: #e2673f;') },
      { add: '  border-radius: 50%;', css: l.solution }
    ];
    let cat;
    try {
      cat = await catalogOf(l);
      for (const s of steps) {
        s.url = await thumb(l.html, s.css, 1);
        s.pct = Painter.score(cat, await Painter.render(l.html, s.css)).score;
      }
    } catch (e) { return; }
    const img = $('#demoImg');
    const pre = $('#demoCode');
    const pc = $('#demoPct');
    if (!img) return;
    let shown = '.slunce {\n  position: absolute;\n  left: 130px;\n  top: 50px;\n';
    const show = (i, typed) => {
      if (!document.contains(img)) return;
      img.src = steps[i].url;
      pc.textContent = `${Math.round(steps[i].pct)} %`;
      pre.innerHTML = hl(shown + (typed || '') + '}');
    };
    if (RM()) { shown += steps[1].add + '\n' + steps[2].add + '\n'; show(2); return; }
    show(0);
    let t = 900;
    [1, 2].forEach(i => {
      const lines = steps[i].add.split('\n');
      lines.forEach((ln, k) => {
        timers.push(setTimeout(() => {
          shown += ln + '\n';
          if (k === lines.length - 1) show(i); else pre.innerHTML = hl(shown + '}');
        }, t));
        t += 520;
      });
      t += 700;
    });
  }

  /* ---------------- testy ---------------- */
  function renderQuiz(which) {
    leave();
    const pre = which === 'pre';
    const form = pre ? P.form : (P.form === 'A' ? 'B' : 'A');
    crumb(pre ? [{ label: 'Vstupní test' }] : [{ label: 'Plán výstavy', go: renderMap }, { label: 'Výstupní test' }]);
    app.innerHTML = `
      <section class="screen" id="quizBox">
        <div class="card narrow quiz-intro">
          <span class="pill">${pre ? 'Krok 1 ze 3' : 'Krok 3 ze 3'}</span>
          <h1>${pre ? 'Vstupní test' : 'Výstupní test'}</h1>
          <p class="lead">${pre
            ? 'Než tě pustíme k plátnům, zjistíme, co už o CSS víš. Výsledek se nehodnotí, slouží jen k porovnání s koncem hry.'
            : 'Ukaž, co ses za noc naučil(a). Otázky jsou podobné jako na začátku, ale ne stejné. Každá míří na jednu techniku z obrazů.'}</p>
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
        items: G.QUIZ[form],
        highlight: (code, lang) => hl(code, lang || 'css'),
        lang: 'css',
        onAnswer() { setTimeout(() => { const h = $('#quizBox h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }, 0); },
        onDone(answers) {
          view = null;
          P[which] = { form, answers, at: Date.now() };
          logEvent('quiz', { which, form, correct: answers.filter(a => a.correct).length });
          save();
          if (pre) afterPre(); else { checkBadges(); save(); renderResults(); Kit.confetti(['★', '◆', '●'], ['#d4af5a', '#e2673f', '#7d9a78', '#f3e3c3']); }
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
      <p>Čeká tě <b>12 obrazů</b>. U každého je vlevo fotka z katalogu a vedle tvoje plátno, které se maluje přímo z tvého CSS.</p>
      <ul class="vstats">
        <li class="ok">🎯 Ukazatel <b>Obnoveno</b> říká, jak moc se plátno shoduje s katalogem. Od 95 % obraz pověsíš zpátky.</li>
        <li class="ok">💧 Najeď myší na katalog: uvidíš souřadnice a barvu. Kliknutím barvu zkopíruješ. Z klávesnice: Tab na katalog, šipky a Enter.</li>
        <li class="ok">★ Hvězdy: za pověšení obrazu, za mistrovskou shodu 99 % a za bonus.</li>
      </ul>
      <div class="btn-row"><button class="btn primary big" data-play data-focus>K prvnímu obrazu</button><button class="btn ghost" data-close>Na plán výstavy</button></div>`);
    $('[data-play]', m).addEventListener('click', () => renderLevel(1));
  }

  /* ---------------- plán výstavy ---------------- */
  function renderMap() {
    leave();
    if (!P || !P.pre) { renderIntro(); return; }
    crumb([{ label: 'Plán výstavy' }]);
    const done = doneCount();
    const nextId = (LEVELS.find(l => !isDone(l.id)) || {}).id;
    const canPost = done >= 8;
    const node = l => {
      const s = P.levels[l.id];
      const open = unlocked(l.id);
      const cls = isDone(l.id) ? 'done' : l.id === nextId ? 'next' : open ? 'open' : 'locked';
      const n = s ? s.stars.filter(Boolean).length : 0;
      return `<button class="piece ${cls}" data-l="${l.id}" ${open ? '' : 'disabled'} aria-label="Obraz ${l.id}: ${esc(l.title)}, ${esc(l.artist)}, technika ${esc(l.concept)}${open ? (isDone(l.id) ? `, obnoveno, hvězdy ${n} ze 3` : ', čeká na obnovení') : ', zamčeno'}">
          <span class="pframe" aria-hidden="true"><img class="pimg" data-thumb="${l.id}" alt="" width="160" height="120"><span class="pq">${open ? (isDone(l.id) ? '' : '?') : '🔒'}</span></span>
          <span class="plabel" aria-hidden="true"><b>${esc(l.title)}</b><small>${l.id}. ${esc(l.concept)}</small><span class="n-stars">${[0, 1, 2].map(i => `<i class="${s && s.stars[i] ? 'on' : ''}">★</i>`).join('')}</span></span>
        </button>`;
    };
    const nextL = LEVELS.find(l => l.id === nextId);
    app.innerHTML = `
      <section class="screen">
        <div class="map-hero">
          <div>
            <h1>Plán výstavy</h1>
            <p>${esc(P.name)}, v galerii je <b>${clock()}</b>. Každý obnovený obraz posune noc o 40 minut. V osm ráno přijdou první návštěvníci.</p>
            <div class="meter-line"><span class="bar" role="progressbar" aria-label="Obnovené obrazy" aria-valuemin="0" aria-valuemax="${LEVELS.length}" aria-valuenow="${done}"><span class="post" style="width:${Kit.pct(done, LEVELS.length)}%"></span></span>
              <span>${done}/${LEVELS.length} obrazů</span><span class="muted">★ ${starCount()}/${MAX_STARS}</span></div>
          </div>
          <div class="btn-row">
            <button class="btn" id="cheatBtn">📖 Příručka restaurátora</button>
            ${done ? '<button class="btn" id="expoBtn">🖼️ Moje výstava</button>' : ''}
            ${P.post ? '<button class="btn primary" id="resBtn">📊 Výsledky</button>' : ''}
          </div>
        </div>
        ${nextL ? `<div class="next-up">
            <span class="nu-num" aria-hidden="true">${pad2(nextL.id)}</span>
            <div class="nu-text"><small>Na řadě: ${esc(chapterOf(nextL).title.toLowerCase())}</small><b><i>${esc(nextL.title)}</i></b><span class="nu-who">${esc(nextL.artist)}, ${nextL.year}, technika <code>${esc(nextL.concept)}</code></span></div>
            <button class="btn primary big" data-l="${nextL.id}">🖌️ Obnovit obraz ${nextL.id}</button>
          </div>` : ''}
        ${G.CHAPTERS.map(ch => {
          const ls = LEVELS.filter(l => l.chapter === ch.id);
          return `<section class="room c${ch.id}" aria-labelledby="ch${ch.id}">
            <div class="track-head"><span class="t-ico" aria-hidden="true">${ch.icon}</span><div><h2 id="ch${ch.id}">${esc(ch.title)}</h2><small>${esc(ch.desc)}</small></div>
              <span class="t-count">${ls.filter(l => isDone(l.id)).length}/${ls.length} obnoveno</span></div>
            <div class="pieces">${ls.map(node).join('')}</div>
          </section>`;
        }).join('')}
        <section class="card final">
          <div>
            <h2>Výstupní test</h2>
            ${P.post
              ? `<p>Hotovo! Vstupní test ${Kit.quizStats(P.pre.answers).correct}/10, výstupní ${Kit.quizStats(P.post.answers).correct}/10.</p>`
              : canPost
                ? `<p>Obnovil(a) jsi ${done} obrazů, můžeš si změřit pokrok. ${done < LEVELS.length ? 'Doporučujeme ale nejdřív obnovit všech 12.' : 'Výstava je zachráněná, gratulujeme!'}</p>`
                : `<p class="muted">Odemkne se po obnovení 8 obrazů (zatím ${done}). Pak porovnáme, co jsi uměl(a) na začátku a co umíš teď.</p>`}
          </div>
          ${P.post ? '<button class="btn primary big" id="resBtn2">Zobrazit výsledky</button>'
            : canPost ? '<button class="btn primary big" id="postBtn">Spustit výstupní test</button>' : ''}
        </section>
      </section>`;
    focusHeading();
    $$('[data-l]').forEach(b => b.addEventListener('click', () => { Kit.sound('click'); renderLevel(+b.dataset.l); }));
    $('#cheatBtn').addEventListener('click', cheatSheet);
    const eb = $('#expoBtn');
    if (eb) eb.addEventListener('click', renderResults);
    ['#resBtn', '#resBtn2'].forEach(s => { const b = $(s); if (b) b.addEventListener('click', renderResults); });
    const pb = $('#postBtn');
    if (pb) pb.addEventListener('click', () => renderQuiz('post'));
    let alive = true;
    view = { cleanup: () => { alive = false; } };
    (async () => {
      for (const l of LEVELS) {
        const img = $(`[data-thumb="${l.id}"]`);
        if (!img || !alive) continue;
        if (!unlocked(l.id)) { img.closest('.pframe').classList.add('blank'); continue; }
        const c = isDone(l.id) ? codeOf(l) : { html: l.html, css: l.solution };
        const url = await thumb(c.html, c.css, 0.4);
        if (!alive) return;
        img.src = url;
        if (!isDone(l.id)) img.closest('.pframe').classList.add('faded');
      }
    })();
  }

  function cheatSheet() {
    const items = LEVELS.map(l => {
      const lesBtn = LESSONS[l.id] ? `<button class="btn small" data-lesson="${l.id}">📖 Lekce s příkladem</button>` : '';
      if (isDone(l.id)) return `<div class="learn"><b>${l.id}. ${esc(l.title)}: ${esc(l.concept)}</b><p>${md(l.learn[0])}</p><pre class="code">${hl(l.learn[1])}</pre>${lesBtn}</div>`;
      if (unlocked(l.id)) return `<div class="learn"><b>${l.id}. ${esc(l.title)}: ${esc(l.concept)}</b><p class="small muted">Obraz ještě čeká na obnovení. Lekci si můžeš přečíst už teď.</p>${lesBtn}</div>`;
      return `<div class="learn locked"><b>🔒 ${l.id}. ${esc(l.concept)}</b><p class="small muted">Odemkne se po obnovení předchozího obrazu.</p></div>`;
    }).join('');
    const m = Kit.modal(`<h2>📖 Příručka restaurátora</h2>
      <p class="muted small">Plátno má vždy 400 × 300 px. Souřadnice se počítají od levého horního rohu: x doprava, y dolů.</p>
      <div class="rules-grid">
        <div><b>🎯 Obnoveno</b><span>kolik pixelů, které byly na začátku špatně, už sedí. Od 95 % obraz pověsíš, 99 % je mistrovská shoda.</span></div>
        <div><b>💧 Pipeta</b><span>najeď na katalog, uvidíš x, y a barvu. Kliknutím barvu zkopíruješ.</span></div>
        <div><b>🔍 Rozdíly</b><span>růžově svítí místa, kde se plátno liší. Světle růžové jsou jen okraje tvarů.</span></div>
        <div><b>🖼️ Zlatý rám</b><span>bonus za krátké CSS. Počítají se znaky bez mezer a komentářů.</span></div>
      </div>
      <div class="cheat">${items}</div>`, { cls: 'wide' });
    $$('[data-lesson]', m).forEach(b => b.addEventListener('click', () => openLesson(LEVELS.find(x => x.id === +b.dataset.lesson), true)));
  }

  /* ---------------- lekce: výklad techniky s živým příkladem ---------------- */
  // Z příručky vede tlačítko „Zpět do příručky“ zpátky do příručky (fokus na lekci, ze které hráč přišel). Z obrazu lekci jen zavře.
  function openLesson(l, fromCheat) {
    const les = LESSONS[l.id];
    if (!les) return;
    const m = Kit.modal(`<p class="b-kicker">${chapterOf(l).icon} ${esc(chapterOf(l).title)}, obraz ${l.id}: <i>${esc(l.title)}</i></p>
      ${Lesson.html(les)}
      <div class="btn-row"><button class="btn primary" data-close data-focus>${fromCheat ? 'Zpět do příručky' : 'Zpět k obrazu'}</button></div>`, { cls: 'lesson-modal', label: 'Lekce: ' + l.concept });
    Lesson.mount(m, les);
    const back = fromCheat && Kit.$('.modal-box > .btn-row [data-close]', m);
    if (back) back.addEventListener('click', () => setTimeout(() => {
      cheatSheet();
      const b = Kit.$(`.modal [data-lesson="${l.id}"]`);
      if (b) b.focus();
    }));
  }

  /* ---------------- briefing: příběh → lekce → úkol ---------------- */
  const starRowsOf = l => [
    { t: 'Obraz visí', d: 'Shoda s katalogem aspoň **95 %**. Pak se odemkne tlačítko Pověsit obraz.' },
    { t: 'Mistrovská shoda', d: 'Aspoň **99 %**. Pomůže pipeta (přesné barvy z katalogu) a režim Rozdíly (ukáže, co ještě nesedí).' },
    { t: 'Bonus navíc', d: l.bonus.text }
  ];
  function briefing(l, first, onClose, start) {
    const msgs = l.brief.map(([who, text], i) => {
      const p = G.WHO[who];
      return `<div class="msg ${who}" style="animation-delay:${first && !RM() ? 0.2 + i * 0.6 : 0}s"><span class="ava" aria-hidden="true">${p.ico}</span><div class="bubble"><span class="who">${esc(p.name)}<small>${esc(p.role)}</small></span>${md(text)}</div></div>`;
    }).join('');
    const les = LESSONS[l.id];
    let lab = null;
    const steps = [
      { label: 'Příběh', html: `<div class="chat">${msgs}</div>` },
      les && { label: 'Lekce', html: Lesson.html(les), onShow: () => { if (!lab) lab = Lesson.mount(m, les); } },
      { label: 'Úkol', html: `<div class="b-task"><b>Úkol:</b> ${md(l.task)}</div><h3 class="st-sub">⭐ Za co dostaneš hvězdy</h3>${Lesson.stars(starRowsOf(l))}` }
    ].filter(Boolean);
    const m = Kit.modal(`
      <div class="briefing ${first ? 'typing' : ''}">
        <p class="b-kicker">${chapterOf(l).icon} ${esc(chapterOf(l).title)}, obraz ${l.id} z ${LEVELS.length}</p>
        <h2><i>${esc(l.title)}</i></h2>
        <p class="b-artist">${esc(l.artist)}, ${l.year}</p>
        ${Lesson.steps(steps)}
      </div>`, { cls: 'brief-modal steps-modal' });
    Lesson.wire(m, steps, { done: 'Jdu malovat 🎨', finish: () => Kit.closeModal(), start: start || 0 });
    if (first) Kit.sound('type');
    if (onClose) {
      const obs = new MutationObserver(() => { if (!document.body.contains(m)) { obs.disconnect(); onClose(); } });
      obs.observe(document.body, { childList: true });
    }
  }

  /* ---------------- obraz (úroveň) ---------------- */
  function renderLevel(id) {
    leave();
    const l = LEVELS.find(x => x.id === id);
    if (!l || !unlocked(id)) { renderMap(); return; }
    const ch = chapterOf(l);
    const ls = lState(id);
    const ses = { t0: performance.now(), timers: [], cat: null, img: null, res: null, mode: 'side', file: 'css', token: 0, solution: false, passedOnce: ls.best >= PASS, masterOnce: ls.best >= MASTER, lint: [], wipe: 50 };
    const later = (f, ms) => { const t = setTimeout(f, ms); ses.timers.push(t); return t; };
    const code = codeOf(l);
    crumb([{ label: 'Plán výstavy', go: renderMap }, { label: ch.title }, { label: `${l.id}. ${l.title}` }]);
    const prev = LEVELS.find(x => x.id === id - 1);
    const next = LEVELS.find(x => x.id === id + 1);

    app.innerHTML = `
      <section class="ws-screen fit">
        <header class="mbar">
          <span class="mb-num" aria-hidden="true">${pad2(l.id)}</span>
          <div class="mb-text"><span class="mb-where">${ch.icon} ${esc(ch.title)}<code class="mb-concept" title="Technika obrazu">${esc(l.concept)}</code></span><h1><span class="sr-only">Obraz ${l.id}: </span><i>${esc(l.title)}</i></h1></div>
          <div class="mb-right">
            <ul class="goals" id="goals" aria-label="Hvězdy za obraz"></ul>
            <nav class="mb-nav" aria-label="Další obrazy">
              <button class="icon-btn" id="prevBtn" title="Předchozí obraz" aria-label="Předchozí obraz" ${prev ? '' : 'disabled'}>◀</button>
              <button class="icon-btn" id="nextBtn" title="Další obraz" aria-label="Další obraz" ${next && isDone(id) ? '' : 'disabled'}>▶</button>
            </nav>
          </div>
        </header>
        <section class="panel brief-strip" aria-label="Zadání">
          <div class="label-card"><b>${esc(l.artist)}</b><span><i>${esc(l.title)}</i>, ${l.year}</span><small>CSS na plátně, 400 × 300 px</small></div>
          <div class="bs-text"><p class="task">${md(l.task)}</p><p class="bonus-line"><span class="bl-star" aria-hidden="true">★</span> <b>Bonus navíc:</b> ${md(l.bonus.text)} <span class="bs-state" id="bonusState" aria-live="polite"></span></p></div>
          <div class="brief-actions">
            <button class="btn small" id="briefBtn">💬 Briefing</button>
            <button class="btn small" id="lessonBtn" title="Nová technika s příkladem, který si můžeš hned vyzkoušet">📖 Lekce</button>
            <button class="btn small" id="hintBtn"></button>
            <button class="btn small ghost" id="tourBtn" title="Průvodce obrazovkou: co je kde a k čemu to slouží">❔ Průvodce</button>
            <button class="btn small ghost" id="solBtn" hidden>👀 Ukázat řešení</button>
          </div>
          <div class="hints" id="hints" aria-live="polite"></div>
        </section>
        <div class="ws wide-left">
          <div class="col wall-col">
            <section class="panel wall" aria-label="Stěna galerie">
              <div class="modes" role="tablist" aria-label="Jak porovnat obrazy">
                ${[['side', 'Vedle sebe'], ['slider', 'Posuvník'], ['diff', 'Rozdíly']].map(([m, t]) => `<button role="tab" class="mtab" id="mt-${m}" data-m="${m}" aria-selected="${m === 'side'}" tabindex="${m === 'side' ? 0 : -1}" aria-controls="hall">${t}</button>`).join('')}
                <span class="sp"></span>
                <span class="sr-only" id="probeLive" aria-live="polite"></span>
                <span class="probe" id="probe" aria-live="off">${matchMedia('(hover: none)').matches ? 'Klepni do katalogu a vezmeš barvu' : 'Najeď myší na obraz'}</span>
              </div>
              <div class="hall" id="hall" data-m="side" role="tabpanel" aria-labelledby="mt-side">
                <figure class="art cat">
                  <div class="frame"><div class="canvas-box"><canvas id="cvCat" width="400" height="300" tabindex="0" role="application" aria-roledescription="pipeta" aria-label="Katalog: ${esc(l.title)}. Šipkami mušku posuneš, Shift a šipka skočí o 10 px, Enter vezme barvu." aria-describedby="probeLive"></canvas><i class="xh" aria-hidden="true"></i></div></div>
                  <figcaption>Katalog <small>klikni a vezmeš barvu</small></figcaption>
                </figure>
                <figure class="art mine">
                  <div class="frame"><div class="canvas-box"><canvas id="cvMine" width="400" height="300" role="img" aria-label="Tvoje plátno"></canvas><canvas id="cvOver" class="over" width="400" height="300" aria-hidden="true"></canvas><canvas id="cvDiff" class="diffc" width="400" height="300" aria-hidden="true"></canvas><i class="wipe-line" aria-hidden="true"></i><i class="xh" aria-hidden="true"></i></div></div>
                  <figcaption id="mineCap">Tvoje plátno <small>maluje se z tvého CSS</small></figcaption>
                </figure>
              </div>
              <div class="wipe-row" id="wipeRow" hidden><label for="wipe">Plátno ↔ katalog</label><input type="range" id="wipe" min="0" max="100" value="50"></div>
              <div class="swatches" id="swatches" aria-label="Barvy z katalogu"></div>
            </section>
          </div>
          <div class="col">
            <section class="panel code-pane" aria-label="Kód obrazu">
              <div class="tabs" role="tablist" aria-label="Soubory">${[['css', 'style.css'], ['html', 'index.html']].map(([k, nm]) => `<button class="tab ${k === 'css' ? 'on' : ''}" role="tab" id="ft-${k}" data-f="${k}" aria-selected="${k === 'css'}" tabindex="${k === 'css' ? 0 : -1}" aria-controls="editor">${nm}</button>`).join('')}<span class="sp"></span><button class="btn small ghost" id="snipBtn" aria-expanded="false" aria-controls="paletteWrap" title="Úryvky kódu">🧩 Úryvky</button><button class="btn small ghost" id="resetBtn" title="Vrátit vybledlé plátno ze zadání">↺ Původní</button></div>
              <div class="palette-wrap" id="paletteWrap" hidden><div class="palette" id="palette"></div></div>
              <div id="editor" role="tabpanel" aria-labelledby="ft-css"></div>
              <p class="sr-only" id="edHelp">Editor kódu. Plátno se překreslí samo. Klávesa Tab odsazuje, Esc a potom Tab přesune fokus dál. Ctrl+Enter pověsí obraz, když je obnovený aspoň na 95 procent.</p>
              <div class="meter" id="meter">
                <div class="m-num" aria-hidden="true"><b id="mPct">0</b><span>%</span></div>
                <div class="m-body">
                  <div class="m-label" id="mLabel">Obnoveno</div>
                  <div class="m-bar" role="progressbar" aria-label="Obnoveno" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="mBar"><span id="mFill"></span><i class="tick t95" title="95 %: obraz můžeš pověsit"></i><i class="tick t99" title="99 %: mistrovská shoda"></i></div>
                  <div class="m-meta"><span id="mSize"></span><span id="mBest"></span></div>
                </div>
              </div>
              <div class="lint" id="lint" aria-live="polite"></div>
              <div class="runbar">
                <button class="btn go big" id="hangBtn" disabled>🖼️ Pověsit obraz <kbd>Ctrl+Enter</kbd></button>
                <div class="status" id="status"></div>
              </div>
            </section>
          </div>
        </div>
      </section>`;

    /* ---------- editor ---------- */
    const ed = new CodeEditor($('#editor'), { lang: 'css', tab: 2, onRun: () => hang(), label: 'Editor souboru style.css', describedBy: 'edHelp' });
    function showFile(k) {
      ses.file = k;
      ed.setLang(k);
      ed.value = code[k];
      $$('.code-pane .tab').forEach(t => { const on = t.dataset.f === k; t.classList.toggle('on', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      $('#editor').setAttribute('aria-labelledby', 'ft-' + k);
      ed.ta.setAttribute('aria-label', `Editor souboru ${k === 'css' ? 'style.css' : 'index.html'}`);
      renderPalette();
      markLint();
    }
    function renderPalette() {
      const items = ses.file === 'css' ? l.palette : [];
      $('#palette').innerHTML = items.length
        ? items.map((s, i) => `<button class="chip" data-p="${i}">${esc(s.replace(/\|/g, '').replace(/\n\s*/g, ' '))}</button>`).join('')
        : '<span class="p-label">V HTML jen přidáváš nebo ubíráš prvky. Malovat se dá jen v style.css.</span>';
      $$('#palette [data-p]').forEach(b => b.addEventListener('click', () => {
        const s = l.palette[+b.dataset.p];
        ed.insertSnippet(s.includes('|') ? s : s + '|', !s.includes('\n'));
        Kit.sound('type');
      }));
    }
    $$('.code-pane .tab').forEach(t => t.addEventListener('click', () => { Kit.sound('click'); showFile(t.dataset.f); }));
    tabKeys($('.code-pane .tabs'), '.tab', b => showFile(b.dataset.f));
    const snipOpen = open => {
      $('#paletteWrap').hidden = !open;
      $('#snipBtn').setAttribute('aria-expanded', String(open));
      $('#snipBtn').classList.toggle('on', open);
      Kit.write('nocVGalerii.snips', open);
    };
    snipOpen(!!Kit.read('nocVGalerii.snips', true));
    $('#snipBtn').addEventListener('click', () => { Kit.sound('click'); snipOpen($('#paletteWrap').hidden); });
    let saveT = 0;
    let paintT = 0;
    ed.onChange(v => {
      code[ses.file] = v;
      ls.edits++;
      clearTimeout(saveT);
      saveT = setTimeout(() => { ls.code = { html: code.html, css: code.css }; save(); }, 600);
      clearTimeout(paintT);
      paintT = setTimeout(paint, 220);
    });

    /* ---------- plátna ---------- */
    const cvCat = $('#cvCat');
    const cvMine = $('#cvMine');
    const cvOver = $('#cvOver');
    const cvDiff = $('#cvDiff');
    async function paint() {
      const tk = ++ses.token;
      let img;
      try { img = await Painter.render(code.html, code.css); } catch (e) { return; }
      if (tk !== ses.token || !document.contains(cvMine)) return;
      ses.img = img;
      cvMine.getContext('2d').putImageData(img, 0, 0);
      if (!ses.cat) return;
      ses.res = Painter.score(ses.cat, img);
      if (ses.mode === 'diff') cvDiff.getContext('2d').putImageData(Painter.diffImage(ses.cat, img), 0, 0);
      const prevLint = new Set(ses.lint.map(x => x.msg));
      ses.lint = Painter.lint(code.css);
      ses.lint.forEach(x => { if (!prevLint.has(x.msg)) P.lint[x.type] = (P.lint[x.type] || 0) + 1; });
      updateMeter();
      renderLint();
    }
    function updateMeter() {
      const r = ses.res;
      const v = r ? r.score : 0;
      const shown = Math.floor(v * 10) / 10;
      $('#mPct').textContent = pct(v);
      $('#mFill').style.width = `${Math.max(0, Math.min(100, v))}%`;
      $('#mBar').setAttribute('aria-valuenow', String(Math.round(v)));
      $('#meter').className = `meter ${v >= MASTER ? 'master' : v >= PASS ? 'pass' : ''}`;
      $('#mLabel').innerHTML = v >= MASTER ? 'Obnoveno <small>mistrovská shoda</small>' : v >= PASS ? 'Obnoveno <small>obraz můžeš pověsit</small>' : `Obnoveno <small>do 95 % chybí ${pct(PASS - shown)} %</small>`;
      const size = Painter.size(code.css);
      $('#mSize').innerHTML = l.bonus.limit ? `<span class="${size <= l.bonus.limit ? 'gold' : ''}">CSS ${size} / ${l.bonus.limit} znaků</span>` : `CSS ${size} znaků`;
      if (v > ls.best) { ls.best = v; }
      $('#mBest').textContent = ls.best > 0 ? `nejlépe ${pct(ls.best)} %` : '';
      $('#hangBtn').disabled = v < PASS;
      bonusState();
      if (v >= PASS && !ses.passedOnce) { ses.passedOnce = true; Kit.sound('ok'); announce('Obnoveno 95 procent. Obraz můžeš pověsit.'); }
      if (v >= MASTER && !ses.masterOnce) { ses.masterOnce = true; Kit.sound('star'); announce('Mistrovská shoda, 99 procent.'); }
      if (!ses.status) Kit.status($('#status'), v >= PASS ? 'ok' : 'idle', v >= PASS ? 'Obraz je připravený' : 'Maluj a sleduj, jak roste shoda', v >= PASS ? (v >= MASTER ? 'Mistrovská shoda. Pověs ho (Ctrl+Enter), nebo ještě zkus bonus.' : 'Pověsit ho můžeš hned. Na další hvězdu dotáhni shodu na 99 %.') : 'Od 95 % shody můžeš obraz pověsit. Co nesedí, ukáže režim Rozdíly.');
    }
    function renderLint() {
      const box = $('#lint');
      const list = ses.lint;
      if (!list.length) { box.innerHTML = ''; markLint(); return; }
      box.innerHTML = `<div class="console">${list.slice(0, 3).map(x => `<div class="log warn">! <button class="line-link" data-line="${x.line}">ř. ${x.line}</button> ${esc(x.msg)}</div>`).join('')}${list.length > 3 ? `<div class="log info">… a ${list.length - 3} další</div>` : ''}</div>`;
      $$('#lint [data-line]').forEach(b => b.addEventListener('click', () => { if (ses.file !== 'css') showFile('css'); ed.goToLine(+b.dataset.line); }));
      markLint();
    }
    function markLint() {
      ed.clearMarks();
      if (ses.file === 'css' && ses.lint.length) ed.markError(ses.lint[0].line);
    }

    /* ---------- režimy porovnání ---------- */
    function setMode(m, keep) {
      ses.mode = m;
      $('#hall').dataset.m = m;
      $('#hall').setAttribute('aria-labelledby', 'mt-' + m);
      $$('.modes .mtab').forEach(b => { const on = b.dataset.m === m; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      $('#wipeRow').hidden = m !== 'slider';
      $('#mineCap').innerHTML = m === 'side' ? 'Tvoje plátno <small>maluje se z tvého CSS</small>' : m === 'slider' ? 'Vlevo tvoje plátno, vpravo katalog <small>posuň jezdcem</small>' : 'Rozdíly <small>růžová místa nesedí, světlá jsou jen okraje</small>';
      if (m === 'diff') {
        if (ses.img && ses.cat) cvDiff.getContext('2d').putImageData(Painter.diffImage(ses.cat, ses.img), 0, 0);
        if (!P.diffUsed) { P.diffUsed = true; logEvent('diff', { level: l.id }); checkBadges(); save(); }
      }
      applyWipe();
      if (!keep) { const b = $(`#mt-${m}`); if (b) b.focus({ preventScroll: true }); }
    }
    function applyWipe() {
      const v = ses.wipe;
      cvOver.style.clipPath = `inset(0 0 0 ${v}%)`;
      $('.wipe-line').style.left = `${v}%`;
    }
    $$('.modes .mtab').forEach(b => b.addEventListener('click', () => { Kit.sound('click'); setMode(b.dataset.m, true); }));
    tabKeys($('.modes'), '.mtab', b => setMode(b.dataset.m));
    $('#wipe').addEventListener('input', e => { ses.wipe = +e.target.value; applyWipe(); });

    /* ---------- pipeta a pravítko ---------- */
    const probe = $('#probe');
    const posOf = (e, cv) => {
      const r = cv.getBoundingClientRect();
      return { x: Math.max(0, Math.min(399, Math.floor(((e.clientX - r.left) / r.width) * 400))), y: Math.max(0, Math.min(299, Math.floor(((e.clientY - r.top) / r.height) * 300))) };
    };
    function showProbe(x, y) {
      if (!ses.cat) return;
      const c = Painter.pick(ses.cat.img, x, y);
      const m = ses.img ? Painter.pick(ses.img, x, y) : '';
      probe.innerHTML = `<b>x ${x}</b> <b>y ${y}</b><span class="sw" style="background:${c}" aria-hidden="true"></span><span title="Barva v katalogu">${c}</span>${m && m !== c ? `<span class="vs">tvoje</span><span class="sw" style="background:${m}" aria-hidden="true"></span><span title="Barva na tvém plátně">${m}</span>` : m ? '<span class="same">✔ sedí</span>' : ''}`;
      $$('#hall .xh').forEach(h => { h.style.setProperty('--x', `${(x + 0.5) / 4}%`); h.style.setProperty('--y', `${(y + 0.5) / 3}%`); h.classList.add('on'); });
    }
    [cvCat, cvMine, cvOver, cvDiff].forEach(cv => {
      cv.addEventListener('mousemove', e => { const { x, y } = posOf(e, cv); showProbe(x, y); });
      cv.addEventListener('mouseleave', () => { $$('#hall .xh').forEach(h => h.classList.remove('on')); });
    });
    cvCat.addEventListener('click', e => {
      if (!ses.cat) return;
      const { x, y } = posOf(e, cvCat);
      const c = Painter.pick(ses.cat.img, x, y);
      showProbe(x, y);
      pickColor(c);
    });
    /* pipeta z klávesnice: šipky posouvají mušku, Enter vezme barvu */
    const aim = { x: 200, y: 150 };
    const sayAim = () => { if (ses.cat) $('#probeLive').textContent = `x ${aim.x}, y ${aim.y}, barva ${Painter.pick(ses.cat.img, aim.x, aim.y)}`; };
    cvCat.addEventListener('focus', () => { if (cvCat.matches(':focus-visible')) { showProbe(aim.x, aim.y); sayAim(); } });
    cvCat.addEventListener('blur', () => $$('#hall .xh').forEach(h => h.classList.remove('on')));
    cvCat.addEventListener('keydown', e => {
      const st = e.shiftKey ? 10 : 1;
      const d = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
      if (d) {
        e.preventDefault();
        aim.x = Math.max(0, Math.min(399, aim.x + d[0]));
        aim.y = Math.max(0, Math.min(299, aim.y + d[1]));
        showProbe(aim.x, aim.y);
        sayAim();
      } else if ((e.key === 'Enter' || e.key === ' ') && ses.cat) {
        e.preventDefault();
        pickColor(Painter.pick(ses.cat.img, aim.x, aim.y));
      }
    });
    /* bonus se kontroluje průběžně, takže je hned vidět, jestli už je splněný */
    function bonusState() {
      const el = $('#bonusState');
      if (!el) return;
      let ok = false;
      try { ok = !!l.bonus.check(bonusCtx()); } catch (e) { ok = false; }
      el.textContent = ok ? '✓ teď splněno' : '· zatím ne';
      el.classList.toggle('ok', ok);
    }
    function pickColor(c) {
      copyText(c);
      if (!ses.picked) { ses.picked = true; bonusState(); }
      if (!P.picked) { P.picked = true; logEvent('pipette', { level: l.id }); checkBadges(); save(); }
    }

    /* ---------- hodnocení a pověšení ---------- */
    function goals() {
      $('#goals').innerHTML = Kit.goals([
        { got: ls.stars[0], text: 'Pověsit obraz', title: 'Hvězda za pověšení: obraz musí mít shodu aspoň 95 %' },
        { got: ls.stars[1], text: 'Shoda aspoň 99 %', title: 'Hvězda za mistrovskou shodu: aspoň 99 %' },
        { got: ls.stars[2], text: 'Bonus', title: 'Bonus navíc: ' + l.bonus.text.replace(/`/g, '') }
      ]);
    }
    function bonusCtx() {
      return { html: code.html, css: code.css, rules: Painter.rules(code.css), size: Painter.size(code.css), els: Painter.elements(code.html), stats: { picked: !!ses.picked } };
    }
    function hang() {
      const r = ses.res;
      if (!r) return;
      if (r.score < PASS) {
        ses.status = true;
        Kit.status($('#status'), 'warn', `Zatím ${pct(r.score)} %`, `Obraz pověsíš od 95 %. Zkus režim Rozdíly, ukáže, co nesedí.`);
        Kit.sound('fail');
        later(() => { ses.status = false; }, 3500);
        return;
      }
      let bonus = false;
      try { bonus = !!l.bonus.check(bonusCtx()); } catch (e) { bonus = false; }
      const got = [true, r.score >= MASTER && !ses.solution, bonus && !ses.solution];
      const before = ls.stars.slice();
      const first = !ls.done;
      ls.hangs++;
      if (first) {
        addTime();
        ls.done = true;
        ls.firstTry = ls.hints === 0 && !ls.solution;
        ls.wonAt = Date.now();
      }
      ls.hung = Math.max(ls.hung, r.score);
      ls.size = Painter.size(code.css);
      ls.code = { html: code.html, css: code.css };
      ls.stars = ls.stars.map((x, i) => x || got[i]);
      logEvent('hang', { level: l.id, score: Math.round(r.score * 10) / 10, stars: got.filter(Boolean).length, first, bonus, size: ls.size });
      const badges = checkBadges();
      save();
      goals();
      Kit.sound('win');
      $('#nextBtn').disabled = !next;
      later(() => victory(got, before, r, bonus, badges), RM() ? 200 : 500);
    }
    /* hodnocení: u každé hvězdy věta, co se povedlo, a u chybějící, jak ji získat */
    function starRows(got, before, r) {
      const sc = pct(r.score);
      const had = i => !got[i] && before[i] ? ' Hvězdu ale už máš z dřívějška.' : '';
      const b = l.bonus;
      const ex = b.example ? `<pre class="code">${hl(b.example, b.lang || 'css')}</pre>` : '';
      const rows = [
        { got: true, title: 'Obraz visí', text: `Shoda s katalogem je ${sc} %. Na pověšení stačí 95 %.` },
        ses.solution
          ? { got: ls.stars[1], title: 'Mistrovská shoda (aspoň 99 %)', text: 'Použil(a) jsi vzorové řešení, takže se tahle hvězda tentokrát nepočítá.' + had(1), how: 'Klikni na <b>Ještě vylepšit</b> a namaluj obraz vlastním CSS.' }
          : got[1]
            ? { got: true, title: 'Mistrovská shoda (aspoň 99 %)', text: `Máš ${sc} %, tedy aspoň potřebných 99 %.` }
            : { got: ls.stars[1], title: 'Mistrovská shoda (aspoň 99 %)', text: `Máš ${sc} %, na tuhle hvězdu je potřeba aspoň 99 %.` + had(1), how: 'Klikni na <b>Ještě vylepšit</b> a přepni porovnání na <b>Rozdíly</b>: růžová místa ukážou, co ještě nesedí. Pipetou si ověř barvu a pravítkem souřadnice.' },
        got[2]
          ? { got: true, title: 'Bonus navíc', text: `${md(b.text)} Povedlo se!` }
          : ses.solution
            ? { got: ls.stars[2], title: 'Bonus navíc', text: 'Se vzorovým řešením se bonusová hvězda nepočítá.' + (ls.stars[2] ? ' Hvězdu ale už máš z dřívějška.' : ''), how: `Klikni na <b>Ještě vylepšit</b> a vyřeš to po svém, i s bonusem: ${md(b.text)}` }
          : { got: ls.stars[2], title: 'Bonus navíc', text: `Tentokrát ne. Bonus chtěl: ${md(b.text)}${had(2)}`, how: `<b>Jak na to:</b> ${md(b.how || '')}${ex}` }
      ];
      return Kit.starReport(rows) + Kit.solutionBox(`<p>Takhle obraz namaloval autor katalogu. Tvoje řešení může vypadat jinak, důležité je, že plátno sedí.</p><pre class="code">${hl(l.solution)}</pre>`, false);
    }
    async function victory(got, before, r, bonus, badges) {
      const url = await thumb(code.html, code.css, 1);
      const mdl = Kit.modal(`
        <div class="victory">
          <div class="v-art">
          <h2 class="granted" id="winTitle">${l.id === LEVELS.length ? '🌄 Výstava zachráněna' : '🖼️ Obraz visí zpátky'}</h2>
          <figure class="art won"><div class="frame"><img src="${url}" alt="Tvůj obnovený obraz ${esc(l.title)}" width="400" height="300"></div>
            <figcaption class="label-card"><b>${esc(l.artist)}</b><span><i>${esc(l.title)}</i>, ${l.year}</span><small>CSS na plátně, obnovil(a) ${esc(P.name)} ve ${clock()}</small></figcaption></figure>
          </div>
          <div class="v-info">
          <div class="big-stars" role="img" aria-label="Hvězdy: ${ls.stars.filter(Boolean).length} ze 3">${got.map((g, i) => `<i class="${ls.stars[i] ? 'on' : ''} ${ls.stars[i] && !before[i] ? 'new' : ''}" style="animation-delay:${0.15 + i * 0.25}s" aria-hidden="true">★</i>`).join('')}</div>
          ${starRows(got, before, r)}
          <div class="reward">${esc(l.reward)}</div>
          <div class="learn"><b>📖 Příručka: ${esc(l.concept)}</b><p>${md(l.learn[0])}</p><pre class="code">${hl(l.learn[1])}</pre></div>
          <div class="btn-row center">
            ${next ? '<button class="btn primary big" data-next data-focus>Další obraz</button>'
              : (P.post ? '<button class="btn primary big" data-res data-focus>🖼️ Moje výstava</button>' : '<button class="btn primary big" data-post data-focus>Výstupní test</button>')}
            <button class="btn" data-retry>↺ Ještě vylepšit</button>
            <button class="btn ghost" data-map>🗺️ Plán výstavy</button>
          </div>
          </div>
        </div>`, { cls: 'win' });
      got.forEach((g, i) => { if (ls.stars[i]) setTimeout(() => Kit.sound('star'), 300 + i * 250); });
      if (got.every(Boolean) || l.id === LEVELS.length) Kit.confetti(['★', '◆', '●'], ['#d4af5a', '#e2673f', '#7d9a78', '#f3e3c3']);
      const on = (sel, f) => { const b = $(sel, mdl); if (b) b.addEventListener('click', f); };
      on('[data-next]', () => renderLevel(next.id));
      on('[data-post]', () => renderQuiz('post'));
      on('[data-res]', renderResults);
      on('[data-map]', renderMap);
      on('[data-retry]', () => { Kit.closeModal(); ses.solution = false; ed.focus(); });
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
      $('#solBtn').hidden = left > 0;
    }
    $('#hintBtn').addEventListener('click', () => {
      if (ls.hints >= l.hints.length) return;
      ls.hints++;
      logEvent('hint', { level: l.id, n: ls.hints });
      save();
      showHints();
      Kit.sound('click');
    });
    $('#solBtn').addEventListener('click', () => Kit.confirm('Ukázat vzorové řešení? Obraz pak v tomhle pokusu pověsíš jen za 1 hvězdu. Nejvíc se naučíš, když řešení projdeš řádek po řádku a pak ho zkusíš napsat sám/sama.', 'Ukázat řešení', () => {
      ses.solution = true;
      ls.solution = true;
      logEvent('solution', { level: l.id });
      code.css = l.solution;
      code.html = l.html;
      ls.code = { html: code.html, css: code.css };
      showFile('css');
      paint();
      save();
    }));
    $('#resetBtn').addEventListener('click', () => Kit.confirm('Vrátit vybledlé plátno ze zadání? Tvoje úpravy se smažou.', 'Vrátit původní', () => {
      code.css = l.starter;
      code.html = l.html;
      ls.code = null;
      showFile(ses.file);
      paint();
      save();
    }));
    $('#briefBtn').addEventListener('click', () => briefing(l, false));
    $('#lessonBtn').addEventListener('click', () => openLesson(l));
    $('#hangBtn').addEventListener('click', hang);
    $('#prevBtn').addEventListener('click', () => prev && renderLevel(prev.id));
    $('#nextBtn').addEventListener('click', () => next && isDone(id) && renderLevel(next.id));

    showFile('css');
    goals();
    showHints();
    Kit.status($('#status'), 'run', 'Galerie rozsvěcuje katalog…');
    (async () => {
      try {
        ses.cat = await catalogOf(l);
        if (!document.contains(cvCat)) return;
        cvCat.getContext('2d').putImageData(ses.cat.img, 0, 0);
        cvOver.getContext('2d').putImageData(ses.cat.img, 0, 0);
        $('#swatches').innerHTML = `<span class="sw-label">Barvy z katalogu:</span>${ses.cat.palette.map(c => `<button class="swatch" data-c="${c}" title="Zkopírovat ${c}"><i style="background:${c}" aria-hidden="true"></i>${c}</button>`).join('')}`;
        $$('#swatches [data-c]').forEach(b => b.addEventListener('click', () => pickColor(b.dataset.c)));
        paint();
      } catch (e) {
        Kit.status($('#status'), 'bad', 'Obraz se nepodařilo vykreslit', 'Tenhle prohlížeč neumí vykreslit HTML do obrázku. Zkus Chrome, Edge nebo Firefox.');
      }
    })();
    const focusEd = () => { if (window.matchMedia('(min-width: 1100px)').matches) { ed.ta.setSelectionRange(0, 0); ed.ta.focus({ preventScroll: true }); } else focusHeading(); };
    /* průvodce obrazovkou: poprvé se spustí sám, pak tlačítkem ❔ */
    const tourSteps = () => [
      { el: '.brief-strip .bs-text', title: 'Zadání', text: 'Co máš na obraze opravit. Pod zadáním je <b>bonus navíc</b> za třetí hvězdu a vedle něj hned uvidíš, jestli už ho máš.' },
      { el: '.wall', title: 'Katalog a tvoje plátno', text: '<b>Katalog</b> je fotka obrazu, jak má vypadat. <b>Tvoje plátno</b> se maluje z tvého CSS. Najeď myší na katalog: uvidíš souřadnice a barvu, kliknutím (nebo klepnutím) barvu zkopíruješ. Režim <b>Rozdíly</b> obarví růžově místa, která ještě nesedí.' },
      { el: '.code-pane .tabs', title: 'Soubory obrazu', text: 'Maluješ v souboru <code>style.css</code>. V <code>index.html</code> jsou prvky obrazu, ty měníš jen u některých bonusů. 🧩 Úryvky vloží hotové kousky kódu.' },
      { el: '#editor', title: 'Tvoje CSS', text: 'Sem píšeš. Plátno se překreslí samo, hned jak přestaneš psát, a pod editorem se objeví upozornění na překlepy s číslem řádku.' },
      { el: '#meter', title: 'Ukazatel Obnoveno', text: 'Kolik procent plátna sedí s katalogem. Ryska na <b>95 %</b>: obraz můžeš pověsit (★). Ryska na <b>99 %</b>: mistrovská shoda (★).' },
      { el: '#hangBtn', title: 'Pověsit obraz', text: 'Od 95 % se tlačítko odemkne (nebo Ctrl+Enter). Potom uvidíš, za co jsi dostal(a) hvězdy a jak získat ty, které chybí.' },
      { el: '#goals', title: 'Tři hvězdy', text: 'Tady vidíš, které hvězdy už máš: pověšení, shoda aspoň 99 % a bonus. Obraz můžeš kdykoli vylepšit a hvězdy dobrat.' },
      { el: '.brief-strip .brief-actions', title: 'Když nevíš kudy kam', text: '📖 <b>Lekce</b> vysvětlí techniku obrazu na příkladu, který si můžeš hned upravit. 💡 <b>Nápověda</b> radí ve třech krocích, od jemného postrčení po skoro hotový kód. 💬 Briefing znovu ukáže příběh a ❔ Průvodce tuhle prohlídku.' }
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
        clearTimeout(paintT);
        ses.timers.forEach(clearTimeout);
        ses.token++;
        ls.code = { html: code.html, css: code.css };
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

  /* ---------------- výsledky a výstava ---------------- */
  function renderResults() {
    leave();
    if (!P || !P.pre) { renderIntro(); return; }
    crumb([{ label: 'Plán výstavy', go: renderMap }, { label: P.post ? 'Výsledky' : 'Moje výstava' }]);
    const pre = Kit.quizStats(P.pre.answers);
    const post = P.post ? Kit.quizStats(P.post.answers) : null;
    const g = gainOf();
    const stars = starCount();
    const rank = RANKS.filter(r => stars >= r[0]).pop();
    const done = LEVELS.filter(l => isDone(l.id));
    const st = id => P.levels[id] || {};
    const avgHung = done.length ? done.reduce((n, l) => n + (st(l.id).hung || 0), 0) / done.length : 0;
    const hints = LEVELS.reduce((n, l) => n + (st(l.id).hints || 0), 0);
    const time = done.reduce((n, l) => n + (st(l.id).timeMs || 0), 0);
    const masters = done.filter(l => st(l.id).stars[1]).length;
    const review = (ans, form) => ans.map(a => {
      const q = G.QUIZ[form][a.q];
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
            <p>★ ${stars} z ${MAX_STARS}, obnoveno ${done.length} z ${LEVELS.length} obrazů, v galerii je ${clock()}.</p>
            ${post ? `<div class="index">Normalizovaný zisk <b>g = ${g === null ? '–' : Kit.fmt(g, 2)}</b></div>
              <p class="small muted" style="margin:.5rem 0 0">g říká, jakou část z toho, co jsi na začátku ještě neuměl(a), ses naučil(a): 0 = nic, 1 = všechno.</p>` : ''}
          </div>
          <div class="prepost">
            <div class="pp"><b>${pre.correct}/${pre.n}</b><small>před hrou</small></div>
            <span class="arrow" aria-hidden="true">→</span>
            <div class="pp after"><b>${post ? post.correct + '/' + post.n : '–'}</b><small>po hře</small></div>
          </div>
        </div>
        <section class="card expo" aria-labelledby="expoH">
          <h2 id="expoH">Moje výstava</h2>
          <p class="muted">Tak visí obrazy, které jsi v noci namaloval(a). Každý je vykreslený z tvého CSS.</p>
          <div class="expo-wall">${LEVELS.map(l => {
            const s = st(l.id);
            return `<figure class="art expo-item ${s.done ? '' : 'empty'}">
              <div class="frame"><img data-expo="${l.id}" alt="${s.done ? `Tvůj obraz ${esc(l.title)}` : `${esc(l.title)}: zatím neobnoveno`}" width="200" height="150"></div>
              <figcaption class="label-card"><b><i>${esc(l.title)}</i></b><span>${esc(l.artist)}, ${l.year}</span><small>${s.done ? `shoda ${pct(s.hung || 0)} %, ${'★'.repeat(s.stars.filter(Boolean).length)}${s.size ? `, ${s.size} znaků` : ''}` : 'zatím prázdné plátno'}</small></figcaption>
            </figure>`;
          }).join('')}</div>
        </section>
        <div class="grid-2">
          <div class="card">
            <h2>Test před hrou a po ní</h2>
            ${Kit.bar('Vstupní test', pre.pct, pre.correct + '/' + pre.n, 'pre')}
            ${post ? Kit.bar('Výstupní test', post.pct, post.correct + '/' + post.n, post.pct >= pre.pct ? 'post' : 'lo') : '<p class="muted">Výstupní test ještě čeká, najdeš ho na plánu výstavy.</p>'}
            <div class="stat-row">
              <div class="stat"><b>${pre.pct} %</b><small>před hrou</small></div>
              <div class="stat"><b class="${post && post.pct > pre.pct ? 'up' : ''}">${post ? post.pct + ' %' : '–'}</b><small>po hře</small></div>
              <div class="stat"><b>${pre.dunno} → ${post ? post.dunno : '–'}</b><small>odpovědí „nevím“</small></div>
            </div>
            ${post ? Kit.conceptTable(G.CONCEPTS, P.pre.answers, P.post.answers) : ''}
          </div>
          <div class="card">
            <h2>Jak se ti malovalo</h2>
            <div class="stat-row">
              <div class="stat"><b>${pct(avgHung)} %</b><small>průměrná shoda</small></div>
              <div class="stat"><b>${masters}</b><small>mistrovských shod</small></div>
              <div class="stat"><b>${hints}</b><small>nápověd</small></div>
              <div class="stat"><b>${fmtTime(time)}</b><small>čas do pověšení</small></div>
            </div>
            <div class="table-wrap"><table class="tbl">
              <thead><tr><th>Obraz</th><th>★</th><th>Shoda</th><th>Úpravy</th><th>Nápovědy</th><th>Čas</th></tr></thead>
              <tbody>${LEVELS.map(l => {
                const s = st(l.id);
                return `<tr><td>${l.id}. ${esc(l.title)}</td><td>${s.done ? '★'.repeat(s.stars.filter(Boolean).length) : '–'}</td>
                  <td>${s.done ? pct(s.hung) + ' %' : s.best ? `${pct(s.best)} % (nepověšeno)` : '–'}</td><td>${s.edits || '–'}</td><td>${s.hints || 0}${s.solution ? ' + řešení' : ''}</td>
                  <td>${s.done ? fmtTime(s.timeMs) : '–'}</td></tr>`;
              }).join('')}</tbody></table></div>
            <p class="small muted" style="margin-bottom:.2rem">Chyby v CSS, které jsi potkal(a) a opravil(a):</p>
            <div class="errlist">${Object.keys(P.lint || {}).length ? Object.entries(P.lint).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<span><b>${esc(t)}</b> ×${n}</span>`).join('') : '<span>žádné, čistá práce!</span>'}</div>
          </div>
        </div>
        <div class="card">
          <h2>Odznaky <small class="muted">${P.badges.length} z ${BADGES.length}</small></h2>
          <div class="badges">${BADGES.map(b => `<div class="badge ${P.badges.includes(b.id) ? 'got' : ''}"><span aria-hidden="true">${b.icon}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small><span class="sr-only">${P.badges.includes(b.id) ? 'získáno' : 'zatím nezískáno'}</span></div>`).join('')}</div>
        </div>
        ${post ? `<div class="card"><details class="answers-review"><summary>Projít odpovědi výstupního testu (varianta ${P.post.form})</summary>${review(P.post.answers, P.post.form)}</details>
          <details class="answers-review"><summary>Projít odpovědi vstupního testu (varianta ${P.pre.form})</summary>${review(P.pre.answers, P.pre.form)}</details></div>` : ''}
        <div class="btn-row center">
          <button class="btn primary" id="mapBtn2">🗺️ Plán výstavy</button>
          <button class="btn" id="expBtn">⬇️ Stáhnout výsledky (JSON)</button>
          <button class="btn ghost" id="cheat2">📖 Příručka restaurátora</button>
        </div>
      </section>`;
    focusHeading();
    $('#mapBtn2').addEventListener('click', renderMap);
    $('#cheat2').addEventListener('click', cheatSheet);
    $('#expBtn').addEventListener('click', () => {
      Kit.download(`noc-v-galerii-${P.name.replace(/[^\w-]+/g, '_')}.json`, exportData());
      Kit.toast('Výsledky stažené ✔');
    });
    let alive = true;
    view = { cleanup: () => { alive = false; } };
    (async () => {
      for (const l of LEVELS) {
        const img = $(`[data-expo="${l.id}"]`);
        if (!img || !alive) continue;
        if (!isDone(l.id)) continue;
        const c = codeOf(l);
        const url = await thumb(c.html, c.css, 0.5);
        if (alive) img.src = url;
      }
    })();
  }

  function exportData() {
    const pre = Kit.quizStats(P.pre.answers);
    const post = P.post ? Kit.quizStats(P.post.answers) : null;
    return {
      game: 'Noc v galerii', version: 1, exportedAt: new Date().toISOString(), player: P.name,
      tests: {
        pre: { form: P.pre.form, correct: pre.correct, n: pre.n, dontKnow: pre.dunno, answers: P.pre.answers },
        post: post ? { form: P.post.form, correct: post.correct, n: post.n, dontKnow: post.dunno, answers: P.post.answers } : null,
        normalizedGain: gainOf()
      },
      concepts: Object.keys(G.CONCEPTS).map(c => {
        const a = P.pre.answers.find(x => x.c === c);
        const b = P.post ? P.post.answers.find(x => x.c === c) : null;
        return { concept: c, label: G.CONCEPTS[c], pre: a ? a.correct : null, post: b ? b.correct : null };
      }),
      levels: LEVELS.map(l => {
        const s = P.levels[l.id] || { done: false };
        return Object.assign({ id: l.id, title: l.title, technique: l.concept }, { done: !!s.done, stars: s.stars, matchAtHang: s.hung, bestMatch: s.best, hangs: s.hangs, edits: s.edits, cssChars: s.size, hints: s.hints, solution: s.solution, timeMs: s.timeMs, css: s.code ? s.code.css : null });
      }),
      cssMistakes: P.lint,
      totals: { stars: starCount(), maxStars: MAX_STARS, paintingsDone: doneCount(), galleryClock: clock(), pipetteUsed: P.picked, diffUsed: P.diffUsed },
      badges: P.badges,
      events: P.events
    };
  }

  /* ---------------- lišta ---------------- */
  $('#homeBtn').addEventListener('click', renderIntro);
  $('#mapBtn').addEventListener('click', renderMap);
  $('#soundBtn').addEventListener('click', () => {
    Kit.soundOn = !Kit.soundOn;
    Kit.write('nocVGalerii.sound', Kit.soundOn);
    topStats();
    if (Kit.soundOn) Kit.sound('ok');
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  topStats();
  if (P && P.pre) renderMap(); else renderIntro();
  Painter.supported().then(ok => {
    if (ok) return;
    const d = document.createElement('div');
    d.className = 'unsupported';
    d.setAttribute('role', 'alert');
    d.innerHTML = '<b>Tenhle prohlížeč galerii neukáže.</b> Nedovolí stránce přečíst barvy obrázku vykresleného z HTML (tak se chová třeba Safari), a bez toho nejde porovnat tvoje plátno s katalogem. Otevři hru v Chrome, Edge nebo Firefoxu.';
    document.body.prepend(d);
  });
})();
