// ---- Tile map: parsing, collision, themed rendering ---------------------------------
const TILE = 16;
const THEMES = {
  lobby: { floor: '#5c5c78', floor2: '#545470', floorHi: '#666684', wallTop: '#4a4a6c', wallHi: '#5e5e84', wallFace: '#2a2a44', wallLine: '#1a1a30', water: ['#2a4a8a', '#33559a', '#4a6ab0'], pillar: '#8a8aa8', pillarHi: '#b0b0cc', rubble: '#6a6a80', bg: '#101018' },
  sewer: { floor: '#4c6250', floor2: '#455a49', floorHi: '#566c5a', wallTop: '#3a5a40', wallHi: '#4c7052', wallFace: '#203424', wallLine: '#142016', water: ['#3a6a3a', '#447a44', '#5a9a5a'], pillar: '#7a9a80', pillarHi: '#a0c0a4', rubble: '#5a6a5a', bg: '#0c140c' },
  arena: { floor: '#8a7a56', floor2: '#82724e', floorHi: '#968662', wallTop: '#6a5a40', wallHi: '#84704e', wallFace: '#463826', wallLine: '#2e2416', water: ['#8a2a2a', '#9a3333', '#b04444'], pillar: '#c0b090', pillarHi: '#e0d0b0', rubble: '#7a6a50', bg: '#181008' },
  void: { floor: '#2c2c44', floor2: '#28283e', floorHi: '#343450', wallTop: '#5a3a7a', wallHi: '#744e94', wallFace: '#341c4c', wallLine: '#1e1030', water: ['#6a2a8a', '#7a3a9a', '#9a5aba'], pillar: '#8a6aaa', pillarHi: '#b090d0', rubble: '#4a3a5a', bg: '#08040c' },
};

class GameMap {
  constructor(floorData) {
    this.data = floorData; this.theme = THEMES[floorData.theme] || THEMES.lobby;
    this.h = floorData.map.length; this.w = floorData.map[0].length;
    this.tiles = []; this.objects = {}; this.chests = []; this.npcSpots = []; this.crawlerSpots = []; this.enemySpots = [];
    this.start = { x: 2, y: 2 }; this.bossSpot = null; this.stairs = null;
    let chestIdx = 0;
    for (let y = 0; y < this.h; y++) {
      const row = [];
      for (let x = 0; x < this.w; x++) {
        let ch = floorData.map[y][x] || '#'; let tile = ch;
        switch (ch) {
          case 'P': this.start = { x, y }; tile = '.'; break;
          case 'S': this.stairs = { x, y }; this.objects[x + ',' + y] = { type: 'stairs', x, y }; tile = '.'; break;
          case 'B': this.bossSpot = { x, y }; tile = '.'; break;
          case 'T': this.objects[x + ',' + y] = { type: 'terminal', x, y }; tile = '.'; break;
          case '$': this.objects[x + ',' + y] = { type: 'shop', x, y }; tile = '.'; break;
          case '+': this.objects[x + ',' + y] = { type: 'pod', x, y }; tile = '.'; break;
          case 'C': { const idx = chestIdx++; const item = (floorData.chests || [])[idx] || 'ration'; this.objects[x + ',' + y] = { type: 'chest', x, y, idx, item }; this.chests.push(this.objects[x + ',' + y]); tile = '.'; break; }
          case '@': this.npcSpots.push({ x, y }); tile = '.'; break;
          case '!': this.crawlerSpots.push({ x, y }); tile = '.'; break;
          case 'e': this.enemySpots.push({ x, y }); tile = '.'; break;
          case '#': case '.': case ',': case '~': case 'X': case '%': break;
          default: tile = '.';
        }
        row.push(tile);
      }
      this.tiles.push(row);
    }
    this.tileset = null; this.frame = 0;
  }
  tile(tx, ty) { if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return '#'; return this.tiles[ty][tx]; }
  object(tx, ty) { return this.objects[tx + ',' + ty] || null; }
  solidTile(tx, ty) {
    const t = this.tile(tx, ty);
    if (t === '#' || t === '~' || t === 'X' || t === '%') return true;
    const o = this.object(tx, ty);
    return !!(o && o.type !== 'stairs');
  }
  // pixel-rect collision against solid tiles
  solidRect(x, y, w, h) {
    const x0 = Math.floor(x / TILE), y0 = Math.floor(y / TILE), x1 = Math.floor((x + w - 1) / TILE), y1 = Math.floor((y + h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solidTile(tx, ty)) return true;
    return false;
  }
  get pixelW() { return this.w * TILE; }
  get pixelH() { return this.h * TILE; }
  // Tileset indices: 0 floor, 1 floor decor, 2 floor variant, 3 wall (top face), 4 wall (front face),
  // 5..7 water frames, 8 pillar, 9 rubble, 10 dark
  buildTileset() {
    const t = this.theme;
    const cv = document.createElement('canvas'); cv.width = TILE * 11; cv.height = TILE; const c = cv.getContext('2d');
    const rect = (i, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(i * TILE + x, y, w, h); };
    // 0 floor: flagstones with a light seam
    rect(0, t.floor, 0, 0, 16, 16); rect(0, t.floor2, 0, 7, 16, 1); rect(0, t.floor2, 7, 0, 1, 8); rect(0, t.floor2, 11, 8, 1, 8); rect(0, t.floorHi, 1, 1, 5, 1); rect(0, t.floorHi, 9, 9, 2, 1);
    // 1 floor decor: cracked stone
    rect(1, t.floor, 0, 0, 16, 16); rect(1, t.floor2, 0, 7, 16, 1); rect(1, t.floor2, 7, 0, 1, 8); rect(1, t.wallLine, 3, 2, 1, 3); rect(1, t.wallLine, 4, 4, 2, 1); rect(1, t.wallLine, 10, 10, 3, 1); rect(1, t.wallLine, 12, 11, 1, 3); rect(1, t.floor2, 12, 3, 2, 2);
    // 2 floor variant: worn
    rect(2, t.floor2, 0, 0, 16, 16); rect(2, t.floor, 1, 1, 6, 6); rect(2, t.floor, 8, 8, 8, 8); rect(2, t.floorHi, 2, 2, 3, 1); rect(2, t.floor, 9, 1, 6, 6); rect(2, t.floor, 1, 9, 6, 6);
    // 3 wall top face: capstone
    rect(3, t.wallTop, 0, 0, 16, 16); rect(3, t.wallHi, 0, 0, 16, 2); rect(3, t.wallHi, 0, 0, 2, 16); rect(3, t.wallLine, 0, 15, 16, 1); rect(3, t.wallLine, 15, 0, 1, 16); rect(3, t.wallLine, 8, 4, 1, 8); rect(3, t.wallLine, 4, 8, 8, 1);
    // 4 wall front face: bricks with mortar and a lit top edge
    rect(4, t.wallFace, 0, 0, 16, 16); rect(4, t.wallHi, 0, 0, 16, 1);
    for (let y = 1; y < 16; y += 5) { rect(4, t.wallLine, 0, y + 4, 16, 1); }
    rect(4, t.wallLine, 5, 1, 1, 4); rect(4, t.wallLine, 11, 1, 1, 4); rect(4, t.wallLine, 2, 6, 1, 4); rect(4, t.wallLine, 8, 6, 1, 4); rect(4, t.wallLine, 14, 6, 1, 4); rect(4, t.wallLine, 5, 11, 1, 4); rect(4, t.wallLine, 11, 11, 1, 4);
    rect(4, t.wallTop, 1, 1, 4, 1); rect(4, t.wallTop, 7, 1, 4, 1); rect(4, t.wallTop, 3, 6, 5, 1); rect(4, t.wallTop, 9, 6, 5, 1); rect(4, t.wallTop, 1, 11, 4, 1); rect(4, t.wallTop, 7, 11, 4, 1);
    // 5..7 water frames with drifting highlights
    for (let f = 0; f < 3; f++) {
      rect(5 + f, t.water[0], 0, 0, 16, 16); rect(5 + f, t.water[1], 0, 0, 16, 1);
      rect(5 + f, t.water[1], (2 + f * 4) % 16, 3, 5, 1); rect(5 + f, t.water[2], (3 + f * 4) % 16, 3, 2, 1);
      rect(5 + f, t.water[1], (9 - f * 4 + 16) % 16, 9, 6, 1); rect(5 + f, t.water[2], (11 - f * 4 + 16) % 16, 9, 2, 1);
      rect(5 + f, t.water[1], (5 + f * 2) % 16, 13, 4, 1);
    }
    // 8 pillar: shaded column with a capital
    rect(8, t.floor, 0, 0, 16, 16); rect(8, t.wallLine, 3, 14, 10, 2); rect(8, t.pillar, 4, 1, 8, 13); rect(8, t.pillarHi, 5, 1, 2, 13); rect(8, t.wallLine, 10, 2, 2, 12); rect(8, t.pillarHi, 2, 0, 12, 2); rect(8, t.pillar, 3, 2, 10, 1);
    // 9 rubble
    rect(9, t.floor, 0, 0, 16, 16); rect(9, t.rubble, 2, 8, 5, 5); rect(9, t.rubble, 8, 4, 6, 6); rect(9, t.wallLine, 4, 10, 2, 2); rect(9, t.wallLine, 10, 6, 2, 2); rect(9, t.rubble, 5, 13, 8, 2); rect(9, t.pillarHi, 9, 4, 3, 1); rect(9, t.pillarHi, 2, 8, 2, 1);
    // 10 dark
    rect(10, t.bg, 0, 0, 16, 16);
    this.tileset = cv;
  }
  tileIndex(ch, tx, ty, frame) {
    switch (ch) {
      case '.': return ((tx * 31 + ty * 17) % 11 === 0) ? 2 : 0;
      case ',': return 1;
      case '#': return this.tile(tx, ty + 1) === '#' || ty + 1 >= this.h ? 3 : 4; // front face only where floor lies below
      case '~': return 5 + (Math.floor(frame / 24) % 3);
      case 'X': return 8; case '%': return 9; default: return 10;
    }
  }
  draw(ctx, camX, camY, frame, floorState) {
    if (!this.tileset) this.buildTileset();
    const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
    const x1 = x0 + Math.ceil(UI.W / TILE) + 1, y1 = y0 + Math.ceil(UI.H / TILE) + 1;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const ch = this.tile(tx, ty); const idx = (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) ? 10 : this.tileIndex(ch, tx, ty, frame);
      ctx.drawImage(this.tileset, idx * TILE, 0, TILE, TILE, tx * TILE - camX, ty * TILE - camY, TILE, TILE);
    }
    // contact shadows: floor tiles just below a wall, and to the right of a wall
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const ch = this.tile(tx, ty); if (ch === '#') continue;
      if (this.tile(tx, ty - 1) === '#') ctx.fillRect(tx * TILE - camX, ty * TILE - camY, TILE, 4);
      if (this.tile(tx - 1, ty) === '#') ctx.fillRect(tx * TILE - camX, ty * TILE - camY, 2, TILE);
    }
    for (const key in this.objects) {
      const o = this.objects[key]; const px = o.x * TILE - camX, py = o.y * TILE - camY;
      if (px < -16 || py < -16 || px > UI.W || py > UI.H) continue;
      let name = o.type;
      if (o.type === 'chest') name = (floorState && floorState.chests[o.idx]) ? 'chest_open' : 'chest';
      if (o.type === 'stairs') name = (this.data.boss && !(floorState && floorState.bossDefeated)) ? 'stairs_locked' : 'stairs';
      Sprites.draw(ctx, name, px, py, { outline: o.type !== 'stairs' });
    }
  }
}
