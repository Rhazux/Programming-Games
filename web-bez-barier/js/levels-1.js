/* Web bez bariér – kapitola 1: Co čtečka neslyší (HTML) */
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

  /* ---------------- 1. Pekárna U Lípy ---------------- */
  const PRODUCTS = [['chleba.svg', ['chleb', 'chleba'], 'chleba'], ['rohlik.svg', ['rohlik'], 'rohlík'], ['kolac.svg', ['kolac'], 'koláč']];
  W.LEVELS.push({
    id: 1, chapter: 1, title: 'Pekárna U Lípy', concept: 'alt',
    client: { name: 'Marta Lipová', role: 'majitelka pekárny', ico: '🥖' },
    personas: ['karel'], edit: ['html'],
    brief: [
      ['klient', 'Od září prodáváme i přes web, ale nikdo si nic neobjedná. Pan Karel z naší ulice říká, že je náš web pro něj **prázdný**.'],
      ['karel', 'Jsem nevidomý, web mi předčítá **čtečka obrazovky**. U vašich obrázků slyším jen „obrázek bez popisu, chleba.svg“. Netuším, co pečete.'],
      ['klient', 'Vždyť je tam všechno nakreslené i popsané…'],
      ['karel', 'Pro mě ne. Obrázek potřebuje **alternativní text** v atributu `alt`. A ozdobu, která nic neříká, ať čtečka radši přeskočí.']
    ],
    task: 'Doplň obrázkům atribut **alt**. U loga a pečiva napiš, co je na obrázku. Ozdobná ratolest dostane prázdné `alt=""`, aby ji čtečka přeskočila.',
    files: {
      html: `${head('Pekárna U Lípy')}
<body>
  <header>
    <img src="logo.svg" class="logo">
    <p>Pečeme poctivě od roku 1998</p>
  </header>
  <main>
    <h1>Dnes jsme upekli</h1>
    <img src="ratolest.svg" class="ozdoba">
    <ul class="pecivo">
      <li>
        <img src="chleba.svg">
        <p>89 Kč</p>
      </li>
      <li>
        <img src="rohlik.svg">
        <p>4 Kč</p>
      </li>
      <li>
        <img src="kolac.svg">
        <p>25 Kč</p>
      </li>
    </ul>
    <p class="tel">Objednávky na telefonu 777 123 456</p>
  </main>
</body>
</html>
`,
      css: `body {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  background: #fbf4e8;
  color: #3b2a1a;
}
header {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 12px 26px;
  background: #6b3e1f;
  color: #fbe9cf;
}
.logo { height: 56px; }
header p { margin: 0; font-style: italic; }
main {
  max-width: 760px;
  margin: 0 auto;
  padding: 16px 24px 28px;
  text-align: center;
}
h1 { font-size: 34px; margin: 8px 0 2px; }
.ozdoba { width: 200px; }
.pecivo {
  list-style: none;
  padding: 0;
  display: flex;
  gap: 18px;
  justify-content: center;
  flex-wrap: wrap;
}
.pecivo li {
  background: #fff;
  border-radius: 16px;
  padding: 10px;
  width: 190px;
  box-shadow: 0 6px 16px rgba(107, 62, 31, .15);
}
.pecivo img { width: 100%; display: block; }
.pecivo p { margin: 6px 0 2px; font-size: 21px; font-weight: bold; color: #8a3b12; }
.tel { font-size: 18px; }
`,
      js: ''
    },
    fix: {
      html: [
        ['<img src="logo.svg" class="logo">', '<img src="logo.svg" class="logo" alt="Pekárna U Lípy">'],
        ['<img src="ratolest.svg" class="ozdoba">', '<img src="ratolest.svg" class="ozdoba" alt="">'],
        ['<img src="chleba.svg">', '<img src="chleba.svg" alt="Kváskový chléb">'],
        ['<img src="rohlik.svg">', '<img src="rohlik.svg" alt="Máslový rohlík">'],
        ['<img src="kolac.svg">', '<img src="kolac.svg" alt="Švestkový koláč">']
      ]
    },
    checks: [
      {
        id: 'alt', who: 'karel', text: 'Každý obrázek má atribut alt',
        run(ctx) {
          const miss = ctx.$$('img').filter(i => !i.hasAttribute('alt'));
          if (!miss.length) return true;
          const f = H.src(miss[0]);
          return H.f(`U obrázku slyším jen „obrázek bez popisu, ${f}“. Co na něm je?`, `${miss.length === 1 ? 'Jednomu obrázku' : `Obrázkům (${miss.length})`} chybí atribut alt, třeba ${f}.`);
        }
      },
      {
        id: 'logo', who: 'karel', text: 'Vím, jak se pekárna jmenuje',
        run(ctx) {
          const i = H.img(ctx, 'logo.svg');
          if (!i) return H.f('Logo pekárny jsem na stránce nenašel.', 'Nesmaž obrázek logo.svg.');
          const alt = i.getAttribute('alt');
          if (alt === null) return H.f('Hned nahoře je „obrázek bez popisu, logo.svg“. Na jakém webu vůbec jsem?', 'Logo nemá alt. Napiš do něj text, který je v logu: Pekárna U Lípy.');
          if (!H.has(alt, 'lip')) return H.f(`Logo je pro mě ${alt ? H.q(alt) : 'prázdné místo'}. Jak se pekárna jmenuje?`, 'V logu je napsáno „Pekárna U Lípy“. Text z obrázku patří do altu.');
          return true;
        }
      },
      {
        id: 'pecivo', who: 'karel', text: 'Vím, co dnes pečete',
        run(ctx) {
          for (const [file, words, nm] of PRODUCTS) {
            const i = H.img(ctx, file);
            if (!i) return H.f(`Na stránce chybí ${nm}.`, `Nesmaž obrázek ${file}.`);
            const alt = i.getAttribute('alt');
            if (!alt || !H.has(alt, ...words)) return H.f(`U pečiva za ${H.textOf(i.parentElement.querySelector('p')) || 'tuhle cenu'} slyším ${alt ? H.q(alt) : `„obrázek bez popisu, ${file}“`}. Co to je?`, `Obrázek ${file} ukazuje ${nm}. Napiš do altu jeho název, třeba ten, který je pod obrázkem.`);
          }
          return true;
        }
      },
      {
        id: 'soubor', who: 'karel', text: 'Popisky nejsou názvy souborů',
        run(ctx) {
          const bad = ctx.$$('img').map(i => i.getAttribute('alt')).find(a => a && (/\.(svg|png|jpe?g|gif|webp)\b/i.test(a) || /^(obrazek|foto|fotka|image|img|picture)$/.test(fold(a))));
          return bad ? H.f(`Slyším ${H.q(bad)}. To mi nic neřekne.`, 'Alt popisuje, co je na obrázku. Název souboru ani slovo „obrázek“ nestačí.') : true;
        }
      },
      {
        id: 'ozdoba', who: 'karel', text: 'Ozdoba mě nezdržuje',
        run(ctx) {
          const i = H.img(ctx, 'ratolest.svg');
          if (!i) return true;
          if (ctx.role(i) === 'none' || i.getAttribute('aria-hidden') === 'true') return true;
          const alt = i.getAttribute('alt');
          if (alt === null) return H.f('Mezi nadpisem a pečivem slyším „obrázek bez popisu, ratolest.svg“. Zbytečně mě to zdrží.', 'Ratolest nic nesděluje. Dej jí prázdný alt="" a čtečka ji přeskočí.');
          return H.f(`Čtečka mi přečte „obrázek, ${alt}“. Ozdoba mi nic neřekne, jen zdržuje.`, 'Ozdobný obrázek dostane prázdný alt="" (dvě uvozovky hned za sebou).');
        }
      }
    ],
    bonus: {
      text: 'Žádný alt nezačíná slovem „obrázek“ ani „foto“. Čtečka to řekne sama.',
      check: ctx => ctx.$$('img').every(i => !/^(obrazek|obr\b|foto|image|picture)/.test(fold(i.getAttribute('alt') || '')))
    },
    hints: [
      'Atribut alt se píše do značky img: `<img src="chleba.svg" alt="Kváskový chléb">`.',
      'Co napsat? To, co obrázek sděluje. U pečiva jeho název (je i pod obrázkem), u loga jméno pekárny.',
      'Ratolest je jen ozdoba. Dej jí `alt=""`, prázdné uvozovky. Když alt úplně chybí, čtečka přečte název souboru.'
    ],
    learn: ['Atribut **alt** říká, co obrázek sděluje. Obrázek s informací dostane krátký výstižný popis, ozdobný obrázek prázdné `alt=""`. Slovo „obrázek“ do altu nepiš, čtečka ho řekne sama.', '<img src="chleba.svg" alt="Kváskový chléb">\n<img src="ratolest.svg" alt="">', 'html'],
    reward: 'Paní Lipová: „Pan Karel si objednal tři koláče. Přes web!“',
    palette: [{ f: 'html', s: ' alt="|"' }, { f: 'html', s: ' alt=""' }],
    assets: { 'logo.svg': ASSETS['logo.svg'], 'ratolest.svg': ASSETS['ratolest.svg'], 'chleba.svg': ASSETS['chleba.svg'], 'rohlik.svg': ASSETS['rohlik.svg'], 'kolac.svg': ASSETS['kolac.svg'] },
    wrong: [
      { label: 'alt jako název souboru', base: 'solution', fix: { html: [['alt="Kváskový chléb"', 'alt="chleba.svg"']] }, expect: { fail: ['soubor'] } },
      { label: 'ozdoba s popisem', base: 'solution', fix: { html: [['class="ozdoba" alt=""', 'class="ozdoba" alt="ratolest"']] }, expect: { fail: ['ozdoba'] } },
      { label: 'logo bez altu', base: 'solution', fix: { html: [[' alt="Pekárna U Lípy"', '']] }, expect: { fail: ['alt', 'logo'] } },
      { label: 'slovo obrázek v altu', base: 'solution', fix: { html: [['alt="Kváskový chléb"', 'alt="Obrázek chleba"']] }, expect: { pass: true, bonus: false } }
    ]
  });

  /* ---------------- 2. Městská knihovna ---------------- */
  W.LEVELS.push({
    id: 2, chapter: 1, title: 'Městská knihovna', concept: 'h1–h3 a lang',
    client: { name: 'Ivana Knížková', role: 'knihovnice', ico: '📚' },
    personas: ['karel'], edit: ['html'],
    brief: [
      ['klient', 'Máme nový web a nevidomí čtenáři se v něm prý nevyznají. Přitom je tam všechno: otevírací doba, akce, kontakt.'],
      ['karel', 'Čtečka mi umí vyjmenovat **nadpisy** a já mezi nimi skáču klávesou H. Na vašem webu žádné nadpisy nejsou, jen velké tučné písmo.'],
      ['karel', 'A ještě něco: čtečka čte vaši češtinu **anglickým hlasem**. Stránka o sobě tvrdí, že je anglicky.'],
      ['klient', 'Hlavně ať to pak vypadá stejně. Na vzhledu jsme se s grafikem nadřeli.']
    ],
    task: 'Oprav jazyk stránky na `lang="cs"`. Z velkých popisků udělej skutečné nadpisy: jeden `h1`, sekce `h2`. **Třídy nech**, aby vzhled zůstal stejný.',
    files: {
      html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Městská knihovna Hrádek</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="titulek">Městská knihovna Hrádek</div>
  <p class="perex">Půjčujeme knihy, deskové hry i čtečky e-knih.</p>

  <div class="sekce">Otevírací doba</div>
  <p>Pondělí až čtvrtek 9:00–18:00, pátek 9:00–15:00</p>

  <div class="sekce">Akce v prosinci</div>
  <div class="akce">
    <div class="akce-nazev">Večer s detektivkou</div>
    <p>Čtvrtek 3. 12. od 18:00, čte autorka Jana Zelená.</p>
  </div>
  <div class="akce">
    <div class="akce-nazev">Deskovky pro celou rodinu</div>
    <p>Sobota 12. 12. od 10:00, vstup zdarma.</p>
  </div>

  <div class="sekce">Kontakt</div>
  <p>Náměstí 12, Hrádek, knihovna@hradek.cz</p>
</body>
</html>
`,
      css: `body {
  margin: 0;
  padding: 24px 36px 30px;
  max-width: 760px;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  background: #f5f2ea;
  color: #23302a;
}
.titulek {
  margin: 0 0 4px;
  font-size: 34px;
  font-weight: 800;
  color: #1f4d3a;
}
.perex { margin: 0; font-size: 18px; }
.sekce {
  margin: 24px 0 6px;
  padding-bottom: 4px;
  font-size: 23px;
  font-weight: 700;
  color: #1f4d3a;
  border-bottom: 3px solid #c9a646;
}
.akce {
  margin: 10px 0;
  padding: 10px 16px;
  background: #fff;
  border-left: 5px solid #c9a646;
  border-radius: 0 10px 10px 0;
}
.akce-nazev { margin: 0; font-size: 18px; font-weight: 700; }
.akce p { margin: 4px 0 0; }
`,
      js: ''
    },
    fix: {
      html: [
        ['<html lang="en">', '<html lang="cs">'],
        ['<div class="titulek">Městská knihovna Hrádek</div>', '<h1 class="titulek">Městská knihovna Hrádek</h1>'],
        ['<div class="sekce">Otevírací doba</div>', '<h2 class="sekce">Otevírací doba</h2>'],
        ['<div class="sekce">Akce v prosinci</div>', '<h2 class="sekce">Akce v prosinci</h2>'],
        ['<div class="akce-nazev">Večer s detektivkou</div>', '<h3 class="akce-nazev">Večer s detektivkou</h3>'],
        ['<div class="akce-nazev">Deskovky pro celou rodinu</div>', '<h3 class="akce-nazev">Deskovky pro celou rodinu</h3>'],
        ['<div class="sekce">Kontakt</div>', '<h2 class="sekce">Kontakt</h2>']
      ]
    },
    checks: [
      {
        id: 'lang', who: 'karel', text: 'Čtečka mluví česky',
        run(ctx) {
          const lang = ctx.info().lang;
          if (/^cs\b/i.test(lang)) return true;
          return H.f(lang ? `Stránka tvrdí, že je v jazyce ${H.q(lang)}. Čtečka čte češtinu anglickým hlasem a já skoro nerozumím.` : 'Stránka neříká, v jakém je jazyce. Čtečka hádá a čte cizím hlasem.', 'Značka <html> potřebuje lang="cs".');
        }
      },
      {
        id: 'h1', who: 'karel', text: 'Stránka má jeden hlavní nadpis',
        run(ctx) {
          const h1 = H.headings(ctx).filter(h => h.level === 1);
          if (!h1.length) return H.f('Nevím, kde stránka začíná. Nemá hlavní nadpis.', 'Název knihovny patří do značky <h1>.');
          if (h1.length > 1) return H.f(`Hlavních nadpisů je ${h1.length}. Který je ten pravý?`, 'Stránka má jeden <h1>. Ostatní nadpisy jsou h2, h3…');
          if (!H.has(h1[0].name, 'knihovn')) return H.f(`Hlavní nadpis zní ${H.q(h1[0].name)}. Na jakém webu jsem?`, 'Do <h1> patří „Městská knihovna Hrádek“.');
          return true;
        }
      },
      {
        id: 'h2', who: 'karel', text: 'Klávesou H skočím na každou sekci',
        run(ctx) {
          const all = H.headings(ctx);
          const hs = all.filter(h => h.level === 2).map(h => h.name);
          const need = [['oteviraci', 'Otevírací doba'], ['akce', 'Akce v prosinci'], ['kontakt', 'Kontakt']];
          const miss = need.filter(([w]) => !hs.some(n => H.has(n, w)));
          if (!miss.length) return true;
          return H.f(all.length ? `Klávesou H najdu jen ${all.map(h => H.q(h.name)).join(', ')}. Kde je ${H.q(miss[0][1])}?` : 'Mačkám H a čtečka hlásí „žádné další nadpisy“.', `Sekce ${miss.map(m => H.q(m[1])).join(', ')} potřebují nadpis <h2>.`);
        }
      },
      {
        id: 'poradi', who: 'karel', text: 'Úrovně nadpisů jdou po sobě',
        run(ctx) {
          const hs = H.headings(ctx);
          if (!hs.length) return H.f('Nadpisy tu nejsou žádné.', 'Začni nadpisem <h1>.');
          if (hs[0].level !== 1) return H.f(`Stránka začíná nadpisem úrovně ${hs[0].level}. Kde je úroveň 1?`, 'První nadpis stránky má být <h1>.');
          for (let i = 1; i < hs.length; i++) {
            if (hs[i].level > hs[i - 1].level + 1) return H.f(`Po nadpisu úrovně ${hs[i - 1].level} hned následuje úroveň ${hs[i].level} (${H.q(hs[i].name)}). Chybí mi mezistupeň.`, 'Úrovně jdou postupně: h1, pod ním h2, pod ním h3. Značku nevybírej podle velikosti písma.');
          }
          return true;
        }
      },
      {
        id: 'vzhled', who: 'klient', text: 'Nadpisy vypadají jako v návrhu',
        run(ctx) {
          const fs = el => parseFloat(ctx.win.getComputedStyle(el).fontSize);
          const h1 = ctx.$('h1');
          if (h1 && Math.abs(fs(h1) - 34) > 1) return H.f('Hlavní nadpis teď vypadá jinak než v návrhu od grafika.', 'Nech nadpisu jeho třídu: <h1 class="titulek">. Vzhled řídí CSS, značka říká jen, co to je.');
          const bad = ctx.$$('h2').find(h => Math.abs(fs(h) - 23) > 1);
          if (bad) return H.f(`Nadpis ${H.q(H.textOf(bad))} vypadá jinak než ostatní sekce.`, 'Nech nadpisům sekcí třídu: <h2 class="sekce">.');
          return true;
        }
      }
    ],
    bonus: {
      text: 'Názvy akcí jsou nadpisy h3 pod sekcí Akce.',
      check: ctx => { const h3 = H.headings(ctx).filter(h => h.level === 3).map(h => h.name); return ['detektiv', 'deskovk'].every(w => h3.some(n => H.has(n, w))); }
    },
    hints: [
      'Jazyk je hned v prvních řádcích: `<html lang="en">` změň na `<html lang="cs">`.',
      'Značku přepiš na obou koncích a třídu nech: `<h2 class="sekce">Otevírací doba</h2>`.',
      'Název knihovny je jediný `<h1>`. Otevírací doba, akce a kontakt jsou `<h2>`. Názvy jednotlivých akcí můžou být `<h3>`.'
    ],
    learn: ['Nadpisy tvoří osnovu stránky. Čtečka je umí vyjmenovat a uživatel mezi nimi skáče. Úroveň vybírej podle struktury (h1 → h2 → h3), velikost písma řeš v CSS. Atribut **lang** vybere správný hlas čtečky.', '<html lang="cs">\n…\n<h1 class="titulek">Městská knihovna</h1>\n<h2 class="sekce">Otevírací doba</h2>', 'html'],
    reward: 'Paní Knížková: „Karel si přes web zarezervoval detektivku. A přijde i na čtení!“',
    palette: [{ f: 'html', s: 'lang="cs"' }, { f: 'html', s: '<h1 class="titulek">|</h1>' }, { f: 'html', s: '<h2 class="sekce">|</h2>' }, { f: 'html', s: '<h3 class="akce-nazev">|</h3>' }],
    wrong: [
      { label: 'sekce jako h4', base: 'solution', fix: { html: [['<h2 class="sekce">Otevírací doba</h2>', '<h4 class="sekce">Otevírací doba</h4>']] }, expect: { fail: ['h2', 'poradi'] } },
      { label: 'bez tříd', base: 'solution', fix: { html: [['<h1 class="titulek">', '<h1>']] }, expect: { fail: ['vzhled'] } },
      { label: 'bez lang', base: 'solution', fix: { html: [['<html lang="cs">', '<html>']] }, expect: { fail: ['lang'] } }
    ]
  });

  /* ---------------- 3. Keramická dílna ---------------- */
  const FIELDS = [['jmeno', ['jmen'], 'Jméno a příjmení'], ['email', ['mail'], 'E-mail'], ['telefon', ['telefon'], 'Telefon']];
  const VISIBLE = { jmeno: 'Jméno a příjmení', email: 'E-mail', telefon: 'Telefon', po: 'Pondělí 17:00', st: 'Středa 18:30' };
  W.LEVELS.push({
    id: 3, chapter: 1, title: 'Keramická dílna Hrnek', concept: 'label',
    client: { name: 'Petr Hlína', role: 'keramik', ico: '🏺' },
    personas: ['karel', 'jana'], edit: ['html'],
    brief: [
      ['klient', 'Na kurzy točení se hlásí jen lidé, kteří mi zavolají. Přihlášky z webu chodí skoro prázdné.'],
      ['karel', 'Když přijdu do pole, čtečka řekne jen „editační pole, prázdné“. Mám tam psát jméno, nebo e-mail?'],
      ['jana', 'A já se špatně trefuju do těch malinkých koleček u termínu. Jinde stačí kliknout na text vedle, tady to nejde.'],
      ['karel', 'Obojí vyřeší jedna značka: **`<label>`**. Propojí text s polem pro čtečku i pro myš.']
    ],
    task: 'Propoj popisky s poli značkou `<label for="…">`. Termíny obal do `<label>` i s přepínačem. Povinná pole (s hvězdičkou) označ atributem `required`.',
    files: {
      html: `${head('Přihláška – Keramická dílna Hrnek')}
<body>
  <form class="prihlaska">
    <h1>Přihláška na kurz točení</h1>
    <p class="pozn">Pole s hvězdičkou * jsou povinná.</p>

    <div class="pole">
      <span>Jméno a příjmení *</span>
      <input type="text" id="jmeno" placeholder="Jan Novák">
    </div>
    <div class="pole">
      <span>E-mail *</span>
      <input type="email" id="email" placeholder="jan@example.cz">
    </div>
    <div class="pole">
      <span>Telefon</span>
      <input type="tel" id="telefon">
    </div>

    <div class="termin">
      <span>Termín kurzu *</span>
      <input type="radio" name="termin" id="po"> Pondělí 17:00
      <input type="radio" name="termin" id="st"> Středa 18:30
    </div>

    <button type="submit">Odeslat přihlášku</button>
  </form>
</body>
</html>
`,
      css: `body {
  margin: 0;
  padding: 26px;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  background: #efe4d8;
  color: #2f2219;
}
.prihlaska {
  max-width: 460px;
  margin: 0 auto;
  padding: 22px 26px 26px;
  background: #fffaf4;
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(120, 70, 30, .18);
}
h1 { margin: 0 0 4px; font-size: 27px; color: #8c3f1d; }
.pozn { margin: 0 0 14px; color: #5e4a3c; }
.pole { margin-bottom: 12px; }
.pole span, .pole label { display: block; margin-bottom: 4px; font-weight: 700; }
input[type=text], input[type=email], input[type=tel] {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 11px;
  font-size: 16px;
  border: 2px solid #b39a86;
  border-radius: 9px;
  background: #fff;
}
.termin { margin: 6px 0 16px; padding: 0; border: 0; }
.termin span, .termin legend { display: block; margin-bottom: 6px; padding: 0; font-weight: 700; }
.termin label { margin-right: 16px; }
input[type=radio] { width: 13px; height: 13px; margin: 0 4px 0 0; }
button {
  padding: 11px 18px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: #8c3f1d;
  border: 0;
  border-radius: 10px;
}
`,
      js: ''
    },
    fix: {
      html: [
        ['<span>Jméno a příjmení *</span>\n      <input type="text" id="jmeno" placeholder="Jan Novák">', '<label for="jmeno">Jméno a příjmení *</label>\n      <input type="text" id="jmeno" placeholder="Jan Novák" required>'],
        ['<span>E-mail *</span>\n      <input type="email" id="email" placeholder="jan@example.cz">', '<label for="email">E-mail *</label>\n      <input type="email" id="email" placeholder="jan@example.cz" required>'],
        ['<span>Telefon</span>', '<label for="telefon">Telefon</label>'],
        ['<div class="termin">\n      <span>Termín kurzu *</span>\n      <input type="radio" name="termin" id="po"> Pondělí 17:00\n      <input type="radio" name="termin" id="st"> Středa 18:30\n    </div>',
          '<fieldset class="termin">\n      <legend>Termín kurzu *</legend>\n      <label><input type="radio" name="termin" id="po" required> Pondělí 17:00</label>\n      <label><input type="radio" name="termin" id="st"> Středa 18:30</label>\n    </fieldset>']
      ]
    },
    checks: [
      {
        id: 'pole', who: 'karel', text: 'Vím, co patří do kterého pole',
        run(ctx) {
          for (const [id, words, lbl] of FIELDS) {
            const el = ctx.$('#' + id);
            if (!el) return H.f(`Pole ${H.q(lbl)} na stránce nenacházím.`, `Nesmaž pole s id="${id}".`);
            const n = ctx.nameInfo(el);
            if (!n.text || n.from === 'placeholder') return H.f(`Slyším jen „editační pole, prázdné“${n.from === 'placeholder' ? ` a občas nápovědu ${H.q(n.text)}` : ''}. Co tam mám napsat?`, `Pole #${id} nemá popisek. Text „${lbl}“ dej do <label for="${id}">.`);
            if (!H.has(n.text, ...words)) return H.f(`Pole se jmenuje ${H.q(n.text)}, ale čekal bych ${H.q(lbl)}.`, 'Zkontroluj, že for v <label for="…"> míří na správné id.');
          }
          return true;
        }
      },
      {
        id: 'termin', who: 'karel', text: 'U termínu slyším den a čas',
        run(ctx) {
          const po = ctx.$('#po');
          const st = ctx.$('#st');
          if (!po || !st) return H.f('Přepínače termínu nenacházím.', 'Nesmaž přepínače s id="po" a id="st".');
          const a = ctx.name(po);
          const b = ctx.name(st);
          if (!H.has(a, 'pondel') || !H.has(b, 'stred')) return H.f(`Slyším „přepínač, ${a || 'bez popisku'}“ a „přepínač, ${b || 'bez popisku'}“. Který je který?`, 'Obal přepínač i jeho text do <label>: <label><input type="radio" …> Pondělí 17:00</label>.');
          return true;
        }
      },
      {
        id: 'klik', who: 'jana', text: 'Kliknu na popisek a trefím se do pole',
        run(ctx) {
          for (const id of Object.keys(VISIBLE)) {
            const el = ctx.$('#' + id);
            if (!el || (el.labels && el.labels.length)) continue;
            return H.f(`Kliknu na text ${H.q(VISIBLE[id])} a nic se nestane. Do políčka se pak trefuju dlouho.`, el.getAttribute('aria-label') ? `Pole #${id} má jen aria-label. Čtečce to stačí, ale na neviditelný popisek se kliknout nedá. Použij <label>.` : `Pole #${id} nemá propojený <label>.`);
          }
          return true;
        }
      },
      {
        id: 'povinne', who: 'karel', text: 'Vím, která pole jsou povinná',
        run(ctx) {
          const miss = ['jmeno', 'email'].filter(id => { const el = ctx.$('#' + id); return el && !el.required && el.getAttribute('aria-required') !== 'true'; });
          if (!miss.length) return true;
          return H.f('Čtečka u jména ani e-mailu neřekne „povinné“. Hvězdičku v textu snadno přeslechnu.', `Přidej atribut required: ${miss.map(i => '#' + i).join(', ')}.`);
        }
      }
    ],
    bonus: {
      text: 'Termíny jsou ve skupině <fieldset> s nadpisem <legend>.',
      check: ctx => { const po = ctx.$('#po'); const fs = po && po.closest('fieldset'); return !!fs && fs.contains(ctx.$('#st')) && H.has(H.textOf(fs.querySelector('legend')), 'termin'); }
    },
    hints: [
      'Místo `<span>` napiš `<label for="jmeno">Jméno a příjmení *</label>`. Hodnota **for** musí být stejná jako **id** pole.',
      'U přepínačů obal pole i text: `<label><input type="radio" name="termin" id="po"> Pondělí 17:00</label>`.',
      'Povinné pole: `<input … required>`. Pro bonus vyměň `<div class="termin">` za `<fieldset class="termin">` a `<span>` za `<legend>`.'
    ],
    learn: ['**`<label>`** spojí text s polem. Čtečka ho přečte jako jméno pole a kliknutím na text se pole vybere, což ocení každý s nepřesnou rukou. Placeholder popisek nenahradí, při psaní zmizí.', '<label for="email">E-mail *</label>\n<input type="email" id="email" required>\n\n<label><input type="radio" name="termin"> Pondělí</label>', 'html'],
    reward: 'Pan Hlína: „Tenhle týden šest přihlášek z webu. Musím koupit další hrnčířský kruh!“',
    palette: [{ f: 'html', s: '<label for="|"></label>' }, { f: 'html', s: '<label>|</label>' }, { f: 'html', s: ' required' }, { f: 'html', s: '<fieldset class="termin">\n  <legend>|</legend>\n</fieldset>' }],
    wrong: [
      { label: 'aria-label místo label', base: 'solution', fix: { html: [['<label for="jmeno">Jméno a příjmení *</label>\n      <input type="text" id="jmeno" placeholder="Jan Novák" required>', '<span>Jméno a příjmení *</span>\n      <input type="text" id="jmeno" placeholder="Jan Novák" aria-label="Jméno a příjmení" required>']] }, expect: { fail: ['klik'] } },
      { label: 'label bez for', base: 'solution', fix: { html: [['<label for="email">E-mail *</label>', '<label>E-mail *</label>']] }, expect: { fail: ['pole', 'klik'] } },
      { label: 'bez required', base: 'solution', fix: { html: [['placeholder="jan@example.cz" required', 'placeholder="jan@example.cz"']] }, expect: { fail: ['povinne'] } }
    ]
  });

  /* ---------------- 4. Turistický klub ---------------- */
  const VAGUE = /^(zde|tady|sem|klikn\w*( (sem|zde|tady))?|cist dal|cist vic|vice|vic|dalsi|odkaz|info|vice informaci|podrobnosti|here|click here|more|read more)$/;
  W.LEVELS.push({
    id: 4, chapter: 1, title: 'Turistický klub Šutr', concept: 'text odkazu',
    client: { name: 'Zdeněk Pecka', role: 'předseda klubu', ico: '🥾' },
    personas: ['karel'], edit: ['html'],
    brief: [
      ['klient', 'Na výlety jezdí pořád stejní lidé. Asi máme nudný web?'],
      ['karel', 'Web je fajn, jen se v něm nevyznám. Čtečka mi umí vypsat **všechny odkazy** na stránce. U vás to zní takhle: „zde, Číst dál, Číst dál, Číst dál, bez popisku, klikneš sem“.'],
      ['karel', 'Kam vede který „Číst dál“? To zjistím jen tak, že si celou stránku přečtu znovu.']
    ],
    task: 'Přepiš texty odkazů tak, aby samy řekly, kam vedou. Odkaz s ikonou obálky nemá žádný text, dej mu jméno přes `aria-label`.',
    files: {
      html: `${head('Turistický klub Šutr')}
<body>
  <header>
    <h1>Turistický klub Šutr</h1>
    <p>Přidej se k nám! Přihlášku najdeš <a href="prihlaska.pdf">zde</a>.</p>
  </header>
  <main>
    <article>
      <h2>Na Sněžku přes Obří důl</h2>
      <p>Sobota 5. 12., 14 km, středně náročné.</p>
      <a href="snezka.html">Číst dál</a>
    </article>
    <article>
      <h2>Kolem Máchova jezera</h2>
      <p>Neděle 13. 12., 11 km, i pro rodiny s dětmi.</p>
      <a href="macha.html">Číst dál</a>
    </article>
    <article>
      <h2>Prachovské skály</h2>
      <p>Sobota 19. 12., 9 km, skály a vyhlídky.</p>
      <a href="prachov.html">Číst dál</a>
    </article>
  </main>
  <footer>
    <a href="mailto:info@sutr.cz" class="ikona"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M3 5h18v14H3z M3 6l9 7 9-7" fill="none" stroke="currentColor" stroke-width="2"/></svg></a>
    <p>Mapu ke klubovně najdeš, když <a href="https://mapy.cz">klikneš sem</a>.</p>
  </footer>
</body>
</html>
`,
      css: `body {
  margin: 0;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  background: #eef3ea;
  color: #22301f;
}
header {
  padding: 22px 28px 26px;
  background: #3d5a2a;
  color: #f3f7ee;
}
header h1 { margin: 0 0 6px; font-size: 32px; }
header p { margin: 0; font-size: 18px; }
header a { color: #ffe08a; }
main {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
  padding: 20px 28px;
}
article {
  padding: 14px 16px 16px;
  background: #fff;
  border-top: 5px solid #8a6d3b;
  border-radius: 12px;
}
article h2 { margin: 0 0 6px; font-size: 20px; }
article p { margin: 0 0 10px; }
article a { color: #2f6b1f; font-weight: 700; }
footer {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 4px 28px 24px;
}
footer p { margin: 0; }
footer a { color: #2f6b1f; }
.ikona { display: inline-grid; place-items: center; width: 46px; height: 46px; background: #fff; border-radius: 50%; }
`,
      js: ''
    },
    fix: {
      html: [
        ['Přihlášku najdeš <a href="prihlaska.pdf">zde</a>.', 'Stáhni si <a href="prihlaska.pdf">přihlášku do klubu (PDF, 120 kB)</a>.'],
        ['<a href="snezka.html">Číst dál</a>', '<a href="snezka.html">Na Sněžku: podrobnosti o výletu</a>'],
        ['<a href="macha.html">Číst dál</a>', '<a href="macha.html">Kolem Máchova jezera: podrobnosti</a>'],
        ['<a href="prachov.html">Číst dál</a>', '<a href="prachov.html">Prachovské skály: podrobnosti</a>'],
        ['<a href="mailto:info@sutr.cz" class="ikona">', '<a href="mailto:info@sutr.cz" class="ikona" aria-label="Napište nám e-mail">'],
        ['Mapu ke klubovně najdeš, když <a href="https://mapy.cz">klikneš sem</a>.', 'Kudy k nám: <a href="https://mapy.cz">mapa ke klubovně</a>.']
      ]
    },
    checks: [
      {
        id: 'vagni', who: 'karel', text: 'V odkazech není „zde“ ani „Číst dál“',
        run(ctx) {
          const names = H.links(ctx).map(a => ctx.name(a));
          const bad = names.filter(n => VAGUE.test(fold(n)));
          if (!bad.length) return true;
          return H.f(`Seznam odkazů mi čte: ${names.map(n => n || 'bez popisku').join(', ')}. Kam to všechno vede?`, `Odkaz ${H.q(bad[0])} neříká, kam vede. Napiš do odkazu, co na druhé straně najdu.`);
        }
      },
      {
        id: 'unik', who: 'karel', text: 'Každý odkaz zní jinak',
        run(ctx) {
          const seen = new Map();
          for (const a of H.links(ctx)) {
            const n = fold(ctx.name(a));
            const href = a.getAttribute('href');
            if (!n) continue;
            if (seen.has(n) && seen.get(n) !== href) return H.f(`Několikrát slyším ${H.q(ctx.name(a))}, ale pokaždé to vede jinam.`, 'Odkazy na různé stránky potřebují různé texty.');
            seen.set(n, href);
          }
          return true;
        }
      },
      {
        id: 'vylety', who: 'karel', text: 'Z odkazu poznám, o jaký výlet jde',
        run(ctx) {
          const trips = [['snezka.html', 'snez', 'Na Sněžku'], ['macha.html', 'mach', 'Kolem Máchova jezera'], ['prachov.html', 'prachov', 'Prachovské skály']];
          for (const [href, w, t] of trips) {
            const a = ctx.$(`a[href="${href}"]`);
            if (!a) return H.f(`Odkaz na výlet ${H.q(t)} jsem nenašel.`, `Nesmaž odkaz s href="${href}".`);
            if (!H.has(ctx.name(a), w)) return H.f(`Odkaz ${H.q(ctx.name(a) || 'bez popisku')} mi neřekne, ke kterému výletu patří.`, `Dej do odkazu název výletu, třeba „${t}: podrobnosti“.`);
          }
          return true;
        }
      },
      {
        id: 'ikona', who: 'karel', text: 'Odkaz s ikonou obálky má jméno',
        run(ctx) {
          const a = ctx.$('a[href^="mailto:"]');
          if (!a) return H.f('Odkaz na e-mail jsem nenašel.', 'Nesmaž odkaz mailto:info@sutr.cz.');
          const n = ctx.name(a);
          if (!n) return H.f('Slyším „odkaz, bez popisku“. Netuším, co se stane, když ho zmáčknu.', 'Odkaz jen s ikonou potřebuje jméno: aria-label="Napište nám e-mail".');
          if (!H.has(n, 'mail', 'napis', 'zprav', 'kontakt', '@')) return H.f(`Odkaz se jmenuje ${H.q(n)}. Že jde o e-mail, nepoznám.`, 'Ze jména odkazu má být jasné, že napíšu e-mail.');
          return true;
        }
      }
    ],
    bonus: {
      text: 'Odkaz na přihlášku prozradí, že stahuju PDF.',
      check: ctx => { const a = ctx.$('a[href$=".pdf"]'); return !!a && H.has(ctx.name(a), 'pdf'); }
    },
    hints: [
      'Odkaz má dávat smysl i vytržený ze stránky. Místo „Číst dál“ napiš třeba `Na Sněžku: podrobnosti o výletu`.',
      'Ikona obálky je jen SVG bez textu. Do otevírací značky odkazu přidej `aria-label="Napište nám e-mail"`.',
      'Nezapomeň na „zde“ v hlavičce a „klikneš sem“ v patičce. Pro bonus přidej do textu přihlášky „(PDF)“.'
    ],
    learn: ['Uživatelé čteček si často nechají vypsat **seznam odkazů**. Text odkazu proto musí říct, kam vede, i bez okolní věty. Odkaz jen s ikonou dostane jméno přes `aria-label`.', '<a href="snezka.html">Na Sněžku: podrobnosti o výletu</a>\n<a href="mailto:info@sutr.cz" aria-label="Napište nám e-mail">\n  <svg>…</svg>\n</a>', 'html'],
    reward: 'Pan Pecka: „Na Sněžku se přihlásilo jedenáct nových lidí. Karel jde taky, s průvodcem.“',
    palette: [{ f: 'html', s: ' aria-label="|"' }, { f: 'html', s: '<a href="|"></a>' }],
    wrong: [
      { label: 'třikrát Podrobnosti', base: 'solution', fix: { html: [['>Na Sněžku: podrobnosti o výletu<', '>Podrobnosti o výletu<'], ['>Kolem Máchova jezera: podrobnosti<', '>Podrobnosti o výletu<']] }, expect: { fail: ['unik', 'vylety'] } },
      { label: 'ikona bez jména', base: 'solution', fix: { html: [[' aria-label="Napište nám e-mail"', '']] }, expect: { fail: ['ikona'] } }
    ]
  });
})(window.WBB);
