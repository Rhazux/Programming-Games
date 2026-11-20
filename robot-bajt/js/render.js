/*
 * Robot Bajt – grafika a přehrávání programu
 * WorldView kreslí mapu na canvas, Player přehrává události z běhu programu jako animaci.
 */
(function (global) {
  'use strict';

  const { parseSpec, key } = global.BajtWorld;
  const TAU = Math.PI * 2;
  const DIR_ANGLE = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  class WorldView {
    constructor(canvas, overlay) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.overlay = overlay; // DOM vrstva pro bubliny
      this.tile = 40;
      this.particles = [];
      this.texts = [];
      this.beams = [];
      this.shake = 0;
      this.badge = null;
      this.mood = 'normal';
      this.moodUntil = 0;
      this.maxHeight = 520;
    }

    setSpec(spec) {
      this.spec = spec;
      const w = parseSpec(spec);
      this.cols = w.w;
      this.rows = w.h;
      this.walls = w.walls;
      this.goal = w.goal;
      this.lasers = w.lasers;
      this.reset();
      this.resize();
    }

    /* Vizuální stav na začátku programu */
    reset() {
      const w = parseSpec(this.spec);
      this.bits = new Set(w.bits);
      this.bugs = w.bugs.map(b => ({ ...b, flash: 0, dying: 0 }));
      this.robot = { x: w.robot.x, y: w.robot.y, px: w.robot.x, py: w.robot.y, dir: w.robot.dir, angle: DIR_ANGLE[w.robot.dir], squash: 0, bump: null };
      this.tick = 0;
      this.energy = 0;
      this.collected = 0;
      this.particles = [];
      this.texts = [];
      this.beams = [];
      this.badge = null;
      this.mood = 'normal';
      this.hideBubble();
    }

    resize() {
      if (!this.cols) return;
      const parent = this.canvas.closest('.world-wrap') || this.canvas.parentElement;
      const avail = Math.max(200, parent.clientWidth);
      const maxH = this.maxHeight;
      const tile = Math.max(18, Math.min(64, Math.floor(Math.min(avail / this.cols, maxH / this.rows))));
      this.tile = tile;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = this.cols * tile, ch = this.rows * tile;
      this.canvas.width = Math.round(cw * dpr);
      this.canvas.height = Math.round(ch * dpr);
      this.canvas.style.width = cw + 'px';
      this.canvas.style.height = ch + 'px';
      this.dpr = dpr;
      this.buildStatic();
    }

    /* Statická vrstva: podlaha, plošné spoje, zdi */
    buildStatic() {
      const t = this.tile;
      const off = document.createElement('canvas');
      off.width = this.canvas.width;
      off.height = this.canvas.height;
      const c = off.getContext('2d');
      c.scale(this.dpr, this.dpr);
      // deska plošných spojů: zelená nepájivá maska, měděné cesty, prokovy
      c.fillStyle = '#0a3d30';
      c.fillRect(0, 0, this.cols * t, this.rows * t);
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          const px = x * t, py = y * t;
          if (this.walls.has(key(x, y))) continue;
          c.fillStyle = (x + y) % 2 ? '#0e5240' : '#0d4c3b';
          c.fillRect(px, py, t, t);
          c.strokeStyle = 'rgba(0, 0, 0, 0.16)';
          c.lineWidth = 1;
          c.strokeRect(px + 0.5, py + 0.5, t - 1, t - 1);
          const h = hash(x, y);
          c.strokeStyle = 'rgba(232, 168, 64, 0.42)';
          c.lineWidth = Math.max(1.2, t * 0.055);
          c.lineCap = 'round';
          c.beginPath();
          if (h < 0.35) { c.moveTo(px, py + t * 0.3); c.lineTo(px + t * 0.5, py + t * 0.3); c.lineTo(px + t * 0.72, py + t * 0.08); }
          else if (h < 0.6) { c.moveTo(px + t * 0.25, py + t); c.lineTo(px + t * 0.25, py + t * 0.62); c.lineTo(px + t * 0.62, py + t * 0.62); }
          else if (h < 0.72) { c.moveTo(px, py + t * 0.78); c.lineTo(px + t, py + t * 0.78); }
          c.stroke();
          if (h > 0.8 || (h > 0.35 && h < 0.4)) {
            const vx = h > 0.8 ? px + t * 0.7 : px + t * 0.62, vy = h > 0.8 ? py + t * 0.7 : py + t * 0.62;
            c.fillStyle = 'rgba(232, 168, 64, 0.75)';
            c.beginPath(); c.arc(vx, vy, t * 0.085, 0, TAU); c.fill();
            c.fillStyle = '#0a3d30';
            c.beginPath(); c.arc(vx, vy, t * 0.035, 0, TAU); c.fill();
          }
        }
      }
      // zdi = černé čipy s cínovanými vývody
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          if (!this.walls.has(key(x, y))) continue;
          const px = x * t, py = y * t;
          c.fillStyle = '#0a2f25';
          c.fillRect(px, py, t, t);
          const pin = Math.max(1.5, t * 0.07);
          c.fillStyle = '#b9c4be';
          for (let i = 0; i < 3; i++) {
            const ox = px + t * (0.22 + i * 0.28) - pin / 2;
            c.fillRect(ox, py + t * 0.03, pin, t * 0.12);
            c.fillRect(ox, py + t * 0.85, pin, t * 0.12);
          }
          const g = c.createLinearGradient(px, py, px, py + t);
          g.addColorStop(0, '#26302c');
          g.addColorStop(1, '#121816');
          c.fillStyle = g;
          roundRect(c, px + t * 0.06, py + t * 0.14, t * 0.88, t * 0.72, t * 0.07);
          c.fill();
          c.fillStyle = 'rgba(255, 255, 255, 0.07)';
          c.fillRect(px + t * 0.1, py + t * 0.16, t * 0.8, Math.max(1, t * 0.04));
          c.fillStyle = 'rgba(243, 244, 234, 0.55)';
          c.beginPath(); c.arc(px + t * 0.2, py + t * 0.3, Math.max(1, t * 0.04), 0, TAU); c.fill();
        }
      }
      this.staticLayer = off;
    }

    /* ---------- efekty ---------- */
    burst(x, y, color, n, speed) {
      const t = this.tile;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const v = (0.5 + Math.random()) * (speed || 2.2) * t;
        this.particles.push({ x: (x + 0.5) * t, y: (y + 0.5) * t, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + Math.random() * 0.4, max: 1, color, size: t * (0.05 + Math.random() * 0.06) });
      }
    }
    floatText(x, y, text, color) {
      this.texts.push({ x: (x + 0.5) * this.tile, y: (y + 0.2) * this.tile, text, color: color || '#fff', life: 1 });
    }
    setMood(m, ms) { this.mood = m; this.moodUntil = performance.now() + (ms || 900); }

    bubble(text, kind) {
      if (!this.overlay) return;
      let b = this.overlay.querySelector('.bubble');
      if (!b) { b = document.createElement('div'); b.className = 'bubble'; this.overlay.appendChild(b); }
      b.textContent = text;
      b.className = 'bubble show' + (kind ? ' ' + kind : '');
      this.bubbleUntil = performance.now() + 1600;
      this.positionBubble();
    }
    hideBubble() {
      const b = this.overlay && this.overlay.querySelector('.bubble');
      if (b) b.className = 'bubble';
    }
    positionBubble() {
      const b = this.overlay && this.overlay.querySelector('.bubble.show');
      if (!b) return;
      const t = this.tile;
      const x = (this.robot.px + 0.5) * t;
      const y = this.robot.py * t;
      b.style.left = x + 'px';
      b.style.top = y + 'px';
      b.classList.toggle('below', this.robot.py < 1.5);
      if (this.robot.py < 1.5) b.style.top = (this.robot.py + 1) * t + 'px';
    }

    /* ---------- kreslení ---------- */
    draw(now) {
      const ctx = this.ctx;
      const t = this.tile;
      const time = now / 1000;
      if (!this.staticLayer) return;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.cols * t, this.rows * t);
      ctx.save();
      if (this.shake > 0) {
        const s = this.shake * t * 0.12;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      }
      ctx.drawImage(this.staticLayer, 0, 0, this.cols * t, this.rows * t);
      this.drawLeds(ctx, time);
      if (this.goal) this.drawGoal(ctx, this.goal.x, this.goal.y, time);
      for (const l of this.lasers) this.drawLaser(ctx, l, time);
      for (const k of this.bits) {
        const [x, y] = k.split(',').map(Number);
        this.drawBit(ctx, x, y, time);
      }
      for (const b of this.bugs) if (b.hp > 0 || b.dying > 0) this.drawBug(ctx, b, time);
      this.drawBeams(ctx);
      this.drawRobot(ctx, time);
      this.drawParticles(ctx);
      ctx.restore();
      if (this.mood !== 'normal' && now > this.moodUntil) this.mood = 'normal';
      if (this.bubbleUntil && now > this.bubbleUntil) { this.hideBubble(); this.bubbleUntil = 0; }
      this.positionBubble();
    }

    update(dt) {
      this.shake = Math.max(0, this.shake - dt * 3);
      for (const p of this.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.life -= dt;
      }
      this.particles = this.particles.filter(p => p.life > 0);
      for (const tx of this.texts) { tx.y -= dt * this.tile * 0.9; tx.life -= dt; }
      this.texts = this.texts.filter(tx => tx.life > 0);
      for (const b of this.beams) b.life -= dt;
      this.beams = this.beams.filter(b => b.life > 0);
      for (const b of this.bugs) {
        b.flash = Math.max(0, b.flash - dt * 4);
        if (b.hp <= 0 && b.dying > 0) b.dying = Math.max(0, b.dying - dt * 2);
      }
      if (this.badge) { this.badge.life -= dt; if (this.badge.life <= 0) this.badge = null; }
    }

    drawLeds(ctx, time) {
      const t = this.tile;
      if (t < 22) return;
      for (const k of this.walls) {
        const [x, y] = k.split(',').map(Number);
        const h = hash(x, y);
        if (h > 0.45) continue;
        const on = Math.sin(time * (1.5 + h * 4) + h * 20) > 0.2;
        ctx.fillStyle = on ? (h < 0.15 ? '#6fe0ff' : h < 0.3 ? '#7ef0b2' : '#ff5e57') : 'rgba(185,196,190,0.22)';
        ctx.fillRect(x * t + t * 0.66, y * t + t * 0.66, Math.max(2, t * 0.08), Math.max(2, t * 0.08));
        ctx.fillRect(x * t + t * 0.78, y * t + t * 0.66, Math.max(2, t * 0.08), Math.max(2, t * 0.08));
      }
    }

    drawGoal(ctx, x, y, time) {
      const t = this.tile;
      const cx = (x + 0.5) * t, cy = (y + 0.5) * t;
      const pulse = 0.5 + 0.5 * Math.sin(time * 3);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, t * 0.6);
      g.addColorStop(0, `rgba(240,180,60,${0.4 + pulse * 0.3})`);
      g.addColorStop(1, 'rgba(240,180,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x * t, y * t, t, t);
      ctx.strokeStyle = '#f0b43c';
      ctx.lineWidth = Math.max(1.5, t * 0.05);
      roundRect(ctx, x * t + t * 0.14, y * t + t * 0.14, t * 0.72, t * 0.72, t * 0.14);
      ctx.stroke();
      // blesk
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.moveTo(cx + t * 0.06, cy - t * 0.26);
      ctx.lineTo(cx - t * 0.14, cy + t * 0.04);
      ctx.lineTo(cx - t * 0.01, cy + t * 0.04);
      ctx.lineTo(cx - t * 0.07, cy + t * 0.26);
      ctx.lineTo(cx + t * 0.15, cy - t * 0.05);
      ctx.lineTo(cx + t * 0.02, cy - t * 0.05);
      ctx.closePath();
      ctx.fill();
    }

    drawBit(ctx, x, y, time) {
      const t = this.tile;
      const h = hash(x, y);
      const cx = (x + 0.5) * t;
      const cy = (y + 0.5) * t + Math.sin(time * 3 + h * 10) * t * 0.05;
      const r = t * 0.24;
      ctx.save();
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = t * 0.35;
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 6;
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#083344';
      ctx.font = `bold ${Math.round(t * 0.3)}px ui-monospace, Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(h < 0.5 ? '1' : '0', cx, cy + t * 0.01);
    }

    laserOn(l) { return ((this.tick + l.phase) % l.period) < l.on; }

    drawLaser(ctx, l, time) {
      const t = this.tile;
      const x = l.x * t, y = l.y * t;
      const on = this.laserOn(l);
      // emitory
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x + t * 0.3, y, t * 0.4, t * 0.12);
      ctx.fillRect(x + t * 0.3, y + t * 0.88, t * 0.4, t * 0.12);
      ctx.fillStyle = on ? '#fecaca' : '#7f1d1d';
      ctx.fillRect(x + t * 0.42, y + t * 0.08, t * 0.16, t * 0.06);
      ctx.fillRect(x + t * 0.42, y + t * 0.86, t * 0.16, t * 0.06);
      if (on) {
        ctx.save();
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = t * 0.5;
        ctx.fillStyle = `rgba(239,68,68,${0.75 + 0.25 * Math.sin(time * 30)})`;
        ctx.fillRect(x + t * 0.44, y + t * 0.12, t * 0.12, t * 0.76);
        ctx.fillStyle = '#fee2e2';
        ctx.fillRect(x + t * 0.48, y + t * 0.12, t * 0.04, t * 0.76);
        ctx.restore();
      } else {
        ctx.strokeStyle = 'rgba(239,68,68,0.35)';
        ctx.setLineDash([t * 0.06, t * 0.08]);
        ctx.lineWidth = Math.max(1, t * 0.03);
        ctx.beginPath();
        ctx.moveTo(x + t * 0.5, y + t * 0.14);
        ctx.lineTo(x + t * 0.5, y + t * 0.86);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // ukazatel cyklu laseru (malé tečky = kolik taktů zbývá)
      const pos = (this.tick + l.phase) % l.period;
      for (let i = 0; i < l.period; i++) {
        ctx.fillStyle = i === pos ? (on ? '#ef4444' : '#22c55e') : 'rgba(148,163,184,0.3)';
        ctx.fillRect(x + t * 0.1 + i * t * 0.06, y + t * 0.02 + t * 0.9, t * 0.04, t * 0.04);
      }
    }

    drawBug(ctx, b, time) {
      const t = this.tile;
      const cx = (b.x + 0.5) * t, cy = (b.y + 0.5) * t;
      const scale = (b.boss ? 0.95 : 0.7) * (b.hp <= 0 ? b.dying : 1);
      if (scale <= 0.01) return;
      const r = t * 0.3 * scale;
      const wob = Math.sin(time * 8 + b.x) * 0.06;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(wob);
      // nohy
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = Math.max(1, t * 0.035);
      for (let i = -1; i <= 1; i++) {
        const lw = Math.sin(time * 14 + i) * r * 0.15;
        ctx.beginPath(); ctx.moveTo(-r * 0.7, i * r * 0.45); ctx.lineTo(-r * 1.25, i * r * 0.6 + lw); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r * 0.7, i * r * 0.45); ctx.lineTo(r * 1.25, i * r * 0.6 - lw); ctx.stroke();
      }
      // tělo
      const body = b.flash > 0 ? '#ffffff' : b.boss ? '#a855f7' : '#f43f5e';
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.85, r, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = Math.max(1, t * 0.02);
      ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(0, r * 1.1); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      [[-0.4, 0.1], [0.4, 0.1], [-0.35, 0.6], [0.35, 0.6]].forEach(([sx, sy]) => { ctx.beginPath(); ctx.arc(sx * r, sy * r, r * 0.16, 0, TAU); ctx.fill(); });
      // hlava
      ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.arc(0, -r * 0.75, r * 0.45, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath(); ctx.arc(-r * 0.17, -r * 0.82, r * 0.11, 0, TAU); ctx.arc(r * 0.17, -r * 0.82, r * 0.11, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1f2937';
      ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 1.1); ctx.quadraticCurveTo(-r * 0.5, -r * 1.5, -r * 0.7, -r * 1.35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.2, -r * 1.1); ctx.quadraticCurveTo(r * 0.5, -r * 1.5, r * 0.7, -r * 1.35); ctx.stroke();
      ctx.restore();
      if (b.boss && b.hp > 0) {
        for (let i = 0; i < b.maxHp; i++) {
          ctx.fillStyle = i < b.hp ? '#f43f5e' : 'rgba(148,163,184,0.35)';
          ctx.fillRect(cx - t * 0.3 + i * t * 0.22, b.y * t + t * 0.02, t * 0.16, t * 0.08);
        }
      }
    }

    drawRobot(ctx, time) {
      const t = this.tile;
      const r = this.robot;
      let ox = 0, oy = 0;
      if (r.bump) { ox = r.bump.dx * r.bump.k * t; oy = r.bump.dy * r.bump.k * t; }
      const cx = (r.px + 0.5) * t + ox, cy = (r.py + 0.5) * t + oy;
      const s = t * 0.76;
      const sq = r.squash || 0;
      // směrová šipka
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(r.angle);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(s * 0.62, 0);
      ctx.lineTo(s * 0.44, -s * 0.13);
      ctx.lineTo(s * 0.44, s * 0.13);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // tělo
      ctx.save();
      ctx.translate(cx, cy + s * 0.05);
      ctx.scale(1 + sq * 0.08, 1 - sq * 0.08);
      // stín
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(0, s * 0.45, s * 0.36, s * 0.08, 0, 0, TAU); ctx.fill();
      // kola
      ctx.fillStyle = '#334155';
      roundRect(ctx, -s * 0.38, s * 0.28, s * 0.22, s * 0.16, s * 0.05); ctx.fill();
      roundRect(ctx, s * 0.16, s * 0.28, s * 0.22, s * 0.16, s * 0.05); ctx.fill();
      // anténa
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = Math.max(1.5, s * 0.04);
      ctx.beginPath(); ctx.moveTo(0, -s * 0.36); ctx.lineTo(0, -s * 0.52); ctx.stroke();
      const blink = Math.sin(time * 5) > 0;
      ctx.fillStyle = this.mood === 'sad' || this.mood === 'dizzy' ? '#ef4444' : blink ? '#f59e0b' : '#fde68a';
      ctx.beginPath(); ctx.arc(0, -s * 0.56, s * 0.07, 0, TAU); ctx.fill();
      // trup
      const g = ctx.createLinearGradient(0, -s * 0.4, 0, s * 0.35);
      g.addColorStop(0, '#f1f5f9');
      g.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = g;
      roundRect(ctx, -s * 0.4, -s * 0.38, s * 0.8, s * 0.7, s * 0.18);
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.stroke();
      // obrazovka
      ctx.fillStyle = '#0f172a';
      roundRect(ctx, -s * 0.3, -s * 0.28, s * 0.6, s * 0.38, s * 0.1);
      ctx.fill();
      // oči
      const dx = Math.cos(r.angle) * s * 0.06, dy = Math.sin(r.angle) * s * 0.05;
      const eyeY = -s * 0.1 + dy;
      ctx.fillStyle = this.mood === 'sad' ? '#f87171' : this.mood === 'happy' ? '#86efac' : '#67e8f9';
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.lineCap = 'round';
      const blinkEye = Math.sin(time * 1.3) > 0.985;
      [-1, 1].forEach(side => {
        const ex = side * s * 0.13 + dx;
        if (this.mood === 'happy') {
          ctx.beginPath(); ctx.arc(ex, eyeY + s * 0.03, s * 0.06, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        } else if (this.mood === 'dizzy') {
          ctx.beginPath(); ctx.moveTo(ex - s * 0.05, eyeY - s * 0.05); ctx.lineTo(ex + s * 0.05, eyeY + s * 0.05);
          ctx.moveTo(ex + s * 0.05, eyeY - s * 0.05); ctx.lineTo(ex - s * 0.05, eyeY + s * 0.05); ctx.stroke();
        } else if (this.mood === 'sad') {
          ctx.beginPath(); ctx.moveTo(ex - s * 0.06, eyeY - s * 0.02 * side); ctx.lineTo(ex + s * 0.06, eyeY + s * 0.02 * side); ctx.stroke();
        } else if (blinkEye) {
          ctx.beginPath(); ctx.moveTo(ex - s * 0.05, eyeY); ctx.lineTo(ex + s * 0.05, eyeY); ctx.stroke();
        } else {
          roundRect(ctx, ex - s * 0.045, eyeY - s * 0.07, s * 0.09, s * 0.14, s * 0.04);
          ctx.fill();
        }
      });
      // panel s energií
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-s * 0.16, s * 0.16, s * 0.32, s * 0.05);
      ctx.restore();

      if (this.badge) {
        const a = Math.min(1, this.badge.life * 3);
        ctx.globalAlpha = a;
        ctx.font = `600 ${Math.max(10, Math.round(t * 0.26))}px ui-monospace, Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const w = ctx.measureText(this.badge.text).width + t * 0.3;
        const bx = Math.min(Math.max(cx, w / 2 + 2), this.cols * t - w / 2 - 2);
        const by = r.py < 1 ? cy + s * 0.8 : cy - s * 0.85;
        ctx.fillStyle = this.badge.ok ? 'rgba(22,101,52,0.92)' : 'rgba(127,29,29,0.92)';
        roundRect(ctx, bx - w / 2, by - t * 0.2, w, t * 0.4, t * 0.12);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(this.badge.text, bx, by + 1);
        ctx.globalAlpha = 1;
      }
    }

    drawBeams(ctx) {
      const t = this.tile;
      for (const b of this.beams) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, b.life * 4);
        ctx.strokeStyle = '#67e8f9';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = t * 0.4;
        ctx.lineWidth = Math.max(2, t * 0.09);
        ctx.beginPath();
        ctx.moveTo((b.x1 + 0.5) * t, (b.y1 + 0.5) * t);
        const steps = 5;
        for (let i = 1; i <= steps; i++) {
          const k = i / steps;
          const jx = i === steps ? 0 : (Math.random() - 0.5) * t * 0.18;
          const jy = i === steps ? 0 : (Math.random() - 0.5) * t * 0.18;
          ctx.lineTo((lerp(b.x1, b.x2, k) + 0.5) * t + jx, (lerp(b.y1, b.y2, k) + 0.5) * t + jy);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    drawParticles(ctx) {
      for (const p of this.particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      for (const tx of this.texts) {
        ctx.globalAlpha = Math.max(0, Math.min(1, tx.life * 1.5));
        ctx.font = `800 ${Math.max(12, Math.round(this.tile * 0.34))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeText(tx.text, tx.x, tx.y);
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.text, tx.x, tx.y);
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ------------------------------------------------------------------ *
   *  Přehrávač událostí
   * ------------------------------------------------------------------ */
  const DUR = { krok: 0.3, vlevo: 0.2, vpravo: 0.2, seber: 0.26, cekej: 0.26, zap: 0.34, ohlas: 0.8, print: 0.25, sense: 0.12, fail: 0.7 };

  class Player {
    constructor(view, events, hooks) {
      this.view = view;
      this.events = events;
      this.hooks = hooks || {};
      this.i = 0;
      this.p = 0;
      this.started = false;
      this.speed = 1;
      this.stepMode = false;
      this.waiting = false; // čeká na další krok v režimu krokování
      this.done = false;
    }

    duration(ev) {
      if (ev.fail) return DUR.fail;
      return DUR[ev.a] || 0.2;
    }

    beginEvent(ev) {
      const v = this.view;
      const hooks = this.hooks;
      if (hooks.line) hooks.line(ev.line);
      if (ev.a === 'sense') {
        v.badge = { text: `${ev.name}() → ${ev.r}`, ok: !!ev.r, life: Math.max(0.25, 0.6 / this.speed) };
      }
      if (ev.a === 'print' && hooks.print) hooks.print(ev.text);
      if (ev.a === 'ohlas') {
        v.bubble('🗨️ ' + ev.say);
        if (hooks.print) hooks.print('Robot: ' + ev.say);
      }
      if (ev.a === 'zap') {
        v.beams.push({ x1: ev.from.x, y1: ev.from.y, x2: ev.zap.x, y2: ev.zap.y, life: 0.35 });
        if (hooks.sound) hooks.sound('zap');
      }
      if (hooks.event) hooks.event(ev, 'begin');
    }

    applyEvent(ev, p) {
      const v = this.view;
      const r = v.robot;
      const e = ease(Math.min(1, p));
      if (ev.a === 'krok' && !ev.fail) {
        r.px = lerp(ev.from.x, ev.to.x, e);
        r.py = lerp(ev.from.y, ev.to.y, e);
        r.squash = Math.sin(Math.PI * p);
      } else if (ev.fail && (ev.bonk || ev.bite || ev.burn) && ev.a === 'krok') {
        const tgt = ev.bonk || ev.bite || ev.burn;
        const k = p < 0.4 ? p / 0.4 * 0.35 : 0.35 * (1 - (p - 0.4) / 0.6);
        r.bump = { dx: tgt.x - ev.from.x, dy: tgt.y - ev.from.y, k };
      } else if (ev.a === 'vlevo' || ev.a === 'vpravo') {
        const from = DIR_ANGLE[ev.from.dir];
        let to = DIR_ANGLE[ev.to.dir];
        let diff = to - from;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        r.angle = from + diff * e;
      }
    }

    endEvent(ev) {
      const v = this.view;
      const r = v.robot;
      const hooks = this.hooks;
      r.bump = null;
      r.squash = 0;
      if (ev.to) {
        r.x = ev.to.x; r.y = ev.to.y; r.px = ev.to.x; r.py = ev.to.y;
        r.dir = ev.to.dir; r.angle = DIR_ANGLE[ev.to.dir];
      }
      if (ev.t !== undefined && ev.a !== 'sense' && ev.a !== 'print') v.tick = ev.t;
      if (ev.a !== 'sense' && ev.a !== 'print' && !(ev.fail && ev.fail.kind === 'battery')) v.energy++;
      if (ev.bit) {
        v.bits.delete(ev.bit.x + ',' + ev.bit.y);
        v.collected++;
        v.burst(ev.bit.x, ev.bit.y, '#22d3ee', 16);
        v.floatText(ev.bit.x, ev.bit.y, '+1 bit', '#67e8f9');
        if (hooks.sound) hooks.sound('bit');
      }
      if (ev.zap && ev.zap.hit) {
        const b = v.bugs.find(bb => bb.x === ev.zap.x && bb.y === ev.zap.y && bb.hp > 0);
        if (b) {
          b.hp = ev.zap.hp;
          b.flash = 1;
          if (ev.zap.killed) {
            b.dying = 1;
            v.burst(b.x, b.y, b.boss ? '#a855f7' : '#f43f5e', b.boss ? 40 : 22, 3);
            v.floatText(b.x, b.y, b.boss ? 'BOSS PORAŽEN!' : 'Bug zničen!', '#fda4af');
            v.shake = b.boss ? 1 : 0.4;
            if (hooks.sound) hooks.sound('kill');
          } else {
            v.floatText(b.x, b.y, `-1 ❤ (${b.hp})`, '#fda4af');
            if (hooks.sound) hooks.sound('hit');
          }
        }
      } else if (ev.zap) {
        v.floatText(ev.zap.x, ev.zap.y, 'vedle', '#94a3b8');
      }
      if (ev.a === 'krok' && !ev.fail && hooks.sound) hooks.sound('step');
      if ((ev.a === 'vlevo' || ev.a === 'vpravo') && hooks.sound) hooks.sound('turn');
      if (ev.fail) {
        const k = ev.fail.kind;
        if (k === 'crash') { v.shake = 1; v.setMood('dizzy', 2500); v.floatText(ev.bonk.x, ev.bonk.y, 'BONK!', '#fbbf24'); }
        if (k === 'laser') { v.shake = 0.8; v.setMood('sad', 2500); const p = ev.burn || ev.to; v.burst(p.x, p.y, '#ef4444', 26, 2.5); v.floatText(p.x, p.y, 'ŤSSS!', '#f87171'); }
        if (k === 'bug') { v.shake = 0.7; v.setMood('sad', 2500); v.floatText(ev.bite.x, ev.bite.y, 'KOUS!', '#fb7185'); }
        if (k === 'nobit') { v.setMood('sad', 2000); v.floatText(r.x, r.y, '?', '#fbbf24'); }
        if (k === 'battery') { v.setMood('sad', 2500); }
        if (hooks.sound) hooks.sound('fail');
      }
      if (hooks.event) hooks.event(ev, 'end');
    }

    /* Vrací true, dokud je co přehrávat */
    update(dt) {
      if (this.done) return false;
      if (this.waiting) return true;
      let budget = dt * this.speed;
      while (budget > 0 && this.i < this.events.length) {
        const ev = this.events[this.i];
        if (!this.started) { this.beginEvent(ev); this.started = true; this.p = 0; }
        const d = this.duration(ev);
        const need = (1 - this.p) * d;
        if (budget >= need) {
          budget -= need;
          this.applyEvent(ev, 1);
          this.endEvent(ev);
          this.i++;
          this.started = false;
          this.p = 0;
          if (this.stepMode) { this.waiting = this.i < this.events.length; break; }
        } else {
          this.p += budget / d;
          this.applyEvent(ev, this.p);
          budget = 0;
        }
      }
      if (this.i >= this.events.length && !this.waiting) {
        this.done = true;
        if (this.hooks.done) this.hooks.done();
        return false;
      }
      return true;
    }

    stepOnce() { this.waiting = false; }

    finishNow() {
      while (this.i < this.events.length) {
        const ev = this.events[this.i];
        if (!this.started) this.beginEvent(ev);
        this.applyEvent(ev, 1);
        this.endEvent(ev);
        this.i++;
        this.started = false;
      }
      this.waiting = false;
      this.view.badge = null;
      this.done = true;
      if (this.hooks.done) this.hooks.done();
    }
  }

  global.BajtRender = { WorldView, Player, roundRect };
})(typeof window !== 'undefined' ? window : globalThis);
