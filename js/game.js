// ---- Global game state -------------------------------------------------------------
const G = {
  SAVE_KEY: 'dungeonbound_save_v2',
  CRAWLER_CAP: 3,
  party: null, playerName: 'Sam', floor: 1, floorStates: {}, crawlers: {}, notoriety: 0,
  achievements: {}, kills: 0, playtime: 0, flags: {}, pkThisFloor: false, score: 0, deepest: 1,
  manager: null, stash: [], sponsors: [], declined: {}, stats: {}, floorStats: {}, viewers: 0, bans: {},
  pendingSkillChoices: [], deliveries: [], sponsorLuck: 0, prevRank: 99, log: [],

  newGame(name) {
    this.playerName = name || 'Sam'; this.floor = 1; this.floorStates = {}; this.crawlers = {}; this.notoriety = 0;
    this.achievements = {}; this.kills = 0; this.playtime = 0; this.flags = {}; this.pkThisFloor = false; this.score = 0; this.deepest = 1;
    this.manager = null; this.stash = []; this.sponsors = []; this.declined = {}; this.stats = {}; this.floorStats = {}; this.viewers = 120; this.bans = {};
    this.pendingSkillChoices = []; this.deliveries = []; this.sponsorLuck = 0; this.prevRank = 99; this.log = [];
    this.party = new Party();
    const hero = new Actor({ name: this.playerName, cls: 'crawler', isPlayer: true, level: 1, pal: { 1: '#d83030', 2: '#885030', 3: '#3868d0' } });
    hero.equip.armor = 'pajamas';
    this.party.add(hero);
    this.party.addItem('ration', 2); this.party.money = 30;
    for (const id in CRAWLERS) {
      const c = CRAWLERS[id];
      let floor = 0; FLOORS.forEach((f, i) => { if (f.crawlers.includes(id)) floor = i + 1; });
      if (!floor) floor = 4 + (Object.keys(CRAWLERS).indexOf(id) % 4);
      const t = c.traits || [];
      const kills = t.includes('bloodthirsty') ? U.rand(3, 5) : t.includes('vengeful') ? U.rand(1, 2) : U.rand(0, 1);
      this.crawlers[id] = { aggression: c.aggression, level: c.level, status: 'active', floor, score: c.level * 40 + Math.floor(Math.random() * 60), met: false, gifts: 0,
        kills, lounge: null, inDungeon: true, grudge: false, spared: false, knocked: 0, loyalty: 50 };
    }
    this.populateFloor(1);
  },
  floorState(n) {
    n = n || this.floor;
    if (!this.floorStates[n]) this.floorStates[n] = { chests: {}, enemies: {}, bossDefeated: false, visited: false, crawlerPos: {}, gates: {}, subbosses: {}, timeLeft: null, taunts: {}, sponsorOffered: false, safeVisited: false };
    return this.floorStates[n];
  },
  get hero() { return this.party.members.find(m => m.isPlayer) || this.party.leader; },
  get tibbs() { return this.party.members.find(m => m.cls === 'raccoon'); },
  perk(key) { const m = this.manager && MANAGERS[this.manager]; return m ? (m.perks[key] != null ? m.perks[key] : 0) : (key === 'stash' ? 20 : key === 'rest' ? 'full' : 0); },
  // ---- stats, viewers & events (feed sponsors) -------------------------------------
  event(stat, amount) {
    amount = amount == null ? 1 : amount;
    this.stats[stat] = (this.stats[stat] || 0) + amount; this.floorStats[stat] = (this.floorStats[stat] || 0) + amount;
    for (const s of this.sponsors.slice()) {
      const d = SPONSORS[s.id];
      if (d.likes[stat]) { s.sat = U.clamp(s.sat + d.likes[stat] * amount, 0, 100); s.happyTick = (s.happyTick || 0) + 1; }
      if (d.dislikes[stat]) { s.sat = U.clamp(s.sat - d.dislikes[stat] * amount, 0, 100); Toast.show(d.name + ' is displeased', d.lines.unhappy, '#ff8080'); }
      if (s.sat < 15) this.dropSponsor(s.id, d.lines.drop);
    }
  },
  addViewers(n, reason) {
    n = Math.round(n * (this.perk('sponsorRate') || 1));
    this.viewers = Math.max(0, this.viewers + n); this.score += Math.max(0, Math.round(n / 10));
    if (reason) this.log.push((n >= 0 ? '+' : '') + n + ' viewers: ' + reason);
    if (this.viewers >= 10000) this.unlock('viewers');
  },
  // ---- achievements & loot -------------------------------------------------------
  unlock(id) {
    if (this.achievements[id]) return false;
    const a = ACHIEVEMENTS[id]; if (!a) return false;
    this.achievements[id] = true; this.score += 50; this.addViewers(150);
    let text = a.text;
    if (a.reward) { if (!this.party.addItem(a.reward)) { this.party.money += 100; text += ' (Inventory full: converted to 100 gold.)'; } }
    Toast.show('New Achievement! [' + a.title + ']', text);
    return true;
  },
  openLootBox(tier) {
    const table = LOOT_TABLES[tier] || LOOT_TABLES[1]; const results = [];
    const n = tier + 1; this.event('boxes');
    for (let i = 0; i < n; i++) {
      let e = U.weighted(table);
      if (tier === 3 && U.chance(0.12 + this.sponsorLuck * 0.1)) e = { id: U.choice(['vampfang', 'quickblade', 'luckcoin', 'regenband', 'critlens']) };
      if (e.id === 'money') { const amt = U.rand(e.amt[0], e.amt[1]); this.party.money += amt; results.push({ money: amt }); }
      else if (this.party.addItem(e.id)) { results.push({ id: e.id }); if (ITEMS[e.id].unique) this.unlock('unique'); }
      else { this.party.money += ITEMS[e.id].price; results.push({ money: ITEMS[e.id].price, overflow: e.id }); }
    }
    return results;
  },
  // ---- stash ------------------------------------------------------------------------
  stashCount() { return this.stash.reduce((s, e) => s + e.qty, 0); },
  deposit(id, qty) {
    qty = qty || 1; if (this.stashCount() + qty > this.perk('stash')) return false;
    if (!this.party.removeItem(id, qty)) return false;
    const e = this.stash.find(x => x.id === id); if (e) e.qty += qty; else this.stash.push({ id, qty });
    this.unlock('stash'); return true;
  },
  withdraw(id, qty) {
    qty = qty || 1; const i = this.stash.findIndex(x => x.id === id); if (i < 0) return false;
    if (!this.party.addItem(id, qty)) return false;
    this.stash[i].qty -= qty; if (this.stash[i].qty <= 0) this.stash.splice(i, 1); return true;
  },
  // ---- crawler diplomacy ---------------------------------------------------------
  traits(id) { return (CRAWLERS[id].traits || []).map(t => TRAITS[t]); },
  hasTrait(id, t) { return (CRAWLERS[id].traits || []).includes(t); },
  disposition(id) {
    const a = this.crawlers[id].aggression;
    return a >= 70 ? 'hostile' : a >= 30 ? 'wary' : 'friendly';
  },
  adjustAggression(id, d) { const c = this.crawlers[id]; c.aggression = U.clamp(c.aggression + d, 0, 100); },
  raiseNotoriety(d) {
    this.notoriety += d;
    for (const id in this.crawlers) if (this.crawlers[id].status === 'active') this.adjustAggression(id, d);
  },
  charisma() { return this.party.members.some(m => m.hasPassive('charisma')) ? 0.25 : 0; },
  giveGift(id, itemId) {
    const c = CRAWLERS[id], st = this.crawlers[id], it = ITEMS[itemId];
    this.party.removeItem(itemId); st.gifts++;
    this.unlock('gift'); this.event('gifts'); if (itemId === 'treat') this.event('treats');
    if (itemId === c.wants) { st.aggression = 0; return { text: c.lines.wantGift, joins: !this.party.full, wanted: true }; }
    const mult = this.hasTrait(id, 'greedy') ? 2 : 1;
    this.adjustAggression(id, -((it.gift || 5) + 5) * mult);
    return { text: c.lines.gift, joins: false };
  },
  rank() { return this.scoreboard().findIndex(r => r.you) + 1; },
  recruitChance(id) {
    const st = this.crawlers[id];
    const heroLv = this.hero.level;
    let p = (100 - st.aggression) / 100 * 0.75 + (heroLv - st.level) * 0.05 + this.hero.luck * 0.01 + st.gifts * 0.1 + this.charisma();
    if (st.spared) p += 0.2;
    if (this.hasTrait(id, 'social')) p += 0.15;
    if ((this.hasTrait(id, 'showboat') || this.hasTrait(id, 'opportunist'))) p += this.rank() <= 3 ? 0.25 : -0.15;
    return U.clamp(p, 0.05, 0.98);
  },
  tryRecruit(id) {
    const c = CRAWLERS[id];
    if (this.party.full) return { ok: false, text: 'Your party is full. (Max 4.)' };
    if (U.chance(this.recruitChance(id))) return { ok: true, text: c.lines.recruitOk };
    this.adjustAggression(id, 5);
    return { ok: false, text: c.lines.recruitNo };
  },
  recruit(id) {
    const st = this.crawlers[id];
    const actor = this.makeCrawlerActor(id);
    if (!this.party.add(actor)) return null;
    actor.loyalty = st.spared ? 70 : 50;
    st.status = 'party'; st.lounge = null; st.grudge = false;
    this.unlock('recruit'); this.event('recruits'); this.addViewers(300, 'new party member');
    if (this.party.full) this.unlock('fullparty');
    return actor;
  },
  dismiss(actor) {
    if (!actor.crawlerId) return;
    const st = this.crawlers[actor.crawlerId];
    st.status = 'active'; st.level = actor.level; st.aggression = Math.min(st.aggression, 20); st.floor = this.floor; st.inDungeon = true;
    this.party.remove(actor); this.event('dismissals');
  },
  adjustLoyalty(actor, d) {
    if (!actor.crawlerId) return;
    const mult = this.traits(actor.crawlerId).reduce((m, t) => m * (t.loyalMult || 1), 1);
    actor.loyalty = U.clamp((actor.loyalty == null ? 50 : actor.loyalty) + d * mult, 0, 100);
    if (actor.loyalty >= 100) this.unlock('loyal');
  },
  // called when descending: disloyal recruits walk out
  checkLoyalty() {
    const leavers = [];
    for (const m of this.party.members.slice()) {
      if (!m.crawlerId) continue;
      if (this.hasTrait(m.crawlerId, 'loyal')) continue;
      const low = m.loyalty < 20 || (this.hasTrait(m.crawlerId, 'opportunist') && this.rank() > 6 && U.chance(0.3));
      if (low) { this.party.remove(m); const st = this.crawlers[m.crawlerId]; st.status = 'active'; st.floor = this.floor; st.aggression = 60; st.grudge = U.chance(0.5); st.level = m.level; leavers.push(m.name); }
    }
    return leavers;
  },
  makeCrawlerActor(id) {
    const c = CRAWLERS[id], st = this.crawlers[id];
    const a = new Actor({ name: c.name, cls: c.cls, crawlerId: id, level: st.level, pal: c.pal });
    const gear = { sniper: 'nerf', brawler: 'bat', medic: 'pipe', rogue: 'cleaver', tank: 'mop', mage: 'pipe', streamer: 'pipe', cleric: 'mop' };
    if (gear[c.cls] && st.level >= 4) a.equip.weapon = gear[c.cls];
    a.equip.armor = st.level >= 9 ? 'plate' : st.level >= 6 ? 'kevlar' : 'vest';
    a.loyalty = 50;
    return a;
  },
  // ---- post-fight outcomes for a downed crawler -----------------------------------
  finishCrawler(id) {
    const st = this.crawlers[id]; st.status = 'eliminated';
    this.raiseNotoriety(12); this.pkThisFloor = true; this.score += 150; this.sponsorLuck += 0.15;
    this.event('finishes'); this.addViewers(this.hasTrait(id, 'showboat') ? 1500 : 900, 'finished ' + CRAWLERS[id].name);
    for (const m of this.party.members) if (m.crawlerId && (this.hasTrait(m.crawlerId, 'pacifist') || this.hasTrait(m.crawlerId, 'honorable'))) this.adjustLoyalty(m, -12);
    this.unlock('pk');
  },
  knockoutCrawler(id) {
    const st = this.crawlers[id]; const a = this.makeCrawlerActor(id);
    const loot = []; const money = 40 + st.level * 25;
    this.party.money += money; loot.push({ money });
    for (const slot of ['weapon', 'armor']) if (a.equip[slot] && this.party.addItem(a.equip[slot])) loot.push({ id: a.equip[slot] });
    st.aggression = U.clamp(st.aggression + 25, 0, 100); st.grudge = this.hasTrait(id, 'honorable') ? false : (this.hasTrait(id, 'vengeful') || U.chance(0.4)); st.knocked++;
    st.floor = this.floor + 1; st.inDungeon = U.chance(0.5);
    this.event('knockouts'); this.addViewers(-200, 'knocked out ' + CRAWLERS[id].name); this.unlock('knockout');
    return loot;
  },
  releaseCrawler(id) {
    const st = this.crawlers[id];
    st.spared = true; st.aggression = U.clamp(st.aggression - 30 - (this.hasTrait(id, 'honorable') ? 40 : 0), 0, 100);
    st.grudge = this.hasTrait(id, 'vengeful') || this.hasTrait(id, 'bloodthirsty') ? U.chance(0.6) : false;
    if (this.hasTrait(id, 'honorable') || this.hasTrait(id, 'pacifist')) st.grudge = false;
    st.floor = U.chance(0.5) ? this.floor : this.floor + 1; st.inDungeon = true;
    this.event('releases'); this.addViewers(150, 'released ' + CRAWLERS[id].name); this.unlock('mercy');
    for (const m of this.party.members) if (m.crawlerId && (this.hasTrait(m.crawlerId, 'pacifist') || this.hasTrait(m.crawlerId, 'honorable'))) this.adjustLoyalty(m, 8);
  },
  // ---- crawler population: who is on this floor, who is lounging --------------------
  crawlerClub(id) {
    const st = this.crawlers[id]; const t = CRAWLERS[id].traits || [];
    if (st.kills >= 3 && (t.includes('bloodthirsty') || st.kills > 3 || !t.includes('pacifist'))) return st.kills >= 3 ? 'hells' : 'mercy';
    return 'mercy';
  },
  populateFloor(n) {
    const cap = this.CRAWLER_CAP + (getFloorData(n).modifiers.includes('crawlerfest') ? 2 : 0);
    const here = Object.keys(this.crawlers).filter(id => this.crawlers[id].status === 'active' && this.crawlers[id].floor === n);
    // grudge-holders and bloodthirsty crawlers push into the dungeon first
    here.sort((a, b) => (this.crawlers[b].grudge ? 10 : 0) + (this.hasTrait(b, 'bloodthirsty') ? 3 : 0) - (this.hasTrait(b, 'social') ? 2 : 0) - ((this.crawlers[a].grudge ? 10 : 0) + (this.hasTrait(a, 'bloodthirsty') ? 3 : 0) - (this.hasTrait(a, 'social') ? 2 : 0)));
    here.forEach((id, i) => {
      const st = this.crawlers[id];
      if (i < cap) { st.inDungeon = true; st.lounge = null; }
      else if (n >= 4) { st.inDungeon = false; st.lounge = this.crawlerClub(id); }
      else { st.inDungeon = false; st.lounge = null; st.floor = n + 1; }
    });
  },
  // called when descending: the competition moves too
  advanceCrawlers(newFloor) {
    for (const id in this.crawlers) {
      const st = this.crawlers[id];
      if (st.status !== 'active') continue;
      const t = CRAWLERS[id].traits || [];
      if (t.includes('bloodthirsty')) { st.aggression = U.clamp(st.aggression + 4, 0, 100); if (U.chance(0.15)) st.kills++; }
      if (t.includes('pacifist')) st.aggression = U.clamp(st.aggression - 4, 0, 100);
      if (st.floor < newFloor && U.chance(0.6)) { st.floor = newFloor; st.level += U.rand(1, 2); st.score += 100; }
      st.score += U.rand(10, 40);
    }
    this.populateFloor(newFloor);
  },
  canEnterClub(kind) {
    const pks = this.stats.finishes || 0;
    if (this.bans[kind]) return { ok: false, why: 'banned' };
    if (kind === 'hells' && pks < 3) return { ok: false, why: 'Hell\'s Kitchen is for crawlers with at least three eliminations. You have ' + pks + '.' };
    if (kind === 'mercy' && pks > 3) return { ok: false, why: 'The Mercy Lounge does not admit crawlers with more than three eliminations. You have ' + pks + '.' };
    return { ok: true };
  },
  tickScores() {
    for (const id in this.crawlers) { const st = this.crawlers[id]; if (st.status === 'active') st.score += U.rand(0, 2); }
    this.sponsorTick();
    const r = this.rank(); if (r < this.prevRank) { this.event('rankUps', this.prevRank - r); } this.prevRank = r;
  },
  scoreboard() {
    const rows = [{ name: this.playerName, score: this.score, status: 'YOU', you: true }];
    for (const id in this.crawlers) {
      const st = this.crawlers[id];
      rows.push({ name: CRAWLERS[id].name, score: st.score, status: st.status === 'party' ? 'PARTY' : st.status === 'eliminated' ? 'OUT' : st.lounge ? (st.lounge === 'hells' ? 'HK' : 'ML') : 'F' + st.floor });
    }
    rows.sort((a, b) => b.score - a.score);
    return rows;
  },
  // ---- sponsors ---------------------------------------------------------------------
  sponsorOffer() {
    if (this.sponsors.length >= 3) return null;
    const rate = this.perk('sponsorRate') || 1;
    if (!U.chance(Math.min(1, 0.55 * rate))) return null;
    const current = this.sponsors.map(s => s.id);
    const cands = Object.keys(SPONSORS).filter(id => !current.includes(id) && (this.declined[id] || 0) < this.floor - 1
      && !SPONSORS[id].conflicts.some(c => current.includes(c)) && !current.some(c => SPONSORS[c].conflicts.includes(id)));
    if (!cands.length) return null;
    const scored = cands.map(id => { const d = SPONSORS[id]; let s = 1; for (const k in d.likes) s += d.likes[k] * (this.stats[k] || 0); for (const k in d.dislikes) s -= d.dislikes[k] * (this.stats[k] || 0) * 0.5; return { id, w: Math.max(0.2, s) }; });
    return U.weighted(scored).id;
  },
  acceptSponsor(id) {
    const d = SPONSORS[id]; const dropped = [];
    for (const s of this.sponsors.slice()) if (d.conflicts.includes(s.id) || SPONSORS[s.id].conflicts.includes(id)) { dropped.push(SPONSORS[s.id].name); this.dropSponsor(s.id, 'Conflict of interest with ' + d.name + '. ' + SPONSORS[s.id].lines.drop); }
    this.sponsors.push({ id, sat: 55, revenue: 0, since: this.floor, exclusiveGiven: false });
    this.unlock('sponsor'); if (this.sponsors.length >= 3) this.unlock('threesponsors');
    this.addViewers(400, 'signed ' + d.name);
    return dropped;
  },
  declineSponsor(id) { this.declined[id] = this.floor; },
  dropSponsor(id, text) {
    const i = this.sponsors.findIndex(s => s.id === id); if (i < 0) return;
    this.sponsors.splice(i, 1);
    Toast.show(SPONSORS[id].name + ' dropped you', text || SPONSORS[id].lines.drop, '#ff8080');
  },
  // once per second while exploring: revenue, boxes, exclusives
  sponsorTick() {
    if (!this.sponsors.length) return;
    const rank = this.rank(); const rate = this.perk('sponsorRate') || 1;
    for (const s of this.sponsors) {
      const d = SPONSORS[s.id];
      const rev = Math.max(1, 14 - rank) * (d.cash ? 3 : 1) + Math.floor(this.viewers / 400);
      s.revenue += rev;
      if (d.cash) { if (U.chance(0.03)) { const amt = Math.round(s.revenue * 0.1); s.revenue -= amt; this.party.money += amt; this.deliveries.push({ id: s.id, money: amt }); } continue; }
      if (d.generosity === 0) continue;
      const p = d.generosity * 0.006 * rate + Math.min(0.02, s.revenue / 30000);
      const fs = this.floorState(); const bossAhead = !fs.bossDefeated;
      if (s.sat >= 80 && bossAhead && !s.exclusiveGiven && U.chance(0.05 * rate)) {
        s.exclusiveGiven = true; const item = U.choice(d.exclusives);
        this.deliveries.push({ id: s.id, item, exclusive: true }); continue;
      }
      if (U.chance(p)) {
        const tier = s.sat >= 75 ? (U.chance(0.4) ? 3 : 2) : s.sat >= 40 ? (U.chance(0.5) ? 2 : 1) : 1;
        this.deliveries.push({ id: s.id, item: ['box_bronze', 'box_silver', 'box_gold'][tier - 1] });
      }
    }
  },
  // ---- enemy factories -----------------------------------------------------------
  makeEnemy(key, floorN) {
    const d = ENEMIES[key];
    let mult = 1, lvl = d.level;
    const big = d.boss || d.subboss;
    if (floorN > 3) { mult = 1 + (floorN - 3) * (big ? 0.25 : 0.18); lvl = d.level + (floorN - 3) * 2; }
    const sc = v => Math.round(v * mult);
    const e = { key, name: d.name, sprite: d.sprite, pal: d.pal || null, level: lvl, maxhp: sc(d.hp), hp: sc(d.hp), str: sc(d.str), def: sc(d.def), spd: sc(d.spd), luck: d.luck,
      exp: sc(d.exp), money: sc(d.money), drops: d.drops || [], actions: d.actions, status: {}, buffs: {}, boss: !!d.boss, subboss: !!d.subboss, article: d.article, intro: d.intro,
      phases: (d.phases || []).map(p => Object.assign({ done: false }, p)), scale: d.boss ? 4 : 3, get alive() { return this.hp > 0; } };
    if (getFloorData(floorN).modifiers.includes('bounty')) e.money *= 2;
    return e;
  },
  makeCrawlerEnemy(id) {
    const c = CRAWLERS[id], st = this.crawlers[id];
    const a = this.makeCrawlerActor(id);
    const actions = [{ type: 'attack', verb: 'attacks', w: 5 }];
    for (const s of a.skills) actions.push({ type: 'skill', id: s, w: 2 });
    return { key: 'crawler', name: c.name, sprite: a.sprite === 'raccoon' ? 'raccoon_down' : 'human_down', pal: c.pal, level: a.level, maxhp: a.maxhp, hp: a.maxhp,
      str: a.str, def: a.def, spd: a.spd, luck: a.luck, exp: 30 + a.level * 18, money: 40 + a.level * 25, drops: [{ id: 'box_silver', p: 0.5 }],
      actions, status: {}, buffs: {}, boss: false, article: '', isCrawler: true, crawlerId: id, scale: 3, phases: [], coward: this.hasTrait(id, 'coward'), get alive() { return this.hp > 0; } };
  },
  // ---- summaries --------------------------------------------------------------------
  floorSummary() {
    const f = this.floorStats;
    const line = (k, label) => (f[k] ? label + ' ' + f[k] : null);
    const parts = [line('monsterKills', 'Monsters'), line('crits', 'Crits'), line('chests', 'Chests'), line('recruits', 'Recruits'), line('finishes', 'Finishes'), line('knockouts', 'KOs'), line('releases', 'Released'), line('parleys', 'Parleys'), line('mortalSurvives', 'Close calls')].filter(Boolean);
    return parts.length ? parts.join(', ') + '.' : 'Nothing of note. The audience checked their phones.';
  },
  resetFloorStats() { this.floorStats = {}; },
  // ---- save / load ---------------------------------------------------------------
  toJSON() {
    return { v: 2, playerName: this.playerName, floor: this.floor, floorStates: this.floorStates, crawlers: this.crawlers, notoriety: this.notoriety,
      achievements: this.achievements, kills: this.kills, playtime: this.playtime, flags: this.flags, pkThisFloor: this.pkThisFloor, score: this.score, deepest: this.deepest,
      manager: this.manager, stash: this.stash, sponsors: this.sponsors, declined: this.declined, stats: this.stats, floorStats: this.floorStats, viewers: this.viewers, bans: this.bans,
      pendingSkillChoices: this.pendingSkillChoices, sponsorLuck: this.sponsorLuck, prevRank: this.prevRank, party: this.party.toJSON() };
  },
  fromJSON(j) {
    this.playerName = j.playerName; this.floor = j.floor; this.floorStates = j.floorStates; this.crawlers = j.crawlers; this.notoriety = j.notoriety;
    this.achievements = j.achievements; this.kills = j.kills; this.playtime = j.playtime; this.flags = j.flags; this.pkThisFloor = j.pkThisFloor; this.score = j.score; this.deepest = j.deepest || j.floor;
    this.manager = j.manager || null; this.stash = j.stash || []; this.sponsors = j.sponsors || []; this.declined = j.declined || {}; this.stats = j.stats || {}; this.floorStats = j.floorStats || {};
    this.viewers = j.viewers || 0; this.bans = j.bans || {}; this.pendingSkillChoices = j.pendingSkillChoices || []; this.sponsorLuck = j.sponsorLuck || 0; this.prevRank = j.prevRank || 99; this.deliveries = []; this.log = [];
    this.party = Party.fromJSON(j.party);
    for (const id in this.crawlers) { const st = this.crawlers[id]; if (st.kills == null) st.kills = 0; if (st.inDungeon == null) st.inDungeon = true; }
  },
  storage() { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } },
  save() { const s = this.storage(); if (!s) return false; try { s.setItem(this.SAVE_KEY, JSON.stringify(this.toJSON())); return true; } catch (e) { return false; } },
  hasSave() { const s = this.storage(); if (!s) return false; try { return !!s.getItem(this.SAVE_KEY); } catch (e) { return false; } },
  load() { const s = this.storage(); if (!s) return false; try { const j = JSON.parse(s.getItem(this.SAVE_KEY)); if (!j) return false; this.fromJSON(j); return true; } catch (e) { return false; } },
};
