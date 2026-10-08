// CPU mirror of the GPU height/velocity update. Both use the same masked
// five-point stencil; the GPU render target additionally rounds to float16.
export const RIPPLE_CONSTANTS=Object.freeze({stiffness:1.65,velocityDamping:.986,heightDamping:.998,maxHeight:.14,maxVelocity:.08});
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export class RippleField{
 constructor(size=128,mask=null){this.size=size;this.mask=mask;this.height=new Float32Array(size*size);this.velocity=new Float32Array(size*size);this.nextHeight=new Float32Array(size*size);this.nextVelocity=new Float32Array(size*size);}
 reset(){this.height.fill(0);this.velocity.fill(0);this.nextHeight.fill(0);this.nextVelocity.fill(0);}
 wet(i){return !this.mask||this.mask[i*(this.mask.length===this.size*this.size*4?4:1)]>127;}
 step(impulses=[]){const n=this.size,h=this.height,v=this.velocity,out=this.nextHeight,ov=this.nextVelocity,k=RIPPLE_CONSTANTS;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x;if(!this.wet(i)){out[i]=ov[i]=0;continue;}
   const center=h[i],left=y*n+Math.max(0,x-1),right=y*n+Math.min(n-1,x+1),bottom=Math.max(0,y-1)*n+x,top=Math.min(n-1,y+1)*n+x;
   const avg=((this.wet(left)?h[left]:center)+(this.wet(right)?h[right]:center)+(this.wet(bottom)?h[bottom]:center)+(this.wet(top)?h[top]:center))*.25;
   const speed=(v[i]+(avg-center)*k.stiffness)*k.velocityDamping;let height=(center+speed)*k.heightDamping;
   for(const p of impulses){const r=Math.max(p.z,.0001),dx=((x+.5)/n-p.x)/r,dy=((y+.5)/n-p.y)/r,d2=dx*dx+dy*dy;if(d2<12)height+=Math.exp(-d2*3)*p.w;}
   out[i]=clamp(height,-k.maxHeight,k.maxHeight);ov[i]=clamp(speed,-k.maxVelocity,k.maxVelocity);
  }
  [this.height,this.nextHeight]=[out,h];[this.velocity,this.nextVelocity]=[ov,v];
 }
 sample(u,v){if(!Number.isFinite(u+v)||u<0||v<0||u>1||v>1)return 0;const n=this.size,px=u*n-.5,py=v*n-.5,x=Math.floor(px),y=Math.floor(py),tx=px-x,ty=py-y;
  const value=(ix,iy)=>this.height[clamp(iy,0,n-1)*n+clamp(ix,0,n-1)],a=value(x,y)*(1-tx)+value(x+1,y)*tx,b=value(x,y+1)*(1-tx)+value(x+1,y+1)*tx;return a*(1-ty)+b*ty;
 }
}
