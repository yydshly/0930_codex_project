"""Compress actual browser captures and connect the project's cover to the catalog."""
import json
import shutil
from pathlib import Path

from PIL import Image

PROJECT = Path(__file__).resolve().parents[1]
ROOT = PROJECT.parents[1]

for folder, pattern in [(PROJECT / 'web/assets', 'style-*.png'), (PROJECT / 'web/assets', 'play-*.png'), (PROJECT / 'web/assets', 'extension-*.png'), (PROJECT / 'assets', '*.png')]:
    for capture in folder.glob(pattern):
        if capture.name == 'original-world.png':
            continue
        with Image.open(capture) as img:
            img.convert('RGB').save(capture.with_suffix('.webp'), 'WEBP', quality=92, method=6)
        capture.unlink()

# The presentation check records its source capture; retain a usable evidence link
# after converting the final deliverable to WebP.
for presentation_check in [PROJECT / 'notes/extension-presentation-check.json', PROJECT / 'notes/extension-v2-presentation-check.json']:
    if presentation_check.exists():
        report = json.loads(presentation_check.read_text(encoding='utf-8'))
        report['screenshots'] = [
            str(Path(name).with_suffix('.webp')).replace('\\', '/')
            if (PROJECT / Path(name).with_suffix('.webp')).exists() else name
            for name in report.get('screenshots', [])
        ]
        presentation_check.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

shutil.copy2(PROJECT / 'web/assets/original-world.png', PROJECT / 'assets/original-world.png')
catalog = ROOT / 'projects.json'
projects = json.loads(catalog.read_text(encoding='utf-8'))
for project in projects:
    if project['slug'] == 'dumpling-style-lab':
        project['name'] = 'Dumpling Style Lab · 小世界的新故事'
        project['status'] = '已完成'
        project['cover'] = 'assets/original-world.png'
        # Only a verified public deployment belongs in demo; this is a local preview.
        project['demo'] = ''
        project['summary'] = '目标：参考 Dumpling Dell 的小世界结构，探索不同画风、故事与游玩动机；体验：黑白侦探、国风江湖、自然微缩、废土生存、梦境解谜、都市跑酷，以及旅店、浮岛和搬家九款原型；原理：证据推理、有限资源、季节演替、物件改变通路与动作碰撞支持不同玩法；证据：独立章节与关卡、真实输入和可见后果、本地分别保存进度；边界：短章第一版，情绪与继续意愿待真人试玩，早期材质研究保留为附录。'
catalog.write_text(json.dumps(projects, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Prepared browser captures and catalog cover.')
