from pathlib import Path
p=Path(__file__).resolve().parent/'export-foundry-scenes.mjs';s=p.read_text(encoding='utf-8')
s=s.replace("const NativeRequest=globalThis.Request;", "const nativeFetch=globalThis.fetch;globalThis.self=globalThis;globalThis.createImageBitmap=async blob=>{const im=new SkiaImage(),b=Buffer.from(await blob.arrayBuffer());im.src=b;im.sourcePNG=b;return im;};const NativeRequest=globalThis.Request;")
s=s.replace("u=new URL(typeof req==='string'?req:req.url),f=path.resolve", "u=new URL(typeof req==='string'?req:req.url);if(u.protocol==='blob:'||u.protocol==='data:')return nativeFetch(req);const f=path.resolve")
marker="const states=foundryPlaythroughs(),checks=[],frameFiles=[];"
extra="""function textureAsset(t){if(!t)return null;if(t.userData.asset)return t.userData.asset;if(t.image?.sourcePNG){const name='model-palette-'+crypto.createHash('sha256').update(t.image.sourcePNG).digest('hex').slice(0,12)+'.png',folder=path.join(W,'assets/game-forms/foundry/model-palettes');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,name),t.image.sourcePNG);return 'assets/game-forms/foundry/model-palettes/'+name;}return null;}
"""
s=s.replace(marker,extra+marker);s=s.replace("map:m.map?.userData.asset||null", "map:textureAsset(m.map)");p.write_text(s,encoding='utf-8');print('Adapted native file/embedded-image loading for offline scene export')
