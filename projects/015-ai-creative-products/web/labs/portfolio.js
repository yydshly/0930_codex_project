import {mountPortfolio} from './portfolio-stage.js';
const projects=[
{id:'011',type:'交互',material:'photo',printTitle:'ARC',title:'ARC · 交互产品展厅',tag:'一盏灯，许多选择',description:'原创三维桌灯的材质、配色、结构和部件说明随操作变化。',image:'assets/portfolio-cover-showroom.webp',cover:'ARC',series:'FORM / LIGHT / MATERIAL',result:'WebGL 展示、配置说明、PNG 与需求单。',boundary:'原创概念模型，未按实物尺寸和照明标定。'},
{id:'008',type:'动效',material:'print',printTitle:'C/M',title:'CellMotion · 文字实验室',tag:'把文字放进时间里',description:'四种原创 Canvas 文字运动，参数与时间直接控制画面。',image:'assets/portfolio-cover-motion.webp',cover:'CellMotion',series:'TYPE / TIME / CHANGE',result:'原创算法、时间跳转、PNG 与配方恢复。',boundary:'使用我们的原创实验室，不将上游非商业效果转作商业模板。'},
{id:'010',type:'游戏',material:'sleeve',printTitle:'小世界',title:'小世界 · 玩法研究',tag:'每个世界，一套规则',description:'七日小旅店、浮岛探险社与淘气搬家公司，形成三种本地体验。',image:'assets/portfolio-cover-games.webp',cover:'小世界',series:'PLAY / EXPLORE / DISCOVER',result:'三个原创可玩场景、任务反馈与浏览器存档。',boundary:'有限章节，没有在线协作或用户留存验证。'},
{id:'009',type:'交互',material:'folio',printTitle:'Forma',title:'Forma · 网页交互研究',tag:'页面也可以回应触碰',description:'原创破坏、揭幕与业务原型，把图形反馈连接到内容解锁与交付。',image:'assets/portfolio-cover-interaction.webp',cover:'Forma',series:'TOUCH / RESPOND / REVEAL',result:'原创效果、业务交互与事件导出。',boundary:'研究实现，尚无线上增长或转化证明。'}];
export function mount(container,h){return mountPortfolio(container,h,projects);}
