import {W,H,clamp,images,canvasSurface,cover,sprite,shadow,glow,label,vignette,action,safeSaved} from './showcase-core.js';

const defaults = {x:560,y:465,hp:100,maxHp:100,wave:0,kills:0,damage:28,attackRate:.38,dashRate:1.05,phase:'ready',upgrades:[],enemies:[],won:false};
const specs = [[0,0,1,2],[0,1,2,0,1],[1,2,3]];
const maximum = type => type===3?240:type===1?85:55;

export async function createCombat({host,input,saved,notify,sfx}) {
  const {element,ctx}=canvasSurface(host);
  const art=await images(['arena',...Array.from({length:4},(_,i)=>'fighter-'+i),...Array.from({length:4},(_,i)=>'enemy-'+i)]);
  const s=safeSaved(saved,defaults);
  let time=0,attack=0,dash=0,dashCD=0,hurt=0,walk=0,angle=0,impact=0;
  let heading={x:1,y:0},dashVector=heading,particles=[],shots=[],numbers=[],trails=[],shake=0;

  function start() {
    if(!['ready','upgrade'].includes(s.phase)||s.wave>=3)return;
    s.enemies=specs[s.wave].map((type,i)=>({id:i,type,x:245+(i*160)%650,y:295+i%2*55,hp:maximum(type),guard:type===1?2:0,stagger:0,mode:'move',clock:1+i*.17}));
    s.phase='fight';
    notify(s.wave===2?'统领登场。它的第二阶段会扩大攻击范围，看到红圈就向外闪避。':'第 '+(s.wave+1)+' 波：盾卫需要破盾，施法者会锁定你刚才的位置。');
  }
  function choose(i) {
    if(s.phase!=='upgrade')return;
    if(i===0)s.damage+=12;
    if(i===1)s.attackRate=Math.max(.18,s.attackRate*.76);
    if(i===2){s.maxHp+=15;s.hp=Math.min(s.maxHp,s.hp+35)}
    s.upgrades.push(['锋刃','疾风','余烬'][i]);start();
  }
  function retry() {
    Object.assign(s,structuredClone(defaults));
    attack=dash=dashCD=hurt=impact=0;shots=[];particles=[];numbers=[];trails=[];start();
  }
  function dodge() {
    if(s.phase!=='fight'||dashCD>0)return;
    const n=Math.hypot(input.x,input.y);
    dashVector=n?{x:input.x/n,y:input.y/n}:{...heading};
    dash=.2;dashCD=s.dashRate;sfx('dash');
  }
  function hit() {
    if(s.phase!=='fight'||attack>0||dash>0)return;
    const click=input.pointers.at(-1);
    if(click)angle=Math.atan2(click.y-s.y,click.x-s.x);
    else {
      const near=s.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0];
      if(near)angle=Math.atan2(near.y-s.y,near.x-s.x);
    }
    attack=s.attackRate;sfx('slash');
    for(const e of s.enemies) {
      const d=Math.hypot(e.x-s.x,e.y-s.y),ea=Math.atan2(e.y-s.y,e.x-s.x);
      const diff=Math.atan2(Math.sin(ea-angle),Math.cos(ea-angle));
      if(e.hp<=0||d>=148||Math.abs(diff)>=1.35)continue;
      let damage=s.damage,word=String(damage);
      if(e.type===1&&e.guard>0) {
        e.guard--;damage=Math.round(damage*.4);word=e.guard?'格挡 '+damage:'破盾';
        if(!e.guard){e.stagger=.8;e.mode='move';e.clock=1.2;sfx('break')}
      }
      e.hp-=damage;e.hit=.18;
      e.x=clamp(e.x+Math.cos(angle)*18,220,930);e.y=clamp(e.y+Math.sin(angle)*12,285,552);
      numbers.push({x:e.x,y:e.y-(e.type===3?155:115),text:word,t:.75,color:e.guard?'#a3dbea':'#ffe2ae'});
      for(let j=0;j<9;j++)particles.push({x:e.x,y:e.y-35,vx:(Math.random()-.5)*180,vy:-Math.random()*100,t:.4});
      impact=.045;shake=3;
      if(e.hp<=0){s.kills++;e.fade=.5;sfx('pickup')}
    }
  }
  function damage(n) {
    if(dash>0||hurt>0)return;
    s.hp=Math.max(0,s.hp-n);hurt=.65;shake=7;sfx('hurt');
    numbers.push({x:s.x,y:s.y-145,text:'−'+n,t:.75,color:'#ff9587'});
    if(!s.hp){s.phase='lost';notify('先清理施法者；盾卫破盾后再进攻，统领红圈亮起时向外闪避。')}
  }
  if(s.phase==='fight'&&!s.enemies.length)s.phase='ready';

  function tick(dt) {
    time+=dt;attack=Math.max(0,attack-dt);dashCD=Math.max(0,dashCD-dt);hurt=Math.max(0,hurt-dt);shake=Math.max(0,shake-dt*25);
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.t-=dt}
    for(const p of numbers){p.y-=28*dt;p.t-=dt}
    for(const p of trails)p.t-=dt;
    particles=particles.filter(p=>p.t>0);numbers=numbers.filter(p=>p.t>0);trails=trails.filter(p=>p.t>0);
    for(const e of s.enemies){e.hit=Math.max(0,(e.hit||0)-dt);e.fade=Math.max(0,(e.fade||0)-dt)}
    if(s.phase!=='fight')return;
    if(input.pressed.has('Space'))dodge();
    if(impact>0){impact-=dt;return}
    const norm=Math.hypot(input.x,input.y)||1;
    const dx=input.x/norm,dy=input.y/norm;
    if(dx||dy){heading={x:dx,y:dy};if(!attack)angle=Math.atan2(dy,dx);walk+=dt}
    if(dash>0){dash=Math.max(0,dash-dt);trails.push({x:s.x,y:s.y,t:.18,flip:Math.cos(angle)<0})}
    s.x=clamp(s.x+(dash>0?dashVector.x*720:dx*235)*dt,205,935);
    s.y=clamp(s.y+(dash>0?dashVector.y*520:dy*185)*dt,285,555);
    if(input.keys.has('KeyJ')||input.pointers.length)hit();

    for(const e of s.enemies.filter(e=>e.hp>0)) {
      if(e.stagger>0){e.stagger-=dt;continue}
      const dist=Math.hypot(e.x-s.x,e.y-s.y),a=Math.atan2(s.y-e.y,s.x-e.x);
      e.clock-=dt;
      if(e.mode==='move') {
        if(e.type===2){if(dist<210){e.x-=Math.cos(a)*45*dt;e.y-=Math.sin(a)*32*dt}}
        else if(dist>95){e.x+=Math.cos(a)*(e.type===3?72:92)*dt;e.y+=Math.sin(a)*65*dt}
        if(e.clock<=0&&(dist<145||e.type===2)){e.mode='warn';e.clock=e.type===3?1.1:.8;e.targetX=s.x;e.targetY=s.y}
      } else if(e.clock<=0) {
        if(e.type===2) {
          const aim=Math.atan2(e.targetY-e.y,e.targetX-e.x);
          shots.push({x:e.x,y:e.y-30,vx:Math.cos(aim)*300,vy:Math.sin(aim)*300,t:3});
        } else if(dist<(e.type===3?(e.hp<120?190:175):125))damage(e.type===3?22:13);
        e.mode='move';e.clock=e.type===3?(e.hp<120?1.25:1.9):1.4;
      }
      e.x=clamp(e.x,205,935);e.y=clamp(e.y,285,555);
    }
    for(const p of shots){p.x+=p.vx*dt;p.y+=p.vy*dt;p.t-=dt;if(Math.hypot(p.x-s.x,p.y-(s.y-30))<25){damage(10);p.t=0}}
    shots=shots.filter(p=>p.t>0);
    if(s.enemies.every(e=>e.hp<=0)) {
      s.wave++;shots=[];s.hp=Math.min(s.maxHp,s.hp+14);
      if(s.wave>=3){s.phase='won';s.won=true;sfx('success');notify('三波守卫全部击败。你带着这一路学会的反击，走出了熔炉。')}
      else{s.phase='upgrade';notify('这一波结束，恢复了 14 点生命。选择下一波的能力。');sfx('success')}
    }
  }
  function draw() {
    ctx.save();ctx.translate(Math.sin(time*73)*shake,Math.cos(time*61)*shake*.6);cover(ctx,art.arena);
    for(const e of s.enemies.filter(e=>e.hp>0&&e.mode==='warn')) {
      if(e.type===2){ctx.save();ctx.setLineDash([10,8]);ctx.strokeStyle='#a8edf0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(e.x,e.y-30);ctx.lineTo(e.targetX,e.targetY-30);ctx.stroke();ctx.restore();continue}
      const radius=e.type===3?(e.hp<120?190:175):125;
      ctx.fillStyle=e.type===3?'rgba(237,85,48,.25)':'rgba(221,100,58,.18)';ctx.beginPath();ctx.ellipse(e.x,e.y,radius,radius*.54,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e1a174';ctx.lineWidth=2;ctx.stroke();
      ctx.strokeStyle='#ffdf9a';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(e.x,e.y,radius,radius*.54,0,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-e.clock/(e.type===3?1.1:.8)));ctx.stroke();
    }
    for(const p of trails)sprite(ctx,art['fighter-1'],p.x,p.y,125,p.flip,p.t*.8);
    const sorted=[...s.enemies.filter(e=>e.hp>0||e.fade>0).map(e=>({...e,enemy:true})),{x:s.x,y:s.y,enemy:false}].sort((a,b)=>a.y-b.y);
    for(const e of sorted) {
      shadow(ctx,e.x,e.y,e.enemy&&e.type===3?40:24);
      if(e.enemy) {
        const height=e.type===3?158:104;
        sprite(ctx,art['enemy-'+e.type],e.x,e.y,height,e.x>s.x,e.hp<=0?e.fade*1.4:e.hit>0?.55:1);
        if(e.hp>0){ctx.fillStyle='#171b20';ctx.fillRect(e.x-25,e.y-height-12,50,5);ctx.fillStyle=e.type===3?'#e8aa7a':'#b4dbd7';ctx.fillRect(e.x-25,e.y-height-12,50*clamp(e.hp/maximum(e.type),0,1),5)}
        if(e.guard>0)label(ctx,'盾 '+e.guard,e.x,e.y-height-25,'#a6dae4',12);
        if(e.stagger>0)label(ctx,'破盾 · 硬直',e.x,e.y-height-25,'#ffd99a',12);
      } else {
        const f=attack>s.attackRate-.19?3:(input.x||input.y)?1+Math.floor(walk*8)%2:0;
        sprite(ctx,art['fighter-'+f],s.x,s.y,125,Math.cos(angle)<0,hurt>0?.6:1);
        if(dash>0)glow(ctx,s.x,s.y-40,85,'#b9eeee44');
      }
    }
    if(attack>s.attackRate-.18){ctx.save();ctx.translate(s.x,s.y-30);ctx.scale(1,.6);ctx.strokeStyle='#ffe2ab';ctx.lineWidth=6;ctx.shadowColor='#ffbf57';ctx.shadowBlur=24;ctx.beginPath();ctx.arc(0,0,118,angle-.95,angle+.95);ctx.stroke();ctx.restore()}
    for(const p of particles){ctx.fillStyle='#f8cb88';ctx.globalAlpha=p.t/.4;ctx.fillRect(p.x,p.y,3,3)}ctx.globalAlpha=1;
    for(const p of shots)glow(ctx,p.x,p.y,17,'#88ecefc9');
    for(const p of numbers)label(ctx,p.text,p.x,p.y,p.color,20);
    vignette(ctx);ctx.restore();
    ctx.fillStyle='rgba(8,15,20,.8)';ctx.fillRect(28,26,310,76);
    ctx.fillStyle='#e5dbc6';ctx.font='15px Microsoft YaHei';ctx.fillText('生命 '+Math.ceil(s.hp)+' / '+s.maxHp,44,50);
    ctx.fillStyle='#39232a';ctx.fillRect(44,61,180,8);ctx.fillStyle='#cb7770';ctx.fillRect(44,61,180*s.hp/s.maxHp,8);
    ctx.fillStyle='#263c40';ctx.fillRect(44,81,180,4);ctx.fillStyle='#a2e5de';ctx.fillRect(44,81,180*(1-dashCD/s.dashRate),4);
    ctx.fillStyle='#adc9c6';ctx.fillText(dashCD>0?'闪避恢复中':'空格 · 闪避就绪',235,82);
    label(ctx,'熔炉 '+Math.min(3,s.wave+1)+'/3 · 击败 '+s.kills,960,53,'#e9d0a8',16);
    const boss=s.enemies.find(e=>e.type===3&&e.hp>0);
    if(boss){label(ctx,boss.hp<120?'熔炉统领 · 狂燃阶段':'熔炉统领',W/2,78,'#f0b87c',20);ctx.fillStyle='#342329';ctx.fillRect(365,92,390,7);ctx.fillStyle='#da9a69';ctx.fillRect(365,92,390*boss.hp/240,7)}
    if(s.phase==='ready')label(ctx,'按下「进入熔炉」开始挑战',W/2,235,'#f2d5a4',24);
    if(s.phase==='upgrade')label(ctx,'余烬仍温热。选择下一波的能力',W/2,225,'#f2d5a4',24);
    if(s.phase==='won'||s.phase==='lost')label(ctx,s.won?'熔炉之外，风又吹了起来':'灰烬记住了这一场',W/2,210,'#eed2a0',28);
  }
  return {element,getState:()=>s,getStatus:()=>({
    goal:s.won?'三波挑战完成':s.phase==='upgrade'?'选择一种能力，然后进入下一波':'击败三波守卫，走出熔炉',
    message:s.phase==='fight'?'J 连续攻击 · 空格朝移动方向闪避；站定时沿最后移动方向闪避。盾卫先破盾，青色瞄线表示锁定的位置。':s.phase==='lost'?'本次挑战结束。带着刚才的经验，再试一场。':s.won?'三波守卫倒下，火焰安静了。你已击败全部 12 名守卫。':'每波结束会恢复生命，并让你选择一种能力。',
    stats:['生命 '+Math.ceil(s.hp)+' / '+s.maxHp,'波次 '+Math.min(3,s.wave+1)+' / 3','击败 '+s.kills,'能力 '+(s.upgrades.join('、')||'基础剑术')],
    actions:s.phase==='ready'?[action('进入熔炉',start)]:s.phase==='upgrade'?[action('锋刃 · 攻击 +12',()=>choose(0)),action('疾风 · 更快攻击',()=>choose(1)),action('余烬 · 恢复与生命上限',()=>choose(2))]:s.phase==='fight'?[action('攻击 J',hit),action('闪避',dodge)]:[action('再挑战一场',retry)]
  }),tick,draw,dispose(){element.remove()}};
}
