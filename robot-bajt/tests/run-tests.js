/*
 * Robot Bajt – automatické testy (bez knihoven)
 * Spuštění:  node tests/run-tests.js
 *
 * Ověřuje, že:
 *  1) každé referenční řešení projde všemi testy levelu na stovkách náhodných map,
 *  2) referenční řešení splní hvězdu za krátký kód,
 *  3) výchozí (rozbitý) kód levelu úkol nesplní,
 *  4) naivní řešení u levelů s náhodnými mapami selžou,
 *  5) správné odpovědi v kvízu odpovídají tomu, co kód skutečně udělá,
 *  6) typické chyby začátečníků dostanou srozumitelnou hlášku,
 *  7) každá mise má lekci a robot její příklad předvede (chyby jen tam, kde je lekce schválně ukazuje).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console, Math };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['lang.js', 'world.js', 'levels.js', 'lessons.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
}
const { BajtLang: L, BajtWorld: W, BajtContent: C } = ctx;

let passed = 0;
let failed = 0;
function check(cond, name) {
  if (cond) passed++;
  else { failed++; console.log('  ✗ ' + name); }
}

/* 1–3: levely */
console.log('Levely:');
for (const lv of C.LEVELS) {
  const seeds = lv.gen ? [...lv.seeds, ...Array.from({ length: 300 }, (_, i) => 1000 + i * 7919)] : [null];
  const specs = seeds.map(s => ({ spec: lv.gen ? lv.gen(W.rng(s)) : lv.spec, label: String(s), seed: s }));
  const res = W.runProgram(lv, lv.solution, { specs });
  const fixed = W.runProgram(lv, lv.solution, { randomTests: 0 });
  const starter = W.runProgram(lv, lv.starter || '', { randomTests: 0 });
  check(res.ok, `${lv.id}: referenční řešení projde ${specs.length} map`);
  check(res.size <= lv.sizeStar, `${lv.id}: řešení má ${res.size} ≤ ${lv.sizeStar} příkazů`);
  check(fixed.parOk, `${lv.id}: referenční řešení získá hvězdu za úsporu`);
  check(!starter.ok, `${lv.id}: výchozí kód úkol nesplní`);
  console.log(`  ${res.ok && !starter.ok ? '✓' : '✗'} ${lv.id} ${lv.title} (${specs.length} map, ${res.size} příkazů)`);
}

/* 4: naivní řešení musí selhat */
console.log('Naivní řešení:');
const naive = [
  ['3-1', 'for (let i = 0; i < 9; i++) { krok(); seber(); }', 'sbírá i tam, kde bit není'],
  ['3-3', 'for (let i = 0; i < 3; i++) krok(); vlevo(); for (let i = 0; i < 3; i++) krok();', 'vždy doleva'],
  ['4-1', 'for (let i = 0; i < 6; i++) krok();', 'pevný počet kroků'],
  ['4-2', 'while (!jeCil()) { if (laser()) cekej(); krok(); }', 'if místo while'],
  ['5-2', 'let pocet = 0; while (!jeCil()) { krok(); if (jeBit()) seber(); } ohlas(pocet);', 'nepočítá bity']
];
for (const [id, code, why] of naive) {
  const lv = C.LEVELS.find(l => l.id === id);
  const specs = [...lv.seeds, ...Array.from({ length: 60 }, (_, i) => 5000 + i * 104729)].map(s => ({ spec: lv.gen(W.rng(s)), label: String(s) }));
  const r = W.runProgram(lv, code, { specs });
  check(!r.ok, `${id}: naivní řešení (${why}) neprojde`);
  console.log(`  ${!r.ok ? '✓' : '✗'} ${id}: ${why}`);
}

/* 5: kvíz */
console.log('Kvíz:');
function exec(code) {
  const log = { actions: {}, out: [], dir: 3 };
  const host = {
    call(n, a) {
      if (n === 'ohlas' || n === 'console.log') { log.out.push(a[0]); return undefined; }
      log.actions[n] = (log.actions[n] || 0) + 1;
      if (n === 'vlevo') log.dir = (log.dir + 3) % 4;
      if (n === 'vpravo') log.dir = (log.dir + 1) % 4;
      return false;
    }
  };
  L.run(L.parse(code), host, { maxOps: 20000 });
  return log;
}
for (const form of ['A', 'B']) {
  for (const q of C.QUIZ[form]) {
    const right = q.a[q.ok];
    let got = null;
    if (q.c === 'for') got = String(exec(q.code).actions.krok);
    else if (q.c === 'vnoreny') got = String(exec(q.code).actions.seber);
    else if (['if', 'while', 'promenne'].includes(q.c)) got = String(exec(q.code).out[0]);
    else if (q.c === 'funkce' && form === 'A') got = String(exec(q.code).actions.krok);
    else if (q.c === 'funkce' && form === 'B') got = ['Na východ', 'Na jih', 'Na západ', 'Na sever'][exec(q.code).dir];
    else if (q.c === 'nekonecny') {
      const inf = q.a.map(code => { try { exec(code); return false; } catch (e) { return e.kind === 'infinite'; } });
      got = inf.indexOf(true) === q.ok && inf.filter(Boolean).length === 1 ? right : 'jiná';
    } else if (q.c === 'offbyone') {
      const want = form === 'A' ? 5 : 3;
      const counts = q.a.map(h => exec(h + ' { krok(); }').actions.krok || 0);
      got = counts.indexOf(want) === q.ok && counts.filter(c => c === want).length === 1 ? right : 'jiná';
    } else continue;
    check(got === right, `kvíz ${form}/${q.c}: správně „${right}“, interpret říká „${got}“`);
  }
}
console.log('  ✓ odpovědi ověřeny interpretem');

/* 6: chybové hlášky */
console.log('Chybové hlášky:');
const errs = [
  ['krok;', 'závorky'],
  ['krk();', 'krok'],
  ['for (let i = 0, i < 5, i++) { krok(); }', ';'],
  ['if (x = 5) { krok(); }', '==='],
  ['while (true) { }', 'nekonečný'],
  ['krok(3);', 'cyklus'],
  ['x = 5;', 'let x'],
  ['while (!jeCil()) {\n  krok();\n', '}']
];
for (const [code, expect] of errs) {
  let msg = '';
  try { exec(code); } catch (e) { msg = e.message; }
  check(msg.includes(expect), `hláška pro ${JSON.stringify(code)} obsahuje „${expect}“ (je: ${msg})`);
}
console.log('  ✓ ' + errs.length + ' typických chyb');

/* 7) lekce: úplné, příklad jde spustit a ukáže to, co má */
const LES = C.LESSONS || {};
const EXPECT_ERR = { '2-3': 'crash', '4-3': 'battery' };
let lesOk = 0;
for (const lvl of C.LEVELS) {
  const les = LES[lvl.id];
  check(!!les, `mise ${lvl.id} má lekci`);
  if (!les) continue;
  check(!!(les.title && [].concat(les.text).length && les.example && les.try && les.pitfall && les.map), `lekce ${lvl.id} má nadpis, výklad, příklad, mapu, „Zkus si“ i „Pozor“`);
  const res = W.runProgram({ id: 'lekce-' + lvl.id, battery: les.battery || 60, requireBits: false, stepStar: 999 }, les.example, { specs: [{ spec: les.map, label: 'lekce' }] });
  check(!res.compileError, `příklad lekce ${lvl.id} jde přeložit${res.compileError ? ': ' + res.compileError.message : ''}`);
  if (res.compileError) continue;
  const t = res.tests[0];
  const want = EXPECT_ERR[lvl.id];
  check(want ? (t.error && t.error.kind === want) : !t.error, `příklad lekce ${lvl.id} ${want ? 'ukáže chybu „' + want + '“' : 'robot předvede bez chyby'}${t.error && !want ? ': ' + t.error.message : ''}`);
  check(t.events.length > 0 && t.events.length < 400, `příklad lekce ${lvl.id} je krátká ukázka (${t.events.length} kroků animace)`);
  if (lvl.solution) check(les.example.replace(/\s+/g, ' ').trim() !== lvl.solution.replace(/\s+/g, ' ').trim(), `příklad lekce ${lvl.id} není řešení mise`);
  lesOk++;
}
console.log('  ✓ ' + lesOk + ' lekcí');

console.log(`\nVýsledek: ${passed} OK, ${failed} chyb`);
process.exit(failed ? 1 : 0);
