# Dungeonbound Art Asset Spec

What to create, at what size, named how, so the images can be dropped into the game with a
manifest loader and no per-image rework. Reference exports of every current sprite are in
`assets/reference/8x/` (8× upscaled pixel art) with `assets/reference/manifest.json` listing
ids. Regenerate them with `node tools/export-sprites.js`.

## 1. Global rules (apply to every image)

| Rule | Spec |
| --- | --- |
| Format | PNG, 32-bit RGBA. Transparent background. |
| Alpha | Hard edges: every pixel fully opaque or fully transparent. No soft halo, no drop shadow (the game draws shadows). |
| Pixel scale | Art is drawn at exactly 2× the current resolution: one old pixel = a 2×2 block. Keep a pixel-art look (nearest-neighbor, no gradients, no blur). |
| Palette | At most 16 colors per sprite, limited shading (base, shade, highlight). One shared palette family across the whole set. |
| Light | Top-left light source, consistent on every sprite. |
| Outline | Either every sprite has a 1 px outline in `#101020`, or none do. State which. (If none, the game adds one automatically.) |
| Facing | "Side" frames face RIGHT. The game mirrors them for left. |
| Baseline | Characters and objects stand on the bottom of the cell with 2 px of empty rows below the feet. Centered horizontally. |
| Naming | Exactly the ids below, lower case, `.png`. One image per file. Folders as listed. |
| Style target | 16-bit console JRPG: chunky readable silhouettes, big heads on characters, expressive faces, saturated but slightly dusty colors. Think late-SNES era, not modern HD. |

## 2. Characters — folder `characters/` — cell 32×32

Nine frames each. Frame ids: `down`, `down_w1`, `down_w2`, `up`, `up_w1`, `up_w2`, `side`,
`side_w1`, `side_w2`. `w1` and `w2` are the two walking steps (left foot forward, right foot
forward); the plain frame is standing. Filename pattern: `<character>_<frame>.png`.

| Character id | Description | Files |
| --- | --- | --- |
| `hero` | The player. Brown hair with a fringe, red-and-white striped flannel pajama top, blue pajama pants, brown slippers. Friendly, a little bewildered. | 9 |
| `raccoon` | Chancellor Tibbs. A raccoon standing on all fours, black mask, white cheeks, ringed tail, wearing a small jeweled collar. Smug. | 9 |
| `human` | The generic crawler body used for all 20 rivals, NPCs and managers. Neutral face, plain shirt, plain pants, dark hair. This one is recolored at runtime, so it also needs masks (below). | 9 |

Total: 27 images.

## 3. Recolor masks — folder `masks/` — cell 32×32

For `human` only. Same nine frames, filenames `human_mask_<frame>.png`. Each mask is a flat
color map that tells the game which pixels to tint per crawler:

| Color | Region |
| --- | --- |
| pure red `#ff0000` | shirt (including its shaded pixels) |
| pure green `#00ff00` | hair (including its shaded pixels) |
| pure blue `#0000ff` | pants (including its shaded pixels) |
| transparent | everything else (skin, eyes, shoes, outline) |

The masks must line up pixel-for-pixel with the `human` frames. Reference masks are in
`assets/reference/8x/human_mask_*.png`. Total: 9 images.

Alternative if masks are impractical: a full 9-frame set per rival instead (20 rivals × 9 =
180 images, ids `crawler_<id>_<frame>.png` using the ids in section 8). Masks are strongly
preferred.

## 4. Monsters — folder `monsters/` — single frame

Battle art is shown large; the overworld uses the same image scaled down, so keep silhouettes
bold. Cell sizes differ by tier.

### Regular monsters — cell 64×64

| id | Description |
| --- | --- |
| `rat` | Lobby Rat: scruffy brown rat, pink tail and ears, beady eyes. |
| `goo` | Lobby Goo: green blob with two dark eyes and a wobbly grin. |
| `bat` | Vent Bat: purple bat, wings spread, red eyes. |
| `goblin` | Goblin Intern: small green goblin in a white shirt and lanyard, holding a stapler. |
| `crab` | Sewer Crab: red crab, raised claws, many legs. |
| `cart` | Rogue Cart: a shopping cart with a wobbly wheel and an angry expression. |
| `drone` | Sponsor Drone: floating grey camera drone with a red lens and a cyan light on top. |
| `hound` | Bog Hound: dark green swamp dog, dripping, red eyes. |
| `trash` | Trash Elemental: heap of garbage with two glowing yellow eyes and a red mouth. |
| `skeleton` | Crawler Remains: skeleton in torn crawler clothes. |
| `mimic` | Mimic Chest: treasure chest with an open toothy mouth and a red tongue. |
| `golem` | Mop Golem: stone construct built around mops and buckets. |

### Gate guardians — cell 64×64 (currently recolors of the above; distinct art welcome)

| id | Description |
| --- | --- |
| `ratlt` | Rat Lieutenant: a dog-sized rat wearing a bottle cap on a string like a medal. |
| `warden` | Gate Warden: sandstone golem with glowing seams, blocky and heavy. |
| `crabmom` | Crab Matriarch: enormous pink crab crusted with barnacles. |
| `alpha` | Hound Alpha: black hound, yellow eyes, raised hackles. |
| `sentinel` | Security Sentinel: chrome drone with a green scanning lens and a red warning light. |

### Floor bosses — cell 96×96

| id | Description |
| --- | --- |
| `ratking` | Ratking Reginald: huge rat with a crown of bottle caps, sitting on a throne of garbage. |
| `steward` | The Floor Steward: polished white-and-cyan maintenance robot, one red eye, broom arm. |
| `gladiatron` | Gladiatron: gold armored robot gladiator with red plume and glowing eyes. |

Total: 20 images.

## 5. Objects — folder `objects/` — cell 32×32

| id | Description |
| --- | --- |
| `chest` | Closed wooden chest with brass lock. |
| `chest_open` | Same chest, lid open, empty. |
| `terminal` | Dungeon terminal: a CRT on a pedestal with green text. Save point. |
| `stairs` | Stairs down: dark square opening with steps descending. Full-bleed tile, no transparent border. |
| `stairs_locked` | Same stairs sealed with a red energy lock and a padlock icon. Full-bleed. |
| `shop` | Dungeon Store sign: yellow awning with "SHOP" and a striped counter. |
| `pod` | Med pod: cyan glass capsule on a metal base. |
| `gate` | Closed gate: iron bars with red lock lights. Full-bleed, tiles vertically (two are stacked). |
| `gate_open` | Same gate frame with bars retracted. Full-bleed. |
| `door_safe` | Safe-room door: wooden door with a small manager portrait plaque. |
| `door_hells` | Hell's Kitchen door: black door, red frame, flame motif. |
| `door_mercy` | Mercy Lounge door: blue door, pale frame, dove or cross motif. |
| `exit` | Interior exit door: plain steel door with a green EXIT light. |
| `stash` | Stash locker: grey metal locker with a brass tag. |
| `bench` | Crafting bench: workbench with tools and an "OFFLINE" screen. |
| `bed` | Cot with a white pillow and blue blanket. |
| `crate` | Wooden crate, stackable look. |
| `vending` | Vending machine with colorful cans behind glass. |
| `lootbox` | Gold and magenta loot box (used in menus). |

Total: 19 images.

## 6. Tiles — folder `tiles/<theme>/` — cell 32×32, seamless

Themes: `lobby` (grey-blue office), `sewer` (green stone, wet), `arena` (sand and warm
stone), `void` (dark purple, generated floors), `safe` (warm wood and plaster), `hells`
(dark red kitchen tile), `mercy` (cool blue lounge).

Per theme, 12 tiles (floor tiles must tile seamlessly in all directions; wall tiles seamlessly
left-right):

| id | Description |
| --- | --- |
| `floor` | Plain floor. |
| `floor_alt` | Subtle variant of `floor` (mixed in at random). |
| `floor_cracked` | `floor` with a single clear crack or scuff. |
| `wall_top` | Top face of a wall (seen from above). |
| `wall_front` | Front face of a wall (bricks, lit top edge). |
| `wall_torch` | `wall_front` with a lit torch sconce centered. |
| `water_1`, `water_2`, `water_3` | Three frames of an animated hazard liquid (water, sewage, lava per theme). |
| `pillar` | Column standing on `floor`. |
| `rubble` | Broken stone on `floor`. |
| `safe_zone` | Floor with a yellow hazard stripe top and bottom (neutral no-fight zone). |

Shared decor (any theme), folder `tiles/shared/`: `drain` (grate in floor), `banner` (fallen
red banner on floor), `sand` (loose sand patch).

Total: 7 × 12 + 3 = 87 images.

## 7. Optional tier (new features the game does not have yet)

| Asset | Folder / id | Size | Count |
| --- | --- | --- | --- |
| Character portraits for dialog | `portraits/<id>.png` — `hero`, `raccoon`, the 20 crawler ids, the 5 manager ids (`mo`, `prudence`, `dex`, `rosa`, `vinnie`) | 64×64 | 27 |
| Sponsor logos | `sponsors/<id>.png` — `blorp`, `ironclad`, `mercycorp`, `bloodsport`, `kepler`, `neurofizz`, `ddl`, `pawprint`, `recovery`, `gladguild`, `chatterbox`, `vantablack` | 48×48 | 12 |
| Title logo | `ui/logo.png` — "DUNGEONBOUND", chunky rainbow letters, optional "reDUNGEONmastered" tag | 640×128 | 1 |
| Battle backdrops | `backdrops/<theme>.png`, one per theme, abstract psychedelic pattern | 640×448 | 7 |
| Window frame | `ui/window.png`, 9-slice frame, white border, dark fill, rounded corners | 48×48 | 1 |

## 8. Rival crawler ids (for masks/portraits)

`mira`, `tony`, `okafor`, `kestrel`, `grimsby`, `lulu`, `hex`, `padre`, `jax`, `sable`,
`brother_hal`, `yuki`, `dmitri`, `penny`, `cassius`, `bea`, `rook`, `ines`, `marcus`, `zed`.
Their shirt/hair/pants colors are already in the game; only the masks are needed for tinting.

## 9. Counts

| Section | Images |
| --- | --- |
| Characters | 27 |
| Masks | 9 |
| Monsters | 20 |
| Objects | 19 |
| Tiles | 87 |
| Core total | 162 |
| Optional tier | 48 |

## 10. Generator prompt template

Use per image, substituting the description from the tables:

> 16-bit SNES JRPG pixel art sprite of {description}, {cell size} canvas, transparent
> background, hard pixel edges, no anti-aliasing, no blur, no gradients, maximum 16 colors,
> light from the top left, 1 pixel dark outline, centered, feet on the bottom edge with 2
> pixels of margin, {facing right / facing camera / seen from behind}, consistent with a late
> Super Nintendo era role-playing game. Plain flat transparent background, single sprite, no
> text, no frame, no shadow.

For walking frames add: "same character, same pose and colors as the standing frame, left
foot forward mid-step" and "right foot forward mid-step".

## 11. Acceptance checklist

- [ ] Every file is exactly the cell size for its section.
- [ ] Background is fully transparent; no semi-transparent edge pixels.
- [ ] All nine character frames share the same head position and body colors; only legs and
      arms move.
- [ ] Side frames face right.
- [ ] Masks align pixel-for-pixel with their `human` frames.
- [ ] Floor and water tiles wrap seamlessly (place four copies in a 2×2 grid and look for seams).
- [ ] Outline policy is consistent across the whole set.
- [ ] Filenames match the ids exactly, lower case.

Deliver as a zip preserving the folder layout. Missing images are fine: the game falls back
to the current pixel art for any id it cannot find.
