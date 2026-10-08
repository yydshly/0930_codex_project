from pathlib import Path
import urllib.request, json, struct, hashlib, concurrent.futures
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'assets/game-forms/polish-angler-sources';source.mkdir(parents=True,exist_ok=True)
runtime=ROOT/'web/assets/game-forms/polish';runtime.mkdir(parents=True,exist_ok=True)
headers={'User-Agent':'Mozilla/5.0','Referer':'https://polyhaven.com/'}
def read(url):
    return urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=60).read()
metadata=json.loads(read('https://api.polyhaven.com/files/pine_sapling_small'))
entry=metadata['gltf']['1k']['gltf'];gltf=json.loads(read(entry['url']))
items=list(entry['include'].items())
def fetch(item):
    name,info=item;target=source/name;target.parent.mkdir(parents=True,exist_ok=True)
    if not target.exists():target.write_bytes(read(info['url']))
    raw=target.read_bytes();assert hashlib.md5(raw).hexdigest()==info['md5']
    return name,raw
files=dict(concurrent.futures.ThreadPoolExecutor(max_workers=4).map(fetch,items))
oldbin=files['pine_sapling_small.bin'];newbin=bytearray();newviews=[];viewmap={};accessmap={};accessors=[]
def view(index):
    if index in viewmap:return viewmap[index]
    original=gltf['bufferViews'][index];start=original.get('byteOffset',0);data=oldbin[start:start+original['byteLength']]
    while len(newbin)%4:newbin.append(0)
    copy={**original,'buffer':0,'byteOffset':len(newbin)};newbin.extend(data);viewmap[index]=len(newviews);newviews.append(copy);return viewmap[index]
def accessor(index):
    if index in accessmap:return accessmap[index]
    copy={**gltf['accessors'][index]};copy['bufferView']=view(copy['bufferView']);accessmap[index]=len(accessors);accessors.append(copy);return accessmap[index]
mesh=json.loads(json.dumps(gltf['meshes'][0]))
for primitive in mesh['primitives']:
    primitive['indices']=accessor(primitive['indices']);primitive['attributes']={key:accessor(value) for key,value in primitive['attributes'].items()}
images=[]
for im in gltf['images']:
    data=files[im['uri']]
    while len(newbin)%4:newbin.append(0)
    index=len(newviews);newviews.append({'buffer':0,'byteOffset':len(newbin),'byteLength':len(data)});newbin.extend(data)
    images.append({'name':im['name'],'mimeType':'image/jpeg','bufferView':index})
node={**gltf['nodes'][0],'mesh':0};node.pop('children',None)
packed={'asset':{'version':'2.0','generator':'Poly Haven CC0 single variant packaging'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[node],'meshes':[mesh],'materials':gltf['materials'],'textures':gltf['textures'],'samplers':gltf.get('samplers',[]),'images':images,'accessors':accessors,'bufferViews':newviews,'buffers':[{'byteLength':len(newbin)}],'extensionsUsed':gltf.get('extensionsUsed',[])}
j=json.dumps(packed,separators=(',',':')).encode();j+=b' '*((-len(j))%4);newbin+=b'\0'*((-len(newbin))%4)
blob=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(newbin))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(newbin),0x004e4942)+newbin
target=runtime/'angler-pine.glb';target.write_bytes(blob)
report={'source':'https://polyhaven.com/a/pine_sapling_small','metadata':'https://api.polyhaven.com/files/pine_sapling_small','license':'CC0','license_reference':'https://docs.polyhaven.com/en/faq','asset':str(target),'bytes':len(blob),'sha256':hashlib.sha256(blob).hexdigest(),'variant':'pine_sapling_small_b','triangles':sum(accessors[p['indices']]['count']//3 for p in mesh['primitives']),'included_textures':len(images),'source_files':[{'path':name,'url':info['url'],'md5':info['md5']} for name,info in items]}
(ROOT/'assets/game-forms/polish-angler-tree-source.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps({k:report[k] for k in ['bytes','triangles','variant']}))
