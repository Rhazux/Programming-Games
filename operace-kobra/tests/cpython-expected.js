/* Výstupy skutečného CPythonu 3.13.18 pro porovnání s interpretem Mini-Python (vygenerováno skriptem). */
window.CPYTHON_CASES = [
 {
  "name": "basics",
  "code": "x = 5\ny = 2\nprint(x + y, x - y, x * y, x / y, x // y, x % y, x ** y)\nprint(-7 // 2, -7 % 3, 7 % -3, 7.5 // 2, -7.5 % 2, 2 ** -1, 10 / 4)\nprint(1e16, 1e-5, 0.1 + 0.2, 1/3, 2.0, -0.0, 1e300 * 10, 123456789.123456789)\nprint(2 ** 100, 10 ** 20 // 3, -(2 ** 70) % 7)\nprint(True + True, True * 3, 5 & 3, 5 | 3, 5 ^ 3, ~5, 1 << 10, 1024 >> 3)\nprint(int(\"42\"), int(\" -7 \"), int(3.99), int(-3.99), float(\"2.5\"), float(3), int(\"101\", 2), int(\"ff\", 16), int(\"0x1F\", 16))\nprint(bin(10), hex(255), oct(8), bin(-5))\nprint(round(2.5), round(3.5), round(-2.5), round(2.675, 2), round(0.125, 2), round(1.005, 2), round(7.0), round(3.14159, 3), round(1234, -2))\nprint(abs(-3), abs(-2.5), divmod(17, 5), divmod(-17, 5), pow(2, 10), pow(3, 4, 5), max(3, 8, 1), min([4, 2, 9]))\n",
  "out": "7 3 10 2.5 2 1 25\n-4 2 -2 3.0 0.5 0.5 2.5\n1e+16 1e-05 0.30000000000000004 0.3333333333333333 2.0 -0.0 1e+301 123456789.12345679\n1267650600228229401496703205376 33333333333333333333 5\n2 3 1 7 6 -6 1024 128\n42 -7 3 -3 2.5 3.0 5 255 31\n0b1010 0xff 0o10 -0b101\n2 4 -2 2.67 0.12 1.0 7 3.142 1200\n3 2.5 (3, 2) (-4, 3) 1024 1 8 2\n",
  "err": ""
 },
 {
  "name": "strings",
  "code": "s = \"Ahoj, světe!\"\nprint(s.upper(), s.lower(), len(s), s[0], s[-1], s[2:6], s[::-1], s[::2], s[-5:])\nprint(s.replace(\"o\", \"0\"), s.split(\",\"), s.find(\"s\"), s.find(\"xyz\"), s.count(\"o\"), \"o\" in s)\nprint(\"  pad  \".strip(), \"--x--\".strip(\"-\"), \"abc\".startswith(\"ab\"), \"abc\".endswith((\"x\", \"c\")))\nprint(\",\".join([\"a\", \"b\", \"c\"]), \"a b  c\".split(), \"a,b,,c\".split(\",\"), \"x=1=2\".split(\"=\", 1))\nprint(\"python\".capitalize(), \"hello world\".title(), \"they're bill's\".title(), \"AbC\".swapcase())\nprint(\"42\".isdigit(), \"4.2\".isdigit(), \"abc\".isalpha(), \"ěšč\".isalpha(), \"abc1\".isalnum(), \"   \".isspace(), \"ABC\".isupper(), \"abc\".islower())\nprint(\"7\".zfill(3), \"-7\".zfill(4), \"ab\".center(7, \"*\"), \"ab\".ljust(5, \".\"), \"ab\".rjust(5), \"abc\".center(6))\nprint(repr(\"it's\"), repr('say \"hi\"'), repr(\"tab\\there\"), repr(\"new\\nline\"), repr(\"both ' and \\\"\"))\nprint(\"a\" * 3, 3 * \"ab\", \"x\" + \"y\", \"abc\" < \"abd\", \"Z\" < \"a\", ord(\"A\"), chr(97), ord(\"č\"))\nprint(\"{} + {} = {}\".format(1, 2, 3), \"{0}{1}{0}\".format(\"a\", \"b\"), \"{x}-{y}\".format(x=1, y=2), \"{:>5}|{:<5}|{:^5}|\".format(\"a\", \"b\", \"c\"))\nprint(\"%d let, %.2f m, %s\" % (15, 1.756, \"ok\"), \"%5d|\" % 42, \"%-5s|\" % \"ab\")\n",
  "out": "AHOJ, SVĚTE! ahoj, světe! 12 A ! oj,  !etěvs ,johA Ao,sěe věte!\nAh0j, světe! ['Ahoj', ' světe!'] 6 -1 1 True\npad x True True\na,b,c ['a', 'b', 'c'] ['a', 'b', '', 'c'] ['x', '1=2']\nPython Hello World They'Re Bill'S aBc\nTrue False True True True True True True\n007 -007 ***ab** ab...    ab  abc  \n\"it's\" 'say \"hi\"' 'tab\\there' 'new\\nline' 'both \\' and \"'\naaa ababab xy True True 65 a 269\n1 + 2 = 3 aba 1-2     a|b    |  c  |\n15 let, 1.76 m, ok    42| ab   |\n",
  "err": ""
 },
 {
  "name": "fstrings",
  "code": "jmeno = \"Ema\"\ncislo = 7\npi = 3.14159265\nprint(f\"Agent {jmeno} (č. {cislo})\", f\"{cislo:03d}\", f\"{pi:.2f}\", f\"{pi:8.3f}|\", f\"{jmeno:>6}|\", f\"{jmeno!r}\")\nprint(f\"{255:08b}\", f\"{255:x}\", f\"{255:#x}\", f\"{1234567:,}\", f\"{0.256:.1%}\", f\"{-5:+d}\", f\"{5:+d}\", f\"{3.0}\", f\"{10/3}\")\nprint(f\"{{doslova}}\", f\"{[1, 2][0]}\", f\"{'a' if cislo > 5 else 'b'}\", f\"{len(jmeno) * 2}\", f\"{jmeno.upper()}\")\nw = 10\nprint(f\"{pi:{w}.2f}|\", f\"{cislo=}\", f\"{1e20}\", f\"{12345.6789:e}\", f\"{0.00012345:g}\", f\"{123456789.0:g}\")\nprint(format(5, \"08b\"), format(3.14159, \".3f\"), format(\"x\", \"^5\"), format(1234.5, \",.1f\"))\n",
  "out": "Agent Ema (č. 7) 007 3.14    3.142|    Ema| 'Ema'\n11111111 ff 0xff 1,234,567 25.6% -5 +5 3.0 3.3333333333333335\n{doslova} 1 a 6 EMA\n      3.14| cislo=7 1e+20 1.234568e+04 0.00012345 1.23457e+08\n00000101 3.142   x   1,234.5\n",
  "err": ""
 },
 {
  "name": "lists",
  "code": "a = [3, 1, 4, 1, 5]\na.append(9)\na.insert(0, 2)\nprint(a, len(a), a[1:3], a[-2:], a[::-1], sorted(a), sorted(a, reverse=True), a.index(4), a.count(1))\na.sort()\nprint(a, a.pop(), a.pop(0), a)\na.remove(1)\nprint(a, sum(a), min(a), max(a), 4 in a, 7 not in a)\nb = a + [10, 11]\nb.extend(range(3))\nprint(b, b * 0, [0] * 3, list(\"abc\"), list(range(2, 10, 3)), list(range(5, 0, -2)))\nc = [[1, 2], [3, 4]]\nprint(c[1][0], [x * 2 for x in range(5)], [x for x in range(10) if x % 3 == 0], [(i, j) for i in range(2) for j in range(2)])\nm = [1, 2, 3]\nm[1] = 20\nm[0:2] = [7, 8, 9]\ndel m[-1]\nprint(m, m == [7, 8, 9], [1, 2] < [1, 3], [] == [], list(reversed([1, 2, 3])))\nx, y = 1, 2\nx, y = y, x\nfirst, *rest = [1, 2, 3, 4]\nprint(x, y, first, rest)\nwords = [\"kobra\", \"Ahoj\", \"zebra\", \"auto\"]\nprint(sorted(words), sorted(words, key=len), sorted(words, key=str.lower), max(words, key=len), min(words, key=lambda w: w[-1]))\n",
  "out": "[2, 3, 1, 4, 1, 5, 9] 7 [3, 1] [5, 9] [9, 5, 1, 4, 1, 3, 2] [1, 1, 2, 3, 4, 5, 9] [9, 5, 4, 3, 2, 1, 1] 3 2\n[1, 2, 3, 4, 5] 9 1 [1, 2, 3, 4, 5]\n[2, 3, 4, 5] 14 2 5 True True\n[2, 3, 4, 5, 10, 11, 0, 1, 2] [] [0, 0, 0] ['a', 'b', 'c'] [2, 5, 8] [5, 3, 1]\n3 [0, 2, 4, 6, 8] [0, 3, 6, 9] [(0, 0), (0, 1), (1, 0), (1, 1)]\n[7, 8, 9] True True True [3, 2, 1]\n2 1 1 [2, 3, 4]\n['Ahoj', 'auto', 'kobra', 'zebra'] ['Ahoj', 'auto', 'kobra', 'zebra'] ['Ahoj', 'auto', 'kobra', 'zebra'] kobra kobra\n",
  "err": ""
 },
 {
  "name": "dicts",
  "code": "d = {\"a\": 1, \"b\": 2}\nd[\"c\"] = 3\nd[\"a\"] += 10\nprint(d, len(d), d[\"b\"], d.get(\"x\"), d.get(\"x\", 0), \"a\" in d, list(d), list(d.keys()), list(d.values()))\nprint(d.keys(), d.values(), d.items())\nfor k, v in d.items():\n    print(k, v)\nprint(d.pop(\"b\"), d, sorted(d.items(), key=lambda kv: -kv[1]))\ncnt = {}\nfor ch in \"abrakadabra\":\n    cnt[ch] = cnt.get(ch, 0) + 1\nprint(cnt, max(cnt, key=cnt.get), {k: v for k, v in cnt.items() if v > 1})\nd2 = dict(zip([\"x\", \"y\"], [1, 2]))\nd2.update({\"z\": 3})\nprint(d2, dict(a=1, b=2), {1: \"int\", 1.0: \"float\", True: \"bool\"})\nnested = {\"ip\": [\"10.0.0.1\", \"10.0.0.2\"], \"n\": {\"x\": 1}}\nprint(nested[\"ip\"][1], nested[\"n\"][\"x\"], d2.setdefault(\"w\", 0), d2)\n",
  "out": "{'a': 11, 'b': 2, 'c': 3} 3 2 None 0 True ['a', 'b', 'c'] ['a', 'b', 'c'] [11, 2, 3]\ndict_keys(['a', 'b', 'c']) dict_values([11, 2, 3]) dict_items([('a', 11), ('b', 2), ('c', 3)])\na 11\nb 2\nc 3\n2 {'a': 11, 'c': 3} [('a', 11), ('c', 3)]\n{'a': 5, 'b': 2, 'r': 2, 'k': 1, 'd': 1} a {'a': 5, 'b': 2, 'r': 2}\n{'x': 1, 'y': 2, 'z': 3} {'a': 1, 'b': 2} {1: 'bool'}\n10.0.0.2 1 0 {'x': 1, 'y': 2, 'z': 3, 'w': 0}\n",
  "err": ""
 },
 {
  "name": "sets_tuples",
  "code": "s = {3, 1, 2, 3}\ns.add(5)\ns.discard(10)\nprint(sorted(s), len(s), 2 in s, sorted(s | {9}), sorted(s & {1, 5, 7}), sorted(s - {1}), set(), set(\"aab\") == {\"a\", \"b\"})\nt = (1, 2, 3)\nprint(t, t[1], t[-1], len(t), (1,), (), t + (4,), t * 2, t.count(2), t.index(3), tuple([1, 2]), (1, 2) < (1, 3))\na, b, c = t\nprint(a + b + c, type(t), type(s), isinstance(t, tuple))\n",
  "out": "[1, 2, 3, 5] 4 True [1, 2, 3, 5, 9] [1, 5] [2, 3, 5] set() True\n(1, 2, 3) 2 3 3 (1,) () (1, 2, 3, 4) (1, 2, 3, 1, 2, 3) 1 2 (1, 2) True\n6 <class 'tuple'> <class 'set'> True\n",
  "err": ""
 },
 {
  "name": "control",
  "code": "for i in range(3):\n    if i == 1:\n        continue\n    print(\"i\", i)\nelse:\n    print(\"hotovo\")\nn = 0\nwhile True:\n    n += 1\n    if n > 4:\n        break\nprint(n)\nfor i in range(3):\n    pass\nprint(i)\nx = 15\nif x > 20:\n    print(\"velké\")\nelif x > 10:\n    print(\"střední\")\nelse:\n    print(\"malé\")\nprint(\"ano\" if x % 2 else \"ne\", x > 10 and x < 20, 10 < x < 20, not x, x or 0, 0 or \"default\", None and 1, [] or [1])\nfor i, ch in enumerate(\"abc\", start=1):\n    print(i, ch, end=\" \")\nprint()\nfor a, b in zip([1, 2, 3], \"xy\"):\n    print(a, b, sep=\"-\")\n",
  "out": "i 0\ni 2\nhotovo\n5\n2\nstřední\nano True True False 15 default None [1]\n1 a 2 b 3 c \n1-x\n2-y\n",
  "err": ""
 },
 {
  "name": "functions",
  "code": "def soucet(a, b=10):\n    return a + b\nprint(soucet(1), soucet(1, 2), soucet(b=5, a=1))\ndef fakt(n):\n    if n <= 1:\n        return 1\n    return n * fakt(n - 1)\nprint(fakt(20), fakt(30))\ndef nic():\n    pass\nprint(nic())\ndef vnejsi():\n    x = 1\n    def vnitrni():\n        return x + 1\n    return vnitrni()\nprint(vnejsi())\ncounter = 0\ndef inc():\n    global counter\n    counter += 1\ninc(); inc()\nprint(counter)\ndef mk(n):\n    def add(x):\n        return x + n\n    return add\nplus5 = mk(5)\nprint(plus5(10), (lambda x, y=2: x * y)(4), list(map(lambda x: x ** 2, [1, 2, 3])), list(filter(None, [0, 1, \"\", \"a\"])))\ndef multi():\n    return 1, 2\nq, w = multi()\nprint(q, w, multi())\ndef kw_only(a, *args, **kwargs):\n    return a, args, kwargs\nprint(kw_only(1, 2, 3, x=4))\ndef counter_fn():\n    c = 0\n    def step():\n        nonlocal c\n        c += 1\n        return c\n    step(); step()\n    return step()\nprint(counter_fn())\n",
  "out": "11 3 6\n2432902008176640000 265252859812191058636308480000000\nNone\n2\n2\n15 8 [1, 4, 9] [1, 'a']\n1 2 (1, 2)\n(1, (2, 3), {'x': 4})\n3\n",
  "err": ""
 },
 {
  "name": "exceptions",
  "code": "try:\n    int(\"abc\")\nexcept ValueError as e:\n    print(\"chyba:\", e)\ntry:\n    [1, 2][5]\nexcept (KeyError, IndexError) as e:\n    print(type(e).__name__, e)\ntry:\n    {}[\"x\"]\nexcept KeyError as e:\n    print(\"KeyError\", e, repr(e))\ntry:\n    1 / 0\nexcept ZeroDivisionError:\n    print(\"nulou\")\nfinally:\n    print(\"finally\")\ndef f():\n    try:\n        return \"try\"\n    finally:\n        print(\"cleanup\")\nprint(f())\ntry:\n    raise ValueError(\"vlastní\")\nexcept Exception as e:\n    print(e, e.args)\ntry:\n    try:\n        x = 1 / 0\n    except ZeroDivisionError:\n        raise\nexcept ZeroDivisionError as e:\n    print(\"re-raise\", e)\ntry:\n    pass\nexcept ValueError:\n    print(\"ne\")\nelse:\n    print(\"else\")\ntry:\n    assert 1 == 2, \"nesedí\"\nexcept AssertionError as e:\n    print(\"assert\", e)\n",
  "out": "chyba: invalid literal for int() with base 10: 'abc'\nIndexError list index out of range\nKeyError 'x' KeyError('x')\nnulou\nfinally\ncleanup\ntry\nvlastní ('vlastní',)\nre-raise division by zero\nelse\nassert nesedí\n",
  "err": ""
 },
 {
  "name": "builtins_misc",
  "code": "import math\nimport string\nfrom math import sqrt, floor\nprint(math.sqrt(16), sqrt(2), floor(3.7), math.ceil(3.2), math.pi, math.gcd(12, 18), math.factorial(10), math.floor(-2.5))\nprint(string.ascii_lowercase, string.digits)\nprint(any([0, 0, 1]), all([1, 1, 0]), any([]), all([]), sum([0.1] * 10), sum([1, 2, 3], 10), sum([]))\nprint(type(1), type(1.0), type(\"a\"), type([]), type({}), type(None), type(True), type(range(3)), type(len))\nprint(isinstance(True, int), isinstance(1, (str, int)), isinstance(\"a\", list), callable(len))\nprint(len(range(10)), range(0, 10, 2)[2], list(range(10))[-1], 5 in range(10), range(5), range(1, 10, 3))\nprint(str(None), str([1, \"a\"]), str({\"k\": [1.5]}), bool(\"\"), bool(\"0\"), bool(0.0), bool([0]), list({\"a\": 1}))\nprint(sorted(\"kobra\"), \"\".join(sorted(\"kobra\")), list(map(int, \"123\")), list(map(str, [1, 2])), [int(c) for c in \"0110\"])\nprint(max([], default=0), min(\"hello\"), sorted([3, 1, 2], key=lambda v: -v), list(zip(\"ab\", range(5))), dict(enumerate(\"xy\")))\nprint(chr(ord(\"a\") + 3), [chr(65 + i) for i in range(5)], ord(\"Z\") - ord(\"A\"))\n",
  "out": "4.0 1.4142135623730951 3 4 3.141592653589793 6 3628800 -3\nabcdefghijklmnopqrstuvwxyz 0123456789\nTrue False False True 1.0 16 0\n<class 'int'> <class 'float'> <class 'str'> <class 'list'> <class 'dict'> <class 'NoneType'> <class 'bool'> <class 'range'> <class 'builtin_function_or_method'>\nTrue True False True\n10 4 9 True range(0, 5) range(1, 10, 3)\nNone [1, 'a'] {'k': [1.5]} False True False True ['a']\n['a', 'b', 'k', 'o', 'r'] abkor [1, 2, 3] ['1', '2'] [0, 1, 1, 0]\n0 e [3, 2, 1] [('a', 0), ('b', 1)] {0: 'x', 1: 'y'}\nd ['A', 'B', 'C', 'D', 'E'] 25\n",
  "err": ""
 },
 {
  "name": "errors_name",
  "code": "print(neexistuje)\n",
  "out": "",
  "err": "NameError: name 'neexistuje' is not defined"
 },
 {
  "name": "errors_concat",
  "code": "print(\"věk: \" + 15)\n",
  "out": "",
  "err": "TypeError: can only concatenate str (not \"int\") to str"
 },
 {
  "name": "errors_index",
  "code": "a = [1, 2, 3]\nprint(a[3])\n",
  "out": "",
  "err": "IndexError: list index out of range"
 },
 {
  "name": "errors_key",
  "code": "d = {\"a\": 1}\nprint(d[\"b\"])\n",
  "out": "",
  "err": "KeyError: 'b'"
 },
 {
  "name": "errors_type_cmp",
  "code": "print(\"5\" < 3)\n",
  "out": "",
  "err": "TypeError: '<' not supported between instances of 'str' and 'int'"
 },
 {
  "name": "errors_int",
  "code": "int(\"12a\")\n",
  "out": "",
  "err": "ValueError: invalid literal for int() with base 10: '12a'"
 },
 {
  "name": "errors_attr",
  "code": "x = [1]\nx.push(2)\n",
  "out": "",
  "err": "AttributeError: 'list' object has no attribute 'push'"
 },
 {
  "name": "errors_args",
  "code": "def f(a, b):\n    return a + b\nf(1)\n",
  "out": "",
  "err": "TypeError: f() missing 1 required positional argument: 'b'"
 },
 {
  "name": "errors_args2",
  "code": "def f(a):\n    return a\nf(1, 2)\n",
  "out": "",
  "err": "TypeError: f() takes 1 positional argument but 2 were given"
 },
 {
  "name": "errors_unbound",
  "code": "x = 1\ndef g():\n    x += 1\ng()\n",
  "out": "",
  "err": "UnboundLocalError: cannot access local variable 'x' where it is not associated with a value"
 },
 {
  "name": "errors_zero",
  "code": "print(5 // 0)\n",
  "out": "",
  "err": "ZeroDivisionError: integer division or modulo by zero"
 },
 {
  "name": "errors_iter",
  "code": "for i in 5:\n    print(i)\n",
  "out": "",
  "err": "TypeError: 'int' object is not iterable"
 },
 {
  "name": "errors_none",
  "code": "def f():\n    x = 1\nv = f()\nprint(v[0])\n",
  "out": "",
  "err": "TypeError: 'NoneType' object is not subscriptable"
 },
 {
  "name": "errors_strassign",
  "code": "s = \"abc\"\ns[0] = \"x\"\n",
  "out": "",
  "err": "TypeError: 'str' object does not support item assignment"
 },
 {
  "name": "errors_add_none",
  "code": "print(None + 1)\n",
  "out": "",
  "err": "TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'"
 },
 {
  "name": "errors_recursion",
  "code": "def r(n):\n    return r(n + 1)\nr(0)\n",
  "out": "",
  "err": "RecursionError: maximum recursion depth exceeded"
 },
 {
  "name": "syntax_colon",
  "code": "if True\n    print(\"x\")\n",
  "out": "",
  "err": "SyntaxError: expected ':'"
 },
 {
  "name": "syntax_eq",
  "code": "x = 1\nif x = 1:\n    print(x)\n",
  "out": "",
  "err": "SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='?"
 },
 {
  "name": "syntax_indent",
  "code": "def f():\nprint(\"x\")\n",
  "out": "",
  "err": "IndentationError: expected an indented block after function definition on line 1"
 },
 {
  "name": "syntax_unexpected_indent",
  "code": "x = 1\n    y = 2\n",
  "out": "",
  "err": "IndentationError: unexpected indent"
 },
 {
  "name": "syntax_paren",
  "code": "print(\"ahoj\"\n",
  "out": "",
  "err": "SyntaxError: '(' was never closed"
 },
 {
  "name": "syntax_string",
  "code": "print(\"ahoj)\n",
  "out": "",
  "err": "SyntaxError: unterminated string literal (detected at line 1)"
 },
 {
  "name": "syntax_print2",
  "code": "print \"ahoj\"\n",
  "out": "",
  "err": "SyntaxError: Missing parentheses in call to 'print'. Did you mean print(...)?"
 },
 {
  "name": "syntax_unindent",
  "code": "if True:\n        x = 1\n    y = 2\n",
  "out": "",
  "err": "IndentationError: unindent does not match any outer indentation level"
 },
 {
  "name": "syntax_return",
  "code": "return 5\n",
  "out": "",
  "err": "SyntaxError: 'return' outside function"
 },
 {
  "name": "syntax_comma",
  "code": "print([1 2])\n",
  "out": "",
  "err": "SyntaxError: invalid syntax. Perhaps you forgot a comma?"
 },
 {
  "name": "syntax_assign_literal",
  "code": "5 = x\n",
  "out": "",
  "err": "SyntaxError: cannot assign to literal here. Maybe you meant '==' instead of '='?"
 },
 {
  "name": "misc_big",
  "code": "n = 1\nfor i in range(1, 60):\n    n *= i\nprint(n, n % 1000007, len(str(n)), str(n)[:10])\nh = 0\nfor ch in \"kobra\":\n    h = (h * 31 + ord(ch)) % 1000000007\nprint(h)\nprint(0.1 * 3, 1.1 + 2.2, 3.0 * 1.1, 100 * 1.1, 2 ** 0.5, 10 ** 15 + 0.5, 1e15 + 0.3, 5e-324, 1.7976931348623157e308)\nprint(float(\"inf\"), -float(\"inf\"), float(\"nan\") == float(\"nan\"), 7 / 2 == 3.5, 1 == 1.0, hash(1) == hash(1.0))\nprint([1, [2, [3]]], {\"a\": (1, 2)}, ((1,),), [None, True, 1.5, \"x\"])\nprint(int(True), float(False), str(3.0), repr(3.10), 3.10, 1_000_000, 0b1010, 0o17, 0xFF)\n",
  "out": "138683118545689835737939019720389406345902876772687432540821294940160000000000000 369576 81 1386831185\n102221357\n0.30000000000000004 3.3000000000000003 3.3000000000000003 110.00000000000001 1.4142135623730951 1000000000000000.5 1000000000000000.2 5e-324 1.7976931348623157e+308\ninf -inf False True True True\n[1, [2, [3]]] {'a': (1, 2)} ((1,),) [None, True, 1.5, 'x']\n1 0.0 3.0 3.1 3.1 1000000 10 15 255\n",
  "err": ""
 },
 {
  "name": "misc_slicing",
  "code": "s = \"0123456789\"\nprint(s[2:8:2], s[8:2:-2], s[-3:], s[:-3], s[100:], s[-100:2], s[::3], s[5:1], s[::-3])\nlst = list(range(10))\nprint(lst[2:8:2], lst[8:2:-2], lst[-3:], lst[:-3], lst[::-1][:3])\nip = \"192.168.1.10\"\nprint(ip.split(\".\"), [int(x) for x in ip.split(\".\")], \".\".join(format(int(x), \"08b\") for x in ip.split(\".\")))\nprint([int(a) & int(b) for a, b in zip(\"192.168.1.10\".split(\".\"), \"255.255.255.0\".split(\".\"))])\n",
  "out": "246 864 789 0123456  01 0369  9630\n[2, 4, 6] [8, 6, 4] [7, 8, 9] [0, 1, 2, 3, 4, 5, 6] [9, 8, 7]\n['192', '168', '1', '10'] [192, 168, 1, 10] 11000000.10101000.00000001.00001010\n[192, 168, 1, 0]\n",
  "err": ""
 },
 {
  "name": "misc_scope",
  "code": "x = 10\ndef f():\n    return x * 2\nprint(f())\ndef g():\n    x = 5\n    return [x + i for i in range(3)]\nprint(g(), x)\ntotal = sum(i * i for i in range(5))\nprint(total, [i for i in range(3)], {i: i * i for i in range(3)}, {i % 2 for i in range(5)})\nsquares = list(map(lambda v: v * v, range(4)))\nprint(squares)\n",
  "out": "20\n[5, 6, 7] 10\n30 [0, 1, 2] {0: 0, 1: 1, 2: 4} {0, 1}\n[0, 1, 4, 9]\n",
  "err": ""
 },
 {
  "name": "misc_while",
  "code": "cislo = 1000000\nkroky = 0\nlo, hi = 1, 1000000\ntajne = 777777\nwhile lo <= hi:\n    kroky += 1\n    mid = (lo + hi) // 2\n    if mid == tajne:\n        break\n    elif mid < tajne:\n        lo = mid + 1\n    else:\n        hi = mid - 1\nprint(mid, kroky)\nfor pin in range(10000):\n    kod = str(pin).zfill(4)\n    if kod == \"4821\":\n        print(\"PIN\", kod, f\"{pin:04d}\")\n        break\n",
  "out": "777777 17\nPIN 4821 4821\n",
  "err": ""
 },
 {
  "name": "misc_print",
  "code": "print(1, 2, 3, sep=\", \", end=\"!\\n\")\nprint(\"a\", \"b\", sep=\"\")\nprint()\nprint(\"x\", end=\"\")\nprint(\"y\")\nprint(None, True, False, [], {}, (), set(), \"\")\nprint([1.0, 2.5, -0.5, 1e-7, 1e22], (0.1, 1/3))\nprint(len(\"ěščřžýáíé\"), \"ěščř\".upper(), \"ĚŠČ\".lower(), sorted([\"č\", \"c\", \"d\"]))\n",
  "out": "1, 2, 3!\nab\n\nxy\nNone True False [] {} () set() \n[1.0, 2.5, -0.5, 1e-07, 1e+22] (0.1, 0.3333333333333333)\n9 ĚŠČŘ ěšč ['c', 'd', 'č']\n",
  "err": ""
 },
 {
  "name": "trace_in_function",
  "code": "def vydel(a, b):\n    return a / b\ndef spocitej(seznam):\n    vysledky = []\n    for x in seznam:\n        vysledky.append(vydel(10, x))\n    return vysledky\nprint(spocitej([1, 2, 0]))\n",
  "out": "",
  "err": "ZeroDivisionError: division by zero"
 },
 {
  "name": "mission_caesar",
  "code": "def desifruj(text, posun):\n    vysledek = \"\"\n    for znak in text:\n        if \"a\" <= znak <= \"z\":\n            vysledek += chr((ord(znak) - ord(\"a\") - posun) % 26 + ord(\"a\"))\n        elif \"A\" <= znak <= \"Z\":\n            vysledek += chr((ord(znak) - ord(\"A\") - posun) % 26 + ord(\"A\"))\n        else:\n            vysledek += znak\n    return vysledek\nprint(desifruj(\"Nreud xwrfl r 22:00!\", 17))\nprint(desifruj(\"Khoor, Zruog\", 3), desifruj(\"abc\", 0), desifruj(\"abc\", 26), desifruj(\"abc\", -1))\n",
  "out": "Wandm gfaou a 22:00!\nHello, World abc abc bcd\n",
  "err": ""
 },
 {
  "name": "mission_log",
  "code": "LOG = [\n    \"2026-11-19 08:12:03 OK   user=karel ip=10.0.0.5\",\n    \"2026-11-19 08:13:44 FAIL user=admin ip=185.220.101.4\",\n    \"2026-11-19 08:13:47 FAIL user=admin ip=185.220.101.4\",\n    \"2026-11-19 09:01:10 FAIL user=eva ip=10.0.0.8\",\n]\ndef casy(log):\n    return [r[11:19] for r in log if \"FAIL\" in r]\ndef podezrele(log, limit):\n    pocty = {}\n    for r in log:\n        if \"FAIL\" in r:\n            ip = r.split(\"ip=\")[1]\n            pocty[ip] = pocty.get(ip, 0) + 1\n    return sorted(ip for ip, n in pocty.items() if n >= limit)\nprint(casy(LOG), podezrele(LOG, 2), podezrele(LOG, 1), podezrele([], 1))\nprint([radek.split()[3] for radek in LOG], LOG[1].split(\" \")[2])\n",
  "out": "['08:13:44', '08:13:47', '09:01:10'] ['185.220.101.4'] ['10.0.0.8', '185.220.101.4'] []\n['user=karel', 'user=admin', 'user=admin', 'user=eva'] FAIL\n",
  "err": ""
 },
 {
  "name": "mission_bits",
  "code": "def ip_na_bity(ip):\n    return \".\".join(f\"{int(cast):08b}\" for cast in ip.split(\".\"))\ndef stejna_sit(ip1, ip2, maska):\n    a = [int(x) for x in ip1.split(\".\")]\n    b = [int(x) for x in ip2.split(\".\")]\n    m = [int(x) for x in maska.split(\".\")]\n    return all((x & k) == (y & k) for x, y, k in zip(a, b, m))\nprint(ip_na_bity(\"192.168.1.10\"), ip_na_bity(\"0.0.0.255\"))\nprint(stejna_sit(\"192.168.1.10\", \"192.168.1.200\", \"255.255.255.0\"), stejna_sit(\"192.168.1.10\", \"192.168.2.10\", \"255.255.255.0\"), stejna_sit(\"10.1.2.3\", \"10.200.0.1\", \"255.0.0.0\"))\n",
  "out": "11000000.10101000.00000001.00001010 00000000.00000000.00000000.11111111\nTrue False True\n",
  "err": ""
 },
 {
  "name": "mission_hash",
  "code": "def otisk(text):\n    h = 0\n    for znak in text:\n        h = (h * 31 + ord(znak)) % 1000000007\n    return h\ndef najdi_heslo(cil, slovnik):\n    for slovo in slovnik:\n        if otisk(slovo) == cil:\n            return slovo\n    return None\nprint(otisk(\"kobra\"), otisk(\"\"), otisk(\"heslo123\"), najdi_heslo(otisk(\"sakal\"), [\"kobra\", \"sakal\", \"x\"]), najdi_heslo(5, [\"a\"]))\n",
  "out": "102221357 0 345166771 sakal None\n",
  "err": ""
 },
 {
  "name": "recursion_depth",
  "code": "def hloubka(n):\n    if n == 0:\n        return 0\n    return 1 + hloubka(n - 1)\nprint(hloubka(150))\n",
  "out": "150\n",
  "err": ""
 },
 {
  "name": "string_build",
  "code": "out = []\nfor i in range(5):\n    out.append(str(i) * i)\nprint(\"|\".join(out), \"-\".join(map(str, range(5))), \" \".join(w.capitalize() for w in \"ahoj světe\".split()))\n",
  "out": "|1|22|333|4444 0-1-2-3-4 Ahoj Světe\n",
  "err": ""
 },
 {
  "name": "nested_data",
  "code": "users = [{\"jmeno\": \"Eva\", \"body\": 7}, {\"jmeno\": \"Adam\", \"body\": 9}, {\"jmeno\": \"Bára\", \"body\": 7}]\nusers.sort(key=lambda u: (-u[\"body\"], u[\"jmeno\"]))\nprint([u[\"jmeno\"] for u in users], max(users, key=lambda u: u[\"body\"])[\"jmeno\"])\nprint({u[\"jmeno\"]: u[\"body\"] for u in users}, sorted({u[\"body\"] for u in users}))\nmatrix = [[1, 2, 3], [4, 5, 6]]\nprint([list(r) for r in zip(*matrix)], [sum(r) for r in matrix], [[x * 2 for x in r] for r in matrix])\n",
  "out": "['Adam', 'Bára', 'Eva'] Adam\n{'Adam': 9, 'Bára': 7, 'Eva': 7} [7, 9]\n[[1, 4], [2, 5], [3, 6]] [6, 15] [[2, 4, 6], [8, 10, 12]]\n",
  "err": ""
 },
 {
  "name": "err_name_suggest",
  "code": "pocty = 5\nprint(pocet)\n",
  "out": "",
  "err": "NameError: name 'pocet' is not defined. Did you mean: 'pocty'?"
 },
 {
  "name": "err_method_none",
  "code": "a = [3, 1, 2]\nb = a.sort()\nprint(b.append(1))\n",
  "out": "",
  "err": "AttributeError: 'NoneType' object has no attribute 'append'"
 },
 {
  "name": "err_float_index",
  "code": "a = [1, 2, 3]\nprint(a[len(a) / 2])\n",
  "out": "",
  "err": "TypeError: list indices must be integers or slices, not float"
 },
 {
  "name": "err_unpack",
  "code": "a, b = [1, 2, 3]\n",
  "out": "",
  "err": "ValueError: too many values to unpack (expected 2)"
 },
 {
  "name": "err_join",
  "code": "print(\",\".join([1, 2]))\n",
  "out": "",
  "err": "TypeError: sequence item 0: expected str instance, int found"
 },
 {
  "name": "err_ord",
  "code": "print(ord(\"ab\"))\n",
  "out": "",
  "err": "TypeError: ord() expected a character, but string of length 2 found"
 },
 {
  "name": "err_range_float",
  "code": "for i in range(2.5):\n    pass\n",
  "out": "",
  "err": "TypeError: 'float' object cannot be interpreted as an integer"
 },
 {
  "name": "err_int_len",
  "code": "print(len(5))\n",
  "out": "",
  "err": "TypeError: object of type 'int' has no len()"
 },
 {
  "name": "err_call_int",
  "code": "x = 5\nx(3)\n",
  "out": "",
  "err": "TypeError: 'int' object is not callable"
 },
 {
  "name": "err_neg_case",
  "code": "True_ = 1\nprint(true)\n",
  "out": "",
  "err": "NameError: name 'true' is not defined. Did you mean: 'True'?"
 },
 {
  "name": "err_def_noindent",
  "code": "def f():\n    x = 1\n  return x\n",
  "out": "",
  "err": "IndentationError: unindent does not match any outer indentation level"
 },
 {
  "name": "err_while_break_outside",
  "code": "break\n",
  "out": "",
  "err": "SyntaxError: 'break' outside loop"
 },
 {
  "name": "err_missing_two",
  "code": "def f(a, b, c):\n    pass\nf()\n",
  "out": "",
  "err": "TypeError: f() missing 3 required positional arguments: 'a', 'b', and 'c'"
 },
 {
  "name": "err_dict_unhashable",
  "code": "d = {[1]: 2}\n",
  "out": "",
  "err": "TypeError: unhashable type: 'list'"
 },
 {
  "name": "err_tuple_assign",
  "code": "t = (1, 2)\nt[0] = 5\n",
  "out": "",
  "err": "TypeError: 'tuple' object does not support item assignment"
 },
 {
  "name": "err_str_int_mul",
  "code": "print(\"ab\" * \"3\")\n",
  "out": "",
  "err": "TypeError: can't multiply sequence by non-int of type 'str'"
 },
 {
  "name": "err_compare_none",
  "code": "x = None\nprint(x > 5)\n",
  "out": "",
  "err": "TypeError: '>' not supported between instances of 'NoneType' and 'int'"
 },
 {
  "name": "err_typo_keyword",
  "code": "whille True:\n    pass\n",
  "out": "",
  "err": "SyntaxError: invalid syntax"
 },
 {
  "name": "err_else_without_if",
  "code": "else:\n    pass\n",
  "out": "",
  "err": "SyntaxError: invalid syntax"
 }
];
