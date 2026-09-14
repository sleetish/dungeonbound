"""Build a portable, offline visual review of the completed core pack."""
import json, base64
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'assets/upgrade'
plan=json.loads((ROOT/'production-plan.json').read_text())
items=[]
for a in plan['assets']:
 p=ROOT/'pack'/a['file']
 if p.exists():items.append({**a,'src':'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()})
html='''<!doctype html><meta charset="utf-8"><title>Dungeonbound — core art review</title>
<style>body{margin:32px;background:#191b29;color:#e7dfcc;font:16px system-ui}h1{margin-bottom:8px}p{color:#b9bccb}button,select{background:#32374b;color:white;border:1px solid #5c647e;border-radius:4px;padding:8px;margin:8px}section{display:flex;flex-wrap:wrap;gap:14px}figure{margin:0;padding:12px;background:#262a3b;width:160px;border-radius:8px}img,canvas{image-rendering:pixelated;image-rendering:crisp-edges}figure img{object-fit:contain;width:160px;height:160px;background:repeating-conic-gradient(#34394c 0% 25%,#2b3042 0% 50%) 0/16px 16px}figcaption{font:12px monospace;margin-top:8px;overflow-wrap:anywhere}canvas{margin:12px;background:#32374b;width:128px;height:128px}#tiles img{width:128px;height:128px}small{display:block;color:#a5acc4}</style>
<h1>Dungeonbound core art review</h1><p>162 PNGs · baked dark outline · hard alpha · 16 colors maximum per image</p>
<p>Standalone review. The game loader is not changed. Inspect silhouettes, walking cycles, recolors, and tile repetition here.</p>
<h2>Walking and crawler tint preview</h2><div id="animation"></div>
<h2>Asset gallery</h2><select id="group"><option>characters</option><option>masks</option><option>monsters</option><option>objects</option><option>tiles</option></select><section id="gallery"></section>
<script>const assets=ASSET_DATA;const byFile=Object.fromEntries(assets.map(a=>[a.file,a]));const images={};for(const a of assets){const i=new Image;i.src=a.src;images[a.file]=i}
const gallery=document.querySelector('#gallery');function render(){gallery.replaceChildren();const g=document.querySelector('#group').value;for(const a of assets.filter(a=>a.file.startsWith(g+'/'))){const f=document.createElement('figure');const i=document.createElement('img');i.src=a.src;i.alt=a.description;const c=document.createElement('figcaption');c.textContent=a.file;const s=document.createElement('small');s.textContent=a.width+' × '+a.height;f.append(i,c,s);gallery.append(f)}}document.querySelector('#group').onchange=render;render();
const previews=[];for(const char of ['hero','raccoon','human'])for(const facing of ['down','up','side']){const wrap=document.createElement('span');wrap.style.display='inline-block';const c=document.createElement('canvas');c.width=c.height=32;const label=document.createElement('small');label.textContent=char+' '+facing;wrap.append(c,label);document.querySelector('#animation').append(wrap);previews.push({char,facing,c})}
setInterval(()=>{const step=['','_w1','','_w2'][Math.floor(Date.now()/180)%4];for(const p of previews){const ctx=p.c.getContext('2d');ctx.clearRect(0,0,32,32);const file='characters/'+p.char+'_'+p.facing+step+'.png';const im=images[file];if(!im?.complete)continue;ctx.drawImage(im,0,0);if(p.char==='human'){const mask=images['masks/human_mask_'+p.facing+step+'.png'];if(!mask?.complete)continue;const m=document.createElement('canvas');m.width=m.height=32;const mc=m.getContext('2d');mc.drawImage(mask,0,0);const md=mc.getImageData(0,0,32,32).data;const data=ctx.getImageData(0,0,32,32);for(let j=0;j<md.length;j+=4){if(!md[j+3])continue;const target=md[j]?[112,166,105]:md[j+1]?[193,151,90]:[99,81,130];const light=Math.max(data.data[j],data.data[j+1],data.data[j+2])/180;for(let k=0;k<3;k++)data.data[j+k]=Math.min(255,target[k]*light)}ctx.putImageData(data,0,0)}}},90);
</script>'''
(ROOT/'review.html').write_text(html.replace('ASSET_DATA',json.dumps(items)),encoding='utf-8')
print('Wrote portable review.html with',len(items),'embedded images')
