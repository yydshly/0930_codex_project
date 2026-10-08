const clamp=v=>Math.max(0,Math.min(1,v)),mix=(a,b,k)=>a+(b-a)*k;
const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
function color(a,b,k){return '#'+[1,3,5].map(i=>Math.round(mix(parseInt(a.slice(i,i+2),16),parseInt(b.slice(i,i+2),16),clamp(k))).toString(16).padStart(2,'0')).join('');}
function box(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function disk(c,k,fill){c.beginPath();c.arc(k.x,k.y,k.radius,0,Math.PI*2);c.fillStyle=fill;c.fill();}
function copy(c,value,x,y,size,fill,width=1100,weight=500,center=true){c.font=`${weight} ${size}px Arial,'Microsoft YaHei',sans-serif`;c.textAlign=center?'center':'left';let s=String(value);while(s.length&&c.measureText(s).width>width)s=s.slice(0,-1);c.fillStyle=fill;c.fillText(s+(s!==String(value)?'…':''),x,y);c.textAlign='left';}
export function renderLaunchOpening(c,state,sequence,t){
 const k=sequence.knob;
 c.save();c.shadowColor=t.accent+'35';c.shadowBlur=k.on*26;
 box(c,351,203,578,264,132,color(t.bg,t.accent,k.on),t.accent);
 c.restore();disk(c,k,color(t.accent,'#fffef8',k.on));
 copy(c,state.scenes[0].headline.replaceAll('\n',''),640,580,54,t.ink,1080,800);
 copy(c,`${sequence.operation.inputCount} 条研究卡 · 开启本地整理`,640,634,20,t.muted);
}
export function renderLaunchInputSurface(c,sequence,t){
 const u=sequence.input,k=sequence.knob;
 c.save();c.shadowColor='#10161025';c.shadowBlur=30*u;c.shadowOffsetY=12*u;
 box(c,mix(351,166,u),mix(203,219,u),mix(578,948,u),mix(264,300,u),mix(132,5,u),color(t.accent,'#fffdf4',u));
 c.restore();
 box(c,mix(351,166,u),mix(203,219,u),mix(578,948,u),mix(264,300,u),mix(132,5,u),null,color(t.accent,'#d9dbd2',u));
 disk(c,k,color('#fffef8',t.accent,u));
}
export function renderLaunchClosure(c,state,pack,sequence,t,drawDocument){
 const f=sequence.fold,k=sequence.knob;
 if(f<1){
  c.save();c.globalAlpha=1-ease(f/.58);
  c.translate(640,335);c.scale(1-.66*f,1-.66*f);c.translate(-640,-335);
  drawDocument();c.restore();
 }
 // The file's orange corner mark travels into the original switch geometry.
 c.save();c.globalAlpha=f;c.shadowColor=t.accent+'35';c.shadowBlur=20*(1-sequence.close);
 box(c,mix(111,351,f),mix(111,203,f),mix(1058,578,f),mix(481,264,f),mix(5,132,f),null,color('#69725e',t.accent,f));
 c.restore();
 c.save();c.shadowColor=t.accent;c.shadowBlur=18*sequence.close;disk(c,k,t.accent);c.restore();
 c.save();c.globalAlpha=ease((f-.64)/.36);
 copy(c,sequence.close>.98?'本地整理结束':'成果收拢，保留来源',640,146,32,t.ink,1100,700);
 copy(c,`${pack.includedCount} 条纳入 · ${pack.mergedCount} 条合并 · ${pack.pendingCount} 条待补`,640,561,24,t.ink);
 copy(c,`成果可导出 / ${pack.filename}`,640,610,23,t.accent,1100,700);
 copy(c,'完整内容与待补清单继续保留在成果区和实际文件中。',640,653,18,t.muted);
 c.restore();
}
