/*
 * Web bez bariér – obsah: testeři, kapitoly, obrázky do stránek, pomůcky pro kontroly, vstupní a výstupní test.
 * Úrovně jsou v souborech levels-1.js až levels-3.js.
 */
(function (global) {
  'use strict';

  const fold = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const num = (n, d) => String(+Number(n).toFixed(d === undefined ? 1 : d)).replace('.', ',');

  /* ---------------- testeři ---------------- */
  const PERSONAS = {
    karel: { name: 'Karel', age: 52, role: 'Nevidomý, web mu čte čtečka obrazovky', short: 'čtečka obrazovky', ico: '🦯', color: '#6d3fb5', view: 'reader', ok: 'Všechno jsem slyšel a pochopil. Díky!' },
    tomas: { name: 'Tomáš', age: 34, role: 'Ruka v sádře, ovládá web jen klávesnicí', short: 'jen klávesnice', ico: '⌨️', color: '#1d4ed8', view: 'keys', ok: 'Prošel jsem to celé bez myši.' },
    jana: { name: 'Jana', age: 68, role: 'Slabozraká, potřebuje silný kontrast', short: 'slabý zrak', ico: '👓', color: '#b4470f', view: 'contrast', ok: 'Konečně to přečtu bez lupy.' },
    eliska: { name: 'Eliška', age: 27, role: 'Porucha rovnováhy, pohyb jí dělá zle', short: 'citlivá na pohyb', ico: '🌀', color: '#0f766e', view: 'motion', ok: 'Nic se nehoupe, je mi dobře.' }
  };

  const CHAPTERS = [
    { id: 1, icon: '🔊', title: 'Co čtečka neslyší', desc: 'HTML: popisky obrázků, nadpisy, formuláře a odkazy. Testuje hlavně Karel.' },
    { id: 2, icon: '⌨️', title: 'Bez myši a bez lupy', desc: 'CSS a klávesnice: kontrast, viditelný fokus, skutečná tlačítka a skok přes menu.' },
    { id: 3, icon: '🔔', title: 'Když se stránka mění', desc: 'JavaScript a ARIA: chybové hlášky, rozbalování a pohyb. Na konci e-shop pro všechny.' }
  ];

  /* ---------------- obrázky do stránek (SVG) ---------------- */
  const svg = s => 'data:image/svg+xml,' + encodeURIComponent(s.replace(/\s*\n\s*/g, ' ').trim());
  const plate = '<rect width="200" height="170" rx="16" fill="#fdf1de"/>';
  const label = t => `<text x="100" y="156" text-anchor="middle" font-family="Georgia, serif" font-size="17" fill="#5a3418">${t}</text>`;
  const grains = (y, rot) => Array.from({ length: 7 }, (_, i) => `<ellipse cx="${34 + i * 22}" cy="${y}" rx="8" ry="3.2" transform="rotate(${rot} ${34 + i * 22} ${y})"/>`).join('');

  const ASSETS = {
    'logo.svg': svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 64" width="250" height="64">
      <path d="M32 56 C12 42 6 22 19 13 C27 8 33 13 34 20 C35 13 41 8 49 13 C62 22 56 42 36 56 Z" fill="#8bb04a"/>
      <path d="M34 21 V60" stroke="#55702a" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M34 34 L24 26 M34 42 L45 33" stroke="#55702a" stroke-width="2" stroke-linecap="round"/>
      <text x="70" y="27" font-family="Georgia, serif" font-size="14" letter-spacing="3" fill="#f3d9b1">PEKÁRNA</text>
      <text x="69" y="54" font-family="Georgia, serif" font-size="27" font-style="italic" fill="#fff4e0">U Lípy</text></svg>`),
    'ratolest.svg': svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 24" width="200" height="24">
      <path d="M14 12 H186" stroke="#c08a3e" stroke-width="2"/>
      <g fill="#c08a3e">${grains(6.5, -24)}${grains(17.5, 24)}<path d="M100 4 L106 12 L100 20 L94 12 Z" fill="#8a5a22"/></g></svg>`),
    'chleba.svg': svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 170" width="200" height="170">${plate}
      <ellipse cx="100" cy="116" rx="80" ry="11" fill="#ead2a8"/>
      <path d="M24 112 C24 64 60 40 100 40 C140 40 176 64 176 112 Z" fill="#b8733a"/>
      <path d="M42 104 C46 72 72 54 100 54 C128 54 154 72 158 104" fill="none" stroke="#dca064" stroke-width="7" opacity=".5"/>
      <path d="M68 64 L82 94 M98 58 L108 92 M126 64 L134 94" stroke="#7a461c" stroke-width="5" stroke-linecap="round"/>
      ${label('Kváskový chléb')}</svg>`),
    'rohlik.svg': svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 170" width="200" height="170">${plate}
      <ellipse cx="100" cy="116" rx="74" ry="9" fill="#ead2a8"/>
      <path d="M28 108 C34 70 66 46 100 46 C134 46 166 70 172 108 C156 96 140 92 128 96 C118 82 82 82 72 96 C60 92 44 96 28 108 Z" fill="#d89a4f"/>
      <path d="M72 96 C76 72 90 60 100 56 M128 96 C124 72 110 60 100 56 M100 56 V86" stroke="#a5662a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <g fill="#fff6e6"><circle cx="86" cy="70" r="2"/><circle cx="112" cy="68" r="2"/><circle cx="96" cy="78" r="1.6"/><circle cx="120" cy="80" r="1.6"/><circle cx="78" cy="84" r="1.6"/></g>
      ${label('Máslový rohlík')}</svg>`),
    'kolac.svg': svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 170" width="200" height="170">${plate}
      <circle cx="100" cy="78" r="58" fill="#e8b66c"/>
      <circle cx="100" cy="78" r="58" fill="none" stroke="#c98c3e" stroke-width="7"/>
      <circle cx="100" cy="78" r="31" fill="#5e2a4f"/>
      <path d="M86 70 C92 62 104 62 110 68" stroke="#8e4a77" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g fill="#f8e2b6"><circle cx="58" cy="60" r="3"/><circle cx="142" cy="66" r="3"/><circle cx="64" cy="104" r="3"/><circle cx="136" cy="104" r="2.6"/><circle cx="100" cy="30" r="2.6"/></g>
      ${label('Švestkový koláč')}</svg>`),
    'znak.svg': svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 70" width="60" height="70">
      <path d="M4 4 H56 V34 C56 52 42 62 30 67 C18 62 4 52 4 34 Z" fill="#f2c94c" stroke="#fff" stroke-width="3"/>
      <path d="M30 14 V56 M30 26 L20 18 M30 26 L40 18 M30 38 L18 30 M30 38 L42 30" stroke="#1d3f7a" stroke-width="4" stroke-linecap="round"/></svg>`),
    'chorvatsko.svg': svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 250" width="520" height="250" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3f4"/><stop offset="1" stop-color="#d9f3ff"/></linearGradient></defs>
      <rect width="520" height="250" fill="url(#n)"/><circle cx="420" cy="62" r="32" fill="#ffd23f"/>
      <path d="M0 130 H520 V250 H0 Z" fill="#17a2b8"/><path d="M0 150 C80 140 160 160 260 150 C360 140 440 158 520 148 V250 H0 Z" fill="#11889c"/>
      <path d="M0 200 C120 180 260 196 520 186 V250 H0 Z" fill="#f3dfb1"/>
      <path d="M150 126 L190 126 L184 136 L156 136 Z" fill="#fff"/><path d="M170 96 V126 M170 98 L186 122 H170" stroke="#fff" stroke-width="3" fill="#fff"/></svg>`),
    'alpy.svg': svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 250" width="520" height="250" preserveAspectRatio="xMidYMid slice">
      <rect width="520" height="250" fill="#cfe9ff"/>
      <path d="M-20 220 L120 60 L250 220 Z" fill="#6c7a89"/><path d="M120 60 L156 102 L136 96 L120 110 L104 94 L86 100 Z" fill="#fff"/>
      <path d="M160 230 L330 34 L500 230 Z" fill="#56657a"/><path d="M330 34 L376 88 L350 80 L330 98 L310 80 L286 88 Z" fill="#fff"/>
      <path d="M360 230 L470 100 L580 230 Z" fill="#7b8a9a"/><path d="M470 100 L496 130 L470 124 L446 130 Z" fill="#fff"/>
      <path d="M0 200 C120 186 300 206 520 192 V250 H0 Z" fill="#5fa35a"/></svg>`),
    'rim.svg': svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 250" width="520" height="250" preserveAspectRatio="xMidYMid slice">
      <rect width="520" height="250" fill="#ffd9a8"/><circle cx="110" cy="70" r="30" fill="#fff1c9"/>
      <path d="M90 210 V110 C90 90 430 90 430 110 V210 Z" fill="#d8a06a"/>
      <g fill="#a8693a">${Array.from({ length: 8 }, (_, i) => `<path d="M${108 + i * 40} 150 V128 a12 12 0 0 1 24 0 V150 Z"/><path d="M${108 + i * 40} 200 V178 a12 12 0 0 1 24 0 V200 Z"/>`).join('')}</g>
      <path d="M0 210 H520 V250 H0 Z" fill="#c9b48e"/></svg>`),
    'kolo.svg': svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 240" width="330" height="240">
      <rect width="330" height="240" rx="18" fill="#ffffff"/>
      <g fill="none" stroke="#2b3440" stroke-width="7"><circle cx="82" cy="160" r="52"/><circle cx="250" cy="160" r="52"/></g>
      <g fill="none" stroke="#9aa6b2" stroke-width="2"><circle cx="82" cy="160" r="40"/><circle cx="250" cy="160" r="40"/></g>
      <g fill="none" stroke="#1f5fbf" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M82 160 L140 100 L210 100 L250 160 M140 100 L160 160 L210 100 M160 160 L82 160"/><path d="M210 100 L200 66"/><path d="M140 100 L132 78"/></g>
      <path d="M116 74 H150" stroke="#2b3440" stroke-width="8" stroke-linecap="round"/>
      <path d="M186 62 C196 54 214 56 222 64" stroke="#2b3440" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M222 70 H272 L264 98 H230 Z" fill="#c98c3e" stroke="#8a5a22" stroke-width="3"/>
      <circle cx="160" cy="160" r="9" fill="#2b3440"/></svg>`)
  };

  /* ---------------- pomůcky pro kontroly ---------------- */
  const H = {
    fold, num,
    f: (say, fix) => ({ say, fix }),
    src: el => (el.getAttribute('data-src') || el.getAttribute('src') || '').split('/').pop(),
    img: (ctx, file) => ctx.$$('img').find(i => H.src(i) === file) || null,
    has: (s, ...w) => w.some(x => fold(s).includes(fold(x))),
    q: s => `„${s}“`,
    ratio: r => `${num(r, 1)} : 1`,
    headings: ctx => ctx.$$('h1, h2, h3, h4, h5, h6, [role="heading"]').filter(h => !ctx.isHidden(h)).map(h => ({ el: h, level: +(h.getAttribute('aria-level') || (/^H(\d)$/.exec(h.tagName) || [0, 2])[1]), name: ctx.name(h) })),
    landmarks: (ctx, r) => ctx.$$('*').filter(el => !ctx.isHidden(el) && ctx.role(el) === r),
    links: ctx => ctx.$$('a[href]').filter(a => !ctx.isHidden(a)),
    /* hledá prvek podle třídy, když hráč změnil značku */
    byClass: (ctx, cls) => ctx.$('.' + cls),
    textOf: el => (el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : ''),
    /* odstín a sytost barvy (pro kontrolu „barva značky zůstala“) */
    hsl(hex) {
      const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
      if (!m) return { h: 0, s: 0, l: 0 };
      const r = parseInt(m[1], 16) / 255;
      const g = parseInt(m[2], 16) / 255;
      const b = parseInt(m[3], 16) / 255;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const l = (mx + mn) / 2;
      if (mx === mn) return { h: 0, s: 0, l };
      const d = mx - mn;
      const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return { h: h * 60, s, l };
    }
  };

  /* řešení a chybné varianty se zapisují jako záměny v kódu zadání */
  function applyFix(files, fix) {
    const out = Object.assign({}, files);
    Object.entries(fix || {}).forEach(([k, pairs]) => {
      pairs.forEach(([from, to]) => {
        if (from === null) { out[k] = (out[k] || '') + to; return; }
        if (!String(out[k] || '').includes(from)) throw new Error(`Záměna v ${k} nenalezena: ${from.slice(0, 60)}`);
        out[k] = out[k].replace(from, () => to);
      });
    });
    return out;
  }

  /* ---------------- vstupní a výstupní test ---------------- */
  const CONCEPTS = {
    alt: 'Popisky obrázků (alt)',
    nadpisy: 'Nadpisy a jazyk stránky',
    label: 'Popisky formulářových polí',
    odkazy: 'Srozumitelné odkazy',
    kontrast: 'Kontrast textu',
    fokus: 'Viditelný fokus',
    button: 'Tlačítka a klávesnice',
    oblasti: 'Oblasti stránky a skok přes menu',
    aria: 'ARIA: živé oblasti a stavy',
    pohyb: 'Omezení pohybu'
  };
  const QUIZ = {
    A: [
      { c: 'alt', q: 'Cukrárna má v nabídce fotku jahodového dortu. Jaký alt je nejlepší?', a: ['alt="Jahodový dort"', 'alt="dort-03.jpg"', 'alt=""', 'Žádný, čtečka obrázek popíše sama'], ok: 0, codeAnswers: true, textAnswers: [3], alang: 'html' },
      { c: 'nadpisy', q: 'Stránka má jeden nadpis h1 a pod ním tři sekce. Jakou značku dostanou nadpisy sekcí?', a: ['h2', 'h4, protože mají menší písmo', 'div s velkým tučným písmem', 'h1, ať jsou výrazné'], ok: 0 },
      { c: 'label', q: 'Jak správně propojit popisek s polem <input id="mesto">?', a: ['<label for="mesto">Město</label>', '<span>Město</span>', '<input id="mesto" placeholder="Město">', '<label id="mesto">Město</label>'], ok: 0, codeAnswers: true, alang: 'html' },
      { c: 'odkazy', q: 'Který text odkazu pomůže uživateli čtečky nejvíc?', a: ['Ceník kurzů (PDF)', 'Klikněte zde', 'Více', 'Odkaz'], ok: 0 },
      { c: 'kontrast', q: 'Jaký nejmenší kontrast potřebuje běžný (malý) text podle WCAG, úroveň AA?', a: ['4,5 : 1', '1,5 : 1', '3 : 1', '21 : 1'], ok: 0 },
      { c: 'fokus', q: 'Co způsobí tohle pravidlo, když za něj nic nedáš?', code: '*:focus {\n  outline: none;\n}', lang: 'css', a: ['Uživatel klávesnice nevidí, kde na stránce je', 'Stránka se rychleji načte', 'Odkazy přestanou fungovat na myš', 'Nic, prohlížeč fokus stejně ukáže'], ok: 0 },
      { c: 'button', q: 'Proč je lepší <button> než <div> s obsluhou kliknutí?', a: ['Na button se dostaneš Tabem a spustíš ho Enterem i mezerníkem', 'Div nejde nastylovat', 'Button se rychleji načte', 'Div nemůže obsahovat text'], ok: 0 },
      { c: 'oblasti', q: 'K čemu slouží odkaz „Přeskočit na obsah“ na začátku stránky?', a: ['Uživatel klávesnice nemusí Tabem procházet celé menu', 'Skryje menu všem návštěvníkům', 'Zrychlí načtení stránky', 'Je jen pro vyhledávače'], ok: 0 },
      { c: 'aria', q: 'Formulář po odeslání vypíše chybu. Jak zařídit, aby ji čtečka přečetla sama?', a: ['Vložit ji do živé oblasti, třeba role="alert"', 'Obarvit ji červeně', 'Dát jí větší písmo', 'Vypsat ji přes console.log'], ok: 0 },
      { c: 'pohyb', q: 'Jak v CSS vypnout animaci lidem, kteří mají v systému zapnuté Omezit pohyb?', a: ['@media (prefers-reduced-motion: reduce) {\n  .banner { animation: none; }\n}', '@media (max-width: 600px) {\n  .banner { animation: none; }\n}', '.banner:hover {\n  animation: none;\n}', '@media print {\n  .banner { animation: none; }\n}'], ok: 0, codeAnswers: true, alang: 'css' }
    ],
    B: [
      { c: 'alt', q: 'Mezi odstavci je ozdobná vlnovka, která nic nesděluje. Jaký alt jí dát?', a: ['alt=""', 'alt="vlnovka"', 'alt="ozdoba.svg"', 'Atribut alt vynechat'], ok: 0, codeAnswers: true, textAnswers: [3], alang: 'html' },
      { c: 'nadpisy', q: 'Čtečka čte českou stránku anglickým hlasem. Co je nejspíš špatně?', a: ['Značka html nemá lang="cs"', 'Stránka nemá nadpis h1', 'Chybí meta charset', 'Text je moc dlouhý'], ok: 0 },
      { c: 'label', q: 'Proč u pole nestačí jen placeholder?', a: ['Při psaní zmizí a čtečka ho nemusí přečíst jako popisek', 'Placeholder nejde nastylovat', 'Placeholder zpomalí formulář', 'Stačí, placeholder funguje stejně jako label'], ok: 0 },
      { c: 'odkazy', q: 'Odkaz obsahuje jen ikonu obálky (SVG) a žádný text. Co mu přidat?', a: ['aria-label="Napište nám e-mail"', 'class="email-ikona"', 'tabindex="1"', 'style="cursor: pointer"'], ok: 0, codeAnswers: true, alang: 'html' },
      { c: 'kontrast', q: 'Velký nadpis (32 px) má kontrast 3,4 : 1. Splňuje WCAG AA?', a: ['Ano, velkému textu stačí 3 : 1', 'Ne, každý text potřebuje 7 : 1', 'Ne, potřebuje aspoň 4,5 : 1', 'Kontrast se u nadpisů neřeší'], ok: 0 },
      { c: 'fokus', q: 'Čím se liší :focus-visible od :focus?', a: ['Prohlížeč ho ukáže hlavně při ovládání klávesnicí, ne po kliknutí myší', 'Funguje jen na odkazech', 'Je to starší zápis :focus', 'Zobrazí se jen na mobilu'], ok: 0 },
      { c: 'button', q: 'Na stránce je <div class="plus">+</div> s obsluhou kliknutí. Co zažije uživatel klávesnice?', a: ['Tabem ho přeskočí a Enterem ho nespustí', 'Všechno mu funguje normálně', 'Uslyší „tlačítko plus“', 'Prohlížeč div sám převede na button'], ok: 0 },
      { c: 'oblasti', q: 'Která značka označí hlavní obsah stránky, aby na něj čtečka uměla skočit?', a: ['<main>', '<div id="main">', '<section>', '<body>'], ok: 0, codeAnswers: true, alang: 'html' },
      { c: 'aria', q: 'Tlačítko v sekci FAQ rozbaluje odpověď. Který atribut řekne čtečce, jestli je rozbalená?', a: ['aria-expanded="true" nebo "false"', 'aria-label="rozbaleno"', 'hidden', 'role="faq"'], ok: 0 },
      { c: 'pohyb', q: 'Jak v JavaScriptu zjistit, že uživatel chce omezit pohyb?', a: ["matchMedia('(prefers-reduced-motion: reduce)').matches", 'navigator.reducedMotion', 'window.motion === false', 'document.prefersReducedMotion()'], ok: 0, codeAnswers: true, alang: 'js' }
    ]
  };

  global.WBB = { PERSONAS, CHAPTERS, ASSETS, H, applyFix, CONCEPTS, QUIZ, LEVELS: [] };
})(typeof window !== 'undefined' ? window : globalThis);
