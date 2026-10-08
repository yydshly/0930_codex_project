import {observationPanel} from './showcase-observation-kit.js?v=20261004-2';
export const KINETICS_INFO={
 ribbon:{title:'把风画成路',goal:'绘出经过三枚风印的路线，让风信使抵达右岸',help:'按住画面拖动绘线，再点击出发。从左侧出发点向右画，经过三枚风印，最后连到右岸圆环。墨水有限，线条的方向决定行进方向；断开的线路可能坠落。可撤销、清空或返回绘制，空格出发或加速。'},
 rescue:{title:'矿井十二人',goal:'安排技能，护送至少 10 位队员抵达右侧出口',help:'放行后队员自动行走。点击队员或下方编号选中，再给他技能：坑边向右行走的队员造梯，石墙附近的队员开凿；阻挡者会让其他人转向。可暂停安排，阻挡者用「恢复行走」放行。无效指令不扣技能；损失超过两人需要重开。'},
 rewind:{title:'钟楼的第二次',goal:'下层取晶石，回到过去锁桥，再走向出口',help:'方向键或 A / D 移动，空格跳跃，E 互动。走过桥中间会触发下沉：到下层拾取晶石，再按住 R 回退，带回不受时间影响的晶石。在左侧控制台按 E 锁桥，走到右门按 E 开门。回退会同时恢复人物、桥和配重；晶石是明确的时间例外。'},
 nested:{title:'掌心里的庭院',goal:'在小模型上搭两座桥，走过放大八倍的庭院',help:'在左上实时模型里拖动木桥，或选桥后用下方微调和旋转。模型改动会同步到大庭院；两座桥要跨过两处水道。切换「进入庭院」后用方向键走路，W / S 或上下方向调节前后。主画面拖动环视，滚轮缩放。失足可回到起点继续调整，保留布置。'}
};
const btn=(k,t)=>`<button type="button" data-command="${k}">${t}</button>`,hold=(k,t)=>`<button type="button" data-hold="${k}">${t}</button>`;
const style=`<style>.kinetics-controls{padding:16px 20px;background:linear-gradient(120deg,#25383c,#18212e)}.kinetics-grid,.kinetics-pad{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}.kinetics-workers{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:12px 0}.kinetics-controls button{min-height:46px;padding:9px 10px;font-size:13px}.kinetics-controls button[aria-pressed=true]{outline:2px solid #f0c984;outline-offset:1px}.kinetics-controls button:disabled{opacity:.42}.kinetics-readout{font-size:13px;line-height:1.7;font-variant-numeric:tabular-nums;margin:0}.kinetics-help{font-size:12px;line-height:1.85;color:#d1dacd;margin:13px 0 0}.kinetics-hud{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}#player-frame[class*=kinetics-]:fullscreen{justify-content:flex-start;height:100dvh;overflow:hidden;--observation-space:370px}#player-frame[class*=kinetics-]:fullscreen .play-mount{flex:0 0 auto;width:min(100vw,calc(max(150px,100dvh - var(--observation-space) - 56px)*1.77778));height:min(56.25vw,max(150px,100dvh - var(--observation-space) - 56px))!important}#player-frame[class*=kinetics-]:fullscreen .kinetics-controls{flex:1 1 auto;min-height:0;overflow:auto;width:100%;max-width:1120px}@media(max-width:650px){.kinetics-controls{padding:12px}.kinetics-grid{grid-template-columns:repeat(2,1fr)}.kinetics-workers{grid-template-columns:repeat(4,1fr)}#player-frame[class*=kinetics-]:fullscreen{--observation-space:475px}}</style>`;
export function kineticsPanel(host,id,run,onHold){
 let markup='';if(id==='ribbon')markup=[['launch','风信使出发'],['dash','短暂加速'],['edit','返回绘制'],['undo','撤销最后一笔'],['clear','清空线条']].map(v=>btn(...v)).join('');
 if(id==='rescue')markup=btn('release','放行 / 暂停队伍')+[['builder','造梯 · 1 次'],['digger','开凿 · 1 次'],['blocker','阻挡 · 2 次'],['walk','恢复行走']].map(([k,t])=>btn('skill:'+k,t)).join('');
 if(id==='rewind')markup=hold('rewind','按住回溯 · R')+btn('back','回退 1 秒')+btn('jump','跳跃 · 空格')+btn('interact','互动 · E');
 if(id==='nested')markup=[['mode:model','编辑小模型'],['mode:walk','进入庭院'],['select:0','第一座木桥'],['select:1','第二座木桥'],['rotate:-1','旋转 −90°'],['rotate:1','旋转 +90°'],['shift:left','模型向左'],['shift:right','模型向右'],['shift:up','模型向后'],['shift:down','模型向前'],['undo','撤销模型调整'],['retry','回起点 / 保留布置'],['orbit:-1','环视左转'],['orbit:1','环视右转']].map(v=>btn(...v)).join('');
 const workers=id==='rescue'?`<div class="kinetics-workers">${Array.from({length:12},(_,i)=>btn('select:'+i,'队员 '+(i+1))).join('')}</div>`:'';
 const directions=id==='rewind'?[['left','← 移动'],['right','移动 →']]:[['left','←'],['up','↑'],['down','↓'],['right','→']];
 const pad=['rewind','nested'].includes(id)?`<div class="kinetics-pad" ${id==='rewind'?'style="grid-template-columns:repeat(2,1fr)"':''}>${directions.map(v=>hold(...v)).join('')}</div>`:'';
 const ui=observationPanel(host,'kinetics-'+id,style+`<p class="kinetics-readout" aria-live="polite"></p>${workers}<div class="kinetics-grid">${markup}${btn('restart','重新开始本段')}</div>${pad}<p class="kinetics-help">${KINETICS_INFO[id].help}</p>`);ui.panel.classList.add('kinetics-controls');const events=new AbortController(),buttons=[...ui.panel.querySelectorAll('[data-command]')],holds=[...ui.panel.querySelectorAll('[data-hold]')];
 buttons.forEach(b=>b.onclick=()=>!b.disabled&&run(b.dataset.command));holds.forEach(b=>{b.addEventListener('pointerdown',e=>{if(b.disabled)return;e.preventDefault();b.setPointerCapture(e.pointerId);onHold(b.dataset.hold,true);},{signal:events.signal});for(const t of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(t,()=>onHold(b.dataset.hold,false),{signal:events.signal});});
 return {...ui,buttons,holds,sync(active,s,stats){const r=ui.panel.querySelector('.kinetics-readout'),t=stats.join(' · ');if(r.textContent!==t)r.textContent=t;
  for(const b of buttons){const [k,a]=b.dataset.command.split(':');b.disabled=!active||s.won&&!['restart','orbit'].includes(k);b.setAttribute('aria-pressed',String(k==='select'&&s.selected===+a||k==='mode'&&s.mode===a));
   if(id==='ribbon'&&['undo','clear'].includes(k))b.disabled=!active||s.running||!s.lines.length;
   if(id==='rescue'&&k==='select')b.disabled=!active||!s.workers[+a]||s.workers[+a].status!=='live';
   if(id==='rescue'&&k==='skill')b.disabled=!active||s.won||!s.workers[s.selected]||s.workers[s.selected].status!=='live'||a!=='walk'&&!s.tools[a];
   if(id==='nested'&&['shift','rotate','undo'].includes(k))b.disabled=!active||s.mode!=='model'||s.won||k==='undo'&&!s.history.length;
   if(id==='rewind'&&k==='back')b.disabled=!active||s.won||s.history.length<2;
  }for(const b of holds)b.disabled=!active||s.won||id==='nested'&&s.mode!=='walk';
 },dispose(){events.abort();buttons.forEach(b=>b.onclick=null);ui.dispose();}};
}
