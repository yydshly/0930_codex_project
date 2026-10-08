// Original Canvas garden renderer. The 3D product lives in product-renderer.js.
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function surface(canvas){
  const r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
  const w=Math.max(1,r.width),h=Math.max(1,r.height);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  }
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  return {ctx,w,h};
}
export function gardenAreas(s){const total=s.width*s.depth,pond=total*s.pond/100,green=total*s.green/100,deck=total*(s.priority==='gather'?.3:.18);return{total,pond,green,deck,other:total-pond-green-deck};}
export function drawGarden(canvas,s){
  if(canvas.closest('[hidden]'))return;
  const {ctx,w,h}=surface(canvas),night=s.time==='night',areas=gardenAreas(s);
  ctx.fillStyle=night?'#142a34':'#eef3f5';ctx.fillRect(0,0,w,h);
  const sc=Math.min((w-72)/s.width,(h-64)/s.depth),pw=s.width*sc,ph=s.depth*sc,px=(w-pw)/2,py=(h-ph)/2;
  ctx.fillStyle=night?'#3b494a':'#e4e1d5';ctx.fillRect(px,py,pw,ph);
  ctx.strokeStyle=night?'#7caeb755':'#58738022';ctx.lineWidth=1;ctx.beginPath();
  for(let x=0;x<=s.width;x++){ctx.moveTo(px+x*sc,py);ctx.lineTo(px+x*sc,py+ph);}for(let y=0;y<=s.depth;y++){ctx.moveTo(px,py+y*sc);ctx.lineTo(px+pw,py+y*sc);}ctx.stroke();
  const deckRatio=s.priority==='gather'?.3:.18,dw=pw*deckRatio,lw=pw-dw,greenHeight=ph*(s.green/100)/(1-deckRatio)/2;
  ctx.fillStyle=night?'#344e40':'#a8bfa0';ctx.fillRect(px,py,lw,greenHeight);ctx.fillRect(px,py+ph-greenHeight,lw,greenHeight);
  ctx.fillStyle=night?'#745a42':'#b48c62';ctx.fillRect(px+pw-dw,py,dw,ph);
  ctx.strokeStyle=night?'#9b7e62':'#d9b993';ctx.beginPath();for(let x=px+pw-dw+6;x<px+pw;x+=9){ctx.moveTo(x,py);ctx.lineTo(x,py+ph);}ctx.stroke();
  const poolHeight=ph-2*greenHeight,poolWidth=areas.pond*sc*sc/poolHeight,cx=px+poolWidth/2,cy=py+ph/2;
  const water=ctx.createLinearGradient(px,py+greenHeight,px+poolWidth,py+ph-greenHeight);water.addColorStop(0,night?'#194c64':'#62b2c2');water.addColorStop(1,night?'#24677b':'#338b9f');ctx.fillStyle=water;ctx.fillRect(px,py+greenHeight,poolWidth,poolHeight);
  ctx.save();ctx.beginPath();ctx.rect(px+2,py+greenHeight+2,poolWidth-4,poolHeight-4);ctx.clip();ctx.strokeStyle=night?'#8bd5e333':'#b5e7e455';ctx.lineWidth=1;for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(cx-15,cy,i*sc*.19+12,i*sc*.1+7,-.12,0,Math.PI*2);ctx.stroke();}ctx.restore();
  const plants=Math.round(s.green/2);for(let i=0;i<plants;i++){
    const x=px+sc*.4+(i%(plants/2|0))*((pw-dw-sc*.7)/Math.max(1,(plants/2|0)-1)),y=py+(i<plants/2?greenHeight*.5:ph-greenHeight*.5);
    const r=sc*(.18+(i%3)*.07);ctx.fillStyle=night?'#385344':'#658b67';ctx.beginPath();ctx.arc(x,y,r+3,0,Math.PI*2);ctx.fill();ctx.fillStyle=night?'#597454':'#92b084';ctx.beginPath();ctx.arc(x-r*.15,y-r*.2,r*.77,0,Math.PI*2);ctx.fill();
  }
  const tx=px+pw-dw/2,ty=py+ph*.51;ctx.fillStyle=night?'#c3b398':'#ede2c9';ctx.beginPath();ctx.arc(tx,ty,Math.min(dw*.27,sc*.48),0,Math.PI*2);ctx.fill();
  for(let a=0;a<4;a++){ctx.fillStyle=night?'#a18a6f':'#695f4f';const ang=a*Math.PI/2;ctx.fillRect(tx+Math.cos(ang)*dw*.34-4,ty+Math.sin(ang)*sc*.66-4,8,8);}
  if(night){for(const [x,y] of[[px+sc*.5,py+ph*.5],[tx,py+sc*.5],[tx,py+ph-sc*.5]]){const glow=ctx.createRadialGradient(x,y,0,x,y,sc*.8);glow.addColorStop(0,'#ffd78690');glow.addColorStop(1,'#ffd78600');ctx.fillStyle=glow;ctx.fillRect(x-sc,y-sc,sc*2,sc*2);ctx.fillStyle='#ffe8b4';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}}
  ctx.strokeStyle=night?'#c6d4d4':'#5a6871';ctx.lineWidth=1.5;ctx.strokeRect(px,py,pw,ph);
  const fontSize=w<500?10:12;ctx.font=`${fontSize}px system-ui`;ctx.fillStyle=night?'#c5d5db':'#536471';ctx.textAlign='center';ctx.fillText(`${s.width} m`,px+pw/2,py-12);ctx.save();ctx.translate(px-16,py+ph/2);ctx.rotate(-Math.PI/2);ctx.fillText(`${s.depth} m`,0,0);ctx.restore();
  ctx.fillStyle='#f1fdff';ctx.fillText('水景',cx,cy+4);ctx.fillStyle=night?'#d6f0cd':'#315637';ctx.fillText('绿化',px+lw/2,py+greenHeight*.8);ctx.fillStyle=night?'#fbf4db':'#fff9ed';ctx.fillText('活动平台',tx,py+ph*.83);ctx.fillStyle=night?'#c5d5db':'#536471';ctx.font=`${w<500?9:10}px system-ui`;ctx.fillText('参数概念布局 / 区域面积按输入计算 / 需现场测量后深化',w/2,h-6);
}
