/* Web bez bariér – kapitola 2: Bez myši a bez lupy (CSS a klávesnice) */
(function (W) {
  'use strict';
  const { H, ASSETS } = W;
  const fold = H.fold;
  const head = title => `<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <link rel="stylesheet" href="style.css">
</head>`;
  const what = (ctx, el) => {
    const r = ctx.role(el);
    const n = ctx.name(el) || el.tagName.toLowerCase();
    return `${r === 'link' ? 'odkazu' : r === 'button' ? 'tlačítku' : 'poli'} ${H.q(n)}`;
  };

  /* ---------------- 5. Kino Aurora ---------------- */
  W.LEVELS.push({
    id: 5, chapter: 2, title: 'Kino Aurora', concept: 'kontrast',
    client: { name: 'Lenka Plátnová', role: 'provozní kina', ico: '🎬' },
    personas: ['jana'], edit: ['css'], startView: 'contrast',
    brief: [
      ['klient', 'Grafik nám udělal moderní web. Světle šedá, oranžová, prostě elegance.'],
      ['jana', 'Mám zbytek zraku a šedé písmo na bílé mi splývá. Časy promítání nepřečtu ani s lupou. A bílý text na oranžovém tlačítku vůbec nevidím.'],
      ['klient', 'Oranžová je ale naše barva. Tu si nevezmeme!'],
      ['jana', 'Nemusíte. Text jen potřebuje dost **kontrastu** vůči pozadí: běžný text aspoň **4,5 : 1**, velký (od 24 px, nebo tučný od 19 px) aspoň **3 : 1**.']
    ],
    task: 'Uprav barvy v `style.css`, aby měl všechen text dost kontrastu. Tlačítka na vstupenky musí zůstat **oranžová**. Pohled **Kontrast** ukáže poměr u každého textu a navrhne barvu.',
    files: {
      html: `${head('Kino Aurora – program')}
<body>
  <header>
    <h1>Kino Aurora</h1>
    <p class="slogan">Filmy, které stojí za to</p>
  </header>
  <main>
    <h2>Dnes v kině</h2>
    <article class="film">
      <h3>Poslední vlak do Lhoty</h3>
      <p class="info">Česko 2025, komedie, 98 minut</p>
      <p class="popis">Výpravčí z malé stanice musí zachránit poslední spoj.</p>
      <p class="cas">17:30 a 20:00</p>
      <a class="koupit" href="#vlak">Vstupenky: Poslední vlak</a>
    </article>
    <article class="film">
      <h3>Hvězdy nad Šumavou</h3>
      <p class="info">Česko 2025, dokument, 76 minut</p>
      <p class="popis">Noc s astronomy na nejtemnějším místě republiky.</p>
      <p class="cas">18:00</p>
      <a class="koupit" href="#hvezdy">Vstupenky: Hvězdy nad Šumavou</a>
    </article>
  </main>
  <footer>
    <p>Kino Aurora, Nádražní 5. Pokladna otevírá hodinu před promítáním.</p>
  </footer>
</body>
</html>
`,
      css: `body {
  margin: 0;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  background: #ffffff;
  color: #8f8f8f;
}
header {
  padding: 20px 30px;
  background: #1d1b2f;
}
h1 { margin: 0; font-size: 38px; color: #ff9a3c; }
.slogan { margin: 4px 0 0; color: #5d5a73; }
main { padding: 6px 30px 20px; }
h2 { margin: 16px 0 10px; font-size: 28px; color: #b9b9b9; }
.film {
  margin-bottom: 14px;
  padding: 14px 18px;
  border: 1px solid #eeeeee;
  border-radius: 14px;
}
.film h3 { margin: 0; font-size: 22px; color: #6f6f6f; }
.info { margin: 4px 0; font-size: 14px; color: #6b6b6b; }
.popis { margin: 4px 0; }
.cas { margin: 6px 0 12px; font-size: 18px; font-weight: 700; color: #ffb74d; }
.koupit {
  display: inline-block;
  padding: 10px 16px;
  background: #ff9a3c;
  color: #ffffff;
  font-weight: 700;
  text-decoration: none;
  border-radius: 10px;
}
footer {
  padding: 14px 30px;
  background: #1d1b2f;
  color: #4a4760;
  font-size: 14px;
}
footer p { margin: 0; }
`,
      js: ''
    },
    fix: {
      css: [
        ['  color: #8f8f8f;\n}', '  color: #4a4a4a;\n}'],
        ['.slogan { margin: 4px 0 0; color: #5d5a73; }', '.slogan { margin: 4px 0 0; color: #c9c6dd; }'],
        ['color: #b9b9b9; }', 'color: #3b3950; }'],
        ['font-weight: 700; color: #ffb74d; }', 'font-weight: 700; color: #a34a00; }'],
        ['  background: #ff9a3c;\n  color: #ffffff;', '  background: #ff9a3c;\n  color: #2a1600;'],
        ['  color: #4a4760;', '  color: #bdbad0;']
      ]
    },
    checks: [
      {
        id: 'bezny', who: 'jana', text: 'Přečtu běžný text',
        run(ctx) {
          const bad = ctx.textElements().filter(el => !el.closest('.koupit')).map(el => ({ el, c: ctx.contrast(el) })).filter(x => !x.c.large && !x.c.ok);
          if (!bad.length) return true;
          const { el, c } = bad[0];
          return H.f(`${H.q(H.textOf(el).slice(0, 40))} skoro nevidím. Kontrast je jen ${H.ratio(c.ratio)}.`, `Text ${c.fg} na pozadí ${c.bg} má ${H.ratio(c.ratio)}, potřebuje aspoň 4,5 : 1. Zkus barvu ${A11y.suggest(c.fg, c.bg, 4.5)}.${bad.length > 1 ? ` Podobně je na tom ještě ${bad.length - 1} dalších textů.` : ''}`);
        }
      },
      {
        id: 'velky', who: 'jana', text: 'Přečtu nadpisy',
        run(ctx) {
          const bad = ctx.textElements().map(el => ({ el, c: ctx.contrast(el) })).filter(x => x.c.large && !x.c.ok);
          if (!bad.length) return true;
          const { el, c } = bad[0];
          return H.f(`Nadpis ${H.q(H.textOf(el))} je jako mlha (${H.ratio(c.ratio)}).`, `Velký text potřebuje aspoň 3 : 1. ${c.fg} na ${c.bg} má ${H.ratio(c.ratio)}. Zkus ${A11y.suggest(c.fg, c.bg, 3)}.`);
        }
      },
      {
        id: 'tlacitko', who: 'jana', text: 'Přečtu tlačítka na vstupenky',
        run(ctx) {
          const b = ctx.$('.koupit');
          if (!b) return H.f('Tlačítko na vstupenky jsem nenašla.', 'Nemaž odkazy s třídou koupit.');
          const c = ctx.contrast(b);
          if (c.ok) return true;
          return H.f(`Na oranžovém tlačítku vidím jen šmouhu. Kontrast ${H.ratio(c.ratio)}.`, `Text ${c.fg} na ${c.bg} potřebuje 4,5 : 1. Buď tmavý text na oranžové (zkus ${A11y.suggest(c.fg, c.bg, 4.5)}), nebo tmavší oranžovou pod bílým textem.`);
        }
      },
      {
        id: 'oranzova', who: 'klient', text: 'Tlačítka zůstala oranžová',
        run(ctx) {
          const b = ctx.$('.koupit');
          if (!b) return H.f('Kde jsou tlačítka na vstupenky?', 'Nemaž odkazy s třídou koupit.');
          const bg = ctx.hex(ctx.bgOf(b));
          const { h, s, l } = H.hsl(bg);
          if (h >= 15 && h <= 45 && s >= 0.5 && l >= 0.3 && l <= 0.75) return true;
          return H.f(`Tlačítka jsou teď ${bg}. To není naše oranžová!`, 'Pozadí tlačítka musí zůstat oranžové. Změň radši barvu textu na tmavou.');
        }
      }
    ],
    bonus: {
      text: 'Popisy filmů mají kontrast aspoň 7 : 1 (úroveň AAA).',
      check: ctx => ctx.$$('.popis').every(p => ctx.contrast(p).ratio >= 7)
    },
    hints: [
      'Přepni pohled **Kontrast**. Červené štítky ukazují texty, které neprojdou, a pod nimi je navržená barva.',
      'Měň jen hodnoty `color`. Šedý text na bílé ztmav, třeba `#4a4a4a`. Tmavě fialové písmo v hlavičce a patičce naopak zesvětli.',
      'Oranžové tlačítko: pozadí nech `#ff9a3c` a text dej tmavý, např. `color: #2a1600;`. Časy promítání můžou být tmavě oranžové `#a34a00`.'
    ],
    learn: ['**Kontrast** je poměr jasu textu a pozadí, od 1 : 1 (stejné barvy) po 21 : 1 (černá na bílé). WCAG AA chce pro běžný text aspoň 4,5 : 1, pro velký text 3 : 1. Barvu značky si nech, jen jí najdi vhodnou dvojici.', '.koupit {\n  background: #ff9a3c;  /* oranžová zůstává */\n  color: #2a1600;       /* 8,2 : 1 */\n}', 'css'],
    reward: 'Paní Plátnová: „Jana si koupila permanentku. A prý je to teď hezčí i pro mě.“',
    palette: [{ f: 'css', s: 'color: #|;' }, { f: 'css', s: 'background: #|;' }],
    wrong: [
      { label: 'šedé tlačítko', base: 'solution', fix: { css: [['  background: #ff9a3c;\n  color: #2a1600;', '  background: #333333;\n  color: #ffffff;']] }, expect: { fail: ['oranzova'] } },
      { label: 'světlý popis', base: 'solution', fix: { css: [['  color: #4a4a4a;\n}', '  color: #9a9a9a;\n}']] }, expect: { fail: ['bezny'] } },
      { label: 'popis jen AA', base: 'solution', fix: { css: [['  color: #4a4a4a;\n}', '  color: #6a6a6a;\n}']] }, expect: { pass: true, bonus: false } }
    ]
  });

  /* ---------------- 6. ZOO Hrádek ---------------- */
  W.LEVELS.push({
    id: 6, chapter: 2, title: 'ZOO Hrádek', concept: ':focus-visible',
    client: { name: 'Radka Lvová', role: 'správkyně webu zoo', ico: '🦒' },
    personas: ['tomas'], edit: ['css'], startView: 'keys',
    brief: [
      ['tomas', 'Mám ruku v sádře, takže teď web ovládám jen **klávesnicí**. Tab mě posune na další odkaz, Enter ho otevře.'],
      ['tomas', 'U vás ale nevidím, kde zrovna jsem. Mačkám Tab a nic. Je to jako hledat kurzor potmě.'],
      ['klient', 'Grafik ty modré rámečky vypnul, prý byly ošklivé. Netušila jsem, že je někdo potřebuje.'],
      ['tomas', 'Rámeček nemusí být ošklivý. Navrhni vlastní. Jen ať je vidět v **tmavé hlavičce** i na **bílé stránce**.']
    ],
    task: 'V `style.css` přidej zaměřeným prvkům výrazný rámeček, třeba `:focus-visible { outline: 3px solid …; }`. Musí mít kontrast aspoň **3 : 1** vůči pozadí, v zelené hlavičce i na bílé stránce.',
    files: {
      html: `${head('ZOO Hrádek')}
<body>
  <header>
    <a class="logo" href="#uvod">ZOO Hrádek</a>
    <nav>
      <a href="#zvirata">Zvířata</a>
      <a href="#program">Program</a>
      <a href="#cenik">Ceník</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
  </header>
  <main>
    <h1>Přijďte se podívat na mláďata</h1>
    <p>Letos se nám narodila dvě žirafí mláďata a tři malé surikaty.</p>
    <a class="tlacitko" href="#vstupenky">Koupit vstupenky</a>
    <section class="karty">
      <article>
        <h2>Krmení lvů</h2>
        <p>Každý den ve 14:00 u výběhu.</p>
        <a href="#lvi">Program krmení lvů</a>
      </article>
      <article>
        <h2>Dětský koutek</h2>
        <p>Kozy, ovce a poníci na pohlazení.</p>
        <a href="#koutek">O dětském koutku</a>
      </article>
    </section>
    <form class="novinky">
      <label for="mail">E-mail pro novinky</label>
      <input id="mail" type="email">
      <button type="button">Odebírat</button>
    </form>
  </main>
</body>
</html>
`,
      css: `* { outline: none; }
body {
  margin: 0;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  color: #1d2b1f;
  background: #ffffff;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 26px;
  background: #1f4d2b;
}
.logo { color: #ffffff; font-size: 22px; font-weight: 800; text-decoration: none; }
nav a { margin-left: 18px; color: #e3f2d9; font-weight: 600; text-decoration: none; }
main { padding: 6px 26px 24px; }
h1 { color: #1f4d2b; }
.tlacitko {
  display: inline-block;
  padding: 11px 18px;
  background: #f2b632;
  color: #1d2b1f;
  font-weight: 800;
  text-decoration: none;
  border-radius: 10px;
}
.karty { display: flex; gap: 16px; margin-top: 22px; }
.karty article { flex: 1; padding: 4px 16px 14px; background: #f3f7ef; border-radius: 14px; }
.karty a { color: #1f6b35; font-weight: 700; }
.novinky { display: flex; flex-wrap: wrap; align-items: end; gap: 10px; margin-top: 22px; }
.novinky label { width: 100%; font-weight: 700; }
.novinky input { padding: 9px; font-size: 16px; border: 2px solid #7f9c7c; border-radius: 8px; }
.novinky button { padding: 11px 16px; color: #fff; background: #1f4d2b; border: 0; border-radius: 8px; font-weight: 700; }
`,
      js: ''
    },
    fix: {
      css: [[null, `
:focus-visible {
  outline: 3px solid #1d2b1f;
  outline-offset: 3px;
}
header a:focus-visible {
  outline-color: #ffd447;
}
`]]
    },
    checks: [
      {
        id: 'videt', who: 'tomas', mode: 'focus', text: 'Na každém prvku vidím, kde jsem',
        run(ctx) {
          for (const el of ctx.tab()) {
            const fi = ctx.focusIndicator(el);
            if (!fi.ok) return H.f(`Na ${what(ctx, el)} jsem se ztratil, ${fi.why}.`, `Prvek <${el.tagName.toLowerCase()}> nemá při zaměření viditelný styl. Přidej třeba :focus-visible { outline: 3px solid …; }.`);
          }
          return true;
        }
      },
      {
        id: 'hlavicka', who: 'tomas', mode: 'focus', text: 'Rámeček je vidět i v zelené hlavičce',
        run(ctx) {
          for (const el of ctx.$$('header a')) {
            const fi = ctx.focusIndicator(el);
            if (!fi.ok) return H.f('V zelené hlavičce fokus vůbec nevidím.', 'Odkazy v hlavičce nemají viditelný fokus.');
            if (fi.ratio < 3) return H.f(`V zelené hlavičce rámeček skoro splývá (kontrast ${H.ratio(fi.ratio)}).`, `Barva rámečku ${fi.color} na pozadí ${fi.against} má jen ${H.ratio(fi.ratio)}, potřebuje aspoň 3 : 1. Dej odkazům v hlavičce světlejší rámeček, třeba header a:focus-visible { outline-color: #ffd447; }.`);
          }
          return true;
        }
      },
      {
        id: 'stranka', who: 'tomas', mode: 'focus', text: 'Rámeček je vidět i na bílé stránce',
        run(ctx) {
          for (const el of ctx.tab().filter(x => !x.closest('header'))) {
            const fi = ctx.focusIndicator(el);
            if (!fi.ok) return H.f(`Na ${what(ctx, el)} fokus nevidím.`, `Prvek <${el.tagName.toLowerCase()}> nemá viditelný fokus.`);
            if (fi.ratio < 3) return H.f(`Na ${what(ctx, el)} je rámeček moc bledý (${H.ratio(fi.ratio)}).`, `Rámeček ${fi.color} na pozadí ${fi.against} má jen ${H.ratio(fi.ratio)}. Na světlé stránce potřebuješ tmavý rámeček.`);
          }
          return true;
        }
      }
    ],
    bonus: {
      text: 'Rámeček kreslíš přes :focus-visible, takže ho při klikání myší neuvidíš.',
      check: ctx => /:focus-visible\s*[{,]/.test(ctx.files.css) || /:focus-visible/.test(ctx.files.css)
    },
    hints: [
      'Na konec `style.css` přidej pravidlo `:focus-visible { outline: 3px solid #1d2b1f; outline-offset: 3px; }`. První řádek `* { outline: none; }` přebije, protože má vyšší specifitu.',
      'Tmavý rámeček v zelené hlavičce zmizí. Pro hlavičku přidej druhé pravidlo jen se světlou barvou: `header a:focus-visible { outline-color: #ffd447; }`.',
      'Vyzkoušej to: klikni do náhledu stránky a mačkej Tab. Nebo v pohledu **Klávesnice** spusť procházku Tabem.'
    ],
    learn: ['**Fokus** ukazuje, kde se uživatel klávesnice právě nachází. Nikdy ho nemaž bez náhrady. **`:focus-visible`** se ukáže při ovládání klávesnicí, ne po kliknutí myší. Rámeček potřebuje kontrast aspoň 3 : 1 vůči okolí.', ':focus-visible {\n  outline: 3px solid #1d2b1f;\n  outline-offset: 3px;\n}\nheader a:focus-visible {\n  outline-color: #ffd447;\n}', 'css'],
    reward: 'Paní Lvová: „Tomáš koupil vstupenky pro celou rodinu. Jednou rukou!“',
    palette: [{ f: 'css', s: ':focus-visible {\n  outline: 3px solid #|;\n  outline-offset: 3px;\n}' }, { f: 'css', s: 'header a:focus-visible {\n  outline-color: #|;\n}' }],
    wrong: [
      { label: 'žlutý rámeček všude', base: 'starter', fix: { css: [[null, '\n:focus-visible { outline: 3px solid #f2b632; }\n']] }, expect: { fail: ['stranka'] } },
      { label: 'jen odkazy', base: 'starter', fix: { css: [[null, '\na:focus { outline: 3px solid #1d2b1f; }\n']] }, expect: { fail: ['videt', 'hlavicka', 'stranka'] } },
      { label: 'tenký rámeček', base: 'starter', fix: { css: [[null, '\n:focus-visible { outline: 1px dotted #1d2b1f; }\n']] }, expect: { fail: ['videt', 'hlavicka', 'stranka'] } },
      { label: 'dvojitý rámeček', base: 'starter', fix: { css: [[null, '\n:focus-visible { outline: 3px solid #1d2b1f; outline-offset: 2px; box-shadow: 0 0 0 5px #ffffff; }\n']] }, expect: { pass: true } }
    ]
  });

  /* ---------------- 7. Divadlo Na Kopečku ---------------- */
  W.LEVELS.push({
    id: 7, chapter: 2, title: 'Divadlo Na Kopečku', concept: '<button>',
    client: { name: 'Hana Oponová', role: 'pokladní divadla', ico: '🎭' },
    personas: ['tomas', 'karel'], edit: ['html', 'js'], startView: 'keys',
    brief: [
      ['klient', 'Vstupenky prodáváme i přes web, ale lidé píšou, že „tlačítka nefungují“. Mně fungují!'],
      ['tomas', 'Vám fungují na myš. Já mačkám Tab a skáču přes ně, jako by tam nebyly. Jsou to obyčejné `<div>`.'],
      ['karel', 'Čtečka u nich řekne jen „plus“, „minus“ a „Koupit vstupenky“ jako obyčejný text. Že se na to dá kliknout, se nedozvím.'],
      ['tomas', 'Prohlížeč má na tohle hotový prvek **`<button>`**. Dostanu se na něj Tabem a spustím ho Enterem i mezerníkem. Bez jediného řádku navíc.']
    ],
    task: 'Z `<div>` udělej skutečná tlačítka `<button type="button">`. **Třídy nech**, JavaScript podle nich tlačítka hledá. Tlačítkům + a − dej srozumitelné jméno přes `aria-label`.',
    files: {
      html: `${head('Vstupenky – Divadlo Na Kopečku')}
<body>
  <main class="pokladna">
    <p class="nad">Sobota 12. 12., 19:00</p>
    <h1>Lucerna</h1>
    <p>Vstupenka 220 Kč</p>
    <div class="pocet">
      <div class="krok minus">−</div>
      <span id="pocet">1</span>
      <div class="krok plus">+</div>
    </div>
    <p class="celkem">Celkem <b id="celkem">220 Kč</b></p>
    <div class="koupit">Koupit vstupenky</div>
    <p id="zprava"></p>
  </main>
  <script src="script.js"></script>
</body>
</html>
`,
      css: `body {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  background: #2a1215;
  color: #fbeee0;
}
.pokladna {
  max-width: 420px;
  margin: 22px auto;
  padding: 20px 26px;
  text-align: center;
  background: #3a1a1f;
  border: 2px solid #d4a017;
  border-radius: 18px;
}
.nad { margin: 0; color: #e8c97a; letter-spacing: 1px; }
h1 { margin: 4px 0; font-size: 40px; font-style: italic; }
.pocet { display: flex; align-items: center; justify-content: center; gap: 18px; margin: 14px 0; }
.krok {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  padding: 0;
  font-family: inherit;
  font-size: 26px;
  line-height: 1;
  color: #ffffff;
  background: #7a1f2b;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  user-select: none;
}
#pocet { min-width: 2ch; font-size: 30px; font-weight: bold; }
.celkem { font-size: 19px; }
.koupit {
  display: inline-block;
  padding: 12px 22px;
  font-family: inherit;
  font-size: 18px;
  font-weight: bold;
  color: #2a1215;
  background: #d4a017;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
}
#zprava { min-height: 1.4em; color: #9fe0a6; font-weight: bold; }
`,
      js: `const cena = 220;
let pocet = 1;

function prepocitej() {
  document.querySelector('#pocet').textContent = pocet;
  document.querySelector('#celkem').textContent = pocet * cena + ' Kč';
}

document.querySelector('.plus').addEventListener('click', () => {
  if (pocet < 10) pocet++;
  prepocitej();
});

document.querySelector('.minus').addEventListener('click', () => {
  if (pocet > 1) pocet--;
  prepocitej();
});

document.querySelector('.koupit').addEventListener('click', () => {
  document.querySelector('#zprava').textContent = \`Rezervováno: \${pocet} × Lucerna\`;
});
`
    },
    fix: {
      html: [
        ['<div class="krok minus">−</div>', '<button type="button" class="krok minus" aria-label="Ubrat vstupenku">−</button>'],
        ['<div class="krok plus">+</div>', '<button type="button" class="krok plus" aria-label="Přidat vstupenku">+</button>'],
        ['<div class="koupit">Koupit vstupenky</div>', '<button type="button" class="koupit">Koupit vstupenky</button>'],
        ['<p id="zprava"></p>', '<p id="zprava" role="status"></p>']
      ]
    },
    scenario(c, S) {
      const n = c.normal;
      const plus = n.$('.plus');
      const koupit = n.$('.koupit');
      S.found = !!(plus && n.$('.minus') && koupit);
      if (!S.found) return;
      S.pocet0 = H.textOf(n.$('#pocet'));
      n.press(plus, 'Enter');
      S.pocetEnter = H.textOf(n.$('#pocet'));
      n.press(koupit, ' ');
      S.zprava = H.textOf(n.$('#zprava'));
    },
    checks: [
      {
        id: 'tab', who: 'tomas', text: 'Tabem se dostanu na −, + i Koupit',
        run(ctx) {
          const items = [['minus', '−'], ['plus', '+'], ['koupit', 'Koupit vstupenky']];
          const miss = items.filter(([cls]) => { const el = ctx.$('.' + cls); return !el || !ctx.focusable(el); });
          if (!miss.length) return true;
          return H.f(`Tabem přeskočím ${miss.map(m => H.q(m[1])).join(', ')}. Jako by tam nebyly.`, 'Obyčejný <div> v pořadí Tabu není. Použij <button type="button"> a třídu nech.');
        }
      },
      {
        id: 'enter', who: 'tomas', text: 'Enterem přidám vstupenku',
        run(ctx) {
          const S = ctx.S;
          if (!S.found) return H.f('Tlačítka s třídami minus, plus a koupit jsem nenašel.', 'Nech tlačítkům jejich třídy, JavaScript je podle nich hledá.');
          if (S.pocetEnter !== '2') return H.f(`Zmáčkl jsem Enter na „+“ a počet je pořád ${S.pocetEnter || S.pocet0}.`, '<button> reaguje na Enter sám. Na <div> by sis musel(a) napsat vlastní obsluhu klávesnice.');
          return true;
        }
      },
      {
        id: 'mezernik', who: 'tomas', text: 'Mezerníkem koupím vstupenky',
        run(ctx) {
          const S = ctx.S;
          if (!S.found) return H.f('Tlačítko Koupit vstupenky jsem nenašel.', 'Nech tlačítku třídu koupit.');
          if (!/rezervovano/.test(fold(S.zprava))) return H.f('Na „Koupit vstupenky“ jsem zmáčkl mezerník a nic se nestalo.', 'Tlačítko <button> se mezerníkem spouští samo.');
          return true;
        }
      },
      {
        id: 'role', who: 'karel', text: 'Čtečka ohlásí tlačítka',
        run(ctx) {
          for (const cls of ['minus', 'plus', 'koupit']) {
            const el = ctx.$('.' + cls);
            if (el && ctx.role(el) !== 'button') return H.f(`${H.q(H.textOf(el))} je pro mě obyčejný text. Že se na to dá kliknout, nepoznám.`, 'Značka <button> má roli tlačítka, čtečka pak řekne „tlačítko“.');
          }
          return true;
        }
      },
      {
        id: 'jmeno', who: 'karel', text: 'Vím, co dělají + a −',
        run(ctx) {
          const p = ctx.$('.plus');
          const m = ctx.$('.minus');
          if (!p || !m) return H.f('Tlačítka + a − jsem nenašel.', 'Nech jim třídy plus a minus.');
          const np = ctx.name(p);
          const nm = ctx.name(m);
          if (!H.has(np, 'prid', 'vic', 'zvys', 'pricti', 'dals')) return H.f(`Slyším „tlačítko, ${np || 'bez popisku'}“. Plus čeho?`, 'Dej tlačítku jméno: aria-label="Přidat vstupenku".');
          if (!H.has(nm, 'ubr', 'odeb', 'mene', 'sniz', 'odect')) return H.f(`Slyším „tlačítko, ${nm || 'bez popisku'}“. Mínus čeho?`, 'Dej tlačítku jméno: aria-label="Ubrat vstupenku".');
          return true;
        }
      }
    ],
    bonus: {
      text: 'Zprávu o rezervaci Karel uslyší sám: #zprava má role="status".',
      check: ctx => { const z = ctx.$('#zprava'); return !!z && ctx.inLive(z); }
    },
    hints: [
      'Vyměň značku na obou koncích a třídu nech: `<button type="button" class="koupit">Koupit vstupenky</button>`.',
      'Tlačítka + a − mají jako text jen znaménko. Přidej jim `aria-label="Přidat vstupenku"` a `aria-label="Ubrat vstupenku"`.',
      'JavaScript nemusíš měnit: `querySelector(".plus")` najde i `<button class="krok plus">`. Pohled **Klávesnice** ti ukáže prvky, na které jde jen myší.'
    ],
    learn: ['**`<button>`** umí to, co `<div>` neumí: je v pořadí Tabu, spustí se Enterem i mezerníkem a čtečka ho ohlásí jako tlačítko. Když tlačítko obsahuje jen ikonu nebo znak, dej mu jméno přes `aria-label`.', '<button type="button" class="krok plus"\n        aria-label="Přidat vstupenku">+</button>', 'html'],
    reward: 'Paní Oponová: „Lucerna je vyprodaná. Poprvé za deset let i přes web!“',
    palette: [{ f: 'html', s: '<button type="button" class="|"></button>' }, { f: 'html', s: ' aria-label="|"' }, { f: 'html', s: ' role="status"' }],
    wrong: [
      { label: 'tlačítka bez jména', base: 'solution', fix: { html: [[' aria-label="Ubrat vstupenku"', ''], [' aria-label="Přidat vstupenku"', '']] }, expect: { fail: ['jmeno'] } },
      { label: 'div s tabindex', base: 'starter', fix: { html: [['<div class="krok minus">', '<div class="krok minus" tabindex="0">'], ['<div class="krok plus">', '<div class="krok plus" tabindex="0">'], ['<div class="koupit">', '<div class="koupit" tabindex="0">']] }, expect: { fail: ['enter', 'mezernik', 'role', 'jmeno'] } },
      { label: 'smazaná třída', base: 'solution', fix: { html: [['<button type="button" class="koupit">', '<button type="button">']] }, expect: { error: true } }
    ]
  });

  /* ---------------- 8. Obecní úřad Lhota ---------------- */
  W.LEVELS.push({
    id: 8, chapter: 2, title: 'Obecní úřad Lhota', concept: 'skip link a oblasti',
    client: { name: 'Jaroslav Razítko', role: 'starosta', ico: '🏛️' },
    personas: ['tomas', 'karel'], edit: ['html', 'css'], startView: 'keys',
    brief: [
      ['klient', 'Občané se k nám můžou objednat přes web. Jenže pan Tomáš si stěžoval, že než se k formuláři dostane, „uťuká se k smrti“.'],
      ['tomas', 'Menu má dvanáct odkazů a je na každé stránce. Než se Tabem dostanu k obsahu, zmáčknu Tab třináctkrát. Pokaždé.'],
      ['karel', 'Já to mám podobně. Čtečka umí skočit rovnou na **hlavní obsah** nebo na **navigaci**, ale jen když stránka tyhle oblasti označí.'],
      ['tomas', 'Pomůže odkaz **Přeskočit na obsah** úplně na začátku. Obvykle je schovaný a objeví se, až na něj dojdu Tabem.']
    ],
    task: 'Na začátek `<body>` přidej odkaz `<a href="#obsah">Přeskočit na obsah</a>`. Obsah zabal do `<main id="obsah">`, menu do `<nav>`, hlavičku do `<header>` a patičku do `<footer>`.',
    files: {
      html: `${head('Objednání na úřad – Obec Lhota')}
<body>
  <div class="hlava">
    <img src="znak.svg" alt="Znak obce Lhota" class="znak">
    <span class="obec">Obec Lhota</span>
  </div>
  <div class="menu">
    <a href="#">Úvod</a>
    <a href="#">Úřední deska</a>
    <a href="#">Zastupitelstvo</a>
    <a href="#">Vyhlášky</a>
    <a href="#">Poplatky</a>
    <a href="#">Odpady</a>
    <a href="#">Školy</a>
    <a href="#">Kultura</a>
    <a href="#">Sport</a>
    <a href="#">Spolky</a>
    <a href="#">Fotogalerie</a>
    <a href="#">Kontakty</a>
  </div>
  <div class="obsah">
    <h1>Objednání na úřad</h1>
    <p>Vyberte si den, kdy k nám přijdete. Ušetříte čas v čekárně.</p>
    <form>
      <label for="den">Den návštěvy</label>
      <select id="den">
        <option>Pondělí 8:00–17:00</option>
        <option>Středa 8:00–17:00</option>
      </select>
      <button type="button">Objednat se</button>
    </form>
  </div>
  <div class="pata">Obecní úřad Lhota, Lhota 1, podatelna@lhota.cz</div>
</body>
</html>
`,
      css: `body {
  margin: 0;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  color: #1b2433;
  background: #f4f6fa;
}
.hlava {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  color: #fff;
  background: #1d3f7a;
}
.znak { height: 46px; }
.obec { font-size: 24px; font-weight: 800; }
.menu {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  padding: 10px 24px;
  background: #fff;
  border-bottom: 3px solid #d9a521;
}
.menu a { color: #1d3f7a; font-weight: 600; }
.obsah { max-width: 640px; padding: 6px 24px 22px; }
form {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 10px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
}
label { width: 100%; font-weight: 700; }
select { padding: 8px; font-size: 16px; }
button { padding: 10px 16px; font-size: 15px; font-weight: 700; color: #fff; background: #1d3f7a; border: 0; border-radius: 8px; }
.pata { padding: 14px 24px; font-size: 14px; color: #4a5568; }
`,
      js: ''
    },
    fix: {
      html: [
        ['<body>\n  <div class="hlava">', '<body>\n  <a class="skip" href="#obsah">Přeskočit na obsah</a>\n  <header class="hlava">'],
        ['<span class="obec">Obec Lhota</span>\n  </div>', '<span class="obec">Obec Lhota</span>\n  </header>'],
        ['<div class="menu">', '<nav class="menu" aria-label="Hlavní menu">'],
        ['<a href="#">Kontakty</a>\n  </div>', '<a href="#">Kontakty</a>\n  </nav>'],
        ['<div class="obsah">', '<main class="obsah" id="obsah">'],
        ['</form>\n  </div>', '</form>\n  </main>'],
        ['<div class="pata">Obecní úřad Lhota, Lhota 1, podatelna@lhota.cz</div>', '<footer class="pata">Obecní úřad Lhota, Lhota 1, podatelna@lhota.cz</footer>']
      ],
      css: [[null, `
.skip {
  position: absolute;
  top: 8px;
  left: -9999px;
  padding: 8px 14px;
  font-weight: 800;
  color: #1b2433;
  background: #d9a521;
}
.skip:focus {
  left: 8px;
}
`]]
    },
    scenario(c, S) {
      const n = c.normal;
      const first = n.tab()[0];
      S.first = first ? { tag: first.tagName.toLowerCase(), href: first.getAttribute('href') || '', name: n.name(first) } : null;
      const main = n.$('main') || n.$$('[role="main"]')[0] || null;
      if (first && first.tagName === 'A' && /^#./.test(first.getAttribute('href') || '')) {
        S.target = !!n.doc.getElementById(decodeURIComponent(first.getAttribute('href').slice(1)));
        n.press(first, 'Enter');
        const act = n.doc.activeElement;
        S.moved = !!act && act !== n.doc.body && act !== first;
        const nx = S.moved ? n.next(act) : null;
        S.next = nx ? { name: n.name(nx), inMain: !!(main && main.contains(nx)) } : null;
      }
    },
    checks: [
      {
        id: 'prvni', who: 'tomas', text: 'První Tab nabídne skok na obsah',
        run(ctx) {
          const f = ctx.S.first;
          if (f && f.tag === 'a' && /^#./.test(f.href) && H.has(f.name, 'obsah', 'preskoc')) return true;
          return H.f(f ? `První Tab mě pošle na ${H.q(f.name)}. Pak musím přes celé menu.` : 'Na stránce není nic, kam bych se dostal Tabem.', 'Úplně první prvek v <body> má být odkaz <a href="#obsah">Přeskočit na obsah</a>.');
        }
      },
      {
        id: 'skok', who: 'tomas', text: 'Po skoku pokračuju rovnou ve formuláři',
        run(ctx) {
          const S = ctx.S;
          if (S.target === undefined) return H.f('Odkaz pro přeskočení jsem nenašel, takže ani skok.', 'Nejdřív přidej odkaz <a href="#obsah"> na začátek stránky.');
          if (!S.target) return H.f('Zmáčkl jsem Enter na „Přeskočit na obsah“ a nic. Cíl odkazu neexistuje.', 'Cíl odkazu potřebuje stejné id: <main id="obsah">.');
          if (!S.moved) return H.f('Odkaz mě nikam neposlal.', 'Zkontroluj, že href="#obsah" a id="obsah" sedí.');
          if (!S.next || !S.next.inMain) return H.f(`Po skoku mě další Tab poslal na ${H.q(S.next ? S.next.name : 'nic')}. To není formulář.`, 'Cíl odkazu musí být hlavní obsah, nejlépe <main id="obsah">.');
          return true;
        }
      },
      {
        id: 'main', who: 'karel', text: 'Skočím na hlavní obsah',
        run(ctx) {
          const m = H.landmarks(ctx, 'main');
          if (!m.length) return H.f('Čtečka hlásí „žádná oblast hlavní obsah“.', 'Zabal obsah stránky do <main>.');
          if (m.length > 1) return H.f('Hlavních obsahů je víc. Který je ten pravý?', 'Stránka má mít jen jeden <main>.');
          if (!m[0].querySelector('h1')) return H.f('V hlavním obsahu chybí nadpis Objednání na úřad.', 'Nadpis <h1> patří dovnitř <main>.');
          return true;
        }
      },
      {
        id: 'nav', who: 'karel', text: 'Najdu navigaci',
        run(ctx) {
          const nav = H.landmarks(ctx, 'navigation').find(n => n.querySelectorAll('a[href]').length >= 10);
          if (nav) return true;
          return H.f('Navigaci jako oblast nevidím. Menu je pro mě jen dlouhá řada odkazů.', 'Zabal menu do značky <nav>.');
        }
      },
      {
        id: 'oblasti', who: 'karel', text: 'Najdu záhlaví a zápatí',
        run(ctx) {
          const b = H.landmarks(ctx, 'banner').length;
          const f = H.landmarks(ctx, 'contentinfo').length;
          if (b && f) return true;
          return H.f(`Chybí mi ${!b && !f ? 'záhlaví i zápatí' : !b ? 'záhlaví' : 'zápatí'} stránky.`, `Použij ${!b ? '<header> pro hlavičku' : ''}${!b && !f ? ' a ' : ''}${!f ? '<footer> pro patičku' : ''}.`);
        }
      }
    ],
    bonus: {
      mode: 'focus',
      text: 'Odkaz pro přeskočení je skrytý a objeví se, až na něj dojdeš Tabem.',
      check(ctx, c) {
        const a = c.normal.tab()[0];
        if (!a || a.tagName !== 'A' || !c.normal.visuallyHidden(a)) return false;
        const b = c.focus.tab()[0];
        if (!b) return false;
        b.focus({ preventScroll: true });
        const shown = !c.focus.visuallyHidden(b);
        b.blur();
        return shown;
      }
    },
    hints: [
      'Hned za `<body>` napiš `<a class="skip" href="#obsah">Přeskočit na obsah</a>` a `<div class="obsah">` změň na `<main class="obsah" id="obsah">`. Nezapomeň na zavírací značky.',
      'Stejně tak `<div class="menu">` → `<nav class="menu">`, hlavičku na `<header>` a patičku na `<footer>`. Třídy nech, vzhled se nezmění.',
      'Bonus v CSS: `.skip { position: absolute; left: -9999px; }` a `.skip:focus { left: 8px; }`. Odkaz je mimo obrazovku, dokud na něj nedojde Tab.'
    ],
    learn: ['**Oblasti** (`header`, `nav`, `main`, `footer`) jsou rozcestník pro čtečku: uživatel skočí rovnou tam, kam potřebuje. Odkaz **Přeskočit na obsah** ušetří uživatelům klávesnice procházení celého menu.', '<a class="skip" href="#obsah">Přeskočit na obsah</a>\n<header>…</header>\n<nav>…</nav>\n<main id="obsah">…</main>\n<footer>…</footer>', 'html'],
    reward: 'Starosta Razítko: „Tomáš se objednal za osm vteřin. Ověřoval jsem to stopkami.“',
    palette: [{ f: 'html', s: '<a class="skip" href="#obsah">Přeskočit na obsah</a>' }, { f: 'html', s: '<main class="obsah" id="obsah">' }, { f: 'html', s: '<nav class="menu">' }, { f: 'css', s: '.skip:focus {\n  |\n}' }],
    assets: { 'znak.svg': ASSETS['znak.svg'] },
    wrong: [
      { label: 'odkaz až za menu', base: 'solution', fix: { html: [['<a class="skip" href="#obsah">Přeskočit na obsah</a>\n  <header class="hlava">', '<header class="hlava">'], ['<main class="obsah" id="obsah">', '<a class="skip" href="#obsah">Přeskočit na obsah</a>\n  <main class="obsah" id="obsah">']] }, expect: { fail: ['prvni', 'skok'] } },
      { label: 'cíl bez id', base: 'solution', fix: { html: [['<main class="obsah" id="obsah">', '<main class="obsah">']] }, expect: { fail: ['skok'] } },
      { label: 'menu bez nav', base: 'solution', fix: { html: [['<nav class="menu" aria-label="Hlavní menu">', '<div class="menu">'], ['</nav>', '</div>']] }, expect: { fail: ['nav'] } },
      { label: 'odkaz vždy vidět', base: 'solution', fix: { css: [['  left: -9999px;\n', '  left: 8px;\n']] }, expect: { pass: true, bonus: false } }
    ]
  });
})(window.WBB);
