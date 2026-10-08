import hashlib,json,re,shutil
from pathlib import Path
from PIL import Image
P=Path(__file__).resolve().parents[1];f=P/'assets/game-forms/nine-generation-20261004.json';data=json.loads(f.read_text(encoding='utf-8'))
raw=P/'assets/game-forms/nine-sources';raw.mkdir(exist_ok=True);web=P/'web/assets/game-forms/nine';web.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for a in data['assets']:
    source=Path(re.search(r'as (D:\\[^\n]+?\.png)',a['output_hint']).group(1));dest=raw/(a['key']+'.png');assert not dest.exists();shutil.copy2(source,dest)
    target=web/(a['key']+'.webp')
    with Image.open(source) as im:
        im.save(target,format='WEBP',quality=94,method=6);a['dimensions']=list(im.size);a['mode']=im.mode
        if im.mode=='RGBA':a['alpha_extrema']=list(im.getchannel('A').getextrema())
    a.update(raw_file=str(dest.relative_to(P)).replace('\\','/'),raw_sha256=sha(dest),runtime_file=str(target.relative_to(P)).replace('\\','/'),runtime_sha256=sha(target),conversion='WebP encoding only; original size and alpha preserved.')
f.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
(web/'ATTRIBUTION.md').write_text('十一份原创场景与透明素材由内置 ImageGen 生成。原始 PNG、完整提示词和哈希见 assets/game-forms/nine-generation-20261004.json。运行素材保留原尺寸及透明通道。\n',encoding='utf-8')
print('11 original assets packaged.')
