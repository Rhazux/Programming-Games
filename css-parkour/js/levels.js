/*
 * CSS Parkour – obsah hry: vzhled scény, levely, kvíz
 *
 * Každý level má:
 *   fixed   – kulisy (zem, láva, start, vlajka, mince); jejich pozice jsou zamčené, CSS hráče je nezmění
 *   html    – prvky, které hráč ovládá svým CSS
 *   css     – výchozí CSS levelu (hráč ho vidí jako level.css a může ho přepsat)
 *   lock    – zamčené vlastnosti (znak @ se nahradí silným selektorem #stage#stage#stage)
 *   starter – výchozí kód hráče, solution – vzorové řešení, wrong – chybné pokusy, které mají selhat
 */
(function (global) {
  'use strict';

  /* Vzhled scény (uvnitř iframe) */
  const THEME = `
html, body { margin: 0; padding: 0; overflow: hidden; background: #0b1020; font: 12px/1.2 system-ui, sans-serif; }
#stage { position: relative; width: 800px; height: 400px; overflow: hidden;
  background:
    radial-gradient(1.5px 1.5px at 8% 12%, #fff, transparent), radial-gradient(1px 1px at 22% 30%, #fffa, transparent),
    radial-gradient(1.5px 1.5px at 37% 8%, #fff, transparent), radial-gradient(1px 1px at 51% 22%, #fffa, transparent),
    radial-gradient(1.5px 1.5px at 66% 14%, #fff, transparent), radial-gradient(1px 1px at 78% 35%, #fffa, transparent),
    radial-gradient(1.5px 1.5px at 91% 9%, #fff, transparent), radial-gradient(1px 1px at 95% 40%, #fffa, transparent),
    radial-gradient(60px 60px at 86% 18%, #fde68a 40%, #fde68a00 42%),
    linear-gradient(180deg, #0f172a 0%, #1e1b4b 40%, #4c1d95 72%, #9d174d 100%); }
#stage::before { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 170px; opacity: .55;
  background: radial-gradient(140px 100px at 12% 100%, #1e1b4b 98%, #0000), radial-gradient(190px 130px at 52% 100%, #1e1b4b 98%, #0000),
    radial-gradient(160px 90px at 88% 100%, #1e1b4b 98%, #0000); }
.ground { background: linear-gradient(#4ade80 0 6px, #16a34a 6px 10px, #7c2d12 10px 100%); box-shadow: inset 0 -10px 0 #0003; }
.ground::after { content: ""; position: absolute; inset: 16px 0 0 0; background: radial-gradient(#0003 2px, #0000 2.5px) 0 0 / 22px 18px; }
.lava { background: linear-gradient(#fdba74, #f97316 25%, #dc2626 70%, #7f1d1d); box-shadow: 0 0 22px 4px #f9731688, inset 0 3px 0 #fde047; animation: lava 1.1s ease-in-out infinite alternate; }
@keyframes lava { to { filter: brightness(1.3) saturate(1.2); } }
.plank, .bridge { background: repeating-linear-gradient(90deg, #b45309 0 22px, #92400e 22px 24px); box-shadow: inset 0 3px 0 #fbbf24, inset 0 -3px 0 #78350f; }
.block { background: linear-gradient(#a8a29e, #57534e); box-shadow: inset 0 4px 0 #e7e5e4, inset 0 -5px 0 #292524; }
.wall { background: linear-gradient(#0000 85%, #0006 0) 0 0 / 100% 16px, repeating-linear-gradient(90deg, #b91c1c 0 18px, #7f1d1d 18px 20px); box-shadow: inset 0 0 0 2px #450a0a; }
.spikes { background: conic-gradient(from 135deg at 50% 0, #e5e7eb 0 90deg, #0000 0) 0 0 / 16px 100%, linear-gradient(#0000 70%, #475569 0); }
.lift { background: repeating-linear-gradient(45deg, #facc15 0 10px, #1f2937 10px 20px); box-shadow: inset 0 3px 0 #fef08a, 0 6px 14px #0008; }
.shaft { background: linear-gradient(90deg, #64748b, #334155); box-shadow: inset 0 0 0 2px #1e293b; }
.toolbox { background: #1e293b; border-radius: 8px; box-shadow: inset 0 0 0 2px #475569, 0 8px 20px #0007; color: #cbd5e1; font-weight: 700; padding: 6px 8px; }
.dock, .row, .rail, .bridge-row { min-height: 1px; }
.start { border-radius: 14px 14px 2px 2px; background: radial-gradient(circle at 50% 45%, #c4b5fd, #7c3aed 55%, #4c1d95); box-shadow: 0 0 18px #8b5cf6aa; opacity: .85; }
.flag { background: linear-gradient(90deg, #e5e7eb 0 3px, #0000 3px); }
.flag::before { content: ""; position: absolute; left: 3px; top: 2px; width: 26px; height: 18px; background: linear-gradient(#22c55e, #15803d);
  clip-path: polygon(0 0, 100% 35%, 0 100%); transform-origin: left center; animation: wave .9s ease-in-out infinite alternate; }
.flag::after { content: ""; position: absolute; left: -4px; bottom: 0; width: 11px; height: 4px; border-radius: 2px; background: #94a3b8; }
@keyframes wave { to { transform: scaleX(.8) skewY(4deg); } }
.coin i { display: block; width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fef9c3, #facc15 45%, #a16207); box-shadow: 0 0 10px #facc1599; animation: spin 1s linear infinite; }
@keyframes spin { 50% { transform: scaleX(.2); } }
#hero { position: absolute; left: 0; top: 0; width: 22px; height: 28px; z-index: 50; will-change: transform; pointer-events: none; }
#hero i { position: absolute; inset: 0; border-radius: 7px 7px 5px 5px; background: linear-gradient(#67e8f9, #06b6d4 60%, #0e7490); box-shadow: inset 0 -4px 0 #155e75, 0 3px 0 #0006; transition: transform .08s; }
#hero i::before, #hero i::after { content: ""; position: absolute; top: 8px; width: 5px; height: 7px; border-radius: 3px; background: #0f172a; box-shadow: inset 1px 1px 0 #fff; transition: transform .15s; }
#hero i::before { left: 5px; } #hero i::after { left: 13px; }
#hero.left i::before, #hero.left i::after { transform: translateX(-3px); }
#hero.right i::before, #hero.right i::after { transform: translateX(2px); }
#hero.land i { transform: scale(1.18, .8) translateY(3px); }
#hero.air i { transform: scale(.92, 1.08); }
#hero.dead i { background: linear-gradient(#fca5a5, #ef4444); }
#hero.dead i::before, #hero.dead i::after { height: 2px; top: 11px; background: #450a0a; }
#hero.win i { animation: hop .4s ease-in-out infinite alternate; }
@keyframes hop { to { transform: translateY(-8px); } }
#hero.hidden { display: none; }
.fx { position: absolute; z-index: 60; pointer-events: none; border-radius: 50%; animation: fx .7s ease-out forwards; }
@keyframes fx { to { transform: translate(var(--dx), var(--dy)) scale(.2); opacity: 0; } }
.fxt { position: absolute; z-index: 61; pointer-events: none; font: 800 14px system-ui; color: #fde68a; text-shadow: 0 2px 0 #000; animation: up 1s ease-out forwards; }
@keyframes up { to { transform: translateY(-30px); opacity: 0; } }
#insp { position: absolute; inset: 0; z-index: 70; pointer-events: none; }
#insp .bx { position: absolute; }
#insp .m { background: #f9731655; } #insp .b { background: #facc1566; } #insp .p { background: #22c55e55; } #insp .c { background: #3b82f677; outline: 1px solid #93c5fd; }
#insp .tag { position: absolute; background: #0f172aee; color: #e2e8f0; font: 11px/1.35 ui-monospace, Consolas, monospace; padding: 4px 6px; border-radius: 6px; white-space: pre; box-shadow: 0 4px 12px #0008; }
.outline-all #stage * { outline: 1px dashed #ffffff66; outline-offset: -1px; }
`;

  /* pomocník pro kulisy: [id, třídy, x, y, šířka, výška] */
  const G = (id, x, y, w, h) => [id, 'ground solid', x, y, w, h];
  const LAVA = (id, x, y, w, h) => [id, 'lava danger', x, y, w, h];
  const START = (x, y) => ['start', 'start', x, y, 26, 36];
  const FLAG = (x, y) => ['flag', 'flag', x, y, 30, 60];
  const COIN = (id, x, y) => [id, 'coin', x, y, 14, 14];

  const WORLDS = [
    { id: 1, title: 'Rozměry a box model', icon: '📏' },
    { id: 2, title: 'Zobrazení a flexbox', icon: '🧱' },
    { id: 3, title: 'Pozice, transformace a animace', icon: '🚀' }
  ];

  const LEVELS = [
    {
      id: 1, world: 1, title: 'Most', concept: 'width',
      story: 'Pixel se probudil na okraji stránky. K vlajce vede most přes lávu – jenže má nulovou šířku.',
      task: 'Nastav mostu (.bridge) takovou šířku, aby sahal přes celou lávu.',
      fixed: [G('g1', 0, 300, 220, 100), G('g2', 540, 300, 260, 100), LAVA('l1', 220, 352, 320, 48), START(16, 264), FLAG(742, 240), COIN('c1', 330, 270), COIN('c2', 430, 270)],
      html: '<div class="bridge solid"></div>',
      css: '.bridge {\n  position: absolute;\n  left: 220px;\n  top: 300px;\n  height: 18px;\n  width: 0;\n}',
      lock: '@.bridge { left: 220px !important; top: 300px !important; height: 18px !important; position: absolute !important; transform: none !important; translate: none !important; scale: none !important; margin: 0 !important; padding: 0 !important; }',
      starter: '/* Pravidlo CSS: selektor { vlastnost: hodnota; } */\n.bridge {\n  \n}\n',
      solution: '.bridge {\n  width: 320px;\n}',
      wrong: ['.bridge {\n  width: 320;\n}', '.bridge {\n  width: 150px;\n}'],
      maxDecl: 1,
      props: ['width: 100px;', 'height: 20px;'],
      hints: ['Láva začíná na x = 220 px a končí na x = 540 px. Kolik je to pixelů?', 'Napiš do pravidla .bridge řádek width: 320px; – nezapomeň na jednotku px.']
    },
    {
      id: 2, world: 1, title: 'Zasypat jámu', concept: 'height',
      story: 'V cestě je jáma s lávou. Na jejím dně leží kamenný blok – stačí ho „vytáhnout“ do výšky.',
      task: 'Nastav bloku (.block) výšku tak, aby jeho vršek byl přesně v úrovni země.',
      fixed: [G('g1', 0, 300, 300, 100), G('g2', 440, 300, 360, 100), LAVA('l1', 300, 370, 140, 30), START(16, 264), FLAG(742, 240), COIN('c1', 363, 270)],
      html: '<div class="block solid"></div>',
      css: '.block {\n  position: absolute;\n  left: 300px;\n  bottom: 0;\n  width: 140px;\n  height: 20px;\n}',
      lock: '@.block { left: 300px !important; bottom: 0 !important; top: auto !important; width: 140px !important; position: absolute !important; transform: none !important; translate: none !important; scale: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; }',
      starter: '.block {\n  height: 20px;\n}\n',
      solution: '.block {\n  height: 100px;\n}',
      wrong: ['.block {\n  height: 60px;\n}', '.block {\n  height: 150px;\n}'],
      maxDecl: 1,
      props: ['height: 50px;'],
      hints: ['Scéna je vysoká 400 px a země začíná na y = 300 px. Blok stojí na dně (bottom: 0).', 'Vršek bloku má být 100 px nad dnem scény: height: 100px;']
    },
    {
      id: 3, world: 1, title: 'Posuň to', concept: 'margin',
      story: 'Prkno leží na špatném místě – schovává se pod startem. Šířku ani pozici mu nezměníš, ale vnější okraj ano.',
      task: 'Posuň prkno (.plank) nad lávu pomocí vnějšího okraje (margin).',
      fixed: [G('g1', 0, 300, 260, 100), G('g2', 520, 300, 280, 100), LAVA('l1', 260, 352, 260, 48), START(16, 264), FLAG(742, 240), COIN('c1', 383, 270)],
      html: '<div class="rail">\n  <div class="plank solid"></div>\n</div>',
      css: '.rail {\n  position: absolute;\n  left: 0;\n  top: 300px;\n  width: 800px;\n}\n.plank {\n  width: 260px;\n  height: 18px;\n}',
      lock: '@.rail { position: absolute !important; left: 0 !important; top: 300px !important; width: 800px !important; transform: none !important; padding: 0 !important; margin: 0 !important; display: block !important; }\n@.plank { width: 260px !important; height: 18px !important; position: static !important; transform: none !important; translate: none !important; scale: none !important; padding: 0 !important; border: 0 !important; margin-top: 0 !important; }',
      starter: '.plank {\n  \n}\n',
      solution: '.plank {\n  margin-left: 260px;\n}',
      wrong: ['.plank {\n  padding-left: 260px;\n}', '.plank {\n  margin-left: 100px;\n}'],
      maxDecl: 1,
      props: ['margin-left: 10px;', 'margin: 0 0 0 10px;'],
      hints: ['margin je průhledný prostor okolo prvku – odstrčí ho od okolí.', 'Láva začíná na x = 260 px: margin-left: 260px;']
    },
    {
      id: 4, world: 1, title: 'Box model', concept: 'padding',
      story: 'Šířka prkna je zamčená na 100 px. Jenže v CSS není „šířka“ jako „šířka“ – celková šířka krabice je víc než jen width.',
      task: 'Rozšiř prkno (.plank) přes celou lávu, aniž bys měnil(a) width.',
      fixed: [G('g1', 0, 300, 250, 100), G('g2', 550, 300, 250, 100), LAVA('l1', 250, 352, 300, 48), START(16, 264), FLAG(742, 240), COIN('c1', 393, 270)],
      html: '<div class="plank solid"></div>',
      css: '.plank {\n  position: absolute;\n  left: 250px;\n  top: 300px;\n  width: 100px;\n  height: 18px;\n}',
      lock: '@.plank { position: absolute !important; left: 250px !important; top: 300px !important; width: 100px !important; height: 18px !important; box-sizing: content-box !important; transform: none !important; translate: none !important; scale: none !important; margin: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; }',
      starter: '/* width je zamčená na 100px... */\n.plank {\n  \n}\n',
      solution: '.plank {\n  padding-right: 200px;\n}',
      wrong: ['.plank {\n  width: 300px;\n}', '.plank {\n  margin-right: 200px;\n}'],
      maxDecl: 1,
      props: ['padding-right: 10px;', 'padding: 0 10px;', 'border-right: 10px solid;'],
      hints: ['Celková šířka = width + padding vlevo + padding vpravo + rámečky.', 'Chybí ti 200 px: padding-right: 200px; (nebo padding: 0 100px;)']
    },
    {
      id: 5, world: 2, title: 'Neviditelná zeď', concept: 'visibility',
      story: 'Cestu blokuje zeď. Stačí ji schovat… ale pozor: zeď stojí v řadě (flexbox) spolu s víkem, které zakrývá lávovou díru.',
      task: 'Schovej zeď (.wall) tak, aby víko (.lid) zůstalo nad lávou.',
      fixed: [G('g1', 0, 300, 400, 100), G('g2', 480, 300, 320, 100), LAVA('l1', 400, 358, 80, 42), START(16, 264), FLAG(742, 240), COIN('c1', 433, 270)],
      html: '<div class="row">\n  <div class="wall solid"></div>\n  <div class="gap"></div>\n  <div class="lid plank solid"></div>\n</div>',
      css: '.row {\n  position: absolute;\n  left: 300px;\n  top: 220px;\n  display: flex;\n  align-items: flex-start;\n}\n.wall {\n  width: 40px;\n  height: 80px;\n}\n.gap {\n  width: 60px;\n  height: 1px;\n}\n.lid {\n  width: 80px;\n  height: 18px;\n  margin-top: 80px;\n}',
      lock: '@.row { position: absolute !important; left: 300px !important; top: 220px !important; display: flex !important; flex-direction: row !important; align-items: flex-start !important; justify-content: flex-start !important; gap: 0 !important; transform: none !important; padding: 0 !important; margin: 0 !important; }\n@.gap { width: 60px !important; height: 1px !important; flex: none !important; margin: 0 !important; order: 0 !important; }\n@.lid { width: 80px !important; height: 18px !important; margin: 80px 0 0 0 !important; flex: none !important; order: 0 !important; transform: none !important; }\n@.wall { order: 0 !important; flex-shrink: 0 !important; }',
      starter: '.wall {\n  \n}\n',
      solution: '.wall {\n  visibility: hidden;\n}',
      wrong: ['.wall {\n  display: none;\n}', '.wall {\n  opacity: 0;\n}', '.wall {\n  width: 0;\n}'],
      maxDecl: 1,
      props: ['display: none;', 'visibility: hidden;', 'opacity: 0;'],
      hints: ['display: none prvek úplně vyřadí z rozvržení – ostatní prvky v řadě se posunou na jeho místo.', 'Potřebuješ zeď schovat, ale nechat jí místo: visibility: hidden;']
    },
    {
      id: 6, world: 2, title: 'Na střed!', concept: 'justify-content',
      story: 'Prkno leží v pružném kontejneru (display: flex) přes celou šířku scény. Kam ho flexbox posune?',
      task: 'Pomocí vlastnosti kontejneru (.dock) dostaň prkno nad lávu.',
      fixed: [G('g1', 0, 300, 300, 100), G('g2', 500, 300, 300, 100), LAVA('l1', 300, 352, 200, 48), START(16, 264), FLAG(742, 240), COIN('c1', 393, 270)],
      html: '<div class="dock">\n  <div class="plank solid"></div>\n</div>',
      css: '.dock {\n  position: absolute;\n  left: 0;\n  top: 300px;\n  width: 800px;\n  height: 18px;\n  display: flex;\n}\n.plank {\n  width: 200px;\n  height: 18px;\n}',
      lock: '@.dock { position: absolute !important; left: 0 !important; top: 300px !important; width: 800px !important; height: 18px !important; display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; padding: 0 !important; transform: none !important; }\n@.plank { width: 200px !important; height: 18px !important; flex: none !important; margin: 0 !important; position: static !important; transform: none !important; translate: none !important; }',
      starter: '.dock {\n  \n}\n',
      solution: '.dock {\n  justify-content: center;\n}',
      wrong: ['.dock {\n  justify-content: flex-end;\n}', '.dock {\n  align-items: center;\n}'],
      maxDecl: 1,
      props: ['justify-content: flex-start;', 'justify-content: center;', 'justify-content: flex-end;', 'justify-content: space-between;'],
      hints: ['justify-content rozmisťuje prvky po hlavní ose – u řádku je to vodorovně.', 'Láva je přesně uprostřed scény: justify-content: center;']
    },
    {
      id: 7, world: 2, title: 'Dolů a doprostřed', concept: 'align-items',
      story: 'Teď je kontejner vysoký a prkno plave nahoře. Flexbox má dvě osy – hlavní a příčnou.',
      task: 'Dostaň prkno uprostřed vodorovně a úplně dolů v kontejneru (.dock).',
      fixed: [G('g1', 0, 300, 300, 100), G('g2', 500, 300, 300, 100), LAVA('l1', 300, 352, 200, 48), START(16, 264), FLAG(742, 240), COIN('c1', 393, 270)],
      html: '<div class="dock">\n  <div class="plank solid"></div>\n</div>',
      css: '.dock {\n  position: absolute;\n  left: 200px;\n  top: 100px;\n  width: 400px;\n  height: 218px;\n  display: flex;\n  outline: 2px dashed #ffffff33;\n}\n.plank {\n  width: 200px;\n  height: 18px;\n}',
      lock: '@.dock { position: absolute !important; left: 200px !important; top: 100px !important; width: 400px !important; height: 218px !important; display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; padding: 0 !important; transform: none !important; }\n@.plank { width: 200px !important; height: 18px !important; flex: none !important; margin: 0 !important; position: static !important; transform: none !important; translate: none !important; }',
      starter: '.dock {\n  \n}\n',
      solution: '.dock {\n  justify-content: center;\n  align-items: flex-end;\n}',
      wrong: ['.dock {\n  justify-content: center;\n}', '.dock {\n  justify-content: flex-end;\n  align-items: center;\n}'],
      maxDecl: 2,
      props: ['justify-content: center;', 'align-items: flex-end;', 'align-items: center;'],
      hints: ['justify-content = vodorovně (hlavní osa), align-items = svisle (příčná osa).', 'justify-content: center; a align-items: flex-end;']
    },
    {
      id: 8, world: 2, title: 'Pořadí', concept: 'order',
      story: 'Na mostě jsou bodáky – a to hned na začátku. HTML nesmíš měnit, ale flexbox umí prvky přeskládat.',
      task: 'Přesuň bodáky (.spikes) na konec řady, za obě prkna.',
      fixed: [G('g1', 0, 300, 300, 100), G('g2', 540, 300, 260, 100), LAVA('l1', 300, 352, 240, 48), START(16, 264), FLAG(544, 240), COIN('c1', 413, 270)],
      html: '<div class="row">\n  <div class="spikes danger"></div>\n  <div class="plank solid"></div>\n  <div class="plank solid"></div>\n</div>',
      css: '.row {\n  position: absolute;\n  left: 300px;\n  top: 300px;\n  display: flex;\n}\n.spikes {\n  width: 160px;\n  height: 18px;\n}\n.plank {\n  width: 130px;\n  height: 18px;\n}',
      lock: '@.row { position: absolute !important; left: 300px !important; top: 300px !important; display: flex !important; flex-wrap: nowrap !important; padding: 0 !important; gap: 0 !important; transform: none !important; justify-content: flex-start !important; }\n@.spikes { width: 160px !important; height: 18px !important; flex: none !important; margin: 0 !important; transform: none !important; translate: none !important; visibility: visible !important; display: block !important; position: static !important; }\n@.plank { width: 130px !important; height: 18px !important; flex: none !important; margin: 0 !important; transform: none !important; translate: none !important; position: static !important; }',
      starter: '.spikes {\n  \n}\n',
      solution: '.spikes {\n  order: 1;\n}',
      wrong: ['.spikes {\n  order: -1;\n}'],
      maxDecl: 1,
      props: ['order: 1;', 'order: -1;', 'flex-direction: row-reverse;'],
      hints: ['Vlastnost order určuje pořadí prvků ve flexboxu. Výchozí hodnota je 0.', 'Prvek s větším order jde dozadu: order: 1;']
    },
    {
      id: 9, world: 3, title: 'Absolutně přesně', concept: 'position',
      story: 'Most leží v bedně s nářadím. Vytáhni ho ven a polož ho přesně nad lávu. Pozor, od čeho se měří left a top!',
      task: 'Umísti most (.bridge) pomocí position: absolute nad lávu (x = 300, y = 300 na scéně).',
      fixed: [G('g1', 0, 300, 300, 100), G('g2', 500, 300, 300, 100), LAVA('l1', 300, 352, 200, 48), START(16, 264), FLAG(742, 240), COIN('c1', 393, 270)],
      html: '<div class="toolbox">\n  <b>Nářadí</b>\n  <div class="bridge solid"></div>\n</div>',
      css: '.toolbox {\n  position: absolute;\n  left: 40px;\n  top: 40px;\n  width: 224px;\n  height: 74px;\n}\n.toolbox b {\n  display: block;\n  margin-bottom: 10px;\n}\n.bridge {\n  width: 200px;\n  height: 18px;\n}',
      lock: '@.toolbox { left: 40px !important; top: 40px !important; width: 224px !important; height: 74px !important; transform: none !important; translate: none !important; margin: 0 !important; padding: 6px 8px !important; }\n@.bridge { width: 200px !important; height: 18px !important; margin: 0 !important; padding: 0 !important; transform: none !important; translate: none !important; scale: none !important; }',
      starter: '.bridge {\n  \n}\n',
      solution: '.bridge {\n  position: absolute;\n  left: 260px;\n  top: 260px;\n}',
      wrong: ['.bridge {\n  position: absolute;\n  left: 300px;\n  top: 300px;\n}'],
      maxDecl: 3,
      props: ['position: absolute;', 'left: 0px;', 'top: 0px;', 'position: static;'],
      hints: ['Absolutně pozicovaný prvek se měří od nejbližšího předka, který má nastavené position – tady od bedny (.toolbox), která je na x = 40, y = 40.', 'Buď odečti pozici bedny (left: 260px; top: 260px;), nebo bedně nastav position: static; a pak měř od scény.']
    },
    {
      id: 10, world: 3, title: 'Natáhni most', concept: 'transform',
      story: 'Most visí ve vzduchu a je moc krátký. Pozici ani šířku nezměníš – ale transformace ano.',
      task: 'Posuň most (.plank) o 100 px dolů a natáhni ho na trojnásobnou šířku – jediným transform.',
      fixed: [G('g1', 0, 300, 250, 100), G('g2', 550, 300, 250, 100), LAVA('l1', 250, 352, 300, 48), START(16, 264), FLAG(742, 240), COIN('c1', 393, 270)],
      html: '<div class="plank solid"></div>',
      css: '.plank {\n  position: absolute;\n  left: 350px;\n  top: 200px;\n  width: 100px;\n  height: 18px;\n}',
      lock: '@.plank { position: absolute !important; left: 350px !important; top: 200px !important; width: 100px !important; height: 18px !important; margin: 0 !important; padding: 0 !important; border: 0 !important; }',
      starter: '.plank {\n  \n}\n',
      solution: '.plank {\n  transform: translateY(100px) scaleX(3);\n}',
      wrong: ['.plank {\n  transform: translateY(100px);\n}', '.plank {\n  transform: scaleX(3);\n}'],
      maxDecl: 1,
      props: ['transform: translateY(10px);', 'transform: scaleX(2);', 'transform: translateY(10px) scaleX(2);'],
      hints: ['transform umí víc funkcí najednou, oddělených mezerou: translateY(…) scaleX(…).', 'transform: translateY(100px) scaleX(3); – zvětšení se počítá od středu prkna.']
    },
    {
      id: 11, world: 3, title: 'Kdo vyhraje?', concept: 'specificity',
      story: 'Most má díry na 3. a 6. místě. Oprav je – jenže tvoje pravidlo možná prohraje se specifičtějším selektorem v level.css.',
      task: 'Vrať 3. a 6. prknu (.plank) výšku 18px.',
      fixed: [G('g1', 0, 300, 200, 100), G('g2', 600, 300, 200, 100), LAVA('l1', 200, 352, 400, 48), START(16, 264), FLAG(742, 240), COIN('c1', 318, 270), COIN('c2', 468, 270)],
      html: '<div class="bridge-row">\n  <i class="plank solid"></i>\n  <i class="plank solid"></i>\n  <i class="plank solid"></i>\n  <i class="plank solid"></i>\n  <i class="plank solid"></i>\n  <i class="plank solid"></i>\n  <i class="plank solid"></i>\n  <i class="plank solid"></i>\n</div>',
      css: '.bridge-row {\n  position: absolute;\n  left: 200px;\n  top: 300px;\n  display: flex;\n  align-items: flex-start;\n}\n.plank {\n  width: 50px;\n  height: 18px;\n}\n.bridge-row .plank:nth-child(3),\n.bridge-row .plank:nth-child(6) {\n  height: 0;\n}',
      lock: '@.bridge-row { position: absolute !important; left: 200px !important; top: 300px !important; display: flex !important; flex-direction: row !important; align-items: flex-start !important; justify-content: flex-start !important; gap: 0 !important; padding: 0 !important; transform: none !important; }\n@.plank { width: 50px !important; flex: none !important; margin: 0 !important; padding: 0 !important; transform: none !important; translate: none !important; scale: none !important; order: 0 !important; max-height: 18px !important; border: 0 !important; }',
      starter: '.plank {\n  height: 18px;\n}\n',
      solution: '.bridge-row .plank:nth-child(3n) {\n  height: 18px;\n}',
      wrong: ['.plank {\n  height: 18px;\n}', '.bridge-row .plank {\n  height: 18px;\n}'],
      maxDecl: 1,
      props: [':nth-child(3)', '.bridge-row .plank:nth-child(3)', 'height: 18px;'],
      hints: ['Selektor .bridge-row .plank:nth-child(3) má specificitu (0,3,0) – dvě třídy a pseudotřída. Tvoje .plank má jen (0,1,0), takže prohraje.', 'Napiš stejně specifický selektor (pravidlo, které je v CSS později, vyhraje): .bridge-row .plank:nth-child(3), .bridge-row .plank:nth-child(6) { height: 18px; }']
    },
    {
      id: 12, world: 3, title: 'Výtah', concept: 'animation',
      story: 'Finále! Pixel stojí ve výtahu v přízemí a vlajka čeká na střeše. Jenže výtah je zaseknutý. Když výtah jede, Pixel se otočí ke dveřím (doprava) a vystoupí, jakmile výtah dojede do patra.',
      task: 'Vytvoř @keyframes a nastav výtahu (.lift) animaci, která ho vyveze o 200 px nahoru (a klidně zase dolů).',
      timeout: 30,
      fixed: [['wl', 'shaft solid', 0, 0, 20, 400], ['wr', 'shaft solid', 100, 200, 10, 200], G('gs', 20, 356, 80, 44), G('gu', 100, 140, 700, 60), LAVA('l1', 110, 362, 690, 38), START(47, 304), FLAG(742, 80), COIN('c1', 80, 250), COIN('c2', 450, 110)],
      html: '<div class="lift"></div>',
      css: '.lift {\n  position: absolute;\n  left: 20px;\n  top: 340px;\n  width: 80px;\n  height: 16px;\n}',
      lock: '@.lift { position: absolute !important; left: 20px !important; top: 340px !important; width: 80px !important; height: 16px !important; margin: 0 !important; padding: 0 !important; border: 0 !important; display: block !important; visibility: visible !important; }',
      starter: '.lift {\n  \n}\n\n@keyframes jizda {\n  \n}\n',
      solution: '.lift {\n  animation: jizda 3s ease-in-out infinite alternate;\n}\n\n@keyframes jizda {\n  to { transform: translateY(-200px); }\n}',
      wrong: ['.lift {\n  transform: translateY(-200px);\n}', '.lift {\n  animation: jizda 3s infinite alternate;\n}\n@keyframes jizda {\n  to { transform: translateY(-100px); }\n}', '.lift {\n  animation: jizda 3s infinite alternate;\n}\n@keyframes jizda {\n  to { top: 140px; }\n}'],
      maxDecl: 2,
      props: ['animation: jizda 3s ease-in-out infinite alternate;', 'to { transform: translateY(-100px); }', '@keyframes jizda { }'],
      hints: ['Animace má dvě části: @keyframes jméno { to { … } } popisuje, kam se prvek pohne, a vlastnost animation ji spustí.', 'V @keyframes jizda napiš to { transform: translateY(-200px); } a výtahu dej animation: jizda 3s ease-in-out infinite alternate;']
    }
  ];


  /* tahák – co si hráč v levelu procvičil (zobrazí se po výhře a v Taháku na mapě) */
  const LEARN = {
    1: ['width nastavuje šířku prvku. Číslo v CSS potřebuje jednotku – zápis width: 320 je neplatný a prohlížeč ho potichu ignoruje.', '.most {\n  width: 320px;\n}'],
    2: ['height nastavuje výšku. Prvek přilepený ke spodku (bottom: 0) roste odspodu nahoru – jeho vršek je na y = výška scény − height.', '.blok {\n  height: 100px;\n}'],
    3: ['margin je vnější okraj: průhledný prostor kolem prvku, který ho odstrčí od okolí. margin-left posune prvek doprava, margin-top dolů.', '.prkno {\n  margin-left: 260px;\n}'],
    4: ['Box model: celková šířka = width + padding + border (při výchozím box-sizing: content-box). Padding je uvnitř prvku, takže prvek „naroste“, i když se width nezmění. S box-sizing: border-box se padding do width započítá.', '.prkno {\n  width: 100px;\n  padding-right: 200px; /* celkem 300 px */\n}'],
    5: ['display: none prvek vyřadí z rozvržení – ostatní se posunou na jeho místo. visibility: hidden ho jen zneviditelní a místo mu nechá. opacity: 0 ho zprůhlední, ale prvek dál „překáží“.', '.zed {\n  visibility: hidden;\n}'],
    6: ['justify-content zarovnává položky flexboxu po hlavní ose (u řádku vodorovně): flex-start, center, flex-end, space-between, space-around.', '.kontejner {\n  display: flex;\n  justify-content: center;\n}'],
    7: ['align-items zarovnává po příčné ose (u řádku svisle). Dvojice justify-content + align-items dostane položku kamkoli.', '.kontejner {\n  display: flex;\n  justify-content: center;\n  align-items: flex-end;\n}'],
    8: ['order mění pořadí položek flexboxu bez zásahu do HTML. Výchozí hodnota je 0, větší číslo jde dál. Celou řadu otočí flex-direction: row-reverse.', '.bodaky {\n  order: 1;\n}'],
    9: ['position: absolute vytáhne prvek z běžného toku a umístí ho pomocí left/top vůči nejbližšímu předkovi, který má position jiné než static (jinak vůči stránce).', '.rodic {\n  position: relative;\n}\n.dite {\n  position: absolute;\n  left: 20px;\n  top: 10px;\n}'],
    10: ['transform mění jen vykreslení prvku – posun (translate), zvětšení (scale), otočení (rotate). Okolní prvky se nehnou. Funkce se dají řetězit mezerou.', '.most {\n  transform: translateY(100px) scaleX(3);\n}'],
    11: ['Když si pravidla odporují, vyhraje specifičtější selektor: id (1,0,0) > třída a pseudotřída (0,1,0) > značka (0,0,1). Při shodě vyhraje to, které je v CSS později. !important je až nouzová brzda.', '/* (0,3,0) vyhraje nad (0,1,0) */\n.rada .prkno:nth-child(3) {\n  height: 18px;\n}'],
    12: ['@keyframes popisuje, jak se má prvek v čase měnit (from/to nebo procenta). Vlastnost animation ji spustí: název, délka, průběh, počet opakování a směr.', '@keyframes jizda {\n  to { transform: translateY(-200px); }\n}\n.vytah {\n  animation: jizda 3s ease-in-out infinite alternate;\n}']
  };
  LEVELS.forEach(l => { l.learn = { text: LEARN[l.id][0], code: LEARN[l.id][1] }; });

  /* ---------------- kvíz ---------------- */
  const CONCEPTS = {
    syntax: 'Zápis pravidla CSS',
    boxmodel: 'Box model (celková šířka)',
    margin: 'Margin vs. padding',
    display: 'display: none vs. visibility',
    justify: 'Flexbox: justify-content',
    align: 'Flexbox: align-items',
    position: 'position: absolute',
    transform: 'transform',
    specificity: 'Specificita selektorů',
    animation: 'Animace a @keyframes'
  };

  const QUIZ = {
    A: [
      { c: 'syntax', q: 'Který zápis CSS je správně?', codeAnswers: true, lang: 'css',
        a: ['.most { width: 300px; }', '.most { width 300px; }', '.most: { width: 300px; }', '{ .most width: 300px; }'], ok: 0 },
      { c: 'boxmodel', q: 'Prvek má width: 100px; padding: 10px; border: 5px solid; (výchozí box-sizing). Jak široký bude celkem?', a: ['130 px', '100 px', '115 px', '120 px'], ok: 0 },
      { c: 'margin', q: 'Která vlastnost přidá průhledný prostor OKOLO prvku – mezi ním a sousedy?', a: ['margin', 'padding', 'border', 'width'], ok: 0 },
      { c: 'display', q: 'Prvek v řadě skryješ pomocí visibility: hidden. Co se stane s ostatními prvky v řadě?', a: ['Zůstanou na místě – skrytý prvek dál zabírá místo', 'Posunou se na jeho místo', 'Také zmizí', 'Zvětší se'], ok: 0 },
      { c: 'justify', q: 'Kontejner má display: flex (řádek). Jak jeho prvky vodorovně vycentruješ?', codeAnswers: true, lang: 'css',
        a: ['justify-content: center;', 'align-items: center;', 'text-align: middle;', 'flex-center: true;'], ok: 0 },
      { c: 'align', q: 'Flex kontejner (řádek) je vysoký 200 px. Jak přitlačíš prvky ke spodnímu okraji?', codeAnswers: true, lang: 'css',
        a: ['align-items: flex-end;', 'justify-content: flex-end;', 'vertical-align: bottom;', 'bottom: 0;'], ok: 0 },
      { c: 'position', q: 'Prvek má position: absolute; top: 0; left: 0;. Vůči čemu se umístí?',
        a: ['Vůči nejbližšímu předkovi s nastaveným position (jinak vůči stránce)', 'Vždy vůči levému hornímu rohu okna', 'Vůči předchozímu sourozenci', 'Nijak – top a left se ignorují'], ok: 0 },
      { c: 'transform', q: 'Jaký je rozdíl mezi margin-left: 50px a transform: translateX(50px)?',
        a: ['translateX posune jen vykreslení – okolní prvky se nehnou', 'Žádný, dělají přesně totéž', 'translateX funguje jen u obrázků', 'margin-left posune jen vykreslení – okolní prvky se nehnou'], ok: 0 },
      { c: 'specificity', q: 'Jakou barvu bude mít odkaz uvnitř prvku s třídou menu?', code: '.menu a { color: red; }\na { color: blue; }', lang: 'css',
        a: ['Červenou – specifičtější selektor vyhrává', 'Modrou – pravidlo je později', 'Fialovou – barvy se smíchají', 'Výchozí – pravidla se vyruší'], ok: 0 },
      { c: 'animation', q: 'Co dělá tento kód?', code: '@keyframes skok {\n  to { transform: translateY(-50px); }\n}\n.mic {\n  animation: skok 1s infinite alternate;\n}', lang: 'css',
        a: ['Míč pořád skáče nahoru a dolů', 'Míč jednou vyskočí a zůstane nahoře', 'Nic – v @keyframes chybí from', 'Míč se otáčí dokola'], ok: 0 }
    ],
    B: [
      { c: 'syntax', q: 'Který zápis nastaví všem odstavcům červenou barvu textu?', codeAnswers: true, lang: 'css',
        a: ['p { color: red; }', 'p { color = red; }', '.p { color: red; }', 'p: { red }'], ok: 0 },
      { c: 'boxmodel', q: 'Prvek má width: 200px; padding: 20px; border: 2px solid; (výchozí box-sizing). Jak široký bude celkem?', a: ['244 px', '200 px', '222 px', '240 px'], ok: 0 },
      { c: 'margin', q: 'Která vlastnost přidá prostor UVNITŘ prvku – mezi jeho okrajem a obsahem?', a: ['padding', 'margin', 'gap', 'outline'], ok: 0 },
      { c: 'display', q: 'Prvek v řadě skryješ pomocí display: none. Co se stane s ostatními prvky v řadě?', a: ['Posunou se a zaberou jeho místo', 'Zůstanou na místě', 'Také zmizí', 'Nic – display: none prvek neskryje'], ok: 0 },
      { c: 'justify', q: 'Flex řádek: první prvek má být úplně vlevo, poslední úplně vpravo a mezery mezi nimi stejné. Co použiješ?', codeAnswers: true, lang: 'css',
        a: ['justify-content: space-between;', 'align-items: stretch;', 'justify-content: center;', 'gap: auto;'], ok: 0 },
      { c: 'align', q: 'Flex řádek: jak zarovnáš prvky svisle na střed kontejneru?', codeAnswers: true, lang: 'css',
        a: ['align-items: center;', 'justify-content: center;', 'vertical-align: middle;', 'margin: center;'], ok: 0 },
      { c: 'position', q: 'Rodič má position: relative, dítě position: absolute; right: 0; bottom: 0;. Kde bude dítě?',
        a: ['V pravém dolním rohu rodiče', 'V pravém dolním rohu okna prohlížeče', 'V levém horním rohu rodiče', 'Tam, kde by bylo bez position'], ok: 0 },
      { c: 'transform', q: 'Který zápis zvětší prvek na dvojnásobnou šířku, aniž by posunul okolní prvky?', codeAnswers: true, lang: 'css',
        a: ['transform: scaleX(2);', 'width: 200%;', 'margin: 2x;', 'zoom-x: 2;'], ok: 0 },
      { c: 'specificity', q: 'Jakou barvu bude mít nadpis <h1 id="nadpis" class="velky">?', code: '#nadpis { color: green; }\nh1 { color: orange; }\nh1.velky { color: purple; }', lang: 'css',
        a: ['Zelenou – id má nejvyšší specificitu', 'Oranžovou', 'Fialovou – je poslední', 'Černou – pravidla se vyruší'], ok: 0 },
      { c: 'animation', q: 'Co dělá tento kód?', code: '@keyframes toc {\n  to { transform: rotate(360deg); }\n}\n.kolo {\n  animation: toc 2s linear infinite;\n}', lang: 'css',
        a: ['Kolo se pořád dokola otáčí', 'Kolo se otočí jednou a zastaví', 'Nic – v @keyframes chybí from', 'Kolo skáče nahoru a dolů'], ok: 0 }
    ]
  };

  global.ParkourContent = { THEME, WORLDS, LEVELS, CONCEPTS, QUIZ };
})(typeof window !== 'undefined' ? window : globalThis);
