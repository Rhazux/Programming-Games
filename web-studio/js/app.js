/*
 * Web Studio Tycoon – aplikace: studio, zakázky, peníze, vybavení, měření pokroku
 */
(function () {
  'use strict';

  const { $, $$, esc } = Kit;
  const S = window.Studio;
  const C = window.StudioContent;
  const ORDERS = C.ORDERS;
  const LESSONS = C.LESSONS || {};
  const MAX_STARS = ORDERS.length * 3;
  const KEY = 'webStudioTycoon.v1';
  const CLEAN_BONUS = 100;
  const HINT_PRICE = 100;
  const app = $('#app');

  let P = Kit.read(KEY, null);
  let view = null;
  Kit.soundOn = Kit.read('webStudioTycoon.sound', true);

  const SHOP = [
    { id: 'kytka', icon: '🪴', name: 'Kytka do kanceláře', price: 200, desc: 'Čistě pro radost – kancelář hned vypadá líp.' },
    { id: 'kavovar', icon: '☕', name: 'Kávovar', price: 600, desc: 'Konzultace se seniorem jsou o polovinu levnější.' },
    { id: 'kocka', icon: '🐈', name: 'Kancelářská kočka', price: 700, desc: 'Přijde pogratulovat k dokončené zakázce.' },
    { id: 'monitor', icon: '🖥️', name: 'Druhý monitor', price: 900, desc: 'Náhled webu se zobrazí ve větším okně.' },
    { id: 'neon', icon: '💡', name: 'Neonové logo', price: 1200, desc: 'Logo studia v liště začne svítit.' },
    { id: 'cena', icon: '🏆', name: 'Cena Web roku', price: 3000, desc: 'Vrchol kariéry. Vystav si ji v kanceláři.' }
  ];
  const LEVELS = [[0, '🚗', 'Garážové studio'], [9, '🏢', 'Malá kancelář'], [18, '🏙️', 'Agentura'], [30, '🌟', 'Digitální agentura roku']];
  const BADGES = [
    { id: 'first', icon: '🏁', name: 'První zakázka', desc: 'Dokonči první zakázku' },
    { id: 'oneshot', icon: '🎯', name: 'Napoprvé', desc: 'Splň zakázku hned prvním testem' },
    { id: 'clean', icon: '🧹', name: 'Čistý kód', desc: 'Odevzdej 3 zakázky bez chyb a varování' },
    { id: 'wishes', icon: '🎁', name: 'Splněná přání', desc: 'Splň 6 přání navíc' },
    { id: 'floor1', icon: '🧱', name: 'HTML řemeslník', desc: 'Dokonči přízemí' },
    { id: 'floor2', icon: '⚡', name: 'Pán událostí', desc: 'Dokonči 1. patro' },
    { id: 'floor3', icon: '🧠', name: 'Datový mág', desc: 'Dokonči 2. patro' },
    { id: 'debug', icon: '🐞', name: 'Lovec chyb', desc: 'Oprav chybu v JavaScriptu a zakázku splň' },
    { id: 'shopper', icon: '🛍️', name: 'Investor', desc: 'Kup do studia 3 věci' },
    { id: 'rich', icon: '💰', name: 'Boháč', desc: 'Vydělej celkem 10 000 Kč' },
    { id: 'perfect', icon: '🌟', name: 'Studio snů', desc: 'Získej všech 36 hvězd' },
    { id: 'gain', icon: '📈', name: 'Velký skok', desc: 'Normalizovaný zisk v testech aspoň 0,5' }
  ];

  /* ---------------- profil ---------------- */
  function newProfile(studio) {
    return { v: 1, studio, form: Math.random() < 0.5 ? 'A' : 'B', pre: null, post: null, orders: {}, money: 300, earned: 0, spent: 0, upgrades: [], badges: [], events: [], jsErrors: {}, seen: {}, created: Date.now() };
  }
  const save = () => { if (P) Kit.write(KEY, P); topStats(); };
  const oState = id => P.orders[id] || (P.orders[id] = {
    done: false, stars: [false, false, false], runs: 0, runsTotal: 0, hints: 0, solution: false, timeMs: 0, code: null,
    firstTry: false, wonAt: null, paid: { base: false, wish: false, clean: false }, htmlWarnRuns: 0, jsErrRuns: 0, bestPassed: 0
  });
  const isDone = id => !!(P && P.orders[id] && P.orders[id].done);
  const unlocked = id => id === 1 || isDone(id - 1);
  const starCount = () => (P ? Object.values(P.orders).reduce((n, s) => n + s.stars.filter(Boolean).length, 0) : 0);
  const doneCount = () => ORDERS.filter(o => isDone(o.id)).length;
  const has = id => !!(P && P.upgrades.includes(id));
  const level = () => LEVELS.filter(l => starCount() >= l[0]).pop();
  const gainOf = () => (P && P.pre && P.post ? Kit.gain(Kit.quizStats(P.pre.answers).ratio, Kit.quizStats(P.post.answers).ratio) : null);
  const kc = n => `${Math.round(n).toLocaleString('cs-CZ')} Kč`;
  const fmtTime = ms => { const s = Math.round((ms || 0) / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`; };
  const md = s => esc(s).replace(/&lt;(\/?[a-z0-9]+)&gt;/gi, '<code>&lt;$1&gt;</code>');
  const wmd = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
  const hintPrice = () => (has('kavovar') ? HINT_PRICE / 2 : HINT_PRICE);
  const wishBonus = o => Math.round(o.reward / 2);
  function logEvent(type, data) {
    P.events.push(Object.assign({ t: Date.now(), type }, data));
    if (P.events.length > 600) P.events.splice(0, P.events.length - 600);
  }
  function jsErrCategory(msg) {
    const m = /(ReferenceError|TypeError|SyntaxError|RangeError|Error)/.exec(msg || '');
    if (/nekonečný cyklus/.test(msg)) return 'nekonečný cyklus';
    if (/of null/.test(msg)) return 'TypeError (null)';
    return m ? m[1] : 'Error';
  }

  function topStats() {
    $('#topMoney').innerHTML = `<span class="ico">💰</span>${kc(P ? P.money : 0)}`;
    $('#topStars').innerHTML = `<span class="ico">★</span>${starCount()}/${MAX_STARS}`;
    $('#mapBtn').hidden = !(P && P.pre);
    $('#soundBtn').textContent = Kit.soundOn ? '🔊' : '🔇';
    $('#soundBtn').setAttribute('aria-pressed', String(Kit.soundOn));
    document.body.classList.toggle('neon', has('neon'));
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
  function pay(amount, why) {
    P.money += amount;
    P.earned += amount;
    logEvent('pay', { amount, why });
  }

  function checkBadges(ctx) {
    ctx = ctx || {};
    const earned = [];
    const award = id => { if (!P.badges.includes(id)) { P.badges.push(id); earned.push(id); } };
    const floorDone = f => ORDERS.filter(o => o.floor === f.id).every(o => isDone(o.id));
    if (doneCount() >= 1) award('first');
    if (ctx.oneshot) award('oneshot');
    if (Object.values(P.orders).filter(s => s.paid.clean).length >= 3) award('clean');
    if (Object.values(P.orders).filter(s => s.stars[2]).length >= 6) award('wishes');
    C.FLOORS.forEach(f => { if (floorDone(f)) award('floor' + f.id); });
    if (ctx.debug) award('debug');
    if (P.upgrades.length >= 3) award('shopper');
    if (P.earned >= 10000) award('rich');
    if (starCount() === MAX_STARS) award('perfect');
    const g = gainOf();
    if (g !== null && g >= 0.5) award('gain');
    earned.forEach((id, i) => {
      const b = BADGES.find(x => x.id === id);
      setTimeout(() => { Kit.toast(`🏅 Nový odznak: <b>${b.icon} ${esc(b.name)}</b>`, 3600); Kit.sound('star'); }, 800 + i * 800);
    });
    return earned;
  }

  /* ---------------- úvod ---------------- */
  function renderIntro() {
    leave();
    crumb([]);
    const cont = P
      ? `<div class="welcome">
           <p>Vítej zpět ve studiu <b>${esc(P.studio)}</b>!</p>
           <p class="muted">Hotových zakázek ${doneCount()} z ${ORDERS.length}, na účtu ${kc(P.money)}.</p>
         </div>
         <div class="btn-row"><button class="btn primary big" id="contBtn" data-focus>${P.pre ? 'Pokračovat do studia' : 'Pokračovat vstupním testem'}</button>
           <button class="btn ghost" id="resetBtn">Začít znovu</button></div>`
      : `<label class="field">Jak se bude tvoje studio jmenovat?<input id="name" maxlength="28" placeholder="např. Pixel &amp; syn"></label>
         <div class="btn-row"><button class="btn primary big" id="startBtn">Založit studio</button></div>`;
    app.innerHTML = `
      <section class="screen">
        <div class="intro">
          <div class="intro-copy">
            <h1 class="logo">Web Studio<b>Tycoon</b></h1>
            <p class="lead">Založ si vlastní webové studio. Pekárna, kapela, kavárna i e-shop chtějí weby a ty je postavíš
              ze <b>skutečného HTML a JavaScriptu</b>. Automatické testy zkontrolují požadavky klienta, a když všechno sedí, dostaneš zaplaceno.</p>
            ${cont}
          </div>
          <div class="intro-visual studio-demo" aria-hidden="true">
            <div class="browser">
              <div class="addr"><span class="dots"><i></i><i></i><i></i></span><span class="url">https://ukoblizky.cz</span></div>
              <iframe id="demoSite" title="Ukázka webu" tabindex="-1"></iframe>
            </div>
            <div class="demo-ticket"><b>Požadavek klientky</b><span class="ok">✔</span> Nadpis s názvem pekárny a seznam pečiva</div>
            <div class="demo-pay">+ 400 Kč</div>
          </div>
        </div>
        <ol class="steps">
          <li><b>Vstupní test</b><small>10 otázek, asi 3 minuty. Zjistíme, co už umíš.</small></li>
          <li><b>12 zakázek ve 3 patrech</b><small>HTML, pak JavaScript a události, nakonec data, pole a logika.</small></li>
          <li><b>Výstupní test a výsledky</b><small>Uvidíš, v čem ses zlepšil(a), dovednost po dovednosti.</small></li>
        </ol>
      </section>`;
    const demo = $('#demoSite');
    if (demo) demo.srcdoc = `<!doctype html><html lang="cs"><head><meta charset="utf-8"><style>
      body{margin:0;font:16px/1.5 system-ui,sans-serif;color:#3b2412;background:#fff7ec}
      header{background:#c2410c;color:#fff;padding:22px 26px}h1{margin:0;font-size:30px}p{margin:4px 0 0;opacity:.9}
      main{padding:18px 26px}h2{margin:0 0 8px;font-size:19px}ul{margin:0;padding-left:20px}li{margin:3px 0}
      .tag{display:inline-block;margin-top:14px;background:#fed7aa;border-radius:99px;padding:3px 12px;font-weight:700;font-size:14px}
      </style></head><body><header><h1>🥐 Pekárna U Kobližky</h1><p>Otevřeno denně od 7:00</p></header>
      <main><h2>Dnes pečeme</h2><ul><li>Koblihy s meruňkou</li><li>Kváskový chléb</li><li>Makové šneky</li></ul><span class="tag">Čerstvé každé ráno</span></main></body></html>`;
    if (P) {
      $('#contBtn').addEventListener('click', () => (P.pre ? renderStudio() : renderQuiz('pre')));
      $('#resetBtn').addEventListener('click', () => Kit.confirm('Smazat celé studio, peníze, zakázky i výsledky testů?', 'Smazat a začít znovu', () => {
        localStorage.removeItem(KEY);
        P = null;
        topStats();
        renderIntro();
      }));
    } else {
      const go = () => {
        const name = $('#name').value.trim() || 'Pixel & syn';
        P = newProfile(name);
        logEvent('start', { form: P.form });
        save();
        Kit.sound('cash');
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
    crumb(pre ? [{ label: 'Vstupní test' }] : [{ label: 'Studio', go: renderStudio }, { label: 'Výstupní test' }]);
    app.innerHTML = `
      <section class="screen" id="quizBox">
        <div class="card narrow quiz-intro">
          <span class="pill">${pre ? 'Krok 1 ze 3' : 'Krok 3 ze 3'}</span>
          <h1>${pre ? 'Vstupní test' : 'Výstupní test'}</h1>
          <p class="lead">${pre
            ? 'Než přijmeš první zakázku, zjistíme, co už o HTML a JavaScriptu víš. Výsledek se nijak nehodnotí, slouží jen k porovnání s koncem hry.'
            : 'Ukaž, co ses naučil(a). Otázky jsou podobné jako na začátku, ale ne stejné. Každá míří na jednu dovednost ze zakázek.'}</p>
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
        highlight: (code, lang) => (lang === 'text' ? esc(code) : Highlight(code, lang || 'js')),
        lang: 'js',
        onDone(answers) {
          view = null;
          P[which] = { form, answers, at: Date.now() };
          logEvent('quiz', { which, form, correct: answers.filter(a => a.correct).length });
          save();
          if (pre) afterPre(); else { checkBadges(); save(); renderResults(); Kit.confetti(['💰', '★', '<', '>'], ['#2b59ff', '#14a35b', '#f5a600', '#ff7ab6']); }
        }
      });
      view = { cleanup: () => quiz.stop() };
    });
  }

  function afterPre() {
    const s = Kit.quizStats(P.pre.answers);
    renderStudio();
    const m = Kit.modal(`
      <h2>Vstupní test hotový</h2>
      <p>Správně <b>${s.correct} z ${s.n}</b>${s.dunno ? `, „nevím“ ${s.dunno}×` : ''}. Na konci uvidíš, o kolik ses posunul(a).</p>
      <p>Na účtu máš <b>${kc(P.money)}</b> startovního kapitálu. Ve schránce už čeká první klientka!</p>
      <ul class="vstats">
        <li class="ok">📝 Kód píšeš do tří souborů: index.html, script.js a style.css. Náhled webu se mění hned.</li>
        <li class="ok">▶ Tlačítko Otestovat web (Ctrl+Enter) zkontroluje požadavky klienta. Testy za uživatele klikají a píšou.</li>
        <li class="ok">★ Hvězdy: za splnění, za nejvýš 3 testování a za přání navíc. Peníze utratíš za vybavení studia.</li>
      </ul>
      <div class="btn-row"><button class="btn primary big" data-play data-focus>Otevřít zakázku 1</button><button class="btn ghost" data-close>Do studia</button></div>`);
    $('[data-play]', m).addEventListener('click', () => renderOrder(1));
  }

  /* ---------------- studio ---------------- */
  function renderStudio() {
    leave();
    if (!P || !P.pre) { renderIntro(); return; }
    crumb([{ label: 'Studio' }]);
    const done = doneCount();
    const nextId = (ORDERS.find(o => !isDone(o.id)) || {}).id;
    const lv = level();
    const canPost = done >= 8;
    const room = ['🪴', '🐈', '🏆'].filter((ic, i) => has(['kytka', 'kocka', 'cena'][i]));
    const card = o => {
      const s = P.orders[o.id];
      const open = unlocked(o.id);
      const cls = isDone(o.id) ? 'done' : o.id === nextId ? 'next' : open ? 'open' : 'locked';
      const stars = [0, 1, 2].map(i => `<i class="${s && s.stars[i] ? 'on' : ''}">★</i>`).join('');
      return `<button class="node ${cls}" data-o="${o.id}" ${open ? '' : 'disabled aria-disabled="true"'} aria-label="Zakázka ${o.id}: ${esc(o.client.business)}">
          <span class="n-num ava">${open ? o.client.avatar : '🔒'}</span>
          <span class="n-title">${esc(o.client.business)}</span>
          <span class="n-pay">💰 ${kc(o.reward)}${o.wish ? ` + ${kc(wishBonus(o))}` : ''}</span>
          <span class="n-stars" aria-label="${s ? s.stars.filter(Boolean).length : 0} hvězd ze 3">${stars}</span>
        </button>`;
    };
    const nextO = ORDERS.find(o => o.id === nextId);
    app.innerHTML = `
      <section class="screen">
        <div class="studio-head">
          <div class="office">
            <h1 class="${has('neon') ? 'neon-logo' : ''}">${esc(P.studio)}</h1>
            <div class="lvl-name">${lv[1]} ${lv[2]}</div>
            <div class="window"></div>
            <div class="room">${room.join('')}<span class="desk">${has('monitor') ? '🖥️' : ''}💻</span>${has('kavovar') ? '☕' : ''}</div>
          </div>
          <div class="studio-side">
            <div class="studio-stats">
              <div class="stat"><b class="money">${kc(P.money)}</b><small>na účtu</small></div>
              <div class="stat"><b>★ ${starCount()}/${MAX_STARS}</b><small>reputace</small></div>
              <div class="stat"><b>${done}/${ORDERS.length}</b><small>hotových zakázek</small></div>
              <div class="stat"><b>${kc(P.earned)}</b><small>vyděláno celkem</small></div>
            </div>
            <div class="btn-row"><button class="btn" id="cheatBtn">📖 Tahák</button>${P.post ? '<button class="btn primary" id="resBtn">📊 Výsledky</button>' : ''}</div>
          </div>
        </div>
        ${nextO ? `<div class="next-up">
            <span class="nu-num">${nextO.client.avatar}</span>
            <div class="nu-text"><small>Nová zakázka ${nextO.id} z ${ORDERS.length}: ${esc(nextO.client.name)} platí ${kc(nextO.reward)}</small><b>${esc(nextO.client.business)}</b></div>
            <button class="btn primary big" data-o="${nextO.id}">Otevřít zakázku ${nextO.id}</button>
          </div>` : ''}
        ${C.FLOORS.map(f => {
          const os = ORDERS.filter(o => o.floor === f.id);
          return `<section class="track f${f.id}">
            <div class="track-head"><span class="t-ico">${f.icon}</span><div><h2>${esc(f.title)}</h2><small>${esc(f.desc)}</small></div>
              <span class="t-count">${os.filter(o => isDone(o.id)).length}/${os.length} hotovo</span></div>
            <div class="nodes">${os.map(card).join('')}</div>
          </section>`;
        }).join('')}
        <section class="track">
          <div class="track-head"><span class="t-ico">🛍️</span><div><h2>Vybavení studia</h2><small>Za vydělané peníze si vylepšíš kancelář.</small></div></div>
          <div class="shop">${SHOP.map(it => `<div class="item ${has(it.id) ? 'owned' : ''}"><span class="ico">${it.icon}</span><b>${esc(it.name)}</b><small>${esc(it.desc)}</small>
            ${has(it.id) ? '<button class="btn small" disabled>✔ Máš</button>' : `<button class="btn small ${P.money >= it.price ? 'primary' : ''}" data-buy="${it.id}" ${P.money >= it.price ? '' : 'disabled'}>Koupit za ${kc(it.price)}</button>`}</div>`).join('')}</div>
        </section>
        <section class="card final">
          <div>
            <h2>Výstupní test</h2>
            ${P.post
              ? `<p>Hotovo! Vstupní test ${Kit.quizStats(P.pre.answers).correct}/10, výstupní ${Kit.quizStats(P.post.answers).correct}/10.</p>`
              : canPost
                ? `<p>Máš za sebou ${done} zakázek, můžeš si změřit pokrok. ${done < ORDERS.length ? 'Doporučujeme ale nejdřív dokončit všech 12.' : 'Všechny zakázky splněné, gratulujeme!'}</p>`
                : `<p class="muted">Odemkne se po 8 dokončených zakázkách (zatím ${done}). Pak porovnáme, co jsi uměl(a) na začátku a co umíš teď.</p>`}
          </div>
          ${P.post ? '<button class="btn primary big" id="resBtn2">Zobrazit výsledky</button>'
            : canPost ? '<button class="btn primary big" id="postBtn">Spustit výstupní test</button>' : ''}
        </section>
      </section>`;
    $$('[data-o]').forEach(b => b.addEventListener('click', () => { Kit.sound('click'); renderOrder(+b.dataset.o); }));
    $$('[data-buy]').forEach(b => b.addEventListener('click', () => {
      const it = SHOP.find(x => x.id === b.dataset.buy);
      if (!it || P.money < it.price || has(it.id)) return;
      P.money -= it.price;
      P.spent += it.price;
      P.upgrades.push(it.id);
      logEvent('buy', { item: it.id, price: it.price });
      checkBadges();
      save();
      Kit.sound('cash');
      Kit.toast(`${it.icon} <b>${esc(it.name)}</b> je tvoje!`);
      renderStudio();
    }));
    $('#cheatBtn').addEventListener('click', cheatSheet);
    ['#resBtn', '#resBtn2'].forEach(s => { const b = $(s); if (b) b.addEventListener('click', renderResults); });
    const pb = $('#postBtn');
    if (pb) pb.addEventListener('click', () => renderQuiz('post'));
  }

  // Lekce otevřená z taháku: tlačítko „Zpět k taháku“ tahák znovu otevře a vrátí fokus na lekci, ze které hráč přišel.
  function openLesson(v) {
    if (!v || !LESSONS[v.id]) return;
    const m = Lesson.open({ modal: Kit.modal, lesson: LESSONS[v.id], kicker: `Lekce k zakázce ${v.id}: ${v.client.business}`, back: 'Zpět k taháku' });
    const back = Kit.$('.modal-box > .btn-row [data-close]', m);
    if (back) back.addEventListener('click', () => setTimeout(() => {
      cheatSheet();
      const b = Kit.$(`.modal [data-lesson="${v.id}"]`);
      if (b) b.focus();
    }));
  }

  function cheatSheet() {
    const lesBtn = x => LESSONS[x.id] ? `<button class="btn small" data-lesson="${x.id}">📖 Lekce s příkladem</button>` : '';
    const items = ORDERS.map(o => (isDone(o.id)
      ? `<div class="learn"><b>#${o.id} ${esc(o.client.business)}: ${esc(o.concept)}</b><p>${esc(o.learn[0])}</p><pre class="code">${Highlight(o.learn[1], o.learn[2])}</pre>${lesBtn(o)}</div>`
      : unlocked(o.id) ? `<div class="learn"><b>#${o.id} ${esc(o.client.business)}: ${esc(o.concept)}</b><p class="small muted">Tahle zakázka tě ještě čeká. Lekci si můžeš projít už teď.</p>${lesBtn(o)}</div>`
      : `<div class="learn locked"><b>🔒 #${o.id}: ${esc(o.concept)}</b><p class="small muted">Odemkne se po dokončení zakázky.</p></div>`)).join('');
    const cm = Kit.modal(`<h2>📖 Tahák HTML a JavaScriptu</h2><p class="muted small">Všechno, co ses na zakázkách naučil(a), na jednom místě.</p><div class="cheat">${items}</div>`, { cls: 'wide' });
    Kit.$$('[data-lesson]', cm).forEach(btn => btn.addEventListener('click', () => openLesson(ORDERS.find(x => x.id === +btn.dataset.lesson))));
  }

  /* ---------------- zakázka ---------------- */
  function renderOrder(id) {
    leave();
    const o = ORDERS.find(x => x.id === id);
    if (!o || !unlocked(id)) { renderStudio(); return; }
    const os = oState(id);
    const floor = C.FLOORS.find(f => f.id === o.floor);
    const ses = { runs: 0, fails: 0, solution: false, t0: performance.now(), timers: [], running: false, sawJsError: false };
    const later = (f, ms) => ses.timers.push(setTimeout(f, ms));
    crumb([{ label: 'Studio', go: renderStudio }, { label: floor.title.split(' – ')[0] }, { label: `#${o.id} ${o.client.business}` }]);
    const prev = ORDERS.find(x => x.id === id - 1);
    const next = ORDERS.find(x => x.id === id + 1);
    const files = os.code ? Object.assign({}, os.code) : { html: o.html, css: o.css, js: o.js };
    const startTab = o.floor === 1 ? 'html' : 'js';
    let tab = startTab;
    const LANG = { html: 'html', js: 'js', css: 'css' };
    const FILE = { html: 'index.html', js: 'script.js', css: 'style.css' };

    app.innerHTML = `
      <section class="ws-screen fit ${has('monitor') ? 'big-preview' : ''}">
        <header class="mbar">
          <span class="mb-num ava" aria-hidden="true">${o.client.avatar}</span>
          <div class="mb-text"><span class="mb-where">Zakázka ${o.id} z ${ORDERS.length}, ${esc(floor.title.split(' – ')[0])}<code class="mb-concept" title="Co se v zakázce procvičuje">${esc(o.concept)}</code></span><h1>${esc(o.client.business)}</h1></div>
          <div class="mb-right">
            <ul class="goals" id="goals" aria-label="Hvězdy za zakázku"></ul>
            <nav class="mb-nav">
              <button class="icon-btn" id="prevBtn" title="Předchozí zakázka" aria-label="Předchozí zakázka" ${prev ? '' : 'disabled'}>◀</button>
              <button class="icon-btn" id="nextBtn" title="Další zakázka" aria-label="Další zakázka" ${next && isDone(id) ? '' : 'disabled'}>▶</button>
            </nav>
          </div>
        </header>
        <div class="ws">
          <div class="col split">
            <section class="panel brief scroll-pane">
              <h2 class="panel-h">Zadání od klienta <small>${esc(o.client.name)}</small><span class="sp"></span><span class="mb-reward" title="Odměna ${kc(o.reward)}, přání navíc ${kc(wishBonus(o))}, čistý kód ${kc(CLEAN_BONUS)}">💰 ${kc(o.reward)}</span></h2>
              <div class="chat" id="chat"></div>
              <h2 class="panel-h" style="margin-top:1rem">Požadavky <small>to zkontrolují testy</small></h2>
              <ul class="reqs" id="reqs"></ul>
              <h2 class="panel-h wish-h">🎁 Přání navíc <small>+${kc(wishBonus(o))}</small></h2>
              <ul class="reqs" id="wish"></ul>
              <div class="brief-actions">
                <button class="btn small" id="lessonBtn" title="Nová věc z HTML nebo JavaScriptu na živém příkladu">📖 Lekce</button>
                <button class="btn small" id="hintBtn"></button>
                <button class="btn small ghost" id="tourBtn" title="Průvodce obrazovkou: co je kde a k čemu to slouží">❔ Průvodce</button>
                <button class="btn small ghost" id="solBtn" hidden>👀 Ukázat řešení</button>
              </div>
              <div class="hints" id="hints"></div>
            </section>
            <section class="panel fixed-pane preview-pane">
              <h2 class="panel-h">Živý náhled <small>mění se, jak píšeš</small></h2>
              <div class="browser">
                <div class="addr"><span class="dots"><i></i><i></i><i></i></span><span class="url">https://${esc(o.client.domain)}</span><button class="reload" id="reload" title="Načíst znovu" aria-label="Načíst náhled znovu">⟳</button></div>
                <iframe id="preview" title="Náhled webu klienta"></iframe>
              </div>
            </section>
          </div>
          <div class="col">
            <section class="panel code-pane">
              <div class="tabs" role="tablist">${['html', 'js', 'css'].map(t => `<button class="tab ${t === tab ? 'on' : ''}" data-tab="${t}" role="tab">${FILE[t]}<span class="dot" hidden></span></button>`).join('')}</div>
              <div id="editor"></div>
              <details class="snips" data-snips="webStudio.snips" ${Kit.snipsOpen('webStudio.snips', false) ? 'open' : ''}><summary>🧩 Úryvky kódu <small>když nevíš, jak něco zapsat</small></summary><div class="palette" id="palette"></div></details>
              <div class="runbar">
                <button class="btn go big" id="runBtn">▶ Otestovat web <kbd>Ctrl+Enter</kbd></button>
                <button class="btn ghost" id="resetBtn" title="Vrátit výchozí kód zakázky">↺ Výchozí kód</button>
              </div>
              <div class="status" id="status" aria-live="polite"></div>
              <div class="console" id="console"><div id="htmlLog"></div><div id="jsLog"></div><div id="runLog"></div></div>
            </section>
          </div>
        </div>
      </section>`;

    /* úvod zakázky (příběh → lekce → úkol) se poprvé ukáže v okně; chat pod ním je pak už vypsaný */
    const firstIntro = !!(LESSONS[id] && !(P.intro && P.intro[id]));
    if (firstIntro) { P.intro = P.intro || {}; P.intro[id] = true; P.seen[id] = true; save(); }
    /* chat s klientem */
    const chat = $('#chat');
    const bubble = text => `<div class="bubble"><b class="who">${o.client.avatar} ${esc(o.client.name)}</b>${md(text)}</div>`;
    if (P.seen[id]) chat.innerHTML = o.brief.map(bubble).join('');
    else {
      o.brief.forEach((t, i) => later(() => { chat.insertAdjacentHTML('beforeend', bubble(t)); Kit.sound('type'); if (i === o.brief.length - 1) { P.seen[id] = true; save(); } }, 250 + i * 650));
    }

    /* požadavky */
    const reqLi = (r, i, cls, msg, wish) => `<li class="req ${cls || ''} ${wish ? 'wishreq' : ''}" data-i="${i}"><i>${cls === 'pass' ? '✔' : cls === 'fail' ? '✘' : '○'}</i><span>${md(r.text)}</span>${msg ? `<small>${esc(msg)}</small>` : ''}</li>`;
    function showReqs(results) {
      const map = results || [];
      $('#reqs').innerHTML = o.reqs.map((r, i) => { const x = map[i]; return reqLi(r, i, x ? (x.pass ? 'pass' : 'fail') : '', x && !x.pass ? x.msg : '', false); }).join('');
      const w = map[o.reqs.length];
      $('#wish').innerHTML = reqLi(o.wish, 0, w ? (w.pass ? 'pass' : 'fail') : (os.stars[2] ? 'pass' : ''), w && !w.pass ? w.msg : '', true);
    }
    showReqs(null);

    /* editor a záložky */
    const ed = new CodeEditor($('#editor'), { lang: LANG[tab], tab: 2, onRun: () => run(), label: 'Editor kódu' });
    ed.value = files[tab];
    function switchTab(t) {
      files[tab] = ed.value;
      tab = t;
      $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
      ed.setLang(LANG[t]);
      ed.value = files[t];
      renderPalette();
      ed.focus();
    }
    $$('.tab').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    const SYMS = { html: ['<|>', '</|>', '="|"'], js: ['(|)', '{\n  |\n}', "'|'", ';', '=== ', '+= '], css: ['{\n  |\n}', ': |;'] };
    function renderPalette() {
      const own = (o.palette && o.palette[tab]) || [];
      $('#palette').innerHTML = own.map((p, i) => `<button class="chip" data-p="${i}">${esc(p.replace(/\|/g, '').replace(/\n\s*/g, ' ⏎ ').slice(0, 60))}</button>`).join('') +
        SYMS[tab].map((x, i) => `<button class="chip sym" data-s="${i}">${esc(x.replace(/\|/g, '').replace(/\n\s*/g, ' '))}</button>`).join('');
      $$('#palette [data-p]').forEach(b => b.addEventListener('click', () => insert(own[+b.dataset.p])));
      $$('#palette [data-s]').forEach(b => b.addEventListener('click', () => insert(SYMS[tab][+b.dataset.s], true)));
    }
    function insert(p, inline) {
      if (!inline && p.includes('\n')) ed.insertSnippet(p.includes('|') ? p : p + '|');
      else ed.insertSnippet(p.includes('|') ? p : p + '|', true);
      Kit.sound('type');
    }
    renderPalette();

    /* živý náhled + konzole */
    const preview = $('#preview');
    const jsLog = [];
    function renderJsLog() {
      $('#jsLog').innerHTML = jsLog.slice(-30).map(l => {
        const link = l.line ? `<button class="line-link" data-jsline="${l.line}">script.js:${l.line}</button> ` : '';
        if (l.kind === 'error') {
          const cz = S.explainJs(l.msg);
          return `<div class="log err">${link}✘ ${esc(l.msg)}${cz ? `<br><span class="src">→ ${esc(cz)}</span>` : ''}</div>`;
        }
        return `<div class="log ${l.kind === 'warn' ? 'warn' : 'out'}">${l.kind === 'warn' ? '⚠ ' : '› '}${esc(l.msg)}</div>`;
      }).join('');
      $$('#jsLog [data-jsline]').forEach(b => b.addEventListener('click', () => { if (tab !== 'js') switchTab('js'); ed.goToLine(+b.dataset.jsline); ed.markError(+b.dataset.jsline); }));
      $('.tab[data-tab="js"] .dot').hidden = !jsLog.some(l => l.kind === 'error');
    }
    function renderHtmlLog() {
      const warns = S.validateHtml(files.html);
      $('#htmlLog').innerHTML = warns.slice(0, 8).map(w => `<div class="log warn"><button class="line-link" data-htmlline="${w.line}">index.html:${w.line}</button> ⚠ ${esc(w.msg)}</div>`).join('');
      $$('#htmlLog [data-htmlline]').forEach(b => b.addEventListener('click', () => { if (tab !== 'html') switchTab('html'); ed.goToLine(+b.dataset.htmlline); }));
      $('.tab[data-tab="html"] .dot').hidden = !warns.length;
      return warns;
    }
    window.__studioLog = (tag, item) => {
      if (tag !== 'preview') return;
      jsLog.push(item);
      renderJsLog();
    };
    function refreshPreview() {
      files[tab] = ed.value;
      jsLog.length = 0;
      renderJsLog();
      renderHtmlLog();
      preview.srcdoc = S.buildDoc(files, { assets: o.assets, tag: 'preview' });
    }
    let previewT = 0;
    let saveT = 0;
    ed.onChange(() => {
      clearTimeout(previewT);
      previewT = setTimeout(refreshPreview, 450);
      clearTimeout(saveT);
      saveT = setTimeout(() => { files[tab] = ed.value; os.code = Object.assign({}, files); save(); }, 700);
    });
    $('#reload').addEventListener('click', refreshPreview);
    refreshPreview();
    Kit.status($('#status'), 'idle', os.done ? 'Zakázka je hotová. Zkus získat všechny hvězdy.' : 'Napiš kód a otestuj web', 'Náhled vlevo se mění hned. Testy spustíš tlačítkem nebo Ctrl+Enter.');

    function goals() {
      const runsNow = os.done ? ses.runs : os.runs;
      $('#goals').innerHTML = Kit.goals([
        { got: os.stars[0], text: 'Všechny požadavky', title: 'Hvězda za splnění všech požadavků klienta' },
        { got: os.stars[1], text: 'Nejvýš 3 testování', val: `${runsNow}/3`, title: `Hvězda za hotovou zakázku nejvýš na 3 testování (${os.done ? 'teď' : 'zatím'} ${runsNow})` },
        { got: os.stars[2], text: 'Přání navíc', title: 'Hvězda za přání navíc: ' + o.wish.text.replace(/`/g, '') }
      ]);
    }
    function runLog(html) { $('#runLog').innerHTML = html; }

    /* testování */
    async function run() {
      if (ses.running) return;
      ses.running = true;
      $('#runBtn').disabled = true;
      $('#runBtn').textContent = '⏳ Testuji…';
      Kit.status($('#status'), 'run', 'Testuji požadavky…', 'Testy klikají a píšou do webu za uživatele.');
      files[tab] = ed.value;
      os.code = Object.assign({}, files);
      ses.runs++;
      if (!os.done) os.runs++;
      os.runsTotal++;
      runLog('<div class="log info">▶ Spouštím testy požadavků…</div>');
      let res;
      try {
        res = await S.runChecks(o, files, $('#testFrame'));
      } finally {
        ses.running = false;
        $('#runBtn').disabled = false;
        $('#runBtn').innerHTML = '▶ Otestovat web <kbd>Ctrl+Enter</kbd>';
      }
      showReqs(res.results);
      /* na velké obrazovce posuň zadání tak, aby byl vidět seznam požadavků s výsledky */
      const pane = $('.brief.scroll-pane');
      if (pane && window.matchMedia('(min-width: 1100px) and (min-height: 640px)').matches) {
        pane.scrollTo({ top: Math.max(0, $('#reqs').offsetTop - 48), behavior: 'smooth' });
      }
      const base = res.results.filter(r => !r.wish);
      const passed = base.filter(r => r.pass).length;
      const wishOk = res.results.some(r => r.wish && r.pass);
      const warns = renderHtmlLog();
      const errTypes = [...new Set(res.errors.map(e => jsErrCategory(e.msg)))];
      errTypes.forEach(t => { P.jsErrors[t] = (P.jsErrors[t] || 0) + 1; });
      if (res.errors.length) { os.jsErrRuns++; ses.sawJsError = true; }
      if (warns.length) os.htmlWarnRuns++;
      os.bestPassed = Math.max(os.bestPassed || 0, passed);
      logEvent('run', { order: o.id, passed, total: base.length, wish: wishOk, jsErrors: res.errors.length, htmlWarnings: warns.length });
      const errLine = res.errors.find(e => e.line);
      const firstFail = res.results.find(r => !r.wish && !r.pass);
      if (passed === base.length) Kit.status($('#status'), 'ok', `Všechny požadavky splněné (${passed}/${base.length})`, wishOk ? '🎁 Přání navíc taky!' : 'Přání navíc zatím ne. Zkus ho pro bonus.');
      else Kit.status($('#status'), 'bad', `Splněno ${passed} z ${base.length} požadavků`, firstFail && firstFail.msg ? esc(firstFail.msg) : 'Červeně označené požadavky vlevo ještě nesedí.');
      runLog(`<div class="log ${passed === base.length ? 'ok' : 'err'}">${passed === base.length ? '✔' : '✘'} Požadavky: ${passed}/${base.length}${wishOk ? ', 🎁 přání splněno' : ''}</div>` +
        (res.errors.length ? `<div class="log err">✘ Při testech spadl JavaScript: ${esc(res.errors[0].msg)}${errLine ? ` <button class="line-link" data-jsline2="${errLine.line}">script.js:${errLine.line}</button>` : ''}<br><span class="src">→ ${esc(S.explainJs(res.errors[0].msg) || 'Podívej se do konzole.')}</span></div>` : ''));
      $$('#runLog [data-jsline2]').forEach(b => b.addEventListener('click', () => { if (tab !== 'js') switchTab('js'); ed.goToLine(+b.dataset.jsline2); ed.markError(+b.dataset.jsline2); }));
      if (passed === base.length) onWin(res, wishOk, warns.length === 0 && res.errors.length === 0);
      else onFail(res);
      save();
    }

    function onFail() {
      ses.fails++;
      Kit.sound('fail');
      if (ses.fails >= 2 && os.hints < o.hints.length) Kit.toast(`💡 Nevíš si rady? Konzultace se seniorem stojí ${kc(hintPrice())} (tlačítko u zadání).`, 2800);
      if (ses.fails >= 3 && os.hints >= o.hints.length) $('#solBtn').hidden = false;
      goals();
    }

    function onWin(res, wishOk, clean) {
      const first = !os.done;
      const runsUsed = first ? os.runs : ses.runs;
      const got = [true, runsUsed <= 3 && !ses.solution, wishOk && !ses.solution];
      const before = os.stars.slice();
      const slip = [];
      if (first) {
        addTime();
        os.done = true;
        os.firstTry = os.runs === 1 && !os.solution;
        os.wonAt = Date.now();
      }
      if (!os.paid.base) { os.paid.base = true; pay(o.reward, 'zakázka ' + o.id); slip.push(['Odměna za zakázku', o.reward]); }
      if (wishOk && !os.paid.wish) { os.paid.wish = true; pay(wishBonus(o), 'přání ' + o.id); slip.push(['Přání navíc', wishBonus(o)]); }
      if (clean && !os.paid.clean) { os.paid.clean = true; pay(CLEAN_BONUS, 'čistý kód ' + o.id); slip.push(['Čistý kód (bez chyb a varování)', CLEAN_BONUS]); }
      os.stars = os.stars.map((x, i) => x || got[i]);
      logEvent('win', { order: o.id, runs: runsUsed, stars: got.filter(Boolean).length, first, wish: wishOk, clean });
      const badges = checkBadges({ oneshot: ses.runs === 1 && !ses.solution, debug: ses.sawJsError && !res.errors.length });
      save();
      goals();
      Kit.sound('win');
      if (slip.length) later(() => Kit.sound('cash'), 600);
      $('#nextBtn').disabled = !next;
      later(() => victory(got, before, runsUsed, slip, wishOk, clean, badges), 500);
    }

    function victory(got, before, runsUsed, slip, wishOk, clean, badges) {
      const total = slip.reduce((n, x) => n + x[1], 0);
      /* hodnocení: u každé hvězdy věta, co se povedlo, a u chybějící, jak ji získat */
      function starRows() {
        const FN = { html: 'index.html', js: 'script.js', css: 'style.css' };
        const solCode = Object.entries(o.solution).map(([f, c]) => `<span class="sol-file">${FN[f] || f}</span><pre class="code">${Highlight(c, f)}</pre>`).join('');
        const rows = [
          { got: true, title: 'Všechny požadavky klienta', text: `Web dělá všechno, co ${esc(o.client.name)} chtěl${o.client.f ? 'a' : ''}.${clean ? ' A kód je čistý: bez chyb v HTML i v konzoli.' : ''}` },
          Kit.runsStar({ runs: runsUsed, limit: 3, solution: ses.solution, title: 'Nejvýš 3 testování', did: 'Web jsi testoval(a)', retry: 'Zkusit znovu' }),
          got[2]
            ? { got: true, title: 'Přání navíc', text: `${md(o.wish.text)}. Klient je nadšený!` }
            : ses.solution
            ? { got: os.stars[2], title: 'Přání navíc', text: 'Se vzorovým řešením se bonusová hvězda nepočítá.' + (os.stars[2] ? ' Hvězdu ale už máš z dřívějška.' : ''), how: `Klikni na <b>Zkusit znovu</b> a vyřeš to po svém, i s bonusem: ${md(o.wish.text)}` }
            : { got: os.stars[2], title: 'Přání navíc', text: `Tentokrát ne. Klient si ještě přál: ${md(o.wish.text)}.${os.stars[2] ? ' Hvězdu ale už máš z dřívějška.' : ''}`, how: `<b>Jak na to:</b> ${wmd(o.wish.how || '')}${o.wish.example ? `<pre class="code">${Highlight(o.wish.example, o.wish.lang || 'js')}</pre>` : ''}` }
        ];
        return Kit.starReport(rows) + Kit.solutionBox(`<p>Celé vzorové řešení i s přáním navíc. Tvoje řešení může vypadat jinak, důležité je, že projdou testy.</p>${solCode}`, false);
      }
      const mdl = Kit.modal(`
        <div class="victory">
          <div class="big-stars">${got.map((g, i) => `<i class="${os.stars[i] ? 'on' : ''} ${os.stars[i] && !before[i] ? 'new' : ''}" style="animation-delay:${0.15 + i * 0.25}s">★</i>`).join('')}</div>
          <h2>${o.client.avatar} ${esc(o.client.name)}: „Paráda, přesně tohle jsem chtěl${o.client.f ? 'a' : ''}!“</h2>
          ${total ? `<div class="paid">+ ${kc(total)}</div>` : '<p class="muted">Tuhle zakázku už máš zaplacenou, teď jde jen o hvězdy.</p>'}
          ${slip.length ? `<ul class="payslip">${slip.map(([w, a]) => `<li><span>${esc(w)}</span><b>${kc(a)}</b></li>`).join('')}
            ${!wishOk && !os.paid.wish ? `<li class="no"><span>Přání navíc</span><b>${kc(wishBonus(o))}</b></li>` : ''}
            ${!clean && !os.paid.clean ? `<li class="no"><span>Čistý kód</span><b>${kc(CLEAN_BONUS)}</b></li>` : ''}</ul>` : ''}
          ${starRows()}
          <div class="learn"><b>📖 Tahák: ${esc(o.concept)}</b><p>${esc(o.learn[0])}</p><pre class="code">${Highlight(o.learn[1], o.learn[2])}</pre></div>
          <div class="btn-row center">
            ${next ? '<button class="btn primary big" data-next data-focus>Další zakázka</button>'
              : (P.post ? '<button class="btn primary big" data-res data-focus>📊 Výsledky</button>' : '<button class="btn primary big" data-post data-focus>Výstupní test</button>')}
            <button class="btn" data-retry>↺ Zkusit znovu</button>
            <button class="btn ghost" data-map>🏢 Studio</button>
          </div>
        </div>`, { cls: 'win' });
      got.forEach((g, i) => { if (os.stars[i]) setTimeout(() => Kit.sound('star'), 300 + i * 250); });
      if (got.every(Boolean)) Kit.confetti(['💰', '★', '<', '>', '{', '}'], ['#2b59ff', '#14a35b', '#f5a600', '#ff7ab6']);
      if (has('kocka')) setTimeout(() => Kit.toast('🐈 Mňau! Kancelářská kočka gratuluje.', 2500), 1200);
      const on = (sel, f) => { const b = $(sel, mdl); if (b) b.addEventListener('click', f); };
      on('[data-next]', () => renderOrder(next.id));
      on('[data-post]', () => renderQuiz('post'));
      on('[data-res]', renderResults);
      on('[data-map]', renderStudio);
      on('[data-retry]', () => { Kit.closeModal(); ses.runs = 0; ses.solution = false; goals(); ed.focus(); });
      if (badges.length) logEvent('badges', { ids: badges });
    }

    function addTime() {
      if (!os.done) os.timeMs += Math.min(30 * 60 * 1000, performance.now() - ses.t0);
      ses.t0 = performance.now();
    }

    /* konzultace, řešení, reset */
    function showHints() {
      $('#hints').innerHTML = o.hints.slice(0, os.hints).map((h, i) => `<div class="hint"><b>💡 ${i + 1}.</b> ${esc(h)}</div>`).join('');
      const left = o.hints.length - os.hints;
      $('#hintBtn').textContent = left ? `💡 Konzultace (${kc(hintPrice())})` : '💡 Konzultace vyčerpány';
      $('#hintBtn').disabled = !left;
      if (!left && ses.fails >= 3) $('#solBtn').hidden = false;
    }
    $('#hintBtn').addEventListener('click', () => {
      if (os.hints >= o.hints.length) return;
      const price = Math.min(P.money, hintPrice());
      P.money -= price;
      P.spent += price;
      os.hints++;
      logEvent('hint', { order: o.id, n: os.hints, price });
      save();
      showHints();
      Kit.sound('click');
      if (price) Kit.toast(`💡 Senior poradil. −${kc(price)}`, 1800);
    });
    $('#solBtn').addEventListener('click', () => Kit.confirm('Ukázat vzorové řešení? Zakázku pak v tomhle pokusu dokončíš jen za 1 hvězdu. Nejvíc se naučíš, když řešení projdeš řádek po řádku a pak ho zkusíš napsat sám/sama.', 'Ukázat řešení', () => {
      ses.solution = true;
      os.solution = true;
      logEvent('solution', { order: o.id });
      if (o.solution.html) files.html = o.solution.html;
      if (o.solution.js) files.js = o.solution.js;
      ed.value = files[tab];
      refreshPreview();
      save();
    }));
    $('#resetBtn').addEventListener('click', () => Kit.confirm('Vrátit výchozí kód zakázky (všechny tři soubory)? Tvoje úpravy se smažou.', 'Vrátit výchozí kód', () => {
      files.html = o.html;
      files.css = o.css;
      files.js = o.js;
      ed.value = files[tab];
      os.code = null;
      refreshPreview();
      save();
    }));
    $('#runBtn').addEventListener('click', run);
    $('#prevBtn').addEventListener('click', () => prev && renderOrder(prev.id));
    $('#nextBtn').addEventListener('click', () => next && isDone(id) && renderOrder(next.id));

    goals();
    showHints();
    /* průvodce obrazovkou: poprvé se spustí sám, pak tlačítkem ❔ */
    const focusEd = () => { if (window.matchMedia('(min-width: 1101px)').matches) ed.focus(); };
    const tourSteps = () => [
      { el: '#chat', title: 'Klient', text: 'Klient ti tu napíše, jaký web chce.' },
      { el: '#reqs', title: 'Požadavky', text: 'Co musí web splňovat. Po testování se u každého požadavku objeví ✔ nebo ✘ i s vysvětlením, co přesně nesedí.' },
      { el: '#wish', title: 'Přání navíc', text: 'Když splníš i tohle, dostaneš třetí hvězdu a peníze navíc.' },
      { el: '.preview-pane', title: 'Náhled webu', text: 'Tvůj web tak, jak ho uvidí návštěvník. Mění se hned, jak píšeš, a dá se do něj klikat.' },
      { el: '.code-pane .tabs', title: 'Soubory', text: 'Web má tři soubory: <code>index.html</code> (obsah), <code>script.js</code> (chování) a <code>style.css</code> (vzhled). Zakázka řekne, do kterého píšeš.' },
      { el: '#editor', title: 'Kód', text: 'Sem píšeš. 🧩 Úryvky vloží hotové kousky kódu. Chyby v HTML a v JavaScriptu se objeví pod editorem i s číslem řádku.' },
      { el: '#runBtn', title: 'Otestovat web', text: 'Testy web proklikají jako klient a odškrtají požadavky (nebo Ctrl+Enter). Na hvězdu stačí nejvýš 3 testování.' },
      { el: '#goals', title: 'Tři hvězdy', text: 'Všechny požadavky, nejvýš 3 testování a přání navíc. Zakázku můžeš kdykoli zopakovat a hvězdy dobrat.' },
      { el: '.brief .brief-actions', title: 'Když nevíš kudy kam', text: '📖 <b>Lekce</b> vysvětlí novou věc na živém příkladu, který si můžeš upravit a proklikat. 💡 Konzultace se seniorem poradí, jak dál (zaplatíš ji z odměny). Po všech konzultacích a třech pokusech se ukáže i řešení, ale jen za 1 hvězdu. ❔ Průvodce spustíš znovu.' }
    ];
    const TOUR_KEY = KEY + '.tour';
    const startTour = () => Tour.start(tourSteps(), { onEnd: () => { Kit.write(TOUR_KEY, true); focusEd(); } });
    $('#tourBtn').addEventListener('click', startTour);
    const intro = (first, onClose) => Lesson.intro({
      modal: Kit.modal, close: () => Kit.closeModal(), first, onClose,
      head: `<p class="b-kicker">${o.client.avatar} ${esc(o.client.business)} · zakázka ${o.id} z ${ORDERS.length}</p><h2>${esc(o.client.business)}</h2>`,
      story: o.brief.map(t => Lesson.story(o.client.avatar, o.client.name, t)).join(''),
      storyLabel: 'Klient',
      lesson: LESSONS[o.id],
      task: `<div class="st-task"><p><b>Úkol:</b> postav web, který splní všechny požadavky klienta. Po kliknutí na Otestovat web je testy projdou jeden po druhém:</p><ul class="st-reqs">${o.reqs.map(r => `<li>${md(r.text)}</li>`).join('')}</ul></div>`,
      stars: [
        { t: 'Všechny požadavky', d: 'Každý požadavek ze seznamu projde testem. Za hotovou zakázku dostaneš odměnu ' + kc(o.reward) + '.' },
        { t: 'Nejvýš 3 testování', d: 'Web otestuj nejvýš třikrát. Mezi tím si ho zkoušej v živém náhledu, ten se mění, jak píšeš.' },
        { t: 'Přání navíc', d: o.wish.text }
      ],
      done: 'Jdu na to 🛠️'
    });
    $('#lessonBtn').addEventListener('click', () => Lesson.open({ modal: Kit.modal, lesson: LESSONS[o.id], kicker: `Lekce k zakázce ${o.id}: ${o.client.business}`, back: 'Zpět k zakázce' }));
    const afterIntro = () => { if (!Kit.read(TOUR_KEY, false)) later(startTour, 250); else focusEd(); };
    if (firstIntro) later(() => intro(true, afterIntro), 300);
    else if (!Kit.read(TOUR_KEY, false)) later(startTour, 900);
    else setTimeout(focusEd, 50);
    view = {
      cleanup() {
        clearTimeout(previewT);
        clearTimeout(saveT);
        ses.timers.forEach(clearTimeout);
        files[tab] = ed.value;
        os.code = Object.assign({}, files);
        addTime();
        save();
        window.__studioLog = null;
      }
    };
  }

  /* ---------------- výsledky ---------------- */
  function renderResults() {
    leave();
    if (!P || !P.pre) { renderIntro(); return; }
    crumb([{ label: 'Studio', go: renderStudio }, { label: 'Výsledky' }]);
    const pre = Kit.quizStats(P.pre.answers);
    const post = P.post ? Kit.quizStats(P.post.answers) : null;
    const g = gainOf();
    const lv = level();
    const done = ORDERS.filter(o => isDone(o.id));
    const st = id => P.orders[id] || {};
    const firstTry = done.filter(o => st(o.id).firstTry).length;
    const avgRuns = done.length ? done.reduce((n, o) => n + st(o.id).runs, 0) / done.length : 0;
    const hints = ORDERS.reduce((n, o) => n + (st(o.id).hints || 0), 0);
    const time = done.reduce((n, o) => n + (st(o.id).timeMs || 0), 0);
    const errs = Object.entries(P.jsErrors).sort((a, b) => b[1] - a[1]);
    const review = (ans, form) => ans.map(a => {
      const q = C.QUIZ[form][a.q];
      return `<div class="rev"><b>${a.correct ? '<span class="ok">✔</span>' : a.dontKnow ? '<span class="dk">?</span>' : '<span class="bad">✗</span>'} ${esc(q.q)}</b>
        ${q.code ? `<pre class="code">${Highlight(q.code, q.lang || 'js')}</pre>` : ''}
        <div class="small">${a.correct ? '' : `Tvoje odpověď: ${a.dontKnow ? 'nevím' : esc(q.a[a.choice])} · `}Správně: <b>${esc(q.a[q.ok])}</b></div></div>`;
    }).join('');
    app.innerHTML = `
      <section class="screen result">
        <div class="card res-hero">
          <div class="rank-icon">${lv[1]}</div>
          <div>
            <h1>${esc(P.studio)}: ${lv[2]}</h1>
            <p>★ ${starCount()} z ${MAX_STARS}, hotovo ${done.length} z ${ORDERS.length} zakázek, vyděláno ${kc(P.earned)}.</p>
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
            ${post ? Kit.bar('Výstupní test', post.pct, post.correct + '/' + post.n, post.pct >= pre.pct ? 'post' : 'lo') : '<p class="muted">Výstupní test ještě čeká – najdeš ho ve studiu.</p>'}
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
              <div class="stat"><b>${Kit.fmt(avgRuns)}</b><small>testování na zakázku</small></div>
              <div class="stat"><b>${hints}</b><small>konzultací</small></div>
              <div class="stat"><b>${fmtTime(time)}</b><small>čas do splnění</small></div>
            </div>
            <div class="table-wrap"><table class="tbl">
              <thead><tr><th>Zakázka</th><th>★</th><th>Testy</th><th>Konzult.</th><th>Chyby JS</th><th>Čas</th></tr></thead>
              <tbody>${ORDERS.map(o => {
                const s = st(o.id);
                return `<tr><td>${o.id}. ${esc(o.client.business)}</td><td>${s.done ? '★'.repeat(s.stars.filter(Boolean).length) : '–'}</td>
                  <td>${s.done ? s.runs : s.runsTotal ? s.runsTotal + ' (nesplněno)' : '–'}</td><td>${s.hints || 0}${s.solution ? ' + řešení' : ''}</td>
                  <td>${s.jsErrRuns || '–'}</td><td>${s.done ? fmtTime(s.timeMs) : '–'}</td></tr>`;
              }).join('')}</tbody></table></div>
            <p class="small muted" style="margin-bottom:.2rem">Chyby JavaScriptu, které jsi potkal(a) a překonal(a):</p>
            <div class="errlist">${errs.length ? errs.map(([t, n]) => `<span>${esc(t)} ×${n}</span>`).join('') : '<span>žádné – čistá práce!</span>'}</div>
          </div>
        </div>
        <div class="card">
          <h2>Odznaky <small class="muted">${P.badges.length} z ${BADGES.length}</small></h2>
          <div class="badges">${BADGES.map(b => `<div class="badge ${P.badges.includes(b.id) ? 'got' : ''}"><span>${b.icon}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div>`).join('')}</div>
        </div>
        ${post ? `<div class="card"><details class="answers-review"><summary>Projít odpovědi výstupního testu (varianta ${P.post.form})</summary>${review(P.post.answers, P.post.form)}</details>
          <details class="answers-review"><summary>Projít odpovědi vstupního testu (varianta ${P.pre.form})</summary>${review(P.pre.answers, P.pre.form)}</details></div>` : ''}
        <div class="btn-row center">
          <button class="btn primary" id="mapBtn2">🏢 Zpět do studia</button>
          <button class="btn" id="expBtn">⬇️ Stáhnout výsledky (JSON)</button>
          <button class="btn ghost" id="cheat2">📖 Tahák</button>
        </div>
      </section>`;
    $('#mapBtn2').addEventListener('click', renderStudio);
    $('#cheat2').addEventListener('click', cheatSheet);
    $('#expBtn').addEventListener('click', () => {
      Kit.download(`web-studio-${P.studio.replace(/[^\w-]+/g, '_')}.json`, exportData());
      Kit.toast('Výsledky staženy ✔');
    });
  }

  function exportData() {
    const pre = Kit.quizStats(P.pre.answers);
    const post = P.post ? Kit.quizStats(P.post.answers) : null;
    return {
      game: 'Web Studio Tycoon', version: 1, exportedAt: new Date().toISOString(), studio: P.studio,
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
      orders: ORDERS.map(o => Object.assign({ id: o.id, client: o.client.business, concept: o.concept }, P.orders[o.id] ? Object.assign({}, P.orders[o.id], { code: undefined }) : { done: false })),
      jsErrors: P.jsErrors,
      economy: { money: P.money, earned: P.earned, spent: P.spent, upgrades: P.upgrades },
      totals: { stars: starCount(), maxStars: MAX_STARS, ordersDone: doneCount() },
      badges: P.badges,
      events: P.events
    };
  }

  /* ---------------- lišta ---------------- */
  $('#homeBtn').addEventListener('click', renderIntro);
  $('#mapBtn').addEventListener('click', renderStudio);
  $('#soundBtn').addEventListener('click', () => {
    Kit.soundOn = !Kit.soundOn;
    Kit.write('webStudioTycoon.sound', Kit.soundOn);
    topStats();
    if (Kit.soundOn) Kit.sound('ok');
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  topStats();
  if (P && P.pre) renderStudio(); else renderIntro();
})();
