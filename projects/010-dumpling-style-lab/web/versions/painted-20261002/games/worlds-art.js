// Original painted assets decorate the world; positions, targets and rules stay in the game modules.
const base=new URL('../assets/worlds/',import.meta.url),images=new Map();
const bundles={
 detective:['detective-office','detective-street','agent','shen','lin','ji','film-can','equipment-ledger','torn-receipt','contact-proof'],
 wuxia:['wuxia-landscape','wuxia-hero','merchant','porter','messenger'],
 ecology:['ecology-terrain','ecologist',...['reed','flowers','wood'].flatMap(k=>[0,1,2].map(n=>k+'-'+n))],
 wasteland:['wasteland-horizon','wasteland-frame','survivor','ferryman','ecologist','water-pump','radiator','seedling-bench','salvage-crate'],
 dream:['dream-water','traveler','ferryman','moon-ferry','archive-pavilion','moon-stone'],
 arcade:['arcade-city','runner-0','runner-1','runner-2','runner-3'],
 inn:['inn-interior',...['keeper','courier','botanist','writer'].flatMap(k=>[k,k+'-activity'])]
};
function obtain(name){if(images.has(name))return images.get(name);const entry={name,image:new Image(),status:'loading',timer:null};images.set(name,entry);entry.image.onload=()=>{clearTimeout(entry.timer);entry.status='ready'};entry.image.onerror=()=>{clearTimeout(entry.timer);entry.status='error'};entry.timer=setTimeout(()=>{if(entry.status==='loading')entry.status='error'},20000);entry.image.src=new URL(name+'.webp',base).href;return entry}
export function worldArtStatus(world){const names=bundles[world]||[],items=names.map(obtain);return {loaded:items.filter(a=>a.status==='ready').length,total:items.length,error:items.some(a=>a.status==='error'),ready:items.every(a=>a.status==='ready')}}
export function retryWorldArt(world){for(const name of bundles[world]||[]){const e=images.get(name);if(e?.status==='error'){clearTimeout(e.timer);images.delete(name);obtain(name)}}}
export function useWorldArt(ctx,world){for(const name of bundles[world]||[])obtain(name);
 const ready=name=>obtain(name).status==='ready';
 function image(name,x,y,w,h,alpha=1){const e=obtain(name);if(e.status!=='ready')return false;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(e.image,x,y,w,h);ctx.restore();return true}
 function background(name,scroll=0){const e=obtain(name);if(e.status!=='ready')return false;ctx.save();if(scroll){const shift=((scroll%960)+960)%960;ctx.drawImage(e.image,-shift,0,960,600);ctx.drawImage(e.image,960-shift,0,960,600)}else ctx.drawImage(e.image,0,0,960,600);ctx.restore();return true}
 function sprite(name,x,y,height=90,{flip=false,bob=0,alpha=1}={}){const e=obtain(name);if(e.status!=='ready')return false;const width=height*e.image.width/e.image.height;ctx.save();ctx.translate(x,y+bob);if(flip)ctx.scale(-1,1);ctx.globalAlpha=alpha;ctx.drawImage(e.image,-width/2,-height,width,height);ctx.restore();return true}
 function shadow(x,y,width=18,alpha=.25){ctx.save();ctx.fillStyle=`rgba(9,17,23,${alpha})`;ctx.beginPath();ctx.ellipse(x,y+2,width,width*.24,0,0,Math.PI*2);ctx.fill();ctx.restore()}
 function pattern(name,scale=.18){const e=obtain(name);if(e.status!=='ready')return null;const p=ctx.createPattern(e.image,'repeat');p?.setTransform(new DOMMatrix().scale(scale));return p}
 return {ready,image,background,sprite,shadow,pattern};
}
