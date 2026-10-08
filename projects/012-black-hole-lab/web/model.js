/* Units: r_s = c = 1 in trajectory equations. SI constants for temperature/time. */
(function(root){
'use strict';
const G=6.67430e-11,C=299792458,MS=1.98847e30,YEAR=31557600,SIGMA=5.670374419e-8;
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),len=a=>Math.sqrt(dot(a,a));
const add=(a,b,k=1)=>a.map((x,i)=>x+k*b[i]);
const scale=(a,k)=>a.map(x=>x*k),norm=a=>scale(a,1/len(a));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function units(mass=10,rate=1e-9){
 const m=mass*MS,rs=2*G*m/(C*C),mdot=rate*MS/YEAR;
 const temperatureScale=(3*G*m*mdot/(8*Math.PI*SIGMA*rs**3))**.25;
 return {mass,rate,rs,rsKm:rs/1000,timeUnit:rs/C,temperatureScale,
   peakTemperature:temperatureScale*(4.083333333**-3*(1-Math.sqrt(3/4.083333333)))**.25,
   photonSphere:1.5,isco:3,criticalImpact:3*Math.sqrt(3)/2};
}
function diskTemperature(r,mass=10,rate=1e-9){return r<=3?0:units(mass,rate).temperatureScale*(r**-3*(1-Math.sqrt(3/r)))**.25;}
function simpson(f,a,b,eps=1e-7,depth=18){
 const c=(a+b)/2,fa=f(a),fb=f(b),fc=f(c),whole=(b-a)*(fa+4*fc+fb)/6;
 function rec(a,b,fa,fb,fc,whole,eps,n){
  const c=(a+b)/2,d=(a+c)/2,e=(c+b)/2,fd=f(d),fe=f(e);
  const l=(c-a)*(fa+4*fd+fc)/6,r=(b-c)*(fc+4*fe+fb)/6,delta=l+r-whole;
  return n<=0||Math.abs(delta)<15*eps?l+r+delta/15:rec(a,c,fa,fc,fd,l,eps/2,n-1)+rec(c,b,fc,fb,fe,r,eps/2,n-1);
 }return rec(a,b,fa,fb,fc,whole,eps,depth);
}
function collapse(progress,mass=10,r0=4){
 // Radial timelike geodesic from rest: analytic cycloid for the boundary.
 const end=.65,etaEnd=Math.acos(2*end/r0-1),coef=r0**1.5/2,target=Math.max(0,Math.min(1,progress))*coef*(etaEnd+Math.sin(etaEnd));
 let lo=0,hi=etaEnd;for(let i=0;i<35;i++){const m=(lo+hi)/2;if(coef*(m+Math.sin(m))<target)lo=m;else hi=m;}
 const eta=(lo+hi)/2,r=r0/2*(1+Math.cos(eta)),u=units(mass),E=Math.sqrt(1-1/r0);
 let arrival=null,g=0;
 if(r>1){
  const f=1-1/r;g=f/(E+Math.sqrt(Math.max(0,E*E-f)));
  const t=simpson(x=>{const radius=r0/2*(1+Math.cos(x));return E*coef*(1+Math.cos(x))/(1-1/radius);},0,eta);
  // Outgoing radial travel time: tortoise coordinate r* = r + ln(r-1).
  arrival=(t-r-Math.log(r-1)+r0+Math.log(r0-1))*u.timeUnit;
 }
 return {r,properTime:target*u.timeUnit,arrival,redshift:g,bolometricFactor:g**4,inside:r<=1,rsKm:u.rsKm};
}
function radialLight(start,maxV=4,step=.025){
 // Outgoing radial null rays in ingoing Eddington-Finkelstein coordinates.
 const points=[[start,0]];let r=start;
 const f=x=>.5*(1-1/x);
 for(let v=step;v<=maxV;v+=step){const a=f(r),b=f(r+step*a/2),c=f(r+step*b/2),d=f(r+step*c);r+=step*(a+2*b+2*c+d)/6;if(r<.035)break;points.push([r,v]);}
 return points;
}
function trace(camera,localDirection,{limit=70,maxSteps=6500,stopAtDisk=false}={}){
 const R=len(camera),er=scale(camera,1/R),f=1-1/R,n=norm(localDirection);
 let p=[...camera],v=add(n,er,(Math.sqrt(f)-1)*dot(n,er));
 const L2=dot(cross(p,v),cross(p,v)),E2=f,points=[p],crossings=[];
 let captured=false,error=0;
 const acc=x=>scale(x,-1.5*L2/len(x)**5);
 function step(h){
  const ap=acc(p),p2=add(p,v,h/2),v2=add(v,ap,h/2),a2=acc(p2);
  const p3=add(p,v2,h/2),v3=add(v,a2,h/2),a3=acc(p3);
  const p4=add(p,v3,h),v4=add(v,a3,h),a4=acc(p4);
  return [p.map((x,i)=>x+h*(v[i]+2*v2[i]+2*v3[i]+v4[i])/6),v.map((x,i)=>x+h*(ap[i]+2*a2[i]+2*a3[i]+a4[i])/6)];
 }
 for(let i=0;i<maxSteps;i++){
  const r=len(p);if(r<=1.0001){captured=true;break;}if(r>limit&&dot(p,v)>0)break;
  const h=Math.min(.18,Math.max(.004,(r-1)*.06))/Math.max(.4,len(v)),old=p;
  [p,v]=step(h);
  if(old[1]*p[1]<0){const t=old[1]/(old[1]-p[1]),hit=old.map((x,j)=>x+(p[j]-x)*t),rr=len(hit);
   if(rr>3.05&&rr<8.7){crossings.push({point:hit,index:points.length});if(stopAtDisk){points.push(hit);break;}}
  }
  if(i%3===0)points.push([...p]);
  error=Math.max(error,Math.abs(dot(v,v)-L2/len(p)**3-E2));
 }
 return {points,crossings,captured,error,energy:E2,angularMomentum:Math.sqrt(L2),final:p,velocity:v};
}
let probeCache;
function probes(){
 if(probeCache)return probeCache;
 const e=10*Math.PI/180,camera=[0,23*Math.sin(e),23*Math.cos(e)],er=norm(camera),up=[0,Math.cos(e),-Math.sin(e)],results=[];
 // These are backward rays selected by their actual disk intersections.
 for(let i=0;i<=100;i++){
  const a=-.25+i*.005,n=add(scale(er,-Math.cos(a)),up,Math.sin(a)),ray=trace(camera,n,{stopAtDisk:true,maxSteps:2400});
  if(ray.crossings.length&&ray.crossings[0].point[2]<0&&ray.crossings[0].point[2]>-8.4){
    const side=a>0?'upper':'lower';
    if(!results.some(x=>x.side===side))results.push({...ray,side,angle:a});
  }if(results.length===2)break;
 }
 probeCache={camera,rays:results};return probeCache;
}
function bending(b){
 const bc=3*Math.sqrt(3)/2;if(b<=bc)return Infinity;
 let lo=1.5,hi=b;for(let i=0;i<70;i++){const r=(lo+hi)/2;if(r**3/(r-1)<b*b)lo=r;else hi=r;}
 const u=1/((lo+hi)/2);
 // Remove the turning-point square-root singularity by u(theta)=u_turn sin(theta).
 const integral=simpson(t=>{if(t>Math.PI/2-1e-7)return 1/Math.sqrt(1-1.5*u);const s=Math.sin(t);return u*Math.cos(t)/Math.sqrt(Math.max(1e-30,1/(b*b)-u*u*s*s+u**3*s**3));},0,Math.PI/2,1e-7);
 return 2*integral-Math.PI;
}
const API={G,C,MS,units,diskTemperature,collapse,radialLight,trace,probes,bending};
root.BlackHoleModel=Object.freeze(API);if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
