/* Desktop Microduck: turns the Colorfigures Microduck page into a little flock of desk pets.
   The figure page draws a duck and runs its moves (walk, turn, sit, crouch, kick, pick up, skates, look, quack).
   This file hides everything but the ducks, gives each one a small brain so it wanders on its own and keeps out of
   the others' way, and lets you click them, carry them around and right-click them for a menu.
   Duck 0 is the page's own drawing; the others get their own drawing of the same figure, each with its own state,
   colour and voice. In the Mac app, window.pet (preload.js) talks to the window. */
(() => {
  const PET = window.pet || null;
  const html = document.documentElement;
  html.classList.add('petmode', 'nolabels');
  const mainSvg = document.getElementById('fig'), mainArt = document.getElementById('art');
  const st0 = ui.st;

  /* ---------- settings (kept between launches) ---------- */
  const SIZES = { small: 120, medium: 170, large: 250 };
  const ORDER = ['mustard', 'cobalt', 'blush', 'mint', 'tomato'];   // one colour per duck
  const MAXN = ORDER.length;
  const load = (k, d) => { try { const v = localStorage.getItem('duck.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem('duck.' + k, JSON.stringify(v)); } catch (e) {} };
  const cfg = { size: load('size', 'medium'), sound: load('sound', true), roam: load('roam', true), count: load('count', 5), pals: load('pals', ORDER.slice()) };
  if (!SIZES[cfg.size]) cfg.size = 'medium';
  cfg.count = Math.max(1, Math.min(MAXN, cfg.count | 0 || 5));
  if (!Array.isArray(cfg.pals)) cfg.pals = ORDER.slice();
  for (let i = 0; i < MAXN; i++) if (!PALS[cfg.pals[i]]) cfg.pals[i] = ORDER[i];

  /* ---------- the page's own chrome is not needed here ---------- */
  ui.flash = () => {};                       // the page's hint toasts
  roomFor = () => true;                      // on a desk a duck can go anywhere; the brain keeps it on screen
  STRIDE = 17;                               // a desk duck takes longer, quicker steps than the figure page
  for (const t of ['keydown', 'dblclick', 'wheel']) addEventListener(t, e => e.stopPropagation(), true);

  /* ---------- geometry shared by every duck ---------- */
  const duckPx = () => SIZES[cfg.size];
  const vb = () => mainSvg.viewBox.baseVal;
  const k = () => mainSvg.clientWidth / (vb().width || 1);           // screen pixels per drawing unit
  const anchor = () => { const a = P(CX, CY, 0), b = vb(), s = k(); return [(a[0] - b.x) * s, (a[1] - b.y) * s]; };
  const sdir = th => { const a = P(0, 0, 0), b = P(Math.cos(th), Math.sin(th), 0), s = k(); return [(b[0] - a[0]) * s, (b[1] - a[1]) * s]; };
  const bounds = () => { const d = duckPx(); return { x0: d * .55, x1: innerWidth - d * .55, y0: d * 1.15, y1: innerHeight - d * .22 }; };
  const inside = (x, y, m = 0) => { const b = bounds(); return x >= b.x0 + m && x <= b.x1 - m && y >= b.y0 + m && y <= b.y1 - m; };
  // how close two ducks are, measured on the floor: the floor is seen at a slant, so screen y counts more than x
  const gap = (a, b) => Math.hypot(a[0] - b[0], (a[1] - b[1]) * 1.7);
  const ROOM = () => duckPx() * .62;                                 // personal space: closer than this counts as bumping

  /* ---------- the ducks ---------- */
  const ducks = [];
  const newVoice = () => ({ f: 360 + Math.random()*460, q: 2.5 + Math.random()*5, wob: 10 + Math.random()*32, len: .11 + Math.random()*.1, type: ['sawtooth', 'square', 'triangle'][Math.random()*3 | 0] });
  function makeDuck(i){
    let st, svg, art, wrap;
    if (i === 0){ st = st0; svg = mainSvg; art = mainArt; wrap = document.querySelector('.zwrap') || svg.parentNode; }
    else {
      st = { pal: 'mustard', view: 'play', mode: 'free', ex: 0, exT: 0, step: 1, bk: 1, fr: 0, ticking: false, queue: [], cur: null, running: false, xr: 0, xrT: 0 };
      resetPose(st);
      wrap = document.createElement('div'); wrap.className = 'duck-wrap';
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'duck-fig');
      art = document.createElementNS('http://www.w3.org/2000/svg', 'g'); art.setAttribute('class', 'duck-art'); art.setAttribute('filter', 'url(#hand)');
      svg.appendChild(art); wrap.appendChild(svg); document.body.appendChild(wrap);
    }
    art.dataset.duck = i;
    st.pal = cfg.pals[i]; st.voice = i === 0 ? VOICE0 : newVoice();
    const bubble = document.createElement('div'); bubble.className = 'pet-bubble'; document.body.appendChild(bubble);
    const d = { i, st, svg, art, wrap, bubble, bubbleT: 0, pos: { x: 0, y: 0 }, nextAt: performance.now() + 1200 + i * 700 + Math.random() * 900,
      wasBusy: false, dirty: true, carry: null, avoid: null };
    // start spread out along the lower part of the screen, each facing its own way
    const n = cfg.count, b = bounds(), slot = (i + .5) / n;
    d.pos.x = b.x0 + (b.x1 - b.x0) * (.12 + .76 * slot) + (Math.random() - .5) * 30;
    d.pos.y = b.y1 - (b.y1 - b.y0) * (.08 + .22 * Math.random());
    if (i > 0 || st.th === 0){ st.th = (Math.floor(Math.random() * 8) - 3) * Math.PI / 4; st.feet = { L: { ...nominal(st, 1), lift: 0 }, R: { ...nominal(st, -1), lift: 0 } }; }
    return d;
  }
  function removeDuck(d){ d.st.queue.length = 0; d.wrap.remove(); d.bubble.remove(); }
  function setCount(n){
    n = Math.max(1, Math.min(MAXN, n));
    while (ducks.length > n) removeDuck(ducks.pop());
    while (ducks.length < n){ const d = makeDuck(ducks.length); ducks.push(d); clampPos(d); say(d, 'Quack!', 1000); }
    cfg.count = n; save('count', n); sizeUp(); ui.render();
  }
  // run fn with this duck as the page's current duck (the page's own moves read ui.st in a few places)
  const as = (d, fn) => { ui.st = d.st; try { return fn(d.st); } finally { ui.st = st0; } };

  /* ---------- where each duck stands on screen ---------- */
  // pos = the screen point under the duck's feet. A duck's own world position is pulled back to the middle of its
  // drawing after every move, and its drawing is slid across the screen by the same amount, so it can walk anywhere.
  function sizeUp(){ const b = vb(), w = (b.width * duckPx() / 280).toFixed(1) + 'px'; for (const d of ducks) d.svg.style.setProperty('--pw', w); }
  function clampPos(d){ const b = bounds(); d.pos.x = Math.min(b.x1, Math.max(b.x0, d.pos.x)); d.pos.y = Math.min(b.y1, Math.max(b.y0, d.pos.y)); }
  function place(d){ const [ax, ay] = anchor();
    d.wrap.style.left = (d.pos.x - ax).toFixed(1) + 'px'; d.wrap.style.top = (d.pos.y - ay).toFixed(1) + 'px';
    d.wrap.style.zIndex = d.carry ? 100000 : 10 + Math.round(d.pos.y);            // ducks nearer the bottom are in front
    d.wrap.style.transformOrigin = `${ax.toFixed(1)}px ${(ay - duckPx() * .95).toFixed(1)}px`; placeBubble(d); }
  function recenter(d){
    const st = d.st, dx = st.bx - CX, dy = st.by - CY; if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) return;
    const a = P(0, 0, 0), b = P(dx, dy, 0), s = k(); d.pos.x += (b[0] - a[0]) * s; d.pos.y += (b[1] - a[1]) * s;
    st.bx -= dx; st.by -= dy;
    for (const f of [st.feet.L, st.feet.R]){ f.x -= dx; f.y -= dy; }
    if (st.ball){ st.ball.x -= dx; st.ball.y -= dy; }
    if (st.block && !st.block.held){ st.block.x -= dx; st.block.y -= dy; }
    clampPos(d);   // a duck sent at the edge of the screen walks on the spot there
  }
  const busy = d => !!d.st.cur || d.st.queue.length > 0;
  const moving = d => busy(d) || !!d.st.ball || d.st.xr !== d.st.xrT;
  const r0 = ui.render;
  // one redraw for all ducks: the page's frame driver calls this every frame while anything moves
  ui.render = () => {
    for (const d of ducks){ if (!d.st.cur && !d.carry) recenter(d); }
    const d0 = ducks[0];
    if (!d0 || d0.dirty || moving(d0)) r0();
    for (const d of ducks){
      if (d.i > 0 && (d.dirty || moving(d))){
        d.svg.setAttribute('viewBox', mainSvg.getAttribute('viewBox'));
        _clipN = d.i * 100000;                                                     // clip-path ids stay unique per duck
        d.art.innerHTML = inkScale(scene(d.st, PALS[d.st.pal]));
      }
      d.dirty = false; place(d);
    }
  };

  /* ---------- speech bubbles ---------- */
  function placeBubble(d){ d.bubble.style.left = (d.pos.x + duckPx() * .12).toFixed(1) + 'px';
    d.bubble.style.top = (d.pos.y - duckPx() * 1.02 + (d.carry ? d.carry.lift : 0)).toFixed(1) + 'px';
    d.bubble.style.zIndex = 200000 + Math.round(d.pos.y); }
  function say(d, text, ms = 1300){ d.bubble.textContent = text; placeBubble(d); d.bubble.classList.add('show'); clearTimeout(d.bubbleT); d.bubbleT = setTimeout(() => d.bubble.classList.remove('show'), ms); }
  const qs0 = quackSound;
  const duckOf = st => ducks.find(d => d.st === st);
  quackSound = (n, who) => { const d = duckOf(who || ui.st); if (cfg.sound) qs0(n, d ? d.st : who);
    if (d) say(d, n === 1 ? (d.st.block && d.st.block.held ? 'Mmf!' : 'Quack!') : 'Quack quack!'); };

  /* ---------- each duck's brain ---------- */
  const flags = st => ({ sitting: planned(st, 'sit') > .5, crouching: planned(st, 'cr') > .3, skates: planned(st, 'sk') > .5,
    holding: !!(st.block && st.block.held), xray: !!st.xrT });
  const pick1 = table => { let r = Math.random() * table.reduce((s, x) => s + x[0], 0); for (const [w, f] of table){ if ((r -= w) <= 0) return f(); } };
  const ahead = (d, dist, th = d.st.th) => { const v = sdir(th); return [d.pos.x + v[0] * dist, d.pos.y + v[1] * dist]; };
  const others = d => ducks.filter(o => o !== d);
  // the duck nearest to a point on this duck's path (other ducks are counted at where they are now and where they are headed)
  function crowd(d, p){ let best = null, bd = Infinity;
    for (const o of others(d)) for (const q of [[o.pos.x, o.pos.y], o.goal || [o.pos.x, o.pos.y]]){ const g = gap(p, q); if (g < bd){ bd = g; best = o; } }
    return [best, bd]; }
  // how many world units this duck can walk straight ahead before it meets a wall or another duck
  function clearAhead(d, dist){
    const n = Math.max(1, Math.ceil(dist / 6));
    for (let j = 1; j <= n; j++){ const s = dist * j / n, p = ahead(d, s);
      if (!inside(p[0], p[1], 6)) return [s - dist / n, null];
      const [o, g] = crowd(d, p); if (o && g < ROOM() && g < gap([d.pos.x, d.pos.y], [o.pos.x, o.pos.y]) + 1) return [s - dist / n, o]; }
    return [dist, null];
  }
  // turn toward a screen point (one 45-degree turn, whichever way faces it better)
  function turnToward(d, tx, ty){ const v = [tx - d.pos.x, ty - d.pos.y], n = Math.hypot(...v) || 1,
      score = s => { const w = sdir(d.st.th + s * Math.PI / 4), m = Math.hypot(...w) || 1; return (w[0] * v[0] + w[1] * v[1]) / m / n; };
    as(d, st => turn(st, score(1) >= score(-1) ? 1 : -1)); }
  const steerHome = d => turnToward(d, innerWidth * (.3 + .4 * Math.random()), innerHeight * (.45 + .4 * Math.random()));
  const steerFrom = (d, o) => turnToward(d, d.pos.x + (d.pos.x - o.pos.x) * 3 + (Math.random() - .5) * 40, d.pos.y + (d.pos.y - o.pos.y) * 3 + (Math.random() - .5) * 40);
  // a stroll: n quick steps in a row, then the feet settle; it stops short of walls and other ducks
  function stroll(d, n){
    const [room, o] = clearAhead(d, n * STRIDE);
    n = Math.floor(room / STRIDE);
    if (n < 2){ if (o){ if (Math.random() < .25) say(d, ['Oops!', 'After you!', 'Excuse me!'][Math.random() * 3 | 0], 1000); return steerFrom(d, o); } return steerHome(d); }
    const steps = []; for (let j = 0; j < n; j++){ const m = stepMove(j % 2 ? -1 : 1, 'walk', 1); m.dur = .4; m.stroll = true; steps.push(m); }
    d.goal = ahead(d, n * STRIDE);
    as(d, st => queue(st, [...standFirst(st), ...steps, stepMove(0, 'settle', 0), stepMove(0, 'settle', 0)]));
  }
  const strollRand = d => stroll(d, 4 + 2 * Math.floor(Math.random() * 4));
  function glideOn(d){ const [room, o] = clearAhead(d, 5 * STRIDE); if (room >= 5 * STRIDE){ d.goal = ahead(d, 5 * STRIDE); return as(d, st => walk(st, 1)); } return o ? steerFrom(d, o) : steerHome(d); }
  // choose the next thing to do. Every action gets about the same chance, so walking is no more likely than sitting,
  // skating, kicking or picking up a block; whatever the duck did last time is less likely to come up again.
  function choose(d, table){
    const t = table.map(([name, w, fn]) => [name === d.last ? w * .35 : w, () => { d.last = name; return fn(); }]);
    return pick1(t);
  }
  function decide(d){
    const st = d.st, f = flags(st), rs = () => (Math.random() < .5 ? 1 : -1), A = fn => () => as(d, fn);
    // too close to someone (after being dropped, say): turn away first
    const [o, g] = crowd(d, [d.pos.x, d.pos.y]);
    if (o && g < ROOM() * .8 && !f.sitting && !f.crouching){ if (clearAhead(d, 3 * STRIDE)[0] >= 3 * STRIDE) return stroll(d, 4); return steerFrom(d, o); }
    if (f.skates) return choose(d, [['glide', 10, () => glideOn(d)], ['spin', 10, A(st => turn(st, rs()))], ['skates', 10, A(skates)], ['look', 3, A(look)], ['quack', 3, A(quack)]]);
    if (f.sitting) return choose(d, [['sit', 10, A(sitStand)], ['look', 4, A(look)], ['quack', 4, A(quack)]]);
    if (f.crouching) return choose(d, [['crouch', 10, A(crouch)], ['quack', 3, A(quack)], ['look', 3, A(look)]]);
    if (f.holding) return choose(d, [['walk', 10, () => strollRand(d)], ['turn', 6, A(st => turn(st, rs()))], ['pick', 10, A(pick)], ['quack', 6, A(quack)], ['look', 6, A(look)]]);
    return choose(d, [['walk', 10, () => strollRand(d)], ['turn', 7, A(st => turn(st, rs()))], ['look', 6, A(look)], ['quack', 6, A(quack)], ['sit', 11, A(sitStand)],
      ['crouch', 10, A(crouch)], ['kick', 10, A(kick)], ['skates', 10, A(skates)], ['pick', 10, A(pick)]]);
  }
  // while strolling, stop if someone has stepped into the way
  function watchPath(d){
    const st = d.st; if (!st.queue.some(m => m.stroll)) return;
    const p = ahead(d, STRIDE * 1.5), [o, g] = crowd(d, p), now = gap([d.pos.x, d.pos.y], o ? [o.pos.x, o.pos.y] : [1e9, 1e9]);
    if (o && g < ROOM() && g < now){ st.queue = st.queue.filter(m => !m.stroll); d.goal = null; d.avoid = o; }
  }
  setInterval(() => {
    const now = performance.now();
    for (const d of ducks){
      const b = busy(d);
      if (b && !d.carry) watchPath(d);
      if (d.wasBusy && !b){ const f = flags(d.st); d.goal = null; d.nextAt = now + (f.sitting ? 1500 + Math.random() * 2200 : 300 + Math.random() * 1200); report(); }
      d.wasBusy = b;
      if (b || d.carry || !cfg.roam || now < d.nextAt) continue;
      d.nextAt = now + 900;
      if (d.avoid){ const o = d.avoid; d.avoid = null; if (ducks.includes(o)){ steerFrom(d, o); continue; } }
      decide(d); report();
    }
  }, 150);

  /* ---------- click, carry, right-click ---------- */
  let press = null, over = false;
  const duckAt = (x, y) => { const el = document.elementFromPoint(x, y), a = el && el.closest && el.closest('[data-duck]'); return a ? ducks[+a.dataset.duck] || null : null; };
  const setOver = v => { if (v === over) return; over = v; if (PET) PET.setIgnore(!v); };
  addEventListener('mousemove', e => { if (!press) setOver(!!duckAt(e.clientX, e.clientY)); }, true);
  addEventListener('pointerdown', e => {
    const d = duckAt(e.clientX, e.clientY); if (!d) return;
    e.stopPropagation(); e.preventDefault();
    if (e.button !== 0) return;
    press = { d, x: e.clientX, y: e.clientY, px: d.pos.x, py: d.pos.y };
  }, true);
  addEventListener('pointermove', e => {
    if (!press) return; e.stopPropagation(); const d = press.d;
    if (!d.carry && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5){
      d.carry = { lift: -14, t0: performance.now(), vx: 0, lx: e.clientX }; d.st.queue.length = 0; d.goal = null; html.classList.add('carrying');
      if (cfg.sound) qs0(1, d.st); say(d, 'Quack?!', 900); dangle(d); }
    if (d.carry){ d.carry.vx = d.carry.vx * .7 + (e.clientX - d.carry.lx) * .3; d.carry.lx = e.clientX;
      d.pos.x = press.px + e.clientX - press.x; d.pos.y = press.py + e.clientY - press.y - 14; place(d); }
  }, true);
  addEventListener('pointerup', e => {
    if (!press) return; e.stopPropagation(); const d = press.d;
    if (d.carry){ d.carry = null; html.classList.remove('carrying'); d.wrap.style.transform = ''; d.pos.y += 14; clampPos(d); d.nextAt = performance.now() + 1400; d.dirty = true; ui.render(); }
    else if (e.button === 0) onClick(d);
    press = null; setOver(!!duckAt(e.clientX, e.clientY));
  }, true);
  function dangle(d){ if (!d.carry) return; const t = (performance.now() - d.carry.t0) / 1000;
    const a = Math.sin(t * 7) * 6 * Math.exp(-t * .8) - Math.max(-18, Math.min(18, d.carry.vx * 1.4));
    d.wrap.style.transform = `translateY(${d.carry.lift}px) rotate(${a.toFixed(2)}deg)`; requestAnimationFrame(() => dangle(d)); }
  function onClick(d){ const A = fn => () => as(d, fn);
    if (busy(d)) return as(d, quack);
    if (flags(d.st).sitting) return pick1([[60, A(quack)], [40, A(sitStand)]]);
    pick1([[55, A(quack)], [15, A(look)], [15, A(kick)], [15, A(sitStand)]]); report(); }
  addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); const d = duckAt(e.clientX, e.clientY); if (PET && d) PET.popup(snapshot(d)); }, true);

  /* ---------- commands from the menus ---------- */
  // "2|walk" is for duck 2; a command without a duck number is for every duck (menu bar)
  function seeThrough(d, on){ const st = d.st; st.xrT = on == null ? (st.xrT ? 0 : 1) : on;
    ui.animate(dt => { const g = Math.sign(st.xrT - st.xr); st.xr = Math.min(1, Math.max(0, st.xr + g*dt/.7)); return st.xr !== st.xrT; }); }
  function cmd(c){
    let [who, what] = String(c).includes('|') ? String(c).split('|') : [null, String(c)];
    const [a, b] = what.split(':'), list = who == null ? ducks.slice() : [ducks[+who]].filter(Boolean);
    const per = { walk: st => walk(st, 1), back: st => walk(st, -1), left: st => turn(st, 1), right: st => turn(st, -1), sit: sitStand,
      crouch, kick, pick, skates, look, quack };
    if (per[a]){ list.forEach((d, j) => { d.nextAt = performance.now() + 6000; setTimeout(() => as(d, per[a]), who == null ? j * 160 : 0); }); }
    else if (a === 'xray'){ const on = list.some(d => !d.st.xrT) ? 1 : 0; list.forEach(d => seeThrough(d, who == null ? on : null)); }
    else if (a === 'pal' && PALS[b]){ for (const d of list){ d.st.pal = b; cfg.pals[d.i] = b; d.dirty = true; } save('pals', cfg.pals); }
    else if (a === 'roam'){ cfg.roam = !cfg.roam; save('roam', cfg.roam); for (const d of ducks) d.nextAt = performance.now() + 1200; }
    else if (a === 'sound'){ cfg.sound = !cfg.sound; save('sound', cfg.sound); }
    else if (a === 'size' && SIZES[b]){ cfg.size = b; save('size', b); sizeUp(); for (const d of ducks){ clampPos(d); d.dirty = true; } }
    else if (a === 'count'){ setCount(+b); }
    else if (a === 'home'){ const bb = bounds(); list.forEach((d, j) => { d.st.queue.length = 0; d.goal = null;
      d.pos.x = innerWidth / 2 + (j - (list.length - 1) / 2) * duckPx() * .75; d.pos.y = bb.y1 - duckPx() * .1; clampPos(d); setTimeout(() => say(d, 'Here!'), j * 120); }); }
    else return;
    ui.render(); report();
  }
  function snapshot(d){ const base = { roam: cfg.roam, sound: cfg.sound, size: cfg.size, count: ducks.length, max: MAXN, pals: Object.keys(PALS), sizes: Object.keys(SIZES),
      xray: ducks.some(x => x.st.xrT) };
    return d ? { ...base, ...flags(d.st), id: d.i, pal: d.st.pal } : base; }
  let lastRep = '';
  function report(){ if (!PET) return; const s = snapshot(), j = JSON.stringify(s); if (j !== lastRep){ lastRep = j; PET.state(s); } }
  if (PET) PET.onCmd(cmd);
  window.duck = { cmd, ducks, snapshot, pos: null };          // handy from the dev console and the tests

  /* ---------- start ---------- */
  addEventListener('resize', () => { for (const d of ducks){ clampPos(d); place(d); } });
  for (let i = 0; i < cfg.count; i++) ducks.push(makeDuck(i));
  window.duck.pos = ducks[0].pos;
  sizeUp(); for (const d of ducks) clampPos(d); ui.render();
  ducks.forEach((d, i) => setTimeout(() => { as(d, quack); report(); }, 700 + i * 450));
})();
