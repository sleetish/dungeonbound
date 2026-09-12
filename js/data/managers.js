// ---- Managers ------------------------------------------------------------------------------
// Five safe rooms on floor 1, each run by a different manager. The first one you sign with is
// yours for the whole run. Perks are read by the systems (shop, sponsors, rest, hints, stash).
const MANAGERS = {
  mo: { name: 'Mo Baxter', style: 'Fighters', pal: { 1: '#c03030', 2: '#303030', 3: '#404040' },
    blurb: 'Ex-boxing promoter. Knows every boss\'s tell. Yells a lot.',
    pitch: 'Kid, I\'ve seen a hundred crawlers walk past this door. You\'ve got a chin. Sign with me and I\'ll tell you exactly where to hit the big ones.',
    perks: { bossHint: 2, expBonus: 0.10, stash: 30, rest: 'full', shopDiscount: 0, sponsorRate: 1 },
    chatter: ['Guard on the tell. Every boss has one. Watch for the line before the big swing.', 'Crits come from luck. Luck comes from gear. Buy the bracelet.', 'You hit from behind, you go first. Basic footwork.'] },
  prudence: { name: 'Prudence Vale', style: 'Economy', pal: { 1: '#f0f0f0', 2: '#a06030', 3: '#202040' },
    blurb: 'Forensic accountant. Turned the apocalypse into a spreadsheet. Gets you 15% off everything.',
    pitch: 'Every crawler dies broke. Not mine. Sign with me: fifteen percent off every store, and I\'ll tell you what\'s worth carrying.',
    perks: { bossHint: 1, expBonus: 0, stash: 40, rest: 'full', shopDiscount: 0.15, sponsorRate: 1.2 },
    chatter: ['Sell key items you no longer need. Sentiment is not an asset class.', 'Sponsors pay by leaderboard rank. Rank pays by kills and floors. Do the math.', 'Loot boxes have expected values. Silver is the sweet spot.'] },
  dex: { name: 'Dex', style: 'Explorers', pal: { 1: '#40c0a0', 2: '#202020', 3: '#302040' },
    blurb: 'Teenage hacker with a cracked network tablet. Sees the floor layout before you do.',
    pitch: 'Okay so I patched into the floor feed. I can see gates, chests, the works. Sign with me and I\'ll walk you through every floor. Also I need a guardian, legally.',
    perks: { bossHint: 1, expBonus: 0, stash: 30, rest: 'full', shopDiscount: 0, sponsorRate: 1, mapHints: true },
    chatter: ['Sub-bosses sit right before their gate. Beat one, the gate pops.', 'Chests spawn two per section. Rivals loot them if you dawdle.', 'The edge zones are no-fight. Anybody who swings there gets yeeted to the middle of the map.'] },
  rosa: { name: 'Auntie Rosa', style: 'Survival', pal: { 1: '#e0a040', 2: '#e0e0e0', 3: '#804040' },
    blurb: 'Ran a diner for forty years. Feeds your whole party every time you rest, and slips you snacks.',
    pitch: 'Look at you, skin and bones. Sign with me, sweetheart. Nobody leaves my room hungry, and nobody leaves without a bar in their pocket.',
    perks: { bossHint: 1, expBonus: 0, stash: 30, rest: 'feast', shopDiscount: 0, sponsorRate: 1, snack: 'ration' },
    chatter: ['Rest before every boss. I mean it.', 'Poison ticks every turn. Gum is cheap. Buy gum.', 'The raccoon needs treats or he gets snippy. I know the type.'] },
  vinnie: { name: 'Vinnie "Two Contracts"', style: 'Fame', pal: { 1: '#8040c0', 2: '#303030', 3: '#202020' },
    blurb: 'Talent agent of questionable ethics. Sponsors love him. Takes ten percent of your gold.',
    pitch: 'Sponsors, baby. Boxes falling from the sky. I get you three contracts by floor two, guaranteed. My cut is ten percent and worth every coin.',
    perks: { bossHint: 0, expBonus: 0, stash: 20, rest: 'full', shopDiscount: 0, sponsorRate: 2, cut: 0.10 },
    chatter: ['Every crit is a clip. Every clip is a check.', 'Keep sponsors happy and they send you the good stuff before a boss. That\'s the play.', 'Conflicts of interest? Never heard of them. Legally.'] },
};

// Manager floor tips by theme and boss hints by boss id. Detail scales with the bossHint perk.
const MANAGER_TIPS = {
  themes: {
    lobby: ['Lobby Rats bite low. Goo spits poison. Bats screech; earbuds shut them up.', 'Mira Voss is friendly and wants a Neon Fizz. Big Tony is not friendly.'],
    sewer: ['Crabs guard hard. Skills go around armor better than bashing.', 'The Steward sanitizes and sweeps. Guard when it whirs.'],
    arena: ['Mimics look like chests until they don\'t. Hounds poison. Trash Elementals stink and stall.', 'Gladiatron plays to the crowd. When it hypes, it hits everyone next.'],
    void: ['Generated floors mix every pool. Expect anything. Expect it to be bigger.', 'Deeper floors, deeper crawlers. The lounge crowd is dangerous.'],
  },
  bosses: {
    ratking: ['A rat with a crown. Has a swarm attack.', 'Reginald calls a swarm at half health. Guard when he "demands tribute". Stun works on him.'],
    steward: ['A maintenance robot. Zaps.', 'The Steward summons Sponsor Drones at half health. Kill the drones first or the zaps stack. It shields itself; skills beat the shield.'],
    gladiatron: ['The champion. Hits everyone.', 'Gladiatron hypes itself at 60 percent then unleashes a Crowd Pleaser on the whole party. Guard everyone on the turn after the taunt. It siphons, so poison it.'],
    warden: ['Gate guard. Slow, armored.', 'The Warden braces before a slam. Skills ignore half its armor.'],
    ratlt: ['A bigger rat.', 'The Lieutenant bites twice when hurt. Finish it fast.'],
    crabmom: ['Very big crab.', 'The Matriarch pinches hard but can\'t dodge. Sniper skills land every time.'],
    alpha: ['Pack leader.', 'The Alpha howls at half health and gets faster. Stun it first.'],
    sentinel: ['Security drone.', 'The Sentinel zaps for stun. Earbuds make it harmless.'],
  },
};
