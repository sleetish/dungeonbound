// ---- Name entry: EarthBound letter grid, plus direct typing and optional mouse -------------
class NameEntryScene {
  constructor() {
    this.chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.\'';
    this.cols = 16; this.cx = 0; this.cy = 0; this.name = ''; this.max = 8; this.t = 0;
    this.gridX = 30; this.gridY = 70; this.cell = 16;
  }
  enter() { this.t = 0; Input.textMode = true; Input.takeTyped(); }
  exit() { Input.textMode = false; }
  get rows() { return Math.ceil(this.chars.length / this.cols) + 1; } // +1 for the BACK/OK row
  get lastRow() { return this.rows - 1; }
  cellRect(i) { return { x: this.gridX + (i % this.cols) * this.cell - 3, y: this.gridY + Math.floor(i / this.cols) * this.cell - 3, w: 14, h: 14 }; }
  buttonRect(i) { const label = ['BACK', 'OK'][i]; return { x: UI.W / 2 - 68 + i * 80 - 3, y: this.gridY + this.lastRow * this.cell - 3, w: UI.width(TextBox.measureCtx, label) + 6, h: 14 }; }
  addChar(ch) { if (this.name.length < this.max) { this.name += ch; Sound.sfx('confirm'); } else Sound.sfx('error'); }
  backspace() { this.name = this.name.slice(0, -1); Sound.sfx('cancel'); }
  update() {
    this.t++;
    // direct typing
    const typed = Input.takeTyped();
    for (const ch of typed) if (this.chars.includes(ch)) this.addChar(ch);
    let moved = false;
    if (Input.repeat('left')) { this.cx--; moved = true; }
    if (Input.repeat('right')) { this.cx++; moved = true; }
    if (Input.repeat('up')) { this.cy--; moved = true; }
    if (Input.repeat('down')) { this.cy++; moved = true; }
    if (moved) {
      this.cy = ((this.cy % this.rows) + this.rows) % this.rows;
      const rowCols = this.cy === this.lastRow ? 2 : this.cols;
      this.cx = ((this.cx % rowCols) + rowCols) % rowCols;
      Sound.sfx('cursor');
    }
    // mouse: hover moves the cursor, click activates
    if (Input.mouse.inside && (Input.mouse.moved || Input.mouse.clicked)) {
      let hit = null;
      for (let i = 0; i < this.chars.length && !hit; i++) { const r = this.cellRect(i); if (Input.hover(r.x, r.y, r.w, r.h)) hit = { cx: i % this.cols, cy: Math.floor(i / this.cols) }; }
      for (let i = 0; i < 2 && !hit; i++) { const r = this.buttonRect(i); if (Input.hover(r.x, r.y, r.w, r.h)) hit = { cx: i, cy: this.lastRow }; }
      if (hit) {
        if (Input.mouse.moved && (hit.cx !== this.cx || hit.cy !== this.cy)) { this.cx = hit.cx; this.cy = hit.cy; Sound.sfx('cursor'); }
        if (Input.mouse.clicked && !Input.mouse.consumed) { Input.consumeClick(); this.cx = hit.cx; this.cy = hit.cy; this.activate(); return; }
      } else if (Input.mouse.clicked) Input.consumeClick();
    }
    if (Input.justPressed('cancel')) { this.backspace(); }
    if (Input.justPressed('menu')) { this.finish(); return; }
    if (Input.justPressed('confirm')) this.activate();
  }
  activate() {
    if (this.cy === this.lastRow) { if (this.cx === 0) this.backspace(); else this.finish(); return; }
    const ch = this.chars[this.cy * this.cols + this.cx];
    if (ch) this.addChar(ch);
  }
  finish() {
    const name = this.name.trim() || 'Sam';
    Sound.sfx('levelup');
    Input.textMode = false;
    G.newGame(name);
    Game.transition(() => Game.replace(new OverworldScene()));
  }
  draw(ctx) {
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, UI.W, UI.H);
    UI.window(ctx, 16, 12, UI.W - 32, 40);
    UI.text(ctx, 'What is your name, crawler?', 24, 18, UI.COLORS.sys);
    const shown = this.name + (((this.t >> 4) & 1) ? '_' : ' ');
    UI.text(ctx, shown, 24, 34, '#fff');
    Sprites.draw(ctx, 'hero_down', UI.W - 48, 26, { pal: { 1: '#d83030', 2: '#885030', 3: '#3868d0' } });
    UI.window(ctx, 16, 60, UI.W - 32, 140);
    for (let i = 0; i < this.chars.length; i++) {
      const cx = i % this.cols, cy = Math.floor(i / this.cols);
      const r = this.cellRect(i);
      const sel = cx === this.cx && cy === this.cy;
      if (sel) { ctx.fillStyle = '#404070'; ctx.fillRect(r.x, r.y, r.w, r.h); }
      UI.text(ctx, this.chars[i], r.x + 3, r.y + 3, sel ? '#ffe080' : '#fff');
    }
    ['BACK', 'OK'].forEach((o, i) => {
      const r = this.buttonRect(i); const sel = this.cy === this.lastRow && this.cx === i;
      if (sel) { ctx.fillStyle = '#404070'; ctx.fillRect(r.x, r.y, r.w, r.h); }
      UI.text(ctx, o, r.x + 3, r.y + 3, sel ? '#ffe080' : '#fff');
    });
    UI.center(ctx, 'Type, click, or pick letters. Enter = done', UI.W / 2, 208, '#606080');
  }
}
