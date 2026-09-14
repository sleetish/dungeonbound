# Upgrade asset production — incomplete

The requested core pack contains 162 PNGs. `production-plan.json` records every
required filename, size, description, and production prompt, derived from
`ASSET_SPEC.md`. Regenerate it with `node tools/plan-upgrade-assets.js`.

Source illustrations are being generated using the built-in image generation tool
and preserved under `sources/`. Finished-format PNGs are built under `pack/`.
The runtime game has not been changed.

The generator did not honor the requested native canvas dimensions. Exact pixel
sizing, palette limits, binary transparency, animation alignment, and recolor masks
use controlled processing and validation. The user authorized scripted image
processing. Production is continuing through all 162 core files; `validation.json`
records the current count and any remaining failures or missing files.

Run `python tools/build-upgrade-assets.py --partial` for an incremental build.
Omit `--partial` for a final build that fails if any core asset is absent or invalid.
Pillow is installed locally under `tools/.asset-deps/`, excluded from Git.

Outline target: one pixel in #101020. Full-bleed tiles are opaque as required by
the section-specific rules. Optional assets are deferred until the core is ready.
