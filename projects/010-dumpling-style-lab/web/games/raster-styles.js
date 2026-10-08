import {getArtDirection,getArtClock} from '../art-direction.js?v=2';

// These packs are separate generated artwork, sharing the inn's existing coordinates.
export const RASTER_STYLES=['clay','felt','watercolor','engraving'];
const actors=['keeper','courier','botanist','writer'];
const names=['background',...actors.flatMap(a=>['idle','walk-a','walk-b','activity'].map(p=>a+'-'+p)),'plant','tea','books','lamp'];
const base=new URL('../assets/art-styles/',import.meta.url),cache=new Map();
export const hasRasterStyle=world=>world==='inn'&&RASTER_STYLES.includes(getArtDirection());
function obtain(name){
 const key=getArtDirection()+'/'+name;if(cache.has(key))return cache.get(key);
 const item={image:new Image(),status:'loading',timer:null};cache.set(key,item);
 item.image.onload=()=>{clearTimeout(item.timer);item.status='ready'};
 item.image.onerror=()=>{clearTimeout(item.timer);item.status='error'};
 item.timer=setTimeout(()=>{if(item.status==='loading')item.status='error'},20000);
 item.image.src=new URL(key+'.webp',base).href;return item;
}
export function rasterArtStatus(){const items=names.map(obtain);return {loaded:items.filter(i=>i.status==='ready').length,total:items.length,error:items.some(i=>i.status==='error'),ready:items.every(i=>i.status==='ready')}}
export function retryRasterArt(){for(const name of names){const key=getArtDirection()+'/'+name,item=cache.get(key);if(item?.status==='error'){clearTimeout(item.timer);cache.delete(key);obtain(name)}}}
function resolve(name){if(name==='inn-interior')return 'background';if(actors.includes(name))return name+'-idle';return names.includes(name)?name:null}
export function rasterReady(name){const key=resolve(name);return !!key&&obtain(key).status==='ready'}
export function rasterImage(ctx,name,x,y,w,h,alpha=1){const key=resolve(name);if(!key)return false;const item=obtain(key);if(item.status!=='ready')return false;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(item.image,x,y,w,h);ctx.restore();return true}
export function rasterSprite(ctx,name,x,y,height,options={}){
 const actor=name.replace(/-activity$/,'');let key=resolve(name);
 if(actors.includes(actor)&&!name.endsWith('-activity')&&options.walking)key=actor+(Math.sin(getArtClock()*10)>0?'-walk-a':'-walk-b');
 if(!key)return false;const item=obtain(key);if(item.status!=='ready')return false;
 const width=height*item.image.width/item.image.height;ctx.save();ctx.translate(x,y+(options.bob||0));if(options.flip)ctx.scale(-1,1);ctx.globalAlpha=options.alpha??1;ctx.drawImage(item.image,-width/2,-height,width,height);ctx.restore();return true;
}
