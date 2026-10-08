export function bindSceneControls({getCourtyard,selectTab,prepareInteraction,notify}){
 const $=id=>document.getElementById(id),ids=['binding-outline-mode','binding-undo-point','binding-clear-outline','binding-water-level','binding-depth','binding-feed-mode','binding-obstacle-mode','binding-obstacle-radius','binding-clear-obstacles','binding-apply','binding-disable','binding-export','binding-file','binding-markers','model-fit'];let lastList='',loading=false;
 const run=fn=>async()=>{try{const c=getCourtyard();if(!c||loading)return;await fn(c);update();}catch(e){notify(e.message);}};
 $('model-fit').addEventListener('click',run(c=>c.fitModel()));
 for(const [id,mode]of [['binding-outline-mode','outline'],['binding-feed-mode','feed'],['binding-obstacle-mode','obstacle']])$(id).addEventListener('click',run(c=>{prepareInteraction();c.binding.setMode(mode);c.settings.autoTour=false;if(c.binding.mode)$('viewport').scrollIntoView({behavior:'auto',block:'center'});}));
 $('binding-finish-mode').addEventListener('click',run(c=>c.binding.setMode(null)));
 $('binding-markers').addEventListener('change',run(c=>c.binding.showMarkers($('binding-markers').checked)));
 for(const [id,method]of [['binding-undo-point','undoPoint'],['binding-clear-outline','clearOutline'],['binding-clear-obstacles','clearObstacles'],['binding-apply','apply'],['binding-disable','disable']])$(id).addEventListener('click',run(c=>c.binding[method]()));
 for(const id of ['binding-water-level','binding-depth'])$(id).addEventListener('change',run(c=>c.binding.updateWater(Number($('binding-water-level').value),Number($('binding-depth').value))));
 $('binding-obstacle-radius').addEventListener('change',run(c=>{const radius=Number($('binding-obstacle-radius').value);if(!Number.isFinite(radius)||radius<.05||radius>2)throw new Error('障碍半径应为0.05–2');c.binding.obstacleRadius=radius;}));
 $('binding-export').addEventListener('click',run(c=>{const data=c.binding.exportData(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='koi-scene-binding.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('绑定文件包含模型指纹、倍率和水域标记，已导出');}));
 $('binding-file').addEventListener('change',run(async c=>{const file=$('binding-file').files[0];try{if(!file)return;if(file.size>100000)throw new Error('绑定文件过大');c.binding.importData(JSON.parse(await file.text()));}finally{$('binding-file').value='';}}));
 $('binding-demo').addEventListener('click',async()=>{if(loading)return;loading=true;update();try{await selectTab('scene');const c=getCourtyard();prepareInteraction();notify('正在加载程序模型与预设标记…');
  const [model,data]=await Promise.all([fetch('assets/binding-example.glb'),fetch('assets/binding-example.json')]);if(!model.ok||!data.ok)throw new Error('程序示例资源未加载');const bytes=await model.arrayBuffer(),preset=await data.json();
  await c.importGLB(new File([bytes],'binding-example.glb',{type:'model/gltf-binary'}));c.updateSettings({modelScale:1});c.binding.setDraft(preset.habitat);c.binding.apply();notify('程序示例已绑定动态水域；可改标记后重新应用');update();
 }catch(e){notify(e.message);}finally{loading=false;update();}});
 function update(){const c=getCourtyard(),loaded=!!c?.imported;for(const id of ids)$(id).disabled=!loaded||loading;$('binding-demo').disabled=loading;
  if(!c){$('binding-status').textContent='导入 GLB 或加载程序示例后可以标记。';return;}
  const s=c.binding.getState(),d=s.draft;for(const [id,mode]of [['binding-outline-mode','outline'],['binding-feed-mode','feed'],['binding-obstacle-mode','obstacle']])$(id).setAttribute('aria-pressed',String(s.mode===mode));
  $('binding-guide').hidden=!s.mode;$('binding-guide-text').textContent=({outline:'水域标记 · '+d.polygon.length+' 点 · 沿池岸顺序点击',feed:'投喂点 · 点击水域内的安全位置',obstacle:'障碍标记 · 点击中心，半径 '+($('binding-obstacle-radius').value||'.35'),calibration:'尺寸校准 · 已选 '+(s.calibration?.points.length||0)+'/2 点 · 点击模型实体表面'})[s.mode]||'';$('binding-markers').checked=s.markersVisible;
  if(document.activeElement!==$('binding-water-level'))$('binding-water-level').value=d.waterLevel;if(document.activeElement!==$('binding-depth'))$('binding-depth').value=d.depth;
  $('binding-apply').disabled=loading||!loaded||d.polygon.length<3;$('binding-disable').disabled=loading||!s.applied;
  $('binding-status').textContent=loaded?(s.applied?'动态绑定已应用 · 鱼群、水面与投喂启用'+(JSON.stringify(d)!==JSON.stringify(s.applied)?' · 草稿修改后需重新应用':''):'模型已载入 · 动态水域尚未应用'):'当前为程序庭院，未导入 GLB';
  $('binding-step').textContent=({outline:'正在标记水域：点击画布中的水位平面，按顺序围一圈；至少三个点。',feed:'正在标记投喂点：点击水域内的安全位置。',obstacle:'正在标记障碍：点击柱体或岩石中心；半径由下方设置。',calibration:'正在校准尺寸：在模型表面选两个端点，输入已知直线长度；完成后再标记水域。'})[s.mode]||(loaded?'校准尺寸 → 设置水位 → 标记轮廓 → 投喂点与障碍 → 应用动态绑定':'可以先加载程序示例体验完整绑定流程。');
  const point=d.feedPoint;$('binding-coordinates').textContent=`轮廓 ${d.polygon.length} 点 · 障碍 ${d.obstacles.length} 个 · 水位 ${d.waterLevel.toFixed(2)} · 投喂点 ${point?point.x.toFixed(2)+', '+point.z.toFixed(2):'未标记，将自动选择安全位置'}`;
  const listKey=JSON.stringify([loaded,d.polygon,d.obstacles]);if(listKey!==lastList){lastList=listKey;const list=$('binding-list');list.replaceChildren();
   for(const [items,type,method]of [[d.polygon,'水域点','removePoint'],[d.obstacles,'障碍','removeObstacle']])for(const [i,p]of items.entries()){const row=document.createElement('div'),text=document.createElement('span'),button=document.createElement('button');row.className='binding-list-row';text.textContent=`${type} ${i+1} (${p.x.toFixed(2)}, ${p.z.toFixed(2)})${p.radius?' · r '+p.radius.toFixed(2):''}`;button.textContent='删除';button.disabled=!loaded;button.setAttribute('aria-label',`删除${type} ${i+1}`);button.addEventListener('click',run(c=>c.binding[method](i)));row.append(text,button);list.append(row);}
  }
 }
 update();return {update};
}
