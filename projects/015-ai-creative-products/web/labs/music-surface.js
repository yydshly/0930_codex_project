import {T} from './three-stage.js';

export function agedPianoSurface(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=768;
 const g=canvas.getContext('2d'),rough=document.createElement('canvas');rough.width=rough.height=768;const r=rough.getContext('2d');
 g.fillStyle='#7193a0';g.fillRect(0,0,768,768);r.fillStyle='#b4b4b4';r.fillRect(0,0,768,768);
 let seed=6051;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 // Quiet paint on broad faces. Chips stay along the cabinet's physical edges.
 for(let i=0;i<2600;i++){const x=rand()*768,y=rand()*768,a=.015+rand()*.022;g.fillStyle=`rgba(${rand()>.5?'235,228,205':'32,40,42'},${a})`;g.fillRect(x,y,2+rand()*7,1);}
 for(let edge=0;edge<4;edge++)for(let i=0;i<34;i++){
  const a=rand()*768,len=3+rand()*35,depth=1+rand()*5;
  g.save();r.save();g.translate(edge===1?768:0,edge===2?768:0);r.translate(edge===1?768:0,edge===2?768:0);
  const angle=edge===1?Math.PI/2:edge===2?Math.PI:edge===3?-Math.PI/2:0;g.rotate(angle);r.rotate(angle);
  if(edge===3){g.translate(-768,0);r.translate(-768,0);}if(edge===2){g.translate(-768,0);r.translate(-768,0);}
  g.fillStyle=i%3?'#665342':'#a18a65';r.fillStyle='#e4e4e4';g.beginPath();g.moveTo(a,0);g.lineTo(a+len,0);g.lineTo(a+len*.73,depth*.7);g.lineTo(a+len*.2,depth);g.closePath();g.fill();r.fillRect(a,0,len,depth);g.restore();r.restore();
 }
 const map=new T.CanvasTexture(canvas),roughnessMap=new T.CanvasTexture(rough);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;roughnessMap.anisotropy=4;
 const paint=new T.MeshPhysicalMaterial({map,roughnessMap,roughness:.72,metalness:0,clearcoat:.16,clearcoatRoughness:.42,envMapIntensity:.30});
 const wood=new T.MeshStandardMaterial({color:'#72573d',roughness:.78,envMapIntensity:.2});
 return {paint,wood,dispose(){map.dispose();roughnessMap.dispose();}};
}
