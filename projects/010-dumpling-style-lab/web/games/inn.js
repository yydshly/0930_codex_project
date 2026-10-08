import {isSpatialDirection} from '../art-direction.js?v=2';
import {createSpatialWorld} from './spatial-world.js?v=1';
import {useWorldArt} from './worlds-art.js?v=4';
const WIDTH = 960, HEIGHT = 600, TAU = Math.PI * 2;
const ROOM_NAMES = {window:'临街窗房', quiet:'内院静房'};
const ITEM_NAMES = {plant:'小植物', tea:'茶桌', books:'书架'};
const PEOPLE = {
  courier:{name:'乔乔',job:'山路邮差',color:'#ba725f',hair:'#5b4345',gift:'手写明信片',description:'她背着沉甸甸的邮包，手指还留着雨水的凉意。'},
  botanist:{name:'芽芽',job:'植物学徒',color:'#8b9a6c',hair:'#786345',gift:'压花书签',description:'她的口袋里装着叶片、铅笔和一张尚未画完的植物图。'},
  writer:{name:'砚舟',job:'游记作者',color:'#758c9e',hair:'#4e505b',gift:'一页手绘游记',description:'他带着磨旧的笔记本，想把路上的见闻慢慢写下来。'}
};
const VISITS = [
  {person:'courier',room:'quiet',items:['tea'],need:'走了一整天山路，想找个安静的房间，喝一口热茶。',occasion:'雨后的第一位客人'},
  {person:'botanist',room:'window',items:['plant'],need:'明早要画叶片，想住在有窗光的房间，身边有一盆植物。',occasion:'从温室来的旅人'},
  {person:'writer',room:'quiet',items:['books'],need:'今晚要整理游记。安静的房间和一本可以翻阅的书，会让我安心。',occasion:'带着远方故事的人'},
  {person:'courier',room:'window',items:['tea'],need:'这次明早就出发，想在窗边看天色。也想再喝一杯你的热茶。',occasion:'熟悉的敲门声'},
  {person:'botanist',room:'window',items:['plant','tea'],need:'这次带来一株新芽。想借窗光观察它，再在茶桌上摊开手稿。',occasion:'新芽也来做客'},
  {person:'writer',room:'quiet',items:['books','tea'],need:'稿子快写完了，想安静地翻书、喝茶。还有一段关于这家旅店的故事。',occasion:'未写完的那一页'},
  {person:'courier',room:'quiet',items:['tea','plant'],need:'这一回不赶路了。想住得安静些，喝茶，看着小植物，慢慢歇一晚。',occasion:'第七日，一封回信'},
  {person:'writer',room:'window',items:['books','plant'],need:'编辑催我写远方，但我最近只想写窗边这些小事。今晚想借窗光、翻翻书，看看植物。',occasion:'第八日，未交的稿'},
  {person:'courier',room:'quiet',items:['tea'],need:'有人等我的回信，可我不知道怎么开头。想安静喝杯茶，今晚先把邮包放下。',occasion:'第九日，未寄的信'},
  {person:'botanist',room:'quiet',items:['plant','books'],need:'温室里的试种失败了。我想安静看看植物和旧书，再决定是否回去继续。',occasion:'第十日，重新发芽'}
];
const clone = value => JSON.parse(JSON.stringify(value));
const random = n => {const x=Math.sin(n*91.17+17.7)*19341.713;return x-Math.floor(x);};
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

function newState(){return {kind:'inn',version:1,day:1,phase:'arrival',selected:'window',furnishings:{plant:null,tea:null,books:null},current:{read:false,room:null,settled:0},histories:{courier:[],botanist:[],writer:[]},journal:[],souvenirs:[],conversation:null,letters:[],message:'雨刚停，门口响起轻轻的敲门声。点击旅人，听听她今天需要什么。',keeper:{x:495,y:417}};}
function restore(saved){
  const s=newState();if(!saved||saved.kind!=='inn'||saved.version!==1)return s;
  s.day=clamp(Number(saved.day)||1,1,10);s.phase=['arrival','stay','departed','finished'].includes(saved.phase)?saved.phase:'arrival';
  s.selected=ROOM_NAMES[saved.selected]?saved.selected:'window';
  for(const k of Object.keys(ITEM_NAMES))s.furnishings[k]=ROOM_NAMES[saved.furnishings?.[k]]?saved.furnishings[k]:null;
  s.current={read:!!saved.current?.read,room:ROOM_NAMES[saved.current?.room]?saved.current.room:null,settled:clamp(Number(saved.current?.settled)||0,0,12)};
  for(const k of Object.keys(PEOPLE))s.histories[k]=Array.isArray(saved.histories?.[k])?clone(saved.histories[k]).slice(-20):[];
  s.conversation=['listen','encourage'].includes(saved.conversation)?saved.conversation:null;s.letters=Array.isArray(saved.letters)?saved.letters.filter(x=>typeof x==='string').slice(-12):[];
  s.journal=Array.isArray(saved.journal)?saved.journal.filter(x=>typeof x==='string').slice(-20):[];
  s.souvenirs=Array.isArray(saved.souvenirs)?saved.souvenirs.filter(x=>typeof x==='string').slice(-12):[];
  if(typeof saved.message==='string')s.message=saved.message;
  s.keeper={x:clamp(Number(saved.keeper?.x)||495,185,775),y:clamp(Number(saved.keeper?.y)||417,354,473)};
  if(s.phase==='stay'&&!s.current.room)s.phase='arrival';
  return s;
}

export function createInnGame({mount,saved,onEvent}={}){
  const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;canvas.tabIndex=0;
  canvas.setAttribute('aria-label','七日小旅店：点击旅人了解需求，选择房间，再点击植物、茶桌或书架布置；安排入住后可以继续调整。');
  canvas.style.cssText='display:block;width:100%;height:auto;aspect-ratio:8/5;touch-action:manipulation;background:#ead6b9';
  mount?.appendChild(canvas);const c=canvas.getContext('2d'),art=useWorldArt(c,'inn');let state=restore(saved),time=0,hover=null,disposed=false,pointerDown=null,spatial=null;
  let guest={x:472,y:427},guestAim={x:472,y:427},guestRoute=[],settleMotion=0,leaveAge=0,noticeAge=0;
  const grain=document.createElement('canvas');grain.width=WIDTH;grain.height=HEIGHT;const gc=grain.getContext('2d');
  for(let i=0;i<22000;i++){gc.fillStyle=i%3?'rgba(108,76,46,.035)':'rgba(255,244,210,.12)';gc.fillRect(random(i)*WIDTH,random(i+777)*HEIGHT,1+random(i+998)*1.1,1);}
  if(state.phase==='stay'){const p=roomActivityPoint(state.current.room);guest={...p};guestAim={...p};}
  if(state.phase==='departed'||state.phase==='finished'){guest={x:110,y:446};leaveAge=3;}
  function sound(type){try{onEvent?.(type);}catch{}}
  function visit(){return VISITS[state.day-1];}
  function person(){return PEOPLE[visit().person];}
  function fit(room=state.current.room){const v=visit(),checks=[{id:'room',ok:room===v.room,text:v.room==='quiet'?'内院的安静':'临街房的窗光'},...v.items.map(id=>({id,ok:state.furnishings[id]===room,text:ITEM_NAMES[id]}))];return {checks,matched:checks.filter(q=>q.ok).length,total:checks.length,good:checks.every(q=>q.ok)};}
  function say(message,type){state.message=message;noticeAge=3;if(type)sound(type);}
  function memoryGreeting(){const h=state.histories[visit().person],last=h.at(-1);if(!last)return person().description;
    return last.good?`“上次的${ROOM_NAMES[last.room]}我还记得。${last.items.includes('tea')?'你的茶也很好喝。':''}” ${person().name}笑着认出了你。`:`“上次${last.missing.join('、')}还不太合适，不过我想再来试试。” ${person().name}记得你们的上一次相遇。`;
  }
  function describeActivity(){if(!state.current.room)return '';
    const f=fit(),p=person(),v=visit();if(!f.good){const q=f.checks.find(q=>!q.ok);return q.id==='room'?(v.room==='quiet'?`${p.name}不时望向街道，马车声让人难以安静下来。可以换到内院静房。`:`${p.name}把手稿移到灯下，还是想借到明亮的窗光。可以换到临街窗房。`):`${p.name}翻了翻行李，房里还缺${q.text}。现在仍可调整布置。`;}
    if(v.person==='botanist')return `${p.name}在窗边比较叶片的颜色，${v.items.includes('tea')?'把手稿摊在茶桌上。':'认真画下小植物的新芽。'}`;
    if(v.person==='writer')return `${p.name}翻开书，${v.items.includes('tea')?'端起热茶，':'在安静的灯下'}把旅店的窗与灯画进了游记。`;
    return `${p.name}${v.room==='window'?'坐在窗边看云慢慢移开':'放下邮包，肩膀终于松了下来'}。茶桌上的蒸气轻轻升起。`;
  }
  function roomActivityPoint(room){const x=room==='window'?100:520;if(!fit(room).good)return {x:x+169,y:260};return visit().person==='writer'?{x:x+290,y:266}:visit().person==='botanist'?{x:x+106,y:260}:{x:x+120,y:266};}
  function walkGuest(points){guestRoute=points.slice();guestAim=guestRoute.shift()||{...guest};}
  function furnitureNames(room){return Object.keys(ITEM_NAMES).filter(k=>state.furnishings[k]===room).map(k=>ITEM_NAMES[k]);}
  function selectRoom(room){state.selected=room;say(`${ROOM_NAMES[room]}：${room==='window'?'大窗朝街，窗光明亮，也会听见路上的马车。':'朝向内院，光线柔和，适合安静休息。'} 已有${furnitureNames(room).join('、')||'基本床铺'}。`,'soft');}
  function place(item){if(state.phase==='departed'||state.phase==='finished'){say('今天的住客已经离店。翻到下一日，再为新的需求准备房间。');return;}
    const room=state.selected,previous=state.furnishings[item];state.furnishings[item]=previous===room?null:room;
    say(previous===room?`从${ROOM_NAMES[room]}收起了${ITEM_NAMES[item]}。`:`把${ITEM_NAMES[item]}${previous?'从'+ROOM_NAMES[previous]+'移到':'放进'}${ROOM_NAMES[room]}。`,'soft');
    if(state.phase==='stay'){state.current.settled=0;settleMotion=0;walkGuest([roomActivityPoint(state.current.room)]);say(describeActivity(),fit().good?'success':'soft');}
  }
  function assign(){if(state.phase==='departed'||state.phase==='finished')return;
    if(!state.current.read){say('先点击旅人，听完今天的需求，再安排房间。','bump');return;}
    const old=state.current.room;state.current.room=state.selected;state.phase='stay';state.current.settled=0;settleMotion=0;
    walkGuest(old?[{x:475,y:281},roomActivityPoint(state.current.room)]:[{x:475,y:391},{x:505,y:370},{x:450,y:313},roomActivityPoint(state.current.room)]);say(old&&old!==state.selected?`为${person().name}换到${ROOM_NAMES[state.selected]}。旅人正带着行李去看看。`:`${person().name}提起行李，走向${ROOM_NAMES[state.selected]}。入住后还可以调整房间和布置。`,'soft');
  }
  function sendoff(){if(state.phase!=='stay'){say('先安排入住，等旅人安顿下来，再送别。');return;}
    if(state.current.settled<1.2){say('旅人还在安顿行李，稍等一小会儿，看看她怎样使用房间。');return;}
    const v=visit(),p=person(),f=fit(),items=Object.keys(ITEM_NAMES).filter(k=>state.furnishings[k]===state.current.room),missing=f.checks.filter(q=>!q.ok).map(q=>q.text);
    const goodText=state.day===4?'“清晨从窗边看见晴天，刚好赶上山路上的第一班车。你记得我的茶，也听见了这次不同的需要。”':state.day===5?'“在窗边画叶片、在茶桌上摊开手稿，这次终于把那株新芽画完整了。我把第二次来访也记在书签里。”':state.day===6?'“热茶陪我写完了最后一段。这次的游记里，既有远方，也有你替我留的安静房间。”':state.day===7?'“这次不赶路了。看着植物，喝完茶，才发现我已经把这里当成路上的小家。这封回信，替我留在回访簿里吧。”':v.person==='courier'?'“我终于慢慢喝完一杯茶。这封明信片，留给在路上照顾我的人。”':v.person==='botanist'?'“窗边的新芽被我画下来了。这张压花书签，留在你的旅店吧。”':'“这一晚很安静，故事终于写完一页。我把旅店画在这里，送给你。”';
    const answer=state.day>7?state.conversation==='listen'?{writer:'“你说，写眼前的小事也值得。我把旅店写成了新稿的第一段。”',courier:'“你陪我读完草稿，没有催我。我终于给那个人回了信。”',botanist:'“你愿意听我讲失败的试种。我把原因重新记下来，带着问题回温室。”'}[v.person]:state.conversation==='encourage'?{writer:'“你替我留好了明早的窗房。我决定先给编辑寄一页，再慢慢写完。”',courier:'“你帮我把明早的路记清楚。我愿意亲自把回信送过去。”',botanist:'“你帮我列出下一次试种的准备。我带着新计划回去了。”'}[v.person]:'“你替我留了舒服的房间。那件心事，我还想自己慢慢想。”':goodText;
    const feedback=f.good?answer:`“谢谢招待。我记住了这里的灯。下次如果能有${missing.join('和')}，会更适合我。”`;
    const record={day:state.day,room:state.current.room,items,good:f.good,missing,feedback};state.histories[v.person].push(record);state.histories[v.person]=state.histories[v.person].slice(-12);
    state.journal.push(`第${state.day}日 · ${p.name}（${p.job}）住在${ROOM_NAMES[state.current.room]}。${feedback}`);
    if(f.good&&!state.souvenirs.includes(p.gift))state.souvenirs.push(p.gift);
    if(f.good&&state.histories[v.person].length>1){const mark=`${p.name}的回访印章`;if(!state.souvenirs.includes(mark))state.souvenirs.push(mark);}
    state.journal=state.journal.slice(-20);
    if(state.day>7&&f.good&&state.conversation){const letter='第'+state.day+'日 · '+p.name+'：'+answer;if(!state.letters.includes(letter))state.letters.push(letter);state.letters=state.letters.slice(-12);const gift={writer:'窗边的新稿',courier:'寄出的回信',botanist:'第二次试种计划'}[v.person];if(!state.souvenirs.includes(gift))state.souvenirs.push(gift);}
    state.phase='departed';leaveAge=0;walkGuest([{x:450,y:313},{x:505,y:370},{x:474,y:419},{x:100,y:446}]);say(`${p.name}在门边留下了留言。${feedback}${f.good?' 纪念物已放到前台的回访簿旁。':''}` ,f.good?'success':'bump');
  }
  function nextDay(nextChapter=false){if(state.phase!=='departed')return;if((state.day===7&&!nextChapter)||state.day===10){state.phase='finished';say(`${state.day===7?'七日':'回信篇'}结束，回访簿留下了${state.journal.length}段相遇。两间房里的布置、${state.souvenirs.length}件纪念物和旅人的记忆都留了下来。`,'success');return;}
    state.day++;state.conversation=null;state.phase='arrival';state.current={read:false,room:null,settled:0};guest={x:121,y:448};walkGuest([{x:472,y:427}]);leaveAge=0;settleMotion=0;
    say(`第${state.day}日，${person().name}推开门。${memoryGreeting()} 点击旅人，听听这次需要什么。`,'soft');
  }
  function command(id){if(disposed)return;
    if(id==='revisit-chapter'&&state.phase==='finished'&&state.day===10){state.day=7;state.phase='departed';nextDay(true);say('重访回信篇。已经寄来的信、房间和过去的招待保留；这次可以试试不同的回应。','soft');return;}
    if(id==='next-chapter'&&state.phase==='finished'&&state.day===7){state.phase='departed';nextDay(true);say('回信篇开始。熟悉的来客带来了新的心事；房间与过去的招待都保留。点击来客，听听这次的故事。','success');return;}
    if(id.startsWith('conversation-')&&state.day>7&&state.current.read&&!['departed','finished'].includes(state.phase)){const choice=id.slice(13);if(!['listen','encourage'].includes(choice))return;state.conversation=choice;say(choice==='listen'?'你拉了一张椅子，让来客慢慢说。今晚不必马上找到答案。':'你们一起写下明早能做的第一件小事。来客把纸折好放进口袋。','soft');return;}
    if(id==='read-guest'){if(state.phase==='departed'||state.phase==='finished'){say(state.journal.at(-1)||'回访簿还等着第一段相遇。');return;}
      state.current.read=true;say(`${person().name} · ${person().job}：“${visit().need}” ${memoryGreeting()}`,'soft');return;}
    if(id==='room-window'||id==='room-quiet'){selectRoom(id.slice(5));return;}
    if(id.startsWith('place-')&&ITEM_NAMES[id.slice(6)]){place(id.slice(6));return;}
    if(id==='assign'){assign();return;}if(id==='sendoff'){sendoff();return;}if(id==='next-day'){nextDay();return;}
    if(id==='journal'){say(state.journal.at(-1)||'回访簿里还是空白。先让第一位旅人在这里住下来。','soft');}
  }
  function targets(){const list=[{id:'room-window',x:270,y:184,w:338,h:192},{id:'room-quiet',x:682,y:184,w:338,h:192},{id:'journal',x:685,y:375,w:72,h:44}];
    if(state.phase==='arrival'||state.phase==='stay')list.push({id:'read-guest',x:guest.x,y:guest.y-26,w:65,h:86});
    for(const [i,id] of ['plant','tea','books'].entries())if(state.phase==='arrival'||state.phase==='stay')list.push({id:'place-'+id,x:334+i*126,y:535,w:112,h:62});
    if(state.phase==='arrival'||state.phase==='stay')list.push({id:'assign',x:805,y:530,w:146,h:60});
    if(state.phase==='stay')list.push({id:'sendoff',x:806,y:461,w:150,h:43});
    if(state.phase==='finished'&&state.day===7)list.push({id:'next-chapter',x:805,y:530,w:146,h:60});
    if(state.phase==='departed')list.push({id:'next-day',x:805,y:530,w:146,h:60});return list;
  }
  function pointer(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*WIDTH,y:(e.clientY-r.top)/r.height*HEIGHT};}
  function hit(p){const radius=22*WIDTH/canvas.getBoundingClientRect().width;return targets().slice().reverse().find(q=>Math.abs(p.x-q.x)<Math.max(q.w/2,radius)&&Math.abs(p.y-q.y)<Math.max(q.h/2,radius));}
  function down(e){pointerDown=pointer(e);canvas.focus({preventScroll:true});}
  function up(e){const p=pointer(e);if(pointerDown&&Math.hypot(p.x-pointerDown.x,p.y-pointerDown.y)<30){const h=hit(p);if(h)command(h.id);}pointerDown=null;}
  function move(e){hover=hit(pointer(e));canvas.style.cursor=hover?'pointer':'default';}
  function leave(){hover=null;pointerDown=null;}
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerleave',leave);
  function tick(dt,input={}){if(disposed)return;dt=clamp(Number(dt)||0,0,.15);time+=dt;noticeAge=Math.max(0,noticeAge-dt);
    const dx=Number(input.x)||0,dy=Number(input.y)||0;if(dx||dy){const length=Math.hypot(dx,dy)||1;state.keeper.x=clamp(state.keeper.x+dx/length*110*dt,185,775);state.keeper.y=clamp(state.keeper.y+dy/length*110*dt,354,473);}
    const pressed=input.pressed||new Set();if(['KeyE','e','E','Enter','Space'].some(k=>pressed.has(k))){const near=targets().filter(q=>!q.id.startsWith('room-')).sort((a,b)=>Math.hypot(a.x-state.keeper.x,a.y-state.keeper.y)-Math.hypot(b.x-state.keeper.x,b.y-state.keeper.y))[0];if(near&&Math.hypot(near.x-state.keeper.x,near.y-state.keeper.y)<145)command(near.id);}
    const distance=Math.hypot(guestAim.x-guest.x,guestAim.y-guest.y);if(distance>1){const v=Math.min(distance,dt*130);guest.x+=(guestAim.x-guest.x)/distance*v;guest.y+=(guestAim.y-guest.y)/distance*v;settleMotion+=dt;}else if(guestRoute.length)guestAim=guestRoute.shift();
    const arrived=Math.hypot(guestAim.x-guest.x,guestAim.y-guest.y)<3&&!guestRoute.length;
    if(state.phase==='stay'&&arrived){const previous=state.current.settled;state.current.settled=Math.min(12,previous+dt);if(previous<1.2&&state.current.settled>=1.2){say(describeActivity(),fit().good?'success':'soft');}}
    if(state.phase==='departed')leaveAge+=dt;
  }
  // All art is drawn into this owned canvas. Textures are deterministic and reusable.
  function ellipse(x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
  function rounded(x,y,w,h,r,color,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();}}
  function path(points,color,width=2){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
  function text(t,x,y,size=15,color='#665040',align='left',weight='normal'){c.fillStyle=color;c.font=`${weight} ${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;c.textAlign=align;c.fillText(t,x,y);}
  function wood(x,y,w,h,color='#b9875b'){rounded(x,y,w,h,3,color);c.save();c.beginPath();c.rect(x,y,w,h);c.clip();for(let i=0;i<h/9;i++){const yy=y+i*9+4;c.beginPath();for(let j=0;j<=8;j++){const xx=x+w*j/8,dy=Math.sin(j*1.7+i)*1.4;j?c.lineTo(xx,yy+dy):c.moveTo(xx,yy+dy);}c.strokeStyle=i%3?'#79513b25':'#f9d7a128';c.lineWidth=1;c.stroke();}c.restore();}
  function lamp(x,y,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);const g=c.createRadialGradient(0,4,0,0,4,81);g.addColorStop(0,'#ffeab17a');g.addColorStop(1,'#ffe4a000');c.fillStyle=g;c.fillRect(-81,-77,162,162);path([[0,-27],[0,7]],'#947354',2);rounded(-12,-27,24,26,4,'#f7ce79','#a77945');path([[-15,7],[15,7]],'#98724c',3);c.restore();}
  function steam(x,y,scale=1){for(let i=0;i<3;i++){const p=(time*.28+i*.33)%1;c.save();c.globalAlpha=(1-p)*.32;c.translate(x+(i-1)*5,y);c.scale(scale,scale);c.beginPath();c.moveTo(0,-p*36);c.bezierCurveTo(-9,-12-p*36,9,-20-p*36,0,-31-p*36);c.strokeStyle='#fff3d9';c.lineWidth=2;c.stroke();c.restore();}}
  function plant(x,y,scale=1){if(art.prop('plant',x,y+14*scale,75*scale))return;c.save();c.translate(x,y);c.scale(scale,scale);ellipse(0,3,22,6,'#61432916');rounded(-14,-10,28,24,3,'#b98264');ellipse(0,-11,14,4,'#795945');path([[0,-10],[-1,-52]],'#6f8255',2);for(let i=0;i<5;i++){const s=i%2?-1:1;c.save();c.translate(-1,-20-i*7);c.rotate(s*.42);ellipse(s*10,0,13,5,i%2?'#8b9a61':'#72865a');path([[0,0],[s*20,0]],'#b8be832d',1);c.restore();}c.restore();}
  function teaTable(x,y,scale=1){if(art.prop('tea',x,y+37*scale,65*scale)){steam(x+8*scale,y-12*scale,scale);return}c.save();c.translate(x,y);c.scale(scale,scale);ellipse(0,26,47,9,'#4e332216');wood(-39,5,78,9,'#a77750');path([[-30,13],[-34,37]],'#8f603f',6);path([[30,13],[34,37]],'#8f603f',6);ellipse(0,4,39,10,'#d3a975');ellipse(8,0,11,4,'#efe1c5');rounded(2,-11,12,12,3,'#f6e8ca');path([[13,-8],[18,-8],[18,-2],[13,-2]],'#d6c0a1',2);steam(8,-12);ellipse(-19,-2,10,4,'#efc6a0');ellipse(-20,-5,4,2,'#c99267');c.restore();}
  function bookshelf(x,y,scale=1){if(art.prop('books',x,y+9*scale,88*scale))return;c.save();c.translate(x,y);c.scale(scale,scale);wood(-27,-73,54,82,'#a07b59');for(let row=0;row<2;row++){rounded(-22,-67+row*36,44,29,1,'#665545');for(let k=0;k<6;k++){const hh=18+random(k+row*17)*8;rounded(-20+k*7,-40+row*36-hh,5,hh,1,['#9a665e','#b69768','#7d9589','#777f90','#d5b793','#a4808f'][k]);path([[-18+k*7,-44+row*36-hh],[-18+k*7,-41+row*36]],'#eadbb129',1);}wood(-24,-36+row*36,48,5,'#bd9770');}c.restore();}
  function actor(x,y,type,scale=1,mode='idle'){const activity=['tea','read','sketch'].includes(mode),name=activity?type+'-activity':type;const paintedWalk=type!=='keeper'&&Math.hypot(guestAim.x-guest.x,guestAim.y-guest.y)>4;if(art.ready(name)){art.shadow(x,y,14*scale,.2);art.sprite(name,x,y,(activity?91:111)*scale,{pose:mode,bob:paintedWalk?Math.sin(time*8)*1.4:Math.sin(time*1.3)*.25});if(mode==='uneasy')text('…',x+25,y-79,18,'#70533c','center');return}const p=type==='keeper'?{color:'#ac8862',hair:'#644b45'}:PEOPLE[type];c.save();c.translate(x,y);c.scale(scale,scale);const walking=Math.hypot(guestAim.x-guest.x,guestAim.y-guest.y)>4&&type!=='keeper',bob=walking?Math.abs(Math.sin(time*8))*2:Math.sin(time*2)*.5;ellipse(0,3,21,6,'#57423020');c.translate(0,-bob);const seated=mode==='tea'||mode==='read'||mode==='sketch',leg=walking?Math.sin(time*8)*5:0;
    path([[-7,-13],[-9-leg,0]],'#65564d',7);path([[7,-13],[9+leg,0]],'#65564d',7);rounded(-14,-43,28,seated?27:33,9,p.color);path([[-13,-36],[-20+(walking?leg*.7:0),-18]],p.color,8);path([[13,-36],[20-(walking?leg*.7:0),-18]],p.color,8);
    ellipse(0,-56,17,20,'#e8c7a4');ellipse(0,-65,18,12,p.hair);ellipse(-13,-58,5,13,p.hair);ellipse(-6,-54,1.5,2,'#594339');ellipse(6,-54,1.5,2,'#594339');ellipse(-10,-49,4,2,'#d99c8b66');ellipse(10,-49,4,2,'#d99c8b66');path([[-3,-46],[3,-46]],'#9b715c',1.5);
    if(type==='courier'){rounded(-24,-38,11,29,3,'#75584b');path([[-23,-42],[17,-21]],'#dbba87',3);rounded(-7,-75,29,6,2,'#9c6253');}
    if(type==='botanist'){path([[-9,-71],[8,-71]],'#c6bc84',5);ellipse(8,-69,7,3,'#8b9b67');rounded(14,-25,13,18,2,'#c9b48b');}
    if(type==='writer'){c.strokeStyle='#736856';c.lineWidth=1.2;for(const xx of [-6,6]){c.beginPath();c.arc(xx,-55,4,0,TAU);c.stroke();}path([[-2,-55],[2,-55]],'#736856',1);rounded(-25,-29,11,18,2,'#718896');}
    if(type==='keeper'){rounded(-11,-37,22,23,2,'#e8d7b6');path([[-7,-38],[-4,-45]],'#ece0c9',2);}
    if(mode==='tea'){const sip=Math.max(0,Math.sin(time*.8))*10;rounded(8,-30-sip,10,10,2,'#f5e5c5');steam(13,-31-sip,.6);path([[13,-17],[15,-28-sip]],p.color,7);ellipse(14,-29-sip,4,3,'#e8c7a4');}
    if(mode==='read'||mode==='sketch'){rounded(-15,-31,30,18,2,mode==='read'?'#c2a07a':'#eee2c8','#9c8363');path([[0,-31],[0,-14]],'#967956',1);for(let i=0;i<3;i++)path([[4,-27+i*4],[12,-27+i*4]],'#ab96745c',1);if(mode==='sketch')path([[14,-25+Math.sin(time*2)*2],[23,-34+Math.sin(time*2)*2]],'#786552',2);else if(Math.sin(time*.6)>.7){c.save();c.globalAlpha=.6;path([[1,-30],[11,-26],[1,-15]],'#f2e6cb',2);c.restore();}}
    if(mode==='uneasy'){path([[-18,-34],[-18,-52]],p.color,7);ellipse(-17,-53,4,5,'#e8c7a4');text('…',26,-62,19,'#947254','center');}
    c.restore();}
  function room(room,x){if(art.ready('inn-interior')){if(state.furnishings.plant===room)plant(x+130,216,.76);if(state.furnishings.tea===room)teaTable(x+75,261,.72);if(state.furnishings.books===room)bookshelf(x+318,212,.72);rounded(x+112,111,124,23,4,'#f1e3c4d9');text(ROOM_NAMES[room],x+174,127,12,'#72593f','center');if(state.selected===room){c.strokeStyle='#cfac7166';c.lineWidth=2;c.strokeRect(x-2,110,342,186)}if(state.phase==='stay'&&state.current.room===room){rounded(x+8,115,61,20,4,'#d9e3bce8');text('已入住',x+38,129,10,'#607046','center')}return}const selected=state.selected===room,occupied=state.phase==='stay'&&state.current.room===room;rounded(x,107,339,186,6,room==='window'?'#e6cbb0':'#ddd0b5');
    for(let i=0;i<8;i++)wood(x,247+i*6,339,6,i%2?'#bc966c':'#c5a078');
    for(let i=0;i<10;i++){const xx=x+10+i*34;path([[xx,116],[xx+2,127],[xx+6,136]],'#c4a78345',1);ellipse(xx+2,128,3,1.8,'#bda3812a');}
    rounded(x+36,254,106,25,5,room==='window'?'#bda286':'#aaa488');rounded(x+42,258,94,17,4,null,'#ddd0b16b');for(let i=0;i<10;i++)path([[x+39+i*10,254],[x+39+i*10,249]],'#c8b697',1);
    if(room==='window'){rounded(x+24,128,88,91,2,'#8d7461');const sky=c.createLinearGradient(0,132,0,215);sky.addColorStop(0,'#a8c2c4');sky.addColorStop(1,'#e7dabc');rounded(x+29,133,78,81,1,sky);path([[x+68,134],[x+68,214]],'#efd8b6',5);path([[x+29,174],[x+107,174]],'#efd8b6',4);for(let j=0;j<3;j++)ellipse(x+45+j*22,147+(j%2)*9,14,4,'#f1e7d070');
      c.save();c.beginPath();c.rect(x+30,134,76,80);c.clip();for(let i=0;i<4;i++){const xx=x+32+((time*9+i*31)%80);path([[xx,204],[xx+22,204]],'#a68f7080',5);}c.restore();
      rounded(x+17,122,17,103,3,'#bd8f77');rounded(x+104,122,17,103,3,'#bd8f77');for(let k=0;k<3;k++){path([[x+21+k*4,123],[x+19+k*4,224]],'#e7bba14d',1);path([[x+109+k*4,123],[x+109+k*4,224]],'#e7bba14d',1);}const g=c.createLinearGradient(x+46,177,x+190,292);g.addColorStop(0,'#ffebbf35');g.addColorStop(1,'#ffefcb00');c.fillStyle=g;c.beginPath();c.moveTo(x+30,178);c.lineTo(x+105,178);c.lineTo(x+234,292);c.lineTo(x+121,292);c.fill();
    }else{rounded(x+37,143,59,64,3,'#8b8068');rounded(x+42,148,49,54,1,'#bdc8ad');path([[x+66,148],[x+66,203]],'#e4d6b9',4);path([[x+43,175],[x+92,175]],'#e4d6b9',3);for(let j=0;j<9;j++)ellipse(x+45+random(j+83)*46,153+random(j+112)*46,5,2,'#7e9b712e');rounded(x+14,131,17,78,3,'#9c9c80');rounded(x+104,131,17,78,3,'#9c9c80');}
    wood(x+174,237,131,40,'#a47a58');rounded(x+179,221,121,32,6,'#efe0c4');rounded(x+183,223,107,27,5,room==='window'?'#b77970':'#9b9d82');for(let i=0;i<6;i++)path([[x+187+i*18,224],[x+187+i*18,249]],'#ead1b12e',1);rounded(x+185,217,32,11,5,'#f4e7ce');rounded(x+253,217,31,11,5,'#f4e7ce');
    wood(x+137,236,27,42,'#ac835c');lamp(x+151,226,.7);rounded(x+238,132,54,54,3,'#9b7758');rounded(x+244,138,42,42,1,'#e5dac0');path([[x+249,170],[x+260,148],[x+268,162],[x+279,151]],'#9b9e83',3);ellipse(x+274,146,4,4,'#d7ad6d');
    if(state.furnishings.plant===room)plant(x+130,216,.76);if(state.furnishings.tea===room)teaTable(x+75,261,.72);if(state.furnishings.books===room)bookshelf(x+318,212,.72);
    rounded(x+111,110,123,24,4,'#eedfc0');text(ROOM_NAMES[room],x+172,127,13,'#6c5142','center','bold');text(room==='window'?'明亮窗光 · 能听见街道':'柔和光线 · 内院安静',x+169,289,11,'#7d654c','center');
    if(selected){c.strokeStyle='#ad7b4e';c.lineWidth=1.5;c.strokeRect(x-3,113,345,182);rounded(x+271,273,61,18,3,'#eee0bf');text('准备此房',x+301,286,10,'#88674a','center');}
    if(occupied){rounded(x+6,115,63,20,5,'#eee1be');text('已入住',x+38,130,11,'#7b664c','center');}
  }
  function actionCard(id,x,y,w,label,disabled=false){const over=hover?.id===id;rounded(x-w/2,y-24,w,49,8,disabled?'#dfcbb1':over?'#f0ddb9':'#ead6b1','#ae865e');text(label,x,y+5,14,disabled?'#ae957d':'#795339','center','bold');}
  function draw(){if(disposed)return;if(isSpatialDirection()){spatial??=createSpatialWorld({mount,kind:'inn',onSelect:command});canvas.hidden=true;canvas.style.display='none';spatial.setActive(true);const pose=state.phase==='stay'&&state.current.settled>1.2?(fit().good?(visit().person==='writer'?'read':visit().person==='botanist'?'sketch':'tea'):'uneasy'):'idle';spatial.update(state,{guest,pose,guestName:person().name,guestColor:person().color,guestVisible:state.phase!=='finished'&&(state.phase!=='departed'||guest.x>115)});return}canvas.hidden=false;canvas.style.display='block';spatial?.setActive(false);c.clearRect(0,0,WIDTH,HEIGHT);if(art.background('inn-interior')){room('window',100);room('quiet',520);const fire=c.createRadialGradient(310,384,4,310,384,82);fire.addColorStop(0,'#ffd38422');fire.addColorStop(1,'#ffd38400');c.fillStyle=fire;c.fillRect(228,302,164,164);for(let i=0;i<3;i++){const x=301+i*10,h=11+Math.sin(time*3+i)*4;path([[x,388],[x+3,388-h]],'#f2c178bb',4)}for(let i=0;i<state.souvenirs.length;i++){const x=591+(i%6)*20;rounded(x,366-(i>=6?10:0),14,8,2,['#b38c69','#a1a982','#8b9caa'][i%3])}rounded(748,334,92,55,5,'#f1e4c6e0');text('第 '+state.day+' 日',794,357,16,'#77563c','center');text(visit().occasion,794,378,9,'#957356','center');text('每一次停留，都留下记忆',480,476,12,'#9c7b51','center');}else{const sky=c.createLinearGradient(0,0,0,HEIGHT);sky.addColorStop(0,'#ebdfc6');sky.addColorStop(1,'#d4baa0');c.fillStyle=sky;c.fillRect(0,0,WIDTH,HEIGHT);
    for(let i=0;i<4;i++){ellipse(76+i*267+Math.sin(time*.025+i)*4,57+i%2*18,66,17,'#f8ebd655');}
    for(let j=0;j<9;j++){const x=j*131-40;path([[x,323],[x+12,147]],'#9b998153',6);for(let i=0;i<9;i++)ellipse(x+10+Math.sin(i*3)*22,145+i*17,31,10,'#a4ac8440');}
    ellipse(480,476,429,70,'#75563824');wood(66,95,828,16,'#8d5f47');wood(71,103,15,350,'#a27552');wood(874,103,15,350,'#a27552');
    const wall=c.createLinearGradient(0,95,0,482);wall.addColorStop(0,'#ecd8b9');wall.addColorStop(1,'#d8b58e');rounded(86,112,788,370,3,wall);for(let i=0;i<25;i++)path([[87+i*32,114],[87+i*32,480]],'#c79e7430',1);
    c.beginPath();c.moveTo(48,99);c.lineTo(140,40);c.lineTo(821,40);c.lineTo(914,99);c.closePath();c.fillStyle='#8d6553';c.fill();for(let i=0;i<13;i++)path([[100+i*62,61],[75+i*65,88]],'#c393762c',3);wood(78,98,804,9,'#b3845e');rounded(371,48,218,39,6,'#eedfc0','#ad8e66');text('七 日 小 旅 店',480,75,20,'#826044','center','bold');
    room('window',100);room('quiet',520);wood(86,299,788,19,'#986d4e');path([[88,306],[872,306]],'#e2bd8a',2);
    for(let i=0;i<16;i++)wood(87,319+i*10,786,10,i%2?'#c5a079':'#c9a981');
    for(let i=0;i<8;i++){wood(428+i*7,314+i*7,62,8,'#987255');path([[489+i*7,315+i*7],[489+i*7,326+i*7]],'#806145',2);}path([[427,314],[483,373]],'#dbc099',5);
    rounded(115,327,91,133,5,'#987355');rounded(122,334,77,125,3,'#6d6356');rounded(130,343,61,67,3,'#b9c4af');path([[160,343],[160,410]],'#e3d1af',4);ellipse(183,424,3,3,'#e5ba78');wood(111,458,100,7,'#b08a64');rounded(130,325,62,13,4,'#dbc7a3');text('欢迎',160,335,10,'#7f674e','center');
    rounded(227,343,125,88,5,'#bc9671');rounded(235,352,109,71,3,'#8d6851');rounded(253,370,76,53,16,'#665448');const fire=c.createRadialGradient(292,420,4,292,420,104);fire.addColorStop(0,'#ffd89244');fire.addColorStop(1,'#f6cb8900');c.fillStyle=fire;c.fillRect(188,316,208,208);path([[268,420],[315,425]],'#765440',8);path([[274,426],[311,414]],'#8d603d',6);for(let i=0;i<3;i++){const xx=274+i*14,h=22+Math.sin(time*2.5+i)*5;c.beginPath();c.moveTo(xx-8,419);c.bezierCurveTo(xx-11,403,xx+4,405-h,xx+2,394-h*.4);c.bezierCurveTo(xx+13,407,xx+11,419,xx-8,419);c.fillStyle=i%2?'#e8ae64':'#f4cc82';c.fill();}wood(224,340,132,8,'#9d7251');lamp(289,328,.6);rounded(248,442,90,20,3,'#a88361');
    wood(582,387,132,61,'#a67a53');wood(572,380,153,13,'#d0a77b');path([[615,399],[615,443]],'#b78b5e',2);path([[671,399],[671,443]],'#b78b5e',2);for(let i=0;i<state.souvenirs.length;i++){const xx=591+(i%6)*20;rounded(xx,373-(i>=6?10:0),14,8,2,['#b38c69','#a1a982','#8b9caa'][i%3]);}rounded(664,364,42,21,3,'#8e7160');path([[685,365],[685,386]],'#ddc9a5',2);for(let i=0;i<3;i++)path([[669,370+i*4],[680,370+i*4]],'#cbb89d',1);path([[696,362],[708,355]],'#6f5a48',2);lamp(727,357,.9);
    wood(375,325,31,6,'#aa825f');for(let i=0;i<3;i++){path([[382+i*8,332],[382+i*8,341]],'#7a6550',1.5);ellipse(382+i*8,343,3,4,'#be9e64');}path([[210,343],[210,439]],'#8b7257',4);for(let i=0;i<3;i++)path([[199,358+i*24],[220,358+i*24]],'#8b7257',3);rounded(201,362,10,24,3,'#af8876');rounded(207,386,11,28,3,'#8c987d');
    rounded(750,330,92,66,4,'#dfc9a7','#a78861');text('第 '+state.day+' 日',796,351,17,'#886549','center','bold');text(visit().occasion,796,373,10,'#896c53','center');path([[761,383],[831,383]],'#b9a07c',1);text('每一次停留，都留下记忆',480,476,12,'#8c6e52','center');
}    actor(state.keeper.x,state.keeper.y,'keeper',.75,'idle');
    if(state.phase!=='finished'&&(state.phase!=='departed'||guest.x>115)){let mode='idle';if(state.phase==='stay'&&state.current.settled>1.2){const f=fit();mode=!f.good?'uneasy':visit().person==='writer'?'read':visit().person==='botanist'?'sketch':'tea';if(f.good&&visit().person!=='botanist'){ellipse(guest.x,guest.y+3,16,5,'#66524219');wood(guest.x-12,guest.y-13,24,5,'#987655');path([[guest.x-9,guest.y-8],[guest.x-11,guest.y+5]],'#89684f',3);path([[guest.x+9,guest.y-8],[guest.x+11,guest.y+5]],'#89684f',3);}}actor(guest.x,guest.y,visit().person,state.phase==='stay'?.82:.94,mode);
      if(state.phase==='arrival'){rounded(guest.x-26,guest.y-102,52,22,8,'#f4e7cd','#b29472');text(state.current.read?'需求':'问候',guest.x,guest.y-86,12,'#806448','center');}
      if(state.phase==='stay'&&state.current.settled>1.2){const good=fit().good;rounded(guest.x+20,guest.y-79,53,22,8,good?'#e3e3b8':'#e7c5ac');text(good?'安顿了':'待调整',guest.x+46,guest.y-64,10,'#81704f','center');}
    }
    rounded(72,497,816,83,10,'#e9d8bc','#bba07a');if(state.phase==='arrival'||state.phase==='stay'){text('布置架',94,532,14,'#88674b','left','bold');text('每件一份 · 可移动或收起',94,551,11,'#987b5d');}
    if(state.phase==='arrival'||state.phase==='stay'){for(const [i,item] of ['plant','tea','books'].entries()){const x=334+i*126,chosen=state.furnishings[item]===state.selected;rounded(x-56,509,112,54,7,chosen?'#dac49b':'#f0e3ca',hover?.id==='place-'+item?'#a27850':'#c3ad89');if(item==='plant')plant(x-27,541,.43);if(item==='tea')teaTable(x-29,532,.44);if(item==='books')bookshelf(x-27,545,.40);text(ITEM_NAMES[item],x+15,531,12,'#765d45','center');text(chosen?'点击收起':state.furnishings[item]?'移到本房':'放入本房',x+15,548,10,'#9a7b59','center');}
      actionCard('assign',805,535,140,state.phase==='stay'?'换到所选房间':'安排入住',!state.current.read);if(state.phase==='stay')actionCard('sendoff',805,463,138,'送别 · 查看留言',state.current.settled<1.2);
    }else if(state.phase==='departed'){text('房间保留了今天的布置，留言写进了回访簿。',375,542,15,'#8b6b4e','center');actionCard('next-day',805,535,140,state.day===7?'合上七日回访簿':'翻到下一日');}
    else if(state.day===7){text('房间与过去的相遇保留，熟悉的来客会再回来。',369,542,14,'#846345','center');actionCard('next-chapter',805,535,140,'继续 · 回信篇');}else{text('十日的停留与三封新信，都留在回访簿里。',480,542,16,'#846345','center');}
    if(hover?.id==='journal'){rounded(650,435,111,24,5,'#f3e6ce');text('翻看回访簿',705,452,12,'#806348','center');}
    c.drawImage(grain,0,0);
  }
  function getUI(){const p=person(),v=visit(),stay=state.phase==='stay',after=state.phase==='departed'||state.phase==='finished',last=state.histories[v.person].at(-1);
    const goal=state.phase==='finished'?(state.day===7?'第一章结束。房间与招待已保存，可以继续回信篇。':'两章结束。三位来客的回信已保存，可以重访回信篇，尝试另一种回应。'):state.phase==='departed'?'读读离店留言，带着今天的布置与记忆进入下一日。':stay?'观察旅人怎样使用房间；需要时调整布置或换房，再送别。':state.current.read?`${p.name}想要${v.room==='quiet'?'安静':'窗光'}，还需要${v.items.map(k=>ITEM_NAMES[k]).join('、')}。选一间房，为旅人准备。`:'点击门口的旅人，听听今天的需求。';
    const actions=[{id:'read-guest',label:after?'重读离店留言':'听旅人需求',disabled:state.phase==='finished'&&state.journal.length===0},{id:'room-window',label:(state.selected==='window'?'✓ ':'')+'选临街窗房'},{id:'room-quiet',label:(state.selected==='quiet'?'✓ ':'')+'选内院静房'}];
    if(!after){for(const k of Object.keys(ITEM_NAMES))actions.push({id:'place-'+k,label:(state.furnishings[k]===state.selected?'收起':'放入')+ITEM_NAMES[k]});actions.push({id:'assign',label:stay?'换到所选房间':'安排入住',disabled:!state.current.read,primary:true});if(stay)actions.push({id:'sendoff',label:'送别并读留言',disabled:state.current.settled<1.2,primary:fit().good});}
    if(state.phase==='departed')actions.push({id:'next-day',label:state.day===7?'合上七日回访簿':'下一日来客',primary:true});
    if(state.day>7&&!after&&state.current.read)actions.push({id:'conversation-listen',label:(state.conversation==='listen'?'✓ ':'')+'坐下来，听完这件心事'},{id:'conversation-encourage',label:(state.conversation==='encourage'?'✓ ':'')+'一起安排明早的第一步'});
    if(state.phase==='finished'&&state.day===7)actions.push({id:'next-chapter',label:'继续第二章 · 留下的信',primary:true});
    if(state.phase==='finished'&&state.day===10)actions.push({id:'revisit-chapter',label:'重访回信篇，保留已收到的信',primary:true});
    actions.push({id:'journal',label:'翻看回访簿'});
    const inventory=[...Object.keys(ITEM_NAMES).map(k=>`${ITEM_NAMES[k]}：${state.furnishings[k]?ROOM_NAMES[state.furnishings[k]]:'布置架上'}`),...state.souvenirs.map(x=>'纪念物 · '+x)];
    const journal=state.journal.slice();if(!after)journal.push(last?`回访记忆 · ${p.name}记得第${last.day}日的${ROOM_NAMES[last.room]}${last.good?'与细心招待。':'；这一次仍然愿意再试试。'}`:`今天第一次遇见${p.name}。`);
    return {guestInfo:{name:p.name,job:p.job,need:v.need,checks:fit(state.selected).checks,stayingGood:fit().good},title:state.day>7?'小旅店 · 留下的信':'七日小旅店',goal,message:state.message,progress:`第 ${state.day} / ${state.day>7?10:7} 日 · ${p.name} / ${p.job}${stay?' · '+ROOM_NAMES[state.current.room]:''}`,actions,inventory,journal,letters:state.letters.slice(),complete:state.phase==='finished',controls:'点击旅人、房间和布置架操作；方向键可在前厅走动，E 查看附近对象。布置会保留，入住后仍可换房或调整。'};
  }
  function getState(){return clone(state);}
  function getTargets(){return spatial?.active?spatial.projectTargets():targets().map(({id,x,y})=>({id,x,y}));}
  function dispose(){disposed=true;spatial?.dispose();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerleave',leave);canvas.remove();}
  draw();return {get element(){return spatial?.active?spatial.element:canvas},tick,draw,command,getUI,getState,getTargets,dispose};
}
