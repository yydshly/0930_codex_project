/* Regenerate research reference pages from the same data used by the local site. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = {window:{}};
vm.createContext(context);
for (const file of ['inventory.js','data.js']) vm.runInContext(fs.readFileSync(path.join(root,'web',file),'utf8'), context);
const I=context.window.HUASHU_INVENTORY, D=context.window.HUASHU_DATA;
const url=p=>`https://github.com/${I.repository}/blob/${I.commit}/${p}`;
const link=p=>`[${p}](${url(p)})`;
const write=(name,text)=>fs.writeFileSync(path.join(root,'notes',name),text+'\n','utf8');
const footer='\n\n[返回研究入口](../README.md)\n';

let matrix='# 16 项能力矩阵\n\n本文件与展示页共用 web/data.js，由 scripts/generate-reference.cjs 生成。固定版本：'+I.commit+'。条目是研究归纳，不是上游原有的能力计数。源码/文档存在不代表完整链路已实测。\n\n';
matrix+='| 编号 | 能力 | 分组 | 主要产物 |\n| --- | --- | --- | --- |\n';
D.capabilities.forEach((c,i)=>matrix+=`| ${i+1} | ${c.name} | ${c.group} | ${c.output} |\n`);
D.capabilities.forEach((c,i)=>{matrix+=`\n## ${i+1}. ${c.name}\n\n${c.summary}\n\n| 项目 | 说明 |\n| --- | --- |\n| 输入 | ${c.input} |\n| 输出 | ${c.output} |\n| 实现 | ${c.mechanism} |\n| 边界 | ${c.boundary} |\n| 验收 | ${c.acceptance} |\n\n证据：${c.sources.map(link).join('、')}。\n`;if(c.lab)matrix+='\n对应本站教学实验：[交互实验](../web/index.html#lab)。实验为原创解释，不是上游生成效果评测。\n';});
write('capability-matrix.md',matrix+footer);

const descriptions={
 'add-music.sh':'将背景音乐混入视频；需要媒体工具。','cloud/ai-review-video.py':'可选云端看片，将视频片段发送到官方服务。','cloud/tts-doubao.mjs':'可选云端配音，输出音频及可用时间戳。','convert-formats.sh':'派生 GIF / 插帧视频；插帧与真逐帧渲染不同。','design-gate-hook.sh':'用户选择安装的部分渲染门槛检查；不自动安装。','export_deck_pdf.mjs':'多文件 HTML 页逐个打印再合并 PDF。','export_deck_pptx.mjs':'组织 HTML→可编辑 PPTX 的 A 路线。','export_deck_stage_pdf.mjs':'单文件 deck-stage 专用 PDF 输出。','fetch_images.py':'搜索并下载 Wikimedia 素材，需核对许可。','gen_deck_thumbs.mjs':'为多文件 deck 概览生成页面缩略图。','html2pptx.js':'浏览器 DOM 测量与原生 PPT 对象映射。','mix-voiceover.sh':'合并人声、背景音乐和视频。','narrate-pipeline.mjs':'解说稿→分段语音→实测时间轴。','pptx_from_rendered.py':'已有视觉 HTML→PPTX，可使用现成模板母版。','render-narration.sh':'解说动画渲染及音轨整合。','render-video-seek.js':'由受控时钟逐帧定位截图再编码。','render-video.js':'浏览器实时录制后裁切、编码。','sfx-cues.sh':'依据时间点清单混入动作音效。','verify-video.sh':'媒体参数、音轨、首尾黑帧和响度等检查。','verify.py':'浏览器截图、控制台/PageError 收集。'
};
let map='# 源码导航与证据索引\n\n研究版本：'+I.commit+'。共 '+I.files.length+' 个文件、'+I.files.filter(f=>f.path.startsWith('references/')).length+' 份专项资料、'+I.files.filter(f=>f.path.startsWith('scripts/')).length+' 个脚本。目录信息来自 GitHub Git Tree API，保存于 [upstream-inventory.json](upstream-inventory.json)。\n\n';
map+='## 建议阅读顺序\n\n1. README 理解定位，再读 SKILL 的范围、路由、流程和适配。\n2. 按目标选择一份专项资料，不必把所有流程同时执行。\n3. 回到对应脚本核对真实输入、依赖、失败行为和输出。\n4. 对照 demos 和 showcases，区分能力演示、预制样例与真实业务。\n5. 读取 SECURITY 和 LICENSE，确定可选外发与许可边界。\n\n## 模块职责\n\n| 模块 | 责任 | 研究注意点 |\n| --- | --- | --- |\n| SKILL.md | 路由与流程约束 | 指令不是程序保证，部分条款口径有差异 |\n| references/ | 设计与实现配方 | 包含案例经验和作者偏好，需按目标取舍 |\n| assets/ | 起手组件、预制样例和媒体 | 不代表完整产品；外部品牌与字体另行核查 |\n| scripts/ | 转换、渲染、媒体与验证 | 每条路线的依赖不同 |\n| demos/ | 能力与工作流演示 | 不是测试覆盖或稳定效果证明 |\n| test-prompts.json | 六条描述性测试提示 | 不是可自动执行的完整测试套件 |\n\n## 20 个工具脚本\n\n| 文件 | 职责 | 阅读范围 |\n| --- | --- | --- |\n';
I.files.filter(f=>f.path.startsWith('scripts/')).forEach(f=>map+=`| ${link(f.path)} | ${descriptions[f.path.slice(8)]||'见源文件'} | ${f.reviewed?'已阅读文件/片段':'目录与路由核对'} |\n`);
map+='\n## 专项参考目录\n\n下表为可按需阅读的路由索引；未标记阅读的文件不视为已经完整审计。\n\n| 文件 | 本轮范围 |\n| --- | --- |\n';
I.files.filter(f=>f.path.startsWith('references/')).forEach(f=>map+=`| ${link(f.path)} | ${f.reviewed?'已阅读文件/片段':'目录索引'} |\n`);
map+='\n## 完整文件目录\n\n“已阅读”包括阅读与当前研究相关的片段，不保证每行代码均已审计。“索引”仅代表文件存在于固定版本。Git blob SHA 与大小可用于比对后续版本。\n\n| 文件 | 字节 | 阅读范围 | Git blob SHA |\n| --- | ---: | --- | --- |\n';
I.files.forEach(f=>map+=`| ${link(f.path)} | ${f.size} | ${f.reviewed?'已阅读/片段':'索引'} | ${f.blob} |\n`);
write('source-map.md',map+footer);

let styles='# 风格与案例目录\n\n来源：'+link('references/design-styles.md')+' 与 '+link('assets/showcases/INDEX.md')+'。这里的名称是上游参考体系，不代表相关品牌/设计师参与或背书；风格还原度百分比是作者估计，未作为本研究测评分数。\n\n';
for(const category of ['网页','PPT','信息图']){styles+=`## ${category}：20 种\n\n| 序号 | 配方名称 | 气质 |\n| --- | --- | --- |\n`;I.styles.filter(s=>s.category===category).forEach((s,i)=>styles+=`| ${i+1} | ${s.name} | ${s.tone} |\n`);styles+='\n';}
styles+='## 24 份上游预制样例\n\n8 个场景 × 3 种风格，每个都有 HTML 与 PNG。本项目只随附三份封面用于本地复现，其余提供固定版本链接。样例数字是样例内容，不是本研究核验过的事实或性能结果。\n\n| HTML | 作者截图 |\n| --- | --- |\n';
I.files.filter(f=>f.path.startsWith('assets/showcases/')&&f.path.endsWith('.html')).forEach(f=>styles+=`| ${link(f.path)} | ${link(f.path.replace('.html','.png'))} |\n`);
styles+='\n## 上游 Demo\n\n能力演示和流程演示以 c*/w* 文件组织，另有解说动画；中英文版本不要重复计算为独立能力。\n\n';
I.files.filter(f=>f.path.startsWith('demos/')&&f.path.endsWith('.html')).forEach(f=>styles+='- '+link(f.path)+'\n');
styles+='\n## 本轮复现\n\n![Pentagram 样例本地渲染](../web/images/cover-pentagram.png)\n\n![Build 样例本地渲染](../web/images/cover-build.png)\n\n![Takram 样例本地渲染](../web/images/cover-takram.png)\n\n原文源码随附于 web/upstream；远程字体被阻止，使用本机回退。截图不证明完整 Skill 的生成质量。\n';
write('styles-and-cases.md',styles+footer);
write('task-examples.md','# 任务说明示例\n\n以下为本研究编写的任务说明。把示例中的产品、内容、附件和交付标准换成真实材料。它们不是已执行记录，也不保证一次成功。\n\n'+D.prompts.map(([name,prompt])=>`## ${name}\n\n${prompt}\n`).join('\n')+'\n## 每类任务共同需要提供的信息\n\n- 给谁看、看完希望理解什么或做什么。\n- 哪些内容与数字已经确认，哪些仍是待定。\n- 品牌资产、字体和禁止的表达。\n- 输出尺寸、格式、目标设备/软件，以及可编辑要求。\n- 可用时间、是否允许云服务，以及素材获取方式。\n\n## 应在验收时追问\n\n- 哪些部分是真实实现，哪些是模拟？\n- 哪些文件可以继续修改，修改会不会影响导出？\n- 检查覆盖了什么，未检查什么？\n- 字体、图像、音轨与母版在最终环境是否正确？\n'+footer);
console.log('Generated capability-matrix.md, source-map.md, styles-and-cases.md, task-examples.md');

// A self-contained readable handbook keeps documentation available when only web/ is published.
const chapters=[['understanding','我们的理解'],['real-case','真实场景实测'],['research','研究报告'],['capability-matrix','能力矩阵'],['export-guide','导出指南'],['extension-guide','扩展指南'],['styles-and-cases','风格与案例'],['task-examples','任务说明'],['reproduction','复现记录'],['source-map','源码索引']];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function target(t){
  const clean=t.split('#')[0];
  const name=path.posix.basename(clean).replace(/\.md$/,'');
  if(chapters.some(c=>c[0]===name))return '#'+name;
  if(t.includes('demo-checks.json'))return '#verification';
  if(t.includes('upstream-inventory.json'))return 'index.html#sources';
  if(t.includes('README.md'))return 'index.html';
  if(t.startsWith('../web/'))return t.slice(7);
  return t;
}
function inline(s){
  let result='',end=0;
  const rx=/(!?)\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g;
  let match;
  while((match=rx.exec(s))){
    result+=escape(s.slice(end,match.index));
    if(match[4]!==undefined)result+='<code>'+escape(match[4])+'</code>';
    else if(match[5]!==undefined)result+='<strong>'+escape(match[5])+'</strong>';
    else {const href=escape(target(match[3]));result+=match[1]?`<img src="${href}" alt="${escape(match[2])}" loading="lazy">`:`<a href="${href}"${/^https?:/.test(match[3])?' target="_blank" rel="noopener"':''}>${escape(match[2])}</a>`;}
    end=rx.lastIndex;
  }
  return result+escape(s.slice(end));
}
function markdown(s){
 const lines=s.split(/\r?\n/);let out='',i=0;
 while(i<lines.length){let l=lines[i];if(!l.trim()){i++;continue;}
  if(/^(~~~|```)/.test(l)){const fence=l.slice(0,3);let code=[];i++;while(i<lines.length&&!lines[i].startsWith(fence))code.push(lines[i++]);i++;out+='<pre><code>'+escape(code.join('\n'))+'</code></pre>';continue;}
  if(/^\|/.test(l)){let rows=[];while(i<lines.length&&/^\|/.test(lines[i]))rows.push(lines[i++]);const cells=r=>r.split('|').slice(1,-1).map(c=>c.trim());const header=cells(rows.shift());if(rows[0]&&/^\|[\s:|\-]+$/.test(rows[0]))rows.shift();out+='<div class="scroll-table"><table><thead><tr>'+header.map(c=>'<th>'+inline(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cells(r).map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';continue;}
  const h=l.match(/^(#{1,6}) (.*)/);if(h){const level=Math.min(6,h[1].length+1);out+=`<h${level}>${inline(h[2])}</h${level}>`;i++;continue;}
  if(/^(- |\d+\. )/.test(l)){const ordered=/^\d/.test(l),tag=ordered?'ol':'ul',rx=ordered?/^\d+\. /:/^- /;out+='<'+tag+'>';while(i<lines.length&&rx.test(lines[i]))out+='<li>'+inline(lines[i++].replace(rx,''))+'</li>';out+='</'+tag+'>';continue;}
  if(/^---+$/.test(l)){out+='<hr>';i++;continue;}
  const para=[];while(i<lines.length&&lines[i].trim()&&!/^(#{1,6} |\||~~~|```|- |\d+\. )/.test(lines[i]))para.push(lines[i++]);out+='<p>'+inline(para.join(' '))+'</p>';
 }
 return out;
}
if(chapters.every(([file])=>fs.existsSync(path.join(root,'notes',file+'.md')))){
 const nav=chapters.map(([id,name])=>`<a href="#${id}">${name}</a>`).join('');
 let body=chapters.map(([id])=>`<section id="${id}">${markdown(fs.readFileSync(path.join(root,'notes',id+'.md'),'utf8'))}</section>`).join('');
 const checkPath=path.join(root,'notes/demo-checks.json');
 if(fs.existsSync(checkPath)){
   const result=JSON.parse(fs.readFileSync(checkPath,'utf8'));
   body+='<section id="verification"><h2>本地浏览器检查记录</h2><p>'+escape(result.scope)+'。浏览器 '+escape(result.browser)+', '+result.checks.filter(c=>c.passed).length+'/'+result.checks.length+' 通过。</p><div class="scroll-table"><table><thead><tr><th>检查项目</th><th>结果</th></tr></thead><tbody>'+result.checks.map(c=>'<tr><td>'+escape(c.name)+'</td><td>'+(c.passed?'通过':'未通过')+'</td></tr>').join('')+'</tbody></table></div></section>';
 }
 const license=escape(fs.readFileSync(path.join(root,'web/upstream/LICENSE'),'utf8'));
 const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Huashu Design · 完整研究手册</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#192438;font:16px/1.85 "Segoe UI","Microsoft YaHei",sans-serif}header{background:#284be6;color:#fff;padding:36px max(24px,calc((100% - 1040px)/2))}header a{color:white}h1{font-size:32px;margin:12px 0}nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}nav a{padding:6px 12px;background:#ffffff18;border:1px solid #ffffff60;border-radius:5px;font-size:14px}main{max-width:1100px;margin:30px auto;padding:0 25px}section{padding:30px 32px;background:white;border:1px solid #dce2eb;border-radius:10px;margin-bottom:28px;scroll-margin-top:24px;overflow-wrap:anywhere}h2{font-size:30px;line-height:1.4}h3{font-size:23px;margin-top:32px}h4{font-size:19px}a{color:#284be6;text-decoration:none}a:hover{text-decoration:underline}p{margin:16px 0}pre{background:#f0f3fa;border-radius:7px;padding:20px;overflow:auto;font-size:13px;line-height:1.8}code{font-family:Consolas,monospace}img{width:100%;height:auto;border:1px solid #dce2eb}.scroll-table{overflow:auto}table{border-collapse:collapse;min-width:600px;font-size:14px;width:100%}th,td{border:1px solid #dce2eb;padding:12px 14px;text-align:left;vertical-align:top}th{background:#edf1fa}footer{text-align:center;padding:25px;font-size:13px;color:#526176}@media(max-width:600px){section{padding:18px}main{padding:0 14px}h1,h2{font-size:27px}}@media print{body{background:white}header nav{display:none}main{max-width:none;padding:0}section{border:0;padding:0;break-before:page}table{min-width:0;font-size:11px}pre{white-space:pre-wrap}}</style><header><a href="index.html">返回交互研究室</a><h1>Huashu Design · 完整研究手册</h1><p>固定版本 ${I.commit.slice(0,7)} / 研究日期 ${I.researchedAt}<br>研究报告、能力矩阵与全部参考资料，支持浏览器查找和打印。</p><nav>${nav}<a href="#license">上游许可</a></nav></header><main>${body}<section id="license"><h2>上游样例 MIT 许可</h2><p>web/upstream 三份封面源码来自 alchaincyf/huashu-design；以下为该版本许可全文。仅随附样例适用此上游声明，本站原创研究内容的许可另见仓库约定。</p><pre>${license}</pre></section></main><footer>本站研究与教学展示，不代表全部上游链路已经实测。</footer></html>`;
 fs.writeFileSync(path.join(root,'web/reference.html'),html,'utf8');
 const verification=path.join(root,'notes/demo-checks.json');
 if(fs.existsSync(verification))fs.copyFileSync(verification,path.join(root,'web/verification.json'));
 console.log('Generated portable reference.html and verification.json');
}
