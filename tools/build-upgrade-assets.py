"""Normalize generated artwork and derive exact, reproducible game assets.

Install Pillow locally: python -m pip install --target tools/.asset-deps Pillow
Run: python tools/build-upgrade-assets.py [--partial]
Sources are preserved. Only assets/upgrade/pack and review artifacts are written.
"""
import sys, json, math, hashlib, zipfile, colorsys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / '.asset-deps'))
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/upgrade'
PACK = OUT / 'pack'
SOURCES = OUT / 'sources'
PLAN = json.loads((OUT / 'production-plan.json').read_text())
PARTIAL = '--partial' in sys.argv
INK = (16, 16, 32)
NN = Image.Resampling.NEAREST
THEMES = {
 'lobby':['272c42','414b63','63718b','8c9aaa','b4c0ca','dee2dd','526c75','6ea0a3'],
 'sewer':['202e2b','34483d','516951','78916a','a8b486','d1d6ac','3e6863','75a293'],
 'arena':['3d3034','665049','90704e','b69565','d8bc85','eee0b3','a85d45','d28d54'],
 'void':['201d36','37304f','52446c','79608f','a68cbc','d2badb','445c7f','6d96b5'],
 'safe':['382c32','604741','8c654d','b18b67','d8b995','edddba','787467','a4a38b'],
 'hells':['2c2130','4b2b37','763b3e','a65044','cd7954','eeb27c','783f58','b66571'],
 'mercy':['232c43','354a68','526f8f','789cac','aac6c9','dce6df','5e778c','99a4be'],
}
def rgb(h): return tuple(bytes.fromhex(h.lstrip('#')))
FAMILY = [INK]+[rgb(h) for h in ['f4e9ce','d7cfb5','f2c59a','d69b79','a56856','563c3c','7c5140','ac7950','d2a16a','b13e50','df6571','7d2c40','375a8c','587fb1','8badc4','294267','344635','52704a','7fa05e','adc57b','8dabc0','647d95','414c68','343346','71507c','9b71a2','c59fbf','a85184','d57aac','ecd89a','c9a858','927247','3e8586','68b5b1','ace0cc','d77c47','efac62','8d483b','ece9dc','757b83','a5adb0','384a4b','c44c37','ea8060','786950','a3946c','adaab9']]
HUMAN = [INK]+[rgb(h) for h in ['f4e9ce','f2c59a','d69b79','a56856','563c3c','7c5140','ac7950','7d2c40','b13e50','df6571','294267','375a8c','587fb1','8badc4']]
RACCOON = [INK]+[rgb(h) for h in ['f4e9ce','d7cfb5','ece9dc','757b83','a5adb0','343346','414c68','563c3c','7c5140','c9a858','927247','7d2c40','b13e50','df6571','d69b79']]
REGIONS = {**{rgb(h):(0,255,0) for h in ['563c3c','7c5140','ac7950']},**{rgb(h):(255,0,0) for h in ['7d2c40','b13e50','df6571']},**{rgb(h):(0,0,255) for h in ['294267','375a8c','587fb1','8badc4']}}

def source(file):
 p = SOURCES / file.replace('/','__')
 if not p.exists() and file in ('characters/hero_down.png','monsters/rat.png'):
  p = SOURCES / Path(file).name
 return p

def clean_alpha(im):
 im=im.convert('RGBA')
 a=im.getchannel('A').point(lambda v:255 if v>=180 else 0)
 im.putalpha(a)
 # Remove tiny disconnected alpha specks before fitting the useful silhouette.
 small=a.resize((min(im.width,256),min(im.height,256)),NN)
 pix=small.load(); seen=set(); comps=[]
 for y in range(small.height):
  for x in range(small.width):
   if not pix[x,y] or (x,y) in seen: continue
   todo=[(x,y)];seen.add((x,y));comp=[]
   while todo:
    q=todo.pop();comp.append(q)
    for dx,dy in ((-1,0),(1,0),(0,-1),(0,1)):
     n=(q[0]+dx,q[1]+dy)
     if 0<=n[0]<small.width and 0<=n[1]<small.height and n not in seen and pix[n]:
      seen.add(n);todo.append(n)
   comps.append(comp)
 if not comps: raise ValueError('Empty source image')
 comps.sort(key=len,reverse=True)
 keep=Image.new('L',small.size)
 kp=keep.load()
 for comp in comps:
  if len(comp)>=max(4,len(comps[0])*.0015):
   for p in comp:kp[p]=255
 keep=keep.resize(im.size,NN)
 # Only use the cleaned component extent for cropping, retaining fine source pixels.
 bbox=keep.getbbox()
 return im.crop(bbox)

def palette_map(im,colors=FAMILY,limit=16):
 """Map to shared hues, then limit each sprite without introducing new colors."""
 opaque=[p[:3] for p in im.getdata() if p[3]]
 if not opaque:return im
 cache={}
 def closest(c,pal):
  return min(pal,key=lambda k:sum((a-b)**2 for a,b in zip(c,k)))
 for c in set(opaque):cache[c]=closest(c,colors)
 counts={}
 for c in opaque:counts[cache[c]]=counts.get(cache[c],0)+1
 # Keep tiny saturated accents (eyes, jewels, warning lights) when reducing colors.
 accents={}
 for c in counts:
  h,s,v=colorsys.rgb_to_hsv(*(k/255 for k in c));bucket=int(h*8)%8
  if s>.4 and v>.35:
   old=accents.get(bucket)
   if old is None or s*v>old[0]:accents[bucket]=(s*v,c)
 protected=[INK]+[item[1] for item in accents.values()]
 selected=protected+[c for c in sorted(counts,key=counts.get,reverse=True) if c not in protected]
 selected=selected[:limit]
 for c in cache:cache[c]=closest(c,selected)
 result=Image.new('RGBA',im.size)
 result.putdata([(*cache[p[:3]],255) if p[3] else (0,0,0,0) for p in im.getdata()])
 return result

def outline(im):
 """One opaque boundary pixel; never expand the specified baseline."""
 result=im.copy();p=im.load();q=result.load()
 for y in range(im.height):
  for x in range(im.width):
   if not p[x,y][3]:continue
   if any(not(0<=x+dx<im.width and 0<=y+dy<im.height) or not p[x+dx,y+dy][3] for dx,dy in ((-1,0),(1,0),(0,-1),(0,1))):q[x,y]=(*INK,255)
 return result

def sprite(file):
 a=next(a for a in PLAN['assets'] if a['file']==file)
 n=a['width'];im=clean_alpha(Image.open(source(file)))
 character=file.startswith('characters/')
 h=26 if character else n-5
 w=n-4
 ratio=min(w/im.width,h/im.height)
 size=(max(1,round(im.width*ratio)),max(1,round(im.height*ratio)))
 im=im.resize(size,NN)
 if '/raccoon_' in file:
  for y in range(im.height):
   for x in range(im.width):
    r,g,b,alpha=im.getpixel((x,y))
    if alpha and g>r*1.3 and g>b*.9:im.putpixel((x,y),(177,62,80,255))
 cv=Image.new('RGBA',(n,n));cv.paste(im,((n-size[0])//2,n-2-size[1]))
 cv=outline(palette_map(cv,HUMAN if '/human_' in file else RACCOON if '/raccoon_' in file else FAMILY))
 if '/human_' in file:
  # Dark hair must remain tintable; reserve ink for the boundary and facial marks.
  original=cv.copy()
  for y in range(4,18):
   for x in range(1,31):
    p=original.getpixel((x,y))
    neighbors=[original.getpixel((x+dx,y+dy)) for dx,dy in ((-1,0),(1,0),(0,-1),(0,1))]
    if p[:3]==INK and p[3] and all(n[3] for n in neighbors):
     if '_up' in file or y<10 or sum(n[:3] in (INK,rgb('563c3c'),rgb('7c5140')) for n in neighbors)>=3:
      cv.putpixel((x,y),(*rgb('7c5140' if y<9 and x<17 else '563c3c'),255))
 return cv

def walk(base,frame,side=False,raccoon=False):
 im=base.copy();cut=25 if raccoon else 23
 feet=base.crop((0,cut,32,30));ImageDraw.Draw(im).rectangle((0,cut,31,29),fill=(0,0,0,0))
 # Lift alternate feet while the planted foot keeps the same baseline.
 midpoint=16
 if side:
  for x in range(32):
   for y in range(feet.height):
    p=feet.getpixel((x,y))
    if not p[3]:continue
    front=x>=midpoint
    dx=round((2 if front else -2)*(1 if frame==1 else -1)*y/max(1,feet.height-1))
    dy=-1 if (front==(frame==1)) else 0
    if 0<=x+dx<32:im.putpixel((x+dx,cut+y+dy),p)
 else:
  for x in range(32):
   dy=-2 if (x<midpoint)==(frame==1) else 0
   for y in range(feet.height):
    p=feet.getpixel((x,y))
    if p[3]:im.putpixel((x,cut+y+dy),p)
 return outline(im)

def mask(im):
 out=Image.new('RGBA',im.size)
 hair={(x,y) for y in range(19) for x in range(im.width) if REGIONS.get(im.getpixel((x,y))[:3])==(0,255,0) and im.getpixel((x,y))[3]}
 allowed=set()
 if hair:
  top=min(y for x,y in hair);todo=[p for p in hair if p[1]<=top+1];allowed.update(todo)
  while todo:
   x,y=todo.pop()
   for dx,dy in ((-1,0),(1,0),(0,-1),(0,1)):
    p=(x+dx,y+dy)
    if p in hair and p not in allowed:allowed.add(p);todo.append(p)
 for y in range(im.height):
  for x in range(im.width):
   p=im.getpixel((x,y));c=REGIONS.get(p[:3])
   if c and p[3] and (c!=(0,255,0) or (x,y) in allowed):out.putpixel((x,y),(*c,255))
 return out

FONT={
 'A':['010','101','111','101','101'],'B':['110','101','110','101','110'],
 'E':['111','100','110','100','111'],'F':['111','100','110','100','100'],
 'H':['101','101','111','101','101'],'I':['111','010','010','010','111'],
 'L':['100','100','100','100','111'],'N':['101','111','111','111','101'],
 'O':['111','101','101','101','111'],'P':['110','101','110','100','100'],
 'S':['111','100','111','001','111'],'T':['111','010','010','010','010'],
 'X':['101','101','010','101','101']}
def lettering(d,text,x,y,c):
 for ch in text:
  for j,row in enumerate(FONT[ch]):
   for i,b in enumerate(row):
    if b=='1':d.point((x+i,y+j),fill=c)
  x+=4

def object_finish(file,im):
 id=Path(file).stem;d=ImageDraw.Draw(im)
 if id=='shop':
  d.rectangle((6,9,25,15),fill=(*INK,255));lettering(d,'SHOP',8,10,(244,233,206,255))
 if id=='exit':
  d.rectangle((6,5,25,11),fill=(*INK,255));lettering(d,'EXIT',8,6,(173,197,123,255))
 if id=='bench':
  d.rectangle((1,9,30,15),fill=(*INK,255));lettering(d,'OFFLINE',2,10,(173,197,123,255))
 return palette_map(im)

def tile_source(theme,id):
 p=source(f'tiles/{theme}/{id}.png')
 im=Image.open(p).convert('RGB').resize((16,16),NN).convert('RGBA')
 return palette_map(im,[INK]+[rgb(h) for h in THEMES[theme]],16)

def seal(im,c,vertical=True):
 d=ImageDraw.Draw(im);n=im.width
 d.line((0,0,n-1,0),fill=c);d.line((0,n-1,n-1,n-1),fill=c)
 if vertical:
  d.line((0,0,0,n-1),fill=c);d.line((n-1,0,n-1,n-1),fill=c)
 return im

def tile_family(theme):
 colors=[(*rgb(h),255) for h in THEMES[theme]]
 floor=tile_source(theme,'floor');wall=tile_source(theme,'wall_front');water=tile_source(theme,'water_1')
 floor=seal(floor,colors[2]);water=seal(water,colors[0])
 # Every wall row uses matching outer columns, allowing horizontal repetition.
 for y in range(16):
  c=wall.getpixel((1,y));wall.putpixel((0,y),c);wall.putpixel((15,y),c)
 result={'floor':floor,'wall_front':wall}
 alt=floor.copy();d=ImageDraw.Draw(alt)
 for x,y in [(4,5),(10,11),(7,3)]:d.line((x,y,x+2,y),fill=colors[3])
 result['floor_alt']=alt
 cracked=floor.copy();d=ImageDraw.Draw(cracked);d.line([(5,3),(7,5),(6,7),(9,10),(9,12)],fill=colors[0]);d.line([(7,5),(10,4)],fill=colors[0]);result['floor_cracked']=cracked
 top=floor.copy();d=ImageDraw.Draw(top);d.rectangle((0,2,15,12),fill=colors[1]);d.line((0,2,15,2),fill=colors[4]);d.line((0,13,15,13),fill=colors[0]);d.line((7,3,7,12),fill=colors[0]);result['wall_top']=top
 torch=wall.copy();d=ImageDraw.Draw(torch);d.rectangle((6,7,9,11),fill=(*INK,255));d.rectangle((7,6,8,10),fill=(146,114,71,255));d.polygon([(6,6),(7,2),(8,4),(9,3),(10,7),(8,8)],fill=(215,124,71,255));d.line((8,5,8,7),fill=(236,216,154,255));result['wall_torch']=torch
 for frame in range(3):
  liquid=water.copy();d=ImageDraw.Draw(liquid)
  # Periodic ripples move two logical pixels per frame; the edge remains stable.
  for y in (4,10):
   for x in range(2,14):
    if ((x-frame*2+y)%10)<4:d.point((x,y+(1 if (x+frame)%6==0 else 0)),fill=colors[4])
  result[f'water_{frame+1}']=liquid
 pillar=floor.copy();d=ImageDraw.Draw(pillar)
 d.rectangle((4,12,11,13),fill=(*INK,255));d.rectangle((5,4,10,11),fill=colors[2]);d.line((5,4,5,11),fill=colors[4]);d.line((10,4,10,11),fill=colors[0]);d.rectangle((4,2,11,4),fill=colors[3]);d.line((4,2,11,2),fill=colors[5]);result['pillar']=pillar
 rubble=floor.copy();d=ImageDraw.Draw(rubble)
 for x,y in [(3,9),(7,6),(10,10)]:
  d.polygon([(x,y),(x+2,y-2),(x+4,y),(x+3,y+2),(x,y+2)],fill=colors[0]);d.line((x+1,y,x+2,y-1),fill=colors[4]);d.line((x+1,y+1,x+3,y+1),fill=colors[2])
 result['rubble']=rubble
 zone=floor.copy();d=ImageDraw.Draw(zone)
 for y in (0,1,14,15):
  for x in range(16):d.point((x,y),fill=(201,168,88,255) if (x+y)%6<3 else (*INK,255))
 result['safe_zone']=zone
 return {k:v.resize((32,32),NN) for k,v in result.items()}

def full_object(file):
 im=Image.open(source(file)).convert('RGB').resize((32,32),NN).convert('RGBA')
 im=palette_map(im)
 if Path(file).stem.startswith('gate'):
  # Vertical stack contract: identical top and bottom rows.
  for x in range(32):im.putpixel((x,31),im.getpixel((x,0)))
 return im

def save(file,im,method):
 p=PACK/file;p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
 provenance[file]=method

provenance={}
for a in PLAN['assets']:
 f=a['file']
 if f.startswith('masks/') or '_w1' in f or '_w2' in f:continue
 if f.startswith('tiles/') and '/shared/' not in f:continue
 if not source(f).exists():continue
 full=Path(f).stem in ('stairs','stairs_locked','gate','gate_open')
 im=full_object(f) if full else sprite(f)
 if f.startswith('objects/') and not full:im=object_finish(f,im)
 save(f,im,'Generated source; alpha cleanup, nearest-neighbor sizing, shared palette, boundary outline')
 if f.startswith('characters/'):
  for step in (1,2):
   wf=f.replace('.png',f'_w{step}.png');wi=walk(im,step,'_side' in f,'raccoon' in f);save(wf,wi,'Derived walking pose with unchanged head and palette')
  if '/human_' in f:
   for suffix in ('','_w1','_w2'):
    sf=f.replace('.png',suffix+'.png');mi=mask(Image.open(PACK/sf))
    mf='masks/'+Path(sf).name.replace('human_','human_mask_');save(mf,mi,'Exact semantic palette mask of corresponding final human frame')
# Paired objects share their underlying geometry, rather than changing shape on use.
if (PACK/'objects/stairs.png').exists() and source('objects/stairs_locked.png').exists():
 locked=Image.open(PACK/'objects/stairs.png');d=ImageDraw.Draw(locked)
 d.rectangle((7,7,24,24),outline=(177,62,80,255),width=2)
 d.line((8,8,23,23),fill=(223,101,113,255),width=2);d.line((23,8,8,23),fill=(223,101,113,255),width=2)
 d.rectangle((12,12,19,21),fill=(*INK,255));d.rectangle((13,15,18,20),fill=(201,168,88,255))
 d.line([(14,15),(14,12),(17,12),(17,15)],fill=(236,216,154,255));d.point((16,18),fill=(*INK,255))
 save('objects/stairs_locked.png',palette_map(locked),'Same stair tile with red energy seal and padlock overlay')
if (PACK/'objects/gate.png').exists():
 opened=Image.open(PACK/'objects/gate.png');d=ImageDraw.Draw(opened)
 d.rectangle((5,0,26,31),fill=(*INK,255))
 for x in (5,6,25,26):d.line((x,0,x,31),fill=(65,76,104,255))
 for x in (7,24):d.line((x,0,x,31),fill=(117,123,131,255))
 for x in range(32):opened.putpixel((x,31),opened.getpixel((x,0)))
 save('objects/gate_open.png',palette_map(opened),'Same gate frame with bars retracted to either side')
for theme in THEMES:
 if all(source(f'tiles/{theme}/{id}.png').exists() for id in ('floor','wall_front','water_1')):
  for id,im in tile_family(theme).items():save(f'tiles/{theme}/{id}.png',im,'Generated theme sources; derived tile details and periodic liquid animation')

expected={a['file']:a for a in PLAN['assets']}
checks=[];errors=[]
for f,a in expected.items():
 p=PACK/f
 if not p.exists():errors.append(f'Missing {f}');continue
 im=Image.open(p);pixels=list(im.getdata());alpha={p[3] for p in pixels};colors={p[:3] for p in pixels if p[3]};is_mask=f.startswith('masks/')
 checks.append({'file':f,'size':list(im.size),'colors':len(colors),'binaryAlpha':alpha<={0,255},'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'method':provenance.get(f,'previous build')})
 if im.mode!='RGBA' or im.size!=(a['width'],a['height']):errors.append(f'Format/size {f}')
 if not alpha<={0,255} or len(colors)>16:errors.append(f'Alpha/palette {f}')
 if is_mask:
  if not colors<={(255,0,0),(0,255,0),(0,0,255)}:errors.append(f'Mask colors {f}')
  human=Image.open(PACK/('characters/'+Path(f).name.replace('human_mask_','human_')))
  if any(m[3] and (not p[3] or p[:3]==INK) for m,p in zip(pixels,human.getdata())):errors.append(f'Mask alignment {f}')
 elif (f.startswith(('characters/','monsters/','objects/')) and Path(f).stem not in ('stairs','stairs_locked','gate','gate_open')):
  bbox=im.getbbox()
  if not bbox or bbox[3]!=im.height-2:errors.append(f'Baseline {f}')
  if any(p[3] and p[:3]!=INK for y in range(im.height) for x in range(im.width) for p in [im.getpixel((x,y))] if any(not(0<=x+dx<im.width and 0<=y+dy<im.height) or not im.getpixel((x+dx,y+dy))[3] for dx,dy in ((-1,0),(1,0),(0,-1),(0,1)))):errors.append(f'Outline {f}')
 if f.startswith('tiles/') and '/shared/' not in f:
  id=Path(f).stem
  if alpha!={255}:errors.append(f'Tile coverage {f}')
  if id.startswith(('floor','water')):
   if any(im.getpixel((0,y))!=im.getpixel((31,y)) for y in range(32)) or any(im.getpixel((x,0))!=im.getpixel((x,31)) for x in range(32)):errors.append(f'Seam {f}')
  if id.startswith('wall') and any(im.getpixel((0,y))!=im.getpixel((31,y)) for y in range(32)):errors.append(f'Wall seam {f}')
for char in ('hero','human','raccoon'):
 for facing in ('down','up','side'):
  files=[PACK/f'characters/{char}_{facing}{s}.png' for s in ('','_w1','_w2')]
  if all(p.exists() for p in files):
   ims=[Image.open(p) for p in files]
   if len({im.crop((0,0,32,20)).tobytes() for im in ims})!=1:errors.append(f'Head alignment {char}_{facing}')
   if len({im.tobytes() for im in ims})!=3:errors.append(f'Duplicate walk poses {char}_{facing}')
actual={p.relative_to(PACK).as_posix() for p in PACK.rglob('*.png')}
for f in actual-expected.keys():errors.append(f'Unexpected PNG {f}')
report={'expected':162,'present':len(checks),'groups':{g:sum(a['file'].startswith(g+'/') for a in checks) for g in ('characters','masks','monsters','objects','tiles')},'passed':not errors,'errors':errors,'assets':checks}
(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
(PACK/'manifest.json').write_text(json.dumps({'version':1,'outline':'baked 1px #101020; disable automatic outline when loading','assets':{f:{'file':f,'width':a['width'],'height':a['height']} for f,a in expected.items() if (PACK/f).exists()}},indent=2)+'\n')

def contact_sheet(files,name,cell=128,columns=8):
 rows=math.ceil(len(files)/columns);cv=Image.new('RGB',(columns*cell,rows*(cell+22)),(31,33,47));d=ImageDraw.Draw(cv)
 for i,f in enumerate(files):
  p=PACK/f
  if not p.exists():continue
  x=(i%columns)*cell;y=(i//columns)*(cell+22);im=Image.open(p)
  for yy in range(y,y+cell,8):
   for xx in range(x,x+cell,8):d.rectangle((xx,yy,xx+7,yy+7),fill=(48,51,66) if ((xx+yy)//8)%2 else (41,44,58))
  scale=2 if name=='preview-monsters.png' else max(1,min((cell-8)//im.width,(cell-8)//im.height));im=im.resize((im.width*scale,im.height*scale),NN)
  cv.paste(im,(x+(cell-im.width)//2,y+(cell-im.height)//2),im)
  label=Path(f).stem if not f.startswith('tiles/') else '/'.join(f.split('/')[1:]).replace('.png','')
  d.text((x+4,y+cell+4),label,fill=(225,225,220))
 cv.save(OUT/name)
for group in ('characters','monsters','objects','tiles'):
 contact_sheet([f for f in expected if f.startswith(group+'/')],f'preview-{group}.png',208 if group=='monsters' else 128,5 if group=='monsters' else 6)

# Four-copy floor/liquid tests and horizontal wall tests for visual inspection.
cv=Image.new('RGB',(7*224,6*140),(31,33,47));d=ImageDraw.Draw(cv)
for col,theme in enumerate(THEMES):
 for row,id in enumerate(('floor','floor_alt','floor_cracked','water_1','wall_front','wall_torch')):
  p=PACK/f'tiles/{theme}/{id}.png'
  if not p.exists():continue
  im=Image.open(p).resize((64,64),NN);x=col*224;y=row*140
  for dy in (0,64):
   for dx in (0,64):cv.paste(im,(x+dx,y+dy))
  d.text((x+130,y+8),theme+'\n'+id.replace('_','\n'),fill='white')
cv.save(OUT/'preview-seams.png')

if not errors:
 PLAN['method']='Built-in image generation with user-authorized scripted sizing, palette reduction, alpha cleanup, masks, animation and tile derivation'
 for a in PLAN['assets']:
  a['status']='validated';a['production_method']=provenance.get(a['file'],'previous build')
 (OUT/'production-plan.json').write_text(json.dumps(PLAN,indent=2)+'\n')
 with zipfile.ZipFile(OUT/'dungeonbound-core-upgrade.zip','w',zipfile.ZIP_DEFLATED) as z:
  for p in sorted(PACK.rglob('*')):
   if p.is_file():z.write(p,p.relative_to(PACK))
 print('PASS: 162 core assets packaged.')
else:
 print(json.dumps({'present':len(checks),'missing':sum(e.startswith('Missing ') for e in errors),'errors':[e for e in errors if not e.startswith('Missing ')]},indent=2))
 if not PARTIAL:sys.exit(1)
