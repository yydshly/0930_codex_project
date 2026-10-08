import {W,H,clamp,images,canvasSurface,cover,sprite,shadow,glow,label,action,safeSaved} from './showcase-core.js';

export const TACTICS_BLOCKS=[[3,2],[3,3],[4,4],[2,4]];
export const TACTICS_PROJECT=(c,r)=>({x:560+(c-r)*45,y:155+(c+r)*24});
export async function createTactics({host,input,saved,notify,sfx}){
 const [scene,art]=await Promise.all([images(['scene'],'assets/game-forms/tactics/'),images(['guard','scout','medic','raider','walker','ore'],'assets/game-forms/strategy/')]),{ctx}=canvasSurface(host);
 const unit=(id,side,kind,name,c,r,hp,damage,range,move)=>({id,side,kind,name,c,r,hp,maxHp:hp,damage,range,move,moved:false,acted:false,guard:false});
 const initialUnits=[unit(1,'ally','guard','青卫',1,5,44,16,1,3),unit(2,'ally','scout','弥弓',1,6,34,13,3,4),unit(3,'ally','medic','灯医',0,6,36,9,2,3),unit(10,'enemy','raider','红刃',5,1,26,7,1,2),unit(11,'enemy','raider','赤哨',6,3,26,7,1,2),unit(12,'enemy','raider','游骑',4,5,26,7,1,2),unit(13,'enemy','walker','重甲',6,6,40,8,3,2)];
 const defaults={units:initialUnits,selected:1,round:1,phase:'player',mode:'attack',showThreat:true,enemyIndex:0,aiTimer:.6,pendingHit:null,score:0,hits:0,heals:0,moves:0,kills:0,won:false,checkpoint:null,log:['选择队员，点击蓝格移动；点击橙色范围内的敌人攻击。']};
 let s=safeSaved(saved,defaults),anim=null,fx=null,time=0;
 const list=side=>s.units.filter(u=>u.hp>0&&(!side||u.side===side)),current=()=>s.units.find(u=>u.id===s.selected&&u.hp>0),key=(c,r)=>c+','+r,inside=(c,r)=>c>=0&&c<8&&r>=0&&r<8,blocked=(c,r)=>TACTICS_BLOCKS.some(p=>p[0]===c&&p[1]===r),md=(a,b)=>Math.abs(a.c-b.c)+Math.abs(a.r-b.r);
 function clearLine(a,b){const steps=Math.max(Math.abs(a.c-b.c),Math.abs(a.r-b.r));for(let i=1;i<steps;i++)if(blocked(Math.round(a.c+(b.c-a.c)*i/steps),Math.round(a.r+(b.r-a.r)*i/steps)))return false;return true}
 function reachable(u){
  const map=new Map([[key(u.c,u.r),{c:u.c,r:u.r,cost:0,path:[]}]]),queue=[map.get(key(u.c,u.r))];
  for(let i=0;i<queue.length;i++){const a=queue[i];if(a.cost>=u.move)continue;for(const [dc,dr]of [[1,0],[-1,0],[0,1],[0,-1]]){const c=a.c+dc,r=a.r+dr,k=key(c,r);if(!inside(c,r)||blocked(c,r)||map.has(k)||list().some(v=>v!==u&&v.c===c&&v.r===r))continue;const n={c,r,cost:a.cost+1,path:[...a.path,{c,r}]};map.set(k,n);queue.push(n)}}return map;
 }
 function addLog(text){s.log.push(text);s.log=s.log.slice(-10)}
 function checkpoint(){return {units:structuredClone(s.units),selected:s.selected,round:s.round,score:s.score,hits:s.hits,heals:s.heals,moves:s.moves,kills:s.kills,log:[...s.log]}}
 if(!s.checkpoint)s.checkpoint=checkpoint();
 function outcome(){if(!list('enemy').length){s.won=true;s.phase='won';s.score+=list('ally').length*300;addLog('所有敌方单位已击退。');notify('战棋短篇完成：走格、行动范围、队员分工和敌方回合共同推进了战斗。');sfx('success')}else if(!list('ally').length){s.phase='down';addLog('小队失去战斗力，可返回本回合。')}}
 function walk(u,path){if(!path.length)return;const from={c:u.c,r:u.r};u.c=path.at(-1).c;u.r=path.at(-1).r;anim={id:u.id,path:[from,...path],t:0,duration:path.length*.12};sfx('step')}
 function moveTo(u,c,r){if(s.phase!=='player'||anim||u.moved)return;const choice=reachable(u).get(key(c,r));if(!choice||choice.cost===0){notify('这个格子不可达，蓝格表示本次可走到的位置。');return}walk(u,choice.path);u.moved=true;s.moves++;addLog(u.name+'移动 '+choice.cost+' 格。')}
 function hit(a,b){const damage=Math.max(1,Math.round(a.damage*(b.guard?.48:1)));b.hp=Math.max(0,b.hp-damage);fx={from:{c:a.c,r:a.r},to:{c:b.c,r:b.r},color:a.side==='ally'?'#ffe0a2':'#ff8e80',text:'−'+damage,t:.5};s.hits++;addLog(a.name+'攻击'+b.name+'，造成 '+damage+' 伤害。');sfx('slash');if(b.hp===0){s.kills++;s.score+=b.side==='enemy'?150:0;addLog(b.name+'退场。')}outcome()}
 function attack(a,b){if(s.phase!=='player'||anim||a.acted||a.side===b.side||b.hp<=0)return;if(md(a,b)>a.range||!clearLine(a,b)){notify('敌人超出攻击范围，或射线被晶石遮挡。');return}a.acted=true;hit(a,b)}
 function heal(a,b){if(s.phase!=='player'||anim||a.kind!=='medic'||a.acted||b.side!=='ally'||md(a,b)>2)return;if(b.hp===b.maxHp){notify('这名队员生命已满。');return}const amount=Math.min(12,b.maxHp-b.hp);b.hp+=amount;a.acted=true;s.heals++;fx={from:{c:a.c,r:a.r},to:{c:b.c,r:b.r},color:'#8bf1d0',text:'+'+amount,t:.7};addLog(a.name+'治疗'+b.name+' '+amount+' 点。');sfx('water')}
 function guard(){const u=current();if(!u||u.acted||anim||s.phase!=='player')return;u.guard=true;u.acted=true;addLog(u.name+'防守至下个己方回合，受伤减半。');sfx('stamp')}
 function plan(e){
  const allies=list('ally'),reach=[...reachable(e).values()];let best=null;
  for(const target of allies)for(const p of reach){const can=md(p,target)<=e.range&&clearLine(p,target),value=(can?0:100)+md(p,target)*4+p.cost*.3+target.hp*.015;if(!best||value<best.value)best={target:target.id,to:p,can,value}}
  return best;
 }
 function endTurn(){if(s.phase!=='player'||anim)return;s.phase='enemy';s.enemyIndex=0;s.aiTimer=.5;fx=null;addLog('敌方回合开始。');sfx('turn')}
 function retry(){const cp=structuredClone(s.checkpoint);s={...structuredClone(defaults),...cp,checkpoint:cp};anim=null;fx=null;notify('已回到本回合开始，可以改变移动和行动顺序。')}
 function replay(){s=structuredClone(defaults);s.checkpoint=checkpoint();anim=null;fx=null;notify('新的棋盘交战开始。')}
 function select(id){if(s.phase!=='player'||anim)return;const u=s.units.find(u=>u.id===id&&u.side==='ally'&&u.hp>0);if(u){s.selected=id;s.mode='attack';sfx('cards')}}
 function cell(point){const dx=(point.x-560)/45,dy=(point.y-155)/24;return {c:Math.round((dx+dy)/2),r:Math.round((dy-dx)/2)}}
 function tap(point){if(s.phase!=='player'||anim)return;const c=cell(point);if(!inside(c.c,c.r))return;const hitUnit=list().find(u=>u.c===c.c&&u.r===c.r),u=current();if(hitUnit?.side==='ally'){if(u?.kind==='medic'&&s.mode==='heal')heal(u,hitUnit);else select(hitUnit.id)}else if(hitUnit&&u)attack(u,hitUnit);else if(u)moveTo(u,c.c,c.r)}
 function tick(dt){
  time+=dt;if(fx){fx.t-=dt;if(fx.t<=0)fx=null}if(anim){anim.t+=dt;if(anim.t>=anim.duration)anim=null;else return}
  if(s.pendingHit){const a=s.units.find(u=>u.id===s.pendingHit.a),b=s.units.find(u=>u.id===s.pendingHit.b);s.pendingHit=null;if(a?.hp>0&&b?.hp>0)hit(a,b);s.aiTimer=.55;return}
  if(s.phase==='player'){
   if(input.pressed.has('KeyE')||input.pressed.has('Space'))endTurn();if(input.pressed.has('KeyC'))guard();if(input.pressed.has('KeyR')){const u=current();if(u?.kind==='medic')s.mode=s.mode==='heal'?'attack':'heal'}
   const u=current();if(u){for(const [code,dc,dr]of [['ArrowUp',0,-1],['ArrowDown',0,1],['ArrowLeft',-1,0],['ArrowRight',1,0]])if(input.pressed.has(code))moveTo(u,u.c+dc,u.r+dr)}for(const point of input.pointers)tap(point);
  }else if(s.phase==='enemy'){
   s.aiTimer-=dt;if(s.aiTimer>0)return;const enemies=s.units.filter(u=>u.side==='enemy');
   if(s.enemyIndex>=enemies.length){s.phase='player';s.round++;for(const u of list('ally')){u.moved=false;u.acted=false;u.guard=false}s.selected=list('ally')[0]?.id||1;s.mode='attack';s.checkpoint=checkpoint();addLog('第 '+s.round+' 回合开始。');sfx('turn');return}
   const e=enemies[s.enemyIndex++];if(e&&e.hp>0){const p=plan(e);if(p){walk(e,p.to.path);const target=s.units.find(u=>u.id===p.target);if(target&&target.hp>0&&md(e,target)<=e.range&&clearLine(e,target)){if(anim)s.pendingHit={a:e.id,b:target.id};else hit(e,target)}}s.aiTimer=.7}
  }
 }
 function diamond(c,r,fill,stroke='#d9bd8769'){const p=TACTICS_PROJECT(c,r);ctx.beginPath();ctx.moveTo(p.x,p.y-24);ctx.lineTo(p.x+45,p.y);ctx.lineTo(p.x,p.y+24);ctx.lineTo(p.x-45,p.y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}
 function drawnPosition(u){if(anim?.id!==u.id)return TACTICS_PROJECT(u.c,u.r);const t=clamp(anim.t/anim.duration,0,.999)*(anim.path.length-1),i=Math.floor(t),f=t-i,a=anim.path[i],b=anim.path[i+1];return TACTICS_PROJECT(a.c+(b.c-a.c)*f,a.r+(b.r-a.r)*f)}
 function draw(){
  cover(ctx,scene.scene);const u=current(),reach=u&&!u.moved&&s.phase==='player'?reachable(u):new Map();
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const range=u&&!u.acted&&s.phase==='player'&&md(u,{c,r})<=u.range&&clearLine(u,{c,r}),fill=blocked(c,r)?'#28484766':reach.has(key(c,r))?'#65c5c546':range?'#e7a45c25':'#624d3015';diamond(c,r,fill);if(reach.has(key(c,r)))diamond(c,r,'#7bd1d414','#6bcad8aa')}
  for(const [c,r]of TACTICS_BLOCKS){const p=TACTICS_PROJECT(c,r);shadow(ctx,p.x,p.y,23);sprite(ctx,art.ore,p.x,p.y+7,53)}
  if(s.showThreat&&s.phase==='player')for(const e of list('enemy')){const p=plan(e);if(!p)continue;const from=TACTICS_PROJECT(e.c,e.r),to=TACTICS_PROJECT(p.to.c,p.to.r),target=s.units.find(u=>u.id===p.target),tp=TACTICS_PROJECT(target.c,target.r);ctx.strokeStyle=p.can?'#cf6e4cb8':'#bc775e80';ctx.lineWidth=1.7;ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);if(p.can)ctx.lineTo(tp.x,tp.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#c2775866';ctx.beginPath();ctx.arc(to.x,to.y,6,0,Math.PI*2);ctx.fill()}
  const actors=list().map(a=>({u:a,p:drawnPosition(a)})).sort((a,b)=>a.p.y-b.p.y);
  for(const {u:a,p}of actors){shadow(ctx,p.x,p.y,22);if(a.id===s.selected&&s.phase==='player'){ctx.strokeStyle='#72cace';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(p.x,p.y+2,29,13,0,0,Math.PI*2);ctx.stroke()}if(a.guard)glow(ctx,p.x,p.y-35,50,'#83e6cf60');sprite(ctx,art[a.kind],p.x,p.y+8,a.kind==='walker'?67:79,a.side==='enemy');ctx.fillStyle='#223539';ctx.fillRect(p.x-22,p.y-79,44,4);ctx.fillStyle=a.side==='ally'?'#7edecd':'#e9a386';ctx.fillRect(p.x-22,p.y-79,44*a.hp/a.maxHp,4);if(a.side==='ally'){ctx.fillStyle=a.acted?'#695e52':'#ffe0a5';ctx.beginPath();ctx.arc(p.x-5,p.y+19,3,0,Math.PI*2);ctx.fill();ctx.fillStyle=a.moved?'#695e52':'#8af5dd';ctx.beginPath();ctx.arc(p.x+5,p.y+19,3,0,Math.PI*2);ctx.fill()}}
  if(fx){const a=TACTICS_PROJECT(fx.from.c,fx.from.r),b=TACTICS_PROJECT(fx.to.c,fx.to.r);ctx.strokeStyle=fx.color;ctx.lineWidth=3;ctx.globalAlpha=Math.min(1,fx.t*3);ctx.beginPath();ctx.moveTo(a.x,a.y-35);ctx.lineTo(b.x,b.y-35);ctx.stroke();glow(ctx,b.x,b.y-40,42,fx.color+'70');label(ctx,fx.text,b.x,b.y-94,fx.color,20);ctx.globalAlpha=1}
  ctx.fillStyle='rgba(19,30,38,.88)';ctx.fillRect(24,24,448,81);ctx.textAlign='left';ctx.fillStyle='#f8dfab';ctx.font='bold 23px "Microsoft YaHei",sans-serif';ctx.fillText('星台棋阵',44,58);ctx.fillStyle='#d7e4d7';ctx.font='16px sans-serif';ctx.fillText('第 '+s.round+' 回合 · '+(s.phase==='enemy'?'敌方行动':s.phase==='player'?'己方行动':'交战结束')+' · 敌方 '+list('enemy').length+'/4',44,88);
  if(u){ctx.fillStyle='#203339d9';ctx.fillRect(18,340,165,185);sprite(ctx,art[u.kind],99,425,70);label(ctx,u.name+' '+u.hp+'/'+u.maxHp,99,454,'#f8e2b8',16);label(ctx,'移动 '+(u.moved?'已用':'可用'),99,483,'#a6e7d5',14);label(ctx,(s.mode==='heal'?'治疗':u.acted?'行动已用':'攻击可用')+' · 射程 '+u.range,99,512,'#e2dfc0',13)}
  label(ctx,'蓝格移动 · 橙色范围攻击 · 虚线预览敌方行动',730,69,'#ede0b6',15);
  label(ctx,s.log.at(-1)||'',560,594,'#e6e1c7',16);
  if(s.won||s.phase==='down'){ctx.fillStyle='rgba(14,29,36,.94)';ctx.fillRect(314,212,492,226);label(ctx,s.won?'星台交战完成':'小队失利',560,273,s.won?'#a1ead4':'#ffb095',30);label(ctx,s.round+' 回合 · 命中 '+s.hits+' · 治疗 '+s.heals,560,331,'#f5dfb0',21);label(ctx,s.won?'可以再次排阵，改变行动顺序':'返回本回合，重新选择站位与行动',560,392,'#d1e1dc',17)}
 }
 return {tick,draw,getState:()=>({...structuredClone(s),blocks:TACTICS_BLOCKS,project:{x:560,y:155,dx:45,dy:24},reachable:current()&&!current().moved?[...reachable(current()).values()]:[],animating:!!anim}),getStatus:()=>{const u=current();return {goal:s.won?'战棋交战完成':s.phase==='down'?'返回本回合重新排阵':s.phase==='enemy'?'观察敌方的移动与攻击':'轮流操作三名队员，击退四名对手',message:'每名队员每回合各有一次移动和一次行动，先后顺序自由。青卫近战、弥弓远射、灯医可治疗。晶石阻挡通行和射线；虚线按当前位置预览敌方行动。',stats:['回合 '+s.round,'己方 '+list('ally').length+'/3','敌方 '+list('enemy').length+'/4','治疗 '+s.heals,'得分 '+s.score],actions:s.won?[action('再次排阵',replay)]:s.phase==='down'?[action('返回本回合',retry),action('重新交战',replay)]:s.phase==='enemy'?[action('敌方行动中',()=>{},true)]:[...list('ally').map(a=>action(a.name+(s.selected===a.id?' ✓':''),()=>select(a.id),!!anim)),...(u?.kind==='medic'?[action(s.mode==='heal'?'切换攻击':'治疗队员 · R',()=>{s.mode=s.mode==='heal'?'attack':'heal'},u.acted||!!anim)]:[]),action('本回合防守 · C',guard,!u||u.acted||!!anim),action('敌方预览 '+(s.showThreat?'✓':'关'),()=>{s.showThreat=!s.showThreat}),action('结束回合 · E',endTurn,!!anim)]}},dispose(){anim=null;fx=null}};
}
