from pathlib import Path
p=Path(__file__).resolve().parents[1]
f=p/'web/showcase-circuitry-3d.js'
s=f.read_text(encoding='utf-8')
a="const texture=new THREE.Texture(art.enamel);texture.needsUpdate=true;texture.colorSpace=THREE.SRGBColorSpace;const materials=COLORS.map(color=>new THREE.MeshStandardMaterial({color,map:texture,roughness:.36,metalness:.1}))"
b="const textures=COLORS.map(color=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');c.drawImage(art.enamel,0,0,512,512);c.globalCompositeOperation='multiply';c.fillStyle=color;c.fillRect(0,0,512,512);c.globalCompositeOperation='source-over';const t=new THREE.Texture(canvas);t.needsUpdate=true;t.colorSpace=THREE.SRGBColorSpace;return t;});const materials=textures.map(map=>new THREE.MeshStandardMaterial({map,roughness:.36,metalness:.1}))"
assert a in s
s=s.replace(a,b).replace('cubies,stickers,texture,update','cubies,stickers,textures,update').replace('world.texture.dispose();','world.textures.forEach(t=>t.dispose());')
f.write_text(s,encoding='utf-8')
source=(p/'tooling/render-thresholds-scenes.mjs').read_text(encoding='utf-8')
source=source.replace('thresholds','circuitry').replace('Thresholds','Circuitry')
source=source.replace("const canvas=host.children.find(v=>v.canvas).canvas,file=id+'-'+phase+'.png';", "const canvas=new Canvas(1120,630),ctx=canvas.getContext('2d');for(const el of host.children.filter(v=>v.canvas))ctx.drawImage(el.canvas,0,0,1120,630);const file=id+'-'+phase+'.png';")
source=source.replace('native microphone or browser persistence','browser WebGL, actual audio output or browser persistence')
(p/'tooling/render-circuitry-scenes.mjs').write_text(source,encoding='utf-8')
