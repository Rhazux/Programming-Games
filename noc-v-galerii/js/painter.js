/*
 * Noc v galerii – malíř a porovnávač obrazů
 *  1) vykreslí HTML + CSS hráče do obrázku 400 × 300 px (SVG foreignObject → canvas),
 *     takže výsledek nakreslí přímo prohlížeč se vším, co CSS umí,
 *  2) porovná obraz s katalogem pixel po pixelu (hrany tvarů se počítají mírněji kvůli vyhlazování),
 *  3) zkontroluje CSS a česky vysvětlí překlepy, chybějící jednotky a neplatné hodnoty.
 */
(function (global) {
  'use strict';

  const W = 400;
  const H = 300;
  const N = W * H;
  const TOL = 30;          // součet rozdílů R + G + B, do kterého je pixel „stejný“
  const EDGE_W = 0.2;      // váha pixelu na hraně tvaru v katalogu

  /* plátno, na které se kreslí obrázek s HTML */
  let cv = null;
  let g = null;
  function ctx() {
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      g = cv.getContext('2d', { willReadFrequently: true });
    }
    return g;
  }

  /* ---------------- vykreslení ---------------- */
  const BASE = `.ng-root{display:block;position:relative;width:${W}px;height:${H}px;overflow:hidden;margin:0;padding:0;background:#fff;font:16px/1.2 sans-serif;color:#000}`;
  function build(html, css) {
    const doc = document.implementation.createHTMLDocument('');
    const root = doc.createElement('div');
    root.setAttribute('class', 'ng-root');
    root.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    const st = doc.createElement('style');
    st.textContent = BASE + '\n' + String(css || '');
    root.appendChild(st);
    const holder = doc.createElement('div');
    holder.innerHTML = String(html || '');
    holder.querySelectorAll('script, link, iframe, object, embed').forEach(el => el.remove());
    holder.querySelectorAll('*').forEach(el => [...el.attributes].forEach(a => { if (/^on/i.test(a.name)) el.removeAttribute(a.name); }));
    while (holder.firstChild) root.appendChild(holder.firstChild);
    const xml = new XMLSerializer().serializeToString(root);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject x="0" y="0" width="${W}" height="${H}">${xml}</foreignObject></svg>`;
  }
  function toImage(svg) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'sync';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Obraz se nepodařilo vykreslit.'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  /* vrátí ImageData 400 × 300 */
  async function render(html, css) {
    const img = await toImage(build(html, css));
    const c = ctx();
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#fff';
    c.fillRect(0, 0, W, H);
    c.drawImage(img, 0, 0, W, H);
    return c.getImageData(0, 0, W, H);
  }
  /* obrázek jako data URL (pro miniatury) */
  async function renderURL(html, css, scale) {
    const img = await toImage(build(html, css));
    const s = scale || 1;
    const c = document.createElement('canvas');
    c.width = Math.round(W * s);
    c.height = Math.round(H * s);
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.fillRect(0, 0, c.width, c.height);
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }

  /* ---------------- porovnání ---------------- */
  /* hrany v katalogu: pixel, který se výrazně liší od souseda vpravo nebo dole */
  function edgeWeights(t) {
    const w = new Float32Array(N).fill(1);
    const d = t.data;
    const diff = (i, j) => Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        const i = p * 4;
        if (x + 1 < W && diff(i, i + 4) > 48) { w[p] = EDGE_W; w[p + 1] = EDGE_W; }
        if (y + 1 < H && diff(i, i + W * 4) > 48) { w[p] = EDGE_W; w[p + W] = EDGE_W; }
      }
    }
    return w;
  }
  /* chyba pixelu: do tolerance nula, pak roste s rozdílem barev (podobná barva je „skoro dobře“) */
  const pixErr = d => (d <= TOL ? 0 : Math.min(1, (d - TOL) / 150));
  function error(t, img, w) {
    const a = t.data;
    const b = img.data;
    let e = 0;
    let bad = 0;
    for (let p = 0, i = 0; p < N; p++, i += 4) {
      const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      if (d > TOL) { e += w[p] * pixErr(d); bad++; }
    }
    return { e, bad };
  }
  /*
   * Katalog: { img, w, base } – base je chyba výchozího (vybledlého) plátna.
   * Skóre = kolik z původně špatných pixelů je teď správně (0–100 %).
   */
  function prepare(target, starter) {
    const w = edgeWeights(target);
    const base = Math.max(1, error(target, starter, w).e);
    return { img: target, w, base };
  }
  function score(cat, img) {
    const { e, bad } = error(cat.img, img, cat.w);
    const s = Math.max(0, Math.min(1, 1 - e / cat.base));
    return { score: s * 100, bad, exact: 100 * (1 - bad / N) };
  }
  /* obraz rozdílů: správné pixely zešednou, špatné svítí purpurově */
  function diffImage(cat, img) {
    const out = new ImageData(W, H);
    const a = cat.img.data;
    const b = img.data;
    const o = out.data;
    for (let p = 0, i = 0; p < N; p++, i += 4) {
      const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      if (d > TOL) {
        const k = cat.w[p] < 1 ? 0.35 : 0.35 + 0.65 * pixErr(d);
        o[i] = 255; o[i + 1] = Math.round(230 - 200 * k); o[i + 2] = Math.round(240 - 50 * k); o[i + 3] = 255;
      } else {
        const l = (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11) * 0.45 + 120;
        o[i] = l; o[i + 1] = l; o[i + 2] = l; o[i + 3] = 255;
      }
    }
    return out;
  }
  const hex2 = v => v.toString(16).padStart(2, '0');
  function pick(img, x, y) {
    x = Math.max(0, Math.min(W - 1, Math.round(x)));
    y = Math.max(0, Math.min(H - 1, Math.round(y)));
    const i = (y * W + x) * 4;
    const d = img.data;
    return '#' + hex2(d[i]) + hex2(d[i + 1]) + hex2(d[i + 2]);
  }
  /* nejčastější barvy obrazu (paleta katalogu) */
  function palette(img, max) {
    const m = new Map();
    const d = img.data;
    for (let i = 0; i < d.length; i += 16) {
      const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      m.set(k, (m.get(k) || 0) + 1);
    }
    const out = [];
    [...m.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => {
      if (n < 40 || out.length >= (max || 6)) return;
      const c = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
      if (out.some(o => Math.abs(o[0] - c[0]) + Math.abs(o[1] - c[1]) + Math.abs(o[2] - c[2]) < 40)) return;
      out.push(c);
    });
    return out.map(c => '#' + c.map(hex2).join(''));
  }

  /* ---------------- kontrola CSS ---------------- */
  const COMMON = ['width', 'height', 'background', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'border', 'border-radius', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-width', 'border-style', 'border-color',
    'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius', 'position', 'top', 'right', 'bottom', 'left', 'inset', 'z-index', 'margin', 'padding', 'display', 'box-shadow', 'transform', 'transform-origin', 'rotate', 'scale', 'translate',
    'clip-path', 'opacity', 'overflow', 'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-column', 'grid-row', 'grid-area', 'gap', 'row-gap', 'column-gap', 'justify-content', 'align-items', 'place-items', 'content', 'color', 'box-sizing', 'aspect-ratio', 'min-width', 'min-height', 'max-width', 'max-height', 'flex', 'flex-direction', 'mix-blend-mode', 'filter'];
  function lev(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i].concat(Array(n).fill(0)));
    for (let j = 1; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[m][n];
  }
  function suggestProp(p) {
    let best = null;
    COMMON.forEach(c => { const d = lev(p, c); if (d <= Math.max(2, Math.floor(c.length / 4)) && (!best || d < best.d)) best = { c, d }; });
    return best ? best.c : '';
  }
  const LENGTH_PROPS = /^(width|height|top|right|bottom|left|margin|padding|gap|row-gap|column-gap|border-width|min-width|min-height|max-width|max-height|font-size|inset|border-radius|outline-offset)$/;
  /* vrací [{ line, msg }] – česky a s návrhem opravy */
  const short = v => { const t = String(v).replace(/\s+/g, ' ').trim(); return t.length > 60 ? t.slice(0, 57) + '…' : t; };
  function lint(css) {
    const out = [];
    const src = String(css || '');
    const lineAt = pos => src.slice(0, pos).split('\n').length;
    // komentáře nahradíme mezerami, ať sedí pozice
    const clean = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
    const unclosed = clean.match(/\/\*/);
    if (unclosed) out.push({ line: lineAt(unclosed.index), type: 'komentář', msg: 'Komentář /* není uzavřený. Chybí */.' });
    const stack = [];
    let prelude = 0;
    for (let i = 0; i < clean.length; i++) {
      const c = clean[i];
      if (c === '{') {
        const sel = clean.slice(prelude, i).trim();
        if (sel.startsWith('@')) stack.push({ at: true });
        else {
          if (sel) {
            let okSel = true;
            try { document.createDocumentFragment().querySelector(sel.replace(/::?(before|after)\b/g, '') || '*'); } catch (e) { okSel = false; }
            if (!okSel) out.push({ line: lineAt(prelude + clean.slice(prelude, i).search(/\S/)), type: 'selektor', msg: `Selektor „${sel}“ je zapsaný špatně.` });
          } else out.push({ line: lineAt(i), type: 'selektor', msg: 'Před { chybí selektor, třeba .slunce.' });
          stack.push({ at: false, start: i + 1 });
        }
        prelude = i + 1;
      } else if (c === '}') {
        const f = stack.pop();
        if (!f) out.push({ line: lineAt(i), type: 'závorka', msg: 'Přebývá zavírací závorka }.' });
        else if (!f.at) checkDecls(clean.slice(f.start, i), f.start);
        prelude = i + 1;
      } else if (c === ';' && !stack.length) prelude = i + 1;
    }
    const depth = stack.length;
    if (depth > 0) out.push({ line: lineAt(clean.length), type: 'závorka', msg: 'Chybí zavírací závorka }. Každé pravidlo musí končit }.' });
    function checkDecls(body, offset) {
      const re = /([^;:{}]+?)\s*:\s*([^;{}]*)/g;
      let m;
      while ((m = re.exec(body))) {
        const prop = m[1].trim().toLowerCase();
        const value = m[2].trim().replace(/\s*!important$/i, '');
        const line = lineAt(offset + m.index + m[0].search(/\S/));
        if (!prop || prop.startsWith('--')) continue;
        if (!/^[a-z-]+$/.test(prop)) { out.push({ line, type: 'středník', msg: `„${m[1].trim()}“ není vlastnost CSS. Chybí středník na konci předchozího řádku?` }); continue; }
        if (!CSS.supports(prop, 'inherit')) {
          const s = suggestProp(prop);
          out.push({ line, type: 'neznámá vlastnost', msg: `Vlastnost „${prop}“ neexistuje.${s ? ` Nemyslel(a) jsi ${s}?` : ''}` });
          continue;
        }
        if (!value) { out.push({ line, type: 'chybí hodnota', msg: `U vlastnosti ${prop} chybí hodnota.` }); continue; }
        const glued = !/url\(|["']/i.test(value) && value.match(/^([\s\S]*?)\s+([a-z-]+)\s*:/i);
        if (glued && CSS.supports(glued[2].toLowerCase(), 'inherit')) {
          out.push({ line, type: 'středník', msg: `Za „${prop}: ${short(glued[1])}“ chybí středník. Každá vlastnost končí znakem ;.` });
          continue;
        }
        if (/var\(/.test(value)) continue;
        if (!CSS.supports(prop, value)) {
          let hint = '';
          let type = 'neplatná hodnota';
          if (LENGTH_PROPS.test(prop) && /(^|\s)-?\d*\.?\d+(\s|$)/.test(value) && !/^0$/.test(value)) { hint = ' Chybí jednotka? Čísla kromě nuly potřebují px nebo %.'; type = 'chybí jednotka'; }
          else if (/#[0-9a-f]*[^0-9a-f\s,)]/i.test(value) || /#([0-9a-f]{1,2}|[0-9a-f]{4,5}|[0-9a-f]{7,})\b/i.test(value)) { hint = ' Barva v hex zápisu má 3 nebo 6 znaků 0–9 a a–f.'; type = 'špatná barva'; }
          else if (/gradient/.test(value)) { hint = ' Zkontroluj závorky a čárky v přechodu.'; type = 'chyba v přechodu'; }
          else if (/polygon/.test(value)) { hint = ' Body polygonu odděluj čárkou, souřadnice mezerou: polygon(50% 0, 100% 100%, 0 100%).'; type = 'chyba v polygonu'; }
          out.push({ line, type, msg: `Hodnota „${short(value)}“ u ${prop} je neplatná, prohlížeč ji ignoruje.${hint}` });
        }
      }
    }
    return out;
  }

  /* rozbor CSS na pravidla (pro bonusové kontroly) */
  function rules(css) {
    const sheet = new CSSStyleSheet();
    try { sheet.replaceSync(String(css || '')); } catch (e) { return []; }
    const out = [];
    const walk = list => [...list].forEach(r => {
      if (r.cssRules && !r.selectorText) walk(r.cssRules);
      else if (r.selectorText) out.push({ sel: r.selectorText, style: r.style });
    });
    walk(sheet.cssRules);
    return out;
  }
  /* počet znaků bez mezer a komentářů (pro bonus „zlatý rám“) */
  function size(css) { return String(css || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '').length; }
  function elements(html) {
    // neaktivní dokument: obrázky se nenačítají a skripty ani on… atributy se nespustí
    const d = document.implementation.createHTMLDocument('');
    d.body.innerHTML = String(html || '');
    return [...d.body.querySelectorAll('*')];
  }

  /* umí prohlížeč přečíst pixely obrázku vykresleného z HTML? (Safari to z bezpečnostních důvodů zakazuje) */
  let support = null;
  function supported() {
    if (!support) support = render('<div style="width:10px;height:10px;background:#123456"></div>', '').then(d => !!d && d.data.length === N * 4, () => false);
    return support;
  }

  global.Painter = { W, H, build, render, renderURL, prepare, score, diffImage, pick, palette, lint, rules, size, elements, edgeWeights, error, supported };
})(typeof window !== 'undefined' ? window : globalThis);
