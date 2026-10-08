// CASE 07 only: material-scale weathering and mildly worn structural timber.
// These are original authored surfaces, not recovered source-game textures.
import '../demo/runtime/vendor/three-r160.min.js';
const T=globalThis.THREE;

export function laneTimberMaterial({mat,textures,seed=27}){
 let n=seed;const random=()=>{n=n*16807%2147483647;return(n-1)/2147483646;};
 const c=document.createElement('canvas');c.width=256;c.height=1024;const g=c.getContext('2d');
 g.fillStyle='#827361';g.fillRect(0,0,256,1024);
 // One solid piece of timber. Long fibres are aligned by each beam's UVs.
 for(let i=0;i<310;i++){
  const x=random()*256,w=.2+random()*2.2;g.strokeStyle=i%3?'rgba(45,37,29,.18)':'rgba(223,202,169,.15)';g.lineWidth=w;
  g.beginPath();g.moveTo(x,0);for(let y=0;y<=1024;y+=32)g.lineTo(x+Math.sin(y*.015+i)*(.5+random()*1.6),y);g.stroke();
 }
 for(let i=0;i<18;i++){
  const x=10+random()*236,y=random()*1024;g.strokeStyle='#493e3435';g.lineWidth=.8;g.beginPath();g.moveTo(x,y);
  for(let k=1;k<9;k++)g.lineTo(x+Math.sin(k*.57+i)*1.4,y+k*(9+random()*7));g.stroke();
 }
 for(const [x,y] of [[61,273],[197,757]])for(let i=0;i<6;i++){
  g.strokeStyle=`rgba(50,39,29,${.11-i*.009})`;g.lineWidth=1;g.beginPath();g.ellipse(x,y,2+i*1.3,10+i*7,.06,0,Math.PI*2);g.stroke();
 }
 const edge=g.createLinearGradient(0,0,256,0);edge.addColorStop(0,'#e2cdae23');edge.addColorStop(.06,'#e2cdae00');edge.addColorStop(.92,'#e2cdae00');edge.addColorStop(1,'#e2cdae28');g.fillStyle=edge;g.fillRect(0,0,256,1024);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=8;textures.push(map);
 return ['#bbb4a4','#d2c5b0','#aaab99'].map(color=>mat(color,{map,bumpMap:map,bumpScale:.007,roughness:.97,envMapIntensity:.13}));
}

export function wornTimberGeometry(width,height,depth,seed=0){
 const dimensions=[width,height,depth],axis=dimensions.indexOf(Math.max(...dimensions)),others=[0,1,2].filter(n=>n!==axis),length=dimensions[axis],a=dimensions[others[0]]/2,b=dimensions[others[1]]/2,bevel=Math.min(a,b)*.16;
 const profile=[[-a+bevel,-b],[a-bevel,-b],[a,-b+bevel],[a,b-bevel],[a-bevel,b],[-a+bevel,b],[-a,b-bevel],[-a,-b+bevel]],p=[],uv=[],indices=[],steps=length>1.4?3:1;
 for(let ring=0;ring<=steps;ring++)for(let k=0;k<8;k++){
  const t=ring/steps,point=[0,0,0],wear=1+(ring===0||ring===steps?-.018:Math.sin(seed*3.17+ring*2.8)*.027);
  point[axis]=(t-.5)*length;point[others[0]]=profile[k][0]*wear;point[others[1]]=profile[k][1]*wear;
  // Slight side drift remains inside the original structural piece's envelope.
  if(ring>0&&ring<steps)point[others[0]]+=Math.sin(seed+ring*1.7)*Math.min(a,b)*.035;
  p.push(...point);uv.push(k/8,t*length/2.6+seed*.173);
  if(ring<steps){const i=ring*8+k,j=ring*8+(k+1)%8;indices.push(i,j,i+8,j,j+8,i+8);}
 }
 // The ring order depends on the long axis; orient every face outwards.
 for(let k=1;k<7;k++){indices.push(0,k+1,k);const q=steps*8;indices.push(q,q+k,q+k+1);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
 // The coordinate permutation changes winding for a Y-aligned beam.
 if(axis===1){const idx=geometry.index;for(let i=0;i<idx.count;i+=3){const v=idx.getX(i+1);idx.setX(i+1,idx.getX(i+2));idx.setX(i+2,v);}}
 geometry.computeVertexNormals();return geometry;
}

export function lanePlaster({span,height,index,windows,door,mat,textures,seed=37}){
 let n=seed;const random=()=>{n=n*16807%2147483647;return(n-1)/2147483646;};
 const c=document.createElement('canvas');c.width=c.height=768;const g=c.getContext('2d'),s=768;
 g.fillStyle=index?'#b7b7a5':'#bd9683';g.fillRect(0,0,s,s);
 // Broad mineral stains are separated from sub-centimetre plaster grain.
 for(let i=0;i<180;i++){
  const x=random()*s,y=random()*s,r=18+random()*85,cloud=g.createRadialGradient(x,y,0,x,y,r);cloud.addColorStop(0,i%2?'#f1e9cd0a':'#514f3e0b');cloud.addColorStop(1,'#00000000');g.fillStyle=cloud;g.fillRect(x-r,y-r,r*2,r*2);
 }
 for(let i=0;i<14000;i++){g.fillStyle=i%2?'#e9e2cc14':'#4f443415';g.fillRect(random()*s,random()*s,.35+random()*1.3,.35+random()*1.3);}
 const damp=g.createLinearGradient(0,s*.62,0,s);damp.addColorStop(0,'#37433600');damp.addColorStop(.63,'#51503910');damp.addColorStop(1,'#34442f42');g.fillStyle=damp;g.fillRect(0,s*.62,s,s*.38);
 const X=x=>(x/span+.5)*s,Y=y=>(1-y/height)*s;
 function crack(x,y,direction,length){
  g.strokeStyle='#554c3e55';g.lineWidth=.45;g.beginPath();g.moveTo(x,y);
  for(let k=1;k<8;k++){x+=direction*(2+random()*3);y+=length/8;g.lineTo(x,y);}g.stroke();
  g.strokeStyle='#ddd0b040';g.lineWidth=.35;g.beginPath();g.moveTo(x,y);g.lineTo(x+direction*13,y+length*.28);g.stroke();
 }
 for(const w of windows){
  for(const side of [-1,1]){
   const x=X(w.x+side*.44),y=Y(w.y-.56),rain=g.createLinearGradient(x,y,x,y+80);rain.addColorStop(0,'#55564227');rain.addColorStop(1,'#55564200');g.fillStyle=rain;g.fillRect(x-2,y,4+random()*4,80+random()*45);
   if(random()>.25)crack(x,Y(w.y+.54),side,28+random()*31);
  }
 }
 // Small plaster losses at the stone contact line, never a repeated brick grid.
 for(let i=0;i<13;i++){
  const x=8+random()*(s-16),y=Y(.68+random()*.20),r=4+random()*12;if(door&&Math.abs(x-X(door.x))<s*.68/span)continue;
  g.fillStyle=i%3?'#8e847266':'#b8a58c88';g.beginPath();for(let k=0;k<9;k++){const a=k*Math.PI*2/9,rr=r*(.56+random()*.44),px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr*.56;if(k===0)g.moveTo(px,py);else g.lineTo(px,py);}g.closePath();g.fill();
 }
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;textures.push(map);
 return mat('#eeeade',{map,bumpMap:map,bumpScale:.012,roughness:.98,envMapIntensity:.10});
}
