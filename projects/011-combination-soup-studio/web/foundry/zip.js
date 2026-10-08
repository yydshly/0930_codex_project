const encoder=new TextEncoder(),table=new Uint32Array(256);
for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}
function crc(bytes){let c=0xffffffff;for(const v of bytes)c=table[(c^v)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
// Small, stored ZIP writer: no compression dependency or network service.
export function zip(files){const chunks=[],central=[];let offset=0,centralSize=0;
  for(const file of files){if(!/^[a-zA-Z0-9_./-]+$/.test(file.name)||file.name.split('/').includes('..')||file.name.startsWith('/'))throw new Error('无效项目文件名');const name=encoder.encode(file.name),data=typeof file.data==='string'?encoder.encode(file.data):new Uint8Array(file.data),checksum=crc(data),header=new Uint8Array(30+name.length),v=new DataView(header.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,checksum,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);header.set(name,30);chunks.push(header,data);
    const entry=new Uint8Array(46+name.length),e=new DataView(entry.buffer);e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x800,true);e.setUint32(16,checksum,true);e.setUint32(20,data.length,true);e.setUint32(24,data.length,true);e.setUint16(28,name.length,true);e.setUint32(42,offset,true);entry.set(name,46);central.push(entry);centralSize+=entry.length;offset+=header.length+data.length;
  }
  const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);return new Blob([...chunks,...central,end],{type:'application/zip'});
}
