const previews={prototype:['prototype.html','研选交互工作台预览','试着搜索“设计”，打开项目，选择“写下采用判断”，保存后刷新验证。'],deck:['deck.html','研选浏览器幻灯片预览','先点击幻灯片，再用左右方向键或空格翻页。Home / End 跳到首尾。'],mobile:['mobile.html','研选移动端设备框预览','这是真实 IosFrame 组件。手机内部可以滚动，交互沿用同一个响应式原型。'],animation:['animation.html','研选时间轴动画预览','使用底部控件暂停或播放，点击时间轴跳到任意画面；独立窗口更便于查看。']};
document.querySelectorAll('[data-preview]').forEach(button=>button.addEventListener('click',()=>{const [url,title,instruction]=previews[button.dataset.preview];const frame=document.getElementById('live-preview');frame.src=url;frame.title=title;document.getElementById('open-preview').href=url;document.getElementById('preview-instruction').textContent=instruction;document.querySelectorAll('[data-preview]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)))}));
previews.pdf=['reader.html?format=pdf','研选 PDF 阅读器','直接在网页翻看 PDF 的六页渲染结果。需要选取原文时，在阅读器中打开原始 PDF。'];
previews.pptx=['reader.html?format=pptx','研选 PPTX 阅读器','直接翻看实际 PPTX 的页面效果。网页预览只读，修改正文需要下载原文件。'];
const goals={
 prototype:['先体验交互原型','适合讨论页面、关键操作和前端状态。本次可以搜索、收藏并保存判断；真实用户数据与服务端逻辑需要继续实现。','prototype.html','打开原型'],
 present:['用 HTML 演讲稿组织讲解','现场可以键盘翻页和自适应屏幕。需要会后留档时，再提供 PDF；需要对方改稿时，再提供 PPTX。','deck.html','打开六页演讲稿'],
 pdf:['选择 PDF 定稿','适合固定版式阅读和归档。原始文件主体文字可复制；网页阅读器提供直接翻页预览。','reader.html?format=pdf','直接阅读 PDF'],
 pptx:['从开始就按可编辑 PPT 的约束制作','本次标题与正文是原生文字对象，截图仍是图片。复杂网页不能默认无损转换；在最终使用的演示软件中还要检查排版。','reader.html?format=pptx','直接阅读 PPT'],
 video:['先编排时间轴，再导出 MP4','网页动画用于控制节奏，成片用于独立播放。本次是 20 秒无音轨示例；配音和字幕需要额外制作与验证。','#film','查看实际成片'],
 product:['以原型作为产品讨论的起点','这套工具可帮助明确界面与流程。账户、业务数据库、权限、协作及部署仍要单独建设，不能用视觉完成度替代工程完成度。','../../reference.html#extension-guide','查看扩展与工程边界']
};
function selectGoal(){const [title,body,url,label]=goals[document.getElementById('goal-select').value];const target=document.getElementById('goal-result');target.replaceChildren();const h=document.createElement('h3'),p=document.createElement('p'),a=document.createElement('a');h.textContent=title;p.textContent=body;a.href=url;a.textContent=label+' ↗';target.append(h,p,a);}
document.getElementById('goal-select').addEventListener('change',selectGoal);selectGoal();
