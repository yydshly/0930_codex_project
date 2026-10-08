from PIL import Image
from pathlib import Path
import json
project=Path(__file__).resolve().parents[1]
root=project/'web/assets/moving-day'
sources=project/'assets/product/sources'
manifest={'source':'Built-in ImageGen original commissioned game artwork','alphaPreserved':True,'slots':{}}
def bbox(img):
    alpha=img.getchannel('A'); return alpha.point(lambda x:255 if x>200 else 0).getbbox()
def trim(img,pad=4):
    b=bbox(img); assert b
    x1,y1,x2,y2=b; return img.crop((max(0,x1-pad),max(0,y1-pad),min(img.width,x2+pad),min(img.height,y2+pad)))
source=Image.open(sources/'worker-source.png').convert('RGBA');cw=source.width//3;ch=source.height//2
for i in range(6):
    x,y=(i%3)*cw,(i//3)*ch;cell=source.crop((x,y,x+cw,y+ch));b=bbox(cell);assert b
    figure=cell.crop((max(0,b[0]-4),max(0,b[1]-4),min(cw,b[2]+4),min(ch,b[3]+4)))
    scale=.49;figure=figure.resize((round(figure.width*scale),round(figure.height*scale)),Image.Resampling.LANCZOS)
    frame=Image.new('RGBA',(256,256));frame.alpha_composite(figure,((256-figure.width)//2,250-figure.height));frame.save(root/f'worker-{i}.webp','WEBP',quality=94,method=6)
    manifest['slots'][f'worker-{i}']={'sourceCell':[x,y,cw,ch],'solidBounds':b,'output':[256,256],'feetBaseline':250}
source=Image.open(sources/'cargo-source.png').convert('RGBA');cw=source.width//2;ch=source.height//2
for i,name in enumerate(['box','fridge','fragile','sofa']):
    x,y=(i%2)*cw,(i//2)*ch;cell=source.crop((x,y,x+cw,y+ch));b=bbox(cell);image=trim(cell);image.thumbnail((520,520),Image.Resampling.LANCZOS);image.save(root/(name+'.webp'),'WEBP',quality=94,method=6);manifest['slots'][name]={'sourceCell':[x,y,cw,ch],'solidBounds':b,'output':image.size}
image=trim(Image.open(sources/'truck-source.png').convert('RGBA'));image.thumbnail((1000,700),Image.Resampling.LANCZOS);image.save(root/'truck.webp','WEBP',quality=94,method=6)
for suffix in ['', '-rain', '-night']:
    Image.open(sources/('courtyard'+suffix+'-source.png')).save(root/('courtyard'+suffix+'.webp'),'WEBP',quality=94,method=6)
(root/'asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Prepared transparent sprites at fixed atlas slots; alpha preserved.')
