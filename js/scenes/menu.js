// ---- Shared item/skill effects (used by menu and battle) ----------------------------------
const Effects = {
  // returns {ok, text}
  healItem(actor, itemId) {
    const it = ITEMS[itemId]; const parts = [];
    if (it.revive) {
      if (actor.alive) return { ok: false, text: actor.name + ' is not down. Save it.' };
      actor.revive(it.revive); return { ok: true, text: actor.name + ' is back on their feet!' };
    }
    if (!actor.alive) return { ok: false, text: actor.name + ' can\'t eat right now. Being unconscious.' };
    if (it.hp) { const before = Math.max(0, actor.hp); actor.heal(it.hp); parts.push('recovered ' + (Math.min(actor.maxhp, before + it.hp) - before) + ' HP'); }
    if (it.mp) { const before = actor.mp; actor.healMp(it.mp); parts.push('recovered ' + (actor.mp - before) + ' MP'); }
    if (it.cure) { let cured = false; for (const s of it.cure) if (actor.hasStatus(s)) { actor.cure(s); cured = true; } if (cured) parts.push('was cured'); }
    if (!parts.length) return { ok: true, text: actor.name + ' used the ' + it.name + '. Nothing happened. Delicious, though.' };
    return { ok: true, text: actor.name + ' ' + parts.join(' and ') + '.' };
  },
  fieldSkill(user, skillId, target) {
    const sk = SKILLS[skillId];
    if (user.mp < sk.mp) return { ok: false, text: 'Not enough MP.' };
    const targets = sk.target === 'allies' ? G.party.members.filter(m => m.alive) : [target];
    if (sk.target === 'ally' && !target.alive && !sk.revive) return { ok: false, text: target.name + ' is down. That won\'t help.' };
    user.mp -= sk.mp;
    const names = [];
    for (const t of targets) {
      if (!t.alive && sk.revive) t.revive(1);
      else if (t.alive) t.heal(sk.power);
      if (sk.cure) t.cure();
      t.hpDisplay = Math.max(0, t.hp);
      names.push(t.name);
    }
    Sound.sfx('heal');
    return { ok: true, text: user.name + ' used ' + sk.name + '. ' + U.listNames(names) + ' feel' + (names.length > 1 ? '' : 's') + ' better.' };
  },
  equip(actor, itemId) {
    const it = ITEMS[itemId]; const slot = it.type;
    const old = actor.equip[slot];
    G.party.removeItem(itemId);
    if (old) G.party.addItem(old);
    actor.equip[slot] = itemId;
    actor.hp = Math.min(actor.hp, actor.maxhp); actor.hpDisplay = Math.max(0, actor.hp);
    Sound.sfx('item');
    return { ok: true, text: actor.name + ' equipped the ' + it.name + '.' };
  },
};

// ---- Pause menu ------------------------------------------------------------------------
class MenuScene {
  constructor(opts) {
    this.opts = opts || {}; this.transparent = true; this.stack = [];
    this.tb = new TextBox(8, 160, UI.W - 16, 56, { instant: true }); this.msg = false;
  }
  enter() {
    const items = [{ label: 'Goods', value: 'items' }, { label: 'Skills', value: 'skills' }, { label: 'Equip', value: 'equip' }, { label: 'Status', value: 'status' }, { label: 'Party', value: 'party' }, { label: 'Ranking', value: 'ranking' }, { label: 'Sponsors', value: 'sponsors' }, { label: 'Trophies', value: 'trophies' }];
    if (this.opts.inSafeRoom) items.push({ label: 'Save', value: 'save' });
    items.push({ label: 'Close', value: 'close' });
    this.push(new Menu(items, { x: 8, y: 8, w: 84 }), it => this.mainSelect(it.value), ctx => this.drawPartyStrip(ctx));
  }
  push(menu, onSelect, panel, onCancel) { this.stack.push({ menu, onSelect, panel, onCancel }); }
  pop() { this.stack.pop(); if (!this.stack.length) Game.pop(); }
  get top() { return this.stack[this.stack.length - 1]; }
  // y just below the main menu column, for panels that share the left edge with it
  get leftY() { return 8 + this.stack[0].menu.h + 6; }
  message(text) { this.tb.say(text); this.msg = true; }
  update() {
    this.tb.update();
    if (this.msg) { if (this.tb.done) { this.msg = false; this.tb.hide(); } return; }
    const top = this.top; if (!top) { Game.pop(); return; }
    const r = top.menu.update();
    if (!r) return;
    if (r.cancel) { if (top.onCancel) top.onCancel(); else this.pop(); }
    else top.onSelect(r.select, r.index);
  }
  draw(ctx) {
    UI.fade(ctx, 0.45);
    this.stack.forEach((s, i) => { s.menu.active = i === this.stack.length - 1; s.menu.draw(ctx); });
    const top = this.top; if (top && top.panel) top.panel(ctx);
    this.tb.draw(ctx);
  }
  // ---- panels ----
  drawPartyStrip(ctx) {
    const ms = G.party.members;
    ms.forEach((m, i) => {
      const y = 8 + i * 36;
      UI.window(ctx, 100, y, UI.W - 108, 34);
      const [sp] = Sprites.facing(m.sprite, 'down'); Sprites.draw(ctx, sp, 104, y + 9, { pal: m.pal });
      UI.text(ctx, m.name.slice(0, 8), 122, y + 5, m.alive ? '#fff' : UI.COLORS.bad);
      UI.text(ctx, 'L' + m.level, UI.W - 42, y + 5, UI.COLORS.dim);
      UI.text(ctx, 'HP' + U.pad(Math.max(0, m.hp), 4) + ' MP' + U.pad(m.mp, 3), 122, y + 16, '#fff');
      const st = Object.keys(m.status).map(s => STATUS_INFO[s].short).slice(0, 2).join(' ');
      if (st) UI.text(ctx, st, 196, y + 5, UI.COLORS.bad);
    });
    const gy = this.leftY; UI.window(ctx, 8, gy, 84, 36);
    UI.text(ctx, 'Gold', 14, gy + 5, UI.COLORS.dim); UI.text(ctx, String(G.party.money), 14, gy + 15, '#fff');
    UI.text(ctx, 'F' + G.floor, 62, gy + 15, UI.COLORS.dim);
  }
  descPanel(text) { return ctx => { UI.window(ctx, 8, 128, UI.W - 16, 28); UI.wrap(ctx, text || '', UI.W - 30).slice(0, 2).forEach((l, i) => UI.text(ctx, l, 14, 134 + i * 10, UI.COLORS.dim)); }; }
  // ---- main ----
  mainSelect(v) {
    if (v === 'close') { Game.pop(); return; }
    if (v === 'items') this.openItems();
    else if (v === 'skills') this.openSkills();
    else if (v === 'equip') this.openEquip();
    else if (v === 'status') this.openStatus();
    else if (v === 'party') this.openParty();
    else if (v === 'ranking') this.openRanking();
    else if (v === 'sponsors') this.openSponsors();
    else if (v === 'trophies') this.openTrophies();
    else if (v === 'save') { if (G.save()) this.message('Progress saved. The network thanks you for your data.'); else this.message('Save failed. Storage is unavailable in this browser.'); }
  }
  memberMenu(title, filter) {
    const ms = G.party.members.filter(filter || (() => true));
    return new Menu(ms.map(m => ({ label: m.name, value: m, right: m.alive ? Math.max(0, m.hp) + 'hp' : 'KO' })), { x: 100, y: 8, w: UI.W - 108, title });
  }
  // ---- goods ----
  itemsMenu() {
    return new Menu(G.party.inventory.map(e => ({ label: ITEMS[e.id].name, value: e.id, right: 'x' + e.qty })), { x: 100, y: 8, w: UI.W - 108, rows: 9, title: 'GOODS' });
  }
  openItems() {
    const menu = this.itemsMenu();
    this.push(menu, it => this.itemActions(it.value), ctx => { const it = menu.selected; this.descPanel(it && it.value ? ITEMS[it.value].desc : '')(ctx); });
  }
  refreshItems() {
    // rebuild the goods list after inventory changes (keeps cursor)
    const entry = this.stack.find(s => s.menu.title === 'GOODS'); if (!entry) return;
    const c = entry.menu.cursor; entry.menu.setItems(G.party.inventory.map(e => ({ label: ITEMS[e.id].name, value: e.id, right: 'x' + e.qty }))); entry.menu.cursor = Math.min(c, entry.menu.items.length - 1);
  }
  itemActions(id) {
    const it = ITEMS[id]; const acts = [];
    if (it.type === 'heal') acts.push({ label: 'Use', value: 'use' });
    if (it.type === 'box') acts.push({ label: 'Open', value: 'open' });
    if (it.type === 'weapon' || it.type === 'armor' || it.type === 'acc') acts.push({ label: 'Equip', value: 'equip' });
    acts.push({ label: 'Drop', value: 'drop' });
    this.push(new Menu(acts, { x: 30, y: 60, w: 70 }), a => {
      if (a.value === 'use') {
        this.push(this.memberMenu('USE ON'), m => { const r = Effects.healItem(m.value, id); if (r.ok) { G.party.removeItem(id); Sound.sfx('heal'); } this.message(r.text); this.stack.pop(); this.stack.pop(); this.refreshItems(); });
      } else if (a.value === 'open') {
        G.party.removeItem(id);
        const res = G.openLootBox(it.tier); Sound.sfx('item');
        const txt = res.map(r => r.money != null ? (r.overflow ? ITEMS[r.overflow].name + ' (no room, sold for ' + r.money + 'g)' : r.money + ' gold') : ITEMS[r.id].name).join(', ');
        this.message('The box hisses open. You got: ' + txt + '.'); this.stack.pop(); this.refreshItems();
      } else if (a.value === 'equip') {
        this.push(this.memberMenu('EQUIP ON'), m => { const r = Effects.equip(m.value, id); this.message(r.text); this.stack.pop(); this.stack.pop(); this.refreshItems(); });
      } else if (a.value === 'drop') {
        G.party.removeItem(id); Sound.sfx('cancel'); this.message('You tossed the ' + it.name + '. A drone collected it immediately.'); this.stack.pop(); this.refreshItems();
      }
    });
  }
  // ---- skills ----
  openSkills() {
    this.push(this.memberMenu('WHO'), m => {
      const user = m.value;
      const sks = user.skills.filter(s => SKILLS[s].field).map(s => ({ label: SKILLS[s].name, value: s, right: SKILLS[s].mp + 'mp', disabled: user.mp < SKILLS[s].mp }));
      const menu = new Menu(sks, { x: 100, y: 8, w: UI.W - 108, title: user.name });
      this.push(menu, sk => {
        const skill = SKILLS[sk.value];
        if (skill.target === 'allies') { const r = Effects.fieldSkill(user, sk.value); this.message(r.text); return; }
        this.push(this.memberMenu('ON WHOM'), t => { const r = Effects.fieldSkill(user, sk.value, t.value); this.message(r.text); this.stack.pop(); menu.setItems(user.skills.filter(s => SKILLS[s].field).map(s => ({ label: SKILLS[s].name, value: s, right: SKILLS[s].mp + 'mp', disabled: user.mp < SKILLS[s].mp }))); });
      }, ctx => { const it = menu.selected; if (it && it.value) this.descPanel(SKILLS[it.value].kind === 'heal' ? 'Heals ' + (SKILLS[it.value].power >= 9999 ? 'fully' : SKILLS[it.value].power + ' HP') + (SKILLS[it.value].cure ? ' and cures ailments' : '') + '.' : '')(ctx); });
    });
  }
  // ---- equip ----
  openEquip() {
    this.push(this.memberMenu('WHO'), m => {
      const a = m.value;
      const slotMenu = () => new Menu(['weapon', 'armor', 'acc'].map(s => ({ label: U.padR(s === 'acc' ? 'Acc.' : s[0].toUpperCase() + s.slice(1), 7) + (a.equip[s] ? ITEMS[a.equip[s]].name : '-'), value: s })), { x: 100, y: 8, w: UI.W - 108, title: a.name });
      const sm = slotMenu();
      this.push(sm, slot => {
        const opts = G.party.inventory.filter(e => ITEMS[e.id].type === slot.value).map(e => {
          const it = ITEMS[e.id]; const stat = Object.keys(it.stat || {}).map(k => k.toUpperCase() + (it.stat[k] >= 0 ? '+' : '') + it.stat[k]).join(' ');
          return { label: it.name, value: e.id, right: stat };
        });
        if (a.equip[slot.value]) opts.push({ label: '(Remove)', value: '__remove' });
        this.push(new Menu(opts, { x: 100, y: 60, w: UI.W - 108, rows: 6, title: 'CHOOSE' }), it => {
          if (it.value === '__remove') { if (G.party.addItem(a.equip[slot.value])) { a.equip[slot.value] = null; Sound.sfx('cancel'); } else this.message('No room in your pockets.'); }
          else { const r = Effects.equip(a, it.value); this.message(r.text); }
          this.stack.pop(); sm.setItems(slotMenu().items);
        });
      }, ctx => this.drawStats(ctx, a, 8, this.leftY));
    });
  }
  drawStats(ctx, a, x, y) {
    UI.window(ctx, x, y, 84, 92);
    const rows = [['STR', a.str], ['DEF', a.def], ['SPD', a.spd], ['LCK', a.luck], ['HP', a.maxhp], ['MP', a.maxmp]];
    rows.forEach((r, i) => { UI.text(ctx, r[0], x + 6, y + 6 + i * 13, UI.COLORS.dim); UI.text(ctx, String(r[1]), x + 78 - UI.width(ctx, String(r[1])), y + 6 + i * 13, '#fff'); });
  }
  // ---- status ----
  openStatus() {
    const menu = this.memberMenu('STATUS');
    this.push(menu, () => {}, ctx => {
      const a = menu.selected && menu.selected.value; if (!a) return;
      const ly = this.leftY; UI.window(ctx, 8, ly, 84, 92); const cls = CLASSES[a.cls].name;
      const rows = [['Lv', a.level], ['', cls], ['STR', a.str], ['DEF', a.def], ['SPD', a.spd], ['LCK', a.luck]];
      rows.forEach((r, i) => { UI.text(ctx, r[0], 14, ly + 6 + i * 13, UI.COLORS.dim); UI.text(ctx, String(r[1]), 86 - UI.width(ctx, String(r[1])), ly + 6 + i * 13, i === 1 ? UI.COLORS.sys : '#fff'); });
      UI.window(ctx, 100, 8 + G.party.members.length * 12 + 12, UI.W - 108, 60);
      const yy = 8 + G.party.members.length * 12 + 18;
      UI.text(ctx, 'HP ' + Math.max(0, a.hp) + '/' + a.maxhp, 106, yy, '#fff');
      UI.text(ctx, 'MP ' + a.mp + '/' + a.maxmp, 106, yy + 11, '#fff');
      UI.text(ctx, 'EXP ' + a.exp + '  Next ' + a.expToNext(), 106, yy + 22, UI.COLORS.dim);
      UI.text(ctx, 'W:' + (a.equip.weapon ? ITEMS[a.equip.weapon].name : '-'), 106, yy + 33, UI.COLORS.dim);
      UI.text(ctx, 'A:' + (a.equip.armor ? ITEMS[a.equip.armor].name : '-'), 106, yy + 44, UI.COLORS.dim);
    });
  }
  // ---- party ----
  openParty() {
    const menu = this.memberMenu('PARTY');
    this.push(menu, m => {
      const a = m.value;
      if (!a.crawlerId) { this.message(a.isPlayer ? 'That\'s you. You\'re stuck with you.' : 'Tibbs refuses to be dismissed. "I have tenure."'); return; }
      this.push(new Menu([{ label: 'Dismiss', value: 'dismiss' }, { label: 'Never mind', value: 'no' }], { x: 30, y: 60, w: 100 }), c => {
        this.stack.pop();
        if (c.value === 'dismiss') { G.dismiss(a); this.message(a.name + ' leaves the party. They\'ll be around on this floor.'); menu.setItems(this.memberMenu('PARTY').items); const ow = Game.scenes.find(s => s instanceof OverworldScene); if (ow) ow.rebuildFollowers(); if (ow) ow.spawnCrawlerNearPlayer(a.crawlerId); }
      });
    }, ctx => {
      const a = menu.selected && menu.selected.value; if (!a) return;
      const bio = a.crawlerId ? CRAWLERS[a.crawlerId].bio : a.isPlayer ? 'You. Pajamas. Destiny.' : 'A raccoon granted sapience by the network. Regrets it hourly.';
      const by = this.leftY; UI.window(ctx, 8, by, UI.W - 16, 40); UI.text(ctx, CLASSES[a.cls].name + '  Lv' + a.level, 14, by + 6, UI.COLORS.sys);
      UI.wrap(ctx, bio, UI.W - 30).slice(0, 2).forEach((l, i) => UI.text(ctx, l, 14, by + 17 + i * 10, UI.COLORS.dim));
    });
  }
  // ---- sponsors ----
  openSponsors() {
    const rows = G.sponsors.map(s => ({ label: SPONSORS[s.id].name, value: s.id, right: s.sat + '%' }));
    if (!rows.length) rows.push({ label: 'No sponsors yet', value: null, disabled: true });
    const menu = new Menu(rows, { x: 100, y: 8, w: UI.W - 108, title: 'SPONSORS' });
    this.push(menu, () => {}, ctx => {
      const it = menu.selected; const s = it && it.value && G.sponsors.find(x => x.id === it.value);
      const y = 8 + rows.length * 12 + 14;
      UI.window(ctx, 100, y, UI.W - 108, 78);
      if (!s) { UI.wrap(ctx, 'Sponsors make offers when you reach a new floor. Do things they like to keep them, and they send boxes. Up to three at once.', UI.W - 122).slice(0, 6).forEach((l, i) => UI.text(ctx, l, 106, y + 6 + i * 10, UI.COLORS.dim)); return; }
      const sp = SPONSORS[s.id];
      const text = sp.tagline + ' Revenue ' + s.revenue + '. Likes: ' + Object.keys(sp.likes).join(', ') + '.' + (Object.keys(sp.dislikes).length ? ' Hates: ' + Object.keys(sp.dislikes).join(', ') + '.' : '') + (sp.generosity === 0 ? ' Pays cash instead of boxes.' : '');
      UI.wrap(ctx, text, UI.W - 122).slice(0, 6).forEach((l, i) => UI.text(ctx, l, 106, y + 6 + i * 10, i === 0 ? UI.COLORS.sys : UI.COLORS.dim));
    });
  }
  // ---- trophies ----
  openTrophies() {
    const ids = Object.keys(ACHIEVEMENTS);
    const rows = ids.map(id => ({ label: G.achievements[id] ? ACHIEVEMENTS[id].title : '???', value: id, color: G.achievements[id] ? UI.COLORS.sys : UI.COLORS.dim }));
    const menu = new Menu(rows, { x: 100, y: 8, w: UI.W - 108, rows: 9, title: 'TROPHIES ' + ids.filter(i => G.achievements[i]).length + '/' + ids.length });
    this.push(menu, () => {}, ctx => {
      const it = menu.selected; if (!it) return; const a = ACHIEVEMENTS[it.value];
      const text = G.achievements[it.value] ? a.text : 'Locked. Hint: ' + a.hint;
      UI.window(ctx, 8, 128, UI.W - 16, 30); UI.wrap(ctx, text, UI.W - 30).slice(0, 2).forEach((l, i) => UI.text(ctx, l, 14, 134 + i * 10, UI.COLORS.dim));
    });
  }
  // ---- ranking ----
  openRanking() {
    const rows = G.scoreboard().map((r, i) => ({ label: U.pad(i + 1, 2) + '. ' + r.name, value: null, right: r.score + ' ' + r.status, color: r.you ? UI.COLORS.sys : r.status === 'OUT' ? UI.COLORS.dim : '#fff' }));
    this.push(new Menu(rows, { x: 40, y: 8, w: UI.W - 48, rows: 10, title: 'VIEWER RANKING' }), () => {}, ctx => { UI.window(ctx, 40, 134, UI.W - 48, 20); UI.text(ctx, 'Notoriety: ' + G.notoriety + '  Kills: ' + G.kills, 46, 140, UI.COLORS.dim); });
  }
}
