import {proceduralBackground,proceduralImage,proceduralSprite} from './procedural-art.js';
import {getArtDirection} from '../art-direction.js?v=2';
export function drawProceduralMoving(c,s,o){
 proceduralBackground(c,'courtyard-'+o.mood);const mode=getArtDirection(),ink=mode==='neon'?'#7ce8e1':'#e8d5af';
 c.save();c.beginPath();c.moveTo(o.ramp[0],510);c.lineTo(o.ramp[1],o.floor);c.lineTo(o.ramp[1],o.floor+8);c.lineTo(o.ramp[0],518);c.closePath();c.fillStyle=mode==='neon'?'#1b4354':'#a88966';c.fill();c.strokeStyle=ink;c.lineWidth=2;c.stroke();c.restore();
 proceduralImage(c,'truck',728,o.floor-140,230,188);proceduralImage(c,'box',o.obstacle.x,510-o.obstacle.h,o.obstacle.w,o.obstacle.h);
 const shadow=(x,y,w)=>{c.save();c.fillStyle='#08142433';c.beginPath();c.ellipse(x,y+2,w,4,0,0,Math.PI*2);c.fill();c.restore()};
 const label=(t,x,y)=>{c.font='11px "Microsoft YaHei",sans-serif';c.textAlign='center';c.fillStyle=mode==='neon'?'#c5f9f4':'#fff6d9';c.strokeStyle='#223a4a';c.lineWidth=3;c.strokeText(t,x,y);c.fillText(t,x,y)};
 for(const item of s.cargo){if(item.id===s.holding||item.broken)continue;const hasSofa=s.cargo.some(a=>a.type==='sofa'),x=item.delivered?(item.type==='fridge'?757:item.type==='sofa'?810:item.type==='box'?798:850):item.x,y=item.delivered?(hasSofa&&item.type!=='sofa'?o.floor-49:o.floor):item.y+item.h/2;shadow(x,y,item.w*.45);proceduralImage(c,item.type,x-item.w/2,y-item.h,item.w,item.h);if(!item.delivered)label(item.name,x,y-item.h-12)}
 const p=s.player,held=s.cargo.find(a=>a.id===s.holding),pose=!p.grounded?'jump':s.liftUntil>s.time?'lift':s.orderDone?'rest':'idle';shadow(p.x,p.y,19);proceduralSprite(c,'worker',p.x,p.y,96,{flip:p.facing<0,walking:Math.abs(p.vx)>10,pose});
 if(held){c.save();c.translate(held.x,held.y);c.rotate(held.angle||0);proceduralImage(c,held.type,-held.w/2,-held.h/2,held.w,held.h);c.restore()}
 if(o.mood==='rain'){c.save();c.strokeStyle='#bddfea55';c.lineWidth=1;for(let i=0;i<45;i++){const x=(i*73+s.time*41)%980,y=(i*97+s.time*178)%620;c.beginPath();c.moveTo(x,y);c.lineTo(x-6,y+18);c.stroke()}c.restore()}
 for(const part of s.particles){c.save();c.globalAlpha=Math.max(0,1-part.age/part.life);c.fillStyle=part.color;c.fillRect(part.x,part.y,3,3);c.restore()}
}
