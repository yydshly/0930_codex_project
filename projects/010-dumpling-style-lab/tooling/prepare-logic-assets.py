import hashlib,json,re,shutil
from pathlib import Path
from PIL import Image
P=Path(__file__).resolve().parents[1]
manifest=P/'assets/game-forms/logic-generation-20261004.json'
data=json.loads(manifest.read_text(encoding='utf-8'))
raw=P/'assets/game-forms/logic-sources';raw.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for a in data['assets']:
    source=Path(re.search(r'as (D:\\[^\n]+?\.png)',a['output_hint']).group(1))
    target=raw/(a['key']+'.png');assert not target.exists();shutil.copy2(source,target)
    folder=P/f"web/assets/game-forms/{a['module']}";folder.mkdir(exist_ok=True)
    output=folder/(a['key']+'.webp')
    with Image.open(source) as im:
        im.save(output,format='WEBP',quality=94,method=6);a['dimensions']=list(im.size);a['mode']=im.mode
        if im.mode=='RGBA':a['alpha_extrema']=list(im.getchannel('A').getextrema())
    a.update(raw_file=str(target.relative_to(P)).replace('\\','/'),raw_sha256=sha(target),runtime_file=str(output.relative_to(P)).replace('\\','/'),runtime_sha256=sha(output),conversion='WebP encoding only; original dimensions and alpha preserved.')
    (folder/'ATTRIBUTION.md').write_text('原创场景与物件通过内置 ImageGen 制作，原始 PNG、完整提示词、生成输出与哈希见 assets/game-forms/logic-generation-20261004.json。运行素材保持原尺寸和透明通道。\n',encoding='utf-8')
manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{'key':a['key'],'size':a['dimensions'],'alpha':a.get('alpha_extrema')} for a in data['assets']]))
