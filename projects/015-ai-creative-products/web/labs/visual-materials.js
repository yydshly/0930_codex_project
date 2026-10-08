import '../demo/runtime/vendor/three-r160.min.js';
import {RGBELoader} from './assets/RGBELoader.js';
import {RoundedBoxGeometry} from './assets/RoundedBoxGeometry.js';
const T=globalThis.THREE;
const base=new URL('./assets/pbr/',import.meta.url);
/** Licensed photo-scanned PBR maps. Callbacks let a paused scene redraw on load. */
export function pbrMaterial(name,{repeat=[1,1],normal=.5,roughness=.8,color='#ffffff',onLoad=()=>{},...options}={}){
 const material=new T.MeshPhysicalMaterial({color,roughness,...options});
 const loader=new T.TextureLoader();
 const texture=(suffix,srgb=false)=>{const t=loader.load(new URL(name+'-'+suffix+'.webp',base).href,onLoad);if(srgb)t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=8;return t;};
 material.map=texture('color',true);material.normalMap=texture('normal');material.normalScale.set(normal,normal);material.roughnessMap=texture('rough');return material;
}
/** Actual CC0 HDR illumination. Disposing before a load finishes is safe. */
export function photoEnvironment(stage,{outdoor=false,background=false,onLoad=()=>{}}={}){
 if(!stage.supported)return {dispose(){}};
 const name=outdoor?'kloofendal_48d_partly_cloudy_puresky':'studio_small_09';let disposed=false,target=null,hdr=null;
 const generator=new T.PMREMGenerator(stage.renderer);generator.compileEquirectangularShader();
 new RGBELoader().load(new URL(name+'.hdr',base).href,texture=>{
  if(disposed){texture.dispose();return;}hdr=texture;hdr.mapping=T.EquirectangularReflectionMapping;target=generator.fromEquirectangular(hdr);stage.scene.environment=target.texture;if(background)stage.scene.background=hdr;onLoad();
 },undefined,()=>{if(!disposed)console.warn('Local HDR could not load: '+name);});
 return {dispose(){disposed=true;if(target&&stage.scene.environment===target.texture)stage.scene.environment=null;if(hdr&&stage.scene.background===hdr)stage.scene.background=null;target?.dispose();hdr?.dispose();generator.dispose();}};
}
/** Rounded solid edges retain real geometry, highlights and contact shadows. */
export function roundedBoxGeometry(w,h,d,r=Math.min(w,h,d)*.1){
 return new RoundedBoxGeometry(w,h,d,3,Math.max(.0001,Math.min(r,w/2,h/2,d/2)));
}
