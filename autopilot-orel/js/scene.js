/*
 * Autopilot Orel – vykreslení letu (canvas): Měsíc, přistávací modul, plamen, prach, sonda
 * a graf telemetrie (výška, rychlost, tah v čase).
 */
(function (global) {
  'use strict';

  const S = global.OrelSim;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = () => global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* barvy scény (vesmír a Měsíc mají vlastní paletu nezávislou na motivu stránky) */
  const COL = {
    sky0: '#05070b', sky1: '#0d1119', star: '#dfe6f2',
    ground0: '#9a9ca0', ground1: '#55585e', groundLine: '#c4c6ca', crater: 'rgba(30,32,36,.45)', craterRim: 'rgba(225,227,231,.35)',
    pad: '#d7d9dc', padEdge: '#ffb020', gate: 'rgba(255,255,255,.5)', ok: '#79e08f', bad: '#ff5a4a', warn: '#ffb020',
    gold0: '#a8741f', gold1: '#e8b64c', gold2: '#ffe08a', cabin: '#c9ccd1', cabinDark: '#7d828a', ink: '#eceae4', muted: 'rgba(236,234,228,.6)'
  };

  /* ---------- přistávací modul (kreslený v pixelech, počátek = střed pod nohama) ---------- */
  function drawLander(ctx, o) {
    const { tah = 0, bok = 0, flick = 1, broken = false } = o;
    ctx.save();
    // plamen hlavního motoru
    if (tah > 0.5 && !broken) {
      const L = (10 + (tah / 100) * 52) * flick;
      const g = ctx.createLinearGradient(0, -7, 0, -7 + L);
      g.addColorStop(0, 'rgba(255,255,255,.95)');
      g.addColorStop(0.18, 'rgba(170,215,255,.9)');
      g.addColorStop(0.5, 'rgba(255,160,70,.55)');
      g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-5, -7);
      ctx.quadraticCurveTo(-9 - tah / 40, -7 + L * 0.45, 0, -7 + L);
      ctx.quadraticCurveTo(9 + tah / 40, -7 + L * 0.45, 5, -7);
      ctx.closePath();
      ctx.fill();
      const glow = ctx.createRadialGradient(0, -4, 1, 0, -4, 26 + tah / 4);
      glow.addColorStop(0, 'rgba(255,200,140,.35)');
      glow.addColorStop(1, 'rgba(255,160,80,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -4, 26 + tah / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    // boční trysky (výtok na opačné straně, než kam tlačí)
    if (Math.abs(bok) > 2 && !broken) {
      const dir = bok > 0 ? -1 : 1;
      const L = 4 + (Math.abs(bok) / 100) * 16 * flick;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(230,240,255,.85)';
      ctx.beginPath();
      ctx.moveTo(dir * 15, -37);
      ctx.lineTo(dir * (15 + L), -40.5);
      ctx.lineTo(dir * (15 + L), -33.5);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    // nohy
    ctx.strokeStyle = '#b9bcc2';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-14, -20); ctx.lineTo(-23, -2);
    ctx.moveTo(14, -20); ctx.lineTo(23, -2);
    ctx.moveTo(-12, -14); ctx.lineTo(-23, -2);
    ctx.moveTo(12, -14); ctx.lineTo(23, -2);
    ctx.stroke();
    ctx.strokeStyle = '#8b8f96';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-7, -14); ctx.lineTo(-11, -3);
    ctx.moveTo(7, -14); ctx.lineTo(11, -3);
    ctx.stroke();
    ctx.fillStyle = '#d4d6da';
    [[-23, -1.5, 5], [23, -1.5, 5], [-11, -2, 3], [11, -2, 3]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.ellipse(x, y, r, 1.6, 0, 0, Math.PI * 2); ctx.fill(); });
    // tryska
    ctx.fillStyle = '#4b4f56';
    ctx.beginPath();
    ctx.moveTo(-4, -13); ctx.lineTo(4, -13); ctx.lineTo(6.5, -6.5); ctx.lineTo(-6.5, -6.5);
    ctx.closePath();
    ctx.fill();
    // sestupový stupeň – zlatá fólie
    const gg = ctx.createLinearGradient(-17, -27, 17, -12);
    gg.addColorStop(0, COL.gold0);
    gg.addColorStop(0.35, COL.gold2);
    gg.addColorStop(0.55, COL.gold1);
    gg.addColorStop(1, COL.gold0);
    ctx.fillStyle = broken ? '#5d4a2c' : gg;
    ctx.beginPath();
    ctx.moveTo(-13, -28); ctx.lineTo(13, -28); ctx.lineTo(17, -24); ctx.lineTo(17, -15); ctx.lineTo(13, -12); ctx.lineTo(-13, -12); ctx.lineTo(-17, -15); ctx.lineTo(-17, -24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,10,.55)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-9, -27); ctx.lineTo(-7, -13);
    ctx.moveTo(3, -27); ctx.lineTo(1, -13);
    ctx.moveTo(10, -27); ctx.lineTo(12, -13);
    ctx.stroke();
    // výstupní stupeň (kabina)
    ctx.fillStyle = broken ? '#55585e' : COL.cabin;
    ctx.beginPath();
    ctx.moveTo(-12, -28); ctx.lineTo(-14, -37); ctx.lineTo(-7, -45); ctx.lineTo(7, -45); ctx.lineTo(14, -38); ctx.lineTo(12, -28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = broken ? '#3f4247' : COL.cabinDark;
    ctx.beginPath();
    ctx.moveTo(2, -45); ctx.lineTo(7, -45); ctx.lineTo(14, -38); ctx.lineTo(12, -28); ctx.lineTo(4, -28);
    ctx.closePath();
    ctx.fill();
    // okno
    ctx.fillStyle = '#121418';
    ctx.beginPath();
    ctx.moveTo(-9, -40); ctx.lineTo(-4, -41); ctx.lineTo(-5, -35); ctx.closePath();
    ctx.fill();
    // anténa
    ctx.strokeStyle = '#d4d6da';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(6, -45); ctx.lineTo(9, -51);
    ctx.stroke();
    ctx.fillStyle = '#e6e8eb';
    ctx.beginPath();
    ctx.ellipse(10, -52, 3.6, 1.6, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- hvězdy (pevné, deterministické) ---------- */
  function makeStars(n) {
    const r = S.rng(42);
    return Array.from({ length: n }, () => ({ x: r(), y: r(), s: r() < 0.08 ? 1.6 : r() < 0.4 ? 1.1 : 0.7, a: 0.35 + r() * 0.65 }));
  }
  const STARS = makeStars(140);

  /* krátery na rovině – deterministicky podle polohy */
  function cratersBetween(x1, x2) {
    const out = [];
    const cell = 46;
    for (let c = Math.floor(x1 / cell) - 1; c <= Math.ceil(x2 / cell) + 1; c++) {
      const r = S.rng((c * 2654435761) >>> 0);
      r(); r();
      if (r() < 0.55) out.push({ x: c * cell + r() * cell, w: 3 + r() * 11, d: r() });
    }
    return out;
  }

  /* ---------- scéna letu ---------- */
  class FlightView {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.parts = [];
      this.shake = 0;
      this.lastT = null;
      this.lastReal = 0;
      this.endFx = false;
      this.cam = null;
      this.resize();
    }
    resize() {
      const r = this.cv.getBoundingClientRect();
      const dpr = Math.min(2, global.devicePixelRatio || 1);
      const w = Math.max(10, Math.round(r.width));
      const h = Math.max(10, Math.round(r.height));
      if (this.cv.width !== Math.round(w * dpr) || this.cv.height !== Math.round(h * dpr)) {
        this.cv.width = Math.round(w * dpr);
        this.cv.height = Math.round(h * dpr);
      }
      this.W = w;
      this.H = h;
      this.dpr = dpr;
    }
    /* nastaví let k přehrání: level, scénář (terén, cíl…), výsledek simulace */
    set(level, flight, res) {
      this.level = level;
      this.fl = flight;
      this.res = res;
      this.ground = S.makeGround(flight);
      this.R = Object.assign({ goal: 'land' }, level.rules, flight.rules);
      this.parts = [];
      this.endFx = false;
      this.shake = 0;
      this.cam = null;
      this.lastT = null;
    }
    /* stav v čase t (lineární interpolace mezi snímky po 0,1 s) */
    stateAt(t) {
      const F = this.res.frames;
      if (!F.length) return null;
      if (t <= F[0][0]) return F[0].slice();
      const last = F[F.length - 1];
      if (t >= last[0]) return last.slice();
      let lo = 0;
      let hi = F.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (F[m][0] <= t) lo = m; else hi = m; }
      const a = F[lo];
      const b = F[hi];
      const u = (t - a[0]) / (b[0] - a[0] || 1);
      const s = a.map((v, i) => (i === 5 || i === 6 ? v : lerp(v, b[i] !== undefined ? b[i] : v, u)));
      if (a.length > 8 && b.length <= 8) { s.length = 8; }
      if (a.length <= 8 && b.length > 8) { s[8] = b[8]; s[9] = b[9]; }
      return s;
    }
    get duration() { const F = this.res && this.res.frames; return F && F.length ? F[F.length - 1][0] : 0; }

    w2s(x, h) {
      const c = this.cam;
      return [this.W / 2 + (x - c.x) * c.k, this.H - c.mb - (h - c.base) * c.k];
    }

    draw(t) {
      this.resize();
      const ctx = this.ctx;
      const { W, H, dpr } = this;
      const now = performance.now();
      const realDt = this.lastReal ? Math.min(0.05, (now - this.lastReal) / 1000) : 0.016;
      this.lastReal = now;
      if (this.lastT !== null && t < this.lastT - 0.05) { this.parts = []; this.endFx = false; }
      const s = this.stateAt(t);
      if (!s) return;
      const [, h, , x, , tah, bok] = s;
      const end = t >= this.duration - 1e-6;
      const res = this.res;
      const R = this.R;
      const g = this.ground;

      /* kamera: sleduje modul (po uvolnění sondu), přiblíží se u povrchu */
      let fx = x;
      let fh = h;
      const probe = s.length > 8 ? { x: s[8], h: s[9] } : null;
      if (probe && res.probe) { fx = lerp(x, probe.x, 0.6); fh = Math.max(h, probe.h); }
      if (R.goal === 'drop' && !probe) fx = lerp(x, Math.min(x + 60, 0), 0.35);
      const gHere = g(fx);
      const above = Math.max(0, fh - gHere);
      const mb = Math.max(34, H * 0.11);
      const mt = 70;
      const kT = clamp((H - mb - mt) / (above + 28), 0.1, 5.2);
      const baseT = gHere;
      if (!this.cam || Math.abs(t - (this.lastT || 0)) > 1.5) this.cam = { x: fx, k: kT, base: baseT, mb };
      else {
        const a = 1 - Math.pow(0.0006, realDt);
        this.cam.x = lerp(this.cam.x, fx, Math.min(1, a * 3));
        this.cam.k = lerp(this.cam.k, kT, a);
        this.cam.base = lerp(this.cam.base, baseT, a);
        this.cam.mb = mb;
      }
      this.lastT = t;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this.shake > 0.01) {
        ctx.translate((Math.random() - 0.5) * this.shake * 8, (Math.random() - 0.5) * this.shake * 8);
        this.shake *= Math.pow(0.02, realDt);
      }
      /* obloha */
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, COL.sky0);
      sky.addColorStop(1, COL.sky1);
      ctx.fillStyle = sky;
      ctx.fillRect(-20, -20, W + 40, H + 40);
      const par = this.cam.x * 0.03;
      STARS.forEach(st => {
        const sx = ((st.x * W * 1.3 - par) % (W * 1.3) + W * 1.3) % (W * 1.3) - W * 0.15;
        ctx.globalAlpha = st.a;
        ctx.fillStyle = COL.star;
        ctx.fillRect(sx, st.y * H * 0.85, st.s, st.s);
      });
      ctx.globalAlpha = 1;
      this.drawEarth(ctx, W - 54, 50, Math.min(22, W * 0.04));

      /* povrch */
      const k = this.cam.k;
      const xL = this.cam.x - (W / 2 + 40) / k;
      const xR = this.cam.x + (W / 2 + 40) / k;
      const step = Math.max(1, Math.min(10, 4 / k));
      ctx.beginPath();
      let first = true;
      for (let wx = xL; wx <= xR + step; wx += step) {
        const [sx, sy] = this.w2s(wx, g(wx));
        if (first) { ctx.moveTo(sx, sy); first = false; } else ctx.lineTo(sx, sy);
      }
      ctx.lineTo(W + 40, H + 40);
      ctx.lineTo(-40, H + 40);
      ctx.closePath();
      const gr = ctx.createLinearGradient(0, this.w2s(0, this.cam.base)[1] - 40, 0, H);
      gr.addColorStop(0, COL.ground0);
      gr.addColorStop(1, COL.ground1);
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.strokeStyle = COL.groundLine;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // krátery (jen na rovině)
      if (!this.fl.terrain || R.pad) {
        cratersBetween(xL, xR).forEach(c => {
          if (this.fl.terrain && g(c.x) > 0.4) return;
          if (R.pad && Math.abs(c.x - R.pad.x) < R.pad.w) return;
          const [sx, sy] = this.w2s(c.x, g(c.x));
          const rw = c.w * k;
          if (rw < 1.2) return;
          ctx.fillStyle = COL.crater;
          ctx.beginPath();
          ctx.ellipse(sx, sy + rw * 0.28 + 2, rw, rw * 0.22, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = COL.craterRim;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(sx, sy + rw * 0.28 + 2, rw, rw * 0.22, 0, Math.PI * 0.05, Math.PI * 0.95);
          ctx.stroke();
        });
      }
      this.drawMarks(ctx, t, s);

      /* stupnice výšky vlevo */
      this.drawLadder(ctx, h);

      /* částice: prach z motoru */
      const gl = g(x);
      if (!reduced() && tah > 5 && h - gl < 28 && !end) {
        const n = Math.round((tah / 100) * 5 * (1 - (h - gl) / 28) + 1);
        for (let i = 0; i < n; i++) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          this.parts.push({ x: x + dir * Math.random() * 2, h: gl + 0.2, vx: dir * (6 + Math.random() * 14), vh: Math.random() * 2.5, life: 0.9 + Math.random() * 0.8, age: 0, c: 'dust', r: 1 + Math.random() * 1.8 });
        }
      }
      /* konec letu: exploze / prach dosednutí / dopad sondy */
      if (end && !this.endFx) {
        this.endFx = true;
        if (res.touch && !res.ok && res.reason !== 'offpad') this.boom(x, gl);
        if (res.probe && res.probe.hit !== undefined) this.impact(res.probe.hit + (this.fl.target || 0));
      }
      this.updateParts(ctx, realDt);

      /* sonda: stopa letu a pouzdro */
      if (probe) {
        ctx.fillStyle = 'rgba(255,176,32,.55)';
        const F = res.frames;
        for (let i = 0; i < F.length && F[i][0] <= t; i += 3) {
          if (F[i].length <= 8) continue;
          const [tx, ty] = this.w2s(F[i][8], F[i][9]);
          ctx.beginPath();
          ctx.arc(tx, ty, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        const [px, py] = this.w2s(probe.x, probe.h);
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(1.5, 1.5);
        ctx.fillStyle = '#eef0f3';
        ctx.beginPath();
        ctx.moveTo(0, 6); ctx.lineTo(3.2, 1); ctx.lineTo(3.2, -6); ctx.lineTo(-3.2, -6); ctx.lineTo(-3.2, 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = COL.warn;
        ctx.fillRect(-3.2, -4, 6.4, 2.2);
        ctx.strokeStyle = '#b9bcc2';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-3.2, -6); ctx.lineTo(-5.5, -9); ctx.moveTo(3.2, -6); ctx.lineTo(5.5, -9);
        ctx.stroke();
        ctx.restore();
      }

      /* modul */
      const [lx, ly] = this.w2s(x, h);
      const crashed = end && res.touch && !res.ok && ['crash', 'tipped'].includes(res.reason);
      const tipped = end && res.reason === 'tipped';
      const sc = clamp(0.62 + k * 0.1, 0.7, 1.15) * (W < 520 ? 0.85 : 1);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.scale(sc, sc);
      if (tipped) { ctx.translate(res.touch.vx > 0 ? 22 : -22, 0); ctx.rotate(res.touch.vx >= 0 ? 1.25 : -1.25); ctx.translate(res.touch.vx > 0 ? -22 : 22, 0); }
      else if (crashed) { ctx.rotate(0.35); ctx.translate(0, 6); }
      drawLander(ctx, { tah: end ? 0 : tah, bok: end ? 0 : bok, flick: 0.86 + Math.random() * 0.22, broken: crashed });
      ctx.restore();
      if (crashed && !reduced() && Math.random() < 0.3) this.parts.push({ x: x + (Math.random() - 0.5) * 3, h: gl + 1, vx: (Math.random() - 0.5) * 2, vh: 2 + Math.random() * 2, life: 1.6, age: 0, c: 'smoke', r: 3 });

      /* šipka k ploše, když je mimo obraz */
      if (R.pad) {
        const [px] = this.w2s(R.pad.x, 0);
        if (px < 12 || px > W - 12) {
          const right = px > W - 12;
          const dist = Math.abs(R.pad.x - x);
          ctx.fillStyle = COL.padEdge;
          ctx.font = '700 13px "DM Sans", sans-serif';
          ctx.textAlign = right ? 'right' : 'left';
          ctx.fillText(right ? `plocha ${Math.round(dist)} m ▶` : `◀ plocha ${Math.round(dist)} m`, right ? W - 12 : 50, H - 12);
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    drawEarth(ctx, x, y, r) {
      ctx.save();
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
      g.addColorStop(0, '#7fb6ff');
      g.addColorStop(1, '#1f4f9a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#f2f6fb';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.2, y - r * 0.35, r * 0.5, r * 0.14, -0.3, 0, Math.PI * 2);
      ctx.ellipse(x + r * 0.25, y + r * 0.2, r * 0.38, r * 0.1, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(5,7,11,.72)';
      ctx.beginPath();
      ctx.arc(x, y, r + 0.5, -Math.PI / 2, Math.PI / 2);
      ctx.ellipse(x, y, r * 0.35, r + 0.5, 0, Math.PI / 2, -Math.PI / 2, true);
      ctx.fill();
      ctx.restore();
    }

    /* značky úrovní: přistávací plocha, kontroly výšky, vybrané místo, cíl sondy */
    drawMarks(ctx, t, s) {
      const R = this.R;
      const res = this.res;
      const W = this.W;
      ctx.save();
      ctx.font = '700 12px "DM Sans", sans-serif';
      if (R.pad) {
        const [a, ya] = this.w2s(R.pad.x - R.pad.w / 2, this.ground(R.pad.x));
        const [b] = this.w2s(R.pad.x + R.pad.w / 2, 0);
        ctx.fillStyle = COL.pad;
        ctx.fillRect(a, ya - 2, b - a, 4);
        const blink = Math.floor(performance.now() / 500) % 2 === 0;
        ctx.fillStyle = blink ? COL.padEdge : 'rgba(255,176,32,.35)';
        [a, b].forEach(px => { ctx.beginPath(); ctx.arc(px, ya - 4, 3, 0, Math.PI * 2); ctx.fill(); });
        if (b - a > 26) { ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.fillText('PLOCHA', (a + b) / 2, ya + 18); }
      }
      if (R.gates) {
        const passed = res.gatesPassed || [];
        R.gates.forEach(gt => {
          const [, gy] = this.w2s(0, gt.h);
          if (gy < 8 || gy > this.H) return;
          const reached = s[1] <= gt.h + 0.01;
          const failed = res.reason === 'gate' && !passed.includes(gt.h) && reached;
          ctx.strokeStyle = !reached ? COL.gate : failed ? COL.bad : COL.ok;
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(44, gy);
          ctx.lineTo(W, gy);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.textAlign = 'right';
          ctx.fillText(`kontrola ${gt.h} m · max ${String(gt.v).replace('.', ',')} m/s${reached ? (failed ? ' ✘' : ' ✔') : ''}`, W - 10, gy - 6);
        });
      }
      if (this.level.io === 'pick' && res.pick !== null && res.pick !== undefined) {
        const i = res.pick;
        const x0 = this.fl.x0 || 0;
        const T = this.fl.terrain;
        const [ax, ay] = this.w2s(x0 + i * 10, T[i]);
        const [bx, by] = this.w2s(x0 + (i + 1) * 10, T[i + 1]);
        const safe = Math.abs(T[i + 1] - T[i]) <= (R.slopeMax || 1);
        ctx.strokeStyle = safe ? COL.ok : COL.bad;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.textAlign = 'center';
        ctx.fillText(`místo č. ${i}`, (ax + bx) / 2, Math.max(ay, by) + 18);
      }
      if (R.goal === 'drop') {
        const tx = this.fl.target || 0;
        const [cx, cy] = this.w2s(tx, this.ground(tx));
        const rw = Math.max(10, 6 * this.cam.k);
        ctx.strokeStyle = COL.warn;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 3, rw, rw * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy - 26);
        ctx.stroke();
        ctx.fillStyle = COL.warn;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 26); ctx.lineTo(cx + 14, cy - 21); ctx.lineTo(cx, cy - 16);
        ctx.closePath();
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.fillText('CÍL', cx, cy + 22);
      }
      ctx.restore();
    }

    drawLadder(ctx, h) {
      const k = this.cam.k;
      const H = this.H;
      const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500];
      const st = steps.find(v => v * k >= 34) || 1000;
      ctx.save();
      ctx.fillStyle = 'rgba(5,7,11,.55)';
      ctx.fillRect(0, 0, 40, H);
      ctx.font = '600 10.5px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.strokeStyle = 'rgba(236,234,228,.4)';
      ctx.fillStyle = COL.muted;
      const base = this.cam.base;
      const hTop = base + (H - this.cam.mb) / k;
      for (let v = Math.ceil(base / st) * st; v <= hTop; v += st) {
        const [, y] = this.w2s(0, v);
        if (y < 10 || y > H - 4) continue;
        ctx.beginPath();
        ctx.moveTo(32, y);
        ctx.lineTo(40, y);
        ctx.stroke();
        ctx.fillText(String(Math.round(v)), 4, y + 4);
      }
      const [, ly] = this.w2s(0, h);
      ctx.fillStyle = '#79e08f';
      ctx.beginPath();
      ctx.moveTo(40, ly); ctx.lineTo(47, ly - 5); ctx.lineTo(47, ly + 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    boom(x, gh) {
      this.shake = 1;
      if (reduced()) return;
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI;
        const sp = 4 + Math.random() * 22;
        this.parts.push({ x, h: gh + 2, vx: Math.cos(a) * sp, vh: Math.sin(a) * sp, life: 0.8 + Math.random() * 1.4, age: 0, c: i % 3 ? 'fire' : 'debris', r: 1.5 + Math.random() * 3, g: true });
      }
    }
    impact(x) {
      if (reduced()) return;
      const gh = this.ground(x);
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI;
        const sp = 3 + Math.random() * 12;
        this.parts.push({ x, h: gh + 0.5, vx: Math.cos(a) * sp, vh: Math.sin(a) * sp, life: 1 + Math.random(), age: 0, c: 'dust', r: 1.5 + Math.random() * 2, g: true });
      }
      this.parts.push({ x, h: gh, ring: true, age: 0, life: 2.2 });
    }
    updateParts(ctx, dt) {
      const k = this.cam.k;
      this.parts = this.parts.filter(p => (p.age += dt) < p.life);
      if (this.parts.length > 600) this.parts.splice(0, this.parts.length - 600);
      this.parts.forEach(p => {
        if (p.ring) {
          const [sx, sy] = this.w2s(p.x, p.h);
          const u = p.age / p.life;
          ctx.strokeStyle = `rgba(255,176,32,${0.8 * (1 - u)})`;
          ctx.lineWidth = 2;
          for (let j = 0; j < 3; j++) {
            const rr = (u * 60 + j * 16) * Math.max(0.6, k / 2);
            ctx.beginPath();
            ctx.ellipse(sx, sy, rr, rr * 0.22, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          return;
        }
        p.x += p.vx * dt;
        p.h += p.vh * dt;
        p.vh -= (p.g ? 1.62 * 4 : 0.3) * dt;
        const gh = this.ground(p.x);
        if (p.h < gh) { p.h = gh; p.vh = 0; p.vx *= 0.9; }
        const [sx, sy] = this.w2s(p.x, p.h);
        const u = p.age / p.life;
        if (p.c === 'dust') ctx.fillStyle = `rgba(200,202,206,${0.55 * (1 - u)})`;
        else if (p.c === 'smoke') ctx.fillStyle = `rgba(120,122,128,${0.35 * (1 - u)})`;
        else if (p.c === 'fire') ctx.fillStyle = `rgba(255,${Math.round(190 - u * 120)},70,${1 - u})`;
        else ctx.fillStyle = `rgba(232,182,76,${1 - u})`;
        ctx.beginPath();
        ctx.arc(sx, sy, p.r * (p.c === 'smoke' ? 1 + u * 2 : 1), 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  /* ---------- graf telemetrie ---------- */
  class Graph {
    constructor(canvas) { this.cv = canvas; this.ctx = canvas.getContext('2d'); }
    set(level, flight, res) {
      this.level = level;
      this.res = res;
      this.R = Object.assign({}, level.rules, flight.rules);
      const F = res.frames;
      this.T = F.length ? Math.max(1, F[F.length - 1][0]) : 1;
      const h0 = S.makeGround(flight);
      this.alt = F.map(f => f[1] - h0(f[3]));
      this.hMax = Math.max(10, ...this.alt) * 1.08;
      this.vMax = Math.max(4, ...F.map(f => Math.abs(f[2])), (this.R.maxTouch || 3) * 1.6) * 1.1;
    }
    draw(t) {
      const cv = this.cv;
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, global.devicePixelRatio || 1);
      const W = Math.max(10, Math.round(r.width));
      const H = Math.max(10, Math.round(r.height));
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const ctx = this.ctx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (!this.res) return;
      const F = this.res.frames;
      const padL = 6;
      const padR = 6;
      const top = 16;
      const bot = H - 4;
      const X = tt => padL + (tt / this.T) * (W - padL - padR);
      const Yh = v => bot - (v / this.hMax) * (bot - top);
      const Yv = v => bot - ((v + this.vMax * 0.15) / (this.vMax * 1.15)) * (bot - top);
      // tah jako plocha
      ctx.fillStyle = 'rgba(255,176,32,.16)';
      ctx.beginPath();
      ctx.moveTo(X(0), bot);
      F.forEach(f => ctx.lineTo(X(f[0]), bot - (f[5] / 100) * (bot - top) * 0.5));
      ctx.lineTo(X(F[F.length - 1][0]), bot);
      ctx.closePath();
      ctx.fill();
      // limit dosednutí
      const lim = this.R.maxTouch;
      if (lim && this.R.goal !== 'climb' && this.R.goal !== 'drop') {
        ctx.strokeStyle = 'rgba(255,90,74,.5)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(X(0), Yv(lim));
        ctx.lineTo(W - padR, Yv(lim));
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const line = (vals, Y, color, w) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        vals.forEach((v, i) => { const xx = X(F[i][0]); if (i) ctx.lineTo(xx, Y(v)); else ctx.moveTo(xx, Y(v)); });
        ctx.stroke();
      };
      line(this.alt, Yh, '#9ecbff', 2);
      line(F.map(f => f[2]), Yv, '#79e08f', 2);
      if (this.res.estSeries && this.res.estSeries.length) {
        ctx.strokeStyle = '#ff7ad9';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        this.res.estSeries.forEach(([tt, v], i) => { const xx = X(tt); const yy = Yv(clamp(v, -this.vMax * 0.15, this.vMax)); if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); });
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // ukazatel času
      const px = X(Math.min(t, this.T));
      ctx.strokeStyle = 'rgba(236,234,228,.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, top - 6);
      ctx.lineTo(px, bot);
      ctx.stroke();
      // legenda
      ctx.font = '700 11px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      let lx = padL + 2;
      const leg = (txt, c) => { ctx.fillStyle = c; ctx.fillRect(lx, 5, 10, 3); ctx.fillStyle = 'rgba(236,234,228,.75)'; ctx.fillText(txt, lx + 14, 11); lx += ctx.measureText(txt).width + 28; };
      leg('výška', '#9ecbff');
      leg('rychlost klesání', '#79e08f');
      leg('tah', 'rgba(255,176,32,.7)');
      if (this.res.estSeries && this.res.estSeries.length) leg('tvůj odhad', '#ff7ad9');
      if (lim && this.R.goal !== 'climb' && this.R.goal !== 'drop') leg('limit dosednutí', 'rgba(255,90,74,.8)');
    }
  }

  global.OrelScene = { FlightView, Graph, drawLander };
})(typeof window !== 'undefined' ? window : globalThis);
