/* Original teaching renderer. No upstream CellMotion code is copied. */
(() => {
  "use strict";
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,p)=>a+(b-a)*p;
  const segmenter=typeof Intl.Segmenter==="function"?new Intl.Segmenter("zh",{granularity:"grapheme"}):null;
  const split=text=>segmenter?Array.from(segmenter.segment(text),s=>s.segment):Array.from(text);
  const defaults={version:1,effect:"match",from:"让创意生长",to:"创意自由生长",entrance:"rise",easing:"smooth",stagger:.04,duration:4,hold:.6,endHold:.8,ratio:"16:9",fontSize:72,foreground:"#dbe56c",background:"#20251f",guides:true,image:null,seed:17};
  const names={match:"文字匹配",type:"逐字打入",pulse:"放大接力",particles:"碎片聚合"};
  const enumValue=(value,allowed,fallback)=>allowed.includes(value)?value:fallback;
  const numeric=(value,min,max,fallback)=>Number.isFinite(Number(value))?clamp(Number(value),min,max):clamp(fallback,min,max);
  const color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value)?value:fallback;
  function normalize(input={}) {
    const config={...defaults};
    config.effect=enumValue(input.effect,Object.keys(names),defaults.effect);
    config.from=split(typeof input.from==="string"?input.from:defaults.from).slice(0,40).join("");
    config.to=split(typeof input.to==="string"?input.to:defaults.to).slice(0,40).join("");
    config.entrance=enumValue(input.entrance,["rise","fade","bounce","none"],defaults.entrance);
    config.easing=enumValue(input.easing,["smooth","elastic","linear"],defaults.easing);
    config.ratio=enumValue(input.ratio,["16:9","9:16","1:1"],defaults.ratio);
    config.stagger=numeric(input.stagger,0,.12,defaults.stagger);
    config.duration=numeric(input.duration,2,8,defaults.duration);
    config.hold=numeric(input.hold,.2,2,defaults.hold);
    config.endHold=numeric(input.endHold,.2,2,defaults.endHold);
    const holdBudget=config.duration*.62;
    if(config.hold+config.endHold>holdBudget){const fit=holdBudget/(config.hold+config.endHold);config.hold*=fit;config.endHold*=fit;}
    config.fontSize=numeric(input.fontSize,28,110,defaults.fontSize);
    config.seed=numeric(input.seed,0,100000,17);
    config.foreground=color(input.foreground,defaults.foreground);
    config.background=color(input.background,defaults.background);
    config.guides=input.guides!==false;
    const asset=input.image;
    if(asset&&typeof asset.dataURL==="string"&&asset.dataURL.length<4500000&&/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(asset.dataURL)){
      config.image={dataURL:asset.dataURL,name:String(asset.name||"本地图片").slice(0,100),slot:Math.round(numeric(asset.slot,1,Math.max(1,split(config.to).length),2))};
    }
    return config;
  }
  const dimensions=ratio=>ratio==="9:16"?{width:540,height:960}:ratio==="1:1"?{width:720,height:720}:{width:960,height:540};
  function ease(p,type="smooth") {
    p=clamp(p);
    if(type==="linear")return p;
    if(type==="elastic"){
      const c=1.70158;
      return 1+(c+1)*Math.pow(p-1,3)+c*Math.pow(p-1,2);
    }
    return p*p*(3-2*p);
  }
  const phases=config=>{
    const holdEnd=.18+config.hold/config.duration,changeEnd=1-config.endHold/config.duration;
    return [
      {id:"enter",name:"进入",start:0,end:.18,seconds:.18*config.duration},
      {id:"hold",name:"停留",start:.18,end:holdEnd,seconds:config.hold},
      {id:"change",name:names[config.effect],start:holdEnd,end:changeEnd,seconds:(changeEnd-holdEnd)*config.duration},
      {id:"finish",name:"完整停留",start:changeEnd,end:1,seconds:config.endHold}
    ];
  };
  function stageAt(time,config){
    const p=clamp(time/config.duration);
    const stages=phases(config);
    const index=stages.findIndex(s=>p<s.end);
    const phase=stages[index<0?3:index];
    return {phase,index:stages.indexOf(phase),progress:clamp((p-phase.start)/(phase.end-phase.start)),totalProgress:p};
  }
  function tokens(text,config,isTarget=false){
    return split(text).map((char,index)=>isTarget&&config.image&&index===config.image.slot-1?{key:"image",kind:"image",char,index}:{key:"char:"+char,kind:"char",char,index});
  }
  function layout(ctx,text,config,width,height,isTarget=false){
    const items=tokens(text,config,isTarget);
    let size=config.fontSize;
    const font=value=>`700 ${value}px "Microsoft YaHei","Segoe UI",sans-serif`;
    ctx.font=font(size);
    let widths=items.map(token=>token.kind==="image"?size:Math.max(size*.18,ctx.measureText(token.char).width));
    let gap=size*.055,total=widths.reduce((s,v)=>s+v,0)+Math.max(0,items.length-1)*gap;
    if(total>width*.84){const factor=width*.84/total;size*=factor;gap*=factor;widths=widths.map(v=>v*factor);total*=factor;}
    let x=(width-total)/2;
    const slots=items.map((token,index)=>{const slot={...token,x:x+widths[index]/2,y:height/2,width:widths[index]};x+=widths[index]+gap;return slot;});
    return {slots,size,font:font(size),gap,width:total};
  }
  function matches(from,to){
    const used=new Set(),result=new Map();
    from.forEach((token,i)=>{const j=to.findIndex((next,k)=>next.key===token.key&&!used.has(k));if(j>=0){used.add(j);result.set(i,j);}});
    return {result,used};
  }
  function drawToken(ctx,token,style,config,image,{x=token.x,y=token.y,scale=1,alpha=1}={}){
    if(alpha<=0||scale<=0)return;
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha=clamp(alpha);
    if(token.kind==="image"&&image){const fit=style.size/Math.max(image.width,image.height);ctx.drawImage(image,-image.width*fit/2,-image.height*fit/2,image.width*fit,image.height*fit);}
    else {ctx.font=style.font;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle=config.foreground;ctx.fillText(token.char,0,0);}
    ctx.restore();
  }
  function drawLine(ctx,line,config,image,options={}){line.slots.forEach(token=>drawToken(ctx,token,line,config,image,options));}
  function effectiveStagger(config,count){return Math.min(config.stagger,phases(config)[2].seconds*.35/Math.max(1,count-1));}
  function glyphProgress(p,index,count,config){
    const delay=effectiveStagger(config,count)/phases(config)[2].seconds;
    return clamp((p-delay*index)/Math.max(.2,1-delay*Math.max(0,count-1)));
  }
  function guides(ctx,from,to,config,width,height){
    if(!config.guides)return;
    ctx.save();ctx.strokeStyle=config.foreground;ctx.fillStyle=config.foreground;ctx.globalAlpha=.16;ctx.setLineDash([3,6]);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(width*.04,height/2+to.size*.6);ctx.lineTo(width*.96,height/2+to.size*.6);ctx.stroke();
    const {result}=matches(from.slots,to.slots);
    result.forEach((j,i)=>{ctx.beginPath();ctx.moveTo(from.slots[i].x,height/2);ctx.lineTo(to.slots[j].x,height/2);ctx.stroke();});
    to.slots.forEach(slot=>ctx.strokeRect(slot.x-slot.width/2-3,slot.y-to.size*.6,slot.width+6,to.size*1.2));
    ctx.setLineDash([]);ctx.globalAlpha=.4;ctx.font="12px 'Microsoft YaHei',sans-serif";ctx.textAlign="center";ctx.fillText("虚线框是目标字位 · 连线表示相同字符的对应关系",width/2,height*.88);ctx.restore();
  }
  function drawEntrance(ctx,line,p,config,image){
    const e=ease(p,config.easing);
    const alpha=config.entrance==="none"?1:clamp(e);
    const offset=config.entrance==="rise"?(1-e)*45:0;
    const scale=config.entrance==="bounce"?.7+.3*ease(p,"elastic"):1;
    line.slots.forEach(token=>drawToken(ctx,token,line,config,image,{y:token.y+offset,scale,alpha}));
  }
  function drawMatch(ctx,from,to,p,config,image){
    const {result,used}=matches(from.slots,to.slots);
    from.slots.forEach((old,i)=>{
      const j=result.get(i);
      if(j===undefined){const exit=1-clamp(ease(p/.22,"smooth"));drawToken(ctx,old,from,config,image,{scale:exit,alpha:exit});return;}
      const next=to.slots[j];const local=glyphProgress(clamp((p-.2)/.6),i,from.slots.length,config);const e=ease(local,config.easing);
      const size=mix(from.size,to.size,e),line={...from,size,font:`700 ${size}px "Microsoft YaHei","Segoe UI",sans-serif`};
      drawToken(ctx,old,line,config,image,{x:mix(old.x,next.x,e),y:mix(old.y,next.y,e)});
    });
    to.slots.forEach((token,i)=>{if(used.has(i))return;const local=glyphProgress(clamp((p-.78)/.22),i,to.slots.length,config);const e=ease(local,config.easing);drawToken(ctx,token,to,config,image,{scale:Math.max(0,e),alpha:clamp(e)});});
  }
  function drawType(ctx,from,to,p,config,image){
    drawLine(ctx,from,config,image,{alpha:1-clamp(p/.12)});
    const delay=effectiveStagger(config,to.slots.length)/phases(config)[2].seconds;
    let cursor=null;
    to.slots.forEach((token,i)=>{const progress=clamp((p-.14-delay*i)/.12);if(progress>0)cursor=token;drawToken(ctx,token,to,config,image,{alpha:progress,y:token.y+(1-ease(progress,config.easing))*12});});
    if(cursor&&p<.9){ctx.save();ctx.fillStyle=config.foreground;ctx.globalAlpha=.7;ctx.fillRect(cursor.x+cursor.width/2+to.gap,cursor.y-to.size*.42,Math.max(2,to.size*.035),to.size*.84);ctx.restore();}
  }
  function drawPulse(ctx,from,to,p,config,image,width){
    drawLine(ctx,from,config,image,{alpha:1-clamp(p/.12)});
    const values=to.slots.map((token,i)=>{const local=glyphProgress(clamp((p-.12)/.88),i,to.slots.length,config);return {token,scale:1+.5*Math.sin(Math.PI*local),alpha:clamp(local*8)};});
    let total=values.reduce((s,item)=>s+item.token.width*item.scale,0)+Math.max(0,values.length-1)*to.gap;
    const fit=Math.min(1,width*.9/Math.max(1,total));
    let x=(width-total*fit)/2;
    values.forEach(({token,scale,alpha})=>{const w=token.width*scale*fit;drawToken(ctx,token,to,config,image,{x:x+w/2,scale:scale*fit,alpha});x+=w+to.gap*fit;});
  }
  let particleCache=null;
  function sample(line,config,image,width,height){
    const mask=document.createElement("canvas");mask.width=width;mask.height=height;
    const ctx=mask.getContext("2d",{willReadFrequently:true});drawLine(ctx,line,config,image);
    const pixels=ctx.getImageData(0,0,width,height).data,result=[];
    const stride=Math.max(4,Math.round(line.size/18));
    for(let y=Math.max(0,Math.floor(height/2-line.size));y<Math.min(height,height/2+line.size);y+=stride){
      for(let x=0;x<width;x+=stride){const index=(y*width+x)*4;if(pixels[index+3]>90)result.push({x,y,color:[pixels[index],pixels[index+1],pixels[index+2]]});}
    }
    if(result.length>900){const step=result.length/900;return Array.from({length:900},(_,i)=>result[Math.floor(i*step)]);}
    return result;
  }
  function seeded(index,seed){let value=(index*2654435761+seed*1013904223)>>>0;value^=value>>>16;value=Math.imul(value,2246822507);value^=value>>>13;return(value>>>0)/4294967295;}
  function drawParticles(ctx,from,to,p,config,image,width,height){
    const key=JSON.stringify([config.from,config.to,config.ratio,config.fontSize,config.foreground,config.image,Boolean(image)]);
    if(particleCache?.key!==key)particleCache={key,from:sample(from,config,image,width,height),to:sample(to,config,image,width,height)};
    const sources=particleCache.from,targets=particleCache.to;
    const count=Math.max(sources.length,targets.length);
    drawLine(ctx,from,config,image,{alpha:1-clamp(p/.15)});
    const e=clamp(ease(p,config.easing));
    for(let i=0;i<count;i++){
      const a=sources[i%sources.length]||{x:width/2,y:height/2,color:[219,229,108]};
      const b=targets[i%targets.length]||{x:width/2,y:height/2,color:[219,229,108]};
      const angle=seeded(i,config.seed)*Math.PI*2,distance=35+seeded(i+521,config.seed)*130;
      const spread=Math.sin(Math.PI*e)*distance;
      const x=mix(a.x,b.x,e)+Math.cos(angle)*spread,y=mix(a.y,b.y,e)+Math.sin(angle)*spread;
      const alpha=targets.length?Math.min(1,p*12)*(1-clamp((p-.88)/.12)):Math.min(1,p*12)*(1-p);
      ctx.fillStyle=`rgba(${a.color.map((value,c)=>Math.round(mix(value,b.color[c],e))).join(",")},${alpha})`;
      ctx.fillRect(x,y,2.5,2.5);
    }
    drawLine(ctx,to,config,image,{alpha:clamp((p-.82)/.18)});
  }
  function describe(time,config){
    const state=stageAt(time,config),p=state.progress;
    if(state.phase.id==="enter")return {...state,text:config.entrance==="none"?"第一句直接出现。位置已经算好，画布把它们画出来。":"第一句进入画面。此时只改变位置、缩放或透明度；文字内容保持不变。",calculation:"位置、缩放、透明度"};
    if(state.phase.id==="hold")return {...state,text:"第一句完整停留，给观众阅读的时间。时间继续前进，但这一阶段的画面保持稳定。",calculation:"固定的第一句布局"};
    if(state.phase.id==="finish")return {...state,text:"第二句已经完整出现。所有字位与素材保持稳定，观众可以读完这句话。",calculation:"固定的第二句布局"};
    if(config.effect==="match")return {...state,text:p<.22?"先让目标句中没有的字符在原位缩小。相同字符的身份被保留。":p<.78?"相同字符沿基线移到目标字位。你改变节奏，就会改变它们在这一刻移动了多少。":"目标句新增的字符或图片在自己的字位长大。相同字已经完成迁移。",calculation:"字符匹配、字位插值、缩放"};
    if(config.effect==="type")return {...state,text:"旧句退出后，按逐字间隔依次显示第二句。间隔为零时，会同时出现。每个字符的显示时刻都由当前时间计算。",calculation:"字符的出现时刻、透明度"};
    if(config.effect==="pulse")return {...state,text:"第二句的字符按顺序放大再回落。周围字位随宽度重新排布，给放大的字让出空间。",calculation:"逐字缩放、邻字位置与错峰"};
    return {...state,text:"字符或图片先被采样为许多小点。代码让每个点经过散开的位置，再聚到目标句的形状。最终接回清晰文字与图片。",calculation:"像素采样、碎片路径、聚合"};
  }
  function render(canvas,config,time=0,image=null,{guides:forceGuides}={}){
    const {width,height}=dimensions(config.ratio);
    if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
    const ctx=canvas.getContext("2d");ctx.clearRect(0,0,width,height);ctx.fillStyle=config.background;ctx.fillRect(0,0,width,height);
    const from=layout(ctx,config.from,config,width,height),to=layout(ctx,config.to,config,width,height,true);
    const drawingConfig=forceGuides===undefined?config:{...config,guides:forceGuides};
    guides(ctx,from,to,drawingConfig,width,height);
    const state=stageAt(time,config);
    if(state.phase.id==="enter")drawEntrance(ctx,from,state.progress,config,image);
    else if(state.phase.id==="hold")drawLine(ctx,from,config,image);
    else if(state.phase.id==="finish")drawLine(ctx,to,config,image);
    else if(config.effect==="match")drawMatch(ctx,from,to,state.progress,config,image);
    else if(config.effect==="type")drawType(ctx,from,to,state.progress,config,image);
    else if(config.effect==="pulse")drawPulse(ctx,from,to,state.progress,config,image,width);
    else drawParticles(ctx,from,to,state.progress,config,image,width,height);
    return describe(time,config);
  }
  window.MotionWorkshopEngine={defaults,names,normalize,dimensions,phases,render,describe,effectiveStagger,split};
})();
