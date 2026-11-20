/*
 * Průvodce obrazovkou úrovně: postupně zvýrazní jednotlivé části (zadání, kód, tlačítko spuštění…)
 * a ke každé řekne jednou dvěma větami, k čemu slouží. Ovládá se myší i klávesnicí:
 * Enter / šipka vpravo = další krok, šipka vlevo = zpět, Esc = zavřít.
 *
 *   Tour.start([{ el: '#editor', title: 'Editor', text: 'Sem píšeš kód.' }, …], { onEnd })
 */
(function (global) {
  'use strict';
  let cur = null;

  function rectOf(sel) {
    const el = typeof sel === 'function' ? sel() : document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { el, r };
  }

  function end(done) {
    if (!cur) return;
    const c = cur;
    cur = null;
    c.root.remove();
    window.removeEventListener('resize', c.place);
    window.removeEventListener('scroll', c.place, true);
    if (c.opener && document.contains(c.opener)) c.opener.focus({ preventScroll: true });
    if (c.opts.onEnd) c.opts.onEnd(done);
  }

  function start(steps, opts) {
    steps = (steps || []).filter(s => !s.el || rectOf(s.el));
    if (!steps.length) return;
    opts = opts || {};
    if (cur) end(false);
    const root = document.createElement('div');
    root.className = 'tour';
    root.innerHTML = `<div class="tour-hole" aria-hidden="true"></div>
      <div class="tour-pop" role="dialog" aria-modal="true" aria-labelledby="tourTitle" aria-describedby="tourText">
        <p class="tour-count" id="tourCount"></p>
        <h2 id="tourTitle"></h2>
        <p id="tourText"></p>
        <div class="tour-btns">
          <button type="button" class="btn small ghost" data-t="prev">← Zpět</button>
          <button type="button" class="tour-skip" data-t="skip">Přeskočit průvodce</button>
          <button type="button" class="btn small primary" data-t="next">Další →</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    const hole = root.querySelector('.tour-hole');
    const pop = root.querySelector('.tour-pop');
    const btnPrev = root.querySelector('[data-t="prev"]');
    const btnNext = root.querySelector('[data-t="next"]');
    let i = 0;

    function place() {
      if (!cur) return;
      const s = steps[i];
      const t = s.el ? rectOf(s.el) : null;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const pw = Math.min(360, W - 24);
      pop.style.width = pw + 'px';
      const ph = pop.offsetHeight;
      if (!t) {
        hole.style.display = 'none';
        pop.style.left = Math.round((W - pw) / 2) + 'px';
        pop.style.top = Math.round(Math.max(12, (H - ph) / 2)) + 'px';
        return;
      }
      const pad = 6;
      const r = t.r;
      const x0 = Math.max(4, r.left - pad);
      const y0 = Math.max(4, r.top - pad);
      const x1 = Math.min(W - 4, r.right + pad);
      const y1 = Math.min(H - 4, r.bottom + pad);
      hole.style.display = 'block';
      Object.assign(hole.style, { left: x0 + 'px', top: y0 + 'px', width: (x1 - x0) + 'px', height: (y1 - y0) + 'px' });
      const gap = 14;
      let left;
      let top;
      if (y1 + gap + ph <= H - 8) { top = y1 + gap; left = x0; }
      else if (y0 - gap - ph >= 8) { top = y0 - gap - ph; left = x0; }
      else if (x1 + gap + pw <= W - 8) { left = x1 + gap; top = y0; }
      else if (x0 - gap - pw >= 8) { left = x0 - gap - pw; top = y0; }
      else { left = (W - pw) / 2; top = H - ph - 12; }
      left = Math.max(12, Math.min(W - pw - 12, left));
      top = Math.max(12, Math.min(H - ph - 12, top));
      pop.style.left = Math.round(left) + 'px';
      pop.style.top = Math.round(top) + 'px';
    }

    function show(n) {
      i = Math.max(0, Math.min(steps.length - 1, n));
      const s = steps[i];
      const t = s.el ? rectOf(s.el) : null;
      if (t) t.el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      root.querySelector('#tourCount').textContent = `Průvodce: krok ${i + 1} z ${steps.length}`;
      root.querySelector('#tourTitle').textContent = s.title;
      root.querySelector('#tourText').innerHTML = s.text;
      btnPrev.disabled = i === 0;
      btnNext.textContent = i === steps.length - 1 ? (opts.last || 'Rozumím, jdu na to') : 'Další →';
      place();
      btnNext.focus({ preventScroll: true });
    }

    cur = { root, place, opts, opener: document.activeElement };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-t]');
      if (!b) return;
      if (b.dataset.t === 'prev') show(i - 1);
      else if (b.dataset.t === 'skip') end(false);
      else if (i < steps.length - 1) show(i + 1);
      else end(true);
    });
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(false); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); if (i < steps.length - 1) show(i + 1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); return; }
      if (e.key !== 'Tab') return;
      const f = [...pop.querySelectorAll('button')].filter(b => !b.disabled);
      const a = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(a + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    });
    show(0);
  }

  global.Tour = { start, end: () => end(false), get active() { return !!cur; } };
})(typeof window !== 'undefined' ? window : globalThis);
