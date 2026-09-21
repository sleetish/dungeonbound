// ---- Scene manager + game loop ------------------------------------------------------------
const Game = {
  scenes: [], canvas: null, ctx: null, frame: 0, fade: { alpha: 0, dir: 0, fn: null }, acc: 0, last: 0,
  init() {
    if (this.canvas) return; // idempotent: the host page may call this and also fire 'load'
    this.canvas = document.getElementById('game'); this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false; TextBox.measureCtx = this.ctx;
    Input.init(this.canvas); this.resize(); window.addEventListener('resize', () => this.resize());
    this.push(new TitleScene());
    requestAnimationFrame(ts => this.loop(ts));
  },
  resize() {
    const sw = window.innerWidth, sh = window.innerHeight;
    let scale = Math.min(sw / UI.W, sh / UI.H);
    if (scale >= 1) scale = Math.floor(scale);
    this.canvas.style.width = Math.round(UI.W * scale) + 'px'; this.canvas.style.height = Math.round(UI.H * scale) + 'px';
  },
  get top() { return this.scenes[this.scenes.length - 1]; },
  push(s) { this.scenes.push(s); if (s.enter) s.enter(); },
  pop() { const s = this.scenes.pop(); if (s && s.exit) s.exit(); const t = this.top; if (t && t.resume) t.resume(); },
  replace(s) { while (this.scenes.length) { const x = this.scenes.pop(); if (x.exit) x.exit(); } this.push(s); },
  transition(fn) { this.fade = { alpha: 0, dir: 1, fn }; },
  update() {
    if (Input.justPressed('mute')) { const on = Sound.toggle(); Toast.show(on ? 'Sound on' : 'Sound off', on ? 'The announcer is back.' : 'Blessed silence.', '#9090a8'); }
    if (this.fade.dir) {
      this.fade.alpha += this.fade.dir * 0.08;
      if (this.fade.dir > 0 && this.fade.alpha >= 1) { this.fade.alpha = 1; this.fade.dir = -1; if (this.fade.fn) this.fade.fn(); }
      else if (this.fade.dir < 0 && this.fade.alpha <= 0) { this.fade.alpha = 0; this.fade.dir = 0; }
      Toast.update(); Input.endFrame(); this.frame++; return;
    }
    // A notification toast is modal: the scene beneath pauses until it is dismissed.
    if (Toast.active) { Toast.update(); Input.endFrame(); this.frame++; return; }
    const t = this.top; if (t) t.update();
    Toast.update(); Input.endFrame(); this.frame++;
  },
  draw() {
    const ctx = this.ctx; ctx.imageSmoothingEnabled = false;
    let i = this.scenes.length - 1; while (i > 0 && this.scenes[i].transparent) i--;
    for (; i < this.scenes.length; i++) this.scenes[i].draw(ctx);
    Toast.draw(ctx);
    if (this.fade.alpha > 0) UI.fade(ctx, this.fade.alpha);
  },
  loop(ts) {
    if (!this.last) this.last = ts;
    this.acc += Math.min(100, ts - this.last); this.last = ts;
    const step = 1000 / 60; let n = 0;
    while (this.acc >= step && n < 4) { this.update(); this.acc -= step; n++; }
    this.draw();
    requestAnimationFrame(t => this.loop(t));
  },
};

if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.getElementById) {
  window.addEventListener('load', () => {
    Game.init();
    const c = document.getElementById('game');
    if (c && c.focus) try { c.focus(); } catch (e) {}
  });
}
