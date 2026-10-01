'use strict';
const params=new URLSearchParams(location.search),format=params.get('format')==='pptx'?'pptx':'pdf';
const pages=[['研选概念方案','面向个人研究者的开源项目研究与选型工作台。'],['研究中的问题','资料分散、能力边界混淆、缺少明确采用理由，是本次设计所针对的场景假设。'],['项目库','按当前用途筛选真实项目，查看摘要，再决定深入研究哪个仓库。'],['证据页','能力、使用边界与固定版本来源放在一起，便于回看和核对。'],['采用判断','写下试用理由与验证任务，在浏览器保存，并下载 Markdown 留档。'],['首轮试用范围','先验证研究流程。账户、权限、数据库、多人同步和部署属于后续工程。']];
let current=Math.max(0,Math.min(5,(Number.parseInt(params.get('page'),10)||1)-1));
const $=s=>document.querySelector(s),file='downloads/research-desk.'+format;
$('#document-title').textContent='研选 · '+format.toUpperCase()+' 阅读';document.title='研选 · '+format.toUpperCase()+' 文件阅读器';
$('#download').href=file;$('#download').textContent='下载 '+format.toUpperCase()+' ↓';
$('#original').href=file;if(format==='pptx'){$('#original').textContent='获取可编辑 PPTX ↓';$('#original').setAttribute('download','');}
$('#format-note').textContent=format==='pdf'?'这里可直接逐页阅读，无需安装阅读软件。需要选择、复制或搜索原文时，请打开原始 PDF。':'这里可直接查看 PPTX 的页面效果。修改标题与正文时，请下载原文件并在 PowerPoint 或 WPS 中打开。';
$('#render-note').textContent=format==='pdf'?'预览图片由交付的 PDF 文件逐页渲染，图片本身不可选择文字。原始 PDF 保留可提取的主体文字。':'预览图片由交付的 PPTX 文件重新导入后渲染，不是网页截图。此处只读；未在 Microsoft PowerPoint 中实机逐页检查，目标软件显示可能略有差异。';
$('#page-select').innerHTML=pages.map((p,i)=>`<option value="${i}">${i+1} / 6</option>`).join('');
$('#thumbnails').innerHTML=pages.map((p,i)=>`<button type="button" data-page="${i}" aria-label="第 ${i+1} 页：${p[0]}"><img src="assets/${format}-${i+1}.png" alt="" loading="lazy"><span>${i+1} · ${p[0]}</span></button>`).join('');
function render(){const [title,summary]=pages[current];$('#image-error').hidden=true;$('#page-image').src=`assets/${format}-${current+1}.png`;$('#page-image').alt=`${format.toUpperCase()} 第 ${current+1} 页：${title}`;$('#page-title').textContent=title;$('#page-summary').textContent=summary;$('#page-select').value=String(current);$('#page-count').textContent=`第 ${current+1} / 6 页`;$('#previous').disabled=current===0;$('#next').disabled=current===5;document.querySelectorAll('[data-page]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.page)===current)));for(const f of ['pdf','pptx']){const a=$('#'+f+'-mode');a.href=`?format=${f}&page=${current+1}`;if(f===format)a.setAttribute('aria-current','page');}const u=new URL(location.href);u.searchParams.set('format',format);u.searchParams.set('page',String(current+1));history.replaceState(null,'',u);$('#canvas').scrollTo(0,0);}
function go(n){current=Math.max(0,Math.min(5,n));render()}
$('#previous').onclick=()=>go(current-1);$('#next').onclick=()=>go(current+1);$('#page-select').onchange=e=>go(Number(e.target.value));$('#thumbnails').onclick=e=>{const b=e.target.closest('[data-page]');if(b)go(Number(b.dataset.page))};
$('#zoom').onclick=()=>{const on=$('#canvas').classList.toggle('zoomed');$('#zoom').setAttribute('aria-pressed',String(on));$('#zoom').textContent=on?'适合窗口':'放大查看'};
$('#page-image').onerror=()=>{$('#image-error').hidden=false};
document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,select,textarea'))return;const next={ArrowLeft:current-1,ArrowRight:current+1,Home:0,End:5}[e.key];if(next!==undefined){e.preventDefault();go(next)}});render();
