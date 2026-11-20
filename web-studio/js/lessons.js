/*
 * Web Studio Tycoon – lekce ke každé zakázce
 * Výklad + živý příklad: celé HTML (i se <style> a <script>) se hned vykreslí jako stránka,
 * na kterou se dá klikat. Příklady jsou z jiného světa než zakázky, ať lekce neprozradí řešení.
 */
(function (global) {
  'use strict';

  const L = {
    1: {
      title: 'Kostra stránky: nadpisy, odstavce a seznamy',
      text: [
        'HTML popisuje **strukturu** stránky pomocí značek. `<h1>` je hlavní nadpis, `<h2>` až `<h6>` menší nadpisy, `<p>` odstavec, `<ul>` nečíslovaný seznam, `<ol>` číslovaný seznam a `<li>` jedna jeho položka.',
        'Většina značek má začátek a konec: `<p>text</p>`. Podle značek se ve stránce vyznají prohlížeče, vyhledávače i čtečky pro nevidomé.'
      ],
      example: `<h1>Moje rybičky</h1>
<p>Mám akvárium se třemi rybičkami.</p>

<h2>Jak se jmenují</h2>
<ul>
  <li>Bublina</li>
  <li>Ploutvička</li>
  <li>Kapitán</li>
</ul>

<h2>Jak je krmím</h2>
<ol>
  <li>Nasypu trochu vloček.</li>
  <li>Počkám, až je snědí.</li>
</ol>`,
      try: 'Změň `<ul>` na `<ol>` (i v uzavírací značce) a tečky se změní na čísla. Přidej další rybičku.',
      pitfall: 'Každou otevřenou značku musíš zavřít: `<li>` končí `</li>`. Neuzavřené značky prohlížeč „opraví“ po svém a stránka se může rozsypat.',
      fact: 'Čtečky pro nevidomé umí skákat z nadpisu na nadpis. Proto je důležité, aby nadpisy byly opravdu `<h1>`, `<h2>`…, ne jen velký tučný text.'
    },
    2: {
      title: 'Odkazy, kotvy a obrázky: `href`, `id`, `alt`',
      text: [
        'Atributy upřesňují značky. `href` říká, kam odkaz vede: celá adresa vede na jiný web, `#kocky` vede na prvek s `id="kocky"` na stejné stránce. `target="_blank"` otevře odkaz v nové záložce.',
        '`<img src="…" alt="…">` vloží obrázek. `src` je soubor a `alt` jeho slovní popis pro ty, kdo obrázek nevidí. `id` musí být na stránce jedinečné.'
      ],
      example: `<nav>
  <a href="#kocky">Kočky</a> |
  <a href="#psi">Psi</a>
</nav>

<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='60'%3E%3Ccircle cx='45' cy='30' r='26' fill='%23f4a261'/%3E%3C/svg%3E" alt="Oranžový míček">

<h2 id="kocky">Kočky</h2>
<p>Kočky prospí velkou část dne.</p>
<div style="height: 260px"></div>

<h2 id="psi">Psi</h2>
<p>Psi mají mnohem lepší čich než lidé.</p>`,
      try: 'Klikni v náhledu na „Psi“ a stránka sjede k nadpisu se `id="psi"`. Zkus změnit `href` na `#kocky`.',
      pitfall: '`href="#psi"` musí přesně odpovídat `id="psi"`, včetně velkých a malých písmen. A `id` se píše bez mřížky.',
      fact: 'Popisek `alt` přečte čtečka nevidomým a ukáže se i tehdy, když se obrázek nenačte.'
    },
    3: {
      title: 'Formuláře: `input`, `label` a `select`',
      text: [
        '`<form>` sbírá data. `<input>` je políčko a jeho `type` říká, co se do něj píše: `text`, `email`, `number`, `password`… `<select>` s `<option>` je výběr z možností a `<button>` formulář odešle.',
        '`<label for="vek">` propojí popisek s polem, které má `id="vek"`. Kliknutí na popisek pak aktivuje pole a čtečka pro nevidomé ví, k čemu pole je.'
      ],
      example: `<form>
  <label for="jmeno">Jméno</label>
  <input id="jmeno" name="jmeno" type="text" required>

  <label for="vek">Věk</label>
  <input id="vek" name="vek" type="number" min="6" max="99">

  <label for="sport">Oblíbený sport</label>
  <select id="sport" name="sport">
    <option>fotbal</option>
    <option>plavání</option>
    <option>šachy</option>
  </select>

  <button>Přihlásit</button>
</form>

<style>
  form { display: grid; gap: 6px; max-width: 260px; }
</style>`,
      try: 'Klikni na popisek „Věk“ a kurzor skočí do políčka. Zkus změnit typ prvního pole na `email` nebo `password`.',
      pitfall: '`for` u `<label>` musí přesně odpovídat `id` pole. Když se liší jediné písmeno, propojení nefunguje.',
      fact: 'Na mobilu ukáže `type="email"` klávesnici se zavináčem a `type="number"` klávesnici s čísly.'
    },
    4: {
      title: 'Oživení stránky: `addEventListener` a `textContent`',
      text: [
        '`document.querySelector("#id")` najde prvek na stránce. `prvek.addEventListener("click", funkce)` řekne, co se má stát po kliknutí, a `prvek.textContent = …` změní jeho text.',
        'Proměnná `let` si pamatuje **stav**, třeba kolikrát se klikalo. Na stránce se ale změní, až ho tam sám(a) zapíšeš přes `textContent`.'
      ],
      example: `<p id="zprava">Lampa je zhasnutá.</p>
<button id="vypinac">💡 Rozsvítit</button>

<script>
  const vypinac = document.querySelector('#vypinac');
  const zprava = document.querySelector('#zprava');
  let kliknuti = 0;

  vypinac.addEventListener('click', function () {
    kliknuti = kliknuti + 1;
    zprava.textContent = 'Lampa svítí! Kliknuto ' + kliknuti + '×.';
  });
</script>`,
      try: 'Klikni na tlačítko několikrát. Pak přidej druhé tlačítko, které vrátí text „Lampa je zhasnutá.“',
      pitfall: 'Když změníš jen proměnnou a nezapíšeš ji do `textContent`, stránka zůstane stejná. Proměnná a text na stránce jsou dvě různé věci.',
      fact: 'Každé tlačítko „To se mi líbí“ na sociálních sítích funguje na stejném principu: událost kliknutí a změna textu.'
    },
    5: {
      title: 'Text z políčka: `.value`, `trim()` a `if`',
      text: [
        'Co hráč napsal do `<input>`, přečteš přes `.value`. Je to vždycky **text**. `.trim()` z něj odstraní mezery na začátku a na konci.',
        'Texty se spojují operátorem `+`. `if` / `else if` / `else` rozhodne, co se ukáže, třeba když je políčko prázdné.'
      ],
      example: `<input id="zvire" placeholder="Napiš zvíře">
<button id="hlas">Jak dělá?</button>
<p id="odpoved"></p>

<script>
  document.querySelector('#hlas').addEventListener('click', function () {
    const zvire = document.querySelector('#zvire').value.trim();
    const odpoved = document.querySelector('#odpoved');
    if (zvire === '') {
      odpoved.textContent = 'Nejdřív napiš nějaké zvíře.';
    } else if (zvire === 'kočka') {
      odpoved.textContent = 'Kočka dělá mňau!';
    } else {
      odpoved.textContent = zvire + ' dělá… to nevím. 🤔';
    }
  });
</script>`,
      try: 'Přidej větev pro „pes“. Pak napiš „  kočka  “ s mezerami: díky `trim()` to pořád funguje.',
      pitfall: 'Text políčka je v `.value`. Samotné `document.querySelector("#zvire")` je políčko, ne text v něm.',
      fact: 'Hodnota z políčka je text, i když do něj napíšeš číslo. Jak s ním počítat, ukáže další zakázka.'
    },
    6: {
      title: 'Počítání: `Number()` a výpočty',
      text: [
        'Hodnota z políčka je **text**. `Number(text)` z něj udělá číslo, se kterým jde počítat. Jinak by `+` text jen spojilo: `"3" + 1` je „31“.',
        'Podmínka `if` pohlídá nesmyslné vstupy (nula, záporné číslo, prázdné pole) a `return` funkci předčasně ukončí. `Math.round()` zaokrouhlí výsledek.'
      ],
      example: `<label for="litry">Kolik litrů vody vypiješ denně?</label>
<input id="litry" type="number" step="0.5" value="1.5">
<button id="spocitej">Spočítat</button>
<p id="vysledek"></p>
<p id="pozor"></p>

<script>
  document.querySelector('#spocitej').addEventListener('click', function () {
    const text = document.querySelector('#litry').value;
    const litry = Number(text);
    const vysledek = document.querySelector('#vysledek');
    if (!(litry > 0)) {
      vysledek.textContent = 'Zadej kladné číslo.';
      return;
    }
    vysledek.textContent = 'Za rok vypiješ asi ' + Math.round(litry * 365) + ' litrů.';
    document.querySelector('#pozor').textContent = 'Bez Number() by "' + text + '" + 1 dalo ' + (text + 1);
  });
</script>`,
      try: 'Zkus zadat 0 nebo číslo smazat. Podmínka `!(litry > 0)` zachytí nulu, záporná čísla i prázdné pole.',
      pitfall: '`"3" + 1` dá „31“, ne 4. Než začneš počítat s hodnotou z políčka, převeď ji přes `Number()`.',
      fact: 'Kalkulačky v e-shopech (doprava, slevy, splátky) dělají přesně tohle: přečtou políčka, převedou je na čísla a spočítají cenu.'
    },
    7: {
      title: 'Přepínání vzhledu: `classList.toggle` a klávesy',
      text: [
        '`prvek.classList` spravuje CSS třídy prvku: `add` přidá, `remove` odebere, `toggle` přepne a `contains` zjistí, jestli tam třída je. Vzhled pak zařídí CSS.',
        'Událost `keydown` hlásí stisk klávesy. Která to byla, najdeš v `e.key`, třeba `" "` je mezerník.'
      ],
      example: `<style>
  .karta { display: inline-block; padding: 16px 20px; border: 2px solid #999; border-radius: 10px; cursor: pointer; }
  .vybrana { border-color: #e76f51; background: #ffe8d6; }
</style>

<p>Klikni na kartu, nebo zmáčkni mezerník.</p>
<div class="karta" id="karta">🍕 Pizza</div>
<p id="stav">Nevybráno</p>

<script>
  const karta = document.querySelector('#karta');
  function prepni() {
    karta.classList.toggle('vybrana');
    const vybrana = karta.classList.contains('vybrana');
    document.querySelector('#stav').textContent = vybrana ? 'Vybráno ✔' : 'Nevybráno';
  }
  karta.addEventListener('click', prepni);
  document.addEventListener('keydown', function (e) {
    if (e.key === ' ') { e.preventDefault(); prepni(); }
  });
</script>`,
      try: 'Klikni do náhledu a mačkej mezerník. Pak napiš místo `toggle` jen `add`: karta se už neodznačí.',
      pitfall: 'Třídu píšeš do `classList` **bez tečky**: `toggle("vybrana")`, ne `toggle(".vybrana")`.',
      fact: 'Tmavý režim na většině webů je jen jedna třída na `<body>` a pár pravidel v CSS.'
    },
    8: {
      title: 'Stránka z dat: pole, `for…of` a `createElement`',
      text: [
        'Pole drží seznam hodnot, tady objektů `{ predmet, cas }`. Cyklus `for…of` projde každou položku.',
        '`document.createElement("li")` vyrobí nový prvek, `textContent` ho naplní a `appendChild` vloží do stránky. Stránka tak vzniká z dat: změníš data a změní se web.'
      ],
      example: `<h3>Rozvrh</h3>
<ul id="rozvrh"></ul>

<script>
  const hodiny = [
    { predmet: 'Matematika', cas: '8:00' },
    { predmet: 'Čeština', cas: '8:55' },
    { predmet: 'Tělocvik', cas: '10:00' }
  ];
  const rozvrh = document.querySelector('#rozvrh');
  for (const h of hodiny) {
    const li = document.createElement('li');
    li.textContent = h.cas + ' – ' + h.predmet;
    rozvrh.appendChild(li);
  }
</script>`,
      try: 'Přidej do pole další hodinu, třeba `{ predmet: "Výtvarka", cas: "11:00" }`. Na stránce se objeví sama, HTML neměníš.',
      pitfall: 'Nový prvek z `createElement` na stránce není, dokud ho nevložíš přes `appendChild`.',
      fact: 'Takhle vzniká většina dnešních webů: data přijdou ze serveru a JavaScript z nich poskládá stránku.'
    },
    9: {
      title: 'Přidávání za běhu: `createElement`, `appendChild`, `trim()`',
      text: [
        'Nové prvky můžeš vytvářet i podle toho, co uživatel napíše: přečti `.value`, `.trim()` odstraň mezery, vytvoř prvek a připoj ho `appendChild` na konec.',
        'Políčko pak vyprázdníš přiřazením `pole.value = ""`. A prázdný text (i samé mezery) radši nepřidávej vůbec.'
      ],
      example: `<div id="chat"></div>
<input id="zprava" placeholder="Napiš zprávu">
<button id="poslat">Poslat</button>

<style>
  .bublina { display: inline-block; margin: 4px 0; padding: 6px 10px; border-radius: 12px; background: #dbeafe; }
</style>

<script>
  const pole = document.querySelector('#zprava');
  document.querySelector('#poslat').addEventListener('click', function () {
    const text = pole.value.trim();
    if (text === '') return;
    const radek = document.createElement('div');
    const bublina = document.createElement('span');
    bublina.className = 'bublina';
    bublina.textContent = text;
    radek.appendChild(bublina);
    document.querySelector('#chat').appendChild(radek);
    pole.value = '';
  });
</script>`,
      try: 'Pošli pár zpráv a pak zkus poslat jen mezery. Co se stane, když smažeš řádek `pole.value = "";`?',
      pitfall: '`textContent` vloží text bezpečně jako text. Kdybys použil(a) `innerHTML`, mohl by někdo do zprávy propašovat vlastní kód.',
      fact: 'Chatovací aplikace přidávají každou novou zprávu přesně takhle: vytvoří prvek a připojí ho na konec.'
    },
    10: {
      title: 'Kontrola dat: `length`, `includes()` a `else if`',
      text: [
        'Validace zkontroluje data dřív, než je odešleš. Text má `.length` (počet znaků) a `.includes("@")` zjistí, jestli obsahuje zavináč. Regulární výraz `/[0-9]/.test(text)` zjistí, jestli je v textu číslice.',
        'Řetěz `if` / `else if` / `else` zkontroluje podmínky postupně a zastaví se na **první** chybě.'
      ],
      example: `<label for="prezdivka">Přezdívka (3 až 12 znaků, bez mezer, s číslicí)</label>
<input id="prezdivka">
<button id="over">Ověřit</button>
<p id="hlaska"></p>

<script>
  document.querySelector('#over').addEventListener('click', function () {
    const p = document.querySelector('#prezdivka').value;
    let chyba = '';
    if (p.length < 3) {
      chyba = 'Přezdívka je moc krátká.';
    } else if (p.length > 12) {
      chyba = 'Přezdívka je moc dlouhá.';
    } else if (p.includes(' ')) {
      chyba = 'Přezdívka nesmí obsahovat mezeru.';
    } else if (!/[0-9]/.test(p)) {
      chyba = 'Přidej aspoň jednu číslici.';
    }
    document.querySelector('#hlaska').textContent = chyba || 'Přezdívka je v pořádku ✔';
  });
</script>`,
      try: 'Vyzkoušej „ab“, „super hráč“ a „Hrac77“. Která kontrola zachytí kterou chybu?',
      pitfall: '`else if` se zastaví na první chybě. Kdybys chtěl(a) ukázat všechny chyby najednou, potřebuješ samostatné `if`.',
      fact: 'Kontrola v prohlížeči je pro pohodlí uživatele. Server musí data zkontrolovat znovu, protože JavaScript jde snadno obejít.'
    },
    11: {
      title: 'Živé hledání: událost `input`, `toLowerCase()`, `hidden`',
      text: [
        'Událost `input` přijde při **každé změně** políčka, ideální pro hledání už během psaní. `toLowerCase()` převede text na malá písmena, takže nezáleží na velikosti, a `includes()` hledá kousek textu.',
        'Vlastnost `hidden` prvek skryje (`true`) nebo ukáže (`false`).'
      ],
      example: `<input id="hledej" placeholder="Hledej ovoce…">
<ul id="ovoce">
  <li>Jablko</li>
  <li>Banán</li>
  <li>Hruška</li>
  <li>Jahoda</li>
  <li>Ananas</li>
</ul>

<script>
  const polozky = document.querySelectorAll('#ovoce li');
  const hledej = document.querySelector('#hledej');
  hledej.addEventListener('input', function () {
    const q = hledej.value.toLowerCase();
    for (const li of polozky) {
      li.hidden = !li.textContent.toLowerCase().includes(q);
    }
  });
</script>`,
      try: 'Napiš „AN“ velkými písmeny: najde banán i ananas. Zkus místo `includes` použít `startsWith`.',
      pitfall: 'Událost `change` přijde až po opuštění políčka. Na hledání během psaní je správná událost `input`.',
      fact: 'Našeptávač ve vyhledávačích reaguje na každé napsané písmeno právě díky události `input`.'
    },
    12: {
      title: 'Data v HTML a stav aplikace: `dataset`, pole, překreslení',
      text: [
        'Data-atributy (`data-body="5"`) ukládají data přímo v HTML. V JavaScriptu jsou v `prvek.dataset.body`, vždycky jako **text**.',
        'Stav aplikace (co je ve sbírce) drž v **poli** a stránku podle něj překresluj jednou funkcí `vykresli()`. Když se stav změní, zavoláš ji znovu.'
      ],
      example: `<button class="nalepka" data-emoji="⭐" data-body="5">⭐ +5</button>
<button class="nalepka" data-emoji="🚀" data-body="10">🚀 +10</button>
<button id="smaz">Smazat</button>
<p id="sbirka"></p>
<p id="body"></p>

<script>
  let nalepky = [];

  function vykresli() {
    document.querySelector('#sbirka').textContent = nalepky.map(n => n.emoji).join(' ') || '(prázdná sbírka)';
    const soucet = nalepky.reduce((s, n) => s + n.body, 0);
    document.querySelector('#body').textContent = 'Body: ' + soucet;
  }

  for (const tl of document.querySelectorAll('.nalepka')) {
    tl.addEventListener('click', () => {
      nalepky.push({ emoji: tl.dataset.emoji, body: Number(tl.dataset.body) });
      vykresli();
    });
  }
  document.querySelector('#smaz').addEventListener('click', () => {
    nalepky = [];
    vykresli();
  });
  vykresli();
</script>`,
      try: 'Přidej třetí tlačítko s jinou nálepkou a body. JavaScript měnit nemusíš, stačí HTML s data-atributy.',
      pitfall: '`dataset` vrací vždycky **text**. Bez `Number()` by se body spojovaly jako text: „5“ + „10“ = „510“.',
      fact: 'Princip „stav v poli a jedna funkce, která podle něj překreslí stránku“ používají i velké knihovny, třeba React.'
    }
  };

  Object.values(L).forEach(x => { x.kind = 'web'; x.file = 'index.html'; });
  global.StudioContent.LESSONS = L;
})(typeof window !== 'undefined' ? window : globalThis);
