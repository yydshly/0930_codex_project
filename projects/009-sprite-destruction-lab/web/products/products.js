import { DestructionEngine } from '../engine.js';
import { plantArt, roomArt, deviceArt } from './art.js';
import { parseCSV, summarize, particleCounts, validateProject } from './data.js';
import { installReveal } from './reveal.js';
import { withWebMDuration } from './webm.js';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const effects={glass:'玻璃裂解',paper:'纸片飘散',pixels:'像素消融',neon:'霓虹聚合',ripple:'涟漪揭幕'};
const num=value=>value!==0&&Math.abs(value)<.000001?String(value):value.toLocaleString('zh-CN',{maximumFractionDigits:20});
const colors=['#557f60','#c89168','#7c8eac','#a49a56','#be7891','#6a9da1','#888272','#aa765a'];
const defaults=()=>({
  motion:{title:'把春天\n带回家。',subtitle:'一株绿意，为日常留一点空间。',brand:'SLOW GARDEN',price:'SPRING / 2026',effect:'paper',background:'#f2e4d8',image:'',duration:6,size:48,force:1},
  compare:{style:'wood',before:'',after:'',split:50,note:'保留自然光，让阅读角更舒适。',favorite:''},
  manual:{part:0,exploded:false,done:[]},
  data:{title:'新内容，观众从哪里来？',rows:[{category:'自然搜索',value:420},{category:'社交推荐',value:280},{category:'直接访问',value:180},{category:'邮件订阅',value:120}],stage:0},
  brand:{name:'SLOW GARDEN',titles:['让生活，\n慢一点。','一株植物，\n一段陪伴。','把绿意，\n留在身边。'],stories:['给忙碌的日常留下一处安静的角落。探索我们的春日植物系列。','从一粒种子开始，观察生长的细节。光、水和时间，共同完成这件作品。','为你的书桌选择一株植物，为下一次打开电脑留一点期待。'],chapter:0,theme:'garden',collected:false},
  embed:{title:'春日系列已开启',description:'探索属于你的第一株绿植。',cover:'为日常，打开一抹绿意',effect:'ripple',color:'#305c48'}
});
let state=defaults(),engine=null,cleanup=()=>{},toastTimer,recording=null;
try{const saved=localStorage.getItem('forma-project-v1');if(saved){state=validateProject(JSON.parse(saved));$('save-state').textContent='已恢复本地项目';}}catch{$('save-state').textContent='使用示例项目';}
const tools={
  motion:{name:'内容动效',icon:'✳',en:'CONTENT MOTION',title:'为内容，做一个有记忆点的退场。',subtitle:'写一张内容卡，挑选动效，导出可以真正使用的素材。',task:'运营设计：把春季新品文案做成社交媒体转场素材。',outcome:'产物 / PNG · WebM',value:'为活动标题、产品图和短视频提供可复用的动效素材，减少逐条手工制作。',mechanism:'同一份文字和图片变成可运动的碎片、粒子或遮罩；改内容就能复用相同动效。',extend:'可继续增加入场动画、透明背景导出、多尺寸模板和团队素材库。'},
  compare:{name:'方案对比',icon:'◐',en:'DECISION COMPARE',title:'把差异摆出来，让选择有依据。',subtitle:'拖动分界线，比较同一空间的两套方案，留下选择与理由。',task:'空间设计：和客户确认阅读角的风格，再交付对比记录。',outcome:'产物 / 方案对比报告',value:'让客户直接看见颜色、材质和布置的差异，记录选择，减少反复口头描述。',mechanism:'揭幕遮罩变成可拖动的前后对比。图片来自上传或自绘示意，比较与决策相连。',extend:'可扩展为商品配色、包装提案、修图对比；实景合成和尺寸测量需要另加能力。'},
  manual:{name:'交互说明书',icon:'⌘',en:'GUIDED MANUAL',title:'点一个部件，完成一次真实的操作。',subtitle:'从整体到部件，再到维护步骤；理解之后，留下操作记录。',task:'售后支持：引导用户完成桌面种植机的水箱维护。',outcome:'产物 / 维护记录',value:'把部件位置、作用和步骤放在一起，用户不用在图纸与长文之间来回查找。',mechanism:'部件展开、热点选择和完成状态共同引导注意力。这里的设备与步骤为自建设计示例。',extend:'可以换成真实产品的 CAD 导出图、型号说明、备件编号和企业维护记录。'},
  data:{name:'数据故事',icon:'▥',en:'DATA STORY',title:'从一堆数字，到一个清晰的结论。',subtitle:'导入两列 CSV，看数据从散点到分类，再到可比较的图表。',task:'内容复盘：解释访问渠道的构成，找出贡献最大的来源。',outcome:'产物 / 图表 · 分析摘要',value:'把汇报过程做成可播放的故事，帮助读者理解总量、类别和占比的关系。',mechanism:'粒子聚合只负责表达占比；统计按导入的原始数值计算，动画不会改变结论。',extend:'可增加时间序列、数据接口、下钻分析和多人汇报；当前只在浏览器处理 CSV。'},
  brand:{name:'品牌展览',icon:'◉',en:'BRAND EXHIBITION',title:'让一次浏览，成为一段有节奏的探索。',subtitle:'编辑三幕品牌内容，揭开封面，全屏体验，然后带走作品册。',task:'品牌发布：为春日系列制作一场简短的线上展览。',outcome:'产物 / 离线品牌作品册',value:'为新品、艺术作品和品牌故事提供可浏览的发布体验，内容按章节推进。',mechanism:'圆形揭幕承担开场，分章内容承担叙事。观众可以直接切换章节和收藏。',extend:'可接入真实商品、展品图片、音频讲解和线上预约。作品册当前是离线 HTML。'},
  embed:{name:'嵌入组件',icon:'〈〉',en:'EMBED COMPONENT',title:'把这次互动，放进你自己的产品。',subtitle:'配置一张揭晓卡，复制组件代码，或下载无需服务器的演示页面。',task:'网站开发：在新品页添加揭晓互动，并捕获揭晓事件。',outcome:'产物 / 组件代码 · 离线 HTML',value:'把动效能力交付为可嵌入的组件，开发者只需传入内容和风格，监听业务事件。',mechanism:'预览使用实际 Web Component，与复制代码、离线导出的实现相同。触发事件可接业务动作。',extend:'可进一步提供 React/Vue 封装、更多效果与版本管理；当前组件支持三种轻量揭幕。'}
};
let active=Object.hasOwn(tools,location.hash.slice(1))?location.hash.slice(1):'motion';
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function changed(){$('save-state').textContent='有未保存修改';}
function payload(){return {format:'forma-project',version:1,savedAt:new Date().toISOString(),state};}
function download(data,name,type='text/plain;charset=utf-8'){
  const url=URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
async function readFile(file,max=2e6){if(!file)throw Error('没有选择文件');if(file.size>max)throw Error(`文件过大，请使用 ${max/1e6} MB 以内的文件`);return file.text();}
async function imageFile(file){
  if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('请上传 PNG、JPEG 或 WebP 图片');
  if(file.size>2e6)throw Error('请使用 2 MB 以内的图片');
  const url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('图片读取失败'));r.readAsDataURL(file);});
  const img=new Image();img.src=url;await img.decode();if(img.width<10||img.height<10)throw Error('图片尺寸过小');return url;
}
function on(id,event,fn){$(id).addEventListener(event,fn);}
function field(id,label,value,type='text',extra=''){return `<label class="field">${label}<input id="${id}" type="${type}" value="${esc(value)}" ${extra}></label>`;}
function select(id,label,value,options){return `<label class="field">${label}<select id="${id}">${Object.entries(options).map(([v,l])=>`<option value="${v}" ${v===value?'selected':''}>${l}</option>`).join('')}</select></label>`;}
function reportHTML(title,body){return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{max-width:980px;margin:50px auto;padding:0 24px;font:16px/1.8 system-ui;background:#f4f6ee;color:#294335}h1{font-size:32px}section{padding:28px;background:white;border-radius:12px;margin:24px 0}img{width:100%;border-radius:8px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}small{color:#73836c}footer{font-size:12px} @media(max-width:600px){.pair{grid-template-columns:1fr}}</style><h1>${esc(title)}</h1><small>Forma · ${new Date().toLocaleString('zh-CN')}</small>${body}<footer>本地导出的原型产物 · 示例资料需由真实产品资料替换</footer></html>`;}

function render(){
  cleanup();cleanup=()=>{};engine?.dispose();engine=null;
  const t=tools[active],index=Object.keys(tools).indexOf(active)+1;
  $('tools').innerHTML=Object.entries(tools).map(([key,tool],i)=>`<button class="tool-nav ${key===active?'active':''}" data-tool="${key}" aria-current="${key===active?'page':'false'}"><i>${tool.icon}</i>${tool.name}<small>0${i+1}</small></button>`).join('');
  document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>{if(recording){toast('请先结束或取消当前导出');return;}location.hash=b.dataset.tool;}));
  $('crumb').textContent=t.name;$('tool-title').textContent=t.title;$('tool-subtitle').textContent=t.subtitle;$('tool-number').textContent=`0${index} / ${t.en}`;$('task-copy').textContent=t.task;$('outcome-copy').textContent=t.outcome;
  $('value-copy').textContent=t.value;$('mechanism-copy').textContent=t.mechanism;$('extend-copy').textContent=t.extend;
  ({motion:renderMotion,compare:renderCompare,manual:renderManual,data:renderData,brand:renderBrand,embed:renderEmbed})[active]();
}
window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(Object.hasOwn(tools,next)&&!recording){active=next;render();}});
on('save-project','click',()=>{try{localStorage.setItem('forma-project-v1',JSON.stringify(payload()));$('save-state').textContent='已保存到此浏览器';toast('六个工具的设置和素材已保存，刷新后可以继续');}catch{toast('浏览器存储空间不足，请点击「↓ 项目」下载项目文件');}});
on('export-project','click',()=>download(JSON.stringify(payload(),null,2),'forma-project.json','application/json'));
on('import-project','change',async e=>{try{if(recording)throw Error('请先取消当前录制');const next=validateProject(JSON.parse(await readFile(e.target.files[0],12e6)));state=next;changed();render();toast('项目已导入；点击保存可在此浏览器保留');}catch(error){toast(error.message);}finally{e.target.value='';}});

function renderMotion(){
  const m=state.motion;let generation=0,playFrame,started=0,pausedAt=0,elapsed=0,busy=false;
  $('workspace').innerHTML=`<div class="work-grid"><section class="board"><div class="board-head"><b>内容画布</b><span>自建品牌示例 · 可替换文字与图片</span></div><div class="board-body"><div class="motion-stage" id="motion-stage"><div class="motion-source" id="motion-source"></div><canvas class="motion-canvas" id="motion-canvas" tabindex="0" aria-label="内容动效画布，播放时可点击触发效果"></canvas></div><div class="playbar"><button id="motion-play" class="primary">▶ 播放动效</button><button id="motion-reset">复原</button><div class="timeline"><i id="motion-timeline"></i></div><span id="motion-time">0.0 / ${m.duration}s</span></div><p class="micro">播放会自动触发动效，也可以直接点按画布。导出视频会从完整内容重新录制。</p></div></section><aside class="controls"><h2>01 / 编辑内容</h2>${select('motion-template','快速开始','spring',{spring:'春日新品',invite:'活动邀请',title:'视频章节标题'})}${field('motion-brand','品牌 / 栏目',m.brand,'text','maxlength="50"')}<label class="field">标题<textarea id="motion-title" maxlength="80">${esc(m.title)}</textarea></label>${field('motion-subtitle','补充文案',m.subtitle,'text','maxlength="120"')}${field('motion-price','底部标签',m.price,'text','maxlength="50"')}<label class="upload">＋ 上传产品图片<input id="motion-image" type="file" accept="image/png,image/jpeg,image/webp"></label><button id="motion-image-clear" class="full quiet">恢复示例图片</button><div class="control-divider"></div><h2>02 / 动效与导出</h2>${select('motion-effect','效果风格',m.effect,effects)}${field('motion-background','画布底色',m.background,'color')}${field('motion-duration','片长（秒）',m.duration,'number','min="3" max="10" step="1"')}${field('motion-size','颗粒尺寸',m.size,'range','min="24" max="80" step="4"')}${field('motion-force','运动强度',m.force,'range','min="0.3" max="2.5" step="0.1"')}<div class="button-row"><button id="motion-png">↓ 静态 PNG</button><button id="motion-video" class="primary">↓ 动效 WebM</button></div><p class="status" id="motion-status" role="status">先改内容，再播放预览。</p></aside></div>`;
  const contentMore=document.createElement('details');contentMore.className='control-details';contentMore.innerHTML='<summary>品牌、补充文案与底部标签</summary>';
  for(const id of ['motion-brand','motion-subtitle','motion-price'])contentMore.append($(id).closest('.field'));
  $('motion-title').closest('.field').after(contentMore);
  const effectMore=document.createElement('details');effectMore.className='control-details';effectMore.innerHTML='<summary>配色、颗粒与运动强度</summary>';
  for(const id of ['motion-background','motion-size','motion-force'])effectMore.append($(id).closest('.field'));
  $('motion-duration').closest('.field').after(effectMore);
  function source(){
    const source=$('motion-source');source.style.background=m.background;
    source.innerHTML=`<div class="content-top"><span data-destructible>${esc(m.brand)}</span><span>CONTENT / 01</span></div><div class="content-main"><h2 data-destructible>${esc(m.title).replaceAll('\n','<br>')}</h2><p data-destructible>${esc(m.subtitle)}</p></div><img class="content-art" data-destructible src="${esc(m.image||plantArt())}" alt="内容图片"><div class="content-bottom"><strong data-destructible>${esc(m.price)}</strong><span>MAKE ROOM FOR LIFE ↗</span></div>`;
  }
  function reset(){generation++;engine?.dispose();engine=null;busy=false;cancelAnimationFrame(playFrame);elapsed=0;pausedAt=0;$('motion-source').style.visibility='visible';$('motion-source').inert=false;$('motion-canvas').classList.remove('visible');$('motion-play').textContent='▶ 播放动效';$('motion-timeline').style.width='0%';$('motion-time').textContent=`0.0 / ${m.duration}s`;source();}
  function tick(){if(!engine||engine.state!=='running')return;elapsed=(performance.now()-started)/1000;$('motion-time').textContent=`${Math.min(elapsed,m.duration).toFixed(1)} / ${m.duration}s`;$('motion-timeline').style.width=`${Math.min(100,elapsed/m.duration*100)}%`;if(recording){$('export-progress').value=elapsed/m.duration*100;$('export-status').textContent=`已录制 ${Math.min(elapsed,m.duration).toFixed(1)} / ${m.duration} 秒`;}
    if(elapsed>=m.duration){engine.setPaused(true);$('motion-play').textContent='↻ 重新播放';if(recording)recording.recorder.stop();return;}playFrame=requestAnimationFrame(tick);
  }
  async function start({capture=false}={}){
    if(busy)return;if(recording&&!capture)return;
    if(!capture&&engine?.state==='running'){engine.setPaused(true);pausedAt=elapsed;cancelAnimationFrame(playFrame);$('motion-play').textContent='▶ 继续播放';return;}
    if(!capture&&engine?.state==='paused'&&elapsed<m.duration){started=performance.now()-pausedAt*1000;engine.setPaused(false);$('motion-play').textContent='Ⅱ 暂停';playFrame=requestAnimationFrame(tick);return;}
    reset();busy=true;const token=generation;$('motion-play').disabled=true;$('motion-status').textContent='正在渲染你的内容…';
    let current=null;
    try{
      await $('motion-source').querySelector('img').decode();
      if(token!==generation)return;
      current=engine=new DestructionEngine({canvas:$('motion-canvas'),source:$('motion-source'),effect:m.effect,cellSize:m.size,background:m.background,threshold:1});current.setOptions({force:m.force,auto:true});await current.prepare();
      if(token!==generation||current.disposed){current.dispose();return;}
      if(capture){
        if(document.hidden)throw Error('请保持此页面可见，再开始录制');
        const stream=$('motion-canvas').captureStream(30),chunks=[];
        const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(v=>MediaRecorder.isTypeSupported(v));
        if(!mime){stream.getTracks().forEach(t=>t.stop());throw Error('此浏览器不支持 WebM 录制，请导出 PNG');}
        const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3000000});
        recording={recorder,cancelled:false};const record=recording;
        recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        recorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());if(!record.cancelled){const raw=new Blob(chunks,{type:mime});let blob=raw;try{blob=await withWebMDuration(raw,elapsed);}catch{toast('已导出浏览器原始视频；此浏览器可能显示流式时长');}if(!record.cancelled){download(blob,'forma-motion.webm');$('motion-status').textContent=`已导出 ${m.duration} 秒 WebM 动画`;}}recording=null;$('export-dialog').close();$('motion-video').disabled=false;};
        recorder.onerror=()=>{record.cancelled=true;if(recorder.state!=='inactive')recorder.stop();else{stream.getTracks().forEach(t=>t.stop());recording=null;$('export-dialog').close();}toast('浏览器录制失败，请重试或导出 PNG');};
        recorder.start(200);
      }
      $('motion-source').style.visibility='hidden';$('motion-source').inert=true;$('motion-canvas').classList.add('visible');current.start();started=performance.now();$('motion-play').textContent='Ⅱ 暂停';$('motion-status').textContent=`正在播放 ${effects[m.effect]}`;playFrame=requestAnimationFrame(tick);
    }catch(error){current?.dispose();if(engine===current)engine=null;if(token!==generation)return;$('motion-status').textContent=error.message;$('export-dialog').close();$('motion-video').disabled=false;toast(error.message);}
    finally{if(token===generation){busy=false;$('motion-play').disabled=false;}}
  }
  source();
  for(const [id,key] of [['motion-title','title'],['motion-brand','brand'],['motion-subtitle','subtitle'],['motion-price','price'],['motion-effect','effect'],['motion-background','background'],['motion-size','size'],['motion-force','force'],['motion-duration','duration']])on(id,'input',()=>{if(recording)return;const v=$(id).value;if(['size','force','duration'].includes(key)){const n=Number(v);if(!Number.isFinite(n))return;m[key]=key==='duration'?Math.max(3,Math.min(10,n)):n;}else m[key]=v;changed();reset();});
  on('motion-template','change',()=>{if(recording)return;const presets={spring:['把春天\n带回家。','一株绿意，为日常留一点空间。','SLOW GARDEN','SPRING / 2026','#f2e4d8'],invite:['在这里，\n见到你。','周六 14:00 · 城市植物交换会','GARDEN CLUB','YOU ARE INVITED','#e7ecd9'],title:['留一点\n生长空间。','第三章 / 一个关于日常的故事','FIELD NOTES','CHAPTER / 03','#dfe6ed']};[m.title,m.subtitle,m.brand,m.price,m.background]=presets[$('motion-template').value];changed();render();});
  on('motion-image','change',async e=>{try{if(recording)throw Error('请先取消录制');m.image=await imageFile(e.target.files[0]);changed();reset();toast('上传图片已进入实际动效画布');}catch(error){toast(error.message);}finally{e.target.value='';}});
  on('motion-image-clear','click',()=>{if(recording)return;m.image='';changed();reset();});
  on('motion-play','click',()=>start());on('motion-reset','click',()=>{if(!recording)reset();});
  on('motion-png','click',async()=>{if(recording)return;try{let canvas=$('motion-canvas');if(!engine){await $('motion-source').querySelector('img').decode();canvas=await html2canvas($('motion-source'),{scale:2,logging:false,backgroundColor:m.background});}canvas.toBlob(blob=>{if(blob)download(blob,'forma-content.png');},'image/png');}catch(error){toast(error.message);}});
  on('motion-video','click',async()=>{if(busy){toast('画布正在准备，请稍后重试');return;}if(!globalThis.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){toast('此浏览器不支持视频导出，请使用 PNG');return;}$('motion-video').disabled=true;$('export-progress').value=0;$('export-status').textContent='正在准备你的内容…';$('export-dialog').showModal();await start({capture:true});});
  function cancel(){generation++;if(recording){recording.cancelled=true;if(recording.recorder.state!=='inactive')recording.recorder.stop();}else{$('export-dialog').close();$('motion-video').disabled=false;}reset();$('motion-play').disabled=false;toast('已取消视频导出');}
  $('cancel-export').onclick=cancel;$('export-dialog').oncancel=e=>{e.preventDefault();cancel();};
  const visibility=()=>{if(document.hidden&&recording){cancel();$('motion-status').textContent='页面转入后台，录制已取消；可以重新导出。';}};
  document.addEventListener('visibilitychange',visibility);
  const observer=new ResizeObserver(()=>{if(engine&&Math.abs($('motion-stage').clientWidth-engine.width)>2&&!recording)reset();});observer.observe($('motion-stage'));
  cleanup=()=>{generation++;cancelAnimationFrame(playFrame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);};
}

function renderCompare(){
  const c=state.compare,labels={wood:'暖木 · 温柔阅读角',gray:'浅灰 · 简洁工作角',garden:'植绿 · 自然休息角'};
  $('workspace').innerHTML=`<div class="work-grid"><section class="board"><div class="board-head"><b>阅读角 / 前后对比</b><span>自绘方案示意 · 支持上传实景照片</span></div><div class="board-body"><div class="compare-stage"><img id="compare-before" alt="原空间"><div class="compare-after" id="compare-after-mask"><img id="compare-after" alt="选择的空间方案"></div><span class="image-label before-label">原空间</span><span class="image-label after-label" id="compare-label"></span><div class="compare-line" id="compare-line"><b>↔</b></div></div><input id="compare-slider" class="compare-slider" type="range" min="0" max="100" value="${c.split}" aria-label="前后方案分界线"><p class="micro">向左拖看完整新方案，向右拖看原空间。上传照片时建议两张图片保持相同视角。</p><div id="compare-choice" class="saved-choice" hidden></div></div></section><aside class="controls"><h2>01 / 选择方案</h2><div class="option-list">${Object.entries(labels).map(([key,label],i)=>`<button data-style="${key}" class="${c.style===key?'active':''}"><i class="option-dot" style="background:${['#c3aa7b','#87968d','#7a9760'][i]}"></i>${label}</button>`).join('')}</div><label class="upload">＋ 上传原空间<input id="compare-upload-before" type="file" accept="image/png,image/jpeg,image/webp"></label><label class="upload">＋ 上传对比方案<input id="compare-upload-after" type="file" accept="image/png,image/jpeg,image/webp"></label><button id="compare-default" class="full quiet">恢复自绘示例</button><div class="control-divider"></div><h2>02 / 留下决定</h2><label class="field">选择理由<textarea id="compare-note" maxlength="500">${esc(c.note)}</textarea></label><button id="compare-select" class="full primary">✓ 采用当前方案</button><button id="compare-export" class="full" style="margin-top:9px">↓ 导出对比报告</button><p class="micro">报告包含当前两张图片、方案名称、选择理由和记录时间。上传图片仅保存在项目内。</p></aside></div>`;
  function paint(){ $('compare-before').src=c.before||roomArt('before');$('compare-after').src=c.after||roomArt(c.style);$('compare-label').textContent=c.after?'上传方案':labels[c.style];$('compare-after-mask').style.clipPath=`inset(0 0 0 ${c.split}%)`;$('compare-line').style.left=`${c.split}%`;if(c.favorite){$('compare-choice').hidden=false;$('compare-choice').textContent=`已采用：${c.favorite} · ${c.note||'未填写理由'}`;}else $('compare-choice').hidden=true;}
  paint();on('compare-slider','input',()=>{c.split=Number($('compare-slider').value);changed();paint();});
  document.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>{c.style=b.dataset.style;c.after='';c.favorite='';changed();render();}));
  for(const side of ['before','after'])on(`compare-upload-${side}`,'change',async e=>{try{c[side]=await imageFile(e.target.files[0]);if(side==='after')c.favorite='';changed();paint();toast('照片已替换，拖动分界线进行比较');}catch(error){toast(error.message);}finally{e.target.value='';}});
  on('compare-note','input',()=>{c.note=$('compare-note').value;changed();paint();});
  on('compare-default','click',()=>{c.before='';c.after='';c.favorite='';changed();paint();});
  const stage=document.querySelector('.compare-stage');let dragging=false;
  function drag(event){const r=stage.getBoundingClientRect();c.split=Math.max(0,Math.min(100,(event.clientX-r.left)/r.width*100));$('compare-slider').value=c.split;changed();paint();}
  stage.addEventListener('pointerdown',event=>{dragging=true;stage.setPointerCapture(event.pointerId);drag(event);});stage.addEventListener('pointermove',event=>{if(dragging)drag(event);});for(const event of ['pointerup','pointercancel'])stage.addEventListener(event,()=>dragging=false);
  on('compare-select','click',()=>{c.favorite=c.after?'上传方案':labels[c.style];changed();paint();toast('方案与理由已记录，点击顶部保存可保留');});
  on('compare-export','click',()=>download(reportHTML('阅读角 · 方案对比记录',`<section><div class="pair"><div><h2>原空间</h2><img src="${esc(c.before||roomArt('before'))}" alt="原空间"></div><div><h2>${esc(c.after?'上传方案':labels[c.style])}</h2><img src="${esc(c.after||roomArt(c.style))}" alt="新方案"></div></div><p>选择：${esc(c.favorite||'尚未采用')}</p><p>理由：${esc(c.note||'未填写')}</p><small>${c.before||c.after?'含用户上传素材':'图片为自绘方案示意，非装修实景或尺寸模拟'}</small></section>`),'forma-compare.html','text/html;charset=utf-8'));
}

function renderManual(){
  const m=state.manual,parts=[{name:'补光灯',code:'LIGHT / A01',copy:'位于顶部，为植物提供光照。展开结构后可以看到它与种植托盘的关系。',note:'示例说明：维护前关闭设备并断开电源。',x:50,y:26},{name:'种植托盘',code:'TRAY / B02',copy:'承托植物与种植杯，可从水箱上方提起。取出时注意根系，避免拉扯。',note:'示例说明：先轻轻提起托盘，再查看水箱。',x:65,y:57},{name:'可拆水箱',code:'TANK / C03',copy:'储存营养液，水位窗在正面。可以取出清洁，再装回托盘下方。',note:'示例说明：水箱为可清洁部件，电气部件不应浸水。',x:50,y:75}],steps=[['断电与取出','关闭示例设备，取下托盘并移开根系。'],['清洁与补水','清洁可拆水箱，按产品说明加入适量清水。'],['装回与检查','装回托盘，检查部件和水位，再完成记录。']];
  $('workspace').innerHTML=`<div class="work-grid"><section class="board"><div class="board-head"><b>桌面种植机 / 维护导览</b><span>自建设备说明示例</span></div><div class="board-body"><div class="manual-stage ${m.exploded?'exploded':''}" id="manual-stage"><span class="device-note">STRUCTURE / GARDEN ONE</span>${deviceArt()}${parts.map((p,i)=>`<button class="hotspot ${i===m.part?'active':''}" style="left:calc(${p.x}% - 12px);top:${p.y+(m.exploded?(i===0?-9:i===2?8:-2):0)}%" data-part="${i}" aria-label="查看${p.name}" aria-pressed="${i===m.part}">${i+1}</button>`).join('')}</div><div class="button-row" style="margin-top:15px"><button id="manual-explode" aria-pressed="${m.exploded}">${m.exploded?'收起结构':'展开部件'}</button><button id="manual-next">下一个部件 →</button></div><div class="manual-details"><p class="eyebrow" id="part-code"></p><h3 id="part-title"></h3><p id="part-copy"></p><div class="part-meta" id="part-note"></div></div></div></section><aside class="controls"><h2>水箱维护 / 3 个步骤</h2><p class="micro">操作指南原型。实际使用请替换为对应型号的官方步骤。</p><ol class="steps">${steps.map(([title,copy],i)=>`<li class="${m.done.includes(i)?'done-step':''}"><label><input data-step="${i}" type="checkbox" ${m.done.includes(i)?'checked':''}><span>${i+1}. ${title}<small>${copy}</small></span></label></li>`).join('')}</ol><p class="progress-text" id="manual-progress"></p><button id="manual-export" class="full primary">↓ 导出维护记录</button><button id="manual-clear" class="full quiet" style="margin-top:9px">重新开始维护</button><p class="status" id="manual-result" role="status"></p></aside></div>`;
  function paint(){const part=parts[m.part];$('part-title').textContent=part.name;$('part-code').textContent=part.code;$('part-copy').textContent=part.copy;$('part-note').textContent=part.note;$('manual-progress').textContent=`已完成 ${m.done.length} / 3 步`;$('manual-result').textContent=m.done.length===3?'✓ 本次维护流程已完成，可以导出记录。':'勾选完成的步骤，进度会保留在项目中。';document.querySelectorAll('[data-part]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.part)===m.part);b.setAttribute('aria-pressed',String(Number(b.dataset.part)===m.part));});}
  paint();document.querySelectorAll('[data-part]').forEach(b=>b.addEventListener('click',()=>{m.part=Number(b.dataset.part);changed();paint();}));
  on('manual-next','click',()=>{m.part=(m.part+1)%3;changed();paint();});on('manual-explode','click',()=>{m.exploded=!m.exploded;changed();render();});
  document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('change',()=>{const i=Number(b.dataset.step);m.done=b.checked?[...new Set([...m.done,i])]:m.done.filter(v=>v!==i);b.closest('li').classList.toggle('done-step',b.checked);if(b.checked)m.part=i;changed();paint();}));
  on('manual-clear','click',()=>{m.done=[];changed();render();});
  on('manual-export','click',()=>download(`# 桌面种植机维护记录\n\n记录时间：${new Date().toLocaleString('zh-CN')}\n设备：Garden One（自建说明示例）\n完成：${m.done.length} / 3\n\n${steps.map(([title,copy],i)=>`- [${m.done.includes(i)?'x':' '}] ${title}：${copy}`).join('\n')}\n\n实际使用需按对应产品的官方说明操作。\n`,'forma-maintenance.md'));
}

function renderData(){
  const d=state.data;let frame,targets=[],particles=[],width=0,height=0,playing=false,lastStage=0,highlight=-1;
  const stats=summarize(d.rows);
  $('workspace').innerHTML=`<div class="work-grid"><section class="board"><div class="board-head"><b id="data-chart-title">${esc(d.title)}</b><span>示例 CSV · 导入后按你的数据计算</span></div><div class="board-body"><div class="data-metrics"><div><span>原始数据合计</span><strong>${num(stats.total)}</strong></div><div><span>最大类别占比</span><strong>${(stats.share*100).toFixed(1)}<small>%</small></strong></div><div><span>类别数量</span><strong>${stats.categories}</strong></div></div><div class="data-stage" id="data-stage"><canvas id="data-canvas" aria-label="数据粒子与分类占比图"></canvas><span class="data-label">420 个视觉粒子 / 按占比分配</span></div><div class="story-caption"><b id="data-caption"></b><span id="data-number"></span></div><table class="data-table"><thead><tr><th>类别（点击突出显示）</th><th>原始数值</th><th>占比</th></tr></thead><tbody>${d.rows.map((r,i)=>`<tr><td><button data-highlight="${i}" class="quiet" style="font-size:10px;padding:3px;border:0"><i class="legend-dot" style="background:${colors[i]}"></i>${esc(r.category)}</button></td><td>${num(r.value)}</td><td>${(r.value/stats.total*100).toFixed(1)}%</td></tr>`).join('')}</tbody></table></div></section><aside class="controls"><h2>01 / 导入数据</h2>${field('data-title','故事标题',d.title,'text','maxlength="80"')}<label class="upload">＋ 导入 CSV<input id="data-upload" type="file" accept=".csv,text/csv"></label><div class="button-row"><button id="data-sample">↓ 示例 CSV</button><button id="data-default">恢复示例</button></div><p class="micro">两列表头：category,value 或 类别,数值。支持最多 200 行、8 个类别；相同类别自动合并。</p><div class="control-divider"></div><h2>02 / 三幕数据故事</h2><div class="story-tabs">${['看总量','看分类','看结论'].map((name,i)=>`<button data-story="${i}" class="${d.stage===i?'active':''}">${i+1} ${name}</button>`).join('')}</div><button id="data-play" class="full primary">▶ 播放故事</button><p class="status" id="data-insight">${esc(stats.top.category)}贡献最多：${num(stats.top.value)}，占 ${(stats.share*100).toFixed(1)}%。</p><div class="control-divider"></div><div class="button-row"><button id="data-png">↓ 图表 PNG</button><button id="data-report">↓ 分析摘要</button></div><p class="micro">粒子是视觉表达，不代表每一个原始样本；表格与结论使用精确数值。</p></aside></div>`;
  const canvas=$('data-canvas'),ctx=canvas.getContext('2d'),counts=particleCounts(d.rows);
  function targetLayout(){targets=[];const compact=width<430,colWidth=(width-40)/d.rows.length,maxValue=Math.max(...d.rows.map(r=>r.value));
    counts.forEach((count,group)=>{for(let j=0;j<count;j++){const seed=targets.length;
      let x,y;if(d.stage===0){const angle=seed*2.39996,rad=Math.sqrt(seed/420)*Math.min(width*.42,height*.35);x=width/2+Math.cos(angle)*rad;y=height/2+Math.sin(angle)*rad;}
      else if(d.stage===1){const angle=j*2.39996,rad=Math.sqrt(j/Math.max(count,1))*Math.min(colWidth*.37,60);x=20+colWidth*(group+.5)+Math.cos(angle)*rad;y=height*.46+Math.sin(angle)*rad;}
      else{const columns=Math.max(3,Math.floor(colWidth/6)),rows=Math.ceil(count/columns),barH=(height-110)*(d.rows[group].value/maxValue);x=20+colWidth*group+colWidth*.2+(j%columns)/(columns-1)*colWidth*.6;y=height-60-Math.floor(j/columns)/Math.max(rows-1,1)*barH;}
      targets.push({x,y,group});
    }});
    if(particles.length!==targets.length)particles=targets.map(t=>({...t,x:width/2,y:height/2}));
    $('data-caption').textContent=['01 / 先看到全部数据','02 / 再看不同来源的构成',`03 / ${stats.top.category}是最大贡献来源`][d.stage];$('data-number').textContent=`${d.stage+1} / 3`;document.querySelectorAll('[data-story]').forEach(b=>b.classList.toggle('active',Number(b.dataset.story)===d.stage));
  }
  let previous=0;function draw(now){const dt=Math.min((now-previous)/1000,.05)||.016;previous=now;if(playing&&now-lastStage>2400){if(d.stage===2){playing=false;$('data-play').textContent='↻ 再次播放';}else{d.stage++;lastStage=now;targetLayout();}}
    ctx.clearRect(0,0,width,height);ctx.fillStyle='#f5f7ef';ctx.fillRect(0,0,width,height);
    if(d.stage===2){const cw=(width-40)/d.rows.length,max=Math.max(...d.rows.map(r=>r.value));ctx.strokeStyle='#dfe7d8';ctx.beginPath();ctx.moveTo(20,height-57);ctx.lineTo(width-20,height-57);ctx.stroke();d.rows.forEach((r,i)=>{const h=(height-110)*r.value/max,x=20+cw*i+cw*.18;ctx.fillStyle=colors[i]+'24';ctx.fillRect(x,height-60-h,cw*.64,h);ctx.fillStyle=colors[i];ctx.textAlign='center';ctx.font='10px system-ui';ctx.fillText(num(r.value),20+cw*(i+.5),height-68-h);});}
    particles.forEach((p,i)=>{const t=targets[i];p.x+=(t.x-p.x)*(1-Math.exp(-dt*6));p.y+=(t.y-p.y)*(1-Math.exp(-dt*6));ctx.globalAlpha=(highlight<0||highlight===t.group)?.9:.1;ctx.fillStyle=colors[t.group];ctx.beginPath();ctx.arc(p.x,p.y,d.stage===2?2:2.8,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
    if(d.stage>0){const cw=(width-40)/d.rows.length;d.rows.forEach((r,i)=>{ctx.fillStyle='#4c6650';ctx.textAlign='center';ctx.font=`${width<430?9:11}px system-ui`;let label=r.category;while(ctx.measureText(label).width>cw-3&&label.length>1)label=label.slice(0,-1);ctx.fillText(label,20+cw*(i+.5),height-30);ctx.fillStyle=colors[i];ctx.font='10px system-ui';ctx.fillText(`${(r.value/stats.total*100).toFixed(1)}%`,20+cw*(i+.5),height-13);});}
    else{ctx.fillStyle='#54724f';ctx.textAlign='center';ctx.font='11px system-ui';ctx.fillText(`总量 ${num(stats.total)} · ${d.rows.length} 个来源`,width/2,height-20);}
    frame=requestAnimationFrame(draw);
  }
  const observer=new ResizeObserver(()=>{width=$('data-stage').clientWidth;height=$('data-stage').clientHeight;const scale=Math.min(devicePixelRatio,2);canvas.width=width*scale;canvas.height=height*scale;ctx.setTransform(scale,0,0,scale,0,0);targetLayout();});observer.observe($('data-stage'));frame=requestAnimationFrame(draw);
  on('data-title','input',()=>{d.title=$('data-title').value;$('data-chart-title').textContent=d.title;changed();});
  document.querySelectorAll('[data-story]').forEach(b=>b.addEventListener('click',()=>{playing=false;d.stage=Number(b.dataset.story);targetLayout();$('data-play').textContent='▶ 播放故事';changed();}));
  document.querySelectorAll('[data-highlight]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.highlight);highlight=highlight===i?-1:i;}));
  on('data-play','click',()=>{playing=!playing;if(playing){d.stage=0;lastStage=performance.now();targetLayout();changed();}$('data-play').textContent=playing?'Ⅱ 暂停故事':'▶ 播放故事';});
  on('data-sample','click',()=>download('category,value\n自然搜索,420\n社交推荐,280\n直接访问,180\n邮件订阅,120\n','forma-data-sample.csv','text/csv;charset=utf-8'));
  on('data-upload','change',async e=>{try{d.rows=parseCSV(await readFile(e.target.files[0],1e6));d.stage=0;changed();render();toast('已读取 CSV，图表和结论按导入数据更新');}catch(error){toast(error.message);}finally{e.target.value='';}});
  on('data-default','click',()=>{state.data=defaults().data;changed();render();});
  on('data-png','click',()=>canvas.toBlob(blob=>{if(blob)download(blob,'forma-data-chart.png');},'image/png'));
  on('data-report','click',()=>download(`# ${d.title}\n\n总量：${stats.total}\n类别：${stats.categories}\n最大类别：${stats.top.category}（${stats.top.value}，${(stats.share*100).toFixed(1)}%）\n\n| 类别 | 数值 | 占比 |\n| --- | ---: | ---: |\n${d.rows.map(r=>`| ${r.category.replaceAll('|','\\|')} | ${r.value} | ${(r.value/stats.total*100).toFixed(1)}% |`).join('\n')}\n\n视觉粒子按占比分配；原始数值未被动画改变。示例数据不代表真实业务。\n`,'forma-data-story.md'));
  cleanup=()=>{cancelAnimationFrame(frame);observer.disconnect();};
}

function renderBrand(){
  const b=state.brand,themes={garden:['#183e32','#eee9d7'],studio:['#34314b','#e8e1f2'],warm:['#714c36','#f5e1c8']};
  $('workspace').innerHTML=`<div class="work-grid"><section class="board"><div class="board-head"><b>三幕品牌展览</b><span>自建品牌示例 · 内容可编辑</span></div><div class="board-body"><div id="brand-full" class="brand-stage-wrapper"><div class="brand-preview" id="brand-preview"><div class="brand-orbit"></div><div class="brand-content"><header><span id="brand-name"></span><span>SPRING COLLECTION / 2026</span></header><div><p class="eyebrow" id="brand-kicker">THE COLLECTION / 01</p><h2 id="brand-title"></h2><p id="brand-story"></p><div class="brand-chapters">${['序章','生长','邀请'].map((label,i)=>`<button data-chapter="${i}" class="${i===b.chapter?'active':''}">0${i+1} ${label}</button>`).join('')}</div></div><footer><span>SMALL THINGS. SLOW MOMENTS.</span><button id="brand-collect">${b.collected?'✓ 已收藏':'＋ 收藏作品'}</button></footer></div><div class="brand-gate" id="brand-gate"><span class="seal">S</span><h3>Slow moments.</h3><p>一场关于日常的微型展览</p><button id="brand-open" class="primary">打开这场展览 ↗</button></div></div></div><div class="button-row" style="margin-top:15px"><button id="brand-replay">重新揭幕</button><button id="brand-fullscreen">⛶ 全屏体验</button></div></div></section><aside class="controls"><h2>01 / 编辑展览</h2>${field('brand-edit-name','品牌名称',b.name,'text','maxlength="60"')}${select('brand-theme','视觉主题',b.theme,{garden:'深绿 · 自然',studio:'灰紫 · 艺术',warm:'暖棕 · 手作'})}${select('brand-edit-chapter','编辑章节',String(b.chapter),{0:'01 序章',1:'02 生长',2:'03 邀请'})}<label class="field">这一幕的标题<textarea id="brand-edit-title" maxlength="100">${esc(b.titles[b.chapter])}</textarea></label><label class="field">这一幕的故事<textarea id="brand-edit-story" maxlength="350">${esc(b.stories[b.chapter])}</textarea></label><div class="control-divider"></div><h2>02 / 带走展览</h2><button id="brand-export" class="full primary">↓ 下载品牌作品册</button><p class="micro">作品册包含编辑后的三幕内容与配色，可离线打开。全屏按钮使用浏览器全屏功能。</p><p class="status" id="brand-status" role="status">点击左侧「打开这场展览」体验揭幕。</p></aside></div>`;
  function paint(){const theme=themes[b.theme]||themes.garden;$('brand-preview').style.background=theme[0];$('brand-preview').style.color=theme[1];$('brand-name').textContent=b.name;$('brand-title').innerHTML=esc(b.titles[b.chapter]).replaceAll('\n','<br>');$('brand-story').textContent=b.stories[b.chapter];$('brand-kicker').textContent=`THE COLLECTION / 0${b.chapter+1}`;document.querySelectorAll('[data-chapter]').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.chapter)===b.chapter));}
  const content=document.querySelector('.brand-content');content.inert=true;
  paint();on('brand-open','click',()=>{content.inert=false;$('brand-gate').classList.add('open');$('brand-gate').inert=true;$('brand-status').textContent='展览已打开，可切换三幕内容。';document.querySelector('[data-chapter="0"]').focus({preventScroll:true});});
  on('brand-replay','click',()=>{content.inert=true;$('brand-gate').inert=false;$('brand-gate').classList.remove('open');$('brand-open').focus({preventScroll:true});});
  document.querySelectorAll('[data-chapter]').forEach(btn=>btn.addEventListener('click',()=>{b.chapter=Number(btn.dataset.chapter);changed();paint();$('brand-edit-chapter').value=String(b.chapter);$('brand-edit-title').value=b.titles[b.chapter];$('brand-edit-story').value=b.stories[b.chapter];}));
  on('brand-edit-chapter','change',()=>{b.chapter=Number($('brand-edit-chapter').value);paint();$('brand-edit-title').value=b.titles[b.chapter];$('brand-edit-story').value=b.stories[b.chapter];changed();});
  on('brand-edit-name','input',()=>{b.name=$('brand-edit-name').value;changed();paint();});on('brand-theme','change',()=>{b.theme=$('brand-theme').value;changed();paint();});
  on('brand-edit-title','input',()=>{b.titles[b.chapter]=$('brand-edit-title').value;changed();paint();});on('brand-edit-story','input',()=>{b.stories[b.chapter]=$('brand-edit-story').value;changed();paint();});
  on('brand-collect','click',()=>{b.collected=!b.collected;$('brand-collect').textContent=b.collected?'✓ 已收藏':'＋ 收藏作品';changed();toast(b.collected?'作品已加入当前项目收藏':'已取消收藏');});
  on('brand-fullscreen','click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('brand-full').requestFullscreen();}catch{toast('当前浏览器不允许全屏，可以直接在预览中体验');}});
  on('brand-export','click',()=>{const theme=themes[b.theme]||themes.garden;download(reportHTML(`${b.name} · 品牌作品册`,`<style>body{background:${theme[0]};color:${theme[1]}}section{background:#ffffff0b;padding:65px 35px;min-height:350px}h2{font-size:42px;line-height:1.2;white-space:pre-line}small{color:inherit;opacity:.5}p{max-width:500px}</style>${b.titles.map((title,i)=>`<section><small>0${i+1} / ${esc(b.name)}</small><h2>${esc(title)}</h2><p>${esc(b.stories[i])}</p></section>`).join('')}`),'forma-brand-lookbook.html','text/html;charset=utf-8');});
}

function renderEmbed(){
  const e=state.embed,events=[];let count=0;
  $('workspace').innerHTML=`<div class="work-grid"><section class="board"><div class="board-head"><b>实际组件预览</b><span>可用鼠标或键盘触发</span></div><div class="board-body"><div class="embed-preview"><forma-reveal id="reveal-demo"></forma-reveal></div><div class="embed-stats"><span>揭晓次数 <b id="embed-count">0</b></span><span>事件 <b>forma:reveal</b></span></div><ul class="event-list" id="embed-events" aria-live="polite"><li>等待用户揭晓…</li></ul><pre class="code" id="embed-code"></pre></div></section><aside class="controls"><h2>01 / 配置组件</h2>${field('embed-title','揭晓后的标题',e.title,'text','maxlength="100"')}<label class="field">内容说明<textarea id="embed-description" maxlength="250">${esc(e.description)}</textarea></label>${field('embed-cover','封面提示',e.cover,'text','maxlength="100"')}${select('embed-effect','揭幕风格',e.effect,{ripple:'圆形揭幕',paper:'纸片移开',neon:'光晕消融'})}${field('embed-color','封面颜色',e.color,'color')}<div class="control-divider"></div><h2>02 / 接入你的页面</h2><div class="button-row"><button id="embed-copy">复制代码</button><button id="embed-html" class="primary">↓ 离线 HTML</button></div><p class="micro">复制代码引用当前站点的组件模块，需能访问这个地址。离线 HTML 内置组件，不依赖当前服务器。</p><button id="embed-module" class="full quiet" style="margin-top:12px">↓ 组件 JS 文件</button></aside></div>`;
  function tag(){return `<forma-reveal title="${esc(e.title)}" description="${esc(e.description)}" cover-label="${esc(e.cover)}" effect="${e.effect}" color="${esc(e.color)}"></forma-reveal>`;}
  function code(){return `<script type="module" src="${new URL('reveal.js',location.href).href}"><\/script>\n${tag()}\n<script>\ndocument.querySelector('forma-reveal')\n  .addEventListener('forma:reveal', event => {\n    console.log('已揭晓', event.detail);\n    // 在这里连接自己的业务动作\n  });\n<\/script>`;}
  function paint(){const demo=$('reveal-demo');for(const [attr,value] of Object.entries({title:e.title,description:e.description,'cover-label':e.cover,effect:e.effect,color:e.color}))demo.setAttribute(attr,value);$('embed-code').textContent=code();}
  paint();$('reveal-demo').addEventListener('forma:reveal',event=>{count++;$('embed-count').textContent=count;events.unshift(`${new Date().toLocaleTimeString('zh-CN')} / forma:reveal / ${JSON.stringify(event.detail)}`);$('embed-events').replaceChildren(...events.slice(0,4).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));});
  for(const [id,key] of [['embed-title','title'],['embed-description','description'],['embed-cover','cover'],['embed-effect','effect'],['embed-color','color']])on(id,'input',()=>{e[key]=$(id).value;changed();paint();});
  on('embed-copy','click',async()=>{try{await navigator.clipboard.writeText(code());toast('组件代码已复制');}catch{toast('无法访问剪贴板，请直接选择并复制下方代码');}});
  on('embed-module','click',()=>download(`(${installReveal.toString()})();\n`,'forma-reveal.js','text/javascript'));
  on('embed-html','click',()=>download(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(e.title)}</title><style>body{margin:0;min-height:100vh;display:grid;place-content:center;background:#f3f6ee;padding:25px;box-sizing:border-box}#event{font:11px system-ui;color:#687a62;text-align:center;margin-top:20px}</style>${tag()}<p id="event">等待揭晓…</p><script>(${installReveal.toString()})();document.querySelector('forma-reveal').addEventListener('forma:reveal',e=>{document.getElementById('event').textContent='已揭晓 '+e.detail.count+' 次 · '+e.detail.effect;});<\/script></html>`,'forma-reveal-demo.html','text/html;charset=utf-8'));
}

window.forma={getState:()=>structuredClone(state),get tool(){return active;},get engine(){return engine;},get recording(){return Boolean(recording);}};
render();
