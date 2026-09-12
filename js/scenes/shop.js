// ---- Dungeon Store ---------------------------------------------------------------------
class ShopScene {
  constructor(stock) {
    this.stock = stock; this.transparent = true; this.state = 'main';
    this.tb = new TextBox(8, 160, UI.W - 16, 56, { instant: true });
    this.keeper = 'Gordo';
    this.main = new Menu([{ label: 'Buy', value: 'buy' }, { label: 'Sell', value: 'sell' }, { label: 'Leave', value: 'leave' }], { x: 8, y: 8, w: 70 });
    this.list = null; this.msgCo = null;
  }
  enter() {
    Sound.play('shop');
    this.tb.say(U.choice(['Welcome to the Dungeon Store. Prices are fair. Fairness is relative.', 'Gordo the Bodega Bear, at your service. No refunds. No questions. No eye contact.', 'Buy something. The network takes 40%, so buy two somethings.']), { speaker: this.keeper });
  }
  exit() { Sound.play('overworld'); }
  buildBuy() {
    return new Menu(this.stock.map(id => ({ label: ITEMS[id].name, value: id, right: ITEMS[id].price })), { x: 84, y: 8, w: UI.W - 92, rows: 9, title: 'BUY' });
  }
  buildSell() {
    const items = G.party.inventory.filter(e => !ITEMS[e.id].key).map(e => ({ label: ITEMS[e.id].name + ' x' + e.qty, value: e.id, right: Math.floor(ITEMS[e.id].price / 2) }));
    return new Menu(items, { x: 84, y: 8, w: UI.W - 92, rows: 9, title: 'SELL' });
  }
  update() {
    this.tb.update();
    if (this.state === 'main') {
      const r = this.main.update();
      if (r && r.select) {
        if (r.select.value === 'leave') { Game.pop(); return; }
        this.state = r.select.value; this.list = this.state === 'buy' ? this.buildBuy() : this.buildSell();
        this.tb.say(this.state === 'buy' ? 'Take a look. Touch nothing until you pay.' : 'Show me what you got. I pay half. Half is generous.', { speaker: this.keeper });
      }
      return;
    }
    const r = this.list.update();
    if (!r) { const it = this.list.selected; if (it && it.value && ITEMS[it.value]) this.desc = ITEMS[it.value].desc; return; }
    if (r.cancel) { this.state = 'main'; this.list = null; this.desc = null; return; }
    const id = r.select.value; const item = ITEMS[id];
    if (this.state === 'buy') {
      if (G.party.money < item.price) { this.tb.say('You can\'t afford that. I can\'t afford this conversation.', { speaker: this.keeper }); Sound.sfx('error'); return; }
      if (!G.party.addItem(id)) { this.tb.say('Your pockets are full. Physically. I can see them.', { speaker: this.keeper }); Sound.sfx('error'); return; }
      G.party.money -= item.price; Sound.sfx('coin'); G.unlock('shopper');
      this.tb.say('Sold! One ' + item.name + '. Pleasure doing business.', { speaker: this.keeper });
    } else {
      const price = Math.floor(item.price / 2);
      G.party.removeItem(id); G.party.money += price; Sound.sfx('coin');
      this.tb.say('I\'ll give you ' + price + ' for the ' + item.name + '. Done.', { speaker: this.keeper });
      this.list = this.buildSell();
    }
  }
  draw(ctx) {
    UI.fade(ctx, 0.5);
    this.main.active = this.state === 'main'; this.main.draw(ctx);
    UI.window(ctx, 8, 52, 70, 24); UI.text(ctx, 'Gold', 14, 57, UI.COLORS.dim); UI.text(ctx, String(G.party.money), 14, 66, '#fff');
    UI.window(ctx, 8, 84, 70, 60);
    Sprites.draw(ctx, 'human_down', 35, 96, { pal: { 1: '#a06020', 2: '#603010', 3: '#402010' }, scale: 2 });
    if (this.list) {
      this.list.draw(ctx);
      if (this.desc) { UI.window(ctx, 84, 128, UI.W - 92, 28); UI.wrap(ctx, this.desc, UI.W - 106).slice(0, 2).forEach((l, i) => UI.text(ctx, l, 90, 134 + i * 10, UI.COLORS.dim)); }
    }
    this.tb.draw(ctx);
  }
}
