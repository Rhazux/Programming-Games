/*
 * Operace Kobra – obsah hry: mise, data, testy, nápovědy, kvíz
 *
 * Každá mise má:
 *   brief    – zprávy od velitelky Nory (a zachycené zprávy Šakala)
 *   fn       – jméno funkce, kterou hráč píše; starter – výchozí kód; solution – vzorové řešení
 *   prelude  – data (Python), která má hráč i testy k dispozici
 *   tests    – volání funkce (Python výraz); očekávaná hodnota se spočítá ze vzorového řešení
 *              setup = parametry simulovaného zařízení (trezor, server), hidden = skrytý test
 *   bonus    – třetí hvězda: { text, check(ctx) } – ctx.ast (AST hráčova kódu), ctx.stats (statistiky testů)
 *   wrong    – typické chybné pokusy (pro automatické testy – musí neprojít)
 */
(function (global) {
  'use strict';

  const SECTORS = [
    { id: 1, title: 'Výcvik', icon: '🎓', desc: 'funkce, podmínky, logika, texty' },
    { id: 2, title: 'Analýza dat', icon: '📜', desc: 'seznamy, slovníky, řezy, bity' },
    { id: 3, title: 'Protiútok', icon: '🕵️', desc: 'algoritmy: hrubá síla, půlení, hashe' }
  ];

  /* ---------- pomocníci pro bonusové cíle ---------- */
  const W = global.MiniPython;
  function nodes(ast, pred) { const out = []; W.walkAst(ast, n => { if (pred(n)) out.push(n); }); return out; }
  function fnDef(ast, name) { return nodes(ast, n => n.k === 'def' && n.name === name)[0] || null; }
  function callsName(node, name) { return !!node && nodes(node.body || node, n => n.k === 'call' && n.f.k === 'name' && n.f.id === name).length > 0; }

  const LOG = `LOG = [
    "2026-11-19 06:58:12 OK   user=nora ip=10.0.0.2",
    "2026-11-19 07:02:45 FAIL user=admin ip=185.220.101.4",
    "2026-11-19 07:02:47 FAIL user=admin ip=185.220.101.4",
    "2026-11-19 07:02:49 FAIL user=root ip=185.220.101.4",
    "2026-11-19 07:15:03 OK   user=tomas ip=10.0.0.7",
    "2026-11-19 07:31:20 FAIL user=eva ip=10.0.0.8",
    "2026-11-19 07:31:41 OK   user=eva ip=10.0.0.8",
    "2026-11-19 07:44:10 FAIL user=admin ip=45.155.205.99",
    "2026-11-19 07:44:12 FAIL user=admin ip=45.155.205.99",
    "2026-11-19 07:44:15 FAIL user=backup ip=185.220.101.4",
    "2026-11-19 08:01:00 OK   user=admin ip=10.0.0.2",
]

LOG_NOC = [
    "2026-11-20 01:13:09 FAIL user=root ip=91.240.118.7",
    "2026-11-20 01:13:10 FAIL user=root ip=91.240.118.7",
    "2026-11-20 02:00:00 OK   user=nora ip=10.0.0.2",
    "2026-11-20 03:47:55 FAIL user=sakal ip=91.240.118.7",
    "2026-11-20 03:48:01 FAIL user=guest ip=10.0.0.66",
]
`;

  const MISSIONS = [
    /* ================= SEKTOR 1 – VÝCVIK ================= */
    {
      id: 1, sector: 1, code: 'SPOJENI', title: 'Navázání spojení', concept: 'funkce · return · f-string',
      brief: [
        ['nora', 'Vítej v jednotce KOBRA, agente. Jsem Nora, tvoje velitelka. Hackerská skupina ŠAKAL útočí na servery našeho města a my je zastavíme – Pythonem.'],
        ['nora', 'Každý agent se do sítě hlásí přesně předepsanou zprávou. Systém je přísný: jediná chybějící mezera a spojení se nenaváže.'],
        ['nora', 'Doplň funkci `hlaseni(agent, cislo)`. Musí VRÁTIT (return) text přesně v tomhle tvaru: `[KOBRA] Agent Ema (č. 7) je online.`']
      ],
      task: 'Funkce dostane jméno agenta a jeho číslo a vrátí text `[KOBRA] Agent <jméno> (č. <číslo>) je online.`',
      fn: 'hlaseni',
      starter: '# Funkce dostane jméno a číslo agenta a VRÁTÍ (return) text hlášení.\n# Tip: f-string vloží hodnoty proměnných do textu: f"Ahoj {agent}"\n\ndef hlaseni(agent, cislo):\n    return ""\n',
      solution: 'def hlaseni(agent, cislo):\n    return f"[KOBRA] Agent {agent} (č. {cislo}) je online."\n',
      tests: [{ call: 'hlaseni("Ema", 7)' }, { call: 'hlaseni("Tomáš", 12)' }, { call: 'hlaseni("X", 0)' }, { call: 'hlaseni("Agentka Nula", 100)', hidden: true }],
      bonus: { text: 'Použij f-string', check: c => nodes(c.ast, n => n.k === 'fstr').length > 0 },
      hints: [
        'f-string začíná písmenem `f` před uvozovkami a proměnné píšeš do složených závorek: `f"Agent {agent}"`.',
        'Hlídej přesný tvar: hranaté závorky, mezery, „č.“ s tečkou a tečku na konci.',
        '`return f"[KOBRA] Agent {agent} (č. {cislo}) je online."`'
      ],
      palette: ['return ', 'f"|"', '{agent}', '{cislo}'],
      learn: ['Funkce (def) přijímá parametry a pomocí return vrací výsledek tomu, kdo ji zavolal. print() jen vypisuje – nic nevrací. f-string vloží do textu hodnotu proměnné, i číslo, bez převodu přes str().',
        'def pozdrav(jmeno, vek):\n    return f"{jmeno} má {vek} let."\n\nprint(pozdrav("Ema", 15))  # Ema má 15 let.'],
      reward: 'Spojení navázáno. Nora: „Výborně, jsi v síti. A hned máme práci – Šakal se snaží prolomit hesla našich zaměstnanců.“',
      wrong: [
        'def hlaseni(agent, cislo):\n    return "[KOBRA] Agent " + agent + " (č. " + cislo + ") je online."\n',
        'def hlaseni(agent, cislo):\n    print(f"[KOBRA] Agent {agent} (č. {cislo}) je online.")\n',
        'def hlaseni(agent, cislo):\n    return f"[KOBRA] Agent {agent} (č.{cislo}) je online"\n'
      ]
    },
    {
      id: 2, sector: 1, code: 'HESLA', title: 'Síla hesla', concept: 'if · elif · else · len()',
      brief: [
        ['nora', 'Šakal zkouší hesla hrubou silou. A polovina zaměstnanců má heslo kratší než 8 znaků. To je jako zamykat trezor na gumičku.'],
        ['nora', 'Napiš funkci `sila_hesla(heslo)`. Podle délky vrátí `"slabé"` (méně než 8 znaků), `"střední"` (8 až 11 znaků) nebo `"silné"` (12 a víc).'],
        ['nora', 'Pozor na hranice – heslo s přesně 8 znaky už je střední a s přesně 12 už silné.']
      ],
      task: 'Vrať `"slabé"` pro délku < 8, `"střední"` pro 8–11 a `"silné"` pro 12 a více znaků.',
      fn: 'sila_hesla',
      starter: 'def sila_hesla(heslo):\n    delka = len(heslo)\n    # doplň podmínky if / elif / else\n    return "?"\n',
      solution: 'def sila_hesla(heslo):\n    delka = len(heslo)\n    if delka < 8:\n        return "slabé"\n    elif delka < 12:\n        return "střední"\n    else:\n        return "silné"\n',
      tests: [{ call: 'sila_hesla("abc")' }, { call: 'sila_hesla("heslo123")' }, { call: 'sila_hesla("Kobra-2026!!")' },
        { call: 'sila_hesla("")', hidden: true }, { call: 'sila_hesla("1234567")', hidden: true }, { call: 'sila_hesla("abcdefghijk")', hidden: true }, { call: 'sila_hesla("x" * 40)', hidden: true }],
      bonus: { text: 'Použij `elif`', check: c => nodes(c.ast, n => n.k === 'if' && n.elif).length > 0 },
      hints: [
        '`len(heslo)` vrátí počet znaků. Ve startovním kódu už je uložený v proměnné `delka`.',
        'Podmínky se kontrolují shora dolů a platí první splněná: `if delka < 8: … elif delka < 12: … else: …`',
        'Každá větev potřebuje svůj `return`: `return "slabé"`, `return "střední"`, `return "silné"`.'
      ],
      palette: ['if delka < 8:\n    |', 'elif |:\n    ', 'else:\n    |', 'return "slabé"'],
      learn: ['if / elif / else vybírá jednu z větví – Python kontroluje podmínky shora a provede první, která platí. Na hranice pozor: < 8 znamená 0 až 7, <= 8 už i osmičku.',
        'body = 75\nif body >= 90:\n    znamka = 1\nelif body >= 75:\n    znamka = 2\nelse:\n    znamka = 3'],
      reward: 'Nora: „Krátká hesla jsme zakázali. Šakal hned změnil taktiku – zkouší se přihlašovat v noci ze zahraničí.“',
      wrong: [
        'def sila_hesla(heslo):\n    if len(heslo) <= 8:\n        return "slabé"\n    elif len(heslo) <= 12:\n        return "střední"\n    return "silné"\n',
        'def sila_hesla(heslo):\n    if len(heslo) < 8:\n        return "slabé"\n    if len(heslo) < 12:\n        return "silné"\n    return "střední"\n'
      ]
    },
    {
      id: 3, sector: 1, code: 'NOCNI', title: 'Noční přihlášení', concept: 'and · or · not · True/False',
      brief: [
        ['nora', 'Hlídací systém potřebuje pravidlo, kdy spustit poplach. Analytici se shodli na tomhle:'],
        ['nora', 'Přihlášení je PODEZŘELÉ, když je mimo pracovní dobu (před 7. nebo po 19. hodině) A ZÁROVEŇ ze zahraničí (země není "CZ"). NEBO když se někdo hlásí na účet "root" – to je podezřelé vždycky.'],
        ['nora', 'Napiš `je_podezrele(uzivatel, hodina, zeme)`, která vrátí `True` nebo `False`.']
      ],
      task: 'Vrať `True`, když (`hodina < 7` nebo `hodina > 19`) a země není `"CZ"` – nebo když je uživatel `"root"`. Jinak `False`.',
      fn: 'je_podezrele',
      starter: 'def je_podezrele(uzivatel, hodina, zeme):\n    mimo_pracovni_dobu = False   # uprav: před 7. nebo po 19. hodině\n    ze_zahranici = False         # uprav: země není "CZ"\n    return False\n',
      solution: 'def je_podezrele(uzivatel, hodina, zeme):\n    mimo_pracovni_dobu = hodina < 7 or hodina > 19\n    ze_zahranici = zeme != "CZ"\n    return (mimo_pracovni_dobu and ze_zahranici) or uzivatel == "root"\n',
      tests: [{ call: 'je_podezrele("eva", 10, "CZ")' }, { call: 'je_podezrele("eva", 3, "RU")' }, { call: 'je_podezrele("root", 12, "CZ")' },
        { call: 'je_podezrele("eva", 3, "CZ")', hidden: true }, { call: 'je_podezrele("eva", 12, "US")', hidden: true }, { call: 'je_podezrele("adam", 19, "DE")', hidden: true },
        { call: 'je_podezrele("adam", 20, "DE")', hidden: true }, { call: 'je_podezrele("eva", 7, "SK")', hidden: true }, { call: 'je_podezrele("eva", 6, "SK")', hidden: true }],
      bonus: { text: 'Bez příkazu `if` – jen logický výraz', check: c => { const d = fnDef(c.ast, 'je_podezrele'); return !!d && nodes(d.body, n => n.k === 'if').length === 0; } },
      hints: [
        '`and` = musí platit obě podmínky, `or` = stačí jedna. Porovnání jako `hodina < 7` už samo je `True` nebo `False`.',
        '`mimo_pracovni_dobu = hodina < 7 or hodina > 19` a `ze_zahranici = zeme != "CZ"`',
        '`return (mimo_pracovni_dobu and ze_zahranici) or uzivatel == "root"`'
      ],
      palette: [' and ', ' or ', 'not ', ' != "CZ"', ' == "root"'],
      learn: ['and, or a not skládají podmínky. Porovnání (==, !=, <, >) dávají True nebo False, takže je můžeš uložit do proměnné nebo rovnou vrátit. Závorky ujasní, co patří k čemu.',
        'vikend = den == "so" or den == "ne"\nvolno = vikend and not sluzba\nreturn volno'],
      reward: 'Nora: „Poplach zabral – a zachytili jsme Šakalovu zprávu! Je zašifrovaná Caesarovou šifrou. Tvoje první kryptoanalýza.“',
      wrong: [
        'def je_podezrele(uzivatel, hodina, zeme):\n    return hodina < 7 or hodina > 19 and zeme != "CZ" or uzivatel == "root"\n',
        'def je_podezrele(uzivatel, hodina, zeme):\n    return (hodina <= 7 or hodina >= 19) and zeme != "CZ" or uzivatel == "root"\n'
      ]
    },
    {
      id: 4, sector: 1, code: 'CAESAR', title: 'Caesarova šifra', concept: 'for · ord() · chr() · %',
      brief: [
        ['sakal', '>> ZACHYCENO: jirq m yrexril 7 mv 22:00'],
        ['nora', 'Šakal šifruje Caesarovou šifrou: každé písmeno posune v abecedě o pevný počet míst dopředu (při posunu 3: a→d, b→e … x→a). Víme, že tahle zpráva má posun 17.'],
        ['nora', 'Napiš `desifruj(text, posun)`: každé malé písmeno a–z posuň o `posun` míst ZPĚT. Mezery, číslice a ostatní znaky nech, jak jsou.']
      ],
      task: 'Každé písmeno a–z posuň o `posun` míst zpět (a posunuté o 1 zpět je z). Ostatní znaky nech beze změny.',
      fn: 'desifruj',
      starter: 'def desifruj(text, posun):\n    vysledek = ""\n    for znak in text:\n        # malé písmeno a–z posuň o "posun" míst zpět, ostatní znaky nech být\n        vysledek += znak\n    return vysledek\n',
      solution: 'def desifruj(text, posun):\n    vysledek = ""\n    for znak in text:\n        if "a" <= znak <= "z":\n            poradi = (ord(znak) - ord("a") - posun) % 26\n            vysledek += chr(poradi + ord("a"))\n        else:\n            vysledek += znak\n    return vysledek\n',
      tests: [{ call: 'desifruj("khoor", 3)' }, { call: 'desifruj("abc", 3)' }, { call: 'desifruj("jirq m yrexril 7 mv 22:00", 17)' },
        { call: 'desifruj("", 5)', hidden: true }, { call: 'desifruj("a-z!", 1)', hidden: true }, { call: 'desifruj("kobra", 26)', hidden: true }, { call: 'desifruj("kobra", 0)', hidden: true }],
      bonus: { text: 'Přetečení abecedy vyřeš operátorem `%` (modulo)', check: c => nodes(c.ast, n => n.k === 'bin' && n.op === '%').length > 0 },
      hints: [
        '`ord("a")` je `97` a `chr(97)` je `"a"`. Pořadí písmene v abecedě (0–25) zjistíš jako `ord(znak) - ord("a")`.',
        'Posun zpět s přetečením: `(poradi - posun) % 26` – z „a“ posunutého o 3 zpět tak vznikne „x“.',
        '`if "a" <= znak <= "z":` … `vysledek += chr(nove_poradi + ord("a"))` … `else: vysledek += znak`'
      ],
      palette: ['if "a" <= znak <= "z":\n    |', 'else:\n    |', 'ord(znak)', 'chr(|)', ' % 26'],
      learn: ['Cyklus for prochází text znak po znaku. ord() převede znak na číslo, chr() číslo zpět na znak. Zbytek po dělení (%) „zabalí“ čísla do kruhu: (0 − 3) % 26 = 23.',
        'for znak in "abc":\n    print(znak, ord(znak))\n\nprint((0 - 3) % 26)   # 23\nprint(chr(97 + 23))   # x'],
      reward: 'Rozluštěno: „sraz v hangaru 7 ve 22:00“. Nora: „Víme kdy. Teď zjistíme, kdo za tím je – jdeme do logů serveru.“',
      wrong: [
        'def desifruj(text, posun):\n    vysledek = ""\n    for znak in text:\n        vysledek += chr(ord(znak) - posun)\n    return vysledek\n',
        'def desifruj(text, posun):\n    vysledek = ""\n    for znak in text:\n        if "a" <= znak <= "z":\n            vysledek += chr(ord(znak) - posun)\n        else:\n            vysledek += znak\n    return vysledek\n'
      ]
    },

    /* ================= SEKTOR 2 – ANALÝZA DAT ================= */
    {
      id: 5, sector: 2, code: 'LOGY', title: 'Stopy v logu', concept: 'list · append · řezy [a:b] · in',
      brief: [
        ['nora', 'Server zapisuje každé přihlášení do logu – seznamu řádků. Najdeš ho v záložce Data jako proměnnou `LOG`.'],
        ['nora', 'Řádek vypadá takhle: `2026-11-19 07:02:45 FAIL user=admin ip=185.220.101.4`. Znaky na indexech 11 až 18 jsou čas.'],
        ['nora', 'Napiš `casy_utoku(log)`, která vrátí seznam časů (HH:MM:SS) všech neúspěšných přihlášení (řádky s FAIL) – ve stejném pořadí jako v logu.']
      ],
      task: 'Pro každý řádek obsahující `"FAIL"` přidej do seznamu jeho čas `radek[11:19]`. Vrať seznam.',
      fn: 'casy_utoku',
      bonusSolution: 'def casy_utoku(log):\n    return [radek[11:19] for radek in log if "FAIL" in radek]\n',
      prelude: LOG,
      starter: '# LOG je seznam řádků – podívej se do záložky Data\n\ndef casy_utoku(log):\n    casy = []\n    for radek in log:\n        pass  # když je v řádku "FAIL", přidej do seznamu čas (řez radek[11:19])\n    return casy\n\nprint(LOG[1][11:19])   # vyzkoušej si řez\n',
      solution: 'def casy_utoku(log):\n    casy = []\n    for radek in log:\n        if "FAIL" in radek:\n            casy.append(radek[11:19])\n    return casy\n',
      tests: [{ call: 'casy_utoku(LOG)' }, { call: 'casy_utoku(LOG[:4])' }, { call: 'casy_utoku([])' }, { call: 'casy_utoku(LOG_NOC)', hidden: true }, { call: 'casy_utoku(LOG[4:7])', hidden: true }],
      bonus: { text: 'Vyřeš to jedním list comprehension (`[… for … in …]`)', check: c => { const d = fnDef(c.ast, 'casy_utoku'); return !!d && nodes(d.body, n => n.k === 'listcomp').length > 0; } },
      hints: [
        'Řez `radek[11:19]` vrátí znaky na indexech 11 až 18 – přesně čas.',
        '`"FAIL" in radek` je `True`, když řádek obsahuje FAIL.',
        '`if "FAIL" in radek: casy.append(radek[11:19])`'
      ],
      palette: ['if "FAIL" in radek:\n    |', 'casy.append(|)', 'radek[11:19]', '[radek[11:19] for radek in log if |]'],
      learn: ['Seznam (list) roste metodou append(). Řez text[a:b] vybere znaky od indexu a do b−1 (funguje i u seznamů). List comprehension zapíše cyklus s podmínkou na jeden řádek.',
        'cisla = [3, 8, 1, 9]\nvelka = [x for x in cisla if x > 5]   # [8, 9]\nprint("Kobra"[1:4])                 # obr'],
      reward: 'Nora: „Útoky přicházejí ve vlnách těsně po sedmé ráno. Teď zjistíme, z jakých adres.“',
      wrong: [
        'def casy_utoku(log):\n    casy = []\n    for radek in log:\n        if "FAIL" in radek:\n            casy.append(radek[11:18])\n    return casy\n',
        'def casy_utoku(log):\n    for radek in log:\n        if "FAIL" in radek:\n            return [radek[11:19]]\n    return []\n'
      ]
    },
    {
      id: 6, sector: 2, code: 'IPADRESY', title: 'Kdo útočí?', concept: 'dict · get() · split() · sorted()',
      brief: [
        ['nora', 'Víme kdy. Teď kdo. Útočník zkouší hesla z několika IP adres pořád dokola.'],
        ['nora', 'Napiš `podezrele_ip(log, limit)`: spočítej, kolik neúspěšných pokusů (FAIL) přišlo z každé IP adresy, a vrať abecedně seřazený seznam adres, které jich mají aspoň `limit`.'],
        ['nora', 'IP adresu z řádku dostaneš třeba takhle: `radek.split("ip=")[1]`.']
      ],
      task: 'Spočítej FAIL pokusy pro každou IP adresu (slovník) a vrať `sorted()` seznam adres s počtem ≥ `limit`.',
      fn: 'podezrele_ip',
      prelude: LOG,
      starter: 'def podezrele_ip(log, limit):\n    pocty = {}                  # slovník: ip -> počet FAIL\n    for radek in log:\n        if "FAIL" in radek:\n            ip = radek.split("ip=")[1]\n            # zvyš počet pro tuhle ip\n    vysledek = []\n    # vyber adresy, které mají počet >= limit\n    return sorted(vysledek)\n',
      solution: 'def podezrele_ip(log, limit):\n    pocty = {}\n    for radek in log:\n        if "FAIL" in radek:\n            ip = radek.split("ip=")[1]\n            pocty[ip] = pocty.get(ip, 0) + 1\n    vysledek = []\n    for ip in pocty:\n        if pocty[ip] >= limit:\n            vysledek.append(ip)\n    return sorted(vysledek)\n',
      tests: [{ call: 'podezrele_ip(LOG, 3)' }, { call: 'podezrele_ip(LOG, 2)' }, { call: 'podezrele_ip(LOG, 100)' },
        { call: 'podezrele_ip(LOG, 1)', hidden: true }, { call: 'podezrele_ip(LOG_NOC, 2)', hidden: true }, { call: 'podezrele_ip([], 1)', hidden: true }],
      bonus: { text: 'Počítej pomocí `slovnik.get(klic, 0)`', check: c => nodes(c.ast, n => n.k === 'call' && n.f.k === 'attr' && n.f.name === 'get').length > 0 },
      hints: [
        'Počítání ve slovníku: `pocty[ip] = pocty.get(ip, 0) + 1` – `get` vrátí `0`, když tam adresa ještě není.',
        'Slovník projdeš cyklem: `for ip in pocty: …` a počet je `pocty[ip]`.',
        'Nezapomeň výsledek seřadit – `sorted(vysledek)` už je ve startovním kódu.'
      ],
      palette: ['pocty[ip] = pocty.get(ip, 0) + 1', 'for ip in pocty:\n    |', 'if pocty[ip] >= limit:\n    |', 'vysledek.append(ip)'],
      learn: ['Slovník (dict) páruje klíče s hodnotami. Nejčastější použití: počítání výskytů – d[k] = d.get(k, 0) + 1. split("ip=") rozdělí text podle oddělovače na seznam částí.',
        'pocty = {}\nfor slovo in ["a", "b", "a"]:\n    pocty[slovo] = pocty.get(slovo, 0) + 1\nprint(pocty)   # {\'a\': 2, \'b\': 1}'],
      reward: 'Nora: „185.220.101.4 – to je Šakalův exit uzel. Blokujeme ho na firewallu. Firewall ale pravidla ukládá v bitech…“',
      wrong: [
        'def podezrele_ip(log, limit):\n    vysledek = []\n    for radek in log:\n        if "FAIL" in radek:\n            vysledek.append(radek.split("ip=")[1])\n    return sorted(vysledek)\n',
        'def podezrele_ip(log, limit):\n    pocty = {}\n    for radek in log:\n        ip = radek.split("ip=")[1]\n        pocty[ip] = pocty.get(ip, 0) + 1\n    return sorted([ip for ip in pocty if pocty[ip] >= limit])\n'
      ]
    },
    {
      id: 7, sector: 2, code: 'BITY', title: 'IP v bitech', concept: 'int() · format(n, "08b") · join()',
      brief: [
        ['nora', 'Firewall chce pravidla v binární podobě. IP adresa má čtyři čísla 0–255 a každé z nich je v počítači osm bitů.'],
        ['nora', 'Napiš `ip_na_bity(ip)`: z `"192.168.1.10"` udělej `"11000000.10101000.00000001.00001010"`. Každé číslo převeď na 8 bitů (zleva doplň nulami) a spoj tečkami.']
      ],
      task: 'Rozděl adresu podle teček, každou část převeď na číslo a pak na 8 bitů, výsledky spoj tečkami.',
      fn: 'ip_na_bity',
      bonusSolution: 'def ip_na_bity(ip):\n    return ".".join(format(int(c), "08b") for c in ip.split("."))\n',
      starter: 'def ip_na_bity(ip):\n    casti = ip.split(".")\n    bity = []\n    for cast in casti:\n        cislo = int(cast)\n        # převeď cislo na 8 bitů: format(cislo, "08b") nebo bin(cislo)[2:].zfill(8)\n    return ".".join(bity)\n\nprint(bin(10), format(10, "08b"))\n',
      solution: 'def ip_na_bity(ip):\n    casti = ip.split(".")\n    bity = []\n    for cast in casti:\n        cislo = int(cast)\n        bity.append(format(cislo, "08b"))\n    return ".".join(bity)\n',
      tests: [{ call: 'ip_na_bity("192.168.1.10")' }, { call: 'ip_na_bity("0.0.0.0")' }, { call: 'ip_na_bity("255.255.255.255")' },
        { call: 'ip_na_bity("10.0.0.1")', hidden: true }, { call: 'ip_na_bity("172.16.254.3")', hidden: true }, { call: 'ip_na_bity("8.8.4.4")', hidden: true }],
      bonus: { text: 'Celá funkce na jediném řádku (`return …`)', check: c => { const d = fnDef(c.ast, 'ip_na_bity'); return !!d && d.body.length === 1 && d.body[0].k === 'return'; } },
      hints: [
        '`int("192")` převede text na číslo `192`.',
        '`format(5, "08b")` vrátí `"00000101"` – binárně, na 8 míst, doplněno nulami. `bin(5)` vrací `"0b101"`.',
        '`bity.append(format(cislo, "08b"))` – a `".".join(bity)` je spojí tečkami.'
      ],
      palette: ['bity.append(|)', 'format(cislo, "08b")', 'bin(cislo)[2:].zfill(8)', '".".join(|)'],
      learn: ['V počítači je všechno v bitech. bin(10) → "0b1010", format(10, "08b") → "00001010" a int("1010", 2) → 10. IPv4 adresa = 4 bajty = 32 bitů.',
        'print(format(192, "08b"))    # 11000000\nprint(int("11000000", 2))   # 192\nprint(hex(255))             # 0xff'],
      reward: 'Nora: „Firewall přijal pravidlo. Šakal se ale teď tváří jako počítač z naší vnitřní sítě. Prověříme ho maskou.“',
      wrong: [
        'def ip_na_bity(ip):\n    return ".".join(bin(int(c))[2:] for c in ip.split("."))\n',
        'def ip_na_bity(ip):\n    return ".".join(bin(int(c)) for c in ip.split("."))\n'
      ]
    },
    {
      id: 8, sector: 2, code: 'MASKA', title: 'Stejná síť?', concept: 'bitové & · zip() · all()',
      brief: [
        ['nora', 'Dvě IP adresy jsou ve stejné síti, když mají po bitovém AND (`&`) s maskou podsítě stejný výsledek – a to ve všech čtyřech číslech.'],
        ['nora', 'Příklad: 192.168.1.10 a 192.168.1.200 s maskou 255.255.255.0 jsou ve stejné síti (192.168.1.x). 192.168.2.10 už ne.'],
        ['nora', 'Napiš `stejna_sit(ip1, ip2, maska)`, která vrátí `True` nebo `False`.']
      ],
      task: 'Pro každou ze 4 částí porovnej `a[i] & m[i]` s `b[i] & m[i]`. Při prvním rozdílu vrať `False`, jinak `True`.',
      fn: 'stejna_sit',
      bonusSolution: 'def stejna_sit(ip1, ip2, maska):\n    a = [int(x) for x in ip1.split(".")]\n    b = [int(x) for x in ip2.split(".")]\n    m = [int(x) for x in maska.split(".")]\n    return all(x & k == y & k for x, y, k in zip(a, b, m))\n',
      starter: 'def stejna_sit(ip1, ip2, maska):\n    a = [int(x) for x in ip1.split(".")]\n    b = [int(x) for x in ip2.split(".")]\n    m = [int(x) for x in maska.split(".")]\n    for i in range(4):\n        pass  # porovnej a[i] & m[i] s b[i] & m[i]\n    return True\n\nprint(200 & 255, 200 & 0, 12 & 10)\n',
      solution: 'def stejna_sit(ip1, ip2, maska):\n    a = [int(x) for x in ip1.split(".")]\n    b = [int(x) for x in ip2.split(".")]\n    m = [int(x) for x in maska.split(".")]\n    for i in range(4):\n        if a[i] & m[i] != b[i] & m[i]:\n            return False\n    return True\n',
      tests: [{ call: 'stejna_sit("192.168.1.10", "192.168.1.200", "255.255.255.0")' }, { call: 'stejna_sit("192.168.1.10", "192.168.2.10", "255.255.255.0")' },
        { call: 'stejna_sit("10.1.2.3", "10.200.0.1", "255.0.0.0")' },
        { call: 'stejna_sit("172.16.5.4", "172.16.9.9", "255.255.240.0")', hidden: true }, { call: 'stejna_sit("172.16.5.4", "172.16.20.9", "255.255.240.0")', hidden: true },
        { call: 'stejna_sit("192.168.1.1", "192.168.1.2", "255.255.255.255")', hidden: true }, { call: 'stejna_sit("1.2.3.4", "5.6.7.8", "0.0.0.0")', hidden: true }],
      bonus: { text: 'Použij `zip()` nebo `all()`', check: c => { const d = fnDef(c.ast, 'stejna_sit'); return callsName(d, 'zip') || callsName(d, 'all'); } },
      hints: [
        '`&` je bitové AND: `200 & 255 = 200`, `200 & 0 = 0`. V Pythonu má `&` přednost před porovnáním, takže `a & m != b & m` funguje.',
        'Stačí jeden rozdíl a adresy nejsou ve stejné síti → `return False` hned uvnitř cyklu.',
        '`if a[i] & m[i] != b[i] & m[i]: return False`'
      ],
      palette: ['if a[i] & m[i] != b[i] & m[i]:\n    |', 'return False', 'all(|)', 'zip(a, b, m)'],
      learn: ['Bitové operátory pracují s jednotlivými bity: & (AND), | (OR), ^ (XOR), << a >> (posun). Maska podsítě nechá jen bity, které určují síť. all() vrátí True, když jsou všechny hodnoty pravdivé.',
        'print(0b1100 & 0b1010)   # 8 (0b1000)\nprint(all(x > 0 for x in [1, 2, 3]))   # True'],
      reward: 'Nora: „Odhalen! Šakalův počítač do naší sítě nepatří. Sledovali jsme ho až k jeho trezoru. Čas na protiútok.“',
      wrong: [
        'def stejna_sit(ip1, ip2, maska):\n    return ip1.split(".")[:3] == ip2.split(".")[:3]\n',
        'def stejna_sit(ip1, ip2, maska):\n    a = [int(x) for x in ip1.split(".")]\n    b = [int(x) for x in ip2.split(".")]\n    m = [int(x) for x in maska.split(".")]\n    for i in range(4):\n        if a[i] & m[i] == b[i] & m[i]:\n            return True\n    return False\n'
      ]
    },

    /* ================= SEKTOR 3 – PROTIÚTOK ================= */
    {
      id: 9, sector: 3, code: 'TREZOR', title: 'Trezor', concept: 'hrubá síla · range() · zfill()',
      device: 'zamek',
      brief: [
        ['nora', 'Zajistili jsme Šakalův šifrovaný trezor (se soudním povolením, samozřejmě). Chrání ho čtyřmístný PIN – to je jen 10 000 možností.'],
        ['nora', 'K dispozici máš funkci `zamek(pin)`. Vrátí `True`, když je PIN správný. PIN je TEXT se čtyřmi číslicemi, třeba `"0042"`.'],
        ['nora', 'Napiš `najdi_pin()`, která vyzkouší PINy od `"0000"` do `"9999"` a vrátí ten správný.']
      ],
      task: 'Projdi čísla 0 až 9999, z každého udělej čtyřmístný text (42 → `"0042"`), vyzkoušej ho funkcí `zamek(pin)` a správný PIN vrať.',
      fn: 'najdi_pin',
      starter: '# zamek(pin) vrátí True, když je pin správný – pin je TEXT se 4 číslicemi, např. "0042"\n\ndef najdi_pin():\n    for cislo in range(10000):\n        pin = str(cislo)      # pozor: z čísla 42 musí být "0042"\n        # vyzkoušej pin pomocí zamek(pin)\n    return None\n\nprint(zamek("1234"))   # cvičný zámek – zkus si ho\n',
      solution: 'def najdi_pin():\n    for cislo in range(10000):\n        pin = str(cislo).zfill(4)\n        if zamek(pin):\n            return pin\n    return None\n',
      tests: [{ call: 'najdi_pin()', setup: { pin: '4821' } }, { call: 'najdi_pin()', setup: { pin: '0042' } }, { call: 'najdi_pin()', setup: { pin: '9999' } },
        { call: 'najdi_pin()', setup: { pin: '0000' }, hidden: true }, { call: 'najdi_pin()', setup: { pin: '1337' }, hidden: true }, { call: 'najdi_pin()', setup: { pin: '0700' }, hidden: true }],
      bonus: { text: 'Skonči hned, jak PIN najdeš (žádný pokus navíc)', check: c => c.tests.every(t => t.calls === parseInt(t.setup.pin, 10) + 1) },
      hints: [
        '`str(42)` je `"42"`, ale zámek chce `"0042"`. Použij `str(cislo).zfill(4)` nebo `f"{cislo:04d}"`.',
        '`if zamek(pin): return pin` – `return` ukončí funkci i cyklus.',
        'Celé: `for cislo in range(10000): pin = str(cislo).zfill(4); if zamek(pin): return pin`'
      ],
      palette: ['str(cislo).zfill(4)', 'f"{cislo:04d}"', 'if zamek(pin):\n    |', 'return pin'],
      learn: ['Útok hrubou silou (brute force) zkouší všechny možnosti. Čtyřmístný PIN má 10⁴ = 10 000 kombinací – počítač je projde za zlomek sekundy. Proto mají bezpečná hesla hodně znaků a systémy omezují počet pokusů.',
        'for i in range(3):\n    print(str(i).zfill(4))   # 0000, 0001, 0002\nprint(f"{7:04d}")            # 0007'],
      reward: 'Trezor otevřen! Uvnitř je Šakalův server – chrání ho ale ještě jeden kód. A ten má alarm.',
      wrong: [
        'def najdi_pin():\n    for cislo in range(10000):\n        if zamek(str(cislo)):\n            return str(cislo)\n    return None\n',
        'def najdi_pin():\n    for cislo in range(10000):\n        if zamek(cislo):\n            return cislo\n',
        'def najdi_pin():\n    nalezeny = None\n    for cislo in range(1, 10000):\n        pin = str(cislo).zfill(4)\n        if zamek(pin):\n            nalezeny = pin\n    return nalezeny\n'
      ]
    },
    {
      id: 10, sector: 3, code: 'PULENI', title: 'Půlení intervalu', concept: 'while · binární vyhledávání · //',
      device: 'hadej',
      brief: [
        ['nora', 'Šakalův server chrání kód – číslo od 1 do 1 000 000. Po 30 pokusech spustí alarm a smaže důkazy. Hrubá síla tady nestačí.'],
        ['nora', 'Funkce `hadej(n)` odpoví `"víc"` (kód je větší než n), `"míň"` (kód je menší) nebo `"správně"`.'],
        ['nora', 'Napiš `najdi_kod()`, která kód najde a vrátí ho. Fígl: zkus vždy číslo přesně uprostřed a podle odpovědi zahoď půlku možností.']
      ],
      task: 'Hledej půlením: drž si dolní a horní mez, zkus prostřední číslo a podle odpovědi posuň jednu z mezí. Vrať nalezený kód.',
      fn: 'najdi_kod',
      starter: '# hadej(n) vrátí "víc", "míň" nebo "správně"\n\ndef najdi_kod():\n    dolni = 1\n    horni = 1000000\n    # opakuj: zkus číslo uprostřed a podle odpovědi zahoď polovinu\n    return None\n\nprint(hadej(500000))   # cvičný server – zkus si ho\n',
      solution: 'def najdi_kod():\n    dolni = 1\n    horni = 1000000\n    while dolni <= horni:\n        stred = (dolni + horni) // 2\n        odpoved = hadej(stred)\n        if odpoved == "správně":\n            return stred\n        elif odpoved == "víc":\n            dolni = stred + 1\n        else:\n            horni = stred - 1\n    return None\n',
      tests: [{ call: 'najdi_kod()', setup: { secret: 777777 } }, { call: 'najdi_kod()', setup: { secret: 1 } }, { call: 'najdi_kod()', setup: { secret: 1000000 } },
        { call: 'najdi_kod()', setup: { secret: 500000 }, hidden: true }, { call: 'najdi_kod()', setup: { secret: 123456 }, hidden: true },
        { call: 'najdi_kod()', setup: { secret: 999999 }, hidden: true }, { call: 'najdi_kod()', setup: { secret: 2 }, hidden: true }],
      bonus: { text: 'Najdi kód vždy nejvýš na 20 pokusů', check: c => c.tests.every(t => t.calls <= 20) },
      hints: [
        'Prostřední číslo: `stred = (dolni + horni) // 2` – dvě lomítka dají celé číslo.',
        'Když je odpověď `"víc"`, kód je nad středem: `dolni = stred + 1`. Když `"míň"`: `horni = stred - 1`.',
        '`while dolni <= horni: stred = …; odpoved = hadej(stred); if odpoved == "správně": return stred …`'
      ],
      palette: ['while dolni <= horni:\n    |', 'stred = (dolni + horni) // 2', 'odpoved = hadej(stred)', 'if odpoved == "správně":\n    return stred', 'elif odpoved == "víc":\n    |'],
      learn: ['Půlení intervalu (binární vyhledávání) každým pokusem zahodí polovinu možností. Milion čísel tak prohledá na 20 pokusů (2²⁰ ≈ 1 048 576), hrubá síla by jich potřebovala až milion. Stejně rychle se hledá ve slovníku nebo v seřazeném seznamu.',
        'dolni, horni = 1, 100\nwhile dolni <= horni:\n    stred = (dolni + horni) // 2\n    ...'],
      reward: 'Kód přijat, alarm se nespustil. Na serveru je databáze hesel – jenže zahashovaných.',
      wrong: [
        'def najdi_kod():\n    for n in range(1, 1000001):\n        if hadej(n) == "správně":\n            return n\n',
        'def najdi_kod():\n    dolni = 1\n    horni = 1000000\n    while dolni <= horni:\n        stred = (dolni + horni) // 2\n        odpoved = hadej(stred)\n        if odpoved == "správně":\n            return stred\n        elif odpoved == "víc":\n            horni = stred - 1\n        else:\n            dolni = stred + 1\n'
      ]
    },
    {
      id: 11, sector: 3, code: 'HASH', title: 'Slovníkový útok', concept: 'funkce volají funkce · hash',
      brief: [
        ['nora', 'Hesla na Šakalově serveru nejsou uložená přímo, ale jako otisk (hash) – číslo, ze kterého se heslo zpátky spočítat nedá. Tak to dělá každý slušný systém.'],
        ['nora', 'Jenže lidé (i hackeři) používají běžná hesla. Spočítáme otisky hesel ze slovníku `SLOVNIK` a porovnáme je. Tomu se říká slovníkový útok.'],
        ['nora', 'Nejdřív `otisk(text)`: začni s h = 0 a pro každý znak spočítej `h = (h * 31 + ord(znak)) % 1000000007`. Pak `najdi_heslo(cil, slovnik)` vrátí slovo, jehož otisk je `cil` – nebo `None`.']
      ],
      task: '`otisk(text)` spočítá hash podle vzorce. `najdi_heslo(cil, slovnik)` projde slovník a vrátí slovo, jehož otisk se rovná `cil`; když žádné, vrátí `None`.',
      fn: 'najdi_heslo',
      prelude: 'SLOVNIK = ["123456", "heslo", "heslo123", "qwerty", "kobra", "admin", "password", "drak2026", "letmein", "sakal",\n           "praha", "iloveyou", "monkey", "abc123", "111111", "dragon", "master", "sunshine", "tajne", "pivo"]\n\n# otisky hesel nalezené v databázi Šakalova serveru\nOTISK_SERVER = 314192425\nOTISK_ZALOHA = 345166771\nOTISK_NEZNAMY = 753109851\n',
      starter: 'def otisk(text):\n    h = 0\n    # pro každý znak: h = (h * 31 + ord(znak)) % 1000000007\n    return h\n\ndef najdi_heslo(cil, slovnik):\n    # projdi slovník a porovnej otisk(slovo) s cil\n    return None\n\nprint(otisk("a"))   # má vyjít 97\n',
      solution: 'def otisk(text):\n    h = 0\n    for znak in text:\n        h = (h * 31 + ord(znak)) % 1000000007\n    return h\n\ndef najdi_heslo(cil, slovnik):\n    for slovo in slovnik:\n        if otisk(slovo) == cil:\n            return slovo\n    return None\n',
      tests: [{ call: 'otisk("a")' }, { call: 'otisk("kobra")' }, { call: 'najdi_heslo(OTISK_SERVER, SLOVNIK)' },
        { call: 'otisk("")', hidden: true }, { call: 'otisk("Šakal")', hidden: true }, { call: 'najdi_heslo(OTISK_ZALOHA, SLOVNIK)', hidden: true },
        { call: 'najdi_heslo(OTISK_NEZNAMY, SLOVNIK)', hidden: true }, { call: 'najdi_heslo(97, ["b", "a"])', hidden: true }],
      bonus: { text: '`najdi_heslo` používá tvoji funkci `otisk()`', check: c => callsName(fnDef(c.ast, 'najdi_heslo'), 'otisk') },
      hints: [
        '`for znak in text: h = (h * 31 + ord(znak)) % 1000000007`',
        'Ve funkci `najdi_heslo`: `for slovo in slovnik: if otisk(slovo) == cil: return slovo`',
        'Když cyklus doběhne a nic nenajde, vrať `None` (`return None` za cyklem).'
      ],
      palette: ['for znak in text:\n    |', 'h = (h * 31 + ord(znak)) % 1000000007', 'for slovo in slovnik:\n    |', 'if otisk(slovo) == cil:\n    return slovo'],
      learn: ['Hashovací funkce převede text na číslo: stejný vstup dá vždy stejný otisk, ale zpátky to nejde. Běžná hesla ale útočník „uhodne“ tak, že spočítá otisky slovníku a porovná je. Obrana: dlouhá neobvyklá hesla a „sůl“ (náhodný text přidaný k heslu před hashováním).',
        'def otisk(text):\n    h = 0\n    for znak in text:\n        h = (h * 31 + ord(znak)) % 1000000007\n    return h'],
      reward: 'Šakalovo heslo k serveru je „drak2026“. Jsme uvnitř. Nora: „Poslední zpráva Šakala je zašifrovaná – a posun tentokrát neznáme.“',
      wrong: [
        'def otisk(text):\n    h = 0\n    for znak in text:\n        h = h * 31 + ord(znak)\n    return h\n\ndef najdi_heslo(cil, slovnik):\n    for slovo in slovnik:\n        if otisk(slovo) == cil:\n            return slovo\n',
        'def otisk(text):\n    h = 0\n    for znak in text:\n        h = (h * 31 + ord(znak)) % 1000000007\n    return h\n\ndef najdi_heslo(cil, slovnik):\n    for slovo in slovnik:\n        if otisk(slovo) == cil:\n            return slovo\n        return None\n'
      ]
    },
    {
      id: 12, sector: 3, code: 'FINALE', title: 'Finále: Rozlousknutí', concept: 'skládání funkcí · hrubá síla',
      brief: [
        ['sakal', '>> ZACHYCENO: bjtju txwlr. yanmjejv turln. baji e yarbcjed en 4:00'],
        ['nora', 'Tohle je Šakalova poslední zpráva. Posun šifry neznáme – ale víme, že se vždycky podepisuje slovem „sakal“.'],
        ['nora', 'Napiš `rozlouskni(zprava)`: vyzkoušej všech 26 posunů a vrať tu dešifrovanou verzi, která obsahuje slovo `"sakal"`. Když žádná, vrať `None`. Použij svou funkci `desifruj` z mise 4 – zkopíruj ji sem.']
      ],
      task: 'Pro posun 0 až 25 dešifruj zprávu (funkcí `desifruj`). Když výsledek obsahuje `"sakal"`, vrať ho. Jinak vrať `None`.',
      fn: 'rozlouskni',
      prelude: 'ZPRAVA = "bjtju txwlr. yanmjejv turln. baji e yarbcjed en 4:00"\n',
      starter: 'def desifruj(text, posun):\n    # zkopíruj sem svoje řešení z mise 4\n    return text\n\ndef rozlouskni(zprava):\n    for posun in range(26):\n        pass  # dešifruj zprávu a zkontroluj, jestli obsahuje "sakal"\n    return None\n',
      solution: 'def desifruj(text, posun):\n    vysledek = ""\n    for znak in text:\n        if "a" <= znak <= "z":\n            vysledek += chr((ord(znak) - ord("a") - posun) % 26 + ord("a"))\n        else:\n            vysledek += znak\n    return vysledek\n\ndef rozlouskni(zprava):\n    for posun in range(26):\n        kandidat = desifruj(zprava, posun)\n        if "sakal" in kandidat:\n            return kandidat\n    return None\n',
      tests: [{ call: 'rozlouskni(ZPRAVA)' }, { call: 'rozlouskni("ovyt nvfvg: nzmqzm kvyiz j kpgijxd")' }, { call: 'rozlouskni("sakal")' },
        { call: 'rozlouskni("efisd utiunx yz sjsn")', hidden: true }, { call: 'rozlouskni("lzl gdrkn cqzj2026, rzjzk")', hidden: true }, { call: 'rozlouskni("")', hidden: true }],
      bonus: { text: '`rozlouskni` volá tvoji funkci `desifruj()`', check: c => callsName(fnDef(c.ast, 'rozlouskni'), 'desifruj') },
      hints: [
        'Zkopíruj funkci `desifruj` z mise 4 (celou, včetně `def`).',
        'V cyklu: `kandidat = desifruj(zprava, posun)` a pak `if "sakal" in kandidat: return kandidat`.',
        '`return None` patří až za cyklus – až když žádný posun nevyšel.'
      ],
      palette: ['kandidat = desifruj(zprava, posun)', 'if "sakal" in kandidat:\n    return kandidat', 'return None'],
      learn: ['Velké problémy se řeší skládáním malých funkcí: desifruj umí jednu věc, rozlouskni ji použije 26×. Caesarova šifra má jen 26 klíčů, takže se dá prolomit hrubou silou okamžitě. Moderní šifry mají klíčů tolik, že by je všechny počítače světa nevyzkoušely ani za miliardy let.',
        'def je_sude(n):\n    return n % 2 == 0\n\ndef suda(cisla):\n    return [n for n in cisla if je_sude(n)]'],
      reward: '„sakal konci. predavam klice. sraz v pristavu ve 4:00“ – Nora: „Máme ho. Policie už čeká v přístavu. Skvělá práce, agente. Operace Kobra je u konce.“',
      wrong: [
        'def desifruj(text, posun):\n    return text\n\ndef rozlouskni(zprava):\n    for posun in range(26):\n        kandidat = desifruj(zprava, posun)\n        if "sakal" in kandidat:\n            return kandidat\n    return None\n',
        'def desifruj(text, posun):\n    vysledek = ""\n    for znak in text:\n        if "a" <= znak <= "z":\n            vysledek += chr((ord(znak) - ord("a") - posun) % 26 + ord("a"))\n        else:\n            vysledek += znak\n    return vysledek\n\ndef rozlouskni(zprava):\n    for posun in range(25):\n        kandidat = desifruj(zprava, posun)\n        if "sakal" in kandidat:\n            return kandidat\n'
      ]
    }
  ];

  /* ---------------- kvíz (vstupní a výstupní test) ---------------- */
  const CONCEPTS = {
    fstring: 'Výpis a f-stringy',
    cond: 'Podmínky if / elif / else',
    logic: 'Logické operátory and / or / not',
    loop: 'Cyklus for a range()',
    strings: 'Indexy a řezy textu',
    lists: 'Seznamy (list)',
    dicts: 'Slovníky (dict)',
    types: 'Převody typů a soustavy',
    func: 'Funkce a return',
    errors: 'Čtení chybových hlášek'
  };
  const out = (q, code, a, c) => ({ c, q, code, a, ok: 0, codeAnswers: true, lang: 'python', alang: 'text' });
  const QUIZ = {
    A: [
      out('Co vypíše tento kód?', 'jmeno = "Ema"\nvek = 15\nprint(f"{jmeno} má {vek + 1} let")', ['Ema má 16 let', '{jmeno} má {vek + 1} let', 'Ema má vek + 1 let', 'Ema má 151 let'], 'fstring'),
      out('Co vypíše tento kód?', 'x = 12\nif x > 15:\n    print("A")\nelif x > 10:\n    print("B")\nelif x > 5:\n    print("C")\nelse:\n    print("D")', ['B', 'B a C', 'C', 'D'], 'cond'),
      out('Co vypíše tento kód?', 'print(not (3 > 2 and 2 > 5))', ['True', 'False', 'chybu', 'None'], 'logic'),
      out('Co vypíše tento kód?', 's = 0\nfor i in range(1, 5):\n    s += i\nprint(s)', ['10', '15', '4', '6'], 'loop'),
      out('Co vypíše tento kód?', 't = "python"\nprint(t[1:4])', ['yth', 'pyt', 'ytho', 'yt'], 'strings'),
      out('Co vypíše tento kód?', 'a = [3, 1, 2]\na.append(5)\nprint(len(a), a[-1])', ['4 5', '3 2', '4 2', '5 4'], 'lists'),
      out('Co vypíše tento kód?', 'd = {}\nfor z in "abba":\n    d[z] = d.get(z, 0) + 1\nprint(d["b"])', ['2', '1', '4', 'KeyError'], 'dicts'),
      out('Co vypíše tento kód?', 'print("5" + "3", int("5") + int("3"))', ['53 8', '8 8', '53 53', '8 53'], 'types'),
      out('Co vypíše tento kód?', 'def dvakrat(x):\n    return x * 2\n\nprint(dvakrat(dvakrat(3)))', ['12', '6', '9', 'None'], 'func'),
      { c: 'errors', q: 'Jakou chybu nahlásí Python u tohoto řádku?', code: 'print("Skóre: " + 10)', lang: 'python',
        a: ['TypeError – text a číslo nejde spojit pomocí +', 'SyntaxError – chybí závorka', 'NameError – Python nezná Skóre', 'Žádnou, vypíše Skóre: 10'], ok: 0 }
    ],
    B: [
      out('Co vypíše tento kód?', 'a = 4\nb = 5\nprint(f"{a} × {b} = {a * b}")', ['4 × 5 = 20', '{a} × {b} = {a * b}', '4 × 5 = a * b', 'a × b = 20'], 'fstring'),
      out('Co vypíše tento kód?', 'teplota = 25\nif teplota > 30:\n    print("horko")\nelif teplota > 20:\n    print("teplo")\nelif teplota > 10:\n    print("chladno")\nelse:\n    print("zima")', ['teplo', 'teplo a chladno', 'horko', 'chladno'], 'cond'),
      out('Co vypíše tento kód?', 'print(not (4 < 2 or 1 == 1))', ['False', 'True', 'chybu', 'None'], 'logic'),
      out('Co vypíše tento kód?', 's = 0\nfor i in range(2, 6):\n    s += i\nprint(s)', ['14', '20', '9', '5'], 'loop'),
      out('Co vypíše tento kód?', 't = "kobra"\nprint(t[-1] + t[:2])', ['ako', 'ko', 'aok', 'rko'], 'strings'),
      out('Co vypíše tento kód?', 'a = [1, 2, 3, 4]\na.pop()\na.append(9)\nprint(a)', ['[1, 2, 3, 9]', '[1, 2, 3, 4, 9]', '[9, 1, 2, 3]', '[2, 3, 4, 9]'], 'lists'),
      out('Co vypíše tento kód?', 'd = {"a": 1}\nd["b"] = 5\nd["a"] += 2\nprint(d)', ["{'a': 3, 'b': 5}", "{'a': 1, 'b': 5}", "{'a': 2, 'b': 5}", 'KeyError'], 'dicts'),
      out('Co vypíše tento kód?', 'print(int("101", 2), str(7) * 2)', ['5 77', '101 14', '5 14', '101 77'], 'types'),
      out('Co vypíše tento kód?', 'def f(x):\n    print(x + 1)\n\nv = f(3)\nprint(v)', ['4 a pak None', '4 a pak 4', 'jen 4', 'None a pak 4'], 'func'),
      { c: 'errors', q: 'Jakou chybu nahlásí Python u tohoto kódu?', code: 'seznam = [1, 2, 3]\nprint(seznam[3])', lang: 'python',
        a: ['IndexError – index 3 v seznamu neexistuje', 'KeyError – klíč 3 chybí', 'TypeError – špatný typ', 'Žádnou, vypíše 3'], ok: 0 }
    ]
  };

  /* ---------------- jak získat bonus: krátké vysvětlení (ukazuje se po splnění mise) ---------------- */
  const BONUS_HOW = {
    1: { how: 'f-string je text s písmenem `f` před uvozovkami. Proměnné píšeš rovnou do složených závorek a Python je do textu dosadí, i čísla bez převodu přes `str()`.', example: 'jmeno = "Ema"\nprint(f"Agent {jmeno} je online.")' },
    2: { how: 'Když podmínky na sebe navazují, nepiš tři samostatné `if`. Použij `elif` (jinak-když): Python je zkouší odshora a provede jen první, která platí.', example: 'if delka < 8:\n    return "slabé"\nelif delka < 12:\n    return "střední"\nelse:\n    return "silné"' },
    3: { how: 'Porovnání jako `hodina < 7` už samo vrací `True` nebo `False`. Takové výsledky můžeš spojit přes `and` a `or` a rovnou je vrátit, `if` vůbec není potřeba.', example: 'noc = hodina < 7 or hodina > 19\nreturn noc and zeme != "CZ"' },
    4: { how: 'Operátor `%` (modulo) vrací zbytek po dělení. `(poradi - posun) % 26` proto vždycky skončí mezi 0 a 25, i když posun přeteče přes začátek abecedy, a nemusíš řešit žádné `if`.', example: 'poradi = (ord(znak) - ord("a") - posun) % 26\nvysledek += chr(poradi + ord("a"))' },
    5: { how: 'List comprehension postaví celý seznam na jednom řádku: `[co for prvek in seznam if podmínka]`. Je to totéž jako cyklus s `append`, jen kratší.', example: 'casy = [radek[11:19] for radek in log if "FAIL" in radek]' },
    6: { how: '`slovnik.get(klic, 0)` vrátí hodnotu klíče, a když klíč ve slovníku ještě není, vrátí 0. Počítání pak zvládneš jedním řádkem bez `if klic in slovnik`.', example: 'pocty[ip] = pocty.get(ip, 0) + 1' },
    7: { how: 'Celou funkci jde napsat jako jeden `return`: rozděl IP podle teček, každé číslo převeď přes `format(cislo, "08b")` na osm bitů a spoj je zpátky přes `".".join(…)`.', example: 'return ".".join(format(int(c), "08b") for c in ip.split("."))' },
    8: { how: '`zip()` projde tři seznamy najednou, po trojicích. `all()` vrátí `True`, jen když platí podmínka pro všechny trojice. Odpadne ruční indexování a počítadlo.', example: 'return all(x & k == y & k for x, y, k in zip(a, b, m))' },
    9: { how: 'Jakmile `zamek(pin)` vrátí `True`, hned PIN vrať přes `return`. Funkce tím skončí a cyklus už nezkouší další pokusy.', example: 'for cislo in range(10000):\n    pin = str(cislo).zfill(4)\n    if zamek(pin):\n        return pin' },
    10: { how: 'Půlení intervalu: vždy se zeptej na prostředek rozsahu a podle odpovědi zahoď polovinu, kde kód být nemůže. Milion možností tak zmenšíš na jednu asi za 20 kroků.', example: 'stred = (dolni + horni) // 2\nif odpoved == "víc":\n    dolni = stred + 1\nelse:\n    horni = stred - 1' },
    11: { how: 'Uvnitř `najdi_heslo` nepočítej otisk znovu. Zavolej svoji funkci `otisk(slovo)`: kód se neopakuje a když opravíš `otisk`, oprava platí všude.', example: 'for slovo in slovnik:\n    if otisk(slovo) == cil:\n        return slovo' },
    12: { how: 'Ve finále neopisuj dešifrování znovu. Funkce `rozlouskni` zkouší posuny a pro každý zavolá tvoji funkci `desifruj(zprava, posun)`.', example: 'for posun in range(26):\n    kandidat = desifruj(zprava, posun)\n    if "sakal" in kandidat:\n        return kandidat' }
  };
  MISSIONS.forEach(m => Object.assign(m.bonus, BONUS_HOW[m.id] || {}));

  global.KobraContent = { SECTORS, MISSIONS, CONCEPTS, QUIZ };
})(typeof window !== 'undefined' ? window : globalThis);
