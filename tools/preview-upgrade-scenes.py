"""Render art-layout examples, not screenshots of the running game."""
import sys, random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'.asset-deps'))
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]/'assets/upgrade';pack=root/'pack'
themes=['lobby','sewer','arena','void','safe','hells','mercy']
canvas=Image.new('RGB',(1024,4*414),(27,29,43));d=ImageDraw.Draw(canvas)
for i,theme in enumerate(themes):
 if not (pack/f'tiles/{theme}/floor.png').exists():continue
 room=Image.new('RGBA',(256,192));rng=random.Random(17)
 for y in range(6):
  for x in range(8):
   tile='wall_torch' if y==0 and x in (1,6) else 'wall_front' if y==0 else rng.choice(['floor']*8+['floor_alt','floor_cracked'])
   if x in (5,6) and y in (2,3):tile='water_1'
   room.paste(Image.open(pack/f'tiles/{theme}/{tile}.png'),(x*32,y*32))
 def place(file,x,y,size=32):
  p=pack/file
  if p.exists():
   im=Image.open(p).resize((size,size),Image.Resampling.NEAREST);room.alpha_composite(im,(x*32,y*32))
 place('objects/door_safe.png',3,0);place('objects/chest.png',1,2)
 place('objects/terminal.png',1,4);place('objects/stairs.png',6,4)
 place('characters/hero_down.png',3,3);place('characters/raccoon_side.png',4,3)
 place('characters/human_side.png',2,2);place('monsters/goo.png',5,4)
 place(f'tiles/{theme}/pillar.png',3,1);place(f'tiles/{theme}/rubble.png',7,2)
 x=(i%2)*512;y=(i//2)*414
 canvas.paste(room.resize((512,384),Image.Resampling.NEAREST),(x,y))
 d.text((x+8,y+391),theme+' — art layout preview (not integrated gameplay)',fill=(230,225,207))
canvas.save(root/'preview-scenes.png');print('Wrote preview-scenes.png')
