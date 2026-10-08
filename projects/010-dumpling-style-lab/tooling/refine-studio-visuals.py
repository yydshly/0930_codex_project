from pathlib import Path
import json
from PIL import Image
P=Path(__file__).resolve().parents[1]
with Image.open(P/'assets/game-forms/studio-sources/props.png') as im:
 assert im.mode=='RGBA'
 w,h=im.size;bounds=[]
 for i in range(16):
  x=i%4*w//4;y=i//4*h//4;cell=im.crop((x,y,x+w//4,y+h//4));box=cell.getchannel('A').point(lambda a:255 if a>64 else 0).getbbox()
  bounds.append([x+box[0],y+box[1],box[2]-box[0],box[3]-box[1]])
(P/'web/showcase-studio-atlas.js').write_text('export const ATLAS_BOUNDS='+json.dumps(bounds)+';\n',encoding='utf-8')
def change(f,a,b):
 p=P/f;s=p.read_text(encoding='utf-8');assert a in s,(f,a);p.write_text(s.replace(a,b),encoding='utf-8')
change('web/showcase-studio.js',"import {compositionDirector,SCALE}","import {ATLAS_BOUNDS} from './showcase-studio-atlas.js';\nimport {compositionDirector,SCALE}")
change('web/showcase-studio.js',"function stamp(c,art,i,x,y,w,h=w,angle=0,alpha=1){const sw=art.width/4,sh=art.height/4;c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=alpha;c.drawImage(art,i%4*sw,Math.floor(i/4)*sh,sw,sh,-w/2,-h/2,w,h);c.restore()}","function stamp(c,art,i,x,y,w,h=w,angle=0,alpha=1,stretch=false){const [sx,sy,sw,sh]=ATLAS_BOUNDS[i],scale=Math.min(w/sw,h/sh),dw=stretch?w:sw*scale,dh=stretch?h:sh*scale;c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha=alpha;c.drawImage(art,sx,sy,sw,sh,-dw/2,-dh/2,dw,dh);c.restore()}")
change('web/showcase-studio.js',"length+14,e.material==='deck'?19:15,angle)","length+14,e.material==='deck'?15:11,angle,1,true)")
change('web/showcase-studio.js',"tr<2?String(SCALE[v]+1):'●'","tr<2?['C','D','E','G','A','C','D','E'][v]+(tr===0?(v<5?4:5):(v<5?2:3)):'●'")
change('web/showcase-studio.js',"yy+28,14,'#102d31'","yy+28,12,'#102d31'")
change('web/showcase-studio.js',"dispose(){events.abort();held.clear();","dispose(){active=false;events.abort();held.clear();")
change('web/showcase-studio-rules.js',"'01111110','11111111','11111111','01111110'","'01100110','11011011','11011011','01100110'")
change('tooling/check-studio-lifecycle.mjs',"ctx.currentTime=.12;d.tick(s);","d.tick(s);ctx.currentTime=.12;d.tick(s);")
print('Visual sprite bounds and varied numeric clues refined')
