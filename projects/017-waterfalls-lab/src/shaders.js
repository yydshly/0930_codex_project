// Liquid constraint and APIC transfer adapted from EA PB-MPM (BSD-3-Clause).
// The 3D liquid adaptation also references Breakpoint (MIT). See source-notice.html.
export const SIM = /* wgsl */`
struct Params { grid:vec4u, config:vec4f, source:vec4f, step:vec4u, tool:vec4f };
struct Particle { p:vec4f, d:vec4f, c0:vec4f, c1:vec4f, c2:vec4f };
struct Cell { x:atomic<i32>, y:atomic<i32>, z:atomic<i32>, mass:atomic<i32>, volume:atomic<i32> };
struct Spring { position:vec4f, velocity:vec4f };
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var<storage,read_write> particles:array<Particle>;
@group(0) @binding(2) var<storage,read_write> grid:array<Cell>;
@group(0) @binding(3) var<storage,read_write> velocities:array<vec4f>;
@group(0) @binding(4) var<storage,read> solid:array<f32>;
@group(0) @binding(5) var<storage,read> springs:array<Spring>;
const SCALE:f32=1048576.0;
fn hash(n:u32)->f32 {var x=n;x=(x^61u)^(x>>16u);x=x*9u;x=x^(x>>4u);x=x*0x27d4eb2du;x=x^(x>>15u);return f32(x&65535u)/65535.0;}
fn addr(p:vec3i)->u32{return u32(p.x)+u.grid.x*(u32(p.y)+u.grid.y*u32(p.z));}
fn solidAt(p:vec3f)->f32{
  let q=clamp(p,vec3f(0),vec3f(u.grid.xyz)-1.001);let b=vec3i(floor(q));let t=fract(q);
  let a=mix(solid[addr(b)],solid[addr(b+vec3i(1,0,0))],t.x);
  let c=mix(solid[addr(b+vec3i(0,1,0))],solid[addr(b+vec3i(1,1,0))],t.x);
  let d=mix(solid[addr(b+vec3i(0,0,1))],solid[addr(b+vec3i(1,0,1))],t.x);
  let e=mix(solid[addr(b+vec3i(0,1,1))],solid[addr(b+vec3i(1,1,1))],t.x);
  return mix(mix(a,c,t.y),mix(d,e,t.y),t.z);
}
fn solidGradient(p:vec3f)->vec3f{return vec3f(solidAt(p+vec3f(.5,0,0))-solidAt(p-vec3f(.5,0,0)),solidAt(p+vec3f(0,.5,0))-solidAt(p-vec3f(0,.5,0)),solidAt(p+vec3f(0,0,.5))-solidAt(p-vec3f(0,0,.5)));}
fn solidNormal(p:vec3f)->vec3f{let g=solidGradient(p);return select(vec3f(0,1,0),g/max(length(g),.0001),length(g)>.0001);}
fn world(p:vec3f)->vec3f{return (p-vec3f(f32(u.grid.x)*.5,0,f32(u.grid.z)*.5))*u.config.y;}
fn local(p:vec3f)->vec3f{return p/u.config.y+vec3f(f32(u.grid.x)*.5,0,f32(u.grid.z)*.5);}
fn collideVelocity(p:vec3f,dd:vec3f)->vec3f{
  var d=dd;let predicted=p+d;
  if(solidAt(predicted)<.33){let n=solidNormal(predicted);d-=min(dot(d,n),0.0)*n;d*=.985;}
  if(predicted.x<2.0 || predicted.x>f32(u.grid.x)-3.0){d.x=0.0;}
  if(predicted.z<2.0){d.z=max(d.z,0.0);}
  return d;
}
@compute @workgroup_size(128) fn prepare(@builtin(global_invocation_id) id:vec3u){
  let i=id.x;if(i>=u.grid.w){return;}var p=particles[i];
  // Recycle particles at the open outflow, and gradually feed the river from its spring.
  let invalid=any(p.p.xyz!=p.p.xyz)||any(abs(p.p.xyz)>vec3f(500));
  let recycle=p.p.z>f32(u.grid.z)-3.0 || (p.p.y<.38 && solidAt(p.p.xyz)>.05) || invalid;
  let emit=hash(i*17u+u.step.x*7919u)<min(u.source.w*.0009,.025);
  if(recycle && u.source.w<.001){p.p=vec4f(1,1,1,-1);p.d=vec4f(0);particles[i]=p;return;}
  if(p.p.w<0.0 && !emit){return;}
  if(recycle || emit || p.p.w<0.0){
    let r=vec3f(hash(i*3u+u.step.x*47u),hash(i*7u+u.step.x*31u),hash(i*19u+u.step.x*17u));
    let choice=min(hash(i*977u+u.step.x*4967u),.999999);var sourceIndex=u.step.w-1u;
    for(var j=0u;j<u.step.w;j++){if(choice<springs[j].position.w){sourceIndex=j;break;}}
    let spring=springs[sourceIndex];let velocity=spring.velocity.xyz;
    let direction=select(vec3f(0,0,1),velocity/max(length(velocity),.00001),length(velocity)>.00001);
    let reference=select(vec3f(0,1,0),vec3f(1,0,0),abs(direction.y)>.9);
    let side=normalize(cross(direction,reference));let up=cross(side,direction);
    let angle=r.y*6.2831853;let radius=sqrt(r.x)*spring.velocity.w;
    let position=spring.position.xyz+radius*(cos(angle)*side+sin(angle)*up)+(r.z-.5)*direction*.6;
    p.p=vec4f(clamp(position,vec3f(2,1,2),vec3f(u.grid.xyz)-3.0),1.0);
    p.d=vec4f(velocity,0);p.c0=vec4f(0);p.c1=vec4f(0);p.c2=vec4f(0);
  }
  p.d=vec4f(clamp(p.d.xyz+vec3f(0,-u.config.z*u.config.x*u.config.x/u.config.y,0),vec3f(-.48),vec3f(.48)),max(0.0,p.d.w-.008));
  particles[i]=p;
}
@compute @workgroup_size(128) fn p2g(@builtin(global_invocation_id) id:vec3u){
  let i=id.x;if(i>=u.grid.w){return;}var p=particles[i];if(p.p.w<0.0){return;}
  let base=vec3i(floor(p.p.xyz-.5));let f=p.p.xyz-vec3f(base);
  let w=array<vec3f,3>(.5*(1.5-f)*(1.5-f),.75-(f-1.0)*(f-1.0),.5*(f-.5)*(f-.5));
  var C=mat3x3f(p.c0.xyz,p.c1.xyz,p.c2.xyz);
  // 1/3 is the 3D trace correction; EA's 2D formula uses 1/2.
  let tr=C[0].x+C[1].y+C[2].z;
  C-=u.config.w*.5*(C+transpose(C));
  let alpha=clamp((1.0/clamp(p.p.w,.3,2.5)-tr-1.0)/3.0,-.12,.12)*.72;
  C[0].x+=alpha;C[1].y+=alpha;C[2].z+=alpha;
  for(var z=0;z<3;z++){for(var y=0;y<3;y++){for(var x=0;x<3;x++){
    let q=base+vec3i(x,y,z);if(any(q<vec3i(1))||any(q>=vec3i(u.grid.xyz)-1)){continue;}
    let weight=w[x].x*w[y].y*w[z].z;let dpos=vec3f(vec3i(x,y,z))-f;
    let dd=weight*(p.d.xyz+C*dpos);let k=addr(q);
    atomicAdd(&grid[k].x,i32(dd.x*SCALE));atomicAdd(&grid[k].y,i32(dd.y*SCALE));atomicAdd(&grid[k].z,i32(dd.z*SCALE));
    atomicAdd(&grid[k].mass,i32(weight*SCALE));atomicAdd(&grid[k].volume,i32(weight*.125*u.tool.y*SCALE));
  }}}
}
@compute @workgroup_size(128) fn updateGrid(@builtin(global_invocation_id) id:vec3u){
  let k=id.x;let size=u.grid.x*u.grid.y*u.grid.z;if(k>=size){return;}
  let mass=f32(atomicLoad(&grid[k].mass))/SCALE;
  if(mass<.00001){velocities[k]=vec4f(0);return;}
  let d=vec3f(f32(atomicLoad(&grid[k].x)),f32(atomicLoad(&grid[k].y)),f32(atomicLoad(&grid[k].z)))/(SCALE*mass);
  let p=vec3f(f32(k%u.grid.x),f32(k/u.grid.x%u.grid.y),f32(k/(u.grid.x*u.grid.y)));
  velocities[k]=vec4f(collideVelocity(p,d),f32(atomicLoad(&grid[k].volume))/SCALE);
}
@compute @workgroup_size(128) fn g2p(@builtin(global_invocation_id) id:vec3u){
  let i=id.x;if(i>=u.grid.w){return;}var p=particles[i];if(p.p.w<0.0){return;}
  let base=vec3i(floor(p.p.xyz-.5));let f=p.p.xyz-vec3f(base);
  let w=array<vec3f,3>(.5*(1.5-f)*(1.5-f),.75-(f-1.0)*(f-1.0),.5*(f-.5)*(f-.5));
  var d=vec3f(0);var c0=vec3f(0);var c1=vec3f(0);var c2=vec3f(0);var volume=0.0;
  for(var z=0;z<3;z++){for(var y=0;y<3;y++){for(var x=0;x<3;x++){
    let q=base+vec3i(x,y,z);if(any(q<vec3i(1))||any(q>=vec3i(u.grid.xyz)-1)){continue;}
    let weight=w[x].x*w[y].y*w[z].z;let gv=velocities[addr(q)];let v=weight*gv.xyz;
    let r=vec3f(vec3i(x,y,z))-f;d+=v;c0+=4.0*v*r.x;c1+=4.0*v*r.y;c2+=4.0*v*r.z;volume+=weight*gv.w;
  }}}
  if(volume<.035){d=mix(d,p.d.xyz,.65);c0*=.2;c1*=.2;c2*=.2;}
  var J=p.p.w;if(volume>.95){J=mix(J,clamp(1.0/max(volume,.01),.3,2.5),.06);}
  if(u.step.z==1u){
    J=clamp(J*(1.0+c0.x+c1.y+c2.z),.3,2.5);
    var pp=p.p.xyz+d;
    var foam=p.d.w;
    for(var j=0u;j<4u;j++){
      let distance=solidAt(pp);if(distance>=.31){break;}
      let g=solidGradient(pp);let gl=length(g);let n=select(vec3f(0,1,0),g/max(gl,.0001),gl>.0001);pp+=n*min(3.0,(.31-distance)/max(gl,.15));
      foam=max(foam,clamp(-dot(p.d.xyz,n)*8.0,0.0,1.0));d-=min(dot(d,n),0.0)*n;
    }
    pp=clamp(pp,vec3f(2,.25,2),vec3f(f32(u.grid.x)-3.0,f32(u.grid.y)-3.0,f32(u.grid.z)-1.0));
    p.p=vec4f(pp,J);p.d=vec4f(clamp(d,vec3f(-.48),vec3f(.48)),foam);
  }else{p.d=vec4f(d,p.d.w);}
  p.c0=vec4f(clamp(c0,vec3f(-.3),vec3f(.3)),0);p.c1=vec4f(clamp(c1,vec3f(-.3),vec3f(.3)),0);p.c2=vec4f(clamp(c2,vec3f(-.3),vec3f(.3)),0);
  particles[i]=p;
}
`;

export const FRAME=/* wgsl */`
struct Frame { vp:mat4x4f, view:mat4x4f, invVP:mat4x4f, lightVP:mat4x4f, eye:vec4f, sun:vec4f, viewport:vec4f, settings:vec4f, right:vec4f, up:vec4f };
@group(0) @binding(0) var<uniform> f:Frame;
fn sky(dir:vec3f)->vec3f{
  let t=clamp(dir.y*.7+.3,0.0,1.0);
  var c=mix(vec3f(.32,.43,.39),vec3f(.10,.23,.28),pow(t,.65));
  let glow=pow(max(dot(dir,normalize(f.sun.xyz)),0.0),18.0);
  c+=glow*vec3f(1.2,.75,.32)*f.sun.w;
  return c;
}
fn tonemap(c:vec3f)->vec3f {let x=c*f.settings.x;return pow(clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),vec3f(0),vec3f(1)),vec3f(1.0/2.2));}
struct FullOut { @builtin(position) pos:vec4f, @location(0) uv:vec2f };
@vertex fn fullscreen(@builtin(vertex_index) i:u32)->FullOut{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:FullOut;o.pos=vec4f(p[i],0,1);o.uv=p[i]*vec2f(.5,-.5)+.5;return o;}
`;
export const SCENE=FRAME+/* wgsl */`
@group(0) @binding(1) var shadow:texture_depth_2d;
@group(0) @binding(2) var shadowSampler:sampler_comparison;
struct SceneOut { @builtin(position) pos:vec4f, @location(0) world:vec3f, @location(1) normal:vec3f, @location(2) color:vec3f };
@vertex fn vs(@location(0) p:vec3f,@location(1) n:vec3f,@location(2) color:vec3f)->SceneOut{var o:SceneOut;o.pos=f.vp*vec4f(p,1);o.world=p;o.normal=n;o.color=color;return o;}
@vertex fn shadowVS(@location(0) p:vec3f)->@builtin(position) vec4f{return f.lightVP*vec4f(p,1);}
fn shadeShadow(p:vec3f)->f32{
  let clip=f.lightVP*vec4f(p,1);let q=clip.xyz/clip.w;let uv=q.xy*vec2f(.5,-.5)+.5;
  if(any(uv<vec2f(0))||any(uv>vec2f(1))){return 1.0;}
  var s=0.0;for(var x=-1;x<=1;x++){for(var y=-1;y<=1;y++){s+=textureSampleCompareLevel(shadow,shadowSampler,uv+vec2f(f32(x),f32(y))/2048.0,q.z-.0015);}}return s/9.0;
}
@fragment fn fs(o:SceneOut)->@location(0) vec4f{
  let n=normalize(o.normal);let l=normalize(f.sun.xyz);let light=max(dot(n,l),0.0)*shadeShadow(o.world);
  let ambient=vec3f(.20,.32,.27)*(n.y*.17+.55);
  let sunColor=vec3f(1.3,1.05,.70)*f.sun.w;
  var color=o.color*(ambient+sunColor*light);
  let rim=pow(1.0-max(dot(n,normalize(f.eye.xyz-o.world)),0.0),3.0)*.08;
  color+=vec3f(.2,.33,.23)*rim;
  let fog=1.0-exp(-length(f.eye.xyz-o.world)*.004);color=mix(color,vec3f(.29,.42,.35),fog);
  return vec4f(color,1);
}
@fragment fn skyFS(o:FullOut)->@location(0) vec4f{
  let pos=f.invVP*vec4f(o.uv*vec2f(2,-2)+vec2f(-1,1),1,1);let dir=normalize(pos.xyz/pos.w-f.eye.xyz);
  return vec4f(sky(dir),1);
}
`;
export const WATER=FRAME+/* wgsl */`
struct Particle { p:vec4f, d:vec4f, c0:vec4f, c1:vec4f, c2:vec4f };
@group(0) @binding(1) var<storage,read> particles:array<Particle>;
struct WaterOut { @builtin(position) pos:vec4f, @location(0) circle:vec2f, @location(1) center:vec3f, @location(2) radius:f32, @location(3) motion:vec2f };
@vertex fn waterVS(@builtin(vertex_index) vi:u32,@builtin(instance_index) ii:u32)->WaterOut{
  let corners=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(-1,1),vec2f(1,-1),vec2f(1,1));
  let p=particles[ii];let wp=(p.p.xyz-vec3f(26,0,22))*.24;
  let center=(f.view*vec4f(wp,1)).xyz;let radius=f.viewport.w;
  let c=corners[vi];let position=wp+(f.right.xyz*c.x+f.up.xyz*c.y)*radius;
  var o:WaterOut;o.pos=f.vp*vec4f(position,1);if(p.p.w<0.0){o.pos=vec4f(2,2,2,1);}o.circle=c;o.center=center;o.radius=radius;o.motion=vec2f(length(p.d.xyz)*28.8,p.d.w);return o;
}
struct DepthOut {@location(0) depth:vec4f,@builtin(frag_depth) fragDepth:f32};
@fragment fn depthFS(o:WaterOut)->DepthOut{
  let r2=dot(o.circle,o.circle);if(r2>1.0){discard;}
  let z=o.center.z+sqrt(1.0-r2)*o.radius;
  // vp = projection * view. WebGPU depth is derived from camera near/far.
  let near=.1;let far=100.0;let d=(far/(far-near))+(far*near/(far-near))/z;
  var result:DepthOut;result.fragDepth=d;result.depth=vec4f(-z,o.motion.x,o.motion.y,1);return result;
}
@fragment fn thicknessFS(o:WaterOut)->@location(0) vec4f{let r2=dot(o.circle,o.circle);if(r2>1.0){discard;}return vec4f(sqrt(1.0-r2)*o.radius*.50,0,0,0);}
`;
export const FILTER=FRAME+/* wgsl */`
@group(0) @binding(1) var source:texture_2d<f32>;
@group(0) @binding(2) var<uniform> direction:vec4f;
@fragment fn blur(o:FullOut)->@location(0) vec4f{
  let dimensions=vec2i(textureDimensions(source));let pixel=clamp(vec2i(o.pos.xy),vec2i(0),dimensions-1);let center=textureLoad(source,pixel,0);
  if(center.x<.01){return center;}
  var sum=vec4f(0);var total=0.0;
  for(var j=-6;j<=6;j++){
    let q=clamp(pixel+vec2i(direction.xy)*j,vec2i(0),dimensions-1);let value=textureLoad(source,q,0);
    if(value.x<.01){continue;}let difference=value.x-center.x;
    let weight=exp(-f32(j*j)/16.0-difference*difference*35.0);sum+=value*weight;total+=weight;
  }
  return sum/max(total,.00001);
}
`;
export const COMPOSITE=FRAME+/* wgsl */`
@group(0) @binding(1) var scene:texture_2d<f32>;
@group(0) @binding(2) var fluid:texture_2d<f32>;
@group(0) @binding(3) var thickness:texture_2d<f32>;
@group(0) @binding(4) var sceneDepth:texture_depth_2d;
fn worldAt(uv:vec2f,d:f32)->vec3f {let far=100.0;let near=.1;let z=far/(far-near)-(far*near/(far-near))/max(d,.1);let p=f.invVP*vec4f(uv*vec2f(2,-2)+vec2f(-1,1),z,1);return p.xyz/p.w;}
fn foamHash(p:vec2f)->f32{
  var q=fract(vec3f(p.x,p.y,p.x)*vec3f(.1031,.1030,.0973));
  q+=vec3f(dot(q,q.yzx+vec3f(33.33)));
  return fract((q.x+q.y)*q.z);
}
fn foamNoise(p:vec2f)->f32{
  let cell=floor(p);let u=fract(p);let t=u*u*(vec2f(3.0)-2.0*u);
  return mix(mix(foamHash(cell),foamHash(cell+vec2f(1,0)),t.x),mix(foamHash(cell+vec2f(0,1)),foamHash(cell+vec2f(1,1)),t.x),t.y);
}
@fragment fn composite(o:FullOut)->@location(0) vec4f{
  let dimensions=vec2i(textureDimensions(scene));let pixel=clamp(vec2i(o.pos.xy),vec2i(0),dimensions-1);
  let background=textureLoad(scene,pixel,0).xyz;let data=textureLoad(fluid,pixel,0);
  if(data.x<.01){return vec4f(tonemap(background),1);}
  let z=100.0/99.9-10.0/99.9/data.x;let groundZ=textureLoad(sceneDepth,pixel,0);
  if(z>groundZ+.0002){return vec4f(tonemap(background),1);}
  let texel=1.0/vec2f(dimensions);let wp=worldAt(o.uv,data.x);
  let xp=min(pixel+vec2i(1,0),dimensions-1);let xm=max(pixel-vec2i(1,0),vec2i(0));let yp=min(pixel+vec2i(0,1),dimensions-1);let ym=max(pixel-vec2i(0,1),vec2i(0));
  let dxp=textureLoad(fluid,xp,0).x;let dxm=textureLoad(fluid,xm,0).x;let dyp=textureLoad(fluid,yp,0).x;let dym=textureLoad(fluid,ym,0).x;
  var tx=worldAt(o.uv+vec2f(texel.x,0),select(data.x,dxp,dxp>.01))-wp;
  var ty=worldAt(o.uv+vec2f(0,texel.y),select(data.x,dyp,dyp>.01))-wp;
  if(abs(dxm-data.x)<abs(dxp-data.x)&&dxm>.01){tx=wp-worldAt(o.uv-vec2f(texel.x,0),dxm);}
  if(abs(dym-data.x)<abs(dyp-data.x)&&dym>.01){ty=wp-worldAt(o.uv-vec2f(0,texel.y),dym);}
  var n=normalize(cross(tx,ty));let v=normalize(f.eye.xyz-wp);if(dot(n,v)<0.0){n=-n;}
  let th=clamp(textureLoad(thickness,pixel,0).x,.02,2.5);
  let refraction=clamp(pixel+vec2i(vec2f(dot(n,f.right.xyz),-dot(n,f.up.xyz))*th*26.0),vec2i(0),dimensions-1);
  let behind=select(background,textureLoad(scene,refraction,0).xyz,textureLoad(sceneDepth,refraction,0)>z+.00005);
  var absorption=vec3f(1.25,.38,.25);var tint=vec3f(.018,.16,.13);
  if(f.settings.z>.5&&f.settings.z<1.5){absorption=vec3f(2.2,.72,.32);tint=vec3f(.015,.18,.32);}
  if(f.settings.z>1.5){absorption=vec3f(2.4,.65,.38);tint=vec3f(.025,.27,.25);}
  let transmission=exp(-th*absorption);
  let body=behind*transmission+tint*(1.0-transmission);
  let reflection=sky(reflect(-v,n));let fresnel=.035+.965*pow(1.0-max(dot(v,n),0.0),5.0);
  let highlight=pow(max(dot(n,normalize(v+normalize(f.sun.xyz))),0.0),160.0)*f.sun.w;
  var color=mix(body,reflection,fresnel*.8)+highlight*vec3f(2.3,1.8,1.1);
  let drift=vec2f(f.viewport.z*.21,f.viewport.z*(1.2+min(data.y,6.0)*.75));
  let foamUV=vec2f(wp.x*7.7+wp.z*3.1,wp.y*4.9+wp.z*6.3)+drift;
  let noise=foamNoise(foamUV)*.65+foamNoise(foamUV*1.93+vec2f(17.1,7.7))*.35;
  let foam=clamp((data.z*.58+smoothstep(1.6,4.4,data.y)*.12)*f.settings.w*1.5,0,.78)*mix(.16,1.0,smoothstep(.35,.73,noise));
  color=mix(color,vec3f(.82,.91,.87),foam);
  if(f.settings.y>.5 && f.settings.y<1.5){color=mix(vec3f(.04,.25,.7),vec3f(1,.35,.04),clamp(data.y/4.0,0,1));}
  if(f.settings.y>1.5){color=mix(vec3f(.08,.22,.3),vec3f(.8,1,.85),clamp(th,0,1));}
  let vignette=1.0-.17*pow(length((o.uv-.5)*vec2f(1,.85))*1.4,2.0);
  return vec4f(tonemap(color)*vignette,1);
}
`;
