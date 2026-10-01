import {gardenKinds} from './garden-model.mjs';
import {stageOf,stageName} from './ecosystem-model.mjs';
// Reuses the original garden's code-drawn landscape; its runtime stays unchanged.
export function createGardenPainter(canvas){
const g=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let width=1,height=1,effects=[];
const born=new Map(),clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const ease=t=>{const n=clamp(t,0,1);return n*n*(3-2*n);};
function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const ratio=Math.min(devicePixelRatio,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);g.setTransform(ratio,0,0,ratio,0,0);}

function ellipse(x,y,rx,ry,color,rotation=0){g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);g.fill();}
function stroke(x1,y1,x2,y2,color,size=1){g.strokeStyle=color;g.lineWidth=size;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();}
function glow(x,y,r,color,opacity=.2){g.save();g.globalAlpha=opacity;const fill=g.createRadialGradient(x,y,0,x,y,r);fill.addColorStop(0,color);fill.addColorStop(1,'transparent');g.fillStyle=fill;g.fillRect(x-r,y-r,r*2,r*2);g.restore();}
function landscape(t){
  const gradient=g.createLinearGradient(0,0,0,height);gradient.addColorStop(0,'#183838');gradient.addColorStop(.48,'#527a70');gradient.addColorStop(.65,'#244f50');gradient.addColorStop(1,'#102b30');g.fillStyle=gradient;g.fillRect(0,0,width,height);
  glow(width*.72,height*.2,width*.35,'#d4d5a6',.22);ellipse(width*.72,height*.21,22,22,'#c9d3ad');glow(width*.72,height*.21,85,'#d6dbb5',.18);
  for(let layer=0;layer<3;layer++){
    g.fillStyle=['#43675e','#2b544e','#244744'][layer];g.beginPath();g.moveTo(0,height*.48);
    for(let i=0;i<=30;i++){const x=i/30*width,y=height*(.34+layer*.055)+Math.sin(i*.22+layer*2)*height*.065+Math.sin(i*.58+layer)*height*.022;g.lineTo(x,y);}
    g.lineTo(width,height*.58);g.lineTo(0,height*.58);g.fill();
  }
  const mist=g.createLinearGradient(0,height*.36,0,height*.58);mist.addColorStop(0,'#b5c5aa00');mist.addColorStop(.5,'#bdd0b333');mist.addColorStop(1,'#b5c5aa00');g.fillStyle=mist;g.fillRect(0,height*.36,width,height*.22);
  for(let i=0;i<23;i++){const x=width*(.72+Math.sin(i*4.6)*(.015+i*.004)),y=height*(.49+i*.012);stroke(x-width*.02,y,x+width*.02+i*.4,y,`rgba(192,215,182,${.02+(1-i/23)*.09})`);}
  g.fillStyle='#17392f';g.beginPath();g.moveTo(0,height*.68);g.bezierCurveTo(width*.25,height*.58,width*.52,height*.94,width,height*.68);g.lineTo(width,height);g.lineTo(0,height);g.fill();
  g.strokeStyle='#aac5a12b';g.lineWidth=1;g.beginPath();g.moveTo(0,height*.68);g.bezierCurveTo(width*.25,height*.58,width*.52,height*.94,width,height*.68);g.stroke();
  for(let i=0;i<190;i++){
    const x=(Math.sin(i*12.9898)*.5+.5)*width,y=height*(.8+(Math.sin(i*7.23)*.5+.5)*.23),len=12+(i%9)*5;
    const sway=Math.sin(t*.35+i)*4;
    g.strokeStyle=i%3===0?'#7b9d7045':'#365f4966';g.lineWidth=i%4===0?1.6:.8;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+sway-7,y-len*.5,x+sway-3,y-len);g.stroke();
    if(i%16===0){ellipse(x+sway-3,y-len,2,3,'#c8c7a666');glow(x,y-len,14,'#bfccaf',.08);}
  }
  for(let i=0;i<38;i++){const x=(Math.sin(i*14.1)*.5+.5)*width+Math.sin(t*.18+i)*10,y=height*(.38+(Math.cos(i*3.1)*.5+.5)*.45)+Math.sin(t*.22+i)*7,opacity=.18+(Math.sin(t*.8+i)*.5+.5)*.5;g.globalAlpha=opacity;ellipse(x,y,1.2,1.2,'#dfe4b6');glow(x,y,8,'#dfe4b6',.15);}
  g.globalAlpha=1;
}
function plantDrawing(plant,now,t,preview=false){
  const age=born.has(plant.id)?(now-born.get(plant.id))/1700:1,growth=preview?.35+ease((now-plant.start)/2600)*.65:ease(age),x=plant.x*width,y=plant.y*height;
  const size=clamp(width/850,.85,1.25)*(.7+plant.y*.5),stem=(52+plant.held*15)*size*growth;
  const pulse=effects.reduce((n,e)=>e.id===plant.id?Math.max(n,Math.max(0,1-(now-e.time)/1100)):n,0),sway=Math.sin(t*.6+plant.x*8)*3*size*(reduced?0:1);
  g.save();g.translate(x,y);g.globalAlpha=preview?.65:1;
  ellipse(0,2,22*size,5*size,'#071d2533');glow(0,-stem*.55,52*size,gardenKinds[plant.kind].color,.12+pulse*.18);
  if(plant.kind==='water'){
    ellipse(0,0,25*size,8*size,'#4f83757a');ellipse(12*size,-2,15*size,4*size,'#7d9b7770',-.3);
    stroke(0,0,sway,-stem*.65,'#8cbba1',1.4*size);g.translate(sway,-stem*.65);
    for(let i=0;i<7;i++){const a=Math.PI+i*Math.PI/6;ellipse(Math.cos(a)*9*size,Math.sin(a)*10*size,14*size,6*size,['#c3d8cd','#cfe3d3','#e0e7cf'][i%3],a+.3);}
    ellipse(0,1,10*size,4*size,'#e1d7ab');ellipse(0,0,3*size,2*size,'#fff1c4');
  }else if(plant.kind==='meadow'){
    for(let branch=0;branch<3;branch++){
      const dx=(branch-1)*24*size+sway,h=stem*(branch===1?1:.72);
      g.strokeStyle='#9ab786';g.lineWidth=1.5*size;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(dx*.4,-h*.7,dx,-h);g.stroke();
      ellipse(dx*.5-7*size,-h*.4,11*size,3.8*size,'#779c6e',.45);ellipse(dx*.7+6*size,-h*.65,10*size,3.8*size,'#abc191',-.55);
      for(let i=0;i<6;i++){const a=i*Math.PI/3;ellipse(dx+Math.cos(a)*8*size,-h+Math.sin(a)*8*size,7*size,4*size,'#e1c9a6',a);}
      ellipse(dx,-h,3*size,3*size,'#f9e5af');
    }
  }else{
    stroke(0,0,sway,-stem,'#9bafab',1.3*size);
    for(let i=0;i<3;i++){const dx=(i-1)*20*size+sway,h=stem*(.58+i*.17);stroke(sway,-h-10*size,dx,-h,'#b6c4b2',size);stroke(dx,-h,dx,-h+12*size,'#c3c5df',size);ellipse(dx,-h+15*size,5*size,8*size,'#c2b8dc',-.2+sway*.03);ellipse(dx,-h+12*size,2*size,3*size,'#eeebda');glow(dx,-h+15*size,18*size,'#d6c9f0',.17+pulse*.15);}
  }
  g.restore();
}

new ResizeObserver(resize).observe(canvas);resize();
function draw(plants,selection,events,transitions,now){
effects=events.filter(e=>now>=e.time&&now-e.time<2500);
const t=reduced?0:now/1000;landscape(t);
for(const e of effects){const age=(now-e.time)/2500;g.save();g.globalAlpha=(1-age)*.5;g.strokeStyle=gardenKinds[e.kind].color;g.beginPath();g.ellipse(e.x*width,e.y*height,10+age*80,4+age*20,0,0,Math.PI*2);g.stroke();g.restore();}
for(const p of [...plants].sort((a,b)=>a.y-b.y)){
const level=stageOf(p),x=p.x*width,y=p.y*height,scale=clamp(width/850,.85,1.25);
if(level>=2)plantDrawing({...p,held:p.held+level*.5},now,t);
else{
const h=(level?43:20)*scale,sway=Math.sin(t*.6+p.x*8)*2;
ellipse(x,y,21*scale,6*scale,'#759c7850');stroke(x,y,x+sway,y-h,'#a2bd8a',1.7*scale);
if(level){ellipse(x-8*scale,y-h*.4,12*scale,4*scale,'#93b487',.5);ellipse(x+8*scale,y-h*.66,12*scale,4*scale,'#b3c798',-.5);}
glow(x,y-h,30*scale,gardenKinds[p.kind].color,.2);
ellipse(x+sway,y-h,(level?8:5)*scale,(level?11:7)*scale,gardenKinds[p.kind].color,-.1);
}
const h=(level>=2?(52+p.held*15+level*7.5)*scale*(.7+p.y*.5):level?43*scale:20*scale);
if(p.mix.length>1){
for(let i=0;i<p.mix.length;i++){const m=p.mix[i],a=i*Math.PI*2/p.mix.length+t*.2,px=x+Math.cos(a)*23*scale,py=y-h+Math.sin(a)*10*scale;stroke(x,y-h,px,py,gardenKinds[m.kind].color+'88');ellipse(px,py,m.kind==='air'?3*scale:8*scale,m.kind==='air'?7*scale:3*scale,gardenKinds[m.kind].color,a);glow(px,py,18*scale,gardenKinds[m.kind].color,.12);}
}
if(level===3){glow(x,y-h,55*scale,'#efe6b9',.13);ellipse(x+16*scale,y-h*.75,3*scale,3*scale,'#f0dcaa');}
const chosen=selection.indexOf(p.id);
if(chosen>=0){g.save();g.strokeStyle=['#e3d49d','#b7d5e3','#ceb6eb'][chosen];g.lineWidth=1.5;g.beginPath();g.ellipse(x,y+3,32*scale,11*scale,0,0,Math.PI*2);g.stroke();g.restore();}
g.font=`${width<600?10:11}px "Microsoft YaHei",sans-serif`;g.textAlign='center';g.fillStyle=chosen>=0?'#e5e9cb':'#c0cebb';g.fillText(width<600?`${plants.indexOf(p)+1}${chosen>=0?' / '+'ABC'[chosen]:''}`:`${plants.indexOf(p)+1} · ${stageName(p)}${p.mix.length>1?' / 混合':''}`,x,y+25*scale);
}
for(const transition of transitions){const age=(now-transition.time)/1500;if(age<0||age>1)continue;
const u=ease(age),x=(transition.from.x+(transition.to.x-transition.from.x)*u)*width,y=(transition.from.y+(transition.to.y-transition.from.y)*u)*height-Math.sin(u*Math.PI)*45;
g.save();g.globalAlpha=1-u;glow(x,y,26,transition.color,.45);ellipse(x,y,6*(1-u)+2,6*(1-u)+2,transition.color);g.restore();
}
}
return {draw,size:()=>({width,height})};
}
