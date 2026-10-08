import pathlib,zipfile,json,hashlib,datetime,struct

root=pathlib.Path(__file__).resolve().parents[1]
source=root/'assets/game-forms/systems-city-sources'
out=root/'web/assets/game-forms/district';out.mkdir(parents=True,exist_ok=True)
packs={
 'suburban':('https://kenney.nl/assets/city-kit-suburban',['building-type-a','building-type-c','building-type-g','building-type-k','tree-large','tree-small','planter']),
 'commercial':('https://kenney.nl/assets/city-kit-commercial',['building-a','building-c']),
 'roads':('https://kenney.nl/assets/city-kit-roads',['road-straight','road-crossroad','road-intersection','road-bend','road-end','light-curved','road-crossing']),
 'cars':('https://kenney.nl/assets/car-kit',['sedan','taxi','van'])
}
files=[]
for pack,(url,names) in packs.items():
 z=zipfile.ZipFile(source/(pack+'.zip'))
 license_name=next(n for n in z.namelist() if n.lower().endswith('license.txt'))
 (out/(pack+'-LICENSE.txt')).write_bytes(z.read(license_name))
 texture=z.read('Models/GLB format/Textures/colormap.png');(out/'Textures').mkdir(exist_ok=True);texture_name='Textures/'+pack+'-colormap.png';(out/texture_name).write_bytes(texture)
 files.append({'path':'web/assets/game-forms/district/'+texture_name,'pack':pack,'original':'Models/GLB format/Textures/colormap.png','bytes':len(texture),'sha256':hashlib.sha256(texture).hexdigest()})
 for name in names:
  original='Models/GLB format/'+name+'.glb';original_data=z.read(original);length=struct.unpack_from('<I',original_data,12)[0];document=json.loads(original_data[20:20+length]);document['images'][0]['uri']=texture_name
  encoded=json.dumps(document,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4);remaining=original_data[20+length:];data=struct.pack('<III',0x46546c67,2,20+len(encoded)+len(remaining))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+remaining;(out/(name+'.glb')).write_bytes(data)
  files.append({'path':'web/assets/game-forms/district/'+name+'.glb','pack':pack,'original':original,'originalSha256':hashlib.sha256(original_data).hexdigest(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'change':'Only external texture URI renamed to avoid collisions between the four official colormaps; original mesh buffer and materials unchanged.'})
manifest={'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'mode':'Official authored 3D model assets, locally bundled','author':'Kenney','license':'Creative Commons CC0 1.0','licenseUrl':'https://creativecommons.org/publicdomain/zero/1.0/','primarySources':[{'pack':p,'url':v[0],'archive':'assets/game-forms/systems-city-sources/'+p+'.zip','licenseFile':'web/assets/game-forms/district/'+p+'-LICENSE.txt'} for p,v in packs.items()],'files':files,'changes':'Scaled and rotated glTF scene instances; game roads, building placement, lighting, water and pathfinding authored in the local module. Original model geometry and authored colormap textures retained; external texture paths are renamed by pack to avoid filename collisions.'}
(root/'assets/game-forms/systems-city-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'ATTRIBUTION.md').write_text('晨湾街区模型来自 Kenney 官方 City Kit (Suburban / Commercial / Roads) 与 Car Kit。\n\n作者：Kenney。许可：CC0 1.0。\n\n'+ '\n'.join('- '+v[0] for v in packs.values())+'\n\n原始许可文件随模型保存；完整来源和 SHA256 清单见 assets/game-forms/systems-city-sources.json。\n',encoding='utf-8')
print('Bundled',sum(v['path'].endswith('.glb') for v in files),'authored GLB models, four original colormap textures and four original licenses.')
