# Dungeonbound (reDUNGEONmastered)

A browser RPG tribute to the SNES classic *EarthBound*, relocated into a floor-by-floor
dungeon game show in the spirit of *Dungeon Crawler Carl*. Earth has been converted into
an 18-floor entertainment dungeon run by a sarcastic AI. You, your pajamas, and a raccoon
with a title descend, fight, loot, sign sponsors, and either befriend or eliminate the other
crawlers.

No build step. Open `index.html` in a browser (or serve the folder with any static server).

## Play with friends (quick start)

1. **Easiest:** zip this folder and send it. Recipients double-click `index.html`, or drag it into Chrome/Firefox/Safari.
2. **Better (localStorage + no file quirks):** from this folder run `python3 -m http.server 8000` and open `http://localhost:8000`.
3. **Hosted:** drop the folder on any static host (GitHub Pages, Netlify, itch.io HTML). No build, no Node required.

**Controls:** Arrows/WASD move · Z/Space confirm · X/Esc cancel · Enter menu · M mute. Touch devices get on-screen buttons. Mouse works in menus.

**Save often:** Enter → **Save** works anywhere. Terminals and safe rooms also save. The game auto-saves when you descend a floor.

**Goal:** Survive 18 floors. Floors 1–3 are scripted; 4–17 are generated; Floor 18 is the Broadcast Deck finale. After you escape you can optionally keep crawling endless.

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

The mouse is optional but supported: hover and click in any menu, click to advance text, click
an enemy or ally to target it in battle, right-click to cancel, scroll wheel to move through
lists, and click letters on the name grid. At the name prompt you can also just type.

## EarthBound mechanics kept intact

- **Rolling HP odometer.** Damage scrolls down over time. Win or heal before it hits zero
  and you survive "mortal damage".
- **Visible enemies, no random battles.** Touch from behind for a first strike; get touched
  from behind and the enemy gets a free round. Weak enemies flee and fall instantly.
- **SMAAAASH!!** crits, misses, Guard, Auto-fight, Run, PSI-style tiered skills, status
  effects, buffs, shared experience, level-up stat rolls, equipment, EarthBound windows,
  typewriter text, psychedelic battle backdrops.

## The dungeon

- **Floors.** Every floor is generated from a seed: 72x44 tiles in three **sections gated
  by sub-bosses**. Beat the guardian in a section and the gate to the next opens. The Floor
  Boss and the stairs are in the last section. Floors 1 to 3 have fixed themes, bosses, NPCs
  and crawlers; floors 4 and beyond add random **modifiers** (Lights Out, Bounty, Overbooked,
  Quiet Hours, Toxic Vents, Crawler Convention).
- **The floor clock.** Each floor has a time limit shown top right. The System taunts as it
  runs down. At zero the floor collapses: if the boss is dead you tumble down the stairs at
  half health, otherwise the run ends.
- **Neutral zones.** The far left and far right edges of every floor are no-fight zones.
  Anything that tries to attack you there is teleported to the middle of the map.
- **Bosses with phases.** Every boss and sub-boss has a mid-fight turn with a tell line
  (summons, rage, a big slam, a haste howl). Guard when you see "(Guard!)".
- **Rivals act.** Crawlers on your floor fight monsters, level up and loot chests you haven't
  reached. Only a few are ever "in the dungeon" at once; from floor 4 the rest live in the
  lounges.

## Safe rooms, managers, lounges

- **Five safe rooms on floor 1**, each run by a different manager. The first you sign with
  stays for the run: Mo (boss tells, +10% exp), Prudence (15% store discount, big stash), Dex
  (map intel), Auntie Rosa (feasts and snacks when you rest), Vinnie (double sponsor traffic,
  takes a 10% cut).
- Inside: a **stash** to store items for later, a **bed** to rest, a vending machine, your
  manager with floor tips and boss hints, and a crafting bench (placeholder for a future patch).
- Floors 2 and 3 have one safe-room door. From floor 4 the safe room is reached through a lounge.
- **Hell's Kitchen** admits crawlers with three or more eliminations. **The Mercy Lounge**
  admits crawlers with three or fewer. Nobody is allowed to fight in a lounge. Start one anyway
  and it becomes a four-round battle before the guards arrive; the aggressor is banned for life,
  leaving only the neutral edge zones as safe ground.

## Crawlers, traits, outcomes

- Twenty rival crawlers with classes, aggression, a wanted gift item and **traits**
  (bloodthirsty, pacifist, coward, greedy, loyal, vengeful, showboat, honorable, opportunist,
  social, stoic) that drive drift, grudges, ambushes and lounge preference. "Ask about them"
  in conversation.
- **After beating a crawler** you choose: **Finish them** (huge audience spike, better sponsor
  luck and loot grade), **Knock out & loot** (take their gear and gold, lose viewers), or
  **Let them go** (no loot, easier to recruit later, or they come back for you).
- **Loyalty.** Recruits track loyalty: healing them raises it, letting them get knocked out
  or finishing crawlers they respect lowers it. Disloyal recruits walk out when you descend.

## Sponsors and viewers

- A **viewer meter** rises on crits, close calls, parleys, finishes and recruits. Achievements
  now live in a **Trophy Room** with hints for the locked ones.
- Twelve **sponsors** with goals, personalities and conflicts (Bloodsport vs Mercy Corp, and so
  on). Up to three at once. Offers arrive when you reach a new floor. Satisfaction moves with
  your actions; below 15 they drop you. Leaderboard rank earns them revenue, revenue and
  satisfaction earn you boxes, and a very happy sponsor sends an **exclusive item** before a
  boss. Vantablack pays cash instead of boxes.
- **Unique gear** with passives (lifesteal, first strike, loot bonus, regeneration, crit bonus)
  hides in gold boxes and generated-floor chests.

## Project layout

```
index.html          page + script load order
css/style.css       canvas scaling, touch controls
js/util.js          helpers, seeded RNG, coroutine stepper
js/audio.js         WebAudio SFX + chip-tune sequencer with intensity layer
js/input.js         keyboard/touch/mouse input, text mode
js/sprites.js       pixel-art sprites (outlines, shading slots, walk cycles)
js/ui.js            windows, typewriter TextBox, Menu (auto-sizing, mouse), odometer, toasts
js/data/*.js        items, skills, classes, enemies, crawlers, achievements, sponsors, managers, floors
js/entities.js      Actor (stats, leveling, rolling HP, passives, loyalty) and Party
js/map.js           tile map parsing, collision, gates/doors, themed tiles, torches
js/game.js          global state: diplomacy, outcomes, sponsors, stash, population, save/load
js/scenes/*.js      title, name entry, dialog runner, overworld+interiors, battle, menu, shop, stash, game over
js/main.js          scene stack and fixed-step game loop
```
