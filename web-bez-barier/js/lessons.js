/*
 * Web bez bariér – lekce ke každé zakázce
 * Výklad + živý příklad: HTML se vykreslí a pod náhledem je vidět, co z něj přečte čtečka obrazovky.
 * Příklady jsou z jiných webů než zakázky, ať lekce neprozradí řešení.
 */
(function (global) {
  'use strict';

  const SVG = s => 'data:image/svg+xml,' + encodeURIComponent(s);
  const RAJCE = SVG("<svg xmlns='http://www.w3.org/2000/svg' width='70' height='70'><circle cx='35' cy='40' r='27' fill='#e63946'/><path d='M24 13h22l-11 11z' fill='#2a9d8f'/></svg>");
  const VLNKA = SVG("<svg xmlns='http://www.w3.org/2000/svg' width='160' height='16'><path d='M0 8 Q20 0 40 8 T80 8 T120 8 T160 8' stroke='#90be6d' stroke-width='3' fill='none'/></svg>");
  const OKURKA = SVG("<svg xmlns='http://www.w3.org/2000/svg' width='90' height='40'><ellipse cx='45' cy='20' rx='42' ry='14' fill='#6a994e'/></svg>");
  const KOLO = SVG("<svg xmlns='http://www.w3.org/2000/svg' width='120' height='70'><circle cx='28' cy='45' r='20' stroke='#c1121f' stroke-width='5' fill='none'/><circle cx='92' cy='45' r='20' stroke='#c1121f' stroke-width='5' fill='none'/><path d='M28 45 L52 18 L80 18 L92 45 M52 18 L62 45 L28 45' stroke='#333' stroke-width='4' fill='none'/></svg>");

  const L = {
    1: {
      title: 'Popis obrázku: atribut `alt`',
      text: [
        'Nevidomý člověk obrázek nevidí. Čtečka obrazovky mu místo něj přečte text z atributu **alt**. Obrázek s informací dostane krátký výstižný popis. **Ozdobný** obrázek dostane prázdné `alt=""` a čtečka ho přeskočí.',
        'Slovo „obrázek“ do altu nepiš, čtečka ho řekne sama. Pod náhledem vidíš, co přesně čtečka přečte.'
      ],
      example: `<h1>Zahrádka paní Květy</h1>
<img src="rajce.svg" alt="Zralé červené rajče">
<img src="vlnka.svg" alt="">
<p>Letos se zelenině daří.</p>
<img src="okurka.svg">`,
      try: 'Okurka nemá `alt`. Doplň jí `alt="Zelená okurka"` a sleduj, jak se změní, co čtečka přečte.',
      pitfall: 'Popis jako „okurka.svg“ nebo „foto123“ nic neřekne. Popiš, co obrázek **sděluje**, ne jak se jmenuje soubor.',
      fact: 'Na sociálních sítích můžeš ke každé fotce doplnit alternativní text. Kdo to neudělá, tomu nevidomí „uvidí“ jen slovo obrázek.'
    },
    2: {
      title: 'Osnova stránky: nadpisy a `lang`',
      text: [
        'Nadpisy tvoří **osnovu** stránky. Čtečka je umí vyjmenovat a uživatel mezi nimi skáče jako v obsahu knihy. Úroveň volíš podle struktury: jeden `h1` pro celou stránku, `h2` pro sekce, `h3` pro podsekce. Velikost písma patří do CSS.',
        'Atribut `lang` u `<html>` řekne čtečce, jakým jazykem má mluvit. S `lang="en"` by český text četla anglickým hlasem.'
      ],
      example: `<html lang="cs">
<body>
  <h1>Školní výlet</h1>
  <h2>Kam jedeme</h2>
  <p>Na hrad Karlštejn.</p>
  <h2>Co si vzít</h2>
  <h3>Jídlo</h3>
  <p>Svačinu a pití.</p>
  <div class="velky">Tohle jen vypadá jako nadpis</div>

  <style>
    .velky { font-size: 24px; font-weight: bold; }
  </style>
</body>
</html>`,
      try: 'Z posledního řádku udělej skutečný `<h2 class="velky">` a sleduj, co uslyší čtečka. Vzhled zůstane díky třídě stejný.',
      pitfall: 'Neskákej v úrovních: po `h1` má přijít `h2`, ne rovnou `h4`. A úroveň nevybírej podle velikosti písma.',
      fact: 'Průzkumy mezi uživateli čteček ukazují, že informace na stránce hledají nejčastěji právě skákáním po nadpisech.'
    },
    3: {
      title: 'Popisek pole: `<label>`',
      text: [
        '`<label for="id">` spojí text s polem. Čtečka ho přečte jako **jméno pole** a kliknutím na text se pole vybere, což ocení každý s nepřesnou rukou.',
        '`placeholder` (šedá nápověda v poli) popisek nenahradí: při psaní zmizí a čtečky ho nečtou spolehlivě. Povinné pole označ atributem `required`.'
      ],
      example: `<form>
  <label for="jmeno">Jméno *</label>
  <input id="jmeno" required>

  <input placeholder="Telefon">

  <label><input type="checkbox"> Chci dostávat novinky</label>
</form>

<style>
  form { display: grid; gap: 8px; max-width: 260px; }
</style>`,
      try: 'Telefon má jen placeholder. Přidej mu `<label for="tel">Telefon</label>`, poli dej `id="tel"` a porovnej výpis čtečky.',
      pitfall: '`for` musí odpovídat `id` pole přesně. Jinak čtečka ohlásí „editační pole bez popisku“.',
      fact: 'Kliknutí na popisek zaškrtne i malé zaškrtávací políčko. Velký cíl pro kliknutí pomůže všem, nejen lidem s třesem rukou.'
    },
    4: {
      title: 'Odkaz, který řekne, kam vede',
      text: [
        'Uživatelé čteček si často nechají vypsat **seznam odkazů**, bez okolního textu. Odkaz „zde“ pak nic neříká. Text odkazu musí sám říct, kam vede.',
        'Odkaz jen s ikonou nemá žádný text. Jméno mu dáš atributem `aria-label`.'
      ],
      example: `<p>Nový jídelníček najdete <a href="#jidelnicek">zde</a>.</p>
<p><a href="#rozvrh">Rozvrh hodin pro 8. A</a></p>
<a href="#hledat">
  <svg width="24" height="24" viewBox="0 0 24 24">
    <circle cx="10" cy="10" r="6" stroke="#333" stroke-width="2" fill="none"/>
    <path d="M15 15l6 6" stroke="#333" stroke-width="2"/>
  </svg>
</a>`,
      try: 'Přepiš „zde“ na „Jídelníček na tento týden“ a lupě přidej `aria-label="Hledat"`. Pak porovnej výpis čtečky.',
      pitfall: 'Tři odkazy „více“ vedle sebe zní v seznamu odkazů úplně stejně. Každý odkaz potřebuje vlastní jasný text.',
      fact: '„Klikněte zde“ patří k nejčastějším chybám přístupnosti. Nepomáhá ani vyhledávačům.'
    },
    5: {
      title: 'Kontrast textu',
      text: [
        '**Kontrast** je poměr jasu textu a pozadí: od 1 : 1 (stejné barvy) po 21 : 1 (černá na bílé). Pravidla WCAG AA chtějí pro běžný text aspoň **4,5 : 1** a pro velký text aspoň **3 : 1**.',
        'Barvu značky si nech, jen jí najdi vhodnou dvojici: na světle oranžovém tlačítku tmavý text, ne bílý.'
      ],
      example: `<p class="slaby">Světle šedý text na bílé: 2,6 : 1</p>
<p class="dobry">Tmavě šedý text na bílé: 7,5 : 1</p>
<button class="spatne">Koupit (2,1 : 1)</button>
<button class="dobre">Koupit (8,2 : 1)</button>

<style>
  .slaby { color: #a0a0a0; }
  .dobry { color: #555555; }
  button { background: #ff9a3c; border: 0; padding: 10px 18px; font-size: 16px; border-radius: 8px; }
  .spatne { color: #ffffff; }
  .dobre { color: #2a1600; }
</style>`,
      try: 'Změň `.slaby` na `#767676`. To je nejsvětlejší šedá, která na bílé ještě projde (4,54 : 1).',
      pitfall: 'Bílý text na světlé barvě značky (oranžová, žlutá, světle zelená) skoro nikdy neprojde. Pomůže tmavý text, nebo tmavší odstín značky.',
      fact: 'Dobrý kontrast nepomáhá jen slabozrakým. Ocení ho každý, kdo čte z mobilu na ostrém slunci.'
    },
    6: {
      title: 'Kde právě jsem: viditelný fokus',
      text: [
        'Kdo ovládá web klávesou **Tab**, potřebuje vidět, kde právě je. Tomu ukazateli se říká **fokus**. Nikdy ho neschovávej bez náhrady (`outline: none`).',
        '`:focus-visible` se ukáže při ovládání klávesnicí, ne po kliknutí myší. Rámeček musí mít kontrast aspoň **3 : 1** vůči okolí: na světlém pozadí tmavý, na tmavém světlý.'
      ],
      example: `<a href="#a">První odkaz</a>
<button>Tlačítko</button>
<div class="tmave">
  <a href="#b">Odkaz na tmavém pozadí</a>
</div>

<style>
  body { display: grid; gap: 12px; justify-items: start; }
  .tmave { background: #1d3557; padding: 12px; }
  .tmave a { color: #ffffff; }
  :focus-visible { outline: 3px solid #1d3557; outline-offset: 3px; }
  .tmave a:focus-visible { outline-color: #ffd447; }
</style>`,
      try: 'Klikni do náhledu a mačkej Tab. Pak smaž řádek s `outline-color` a sleduj, jak se rámeček na tmavém pozadí ztratí.',
      pitfall: 'Pravidlo `*:focus { outline: none; }` je pro uživatele klávesnice jako zhasnout světlo. Rámeček klidně uprav, ale nemaž ho.',
      fact: 'Klávesnici místo myši používají lidé s třesem rukou nebo po úrazu, ale i programátoři, kterým je to prostě rychlejší.'
    },
    7: {
      title: 'Skutečné tlačítko: `<button>`',
      text: [
        '`<button>` umí to, co `<div>` neumí: je v pořadí **Tabu**, spustí se **Enterem** i **mezerníkem** a čtečka ho ohlásí jako tlačítko. `<div>` s obsluhou kliknutí funguje jen pro myš.',
        'Když tlačítko obsahuje jen znak nebo ikonu (+, −, ✕), dej mu srozumitelné jméno přes `aria-label`.'
      ],
      example: `<div class="tl">Div jako tlačítko</div>
<button class="tl" type="button">Opravdové tlačítko</button>
<button class="tl" type="button" aria-label="Zavřít okno">✕</button>
<p id="vysledek">Zatím nic.</p>

<style>
  .tl { display: inline-block; margin: 4px; padding: 8px 14px; background: #e9ecef; border: 1px solid #6c757d; border-radius: 6px; font: inherit; cursor: pointer; }
</style>

<script>
  for (const t of document.querySelectorAll('.tl')) {
    t.addEventListener('click', () => {
      document.querySelector('#vysledek').textContent = 'Stisknuto: ' + (t.getAttribute('aria-label') || t.textContent);
    });
  }
</script>`,
      try: 'Klikni do náhledu a projdi tlačítka Tabem. Na div se nedostaneš! Přepiš ho na `<button class="tl" type="button">`.',
      pitfall: '`<div tabindex="0">` se sice zaměří, ale Enter ani mezerník ho nespustí a čtečka neví, že je to tlačítko. Správně je `<button>`.',
      fact: 'Se značkou `<button>` dostaneš přístupnost zadarmo. Napodobit všechno, co umí, pomocí `<div>` a ARIA dá spoustu práce.'
    },
    8: {
      title: 'Rozcestník stránky: oblasti a „Přeskočit na obsah“',
      text: [
        '**Oblasti** `header`, `nav`, `main` a `footer` jsou rozcestník pro čtečku: uživatel skočí rovnou tam, kam potřebuje.',
        'Odkaz **Přeskočit na obsah** na úplném začátku stránky ušetří uživatelům klávesnice procházení celého menu Tabem. Může být schovaný a ukázat se, až na něj dojde fokus.'
      ],
      example: `<a class="skip" href="#obsah">Přeskočit na obsah</a>
<header>Školní web</header>
<nav>
  <a href="#">Aktuality</a>
  <a href="#">Rozvrh</a>
  <a href="#">Jídelna</a>
</nav>
<main id="obsah">
  <h1>Aktuality</h1>
  <p>Zítra odpadá tělocvik.</p>
</main>
<footer>Základní škola Na Kopci</footer>

<style>
  .skip { position: absolute; left: -999px; }
  .skip:focus { left: 8px; top: 8px; background: #ffd447; color: #1d1d1d; padding: 6px 10px; }
  nav { display: flex; gap: 10px; margin: 8px 0; }
</style>`,
      try: 'Klikni do náhledu a stiskni Tab: objeví se odkaz „Přeskočit na obsah“. Ve výpisu čtečky najdi oblasti (záhlaví, navigace, hlavní obsah).',
      pitfall: '`<main>` má být na stránce jen jeden a odkaz pro přeskočení musí mířit na jeho `id`.',
      fact: 'Odkaz „Přeskočit na obsah“ mají i weby velkých úřadů a zpravodajství. Zkus na nich hned po načtení zmáčknout Tab.'
    },
    9: {
      title: 'Hlášení změn: živé oblasti a `aria-invalid`',
      text: [
        'Čtečka nevidí, že se na stránce něco změnilo. **Živá oblast** (`role="alert"` pro chyby, `role="status"` pro potvrzení) jí řekne, ať změnu hned přečte.',
        '`aria-invalid="true"` označí chybné pole a `aria-describedby` k němu připojí vysvětlení, takže čtečka při návratu do pole přečte i chybu.'
      ],
      example: `<label for="vek">Věk</label>
<input id="vek" aria-describedby="vek-chyba">
<button type="button" id="over">Ověřit</button>
<p id="vek-chyba" role="alert"></p>
<p id="ok" role="status"></p>

<script>
  document.querySelector('#over').addEventListener('click', () => {
    const pole = document.querySelector('#vek');
    const spatne = !(Number(pole.value) > 0);
    pole.setAttribute('aria-invalid', String(spatne));
    document.querySelector('#vek-chyba').textContent = spatne ? 'Zadej věk jako kladné číslo.' : '';
    document.querySelector('#ok').textContent = spatne ? '' : 'Věk je uložený.';
  });
</script>`,
      try: 'Napiš do pole „abc“ a klikni na Ověřit. Ve výpisu čtečky uvidíš „neplatné“ i hlášku. Pak zadej 15.',
      pitfall: 'Živá oblast musí být na stránce **už předem**, klidně prázdná. Když ji vložíš až i s textem, čtečka si změny nemusí všimnout.',
      fact: 'Takhle čtečky ohlašují třeba počet věcí v košíku nebo hlášku „zpráva odeslána“.'
    },
    10: {
      title: 'Rozbalování: `aria-expanded`',
      text: [
        'Rozbalovací prvek je **tlačítko** se stavem `aria-expanded`. Čtečka řekne „tlačítko, sbaleno“ a po stisku „rozbaleno“. Stav přepínáš v JavaScriptu přes `setAttribute`.',
        'Ozdobné znaky (šipky ▸ ▾) by čtečka přečetla nahlas. Schovej je před ní přes `aria-hidden="true"`.'
      ],
      example: `<button type="button" id="otazka" aria-expanded="false">
  <span aria-hidden="true">▸</span> Kdy začínají prázdniny?
</button>
<p id="odpoved" hidden>V červenci, hned po vysvědčení.</p>

<script>
  const otazka = document.querySelector('#otazka');
  const odpoved = document.querySelector('#odpoved');
  otazka.addEventListener('click', () => {
    const otevrit = odpoved.hidden;
    odpoved.hidden = !otevrit;
    otazka.setAttribute('aria-expanded', String(otevrit));
    otazka.querySelector('span').textContent = otevrit ? '▾' : '▸';
  });
</script>`,
      try: 'Klikni na otázku a sleduj, jak se ve výpisu čtečky změní „sbaleno“ na „rozbaleno“. Pak u šipky smaž `aria-hidden`.',
      pitfall: 'Stav `aria-expanded` se sám nezmění. Když ho v JavaScriptu nepřepneš, čtečka bude pořád hlásit „sbaleno“.',
      fact: 'Stejný vzor používá skoro každé menu „hamburger“ na mobilních webech.'
    },
    11: {
      title: 'Klid pro oči: `prefers-reduced-motion`',
      text: [
        'Část lidí z pohybu na obrazovce bolí hlava nebo se jim dělá zle. V systému si zapnou **omezení pohybu** a web to pozná přes `prefers-reduced-motion`: v CSS přes `@media`, v JavaScriptu přes `matchMedia`.',
        'Pohyb, který trvá déle než 5 sekund, má jít zastavit všem, třeba tlačítkem Pauza.'
      ],
      example: `<div class="balon">🎈</div>
<p id="info"></p>

<style>
  .balon { font-size: 40px; animation: vznas 1.5s ease-in-out 3 alternate; }
  @keyframes vznas { to { transform: translateY(-20px); } }
  @media (prefers-reduced-motion: reduce) {
    .balon { animation: none; }
  }
</style>

<script>
  const omezit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelector('#info').textContent = omezit
    ? 'Máš zapnuté omezení pohybu, balónek stojí.'
    : 'Omezení pohybu nemáš, balónek se chvíli vznáší.';
</script>`,
      try: 'Zapni si v systému omezení pohybu (ve Windows Nastavení → Přístupnost → Vizuální efekty → Efekty animace) a příklad spusť znovu tlačítkem Původní.',
      pitfall: 'Omezení pohybu neznamená „nic se nemění“. Obsah se má dál přepínat, jen bez létání a blikání, třeba prostou výměnou.',
      fact: 'Přepínač omezení pohybu má Windows, macOS, iOS i Android a prohlížeče ho webům předávají přes `prefers-reduced-motion`.'
    },
    12: {
      title: 'Přístupnost jako návyk',
      text: [
        'Přístupnost není jedna oprava, ale návyk: **popis** pro obrázky, **popisek** pro pole, **tlačítko** pro akce, **živá oblast** pro změny, **fokus** a **kontrast** pro oči a **klid** pro ty, kterým pohyb vadí.',
        'Pod náhledem vidíš, co uslyší čtečka. Dobrý web dává smysl, i když ho jen posloucháš.'
      ],
      example: `<img src="kolo.svg" alt="Červené horské kolo">
<h2>Horské kolo Vrchol</h2>
<label for="kusy">Počet kusů</label>
<input id="kusy" type="number" value="1" min="1">
<button type="button" id="koupit">Do košíku</button>
<p id="kosik" role="status"></p>

<style>
  button { background: #1d4ed8; color: #ffffff; border: 0; padding: 8px 14px; border-radius: 6px; }
  :focus-visible { outline: 3px solid #b45309; outline-offset: 2px; }
</style>

<script>
  document.querySelector('#koupit').addEventListener('click', () => {
    const n = document.querySelector('#kusy').value;
    document.querySelector('#kosik').textContent = 'V košíku: ' + n + ' ks';
  });
</script>`,
      try: 'Projdi příklad Tabem a klikni na Do košíku. Ve výpisu čtečky se objeví hláška z živé oblasti. Najdeš ještě něco, co by šlo zlepšit?',
      pitfall: 'Automatické kontroly najdou jen část problémů. Nejlepší test je projít web klávesnicí a poslechnout si ho čtečkou.',
      fact: 'Přístupné weby musí mít úřady a od roku 2025 se povinnost rozšířila i na řadu e-shopů a dalších služeb.'
    }
  };

  const ASSETS = { 'rajce.svg': RAJCE, 'vlnka.svg': VLNKA, 'okurka.svg': OKURKA, 'kolo.svg': KOLO };
  Object.values(L).forEach(x => { x.kind = 'web'; x.file = 'index.html'; x.outLabel = '👀 Náhled a 🔊 co přečte čtečka'; x.assets = ASSETS; });
  global.WBB.LESSONS = L;
})(typeof window !== 'undefined' ? window : globalThis);
