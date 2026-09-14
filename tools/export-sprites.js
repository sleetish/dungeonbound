// Exports every sprite in js/sprites.js to PNG files for use as art references.
// Usage: node tools/export-sprites.js  (writes assets/reference/1x, assets/reference/8x, manifest.json)
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const ctx = { console, document: { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {} }) }) } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/sprites.js'), 'utf8'), ctx, { filename: 'sprites.js' });
const Sprites = vm.runInContext('Sprites', ctx);

// minimal PNG encoder (RGBA)
function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function render(name, pal, scale) {
  const rows = Sprites.defs[name]; const w = 16, h = rows.length;
  const rgba = Buffer.alloc(w * scale * h * scale * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][x]; if (!ch || ch === '.') continue;
    const col = Sprites.color(ch, pal); if (!col) continue; const [r, g, b] = hex(col);
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) { const i = ((y * scale + dy) * w * scale + (x * scale + dx)) * 4; rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255; }
  }
  return png(w * scale, h * scale, rgba);
}
const out1 = path.join(ROOT, 'assets/reference/1x'), out8 = path.join(ROOT, 'assets/reference/8x');
fs.mkdirSync(out1, { recursive: true }); fs.mkdirSync(out8, { recursive: true });
const manifest = [];
const groups = {
  characters: n => /^(hero|human|raccoon)_/.test(n),
  objects: n => ['chest', 'chest_open', 'terminal', 'stairs', 'stairs_locked', 'shop', 'pod', 'lootbox', 'gate', 'gate_open', 'door_safe', 'door_hells', 'door_mercy', 'exit', 'stash', 'bench', 'bed', 'crate', 'vending'].includes(n),
};
for (const name of Object.keys(Sprites.defs)) {
  const group = groups.characters(name) ? 'characters' : groups.objects(name) ? 'objects' : 'monsters';
  fs.writeFileSync(path.join(out1, name + '.png'), render(name, null, 1));
  fs.writeFileSync(path.join(out8, name + '.png'), render(name, null, 8));
  manifest.push({ id: name, group, size: '16x16', file1x: 'assets/reference/1x/' + name + '.png', file8x: 'assets/reference/8x/' + name + '.png' });
}
// the crawler body with a recolor example, plus its mask (red shirt, green hair, blue pants)
for (const f of ['down', 'down_w1', 'down_w2', 'up', 'up_w1', 'up_w2', 'side', 'side_w1', 'side_w2']) {
  const maskPal = { 1: '#ff0000', 4: '#ff0000', 2: '#00ff00', 5: '#00ff00', 3: '#0000ff', 6: '#0000ff', s: '#000000', k: '#000000', w: '#000000', n: '#000000' };
  fs.writeFileSync(path.join(out8, 'human_mask_' + f + '.png'), render('human_' + f, maskPal, 8));
  manifest.push({ id: 'human_mask_' + f, group: 'masks', size: '16x16', file8x: 'assets/reference/8x/human_mask_' + f + '.png' });
}
fs.writeFileSync(path.join(ROOT, 'assets/reference/manifest.json'), JSON.stringify(manifest, null, 2));
console.log('exported', manifest.length, 'images to assets/reference');
