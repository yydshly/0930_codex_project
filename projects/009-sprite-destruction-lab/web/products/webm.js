// Duration is optional in a live WebM stream. Add it to the Chrome recorder's
// unindexed stream before download; never rewrite indexed/unknown layouts.
// Spec: https://www.matroska.org/technical/elements.html (Info / Duration).
function vint(bytes,offset,id=false){
  let mask=128,length=1;while(length<=8&&!(bytes[offset]&mask)){mask>>=1;length++;}
  if(length>8||offset+length>bytes.length)throw Error('WebM 元数据不完整');
  let value=BigInt(id?bytes[offset]:bytes[offset]&(mask-1));
  for(let i=1;i<length;i++)value=(value<<8n)|BigInt(bytes[offset+i]);
  return {length,value,unknown:!id&&value===(1n<<BigInt(7*length))-1n};
}
function element(bytes,offset){const id=vint(bytes,offset,true),size=vint(bytes,offset+id.length);const start=offset+id.length+size.length;return {id:Number(id.value),offset,idLength:id.length,sizeLength:size.length,start,end:size.unknown?bytes.length:start+Number(size.value),unknown:size.unknown};}
function sizeBytes(value){let length=1;while(BigInt(value)>=(1n<<BigInt(7*length))-1n)length++;const result=new Uint8Array(length);let n=BigInt(value);for(let i=length-1;i>=0;i--){result[i]=Number(n&255n);n>>=8n;}result[0]|=1<<(8-length);return result;}
export async function withWebMDuration(blob,seconds){
  if(!(seconds>0&&Number.isFinite(seconds)))throw Error('录制时长无效');
  const bytes=new Uint8Array(await blob.arrayBuffer()),header=element(bytes,0);if(header.id!==0x1a45dfa3)throw Error('不支持的 WebM 头');
  const segment=element(bytes,header.end);if(segment.id!==0x18538067||!segment.unknown)throw Error('此浏览器使用了不同的 WebM 布局');
  let info=null;
  for(let at=segment.start;at<bytes.length;){const e=element(bytes,at);if(e.id===0x114d9b74||e.id===0x1c53bb6b)throw Error('带索引的 WebM 不需要此元数据补写');if(e.id===0x1549a966)info=e;if(e.id===0x1f43b675)break;if(e.unknown||e.end<=at||e.end>bytes.length)throw Error('不支持的 WebM 元数据布局');at=e.end;}
  if(!info||info.unknown)throw Error('录制文件缺少 Info 元数据');
  let scale=1000000,duration=null;
  for(let at=info.start;at<info.end;){const e=element(bytes,at);if(e.end>info.end||e.end<=at)throw Error('WebM Info 格式错误');if(e.id===0x2ad7b1){scale=0;for(let i=e.start;i<e.end;i++)scale=scale*256+bytes[i];}if(e.id===0x4489)duration=e;at=e.end;}
  const ticks=seconds*1e9/scale;
  if(duration){const length=duration.end-duration.start,view=new DataView(bytes.buffer);if(length===8)view.setFloat64(duration.start,ticks);else if(length===4)view.setFloat32(duration.start,ticks);else throw Error('WebM 时长字段长度不支持');return new Blob([bytes],{type:blob.type});}
  const extra=new Uint8Array(11);extra.set([0x44,0x89,0x88]);new DataView(extra.buffer).setFloat64(3,ticks);
  const size=sizeBytes(info.end-info.start+extra.length);
  return new Blob([bytes.slice(0,info.offset+info.idLength),size,bytes.slice(info.start,info.end),extra,bytes.slice(info.end)],{type:blob.type});
}
