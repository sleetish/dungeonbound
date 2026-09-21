// ---- Title screen ---------------------------------------------------------------------
class TitleScene {
  constructor() { this.t = 0; this.menu = null; this.stars = []; for (let i = 0; i < 60; i++) this.stars.push({ x: Math.random() * UI.W, y: Math.random() * UI.H, s: Math.random() * 0.6 + 0.2 }); }
  enter() { Sound.play('title'); this.t = 0; this.menu = null; }
  update() {
    this.t++;
    for (const s of this.stars) { s.y += s.s; if (s.y > UI.H) { s.y = -2; s.x = Math.random() * UI.W; } }
    if (!this.menu) {
      if (Input.justPressed('confirm') || Input.justPressed('menu')) {
        Sound.sfx('confirm');
        const items = [{ label: 'New Game', value: 'new' }];
        if (G.hasSave()) items.unshift({ label: 'Continue', value: 'continue' });
        this.menu = new Menu(items, { x: UI.W / 2 - 40, y: 150, w: 80, cancelable: false, center: true });
      }
      return;
    }
    const r = this.menu.update();
    if (r && r.select) {
      if (r.select.value === 'continue') {
        if (G.load()) Game.transition(() => Game.replace(new OverworldScene()));
      } else if (r.select.value === 'new') {
        if (G.hasSave()) {
          this.menu = new Menu([
            { label: 'Overwrite save', value: 'confirm-new' },
            { label: 'Cancel', value: 'cancel-new' },
          ], { x: UI.W / 2 - 60, y: 150, w: 120, cancelable: false, center: true });
        } else {
          Game.transition(() => Game.replace(new NameEntryScene()));
        }
      } else if (r.select.value === 'confirm-new') {
        Game.transition(() => Game.replace(new NameEntryScene()));
      } else if (r.select.value === 'cancel-new') {
        const items = [{ label: 'New Game', value: 'new' }];
        if (G.hasSave()) items.unshift({ label: 'Continue', value: 'continue' });
        this.menu = new Menu(items, { x: UI.W / 2 - 40, y: 150, w: 80, cancelable: false, center: true });
      }
    }
  }
  draw(ctx) {
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, UI.W, UI.H);
    ctx.fillStyle = '#ffffff';
    for (const s of this.stars) { ctx.globalAlpha = s.s + 0.2; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); }
    ctx.globalAlpha = 1;
    // wobbling title
    const title = 'DUNGEONBOUND';
    ctx.font = "16px 'Press Start 2P', 'Courier New', monospace"; ctx.textBaseline = 'top';
    const tw = ctx.measureText(title).width; let x = UI.W / 2 - tw / 2;
    for (let i = 0; i < title.length; i++) {
      const ch = title[i]; const w = ctx.measureText(ch).width;
      const y = 40 + Math.sin(this.t / 12 + i * 0.6) * 4;
      ctx.fillStyle = '#000'; ctx.fillText(ch, x + 2, y + 2);
      ctx.fillStyle = 'hsl(' + ((this.t * 2 + i * 25) % 360) + ',80%,65%)'; ctx.fillText(ch, x, y);
      x += w;
    }
    UI.center(ctx, 'A Dungeon Game Show', UI.W / 2, 68, '#9090a8');
    UI.center(ctx, 'in the style of EarthBound', UI.W / 2, 80, '#9090a8');
    UI.center(ctx, 'reDUNGEONmastered', UI.W / 2, 94, '#f8d838');
    // little party walking
    const wx = (this.t / 2) % (UI.W + 50) - 30;
    Sprites.draw(ctx, 'hero_side' + (((this.t >> 3) & 1) ? '_w1' : '_w2'), wx, 108, { pal: { 1: '#d83030', 2: '#885030', 3: '#3868d0' } });
    Sprites.draw(ctx, 'raccoon_side', wx - 20, 110);
    Sprites.draw(ctx, 'rat', wx + 40, 110, { flip: true });
    if (!this.menu) { if ((this.t >> 5) & 1) UI.center(ctx, 'PRESS START', UI.W / 2, 160, '#fff'); }
    else this.menu.draw(ctx);
    UI.center(ctx, 'Survive. Descend. Get famous.', UI.W / 2, 200, '#606080');
  }
}
