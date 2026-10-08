import {gardenAreas} from './renderers.js';
const amount=v=>v.toFixed(1)+' m²';
const colors={'#356873':'海湾蓝','#bb633f':'日落橙','#4d6b58':'松石绿'};
export function sceneDecision(scene,p,{saved=null,current=null,viewingSaved=false}={}){
  if(scene==='product')return {title:'这套配置，可以直接带走。',summary:`ARC / 01 · ${colors[p.color]||p.color} · ${p.finish==='gloss'?'亮面涂层':'细腻哑光'}`,metrics:[['灯光亮度',p.light+'%'],['结构状态',p.explode?'展开 '+p.explode+'%':'完整装配'],['查看场景',(p.setting==='interior'?'室内':'棚拍')+' · '+(p.room==='night'?'夜景':'日光')]],note:'确认外观与结构后，导出画面和配置需求单，交给设计或产品团队继续讨论。',comparison:null};
  if(scene==='brand')return {title:'把这次活动的方向定下来。',summary:(p.name.trim()||'品牌名称')+' · '+p.goal,metrics:[['传播主题',p.headline.trim()||'待填写'],['试饮茶款',({spring:'春芽绿茶',oolong:'焙香乌龙',black:'蜜香红茶'})[p.tea]],['视觉配色',({forest:'山林绿',cobalt:'电光蓝',orange:'日光橙'})[p.theme]]],note:'需求单保留活动标题、茶款和行动目标；商家补齐时间、地址与预约服务后继续落地。',comparison:null};
  const a=gardenAreas(p),comparison=saved?{方案A:{参数:{...saved},面积_m2:gardenAreas(saved)},当前方案:{参数:{...current},面积_m2:gardenAreas(current)},当前相对A_m2:Object.fromEntries(Object.keys(a).map(k=>[k,Number((gardenAreas(current)[k]-gardenAreas(saved)[k]).toFixed(2))]))}:null;
  let note='先保存方案 A，再调整水景或平台。你会看到每个选择占用了多少面积。';
  if(comparison){const delta=comparison.当前相对A_m2,sign=v=>(v>0?'+':'')+v.toFixed(1)+' m²';note=['pond','green','deck'].every(k=>delta[k]===0)&&current.width===saved.width&&current.depth===saved.depth?'当前面积分配与方案 A 一致；可以调整比例继续比较。':`当前方案相对 A：水景 ${sign(delta.pond)}，绿化 ${sign(delta.green)}，平台 ${sign(delta.deck)}。${current.width!==saved.width||current.depth!==saved.depth?'场地尺寸也已变化，请结合总面积比较。':'在同一场地内比较空间取舍。'}`;}
  return {title:viewingSaved?'正在查看已保存的方案 A。':'这一版庭院，空间这样分。',summary:`${p.width} × ${p.depth} m · ${p.priority==='gather'?'更多聚会空间':'围绕水景'} · ${p.time==='night'?'夜间':'日光'}`,metrics:[['水景',amount(a.pond)],['绿化',amount(a.green)],['活动平台',amount(a.deck)]],note,comparison};
}
