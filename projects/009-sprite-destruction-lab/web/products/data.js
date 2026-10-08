export function parseCSV(text){
  text=String(text).replace(/^\uFEFF/,'');
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted||!cell)quoted=!quoted;else throw Error('CSV 引号格式不正确');}
    else if(!quoted&&(c===','||c==='\n'||c==='\r')){row.push(cell.trim());cell='';if(c!==','){if(row.some(Boolean))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}}
    else cell+=c;
  }
  if(quoted)throw Error('CSV 存在未闭合的引号');
  row.push(cell.trim());if(row.some(Boolean))rows.push(row);
  if(rows.length<2)throw Error('请包含表头和至少一行数据');
  if(rows[0].length!==2||!['category','类别'].includes(rows[0][0].toLowerCase())||!['value','数值'].includes(rows[0][1].toLowerCase()))throw Error('表头需要是 category,value 或 类别,数值');
  if(rows.length>201)throw Error('最多支持 200 行数据');
  const grouped=new Map();
  for(const r of rows.slice(1)){
    if(r.length!==2||!r[0]||r[0].length>30||!r[1]||!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(r[1]))throw Error('类别需非空，数值需为非负数字；每行两列');
    const value=Number(r[1]);if(!Number.isFinite(value)||value>1e6)throw Error('单行数值不能超过 1,000,000');
    grouped.set(r[0],(grouped.get(r[0])||0)+value);
  }
  const data=[...grouped].map(([category,value])=>({category,value}));
  if(data.length>8)throw Error('最多支持 8 个不同类别');
  if(!data.some(d=>d.value>0)||data.reduce((s,d)=>s+d.value,0)>1e6)throw Error('合计需大于 0 且不超过 1,000,000');
  return data;
}
export function summarize(data){const total=data.reduce((s,d)=>s+d.value,0);const sorted=[...data].sort((a,b)=>b.value-a.value);return {total,top:sorted[0],share:total?sorted[0].value/total:0,categories:data.length};}
export function particleCounts(data,max=420){
  const total=data.reduce((s,d)=>s+d.value,0);if(!total)return data.map(()=>0);
  const raw=data.map(d=>d.value/total*max),counts=raw.map(Math.floor);let remaining=max-counts.reduce((s,n)=>s+n,0);
  const order=raw.map((n,i)=>({i,f:n-counts[i]})).sort((a,b)=>b.f-a.f);
  for(let i=0;i<remaining;i++)counts[order[i].i]++;
  return counts;
}
export function validateProject(project){
  if(project?.format!=='forma-project'||project.version!==1||!project.state)throw Error('不是支持的 Forma 项目文件');
  const s=project.state;
  if(!s.motion||!s.compare||!s.manual||!s.data||!s.brand||!s.embed)throw Error('项目缺少工具设置');
  for(const key of ['motion','compare','manual','data','brand','embed'])if(typeof s[key]!=='object'||Array.isArray(s[key]))throw Error('项目设置格式错误');
  const textFields={motion:['title','subtitle','brand','price','background','image'],compare:['style','before','after','note','favorite'],data:['title'],brand:['name','theme'],embed:['title','description','cover','color']};
  for(const [key,fields] of Object.entries(textFields))for(const field of fields)if(typeof s[key][field]!=='string')throw Error('项目文本设置格式错误');
  if(!['wood','gray','garden'].includes(s.compare.style)||!['garden','studio','warm'].includes(s.brand.theme))throw Error('项目主题设置不支持');
  if(!/^#[\da-f]{6}$/i.test(s.motion.background)||!/^#[\da-f]{6}$/i.test(s.embed.color))throw Error('项目颜色格式错误');
  if(![0,1,2].includes(s.manual.part)||!['boolean'].includes(typeof s.manual.exploded)||![0,1,2].includes(s.data.stage)||!Number.isInteger(s.brand.chapter)||typeof s.brand.collected!=='boolean')throw Error('项目状态格式错误');
  for(const key of ['titles','stories'])if(!Array.isArray(s.brand[key])||s.brand[key].length!==3||s.brand[key].some(v=>typeof v!=='string'||v.length>1000))throw Error('品牌内容需要三幕文本');
  if(!Array.isArray(s.data.rows)||!s.data.rows.length)throw Error('数据故事为空');
  if(s.data.rows.some(d=>!d||typeof d.category!=='string'||typeof d.value!=='number'||!Number.isFinite(d.value)))throw Error('项目数据的类别和数值类型错误');
  s.data.rows=parseCSV('category,value\n'+s.data.rows.map(d=>`"${String(d.category).replaceAll('"','""')}",${d.value}`).join('\n'));
  if(!['glass','paper','pixels','neon','ripple'].includes(s.motion.effect)||!['ripple','paper','neon'].includes(s.embed.effect))throw Error('项目效果设置错误');
  for(const [obj,key] of [[s.motion,'image'],[s.compare,'before'],[s.compare,'after']]){const v=obj[key];if(v&&(!/^data:image\/(png|jpeg|webp|svg\+xml)[;,]/.test(v)||v.length>8e6))throw Error('项目中的图片格式不支持');}
  for(const n of [s.motion.duration,s.motion.size,s.motion.force,s.compare.split,s.brand.chapter])if(!Number.isFinite(n))throw Error('项目数值设置错误');
  if(s.motion.duration<3||s.motion.duration>10||s.motion.size<24||s.motion.size>80||s.motion.force<.3||s.motion.force>2.5||s.compare.split<0||s.compare.split>100||s.brand.chapter<0||s.brand.chapter>2)throw Error('项目数值超出支持范围');
  for(const obj of [s.motion,s.compare,s.brand,s.embed])for(const [key,v] of Object.entries(obj))if(typeof v==='string'&&!['image','before','after'].includes(key)&&v.length>1000)throw Error('项目文本过长');
  if(!Array.isArray(s.manual.done)||s.manual.done.length>3||s.manual.done.some(n=>![0,1,2].includes(n)))throw Error('维护步骤格式错误');
  return s;
}
