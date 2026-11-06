// Draws text in Deshawn's handwriting from the glyph sheet (font/hand.png + hand.json).
// Any .hw element with data-text gets a canvas. data-size = cap height as a share of the element width.
window.Hand = (() => {
  // Which handwriting to use. 'hand2' = his marker sheet (current), 'hand' = the first chalk sheet.
  // To go back: set FONT to 'hand', or add ?font=1 to the URL to preview it.
  const FONT = new URLSearchParams(location.search).get('font') === '1' ? 'hand' : 'hand2';
  let M, img, ink;
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const ready = Promise.all([
    fetch(`font/${FONT}.json?v=7`).then(r => r.json()).then(j => (M = j)),
    load(`font/${FONT}.png?v=4`).then(i => (img = i)),
    load(`font/${FONT}-ink.png?v=4`).then(i => (ink = i))
  ]);
  const MAP = { '’': "'", '‘': "'", '“': '"', '”': '"', '—': '-', '–': '-', '…': '...' };
  // two pre-colored sheets: white chalk and dark ink
  const tint = col => {
    const h = col.replace('#', ''), n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
    return ((n >> 16) + ((n >> 8) & 255) + (n & 255)) / 3 < 128 ? ink : img;
  };
  const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function layout(text, size, maxW, lh = 1.45) {
    const s = size / M.cap, tr = M.cap * 0.05 - (M.pad || 0), sp = M.xh * 0.72;
    const ww = w => [...w].reduce((a, ch) => { const g = M.g[MAP[ch] || ch]; return a + (g ? g[2] * (g[5] || 1) + (g[6] || 0) * M.xh + tr : sp); }, 0) - tr;
    const lines = [];
    for (const para of String(text).split('\n')) {
      let line = [], lw = 0;
      for (const w of para.split(/ +/).filter(Boolean)) {
        const wl = ww(w) * s, add = (line.length ? sp * s : 0) + wl;
        if (line.length && lw + add > maxW) { lines.push({ words: line, w: lw }); line = []; lw = 0; }
        lw += (line.length ? sp * s : 0) + wl; line.push(w);
      }
      lines.push({ words: line, w: lw });
    }
    return { lines, s, tr, sp, lineH: size * lh };
  }

  // A line can end with "|scale|dx" to size and nudge it on its own, like how he writes signs:
  // e.g. "Life is a\nSeries|1.1|.05\nof|.7\nMoments|1.5|-.04". Lines without it use the base size.
  const parse = text => String(text).split('\n').map(l => { const [t, sc, dx] = l.split('|'); return { t, sc: +sc || 1, dx: +dx || 0 }; });
  const measure = (text, size, w, lh = 1.45) => parse(text).reduce((h, l) => h + layout(l.t, size * l.sc, w, lh).lines.length * size * l.sc * lh, 0);

  // paint text onto any 2d context. o: {x, y, w, size, color, align, p (0..1 write-on), seed, lh, alpha}
  function paint(ctx, text, o) {
    const rows = parse(text), T = tint(o.color), r = rnd(o.seed || 7), lh = o.lh || 1.45;
    const Ls = rows.map(l => layout(l.t, o.size * l.sc, o.w, lh));
    let total = 0; Ls.forEach(L => L.lines.forEach(l => l.words.forEach(w => (total += [...w].length))));
    const shown = (o.p ?? 1) * total; let i = 0, y = o.y + o.size * 0.25;
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    rows.forEach((row, ri) => {
      const L = Ls[ri], sz = o.size * row.sc;
      L.lines.forEach(l => {
        let x = o.x + row.dx * o.w + (o.align === 'center' ? (o.w - l.w) / 2 : o.align === 'right' ? o.w - l.w : 0);
        const base = y + sz;
        l.words.forEach((w, wi) => {
          if (wi) x += L.sp * L.s;
          for (let ch of w) {
            ch = MAP[ch] || ch; const g = M.g[ch];
            const jr = (r() - 0.5) * 0.025, jy = (r() - 0.5) * sz * 0.015;  // tiny wobble only, letters stay on the line
            if (!g) { x += L.sp * L.s; i++; continue; }
            const sc = g[5] || 1;
            if (g[6]) x += g[6] * M.xh * L.s;   // per-letter kern (e.g. y tucks in closer)
            const f = Math.max(0, Math.min(1, shown - i));
            if (f > 0) {
              const dw = g[2] * L.s * sc, dh = g[3] * L.s * sc;
              ctx.save(); ctx.translate(x + dw / 2, base - g[4] * L.s * sc + dh / 2 + jy); ctx.rotate(jr);
              ctx.drawImage(T, g[0], g[1], Math.max(1, g[2] * f), g[3], -dw / 2, -dh / 2, dw * f, dh);
              ctx.restore();
            }
            x += (g[2] * (g[5] || 1) + L.tr) * L.s; i++;
          }
        });
        y += sz * lh;
      });
    });
    ctx.restore();
    return y - o.y + o.size * 0.45;
  }

  function mount(el) {
    const c = el.querySelector('canvas') || el.appendChild(document.createElement('canvas'));
    const st = el._hw || { p: el.hasAttribute('data-write') ? 0 : 1 };
    let W = 0, H = 0, size = 0, ctx;
    st.draw = () => {
      const w = el.clientWidth; if (!w) return;
      const text = el.dataset.text, lh = +el.dataset.lh || 1.45;
      let sz = Math.min(+el.dataset.max || 1e9, w * (+el.dataset.size || 0.1));
      if (el.hasAttribute('data-fit')) {   // shrink until it fits inside the note
        const pe = el.parentElement, cs = getComputedStyle(pe), maxH = pe.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        while (sz > 8 && measure(text, sz, w, lh) + sz * 0.7 > maxH) sz *= 0.95;
      }
      const dpr = Math.min(2, devicePixelRatio || 1);
      if (w !== W || sz !== size) {
        W = w; size = sz; H = measure(text, sz, w, lh) + sz * 0.7;
        c.width = Math.ceil(w * dpr); c.height = Math.ceil(H * dpr); c.style.width = w + 'px'; c.style.height = H + 'px';
        ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ctx.clearRect(0, 0, W, H);
      paint(ctx, text, { x: 0, y: 0, w: W, size, color: el.dataset.color || '#fff', align: el.dataset.align || 'left', p: st.p, seed: +el.dataset.seed || text.length * 31, lh, alpha: +el.dataset.alpha || 1 });
    };
    st.set = t => { el.dataset.text = t; W = 0; st.draw(); el.setAttribute('aria-label', t); };
    el._hw = st; el.setAttribute('role', 'img'); el.setAttribute('aria-label', el.dataset.text.replace(/\|[^\n]*/g, '').replace(/\n/g, ' ')); st.draw();
    return st;
  }

  const write = (el, duration = 1.2, delay = 0) => {
    if (!el._hw) return; el._hw.p = 0; el._hw.draw();
    return gsap.to(el._hw, { p: 1, duration, delay, ease: 'none', onUpdate: el._hw.draw });
  };

  ready.then(() => {
    document.querySelectorAll('.hw').forEach(mount);
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => document.querySelectorAll('.hw').forEach(e => e._hw && e._hw.draw()), 120); });
    document.dispatchEvent(new Event('hand:ready'));
  });
  return { ready, paint, layout, measure, mount, write };
})();
