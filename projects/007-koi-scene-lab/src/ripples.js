import * as THREE from 'three';
import { isInPond } from './config.js';
import {RippleField,RIPPLE_CONSTANTS} from './ripple-field.js';

// Height and vertical velocity share a ping-pong texture. A bank mask reflects
// waves instead of letting impulses travel out of the irregular pond.
export class RippleSimulation {
  constructor(renderer, size=128) {
    this.renderer=renderer;this.size=size;this.stepCount=0;this.accumulator=0;this.queue=[];this.bounds={x:-6.5,z:-6.15,width:12,height:12};
    this.enabled=renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float');
    const pixels=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const k=(y*size+x)*4;pixels[k]=isInPond((x+.5)/size*12-6.5,(y+.5)/size*12-6.15)?255:0;pixels[k+3]=255;
    }
    this.mask=new THREE.DataTexture(pixels,size,size);this.mask.minFilter=this.mask.magFilter=THREE.LinearFilter;this.mask.needsUpdate=true;this.field=new RippleField(size,pixels);
    this.zero=new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);this.zero.needsUpdate=true;
    this.texture=this.zero;if(!this.enabled)return;
    this.targets=[0,1].map(()=>new THREE.WebGLRenderTarget(size,size,{type:THREE.HalfFloatType,depthBuffer:false,stencilBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter}));
    this.impulses=Array.from({length:8},()=>new THREE.Vector4(-2,-2,0,0));
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{state:{value:null},mask:{value:this.mask},texel:{value:1/size},impulses:{value:this.impulses}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`varying vec2 vUv;uniform sampler2D state,mask;uniform float texel;uniform vec4 impulses[8];
      float heightAt(vec2 uv,float center){return texture2D(mask,uv).r>.5?texture2D(state,uv).r:center;}
      void main(){if(texture2D(mask,vUv).r<.5){gl_FragColor=vec4(0.);return;}
        vec2 q=texture2D(state,vUv).rg;float avg=(heightAt(vUv+vec2(texel,0.),q.x)+heightAt(vUv-vec2(texel,0.),q.x)+heightAt(vUv+vec2(0.,texel),q.x)+heightAt(vUv-vec2(0.,texel),q.x))*.25;
        q.y=(q.y+(avg-q.x)*${RIPPLE_CONSTANTS.stiffness})*${RIPPLE_CONSTANTS.velocityDamping};q.x=(q.x+q.y)*${RIPPLE_CONSTANTS.heightDamping};
        for(int i=0;i<8;i++){float d=length(vUv-impulses[i].xy)/max(impulses[i].z,.0001);q.x+=exp(-d*d*3.)*impulses[i].w;}
        gl_FragColor=vec4(clamp(q.x,-${RIPPLE_CONSTANTS.maxHeight},${RIPPLE_CONSTANTS.maxHeight}),clamp(q.y,-${RIPPLE_CONSTANTS.maxVelocity},${RIPPLE_CONSTANTS.maxVelocity}),0.,1.);
      }`});
    this.scene=new THREE.Scene();this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material));this.camera=new THREE.Camera();
    this.reset();
  }
  reset(){this.queue.length=0;this.accumulator=0;this.stepCount=0;this.field.reset();if(!this.enabled)return;
    const old=this.renderer.getRenderTarget(),color=this.renderer.getClearColor(new THREE.Color()),alpha=this.renderer.getClearAlpha();
    this.renderer.setClearColor(0,0);for(const target of this.targets){this.renderer.setRenderTarget(target);this.renderer.clear();}
    this.renderer.setRenderTarget(old);this.renderer.setClearColor(color,alpha);this.index=0;this.texture=this.targets[0].texture;
  }
  restoreContext(){if(!this.enabled)return;
    // Render targets lose their pixels with the context. Re-upload both CPU
    // time levels, rounding to the same half-float format as the GPU solver.
    const seed=(height,velocity)=>{const pixels=new Uint16Array(this.size*this.size*4);for(let i=0;i<height.length;i++){pixels[i*4]=THREE.DataUtils.toHalfFloat(height[i]);pixels[i*4+1]=THREE.DataUtils.toHalfFloat(velocity[i]);pixels[i*4+3]=THREE.DataUtils.toHalfFloat(1);}const texture=new THREE.DataTexture(pixels,this.size,this.size,THREE.RGBAFormat,THREE.HalfFloatType);texture.needsUpdate=true;return texture;};
    const current=seed(this.field.height,this.field.velocity),previous=seed(this.field.nextHeight,this.field.nextVelocity),copy=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{state:{value:current}},vertexShader:this.material.vertexShader,fragmentShader:'varying vec2 vUv;uniform sampler2D state;void main(){gl_FragColor=texture2D(state,vUv);}'});
    const quad=this.scene.children[0],material=quad.material,old=this.renderer.getRenderTarget();
    try{quad.material=copy;this.renderer.setRenderTarget(this.targets[this.index]);this.renderer.render(this.scene,this.camera);copy.uniforms.state.value=previous;this.renderer.setRenderTarget(this.targets[1-this.index]);this.renderer.render(this.scene,this.camera);this.texture=this.targets[this.index].texture;}
    finally{quad.material=material;this.renderer.setRenderTarget(old);current.dispose();previous.dispose();copy.dispose();}
  }
  setDomain(bounds,predicate){this.bounds={...bounds};const pixels=this.mask.image.data;
    for(let y=0;y<this.size;y++)for(let x=0;x<this.size;x++){const k=(y*this.size+x)*4;pixels[k]=predicate(bounds.x+(x+.5)/this.size*bounds.width,bounds.z+(y+.5)/this.size*bounds.height)?255:0;pixels[k+3]=255;}
    this.mask.needsUpdate=true;this.reset();}
  impulse(x,z,strength,radius=.22){const b=this.bounds;if(this.queue.length<32)this.queue.push(new THREE.Vector4((x-b.x)/b.width,(z-b.z)/b.height,radius/Math.max(b.width,b.height),strength));}
  heightAt(x,z){if(!this.enabled)return 0;const b=this.bounds;return this.field.sample((x-b.x)/b.width,(z-b.z)/b.height);}
  update(dt){if(!this.enabled||dt<=0)return;this.accumulator=Math.min(this.accumulator+dt,.05);
    const old=this.renderer.getRenderTarget();
    while(this.accumulator>=1/60){this.accumulator-=1/60;this.impulses.forEach(v=>v.set(-2,-2,0,0));
      for(let i=0;i<8&&this.queue.length;i++)this.impulses[i].copy(this.queue.shift());
      this.field.step(this.impulses.filter(p=>p.w!==0));
      this.material.uniforms.state.value=this.targets[this.index].texture;this.index=1-this.index;
      this.renderer.setRenderTarget(this.targets[this.index]);this.renderer.render(this.scene,this.camera);this.texture=this.targets[this.index].texture;this.stepCount++;
    }this.renderer.setRenderTarget(old);
  }
}
