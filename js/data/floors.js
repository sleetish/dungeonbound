// ---- Floors -----------------------------------------------------------------------
// Map legend:
//  #  wall      .  floor     ,  floor (decor)   ~  water/acid   X  pillar   %  rubble
//  S  stairs    T  terminal  $  shop            +  med pod      C  chest (in reading order)
//  P  start     B  boss      @  npc (in order)  !  crawler (in order)   e  enemy spawn
const FLOORS = [
  {
    name: 'Floor 1: The Lobby', pool: 1, boss: 'ratking', music: 'overworld', theme: 'lobby',
    crawlers: ['mira', 'tony'],
    chests: ['pipe', 'cigar', 'box_bronze'],
    shop: ['ration', 'jerky', 'fizz', 'antitox', 'salts', 'treat', 'pipe', 'vest'],
    npcs: [
      { name: 'Dazed Survivor', pal: { 1: '#8080c0', 2: '#c0a060', 3: '#404040' },
        lines: ['I was buying a lottery ticket. Then the sky went away. Then I was HERE.', 'The voice said this is a game show. It said touching monsters starts a "battle". It said to hit them from BEHIND for a free turn.', 'There\'s a terminal in that room to the left. The voice says it "saves your progress". Whatever that means for a human being.'] },
    ],
    map: [
      '########################################',
      '#......................................#',
      '#..P...................................#',
      '#......@.....................%%........#',
      '#.............................%........#',
      '#...####......######.......####........#',
      '#...#T.#......#C...#.......#$.#........#',
      '#...#..#......#....#.......#..#........#',
      '#...#..#......###.##.......##.#........#',
      '#...#..#...............................#',
      '#...##.#.................,.............#',
      '#..........e.............e.............#',
      '#............................XX........#',
      '#.....~~~~........,..........XX........#',
      '#....~~~~~~............................#',
      '#....~~~~~~.......!..........e.........#',
      '#.....~~~~.............................#',
      '#.......................####...........#',
      '#..........C............#+.#...........#',
      '#.......................#..#...........#',
      '#..e....................##.#......!....#',
      '#......................................#',
      '#.................e....................#',
      '#.............................###.##...#',
      '#..........................e..#C...#...#',
      '#.............................#..B.#...#',
      '#.............................#..S.#...#',
      '########################################',
    ],
  },
  {
    name: 'Floor 2: The Wet Market', pool: 2, boss: 'steward', music: 'overworld', theme: 'sewer',
    crawlers: ['kestrel', 'okafor', 'grimsby'],
    chests: ['vest', 'comic', 'bracelet', 'teddy'],
    shop: ['jerky', 'feast', 'fizz', 'brew', 'defib', 'grenade', 'mop', 'bat', 'kevlar', 'bracelet', 'charm'],
    npcs: [
      { name: 'Fish Vendor', pal: { 1: '#4080a0', 2: '#603010', 3: '#303030' },
        lines: ['Fresh fish! Well. Fish. They came up out of the drains with the crabs. I don\'t ask questions.', 'Word of advice: the big quiet guy near the pillars? Don\'t look him in the eye. He\'s lost something.'] },
      { name: 'Kid With Goggles', pal: { 1: '#f0c040', 2: '#202020', 3: '#a04040' },
        lines: ['The Steward robot won\'t let anyone downstairs without "approval". Nobody knows how to get approval.', 'I think you just have to break it.'] },
    ],
    map: [
      '############################################',
      '#..........................................#',
      '#..P.......~~~~~~~~~~~~~~~~~~~~............#',
      '#..........~~~~~~~~~~~~~~~~~~~~............#',
      '#...@......~~~~~~~~~~~~~~~~~~~~.....@......#',
      '#..........................................#',
      '#####.######.....#####..#####.....########.#',
      '#...#.#....#.....#...#..#...#.....#......#.#',
      '#.T.#.#.C..#.....#.$.#..#.+.#.....#..C...#.#',
      '#...#.#....#.....#...#..#...#.....#......#.#',
      '#.###.###.##.....##.##..##.##.....###.####.#',
      '#..........................................#',
      '#......e...........!...........e...........#',
      '#..........................................#',
      '#~~~~~~~~~~~~~~~..........~~~~~~~~~~~~~~~~~#',
      '#~~~~~~~~~~~~~~~..........~~~~~~~~~~~~~~~~~#',
      '#..........................................#',
      '#.....!..........e..............!..........#',
      '#..........................................#',
      '#....XX........XX........XX........XX......#',
      '#..........................................#',
      '#.........e..............e.........e.......#',
      '#..........................................#',
      '#....XX........XX........XX........XX......#',
      '#..........................................#',
      '#.......C.........................####.###.#',
      '#.................................#..C...#.#',
      '#.................................#..B...#.#',
      '#.................................#..S...#.#',
      '############################################',
    ],
  },
  {
    name: 'Floor 3: The Colosseum', pool: 3, boss: 'gladiatron', music: 'overworld', theme: 'arena',
    crawlers: ['lulu', 'hex', 'padre'],
    chests: ['battery', 'brew'],
    shop: ['feast', 'brew', 'defib', 'puck', 'toxcan', 'cleaver', 'nerf', 'taser', 'plate', 'gutsring', 'earbuds', 'mask', 'box_bronze'],
    npcs: [
      { name: 'Announcer Bot', pal: { 1: '#c0c0c0', 2: '#c0c0c0', 3: '#c0c0c0' },
        lines: ['LADIES AND GENTLEMEN AND OTHER! The champion awaits in the arena! Entry is free! Exit is not guaranteed!', 'Sponsored by Blorp. Blorp: it\'s probably food.'] },
      { name: 'Old Crawler', pal: { 1: '#806040', 2: '#e0e0e0', 3: '#604020' },
        lines: ['Been down here since day one. Never went past this floor. Never wanted to.', 'The show says there\'s eighteen floors. Below three, the Dungeon just... makes them up as it goes. Good luck.'] },
    ],
    map: [
      '############################################',
      '#..........................................#',
      '#..P...................@...................#',
      '#..........................................#',
      '#...####.......################......####..#',
      '#...#T.#.......#......S.......#......#$.#..#',
      '#...#..#.......#....X....X....#......#..#..#',
      '#...##.#.......#..............#......##.#..#',
      '#..............#..............#............#',
      '#.......e......#......B.......#.....e......#',
      '#..............#..............#............#',
      '#.....!........#....X....X....#........!...#',
      '#..............#..............#............#',
      '#..............#######..#######............#',
      '#..........................................#',
      '#....XX......e...................e....XX...#',
      '#..........................................#',
      '#~~~~~~~~..............................~~~~#',
      '#~~~~~~~~..............................~~~~#',
      '#.............!..........e.................#',
      '#..........................................#',
      '#.....####............................####.#',
      '#.....#C.#............................#+.#.#',
      '#.....#..#.......e........e...........#..#.#',
      '#.....##.#............................##.#.#',
      '#..........................................#',
      '#..............@...........................#',
      '#...e.......................e..............#',
      '#..........................................#',
      '#.....................C....................#',
      '#.....%%%..................................#',
      '############################################',
    ],
  },
];

// ---- Procedural floors (4+) --------------------------------------------------------
function generateFloor(n) {
  const rng = U.seeded(1337 + n * 7919);
  const W = 48, H = 36;
  const grid = []; for (let y = 0; y < H; y++) grid.push(new Array(W).fill('#'));
  const rooms = [];
  const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
  for (let tries = 0; tries < 80 && rooms.length < 9; tries++) {
    const w = ri(5, 11), h = ri(4, 8), x = ri(1, W - w - 2), y = ri(1, H - h - 2);
    if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
    rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
  }
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) grid[y][x] = rng() < 0.06 ? ',' : '.';
  const carve = (x, y) => { if (grid[y][x] === '#') grid[y][x] = '.'; };
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    let x = a.cx, y = a.cy;
    if (rng() < 0.5) { while (x !== b.cx) { carve(x, y); carve(x, y + 1); x += U.sign(b.cx - x); } while (y !== b.cy) { carve(x, y); carve(x + 1, y); y += U.sign(b.cy - y); } }
    else { while (y !== b.cy) { carve(x, y); carve(x + 1, y); y += U.sign(b.cy - y); } while (x !== b.cx) { carve(x, y); carve(x, y + 1); x += U.sign(b.cx - x); } }
    carve(x, y);
  }
  // decorations: pillars / rubble / puddles inside larger rooms
  for (const r of rooms) if (r.w >= 7 && r.h >= 6 && rng() < 0.7) {
    const t = rng() < 0.5 ? 'X' : '~';
    grid[r.y + 2][r.x + 2] = t; grid[r.y + 2][r.x + r.w - 3] = t; grid[r.y + r.h - 3][r.x + 2] = t; grid[r.y + r.h - 3][r.x + r.w - 3] = t;
  }
  const put = (room, ch) => {
    for (let t = 0; t < 40; t++) {
      const x = ri(room.x, room.x + room.w - 1), y = ri(room.y, room.y + room.h - 1);
      if (grid[y][x] === '.' || grid[y][x] === ',') { grid[y][x] = ch; return true; }
    }
    return false;
  };
  const first = rooms[0], last = rooms[rooms.length - 1];
  grid[first.cy][first.cx] = 'P';
  grid[last.cy][last.cx] = 'S';
  grid[last.cy + (last.cy + 1 < last.y + last.h ? 1 : -1)][last.cx] = 'B';
  const mids = rooms.slice(1, -1);
  const chests = [];
  const chestPool = ['jerky', 'feast', 'defib', 'box_bronze', 'box_silver', 'brew', 'grenade', 'puck', 'toxcan', 'gutsring', 'charm', 'kevlar', 'cleaver', 'box_gold'];
  put(first, 'T');
  if (mids.length) { put(mids[ri(0, mids.length - 1)], '$'); put(mids[ri(0, mids.length - 1)], '+'); }
  for (let i = 0; i < 3; i++) { const r = mids.length ? mids[ri(0, mids.length - 1)] : last; if (put(r, 'C')) chests.push(chestPool[ri(0, chestPool.length - 1)]); }
  const enemyCount = 8 + Math.min(6, n);
  for (let i = 0; i < enemyCount; i++) { const r = rooms[ri(1, rooms.length - 1)]; put(r, 'e'); }
  const crawlerCount = 2;
  for (let i = 0; i < crawlerCount; i++) { const r = mids.length ? mids[ri(0, mids.length - 1)] : last; put(r, '!'); }
  const bosses = ['ratking', 'steward', 'gladiatron'];
  const themes = ['lobby', 'sewer', 'arena', 'void'];
  const names = ['The Undercroft', 'The Server Farm', 'The Food Court', 'The Vault', 'The Nursery', 'The Boiler Deck', 'The Archive', 'The Aquarium', 'The Parking Structure', 'The Studio'];
  return {
    name: 'Floor ' + n + ': ' + names[(n - 4) % names.length], pool: 'all', level: n, generated: true,
    boss: bosses[(n - 1) % bosses.length], music: 'overworld', theme: themes[n % themes.length],
    crawlers: [], chests, npcs: [],
    shop: ['feast', 'brew', 'defib', 'puck', 'toxcan', 'grenade', 'taser', 'boot', 'plate', 'exo', 'gutsring', 'earbuds', 'mask', 'box_silver'],
    map: grid.map(r => r.join('')),
  };
}

function getFloorData(n) { return n <= FLOORS.length ? FLOORS[n - 1] : generateFloor(n); }
