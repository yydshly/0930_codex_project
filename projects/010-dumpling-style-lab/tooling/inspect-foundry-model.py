import json,struct,numpy as np
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'assets/game-forms/foundry-sources/rover.glb';b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);raw=b[28+n:]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];t={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']];k={'SCALAR':1,'VEC3':3,'VEC2':2}[a['type']];return np.frombuffer(raw,dtype=t,count=a['count']*k,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,k)
for p in j['meshes'][0]['primitives']:
 v=acc(p['attributes']['POSITION']);tri=acc(p['indices']).reshape(-1,3);keys=[tuple(np.round(x,6)) for x in v];adj={k:set() for k in keys}
 for t in tri:
  aa=[keys[int(i)] for i in t]
  for k in aa:adj[k].update(aa)
 seen=set();components=[]
 for k in adj:
  if k in seen:continue
  stack=[k];seen.add(k);pts=[]
  while stack:
   q=stack.pop();pts.append(q)
   for w in adj[q]-seen:seen.add(w);stack.append(w)
  a=np.array(pts);components.append([len(pts),a.min(axis=0).tolist(),a.max(axis=0).tolist()])
 print(j['materials'][p['material']]['name'],components)
