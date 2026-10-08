/* Scientifically constrained teaching diagrams.
 * The collapse/null-ray/temperature values are computed by BlackHoleModel.
 * Gas settling is explicitly a mechanism illustration, not a fluid simulation.
 */
window.BlackHolePhysics = (() => {
  'use strict';
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  const PALETTE={gold:'#ffbd72',blue:'#82d4ed',white:'#eff4fc',muted:'#a5b3c8',red:'#ee826d',green:'#8fdbb6',bg:'#080f1d',grid:'#26374d'};
  function create(canvas) {
    const ctx=canvas.getContext('2d');
    let width=0,height=0,dpr=1;
    const C=PALETTE;
    function resize() {
      const cb=canvas.getBoundingClientRect(),pb=canvas.parentElement.getBoundingClientRect();
      const b=cb.width>20&&cb.height>20?cb:pb;
      width=Math.max(1,b.width);height=Math.max(1,b.height);dpr=Math.min(window.devicePixelRatio||1,2);
      const w=Math.round(width*dpr),h=Math.round(height*dpr);
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    function text(s,x,y,color=C.muted,size=12,align='left',weight=400) {
      ctx.fillStyle=color;ctx.font=weight+' '+size+'px "Segoe UI","Microsoft YaHei",sans-serif';
      ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(String(s),x,y);
    }
    function wrap(s,x,y,w,color=C.muted,size=12,lineHeight=19,align='left',weight=400) {
      ctx.font=weight+' '+size+'px "Segoe UI","Microsoft YaHei",sans-serif';
      let row='',line=0;
      for(const ch of String(s)){
        if(ch==='\n'||(row&&ctx.measureText(row+ch).width>w)){
          text(row,x,y+line*lineHeight,color,size,align,weight);line++;row=ch==='\n'?'':ch;
        }else row+=ch;
      }
      if(row){text(row,x,y+line*lineHeight,color,size,align,weight);line++;}
      return line*lineHeight;
    }
    function line(x1,y1,x2,y2,col=C.grid,lw=1,dashed=false) {
      ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.setLineDash(dashed?[4,4]:[]);
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);
    }
    function circle(x,y,r,col,fill=false,lw=1.2,dashed=false) {
      ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,Math.PI*2);ctx.strokeStyle=col;ctx.fillStyle=col;
      ctx.lineWidth=lw;ctx.setLineDash(dashed?[4,4]:[]);fill?ctx.fill():ctx.stroke();ctx.setLineDash([]);
    }
    function arrow(x,y,x2,y2,col,lw=2,tip=7) {
      line(x,y,x2,y2,col,lw);const a=Math.atan2(y2-y,x2-x);
      ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x2,y2);
      ctx.lineTo(x2-tip*Math.cos(a-.45),y2-tip*Math.sin(a-.45));
      ctx.lineTo(x2-tip*Math.cos(a+.45),y2-tip*Math.sin(a+.45));ctx.closePath();ctx.fill();
    }
    function panel(x,y,w,h) {
      ctx.fillStyle='#111c2dcc';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#2a3b51';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
    }
    function glow(x,y,r,col='#ffce86',alpha=1) {
      if(alpha<=0)return;
      r=Math.max(.1,r);
      ctx.save();ctx.globalAlpha=clamp(alpha);
      const g=ctx.createRadialGradient(x-r*.2,y-r*.2,0,x,y,r*1.27);
      g.addColorStop(0,'#fff6df');g.addColorStop(.32,col);g.addColorStop(.72,col+'d9');g.addColorStop(1,col+'00');
      ctx.fillStyle=g;ctx.fillRect(x-r*1.3,y-r*1.3,r*2.6,r*2.6);ctx.restore();
    }
    function background() {
      ctx.clearRect(0,0,width,height);ctx.fillStyle=C.bg;ctx.fillRect(0,0,width,height);
      const g=ctx.createRadialGradient(width*.48,height*.45,10,width*.48,height*.45,width*.7);
      g.addColorStop(0,'#15243e44');g.addColorStop(1,'#080f1d00');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
    }
    function title(s,sub,inset=false) {
      const x=inset?12:18,y=inset?20:82;
      text(s,x,y,C.white,inset?12:15,'left',600);
      if(sub)wrap(sub,x,y+(inset?19:23),width-2*x,C.muted,inset?10:12,inset?15:18);
    }
    function footer(s,color=C.muted) {
      wrap(s,18,height-92,width-36,color,12,18);
    }
    function stellar(m) {
      const compact=width<600,support=m.comparing||m.stage===1?1:clamp(m.support==null?.35:m.support);
      title(m.stage===1?'恒星为何没有一直向内塌缩？':'晚期核心为何会失去平衡？','机制示意：箭头表示作用方向，长度仅比较支撑强弱。');
      const cy=height*.48+15,r=Math.min(compact?80:107,width*.22,(height-235)*.28);
      const cx=width/2;
      glow(cx,cy,r);
      circle(cx,cy,r*.42,'#fff8d899');
      text('核心',cx,cy+5,'#51313c',13,'center',600);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4,cs=Math.cos(a),sn=Math.sin(a);
        arrow(cx+cs*(r+45),cy+sn*(r+45),cx+cs*(r+11),cy+sn*(r+11),C.blue);
        if(support>.01)arrow(cx+cs*r*.47,cy+sn*r*.47,cx+cs*(r*.47+support*r*.42),cy+sn*(r*.47+support*r*.42),C.gold,2.5);
      }
      const labelY=cy-r-63;
      text('引力：向中心',cx,labelY,C.blue,13,'center',600);
      text('压力梯度：向外',cx,cy+r+69,C.gold,13,'center',600);
      const y=Math.max(cy+r+99,height-165);
      wrap(support>.9?'聚变供能维持高温，压力梯度近似平衡引力。':'核心无法继续获得足够支撑，重力使物质向中心收缩。',cx,y,width-42,C.white,13,20,'center');
      footer(m.stage===1?'向内的引力始终存在；恒星靠内部压力梯度维持结构。':'以晚期大质量恒星为例：铁核演化、电子俘获等会削弱支撑。不是所有恒星都会形成黑洞。');
    }
    function collapse(m) {
      const p=m.comparing?0:clamp(m.progress||0),mass=m.mass||10;
      const k=window.BlackHoleModel.collapse(p,mass);
      title('最后一段收缩：同一发光事件，两种时钟','固定质量、零压力球形边界的自由下落模型；不是整颗恒星的完整演化。');
      const compact=width<600,x=18,y=137,w=width-36,gap=12;
      const avail=height-255;
      const pw=compact?w:(w-gap)/2,ph=compact?(avail-gap)/2:avail;
      const boxes=[{x,y,w:pw,h:ph},{x:compact?x:x+pw+gap,y:compact?y+ph+gap:y,w:pw,h:ph}];
      const a=boxes[0],b=boxes[1];
      boxes.forEach(z=>panel(z.x,z.y,z.w,z.h));
      text('边界自身的时钟',a.x+12,a.y+24,C.white,13,'left',600);
      text('远方收到同一事件的光',b.x+12,b.y+24,C.white,13,'left',600);
      const rs=Math.min(a.w*.10,(a.h-66)/8.6),cx=a.x+a.w/2,cy=a.y+(a.h-28)/2+7,r=rs*k.r;
      if(k.inside)circle(cx,cy,rs,'#02060c',true);
      circle(cx,cy,rs,C.blue,false,1.3,true);
      glow(cx,cy,r,'#ffca87');
      circle(cx,cy,r,C.gold,false,1.2);
      // Local boundary is deliberately visible after horizon crossing: this is a local geometric view.
      if(k.inside)text('边界继续向内',cx,cy-r-8,C.gold,11,'center');
      text('R = '+k.r.toFixed(2)+' Rₛ',a.x+12,a.y+a.h-42,C.gold,12);
      text('自身经过 '+(k.properTime*1000).toFixed(3)+' ms',a.x+12,a.y+a.h-20,C.white,12);
      text('虚线为 Rₛ 参考尺度',a.x+a.w-12,a.y+a.h-42,C.blue,11,'right');
      const bx=b.x+b.w/2,by=b.y+(b.h-36)/2+6;
      if(!k.inside) {
        const g=k.redshift,f=k.bolometricFactor;
        const col=g>.6?'#ffb985':g>.35?'#f58054':'#c14543';
        // A received-light patch, not a computed stellar photograph.
        glow(bx,by,Math.min(b.w*.17,(b.h-62)*.27),col,f);
        text('接收光信号',bx,by+Math.min(29,b.h*.15),C.muted,11,'center');
        text('频率 × '+g.toFixed(3)+' · 强度 × '+f.toFixed(4),b.x+12,b.y+b.h-42,C.red,12);
        text('到达时刻 '+(k.arrival*1000).toFixed(3)+' ms',b.x+12,b.y+b.h-20,C.white,12);
      } else {
        wrap('这个事件发出的光\n无法到达外部',bx,by-5,b.w-30,C.blue,13,21,'center',600);
        text('没有对应的远方接收时刻',bx,b.y+b.h-20,C.muted,12,'center');
      }
      footer('Rₛ = '+k.rsKm.toFixed(1)+' km（'+mass+' M☉）。靠近视界时，到达延迟增长、光红移并变暗；边界自身可在有限时间穿过。',C.white);
    }
    function light(m) {
      title('视界为什么是一条无法逃出的边界？','出射径向光线：由方程 dr/dv = ½(1 − Rₛ/r) 积分计算。');
      const compact=width<600,x=compact?47:62,y=145,w=width-x-28,h=height-y-231;
      const xmax=3.45,vmax=4;
      const px=r=>x+r/xmax*w,py=v=>y+h-v/vmax*h;
      for(let v=0;v<=4;v++){line(x,py(v),x+w,py(v),C.grid);text(v, x-10,py(v)+4,C.muted,11,'right');}
      for(const r of [.5,1,1.5,2,2.5,3]){line(px(r),y,px(r),y+h,C.grid);text(r.toFixed(1),px(r),y+h+21,C.muted,11,'center');}
      arrow(x,y+h,x+w+5,y+h,C.muted,1,5);arrow(x,y+h,x,y-5,C.muted,1,5);
      text('r / Rₛ →',x+w,y+h+44,C.muted,12,'right');
      text('未来 v（Rₛ/c）',x-29,y-12,C.muted,11);
      ctx.fillStyle='#ee826d0e';ctx.fillRect(x,y,px(1)-x,h);
      line(px(1),y,px(1),y+h,C.blue,1.6,true);
      text('事件视界',px(1)+7,y+18,C.blue,12);
      const starts=[.7,1,1.3,1.8],cols=[C.red,C.blue,C.green,C.gold],rays=starts.map(r=>window.BlackHoleModel.radialLight(r));
      rays.forEach((pts,i)=>{
        ctx.strokeStyle=cols[i];ctx.lineWidth=i===1?2:2.3;ctx.beginPath();
        pts.forEach((q,j)=>j?ctx.lineTo(px(q[0]),py(q[1])):ctx.moveTo(px(q[0]),py(q[1])));ctx.stroke();
        const futureV=(((m.elapsed||0)*.26)%1)*vmax;
        if(futureV<=pts[pts.length-1][1]){
          const q=pts[Math.min(pts.length-1,Math.round(futureV/.025))];
          circle(px(q[0]),py(q[1]),4,cols[i],true);
        }
        circle(px(starts[i]),py(0),3,cols[i],true);
      });
      const ty=y+h+74;
      wrap('视界内：即使朝外发光，未来的 r 仍减小。',18,ty,width-36,C.red,12,18);
      wrap('视界上：出射光沿边界；视界外：出射光可到远方。',18,ty+23,width-36,C.white,12,18);
      footer('这是入射 Eddington–Finkelstein 时空坐标图：横轴是半径，纵轴是未来时间坐标，不是空间照片。');
    }
    function gas(m) {
      const angular=!m.comparing,p=clamp(m.progress||0),t=m.elapsed||0;
      title(angular?'外部气体为何形成一个盘？':'对照：没有角动量的径向落入','粒子机制示意；未求解真实气体的流体和磁场方程。');
      const cx=width/2,cy=height*.48+10,R=Math.min(width*.35,(height-275)*.47),flatten=1-.83*p;
      const horizon=R*.16;
      // Project 3D orbital motion. Vertical scatter settles while angular momentum remains.
      for(let i=0;i<280;i++){
        const seed=((i*17.613)%1),a=i*2.399+(angular?t*.33*(1+.8*seed):0);
        const q=(seed+t*.13)%1;
        const r=angular?R*(.40+.60*seed)*(1-.15*p):R*(1-.86*q);
        const x=cx+Math.cos(a)*r;
        const z=Math.sin(i*9.1)*R*.7*flatten;
        const y=cy+Math.sin(a)*r*.25+(angular?z:Math.sin(a)*r*.33);
        circle(x,y,i%9===0?2.1:1.3,angular?'#a7cfe8':'#91b7d8',true);
      }
      circle(cx,cy,horizon,'#01050b',true);circle(cx,cy,horizon,C.blue);
      text('黑洞',cx,cy+5,C.muted,11,'center');
      if(angular){
        ctx.strokeStyle=C.blue;ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(cx,cy,R*.79,R*.79*.25,0,-.55,.45);ctx.stroke();
        arrow(cx+R*.74,cy+R*.086,cx+R*.66,cy+R*.15,C.blue,1.5,6);
        text('先绕行',cx+R*.55,cy-R*.40,C.blue,12,'center');
        arrow(cx-R*.52,cy+R*.51,cx-R*.52,cy+R*.20,C.gold,1.5,6);
        text('轨道外的无规则运动被耗散',cx,cy+R*.65,C.gold,12,'center');
      }else{
        for(let i=0;i<6;i++){const a=i*Math.PI/3;arrow(cx+Math.cos(a)*R*.75,cy+Math.sin(a)*R*.60,cx+Math.cos(a)*R*.34,cy+Math.sin(a)*R*.27,C.blue,1.6);}
        text('直接向中心落下',cx,cy+R*.70,C.blue,13,'center');
      }
      footer(angular?'角动量使气体不能全部直冲中心；碰撞、耗散与辐射冷却可让轨道逐步集中到共同盘面。':'零角动量的理想气体可以径向落入。黑洞并不必然拥有吸积盘；成盘取决于外部供气及其角动量。',C.white);
    }
    function temperature(m) {
      const mass=m.mass||10,rate=m.comparing?0:(m.rate==null?1e-9:m.rate),M=window.BlackHoleModel;
      const u=M.units(mass,rate),peak=u.peakTemperature,wien=peak>0?.00289777/peak:Infinity;
      title('吸积盘为什么发光？','轨道能量通过耗散转为热与辐射；下面是零力矩薄盘模型的有效温度。');
      const compact=width<600,x=compact?53:70,y=190,w=width-x-29,h=height-y-178;
      const rmin=3,rmax=12,maxTemp=Math.max(1,u.peakTemperature/1e6*1.22);
      const px=r=>x+(r-rmin)/(rmax-rmin)*w,py=T=>y+h-T/1e6/maxTemp*h;
      for(let i=0;i<=4;i++){
        const val=maxTemp*i/4;line(x,py(val*1e6),x+w,py(val*1e6),C.grid);
        text(val.toFixed(1),x-9,py(val*1e6)+4,C.muted,11,'right');
      }
      for(const r of [3,4,6,8,10,12]){line(px(r),y,px(r),y+h,C.grid);text(r,px(r),y+h+21,C.muted,11,'center');}
      arrow(x,y+h,x+w+4,y+h,C.muted,1,5);arrow(x,y+h,x,y-5,C.muted,1,5);
      text('有效温度（百万 K）',x-33,y-15,C.muted,12);
      text('盘半径 r / Rₛ →',x+w,y+h+43,C.muted,12,'right');
      const points=[];
      for(let i=0;i<=240;i++){const r=mix(rmin,rmax,i/240);points.push([px(r),py(M.diskTemperature(r,mass,rate))]);}
      ctx.beginPath();ctx.moveTo(x,y+h);points.forEach(q=>ctx.lineTo(q[0],q[1]));ctx.lineTo(x+w,y+h);ctx.closePath();
      const grad=ctx.createLinearGradient(0,y,0,y+h);grad.addColorStop(0,'#ffbd7270');grad.addColorStop(1,'#ffbd7203');ctx.fillStyle=grad;ctx.fill();
      ctx.beginPath();points.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.strokeStyle=C.gold;ctx.lineWidth=2.5;ctx.stroke();
      if(peak>0){
        circle(px(49/12),py(peak),4,C.gold,true);
        const lx=Math.min(x+w-145,px(49/12)+16);
        text('峰值 '+(peak/1e6).toFixed(2)+' 百万 K',lx,y+18,C.gold,12);
        text('λ峰 ≈ '+(wien*1e9).toFixed(2)+' nm',lx,y+39,C.white,12);
      }else text('没有供气：该模型没有吸积辐射',x+14,y+34,C.blue,13);
      wrap(mass+' M☉ · 供给率 '+rate.toExponential(1)+' M☉/年',18,145,width-36,C.white,12,18);
      const spectrum=peak>1e6?'辐射峰值位于 X 射线':peak>1e5?'辐射峰值位于极紫外':peak>0?'峰值由温度决定':'没有温度峰值';
      footer(spectrum+'。橙色游戏画面是可视化配色，不是肉眼所见的真实颜色；视界外的热气体发光，黑洞本身不发这圈光。',C.white);
    }
    function probeInset(m) {
      title('弯曲光路 → 背面盘的影像','固定 10° 参考视角 · 方程计算',true);
      const result=window.BlackHoleModel.probes(),rays=result.rays;
      const top=55,bottom=height-40,left=14,right=width-14;
      const all=rays.flatMap(r=>r.points);
      const yMin=Math.min(-3,...all.map(p=>p[1]))-1,yMax=Math.max(5,...all.map(p=>p[1]))+1;
      const scale=Math.min((right-left)/34,(bottom-top)/(yMax-yMin));
      const ox=left+10*scale,oy=top+yMax*scale;
      const px=z=>ox+z*scale,py=y=>oy-y*scale;
      // The reference is a section through a flat equatorial disk.
      line(px(-8.7),py(0),px(-3.05),py(0),C.gold,5);
      line(px(3.05),py(0),px(8.7),py(0),'#ffbd723d',3);
      circle(ox,oy,scale,'#010308',true);
      circle(ox,oy,scale,C.blue,false,1);
      circle(ox,oy,1.5*scale,'#a5b3c859',false,1,true);
      const colors=[C.gold,C.blue];
      rays.forEach((ray,i)=>{
        const col=colors[i%2];ctx.beginPath();
        ray.points.forEach((p,j)=>j?ctx.lineTo(px(p[2]),py(p[1])):ctx.moveTo(px(p[2]),py(p[1])));
        ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.stroke();
        const q=((m.elapsed||0)*.20+i*.28)%1,index=Math.floor((1-q)*(ray.points.length-1)),p=ray.points[index];
        circle(px(p[2]),py(p[1]),2.7,col,true);
        const source=ray.points[ray.points.length-1];circle(px(source[2]),py(source[1]),2.3,col,true);
      });
      const camera=result.camera;
      circle(px(camera[2]),py(camera[1]),3.2,C.white,true);
      text('观察者',Math.min(width-12,px(camera[2])+2),py(camera[1])-11,C.white,10,'right');
      text('背面盘',px(-6),py(0)+18,C.gold,10,'center');
      text('Rₛ',ox+scale+3,oy+3,C.blue,9);
      wrap('两条光路来自盘的两个区域；亮弧是影像。',12,height-22,width-24,C.muted,10,14);
    }
    function draw(m) {
      resize();background();
      if(m.inset||m.stage===7){probeInset(m);return;}
      if(m.stage===1||m.stage===2)stellar(m);
      else if(m.stage===3)collapse(m);
      else if(m.stage===4)light(m);
      else if(m.stage===5)gas(m);
      else if(m.stage===6)temperature(m);
    }
    return {draw,resize,readPixels:()=>ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas};
  }
  return {create};
})();
