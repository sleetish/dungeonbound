// Build the production inventory from ASSET_SPEC.md without changing game assets.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const spec = fs.readFileSync(path.join(root, 'ASSET_SPEC.md'), 'utf8');
const frames = ['down', 'down_w1', 'down_w2', 'up', 'up_w1', 'up_w2', 'side', 'side_w1', 'side_w2'];
const themes = {lobby:'grey-blue office',sewer:'green wet stone',arena:'sand and warm stone',void:'dark purple',safe:'warm wood and plaster',hells:'dark red kitchen tile',mercy:'cool blue lounge'};
const assets = [];
const common = 'Late-SNES 16-bit JRPG pixel art, chunky readable silhouette, saturated slightly dusty colors, top-left light, maximum 16 opaque colors, #101020 one-pixel outline on sprites, no blur, no gradients, no shadow. PNG RGBA, hard binary alpha.';
function add(file,size,description,extra='') { assets.push({file,width:size,height:size,description,prompt:`${common} ${description} ${extra} Exact ${size}x${size} canvas.`,status:'pending'}); }
function section(n) { return spec.split(`## ${n}.`)[1].split(/\n## \d+\./)[0]; }
function rows(n) { return [...section(n).matchAll(/^\| `([^`]+)` \| ([^|]+)\|/gm)].map(m=>[m[1],m[2].trim()]); }
for (const [id,desc] of rows(2)) for(const f of frames) add(`characters/${id}_${f}.png`,32,desc,`${f.startsWith('side')?'Facing RIGHT':f.startsWith('up')?'Seen from behind':'Facing camera'}. ${f.endsWith('w1')?'Left foot forward':f.endsWith('w2')?'Right foot forward':'Standing'}. Same head position across animation frames. Center horizontally, exactly two empty rows below feet.`);
for(const f of frames) add(`masks/human_mask_${f}.png`,32,`Pixel-aligned mask for human_${f}: shirt pure red, hair pure green, pants pure blue, all other pixels transparent.`);
for(const [id,desc] of rows(4)) add(`monsters/${id}.png`,['ratking','steward','gladiatron'].includes(id)?96:64,desc,'Transparent background, center horizontally with two empty rows below feet.');
for(const [id,desc] of rows(5)) add(`objects/${id}.png`,32,desc,/Full-bleed/i.test(desc)||['gate_open'].includes(id)?'Opaque full-bleed tile.':'Transparent background, center horizontally with two empty rows below object.');
const tileDescriptions={floor:'Plain floor',floor_alt:'Subtle variant of plain floor',floor_cracked:'Floor with one clear crack or scuff',wall_top:'Top face of wall seen from above',wall_front:'Front face of wall with lit top edge',wall_torch:'Wall front with centered lit torch sconce',water_1:'Animated hazard liquid frame 1',water_2:'Animated hazard liquid frame 2',water_3:'Animated hazard liquid frame 3',pillar:'Column standing on floor',rubble:'Broken stone on floor',safe_zone:'Floor with yellow hazard stripes at top and bottom'};
for(const [theme,desc] of Object.entries(themes)) for(const [id,tile] of Object.entries(tileDescriptions)) add(`tiles/${theme}/${id}.png`,32,`${desc}: ${tile}.`,'Opaque full-bleed tile, seamless left-right, floor and liquid seamless in all directions.');
for(const [id,desc] of [['drain','Grate in floor'],['banner','Fallen red banner on floor'],['sand','Loose sand patch']]) add(`tiles/shared/${id}.png`,32,desc);
if(assets.length!==162) throw new Error(`Expected 162 assets, got ${assets.length}`);
const out=path.join(root,'assets/upgrade');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'production-plan.json'),JSON.stringify({source:'ASSET_SPEC.md',scope:'162 core assets; optional tier deferred',method:'Built-in image generation; exact-format processing awaiting user response',outline:'1px #101020',assets},null,2)+'\n');
console.log(`Prepared ${assets.length} asset paths and prompts.`);
