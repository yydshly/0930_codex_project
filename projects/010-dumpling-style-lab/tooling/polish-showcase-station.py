from pathlib import Path
file=Path(__file__).resolve().parents[1]/'web/showcase-spatial.js'
text=file.read_text(encoding='utf-8')
def swap(old,new):
    global text
    assert old in text,old[:100]
    text=text.replace(old,new,1)
swap('let time=0,shootCD=0,flash=0;const uses=[],doors=[],occluders=[],targets=[],beams=[];', 'let time=0,shootCD=0,flash=0,stepClock=0;const uses=[],doors=[],occluders=[],targets=[],beams=[],roomLights=[];const hud=document.createElement("div");hud.className="scene-hud";host.append(hud);const disposeWorld=world.dispose;world.dispose=()=>{hud.remove();disposeWorld()};')
swap("camera.rotation.set(s.pitch,s.yaw,0,'YXZ');", "camera.rotation.set(s.pitch,s.yaw,0,'YXZ');scene.add(camera);",)
swap('light(scene,-2.8,2.3,cz+1,0x73bad0,8,9);light(scene,2.5,2.2,cz-2,0xffbc6f,7,8);', 'roomLights.push(light(scene,-2.8,2.3,cz+1,0x73bad0,8,9));light(scene,2.5,2.2,cz-2,0xffbc6f,7,8);')
swap("s.solved[0]=s.mirror===1;", "s.solved[0]=s.mirror===1;if(s.solved[0])sfx('door');")
swap("function nearUse(){const nearest=uses.filter", "function nearest(){return uses.filter")
swap("-Math.hypot(s.x-b.userData.use.x,s.z-b.userData.use.z))[0];use(nearest)}", "-Math.hypot(s.x-b.userData.use.x,s.z-b.userData.use.z))[0]}function nearUse(){use(nearest())}")
old="tick(dt){time+=dt;if(s.won)return;move(dt);if(input.pressed.has('KeyE'))nearUse();clickUse(use);const dirs=[[3,0],[0,-3],[-3,0],[0,3]],p=dirs[s.mirror];setBeam(beams[0],[[-3,1.05,0],[0,1.05,0],[p[0],1.05,p[1]]]);reflector.rotation.y=s.mirror*Math.PI/2+.78;doors.forEach((d,i)=>{d.position.y=THREE.MathUtils.lerp(d.position.y,s.solved[i]?2.7:0,dt*5)});if(s.battery==='held'){battery.position.set(s.x+Math.cos(s.yaw)*.4,.6,s.z-Math.cos(s.yaw)*.5);battery.scale.setScalar(.5)}else if(s.battery==='installed'){battery.position.set(2,.2,-12);battery.scale.setScalar(.55)}camera.position.set(s.x,1.65,s.z);camera.rotation.set(s.pitch,s.yaw,0,'YXZ');if(s.z<-25&&s.solved.every(Boolean)){s.won=true;sfx('success');notify('你走出了封闭车站。最后一班列车的灯，亮了。')}}"
new="tick(dt){time+=dt;if(!s.won){move(dt);if(input.pressed.has('KeyE'))nearUse();clickUse(use)}camera.position.set(s.x,1.65+(input.x||input.y?Math.sin(time*9)*.018:0),s.z);camera.rotation.set(s.pitch,s.yaw,0,'YXZ');syncStation(dt);if(!s.won&&s.z<-25&&s.solved.every(Boolean)){s.won=true;sfx('success');notify('你走出了封闭车站。最后一班列车的灯，亮了。')}}"
swap(old,new)
insert="""
  function syncStation(dt=0){
    const dirs=[[3,0],[0,-3],[-3,0],[0,3]],p=dirs[s.mirror];
    setBeam(beams[0],[[-3,1.05,0],[0,1.05,0],[p[0],1.05,p[1]]]);
    reflector.rotation.y=s.mirror*Math.PI/2+.78;
    doors.forEach((d,i)=>{d.position.y=dt?THREE.MathUtils.lerp(d.position.y,s.solved[i]?2.7:0,Math.min(1,dt*5)):s.solved[i]?2.7:0});
    roomLights.forEach((l,i)=>{l.color.set(s.solved[i]?0x92efc7:0x73bad0);l.intensity=s.solved[i]?12:7});
    if(s.battery==='held'){if(battery.parent!==camera)camera.add(battery);battery.position.set(.43,-.48,-.78);battery.rotation.y=.2;battery.scale.setScalar(.45)}
    else {if(battery.parent!==scene)scene.add(battery);battery.rotation.y=0;battery.position.set(s.battery==='installed'?2:-2,s.battery==='installed'?.2:0,s.battery==='installed'?-12:-8);battery.scale.setScalar(s.battery==='installed'?.55:1)}
    const target=nearest(),u=target?.userData.use,close=u&&Math.hypot(s.x-u.x,s.z-u.z)<2.2;
    const names={mirror:'转动光路',battery:'拿起备用电池',socket:s.battery==='held'?'装入备用电池':'检查能源插槽',panel:'接通信号'};
    hud.textContent=s.won?'通路已恢复 · 列车还在等你':close?'E · '+names[u.type]:'通路 '+s.solved.filter(Boolean).length+'/3 · '+(s.battery==='held'?'电池搬运中':'靠近设备按 E');
  }
  syncStation();
"""
swap('  batchStatic(scene,scene.children.filter',insert+'  batchStatic(scene,scene.children.filter')
# The visual state is reconstructed even when a saved game is already complete.
swap("function clickUse(use){if(!input.pointers.length)return;", "function clickUse(use){if(!input.pointers.length)return;")
swap("uses.filter(o=>o.visible)","uses.filter(o=>o.visible&&!(o.userData.use.type==='battery'&&s.battery!=='floor'))")
old="s.x=clamp(x,-3.8,3.8);s.z=zz"
new="""const blocked=(xx,zz)=>uses.some(o=>{const u=o.userData.use;if(u.type==='panel'||u.type==='battery'&&s.battery!=='floor')return false;return Math.hypot(xx-u.x,zz-u.z)<(u.type==='mirror'?.74:u.type==='socket'?.65:.38)});if(!blocked(x,s.z))s.x=clamp(x,-3.8,3.8);if(!blocked(s.x,zz))s.z=zz"""
swap(old,new)
swap("function move(dt){s.yaw", "function move(dt){if(input.x||input.y){stepClock+=dt;if(stepClock>.45){stepClock=0;sfx('step')}}s.yaw")
swap("let hurt=0;", "let hurt=0,hitmark=0;const hitMarker=document.createElement('div');hitMarker.className='hit-marker';hitMarker.textContent='×';hitMarker.hidden=true;host.append(hitMarker);const stationDispose=world.dispose;world.dispose=()=>{damageOverlay.remove();hitMarker.remove();stationDispose()};")
swap("s.hits++;sfx('pickup')", "s.hits++;hitmark=.3;sfx('pickup')")
swap("tick(dt){time+=dt;hurt=Math.max(0,hurt-dt);", "tick(dt){time+=dt;hitmark=Math.max(0,hitmark-dt);hitMarker.hidden=hitmark<=0;hud.textContent='生命 '+Math.ceil(s.hp)+' · '+(s.reload>0?'正在换弹':'弹药 '+s.ammo+'/12')+' · 靶机 '+s.dead.length+'/8';hurt=Math.max(0,hurt-dt);")
file.write_text(text,encoding='utf-8')
