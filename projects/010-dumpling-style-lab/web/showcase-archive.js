import {W,H,images,canvasSurface,cover,label,glow,action,safeSaved} from './showcase-core.js';

const names={key:'铜钥匙',handle:'木柄',head:'铁撬头',lever:'组装撬具',fuse:'保险管',lens:'望远镜片'};
export const ARCHIVE_HOTSPOTS={
 lobby:[{id:'desk',name:'接待桌',x:278,y:401,r:71},{id:'shelf',name:'工具木柄',x:627,y:341,r:46},{id:'chart',name:'航海星图',x:580,y:188,r:81},{id:'door',name:'通往维修室',x:913,y:340,r:99}],
 workshop:[{id:'back',name:'返回档案厅',x:93,y:280,r:58},{id:'case',name:'工具箱',x:254,y:401,r:73},{id:'cabinet',name:'封闭配电柜',x:544,y:280,r:85},{id:'lock',name:'三象锁盒',x:801,y:318,r:60},{id:'next',name:'进入观测室',x:1035,y:253,r:66}],
 observatory:[{id:'back',name:'返回维修室',x:82,y:322,r:65},{id:'power',name:'能源接线盒',x:260,y:306,r:68},{id:'scope',name:'望远镜',x:602,y:311,r:110},{id:'console',name:'航标控制台',x:920,y:429,r:85}]
};
const defaults={version:1,room:'lobby',inventory:[],selected:null,combine:false,drawer:false,handleTaken:false,headTaken:false,doorOpen:false,clue:false,cabinetOpen:false,lockOpen:false,code:[],codeAttempts:0,codePanel:false,powered:false,lensInstalled:false,won:false,phase:'explore',score:0,interactions:0,message:'档案厅的航标失去了信号。先调查接待桌、工具架和墙上的星图。',history:[],elapsed:0};
export async function createArchive({host,input,saved,notify,sfx}){
 const art=await images(['lobby','workshop','observatory',...Object.keys(names)],'assets/game-forms/archive/'),{ctx,element}=canvasSurface(host);let s=safeSaved(saved,defaults),pulse=0;
 element.setAttribute('aria-label','潮灯档案。点击房间对象调查，点道具选择，再点场景使用。组合木柄与铁撬头；星图提示锁盒顺序。');
 const owns=id=>s.inventory.includes(id);
 function say(text,sound='turn'){s.message=text;s.interactions++;s.history.push(text);if(s.history.length>16)s.history.shift();pulse=.8;sfx(sound)}
 function collect(id,text){if(!owns(id)){s.inventory.push(id);s.score+=100;say(text||'取得 '+names[id]+'，已放入道具栏。','pickup')}}
 function consume(id){s.inventory=s.inventory.filter(n=>n!==id);s.selected=null;s.combine=false}
 function select(id){if(!owns(id))return;if(s.combine&&s.selected&&s.selected!==id){if([s.selected,id].sort().join(',')==='handle,head'){consume('handle');consume('head');collect('lever','木柄与铁撬头组合成了完整撬具。');s.selected='lever'}else say('这两件物品暂时不能组合。');s.combine=false;return}s.selected=s.selected===id?null:id;say(s.selected?'已选择 '+names[id]+'，再点击场景中的目标。':'取消道具选择。')}
 function go(room){s.room=room;s.codePanel=false;s.combine=false;say({lobby:'回到档案厅，可以再查看航海星图。',workshop:'维修室里有工具箱、配电柜和三象锁盒。',observatory:'观测室的能源与望远镜仍待恢复。'}[room],'door')}
 function interact(id){
  if(s.won)return;
  if(s.room==='lobby'){
   if(id==='desk'){if(!s.drawer){s.drawer=true;collect('key','接待桌的抽屉里有一把铜钥匙。')}else say('抽屉已经检查过，钥匙在你的道具栏里。')}
   if(id==='shelf'){if(!s.handleTaken){s.handleTaken=true;collect('handle','工具架上留下一支木柄，缺少铁制撬头。')}else say('工具木柄已经拿走。')}
   if(id==='chart'){s.clue=true;say('星图记录了航标的三象顺序：星 → 月 → 海。')}
   if(id==='door'){if(s.doorOpen)go('workshop');else if(s.selected==='key'){consume('key');s.doorOpen=true;s.score+=150;go('workshop')}else say('维修室门锁住了。选择铜钥匙，再点击这扇门。')}
  }else if(s.room==='workshop'){
   if(id==='back')go('lobby');if(id==='next')go('observatory');
   if(id==='case'){if(!s.headTaken){s.headTaken=true;collect('head','工具箱里有铁撬头。试着与木柄组合。')}else say('工具箱已经检查过了。')}
   if(id==='cabinet'){if(s.cabinetOpen)say('配电柜已经打开，保险管已取出。');else if(s.selected==='lever'){s.cabinetOpen=true;s.selected=null;s.score+=150;collect('fuse','撬具打开了配电柜，取出一枚完好的保险管。')}else say('配电柜的扣件卡住了，需要完整的撬具。')}
   if(id==='lock'){if(s.lockOpen)say('锁盒已经打开，镜片已取出。');else{s.codePanel=true;s.code=[];say(s.clue?'按星图顺序选择三象。':'三象锁盒等待顺序。档案厅的星图可能留下了线索。')}}
  }else{
   if(id==='back')go('workshop');
   if(id==='power'){if(s.powered)say('能源接线盒已经恢复。');else if(s.selected==='fuse'){consume('fuse');s.powered=true;s.score+=200;say('保险管装入，观测室的能源恢复了。','success')}else say('能源接线盒缺少保险管。选择保险管后再使用。')}
   if(id==='scope'){if(s.lensInstalled)say('望远镜片已经装好，远处航标清晰可见。');else if(s.selected==='lens'){consume('lens');s.lensInstalled=true;s.score+=200;say('镜片装入，望远镜重新对准远处海岸。','success')}else say('望远镜缺少镜片。维修室的锁盒可能保存着它。')}
   if(id==='console'){if(s.powered&&s.lensInstalled){s.won=true;s.phase='won';s.score+=500;say('海岸的航标重新点亮。潮灯档案的这一夜完成了。','success');notify('航标已恢复。调查、组合、使用道具和场景切换都已留下记录。')}else say('控制台等待能源与清晰的观测信号。先恢复接线盒和望远镜。')}
  }
 }
 function symbol(id){if(!s.codePanel||s.lockOpen)return;s.code.push(id);sfx('pickup');if(s.code.length===3){s.codeAttempts++;if(s.code.join(',')==='star,moon,sea'){s.lockOpen=true;s.codePanel=false;s.score+=200;collect('lens','星、月、海顺序正确。锁盒打开，取出望远镜片。')}else{s.code=[];say('三象顺序不符。看过星图后，可以再次尝试。','hurt')}}}
 function restart(){s=structuredClone(defaults);pulse=0}
 function tick(dt){s.elapsed+=dt;pulse=Math.max(0,pulse-dt);if(s.won)return;for(const p of input.pointers){
  if(s.codePanel){if(p.x>835&&p.x<892&&p.y>200&&p.y<253){s.codePanel=false;continue}if(p.y>302&&p.y<371){const index=Math.floor((p.x-388)/116);if(index>=0&&index<3)symbol(['star','moon','sea'][index])}continue}
  if(p.y>=549&&p.y<=620){const index=Math.floor((p.x-66)/105);if(index>=0&&index<s.inventory.length)select(s.inventory[index]);continue}
  const point=ARCHIVE_HOTSPOTS[s.room].filter(h=>Math.hypot(p.x-h.x,p.y-h.y)<h.r).sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0];if(point)interact(point.id);
 }}
 function prop(id,x,y,size){const im=art[id],h=size*im.height/im.width;ctx.drawImage(im,x-size/2,y-h/2,size,h)}
 function draw(){
  cover(ctx,art[s.room]);if(s.powered&&s.room==='observatory'){glow(ctx,260,300,120,'#76e0dc28');glow(ctx,920,400,150,'#ffd08c28')}
  if(s.room==='lobby'){if(!s.drawer)prop('key',268,376,40);if(!s.handleTaken)prop('handle',625,328,48)}
  if(s.room==='workshop'){if(!s.headTaken)prop('head',254,410,43);if(s.cabinetOpen){glow(ctx,544,280,60,'#a1eac94c');label(ctx,'配电柜已打开',544,291,'#cff0d3',13)}if(s.lockOpen){glow(ctx,801,319,40,'#c8efa832');label(ctx,'已开启',801,283,'#e9dbad',12)}}
  const hover=input.hover,hot=hover&&ARCHIVE_HOTSPOTS[s.room].find(h=>Math.hypot(hover.x-h.x,hover.y-h.y)<h.r);
  for(const h of ARCHIVE_HOTSPOTS[s.room]){const isHot=h.id===hot?.id;ctx.strokeStyle=isHot?'#fff0b8':'#f0dcb13a';ctx.lineWidth=isHot?2:1;ctx.beginPath();ctx.arc(h.x,h.y,isHot?13:6,0,Math.PI*2);ctx.stroke();if(isHot)label(ctx,(s.selected?names[s.selected]+' → ':'')+h.name,h.x,Math.max(76,h.y-h.r-14),'#f3e2bd',14)}
  label(ctx,'潮灯档案 / '+({lobby:'档案厅',workshop:'维修室',observatory:'观测室'}[s.room]),232,37,'#efdfb7',21);
  ctx.fillStyle='#061723ed';ctx.fillRect(35,531,1050,94);ctx.strokeStyle='#947c5366';ctx.lineWidth=1;ctx.strokeRect(35,531,1050,94);ctx.textAlign='left';ctx.fillStyle='#c9d3cf';ctx.font='12px sans-serif';ctx.fillText(s.combine?'组合：再选择另一件物品':'道具栏 · 点道具，再点场景目标',54,549);
  for(let i=0;i<s.inventory.length;i++){const id=s.inventory[i],x=106+i*105;ctx.fillStyle=s.selected===id?'#ddb87429':'#b5cbb00a';ctx.strokeStyle=s.selected===id?'#efcc85':'#74889044';ctx.fillRect(x-43,557,86,62);ctx.strokeRect(x-43,557,86,62);prop(id,x,581,44);ctx.fillStyle='#e6dfc9';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(names[id],x,614)}
  if(!s.inventory.length){ctx.fillStyle='#9fb4b8';ctx.font='14px sans-serif';ctx.textAlign='left';ctx.fillText('调查房间里的物品，把线索带在身上。',60,587)}
  const summary=(s.powered?'能源 ✓':'能源 ○')+'  '+(s.lensInstalled?'镜片 ✓':'镜片 ○');label(ctx,summary,919,594,'#bcdacf',14);
  if(s.clue)label(ctx,'星 → 月 → 海',914,39,'#e8d19b',15);
  if(s.codePanel){ctx.fillStyle='#040d16bb';ctx.fillRect(0,0,W,H);ctx.fillStyle='#10262bee';ctx.fillRect(311,187,590,286);ctx.strokeStyle='#b8935e';ctx.strokeRect(311,187,590,286);label(ctx,'三象锁盒',605,247,'#e6d4a7',25);for(let i=0;i<3;i++){ctx.fillStyle='#1e393e';ctx.strokeStyle='#dbb978';ctx.fillRect(388+i*116,302,98,69);ctx.strokeRect(388+i*116,302,98,69);label(ctx,['✦ 星','☾ 月','≈ 海'][i],437+i*116,345,'#fae3b7',22)}label(ctx,'已选 '+s.code.map(id=>({star:'星',moon:'月',sea:'海'}[id])).join(' → '),605,416,'#c9d6ce',18);label(ctx,'×',865,231,'#e3d3b1',23)}
  if(s.won){ctx.fillStyle='#071921ed';ctx.fillRect(314,188,490,266);label(ctx,'潮灯重明',560,254,'#b9efd5',31);label(ctx,'调查、组合与使用 · 航标已经恢复',560,319,'#e5d4ad',20);label(ctx,s.score+' 分 · 三处房间 · '+s.elapsed.toFixed(0)+' 秒',560,378,'#c9dfd7',17)}
 }
 return {tick,draw,getState:()=>({...structuredClone(s),hotspots:ARCHIVE_HOTSPOTS[s.room],itemNames:names}),getStatus:()=>({goal:s.won?'海岸航标恢复':'修复观测室的能源与望远镜',message:s.message,stats:['房间 '+({lobby:'档案厅',workshop:'维修室',observatory:'观测室'}[s.room]),'道具 '+s.inventory.length,s.powered?'能源已恢复':'能源待修',s.lensInstalled?'镜片已安装':'镜片待装','分数 '+s.score],actions:s.won?[action('再访档案馆',restart)]:s.codePanel?[...['star','moon','sea'].map((id,i)=>action(['星','月','海'][i],()=>symbol(id))),action('关闭锁盒',()=>{s.codePanel=false})]:[...s.inventory.map(id=>action(names[id]+(s.selected===id?' ✓':''),()=>select(id))),action(s.combine?'取消组合':'组合道具',()=>{s.combine=!s.combine;say(s.combine?'先选一件道具，再选另一件道具尝试组合。':'结束组合。')},s.inventory.length<2),action('查看星图记录',()=>say(s.clue?'星图记录：星 → 月 → 海。':'还没有查看档案厅的航海星图。'))]}),dispose(){}};
}
