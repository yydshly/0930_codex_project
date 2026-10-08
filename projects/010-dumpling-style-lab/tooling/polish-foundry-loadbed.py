from pathlib import Path
P=Path(__file__).resolve().parents[1]/'web';p=P/'showcase-foundry-scenes.js';s=p.read_text(encoding='utf-8')
s=s.replace("vehicle.add(body);textureModel", "vehicle.add(body);body.rotation.y=Math.PI;textureModel")
s=s.replace("const core=box(vehicle", "box(vehicle,[1.75,.13,1.5],ivory,[0,1,.75]);const core=box(vehicle")
s=s.replace("new THREE.Vector3(0,.65,.7)", "new THREE.Vector3(0,1.62,.75)")
p.write_text(s,encoding='utf-8')
p=P/'showcase-foundry-rules.js';s=p.read_text(encoding='utf-8').replace('bodyY:.9,','bodyY:1.12,')
s=s.replace("if(k==='launch'&&s.phase==='build')", "if(s.phase==='build'&&['part','undo'].includes(k))s.bodyY=terrainHeight(s.x,s.z)+rigSpecs(s.config).radius+.5;\n+ if(k==='launch'&&s.phase==='build')".replace('\n+','\n'))
p.write_text(s,encoding='utf-8');print('Aligned chassis heading, tire ride height, and payload support')
