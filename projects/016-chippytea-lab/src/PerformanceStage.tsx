import React, { useEffect, useRef, useState } from 'react';

type Project = {id:number;name:string;coverUrl:string;serial:number};
export type PerformanceStageProps = {
  project:Project;playing:boolean;runKey:number;
  onComplete:()=>void;onClose:()=>void;clock:()=>number;energy?:()=>number;
};
type Throw = {x:number;y:number;at:number;seed:number};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>1-Math.pow(1-clamp(n),3);
const COLORS=['#F2B63C','#3F5FA8','#B4553D','#33302B'];
const CHAPTERS=[
  {word:'线索',line:'零散的发现，先放到同一张桌上。',label:'01 / GATHER THE CLUES'},
  {word:'连接',line:'批注、关联，让线索变成理解。',label:'02 / CONNECT THE IDEAS'},
  {word:'成册',line:'把来源、能力与场景，整理成自己的研究。',label:'03 / BIND THE RESEARCH'},
  {word:'入册',line:'留下一份可以再次打开的积累。',label:'04 / KEEP WHAT YOU LEARN'},
];
const NOTES=[
  {label:'原始线索',en:'SOURCE',accent:1},
  {label:'核心能力',en:'CAPABILITY',accent:0},
  {label:'交互证据',en:'EVIDENCE',accent:2},
  {label:'实现路径',en:'HOW IT WORKS',accent:1},
  {label:'适用场景',en:'OUR CONTEXT',accent:0},
  {label:'待验证',en:'NEXT QUESTION',accent:2},
];

/** Music-clock choreography binds research materials into a notebook.
 * Cover art is deliberately unused: the adaptation has its own vocabulary.
 * energy(), when supplied, comes from real audio analysis; no synthetic beat. */
export function PerformanceStage({project,playing,runKey,onComplete,onClose,clock,energy}:PerformanceStageProps){
  const canvasRef=useRef<HTMLCanvasElement>(null),stageRef=useRef<HTMLDivElement>(null);
  const heroRef=useRef<HTMLDivElement>(null),timelineRef=useRef<HTMLDivElement>(null);
  const current=useRef({project,playing,onComplete,clock,energy});
  current.current={project,playing,onComplete,clock,energy};
  const throws=useRef<Throw[]>([]),finished=useRef(false);
  const [chapter,setChapter]=useState(0),[reduced,setReduced]=useState(false),[done,setDone]=useState(false);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(media.matches);const update=()=>setReduced(media.matches);
    media.addEventListener('change',update);return()=>media.removeEventListener('change',update);
  },[]);

  useEffect(()=>{
    const canvas=canvasRef.current,stage=stageRef.current;if(!canvas||!stage)return;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    let width=1,height=1,frame=0,lastChapter=-1,lastTime=-1;
    finished.current=false;throws.current=[];setDone(false);setChapter(0);
    const resize=()=>{
      const box=stage.getBoundingClientRect();width=box.width;height=box.height;
      const ratio=Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
      canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
      ctx.setTransform(ratio,0,0,ratio,0,0);lastTime=-1;
    };
    resize();const observer=new ResizeObserver(resize);observer.observe(stage);
    function line(x1:number,y1:number,x2:number,y2:number,color:string,weight=2,seed=0){
      ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.beginPath();ctx.moveTo(x1,y1);
      ctx.quadraticCurveTo((x1+x2)/2+Math.sin(seed)*4,(y1+y2)/2+Math.cos(seed)*3,x2,y2);ctx.stroke();
    }
    function paperShape(w:number,h:number,seed:number){
      ctx.beginPath();ctx.moveTo(-w/2+1,-h/2);ctx.lineTo(w/2-12,-h/2+Math.sin(seed)*2);
      ctx.lineTo(w/2,-h/2+12);ctx.lineTo(w/2-1,h/2);ctx.lineTo(-w/2,h/2-2);ctx.closePath();
    }
    function paperClip(x:number,y:number,angle:number,scale:number,color='#3F5FA8'){
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);
      ctx.strokeStyle=color;ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(-6,19);ctx.lineTo(-6,-10);
      ctx.bezierCurveTo(-6,-22,11,-22,11,-10);ctx.lineTo(11,17);ctx.bezierCurveTo(11,29,-11,29,-11,17);ctx.lineTo(-11,-6);
      ctx.bezierCurveTo(-11,-12,0,-12,0,-6);ctx.lineTo(0,15);ctx.stroke();ctx.restore();
    }
    function note(x:number,y:number,w:number,h:number,angle:number,alpha:number,index:number,time:number,loudness:number){
      const item=NOTES[index%NOTES.length],accent=COLORS[item.accent];
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha;
      ctx.shadowColor='rgba(51,48,43,.15)';ctx.shadowBlur=12;ctx.shadowOffsetY=6;
      paperShape(w,h,index);ctx.fillStyle='#FFFDF6';ctx.fill();ctx.shadowColor='transparent';ctx.strokeStyle='#33302B';ctx.lineWidth=1.7+loudness*.65;ctx.stroke();
      ctx.fillStyle='#EEE7D8';ctx.beginPath();ctx.moveTo(w/2-12,-h/2);ctx.lineTo(w/2-12,-h/2+12);ctx.lineTo(w/2,-h/2+12);ctx.fill();
      line(w/2-12,-h/2,w/2-12,-h/2+12,'rgba(51,48,43,.25)',1);line(w/2-12,-h/2+12,w/2,-h/2+12,'rgba(51,48,43,.25)',1);
      const pad=w*.12,left=-w/2+pad;
      ctx.fillStyle=accent;ctx.globalAlpha=alpha*(.23+loudness*.1);ctx.fillRect(left-3,-h/2+pad+6,w*.61,15);ctx.globalAlpha=alpha;
      ctx.fillStyle='#33302B';ctx.textAlign='left';ctx.font=`700 ${w<120?12:16}px sans-serif`;ctx.fillText(item.label,left,-h/2+pad+19);
      ctx.fillStyle='#7A736A';ctx.font=`600 ${w<120?7:9}px monospace`;ctx.fillText(item.en,left,-h/2+pad+33);
      for(let j=0;j<3;j++)line(left,-h/2+pad+46+j*10,left+w*(.46+(j%2)*.12),-h/2+pad+45+j*10,'rgba(51,48,43,.26)',1,index*3+j);
      if(time>4&&!reduced){
        const mark=ease((time-4-index*.2)/.7);line(left,-h/2+pad+58,left+w*.42*mark,-h/2+pad+57,accent,2.7+loudness*1.3,index);
      }
      if(index%2===0){ctx.fillStyle='rgba(242,182,60,.65)';ctx.fillRect(-w*.19,-h/2-6,w*.38,13);}
      if(index%3===1)paperClip(w/2-21,-h/2+8,-.2,w<120?.6:.85);
      ctx.restore();
    }
    function connection(a:{x:number;y:number},b:{x:number;y:number},progress:number,index:number,loudness:number){
      if(progress<=0)return;
      const bend=index%2?40:-40,p=clamp(progress);
      ctx.strokeStyle=index%2?'#3F5FA8':'#C07F17';ctx.lineWidth=2.1+loudness*1.4;ctx.beginPath();
      for(let step=0;step<=Math.ceil(36*p);step++){
        const q=Math.min(p,step/36),x=a.x+(b.x-a.x)*q,y=a.y+(b.y-a.y)*q+Math.sin(q*Math.PI)*bend;
        if(step===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.stroke();
      const x=a.x+(b.x-a.x)*p,y=a.y+(b.y-a.y)*p+Math.sin(p*Math.PI)*bend;
      ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(x,y,3.5+loudness*2,0,Math.PI*2);ctx.fill();
    }
    function paperShard(x:number,y:number,angle:number,size:number,index:number,opacity:number){
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=opacity;ctx.fillStyle=index%4===0?'#F2B63C':'#FFFDF6';ctx.strokeStyle=index%4===0?'#C07F17':'#3F5FA8';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(-size,-size*.7);ctx.lineTo(size,-size*.7);ctx.lineTo(size,size*.5);ctx.lineTo(0,size*.8);ctx.lineTo(-size,size*.45);ctx.closePath();ctx.fill();ctx.stroke();
      line(-size*.65,-size*.25,size*.6,-size*.27,'rgba(51,48,43,.25)',.8,index);ctx.restore();
    }
    function paint(time:number){
      const t=Math.max(0,Math.min(time,16)),mobile=width<650,cx=width*.5,cy=height*(mobile?.38:.36);
      const unit=Math.min(width,height*.60),motion=reduced?0:1;
      const loudness=clamp(current.current.energy?.()||0)*motion;
      const scene=t<4?0:t<8?1:t<12?2:3;
      if(scene!==lastChapter){lastChapter=scene;setChapter(scene);}
      ctx.clearRect(0,0,width,height);ctx.lineCap='round';ctx.lineJoin='round';
      const gather=ease(t/1.2),bind=ease((t-8)/1.75),seal=ease((t-12)/.7);
      // Stationery strokes establish a research desk without borrowed mascots.
      ctx.save();ctx.globalAlpha=.07+loudness*.025;ctx.fillStyle=scene<2?'#3F5FA8':'#F2B63C';
      ctx.beginPath();ctx.ellipse(cx,cy,unit*.43*(1+loudness*.04),unit*.30,-.05,0,Math.PI*2);ctx.fill();ctx.restore();
      const grid=mobile?33:44;
      for(let x=cx-unit*.55;x<=cx+unit*.55;x+=grid)for(let y=cy-unit*.36;y<=cy+unit*.36;y+=grid){ctx.fillStyle='rgba(51,48,43,.1)';ctx.beginPath();ctx.arc(x,y,.7,0,Math.PI*2);ctx.fill();}
      for(let i=0;i<3;i++){
        const y=cy+unit*.35+i*7;
        line(cx-unit*.51,y,cx+unit*.51,y+(i-1)*3,i===1?'rgba(63,95,168,.2)':'rgba(51,48,43,.1)',i===1?2+loudness:1,i+t*.4*motion);
      }
      const positions=NOTES.map((_,i)=>{
        const a=i*Math.PI/3-.78,r=unit*(mobile?.33:.36),open=reduced?1:gather;
        const scatterX=cx+Math.cos(a)*r*open,scatterY=cy+Math.sin(a)*r*.72*open;
        const rotate=Math.sin(i*9+t*.9*motion)*.21;
        return {x:scatterX+Math.sin(i)*loudness*3,y:scatterY-Math.sin(i*2.1)*loudness*8,angle:rotate};
      });
      // Step 1: fragments move in arcs. Step 2: a pen links and annotates them.
      if(scene<2||bind<1){
        const pairs=[[0,1],[1,3],[3,4],[4,2],[2,5],[5,0],[0,4]];
        if(scene===1)for(let i=0;i<pairs.length;i++)connection(positions[pairs[i][0]],positions[pairs[i][1]],reduced?1:ease((t-4-i*.26)/1.35),i,loudness);
        for(let i=0;i<NOTES.length;i++){
          const p=positions[i],flight=scene>=2?(reduced?1:ease((t-8-i*.08)/1.45)):0;
          const targetX=cx+(i-2.5)*2,targetY=cy+(i-2.5)*3;
          const x=p.x+(targetX-p.x)*flight,y=p.y+(targetY-p.y)*flight;
          note(x,y,(mobile?98:155)*(1-flight*.08),(mobile?105:131)*(1-flight*.06),p.angle*(1-flight),reduced?1:Math.min(1,t*2)*(1-flight*.85),i,t,loudness);
        }
        if(scene===1){
          const textAlpha=ease((t-5.2)/.5);ctx.save();ctx.globalAlpha=textAlpha;
          const penProgress=reduced?.6:(t-4)/4,px=cx-unit*.36+unit*.72*penProgress,py=cy+Math.sin(penProgress*Math.PI*2)*unit*.1;
          ctx.translate(px,py);ctx.rotate(-.72);ctx.fillStyle='#3F5FA8';ctx.fillRect(-4,-56,8,48);ctx.strokeStyle='#33302B';ctx.lineWidth=1.4;ctx.strokeRect(-4,-56,8,48);
          ctx.fillStyle='#F2B63C';ctx.beginPath();ctx.moveTo(-4,-8);ctx.lineTo(0,4);ctx.lineTo(4,-8);ctx.fill();ctx.restore();
        }
      }
      if(scene>=2){
        // Ruled sheets fold beneath a bound notebook and a paperclip lands.
        const bookW=mobile?225:340,bookH=mobile?228:270;
        if(bind<.95&&!reduced)for(let i=0;i<4;i++){
          ctx.save();ctx.translate(cx,cy);ctx.rotate((1-bind)*(.6-i*.34));
          const pageW=bookW*(.45+.55*bind);ctx.fillStyle='#FFFDF6';ctx.strokeStyle='rgba(51,48,43,.4)';ctx.lineWidth=1.2;
          ctx.fillRect(-pageW/2+i*2,-bookH/2+i*3,pageW,bookH);ctx.strokeRect(-pageW/2+i*2,-bookH/2+i*3,pageW,bookH);
          for(let row=0;row<5;row++)line(-pageW/2+22,-bookH/2+50+row*29,pageW/2-15,-bookH/2+49+row*29,'rgba(63,95,168,.15)',1,row);
          ctx.restore();
        }
        const annotation=Math.min(1,ease((t-9.8)/.7)),labels=['可追溯','有解释','有场景','可再用'];
        for(let i=0;i<4;i++){
          const left=i%2===0,x=cx+(left?-1:1)*unit*(mobile?.35:.40),y=cy+(i<2?-.15:.18)*unit;
          ctx.save();ctx.globalAlpha=annotation*.65;
          line(x,y,cx+(left?-1:1)*bookW*.38,cy+(i<2?-1:1)*bookH*.24,'#3F5FA8',1.4+loudness,i+t*.15*motion);
          ctx.fillStyle='#3F5FA8';ctx.font=`600 ${mobile?10:13}px sans-serif`;ctx.textAlign=left?'right':'left';ctx.fillText(labels[i],x+(left?-8:8),y-5);ctx.restore();
        }
        if(t<12){
          const clipTime=reduced?1:ease((t-9)/1.3),x=cx+unit*.4*(1-clipTime)+bookW*.34*clipTime,y=cy-unit*.32*(1-clipTime)-bookH*.44*clipTime;
          paperClip(x,y,1.3*(1-clipTime)-.1,mobile?.75:1.1,'#C07F17');
        }
      }
      if(scene===3){
        // The receipt lands; rays and folded sheets carry the moment outward.
        for(let i=0;i<20;i++){
          const a=i*Math.PI/10,r=unit*.25,l=unit*(.11+seal*.12)*(1+loudness*.14);
          ctx.save();ctx.globalAlpha=(.32+loudness*.18)*seal;line(cx+Math.cos(a)*r,cy+Math.sin(a)*r*.75,cx+Math.cos(a)*(r+l),cy+Math.sin(a)*(r+l)*.75,i%3===0?'#3F5FA8':'#C07F17',i%3===0?2.4:1.3,i);ctx.restore();
        }
        const age=t-12;
        if(!reduced)for(let i=0;i<(mobile?42:72);i++){
          const a=i*2.399963+project.id,r=unit*.16+age*(39+i%9*10);
          const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r*.65+age*age*10;
          paperShard(x,y,a+age*(i%2?1:-1),i%4===0?6:4,i,seal*clamp((17-t)/2));
        }
        // A double underline finishes on the final phrase of the composition.
        const under=reduced?1:ease((t-14)/1.5),span=unit*(mobile?.29:.32);
        line(cx-span,cy+unit*.36,cx-span+span*2*under,cy+unit*.36+3,'#C07F17',3.2+loudness,project.id);
        line(cx-span+4,cy+unit*.36+9,cx-span+4+(span*2-8)*under,cy+unit*.36+8,'rgba(192,127,23,.4)',1.4,project.id+1);
      }
      throws.current=throws.current.filter(p=>t-p.at<2.7);
      for(const item of throws.current){
        const age=t-item.at;if(age<0)continue;
        for(let i=0;i<14;i++){
          const a=i*Math.PI*2/14+item.seed,v=80+i*5;
          paperShard(item.x+Math.cos(a)*age*v,item.y+Math.sin(a)*age*v+age*age*45,a+age*3,4,i,clamp(1-age/2.7));
        }
        ctx.save();ctx.globalAlpha=clamp(1-age);ctx.strokeStyle='#3F5FA8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(item.x,item.y,age*80,0,Math.PI*2);ctx.stroke();ctx.restore();
      }
      if(heroRef.current){
        const enter=reduced?(scene>=2?1:0):ease((t-9.3)/.65);
        heroRef.current.style.opacity=String(enter);
        heroRef.current.style.transform=`translate(-50%,-50%) scale(${.86+enter*.14+loudness*.008}) rotate(${(1-enter)*-8+Math.sin(t*2)*.45*motion}deg)`;
        heroRef.current.style.setProperty('--stamp-scale',String(reduced?1:1+(1-seal)*2.2));
        heroRef.current.style.setProperty('--stamp-opacity',String(seal));
        heroRef.current.style.setProperty('--bookmark-growth',String(reduced?1:ease((t-10)/.75)));
      }
      if(timelineRef.current)timelineRef.current.style.transform=`scaleX(${t/16})`;
      stage.dataset.chapter=String(scene);stage.dataset.playing=String(current.current.playing);stage.dataset.time=t.toFixed(2);stage.dataset.energy=loudness.toFixed(3);
      if(t>=16&&!finished.current){finished.current=true;setDone(true);current.current.onComplete();}
    }
    const loop=()=>{
      const time=Math.max(0,current.current.clock());
      if(time!==lastTime||lastTime<0){if(time<lastTime){throws.current=[];setDone(false);}lastTime=time;paint(time);}
      frame=requestAnimationFrame(loop);
    };
    frame=requestAnimationFrame(loop);return()=>{cancelAnimationFrame(frame);observer.disconnect();};
  },[runKey,project.id,reduced]);
  function throwPaper(event:React.PointerEvent<HTMLDivElement>){
    if(reduced||(event.target as HTMLElement).closest('button,a'))return;
    const box=event.currentTarget.getBoundingClientRect();
    throws.current.push({x:event.clientX-box.left,y:event.clientY-box.top,at:Math.min(current.current.clock(),16),seed:throws.current.length*.73});
  }
  const words=CHAPTERS[chapter];
  return <div className={`performance-stage${reduced?' is-reduced':''}`} ref={stageRef} role="region" aria-label={`${project.name} 的研究整理视听舞台`} data-playing={playing} onPointerDown={throwPaper}>
    <canvas ref={canvasRef} className="performance-canvas" aria-hidden="true" />
    <div className="performance-paper-texture" aria-hidden="true" />
    <header className="performance-heading"><div><span className="performance-eyebrow">RESEARCH, IN MOTION · 原创研究整理演出</span><p>{project.name}</p></div><button type="button" className="performance-close" onClick={onClose} aria-label="关闭视听舞台">×</button></header>
    <div className="performance-chapter-mark" aria-hidden="true"><span>{String(chapter+1).padStart(2,'0')}</span><i>/</i><span>04</span></div>
    <div className="performance-giant-word" key={chapter} aria-hidden="true">{words.word}</div>
    <div className="performance-hero performance-notebook" ref={heroRef}>
      <div className="performance-bookmark" aria-hidden="true" />
      <div className="performance-book-rings" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="performance-notebook-top"><span>RESEARCH NOTEBOOK</span><b>#{String(project.id).padStart(3,'0')}</b></div>
      <h3>{project.name}</h3>
      <svg className="performance-research-map" viewBox="0 0 280 95" role="img" aria-label="来源、能力和场景相互关联">
        <path d="M25 18Q43 13 77 17L77 55Q44 57 25 55Z M104 17Q126 15 159 18L159 56Q127 54 104 57Z M194 17Q219 13 252 18L252 57Q220 56 193 55Z" fill="#FFFDF6" stroke="#33302B" strokeWidth="1.8"/>
        <path d="M77 35Q91 30 105 35M159 35Q176 39 194 35M48 57Q118 90 223 57" fill="none" stroke="#3F5FA8" strokeWidth="2"/>
        <path d="M97 30L104 35L97 39M186 30L194 35L187 39" fill="none" stroke="#3F5FA8" strokeWidth="2"/>
        <path d="M31 25L68 24M111 26L153 25M201 24L244 25" fill="none" stroke="#F2B63C" strokeWidth="8" opacity=".55"/>
        <g fill="#33302B" fontSize="14" fontWeight="700" textAnchor="middle"><text x="51" y="42">来源</text><text x="132" y="42">能力</text><text x="223" y="42">场景</text></g>
        <text x="141" y="91" fill="#7A736A" fontSize="8" letterSpacing="1.5" textAnchor="middle">CONNECT · EXPLAIN · KEEP</text>
      </svg>
      <div className="performance-hero-caption"><span>研究整理 · 可追溯的积累</span><strong>这一份，留下来。</strong></div>
      <div className="performance-stamp"><span>{project.serial>0?'已 入 册':'视 听 预 演'}</span><small>{project.serial>0?`No. ${String(project.serial).padStart(3,'0')}`:'等待真实核验'}</small><i>RESEARCH COLLECTION</i></div>
    </div>
    <div className="performance-lyrics" aria-live="polite"><span>{done?'FINALE / 带着理解，继续下一份研究':words.label}</span><h2>{words.word}<i aria-hidden="true">.</i></h2><p>{words.line}</p></div>
    <div className="performance-touch-hint">{reduced?'已按系统设置简化动作':done?'这一份积累，已经留下':'点一下，让一片灵感飞起来'}</div>
    <div className="performance-timeline" aria-hidden="true"><div ref={timelineRef}/></div>
  </div>;
}
