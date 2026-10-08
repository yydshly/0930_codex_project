import {W,H,clamp,images,canvasSurface,cover,sprite,shadow,glow,label,action,safeSaved} from './showcase-core.js';

export async function createCommand({host,input,saved,notify,sfx}){
 const [terrain,art]=await Promise.all([images(['scene'],'assets/game-forms/command/'),images(['rover','drone','base','walker','beacon','outpost','ore','wagon'],'assets/game-forms/strategy/')]);
 const {ctx,element}=canvasSurface(host),world={width:1792,height:1120},base={x:310,y:700},mini={x:924,y:24,w:169,h:106};
 const unit=(id,kind,x,y)=>({id,kind,x,y,hp:kind==='drone'?58:84,maxHp:kind==='drone'?58:84,cd:0,goal:null,face:1});
 const beacon=(id,x,y)=>({id,x,y,hp:100,maxHp:100,progress:0,captured:false});
 const defaults={units:[unit(1,'rover',395,665),unit(2,'rover',450,665),unit(3,'rover',395,735),unit(4,'drone',450,735)],enemies:[],beacons:[beacon('p0',760,510),beacon('p1',1250,300),beacon('p2',1390,840)],selected:[1,2,3,4],camera:{x:85,y:390},gold:180,time:0,income:0,nextId:5,kills:0,hits:0,orders:0,captures:0,score:0,won:false,down:false,reinforced:false};
 defaults.enemies=defaults.beacons.flatMap((b,i)=>[-1,1].map((d,j)=>({id:100+i*2+j,home:i,x:b.x+d*76,y:b.y+65,hp:46,maxHp:46,cd:1+j*.35,face:1})));
 let s=safeSaved(saved,defaults),shots=[],particles=[],marker=null,drag=null,active=false;
 const controller=new AbortController(),signal=controller.signal;
 const alive=()=>s.units.filter(u=>u.hp>0),selected=()=>alive().filter(u=>s.selected.includes(u.id)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const enemies=()=>[...s.enemies.filter(e=>e.hp>0),...s.beacons.filter(b=>!b.captured&&b.hp>0)];
 function center(x,y){s.camera.x=clamp(x-W/2,0,world.width-W);s.camera.y=clamp(y-H/2,0,world.height-H)}
 function all(){s.selected=alive().map(u=>u.id);notify('已选择 '+s.selected.length+' 个单位，点击地面下达编队移动。')}
 function recruit(kind='rover'){if(s.won||s.down||s.gold<75||alive().length>=8)return;s.gold-=75;const id=s.nextId++;s.units.push(unit(id,kind,base.x+60+(id%3)*45,base.y+65));s.selected.push(id);sfx('build');notify('新单位从营地驶出，可与已有编队一起调度。')}
 function burst(x,y,color){for(let i=0;i<10;i++){const a=i/10*Math.PI*2;particles.push({x,y,vx:Math.cos(a)*90,vy:Math.sin(a)*90,life:.5,color})}}
 function command(x,y){
  const group=selected();if(!group.length){notify('先点击己方单位或框选；空格可以全选。');return}
  const target=enemies().find(e=>dist(e,{x,y})<(typeof e.id==='string'?65:40));
  group.forEach((u,i)=>{const col=i%3,row=Math.floor(i/3);u.goal={x:clamp(x+(col-1)*45,150,1642),y:clamp(y+(row-.5)*45,140,975),target:target?.id??null}});
  marker={x,y,t:1.2,attack:!!target};s.orders++;sfx('turn');
 }
 const logical=e=>{const r=element.getBoundingClientRect(),scale=Math.min(r.width/W,r.height/H);return {x:(e.clientX-r.left-(r.width-W*scale)/2)/scale,y:(e.clientY-r.top-(r.height-H*scale)/2)/scale}};
 element.addEventListener('contextmenu',e=>e.preventDefault(),{signal});
 element.addEventListener('pointerdown',e=>{if(!active||s.won||s.down)return;const p=logical(e);if(p.x>=mini.x&&p.x<=mini.x+mini.w&&p.y>=mini.y&&p.y<=mini.y+mini.h){center((p.x-mini.x)/mini.w*world.width,(p.y-mini.y)/mini.h*world.height);return}if(e.button===2){command(p.x+s.camera.x,p.y+s.camera.y);return}drag={start:p,end:p,camera:{...s.camera}}},{signal});
 element.addEventListener('pointermove',e=>{if(drag)drag.end=logical(e)},{signal});
 element.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;if(!active)return;const p=logical(e),x=p.x+s.camera.x,y=p.y+s.camera.y;
  if(Math.hypot(p.x-d.start.x,p.y-d.start.y)>12){const x0=Math.min(d.start.x,p.x)+d.camera.x,x1=Math.max(d.start.x,p.x)+d.camera.x,y0=Math.min(d.start.y,p.y)+d.camera.y,y1=Math.max(d.start.y,p.y)+d.camera.y;s.selected=alive().filter(u=>u.x>=x0&&u.x<=x1&&u.y>=y0&&u.y<=y1).map(u=>u.id);sfx('cards')}
  else{const hit=alive().find(u=>dist(u,{x,y})<38);if(hit)s.selected=[hit.id];else command(x,y)}
 },{signal});element.addEventListener('pointercancel',()=>drag=null,{signal});
 function replay(){s=structuredClone(defaults);shots=[];particles=[];marker=null;drag=null;notify('新任务开始，三座信标等待接通。')}
 function fire(a,b,friendly){a.cd=friendly?a.kind==='drone'?.68:.85:1.2;shots.push({x:a.x,y:a.y-20,target:b.id,friendly,damage:friendly?a.kind==='drone'?9:12:7});sfx('shot')}
 function tick(dt){
  s.time+=dt;if(marker){marker.t-=dt;if(marker.t<=0)marker=null}for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
  if(s.won||s.down)return;
  if(input.pressed.has('Space')||input.pressed.has('KeyC'))all();if(input.pressed.has('KeyE'))recruit();if(input.pressed.has('KeyR'))center(base.x+180,base.y);
  if(!drag){s.camera.x=clamp(s.camera.x+input.x*420*dt,0,world.width-W);s.camera.y=clamp(s.camera.y+input.y*420*dt,0,world.height-H)}
  s.income+=dt;if(s.income>=4){s.income-=4;s.gold+=12;sfx('pickup')}
  if(s.time>35&&!s.reinforced){s.reinforced=true;for(let i=0;i<s.beacons.length;i++){const b=s.beacons[i];if(!b.captured)s.enemies.push({id:200+i,home:i,x:b.x+120,y:b.y+90,hp:38,maxHp:38,cd:.7,face:1})}notify('未接通的信标出现增援，注意编队生命。')}
  for(const u of alive()){
   u.cd=Math.max(0,u.cd-dt);let target=null;if(u.goal?.target)target=enemies().find(e=>e.id===u.goal.target);
   if(!target)target=enemies().filter(e=>dist(u,e)<185).sort((a,b)=>dist(u,a)-dist(u,b))[0];
   if(target&&dist(u,target)<185){if(u.cd===0)fire(u,target,true)}
   else if(u.goal){const dx=u.goal.x-u.x,dy=u.goal.y-u.y,d=Math.hypot(dx,dy);if(d>5){const speed=u.kind==='drone'?166:133;u.x+=dx/d*Math.min(d,speed*dt);u.y+=dy/d*Math.min(d,speed*dt);u.face=dx<0?-1:1}else u.goal=null}
  }
  // Small separation keeps selected units individually visible as a formation moves.
  const friendly=alive();for(let i=0;i<friendly.length;i++)for(let j=i+1;j<friendly.length;j++){const a=friendly[i],b=friendly[j],d=dist(a,b);if(d>0&&d<35){const force=(35-d)*dt*3,dx=(a.x-b.x)/d,dy=(a.y-b.y)/d;a.x+=dx*force;a.y+=dy*force;b.x-=dx*force;b.y-=dy*force}}
  for(const e of s.enemies.filter(e=>e.hp>0)){e.cd=Math.max(0,e.cd-dt);const home=s.beacons[e.home],target=alive().filter(u=>dist(u,e)<255).sort((a,b)=>dist(e,a)-dist(e,b))[0];if(target){const d=dist(e,target);if(d>170){const dx=target.x-e.x,dy=target.y-e.y;e.x+=dx/d*85*dt;e.y+=dy/d*85*dt;e.face=dx<0?-1:1}if(d<185&&e.cd===0)fire(e,target,false)}else if(dist(e,home)>120){const d=dist(e,home);e.x+=(home.x-e.x)/d*70*dt;e.y+=(home.y-e.y)/d*70*dt}}
  for(const shot of shots){const target=shot.friendly?enemies().find(e=>e.id===shot.target):alive().find(u=>u.id===shot.target);if(!target){shot.dead=true;continue}const tx=target.x,ty=target.y-25,dx=tx-shot.x,dy=ty-shot.y,d=Math.hypot(dx,dy);if(d<12){target.hp=Math.max(0,target.hp-shot.damage);shot.dead=true;burst(tx,ty,shot.friendly?'#94fff2':'#ffa27e');if(shot.friendly)s.hits++;if(target.hp===0&&shot.friendly){s.kills++;s.gold+=typeof target.id==='string'?35:18;s.score+=100;sfx('success')}}else{shot.x+=dx/d*520*dt;shot.y+=dy/d*520*dt}}
  shots=shots.filter(p=>!p.dead);
  for(const b of s.beacons){if(b.captured||b.hp>0)continue;const contested=s.enemies.some(e=>e.hp>0&&dist(e,b)<210),near=alive().some(u=>dist(u,b)<105);if(!contested&&near){b.progress=clamp(b.progress+dt/3.5,0,1);if(b.progress===1){b.captured=true;s.captures++;s.score+=500;burst(b.x,b.y,'#8ce4d1');notify('信标 '+s.captures+'/3 已接通。');sfx('success')}}}
  s.selected=s.selected.filter(id=>alive().some(u=>u.id===id));if(s.captures===3){s.won=true;s.score+=alive().length*100;notify('三座信标接通：编队调度、战斗与占领共同完成了即时战略任务。')}else if(alive().length===0){s.down=true;notify('编队失去战斗力，可以重新执行任务。')}
 }
 function bar(u,width=40){ctx.fillStyle='#17212dcc';ctx.fillRect(u.x-width/2,u.y-61,width,4);ctx.fillStyle=typeof u.id==='number'&&u.id<100?'#9df3d8':'#ff9c80';ctx.fillRect(u.x-width/2,u.y-61,width*u.hp/u.maxHp,4)}
 function draw(){
  ctx.save();ctx.translate(-s.camera.x,-s.camera.y);cover(ctx,terrain.scene,0,0,world.width,world.height);
  sprite(ctx,art.ore,225,860,100);const wagonX=base.x+(225-base.x)*(1-Math.cos(s.time*1.2))/2,wagonY=base.y+(840-base.y)*(1-Math.cos(s.time*1.2))/2;shadow(ctx,wagonX,wagonY,20);sprite(ctx,art.wagon,wagonX,wagonY,45);shadow(ctx,base.x,base.y,63);sprite(ctx,art.base,base.x,base.y,160);
  for(const b of s.beacons){shadow(ctx,b.x,b.y,40);sprite(ctx,art.beacon,b.x,b.y,104, false,b.captured?1:.65);if(b.hp>0){sprite(ctx,art.outpost,b.x+5,b.y+37,105);bar({...b,y:b.y-53},72)}else{ctx.strokeStyle=b.captured?'#8ce9d8':'#ffe7a7';ctx.lineWidth=4;ctx.beginPath();ctx.arc(b.x,b.y+3,45,-Math.PI/2,-Math.PI/2+Math.PI*2*(b.captured?1:b.progress));ctx.stroke()}if(b.captured)glow(ctx,b.x,b.y-50,90,'#8ce9d841')}
  const actors=[...alive().map(u=>({...u,friendly:true})),...s.enemies.filter(e=>e.hp>0)].sort((a,b)=>a.y-b.y);
  for(const u of actors){shadow(ctx,u.x,u.y,22);if(u.friendly&&s.selected.includes(u.id)){ctx.strokeStyle='#98ffe1';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(u.x,u.y,28,12,0,0,Math.PI*2);ctx.stroke();if(u.goal){ctx.strokeStyle='#91fce333';ctx.setLineDash([5,8]);ctx.beginPath();ctx.moveTo(u.x,u.y);ctx.lineTo(u.goal.x,u.goal.y);ctx.stroke();ctx.setLineDash([])}}sprite(ctx,art[u.friendly?u.kind:'walker'],u.x,u.y,u.friendly?u.kind==='drone'?49:53:61,u.face<0);if(u.hp<u.maxHp||u.friendly&&s.selected.includes(u.id))bar(u)}
  for(const p of shots){ctx.fillStyle=p.friendly?'#bdfff4':'#ffb991';ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill()}for(const p of particles){ctx.globalAlpha=p.life*2;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;
  if(marker){ctx.strokeStyle=marker.attack?'#ffac7e':'#a8ffe3';ctx.lineWidth=2;ctx.beginPath();ctx.arc(marker.x,marker.y,20+(1.2-marker.t)*15,0,Math.PI*2);ctx.stroke()}
  ctx.restore();
  ctx.fillStyle='rgba(15,26,37,.87)';ctx.fillRect(24,24,515,83);ctx.textAlign='left';ctx.font='bold 23px "Microsoft YaHei",sans-serif';ctx.fillStyle='#f2dfb2';ctx.fillText('铜沙指挥部',43,58);ctx.font='16px sans-serif';ctx.fillStyle='#bee7dc';ctx.fillText('资金 '+s.gold+'   编队 '+alive().length+'/8   信标 '+s.captures+'/3',43,88);
  ctx.fillStyle='#102432dd';ctx.fillRect(mini.x-5,mini.y-5,mini.w+10,mini.h+10);ctx.save();ctx.translate(mini.x,mini.y);ctx.drawImage(terrain.scene,0,0,mini.w,mini.h);const mx=mini.w/world.width,my=mini.h/world.height;for(const b of s.beacons){ctx.fillStyle=b.captured?'#90fbdc':'#fc9475';ctx.fillRect(b.x*mx-3,b.y*my-3,6,6)}for(const u of alive()){ctx.fillStyle='#9dfce5';ctx.fillRect(u.x*mx-2,u.y*my-2,4,4)}ctx.strokeStyle='#fff3ce';ctx.lineWidth=1.2;ctx.strokeRect(s.camera.x*mx,s.camera.y*my,W*mx,H*my);ctx.restore();
  label(ctx,'框选 / 点击单位 · 点地面调度 · WASD 移动地图 · 空格全选',560,603,'#e2e8d8',16);
  if(drag){const x=Math.min(drag.start.x,drag.end.x),y=Math.min(drag.start.y,drag.end.y),w=Math.abs(drag.end.x-drag.start.x),h=Math.abs(drag.end.y-drag.start.y);ctx.fillStyle='#8feacb22';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#a3ffe1';ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,h)}
  if(s.won||s.down){ctx.fillStyle='rgba(9,24,35,.90)';ctx.fillRect(307,218,506,216);label(ctx,s.won?'三座信标已接通':'编队任务中断',560,281,s.won?'#97f5d7':'#ffb69b',30);label(ctx,'命中 '+s.hits+' · 击退 '+s.kills+' · '+s.score+' 分',560,339,'#f9e4b3',20);label(ctx,'下方可以重新执行',560,397,'#c9dbe0',17)}
 }
 return {tick,draw,setActive(v){active=v;if(!v)drag=null},getState:()=>({...structuredClone(s),world,base}),getStatus:()=>({goal:s.won?'即时战略任务完成':s.down?'重新整编执行任务':'调度多个单位，击退守军并占领三座信标',message:'拖出矩形框选编队，点击地面移动、点击红色守军进攻。拆除哨塔并靠近信标可接通。矿线每 4 秒送回 12 资金。',stats:['选中 '+selected().length,'资金 '+s.gold,'信标 '+s.captures+'/3','命中 '+s.hits,'击退 '+s.kills],actions:s.won||s.down?[action('重新执行任务',replay)]:[action('全选编队',all),action('招募侦察车 · 75',()=>recruit('rover'),s.gold<75||alive().length>=8),action('招募飞行器 · 75',()=>recruit('drone'),s.gold<75||alive().length>=8),action('回到营地',()=>center(base.x+180,base.y))]}),dispose(){active=false;controller.abort();shots=[];particles=[]}};
}
