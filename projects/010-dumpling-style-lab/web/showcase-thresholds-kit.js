import {restoreThresholds,commandThresholds,stepThresholds,NOTE_FREQUENCIES} from './showcase-thresholds-rules.js';
import {thresholdsPanel,THRESHOLDS_INFO} from './showcase-thresholds-panel.js';
import {voiceInput} from './showcase-thresholds-audio.js';
export function thresholdsController(options,surface){
 const {id,host,input,saved,sfx=()=>{},getSound=()=>false}=options,element=surface.element;let s=restoreThresholds(id,saved),active=false,disposed=false,ui;const holds=new Set(),notes=new Map(),events=new AbortController(),signal=events.signal;
 const audio=id==='cantor'?voiceInput({getSound,onStatus:()=>sync()}):null;
 const stats=()=>{const common=[`星印 ${s.orbs.filter(Boolean).length} / ${s.orbs.length}`];return id==='inverter'?[...common,s.gravity>0?'重力 ↓':'重力 ↑',`翻转 ${s.flips} 次`]:id==='phasewalk'?[...common,s.phase?'夜层实体':'白昼实体',`切换 ${s.swaps} 次`]:id==='transit'?[...common,`A ${s.entry+1} → B ${s.exit+1}`,`穿越 ${s.transits} 次`,s.lastTransfer?`瞬间速率 ${Math.round(s.lastTransfer.speedBefore)} → ${Math.round(s.lastTransfer.speedAfter)}`:'布置后发射']: [...common,audio.status,`最低音 ${Math.round(s.base)} Hz`,s.frequency?`当前 ${Math.round(s.frequency)} Hz`:'等待持续音高'];};
 const sync=()=>ui?.sync(active,s,stats());
 element.setAttribute('aria-label',THRESHOLDS_INFO[id].title+'。'+THRESHOLDS_INFO[id].help);element.style.touchAction='none';
 function setNote(){if(!audio)return;const index=[...notes.values()].at(-1),f=index===undefined?0:NOTE_FREQUENCIES[index]*s.base/110;commandThresholds(s,'tone',f);audio.tone(f);sync();}
 function release(){holds.clear();notes.clear();input?.release?.();if(id==='phasewalk')commandThresholds(s,'peek',false);if(audio){audio.stop();commandThresholds(s,'tone',0);}sync();}
 function run(key,value){if(!active||disposed)return false;const[k,a]=key.split(':'),v=value??(a!==undefined&&Number.isFinite(+a)?+a:a);
  if(k==='microphone'){notes.clear();commandThresholds(s,'tone',0);audio.enable().then(()=>{if(!active||disposed)audio.stop();sync();});return true;}
  if(k==='keyboard'){audio.keyboard();notes.clear();commandThresholds(s,'tone',0);sync();return true;}
  if(['restart','retry','edit'].includes(k))release();const ok=commandThresholds(s,k,v);if(ok&&!['tone','sample','peek'].includes(k))sfx('turn');if(k==='base'||k==='calibrate')setNote();sync();return ok;
 }
 function hold(k,on){if(!active||disposed)return;if(k.startsWith('note:')){if(on){audio.keyboard();notes.delete(k);notes.set(k,+k.split(':')[1]);}else notes.delete(k);setNote();return;}on?holds.add(k):holds.delete(k);if(k==='peek')run('peek',on);}
 ui=thresholdsPanel(host,id,run,hold);sync();
 element.addEventListener('pointerdown',()=>element.focus({preventScroll:true}),{signal});
 element.addEventListener('keydown',e=>{if(id!=='cantor'||!active||e.repeat||e.target?.closest?.('button,input,select'))return;const i=['KeyZ','KeyX','KeyC'].indexOf(e.code);if(i>=0){e.preventDefault();hold('note:'+i,true);}},{signal});
 window.addEventListener('keyup',e=>{if(id==='cantor'){const i=['KeyZ','KeyX','KeyC'].indexOf(e.code);if(i>=0)hold('note:'+i,false);}},{signal});window.addEventListener('blur',release,{signal});
 return {onStart(){if(disposed)return;active=true;sync();},setActive(v){if(disposed||active===v)return;if(!v)release();active=v;sync();},command:run,
  tick(dt){if(!active||disposed)return;const pressed=input?.pressed;if(pressed?.has('Space'))run(id==='inverter'?'flip':id==='phasewalk'?'jump':'launch');if(id==='phasewalk'&&pressed?.has('KeyE'))run('swap');if(audio?.mode==='microphone')commandThresholds(s,'sample',audio.sample());
   const won=s.won,x=Math.max(-1,Math.min(1,(input?.x||0)+(holds.has('right')?1:0)-(holds.has('left')?1:0)));stepThresholds(s,dt,{x});if(!won&&s.won){sfx('success');release();}sync();
  },draw(){if(!disposed)surface.draw(s);},getState(){const r=structuredClone(s);if(id==='cantor'&&r.inputSource==='microphone'){r.frequency=r.rms=r.confidence=0;r.inputSource='keyboard';}return r;},getStatus(){return {goal:s.won?THRESHOLDS_INFO[id].title+' · 完成':THRESHOLDS_INFO[id].goal,message:s.message||THRESHOLDS_INFO[id].help,stats:stats(),actions:[]};},dispose(){if(disposed)return;release();active=false;disposed=true;events.abort();audio?.dispose();ui.dispose();surface.dispose();}};
}
