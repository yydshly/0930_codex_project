from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
for pack in ['town','farm']:
    sheet=Image.new('RGB',(12*80,11*96),'#dde4cf');draw=ImageDraw.Draw(sheet)
    for i in range(132):
        tile=Image.open(root/f'web/assets/showcase/{pack}/tile_{i:04}.png').convert('RGBA').resize((64,64),Image.Resampling.NEAREST)
        x=i%12*80;y=i//12*96;sheet.paste(tile,(x+8,y),tile);draw.text((x+25,y+69),str(i),fill='#101b22')
    sheet.save(root/f'assets/showcase/{pack}-indexed.png')
