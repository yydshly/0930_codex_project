"""Bundle catalogued static demos for subpath hosting, using stdlib only."""
import html
import json
import re
import shutil
from urllib.parse import urlsplit

from projects import ROOT, project_path, validate
from plush_publish import publish_plush
from atlas_publish import publish_atlas
from soup_publish import publish_soup
from dumpling_publish import publish_dumpling
from insightface_publish import publish_insightface
from sprite_publish import publish_sprite
from black_hole_publish import publish_black_hole


def build(root=ROOT):
    projects = json.loads((root / "projects.json").read_text(encoding="utf-8"))
    validate(projects, root)
    output = root / "_site"
    output.mkdir(exist_ok=True)
    entries = []
    introductions = []
    for project in sorted(projects, key=lambda p: p["id"]):
        relative = project_path(project)
        source = root / relative / "web"
        if not (source / "index.html").is_file():
            continue
        destination = output / relative
        destination.mkdir(parents=True, exist_ok=True)
        # Plush Lab includes a public research archive whose relative directory
        # structure connects demos, renders, source snapshots and study pages.
        if project["id"] == 5 and project["slug"] == "plush-lab":
            publish_plush(root / relative, destination)
        # Visual Atlas publishes only its reviewed static directory and manifest.
        if project["id"] == 6 and project["slug"] == "ai-visual-atlas":
            publish_atlas(root / relative, destination)
        if project["id"] == 11 and project["slug"] == "combination-soup-studio":
            publish_soup(root / relative, destination, projects)
        if project["id"] == 10 and project["slug"] == "dumpling-style-lab":
            publish_dumpling(root / relative, destination)
        if project["id"] == 9 and project["slug"] == "sprite-destruction-lab":
            publish_sprite(root / relative, destination)
        if project["id"] == 13 and project["slug"] == "insightface-retrieval":
            publish_insightface(root / relative, destination)
        if project["id"] == 12 and project["slug"] == "black-hole-lab":
            publish_black_hole(root / relative, destination)
        # Other demos retain their established, flattened web publication.
        specialized_publication = ((project["id"] == 5 and project["slug"] == "plush-lab")
                                   or (project["id"] == 6 and project["slug"] == "ai-visual-atlas")
                                   or (project["id"] == 10 and project["slug"] == "dumpling-style-lab")
                                   or (project["id"] == 9 and project["slug"] == "sprite-destruction-lab")
                                   or (project["id"] == 11 and project["slug"] == "combination-soup-studio")
                                   or (project["id"] == 13 and project["slug"] == "insightface-retrieval")
                                   or (project["id"] == 12 and project["slug"] == "black-hole-lab"))
        for asset in (() if specialized_publication else source.rglob("*")):
            # Case studies can carry actual exported artifacts and public evidence.
            relative_asset = asset.relative_to(source)
            case_export = (relative_asset.parts[0] == "cases" and
                           (("downloads" in relative_asset.parts and asset.suffix.lower() in {".pdf", ".pptx", ".mp4"}) or
                            asset.name in {"validation.json", "adaptations.json", "HUASHU-LICENSE.txt", "react-LICENSE.txt", "react-dom-LICENSE.txt"}))
            if (asset.is_file() and not asset.is_symlink()
                    and not any(part.startswith(".") or part == "node_modules"
                                for part in asset.relative_to(source).parts)
                    and (case_export or asset.suffix.lower() in {".html", ".css", ".js", ".svg", ".png", ".jpg", ".webp", ".woff2"}
                         or (project["slug"] == "rhythm-drop"
                             and relative_asset.parts[0] == "echo"
                             and asset.suffix.lower() == ".wav")
                         or asset.name in {"THREE-LICENSE.txt", "app.js.LEGAL.txt"}
                         or (project['slug'] == 'koi-scene-lab' and asset.name in {
                             "KOI-LICENSE.txt", "DAT-GUI-LICENSE.txt", "HAND-LICENSE.txt",
                             "hand-right.glb", "binding-example.glb", "binding-example.json"}))):
                target = destination / asset.relative_to(source)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(asset, target)
        name, summary = html.escape(project['name']), html.escape(project['summary'])
        if project['slug'] in {'combination-soup-studio', 'cellmotion', 'dumpling-style-lab', 'sprite-destruction-lab', 'insightface-retrieval'}:
            modules = re.split(r'；\s*(?=[\u4e00-\u9fff]{2,8}：)', project['summary'])
            summary = ''.join('<span style="display:block;margin:0 0 7px">' +
                              ('<b>' + html.escape(label) + '：</b>' + html.escape(body) if separator else html.escape(label)) + '</span>'
                              for label, separator, body in (module.partition('：') for module in modules))
        repo, repo_name = html.escape(project['repo'], quote=True), html.escape(urlsplit(project['repo']).path.strip('/'))
        source_link = f'<a href="{repo}">{repo_name}</a>'
        source_note = f'源库：{source_link}。'
        guide_caption = ''
        if 'reference' in project:
            reference = html.escape(project['reference'], quote=True)
            reference_name = html.escape(project['reference_name'])
            source_link = f'<a href="{reference}">{reference_name}</a>' + (f'<br>技术：<a href="{repo}">{repo_name}</a>' if repo else '<br>公开仓库未确认')
            source_note = f'效果来源：<a href="{reference}">{reference_name}</a>。' + (f'技术基础：<a href="{repo}">{repo_name}</a>。' if repo else '按公开网页进行研究，公开仓库未确认。')
            guide_caption = f'<p class="guide-caption">原网页效果截图 · <a href="{reference}">{reference_name}</a>；用于研究引导，非本项目效果。</p>'
        if project["id"] == 6 and project["slug"] == "ai-visual-atlas":
            source_list = f'<a href="./{relative}/#library">十项目源库列表</a>'
            source_link = (f'<a href="{reference}">{reference_name}</a><br>资料索引：'
                           f'<a href="{repo}">{repo_name}</a><br>{source_list}')
            source_note = (f'最初来源：<a href="{reference}">{reference_name}</a>。资料索引：'
                           f'<a href="{repo}">{repo_name}</a>（其中一个资料项目）。{source_list}。')
            guide_caption = '<p class="guide-caption">我们的十项目能力与技术总览 · 按原库与本机实测分别说明，非原作者效果截图。</p>'
        if project["id"] == 7 and project["slug"] == "koi-scene-lab":
            guide_caption = '<p class="guide-caption">我们的理解总览图 · 原作运行实图、底层技术、当前能力、可扩展方向与个人价值；照片重建和实物交付仍为规划。</p>'
        cellmotion_entry = ''
        sprite_entry = ''
        if project["id"] == 9 and project["slug"] == "sprite-destruction-lab":
            guide_caption = '<p class="guide-caption">沿用已生成的完整研究总览图 · 2026-10-02 研究快照：原作、本地引擎、六种效果、头像与跨站、产品和独立工具、原理与后续路线。原作公开破坏 SDK 未确认。</p>'
            sprite_entry = (f'<p><a href="./{relative}/#entries">全部演示与相关链接</a> · '
                            f'<a href="./{relative}/lab.html">六效果 / 三场景</a> · '
                            f'<a href="./{relative}/avatar/">头像出逃</a> · '
                            f'<a href="./{relative}/avatar-anywhere/#proof">跨站实录 / 扩展</a> · '
                            f'<a href="./{relative}/products/">六类产品原型</a> · '
                            f'<a href="./{relative}/toolbox/">独立网页工具</a> · '
                            f'<a href="./{relative}/#summary">放大总览图</a></p>')
        dumpling_entry = ''
        if project["id"] == 10 and project["slug"] == "dumpling-style-lab":
            guide_caption = '<p class="guide-caption">沿用 2026-10-06 的探索全景图 · 原作、九款短篇、107 种形式、十五个独立方向、技术、参考与十二项未启动记录。原作截图与本站预览在图中分别注明。</p>'
            source_link += '<br>方向参考：<a href="https://github.com/bobeff/open-source-games">bobeff/open-source-games</a>'
            source_note += '玩法与效果参考：<a href="https://github.com/bobeff/open-source-games">bobeff/open-source-games</a>，用于发现游戏、建立效果标准与筛选复用能力。'
            dumpling_entry = (f' <a class="button" href="./{relative}/forms.html#compare">107 种形式对照</a>'
                             f' <a class="button" href="./{relative}/showcase.html#collection">116 个展示入口</a>'
                             f'<p><a href="./{relative}/#direction-links">15 个独立方向</a> · '
                             f'<a href="./{relative}/games.html?game=inn#game-view">九款短篇与画风</a> · '
                             f'<a href="./{relative}/#history-links">历史效果</a> · '
                             f'<a href="./{relative}/references.html">参考汇总</a> · '
                             f'<a href="./{relative}/research.html">理解与后续记录</a> · '
                             f'<a href="./{relative}/assets/project-overview-20261006.jpg">完整引导图</a></p>')
        if project["id"] == 8 and project["slug"] == "cellmotion":
            guide_caption = '<p class="guide-caption">沿用我们的理解总览图 · 源库能力、真实效果、技术原理、Remotion / HeyGen 对比、个人价值与 AI 日报扩展。2026-10-02 研究快照；日报生产线尚未实现。</p>'
            cellmotion_entry = (f' <a class="button" href="./{relative}/workshop.html">动手实验室</a>'
                                f' <a class="button" href="./{relative}/summary.html">理解总览与原图</a>'
                                f'<p><a href="./{relative}/#stories">3 支原作成片</a> · '
                                f'<a href="./{relative}/#motion-index">37 项动效目录</a> · '
                                f'<a href="./{relative}/summary.html#daily">AI 日报扩展方案</a> · '
                                f'<a href="https://github.com/yydshly/0930_codex_project/tree/main/{relative}">完整研究资料</a></p>')
        soup_entry = ''
        if project["id"] == 11 and project["slug"] == "combination-soup-studio":
            guide_caption = '<p class="guide-caption">我们的全景理解图 · 11 个板块、16 张实际画面；目标、效果、原理、技能、马桶与耳机、价值及质量交付规划。2026-10-03 研究快照。</p>'
            soup_entry = (f' <a class="button" href="./{relative}/understanding-map.html">放大全景图</a>'
                          f' <a href="./{relative}/understanding.html">完整理解</a> · '
                          f'<a href="./{relative}/#experience-directory">全部效果入口</a> · '
                          f'<a href="./{relative}/foundry/showroom.html?example=toilet">马桶</a> · '
                          f'<a href="./{relative}/foundry/showroom.html?example=headphones">耳机</a>')
        insightface_entry = ''
        if project["id"] == 13 and project["slug"] == "insightface-retrieval":
            guide_caption = '<p class="guide-caption">沿用我们的 2026-10-02 全景理解图 · 任务、特征学习、源库、参考价值与验收。原图保持不变，非原站截图；未运行真实识别。</p>'
            source_link = f'<a href="{reference}">AVScan · 需求参考</a><br>能力参考：<a href="{repo}">{repo_name}</a><br>两者后台关联未确认'
            source_note = f'需求参考：<a href="{reference}">AVScan</a>。能力参考：<a href="{repo}">{repo_name}</a>。未确认 AVScan 使用 InsightFace。'
            insightface_entry = (f' <a class="button" href="./{relative}/map.html">放大全景图</a>'
                                 f' <a class="button" href="./{relative}/mechanisms.html">原理示意</a>'
                                 f'<p><a href="./{relative}/understanding.html">完整理解</a> · '
                                 f'<a href="./{relative}/#entries">全部入口与展示</a> · '
                                 f'<a href="./{relative}/#references">相关产品与开源方案</a> · '
                                 f'<a href="./{relative}/sources.html">14 组来源与记录</a></p>')
        black_hole_entry = ''
        if project["id"] == 12 and project["slug"] == "black-hole-lab":
            guide_caption = '<p class="guide-caption">沿用我们已生成的黑洞效果与时空认知总览图 · 2026-10-02 研究快照。图内为本项目温度伪彩成像，非观测照片；一年与十年为理论说明例子。</p>'
            black_hole_entry = (f' <a class="button" href="./{relative}/?view=effect#experiment">完整黑洞效果</a>'
                                f' <a class="button" href="./{relative}/#understanding">理解总结</a>'
                                f'<p><a href="./{relative}/#entries">全部展示入口</a> · '
                                f'<a href="./{relative}/#experiment">10 章完整讲解</a> · '
                                f'<a href="./{relative}/assets/understanding-map.svg">放大原有总览图</a> · '
                                f'<a href="./{relative}/audio/narration/full-course.mp3">完整中文旁白</a> · '
                                f'<a href="./{relative}/research.html">全文与研究档案</a> · '
                                f'<a href="./{relative}/#applications">场景与扩展</a> · '
                                f'<a href="./{relative}/#references">原帖与科学依据</a></p>')
        entries.append(f'<tr><td>{project["id"]:03d}</td><th scope="row"><a href="./{relative}/">{name}</a></th>'
                       f'<td>{summary}</td><td>{source_link}</td><td><a href="./{relative}/">网页演示</a>{black_hole_entry}</td></tr>')
        guide = ''
        if project['cover']:
            cover = root / relative / project['cover']
            cover_target = destination / project['cover']
            cover_target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(cover, cover_target)
            guide = f'<figure><a href="./{relative}/{project["cover"]}"><img src="./{relative}/{project["cover"]}" alt="{name} 引导图" loading="lazy"></a>{guide_caption}</figure>'
        entry_label = '原作展厅与完整入口' if project['slug'] == 'cellmotion' else '进入研究演示'
        if project['slug'] == 'insightface-retrieval':
            entry_label = '完整理解与展示入口'
        introductions.append(f'<article><div><p class="eyebrow">PROJECT {project["id"]:03d}</p><h2>{name}</h2><p>{summary}</p>'
                             f'<p>{source_note}先看引导图，再进入网页探索具体机制和场景。</p>'
                             f'<a class="button" href="./{relative}/">{entry_label}</a>{cellmotion_entry}{sprite_entry}{soup_entry}{dumpling_entry}{insightface_entry}{black_hole_entry}</div>{guide}</article>')
    index = '''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>GitHub 项目研究集</title>
<style>body{max-width:1180px;margin:45px auto;padding:0 24px;font:16px/1.85 system-ui;color:#172b38;background:#f4f7fa}a{color:#006d58;text-underline-offset:4px}h1{font-size:36px;margin-bottom:12px}h2{font-size:25px}p{color:#596b76}.eyebrow{font:13px monospace;color:#006d58;letter-spacing:2px}.intro{max-width:850px}.table-wrap{overflow-x:auto;background:#fff;border:1px solid #dce4e9;border-radius:10px}table{border-collapse:collapse;width:100%;min-width:750px;font-size:14px}td,th{padding:18px;text-align:left;border-bottom:1px solid #dce4e9;vertical-align:top}thead{background:#e6eef3}td:nth-child(3){min-width:310px}th[scope=row]{min-width:125px}article{display:grid;grid-template-columns:1fr 340px;gap:40px;margin:35px 0;padding:32px;background:#fff;border:1px solid #dce4e9;border-radius:12px}figure{margin:0}.guide-caption{font-size:12px;line-height:1.6}article img{width:100%;height:auto;display:block}.button{display:inline-block;padding:9px 18px;background:#006d58;color:white;border-radius:6px;text-decoration:none}footer{font-size:13px;margin:40px 0;color:#596b76}@media(max-width:700px){h1{font-size:28px}article{grid-template-columns:1fr;padding:22px}article img{max-width:340px;margin:auto}}</style></head><body>
<p class="eyebrow">OPEN SOURCE FIELD NOTES</p><h1>GitHub 项目研究集</h1><div class="intro"><p>从能力到原理，从使用场景到采用判断：把开源项目整理成可阅读、可比较、可交互的研究记录。</p><p>每项研究围绕七个问题展开：能做什么、底层怎么做、如何运行、支持什么系统、用于哪些场景、对我们有何价值、未来怎样扩展。源库链接使用原仓库名；本站演示与上游产品明确区分。</p><p>witr 是运行来源诊断工具，主要价值是整合已有系统能力、减少人工关联。已有成熟采集工具链时，可把它作为便利工具与适配样本，而不必视作新的底层技术。</p></div><h2>项目索引</h2><div class="table-wrap"><table><thead><tr><th>编号</th><th>研究项目</th><th>能力、原理与使用摘要</th><th>来源 / 技术</th><th>入口</th></tr></thead><tbody>''' + ''.join(entries) + '</tbody></table></div><h2>项目介绍与引导图</h2>' + ''.join(introductions) + '<footer>引导图与网页属于独立研究材料；模拟数据不代表实机测量。各源库遵循各自许可证。</footer></body></html>'
    (output / "index.html").write_text(index, encoding="utf-8")
    (output / ".nojekyll").touch()
    print(f"Built {len(entries)} static demo(s) into {output}")


if __name__ == "__main__":
    build()
