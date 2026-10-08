// One catalogue drives the standalone selector and the research-page gallery.
export const gameCatalog = [
  {id:'detective',title:'旧城失物局',style:'雨夜黑色电影',loop:'调查 · 证词 · 推理',opening:'一卷胶片，三种说法。先看现场，再决定把它交给谁。',journal:'案卷与证词',move:true,touch:['KeyE'],music:'noir',reading:'雨夜、黑白对比与成人人物营造悬疑。现场证据和不同说法需要对照，归还决定留下结果。'},
  {id:'wuxia',title:'山间小驿站',style:'国风江湖',loop:'行旅 · 救援 · 取舍',opening:'山路被雨截断了。手里的补给有限，先去看看各处的处境。',journal:'山路纪事',move:true,touch:['KeyE'],music:'ink',reading:'水墨山川、风雨与行旅者形成江湖气质。有限物资与不同处境让救援顺序成为选择。'},
  {id:'ecology',title:'小小生态岛',style:'自然微缩',loop:'水源 · 演替 · 系统',opening:'改变一处水源，会改变怎样的栖息地？留意下一季的变化。',journal:'观察手账',move:false,touch:[],music:'nature',reading:'俯视地形、植被和物种活动服务自然观察。干预影响水文与栖息条件，结果随季节出现。'},
  {id:'wasteland',title:'最后一座温室',style:'厚重废土',loop:'维修 · 资源 · 生存',opening:'沙尘又要来了。先检查温室的设备与收支，再分配剩下的物资。',journal:'温室值守记录',move:false,touch:[],music:'survival',reading:'锈蚀结构、低饱和颜色和风沙展示设施的脆弱。维修和分配消耗资源，下一天检验选择。'},
  {id:'dream',title:'记忆渡船',style:'梦境幻想',loop:'记忆 · 空间 · 抉择',opening:'水面上漂着几段记忆。试着摆放它们，看看通往彼岸的路。',journal:'渡河札记',move:true,touch:['KeyE','KeyF'],music:'dream',reading:'剪影、月色和超现实空间表达记忆的不确定。物件组合改变通路，终局选择保留不同解释。'},
  {id:'arcade',title:'屋顶快递赛',style:'都市街机',loop:'跑酷 · 技巧 · 计时',opening:'快递已经接单。观察落脚处，再起跑。',journal:'路线与成绩',move:true,touch:['Space','KeyE','KeyF'],music:'arcade',reading:'霓虹夜色、清晰平台边缘和成人跑者服务速度感。跳跃、冲刺与检查点形成可以练习的路线。'},
  {id:'inn',title:'七日小旅店',style:'暖色生活叙事',loop:'布置 · 接待 · 回访',opening:'给远来的旅人，留一个舒服的角落。',journal:'旅人留下的话',move:true,touch:['KeyE'],music:'cozy',reading:'纸木纹理、窗光和灯火形成可停留的地方。房间与布置影响活动，离店结果进入回访记忆。'},
  {id:'islands',title:'浮岛探险社',style:'立体幻想冒险',loop:'工具 · 远行 · 发现',opening:'从营地出发，看看云海另一边。',journal:'调查记录',move:true,touch:['KeyE'],music:'wonder',reading:'立体浮岛、云海与遗迹邀请远行。工具改变通行条件，探索所得返回营地归档。'},
  {id:'movers',title:'搬家日',style:'手绘生活',loop:'委托 · 搬运 · 送达',opening:'三个委托，一天的街灯。把一段段生活，稳稳送到新的地方。',journal:'搬家记录',move:true,touch:['Space','KeyE','KeyF'],music:'playful',reading:'手绘街区与成年搬运者贯穿晴天、雨后、夜晚。物件带着人物的记忆，重量、碰撞与包装恢复支持三个完整委托。'},
];
export const newGameIds = ['detective','wuxia','ecology','wasteland','dream','arcade'];
export const gameIds = gameCatalog.map(game=>game.id);
export const gameInfo = Object.fromEntries(gameCatalog.map(game=>[game.id,game]));

export function gameTab(game,index){
  const button=document.createElement('button');button.type='button';button.id='tab-'+game.id;button.setAttribute('role','tab');button.setAttribute('aria-controls','game-view');button.dataset.gameTab=game.id;button.setAttribute('aria-selected','false');button.tabIndex=-1;
  const number=document.createElement('span');number.className='tab-number';number.textContent=String(index+1).padStart(2,'0');
  const text=document.createElement('span'),title=document.createElement('b'),style=document.createElement('small');title.textContent=game.title;style.textContent=game.style+' · '+game.loop;text.append(title,style);
  button.append(number,text);return button;
}
