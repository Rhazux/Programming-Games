/*
 * CSS Parkour – engine
 * Scéna je skutečná webová stránka v iframe. Fyzika Pixela čte polohy prvků přes getBoundingClientRect(),
 * takže terén tvoří přímo výsledek CSS (včetně flexboxu, transformací i animací).
 */
(function (global) {
  'use strict';

  const C = global.ParkourContent;
  const HEAVY = '#stage#stage#stage ';
  const W = 22, H = 28;               // velikost Pixela
  const SPEED = 110;                  // px/s chůze
  const GRAV = 1500, MAXFALL = 800;   // gravitace
  const STEPUP = 8;                   // nejvyšší schod, který Pixel vyjde
  const STEPUP_LIFT = 16;             // z výtahu vyleze i na trochu vyšší římsu
  const STAGE_W = 800, STAGE_H = 400;

  const BASE_LOCK = `
html, body { margin: 0 !important; padding: 0 !important; transform: none !important; zoom: 1 !important; }
#stage#stage#stage { position: relative !important; left: 0 !important; top: 0 !important; width: ${STAGE_W}px !important; height: ${STAGE_H}px !important; margin: 0 !important; padding: 0 !important; border: 0 !important; transform: none !important; translate: none !important; scale: none !important; rotate: none !important; overflow: hidden !important; display: block !important; zoom: 1 !important; }
#hero#hero#hero { position: absolute !important; left: 0 !important; top: 0 !important; width: ${W}px !important; height: ${H}px !important; margin: 0 !important; padding: 0 !important; z-index: 50 !important; translate: none !important; scale: none !important; rotate: none !important; }
#insp#insp#insp { position: absolute !important; inset: 0 !important; z-index: 70 !important; }`;

  function lockCss(level) {
    const fixed = level.fixed.map(([id, cls, x, y, w, h]) =>
      `${HEAVY}#${id}#${id}#${id} { position: absolute !important; left: ${x}px !important; top: ${y}px !important; width: ${w}px !important; height: ${h}px !important; margin: 0 !important; padding: 0 !important; border: 0 !important; transform: none !important; translate: none !important; rotate: none !important; scale: none !important; display: block !important; visibility: visible !important; box-sizing: content-box !important; right: auto !important; bottom: auto !important; opacity: 1 !important; zoom: 1 !important; }`
    ).join('\n');
    const extra = (level.lock || '').replace(/(^|\n)@/g, '$1' + HEAVY);
    return BASE_LOCK + '\n' + fixed + '\n' + extra;
  }

  function levelHtml(level) {
    const fixed = level.fixed.map(([id, cls]) => `<div id="${id}" class="${cls}">${cls.includes('coin') ? '<i></i>' : ''}</div>`).join('\n');
    return fixed + '\n' + level.html;
  }

  /* HTML, které hráč uvidí na kartě index.html */
  function visibleHtml(level) {
    const fixed = level.fixed.map(([id, cls]) => `  <div id="${id}" class="${cls}"></div>`).join('\n');
    const own = level.html.split('\n').map(l => '  ' + l).join('\n');
    return `<div id="stage">\n  <!-- kulisy (zamčené) -->\n${fixed}\n\n  <!-- prvky, které ovládáš svým CSS -->\n${own}\n</div>`;
  }

  function docHtml(level) {
    return `<!doctype html><html lang="cs"><head><meta charset="utf-8"><style>${C.THEME}</style><style id="lvl">${level.css}</style><style id="player"></style><style id="lock">${lockCss(level)}</style></head>`
      + `<body><div id="stage">${levelHtml(level)}</div><div id="hero" class="right"><i></i></div><div id="insp"></div></body></html>`;
  }

  /* ------------------------------------------------------------------ *
   *  Analýza CSS hráče: počet deklarací, varování (překlepy, chybějící jednotky…)
   * ------------------------------------------------------------------ */
  const KNOWN_PROPS = ['width', 'height', 'margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom', 'padding', 'padding-left', 'padding-right',
    'padding-top', 'padding-bottom', 'border', 'border-left', 'border-right', 'display', 'visibility', 'opacity', 'position', 'left', 'right', 'top', 'bottom',
    'transform', 'justify-content', 'align-items', 'align-self', 'order', 'flex-direction', 'flex-wrap', 'gap', 'animation', 'animation-name', 'animation-duration',
    'background', 'color', 'box-sizing', 'min-width', 'max-width', 'flex', 'translate', 'scale', 'rotate', 'z-index', 'outline'];
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i].concat(Array(b.length).fill(0)));
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function suggestProp(p) {
    let best = null, bd = 9;
    for (const k of KNOWN_PROPS) { const dd = lev(p, k); if (dd < bd) { bd = dd; best = k; } }
    return bd <= 2 ? best : null;
  }

  /* rozebere CSS na pravidla a deklarace (s čísly řádků) */
  function parseCss(css) {
    const src = css.replace(/\/\*[\s\S]*?(\*\/|$)/g, m => m.replace(/[^\n]/g, ' '));
    const rules = [];   // { selector, line, decls: [{prop, value, line, raw}], kind: 'rule'|'keyframe' }
    const problems = [];
    const stack = [];
    let buf = '';
    let bufLine = 1;
    let line = 1;
    let current = null;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (c === '\n') line++;
      if (c === '{') {
        const prelude = buf.trim();
        const pLine = bufLine;
        buf = '';
        const parent = stack[stack.length - 1];
        if (/^@keyframes/i.test(prelude)) stack.push({ type: 'keyframes', name: prelude.replace(/^@keyframes\s*/i, '').trim(), line: pLine });
        else if (/^@(media|supports)/i.test(prelude)) stack.push({ type: 'group', line: pLine });
        else {
          current = { selector: prelude, line: pLine, decls: [], kind: parent && parent.type === 'keyframes' ? 'keyframe' : 'rule' };
          rules.push(current);
          stack.push({ type: 'rule', rule: current, line: pLine });
          if (!prelude) problems.push({ line: pLine, msg: 'Před „{“ chybí selektor.' });
        }
        bufLine = line;
        continue;
      }
      if (c === '}') {
        const top = stack.pop();
        if (!top) { problems.push({ line, msg: 'Přebývá „}“ – k téhle závorce nepatří žádná „{“.' }); buf = ''; continue; }
        if (top.type === 'rule' && buf.trim()) addDecl(top.rule, buf, bufLine);
        buf = '';
        bufLine = line;
        current = null;
        continue;
      }
      if (c === ';') {
        const top = stack[stack.length - 1];
        if (top && top.type === 'rule') addDecl(top.rule, buf, bufLine);
        else if (buf.trim()) problems.push({ line: bufLine, msg: `„${buf.trim()}“ musí být uvnitř složených závorek { … }.` });
        buf = '';
        bufLine = line;
        continue;
      }
      if (!buf.trim() && c !== ' ' && c !== '\n' && c !== '\t') bufLine = line;
      buf += c;
    }
    if (stack.length) problems.push({ line: stack[stack.length - 1].line, msg: 'Chybí „}“ – blok není uzavřený.' });
    else if (buf.trim()) problems.push({ line: bufLine, msg: `„${buf.trim().slice(0, 30)}“ – chybí selektor a složené závorky.` });

    function addDecl(rule, text, l) {
      const raw = text.trim();
      if (!raw) return;
      const k = raw.indexOf(':');
      if (k < 0) { rule.decls.push({ prop: raw, value: '', line: l, raw, bad: 'colon' }); return; }
      rule.decls.push({ prop: raw.slice(0, k).trim().toLowerCase(), value: raw.slice(k + 1).trim(), line: l, raw });
    }
    return { rules, problems };
  }

  function analyzeCss(css, doc) {
    const { rules, problems } = parseCss(css);
    const warnings = problems.slice();
    let decls = 0;
    const props = new Set();
    const supports = global.CSS && global.CSS.supports ? (p, v) => global.CSS.supports(p, v) : () => true;
    for (const r of rules) {
      if (r.kind === 'rule' && doc && r.selector) {
        for (const sel of r.selector.split(',').map(s => s.trim()).filter(Boolean)) {
          const plain = sel.replace(/::?(before|after|hover|focus|active|visited|first-line|first-letter)\b/g, '');
          try {
            const found = plain.trim() ? doc.querySelectorAll('#stage ' + plain.trim()).length + doc.querySelectorAll(plain.trim()).length : 1;
            if (!found) warnings.push({ line: r.line, msg: `Selektor „${sel}“ nenašel na scéně žádný prvek – nemáš v něm překlep? (Podívej se do index.html.)` });
          } catch (e) {
            warnings.push({ line: r.line, msg: `„${sel}“ není platný selektor.` });
          }
        }
      }
      for (const d of r.decls) {
        if (d.bad === 'colon') { warnings.push({ line: d.line, msg: `„${d.raw}“ – mezi vlastností a hodnotou chybí dvojtečka (např. width: 100px).` }); continue; }
        if (!d.value) { warnings.push({ line: d.line, msg: `Vlastnost „${d.prop}“ nemá hodnotu.` }); continue; }
        const value = d.value.replace(/!\s*important\s*$/i, '').trim();
        if (!supports(d.prop, 'inherit') && !d.prop.startsWith('--')) {
          const s = suggestProp(d.prop);
          warnings.push({ line: d.line, msg: `Prohlížeč nezná vlastnost „${d.prop}“.${s ? ` Nemyslel(a) jsi „${s}“?` : ''}` });
          continue;
        }
        if (!supports(d.prop, value)) {
          let msg = `Hodnota „${value}“ není pro ${d.prop} platná – prohlížeč celý řádek ignoruje.`;
          if (/^-?\d+(\.\d+)?$/.test(value) && value !== '0' && supports(d.prop, value + 'px')) msg = `${d.prop}: ${value} – chybí jednotka! Správně třeba ${value}px.`;
          else if (/\n|:/.test(value)) msg = `Za hodnotou vlastnosti „${d.prop}“ nejspíš chybí středník „;“.`;
          warnings.push({ line: d.line, msg });
          continue;
        }
        decls++;             // počítají se jen platné deklarace – neplatné prohlížeč zahodí
        props.add(d.prop);
      }
    }
    return { decls, warnings, props: [...props] };
  }

  /* ------------------------------------------------------------------ *
   *  Scéna a fyzika
   * ------------------------------------------------------------------ */
  class Stage {
    constructor(frame, hooks) {
      this.frame = frame;
      this.hooks = hooks || {};
      this.s = null;
      this.raf = 0;
      this.inspecting = false;
    }

    load(level, css) {
      this.stop();
      this.level = level;
      return new Promise(resolve => {
        this.frame.onload = () => {
          this.doc = this.frame.contentDocument;
          this.win = this.frame.contentWindow;
          this.stageEl = this.doc.getElementById('stage');
          this.hero = this.doc.getElementById('hero');
          this.insp = this.doc.getElementById('insp');
          this.setCss(css);
          this.bindInspector();
          this.placeHero();
          resolve();
        };
        this.frame.srcdoc = docHtml(level);
      });
    }

    setCss(css) {
      if (!this.doc) return;
      this.doc.getElementById('player').textContent = css;
      this.css = css;
      if (!this.s || this.s.done) this.placeHero();
    }

    rectOf(el) {
      const r = el.getBoundingClientRect();
      return { el, l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
    }
    visible(el, r) {
      return r.w > 0.5 && r.h > 0.5 && this.win.getComputedStyle(el).visibility !== 'hidden';
    }
    collect() {
      const d = this.doc;
      const pick = sel => [...d.querySelectorAll('#stage ' + sel)].map(el => this.rectOf(el)).filter(r => this.visible(r.el, r));
      const solids = pick('.solid');
      const lifts = pick('.lift');
      const dangers = pick('.danger');
      const coins = pick('.coin');
      const flagEl = d.getElementById('flag');
      const byEl = new Map();
      [...solids, ...lifts].forEach(r => byEl.set(r.el, r));
      return { solids, lifts, dangers, coins, flag: flagEl ? this.rectOf(flagEl) : null, byEl };
    }

    placeHero() {
      if (!this.doc) return;
      const st = this.doc.getElementById('start');
      const r = this.rectOf(st);
      this.home = { x: r.l + (r.w - W) / 2, y: r.b - H };
      this.drawHero(this.home.x, this.home.y, 1, true);
      this.hero.className = 'right';
      this.doc.querySelectorAll('#stage .coin').forEach(c => c.style.removeProperty('visibility'));
    }

    drawHero(x, y) {
      this.hero.style.setProperty('transform', `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`, 'important');
    }

    /* ---------- běh ---------- */
    start(opts) {
      opts = opts || {};
      this.stop();
      this.placeHero();
      this.s = { x: this.home.x, y: this.home.y, vy: 0, dir: 1, grounded: true, ground: null, riding: false, t: 0, coins: new Set(), done: false, landT: 0, turns: 0,
        bestX: this.home.x, bestY: this.home.y, bestT: 0 };
      this.result = null;
      this.prev = new Map();
      this.acc = 0;
      this.motion = this.hasMotion();
      this.timeout = this.level.timeout || 22;
      this.hero.className = 'right';
      if (opts.sync) return this.simulate(opts.maxSeconds || this.timeout + 1);
      this.last = performance.now();
      const loop = now => {
        if (!this.s || this.s.done) return;
        if (!this.frame.isConnected) { this.stop(); return; }
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        this.frameStep(dt * (opts.speed || 1));
        if (!this.s.done) this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
      return null;
    }

    /* rychlá simulace bez animace (pro testy statických levelů) */
    simulate(maxSeconds) {
      let t = 0;
      while (this.s && !this.s.done && t < maxSeconds) { this.frameStep(1 / 60); t += 1 / 60; }
      return this.result;
    }

    stop() {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      if (this.s) this.s.done = true;
      this.releaseAnims();
    }

    /* CSS animace na scéně řídí hodiny simulace → stejný kód = vždy stejný výsledek */
    stageAnims() {
      if (!this.doc || !this.doc.getAnimations) return [];
      return this.doc.getAnimations().filter(a => a.effect && a.effect.target && this.stageEl.contains(a.effect.target));
    }
    syncAnims(t) {
      for (const a of this.stageAnims()) {
        if (a.playState !== 'paused') a.pause();
        a.currentTime = t * 1000;
      }
    }
    releaseAnims() {
      for (const a of this.stageAnims()) if (a.playState === 'paused') a.play();
    }
    /* hýbe se na scéně něco, co mění terén? (dekorace jako láva nebo mince se nepočítají) */
    hasMotion() {
      return this.stageAnims().some(a => !a.effect.pseudoElement && !a.effect.target.matches('.lava, .coin i'));
    }

    frameStep(dt) {
      const s = this.s;
      this.syncAnims(s.t);
      const w = this.collect();
      // pohyblivá plošina pod Pixelem ho veze s sebou; v jedoucím výtahu se Pixel otočí ke dveřím (doprava)
      s.riding = false;
      if (s.ground) {
        const cur = w.byEl.get(s.ground);
        const prev = this.prev.get(s.ground);
        if (cur && prev) {
          const dy = cur.t - prev.t;
          s.x += cur.l - prev.l;
          s.y += dy;
          if (Math.abs(dy) > 0.01 && s.ground.classList.contains('lift')) { s.riding = true; s.dir = 1; }
        }
      }
      // výtah, který vyjel zespodu, Pixela nabere
      for (const L of w.lifts) {
        const p = this.prev.get(L.el);
        if (!p) continue;
        const bottom = s.y + H;
        if (s.x + W > L.l + 1 && s.x < L.r - 1 && p.t >= bottom - 3 && L.t < bottom && L.t > bottom - 60) {
          s.y = L.t - H; s.vy = 0; s.grounded = true; s.ground = L.el;
        }
      }
      this.acc += dt;
      const STEP = 1 / 240;
      while (this.acc >= STEP && !s.done) { this.acc -= STEP; this.step(STEP, w); }
      this.prev = w.byEl;
      if (!s.done || this.result) {
        this.drawHero(s.x, s.y);
        if (!s.done) this.hero.className = (s.dir > 0 ? 'right' : 'left') + (s.grounded ? (s.t - s.landT < 0.12 ? ' land' : '') : ' air');
      }
      if (this.hooks.tick) this.hooks.tick(s);
    }

    overlap(o, x, y, inflate) {
      const e = inflate || 0;
      return x - e < o.r - 0.01 && x + W + e > o.l + 0.01 && y - e < o.b - 0.01 && y + H + e > o.t + 0.01;
    }
    blocked(w, x, y, except) {
      return w.solids.some(o => o !== except && this.overlap(o, x, y));
    }

    step(dt, w) {
      const s = this.s;
      s.t += dt;
      // vodorovně
      s.x += s.dir * SPEED * dt;
      for (const o of w.solids) {
        if (!this.overlap(o, s.x, s.y)) continue;
        const rise = s.y + H - o.t;
        const onLift = s.ground && s.ground.classList && s.ground.classList.contains('lift');
        if (s.grounded && rise > 0 && rise <= (onLift ? STEPUP_LIFT : STEPUP) && !this.blocked(w, s.x, o.t - H, o)) { s.y = o.t - H; continue; }
        const toLeft = s.x + W - o.l, toRight = o.r - s.x;
        if (toLeft < toRight) { s.x = o.l - W - 0.01; if (s.dir > 0 && !s.riding) { s.dir = -1; s.turns++; } }
        else { s.x = o.r + 0.01; if (s.dir < 0 && !s.riding) { s.dir = 1; s.turns++; } }
        break;
      }
      if (s.x < 0) { s.x = 0; if (s.dir < 0) { s.dir = 1; s.turns++; } }
      if (s.x + W > STAGE_W) { s.x = STAGE_W - W; if (s.dir > 0 && !s.riding) { s.dir = -1; s.turns++; } }
      // svisle
      const prevBottom = s.y + H, prevTop = s.y;
      const wasGrounded = s.grounded;
      s.vy = Math.min(MAXFALL, s.vy + GRAV * dt);
      s.y += s.vy * dt;
      s.grounded = false;
      s.ground = null;
      for (const o of w.solids) {
        if (!this.overlap(o, s.x, s.y)) continue;
        if (s.vy >= 0 && prevBottom <= o.t + 4) { s.y = o.t - H; s.vy = 0; s.grounded = true; s.ground = o.el; }
        else if (s.vy < 0 && prevTop >= o.b - 4) { s.y = o.b; s.vy = 0; }
        else if (s.y + H - o.t < H / 2) { s.y = o.t - H; s.vy = 0; s.grounded = true; s.ground = o.el; }
        else { const toL = s.x + W - o.l, toR = o.r - s.x; s.x = toL < toR ? o.l - W - 0.01 : o.r + 0.01; }
      }
      for (const o of w.lifts) {
        if (!(s.x + W > o.l + 1 && s.x < o.r - 1)) continue;
        if (s.vy >= 0 && prevBottom <= o.t + 4 && s.y + H >= o.t) { s.y = o.t - H; s.vy = 0; s.grounded = true; s.ground = o.el; }
      }
      if (!wasGrounded && s.grounded) { s.landT = s.t; if (this.hooks.land) this.hooks.land(s); }
      // nebezpečí, mince, cíl
      for (const o of w.dangers) {
        if (this.overlap(o, s.x, s.y, 2)) return this.end(false, o.el.classList.contains('spikes') ? 'spikes' : 'lava', o);
      }
      if (s.y > STAGE_H + 30) return this.end(false, 'fall');
      for (const o of w.coins) {
        if (!s.coins.has(o.el) && this.overlap(o, s.x, s.y)) {
          s.coins.add(o.el);
          o.el.style.setProperty('visibility', 'hidden', 'important');
          this.burst(o.l + 7, o.t + 7, '#facc15', 10);
          this.text(o.l, o.t, '+1');
          if (this.hooks.coin) this.hooks.coin(s);
        }
      }
      if (w.flag && this.overlap(w.flag, s.x, s.y)) return this.end(true, 'flag');
      if (s.x > s.bestX + 1 || s.y < s.bestY - 1) { s.bestX = Math.max(s.bestX, s.x); s.bestY = Math.min(s.bestY, s.y); s.bestT = s.t; }
      if (!this.motion && s.turns >= 4) return this.end(false, 'stuck');
      if (this.motion && s.t - s.bestT > 12) return this.end(false, 'stuck');
      if (s.t > this.timeout) return this.end(false, 'timeout');
      return null;
    }

    end(win, reason, obj) {
      const s = this.s;
      s.done = true;
      cancelAnimationFrame(this.raf);
      this.drawHero(s.x, s.y);
      this.hero.className = win ? 'win' : 'dead';
      if (!win) this.burst(s.x + W / 2, s.y + H / 2, reason === 'lava' ? '#f97316' : '#e2e8f0', 18);
      else this.burst(s.x + W / 2, s.y, '#4ade80', 24);
      this.releaseAnims();
      this.result = { win, reason, coins: s.coins.size, coinsTotal: this.doc.querySelectorAll('#stage .coin').length, time: s.t, x: s.x, turns: s.turns };
      if (this.hooks.end) this.hooks.end(this.result);
      return this.result;
    }

    burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const p = this.doc.createElement('i');
        p.className = 'fx';
        const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 30, size = 3 + Math.random() * 4;
        p.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
        this.doc.body.appendChild(p);
        setTimeout(() => p.remove(), 750);
      }
    }
    text(x, y, t) {
      const p = this.doc.createElement('b');
      p.className = 'fxt';
      p.textContent = t;
      p.style.cssText = `left:${x}px;top:${y - 6}px`;
      this.doc.body.appendChild(p);
      setTimeout(() => p.remove(), 1000);
    }

    /* ---------- inspektor box modelu (jako ve vývojářských nástrojích) ---------- */
    setInspector(on) {
      this.inspecting = on;
      if (this.doc) {
        this.doc.documentElement.classList.toggle('outline-all', on);
        if (!on) this.insp.innerHTML = '';
      }
    }
    bindInspector() {
      this.doc.addEventListener('mousemove', e => {
        if (!this.inspecting) return;
        const el = this.doc.elementFromPoint(e.clientX, e.clientY);
        if (!el || !this.stageEl.contains(el) || el === this.stageEl) { this.insp.innerHTML = ''; return; }
        this.showBox(el);
      });
      this.doc.addEventListener('mouseleave', () => { if (this.insp) this.insp.innerHTML = ''; });
    }
    showBox(el) {
      const cs = this.win.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const n = p => parseFloat(cs[p]) || 0;
      const m = { t: n('marginTop'), r: n('marginRight'), b: n('marginBottom'), l: n('marginLeft') };
      const b = { t: n('borderTopWidth'), r: n('borderRightWidth'), b: n('borderBottomWidth'), l: n('borderLeftWidth') };
      const p = { t: n('paddingTop'), r: n('paddingRight'), b: n('paddingBottom'), l: n('paddingLeft') };
      const box = (cls, x, y, w, h) => `<div class="bx ${cls}" style="left:${x}px;top:${y}px;width:${Math.max(0, w)}px;height:${Math.max(0, h)}px"></div>`;
      const name = el.id ? '#' + el.id : '.' + [...el.classList].join('.');
      const px = v => (Math.round(v * 10) / 10) + 'px';
      const info = `${el.tagName.toLowerCase()}${name !== '.' ? name : ''}  ${Math.round(r.width)} × ${Math.round(r.height)}\n` +
        `pozice: x ${Math.round(r.left)}, y ${Math.round(r.top)}\n` +
        `margin:  ${[m.t, m.r, m.b, m.l].map(px).join(' ')}\n` +
        `padding: ${[p.t, p.r, p.b, p.l].map(px).join(' ')}\n` +
        `display: ${cs.display}   position: ${cs.position}` + (cs.transform !== 'none' ? '\ntransform: ano' : '');
      const tagY = r.top > 110 ? r.top - m.t - 92 : r.bottom + m.b + 8;
      const tagX = Math.min(Math.max(4, r.left), STAGE_W - 280);
      this.insp.innerHTML =
        box('m', r.left - m.l, r.top - m.t, r.width + m.l + m.r, r.height + m.t + m.b) +
        box('b', r.left, r.top, r.width, r.height) +
        box('p', r.left + b.l, r.top + b.t, r.width - b.l - b.r, r.height - b.t - b.b) +
        box('c', r.left + b.l + p.l, r.top + b.t + p.t, r.width - b.l - b.r - p.l - p.r, r.height - b.t - b.b - p.t - p.b) +
        `<div class="tag" style="left:${tagX}px;top:${tagY}px">${info.replace(/[<>&]/g, '')}</div>`;
      if (this.hooks.inspect) this.hooks.inspect(el);
    }
  }

  global.ParkourEngine = { Stage, analyzeCss, parseCss, visibleHtml, lockCss, docHtml, SIZE: { W, H, STAGE_W, STAGE_H } };
})(typeof window !== 'undefined' ? window : globalThis);
