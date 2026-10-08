import {freshHorizons,commandHorizons,stepHorizons,SCULPT_TARGET,SEA_TARGETS,seaRecoverable} from '../web/showcase-horizons-rules.js';
export const HORIZONS_IDS=['desktop','inkwell','atelier','submersible'];
export function advanceHorizons(s,seconds){for(let t=0;t<seconds-1e-7;t+=1/60)stepHorizons(s,Math.min(1/60,seconds-t))}
export function playHorizons(id){
 const s=freshHorizons(id),snapshots={initial:structuredClone(s)},cmd=(k,v)=>{if(!commandHorizons(s,k,v))throw Error(id+' rejected '+k+' '+JSON.stringify(v))};
 if(id==='desktop'){cmd('open','mail');cmd('open','files');cmd('read','manifest');cmd('move',{app:'files',x:184,y:139});snapshots.progress=structuredClone(s);cmd('read','log');cmd('open','photo');cmd('open','case');cmd('move',{app:'case',x:400,y:145});for(const [key,value] of Object.entries({place:'海角仓库',person:'林舟',reason:'暴雨避雨'}))cmd('answer',{key,value});cmd('submit')}
 if(id==='inkwell'){for(const v of ['打开抽屉','拿铜钥匙','拿提灯','去物资间','用铜钥匙打开木箱','拿镜片','拿灯油','点亮提灯','去阶梯','用铜钥匙打开铁门','去灯室','用镜片于灯座','用灯油于灯座','点亮灯塔']){cmd('type',v);if(v==='点亮提灯')snapshots.progress=structuredClone(s)}}
 if(id==='atelier'){for(let i=0;i<125;i++)if(!SCULPT_TARGET[i]){cmd('layer',Math.floor(i/25));cmd('cell',i);if(s.moves===30)snapshots.progress=structuredClone(s)}}
 if(id==='submersible'){
  for(let i=0;i<4;i++){const target=i<3?SEA_TARGETS[i]:{x:1080,depth:60};cmd('station','ballast');cmd('depth',target.depth);let done=false;
   for(let n=0;n<1000;n++){const err=target.x-s.x,throttle=Math.round(Math.max(-2,Math.min(2,(err*.6-s.vx*.95)/5)));cmd('station','helm');cmd('throttle',throttle);if(i<3&&!s.seen[i]&&Math.hypot(err,s.depth-target.depth)<280&&s.cooldown===0){cmd('station','sonar');cmd('ping')};advanceHorizons(s,.2);if(i<3&&seaRecoverable(s,i)&&Math.abs(s.x-target.x)<18){cmd('station','sonar');cmd('recover');done=true;break}if(i===3&&s.won){done=true;break}}
   if(!done)throw Error('Navigation did not reach '+i+' '+JSON.stringify(s));if(i===1)snapshots.progress=structuredClone(s);
  }
 }
 snapshots.complete=structuredClone(s);if(!s.won)throw Error(id+' not completed');return {s,snapshots};
}
