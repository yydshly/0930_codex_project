"""Prepare generated original art, transparent sprites, and original rhythm music."""
from pathlib import Path
from collections import deque
from PIL import Image
import numpy as np
import json, shutil, wave

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/game-forms/interaction-sources'
PUBLIC = ROOT / 'web/assets/game-forms'
SOURCE.mkdir(parents=True, exist_ok=True)
generation_path = ROOT / 'assets/game-forms/interaction-generation-20261003.json'
generation = json.loads(generation_path.read_text(encoding='utf-8'))
sources = {
 'duelScene':'exec-b016e919-88e7-4063-84d9-b42dd84d4456.png',
 'duelSprites':'exec-8a1bb92d-4418-4a5d-9d1c-9edbc35ac524.png',
 'mazeSprites':'exec-02654044-c996-49a2-94ff-1f2dd7fbfa4f.png',
 'rhythmScene':'exec-e6262b6d-10fe-4087-8b23-848ce7d1629f.png',
}
for entry in generation['entries']:
    original = Path('D:/codex/home/generated_images/01a0f829-1d38-7672-a112-e0a52908ac0c') / sources[entry['id']]
    target = SOURCE / (entry['id']+'.png')
    shutil.copy2(original, target)
    entry['source'] = str(original)
    entry['project_source'] = str(target)
generation_path.write_text(json.dumps(generation, ensure_ascii=False, indent=2), encoding='utf-8')
report = []

def scene(source, game):
    destination = PUBLIC / game
    destination.mkdir(parents=True, exist_ok=True)
    im = Image.open(SOURCE / (source+'.png')).convert('RGB')
    im.thumbnail((1800,1800), Image.Resampling.LANCZOS)
    im.save(destination / 'scene.webp', quality=94, method=4)

def atlas(source, game, names, rows):
    im = Image.open(SOURCE / (source+'.png')).convert('RGBA')
    assert im.getchannel('A').getextrema()[0] == 0
    scale = 4
    mask = np.array(im.getchannel('A').resize((im.width//scale,im.height//scale),Image.Resampling.BOX)) > 40
    boxes=[]
    for sy,sx in np.argwhere(mask):
        if not mask[sy,sx]: continue
        queue=deque([(int(sy),int(sx))]); mask[sy,sx]=False
        left=right=int(sx); top=bottom=int(sy); area=0
        while queue:
            y,x=queue.popleft(); area+=1
            left=min(left,x);right=max(right,x);top=min(top,y);bottom=max(bottom,y)
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny,nx=y+dy,x+dx
                if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx]:
                    mask[ny,nx]=False;queue.append((ny,nx))
        if area>220: boxes.append((left*scale,top*scale,(right+1)*scale,(bottom+1)*scale))
    assert len(boxes)==len(names),(source,boxes)
    boxes.sort(key=lambda b:(int((b[1]+b[3])/2/im.height*rows),(b[0]+b[2])/2))
    destination=PUBLIC / game
    destination.mkdir(parents=True,exist_ok=True)
    for name,box in zip(names,boxes):
        crop=(max(0,box[0]-4),max(0,box[1]-4),min(im.width,box[2]+4),min(im.height,box[3]+4))
        asset=im.crop(crop);asset.thumbnail((540,510),Image.Resampling.LANCZOS)
        asset.save(destination/(name+'.webp'),quality=94,method=4)
        report.append({'game':game,'name':name,'crop':crop,'size':asset.size})

scene('duelScene','duel')
scene('rhythmScene','rhythm')
atlas('duelSprites','duel',[p+'-'+pose for p in ('hero','rival') for pose in ('idle','walk-a','walk-b','jab','kick','guard','jump','hurt')],4)
atlas('mazeSprites','maze',['up','right','down','left','red','violet','battery','portal'],2)

# An original 108 BPM, sixteen-bar synth arrangement; audio and chart share the same clock.
sr=22050;beat=60/108;duration=72*beat
song=np.zeros(int(duration*sr),dtype=np.float64)
rng=np.random.default_rng(1842)
def put(start,signal,volume):
    i=int(start*sr);n=min(len(signal),len(song)-i)
    if n>0:song[i:i+n]+=signal[:n]*volume
def tone(start,midi,length,volume,kind='keys'):
    t=np.arange(int(length*sr))/sr;f=440*2**((midi-69)/12)
    env=(1-np.exp(-t*120))*np.exp(-t/(length*.42))
    signal=np.sin(2*np.pi*f*t)+.27*np.sin(4*np.pi*f*t)+.09*np.sin(6*np.pi*f*t)
    if kind=='pad':env=np.minimum(1,t/.13)*np.minimum(1,(length-t)/.3);signal=np.sin(2*np.pi*f*t)+.18*np.sin(2*np.pi*f*1.003*t)
    put(start,signal*env,volume)
def kick(start):
    t=np.arange(int(.25*sr))/sr;put(start,np.sin(2*np.pi*(45*t+3.2*(1-np.exp(-t*35))))*np.exp(-t*19),.26)
def snare(start):
    t=np.arange(int(.17*sr))/sr;noise=rng.normal(0,1,len(t));put(start,(noise*.55+np.sin(2*np.pi*185*t)*.35)*np.exp(-t*30),.15)
def hat(start):
    t=np.arange(int(.07*sr))/sr;noise=rng.normal(0,1,len(t));noise=np.diff(noise,prepend=0);put(start,noise*np.exp(-t*75),.027)
chords=[(48,[60,63,67]),(44,[56,60,63]),(46,[58,62,65]),(43,[55,58,62])]
for count in range(4):tone(count*beat,84,.08,.11)
for b in range(64):
    start=(4+b)*beat;root,notes=chords[(b//4)%4]
    kick(start)
    if b%4 in (1,3):snare(start)
    hat(start);hat(start+beat/2)
    tone(start,root,beat*.9,.13)
    tone(start,notes[b%3]+12,beat*.8,.073)
    if b%4==2:tone(start+beat/2,notes[(b+1)%3]+12,beat*.5,.085)
    if b%4==0:
        for midi in notes:tone(start,midi,beat*3.7,.035,'pad')
song*=.88/max(.88,float(np.max(np.abs(song))))
destination=PUBLIC/'rhythm';destination.mkdir(parents=True,exist_ok=True)
with wave.open(str(destination/'night-sailing.wav'),'wb') as out:
    out.setnchannels(1);out.setsampwidth(2);out.setframerate(sr);out.writeframes((song*32767).astype('<i2').tobytes())
(ROOT/'notes/interaction-assets-20261003.json').write_text(json.dumps({'sprites':report,'music':{'title':'Night Sailing / 拍点夜航','bpm':108,'bars':16,'countInBeats':4,'duration':duration,'sampleRate':sr,'composition':'Original deterministic synthesized keys, bass, pads, drums; no third-party recording.'}},indent=2),encoding='utf-8')
# Temporary art previews are replaced with actual playable screenshots after verification.
for game in ('duel','rhythm'):
    im=Image.open(PUBLIC/game/'scene.webp');im.thumbnail((720,405));im.save(ROOT/'web/assets/showcase/previews'/(game+'.webp'),quality=90)
im=Image.open(PUBLIC/'maze/right.webp');canvas=Image.new('RGB',(720,405),'#091527');canvas.paste(im.resize((180,180)),(270,112),im.resize((180,180)).getchannel('A'));canvas.save(ROOT/'web/assets/showcase/previews/maze.webp',quality=90)
print('Prepared',len(report),'transparent sprites and',round(duration,2),'seconds of original audio')
