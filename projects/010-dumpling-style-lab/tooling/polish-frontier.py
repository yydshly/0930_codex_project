from pathlib import Path
P=Path(__file__).resolve().parents[1];W=P/'web'
f=W/'showcase-frontier-3d.js';s=f.read_text(encoding='utf-8')
s=s.replace('sea.rotation.x=-Math.PI/2;',"sea.rotation.x=-Math.PI/2;sea.name='frontier-sea';")
s=s.replace('if(!o.isMesh)return;',"if(!o.isMesh||o.name==='frontier-sea')return;")
s=s.replace("function run(value){if(!active)return;const [key,arg]=value.split(':');if(key==='restart'){s=freshFrontier(id);held.clear();}else if(key==='orbit')orbit=!orbit;else if(commandFrontier(s,key,arg===undefined?undefined:Number(arg)))sfx('turn');sync();}","function run(value){if(!active)return;const [key,arg]=value.split(':');if(key==='restart'){s=freshFrontier(id);held.clear();}else if(key==='orbit')orbit=!orbit;else if(commandFrontier(s,key,arg===undefined?undefined:Number(arg))){if(key==='capture'){draw();try{if(surface.element.toDataURL){s.photoFrames??=[];s.photoFrames[s.selected]=surface.element.toDataURL('image/webp',.65);}}catch{}}sfx('turn');}sync();}")
s=s.replace("photo.hidden=id!=='expose'||!s.photos[s.selected]||s.won;", "photo.hidden=id!=='expose'||!s.photos[s.selected]||s.won;if(id==='expose'&&s.photoFrames?.[s.selected])photo.style.backgroundImage='url('+s.photoFrames[s.selected]+')';")
f.write_text(s,encoding='utf-8')
f=W/'showcase-frontier-room.js';s=f.read_text(encoding='utf-8')
s=s.replace("q.x+=(target.x-q.x)*.16;q.y+=(target.y-q.y)*.16;positions.set(p.id,q);", "positions.set(p.id,q);")
s=s.replace("timer+=dt;if(timer>=1)", "for(const p of s.view?.players||[]){const q=positions.get(p.id),i=s.view.players.indexOf(p),t=ROOM_STATIONS[p.station],offset=(i-(s.view.players.length-1)/2)*21;if(q){const blend=1-Math.exp(-9*dt);q.x+=(t.x+offset-q.x)*blend;q.y+=(t.y+12-q.y)*blend;}}timer+=dt;if(timer>=1)")
f.write_text(s,encoding='utf-8')
print('Fixed fallback sea depth, captured-photo thumbnail and paused room animation.')
