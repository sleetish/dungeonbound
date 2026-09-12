// ---- Global game state -------------------------------------------------------------
const G = {
  SAVE_KEY: 'dungeonbound_save_v1',
  party: null, playerName: 'Sam', floor: 1, floorStates: {}, crawlers: {}, notoriety: 0,
  achievements: {}, kills: 0, playtime: 0, flags: {}, pkThisFloor: false, score: 0, deepest: 1,

  newGame(name) {
    this.playerName = name || 'Sam'; this.floor = 1; this.floorStates = {}; this.crawlers = {}; this.notoriety = 0;
    this.achievements = {}; this.kills = 0; this.playtime = 0; this.flags = {}; this.pkThisFloor = false; this.score = 0; this.deepest = 1;
    this.party = new Party();
    const hero = new Actor({ name: this.playerName, cls: 'crawler', isPlayer: true, level: 1, pal: { 1: '#d83030', 2: '#885030', 3: '#3868d0' } });
    hero.equip.armor = 'pajamas';
    this.party.add(hero);
    this.party.addItem('ration', 2); this.party.money = 30;
    for (const id in CRAWLERS) {
      const c = CRAWLERS[id];
      let floor = 1; FLOORS.forEach((f, i) => { if (f.crawlers.includes(id)) floor = i + 1; });
      this.crawlers[id] = { aggression: c.aggression, level: c.level, status: 'active', floor, score: c.level * 40 + Math.floor(Math.random() * 60), met: false, gifts: 0 };
    }
  },
  floorState(n) {
    n = n || this.floor;
    if (!this.floorStates[n]) this.floorStates[n] = { chests: {}, enemies: {}, bossDefeated: false, visited: false, crawlerPos: {} };
    return this.floorStates[n];
  },
  get hero() { return this.party.members.find(m => m.isPlayer) || this.party.leader; },
  // ---- achievements & loot -------------------------------------------------------
  unlock(id) {
    if (this.achievements[id]) return false;
    const a = ACHIEVEMENTS[id]; if (!a) return false;
    this.achievements[id] = true; this.score += 50;
    let text = a.text;
    if (a.reward) { if (!this.party.addItem(a.reward)) { this.party.money += 100; text += ' (Inventory full: converted to 100 gold.)'; } }
    Toast.show('New Achievement! [' + a.title + ']', text);
    return true;
  },
  openLootBox(tier) {
    const table = LOOT_TABLES[tier] || LOOT_TABLES[1]; const results = [];
    const n = tier + 1;
    for (let i = 0; i < n; i++) {
      const e = U.weighted(table);
      if (e.id === 'money') { const amt = U.rand(e.amt[0], e.amt[1]); this.party.money += amt; results.push({ money: amt }); }
      else if (this.party.addItem(e.id)) results.push({ id: e.id });
      else { this.party.money += ITEMS[e.id].price; results.push({ money: ITEMS[e.id].price, overflow: e.id }); }
    }
    return results;
  },
  // ---- crawler diplomacy ---------------------------------------------------------
  disposition(id) {
    const a = this.crawlers[id].aggression;
    return a >= 70 ? 'hostile' : a >= 30 ? 'wary' : 'friendly';
  },
  adjustAggression(id, d) { const c = this.crawlers[id]; c.aggression = U.clamp(c.aggression + d, 0, 100); },
  raiseNotoriety(d) {
    this.notoriety += d;
    for (const id in this.crawlers) if (this.crawlers[id].status === 'active') this.adjustAggression(id, d);
  },
  // gift result: {text, joins}
  giveGift(id, itemId) {
    const c = CRAWLERS[id], st = this.crawlers[id], it = ITEMS[itemId];
    this.party.removeItem(itemId); st.gifts++;
    this.unlock('gift');
    if (itemId === c.wants) { st.aggression = 0; return { text: c.lines.wantGift, joins: !this.party.full, wanted: true }; }
    this.adjustAggression(id, -(it.gift || 5) - 5);
    return { text: c.lines.gift, joins: false };
  },
  recruitChance(id) {
    const st = this.crawlers[id];
    const heroLv = this.hero.level;
    let p = (100 - st.aggression) / 100 * 0.75 + (heroLv - st.level) * 0.05 + this.hero.luck * 0.01 + st.gifts * 0.1;
    return U.clamp(p, 0.05, 0.98);
  },
  tryRecruit(id) {
    const c = CRAWLERS[id], st = this.crawlers[id];
    if (this.party.full) return { ok: false, text: 'Your party is full. (Max 4.)' };
    if (U.chance(this.recruitChance(id))) return { ok: true, text: c.lines.recruitOk };
    this.adjustAggression(id, 5);
    return { ok: false, text: c.lines.recruitNo };
  },
  recruit(id) {
    const st = this.crawlers[id];
    const actor = this.makeCrawlerActor(id);
    if (!this.party.add(actor)) return null;
    st.status = 'party';
    this.unlock('recruit');
    if (this.party.full) this.unlock('fullparty');
    return actor;
  },
  dismiss(actor) {
    if (!actor.crawlerId) return;
    const st = this.crawlers[actor.crawlerId];
    st.status = 'active'; st.level = actor.level; st.aggression = Math.min(st.aggression, 20); st.floor = this.floor;
    this.party.remove(actor);
  },
  makeCrawlerActor(id) {
    const c = CRAWLERS[id], st = this.crawlers[id];
    const a = new Actor({ name: c.name, cls: c.cls, crawlerId: id, level: st.level, pal: c.pal });
    const gear = { sniper: 'nerf', brawler: 'bat', medic: 'pipe', rogue: 'cleaver', tank: 'mop', mage: 'pipe', streamer: 'pipe', cleric: 'mop' };
    if (gear[c.cls] && st.level >= 4) a.equip.weapon = gear[c.cls];
    a.equip.armor = st.level >= 6 ? 'kevlar' : 'vest';
    return a;
  },
  eliminateCrawler(id) {
    const st = this.crawlers[id]; st.status = 'eliminated';
    this.raiseNotoriety(12); this.pkThisFloor = true; this.score += 150;
    this.unlock('pk');
  },
  // called when descending: the competition moves too
  advanceCrawlers(newFloor) {
    for (const id in this.crawlers) {
      const st = this.crawlers[id];
      if (st.status !== 'active') continue;
      if (st.floor < newFloor && U.chance(0.6)) { st.floor = newFloor; st.level += U.rand(1, 2); st.score += 100; }
      st.score += U.rand(10, 40);
    }
  },
  tickScores() { for (const id in this.crawlers) { const st = this.crawlers[id]; if (st.status === 'active') st.score += U.rand(0, 2); } },
  scoreboard() {
    const rows = [{ name: this.playerName, score: this.score, status: 'YOU', you: true }];
    for (const id in this.crawlers) {
      const st = this.crawlers[id];
      rows.push({ name: CRAWLERS[id].name, score: st.score, status: st.status === 'party' ? 'PARTY' : st.status === 'eliminated' ? 'OUT' : 'F' + st.floor });
    }
    rows.sort((a, b) => b.score - a.score);
    return rows;
  },
  // ---- enemy factories -----------------------------------------------------------
  makeEnemy(key, floorN) {
    const d = ENEMIES[key];
    let mult = 1, lvl = d.level;
    if (floorN > 3 && !d.boss) { mult = 1 + (floorN - 3) * 0.18; lvl = d.level + (floorN - 3) * 2; }
    if (floorN > 3 && d.boss) { mult = 1 + (floorN - 3) * 0.25; lvl = d.level + (floorN - 3) * 2; }
    const sc = v => Math.round(v * mult);
    return { key, name: d.name, sprite: d.sprite, pal: null, level: lvl, maxhp: sc(d.hp), hp: sc(d.hp), str: sc(d.str), def: sc(d.def), spd: sc(d.spd), luck: d.luck,
      exp: sc(d.exp), money: sc(d.money), drops: d.drops || [], actions: d.actions, status: {}, buffs: {}, boss: !!d.boss, article: d.article, intro: d.intro, scale: d.boss ? 4 : 3,
      get alive() { return this.hp > 0; } };
  },
  makeCrawlerEnemy(id) {
    const c = CRAWLERS[id], st = this.crawlers[id];
    const a = this.makeCrawlerActor(id);
    const actions = [{ type: 'attack', verb: 'attacks', w: 5 }];
    for (const s of a.skills) actions.push({ type: 'skill', id: s, w: 2 });
    return { key: 'crawler', name: c.name, sprite: a.sprite === 'raccoon' ? 'raccoon_down' : 'human_down', pal: c.pal, level: a.level, maxhp: a.maxhp, hp: a.maxhp,
      str: a.str, def: a.def, spd: a.spd, luck: a.luck, exp: 30 + a.level * 18, money: 40 + a.level * 25, drops: [{ id: 'box_silver', p: 0.5 }],
      actions, status: {}, buffs: {}, boss: false, article: '', isCrawler: true, crawlerId: id, scale: 3, get alive() { return this.hp > 0; } };
  },
  // ---- save / load ---------------------------------------------------------------
  toJSON() {
    return { v: 1, playerName: this.playerName, floor: this.floor, floorStates: this.floorStates, crawlers: this.crawlers, notoriety: this.notoriety,
      achievements: this.achievements, kills: this.kills, playtime: this.playtime, flags: this.flags, pkThisFloor: this.pkThisFloor, score: this.score, deepest: this.deepest,
      party: this.party.toJSON() };
  },
  fromJSON(j) {
    this.playerName = j.playerName; this.floor = j.floor; this.floorStates = j.floorStates; this.crawlers = j.crawlers; this.notoriety = j.notoriety;
    this.achievements = j.achievements; this.kills = j.kills; this.playtime = j.playtime; this.flags = j.flags; this.pkThisFloor = j.pkThisFloor; this.score = j.score; this.deepest = j.deepest || j.floor;
    this.party = Party.fromJSON(j.party);
  },
  storage() { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } },
  save() { const s = this.storage(); if (!s) return false; try { s.setItem(this.SAVE_KEY, JSON.stringify(this.toJSON())); return true; } catch (e) { return false; } },
  hasSave() { const s = this.storage(); if (!s) return false; try { return !!s.getItem(this.SAVE_KEY); } catch (e) { return false; } },
  load() { const s = this.storage(); if (!s) return false; try { const j = JSON.parse(s.getItem(this.SAVE_KEY)); if (!j) return false; this.fromJSON(j); return true; } catch (e) { return false; } },
};
