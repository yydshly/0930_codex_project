import {calibrationStatusText} from './calibration-status.js';
export function bindCalibrationControls({getCourtyard,prepareInteraction,notify}){
 const $=id=>document.getElementById(id),controls=['calibration-pick','calibration-distance','calibration-apply','calibration-cancel','calibration-clear','calibration-export','calibration-file'];
 let previousRecord=null,wasPending=false;
 const run=fn=>async()=>{try{const c=getCourtyard();if(!c)return;await fn(c);update();}catch(error){notify(error.message);}};
 $('calibration-pick').addEventListener('click',run(c=>{prepareInteraction();c.fitModel();c.binding.beginCalibration();$('viewport').scrollIntoView({behavior:'auto',block:'center'});}));
 $('calibration-apply').addEventListener('click',run(c=>{c.binding.applyCalibration(Number($('calibration-distance').value));notify('尺寸已按已知距离校准；请在当前倍率标记并应用水域。');}));
 $('calibration-clear').addEventListener('click',run(c=>c.binding.clearCalibration()));
 $('calibration-cancel').addEventListener('click',run(c=>c.binding.cancelCalibration()));
 $('calibration-export').addEventListener('click',run(c=>{const data=c.binding.exportCalibration(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='koi-model-calibration.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('校准文件已导出，与当前GLB配套保留。');}));
 $('calibration-file').addEventListener('change',run(async c=>{const file=$('calibration-file').files[0];try{if(!file)return;if(file.size>100000)throw new Error('校准文件过大');c.binding.importCalibration(JSON.parse(await file.text()));notify('已应用同一模型的尺寸校准；请检查水域标记。');}finally{$('calibration-file').value='';}}));
 function update(){const c=getCourtyard(),loaded=!!c?.imported;for(const id of controls)$(id).disabled=!loaded;
  if(!loaded){$('calibration-status').textContent='导入模型后可以校准尺寸。';$('calibration-pick').setAttribute('aria-pressed','false');$('calibration-pick').textContent='选取两个基准点';previousRecord=null;wasPending=false;return;}
  const s=c.binding.getState().calibration||{points:[],record:null},points=s.points||[],record=s.record;
  $('calibration-pick').setAttribute('aria-pressed',String(s.collecting));$('calibration-pick').textContent=s.collecting?'重新选取两个基准点':'选取两个基准点';
  $('calibration-apply').disabled=points.length!==2;$('calibration-export').disabled=!record;$('calibration-cancel').disabled=!s.pending;$('calibration-clear').disabled=!points.length&&!record&&!s.pending;
  $('calibration-status').textContent=calibrationStatusText(s,c.settings.modelScale);
  const recordKey=record?JSON.stringify(record):null;
  if(record&&(recordKey!==previousRecord||wasPending&&!s.pending)&&document.activeElement!==$('calibration-distance'))$('calibration-distance').value=record.realDistanceMeters;
  previousRecord=recordKey;wasPending=!!s.pending;
 }
 update();return {update};
}
