// ---- Utilities ----------------------------------------------------------
const U = {
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  rand(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
  randf(a, b) { return a + Math.random() * (b - a); },
  chance(p) { return Math.random() < p; },
  choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  weighted(list) { // [{w, ...}]
    let total = 0; for (const e of list) total += (e.w == null ? 1 : e.w);
    let r = Math.random() * total;
    for (const e of list) { r -= (e.w == null ? 1 : e.w); if (r <= 0) return e; }
    return list[list.length - 1];
  },
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
  dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); },
  sign(v) { return v < 0 ? -1 : v > 0 ? 1 : 0; },
  pad(s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; },
  padR(s, n) { s = String(s); while (s.length < n) s = s + ' '; return s; },
  // seeded rng (mulberry32) for procedural floors
  seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  },
  deepCopy(o) { return JSON.parse(JSON.stringify(o)); },
  // "a, b and c"
  listNames(names) {
    if (names.length <= 1) return names.join('');
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  },
};

// Coroutine helpers. Generators yield predicates (functions returning true when
// the step is finished) or a number of frames to wait.
const Co = {
  wait(frames) { let n = frames; return () => (--n <= 0); },
  run(gen) { return { gen, cur: null, done: false }; },
  step(co) {
    if (co.done) return true;
    if (co.cur && !co.cur()) return false;
    co.cur = null;
    const r = co.gen.next();
    if (r.done) { co.done = true; return true; }
    const v = r.value;
    if (typeof v === 'number') co.cur = Co.wait(v);
    else if (typeof v === 'function') co.cur = v;
    else co.cur = null;
    // evaluate the predicate once so zero-frame waits don't cost a frame
    if (co.cur && co.cur()) { co.cur = null; return Co.step(co); }
    return false;
  },
};
