import pathlib,zipfile,hashlib,json,datetime

root=pathlib.Path(__file__).resolve().parents[1]
archive=root/'assets/game-forms/motion-signal-sources/train-kit.zip'
out=root/'web/assets/game-forms/signal';out.mkdir(parents=True,exist_ok=True)
names=['railroad-straight','train-diesel-a','train-electric-city-a','train-electric-city-b','train-locomotive-a','train-locomotive-passenger-a','train-carriage-container-red']
files=[]
with zipfile.ZipFile(archive) as z:
 for name in names:
  source='Models/GLB format/'+name+'.glb';data=z.read(source);(out/(name+'.glb')).write_bytes(data);files.append({'path':'web/assets/game-forms/signal/'+name+'.glb','original':source,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
 for source,dest in [('Models/GLB format/Textures/colormap.png','Textures/colormap.png'),('License.txt','License.txt')]:
  data=z.read(source);target=out/dest;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);files.append({'path':'web/assets/game-forms/signal/'+dest,'original':source,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
manifest={'game':'signal','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'author':'Kenney','pack':'Train Kit 1.1','source':'https://kenney.nl/assets/train-kit','download':'https://kenney.nl/media/pages/assets/train-kit/cf8521d625-1727040883/kenney_train-kit.zip','license':'CC0-1.0','licenseUrl':'https://creativecommons.org/publicdomain/zero/1.0/','archive':'assets/game-forms/motion-signal-sources/train-kit.zip','archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'localLicense':'web/assets/game-forms/signal/License.txt','files':files,'reusedAuthoredModels':{'sourceManifest':'assets/game-forms/systems-city-sources.json','files':['web/assets/game-forms/district/building-a.glb','web/assets/game-forms/district/building-c.glb','web/assets/game-forms/district/tree-large.glb','web/assets/game-forms/district/tree-small.glb'],'license':'CC0-1.0','source':['https://kenney.nl/assets/city-kit-suburban','https://kenney.nl/assets/city-kit-commercial']},'implementation':'Original authored meshes and colormap retained byte-for-byte. Tracks scaled and aligned to route segments; train units move and turn on the same geometry. Manual entry signals, switch-locked shared block, actual station arrival and distance-based collisions are local gameplay rules.'}
(root/'assets/game-forms/motion-signal-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'ATTRIBUTION.md').write_text('岔口信号：Kenney 官方 Train Kit 1.1，CC0 1.0。\n\nhttps://kenney.nl/assets/train-kit\n\n原始 License.txt 与色板纹理随模型保存。模型/贴图保持原始字节；完整来源、下载地址与 SHA256 见 assets/game-forms/motion-signal-sources.json。\n\n车站与树木复用本项目先前接入的 Kenney City Kit 作者模型，原始资源和许可未改动。\n',encoding='utf-8')
print('Bundled seven original Train Kit GLBs, original palette, license and provenance.')
