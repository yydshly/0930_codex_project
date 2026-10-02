import {ease} from './echo-direction.mjs';

export const EMOTION_DURATION=52;
const note=(at,voice,midi,length,gain,source,pan)=>({at,voice,midi,length,gain,source,...(pan===undefined?{}:{pan})});
const bed=(at,midi,length,gain)=>({...note(at,'kong',midi,length,gain,'score',0),style:'pad'});
export const emotionScore=[
  bed(0,48,3.5,.20),
  note(.8,'zhe',72,.26,.45,'tree',-.5),note(1.7,'zhe',74,.26,.45,'tree',-.5),
  note(3.4,'kong',60,.32,.38,'kong',-.18),
  bed(5.8,55,2.1,.18),
  note(6.60,'kong',60,.38,.90,'kong'),note(6.72,'kong',62,.38,.90,'kong'),note(6.84,'kong',64,.38,.90,'kong'),
  note(6.68,'zhe',72,.16,.22,'zhe',-.42),
  bed(11.2,56,2.1,.16),
  note(17.3,'dong',45,.09,.18,'step',.10),note(18.6,'dong',45,.09,.13,'step',.2),bed(17.5,53,2,.14),
  bed(24,48,2.2,.15),note(25.85,'zhe',72,.24,.42,'zhe',-.38),note(27.4,'zhe',74,.15,.26,'zhe',-.38),
  bed(29,55,.4,.12),
  note(35.6,'kong',60,.50,.55,'kong',-.12),
  bed(39,48,.85,.16),note(39.7,'zhe',72,.45,.60,'zhe',-.25),note(41.5,'zhe',74,.40,.60,'zhe',-.25),
  note(43.1,'kong',64,.60,.65,'kong',.12),bed(43,55,.7,.12),
  note(46,'kong',60,.22,.35,'kong',.12),note(46,'zhe',74,.22,.35,'zhe',-.25),
  bed(48.4,48,1.2,.14),note(48.5,'kong',64,.65,.45,'kong',.12),note(48.5,'zhe',76,.65,.45,'zhe',-.25),
].sort((a,b)=>a.at-b.at);

const chapters=[[0,'anticipation'],[6,'overlap'],[11,'misread'],[16,'leaving'],[24,'call-back'],[30,'return'],[35,'offer'],[39,'answer'],[45,'near'],[50,'open-ending']];
const dialogue={
  anticipation:['空空','那边……有人在练习吗？','树洞后的小短句，总少了最后一个音。','都想靠近'],
  overlap:['空空','我会！我也会！','折折刚想接上，自己的第一个音就被盖住了。','错过了同一拍'],
  misread:['空空','……你是不是不想听我说？','举起的小手还没放下，折耳已经收回去了。','把沉默听错了'],
  leaving:['空空','那……我走好了。','走了两步。长耳却仍朝着树洞。','走开，也在等'],
  'call-back':['折折','等……','折折追出一个很轻的音，后半句又没能说出来。','另一边的犹豫'],
  return:['空空','刚才，是在叫我吗？','空空停住，先回头，再慢慢转回身体。','听见没说完的话'],
  offer:['空空','那我，先说一点点。','一个小音落下，它把后面的位置留在那里。','还不确定，也愿意试'],
  answer:['折折','……还有这个音。','折折向前半步；空空接上了它没说完的结尾。','彼此改写了这一句'],
  near:['空空 · 折折','我…… / 你……','又同时开口，又一起停下。这次谁也没有走。','有点尴尬，有点安心'],
  'open-ending':['空空','还要再来一句吗？','折耳没有完全打开。两个伙伴，都留在了这里。','相遇才刚开始'],
};
export function emotionAt(time){
  const t=Math.min(EMOTION_DURATION,Math.max(0,Number.isFinite(time)?time:0)),chapter=chapters.findLast(([at])=>t>=at);
  return {time:t,phase:chapter[1],elapsed:t-chapter[0],complete:t===EMOTION_DURATION,dialogue:dialogue[chapter[1]]};
}
const mix=(a,b,t)=>a+(b-a)*t;
export function directEmotion({phase='anticipation',elapsed=0,reducedMotion=false}={}){
  const t=Math.max(0,elapsed),kong={mode:'waiting',emotion:'hopeful',look:-.85,gesture:'half-wave',lean:-.02,breath:1,confidence:.75},zhe={mode:'waiting',emotion:'guarded',look:.65,gesture:'tuck',lean:.02,breath:.7,foldOpen:.30};
  let kongPosition=[-.65,.60],friend={x:-3.0,z:-1.58},kongYaw=-.26,zheYaw=.22,kongVisible=true,camera=[-1.70,1.32,-.3,5.3],span=6.2,connection=0;
  if(phase==='anticipation'){zhe.foldOpen=.26+Math.sin(t*.9)*.10;kong.confidence=.5+ease(2,5,t)*.4;}
  if(phase==='overlap'){
    Object.assign(kong,{mode:t<1.5?'replying':'waiting',emotion:t<1.5?'eager':'uncertain',gesture:t<1.8?'offer':'half-wave',confidence:1-ease(1.5,4.5,t)*.8});
    Object.assign(zhe,{emotion:'flustered',foldOpen:.60-ease(.8,3,t)*.44,gesture:'pull-back'});camera=[-1.65,1.34,-.1,4.9];span=6.1;
  }
  if(phase==='misread'){
    Object.assign(kong,{emotion:t<2?'uncertain':'hurt',gesture:t<2?'half-wave':'pull-back',look:t<2?-.8:-.3,confidence:.25,lean:.025});
    Object.assign(zhe,{emotion:'guarded',foldOpen:.16,gesture:'tuck'});camera=[-1.70,1.34,.05,4.55];span=6.1;
  }
  if(phase==='leaving'){
    const walk=ease(0,4,t);kongPosition=[mix(-.65,1.15,walk),mix(.60,1.10,walk)];kongYaw=mix(-.26,1.20,walk);
    Object.assign(kong,{emotion:'defensive',look:t>4?-.95:-.55,gesture:'pull-back',walking:t<4,walkCycle:t*Math.PI/1.3,earsAim:-.20,lean:.015,confidence:.18});
    Object.assign(zhe,{emotion:'uncertain',foldOpen:.25,look:.85});camera=[-1.1,1.30,.25,5.7];span=7.2;
  }
  if(phase==='call-back'){
    const step=ease(.4,1.5,t);kongPosition=[1.15,1.10];kongVisible=false;friend={x:mix(-3,-2.20,step),z:mix(-1.58,-.65,step)};
    Object.assign(zhe,{emotion:'vulnerable',foldOpen:.23+ease(.8,2,t)*.25-ease(3.7,5.8,t)*.10,gesture:'half-wave',walking:step>0&&step<1,walkCycle:t*5,look:.85});camera=[-2.2,1.32,-.40,4.15];span=3.6;
  }
  if(phase==='return'){
    const turn=ease(.2,1.7,t),walk=ease(1.8,4.8,t);kongPosition=[mix(1.15,0,walk),mix(1.10,.65,walk)];kongYaw=mix(1.20,-.32,turn);friend={x:-2.20,z:-.65};
    Object.assign(kong,{emotion:t<1.5?'surprised':'vulnerable',look:-.85,gesture:'half-wave',walking:walk>0&&walk<1,walkCycle:t*5,confidence:.3});Object.assign(zhe,{emotion:'uncertain',foldOpen:.4,look:.85});camera=[-.75,1.32,.25,5.15];span=6.3;
  }
  if(phase==='offer'){
    kongPosition=[0,.65];kongYaw=-.32;friend={x:-2.20,z:-.65};Object.assign(kong,{emotion:'vulnerable',gesture:t<1.5?'offer':'half-wave',look:-.85,confidence:.4});Object.assign(zhe,{emotion:'uncertain',look:.85,foldOpen:.42});camera=[-1.2,1.32,.1,4.45];span=5.5;
  }
  if(phase==='answer'){
    const step=ease(2.3,4.3,t);kongPosition=[0,.65];kongYaw=-.32;friend={x:mix(-2.20,-1.38,step),z:mix(-.65,.56,step)};
    Object.assign(kong,{emotion:'relieved',gesture:'welcome',look:-.8,confidence:.45+ease(2,5,t)*.3});Object.assign(zhe,{emotion:'vulnerable',gesture:'offer',foldOpen:.42+ease(1,4.8,t)*.30,walking:step>0&&step<1,walkCycle:t*5});camera=[-1.1,1.34,.22,4.65];span=5.5;connection=ease(4,6,t)*.45;
  }
  if(['near','open-ending'].includes(phase)){
    kongPosition=[0,.65];kongYaw=-.32;friend={x:-1.38,z:.56};Object.assign(kong,{emotion:'shy',gesture:'half-wave',look:-.65,confidence:.7});Object.assign(zhe,{emotion:'shy',gesture:'half-wave',look:.60,foldOpen:.72});camera=[-.65,1.34,.52,4.4];span=4.5;connection=phase==='near'?.45+ease(0,4,t)*.35:.80;
  }
  return {kong,zhe,kongPosition,kongYaw,zheYaw,kongVisible,friendVisible:true,friend,camera:reducedMotion?[-1.1,1.3,0,6.2]:camera,span:reducedMotion?7.2:span,connection,mood:['misread','leaving'].includes(phase)?.82:phase==='call-back'?.88:1};
}
