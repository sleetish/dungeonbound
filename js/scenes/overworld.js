// ---- Overworld exploration ----------------------------------------------------------------
class OverworldScene {
  constructor() {
    this.map = null; this.ents = []; this.player = null; this.followers = []; this.history = [];
    this.camX = 0; this.camY = 0; this.t = 0; this.banner = 200; this.pending = null; this.flashT = 0;
    this.stairsWarned = false; this.pendingAction = null;
  }
  enter() {
    const fd = getFloorData(G.floor); this.floorData = fd; this.map = new GameMap(fd);
    const fs = G.floorState(); this.fs = fs;
    const firstVisit = !fs.visited; fs.visited = true;
    this.ents = [];
    const heroActor = G.hero;
    this.player = { kind: 'player', x: this.map.start.x * TILE, y: this.map.start.y * TILE, dir: 'down', base: heroActor.sprite, pal: heroActor.pal, moving: false, cooldown: 0, anim: 0 };
    this.ents.push(this.player);
    this.rebuildFollowers();
    // enemies
    this.map.enemySpots.forEach((s, idx) => {
      if (fs.enemies[idx]) return;
      const pool = fd.pool === 'all' ? [].concat(ENEMY_POOLS[1], ENEMY_POOLS[2], ENEMY_POOLS[3]) : ENEMY_POOLS[fd.pool];
      const key = fd.pool === 'all' ? U.choice(pool.slice(Math.max(0, pool.length - 8))) : U.choice(pool);
      const proto = G.makeEnemy(key, G.floor);
      this.ents.push({ kind: 'enemy', x: s.x * TILE, y: s.y * TILE, key, idx, level: proto.level, sprite: proto.sprite, fx: 0, fy: 1, timer: 0, speed: 0.6, cooldown: 0, flip: false, home: { x: s.x * TILE, y: s.y * TILE } });
    });
    if (fd.boss && !fs.bossDefeated && this.map.bossSpot) {
      const proto = G.makeEnemy(fd.boss, G.floor);
      this.ents.push({ kind: 'boss', x: this.map.bossSpot.x * TILE, y: this.map.bossSpot.y * TILE, key: fd.boss, sprite: proto.sprite, level: proto.level, fx: 0, fy: 1, cooldown: 0 });
    }
    this.map.npcSpots.forEach((s, i) => { const d = (fd.npcs || [])[i]; if (d) this.ents.push({ kind: 'npc', x: s.x * TILE, y: s.y * TILE, dir: 'down', base: 'human', pal: d.pal, data: d }); });
    // crawlers on this floor
    const here = Object.keys(G.crawlers).filter(id => G.crawlers[id].status === 'active' && G.crawlers[id].floor === G.floor);
    here.forEach((id, i) => {
      let spot = this.map.crawlerSpots[i];
      if (!spot) spot = this.map.enemySpots.length ? U.choice(this.map.enemySpots) : this.map.start;
      const saved = fs.crawlerPos[id];
      this.ents.push({ kind: 'crawler', id, x: saved ? saved.x : spot.x * TILE, y: saved ? saved.y : spot.y * TILE, dir: 'down', base: 'human', pal: CRAWLERS[id].pal, timer: 0, fx: 0, fy: 1, cooldown: 0, speed: 0.5 });
    });
    this.updateCamera(); this.banner = 200; this.t = 0;
    Sound.play(fd.music || 'overworld');
    if (G.floor === 1 && !G.flags.intro) Game.push(new DialogScene(INTRO_SCRIPT));
    else if (firstVisit) {
      if (G.floor === 2) G.unlock('floor2'); if (G.floor === 3) G.unlock('floor3'); if (G.floor === 4) G.unlock('floor4');
      if (G.floor >= 4 && !G.flags.beyond) { G.flags.beyond = true; sayLines([{ text: 'Congratulations. You have exhausted the scripted content. From here, the Dungeon improvises. So should you.', speaker: 'SYSTEM', color: UI.COLORS.sys }]); }
    }
  }
  resume() { Sound.play(this.floorData.music || 'overworld'); this.rebuildFollowers(); this.pruneCrawlers(); }
  rebuildFollowers() {
    this.ents = this.ents.filter(e => e.kind !== 'follower'); this.followers = [];
    G.party.members.slice(1).forEach((m, i) => {
      const f = { kind: 'follower', actor: m, x: this.player.x, y: this.player.y, dir: this.player.dir, base: m.sprite, pal: m.pal, index: i };
      this.followers.push(f); this.ents.push(f);
    });
  }
  pruneCrawlers() { this.ents = this.ents.filter(e => e.kind !== 'crawler' || G.crawlers[e.id].status === 'active'); }
  spawnCrawlerNearPlayer(id) {
    if (this.ents.some(e => e.kind === 'crawler' && e.id === id)) return;
    this.ents.push({ kind: 'crawler', id, x: this.player.x + 20, y: this.player.y, dir: 'down', base: 'human', pal: CRAWLERS[id].pal, timer: 30, fx: 0, fy: 1, cooldown: 120, speed: 0.5 });
  }
  // ---- helpers ----
  feet(e) { return { x: e.x + 3, y: e.y + 8, w: 10, h: 8 }; }
  box(e) { return { x: e.x + 2, y: e.y + 3, w: 12, h: 13 }; }
  overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  blocked(e, nx, ny) {
    const f = { x: nx + 3, y: ny + 8, w: 10, h: 8 };
    if (this.map.solidRect(f.x, f.y, f.w, f.h)) return true;
    for (const o of this.ents) {
      if (o === e || o.kind === 'follower' || o.kind === 'player') continue;
      if (e.kind === 'player') { if (o.kind === 'enemy' || o.kind === 'boss') continue; if (o.kind === 'crawler' && G.disposition(o.id) === 'hostile') continue; }
      else if (e.kind === 'enemy' || e.kind === 'crawler') { if (o.kind !== 'npc' && o.kind !== 'boss' && o.kind !== 'crawler' && o.kind !== 'enemy') continue; }
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
  // ---- update ----
  update() {
    this.t++; G.playtime++; if (this.t % 60 === 0) G.tickScores();
    if (this.banner > 0) this.banner--;
    if (this.flashT > 0) { this.flashT--; if (this.flashT === 0 && this.pending) { const p = this.pending; this.pending = null; Game.push(new BattleScene(p)); } return; }
    if (Input.justPressed('menu')) { Game.push(new MenuScene()); return; }
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
    this.checkStairs();
    if (Input.justPressed('confirm')) this.interact();
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
    else if (!weak && d < 88 && e.cooldown === 0) { const k = 0.7 / Math.max(1, d); vx = (p.x - e.x) * k; vy = (p.y - e.y) * k; }
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
    const p = this.player; const d = U.dist(e.x, e.y, p.x, p.y); const disp = G.disposition(e.id);
    let vx = 0, vy = 0;
    if (disp === 'hostile' && d < 110 && e.cooldown === 0) { const k = 0.85 / Math.max(1, d); vx = (p.x - e.x) * k; vy = (p.y - e.y) * k; }
    else if (d > 28) {
      if (--e.timer <= 0) { e.timer = U.rand(40, 120); if (U.chance(0.5)) { const a = Math.random() * Math.PI * 2; e.vx = Math.cos(a) * e.speed; e.vy = Math.sin(a) * e.speed; } else { e.vx = 0; e.vy = 0; } }
      vx = e.vx || 0; vy = e.vy || 0;
    }
    if (vx || vy) { if (!this.tryMove(e, vx, vy)) e.timer = 0; e.dir = this.dirFromVec(vx, vy); e.moving = true; const l = Math.sqrt(vx * vx + vy * vy) || 1; e.fx = vx / l; e.fy = vy / l; }
    else { e.moving = false; if (d < 40) e.dir = this.dirFromVec(p.x - e.x, p.y - e.y); }
    G.floorState().crawlerPos[e.id] = { x: e.x, y: e.y };
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
      if (e.kind === 'enemy' && this.overlap(pb, this.box(e))) { this.encounter(e); return; }
      if (e.kind === 'boss' && this.overlap(pb, this.box(e))) { this.bossEncounter(e); return; }
      if (e.kind === 'crawler' && G.disposition(e.id) === 'hostile' && this.overlap(pb, this.box(e))) { this.crawlerBattle(e, 'enemy', true); return; }
    }
  }
  initiativeFor(e) {
    const p = this.player; const [pdx, pdy] = this.dirVec(p.dir);
    const toP = [p.x - e.x, p.y - e.y]; const len = Math.hypot(toP[0], toP[1]) || 1; toP[0] /= len; toP[1] /= len;
    const enemyFacing = (e.fx || 0) * toP[0] + (e.fy || 1) * toP[1]; // >0: enemy faces player
    const playerFacing = pdx * -toP[0] + pdy * -toP[1];              // >0: player faces enemy
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
      // instant win (EarthBound style)
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
  removeGroup(group) { for (const g of group) { if (g.idx != null) this.fs.enemies[g.idx] = true; const i = this.ents.indexOf(g); if (i >= 0) this.ents.splice(i, 1); } }
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
    const self = this;
    e.cooldown = 120; this.player.cooldown = 120;
    Game.push(new DialogScene(function* (d) {
      yield d.sys('Warning: a Floor Boss is present. Viewership is spiking. Please die interestingly.');
      yield d.say(proto.intro || 'The boss looms.');
      self.startBattle({ enemies: [proto], initiative: null, boss: true, onEnd: res => {
        if (res === 'win') {
          self.fs.bossDefeated = true; const i = self.ents.indexOf(e); if (i >= 0) self.ents.splice(i, 1);
          G.unlock(G.floor === 1 ? 'boss1' : G.floor === 2 ? 'boss2' : G.floor === 3 ? 'boss3' : 'boss3');
          sayLines([{ text: 'Floor Boss defeated. The stairs have been unsealed. Please proceed to your next humiliation.', speaker: 'SYSTEM', color: UI.COLORS.sys }]);
        }
      } });
    }));
  }
  crawlerBattle(e, initiative, ambush) {
    const enemy = G.makeCrawlerEnemy(e.id); const self = this;
    e.cooldown = 120; this.player.cooldown = 120;
    const go = () => self.startBattle({ enemies: [enemy], initiative, boss: false, onEnd: res => {
      if (res === 'win' || res === 'recruit') { const i = self.ents.indexOf(e); if (i >= 0) self.ents.splice(i, 1); }
      if (res === 'win') G.kills++;
    } });
    if (ambush) Game.push(new DialogScene(function* (d) { yield d.who(CRAWLERS[e.id].name, CRAWLERS[e.id].lines.hostile); go(); }));
    else go();
  }
  // ---- interaction ----
  interact() {
    const p = this.player; const [dx, dy] = this.dirVec(p.dir);
    const fx = p.x + 8 + dx * 14, fy = p.y + 12 + dy * 12;
    const tx = Math.floor(fx / TILE), ty = Math.floor(fy / TILE);
    const obj = this.map.object(tx, ty);
    if (obj) { this.useObject(obj); return; }
    for (const e of this.ents) {
      if (e === p || e.kind === 'follower') continue;
      const b = this.box(e);
      if (fx >= b.x && fx < b.x + b.w && fy >= b.y && fy < b.y + b.h) {
        if (e.kind === 'npc') { e.dir = this.dirFromVec(-dx, -dy); sayLines(e.data.lines, { speaker: e.data.name }); return; }
        if (e.kind === 'crawler') { e.dir = this.dirFromVec(-dx, -dy); this.talkToCrawler(e); return; }
        if (e.kind === 'boss') { this.bossEncounter(e); return; }
      }
    }
  }
  useObject(obj) {
    const self = this;
    if (obj.type === 'chest') {
      if (this.fs.chests[obj.idx]) { sayLines(['The chest is empty. Someone got here first. Probably you.']); return; }
      const it = ITEMS[obj.item];
      if (!G.party.addItem(obj.item)) { sayLines(['There\'s a ' + it.name + ' inside, but your pockets are full.']); return; }
      this.fs.chests[obj.idx] = true; Sound.sfx('item'); G.unlock('chest');
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
    } else if (obj.type === 'shop') {
      Game.push(new ShopScene(this.floorData.shop));
    } else if (obj.type === 'stairs') {
      this.checkStairs(true);
    }
  }
  checkStairs(force) {
    const s = this.map.stairs; if (!s || this.pending) return;
    const f = this.feet(this.player);
    const on = this.overlap(f, { x: s.x * TILE + 2, y: s.y * TILE + 2, w: 12, h: 12 });
    if (!on && !force) { this.stairsWarned = false; return; }
    const locked = this.floorData.boss && !this.fs.bossDefeated;
    if (locked) {
      if (!this.stairsWarned) { this.stairsWarned = true; sayLines([{ text: 'The stairs are sealed. Defeat the Floor Boss to descend. The boss is somewhere on this floor. Probably near here. We\'re not subtle.', speaker: 'SYSTEM', color: UI.COLORS.sys }]); }
      return;
    }
    if (this.stairsWarned) return;
    this.stairsWarned = true; const self = this;
    Game.push(new DialogScene(function* (d) {
      yield d.sys('Stairs to Floor ' + (G.floor + 1) + '. Descend? Once you go down, this floor is gone.');
      yield d.choice(['Descend', 'Not yet']);
      if (d.result === 'Descend') self.descend();
    }, { onDone: () => { self.stairsWarned = true; } }));
  }
  descend() {
    Sound.sfx('stairs');
    const hadCrawlers = Object.keys(G.crawlers).some(id => G.crawlers[id].floor === G.floor && G.crawlers[id].status !== 'party');
    if (hadCrawlers && !G.pkThisFloor) G.unlock('pacifist');
    G.pkThisFloor = false;
    G.floor++; G.deepest = Math.max(G.deepest, G.floor); G.score += 100;
    G.advanceCrawlers(G.floor);
    G.save();
    Game.transition(() => Game.replace(new OverworldScene()));
  }
  talkToCrawler(e) {
    const id = e.id, c = CRAWLERS[id], st = G.crawlers[id], self = this;
    const disp = G.disposition(id);
    if (disp === 'hostile') { this.crawlerBattle(e, null, true); return; }
    Game.push(new DialogScene(function* (d) {
      yield d.who(c.name, st.met ? c.lines[disp] : c.lines.greet); st.met = true;
      while (true) {
        yield d.choice([{ label: 'Team up', value: 'team' }, { label: 'Give item', value: 'gift' }, { label: 'Challenge', value: 'fight' }, { label: 'Leave', value: 'leave' }], { title: c.name + ' (' + CLASSES[c.cls].name + ' L' + st.level + ')' });
        const r = d.result;
        if (!r || r === 'leave') { yield d.who(c.name, disp === 'friendly' ? 'See you around. Don\'t die.' : 'Yeah. Move along.'); return; }
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
  draw(ctx) {
    ctx.fillStyle = this.map.theme.bg; ctx.fillRect(0, 0, UI.W, UI.H);
    this.map.draw(ctx, this.camX, this.camY, this.t, this.fs);
    const sorted = this.ents.slice().sort((a, b) => (a.y - b.y) || (a.kind === 'player' ? 1 : 0));
    for (const e of sorted) {
      const sx = e.x - this.camX, sy = e.y - this.camY;
      if (sx < -16 || sy < -16 || sx > UI.W || sy > UI.H) continue;
      if (e.kind === 'enemy' || e.kind === 'boss') {
        const bob = e.kind === 'boss' ? 0 : Math.round(Math.sin(this.t / 8 + e.x) * 1);
        if (e.kind === 'boss') { ctx.fillStyle = 'rgba(255,60,60,0.25)'; ctx.fillRect(sx - 2, sy - 2, 20, 20); }
        this.shadow(ctx, sx, sy);
        Sprites.draw(ctx, e.sprite, sx, sy + bob, { flip: e.flip });
        if (e.kind === 'enemy' && e.level + 6 <= G.hero.level && (this.t >> 3) % 3 === 0) UI.text(ctx, '!', sx + 6, sy - 9, '#8f8');
        continue;
      }
      const dir = e.dir || 'down';
      const walking = e.moving || (e.kind === 'follower' && this.player.moving);
      const animT = (e.kind === 'player' || e.kind === 'follower') ? this.player.anim : this.t;
      const frame = walking ? Math.floor(animT / 6) % 4 : 0;
      const [name, flip] = Sprites.facing(e.base, dir, frame);
      const bob = walking && (frame & 1) ? -1 : 0;
      this.shadow(ctx, sx, sy);
      Sprites.draw(ctx, name, sx, sy + bob, { pal: e.pal, flip });
      if (e.kind === 'crawler') {
        const disp = G.disposition(e.id);
        ctx.fillStyle = disp === 'hostile' ? '#ff4040' : disp === 'wary' ? '#ffd040' : '#40ff80';
        ctx.fillRect(sx + 6, sy - 5, 4, 3);
      }
    }
    this.drawVignette(ctx);
    if (this.flashT > 0) {
      const k = this.flashT;
      ctx.fillStyle = (k & 2) ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, UI.W, UI.H);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { const r = (28 - k) * 8 + i * 30; ctx.beginPath(); ctx.arc(UI.W / 2, 112, r, 0, Math.PI * 2); ctx.stroke(); }
    }
    if (this.banner > 0) {
      const a = Math.min(1, this.banner / 30);
      ctx.globalAlpha = a; UI.window(ctx, 8, 8, UI.width(ctx, this.floorData.name) + 16, 18); UI.text(ctx, this.floorData.name, 16, 13, UI.COLORS.sys); ctx.globalAlpha = 1;
    }
  }
}
