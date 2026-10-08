import {pointerPosition} from './showcase-precision-kit.js';
import {restoreKinetics,commandKinetics,stepKinetics,SCALE} from './showcase-kinetics-rules.js';
import {kineticsPanel,KINETICS_INFO} from './showcase-kinetics-panel.js';
export function kineticsController(options,surface){
 const {id,host,input,saved,sfx=()=>{}}=options,element=surface.element;let s=restoreKinetics(id,saved),active=false,disposed=false,drag=null;const holds=new Set(),events=new AbortController(),signal=events.signal;
 element.style.touchAction='none';element.setAttribute('aria-label',KINETICS_INFO[id].title+'。'+KINETICS_INFO[id].help);
 const stats=()=>id==='ribbon'?[`墨水 ${Math.round(s.ink)}/1500`,`风印 ${s.stars.filter(Boolean).length}/3`,s.running?'沿线行进':s.failed?'补上缺口':'绘制路线']:id==='rescue'?[`救出 ${s.rescued}/12`,`损失 ${s.lost}/2`,`已入场 ${s.spawned}/12`,`选择 ${s.selected+1} 号`,s.running?'队伍行进':'安排技能']:id==='rewind'?[`可回退 ${(s.history.length/30).toFixed(1)} 秒`,s.persistent.crystal?'晶石 · 时间例外':'下层晶石待取',s.persistent.sealed?'桥已锁定':s.rewinding?'世界回溯中':'桥尚未锁定']:['模型 1 : 庭院 8',s.mode==='model'?'编辑小模型':'进入大庭院',`木桥 ${s.selected+1}`,surface.mode||'真实三维'];
 let ui;const sync=()=>{surface.update?.(s);ui?.sync(active,s,stats());};
 function run(key,value){if(!active||disposed)return false;let [k,a]=key.split(':'),v=value??(a!==undefined&&Number.isFinite(+a)?+a:a);
  if(k==='rotate'&&value===undefined)v=+a*Math.PI/2;if(k==='shift'&&value===undefined)v={x:a==='left'?-.25:a==='right'?.25:0,z:a==='up'?-.25:a==='down'?.25:0};if(k==='orbit'&&value===undefined)v={x:+a*.15,y:0};
  const won=s.won,ok=commandKinetics(s,k,v);if(ok&&!['stroke','begin','end','move','orbit','rewind'].includes(k))sfx(!won&&s.won?'success':'turn');sync();return ok;
 }
 const hold=(k,on)=>{if(!active)return;on?holds.add(k):holds.delete(k);if(k==='rewind')run('rewind',on);};ui=kineticsPanel(host,id,run,hold);sync();
 const release=()=>{const p=drag?.pointerId;drag=null;holds.clear();if(id==='ribbon')commandKinetics(s,'end');if(id==='rewind'&&s.rewinding)commandKinetics(s,'rewind',false);if(p!==undefined&&element.hasPointerCapture?.(p))element.releasePointerCapture(p);};
 element.addEventListener('pointerdown',e=>{if(!active||disposed)return;e.preventDefault();element.focus({preventScroll:true});const p=pointerPosition(element,e);if(p.x<0||p.x>1120||p.y<0||p.y>630)return;
  if(id==='ribbon'){if(s.running||!run('begin',p))return;drag={pointerId:e.pointerId};}
  if(id==='rescue'){const candidates=s.workers.filter(w=>w.status==='live'&&Math.abs(w.x-p.x)<23&&Math.abs(w.y-24-p.y)<34).sort((a,b)=>Math.hypot(a.x-p.x,a.y-24-p.y)-Math.hypot(b.x-p.x,b.y-24-p.y));if(candidates[0])run('select',candidates[0].index);return;}
  if(id==='nested'){const hit=surface.pick?.(s,p);if(hit&&s.mode==='model'){run('select',hit.index);run('begin');drag={pointerId:e.pointerId,model:true,offset:{mx:s.bridges[hit.index].mx-hit.mx,mz:s.bridges[hit.index].mz-hit.mz}};}else drag={pointerId:e.pointerId,p};}
  if(drag)element.setPointerCapture(e.pointerId);
 },{signal});
 element.addEventListener('pointermove',e=>{if(!active||!drag||drag.pointerId!==e.pointerId)return;const p=pointerPosition(element,e);if(id==='ribbon')run('stroke',p);if(id==='nested'){if(drag.model){const q=surface.modelPoint?.(p);if(q)run('move',{mx:q.mx+drag.offset.mx,mz:q.mz+drag.offset.mz});}else{run('orbit',{x:-(p.x-drag.p.x)*.006,y:(p.y-drag.p.y)*.005});drag.p=p;}}},{signal});
 for(const t of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(t,release,{signal});window.addEventListener('blur',release,{signal});
 element.addEventListener('wheel',e=>{if(active&&id==='nested'){e.preventDefault();run('zoom',e.deltaY<0?.08:-.08);}},{signal,passive:false});
 return {onStart(){if(disposed)return;active=true;sync();},setActive(v){if(disposed||active===v)return;if(!v)release();active=v;sync();},command:run,tick(dt){if(!active||disposed)return;
  const x=Math.max(-1,Math.min(1,(input?.x||0)+(holds.has('right')?1:0)-(holds.has('left')?1:0))),y=Math.max(-1,Math.min(1,(input?.y||0)+(holds.has('down')?1:0)-(holds.has('up')?1:0)));
  if(id==='ribbon'&&input?.pressed?.has('Space'))run(s.running?'dash':'launch');
  if(id==='rewind'){const r=holds.has('rewind')||input?.keys?.has('KeyR');if(!!r!==s.rewinding)run('rewind',!!r);if(input?.pressed?.has('Space'))run('jump');if(input?.pressed?.has('KeyE'))run('interact');}
  const won=s.won;stepKinetics(s,dt,{x,y,z:y});if(!won&&s.won)sfx('success');sync();
 },draw(){if(!disposed)surface.draw(s);},getState(){return structuredClone(s);},getStatus(){return {goal:s.won?KINETICS_INFO[id].title+' · 完成':KINETICS_INFO[id].goal,message:s.message||KINETICS_INFO[id].help,stats:stats(),actions:[]};},dispose(){if(disposed)return;release();active=false;disposed=true;events.abort();ui.dispose();surface.dispose();}};
}
