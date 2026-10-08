"""Crop and encode generated artwork; do not repaint, recolor, or replace alpha."""
from pathlib import Path
from PIL import Image
import json

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/art-styles/sources'
DEST=ROOT/'web/assets/art-styles'
ACTORS=['keeper','courier','botanist','writer']
# Generated atlases have consistent columns but unequal row heights. These
# boundaries were checked against alpha valleys and the complete figure shapes.
ROW_BOUNDS={
    'clay':[0,318,624,925,1157,1402],
    'felt':[0,326,645,946,1190,1402],
    'watercolor':[0,306,613,928,1179,1402],
    'engraving':[0,338,661,975,1215,1402],
}
REPORT=[]

for style in ['clay','felt','watercolor','engraving']:
    out=DEST/style
    out.mkdir(parents=True,exist_ok=True)
    scene=Image.open(SOURCE/(style+'-background.png')).convert('RGB')
    scene.thumbnail((1600,1000),Image.Resampling.LANCZOS)
    scene.save(out/'background.webp',quality=93,method=6)
    atlas=Image.open(SOURCE/(style+'-atlas-v2.png')).convert('RGBA')
    assert atlas.height==ROW_BOUNDS[style][-1], 'Reinspect row bounds for a different source atlas'
    assert atlas.getchannel('A').getextrema()[0]==0,style+' must retain transparent alpha'
    for row in range(5):
        for col in range(4):
            cell=atlas.crop((round(col*atlas.width/4),ROW_BOUNDS[style][row],round((col+1)*atlas.width/4),ROW_BOUNDS[style][row+1]))
            box=cell.getchannel('A').point(lambda a:255 if a>48 else 0).getbbox()
            assert box, (style,row,col,'empty cell')
            x0,y0,x1,y1=box
            box=(max(0,x0-3),max(0,y0-3),min(cell.width,x1+3),min(cell.height,y1+3))
            sprite=cell.crop(box)
            sprite.thumbnail((270,420),Image.Resampling.LANCZOS)
            name=ACTORS[col]+'-'+['idle','walk-a','walk-b','activity'][row] if row<4 else ['plant','tea','books','lamp'][col]
            sprite.save(out/(name+'.webp'),quality=94,method=4)
            REPORT.append(dict(style=style,name=name,cell=[row,col],crop=box,size=sprite.size,alpha=sprite.getchannel('A').getextrema()))

(ROOT/'notes/style-packs-assets-20261003.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2),encoding='utf-8')
print('Prepared four backgrounds and eighty transparent character / prop assets.')
