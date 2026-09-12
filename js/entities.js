// ---- Actors (party members) and the Party -----------------------------------------
class Actor {
  constructor(o) {
    o = o || {};
    this.name = o.name || 'Crawler'; this.cls = o.cls || 'crawler';
    this.isPlayer = !!o.isPlayer; this.crawlerId = o.crawlerId || null; this.pal = o.pal || null;
    this.level = 1; this.exp = 0;
    const c = CLASSES[this.cls];
    this.base = Object.assign({}, c.base);
    this.equip = { weapon: null, armor: null, acc: null };
    this.skills = []; this.status = {}; this.buffs = {}; this.guarding = false;
    this.learnSkills();
    const lv = o.level || 1;
    while (this.level < lv) this.levelUp(true);
    this.hp = this.maxhp; this.mp = this.maxmp; this.hpDisplay = this.hp;
  }
  equipBonus(stat) {
    let v = 0;
    for (const slot of ['weapon', 'armor', 'acc']) { const it = this.equip[slot] && ITEMS[this.equip[slot]]; if (it && it.stat && it.stat[stat]) v += it.stat[stat]; }
    return v;
  }
  immune(status) {
    for (const slot of ['weapon', 'armor', 'acc']) { const it = this.equip[slot] && ITEMS[this.equip[slot]]; if (it && it.immune && it.immune.includes(status)) return true; }
    return false;
  }
  hasPassive(p) {
    for (const slot of ['weapon', 'armor', 'acc']) { const it = this.equip[slot] && ITEMS[this.equip[slot]]; if (it && it.passive === p) return true; }
    return false;
  }
  get maxhp() { return this.base.hp; }
  get maxmp() { return this.base.mp; }
  get str() { let v = this.base.str + this.equipBonus('str'); if (this.buffs.rally) v = Math.round(v * 1.3); if (this.buffs.weak) v = Math.round(v * 0.7); return Math.max(1, v); }
  get def() { return Math.max(0, this.base.def + this.equipBonus('def')); }
  get spd() { return Math.max(1, this.base.spd + this.equipBonus('spd')); }
  get luck() { return Math.max(0, this.base.luck + this.equipBonus('luck')); }
  get ko() { return this.hpDisplay <= 0; }
  get alive() { return !this.ko; }
  get sprite() { return CLASSES[this.cls].sprite; }
  learnSkills() {
    const out = [];
    for (const [lv, id] of CLASSES[this.cls].skills) if (lv <= this.level && !this.skills.includes(id)) { this.skills.push(id); out.push(id); }
    return out;
  }
  levelUp(silent) {
    this.level++;
    const g = CLASSES[this.cls].growth; const gains = {};
    for (const k of ['hp', 'mp', 'str', 'def', 'spd', 'luck']) {
      const base = g[k]; let inc = Math.floor(base) + (Math.random() < (base - Math.floor(base)) ? 1 : 0);
      if (Math.random() < 0.25) inc += 1; // lucky bonus
      if (k === 'hp' || k === 'mp') inc = Math.max(1, inc);
      gains[k] = inc; this.base[k] += inc;
    }
    this.hp += gains.hp; this.mp += gains.mp; if (!silent) this.hpDisplay = this.hp;
    const newSkills = this.learnSkills();
    return { level: this.level, gains, newSkills };
  }
  // returns list of level-up results
  addExp(n) {
    this.exp += n; const ups = [];
    while (this.exp >= expForLevel(this.level + 1)) ups.push(this.levelUp());
    return ups;
  }
  expToNext() { return Math.max(0, expForLevel(this.level + 1) - this.exp); }
  // damage/heal operate on the target HP; hpDisplay rolls toward it during battle
  damage(n) { this.hp -= n; }
  heal(n) { this.hp = Math.min(this.maxhp, Math.max(this.hp, 0) + n); }
  healMp(n) { this.mp = Math.min(this.maxmp, this.mp + n); }
  revive(frac) { this.hp = Math.max(1, Math.floor(this.maxhp * frac)); this.hpDisplay = this.hp; this.status = {}; }
  fullHeal() { this.hp = this.maxhp; this.mp = this.maxmp; this.hpDisplay = this.hp; this.status = {}; }
  syncDisplay() { this.hp = Math.max(0, Math.ceil(this.hpDisplay)); this.hpDisplay = this.hp; }
  // per-frame odometer roll (battle only). returns true when the roll reached zero this frame
  roll() {
    const target = Math.max(0, this.hp);
    if (this.hpDisplay === target) return false;
    const diff = target - this.hpDisplay;
    const speed = Math.max(0.35, Math.abs(diff) / 90);
    if (Math.abs(diff) <= speed) this.hpDisplay = target; else this.hpDisplay += U.sign(diff) * speed;
    if (this.hpDisplay <= 0) { this.hpDisplay = 0; this.hp = 0; return true; }
    return false;
  }
  addStatus(s, turns) { if (this.immune(s)) return false; this.status[s] = turns || 3; return true; }
  cure(s) { if (s) delete this.status[s]; else this.status = {}; }
  hasStatus(s) { return !!this.status[s]; }
  clearBattleState() { this.buffs = {}; this.guarding = false; this.hpDisplay = Math.max(0, this.hp); }
  toJSON() {
    return { name: this.name, cls: this.cls, isPlayer: this.isPlayer, crawlerId: this.crawlerId, pal: this.pal, level: this.level, exp: this.exp,
      base: this.base, equip: this.equip, skills: this.skills, hp: this.hp, mp: this.mp, status: this.status, loyalty: this.loyalty };
  }
  static fromJSON(j) {
    const a = new Actor({ name: j.name, cls: j.cls, isPlayer: j.isPlayer, crawlerId: j.crawlerId, pal: j.pal });
    a.level = j.level; a.exp = j.exp; a.base = j.base; a.equip = j.equip; a.skills = j.skills; a.hp = j.hp; a.mp = j.mp; a.status = j.status || {}; a.loyalty = j.loyalty == null ? 50 : j.loyalty;
    a.hpDisplay = Math.max(0, a.hp); return a;
  }
}

class Party {
  constructor() { this.members = []; this.inventory = []; this.money = 0; }
  static get MAX() { return 4; }
  static get MAX_ITEMS() { return 20; }
  get leader() { return this.members[0]; }
  get alive() { return this.members.filter(m => m.alive); }
  get full() { return this.members.length >= Party.MAX; }
  add(actor) { if (this.full) return false; this.members.push(actor); return true; }
  remove(actor) { const i = this.members.indexOf(actor); if (i > 0) this.members.splice(i, 1); }
  count(id) { const e = this.inventory.find(x => x.id === id); return e ? e.qty : 0; }
  hasItem(id) { return this.count(id) > 0; }
  addItem(id, qty) {
    qty = qty || 1;
    const e = this.inventory.find(x => x.id === id);
    if (e) { e.qty += qty; return true; }
    if (this.inventory.length >= Party.MAX_ITEMS) return false;
    this.inventory.push({ id, qty }); return true;
  }
  removeItem(id, qty) {
    qty = qty || 1;
    const i = this.inventory.findIndex(x => x.id === id); if (i < 0) return false;
    this.inventory[i].qty -= qty; if (this.inventory[i].qty <= 0) this.inventory.splice(i, 1); return true;
  }
  get freeSlots() { return Party.MAX_ITEMS - this.inventory.length; }
  fullHeal() { for (const m of this.members) m.fullHeal(); }
  toJSON() { return { members: this.members.map(m => m.toJSON()), inventory: this.inventory, money: this.money }; }
  static fromJSON(j) { const p = new Party(); p.members = j.members.map(Actor.fromJSON); p.inventory = j.inventory; p.money = j.money; return p; }
}
