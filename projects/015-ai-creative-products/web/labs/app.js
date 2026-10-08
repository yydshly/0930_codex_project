const $=selector=>document.querySelector(selector);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const data=window.DEMO_DATA;
const id=Number(new URLSearchParams(location.search).get('id')||1);
const item=data.find(record=>record.id===id)||data[0];
document.title=`${String(item.id).padStart(2,'0')} · ${item.title}`;
$('#lab-title').textContent=item.title;$('#lab-number').textContent=`CASE ${String(item.id).padStart(2,'0')}`;$('#lab-kind').textContent=item.kind;$('#lab-brief').textContent=item.scenario;$('#lab-task').textContent=item.task;$('#lab-product').textContent=item.product;$('#lab-limit').textContent=item.limit;
$('#source-link').href=`../?v=16#demo-${String(item.id).padStart(2,'0')}`;
function parentVisible(){try{return parent===window||parent.document.body.dataset.activeView==='demo';}catch{return true;}}
let instance,active=parentVisible(),captureBusy=false;
const captureButton=$('#save-current-frame'),hasHostCapture=[5,10].includes(item.id);
captureButton.hidden=!hasHostCapture;
function downloadFile(name,content,mime='application/json;charset=utf-8'){
  const blob=content instanceof Blob?content:new Blob([content],{type:mime});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  $('#host-status').textContent='文件已准备，浏览器开始下载。';
}
const helpers={escape,downloadFile,onStatus:message=>$('#host-status').textContent=message,css:path=>{const url=new URL(path,location.href).href;if(![...document.querySelectorAll('link')].some(link=>link.href===url)){const link=document.createElement('link');link.rel='stylesheet';link.href=url;document.head.append(link);}}};
try{
  const module=await import(`./${item.module}.js?v=16-final`);
  instance=await module.mount($('#lab-root'),helpers);
  instance?.setActive?.(active);
  $('#host-status').textContent='演示已就绪。按上方控件完成本例任务。';
}catch(error){$('#lab-root').innerHTML='<div class="lab-controls"><p>本例模块暂未加载，请重新打开演示。原作仍可在研究页观看。</p></div>';$('#host-status').textContent=error.message;$('#export-state').disabled=true;}
const currentCanvas=()=>$('#lab-root canvas');
function captureAvailable(){const canvas=currentCanvas();return Boolean(hasHostCapture&&instance?.getState?.()?.renderer==='webgl'&&canvas?.toBlob&&canvas.width>0&&canvas.height>0&&!canvas.dataset.contextLost);}
function syncCapture(){if(!hasHostCapture)return;const available=captureAvailable();captureButton.disabled=captureBusy||!available;captureButton.title=available?'保存当前真实渲染的画面，尺寸与当前画布一致。':'当前未获得可用的 WebGL 画面，无法保存本例三维效果。';if(!available&&instance)$('#host-status').textContent='当前浏览器未提供可用的 WebGL 画面，三维画面 PNG 保存已停用。';}
syncCapture();
if(hasHostCapture&&currentCanvas()){
 currentCanvas().addEventListener('webglcontextlost',event=>{event.currentTarget.dataset.contextLost='true';syncCapture();});
 currentCanvas().addEventListener('webglcontextrestored',event=>{delete event.currentTarget.dataset.contextLost;syncCapture();});
}
captureButton.addEventListener('click',async()=>{
 if(!captureAvailable()||captureBusy)return;
 const canvas=currentCanvas();captureBusy=true;syncCapture();captureButton.textContent='正在保存画面…';
 try{
  // Export the current drawing buffer directly. Do not compose or redraw a substitute.
  const blob=await new Promise((resolve,reject)=>{canvas.toBlob(value=>value?resolve(value):reject(new Error('当前画面暂时无法保存，请待画面显示后再试。')),'image/png');});
  const stamp=new Date().toISOString().replace(/[-:]/g,'').slice(0,15);
  downloadFile(`case-${String(item.id).padStart(2,'0')}-当前画面-${stamp}.png`,blob,'image/png');
  $('#host-status').textContent='当前实际画面 PNG 已准备，浏览器开始下载。';
 }catch(error){$('#host-status').textContent=error.name==='SecurityError'?'当前画布的图像权限不允许保存，请重新打开本例后再试。':error.message;}
 finally{captureBusy=false;captureButton.textContent='保存当前画面 PNG';syncCapture();}
});
window.ProductLab=Object.freeze({id:item.id,getState:()=>instance?.getState?.(),getMeta:()=>item,isActive:()=>active});
$('#export-state').addEventListener('click',()=>{if(!instance)return;downloadFile(`case-${String(item.id).padStart(2,'0')}-体验记录.json`,JSON.stringify({schemaVersion:2,createdAt:new Date().toISOString(),caseId:item.id,product:item.product,task:item.task,state:instance.getState?.(),source:window.SOURCE_DATA.cases.find(record=>record.id===item.id)?.url,reference:item.reference,optimization:window.CASE_OPTIMIZATION_DATA?.[item.id]||null,scope:item.limit},null,2)+'\n');});
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='lab-visibility')return;active=Boolean(event.data.visible);instance?.setActive?.(active);});
window.addEventListener('pagehide',event=>{active=false;instance?.setActive?.(false);if(!event.persisted)instance?.dispose?.();});
window.addEventListener('pageshow',()=>{active=parentVisible();instance?.setActive?.(active);});
