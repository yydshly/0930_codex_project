// One continuous surface lets the skin, press interaction and fur share roots.
const smoothstep=(lo,hi,value)=>{const t=Math.max(0,Math.min(1,(value-lo)/(hi-lo)));return t*t*(3-2*t)};

function earLift(x,y,z,spacing,width,height,depth,lo,hi){
  const left=Math.exp(-Math.pow((x-spacing)/width,2));
  const right=Math.exp(-Math.pow((x+spacing)/width,2));
  return height*(left+right)*Math.exp(-Math.pow(z/depth,2))*smoothstep(lo,hi,y);
}

function earRadius(x,y,z,centerX){
  const width=.38,depth=.34,centerY=.82;
  const a=(x*x+y*y)/(width*width)+z*z/(depth*depth);
  const b=-2*(x*centerX+y*centerY)/(width*width);
  const c=(centerX*centerX+centerY*centerY)/(width*width)-1;
  const discriminant=b*b-4*a*c;
  return discriminant<=0?0:Math.max(0,(-b+Math.sqrt(discriminant))/(2*a));
}
function roundUnion(a,b){
  const blend=.04,h=Math.max(blend-Math.abs(a-b),0)/blend;
  return Math.max(a,b)+h*h*blend*.25;
}

/** Evaluate a closed, continuous body surface without a rendering dependency. */
export function shapePoint(shape,theta,phi){
  const y=Math.cos(theta),ring=Math.sin(theta);
  const x=ring*Math.sin(phi),z=ring*Math.cos(phi);
  if(shape==='bunny'){
    // Two rounded ears rise from a smaller head. The polar vertex stays on
    // the crown between the ears, rather than stretching into a single tip.
    return [x*.86,y*.93+earLift(x,y,z,.43,.145,.68,.26,.5,.86),z*.72];
  }
  if(shape==='bear'){
    // A rounded head and two circular ear caps form a single radial surface.
    // Their overlap stays connected along rays, and a narrow smooth union
    // softens the shoulders without turning the ear caps into pointed bumps.
    let radius=1/Math.sqrt(x*x/(1.01*1.01)+y*y/(.97*.97)+z*z/(.77*.77));
    radius=roundUnion(radius,earRadius(x,y,z,-.64));
    radius=roundUnion(radius,earRadius(x,y,z,.64));
    return [x*radius,y*radius,z*radius];
  }
  if(shape==='star'){
    // A five-fold planar outline with a rounded front and back. The harmonic
    // is polynomial at the face center, avoiding angle seams or pinched tips.
    const radius=Math.hypot(x,y),r5=radius**5;
    const harmonic=y**5-10*y**3*x*x+5*y*x**4;
    const scale=1+.24*harmonic/(.25+.75*r5);
    return [x*scale,y*scale,z*.78];
  }
  let rx=1,ry=1.1,rz=.77;
  if(shape==='pear'){rx=1.04*(1-.23*y+.10*Math.cos(y*5));ry=1.14}
  if(shape==='bean'){rx=1.04*(1+.09*Math.cos(phi*2)*(1-y*y));ry=.94;rz=.78}
  if(shape==='triangle'){rx=1.02*(1-.55*y);ry=1.17;rz=.74}
  if(shape==='heart'){rx=1.05*(1+.38*y);ry=.99;rz=.69}
  if(shape==='egg'){rx=.93*(1-.13*y);ry=1.15;rz=.76}
  let py=y*ry;
  if(shape==='heart')py-=.24*Math.exp(-Math.pow(Math.sin(phi)*ring/.25,2))*Math.max(0,y);
  return [x*rx,py,z*rz];
}
