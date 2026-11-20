/*
 * Async Bistro – lekce ke každé úrovni
 * Výklad + vlastní příklad v JavaScriptu, který se spustí s virtuálními minutami:
 * časová osa ukáže, co se dělo souběžně a co čekalo. Funkce cekej(minuty) je v příkladech připravená.
 * Příklady jsou z domácnosti a obchodu, ať lekce neprozradí řešení úrovně.
 */
(function (global) {
  'use strict';

  const L = {
    1: {
      title: 'Počkej na výsledek: `async` a `await`',
      text: [
        'Některé práce trvají: vaření, stahování, čekání na server. Funkce pro ně nevrací hotovou věc, ale **slib** (Promise), že výsledek přijde později.',
        '`await` počká, až se slib splní, a vrátí hotovou hodnotu. Smí se psát jen uvnitř funkce označené `async`. Bez `await` máš v ruce jen slib, ne výsledek.'
      ],
      example: `async function cajovnik() {
  await cekej(3);
  return '🍵 čaj';
}

const slib = cajovnik();
console.log('bez await:', slib instanceof Promise ? 'jen slib (Promise)' : slib);

const caj = await cajovnik();
console.log('s await:', caj);`,
      try: 'Smaž `await` před druhým `cajovnik()` a spusť příklad. Co se vypíše místo čaje?',
      pitfall: '`await` funguje jen uvnitř `async function`. Mimo ni je to chyba a prohlížeč kód vůbec nespustí.',
      fact: 'Stejně čeká web na data ze serveru: `await fetch(adresa)` stáhne data a stránka mezitím nezamrzne.'
    },
    2: {
      title: 'Krok za krokem: víc `await` po sobě',
      text: [
        'Každý `await` počká na jeden krok. Výsledek si ulož do proměnné a předej ho dalšímu kroku, tak vznikne **postup práce**.',
        '`const` vytvoří proměnnou, která se už nezmění. Kroky po sobě trvají dohromady **součet** svých časů.'
      ],
      example: `async function krok(co, minut) {
  console.log('▶ ' + co);
  await cekej(minut);
  return co + ' ✔';
}

const testo = await krok('zadělat těsto', 2);
const placka = await krok('vyválet placku', 1);
const hotovo = await krok('upéct', 4);
console.log(testo, '|', placka, '|', hotovo);`,
      try: 'Změň časy kroků a sleduj, jak se změní celková doba. Pořád je to součet.',
      pitfall: 'Když u jednoho kroku zapomeneš `await`, další krok dostane místo hotové věci jen slib a postup se pokazí.',
      fact: 'Aplikace takhle čtou data krok za krokem: přihlásit se, načíst profil, načíst zprávy.'
    },
    3: {
      title: 'Objekty a rozhodování: `if` a `switch`',
      text: [
        'Objekt nese pojmenované hodnoty: `zakaznik.jmeno`, `zakaznik.napoj`. Píše se ve složených závorkách: `{ jmeno: "Ema", napoj: "kakao" }`.',
        '`if` / `else if` / `else` vybere jednu cestu. Když se jedna hodnota porovnává s mnoha možnostmi, je přehlednější `switch` s `case` a `break`. Větev `default` chytí všechno ostatní.'
      ],
      example: `function priprav(zakaznik) {
  let akce;
  switch (zakaznik.napoj) {
    case 'kakao':
      akce = 'ohřeju mléko';
      break;
    case 'džus':
      akce = 'vymačkám pomeranč';
      break;
    default:
      akce = 'natočím vodu';
  }
  return zakaznik.jmeno + ': ' + akce;
}

console.log(priprav({ jmeno: 'Ema', napoj: 'kakao' }));
console.log(priprav({ jmeno: 'Tom', napoj: 'džus' }));
console.log(priprav({ jmeno: 'Ivo', napoj: 'čaj' }));`,
      try: 'Smaž `break` u kakaa a spusť to znovu. Program „propadne“ do další větve a akce se přepíše.',
      pitfall: 'Bez `break` pokračuje `switch` do dalšího `case`. Na `break` se zapomíná nejčastěji.',
      fact: '`switch` s `case` má většina jazyků, od C přes Javu až po JavaScript.'
    },
    4: {
      title: 'Jeden po druhém: pole a `for…of`',
      text: [
        '`for (const jmeno of fronta)` projde pole prvek po prvku. Když je v těle cyklu `await`, další prvek přijde na řadu, až když je ten předchozí **hotový**.',
        'Šablonový řetězec (text v obrácených apostrofech) vloží hodnotu přes `${…}`.'
      ],
      example: `const fronta = ['Ema', 'Tom', 'Ivo'];

for (const jmeno of fronta) {
  console.log(\`▶ obsluhuji: \${jmeno}\`);
  await cekej(2);
  console.log(\`✔ \${jmeno} má kafe\`);
}`,
      try: 'Přidej do fronty další dva hosty. O kolik minut se obsluha prodlouží?',
      pitfall: '`forEach` s `async` funkcí na sliby nečeká a spustí všechno naráz. Když potřebuješ pořadí, použij `for…of` s `await`.',
      fact: 'Fronta „jeden po druhém“ je férová, ale pomalá. Proto mají obchody víc pokladen a o tom je další úroveň.'
    },
    5: {
      title: 'Souběžně: `Promise.all`',
      text: [
        '`Promise.all([…])` počká na **víc slibů najednou**. Práce běží **souběžně**, takže celek trvá jen tak dlouho jako ta nejpomalejší, ne jako součet.',
        'Výsledky přijdou v **poli ve stejném pořadí**, v jakém byly sliby. Pole hned rozbalíš: `const [a, b] = await Promise.all([…])`.'
      ],
      example: `async function spotrebic(co, minut) {
  console.log('▶ ' + co);
  await cekej(minut);
  console.log('✔ ' + co);
  return co;
}

const [a, b] = await Promise.all([
  spotrebic('pračka', 5),
  spotrebic('myčka', 3)
]);
console.log('hotovo:', a, '+', b);`,
      try: 'Přepiš to na dva `await` po sobě, bez `Promise.all`, a porovnej celkový čas: 8 minut místo 5.',
      pitfall: '`Promise.all` dostává **pole** slibů. Když zapomeneš hranaté závorky, `Promise.all(a(), b())` nefunguje.',
      fact: 'Prohlížeč stahuje obrázky, styly a skripty stránky souběžně, proto se web načte rychleji.'
    },
    6: {
      title: 'Pro každý prvek: `map` a `Promise.all`',
      text: [
        '`pole.map(f)` vytvoří nové pole: pro každý prvek zavolá funkci `f` a uloží, co vrátí. U `async` funkce tak vznikne **pole slibů**.',
        'Na celé pole slibů počkáš přes `Promise.all`. Práce pro všechny prvky tak běží **naráz** a počkáš, až je hotové všechno.'
      ],
      example: `const cisla = [1, 2, 3];
console.log(cisla.map(n => n * 10));

async function stahni(soubor) {
  await cekej(soubor.length);
  console.log('✔ ' + soubor);
  return soubor.toUpperCase();
}

const vysledky = await Promise.all(['a.txt', 'obr.png', 'hra.js'].map(stahni));
console.log(vysledky);`,
      try: 'Přidej do pole soubor „x.js“. Kdy doběhne a změní se celkový čas? Všimni si, že soubory dobíhají v jiném pořadí, ale výsledky drží pořadí pole.',
      pitfall: 'Bez `Promise.all` by `map` jen vytvořil pole slibů a program by na ně nepočkal.',
      fact: 'Fotogalerie takhle načítá desítky náhledů najednou, ne jeden po druhém.'
    },
    7: {
      title: 'Když se něco pokazí: `try` / `catch`',
      text: [
        'Když slib skončí chybou, `await` ji vyhodí jako **výjimku** a program by spadl. `try { … } catch (chyba) { … }` chybu zachytí a program pokračuje. `chyba.message` obsahuje popis.',
        'Ve smyčce můžeš akci **zkusit znovu**, dokud se nepovede. Funkce `nahraj` v příkladu schválně dvakrát selže.'
      ],
      prelude: `let pokus = 0;
async function nahraj(soubor) {
  await cekej(1);
  pokus++;
  if (pokus < 3) throw new Error('spojení spadlo (pokus ' + pokus + ')');
  return soubor + ' je nahraná';
}`,
      example: `while (true) {
  try {
    const vysledek = await nahraj('fotka.jpg');
    console.log('✔ ' + vysledek);
    break;
  } catch (chyba) {
    console.log('✘ ' + chyba.message + ', zkusím znovu');
  }
}`,
      try: 'Zkus kód bez `try` a `catch`, jen s `await nahraj("fotka.jpg")`. Program spadne hned při prvním pokusu.',
      pitfall: 'Když v `catch` nic neuděláš, chyba zmizí beze stopy a nevíš, co se stalo. Aspoň ji vypiš.',
      fact: 'Aplikace v mobilu takhle zkouší odeslat zprávu znovu, když vypadne signál.'
    },
    8: {
      title: 'Async funkce vrací výsledek',
      text: [
        '`async` funkce může hodnotu vrátit příkazem `return`. Kdo ji zavolá s `await`, dostane hotový výsledek.',
        'Díky tomu oddělíš **přípravu** od **použití**: nejdřív všechno připravíš, třeba souběžně přes `Promise.all`, a pak výsledky použiješ všechny **ve stejnou chvíli**.'
      ],
      example: `async function nafoukni(barva, minut) {
  await cekej(minut);
  console.log('🎈 ' + barva + ' je nafouknutý');
  return barva;
}

const balonky = await Promise.all([
  nafoukni('červený', 2),
  nafoukni('modrý', 4),
  nafoukni('žlutý', 3)
]);
console.log('Překvapení! Pouštím naráz:', balonky.join(', '));`,
      try: 'Přidej čtvrtý balónek s časem 6. Kdy se pustí všechny? Až po tom nejpomalejším.',
      pitfall: 'Když v `async` funkci zapomeneš `return`, `await` vrátí `undefined`.',
      fact: 'Aplikace takhle načte data ze tří míst a teprve pak vykreslí celou obrazovku najednou, bez poskakování.'
    },
    9: {
      title: 'Kdo dřív přijde: `Promise.race` a časový limit',
      text: [
        '`Promise.race([…])` se splní výsledkem slibu, který doběhne **první**. Na ostatní už nikdo nečeká.',
        'Se slibem časovače tak uděláš **limit**: `cekej(5).then(() => "náhrada")` se splní za 5 minut. Když práce nestihne doběhnout dřív, vyhraje náhrada. `.then(f)` zavolá `f`, až se slib splní.'
      ],
      example: `async function kuryr(minut) {
  await cekej(minut);
  console.log('🚚 kurýr dorazil po ' + minut + ' min');
  return '📦 balík od kurýra';
}

const den1 = await Promise.race([
  kuryr(2),
  cekej(5).then(() => '🏪 vyzvednu si to sám')
]);
console.log('1. den:', den1);

const den2 = await Promise.race([
  kuryr(9),
  cekej(5).then(() => '🏪 vyzvednu si to sám')
]);
console.log('2. den:', den2);`,
      try: 'Změň limit z 5 na 10 minut. Kdo vyhraje druhý den teď?',
      pitfall: '`Promise.race` pomalejší slib nezastaví, jen na něj přestane čekat. Proto kurýr dorazí, i když už na něj nikdo nečeká.',
      fact: 'Aplikace takhle hlídají pomalé servery: když odpověď nepřijde do pár sekund, ukážou uloženou verzi.'
    },
    10: {
      title: 'Fronta a pracovníci: `while` a `shift()`',
      text: [
        'Fronta je pole, ze kterého bereš **zepředu**: `fronta.shift()` vrátí první prvek a z pole ho odebere. `while (fronta.length > 0)` běží, dokud ve frontě něco je.',
        'Když nad jednou frontou pustíš **dva** async pracovníky přes `Promise.all`, běží najednou nejvýš dvě práce. Tak omezíš, kolik věcí se děje souběžně.'
      ],
      example: `const fronta = ['A', 'B', 'C', 'D', 'E'];

async function pokladna(cislo) {
  while (fronta.length > 0) {
    const zakaznik = fronta.shift();
    console.log(\`pokladna \${cislo}: zákazník \${zakaznik}\`);
    await cekej(2);
  }
}

await Promise.all([pokladna(1), pokladna(2)]);
console.log('fronta je prázdná');`,
      try: 'Přidej třetí pokladnu do `Promise.all` a sleduj, o kolik se fronta zkrátí.',
      pitfall: '`shift()` bere zepředu, `pop()` zezadu. Fronta je férová jen se `shift()`: kdo přišel první, jde první na řadu.',
      fact: 'Stejně fungují pokladny v supermarketu nebo tiskárna v kanceláři s frontou dokumentů.'
    },
    11: {
      title: 'Řazení: `sort` s porovnávací funkcí',
      text: [
        '`pole.sort(porovnej)` seřadí pole. Porovnávací funkce `(a, b) => a.termin - b.termin` dá dopředu **menší** čísla. Bez ní by `sort` řadil čísla jako text.',
        '`sort` mění původní pole. Když ho chceš zachovat, seřaď kopii: `[...pole].sort(…)`.'
      ],
      example: `const cisla = [10, 9, 100, 1];
console.log([...cisla].sort());
console.log([...cisla].sort((a, b) => a - b));

const ukoly = [
  { nazev: 'úklid', termin: 5 },
  { nazev: 'úkol z matiky', termin: 1 },
  { nazev: 'nákup', termin: 3 }
];
const poradi = [...ukoly].sort((a, b) => a.termin - b.termin);
console.log(ukoly.map(u => u.nazev));

for (const u of poradi) {
  await cekej(1);
  console.log('✔ hotovo: ' + u.nazev + ' (termín ' + u.termin + ')');
}`,
      try: 'Seřaď úkoly obráceně, od nejpozdějšího termínu: `b.termin - a.termin`, a sleduj, v jakém pořadí se na časové ose dodělají.',
      pitfall: 'Bez porovnávací funkce řadí `sort` čísla jako text, takže `[10, 9, 100, 1]` skončí jako `[1, 10, 100, 9]`.',
      fact: '„Nejdřív to, co nejvíc spěchá“ je známá strategie plánování. Používá se třeba v řídicích systémech, které musí stihnout termíny.'
    },
    12: {
      title: 'Všechno dohromady',
      text: [
        'Velké asynchronní programy skládáš z malých nástrojů: `Promise.all` (souběh), `Promise.race` (limit), `try` / `catch` ve smyčce (opakování) a funkce, které vrací výsledky.',
        'Každý nástroj dělá jednu věc a dají se kombinovat. Funkce `upec` v příkladu schválně jednou selže.'
      ],
      prelude: `let pokusy = 0;
async function upec(co) {
  await cekej(2);
  pokusy++;
  if (co === 'dort' && pokusy < 3) throw new Error(co + ' se nepovedl');
  return '🍰 ' + co;
}`,
      example: `async function bezpecne(co) {
  while (true) {
    try {
      return await upec(co);
    } catch (chyba) {
      console.log('✘ ' + chyba.message + ', peču znovu');
    }
  }
}

const vyzdoba = Promise.race([
  cekej(3).then(() => '🎉 výzdoba'),
  cekej(5).then(() => '😬 výzdoba nestihla')
]);

const vse = await Promise.all([bezpecne('dort'), bezpecne('muffiny'), vyzdoba]);
console.log(vse);`,
      try: 'Přidej do `Promise.all` ještě `bezpecne("chlebíčky")`. Prodlouží se celkový čas?',
      pitfall: 'Při kombinování hlídej, aby každá smyčka jednou skončila a každý slib měl `await` nebo byl v `Promise.all`.',
      fact: 'E-shopy i hry dělají najednou desítky asynchronních věcí a skládají je přesně z těchhle kamenů.'
    }
  };

  Object.values(L).forEach(x => { x.kind = 'async'; x.file = 'priklad.js'; });
  global.BistroContent.LESSONS = L;
})(typeof window !== 'undefined' ? window : globalThis);
