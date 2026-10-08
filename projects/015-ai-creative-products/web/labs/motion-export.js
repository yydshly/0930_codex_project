export async function finalizeWebM(chunks,seconds){
 const original=new Blob(chunks,{type:'video/webm'});let data=new Uint8Array(await original.arrayBuffer());
 const read=(bytes,p)=>{if(p>=bytes.length)return null;const start=p;let n=1,mask=128;while(n<=4&&!(bytes[p]&mask)){n++;mask>>=1;}if(n>4)return null;let id=0;for(let j=0;j<n;j++)id=id*256+bytes[p++];if(p>=bytes.length)return null;let sizeLength=1;mask=128;while(sizeLength<=8&&!(bytes[p]&mask)){sizeLength++;mask>>=1;}if(sizeLength>8||p+sizeLength>bytes.length)return null;let v=BigInt(bytes[p]& (mask-1));for(let j=1;j<sizeLength;j++)v=v*256n+BigInt(bytes[p+j]);p+=sizeLength;const unknown=v===(1n<<BigInt(sizeLength*7))-1n;const size=unknown?null:Number(v);return{id,start,payload:p,end:size===null?bytes.length:p+size,size};};
 const uint=value=>{let v=BigInt(Math.max(0,Math.round(value))),bytes=[];do{bytes.unshift(Number(v&255n));v>>=8n;}while(v);return new Uint8Array(bytes);};
 const cat=parts=>{const out=new Uint8Array(parts.reduce((s,b)=>s+b.length,0));let p=0;for(const b of parts){out.set(b,p);p+=b.length;}return out;};
 const size=value=>{let n=1;while(value>=2**(n*7)-1)n++;const out=new Uint8Array(n);let v=BigInt(value);for(let j=n-1;j>=0;j--){out[j]=Number(v&255n);v>>=8n;}out[0]|=1<<(8-n);return out;};
 const node=(id,body)=>cat([uint(id),size(body.length),body]);const integer=(bytes,a,b)=>{let v=0;for(let i=a;i<b;i++)v=v*256+bytes[i];return v;};
 let pos=0,segment=null;while(pos<data.length){const n=read(data,pos);if(!n)break;if(n.id===0x18538067){segment=n;break;}pos=n.end;}if(!segment||segment.size!==null)return original;
 let info=null,scale=1000000,videoTrack=1;pos=segment.payload;
 while(pos<data.length){const n=read(data,pos);if(!n||n.id===0x1f43b675)break;if(n.id===0x1549a966){info=n;for(let q=n.payload;q<n.end;){const child=read(data,q);if(!child)break;if(child.id===0x2ad7b1)scale=integer(data,child.payload,child.end);q=child.end;}}if(n.id===0x1654ae6b){for(let q=n.payload;q<n.end;){const entry=read(data,q);if(!entry)break;let number=1,type=0;for(let p=entry.payload;p<entry.end;){const child=read(data,p);if(!child)break;if(child.id===0xd7)number=integer(data,child.payload,child.end);if(child.id===0x83)type=integer(data,child.payload,child.end);p=child.end;}if(type===1)videoTrack=number;q=entry.end;}}pos=n.end;}
 if(!info)return original;const fields=[];for(let q=info.payload;q<info.end;){const child=read(data,q);if(!child)break;if(child.id!==0x4489)fields.push(data.slice(child.start,child.end));q=child.end;}const duration=new Uint8Array(8);new DataView(duration.buffer).setFloat64(0,seconds*1000000000/scale,false);fields.push(node(0x4489,duration));data=cat([data.slice(0,info.start),node(0x1549a966,cat(fields)),data.slice(info.end)]);
 const cues=[];pos=segment.payload;
 while(pos<data.length){const cluster=read(data,pos);if(!cluster)break;if(cluster.id!==0x1f43b675){if(cluster.end<=pos)break;pos=cluster.end;continue;}let stamp=0,q=cluster.payload;
  while(q<data.length){const child=read(data,q);if(!child)break;if([0x1f43b675,0x1c53bb6b,0x114d9b74].includes(child.id))break;if(child.end>data.length||child.end<=q)break;if(child.id===0xe7)stamp=integer(data,child.payload,child.end);
   let block=null,key=false;if(child.id===0xa3){block=child;let n=1,m=128;while(!(data[block.payload]&m)){n++;m>>=1;}key=Boolean(data[block.payload+n+2]&128);}else if(child.id===0xa0){let reference=false;for(let p=child.payload;p<child.end;){const item=read(data,p);if(!item)break;if(item.id===0xa1)block=item;if(item.id===0xfb)reference=true;p=item.end;}key=!reference;}
   if(block&&key){let n=1,m=128;while(n<=8&&!(data[block.payload]&m)){n++;m>>=1;}let track=data[block.payload]&(m-1);for(let j=1;j<n;j++)track=track*256+data[block.payload+j];const at=block.payload+n;let relative=(data[at]<<8)|data[at+1];if(relative&32768)relative-=65536;if(track===videoTrack)cues.push({time:Math.max(0,stamp+relative),position:cluster.start-segment.payload,relative:child.start-cluster.payload});}
   q=child.end;
  }if(q<=pos)break;pos=q;
 }
 if(!cues.length)return new Blob([data],{type:'video/webm'});
 const seekFor=length=>node(0x114d9b74,node(0x4dbb,cat([node(0x53ab,uint(0x1c53bb6b)),node(0x53ac,uint(data.length-segment.payload+length))])));let seek=seekFor(0);for(let i=0;i<3;i++)seek=seekFor(seek.length);
 const cueData=node(0x1c53bb6b,cat(cues.map(c=>node(0xbb,cat([node(0xb3,uint(c.time)),node(0xb7,cat([node(0xf7,uint(videoTrack)),node(0xf1,uint(c.position+seek.length)),node(0xf0,uint(c.relative))]))])))));
 return new Blob([data.slice(0,segment.payload),seek,data.slice(segment.payload),cueData],{type:'video/webm'});
}
export function createMotionExport({canvas,getDuration,getTime,setTime,render,onChange,downloadFile}) {
  let recorder=null,stream=null,raf=0,busy=false,disposed=false,cancelled=false;
  const mime=()=>['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>globalThis.MediaRecorder?.isTypeSupported(type));
  function cancel(){if(!busy)return;cancelled=true;if(raf)cancelAnimationFrame(raf);raf=0;if(recorder?.state==='recording')recorder.stop();}
  async function start(name){
    if(busy||disposed)return false;
    if(!canvas.captureStream||!globalThis.MediaRecorder||!mime()){onChange({phase:'error',progress:0,error:'当前浏览器不支持 WebM 录制；仍可导出 PNG 和脚本。'});return false;}
    busy=true;cancelled=false;const previous=getTime(),duration=getDuration(),chunks=[];
    try{
      setTime(0);render();stream=canvas.captureStream(0);const track=stream.getVideoTracks()[0];
      recorder=new MediaRecorder(stream,{mimeType:mime(),videoBitsPerSecond:4500000});
      const stopped=new Promise((resolve,reject)=>{recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};recorder.onstop=resolve;recorder.onerror=event=>reject(event.error||new Error('录制失败'));});
      recorder.start(200);track.requestFrame?.();const started=performance.now();onChange({phase:'recording',progress:0});
      const tick=now=>{raf=0;if(disposed||cancelled)return;const t=Math.min(duration,(now-started)/1000);setTime(t);render();track.requestFrame?.();onChange({phase:'recording',progress:t/duration});if(t>=duration)recorder.stop();else raf=requestAnimationFrame(tick);};
      raf=requestAnimationFrame(tick);await stopped;
      if(!cancelled&&!disposed){const finished=await finalizeWebM(chunks,duration);if(!cancelled&&!disposed){downloadFile(name,finished,'video/webm');onChange({phase:'complete',progress:1});}else if(!disposed)onChange({phase:'cancelled',progress:0});}else if(!disposed)onChange({phase:'cancelled',progress:0});
      return !cancelled&&!disposed;
    }catch(error){if(!disposed)onChange({phase:'error',progress:0,error:error.message});return false;}
    finally{if(raf)cancelAnimationFrame(raf);raf=0;stream?.getTracks().forEach(track=>track.stop());stream=null;recorder=null;busy=false;if(!disposed){setTime(previous);render();}}
  }
  return {start,cancel,isExporting:()=>busy,dispose(){disposed=true;cancel();}};
}




