import {GRID,DX,terrain,clamp} from './world.js';

export const fieldIndex=(x,y,z)=>x+GRID[0]*(y+GRID[1]*z);
export const gridPoint=(x,y,z)=>[(x-GRID[0]/2)*DX,y*DX,(z-GRID[2]/2)*DX];
export function sampleField(field,p){
  const q=[p[0]/DX+GRID[0]/2,p[1]/DX,p[2]/DX+GRID[2]/2].map((v,i)=>clamp(v,0,GRID[i]-1.001));
  const a=q.map(Math.floor),t=q.map((v,i)=>v-a[i]);let result=0;
  for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++)result+=field[fieldIndex(a[0]+x,a[1]+y,a[2]+z)]*(x?t[0]:1-t[0])*(y?t[1]:1-t[1])*(z?t[2]:1-t[2]);
  return result;
}
export function fieldNormal(field,p){const e=DX*.5;const g=[0,1,2].map(i=>{const a=[...p],b=[...p];a[i]+=e;b[i]-=e;return sampleField(field,a)-sampleField(field,b);});const n=Math.hypot(...g);return n>1e-8?g.map(v=>v/n):[0,1,0];}
export function surfaceHeight(field,x,z){
  for(let y=(GRID[1]-2)*DX;y>=DX*.25;y-=DX){if(sampleField(field,[x,y,z])<0){let lo=y,hi=y+DX;for(let j=0;j<6;j++){const m=(lo+hi)/2;if(sampleField(field,[x,m,z])<0)lo=m;else hi=m;}return (lo+hi)/2;}}
  return 0;
}
function brushBounds(center,radius){return center.map((v,i)=>{const shift=i===0?GRID[0]/2:i===2?GRID[2]/2:0;return [clamp(Math.floor((v-radius)/DX+shift)-1,0,GRID[i]-1),clamp(Math.ceil((v+radius)/DX+shift)+1,0,GRID[i]-1)];});}
export function buildTerrainField(preset=0,edits=[]){
  const field=new Float32Array(GRID[0]*GRID[1]*GRID[2]);
  for(let z=0;z<GRID[2];z++)for(let x=0;x<GRID[0];x++){const h=terrain((x-GRID[0]/2)*DX,(z-GRID[2]/2)*DX,preset)/DX;for(let y=0;y<GRID[1];y++)field[fieldIndex(x,y,z)]=y-h;}
  const original=field.slice();
  return applyTerrainEdits(field,original,edits);
}
export function applyTerrainEdits(field,original,edits){
  for(const edit of edits){
    const {center,radius,op}=edit,b=brushBounds(center,radius+DX),before=op==='smooth'?field.slice():null;
    for(let z=b[2][0];z<=b[2][1];z++)for(let y=b[1][0];y<=b[1][1];y++)for(let x=b[0][0];x<=b[0][1];x++){
      const p=gridPoint(x,y,z),d=Math.hypot(...p.map((v,i)=>v-center[i])),s=(d-radius)/DX,k=fieldIndex(x,y,z);
      if(op==='cut')field[k]=Math.max(field[k],-s);
      else if(op==='add')field[k]=Math.min(field[k],s);
      else if(op==='restore'&&d<=radius)field[k]=original[k];
      else if(d<radius&&['smooth','flatten'].includes(op)){
        const weight=(1-d/radius)**2*(edit.strength??.65);
        let target=(p[1]-edit.level)/DX;
        if(op==='smooth'){target=0;let count=0;for(const [xx,yy,zz] of [[x-1,y,z],[x+1,y,z],[x,y-1,z],[x,y+1,z],[x,y,z-1],[x,y,z+1]])if(xx>=0&&xx<GRID[0]&&yy>=0&&yy<GRID[1]&&zz>=0&&zz<GRID[2]){target+=before[fieldIndex(xx,yy,zz)];count++;}target/=Math.max(1,count);}
        field[k]=field[k]*(1-weight)+target*weight;
      }
    }
  }
  return field;
}
export class TerrainFieldCache {
  update(preset,edits){
    const keys=edits.map(edit=>JSON.stringify(edit));
    const append=this.preset===preset&&this.keys&&this.keys.length<=keys.length&&this.keys.every((key,i)=>key===keys[i]);
    if(!append){this.original=buildTerrainField(preset);this.field=this.original.slice();this.keys=[];this.preset=preset;}
    this.applied=edits.length-this.keys.length;
    applyTerrainEdits(this.field,this.original,edits.slice(this.keys.length));
    if(!append||this.applied)this.revision=(this.revision||0)+1;
    this.keys=keys;
    return this.field;
  }
}
export function combineObjects(terrainField,objects){
  const field=terrainField.slice();
  return applyObjects(field,objects);
}
function applyObjects(field,objects){
  for(const o of objects){
    const bounds=brushBounds(o.position,Math.max(...o.scale)*1.1+DX),a=o.rotation||0,c=Math.cos(a),s=Math.sin(a),unit=Math.min(...o.scale)/DX;
    for(let z=bounds[2][0];z<=bounds[2][1];z++)for(let y=bounds[1][0];y<=bounds[1][1];y++)for(let x=bounds[0][0];x<=bounds[0][1];x++){
      const p=gridPoint(x,y,z),xx=p[0]-o.position[0],zz=p[2]-o.position[2];
      const d=(Math.hypot((xx*c-zz*s)/o.scale[0],(p[1]-o.position[1])/o.scale[1],(xx*s+zz*c)/o.scale[2])-1)*unit;
      const k=fieldIndex(x,y,z);field[k]=Math.min(field[k],d);
    }
  }
  return field;
}
// Terrain is edited in place, so its revision must accompany its identity.
// During a drag only the moving group is reapplied to the static baseline.
export class ObjectFieldCache {
  update(terrainField,objects,terrainRevision=0,movingIndices=[]){
    const moving=new Set(movingIndices||[]),fixed=objects.filter((o,i)=>!moving.has(i));
    const geometry=o=>[o.position,o.scale,o.rotation||0];
    const staticKey=JSON.stringify(fixed.map(geometry)),objectKey=JSON.stringify(objects.map(geometry));
    const rebuild=this.terrain!==terrainField||this.revision!==terrainRevision||this.staticKey!==staticKey;
    const changed=rebuild||this.objectKey!==objectKey;
    if(rebuild){this.baseline=combineObjects(terrainField,fixed);this.field??=new Float32Array(terrainField.length);this.staticBuilds=(this.staticBuilds||0)+1;}
    if(changed){this.field.set(this.baseline);applyObjects(this.field,objects.filter((o,i)=>moving.has(i)));}
    this.terrain=terrainField;this.revision=terrainRevision;this.staticKey=staticKey;this.objectKey=objectKey;
    return {field:this.field,changed,staticRebuilt:rebuild};
  }
}
export function raycastTerrain(field,origin,direction,maxDistance=70){
  let previous=null;
  for(let t=0;t<maxDistance;t+=.055){const p=origin.map((v,i)=>v+direction[i]*t);if(Math.abs(p[0])>5.65||p[1]<.06||p[1]>(GRID[1]-2)*DX||p[2]<-4.6||p[2]>4.3){previous=null;continue;}
    if(sampleField(field,p)<=0 && previous){let a=previous,b=t;for(let j=0;j<9;j++){const m=(a+b)/2,pp=origin.map((v,i)=>v+direction[i]*m);if(sampleField(field,pp)<=0)b=m;else a=m;}const hit=origin.map((v,i)=>v+direction[i]*(a+b)/2);return {point:hit,normal:fieldNormal(field,hit)};}previous=t;
  }return null;
}

const CORNERS=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const TETS=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
export function buildTerrainMesh(field){
  const out=[];
  function emit(a,b,c){
    const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);let n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],l=Math.hypot(...n);if(l<1e-9)return;
    n=n.map(v=>v/l);const mid=a.map((v,i)=>(v+b[i]+c[i])/3),gradient=fieldNormal(field,mid);if(n.reduce((s,v,i)=>s+v*gradient[i],0)<0){[b,c]=[c,b];n=n.map(v=>-v);}
    const moss=clamp((n[1]-.1)*1.3,0,1),shade=.94+.045*Math.sin(mid[0]*19+mid[1]*11+mid[2]*23);
    const color=[(.29+.035*moss)*shade,(.33+.09*moss)*shade,(.29-.06*moss)*shade];
    for(const p of [a,b,c])out.push(...p,...n,...color);
  }
  for(let z=1;z<GRID[2]-2;z++)for(let y=0;y<GRID[1]-2;y++)for(let x=1;x<GRID[0]-2;x++){
    const values=CORNERS.map(c=>field[fieldIndex(x+c[0],y+c[1],z+c[2])]);if(values.every(v=>v>=0)||values.every(v=>v<0))continue;
    const pts=CORNERS.map(c=>gridPoint(x+c[0],y+c[1],z+c[2]));
    const edge=(a,b)=>{const t=values[a]/(values[a]-values[b]);return pts[a].map((v,i)=>v+(pts[b][i]-v)*t);};
    for(const tet of TETS){const inside=tet.filter(i=>values[i]<0),outside=tet.filter(i=>values[i]>=0);if(inside.length===1||inside.length===3){const one=inside.length===1?inside[0]:outside[0],rest=inside.length===1?outside:inside;emit(...rest.map(i=>edge(one,i)));}else if(inside.length===2){const [a,b]=inside,[c,d]=outside,ac=edge(a,c),ad=edge(a,d),bc=edge(b,c),bd=edge(b,d);emit(ac,ad,bc);emit(bc,ad,bd);}}
  }
  return new Float32Array(out);
}
