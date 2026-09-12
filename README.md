# Dungeonbound

A browser RPG tribute to the SNES classic *EarthBound*, relocated into a floor-by-floor
dungeon game show in the spirit of *Dungeon Crawler Carl*. Earth has been converted into
an 18-floor entertainment dungeon run by a sarcastic AI. You, your pajamas, and a raccoon
with a title descend, fight, loot, and either befriend or eliminate the other crawlers.

No build step. Open `index.html` in a browser (or serve the folder with any static server).

## Controls

| Action | Keys |
| --- | --- |
| Move | Arrow keys / WASD |
| Confirm / talk / check | Z, Space |
| Cancel / back | X, Esc, Backspace |
| Pause menu | Enter |
| Mute | M |

Touch devices get an on-screen D-pad and A/B/MENU buttons. Battle text and notifications
wait for a button press; holding confirm fast-forwards through battle text.

The mouse is optional but supported everywhere it makes sense: hover and click in any menu,
click to advance text, click an enemy or ally to target it in battle, right-click to cancel,
scroll wheel to move through lists, and click letters on the name grid. At the name prompt you
can also just type.

### reDUNGEONmastered look

Characters and monsters get automatic 1px outlines, the hero and Tibbs have shaded sprites with
real walk cycles, everything casts a contact shadow, walls have capstones and mortar with edge
shadows on the floor, the view has a vignette, battle sprites are larger, and the battle backdrop
layers drifting light bands over the scrolling hue pattern.

## EarthBound mechanics kept intact

- **Rolling HP odometer.** Damage does not land instantly: your HP meter scrolls down over
  time. Win the fight or heal before it reaches zero and you survive "mortal damage".
- **Visible enemies, no random battles.** Enemies wander the floor. Touch one from behind
  for a first strike; get touched from behind and the enemy gets a free round.
- **Instant wins.** Enemies far below your level flee on sight and are defeated on contact
  without a battle.
- **SMAAAASH!!** critical hits, misses, Guard, Auto-fight, Run.
- **PSI-style skills** with tiers (Rockit I/II/III, Patch I/II/III, Firewall, Hype, etc.).
- Status effects (Poison, Stun, Glitch), buffs and debuffs, shared party experience, level-up
  stat rolls, equipment (weapon / armor / accessory), typewriter text windows with the
  EarthBound window look, and psychedelic scrolling battle backdrops.
- Save at Dungeon Terminals (plus an autosave whenever you descend).

## The dungeon-crawler layer

- **Floors.** Three hand-authored floors (The Lobby, The Wet Market, The Colosseum), each
  with a Floor Boss that seals the stairs. From floor 4 on, floors are procedurally generated
  with scaled enemies for an endless descent.
- **The System.** A snarky AI announcer narrates, hands out sarcastic **achievements**, and
  rewards them with **loot boxes** (Bronze / Silver / Gold) you open from the menu.
- **Companion.** Chancellor Tibbs, a raccoon granted sapience by the network, joins on floor 1.
- **Competing crawlers.** Eight other crawlers (sniper, brawler, medic, rogue, tank, mage,
  streamer, cleric) roam the floors. Each has an **aggression level** (0-100) shown as a
  colored dot above their head:
  - **Green (friendly, < 30):** easy to recruit; will chat.
  - **Yellow (wary, 30-69):** may refuse to join; gifts lower aggression; challenging them
    raises it.
  - **Red (hostile, >= 70):** chase you and attack on sight.
- **Interactions.** Talk to a crawler to **Team up** (chance based on aggression, level and
  luck), **Give item** (every crawler has one item they really want; giving it wins them
  over instantly), **Challenge** (fight them), or **Leave** (coexist).
- **In battle** against a crawler you can **Parley** (talk them down, or offer an item mid-fight).
  Recruiting a crawler this way ends the fight and they join immediately.
- **Consequences.** Eliminating a crawler raises your **notoriety**, which raises every other
  crawler's aggression. Descending a floor without eliminating anyone earns the Coexistence
  achievement. Crawlers you leave behind may descend on their own and level up.
- **Party of up to four.** Dismiss recruits from the Party menu; they return to the floor.
- **Viewer ranking.** The pause menu shows a leaderboard of all crawlers by score.

## Project layout

```
index.html          page + script load order
css/style.css       canvas scaling, touch controls
js/util.js          helpers, seeded RNG, coroutine stepper
js/audio.js         WebAudio SFX + chip-tune sequencer
js/input.js         keyboard/touch input with key repeat
js/sprites.js       pixel-art sprite definitions and renderer
js/ui.js            windows, typewriter TextBox, Menu, odometer, toasts
js/data/*.js        items, skills, classes, enemies, crawlers, achievements, floors
js/entities.js      Actor (stats, leveling, rolling HP) and Party
js/map.js           tile map parsing, collision, themed tile rendering
js/game.js          global state, diplomacy, loot, save/load
js/scenes/*.js      title, name entry, dialog runner, overworld, battle, menu, shop, game over
js/main.js          scene stack and fixed-step game loop
```

Floors are ASCII maps (see the legend at the top of `js/data/floors.js`), so adding a floor
is a matter of drawing one and listing its chests, shop stock, NPCs and crawlers.
