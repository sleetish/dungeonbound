// ---- UI toolkit: EarthBound-style windows, typewriter text, menus, odometer ----
const UI = {
  FONT: "8px 'Press Start 2P', 'Courier New', monospace",
  W: 320, H: 224,
  LINE: 12,
  COLORS: { text: '#ffffff', dim: '#9090a8', sys: '#f8d838', hp: '#ffffff', bad: '#ff6060', good: '#80f080' },
  // Overflow detection (enabled by the test harness): text drawn inside the most recent
  // window's vertical span but past its right edge is recorded as an overflow.
  checkOverflow: false, overflows: [], _lastWin: null,
  text(ctx, str, x, y, color) {
    ctx.font = this.FONT; ctx.textBaseline = 'top'; ctx.fillStyle = color || this.COLORS.text;
    if (this.checkOverflow && this._lastWin) {
      const w = this._lastWin; const tw = ctx.measureText(str).width;
      const inside = y >= w.y && y < w.y + w.h && x >= w.x && x < w.x + w.w;
      if (inside && (x + tw > w.x + w.w - 2 || y + 8 > w.y + w.h - 2)) this.overflows.push({ text: String(str), x, y, win: Object.assign({}, w) });
    }
    ctx.fillText(str, Math.round(x), Math.round(y));
  },
  // A window that sizes itself to its text. opts: {color, right (x is the right edge), minW, fill, border}
  labelBox(ctx, str, x, y, opts) {
    opts = opts || {};
    const w = Math.max(opts.minW || 0, this.width(ctx, str) + 16), h = opts.h || 18;
    const bx = opts.right ? x - w : x;
    this.window(ctx, bx, y, w, h, opts);
    this.text(ctx, str, bx + 8, y + 5, opts.color);
    return { x: bx, y, w, h };
  },
  textShadow(ctx, str, x, y, color) {
    this.text(ctx, str, x + 1, y + 1, '#000'); this.text(ctx, str, x, y, color);
  },
  // text that lives in the world (markers, floaters), not inside any window
  worldText(ctx, str, x, y, color, shadow) {
    const w = this._lastWin; this._lastWin = null;
    if (shadow) this.textShadow(ctx, str, x, y, color); else this.text(ctx, str, x, y, color);
    this._lastWin = w;
  },
  width(ctx, str) { ctx.font = this.FONT; return ctx.measureText(str).width; },
  center(ctx, str, cx, y, color) { this.text(ctx, str, cx - this.width(ctx, str) / 2, y, color); },
  // EarthBound-style window: black fill, white border with a subtle inner line
  window(ctx, x, y, w, h, style) {
    style = style || {};
    this._lastWin = { x, y, w, h };
    ctx.fillStyle = style.fill || '#101018'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = style.border || '#ffffff';
    ctx.fillRect(x + 1, y, w - 2, 1); ctx.fillRect(x + 1, y + h - 1, w - 2, 1);
    ctx.fillRect(x, y + 1, 1, h - 2); ctx.fillRect(x + w - 1, y + 1, 1, h - 2);
    ctx.fillStyle = style.inner || '#6060a0';
    ctx.fillRect(x + 2, y + 2, w - 4, 1); ctx.fillRect(x + 2, y + h - 3, w - 4, 1);
    ctx.fillRect(x + 2, y + 2, 1, h - 4); ctx.fillRect(x + w - 3, y + 2, 1, h - 4);
    // rounded corners: knock out the corner pixels so the scene shows through
    ctx.clearRect(x, y, 1, 1); ctx.clearRect(x + w - 1, y, 1, 1); ctx.clearRect(x, y + h - 1, 1, 1); ctx.clearRect(x + w - 1, y + h - 1, 1, 1);
    if (style.title) {
      const tw = this.width(ctx, style.title) + 6;
      ctx.fillStyle = style.fill || '#101018'; ctx.fillRect(x + 6, y - 4, tw, 9);
      this.text(ctx, style.title, x + 9, y - 4, style.titleColor || '#f8d838');
    }
  },
  wrap(ctx, text, maxWidth) {
    const out = [];
    for (const para of String(text).split('\n')) {
      const words = para.split(' '); let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (this.width(ctx, test) > maxWidth && line) { out.push(line); line = w; } else line = test;
      }
      out.push(line);
    }
    return out;
  },
  cursor(ctx, x, y, color) { // small right-pointing hand/arrow
    ctx.fillStyle = color || '#ffffff';
    ctx.fillRect(x, y, 2, 7); ctx.fillRect(x + 2, y + 1, 2, 5); ctx.fillRect(x + 4, y + 2, 2, 3); ctx.fillRect(x + 6, y + 3, 1, 1);
  },
  // Rolling odometer number (EarthBound HP meter). value may be fractional.
  odometer(ctx, value, x, y, digits, color) {
    value = Math.max(0, value);
    const cw = 8, ch = 8;
    ctx.font = this.FONT; ctx.textBaseline = 'top'; ctx.fillStyle = color || '#ffffff';
    const frac = value - Math.floor(value);
    for (let p = 0; p < digits; p++) {
      const pw = Math.pow(10, p);
      const dx = x + (digits - 1 - p) * cw;
      const d = Math.floor(value / pw) % 10;
      const lowerAllNines = (value % pw) >= pw - 1 || p === 0;
      const shift = lowerAllNines ? frac : 0;
      const isLeadingZero = d === 0 && Math.floor(value / pw) === 0 && p > 0;
      ctx.save(); ctx.beginPath(); ctx.rect(dx, y, cw, ch); ctx.clip();
      if (!isLeadingZero || shift > 0) ctx.fillText(String(d), dx, Math.round(y - shift * ch));
      if (shift > 0) ctx.fillText(String((d + 1) % 10), dx, Math.round(y + ch - shift * ch));
      ctx.restore();
    }
  },
  fade(ctx, alpha) { ctx.fillStyle = 'rgba(0,0,0,' + alpha + ')'; ctx.fillRect(0, 0, this.W, this.H); },
};

// Typewriter text box with pages. Usage: tb.say(text); yield () => tb.done;
class TextBox {
  constructor(x, y, w, h, opts) {
    opts = opts || {};
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.rows = opts.rows || Math.floor((h - 8) / UI.LINE);
    this.speed = opts.speed || 1; this.color = opts.color || '#fff';
    this.pages = []; this.page = 0; this.chars = 0; this.done = true; this.visible = false;
    this.waiting = false; this.blink = 0; this.style = opts.style || {}; this.speaker = null;
    this.instant = !!opts.instant; this.autoAdvance = !!opts.autoAdvance;
  }
  say(text, opts) {
    opts = opts || {};
    this.speaker = opts.speaker || null; this.color = opts.color || '#fff';
    this.autoAdvance = opts.auto != null ? opts.auto : false;
    this.holdFrames = opts.hold || 0;
    this.holdSkip = !!opts.holdSkip; // a held confirm key also advances (fast-forward through battle text)
    const ctx = TextBox.measureCtx;
    const lines = UI.wrap(ctx, text, this.w - 16);
    this.pages = [];
    for (let i = 0; i < lines.length; i += this.rows) this.pages.push(lines.slice(i, i + this.rows));
    if (!this.pages.length) this.pages.push(['']);
    this.page = 0; this.chars = 0; this.done = false; this.visible = true; this.waiting = false; this.blink = 0;
    this.pageLen = this.pages[0].join('\n').length;
    if (this.instant) this.chars = this.pageLen;
    this.tick = 0;
  }
  hide() { this.visible = false; this.done = true; }
  update() {
    if (!this.visible || this.done) return;
    this.blink++;
    if (this.chars < this.pageLen) {
      const step = (Input.isDown('confirm') || Input.isDown('cancel')) ? 3 : this.speed;
      this.chars = Math.min(this.pageLen, this.chars + step);
      if (this.tick++ % 3 === 0) Sound.sfx('text');
      if (this.chars >= this.pageLen) this.waiting = true;
      return;
    }
    if (this.autoAdvance) {
      if (--this.holdFrames <= 0 || Input.justPressed('confirm')) this.next();
      return;
    }
    if (Input.justPressed('confirm') || Input.justPressed('cancel') || (this.holdSkip && this.blink > 24 && Input.isDown('confirm'))) { this.next(); }
  }
  next() {
    if (this.page < this.pages.length - 1) {
      this.page++; this.chars = 0; this.waiting = false;
      this.pageLen = this.pages[this.page].join('\n').length;
      if (this.instant) this.chars = this.pageLen;
    } else { this.done = true; this.waiting = false; }
  }
  draw(ctx) {
    if (!this.visible) return;
    UI.window(ctx, this.x, this.y, this.w, this.h, this.style);
    const lines = this.pages[this.page] || [];
    let remaining = this.chars;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const show = ln.slice(0, Math.max(0, remaining));
      remaining -= ln.length + 1;
      if (show) UI.text(ctx, show, this.x + 8, this.y + 6 + i * UI.LINE, this.color);
      if (remaining < 0) break;
    }
    if (this.speaker) {
      const tw = UI.width(ctx, this.speaker) + 8;
      UI.window(ctx, this.x + 4, this.y - 10, tw, 14, { fill: '#101018' });
      UI.text(ctx, this.speaker, this.x + 8, this.y - 7, UI.COLORS.sys);
    }
    if (this.waiting && !this.autoAdvance && (this.blink >> 4) & 1) {
      ctx.fillStyle = '#fff';
      const bx = this.x + this.w - 12, by = this.y + this.h - 8;
      ctx.fillRect(bx, by, 5, 1); ctx.fillRect(bx + 1, by + 1, 3, 1); ctx.fillRect(bx + 2, by + 2, 1, 1);
    }
  }
}
TextBox.measureCtx = null; // set by main once canvas exists

// Selectable list. items: [{label, value, disabled, right}] or strings.
class Menu {
  constructor(items, opts) {
    opts = opts || {};
    this.x = opts.x || 0; this.y = opts.y || 0; this.cols = opts.cols || 1;
    this.w = opts.w || 100; this.h = opts.h || 0;
    this.visibleRows = opts.rows || 0; this.scroll = 0;
    this.title = opts.title; this.cancelable = opts.cancelable !== false;
    this.wrap = opts.wrap !== false; this.style = opts.style || {}; this.colW = opts.colW; this.center = !!opts.center;
    this.setItems(items); this.cursor = opts.cursor || 0; this.active = true;
    this.hint = opts.hint || null;
  }
  setItems(items) {
    this.items = items.map(it => typeof it === 'string' ? { label: it, value: it } : it);
    if (!this.items.length) this.items = [{ label: '(nothing)', value: null, disabled: true }];
    const rows = Math.ceil(this.items.length / this.cols);
    this.rowsTotal = rows;
    if (!this.visibleRows) this.visibleRows = rows;
    if (!this.h) this.h = this.visibleRows * UI.LINE + 10;
    this.cursor = Math.min(this.cursor || 0, this.items.length - 1);
    this.fitWidth();
  }
  // Grow the window to fit its widest label (+ right-hand value); keep it on screen.
  fitWidth() {
    const ctx = TextBox.measureCtx; if (!ctx) return;
    let need = 0;
    for (const it of this.items) {
      const lw = UI.width(ctx, it.label || ''); const rw = it.right != null ? UI.width(ctx, String(it.right)) + 6 : 0;
      need = Math.max(need, lw + rw);
    }
    const needW = (need + 26) * this.cols;
    if (needW > this.w) this.w = Math.min(needW, UI.W - 16);
    if (this.center) this.x = Math.round((UI.W - this.w) / 2);
    if (this.x + this.w > UI.W - 8) this.x = Math.max(8, UI.W - 8 - this.w);
  }
  get selected() { return this.items[this.cursor]; }
  // screen rect of a visible item row (null when scrolled out of view)
  itemRect(i) {
    const row = Math.floor(i / this.cols) - this.scroll;
    if (row < 0 || row >= this.visibleRows) return null;
    const colW = this.colW || Math.floor((this.w - 12) / this.cols);
    return { x: this.x + 4 + (i % this.cols) * colW, y: this.y + 4 + row * UI.LINE, w: colW, h: UI.LINE };
  }
  // returns {select: item} | {cancel: true} | null
  update() {
    if (!this.active) return null;
    const n = this.items.length; let moved = false;
    if (Input.repeat('down')) { this.cursor += this.cols; moved = true; }
    if (Input.repeat('up')) { this.cursor -= this.cols; moved = true; }
    if (this.cols > 1) {
      if (Input.repeat('right')) { this.cursor += 1; moved = true; }
      if (Input.repeat('left')) { this.cursor -= 1; moved = true; }
    }
    if (moved) {
      if (this.wrap) this.cursor = ((this.cursor % n) + n) % n; else this.cursor = U.clamp(this.cursor, 0, n - 1);
      Sound.sfx('cursor');
    }
    // optional mouse: hover moves the cursor, click selects, click outside cancels
    if (Input.mouse.inside && (Input.mouse.moved || Input.mouse.clicked)) {
      let hit = -1;
      for (let i = 0; i < this.items.length; i++) { const r = this.itemRect(i); if (r && Input.hover(r.x, r.y, r.w, r.h)) { hit = i; break; } }
      if (hit >= 0 && Input.mouse.moved && hit !== this.cursor) { this.cursor = hit; Sound.sfx('cursor'); }
      if (Input.mouse.clicked && !Input.mouse.consumed) {
        Input.consumeClick();
        if (hit >= 0) { const it = this.items[hit]; this.cursor = hit; if (it.disabled) { Sound.sfx('error'); return null; } Sound.sfx('confirm'); return { select: it, index: hit }; }
        if (this.cancelable && !Input.hover(this.x, this.y, this.w, this.h)) { Sound.sfx('cancel'); return { cancel: true }; }
      }
    }
    const row = Math.floor(this.cursor / this.cols);
    if (row < this.scroll) this.scroll = row;
    if (row >= this.scroll + this.visibleRows) this.scroll = row - this.visibleRows + 1;
    if (Input.justPressed('confirm')) {
      const it = this.items[this.cursor];
      if (it.disabled) { Sound.sfx('error'); return null; }
      Sound.sfx('confirm'); return { select: it, index: this.cursor };
    }
    if (this.cancelable && Input.justPressed('cancel')) { Sound.sfx('cancel'); return { cancel: true }; }
    return null;
  }
  draw(ctx) {
    UI.window(ctx, this.x, this.y, this.w, this.h, Object.assign({ title: this.title }, this.style));
    const colW = this.colW || Math.floor((this.w - 12) / this.cols);
    for (let i = 0; i < this.items.length; i++) {
      const row = Math.floor(i / this.cols) - this.scroll;
      if (row < 0 || row >= this.visibleRows) continue;
      const col = i % this.cols;
      const it = this.items[i];
      const x = this.x + 14 + col * colW, y = this.y + 6 + row * UI.LINE;
      const color = it.disabled ? UI.COLORS.dim : (it.color || '#fff');
      const rightStr = it.right != null ? String(it.right) : '';
      const rightW = rightStr ? UI.width(ctx, rightStr) + 6 : 0;
      let label = it.label; const avail = colW - 14 - rightW;
      while (label.length > 1 && UI.width(ctx, label) > avail) label = label.slice(0, -1);
      UI.text(ctx, label, x, y, color);
      if (rightStr) UI.text(ctx, rightStr, x + colW - 12 - UI.width(ctx, rightStr), y, color);
      if (i === this.cursor && this.active) UI.cursor(ctx, x - 10, y);
    }
    if (this.rowsTotal > this.visibleRows) {
      ctx.fillStyle = '#fff';
      if (this.scroll > 0) { const ax = this.x + this.w - 10, ay = this.y + 3; ctx.fillRect(ax + 2, ay, 1, 1); ctx.fillRect(ax + 1, ay + 1, 3, 1); ctx.fillRect(ax, ay + 2, 5, 1); }
      if (this.scroll + this.visibleRows < this.rowsTotal) { const ax = this.x + this.w - 10, ay = this.y + this.h - 6; ctx.fillRect(ax, ay, 5, 1); ctx.fillRect(ax + 1, ay + 1, 3, 1); ctx.fillRect(ax + 2, ay + 2, 1, 1); }
    }
    if (this.hint) UI.text(ctx, this.hint, this.x + 8, this.y + this.h - 12, UI.COLORS.dim);
  }
}

// Achievement / system toast popups, queued.
const Toast = {
  queue: [], cur: null, t: 0,
  show(title, text, color) { this.queue.push({ title, text, color: color || UI.COLORS.sys }); },
  get active() { return !!this.cur; },
  // Modal: the game pauses underneath and the toast stays until confirm/cancel is pressed.
  update() {
    if (!this.cur && this.queue.length) { this.cur = this.queue.shift(); this.t = 0; this.closing = 0; Sound.sfx('achieve'); }
    if (!this.cur) return;
    this.t++;
    if (this.closing) { if (++this.closing > 10) this.cur = null; return; }
    if (this.t > 14 && (Input.justPressed('confirm') || Input.justPressed('cancel'))) { Sound.sfx('confirm'); this.closing = 1; }
  },
  draw(ctx) {
    if (!this.cur) return;
    const slide = this.closing ? Math.max(0, 1 - this.closing / 10) : Math.min(1, this.t / 12);
    const titleLines = UI.wrap(ctx, this.cur.title, UI.W - 36);
    const lines = UI.wrap(ctx, this.cur.text, UI.W - 36);
    const h = 22 + titleLines.length * 10 + lines.length * 10;
    const y = -h - 4 + slide * (h + 12);
    UI.window(ctx, 8, y, UI.W - 16, h, { border: this.cur.color });
    titleLines.forEach((l, i) => UI.text(ctx, l, 14, y + 5 + i * 10, this.cur.color));
    lines.forEach((l, i) => UI.text(ctx, l, 14, y + 8 + titleLines.length * 10 + i * 10, '#fff'));
    if (!this.closing && this.t > 14 && (this.t >> 4) & 1) {
      const prompt = 'Z/Space: OK'; UI.text(ctx, prompt, UI.W - 16 - UI.width(ctx, prompt), y + h - 11, UI.COLORS.dim);
    }
  },
};
