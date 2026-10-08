import {scope,surface,clamp} from './runtime.js';
export const ORIGINAL_VIDEO='https://combinationsoupstudio.com.au/assets/previews/soup-v-soup-s.mp4';
export function mount(host,{reduced,onState}){
  host.innerHTML=`<div class="atmosphere-effect"><div class="effect-title"><span>01 / HERO ATMOSPHERE</span><h3>热气，正在升起。</h3><p>移动指针，拨动汤碗上方的蒸汽。</p></div><video class="soup-film" src="${ORIGINAL_VIDEO}" muted loop playsinline preload="metadata" aria-label="原站汤碗视频：筷子夹起馄饨"></video><canvas class="steam-layer" aria-hidden="true"></canvas><div class="film-credit">原站视频素材 · 独立蒸汽粒子层</div><div class="film-control"><button type="button" data-play>播放汤碗视频</button><span data-media-status role="status">正在加载原站视频</span></div></div>`;
  const life=scope(host),video=host.querySelector('video'),canvas=host.querySelector('canvas'),{ctx,resize}=surface(canvas);
  let size=resize(),parts=[],wind=0,lastX=null,manualPause=reduced;
  const puff=document.createElement('canvas');puff.width=puff.height=100;
  const pc=puff.getContext('2d'),g=pc.createRadialGradient(50,50,0,50,50,50);g.addColorStop(0,'#fff0df');g.addColorStop(1,'#fff0df00');pc.fillStyle=g;pc.fillRect(0,0,100,100);
  const status=host.querySelector('[data-media-status]'),button=host.querySelector('[data-play]');
  function state(){button.textContent=video.paused?'播放汤碗视频':'暂停汤碗视频';onState({素材:'原站公开视频',视频:video.paused?'暂停':'播放',蒸汽:reduced?'静态偏好':'指针驱动',粒子层:'Canvas 叠加'});}
  life.listen(video,'playing',()=>{status.textContent='原站视频正在播放';state();});
  life.listen(video,'pause',state);
  life.listen(video,'error',()=>{status.textContent='视频暂时无法加载，可打开原站核对';state();});
  life.listen(video,'loadeddata',()=>{status.textContent='视频已加载';if(!manualPause)video.play().catch(()=>{status.textContent='点击按钮播放视频';});});
  life.listen(button,'click',()=>{manualPause=!video.paused;if(video.paused){manualPause=false;video.play().catch(()=>{status.textContent='视频加载失败，请打开原站';});}else video.pause();});
  const mediaObserver=new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&!manualPause&&!reduced)video.play().catch(()=>{});else video.pause();},{threshold:.1});mediaObserver.observe(video);
  life.listen(canvas,'pointermove',e=>{if(lastX!==null)wind=clamp(wind+(e.clientX-lastX)*.07,-7,7);lastX=e.clientX;});
  life.listen(canvas,'pointerleave',()=>lastX=null);
  life.listen(window,'resize',()=>size=resize());
  if(!reduced)life.loop((now,dt)=>{ctx.clearRect(0,0,size.w,size.h);wind*=Math.pow(.96,dt);if(Math.random()<.8)parts.push({x:size.w*(.38+Math.random()*.25),y:size.h*.51,r:22+Math.random()*30,t:0,life:100+Math.random()*90,v:.5+Math.random()*.8});parts=parts.filter(p=>p.t<p.life);for(const p of parts){p.t+=dt;p.x+=(wind*p.t/p.life+Math.sin(p.t*.03)*.3)*dt;p.y-=p.v*dt;p.r+=.1*dt;ctx.globalAlpha=Math.sin(Math.PI*p.t/p.life)*.22;ctx.drawImage(puff,p.x-p.r,p.y-p.r,p.r*2,p.r*2);}ctx.globalAlpha=1;});
  state();
  return {dispose(){mediaObserver.disconnect();video.pause();video.removeAttribute('src');video.load();life.dispose();}};
}
