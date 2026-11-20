/*
 * Web Studio Tycoon – zakázky klientů, testy požadavků, kvíz
 *
 * Každá zakázka má:
 *   client, brief            – kdo zadává a co chce (zprávy v chatu)
 *   html / css / js          – výchozí kód (index.html, style.css, script.js)
 *   solution                 – vzorové řešení { html?, js? } (chybějící část = výchozí)
 *   reqs                     – požadavky; test(t) spustí stránku, kliká a píše, při nesplnění vyhodí chybu se zprávou
 *   wish                     – „přání navíc“ (bonus)
 *   wrong                    – typické chybné pokusy (pro automatické testy – musí neprojít)
 */
(function (global) {
  'use strict';

  const FLOORS = [
    { id: 1, title: 'Přízemí – HTML', icon: '🧱', desc: 'struktura stránky, odkazy, obrázky, formuláře' },
    { id: 2, title: '1. patro – JavaScript a události', icon: '⚡', desc: 'kliknutí, políčka, čísla, třídy, klávesy' },
    { id: 3, title: '2. patro – data a logika', icon: '🧠', desc: 'pole, cykly, nové prvky, kontrola, filtrování, košík' }
  ];

  /* společné styly náhledu + barvy klienta */
  const theme = (bg, text, accent, onAccent, extra) => `/* Barvy klienta – klidně si je uprav */
:root { --bg: ${bg}; --text: ${text}; --accent: ${accent}; --on-accent: ${onAccent}; }

* { box-sizing: border-box; }
body { margin: 0; padding: 24px; font: 16px/1.5 system-ui, sans-serif; color: var(--text); background: var(--bg); }
h1 { margin: 0 0 12px; color: var(--accent); }
h2 { color: var(--accent); margin: 18px 0 8px; }
a { color: var(--accent); }
button { font: inherit; padding: 8px 14px; border: 0; border-radius: 8px; background: var(--accent); color: var(--on-accent); cursor: pointer; margin: 4px 4px 4px 0; }
button:hover { filter: brightness(1.1); }
input, select { font: inherit; padding: 8px 10px; border: 1px solid #0003; border-radius: 8px; margin: 4px 0; }
[hidden] { display: none !important; }
${extra || ''}`;

  const CAT_SVG = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160"><rect width="200" height="160" rx="18" fill="#1f1235"/>
<path d="M58 62 L70 22 L92 52 Z M142 62 L130 22 L108 52 Z" fill="#f97316"/><circle cx="100" cy="82" r="48" fill="#fb923c"/>
<circle cx="82" cy="76" r="9" fill="#fff"/><circle cx="118" cy="76" r="9" fill="#fff"/><circle cx="84" cy="78" r="4.5" fill="#111"/><circle cx="120" cy="78" r="4.5" fill="#111"/>
<path d="M92 96 Q100 104 108 96" stroke="#111" stroke-width="3" fill="none"/><path d="M100 88 l-5 -5 h10 z" fill="#be185d"/>
<path d="M30 140 L80 104 M170 140 L120 104" stroke="#fde68a" stroke-width="7" stroke-linecap="round"/><circle cx="30" cy="140" r="8" fill="#fde68a"/><circle cx="170" cy="140" r="8" fill="#fde68a"/>
<text x="100" y="152" font-family="Arial Black,Arial" font-size="15" fill="#fde68a" text-anchor="middle">HLUČNÉ KOČKY</text></svg>`);

  const dash = (t, s) => t.norm(s).replace(/\s*[-–—]\s*/g, ' – ');
  /* „je 1 položka“, „jsou 2 položky“, „je 5 položek“ */
  const jePol = n => (n === 1 ? 'je 1 položka' : n >= 2 && n <= 4 ? `jsou ${n} položky` : `je ${n} položek`);
  const knih = n => (n === 1 ? '1 kniha' : n >= 2 && n <= 4 ? `${n} knihy` : `${n} knih`);

  const ORDERS = [
    /* ===================== PŘÍZEMÍ – HTML ===================== */
    {
      id: 1, floor: 1, reward: 400, concept: 'h1 · p · ul · li',
      client: { name: 'paní Marie', f: true, business: 'Pekárna U Kobližky', avatar: '🥐', domain: 'ukoblizky.cz' },
      brief: [
        'Dobrý den! Jsem Marie a mám malou pekárnu U Kobližky. Konkurence přes ulici už má web, tak ho chci taky.',
        'Stačí jednoduchá vizitka: velký nadpis s názvem pekárny, odstavec s otevírací dobou (otevíráme v 7:00) a seznam našich dobrot – aspoň tři.'
      ],
      html: '<!-- Napiš HTML vizitky pekárny.\n     Značky se píšou ve dvojicích: <h1>Nadpis</h1> -->\n\n',
      css: theme('#fff7ed', '#431407', '#c2410c', '#fff', 'body { max-width: 640px; }\nli { padding: 2px 0; }'),
      js: '// Tahle zakázka JavaScript nepotřebuje – všechno uděláš v HTML.\n',
      solution: { html: '<h1>Pekárna U Kobližky</h1>\n<p>Otevřeno každý den od 7:00 do 18:00.</p>\n<ul>\n  <li>Koblihy s marmeládou</li>\n  <li>Křupavé rohlíky</li>\n  <li>Kváskový chléb</li>\n</ul>\n<p>Objednávky na telefonu <a href="tel:+420777123456">777 123 456</a>.</p>\n' },
      reqs: [
        { text: 'Hlavní nadpis <h1> s názvem „U Kobližky“', test: t => { const h = t.need('h1', 'hlavní nadpis <h1>'); t.assert(/u kobližky/i.test(h.textContent), `Nadpis <h1> obsahuje „${t.norm(h.textContent)}“ – chybí v něm název „U Kobližky“.`); } },
        { text: 'Odstavec <p> s otevírací dobou (obsahuje 7:00)', test: t => { const ps = t.$$('p'); t.assert(ps.length, 'Na stránce není žádný odstavec <p>.'); t.assert(ps.some(p => p.textContent.includes('7:00')), 'Žádný odstavec <p> neobsahuje otevírací dobu 7:00.'); } },
        { text: 'Nečíslovaný seznam <ul> aspoň se 3 položkami <li>', test: t => { const uls = t.$$('ul'); t.assert(uls.length, t.$('ol') ? 'Máš číslovaný seznam <ol> – paní Marie chce nečíslovaný <ul>.' : 'Na stránce není seznam <ul>.'); const best = Math.max(...uls.map(u => u.querySelectorAll(':scope > li').length)); t.assert(best >= 3, `Seznam má jen ${best} ${best === 1 ? 'položku' : best === 0 ? 'položek' : 'položky'} <li> – chce aspoň 3.`); } },
        { text: 'Žádná položka seznamu není prázdná', test: t => { const lis = t.$$('ul > li'); t.assert(lis.length, 'Seznam nemá položky <li>.'); t.assert(lis.every(li => t.norm(li.textContent)), 'Některá položka <li> je prázdná.'); } }
      ],
      wish: { text: 'Telefon jako klikací odkaz (<a href="tel:…">)', test: t => t.assert(t.$('a[href^="tel:"]'), 'Chybí odkaz <a href="tel:…"> – na mobilu by se po klepnutí rovnou volalo.') },
      wrong: [
        { html: '<h2>Pekárna U Kobližky</h2>\n<p>Otevřeno od 7:00.</p>\n<ul><li>Koblihy</li><li>Rohlíky</li><li>Chléb</li></ul>\n' },
        { html: '<h1>Pekárna U Kobližky</h1>\n<p>Otevřeno od 7:00.</p>\n<ol><li>Koblihy</li><li>Rohlíky</li><li>Chléb</li></ol>\n' },
        { html: '<h1>Pekárna U Kobližky</h1>\nOtevřeno od 7:00.\n<ul><li>Koblihy</li><li>Rohlíky</li></ul>\n' }
      ],
      palette: { html: ['<h1>|</h1>', '<p>|</p>', '<ul>\n  <li>|</li>\n</ul>', '<li>|</li>', '<a href="tel:|"></a>', '<strong>|</strong>'] },
      hints: [
        'Nadpis: `<h1>Pekárna U Kobližky</h1>`. Odstavec: `<p>Otevřeno od 7:00</p>`.',
        'Seznam je `<ul>` a v něm každá položka jako `<li>…</li>` – a nezapomeň `</ul>` na konci.',
        'Odkaz na telefon: `<a href="tel:+420777123456">777 123 456</a>`.'
      ],
      learn: ['HTML popisuje strukturu stránky: h1–h6 jsou nadpisy, p odstavec, ul nečíslovaný a ol číslovaný seznam s položkami li, a je odkaz. Podle značek se ve stránce vyznají prohlížeče, vyhledávače i čtečky pro nevidomé.',
        '<h1>Název</h1>\n<p>Odstavec textu.</p>\n<ul>\n  <li>První</li>\n  <li>Druhá</li>\n</ul>\n<a href="https://example.com">Odkaz</a>', 'html']
    },
    {
      id: 2, floor: 1, reward: 500, concept: 'a href · id · img alt · target',
      client: { name: 'bubeník Ráďa', business: 'Kapela Hlučné kočky', avatar: '🥁', domain: 'hlucnekocky.cz' },
      brief: [
        'Čau! Hrajeme v kapele Hlučné kočky a potřebujeme web. Nahoře menu s odkazy Koncerty a Kontakt – po kliknutí ať stránka skočí na správnou sekci.',
        'Do první sekce dej naše logo – soubor kocky.svg už máš v projektu. A popisek (alt) pro nevidomé, prosím, máme i takové fanoušky.',
        'Jo, a odkaz na náš YouTube (https://www.youtube.com) ať se otevře v nové záložce, ať lidi neodejdou z webu.'
      ],
      assets: { 'kocky.svg': CAT_SVG },
      html: '<nav>\n  <!-- sem dej odkazy na sekce, např. <a href="#koncerty">Koncerty</a> -->\n</nav>\n\n<h1>Hlučné kočky</h1>\n\n<section>\n  <!-- sem patří logo: soubor kocky.svg -->\n  <p>Jsme garážová kapela z Brna a hrajeme hlasitě.</p>\n</section>\n\n<section>\n  <h2>Koncerty</h2>\n  <p>12. 12. – Klub Kotel · 24. 12. – Vánoční jam</p>\n</section>\n\n<section>\n  <h2>Kontakt</h2>\n  <p>Napiš nám nebo nás sleduj na YouTube.</p>\n</section>\n',
      css: theme('#120a1f', '#f5f3ff', '#f59e0b', '#1c1917', 'nav { display: flex; gap: 16px; padding: 10px 0 16px; border-bottom: 2px solid #f59e0b55; }\nnav a { font-weight: 700; text-decoration: none; }\nsection { padding: 14px 0; }\nimg { max-width: 260px; border-radius: 12px; display: block; margin-bottom: 8px; }'),
      js: '// Tahle zakázka JavaScript nepotřebuje.\n',
      solution: { html: '<nav>\n  <a href="#koncerty">Koncerty</a>\n  <a href="#kontakt">Kontakt</a>\n</nav>\n\n<h1>Hlučné kočky</h1>\n\n<section id="o-nas">\n  <img src="kocky.svg" alt="Logo kapely: kočka s paličkami">\n  <p>Jsme garážová kapela z Brna a hrajeme hlasitě.</p>\n</section>\n\n<section id="koncerty">\n  <h2>Koncerty</h2>\n  <p>12. 12. – Klub Kotel · 24. 12. – Vánoční jam</p>\n</section>\n\n<section id="kontakt">\n  <h2>Kontakt</h2>\n  <p>Napiš nám nebo nás sleduj na <a href="https://www.youtube.com" target="_blank">YouTube</a>.</p>\n</section>\n' },
      reqs: [
        { text: 'Obrázek kocky.svg s vyplněným popiskem alt', test: t => { const img = t.$$('img').find(i => i.dataset.src === 'kocky.svg' || i.getAttribute('src') === 'kocky.svg'); t.assert(img, 'Na stránce chybí obrázek <img src="kocky.svg">.'); t.assert(t.norm(img.getAttribute('alt')), 'Obrázek nemá popisek – doplň alt="…".'); } },
        { text: 'Menu <nav> aspoň se 2 odkazy na sekce (href="#…")', test: t => { const nav = t.need('nav', 'menu <nav>'); const links = [...nav.querySelectorAll('a[href^="#"]')].filter(a => a.getAttribute('href').length > 1); t.assert(links.length >= 2, `V menu ${links.length ? 'je jen 1 odkaz' : 'není žádný odkaz'} na sekci stránky (href="#id").`); } },
        { text: 'Odkazy z menu vedou na existující sekce (id)', test: t => { const links = t.$$('nav a[href^="#"]').filter(a => a.getAttribute('href').length > 1); t.assert(links.length, 'V menu nejsou odkazy na sekce.'); const bad = links.find(a => !t.d.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)))); t.assert(!bad, bad ? `Odkaz ${bad.getAttribute('href')} nikam nevede – žádný prvek nemá id="${bad.getAttribute('href').slice(1)}".` : ''); } },
        { text: 'Odkaz na https://www.youtube.com se otevře v nové záložce', test: t => { const a = t.$$('a[href]').find(x => /^https:\/\/(www\.)?youtube\.com/.test(x.getAttribute('href'))); t.assert(a, 'Chybí odkaz na https://www.youtube.com.'); t.assert(a.getAttribute('target') === '_blank', 'Odkaz na YouTube se otevře ve stejné záložce – přidej target="_blank".'); } }
      ],
      wish: { text: 'Každá sekce z menu má vlastní nadpis <h2>', test: t => { const links = t.$$('nav a[href^="#"]').filter(a => a.getAttribute('href').length > 1); t.assert(links.length, 'V menu nejsou odkazy na sekce.'); const bad = links.find(a => { const s = t.d.getElementById(a.getAttribute('href').slice(1)); return !s || !(s.matches('h2') || s.querySelector('h2')); }); t.assert(!bad, 'Některá sekce, na kterou vede menu, nemá nadpis <h2>.'); } },
      wrong: [
        { html: '<nav>\n  <a href="#koncerty">Koncerty</a>\n  <a href="#kontakt">Kontakt</a>\n</nav>\n<h1>Hlučné kočky</h1>\n<section>\n  <img src="kocky.svg" alt="Logo">\n</section>\n<section>\n  <h2>Koncerty</h2>\n</section>\n<section>\n  <h2>Kontakt</h2>\n  <a href="https://www.youtube.com" target="_blank">YouTube</a>\n</section>\n' },
        { html: '<nav>\n  <a href="#koncerty">Koncerty</a>\n  <a href="#kontakt">Kontakt</a>\n</nav>\n<h1>Hlučné kočky</h1>\n<section>\n  <img src="kocky.svg">\n</section>\n<section id="koncerty">\n  <h2>Koncerty</h2>\n</section>\n<section id="kontakt">\n  <h2>Kontakt</h2>\n  <a href="https://www.youtube.com">YouTube</a>\n</section>\n' }
      ],
      palette: { html: ['<a href="#|"></a>', 'id="|"', '<img src="kocky.svg" alt="|">', 'target="_blank"', '<a href="https://www.youtube.com" target="_blank">|</a>'] },
      hints: [
        'Sekci dej id: `<section id="koncerty">`. Odkaz na ni: `<a href="#koncerty">Koncerty</a>` – mřížka `#` znamená „na stránce“.',
        'Obrázek: `<img src="kocky.svg" alt="Logo kapely">`. Značka `img` se neuzavírá.',
        'Nová záložka: `<a href="https://www.youtube.com" target="_blank">YouTube</a>`.'
      ],
      learn: ['Atributy upřesňují značky: href říká, kam odkaz vede (#id = místo na stejné stránce), target="_blank" otevře novou záložku, src je soubor obrázku a alt jeho popis. id je jedinečný název prvku – použije ho odkaz, CSS i JavaScript.',
        '<a href="#kontakt">Kontakt</a>\n<section id="kontakt">…</section>\n<img src="logo.png" alt="Logo firmy">\n<a href="https://example.com" target="_blank">Web</a>', 'html']
    },
    {
      id: 3, floor: 1, reward: 600, concept: 'form · input · label · select',
      client: { name: 'ředitelka Novotná', f: true, business: 'Jazyková škola Babylon', avatar: '🎓', domain: 'babylon-skola.cz' },
      brief: [
        'Dobrý den, chceme online přihlášku na jazykové kurzy: jméno, e-mail, výběr úrovně (začátečník / pokročilý) a tlačítko Odeslat.',
        'Je pro nás důležitá přístupnost: každé pole musí mít popisek <label>, který je s polem propojený. Jinak nám to úřad neschválí.'
      ],
      html: '<h1>Přihláška na kurz</h1>\n\n<form>\n  <!-- pole: jméno, e-mail, úroveň (select) a tlačítko -->\n\n</form>\n',
      css: theme('#eff6ff', '#172554', '#1d4ed8', '#fff', 'form { display: grid; gap: 6px; max-width: 360px; background: #fff; padding: 16px; border-radius: 12px; box-shadow: 0 4px 16px #1d4ed822; }\nlabel { font-weight: 600; margin-top: 6px; }'),
      js: '// Tahle zakázka JavaScript nepotřebuje.\n',
      solution: { html: '<h1>Přihláška na kurz</h1>\n\n<form>\n  <label for="jmeno">Jméno</label>\n  <input type="text" id="jmeno" name="jmeno" required>\n\n  <label for="email">E-mail</label>\n  <input type="email" id="email" name="email" required>\n\n  <label for="uroven">Úroveň</label>\n  <select id="uroven" name="uroven">\n    <option>začátečník</option>\n    <option>pokročilý</option>\n  </select>\n\n  <button type="submit">Odeslat</button>\n</form>\n' },
      reqs: [
        { text: 'Formulář <form> s textovým polem pro jméno (name="jmeno")', test: t => { const f = t.need('form', 'formulář <form>'); const i = f.querySelector('input[name="jmeno"]'); t.assert(i, 'Ve formuláři chybí <input name="jmeno">.'); t.assert(['text', ''].includes((i.getAttribute('type') || '').toLowerCase()), 'Pole pro jméno má být textové (type="text").'); } },
        { text: 'Pole pro e-mail typu email (name="email")', test: t => { const i = t.$('form input[name="email"]'); t.assert(i, 'Ve formuláři chybí <input name="email">.'); t.assert((i.getAttribute('type') || '').toLowerCase() === 'email', 'Pole pro e-mail má mít type="email" – prohlížeč pak sám zkontroluje zavináč a mobil nabídne vhodnou klávesnici.'); } },
        { text: 'Výběr úrovně <select> aspoň se 2 možnostmi', test: t => { const s = t.$('form select'); t.assert(s, 'Ve formuláři chybí výběr <select>.'); t.assert(s.querySelectorAll('option').length >= 2, 'Výběr <select> potřebuje aspoň 2 možnosti <option>.'); } },
        { text: 'Každé pole má propojený popisek <label for="…">', test: t => { const fields = t.$$('form input, form select, form textarea').filter(el => !['submit', 'button', 'hidden', 'reset'].includes((el.getAttribute('type') || '').toLowerCase())); t.assert(fields.length, 'Formulář nemá žádná pole.'); for (const el of fields) { const ok = el.closest('label') || (el.id && [...t.d.querySelectorAll('label[for]')].some(l => l.getAttribute('for') === el.id)); t.assert(ok, `Pole ${el.name ? '„' + el.name + '“' : '<' + el.tagName.toLowerCase() + '>'} nemá propojený popisek – přidej <label for="${el.id || 'id-pole'}"> a poli stejné id.`); } } },
        { text: 'Tlačítko pro odeslání formuláře', test: t => { const b = t.$$('form button, form input[type="submit"]').find(x => x.tagName === 'INPUT' || ['', 'submit'].includes((x.getAttribute('type') || '').toLowerCase())); t.assert(b, 'Ve formuláři chybí tlačítko pro odeslání (<button>Odeslat</button>).'); } }
      ],
      wish: { text: 'Jméno i e-mail jsou povinné (required)', test: t => { const a = t.$('input[name="jmeno"]'); const b = t.$('input[name="email"]'); t.assert(a && b && a.required && b.required, 'Pole pro jméno a e-mail potřebují atribut required – prázdný formulář pak nejde odeslat.'); } },
      wrong: [
        { html: '<h1>Přihláška</h1>\n<form>\n  Jméno <input name="jmeno">\n  E-mail <input type="email" name="email">\n  <select name="u"><option>A</option><option>B</option></select>\n  <button>Odeslat</button>\n</form>\n' },
        { html: '<h1>Přihláška</h1>\n<form>\n  <label for="jmeno">Jméno</label><input id="jmeno" name="jmeno">\n  <label for="email">E-mail</label><input id="email" name="email">\n  <label for="u">Úroveň</label><select id="u"><option>A</option><option>B</option></select>\n  <button>Odeslat</button>\n</form>\n' }
      ],
      palette: { html: ['<label for="|"></label>', '<input type="text" id="jmeno" name="jmeno">', '<input type="email" id="email" name="email">', '<select id="uroven" name="uroven">\n  <option>|</option>\n</select>', '<option>|</option>', '<button type="submit">Odeslat</button>', ' required'] },
      hints: [
        'Pole: `<input type="email" id="email" name="email">`. Popisek: `<label for="email">E-mail</label>` – `for` musí sedět s `id` pole.',
        'Výběr: `<select id="uroven">` s možnostmi `<option>začátečník</option>` a `<option>pokročilý</option>`.',
        'Tlačítko na konec formuláře: `<button type="submit">Odeslat</button>`.'
      ],
      learn: ['Formulář (form) sbírá data: input s typem (text, email, number, password…), select s option pro výběr a button pro odeslání. label for="id" propojí popisek s polem – kliknutí na popisek pak aktivuje pole a čtečka pro nevidomé ví, co pole znamená.',
        '<label for="email">E-mail</label>\n<input type="email" id="email" name="email" required>', 'html']
    },

    /* ===================== 1. PATRO – JS A UDÁLOSTI ===================== */
    {
      id: 4, floor: 2, reward: 700, concept: 'addEventListener · let · textContent',
      client: { name: 'barista Tonda', business: 'Kavárna Na Rohu', avatar: '☕', domain: 'kavarnanarohu.cz' },
      brief: [
        'Ahoj! Chci na web věrnostní kartu. Tlačítko „+1 kafe“ zvýší počet vypitých káv a tlačítko „Vynulovat“ ho vrátí na nulu.',
        'HTML už mám hotové, potřebuju jen, aby to fungovalo – to je práce pro JavaScript v souboru script.js.'
      ],
      html: '<h1>☕ Věrnostní karta</h1>\n<p>Vypitá kafe: <span id="pocet">0</span></p>\n<button id="pridat">+1 kafe</button>\n<button id="vynulovat">Vynulovat</button>\n<p id="zprava"></p>\n',
      css: theme('#fdf6ec', '#3b2412', '#7c4a1e', '#fff', '#pocet { font-size: 2.2rem; font-weight: 800; color: var(--accent); vertical-align: -6px; }\n#zprava { font-weight: 700; color: #15803d; }'),
      js: '// Najdeme prvky na stránce podle id\nconst pocetEl = document.querySelector(\'#pocet\');\nconst pridat = document.querySelector(\'#pridat\');\n\nlet pocet = 0;\n\n// Až někdo klikne na tlačítko, spustí se tahle funkce\npridat.addEventListener(\'click\', function () {\n  // zvyš proměnnou pocet o 1 a zobraz ji v pocetEl (textContent)\n});\n',
      solution: { js: 'const pocetEl = document.querySelector(\'#pocet\');\nconst pridat = document.querySelector(\'#pridat\');\nconst vynulovat = document.querySelector(\'#vynulovat\');\nconst zprava = document.querySelector(\'#zprava\');\n\nlet pocet = 0;\n\npridat.addEventListener(\'click\', function () {\n  pocet = pocet + 1;\n  pocetEl.textContent = pocet;\n  if (pocet >= 10) {\n    zprava.textContent = \'Další kafe máš zdarma!\';\n  }\n});\n\nvynulovat.addEventListener(\'click\', function () {\n  pocet = 0;\n  pocetEl.textContent = pocet;\n  zprava.textContent = \'\';\n});\n' },
      reqs: [
        { text: 'Na začátku ukazuje #pocet číslo 0', test: t => { const v = t.text('#pocet'); t.assert(v === '0', `Na začátku je v #pocet „${v}“ – má tam být 0.`); } },
        { text: 'Po 3 kliknutích na #pridat ukazuje #pocet 3', test: t => { t.click('#pridat', 3, 'tlačítko #pridat'); const v = t.text('#pocet'); t.assert(v === '3', `Po 3 kliknutích je v #pocet „${v}“ – čekal jsem 3.${v === '0' ? ' Zobrazuješ novou hodnotu přes pocetEl.textContent = pocet?' : ''}`); } },
        { text: 'Tlačítko #vynulovat vrátí počet na 0', test: t => { t.click('#pridat', 2, 'tlačítko #pridat'); t.click('#vynulovat', 1, 'tlačítko #vynulovat'); const v = t.text('#pocet'); t.assert(v === '0', `Po vynulování je v #pocet „${v}“ – má tam být 0.`); } },
        { text: 'Po vynulování se počítá znovu od nuly (+1 → 1)', test: t => { t.click('#pridat', 4, 'tlačítko #pridat'); t.click('#vynulovat', 1, 'tlačítko #vynulovat'); t.click('#pridat'); const v = t.text('#pocet'); t.assert(v === '1', `Po vynulování a jednom kafi je v #pocet „${v}“ – má tam být 1. Vynuluj i proměnnou pocet, ne jen text na stránce.`); } }
      ],
      wish: { text: 'Po 10. kávě se v #zprava objeví text se slovem „zdarma“', test: t => { t.click('#pridat', 9, 'tlačítko #pridat'); t.assert(!/zdarma/i.test(t.text('#zprava', 'odstavec #zprava')), 'Zpráva o kávě zdarma se ukázala moc brzy – už po 9. kávě.'); t.click('#pridat'); t.assert(/zdarma/i.test(t.text('#zprava')), 'Po 10. kávě v #zprava chybí slovo „zdarma“.'); } },
      wrong: [
        { js: 'const pocetEl = document.querySelector(\'#pocet\');\nconst pridat = document.querySelector(\'#pridat\');\nconst vynulovat = document.querySelector(\'#vynulovat\');\nlet pocet = 0;\npridat.addEventListener(\'click\', function () {\n  pocet++;\n  pocetEl.textContent = pocet;\n});\nvynulovat.addEventListener(\'click\', function () {\n  pocetEl.textContent = 0;\n});\n' },
        { js: 'const pocetEl = document.querySelector(\'#pocet\');\nconst pridat = document.querySelector(\'#pridat\');\nlet pocet = 0;\npridat.addEventListener(\'click\', function () {\n  pocet++;\n});\n' },
        { js: 'const pocetEl = document.querySelector(\'pocet\');\nconst pridat = document.querySelector(\'#pridat\');\nlet pocet = 0;\npridat.addEventListener(\'click\', function () {\n  pocet++;\n  pocetEl.textContent = pocet;\n});\n' }
      ],
      palette: { js: ['document.querySelector(\'#|\')', 'pocet = pocet + 1;', 'pocetEl.textContent = pocet;', '.addEventListener(\'click\', function () {\n  |\n});', 'if (pocet >= 10) {\n  |\n}'] },
      hints: [
        'Uvnitř funkce: `pocet = pocet + 1;` a pak `pocetEl.textContent = pocet;` – změna proměnné se sama na stránce neukáže.',
        'Pro vynulování si najdi tlačítko: `const vynulovat = document.querySelector(\'#vynulovat\');` a přidej mu další `addEventListener`.',
        'Při vynulování nastav `pocet = 0` a zase ho zobraz v `pocetEl`.'
      ],
      learn: ['JavaScript oživí stránku: querySelector najde prvek (#id, .trida), addEventListener("click", funkce) spustí funkci po kliknutí a textContent změní text prvku. Proměnná (let) si pamatuje stav – ale na stránce se změní, až ho tam zapíšeš.',
        'const tlacitko = document.querySelector(\'#plus\');\nlet n = 0;\ntlacitko.addEventListener(\'click\', function () {\n  n = n + 1;\n  document.querySelector(\'#cislo\').textContent = n;\n});', 'js']
    },
    {
      id: 5, floor: 2, reward: 800, concept: 'input.value · podmínka · spojování textu',
      client: { name: 'recepční Klára', f: true, business: 'Hotel Pohoda', avatar: '🏨', domain: 'hotelpohoda.cz' },
      brief: [
        'Dobrý den, chceme na úvodní stránce osobní pozdrav. Host napíše své jméno, klikne na tlačítko a objeví se „Ahoj, Ema!“ (podle jména).',
        'Když jméno nenapíše a klikne, ať se objeví „Napiš své jméno.“'
      ],
      html: '<h1>🏨 Vítejte v Hotelu Pohoda</h1>\n<label for="jmeno">Jak se jmenuješ?</label><br>\n<input id="jmeno" placeholder="tvoje jméno">\n<button id="pozdrav">Pozdravit</button>\n<p id="vystup"></p>\n',
      css: theme('#ecfeff', '#164e63', '#0e7490', '#fff', '#vystup { font-size: 1.4rem; font-weight: 700; color: var(--accent); }'),
      js: 'const jmeno = document.querySelector(\'#jmeno\');\nconst tlacitko = document.querySelector(\'#pozdrav\');\nconst vystup = document.querySelector(\'#vystup\');\n\ntlacitko.addEventListener(\'click\', function () {\n  // co uživatel napsal, je v jmeno.value\n  // do vystup.textContent dej "Ahoj, " + jméno + "!"\n});\n',
      solution: { js: 'const jmeno = document.querySelector(\'#jmeno\');\nconst tlacitko = document.querySelector(\'#pozdrav\');\nconst vystup = document.querySelector(\'#vystup\');\n\ntlacitko.addEventListener(\'click\', function () {\n  const text = jmeno.value.trim();\n  if (text === \'\') {\n    vystup.textContent = \'Napiš své jméno.\';\n  } else {\n    vystup.textContent = \'Ahoj, \' + text + \'!\';\n  }\n});\n' },
      reqs: [
        { text: 'Jméno „Ema“ + klik na #pozdrav → v #vystup je „Ahoj, Ema!“', test: t => { t.type('#jmeno', 'Ema', 'políčko #jmeno'); t.click('#pozdrav', 1, 'tlačítko #pozdrav'); const v = t.text('#vystup', 'odstavec #vystup'); t.assert(v === 'Ahoj, Ema!', `V #vystup je „${v}“ – čekal jsem „Ahoj, Ema!“.${/jmeno|\[object/i.test(v) ? ' Hodnota políčka je v jmeno.value.' : ''}`); } },
        { text: 'Funguje i pro jiné jméno („Ondřej“)', test: t => { t.type('#jmeno', 'Ondřej', 'políčko #jmeno'); t.click('#pozdrav', 1, 'tlačítko #pozdrav'); const v = t.text('#vystup'); t.assert(v === 'Ahoj, Ondřej!', `V #vystup je „${v}“ – čekal jsem „Ahoj, Ondřej!“.`); } },
        { text: 'Prázdné jméno → „Napiš své jméno.“', test: t => { t.type('#jmeno', '', 'políčko #jmeno'); t.click('#pozdrav', 1, 'tlačítko #pozdrav'); const v = t.text('#vystup'); t.assert(v === 'Napiš své jméno.', `Pro prázdné jméno je v #vystup „${v}“ – čekal jsem „Napiš své jméno.“`); } },
        { text: 'Nový pozdrav nahradí starý (nepřidává se za něj)', test: t => { t.type('#jmeno', 'Ema'); t.click('#pozdrav', 1, 'tlačítko #pozdrav'); t.type('#jmeno', 'Ida'); t.click('#pozdrav'); const v = t.text('#vystup'); t.assert(v === 'Ahoj, Ida!', `Po druhém pozdravu je v #vystup „${v}“ – má tam být jen „Ahoj, Ida!“. Text nastav (=), nepřidávej (+=).`); } }
      ],
      wish: { text: 'Mezery kolem jména se ignorují („  Ema “ → „Ahoj, Ema!“)', test: t => { t.type('#jmeno', '  Ema  ', 'políčko #jmeno'); t.click('#pozdrav', 1, 'tlačítko #pozdrav'); const raw = t.need('#vystup').textContent; t.assert(raw === 'Ahoj, Ema!', `Pro „  Ema  “ je v #vystup „${raw}“ – mezery navíc odstraní metoda trim().`); t.type('#jmeno', '   '); t.click('#pozdrav'); t.assert(t.text('#vystup') === 'Napiš své jméno.', 'Jméno ze samých mezer má být bráno jako prázdné.'); } },
      wrong: [
        { js: 'const jmeno = document.querySelector(\'#jmeno\');\nconst vystup = document.querySelector(\'#vystup\');\ndocument.querySelector(\'#pozdrav\').addEventListener(\'click\', function () {\n  vystup.textContent = \'Ahoj, \' + jmeno + \'!\';\n});\n' },
        { js: 'const jmeno = document.querySelector(\'#jmeno\');\nconst vystup = document.querySelector(\'#vystup\');\ndocument.querySelector(\'#pozdrav\').addEventListener(\'click\', function () {\n  vystup.textContent += \'Ahoj, \' + jmeno.value + \'!\';\n});\n' },
        { js: 'const jmeno = document.querySelector(\'#jmeno\');\nconst vystup = document.querySelector(\'#vystup\');\ndocument.querySelector(\'#pozdrav\').addEventListener(\'click\', function () {\n  vystup.textContent = \'Ahoj, \' + jmeno.value + \'!\';\n});\n' }
      ],
      palette: { js: ['jmeno.value', '.trim()', 'if (text === \'\') {\n  |\n} else {\n  \n}', 'vystup.textContent = \'Ahoj, \' + text + \'!\';', '\'Napiš své jméno.\''] },
      hints: [
        'Co uživatel napsal, je v `jmeno.value` (u políčka ne `textContent`!).',
        'Spojování textu: `\'Ahoj, \' + text + \'!\'` – a výsledek ulož do `vystup.textContent`.',
        'Prázdné jméno: `if (text === \'\') { vystup.textContent = \'Napiš své jméno.\'; } else { … }`'
      ],
      learn: ['Hodnotu z políčka <input> přečteš přes .value – je to vždy text. Text se spojuje operátorem + a .trim() odstraní mezery na začátku a na konci. if / else rozhodne, co se stane.',
        'const text = pole.value.trim();\nif (text === \'\') {\n  vystup.textContent = \'Prázdné!\';\n} else {\n  vystup.textContent = \'Ahoj, \' + text + \'!\';\n}', 'js']
    },
    {
      id: 6, floor: 2, reward: 900, concept: 'Number() · výpočty · if',
      client: { name: 'majitel Pavel', business: 'E-shop Veselé ponožky', avatar: '🧦', domain: 'veseleponozky.cz' },
      brief: [
        'Nazdar! Prodáváme veselé ponožky. Jeden pár stojí 99 Kč. Chci kalkulačku: zákazník zadá počet kusů a uvidí cenu.',
        'Od 10 kusů dáváme slevu 10 %. A když zadá nesmysl – nulu, záporné číslo nebo nic – ať se ukáže „Zadej počet kusů.“'
      ],
      html: '<h1>🧦 Kalkulačka ceny</h1>\n<label for="kusy">Počet párů:</label>\n<input id="kusy" type="number" min="0" value="1">\n<button id="spocitat">Spočítat</button>\n<p id="cena"></p>\n<p><small>1 pár = 99 Kč · od 10 párů sleva 10 %</small></p>\n',
      css: theme('#fdf4ff', '#4a044e', '#c026d3', '#fff', '#cena { font-size: 1.6rem; font-weight: 800; }\n#kusy { width: 90px; }'),
      js: 'const kusy = document.querySelector(\'#kusy\');\nconst tlacitko = document.querySelector(\'#spocitat\');\nconst cena = document.querySelector(\'#cena\');\n\ntlacitko.addEventListener(\'click\', function () {\n  const pocet = Number(kusy.value);   // text z políčka převedeme na číslo\n  // spočítej cenu (99 Kč za pár, od 10 párů sleva 10 %)\n  // a vypiš ji do #cena, např. "297 Kč"\n});\n',
      solution: { js: 'const kusy = document.querySelector(\'#kusy\');\nconst tlacitko = document.querySelector(\'#spocitat\');\nconst cena = document.querySelector(\'#cena\');\n\ntlacitko.addEventListener(\'click\', function () {\n  const pocet = Number(kusy.value);\n  if (pocet <= 0) {\n    cena.textContent = \'Zadej počet kusů.\';\n    return;\n  }\n  let celkem = pocet * 99;\n  if (pocet >= 10) {\n    celkem = celkem * 0.9;\n  }\n  cena.textContent = Math.round(celkem).toLocaleString(\'cs-CZ\') + \' Kč\';\n});\n' },
      reqs: [
        { text: '3 páry → v #cena je „297 Kč“', test: t => { t.type('#kusy', '3', 'políčko #kusy'); t.click('#spocitat', 1, 'tlačítko #spocitat'); const v = t.text('#cena', 'odstavec #cena'); t.assert(t.digits(v) === '297' && /kč/i.test(v), `Pro 3 páry je v #cena „${v}“ – čekal jsem „297 Kč“.`); } },
        { text: '10 párů → sleva 10 % → „891 Kč“', test: t => { t.type('#kusy', '10', 'políčko #kusy'); t.click('#spocitat', 1, 'tlačítko #spocitat'); const v = t.text('#cena'); t.assert(t.digits(v) === '891', `Pro 10 párů je v #cena „${v}“ – čekal jsem 891 Kč (990 Kč − 10 %).`); } },
        { text: '20 párů → „1782 Kč“', test: t => { t.type('#kusy', '20', 'políčko #kusy'); t.click('#spocitat', 1, 'tlačítko #spocitat'); const v = t.text('#cena'); t.assert(t.digits(v) === '1782', `Pro 20 párů je v #cena „${v}“ – čekal jsem 1782 Kč.`); } },
        { text: 'Nesmysl (0, záporné, prázdné) → „Zadej počet kusů.“', test: t => { for (const x of ['0', '-2', '']) { t.type('#kusy', x, 'políčko #kusy'); t.click('#spocitat', 1, 'tlačítko #spocitat'); const v = t.text('#cena'); t.assert(/zadej počet kusů/i.test(v), `Pro vstup „${x}“ je v #cena „${v}“ – čekal jsem „Zadej počet kusů.“`); } } }
      ],
      wish: { text: 'Tisíce oddělené mezerou: 20 párů → „1 782 Kč“', test: t => { t.type('#kusy', '20', 'políčko #kusy'); t.click('#spocitat', 1, 'tlačítko #spocitat'); const raw = t.need('#cena').textContent; t.assert(/1[\s  ]782\s*Kč/.test(raw), `V #cena je „${t.norm(raw)}“ – čekal jsem „1 782 Kč“. Pomůže číslo.toLocaleString('cs-CZ').`); } },
      wrong: [
        { js: 'const kusy = document.querySelector(\'#kusy\');\nconst cena = document.querySelector(\'#cena\');\ndocument.querySelector(\'#spocitat\').addEventListener(\'click\', function () {\n  const pocet = Number(kusy.value);\n  cena.textContent = (pocet * 99) + \' Kč\';\n});\n' },
        { js: 'const kusy = document.querySelector(\'#kusy\');\nconst cena = document.querySelector(\'#cena\');\ndocument.querySelector(\'#spocitat\').addEventListener(\'click\', function () {\n  const pocet = Number(kusy.value);\n  let c = pocet * 99;\n  if (pocet > 10) c = c * 0.9;\n  cena.textContent = c + \' Kč\';\n});\n' }
      ],
      palette: { js: ['if (pocet <= 0) {\n  |\n  return;\n}', 'let celkem = pocet * 99;', 'if (pocet >= 10) {\n  celkem = celkem * 0.9;\n}', 'cena.textContent = celkem + \' Kč\';', 'Math.round(|)', '.toLocaleString(\'cs-CZ\')'] },
      hints: [
        'Cena: `let celkem = pocet * 99;` – a vypiš ji: `cena.textContent = celkem + \' Kč\';`',
        'Sleva: `if (pocet >= 10) { celkem = celkem * 0.9; }` – pozor, „od 10“ znamená včetně desítky (`>=`).',
        'Nesmysl odchytíš hned na začátku: `if (pocet <= 0) { cena.textContent = \'Zadej počet kusů.\'; return; }` (`Number(\'\')` je `0`).'
      ],
      learn: ['Hodnota z políčka je text – Number() z něj udělá číslo, se kterým jde počítat (jinak by + text jen spojilo: "3" + 1 = "31"). Podmínky if hlídají slevy i nesmyslné vstupy, return funkci předčasně ukončí.',
        'const n = Number(pole.value);\nif (n <= 0) { vystup.textContent = \'Chyba\'; return; }\nlet cena = n * 99;\nif (n >= 10) cena = cena * 0.9;\nvystup.textContent = Math.round(cena) + \' Kč\';', 'js']
    },
    {
      id: 7, floor: 2, reward: 900, concept: 'classList.toggle · keydown',
      client: { name: 'blogerka Lucie', f: true, business: 'Blog Noční sova', avatar: '🦉', domain: 'nocnisova.blog' },
      brief: [
        'Ahoj! Moji čtenáři čtou hlavně v noci a bílá stránka je oslepuje. Chci tlačítko, které přepne celý blog do tmavého režimu – a zase zpátky.',
        'CSS pro tmavý režim už mám hotové: stačí dát elementu body třídu „tmavy“. A ať se mění text tlačítka: „🌙 Tmavý režim“ ↔ „☀️ Světlý režim“.'
      ],
      html: '<button id="rezim">🌙 Tmavý režim</button>\n<h1>Noční sova</h1>\n<h2>Proč čteme v noci?</h2>\n<p>Noc je tichá, nikdo neruší a myšlenky jsou jasnější. Jen ta obrazovka by nemusela svítit jako slunce.</p>\n<p>Dnešní článek je o tom, jak si oči odpočinou.</p>\n',
      css: theme('#ffffff', '#1f2937', '#7c3aed', '#fff', 'body { max-width: 640px; transition: background .3s, color .3s; }\n\n/* tmavý režim */\nbody.tmavy { background: #0f0a1f; color: #e9e5ff; }\nbody.tmavy h1, body.tmavy h2 { color: #c4b5fd; }\nbody.tmavy button { background: #fde68a; color: #1f1235; }'),
      js: 'const tlacitko = document.querySelector(\'#rezim\');\n\ntlacitko.addEventListener(\'click\', function () {\n  // přepni třídu "tmavy" na document.body (classList.toggle)\n  // a změň text tlačítka\n});\n',
      solution: { js: 'const tlacitko = document.querySelector(\'#rezim\');\n\nfunction prepni() {\n  document.body.classList.toggle(\'tmavy\');\n  if (document.body.classList.contains(\'tmavy\')) {\n    tlacitko.textContent = \'☀️ Světlý režim\';\n  } else {\n    tlacitko.textContent = \'🌙 Tmavý režim\';\n  }\n}\n\ntlacitko.addEventListener(\'click\', prepni);\n\ndocument.addEventListener(\'keydown\', function (e) {\n  if (e.key === \'d\' || e.key === \'D\') {\n    prepni();\n  }\n});\n' },
      reqs: [
        { text: 'Na začátku nemá <body> třídu „tmavy“', test: t => { t.need('#rezim', 'tlačítko #rezim'); t.assert(!t.d.body.classList.contains('tmavy'), 'Stránka začíná rovnou v tmavém režimu – třídu tmavy přidávej až po kliknutí.'); } },
        { text: 'Klik na #rezim přidá <body> třídu „tmavy“', test: t => { t.click('#rezim', 1, 'tlačítko #rezim'); t.assert(t.d.body.classList.contains('tmavy'), 'Po kliknutí nemá <body> třídu tmavy. Použij document.body.classList.toggle(\'tmavy\').'); } },
        { text: 'Druhý klik třídu zase odebere', test: t => { t.click('#rezim', 2, 'tlačítko #rezim'); t.assert(!t.d.body.classList.contains('tmavy'), 'Po druhém kliknutí má <body> pořád třídu tmavy – režim se má přepnout zpátky (toggle místo add).'); } },
        { text: 'Text tlačítka se mění („Světlý“ ↔ „Tmavý“)', test: t => { t.click('#rezim', 1, 'tlačítko #rezim'); t.assert(/světlý/i.test(t.text('#rezim')), `V tmavém režimu má tlačítko nabízet světlý režim – teď je na něm „${t.text('#rezim')}“.`); t.click('#rezim'); t.assert(/tmavý/i.test(t.text('#rezim')), `Po návratu má tlačítko zase nabízet tmavý režim – teď je na něm „${t.text('#rezim')}“.`); } }
      ],
      wish: { text: 'Klávesa D (malé i velké) přepíná režim taky', test: t => { t.key('d'); t.assert(t.d.body.classList.contains('tmavy'), 'Po stisku klávesy d se režim nepřepnul. Poslouchej událost keydown na document a porovnej e.key.'); t.key('D'); t.assert(!t.d.body.classList.contains('tmavy'), 'Velké D režim nepřepnulo zpátky.'); } },
      wrong: [
        { js: 'const tlacitko = document.querySelector(\'#rezim\');\ntlacitko.addEventListener(\'click\', function () {\n  document.body.classList.add(\'tmavy\');\n  tlacitko.textContent = \'☀️ Světlý režim\';\n});\n' },
        { js: 'const tlacitko = document.querySelector(\'#rezim\');\ntlacitko.addEventListener(\'click\', function () {\n  document.body.classList.toggle(\'tmavy\');\n});\n' }
      ],
      palette: { js: ['document.body.classList.toggle(\'tmavy\');', 'if (document.body.classList.contains(\'tmavy\')) {\n  |\n} else {\n  \n}', 'tlacitko.textContent = \'☀️ Světlý režim\';', 'document.addEventListener(\'keydown\', function (e) {\n  |\n});', 'e.key === \'d\''] },
      hints: [
        '`document.body.classList.toggle(\'tmavy\')` třídu přidá, když tam není, a odebere, když tam je.',
        'Podle stavu změň text: `if (document.body.classList.contains(\'tmavy\')) { tlacitko.textContent = \'☀️ Světlý režim\'; } else { … }`',
        'Pro klávesu si přepínání dej do funkce (`function prepni() {…}`) a volej ji z obou událostí.'
      ],
      learn: ['classList spravuje CSS třídy prvku: add, remove, toggle (přepnout) a contains (je tam?). JavaScript tak nemusí měnit styly jeden po druhém – jen přepne třídu a vzhled zařídí CSS. Událost keydown hlásí stisknuté klávesy v e.key.',
        'document.body.classList.toggle(\'tmavy\');\ndocument.addEventListener(\'keydown\', function (e) {\n  if (e.key === \'d\') prepni();\n});', 'js']
    },

    /* ===================== 2. PATRO – DATA A LOGIKA ===================== */
    {
      id: 8, floor: 3, reward: 1000, concept: 'pole · for…of · createElement',
      client: { name: 'šéfkuchař Gustav', business: 'Bistro Gustav', avatar: '👨‍🍳', domain: 'bistrogustav.cz' },
      brief: [
        'Dobrý den, měníme menu každý týden a nebaví mě pokaždé přepisovat HTML. Jídla mám v JavaScriptu v poli jidla.',
        'Napište kód, který z pole vytvoří položky seznamu #menu ve tvaru „Svíčková – 189 Kč“. Až pole příští týden změním, menu se změní samo.'
      ],
      html: '<h1>👨‍🍳 Bistro Gustav</h1>\n<h2>Menu tohoto týdne</h2>\n<ul id="menu"></ul>\n',
      css: theme('#fefce8', '#422006', '#a16207', '#fff', '#menu { list-style: none; padding: 0; max-width: 420px; }\n#menu li { padding: 8px 12px; border-bottom: 1px dashed #a1620755; }\n#menu li.drahe { font-weight: 800; }\n#menu li.drahe::after { content: " ⭐"; }'),
      js: 'const jidla = [\n  { nazev: \'Svíčková\', cena: 189 },\n  { nazev: \'Smažák\', cena: 159 },\n  { nazev: \'Tatarák\', cena: 259 },\n  { nazev: \'Guláš\', cena: 175 },\n  { nazev: \'Steak\', cena: 329 },\n];\n\nconst menu = document.querySelector(\'#menu\');\n\n// pro každé jídlo vytvoř <li> s textem "Název – cena Kč" a přidej ho do #menu\n',
      solution: { js: 'const jidla = [\n  { nazev: \'Svíčková\', cena: 189 },\n  { nazev: \'Smažák\', cena: 159 },\n  { nazev: \'Tatarák\', cena: 259 },\n  { nazev: \'Guláš\', cena: 175 },\n  { nazev: \'Steak\', cena: 329 },\n];\n\nconst menu = document.querySelector(\'#menu\');\n\nfor (const jidlo of jidla) {\n  const li = document.createElement(\'li\');\n  li.textContent = jidlo.nazev + \' – \' + jidlo.cena + \' Kč\';\n  if (jidlo.cena > 200) {\n    li.classList.add(\'drahe\');\n  }\n  menu.appendChild(li);\n}\n' },
      reqs: [
        { text: 'V #menu je položka <li> pro každé jídlo (5)', test: t => { const lis = t.need('#menu', 'seznam #menu').querySelectorAll('li'); t.assert(lis.length === 5, `V #menu ${jePol(lis.length)} – jídel v poli je 5.`); } },
        { text: 'Položky mají tvar „Svíčková – 189 Kč“ ve stejném pořadí jako pole', test: t => { const exp = ['Svíčková – 189 Kč', 'Smažák – 159 Kč', 'Tatarák – 259 Kč', 'Guláš – 175 Kč', 'Steak – 329 Kč']; const got = [...t.need('#menu', 'seznam #menu').querySelectorAll('li')].map(li => dash(t, li.textContent)); exp.forEach((e, i) => t.assert(got[i] === e, `Položka č. ${i + 1} je „${got[i] || '(chybí)'}“ – čekal jsem „${e}“.${/object/.test(got[i] || '') ? ' Do textu dej jidlo.nazev a jidlo.cena, ne celé jidlo.' : ''}`)); } },
        { text: 'Jídla nejsou napsaná ručně v index.html', test: t => t.assert(!/Svíčková|Tatarák|Guláš/.test(t.html), 'V index.html jsou jídla napsaná ručně – musí je vytvořit JavaScript z pole jidla.') },
        { text: 'Kód funguje i pro jiné menu (test vymění data v poli)', test: async t => { const re = /(const|let|var)\s+jidla\s*=\s*\[[\s\S]*?\];/; t.assert(re.test(t.js), 'V script.js jsem nenašel pole jidla – nech ho na začátku ve tvaru const jidla = [ … ];'); await t.load({ js: t.js.replace(re, 'const jidla = [{ nazev: "Polévka", cena: 59 }, { nazev: "Kachna", cena: 289 }];') }); const got = t.$$('#menu li').map(li => dash(t, li.textContent)); t.assert(got.length === 2 && got[0] === 'Polévka – 59 Kč' && got[1] === 'Kachna – 289 Kč', `S jiným polem (Polévka, Kachna) se v #menu objevilo: ${got.length ? got.join(', ') : 'nic'}. Menu musí vznikat cyklem z pole, ne z pevného textu.`); } }
      ],
      wish: { text: 'Jídla dražší než 200 Kč mají třídu „drahe“', test: t => { const lis = t.$$('#menu li'); t.assert(lis.length === 5, 'Menu nemá 5 položek.'); const exp = [false, false, true, false, true]; lis.forEach((li, i) => t.assert(li.classList.contains('drahe') === exp[i], `Položka „${t.norm(li.textContent)}“ ${exp[i] ? 'má' : 'nemá'} mít třídu drahe.`)); } },
      wrong: [
        { js: 'const menu = document.querySelector(\'#menu\');\nmenu.innerHTML = \'<li>Svíčková – 189 Kč</li><li>Smažák – 159 Kč</li><li>Tatarák – 259 Kč</li><li>Guláš – 175 Kč</li><li>Steak – 329 Kč</li>\';\n' },
        { js: 'const jidla = [\n  { nazev: \'Svíčková\', cena: 189 },\n  { nazev: \'Smažák\', cena: 159 },\n  { nazev: \'Tatarák\', cena: 259 },\n  { nazev: \'Guláš\', cena: 175 },\n  { nazev: \'Steak\', cena: 329 },\n];\nconst menu = document.querySelector(\'#menu\');\nfor (const jidlo of jidla) {\n  const li = document.createElement(\'li\');\n  li.textContent = jidlo;\n  menu.appendChild(li);\n}\n' },
        { js: 'const jidla = [\n  { nazev: \'Svíčková\', cena: 189 },\n  { nazev: \'Smažák\', cena: 159 },\n  { nazev: \'Tatarák\', cena: 259 },\n  { nazev: \'Guláš\', cena: 175 },\n  { nazev: \'Steak\', cena: 329 },\n];\nconst menu = document.querySelector(\'#menu\');\nfor (let i = 1; i < jidla.length; i++) {\n  const li = document.createElement(\'li\');\n  li.textContent = jidla[i].nazev + \' – \' + jidla[i].cena + \' Kč\';\n  menu.appendChild(li);\n}\n' }
      ],
      palette: { js: ['for (const jidlo of jidla) {\n  |\n}', 'const li = document.createElement(\'li\');', 'li.textContent = jidlo.nazev + \' – \' + jidlo.cena + \' Kč\';', 'menu.appendChild(li);', 'li.classList.add(\'drahe\');'] },
      hints: [
        'Cyklus: `for (const jidlo of jidla) { … }` – v každém kroku je v proměnné `jidlo` jeden objekt.',
        'Nový prvek: `const li = document.createElement(\'li\'); li.textContent = jidlo.nazev + \' – \' + jidlo.cena + \' Kč\';`',
        'Prvek se na stránce objeví, až ho vložíš: `menu.appendChild(li);`'
      ],
      learn: ['Pole (array) drží seznam hodnot, tady objektů { nazev, cena }. Cyklus for…of projde každou položku, document.createElement vytvoří nový prvek a appendChild ho vloží do stránky. Stránka tak vzniká z dat – změníš data, změní se web.',
        'for (const jidlo of jidla) {\n  const li = document.createElement(\'li\');\n  li.textContent = jidlo.nazev;\n  menu.appendChild(li);\n}', 'js']
    },
    {
      id: 9, floor: 3, reward: 1100, concept: 'createElement · appendChild · trim',
      client: { name: 'produktová manažerka Bára', f: true, business: 'Startup Lajk', avatar: '🚀', domain: 'lajk.app' },
      brief: [
        'Čau! Náš tým potřebuje jednoduchý seznam úkolů. Do políčka napíšu úkol, kliknu Přidat a úkol se objeví v seznamu.',
        'Po přidání ať se políčko vyprázdní, ať můžu rovnou psát další. Prázdný úkol nepřidávej, to by byl bordel.'
      ],
      html: '<h1>🚀 Úkoly týmu</h1>\n<input id="ukol" placeholder="Nový úkol…">\n<button id="pridat">Přidat</button>\n<ul id="seznam"></ul>\n',
      css: theme('#f0fdf4', '#052e16', '#16a34a', '#fff', '#ukol { width: 240px; }\n#seznam { padding-left: 20px; }\n#seznam li { padding: 4px 0; cursor: pointer; }\n#seznam li.hotovo { text-decoration: line-through; opacity: .55; }'),
      js: 'const ukol = document.querySelector(\'#ukol\');\nconst pridat = document.querySelector(\'#pridat\');\nconst seznam = document.querySelector(\'#seznam\');\n\npridat.addEventListener(\'click\', function () {\n  // 1) vezmi text z políčka\n  // 2) vytvoř <li> a vlož ho do seznamu\n  // 3) vyprázdni políčko\n});\n',
      solution: { js: 'const ukol = document.querySelector(\'#ukol\');\nconst pridat = document.querySelector(\'#pridat\');\nconst seznam = document.querySelector(\'#seznam\');\n\npridat.addEventListener(\'click\', function () {\n  const text = ukol.value.trim();\n  if (text === \'\') {\n    return;\n  }\n  const li = document.createElement(\'li\');\n  li.textContent = text;\n  li.addEventListener(\'click\', function () {\n    li.classList.toggle(\'hotovo\');\n  });\n  seznam.appendChild(li);\n  ukol.value = \'\';\n});\n' },
      reqs: [
        { text: 'Přidání „Koupit papír“ vytvoří v #seznam položku <li>', test: t => { t.type('#ukol', 'Koupit papír', 'políčko #ukol'); t.click('#pridat', 1, 'tlačítko #pridat'); const lis = t.need('#seznam', 'seznam #seznam').querySelectorAll('li'); t.assert(lis.length === 1, `V #seznam ${jePol(lis.length)} – po přidání jednoho úkolu má být 1.`); t.assert(t.norm(lis[0].textContent) === 'Koupit papír', `Položka obsahuje „${t.norm(lis[0].textContent)}“ – čekal jsem „Koupit papír“.`); } },
        { text: 'Dva úkoly → dvě položky ve správném pořadí', test: t => { t.type('#ukol', 'První', 'políčko #ukol'); t.click('#pridat', 1, 'tlačítko #pridat'); t.type('#ukol', 'Druhý'); t.click('#pridat'); const got = t.$$('#seznam li').map(li => t.norm(li.textContent)); t.assert(got.length === 2 && got[0] === 'První' && got[1] === 'Druhý', `V #seznam je: ${got.join(', ') || 'nic'} – čekal jsem První, Druhý.`); } },
        { text: 'Po přidání se políčko #ukol vyprázdní', test: t => { t.type('#ukol', 'Úkol', 'políčko #ukol'); t.click('#pridat', 1, 'tlačítko #pridat'); t.assert(t.$('#ukol').value === '', `Po přidání zůstalo v políčku „${t.$('#ukol').value}“ – vyprázdni ho: ukol.value = ''.`); } },
        { text: 'Prázdný úkol (i samé mezery) se nepřidá', test: t => { t.type('#ukol', '', 'políčko #ukol'); t.click('#pridat', 1, 'tlačítko #pridat'); t.type('#ukol', '   '); t.click('#pridat'); const n = t.$$('#seznam li').length; t.assert(n === 0, `Prázdný úkol se přidal (v seznamu ${jePol(n)}).`); } }
      ],
      wish: { text: 'Klik na úkol ho označí třídou „hotovo“, další klik značku zruší', test: t => { t.type('#ukol', 'A', 'políčko #ukol'); t.click('#pridat', 1, 'tlačítko #pridat'); t.type('#ukol', 'B'); t.click('#pridat'); t.assert(t.$$('#seznam li').length === 2, 'Nepodařilo se přidat dva úkoly.'); t.$$('#seznam li')[1].click(); let lis = t.$$('#seznam li'); t.assert(lis[1].classList.contains('hotovo') && !lis[0].classList.contains('hotovo'), 'Po kliknutí na úkol nemá třídu hotovo (nebo ji dostal jiný úkol).'); lis[1].click(); lis = t.$$('#seznam li'); t.assert(!lis[1].classList.contains('hotovo'), 'Druhý klik třídu hotovo nezrušil.'); } },
      wrong: [
        { js: 'const ukol = document.querySelector(\'#ukol\');\nconst seznam = document.querySelector(\'#seznam\');\ndocument.querySelector(\'#pridat\').addEventListener(\'click\', function () {\n  const li = document.createElement(\'li\');\n  li.textContent = ukol.value;\n  seznam.appendChild(li);\n});\n' },
        { js: 'const ukol = document.querySelector(\'#ukol\');\nconst seznam = document.querySelector(\'#seznam\');\ndocument.querySelector(\'#pridat\').addEventListener(\'click\', function () {\n  seznam.innerHTML = \'<li>\' + ukol.value + \'</li>\';\n  ukol.value = \'\';\n});\n' }
      ],
      palette: { js: ['const text = ukol.value.trim();', 'if (text === \'\') {\n  return;\n}', 'const li = document.createElement(\'li\');', 'li.textContent = text;', 'seznam.appendChild(li);', 'ukol.value = \'\';'] },
      hints: [
        'Text z políčka: `const text = ukol.value.trim();` a když je prázdný, funkci ukonči: `if (text === \'\') { return; }`',
        'Nová položka: `const li = document.createElement(\'li\'); li.textContent = text; seznam.appendChild(li);`',
        'Vyprázdnění políčka: `ukol.value = \'\';` – a pro přání navíc dej každé `li` vlastní `addEventListener(\'click\', …)`.'
      ],
      learn: ['Nové prvky vytváříš za běhu: createElement je vyrobí, textContent naplní a appendChild přidá na konec seznamu. Každý nový prvek může mít vlastní posluchač událostí. Hodnotu políčka měníš přiřazením do .value.',
        'const li = document.createElement(\'li\');\nli.textContent = text;\nli.addEventListener(\'click\', () => li.classList.toggle(\'hotovo\'));\nseznam.appendChild(li);', 'js']
    },
    {
      id: 10, floor: 3, reward: 1200, concept: 'validace · includes · length · else if',
      client: { name: 'trenér Marek', business: 'Fitness Síla', avatar: '💪', domain: 'fitness-sila.cz' },
      brief: [
        'Zdravím! Spouštíme registraci do členské sekce. Než pustíme data dál, musí se zkontrolovat: e-mail obsahuje zavináč, heslo má aspoň 8 znaků a obě hesla se shodují.',
        'Chybu napište do #chyba. Když je všechno v pořádku, #chyba ať je prázdné a v #hotovo ať stojí „Registrace proběhla!“'
      ],
      html: '<h1>💪 Registrace</h1>\n<label for="email">E-mail</label><br>\n<input id="email" type="email"><br>\n<label for="heslo">Heslo</label><br>\n<input id="heslo" type="password"><br>\n<label for="heslo2">Heslo znovu</label><br>\n<input id="heslo2" type="password"><br>\n<button id="registrovat">Registrovat</button>\n<p id="chyba"></p>\n<p id="hotovo"></p>\n',
      css: theme('#fff1f2', '#4c0519', '#e11d48', '#fff', '#chyba { color: #be123c; font-weight: 700; }\n#hotovo { color: #15803d; font-weight: 700; }\ninput { width: 240px; }'),
      js: 'const email = document.querySelector(\'#email\');\nconst heslo = document.querySelector(\'#heslo\');\nconst heslo2 = document.querySelector(\'#heslo2\');\nconst chyba = document.querySelector(\'#chyba\');\nconst hotovo = document.querySelector(\'#hotovo\');\n\ndocument.querySelector(\'#registrovat\').addEventListener(\'click\', function () {\n  // zkontroluj e-mail, délku hesla a shodu hesel\n  // chybu napiš do chyba.textContent, jinak vypiš úspěch do hotovo\n});\n',
      solution: { js: 'const email = document.querySelector(\'#email\');\nconst heslo = document.querySelector(\'#heslo\');\nconst heslo2 = document.querySelector(\'#heslo2\');\nconst chyba = document.querySelector(\'#chyba\');\nconst hotovo = document.querySelector(\'#hotovo\');\n\ndocument.querySelector(\'#registrovat\').addEventListener(\'click\', function () {\n  hotovo.textContent = \'\';\n  if (!email.value.includes(\'@\')) {\n    chyba.textContent = \'Zadej platný e-mail se zavináčem.\';\n  } else if (heslo.value.length < 8) {\n    chyba.textContent = \'Heslo musí mít aspoň 8 znaků.\';\n  } else if (!/[0-9]/.test(heslo.value)) {\n    chyba.textContent = \'Heslo musí obsahovat aspoň jednu číslici.\';\n  } else if (heslo.value !== heslo2.value) {\n    chyba.textContent = \'Hesla se neshodují.\';\n  } else {\n    chyba.textContent = \'\';\n    hotovo.textContent = \'Registrace proběhla!\';\n  }\n});\n' },
      reqs: [
        { text: 'E-mail bez @ → v #chyba je upozornění na e-mail', test: t => { reg(t, 'ema.fitness.cz', 'kobra2026', 'kobra2026'); const v = t.text('#chyba', 'odstavec #chyba'); t.assert(/e-?mail/i.test(v), `Pro e-mail bez @ je v #chyba „${v}“ – čekal jsem upozornění na e-mail.`); } },
        { text: 'Heslo kratší než 8 znaků → „aspoň 8 znaků“', test: t => { reg(t, 'ema@fitness.cz', 'abc1', 'abc1'); const v = t.text('#chyba', 'odstavec #chyba'); t.assert(/aspoň 8 znaků/i.test(v), `Pro krátké heslo je v #chyba „${v}“ – čekal jsem hlášku s „aspoň 8 znaků“.`); } },
        { text: 'Různá hesla → „Hesla se neshodují“', test: t => { reg(t, 'ema@fitness.cz', 'kobra2026', 'kobra2027'); const v = t.text('#chyba', 'odstavec #chyba'); t.assert(/hesla se neshodují/i.test(v), `Pro různá hesla je v #chyba „${v}“ – čekal jsem „Hesla se neshodují“.`); } },
        { text: 'Vše v pořádku → #chyba je prázdné a #hotovo hlásí „Registrace proběhla!“', test: t => { reg(t, 'ema@fitness.cz', 'kobra2026', 'kobra2026'); t.assert(t.text('#chyba', 'odstavec #chyba') === '', `I při správných údajích je v #chyba „${t.text('#chyba')}“.`); t.assert(/registrace proběhla/i.test(t.text('#hotovo', 'odstavec #hotovo')), `V #hotovo je „${t.text('#hotovo')}“ – čekal jsem „Registrace proběhla!“.`); } },
        { text: 'Po opravě chyby stará hláška zmizí', test: t => { reg(t, 'ema@fitness.cz', 'abc1', 'abc1'); reg(t, 'ema@fitness.cz', 'kobra2026', 'kobra2026'); t.assert(t.text('#chyba') === '', `Po opravě zůstala v #chyba stará hláška „${t.text('#chyba')}“ – při úspěchu ji vymaž: chyba.textContent = ''.`); } }
      ],
      wish: { text: 'Heslo musí obsahovat číslici → hláška se slovem „číslici“', test: t => { reg(t, 'ema@fitness.cz', 'kobraheslo', 'kobraheslo'); t.assert(/číslic/i.test(t.text('#chyba', 'odstavec #chyba')), `Pro heslo bez číslice je v #chyba „${t.text('#chyba')}“ – čekal jsem hlášku se slovem „číslici“.`); reg(t, 'ema@fitness.cz', 'kobra2026', 'kobra2026'); t.assert(t.text('#chyba') === '', 'Heslo s číslicí neprošlo.'); } },
      wrong: [
        { js: 'const email = document.querySelector(\'#email\');\nconst heslo = document.querySelector(\'#heslo\');\nconst heslo2 = document.querySelector(\'#heslo2\');\nconst chyba = document.querySelector(\'#chyba\');\nconst hotovo = document.querySelector(\'#hotovo\');\ndocument.querySelector(\'#registrovat\').addEventListener(\'click\', function () {\n  if (!email.value.includes(\'@\')) chyba.textContent = \'Špatný e-mail.\';\n  else if (heslo.value.length < 8) chyba.textContent = \'Heslo musí mít aspoň 8 znaků.\';\n  else if (heslo.value !== heslo2.value) chyba.textContent = \'Hesla se neshodují.\';\n  else hotovo.textContent = \'Registrace proběhla!\';\n});\n' },
        { js: 'const email = document.querySelector(\'#email\');\nconst heslo = document.querySelector(\'#heslo\');\nconst heslo2 = document.querySelector(\'#heslo2\');\nconst chyba = document.querySelector(\'#chyba\');\nconst hotovo = document.querySelector(\'#hotovo\');\ndocument.querySelector(\'#registrovat\').addEventListener(\'click\', function () {\n  if (heslo.length < 8) chyba.textContent = \'Heslo musí mít aspoň 8 znaků.\';\n  else if (heslo.value !== heslo2.value) chyba.textContent = \'Hesla se neshodují.\';\n  else { chyba.textContent = \'\'; hotovo.textContent = \'Registrace proběhla!\'; }\n});\n' }
      ],
      palette: { js: ['if (!email.value.includes(\'@\')) {\n  |\n}', 'else if (heslo.value.length < 8) {\n  |\n}', 'else if (heslo.value !== heslo2.value) {\n  |\n}', 'else {\n  |\n}', 'chyba.textContent = \'|\';', '/[0-9]/.test(heslo.value)'] },
      hints: [
        'Zavináč: `email.value.includes(\'@\')` – vykřičník (`!`) podmínku obrátí. Délka hesla: `heslo.value.length`.',
        'Kontroly řeť za sebou: `if (…) { chyba… } else if (…) { … } else { úspěch }` – vypíše se vždy jen první chyba.',
        'Při úspěchu nezapomeň vymazat starou chybu: `chyba.textContent = \'\';` a `hotovo.textContent = \'Registrace proběhla!\';`'
      ],
      learn: ['Validace hlídá data dřív, než je odešleš. Texty mají .length a .includes(), řetěz if / else if / else zkontroluje podmínky postupně. Regulární výraz /[0-9]/.test(text) zjistí, jestli text obsahuje číslici. A pozor: hodnota pole je v .value, ne v prvku samotném.',
        'if (!email.includes(\'@\')) {\n  chyba = \'Chybí zavináč\';\n} else if (heslo.length < 8) {\n  chyba = \'Krátké heslo\';\n} else {\n  chyba = \'\';\n}', 'js']
    },
    {
      id: 11, floor: 3, reward: 1300, concept: 'input událost · toLowerCase · hidden',
      client: { name: 'knihkupec Jirka', business: 'Knihkupectví Stránka', avatar: '📚', domain: 'knihystranka.cz' },
      brief: [
        'Dobrý den, na webu máme dlouhý seznam knih a zákazníci se v něm ztrácejí. Chci vyhledávací políčko: jak píšou, seznam se rovnou filtruje.',
        'Velikost písmen ať nehraje roli – „ČAPEK“ i „čapek“ najdou totéž. A pod políčkem ukažte „Nalezeno: N“.'
      ],
      html: '<h1>📚 Knihkupectví Stránka</h1>\n<input id="hledat" placeholder="Hledat knihu nebo autora…">\n<p id="pocet">Nalezeno: 8</p>\n<ul id="knihy">\n  <li>Babička – Božena Němcová</li>\n  <li>Kytice – Karel Jaromír Erben</li>\n  <li>R.U.R. – Karel Čapek</li>\n  <li>Krakatit – Karel Čapek</li>\n  <li>Válka s mloky – Karel Čapek</li>\n  <li>Osudy dobrého vojáka Švejka – Jaroslav Hašek</li>\n  <li>Máj – Karel Hynek Mácha</li>\n  <li>Bylo nás pět – Karel Poláček</li>\n</ul>\n',
      css: theme('#f5f5f4', '#1c1917', '#9a3412', '#fff', '#hledat { width: 280px; }\n#knihy { padding-left: 20px; }\n#knihy li { padding: 3px 0; }'),
      js: 'const hledat = document.querySelector(\'#hledat\');\nconst knihy = document.querySelectorAll(\'#knihy li\');\nconst pocet = document.querySelector(\'#pocet\');\n\nhledat.addEventListener(\'input\', function () {\n  // projdi všechny knihy: když text knihy neobsahuje hledaný text, skryj ji (kniha.hidden = true)\n});\n',
      solution: { js: 'const hledat = document.querySelector(\'#hledat\');\nconst knihy = document.querySelectorAll(\'#knihy li\');\nconst pocet = document.querySelector(\'#pocet\');\n\nhledat.addEventListener(\'input\', function () {\n  const dotaz = hledat.value.toLowerCase();\n  let nalezeno = 0;\n  for (const kniha of knihy) {\n    const sedi = kniha.textContent.toLowerCase().includes(dotaz);\n    kniha.hidden = !sedi;\n    if (sedi) {\n      nalezeno++;\n    }\n  }\n  if (nalezeno === 0) {\n    pocet.textContent = \'Nic nenalezeno\';\n  } else {\n    pocet.textContent = \'Nalezeno: \' + nalezeno;\n  }\n});\n' },
      reqs: [
        { text: 'Hledání „mloky“ nechá vidět jen Válku s mloky', test: t => { t.type('#hledat', 'mloky', 'políčko #hledat'); const v = visibleBooks(t); t.assert(v.length === 1 && /mloky/i.test(v[0]), `Po zadání „mloky“ je vidět ${knih(v.length)}${v.length && v.length < 4 ? ': ' + v.join(', ') : ''}. Čekal jsem jen Válku s mloky.`); } },
        { text: 'Velikost písmen nehraje roli („ČAPEK“ najde 3 knihy)', test: t => { t.type('#hledat', 'ČAPEK', 'políčko #hledat'); const v = visibleBooks(t); t.assert(v.length === 3, `Po zadání „ČAPEK“ je vidět ${knih(v.length)} – Čapek napsal 3. Porovnávej texty převedené na malá písmena (toLowerCase).`); } },
        { text: 'Smazání hledaného textu zase ukáže všech 8 knih', test: t => { t.type('#hledat', 'čapek', 'políčko #hledat'); t.type('#hledat', ''); const v = visibleBooks(t); t.assert(v.length === 8, `Po smazání hledaného textu je vidět ${knih(v.length)} z 8.`); } },
        { text: '#pocet ukazuje „Nalezeno: N“ („karel“ → 6)', test: t => { t.type('#hledat', 'karel', 'políčko #hledat'); const v = t.text('#pocet', 'odstavec #pocet'); t.assert(/nalezeno:\s*6\b/i.test(v), `Pro „karel“ je v #pocet „${v}“ – čekal jsem „Nalezeno: 6“.`); } }
      ],
      wish: { text: 'Když nic nenajde, #pocet ukáže „Nic nenalezeno“', test: t => { t.type('#hledat', 'harry', 'políčko #hledat'); t.assert(visibleBooks(t).length === 0, 'Pro „harry“ by neměla být vidět žádná kniha.'); t.assert(/nic nenalezeno/i.test(t.text('#pocet', 'odstavec #pocet')), `Pro „harry“ je v #pocet „${t.text('#pocet')}“ – čekal jsem „Nic nenalezeno“.`); } },
      wrong: [
        { js: 'const hledat = document.querySelector(\'#hledat\');\nconst knihy = document.querySelectorAll(\'#knihy li\');\nconst pocet = document.querySelector(\'#pocet\');\nhledat.addEventListener(\'input\', function () {\n  let n = 0;\n  for (const kniha of knihy) {\n    const sedi = kniha.textContent.includes(hledat.value);\n    kniha.hidden = !sedi;\n    if (sedi) n++;\n  }\n  pocet.textContent = \'Nalezeno: \' + n;\n});\n' },
        { js: 'const hledat = document.querySelector(\'#hledat\');\nconst knihy = document.querySelectorAll(\'#knihy li\');\nhledat.addEventListener(\'input\', function () {\n  const dotaz = hledat.value.toLowerCase();\n  for (const kniha of knihy) {\n    if (!kniha.textContent.toLowerCase().includes(dotaz)) kniha.hidden = true;\n  }\n});\n' }
      ],
      palette: { js: ['const dotaz = hledat.value.toLowerCase();', 'for (const kniha of knihy) {\n  |\n}', 'kniha.textContent.toLowerCase().includes(dotaz)', 'kniha.hidden = !sedi;', 'pocet.textContent = \'Nalezeno: \' + nalezeno;'] },
      hints: [
        'Událost `input` se spustí při každém napsaném znaku. Hledaný text: `const dotaz = hledat.value.toLowerCase();`',
        'Pro každou knihu: `const sedi = kniha.textContent.toLowerCase().includes(dotaz); kniha.hidden = !sedi;` – skrýt i zase ukázat.',
        'Počítej shody do proměnné (`let nalezeno = 0;` … `if (sedi) nalezeno++;`) a vypiš `\'Nalezeno: \' + nalezeno`.'
      ],
      learn: ['Událost input přijde při každé změně políčka – ideální pro živé vyhledávání. toLowerCase() srovná velikost písmen a includes() hledá podřetězec. Vlastnost hidden prvek skryje (true) nebo ukáže (false).',
        'pole.addEventListener(\'input\', function () {\n  const q = pole.value.toLowerCase();\n  for (const li of polozky) {\n    li.hidden = !li.textContent.toLowerCase().includes(q);\n  }\n});', 'js']
    },
    {
      id: 12, floor: 3, reward: 1500, concept: 'data-atributy · stav v poli · součet',
      client: { name: 'majitelka Nora', f: true, business: 'E-shop Kobra Merch', avatar: '🐍', domain: 'kobra-merch.cz' },
      brief: [
        'Ahoj, tady Nora z jednotky KOBRA. Spouštíme e-shop s tričky a hrnky. Každé tlačítko „Do košíku“ má název produktu v atributu data-nazev a cenu v data-cena.',
        'Košík #kosik ať ukazuje přidané produkty (jako <li>), #celkem celkovou cenu a tlačítko #vyprazdnit ať košík vysype.',
        'A jestli zvládneš i dopravu: od 1000 Kč je zdarma, jinak stojí 99 Kč – ukaž to v #doprava.'
      ],
      html: '<h1>🐍 Kobra Merch</h1>\n<div class="produkty">\n  <div class="produkt">\n    <h3>Tričko KOBRA</h3><p>499 Kč</p>\n    <button class="koupit" data-nazev="Tričko KOBRA" data-cena="499">Do košíku</button>\n  </div>\n  <div class="produkt">\n    <h3>Hrnek Šakal</h3><p>249 Kč</p>\n    <button class="koupit" data-nazev="Hrnek Šakal" data-cena="249">Do košíku</button>\n  </div>\n  <div class="produkt">\n    <h3>Mikina Python</h3><p>899 Kč</p>\n    <button class="koupit" data-nazev="Mikina Python" data-cena="899">Do košíku</button>\n  </div>\n  <div class="produkt">\n    <h3>Samolepky</h3><p>99 Kč</p>\n    <button class="koupit" data-nazev="Samolepky" data-cena="99">Do košíku</button>\n  </div>\n</div>\n\n<h2>🛒 Košík</h2>\n<ul id="kosik"></ul>\n<p id="celkem">Celkem: 0 Kč</p>\n<p id="doprava"></p>\n<button id="vyprazdnit">Vysypat košík</button>\n',
      css: theme('#03120a', '#d9fbe6', '#22c55e', '#03120a', '.produkty { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }\n.produkt { background: #0b2a18; border: 1px solid #22c55e55; border-radius: 12px; padding: 10px 12px; }\n.produkt h3 { margin: 0; font-size: 1rem; }\n.produkt p { margin: 4px 0; opacity: .8; }\n#celkem { font-size: 1.3rem; font-weight: 800; }'),
      js: 'const tlacitka = document.querySelectorAll(\'.koupit\');\nconst kosik = document.querySelector(\'#kosik\');\nconst celkemEl = document.querySelector(\'#celkem\');\n\nlet polozky = [];   // co je v košíku: [{ nazev, cena }, …]\n\nfor (const tl of tlacitka) {\n  tl.addEventListener(\'click\', function () {\n    // tl.dataset.nazev a tl.dataset.cena – pozor, cena je TEXT!\n  });\n}\n',
      solution: { js: 'const tlacitka = document.querySelectorAll(\'.koupit\');\nconst kosik = document.querySelector(\'#kosik\');\nconst celkemEl = document.querySelector(\'#celkem\');\nconst doprava = document.querySelector(\'#doprava\');\n\nlet polozky = [];\n\nfunction vykresli() {\n  kosik.innerHTML = \'\';\n  let celkem = 0;\n  for (const p of polozky) {\n    const li = document.createElement(\'li\');\n    li.textContent = p.nazev + \' – \' + p.cena + \' Kč\';\n    kosik.appendChild(li);\n    celkem = celkem + p.cena;\n  }\n  celkemEl.textContent = \'Celkem: \' + celkem.toLocaleString(\'cs-CZ\') + \' Kč\';\n  doprava.textContent = celkem >= 1000 ? \'Doprava: zdarma\' : \'Doprava: 99 Kč\';\n}\n\nfor (const tl of tlacitka) {\n  tl.addEventListener(\'click\', function () {\n    polozky.push({ nazev: tl.dataset.nazev, cena: Number(tl.dataset.cena) });\n    vykresli();\n  });\n}\n\ndocument.querySelector(\'#vyprazdnit\').addEventListener(\'click\', function () {\n  polozky = [];\n  vykresli();\n});\n\nvykresli();\n' },
      reqs: [
        { text: 'Klik na „Do košíku“ u trička přidá do #kosik položku s jeho názvem', test: t => { buy(t, 'Tričko KOBRA'); const lis = t.need('#kosik', 'košík #kosik').querySelectorAll('li'); t.assert(lis.length === 1, `V košíku ${jePol(lis.length)} – po jednom nákupu má být 1.`); t.assert(/Tričko KOBRA/.test(lis[0].textContent), `Položka v košíku je „${t.norm(lis[0].textContent)}“ – chybí v ní název „Tričko KOBRA“ (tl.dataset.nazev).`); } },
        { text: 'Dva různé produkty → 2 položky v košíku', test: t => { buy(t, 'Tričko KOBRA'); buy(t, 'Hrnek Šakal'); const n = t.$$('#kosik li').length; t.assert(n === 2, `V košíku ${jePol(n)} – čekal jsem 2.`); } },
        { text: '#celkem ukazuje součet cen (tričko + hrnek = 748 Kč)', test: t => { buy(t, 'Tričko KOBRA'); buy(t, 'Hrnek Šakal'); const v = t.text('#celkem', 'odstavec #celkem'); t.assert(t.digits(v) === '748', `V #celkem je „${v}“ – čekal jsem 748 Kč.${/499249/.test(t.digits(v)) ? ' Ceny se spojily jako text! data-cena je text – převeď ho přes Number(…).' : ''}`); } },
        { text: '#vyprazdnit vysype košík (0 položek, celkem 0 Kč)', test: t => { buy(t, 'Tričko KOBRA'); buy(t, 'Samolepky'); t.click('#vyprazdnit', 1, 'tlačítko #vyprazdnit'); const n = t.$$('#kosik li').length; t.assert(n === 0, `Po vysypání v košíku ${jePol(n)}.`); t.assert(t.digits(t.text('#celkem')) === '0', `Po vysypání je v #celkem „${t.text('#celkem')}“ – má tam být 0 Kč.`); } },
        { text: 'Po vysypání jde nakupovat znovu se správným součtem', test: t => { buy(t, 'Mikina Python'); t.click('#vyprazdnit', 1, 'tlačítko #vyprazdnit'); buy(t, 'Samolepky'); const v = t.text('#celkem'); t.assert(t.$$('#kosik li').length === 1, `Po vysypání a jednom nákupu v košíku ${jePol(t.$$('#kosik li').length)}.`); t.assert(t.digits(v) === '99', `Po vysypání a nákupu samolepek je v #celkem „${v}“ – čekal jsem 99 Kč. Vynuluj i data (pole položek), ne jen seznam na stránce.`); } }
      ],
      wish: { text: '#doprava: pod 1000 Kč „99 Kč“, od 1000 Kč „zdarma“', test: t => { buy(t, 'Mikina Python'); let v = t.text('#doprava', 'odstavec #doprava'); t.assert(/99/.test(v) && !/zdarma/i.test(v), `Při 899 Kč je v #doprava „${v}“ – čekal jsem 99 Kč.`); buy(t, 'Samolepky'); v = t.text('#doprava'); t.assert(!/zdarma/i.test(v), 'Při 998 Kč ještě doprava zdarma není.'); buy(t, 'Samolepky'); v = t.text('#doprava'); t.assert(/zdarma/i.test(v), `Při 1 097 Kč je v #doprava „${v}“ – od 1000 Kč má být zdarma.`); } },
      wrong: [
        { js: 'const tlacitka = document.querySelectorAll(\'.koupit\');\nconst kosik = document.querySelector(\'#kosik\');\nconst celkemEl = document.querySelector(\'#celkem\');\nlet celkem = 0;\nfor (const tl of tlacitka) {\n  tl.addEventListener(\'click\', function () {\n    const li = document.createElement(\'li\');\n    li.textContent = tl.dataset.nazev;\n    kosik.appendChild(li);\n    celkem = celkem + tl.dataset.cena;\n    celkemEl.textContent = \'Celkem: \' + celkem + \' Kč\';\n  });\n}\n' },
        { js: 'const tlacitka = document.querySelectorAll(\'.koupit\');\nconst kosik = document.querySelector(\'#kosik\');\nconst celkemEl = document.querySelector(\'#celkem\');\nlet celkem = 0;\nfor (const tl of tlacitka) {\n  tl.addEventListener(\'click\', function () {\n    const li = document.createElement(\'li\');\n    li.textContent = tl.dataset.nazev;\n    kosik.appendChild(li);\n    celkem = celkem + Number(tl.dataset.cena);\n    celkemEl.textContent = \'Celkem: \' + celkem + \' Kč\';\n  });\n}\ndocument.querySelector(\'#vyprazdnit\').addEventListener(\'click\', function () {\n  kosik.innerHTML = \'\';\n  celkemEl.textContent = \'Celkem: 0 Kč\';\n});\n' }
      ],
      palette: { js: ['polozky.push({ nazev: tl.dataset.nazev, cena: Number(tl.dataset.cena) });', 'function vykresli() {\n  |\n}', 'kosik.innerHTML = \'\';', 'for (const p of polozky) {\n  |\n}', 'celkem = celkem + p.cena;', 'celkemEl.textContent = \'Celkem: \' + celkem + \' Kč\';'] },
      hints: [
        'Při kliknutí přidej produkt do pole: `polozky.push({ nazev: tl.dataset.nazev, cena: Number(tl.dataset.cena) });` – `Number()`, jinak se ceny spojí jako text.',
        'Napiš funkci `vykresli()`: vymaže `#kosik` (`kosik.innerHTML = \'\'`), projde pole, pro každou položku přidá `<li>` a sečte ceny.',
        'Vysypání: `polozky = [];` a zavolej `vykresli()`. Funkci volej i po každém nákupu.'
      ],
      learn: ['Data-atributy (data-cena, data-nazev) ukládají data přímo v HTML a v JS jsou v element.dataset – vždy jako text. Stav aplikace (obsah košíku) drž v poli a stránku podle něj překresluj jednou funkcí – tak to dělají i velké frameworky.',
        'let polozky = [];\nfunction vykresli() {\n  seznam.innerHTML = \'\';\n  for (const p of polozky) { /* … */ }\n}\ntl.addEventListener(\'click\', () => {\n  polozky.push({ cena: Number(tl.dataset.cena) });\n  vykresli();\n});', 'js']
    }
  ];

  function reg(t, email, h1, h2) {
    t.type('#email', email, 'políčko #email');
    t.type('#heslo', h1, 'políčko #heslo');
    t.type('#heslo2', h2, 'políčko #heslo2');
    t.click('#registrovat', 1, 'tlačítko #registrovat');
  }
  function visibleBooks(t) { return t.$$('#knihy li').filter(li => t.visible(li)).map(li => t.norm(li.textContent)); }
  function buy(t, name) {
    const b = t.$$('.koupit').find(x => x.dataset.nazev === name);
    t.assert(b, `Na stránce chybí tlačítko „Do košíku“ pro ${name}.`);
    b.click();
  }

  /* ---------------- kvíz ---------------- */
  const CONCEPTS = {
    html: 'Struktura HTML',
    attr: 'Atributy, odkazy, obrázky',
    form: 'Formuláře a popisky',
    select: 'Výběr prvků (querySelector)',
    events: 'Události (addEventListener)',
    value: 'Hodnoty z políček (.value)',
    types: 'Text vs. číslo v JS',
    cond: 'Podmínky a logika',
    arrays: 'Pole a cykly',
    dom: 'Změny stránky (classList, createElement)'
  };
  const Q = (c, q, a, opts) => Object.assign({ c, q, a, ok: 0 }, opts || {});
  const QUIZ = {
    A: [
      Q('html', 'Která značka patří hlavnímu nadpisu stránky?', ['<h1>', '<head>', '<header>', '<title>'], { codeAnswers: true, lang: 'html' }),
      Q('attr', 'Který odkaz se otevře v nové záložce?', ['<a href="https://kobra.cz" target="_blank">Kobra</a>', '<a link="https://kobra.cz" new>Kobra</a>', '<a href="https://kobra.cz" open="tab">Kobra</a>', '<link href="https://kobra.cz">Kobra</link>'], { codeAnswers: true, lang: 'html' }),
      Q('form', 'Jak správně propojíš popisek s políčkem?', ['<label for="email">E-mail</label> <input id="email">', '<label name="email">E-mail</label> <input name="email">', '<label>E-mail</label> <input label="E-mail">', '<input id="email"> <p for="email">E-mail</p>'], { codeAnswers: true, lang: 'html' }),
      Q('select', 'Co vrátí document.querySelector(\'#cena\')?', ['první prvek s id „cena“', 'všechny prvky s třídou cena', 'text „#cena“', 'hodnotu proměnné cena']),
      Q('events', 'Kdy se spustí funkce uloz?', ['až uživatel klikne na tlačítko', 'hned při načtení stránky', 'nikdy – chybí závorky uloz()', 'při každém pohybu myši'], { code: 'tlacitko.addEventListener(\'click\', uloz);', lang: 'js' }),
      Q('value', 'Jak zjistíš, co uživatel napsal do <input id="jmeno">?', ['document.querySelector(\'#jmeno\').value', 'document.querySelector(\'#jmeno\').textContent', 'document.querySelector(\'#jmeno\').innerHTML', 'document.querySelector(\'#jmeno\').text'], { codeAnswers: true, lang: 'js' }),
      Q('types', 'Co vypíše tento kód?', ['53', '8', 'NaN', 'chybu'], { code: 'console.log(\'5\' + 3);', lang: 'js', codeAnswers: true, alang: 'text' }),
      Q('cond', 'Co vypíše tento kód?', ['teenager', 'dospělý', 'dítě', 'teenager a dítě'], { code: 'const vek = 15;\nif (vek >= 18) {\n  console.log(\'dospělý\');\n} else if (vek >= 13) {\n  console.log(\'teenager\');\n} else {\n  console.log(\'dítě\');\n}', lang: 'js', codeAnswers: true, alang: 'text' }),
      Q('arrays', 'Co vypíše tento kód?', ['3 15', '2 8', '3 8', '7 15'], { code: 'const a = [3, 5];\na.push(7);\nlet s = 0;\nfor (const x of a) {\n  s = s + x;\n}\nconsole.log(a.length, s);', lang: 'js', codeAnswers: true, alang: 'text' }),
      Q('dom', 'Co udělá el.classList.toggle(\'tmavy\')?', ['přidá třídu tmavy, když ji prvek nemá – jinak ji odebere', 'vždy třídu tmavy přidá', 'smaže všechny třídy prvku', 'přepne prvek mezi viditelným a skrytým'])
    ],
    B: [
      Q('html', 'Která značka vytvoří nečíslovaný seznam?', ['<ul>', '<ol>', '<li>', '<list>'], { codeAnswers: true, lang: 'html' }),
      Q('attr', 'Který zápis vloží obrázek s popiskem pro nevidomé?', ['<img src="logo.png" alt="Logo firmy">', '<img href="logo.png" title="Logo">', '<image src="logo.png">Logo firmy</image>', '<img alt="logo.png" src="Logo firmy">'], { codeAnswers: true, lang: 'html' }),
      Q('form', 'Který prvek nabídne rozbalovací výběr z několika možností?', ['<select> s položkami <option>', '<input type="list">', '<choose> s položkami <item>', '<ul> s položkami <li>']),
      Q('select', 'Co vrátí document.querySelectorAll(\'.produkt\')?', ['všechny prvky s třídou produkt', 'první prvek s id produkt', 'jen první prvek s třídou produkt', 'počet produktů']),
      Q('events', 'Kdy se spustí funkce hledej?', ['pokaždé, když se obsah políčka změní (při psaní)', 'jen po stisku Enter', 'jen jednou při načtení stránky', 'až po kliknutí na tlačítko'], { code: 'pole.addEventListener(\'input\', hledej);', lang: 'js' }),
      Q('value', 'Políčko je <input id="kusy" value="3">. Co bude v proměnné k?', ['text „3“ (string)', 'číslo 3', 'prvek <input>', 'undefined'], { code: 'const k = document.querySelector(\'#kusy\').value;', lang: 'js' }),
      Q('types', 'Co vypíše tento kód?', ['8', '53', 'NaN', '5 + 3'], { code: 'console.log(Number(\'5\') + 3);', lang: 'js', codeAnswers: true, alang: 'text' }),
      Q('cond', 'Co vypíše tento kód?', ['ano', 'ne', 'ano i ne', 'chybu'], { code: 'const body = 7;\nif (body > 5 && body < 10) {\n  console.log(\'ano\');\n} else {\n  console.log(\'ne\');\n}', lang: 'js', codeAnswers: true, alang: 'text' }),
      Q('arrays', 'Co vypíše tento kód?', ['guláš 3', 'polévka 3', 'guláš 2', 'koláč 3'], { code: 'const jidla = [\'polévka\', \'guláš\', \'koláč\'];\nconsole.log(jidla[1], jidla.length);', lang: 'js', codeAnswers: true, alang: 'text' }),
      Q('dom', 'Co udělá tento kód?', ['přidá do seznamu novou položku s textem „Nový úkol“', 'přepíše celý seznam', 'nic – prvek se musí ještě zobrazit funkcí show()', 'vytvoří prvek, ale nikam ho nevloží'], { code: 'const li = document.createElement(\'li\');\nli.textContent = \'Nový úkol\';\nseznam.appendChild(li);', lang: 'js' })
    ]
  };

  /* ---------------- jak splnit přání navíc: vysvětlení a ukázka (ukazuje se po dokončení zakázky) ---------------- */
  const WISH_HOW = {
    1: { how: 'Odkaz nemusí vést jen na web. Adresa začínající `tel:` na mobilu rovnou vytočí číslo. Číslo piš s předvolbou a bez mezer.', example: '<a href="tel:+420777123456">777 123 456</a>', lang: 'html' },
    2: { how: 'Každá `<section>` začíná nadpisem druhé úrovně `<h2>`. Čtenář i vyhledávač pak hned vidí, o čem sekce je, a odkaz z menu skočí přímo na nadpis.', example: '<section id="kontakt">\n  <h2>Kontakt</h2>\n  …\n</section>', lang: 'html' },
    3: { how: 'Atribut `required` pole označí jako povinné. Prohlížeč pak formulář s prázdným polem neodešle a sám ukáže, co chybí.', example: '<input type="email" id="email" name="email" required>', lang: 'html' },
    4: { how: 'Po každém přičtení zkontroluj, jestli už je káv aspoň 10. Když ano, napiš zprávu do `#zprava`. Pozor na `>=`: „od 10“ znamená včetně desítky.', example: 'if (pocet >= 10) {\n  zprava.textContent = \'Další káva je zdarma!\';\n}', lang: 'js' },
    5: { how: 'Metoda `.trim()` odstraní mezery na začátku a na konci textu. Použij ji hned, jak text z políčka přečteš, a se jménem pak pracuj už bez mezer.', example: 'const text = jmeno.value.trim();', lang: 'js' },
    6: { how: '`toLocaleString(\'cs-CZ\')` napíše číslo po česku: tisíce oddělí mezerou. `Math.round` předtím zaokrouhlí haléře po slevě.', example: 'cena.textContent = Math.round(celkem).toLocaleString(\'cs-CZ\') + \' Kč\';', lang: 'js' },
    7: { how: 'Přepnutí dej do vlastní funkce a zavolej ji z kliknutí i ze stisku klávesy. `e.key` řekne, která klávesa to byla, a malé i velké D jsou dvě různé hodnoty.', example: 'document.addEventListener(\'keydown\', function (e) {\n  if (e.key === \'d\' || e.key === \'D\') {\n    prepni();\n  }\n});', lang: 'js' },
    8: { how: 'Uvnitř cyklu porovnej cenu jídla. Když je vyšší než 200, přidej položce třídu přes `classList.add`, a CSS ji pak může zvýraznit.', example: 'if (jidlo.cena > 200) {\n  li.classList.add(\'drahe\');\n}', lang: 'js' },
    9: { how: '`classList.toggle(\'hotovo\')` třídu přidá, když tam není, a odebere, když tam je. Každá nová položka dostane vlastní posluchač kliknutí.', example: 'li.addEventListener(\'click\', function () {\n  li.classList.toggle(\'hotovo\');\n});', lang: 'js' },
    10: { how: 'Regulární výraz `/[0-9]/` hledá v textu aspoň jednu číslici a `.test()` vrátí `true` nebo `false`. Přidej to jako další `else if` mezi kontroly.', example: '} else if (!/[0-9]/.test(heslo.value)) {\n  chyba.textContent = \'Heslo musí obsahovat aspoň jednu číslici.\';\n}', lang: 'js' },
    11: { how: 'Počítej, kolik knih sedí. Po cyklu se podívej na počet: když je 0, vypiš „Nic nenalezeno“, jinak počet.', example: 'pocet.textContent = nalezeno === 0 ? \'Nic nenalezeno\' : \'Nalezeno: \' + nalezeno;', lang: 'js' },
    12: { how: 'Na konci `vykresli()` rozhodni podle součtu ceny. Ternární operátor `podmínka ? a : b` vybere jednu ze dvou hodnot na jednom řádku.', example: 'doprava.textContent = celkem >= 1000 ? \'Doprava: zdarma\' : \'Doprava: 99 Kč\';', lang: 'js' }
  };
  ORDERS.forEach(o => Object.assign(o.wish, WISH_HOW[o.id] || {}));

  global.StudioContent = { FLOORS, ORDERS, CONCEPTS, QUIZ };
})(typeof window !== 'undefined' ? window : globalThis);
