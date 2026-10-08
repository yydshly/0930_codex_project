import {W,H,clamp,images,canvasSurface} from './showcase-core.js';
import {pointerPosition} from './showcase-precision-kit.js';
import {observationPanel,sceneHeading,completion} from './showcase-observation-kit.js?v=20261004-2';

// Regions were authored against the actual generated room, never overlaid surrogate objects.
const region=(id,name,rect)=>({id,name,rect:rect.map((v,i)=>v/(i%2?941:1672)*(i%2?H:W))});
export const SEEK_TARGETS=[
 region('teapot','红瓷茶壶',[143,159,177,123]),
 region('butterfly','蓝色蝴蝶',[1447,98,86,76]),
 region('shell','白色海螺',[850,568,106,78]),
 region('watch','黄铜怀表',[1120,553,65,92]),
 region('glasses','圆框眼镜',[368,739,184,93]),
 region('frog','青瓷小蛙',[1425,367,81,80]),
 region('star','橙色海星',[177,506,101,98]),
 region('quill','羽毛墨水瓶',[631,484,129,276])
];
const known=new Set(SEEK_TARGETS.map(t=>t.id));
export const seekFresh=()=>({version:1,found:[],selected:'teapot',hints:3,elapsed:0,zoom:1,cx:W/2,cy:H/2,won:false});
export function seekCamera(s){s.zoom=clamp(Number.isFinite(s.zoom)?s.zoom:1,1,2.4);s.cx=clamp(Number.isFinite(s.cx)?s.cx:W/2,W/(2*s.zoom),W-W/(2*s.zoom));s.cy=clamp(Number.isFinite(s.cy)?s.cy:H/2,H/(2*s.zoom),H-H/(2*s.zoom));return s}
export function seekRestore(raw){const s=seekFresh();if(raw?.version!==1)return s;s.found=[...new Set(Array.isArray(raw.found)?raw.found.filter(id=>known.has(id)):[])];s.selected=known.has(raw.selected)?raw.selected:'teapot';s.hints=Number.isInteger(raw.hints)?clamp(raw.hints,0,3):3;s.elapsed=Number.isFinite(raw.elapsed)?clamp(raw.elapsed,0,86400):0;s.zoom=raw.zoom;s.cx=raw.cx;s.cy=raw.cy;s.won=s.found.length===SEEK_TARGETS.length;return seekCamera(s)}
export function seekWorld(s,p){return {x:s.cx+(p.x-W/2)/s.zoom,y:s.cy+(p.y-H/2)/s.zoom}}
export function seekScreen(s,p){return {x:W/2+(p.x-s.cx)*s.zoom,y:H/2+(p.y-s.cy)*s.zoom}}
export function seekPick(s,p){if(s.won)return null;const target=SEEK_TARGETS.find(t=>{const [x,y,w,h]=t.rect;return p.x>=x&&p.x<=x+w&&p.y>=y&&p.y<=y+h});if(!target||s.found.includes(target.id))return null;s.found.push(target.id);s.selected=SEEK_TARGETS.find(t=>!s.found.includes(t.id))?.id||target.id;s.won=s.found.length===SEEK_TARGETS.length;return target}
export function seekHint(s){if(s.won||s.hints<=0)return null;const t=SEEK_TARGETS.find(t=>t.id===s.selected&&!s.found.includes(t.id))||SEEK_TARGETS.find(t=>!s.found.includes(t.id));s.selected=t.id;s.hints--;return t}

export async function createSeek({host,input,saved,notify=()=>{},sfx=()=>{}}){
 const art=await images(['room'],'assets/game-forms/seek/'),{element,ctx}=canvasSurface(host);
 element.setAttribute('aria-label','海岸藏物阁：点房间中的清单物件；放大后拖动画面观察');element.style.touchAction='none';
 let s=seekRestore(saved),active=false,message='从清单挑一件，直接点房间里对应的真实物件。',hint=null,hintLife=0,feedback=null,feedbackLife=0,drag=null,pointer=null;
 if(s.won)message='八件藏物全部找到，收藏清单已归档。';else if(s.found.length)message=`已保留 ${s.found.length} 件藏物的标记，可以继续寻找。`;
 const ui=observationPanel(host,'seek',`<div class="seek-targets" role="group" aria-label="寻找物件清单"></div><div class="observation-toolbar"><span class="readout" aria-live="polite"></span><button class="zoom" type="button">放大观察</button><button class="overview" type="button">回到全景</button><button class="hint" type="button">提示位置 · 3</button></div><p class="observation-help">点画面找物件；清单仅选择目标。放大后拖动或用方向键平移，滚轮也可缩放。</p>`);
 const targetNodes=SEEK_TARGETS.map(t=>{const b=document.createElement('button');b.type='button';b.className='seek-target';b.setAttribute('aria-label','寻找'+t.name);const im=document.createElement('img'),text=document.createElement('span');const thumb=document.createElement('canvas');thumb.width=88;thumb.height=88;const c=thumb.getContext('2d'),[x,y,w,h]=t.rect,ratio=Math.min(80/w,80/h);c.drawImage(art.room,x/W*art.room.width,y/H*art.room.height,w/W*art.room.width,h/H*art.room.height,44-w*ratio/2,44-h*ratio/2,w*ratio,h*ratio);im.src=thumb.toDataURL('image/png');im.alt='';text.textContent=t.name;b.append(im,text);b.onclick=()=>{if(!active||s.won)return;s.selected=t.id;message='正在寻找：'+t.name;sync()};ui.panel.querySelector('.seek-targets').append(b);return b});
 const zoom=ui.panel.querySelector('.zoom'),overview=ui.panel.querySelector('.overview'),hintButton=ui.panel.querySelector('.hint'),readout=ui.panel.querySelector('.readout');
 function sync(){targetNodes.forEach((b,i)=>{const t=SEEK_TARGETS[i],found=s.found.includes(t.id);b.disabled=!active||found||s.won;b.classList.toggle('found',found);b.setAttribute('aria-pressed',String(s.selected===t.id&&!found));b.querySelector('span').textContent=(found?'✓ ':'')+t.name;b.setAttribute('aria-label',(found?'已找到':'寻找')+t.name)});zoom.disabled=overview.disabled=!active;hintButton.disabled=!active||s.won||s.hints<=0;zoom.textContent=s.zoom>1?'继续放大 · '+s.zoom.toFixed(1)+'×':'放大观察';if(s.zoom>=2.4)zoom.textContent='缩回全景';hintButton.textContent='提示位置 · '+s.hints;readout.textContent=s.won?'清单已整理完成':`已找到 ${s.found.length}/8 · ${SEEK_TARGETS.find(t=>t.id===s.selected).name}`}
 function setZoom(z,anchor={x:W/2,y:H/2}){const w=seekWorld(s,anchor);s.zoom=clamp(z,1,2.4);s.cx=w.x-(anchor.x-W/2)/s.zoom;s.cy=w.y-(anchor.y-H/2)/s.zoom;seekCamera(s);sync()}
 zoom.onclick=()=>{if(active)setZoom(s.zoom>=2.4?1:Math.min(2.4,s.zoom+.7))};overview.onclick=()=>{if(active){s.zoom=1;seekCamera(s);sync()}};
 hintButton.onclick=()=>{if(!active)return;hint=seekHint(s);if(!hint)return;hintLife=5;const [x,y,w,h]=hint.rect;s.cx=x+w/2;s.cy=y+h/2;seekCamera(s);message='光圈标记了 '+hint.name+'，点物件即可收集。';sfx('pickup');sync()};
 function down(e){if(!active||s.won)return;pointer=e.pointerId;drag={start:pointerPosition(element,e),last:pointerPosition(element,e),moved:false};element.setPointerCapture(e.pointerId)}
 function move(e){if(e.pointerId!==pointer||!drag||!active)return;const p=pointerPosition(element,e);if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>10)drag.moved=true;if(drag.moved&&s.zoom>1){s.cx-=(p.x-drag.last.x)/s.zoom;s.cy-=(p.y-drag.last.y)/s.zoom;seekCamera(s)}drag.last=p}
 function up(e){if(e.pointerId!==pointer||!drag)return;if(active&&!drag.moved){const p=seekWorld(s,pointerPosition(element,e)),t=seekPick(s,p);feedback={...p,ok:!!t};feedbackLife=1.1;if(t){message=s.won?'八件藏物全部找到，收藏清单已归档。':'找到 '+t.name+'。继续观察下一件。';sfx(s.won?'success':'pickup');if(hint?.id===t.id)hintLife=0}else message='这里不是未找到的清单物件；可以放大观察。';sync()}drag=null;pointer=null}
 const cancel=()=>{drag=null;pointer=null};const wheel=e=>{if(!active)return;e.preventDefault();setZoom(s.zoom+(e.deltaY<0?.2:-.2),pointerPosition(element,e))};
 element.addEventListener('pointerdown',down);element.addEventListener('pointermove',move);element.addEventListener('pointerup',up);element.addEventListener('pointercancel',cancel);element.addEventListener('wheel',wheel,{passive:false});
 function tick(dt){if(!active)return;dt=Number.isFinite(dt)?Math.max(0,dt):0;if(!s.won)s.elapsed+=dt;hintLife=Math.max(0,hintLife-dt);feedbackLife=Math.max(0,feedbackLife-dt);if(s.zoom>1&&(input.x||input.y)){s.cx+=input.x*220*dt/s.zoom;s.cy+=input.y*220*dt/s.zoom;seekCamera(s)}if(input.pressed.has('KeyE'))zoom.click();if(input.pressed.has('KeyC'))hintButton.click()}
 function ring(p,r,color,check=false){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.shadowColor=color;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;if(check){ctx.fillStyle='#092e28dd';ctx.beginPath();ctx.arc(p.x+r*.72,p.y-r*.7,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d4f5d3';ctx.font='600 15px sans-serif';ctx.textAlign='center';ctx.fillText('✓',p.x+r*.72,p.y-r*.7+5)}ctx.restore()}
 function draw(){ctx.fillStyle='#132222';ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2,H/2);ctx.scale(s.zoom,s.zoom);ctx.translate(-s.cx,-s.cy);ctx.drawImage(art.room,0,0,W,H);ctx.restore();for(const t of SEEK_TARGETS){const [x,y,w,h]=t.rect,p=seekScreen(s,{x:x+w/2,y:y+h/2});if(s.found.includes(t.id))ring(p,Math.max(17,Math.min(w,h)*s.zoom*.55),'#bee4a5bb',true);if(hintLife>0&&hint?.id===t.id)ring(p,Math.max(w,h)*s.zoom*.6+Math.sin(hintLife*5)*5,'#ffe4a5')}if(feedback&&feedbackLife>0){const p=seekScreen(s,feedback);ring(p,19+(1.1-feedbackLife)*25,feedback.ok?'#ccf3bd':'#dfa26b')}sceneHeading(ctx,'海岸藏物阁',`观察 · 放大 · 定位     ${s.found.length}/8 已找到     ${s.zoom.toFixed(1)}×`);if(s.won)completion(ctx,'收藏清单完成',`找齐八件藏物 · 使用 ${3-s.hints} 次提示 · ${Math.floor(s.elapsed)} 秒`)}
 sync();return {tick,draw,onStart(){active=true;sync()},setActive(v){if(v===active)return;active=v;if(!v)cancel();sync()},getState(){return structuredClone(s)},getStatus(){return {goal:s.won?'八件藏物已归档':'找齐收藏清单里的八件藏物',message,stats:[`找到 ${s.found.length}/8`,`提示剩余 ${s.hints}`,`观察倍率 ${s.zoom.toFixed(1)}×`],actions:[]}},dispose(){element.removeEventListener('pointerdown',down);element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',cancel);element.removeEventListener('wheel',wheel);ui.dispose()}};
}
