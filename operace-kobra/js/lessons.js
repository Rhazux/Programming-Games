/*
 * Operace Kobra – lekce ke každé misi
 * Výklad + vlastní spustitelný příklad v Pythonu (běží v interpretu hry, výstup se ukáže hned).
 * Příklady řeší podobnou věc jinými daty, ať lekce neprozradí řešení mise.
 */
(function (global) {
  'use strict';

  const L = {
    1: {
      title: 'Funkce, `return` a f-string',
      text: [
        'Funkce (`def`) je pojmenovaný kus kódu. Dostane **parametry** (vstupy) a pomocí `return` **vrátí výsledek** tomu, kdo ji zavolal. `print()` jen něco vypíše na obrazovku, nic nevrací.',
        'f-string je text s `f` na začátku. Do složených závorek `{…}` vložíš hodnotu proměnné, i číslo, bez převodu přes `str()`.'
      ],
      example: `def vizitka(jmeno, vek):
    return f"{jmeno} ({vek} let) je připravena."

zprava = vizitka("Ema", 15)
print(zprava)
print(vizitka("Tom", 16))`,
      try: 'Přidej do funkce třetí parametr `mesto` a vlož ho do textu. Nezapomeň ho doplnit i při volání.',
      pitfall: 'Když funkce místo `return` použije `print`, text sice vypíše, ale vrátí `None`. Testy mise pak dostanou prázdnou odpověď.',
      fact: 'f-stringy přibyly v Pythonu 3.6 v roce 2016 a rychle se staly nejoblíbenějším způsobem, jak skládat texty.'
    },
    2: {
      title: 'Rozhodování: `if`, `elif`, `else` a `len()`',
      text: [
        '`if` / `elif` / `else` vybere **jednu** větev. Python kontroluje podmínky shora dolů, provede první, která platí, a ostatní přeskočí.',
        '`len(text)` vrátí počet znaků. Pozor na hranice: `< 8` znamená 0 až 7, `<= 8` už zahrne i osmičku.'
      ],
      example: `def teplota(stupne):
    if stupne < 0:
        return "mrzne"
    elif stupne < 20:
        return "chladno"
    else:
        return "teplo"

print(teplota(-5), teplota(0), teplota(25))
print(len("kobra"))`,
      try: 'Přidej větev pro `stupne >= 30`, která vrátí „vedro“. Kam ji musíš dát, aby se k ní Python vůbec dostal?',
      pitfall: 'Na pořadí záleží. Kdyby jako první byla podmínka `stupne < 20`, větev pro mráz by nikdy nepřišla na řadu.',
      fact: 'Síla hesla dnes závisí hlavně na délce. Dlouhá věta z obyčejných slov bývá silnější než krátké heslo plné znaků.'
    },
    3: {
      title: 'Skládání podmínek: `and`, `or`, `not`',
      text: [
        'Porovnání (`==`, `!=`, `<`, `>`) dávají `True` nebo `False`. Spojkami `and` (musí platit obojí), `or` (stačí jedno) a `not` (obrácení) z nich složíš složitější podmínku.',
        'Výsledek můžeš uložit do proměnné nebo rovnou vrátit. **Závorky** ujasní, co patří k čemu: `(a or b) and c` je něco jiného než `a or (b and c)`.'
      ],
      example: `den = "so"
pocasi = "déšť"

vikend = den == "so" or den == "ne"
vylet = vikend and not pocasi == "déšť"

print(vikend)
print(vylet)`,
      try: 'Změň počasí na „slunce“ a sleduj, jak se změní `vylet`. Pak zkus den „út“.',
      pitfall: 'Zápis `den == "so" or "ne"` nefunguje, jak čekáš: neprázdný text `"ne"` bere Python jako pravdu. Porovnání patří ke každé části zvlášť.',
      fact: 'Banky hodnotí přihlášení podobně: noc, cizí země a nové zařízení dohromady spustí výstrahu.'
    },
    4: {
      title: 'Znak po znaku: `for`, `ord()`, `chr()` a `%`',
      text: [
        'Cyklus `for znak in text:` projde text **znak po znaku**. `ord("a")` převede znak na číslo (97) a `chr(98)` číslo zpátky na znak („b“).',
        'Zbytek po dělení `%` „zabalí“ čísla do kruhu. Abeceda má 26 písmen, takže `(0 - 3) % 26` je 23: z „a“ se o tři místa zpátky dostaneš na „x“.'
      ],
      example: `for znak in "abc":
    print(znak, ord(znak))

print((0 - 3) % 26)
print(chr(97 + 23))

slovo = ""
for znak in "ahoj":
    slovo = slovo + chr(ord(znak) + 1)
print(slovo)`,
      try: 'Posuň slovo o 2 místa místo o 1. Co by se stalo se znakem „z“? Bez `% 26` by vyskočil z abecedy.',
      pitfall: '`ord()` a `chr()` počítají s celou tabulkou znaků, ne jen s abecedou. U posunu proto odečti `ord("a")`, použij `% 26` a zase přičti.',
      fact: 'Julius Caesar prý takhle šifroval zprávy svým generálům, s posunem o tři písmena.'
    },
    5: {
      title: 'Seznamy, `append`, řezy a `in`',
      text: [
        'Seznam (`list`) je řada hodnot v hranatých závorkách. Metoda `append()` přidá hodnotu na konec. `"m" in text` zjistí, jestli text obsahuje „m“ (u seznamu, jestli v něm hodnota je).',
        'Řez `text[a:b]` vybere znaky od indexu `a` do `b − 1`. Indexy začínají nulou, takže `"Kobra"[1:4]` je „obr“. Řezy fungují i u seznamů.'
      ],
      example: `nakup = ["mléko", "chléb", "máslo", "med"]
na_m = []
for vec in nakup:
    if "m" in vec:
        na_m.append(vec)
print(na_m)

datum = "2026-11-20"
print(datum[0:4], datum[5:7])`,
      try: 'Vyber jen věci, které **začínají** na „m“: místo `"m" in vec` zkus `vec[0] == "m"`. Pak z data vyřízni den: `datum[8:10]`.',
      pitfall: 'Druhé číslo v řezu se už **nezahrne**. `datum[0:4]` jsou znaky 0, 1, 2 a 3, tedy přesně rok.',
      fact: 'Analytici bezpečnosti hledají útoky v logu serveru přesně takhle: vyfiltrují řádky a vyřežou z nich časy a adresy.'
    },
    6: {
      title: 'Počítání se slovníkem: `dict`, `get()`, `split()`, `sorted()`',
      text: [
        'Slovník (`dict`) páruje **klíče** s **hodnotami**, třeba `{"eva": 3}`. Nejčastěji se s ním počítají výskyty: `pocty[k] = pocty.get(k, 0) + 1`. Metoda `get` vrátí hodnotu, a když klíč ještě neexistuje, vrátí náhradní (tady 0).',
        '`text.split("ip=")` rozdělí text podle oddělovače na seznam částí. `sorted()` vrátí seřazenou kopii seznamu.'
      ],
      example: `hlasy = ["pizza", "sushi", "pizza", "tacos", "pizza", "sushi"]
pocty = {}
for jidlo in hlasy:
    pocty[jidlo] = pocty.get(jidlo, 0) + 1
print(pocty)

zaznam = "cas=07:02 ip=10.0.0.8"
print(zaznam.split("ip=")[1])
print(sorted(["c", "a", "b"]))`,
      try: 'Vypiš jen jídla s aspoň dvěma hlasy: projdi `for jidlo in pocty:` a vyber podle `pocty[jidlo] >= 2`.',
      pitfall: '`pocty[jidlo] + 1` u klíče, který ve slovníku ještě není, skončí chybou `KeyError`. Proto `get(jidlo, 0)`.',
      fact: 'Stejně počítají i webové statistiky: kolik lidí přišlo, z jaké země a z jakého prohlížeče.'
    },
    7: {
      title: 'Čísla v bitech: `int()`, `format(n, "08b")`, `join()`',
      text: [
        'Počítač ukládá všechno jako **bity** (0 a 1). `format(10, "08b")` vypíše číslo 10 jako osm bitů: „00001010“. Opačně `int("1010", 2)` převede dvojkový zápis zpátky na 10.',
        'IP adresa jsou čtyři čísla 0–255, tedy 4 bajty = 32 bitů. `"-".join(seznam)` spojí seznam textů do jednoho textu s oddělovačem mezi nimi.'
      ],
      example: `print(format(5, "08b"))
print(format(200, "08b"))
print(int("11000000", 2))

casti = "10.1.2.3".split(".")
cisla = [int(c) for c in casti]
print(cisla)
print("-".join(["a", "b", "c"]))`,
      try: 'Zkus `format(255, "08b")` a `format(256, "08b")`. Proč má 256 najednou devět bitů?',
      pitfall: '`join` umí spojit jen **texty**. Čísla nejdřív převeď na text, třeba přes `str(n)` nebo `format(n, "08b")`.',
      fact: 'Do jednoho bajtu se vejde 256 hodnot (0–255). Proto žádná část IP adresy nemůže být větší než 255.'
    },
    8: {
      title: 'Bitové `&`, `zip()` a `all()`',
      text: [
        'Operátor `&` porovná dvě čísla **bit po bitu**: výsledný bit je 1, jen když jsou oba bity 1. `0b1100 & 0b1010` je `0b1000`, tedy 8. Tak funguje maska podsítě: nechá jen bity, které určují síť.',
        '`zip(a, b)` prochází dva seznamy najednou po dvojicích. `all(...)` vrátí `True`, jen když jsou všechny hodnoty pravdivé.'
      ],
      example: `print(0b1100 & 0b1010)
print(200 & 255, 200 & 0)

a = [1, 2, 3]
b = [1, 5, 3]
for x, y in zip(a, b):
    print(x, y, x == y)

print(all(x > 0 for x in a))`,
      try: 'Změň v `b` pětku na dvojku a přidej `print(all(x == y for x, y in zip(a, b)))`. Co vypíše?',
      pitfall: '`&` není totéž co `and`. `&` pracuje s bity čísel, `and` s pravdivostí celých výrazů.',
      fact: 'Domácí router podle stejného výpočtu pozná, jestli data patří do domácí sítě, nebo je má poslat ven do internetu.'
    },
    9: {
      title: 'Hrubá síla: `range()` a `zfill()`',
      text: [
        'Útok **hrubou silou** zkouší všechny možnosti, jednu po druhé. `range(n)` vytvoří čísla 0 až n − 1, takže `for i in range(10000):` projde všechny čtyřmístné PINy.',
        '`str(42).zfill(4)` doplní text zleva nulami na čtyři znaky: „0042“. Stejně to umí f-string `f"{42:04d}"`.'
      ],
      example: `for i in range(3):
    print(str(i).zfill(4))

print(f"{7:04d}")

tajne = "0006"
for i in range(100):
    pokus = str(i).zfill(4)
    if pokus == tajne:
        print("Mám to:", pokus)
        break`,
      try: 'Změň tajný kód na „0042“. Kolik pokusů je potřeba? Přidej počítadlo pokusů a vypiš ho.',
      pitfall: 'Bez `zfill` by pokus pro 6 byl „6“, a ne „0006“, takže by se s PINem nikdy neshodoval.',
      fact: 'Telefony proto po několika špatných PINech zadávání zablokují. Bez limitu by stačilo pár minut zkoušení.'
    },
    10: {
      title: 'Půlení intervalu: `while` a `//`',
      text: [
        'Cyklus `while podmínka:` opakuje blok, **dokud** podmínka platí. Hodí se, když předem nevíš, kolik kroků bude potřeba.',
        '**Půlení intervalu** každým pokusem zahodí polovinu možností: zkusí prostřední číslo `(dolni + horni) // 2` a podle odpovědi posune dolní nebo horní mez. `//` dělí a zahodí desetinnou část.'
      ],
      example: `tajne = 73
dolni, horni = 1, 100
while dolni <= horni:
    stred = (dolni + horni) // 2
    print(f"zkouším {stred} (mezi {dolni} a {horni})")
    if stred < tajne:
        dolni = stred + 1
    elif stred > tajne:
        horni = stred - 1
    else:
        print("mám to!")
        break`,
      try: 'Změň tajné číslo na 1 nebo na 100. Kolik pokusů je potřeba? Nikdy víc než 7, protože 2⁷ = 128.',
      pitfall: 'Když mez neposuneš o jedničku (`dolni = stred` místo `stred + 1`), může se cyklus točit pořád na stejném čísle.',
      fact: 'Milion možností prohledá půlení na 20 pokusů. Hrubá síla by jich potřebovala až milion.'
    },
    11: {
      title: 'Funkce volají funkce a otisk (hash)',
      text: [
        'Velký úkol rozložíš na malé funkce. Jedna funkce může volat druhou: `najdi()` v cyklu volá `soucet_znaku()` pro každé slovo.',
        '**Hash** (otisk) převede text na číslo. Stejný text dá vždy stejný otisk, ale z otisku se text vypočítat nedá. Proto se hesla ukládají jen jako otisky.'
      ],
      example: `def soucet_znaku(text):
    s = 0
    for znak in text:
        s = s + ord(znak)
    return s

def najdi(cil, slova):
    for slovo in slova:
        if soucet_znaku(slovo) == cil:
            return slovo
    return None

print(soucet_znaku("abc"))
print(najdi(294, ["xyz", "abc", "kobra"]))
print(najdi(1, ["xyz"]))`,
      try: 'Zkus `soucet_znaku("bca")`. Vyjde stejně jako „abc“! Skutečné hashovací funkce proto míchají i pořadí znaků, třeba násobením 31.',
      pitfall: 'Když `return None` napíšeš **dovnitř** cyklu, funkce skončí hned po prvním slově. Patří až za cyklus.',
      fact: 'Když uniknou otisky hesel, útočník spočítá otisky slovníku běžných hesel a porovná je. Hesla jako „heslo123“ tak padnou během vteřiny.'
    },
    12: {
      title: 'Skládání funkcí: z malých kousků velký výsledek',
      text: [
        'Složitý problém se řeší **skládáním malých funkcí**. Každá umí jednu věc a ty je pak použiješ dohromady, třeba v cyklu přes všechny možnosti.',
        'Caesarova šifra má jen 26 posunů. Když umíš dešifrovat jedním posunem, stačí vyzkoušet všech 26 a hledat smysluplné slovo. Tak se šifra prolomí hrubou silou.'
      ],
      example: `def je_sude(n):
    return n % 2 == 0

def suda(cisla):
    return [n for n in cisla if je_sude(n)]

def soucet_sudych(cisla):
    return sum(suda(cisla))

print(suda([1, 2, 3, 4, 10]))
print(soucet_sudych([1, 2, 3, 4, 10]))`,
      try: 'Napiš funkci `licha(cisla)`, která použije `je_sude` spolu s `not`, a vypiš lichá čísla.',
      pitfall: 'Funkci musí Python znát ve chvíli, kdy ji voláš. Definice `def` proto dávej nahoru, nad kód, který je používá.',
      fact: 'Moderní šifra AES-256 má 2²⁵⁶ klíčů, to je číslo se 78 číslicemi. Všechny počítače světa by je nevyzkoušely ani za miliardy let.'
    }
  };

  Object.values(L).forEach(x => { x.kind = 'python'; x.file = 'priklad.py'; });
  global.KobraContent.LESSONS = L;
})(typeof window !== 'undefined' ? window : globalThis);
