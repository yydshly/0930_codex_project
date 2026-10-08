import * as THREE from 'three';

// One curved leaf surface for garden lilies and the animals' landing pads.
export function lilyGeometry(){
  const positions=[0,.012,0],colors=[.85,1,.72],uv=[.5,.5],indices=[],rings=9,segments=64;
  for(let ring=1;ring<=rings;ring++)for(let j=0;j<=segments;j++){
    const r=ring/rings,a=.19+j/segments*(Math.PI*2-.38),edge=1+.018*Math.sin(a*7)+.01*Math.sin(a*13),x=Math.cos(a)*r*edge,z=Math.sin(a)*r*edge;
    positions.push(x,.012*(1-r*r)+.008*Math.sin(a*3+.4)*r*r,z);uv.push(.5+x*.5,.5+z*.5);
    const tone=.88+.12*(1-r)+.025*Math.sin(a*5+r*7);colors.push(.85*tone,tone,.68*tone);
  }
  for(let j=0;j<segments;j++)indices.push(0,j+2,j+1);
  for(let ring=0;ring<rings-1;ring++)for(let j=0;j<segments;j++){const a=1+ring*(segments+1)+j,b=a+1,c=a+segments+1,d=c+1;indices.push(a,b,c,b,d,c);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

// Barycentric height of the actual triangulated leaf, used for perch contact.
export function lilyHeightAt(geometry,x,z){
  const p=geometry.getAttribute('position'),index=geometry.index;
  for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2),ax=p.getX(a),az=p.getZ(a),bx=p.getX(b),bz=p.getZ(b),cx=p.getX(c),cz=p.getZ(c);
    const det=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz),u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/det,v=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/det;
    if(u>=-1e-9&&v>=-1e-9&&u+v<=1+1e-9)return u*p.getY(a)+v*p.getY(b)+(1-u-v)*p.getY(c);
  }
  throw new Error('Perch point is outside the leaf surface');
}
