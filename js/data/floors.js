// ---- Floors -----------------------------------------------------------------------
// Every floor is generated from a seed by a sector generator: three gated sections left to
// right, sub-bosses guarding the gates, the boss and stairs in the last section, and two
// neutral safe zones at the far left and far right edges.
//
// Map legend:
//  #  wall      .  floor     ,  floor (decor)   ~  water/acid   X  pillar   %  rubble
//  S  stairs    T  terminal  $  shop            +  med pod      C  chest (in reading order)
//  P  start     B  boss      b  sub-boss        G  gate         @  npc (in order)
//  !  crawler   e  enemy spawn                  Z  neutral safe zone floor
//  H  safe-room door  K  Hell's Kitchen door    M  Mercy Lounge door   E  exit (interiors)
//  W  stash     Q  crafting bench (placeholder) D  bed
//  decor: c crate (solid)  v vending machine (solid)  t torch (wall)  r drain  n banner  a sand
const FLOORS = [
  {
    name: 'Floor 1: The Lobby', pool: 1, boss: 'ratking', theme: 'lobby', seed: 101, safeDoors: 5,
    crawlers: ['mira', 'tony', 'bea', 'jax'],
    chestPool: ['pipe', 'cigar', 'box_bronze', 'fizz', 'ration', 'vest', 'jerky', 'treat'],
    shop: ['ration', 'jerky', 'fizz', 'antitox', 'salts', 'treat', 'pipe', 'vest'],
    npcs: [
      { name: 'Dazed Survivor', pal: { 1: '#8080c0', 2: '#c0a060', 3: '#404040' },
        lines: ['I was buying a lottery ticket. Then the sky went away. Then I was HERE.', 'The voice said this is a game show. Touching monsters starts a "battle". Hit them from BEHIND for a free turn.', 'There are five doors on this floor with a face on them. Managers. Pick one and they stick with you. Choose carefully, they say.'] },
      { name: 'Nervous Intern', pal: { 1: '#c0c0c0', 2: '#402020', 3: '#303030' },
        lines: ['The gates only open when you beat the thing guarding them. Sub-bosses, the voice calls them.', 'The zones at the far left and far right edges are "neutral". Nobody can hurt you there. Anybody who tries gets flung to the middle of the map.'] },
    ],
  },
  {
    name: 'Floor 2: The Wet Market', pool: 2, boss: 'steward', theme: 'sewer', seed: 202, safeDoors: 1,
    crawlers: ['kestrel', 'okafor', 'grimsby', 'sable', 'brother_hal'],
    chestPool: ['vest', 'comic', 'bracelet', 'teddy', 'grenade', 'box_silver', 'mop', 'defib', 'salts'],
    shop: ['jerky', 'feast', 'fizz', 'brew', 'defib', 'grenade', 'mop', 'bat', 'kevlar', 'bracelet', 'charm'],
    npcs: [
      { name: 'Fish Vendor', pal: { 1: '#4080a0', 2: '#603010', 3: '#303030' },
        lines: ['Fresh fish! Well. Fish. They came up out of the drains with the crabs. I don\'t ask questions.', 'Word of advice: the big quiet guy? Don\'t look him in the eye. He\'s lost something.'] },
      { name: 'Kid With Goggles', pal: { 1: '#f0c040', 2: '#202020', 3: '#a04040' },
        lines: ['The Steward robot won\'t let anyone downstairs without "approval". Nobody knows how to get approval.', 'I think you just have to break it. It calls for drones when it\'s hurt, so bring something that hits everything.'] },
    ],
  },
  {
    name: 'Floor 3: The Colosseum', pool: 3, boss: 'gladiatron', theme: 'arena', seed: 303, safeDoors: 1,
    crawlers: ['lulu', 'hex', 'padre', 'yuki', 'ines', 'dmitri'],
    chestPool: ['battery', 'brew', 'cleaver', 'box_silver', 'earbuds', 'puck', 'feast', 'gutsring', 'charm'],
    shop: ['feast', 'brew', 'defib', 'puck', 'toxcan', 'cleaver', 'nerf', 'taser', 'plate', 'gutsring', 'earbuds', 'mask', 'box_bronze'],
    npcs: [
      { name: 'Announcer Bot', pal: { 1: '#c0c0c0', 2: '#c0c0c0', 3: '#c0c0c0' },
        lines: ['LADIES AND GENTLEMEN AND OTHER! The champion awaits in the final section! Entry is free! Exit is not guaranteed!', 'Sponsored by Blorp. Blorp: it\'s probably food.'] },
      { name: 'Old Crawler', pal: { 1: '#806040', 2: '#e0e0e0', 3: '#604020' },
        lines: ['Been down here since day one. Never went past this floor. Never wanted to.', 'Below three, the lounges open. Hell\'s Kitchen for the killers, the Mercy Lounge for the rest. Most crawlers live there now. Only a few bother with the dungeon.'] },
    ],
  },
];

const FLOOR_MODIFIERS = {
  dark: { name: 'Lights Out', desc: 'The floor is dark. Torches and your own glow are all you get.' },
  bounty: { name: 'Bounty Floor', desc: 'Sponsors doubled the gold on this floor.' },
  crowded: { name: 'Overbooked', desc: 'Far more monsters than usual.' },
  quiet: { name: 'Quiet Hours', desc: 'Fewer monsters, more chests.' },
  toxic: { name: 'Toxic Vents', desc: 'Monsters inflict ailments twice as often.' },
  crawlerfest: { name: 'Crawler Convention', desc: 'More rival crawlers are roaming this floor.' },
};

const SAFE_ROOM_MAP = [
  '##########################',
  '#........................#',
  '#..W....Q......D.........#',
  '#........................#',
  '#...@...............v....#',
  '#........................#',
  '#........c...c...........#',
  '#........................#',
  '#..........X......X......#',
  '#........................#',
  '#........................#',
  '#........................#',
  '#............P...........#',
  '############E#############',
];
const CLUB_MAP = [
  '##################################',
  '#................................#',
  '#..cccccccc......................#',
  '#..c@.....c......!.....!.........#',
  '#..ccc.cccc......................#',
  '#................................#',
  '#....!......cc.......cc..........#',
  '#...........cc.......cc.....!....#',
  '#................................#',
  '#........!.......cc..............#',
  '#................cc........!.....#',
  '#................................#',
  '#...H............................#',
  '#...............P................#',
  '################E#################',
];

// ---- Sector generator ---------------------------------------------------------------
function generateFloor(n) {
  const spec = FLOORS[n - 1] || null;
  const rng = U.seeded(spec ? spec.seed : 1337 + n * 7919);
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const W = 72, H = 44;
  const grid = []; for (let y = 0; y < H; y++) grid.push(new Array(W).fill('#'));
  const theme = spec ? spec.theme : ['lobby', 'sewer', 'arena', 'void'][n % 4];
  // modifiers (generated floors only)
  const modifiers = [];
  if (!spec && rng() < 0.65) modifiers.push(Object.keys(FLOOR_MODIFIERS)[ri(0, Object.keys(FLOOR_MODIFIERS).length - 1)]);
  const has = m => modifiers.includes(m);

  const sectors = [{ x0: 7, x1: 23 }, { x0: 26, x1: 46 }, { x0: 49, x1: 64 }];
  const gateCols = [24, 47];
  const allRooms = [];
  const sectorRooms = sectors.map((sec, si) => {
    const rooms = [];
    const want = si === 1 ? 5 : 4;
    for (let tries = 0; tries < 120 && rooms.length < want; tries++) {
      const w = ri(5, Math.min(10, sec.x1 - sec.x0 - 1)), h = ri(4, 8);
      const x = ri(sec.x0, sec.x1 - w), y = ri(2, H - h - 3);
      if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
      rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2), sector: si });
    }
    rooms.sort((a, b) => a.x - b.x);
    for (const r of rooms) { allRooms.push(r); for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) grid[y][x] = '.'; }
    return rooms;
  });
  const carve = (x, y) => { if (y >= 0 && y < H && x >= 0 && x < W && grid[y][x] === '#') grid[y][x] = '.'; };
  const corridorH = (x0, x1, y) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { carve(x, y); carve(x, y + 1); } };
  const corridorV = (y0, y1, x) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) { carve(x, y); carve(x + 1, y); } };
  const link = (a, b, horizontalFirst) => {
    if (horizontalFirst) { corridorH(a.cx, b.cx, a.cy); corridorV(a.cy, b.cy, b.cx); }
    else { corridorV(a.cy, b.cy, a.cx); corridorH(a.cx, b.cx, b.cy); }
  };
  // intra-sector links
  sectorRooms.forEach(rooms => { for (let i = 1; i < rooms.length; i++) link(rooms[i - 1], rooms[i], rng() < 0.5); });
  // inter-sector links with gates
  const gates = [];
  for (let si = 0; si < 2; si++) {
    const a = sectorRooms[si][sectorRooms[si].length - 1], b = sectorRooms[si + 1][0];
    link(a, b, true);
    const gx = gateCols[si];
    gates.push({ x: gx, y: a.cy, idx: si });
    grid[a.cy][gx] = 'G'; grid[a.cy + 1][gx] = 'G';
    // keep the gate column solid elsewhere so the gate can't be bypassed
    for (let y = 0; y < H; y++) if (y !== a.cy && y !== a.cy + 1 && grid[y][gx] !== '#') grid[y][gx] = '#';
  }
  // neutral safe zones at the far edges, linked to the nearest room
  const zoneY0 = 17, zoneY1 = 27;
  for (let y = zoneY0; y <= zoneY1; y++) { for (let x = 1; x <= 5; x++) grid[y][x] = 'Z'; for (let x = W - 6; x <= W - 2; x++) grid[y][x] = 'Z'; }
  const firstRoom = sectorRooms[0][0], lastRoom = sectorRooms[2][sectorRooms[2].length - 1];
  link({ cx: 5, cy: 22 }, firstRoom, true);
  link(lastRoom, { cx: W - 6, cy: 22 }, true);

  const put = (room, ch, avoidEdge) => {
    for (let t = 0; t < 60; t++) {
      const x = ri(room.x + (avoidEdge ? 1 : 0), room.x + room.w - 1 - (avoidEdge ? 1 : 0)), y = ri(room.y + (avoidEdge ? 1 : 0), room.y + room.h - 1 - (avoidEdge ? 1 : 0));
      if (grid[y][x] === '.') { grid[y][x] = ch; return { x, y }; }
    }
    return null;
  };
  const pick = rooms => rooms[ri(0, rooms.length - 1)];
  // start, terminal, shop, npcs in sector 0
  grid[firstRoom.cy][firstRoom.cx] = 'P';
  put(pick(sectorRooms[0]), 'T'); put(pick(sectorRooms[0]), '$');
  const npcCount = spec ? spec.npcs.length : 0;
  for (let i = 0; i < npcCount; i++) put(pick(sectorRooms[0]), '@');
  // doors: safe rooms (floors 1-3) or clubs (4+)
  if (n <= 3) {
    const count = spec ? spec.safeDoors : 1;
    for (let i = 0; i < count; i++) put(i < 3 ? sectorRooms[0][i % sectorRooms[0].length] : sectorRooms[1][(i - 3) % sectorRooms[1].length], 'H', true);
  } else {
    put(sectorRooms[0][0], 'K', true); put(sectorRooms[0][sectorRooms[0].length - 1], 'M', true);
  }
  // sub-bosses just before each gate, boss + stairs in the last room
  for (let si = 0; si < 2; si++) { const r = sectorRooms[si][sectorRooms[si].length - 1]; put(r, 'b', true); }
  grid[lastRoom.cy][lastRoom.cx] = 'B';
  grid[lastRoom.cy + (lastRoom.cy + 1 < lastRoom.y + lastRoom.h ? 1 : -1)][lastRoom.cx] = 'S';
  put(pick(sectorRooms[1]), '+');
  // chests, enemies, crawlers per sector
  const chestsPerSector = has('quiet') ? 3 : 2;
  let enemiesPerSector = (n === 1 ? 5 : 6) + (has('crowded') ? 2 : 0) - (has('quiet') ? 2 : 0);
  sectorRooms.forEach((rooms, si) => {
    for (let i = 0; i < chestsPerSector; i++) put(pick(rooms), 'C');
    for (let i = 0; i < enemiesPerSector; i++) put(pick(rooms.filter(r => r !== firstRoom)), 'e');
    for (let i = 0; i < (has('crawlerfest') ? 3 : 2); i++) put(pick(rooms), '!');
  });
  // decor
  for (const r of allRooms) {
    if (r.w >= 7 && r.h >= 6 && rng() < 0.6) { const t = rng() < 0.6 ? 'X' : '~'; for (const [dx, dy] of [[2, 2], [r.w - 3, 2], [2, r.h - 3], [r.w - 3, r.h - 3]]) if (grid[r.y + dy][r.x + dx] === '.') grid[r.y + dy][r.x + dx] = t; }
    const decorCount = ri(1, 3);
    for (let i = 0; i < decorCount; i++) {
      const roll = rng();
      const ch = roll < 0.35 ? 'c' : roll < 0.5 ? ',' : theme === 'sewer' ? 'r' : theme === 'arena' ? (rng() < 0.5 ? 'a' : 'n') : theme === 'lobby' ? ',' : '%';
      put(r, ch, true);
    }
  }
  put(pick(sectorRooms[0]), 'v', true);
  // torches on walls that face a floor tile below them
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) if (grid[y][x] === '#' && '.,arnZ'.includes(grid[y + 1][x]) && rng() < (has('dark') ? 0.12 : 0.07)) grid[y][x] = 't';
  // chest contents in reading order
  const pool = (spec ? spec.chestPool : ['jerky', 'feast', 'defib', 'box_bronze', 'box_silver', 'brew', 'grenade', 'puck', 'toxcan', 'gutsring', 'charm', 'kevlar', 'cleaver', 'box_gold', 'vampfang', 'quickblade', 'luckcoin', 'regenband', 'critlens']).slice();
  const chests = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x] === 'C') { if (!pool.length) pool.push('jerky'); chests.push(pool.splice(ri(0, pool.length - 1), 1)[0]); }
  const bosses = ['ratking', 'steward', 'gladiatron'];
  const names = ['The Undercroft', 'The Server Farm', 'The Food Court', 'The Vault', 'The Nursery', 'The Boiler Deck', 'The Archive', 'The Aquarium', 'The Parking Structure', 'The Studio'];
  const subPool = spec ? SUBBOSS_POOLS[spec.pool] : SUBBOSS_POOLS.all;
  const subbosses = spec ? [subPool[0], subPool[1]] : [subPool[ri(0, 1)], subPool[ri(2, subPool.length - 1)]];
  const isFinale = n === 18;
  if (isFinale && !modifiers.includes('dark')) modifiers.push('dark');
  if (isFinale && !modifiers.includes('bounty')) modifiers.push('bounty');
  return {
    name: spec ? spec.name : (isFinale ? 'Floor 18: The Broadcast Deck' : 'Floor ' + n + ': ' + names[(n - 4) % names.length]),
    pool: spec ? spec.pool : 'all', level: n, generated: true, finale: isFinale,
    boss: spec ? spec.boss : (isFinale ? 'showrunner' : bosses[(n - 1) % bosses.length]),
    subbosses, music: 'overworld', theme: isFinale ? 'void' : theme, modifiers,
    crawlers: spec ? spec.crawlers : [], chests, npcs: spec ? spec.npcs : [],
    shop: spec ? spec.shop : ['feast', 'brew', 'defib', 'puck', 'toxcan', 'grenade', 'taser', 'boot', 'plate', 'exo', 'gutsring', 'earbuds', 'mask', 'box_silver'],
    timeLimit: (14 + n * 2) * 60 * 60, gates: gates.length,
    map: grid.map(r => r.join('')),
  };
}

const floorCache = {};
function getFloorData(n) { if (!floorCache[n]) floorCache[n] = generateFloor(n); return floorCache[n]; }
function getInteriorData(kind, floorN) {
  if (kind === 'safe') return { name: 'Your Safe Room', theme: 'safe', map: SAFE_ROOM_MAP, interior: 'safe', shop: getFloorData(floorN).shop, music: 'shop' };
  return { name: kind === 'hells' ? 'Hell\'s Kitchen' : 'The Mercy Lounge', theme: kind === 'hells' ? 'hells' : 'mercy', map: CLUB_MAP, interior: kind, music: 'shop' };
}
