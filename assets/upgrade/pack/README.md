# Dungeonbound core upgrade

162 PNG images in the folder layout from ASSET_SPEC.md:

| Folder | Count | Cell size |
| --- | ---: | --- |
| characters | 27 | 32 × 32 |
| masks | 9 | 32 × 32 |
| monsters | 20 | 64 × 64; floor bosses 96 × 96 |
| objects | 19 | 32 × 32 |
| tiles | 87 | 32 × 32 |

All files use 8-bit RGBA channels, binary alpha, and at most 16 opaque RGB colors.
The sprite outline is baked into the PNG as one pixel in #101020. Disable any
additional engine outline for these images. Use nearest-neighbor scaling.
Side-facing character frames face right; mirror them for left.

The final two character/object/monster rows are empty. The full-bleed stairs and
gates are exceptions. Theme tiles are opaque, including floors under pillars and
rubble. Floor and water edges match in both directions; wall edges match horizontally.
Gate images have matching top and bottom rows for vertical stacking.

Human mask pixels identify shirt (#ff0000), hair (#00ff00), and pants (#0000ff).
Transparent mask pixels leave the corresponding sprite pixels unchanged. Apply
tints while retaining the source region's shading. Masks exclude the outline,
skin, eyes, and shoes.

`manifest.json` provides paths and dimensions relative to this directory. The
existing game still needs a loader to consume this pack; no runtime code is changed
by extracting it. All original game assets remain available as fallbacks.

Artwork was produced with built-in image generation and scripted finishing.
Walking frames, masks, paired-object states, and tile variants are derived from
shared sources for alignment and consistency. The 48 optional assets in section 7
are outside this core pack.
