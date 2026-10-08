"""Update this research only, preserving concurrently added catalog entries."""
import json
import shutil
from pathlib import Path

project = Path(__file__).resolve().parents[1]
root = project.parents[1]
catalog_path = root / 'projects.json'
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
entry = next(item for item in catalog if item['id'] == 9 and item['slug'] == 'sprite-destruction-lab')
entry.update(
    status='已完成',
    cover='assets/research-overview.png',
    reference='https://destroy.spritefusion.com/',
    reference_name='Destroy Any Website · 原作游戏',
    summary='定位：从 Destroy Any Website 游戏出发研究网页内容互动，原作公开破坏 SDK 未确认；能力：六种效果、三个场景、头像出逃与可安装跨站扩展，保留真实 GitHub 录像；产物：动效 PNG/WebM、对比报告、维护记录、CSV 故事、品牌作品册、嵌入组件，以及独立翻译/摘录/表格工具；原理：DOM 重建或视口截图、纹理切片、二维刚体/粒子/遮罩、角色编排与事件；场景：内容制作、品牌角色、可玩展示、碰撞教学和网页效率；价值：复用现有内容与交互接口，明确区分效果能力、产品任务和另建工具；扩展：角色素材、时间线、组件化、自有 WebView 与业务接入；边界：身体动作预设，仅当前视口；App、多人和营销后端待开发，翻译依赖外部服务，尚无商业收益验证。',
)
catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
destination = project / 'web/assets'
destination.mkdir(exist_ok=True)
shutil.copy2(project/'assets/source-research-catalog-playing.png',project/'assets/source-effect.png')
shutil.copy2(project/'assets/source-research-catalog-playing.png',destination/'source-catalog.png')
shutil.copy2(project/'assets/source-wikipedia-playing.png',destination/'source-wikipedia.png')
# These are obsolete artifacts from the fixed visibility check, scoped to this project.
for name in ['source-research-catalog-unverified.png','source-wikipedia-unverified.png','qa-failure.png']:
    (project/'assets'/name).unlink(missing_ok=True)
print('Updated project 009 only; copied original screenshots with attribution.')
