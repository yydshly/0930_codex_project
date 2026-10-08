from pathlib import Path
from PIL import Image
import json

project=Path(__file__).resolve().parents[1]
source=project/'assets/worlds-product/sources'
dest=project/'web/assets/worlds'
dest.mkdir(parents=True,exist_ok=True)
manifest={'generation':'built-in ImageGen','alphaPreserved':True,'assets':{}}

def write(name,img,slot=None):
    img.save(dest/(name+'.webp'),'WEBP',quality=92,method=6)
    manifest['assets'][name]={'size':list(img.size),'sourceCell':slot,'bytes':(dest/(name+'.webp')).stat().st_size}

for name in ['detective-office','detective-street','wuxia-landscape','wasteland-horizon','dream-water','arcade-city','inn-interior','ecology-terrain']:
    img=Image.open(source/(name+'-source.png')).convert('RGB')
    img.thumbnail((1600,1000),Image.Resampling.LANCZOS)
    write(name,img)

atlases=[
 ('world-characters',4,3,['agent','shen','lin','ji','wuxia-hero','merchant','porter','messenger','traveler','ferryman','ecologist','survivor'],(220,420)),
 ('inn-characters',4,2,['keeper','courier','botanist','writer','keeper-activity','courier-activity','botanist-activity','writer-activity'],(270,420)),
 ('runner-poses',2,2,['runner-0','runner-1','runner-2','runner-3'],(390,420)),
 ('ecology-plants',3,3,['reed-0','flowers-0','wood-0','reed-1','flowers-1','wood-1','reed-2','flowers-2','wood-2'],(380,380)),
 ('detective-props',2,2,['film-can','equipment-ledger','torn-receipt','contact-proof'],(420,350)),
 ('wasteland-equipment',2,2,['water-pump','radiator','seedling-bench','salvage-crate'],(450,400)),
 ('dream-props',3,1,['moon-ferry','archive-pavilion','moon-stone'],(500,450))
]
for stem,cols,rows,names,size in atlases:
    img=Image.open(source/(stem+'-source.png'))
    assert img.mode=='RGBA',f'{stem} must preserve generated alpha'
    assert img.getchannel('A').getextrema()[0]==0
    for i,name in enumerate(names):
        x1=round((i%cols)*img.width/cols);x2=round((i%cols+1)*img.width/cols)
        y1=round((i//cols)*img.height/rows);y2=round((i//cols+1)*img.height/rows)
        cell=img.crop((x1,y1,x2,y2))
        b=cell.getchannel('A').point(lambda a:255 if a>190 else 0).getbbox()
        assert b,f'{stem} cell {i} empty'
        # Only crop and compress; never repaint, recolor, or remove the generated background.
        figure=cell.crop((max(0,b[0]-4),max(0,b[1]-4),min(cell.width,b[2]+4),min(cell.height,b[3]+4)))
        figure.thumbnail(size,Image.Resampling.LANCZOS)
        write(name,figure,[x1,y1,x2,y2])

frame=Image.open(source/'wasteland-frame-source.png')
assert frame.mode=='RGBA'
b=frame.getchannel('A').point(lambda a:255 if a>190 else 0).getbbox()
frame=frame.crop(b);frame.thumbnail((1400,800),Image.Resampling.LANCZOS);write('wasteland-frame',frame)
manifest['totalBytes']=sum(a['bytes'] for a in manifest['assets'].values())
(dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'assets':len(manifest['assets']),'bytes':manifest['totalBytes'],'alphaPreserved':True}))
