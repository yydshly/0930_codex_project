from pathlib import Path
P=Path(__file__).resolve().parents[1];W=P/'web'
f=W/'showcase-frontier-3d.js';s=f.read_text(encoding='utf-8')
s=s.replace('new THREE.SphereGeometry(.4,8,6)','new THREE.SphereGeometry(.4,16,12)')
s=s.replace("i===0?.27:.2*(1-i/38)","i===0?.32:.24*(1-i/38)")
s=s.replace("dynamic.eyes=[-1,1].map", "dynamic.links=Array.from({length:27},(_,i)=>mesh(new THREE.CylinderGeometry(.24*(1-i/38),.24*(1-(i+1)/38),1,12),skin,0,0,0));dynamic.eyes=[-1,1].map")
s=s.replace("dynamic.body.forEach((m,i)=>m.position.set(s.joints[i].x,s.joints[i].y,s.joints[i].z));const h=s.head", "dynamic.body.forEach((m,i)=>{const p=i===0?s.head:s.joints[i];m.position.set(p.x,p.y,p.z);});dynamic.links.forEach((m,i)=>{const a=i===0?s.head:s.joints[i],b=s.joints[i+1],dir=new THREE.Vector3(b.x-a.x,b.y-a.y,b.z-a.z);m.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);m.scale.y=dir.length();m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());});const h=s.head")
f.write_text(s,encoding='utf-8')
f=W/'showcase-frontier-rules.js';s=f.read_text(encoding='utf-8')
s=s.replace("return {...base,cells,life:Array(5376)","for(let yy=22;yy<29;yy++)for(let xx=7;xx<25;xx++)cells[yy*96+xx]=yy<26?3:2;return {...base,cells,life:Array(5376)")
f.write_text(s,encoding='utf-8')
f=P/'tooling/frontier-playthroughs.mjs';s=f.read_text(encoding='utf-8');s=s.replace("for(let i=0;i<8;i++)cmd(s,'rise');", "for(let i=0;i<8;i++){cmd(s,'rise');tick(s,.05);}");s=s.replace("for(let i=0;i<10;i++)cmd(s,'rise');", "for(let i=0;i<10;i++){cmd(s,'rise');tick(s,.05);}");f.write_text(s,encoding='utf-8')
f=P/'tooling/render-frontier-scenes.mjs';s=f.read_text(encoding='utf-8');s=s.replace("if(id!=='assembly')assert(","assert(");s=s.replace('pause_pixels_verified_except_room:true','pause_pixels_verified:true');f.write_text(s,encoding='utf-8')
f=W/'showcase-catalog.js';s=f.read_text(encoding='utf-8');needle='for(const direction of newDirections)if(';s=s.replace(needle,"for(const d of newDirections)if(['tempo','flux','coil','axiom','folio','expose','script','echo','assembly'].includes(d.id))d.previewKind=['coil','expose'].includes(d.id)?'同场景三维兼容渲染预览':'生产场景绘制预览';\n"+needle);f.write_text(s,encoding='utf-8')
for file,var in [('showcase.js','im'),('forms.js','image')]:
 f=W/file;s=f.read_text(encoding='utf-8');s=s.replace(var+".alt=d.title+'实际游戏画面'",var+".alt=d.title+(d.previewKind||'实际游戏画面')");f.write_text(s,encoding='utf-8')
print('Polished continuous serpent body, materials opening and accurate preview labels.')
