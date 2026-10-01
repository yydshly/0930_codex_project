'use strict';
const D = window.HUASHU_DATA, I = window.HUASHU_INVENTORY;
const $ = s => document.querySelector(s);
const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const src = path => `https://github.com/${I.repository}/blob/${I.commit}/${path}`;
const sourceLinks = paths => `<div class="source-links">${paths.map(p=>`<a href="${src(p)}" target="_blank" rel="noopener">${esc(p)}</a>`).join('')}</div>`;
const empty = text => `<div class="empty">${text}。试试其他关键词或恢复“全部”。</div>`;
const realCaseTargets={prototype:['prototype.html','操作真实场景原型','搜索、收藏、本地记录与下载已实测，未接入后台。'],slides:['deck.html','查看六页演讲稿','实际复用 deck-stage，正文与 PDF/PPT 来自同组内容。'],pdf:['reader.html?format=pdf','直接阅读实际 PDF','六页定稿；网页提供图片预览，原始文件保留主体文字。'],pptx:['reader.html?format=pptx','直接阅读实际 PPT','本次验证受约束 HTML 转 PPT 路线，39 个原生文字对象；企业模板路线未测试。'],motion:['animation.html','操作真实时间轴','实际运行 Stage/Sprite，20 秒、四段镜头。'],video:['index.html#film','播放实际 MP4 成片','已测试 20 秒 MP4；本次不含 GIF、透明视频与云配音。']};
function realCaseLinks(id){const r=realCaseTargets[id];return r?`<div class="notice"><b>已有实际成果</b><p>${r[2]}</p><a href="cases/research-desk/${r[0]}">${r[1]} ↗</a></div>`:'';}
const names = {overview:'总览与判断',capabilities:'能力全景',lab:'交互实验',gallery:'案例与风格库',architecture:'底层原理',exports:'交付与导出',extensions:'扩展与使用',boundaries:'边界与核验',sources:'来源与资料'};
let activeLab='prototype', stopLab=()=>{}, activeView='overview';

function route(){
  const id=location.hash.slice(1); activeView=Object.hasOwn(names,id)?id:'overview';
  document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==activeView);
  document.querySelectorAll('nav a').forEach(el=>{const on=el.hash==='#'+activeView;el.classList.toggle('active',on);if(on)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  $('#current-section').textContent=names[activeView];
  document.title=`${names[activeView]} · Huashu Design 能力研究室`;
  if(activeView==='lab')renderLab(activeLab);else stopLab();
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);
document.addEventListener('click',e=>{const link=e.target.closest('[data-lab]');if(link){activeLab=link.dataset.lab;if(activeView==='lab')renderLab(activeLab);}});

$('#workflow-mini').innerHTML=D.workflow.map(w=>`<div><span>${w[0]}</span><b>${w[1]}</b></div>`).join('');
$('#workflow-full').innerHTML=D.workflow.map(w=>`<div class="workflow-row"><span>${w[0]}</span><b>${w[1]}</b><span>${w[2]}</span><small>${w[3]}</small></div>`).join('');
$('#layers').innerHTML=D.layers.map((l,i)=>`<article class="layer"><span class="layer-num">${i+1}</span><h3>${l[0]}</h3><div><b>${l[1]}</b><p>${l[2]}</p></div></article>`).join('');
$('#export-table').innerHTML=D.exports.map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('');
$('#extension-grid').innerHTML=D.extensions.map(r=>`<article class="extension-card"><span class="pill">${r[4]}</span><h2>${r[0]}</h2><p>${r[1]}</p><small>修改位置：${r[2]}</small><p class="muted">验收：${r[3]}</p></article>`).join('');
$('#limits').innerHTML=D.limitations.map(r=>`<article class="extension-card"><h3>${r[0]}</h3><p>${r[1]}</p></article>`).join('');
$('#discrepancy-table').innerHTML=D.discrepancies.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td><a href="${src(r[3])}" target="_blank" rel="noopener">查看来源</a></td></tr>`).join('');
$('#prompts').innerHTML=D.prompts.map((r,i)=>`<details><summary>${r[0]}</summary><p id="prompt-${i}">${r[1]}</p><button type="button" data-copy="${i}">复制任务说明</button></details>`).join('');
let toastTimer;
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-copy]');if(!b)return;const i=Number(b.dataset.copy);try{await navigator.clipboard.writeText(D.prompts[i][1]);toast('已复制任务说明');}catch{const range=document.createRange();range.selectNodeContents($(`#prompt-${i}`));const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);toast('已选中文字，请按 Ctrl+C 复制');}});

function renderCapabilities(){
  const q=$('#cap-search').value.trim().toLowerCase(),g=$('#cap-filter').value;
  const list=D.capabilities.filter(c=>(g==='全部'||c.group===g)&&Object.values(c).flat().join(' ').toLowerCase().includes(q));
  $('#cap-count').textContent=`显示 ${list.length} / ${D.capabilities.length} 项能力 · 已核对相关源码或文档，完整生成链路未全部实测`;
  $('#cap-grid').innerHTML=list.map(c=>`<button type="button" class="cap-card" data-cap="${c.id}"><span class="card-num"><span>${c.group}</span><span>${String(D.capabilities.indexOf(c)+1).padStart(2,'0')}</span></span><h2>${c.name}</h2><p>${c.summary}</p><span class="card-end">${c.tag} · 查看输入、边界与证据</span></button>`).join('')||empty('没有匹配的能力');
}
$('#cap-search').addEventListener('input',renderCapabilities);$('#cap-filter').addEventListener('change',renderCapabilities);
const dialog=$('#detail-dialog');
$('#cap-grid').addEventListener('click',e=>{const b=e.target.closest('[data-cap]');if(!b)return;const c=D.capabilities.find(c=>c.id===b.dataset.cap);$('#detail-content').innerHTML=`<span class="eyebrow">${c.group} / ${c.tag}</span><h2>${c.name}</h2><p>${c.summary}</p><dl>${[['输入',c.input],['产物',c.output],['如何实现',c.mechanism],['能力边界',c.boundary],['如何验收',c.acceptance]].map(r=>`<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl>${realCaseLinks(c.id)}<h3>证据文件</h3>${sourceLinks(c.sources)}${c.lab?`<p style="margin-top:24px"><a class="button primary" id="detail-lab" data-lab="${c.lab}" href="#lab">体验相关教学实验</a></p>`:''}<p class="lab-caption">这是研究摘要；存在脚本或文档不代表已完成端到端验证。</p>`;dialog.showModal();});
$('#close-detail').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target.closest('#detail-lab'))dialog.close();if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});

$('#upstream-gallery').innerHTML=[['pentagram','信息层级与强对比','清晰网格与大字锚点'],['build','留白与轻字重','用空间与字重建立秩序'],['takram','柔和色彩与图形','用关系图组织视觉中心']].map(([n,title,desc])=>`<article class="gallery-card"><a href="upstream/cover-${n}.html" target="_blank" rel="noopener"><img src="images/cover-${n}.png" alt="上游 ${n} 封面样例的本地浏览器截图" width="1200" height="510" loading="lazy"></a><div><span class="eyebrow">${n.toUpperCase()}</span><h3>${title}</h3><p>${desc}</p><a href="upstream/cover-${n}.html" target="_blank" rel="noopener">打开本地原样例</a> · <a href="${src(`assets/showcases/cover/cover-${n}.html`)}" target="_blank" rel="noopener">来源</a></div></article>`).join('');
$('#all-demos').href=`https://github.com/${I.repository}/tree/${I.commit}/demos`;
function renderStyles(){const q=$('#style-search').value.trim().toLowerCase(),g=$('#style-filter').value,t=$('#tone-filter').value;const list=I.styles.filter(s=>(g==='全部'||s.category===g)&&(t==='全部'||s.tone===t)&&s.name.toLowerCase().includes(q));$('#style-count').textContent=`显示 ${list.length} / ${I.styles.length} 种风格配方`;$('#styles-list').innerHTML=list.map(s=>`<div class="style-row"><small>${esc(s.category)} / ${esc(s.tone)}</small><a href="${src('references/design-styles.md')}" target="_blank" rel="noopener">${esc(s.name)}</a></div>`).join('')||empty('没有匹配的风格');}
['style-search','style-filter','tone-filter'].forEach(id=>$('#'+id).addEventListener(id==='style-search'?'input':'change',renderStyles));
function renderSources(){const q=$('#source-search').value.trim().toLowerCase(),g=$('#source-filter').value;const list=I.files.filter(f=>f.path.toLowerCase().includes(q)&&(g==='all'||(g==='reviewed'?f.reviewed:f.path.startsWith(g))));$('#source-count').textContent=`显示 ${list.length} / ${I.files.length} 个上游文件 · 蓝边为本次已阅读文件或相关片段，其余为目录索引`;$('#source-list').innerHTML=list.map(f=>`<div class="source-row ${f.reviewed?'reviewed':''}"><a href="${f.url}" target="_blank" rel="noopener">${esc(f.path)}</a><span>${f.reviewed?'已阅读 / 片段':'目录索引'} · ${(f.size/1024).toFixed(1)} KB</span></div>`).join('')||empty('没有匹配的文件');}
$('#source-search').addEventListener('input',renderSources);$('#source-filter').addEventListener('change',renderSources);
const routes={prototype:['HTML 交互原型','先做状态与关键路径，再验证点击。交付 HTML 和素材，明确哪些数据与行为属于模拟。','references/app-prototype.md'],present:['HTML deck → PDF','浏览器演讲使用 deck；定稿分享使用 PDF。多文件与单文件 deck 有各自的 PDF 脚本，先确定页面架构。','references/slide-decks.md'],newppt:['受约束 HTML → html2pptx.js → PPTX','从第一行就遵守导出结构与尺寸约定。文字和支持的形状可编辑；复杂 CSS 需改写或作为图片。','references/editable-pptx.md'],template:['渲染后元素 → python-pptx → 模板 PPTX','使用 pptx_from_rendered.py，提供模板与版式名。母版公共元素交给模板提供，最终在目标软件逐页检查。','references/pptx-from-rendered-html.md'],video:['HTML / GSAP → HyperFrames → 视频','上游新项目默认这条路线。检查确定性、关键帧与音轨；弱环境或既有 Stage 项目可使用自研路线。','references/hyperframes-backend.md'],narration:['解说稿 → TTS → 实测时间轴 → 动画','先得到音频时长再设计节奏。该路线使用自研 NarrationStage，不应机械套用“所有新动画都走 HyperFrames”。TTS 需外部服务和明确同意。','references/voiceover-pipeline.md'],overlay:['透明合成 → HyperFrames → alpha 素材','按后端文档选择 MOV ProRes 4444、WebM 或 PNG 序列；检查实际透明通道及剪辑软件兼容性。本站未实测此路线。','references/hyperframes-backend.md']};
function renderRoute(){const r=routes[$('#route-select').value];$('#route-result').innerHTML=`<h3>${r[0]}</h3><p>${r[1]}</p>${sourceLinks([r[2]])}`;}
$('#route-select').addEventListener('change',renderRoute);

const labs=[['prototype','交互原型'],['slides','幻灯片'],['motion','动画时间轴'],['tweaks','实时调参'],['infographic','数据表达'],['review','评审规则']];
function shell(title,sub,content,explain){$('#lab-stage').innerHTML=`<div class="lab-header"><div><h2>${title}</h2><p>${sub}</p></div><span class="pill">本站原创教学演示</span></div><div class="lab-body"><div>${content}</div><aside class="lab-explain">${explain}</aside></div>`;}
function renderLab(id){stopLab();stopLab=()=>{};activeLab=id;$('#lab-tabs').innerHTML=labs.map(([k,n])=>`<button type="button" data-tab="${k}" aria-pressed="${k===id}" class="${k===id?'active':''}">${n}</button>`).join('');({prototype:prototypeLab,slides:slidesLab,motion:motionLab,tweaks:tweaksLab,infographic:infographicLab,review:reviewLab}[id]||prototypeLab)();}
$('#lab-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)renderLab(b.dataset.tab);});
function prototypeLab(){
 shell('一个按钮，怎样改变页面？','点击书目、收藏、返回或切换标签，观察状态变化。','<div class="phone"><small>READING NOTES / 示例数据</small><div id="phone-content" class="phone-content"></div><div class="phone-nav"><button data-screen="shelf">书架</button><button data-screen="saved">已收藏</button></div></div>','<h3>核心是前端状态</h3><p>界面读取当前 screen 和 saved 状态。点击事件更新状态，页面随之重新渲染。</p><code id="proto-state" class="demo-state"></code><p>这里没有真实账号或数据库；刷新后重置。这正是“可交互原型”与“完整业务产品”的区别。</p>'+sourceLinks(['assets/ios_frame.jsx','references/app-prototype.md']));
 let screen='shelf',selected=0,saved=new Set();const books=['设计中的设计','信息的秩序'];
 function draw(){let html='';if(screen==='detail'){html=`<button id="book-back">返回书架</button><h3>${books[selected]}</h3><p>演示笔记：清晰的层级帮助读者找到重点。</p><button class="primary" id="save-book">${saved.has(selected)?'取消收藏':'收藏笔记'}</button>`;}else{html=`<h3>${screen==='shelf'?'我的书架':'已收藏'}</h3>`;const ids=screen==='saved'?[...saved]:[0,1];html+=ids.length?ids.map(i=>`<button class="phone-card" data-book="${i}">${books[i]}<span>阅读笔记 · 点击查看</span></button>`).join(''):'<p style="margin-top:25px">还没有收藏。到书架选择一本书试试。</p>';}
 $('#phone-content').innerHTML=html;$('#proto-state').textContent=JSON.stringify({screen,saved:[...saved]},null,2);document.querySelectorAll('[data-screen]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.screen===screen)));}
 $('#lab-stage').onclick=e=>{const s=e.target.closest('[data-screen]'),b=e.target.closest('[data-book]');if(s){screen=s.dataset.screen;draw();}if(b){selected=Number(b.dataset.book);screen='detail';draw();}if(e.target.id==='book-back'){screen='shelf';draw();}if(e.target.id==='save-book'){saved.has(selected)?saved.delete(selected):saved.add(selected);draw();}};
 stopLab=()=>{$('#lab-stage').onclick=null;};draw();
}
function slidesLab(){
 const slides=[['01 / IDEA','想法，需要一个<br>能被看见的表达。','内容和目标决定设计方向。'],['02 / METHOD','同一份内容，<br><b>多种视觉解释。</b>','先看真实初稿，再选择深化的方向。'],['03 / DELIVERY','源文件留下来，<br>交付方式选清楚。','浏览器演讲、PDF 定稿、PPT 编辑各有边界。']];let index=0;
 shell('页面序列，就是演讲的结构','使用按钮或聚焦演示区后按左右键翻页。','<div id="slide-surface" class="slide-surface" tabindex="0" aria-label="幻灯片演示，使用左右方向键翻页"></div><div class="controls"><button id="slide-prev">上一页</button><span id="slide-count" aria-live="polite"></span><button id="slide-next">下一页</button></div>','<h3>相同媒介，不同交付</h3><p>这个实验用三页内容解释 deck 的状态切换。上游的正式壳还包含概览、缩放和演讲辅助。</p><p>网页翻页不会自动转换成 PPT 动画。需要可编辑 PPT 时，必须另外选择转换路线。</p>'+sourceLinks(['assets/deck_stage.js','assets/deck_index.html']));
 function draw(){const s=slides[index];$('#slide-surface').innerHTML=`<small>${s[0]}</small><h3>${s[1]}</h3><p>${s[2]}</p>`;$('#slide-count').textContent=`${index+1} / ${slides.length}`;$('#slide-prev').disabled=index===0;$('#slide-next').disabled=index===slides.length-1;}
 const move=n=>{index=Math.max(0,Math.min(2,index+n));draw();};$('#slide-prev').onclick=()=>move(-1);$('#slide-next').onclick=()=>move(1);$('#slide-surface').onkeydown=e=>{if(['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}};draw();
}
function motionLab(){
 shell('时间，可以决定每一帧画面','拖动到任意时刻，或播放这个 6 秒教学片段。','<div class="motion-scene"><div class="motion-title" id="motion-title">想法 → 视觉</div><div class="motion-sub" id="motion-sub">让内容逐步进入视线</div></div><div class="controls"><button id="motion-play" class="primary">播放</button><button id="motion-reset">归零</button><span id="motion-time"></span></div><label>时间轴（秒）<input id="motion-range" type="range" min="0" max="6" step="0.01" value="0"></label>','<h3>frame = render(time)</h3><p>前 2 秒进入，中间 2 秒保持，最后 2 秒离开。位置和透明度只由时间决定。</p><code id="motion-state" class="demo-state"></code><p>逐帧渲染将时间设为第 N 帧 / 帧率，再截图。这个实验没有导出 MP4，也不复刻上游 Stage 源码。</p>'+sourceLinks(['assets/animations.jsx','scripts/render-video-seek.js']));
 let t=0,running=false,raf=0,last=0;const clamp=n=>Math.max(0,Math.min(1,n));
 function draw(){const enter=1-Math.pow(1-clamp(t/2),3),leave=clamp((t-4)/2);const opacity=enter*(1-leave),x=(1-enter)*-80+leave*80;$('#motion-title').style.transform=`translateX(${x}px) scale(${.85+.15*enter})`;$('#motion-title').style.opacity=opacity;$('#motion-sub').style.opacity=clamp((t-1)/2)*(1-leave);$('#motion-range').value=t;$('#motion-time').textContent=t.toFixed(2)+' / 6.00 s';$('#motion-state').textContent=`time: ${t.toFixed(2)}s\nopacity: ${opacity.toFixed(2)}\nx: ${x.toFixed(1)}px`;}
 function pause(){running=false;cancelAnimationFrame(raf);$('#motion-play').textContent='播放';}
 function frame(now){if(!running)return;if(last)t=Math.min(6,t+(now-last)/1000);last=now;draw();if(t>=6)pause();else raf=requestAnimationFrame(frame);}
 $('#motion-play').onclick=()=>{if(running){pause();return;}if(t>=6)t=0;running=true;last=0;$('#motion-play').textContent='暂停';raf=requestAnimationFrame(frame);};$('#motion-reset').onclick=()=>{pause();t=0;draw();};$('#motion-range').oninput=e=>{pause();t=Number(e.target.value);draw();};stopLab=()=>{running=false;cancelAnimationFrame(raf);};draw();
}
function tweaksLab(){
 const key='huashu-research-002-tweaks-v1',defaults={color:'#284be6',size:24,density:'comfortable'};let prefs={...defaults};
 try{const p=JSON.parse(localStorage.getItem(key));if(p&&/^#[0-9a-f]{6}$/i.test(p.color)&&Number.isFinite(p.size)&&p.size>=18&&p.size<=34&&['compact','comfortable','spacious'].includes(p.density))prefs=p;}catch{}
 shell('变体来自事先定义的参数','改变颜色、字号与留白；刷新后本浏览器保留设置。','<article class="tweak-card" id="tweak-card"><span class="tweak-label">PROJECT NOTE / 示例内容</span><h3>把好想法，表达清楚。</h3><div class="tweak-bar"></div><p>同一份内容可以有不同的节奏。参数化让比较和微调变得直接。</p><div class="metric-line"><span>交付形式</span><b>可交互原型</b></div><div class="metric-line"><span>当前阶段</span><b>视觉探索</b></div></article>','<div class="param-grid"><label>强调色<input id="tweak-color" type="color" value="'+prefs.color+'"></label><label>标题字号 <span id="tweak-size-value"></span><input id="tweak-size" type="range" min="18" max="34" value="'+prefs.size+'"></label><label>空间密度<select id="tweak-density"><option value="compact">紧凑</option><option value="comfortable">舒适</option><option value="spacious">宽松</option></select></label><button id="tweak-reset">恢复默认</button></div><p style="margin-top:20px">保存位置是本地浏览器，不会改写源文件，不会同步到其他设备。</p>'+sourceLinks(['references/tweaks-system.md']));
 $('#tweak-density').value=prefs.density;
 function draw(){const c=$('#tweak-card');c.style.setProperty('--demo-accent',prefs.color);c.style.setProperty('--demo-size',prefs.size+'px');c.style.padding={compact:18,comfortable:28,spacious:40}[prefs.density]+'px';$('#tweak-size-value').textContent=prefs.size+'px';try{localStorage.setItem(key,JSON.stringify(prefs));}catch{}}
 $('#tweak-color').oninput=e=>{prefs.color=e.target.value;draw();};$('#tweak-size').oninput=e=>{prefs.size=Number(e.target.value);draw();};$('#tweak-density').onchange=e=>{prefs.density=e.target.value;draw();};$('#tweak-reset').onclick=()=>{prefs={...defaults};$('#tweak-color').value=prefs.color;$('#tweak-size').value=prefs.size;$('#tweak-density').value=prefs.density;draw();};draw();
}
function infographicLab(){
 shell('图形长度，应该由数据决定','修改三个示例值，观察相同比例尺下的长度变化。','<div id="chart" class="chart"></div><div class="inline-inputs">'+['研究','制作','检查'].map((s,i)=>`<label>${s}（小时）<input id="data-${i}" type="number" min="0" max="100" value="${[20,35,15][i]}"></label>`).join('')+'</div><p class="chart-label">教学用假设数据，非项目耗时统计。范围 0–100 小时；所有条形共用动态刻度，零值长度为零。</p>','<h3>表达能力不等于数据正确</h3><p>HTML、CSS 和 SVG 可以很好地呈现信息，但数据来源、单位、统计方法与解释需要另外核对。</p><code id="chart-state" class="demo-state"></code><p>输入无效或越界时，演示会按 0–100 范围修正。</p>'+sourceLinks(['references/design-styles.md','demos/c5-infographic.html']));
 function draw(){const values=[0,1,2].map(i=>Math.max(0,Math.min(100,Number($('#data-'+i).value)||0))),max=Math.max(1,...values);$('#chart').innerHTML=values.map((v,i)=>`<div class="bar-row"><span>${['研究','制作','检查'][i]}</span><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div><b>${v}</b></div>`).join('')+`<span class="chart-label">比例尺上限：${max} 小时 · 起点：0</span>`;$('#chart-state').textContent=`数据: [${values.join(', ')}]\n单位: 小时\n总计: ${values.reduce((a,b)=>a+b,0)} 小时`;}
 [0,1,2].forEach(i=>{$('#data-'+i).oninput=draw;$('#data-'+i).onchange=e=>{e.target.value=Math.max(0,Math.min(100,Number(e.target.value)||0));draw();};});draw();
}
function reviewLab(){
 const dims=['概念 / 立意','哲学一致性','视觉层级','细节执行','功能性','创新性'];
 shell('先有判断依据，再给分数','手动调整评分，观察“概念不足时总评封顶”的规则。','<div class="review-result"><span>规则演示 / 非 AI 评审</span><div class="review-score" id="review-score"></div><p id="review-message"></p><p class="muted">为便于教学，这里将五个执行维度简单平均，再演示概念 ≤5 时封顶 6 分。上游没有把此简单平均规定为唯一算法。</p></div>','<div>'+dims.map((d,i)=>`<label class="review-row"><span>${d}</span><input aria-label="${d}" id="score-${i}" type="number" min="0" max="10" step="1" value="${[8,8,9,8,7,8][i]}"></label>`).join('')+'</div><p>分数均由你输入，没有模型调用。真正评审需结合页面证据、用户目标和具体修改建议。</p>'+sourceLinks(['references/critique-guide.md']));
 function draw(){const v=dims.map((_,i)=>Math.max(0,Math.min(10,Number($('#score-'+i).value)||0))),average=v.slice(1).reduce((a,b)=>a+b,0)/5;$('#review-score').textContent=(v[0]<=5?Math.min(6,average):average).toFixed(1)+' / 10';$('#review-message').textContent=v[0]<=5?'概念维度不足：总评最高 6 分。先修正立意与内容关系。':'概念通过前置判断；继续结合证据查看五项执行表现。';}
 dims.forEach((_,i)=>{$('#score-'+i).oninput=draw;$('#score-'+i).onchange=e=>{e.target.value=Math.max(0,Math.min(10,Number(e.target.value)||0));draw();};});draw();
}
renderCapabilities();renderStyles();renderSources();renderRoute();route();
