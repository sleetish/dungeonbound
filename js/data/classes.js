// ---- Character classes ------------------------------------------------------------
// base: level-1 stats. growth: average gain per level (randomized +-).
const CLASSES = {
  crawler:  { name: 'Crawler', sprite: 'human', base: { hp: 38, mp: 12, str: 8, def: 5, spd: 6, luck: 5 }, growth: { hp: 7, mp: 3, str: 2.2, def: 1.6, spd: 1.2, luck: 0.8 },
    skills: [[1, 'rockit1'], [3, 'patch1'], [5, 'firewall'], [8, 'rockit2'], [10, 'zap'], [13, 'patch2'], [16, 'hype'], [20, 'rockit3'], [24, 'patch3'], [28, 'nova']] },
  raccoon:  { name: 'Raccoon', sprite: 'raccoon', base: { hp: 24, mp: 18, str: 6, def: 3, spd: 10, luck: 9 }, growth: { hp: 4.5, mp: 4, str: 1.6, def: 1.0, spd: 1.8, luck: 1.4 },
    skills: [[1, 'bite'], [2, 'pickpocket'], [6, 'shriek'], [9, 'glitch'], [12, 'siphon'], [15, 'lullaby'], [18, 'patch2'], [22, 'trashtalk']] },
  sniper:   { name: 'Sniper', sprite: 'human', base: { hp: 30, mp: 14, str: 11, def: 3, spd: 8, luck: 7 }, growth: { hp: 5.5, mp: 3, str: 2.8, def: 1.1, spd: 1.5, luck: 1.0 },
    skills: [[1, 'headshot'], [7, 'venom'], [12, 'trashtalk']] },
  brawler:  { name: 'Brawler', sprite: 'human', base: { hp: 50, mp: 6, str: 12, def: 7, spd: 4, luck: 3 }, growth: { hp: 9, mp: 1.5, str: 2.6, def: 2.0, spd: 0.8, luck: 0.5 },
    skills: [[1, 'bulwark'], [8, 'hype']] },
  medic:    { name: 'Medic', sprite: 'human', base: { hp: 32, mp: 22, str: 5, def: 5, spd: 6, luck: 6 }, growth: { hp: 6, mp: 5, str: 1.3, def: 1.6, spd: 1.2, luck: 0.9 },
    skills: [[1, 'patch1'], [5, 'triage'], [9, 'patch2'], [15, 'patch3']] },
  rogue:    { name: 'Rogue', sprite: 'human', base: { hp: 32, mp: 14, str: 9, def: 4, spd: 11, luck: 8 }, growth: { hp: 5.5, mp: 3, str: 2.2, def: 1.2, spd: 2.0, luck: 1.3 },
    skills: [[1, 'backstab'], [3, 'pickpocket'], [8, 'glitch']] },
  mage:     { name: 'Mage', sprite: 'human', base: { hp: 26, mp: 30, str: 4, def: 3, spd: 6, luck: 6 }, growth: { hp: 4.5, mp: 6, str: 1.0, def: 1.1, spd: 1.2, luck: 1.0 },
    skills: [[1, 'spark'], [4, 'zap'], [7, 'rockit2'], [14, 'nova']] },
  tank:     { name: 'Tank', sprite: 'human', base: { hp: 56, mp: 8, str: 9, def: 10, spd: 3, luck: 3 }, growth: { hp: 10, mp: 1.5, str: 1.9, def: 2.6, spd: 0.6, luck: 0.5 },
    skills: [[1, 'bulwark'], [5, 'trashtalk'], [10, 'firewall']] },
  streamer: { name: 'Streamer', sprite: 'human', base: { hp: 34, mp: 18, str: 7, def: 4, spd: 8, luck: 10 }, growth: { hp: 6, mp: 4, str: 1.8, def: 1.3, spd: 1.5, luck: 1.6 },
    skills: [[1, 'hype'], [6, 'glitch'], [11, 'siphon']] },
  cleric:   { name: 'Cleric', sprite: 'human', base: { hp: 36, mp: 24, str: 6, def: 6, spd: 5, luck: 5 }, growth: { hp: 6.5, mp: 5, str: 1.5, def: 1.8, spd: 1.0, luck: 0.8 },
    skills: [[1, 'patch1'], [4, 'firewall'], [8, 'triage'], [12, 'lullaby']] },
};

// experience needed to reach a level
function expForLevel(lv) { return Math.floor(9 * Math.pow(lv - 1, 2.15) + 12 * (lv - 1)); }
