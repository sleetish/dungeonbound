// ---- Battle: EarthBound-style turn-based combat with rolling HP meters ----------------------
// Options: enemies, initiative ('party'|'enemy'|null), boss, subboss, timed (rounds until the
// lounge guards arrive), clubKind, aggressorIsPlayer, onEnd(result).
// Results: win | run | lose | parley | recruit | knockout | guards
class BattleScene {
  constructor(o) {
    this.enemies = o.enemies; this.initiative = o.initiative || null; this.onEnd = o.onEnd || null; this.isBoss = !!o.boss; this.isSub = !!o.subboss;
    this.timed = o.timed || 0; this.clubKind = o.clubKind || null; this.aggressorIsPlayer = !!o.aggressorIsPlayer;
    this.tb = new TextBox(8, 4, UI.W - 16, 44, { rows: 3 });
    this.round = 0; this.auto = false; this.runAttempts = 0; this.t = 0; this.shake = 0; this.ended = false; this.zoom = 0;
    this.menu = null; this.menuResult = undefined; this.targetMode = null; this.activeMember = null;
    this.koQueue = []; this.hue = Math.random() * 360; this.downedCrawlers = []; this.partyRects = []; this.effects = []; this.lunge = {};
    this.toxic = getFloorData(G.floor).modifiers.includes('toxic');
    this.layoutEnemies();
    this.co = Co.run(this.main());
  }
  get party() { return G.party.members; }
  get aliveParty() { return this.party.filter(m => m.alive); }
  get aliveEnemies() { return this.enemies.filter(e => e.alive); }
  layoutEnemies() {
    const n = this.enemies.length;
    this.enemies.forEach((e, i) => {
      const s = e.scale || 3; const cx = UI.W / 2 + (i - (n - 1) / 2) * 68;
      e.px = Math.round(cx - 8 * s); e.py = Math.round(118 - 8 * s); if (e.flash == null) { e.flash = 0; e.fade = 1; e.jolt = 0; }
    });
  }
  targetRect(t) {
    if (t instanceof Actor) return this.partyRects[this.party.indexOf(t)] || null;
    const s = t.scale || 3; return { x: t.px - 4, y: t.py - 4, w: 16 * s + 8, h: 16 * s + 8 };
  }
  enter() { Sound.play(this.isBoss ? 'boss' : 'battle'); Sound.setIntensity(this.isBoss ? 1 : 0); for (const m of this.party) m.clearBattleState(); }
  exit() { for (const m of this.party) { m.buffs = {}; m.guarding = false; } Sound.setIntensity(0); }
  // ---- coroutine helpers ----
  *msg(text, opts) { this.tb.say(text, Object.assign({ holdSkip: true }, opts || {})); yield () => this.tb.done; yield* this.flushKO(); }
  *msgWait(text) { this.tb.say(text, { auto: false }); yield () => this.tb.done; yield* this.flushKO(); }
  *flushKO() {
    while (this.koQueue.length) {
      const m = this.koQueue.shift(); Sound.sfx('ko'); G.event('deathsInParty'); if (m.cls === 'raccoon') G.event('tibbsKO'); if (m.crawlerId) G.adjustLoyalty(m, -6);
      this.tb.say(m.name + ' collapsed!', { holdSkip: true }); yield () => this.tb.done;
    }
  }
  *pick(menu) { this.menu = menu; this.menuResult = undefined; yield () => this.menuResult !== undefined; const r = this.menuResult; this.menu = null; return r; }
  *selectTarget(list, kind) {
    if (!list.length) return null;
    this.targetMode = { list, idx: 0, kind, result: undefined };
    yield () => this.targetMode.result !== undefined;
    const r = this.targetMode.result; this.targetMode = null; return r;
  }
  fx(type, x, y, color) { this.effects.push({ type, x, y, color: color || '#fff', t: 0, life: type === 'slash' ? 14 : 26, seed: Math.random() * 100 }); }
  enemyCenter(e) { const s = e.scale || 3; return { x: e.px + 8 * s, y: e.py + 8 * s }; }
  memberCenter(m) { const r = this.partyRects[this.party.indexOf(m)]; return r ? { x: r.x + r.w / 2, y: 160 } : { x: UI.W / 2, y: 160 }; }
  // ---- main flow ----
  *main() {
    yield 10;
    const names = this.enemies.map(e => e.name);
    if (this.enemies.length === 1) yield* this.msg((this.enemies[0].isCrawler ? this.enemies[0].name + ' the ' + CLASSES[CRAWLERS[this.enemies[0].crawlerId].cls].name + ' challenges you!' : (this.enemies[0].article ? 'The ' : '') + names[0] + ' attacks!'));
    else yield* this.msg('The ' + names[0] + ' and ' + (this.enemies.length - 1) + (this.enemies.length > 2 ? ' cohorts' : ' cohort') + ' attack!');
    if (this.timed) yield* this.msg('The guards are on their way. ' + this.timed + ' rounds until they break this up!');
    if (this.initiative === 'party') yield* this.msg('You got the first strike!');
    if (this.initiative === 'enemy') yield* this.msg('You were attacked from behind!');
    while (true) {
      this.round++;
      if (this.timed && this.round > this.timed) { yield* this.guards(); return; }
      let actions = [];
      const enemyFirst = this.round === 1 && this.initiative === 'enemy';
      const partyFirst = this.round === 1 && this.initiative === 'party';
      if (!enemyFirst) {
        const chosen = yield* this.chooseCommands();
        if (chosen === 'run') { if (yield* this.tryRun()) return; actions = []; }
        else actions = chosen;
      }
      if (!partyFirst) for (const e of this.aliveEnemies) actions.push(this.enemyAction(e));
      actions.sort((a, b) => (b.actor.spd + (b.type === 'guard' ? 999 : 0) + Math.random() * 3) - (a.actor.spd + (a.type === 'guard' ? 999 : 0) + Math.random() * 3));
      for (let act of actions) {
        if (this.isOver()) break;
        const a = act.actor; if (!a.alive) continue;
        if (a.status.stun) { yield* this.msg(a.name + ' is stunned and can\'t move!'); if (U.chance(0.5)) delete a.status.stun; continue; }
        if (a.status.glitch && U.chance(0.5)) { yield* this.msg(a.name + ' is glitching out!'); act = this.glitchAction(act); if (U.chance(0.3)) delete a.status.glitch; }
        yield* this.execute(act);
      }
      if (!this.isOver()) yield* this.endOfRound();
      if (this.isOver() && this.ended) return;
      if (this.aliveEnemies.length === 0) { yield* this.victory(); return; }
      if (this.aliveParty.length === 0) { yield* this.defeat(); return; }
    }
  }
  isOver() { return this.ended || this.aliveEnemies.length === 0 || this.aliveParty.length === 0; }
  glitchAction(act) { return { type: 'bash', actor: act.actor, target: U.choice([].concat(this.aliveParty, this.aliveEnemies)) }; }
  // ---- command selection ----
  *chooseCommands() {
    const acts = []; const alive = this.aliveParty;
    for (const m of this.party) m.guarding = false;
    let i = 0;
    while (i < alive.length) {
      const m = alive[i];
      if (m.status.stun) { i++; continue; }
      if (this.auto) { acts.push({ type: 'bash', actor: m, target: null }); i++; continue; }
      const r = yield* this.commandFor(m);
      if (r === 'back') { if (i > 0) { i--; acts.pop(); while (i > 0 && alive[i].status.stun) { i--; acts.pop(); } } continue; }
      if (r === 'run') return 'run';
      if (r === 'auto') { this.auto = true; continue; }
      acts.push(r); i++;
    }
    this.activeMember = null;
    return acts;
  }
  *commandFor(m) {
    this.activeMember = m;
    while (true) {
      const items = [{ label: 'Bash', value: 'bash' }, { label: 'Skills', value: 'skills' }, { label: 'Goods', value: 'goods' }, { label: 'Guard', value: 'guard' }];
      if (this.enemies.some(e => e.isCrawler && e.alive)) items.push({ label: 'Parley', value: 'parley' });
      items.push({ label: 'Auto', value: 'auto' }, { label: 'Run', value: 'run', disabled: this.isBoss || this.isSub });
      const menu = new Menu(items, { x: 8, y: 52, w: 84, title: m.name, cancelable: true });
      const r = yield* this.pick(menu);
      if (r === null) return 'back';
      const v = r.value;
      if (v === 'bash') { const t = yield* this.selectTarget(this.aliveEnemies, 'enemy'); if (t) return { type: 'bash', actor: m, target: t }; continue; }
      if (v === 'guard') { m.guarding = true; return { type: 'guard', actor: m }; }
      if (v === 'auto') return 'auto';
      if (v === 'run') return 'run';
      if (v === 'skills') {
        const sk = m.skills.map(s => ({ label: SKILLS[s].name, value: s, right: SKILLS[s].mp, disabled: m.mp < SKILLS[s].mp }));
        const r2 = yield* this.pick(new Menu(sk, { x: 96, y: 52, w: UI.W - 104, rows: 6, title: 'SKILLS  MP ' + m.mp }));
        if (!r2) continue;
        const t = yield* this.targetFor(SKILLS[r2.value].target);
        if (t === null) continue;
        return { type: 'skill', actor: m, skill: r2.value, target: t };
      }
      if (v === 'goods') {
        const inv = G.party.inventory.filter(e => ITEMS[e.id].type === 'heal' || ITEMS[e.id].type === 'attack').map(e => ({ label: ITEMS[e.id].name, value: e.id, right: 'x' + e.qty }));
        const r2 = yield* this.pick(new Menu(inv, { x: 96, y: 52, w: UI.W - 104, rows: 6, title: 'GOODS' }));
        if (!r2 || !r2.value) continue;
        const it = ITEMS[r2.value];
        const t = yield* this.targetFor(it.type === 'heal' ? (it.all ? 'allies' : 'ally') : (it.target || 'enemy'));
        if (t === null) continue;
        return { type: 'item', actor: m, item: r2.value, target: t };
      }
      if (v === 'parley') {
        const r2 = yield* this.pick(new Menu([{ label: 'Talk', value: 'talk' }, { label: 'Offer item', value: 'gift' }], { x: 96, y: 52, w: 110, title: 'PARLEY' }));
        if (!r2) continue;
        const crawlers = this.aliveEnemies.filter(e => e.isCrawler);
        if (r2.value === 'talk') { const t = yield* this.selectTarget(crawlers, 'enemy'); if (t) return { type: 'parley', actor: m, target: t }; continue; }
        const inv = G.party.inventory.map(e => ({ label: ITEMS[e.id].name, value: e.id, right: 'x' + e.qty }));
        const r3 = yield* this.pick(new Menu(inv, { x: 96, y: 52, w: UI.W - 104, rows: 6, title: 'OFFER WHAT?' }));
        if (!r3 || !r3.value) continue;
        const t = yield* this.selectTarget(crawlers, 'enemy'); if (!t) continue;
        return { type: 'gift', actor: m, item: r3.value, target: t };
      }
    }
  }
  *targetFor(kind) {
    if (kind === 'enemy') return yield* this.selectTarget(this.aliveEnemies, 'enemy');
    if (kind === 'ally') return yield* this.selectTarget(this.party, 'ally');
    if (kind === 'enemies') return 'enemies';
    if (kind === 'allies') return 'allies';
    return 'self';
  }
  enemyAction(e) {
    if (e.pendingPhase) { const p = e.pendingPhase; e.pendingPhase = null; return { type: 'phase', actor: e, phase: p }; }
    if (e.coward && e.hp < e.maxhp * 0.3 && U.chance(0.4)) return { type: 'flee', actor: e };
    const a = U.weighted(e.actions);
    if (a.type === 'attack') return { type: 'eattack', actor: e, verb: a.verb, all: a.all, mult: (a.mult || 1) * (e.buffs.rage ? 1.5 : 1), status: a.status, chance: a.chance };
    if (a.type === 'skill') return { type: 'skill', actor: e, skill: a.id, target: null };
    return { type: 'idle', actor: e, text: a.text };
  }
  // ---- damage math ----
  physical(att, def, mult, critBonus) {
    mult = mult || 1;
    const missP = U.clamp(0.04 + Math.max(0, def.spd - att.spd) * 0.01, 0, 0.25);
    if (U.chance(missP)) return { miss: true };
    let critP = 0.05 + att.luck * 0.01 + (critBonus || 0);
    if (att instanceof Actor && att.hasPassive('critplus')) critP += 0.15;
    if (U.chance(U.clamp(critP, 0, 1))) return { dmg: Math.max(1, Math.round(att.str * 4 * mult * U.randf(0.9, 1.1))), crit: true };
    let d = att.str * 2 * mult - def.def; d = Math.round(Math.max(att.str * mult * 0.25, d) * U.randf(0.8, 1.2));
    return { dmg: Math.max(1, d) };
  }
  reduce(target, dmg) {
    if (target.guarding) dmg = Math.ceil(dmg / 2);
    if (target.buffs && target.buffs.ward) dmg = Math.ceil(dmg / 2);
    return dmg;
  }
  *hurtEnemy(e, dmg, attacker) {
    e.hp -= dmg; e.flash = 8; e.jolt = 6; Sound.sfx('hit');
    yield* this.msg(dmg + ' HP of damage to ' + (e.article ? 'the ' : '') + e.name + '!');
    if (attacker instanceof Actor && attacker.hasPassive('lifesteal') && e.hp > -9999) { const h = Math.max(1, Math.round(dmg / 3)); attacker.heal(h); yield* this.msg(attacker.name + ' drains ' + h + ' HP!'); }
    if (!e.alive) yield* this.enemyDown(e, attacker);
    else yield* this.checkPhase(e);
  }
  *checkPhase(e) {
    for (const p of e.phases || []) {
      if (p.done || e.hp > e.maxhp * p.at) continue;
      p.done = true; this.zoom = 20; Sound.sfx('encounter'); Sound.setIntensity(2);
      yield* this.msgWait(p.tell);
      e.pendingPhase = p;
      return;
    }
  }
  *enemyDown(e, attacker) {
    e.hp = 0; e.fade = 0.99;
    if (e.isCrawler) { this.downedCrawlers.push(e); yield* this.msg(e.name + ' goes down!'); return; }
    if (attacker instanceof Actor && attacker.cls === 'raccoon') G.event('tibbsKills');
    G.event('monsterKills');
    yield* this.msg((e.article ? 'The ' : '') + e.name + ' was ' + (e.boss ? 'defeated!!' : U.choice(['defeated!', 'wiped out!', 'dealt with.', 'returned to the void.'])));
  }
  *hurtMember(m, dmg) {
    dmg = this.reduce(m, dmg);
    m.damage(dmg); this.shake = 10; Sound.sfx('hit');
    if (m.hp <= 0) yield* this.msg(m.name + ' took mortal damage!');
    else yield* this.msg(m.name + ' took ' + dmg + ' damage!');
    if (this.aliveParty.some(x => x.hp > 0 && x.hp < x.maxhp * 0.3)) Sound.setIntensity(Math.max(1, Sound.intensity));
  }
  // ---- execution ----
  *execute(act) {
    const a = act.actor; const isParty = a instanceof Actor;
    if (isParty) this.lunge[a.name] = 12;
    switch (act.type) {
      case 'guard': yield* this.msg(a.name + ' is guarding.'); return;
      case 'idle': yield* this.msg(act.text.replace('{n}', (a.article ? 'The ' : '') + a.name)); return;
      case 'flee': { yield* this.msg(a.name + ' turns and runs away!'); a.hp = 0; a.fade = 0.99; a.fled = true; const st = G.crawlers[a.crawlerId]; st.floor = G.floor + 1; if (this.aliveEnemies.length === 0) { this.ended = true; yield* this.msg('The fight is over.'); this.finish('parley'); } return; }
      case 'phase': yield* this.doPhase(a, act.phase); return;
      case 'bash': {
        let t = act.target;
        if (!t || !t.alive) t = isParty ? this.aliveEnemies[0] : U.choice(this.aliveParty);
        if (!t) return;
        yield* this.msg(a.name + ' attacks!');
        const r = this.physical(a, t);
        const c = t instanceof Actor ? this.memberCenter(t) : this.enemyCenter(t); this.fx('slash', c.x, c.y, '#fff');
        if (r.miss) { Sound.sfx('miss'); yield* this.msg('Just missed!'); return; }
        if (r.crit) { Sound.sfx('smash'); this.smashT = 30; this.zoom = 16; yield* this.msg('SMAAAASH!!'); if (isParty) { G.unlock('smash'); G.event('crits'); G.addViewers(120, 'critical hit'); } }
        if (t instanceof Actor) yield* this.hurtMember(t, r.dmg); else yield* this.hurtEnemy(t, this.reduce(t, r.dmg), a);
        return;
      }
      case 'eattack': {
        const targets = act.all ? this.aliveParty.slice() : [U.choice(this.aliveParty)];
        if (!targets.length || !targets[0]) return;
        yield* this.msg((a.article ? 'The ' : '') + a.name + ' ' + act.verb + (act.all ? ' everyone!' : ' ' + targets[0].name + '!'));
        for (const t of targets) {
          const r = this.physical(a, t, act.mult);
          const c = this.memberCenter(t); this.fx('slash', c.x, c.y, '#ff8080');
          if (r.miss) { Sound.sfx('miss'); yield* this.msg(t.name + ' dodged!'); continue; }
          if (r.crit) { Sound.sfx('smash'); yield* this.msg('SMAAAASH!!'); }
          yield* this.hurtMember(t, r.dmg);
          const chance = (act.chance || 0.3) * (this.toxic ? 2 : 1);
          if (act.status && U.chance(chance) && t.alive && !t.hasStatus(act.status) && t.addStatus(act.status)) yield* this.msg(t.name + ' was ' + STATUS_INFO[act.status].name.toLowerCase() + 'ed!');
        }
        return;
      }
      case 'skill': yield* this.doSkill(a, act.skill, act.target, isParty); return;
      case 'item': yield* this.doItem(a, act.item, act.target); return;
      case 'parley': yield* this.doParley(a, act.target); return;
      case 'gift': yield* this.doGift(a, act.item, act.target); return;
    }
  }
  *doPhase(e, p) {
    switch (p.effect) {
      case 'rage': e.buffs.rage = 99; e.str = Math.round(e.str * 1.25); yield* this.msg(e.name + ' is enraged! Attack up!'); return;
      case 'haste': e.spd = Math.round(e.spd * 1.6); e.buffs.rage = 99; yield* this.msg(e.name + ' moves faster!'); return;
      case 'bigslam': case 'hypeslam': {
        if (p.effect === 'hypeslam') { e.buffs.rally = 3; yield* this.msg('The crowd roars! ' + e.name + ' is hyped!'); }
        yield* this.msg(e.name + ' unleashes a devastating blow on everyone!');
        for (const t of this.aliveParty.slice()) { const r = this.physical(e, t, 1.6); const c = this.memberCenter(t); this.fx('burst', c.x, c.y, '#ff6040'); if (r.miss) { yield* this.msg(t.name + ' dodged!'); continue; } yield* this.hurtMember(t, r.dmg); }
        return;
      }
      case 'bigzap': {
        yield* this.msg(e.name + ' discharges a massive zap!');
        for (const t of this.aliveParty.slice()) { const dmg = this.reduce(t, Math.round(e.str * 1.3)); const c = this.memberCenter(t); this.fx('burst', c.x, c.y, '#ffff80'); yield* this.hurtMember(t, dmg); if (t.alive && U.chance(0.6) && t.addStatus('stun')) yield* this.msg(t.name + ' was stunned!'); }
        return;
      }
      case 'swarm': {
        yield* this.msg('Rats pour out of the walls and swarm everyone!');
        for (const t of this.aliveParty.slice()) { const r = this.physical(e, t, 0.9); const c = this.memberCenter(t); this.fx('burst', c.x, c.y, '#c08050'); if (!r.miss) yield* this.hurtMember(t, r.dmg); }
        return;
      }
      case 'summon': {
        const count = p.count || 2;
        for (let i = 0; i < count && this.enemies.length < 4; i++) { const s = G.makeEnemy(p.summon || 'drone', G.floor); s.flash = 0; s.fade = 1; s.jolt = 0; this.enemies.push(s); }
        this.layoutEnemies(); Sound.sfx('magic');
        yield* this.msg((count) + ' ' + ENEMIES[p.summon || 'drone'].name + 's join the fight!');
        return;
      }
    }
  }
  resolveTargets(isParty, kind, target) {
    const allies = isParty ? this.aliveParty : this.aliveEnemies;
    const foes = isParty ? this.aliveEnemies : this.aliveParty;
    if (kind === 'enemies') return foes.slice();
    if (kind === 'allies') return allies.slice();
    if (kind === 'self') return [target && target.alive ? target : null].filter(Boolean);
    if (kind === 'enemy') { if (target && target.alive && target !== 'enemies') return [target]; return foes.length ? [isParty ? foes[0] : U.choice(foes)] : []; }
    if (kind === 'ally') { if (target && target.alive) return [target]; return allies.length ? [U.choice(allies)] : []; }
    return [];
  }
  *doSkill(a, skillId, target, isParty) {
    const sk = SKILLS[skillId];
    if (a.mp < sk.mp) { yield* this.msg(a.name + ' tried ' + sk.name + ' but is out of MP!'); return; }
    a.mp -= sk.mp; if (isParty) G.event('mpSpent', sk.mp);
    let targets = this.resolveTargets(isParty, sk.target === 'self' ? 'self' : sk.target, sk.target === 'self' ? a : target);
    if (sk.target === 'ally' && sk.revive && target instanceof Actor) targets = [target];
    const tName = targets[0] ? ((targets[0].article ? 'the ' : '') + targets[0].name) : '';
    yield* this.msg(sk.text.replace('{a}', a.name).replace('{t}', tName));
    this.flashColor = { color: sk.color, t: 24 }; Sound.sfx(sk.kind === 'heal' ? 'heal' : 'magic');
    for (const t of targets) {
      const tIsMember = t instanceof Actor;
      const c = tIsMember ? this.memberCenter(t) : this.enemyCenter(t); this.fx(sk.kind === 'heal' || sk.kind === 'buff' ? 'sparkle' : 'burst', c.x, c.y, sk.color);
      switch (sk.kind) {
        case 'attack': case 'drain': {
          let dmg;
          if (sk.mult) { const r = this.physical(a, t, sk.mult, sk.crit); if (r.miss) { yield* this.msg('Just missed!'); continue; } if (r.crit) { Sound.sfx('smash'); this.smashT = 30; yield* this.msg('SMAAAASH!!'); if (isParty) G.event('crits'); } dmg = r.dmg; }
          else dmg = Math.max(1, Math.round((sk.power + a.str * 0.5 - t.def * 0.5) * U.randf(0.85, 1.15)));
          dmg = this.reduce(t, dmg);
          if (tIsMember) yield* this.hurtMember(t, dmg); else yield* this.hurtEnemy(t, dmg, a);
          if (sk.kind === 'drain') { const h = Math.ceil(dmg / 2); if (a instanceof Actor) a.heal(h); else a.hp = Math.min(a.maxhp, a.hp + h); yield* this.msg(a.name + ' absorbed ' + h + ' HP!'); }
          if (sk.status && t.alive && U.chance(sk.chance || 0.5)) { const ok = tIsMember ? t.addStatus(sk.status) : (t.status[sk.status] = 3, true); if (ok) yield* this.msg(t.name + ' was ' + STATUS_INFO[sk.status].name.toLowerCase() + 'ed!'); }
          break;
        }
        case 'status': {
          if (U.chance(sk.chance || 0.5)) { const ok = tIsMember ? t.addStatus(sk.status) : (t.status[sk.status] = 3, true); yield* this.msg(ok ? t.name + ' was ' + STATUS_INFO[sk.status].name.toLowerCase() + 'ed!' : t.name + ' is immune!'); }
          else yield* this.msg(t.name + ' shrugged it off.');
          break;
        }
        case 'heal': {
          if (!t.alive && sk.revive && tIsMember) { t.revive(1); yield* this.msg(t.name + ' is back on their feet!'); continue; }
          if (!t.alive) { yield* this.msg('It had no effect.'); continue; }
          if (tIsMember) { const before = Math.max(0, t.hp); t.heal(sk.power); yield* this.msg(t.name + ' recovered ' + (Math.min(t.maxhp, before + sk.power) - before) + ' HP!'); if (sk.cure) t.cure(); if (isParty && t !== a && t.crawlerId) G.adjustLoyalty(t, 3); }
          else { const before = t.hp; t.hp = Math.min(t.maxhp, t.hp + sk.power); yield* this.msg(t.name + ' recovered ' + (t.hp - before) + ' HP!'); }
          break;
        }
        case 'buff': { t.buffs[sk.buff] = sk.turns; yield* this.msg(t.name + (sk.buff === 'ward' ? '\'s defense went up!' : ' is fired up! Offense up!')); break; }
        case 'debuff': { t.buffs[sk.buff] = sk.turns; yield* this.msg(t.name + '\'s offense fell!'); break; }
        case 'steal': {
          if (tIsMember) { const amt = Math.min(G.party.money, U.rand(5, 30)); G.party.money -= amt; yield* this.msg(a.name + ' stole ' + amt + ' gold!'); }
          else if (!t.stolen && U.chance(0.6)) { const amt = Math.max(1, Math.round(t.money * U.randf(0.3, 0.8))); t.stolen = true; G.party.money += amt; Sound.sfx('coin'); yield* this.msg('Got ' + amt + ' gold!'); }
          else yield* this.msg('Found nothing but lint.');
          break;
        }
      }
    }
  }
  *doItem(a, itemId, target) {
    const it = ITEMS[itemId];
    if (!G.party.hasItem(itemId)) { yield* this.msg('The ' + it.name + ' is gone!'); return; }
    if (it.type === 'heal') {
      const targets = it.all ? this.party.filter(m => m.alive) : [target instanceof Actor ? target : a];
      yield* this.msg(a.name + ' uses the ' + it.name + '!');
      let any = false;
      for (const t of targets) { const r = Effects.healItem(t, itemId); if (r.ok) { any = true; const c = this.memberCenter(t); this.fx('sparkle', c.x, c.y, '#80ff80'); if (t !== a && t.crawlerId) G.adjustLoyalty(t, 2); } yield* this.msg(r.text); }
      if (any) { G.party.removeItem(itemId); Sound.sfx('heal'); G.event('itemsUsed'); }
      return;
    }
    G.party.removeItem(itemId); G.event('itemsUsed');
    const targets = this.resolveTargets(true, it.target || 'enemy', target);
    yield* this.msg(a.name + ' throws the ' + it.name + '!');
    this.flashColor = { color: '#ffa040', t: 20 };
    for (const t of targets) {
      const dmg = this.reduce(t, Math.max(1, Math.round(it.dmg * U.randf(0.85, 1.15))));
      const c = this.enemyCenter(t); this.fx('burst', c.x, c.y, '#ffa040');
      yield* this.hurtEnemy(t, dmg, a);
      if (it.status && t.alive && U.chance(it.chance || 0.5)) { t.status[it.status] = 3; yield* this.msg(t.name + ' was ' + STATUS_INFO[it.status].name.toLowerCase() + 'ed!'); }
    }
  }
  *doParley(a, target) {
    const t = target && target.alive ? target : this.aliveEnemies.find(e => e.isCrawler);
    if (!t) return;
    const c = CRAWLERS[t.crawlerId], st = G.crawlers[t.crawlerId];
    yield* this.msg(a.name + ' tries to talk ' + t.name + ' down...');
    const p = U.clamp((100 - st.aggression) / 100 * 0.45 + a.luck * 0.01 + (t.hp < t.maxhp * 0.5 ? 0.3 : 0) + st.gifts * 0.1 + G.charisma() + (G.hasTrait(t.crawlerId, 'social') ? 0.2 : 0), 0.05, 0.95);
    if (U.chance(p)) {
      G.adjustAggression(t.crawlerId, -35); G.unlock('parley'); G.event('parleys'); G.addViewers(200, 'parley');
      yield* this.msgWait(c.name + ': "' + c.lines.parley + '"');
      yield* this.msg(t.name + ' lowers their weapon. The fight is over.');
      this.finish('parley');
    } else { G.adjustAggression(t.crawlerId, 3); yield* this.msg(t.name + ' isn\'t listening!'); }
  }
  *doGift(a, itemId, target) {
    const t = target && target.alive ? target : this.aliveEnemies.find(e => e.isCrawler);
    if (!t || !G.party.hasItem(itemId)) return;
    const c = CRAWLERS[t.crawlerId];
    yield* this.msg(a.name + ' offers ' + t.name + ' a ' + ITEMS[itemId].name + '!');
    const g = G.giveGift(t.crawlerId, itemId); Sound.sfx('item');
    yield* this.msgWait(c.name + ': "' + g.text + '"');
    if (g.wanted) {
      if (!G.party.full) { const actor = G.recruit(t.crawlerId); if (actor) { actor.hp = Math.max(1, t.hp); actor.hpDisplay = actor.hp; Sound.sfx('levelup'); yield* this.msgWait(t.name + ' joined the party!'); this.finish('recruit'); return; } }
      yield* this.msg(t.name + ' stops fighting. (Your party is full.)'); this.finish('parley'); return;
    }
    if (G.disposition(t.crawlerId) !== 'hostile') { yield* this.msg(t.name + ' calms down and backs off.'); this.finish('parley'); }
  }
  *tryRun() {
    if (this.isBoss || this.isSub) { yield* this.msg('You can\'t run from this one!'); return false; }
    this.runAttempts++;
    const ps = this.aliveParty.reduce((s, m) => s + m.spd, 0) / this.aliveParty.length;
    const es = this.aliveEnemies.reduce((s, e) => s + e.spd, 0) / this.aliveEnemies.length;
    const p = U.clamp(0.45 + (ps - es) * 0.03 + this.runAttempts * 0.15, 0.1, 0.95);
    if (U.chance(p)) { Sound.sfx('run'); yield* this.msg('You ran away!'); G.unlock('ran'); G.event('runs'); this.finish('run'); return true; }
    yield* this.msg('You couldn\'t run away!');
    return false;
  }
  *endOfRound() {
    for (const m of this.aliveParty) {
      if (m.status.poison) { const d = Math.max(1, Math.round(m.maxhp * 0.06)); m.damage(d); yield* this.msg(m.name + ' takes ' + d + ' poison damage.'); }
      if (m.hasPassive('regen') && m.hp > 0 && m.hp < m.maxhp) { const h = Math.max(1, Math.round(m.maxhp * 0.06)); m.heal(h); yield* this.msg(m.name + ' regenerates ' + h + ' HP.'); }
      for (const b in m.buffs) if (--m.buffs[b] <= 0) delete m.buffs[b];
      m.guarding = false;
    }
    for (const e of this.aliveEnemies) {
      if (e.status.poison) { const d = Math.max(1, Math.round(e.maxhp * 0.08)); yield* this.hurtEnemy(e, d); if (e.status.poison && --e.status.poison <= 0) delete e.status.poison; }
      if (e.status.stun && --e.status.stun <= 0) delete e.status.stun;
      if (e.status.glitch && --e.status.glitch <= 0) delete e.status.glitch;
      for (const b in e.buffs) if (b !== 'rage' && --e.buffs[b] <= 0) delete e.buffs[b];
    }
    yield () => this.aliveParty.every(m => m.hp > 0 || m.hpDisplay <= 0) || this.aliveEnemies.length === 0;
    yield* this.flushKO();
    if (this.timed && !this.isOver()) yield* this.msg((this.timed - this.round) + ' round' + (this.timed - this.round === 1 ? '' : 's') + ' until the guards arrive.');
  }
  *guards() {
    this.ended = true; Sound.sfx('encounter');
    yield* this.msgWait('The guards storm in and break up the fight!');
    for (const m of this.party) m.syncDisplay();
    this.finish('guards');
  }
  static grantRewards(enemies) {
    const lines = []; const alive = G.party.members.filter(m => m.alive);
    const exp = Math.round(enemies.reduce((s, e) => s + e.exp, 0) * (1 + (G.perk('expBonus') || 0))); const money = enemies.reduce((s, e) => s + e.money, 0);
    const each = Math.max(1, Math.floor(exp / Math.max(1, alive.length)));
    G.kills += enemies.filter(e => !e.isCrawler).length; G.score += exp;
    lines.push(U.listNames(alive.map(m => m.name)) + ' gained ' + each + ' exp' + (alive.length > 1 ? ' each' : '') + '.');
    for (const m of alive) {
      const ups = m.addExp(each);
      for (const up of ups) {
        Sound.sfx('levelup');
        lines.push(m.name + ' reached level ' + up.level + '! HP+' + up.gains.hp + ' MP+' + up.gains.mp + ' STR+' + up.gains.str + ' DEF+' + up.gains.def + ' SPD+' + up.gains.spd + ' LCK+' + up.gains.luck + '.');
        for (const s of up.newSkills) lines.push(m.name + ' learned ' + SKILLS[s].name + '!');
        const choices = SKILL_CHOICES[m.cls] && SKILL_CHOICES[m.cls][up.level];
        if (choices) G.pendingSkillChoices.push({ member: m.name, options: choices });
        if (up.level >= 10) G.unlock('level10');
      }
    }
    let cut = 0; if (G.perk('cut') && money) { cut = Math.floor(money * G.perk('cut')); }
    if (money) { G.party.money += money - cut; lines.push('You got ' + (money - cut) + ' gold.' + (cut ? ' (' + MANAGERS[G.manager].name + ' took ' + cut + '.)' : '')); }
    const lootPlus = G.party.members.some(m => m.hasPassive('lootplus'));
    for (const e of enemies) for (const d of (e.drops || [])) if (U.chance(lootPlus ? Math.min(1, d.p * 2.5) : d.p)) {
      if (G.party.addItem(d.id)) lines.push((e.article ? 'The ' : '') + e.name + ' dropped a ' + ITEMS[d.id].name + '!');
      else lines.push((e.article ? 'The ' : '') + e.name + ' dropped a ' + ITEMS[d.id].name + ', but your bag is full.');
    }
    if (G.party.money >= 1000) G.unlock('rich');
    const firstMonster = enemies.find(e => !e.isCrawler);
    if (G.kills >= 1 && firstMonster) G.unlock('first_blood', { enemy: firstMonster.name });
    return lines;
  }
  *victory() {
    this.ended = true; Sound.stop(); Sound.sfx('win');
    let mortal = false;
    for (const m of this.party) { if (m.hp <= 0 && m.hpDisplay > 0) mortal = true; m.syncDisplay(); }
    yield* this.msg('YOU WON!');
    if (mortal) { G.unlock('mortal'); G.event('mortalSurvives'); G.addViewers(600, 'survived mortal damage'); yield* this.msg('Somebody survived by a hair. The audience is on its feet.'); }
    // downed rivals: finish, knock out or release
    let result = 'win';
    for (const e of this.downedCrawlers) {
      const id = e.crawlerId; const c = CRAWLERS[id]; const showboat = G.hasTrait(id, 'showboat');
      yield* this.msgWait(c.name + ' lies at your feet. The cameras zoom in. What do you do?');
      const r = yield* this.pick(new Menu([
        { label: 'Finish them', value: 'finish' }, { label: 'Knock out & loot', value: 'knockout' }, { label: 'Let them go', value: 'release' },
      ], { x: 8, y: 52, w: 150, title: c.name, cancelable: false }));
      if (r.value === 'finish') {
        G.finishCrawler(id); this.zoom = 24; Sound.sfx('smash');
        yield* this.msgWait(c.name + ' has been eliminated. Teleported to the Recovery Lounge. The audience ' + (showboat ? 'explodes' : 'roars') + '.');
        for (const d of e.drops) d.p = 1; e.drops.push({ id: U.chance(0.5 + G.sponsorLuck) ? 'box_gold' : 'box_silver', p: 1 });
      } else if (r.value === 'knockout') {
        const loot = G.knockoutCrawler(id); result = 'knockout';
        yield* this.msgWait(c.name + ': "' + (c.lines.knocked || '...') + '"');
        yield* this.msgWait('You take ' + loot.map(l => l.money != null ? l.money + ' gold' : 'the ' + ITEMS[l.id].name).join(', ') + '. Some viewers boo.');
        e.drops = [];
      } else {
        G.releaseCrawler(id); result = 'win';
        yield* this.msgWait(c.name + ': "' + (c.lines.spared || '...') + '"');
        yield* this.msgWait(c.name + ' limps away. No loot, but they will remember this.');
        e.drops = []; e.exp = Math.round(e.exp / 2);
      }
    }
    const lines = BattleScene.grantRewards(this.enemies.filter(e => !e.fled));
    for (const ln of lines) yield* this.msgWait(ln);
    if (this.timed && this.aggressorIsPlayer) { yield* this.msgWait('You won before the guards arrived. That does not make it legal.'); this.finish('guards'); return; }
    this.finish(result);
  }
  *defeat() {
    this.ended = true; Sound.stop();
    yield* this.msgWait(G.hero.name + ' and the party were wiped out...');
    G.flags.deathReason = 'Wiped out by ' + this.enemies.map(e => e.name).join(' and ') + '.';
    Game.transition(() => Game.replace(new GameOverScene()));
    yield () => false;
  }
  finish(result) {
    this.ended = true;
    for (const m of this.party) m.syncDisplay();
    const cb = this.onEnd;
    Game.transition(() => { Game.pop(); if (cb) cb(result); });
    this.co = Co.run((function* () { yield () => false; })());
  }
  // ---- per-frame ----
  update() {
    this.t++;
    if (!this.ended) for (const m of this.party) { if (m.alive && m.roll()) this.koQueue.push(m); }
    if (this.shake > 0) this.shake--;
    if (this.smashT > 0) this.smashT--;
    if (this.zoom > 0) this.zoom--;
    if (this.flashColor && --this.flashColor.t <= 0) this.flashColor = null;
    for (const k in this.lunge) if (--this.lunge[k] <= 0) delete this.lunge[k];
    for (const f of this.effects) f.t++; this.effects = this.effects.filter(f => f.t < f.life);
    for (const e of this.enemies) { if (e.flash > 0) e.flash--; if (e.jolt > 0) e.jolt--; if (!e.alive && e.fade > 0) e.fade = Math.max(0, e.fade - 0.06); }
    if (this.auto && Input.justPressed('cancel')) this.auto = false;
    if (this.menu) {
      const r = this.menu.update();
      if (!r) return;
      this.menuResult = r.cancel ? null : r.select;
    } else if (this.targetMode) {
      const tm = this.targetMode; const n = tm.list.length;
      if (Input.repeat('left') || Input.repeat('up')) { tm.idx = (tm.idx + n - 1) % n; Sound.sfx('cursor'); }
      if (Input.repeat('right') || Input.repeat('down')) { tm.idx = (tm.idx + 1) % n; Sound.sfx('cursor'); }
      if (Input.mouse.inside && (Input.mouse.moved || Input.mouse.clicked)) {
        let hit = -1;
        tm.list.forEach((t, i) => { const r = this.targetRect(t); if (r && Input.hover(r.x, r.y, r.w, r.h)) hit = i; });
        if (hit >= 0 && Input.mouse.moved && hit !== tm.idx) { tm.idx = hit; Sound.sfx('cursor'); }
        if (Input.mouse.clicked && !Input.mouse.consumed) { Input.consumeClick(); if (hit >= 0) { Sound.sfx('confirm'); tm.idx = hit; tm.result = tm.list[hit]; } }
      }
      if (Input.justPressed('confirm')) { Sound.sfx('confirm'); tm.result = tm.list[tm.idx]; }
      else if (Input.justPressed('cancel')) { Sound.sfx('cancel'); tm.result = null; }
      if (tm.result === undefined) return;
    } else this.tb.update();
    Co.step(this.co);
  }
  // ---- drawing ----
  drawBackground(ctx) {
    const t = this.t;
    for (let y = 0; y < UI.H; y += 4) {
      const h = (this.hue + y * 1.5 + t * 1.2) % 360;
      ctx.fillStyle = 'hsl(' + h + ',55%,' + (18 + 6 * Math.sin(y / 10 + t / 15)) + '%)';
      const off = Math.sin(y / 14 + t / 18) * 10;
      ctx.fillRect(0, y, UI.W, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let x = ((off + t) % 32 + 32) % 32 - 32; x < UI.W; x += 32) ctx.fillRect(Math.round(x), y, 12, 4);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = -3; i < 8; i++) {
      const xo = ((t * 0.6) % 72) + i * 72;
      ctx.beginPath(); ctx.moveTo(xo, 0); ctx.lineTo(xo + 28, 0); ctx.lineTo(xo - 60 + 28, UI.H); ctx.lineTo(xo - 60, UI.H); ctx.closePath(); ctx.fill();
    }
    if (ctx.createRadialGradient) {
      const g = ctx.createRadialGradient(UI.W / 2, 110, 60, UI.W / 2, 110, 230);
      if (g && g.addColorStop) { g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)'); ctx.fillStyle = g; ctx.fillRect(0, 0, UI.W, UI.H); }
    }
    if (this.flashColor) { ctx.fillStyle = this.flashColor.color; ctx.globalAlpha = Math.min(0.5, this.flashColor.t / 40); ctx.fillRect(0, 0, UI.W, UI.H); ctx.globalAlpha = 1; }
  }
  drawEffects(ctx) {
    for (const f of this.effects) {
      const k = f.t / f.life;
      if (f.type === 'slash') {
        ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(f.x, f.y, 18 + k * 10, Math.PI * 1.1 + k * 2, Math.PI * 1.1 + k * 2 + 1.6); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (f.type === 'burst') {
        ctx.fillStyle = f.color; ctx.globalAlpha = 1 - k;
        for (let i = 0; i < 10; i++) { const a = f.seed + i * 0.63; const r = 4 + k * 26; ctx.fillRect(Math.round(f.x + Math.cos(a) * r) - 1, Math.round(f.y + Math.sin(a) * r) - 1, 3, 3); }
        ctx.globalAlpha = 1;
      } else if (f.type === 'sparkle') {
        ctx.fillStyle = f.color; ctx.globalAlpha = 1 - k;
        for (let i = 0; i < 6; i++) { const a = f.seed + i * 1.05; ctx.fillRect(Math.round(f.x + Math.cos(a) * 14) - 1, Math.round(f.y - k * 22 + Math.sin(a * 3) * 4) - 1, 2, 2); }
        ctx.globalAlpha = 1;
      }
    }
  }
  draw(ctx) {
    ctx.save();
    if (this.shake > 0) ctx.translate(U.rand(-3, 3), U.rand(-2, 2));
    if (this.zoom > 0) { const z = 1 + (this.zoom / 24) * 0.08; ctx.translate(UI.W / 2, 110); ctx.scale(z, z); ctx.translate(-UI.W / 2, -110); }
    this.drawBackground(ctx);
    this.enemies.forEach((e, i) => {
      if (!e.alive && e.fade <= 0) return;
      const s = e.scale || 3; const jx = e.jolt > 0 ? ((e.jolt & 1) ? 3 : -3) : 0;
      const bob = e.alive ? Math.round(Math.sin(this.t / 10 + i) * 1.5) : 0;
      ctx.save();
      if (!e.alive) ctx.globalAlpha = e.fade;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); if (ctx.ellipse) ctx.ellipse(e.px + 8 * s, e.py + 16 * s + 2, 9 * s, 3, 0, 0, Math.PI * 2); ctx.fill();
      Sprites.draw(ctx, e.sprite, e.px + jx, e.py + bob, { scale: s, pal: e.pal });
      if (e.flash > 0 && (e.flash & 1)) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(e.px + jx - s, e.py + bob - s, 18 * s, 18 * s); ctx.globalCompositeOperation = 'source-over'; }
      ctx.restore();
      const st = Object.keys(e.status || {}).filter(k => e.status[k]).map(k => STATUS_INFO[k].short).concat(e.buffs.rage ? ['RAGE'] : [], e.buffs.ward ? ['WRD'] : []).join(' ');
      if (st && e.alive) UI.worldText(ctx, st, e.px, e.py - 10, UI.COLORS.bad);
      if (this.targetMode && this.targetMode.kind === 'enemy' && this.targetMode.list[this.targetMode.idx] === e) {
        const ay = e.py - 14 + ((this.t >> 3) & 1) * 2;
        ctx.fillStyle = '#fff'; ctx.fillRect(e.px + 8 * s - 3, ay, 6, 2); ctx.fillRect(e.px + 8 * s - 2, ay + 2, 4, 2); ctx.fillRect(e.px + 8 * s - 1, ay + 4, 2, 2);
        const label = e.name + (e.isCrawler ? ' (' + CLASSES[CRAWLERS[e.crawlerId].cls].name + ' L' + e.level + ')' : '');
        UI.labelBox(ctx, label, 8, 52, { color: UI.COLORS.sys });
      }
    });
    // the party, backs to the camera, above their status boxes
    const n = this.party.length; const bw = Math.min(72, Math.floor((UI.W - 24) / n)); const x0 = UI.W / 2 - (bw * n + (n - 1) * 2) / 2;
    this.party.forEach((m, i) => {
      const x = Math.round(x0 + i * (bw + 2)); const cx = x + bw / 2 - 8;
      const lung = this.lunge[m.name] ? -6 : 0;
      const [sp] = Sprites.facing(m.sprite, 'up', this.lunge[m.name] ? 1 : 0);
      if (m.alive) Sprites.draw(ctx, sp, cx, 150 + lung, { pal: m.pal });
      else { ctx.save(); ctx.globalAlpha = 0.45; Sprites.draw(ctx, m.sprite + '_down', cx, 156, { pal: m.pal }); ctx.restore(); }
    });
    this.drawEffects(ctx);
    if (this.smashT > 0) {
      ctx.font = "16px 'Press Start 2P', 'Courier New', monospace"; ctx.textBaseline = 'top';
      const s = 'SMAAAASH!!'; const w = ctx.measureText(s).width; const sc = 1 + Math.min(0.5, (30 - this.smashT) / 20);
      ctx.save(); ctx.translate(UI.W / 2, 100); ctx.scale(sc, sc); ctx.rotate(-0.1);
      ctx.fillStyle = '#000'; ctx.fillText(s, -w / 2 + 2, -8 + 2); ctx.fillStyle = '#ff3030'; ctx.fillText(s, -w / 2, -8); ctx.restore();
    }
    ctx.restore();
    // party boxes
    this.party.forEach((m, i) => {
      const active = this.activeMember === m || (this.targetMode && this.targetMode.kind === 'ally' && this.targetMode.list[this.targetMode.idx] === m);
      const x = Math.round(x0 + i * (bw + 2)), y = 178 - (active ? 6 : 0);
      this.partyRects[i] = { x, y: 150, w: bw, h: 72 };
      UI.window(ctx, x, y, bw, 46, { border: m.alive ? (active ? '#ffe080' : '#fff') : '#804040', fill: m.alive ? '#101018' : '#200a0a' });
      UI.text(ctx, m.name.slice(0, Math.floor((bw - 8) / 8)), x + 4, y + 3, m.alive ? '#fff' : UI.COLORS.bad);
      UI.text(ctx, 'HP', x + 4, y + 14, UI.COLORS.dim); UI.odometer(ctx, m.hpDisplay, x + bw - 28, y + 14, 3, m.hp <= 0 ? UI.COLORS.bad : (m.hpDisplay < m.maxhp * 0.25 ? '#ffd040' : '#fff'));
      UI.text(ctx, 'MP', x + 4, y + 25, UI.COLORS.dim); UI.odometer(ctx, m.mp, x + bw - 28, y + 25, 3, '#80c0ff');
      const st = Object.keys(m.status).map(s => STATUS_INFO[s].short).concat(m.buffs.ward ? ['WRD'] : [], m.buffs.rally ? ['HYP'] : [], m.guarding ? ['GRD'] : []).join(' ');
      if (st) UI.text(ctx, st.slice(0, Math.floor((bw - 8) / 8)), x + 4, y + 35, m.buffs.ward || m.buffs.rally ? UI.COLORS.good : UI.COLORS.bad);
    });
    if (this.tb.visible) this.tb.draw(ctx);
    if (this.menu) this.menu.draw(ctx);
    if (this.auto) UI.labelBox(ctx, 'AUTO (X to stop)', UI.W - 8, 52, { right: true, color: UI.COLORS.sys });
    if (this.timed) UI.labelBox(ctx, 'GUARDS IN ' + Math.max(0, this.timed - this.round + 1), UI.W - 8, this.auto ? 72 : 52, { right: true, color: '#ff8080' });
  }
}
