"""Build the complete Chippytea research reader, using only stdlib."""
import html, json, re, hashlib
from pathlib import Path
from urllib.parse import quote, urlsplit
PROJECT=Path(__file__).resolve().parents[1]
WEB=PROJECT/"web"
DOCUMENTS=[
("README.md","understanding","当前理解与全部入口","当前整理 · 2026-10-08"),
("notes/publication-summary.md","publication","本次发布摘要与范围","当前整理"),
("notes/research.md","source","源库研究全文","2026-10-02 历史研究；音乐与入口以当前总览为准"),
("notes/original-worlds.md","worlds","三个原创世界与实现","2026-10-03 历史设计 · 演出基线 v10；当前首页为总览，原作在 source，发布检查见下方"),
("notes/daily-work-analysis.md","daily","日常重复工作分析","场景选择依据；无次数和工时统计"),
("web/README.md","usage","网页运行与使用说明","当前操作与静态边界"),
("design-qa.md","qa","设计与历史验收记录","历史证据分版本保留；本次发布另附记录")]
DOCUMENT_ANCHORS={Path(name).name:anchor for name,anchor,*_ in DOCUMENTS}
def source_url(path,directory=False):
 relative=path.resolve().relative_to(PROJECT).as_posix()
 return "https://github.com/yydshly/0930_codex_project/"+("tree" if directory else "blob")+"/main/projects/016-chippytea-lab/"+quote(relative,safe="/")
def record_anchor(path):return "record-"+re.sub(r"[^a-z0-9-]+","-",path.stem.lower()).strip("-")
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
            if parts.hostname in {"127.0.0.1","localhost"}:
                return "./" + ("?" + parts.query if parts.query else "?view=source") + ("#" + parts.fragment if parts.fragment else "")
            return destination
        if parts.scheme or destination.startswith("//"):
            return "#scope"
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
            relative=target.relative_to(PROJECT).as_posix()
            if relative.startswith("assets/"):
                aliases={"assets/worlds-v10-qa/gravity-32s-with-music-offline.mp4":"assets/previews/gravity-v10.mp4","assets/worlds-v10-qa/moon-32s-interaction-offline.mp4":"assets/previews/moon-v10.mp4","assets/worlds-v10-qa/shadow-32s-with-music-offline.mp4":"assets/previews/shadow-v10.mp4"}
                if relative in aliases:return aliases[relative]
                return relative if (WEB/relative).is_file() else "#scope"
            return source_url(target, target.is_dir()) if target.exists() else "#scope"
        repository=PROJECT.parents[1]
        if target.is_relative_to(repository):
            relative=target.relative_to(repository).as_posix()
            if relative=="README.md":return "../../"
            if relative.startswith("projects/"):
                folder=relative.split("/")[1]
                if (repository/"projects"/folder/"web/index.html").is_file() and (target.is_dir() or target.name=="README.md"):
                    return "../"+folder+"/"
            if target.exists():return "https://github.com/yydshly/0930_codex_project/blob/main/"+quote(relative,safe="/")
        return "#scope"

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


CSS="""body{overflow-wrap:anywhere;background:#faf5ea;color:#302e29;font:16px/1.85 system-ui,'Microsoft YaHei',sans-serif;margin:0}main{max-width:1120px;margin:auto;padding:30px}a{color:#514126;text-underline-offset:3px}header,nav,section{border-bottom:1px solid #c8beac;padding:26px 0}h1{font-size:36px;line-height:1.4}h2{font-size:28px}h3,h4,h5,h6{line-height:1.5}nav{display:flex;gap:16px;flex-wrap:wrap}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#ede8dc;padding:20px;font:13px/1.7 ui-monospace,monospace;border-radius:8px}code{overflow-wrap:anywhere}img{max-width:100%;height:auto}.archive-table{overflow-x:auto}table{border-collapse:collapse;min-width:620px;font-size:14px}td,th{padding:12px;border:1px solid #c8beac;vertical-align:top}.heading-link{font-size:12px;margin-left:12px}.status{color:#77664b;font-size:13px}.scope{padding:22px;background:#eae4d6}details{padding:12px 0}summary{cursor:pointer;font-weight:600}@media(max-width:600px){main{padding:18px}h1{font-size:28px}h2{font-size:24px}}"""
def build():
 records=[p for p in (PROJECT/"notes").glob("*.json") if p.name.startswith(("world-music","music-generation","host-behavior","publication-")) or p.name=="deployment-summary.json"]
 links="".join(f'<a href="#{anchor}">{html.escape(title)}</a>' for _,anchor,title,_ in DOCUMENTS)
 parts=[f'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>完整研究档案 · Chippytea Lab</title><style>{CSS}</style></head><body><main><header><a href="./">← 理解与全部展示入口</a><h1>Chippytea Lab · 完整研究档案</h1><p>保留源库研究、原创世界设计、日常场景分析、操作说明和分版本验收全文。当前源库快照 f245695，演出基线 v10。</p><p class="status">两首 MiniMax 配乐已生成；月亮与历史纸墨配乐待生成。历史记录不代表当前完整验收。</p></header><nav id="contents">{links}<a href="#music">配乐提示与生成记录</a></nav>']
 for name,anchor,title,status in DOCUMENTS:
  source=PROJECT/name
  text=source.read_text(encoding="utf-8-sig")
  body=Markdown(source,anchor,{p.name for p in records}).render(text)
  current=""
  if anchor=="qa":
   result=PROJECT/"notes/publication-local-checks.json"
   if result.is_file():
    check=json.loads(result.read_text(encoding="utf-8"))
    current='<div class="scope"><h3>2026-10-08 当前发布检查</h3><p>真实 Chromium 检查状态：'+("通过" if check.get("passed") else "修正与复核中")+'。覆盖桌面/手机、实际画面、互动、两首配乐解码与频谱、暂停、存档重载、完整档案、下载及资源清单；不等于人工听感、实机移动端或全部无障碍验收。</p><p><a href="#record-publication-local-checks">本机检查 JSON</a> · <a href="#record-publication-online-checks">62项公网检查</a> · <a href="#record-deployment-summary">正式发布记录</a> · <a href="#music">公开资源与音乐记录</a></p><p>以下完整正文为 2026-10-03 等历史研发记录，当时的 blocked 保留其日期和范围。</p></div>'
  parts.append(f'<section id="{anchor}"><p class="status">{html.escape(status)}</p><h2>{html.escape(title)}</h2>{current}<p><a href="{source_url(source)}">查看原始文档 ↗</a> · <a href="#contents">回到目录 ↑</a></p>{body}</section>')
 parts.append('<section id="music"><h2>配乐提示与真实生成记录</h2><p>保留提示、生成与处理结果。没有新生成调用；原 WAV 和大批中间渲染留在本机，公开演出使用已生成的 MP3。</p>')
 for source in dict.fromkeys([PROJECT/"notes/world-music-briefs.json"]+sorted(records)):
  if not source.is_file():continue
  parts.append(f'<details id="{record_anchor(source)}"><summary>{html.escape(source.name)}</summary><p><a href="{source_url(source)}">原始 JSON ↗</a></p><pre>{html.escape(source.read_text(encoding="utf-8-sig"))}</pre></details>')
 parts.append('<details><summary>引导图生成说明与提示词</summary><pre>'+html.escape((PROJECT/"notes/understanding-map-generation-v1.txt").read_text(encoding="utf-8"))+'</pre></details></section><section id="scope" class="scope"><h2>资料与展示范围</h2><p>当前网页、场景素材、两首播放版音乐、原图与三支离线预览完整公开。研究正文和源码进入 GitHub；历史大批 QA 联系图、完整 WAV、模型中间文件等继续保留在原本机。档案中指向这些未公开素材的链接回到这里。没有下载链接的素材不代表在线可取得。</p><p>公开站不运行本机核验 API、Mac 清理引擎或音乐生成服务。浏览器存储按站点隔离，收益待用户验证。来源与许可见 <a href="./source-notice.html">署名页</a>。</p></section><footer><a href="./">← 返回理解与全部展示</a></footer></main></body></html>')
 result="\n".join(parts)
 # Unpublished image references become explanatory links rather than broken images.
 result=re.sub(r'<img src="#scope" alt="([^"]*)" loading="lazy">',r'<a href="#scope">\1（本机历史素材）</a>',result)
 WEB.mkdir(exist_ok=True)
 (WEB/"research.html").write_text(result,encoding="utf-8",newline="\n")
 print("Built complete Chippytea reader",len(result),"characters.")
if __name__=="__main__":build()
