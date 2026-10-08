import {defaultToilet,normalizeToilet,toiletResult,toiletSheet} from './toilet-domain.js';
export const VERSION='1.0';
export const templates={
  product:{name:'产品选配',description:'比较外观，保留明确配置。',flow:['查看产品','调整颜色与表面','检查结构','导出所选配置'],modules:['参数化产品预览','选项与状态同步','配置导出'],pending:['真实产品模型与尺寸','库存、报价或订单接口'],metrics:['首次使用者能否独立完成选配','配置导出是否准确','选配耗时与重复询问次数']},
  coverage:{name:'服务资格查询',description:'根据提供的地区规则给出答案。',flow:['选择地区','核对服务资格','填写需求说明','导出查询摘要'],modules:['地区规则查询','覆盖与未覆盖反馈','需求摘要导出'],pending:['业务方确认的地区规则','咨询提交与送达接口'],metrics:['查询结果与确认规则是否一致','咨询摘要缺失字段数','确认覆盖范围的耗时']}
};
const shared={schemaVersion:VERSION,branding:{title:'找到适合自己的那一款。',tagline:'选择、比较，把确定的结果带走。',accent:'#356873'},useAI:false,product:{name:'ARC 模块桌灯',colors:[{label:'海湾蓝',value:'#356873'},{label:'日落橙',value:'#bb633f'},{label:'松石绿',value:'#4d6b58'}],features:{finish:true,light:true,structure:true}},coverage:{serviceName:'灯具安装',regions:[{id:'hangzhou',name:'杭州',available:true,detail:'示例规则：提供灯具安装，请补充安装位置与数量。'},{id:'ningbo',name:'宁波',available:true,detail:'示例规则：提供安装服务，具体地址需要人工确认。'},{id:'shanghai',name:'上海',available:false,detail:'示例规则：目前未覆盖，先记录需求供后续讨论。'}]}};
export const presets={
  product:{...structuredClone(shared),template:'product',name:'配灯 · 灯具选配',idea:'让购买桌灯的人自己比较配色和表面，确认一套配置后交给销售。',audience:'准备购买桌灯的顾客',problem:'照片难以说明不同配色和结构，沟通时容易记错所选配置。',input:'产品选项、颜色和结构说明',outcome:'一份准确保留选择的产品配置单'},
  coverage:{...structuredClone(shared),template:'coverage',name:'到家 · 安装服务查询',idea:'让顾客先确认自己的地区是否提供安装服务，再留下完整需求。',audience:'准备预约灯具安装的顾客',problem:'顾客反复询问服务范围，咨询信息也经常不完整。',input:'地区、服务规则和用户需求',outcome:'明确的资格结果与可交接的咨询摘要',branding:{title:'先确认地区，再安排安装。',tagline:'服务范围清楚，下一步更省心。',accent:'#586a4d'}},
  toilet:{...structuredClone(shared),template:'product',name:'形卫 · 马桶选型',idea:'让装修用户比较马桶形体、尺寸与配置，核对现场条件后，把完整选型交给销售或安装人员。',audience:'正在装修或更换马桶的家庭',problem:'只看图片容易忽略坑距、占用空间和电源条件，选型与安装沟通需要反复确认。',input:'产品目录、所选坑距、现场尺寸与电源条件',outcome:'包含产品配置、现场核对、示例报价和待确认项的选型单',branding:{title:'让日常，安静一点。',tagline:'细腻的釉面，舒展的形体。为你的卫浴空间，找到合适的一款。',accent:'#566c65'},product:{kind:'toilet',name:'FORM 形卫 · 坐便器系列',colors:[{label:'暖瓷白',value:'#f5f1e7'},{label:'纯净白',value:'#f9fbfc'},{label:'石墨灰',value:'#5e6665'}],features:{finish:false,light:false,structure:true}},toilet:structuredClone(defaultToilet)}
};
export const clone=v=>structuredClone(v);
const clean=(v,max=600)=>typeof v==='string'?v.trim().slice(0,max):'';
const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
export function normalize(raw){
  if(!raw||raw.schemaVersion!==VERSION)throw new Error('产品定义版本不支持，请导入本工作台导出的 JSON。');
  if(!Object.hasOwn(templates,raw.template))throw new Error('请选择已支持的产品任务模板。');
  const cfg={schemaVersion:VERSION,template:raw.template,name:clean(raw.name,80),idea:clean(raw.idea),audience:clean(raw.audience,160),problem:clean(raw.problem),input:clean(raw.input,180),outcome:clean(raw.outcome,180),useAI:raw.useAI===true};
  for(const [key,label] of [['name','产品名称'],['idea','产品想法'],['audience','目标用户'],['outcome','完成结果']])if(!cfg[key])throw new Error('请填写'+label+'。');
  if(!hex(raw.branding?.accent))throw new Error('品牌颜色应使用六位十六进制颜色。');
  cfg.branding={title:clean(raw.branding.title,160)||cfg.name,tagline:clean(raw.branding.tagline,240),accent:raw.branding.accent.toLowerCase()};
  const product=raw.product||presets.product.product;
  if(product.kind!==undefined&&!['lamp','toilet'].includes(product.kind))throw new Error('当前产品形体支持桌灯和马桶。');
  if(!Array.isArray(product.colors)||product.colors.length<1||product.colors.length>6)throw new Error('产品需要 1–6 个配色选项。');
  const colors=product.colors.map(c=>{if(!clean(c.label,40)||!hex(c.value))throw new Error('请为配色填写名称和有效颜色。');return {label:clean(c.label,40),value:c.value.toLowerCase()};});
  if(new Set(colors.map(c=>c.value)).size!==colors.length)throw new Error('配色值不能重复。');
  const features=Object.fromEntries(['finish','light','structure'].map(k=>[k,product.features?.[k]!==false])),initial=product.initial||{};
  cfg.product={kind:product.kind||'lamp',name:clean(product.name,80)||'示例产品',colors,features,initial:{color:colors.some(v=>v.value===initial.color)?initial.color:colors[0].value,finish:features.finish&&initial.finish==='gloss'?'gloss':'matte',light:features.light&&Number.isFinite(initial.light)?Math.max(0,Math.min(100,initial.light)):70,explode:features.structure&&Number.isFinite(initial.explode)?Math.max(0,Math.min(100,initial.explode)):0}};
  cfg.toilet=normalizeToilet(raw.toilet||defaultToilet);
  if(!features.structure){cfg.toilet.initial.explode=0;if(cfg.toilet.initial.view==='structure')cfg.toilet.initial.view='hero';}
  const coverage=raw.coverage||presets.coverage.coverage;
  if(!Array.isArray(coverage.regions)||coverage.regions.length<1||coverage.regions.length>30)throw new Error('服务查询需要 1–30 个地区。');
  cfg.coverage={serviceName:clean(coverage.serviceName,80)||'服务',regions:coverage.regions.map((r,i)=>{if(!clean(r.name,40))throw new Error('地区名称不能为空。');return {id:'region-'+i,name:clean(r.name,40),available:r.available===true,detail:clean(r.detail,240)};})};
  if(new Set(cfg.coverage.regions.map(r=>r.name)).size!==cfg.coverage.regions.length)throw new Error('地区名称不能重复。');
  return cfg;
}
export function definition(raw){
  const c=normalize(raw),t=templates[c.template],p=c.product;
  const toilet=c.template==='product'&&p.kind==='toilet';
  const flow=toilet?['比较马桶型号与尺寸','选择配色和坑距','观察盖板与部件','核对现场尺寸和电源','记录示例报价','导出选型交接单']:c.template==='product'?['查看产品','选择配色',...(p.features.finish?['比较表面']:[]),...(p.features.light?['调整灯光']:[]),...(p.features.structure?['检查结构']:[]),'导出所选配置']:t.flow;
  return {schemaVersion:VERSION,product:c,construction:{mode:'local-template',modelConnected:false},userFlow:flow,implemented:toilet?['系列主视觉与材质细节影像','可独立运行的品牌展示页','参数化马桶与卫浴场景','型号/尺寸/坑距与配色同步','盖板开合与部件观察','现场条件初步核对','示例报价与完整选型单']: [...t.modules],pending:[...(toilet?['厂商真实 SKU、图纸与供水要求','库存、正式报价与订单/安装接口']:t.pending),...(c.useAI?['AI 模型服务、输入输出校验、失败与费用控制']:[])],acceptance:['用户完成完整任务','结果与输入规则一致','导出与屏幕一致','手机和键盘可操作'],valueMeasures:toilet?['现场条件缺失或冲突是否被正确记录','客户是否能区分三款形体与尺寸','销售与安装人员是否能依据选型单继续沟通']:t.metrics};
}
export function markdown(raw){
  const d=definition(raw),c=d.product;
  const toilet=c.template==='product'&&c.product.kind==='toilet';
  const brief=[`# ${c.name} · 产品定义与首版交付`,'','## 产品想法','',c.idea,'',`目标用户：${c.audience}`,`用户问题：${c.problem}`,`输入：${c.input}`,`完成结果：${c.outcome}`,'','## 首版任务','',...d.userFlow.map((s,i)=>`${i+1}. ${s}`),'','## 已实现原型','',...d.implemented.map(s=>'- '+s),'',`构建方式：本地模板与用户明确填写的产品定义。自由文本不由在线模型分析。${toilet?'马桶使用原创参数化概念模型，目录、尺寸、规划值与报价为可编辑示例。':'产品选配使用原创概念模型；地区规则为用户填写的本地数据，默认示例尚未获业务方确认。'}`,'','## 下一阶段接入','',...d.pending.map(s=>'- '+s),'','## 验收','',...d.acceptance.map(s=>'- '+s),'','## 待测价值','',...d.valueMeasures.map(s=>'- '+s),'','## 启动项目包','','在解压目录运行 python -m http.server 8080，再打开 http://127.0.0.1:8080/ 。包内不需要 npm 安装，包含当前配置和需要的本地文件。模板已实现的任务可操作；账号、支付、真实提交和 AI 服务未接入。',''].join('\n');
  return brief+(toilet?'\n---\n\n'+toiletSheet(toiletResult(c,{...c.toilet.initial,color:c.product.initial.color})): '');
}
export const escapeHTML=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function prototypeHTML(raw,runtime='./foundry/prototype.js',instanceId='standalone'){
  const c=normalize(raw),json=JSON.stringify({...c,_instanceId:instanceId}).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(c.name)}</title><link rel="stylesheet" href="${escapeHTML(new URL('prototype.css',new URL(runtime,'https://relative.invalid/')).href.replace('https://relative.invalid/','./'))}"></head><body><div id="app"></div><script type="application/json" id="prototype-config">${json}</script><script type="module" src="${escapeHTML(runtime)}"></script></body></html>`;
}
export const productAssets=['product-renderer.js','scene-materials.js','vendor/three-r160.min.js','vendor/THREE-LICENSE.txt','assets/wood-v5.webp','assets/stone-v5.webp','assets/studio-environment-v5.webp'];
export const toiletAssets=['foundry/toilet-preview.js','foundry/toilet-renderer.js','foundry/toilet-shapes.js','foundry/toilet-room.js','foundry/toilet.css','foundry/assets/toilet-hero-v11.webp','foundry/assets/toilet-hero-mobile-v11.webp','foundry/assets/toilet-detail-v11.webp','foundry/assets/toilet-travertine-v11.webp','foundry/assets/toilet-green-stone-v11.webp','assets/studio-environment-v5.webp','vendor/three-r160.min.js','vendor/THREE-LICENSE.txt'];
