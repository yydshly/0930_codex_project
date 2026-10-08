from PIL import Image
from pathlib import Path
import json
P=Path(__file__).resolve().parents[1]
for key in ['courier','crew','explorer','clockbridge']:
 im=Image.open(P/f'assets/game-forms/kinetics-sources/{key}.png');a=im.getchannel('A')
 print(key,'corners',[a.getpixel(p) for p in [(0,0),(20,20),(im.width//2,10)]], 'bounds',[(n,a.point(lambda v:255 if v>=n else 0).getbbox()) for n in [16,64,128,224]])
