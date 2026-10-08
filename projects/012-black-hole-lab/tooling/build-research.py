"""Publish the complete reviewed research as one dependency-free archive page.

Only Python's standard library is used. Source prose is preserved; relative note
links resolve to archive sections or their GitHub sources, never missing public
Markdown files. This script does not modify science notes or the original guide.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
from pathlib import Path
import re
from urllib.parse import quote, urlsplit


PROJECT = Path(__file__).resolve().parents[1]
WEB = PROJECT / "web"
REPOSITORY = "https://github.com/yydshly/0930_codex_project"
REPO_PATH = "projects/012-black-hole-lab"
PUBLICATION_DATE = "2026-10-08"
DOCUMENTS = (
    ("UNDERSTANDING.md", "understanding", "我们的理解：效果、时空与寿命", "当前理解整理", "从效果到概念，区分真实时间差、普通环境影响和远方收到的光。"),
    ("SCIENCE.md", "science", "科学定义、形成与观测机制", "当前科学说明", "黑洞、恒星塌缩、外部气体和所见影像，以及相应资料与范围。"),
    ("PRINCIPLES.md", "principles", "计算公式、实现与数值边界", "当前计算模型", "自由落体、径向光、零测地线、盘温、频移与有限采样。"),
    ("NARRATION.md", "narration", "完整中文旁白与制作记录", "当前课程原稿", "保留全部 10 章 / 30 段原稿、MiniMax 录音与同步方式。"),
    ("CONSTRUCTION.md", "course-design", "同步课程与文件职责", "当前课程设计", "文件名沿用 CONSTRUCTION，正文对应现在的科学讲解与观察流程。"),
    ("research.md", "history", "前期研究与历史版本", "历史记录 · 之前版本", "保留从着色器分层构造到科学流程的早期记录；旧默认入口与优先项不作为当前状态。"),
)
DOCUMENT_ANCHORS = {name: anchor for name, anchor, *_ in DOCUMENTS}


def source_url(path: Path, directory: bool = False) -> str:
    relative = path.resolve().relative_to(PROJECT).as_posix()
    kind = "tree" if directory else "blob"
    return f"{REPOSITORY}/{kind}/main/{REPO_PATH}/{quote(relative, safe='/')}"


def record_anchor(path: Path) -> str:
    return "record-" + re.sub(r"[^a-z0-9-]+", "-", path.stem.lower()).strip("-")


def source_checksum(path: Path) -> str:
    # Git and the public Linux build normalize text to LF. Use the same
    # canonical UTF-8 text so the archive reproduces on Windows and Linux.
    return hashlib.sha256(path.read_text(encoding="utf-8-sig").encode("utf-8")).hexdigest()


class Markdown:
    """Small, escaped renderer for the Markdown constructs in reviewed notes."""

    def __init__(self, source: Path, prefix: str, records: set[str]):
        self.source = source
        self.prefix = prefix
        self.records = records
        self.heading_count = 0

    def link(self, destination: str) -> str:
        parts = urlsplit(destination)
        if parts.scheme in {"https", "http", "mailto"}:
            return destination
        if parts.scheme or destination.startswith("//"):
            return "#contents"
        if not parts.path:
            return destination
        target = (self.source.parent / parts.path).resolve()
        if target.parent == PROJECT / "notes":
            if target.name in DOCUMENT_ANCHORS:
                return "#" + DOCUMENT_ANCHORS[target.name]
            if target.name in self.records:
                return "#" + record_anchor(target)
        if target.is_relative_to(WEB):
            relative = target.relative_to(WEB).as_posix()
            if relative != "README.md":
                return relative + ("?" + parts.query if parts.query else "") + ("#" + parts.fragment if parts.fragment else "")
        if target.is_relative_to(PROJECT):
            return source_url(target, target.is_dir())
        return "#contents"

    def inline(self, text: str) -> str:
        pattern = re.compile(r"`([^`]+)`|(!?)\[([^\]]+)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*")
        chunks, position = [], 0
        for token in pattern.finditer(text):
            chunks.append(html.escape(text[position:token.start()]))
            if token.group(1) is not None:
                chunks.append("<code>" + html.escape(token.group(1)) + "</code>")
            elif token.group(3) is not None:
                label, url = token.group(3), self.link(token.group(4))
                if token.group(2):
                    chunks.append(f'<img src="{html.escape(url, quote=True)}" alt="{html.escape(label, quote=True)}" loading="lazy">')
                else:
                    chunks.append(f'<a href="{html.escape(url, quote=True)}">{self.inline(label)}</a>')
            else:
                chunks.append("<strong>" + html.escape(token.group(5)) + "</strong>")
            position = token.end()
        chunks.append(html.escape(text[position:]))
        return "".join(chunks)

    @staticmethod
    def table_separator(line: str) -> bool:
        cells = line.strip().strip("|").split("|")
        return bool(cells) and all(re.fullmatch(r"\s*:?-{3,}:?\s*", cell) for cell in cells)

    @staticmethod
    def cells(line: str) -> list[str]:
        return [cell.strip() for cell in line.strip().strip("|").split("|")]

    def render(self, text: str) -> str:
        lines = text.replace("\r\n", "\n").splitlines()
        output, index = [], 0
        while index < len(lines):
            line = lines[index]
            if not line.strip():
                index += 1
                continue
            if line.startswith("```"):
                code = []
                language = line[3:].strip()
                index += 1
                while index < len(lines) and not lines[index].startswith("```"):
                    code.append(lines[index])
                    index += 1
                output.append('<pre><code' + (f' class="language-{html.escape(language, quote=True)}"' if language else "") + ">" + html.escape("\n".join(code)) + "</code></pre>")
                index += 1
                continue
            heading = re.match(r"^(#{1,6})\s+(.+)$", line)
            if heading:
                self.heading_count += 1
                level = min(len(heading.group(1)) + 2, 6)
                identifier = f"{self.prefix}-heading-{self.heading_count}"
                output.append(f'<h{level} id="{identifier}">{self.inline(heading.group(2))}<a class="heading-link" href="#{identifier}" aria-label="链接到这一节">#</a></h{level}>')
                index += 1
                continue
            if line.lstrip().startswith("|") and index + 1 < len(lines) and self.table_separator(lines[index + 1]):
                headers = self.cells(line)
                rows = []
                index += 2
                while index < len(lines) and lines[index].lstrip().startswith("|"):
                    rows.append(self.cells(lines[index]))
                    index += 1
                table = '<div class="archive-table"><table><thead><tr>' + "".join('<th scope="col">' + self.inline(cell) + "</th>" for cell in headers) + "</tr></thead><tbody>"
                table += "".join("<tr>" + "".join("<td>" + self.inline(cell) + "</td>" for cell in row) + "</tr>" for row in rows)
                output.append(table + "</tbody></table></div>")
                continue
            item = re.match(r"^\s*(?:([-*])|([0-9]+)\.)\s+(.+)$", line)
            if item:
                ordered = item.group(2) is not None
                tag = "ol" if ordered else "ul"
                start = f' start="{item.group(2)}"' if ordered and item.group(2) != "1" else ""
                items = []
                while index < len(lines):
                    match = re.match(r"^\s*(?:([-*])|([0-9]+)\.)\s+(.+)$", lines[index])
                    if not match or (match.group(2) is not None) != ordered:
                        break
                    items.append("<li>" + self.inline(match.group(3)) + "</li>")
                    index += 1
                output.append(f"<{tag}{start}>" + "".join(items) + f"</{tag}>")
                continue
            if line.startswith(">"):
                quoted = []
                while index < len(lines) and lines[index].startswith(">"):
                    quoted.append(lines[index].lstrip("> "))
                    index += 1
                output.append("<blockquote><p>" + self.inline("\n".join(quoted)) + "</p></blockquote>")
                continue
            if re.fullmatch(r"\s*(?:-{3,}|\*{3,})\s*", line):
                output.append("<hr>")
                index += 1
                continue
            paragraph = [line]
            index += 1
            while index < len(lines) and lines[index].strip() and not re.match(r"^(?:#{1,6}\s|```|\s*[-*]\s|\s*\d+\.\s|>|\|)", lines[index]):
                paragraph.append(lines[index])
                index += 1
            output.append("<p>" + self.inline("\n".join(paragraph)) + "</p>")
        return "\n".join(output)


CSS = """
.archive-page .site-header{height:auto;min-height:77px;flex-wrap:wrap;padding-top:18px;padding-bottom:18px}
.archive-page main{max-width:1150px;padding-bottom:70px}.archive-page a{color:var(--gold)}
.archive-page .archive-top{padding-top:50px;display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:38px;align-items:start}
.archive-page .archive-top h1{font-size:clamp(30px,4vw,48px)}.archive-page .archive-top p{color:var(--soft);font-size:15px;line-height:1.9}
.archive-page .archive-guide{margin:0}.archive-page .archive-guide img{display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:6px}
.archive-page .archive-guide figcaption{font-size:12px;color:var(--muted);margin-top:9px}
.archive-page .archive-note{background:var(--panel);padding:22px;border:1px solid var(--line);border-radius:8px;margin:28px 0}
.archive-page .archive-note p{margin:0 0 8px;color:var(--soft)}.archive-page .archive-note p:last-child{margin:0}
.archive-page .archive-contents{display:block;border:1px solid var(--line);padding:25px;border-radius:8px;margin:35px 0;color:var(--text);font-size:14px}
.archive-page .archive-contents ol{display:grid;grid-template-columns:1fr 1fr;gap:12px 32px;padding-left:22px;margin:17px 0 0}
.archive-page .archive-contents h2{font-size:21px;margin:0}.archive-page .archive-contents p{color:var(--muted);margin:12px 0 0}
.archive-page .archive-section{margin-top:55px;border-top:1px solid var(--line);padding-top:30px;scroll-margin-top:25px}
.archive-page .archive-section>h2{font-size:27px;font-weight:550;line-height:1.4;margin:8px 0 12px}
.archive-page .archive-section .archive-status{color:var(--gold);font-size:12px}.archive-page .archive-source{color:var(--muted);font-size:13px;margin-bottom:25px}
.archive-page .archive-prose{max-width:890px;font-size:15px;line-height:1.95;overflow-wrap:anywhere}
.archive-page .archive-prose p,.archive-page .archive-prose li{color:var(--soft)}.archive-page .archive-prose h3{font-size:23px;margin-top:30px;line-height:1.5}
.archive-page .archive-prose h4{font-size:19px;margin:28px 0 12px;line-height:1.5}.archive-page .archive-prose h5{font-size:17px;margin:25px 0 10px}
.archive-page .archive-prose ul,.archive-page .archive-prose ol{padding-left:25px}.archive-page .archive-prose li{margin:8px 0}
.archive-page .heading-link{margin-left:12px;color:var(--muted);font-size:14px;font-weight:400}
.archive-page code{font-size:.9em;color:#eacb9c;background:#141b26;padding:2px 5px;border-radius:3px}
.archive-page pre{padding:20px;background:#0e141e;border:1px solid var(--line);border-radius:6px;overflow:auto;font:12px/1.75 ui-monospace,Consolas,monospace;max-width:100%}
.archive-page pre code{padding:0;background:transparent;color:var(--soft);font-size:inherit}
.archive-page .archive-table{width:100%;overflow-x:auto;border:1px solid var(--line);border-radius:6px;margin:20px 0}
.archive-page table{width:100%;border-collapse:collapse;font-size:13px;line-height:1.8;min-width:420px}
.archive-page th,.archive-page td{padding:13px 15px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.archive-page th{background:var(--panel);color:var(--text)}.archive-page td{color:var(--soft)}
.archive-page blockquote{border-left:3px solid var(--gold);padding-left:20px;margin-left:0}
.archive-page .record-card{background:var(--panel);border:1px solid var(--line);border-radius:7px;padding:22px;margin:20px 0;overflow-wrap:anywhere}
.archive-page .record-card h3{font-size:19px;line-height:1.5;margin:0 0 10px}.archive-page .record-card p{color:var(--soft);font-size:13px}
.archive-page .record-card details{margin-top:15px}.archive-page .record-card summary{cursor:pointer;color:var(--gold)}
.archive-page .record-card pre{max-height:550px;font-size:11px}.archive-page .record-label{font-size:12px;color:var(--gold)}
.archive-page footer{max-width:1150px;margin:0 auto;padding:30px;display:block;overflow-wrap:anywhere}
@media(max-width:740px){.archive-page main{padding:0 20px 45px}.archive-page .archive-top{grid-template-columns:1fr;gap:22px;padding-top:32px}
.archive-page .archive-guide{max-width:300px}.archive-page .archive-contents{padding:21px}.archive-page .archive-contents ol{grid-template-columns:1fr}
.archive-page .archive-section>h2{font-size:24px}.archive-page .archive-prose{font-size:14px}.archive-page .archive-note{padding:18px}
.archive-page .site-header nav{width:100%;gap:14px;flex-wrap:wrap}.archive-page pre{padding:13px}.archive-page .record-card{padding:17px}}
"""


def validation_card(path: Path) -> str:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    checks = data.get("checks", [])
    historical = path.name in {"construction-validation.json", "science-supplement.json"}
    label = "历史版本验收 · 不能替代当前功能验证" if historical else "保存的验证快照 · 以记录日期和检查范围为准"
    date = data.get("date", data.get("generatedAt", "记录未注明日期"))
    passed = data.get("passed")
    failed = data.get("failed")
    status = data.get("status")
    if isinstance(passed, int) and not isinstance(passed, bool):
        result = f"通过 {passed} 项" + (f"，失败 {failed} 项" if failed is not None else "")
    elif status:
        result = "状态：" + str(status)
    elif checks and all(isinstance(check, dict) and check.get("passed") is True for check in checks):
        result = f"记录内 {len(checks)} 项均通过"
    else:
        result = "结果与范围见完整记录"
    environment = data.get("environment", data.get("limitations", data.get("scope")))
    environment_text = json.dumps(environment, ensure_ascii=False) if isinstance(environment, (dict, list)) else str(environment or "环境与限制见 JSON 记录。")
    full = json.dumps(data, ensure_ascii=False, indent=2)
    checksum = source_checksum(path)
    return f'''<article class="record-card" id="{record_anchor(path)}"><span class="record-label">{html.escape(label)}</span><h3>{html.escape(path.name)}</h3><p>日期：{html.escape(str(date))} · {html.escape(result)} · 记录中的检查条目：{len(checks) if isinstance(checks, list) else '见原记录'}</p><p>{html.escape(environment_text)}</p><p><a href="{source_url(path)}">GitHub 原始记录</a> · <code>SHA-256（UTF-8 / LF）{checksum}</code></p><details><summary>展开完整验证记录</summary><pre>{html.escape(full)}</pre></details></article>'''


def build(publication_date: str = PUBLICATION_DATE, check: bool = False) -> Path:
    records = sorted((PROJECT / "notes").glob("*-validation.json"))
    main_validation = PROJECT / "notes/validation.json"
    if main_validation.is_file():
        records.append(main_validation)
    primary_order = {"model-validation.json": 0, "validation.json": 1, "story-validation.json": 2, "audio-validation.json": 3, "understanding-validation.json": 4, "build-validation.json": 5, "construction-validation.json": 100}
    records.sort(key=lambda path: (primary_order.get(path.name, 10), path.name))
    supplement = PROJECT / "notes/science-supplement.json"
    if supplement.is_file():
        records.append(supplement)
    record_names = {path.name for path in records}
    sections, contents = [], []
    for name, anchor, title, status, description in DOCUMENTS:
        path = PROJECT / "notes" / name
        text = path.read_text(encoding="utf-8-sig")
        digest = source_checksum(path)
        content = Markdown(path, anchor, record_names).render(text)
        sections.append(f'''<section class="archive-section" id="{anchor}" data-source="notes/{name}" data-source-sha256="{digest}"><span class="archive-status">{html.escape(status)}</span><h2>{html.escape(title)}</h2><p class="archive-source">{html.escape(description)} <a href="{source_url(path)}">查看 {name} 原始全文</a> · <a href="#contents">回到目录 ↑</a></p><div class="archive-prose">{content}</div></section>''')
        contents.append(f'<li><a href="#{anchor}">{html.escape(title)}</a></li>')
    contents.extend(['<li><a href="#records">全部验证记录与适用范围</a></li>', '<li><a href="#sources">来源、源码与公开范围</a></li>'])
    record_cards = "\n".join(validation_card(path) for path in records)
    output = f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#080b11"><meta name="description" content="Black Hole Lab 完整研究档案：黑洞理解整理、科学说明、成像公式、10章30段中文旁白原稿、课程设计、历史版本和验证记录。"><title>Black Hole Lab · 完整理解与研究档案</title><link rel="stylesheet" href="styles.css"><style>{CSS}</style></head>
<body class="archive-page"><header class="site-header"><a class="wordmark" href="index.html#overview"><span class="orbit-mark" aria-hidden="true"></span>BLACK HOLE <span>LAB</span></a><nav aria-label="返回展示与理解"><a href="index.html#overview">全部入口</a><a href="index.html#experiment">效果与课程</a><a href="index.html#understanding">理解总结</a><a href="index.html#references">相关链接</a></nav><span class="project-number">研究集 / 012</span></header>
<main><div class="archive-top"><div><p class="eyebrow">UNDERSTANDING · SCIENCE · FULL RESEARCH</p><h1>从视觉效果到真实原理，<br>完整保留我们的理解。</h1><p>从黑洞暗影、外部亮盘、弯光亮弧和频移明暗，继续理解恒星塌缩、事件视界、时空、固有时与身体衰老。这里收录完整说明、计算公式、全部旁白、设计记录及验证证据，方便顺着来源核对。</p><p><a href="index.html#overview">回到全部展示入口 →</a> · <a href="index.html#experiment">运行实时效果与完整课程 →</a></p></div><figure class="archive-guide"><a href="assets/understanding-map.png"><img src="assets/understanding-map.png" width="1800" height="2240" alt="沿用已生成的黑洞效果与时空认知总览图" decoding="async"></a><figcaption>沿用我们的原总览图 · <a href="assets/understanding-map.png">PNG 大图</a> · <a href="assets/understanding-map.svg">SVG</a></figcaption></figure></div>
<div class="archive-note"><p><strong>阅读顺序：</strong>先看理解总结，再看当前科学说明与计算模型；需要逐句核对时阅读完整旁白。最后的前期研究和旧 construction 验收明确标为历史版本。</p><p><strong>资料时间：</strong>研究正文保留各自记录日期；本公开档案整理于 {html.escape(publication_date)}（Asia/Shanghai）。旧验证快照用于说明当时检查过什么，不能自动证明现在的部署或硬件性能。</p><p><strong>当前范围：</strong>外部成像采用无自旋黑洞与简化薄盘，部分形成与气体过程为机制示意；温度伪彩不是观测照片，“自己一年 / 地球十年”是说明固有时差的理论例子。</p></div>
<nav class="archive-contents" id="contents" aria-label="完整研究目录"><h2>完整目录</h2><ol>{''.join(contents)}</ol><p>正文全部可展开阅读，无需另装工具；公式表格在窄屏可横向查看，验证详情可按需展开。</p></nav>
{''.join(sections)}
<section class="archive-section" id="records"><span class="archive-status">证据与边界</span><h2>全部验证记录</h2><div class="archive-prose"><p>以下按当前模型、浏览器、故事流程、实际音频与理解总结优先排序，保留每个 JSON 的完整内容和源码链接。原子钟与天文观测属于科学资料，软件验收属于本项目功能检查，二者不互相替代。</p><p>Chromium / SwiftShader 是软件渲染环境；手机布局检查是视口模拟。无头浏览器不能代替人工听感或真实手机 GPU 性能评审。旧版构造与历史构建记录的范围以各自日期为准。</p></div>{record_cards}</section>
<section class="archive-section" id="sources"><span class="archive-status">来源、源码与发布</span><h2>从参考画面到本项目实现</h2><div class="archive-prose"><p>视觉起点是 <a href="https://www.reddit.com/r/SoloDevelopment/comments/1wr6jr4/my_black_hole_shader_for_my_game/">VOLDR_dev 的 Reddit 黑洞 shader 展示</a>。本项目独立实现；原作公开仓库与 commit 尚未确认。科学资料分散在上面的完整说明中，包括 NASA、Einstein Online、NIST、CERN、ESO、LIGO 和原始论文。</p><ul><li><a href="{REPOSITORY}/tree/main/{REPO_PATH}">本项目完整源码与研究记录</a></li><li><a href="{REPOSITORY}/blob/main/{REPO_PATH}/README.md">README：摘要、运行、用途和扩展</a></li><li><a href="{REPOSITORY}/tree/main/{REPO_PATH}/notes">全部原始 notes 与报告</a></li><li><a href="audio/narration/full-course.mp3" download>完整 MiniMax 旁白 MP3 · 约 13:03</a></li><li><a href="{REPOSITORY}/blob/main/{REPO_PATH}/notes/narration-script.json">机器可读完整原稿</a> · <a href="{REPOSITORY}/blob/main/{REPO_PATH}/notes/narration-generation.json">实际录音与生成回执</a></li><li><a href="{REPOSITORY}/blob/main/{REPO_PATH}/tooling/build-research.py">本档案的可重现生成脚本</a></li></ul><p>公开网页包含完整演示、全部 30 段与合并音频、理解图及本档案。运行网页不需要 API 密钥或现场合成。原始研究和制作工具通过 GitHub 保留，网站不复制私有配置或依赖目录。</p><p><a href="index.html#overview">返回全部入口 →</a> · <a href="index.html#experiment">看黑洞效果 →</a> · <a href="index.html#understanding">看理解总结 →</a> · <a href="index.html#references">看相关链接 →</a> · <a href="#contents">回到本页目录 ↑</a></p></div></section>
</main><footer><strong>BLACK HOLE LAB · 完整研究档案</strong><p>原说明全文保留，当前科学模型与历史记录分别标注。总览图沿用已生成版本。</p></footer></body></html>
'''
    destination = WEB / "research.html"
    expected = output.encode("utf-8")
    for anchor in ("understanding", "science", "narration", "records"):
        if f'id="{anchor}"' not in output:
            raise ValueError(f"Required research anchor missing: {anchor}")
    if check:
        if not destination.is_file() or destination.read_bytes() != expected:
            raise SystemExit("Research archive is out of date; run build-research.py to regenerate it.")
    else:
        destination.write_bytes(expected)
    print(json.dumps({"page": str(destination), "mode": "check" if check else "build", "current": True, "documents": len(DOCUMENTS), "validation_records": len(records), "bytes": len(expected), "sha256": hashlib.sha256(expected).hexdigest()}, ensure_ascii=False))
    return destination


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--publication-date", default=PUBLICATION_DATE)
    parser.add_argument("--check", action="store_true", help="Verify the committed archive matches current notes without writing it.")
    arguments = parser.parse_args()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", arguments.publication_date):
        parser.error("--publication-date must be YYYY-MM-DD")
    build(arguments.publication_date, arguments.check)
