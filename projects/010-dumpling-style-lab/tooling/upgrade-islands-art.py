from pathlib import Path
import shutil
p=Path(__file__).resolve().parents[1];g=p/'web/games';b=p/'assets/worlds-product/source-before/games';b.mkdir(parents=True,exist_ok=True)
path=g/'islands-art.js'
if not (b/path.name).exists():shutil.copy2(path,b/path.name)
s=path.read_text(encoding='utf-8');assert 'terrainTexture' not in s
s=s.replace('renderer.toneMappingExposure=1.12','renderer.toneMappingExposure=1.02').replace('sun.shadow.mapSize.set(1024,1024)','sun.shadow.mapSize.set(2048,2048)')
s=s.replace("'#5d7e92',2.25","'#435969',1.3").replace("'#fff3cc',3.1","'#fff0cd',2.4").replace("'#b9dbeb',.7","'#b9dbeb',.45")
# Keep actual meshes, shadows and camera projection; add subtle material relief instead of a flat image.
pos=s.index(' function mat(')
textures='''
 function terrainTexture(kind){const cvs=document.createElement('canvas');cvs.width=cvs.height=256;const q=cvs.getContext('2d');q.fillStyle=kind==='wood'?'#d8c5a6':kind==='stone'?'#c5c8c1':'#d7dfc1';q.fillRect(0,0,256,256);for(let i=0;i<2400;i++){const v=Math.sin(i*127.17)*17321.13,f=v-Math.floor(v),x=(i*97.67)%256,y=(i*43.71)%256;q.fillStyle=f>.5?'#ffffff16':'#29392818';q.fillRect(x,y,kind==='wood'?8+f*23:1+f*3,kind==='wood'?.7:1+f*2)}if(kind==='wood'){q.strokeStyle='#75624624';for(let y=4;y<256;y+=13){q.beginPath();for(let x=0;x<=256;x+=16)x?q.lineTo(x,y+Math.sin(x*.04+y)*2):q.moveTo(x,y);q.stroke()}}const t=new T.CanvasTexture(cvs);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;textures.add(t);return t}
 const woodTexture=terrainTexture('wood'),stoneTexture=terrainTexture('stone'),grassTexture=terrainTexture('grass');
 const woods=new Set(['#b49a70','#b18d62','#806e57','#ab916c','#7c735f','#b58359','#ddb37a','#b28b61','#957d66','#ab7752','#c29163','#8d7a64','#ae936b']);
'''
s=s[:pos]+textures+s[pos:]
s=s.replace('roughness:.91,flatShading:true,emissive:',"roughness:.91,flatShading:true,map:woods.has(col)?woodTexture:col==='#c2c5b7'||col==='#b9c8bd'?stoneTexture:null,emissive:")
s=s.replace('const geo=new T.BufferGeometry();geo.setAttribute(\'position\',new T.Float32BufferAttribute(pos,3));geo.setAttribute(\'color\'',"const geo=new T.BufferGeometry();const uv=[];for(let j=0;j<pos.length;j+=3)uv.push((pos[j]-land.x)/land.rx*.5+.5,(pos[j+2]-land.z)/land.rz*.5+.5);geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color'")
s=s.replace('vertexColors:true,roughness:1,side:T.DoubleSide,flatShading:true','vertexColors:true,map:grassTexture,roughness:1,side:T.DoubleSide,flatShading:true')
start=s.index(' function pine(');end=s.index(' function grass(',start)
s=s[:start]+''' function pine(g,x,z,size=1){rod(g,[x,0,z],[x,2.45*size,z],.08*size,'#655a49');for(let layer=0;layer<5;layer++){const height=(.9+layer*.34)*size,span=(.76-layer*.1)*size;for(let j=0;j<5;j++){const a=j*1.257+layer*.4,xx=x+Math.cos(a)*span*.4,zz=z+Math.sin(a)*span*.4;const crown=mesh(g,new T.ConeGeometry(span*.7,.8*size,7),['#315c4c','#436b53','#578264','#72966c','#88a578'][layer],xx,height,zz);crown.rotation.y=a;crown.scale.z=.88}}}
'''+s[end:]
s=s.replace('i<18;i++','i<42;i++').replace("island(areaGroup,land,'#a9ae80','#5c7379')","island(areaGroup,land,'#8a986b','#4e6169')")
# Adult explorer: head is one-sixth of total height, long legs and a practical backpack.
start=s.index(' const hero=new T.Group()');end=s.index('const handLamp=',start)
s=s[:start]+''' const hero=new T.Group(),rig=new T.Group();hero.add(rig);scene.add(hero);box(rig,0,1.01,0,.36,.72,.26,'#366c81');box(rig,0,1.06,-.19,.3,.46,.16,'#b28b61');cyl(rig,0,1.39,0,.065,.073,.13,'#d8b892',8);rock(rig,0,1.56,0,.15,'#dfba92',[.91,1.08,.91]);cyl(rig,0,1.72,0,.23,.24,.052,'#e4be77',12);cyl(rig,0,1.79,0,.16,.18,.13,'#cb9c61',10);for(const x of [-.05,.05]){rock(rig,x,1.57,.132,.033,'#536574',[1,.68,.35]);rock(rig,x,1.578,.148,.02,'#a9c6cd',[1,.7,.2])}rod(rig,[-.14,1.31,.143],[-.12,.78,.143],.013,'#b5946f');rod(rig,[.14,1.31,.143],[.12,.78,.143],.013,'#b5946f');box(rig,0,.7,0,.38,.075,.28,'#735c42');const arms=[],legs=[];for(const sign of [-1,1]){const a=new T.Group();a.position.set(sign*.225,1.28,0);rig.add(a);box(a,0,-.23,0,.105,.46,.12,'#477d8b');rock(a,0,-.48,.018,.06,'#d5ae86');arms.push(a);const l=new T.Group();l.position.set(sign*.102,.68,0);rig.add(l);box(l,0,-.245,0,.125,.49,.14,'#525f6a');box(l,0,-.566,.06,.155,.14,.235,'#80654f');legs.push(l)}'''+s[end:]
s=s.replace("handLamp.position.set(.28,.5,.12)","handLamp.position.set(.26,.73,.12)")
# Frame the routes closer, without camera tracking that would invalidate clicking.
s=s.replace('camera.left=-11.8;camera.right=11.8;camera.top=11.8/aspect;camera.bottom=-11.8/aspect','camera.left=-9.8;camera.right=9.8;camera.top=9.8/aspect;camera.bottom=-9.8/aspect')
path.write_text(s,encoding='utf-8')
path=g/'islands.js';s=path.read_text(encoding='utf-8').replace("'./islands-art.js'","'./islands-art.js?v=2'");path.write_text(s,encoding='utf-8')
print('Upgraded actual 3D materials, lighting, foliage, explorer proportions and framing.')
