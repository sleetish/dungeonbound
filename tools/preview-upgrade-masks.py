import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'.asset-deps'))
from PIL import Image,ImageDraw
out=Path(__file__).resolve().parents[1]/'assets/upgrade'
colors=[[(112,166,105),(193,151,90),(99,81,130)],[(195,147,64),(64,50,62),(62,88,128)],[(119,91,163),(188,186,186),(61,90,71)]]
cv=Image.new('RGB',(4*160,3*180),(35,38,52));d=ImageDraw.Draw(cv)
for row,facing in enumerate(('down','up','side')):
 im=Image.open(out/f'pack/characters/human_{facing}.png')
 mask=Image.open(out/f'pack/masks/human_mask_{facing}.png')
 for col in range(4):
  tint=im.copy()
  if col:
   for y in range(32):
    for x in range(32):
     m=mask.getpixel((x,y));p=im.getpixel((x,y))
     if not m[3]:continue
     target=colors[col-1][0 if m[0] else 1 if m[1] else 2]
     light=max(p[:3])/180
     tint.putpixel((x,y),(*[min(255,int(k*light)) for k in target],255))
  tint=tint.resize((128,128),Image.Resampling.NEAREST);cv.paste(tint,(col*160+16,row*180+8),tint)
  d.text((col*160+16,row*180+145),facing+(' original' if col==0 else ' recolor '+str(col)),fill='white')
cv.save(out/'preview-recolors.png')
print('Wrote preview-recolors.png')
