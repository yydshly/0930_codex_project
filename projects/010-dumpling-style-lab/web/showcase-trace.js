import {W,H,clamp,images,canvasSurface,glow} from './showcase-core.js';
import {pointerPosition} from './showcase-precision-kit.js';
import {sceneHeading,completion} from './showcase-observation-kit.js?v=20261004-2';
import {gesturePanel} from './showcase-gesture-kit.js?v=20261004-3';

export const TRACE_BOARD={cols:30,rows:16,size:25,x:185,y:78,goal:68};
const B=TRACE_BOARD,dirs=[[0,-1],[1,0],[0,1],[-1,0]],index=(x,y)=>y*B.cols+x;
export const tracePercent=s=>s.cells.reduce((a,v,i)=>a+(i%B.cols>0&&i%B.cols<B.cols-1&&Math.floor(i/B.cols)>0&&Math.floor(i/B.cols)<B.rows-1&&v===1?1:0),0)/((B.cols-2)*(B.rows-2))*100;
export function traceFresh(){return {version:1,cells:Array.from({length:B.cols*B.rows},(_,i)=>i%B.cols===0||i%B.cols===B.cols-1||i<B.cols||i>=B.cols*(B.rows-1)?1:0),player:{x:0,y:8},origin:{x:0,y:8},trail:[],enemy:{x:22,y:4,vx:-1.5,vy:.55},armed:false,lives:3,elapsed:0,captures:0,speed:'calm',phase:'play',won:false}}
export function traceRestore(raw){const s=traceFresh();if(raw?.version!==1)return s;
 if(Array.isArray(raw.cells)&&raw.cells.length===s.cells.length&&raw.cells.every(v=>v===0||v===1))s.cells=raw.cells.map((v,i)=>s.cells[i]===1?1:v);
 const valid=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.y>=0&&p.x<B.cols&&p.y<B.rows;
 if(valid(raw.player))s.player={...raw.player};if(valid(raw.origin)&&s.cells[index(raw.origin.x,raw.origin.y)])s.origin={...raw.origin};
 if(Array.isArray(raw.trail)&&raw.trail.length<=s.cells.length&&raw.trail.every((i,n,a)=>Number.isInteger(i)&&i>=0&&i<s.cells.length&&!s.cells[i]&&a.indexOf(i)===n&&(!n||Math.abs(i%B.cols-a[n-1]%B.cols)+Math.abs(Math.floor(i/B.cols)-Math.floor(a[n-1]/B.cols))===1)))s.trail=[...raw.trail];
 if(!s.cells[index(s.player.x,s.player.y)]&&s.trail.at(-1)!==index(s.player.x,s.player.y)){s.player={...s.origin};s.trail=[]}
 if(raw.enemy&&['x','y','vx','vy'].every(k=>Number.isFinite(raw.enemy[k]))){const e=raw.enemy,x=clamp(e.x,1,B.cols-2),y=clamp(e.y,1,B.rows-2);if(!s.cells[index(Math.round(x),Math.round(y))])s.enemy={x,y,vx:clamp(e.vx,-4,4)||-1.5,vy:clamp(e.vy,-4,4)||.55}}
 if(s.cells[index(Math.round(s.enemy.x),Math.round(s.enemy.y))]){const i=s.cells.findIndex(v=>!v);if(i>=0)s.enemy={x:i%B.cols,y:Math.floor(i/B.cols),vx:1.3,vy:.65}}
 s.armed=raw.armed===true||s.trail.length>0;s.lives=Number.isInteger(raw.lives)?clamp(raw.lives,0,3):3;s.elapsed=Number.isFinite(raw.elapsed)?clamp(raw.elapsed,0,86400):0;s.captures=Number.isInteger(raw.captures)?clamp(raw.captures,0,9999):0;s.speed=raw.speed==='standard'?'standard':'calm';s.won=tracePercent(s)>=B.goal;s.phase=s.won?'won':s.lives?'play':'lost';return s;
}
export function traceClose(s){if(!s.trail.length)return 0;if(s.trail.some(i=>Math.hypot(i%B.cols-s.enemy.x,Math.floor(i/B.cols)-s.enemy.y)<.78)){traceHit(s);return -1}const before=tracePercent(s);for(const i of s.trail)s.cells[i]=1;
 const open=s.cells.findIndex(v=>!v),seed=index(clamp(Math.round(s.enemy.x),1,B.cols-2),clamp(Math.round(s.enemy.y),1,B.rows-2));
 const seen=new Set(),queue=[];if(!s.cells[seed]){seen.add(seed);queue.push(seed)}else if(open>=0){seen.add(open);queue.push(open)}
 for(let n=0;n<queue.length;n++){const i=queue[n],x=i%B.cols,y=Math.floor(i/B.cols);for(const [dx,dy] of dirs){const nx=x+dx,ny=y+dy;if(nx<0||nx>=B.cols||ny<0||ny>=B.rows)continue;const j=index(nx,ny);if(!s.cells[j]&&!seen.has(j)){seen.add(j);queue.push(j)}}}
 for(let i=0;i<s.cells.length;i++)if(!s.cells[i]&&!seen.has(i))s.cells[i]=1;
 s.trail=[];s.origin={...s.player};s.armed=false;s.captures++;s.won=tracePercent(s)>=B.goal;if(s.won)s.phase='won';return tracePercent(s)-before;
}
export function traceHit(s){if(s.phase!=='play')return false;s.lives--;s.player={...s.origin};s.trail=[];s.armed=false;if(!s.lives)s.phase='lost';return true}
export function traceMove(s,d){if(s.phase!=='play')return 'blocked';const [dx,dy]=dirs[d]||[0,0],x=s.player.x+dx,y=s.player.y+dy;if(x<0||y<0||x>=B.cols||y>=B.rows)return 'blocked';const i=index(x,y);
 if(s.cells[i]){s.player={x,y};if(s.trail.length)return traceClose(s)<0?'hit':'capture';s.origin={x,y};return 'walk'}
 if(!s.armed)return 'arm';if(s.trail.includes(i)){traceHit(s);return 'hit'}s.player={x,y};s.trail.push(i);return 'trace';
}
export function traceEnemy(s,dt){if(s.phase!=='play')return null;dt=Number.isFinite(dt)?Math.max(0,dt):0;const e=s.enemy,m=s.speed==='standard'?1.6:1;
 const empty=(x,y)=>x>=.6&&x<B.cols-1.6&&y>=.6&&y<B.rows-1.6&&!s.cells[index(Math.round(x),Math.round(y))];
 const nx=e.x+e.vx*dt*m;if(empty(nx,e.y))e.x=nx;else e.vx*=-1;const ny=e.y+e.vy*dt*m;if(empty(e.x,ny))e.y=ny;else e.vy*=-1;
 if(s.trail.some(i=>Math.hypot(i%B.cols-e.x,Math.floor(i/B.cols)-e.y)<.78)){traceHit(s);return 'hit'}return null;
}
export function traceRetreat(s){if(s.phase!=='play'||!s.trail.length)return false;s.player={...s.origin};s.trail=[];s.armed=false;return true}

export async function createTrace({host,input,saved,sfx=()=>{}}){
 const art=await images(['mural'],'assets/game-forms/trace/'),{element,ctx}=canvasSurface(host);element.style.touchAction='none';element.setAttribute('aria-label','霓境拓界：在安全边线移动，开启划线后点同排或同列位置，闭合区域');
 let s=traceRestore(saved),active=false,route=[],acc=0,flash=0,message='青色边线是安全区。先开启划线，再点同一排的右侧边线，画出第一条分界。';
 if(s.won)message='壁画修复已完成，结果已保留。';else if(s.captures||s.trail.length)message='已恢复上次的修复区域和位置；从安全区继续拓界。';
 const ui=gesturePanel(host,'trace',`<div class="gesture-toolbar"><span class="readout" aria-live="polite"></span><button class="arm primary" type="button">开启划线</button><button class="retreat" type="button">收回未闭合线</button><button class="speed" type="button">节奏：舒缓</button></div><div class="gesture-pad" role="group" aria-label="移动方向"><button data-d="3" type="button" aria-label="向左移动">← 左移</button><button data-d="0" type="button" aria-label="向上移动">↑ 上移</button><button data-d="2" type="button" aria-label="向下移动">↓ 下移</button><button data-d="1" type="button" aria-label="向右移动">→ 右移</button></div><p class="gesture-note">方向键 / WASD 移动；空格切换划线。触屏可点同排 / 同列的目标格自动走直线。闭合后保留游光所在区域，其余区域恢复壁画；修复 68% 完成。</p>`);
 const arm=ui.panel.querySelector('.arm'),retreat=ui.panel.querySelector('.retreat'),speed=ui.panel.querySelector('.speed'),readout=ui.panel.querySelector('.readout'),pad=[...ui.panel.querySelectorAll('[data-d]')];
 function sync(){const enabled=active&&s.phase==='play';arm.disabled=!enabled||s.trail.length>0;arm.textContent=s.armed?'划线已开启':'开启划线';arm.setAttribute('aria-pressed',String(s.armed));retreat.disabled=!enabled||!s.trail.length;speed.disabled=!enabled;speed.textContent='节奏：'+(s.speed==='calm'?'舒缓':'标准');pad.forEach(b=>b.disabled=!enabled);readout.textContent=`修复 ${tracePercent(s).toFixed(1)}% / 68% · ${'◆'.repeat(s.lives)||'无'} · 位置 ${s.player.x+1},${s.player.y+1}`}
 function report(result){if(result==='capture'){flash=.8;route=[];message=s.won?'玻璃壁画修复完成。':'分界闭合，壁画已修复 '+tracePercent(s).toFixed(1)+'%。';sfx(s.won?'success':'pickup')}else if(result==='hit'){route=[];flash=.5;message=s.phase==='lost'?'三次光芯都已用完，可重新开始这幅壁画。':'游光碰到未闭合线，回到安全边线。';sfx('error')}else if(result==='arm'){route=[];message='先开启划线，才能进入暗色区域。'}else if(result==='blocked')route=[];sync()}
 arm.onclick=()=>{if(active&&s.phase==='play'&&!s.trail.length){route=[];s.armed=!s.armed;message=s.armed?'划线已开启。沿暗区连回任一安全格，注意移动的游光。':'回到沿安全边线移动的状态。';sync()}};
 retreat.onclick=()=>{if(active&&traceRetreat(s)){route=[];message='未闭合的线已收回，回到出发点。';sync()}};speed.onclick=()=>{if(active&&s.phase==='play'){s.speed=s.speed==='calm'?'standard':'calm';sync()}};
 pad.forEach(b=>b.onclick=()=>{if(active){route=[];report(traceMove(s,Number(b.dataset.d)))}});
 const tap=e=>{if(!active||s.phase!=='play')return;const p=pointerPosition(element,e),x=Math.floor((p.x-B.x)/B.size),y=Math.floor((p.y-B.y)/B.size);if(x<0||x>=B.cols||y<0||y>=B.rows)return;let d,n;if(y===s.player.y){d=x>s.player.x?1:3;n=Math.abs(x-s.player.x)}else if(x===s.player.x){d=y>s.player.y?2:0;n=Math.abs(y-s.player.y)}else{message='目标需要在光芯所在的同一排或同一列；也可使用方向按钮转弯。';sync();return}route=Array(n).fill(d);acc=.125};
 element.addEventListener('pointerdown',tap);
 function tick(dt){if(!active)return;dt=Number.isFinite(dt)?Math.max(0,dt):0;if(!dt)return;if(s.phase==='play'){s.elapsed+=dt;reportIfHit(traceEnemy(s,dt));acc+=dt;const d=input.y<0?0:input.x>0?1:input.y>0?2:input.x<0?3:null;if(input.pressed.has('Space'))arm.click();if(input.pressed.has('KeyC'))retreat.click();if(acc>=.125){acc%=.125;if(d!==null){route=[];report(traceMove(s,d))}else if(route.length)report(traceMove(s,route.shift()))}}flash=Math.max(0,flash-dt)}
 function reportIfHit(r){if(r)report(r)}
 const point=(x,y)=>({x:B.x+(x+.5)*B.size,y:B.y+(y+.5)*B.size});
 function draw(){ctx.drawImage(art.mural,0,0,W,H);ctx.save();ctx.shadowColor='#53bcc2';ctx.shadowBlur=18;ctx.strokeStyle='#8fe5d7';ctx.lineWidth=1.5;ctx.strokeRect(B.x-3,B.y-3,B.cols*B.size+6,B.rows*B.size+6);ctx.shadowBlur=0;
 for(let i=0;i<s.cells.length;i++){const x=B.x+i%B.cols*B.size,y=B.y+Math.floor(i/B.cols)*B.size;if(!s.cells[i]){ctx.fillStyle='#12172ce0';ctx.fillRect(x,y,B.size,B.size);ctx.strokeStyle='#9cc8da12';ctx.lineWidth=.6;ctx.strokeRect(x,y,B.size,B.size)}else{const boundary=i%B.cols===0||i%B.cols===B.cols-1||i<B.cols||i>=B.cols*(B.rows-1);ctx.fillStyle=boundary?'#88dec62b':'#83dcc413';ctx.fillRect(x,y,B.size,B.size)}}
 if(s.trail.length){ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle='#ffeab4';ctx.lineWidth=4;ctx.shadowColor='#f1b65a';ctx.shadowBlur=12;ctx.beginPath();const o=point(s.origin.x,s.origin.y);ctx.moveTo(o.x,o.y);for(const i of s.trail){const p=point(i%B.cols,Math.floor(i/B.cols));ctx.lineTo(p.x,p.y)}ctx.stroke();ctx.shadowBlur=0}
 const e=point(s.enemy.x,s.enemy.y);if(s.phase!=='won'){glow(ctx,e.x,e.y,29,'#f890de90');ctx.strokeStyle='#f7b5ed';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<8;i++){const a=s.elapsed*2+i*Math.PI/4,r=i%2?6:15;const x=e.x+Math.cos(a)*r,y=e.y+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.stroke()}
 const p=point(s.player.x,s.player.y);glow(ctx,p.x,p.y,22,s.armed?'#ffc785a0':'#8fe5d799');ctx.fillStyle=s.armed?'#ffe2a4':'#cbfff1';ctx.beginPath();ctx.moveTo(p.x,p.y-8);ctx.lineTo(p.x+7,p.y);ctx.lineTo(p.x,p.y+8);ctx.lineTo(p.x-7,p.y);ctx.closePath();ctx.fill();ctx.restore();sceneHeading(ctx,'霓境拓界',`安全边线 · 划线闭合 · 修复玻璃壁画     ${tracePercent(s).toFixed(1)}%`);
 ctx.save();ctx.fillStyle='#101c35de';ctx.beginPath();ctx.roundRect(330,562,460,40,8);ctx.fill();ctx.fillStyle='#d7e9e4';ctx.textAlign='center';ctx.font='15px "Microsoft YaHei",sans-serif';ctx.fillText(s.trail.length?'金色线尚未闭合 · 连回青色安全区':s.armed?'划线已开启 · 从安全边线进入暗区':'沿青色边线安全移动 · 开启划线进入暗区',560,588);ctx.restore();if(flash>0){ctx.fillStyle=`rgba(139,231,216,${flash*.13})`;ctx.fillRect(B.x,B.y,B.cols*B.size,B.rows*B.size)}if(s.won)completion(ctx,'壁画重见月光',`修复 ${tracePercent(s).toFixed(1)}% · ${s.captures} 次闭合 · 剩余 ${s.lives} 枚光芯`);if(s.phase==='lost')completion(ctx,'光芯暂时熄灭','重新开始，可以用舒缓节奏再次修复壁画')}
 sync();return{tick,draw,onStart(){active=true;sync()},setActive(v){active=v;if(!v)route=[];sync()},getState(){return structuredClone(s)},getStatus(){return{goal:s.won?'玻璃壁画已修复':'闭合路径，修复至少 68% 的玻璃壁画',message,stats:[`修复 ${tracePercent(s).toFixed(1)}%`,`光芯 ${s.lives}/3`,`闭合 ${s.captures} 次`],actions:[]}},dispose(){element.removeEventListener('pointerdown',tap);ui.dispose()}};
}
