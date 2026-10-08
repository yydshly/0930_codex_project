import {useWorldArt} from './worlds-art.js?v=4';
export const copy=o=>JSON.parse(JSON.stringify(o));
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const noise=n=>{const x=Math.sin(n*97.17+8.2)*13731.1;return x-Math.floor(x)};
export function drawing(mount,label){
 const canvas=document.createElement('canvas');canvas.width=960;canvas.height=600;canvas.tabIndex=0;canvas.style.cssText='display:block;width:100%;height:auto;touch-action:manipulation';canvas.setAttribute('aria-label',label);mount.append(canvas);const c=canvas.getContext('2d'),art=useWorldArt(c,mount.dataset.world);
 const rect=(x,y,w,h,color,r=0,stroke)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke()}};
 const poly=(points,color,stroke)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(color){c.fillStyle=color;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke()}};
 const line=(points,color,width=1)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke()};
 const ellipse=(x,y,rx,ry,color)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill()};
 const text=(t,x,y,size=14,color='#ddd',align='left',font='"Microsoft YaHei",sans-serif')=>{c.font=`${size}px ${font}`;c.textAlign=align;c.fillStyle=color;c.fillText(t,x,y)};
 const person=(x,y,coat='#867966',stride=0,parcel=false)=>{const kind=mount.dataset.world;const name=kind==='wuxia'?({'#805a49':'wuxia-hero','#756557':'merchant','#697c6a':'porter','#967b62':'messenger'}[coat]||'wuxia-hero'):kind==='wasteland'?({'#a19278':'ferryman','#758387':'ecologist'}[coat]||'survivor'):null;if(name&&art.ready(name)){art.shadow(x,y,15,.2);art.sprite(name,x,y,kind==='wuxia'?82:87,{bob:stride?Math.sin(stride)*1.4:0});return}ellipse(x,y+2,12,4,'#11172225');const step=Math.sin(stride)*4;line([[x-4,y-21],[x-5-step,y-2]],'#293435',5);line([[x+4,y-21],[x+6+step,y-2]],'#293435',5);poly([[x-8,y-45],[x+8,y-45],[x+11,y-19],[x-10,y-19]],coat);line([[x-7,y-40],[x-12-step,y-25]],coat,5);line([[x+7,y-40],[x+13+step,y-25]],coat,5);ellipse(x,y-53,6.5,8,'#bea991');poly([[x-7,y-54],[x-6,y-62],[x+5,y-61],[x+8,y-56]],'#35403d');if(parcel)rect(x-18,y-42,11,16,'#bc946d',2,'#513f38');};
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*960,y:(e.clientY-r.top)/r.height*600}};
 return {canvas,c,rect,poly,line,ellipse,text,person,point,art};
}
export function pathOnRoad(start,goal,walkable){const step=16,cols=60,rows=38,key=(x,y)=>y*cols+x;
 function nearest(p){let best=null,d=Infinity;const xx=Math.round(p.x/step),yy=Math.round(p.y/step);for(let y=Math.max(0,yy-2);y<Math.min(rows,yy+3);y++)for(let x=Math.max(0,xx-2);x<Math.min(cols,xx+3);x++){const dd=(x*step-p.x)**2+(y*step-p.y)**2;if(walkable(x*step,y*step)&&dd<d){best={x,y};d=dd}}return best}
 const a=nearest(start),b=nearest(goal);if(!a||!b||!walkable(goal.x,goal.y))return null;const queue=[a],prev=new Map(),seen=new Set([key(a.x,a.y)]);let found=false;for(let i=0;i<queue.length;i++){const q=queue[i];if(q.x===b.x&&q.y===b.y){found=true;break}for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=q.x+dx,y=q.y+dy,k=key(x,y);if(x<0||x>=cols||y<0||y>=rows||seen.has(k)||!walkable(x*step,y*step))continue;seen.add(k);prev.set(k,q);queue.push({x,y})}}if(!found)return null;const out=[{...goal}];let q=b;while(q.x!==a.x||q.y!==a.y){out.push({x:q.x*step,y:q.y*step});q=prev.get(key(q.x,q.y))}return out.reverse();
}
export function distanceToSegment(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)}
