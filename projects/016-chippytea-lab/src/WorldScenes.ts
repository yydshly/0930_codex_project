export type WorldId = 'gravity'|'moon'|'shadow';
export type Asset = {image:CanvasImageSource;box:[number,number,number,number]};
export type StageState = {scene:WorldId;time:number;age:number;interaction:number;x:number;y:number;dragging:boolean;strength:number;mobile:boolean;reduced:boolean;count:number;poses:{x:number;y:number;time:number;strength:number;pose?:string}[];captureAge?:number;captureX?:number;captureY?:number;capturePose?:string;gardenPlots?:{x:number;y:number}[];gardenPreview?:{x:number;y:number};audio?:{energy:number;low:number;high:number}};
export const duration=32;
export const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
export const smooth=(a:number,b:number,t:number)=>{const p=clamp((t-a)/(b-a),0,1);return p*p*(3-2*p);};
const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
const window=(a:number,b:number,c:number,d:number,t:number)=>smooth(a,b,t)*(1-smooth(c,d,t));

/** One deterministic raster choreography, shared by the live canvas and frame verification. */
export function renderWorld(ctx:CanvasRenderingContext2D,images:Record<string,Asset>,s:StageState){
  const t=s.time,q=s.reduced?0:t,chapter=Math.min(3,Math.floor(t/8)),motion=s.reduced?0:1;
  const audioEnergy=motion*clamp(s.audio?.energy??0,0,1),audioLow=motion*clamp(s.audio?.low??0,0,1),audioHigh=motion*clamp(s.audio?.high??0,0,1);
  // An action has its own clock, so a paused tableau can still answer a visitor.
  const age=Math.max(0,s.age),active=age<3.5;
  const actionPhase=age<.4?'prepare':age<1.25?'act':age<2.55?'reply':age<3.5?'settle':'idle';
  const preparation=active?1-smooth(.22,.45,age):0;
  const action=window(.32,.66,1.05,1.48,age);
  const reply=window(1.03,1.45,2.35,3.35,age);
  const settling=window(2.2,2.55,3.25,3.5,age);
  const reaction=action+reply*.2;
  const variation=((s.interaction%3)+3)%3;
  const captureAge=Math.max(0,s.captureAge??100),capturing=s.count>0&&captureAge<2.6;
  const captureProgress=smooth(0,2.6,captureAge),captureTravel=s.reduced?1:smooth(.2,1.75,captureAge);
  const captureReply=s.count>0?window(1.5,1.8,2.25,2.6,captureAge):0;
  const capturePhase=s.count<=0?'idle':captureAge<.2?'lift':captureAge<1.75?'fly':captureAge<2.6?'land':'complete';
  const px=(s.x-.5)*2,py=(s.y-.5)*2,p=s.strength/100;
  const captureX=clamp(s.captureX??s.x,.12,.9),captureY=clamp(s.captureY??s.y,.2,.85);
  const available=(key:string,fallback:string)=>images[key]?key:fallback;
  const draw=(key:string,x:number,y:number,w:number,angle=0,sx=1,sy=1,opacity=1)=>{
    const asset=images[key];if(!asset||opacity<=0)return;
    const [bx,by,bw,bh]=asset.box,h=w*bh/bw;
    ctx.save();ctx.globalAlpha=clamp(opacity,0,1);ctx.translate(x,y);ctx.rotate(angle);ctx.scale(sx,sy);
    ctx.drawImage(asset.image,bx,by,bw,bh,-w/2,-h/2,w,h);ctx.restore();
  };
  const feet=(key:string,x:number,y:number,w:number,angle=0,sx=1,opacity=1,sy=1)=>{
    const asset=images[key];if(asset)draw(key,x,y-w*asset.box[3]/asset.box[2]*sy/2,w,angle,sx,sy,opacity);
  };
  const anchored=(key:string,x:number,y:number,w:number,ax:number,ay:number,angle:number,opacity:number,sy=1)=>{
    const asset=images[key];if(!asset||opacity<=0)return;
    const [bx,by,bw,bh]=asset.box,h=w*bh/bw;
    ctx.save();ctx.globalAlpha=clamp(opacity,0,1);ctx.translate(x,y);ctx.rotate(angle);ctx.scale(1,sy);
    ctx.drawImage(asset.image,bx,by,bw,bh,-w*ax,-h*ay,w,h);ctx.restore();
  };
  const bg=images.background;
  ctx.clearRect(0,0,1536,1024);
  // A gentle dolly creates distinct compositions; reduced motion retains the chosen tableau.
  const focus=window(6,10,20,25,t),zoom=s.reduced?1:1+focus*(s.mobile?.025:.055);
  ctx.save();ctx.translate(768,570);ctx.scale(zoom,zoom);ctx.translate(-768+(s.reduced?0:Math.sin(q*.21)*focus*18),-570);
  ctx.drawImage(bg.image,0,0,1536,1024);
  const finale=smooth(s.scene==='shadow'?18:19,29,t);
  if(images['background-finale']){ctx.save();ctx.globalAlpha=finale;ctx.drawImage(images['background-finale'].image,0,0,1536,1024);ctx.restore();}
  let pose='',partnerPose='',spinPhase=0,growthStage=0,stitchStage=0,followLean=0,followCrouch=0;
  let gardenGrowthPhase='empty',gardenPreviewAnchor:{x:number;y:number}|null=null;
  const gardenPlants:{x:number;y:number;growth:number;width:number;latest:boolean}[]=[];
  const patchPlacements:{x:number;y:number;angle:number;sewing:number}[]=[];
  if(s.scene==='gravity'){
    const storm=window(6,9,14,18,t),grow=smooth(17,26,t),ending=smooth(25,29,t);
    const directWind=s.dragging?1:action,windPower=Math.max(action,s.dragging?.7:0);
    const gust=Math.max(storm*(.55+p*.8),(.55+p*.7)*windPower),wake=clamp(smooth(7,9,t)*(1-ending)+reply+captureReply,0,1);
    const stoneX=mix(365,495,smooth(14,19,t))-ending*45;
    const gustDirection=variation===2?-1:1;
    const windX=1120-storm*170+Math.sin(q*1.8)*storm*38+px*directWind*78-ending*55-preparation*18+gustDirection*action*38;
    const windY=(s.mobile?627:590)-storm*90-Math.abs(Math.sin(q*2))*storm*22-py*directWind*38+preparation*12-action*(variation===1?42:18);
    // Root positions belong to the safe island surface. The host remembers the
    // latest four plots; the fallback keeps earlier saved layouts compatible.
    const safePlot=(plot:{x:number;y:number})=>({x:clamp(plot.x,.39,.66),y:clamp(plot.y,.73,.765)});
    const plants=Math.min(4,s.count),plots=s.gardenPlots?.length?s.gardenPlots.slice(-4).map(safePlot):
      Array.from({length:plants},(_,i)=>({x:(635+i*112)/1536,y:(765+i%2*9)/1024}));
    const collected=Math.min(plants,plots.length);
    // Only the most recently inserted plot grows. Rolling the four-slot memory
    // forward never makes surviving older plants shrink back to sprouts.
    for(let i=0;i<collected;i++){
      const planted=i===collected-1&&capturing;
      const growth=planted&&!s.reduced?smooth(1.35,2.35,captureAge):1;
      const unfold=planted&&!s.reduced?smooth(1.6,2.25,captureAge):1;
      const plantX=plots[i].x*1536,plantBase=plots[i].y*1024;
      const fullWidth=plantX<650||plantX>980?96:112;
      const plantWidth=fullWidth*mix(.28,1,unfold),vertical=mix(.08,1,growth);
      const settle=planted?window(2.15,2.35,2.5,2.6,captureAge):0;
      anchored('tree',plantX,plantBase,plantWidth,.5,1,
        motion*(Math.sin(q*1.65+i)*.018+settle*Math.sin(captureAge*19)*.05)+audioLow*Math.sin(q*2.4+i)*.028,growth>0?1:0,vertical);
      // Vertical germination is anchored at the root; bitmap leaves then unfold
      // sideways. No hand-drawn particles or replacement foliage are added.
      gardenPlants.push({x:plots[i].x,y:plots[i].y,growth,width:plantWidth,latest:i===collected-1});
    }
    gardenGrowthPhase=collected===0?'empty':!capturing||s.reduced?'settled':captureAge<1.35?'seed':captureAge<1.75?'sprout':captureAge<2.35?'unfold':'settle';
    growthStage=collected===0?0:!capturing||s.reduced?3:captureAge<1.35?0:captureAge<1.75?1:captureAge<2.35?2:3;
    // New expressions and opposing personalities change the silhouette of the whole scene.
    const stoneKey=captureReply>.18||settling>.25?available('stone-proud','stone-awake'):wake>.5?'stone-awake':'stone';
    const stoneWidth=stoneKey==='stone-proud'?Math.min(380,470/(images[stoneKey].box[3]/images[stoneKey].box[2])):380;
    draw(stoneKey,stoneX,683-audioLow*5,stoneWidth,-gust*.045+Math.sin(q*1.3)*wake*.025-reply*.035+audioLow*.012);
    const windKey=ending>.55&&!active&&!s.dragging?'wind-rest':storm+windPower>.5?'wind-gust':'wind';
    if(windKey==='wind-rest')feet(windKey,windX,805,s.mobile?295:335);
    else draw(windKey,windX,windY,s.mobile?270:335,Math.sin(q*2)*storm*.1-px*action*.1+preparation*.09-gustDirection*action*.12,1,1-preparation*.05);
    const sprout=smooth(17,25,t);
    draw('tree',784,735-sprout*66,285,Math.sin(q*1.6)*.025,1,.08+sprout*.92,sprout);
    const total=12;
    for(let i=0;i<total;i++){
      const phase=i*2.399,arrival=smooth(.3+i*.13,1.3+i*.13,t);
      const release=smooth(6+i*.13,10.5+i*.12,t),gather=smooth(13+i*.08,16.8+i*.06,t),land=smooth(17+i*.09,22+i*.06,t);
      const orbit=phase+q*1.4;
      const spiralX=790+Math.cos(orbit)*(155+gust*115);
      const spiralY=595+Math.sin(orbit)*105-gust*85;
      const restX=682+(i%5)*48,restY=760-Math.floor(i/5)*42;
      const sourceX=windX-112,sourceY=windY+26;
      const readyX=sourceX+Math.cos(phase)*32,readyY=sourceY+Math.sin(phase)*27;
      // A seed starts at the flute, opens into a loose vortex, reaches the gardener's
      // hands, then drops under gravity. Staggered arrivals reveal the handoff.
      let x=mix(readyX,spiralX,release),y=mix(readyY,spiralY,release)-Math.sin(release*Math.PI)*70;
      x=mix(x,stoneX+176+(i%3-1)*12,gather);y=mix(y,671-Math.floor(i/3)*5,gather);
      x=mix(x,restX,land);y=mix(y,restY,land)-Math.sin(land*Math.PI)*46;
      if((active||s.dragging)&&!s.reduced){
        const held=s.dragging&&!active;
        const flight=held?1:smooth(.34+i*.018,1.1+i*.025,age),catching=held?0:smooth(1.08+i*.025,1.88+i*.028,age),fall=held?0:smooth(2.1+i*.014,3.15+i*.016,age);
        const swirl=phase+age*(variation===1?7:variation===2?-4:4);
        const swirlX=805+Math.cos(swirl)*(125+p*75)+px*95,swirlY=530+Math.sin(swirl)*(65+p*30)+py*55;
        x=mix(readyX,swirlX,flight);y=mix(readyY,swirlY,flight)-Math.sin(flight*Math.PI)*45;
        x=mix(x,stoneX+176+(i%3-1)*12,catching);y=mix(y,671-Math.floor(i/3)*5,catching);
        x=mix(x,restX,fall);y=mix(y,restY,fall)-Math.sin(fall*Math.PI)*55;
      }
      draw('seed',x,y-audioHigh*(4+i%3*2),24+(i%3)*7+audioHigh*5,phase*.15+q*.5+motion*land*.45,1,1,arrival*(.93+audioEnergy*.07));
    }
    // Raster seeds close to the camera establish depth; they cross the frame only in the storm.
    for(let i=0;i<3;i++){
      const travel=((q*.24+i*.31)%1);
      draw('seed',-130+travel*1820,775-i*67,65+i*17,q*.7+i,1,1,gust*.36*motion);
    }
    if(grow>0)for(let i=0;i<6;i++)draw('seed',710+(i%3)*55,683-Math.floor(i/3)*67,29,Math.sin(q+i)*.09,1,1,grow);
    for(let i=0;i<collected;i++){
      const last=i===collected-1,flight=last&&capturing?(s.reduced?1:smooth(.2,1.35,captureAge)):1;
      const landX=plots[i].x*1536,landY=plots[i].y*1024;
      const fromX=windX-115+(captureX-.5)*90,fromY=windY+28+(captureY-.5)*55;
      const x=mix(fromX,landX,flight),y=mix(fromY,landY,flight)-Math.sin(flight*Math.PI)*210;
      const impact=last?captureReply:0;
      ctx.save();ctx.shadowColor='#eed59b';ctx.shadowBlur=impact*22;
      draw('seed',x,y,(last&&capturing?mix(70,29,flight):29)+impact*12,.15+Math.sin(flight*Math.PI)*1.4,1,1,last&&capturing?.96:.8);ctx.restore();
    }
    if(s.gardenPreview){
      gardenPreviewAnchor=safePlot(s.gardenPreview);
      ctx.save();ctx.shadowColor='#edce77';ctx.shadowBlur=s.reduced?12:18+Math.sin(q*3)*4;
      draw('seed',gardenPreviewAnchor.x*1536,gardenPreviewAnchor.y*1024-7,46,.12,1,1,.84);ctx.restore();
    }
    pose=stoneKey;partnerPose=windKey;
  }else if(s.scene==='moon'){
    const chase=window(6,9,14,18,t),repair=smooth(17,25,t),ending=smooth(26,30,t);
    const hiccup=Math.max(chase,action)*(.55+p*.7),pull=s.dragging?px*115:action*(variation===2?-62:70);
    const leap=Math.max(Math.abs(Math.sin(q*2.2))*chase,action*(variation===1?.9:.65));
    const moonX=clamp(1060+Math.sin(q*1.25)*chase*150-pull-ending*65,790,1245);
    const moonY=590-leap*(70+p*55)-repair*22+preparation*12;
    const tailorX=365+chase*(120+Math.sin(q*1.25)*115)+smooth(17,21,t)*75-pull*.2;
    // Three pulls stitch each landing patch. The tailor braces backwards on a
    // pull, eases forwards on its release, then presents the finished work.
    const naturalSew=window(16.7,17.2,23,24,t),captureSew=capturing?window(1.55,1.72,2.38,2.6,captureAge):0;
    const sewingWork=Math.max(naturalSew,captureSew),sewingClock=captureSew>0?captureAge-1.65:q-17;
    const pullBeat=motion*sewingWork*Math.pow(Math.max(0,Math.sin(sewingClock*Math.PI*6)),2);
    const releaseBeat=motion*sewingWork*Math.max(0,-Math.sin(sewingClock*Math.PI*6));
    const frantic=clamp(chase+reply+sewingWork*.7,0,1);
    const tailorKey=captureReply>.12&&captureAge>2.35||settling>.2||ending>.45&&!active&&sewingWork<.2?'tailor-proud':frantic>.5?'tailor-chase':'tailor';
    const bodyX=tailorX+reply*32-pullBeat*27+releaseBeat*8;
    const handX=bodyX+85-pullBeat*12,handY=646-Math.abs(Math.sin(q*4))*frantic*20-pullBeat*25;
    const threadEndX=moonX-125,threadEndY=moonY+63;
    const threadW=Math.hypot(threadEndX-handX,threadEndY-handY);
    const threadOpacity=clamp(.88-ending*.55+pullBeat*.1,0,1);
    draw('thread',(handX+threadEndX)/2,(handY+threadEndY)/2-pullBeat*8,threadW*(1+pullBeat*.015),Math.atan2(threadEndY-handY,threadEndX-handX)-pullBeat*.018,1,1,threadOpacity);
    const tailorRatio=images[tailorKey].box[3]/images[tailorKey].box[2];
    const tailorWidth=tailorKey==='tailor-proud'?Math.min(285,310/tailorRatio):280;
    feet(tailorKey,bodyX,804-Math.abs(Math.sin(q*4))*chase*20-reply*13-pullBeat*5,tailorWidth,-frantic*.065-pullBeat*.13+releaseBeat*.025);
    const hiccupFace=Math.max(chase*(1-ending)*(.55+p*.7),window(.25,.4,1.08,1.4,age));
    const moonKey=captureReply>.1||!active&&s.count>0&&ending>.4?available('moon-content','moon'):hiccupFace>.5?'moon-hiccup':'moon';
    draw(moonKey,moonX,moonY,408,Math.sin(q*1.5)*chase*.12+(variation===2?-1:1)*action*.15+preparation*.025+.06,1,1-preparation*.035);
    // Leaking musical fragments fall in staggered arcs and are reeled back during the repair.
    for(let i=0;i<6;i++){
      const flight=((q*.34+i*.19)%1),back=smooth(16,23,t);
      const x=mix(moonX-80-flight*460,moonX-45+i*15,back);
      const y=mix(moonY+20-flight*170+flight*flight*280,moonY+55,back);
      draw('thread',x,y,54+i%2*14,-flight*.8+i*.1,1,1,clamp(hiccup*.8+window(12,14,21,24,t),0,1));
    }
    // A trail uses the existing thread raster, and three small thread tacks
    // visibly attach each arriving patch instead of one permanent stretched line.
    const patchPath=(fromX:number,fromY:number,toX:number,toY:number,f:number,arc:number)=>({x:mix(fromX,toX,f),y:mix(fromY,toY,f)-Math.sin(f*Math.PI)*arc});
    const stitchPatch=(x:number,y:number,width:number,progress:number,angle:number)=>{
      const stage=Math.min(3,Math.floor(clamp(progress,0,1)*3)+1);
      for(let j=0;j<3;j++){
        const tack=smooth(j/3,(j+.7)/3,progress);
        const tackX=x-width*.29+j*width*.29,tackY=y+width*(j%2?.16:.24);
        draw('thread',tackX,tackY,width*.44,(j%2?-.55:.65)+angle,1,2,tack*.95);
        // The active needle uses the same thread raster, turning down into one
        // tack at a time. At completion only the fixed, alternating stitches remain.
        const local=clamp(progress*3-j,0,1);
        if(motion&&local>0&&local<1){
          draw('thread',tackX+mix(-width*.2,0,smooth(0,.8,local)),
            tackY-mix(width*.7,0,smooth(0,.7,local)),width*.72,
            mix(-1.25,j%2?-.55:.65,smooth(0,.75,local))+angle,1,1.8,.98);
        }
      }
      return progress<=0?0:stage;
    };
    const patchTrail=(fromX:number,fromY:number,toX:number,toY:number,flight:number,arc:number)=>{
      if(!motion||flight<=.05||flight>=.98)return;
      for(let j=1;j<=3;j++){
        const before=clamp(flight-j*.045,0,1),point=patchPath(fromX,fromY,toX,toY,before,arc),next=patchPath(fromX,fromY,toX,toY,Math.min(1,before+.025),arc);
        draw('thread',point.x,point.y,30-j*5,Math.atan2(next.y-point.y,next.x-point.x),1,1,.18-j*.045);
      }
    };
    for(let i=0;i<3;i++){
      const flight=smooth(16+i*2,17.35+i*2,t),sewing=smooth(17.35+i*2,18.4+i*2,t),visible=smooth(16+i*2,16.25+i*2,t);
      const targetX=moonX-66+i*56,targetY=moonY+82;
      const point=patchPath(tailorX+70,620,targetX,targetY,flight,145);
      patchTrail(tailorX+70,620,targetX,targetY,flight,145);
      const stitchPulse=motion*(1-sewing)*Math.sin(sewing*Math.PI*6)*smooth(0,.12,sewing);
      draw('patch',point.x+stitchPulse*3,point.y-stitchPulse*3,57,-.3+flight*.5+stitchPulse*.035,1,1,visible);
      stitchStage=Math.max(stitchStage,stitchPatch(point.x,point.y,57,sewing,.2));
    }
    draw('patch',moonX-42,moonY+78,136,.12,1,1,smooth(24,27,t));
    // The newly saved patch flies from the tailor's hand, with the raster thread following it.
    const collected=Math.min(8,s.count);
    for(let i=0;i<collected;i++){
      const last=i===collected-1,flight=last&&capturing?captureTravel:1;
      const landX=moonX-95+(i%4)*60,landY=moonY+106+Math.floor(i/4)*38;
      const fromX=tailorX+90+(captureX-.5)*60,fromY=600+(captureY-.5)*55;
      const point=patchPath(fromX,fromY,landX,landY,flight,205);
      const sewing=last&&capturing?(s.reduced?1:smooth(1.75,2.6,captureAge)):1;
      const stitchPulse=motion*(1-sewing)*Math.sin(sewing*Math.PI*6)*smooth(0,.12,sewing);
      const tight=last&&capturing?smooth(0,1,sewing):1;
      const x=point.x+stitchPulse*11+motion*(1-tight)*22,y=point.y-stitchPulse*9-motion*(1-tight)*18;
      if(last&&capturing)patchTrail(fromX,fromY,landX,landY,flight,205);
      if(last&&capturing){
        const threadX=handX,threadY=handY,threadLength=Math.hypot(x-threadX,y-threadY);
        draw('thread',(threadX+x)/2,(threadY+y)/2,threadLength,Math.atan2(y-threadY,x-threadX),1,1,(1-smooth(1.8,2.3,captureAge))*.68);
      }
      const patchWidth=last&&capturing?90-16*flight:74;
      const patchAngle=(i-1.5)*.07+Math.sin(flight*Math.PI)*.9+motion*(1-tight)*.4+stitchPulse*.12;
      draw('patch',x,y,patchWidth,patchAngle,1-motion*sewing*.08,1,.96);
      stitchStage=Math.max(stitchStage,stitchPatch(x,y,patchWidth,sewing,patchAngle));
      patchPlacements.push({x,y,angle:patchAngle,sewing});
    }
    // Completed ideas still spill onto the workbench during the closing scene.
    for(let i=0;i<2;i++)draw('patch',565+i*91,793+Math.sin(i*2)*7,48,(i-2)*.11,1,1,ending*.85);
    pose=moonKey;partnerPose=tailorKey;
  }else{
    const shadowVariation=((s.interaction%4)+4)%4;
    const entrance=1-smooth(3,5,t),bold=window(7,10,14,17,t),duet=window(17,20,25,28,t),bow=smooth(27,30,t);
    const clap=motion*Math.max(bold,duet,reply,captureReply)*Math.max(0,Math.sin(q*Math.PI*2+age*.45));
    const lightX=1060+px*245-Math.sin(q*.9)*duet*75-clap*8;
    const lightAngle=-px*.38+(s.dragging?py*.09:0)+Math.sin(q*.7)*bold*.1+reply*.06-captureReply*.09+clap*.028+audioHigh*.014;
    const lightKey=reply>.3||captureReply>.1||duet>.3||bow>.4||bold>.5&&Math.sin(q*.9)>.15?'light-brave':'light';
    const lightWidth=lightKey==='light-brave'?214:202;
    const lightHeight=lightWidth*images[lightKey].box[3]/images[lightKey].box[2];
    const lightBase=814+(s.dragging?py*24:0)+(lightKey==='light-brave'?Math.sin(q*2)*3:0)-clap*10-audioLow*6;
    const lampX=lightX+lightWidth*(lightKey==='light-brave'?.061:-.313);
    const lampY=lightBase-lightHeight*(lightKey==='light-brave'?.836:.815);
    // The cone pivots from the actual lamp; the light carrier answers after the dancer acts.
    anchored('beam',lampX,lampY,s.mobile?790:920,.985,.985,lightAngle,.37+p*.2+reply*.09+captureReply*.13+audioEnergy*.12);
    anchored('beam',lampX,lampY,680,.985,.985,lightAngle-.23,duet*.22);
    const size=s.mobile?Math.min(416,270+bold*90+p*30+action*40+audioLow*16):Math.min(460,350+bold*150+p*45+action*65+audioLow*22);
    const dancerX=520+Math.sin(q*1.4)*bold*74+px*action*65+(shadowVariation===2?Math.sin(age*3)*action*45:0);
    const base=s.mobile?828:806;
    const jump=bold*Math.max(0,Math.sin(q*3))*55+(shadowVariation===1?action*(55+p*35):0);
    const dancePhrase=chapter===1&&((t-8)%4)>.8&&((t-8)%4)<2.7;
    const naturalSpin=chapter===1&&t>=12.45&&t<14.5||chapter===2&&t>=20.2&&t<22.35;
    const naturalKey=entrance>.4||bow>.4?'dancer-bow':naturalSpin?available('dancer-spin','dancer'):dancePhrase?'dancer-leap':'dancer';
    const chosenKey=shadowVariation===0?'dancer':shadowVariation===1?'dancer-leap':shadowVariation===2?available('dancer-spin','dancer'):'dancer-bow';
    const key=active?age<.4?'dancer-bow':age<2.3?chosenKey:age<3.05?'dancer':'dancer-bow':naturalKey;
    // The held light is an input, rather than a frozen action pulse. The dancer
    // follows immediately after the action finishes, with feet kept on the stage.
    followLean=s.dragging?clamp(px*.2,-.18,.18):0;
    followCrouch=s.dragging?clamp((py+.2)*.22,0,.23):0;
    const angle=(key==='dancer-bow'?.02:Math.sin(q*1.9)*.045-px*.09+(shadowVariation===2?action*.18:0))+followLean;
    const ratio=images[key].box[3]/images[key].box[2];
    const safeSize=Math.min(size,(base-jump-175)/(ratio+.4));
    // The same illustrated spin turns continuously: full front, thin profile,
    // mirrored back, thin profile, front. Two restrained echoes describe momentum.
    const spinning=key==='dancer-spin';
    spinPhase=spinning?active?smooth(.4,2.25,age):smooth(chapter===1?12.45:20.2,chapter===1?14.5:22.35,t):0;
    const spinScale=spinning&&motion?Math.cos(spinPhase*Math.PI*2):1;
    const spinX=dancerX+motion*(spinning?Math.sin(spinPhase*Math.PI*2)*20:0);
    const spinBase=base-jump+preparation*10-motion*(spinning?Math.sin(spinPhase*Math.PI)*11:0);
    if(spinning&&motion&&spinPhase>.02&&spinPhase<.98){
      for(let j=2;j>=1;j--){
        const previous=Math.max(0,spinPhase-j*.065),previousScale=Math.cos(previous*Math.PI*2);
        feet(key,dancerX+Math.sin(previous*Math.PI*2)*20-j*7,base-jump-Math.sin(previous*Math.PI)*11,safeSize,angle-j*.025,previousScale,j===1?.14:.07);
      }
    }
    feet(key,spinX,spinBase,safeSize,angle,spinScale,1,1-followCrouch);
    feet('dancer',dancerX+165,base+2,size*.53,-angle,-1,spinning?0:.12*(1-duet));
    if(duet>0){
      const partner=s.interaction%2?'dancer-leap':'dancer';
      feet(partner,823+Math.sin(q*1.4+Math.PI)*45,base-Math.max(0,Math.sin(q*3+Math.PI))*28,220,-angle,-1,duet*.88);
    }
    feet(lightKey,lightX,lightBase,lightWidth,-clap*.035);
    // The saved poses become the tiny front-row audience, distinct from the live dance.
    const audience=Math.min(5,Math.max(s.count,s.poses.length));
    const rememberedKey=(remembered:StageState['poses'][number]|undefined)=>{
      const name=(remembered?.pose||'').split(' + ')[0];
      if(['dancer','dancer-bow','dancer-leap','dancer-spin'].includes(name))return available(name,'dancer');
      return remembered?remembered.time<5||remembered.time>=27?'dancer-bow':remembered.time>=8&&remembered.time<17?'dancer-leap':'dancer':'dancer-bow';
    };
    const latestIndex=Math.max(0,Math.min(audience-1,s.poses.length?s.poses.length-1:audience-1));
    for(let i=0;i<audience;i++){
      const remembered=s.poses[i];
      if(capturing&&i===latestIndex)continue;
      const audienceReply=motion*captureReply*Math.max(0,Math.sin((captureAge-1.5)*Math.PI*5+i*.6));
      feet(rememberedKey(remembered),650+i*68,866-audienceReply*9,remembered?56+remembered.strength*.15:56,(remembered?-(remembered.x-.5)*.25:0)+audienceReply*.065,1,.7);
    }
    if(capturing){
      const remembered=s.poses[latestIndex];
      const rawPose=(s.capturePose||remembered?.pose||key).split(' + ')[0];
      const savedKey=available(['dancer','dancer-bow','dancer-leap','dancer-spin'].includes(rawPose)?rawPose:key,'dancer');
      const flight=captureTravel,targetX=650+latestIndex*68,targetBase=866;
      // The remembered raster becomes a paper-sized spectator; the live performer stays on stage.
      const fromX=dancerX+48+(captureX-.5)*35,fromBase=base-50+(captureY-.5)*40;
      const savedWidth=mix(Math.min(165,safeSize*.55),remembered?56+remembered.strength*.15:56,flight);
      const landingReply=motion*window(1.7,1.83,2.32,2.6,captureAge)*Math.sin((captureAge-1.7)*Math.PI*5);
      const savedX=mix(fromX,targetX,flight),savedBase=mix(fromBase,targetBase,flight)-Math.sin(flight*Math.PI)*145-Math.max(0,landingReply)*12;
      const savedAngle=-Math.sin(flight*Math.PI)*.12+(remembered?-(remembered.x-.5)*.25:0)*flight+landingReply*.08;
      feet(savedKey,savedX,savedBase,savedWidth,savedAngle,1,mix(.85,.7,flight));
    }
    pose=key+(duet>.5?' + mirror duet':'');partnerPose=lightKey;
  }
  ctx.restore();
  return {chapter,pose,partnerPose,zoom,reaction,interactive:active,finale,actionPhase,capturePhase,captureProgress,spinPhase,growthStage,stitchStage,gardenGrowthPhase,gardenPlants,gardenPreviewAnchor,patchPlacements,followLean,followCrouch,actionVariant:variation,audioReactive:s.scene!=='moon'&&audioEnergy>.005};
}
