(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const C = { g: '#4ce902', o: '#f27f01', b: '#0190f0', y: '#edc902' };
  const TRACKS = [["I'm Not Depressed", '2:36'], ['Tell Me', '2:58'], ['Name', '2:24'], ['Need It', '2:48'], ['Feel', '2:24'], ['Anywhere', '3:15'], ["Don't Cry", '3:28']];
  const TK = ['g', 'o', 'b', 'y', 'g', 'o', 'b'], TCOL = TK.map(k => C[k]);
  const PAPER = {}; ['g', 'o', 'b', 'y'].forEach(k => { const i = new Image(); i.src = `img/paper-${k}.webp?v=2`; i.onload = () => drawCard(); PAPER[k] = i; });
  const mob = () => innerWidth <= 820;

  // ---------- build tracklist + polaroids (before handwriting mounts) ----------
  const ol = $('.tracks');
  TRACKS.forEach(([t, d], i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button aria-label="Play ${t}"><span class="note" style="--p:url(img/paper-${TK[i]}.webp?v=2);--r:${(i % 2 ? 1 : -1) * (0.6 + (i * 37 % 10) / 10)}deg"></span><span class="n">0${i + 1}</span><div class="hw" data-text="${t}" data-size=".072" data-max="30" data-color="#f3efe7"></div><span class="d">${d}</span><span class="eq"><i></i><i></i><i></i></span></button>`;
    li.querySelector('button').onclick = () => play(i);
    ol.appendChild(li);
  });
  const POLS = [['f1.jpg', 'life is a series of moments'], ['f2.jpg', 'some end'], ['vid', 'bj reece orchards'], ['f4.jpg', 'so others can begin'], ['f6.jpg', 'S.M.I.L.E'], ['f7.jpg', 'no features'], ['f9.jpg', 'jet row on every beat'], ['f10.jpg', 'smile - tomorrow']];
  const row = $('.row');
  POLS.forEach(([src, cap], i) => {
    const f = document.createElement('figure'); f.className = 'pol';
    f.style.setProperty('--tr', (i % 2 ? 5 : -4) + 'deg');
    f.innerHTML = (src === 'vid' ? '<video src="vid/s84801.mp4" muted loop playsinline autoplay preload="metadata"></video>' : `<img src="img/${src}" alt="" loading="lazy">`) +
      `<span class="tape"></span><figcaption class="hw" data-text="${cap}" data-size=".085" data-color="#1d1d1d" data-seed="${i * 13 + 5}"></figcaption>`;
    row.appendChild(f);
  });
  const pols = $$('.pol');

  // torn paper edges
  const torn = el => {
    const pts = [], n = 18, j = () => (Math.random() * 0.9).toFixed(2);
    for (let i = 0; i <= n; i++) pts.push(`${(i / n * 100).toFixed(1)}% ${j()}%`);
    for (let i = 0; i <= n; i++) pts.push(`${100 - j()}% ${(i / n * 100).toFixed(1)}%`);
    for (let i = n; i >= 0; i--) pts.push(`${(i / n * 100).toFixed(1)}% ${100 - j()}%`);
    for (let i = n; i >= 0; i--) pts.push(`${j()}% ${(i / n * 100).toFixed(1)}%`);
    el.style.clipPath = `polygon(${pts.join(',')})`;
  };
  

  // ---------- 1. the signs ----------
  const mo = $('#moments'), sheets = ['.s1', '.s2', '.s3', '.s4'].map(s => $(s, mo));
  const vid = $('#scrub'), count = $('.count b'), washI = $('.wash i');
  const KN = [0, 0.24, 0.48, 0.72, 1], VT = [0, 8.1, 13.7, 18.5, 21.9];
  const WASH = ['#1b5606', '#6a3300', '#073f7a', '#6b5700'];
  const DROP = [[0.17, 0.31], [0.41, 0.55], [0.65, 0.79]];
  const written = [false, false, false, false];
  let vTarget = 0, seg = -1, introDone = false;
  const writeSheet = k => {
    if (written[k]) return; written[k] = true;
    $$('.hw', sheets[k]).forEach((h, i) => Hand.write(h, i ? 0.9 : 1.1, i ? 0.7 : 0.1));
    if (k === 3) gsap.from($('.cta', sheets[3]), { y: 20, opacity: 0, duration: 0.7, delay: 1.4 });
  };
  function hero() {
    const r = mo.getBoundingClientRect(), span = r.height - innerHeight;
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = clamp(-r.top / span);
    if (introDone) DROP.forEach(([a, b], k) => {
      const d = clamp((p - a) / (b - a)), e = d * d * (3 - 2 * d), side = k % 2 ? 1 : -1;
      sheets[k].style.transform = `translate(${side * e * 9}vw, ${e * 125}vh) rotate(${[-1.6, 1.2, -0.8][k] + side * e * 16}deg)`;
      if (d > 0.45) writeSheet(k + 1);
    });
    let i = 0; while (i < 3 && p > KN[i + 1]) i++;
    vTarget = VT[i] + (VT[i + 1] - VT[i]) * clamp((p - KN[i]) / (KN[i + 1] - KN[i]));
    const s = DROP.filter(([a, b]) => p > (a + b) / 2).length;
    if (s !== seg) { seg = s; count.textContent = '0' + (s + 1); washI.style.setProperty('--wash', WASH[s]); }
  }
  // unlock video seeking on iOS
  addEventListener('touchstart', () => vid.play().then(() => vid.pause()).catch(() => {}), { once: true, passive: true });
  let vNow = 0;
  function seekLoop() {
    if (Math.abs(vTarget - vNow) > 0.001) {
      vNow += (vTarget - vNow) * 0.22;
      if (!vid.seeking && vid.readyState >= 1 && Math.abs(vid.currentTime - vNow) > 1 / 40) vid.currentTime = vNow;
    }
  }

  // ---------- 2. sleeve flip ----------
  const sl = $('#side-b'), sleeve = $('.sleeve'), inner = $('.inner'), stitle = $('.stitle');
  let tracksOut = false, flipV = 0, lastF = 0;
  function sleeveTick() {
    const r = sl.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return false;
    const q = clamp(-r.top / (r.height - innerHeight));
    const f = clamp((q - 0.06) / 0.36), fe = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
    flipV = Math.abs(fe - lastF); lastF = fe;
    const lift = Math.sin(fe * Math.PI);
    inner.style.transform = `rotateY(${fe * 180}deg) rotateX(${lift * 10}deg) scale(${1 + lift * 0.07})`;
    const s = clamp((q - 0.44) / 0.16), se = 1 - Math.pow(1 - s, 3), m = mob();
    const dx = m ? 0 : innerWidth * 0.2, dy = m ? innerHeight * 0.17 : 0, sc = m ? 0.42 : 0.06;
    sleeve.style.transform = `translate(calc(-50% - ${se * dx}px), calc(-50% - ${se * dy}px)) scale(${1 - se * sc}) rotate(${-se * 2}deg)`;
    stitle.style.opacity = m ? 1 - se : 1;
    const tv = clamp((s - 0.35) / 0.5);
    ol.style.opacity = tv; ol.style.visibility = tv > 0 ? 'visible' : 'hidden';
    if (s > 0.55 && !tracksOut) {
      tracksOut = true;
      $$('li', ol).forEach((li, i) => { gsap.from(li, { x: 30, opacity: 0, duration: 0.6, delay: i * 0.12, ease: 'power3.out' }); Hand.write($('.hw', li), 0.5, i * 0.12 + 0.1); });
    }
    return true;
  }
  // chalk dust
  const dc = $('.dust'), dx = dc.getContext('2d');
  const P = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 2.2, a: 0.05 + Math.random() * 0.22, vx: (Math.random() - 0.5) * 0.0004, vy: -0.0002 - Math.random() * 0.0005 }));
  function dust() {
    const w = dc.clientWidth, h = dc.clientHeight, dpr = Math.min(2, devicePixelRatio);
    if (dc.width !== w * dpr) { dc.width = w * dpr; dc.height = h * dpr; }
    dx.setTransform(dpr, 0, 0, dpr, 0, 0); dx.clearRect(0, 0, w, h);
    const boost = 1 + flipV * 300;
    for (const p of P) {
      p.x += p.vx * boost; p.y += p.vy * boost;
      if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); } if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
      dx.globalAlpha = p.a; dx.fillStyle = '#f3efe7'; dx.beginPath(); dx.arc(p.x * w, p.y * h, p.r, 0, 6.283); dx.fill();
    }
  }

  // ---------- 3. series ----------
  const se = $('#series'), top = $('.top');
  function series() {
    const r = se.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) { top.classList.remove('dark'); return; }
    const q = clamp(-r.top / (r.height - innerHeight)), travel = row.scrollWidth - innerWidth;
    row.style.transform = `translateX(${-q * travel}px)`;
    top.classList.toggle('dark', r.top < 40 && r.bottom > 40);
    pols.forEach((p, i) => {
      const k = (p.getBoundingClientRect().left + p.offsetWidth / 2) / innerWidth - 0.5;
      p.style.transform = `translateY(${Math.sin(i * 1.7) * 4 + k * 3}vh) rotate(${(i % 2 ? 2.5 : -3) + k * -6}deg)`;
    });
  }

  // ---------- loop ----------
  function frame() { hero(); seekLoop(); if (sleeveTick()) dust(); series(); requestAnimationFrame(frame); }

  // ---------- write-on when seen ----------
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { io.unobserve(e.target); Hand.write(e.target, Math.min(2.2, 0.5 + e.target.dataset.text.length * 0.04)); }
  }), { threshold: 0.4 });

  document.addEventListener('hand:ready', () => {
    $$('.hw[data-write]').forEach(h => { if (!h.closest('.stack')) io.observe(h); });
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' }, onComplete: () => (introDone = true) });
    tl.from('.top', { y: -40, opacity: 0, duration: 0.8 })
      .from(mob() ? '.frame' : '.frame', mob() ? { opacity: 0, duration: 1.2 } : { x: '40vw', rotate: 12, duration: 1.4 }, 0.1)
      .from([...sheets].reverse(), { y: '110vh', rotate: (i) => (i % 2 ? 14 : -12), duration: 1.3, stagger: 0.09, clearProps: 'transform' }, 0.25)
      .add(() => writeSheet(0), 1.1)
      .from('.count, .hint', { opacity: 0, duration: 0.8 }, 1.4);
    requestAnimationFrame(frame);
  });

  // ---------- player ----------
  const aud = $('#aud'), pl = $('.player'), bar = $('.bar i'), pt = $('.ptitle'), pn = $('.pn');
  let cur = -1;
  function setUI() {
    $$('li', ol).forEach((li, i) => {
      li.classList.toggle('on', i === cur); li.classList.toggle('playing', i === cur && !aud.paused);
      const h = $('.hw', li), want = i === cur ? '#151515' : '#f3efe7';
      if (h.dataset.color !== want) { h.dataset.color = want; h._hw && h._hw.draw(); }
    });
    pl.classList.toggle('playing', !aud.paused);
  }
  function play(i) {
    if (i === cur) { aud.paused ? aud.play() : aud.pause(); return; }
    const go = () => {
      cur = i; aud.src = `audio/${i + 1}.m4a`; aud.volume = 0; aud.play().catch(() => {});
      gsap.to(aud, { volume: 1, duration: 0.8 });
      pl.style.setProperty('--pc', TCOL[i]); pl.style.setProperty('--pp', `url(img/paper-${TK[i]}.webp?v=2)`); pn.textContent = '0' + (i + 1);
      pt._hw ? (pt._hw.set(TRACKS[i][0]), Hand.write(pt, 0.5)) : (pt.dataset.text = TRACKS[i][0]);
      pl.classList.add('show'); setUI();
    };
    if (!aud.paused) gsap.to(aud, { volume: 0, duration: 0.35, onComplete: go }); else go();
  }
  aud.addEventListener('play', setUI); aud.addEventListener('pause', setUI);
  aud.addEventListener('timeupdate', () => { bar.style.width = (aud.currentTime / (aud.duration || 30) * 100) + '%'; });
  aud.addEventListener('ended', () => play((cur + 1) % 7));
  $('.pp').onclick = () => (cur < 0 ? play(0) : play(cur));
  $('.nx').onclick = () => play((cur + 1) % 7);
  $('.play-all').onclick = () => play(0);

  // smooth in-page links
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault();
    const y = t.getBoundingClientRect().top + scrollY + (t.id === 'side-b' ? innerHeight * 1.9 : 0);
    scrollTo({ top: y, behavior: 'smooth' });
  }));

  // ---------- your sign ----------
  const card = $('#card'), cx = card.getContext('2d'), msg = $('#msg');
  let col = 'y';
  const photo = new Image(); photo.src = 'img/f1.jpg'; photo.onload = () => drawCard();
  const hands = new Image(); hands.src = 'img/hands.png'; hands.onload = () => drawCard();
  let handOK = false;
  Hand.ready.then(() => { handOK = true; drawCard(); });
  function drawCard() {
    if (!handOK || !photo.complete || !photo.naturalWidth) return;
    cx.save();
    try { paintCard(); } finally { cx.restore(); }
  }
  function paintCard() {
    const W = 1080, H = 1920;
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.shadowColor = 'transparent';
    cx.clearRect(0, 0, W, H);
    const s = Math.max(W / photo.width, H / photo.height);
    cx.drawImage(photo, (W - photo.width * s) / 2, (H - photo.height * s) / 2, photo.width * s, photo.height * s);
    // the custom sign sits exactly where his real sign is, then his hands go back on top
    const k = W / photo.width, Q = [[182, 526], [629, 566], [594, 958], [150, 920]].map(([x, y]) => [x * k, y * k]);
    const sw = 1000, sh = 820, sg = document.createElement('canvas'); sg.width = sw; sg.height = sh;
    const sx = sg.getContext('2d'), pi = PAPER[col];
    if (pi && pi.complete && pi.naturalWidth) sx.drawImage(pi, -14, -12, sw + 28, sh + 24); else { sx.fillStyle = C[col]; sx.fillRect(0, 0, sw, sh); }
    const text = msg.value.trim() || 'Smile.';
    let size = 140, L;
    while (size > 40) { L = Hand.layout(text, size, sw - 190); if (L.lines.length * L.lineH <= sh - 200) break; size -= 6; }
    const th = L.lines.length * L.lineH;
    Hand.paint(sx, text, { x: 80, y: (sh - th) / 2 - size * 0.35, w: sw - 190, size, color: '#151515', align: 'center', seed: text.length * 7 });
    const tri = (s0, s1, s2, d0, d1, d2) => {
      // clip a slightly enlarged triangle so the two halves overlap and no seam shows
      const cxm = (d0[0] + d1[0] + d2[0]) / 3, cym = (d0[1] + d1[1] + d2[1]) / 3, gr = p => [cxm + (p[0] - cxm) * 1.012, cym + (p[1] - cym) * 1.012];
      cx.save(); cx.beginPath(); cx.moveTo(...gr(d0)); cx.lineTo(...gr(d1)); cx.lineTo(...gr(d2)); cx.closePath(); cx.clip();
      const den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
      const m = (i) => [((d1[i] - d0[i]) * (s2[1] - s0[1]) - (d2[i] - d0[i]) * (s1[1] - s0[1])) / den, ((d2[i] - d0[i]) * (s1[0] - s0[0]) - (d1[i] - d0[i]) * (s2[0] - s0[0])) / den];
      const [a_, c_] = m(0), [b_, d_] = m(1);
      cx.setTransform(a_, b_, c_, d_, d0[0] - a_ * s0[0] - c_ * s0[1], d0[1] - b_ * s0[0] - d_ * s0[1]);
      cx.drawImage(sg, 0, 0); cx.restore();
    };
    // grow each triangle a hair so the seam doesn't show
    const P = [[0, 0], [sw, 0], [sw, sh], [0, sh]];
    cx.save(); cx.shadowColor = 'rgba(0,0,0,.35)'; cx.shadowBlur = 30; cx.shadowOffsetY = 12;
    cx.beginPath(); Q.forEach((p, i) => (i ? cx.lineTo(...p) : cx.moveTo(...p))); cx.closePath(); cx.fillStyle = 'rgba(0,0,0,.01)'; cx.fill(); cx.restore();
    tri(P[0], P[1], P[3], Q[0], Q[1], Q[3]);
    tri(P[1], P[2], P[3], Q[1], Q[2], Q[3]);
    if (hands.complete && hands.naturalWidth) cx.drawImage(hands, 0, 0, W, hands.height * k);
    cx.setTransform(1, 0, 0, 1, 0, 0);
    const g = cx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.25, 'rgba(0,0,0,.1)'); g.addColorStop(0.6, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,.75)');
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    Hand.paint(cx, 'Some Moments In Life End, Smile!', { x: 60, y: 110, w: W - 120, size: 50, color: '#fff', align: 'center', seed: 3 });
    Hand.paint(cx, 'Deshawn Visionz', { x: 60, y: 210, w: W - 120, size: 34, color: '#fff', align: 'center', seed: 9, alpha: 0.85 });
    Hand.paint(cx, 'out now - link in @deshawnvisionz bio', { x: 60, y: 1730, w: W - 120, size: 32, color: '#fff', align: 'center', seed: 4, alpha: 0.9 });
  }
  msg.addEventListener('input', drawCard);
  $$('.sw button').forEach(b => b.onclick = () => { $$('.sw button').forEach(x => x.setAttribute('aria-checked', x === b)); col = b.dataset.c; drawCard(); });
  const blob = () => new Promise(r => card.toBlob(r, 'image/png'));
  $('#save').onclick = async () => { const a = document.createElement('a'); a.href = URL.createObjectURL(await blob()); a.download = 'my-moment.png'; a.click(); };
  $('#share').onclick = async () => {
    const f = new File([await blob()], 'my-moment.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], text: 'Some Moments In Life End, Smile! @deshawnvisionz' }).catch(() => {});
    else $('#save').click();
  };
})();
