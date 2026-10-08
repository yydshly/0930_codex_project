import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='https://d28zzqy0iyovbz.cloudfront.net/ca6a4c9b/v2/';
const destination=new URL('../web/assets/reference-plush/',import.meta.url);
await mkdir(destination,{recursive:true});
const lod=JSON.parse((await readFile(new URL('../artifacts/reference-lod-meta.public.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));
const full=new Set();
function visit(node){if(node.lods?.['0'])full.add(node.lods['0'].file);for(const child of node.children||[])visit(child);}
visit(lod.tree);
const table=new Uint32Array(256);
for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function zip(entries){let offset=0;const local=[],central=[];
  for(const [name,bytes] of entries){const filename=Buffer.from(name);const crc=crc32(bytes);
    const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt32LE(crc,14);h.writeUInt32LE(bytes.length,18);h.writeUInt32LE(bytes.length,22);h.writeUInt16LE(filename.length,26);
    local.push(h,filename,bytes);const d=Buffer.alloc(46);d.writeUInt32LE(0x02014b50);d.writeUInt16LE(20,4);d.writeUInt16LE(20,6);d.writeUInt32LE(crc,16);d.writeUInt32LE(bytes.length,20);d.writeUInt32LE(bytes.length,24);d.writeUInt16LE(filename.length,28);d.writeUInt32LE(offset,42);central.push(d,filename);offset+=h.length+filename.length+bytes.length;
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,directory,end]);
}
async function get(url){const res=await fetch(url);if(!res.ok)throw new Error(`${res.status} ${url}`);return Buffer.from(await res.arrayBuffer());}
const chunks=[];
// Public viewer assets, unchanged; packaging only. No authentication or private endpoint.
for(const index of [...full].sort((a,b)=>a-b)){
  const path=lod.filenames[index],url=new URL(path,base);const metaBytes=await get(url);const meta=JSON.parse(metaBytes);
  const files=Object.values(meta).flatMap(value=>value?.files||[]);
  const images=await Promise.all(files.map(async file=>[file,await get(new URL(file,url))]));
  const archive=zip([['meta.json',metaBytes],...images]);const file=path.replace('/meta.json','.sog');
  await writeFile(new URL(file,destination),archive);
  chunks.push({file,count:meta.count,bytes:archive.length,sha256:createHash('sha256').update(archive).digest('hex'),source:url.href,bands:meta.shN?.bands||0});
  console.log(`Saved ${file}: ${meta.count.toLocaleString('en-US')} splats (${(archive.length/1048576).toFixed(1)} MiB)`);
}
const manifest={version:1,id:'felipe-local',title:'ChatGPT dots - Felipe',author:'abstrakt',source:'https://superspl.at/scene/ca6a4c9b',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',adaptation:'Public full-resolution SOG data repackaged without changing attributes; rendered and transformed in the local Three.js scenes.',count:chunks.reduce((n,c)=>n+c.count,0),bounds:lod.tree.bound,chunks};
if(manifest.count!==lod.counts[0])throw new Error('Full-resolution count mismatch');
await writeFile(new URL('manifest.json',destination),JSON.stringify(manifest,null,2)+'\n');
console.log(`Full original saved: ${manifest.count.toLocaleString('en-US')} splats.`);
