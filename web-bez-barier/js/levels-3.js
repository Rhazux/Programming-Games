/* Web bez bariér – kapitola 3: Když se stránka mění (JavaScript a ARIA) */
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

  /* ---------------- 9. Hrádecký půlmaraton ---------------- */
  W.LEVELS.push({
    id: 9, chapter: 3, title: 'Hrádecký půlmaraton', concept: 'aria-live a aria-invalid',
    client: { name: 'Marek Šprint', role: 'pořadatel závodu', ico: '🏃' },
    personas: ['karel'], edit: ['html', 'js'], startView: 'reader',
    brief: [
      ['klient', 'Registrace kontroluje chyby: když něco chybí, pole zčervená a pod ním se objeví červený text. Moderní, ne?'],
      ['karel', 'Červenou nevidím. Zmáčknu Registrovat a… ticho. Jsem registrovaný? Nebo je někde chyba?'],
      ['karel', 'Čtečka sama přečte jen změny v **živé oblasti** (`role="alert"`, `role="status"` nebo `aria-live`). A u pole chci slyšet, že je **neplatné** a proč.']
    ],
    task: 'Chybové hlášky a potvrzení dej do živých oblastí (`role="alert"`, `role="status"`). V JavaScriptu nastav chybnému poli `aria-invalid="true"` (po opravě `"false"`) a propoj pole s hláškou přes `aria-describedby`.',
    files: {
      html: `${head('Registrace – Hrádecký půlmaraton')}
<body>
  <form id="registrace" novalidate>
    <h1>Registrace na půlmaraton</h1>
    <p class="datum">Neděle 18. 4. 2027, start v 9:00 na náměstí</p>

    <label for="jmeno">Jméno a příjmení</label>
    <input id="jmeno" autocomplete="name">
    <p class="chyba" id="jmeno-chyba"></p>

    <label for="rok">Rok narození</label>
    <input id="rok" inputmode="numeric">
    <p class="chyba" id="rok-chyba"></p>

    <button type="submit">Registrovat</button>
    <p id="hotovo" class="hotovo"></p>
  </form>
  <script src="script.js"></script>
</body>
</html>
`,
      css: `body {
  margin: 0;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  color: #12261c;
  background: #eef6f1;
}
form {
  max-width: 440px;
  margin: 20px auto;
  padding: 20px 26px 22px;
  background: #fff;
  border-top: 8px solid #c2410c;
  border-radius: 16px;
}
h1 { margin: 0; font-size: 28px; }
.datum { margin: 4px 0 14px; color: #3c5a4a; }
label { display: block; margin-top: 12px; font-weight: 700; }
input {
  width: 100%;
  box-sizing: border-box;
  margin-top: 4px;
  padding: 9px 11px;
  font-size: 16px;
  border: 2px solid #7c9a8a;
  border-radius: 9px;
}
input.spatne { border-color: #c00000; background: #fff5f5; }
.chyba { min-height: 1.2em; margin: 4px 0 0; font-size: 14px; color: #c00000; }
button {
  margin-top: 14px;
  padding: 11px 20px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: #c2410c;
  border: 0;
  border-radius: 10px;
}
.hotovo { font-weight: 700; color: #1b6e3c; }
`,
      js: `const form = document.querySelector('#registrace');

function ukazChybu(pole, zprava) {
  const chyba = document.querySelector('#' + pole.id + '-chyba');
  chyba.textContent = zprava;
  if (zprava) {
    pole.classList.add('spatne');
  } else {
    pole.classList.remove('spatne');
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const jmeno = document.querySelector('#jmeno');
  const rok = document.querySelector('#rok');
  const r = Number(rok.value);

  const chybaJmena = jmeno.value.trim() === '' ? 'Vyplň jméno a příjmení.' : '';
  const chybaRoku = r >= 1925 && r <= 2011 ? '' : 'Rok narození musí být mezi 1925 a 2011.';
  ukazChybu(jmeno, chybaJmena);
  ukazChybu(rok, chybaRoku);

  if (!chybaJmena && !chybaRoku) {
    document.querySelector('#hotovo').textContent = 'Hotovo! Startovní číslo ti pošleme e-mailem.';
  }
});
`
    },
    fix: {
      html: [
        ['<input id="jmeno" autocomplete="name">', '<input id="jmeno" autocomplete="name" aria-describedby="jmeno-chyba">'],
        ['<p class="chyba" id="jmeno-chyba"></p>', '<p class="chyba" id="jmeno-chyba" role="alert"></p>'],
        ['<input id="rok" inputmode="numeric">', '<input id="rok" inputmode="numeric" aria-describedby="rok-chyba">'],
        ['<p class="chyba" id="rok-chyba"></p>', '<p class="chyba" id="rok-chyba" role="alert"></p>'],
        ['<p id="hotovo" class="hotovo"></p>', '<p id="hotovo" class="hotovo" role="status"></p>']
      ],
      js: [
        ["    pole.classList.add('spatne');", "    pole.classList.add('spatne');\n    pole.setAttribute('aria-invalid', 'true');"],
        ["    pole.classList.remove('spatne');", "    pole.classList.remove('spatne');\n    pole.setAttribute('aria-invalid', 'false');"],
        ['  ukazChybu(rok, chybaRoku);\n', '  ukazChybu(rok, chybaRoku);\n\n  if (chybaJmena) {\n    jmeno.focus();\n  } else if (chybaRoku) {\n    rok.focus();\n  }\n']
      ]
    },
    async scenario(c, S) {
      const n = c.normal;
      const jm = n.$('#jmeno');
      const rok = n.$('#rok');
      const btn = n.$('#registrace button') || n.$('button');
      S.found = !!(jm && rok && btn);
      if (!S.found) return;
      n.press(btn, 'Enter');
      await n.wait(20);
      S.err = { live: n.live().map(l => l.text), jm: jm.getAttribute('aria-invalid'), rok: rok.getAttribute('aria-invalid'), jmDesc: n.describe(jm), rokDesc: n.describe(rok), active: n.doc.activeElement ? n.doc.activeElement.id : '' };
      n.type(jm, 'Eva Rychlá');
      n.type(rok, '1990');
      n.press(btn, 'Enter');
      await n.wait(20);
      const ok = n.$('#hotovo');
      S.ok = { jm: jm.getAttribute('aria-invalid'), rok: rok.getAttribute('aria-invalid'), hotovo: H.textOf(ok), live: !!ok && n.inLive(ok) };
    },
    checks: [
      {
        id: 'ohlas', who: 'karel', text: 'Po odeslání uslyším, že je chyba',
        run(ctx) {
          const S = ctx.S;
          if (!S.found) return H.f('Formulář s poli jmeno a rok jsem nenašel.', 'Nemaž pole #jmeno, #rok ani tlačítko.');
          if (S.err.live.some(t => H.has(t, 'vypln', 'rok narozeni'))) return true;
          return H.f('Zmáčkl jsem Registrovat prázdný formulář a… ticho. Je tam chyba?', 'Chybové hlášky musí být v živé oblasti, která existuje už při načtení stránky: <p class="chyba" id="jmeno-chyba" role="alert"></p>.');
        }
      },
      {
        id: 'invalid', who: 'karel', text: 'Vím, které pole je špatně',
        run(ctx) {
          const S = ctx.S;
          if (!S.found) return H.f('Pole formuláře jsem nenašel.', 'Nemaž pole #jmeno a #rok.');
          if (S.err.jm === 'true' && S.err.rok === 'true') return true;
          return H.f(`U pole ${S.err.jm === 'true' ? 'Rok narození' : 'Jméno'} slyším jen „editační pole, prázdné“. Že je špatně, nepoznám.`, "Chybnému poli nastav v JavaScriptu pole.setAttribute('aria-invalid', 'true').");
        }
      },
      {
        id: 'popis', who: 'karel', text: 'U pole uslyším, co je špatně',
        run(ctx) {
          const S = ctx.S;
          if (!S.found) return H.f('Pole formuláře jsem nenašel.', 'Nemaž pole #jmeno a #rok.');
          if (H.has(S.err.jmDesc, 'vypln') && H.has(S.err.rokDesc, '1925')) return true;
          return H.f(`Na poli ${H.has(S.err.jmDesc, 'vypln') ? 'Rok narození' : 'Jméno'} nevím, co mám opravit. Hlášku pod ním čtečka k poli nepřiřadí.`, 'Propoj pole s jeho hláškou: <input id="rok" aria-describedby="rok-chyba">.');
        }
      },
      {
        id: 'hotovo', who: 'karel', text: 'Po opravě uslyším potvrzení',
        run(ctx) {
          const S = ctx.S;
          if (!S.found || !S.ok) return H.f('Formulář jsem nedokázal odeslat.', 'Nemaž pole ani tlačítko Registrovat.');
          if (S.ok.jm === 'true' || S.ok.rok === 'true') return H.f('Opravil jsem obě pole, ale čtečka u nich pořád hlásí „neplatné“.', "Po opravě nastav aria-invalid zpátky na 'false' (nebo atribut odeber).");
          if (!H.has(S.ok.hotovo, 'hotovo')) return H.f('Vyplnil jsem všechno správně, ale potvrzení se neobjevilo.', 'Zkontroluj, že kód po úspěšné kontrole vypíše text do #hotovo.');
          if (!S.ok.live) return H.f('Registrace prošla? Nic jsem neslyšel.', 'Potvrzení #hotovo dej do živé oblasti: role="status".');
          return true;
        }
      }
    ],
    bonus: {
      text: 'Po chybě skočí kurzor do prvního chybného pole.',
      check: ctx => !!ctx.S.err && ctx.S.err.active === 'jmeno'
    },
    hints: [
      'V HTML přidej hláškám `role="alert"`: `<p class="chyba" id="jmeno-chyba" role="alert"></p>`. Potvrzení dostane `role="status"`.',
      "Ve funkci ukazChybu přidej k přidání třídy `pole.setAttribute('aria-invalid', 'true');` a k odebrání totéž s `'false'`.",
      'Popis pole: `<input id="rok" … aria-describedby="rok-chyba">`. Pro bonus po kontrole zavolej `jmeno.focus()` nebo `rok.focus()`.'
    ],
    learn: ['Čtečka nevidí, že se něco změnilo. **Živá oblast** (`role="alert"`, `role="status"`, `aria-live`) jí řekne, ať změnu přečte. **`aria-invalid`** označí chybné pole a **`aria-describedby`** k němu připojí vysvětlení.', '<input id="rok" aria-describedby="rok-chyba">\n<p id="rok-chyba" role="alert"></p>\n\npole.setAttribute(\'aria-invalid\', \'true\');', 'html'],
    reward: 'Pan Šprint: „Karel se zaregistroval a poběží s vodičem. Startovní číslo jedna!“',
    palette: [{ f: 'html', s: ' role="alert"' }, { f: 'html', s: ' role="status"' }, { f: 'html', s: ' aria-describedby="|"' }, { f: 'js', s: "pole.setAttribute('aria-invalid', '|');" }, { f: 'js', s: 'jmeno.focus();' }],
    wrong: [
      { label: 'jen aria-invalid', base: 'starter', fix: { js: [["    pole.classList.add('spatne');", "    pole.classList.add('spatne');\n    pole.setAttribute('aria-invalid', 'true');"], ["    pole.classList.remove('spatne');", "    pole.classList.remove('spatne');\n    pole.setAttribute('aria-invalid', 'false');"]] }, expect: { fail: ['ohlas', 'popis', 'hotovo'] } },
      { label: 'bez describedby', base: 'solution', fix: { html: [[' aria-describedby="rok-chyba"', '']] }, expect: { fail: ['popis'] } },
      { label: 'neplatné i po opravě', base: 'solution', fix: { js: [["\n    pole.setAttribute('aria-invalid', 'false');", '']] }, expect: { fail: ['hotovo'] } },
      { label: 'bez přesunu kurzoru', base: 'solution', fix: { js: [['\n  if (chybaJmena) {\n    jmeno.focus();\n  } else if (chybaRoku) {\n    rok.focus();\n  }\n', '']] }, expect: { pass: true, bonus: false } }
    ]
  });

  /* ---------------- 10. Kavárna Pod Věží ---------------- */
  const Q = [['o1', 'Máte bezlepkové dorty?'], ['o2', 'Můžu přijít se psem?'], ['o3', 'Dá se u vás platit kartou?']];
  W.LEVELS.push({
    id: 10, chapter: 3, title: 'Kavárna Pod Věží', concept: 'aria-expanded',
    client: { name: 'Klára Zrnková', role: 'majitelka kavárny', ico: '☕' },
    personas: ['tomas', 'karel'], edit: ['html', 'js'], startView: 'reader',
    brief: [
      ['klient', 'Na webu máme časté dotazy. Klikneš na otázku a rozbalí se odpověď. Šikovné, ne?'],
      ['tomas', 'Na myš ano. Tabem se na otázky nedostanu a Enter nic neudělá.'],
      ['karel', 'A když se odpověď rozbalí, nevím o tom. Čtečka mi musí říct, jestli je otázka **rozbalená**, nebo **sbalená**. Na to je atribut `aria-expanded`.'],
      ['karel', 'Jo, a za každou otázkou slyším „černý trojúhelník dolů“. To je asi ta šipka.']
    ],
    task: 'Z otázek udělej tlačítka `<button type="button" aria-expanded="false">` (třídu a data-cil nech). V JavaScriptu při kliknutí přepni `aria-expanded` na `"true"` a zpátky. Ozdobné šipce dej `aria-hidden="true"`.',
    files: {
      html: `${head('Časté dotazy – Kavárna Pod Věží')}
<body>
  <main>
    <h1>Časté dotazy</h1>
    <div class="faq">
      <div class="otazka" data-cil="o1">Máte bezlepkové dorty? <span class="sipka">▾</span></div>
      <div class="odpoved" id="o1">Ano, každý den aspoň dva. Poznáte je podle zelené cedulky.</div>

      <div class="otazka" data-cil="o2">Můžu přijít se psem? <span class="sipka">▾</span></div>
      <div class="odpoved" id="o2">Pejsci jsou vítaní. Misku s vodou dostanou hned u dveří.</div>

      <div class="otazka" data-cil="o3">Dá se u vás platit kartou? <span class="sipka">▾</span></div>
      <div class="odpoved" id="o3">Ano, kartou i mobilem. Hotovost bereme taky.</div>
    </div>
  </main>
  <script src="script.js"></script>
</body>
</html>
`,
      css: `body {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  color: #2b1d14;
  background: #f3ebe1;
}
main { max-width: 560px; margin: 0 auto; padding: 18px 24px 28px; }
h1 { margin: 6px 0 14px; font-size: 32px; }
.faq h2, .faq h3 { margin: 0; font-size: inherit; font-weight: inherit; }
.otazka {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-top: 10px;
  padding: 14px 16px;
  font: inherit;
  font-size: 19px;
  font-weight: bold;
  text-align: left;
  color: #2b1d14;
  background: #fff;
  border: 2px solid #c9ad8f;
  border-radius: 12px;
  cursor: pointer;
}
.sipka { transition: transform .2s; }
.otazka[aria-expanded="true"] .sipka { transform: rotate(180deg); }
.odpoved {
  display: none;
  margin: 0 4px;
  padding: 10px 14px;
  background: #fffaf3;
  border-left: 4px solid #a0522d;
}
.odpoved.otevrena { display: block; }
`,
      js: `document.querySelectorAll('.otazka').forEach((otazka) => {
  otazka.addEventListener('click', () => {
    const odpoved = document.getElementById(otazka.dataset.cil);
    odpoved.classList.toggle('otevrena');
  });
});
`
    },
    fix: {
      html: Q.map(([id, q]) => [`<div class="otazka" data-cil="${id}">${q} <span class="sipka">▾</span></div>`, `<h2><button type="button" class="otazka" data-cil="${id}" aria-expanded="false" aria-controls="${id}">${q} <span class="sipka" aria-hidden="true">▾</span></button></h2>`]),
      js: [["    odpoved.classList.toggle('otevrena');", "    const otevreno = odpoved.classList.toggle('otevrena');\n    otazka.setAttribute('aria-expanded', String(otevreno));"]]
    },
    scenario(c, S) {
      const n = c.normal;
      const qs = n.$$('.otazka');
      S.count = qs.length;
      if (!qs.length) return;
      const q = qs[0];
      const ans = () => n.doc.getElementById(q.dataset.cil || 'o1') || n.$('#o1');
      const snap = () => ({ exp: q.getAttribute('aria-expanded'), hidden: ans() ? n.isHidden(ans()) : null });
      S.init = snap();
      n.press(q, 'Enter');
      S.open = snap();
      n.press(q, 'Enter');
      S.closed = snap();
    },
    checks: [
      {
        id: 'tab', who: 'tomas', text: 'Tabem se dostanu na každou otázku',
        run(ctx) {
          const qs = ctx.$$('.otazka');
          if (qs.length < 3) return H.f('Některé otázky zmizely.', 'Nech všem otázkám třídu otazka.');
          const bad = qs.filter(q => !ctx.focusable(q));
          if (!bad.length) return true;
          return H.f(`Tabem přeskočím ${bad.length === qs.length ? 'všechny otázky' : H.q(H.textOf(bad[0]))}. Jako by tam nebyly.`, 'Udělej z otázek <button type="button" class="otazka" …>.');
        }
      },
      {
        id: 'enter', who: 'tomas', text: 'Enterem odpověď rozbalím',
        run(ctx) {
          const S = ctx.S;
          if (!S.count) return H.f('Otázky jsem nenašel.', 'Nech otázkám třídu otazka.');
          if (S.open.hidden === false) return true;
          return H.f('Zmáčkl jsem Enter na otázce a odpověď se neukázala.', '<button> reaguje na Enter sám a spustí obsluhu kliknutí. <div> by potřeboval vlastní obsluhu klávesnice.');
        }
      },
      {
        id: 'role', who: 'karel', text: 'Otázka je tlačítko',
        run(ctx) {
          const bad = ctx.$$('.otazka').find(q => ctx.role(q) !== 'button');
          if (!bad) return true;
          return H.f(`${H.q(ctx.name(bad) || H.textOf(bad))} je pro mě obyčejný text. Že se dá rozbalit, nepoznám.`, 'Otázka má být <button type="button">.');
        }
      },
      {
        id: 'stav', who: 'karel', text: 'Slyším, jestli je otázka rozbalená',
        run(ctx) {
          const S = ctx.S;
          if (!S.count) return H.f('Otázky jsem nenašel.', 'Nech otázkám třídu otazka.');
          if (S.init.exp !== 'false') return H.f('U otázky neslyším, jestli je rozbalená, nebo sbalená.', 'Dej tlačítku na začátku aria-expanded="false".');
          if (S.open.exp !== 'true') return H.f('Otázku jsem rozbalil, ale čtečka pořád hlásí „sbaleno“.', "Při kliknutí přepni stav: otazka.setAttribute('aria-expanded', 'true').");
          if (S.closed.exp !== 'false') return H.f('Otázku jsem zase zavřel, ale čtečka hlásí „rozbaleno“.', "Při sbalení nastav aria-expanded zpátky na 'false'. Pomůže hodnota, kterou vrací classList.toggle().");
          return true;
        }
      },
      {
        id: 'sipka', who: 'karel', text: 'V otázce neslyším „trojúhelník“',
        run(ctx) {
          const bad = ctx.$$('.otazka').find(q => /▾/.test(ctx.name(q)));
          if (!bad) return true;
          return H.f('Za otázkou slyším „černý trojúhelník dolů“. To je ozdoba, ne slovo.', 'Šipce dej <span class="sipka" aria-hidden="true">▾</span>.');
        }
      },
      {
        id: 'zavreno', who: 'karel', text: 'Zavřené odpovědi mě neruší',
        run(ctx) {
          const S = ctx.S;
          if (!S.count) return true;
          if (S.init.hidden && S.closed.hidden !== false) return true;
          return H.f('Čtečka mi čte i odpovědi, které jsou zavřené.', 'Zavřená odpověď musí být skrytá: display: none nebo atribut hidden.');
        }
      }
    ],
    bonus: {
      text: 'Otázky jsou v nadpisech, takže na ně Karel skočí klávesou H.',
      check: ctx => { const qs = ctx.$$('.otazka'); return qs.length === 3 && qs.every(q => !!q.closest('h2, h3, h4, [role="heading"]')); }
    },
    hints: [
      'Celý řádek otázky přepiš na `<button type="button" class="otazka" data-cil="o1" aria-expanded="false">…</button>`.',
      "V JavaScriptu si ulož výsledek přepnutí: `const otevreno = odpoved.classList.toggle('otevrena');` a pak `otazka.setAttribute('aria-expanded', String(otevreno));`.",
      'Šipka: `<span class="sipka" aria-hidden="true">▾</span>`. Pro bonus obal tlačítko do nadpisu: `<h2><button …>…</button></h2>`.'
    ],
    learn: ['Rozbalovací prvek je **tlačítko** se stavem **`aria-expanded`**. Čtečka pak řekne „tlačítko, sbaleno“ a po stisku „rozbaleno“. Ozdobné znaky skryj přes `aria-hidden="true"`.', '<h2>\n  <button type="button" aria-expanded="false" aria-controls="o1">\n    Máte bezlepkové dorty?\n  </button>\n</h2>\n\nconst otevreno = odpoved.classList.toggle(\'otevrena\');\notazka.setAttribute(\'aria-expanded\', String(otevreno));', 'html'],
    reward: 'Paní Zrnková: „Karel přišel na bezlepkový dort i se psem. Obojí vyčetl z webu.“',
    palette: [{ f: 'html', s: '<button type="button" class="otazka" data-cil="|" aria-expanded="false">' }, { f: 'html', s: ' aria-hidden="true"' }, { f: 'js', s: "otazka.setAttribute('aria-expanded', |);" }],
    wrong: [
      { label: 'stav se nemění', base: 'solution', fix: { js: [["    const otevreno = odpoved.classList.toggle('otevrena');\n    otazka.setAttribute('aria-expanded', String(otevreno));", "    odpoved.classList.toggle('otevrena');"]] }, expect: { fail: ['stav'] } },
      { label: 'šipka nahlas', base: 'solution', fix: { html: [['Máte bezlepkové dorty? <span class="sipka" aria-hidden="true">', 'Máte bezlepkové dorty? <span class="sipka">']] }, expect: { fail: ['sipka'] } },
      { label: 'div s rolí tlačítka', base: 'starter', fix: { html: Q.map(([id]) => [`<div class="otazka" data-cil="${id}">`, `<div class="otazka" data-cil="${id}" role="button" tabindex="0" aria-expanded="false">`]) }, expect: { fail: ['enter', 'stav', 'sipka'] } }
    ]
  });

  /* ---------------- 11. Cestovní kancelář Vlnka ---------------- */
  const MOVE_NAMES = { akce: 'cedulka s akcí', vlna: 'vlny', vlny: 'vlny', slide: 'prezentace' };
  W.LEVELS.push({
    id: 11, chapter: 3, title: 'Cestovní kancelář Vlnka', concept: 'prefers-reduced-motion',
    client: { name: 'Tereza Plachtová', role: 'majitelka cestovky', ico: '🌊' },
    personas: ['eliska'], edit: ['html', 'css', 'js'], startView: 'motion',
    brief: [
      ['klient', 'Nový web je plný pohybu: vlny, poskakující cedulka s akcí a obrázky, které se samy střídají. Prodává to!'],
      ['eliska', 'Mám poruchu rovnováhy. Když se mi na obrazovce pořád něco hýbe, točí se mi hlava a je mi zle. Na vašem webu vydržím tak deset vteřin.'],
      ['eliska', 'V systému mám zapnuté **Omezit pohyb**. Web se to dozví přes `prefers-reduced-motion`, v CSS i v JavaScriptu. Stačí to poslechnout.'],
      ['klient', 'Ostatním zákazníkům ale animace nechte, ano?']
    ],
    task: 'V CSS vypni animace uvnitř `@media (prefers-reduced-motion: reduce) { … }`. V JavaScriptu zjisti stejné nastavení přes `matchMedia` a v takovém případě prezentaci nespouštěj. Ostatním návštěvníkům pohyb nech.',
    files: {
      html: `${head('Cestovní kancelář Vlnka')}
<body>
  <header class="hero">
    <h1>Cestovní kancelář Vlnka</h1>
    <p>Moře, hory i města. Vyrazte s námi.</p>
    <span class="akce">Akce −20 %</span>
    <div class="vlny" aria-hidden="true"><i class="vlna"></i><i class="vlna druha"></i></div>
  </header>
  <main>
    <h2>Tipy na zájezdy</h2>
    <section class="prezentace" aria-label="Tipy na zájezdy">
      <div class="slide aktivni"><img src="chorvatsko.svg" alt="Pláž s průzračným mořem"><p>Chorvatsko od 8 990 Kč</p></div>
      <div class="slide"><img src="alpy.svg" alt="Zasněžené vrcholky Alp"><p>Alpy od 6 490 Kč</p></div>
      <div class="slide"><img src="rim.svg" alt="Římský amfiteátr s oblouky"><p>Řím od 5 990 Kč</p></div>
    </section>
  </main>
  <script src="script.js"></script>
</body>
</html>
`,
      css: `body {
  margin: 0;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  color: #0d2a3a;
  background: #f2fbff;
}
.hero {
  position: relative;
  overflow: hidden;
  padding: 24px 30px 66px;
  color: #fff;
  background: #0b6aa0;
}
.hero h1 { margin: 0; font-size: 34px; }
.hero p { margin: 6px 0 0; font-size: 18px; }
.akce {
  position: absolute;
  top: 22px;
  right: 26px;
  padding: 8px 14px;
  font-weight: 800;
  color: #3a2a00;
  background: #ffd23f;
  border-radius: 99px;
  animation: poskok 0.9s ease-in-out infinite;
}
.vlny { position: absolute; left: 0; right: 0; bottom: 0; height: 50px; }
.vlna {
  position: absolute;
  bottom: -2px;
  left: -60px;
  width: calc(100% + 120px);
  height: 40px;
  background: radial-gradient(circle at 30px -14px, transparent 30px, #f2fbff 31px) 0 0 / 60px 40px repeat-x;
  animation: plout 4s linear infinite;
}
.vlna.druha { bottom: 6px; opacity: .45; animation-duration: 7s; animation-direction: reverse; }
@keyframes poskok { 50% { transform: translateY(-8px) rotate(-5deg); } }
@keyframes plout { to { transform: translateX(60px); } }
main { padding: 6px 30px 24px; }
h2 { margin: 12px 0 10px; }
.prezentace { position: relative; max-width: 520px; height: 292px; }
.slide { position: absolute; inset: 0; opacity: 0; transition: opacity .8s; }
.slide.aktivni { opacity: 1; }
.slide img { display: block; width: 100%; height: 244px; object-fit: cover; border-radius: 16px; }
.slide p { margin: 8px 0 0; font-size: 18px; font-weight: 700; }
button {
  padding: 9px 14px;
  font: inherit;
  font-weight: 700;
  color: #fff;
  background: #0b6aa0;
  border: 0;
  border-radius: 9px;
}
`,
      js: `const slidy = document.querySelectorAll('.slide');
let aktualni = 0;

function ukaz(i) {
  slidy.forEach((slide, k) => slide.classList.toggle('aktivni', k === i));
}

function dalsi() {
  aktualni = (aktualni + 1) % slidy.length;
  ukaz(aktualni);
}

setInterval(dalsi, 4000);
`
    },
    fix: {
      html: [['    </section>\n', '    </section>\n    <button type="button" id="pauza">Pozastavit prezentaci</button>\n']],
      css: [[null, `
@media (prefers-reduced-motion: reduce) {
  .akce, .vlna { animation: none; }
  .slide { transition: none; }
}
`]],
      js: [['setInterval(dalsi, 4000);\n', `const omezitPohyb = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let casovac = null;
if (!omezitPohyb) {
  casovac = setInterval(dalsi, 4000);
}

document.querySelector('#pauza').addEventListener('click', () => {
  clearInterval(casovac);
});
`]]
    },
    checks: [
      {
        id: 'pohyb', who: 'eliska', mode: 'motion', text: 'S omezeným pohybem se nic nehoupe',
        run(ctx) {
          const m = ctx.moving();
          if (!m.length) return true;
          const names = [...new Set(m.map(x => MOVE_NAMES[(typeof x.el.className === 'string' ? x.el.className : '').split(/\s+/)[0]] || x.name))];
          return H.f(`Pořád se mi hýbe ${names.join(' a ')}. Točí se mi z toho hlava.`, 'Přidej do CSS @media (prefers-reduced-motion: reduce) { .akce, .vlna { animation: none; } }.');
        }
      },
      {
        id: 'prezentace', who: 'eliska', mode: 'motion', text: 'Obrázky se samy nepřepínají',
        run(ctx) {
          if (!ctx.timers(1000).length) return true;
          return H.f('Obrázky se mi pořád samy přepínají. Nestihnu je ani dočíst.', "V JavaScriptu zjisti nastavení: window.matchMedia('(prefers-reduced-motion: reduce)').matches. Když je true, setInterval nespouštěj.");
        }
      },
      {
        id: 'ostatni', who: 'klient', text: 'Ostatním návštěvníkům pohyb zůstal',
        run(ctx) {
          const anim = ctx.moving().length;
          const timer = ctx.timers(1000).length;
          if (anim && timer) return true;
          return H.f(!anim ? 'Vlny a cedulka se nehýbou nikomu. To jsem nechtěla!' : 'Prezentace se nepřepíná nikomu. To jsem nechtěla!', !anim ? 'Animace vypni jen uvnitř @media (prefers-reduced-motion: reduce), ne všem.' : 'setInterval spusť, když matchMedia vrátí false.');
        }
      }
    ],
    bonus: {
      text: 'Tlačítko „Pozastavit prezentaci“ zastaví střídání obrázků i všem ostatním.',
      check(ctx) {
        const b = ctx.$$('button').find(x => H.has(ctx.name(x), 'pozastav', 'zastav', 'pauz', 'stop'));
        if (!b || !ctx.timers(1000).length) return false;
        ctx.press(b, 'Enter');
        return !ctx.timers(1000).length;
      }
    },
    hints: [
      'Na konec CSS přidej `@media (prefers-reduced-motion: reduce) { .akce, .vlna { animation: none; } }`. Pohled **Pohyb** ukáže, co se ještě hýbe.',
      "V JavaScriptu nahraď poslední řádek: `const omezitPohyb = window.matchMedia('(prefers-reduced-motion: reduce)').matches;` a `setInterval` zavolej jen `if (!omezitPohyb)`.",
      'Bonus: přidej do HTML `<button type="button" id="pauza">Pozastavit prezentaci</button>`. Výsledek `setInterval` si ulož do proměnné a po kliknutí zavolej `clearInterval(…)`.'
    ],
    learn: ['Část lidí z pohybu na obrazovce bolí hlava nebo se jim dělá zle. V systému si zapnou **Omezit pohyb** a web to pozná přes **`prefers-reduced-motion`**: v CSS přes `@media`, v JavaScriptu přes `matchMedia`. Pohyb, který trvá déle než 5 sekund, má jít zastavit všem.', "@media (prefers-reduced-motion: reduce) {\n  .akce { animation: none; }\n}\n\nconst omezit = matchMedia('(prefers-reduced-motion: reduce)').matches;\nif (!omezit) setInterval(dalsi, 4000);", 'css'],
    reward: 'Paní Plachtová: „Eliška si koupila zájezd do Alp. A dočetla ho až do konce!“',
    palette: [{ f: 'css', s: '@media (prefers-reduced-motion: reduce) {\n  |\n}' }, { f: 'css', s: 'animation: none;' }, { f: 'js', s: "window.matchMedia('(prefers-reduced-motion: reduce)').matches" }, { f: 'js', s: 'clearInterval(|);' }, { f: 'html', s: '<button type="button" id="pauza">Pozastavit prezentaci</button>' }],
    assets: { 'chorvatsko.svg': ASSETS['chorvatsko.svg'], 'alpy.svg': ASSETS['alpy.svg'], 'rim.svg': ASSETS['rim.svg'] },
    wrong: [
      { label: 'jen CSS', base: 'starter', fix: { css: [[null, '\n@media (prefers-reduced-motion: reduce) {\n  .akce, .vlna { animation: none; }\n}\n']] }, expect: { fail: ['prezentace'] } },
      { label: 'pohyb pryč všem', base: 'starter', fix: { css: [['  animation: poskok 0.9s ease-in-out infinite;\n', ''], ['  animation: plout 4s linear infinite;\n', '']], js: [['setInterval(dalsi, 4000);\n', '']] }, expect: { fail: ['ostatni'] } },
      { label: 'bez pauzy', base: 'solution', fix: { html: [['    <button type="button" id="pauza">Pozastavit prezentaci</button>\n', '']], js: [["\ndocument.querySelector('#pauza').addEventListener('click', () => {\n  clearInterval(casovac);\n});\n", '']] }, expect: { pass: true, bonus: false } }
    ]
  });

  /* ---------------- 12. Finále: Kolo pro všechny ---------------- */
  W.LEVELS.push({
    id: 12, chapter: 3, title: 'Finále: Kolo pro všechny', concept: 'všechno dohromady',
    client: { name: 'Vojta Šlapka', role: 'majitel e-shopu s koly', ico: '🚲' },
    personas: ['karel', 'tomas', 'jana', 'eliska'], edit: ['html', 'css', 'js'], startView: 'page',
    brief: [
      ['klient', 'Prodáváme kola pro každého, i tříkolky pro dospělé a tandemy. Jen náš e-shop asi pro každého není. Projdete ho se všemi testery?'],
      ['karel', 'Fotka kola nemá popis, pole s počtem kusů nemá popisek a po přidání do košíku nic neslyším.'],
      ['tomas', '„Do košíku“ je `<div>` a fokus není vidět nikde.'],
      ['jana', 'Cenu nepřečtu, je bledá. A cedulku se slevou taky špatně.'],
      ['eliska', 'A ta blikající sleva… prosím ne.']
    ],
    task: 'Oprav všechno, co ses naučil(a): **alt**, **label**, skutečné **tlačítko**, **živou oblast**, viditelný **fokus**, **kontrast** a omezení **pohybu**. Testují všichni čtyři.',
    files: {
      html: `${head('Městské kolo Vítr – Kolo pro všechny')}
<body>
  <main class="produkt">
    <img src="kolo.svg" class="foto">
    <div class="info">
      <span class="sleva">Sleva −15 %</span>
      <h1>Městské kolo Vítr</h1>
      <p class="cena">12 490 Kč</p>
      <p>Lehký hliníkový rám, 7 převodů a světla na dynamo.</p>
      <div class="barvy">
        <input type="radio" name="barva" value="modra" style="--c: #1f5fbf" checked>
        <input type="radio" name="barva" value="zelena" style="--c: #2e8b57">
        <input type="radio" name="barva" value="cervena" style="--c: #c0392b">
      </div>
      <div class="radek">
        <input id="kusy" type="number" min="1" max="5" value="1">
        <div class="do-kosiku">Do košíku</div>
      </div>
      <p id="kosik"></p>
    </div>
  </main>
  <script src="script.js"></script>
</body>
</html>
`,
      css: `* { outline: none; }
body {
  margin: 0;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  color: #1c2430;
  background: #f6f7f9;
}
.produkt { display: flex; flex-wrap: wrap; gap: 26px; padding: 24px; }
.foto { width: 330px; max-width: 100%; border-radius: 18px; }
.info { flex: 1; min-width: 260px; }
.sleva {
  display: inline-block;
  padding: 6px 12px;
  font-weight: 800;
  color: #fff;
  background: #e63946;
  border-radius: 99px;
  animation: blik 0.8s steps(2) infinite;
}
@keyframes blik { 50% { opacity: .35; } }
h1 { margin: 10px 0 4px; font-size: 32px; }
.cena { margin: 0 0 10px; font-size: 26px; font-weight: 800; color: #9ab3c9; }
.barvy { display: flex; gap: 12px; margin: 14px 0; }
.barvy input {
  appearance: none;
  width: 30px;
  height: 30px;
  margin: 0;
  background: var(--c);
  border: 3px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 2px #b8c2cc;
  cursor: pointer;
}
.barvy input:checked { box-shadow: 0 0 0 3px #1c2430; }
.radek { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.radek label { font-weight: 700; }
#kusy { width: 64px; padding: 8px; font-size: 18px; border: 2px solid #8795a3; border-radius: 10px; }
.do-kosiku {
  padding: 12px 20px;
  font-family: inherit;
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  background: #1f5fbf;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
}
#kosik { font-weight: 700; color: #1d6b3a; }
`,
      js: `document.querySelector('.do-kosiku').addEventListener('click', () => {
  const kusy = Number(document.querySelector('#kusy').value);
  document.querySelector('#kosik').textContent = \`V košíku: \${kusy} × Městské kolo Vítr\`;
});
`
    },
    fix: {
      html: [
        ['<img src="kolo.svg" class="foto">', '<img src="kolo.svg" class="foto" alt="Modré městské kolo s košíkem na řídítkách">'],
        ['style="--c: #1f5fbf" checked>', 'style="--c: #1f5fbf" aria-label="Modrá" checked>'],
        ['style="--c: #2e8b57">', 'style="--c: #2e8b57" aria-label="Zelená">'],
        ['style="--c: #c0392b">', 'style="--c: #c0392b" aria-label="Červená">'],
        ['<input id="kusy" type="number" min="1" max="5" value="1">', '<label for="kusy">Počet kusů</label>\n        <input id="kusy" type="number" min="1" max="5" value="1">'],
        ['<div class="do-kosiku">Do košíku</div>', '<button type="button" class="do-kosiku">Do košíku</button>'],
        ['<p id="kosik"></p>', '<p id="kosik" role="status"></p>']
      ],
      css: [
        ['  background: #e63946;', '  background: #c1121f;'],
        ['font-weight: 800; color: #9ab3c9; }', 'font-weight: 800; color: #4d6378; }'],
        [null, `
:focus-visible {
  outline: 3px solid #1c2430;
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .sleva { animation: none; }
}
`]
      ]
    },
    scenario(c, S) {
      const n = c.normal;
      const b = n.$('.do-kosiku');
      S.found = !!b;
      if (!b) return;
      n.press(b, 'Enter');
      S.kosik = H.textOf(n.$('#kosik'));
    },
    checks: [
      {
        id: 'foto', who: 'karel', text: 'Vím, jaké kolo prodáváte',
        run(ctx) {
          const i = H.img(ctx, 'kolo.svg');
          if (!i) return H.f('Fotku kola jsem nenašel.', 'Nesmaž obrázek kolo.svg.');
          const alt = i.getAttribute('alt');
          if (alt && H.has(alt, 'kol') && !/\.svg/i.test(alt)) return true;
          return H.f(alt === null ? 'Hned na začátku slyším „obrázek bez popisu, kolo.svg“.' : `Fotka je pro mě ${H.q(alt || 'nic')}.`, 'Popiš kolo v altu, třeba alt="Modré městské kolo s košíkem".');
        }
      },
      {
        id: 'kusy', who: 'karel', text: 'Vím, co napsat do pole s číslem',
        run(ctx) {
          const k = ctx.$('#kusy');
          if (!k) return H.f('Pole s počtem kusů zmizelo.', 'Nesmaž pole #kusy.');
          if (H.has(ctx.name(k), 'poc', 'kus', 'mnozstv')) return true;
          return H.f('Slyším „editační pole, obsahuje 1“. Jedna čeho?', 'Přidej popisek: <label for="kusy">Počet kusů</label>.');
        }
      },
      {
        id: 'kosik', who: 'tomas', text: 'Do košíku se dostanu Tabem a Enterem',
        run(ctx) {
          const b = ctx.$('.do-kosiku');
          if (!b) return H.f('Tlačítko Do košíku jsem nenašel.', 'Nech tlačítku třídu do-kosiku.');
          if (!ctx.focusable(b)) return H.f('Tabem přeskočím „Do košíku“. Kolo si nekoupím.', 'Udělej z něj <button type="button" class="do-kosiku">.');
          if (!H.has(ctx.S.kosik, 'v kosiku')) return H.f('Zmáčkl jsem Enter na „Do košíku“ a nic se nestalo.', '<button> spustí obsluhu kliknutí i Enterem.');
          return true;
        }
      },
      {
        id: 'oznameni', who: 'karel', text: 'Uslyším, že je kolo v košíku',
        run(ctx) {
          const b = ctx.$('.do-kosiku');
          if (b && ctx.role(b) !== 'button') return H.f('„Do košíku“ je pro mě obyčejný text.', 'Tlačítko má být <button>.');
          const k = ctx.$('#kosik');
          if (k && ctx.inLive(k)) return true;
          return H.f('Přidal jsem kolo do košíku? Nic jsem neslyšel.', 'Zprávu #kosik dej do živé oblasti: role="status".');
        }
      },
      {
        id: 'fokus', who: 'tomas', mode: 'focus', text: 'Na každém prvku vidím fokus',
        run(ctx) {
          for (const el of ctx.tab()) {
            const fi = ctx.focusIndicator(el);
            const nm = ctx.name(el) || el.tagName.toLowerCase();
            if (!fi.ok) return H.f(`Na ${H.q(nm)} nevidím, kde jsem.`, 'Přidej viditelný fokus: :focus-visible { outline: 3px solid …; }.');
            if (fi.ratio < 3) return H.f(`Rámeček na ${H.q(nm)} skoro splývá (${H.ratio(fi.ratio)}).`, 'Rámeček potřebuje kontrast aspoň 3 : 1 vůči pozadí.');
          }
          return true;
        }
      },
      {
        id: 'kontrast', who: 'jana', text: 'Přečtu cenu i cedulku se slevou',
        run(ctx) {
          const bad = ctx.textElements().map(el => ({ el, c: ctx.contrast(el) })).filter(x => !x.c.ok);
          if (!bad.length) return true;
          const { el, c } = bad[0];
          return H.f(`${H.q(H.textOf(el).slice(0, 40))} nepřečtu (${H.ratio(c.ratio)}).`, `Text ${c.fg} na ${c.bg} potřebuje aspoň ${c.need === 3 ? '3' : '4,5'} : 1. Zkus ${A11y.suggest(c.fg, c.bg, c.need)}.${bad.length > 1 ? ` Podobně je na tom ještě ${bad.length - 1} další text.` : ''}`);
        }
      },
      {
        id: 'pohyb', who: 'eliska', mode: 'motion', text: 'S omezeným pohybem nic nebliká',
        run(ctx) {
          if (!ctx.moving().length) return true;
          return H.f('Sleva mi pořád bliká před očima.', 'Přidej @media (prefers-reduced-motion: reduce) { .sleva { animation: none; } }.');
        }
      }
    ],
    bonus: {
      text: 'Barevné kroužky mají jména, takže barvu pozná i Karel.',
      check: ctx => { const r = ctx.$$('input[name="barva"]'); const words = ['modr', 'zelen', 'cerven']; return r.length === 3 && r.every((x, i) => H.has(ctx.name(x), words[i])); }
    },
    hints: [
      'Postupuj tester po testerovi. Pohledy nad stránkou (Čtečka, Klávesnice, Kontrast, Pohyb) ukážou, co komu vadí.',
      'HTML: alt k fotce, `<label for="kusy">Počet kusů</label>`, `<button type="button" class="do-kosiku">` a `role="status"` u `#kosik`.',
      'CSS: `:focus-visible { outline: 3px solid #1c2430; outline-offset: 3px; }`, tmavší cena (`#4d6378`), tmavší červená slevy (`#c1121f`) a `@media (prefers-reduced-motion: reduce)` pro blikání.'
    ],
    learn: ['Přístupnost není jedna oprava, ale návyk: **popis** pro obrázky, **popisek** pro pole, **tlačítko** pro akce, **živá oblast** pro změny, **fokus** a **kontrast** pro oči a **klid** pro ty, kterým pohyb vadí.', '<img src="kolo.svg" alt="Modré městské kolo">\n<label for="kusy">Počet kusů</label>\n<button type="button">Do košíku</button>\n<p id="kosik" role="status"></p>', 'html'],
    reward: 'Pan Šlapka: „Tandem si koupili Karel s Tomášem. Jana řídí, Eliška jede vedle na tříkolce.“',
    palette: [{ f: 'html', s: ' alt="|"' }, { f: 'html', s: '<label for="kusy">Počet kusů</label>' }, { f: 'html', s: '<button type="button" class="do-kosiku">|</button>' }, { f: 'html', s: ' role="status"' }, { f: 'html', s: ' aria-label="|"' }, { f: 'css', s: ':focus-visible {\n  outline: 3px solid #|;\n  outline-offset: 3px;\n}' }, { f: 'css', s: '@media (prefers-reduced-motion: reduce) {\n  |\n}' }],
    assets: { 'kolo.svg': ASSETS['kolo.svg'] },
    wrong: [
      { label: 'bez živé oblasti', base: 'solution', fix: { html: [['<p id="kosik" role="status"></p>', '<p id="kosik"></p>']] }, expect: { fail: ['oznameni'] } },
      { label: 'bledá cena', base: 'solution', fix: { css: [['font-weight: 800; color: #4d6378; }', 'font-weight: 800; color: #9ab3c9; }']] }, expect: { fail: ['kontrast'] } },
      { label: 'bliká dál', base: 'solution', fix: { css: [['@media (prefers-reduced-motion: reduce) {\n  .sleva { animation: none; }\n}\n', '']] }, expect: { fail: ['pohyb'] } },
      { label: 'kroužky bez jmen', base: 'solution', fix: { html: [[' aria-label="Modrá"', '']] }, expect: { pass: true, bonus: false } }
    ]
  });

  /* ---------------- jak získat bonus: vysvětlení a ukázka (ukazuje se po dokončení zakázky) ---------------- */
  const BONUS_HOW = {
    1: { how: 'Čtečka sama oznámí, že jde o obrázek. Když alt začíná slovem „obrázek“ nebo „foto“, Karel uslyší „obrázek, obrázek chleba“. Do altu proto piš rovnou, co na obrázku je.', example: '<img src="chleba.svg" alt="Kváskový chléb">', lang: 'html' },
    2: { how: 'Nadpisy tvoří osnovu stránky jako v knize: `h1` je název, `h2` kapitoly a `h3` podkapitoly. Názvy akcí patří pod sekci Akce, takže jsou o úroveň níž: `h3`.', example: '<h2 class="sekce">Akce v prosinci</h2>\n<h3 class="akce-nazev">Večer s detektivkou</h3>', lang: 'html' },
    3: { how: '`<fieldset>` seskupí pole, která k sobě patří, a `<legend>` dá skupině nadpis. Čtečka ho přečte u každého pole ve skupině, takže Karel ví, k jakému termínu volba patří.', example: '<fieldset class="termin">\n  <legend>Termín kurzu</legend>\n  …\n</fieldset>', lang: 'html' },
    4: { how: 'Odkaz má říct, kam vede a co se stane. Když stahuje soubor, napiš to přímo do textu odkazu, třeba „(PDF)“. Karel pak ví, že se neotevře stránka, ale soubor.', example: '<a href="prihlaska.pdf">Přihláška na výlet (PDF)</a>', lang: 'html' },
    5: { how: 'Úroveň AA chce kontrast aspoň 4,5 : 1, nejvyšší úroveň AAA aspoň 7 : 1. Pohled Kontrast ukáže poměr u každého textu a navrhne barvu: u popisů filmů vyber tmavší nebo světlejší odstín, dokud poměr nebude aspoň 7.', example: '.popis {\n  color: #4a4a4a; /* 8,9 : 1 na bílé */\n}', lang: 'css' },
    6: { how: '`:focus` ukáže rámeček i po kliknutí myší, což někoho ruší. `:focus-visible` ho prohlížeč ukáže jen tehdy, když se ovládá klávesnicí. Tomáš rámeček vidí a ostatní ne.', example: ':focus-visible {\n  outline: 3px solid #1d2b1f;\n  outline-offset: 3px;\n}', lang: 'css' },
    7: { how: 'Když skript změní text na stránce, Karel o tom neví. Prvek s `role="status"` je živá oblast: čtečka změnu přečte sama, jakmile se v ní objeví nový text.', example: '<p id="zprava" role="status"></p>', lang: 'html' },
    12: { how: 'Barevné kolečko čtečka nepřečte, Karel slyší jen „přepínač“. Atribut `aria-label` dá každé volbě jméno, takže barvu pozná i bez zraku.', example: '<input type="radio" name="barva" aria-label="Modrá" checked>', lang: 'html' }
  };
  W.LEVELS.forEach(l => Object.assign(l.bonus, BONUS_HOW[l.id] || {}));
})(window.WBB);
