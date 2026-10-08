import {parseSceneJSON} from './scene-json.js';

export function bindSceneJSONControls({getCourtyard,notify}){
 const $=id=>document.getElementById(id),dialog=$('scene-json-dialog'),text=$('scene-json-text'),status=$('scene-json-status');
 let kind='calibration',opener=null;
 const exportCurrent=c=>kind==='calibration'?c.binding.exportCalibration():c.binding.exportData();
 function say(message,error=false){status.textContent=message;status.dataset.error=String(error);}
 function current(){try{const data=exportCurrent(getCourtyard());text.value=JSON.stringify(data,null,2);say(kind==='calibration'?'显示已提交的校准记录；编辑后点击“检查并应用”才会改变场景。':'显示当前绑定数据；未应用水域时显示标记草稿，点击“检查并应用”才会提交。');}catch(error){say(error.message,true);}}
 function open(next,button){const c=getCourtyard();if(!c?.imported)return;kind=next;opener=button;text.value='';
  $('scene-json-title').textContent=kind==='calibration'?'校准 JSON':'水域绑定 JSON';
  $('scene-json-help').textContent=kind==='calibration'?'粘贴与当前 GLB 配套的校准数据。会检查模型指纹、真实表面端点、已知长度与倍率。':'粘贴与当前 GLB、当前倍率配套的绑定数据。会检查池岸、水深、障碍与投喂位置；包含校准记录时也会核对。';
  try{text.value=JSON.stringify(exportCurrent(c),null,2);say('已载入当前数据；也可全选并粘贴之前保存的 JSON。');}catch{say('粘贴之前保存的 JSON，然后点击“检查并应用”。');}
  update();dialog.showModal();text.focus();
 }
 for(const [id,next]of [['calibration-json','calibration'],['binding-json','binding']])$(id).addEventListener('click',()=>open(next,$(id)));
 $('scene-json-current').addEventListener('click',current);
 $('scene-json-apply').addEventListener('click',()=>{try{const c=getCourtyard();if(!c?.imported)throw new Error('先导入 GLB 或加载程序示例');const data=parseSceneJSON(text.value);
  if(kind==='calibration')c.binding.importCalibration(data);else c.binding.importData(data);
  dialog.close();notify(kind==='calibration'?'校准 JSON 已应用；请检查当前倍率与水域标记。':'绑定 JSON 已应用；可以观察鱼群和投喂。');
 }catch(error){say(error.message,true);}});
 $('scene-json-close').addEventListener('click',()=>dialog.close());
 text.addEventListener('input',()=>say('内容尚未应用；点击“检查并应用”后才会改变场景。'));
 dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;
  const controls=[...dialog.querySelectorAll('button,textarea')].filter(el=>!el.disabled),first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 });
 dialog.addEventListener('close',()=>{if(opener?.isConnected&&!opener.disabled)opener.focus();});
 function update(){const c=getCourtyard(),loaded=!!c?.imported;for(const id of ['calibration-json','binding-json','scene-json-apply'])$(id).disabled=!loaded;
  $('scene-json-current').disabled=!loaded||(kind==='calibration'&&!c.binding.getState().calibration.record);
 }
 update();return {update};
}
