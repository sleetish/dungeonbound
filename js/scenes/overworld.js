// ---- Overworld exploration (floors) and interiors (safe room, lounges) ---------------------
// One scene class handles both. Interiors are pushed on top of the floor scene, so the floor
// (and its clock) pauses underneath and resumes when you walk out the exit door.
const MANAGER_ORDER = ['mo', 'prudence', 'dex', 'rosa', 'vinnie'];

class OverworldScene {
  constructor(opts) {
    opts = opts || {};
    this.interior = opts.interior || null; // null | 'safe' | 'hells' | 'mercy'
    this.map = null; this.ents = []; this.player = null; this.followers = []; this.history = [];
    this.camX = 0; this.camY = 0; this.t = 0; this.banner = 240; this.pending = null; this.flashT = 0;
    this.stairsWarned = false; this.doorWarned = null; this.floaters = []; this.lightCv = null; this.vignette = null;
  }
  get isFloor() { return !this.interior; }
  enter() {
    if (this.interior) this.enterInterior(); else this.enterFloor();
    this.updateCamera(); this.banner = 240; this.t = 0;
  }
  // ---- floor setup ----
  enterFloor() {
    const fd = getFloorData(G.floor); this.floorData = fd; this.map = new GameMap(fd);
    const fs = G.floorState(); this.fs = fs;
    const firstVisit = !fs.visited; fs.visited = true;
    if (fs.timeLeft == null) fs.timeLeft = fd.timeLimit;
    this.ents = [];
    const heroActor = G.hero;
    this.player = { kind: 'player', x: this.map.start.x * TILE, y: this.map.start.y * TILE, dir: 'down', base: heroActor.sprite, pal: heroActor.pal, moving: false, cooldown: 0, anim: 0 };
    this.ents.push(this.player);
    this.rebuildFollowers();
    this.map.enemySpots.forEach((s, idx) => { if (!this.enemyDue(idx)) return; this.spawnEnemy(s, idx); });
    if (fd.boss && !fs.bossDefeated && this.map.bossSpot) {
      const proto = G.makeEnemy(fd.boss, G.floor);
      this.ents.push({ kind: 'boss', x: this.map.bossSpot.x * TILE, y: this.map.bossSpot.y * TILE, key: fd.boss, sprite: proto.sprite, pal: proto.pal, level: proto.level, fx: 0, fy: 1, cooldown: 0 });
    }
    this.map.subbossSpots.forEach(s => {
      if (fs.subbosses[s.idx]) return;
      const key = (fd.subbosses || ['warden'])[s.idx] || 'warden'; const proto = G.makeEnemy(key, G.floor);
      this.ents.push({ kind: 'subboss', x: s.x * TILE, y: s.y * TILE, key, idx: s.idx, sprite: proto.sprite, pal: proto.pal, level: proto.level, fx: 0, fy: 1, cooldown: 0 });
    });
    this.map.npcSpots.forEach((s, i) => { const d = (fd.npcs || [])[i]; if (d) this.ents.push({ kind: 'npc', x: s.x * TILE, y: s.y * TILE, dir: 'down', base: 'human', pal: d.pal, data: d }); });
    // crawlers currently "in the dungeon" on this floor
    const here = Object.keys(G.crawlers).filter(id => G.crawlers[id].status === 'active' && G.crawlers[id].floor === G.floor && G.crawlers[id].inDungeon);
    here.forEach((id, i) => {
      const st = G.crawlers[id];
      let spot = this.map.crawlerSpots[i % Math.max(1, this.map.crawlerSpots.length)] || this.map.start;
      const saved = fs.crawlerPos[id];
      const e = { kind: 'crawler', id, x: saved ? saved.x : spot.x * TILE, y: saved ? saved.y : spot.y * TILE, dir: 'down', base: 'human', pal: CRAWLERS[id].pal, timer: 0, fx: 0, fy: 1, cooldown: 60, speed: 0.5, looted: 0, scuffle: 0, fightCd: 0 };
      if (st.grudge && !saved) { e.x = this.player.x + U.rand(48, 80); e.y = this.player.y + U.rand(-24, 24); e.ambusher = true; st.aggression = 100; }
      this.ents.push(e);
    });
    Sound.play(fd.music || 'overworld'); Sound.setIntensity(0);
    if (G.floor === 1 && !G.flags.intro) Game.push(new DialogScene(INTRO_SCRIPT));
    else if (firstVisit) {
      if (G.floor === 2) G.unlock('floor2'); if (G.floor === 3) G.unlock('floor3'); if (G.floor === 4) G.unlock('floor4');
      const lines = [];
      if (G.floor >= 4 && !G.flags.beyond) { G.flags.beyond = true; lines.push({ text: 'Congratulations. You have exhausted the scripted content. From here, the Dungeon improvises. The lounges are open: Hell\'s Kitchen for killers, the Mercy Lounge for everyone else. Your safe room is inside whichever will have you.', speaker: 'SYSTEM', color: UI.COLORS.sys }); }
      for (const m of fd.modifiers) lines.push({ text: 'Floor modifier: ' + FLOOR_MODIFIERS[m].name + '. ' + FLOOR_MODIFIERS[m].desc, speaker: 'SYSTEM', color: UI.COLORS.sys });
      if (lines.length) sayLines(lines);
      if (G.floor >= 2 && !fs.sponsorOffered) { fs.sponsorOffered = true; const id = G.sponsorOffer(); if (id) Game.push(new DialogScene(d => sponsorOfferScript(d, id))); }
    }
  }
  // ---- interior setup ----
  enterInterior() {
    const fd = getInteriorData(this.interior, G.floor); this.floorData = fd; this.map = new GameMap(fd);
    this.fs = { chests: {}, enemies: {}, gates: {}, subbosses: {}, bossDefeated: true, crawlerPos: {} };
    this.ents = [];
    const heroActor = G.hero;
    this.player = { kind: 'player', x: this.map.start.x * TILE, y: this.map.start.y * TILE, dir: 'up', base: heroActor.sprite, pal: heroActor.pal, moving: false, cooldown: 0, anim: 0 };
    this.ents.push(this.player); this.rebuildFollowers();
    if (this.interior === 'safe') {
      const m = MANAGERS[G.manager];
      if (m) this.map.npcSpots.forEach(s => this.ents.push({ kind: 'npc', x: s.x * TILE, y: s.y * TILE, dir: 'down', base: 'human', pal: m.pal, manager: true, data: { name: m.name } }));
      G.floorState().safeVisited = true;
    } else {
      this.map.npcSpots.forEach(s => this.ents.push({ kind: 'npc', x: s.x * TILE, y: s.y * TILE, dir: 'down', base: 'human', pal: { 1: '#303030', 2: '#c0c0c0', 3: '#202020' }, bartender: true, data: { name: this.interior === 'hells' ? 'Chef' : 'Host' } }));
      const lounging = Object.keys(G.crawlers).filter(id => G.crawlers[id].status === 'active' && G.crawlers[id].lounge === this.interior);
      lounging.slice(0, this.map.crawlerSpots.length).forEach((id, i) => {
        const s = this.map.crawlerSpots[i];
        this.ents.push({ kind: 'crawler', id, x: s.x * TILE, y: s.y * TILE, dir: 'down', base: 'human', pal: CRAWLERS[id].pal, timer: 0, fx: 0, fy: 1, cooldown: 120, speed: 0.3, lounging: true });
      });
      G.unlock('club');
    }
    Sound.play(fd.music || 'shop');
  }
  // Monsters respawn a while after being beaten (the floor clock keeps this honest).
  static get RESPAWN() { return 60 * 75; }
  enemyDue(idx) { const v = this.fs.enemies[idx]; if (!v) return true; if (v === true) return false; return G.playtime - v >= OverworldScene.RESPAWN; }
  spawnEnemy(s, idx) {
    const fd = this.floorData;
    const pool = fd.pool === 'all' ? [].concat(ENEMY_POOLS[1], ENEMY_POOLS[2], ENEMY_POOLS[3]) : ENEMY_POOLS[fd.pool];
    const key = fd.pool === 'all' ? U.choice(pool.slice(Math.max(0, pool.length - 8))) : U.choice(pool);
    const proto = G.makeEnemy(key, G.floor);
    delete this.fs.enemies[idx];
    this.ents.push({ kind: 'enemy', x: s.x * TILE, y: s.y * TILE, key, idx, level: proto.level, sprite: proto.sprite, pal: proto.pal, fx: 0, fy: 1, timer: 0, speed: 0.6, cooldown: 90, flip: false, home: { x: s.x * TILE, y: s.y * TILE } });
  }
  respawnEnemies() {
    this.map.enemySpots.forEach((s, idx) => {
      if (!this.fs.enemies[idx] || !this.enemyDue(idx)) return;
      if (U.dist(s.x * TILE, s.y * TILE, this.player.x, this.player.y) < 120) return; // never in your face
      this.spawnEnemy(s, idx);
    });
  }
  resume() {
    Sound.play(this.floorData.music || 'overworld'); this.rebuildFollowers(); this.pruneCrawlers();
    if (this.isFloor) this.processQueued();
  }
  rebuildFollowers() {
    this.ents = this.ents.filter(e => e.kind !== 'follower'); this.followers = [];
    G.party.members.slice(1).forEach((m, i) => {
      const f = { kind: 'follower', actor: m, x: this.player.x, y: this.player.y, dir: this.player.dir, base: m.sprite, pal: m.pal, index: i };
      this.followers.push(f); this.ents.push(f);
    });
  }
  pruneCrawlers() {
    this.ents = this.ents.filter(e => e.kind !== 'crawler' || (G.crawlers[e.id].status === 'active' && (this.interior ? G.crawlers[e.id].lounge === this.interior : (G.crawlers[e.id].floor === G.floor && G.crawlers[e.id].inDungeon))));
  }
  spawnCrawlerNearPlayer(id) {
    if (this.ents.some(e => e.kind === 'crawler' && e.id === id)) return;
    this.ents.push({ kind: 'crawler', id, x: this.player.x + 20, y: this.player.y, dir: 'down', base: 'human', pal: CRAWLERS[id].pal, timer: 30, fx: 0, fy: 1, cooldown: 120, speed: 0.5, looted: 0, scuffle: 0, fightCd: 0 });
  }
  // ---- helpers ----
  feet(e) { return { x: e.x + 3, y: e.y + 8, w: 10, h: 8 }; }
  box(e) { return { x: e.x + 2, y: e.y + 3, w: 12, h: 13 }; }
  overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  tileOf(e) { return { x: Math.floor((e.x + 8) / TILE), y: Math.floor((e.y + 12) / TILE) }; }
  inSafeZone(e) { const t = this.tileOf(e); return this.map.isSafeZone(t.x, t.y); }
  blocked(e, nx, ny) {
    const f = { x: nx + 3, y: ny + 8, w: 10, h: 8 };
    if (this.map.solidRect(f.x, f.y, f.w, f.h, this.fs)) return true;
    if (e.kind !== 'player' && e.kind !== 'follower') { // monsters and rivals can't enter neutral zones
      const tx0 = Math.floor(f.x / TILE), ty0 = Math.floor(f.y / TILE), tx1 = Math.floor((f.x + f.w - 1) / TILE), ty1 = Math.floor((f.y + f.h - 1) / TILE);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (this.map.isSafeZone(tx, ty)) return true;
    }
    for (const o of this.ents) {
      if (o === e || o.kind === 'follower' || o.kind === 'player') continue;
      if (e.kind === 'player') { if (o.kind === 'enemy' || o.kind === 'boss' || o.kind === 'subboss') continue; if (o.kind === 'crawler' && G.disposition(o.id) === 'hostile' && !o.lounging) continue; }
      else if (o.kind === 'follower') continue;
      if (this.overlap(f, this.feet(o))) return true;
    }
    return false;
  }
  tryMove(e, dx, dy) {
    let moved = false;
    if (dx && !this.blocked(e, e.x + dx, e.y)) { e.x += dx; moved = true; }
    if (dy && !this.blocked(e, e.x, e.y + dy)) { e.y += dy; moved = true; }
    return moved;
  }
  dirFromVec(dx, dy) { return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
  dirVec(dir) { return dir === 'up' ? [0, -1] : dir === 'down' ? [0, 1] : dir === 'left' ? [-1, 0] : [1, 0]; }
  floater(text, x, y, color) { this.floaters.push({ text, x, y, t: 90, color: color || '#fff' }); }
  centerSpot() {
    const cx = Math.floor(this.map.w / 2), cy = Math.floor(this.map.h / 2);
    for (let r = 0; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const t = this.map.tile(cx + dx, cy + dy); if ((t === '.' || t === ',') && !this.map.object(cx + dx, cy + dy)) return { x: (cx + dx) * TILE, y: (cy + dy) * TILE }; }
    return { x: this.map.start.x * TILE, y: this.map.start.y * TILE };
  }
  // ---- update ----
  update() {
    this.t++; G.playtime++;
    if (this.banner > 0) this.banner--;
    for (const f of this.floaters) f.t--; this.floaters = this.floaters.filter(f => f.t > 0);
    if (this.flashT > 0) { this.flashT--; if (this.flashT === 0 && this.pending) { const p = this.pending; this.pending = null; Game.push(new BattleScene(p)); } return; }
    if (this.isFloor) { if (this.t % 60 === 0) G.tickScores(); if (this.t % 120 === 0) this.respawnEnemies(); if (this.tickClock()) return; if (this.processQueued()) return; }
    if (Input.justPressed('menu')) { Game.push(new MenuScene({ inSafeRoom: this.interior === 'safe' })); return; }
    this.updatePlayer();
    for (const e of this.ents) {
      if (e.cooldown > 0) e.cooldown--;
      if (e.kind === 'enemy') this.updateEnemy(e);
      else if (e.kind === 'crawler') this.updateCrawler(e);
    }
    this.updateFollowers();
    this.updateCamera();
    if (this.player.cooldown > 0) this.player.cooldown--;
    this.checkContacts();
    this.checkWalkOns();
    if (Input.justPressed('confirm')) this.interact();
  }
  // deliveries, skill choices: returns true if something was pushed
  processQueued() {
    if (G.deliveries.length) {
      const d = G.deliveries.shift(); const sp = SPONSORS[d.id];
      if (d.money) Toast.show(sp.name + ' pays out', sp.lines.box + ' +' + d.money + ' gold.', '#80ff80');
      else if (G.party.addItem(d.item)) Toast.show(sp.name + (d.exclusive ? ' sends an exclusive' : ' sends a box'), sp.lines.box + ' You received: ' + ITEMS[d.item].name + '.', '#80ff80');
      else { G.party.money += ITEMS[d.item].price; Toast.show(sp.name + ' sends a box', 'Your bag was full, so it was sold for ' + ITEMS[d.item].price + ' gold.', '#80ff80'); }
      Sound.sfx('item');
      return true;
    }
    if (G.pendingSkillChoices.length) { const c = G.pendingSkillChoices.shift(); Game.push(new DialogScene(d => skillChoiceScript(d, c))); return true; }
    return false;
  }
  tickClock() {
    const fs = this.fs; if (fs.timeLeft == null) return false;
    fs.timeLeft--;
    const frac = fs.timeLeft / this.floorData.timeLimit;
    const taunt = (key, text) => { if (!fs.taunts[key]) { fs.taunts[key] = true; Toast.show('SYSTEM', text); } };
    if (frac < 0.5) taunt('half', 'Half the floor clock is gone. The producers have started a pool on how this ends.');
    if (frac < 0.25) taunt('quarter', 'Quarter clock. Every floor collapses eventually. This one is scheduled.');
    if (fs.timeLeft < 7200) taunt('two', 'Two minutes. Find the stairs or find religion.');
    if (fs.timeLeft <= 0) {
      fs.timeLeft = 0;
      if (fs.bossDefeated) { for (const m of G.party.members) { m.hp = Math.max(1, Math.floor(m.hp / 2)); m.hpDisplay = m.hp; } sayLines([{ text: 'The floor collapses! Your party tumbles down the stairwell, battered but alive.', speaker: 'SYSTEM', color: UI.COLORS.sys }], { onDone: () => this.descend(true) }); }
      else { G.flags.deathReason = 'The floor collapsed with you on it.'; Game.transition(() => Game.replace(new GameOverScene())); }
      return true;
    }
    return false;
  }
  updatePlayer() {
    const p = this.player; let dx = 0, dy = 0;
    if (Input.isDown('left')) dx -= 1; if (Input.isDown('right')) dx += 1;
    if (Input.isDown('up')) dy -= 1; if (Input.isDown('down')) dy += 1;
    p.moving = !!(dx || dy);
    if (!p.moving) return;
    const spd = 1.5; const len = Math.sqrt(dx * dx + dy * dy); dx = dx / len * spd; dy = dy / len * spd;
    p.dir = this.dirFromVec(dx, dy);
    const ox = p.x, oy = p.y;
    this.tryMove(p, dx, dy);
    if (p.x !== ox || p.y !== oy) {
      p.anim++;
      this.history.unshift({ x: p.x, y: p.y, dir: p.dir });
      if (this.history.length > 200) this.history.length = 200;
    }
  }
  updateFollowers() {
    this.followers.forEach((f, i) => {
      const h = this.history[(i + 1) * 9];
      if (h) { f.x = h.x; f.y = h.y; f.dir = h.dir; f.moving = this.player.moving; }
    });
  }
  updateEnemy(e) {
    const p = this.player; const d = U.dist(e.x, e.y, p.x, p.y); const heroLv = G.hero.level;
    const weak = e.level + 6 <= heroLv;
    let vx = 0, vy = 0;
    if (weak && d < 72) { const k = 0.9 / Math.max(1, d); vx = (e.x - p.x) * k; vy = (e.y - p.y) * k; }
    else if (!weak && d < 88 && e.cooldown === 0 && !this.inSafeZone(p)) { const k = 0.7 / Math.max(1, d); vx = (p.x - e.x) * k; vy = (p.y - e.y) * k; }
    else {
      if (--e.timer <= 0) { e.timer = U.rand(30, 90); if (U.chance(0.6)) { const a = Math.random() * Math.PI * 2; e.vx = Math.cos(a) * e.speed; e.vy = Math.sin(a) * e.speed; } else { e.vx = 0; e.vy = 0; } }
      vx = e.vx || 0; vy = e.vy || 0;
      if (U.dist(e.x, e.y, e.home.x, e.home.y) > 96) { const k = e.speed / Math.max(1, U.dist(e.x, e.y, e.home.x, e.home.y)); vx = (e.home.x - e.x) * k; vy = (e.home.y - e.y) * k; }
    }
    if (vx || vy) {
      const moved = this.tryMove(e, vx, vy);
      if (!moved) e.timer = 0;
      const l = Math.sqrt(vx * vx + vy * vy) || 1; e.fx = vx / l; e.fy = vy / l; e.flip = vx < 0;
    }
  }
  updateCrawler(e) {
    const p = this.player; const d = U.dist(e.x, e.y, p.x, p.y); const disp = G.disposition(e.id); const st = G.crawlers[e.id];
    if (e.scuffle > 0) { e.scuffle--; return; }
    if (e.fightCd > 0) e.fightCd--;
    let vx = 0, vy = 0;
    if (!e.lounging && disp === 'hostile' && d < 110 && e.cooldown === 0 && !this.inSafeZone(p)) { const k = 0.85 / Math.max(1, d); vx = (p.x - e.x) * k; vy = (p.y - e.y) * k; }
    else if (d > 28) {
      // rivals hunt monsters and chests when nothing else is going on
      if (this.isFloor && e.fightCd === 0) {
        const target = this.rivalTarget(e);
        if (target) { const td = U.dist(e.x, e.y, target.x, target.y); if (td < 18) { this.rivalReach(e, target); return; } const k = e.speed / Math.max(1, td); vx = (target.x - e.x) * k; vy = (target.y - e.y) * k; }
      }
      if (!vx && !vy) {
        if (--e.timer <= 0) { e.timer = U.rand(40, 120); if (U.chance(0.5)) { const a = Math.random() * Math.PI * 2; e.vx = Math.cos(a) * e.speed; e.vy = Math.sin(a) * e.speed; } else { e.vx = 0; e.vy = 0; } }
        vx = e.vx || 0; vy = e.vy || 0;
      }
    }
    if (vx || vy) { if (!this.tryMove(e, vx, vy)) e.timer = 0; e.dir = this.dirFromVec(vx, vy); e.moving = true; const l = Math.sqrt(vx * vx + vy * vy) || 1; e.fx = vx / l; e.fy = vy / l; }
    else { e.moving = false; if (d < 40) e.dir = this.dirFromVec(p.x - e.x, p.y - e.y); }
    if (this.isFloor) G.floorState().crawlerPos[e.id] = { x: e.x, y: e.y };
  }
  rivalTarget(e) {
    let best = null, bd = 150;
    for (const o of this.ents) if (o.kind === 'enemy' && o.cooldown === 0) { const d = U.dist(e.x, e.y, o.x, o.y); if (d < bd) { bd = d; best = o; } }
    if (e.looted < 1) for (const c of this.map.chests) if (!this.fs.chests[c.idx]) { const cx = c.x * TILE, cy = c.y * TILE + 12; const d = U.dist(e.x, e.y, cx, cy); if (d < bd) { bd = d; best = { chest: c, x: cx, y: cy }; } }
    return best;
  }
  rivalReach(e, target) {
    const st = G.crawlers[e.id]; e.fightCd = 420; e.scuffle = 40;
    if (target.chest) {
      const p = G.hasTrait(e.id, 'greedy') ? 0.7 : 0.35;
      if (U.chance(p)) { this.fs.chests[target.chest.idx] = true; e.looted++; st.score += 40; this.floater(CRAWLERS[e.id].name + ' looted a chest!', e.x - 30, e.y - 12, '#ffd040'); }
      return;
    }
    const enemy = target; if (enemy.idx != null) this.fs.enemies[enemy.idx] = G.playtime || 1;
    const i = this.ents.indexOf(enemy); if (i >= 0) this.ents.splice(i, 1);
    st.score += 25; if (U.chance(0.35)) st.level++;
    this.floater(CRAWLERS[e.id].name + ' beat a ' + ENEMIES[enemy.key].name, e.x - 30, e.y - 12, '#c0c0ff');
  }
  updateCamera() {
    this.camX = U.clamp(Math.round(this.player.x + 8 - UI.W / 2), 0, Math.max(0, this.map.pixelW - UI.W));
    this.camY = U.clamp(Math.round(this.player.y + 8 - UI.H / 2), 0, Math.max(0, this.map.pixelH - UI.H));
  }
  // ---- encounters ----
  checkContacts() {
    if (this.player.cooldown > 0 || this.pending) return;
    const pb = this.box(this.player);
    for (const e of this.ents) {
      if (e.cooldown > 0) continue;
      const hostileCrawler = e.kind === 'crawler' && G.disposition(e.id) === 'hostile' && !e.lounging;
      if (!(e.kind === 'enemy' || e.kind === 'boss' || e.kind === 'subboss' || hostileCrawler)) continue;
      if (!this.overlap(pb, this.box(e))) continue;
      if (this.inSafeZone(this.player)) { this.teleportAttacker(e); return; }
      if (e.kind === 'enemy') { this.encounter(e); return; }
      if (e.kind === 'boss' || e.kind === 'subboss') { this.bossEncounter(e); return; }
      if (hostileCrawler) { this.crawlerBattle(e, 'enemy', true); return; }
    }
  }
  teleportAttacker(e) {
    const c = this.centerSpot(); e.x = c.x; e.y = c.y; e.cooldown = 180;
    Sound.sfx('magic'); this.floater('Neutral zone: attacker teleported!', this.player.x - 60, this.player.y - 14, UI.COLORS.sys);
  }
  initiativeFor(e) {
    if (G.party.members.some(m => m.hasPassive('firststrike'))) return 'party';
    const p = this.player; const [pdx, pdy] = this.dirVec(p.dir);
    const toP = [p.x - e.x, p.y - e.y]; const len = Math.hypot(toP[0], toP[1]) || 1; toP[0] /= len; toP[1] /= len;
    const enemyFacing = (e.fx || 0) * toP[0] + (e.fy || 1) * toP[1];
    const playerFacing = pdx * -toP[0] + pdy * -toP[1];
    if (enemyFacing < -0.2) return 'party';
    if (playerFacing < -0.2) return 'enemy';
    return null;
  }
  encounter(e) {
    const heroLv = G.hero.level;
    const group = [e];
    for (const o of this.ents) if (o !== e && o.kind === 'enemy' && group.length < 3 && U.dist(o.x, o.y, e.x, e.y) < 56) group.push(o);
    const enemies = group.map(g => G.makeEnemy(g.key, G.floor));
    if (enemies.every(en => en.level + 6 <= heroLv)) {
      this.removeGroup(group);
      const lines = BattleScene.grantRewards(enemies);
      Sound.sfx('win');
      sayLines(['You won the battle without fighting!'].concat(lines), {});
      this.player.cooldown = 30;
      return;
    }
    const initiative = this.initiativeFor(e);
    this.startBattle({ enemies, initiative, boss: false, onEnd: res => this.afterBattle(res, group) });
  }
  removeGroup(group) { for (const g of group) { if (g.idx != null) this.fs.enemies[g.idx] = G.playtime || 1; const i = this.ents.indexOf(g); if (i >= 0) this.ents.splice(i, 1); } }
  afterBattle(res, group) {
    if (res === 'win') this.removeGroup(group);
    else { for (const g of group) g.cooldown = 150; this.player.cooldown = 60; }
  }
  startBattle(opts) {
    Sound.sfx('encounter'); Sound.stop();
    this.pending = opts; this.flashT = 28;
  }
  bossEncounter(e) {
    const proto = G.makeEnemy(e.key, G.floor);
    const self = this; const isSub = e.kind === 'subboss';
    e.cooldown = 120; this.player.cooldown = 120;
    Game.push(new DialogScene(function* (d) {
      yield d.sys(isSub ? 'A gate guardian blocks the way. Beat it and the section beyond unlocks.' : 'Warning: a Floor Boss is present. Viewership is spiking. Please die interestingly.');
      yield d.say(proto.intro || 'The boss looms.');
      const lv = G.hero.level; const gap = proto.level - lv;
      yield d.sys(proto.name + ' is level ' + proto.level + '. You are level ' + lv + '.' + (gap >= 3 ? ' That is a bad matchup. Monsters respawn; the Terminal saves; nobody is judging you. Everybody is judging you.' : gap >= 1 ? ' Winnable with skills and a Guard on the tell.' : ' You should be fine. Probably.'));
      yield d.choice([{ label: 'Fight', value: 'fight' }, { label: 'Not yet', value: 'no' }], { title: proto.name });
      if (d.result !== 'fight') { e.cooldown = 90; self.player.cooldown = 30; self.player.y += 8; yield d.say('You back away. It watches you go.'); return; }
      self.startBattle({ enemies: [proto], initiative: null, boss: !isSub, subboss: isSub, onEnd: res => {
        if (res !== 'win') return;
        const i = self.ents.indexOf(e); if (i >= 0) self.ents.splice(i, 1);
        if (isSub) {
          self.fs.subbosses[e.idx] = true; self.fs.gates[e.idx] = true; G.event('subBossKills'); G.unlock('subboss'); G.addViewers(400, 'gate guardian down');
          sayLines([{ text: 'Somewhere on the floor, a gate grinds open.', speaker: 'SYSTEM', color: UI.COLORS.sys }]);
        } else {
          self.fs.bossDefeated = true; G.event('bossKills'); G.addViewers(1200, 'floor boss down');
          if (G.floor === 1) G.unlock('boss1');
          else if (G.floor === 2) G.unlock('boss2');
          else if (G.floor === 3) G.unlock('boss3');
          else if (G.floor === 18) G.unlock('boss18');
          const stairsLine = G.floor === 18
            ? 'The Showrunner is down. The Broadcast Deck stairs are no longer stairs — they are an exit. Walk out, or the network will invent a reason to keep you.'
            : 'Floor Boss defeated. The stairs have been unsealed. Please proceed to your next humiliation.';
          sayLines([{ text: stairsLine, speaker: 'SYSTEM', color: UI.COLORS.sys }]);
        }
      } });
    }));
  }
  crawlerBattle(e, initiative, ambush, opts) {
    opts = opts || {};
    const enemy = G.makeCrawlerEnemy(e.id); const self = this; const st = G.crawlers[e.id];
    e.cooldown = 120; this.player.cooldown = 120;
    if (e.ambusher) { G.unlock('rival'); e.ambusher = false; }
    const go = () => self.startBattle({ enemies: [enemy], initiative, boss: false, timed: opts.timed || 0, clubKind: self.interior, aggressorIsPlayer: !!opts.playerStarted, onEnd: res => {
      if (res === 'win' || res === 'recruit' || res === 'knockout') { const i = self.ents.indexOf(e); if (i >= 0) self.ents.splice(i, 1); }
      if (res === 'guards') {
        if (opts.playerStarted) { G.bans[self.interior] = true; G.unlock('banned'); sayLines([{ text: 'The guards drag you out. You are banned from ' + self.floorData.name + ' for life.', speaker: 'SYSTEM', color: UI.COLORS.sys }], { onDone: () => Game.pop() }); }
        else { st.lounge = null; st.floor = G.floor; st.inDungeon = true; const i = self.ents.indexOf(e); if (i >= 0) self.ents.splice(i, 1); sayLines([{ text: 'The guards haul ' + CRAWLERS[e.id].name + ' out. They are banned from this lounge.', speaker: 'SYSTEM', color: UI.COLORS.sys }]); }
      }
    } });
    if (ambush) Game.push(new DialogScene(function* (d) { yield d.who(CRAWLERS[e.id].name, st.grudge ? 'Remember me? I remember you.' : CRAWLERS[e.id].lines.hostile); go(); }));
    else go();
  }
  // ---- interaction ----
  interact() {
    const p = this.player; const [dx, dy] = this.dirVec(p.dir);
    const fx = p.x + 8 + dx * 14, fy = p.y + 12 + dy * 12;
    const tx = Math.floor(fx / TILE), ty = Math.floor(fy / TILE);
    const obj = this.map.object(tx, ty);
    if (obj && !GameMap.WALK_ON.includes(obj.type)) { this.useObject(obj); return; }
    for (const e of this.ents) {
      if (e === p || e.kind === 'follower') continue;
      const b = this.box(e);
      if (fx >= b.x && fx < b.x + b.w && fy >= b.y && fy < b.y + b.h) {
        if (e.kind === 'npc') { e.dir = this.dirFromVec(-dx, -dy); if (e.manager) this.talkToManager(); else if (e.bartender) this.talkToBartender(); else sayLines(e.data.lines, { speaker: e.data.name }); return; }
        if (e.kind === 'crawler') { e.dir = this.dirFromVec(-dx, -dy); this.talkToCrawler(e); return; }
        if (e.kind === 'boss' || e.kind === 'subboss') { this.bossEncounter(e); return; }
      }
    }
  }
  useObject(obj) {
    const self = this;
    if (obj.type === 'chest') {
      if (this.fs.chests[obj.idx]) { sayLines(['The chest is empty. Someone got here first.']); return; }
      const it = ITEMS[obj.item];
      if (!G.party.addItem(obj.item)) { sayLines(['There\'s a ' + it.name + ' inside, but your pockets are full.']); return; }
      this.fs.chests[obj.idx] = true; Sound.sfx('item'); G.unlock('chest'); G.event('chests'); if (it.unique) G.unlock('unique');
      sayLines(['You found a ' + it.name + '!']);
    } else if (obj.type === 'terminal') {
      Game.push(new DialogScene(function* (d) {
        yield d.sys('Dungeon Terminal online. Save your progress?');
        yield d.choice(['Save', 'Cancel']);
        if (d.result === 'Save') { const ok = G.save(); Sound.sfx(ok ? 'confirm' : 'error'); yield d.sys(ok ? 'Saved. Your data has been backed up to a moon.' : 'Save failed. This browser blocks storage.'); }
      }));
    } else if (obj.type === 'pod') {
      Game.push(new DialogScene(function* (d) {
        yield d.sys('Med Pod. Free of charge. The ads are mandatory.');
        yield d.wait(10); G.party.fullHeal(); Sound.sfx('heal');
        yield d.sys('Party fully restored! This healing was brought to you by Blorp.');
      }));
    } else if (obj.type === 'shop' || obj.type === 'vending') {
      Game.push(new ShopScene(this.floorData.shop, { vending: obj.type === 'vending' }));
    } else if (obj.type === 'stash') {
      Game.push(new StashScene());
    } else if (obj.type === 'bench') {
      sayLines([{ text: 'CRAFTING STATION: OFFLINE. "Coming in a future content patch," says a sticky note. The sticky note is sponsored.', speaker: 'SYSTEM', color: UI.COLORS.sys }]);
    } else if (obj.type === 'bed') {
      Game.push(new DialogScene(function* (d) {
        yield d.say('A cot with a network-issue blanket. Rest here?');
        yield d.choice(['Rest', 'Not now']);
        if (d.result !== 'Rest') return;
        const mode = G.perk('rest'); G.party.fullHeal(); Sound.sfx('heal');
        yield d.say('Everyone is fully rested.');
        if (mode === 'feast') { const snack = G.perk('snack') || 'ration'; if (G.party.addItem(snack, 2)) yield d.who(MANAGERS[G.manager].name, 'Take these. Two ' + ITEMS[snack].name + 's. No arguments.'); }
        if (G.perk('cut')) { const cut = Math.floor(G.party.money * 0.02); G.party.money -= cut; if (cut > 0) yield d.who(MANAGERS[G.manager].name, 'Room service fee: ' + cut + ' gold. Kidding. Not kidding.'); }
      }));
    }
  }
  // stairs, doors and exits are walked onto
  checkWalkOns() {
    if (this.pending) return;
    const t = this.tileOf(this.player); const obj = this.map.object(t.x, t.y);
    if (!obj || !GameMap.WALK_ON.includes(obj.type)) { this.stairsWarned = false; this.doorWarned = null; return; }
    if (obj.type === 'stairs') { this.checkStairs(); return; }
    const key = obj.type + obj.x + ',' + obj.y;
    if (this.doorWarned === key) return;
    this.doorWarned = key;
    if (obj.type === 'exit') { Sound.sfx('stairs'); Game.transition(() => Game.pop()); return; }
    if (obj.type === 'door_safe') { this.safeDoor(obj); return; }
    if (obj.type === 'door_hells' || obj.type === 'door_mercy') { this.clubDoor(obj.type === 'door_hells' ? 'hells' : 'mercy'); return; }
  }
  safeDoor(obj) {
    const self = this;
    const enterRoom = () => { Sound.sfx('stairs'); Game.transition(() => Game.push(new OverworldScene({ interior: 'safe' }))); };
    if (G.manager) {
      if (this.interior && !G.manager) return;
      Game.push(new DialogScene(function* (d) { yield d.say('The door recognizes you. Enter your safe room?'); yield d.choice(['Enter', 'Not now']); if (d.result === 'Enter') enterRoom(); }));
      return;
    }
    const mid = MANAGER_ORDER[obj.idx != null ? obj.idx % MANAGER_ORDER.length : U.rand(0, 4)]; const m = MANAGERS[mid];
    Game.push(new DialogScene(function* (d) {
      yield d.sys(G.floor === 1 ? 'A safe room. The manager inside wants to represent you. Whoever you sign with stays with you for the whole run. Choose carefully.' : 'A safe room. Last call for representation.');
      yield d.who(m.name, m.pitch);
      yield d.say(m.name + ' (' + m.style + '): ' + m.blurb);
      yield d.choice([{ label: 'Sign with ' + m.name.split(' ')[0], value: 'yes' }, { label: 'Look at other doors', value: 'no' }]);
      if (d.result === 'yes') { G.manager = mid; G.unlock('manager'); Sound.sfx('levelup'); yield d.who(m.name, 'Smart. Come on in.'); enterRoom(); }
      else yield d.who(m.name, 'Suit yourself. Door\'s here if you change your mind.');
    }));
  }
  clubDoor(kind) {
    const self = this; const name = kind === 'hells' ? 'Hell\'s Kitchen' : 'The Mercy Lounge';
    const ok = G.canEnterClub(kind);
    if (!ok.ok) { sayLines([{ text: ok.why === 'banned' ? 'The bouncer shakes his head. You are banned from ' + name + '.' : ok.why, speaker: 'Bouncer' }]); return; }
    Game.push(new DialogScene(function* (d) {
      yield d.who('Bouncer', 'Welcome to ' + name + '. No fighting inside. The guards are quick and they do not care who started it.');
      yield d.choice(['Enter', 'Not now']);
      if (d.result === 'Enter') { Sound.sfx('stairs'); Game.transition(() => Game.push(new OverworldScene({ interior: kind }))); }
    }));
  }
  checkStairs() {
    const s = this.map.stairs; if (!s || this.pending) return;
    const locked = this.floorData.boss && !this.fs.bossDefeated;
    if (locked) {
      if (!this.stairsWarned) { this.stairsWarned = true; sayLines([{ text: 'The stairs are sealed. Defeat the Floor Boss in the final section to descend.', speaker: 'SYSTEM', color: UI.COLORS.sys }]); }
      return;
    }
    if (this.stairsWarned) return;
    this.stairsWarned = true; const self = this;
    const finale = G.floor === 18 && !G.flags.endless;
    Game.push(new DialogScene(function* (d) {
      if (finale) {
        yield d.sys('An exit door. Beyond it: the end of the show. Walk out?');
        yield d.choice(['Escape', 'Not yet']);
        if (d.result === 'Escape') self.descend(false);
      } else {
        yield d.sys('Stairs to Floor ' + (G.floor + 1) + '. Descend? Once you go down, this floor is gone.');
        yield d.choice(['Descend', 'Not yet']);
        if (d.result === 'Descend') self.descend(false);
      }
    }));
  }
  descend(forced) {
    Sound.sfx('stairs');
    const fs = this.fs;
    const hadCrawlers = Object.keys(G.crawlers).some(id => G.crawlers[id].floor === G.floor && G.crawlers[id].status === 'active');
    if (hadCrawlers && !G.pkThisFloor) G.unlock('pacifist');
    if (fs.timeLeft != null) { if (fs.timeLeft > this.floorData.timeLimit * 0.5) G.event('fastFloors'); if (fs.timeLeft < 7200 && fs.timeLeft > 0) G.unlock('clock'); }
    G.event('floors');
    const leavers = G.checkLoyalty();
    const summary = G.floorSummary(); G.resetFloorStats();
    G.pkThisFloor = false;
    // Clearing Floor 18 ends the advertised run (unless already in endless mode).
    if (G.floor === 18 && !G.flags.endless) {
      G.deepest = Math.max(G.deepest, 18);
      G.save();
      Game.transition(() => Game.replace(new VictoryScene()));
      return;
    }
    G.floor++; G.deepest = Math.max(G.deepest, G.floor); G.score += 100; G.addViewers(250, 'descended');
    G.advanceCrawlers(G.floor);
    G.save();
    const lines = [{ text: 'Floor ' + (G.floor - 1) + ' report: ' + summary, speaker: 'SYSTEM', color: UI.COLORS.sys }];
    for (const n of leavers) lines.push({ text: n + ' has had enough of your leadership and walks off into the dark.', speaker: 'SYSTEM', color: UI.COLORS.sys });
    Game.transition(() => { Game.replace(new OverworldScene()); sayLines(lines); });
  }
  // ---- talking ----
  talkToManager() {
    const m = MANAGERS[G.manager]; const fd = getFloorData(G.floor); const fs = G.floorState();
    Game.push(new DialogScene(function* (d) {
      yield d.who(m.name, U.choice(m.chatter));
      while (true) {
        yield d.choice([{ label: 'Floor tips', value: 'tips' }, { label: 'Boss hint', value: 'boss' }, { label: 'Sponsors', value: 'sponsors' }, { label: 'Leave', value: 'leave' }], { title: m.name });
        const r = d.result;
        if (!r || r === 'leave') { yield d.who(m.name, 'Go get \'em.'); return; }
        if (r === 'tips') { const tips = MANAGER_TIPS.themes[fd.theme] || MANAGER_TIPS.themes.void; for (const t of tips) yield d.who(m.name, t); if (m.perks.mapHints) yield d.who(m.name, 'This floor has ' + fd.chests.length + ' chests and ' + (fd.gates || 2) + ' gates. Sub-bosses: ' + fd.subbosses.map(s => ENEMIES[s].name).join(' and ') + '.'); continue; }
        if (r === 'boss') {
          const hints = MANAGER_TIPS.bosses[fd.boss] || ['Big. Angry.', 'Big. Angry. Hits hard.']; const level = m.perks.bossHint;
          if (fs.bossDefeated) { yield d.who(m.name, 'You already beat this one. Take the stairs before the clock does.'); continue; }
          if (level === 0) yield d.who(m.name, 'Bosses? Not my department. Sponsors are my department.');
          else for (const h of hints.slice(0, level)) yield d.who(m.name, h);
          continue;
        }
        if (r === 'sponsors') {
          if (!G.sponsors.length) { yield d.who(m.name, 'No sponsors yet. They make offers when you arrive on a new floor. Do interesting things and they come calling.'); continue; }
          for (const s of G.sponsors) { const sp = SPONSORS[s.id]; yield d.who(m.name, sp.name + ': satisfaction ' + s.sat + '/100, revenue ' + s.revenue + '. They like: ' + Object.keys(sp.likes).join(', ') + '.' + (Object.keys(sp.dislikes).length ? ' They hate: ' + Object.keys(sp.dislikes).join(', ') + '.' : '')); }
          continue;
        }
      }
    }));
  }
  talkToBartender() {
    const kind = this.interior;
    const rumors = kind === 'hells'
      ? ['The regulars here have all finished somebody. They respect it. They also watch your hands.', 'Word is the deeper floors pay double to anyone who finishes a top-ten crawler.', 'Guards come in four rounds. Nobody wins a fight here. Everybody loses a membership.']
      : ['Nobody here has more than three eliminations. Some of them are proud of it. Some are just careful.', 'Sponsors love a mercy story. Mercy Corp practically lives in this room.', 'If you start a fight in here you are out. Forever. The bouncer keeps a list and he laminated it.'];
    sayLines([U.choice(rumors), 'Your safe room is through the door in the corner, if you\'ve got a manager.'], { speaker: kind === 'hells' ? 'Chef' : 'Host' });
  }
  talkToCrawler(e) {
    const id = e.id, c = CRAWLERS[id], st = G.crawlers[id], self = this;
    const disp = G.disposition(id);
    if (disp === 'hostile' && !e.lounging) { this.crawlerBattle(e, null, true); return; }
    // in a lounge, a bloodthirsty rival may swing first
    if (e.lounging && e.fightCd === 0 && G.hasTrait(id, 'bloodthirsty') && U.chance(0.15)) {
      e.fightCd = 9999;
      Game.push(new DialogScene(function* (d) { yield d.who(c.name, c.lines.hostile + ' (They swing in the lounge! The guards are coming.)'); self.crawlerBattle(e, 'enemy', false, { timed: 4, playerStarted: false }); }));
      return;
    }
    Game.push(new DialogScene(function* (d) {
      yield d.who(c.name, st.met ? c.lines[disp] : c.lines.greet); st.met = true;
      while (true) {
        const traitNames = (c.traits || []).map(t => TRAITS[t].name).join(', ');
        yield d.choice([{ label: 'Team up', value: 'team' }, { label: 'Give item', value: 'gift' }, { label: 'Ask about them', value: 'about' }, { label: 'Challenge', value: 'fight' }, { label: 'Leave', value: 'leave' }], { title: c.name + ' (' + CLASSES[c.cls].name + ' L' + st.level + ')' });
        const r = d.result;
        if (!r || r === 'leave') { yield d.who(c.name, disp === 'friendly' ? 'See you around. Don\'t die.' : 'Yeah. Move along.'); return; }
        if (r === 'about') { yield d.say(c.bio); yield d.say('Traits: ' + traitNames + '. Eliminations: ' + st.kills + '. Mood: ' + disp + '.'); continue; }
        if (r === 'team') {
          const res = G.tryRecruit(id);
          yield d.who(c.name, res.text);
          if (res.ok) { const a = G.recruit(id); if (a) { Sound.sfx('levelup'); yield d.sys(c.name + ' joined the party!'); } return; }
          continue;
        }
        if (r === 'gift') {
          const inv = G.party.inventory.map(x => ({ label: ITEMS[x.id].name, value: x.id, right: 'x' + x.qty }));
          if (!inv.length) { yield d.say('You have nothing to give. Relatable.'); continue; }
          yield d.choice(inv, { title: 'GIVE WHAT?', rows: 6, x: 96, y: 40, w: UI.W - 104 });
          if (!d.result) continue;
          const g = G.giveGift(id, d.result); Sound.sfx('item');
          yield d.who(c.name, g.text);
          if (g.wanted) {
            if (G.party.full) { yield d.who(c.name, '...But your party\'s full. Come find me if a spot opens up.'); return; }
            const a = G.recruit(id); if (a) { Sound.sfx('levelup'); yield d.sys(c.name + ' joined the party!'); } return;
          }
          continue;
        }
        if (r === 'fight') {
          if (self.interior) {
            yield d.sys('Fighting in a lounge is forbidden. If you start this, the guards arrive in four rounds and you will be banned for life. Do it anyway?');
            yield d.choice(['Do it', 'Never mind']);
            if (d.result !== 'Do it') continue;
            yield d.who(c.name, c.lines.challenge);
            G.adjustAggression(id, 20);
            self.crawlerBattle(e, 'party', false, { timed: 4, playerStarted: true });
            return;
          }
          yield d.who(c.name, c.lines.challenge);
          G.adjustAggression(id, 20);
          self.crawlerBattle(e, 'party', false);
          return;
        }
      }
    }));
  }
  // ---- draw ----
  shadow(ctx, sx, sy) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    if (ctx.ellipse) { ctx.beginPath(); ctx.ellipse(sx + 8, sy + 15, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(sx + 3, sy + 14, 10, 2);
  }
  drawVignette(ctx) {
    if (!this.vignette) {
      const cv = document.createElement('canvas'); cv.width = UI.W; cv.height = UI.H; const c = cv.getContext('2d');
      const g = c.createRadialGradient && c.createRadialGradient(UI.W / 2, UI.H / 2, UI.H * 0.45, UI.W / 2, UI.H / 2, UI.W * 0.7);
      if (g && g.addColorStop) { g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); c.fillStyle = g; c.fillRect(0, 0, UI.W, UI.H); }
      this.vignette = cv;
    }
    ctx.drawImage(this.vignette, 0, 0);
  }
  // darkness with light around the player and the torches
  drawLighting(ctx) {
    const dark = this.isFloor && this.floorData.modifiers && this.floorData.modifiers.includes('dark');
    if (!this.lightCv) { this.lightCv = document.createElement('canvas'); this.lightCv.width = UI.W; this.lightCv.height = UI.H; }
    const c = this.lightCv.getContext('2d');
    if (!c.createRadialGradient) return;
    c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, UI.W, UI.H);
    c.fillStyle = dark ? 'rgba(4,2,10,0.9)' : 'rgba(6,4,14,0.32)'; c.fillRect(0, 0, UI.W, UI.H);
    c.globalCompositeOperation = 'destination-out';
    const cut = (x, y, r, flicker) => {
      const g = c.createRadialGradient(x, y, 0, x, y, r); if (!g || !g.addColorStop) return;
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    };
    cut(this.player.x + 8 - this.camX, this.player.y + 10 - this.camY, dark ? 76 : 120);
    for (const t of this.map.torches()) { const sx = t.x - this.camX, sy = t.y - this.camY; if (sx < -60 || sy < -60 || sx > UI.W + 60 || sy > UI.H + 60) continue; cut(sx, sy + 4, (dark ? 44 : 52) + Math.sin(this.t / 5 + t.x) * 3); }
    c.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.lightCv, 0, 0);
    // warm glow on torches
    for (const t of this.map.torches()) { const sx = t.x - this.camX, sy = t.y - this.camY; if (sx < -20 || sy < -20 || sx > UI.W + 20 || sy > UI.H + 20) continue; ctx.fillStyle = 'rgba(255,180,60,' + (0.10 + Math.sin(this.t / 6 + t.x) * 0.03) + ')'; ctx.fillRect(sx - 14, sy - 8, 28, 24); }
  }
  draw(ctx) {
    ctx.fillStyle = this.map.theme.bg; ctx.fillRect(0, 0, UI.W, UI.H);
    this.map.draw(ctx, this.camX, this.camY, this.t, this.fs);
    const sorted = this.ents.slice().sort((a, b) => (a.y - b.y) || (a.kind === 'player' ? 1 : 0));
    for (const e of sorted) {
      const sx = e.x - this.camX, sy = e.y - this.camY;
      if (sx < -16 || sy < -16 || sx > UI.W || sy > UI.H) continue;
      if (e.kind === 'enemy' || e.kind === 'boss' || e.kind === 'subboss') {
        const bob = e.kind === 'enemy' ? Math.round(Math.sin(this.t / 8 + e.x) * 1) : 0;
        if (e.kind === 'boss') { ctx.fillStyle = 'rgba(255,60,60,0.25)'; ctx.fillRect(sx - 2, sy - 2, 20, 20); }
        if (e.kind === 'subboss') { ctx.fillStyle = 'rgba(255,200,60,0.22)'; ctx.fillRect(sx - 2, sy - 2, 20, 20); }
        this.shadow(ctx, sx, sy);
        Sprites.draw(ctx, e.sprite, sx, sy + bob, { flip: e.flip, pal: e.pal });
        if (e.kind === 'enemy' && e.level + 6 <= G.hero.level && (this.t >> 3) % 3 === 0) UI.worldText(ctx, '!', sx + 6, sy - 9, '#8f8');
        continue;
      }
      const dir = e.dir || 'down';
      const walking = e.moving || (e.kind === 'follower' && this.player.moving);
      const animT = (e.kind === 'player' || e.kind === 'follower') ? this.player.anim : this.t;
      const frame = walking ? Math.floor(animT / 6) % 4 : 0;
      const [name, flip] = Sprites.facing(e.base, dir, frame);
      const bob = walking && (frame & 1) ? -1 : 0;
      this.shadow(ctx, sx, sy);
      const jolt = e.scuffle > 0 ? ((e.scuffle & 2) ? 2 : -2) : 0;
      Sprites.draw(ctx, name, sx + jolt, sy + bob, { pal: e.pal, flip });
      if (e.kind === 'crawler') {
        const disp = G.disposition(e.id);
        ctx.fillStyle = disp === 'hostile' ? '#ff4040' : disp === 'wary' ? '#ffd040' : '#40ff80';
        ctx.fillRect(sx + 6, sy - 5, 4, 3);
        if (e.ambusher) UI.worldText(ctx, '!!', sx + 2, sy - 14, '#ff4040');
      }
    }
    this.drawLighting(ctx);
    this.drawVignette(ctx);
    for (const f of this.floaters) { ctx.globalAlpha = Math.min(1, f.t / 20); UI.worldText(ctx, f.text, f.x - this.camX, f.y - this.camY - (90 - f.t) * 0.2, f.color, true); ctx.globalAlpha = 1; }
    if (this.flashT > 0) {
      const k = this.flashT;
      ctx.fillStyle = (k & 2) ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, UI.W, UI.H);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { const r = (28 - k) * 8 + i * 30; ctx.beginPath(); ctx.arc(UI.W / 2, 112, r, 0, Math.PI * 2); ctx.stroke(); }
    }
    this.drawHUD(ctx);
  }
  drawHUD(ctx) {
    if (this.banner > 0) {
      const a = Math.min(1, this.banner / 30);
      const mods = this.isFloor ? this.floorData.modifiers.map(m => FLOOR_MODIFIERS[m].name) : [];
      let title = this.floorData.name + (mods.length ? '  [' + mods.join(', ') + ']' : '');
      while (UI.width(ctx, title) > UI.W - 96 && title.length > 4) title = title.slice(0, -1);
      ctx.globalAlpha = a; UI.labelBox(ctx, title, 8, 8, { color: UI.COLORS.sys }); ctx.globalAlpha = 1;
    }
    if (this.isFloor && this.fs.timeLeft != null) {
      const s = Math.ceil(this.fs.timeLeft / 60); const mm = Math.floor(s / 60), ss = s % 60;
      const txt = mm + ':' + (ss < 10 ? '0' : '') + ss; const low = this.fs.timeLeft < 7200;
      UI.labelBox(ctx, txt, UI.W - 8, 8, { right: true, minW: 56, border: low && (this.t >> 4) & 1 ? '#ff4040' : '#fff', color: low ? '#ff6060' : '#fff' });
      const v = G.viewers >= 1000 ? (G.viewers / 1000).toFixed(1) + 'k' : String(G.viewers);
      UI.labelBox(ctx, 'V ' + v, UI.W - 8, 28, { right: true, minW: 56, color: '#c0c0ff' });
    }
    // Compact party HP (top-left) so you never walk into a fight blind — keeps clear of touch controls.
    const ms = G.party.members; const stripH = 4 + ms.length * 11;
    const stripY = 28;
    UI.window(ctx, 4, stripY, 78, stripH, { fill: 'rgba(10,10,20,0.82)' });
    ms.forEach((m, i) => {
      const y = stripY + 3 + i * 11;
      const hp = Math.max(0, Math.ceil(m.hpDisplay != null ? m.hpDisplay : m.hp));
      const low = !m.alive || hp <= m.maxhp * 0.25;
      const name = (m.name || '?').slice(0, 5);
      UI.text(ctx, name, 8, y, m.alive ? '#fff' : UI.COLORS.bad);
      UI.text(ctx, String(hp), 78 - 4 - UI.width(ctx, String(hp)), y, low ? '#ff8080' : '#c0c0ff');
    });
  }
}
