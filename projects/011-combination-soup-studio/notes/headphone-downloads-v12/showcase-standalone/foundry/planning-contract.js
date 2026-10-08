// A plan is data. It never selects a script URL or supplies executable HTML.
export const PLAN_VERSION='1.0';
export const briefExample={product:'头戴式耳机',goal:'让用户看清外观、比较材质并选择配色，留下明确的配置。',audience:'关注外观与日常佩戴的购买者',priority:'优先保证产品质感，操作清楚，手机也能完整展示。',preference:'简洁、安静的暖色棚拍；可以切换夜色声场。',materials:'尚无厂商照片和模型，可先做明确标示的原创概念。'};
const text=(v,max=900)=>typeof v==='string'?v.trim().slice(0,max):'';
export function normalizeBrief(raw){const b=Object.fromEntries(Object.keys(briefExample).map(k=>[k,text(raw?.[k],k==='product'?90:900)]));if(!b.product||!b.goal)throw new Error('填写产品名称和希望用户完成的任务即可开始。');return b;}
export const briefKey=b=>JSON.stringify(normalizeBrief(b));
const list=(v,label,min=1,max=20)=>{if(!Array.isArray(v)||v.length<min||v.length>max)throw new Error(label+'数量不合适。');return v.map(x=>{const s=text(x,500);if(!s)throw new Error(label+'不能留空。');return s;});};
export function normalizePlan(raw){
  if(!raw||raw.schemaVersion!==PLAN_VERSION)throw new Error('制作方案版本不支持。');
  if(!['headphones','toilet','lamp','other'].includes(raw.category))throw new Error('制作方案的产品类型无效。');
  const visual=raw.visual||{},palette=list(visual.palette,'配色',2,5);if(palette.some(v=>!/^#[0-9a-f]{6}$/i.test(v)))throw new Error('方案配色需要有效的六位颜色。');
  const rows=(items,keys,label)=>{if(!Array.isArray(items)||items.length<1||items.length>20)throw new Error(label+'需要 1–20 项。');return items.map(item=>Object.fromEntries(keys.map(k=>{const value=text(item?.[k],600);if(!value)throw new Error(label+'内容不完整。');return [k,value];})));};
  const p={schemaVersion:PLAN_VERSION,category:raw.category,product:text(raw.product,90),summary:text(raw.summary),headline:text(raw.headline,100),tagline:text(raw.tagline,220),userFlow:list(raw.userFlow,'用户步骤',2,8),visual:{direction:text(visual.direction,100),composition:text(visual.composition),materials:text(visual.materials),mobile:text(visual.mobile),palette},requirements:rows(raw.requirements,['area','requirement','verify'],'制作要求'),assets:rows(raw.assets,['name','role','status'],'素材清单'),interactions:list(raw.interactions,'操作',1,12),missing:list(raw.missing,'缺失资料',0,12),acceptance:list(raw.acceptance,'验收任务',2,12),assumptions:list(raw.assumptions,'方案假设',0,12)};
  if(!p.product||!p.summary||!p.headline||!p.visual.direction||!p.visual.composition||!p.visual.materials||!p.visual.mobile)throw new Error('制作方案缺少必要内容。');return p;
}
const str={type:'string'},array=(items,min=1,max=20)=>({type:'array',items,minItems:min,maxItems:max}),object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const planSchema=object({schemaVersion:{type:'string',enum:[PLAN_VERSION]},category:{type:'string',enum:['headphones','toilet','lamp','other']},product:str,summary:str,headline:str,tagline:str,userFlow:array(str,2,8),visual:object({direction:str,composition:str,materials:str,mobile:str,palette:array({type:'string',pattern:'^#[0-9a-fA-F]{6}$'},2,5)}),requirements:array(object({area:str,requirement:str,verify:str})),assets:array(object({name:str,role:str,status:str})),interactions:array(str,1,12),missing:array(str,0,12),acceptance:array(str,2,12),assumptions:array(str,0,12)});
export const adapterNames={headphones:'头戴式耳机',toilet:'马桶选型',lamp:'桌灯选配',other:'新产品'};
export function assertPlanMatches(plan,brief){
  // Unnamed novel products must not silently become the headphone demo.
  const expected=classifyProduct(brief.product);
  if(plan.category!==expected)throw new Error('方案类型与输入产品不一致，请重新整理。');
  return plan;
}

export function classifyProduct(value){const name=value.toLowerCase();if(/入耳|耳塞|earbud/.test(name))return 'other';return /头戴|headphone|headset|over.?ear|on.?ear/.test(name)?'headphones':/马桶|坐便|toilet/.test(name)?'toilet':/桌灯|台灯|lamp/.test(name)?'lamp':'other';}
