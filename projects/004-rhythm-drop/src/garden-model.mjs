export const gardenKinds={
  water:{name:'水边',voice:'水滴钟琴',color:'#b8ddd8',hint:'一圈涟漪，一朵莲。',scale:[62,65,69,72,74],spacing:.68},
  meadow:{name:'草地',voice:'柔和琴音',color:'#ebcda1',hint:'慢慢舒展，不急着开花。',scale:[60,64,67,69,72],spacing:.82},
  air:{name:'风铃',voice:'透亮泛音',color:'#c4b5e3',hint:'把轻一点的声音，留给风。',scale:[67,69,72,76,79],spacing:.58}
};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function createPlant(kind,x,y,held=0,id='seed'){
  if(!gardenKinds[kind])throw new Error('请选择水边、草地或风铃。');
  const duration=clamp(Number.isFinite(held)?held:0,0,3),count=clamp(2+Math.floor(duration/.65),2,6),scale=gardenKinds[kind].scale;
  x=clamp(Number.isFinite(x)?x:.5,.08,.92);y=clamp(Number.isFinite(y)?y:.65,.32,.88);
  const degree=Math.round((1-y)*4);
  return {id,kind,x,y,held:duration,notes:Array.from({length:count},(_,i)=>scale[(degree+i+(kind==='air'?i%2:0))%scale.length])};
}
export function validateGarden(value){
  if(value?.format!=='sound-garden'||value.version!==1||!Array.isArray(value.plants)||value.plants.length>24)throw new Error('花园档案暂时无法读取。');
  const ids=new Set();
  return {format:'sound-garden',version:1,plants:value.plants.map(p=>{
    if(!p||typeof p.id!=='string'||!p.id||ids.has(p.id)||!gardenKinds[p.kind]||!Number.isFinite(p.x)||p.x<.08||p.x>.92||!Number.isFinite(p.y)||p.y<.32||p.y>.88||!Number.isFinite(p.held)||p.held<0||p.held>3||!Array.isArray(p.notes)||p.notes.length<2||p.notes.length>6||p.notes.some(n=>!gardenKinds[p.kind].scale.includes(n)))throw new Error('花园档案包含无效的声音种子。');
    ids.add(p.id);return {id:p.id,kind:p.kind,x:p.x,y:p.y,held:p.held,notes:[...p.notes]};
  })};
}
export const serializeGarden=plants=>JSON.stringify(validateGarden({format:'sound-garden',version:1,plants}));
