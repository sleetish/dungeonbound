// ---- Skills (the game's PSI) ---------------------------------------------------
// kind: attack | heal | buff | debuff | status | drain | steal | revive
// target: enemy | enemies | ally | allies | self
// field: usable from the menu outside battle
const SKILLS = {
  rockit1:  { name: 'Rockit I',    mp: 6,  kind: 'attack', power: 42,  target: 'enemy',   color: '#ff8040', text: '{a} fires Rockit I!' },
  rockit2:  { name: 'Rockit II',   mp: 15, kind: 'attack', power: 80,  target: 'enemies', color: '#ff8040', text: '{a} fires Rockit II!' },
  rockit3:  { name: 'Rockit III',  mp: 32, kind: 'attack', power: 160, target: 'enemies', color: '#ff8040', text: '{a} fires Rockit III!' },
  nova:     { name: 'Supernova',   mp: 48, kind: 'attack', power: 260, target: 'enemies', color: '#ffffff', text: '{a} goes SUPERNOVA!' },
  spark:    { name: 'Spark',       mp: 5,  kind: 'attack', power: 30,  target: 'enemy',   color: '#80c0ff', text: '{a} casts Spark!' },
  headshot: { name: 'Headshot',    mp: 8,  kind: 'attack', power: 0, mult: 2.2, crit: 0.35, target: 'enemy', color: '#ffffff', text: '{a} lines up a Headshot!' },
  backstab: { name: 'Backstab',    mp: 7,  kind: 'attack', power: 0, mult: 1.6, crit: 1.0, target: 'enemy', color: '#c080ff', text: '{a} slips behind for a Backstab!' },
  bite:     { name: 'Panda Bite',  mp: 4,  kind: 'attack', power: 0, mult: 1.5, target: 'enemy', color: '#c0c0c0', text: '{a} bites like a trash panda!' },
  venom:    { name: 'Venom Dart',  mp: 9,  kind: 'attack', power: 25, status: 'poison', chance: 0.85, target: 'enemy', color: '#80ff80', text: '{a} flicks a Venom Dart!' },
  zap:      { name: 'Static Zap',  mp: 10, kind: 'attack', power: 20, status: 'stun', chance: 0.7, target: 'enemy', color: '#ffff80', text: '{a} lets loose a Static Zap!' },
  shriek:   { name: 'Shriek',      mp: 12, kind: 'status', status: 'stun', chance: 0.55, target: 'enemies', color: '#ff80ff', text: '{a} SHRIEKS!' },
  lullaby:  { name: 'Lullaby',     mp: 14, kind: 'status', status: 'stun', chance: 0.75, target: 'enemies', color: '#8080ff', text: '{a} hums a Lullaby...' },
  glitch:   { name: 'Glitch',      mp: 11, kind: 'status', status: 'glitch', chance: 0.7, target: 'enemy', color: '#00ffcc', text: '{a} corrupts {t}!' },
  patch1:   { name: 'Patch I',     mp: 6,  kind: 'heal', power: 50,  target: 'ally', field: true, color: '#80ff80', text: '{a} applies Patch I!' },
  patch2:   { name: 'Patch II',    mp: 14, kind: 'heal', power: 130, cure: true, target: 'ally', field: true, color: '#80ff80', text: '{a} applies Patch II!' },
  patch3:   { name: 'Patch III',   mp: 26, kind: 'heal', power: 9999, cure: true, revive: true, target: 'ally', field: true, color: '#80ff80', text: '{a} applies Patch III!' },
  triage:   { name: 'Triage',      mp: 22, kind: 'heal', power: 90, target: 'allies', field: true, color: '#80ff80', text: '{a} performs Triage!' },
  firewall: { name: 'Firewall',    mp: 8,  kind: 'buff', buff: 'ward', turns: 3, target: 'ally', color: '#80c0ff', text: '{a} raises a Firewall around {t}!' },
  bulwark:  { name: 'Bulwark',     mp: 8,  kind: 'buff', buff: 'ward', turns: 3, target: 'self', color: '#c0c0c0', text: '{a} braces like a Bulwark!' },
  hype:     { name: 'Hype',        mp: 10, kind: 'buff', buff: 'rally', turns: 3, target: 'allies', color: '#ffc040', text: '{a} hypes up the party!' },
  trashtalk:{ name: 'Trash Talk',  mp: 6,  kind: 'debuff', buff: 'weak', turns: 3, target: 'enemy', color: '#ff80ff', text: '{a} trash talks {t}!' },
  siphon:   { name: 'Siphon',      mp: 12, kind: 'drain', power: 45, target: 'enemy', color: '#c04080', text: '{a} siphons {t}!' },
  pickpocket:{ name: 'Pickpocket', mp: 5,  kind: 'steal', target: 'enemy', color: '#ffd040', text: '{a} rummages through {t}\'s pockets!' },
};

const STATUS_INFO = {
  poison: { name: 'Poison', short: 'PSN', color: '#80ff80' },
  stun:   { name: 'Stun',   short: 'STN', color: '#ffff80' },
  glitch: { name: 'Glitch', short: 'GLT', color: '#00ffcc' },
};
