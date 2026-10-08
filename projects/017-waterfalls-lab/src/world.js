export const GRID=[52,56,44], DX=.24;
export const OBJECT_SHAPE={rings:7,segments:12,mossRings:4,mossSegments:8};
export function objectMeshSize(object){const cells=OBJECT_SHAPE.rings*OBJECT_SHAPE.segments+(object.type==='rock'?OBJECT_SHAPE.mossRings*OBJECT_SHAPE.mossSegments:0);return {floats:cells*6*9,randomCalls:cells*3};}
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function random(seed=117){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function terrain(x,z,preset=0){
  const bank=smooth(2.4,4.6,Math.abs(x))*(1.1+.3*Math.sin(z*1.6));
  const rockNoise=.075*Math.sin(x*3.8+z*2.3)+.045*Math.sin(x*7-z*4);
  let h=.26+bank;
  if(z<-2.9)h+=9.0;
  else if(z<-1.7)h+=5.9;
  else if(z<-.6)h+=2.85;
  if(preset===1 && z<-1.7 && z>=-2.9)h+=.7;
  if(preset===2 && z<-.6 && z>=-1.7)h+=.7;
  // A shallow channel guides water toward the next lip, without prescribing its motion.
  if(z<-.6){h+=smooth(.55,1.5,Math.abs(x+.7))*.38;h-=.11*smooth(-3.7,-.6,z);}
  return h+rockNoise;
}
export function initialParticles(count,preset=0){
  const rand=random(431+19*preset),data=new Float32Array(count*20);
  for(let i=0;i<count;i++){
    let x,z,y;
    if(i<count*.5){x=(rand()-.5)*3.8;z=.1+rand()*3.1;y=terrain(x,z,preset)+.19+rand()*.23;}
    else if(i<count*.79){z=-3.6+rand()*3.2;x=-.7+(rand()-.5)*.9;y=terrain(x,z,preset)+.14+rand()*.32;}
    else{x=-.7+(rand()-.5)*.8;z=-2.86+rand()*3;y=.8+rand()*8.7;}
    const o=i*20;data[o]=x/DX+GRID[0]/2;data[o+1]=y/DX;data[o+2]=z/DX+GRID[2]/2;data[o+3]=1;
    data[o+6]=.035;data[o+7]=0;
  }
  return data;
}
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l);};
export function buildWorld(preset=0,season='summer',objects=[],objectsOnly=false,voxel=null,seed=811){
  const vertices=[],rand=random(seed),autumn=season==='autumn';
  function tri(a,b,c,color){const n=norm(cross(sub(b,a),sub(c,a)));for(const p of [a,b,c])vertices.push(...p,...n,...color.map(v=>clamp(v,0,1)));}
  function sphere(p,s,c,rings=6,segments=10,rough=.1,angle=0){
    const pts=[];for(let i=0;i<=rings;i++){const row=[];for(let j=0;j<=segments;j++){const t=i/rings*Math.PI,f=j/segments*Math.PI*2;const k=1+rough*Math.sin(j*2.7+i*5.1);row.push([p[0]+Math.sin(t)*Math.cos(f)*s[0]*k,p[1]+Math.cos(t)*s[1]*k,p[2]+Math.sin(t)*Math.sin(f)*s[2]*k]);}pts.push(row);}
    if(angle)for(const row of pts)for(const v of row){const x=v[0]-p[0],z=v[2]-p[2];v[0]=p[0]+x*Math.cos(angle)+z*Math.sin(angle);v[2]=p[2]-x*Math.sin(angle)+z*Math.cos(angle);}
    for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){const col=c.map(v=>v*(.92+rand()*.15));tri(pts[i][j],pts[i+1][j],pts[i][j+1],col);tri(pts[i][j+1],pts[i+1][j],pts[i+1][j+1],col);}
  }
  function cone(p,r,h,color,seg=8){for(let j=0;j<seg;j++){const a=j/seg*Math.PI*2,b=(j+1)/seg*Math.PI*2;tri([p[0]+r*Math.cos(a),p[1],p[2]+r*Math.sin(a)],[p[0],p[1]+h,p[2]],[p[0]+r*Math.cos(b),p[1],p[2]+r*Math.sin(b)],color);}}
  if(!objectsOnly){
  const n=96,extent=6.1;
  if(voxel)for(const value of voxel.mesh)vertices.push(value);
  else for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){
    const x=-extent+ix/n*extent*2,z=-4.6+iz/n*9.2,step=extent*2/n;
    const p=(xx,zz)=>[xx,terrain(xx,zz,preset),zz];
    const h=terrain(x,z,preset),channel=Math.abs(x+.7)<.75&&z<-.5;
    const c=channel?[.25,.29,.25]:h>1.4?[.29,.34,.29]:[.28,.37,.23];
    const tint=.86+rand()*.28;const col=c.map(v=>v*tint);
    tri(p(x,z),p(x,z+9.2/n),p(x+step,z),col);tri(p(x+step,z),p(x,z+9.2/n),p(x+step,z+9.2/n),col);
  }
  // Faceted ledges, moss cushions and shoreline stones.
  for(let i=0;i<125;i++){
    const x=(rand()-.5)*10.6,z=-4.3+rand()*8.3;if(Math.abs(x+.7)<.8&&z<-.5)continue;
    const h=voxel?voxel.height(x,z):terrain(x,z,preset),s=.15+rand()*.55;if(voxel && h<.08)continue;
    sphere([x,h-.07,z],[s,s*.65,s*.75],[.29+rand()*.05,.34,.30],5,8,.12);
    if(i%2===0)sphere([x,h+s*.35,z],[s*.86,.09,s*.65],[.28,.42,.21],3,8,.08);
  }
  for(const z of [-2.86,-1.66,-.56])for(let i=0;i<18;i++){
    const x=-5.5+i*.64;if(Math.abs(x+.7)<.8)continue;
    if(voxel)continue;const y=terrain(x,z-.08,preset);sphere([x,y-.85,z-.14],[.43,1.1,.36],[.30,.34,.31],6,8,.13);
  }
  // Conifers and broadleaf trees form a silhouette around the water.
  for(let i=0;i<110;i++){
    let x=(rand()-.5)*11,z=-4.25+rand()*8;
    if(Math.abs(x)<2.1 && z>-3.5)continue;
    const y=voxel?voxel.height(x,z):terrain(x,z,preset),height=1.8+rand()*2.3;if(voxel && y<.08)continue;
    cone([x,y,z],.10,height*.9,[.23,.20,.15],7);
    if(i%3!==0){for(let k=0;k<7;k++){const t=k/7;cone([x,y+height*.15+t*height*.70,z],height*.22*(1-t*.79),height*.31,[.045+.009*k,.14+.015*k,.105+.008*k]);}}
    else{const c=autumn?(i%2?[.67,.29,.10]:[.74,.48,.14]):[.24,.36,.13];sphere([x,y+height*.75,z],[height*.28,height*.34,height*.27],c,7,12,.09);for(let j=0;j<3;j++)sphere([x+(rand()-.5)*height*.5,y+height*(.58+rand()*.26),z+(rand()-.5)*height*.48],[height*.16,height*.17,height*.15],c.map(v=>v*(.9+rand()*.15)),5,9,.08);}
  }
  // Ferns and flowers remain geometrical; no remote textures or assets are needed.
  for(let i=0;i<230;i++){
    const x=(rand()-.5)*10.5,z=-4.1+rand()*8.1;if(Math.abs(x)<1.9&&z>-.7)continue;
    const h=voxel?voxel.height(x,z):terrain(x,z,preset);if(voxel && h<.08)continue;cone([x,h,z],.07,.18+rand()*.25,[.36,.48,.24],4);
    if(i%9===0)sphere([x,h+.24,z],[.065,.065,.065],autumn?[.96,.69,.27]:[.78,.71,.92],3,5,0);
  }
  }
  for(const o of objects){
    const c=o.selected?[.61,.59,.32]:o.type==='rock'?[.34,.38,.34]:[.34,.45,.25];sphere(o.position,o.scale,c,OBJECT_SHAPE.rings,OBJECT_SHAPE.segments,o.type==='rock'?.09:0,o.rotation||0);
    if(o.type==='rock')sphere([o.position[0],o.position[1]+o.scale[1]*.7,o.position[2]],[o.scale[0]*.78,.1,o.scale[2]*.8],[.31,.45,.22],OBJECT_SHAPE.mossRings,OBJECT_SHAPE.mossSegments,.05,o.rotation||0);
  }
  return new Float32Array(vertices);
}
export function makeTerrainTexture(preset=0){const data=new Float32Array(GRID[0]*GRID[2]);for(let z=0;z<GRID[2];z++)for(let x=0;x<GRID[0];x++)data[z*GRID[0]+x]=terrain((x-GRID[0]/2)*DX,(z-GRID[2]/2)*DX,preset)/DX;return data;}
