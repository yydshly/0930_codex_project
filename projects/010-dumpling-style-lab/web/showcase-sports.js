import {W,H,clamp,images,canvasSurface,cover,glow,label,action,safeSaved} from './showcase-core.js';

export const SPORTS_FIELD={left:122,right:996,top:95,bottom:514,goalTop:255,goalBottom:346};
const homes=[
 {id:1,team:'teal',name:'前锋',x:365,y:298}, {id:2,team:'teal',name:'边锋',x:455,y:187},
 {id:3,team:'teal',name:'后卫',x:320,y:415}, {id:4,team:'teal',name:'门将',x:149,y:300,keeper:true},
 {id:11,team:'coral',name:'前锋',x:750,y:305}, {id:12,team:'coral',name:'边锋',x:730,y:190},
 {id:13,team:'coral',name:'后卫',x:815,y:414}, {id:14,team:'coral',name:'门将',x:970,y:300,keeper:true},
];
const defaults={version:1,time:0,remaining:90,phase:'play',selected:1,players:homes.map(p=>({...p,angle:Math.PI/2,pose:0})),ball:{x:381,y:298,vx:0,vy:0,owner:1,lock:0},teal:0,coral:0,passes:0,completedPasses:0,shots:0,saves:0,steals:0,score:0,kickoff:0,won:false,passTarget:null,moveTarget:null};
export async function createSports({host,input,saved,notify,sfx}){
 const [scene,art]=await Promise.all([images(['scene'],'assets/game-forms/sports/'),images(['teal-run','teal-kick','coral-run','coral-keeper','ball'],'assets/game-forms/action/')]);
 const {ctx,element}=canvasSurface(host);element.setAttribute('aria-label','黄昏球场。方向键移动，E传球，空格射门，C切换队员。点击场地跑向目标，点击右侧球门瞄准射门。');
 let s=safeSaved(saved,defaults),trail=[],flash='',flashTime=0;
 const player=()=>s.players.find(p=>p.id===s.selected),owner=()=>s.players.find(p=>p.id===s.ball.owner);
 function resetPositions(team='teal'){
  s.players=homes.map(p=>({...p,angle:team==='teal'?Math.PI/2:-Math.PI/2,pose:0}));s.selected=1;s.moveTarget=null;s.passTarget=null;
  const p=s.players.find(p=>p.id===(team==='teal'?1:11));s.ball={x:p.x+(team==='teal'?16:-16),y:p.y,vx:0,vy:0,owner:p.id,lock:.8};trail=[];
 }
 function restart(){s=structuredClone(defaults);resetPositions();flash='新一场 · 青队向右进攻';flashTime=2}
 function select(id){if(!s.players.some(p=>p.id===id&&p.team==='teal'&&!p.keeper))return;s.selected=id;s.moveTarget=null}
 function switchPlayer(){const own=owner();if(own?.team==='teal'&&!own.keeper){select(own.id);return}select(s.players.filter(p=>p.team==='teal'&&!p.keeper).sort((a,b)=>Math.hypot(a.x-s.ball.x,a.y-s.ball.y)-Math.hypot(b.x-s.ball.x,b.y-s.ball.y))[0].id)}
 function kick(x,y,speed,kind,target=null){
  const p=owner();if(!p||p.team!=='teal'||s.phase!=='play'||s.kickoff>0){notify('先靠近足球夺回控球，再传球或射门。');return}
  const d=Math.hypot(x-p.x,y-p.y)||1;s.ball.x=p.x+(x-p.x)/d*23;s.ball.y=p.y+(y-p.y)/d*23;s.ball.vx=(x-p.x)/d*speed;s.ball.vy=(y-p.y)/d*speed;s.ball.owner=null;s.ball.lock=.15;
  s.passTarget=target;p.pose=.3;p.angle=Math.atan2(y-p.y,x-p.x)+Math.PI/2;
  if(kind==='pass'){s.passes++;if(target)select(target);flash='传球 · 跑向接球线路'}else{s.shots++;flash='射门 · 看球门空隙'}flashTime=.7;sfx(kind==='pass'?'pickup':'shot');
 }
 function pass(id){const p=owner();if(!p||p.team!=='teal')return;const others=s.players.filter(q=>q.team==='teal'&&!q.keeper&&q.id!==p.id);const q=others.find(q=>q.id===id)||others.sort((a,b)=>b.x-a.x)[0];if(q)kick(q.x,q.y,460,'pass',q.id)}
 function shoot(y){const p=owner();if(!p||p.team!=='teal')return;const aimed=Number.isFinite(y)?y:300+(input.y||0)*34;select(p.id);kick(1030,clamp(aimed,263,338),650,'shot')}
 function move(p,x,y,speed,dt){const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);if(d<1)return;const t=Math.min(d,speed*dt);p.x=clamp(p.x+dx/d*t,SPORTS_FIELD.left+17,SPORTS_FIELD.right-17);p.y=clamp(p.y+dy/d*t,SPORTS_FIELD.top+19,SPORTS_FIELD.bottom-19);p.angle=Math.atan2(dy,dx)+Math.PI/2}
 function goal(team){s[team]++;s.score=s.teal*500+s.completedPasses*30;flash=team==='teal'?'进球！青队 '+s.teal+' : '+s.coral:'红队进球 · 下一次找准空隙';flashTime=2.5;sfx(team==='teal'?'success':'hurt');s.kickoff=1.6;resetPositions(team==='teal'?'coral':'teal');if(s.teal===3||s.coral===3){s.won=s.teal>s.coral;s.phase='ended';notify(s.won?'青队完成三球挑战。可以再赛一场。':'红队赢下这一场。可以重赛寻找传球与射门空隙。')}}
 function tick(dt){
  s.time+=dt;flashTime=Math.max(0,flashTime-dt);for(const p of s.players)p.pose=Math.max(0,p.pose-dt);if(s.phase!=='play')return;
  s.kickoff=Math.max(0,s.kickoff-dt);if(s.kickoff>0)return;
  s.remaining=Math.max(0,s.remaining-dt);if(s.remaining===0){s.phase='ended';s.won=s.teal>s.coral;s.score=s.teal*500+s.completedPasses*30;notify('九十秒结束 · '+s.teal+' : '+s.coral);return}
  for(const pt of input.pointers){const q=s.players.find(p=>p.team==='teal'&&!p.keeper&&Math.hypot(p.x-pt.x,p.y-pt.y)<24);if(q){if(owner()?.team==='teal'&&owner().id!==q.id)pass(q.id);else select(q.id)}else if(pt.x>=984&&pt.y>=SPORTS_FIELD.goalTop&&pt.y<=SPORTS_FIELD.goalBottom)shoot(pt.y);else s.moveTarget={x:clamp(pt.x,145,970),y:clamp(pt.y,116,493)}}
  if(input.pressed.has('KeyC'))switchPlayer();if(input.pressed.has('KeyE'))pass();if(input.pressed.has('Space')||input.pressed.has('KeyJ'))shoot();
  const p=player(),speed=input.keys.has('KeyR')?184:143;
  if(input.x||input.y){s.moveTarget=null;const n=Math.hypot(input.x,input.y);move(p,p.x+input.x/n*100,p.y+input.y/n*100,speed,dt)}else if(s.moveTarget){move(p,s.moveTarget.x,s.moveTarget.y,speed,dt);if(Math.hypot(p.x-s.moveTarget.x,p.y-s.moveTarget.y)<4)s.moveTarget=null}
  const own=owner(),enemyOwner=own?.team==='coral';
  for(const q of s.players.filter(q=>q.id!==s.selected)){
   if(q.keeper){const x=q.team==='teal'?149:970;move(q,x,clamp(s.ball.y,275,326),104,dt);continue}
   if(q.team==='coral'){
    if(q.id===s.ball.owner){move(q,180,300,103,dt);if(q.x<445){const dy=300-q.y,d=Math.hypot(130-q.x,dy);s.ball={x:q.x-22,y:q.y,vx:(130-q.x)/d*490,vy:dy/d*490,owner:null,lock:.18};q.pose=.3;s.passTarget=null}}
    else{const chasers=s.players.filter(a=>a.team==='coral'&&!a.keeper&&a.id!==s.ball.owner).sort((a,b)=>Math.hypot(a.x-s.ball.x,a.y-s.ball.y)-Math.hypot(b.x-s.ball.x,b.y-s.ball.y));if(chasers[0].id===q.id)move(q,s.ball.x,s.ball.y,88,dt);else{const h=homes.find(a=>a.id===q.id);move(q,clamp(s.ball.x+110,580,860),h.y,63,dt)}}
   }else{const h=homes.find(a=>a.id===q.id);if(s.ball.owner===null&&s.passTarget===q.id)move(q,s.ball.x,s.ball.y,132,dt);else move(q,clamp(s.ball.x-50+(q.id===2?130:-130),230,870),h.y,70,dt)}
  }
  // Players occupy real space, while controlled movement retains priority.
  for(let i=0;i<s.players.length;i++)for(let j=i+1;j<s.players.length;j++){const a=s.players[i],b=s.players[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>0&&d<22){const n=(22-d)*.5;a.x-=dx/d*n;a.y-=dy/d*n;b.x+=dx/d*n;b.y+=dy/d*n}}
  s.ball.lock=Math.max(0,s.ball.lock-dt);const b=s.ball,currentOwner=owner();
  if(currentOwner){const facing=currentOwner.team==='teal'?1:-1;b.x=currentOwner.x+facing*16;b.y=currentOwner.y;b.vx=b.vy=0;
   if(b.lock===0){const thief=s.players.find(q=>q.team!==currentOwner.team&&Math.hypot(q.x-currentOwner.x,q.y-currentOwner.y)<25);if(thief){b.owner=thief.id;b.lock=.75;s.steals++;s.passTarget=null;if(thief.team==='teal'&&!thief.keeper)select(thief.id);sfx('turn')}}
  }else{
   trail.push({x:b.x,y:b.y});if(trail.length>12)trail.shift();b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=Math.exp(-.27*dt);b.vy*=Math.exp(-.27*dt);
   if(b.y<SPORTS_FIELD.top+7||b.y>SPORTS_FIELD.bottom-7){b.y=clamp(b.y,SPORTS_FIELD.top+7,SPORTS_FIELD.bottom-7);b.vy*=-.72}
   if(b.x>SPORTS_FIELD.right||b.x<SPORTS_FIELD.left){if(b.y>SPORTS_FIELD.goalTop&&b.y<SPORTS_FIELD.goalBottom){goal(b.x>SPORTS_FIELD.right?'teal':'coral');return}b.x=clamp(b.x,SPORTS_FIELD.left+7,SPORTS_FIELD.right-7);b.vx*=-.72}
   if(b.lock===0){const receiver=s.players.filter(q=>Math.hypot(q.x-b.x,q.y-b.y)<(q.keeper?23:18)).sort((a,q)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(q.x-b.x,q.y-b.y))[0];if(receiver){if(receiver.id===s.passTarget){s.completedPasses++;s.score+=30}if(receiver.keeper){s.saves++;sfx('hurt');b.vx=receiver.team==='teal'?230:-230;b.vy=(b.y-receiver.y)*7;b.lock=.45}else{b.owner=receiver.id;b.lock=.5;if(receiver.team==='teal')select(receiver.id)}s.passTarget=null}}
  }
 }
 function drawActor(p){const key=p.keeper&&p.team==='coral'?'coral-keeper':p.team==='coral'?'coral-run':p.pose>0?'teal-kick':'teal-run';ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);const im=art[key],h=p.keeper?37:35,w=h*im.width/im.height;ctx.shadowColor='#020e1788';ctx.shadowBlur=5;ctx.shadowOffsetY=2;ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();if(p.team==='teal'){ctx.fillStyle='#7fe5e3';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(String(p.id),p.x,p.y+30)}}
 function draw(){
  cover(ctx,scene.scene);const p=player();glow(ctx,p.x,p.y,31,'#58fff32e');ctx.strokeStyle='#9afbf0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,24,24,0,0,Math.PI*2);ctx.stroke();
  if(s.moveTarget){ctx.strokeStyle='#8ae8e1aa';ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(s.moveTarget.x,s.moveTarget.y);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(s.moveTarget.x,s.moveTarget.y,8,0,Math.PI*2);ctx.stroke()}
  if(!s.ball.owner){ctx.lineWidth=3;for(let i=1;i<trail.length;i++){ctx.strokeStyle=`rgba(246,236,190,${i/trail.length*.38})`;ctx.beginPath();ctx.moveTo(trail[i-1].x,trail[i-1].y);ctx.lineTo(trail[i].x,trail[i].y);ctx.stroke()}}
  for(const q of s.players)drawActor(q);const b=s.ball;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(s.time*8);ctx.shadowColor='#000a';ctx.shadowBlur=5;ctx.drawImage(art.ball,-8,-8,16,16);ctx.restore();
  label(ctx,'青队  '+s.teal+'  :  '+s.coral+'  红队',560,40,'#f5e7c3',23);label(ctx,Math.ceil(s.remaining)+' 秒 · 三球挑战',916,41,'#e4dbc1',15);label(ctx,'黄昏球场',207,41,'#a7eeeb',19);
  label(ctx,'移动 / 点地面跑位 · E 传球 · 空格射门 · 点右侧球门选择射门位置',560,596,'#d6e4d9',15);
  if(flashTime>0)label(ctx,flash,560,551,'#f5e7b4',20);
  if(s.phase==='ended'){ctx.fillStyle='#071c27eb';ctx.fillRect(345,208,430,220);label(ctx,s.won?'青队赢下球场':s.teal===s.coral?'这一场平局':'红队赢下球场',560,268,'#c2efdf',28);label(ctx,s.teal+' : '+s.coral+' · 接成传球 '+s.completedPasses+' 次',560,326,'#f5ddb4',21);label(ctx,'下方可以重赛，保留完成记录',560,386,'#c4d4d5',16)}
 }
 return {tick,draw,getState:()=>({...structuredClone(s),field:SPORTS_FIELD}),getStatus:()=>({goal:s.phase==='ended'?'比赛结束 · '+s.teal+' : '+s.coral:'青队向右进攻 · 先得三球或九十秒领先',message:'方向键移动，按住 R 冲刺。点击队友把球传给他，点击右侧球门可选择射门位置；C 切到持球者或距球最近的队员。对手会追球、抢断与射门。',stats:['青队 '+s.teal,'红队 '+s.coral,'时间 '+Math.ceil(s.remaining),'接成传球 '+s.completedPasses,'射门 '+s.shots,'扑救 '+s.saves],actions:s.phase==='ended'?[action('再赛一场',restart)]:[...s.players.filter(p=>p.team==='teal'&&!p.keeper).map(p=>action(p.name+(s.selected===p.id?' ✓':''),()=>select(p.id))),action('传给队友 · E',()=>pass()),action('射向近角',()=>shoot(266)),action('射向远角',()=>shoot(338)),action('切换队员 · C',switchPlayer)]}),dispose(){trail=[]}};
}
