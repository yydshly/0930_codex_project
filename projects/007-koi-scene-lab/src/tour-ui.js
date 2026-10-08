import {TourState} from './tour-state.js';
import {TOUR_STEPS} from './tour-steps.js';
import {EXPERIMENT_DEFAULTS} from './experiment-config.js';
import {feedingPresentation} from './feeding-status.js';

export function bindTour({getCourtyard,getCurrentTab,selectTab,prepareInteraction,refresh}){
 const $=id=>document.getElementById(id),state=new TourState();
 let busy=false,message='',outside=false,lastStep=null,lastResult=null;
 const stepButtons=TOUR_STEPS.map((step,index)=>{const button=document.createElement('button');button.type='button';button.textContent=`${index+1} · ${step.label}`;
  button.addEventListener('click',()=>navigate(()=>state.go(index)));$('tour-steps').append(button);return button;});
 function topic(step){if(!step.topic)return;const select=$('principle-select');select.value=step.topic;select.dispatchEvent(new Event('change'));}
 function showGuide(){ $('demo-tour').scrollIntoView({behavior:'auto',block:'start'});$('tour-title').focus({preventScroll:true});}
 function blocked(c,step){return ['water','fish','feeding'].includes(step.id)&&(!c||!!c.imported);}
 function update(){const s=state.getState(),step=TOUR_STEPS[s.index],c=getCourtyard();
  $('tour-idle').hidden=s.active;$('tour-running').hidden=!s.active;document.body.dataset.demoTour=s.active?'active':'idle';
  $('tour-start').textContent=s.visited.length?'继续演示路线':'开始演示路线';$('tour-restart').hidden=!s.visited.length;
  $('tour-idle-note').textContent=s.visited.length?`保留在第 ${s.index+1} 步 · ${step.label}。可以继续或从头浏览。`:'原作 → 庭院 → 水波 → 鱼群对照 → 投喂，沿着效果理解技术与用途。';
  if(lastStep!==s.index){$('tour-details').open=true;lastStep=s.index;}
  $('tour-title').textContent=`${s.index+1} / ${TOUR_STEPS.length} · ${step.title}`;
  $('tour-instruction').textContent=step.instruction;$('tour-method').textContent=step.method;$('tour-value').textContent=step.value;$('tour-action').textContent=step.actionLabel;
  for(const [index,button]of stepButtons.entries()){button.disabled=busy;button.dataset.visited=String(s.visited.includes(TOUR_STEPS[index].id));
   if(index===s.index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');}
  for(const id of ['tour-previous','tour-floating-previous'])$(id).disabled=busy||s.index===0;
  for(const id of ['tour-next','tour-floating-next']){$(id).disabled=busy;$(id).textContent=s.index===TOUR_STEPS.length-1?'结束路线':'下一步';}
  for(const id of ['tour-start','tour-restart','tour-exit','tour-return','tour-more'])$(id).disabled=busy;
  $('tour-action').disabled=busy||blocked(c,step)||(step.id==='feeding'&&c&&!['idle','inspect'].includes(c.interaction.mode));
  $('tour-floating').hidden=!s.active||!outside;$('tour-return').textContent=`${s.index+1}/5 · ${step.label} · 看说明`;
  if(lastResult&&c&&(c.experiment.results.baseline!==lastResult.a||c.experiment.results.current!==lastResult.b)){lastResult=null;if(step.id==='fish')message='对照参数或场景已改变，可重新运行本步对照。';}
  const pageChanged=getCurrentTab()!==step.tab;
  $('tour-status').textContent=busy?'正在准备本步演示…':blocked(c,step)?(c?'本路线演示按图构造的庭院。当前模型已保留；通过“返回庭院”后可运行本步操作。':'庭院尚未就绪；请在“按图构造”页检查加载状态，加载后再试。'):message||(pageChanged?'当前页面已切换；点击本步操作可返回对应页面。':step.id==='construction'&&c?.imported?'参考图对应程序庭院；当前导入模型仍保留。':'按操作提示体验，或用上一步、下一步浏览。');
  let live='';
  if(s.active&&step.id==='feeding'&&c&&!c.imported){const h=c.interaction,data=feedingPresentation({round:c.school.feeding.latest(),mode:h.mode,phase:h.phase,paused:c.settings.paused,simulationActive:c.active&&!document.hidden,cumulative:c.school.consumed,fishCount:c.settings.fishCount});live=`${data.status} · ${data.counts}`;}
  if(s.active&&step.id==='fish'&&lastResult){const a=lastResult.a,b=lastResult.b,distances=a.positions.map((p,i)=>Math.hypot(...p.map((v,j)=>v-b.positions[i][j])));live=`真实重播 ${b.elapsed.toFixed(2)} 秒 · A/B 平均位置差 ${(distances.reduce((x,y)=>x+y,0)/Math.max(1,distances.length)).toFixed(4)} 场景单位 · ${a.signature===b.signature?'本次终点状态一致':'本次轨迹不同'}`;}
  $('tour-live').textContent=live;$('tour-live').hidden=!live;
 }
 async function navigate(change){if(busy)return;busy=true;message='';try{change();update();const step=TOUR_STEPS[state.getState().index];await selectTab(step.tab);if(getCurrentTab()!==step.tab)throw new Error('页面已切换，导览保留在当前步骤。');topic(step);showGuide();}
  catch(error){message=error.message;}finally{busy=false;update();}}
 function exit(){if(busy)return;state.exit();message='';lastStep=null;update();$('tour-start').focus();}
 function next(){if(state.getState().index===TOUR_STEPS.length-1)exit();else navigate(()=>state.next());}
 $('tour-start').addEventListener('click',()=>navigate(()=>state.start()));$('tour-restart').addEventListener('click',()=>navigate(()=>state.restart()));
 for(const id of ['tour-previous','tour-floating-previous'])$(id).addEventListener('click',()=>navigate(()=>state.previous()));
 for(const id of ['tour-next','tour-floating-next'])$(id).addEventListener('click',next);
 $('tour-exit').addEventListener('click',exit);$('tour-return').addEventListener('click',()=>{$('tour-details').open=true;showGuide();});
 $('tour-more').addEventListener('click',async()=>{if(busy)return;busy=true;message='';update();try{const step=TOUR_STEPS[state.getState().index],tab=step.topic?'scene':'tech';await selectTab(tab);if(getCurrentTab()!==tab)throw new Error('页面已切换，导览保留在当前步骤。');topic(step);
  const target=step.topic?$('principle-title'):document.querySelector('#tech h1');target.scrollIntoView({behavior:'auto',block:'start'});
 }catch(error){message=error.message;}finally{busy=false;update();}});
 $('tour-action').addEventListener('click',async()=>{if(busy)return;busy=true;message='';update();try{
  const step=TOUR_STEPS[state.getState().index];await selectTab(step.tab);if(getCurrentTab()!==step.tab)throw new Error('页面已切换，本步操作已中止。');topic(step);const c=getCourtyard();
  if(blocked(c,step))throw new Error('请先返回按图构造的庭院，再运行本步演示。');
  if(step.id==='original'){$('tour-details').open=false;$('original-frame').scrollIntoView({behavior:'auto',block:'start'});$('original-frame').focus();message='已定位原作。点击庭院，再按 E 投喂或按 T、C 切换观察。';}
  else if(step.id==='construction'){$('show-reference').click();message=c?.imported?'生成图对应程序庭院；当前导入模型仍保留，返回庭院后可检查构造。':'关闭生成图后，拖动庭院镜头检查空间关系。';}
  else if(step.id==='water'){prepareInteraction();c.updateSettings({paused:false,autoTour:false});c.setView('pond');c.experiment.setParameters({waterDebug:'natural'});
   const p=c.school.habitat?.feedPoint||{x:-.8,z:1.3};c.water.addRipple(p.x,p.z,c.time,.035);$('tour-details').open=false;$('viewport').scrollIntoView({behavior:'auto',block:'start'});message='已向共同波场加入扰动；点击池塘可继续加入。';}
  else if(step.id==='fish'){await new Promise(r=>requestAnimationFrame(r));if(getCurrentTab()!==step.tab||getCourtyard()!==c||c.imported)throw new Error('页面或模型已切换，本次对照已中止。');prepareInteraction();if(c.settings.fishCount<2)c.updateSettings({fishCount:7});c.updateSettings({paused:false,autoTour:false});c.setView('shoal',true);
   c.experiment.setParameters({...EXPERIMENT_DEFAULTS,overlay:{vectors:true,collision:false}});
   $('exp-duration').value='4';$('exp-duration').dispatchEvent(new Event('input'));c.experiment.captureBaseline();c.experiment.compareBaseline(4);c.experiment.setParameters({separation:0});c.experiment.restoreCurrent(4);
   lastResult={a:c.experiment.results.baseline,b:c.experiment.results.current};$('algorithm-experiments').open=true;$('tour-details').open=false;refresh();$('exp-comparison').scrollIntoView({behavior:'auto',block:'start'});message='已生成两组真实画面与轨迹；B 仅关闭分离，重播4秒后暂停。';}
  else if(step.id==='feeding'){prepareInteraction();c.updateSettings({paused:false,autoTour:false});c.feed();$('tour-details').open=false;$('viewport').scrollIntoView({behavior:'auto',block:'start'});message=c.settings.fishCount?'投喂已开始；画面下方显示本轮释放、实际落水与吞食，支持暂停或提前收手。':'当前没有锦鲤，本轮仅观察释放与落水；可在“锦鲤数量”中增加鱼，再观察追食。';}
  refresh();
 }catch(error){message=error.message;}finally{busy=false;update();}});
 const observer=new IntersectionObserver(([entry])=>{outside=!entry.isIntersecting;update();},{threshold:0});observer.observe($('demo-tour'));
 update();return {update};
}
