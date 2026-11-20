/*
 * Robot Bajt – svět robota a spouštění testů
 * Čistá logika bez grafiky: mapa, robot, bity, lasery, bugy, energie.
 * Každá akce robota vytvoří událost (event), kterou pak grafika přehraje jako animaci.
 */
(function (global) {
  'use strict';

  const { LangError, BUILTINS } = global.BajtLang;

  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // 0 = východ, 1 = jih, 2 = západ, 3 = sever
  const DIR_NAMES = ['východ', 'jih', 'západ', 'sever'];
  const DIR_FROM_CHAR = { '>': 0, 'v': 1, '<': 2, '^': 3, E: 0, S: 1, W: 2, N: 3 };

  /* Deterministický generátor náhodných čísel (stejný seed = stejná mapa) */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const key = (x, y) => x + ',' + y;

  /*
   * Mapa ze znaků:
   *   #  zeď      .  podlaha      b  bit       G  cíl (nabíječka)
   *   L  laser    x  bug          X  velký bug (3 životy)
   *   > v < ^  robot a jeho směr   @  robot stojí v cíli (směr ze spec.dir)
   */
  function parseSpec(spec) {
    const rows = spec.map;
    const h = rows.length;
    const w = Math.max(...rows.map(r => r.length));
    const walls = new Set();
    const bits = new Set();
    const lasers = [];
    const bugs = [];
    let goal = null;
    let robot = null;
    let laserIdx = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = rows[y][x] || ' ';
        if (c === '#' || c === ' ') walls.add(key(x, y));
        else if (c === 'b') bits.add(key(x, y));
        else if (c === 'G') goal = { x, y };
        else if (c === 'L') {
          const cfg = (spec.lasers && spec.lasers[laserIdx]) || { period: 4, on: 2, phase: 0 };
          lasers.push({ x, y, period: cfg.period, on: cfg.on, phase: cfg.phase || 0 });
          laserIdx++;
        } else if (c === 'x') bugs.push({ x, y, hp: 1, maxHp: 1 });
        else if (c === 'X') bugs.push({ x, y, hp: 3, maxHp: 3, boss: true });
        else if (DIR_FROM_CHAR[c] !== undefined && c.length === 1 && '>v<^'.includes(c)) robot = { x, y, dir: DIR_FROM_CHAR[c] };
        else if (c === '@') { robot = { x, y, dir: DIR_FROM_CHAR[spec.dir || 'E'] }; goal = { x, y }; }
      }
    }
    (spec.extraBits || []).forEach(([x, y]) => bits.add(key(x, y)));
    if (spec.goal) goal = { x: spec.goal[0], y: spec.goal[1] };
    if (!robot) throw new Error('Mapa nemá robota');
    return { w, h, walls, bits, lasers, bugs, goal, robot };
  }

  class World {
    constructor(spec, opts) {
      const s = parseSpec(spec);
      Object.assign(this, s);
      this.spec = spec;
      this.start = { ...s.robot };
      this.bitsTotal = s.bits.size;
      this.battery = (opts && opts.battery) || spec.battery || 200;
      this.t = 0;          // takty (každá akce = 1 takt)
      this.energy = 0;     // počet akcí
      this.collected = 0;
      this.zapped = 0;
      this.out = [];       // co robot ohlásil
      this.events = [];
    }

    inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    isWall(x, y) { return !this.inside(x, y) || this.walls.has(key(x, y)); }
    bugAt(x, y) { return this.bugs.find(b => b.hp > 0 && b.x === x && b.y === y) || null; }
    laserAt(x, y) { return this.lasers.find(l => l.x === x && l.y === y) || null; }
    laserOn(l, t) { return ((t + l.phase) % l.period) < l.on; }
    cell(rel) {
      const d = (this.robot.dir + (rel || 0) + 4) % 4;
      return { x: this.robot.x + DIRS[d][0], y: this.robot.y + DIRS[d][1] };
    }
    onGoal() { return !!this.goal && this.robot.x === this.goal.x && this.robot.y === this.goal.y; }

    fail(ev, message, kind) {
      ev.fail = { message, kind };
      ev.to = { ...this.robot };
      ev.t = this.t;
      this.events.push(ev);
      throw new LangError(message, ev.line, kind);
    }

    sense(name, line) {
      let r;
      switch (name) {
        case 'jeZed': { const f = this.cell(0); r = this.isWall(f.x, f.y); break; }
        case 'jeVolno': { const f = this.cell(0); r = !this.isWall(f.x, f.y); break; }
        case 'vlevoVolno': { const f = this.cell(-1); r = !this.isWall(f.x, f.y); break; }
        case 'vpravoVolno': { const f = this.cell(1); r = !this.isWall(f.x, f.y); break; }
        case 'jeBit': r = this.bits.has(key(this.robot.x, this.robot.y)); break;
        case 'jeCil': r = this.onGoal(); break;
        case 'jeBug': { const f = this.cell(0); r = !!this.bugAt(f.x, f.y); break; }
        case 'laser': { const f = this.cell(0); const l = this.laserAt(f.x, f.y); r = !!l && this.laserOn(l, this.t); break; }
        default: r = false;
      }
      // u dlouhých smyček bez pohybu zaznamenáme jen prvních pár dotazů (animace by trvala věčnost)
      this.senseRun = (this.senseRun || 0) + 1;
      this.senseCount = (this.senseCount || 0) + 1;
      if (this.senseRun <= 40 && this.senseCount <= 1500) this.events.push({ a: 'sense', name, r, line, t: this.t });
      return r;
    }

    act(name, args, line) {
      const ev = { a: name, line, from: { ...this.robot }, t0: this.t };
      this.senseRun = 0;
      if (this.energy >= this.battery) {
        this.fail(ev, `Došla baterka! Robot má energii jen na ${this.battery} akcí.`, 'battery');
      }
      this.energy++;
      switch (name) {
        case 'krok': {
          const f = this.cell(0);
          if (this.isWall(f.x, f.y)) { ev.bonk = f; this.fail(ev, 'Bum! Robot narazil do zdi.', 'crash'); }
          if (this.bugAt(f.x, f.y)) { ev.bite = f; this.fail(ev, 'Robot vjel přímo na bug a ten ho kousl! Bug nejdřív znič příkazem zap().', 'bug'); }
          const l = this.laserAt(f.x, f.y);
          if (l && this.laserOn(l, this.t)) { ev.burn = f; this.fail(ev, 'Ťsss! Robot vjel do zapnutého laseru.', 'laser'); }
          this.robot.x = f.x;
          this.robot.y = f.y;
          break;
        }
        case 'vlevo': this.robot.dir = (this.robot.dir + 3) % 4; break;
        case 'vpravo': this.robot.dir = (this.robot.dir + 1) % 4; break;
        case 'seber': {
          const k = key(this.robot.x, this.robot.y);
          if (!this.bits.has(k)) this.fail(ev, 'Tady žádný bit není – seber() funguje jen na poli s bitem.', 'nobit');
          this.bits.delete(k);
          this.collected++;
          ev.bit = { x: this.robot.x, y: this.robot.y };
          break;
        }
        case 'cekej': break;
        case 'zap': {
          const f = this.cell(0);
          const b = this.bugAt(f.x, f.y);
          ev.zap = { x: f.x, y: f.y, hit: !!b };
          if (b) {
            b.hp--;
            ev.zap.hp = b.hp;
            ev.zap.killed = b.hp <= 0;
            if (b.hp <= 0) this.zapped++;
          }
          break;
        }
        case 'ohlas': {
          const v = args[0];
          this.out.push(v);
          ev.say = formatValue(v);
          break;
        }
        default: break;
      }
      this.t++;
      if (name !== 'krok') {
        const l = this.laserAt(this.robot.x, this.robot.y);
        if (l && this.laserOn(l, this.t)) { ev.burn = { x: this.robot.x, y: this.robot.y }; this.fail(ev, 'Laser se zapnul, zatímco robot stál uvnitř!', 'laser'); }
      }
      ev.to = { ...this.robot };
      ev.t = this.t;
      this.events.push(ev);
      return undefined;
    }

    print(args, line) {
      const text = args.map(formatValue).join(' ');
      this.out.push(args.length === 1 ? args[0] : text);
      this.events.push({ a: 'print', text, line, t: this.t });
    }

    host() {
      return {
        call: (name, args, line) => {
          const b = BUILTINS[name];
          if (!b) throw new LangError(`Neznámý příkaz ${name}()`, line, 'runtime');
          if (b.kind === 'sensor') return this.sense(name, line);
          if (b.kind === 'print') { this.print(args, line); return undefined; }
          return this.act(name, args, line);
        }
      };
    }

    /* Co chybí ke splnění úkolu (prázdné pole = splněno) */
    problems(level) {
      const p = [];
      if (level.check === 'bitCount') {
        const last = this.out.length ? this.out[this.out.length - 1] : undefined;
        if (last === undefined) p.push('Robot na konci nic neohlásil – použij ohlas(…).');
        else if (Number(last) !== this.bitsTotal) p.push(`Robot ohlásil ${formatValue(last)}, ale bitů bylo ${this.bitsTotal}.`);
      }
      if (this.goal && !this.onGoal()) p.push('Program skončil, ale robot nestojí v cíli (na nabíječce).');
      if (level.requireBits !== false && this.bits.size > 0) p.push(`Zůstaly nesebrané bity: ${this.bits.size}.`);
      if (level.requireBugs && this.bugs.some(b => b.hp > 0)) p.push('V mapě ještě zůstal bug.');
      return p;
    }
  }

  function formatValue(v) {
    if (typeof v === 'string') return v;
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    if (typeof v === 'number' && !Number.isInteger(v)) return String(Math.round(v * 1000) / 1000).replace('.', ',');
    return String(v);
  }

  /* ------------------------------------------------------------------ *
   *  Spuštění programu na všech testech levelu
   * ------------------------------------------------------------------ */
  function testSpecs(level, randomCount) {
    if (!level.gen) return [{ spec: level.spec, label: 'Mapa', seed: null }];
    const specs = level.seeds.map((s, i) => ({ spec: level.gen(rng(s)), label: `Test ${i + 1}`, seed: s }));
    const extra = randomCount === undefined ? (level.randomTests || 0) : randomCount;
    for (let i = 0; i < extra; i++) {
      const s = Math.floor(Math.random() * 1e9);
      specs.push({ spec: level.gen(rng(s)), label: `Náhodný ${i + 1}`, seed: s, random: true });
    }
    return specs;
  }

  function runProgram(level, code, opts) {
    opts = opts || {};
    const L = global.BajtLang;
    let ast;
    try {
      ast = L.parse(code);
    } catch (e) {
      if (e instanceof L.LangError) return { ok: false, compileError: { message: e.message, line: e.line, kind: e.kind }, tests: [] };
      throw e;
    }
    const st = L.stats(ast);
    const specs = opts.specs || testSpecs(level, opts.randomTests);
    const tests = specs.map(ts => {
      const world = new World(ts.spec, { battery: level.battery });
      let error = null;
      try {
        L.run(ast, world.host(), { maxOps: opts.maxOps || 200000 });
      } catch (e) {
        if (e instanceof L.LangError) error = { message: e.message, line: e.line, kind: e.kind };
        else throw e;
      }
      const problems = error ? [] : world.problems(level);
      return {
        label: ts.label, seed: ts.seed, random: !!ts.random, spec: ts.spec,
        ok: !error && problems.length === 0,
        error, problems,
        events: world.events,
        energy: world.energy,
        collected: world.collected,
        out: world.out
      };
    });
    const ok = tests.every(t => t.ok);
    const requirements = [];
    if (level.requireFunction && !st.used.includes('function')) requirements.push('Úkol chce, abys použil(a) vlastní funkci (function).');
    if (level.requireFunction && st.used.includes('function') && !st.used.includes('call')) requirements.push('Svou funkci jsi definoval(a), ale nikde ji nevoláš.');
    return {
      ok: ok && requirements.length === 0,
      tests, requirements,
      size: st.size, used: st.used,
      steps: Math.max(...tests.map(t => t.energy)),
      parOk: tests.every(t => t.ok && t.energy <= parFor(level, t.spec))
    };
  }

  /* Par (počet akcí pro hvězdu) – u generovaných map se počítá z referenčního řešení */
  const parCache = new Map();
  function parFor(level, spec) {
    if (level.stepStar !== undefined && !level.gen) return level.stepStar;
    const k = level.id + '|' + JSON.stringify(spec.map) + JSON.stringify(spec.lasers || []);
    if (parCache.has(k)) return parCache.get(k);
    const L = global.BajtLang;
    const world = new World(spec, { battery: 100000 });
    L.run(L.parse(level.solution), world.host(), { maxOps: 2000000 });
    const par = world.energy + (level.stepSlack || 0);
    parCache.set(k, par);
    return par;
  }

  global.BajtWorld = { World, DIRS, DIR_NAMES, rng, key, parseSpec, runProgram, testSpecs, parFor, formatValue };
})(typeof window !== 'undefined' ? window : globalThis);
