import { Courtyard } from './scene.js';
import { DEFAULTS, validateSettings } from './config.js';
import { bindPrinciples } from './principles.js';
import {bindExperimentControls} from './experiment-ui.js';
import {bindSceneControls} from './binding-ui.js';
import {bindCalibrationControls} from './calibration-ui.js';
import {bindSceneJSONControls} from './scene-json-ui.js';
import {bindTour} from './tour-ui.js';
import {createSceneLoader} from './lazy-scene.js';
import {bindFeeding} from './feeding-ui.js';
import {bindSceneKeyboard} from './scene-keyboard.js';
import {bindWildlife} from './wildlife-ui.js';
const $=id=>document.getElementById(id),all=selector=>Array.from(document.querySelectorAll(selector));
let courtyard=null,currentTab=null,originalPoll=null,toastTimer=null,principlePanel=null,experimentPanel=null,bindingPanel=null,calibrationPanel=null,jsonPanel=null,tourPanel=null,feedingPanel=null,wildlifePanel=null;
function setToolbarOpen(open){$('toolbar-more').setAttribute('aria-expanded',String(open));$('toolbar-more').textContent=open?'收起操作':'更多操作';$('toolbar-more').closest('.scene-toolbar').dataset.toolsOpen=String(open);}
function toast(message){$('scene-toast').textContent=message;$('scene-toast').style.opacity='1';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('scene-toast').style.opacity='0',4500);}
function sync(settings){for(const input of all('[data-setting]'))input.value=settings[input.dataset.setting];
 for(const output of all('[data-output]')){const key=output.dataset.output,value=settings[key];output.textContent=key==='hour'?value.toFixed(1)+' 时':key==='fishCount'?value+' 条':key.endsWith('Scale')?value.toFixed(2)+' ×':value.toFixed(2);}
 for(const b of all('[data-weather]'))b.setAttribute('aria-pressed',String(b.dataset.weather===settings.weather));
 $('wireframe').checked=settings.wireframe;
 $('surface-wakes').checked=settings.surfaceWakes;
 $('fish-detail').checked=settings.fishDetail;
 $('tour-toggle').setAttribute('aria-pressed',String(settings.autoTour));$('pause-toggle').setAttribute('aria-pressed',String(settings.paused));
 $('tour-toggle').textContent=settings.autoTour?'结束漫游':'自动漫游';$('pause-toggle').textContent=settings.paused?'继续动态':'暂停动态';
 $('audio-toggle').setAttribute('aria-pressed',String(courtyard?.audio.enabled||false));
}
function onStatus(status){if(status.view&&$('view-select').querySelector('option[value="'+status.view+'"]'))$('view-select').value=status.view;if(status.settings)sync(status.settings);
 if(courtyard){const observing=courtyard.followFish?'fish':courtyard.followAnimal?'animal':courtyard.interaction.mode!=='idle'?'hand':'';if(observing&&observing!==$('viewport').dataset.observing)setToolbarOpen(false);$('viewport').dataset.observing=observing;}
 if(status.fps!==undefined)$('render-status').textContent=Math.round(status.fps)+' FPS · 实时 3D';
 if(status.message)toast(status.message);
 if(status.context==='restored'){$('scene-loader').hidden=true;$('scene-loader').textContent='';}
 if(status.error){$('scene-loader').hidden=false;$('scene-loader').textContent=status.error;}
 if(status.tour===false)$('tour-toggle').setAttribute('aria-pressed','false');
 if(status.interaction){const busy=!['idle','inspect'].includes(status.interaction);$('stop-interaction').hidden=status.interaction==='idle';for(const id of ['feed','stroke','hand-inspect','fish-inspect'])$(id).disabled=busy||(!!courtyard?.imported&&!courtyard?.hasDynamics);}
 if('model' in status){$('model-status').textContent=status.model?'当前模型：'+status.model:'尚未导入模型';for(const id of ['feed','stroke','hand-inspect','fish-inspect','wireframe','view-select','compare','tour-toggle'])$(id).disabled=!!status.model;for(const b of all('[data-animal]'))b.disabled=!!status.model;
 for(const input of all('[data-setting="pondScale"],[data-setting="deckScale"],[data-setting="houseScale"]'))input.disabled=!!status.model;}
 if(courtyard){const imported=!!courtyard.imported,unbound=imported&&!courtyard.hasDynamics,busy=!['idle','inspect'].includes(courtyard.interaction.mode);for(const id of ['feed','stroke','hand-inspect','fish-inspect'])$(id).disabled=busy||unbound;$('wireframe').disabled=unbound;$('view-select').disabled=unbound;$('view-select').querySelector('[value="model"]').disabled=!imported;
  for(const name of ['frog','turtle','dragonfly','cat'])$('view-select').querySelector('[value="'+name+'"]').disabled=imported;
  const subject=$('fish-subject'),count=courtyard.settings.fishCount;if(subject.dataset.count!==String(count)){subject.replaceChildren(...courtyard.school.fish.slice(0,count).map((f,i)=>new Option((i+1)+' · '+f.style,String(i))));subject.dataset.count=String(count);courtyard.inspectionId=Math.min(courtyard.inspectionId,Math.max(0,count-1));}subject.value=String(courtyard.inspectionId);$('fish-shot').value=courtyard.fishShot;subject.disabled=$('fish-shot').disabled=busy||unbound||!count;$('surface-wakes').disabled=unbound;}
 principlePanel?.update();experimentPanel?.update();bindingPanel?.update();calibrationPanel?.update();jsonPanel?.update();tourPanel?.update();feedingPanel?.update();wildlifePanel?.update();
}
function loadOriginal(){const frame=$('original-frame');if(frame.getAttribute('src')===frame.dataset.src)return;
 $('original-loading').hidden=false;frame.src=frame.dataset.src;
 clearInterval(originalPoll);originalPoll=setInterval(()=>{try{const doc=frame.contentDocument;if(!doc)return;
 const msg=doc.getElementById('loadmsg'),loader=doc.getElementById('loader');
 if(msg?.textContent.startsWith('Failed')){$('original-loading').textContent=msg.textContent;clearInterval(originalPoll);}
 else if(!loader&&doc.querySelector('canvas')){$('original-loading').hidden=true;clearInterval(originalPoll);}}catch{}},400);
}
const ensureCourtyard=createSceneLoader(async()=>{await new Promise(r=>requestAnimationFrame(r));return new Courtyard($('scene-canvas'),onStatus);});
let tabSelection=0;
async function selectTab(name){if(!['original','scene','tech'].includes(name))name='original';
 if(currentTab===name&&(name!=='scene'||courtyard))return;const request=++tabSelection;currentTab=name;for(const panel of all('main>section'))panel.hidden=panel.id!==name;
 for(const tab of all('[data-tab]')){const selected=tab.dataset.tab===name;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
 if(name!=='original'){$('original-frame').src='about:blank';clearInterval(originalPoll);}
 else loadOriginal();
 if(courtyard)courtyard.active=name==='scene';
 if(location.hash!=='#'+name)history.replaceState(null,'','#'+name);
 if(name==='scene'&&!courtyard){$('scene-loader').hidden=false;$('scene-loader').textContent='正在构造庭院…';try{courtyard=await ensureCourtyard();courtyard.active=currentTab==='scene';$('scene-loader').hidden=true;onStatus({settings:courtyard.settings});}
 catch(error){console.error(error);$('scene-loader').textContent='庭院启动失败：'+error.message;}}
 if(request!==tabSelection)return;
 if(name==='scene'&&courtyard){courtyard.active=true;courtyard.resize();principlePanel?.update();experimentPanel?.update();bindingPanel?.update();calibrationPanel?.update();}
 tourPanel?.update();feedingPanel?.update();wildlifePanel?.update();
}
for(const b of all('[data-tab]')){b.addEventListener('click',()=>selectTab(b.dataset.tab));b.addEventListener('keydown',e=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=all('[data-tab]'),index=tabs.indexOf(b),next=e.key==='Home'?0:e.key==='End'?2:(index+(e.key==='ArrowRight'?1:2))%3;tabs[next].focus();selectTab(tabs[next].dataset.tab);
});}
for(const b of all('[data-go]'))b.addEventListener('click',()=>selectTab(b.dataset.go));
addEventListener('hashchange',()=>selectTab(location.hash.slice(1)));
for(const input of all('[data-setting]'))input.addEventListener('input',()=>{if(courtyard)courtyard.updateSettings({[input.dataset.setting]:Number(input.value)});});
for(const b of all('[data-weather]'))b.addEventListener('click',()=>{if(courtyard)courtyard.updateSettings({weather:b.dataset.weather,hour:b.dataset.weather==='dusk'?18.3:b.dataset.weather==='rain'?14:16.3});});
$('view-select').addEventListener('change',e=>{courtyard?.setView(e.target.value);$('compare').value=0;updateCompare();sync(courtyard.settings);});
$('tour-toggle').addEventListener('click',()=>{if(courtyard){courtyard.interaction.stop();courtyard.followAnimal=null;courtyard.followFish=null;courtyard.school.inspectionFish=null;courtyard.transition=null;courtyard.updateSettings({autoTour:!courtyard.settings.autoTour});}});
$('pause-toggle').addEventListener('click',()=>courtyard?.updateSettings({paused:!courtyard.settings.paused}));
$('toolbar-more').addEventListener('click',()=>setToolbarOpen($('toolbar-more').getAttribute('aria-expanded')!=='true'));
function prepareInteraction(){$('compare').value=0;updateCompare();}
$('feed').addEventListener('click',()=>{prepareInteraction();courtyard?.feed();});
$('stroke').addEventListener('click',()=>{prepareInteraction();courtyard?.stroke();});
$('hand-inspect').addEventListener('click',()=>{prepareInteraction();courtyard?.inspectHand();});
$('fish-inspect').addEventListener('click',()=>{prepareInteraction();courtyard?.inspectFish();});
 for(const id of ['fish-subject','fish-shot'])$(id).addEventListener('change',()=>{if(!courtyard)return;courtyard.inspectionId=Number($('fish-subject').value);courtyard.fishShot=$('fish-shot').value;if(courtyard.followFish){prepareInteraction();courtyard.inspectFish();}});
 $('surface-wakes').addEventListener('change',e=>courtyard?.updateSettings({surfaceWakes:e.target.checked}));
 $('fish-detail').addEventListener('change',e=>courtyard?.updateSettings({fishDetail:e.target.checked}));
$('stop-interaction').addEventListener('click',()=>courtyard?.interaction.stop(true));
for(const b of all('[data-animal]'))b.addEventListener('click',()=>{prepareInteraction();courtyard?.observe(b.dataset.animal);$('view-select').value=b.dataset.animal;});
$('capture').addEventListener('click',()=>courtyard?.screenshot());
$('wireframe').addEventListener('change',e=>courtyard?.updateSettings({wireframe:e.target.checked}));
$('audio-toggle').addEventListener('click',async()=>{try{const enabled=await courtyard?.toggleSound();$('audio-toggle').setAttribute('aria-pressed',String(enabled));}catch(e){toast('声音未能启动：'+e.message);}});
$('reset').addEventListener('click',async()=>{if(!courtyard)return;if(courtyard.audio.enabled)await courtyard.audio.setEnabled(false);courtyard.reset();$('view-select').value='reference';$('compare').value=0;updateCompare();sync(courtyard.settings);toast('已恢复参考图布局');});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('viewport').requestFullscreen();}catch{toast('当前浏览器暂不支持全屏');}});
const dialog=$('reference-dialog');for(const id of ['show-reference','reference-thumb'])$(id).addEventListener('click',()=>dialog.showModal());
$('close-reference').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
function updateCompare(){const n=Number($('compare').value);$('reference-overlay').hidden=n===0;$('reference-overlay').style.opacity=String(n/100);$('compare-value').textContent=n+'%';if(n>0&&courtyard){courtyard.settings.autoTour=false;courtyard.setView('reference',true);$('view-select').value='reference';sync(courtyard.settings);}}
$('compare').addEventListener('input',updateCompare);
$('export-settings').addEventListener('click',()=>{if(!courtyard)return;const data={format:'koi-scene-lab/v1',visualTarget:'courtyard-target.png',units:'meters-design-estimate',settings:courtyard.settings};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='koi-courtyard-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('场景参数已导出');});
$('settings-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file||!courtyard)return;
 try{if(file.size>100000)throw new Error('参数文件过大');const data=JSON.parse(await file.text());if(data.format!=='koi-scene-lab/v1')throw new Error('不是本项目的场景参数文件');
 const settings=validateSettings(data.settings||{});settings.sound=courtyard.audio.enabled;courtyard.updateSettings(settings);toast('场景参数已应用');}
 catch(error){toast('导入失败：'+error.message);}finally{e.target.value='';}});
$('model-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file||!courtyard)return;
 try{toast('正在读取模型…');await courtyard.importGLB(file);}catch(error){toast('模型导入失败：'+error.message);}finally{e.target.value='';}});
$('clear-model').addEventListener('click',()=>courtyard?.clearModel());
bindSceneKeyboard({getCourtyard:()=>courtyard,getCurrentTab:()=>currentTab,canvas:$('scene-canvas'),prepareInteraction,setToolbarOpen});
principlePanel=bindPrinciples({getCourtyard:()=>courtyard,selectTab,prepareInteraction});
feedingPanel=bindFeeding({getCourtyard:()=>courtyard,prepareInteraction,refresh:()=>onStatus({settings:courtyard?.settings})});
wildlifePanel=bindWildlife({getCourtyard:()=>courtyard});
experimentPanel=bindExperimentControls({getCourtyard:()=>courtyard,notify:toast});
bindingPanel=bindSceneControls({getCourtyard:()=>courtyard,selectTab,prepareInteraction,notify:toast});
calibrationPanel=bindCalibrationControls({getCourtyard:()=>courtyard,prepareInteraction,notify:toast});
jsonPanel=bindSceneJSONControls({getCourtyard:()=>courtyard,notify:toast});
tourPanel=bindTour({getCourtyard:()=>courtyard,getCurrentTab:()=>currentTab,selectTab,prepareInteraction,refresh:()=>onStatus({settings:courtyard?.settings})});
selectTab(location.hash.slice(1)||'original');
