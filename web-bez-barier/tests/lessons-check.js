/*
 * Společná kontrola lekcí (používají ji testy všech her v prohlížeči)
 *   window.checkLessons(assert, { label, levels, lessons, kind, solution })
 * Ověří, že každá úroveň má úplnou lekci, příklad je platný kód a neprozradí řešení.
 */
(function (global) {
  'use strict';

  const norm = s => String(s || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)(#|\/\/).*$/gm, '').replace(/\s+/g, ' ').trim();

  /* CSS deklarace, které prohlížeč neuzná (prázdný seznam = vše v pořádku) */
  function cssInvalid(css) {
    const bad = [];
    const src = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
    const re = /([a-z-]+)\s*:\s*([^;{}]+);/gi;
    let m;
    while ((m = re.exec(src))) {
      const prop = m[1].trim();
      const val = m[2].trim();
      if (prop.startsWith('--')) continue;
      if (!global.CSS || !CSS.supports(prop, val)) bad.push(`${prop}: ${val}`);
    }
    return bad;
  }
  const blocks = (html, tag) => [...String(html).matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi'))].map(x => x[1]);

  global.checkLessons = function (assert, o) {
    const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
    let count = 0;
    for (const l of o.levels) {
      const id = l.id;
      const les = o.lessons && o.lessons[id];
      const name = `${o.label} ${id}`;
      assert(!!les, `${name}: má lekci`);
      if (!les) continue;
      count++;
      const texts = [].concat(les.text || []);
      assert(!!(les.title && texts.length && les.example && les.try && les.pitfall), `${name}: lekce má nadpis, výklad, příklad, „Zkus si“ i „Pozor“`);
      assert(texts.every(t => !/\s{2,}|\s[,.]/.test(t)) && !/ – /.test(texts.join(' ')), `${name}: výklad je bez dvojitých mezer a pomlček uprostřed věty`);

      /* příklad nesmí být řešení úrovně */
      if (o.solution) {
        const solRaw = String(o.solution(l));
        const sol = norm(solRaw);
        /* dlouhé (konkrétní) řádky příkladu nesmí být opsané z řešení */
        const lines = String(les.example).split('\n').map(norm).filter(x => x.length >= 20 && !/[({]$/.test(x));
        const same = lines.filter(x => sol.includes(x.replace(/;$/, ''))).length;
        assert(!lines.length || same / lines.length <= 0.5, `${name}: příklad neprozradí řešení (shodných konkrétních řádků ${same} z ${lines.length})`);
        /* příklad pracuje s jinými prvky / funkcemi než řešení */
        const names = (src, re) => new Set([...String(src).matchAll(re)].map(x => x[1]));
        const re = o.kind === 'css' ? /\.([a-z][\w-]*)/gi : o.kind === 'python' ? /def\s+([a-z_]\w*)/gi : null;
        if (re) {
          const a = names(les.example, re);
          const b = names(solRaw, re);
          const both = [...a].filter(x => b.has(x));
          assert(!both.length, `${name}: příklad používá jiné ${o.kind === 'css' ? 'třídy' : 'funkce'} než řešení${both.length ? ' – společné: ' + both.join(', ') : ''}`);
        }
      }

      if (o.kind === 'css') {
        const bad = cssInvalid(les.example).concat(cssInvalid(les.base || ''));
        assert(!bad.length, `${name}: CSS příkladu je platné${bad.length ? ' – neplatné: ' + bad.join(', ') : ''}`);
        assert(!!les.html, `${name}: příklad má HTML, na kterém se CSS ukáže`);
      }
      if (o.kind === 'python') {
        const P = global.MiniPython;
        const rt = new P.Runtime({ maxSteps: 400000 });
        if (les.prelude) { rt.exec(les.prelude); rt.takeOutput(); }
        const r = rt.exec(les.example);
        const out = rt.takeOutput();
        assert(r.ok && out.trim().length > 0, `${name}: příklad v Pythonu se spustí bez chyby a něco vypíše${r.ok ? '' : ' – ' + r.error.text}`);
      }
      if (o.kind === 'web') {
        const scripts = blocks(les.example, 'script');
        let err = '';
        for (const s of scripts) { try { new Function(s); } catch (e) { err = e.message; } }
        assert(!err, `${name}: JavaScript v příkladu jde přeložit${err ? ' – ' + err : ''}`);
        const bad = blocks(les.example, 'style').flatMap(cssInvalid);
        assert(!bad.length, `${name}: CSS v příkladu je platné${bad.length ? ' – neplatné: ' + bad.join(', ') : ''}`);
        const doc = new DOMParser().parseFromString(les.example, 'text/html');
        assert(!!doc.body && doc.body.children.length > 0, `${name}: HTML příkladu má obsah`);
      }
      if (o.kind === 'async') {
        let err = '';
        try { new AsyncFn('cekej', 'console', les.example); } catch (e) { err = e.message; }
        if (!err && les.prelude) { try { new AsyncFn('cekej', les.prelude); } catch (e) { err = 'prelude: ' + e.message; } }
        assert(!err, `${name}: async příklad jde přeložit${err ? ' – ' + err : ''}`);
        assert(/await|Promise/.test(les.example) || id === 3, `${name}: příklad opravdu používá await nebo Promise`);
      }
    }
    assert(count === o.levels.length, `${o.label}: lekci má všech ${o.levels.length} úrovní (${count})`);
  };
})(typeof window !== 'undefined' ? window : globalThis);
