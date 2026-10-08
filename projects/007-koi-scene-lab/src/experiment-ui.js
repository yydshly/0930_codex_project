import {createExperimentPlot} from './experiment-plot.js';
export function bindExperimentControls({getCourtyard,notify}){
 const $=id=>document.getElementById(id),weights=['separation','alignment','cohesion'];let lastParameters='',lastResults='',busy=false;
 $('exp-view').addEventListener('click',()=>{const c=getCourtyard();if(c?.hasDynamics)c.setView('shoal');});
 function change(){const c=getCourtyard();if(!c)return;try{const patch={};for(const key of weights)patch[key]=$('exp-'+key).checked?Number($('exp-'+key+'-weight').value):0;
  patch.collision=$('exp-collision').checked;patch.normalCorrection=$('exp-normal-correction').checked;patch.overlay={vectors:$('exp-vectors').checked,collision:$('exp-spheres').checked};patch.waterDebug=$('exp-water-debug').value;
  c.experiment.setParameters(patch);update();}catch(e){notify(e.message);}}
 for(const key of weights){$('exp-'+key).addEventListener('change',change);$('exp-'+key+'-weight').addEventListener('input',change);}
 for(const id of ['exp-collision','exp-normal-correction','exp-vectors','exp-spheres','exp-water-debug'])$(id).addEventListener('change',change);
 $('exp-duration').addEventListener('input',()=>{$('exp-duration-value').textContent=$('exp-duration').value+' 秒';});
 for(const [id,method,message]of [['exp-baseline','captureBaseline','参考 A 参数与镜头已保存；调整参数后运行 A、B'],['exp-run-a','compareBaseline','参考 A 已从共同起点运行并暂停'],['exp-run-b','restoreCurrent','当前 B 已从同一起点运行并暂停'],['exp-reset','reset','实验已恢复默认，参考对照已清空']])$(id).addEventListener('click',async()=>{
  const c=getCourtyard();if(!c||busy)return;busy=true;update();try{if(method==='compareBaseline'||method==='restoreCurrent'){notify('正在按固定步长重播…');await new Promise(r=>requestAnimationFrame(r));c.experiment[method](Number($('exp-duration').value));}else c.experiment[method]();notify(message);update();}catch(e){notify(e.message);}finally{busy=false;update();}});
 function update(){const c=getCourtyard();if(!c)return;const s=c.experiment.getState({includeImages:false}),p=s.parameters,key=JSON.stringify(p);
  if(lastParameters!==key){for(const name of weights){$('exp-'+name).checked=p[name]>0;if(p[name]>0)$('exp-'+name+'-weight').value=p[name];}
   $('exp-collision').checked=p.collision;$('exp-normal-correction').checked=p.normalCorrection;$('exp-vectors').checked=p.overlay.vectors;$('exp-spheres').checked=p.overlay.collision;$('exp-water-debug').value=p.waterDebug;lastParameters=key;}
  for(const name of weights)$('exp-'+name+'-value').textContent=Number($('exp-'+name+'-weight').value).toFixed(2);
  $('exp-duration-value').textContent=$('exp-duration').value+' 秒';$('exp-view').disabled=busy||!c.hasDynamics;$('exp-baseline').disabled=busy||!c.hasDynamics;$('exp-run-a').disabled=busy||!c.hasDynamics||!s.baseline;$('exp-run-b').disabled=busy||!c.hasDynamics||!s.current;$('exp-reset').disabled=busy;
  for(const el of document.querySelectorAll('.experiment-forces input,.experiment-options input,.experiment-options select,#exp-duration'))el.disabled=busy;
  $('exp-status').textContent=!c.hasDynamics?'导入模型需要先应用动态水域绑定':s.lastInvalidation||(!s.baseline?'调整参数与观察层，再记录参考 A':s.mode==='baseline'?'当前显示参考 A，B 参数已保存':'当前显示 B 参数；A/B 使用同一场景设置与镜头');
  const m=c.school.metrics;$('exp-metrics').textContent=`模拟 ${c.time.toFixed(2)} 秒 · 原始邻域：对齐 ${m.alignment.toFixed(3)} · 聚集偏移 ${m.cohesion.toFixed(3)} · 分离 ${m.separation.toFixed(3)} · 转速 ${m.turnRate.toFixed(3)} rad/s · 本步接触 ${m.contacts} 次`;
  const signature=JSON.stringify([s.results.baseline?.signature,s.results.current?.signature,s.results.baseline?.elapsed,s.results.current?.elapsed,s.results.baseline?.parameters,s.results.current?.parameters,s.results.baseline?.viewport,s.results.current?.viewport]);
  if(signature!==lastResults){lastResults=signature;const box=$('exp-comparison');box.replaceChildren();const state=c.experiment.getState(),a=state.results.baseline,b=state.results.current;
   if(a||b){const images=document.createElement('div');images.className='comparison-images';for(const [label,result]of [['参考 A',a],['当前 B',b]])if(result){const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');image.src=result.image;image.alt=label+'：固定起点重播后的真实三维画面';caption.textContent=label+' · '+result.elapsed.toFixed(2)+' 秒 · 轨迹 '+result.signature;figure.append(image,caption);images.append(figure);}box.append(images);
    const description=document.createElement('p');description.textContent=state.difference?`位置平均差 ${state.difference.meanPosition.toFixed(4)}，最大差 ${state.difference.maxPosition.toFixed(4)} · ${state.difference.sameTrajectory?'两组终点状态一致':'参数变化产生不同轨迹'}${state.difference.sameViewport?'':' · 画布尺寸不同，可重新运行两组对照'}`:'运行另一组后显示同一时刻的位置差。';box.append(description);box.append(createExperimentPlot(state));
   }
  }
 }
 return {update};
}
