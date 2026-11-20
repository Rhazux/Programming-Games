/*
 * Autopilot Orel – obsah hry: úrovně, lety, nápovědy, kvíz
 *
 * Každá úroveň má:
 *   brief    – rádiové zprávy (marketa = vedoucí palubního softwaru, capcom = Řízení letu)
 *   io       – jak palubní počítač volá hráčovu funkci (viz sim.js)
 *   starter  – výchozí kód, solution – vzorové řešení (musí získat všechny hvězdy)
 *   rules    – pravidla letu: palivo, limit dosednutí, kontroly, porucha motoru…
 *   flights  – lety (scénáře), všechny musí skončit úspěchem
 *   unit     – testy pomocné funkce (volání → výsledek vzorového řešení)
 *   bonus    – třetí hvězda: { text, check(ctx) }
 *   wrong    – typické chybné pokusy (automatické testy ověří, že neprojdou)
 */
(function (global) {
  'use strict';

  const CHAPTERS = [
    { id: 1, title: 'Simulátor', icon: '🎛️', desc: 'return, podmínky, logické operátory' },
    { id: 2, title: 'Zkušební lety', icon: '🔥', desc: 'výpočty, vestavěné a vlastní funkce, n-tice' },
    { id: 3, title: 'Expedice Moře klidu', icon: '🌕', desc: 'seznamy, slovníky, cyklus while, finále' }
  ];

  /* ---------- pomocníci pro bonusové cíle ---------- */
  const W = global.MiniPython;
  function nodes(ast, pred) { const out = []; W.walkAst(ast, n => { if (pred(n)) out.push(n); }); return out; }
  function fnDef(ast, name) { return nodes(ast, n => n.k === 'def' && n.name === name)[0] || null; }
  function callsName(node, name) { return !!node && nodes(node.body || node, n => n.k === 'call' && n.f.k === 'name' && n.f.id === name).length > 0; }
  const all = (c, f) => c.flights.every(f);

  /* terén Moře klidu (výšky po 10 m) – v každém je jediné bezpečné místo */
  const TERRAIN = [
    [13.4, 11.3, 13.6, 15.2, 18.5, 14.9, 16.5, 19.8, 18.1, 16.1, 12.7, 10.6, 8.3, 10.6, 13.3, 16.4, 16.7, 19.1, 21.7, 18.6, 16.2, 14.5, 11.2, 7.8],
    [13.5, 16.5, 18.3, 19.8, 18.3, 20.4, 22.6, 22.4, 19.6, 17.3, 14.1, 11.2, 12.8, 16.2, 17.9, 20.5, 23.9, 21.5, 17.8, 15.3, 12.7, 11.1, 8.7, 10.6],
    [13.6, 9.9, 6.4, 8.8, 10.3, 12.2, 15.7, 18.4, 21.5, 18.1, 14.3, 11, 7.2, 4.8, 8, 10.8, 14.5, 17, 18.9, 21.3, 21.7, 17.8, 14.8, 12.5]
  ];
  /* finále: od x = −480 m po 10 m, kráter West s balvany mezi −190 a −60 m, plocha na x = 0 */
  const WEST = [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2, 1, 0, 0.7, 0.8, 1, 0.1, 0.7, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 10.6, 12.2, 13.3, 14.4, 22.3, 19, 19.1, 18.2, 17.8, 21.2, 13.9, 17.4, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.7, 0.3, 0.3, 0.1, 1.5, 0.1, 0.9, 0.5, 0.7, 0.2, 0.5, 0.6, 0.8, 0.3, 1, 0, 0, 0, 0, 0, 0, 0];

  const LEVELS = [
    /* ================= KAPITOLA 1: SIMULÁTOR ================= */
    {
      id: 1, chapter: 1, title: 'Zážeh', concept: 'return',
      brief: [
        ['marketa', 'Vítej v týmu palubního softwaru mise **Orel**! V kabině nikdo nestihne řídit motor ručně – desetkrát za sekundu o něm rozhoduje program. A ten teď píšeš ty.'],
        ['marketa', 'Palubní počítač volá tvoji funkci `autopilot`. Co funkce vrátí příkazem `return`, to je tah motoru v procentech: 0 = vypnuto, 100 = plný výkon.'],
        ['capcom', 'Orle, tady Řízení. Simulátor je připraven, start na váš povel.']
      ],
      task: 'Nastartuj motor: funkce `autopilot` musí vrátit takový tah, aby Orel do 30 sekund vystoupal do výšky **100 m**.',
      io: 'hv', fn: 'autopilot',
      starter: `def autopilot(vyska, klesani):
    # Vrať tah motoru v procentech (0 až 100).
    return 0
`,
      solution: `def autopilot(vyska, klesani):
    tah = 100
    return tah
`,
      wrong: [
        `def autopilot(vyska, klesani):
    return 30
`,
        `def autopilot(vyska, klesani):
    tah = 100
`
      ],
      rules: { goal: 'climb', target: 100, fuel: 100, timeLimit: 30 },
      flights: [{ name: 'Let 1', h: 0, v: 0 }],
      hints: [
        'Číslo za slovem `return` je tah motoru. Teď je tam 0, takže motor stojí.',
        'Na Měsíci tě táhne dolů gravitace. Aby se Orel vůbec zvedl, potřebuje tah větší než 40,5 %.',
        'Zkus `return 100`, tedy plný výkon. Pro bonus si tah nejdřív ulož do proměnné: `tah = 100` a pod to `return tah`.'
      ],
      bonus: {
        text: 'Ulož tah do proměnné a vrať ji (`tah = …` a `return tah`)',
        check: c => {
          const d = fnDef(c.ast, 'autopilot');
          return !!d && nodes(d.body, n => n.k === 'assign').length > 0 && nodes(d.body, n => n.k === 'return' && n.value && n.value.k === 'name').length > 0;
        }
      },
      learn: ['Funkce vrací výsledek příkazem return. Kdo funkci zavolal (tady palubní počítač), dostane vrácenou hodnotu a použije ji. Proměnná je pojmenovaná krabička na hodnotu.', 'def autopilot(vyska, klesani):\n    tah = 100      # proměnná tah\n    return tah     # počítač dostane 100'],
      palette: ['return 100', 'tah = 100', 'return tah', 'print(vyska)'],
      reward: 'Motor běží! Orel se poprvé odlepil od rampy.'
    },
    {
      id: 2, chapter: 1, title: 'Volný pád', concept: 'if / else',
      brief: [
        ['marketa', 'Teď opačná úloha: Orel padá k povrchu a ty ho musíš zabrzdit. Měsíc nemá atmosféru, takže žádný padák – jen motor.'],
        ['marketa', 'Funkce dostává `klesani`, tedy jak rychle Orel padá dolů (m/s). Když padá moc rychle, zapni motor, jinak ho vypni. Přesně na to je `if` a `else`.'],
        ['capcom', 'Orle, dosednutí rychlejší než 3 m/s vám polámá přistávací nohy.']
      ],
      task: 'Přistaň ve všech třech letech nejvýš **3 m/s**: když je `klesani` větší než 2, vrať 100, jinak vrať 0.',
      io: 'hv', fn: 'autopilot',
      starter: `def autopilot(vyska, klesani):
    # klesani = jak rychle Orel padá dolů (m/s)
    # Když padá rychleji než 2 m/s, vrať 100 (brzdi).
    # Jinak vrať 0 (motor vypnout).
    return 0
`,
      solution: `def autopilot(vyska, klesani):
    if klesani > 1.5:
        return 100
    else:
        return 0
`,
      wrong: [
        `def autopilot(vyska, klesani):
    if klesani > 5:
        return 100
    else:
        return 0
`,
        `def autopilot(vyska, klesani):
    if klesani < 2:
        return 100
    else:
        return 0
`
      ],
      rules: { fuel: 200, maxTouch: 3 },
      flights: [{ name: 'Let 1', h: 80, v: 8 }, { name: 'Let 2', h: 120, v: 14 }, { name: 'Let 3', h: 40, v: 2 }],
      hints: [
        'Podmínka se píše `if klesani > 2:`. Na konci řádku je dvojtečka a další řádek je odsazený o 4 mezery.',
        'Pod `else:` napiš, co se má stát, když podmínka neplatí: `return 0`.',
        'Celé řešení: `if klesani > 2:` → `return 100` → `else:` → `return 0`. Pro bonus zkus menší hranici, třeba 1.5.'
      ],
      bonus: { text: 'Dosedni pokaždé nejvýš 2 m/s', check: c => all(c, f => f.touch && f.touch.v <= 2) },
      learn: ['if vybere jednu ze dvou cest podle podmínky. Porovnává se znaky > < >= <= == !=. Za podmínkou je dvojtečka a příkazy, které k ní patří, jsou odsazené.', 'if klesani > 2:\n    return 100   # padá moc rychle → brzdi\nelse:\n    return 0     # jinak motor vypni'],
      palette: ['if klesani > 2:', 'else:', 'return 100', 'return 0'],
      reward: 'Orel stojí na povrchu. Nohy vydržely!'
    },
    {
      id: 3, chapter: 1, title: 'Tři pásma', concept: 'elif',
      brief: [
        ['marketa', 'Pomalé klesání celou cestu je bezpečné, ale spálí moc paliva. Apollo proto klesalo po pásmech: vysoko rychle, u země pomalu.'],
        ['marketa', 'Nad 100 m smíš padat až 10 m/s, mezi 30 a 100 m nejvýš 5 m/s a pod 30 m jen 2 m/s. Tři možnosti zapíšeš pomocí `if`, `elif` a `else`.'],
        ['capcom', 'Orle, radar vás zkontroluje ve výšce 100 m a 30 m. Nepřekročte rychlost.']
      ],
      task: 'Nastav limit rychlosti podle výšky (3 pásma) a brzdi, když padáš rychleji. Projdi kontrolami ve **100 m** (max 11 m/s) a ve **30 m** (max 5,5 m/s) a přistaň do 3 m/s. Paliva je jen 100 kg.',
      io: 'hv', fn: 'autopilot',
      starter: `def autopilot(vyska, klesani):
    # 1) podle výšky vyber limit rychlosti
    if vyska > 100:
        limit = 10
    else:
        limit = 2
    # 2) brzdi, když padáš rychleji než limit
    if klesani > limit:
        return 100
    return 0
`,
      solution: `def autopilot(vyska, klesani):
    if vyska > 100:
        limit = 10.5
    elif vyska > 30:
        limit = 5
    else:
        limit = 2.5
    if klesani > limit:
        return 100
    return 0
`,
      wrong: [
        `def autopilot(vyska, klesani):
    if vyska > 30:
        limit = 10
    else:
        limit = 2
    if klesani > limit:
        return 100
    return 0
`,
        `def autopilot(vyska, klesani):
    if klesani > 2:
        return 100
    return 0
`
      ],
      rules: { fuel: 100, maxTouch: 3, gates: [{ h: 100, v: 11 }, { h: 30, v: 5.5 }] },
      flights: [{ name: 'Let 1', h: 400, v: 20 }, { name: 'Let 2', h: 300, v: 8 }, { name: 'Let 3', h: 250, v: 25 }],
      hints: [
        'Výchozí kód má jen dvě pásma. Mezi `if` a `else` přidej třetí: `elif vyska > 30:`.',
        'Každé pásmo nastaví `limit`: nad 100 m 10, nad 30 m 5, jinak 2. Druhá část programu (brzdění) se nemění.',
        'Pořadí je důležité: Python zkouší podmínky odshora a použije první, která platí. Pro bonus zkus limity těsně pod kontrolami, třeba 10.5 / 5.2 / 2.5.'
      ],
      bonus: { text: 'Ušetři palivo: v každém letu zbude aspoň 22 kg', check: c => all(c, f => f.fuelLeft >= 22) },
      learn: ['elif (zkratka „else if“) přidá další podmínku. Python je zkouší postupně odshora a provede jen první větev, která platí. else chytí všechno ostatní.', 'if vyska > 100:\n    limit = 10\nelif vyska > 30:\n    limit = 5\nelse:\n    limit = 2'],
      palette: ['elif vyska > 30:', 'limit = 5', 'if vyska > 100:', 'else:'],
      reward: 'Profil sestupu jako u Apolla: rychle vysoko, pomalu dole.'
    },
    {
      id: 4, chapter: 1, title: 'Poslední kapky', concept: 'and / or',
      brief: [
        ['marketa', 'Zkušební modul má skoro prázdnou nádrž: jen 60 kg paliva. Hlídat pomalou rychlost celou cestu si nemůžeme dovolit.'],
        ['marketa', 'Trik: nech Orla padat, jen ať nepřekročí 18 m/s. Teprve nízko nad zemí zabrzdi na pomalé dosednutí. Podmínky spojíš slovy `or` (nebo) a `and` (a zároveň).'],
        ['capcom', 'Orle, palivo je kritické. Každá sekunda motoru se počítá.']
      ],
      task: 'Přistaň do 3 m/s se **60 kg** paliva. Brzdi, když padáš rychleji než 18 m/s **nebo** když jsi níž než 70 m **a zároveň** padáš rychleji než 2 m/s.',
      io: 'hv', fn: 'autopilot',
      starter: `def autopilot(vyska, klesani):
    # Brzdi, když:
    #   padáš rychleji než 18 m/s
    #   NEBO jsi níž než 70 m A ZÁROVEŇ padáš rychleji než 2 m/s
    if klesani > 2:
        return 100
    return 0
`,
      solution: `def autopilot(vyska, klesani):
    if klesani > 23 or (vyska < 110 and klesani > 2):
        return 100
    return 0
`,
      wrong: [
        `def autopilot(vyska, klesani):
    if vyska < 70 and klesani > 2:
        return 100
    return 0
`,
        `def autopilot(vyska, klesani):
    if klesani > 18 and vyska < 70:
        return 100
    return 0
`
      ],
      rules: { fuel: 60, maxTouch: 3 },
      flights: [{ name: 'Let 1', h: 300, v: 10 }, { name: 'Let 2', h: 450, v: 5 }, { name: 'Let 3', h: 220, v: 18 }],
      hints: [
        '`a or b` platí, když platí aspoň jedno z nich. `a and b` platí, jen když platí obě.',
        'Celá podmínka: `if klesani > 18 or (vyska < 70 and klesani > 2):` – závorky ukazují, co patří k sobě.',
        'Pro bonus zkus vyšší limit pádu a dřívější brzdění, třeba `klesani > 22` a `vyska < 100`. Sleduj graf rychlosti.'
      ],
      bonus: { text: 'V každém letu zbude aspoň 20 kg paliva', check: c => all(c, f => f.fuelLeft >= 20) },
      learn: ['and = obě podmínky musí platit, or = stačí jedna. Závorky určují pořadí stejně jako v matematice.', 'if klesani > 18 or (vyska < 70 and klesani > 2):\n    return 100   # brzdi\nreturn 0'],
      palette: ['klesani > 18', ' or ', ' and ', '(vyska < 70 and klesani > 2)'],
      reward: 'Přistání na poslední kapky paliva. Řízení tleská.'
    },

    /* ================= KAPITOLA 2: ZKUŠEBNÍ LETY ================= */
    {
      id: 5, chapter: 2, title: 'Plynulý plyn', concept: 'výpočty',
      brief: [
        ['marketa', 'Nový problém: motor vydrží jen **3 zapálení**. Tvoje dosavadní řízení ho za let zapne a vypne klidně stokrát!'],
        ['marketa', 'Místo zapnout/vypnout nastav tah plynule: čím rychleji padáš oproti cíli, tím víc tahu. Stačí výpočet: `tah = 40 + 15 * chyba`. 40 % zhruba udrží Orla ve vznášení.'],
        ['capcom', 'Orle, vezete křehký seismometr. Jemně, prosím.']
      ],
      task: 'Spočítej tah ze vzorce: `chyba = klesani - cil` a `tah = 40 + 15 * chyba`. Motor smí zapálit nejvýš **3×** a dosednutí musí být do **2,5 m/s**.',
      io: 'hv', fn: 'autopilot',
      starter: `def autopilot(vyska, klesani):
    cil = 2                  # chci klesat rychlostí 2 m/s
    chyba = klesani - cil    # o kolik padám rychleji, než chci
    tah = 40                 # TODO: tah = 40 + 15 * chyba
    return tah
`,
      solution: `def autopilot(vyska, klesani):
    cil = 1 + vyska / 10
    chyba = klesani - cil
    tah = 40 + 15 * chyba
    return tah
`,
      wrong: [
        `def autopilot(vyska, klesani):
    if klesani > 2:
        return 100
    return 0
`,
        `def autopilot(vyska, klesani):
    tah = 40 + 15 * klesani - 2
    return tah
`
      ],
      rules: { fuel: 150, maxTouch: 2.5, ignitions: 3 },
      flights: [{ name: 'Let 1', h: 150, v: 12 }, { name: 'Let 2', h: 250, v: 20 }, { name: 'Let 3', h: 80, v: 3 }],
      hints: [
        'Doplň řádek s tahem: `tah = 40 + 15 * chyba`. Když padáš rychleji než cíl, chyba je kladná a tah vzroste.',
        'Pozor na pořadí operací: `40 + 15 * klesani - 2` je něco jiného než `40 + 15 * (klesani - 2)`. Násobení má přednost.',
        'Pro bonus ať cíl závisí na výšce: `cil = 1 + vyska / 10`. Vysoko pak klesáš rychle, u země pomalu.'
      ],
      bonus: { text: 'Každý let do 45 s (cíl rychlosti podle výšky)', check: c => all(c, f => f.time <= 45) },
      learn: ['Výraz se počítá jako v matematice: nejdřív **, pak * / // %, nakonec + −. Závorky pořadí změní. Takové „plynulé“ řízení se jmenuje P-regulátor.', 'chyba = klesani - cil\ntah = 40 + 15 * chyba   # 15× chyba navíc k vznášení'],
      palette: ['tah = 40 + 15 * chyba', 'cil = 1 + vyska / 10', '(klesani - cil)', ' * '],
      reward: 'Jediné zapálení a plynulé brzdění. Seismometr přežil bez škrábnutí.'
    },
    {
      id: 6, chapter: 2, title: 'Meze motoru', concept: 'min, max, round',
      brief: [
        ['marketa', 'Záložní motor z testovací stolice je háklivý: tah musí být **celé číslo od 0 do 100**. Cokoli jiného ho poškodí.'],
        ['marketa', 'Python má vestavěné funkce: `min()` vybere menší číslo, `max()` větší a `round()` zaokrouhlí na celé číslo.'],
        ['capcom', 'Orle, druhý let začíná stoupáním po přerušeném přiblížení.']
      ],
      task: 'Ořízni tah do rozsahu 0–100 funkcemi `min()` a `max()` a zaokrouhli ho funkcí `round()`. Přistaň ve všech letech do 3 m/s.',
      io: 'hv', fn: 'autopilot',
      starter: `def autopilot(vyska, klesani):
    tah = 40 + 15 * (klesani - 2)
    # Motor přijímá jen CELÁ čísla od 0 do 100!
    return tah
`,
      solution: `def autopilot(vyska, klesani):
    tah = 40 + 15 * (klesani - 2)
    return round(max(0, min(100, tah)))
`,
      wrong: [
        `def autopilot(vyska, klesani):
    tah = 40 + 15 * (klesani - 2)
    return round(min(100, tah))
`,
        `def autopilot(vyska, klesani):
    tah = 40 + 15 * (klesani - 2)
    return max(0, min(100, tah))
`
      ],
      rules: { fuel: 150, maxTouch: 3, clamp: 'strict', int: true },
      flights: [{ name: 'Let 1', h: 250, v: 25 }, { name: 'Let 2', h: 120, v: -8 }, { name: 'Let 3', h: 80, v: 12 }],
      hints: [
        '`min(100, tah)` vrátí tah, ale nejvýš 100. `max(0, …)` zajistí, že výsledek nebude záporný.',
        'Funkce se dají vnořit: `max(0, min(100, tah))`. Počítá se zevnitř ven.',
        'Nakonec celé číslo: `return round(max(0, min(100, tah)))`. Pozor, ve druhém letu Orel nejdřív stoupá, tah by vyšel záporný.'
      ],
      bonus: { text: 'Žádný `if` – jen `min()`, `max()` a `round()`', check: c => { const d = fnDef(c.ast, 'autopilot'); return !!d && nodes(d.body, n => n.k === 'if' || n.k === 'ifexp').length === 0; } },
      learn: ['Vestavěné funkce jsou v Pythonu připravené: min() a max() vrací nejmenší a největší z čísel, round() zaokrouhlí na celé číslo (int), abs() vrátí absolutní hodnotu.', 'max(0, min(100, 135))   # → 100\nmax(0, min(100, -20))   # → 0\nround(47.6)             # → 48'],
      palette: ['min(100, tah)', 'max(0, |)', 'round(|)', 'return round(max(0, min(100, tah)))'],
      reward: 'Motor dostává jen čisté příkazy. Technici si oddechli.'
    },
    {
      id: 7, chapter: 2, title: 'Brzdná dráha', concept: 'vlastní funkce',
      brief: [
        ['marketa', 'Nejrychlejší přistání je volný pád a brzdění na poslední chvíli. Rakety SpaceX tomu říkají hoverslam. Musíš ale přesně vědět, kdy začít brzdit.'],
        ['marketa', 'Napiš vlastní funkci `brzdna_draha(rychlost)`: kolik metrů Orel potřebuje, aby zastavil. Vzorec je rychlost na druhou děleno (2 · 2,38). Autopilot ji už volá.'],
        ['capcom', 'Orle, retranslační družice zapadá. Na každé přistání máte jen krátké okno.']
      ],
      task: 'Definuj funkci `brzdna_draha(rychlost)`, která vrátí `rychlost ** 2 / (2 * ZPOMALENI)`. Autopilot ji používá k rozhodnutí, kdy brzdit. Přistaň v časovém okně každého letu.',
      io: 'hv', fn: 'autopilot', need: ['autopilot', 'brzdna_draha'],
      starter: `ZPOMALENI = 2.38   # m/s²: o kolik plný tah zpomalí pád

# TODO: napiš funkci brzdna_draha(rychlost)
#       vrátí: rychlost na druhou / (2 * ZPOMALENI)

def autopilot(vyska, klesani):
    if vyska <= brzdna_draha(klesani) + 2 and klesani > 1:
        return 100
    return 0
`,
      solution: `ZPOMALENI = 2.38

def brzdna_draha(rychlost):
    return rychlost ** 2 / (2 * ZPOMALENI)

def je_cas_brzdit(vyska, klesani):
    return vyska <= brzdna_draha(klesani) + 2 and klesani > 1

def autopilot(vyska, klesani):
    if je_cas_brzdit(vyska, klesani):
        return 100
    return 0
`,
      wrong: [
        `ZPOMALENI = 2.38

def brzdna_draha(rychlost):
    return rychlost ** 2 / 2 * ZPOMALENI

def autopilot(vyska, klesani):
    if vyska <= brzdna_draha(klesani) + 2 and klesani > 1:
        return 100
    return 0
`,
        `ZPOMALENI = 2.38

def brzdna_draha(rychlost):
    print(rychlost ** 2 / (2 * ZPOMALENI))

def autopilot(vyska, klesani):
    if klesani > 18 or (vyska < 70 and klesani > 2):
        return 100
    return 0
`
      ],
      unit: { tests: [{ call: 'brzdna_draha(0)', tol: 0.01 }, { call: 'brzdna_draha(10)', tol: 0.01 }, { call: 'brzdna_draha(30)', tol: 0.01 }, { call: 'brzdna_draha(2.38)', tol: 0.01 }] },
      rules: { fuel: 120, maxTouch: 3 },
      flights: [{ name: 'Let 1', h: 400, v: 15, rules: { timeLimit: 26 } }, { name: 'Let 2', h: 250, v: 30, rules: { timeLimit: 17 } }, { name: 'Let 3', h: 600, v: 0, rules: { timeLimit: 40 } }],
      hints: [
        'Funkce začíná řádkem `def brzdna_draha(rychlost):` a tělo je odsazené. Výsledek vrať příkazem `return`.',
        'Na druhou se v Pythonu píše `**`: `rychlost ** 2`. Jmenovatel dej do závorky: `/ (2 * ZPOMALENI)`.',
        'Pro bonus vytáhni podmínku do další funkce, např. `def je_cas_brzdit(vyska, klesani):` vracející True/False, a zavolej ji v autopilotu.'
      ],
      bonus: {
        text: 'Napiš ještě jednu vlastní funkci a zavolej ji z autopilota',
        check: c => {
          const defs = nodes(c.ast, n => n.k === 'def').map(d => d.name).filter(n => n !== 'autopilot' && n !== 'brzdna_draha');
          const ap = fnDef(c.ast, 'autopilot');
          return defs.some(n => callsName(ap, n));
        }
      },
      learn: ['Vlastní funkci definuješ slovem def, jménem a parametry v závorce. Uvnitř spočítáš výsledek a vrátíš ho returnem. Pak ji můžeš volat, kolikrát chceš, i z jiné funkce.', 'def brzdna_draha(rychlost):\n    return rychlost ** 2 / (2 * 2.38)\n\nbrzdna_draha(10)   # → 21.0'],
      palette: ['def brzdna_draha(rychlost):', 'return rychlost ** 2 / (2 * ZPOMALENI)', ' ** 2', 'def je_cas_brzdit(vyska, klesani):'],
      reward: 'Hoverslam jako u raket Falcon 9: pád a brzdění přesně na poslední chvíli.'
    },
    {
      id: 8, chapter: 2, title: 'Na plochu', concept: 'n-tice',
      brief: [
        ['marketa', 'Orel se k přistávací ploše blíží šikmo. Kromě hlavního motoru má boční trysky: `bok` od −100 (doleva) do 100 (doprava).'],
        ['marketa', 'Funkce teď musí vrátit **dvě** hodnoty najednou: `return tah, bok`. Python je zabalí do n-tice (tuple). Dostaneš i `x` – kolik metrů jsi od středu plochy – a boční rychlost `vx`.'],
        ['capcom', 'Orle, plocha je široká 16 m. Kolem jsou kameny.']
      ],
      task: 'Vrať dvojici `tah, bok`. Boční trysky nastav tak, aby Orel dosedl na plochu (nejvýš 8 m od středu) a s boční rychlostí nejvýš 1 m/s.',
      io: 'hvxv', fn: 'autopilot', side: true,
      starter: `def autopilot(vyska, klesani, x, vx):
    tah = 40 + 15 * (klesani - 2)
    # x  = vzdálenost od středu plochy (m), záporná = jsi vlevo
    # vx = boční rychlost (m/s), kladná = letíš doprava
    bok = 0    # boční trysky: -100 (doleva) až 100 (doprava)
    return tah
`,
      solution: `def autopilot(vyska, klesani, x, vx):
    tah = 40 + 15 * (klesani - 2)
    chci_vx = -x / 8
    bok = 60 * (chci_vx - vx)
    return tah, bok
`,
      wrong: [
        `def autopilot(vyska, klesani, x, vx):
    tah = 40 + 15 * (klesani - 2)
    bok = -x
    return tah, bok
`,
        `def autopilot(vyska, klesani, x, vx):
    tah = 40 + 15 * (klesani - 2)
    bok = 60 * (x / 8 - vx)
    return tah, bok
`
      ],
      rules: { fuel: 200, maxTouch: 3, maxSide: 1, pad: { x: 0, w: 16 } },
      flights: [{ name: 'Let 1', h: 100, v: 4, x: -60, vx: 5 }, { name: 'Let 2', h: 140, v: 8, x: 80, vx: 0 }, { name: 'Let 3', h: 80, v: 3, x: -20, vx: -4 }],
      hints: [
        'Nejdřív vrať obě hodnoty: `return tah, bok`. Bez bočních trysek ale Orel přistane vedle plochy.',
        'Stejný trik jako u výšky: spočítej, jakou boční rychlost chceš (`chci_vx = -x / 8` – čím dál od plochy, tím rychleji k ní), a trysky nastav podle rozdílu.',
        '`bok = 60 * (chci_vx - vx)`. Když letíš doprava rychleji, než chceš, vyjde bok záporný a trysky brzdí.'
      ],
      bonus: { text: 'Dosedni nejvýš 2 m od středu plochy ve všech letech', check: c => all(c, f => f.touch && Math.abs(f.touch.x) <= 2) },
      learn: ['return a, b vrátí n-tici (tuple) se dvěma hodnotami. Kdo funkci zavolá, může ji hned rozbalit: tah, bok = autopilot(…).', 'def povel():\n    return 50, -20\n\ntah, bok = povel()   # tah = 50, bok = -20'],
      palette: ['return tah, bok', 'chci_vx = -x / 8', 'bok = 60 * (chci_vx - vx)', 'abs(x)'],
      reward: 'Přesně na ploše! Řízení si zapisuje odchylku na centimetry.'
    },

    /* ================= KAPITOLA 3: EXPEDICE MOŘE KLIDU ================= */
    {
      id: 9, chapter: 3, title: 'Bezpečné místo', concept: 'seznam a for',
      brief: [
        ['capcom', 'Orle, tady Řízení. Expedice do Moře klidu začíná!'],
        ['marketa', 'Radar změřil výšku povrchu každých 10 m a uložil ji do seznamu `teren`. Nohy Orla zvládnou sklon nejvýš 1 m na 10 m.'],
        ['marketa', 'Najdi úsek, kde se dvě sousední výšky liší nejméně. Doletět a přistát už zvládne autopilot z minulé mise.']
      ],
      task: 'Napiš `vyber_misto(teren)`: projdi seznam cyklem `for` a vrať index `i` úseku, kde je `abs(teren[i + 1] - teren[i])` nejmenší. Je-li jich víc, vrať první.',
      io: 'pick', fn: 'vyber_misto', side: true,
      starter: `def vyber_misto(teren):
    # teren = výšky povrchu po 10 m, např. [13.4, 11.3, 13.6, ...]
    # úsek i vede od teren[i] do teren[i + 1]
    nejlepsi = 0
    for i in range(len(teren) - 1):
        rozdil = abs(teren[i + 1] - teren[i])
        # TODO: je-li rozdil menší než u úseku nejlepsi, ulož si i
    return nejlepsi
`,
      solution: `def vyber_misto(teren):
    nejlepsi = 0
    nejmensi = abs(teren[1] - teren[0])
    for i, (a, b) in enumerate(zip(teren, teren[1:])):
        if abs(b - a) < nejmensi:
            nejmensi = abs(b - a)
            nejlepsi = i
    return nejlepsi
`,
      wrong: [
        `def vyber_misto(teren):
    return teren.index(min(teren))
`,
        `def vyber_misto(teren):
    nejlepsi = 0
    for i in range(len(teren) - 1):
        if abs(teren[i + 1] - teren[i]) <= abs(teren[nejlepsi + 1] - teren[nejlepsi]):
            nejlepsi = i
    return nejlepsi
`
      ],
      unit: { tests: [{ call: 'vyber_misto([5, 3, 3.2, 8])' }, { call: 'vyber_misto([0, 4])' }, { call: 'vyber_misto([2, 6, 1, 1, 7, 7])' }, { call: 'vyber_misto([-3, -3.5, 2, 9, 9.1])' }] },
      rules: { fuel: 300, maxTouch: 3, maxSide: 1, slopeMax: 1 },
      flights: TERRAIN.map((T, i) => ({ name: 'Let ' + (i + 1), terrain: T, x0: 0, h: Math.max.apply(null, T) + 60, v: 2, x: -40, vx: 0, cruise: 35 })),
      hints: [
        'V cyklu porovnej `rozdil` s rozdílem dosud nejlepšího úseku: `abs(teren[nejlepsi + 1] - teren[nejlepsi])`.',
        'Když je nový rozdíl menší (`<`, ne `<=`, ať zůstane první z rovných), ulož si `nejlepsi = i`.',
        'Pro bonus: `zip(teren, teren[1:])` dá dvojice sousedních výšek a `enumerate()` k nim přidá index: `for i, (a, b) in enumerate(zip(teren, teren[1:])):`'
      ],
      bonus: {
        text: 'Bez `range(len(…))` – použij `enumerate()` nebo `zip()`',
        check: c => { const d = fnDef(c.ast, 'vyber_misto'); return !!d && (callsName(d, 'enumerate') || callsName(d, 'zip')) && !callsName(d, 'range'); }
      },
      learn: ['Seznam je řada hodnot v hranatých závorkách. Index začíná nulou, teren[-1] je poslední prvek. Cyklus for projde prvky nebo indexy (range(len(seznam))).', 'teren = [13.4, 11.3, 13.6]\nfor i in range(len(teren) - 1):\n    print(i, teren[i + 1] - teren[i])'],
      palette: ['if rozdil < abs(teren[nejlepsi + 1] - teren[nejlepsi]):', 'nejlepsi = i', 'enumerate(teren)', 'zip(teren, teren[1:])'],
      reward: 'Radar potvrzuje: pod Orlem je rovina. Bezpečné místo nalezeno.'
    },
    {
      id: 10, chapter: 3, title: 'Slepý radar', concept: 'slovník',
      brief: [
        ['capcom', 'Orle, máme poruchu! Dopplerův radar rychlosti nefunguje.'],
        ['marketa', 'Data teď přicházejí ve slovníku `data`: `data[\'vyska\']`, `data[\'cas\']`, `data[\'palivo\']`. Rychlost v něm chybí, musíš ji spočítat z rozdílu výšek.'],
        ['marketa', 'Minulou výšku si zapamatuj ve slovníku `pamet`. Palubní počítač ti ho při každém volání podá znovu, i s tím, co sis do něj uložil(a).']
      ],
      task: 'Spočítej rychlost klesání: `(minula_vyska - vyska) / 0.1` (funkce se volá každých 0,1 s). Minulou výšku si ukládej do `pamet[\'vyska\']`. Vrať slovník `{\'tah\': …}` a přistaň do 3 m/s.',
      io: 'data', fn: 'autopilot', dataKeys: ['vyska', 'cas', 'palivo'],
      starter: `def autopilot(data, pamet):
    vyska = data['vyska']
    # Radar rychlosti nefunguje: data['klesani'] neexistuje!
    # Minulou výšku si pamatuj ve slovníku pamet.
    klesani = 0          # TODO: spočítej z minulé výšky
    if klesani > 2:
        tah = 100
    else:
        tah = 0
    return {'tah': tah}
`,
      solution: `def autopilot(data, pamet):
    vyska = data['vyska']
    minula = pamet.get('vyska', vyska)
    klesani = (minula - vyska) / 0.1
    pamet['vyska'] = vyska
    if klesani > 2:
        tah = 100
    else:
        tah = 0
    return {'tah': tah, 'klesani': klesani}
`,
      wrong: [
        `def autopilot(data, pamet):
    vyska = data['vyska']
    klesani = (pamet['vyska'] - vyska) / 0.1
    pamet['vyska'] = vyska
    if klesani > 2:
        return {'tah': 100}
    return {'tah': 0}
`,
        `def autopilot(data, pamet):
    vyska = data['vyska']
    klesani = pamet.get('vyska', vyska) - vyska
    pamet['vyska'] = vyska
    if klesani > 2:
        return {'tah': 100}
    return {'tah': 0}
`
      ],
      rules: { fuel: 200, maxTouch: 3, estimate: true },
      flights: [{ name: 'Let 1', h: 150, v: 10 }, { name: 'Let 2', h: 250, v: 15 }, { name: 'Let 3', h: 100, v: 2 }],
      hints: [
        'Při prvním volání je `pamet` prázdný. `pamet.get(\'vyska\', vyska)` vrátí uloženou výšku, a když tam ještě není, vrátí aktuální.',
        'Rychlost = změna výšky za čas: `klesani = (minula - vyska) / 0.1`. Na konci si ulož aktuální výšku: `pamet[\'vyska\'] = vyska`.',
        'Pro bonus přidej do vráceného slovníku i svůj odhad: `return {\'tah\': tah, \'klesani\': klesani}`. Řízení ho porovná se skutečnou rychlostí.'
      ],
      bonus: { text: "Vrať i odhad rychlosti: `{'tah': …, 'klesani': …}` (přesně na 0,2 m/s)", check: c => all(c, f => f.maxEstErr <= 0.2) },
      learn: ['Slovník (dict) páruje klíče s hodnotami: data[\'vyska\']. Neexistující klíč vyvolá KeyError, proto .get(klic, vychozi) nebo test \'klic\' in slovnik. Do slovníku zapíšeš slovnik[klic] = hodnota.', "pamet = {}\nminula = pamet.get('vyska', 120)   # → 120\npamet['vyska'] = 118\n'vyska' in pamet                   # → True"],
      palette: ["pamet.get('vyska', vyska)", "pamet['vyska'] = vyska", '(minula - vyska) / 0.1', "{'tah': tah, 'klesani': klesani}"],
      reward: 'Bez radaru, jen s výškoměrem a pamětí. Přesně tak to dělal počítač Apolla.'
    },
    {
      id: 11, chapter: 3, title: 'Seismická sonda', concept: 'cyklus while',
      brief: [
        ['marketa', 'Před přistáním má Orel shodit seismickou sondu přesně do kráteru, kde ji chtějí vědci. Orel letí nad povrchem a sonda po uvolnění padá stále rychleji.'],
        ['marketa', 'Kdy ji pustit? Spočítáš to simulací: cyklus `while` po krocích 0,1 s, dokud sonda nedopadne. Funkci `uvolnit()` volá počítač desetkrát za sekundu.'],
        ['capcom', 'Orle, jedna sonda, jeden pokus. Hodně štěstí.']
      ],
      task: 'Oprav `doba_padu(vyska, klesani)`: cyklem `while` simuluj pád a vrať čas v sekundách. V `uvolnit()` vrať `True` ve chvíli, kdy sonda dopadne do cíle: `x + vx * doba_padu(vyska, klesani) >= 0`.',
      io: 'drop', fn: 'uvolnit', need: ['uvolnit', 'doba_padu'], side: true,
      starter: `def doba_padu(vyska, klesani):
    # Simuluj pád po krocích 0,1 s, dokud sonda nedopadne.
    t = 0
    while vyska > 0:
        klesani = klesani + 1.62 * 0.1
        t = t + 0.1
        # TODO: posuň i výšku, jinak cyklus nikdy neskončí!
    return t

def uvolnit(x, vyska, vx, klesani):
    # x = vzdálenost od cíle (m), záporná = cíl je ještě před tebou
    # Vrať True ve chvíli, kdy máš sondu pustit.
    return x > 0
`,
      solution: `def doba_padu(vyska, klesani):
    t = 0
    while vyska > 0:
        klesani = klesani + 1.62 * 0.1
        vyska = vyska - klesani * 0.1
        t = t + 0.1
    return t

def uvolnit(x, vyska, vx, klesani):
    return x + vx * doba_padu(vyska, klesani) >= 0
`,
      wrong: [
        `def doba_padu(vyska, klesani):
    return (2 * vyska / 1.62) ** 0.5

def uvolnit(x, vyska, vx, klesani):
    return x + vx * doba_padu(vyska, klesani) >= 0
`,
        `def doba_padu(vyska, klesani):
    t = 0
    while vyska > 0:
        klesani = klesani + 1.62 * 0.1
        vyska = vyska - klesani * 0.1
        t = t + 0.1
    return t

def uvolnit(x, vyska, vx, klesani):
    return x >= 0
`
      ],
      unit: { tests: [{ call: 'doba_padu(100, 0)', tol: 0.15 }, { call: 'doba_padu(20, 5)', tol: 0.15 }, { call: 'doba_padu(50, -4)', tol: 0.15 }, { call: 'doba_padu(0, 3)', tol: 0.15 }] },
      rules: { goal: 'drop', fuel: 300, hitTol: 4, timeLimit: 120 },
      flights: [
        { name: 'Let 1', h: 100, v: 0, x: -260, vx: 12, target: 0, floor: 25 },
        { name: 'Let 2', h: 140, v: 3, x: -300, vx: 10, target: 0, floor: 40 },
        { name: 'Let 3', h: 60, v: -3, x: -200, vx: 15, target: 0, floor: 25 }
      ],
      hints: [
        'V cyklu se mění `klesani` i `t`, ale `vyska` ne – podmínka `vyska > 0` tak platí pořád. Přidej `vyska = vyska - klesani * 0.1`.',
        'Sonda letí dopředu stejnou rychlostí jako Orel. Za dobu pádu urazí `vx * doba_padu(vyska, klesani)` metrů.',
        'Pusť ji, když by dopadla do cíle nebo za něj: `return x + vx * doba_padu(vyska, klesani) >= 0`.'
      ],
      bonus: { text: 'Zásah nejvýš 1,5 m od cíle ve všech letech', check: c => all(c, f => f.probe && f.probe.hit !== undefined && Math.abs(f.probe.hit) <= 1.5) },
      learn: ['while opakuje blok, dokud podmínka platí. Uvnitř se musí měnit něco, na čem podmínka závisí, jinak cyklus nikdy neskončí (a palubní počítač vyhlásí alarm 1202).', 't = 0\nwhile vyska > 0:\n    klesani = klesani + 1.62 * 0.1\n    vyska = vyska - klesani * 0.1\n    t = t + 0.1'],
      palette: ['vyska = vyska - klesani * 0.1', 'doba_padu(vyska, klesani)', 'return x + vx * doba_padu(vyska, klesani) >= 0', 'while vyska > 0:'],
      reward: 'Zásah! Seismograf v Houstonu zachytil dopad sondy.'
    },
    {
      id: 12, chapter: 3, title: 'Orel přistál', concept: 'vše dohromady',
      brief: [
        ['capcom', 'Orle, tady Řízení. Máte GO pro přistání.'],
        ['marketa', 'Teď naostro. Před plochou leží kráter West plný balvanů vysokých až 22 m. Neil Armstrong ho v roce 1969 přeletěl ručně, když automatika mířila přímo do něj.'],
        ['marketa', 'Data přicházejí ve slovníku. Dokud jsi nad kráterem, drž se aspoň 50 m vysoko a k ploše leť rozumnou rychlostí. Teprve nad plochou klesej. Vrať `{\'tah\': …, \'bok\': …}`.']
      ],
      task: 'Přeleť kráter a přistaň na ploše: nejvýš **7 m** od středu, dosednutí do **2,5 m/s** a boční rychlost do 1 m/s.',
      io: 'data', fn: 'autopilot', side: true, dataKeys: ['vyska', 'klesani', 'x', 'vx', 'palivo', 'cas'],
      starter: `def autopilot(data, pamet):
    x = data['x']              # vzdálenost od plochy (m)
    vx = data['vx']
    vyska = data['vyska']
    klesani = data['klesani']

    # 1) Boční let k ploše (jako v úrovni 8)
    chci_vx = -x / 8
    bok = 50 * (chci_vx - vx)

    # 2) Výška: nad kráterem (x < -40) drž aspoň 50 m, nad plochou klesej
    cil = 1 + vyska / 10

    tah = 40 + 15 * (klesani - cil)
    return {'tah': tah, 'bok': bok}
`,
      solution: `def autopilot(data, pamet):
    x = data['x']
    vx = data['vx']
    vyska = data['vyska']
    klesani = data['klesani']
    chci_vx = max(-15, min(15, -x / 8))
    bok = 50 * (chci_vx - vx)
    if x < -60:
        cil = min(15, (vyska - 50) / 5)
    else:
        cil = 1 + vyska / 10
    tah = 40 + 15 * (klesani - cil)
    return {'tah': tah, 'bok': bok}
`,
      wrong: [
        `def autopilot(data, pamet):
    x = data['x']
    vx = data['vx']
    vyska = data['vyska']
    klesani = data['klesani']
    chci_vx = -x / 8
    bok = 50 * (chci_vx - vx)
    cil = 1 + vyska / 10
    tah = 40 + 15 * (klesani - cil)
    return {'tah': tah, 'bok': bok}
`,
        `def autopilot(data, pamet):
    x = data['x']
    vx = data['vx']
    vyska = data['vyska']
    klesani = data['klesani']
    chci_vx = max(-12, min(12, -x / 6))
    bok = 50 * (chci_vx - vx)
    if x < -40:
        cil = (vyska - 20) / 5
    else:
        cil = 1 + vyska / 10
    tah = 40 + 15 * (klesani - cil)
    return {'tah': tah, 'bok': bok}
`
      ],
      rules: { fuel: 150, maxTouch: 2.5, maxSide: 1, pad: { x: 0, w: 14 }, timeLimit: 150 },
      flights: [
        { name: 'Let 1', h: 300, v: 8, x: -380, vx: 16, terrain: WEST, x0: -480 },
        { name: 'Let 2', h: 220, v: 4, x: -320, vx: 10, terrain: WEST, x0: -480 },
        { name: 'Let 3', h: 420, v: 12, x: -460, vx: 20, terrain: WEST, x0: -480 }
      ],
      hints: [
        'Rozděl let na dvě fáze podle `x`: `if x < -40:` (ještě nad kráterem) a `else:` (nad plochou).',
        'Nad kráterem ať je cílová rychlost klesání `(vyska - 50) / 5`: nad 50 m klesáš, pod 50 m stoupáš. Omez ji třeba `min(15, …)`.',
        'Boční rychlost omez, ať Orel nepřiletí moc rychle: `chci_vx = max(-12, min(12, -x / 6))`. Pak už jen jemně dosednout.'
      ],
      bonus: { text: 'V každém letu zbude aspoň 70 kg paliva', check: c => all(c, f => f.fuelLeft >= 70) },
      learn: ['Velký program skládáš z malých částí: data ze slovníku, výpočty, podmínky pro fáze letu, min/max pro meze a vrácený slovník s povely. Přesně tak vznikal software, který v roce 1969 dovezl lidi na Měsíc.', "if x < -40:\n    cil = (vyska - 50) / 5    # nad kráterem drž výšku\nelse:\n    cil = 1 + vyska / 10      # nad plochou klesej\nreturn {'tah': tah, 'bok': bok}"],
      palette: ['if x < -40:', 'cil = min(15, (vyska - 50) / 5)', 'max(-12, min(12, -x / 6))', 'else:'],
      reward: 'Tady základna Klid. Orel přistál!'
    }
  ];

  /* ---------- vstupní / výstupní test (varianty A a B) ---------- */
  const CONCEPTS = {
    return: 'Návratová hodnota (return)',
    cond: 'Podmínky if / elif / else',
    logic: 'Logické operátory and / or',
    arith: 'Výpočty a pořadí operací',
    builtin: 'Vestavěné funkce min, max, round',
    def: 'Vlastní funkce s parametry',
    tuple: 'Více návratových hodnot (n-tice)',
    list: 'Seznamy, indexy a cyklus for',
    dict: 'Slovníky (klíč → hodnota)',
    while: 'Cyklus while'
  };

  const QUIZ = {
    A: [
      { c: 'return', q: 'Jakou hodnotu bude mít x?', code: 'def tah(v):\n    return v * 2\n    return 100\n\nx = tah(30)', a: ['60', '100', '30', 'None'], ok: 0 },
      { c: 'cond', q: 'Co program vypíše?', code: 'klesani = 4\nif klesani > 5:\n    print("brzdi")\nelif klesani > 3:\n    print("pozor")\nelse:\n    print("klid")', a: ['pozor', 'brzdi', 'klid', 'pozor a pak klid'], ok: 0 },
      { c: 'logic', q: 'Platí vyska = 50 a klesani = 1. Která podmínka je splněná (True)?', a: ['vyska < 60 or klesani > 2', 'vyska < 60 and klesani > 2', 'vyska > 60 or klesani > 2', 'not vyska < 60'], ok: 0, codeAnswers: true },
      { c: 'arith', q: 'Kolik vyjde?', code: '40 + 15 * (3 - 1)', a: ['70', '110', '80', '58'], ok: 0 },
      { c: 'builtin', q: 'Co vrátí tento výraz?', code: 'max(0, min(100, 135))', a: ['100', '135', '0', '35'], ok: 0 },
      { c: 'def', q: 'Co se vypíše?', code: 'def brzdna_draha(v):\n    return v ** 2 / 10\n\nprint(brzdna_draha(10))', a: ['10.0', '100', '2.0', '20'], ok: 0 },
      { c: 'tuple', q: 'Jakou hodnotu bude mít bok?', code: 'def povel():\n    return 50, -20\n\ntah, bok = povel()', a: ['-20', '50', '(50, -20)', 'Chyba – funkce může vrátit jen jednu hodnotu'], ok: 0 },
      { c: 'list', q: 'Jakou hodnotu bude mít nej po skončení cyklu?', code: 'teren = [4, 7, 7, 2]\nnej = 0\nfor i in range(len(teren) - 1):\n    if abs(teren[i+1] - teren[i]) < abs(teren[nej+1] - teren[nej]):\n        nej = i', a: ['1', '0', '2', '3'], ok: 0 },
      { c: 'dict', q: "Co bude v data['palivo']?", code: "data = {'vyska': 120, 'palivo': 40}\ndata['palivo'] = data['palivo'] - 5", a: ['35', '40', '-5', 'KeyError'], ok: 0 },
      { c: 'while', q: 'Kolik bude kroky po skončení cyklu?', code: 'vyska = 10\nkroky = 0\nwhile vyska > 0:\n    vyska = vyska - 3\n    kroky = kroky + 1', a: ['4', '3', '10', 'Cyklus nikdy neskončí'], ok: 0 }
    ],
    B: [
      { c: 'return', q: 'Co se vypíše?', code: 'def autopilot(vyska):\n    tah = 70\n\nprint(autopilot(50))', a: ['None', '70', '50', 'Nic – program spadne'], ok: 0 },
      { c: 'cond', q: 'Jakou hodnotu bude mít limit?', code: 'vyska = 120\nif vyska > 100:\n    limit = 10\nelif vyska > 30:\n    limit = 5\nelse:\n    limit = 2', a: ['10', '5', '2', 'Nejdřív 10, pak 5'], ok: 0 },
      { c: 'logic', q: 'Kdy je výraz klesani > 18 or vyska < 70 nepravdivý (False)?', a: ['Jen když klesani ≤ 18 a zároveň vyska ≥ 70', 'Když aspoň jedna z podmínek neplatí', 'Jen když klesani > 18', 'Nikdy'], ok: 0 },
      { c: 'arith', q: 'Kolik vyjde?', code: '10 + 20 / 4 * 2', a: ['20.0', '15.0', '12.5', '7.5'], ok: 0 },
      { c: 'builtin', q: 'Co vrátí round(47.6)?', a: ['48', '47', '47.6', '48.0'], ok: 0 },
      { c: 'def', q: 'Co se vypíše?', code: 'def omez(x, dolni, horni):\n    return max(dolni, min(horni, x))\n\nprint(omez(-7, 0, 100))', a: ['0', '-7', '100', '93'], ok: 0 },
      { c: 'tuple', q: 'Funkce končí řádkem return tah, bok. Co vrací?', a: ['N-tici (tuple) se dvěma hodnotami', 'Jen tah, bok se zahodí', 'Součet tah + bok', 'Chybu SyntaxError'], ok: 0 },
      { c: 'list', q: 'Co se vypíše?', code: 'vysky = [12, 9, 15, 4]\nprint(vysky[1] + vysky[-1])', a: ['13', '21', '16', '24'], ok: 0 },
      { c: 'dict', q: 'Jakou hodnotu bude mít v?', code: "pamet = {}\nv = pamet.get('vyska', 100)", a: ['100', 'None', 'KeyError', "'vyska'"], ok: 0 },
      { c: 'while', q: 'Kolik bude t po skončení cyklu?', code: 't = 0\nv = 0\nwhile v < 5:\n    v = v + 2\n    t = t + 1', a: ['3', '2', '5', '6'], ok: 0 }
    ]
  };

  /* ---------------- jak získat bonus u úrovní, kde o něm nemluví nápověda ---------------- */
  const BONUS_HOW = {
    6: { how: 'Tah omez do rozsahu 0 až 100 bez podmínek: `min(100, tah)` useká hodnoty nad 100, `max(0, …)` useká hodnoty pod 0 a `round()` výsledek zaokrouhlí na celé procento.', example: 'tah = 40 + 15 * (klesani - 2)\nreturn round(max(0, min(100, tah)))' },
    8: { how: 'Kromě výšky řiď i bok. Chtěná boční rychlost je úměrná vzdálenosti od středu: čím dál od plochy, tím rychleji k ní. Bok pak dorovnává rozdíl mezi chtěnou a skutečnou rychlostí.', example: 'chci_vx = -x / 8\nbok = 60 * (chci_vx - vx)\nreturn tah, bok' },
    11: { how: 'Dobu pádu nepočítej odhadem, ale simulací: stejně jako hra přičítej gravitaci po desetinách sekundy, dokud sonda nedopadne. Kam doletí, je pak `x + vx * doba_padu(…)`.', example: 'while vyska > 0:\n    klesani = klesani + 1.62 * 0.1\n    vyska = vyska - klesani * 0.1\n    t = t + 0.1' },
    12: { how: 'Palivo šetříš, když nebrzdíš zbytečně brzy. Vysoko klesej rychle a brzdi až u země: cílová rychlost klesání závisí na výšce (`cil = 1 + vyska / 10`). Bočně se k ploše přibližuj omezenou rychlostí.', example: 'cil = 1 + vyska / 10\ntah = 40 + 15 * (klesani - cil)' }
  };
  LEVELS.forEach(l => Object.assign(l.bonus, BONUS_HOW[l.id] || {}));

  global.OrelContent = { CHAPTERS, LEVELS, QUIZ, CONCEPTS, TERRAIN, WEST };
})(typeof window !== 'undefined' ? window : globalThis);
