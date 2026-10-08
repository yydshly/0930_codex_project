import { DestructionEngine } from './engine.js';
import { scenes } from './scenes.js';
import { effectProfiles } from './effects.js';
const $=id=>document.getElementById(id);
const eventNames={loading:'准备场景',ready:'场景就绪',start:'体验开始','first-hit':'首次命中',shot:'触发交互',complete:'任务完成',pause:'暂停',resume:'继续',reset:'复原',scene:'切换场景',effect:'切换效果',parameters:'参数调整',auto:'自动演示',followup:'进入研究',coupon:'复制活动码'};
let engine=null,sceneKey='catalog',effectKey='glass',activeWeapon='pulse',starting=false,generation=0;
const events=[];
function record(type,data={}){
  const event={time:new Date().toISOString(),scene:sceneKey,effect:effectKey,type,...data};events.push(event);
  // All events remain available in the export; the visible list keeps the recent 10.
  $('event-log').replaceChildren(...events.slice(-10).reverse().map(item=>{const li=document.createElement('li');li.textContent=`${new Date(item.time).toLocaleTimeString('zh-CN',{hour12:false})} / ${eventNames[item.type]||item.type} / ${JSON.stringify(Object.fromEntries(Object.entries(item).filter(([key])=>!['time','scene','type'].includes(key))))}`;return li;}));
}
function updateStats(state){$('progress').textContent=`${Math.round(state.ratio*100)}%`;$('progress-fill').style.width=`${state.ratio*100}%`;$('hit-count').textContent=state.hits;$('body-count').textContent=['pixels','neon','ripple'].includes(effectKey)?state.visuals||0:state.dynamic;$('fps').textContent=state.fps||'—';$('goal-state').textContent=state.complete?'已完成':engine?.goalTag?`旧价 ${Math.round(state.goalRatio*100)}% / 80%`:`目标 ${Math.round(scenes[sceneKey].threshold*100)}%`;}
function handleEvent(event){const {type,...data}=event;if(type==='stats'){updateStats(data);if(!data.auto){$('auto').textContent='自动演示';$('auto').setAttribute('aria-pressed','false');}return;}record(type,data);
  if(type==='loading')$('stage-state').textContent='正在渲染真实页面…';
  if(type==='ready')$('stage-state').textContent=`场景已就绪 · ${data.tiles} 个可破坏碎片`;
  if(type==='start'){$('stage-state').textContent=`${effectProfiles[effectKey].name} · ${effectKey==='classic'?'瞄准射击':'点按 / 拖拽交互'}`;$('pause').disabled=false;$('pause').textContent='暂停';}
  if(type==='pause'){$('stage-state').textContent='已暂停';$('pause').textContent='继续';}
  if(type==='complete'){$('result').innerHTML=scenes[sceneKey].result();$('result').hidden=false;$('goal-state').textContent='已完成';
    $('result').querySelectorAll('[data-followup]').forEach(link=>link.addEventListener('click',()=>record('followup',{target:link.dataset.followup})));
    $('copy-coupon')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText('BREAK20-DEMO');$('coupon-state').textContent='已复制';record('coupon',{code:'BREAK20-DEMO',method:'clipboard'});}catch{$('coupon-state').textContent='请手动复制：BREAK20-DEMO';record('coupon',{method:'manual-required'});}});
    $('show-parameters')?.addEventListener('click',()=>{$('parameters').open=true;$('parameters').scrollIntoView({block:'nearest',behavior:'smooth'});});
  }
}
function resetScene({log=true}={}){
  generation++;starting=false;engine?.dispose();engine=null;const scene=scenes[sceneKey];
  const profile=effectProfiles[effectKey];document.body.dataset.effect=effectKey;
  $('scene-dom').className=`scene-dom ${scene.className} effect-${effectKey}`;$('scene-dom').innerHTML=scene.html();$('scene-dom').style.backgroundColor=profile.background||scene.background;$('scene-dom').style.visibility='visible';$('scene-dom').inert=false;
  $('game-canvas').classList.remove('visible');$('stage-overlay').hidden=false;$('start').disabled=false;$('start').textContent='开始体验';$('result').hidden=true;$('result').innerHTML='';
  $('overlay-title').textContent=`${profile.name} · ${sceneKey==='campaign'?'揭晓活动码':sceneKey==='classroom'?'实时实验':'内容探索'}`;
  $('overlay-copy').textContent=effectKey==='classic'?'角色移动，瞄准射击。也可以选择自动演示。':'点按或拖拽页面，观察这种效果。也可以选择自动演示。';$('stage-state').textContent='场景已复原 · 等待开始';
  $('effect-description').textContent=profile.description;$('effect-use').textContent=`适合：${profile.use}`;$('viewport-label').textContent=profile.simulation;$('control-help').textContent=profile.help;
  $('body-label').textContent=['pixels','neon'].includes(effectKey)?'视觉粒子':effectKey==='ripple'?'扩散涟漪':'物理碎片';$('progress-label').textContent=effectKey==='ripple'?'揭晓进度':'破坏进度';$('fragment-label').textContent=['pixels','neon','ripple'].includes(effectKey)?'片区尺寸':'碎片尺寸';
  $('parameter-note').textContent=effectKey==='ripple'?'强度控制擦除半径。面积用片区采样估计，圆形重叠只计一次。': ['pixels','neon'].includes(effectKey)?'粒子采用独立动画，未使用重力或碰撞。强度控制消融或聚合速度；片区尺寸在下次开始时生效。':'重力与强度即时生效；碎片尺寸在下次开始时生效。进度按原始区域面积计算。';
  document.querySelectorAll('button[data-effect]').forEach(button=>{const active=button.dataset.effect===effectKey;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  document.querySelectorAll('[data-weapon]').forEach(button=>{button.textContent=(effectKey==='classic'?{pulse:'1 点射',scatter:'2 散射',blast:'3 爆破'}:{pulse:'1 点触',scatter:'2 扩散',blast:'3 大范围'})[button.dataset.weapon];});
  $('game-canvas').setAttribute('aria-label',effectKey==='classic'?'角色射击场景。A D 移动，空格跳跃，鼠标瞄准。':`${profile.name}交互场景。点按或拖拽页面触发，F 在光标位置触发，G 触发大范围效果。`);
  $('scene-title').textContent=scene.title;$('scene-type').textContent=scene.type;$('scene-brief').textContent=scene.brief;$('scene-goal').textContent=scene.goal;$('scene-outcome').textContent=scene.outcome;
  $('pause').disabled=true;$('pause').textContent='暂停';$('auto').textContent='自动演示';$('auto').setAttribute('aria-pressed','false');updateStats({ratio:0,hits:0,dynamic:0,fps:0,goalRatio:0,complete:false});
  document.querySelectorAll('[data-scene]').forEach(button=>{const active=button.dataset.scene===sceneKey;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  if(log)record('reset');
}
async function startScene(auto=false){
  if(starting)return;
  if(engine){if(engine.state==='paused')engine.setPaused(false);engine.setOptions({auto});$('auto').textContent=auto?'停止自动演示':'自动演示';return;}
  starting=true;const token=generation;const scene=scenes[sceneKey];$('start').disabled=true;$('start').textContent='正在生成场景…';
  try{
    engine=new DestructionEngine({canvas:$('game-canvas'),source:$('scene-dom'),effect:effectKey,cellSize:Number($('cell-size').value),background:effectProfiles[effectKey].background||scene.background,threshold:scene.threshold,goalTag:scene.goalTag,onEvent:handleEvent});
    const current=engine;current.setOptions({gravity:Number($('gravity').value),force:Number($('force').value),debug:$('debug').checked,weapon:activeWeapon,auto});
    await current.prepare();if(token!==generation||current.disposed)return;
    $('scene-dom').style.visibility='hidden';$('scene-dom').inert=true;$('game-canvas').classList.add('visible');$('stage-overlay').hidden=true;current.start();$('game-canvas').focus({preventScroll:true});
    $('auto').textContent=auto?'停止自动演示':'自动演示';$('auto').setAttribute('aria-pressed',String(auto));updateStats(current.getState());
  }catch(error){if(token!==generation)return;engine?.dispose();engine=null;$('overlay-title').textContent='场景准备失败';$('overlay-copy').textContent=error.message;$('start').disabled=false;$('start').textContent='重试';$('stage-state').textContent='请重试或刷新页面';}
  finally{if(token===generation)starting=false;}
}
document.querySelectorAll('[data-scene]').forEach(button=>button.addEventListener('click',()=>{sceneKey=button.dataset.scene;record('scene',{selected:sceneKey});resetScene({log:false});if(sceneKey==='classroom')$('parameters').open=true;}));
document.querySelectorAll('button[data-effect]').forEach(button=>button.addEventListener('click',()=>{if(effectKey===button.dataset.effect)return;const wasPlaying=engine?.state==='running',wasAuto=engine?.auto;effectKey=button.dataset.effect;record('effect',{selected:effectKey});resetScene({log:false});if(wasPlaying)startScene(Boolean(wasAuto));}));
$('start').addEventListener('click',()=>startScene());$('reset').addEventListener('click',()=>resetScene());
$('pause').addEventListener('click',()=>engine?.setPaused(engine.state==='running'));
$('auto').addEventListener('click',async()=>{const auto=!engine?.auto;record('auto',{enabled:auto});await startScene(auto);$('auto').setAttribute('aria-pressed',String(auto));});
document.querySelectorAll('[data-weapon]').forEach(button=>button.addEventListener('click',()=>{activeWeapon=button.dataset.weapon;engine?.setOptions({weapon:activeWeapon});document.querySelectorAll('[data-weapon]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}));
$('game-canvas').addEventListener('keydown',event=>{const weapon={Digit1:'pulse',Digit2:'scatter',Digit3:'blast'}[event.code];if(weapon)document.querySelector(`[data-weapon="${weapon}"]`).click();});
for(const id of ['gravity','force']){$(id).addEventListener('input',()=>{const value=Number($(id).value);$(`${id}-value`).value=value.toFixed(1);engine?.setOptions({[id]:value});});$(id).addEventListener('change',()=>record('parameters',{[id]:Number($(id).value)}));}
$('debug').addEventListener('change',()=>{engine?.setOptions({debug:$('debug').checked});record('parameters',{debug:$('debug').checked});});
$('cell-size').addEventListener('change',()=>record('parameters',{cellSize:Number($('cell-size').value)}));
document.querySelectorAll('[data-move]').forEach(button=>{
  const key=button.dataset.move==='left'?'KeyA':'KeyD';
  button.addEventListener('pointerdown',event=>{event.preventDefault();if(!engine)return;if(button.dataset.move==='jump'){engine.jump();return;}engine.keys.add(key);button.setPointerCapture(event.pointerId);});
  for(const type of ['pointerup','pointercancel'])button.addEventListener(type,()=>engine?.keys.delete(key));
});
$('export-events').addEventListener('click',()=>{const payload={version:1,source:'local-destruction-lab',exportedAt:new Date().toISOString(),events};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='destruction-events.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('official-catalog').href=`https://destroy.spritefusion.com/?url=${encodeURIComponent('https://yydshly.github.io/0930_codex_project/')}`;
let resizeTimeout;new ResizeObserver(()=>{clearTimeout(resizeTimeout);resizeTimeout=setTimeout(()=>{if(engine&&Math.abs($('stage').clientWidth-engine.width)>2){resetScene({log:false});$('stage-state').textContent='尺寸已变化，场景已复原；请重新开始';}},250);}).observe($('stage'));
window.destructionLab={getState:()=>engine?.getState()??{state:'idle'},get engine(){return engine;},events};
resetScene({log:false});
