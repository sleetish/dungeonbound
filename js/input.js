// ---- Input: keyboard, on-screen touch buttons, and optional mouse ---------------------
// The mouse is never required. Menus accept hover/click, text boxes accept clicks,
// right-click cancels and the wheel scrolls lists. A click that no menu claims becomes a
// "confirm" press on the next frame; a right-click becomes "cancel".
const Input = {
  down: {}, pressed: {}, repeatTimer: {},
  mouse: { x: -1, y: -1, inside: false, moved: false, clicked: false, rclicked: false, consumed: false, wheel: 0 },
  textMode: false, typed: '',
  KEYMAP: {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right',
    z: 'confirm', Z: 'confirm', ' ': 'confirm', Enter: 'menu',
    x: 'cancel', X: 'cancel', Escape: 'cancel', Backspace: 'cancel',
    m: 'mute', M: 'mute',
  },
  TEXTMAP: { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'menu', Escape: 'cancel', Backspace: 'cancel', Tab: 'confirm' },
  init(canvas) {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', e => {
      const map = this.textMode ? this.TEXTMAP : this.KEYMAP;
      const a = map[e.key];
      if (this.textMode && !a && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { this.typed += e.key; e.preventDefault(); Sound.init(); Sound.resume(); return; }
      if (!a) return; e.preventDefault();
      if (e.repeat) return;
      if (!this.down[a]) this.pressed[a] = true; this.down[a] = true;
      Sound.init(); Sound.resume();
    });
    window.addEventListener('keyup', e => { const a = this.KEYMAP[e.key] || this.TEXTMAP[e.key]; if (a) { this.down[a] = false; } });
    window.addEventListener('blur', () => { this.down = {}; });
    const touch = document.getElementById('touch');
    if (touch) touch.querySelectorAll('button').forEach(b => {
      const a = b.dataset.act;
      const on = e => { e.preventDefault(); if (!this.down[a]) this.pressed[a] = true; this.down[a] = true; Sound.init(); Sound.resume(); };
      const off = e => { e.preventDefault(); this.down[a] = false; };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
      b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
    if (canvas && canvas.addEventListener) this.initMouse(canvas);
  },
  initMouse(canvas) {
    const m = this.mouse;
    const toCanvas = e => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * canvas.width, y = (e.clientY - r.top) / r.height * canvas.height;
      return { x, y, inside: x >= 0 && y >= 0 && x < canvas.width && y < canvas.height };
    };
    canvas.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const p = toCanvas(e);
      if (Math.abs(p.x - m.x) >= 1 || Math.abs(p.y - m.y) >= 1) m.moved = true;
      m.x = p.x; m.y = p.y; m.inside = p.inside;
    });
    canvas.addEventListener('pointerleave', () => { m.inside = false; });
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;
      const p = toCanvas(e); m.x = p.x; m.y = p.y; m.inside = p.inside;
      if (e.button === 2) m.rclicked = true; else if (e.button === 0) m.clicked = true;
      Sound.init(); Sound.resume(); e.preventDefault();
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => { m.wheel += e.deltaY; e.preventDefault(); }, { passive: false });
  },
  isDown(a) { return !!this.down[a]; },
  justPressed(a) { return !!this.pressed[a]; },
  // menu navigation with key repeat
  repeat(a, delay, rate) {
    delay = delay || 14; rate = rate || 4;
    if (!this.down[a]) { this.repeatTimer[a] = 0; return false; }
    if (this.pressed[a]) { this.repeatTimer[a] = 0; return true; }
    this.repeatTimer[a] = (this.repeatTimer[a] || 0) + 1;
    if (this.repeatTimer[a] >= delay && (this.repeatTimer[a] - delay) % rate === 0) return true;
    return false;
  },
  // true if the mouse is over the rect (and has actually been used)
  hover(x, y, w, h) { const m = this.mouse; return m.inside && m.x >= x && m.y >= y && m.x < x + w && m.y < y + h; },
  clickIn(x, y, w, h) { return this.mouse.clicked && !this.mouse.consumed && this.hover(x, y, w, h); },
  consumeClick() { this.mouse.consumed = true; },
  endFrame() {
    const m = this.mouse;
    const nextPressed = {};
    if (m.clicked && !m.consumed) nextPressed.confirm = true;
    if (m.rclicked) nextPressed.cancel = true;
    if (m.wheel <= -20) { nextPressed.up = true; m.wheel = 0; } else if (m.wheel >= 20) { nextPressed.down = true; m.wheel = 0; }
    this.pressed = nextPressed;
    m.clicked = false; m.rclicked = false; m.consumed = false; m.moved = false;
  },
  takeTyped() { const t = this.typed; this.typed = ''; return t; },
  // programmatic (used by the headless test harness)
  press(a) { this.pressed[a] = true; this.down[a] = true; },
  release(a) { this.down[a] = false; },
};
