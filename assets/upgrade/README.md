# Dungeonbound upgrade assets

The complete core pack contains 162 PNGs: 27 character frames, 9 human recolor masks, 20 monsters, 19 objects, and 87 tiles across seven themes and shared decor.

- Deliverable: [dungeonbound-core-upgrade.zip](dungeonbound-core-upgrade.zip), preserving the specified folder layout.
- Browse: [offline gallery and character animations](review.html).
- Inspect: [room compositions](preview-scenes.png), [tile repeats](preview-seams.png), and [human recolors](preview-recolors.png).
- Evidence: [validation.json](validation.json) records dimensions, colors, hashes, and production methods.

All 162 files pass exact-size, RGBA, binary-alpha, maximum-16-color, filename, sprite-baseline, outline, mask-alignment, and applicable tile-edge checks. Character heads remain aligned within each direction's animation. Room compositions are asset previews, not screenshots of an integrated game.

Built-in image generation supplied the source artwork; user-authorized scripted processing supplied native sizing, palette reduction, transparency cleanup, outlines, masks, walk poses, paired-object states, and tile variants. Original generated images are preserved in sources/. generation-log.json records source paths and prompts; production-plan.json records all required output descriptions.

The game runtime is unchanged. See [pack/README.md](pack/README.md) for loader, nearest-neighbor scaling, baked-outline, and recoloring guidance. The optional 48-image tier in section 7 of the specification is outside this core delivery.

Rebuild and validate from the repository root with:

    python -W ignore tools/build-upgrade-assets.py
    python tools/review-upgrade-assets.py
    python tools/preview-upgrade-masks.py
    python tools/preview-upgrade-scenes.py

Pillow is installed under tools/.asset-deps/ and excluded from Git.
