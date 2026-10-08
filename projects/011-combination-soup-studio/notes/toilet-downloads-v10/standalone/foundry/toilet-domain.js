// Illustrative merchant catalog. No manufacturer SKU or certified installation rule.
export const defaultToilet={
  catalog:[
    {id:'compact',name:'C1 紧凑款',description:'为紧凑空间保留更短的投影长度。',width:365,depth:650,height:735,seatHeight:420,price:2190,tank:true,requiresPower:false,roughIns:[305,400]},
    {id:'comfort',name:'C2 舒适款',description:'较高坐面与较长便圈，比较坐姿与空间取舍。',width:390,depth:700,height:760,seatHeight:440,price:3490,tank:true,requiresPower:false,roughIns:[305,400]},
    {id:'smart',name:'S1 智能概念款',description:'无外置水箱的整洁形体；电子功能需真实型号确认。',width:390,depth:690,height:485,seatHeight:425,price:5790,tank:false,requiresPower:true,roughIns:[305,400]}
  ],
  rules:{frontClearance:300,sideClearance:80,installationPrice:690},
  initial:{modelId:'smart',roughIn:305,lid:0,explode:0,view:'hero',dimensions:false,includeInstallation:false,site:{drain:'floor',roughIn:null,width:null,depth:null,power:'unknown',notes:''}}
};
const text=(v,max=240)=>typeof v==='string'?v.trim().slice(0,max):'';
const bounded=(v,min,max,label)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(label+`应在 ${min}–${max} 范围内。`);return Math.round(v);};
const percent=v=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(100,v)):0;
function siteValue(v,label,max=10000){return v===null||v===undefined||v===''?null:bounded(v,100,max,label);}
export function normalizeToilet(raw=defaultToilet){
  if(!Array.isArray(raw.catalog)||!raw.catalog.length||raw.catalog.length>6)throw new Error('马桶目录需要 1–6 款产品。');
  const catalog=raw.catalog.map((m,i)=>{
    if(!text(m.name,60))throw new Error('请填写马桶型号名称。');
    if(!Array.isArray(m.roughIns)||!m.roughIns.length||m.roughIns.length>5)throw new Error('请提供每款马桶的坑距选项。');
    const roughIns=[...new Set(m.roughIns.map(v=>bounded(v,100,600,'型号坑距')))];
    return {id:/^[a-z0-9-]{1,40}$/.test(m.id)?m.id:'model-'+i,name:text(m.name,60),description:text(m.description),width:bounded(m.width,250,700,'宽度（mm）'),depth:bounded(m.depth,400,1000,'长度（mm）'),height:bounded(m.height,350,1100,'总高（mm）'),seatHeight:bounded(m.seatHeight,300,550,'坐高（mm）'),price:bounded(m.price,0,99999,'示例单价（元）'),tank:m.tank===true,requiresPower:m.requiresPower===true,roughIns};
  });
  if(catalog.some(m=>m.height<m.seatHeight+40))throw new Error('总高应至少比坐高多 40 mm，以容纳示例盖板与组件。');
  if(new Set(catalog.map(m=>m.id)).size!==catalog.length)throw new Error('型号 ID 不能重复。');
  const r=raw.rules||defaultToilet.rules,rules={frontClearance:bounded(r.frontClearance,0,1500,'前方预留（mm）'),sideClearance:bounded(r.sideClearance,0,1000,'单侧预留（mm）'),installationPrice:bounded(r.installationPrice,0,99999,'示例安装费（元）')};
  const s=raw.initial||defaultToilet.initial,m=catalog.find(m=>m.id===s.modelId)||catalog[0],site=s.site||{};
  return {catalog,rules,initial:{modelId:m.id,roughIn:m.roughIns.includes(s.roughIn)?s.roughIn:m.roughIns[0],lid:percent(s.lid),explode:percent(s.explode),view:['hero','front','side','structure'].includes(s.view)?s.view:'hero',dimensions:s.dimensions===true,includeInstallation:s.includeInstallation===true,site:{drain:['floor','wall','unknown'].includes(site.drain)?site.drain:'unknown',roughIn:siteValue(site.roughIn,'现场坑距',600),width:siteValue(site.width,'可用宽度'),depth:siteValue(site.depth,'可用进深'),power:['yes','no','unknown'].includes(site.power)?site.power:'unknown',notes:text(site.notes,400)}}};
}
export function checkToiletFit(model,selection,site,rules){
  const checks=[];
  const add=(key,label,status,detail)=>checks.push({key,label,status,detail});
  add('drain','排水方式',site.drain==='unknown'?'missing':site.drain==='floor'?'match':'conflict',site.drain==='unknown'?'请确认排水方式。':site.drain==='floor'?'与示例落地下排水类型一致。':'当前目录为落地下排水，请另选后排水产品。');
  add('roughIn','现场坑距',site.roughIn===null?'missing':site.roughIn===selection.roughIn?'match':'conflict',site.roughIn===null?'填写完成墙面至排污口中心的实测距离。':`现场 ${site.roughIn} mm / 所选 ${selection.roughIn} mm`+(site.roughIn===selection.roughIn?'，输入参数一致。':'，按厂家允许范围复核。'));
  const width=model.width+rules.sideClearance*2,depth=model.depth+rules.frontClearance;
  add('width','可用宽度',site.width===null?'missing':site.width>=width?'match':'conflict',site.width===null?`待测量；示例规划需至少 ${width} mm。`:`可用 ${site.width} mm / 示例规划 ${width} mm。`);
  add('depth','可用进深',site.depth===null?'missing':site.depth>=depth?'match':'conflict',site.depth===null?`待测量；示例规划需至少 ${depth} mm。`:`可用 ${site.depth} mm / 示例规划 ${depth} mm。`);
  add('power','电源条件',!model.requiresPower?'match':site.power==='unknown'?'missing':site.power==='yes'?'match':'conflict',!model.requiresPower?'本示例款不要求接电。':site.power==='yes'?'已记录有电源；位置、防护与规格需现场确认。':site.power==='no'?'所选电子款需要电源，当前条件不满足。':'请确认所选电子款的电源条件。');
  const conflicts=checks.filter(c=>c.status==='conflict').length,missing=checks.filter(c=>c.status==='missing').length;
  return {status:conflicts?'conflict':missing?'incomplete':'preliminary-match',title:conflicts?`${conflicts} 项条件需要调整`:missing?`${missing} 项现场信息待补充`:'输入参数与示例规则一致',checks,requiredWidth:width,requiredDepth:depth,notice:'这是示例参数的初步核对，前方和单侧预留是可编辑的规划值。安装可行性仍需产品图纸、供水条件与现场复核。'};
}
export function toiletResult(c,state,observation){
  const m=c.toilet.catalog.find(m=>m.id===state.modelId),r=c.toilet.rules;
  const fit=checkToiletFit(m,state,state.site,r),installation=state.includeInstallation?r.installationPrice:0;
  return {schemaVersion:'1.0',product:c.name,item:m.name,dataMode:'illustrative-catalog',selection:{kind:'toilet',modelId:m.id,modelName:m.name,color:state.color,colorName:c.product.colors.find(v=>v.value===state.color)?.label,roughIn:state.roughIn,lidPercent:state.lid,structurePercent:state.explode,view:state.view,dimensions:state.dimensions,includeInstallation:state.includeInstallation},specification:{widthMm:m.width,depthMm:m.depth,heightMm:m.height,seatHeightMm:m.seatHeight,requiresPower:m.requiresPower},site:structuredClone(state.site),fit,estimate:{mode:'demonstration-only',currency:'CNY',product:m.price,installation,total:m.price+installation},observation,submitted:false};
}
export function toiletSheet(result){
  const s=result.selection,m=result.specification;
  return [`# ${result.product} · 选型交接单`,'',`型号：${s.modelName}`,`配色：${s.colorName}`,`所选坑距：${s.roughIn} mm`,`宽 × 长 × 总高：${m.widthMm} × ${m.depthMm} × ${m.heightMm} mm`,`坐高：${m.seatHeightMm} mm`,'',`示例商品价：¥${result.estimate.product}`,`示例安装费：¥${result.estimate.installation}`,`示例合计：¥${result.estimate.total}（非实际报价）`,'','## 现场初步核对','',result.fit.title,...result.fit.checks.map(x=>`- ${x.label}：${x.detail}`),'',`备注：${result.site.notes||'未填写'}`,'',result.fit.notice,'','型号、尺寸与报价为虚构示例；未提交订单。真实型号须接入厂商图纸、产品清单与实际服务报价。',''].join('\n');
}
export const toiletSources=[{name:'TOTO：坑距定义与产品图纸',url:'https://reborntotoitems.toto.com.cn/cn/faq/55.html'},{name:'KOHLER：选型与安装条件',url:'https://experience.kohler.com/en/inspiration/buying-guides/toilets-buying-guide'}];
