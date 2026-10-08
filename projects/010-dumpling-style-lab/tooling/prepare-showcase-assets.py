"""Slice sprite/art atlases and encode runtime assets. No invented bitmap artwork."""
from pathlib import Path
from PIL import Image
import shutil,json
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'assets/showcase/sources'
OUT=ROOT/'web/assets/showcase'
GEN=Path('D:/codex/home/generated_images/01a0f829-1d38-7672-a112-e0a52908ac0c')
FILES={
 'night':'exec-50429903-352d-4c70-9069-dd5a532102b0.png',
 'arena':'exec-332cd45f-9bd1-486c-840c-80ff6e15b95e.png',
 'actors':'exec-ec7739ba-4c1d-4c56-a841-8e53029445f9.png',
 'card-art':'exec-ccffd748-d4b9-4aff-98e8-899c180edf33.png',
 'factory-art':'exec-c063ba8c-b0ab-4ac2-8062-85aef4e6fb85.png',
 'story-scenes':'exec-821d7c0a-d9fc-4913-be4e-eeb2d5b00eed.png'
}
SRC.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
for name,file in FILES.items():
    shutil.copy2(GEN/file,SRC/(name+'.png'))
    im=Image.open(SRC/(name+'.png')).convert('RGBA')
    if name in ['night','arena']:
        im.save(OUT/(name+'.webp'),quality=91,method=6)
    elif name=='story-scenes':
        for row,label in enumerate(['checkpoint-scene','radio-scene']):
            cell=im.crop((0,round(row*im.height/2),im.width,round((row+1)*im.height/2)))
            cell.save(OUT/(label+'.webp'),quality=92,method=6)
    elif name=='actors':
        for row,prefix in enumerate(['worker','fighter','enemy']):
            for col in range(4):
                cell=im.crop((round(col*im.width/4),round(row*im.height/3),round((col+1)*im.width/4),round((row+1)*im.height/3)))
                bbox=cell.getchannel('A').getbbox()
                if bbox:cell=cell.crop(bbox)
                cell.save(OUT/(f'{prefix}-{col}.webp'),quality=94,method=6)
    elif name=='factory-art':
        for row in range(2):
            for col in range(3):
                cell=im.crop((round(col*im.width/3),round(row*im.height/2),round((col+1)*im.width/3),round((row+1)*im.height/2)))
                bbox=cell.getchannel('A').getbbox()
                if bbox:cell=cell.crop(bbox)
                cell.save(OUT/(f'machine-{row*3+col}.webp'),quality=92,method=6)
    else:
        for row in range(3):
            for col in range(4):
                cell=im.crop((round(col*im.width/4)+10,round(row*im.height/3)+10,round((col+1)*im.width/4)-10,round((row+1)*im.height/3)-10))
                cell.save(OUT/(f'card-{row*4+col}.webp'),quality=90,method=6)
print(json.dumps({'generated':FILES,'runtimeImages':len(list(OUT.glob('*.webp'))),'alphaWorker':Image.open(OUT/'worker-0.webp').getextrema()[-1]},ensure_ascii=False))
