// The visible skin and its attachments share this exact Gaussian field.
// Its analytic derivative avoids six finite-difference evaluations per vertex.
export function sampleField(model,x,y,z,out,jacobian=null,coefficient=0){
 out.fill(0);
 if(!model.activeSoft){if(jacobian){jacobian.fill(0);jacobian[0]=jacobian[4]=jacobian[8]=1;}return;}
 const soft=model.activeSoft,a=soft.toLocal.elements,b=soft.mesh.matrix.elements,p=soft.point,axis=model.fieldAxis;
 const lx=a[0]*x+a[4]*y+a[8]*z+a[12],ly=a[1]*x+a[5]*y+a[9]*z+a[13],lz=a[2]*x+a[6]*y+a[10]*z+a[14],qx=lx-p.x,qy=ly-p.y,qz=lz-p.z,d=qx*qx+qy*qy+qz*qz,f=Math.exp(-d*1.8),w=Math.exp(-d*1.1),dot=lx*axis.x+ly*axis.y+lz*axis.z,tx=lx-axis.x*dot,ty=ly-axis.y*dot,tz=lz-axis.z*dot,vx=model.stretch.x-p.x*model.indent,vy=model.stretch.y-p.y*model.indent,vz=model.stretch.z-p.z*model.indent;
 for(let row=0;row<3;row++){
  const bv=b[row]*vx+b[row+4]*vy+b[row+8]*vz,bt=b[row]*tx+b[row+4]*ty+b[row+8]*tz,bu=b[row]*axis.x+b[row+4]*axis.y+b[row+8]*axis.z;
  out[row]=bv*f;out[row+3]=bt*w;
  if(jacobian)for(let column=0;column<3;column++){
   const g=qx*a[column*4]+qy*a[column*4+1]+qz*a[column*4+2],ua=axis.x*a[column*4]+axis.y*a[column*4+1]+axis.z*a[column*4+2],identity=row===column?1:0;
   jacobian[column*3+row]=identity-3.6*f*bv*g+coefficient*w*(identity-bu*ua-2.2*bt*g);
  }
 }
}

export function transformNormal(j,nx,ny,nz,out){
 const [ax,ay,az,bx,by,bz,cx,cy,cz]=j,x=(by*cz-bz*cy)*nx+(cy*az-cz*ay)*ny+(ay*bz-az*by)*nz,y=(bz*cx-bx*cz)*nx+(cz*ax-cx*az)*ny+(az*bx-ax*bz)*nz,z=(bx*cy-by*cx)*nx+(cx*ay-cy*ax)*ny+(ax*by-ay*bx)*nz,length=Math.hypot(x,y,z);
 out[0]=length>1e-6?x/length:nx;out[1]=length>1e-6?y/length:ny;out[2]=length>1e-6?z/length:nz;
 return ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx);
}
