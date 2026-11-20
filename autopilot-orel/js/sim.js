/*
 * Autopilot Orel – fyzika letu a řídicí smyčka
 * Každou desetinu sekundy zavolá hráčovu funkci v Pythonu (Mini-Python), použije vrácený tah
 * a posune přistávací modul. Výsledkem je záznam letu (snímky) a vyhodnocení mise.
 */
(function (global) {
  'use strict';

  const P = global.MiniPython;
  const PHYS = { G: 1.62, AMAX: 4.0, ASIDE: 1.0, DT: 0.1, BURN: 3.0, BURN_SIDE: 0.5 };
  const HOVER = (PHYS.G / PHYS.AMAX) * 100;          // tah, při kterém Orel visí na místě (40,5 %)
  const TICK_STEPS = 60000;                          // limit kroků Pythonu na jedno volání → „1202 alarm“
  const MAX_LOG = 250;

  const fmt = (n, d) => String(+Number(n).toFixed(d === undefined ? 1 : d)).replace('.', ',');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- terén ---------- */
  /* terén je seznam výšek po 10 m od bodu x0; mimo seznam je rovina ve výšce krajního bodu */
  function makeGround(fl) {
    if (!fl.terrain) return () => 0;
    const T = fl.terrain;
    const x0 = fl.x0 || 0;
    const step = fl.step || 10;
    return x => {
      const u = (x - x0) / step;
      if (u <= 0) return T[0];
      if (u >= T.length - 1) return T[T.length - 1];
      const i = Math.floor(u);
      return T[i] + (T[i + 1] - T[i]) * (u - i);
    };
  }

  /* deterministický generátor (stejný terén při každém spuštění) */
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* ---------- převody hodnot mezi Pythonem a JS ---------- */
  const toNum = v => (typeof v === 'bigint' ? Number(v) : v);
  function pyDict(obj) {
    const d = new P.PyDict();
    Object.keys(obj).forEach(k => d.set(k, obj[k]));
    return d;
  }
  const isNum = v => typeof v === 'bigint' || (typeof v === 'number' && isFinite(v));
  const TYPE_CZ = { int: 'celé číslo (int)', float: 'desetinné číslo (float)', str: 'text (str)', list: 'seznam (list)', dict: 'slovník (dict)', tuple: 'n-tici (tuple)', bool: 'True/False (bool)', NoneType: 'None' };
  const tcz = v => TYPE_CZ[P.typeName(v)] || P.typeName(v);

  /* hráčova funkce vrátila něco nečekaného → česká zpráva */
  function badReturn(v, what, fn) {
    if (v === null || v === undefined) return { type: 'ReturnError', text: `${fn}() vrátila None`, czech: `Funkce ${fn}() nic nevrátila. Chybí return, nebo se k němu program v téhle situaci nedostal (např. žádná větev if neplatila).` };
    return { type: 'ReturnError', text: `${fn}() vrátila ${P.repr(v).slice(0, 40)}`, czech: `Čekám ${what}, ale funkce vrátila ${tcz(v)}.` };
  }

  /* ---------- načtení kódu hráče ---------- */
  function load(code, level) {
    const rt = new P.Runtime({ maxSteps: TICK_STEPS * 4, maxOut: 60000 });
    const r = rt.exec(code);
    const out = rt.takeOutput();
    if (!r.ok) return { rt, error: r.error, output: out };
    const need = level.need || [level.fn];
    for (const name of need) {
      const f = rt.get(name);
      if (!f || P.typeName(f) !== 'function') return { rt, missing: name, output: out };
    }
    return { rt, output: out };
  }

  /* ---------- vestavění piloti (úrovně, kde hráč píše jen část programu) ---------- */
  const PILOTS = {
    /* doletí nad vybrané místo (tx) a jemně přistane */
    toSpot(s, fl, ground) {
      const tx = s.target;
      const dx = tx - s.x;
      const tvx = clamp(dx / 5, -11, 11);
      const bok = clamp(90 * (tvx - s.vx), -100, 100);
      const g = ground(s.x);
      const above = s.h - g;
      const cruise = (fl.cruise || 40) + Math.max(0, ...fl.terrain) - g;
      let cil;
      if (Math.abs(dx) > 6 || Math.abs(s.vx) > 0.6) cil = clamp((above - cruise) / 4, -3, 6);
      else cil = clamp(0.7 + above / 8, 0.7, 6);
      const tah = clamp(HOVER + 18 * (s.v - cil), 0, 100);
      return { tah, bok };
    },
    /* přelet nad cílem: drží rychlost klesání do výšky floor, pak drží výšku */
    cruise(s, fl) {
      const cil = s.h > (fl.floor || 25) ? fl.v : (s.h - (fl.floor || 25)) / 3;
      const tah = clamp(HOVER + 25 * (s.v - cil), 0, 100);
      const bok = clamp(60 * (fl.vx - s.vx), -100, 100);
      return { tah, bok };
    }
  };

  /* ---------- jeden let ---------- */
  /*
   * level.io:  'hv'    autopilot(vyska, klesani) → tah
   *            'hvxv'  autopilot(vyska, klesani, x, vx) → (tah, bok)
   *            'data'  autopilot(data, pamet) → {'tah': …, 'bok': …}
   *            'pick'  vyber_misto(teren) → index, pak letí vestavěný pilot
   *            'drop'  uvolnit(x, vyska, vx, klesani) → True/False, letí vestavěný pilot
   */
  function fly(level, fl, loaded) {
    const R = Object.assign({ clamp: 'auto', maxTouch: 3, maxSide: 1, timeLimit: 150, goal: 'land' }, level.rules, fl.rules);
    const { G, AMAX, ASIDE, DT, BURN, BURN_SIDE } = PHYS;
    const ground = makeGround(fl);
    const rt = loaded.rt;
    const fn = rt.get(level.fn);
    const s = { t: 0, h: fl.h, v: fl.v || 0, x: fl.x || 0, vx: fl.vx || 0, fuel: fl.fuel !== undefined ? fl.fuel : R.fuel, tah: 0, bok: 0 };
    if (s.h <= ground(s.x)) s.h = ground(s.x);
    const res = {
      name: fl.name, ok: false, reason: '', msg: '', detail: '', frames: [], events: [], log: [], logCut: 0,
      error: null, touch: null, fuelStart: s.fuel, fuelLeft: s.fuel, time: 0, ignitions: 0, pick: null, probe: null, maxEstErr: 0, gatesPassed: []
    };
    const ev = (type, text) => res.events.push({ t: s.t, type, text });
    let airborne = s.h > ground(s.x) + 0.5;
    let engineDead = false;        // porucha / chyba programu → motor vypnut
    let deadAt = null;
    let outOfFuel = false;
    let done = false;
    let pamet = level.io === 'data' ? new P.PyDict() : null;
    let released = null;           // sonda
    const gates = (R.gates || []).map(g => Object.assign({ passed: false }, g));
    let wasOn = false;
    let estNow = null;
    if (R.estimate) res.estSeries = [];

    const fail = (reason, msg, detail) => { if (!res.reason) { res.reason = reason; res.msg = msg; res.detail = detail || ''; res.ok = false; } };
    const win = (reason, msg, detail) => { if (!res.reason) { res.reason = reason; res.msg = msg; res.detail = detail || ''; res.ok = true; } };
    const kill = (reason, msg, detail, error) => {
      if (engineDead) return;
      engineDead = true;
      deadAt = s.t;
      if (error) res.error = error;
      fail(reason, msg, detail);
      ev('alarm', msg);
    };
    const takeLog = () => {
      const o = rt.takeOutput();
      if (!o) return;
      o.replace(/\n$/, '').split('\n').forEach(line => {
        if (res.log.length < MAX_LOG) res.log.push([s.t, line]);
        else res.logCut++;
      });
    };

    /* výběr místa přistání (úroveň s vestavěným pilotem) */
    if (level.io === 'pick') {
      const r = rt.call(fn, [fl.terrain.slice()], { maxSteps: TICK_STEPS * 4 });
      takeLog();
      if (!r.ok) {
        res.error = r.error;
        fail(r.error.type === 'Timeout' ? 'alarm1202' : 'error', r.error.type === 'Timeout' ? 'PROGRAM ALARM 1202' : `Chyba v programu: ${r.error.type}`, r.error.czech || r.error.text);
        res.frames.push(frame());
        return finish();
      }
      const i = r.value;
      if (typeof i !== 'bigint' && !(typeof i === 'boolean')) {
        const b = badReturn(i, 'celé číslo – index místa v seznamu', level.fn);
        res.error = b;
        fail('return', `${level.fn}() nevrátila index`, b.czech);
        res.frames.push(frame());
        return finish();
      }
      const idx = Number(i);
      if (idx < 0 || idx >= fl.terrain.length - 1) {
        fail('range', `Index ${idx} je mimo terén`, `Platné indexy úseků jsou 0 až ${fl.terrain.length - 2} (úsek i vede od bodu i do bodu i+1).`);
        res.frames.push(frame());
        return finish();
      }
      res.pick = idx;
      s.target = (fl.x0 || 0) + idx * 10 + 5;
      ev('info', `Vybráno místo č. ${idx}`);
    }

    function frame() {
      const f = [round2(s.t), round2(s.h), round2(s.v), round2(s.x), round2(s.vx), Math.round(s.tah * 10) / 10, Math.round(s.bok * 10) / 10, round2(Math.max(0, s.fuel))];
      if (released) f.push(round2(released.x), round2(released.h));
      return f;
    }

    /* jedno rozhodnutí řídicího programu */
    function decide() {
      if (engineDead) return { tah: 0, bok: 0 };
      if (level.io === 'pick') return PILOTS.toSpot(s, fl, ground);
      if (level.io === 'drop') {
        const c = PILOTS.cruise(s, fl);
        if (!released) {
          const r = rt.call(fn, [s.x, s.h, s.vx, s.v], { maxSteps: TICK_STEPS });
          takeLog();
          if (!r.ok) return pyError(r.error, c);
          const v = r.value;
          if (typeof v !== 'boolean') {
            if (isNum(v)) { /* číslo bereme jako pravdivostní hodnotu jako Python */ if (toNum(v) !== 0) release(); }
            else { kill('return', `${level.fn}() vrátila ${tcz(v)}`, 'Funkce má vrátit True (pustit sondu) nebo False (ještě ne).', badReturn(v, 'True nebo False', level.fn)); }
          } else if (v) release();
        }
        return c;
      }
      let args;
      if (level.io === 'hv') args = [s.h, s.v];
      else if (level.io === 'hvxv') args = [s.h, s.v, s.x, s.vx];
      else {
        const all = { vyska: s.h, klesani: s.v, x: s.x, vx: s.vx, palivo: Math.max(0, s.fuel), cas: Math.round(s.t * 10) / 10 };
        const o = {};
        (level.dataKeys || Object.keys(all)).forEach(k => { o[k] = all[k]; });
        args = [pyDict(o), pamet];
      }
      const r = rt.call(fn, args, { maxSteps: TICK_STEPS });
      takeLog();
      if (!r.ok) return pyError(r.error);
      return parseCommand(r.value);
    }

    function pyError(e, fallback) {
      if (e.type === 'Timeout') kill('alarm1202', 'PROGRAM ALARM 1202', 'Palubní počítač nestihl tvůj program spočítat včas – stejný poplach zazněl při přistání Apolla 11. Nemáš ve funkci nekonečnou smyčku?', e);
      else kill('error', `Chyba v programu: ${e.type}${e.line ? ` (řádek ${e.line})` : ''}`, e.czech || e.text, e);
      return fallback || { tah: 0, bok: 0 };
    }

    function parseCommand(v) {
      let tah;
      let bok = 0;
      let extra = null;
      if (level.io === 'hv') tah = v;
      else if (level.io === 'hvxv') {
        let items = null;
        if (v instanceof P.PyTuple) items = v.items;
        else if (Array.isArray(v)) items = v;
        if (!items || items.length !== 2) {
          const b = badReturn(v, 'dvojici hodnot: return tah, bok', level.fn);
          if (isNum(v)) b.czech = 'Funkce vrátila jen jedno číslo. Vrať dvojici: return tah, bok';
          else if (items) b.czech = `Funkce vrátila ${items.length} hodnot${items.length === 1 ? 'u' : items.length < 5 ? 'y' : ''}, čekám přesně dvě: return tah, bok`;
          kill('return', `${level.fn}() nevrátila (tah, bok)`, b.czech, b);
          return { tah: 0, bok: 0 };
        }
        tah = items[0];
        bok = items[1];
      } else {
        if (!(v instanceof P.PyDict) || !v.has('tah')) {
          const b = badReturn(v, "slovník s klíčem 'tah', např. {'tah': 50}", level.fn);
          if (v instanceof P.PyDict) b.czech = "Ve vráceném slovníku chybí klíč 'tah'. Vrať např. {'tah': 50}" + (level.side ? ", 'bok': 0}" : '');
          kill('return', `${level.fn}() nevrátila slovník s tahem`, b.czech, b);
          return { tah: 0, bok: 0 };
        }
        tah = v.get('tah');
        if (v.has('bok')) bok = v.get('bok');
        extra = v;
      }
      if (typeof tah === 'boolean') tah = tah ? 1n : 0n;
      if (typeof bok === 'boolean') bok = bok ? 1n : 0n;
      if (!isNum(tah)) {
        const b = badReturn(tah, 'číslo – tah motoru v procentech', level.fn);
        if (level.io !== 'hv') b.czech = `Tah musí být číslo, ale je to ${tcz(tah)}.`;
        kill('return', tah === null ? `${level.fn}() nevrátila tah` : 'Tah není číslo', b.czech, b);
        return { tah: 0, bok: 0 };
      }
      if (!isNum(bok)) {
        const b = badReturn(bok, 'číslo – tah bočních trysek', level.fn);
        b.czech = `Boční tah musí být číslo, ale je to ${tcz(bok)}.`;
        kill('return', 'Boční tah není číslo', b.czech, b);
        return { tah: 0, bok: 0 };
      }
      let t = toNum(tah);
      let b = toNum(bok);
      if (R.clamp === 'strict' && (t < 0 || t > 100)) {
        kill('fault', `Porucha motoru: tah ${fmt(t, 1)} % je mimo rozsah`, `Tenhle motor zvládne jen tah od 0 do 100 %. ${t > 100 ? 'Víc než 100' : 'Záporný tah'} ho poškodí – ořízni tah funkcemi min() a max().`);
        return { tah: 0, bok: 0 };
      }
      if (R.int && typeof tah !== 'bigint') {
        kill('fault', `Porucha motoru: ${fmt(t, 2)} není celé číslo`, `Řídicí jednotka motoru přijímá jen celá čísla (int), tvoje funkce vrátila ${P.repr(tah)} (float). Zaokrouhli tah funkcí round().`);
        return { tah: 0, bok: 0 };
      }
      t = clamp(t, 0, 100);
      b = level.side ? clamp(b, -100, 100) : 0;
      if (R.estimate) estNow = extra && extra.has('klesani') && isNum(extra.get('klesani')) ? toNum(extra.get('klesani')) : null;
      return { tah: t, bok: b };
    }

    function release() {
      released = { x: s.x, h: s.h, vx: s.vx, v: -s.v, t: s.t, landed: false };
      res.probe = { t: s.t, x: s.x, h: s.h };
      ev('drop', `Sonda uvolněna ve výšce ${fmt(s.h)} m`);
    }

    function finish() {
      res.time = s.t;
      res.fuelLeft = Math.max(0, s.fuel);
      return res;
    }

    function touchdown() {
      const v = s.v;
      const gx = ground(s.x);
      s.h = gx;
      res.touch = { v, vx: s.vx, x: s.x, t: s.t };
      if (R.goal === 'climb' || R.goal === 'drop') { fail('crash', `Orel narazil do povrchu rychlostí ${fmt(v)} m/s`); return; }
      if (engineDead) return;                                    // příčina už je zapsaná
      if (v > R.maxTouch) { fail('crash', `Havárie: dopad rychlostí ${fmt(v)} m/s`, `Bezpečné je dosednout nejvýš ${fmt(R.maxTouch)} m/s.${outOfFuel ? ' Cestou došlo palivo – brzdi úsporněji.' : ''}`); return; }
      if (level.side && Math.abs(s.vx) > R.maxSide) { fail('tipped', `Orel se převrátil: boční rychlost ${fmt(Math.abs(s.vx))} m/s`, `Při dosednutí smí být boční rychlost nejvýš ${fmt(R.maxSide)} m/s.`); return; }
      if (gx > 1.5 && !(level.io === 'pick')) { fail('crash', `Náraz do terénu ${fmt(Math.abs(s.x - (R.pad ? R.pad.x : 0)), 0)} m před plochou`, `Povrch tu sahá do výšky ${fmt(gx, 0)} m (balvany a okraj kráteru). Drž se výš, dokud nejsi nad plochou.`); return; }
      if (R.pad && Math.abs(s.x - R.pad.x) > R.pad.w / 2) {
        fail('offpad', `Přistání mimo plochu: ${fmt(Math.abs(s.x - R.pad.x))} m od středu`, `Přistávací plocha sahá ${fmt(R.pad.w / 2, 0)} m na obě strany od středu.`);
        return;
      }
      if (level.io === 'pick' && fl.terrain) {
        const i = res.pick;
        const slope = Math.abs(fl.terrain[i + 1] - fl.terrain[i]);
        if (slope > R.slopeMax) { fail('tipped', `Orel se převrátil: místo č. ${i} je moc svažité`, `Úsek ${i} klesá/stoupá o ${fmt(slope, 1)} m na 10 m, bezpečné je nejvýš ${fmt(R.slopeMax, 1)} m.`); return; }
      }
      const extra = [];
      if (R.pad) extra.push(`${fmt(Math.abs(s.x - R.pad.x))} m od středu plochy`);
      win('landed', `Měkké přistání: ${fmt(v)} m/s`, extra.join(' · '));
    }

    res.frames.push(frame());
    if (R.goal === 'land') ev('info', 'Řízení: Orle, máte GO pro přistání.');
    if (R.goal === 'climb') ev('info', 'Řízení: Orle, můžete startovat.');

    let n = 0;
    const maxN = Math.round(R.timeLimit / DT);
    while (!done) {
      n++;
      const cmd = decide();
      /* odhad rychlosti (bonus úrovně bez radaru): porovná se se skutečnou rychlostí v okamžiku volání */
      if (R.estimate && !engineDead) {
        if (estNow !== null) res.estSeries.push([round2(s.t), round2(estNow)]);
        if (n > 1) res.maxEstErr = Math.max(res.maxEstErr, estNow === null ? Infinity : Math.abs(estNow - s.v));
      }
      let tah = cmd.tah;
      let bok = cmd.bok;
      if (s.fuel <= 0) {
        tah = 0;
        bok = 0;
        if (!outOfFuel) { outOfFuel = true; ev('warn', `Došlo palivo ve výšce ${fmt(s.h - ground(s.x))} m`); }
      }
      /* počítání zážehů (motor se zapne z nuly) */
      const on = tah > 0.001;
      if (on && !wasOn) {
        res.ignitions++;
        if (R.ignitions && res.ignitions > R.ignitions && !engineDead) {
          kill('fault', `Motor zapálen ${res.ignitions}×, vydrží jen ${R.ignitions}`, 'Každé nové zapálení motor opotřebuje. Místo zapínání a vypínání nastav tah plynule – podle toho, jak rychle padáš.');
          tah = 0;
          bok = 0;
        }
      }
      wasOn = tah > 0.001;
      s.tah = tah;
      s.bok = bok;
      /* fyzika (semi-implicitní Euler: nejdřív rychlost, pak poloha) */
      const a = (AMAX * tah) / 100 - G;
      const ax = (ASIDE * bok) / 100;
      const vUp = -s.v + a * DT;
      s.v = -vUp;
      s.h += vUp * DT;
      s.vx += ax * DT;
      s.x += s.vx * DT;
      s.fuel -= ((BURN * tah) / 100 + (BURN_SIDE * Math.abs(bok)) / 100) * DT;
      s.t = Math.round((s.t + DT) * 1e6) / 1e6;
      /* sonda */
      if (released && !released.landed) {
        released.v -= G * DT;
        released.h += released.v * DT;
        released.x += released.vx * DT;
        if (released.h <= ground(released.x)) {
          released.h = ground(released.x);
          released.landed = true;
          const miss = released.x - (fl.target || 0);
          res.probe.hit = miss;
          res.probe.ht = s.t;
          if (Math.abs(miss) <= R.hitTol) win('hit', `Zásah! Sonda dopadla ${fmt(Math.abs(miss))} m od cíle`, `Povolená odchylka je ${fmt(R.hitTol)} m.`);
          else fail('miss', `Sonda minula cíl o ${fmt(Math.abs(miss))} m`, miss < 0 ? 'Dopadla před cíl – pustil(a) jsi ji moc brzy.' : 'Dopadla za cíl – pustil(a) jsi ji pozdě.');
          ev(Math.abs(miss) <= R.hitTol ? 'ok' : 'bad', res.msg);
          done = true;
        }
      }
      /* kontrolní brány (rychlostní profil) */
      gates.forEach(g => {
        if (!g.passed && s.h <= g.h) {
          g.passed = true;
          if (s.v > g.v && !engineDead) kill('gate', `Kontrola ve výšce ${g.h} m: ${fmt(s.v)} m/s`, `Tady smíš klesat nejvýš ${fmt(g.v)} m/s. Zpomal dřív – nastav nižší rychlost už ve vyšším pásmu.`);
          else if (!engineDead) { res.gatesPassed.push(g.h); ev('ok', `Kontrola ${g.h} m: ${fmt(s.v)} m/s ✔`); }
        }
      });
      const gx = ground(s.x);
      if (s.h <= gx) {
        if (!airborne) {           // stojí na rampě, motor ho neunesl
          s.h = gx;
          s.v = 0;
          s.vx = 0;
        } else {
          touchdown();
          res.frames.push(frame());
          if (R.goal !== 'drop' || !released || released.landed) done = true;
          else { s.v = 0; s.vx = 0; }
          if (done) break;
        }
      } else if (s.h > gx + 0.5) airborne = true;
      if (R.goal === 'climb' && !engineDead && s.h >= R.target) {
        res.frames.push(frame());
        win('climbed', `Orel vystoupal do ${R.target} m za ${fmt(s.t)} s`);
        ev('ok', res.msg);
        break;
      }
      if (s.h > 1500) { fail('escaped', 'Orel uletěl do vesmíru', 'Motor táhl víc, než bylo potřeba, a Orel nikdy nezačal klesat. Ubírej tah, když stoupáš.'); res.frames.push(frame()); break; }
      res.frames.push(frame());
      if (engineDead && (s.t - deadAt > 25 || (!airborne && s.t - deadAt > 1))) break;      // dál už se nic zajímavého nestane
      if (n >= maxN) {
        if (R.goal === 'climb') {
          fail('timeout', s.h < 1 ? 'Orel se ani nehnul z rampy' : `Za ${R.timeLimit} s vystoupal jen do ${fmt(s.h, 0)} m`,
            s.h < 1 ? `Motor má málo tahu. Na Měsíci potřebuješ víc než ${fmt(HOVER, 1)} %, aby ses odlepil(a) od rampy.` : 'Zkus větší tah.');
        } else if (R.goal === 'drop') fail('nodrop', released ? 'Sonda nestihla dopadnout' : 'Sonda nebyla uvolněna', 'Funkce uvolnit() celou dobu vracela False.');
        else fail('timeout', `Vypršel čas mise (${R.timeLimit} s)`, `Orel je pořád ve výšce ${fmt(s.h - gx, 0)} m. Klesej rychleji.`);
        break;
      }
      if (R.goal === 'drop' && !released && s.x > (fl.target || 0) + 120) {
        fail('nodrop', 'Orel přeletěl cíl a sondu nepustil', 'Funkce uvolnit() celou dobu vracela False.');
        break;
      }
    }
    if (!res.reason) fail('crash', 'Let skončil bez přistání');
    if (outOfFuel && !res.ok && res.reason === 'crash' && !/palivo/.test(res.detail)) res.detail = (res.detail ? res.detail + ' ' : '') + 'Došlo palivo – brzdi úsporněji.';
    if (outOfFuel) res.outOfFuel = true;
    return finish();
  }

  function round2(v) { return Math.round(v * 100) / 100; }

  /* ---------- testy pomocných funkcí ---------- */
  const expCache = new Map();
  function expectedFor(level) {
    if (expCache.has(level.id)) return expCache.get(level.id);
    const rt = new P.Runtime({ maxSteps: TICK_STEPS * 20 });
    const r = rt.exec(level.solution);
    if (!r.ok) throw new Error('Vzorové řešení úrovně ' + level.id + ' selhalo: ' + r.error.text);
    const vals = level.unit.tests.map(t => {
      const v = rt.evalExpr(t.call, { maxSteps: TICK_STEPS * 20 });
      if (!v.ok) throw new Error(`Vzorové řešení úrovně ${level.id} selhalo v testu ${t.call}: ${v.error.text}`);
      return v.value;
    });
    expCache.set(level.id, vals);
    return vals;
  }
  function approxSame(a, b, tol) {
    if (isNum(a) && isNum(b) && typeof a !== 'boolean') {
      if (tol) return Math.abs(toNum(a) - toNum(b)) <= tol;           // přibližné hodnoty: na typu nezáleží
      if (typeof b === 'bigint') return typeof a === 'bigint' && a === b;
      return Math.abs(toNum(a) - toNum(b)) <= 1e-9;
    }
    return P.pyEq(a, b) && P.typeName(a) === P.typeName(b);
  }
  function runUnit(level, rt) {
    const exp = expectedFor(level);
    return level.unit.tests.map((t, i) => {
      const r = rt.evalExpr(t.call, { maxSteps: TICK_STEPS * 4 });
      const out = rt.takeOutput();
      const show = v => (t.tol && typeof v === 'number' ? P.repr(Math.round(v * 1000) / 1000) : P.repr(v));
      const tr = { call: t.call, expected: show(exp[i]), output: out, tol: t.tol };
      if (!r.ok) { tr.pass = false; tr.error = r.error; return tr; }
      tr.got = show(r.value);
      tr.pass = approxSame(r.value, exp[i], t.tol);
      if (!tr.pass) {
        if (r.value === null) tr.why = 'Funkce vrátila None – chybí return?';
        else if (typeof exp[i] === 'bigint' && typeof r.value !== 'bigint') tr.why = `Čekám celé číslo (int), funkce vrátila ${tcz(r.value)}.`;
        else if (t.tol) tr.why = `Odchylka smí být nejvýš ${fmt(t.tol, 2)}.`;
      }
      return tr;
    });
  }

  /* ---------- celá úroveň: načíst kód, testy funkcí, všechny lety ---------- */
  function runLevel(level, code) {
    const res = { output: '', error: null, missing: null, unit: [], unitPass: true, flights: [], passed: 0, total: level.flights.length, allPass: false, bonus: false, ast: null, errorTypes: [] };
    try { res.ast = P.parse(code); } catch (e) { res.ast = null; }
    const loaded = load(code, level);
    res.output = loaded.output;
    if (loaded.error) { res.error = loaded.error; res.errorTypes.push(loaded.error.type); return res; }
    if (loaded.missing) { res.missing = loaded.missing; return res; }
    if (level.unit) {
      res.unit = runUnit(level, loaded.rt);
      res.unitPass = res.unit.every(t => t.pass);
      res.unit.forEach(t => { if (t.error) res.errorTypes.push(t.error.type); });
    }
    level.flights.forEach(fl => {
      const f = fly(level, fl, loaded);
      if (f.error && f.error.type) res.errorTypes.push(f.error.type);
      res.flights.push(f);
    });
    res.passed = res.flights.filter(f => f.ok).length;
    res.allPass = res.unitPass && res.passed === res.total;
    if (res.allPass) {
      try { res.bonus = !!level.bonus.check({ ast: res.ast, flights: res.flights, src: code, unit: res.unit }); } catch (e) { res.bonus = false; }
    }
    return res;
  }

  global.OrelSim = { PHYS, HOVER, TICK_STEPS, fly, load, runLevel, runUnit, expectedFor, makeGround, rng, fmt };
})(typeof window !== 'undefined' ? window : globalThis);
