"""Manage the research catalog with Python's standard library only."""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import quote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
STATUSES = {"待研究", "研究中", "已完成", "已归档"}
FIELDS = {"id", "slug", "name", "repo", "summary", "status", "demo", "cover"}


def project_path(project):
    return f"projects/{project['id']:03d}-{project['slug']}"


def valid_url(value, github=False):
    parsed = urlsplit(value)
    valid = (parsed.scheme == "https" and bool(parsed.hostname)
             and not parsed.username and not parsed.password
             and not re.search(r"\s", value))
    if github:
        valid = valid and parsed.netloc == "github.com" and bool(
            re.fullmatch(r"/[^/]+/[^/]+/?", parsed.path))
    return valid


def validate(projects, root, check_files=True):
    if not isinstance(projects, list):
        raise ValueError("projects.json 必须是数组。")
    ids, slugs = set(), set()
    for project in projects:
        if not isinstance(project, dict) or set(project) != FIELDS:
            raise ValueError("项目字段必须与 docs/CONVENTIONS.md 的清单字段一致。")
        number = project["id"]
        if type(number) is not int or number < 1 or number in ids:
            raise ValueError(f"编号必须是唯一正整数：{number}")
        ids.add(number)
        for field in FIELDS - {"id"}:
            if not isinstance(project[field], str) or any(
                ord(char) < 32 for char in project[field]
            ):
                raise ValueError(f"{number}: {field} 必须是单行文本。")
        slug = project["slug"]
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or slug in slugs:
            raise ValueError(f"slug 无效或重复：{slug}")
        slugs.add(slug)
        if not project["name"].strip() or not project["summary"].strip():
            raise ValueError(f"{number}: 名称和摘要不能为空。")
        if project["status"] not in STATUSES:
            raise ValueError(f"{number}: 未知研究状态。")
        if not valid_url(project["repo"], github=True):
            raise ValueError(f"{number}: repo 必须是 GitHub 仓库的 HTTPS 地址。")
        if project["demo"] and not valid_url(project["demo"]):
            raise ValueError(f"{number}: demo 必须是 HTTPS 地址或空字符串。")
        folder = root / project_path(project)
        if check_files and not (folder / "README.md").is_file():
            raise ValueError(f"缺少研究文档：{project_path(project)}/README.md")
        cover = project["cover"]
        if cover:
            parts = cover.split("/")
            if (len(parts) < 2 or parts[0] != "assets"
                    or any(part in {"", ".", ".."} for part in parts)
                    or "\\" in cover or ":" in cover
                    or Path(cover).suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}):
                raise ValueError(f"{number}: cover 必须是 assets/ 内的图片路径。")
            if check_files and (not (folder / cover).is_file() or not
                    (folder / cover).resolve().is_relative_to(folder.resolve())):
                raise ValueError(f"{number}: 封面不存在或位于项目目录之外。")
    if check_files:
        expected = {Path(project_path(p)).name for p in projects}
        for folder in (root / "projects").iterdir():
            if folder.is_dir() and not folder.name.startswith(".") and folder.name not in expected:
                raise ValueError(f"子项目未登记：{folder.name}")


def markdown(value):
    value = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return re.sub(r"([\\`*_{}\[\]()|!#])", r"\\\1", value)


def link(label, target):
    return f"[{markdown(label)}]({quote(target, safe='/:#?=&%+@~-')})"


def render_readme(root, projects):
    rows = ["| 编号 | 项目 / 研究文档 | 摘要 | 状态 | 上游仓库 | 演示 |",
            "| --- | --- | --- | --- | --- | --- |"]
    previews = []
    for project in sorted(projects, key=lambda item: item["id"]):
        path = project_path(project)
        entry = link(project["name"], f"{path}/README.md")
        demo = link("在线演示", project["demo"]) if project["demo"] else "—"
        rows.append(f"| {project['id']:03d} | {entry} | {markdown(project['summary'])} | "
                    f"{project['status']} | {link('GitHub', project['repo'])} | {demo} |")
        if project["cover"]:
            previews.append(f"### {project['id']:03d} · {markdown(project['name'])}\n\n"
                            f"!{link(project['name'] + ' 项目预览', path + '/' + project['cover'])}\n\n"
                            f"{markdown(project['summary'])}\n\n{link('研究详情', path + '/README.md')}"
                            + (f" · {demo}" if project["demo"] else ""))
    index = "\n".join(rows) if projects else "暂无研究项目。添加第一个项目后，这里会自动生成有序索引。"
    content = (root / "README.md").read_text(encoding="utf-8")
    for section, body in [("INDEX", index), ("PREVIEWS", "\n\n".join(previews) or "暂无项目预览。")]:
        start, end = f"<!-- PROJECT_{section}:START -->", f"<!-- PROJECT_{section}:END -->"
        if content.count(start) != 1 or content.count(end) != 1 or content.index(start) > content.index(end):
            raise ValueError(f"README 缺少或重复生成标记：{section}")
        before, rest = content.split(start)
        _, after = rest.split(end)
        content = before + start + "\n\n" + body + "\n\n" + end + after
    return content


def write_text(path, text):
    with path.open("w", encoding="utf-8", newline="\n") as file:
        file.write(text)


def run(args, root=ROOT):
    catalog = root / "projects.json"
    projects = json.loads(catalog.read_text(encoding="utf-8"))
    validate(projects, root)
    if args.command == "add":
        project = dict(id=max((p["id"] for p in projects), default=0) + 1,
                       slug=args.slug, name=args.name, repo=args.repo, summary=args.summary,
                       status="待研究", demo="", cover="")
        updated = projects + [project]
        validate(updated, root, check_files=False)
        content = render_readme(root, updated)
        folder = root / project_path(project)
        if folder.exists():
            raise ValueError(f"目标目录已存在：{folder}")
        shutil.copytree(root / "templates/project", folder)
        template = (folder / "README.md").read_text(encoding="utf-8")
        values = {"ID": f"{project['id']:03d}", "NAME": markdown(project["name"]),
                  "SUMMARY": markdown(project["summary"]),
                  "REPO": quote(project["repo"], safe="/:#?=&%+@~-")}
        template = re.sub(r"\{\{(ID|NAME|SUMMARY|REPO)\}\}", lambda match: values[match[1]], template)
        write_text(folder / "README.md", template)
        write_text(catalog, json.dumps(updated, ensure_ascii=False, indent=2) + "\n")
        write_text(root / "README.md", content)
        print(f"已创建 {project_path(project)}，并更新首页索引。")
    else:
        content = render_readme(root, projects)
        if args.command == "check":
            if content != (root / "README.md").read_text(encoding="utf-8"):
                raise ValueError("首页索引未同步，请运行 python scripts/projects.py render。")
            print(f"检查通过：{len(projects)} 个项目，清单与首页一致。")
        else:
            write_text(root / "README.md", content)
            print("首页索引与图片预览已更新。")


def main():
    parser = argparse.ArgumentParser(description="管理有序 GitHub 研究项目。")
    commands = parser.add_subparsers(dest="command", required=True)
    add = commands.add_parser("add", help="创建下一个编号的研究项目")
    for field in ("slug", "name", "repo", "summary"):
        add.add_argument(f"--{field}", required=True)
    commands.add_parser("render", help="同步主 README 的索引和预览")
    commands.add_parser("check", help="检查目录、清单与首页一致性")
    try:
        run(parser.parse_args())
    except (ValueError, OSError) as error:
        print(f"错误：{error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
