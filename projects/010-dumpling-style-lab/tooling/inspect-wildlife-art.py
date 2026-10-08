from pathlib import Path
from PIL import Image
import json
p=Path(__file__).resolve().parents[1]
result={}
for name in ['landscape','animals-atlas']:
    im=Image.open(p/f'web/assets/directions/wildlife/{name}.png')
    record={'size':list(im.size),'mode':im.mode}
    if im.mode=='RGBA':
        record['alpha_range']=list(im.getextrema()[3])
        w,h=im.size; cells=[]
        for row in range(2):
            for col in range(2):
                box=(col*w//2,row*h//2,(col+1)*w//2,(row+1)*h//2)
                tile=im.crop(box)
                local=tile.getchannel('A').point(lambda a:255 if a>=64 else 0).getbbox()
                absolute=[local[0]+box[0],local[1]+box[1],local[2]+box[0],local[3]+box[1]]
                cells.append({'cell':[col,row],'bounds_alpha64':absolute,'aspect':round((local[2]-local[0])/(local[3]-local[1]),5)})
        record['cells']=cells
        record['samples']={str(pos):im.getpixel(pos) for pos in [(399,177),(389,215),(500,77),(420,189)]}
        record['opaque_red_pixels']=sum(1 for r,g,b,a in im.get_flattened_data() if a>=128 and r>220 and g<60 and b<60)
    result[name]=record
(p/'notes/wildlife-art-inspection-20261005.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
