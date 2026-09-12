// ---- Safe room stash: deposit and withdraw items --------------------------------------
class StashScene {
  constructor() {
    this.transparent = true; this.state = 'main';
    this.tb = new TextBox(8, 160, UI.W - 16, 56, { instant: true });
    this.main = new Menu([{ label: 'Deposit', value: 'deposit' }, { label: 'Withdraw', value: 'withdraw' }, { label: 'Leave', value: 'leave' }], { x: 8, y: 8, w: 84 });
    this.list = null; this.desc = null;
  }
  enter() { this.tb.say('Your stash. ' + G.stashCount() + '/' + G.perk('stash') + ' slots used. Things left here stay here.', { speaker: 'Stash' }); }
  buildDeposit() { return new Menu(G.party.inventory.map(e => ({ label: ITEMS[e.id].name, value: e.id, right: 'x' + e.qty })), { x: 100, y: 8, w: UI.W - 108, rows: 9, title: 'DEPOSIT' }); }
  buildWithdraw() { return new Menu(G.stash.map(e => ({ label: ITEMS[e.id].name, value: e.id, right: 'x' + e.qty })), { x: 100, y: 8, w: UI.W - 108, rows: 9, title: 'WITHDRAW' }); }
  update() {
    this.tb.update();
    if (this.state === 'main') {
      const r = this.main.update();
      if (r && (r.cancel || (r.select && r.select.value === 'leave'))) { Game.pop(); return; }
      if (r && r.select) { this.state = r.select.value; this.list = this.state === 'deposit' ? this.buildDeposit() : this.buildWithdraw(); }
      return;
    }
    const r = this.list.update();
    if (!r) { const it = this.list.selected; this.desc = it && it.value && ITEMS[it.value] ? ITEMS[it.value].desc : null; return; }
    if (r.cancel) { this.state = 'main'; this.list = null; this.desc = null; return; }
    const id = r.select.value; if (!id) return;
    if (this.state === 'deposit') {
      if (G.deposit(id)) { Sound.sfx('item'); this.tb.say('Stored one ' + ITEMS[id].name + '. ' + G.stashCount() + '/' + G.perk('stash') + ' used.', { speaker: 'Stash' }); const c = this.list.cursor; this.list = this.buildDeposit(); this.list.cursor = Math.min(c, this.list.items.length - 1); }
      else { Sound.sfx('error'); this.tb.say('The stash is full. Your manager\'s plan only covers ' + G.perk('stash') + ' slots.', { speaker: 'Stash' }); }
    } else {
      if (G.withdraw(id)) { Sound.sfx('item'); this.tb.say('Took one ' + ITEMS[id].name + '.', { speaker: 'Stash' }); const c = this.list.cursor; this.list = this.buildWithdraw(); this.list.cursor = Math.min(c, this.list.items.length - 1); }
      else { Sound.sfx('error'); this.tb.say('Your pockets are full.', { speaker: 'Stash' }); }
    }
  }
  draw(ctx) {
    UI.fade(ctx, 0.5);
    this.main.active = this.state === 'main'; this.main.draw(ctx);
    UI.window(ctx, 8, 52, 84, 36); UI.text(ctx, 'Stash', 14, 57, UI.COLORS.dim); UI.text(ctx, G.stashCount() + '/' + G.perk('stash'), 14, 67, '#fff');
    if (this.list) {
      this.list.draw(ctx);
      if (this.desc) { UI.window(ctx, 100, 128, UI.W - 108, 28); UI.wrap(ctx, this.desc, UI.W - 122).slice(0, 2).forEach((l, i) => UI.text(ctx, l, 106, 134 + i * 10, UI.COLORS.dim)); }
    }
    this.tb.draw(ctx);
  }
}
