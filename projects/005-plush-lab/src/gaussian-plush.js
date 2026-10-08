/** Deterministic all-Gaussian plush assets. Linear RGB, positive standard
 * deviations and normalized XYZW quaternions, with front along +Z.
 * The requested count includes the filling, coat, glass eyes and wool beret. */
export const MIN_PLUSH_SPLATS = 2000;
export const MAX_PLUSH_SPLATS = 120000;
const TAU=Math.PI*2, GOLDEN_ANGLE=Math.PI*(3-Math.sqrt(5));
const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const add=(a,b,factor=1)=>a.map((v,i)=>v+b[i]*factor);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const unit=v=>{const n=Math.hypot(...v);return n>1e-12?v.map(x=>x/n):[0,0,1];};
const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const KEY_LIGHT=unit([.65,1.05,.9]), FILL_LIGHT=unit([-.8,.1,.5]);

function randomFor(seed){
  let state=2166136261;
  for(let i=0;i<seed.length;i++)state=Math.imul(state^seed.charCodeAt(i),16777619);
  return ()=>{state=(state+0x6d2b79f5)|0;let n=Math.imul(state^state>>>15,1|state);n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296;};
}
function readColor(color){
  if(typeof color!=='string'||!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(color))throw new TypeError('毛绒颜色必须是 #RGB 或 #RRGGBB。');
  const hex=color.length===4?color.slice(1).split('').map(v=>v+v).join(''):color.slice(1);
  return[0,2,4].map(i=>linear(parseInt(hex.slice(i,i+2),16)/255));
}
function quaternion(x,y,z){
  const m00=x[0],m01=y[0],m02=z[0],m10=x[1],m11=y[1],m12=z[1],m20=x[2],m21=y[2],m22=z[2],trace=m00+m11+m22;
  let q;
  if(trace>0){const s=Math.sqrt(trace+1)*2;q=[(m21-m12)/s,(m02-m20)/s,(m10-m01)/s,s/4];}
  else if(m00>m11&&m00>m22){const s=Math.sqrt(1+m00-m11-m22)*2;q=[s/4,(m01+m10)/s,(m02+m20)/s,(m21-m12)/s];}
  else if(m11>m22){const s=Math.sqrt(1+m11-m00-m22)*2;q=[(m01+m10)/s,s/4,(m12+m21)/s,(m02-m20)/s];}
  else{const s=Math.sqrt(1+m22-m00-m11)*2;q=[(m02+m20)/s,(m12+m21)/s,s/4,(m10-m01)/s];}
  const length=Math.hypot(...q);return q.map(v=>v/length);
}
function frame(normal,angle=0){
  const a=unit(cross(Math.abs(normal[1])>.94?[1,0,0]:[0,1,0],normal)),b=cross(normal,a);
  const tangent=add(a.map(v=>v*Math.cos(angle)),b,Math.sin(angle)),bitangent=cross(normal,tangent);
  return{normal,tangent,bitangent,rotation:quaternion(tangent,bitangent,normal)};
}
function strandRotation(axis,normal){
  let narrow=unit(cross(normal,axis));
  if(Math.abs(dot(narrow,axis))>.01)narrow=frame(axis).tangent;
  return quaternion(axis,narrow,unit(cross(axis,narrow)));
}

function surface(shape,theta,angle){
  const ring=Math.sin(theta),c=Math.cos(theta);
  let radius=ring,xScale=1,yScale=1,depth=.75;
  // A stuffed star has two broad shoulders, low side lobes and a continuous
  // rounded belly. The outline fades into a convex three-dimensional face.
  if(shape==='star'){
    const distance=a=>Math.atan2(Math.sin(angle-a),Math.cos(angle-a));
    const lobe=(a,width,height)=>height*Math.exp(-Math.pow(distance(a)/width,2));
    const ellipse=1/Math.sqrt((Math.cos(angle)/.925)**2+(Math.sin(angle)/1.115)**2);
    const roundBelly=1/((Math.cos(angle)/.740)**4+(Math.sin(angle)/1.115)**4)**.25,bellyWeight=clamp(-Math.sin(angle)*3);
    const contour=ellipse*(1-bellyWeight)+roundBelly*bellyWeight+lobe(-.200,.270,.350)+lobe(Math.PI+.200,.270,.350)
      -lobe(-.58,.16,.055)-lobe(Math.PI+.58,.16,.055)
      +lobe(.97,.235,.165)+lobe(Math.PI-.97,.245,.120)-lobe(Math.PI/2,.245,.275);
    radius=ring*(1+(contour-1)*ring**2);xScale=1.07;depth=.825;
  }
  if(shape==='cloud'){radius=ring*(1.015+.085*Math.cos(3*angle)*ring**3+.055*Math.sin(5*angle)*ring**4);yScale=.84;depth=.735;}
  if(shape==='orb'){radius=ring*.95;yScale=1.02;depth=.82;}
  return[radius*Math.cos(angle)*xScale,radius*Math.sin(angle)*yScale,depth*c];
}
function parametricFrame(evaluate,theta,angle,twist=0){
  const e=.0001,p=evaluate(theta,angle);
  const dt=add(evaluate(theta+e,angle),evaluate(theta-e,angle),-1),da=add(evaluate(theta,angle+e),evaluate(theta,angle-e),-1);
  let normal=unit(cross(dt,da));if(dot(normal,p)<0)normal=normal.map(v=>-v);
  return{position:p,...frame(normal,twist)};
}
function surfaceFrame(shape,theta,angle,twist){return parametricFrame((t,a)=>surface(shape,t,a),theta,angle,twist);}
function frontDepth(shape,x,y){
  const xScale=shape==='star'?1.07:1,yScale=shape==='star'?1:shape==='cloud'?.84:1.02,planarX=x/xScale,planarY=y/yScale,angle=Math.atan2(planarY,planarX),radius=Math.hypot(planarX,planarY);
  let lo=0,hi=Math.PI/2;
  for(let i=0;i<30;i++){const middle=(lo+hi)/2,p=surface(shape,middle,angle);if(Math.hypot(p[0]/xScale,p[1]/yScale)<radius)lo=middle;else hi=middle;}
  return surface(shape,(lo+hi)/2,angle)[2];
}
function lighting(normal,position,variation=.5){
  const sky=.045*(normal[1]+1),key=.68*Math.max(0,dot(normal,KEY_LIGHT)),fill=.08*Math.max(0,dot(normal,FILL_LIGHT));
  const lowerBounce=1-.035*clamp(-position[1]);
  return(.35+sky+key+fill+(variation-.5)*.045)*lowerBounce;
}
function coatColor(base,normal,position,variation,occlusion,hat){
  let shadow=1;
  if(hat&&position[2]>-.1)shadow-=.22*Math.exp(-Math.pow((position[0]+.055)/.68,2)-Math.pow((position[1]-.89)/.20,2));
  if(position[2]>.4){
    for(const x of[-.43,.27])shadow-=.09*Math.exp(-Math.pow((position[0]-x)/.12,2)-Math.pow((position[1]-.21)/.16,2));
  }
  const gain=lighting(normal,position,variation)*shadow*occlusion;
  return base.map(v=>clamp(v*gain));
}
function eyeColor(normal){
  const facing=clamp(normal[2]),fresnel=(1-facing)**4;
  const reflected=[2*normal[0]*normal[2],2*normal[1]*normal[2],2*normal[2]**2-1];
  const window=facing>0?Math.exp(-Math.pow((reflected[0]+.48)/.36,2)-Math.pow((reflected[1]-.66)/.42,2)-Math.pow((reflected[2]-.57)/.52,2)):0;
  const coolHorizon=.004*Math.exp(-Math.pow((reflected[1]+.22)/.30,2))*facing;
  return[.0014+.019*fresnel+.15*window+coolHorizon,.0022+.026*fresnel+.18*window+coolHorizon*1.2,.0034+.038*fresnel+.23*window+coolHorizon*1.6].map(v=>clamp(v));
}
function beretSurface(theta,angle){
  const ring=Math.sin(theta),y=Math.cos(theta),foldPhase=angle*5+.80*y+.40*Math.sin(angle*3);
  const pleat=.028*Math.cos(foldPhase)+.011*Math.sin(angle*17-1.4*y);
  const circumference=1-.025*Math.cos(angle)+.026*Math.sin(angle*3+.8)+.012*Math.cos(angle*5-2*y);
  const x=.990*ring*Math.cos(angle)*circumference-.027*ring*y,z=.575*ring*Math.sin(angle)*(circumference+.100*Math.cos(foldPhase)*ring);
  // A fuller left crown also drapes lower at the left hem, like soft wool.
  const drape=.100*ring**1.5*clamp(-Math.cos(angle))*clamp(-y*1.8+.4);
  const height=.345*y*(1-.32*ring*Math.cos(angle))+pleat*ring**1.7*(.75+.25*y)-drape,turn=-.085;
  return[x*Math.cos(turn)-height*Math.sin(turn),x*Math.sin(turn)+height*Math.cos(turn),z];
}

/** Closed shell plus raised irregular fleece tufts. Higher density adds
 * clusters without collapsing their physical volume. Softness changes the
 * curl radius, rise and spread; root occlusion is baked into linear color. */
export function createPlushSplats({seed='plush-splat-01',color='#9bb8ed',shape='star',count=32000,softness=.55,hat=true}={}){
  if(typeof seed!=='string'||seed.length>256)throw new TypeError('种子必须是最多 256 字符的字符串。');
  if(!['star','cloud','orb'].includes(shape))throw new TypeError('高斯角色形状仅支持 star、cloud、orb。');
  if(!Number.isInteger(count)||count<MIN_PLUSH_SPLATS||count>MAX_PLUSH_SPLATS)throw new RangeError('高斯数量必须是 2000–120000 的整数。');
  if(!Number.isFinite(softness)||softness<0||softness>1)throw new RangeError('柔软度必须介于 0 与 1。');
  if(typeof hat!=='boolean')throw new TypeError('帽子开关必须为布尔值。');
  const base=readColor(color),random=randomFor(seed),splats=[];
  const hatHem=x=>shape==='star'?.850+.115*Math.exp(-Math.pow((x+.61)/.27,2))+.180*Math.exp(-Math.pow((x-.63)/.27,2))-.070*Math.exp(-Math.pow((x+1.02)/.22,2)):.870+.075*x;
  const faceCount=Math.round(count*.072),hatCount=hat?Math.round(count*.16):0,bodyCount=count-faceCount-hatCount;
  const fillCount=Math.floor(bodyCount*.05),shellCount=Math.floor(bodyCount*.13),fiberCount=bodyCount-fillCount-shellCount;
  const coverage=Math.sqrt(32000/count),phase=random()*TAU;
  const push=(position,scale,rotation,rgb,opacity)=>splats.push({position,scale,rotation,color:rgb,opacity});
  const indexedRoot=(i,total,offset=0)=>surfaceFrame(shape,Math.acos(1-2*(i+.1+.8*random())/total),i*GOLDEN_ANGLE+phase+offset+(random()-.5)*.16,0);
  const randomRoot=()=>surfaceFrame(shape,Math.acos(1-2*random()),TAU*random(),TAU*random());

  for(let i=0;i<fillCount;i++){
    const root=randomRoot(),radius=random()**(1/3)*.97,s=.052*coverage*(.8+.4*random());
    push(root.position.map(v=>v*radius),[s,s*.92,s*.85],root.rotation,coatColor(base,root.normal,root.position,.5,.78,hat),.55);
  }
  for(let i=0;i<shellCount;i++){
    const root=indexedRoot(i,shellCount,.73),s=.031*coverage*(.92+.16*random());
    push(add(root.position,root.normal,-.004),[s,s*.91,s*.48],root.rotation,coatColor(base,root.normal,root.position,random(),.82,hat),.96);
  }
  // More, smaller tufts share a dark root with two unequal falling fibers.
  // Their curved segments overlap along the derivative, making fine wool
  // strands rather than repeating round blobs or closed crochet rings.
  const groups=Math.ceil(fiberCount/8),clusterResolution=(32000/count)**.10;
  let remaining=fiberCount;
  for(let i=0;i<groups;i++){
    const root=indexedRoot(i,groups,2.17),normal=root.normal;
    const jitterAngle=random()*TAU,jitterDistance=.018*coverage**.55*Math.sqrt(random());
    root.position=add(add(root.position,root.tangent,Math.cos(jitterAngle)*jitterDistance),root.bitangent,Math.sin(jitterAngle)*jitterDistance);
    let down=add([0,-1,0],normal,normal[1]);
    if(Math.hypot(...down)<.05)down=root.bitangent;
    down=unit(down);
    const sideways=unit(cross(normal,down)),groom=.24*Math.sin(root.position[0]*5+root.position[1]*3)+(random()-.5)*1.25;
    const lean=unit(add(down.map(v=>v*Math.cos(groom)),sideways,Math.sin(groom))),side=unit(cross(normal,lean));
    const underHat=hat&&Math.abs(root.position[0]+.17)<.98?clamp((root.position[1]-hatHem(root.position[0])+.04)/.08):0;
    const compression=1-.88*underHat*underHat*(3-2*underHat);
    const radius=(.017+.009*softness)*clusterResolution*(.58+.80*random())*(.5+.5*compression),height=(.033+.025*softness)*(.55+.75*random())*compression;
    const tint=.53+.65*random(),lobes=Math.min(8,remaining),cores=Math.min(1,lobes);
    const f=frame(normal,Math.atan2(dot(lean,root.bitangent),dot(lean,root.tangent)));
    for(let j=0;j<cores;j++){
      const p=add(add(root.position,normal,height*.23),lean,-radius*.12);
      const size=radius*.62,occlusion=.56*tint;
      push(p,[size*1.50,size*.67,height*.19],f.rotation,coatColor(base,normal,p,.5,occlusion,hat),.92);
      remaining--;
    }
    const strands=lobes-cores,paths=Math.ceil(strands/4);
    for(let path=0;path<paths;path++){
      const length=height*(.64+.45*random()),spread=(random()-.5)*radius*1.5;
      const bend=(random()<.5?-1:1)*(.002+.008*random())*(.7+softness),phase=random()*TAU,arcRate=Math.PI*(.85+.35*random());
      const sections=Math.min(4,strands-path*4);
      for(let j=0;j<sections;j++){
        const t=(j+.40+.20*random())/sections,arc=phase+t*arcRate;
        const lift=.007*compression+length*(.20+.72*Math.sin(t*Math.PI*.80));
        let p=add(root.position,normal,lift);
        p=add(p,lean,radius*(t*2.65-.42)+bend*Math.sin(arc));
        p=add(p,side,spread+bend*.65*Math.cos(arc));
        let derivative=normal.map(v=>v*length*.72*Math.PI*.80*Math.cos(t*Math.PI*.80));
        derivative=add(derivative,lean,radius*2.65+bend*arcRate*Math.cos(arc));
        derivative=add(derivative,side,-bend*.65*arcRate*Math.sin(arc));
        const axis=unit(derivative),thin=(.0022+.00085*random())*clusterResolution*(.9+.2*softness);
        const long=clamp(Math.hypot(...derivative)*.14,.005,.0105)*clusterResolution*(.6+.4*compression);
        const strandNormal=unit(add(add(normal,lean,(random()-.5)*.48),side,(random()-.5)*.55));
        const rgb=coatColor(base,strandNormal,p,.5,(.68+.24*t)*tint,hat);
        push(p,[long,thin,thin*.82],strandRotation(axis,normal),rgb,.93-.22*clamp((t-.70)/.30));
        remaining--;
      }
    }
  }
  const glintCount=Math.floor(faceCount*.22),eyeCount=faceCount-glintCount,smileCount=0;
  const eyeY=.210,eyeX=.350,faceOutset=.068+.020*softness+.013*coverage;
  const eyeRadii=[.072,.119,.065];
  const ellipsoid=(n,center,radii,rgb,opacity,turn=0,material='matte')=>{
    const sine=Math.sin(turn),cosine=Math.cos(turn),eye=material==='eye';
    for(let i=0;i<n;i++){
      if(eye&&i<3){
        push(add(center,[0,0,(i-1)*.014]),[radii[0]*.34,radii[1]*.34,radii[2]*.37],[0,0,Math.sin(turn/2),Math.cos(turn/2)],[.0018,.0028,.0042],.995);continue;
      }
      const z=1-2*(i+.15+.7*random())/n,a=i*GOLDEN_ANGLE+phase,ring=Math.sqrt(Math.max(0,1-z*z)),direction=[ring*Math.cos(a),ring*Math.sin(a),z];
      let p=direction.map((v,axis)=>v*radii[axis]),normal=unit(direction.map((v,axis)=>v/radii[axis]));
      p=[p[0]*cosine-p[1]*sine,p[0]*sine+p[1]*cosine,p[2]];
      normal=[normal[0]*cosine-normal[1]*sine,normal[0]*sine+normal[1]*cosine,normal[2]];
      const world=add(p,center),s=clamp(Math.sqrt(radii[0]*radii[1])*Math.sqrt(8/n),.0012,.033);
      const color=eye?eyeColor(normal):material==='highlight'?rgb:rgb.map(v=>clamp(v*lighting(normal,world,.5)));
      push(world,[s*1.05,s*.9,s*.53],frame(normal,a).rotation,color,opacity);
    }
  };
  for(let side=0;side<2;side++){
    const x=(side?eyeX:-eyeX)-.080,z=frontDepth(shape,x,eyeY)+faceOutset,center=[x,eyeY,z],turn=side?-.035:.035;
    const n=Math.floor(eyeCount/2)+(side?eyeCount%2:0);
    ellipsoid(n,center,eyeRadii,null,.99,turn,'eye');
    const g=Math.floor(glintCount/2)+(side?glintCount%2:0),soft=Math.floor(g*.78),bright=g-soft;
    const dx=-.020,dy=.044,dz=eyeRadii[2]*Math.sqrt(1-(dx/eyeRadii[0])**2-(dy/eyeRadii[1])**2),glintTurn=-.22;
    ellipsoid(soft,[x+dx,eyeY+dy,z+dz+.003],[.015,.029,.0025],[.32,.40,.53],.72,glintTurn,'highlight');
    ellipsoid(bright,[x+dx,eyeY+dy+.004,z+dz+.007],[.009,.017,.0017],[.94,.975,1],.98,glintTurn,'highlight');
  }

  let hatCrownCount=0,hatFillCount=0,hatFiberCount=0,hatBrimCount=0,hatNubCount=0;
  if(hat){
    hatCrownCount=Math.floor(hatCount*.36);hatFillCount=Math.floor(hatCount*.10);hatFiberCount=Math.floor(hatCount*.48);hatBrimCount=Math.floor(hatCount*.035);hatNubCount=hatCount-hatCrownCount-hatFillCount-hatFiberCount-hatBrimCount;
    const center=[-.170,1.110,.005],hatBase=[.0065,.0068,.0072];
    const hatFold=p=>{
      const phi=Math.atan2(p[2],p[0]);
      return .56+.44*(.5+.5*Math.cos(phi*5+.80*p[1]+.40*Math.sin(phi*3)))**1.4;
    };
    const fittedBeretSurface=(theta,angle)=>{
      const p=beretSurface(theta,angle),cosine=Math.cos(theta),under=clamp(-cosine);
      // The underside closes inward. Flattening it and pushing it in front of
      // the coat would concentrate a whole hemisphere into a rolled visor.
      p[0]*=1-.20*under;p[2]*=1-.38*under;
      const hem=hatHem(p[0]+center[0])-center[1];
      if(cosine>=0){
        const profile=p[1]-.345*cosine;
        p[1]=hem+(.345-hem)*cosine+profile;
      }else p[1]=hem-.035*under;
      return p;
    };
    const hatRoot=(i,total,offset)=>parametricFrame(fittedBeretSurface,Math.acos(1-2*(i+.15+.7*random())/total),i*GOLDEN_ANGLE+phase+offset,0);
    for(let i=0;i<hatCrownCount;i++){
      const root=hatRoot(i,hatCrownCount,.3),p=add(root.position,center),s=.043*coverage*(.9+.2*random());
      const fold=hatFold(root.position),gain=(.48+1.05*Math.max(0,dot(root.normal,KEY_LIGHT)))*fold*(.64+.66*random());
      push(p,[s,s*.92,s*.45],root.rotation,hatBase.map(v=>clamp(v*gain)),.97);
    }
    for(let i=0;i<hatFillCount;i++){
      const root=hatRoot(i,hatFillCount,.58),radius=.62+.33*random(),p=add(root.position.map(v=>v*radius),center),s=.080*coverage*(.8+.4*random());
      push(p,[s,s*.90,s*.85],root.rotation,[.0028,.0032,.0040],.995);
    }
    let woolRemaining=hatFiberCount;
    const woolGroups=Math.ceil(hatFiberCount/3);
    for(let i=0;i<woolGroups;i++){
      const root=hatRoot(i,woolGroups,1.21),normal=root.normal,ja=random()*TAU,jd=.017*coverage**.5*Math.sqrt(random());
      const basePosition=add(add(add(root.position,center),root.tangent,Math.cos(ja)*jd),root.bitangent,Math.sin(ja)*jd);
      const a0=random()*TAU,f=frame(normal,a0),r=.0100*clusterResolution*(.60+.85*random()),span=Math.PI*(.65+1.25*random()),phase=random()*TAU;
      const lobes=Math.min(3,woolRemaining),rootPosition=add(basePosition,normal,.004),fold=hatFold(root.position),shadow=(.55+.36*Math.max(0,dot(normal,KEY_LIGHT)))*fold;
      push(rootPosition,[r*.75,r*.67,.0060],f.rotation,hatBase.map(v=>v*shadow*.62),.94);woolRemaining--;
      for(let j=0;j<lobes-1;j++){
        const t=(j+.25+.5*random())/3,a=phase+t*span,raised=.010+(.007+.012*random())*Math.sin(Math.PI*t);
        let p=add(basePosition,normal,raised);p=add(p,f.tangent,r*Math.cos(a));p=add(p,f.bitangent,r*.72*Math.sin(a));
        let derivative=normal.map(v=>v*.016*Math.PI*Math.cos(Math.PI*t));derivative=add(derivative,f.tangent,-r*span*Math.sin(a));derivative=add(derivative,f.bitangent,r*.72*span*Math.cos(a));
        const gain=(.80+.55*Math.max(0,dot(unit(add(normal,f.tangent,.27*Math.cos(a))),KEY_LIGHT)))*(.78+.40*random())*fold;
        const thin=.0023*clusterResolution;
        push(p,[.0060*clusterResolution,thin,thin*.8],strandRotation(unit(derivative),normal),hatBase.map(v=>clamp(v*gain)),.96);woolRemaining--;
      }
    }    for(let i=0;i<hatBrimCount;i++){
      const a=TAU*(i+random()*.7)/hatBrimCount,x=.735*Math.cos(a),y=hatHem(x+center[0])+(random()-.5)*.013,n=unit([Math.cos(a),.17,Math.sin(a)]),s=.0180*coverage;
      const z=.420*Math.sin(a);
      const gain=.50+.52*Math.max(0,dot(n,KEY_LIGHT));
      push([x+center[0],y,z+center[2]],[s*1.1,s*.73,s*.72],frame(n,a).rotation,[.0028,.0032,.0042].map(v=>v*gain),.97);
    }
    ellipsoid(hatNubCount,[-.320,1.435,-.040],[.027,.025,.024],[.0034,.0041,.0052],.98,-.19);
  }
  return{splats,meta:{source:'procedural',version:6,seed,color,shape,softness,hat,requestedCount:count,count:splats.length,bodyCount,faceCount,hatCount,
    layers:{fillCount,shellCount,fiberCount,eyeCount,glintCount,smileCount,hatCrownCount,hatFillCount,hatFiberCount,hatBrimCount,hatNubCount},
    coatStyle:'raised-irregular-fleece',coatClusterCount:groups,colorSpace:'linear-rgb',rotationOrder:'xyzw',scaleEncoding:'standard-deviation',frontAxis:'+z'}};
}
