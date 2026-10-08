"""Bundle catalogued static demos for subpath hosting, using stdlib only."""
import html
import json
import shutil
from urllib.parse import urlsplit

from projects import ROOT, project_path, validate
from plush_publish import publish_plush


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
        # Other demos retain their established, flattened web publication.
        for asset in (() if project["id"] == 5 and project["slug"] == "plush-lab" else source.rglob("*")):
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
                         or asset.name in {"THREE-LICENSE.txt", "app.js.LEGAL.txt"})):
                target = destination / asset.relative_to(source)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(asset, target)
        name, summary = html.escape(project['name']), html.escape(project['summary'])
        repo, repo_name = html.escape(project['repo'], quote=True), html.escape(urlsplit(project['repo']).path.strip('/'))
        source_link = f'<a href="{repo}">{repo_name}</a>'
        source_note = f'源库：{source_link}。'
        guide_caption = ''
        if 'reference' in project:
            reference = html.escape(project['reference'], quote=True)
            reference_name = html.escape(project['reference_name'])
            source_link = f'<a href="{reference}">{reference_name}</a><br>技术：<a href="{repo}">{repo_name}</a>'
            source_note = f'效果来源：<a href="{reference}">{reference_name}</a>。技术基础：<a href="{repo}">{repo_name}</a>。'
            guide_caption = f'<p class="guide-caption">原网页效果截图 · <a href="{reference}">{reference_name}</a>；用于研究引导，非本项目效果。</p>'
        entries.append(f'<tr><td>{project["id"]:03d}</td><th scope="row"><a href="./{relative}/">{name}</a></th>'
                       f'<td>{summary}</td><td>{source_link}</td><td><a href="./{relative}/">网页演示</a></td></tr>')
        guide = ''
        if project['cover']:
            cover = root / relative / project['cover']
            cover_target = destination / project['cover']
            cover_target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(cover, cover_target)
            guide = f'<figure><a href="./{relative}/{project["cover"]}"><img src="./{relative}/{project["cover"]}" alt="{name} 引导图" loading="lazy"></a>{guide_caption}</figure>'
        introductions.append(f'<article><div><p class="eyebrow">PROJECT {project["id"]:03d}</p><h2>{name}</h2><p>{summary}</p>'
                             f'<p>{source_note}先看引导图，再进入网页探索具体机制和场景。</p>'
                             f'<a class="button" href="./{relative}/">进入研究演示</a></div>{guide}</article>')
    index = '''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>GitHub 项目研究集</title>
<style>body{max-width:1180px;margin:45px auto;padding:0 24px;font:16px/1.85 system-ui;color:#172b38;background:#f4f7fa}a{color:#006d58;text-underline-offset:4px}h1{font-size:36px;margin-bottom:12px}h2{font-size:25px}p{color:#596b76}.eyebrow{font:13px monospace;color:#006d58;letter-spacing:2px}.intro{max-width:850px}.table-wrap{overflow-x:auto;background:#fff;border:1px solid #dce4e9;border-radius:10px}table{border-collapse:collapse;width:100%;min-width:750px;font-size:14px}td,th{padding:18px;text-align:left;border-bottom:1px solid #dce4e9;vertical-align:top}thead{background:#e6eef3}td:nth-child(3){min-width:310px}th[scope=row]{min-width:125px}article{display:grid;grid-template-columns:1fr 340px;gap:40px;margin:35px 0;padding:32px;background:#fff;border:1px solid #dce4e9;border-radius:12px}figure{margin:0}.guide-caption{font-size:12px;line-height:1.6}article img{width:100%;height:auto;display:block}.button{display:inline-block;padding:9px 18px;background:#006d58;color:white;border-radius:6px;text-decoration:none}footer{font-size:13px;margin:40px 0;color:#596b76}@media(max-width:700px){h1{font-size:28px}article{grid-template-columns:1fr;padding:22px}article img{max-width:340px;margin:auto}}</style></head><body>
<p class="eyebrow">OPEN SOURCE FIELD NOTES</p><h1>GitHub 项目研究集</h1><div class="intro"><p>从能力到原理，从使用场景到采用判断：把开源项目整理成可阅读、可比较、可交互的研究记录。</p><p>每项研究围绕七个问题展开：能做什么、底层怎么做、如何运行、支持什么系统、用于哪些场景、对我们有何价值、未来怎样扩展。源库链接使用原仓库名；本站演示与上游产品明确区分。</p><p>witr 是运行来源诊断工具，主要价值是整合已有系统能力、减少人工关联。已有成熟采集工具链时，可把它作为便利工具与适配样本，而不必视作新的底层技术。</p></div><h2>项目索引</h2><div class="table-wrap"><table><thead><tr><th>编号</th><th>研究项目</th><th>能力、原理与使用摘要</th><th>来源 / 技术</th><th>入口</th></tr></thead><tbody>''' + ''.join(entries) + '</tbody></table></div><h2>项目介绍与引导图</h2>' + ''.join(introductions) + '<footer>引导图与网页属于独立研究材料；模拟数据不代表实机测量。各源库遵循各自许可证。</footer></body></html>'
    (output / "index.html").write_text(index, encoding="utf-8")
    (output / ".nojekyll").touch()
    print(f"Built {len(entries)} static demo(s) into {output}")


if __name__ == "__main__":
    build()
