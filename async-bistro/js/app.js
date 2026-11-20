/*
 * Async Bistro – aplikace: obrazovky, přehrávání směn (lístky, stanice, časová osa), hvězdy, odznaky, měření pokroku
 */
(function () {
  'use strict';

  const { $, $$, esc } = Kit;
  const C = window.BistroContent;
  const B = window.Bistro;
  const LEVELS = C.LEVELS;
  const LESSONS = C.LESSONS || {};
  const MAX_STARS = LEVELS.length * 3;
  const KEY = 'asyncBistro.v1';
  const app = $('#app');
  const fmt = B.fmtNum;

  let P = Kit.read(KEY, null);
  let view = null;
  Kit.soundOn = Kit.read('asyncBistro.sound', true);

  const BADGES = [
    { id: 'first', icon: '🍳', name: 'První objednávka', desc: 'Dokonči první úroveň' },
    { id: 'oneshot', icon: '🎯', name: 'Na první pokus', desc: 'Vyřeš úroveň hned prvním spuštěním' },
    { id: 'promise', icon: '🤞', name: 'Slib není jídlo', desc: 'Podej Promise místo jídla – a pak to oprav' },
    { id: 'ch1', icon: '☕', name: 'Ranní směna', desc: 'Dokonči kapitolu 1' },
    { id: 'ch2', icon: '🔥', name: 'Polední špička', desc: 'Dokonči kapitolu 2' },
    { id: 'ch3', icon: '🌙', name: 'Večerní provoz', desc: 'Dokonči kapitolu 3' },
    { id: 'fire', icon: '🧯', name: 'Hasič', desc: 'Zachraň spálenou pizzu pomocí try/catch' },
    { id: 'fast', icon: '⚡', name: 'Rychlá kuchyně', desc: 'Dokonči směnu s 5 a víc objednávkami do 10 minut' },
    { id: 'nohints', icon: '🧠', name: 'Bez nápovědy', desc: 'Dokonči celou kapitolu bez nápovědy' },
    { id: 'all', icon: '👨‍🍳', name: 'Šéfkuchař', desc: 'Dokonči všech 12 úrovní' },
    { id: 'perfect', icon: '⭐', name: 'Michelinská hvězda', desc: 'Získej všech 36 hvězd' },
    { id: 'gain', icon: '📈', name: 'Velký skok', desc: 'Normalizovaný zisk v testech aspoň 0,5' }
  ];
  const RANKS = [[0, '🧽', 'Myčka nádobí'], [10, '🔪', 'Pomocný kuchař'], [20, '🍳', 'Kuchař'], [30, '👨‍🍳', 'Šéfkuchař Async Bistra']];
  const WHO = { sef: ['👨‍🍳', 'Bohouš, šéfkuchař'], cisnik: ['🤵', 'Pepa, číšník'] };
  const EMO = {
    'káva': '☕', 'toust': '🥪', 'vajíčko': '🍳', 'polévka': '🍲', 'pizza': '🍕', 'hranolky': '🍟', 'špagety': '🍝', 'burger': '🍔', 'bruschetta': '🥖', 'rizoto': '🍚', 'koláč': '🥧',
    'chléb': '🍞', 'sýr': '🧀', 'rajče': '🍅', 'salát': '🥬', 'maso': '🥩', 'houska': '🥯', 'těstoviny': '🍝', 'omáčka': '🥫', 'rýže': '🍚', 'lanýž': '🍄', 'šunka': '🥓', 'cibule': '🧅'
  };
  const OCOL = ['#1e79b6', '#2b8348', '#9e6800', '#6c4bb4', '#cd3975', '#0f7e7e', '#ac601c', '#5a6b7b', '#6d7910', '#d23a22'];
  const emo = n => EMO[n] || '🍽️';

  /* ---------------- profil ---------------- */
  function newProfile(name) {
    return { v: 1, name, form: Math.random() < 0.5 ? 'A' : 'B', pre: null, post: null, levels: {}, badges: [], events: [], errorTypes: {}, seen: {}, promiseSlip: false, burnsSaved: 0, fastShift: false, created: Date.now() };
  }
  const save = () => { if (P) Kit.write(KEY, P); topStats(); };
  const lState = id => P.levels[id] || (P.levels[id] = {
    done: false, stars: [false, false, false], runs: 0, runsTotal: 0, hints: 0, solution: false, timeMs: 0, code: null,
    firstTry: false, wonAt: null, errors: {}, late: 0, bestEnd: null
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
  const hl = code => Highlight(code, 'js');
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
    if (P.promiseSlip && doneCount() >= 1) award('promise');
    C.CHAPTERS.forEach(ch => { if (chDone(ch)) award('ch' + ch.id); });
    if (P.burnsSaved > 0) award('fire');
    if (P.fastShift) award('fast');
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

  /* ---------------- kuchyně: lístky, stanice, časová osa ---------------- */
  /* rows stanice v časové ose: plotna a kurýři mají dva řádky, dodavatel tolik, kolik jich současně jelo */
  function stationRows(level, res) {
    const rows = [];
    level.stations.forEach(sid => {
      const def = B.STATIONS[sid];
      let n = def.cap;
      if (sid === 'dodavatel') n = Math.max(1, ...((res && res.jobs) || []).filter(j => j.station === sid).map(j => j.slot + 1));
      n = Math.min(n, 3);
      for (let k = 0; k < n; k++) rows.push({ sid, slot: k, label: n > 1 ? `${def.name} ${k + 1}` : def.name, icon: def.icon });
    });
    return rows;
  }
  function kitchen(root, level, sc, res) {
    const R = Object.assign({ start: 12 }, level.rules, sc.rules);
    const orders = (res && res.orders) || sc.orders.map(o => ({ stul: o.stul, jidlo: o.jidlo, limit: o.limit, servedAt: null, status: 'waiting', ok: false, msg: '' }));
    const jobs = (res && res.jobs) || [];
    const T = Math.max(6, (res && res.end) || 0, ...orders.map(o => o.limit)) + 1;
    const rows = stationRows(level, res);
    const pctT = t => `${Math.max(0, Math.min(100, (t / T) * 100))}%`;
    const tick = [1, 2, 5, 10].find(s => T / s <= 12) || 10;
    const oc = i => (i === null || i === undefined ? '#6a747d' : OCOL[i % OCOL.length]);

    root.innerHTML = `
      <div class="tickets" role="list" aria-label="Objednávky">${orders.map((o, i) => `
        <div class="ticket" role="listitem" data-i="${i}" style="--oc:${oc(i)}">
          <span class="t-stul">Stůl ${o.stul}</span>
          <span class="t-dish"><span aria-hidden="true">${emo(o.jidlo)}</span> ${esc(o.jidlo)}</span>
          <span class="t-lim">do ${B.clock(R.start, o.limit)}</span>
          <span class="t-face" aria-hidden="true">🙂</span>
          <span class="t-st"></span>
        </div>`).join('')}
      </div>
      <div class="stations">${level.stations.map(sid => {
        const def = B.STATIONS[sid];
        const slots = Math.min(def.cap, sid === 'dodavatel' ? Math.max(1, ...rows.filter(r => r.sid === sid).map(r => r.slot + 1)) : def.cap);
        return `<div class="stn" data-s="${sid}" style="--slots:${slots}"><div class="st-h"><span class="st-i" aria-hidden="true">${def.icon}</span>${esc(def.name)}<span class="st-q"></span></div>
          <div class="slots">${Array.from({ length: slots }, (_, k) => `<div class="slot" data-k="${k}"><span class="sl-l">volno</span><span class="sl-bar"><i></i></span></div>`).join('')}</div></div>`;
      }).join('')}</div>
      <div class="gantt" style="--rows:${rows.length + 1}">
        <div class="g-labels">${rows.map(r => `<span>${r.icon} ${esc(r.label)}</span>`).join('')}<span>🛎️ Výdej</span></div>
        <div class="g-area">
          <div class="g-grid">${Array.from({ length: Math.floor(T / tick) + 1 }, (_, k) => `<i style="left:${pctT(k * tick)}"><b>${B.clock(R.start, k * tick)}</b></i>`).join('')}</div>
          ${rows.map((r, ri) => `<div class="g-row" data-r="${ri}"></div>`).join('')}
          <div class="g-row serve"></div>
          <div class="g-now"></div>
        </div>
      </div>`;
    const area = $('.g-area', root);
    const rowEls = $$('.g-row', root);
    const bars = [];
    jobs.forEach(j => {
      const ri = rows.findIndex(r => r.sid === j.station && r.slot === Math.min(j.slot, 2));
      if (ri < 0) return;
      const row = rowEls[ri];
      if (j.rejected) {
        const m = document.createElement('span');
        m.className = 'g-rej';
        m.style.left = pctT(j.start);
        m.title = `${B.clock(R.start, j.start)} – kurýr odmítl: žádný volný`;
        m.textContent = '✋';
        row.appendChild(m);
        bars.push({ el: m, j, rej: true });
        return;
      }
      if (j.start > j.queuedAt) {
        const w = document.createElement('span');
        w.className = 'g-wait';
        w.style.left = pctT(j.queuedAt);
        w.style.setProperty('--oc', oc(j.order));
        w.title = `${j.label}: čeká ve frontě ${fmt(j.start - j.queuedAt)} min`;
        row.appendChild(w);
        bars.push({ el: w, j, wait: true });
      }
      const b = document.createElement('span');
      b.className = 'g-bar' + (j.burnt ? ' burnt' : '');
      b.style.left = pctT(j.start);
      b.style.setProperty('--oc', oc(j.order));
      b.title = `${j.label}: ${B.clock(R.start, j.start)}–${B.clock(R.start, j.end)}${j.burnt ? ' (spáleno)' : ''}${j.order !== null && j.order !== undefined ? ` · stůl ${orders[j.order].stul}` : ''}`;
      b.innerHTML = `<span>${j.burnt ? '🔥' : emo(j.label)} ${esc(j.label)}</span>`;
      row.appendChild(b);
      bars.push({ el: b, j });
    });
    const serveRow = $('.g-row.serve', root);
    orders.forEach((o, i) => {
      const d = document.createElement('span');
      d.className = 'g-dl';
      d.style.left = pctT(o.limit);
      d.style.setProperty('--oc', oc(i));
      d.title = `Stůl ${o.stul}: limit ${B.clock(R.start, o.limit)}`;
      serveRow.appendChild(d);
      if (o.servedAt !== null && o.servedAt !== undefined) {
        const m = document.createElement('span');
        m.className = 'g-serve ' + (o.ok ? 'ok' : 'bad');
        m.style.left = pctT(o.servedAt);
        m.style.setProperty('--oc', oc(i));
        m.title = `Stůl ${o.stul}: ${o.msg}`;
        m.textContent = o.ok ? '✔' : '✘';
        serveRow.appendChild(m);
        bars.push({ el: m, serve: o });
      }
    });
    const now = $('.g-now', root);
    const tickets = $$('.ticket', root);
    const stEls = {};
    level.stations.forEach(sid => { stEls[sid] = $(`.stn[data-s="${sid}"]`, root); });
    const FACE = { ok: '😋', late: '😤', wrong: '😕', missing: '😢', closed: '😢', cold: '🥶' };
    const STAMP = { ok: 'Podáno', late: 'Pozdě', wrong: 'Špatně', missing: 'Nic', closed: 'Po zavíračce', cold: 'Vystydlo' };

    function update(t) {
      now.style.left = pctT(t);
      bars.forEach(({ el, j, wait, rej, serve }) => {
        if (serve) { el.hidden = t < serve.servedAt - 1e-9; return; }
        if (rej) { el.hidden = t < j.start - 1e-9; return; }
        if (wait) {
          const end = Math.min(t, j.start);
          el.hidden = t < j.queuedAt - 1e-9 || end <= j.queuedAt;
          el.style.width = `${Math.max(0, ((end - j.queuedAt) / T) * 100)}%`;
          return;
        }
        const end = Math.min(t, j.end);
        el.hidden = t < j.start - 1e-9;
        el.style.width = `${Math.max(0, ((end - j.start) / T) * 100)}%`;
        el.classList.toggle('live', t < j.end && t >= j.start);
      });
      orders.forEach((o, i) => {
        const el = tickets[i];
        const served = o.servedAt !== null && o.servedAt !== undefined && t >= o.servedAt - 1e-9;
        const st = served ? o.status : t > o.limit ? 'over' : 'waiting';
        el.className = `ticket ${st}`;
        $('.t-face', el).textContent = served ? FACE[o.status] || '🙂' : st === 'over' ? '😠' : '🙂';
        $('.t-st', el).textContent = served ? `${STAMP[o.status] || ''} ${B.clock(R.start, o.servedAt)}` : st === 'over' ? `čeká +${fmt(t - o.limit)} min` : '';
        el.title = served ? o.msg : '';
      });
      level.stations.forEach(sid => {
        const el = stEls[sid];
        if (!el) return;
        const mine = jobs.filter(j => j.station === sid && !j.rejected);
        $$('.slot', el).forEach((sl, k) => {
          const j = mine.find(x => Math.min(x.slot, 2) === k && x.start <= t + 1e-9 && t < x.end - 1e-9);
          sl.classList.toggle('busy', !!j);
          sl.classList.toggle('burnt', !!(j && j.burnt && t > j.end - 0.6));
          sl.style.setProperty('--oc', j ? oc(j.order) : 'transparent');
          $('.sl-l', sl).textContent = j ? `${emo(j.label)} ${j.label} · ${fmt(Math.max(0, j.end - t))} min` : 'volno';
          $('.sl-bar i', sl).style.width = j ? `${((t - j.start) / (j.end - j.start)) * 100}%` : '0%';
        });
        const waiting = mine.filter(j => j.queuedAt <= t + 1e-9 && t < j.start - 1e-9).length;
        $('.st-q', el).textContent = waiting ? `+${waiting} čeká` : '';
      });
    }
    return { update, T, R };
  }

  /* přehrávání virtuálního času */
  function makePlayer(hooks) {
    const pl = { t: 0, T: 1, playing: false, speed: 1, raf: 0, last: 0, ended: false };
    const tick = now => {
      if (!pl.playing) return;
      const dt = Math.min(0.1, (now - pl.last) / 1000);
      pl.last = now;
      pl.seek(Math.min(pl.T, pl.t + dt * pl.speed), true);
      if (pl.t >= pl.T) { pl.playing = false; hooks.onState(pl); return; }
      pl.raf = requestAnimationFrame(tick);
    };
    pl.seek = (t, fromPlay) => {
      const before = pl.t;
      pl.t = Math.max(0, Math.min(pl.T, t));
      if (pl.t < pl.T) pl.ended = false;
      hooks.onFrame(pl, before, !!fromPlay);
      if (pl.t >= pl.T && !pl.ended) { pl.ended = true; hooks.onEnd(pl); }
    };
    pl.play = () => {
      if (pl.t >= pl.T) pl.seek(0);
      pl.playing = true;
      pl.last = performance.now();
      cancelAnimationFrame(pl.raf);
      pl.raf = requestAnimationFrame(tick);
      hooks.onState(pl);
    };
    pl.pause = () => { pl.playing = false; cancelAnimationFrame(pl.raf); hooks.onState(pl); };
    pl.stop = () => { pl.playing = false; cancelAnimationFrame(pl.raf); };
    return pl;
  }

  /* ---------------- úvod ---------------- */
  const DEMO = [
    ['7:00', 'kuchyně', 'Bistro otevírá. Kávovar se nahřívá.'],
    ['7:01', 'Pepa', 'Stůl 4: špagety! Stůl 2: burger!'],
    ['7:01', 'kód', 'await Promise.all([plotna("těstoviny"), plotna("omáčka")])'],
    ['7:06', 'kuchyně', '🍔 burger hotový – fritéza, trouba a prkénko jely souběžně'],
    ['7:09', 'kuchyně', '🍝 špagety na stole za 8 minut místo 14'],
    ['7:09', 'host', '😋 „Tohle bylo rychlé!“']
  ];
  function renderIntro() {
    leave();
    crumb([]);
    const cont = P
      ? `<div class="welcome">
           <p>Vítej zpět, <b>${esc(P.name)}</b>.</p>
           <p class="muted">Splněno ${doneCount()} z ${LEVELS.length} úrovní, ★ ${starCount()} z ${MAX_STARS}.</p>
         </div>
         <div class="btn-row"><button class="btn primary big" id="contBtn" data-focus>${P.pre ? 'Pokračovat ve směně' : 'Pokračovat vstupním testem'}</button>
           <button class="btn ghost" id="resetBtn">Začít znovu</button></div>`
      : `<label class="field">Tvoje jméno v kuchyni<input id="name" maxlength="24" autocomplete="nickname" placeholder="např. Bára"></label>
         <div class="btn-row"><button class="btn primary big" id="startBtn">Obléct zástěru</button></div>`;
    app.innerHTML = `
      <section class="screen">
        <div class="intro">
          <div class="intro-copy">
            <h1 class="logo">Async <span>Bistro</span></h1>
            <p class="lead">Vedeš kuchyni, kde se nevaří rukama, ale <b>JavaScriptem</b>. Kávovar, trouba i dvě plotny poslouchají tvoje <code>async</code> funkce. Kdo umí <code>await</code>, <code>Promise.all</code> a <code>try/catch</code>, vaří rychleji než celá konkurence. Časová osa ti ukáže každou minutu, kterou kuchyně zbytečně čekala.</p>
            ${cont}
          </div>
          <div class="intro-visual">
            <div class="pass" aria-hidden="true">
              <div class="rail">${['4 · špagety', '2 · burger', '7 · káva'].map((t, i) => `<span class="mini-ticket" style="--oc:${OCOL[i]}">Stůl ${t}</span>`).join('')}</div>
              <ol class="feed" id="feed"></ol>
            </div>
          </div>
        </div>
        <ol class="steps">
          <li><b>Vstupní test</b><small>10 otázek, asi 3 minuty. Zjistíme, co už o JavaScriptu víš.</small></li>
          <li><b>12 úrovní ve 3 směnách</b><small>Od první kávy přes polední špičku až k večeři pro gastrokritika.</small></li>
          <li><b>Výstupní test a výsledky</b><small>Uvidíš, v čem ses zlepšil(a), dovednost po dovednosti.</small></li>
        </ol>
      </section>`;
    const feed = $('#feed');
    const timers = [];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    DEMO.forEach(([tm, who, text], i) => timers.push(setTimeout(() => {
      feed.insertAdjacentHTML('beforeend', `<li class="${who === 'kód' ? 'code' : ''}"><span class="f-t">${tm}</span><span class="f-w">${esc(who)}</span><span class="f-x">${esc(text)}</span></li>`);
    }, reduce ? 0 : 300 + i * 650)));
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
        const name = $('#name').value.trim() || 'Kuchař';
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
    crumb(pre ? [{ label: 'Vstupní test' }] : [{ label: 'Mapa směn', go: renderMap }, { label: 'Výstupní test' }]);
    app.innerHTML = `
      <section class="screen" id="quizBox">
        <div class="card narrow quiz-intro">
          <span class="pill">${pre ? 'Krok 1 ze 3' : 'Krok 3 ze 3'}</span>
          <h1>${pre ? 'Vstupní test' : 'Výstupní test'}</h1>
          <p class="lead">${pre
            ? 'Než tě pustíme ke sporáku, zjistíme, co už o JavaScriptu víš. Výsledek se nijak nehodnotí, slouží jen k porovnání s koncem hry.'
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
        lang: 'js',
        onDone(answers) {
          view = null;
          P[which] = { form, answers, at: Date.now() };
          logEvent('quiz', { which, form, correct: answers.filter(a => a.correct).length });
          save();
          if (pre) afterPre(); else { checkBadges(); save(); renderResults(); Kit.confetti(['🍕', '🍝', '☕', '★'], ['#e2412b', '#2f8f4e', '#d18a00', '#1f2326']); }
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
      <p>Čeká tě <b>12 úrovní</b>. V každé napíšeš kus JavaScriptu, který řídí kuchyni, a simulátor s ním odehraje celou směnu.</p>
      <ul class="vstats">
        <li class="ok">▶ Spustit směnu (Ctrl+Enter) odehraje všechny směny úrovně. Uvidíš lístky, stanice a časovou osu.</li>
        <li class="ok">🐞 Chyby JavaScriptu ti deník vysvětlí česky a ukáže řádek.</li>
        <li class="ok">★ Hvězdy: za splnění, za nejvýš 3 spuštění a za bonusový úkol.</li>
      </ul>
      <div class="btn-row"><button class="btn primary big" data-play data-focus>Začít úroveň 1</button><button class="btn ghost" data-close>Na mapu</button></div>`);
    $('[data-play]', m).addEventListener('click', () => renderLevel(1));
  }

  /* ---------------- mapa ---------------- */
  function renderMap() {
    leave();
    if (!P || !P.pre) { renderIntro(); return; }
    crumb([{ label: 'Mapa směn' }]);
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
            <h1>Mapa směn</h1>
            <p>${esc(P.name)}, úrovně se odemykají postupně. Každá končí směnou s hosty a projde jen kuchyně, která všechny obslouží včas.</p>
            <div class="meter"><span class="bar"><span class="post" style="width:${Kit.pct(done, LEVELS.length)}%"></span></span>
              <span>${done}/${LEVELS.length} úrovní</span><span class="muted">★ ${starCount()}/${MAX_STARS}</span></div>
          </div>
          <div class="btn-row">
            <button class="btn" id="cheatBtn">📖 Kuchařka</button>
            ${P.post ? '<button class="btn primary" id="resBtn">📊 Výsledky</button>' : ''}
          </div>
        </div>
        ${nextL ? `<div class="next-up">
            <span class="nu-num">${pad2(nextL.id)}</span>
            <div class="nu-text"><small>Další úroveň: ${esc(nextC.title.toLowerCase())}</small><b>${esc(nextL.title)}</b></div>
            <button class="btn primary big" data-l="${nextL.id}">▶ Do kuchyně: úroveň ${nextL.id}</button>
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
                ? `<p>Máš za sebou ${done} úrovní, můžeš si změřit pokrok. ${done < LEVELS.length ? 'Doporučujeme ale nejdřív dohrát všech 12.' : 'Gastrokritik je nadšený, gratulujeme!'}</p>`
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
    const stations = Object.entries(B.STATIONS).filter(([k]) => !['dodavatel', 'kuryr'].includes(k)).map(([k, d]) => `<li><b>${d.icon} ${k}(${k === 'kavovar' ? '' : '…'})</b> ${Object.entries(d.items).map(([n, m]) => `${n} ${m} min`).join(' · ')}${d.cap > 1 ? ` <small>(${d.cap}× najednou)</small>` : ''}</li>`).join('');
    const recipes = Object.keys(B.RECIPES).map(r => `<li><b>${emo(r)} ${r}</b> = ${esc(B.recipeText(r))}</li>`).join('');
    const cm = Kit.modal(`<h2>📖 Kuchařka</h2><p class="muted small">Stanice, recepty a všechno, co ses v úrovních naučil(a).</p>
      <div class="cookbook"><div><h3>Stanice</h3><ul>${stations}<li><b>🚚 dodavatel(…)</b> doba jízdy se mění</li><li><b>🛵 rozvez(objednavka, jidlo)</b> 5 min, kurýři jsou 2</li></ul></div>
      <div><h3>Recepty: sloz(…)</h3><ul>${recipes}</ul></div></div>
      <div class="cheat">${items}</div>`, { cls: 'wide' });
    Kit.$$('[data-lesson]', cm).forEach(btn => btn.addEventListener('click', () => openLesson(LEVELS.find(x => x.id === +btn.dataset.lesson), true)));
  }

  /* ---------------- briefing ---------------- */
  function briefing(l, first, onClose, start) {
    const msgs = l.brief.map(([who, text], i) => `<div class="msg ${who}" style="animation-delay:${first ? 0.25 + i * 0.7 : 0}s"><span class="ava" aria-hidden="true">${WHO[who][0]}</span><div class="bubble"><span class="who">${WHO[who][1]}</span>${md(text)}</div></div>`).join('');
    return Lesson.intro({
      modal: Kit.modal, close: () => Kit.closeModal(), first, animate: first, onClose, start,
      head: `<p class="b-kicker">${chapterOf(l).icon} ${esc(chapterOf(l).title)} · úroveň ${l.id} z ${LEVELS.length}</p><h2>${esc(l.title)}</h2>`,
      story: `<div class="radio">${msgs}</div>`,
      storyLabel: 'Briefing',
      lesson: LESSONS[l.id],
      task: `<div class="b-task"><b>Úkol:</b> ${md(l.task)}</div>`,
      stars: [
        { t: 'Všechny směny', d: 'Kuchyně pustí tvůj kód na několik směn s různými objednávkami. Každý host musí dostat správné jídlo včas.' },
        { t: 'Nejvýš 3 spuštění', d: 'Směnu spusť nejvýš třikrát. Na časové ose pak uvidíš, co se dělo souběžně a kdo čekal.' },
        { t: 'Bonus navíc', d: l.bonus.text }
      ],
      done: 'Jdu vařit 🍳'
    });
  }

  // Z kuchařky vede tlačítko „Zpět do kuchařky“ zpátky do kuchařky (fokus na lekci, ze které hráč přišel). Z úrovně lekci jen zavře.
  function openLesson(l, fromCheat) {
    if (!LESSONS[l.id]) return;
    const m = Lesson.open({ modal: Kit.modal, lesson: LESSONS[l.id], kicker: `Lekce k úrovni ${l.id}: ${l.title}`, back: fromCheat ? 'Zpět do kuchařky' : 'Zpět do kuchyně' });
    const back = fromCheat && Kit.$('.modal-box > .btn-row [data-close]', m);
    if (back) back.addEventListener('click', () => setTimeout(() => {
      cheatSheet();
      const b = Kit.$(`.modal [data-lesson="${l.id}"]`);
      if (b) b.focus();
    }));
  }


  /* ---------------- úroveň ---------------- */
  function renderLevel(id) {
    leave();
    const l = LEVELS.find(x => x.id === id);
    if (!l || !unlocked(id)) { renderMap(); return; }
    const ch = chapterOf(l);
    const ls = lState(id);
    const ses = { runs: 0, fails: 0, solution: false, t0: performance.now(), timers: [], running: false, res: null, sel: 0, speedFixed: null };
    const later = (f, ms) => ses.timers.push(setTimeout(f, ms));
    crumb([{ label: 'Mapa směn', go: renderMap }, { label: ch.title }, { label: `${l.id}. ${l.title}` }]);
    const prev = LEVELS.find(x => x.id === id - 1);
    const next = LEVELS.find(x => x.id === id + 1);
    const R = Object.assign({ start: 12 }, l.rules);

    /* pravidla a kuchařka úrovně */
    const used = new Set([...(l.solution.match(/'([^']+)'/g) || []).map(x => x.slice(1, -1)), ...l.shifts.flatMap(s => s.orders.map(o => o.jidlo))]);
    const chips = l.stations.map(sid => {
      const d = B.STATIONS[sid];
      if (sid === 'dodavatel') return `<li><span aria-hidden="true">${d.icon}</span><code>dodavatel('lanýž')</code> jede různě dlouho</li>`;
      if (sid === 'kuryr') return `<li><span aria-hidden="true">${d.icon}</span><code>rozvez(objednavka, jidlo)</code> 5 min, kurýři 2</li>`;
      const mine = Object.entries(d.items).filter(([n]) => used.has(n));
      const items = (mine.length ? mine : Object.entries(d.items)).map(([n, m]) => `${n} ${m}′`).join(' · ');
      return `<li><span aria-hidden="true">${d.icon}</span><code>${sid}(${sid === 'kavovar' ? '' : '…'})</code> ${esc(items)}${d.cap > 1 ? ` · ${d.cap}× najednou` : ''}</li>`;
    });
    (l.recipes || []).forEach(r => chips.push(`<li class="recipe"><span aria-hidden="true">${emo(r)}</span>${esc(r)} = ${esc(B.recipeText(r))}</li>`));
    if (R.together) chips.push('<li class="rule"><span aria-hidden="true">🍽️</span>celý stůl jí najednou</li>');
    if (R.freshWithin) chips.push(`<li class="rule"><span aria-hidden="true">🍄</span>čerstvý lanýž, když dorazí do ${R.freshWithin} min</li>`);

    const file = 'bistro.js';
    app.innerHTML = `
      <section class="ws-screen fit">
        <header class="mbar">
          <span class="mb-num" aria-label="Úroveň ${l.id}">${pad2(l.id)}</span>
          <div class="mb-text"><span class="mb-where">${ch.icon} ${esc(ch.title)}<code class="mb-concept" title="Co se v úrovni procvičuje">${esc(l.concept)}</code></span><h1>${esc(l.title)}</h1></div>
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
            <ul class="rules" aria-label="Stanice a recepty">${chips.join('')}</ul>
            <p class="bonus-line"><span class="bl-star" aria-hidden="true">★</span> <b>Bonus navíc:</b> ${md(l.bonus.text)}</p>
          </div>
          <div class="brief-actions">
            <button class="btn small" id="briefBtn">📣 Briefing</button>
            <button class="btn small" id="lessonBtn" title="Nová věc z async JavaScriptu na příkladu s časovou osou">📖 Lekce</button>
            <button class="btn small" id="hintBtn"></button>
            <button class="btn small ghost" id="tourBtn" title="Průvodce obrazovkou: co je kde a k čemu to slouží">❔ Průvodce</button>
            <button class="btn small ghost" id="solBtn" hidden>👀 Ukázat řešení</button>
          </div>
          <div class="hints" id="hints"></div>
        </section>
        <div class="ws wide-left">
          <div class="col kitchen-col">
            <section class="panel kitchen" aria-label="Kuchyně">
              <div class="k-head">
                <div class="fl-tabs" id="tabs" role="tablist" aria-label="Směny">${l.shifts.map((s, i) => `<button class="fl-tab ${i ? '' : 'on'}" role="tab" aria-selected="${i ? 'false' : 'true'}" data-f="${i}">${esc(s.name)}<i class="st" aria-hidden="true"></i></button>`).join('')}</div>
                <span class="clock" id="clock" aria-label="Čas v kuchyni">${B.clock(R.start, 0)}</span>
                <div class="fl-ctrl">
                  <button class="icon-btn" id="playBtn" title="Přehrát / pozastavit" aria-label="Přehrát">▶</button>
                  <button class="icon-btn" id="replayBtn" title="Přehrát znovu od začátku" aria-label="Přehrát znovu">↺</button>
                  <div class="speed" role="group" aria-label="Rychlost přehrávání">${[1, 2, 4, 8].map(s => `<button data-s="${s}">${s}×</button>`).join('')}</div>
                  <button class="icon-btn" id="endBtn" title="Skočit na konec směny" aria-label="Na konec">⏭</button>
                </div>
              </div>
              <div class="k-body" id="kbody"></div>
              <input class="scrub" id="scrub" type="range" min="0" max="1000" value="0" aria-label="Čas směny">
            </section>
          </div>
          <div class="col">
            <section class="panel code-pane">
              <div class="file-head"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>${file}<span class="sp"></span><button class="btn small ghost" id="resetBtn" title="Vrátit výchozí kód úrovně">↺ Výchozí kód</button></div>
              <div id="editor"></div>
              <details class="snips" data-snips="asyncBistro.snips" ${Kit.snipsOpen('asyncBistro.snips', false) ? 'open' : ''}><summary>🧩 Úryvky kódu <small>když nevíš, jak něco zapsat</small></summary><div class="palette" id="palette"></div></details>
              <div class="runbar">
                <button class="btn go big" id="runBtn">▶ Spustit směnu <kbd>Ctrl+Enter</kbd></button>
              </div>
              <div class="status" id="status" aria-live="polite"></div>
              <div class="results">
                <div class="flights-sum" id="fsum"></div>
                <div class="terminal" id="term"></div>
              </div>
            </section>
          </div>
        </div>
      </section>`;

    const ed = new CodeEditor($('#editor'), { lang: 'js', tab: 2, onRun: () => run(), label: 'Editor ' + file });
    ed.value = ls.code != null ? ls.code : l.starter;

    const SYMS = ['await ', '=>', '()', '[]', '{}', '`${}`'];
    $('#palette').innerHTML = l.palette.map((p, i) => `<button class="chip" data-p="${i}">${esc(p.replace(/\|/g, ''))}</button>`).join('') +
      SYMS.map((x, i) => `<button class="chip sym" data-s="${i}">${esc(x.trim())}</button>`).join('');
    $$('#palette [data-p]').forEach(b => b.addEventListener('click', () => {
      const p = l.palette[+b.dataset.p];
      if (/\{\s*$/.test(p)) ed.insertSnippet(p + '\n  |\n}');
      else ed.insertSnippet(p.includes('|') ? p : p + '|', true);
      Kit.sound('type');
    }));
    $$('#palette [data-s]').forEach(b => b.addEventListener('click', () => {
      const x = SYMS[+b.dataset.s];
      const map = { '()': '(|)', '[]': '[|]', '{}': '{ | }', '`${}`': '`${|}`', '=>': ' => |' };
      ed.insertSnippet(map[x] || x + '|', true);
      Kit.sound('type');
    }));
    let saveT = 0;
    ed.onChange(() => { clearTimeout(saveT); saveT = setTimeout(() => { ls.code = ed.value; save(); }, 600); });

    /* ---------- přehrávání směny ---------- */
    let K = null;
    const pl = makePlayer({
      onFrame(p, before, fromPlay) {
        if (!K) return;
        K.update(p.t);
        $('#clock').textContent = B.clock(K.R.start, Math.floor(p.t + 1e-6));
        if (!ses.scrubbing) $('#scrub').value = Math.round((p.t / p.T) * 1000);
        // zvuky při přehrávání: podání a spálení
        const r = ses.res && ses.res.shifts[ses.sel];
        if (fromPlay && r && !ses.muted) {
          r.orders.forEach(o => { if (o.servedAt !== null && o.servedAt > before && o.servedAt <= p.t) Kit.sound(o.ok ? 'coin' : 'fail'); });
          r.jobs.forEach(j => { if (j.burnt && j.end > before && j.end <= p.t) Kit.sound('error'); });
        }
      },
      onEnd() {
        const r = ses.res && ses.res.shifts[ses.sel];
        if (!r) return;
        banner(r);
        if (ses.onPlayEnd) { const f = ses.onPlayEnd; ses.onPlayEnd = null; f(); }
      },
      onState(p) {
        $('#playBtn').textContent = p.playing ? '❚❚' : '▶';
        $('#playBtn').setAttribute('aria-label', p.playing ? 'Pozastavit' : 'Přehrát');
        $$('.speed [data-s]').forEach(b => b.classList.toggle('on', +b.dataset.s === p.speed));
      }
    });
    function banner(r) {
      let b = $('#kbanner');
      if (!b) { b = document.createElement('div'); b.id = 'kbanner'; b.className = 'k-banner'; ($('#kbody .stations') || $('#kbody')).appendChild(b); }
      if (!r) { b.className = 'k-banner'; b.innerHTML = ''; return; }
      b.className = 'k-banner show ' + (r.ok ? 'ok' : 'bad');
      b.innerHTML = `<b>${r.ok ? 'Směna zvládnutá' : 'Směna se nepovedla'}</b><span>${esc(r.msg)}</span>`;
    }
    function showShift(i, play) {
      ses.sel = i;
      $$('#tabs .fl-tab').forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-selected', String(k === i)); });
      const sc = l.shifts[i];
      const r = ses.res && ses.res.shifts[i] && !ses.res.error && !ses.res.missing ? ses.res.shifts[i] : null;
      K = kitchen($('#kbody'), l, sc, r);
      banner(null);
      pl.stop();
      pl.T = K.T;
      pl.t = 0;
      pl.ended = false;
      const want = (r ? Math.max(r.end, r.servedAll || 0) : K.T) / 6;
      pl.speed = ses.speedFixed || [1, 2, 4, 8].find(s => s >= want) || 8;
      pl.seek(0);
      if (r && play) pl.play(); else pl.pause();
      if (!r) { pl.T = K.T; }
      renderLog();
    }
    $$('#tabs .fl-tab').forEach(t => t.addEventListener('click', () => { Kit.sound('click'); ses.onPlayEnd = null; showShift(+t.dataset.f, true); renderSummary(); }));
    $('#playBtn').addEventListener('click', () => { if (!ses.res) return; if (pl.playing) pl.pause(); else pl.play(); });
    $('#replayBtn').addEventListener('click', () => { if (!ses.res) return; banner(null); pl.seek(0); pl.play(); });
    $('#endBtn').addEventListener('click', () => { pl.pause(); ses.muted = true; pl.seek(pl.T); ses.muted = false; });
    $$('.speed [data-s]').forEach(b => b.addEventListener('click', () => { ses.speedFixed = +b.dataset.s; pl.speed = ses.speedFixed; $$('.speed [data-s]').forEach(x => x.classList.toggle('on', x === b)); }));
    const scrub = $('#scrub');
    scrub.addEventListener('input', () => { ses.scrubbing = true; pl.pause(); ses.muted = true; pl.seek((scrub.value / 1000) * pl.T); ses.muted = false; if (pl.t < pl.T) banner(null); });
    scrub.addEventListener('change', () => { ses.scrubbing = false; });

    /* ---------- deník a souhrn ---------- */
    const term = $('#term');
    function errBlock(e) {
      const loc = e.line ? `Řádek ${e.line}` : '';
      return `<div class="err">✘ ${loc ? loc + ': ' : ''}${esc(e.text)}</div>` +
        (e.czech ? `<div class="explain"><b>Co to znamená:</b> ${esc(e.czech)}${e.line ? ` <button class="line-link" data-line="${e.line}">ř. ${e.line}</button>` : ''}</div>` : '');
    }
    const prompt = cmd => `<div class="prompt">bistro@kuchyne:~$ <b>${esc(cmd)}</b></div>`;
    function renderLog() {
      const r = ses.res;
      if (!r) { term.innerHTML = prompt(`node ${file}`) + '<div class="out muted">Směna zatím neběžela.</div>'; return; }
      let html = prompt(`node ${file}`);
      if (r.error && (r.missing || r.shifts[0].reason === 'syntax')) { term.innerHTML = html + errBlock(r.error); bindLines(); return; }
      if (r.missing) { term.innerHTML = html + `<div class="err">✘ V kódu chybí funkce ${esc(r.missing)}(). Kuchyně ji volá – nepřejmenoval(a) jsi ji?</div>`; return; }
      const s = r.shifts[ses.sel];
      if (!s) { term.innerHTML = html; return; }
      html += `<div class="log-h">Deník: ${esc(s.name)}</div>`;
      html += s.log.map(([t, text, kind]) => `<div class="lg ${kind}"><span class="lt">${B.clock(s.start, t)}</span>${kind === 'log' ? '<span class="pr">log</span> ' : ''}${esc(text)}</div>`).join('');
      if (s.logCut) html += `<div class="lg info">… a dalších ${s.logCut} řádků</div>`;
      html += `<div class="lg ${s.ok ? 'ok' : 'bad'}">${s.ok ? '✔' : '✘'} ${esc(s.msg)}${s.detail ? ` – ${esc(s.detail)}` : ''}</div>`;
      if (s.error) html += errBlock(s.error);
      term.innerHTML = html;
      bindLines();
    }
    function bindLines() { $$('#term [data-line]').forEach(b => b.addEventListener('click', () => ed.goToLine(+b.dataset.line))); }
    function renderSummary() {
      const r = ses.res;
      const fsum = $('#fsum');
      if (!r || r.missing || (r.error && r.shifts[0] && r.shifts[0].reason === 'syntax')) { fsum.innerHTML = ''; return; }
      fsum.innerHTML = r.shifts.map((s, i) => {
        const stats = [`${s.orders.filter(o => o.ok).length}/${s.orders.length} stolů`];
        if (s.servedAll) stats.push(`poslední ${B.clock(s.start, s.servedAll)}`);
        if (s.burnt) stats.push(`spáleno ${s.burnt}×`);
        if (s.rejected) stats.push(`odmítnutý kurýr ${s.rejected}×`);
        return `<button class="fsum ${s.ok ? 'ok' : 'bad'} ${i === ses.sel ? 'on' : ''}" data-f="${i}" title="${esc(s.msg + (s.detail ? ' – ' + s.detail : ''))}"><span class="st">${s.ok ? '✔' : '✘'}</span><b>${esc(s.name)}</b><span class="m">${esc(s.msg)}</span><small>${esc(stats.join(' · '))}</small></button>`;
      }).join('');
      $$('#fsum [data-f]').forEach(b => b.addEventListener('click', () => { ses.onPlayEnd = null; showShift(+b.dataset.f, true); renderSummary(); }));
      $$('#tabs .fl-tab').forEach((t, i) => { const s = r.shifts[i]; t.querySelector('.st').textContent = s ? (s.ok ? '✔' : '✘') : ''; t.classList.toggle('ok', !!s && s.ok); t.classList.toggle('bad', !!s && !s.ok); });
    }

    function goals() {
      const runsNow = ls.done ? ses.runs : ls.runs;
      $('#goals').innerHTML = Kit.goals([
        { got: ls.stars[0], text: 'Všechny směny', title: 'Hvězda za zvládnutí všech směn' },
        { got: ls.stars[1], text: 'Nejvýš 3 spuštění', val: `${runsNow}/3`, title: `Hvězda za vyřešení nejvýš na 3 spuštění (${ls.done ? 'teď' : 'zatím'} ${runsNow})` },
        { got: ls.stars[2], text: 'Bonus', title: 'Bonus navíc: ' + l.bonus.text.replace(/`/g, '') }
      ]);
    }
    const bonusLine = `Bonusová hvězda: ${esc(l.bonus.text)}`;
    Kit.status($('#status'), 'idle', ls.done ? 'Úroveň je splněná. Zkus získat všechny hvězdy.' : 'Napiš kód a spusť směnu', ls.done ? bonusLine : 'Ctrl+Enter spustí směnu. Časová osa pak ukáže, která stanice kdy vařila a na co kdo čekal.');

    /* ---------- spuštění ---------- */
    async function run() {
      if (ses.running) return;
      ses.running = true;
      $('#runBtn').disabled = true;
      ed.clearMarks();
      pl.pause();
      Kit.status($('#status'), 'run', 'Kuchyně vaří…');
      try { await execute(); } catch (e) { console.error(e); Kit.status($('#status'), 'bad', 'Simulace selhala', esc(e.message)); } finally { ses.running = false; $('#runBtn').disabled = false; }
    }

    async function execute() {
      const code = ed.value;
      ses.runs++;
      if (!ls.done) ls.runs++;
      ls.runsTotal++;
      ls.code = code;
      const res = await B.runLevel(l, code);
      ses.res = res;
      res.errorTypes.forEach(t => { ls.errors[t] = (ls.errors[t] || 0) + 1; P.errorTypes[t] = (P.errorTypes[t] || 0) + 1; });
      ls.late += res.shifts.reduce((n, s) => n + s.orders.filter(o => o.status === 'late').length, 0);
      if (res.shifts.some(s => s.error && /Promise/.test(s.error.msg || ''))) ses.promiseSlip = true;
      if (res.allPass) {
        ls.bestEnd = Math.min(ls.bestEnd === null ? Infinity : ls.bestEnd, Math.max(...res.shifts.map(s => s.servedAll)));
        if (ses.promiseSlip) P.promiseSlip = true;
        if (res.shifts.some(s => s.burnt && s.ok)) P.burnsSaved++;
        if (res.shifts.some(s => s.ok && s.orders.length >= 5 && s.servedAll <= 10)) P.fastShift = true;
      }
      logEvent('run', { level: l.id, passed: res.passed, total: res.total, error: res.error ? res.error.type : null, reasons: res.shifts.map(s => s.reason) });

      renderSummary();
      const firstErr = res.error || (res.shifts.find(s => s.error && s.error.line) || {}).error;
      if (firstErr && firstErr.line) ed.markError(firstErr.line);

      if (res.error && res.shifts[0] && res.shifts[0].reason === 'syntax') {
        Kit.status($('#status'), 'bad', `Chyba v zápisu kódu${res.error.line ? ` na řádku ${res.error.line}` : ''}`, esc(res.error.czech || res.error.text));
        showShift(0, false);
      } else if (res.missing) {
        Kit.status($('#status'), 'bad', `V kódu chybí funkce ${esc(res.missing)}()`, 'Kuchyně ji volá. Nepřejmenoval(a) jsi ji, nebo jsi nesmazal(a) řádek s async function?');
        showShift(0, false);
      } else {
        const badI = res.shifts.findIndex(s => !s.ok);
        if (res.allPass) Kit.status($('#status'), 'ok', `Všechny směny zvládnuté (${res.passed}/${res.total})`, res.bonus ? 'Bonus splněn, máš všechno.' : 'Bonus zatím ne. ' + bonusLine);
        else { const s = res.shifts[badI]; Kit.status($('#status'), 'bad', `${esc(s.name)}: ${esc(s.msg)}`, esc(s.detail || (s.error && s.error.czech) || '')); }
        if (res.allPass) ses.onPlayEnd = () => onWin(res);
        showShift(badI >= 0 ? badI : 0, true);
        renderSummary();
      }
      if (!res.allPass) onFail(res);
      save();
    }

    function onFail(res) {
      ses.fails++;
      if (res.error) Kit.sound(/Syntax/.test(res.error.type) ? 'error' : 'fail');
      if (ses.fails >= 2 && ls.hints < l.hints.length) Kit.toast('💡 Zasekl(a) ses? Zkus nápovědu nad kuchyní.', 2600);
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
      later(() => victory(got, before, runsUsed, res, badges), 600);
    }

    function victory(got, before, runsUsed, res, badges) {
      const orders = res.shifts.reduce((n, s) => n + s.orders.length, 0);
      /* hodnocení: u každé hvězdy věta, co se povedlo, a u chybějící, jak ji získat */
      function starRows() {
        const solCode = `<pre class="code">${hl(l.solution)}</pre>`;
        const tip = Kit.bonusTip(l.hints);
        const rows = [
          { got: true, title: 'Všechny směny zvládnuté', text: `Směny: ${res.passed} z ${res.total}, obslouženo ${orders} ${orders === 1 ? 'hosta' : 'hostů'}. Poslední jídlo odešlo v ${res.shifts.map(s => B.clock(s.start, s.servedAll)).join(', ')}.` },
          Kit.runsStar({ runs: runsUsed, limit: 3, solution: ses.solution, title: 'Nejvýš 3 spuštění', did: 'Směnu jsi spustil(a)', retry: 'Zkusit znovu' }),
          got[2]
            ? { got: true, title: 'Bonus navíc', text: `${md(l.bonus.text)}. Povedlo se!` }
            : ses.solution
            ? { got: ls.stars[2], title: 'Bonus navíc', text: 'Se vzorovým řešením se bonusová hvězda nepočítá.' + (ls.stars[2] ? ' Hvězdu ale už máš z dřívějška.' : ''), how: `Klikni na <b>Zkusit znovu</b> a vyřeš to po svém, i s bonusem: ${md(l.bonus.text)}` }
            : { got: ls.stars[2], title: 'Bonus navíc', text: `Tentokrát ne. Bonus chtěl: ${md(l.bonus.text)}.${ls.stars[2] ? ' Hvězdu ale už máš z dřívějška.' : ''}`, how: `<b>Jak na to:</b> ${l.bonus.how ? md(l.bonus.how) + (l.bonus.example ? `<pre class="code">${hl(l.bonus.example)}</pre>` : '') : (tip ? md(tip) : 'Vzorové řešení bonus splňuje, porovnej ho se svým kódem.')}` }
        ];
        return Kit.starReport(rows) + Kit.solutionBox(`<p>Celé vzorové řešení. Tvoje řešení může vypadat jinak, důležité je, že všechny směny zvládneš.</p>${solCode}`, false);
      }
      const mdl = Kit.modal(`
        <div class="victory">
          <div class="granted">${l.id === LEVELS.length ? '⭐ Pět hvězd od kritika' : '🛎️ Objednávky vyřízeny'}</div>
          <div class="big-stars">${got.map((g, i) => `<i class="${ls.stars[i] ? 'on' : ''} ${ls.stars[i] && !before[i] ? 'new' : ''}" style="animation-delay:${0.15 + i * 0.25}s">★</i>`).join('')}</div>
          ${starRows()}
          <div class="reward">🧾 ${esc(l.reward)}</div>
          <div class="learn"><b>📖 Kuchařka: ${esc(l.concept)}</b><p>${md(l.learn[0])}</p><pre class="code">${hl(l.learn[1])}</pre></div>
          <div class="btn-row center">
            ${next ? '<button class="btn primary big" data-next data-focus>Další úroveň</button>'
              : (P.post ? '<button class="btn primary big" data-res data-focus>📊 Výsledky</button>' : '<button class="btn primary big" data-post data-focus>Výstupní test</button>')}
            <button class="btn" data-retry>↺ Zkusit znovu</button>
            <button class="btn ghost" data-map>🗺️ Mapa</button>
          </div>
        </div>`, { cls: 'win' });
      got.forEach((g, i) => { if (ls.stars[i]) setTimeout(() => Kit.sound('star'), 300 + i * 250); });
      if (got.every(Boolean) || l.id === LEVELS.length) Kit.confetti(['🍕', '🍝', '☕', '★', '🍔'], ['#e2412b', '#2f8f4e', '#d18a00', '#1f2326']);
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
    showShift(0, false);
    const focusEd = () => { if (window.matchMedia('(min-width: 1100px)').matches) { ed.ta.setSelectionRange(0, 0); ed.ta.focus({ preventScroll: true }); } };
    /* průvodce obrazovkou: poprvé se spustí sám, pak tlačítkem ❔ */
    const tourSteps = () => [
      { el: '.brief-strip .bs-text', title: 'Zadání', text: 'Co má kuchyně uvařit, jaké stanice máš a jak dlouho na nich co trvá. Pod tím je <b>bonus navíc</b> za třetí hvězdu.' },
      { el: '#kbody', title: 'Kuchyně', text: 'Stoly s objednávkami, stanice a časová osa. Po spuštění uvidíš, kdy která stanice vařila, kdo na co čekal a kdy jídlo dorazilo ke stolu.' },
      { el: '.k-head', title: 'Přehrávání směny', text: 'Směnu si přehraješ znovu, zrychlíš ji nebo skočíš na konec. Když má úroveň víc směn, přepínáš je záložkami.' },
      { el: '#editor', title: 'Tvůj kód', text: 'Sem píšeš JavaScript. Stanice vrací sliby (Promise): <code>await</code> počká, až je jídlo hotové. Co vypíšeš přes <code>console.log</code>, uvidíš v deníku i s časem.' },
      { el: '#runBtn', title: 'Spustit směnu', text: 'Kuchyně začne vařit podle tvého kódu (nebo Ctrl+Enter). Na hvězdu stačí nejvýš 3 spuštění.' },
      { el: '.results', title: 'Deník kuchyně', text: 'Co se pokazilo a kdy, chyby JavaScriptu vysvětlené česky s číslem řádku a tvoje výpisy z <code>console.log</code>.' },
      { el: '#goals', title: 'Tři hvězdy', text: 'Všechny směny, nejvýš 3 spuštění a bonus. Úroveň můžeš kdykoli zopakovat a hvězdy dobrat.' },
      { el: '.brief-strip .brief-actions', title: 'Když nevíš kudy kam', text: '📖 <b>Lekce</b> vysvětlí novou věc na příkladu, který si spustíš a uvidíš na časové ose. 💡 <b>Nápověda</b> radí postupně. Po všech nápovědách a třech pokusech se ukáže i řešení, ale jen za 1 hvězdu. 📣 Briefing znovu ukáže šéfa kuchyně a ❔ Průvodce tuhle prohlídku.' }
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
        pl.stop();
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
    crumb([{ label: 'Mapa směn', go: renderMap }, { label: 'Výsledky' }]);
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
    const late = LEVELS.reduce((n, l) => n + (st(l.id).late || 0), 0);
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
            <h2>Jak se ti vařilo</h2>
            <div class="stat-row">
              <div class="stat"><b>${firstTry}</b><small>úrovní na 1. pokus</small></div>
              <div class="stat"><b>${Kit.fmt(avgRuns)}</b><small>spuštění na úroveň</small></div>
              <div class="stat"><b>${hints}</b><small>nápověd</small></div>
              <div class="stat"><b>${late}</b><small>jídel podaných pozdě</small></div>
              <div class="stat"><b>${fmtTime(time)}</b><small>čas do splnění</small></div>
            </div>
            <div class="table-wrap"><table class="tbl">
              <thead><tr><th>Úroveň</th><th>★</th><th>Spuštění</th><th>Nápovědy</th><th>Pozdě</th><th>Čas</th></tr></thead>
              <tbody>${LEVELS.map(l => {
                const s = st(l.id);
                return `<tr><td>${l.id}. ${esc(l.title)}</td><td>${s.done ? '★'.repeat(s.stars.filter(Boolean).length) : '–'}</td>
                  <td>${s.done ? s.runs : s.runsTotal ? s.runsTotal + ' (nesplněno)' : '–'}</td><td>${s.hints || 0}${s.solution ? ' + řešení' : ''}</td>
                  <td>${s.late || '–'}</td><td>${s.done ? fmtTime(s.timeMs) : '–'}</td></tr>`;
              }).join('')}</tbody></table></div>
            <p class="small muted" style="margin-bottom:.2rem">Chyby JavaScriptu, které jsi potkal(a) a překonal(a):</p>
            <div class="errlist">${errs.length ? errs.map(([t, n]) => `<span><b>${esc(t === 'NekonečnýCyklus' ? 'nekonečný cyklus' : t)}</b> ×${n}</span>`).join('') : '<span>žádné – čistá práce!</span>'}</div>
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
          <button class="btn ghost" id="cheat2">📖 Kuchařka</button>
        </div>
      </section>`;
    $('#mapBtn2').addEventListener('click', renderMap);
    $('#cheat2').addEventListener('click', cheatSheet);
    $('#expBtn').addEventListener('click', () => {
      Kit.download(`async-bistro-${P.name.replace(/[^\w-]+/g, '_')}.json`, exportData());
      Kit.toast('Výsledky staženy ✔');
    });
  }

  function exportData() {
    const pre = Kit.quizStats(P.pre.answers);
    const post = P.post ? Kit.quizStats(P.post.answers) : null;
    return {
      game: 'Async Bistro', version: 1, exportedAt: new Date().toISOString(), player: P.name,
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
      totals: { stars: starCount(), maxStars: MAX_STARS, levelsDone: doneCount(), burnsSaved: P.burnsSaved },
      badges: P.badges,
      events: P.events
    };
  }

  /* ---------------- lišta ---------------- */
  $('#homeBtn').addEventListener('click', renderIntro);
  $('#mapBtn').addEventListener('click', renderMap);
  $('#soundBtn').addEventListener('click', () => {
    Kit.soundOn = !Kit.soundOn;
    Kit.write('asyncBistro.sound', Kit.soundOn);
    topStats();
    if (Kit.soundOn) Kit.sound('ok');
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  topStats();
  if (P && P.pre) renderMap(); else renderIntro();
})();
