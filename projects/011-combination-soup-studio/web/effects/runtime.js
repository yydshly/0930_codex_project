// Shared lifecycle only. Each effect owns its rendering and state.
export function scope(host) {
  const cleanups=[];
  let visible=true;
  const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{rootMargin:'60px'});
  io.observe(host);cleanups.push(()=>io.disconnect());
  return {
    listen(el,type,fn,options){el.addEventListener(type,fn,options);cleanups.push(()=>el.removeEventListener(type,fn,options));},
    loop(draw){let id=0,last=0,stopped=false;function frame(now){if(stopped)return;id=requestAnimationFrame(frame);const dt=Math.min(40,now-last||16.67);last=now;if(visible&&document.visibilityState==='visible')draw(now,dt/16.67);}id=requestAnimationFrame(frame);cleanups.push(()=>{stopped=true;cancelAnimationFrame(id);});},
    timeout(fn,delay){const id=setTimeout(fn,delay);cleanups.push(()=>clearTimeout(id));return id;},
    dispose(){cleanups.splice(0).reverse().forEach(fn=>fn());}
  };
}
export function surface(canvas) {
  const ctx=canvas.getContext('2d');
  function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);return {w:r.width,h:r.height};}
  return {ctx,resize};
}
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
