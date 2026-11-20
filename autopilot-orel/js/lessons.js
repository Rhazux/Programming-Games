/*
 * Autopilot Orel – lekce ke každé úrovni
 * Výklad + vlastní spustitelný příklad v Pythonu (běží v interpretu hry, výstup se ukáže hned).
 * Příklady jsou ze života (topení, auto, pizza…), ať lekce neprozradí řešení úrovně.
 */
(function (global) {
  'use strict';

  const L = {
    1: {
      title: 'Funkce vrací hodnotu: `return` a proměnné',
      text: [
        'Tvoji funkci `autopilot` volá palubní počítač **desetkrát za sekundu**. Pokaždé jí předá výšku a rychlost klesání a čeká, co mu funkce **vrátí** příkazem `return`: tah motoru v procentech.',
        'Proměnná je pojmenovaná krabička na hodnotu: `davka = 20` uloží 20 pod jméno `davka`. Pak ji můžeš vrátit, vypsat nebo s ní počítat.'
      ],
      example: `def palivo_na_start(hmotnost):
    davka = hmotnost * 2
    return davka

print(palivo_na_start(10))
print(palivo_na_start(25))`,
      try: 'Změň výpočet na `hmotnost * 3`. Co se stane, když řádek s `return` smažeš? Funkce pak vrátí `None`.',
      pitfall: 'Kód za `return` se už neprovede, funkce tam končí. A `print` uvnitř funkce palubnímu počítači nic nepředá, ten čte jen `return`.',
      fact: 'Palubní počítač misí Apollo měl jen asi 4 KB zapisovatelné paměti, a přesto dovezl lidi na Měsíc.'
    },
    2: {
      title: 'Rozhodnutí: `if` a `else`',
      text: [
        '`if podmínka:` řekne, co se stane, když podmínka platí. `else:` řekne, co se stane jinak. Za podmínkou je **dvojtečka** a příkazy, které k ní patří, jsou **odsazené** o 4 mezery.',
        'Porovnává se znaky `>`, `<`, `>=`, `<=`, `==` (rovná se) a `!=` (nerovná se).'
      ],
      example: `def topeni(teplota):
    if teplota < 20:
        return "zapnout"
    else:
        return "vypnout"

print(topeni(15))
print(topeni(23))`,
      try: 'Co vrátí `topeni(20)`? Zkus to a pak změň podmínku na `<=`.',
      pitfall: 'Chybějící dvojtečka nebo neodsazený řádek je v Pythonu chyba. Odsazení není ozdoba, určuje, co do podmínky patří.',
      fact: 'Termostat doma funguje přesně takhle: zapíná a vypíná topení podle jediné podmínky. Inženýři tomu říkají regulace zapnout/vypnout.'
    },
    3: {
      title: 'Víc možností: `elif`',
      text: [
        '`elif` (zkratka „else if“) přidá další podmínku. Python je zkouší **odshora** a provede jen **první** větev, která platí. `else` chytí všechno ostatní.',
        'Díky tomu nastavíš **pásma**: na dálnici jinak, na silnici jinak a v obci zase jinak.'
      ],
      example: `def rychlost_auta(misto):
    if misto == "dálnice":
        limit = 130
    elif misto == "silnice":
        limit = 90
    else:
        limit = 50
    return limit

for m in ["dálnice", "silnice", "obec"]:
    print(m, rychlost_auta(m))`,
      try: 'Přidej větev `elif misto == "zóna 30":` s limitem 30. Kam ji musíš dát, aby fungovala?',
      pitfall: 'U čísel záleží na pořadí. Když nahoře bude `if vyska > 30` a až pod ním `elif vyska > 100`, druhá větev se nikdy nespustí, protože 150 je větší i než 30.',
      fact: 'Skutečné přistávací moduly mění postup podle výšky: vysoko brzdí naplno, těsně nad povrchem jen jemně dosedají.'
    },
    4: {
      title: 'Spojování podmínek: `and` a `or`',
      text: [
        '`and` znamená, že musí platit **obě** podmínky. `or` znamená, že stačí **jedna**. `not` výsledek obrátí.',
        '**Závorky** určují, co patří k čemu, stejně jako v matematice: `a or (b and c)` platí, když platí `a`, nebo když platí zároveň `b` i `c`.'
      ],
      example: `def destnik(prsi, vitr):
    if prsi and vitr < 50:
        return "vezmi deštník"
    return "deštník nech doma"

def ven(prsi, teplota):
    return teplota > 15 or (not prsi and teplota > 5)

print(destnik(True, 20))
print(destnik(True, 80))
print(ven(True, 20), ven(False, 10), ven(True, 10))`,
      try: 'Smaž závorky ve funkci `ven` a spusť to znovu. Změnil se výsledek? Nezměnil, `and` má přednost před `or`, ale se závorkami je podmínka čitelnější.',
      pitfall: '`and` se vyhodnotí dřív než `or`. Bez závorek může podmínka znamenat něco jiného, než chceš.',
      fact: 'Při přistání Apolla 11 musel Neil Armstrong přeletět pole balvanů a paliva zbývalo jen na pár desítek sekund.'
    },
    5: {
      title: 'Výpočty a pořadí operací',
      text: [
        'Python počítá jako matematika: nejdřív `**` (mocnina), pak `*`, `/`, `//` a `%` a nakonec `+` a `-`. **Závorky** pořadí změní.',
        'Výkon nemusí být jen 0 nebo 100. Když ho spočítáš podle toho, **jak moc** se pleteš (chyba), stroj jede plynule. Takovému řízení se říká **P-regulátor**: čím větší chyba, tím větší oprava.'
      ],
      example: `print(2 + 3 * 4)
print((2 + 3) * 4)
print(2 ** 3)

cil = 22
for teplota in [16, 20, 22, 25]:
    chyba = cil - teplota
    vykon = 10 * chyba
    print(teplota, "°C → výkon topení", vykon)`,
      try: 'Změň zesílení z 10 na 20 a topení bude reagovat dvakrát prudčeji. Všimni si záporného výkonu u 25 °C, to vyřeší další úroveň.',
      pitfall: '`40 + 15 * klesani - 2` je něco jiného než `40 + 15 * (klesani - 2)`. Bez závorek se nejdřív násobí.',
      fact: 'P-regulátor najdeš v tempomatu auta, v troubě i v dronu, který drží výšku.'
    },
    6: {
      title: 'Hlídání mezí: `min()`, `max()` a `round()`',
      text: [
        '`min(a, b)` vrátí menší číslo a `max(a, b)` větší. Spolu ořízne hodnotu do rozsahu: `max(0, min(100, x))` vrátí `x`, ale nikdy méně než 0 a nikdy víc než 100.',
        '`round(4.6)` zaokrouhlí na celé číslo (5). `abs(-7)` vrátí absolutní hodnotu (7).'
      ],
      example: `for x in [-20, 47.6, 135]:
    oriznuto = max(0, min(100, x))
    print(x, "→", round(oriznuto))

print(abs(-7), abs(7))`,
      try: 'Ořízni čísla do rozsahu 10 až 90. Které dvě konstanty změníš?',
      pitfall: 'Když `min` a `max` prohodíš, `min(0, max(100, x))` vrátí pokaždé 0.',
      fact: 'Skutečný motor má meze: tah nejde zvýšit nad maximum ani snížit pod nulu. Software s tím musí počítat, jinak chce nemožné.'
    },
    7: {
      title: 'Vlastní funkce a mocnina `**`',
      text: [
        'Vlastní funkci definuješ slovem `def`, jménem a parametry. Uvnitř spočítáš výsledek a vrátíš ho `return`. Pak ji voláš, kolikrát chceš, i z jiné funkce.',
        '`r ** 2` je r na druhou. Ve fyzice se mocnina objevuje často, třeba brzdná dráha roste s **druhou mocninou** rychlosti.'
      ],
      example: `def plocha_kruhu(r):
    return 3.14 * r ** 2

def cena_pizzy(r, cena_za_cm2):
    return round(plocha_kruhu(r) * cena_za_cm2)

print(plocha_kruhu(10))
print(cena_pizzy(15, 0.3), "Kč")`,
      try: 'Spočítej plochu pizzy s poloměrem 20 cm. Dvojnásobný poloměr dá čtyřnásobnou plochu.',
      pitfall: 'Funkce, kterou jen nadefinuješ, nic neudělá. Musíš ji **zavolat** se závorkami: `plocha_kruhu(10)`.',
      fact: 'Proto auto při dvojnásobné rychlosti potřebuje zhruba čtyřnásobnou brzdnou dráhu.'
    },
    8: {
      title: 'Dvě hodnoty naráz: n-tice',
      text: [
        '`return a, b` vrátí **n-tici** (tuple) se dvěma hodnotami. Kdo funkci zavolá, může ji hned rozbalit do dvou proměnných: `x, y = funkce()`.',
        'Hodí se, když funkce rozhoduje o dvou věcech najednou, třeba o hlavním motoru a bočních tryskách.'
      ],
      example: `def deleni(a, b):
    return a // b, a % b

podil, zbytek = deleni(17, 5)
print("podíl:", podil, "zbytek:", zbytek)

dvojice = deleni(9, 4)
print(dvojice)`,
      try: 'Přidej do `return` třetí hodnotu `a / b` a rozbal výsledek do tří proměnných.',
      pitfall: 'Počet proměnných vlevo musí sedět s počtem hodnot. `x, y = (1, 2, 3)` skončí chybou.',
      fact: 'Lunární modul Apolla měl kromě hlavního motoru ještě 16 malých trysek na natáčení a boční pohyb.'
    },
    9: {
      title: 'Seznamy a cyklus `for`',
      text: [
        'Seznam je řada hodnot v hranatých závorkách. **Index začíná nulou**: `teploty[0]` je první prvek a `teploty[-1]` poslední.',
        'Cyklus `for i in range(len(seznam)):` projde všechny indexy. Díky tomu můžeš porovnávat sousedy `seznam[i]` a `seznam[i + 1]`.'
      ],
      example: `teploty = [12, 15, 21, 19, 25]
print(teploty[0], teploty[-1], len(teploty))

for i in range(len(teploty) - 1):
    rozdil = teploty[i + 1] - teploty[i]
    print("den", i, "→", i + 1, ":", rozdil)

nejvic = max(teploty)
print("nejtepleji:", nejvic, "ve dni", teploty.index(nejvic))`,
      try: 'Proč cyklus jde jen do `len(teploty) - 1`? Zkus `range(len(teploty))` a uvidíš chybu `IndexError` u posledního dne.',
      pitfall: 'Poslední prvek už souseda `i + 1` nemá. Proto cyklus přes sousedy končí o jedno dřív.',
      fact: 'Armstrong musel rovné místo hledat očima. Dnešní sondy si ho vybírají samy z radarových map terénu.'
    },
    10: {
      title: 'Slovník a paměť mezi voláními',
      text: [
        'Slovník (`dict`) páruje **klíče** s **hodnotami**: `pamet["km"]`. Zápis `pamet["km"] = 12` hodnotu uloží nebo přepíše.',
        'Když klíč neexistuje, `pamet["km"]` skončí chybou `KeyError`. Bezpečné je `pamet.get("km", 0)`: vrátí uloženou hodnotu, nebo náhradní 0. Slovník, který přežije mezi voláními funkce, funguje jako **paměť**.'
      ],
      example: `pamet = {}

def ujeto(km):
    minule = pamet.get("km", 0)
    pamet["km"] = km
    return km - minule

print(ujeto(5))
print(ujeto(12))
print(ujeto(20))
print(pamet)`,
      try: 'Ulož si do paměti i počet volání: `pamet["n"] = pamet.get("n", 0) + 1` a na konci ho vypiš.',
      pitfall: 'Kdybys `pamet = {}` napsal(a) **dovnitř** funkce, vytvořila by se při každém volání znovu prázdná a nic by si nepamatovala.',
      fact: 'Rychlost z rozdílu dvou měření počítá i tachometr v autě nebo krokoměr v mobilu.'
    },
    11: {
      title: 'Opakuj, dokud…: cyklus `while`',
      text: [
        '`while podmínka:` opakuje blok, **dokud** podmínka platí. Hodí se, když předem nevíš, kolikrát se má něco zopakovat, třeba jak dlouho bude kámen padat.',
        'Uvnitř cyklu se musí měnit něco, na čem podmínka závisí. Jinak cyklus nikdy neskončí. Takový **nekonečný cyklus** ohlásí palubní počítač ve hře jako alarm 1202.'
      ],
      example: `vyska = 20.0
rychlost = 0.0
cas = 0.0
while vyska > 0:
    rychlost = rychlost + 9.81 * 0.1
    vyska = vyska - rychlost * 0.1
    cas = cas + 0.1
print("kámen dopadl za", round(cas, 1), "s")
print("rychlostí", round(rychlost, 1), "m/s")`,
      try: 'Změň tíhové zrychlení z 9,81 (Země) na 1,62 (Měsíc). Jak dlouho padá kámen na Měsíci?',
      pitfall: 'Kdybys v cyklu zapomněl(a) snižovat `vyska`, podmínka `vyska > 0` by platila pořád a program by se nezastavil.',
      fact: 'Alarmy 1201 a 1202 se při přistání Apolla 11 opravdu rozsvítily, počítač byl přetížený. Software uměl odložit méně důležité úlohy a přistání pokračovalo.'
    },
    12: {
      title: 'Velký program z malých částí',
      text: [
        'Velký program se skládá z kousků, které už znáš: **data** ze slovníku, **výpočty**, **podmínky** pro různé fáze, `min` a `max` pro meze a nakonec `return` s povely.',
        'Pomáhá rozdělit úkol na **fáze** a každou řešit zvlášť: nejdřív přelet, pak klesání a nakonec jemné dosednutí.'
      ],
      example: `def faze(vyska, vzdalenost):
    if vzdalenost > 50:
        return "přelet"
    elif vyska > 20:
        return "klesání"
    else:
        return "dosednutí"

TAHY = {"přelet": 45, "klesání": 35, "dosednutí": 42}

def povel(data):
    f = faze(data["vyska"], data["vzdalenost"])
    return {"faze": f, "tah": max(0, min(100, TAHY[f]))}

print(povel({"vyska": 300, "vzdalenost": 120}))
print(povel({"vyska": 60, "vzdalenost": 10}))
print(povel({"vyska": 8, "vzdalenost": 2}))`,
      try: 'Přidej fázi „vznášení“ pro výšku pod 3 m s tahem 41 a vyzkoušej ji.',
      pitfall: 'Když se ve velkém programu něco pokazí, vyzkoušej každou malou funkci zvlášť, jako tady `faze()`. Chybu najdeš mnohem rychleji.',
      fact: 'Zdrojový kód palubního počítače Apolla 11 je dnes veřejně na GitHubu, i s vtipnými komentáři tehdejších programátorů.'
    }
  };

  Object.values(L).forEach(x => { x.kind = 'python'; x.file = 'priklad.py'; });
  global.OrelContent.LESSONS = L;
})(typeof window !== 'undefined' ? window : globalThis);
