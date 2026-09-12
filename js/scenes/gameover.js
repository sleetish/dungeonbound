// ---- Game over -----------------------------------------------------------------------
class GameOverScene {
  constructor() { this.t = 0; this.menu = null; this.line = U.choice([
    'Your run has ended. Your highlight reel is being compiled. It is short.',
    'You have been eliminated. Your sponsors have already signed someone else.',
    'Crawler status: deceased. Viewer sentiment: "meh".',
    'The audience voted your death "the funniest one this hour". Congratulations.',
  ]); }
  enter() { Sound.stop(); Sound.sfx('ko'); this.t = 0; }
  update() {
    this.t++;
    if (this.t === 90) {
      const items = [];
      if (G.hasSave()) items.push({ label: 'Load last save', value: 'load' });
      items.push({ label: 'Return to title', value: 'title' });
      this.menu = new Menu(items, { x: UI.W / 2 - 68, y: 150, w: 136, cancelable: false, center: true });
    }
    if (this.menu) {
      const r = this.menu.update();
      if (r && r.select) {
        if (r.select.value === 'load' && G.load()) Game.transition(() => Game.replace(new OverworldScene()));
        else Game.transition(() => Game.replace(new TitleScene()));
      }
    }
  }
  draw(ctx) {
    ctx.fillStyle = '#100008'; ctx.fillRect(0, 0, UI.W, UI.H);
    const a = Math.min(1, this.t / 60);
    ctx.globalAlpha = a;
    ctx.font = "16px 'Press Start 2P', 'Courier New', monospace"; ctx.textBaseline = 'top'; ctx.fillStyle = '#d02040';
    const s = 'ELIMINATED'; ctx.fillText(s, UI.W / 2 - ctx.measureText(s).width / 2, 40);
    const lines = UI.wrap(ctx, (G.flags.deathReason ? G.flags.deathReason + ' ' : '') + this.line, UI.W - 36);
    lines.forEach((l, i) => UI.center(ctx, l, UI.W / 2, 72 + i * 11, UI.COLORS.sys));
    const st = G.stats || {};
    UI.center(ctx, 'Floor ' + G.deepest + '  Score ' + G.score + '  Viewers ' + G.viewers, UI.W / 2, 122, '#9090a8');
    UI.center(ctx, 'Kills ' + (st.monsterKills || 0) + '  Finishes ' + (st.finishes || 0) + '  Recruits ' + (st.recruits || 0) + '  Crits ' + (st.crits || 0), UI.W / 2, 134, '#9090a8');
    ctx.globalAlpha = 1;
    if (this.menu) this.menu.draw(ctx);
  }
}
