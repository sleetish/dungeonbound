// ---- Items --------------------------------------------------------------------
// type: heal | attack | weapon | armor | acc | key | box
// heal: hp/mp/cure/revive. attack: dmg/status. equipment: stat bonuses.
// gift: how much a crawler's aggression drops when given this item.
const ITEMS = {
  // consumables
  ration:   { name: 'Nutrient Bar',     type: 'heal', hp: 30,  price: 12,  gift: 6,  desc: 'Tastes like drywall. Heals 30 HP.' },
  jerky:    { name: 'Mystery Jerky',    type: 'heal', hp: 70,  price: 32,  gift: 10, desc: 'Do not ask. Heals 70 HP.' },
  feast:    { name: 'Sponsored Feast',  type: 'heal', hp: 180, price: 95,  gift: 18, desc: 'Brought to you by someone. Heals 180 HP.' },
  fizz:     { name: 'Neon Fizz',        type: 'heal', mp: 20,  price: 28,  gift: 8,  desc: 'Glows. Restores 20 MP.' },
  brew:     { name: 'Goblin Brew',      type: 'heal', mp: 55,  price: 70,  gift: 12, desc: 'Fermented by interns. Restores 55 MP.' },
  antitox:  { name: 'Anti-Tox Gum',     type: 'heal', cure: ['poison'], price: 10, gift: 4, desc: 'Cures poison. Chew, do not swallow.' },
  salts:    { name: 'Smelling Salts',   type: 'heal', cure: ['stun', 'glitch'], price: 10, gift: 4, desc: 'Cures stun and glitch.' },
  defib:    { name: 'Defib Patch',      type: 'heal', revive: 0.5, price: 130, gift: 20, desc: 'Revives a fallen ally at half HP.' },
  treat:    { name: 'Fancy Cat Treat',  type: 'heal', hp: 10,  price: 20,  gift: 30, desc: 'Irresistible to small mammals. Heals 10 HP.' },
  // throwables
  grenade:  { name: 'Pocket Grenade',   type: 'attack', dmg: 45,  target: 'enemy',   price: 45, gift: 15, desc: 'Deals 45 damage to one enemy.' },
  puck:     { name: 'Flash Puck',       type: 'attack', dmg: 10,  target: 'enemies', status: 'stun', chance: 0.6, price: 65, gift: 15, desc: 'May stun every enemy.' },
  toxcan:   { name: 'Tox Canister',     type: 'attack', dmg: 20,  target: 'enemies', status: 'poison', chance: 0.8, price: 55, gift: 12, desc: 'Poisons every enemy.' },
  // weapons
  pipe:     { name: 'Lead Pipe',        type: 'weapon', stat: { str: 6 },  price: 40,  gift: 12, desc: 'STR +6. Classic.' },
  mop:      { name: 'Mop Spear',        type: 'weapon', stat: { str: 9 },  price: 75,  gift: 12, desc: 'STR +9. Still slightly damp.' },
  bat:      { name: 'Nailed Bat',       type: 'weapon', stat: { str: 13 }, price: 130, gift: 15, desc: 'STR +13. Splinter risk.' },
  nerf:     { name: 'Modded Foam Gun',  type: 'weapon', stat: { str: 16, luck: 3 }, price: 210, gift: 18, desc: 'STR +16, LUCK +3. Do not aim at eyes.' },
  cleaver:  { name: 'Butcher Cleaver',  type: 'weapon', stat: { str: 20 }, price: 290, gift: 18, desc: 'STR +20. Chef approved.' },
  taser:    { name: 'Sponsor Taser',    type: 'weapon', stat: { str: 26, spd: 3 }, price: 540, gift: 20, desc: 'STR +26, SPD +3. Warranty void.' },
  boot:     { name: 'Steel-Toed Boot',  type: 'weapon', stat: { str: 34 }, price: 950, gift: 25, desc: 'STR +34. The one-boot legend lives.' },
  // armor
  pajamas:  { name: 'Flannel Pajamas',  type: 'armor', stat: { def: 2 },  price: 10,  gift: 5,  desc: 'DEF +2. What you were wearing.' },
  vest:     { name: 'Hi-Vis Vest',      type: 'armor', stat: { def: 7 },  price: 65,  gift: 10, desc: 'DEF +7. Very visible. Sadly.' },
  collar:   { name: 'Jeweled Collar',   type: 'armor', stat: { def: 8, luck: 4 }, price: 160, gift: 25, desc: 'DEF +8, LUCK +4. Fabulous.' },
  kevlar:   { name: 'Bargain Kevlar',   type: 'armor', stat: { def: 15 }, price: 250, gift: 15, desc: 'DEF +15. Some assembly required.' },
  plate:    { name: 'Riot Plate',       type: 'armor', stat: { def: 24, spd: -2 }, price: 560, gift: 20, desc: 'DEF +24, SPD -2. Heavy.' },
  exo:      { name: 'Sponsor Exosuit',  type: 'armor', stat: { def: 34, str: 4 }, price: 1100, gift: 25, desc: 'DEF +34, STR +4. Product placement.' },
  // accessories
  bracelet: { name: 'Lucky Bracelet',   type: 'acc', stat: { luck: 6 },   price: 85,  gift: 12, desc: 'LUCK +6. Probably.' },
  charm:    { name: 'Speed Charm',      type: 'acc', stat: { spd: 8 },    price: 130, gift: 12, desc: 'SPD +8. Zoom.' },
  gutsring: { name: 'Guts Ring',        type: 'acc', stat: { str: 5, def: 5 }, price: 320, gift: 18, desc: 'STR +5, DEF +5.' },
  earbuds:  { name: 'Noise Earbuds',    type: 'acc', stat: {}, immune: ['stun'], price: 220, gift: 15, desc: 'Immune to stun. Blocks the announcer.' },
  mask:     { name: 'Gas Mask',         type: 'acc', stat: { def: 2 }, immune: ['poison'], price: 200, gift: 15, desc: 'Immune to poison. DEF +2.' },
  // key / gift items
  medkit:   { name: 'Field Med Kit',    type: 'heal', hp: 90, cure: ['poison', 'stun', 'glitch'], price: 150, gift: 25, key: true, desc: 'Full trauma kit. Heals 90 HP, cures all.' },
  battery:  { name: 'Power Bank',       type: 'key', price: 90, gift: 30, desc: 'Charges anything. Streamers love it.' },
  cigar:    { name: 'Vintage Cigar',    type: 'key', price: 120, gift: 35, desc: 'Smells like money and regret.' },
  comic:    { name: 'Rare Comic #1',    type: 'key', price: 200, gift: 40, desc: 'Mint condition. Nerds will kill for it.' },
  teddy:    { name: 'Singed Teddy',     type: 'key', price: 5, gift: 40, desc: 'Somebody misses this.' },
  // unique gear with passives (boss chests, gold boxes, sponsor drops)
  vampfang:   { name: 'Vampire Fang',      type: 'weapon', stat: { str: 22 }, passive: 'lifesteal', unique: true, price: 700, gift: 30, desc: 'STR +22. Bash heals you for a third of the damage.' },
  quickblade: { name: 'First-Strike Shiv', type: 'weapon', stat: { str: 16, spd: 6 }, passive: 'firststrike', unique: true, price: 650, gift: 30, desc: 'STR +16, SPD +6. Your party always strikes first.' },
  luckcoin:   { name: 'Loaded Coin',       type: 'acc', stat: { luck: 4 }, passive: 'lootplus', unique: true, price: 500, gift: 25, desc: 'LUCK +4. Enemies drop loot far more often.' },
  regenband:  { name: 'Regen Band',        type: 'acc', stat: { def: 3 }, passive: 'regen', unique: true, price: 550, gift: 25, desc: 'DEF +3. Recover 6% HP every battle round.' },
  critlens:   { name: 'Sniper Lens',       type: 'acc', stat: { luck: 2 }, passive: 'critplus', unique: true, price: 600, gift: 25, desc: 'LUCK +2. Critical hit chance +15%.' },
  // sponsor exclusives
  blorpfeast: { name: 'Blorp Family Meal', type: 'heal', hp: 9999, all: true, price: 200, gift: 20, desc: 'Fully heals the whole party. Tastes like Blorp.' },
  ironblade:  { name: 'Ironclad Edge',     type: 'weapon', stat: { str: 30, luck: 5 }, price: 800, gift: 30, desc: 'STR +30, LUCK +5. Sponsor-grade steel.' },
  mercykit:   { name: 'Mercy Kit',         type: 'heal', revive: 1, price: 300, gift: 25, desc: 'Revives a fallen ally at full HP.' },
  bloodcleaver:{ name: 'Bloodsport Cleaver', type: 'weapon', stat: { str: 36 }, passive: 'lifesteal', price: 950, gift: 30, desc: 'STR +36. Drinks. Sponsored.' },
  neurobrew:  { name: 'NeuroFizz Ultra',   type: 'heal', mp: 9999, all: true, price: 220, gift: 20, desc: 'Restores everyone\'s MP. Side effects: all of them.' },
  ddlboots:   { name: 'DDL Runner Boots',  type: 'acc', stat: { spd: 12 }, price: 420, gift: 25, desc: 'SPD +12. Down is the only direction.' },
  pawcollar:  { name: 'Pawprint Collar',   type: 'armor', stat: { def: 16, luck: 8 }, price: 500, gift: 30, desc: 'DEF +16, LUCK +8. Sized for a raccoon. Fits anyone.' },
  rlpatch:    { name: 'Lounge Patch',      type: 'heal', revive: 0.75, price: 220, gift: 25, desc: 'Revives an ally at 75% HP. Recovery Lounge approved.' },
  ggplate:    { name: 'Guild Plate',       type: 'armor', stat: { def: 40, spd: -3 }, price: 1300, gift: 30, desc: 'DEF +40, SPD -3. Gladiator Guild issue.' },
  cbmic:      { name: 'Streamer Mic',      type: 'acc', stat: { luck: 3 }, passive: 'charisma', price: 450, gift: 30, desc: 'LUCK +3. Crawlers are far easier to recruit and talk down.' },
  vbcard:     { name: 'Vantablack Card',   type: 'key', price: 1000, gift: 50, desc: 'A matte black card. Sells for a fortune. Says nothing.' },
  // loot boxes
  box_bronze: { name: 'Bronze Loot Box', type: 'box', tier: 1, price: 60,  gift: 20, desc: 'Open it in the menu. Probably not a bomb.' },
  box_silver: { name: 'Silver Loot Box', type: 'box', tier: 2, price: 200, gift: 30, desc: 'Open it in the menu. Better odds.' },
  box_gold:   { name: 'Gold Loot Box',   type: 'box', tier: 3, price: 600, gift: 45, desc: 'Open it in the menu. The good stuff.' },
};

const LOOT_TABLES = {
  1: [{ id: 'ration', w: 5 }, { id: 'jerky', w: 4 }, { id: 'fizz', w: 3 }, { id: 'antitox', w: 2 }, { id: 'salts', w: 2 }, { id: 'grenade', w: 2 }, { id: 'pipe', w: 1 }, { id: 'vest', w: 1 }, { id: 'treat', w: 2 }, { id: 'money', w: 4, amt: [20, 60] }],
  2: [{ id: 'jerky', w: 4 }, { id: 'feast', w: 2 }, { id: 'brew', w: 2 }, { id: 'defib', w: 2 }, { id: 'puck', w: 2 }, { id: 'toxcan', w: 2 }, { id: 'bat', w: 2 }, { id: 'kevlar', w: 1 }, { id: 'bracelet', w: 2 }, { id: 'charm', w: 1 }, { id: 'box_bronze', w: 2 }, { id: 'money', w: 4, amt: [80, 200] }],
  3: [{ id: 'feast', w: 3 }, { id: 'defib', w: 3 }, { id: 'cleaver', w: 2 }, { id: 'taser', w: 1 }, { id: 'plate', w: 2 }, { id: 'gutsring', w: 2 }, { id: 'earbuds', w: 1 }, { id: 'mask', w: 1 }, { id: 'boot', w: 1 }, { id: 'exo', w: 1 }, { id: 'box_silver', w: 2 }, { id: 'money', w: 3, amt: [300, 700] }],
};
