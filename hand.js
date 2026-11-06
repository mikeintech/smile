// Draws text in Deshawn's handwriting from the glyph sheet (font/hand.png + hand.json).
// Any .hw element with data-text gets a canvas. data-size = cap height as a share of the element width.
window.Hand = (() => {
  let M, img;
  const tints = {};
  const ready = Promise.all([
    fetch('font/hand.json').then(r => r.json()).then(j => (M = j)),
    new Promise(r => { img = new Image(); img.src = 'font/hand.png'; img.decode().then(r, () => (img.onload = r)); })
  ]);
  const MAP = { '’': "'", '‘': "'", '“': '"', '”': '"', '—': '-', '–': '-', '…': '...' };

  function tint(col) {
    if (tints[col]) return tints[col];
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    c.addEventListener('contextlost', () => delete tints[col]);
    tints[col] = c;
    // canvases can be dropped by the browser; a bitmap copy stays put
    if (window.createImageBitmap) createImageBitmap(c).then(b => { tints[col] = b; });
    return c;
  }
  const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function layout(text, size, maxW, lh = 1.45) {
    const s = size / M.cap, tr = M.cap * 0.05, sp = M.xh * 0.72;
    const ww = w => [...w].reduce((a, ch) => { const g = M.g[MAP[ch] || ch]; return a + (g ? g[2] + tr : sp); }, 0) - tr;
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

  // paint text onto any 2d context. o: {x, y, w, size, color, align, p (0..1 write-on), seed, lh, alpha}
  function paint(ctx, text, o) {
    const L = layout(text, o.size, o.w, o.lh), T = tint(o.color), r = rnd(o.seed || 7);
    let total = 0; L.lines.forEach(l => l.words.forEach(w => (total += [...w].length)));
    const shown = (o.p ?? 1) * total; let i = 0;
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
    L.lines.forEach((l, li) => {
      let x = o.x + (o.align === 'center' ? (o.w - l.w) / 2 : o.align === 'right' ? o.w - l.w : 0);
      const base = o.y + o.size + li * L.lineH;
      l.words.forEach((w, wi) => {
        if (wi) x += L.sp * L.s;
        for (let ch of w) {
          ch = MAP[ch] || ch; const g = M.g[ch];
          const jr = (r() - 0.5) * 0.06, jy = (r() - 0.5) * o.size * 0.06;
          if (!g) { x += L.sp * L.s; i++; continue; }
          const f = Math.max(0, Math.min(1, shown - i));
          if (f > 0) {
            const dw = g[2] * L.s, dh = g[3] * L.s;
            ctx.save(); ctx.translate(x + dw / 2, base - g[4] * L.s + dh / 2 + jy); ctx.rotate(jr);
            ctx.drawImage(T, g[0], g[1], Math.max(1, g[2] * f), g[3], -dw / 2, -dh / 2, dw * f, dh);
            ctx.restore();
          }
          x += (g[2] + L.tr) * L.s; i++;
        }
      });
    });
    ctx.restore();
    return L.lines.length * L.lineH + o.size * 0.45;
  }

  function mount(el) {
    const c = el.querySelector('canvas') || el.appendChild(document.createElement('canvas'));
    const st = el._hw || { p: el.hasAttribute('data-write') ? 0 : 1 };
    let W = 0, H = 0, size = 0, ctx;
    st.draw = () => {
      const w = el.clientWidth; if (!w) return;
      const text = el.dataset.text, lh = +el.dataset.lh || 1.45;
      const sz = Math.min(+el.dataset.max || 1e9, w * (+el.dataset.size || 0.1));
      const dpr = Math.min(2, devicePixelRatio || 1);
      if (w !== W || sz !== size) {
        const L = layout(text, sz, w, lh); W = w; size = sz; H = L.lines.length * L.lineH + sz * 0.45;
        c.width = Math.ceil(w * dpr); c.height = Math.ceil(H * dpr); c.style.width = w + 'px'; c.style.height = H + 'px';
        ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ctx.clearRect(0, 0, W, H);
      paint(ctx, text, { x: 0, y: 0, w: W, size, color: el.dataset.color || '#fff', align: el.dataset.align || 'left', p: st.p, seed: +el.dataset.seed || text.length * 31, lh, alpha: +el.dataset.alpha || 1 });
    };
    st.set = t => { el.dataset.text = t; W = 0; st.draw(); el.setAttribute('aria-label', t); };
    el._hw = st; el.setAttribute('role', 'img'); el.setAttribute('aria-label', el.dataset.text); st.draw();
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
  return { ready, paint, layout, mount, write };
})();
