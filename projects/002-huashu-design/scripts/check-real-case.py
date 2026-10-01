"""Exercise real user paths and verify the delivered PDF/PPTX/MP4 artifacts."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from zipfile import ZipFile
from xml.etree import ElementTree as ET
from urllib.parse import urlparse, unquote
import json, hashlib, subprocess, datetime
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'
CASE=WEB/'cases/research-desk'
BUILD=ROOT/'build/case'
checks=[]
def check(name,condition):
    checks.append({'name':name,'passed':bool(condition)})
    assert condition,name
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(WEB)))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/cases/research-desk/'
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe')
    browser_version=browser.version
    context=browser.new_context(viewport={'width':1280,'height':900},accept_downloads=True)
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+'prototype.html')
    check('原型展示两个真实项目',page.locator('.project').count()==2)
    page.locator('#query').fill('设计');check('按真实用途搜索',page.locator('.project').count()==1)
    page.locator('#category').select_option('ops');check('组合筛选空态',page.locator('.empty').is_visible())
    page.locator('#category').select_option('all');page.locator('.project').click()
    check('进入项目详情',page.locator('#detail').is_visible())
    page.locator('[data-tab=evidence]').click();check('四条固定版本源码证据',page.locator('.evidence-row a').count()==4)
    page.locator('[data-tab=limits]').click();check('使用边界内容可见','持久化服务' in page.locator('#detail-content').inner_text())
    page.locator('#save-project').click();page.reload();check('收藏刷新持久化','已收藏' in page.locator('#save-project').inner_text())
    page.locator('a[href="#decision"]').first.click()
    reason='试用：用真实研究材料制作汇报，验证中文排版与 PPT 编辑。'
    page.locator('#reason').fill(reason);page.get_by_role('button',name='保存判断',exact=True).click();page.reload()
    check('判断刷新持久化',page.locator('#reason').input_value()==reason)
    with page.expect_download() as info:page.locator('#download-note').click()
    download=info.value;download.save_as(str(BUILD/'decision-download.md'))
    check('下载的 Markdown 包含用户输入',reason in (BUILD/'decision-download.md').read_text(encoding='utf-8'))
    page.goto(base+'prototype.html#compare');check('用途对照完整',page.locator('.comparison-row').count()==6)
    page.set_viewport_size({'width':390,'height':844})
    for route in ['library','detail','compare','decision','witr']:
        page.goto(base+'prototype.html#'+route)
        check('手机原型无整页横向溢出：'+route,page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    page.goto(base+'mobile.html');page.wait_for_function('document.querySelector("iframe")!==null')
    frame=page.frame_locator('iframe');frame.locator('.project').first.click()
    check('上游 IosFrame 内部可操作',frame.locator('#detail').is_visible())
    check('手机设备框无横向溢出',page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    page.set_viewport_size({'width':1280,'height':800});page.goto(base+'deck.html#slide-1')
    page.wait_for_function('document.querySelector("deck-stage")._slides.length===6')
    check('真实 deck-stage 六页',page.locator('deck-stage section').count()==6)
    page.keyboard.press('ArrowRight');check('方向键翻页',page.evaluate('document.querySelector("deck-stage").currentSlide')==1)
    page.keyboard.press('End');check('End 跳末页',page.evaluate('document.querySelector("deck-stage").currentSlide')==5)
    page.keyboard.press('Home');check('Home 跳首页',page.evaluate('document.querySelector("deck-stage").currentSlide')==0)
    page.goto(base+'animation.html');page.wait_for_function('window.__ready === true')
    page.get_by_role('button',name='暂停').click();t1=page.locator('[data-time]').get_attribute('data-time');page.wait_for_timeout(150)
    check('Stage 暂停停止时间推进',page.locator('[data-time]').get_attribute('data-time')==t1)
    page.get_by_role('button',name='播放').click();page.wait_for_timeout(150)
    check('Stage 播放推进',float(page.locator('[data-time]').get_attribute('data-time'))>float(t1))
    seek_context=browser.new_context(viewport={'width':1280,'height':720})
    seek_context.add_init_script('window.__seekRender=true; window.__recording=true;')
    seek=seek_context.new_page();seek.on('pageerror',lambda e:errors.append(str(e)));seek.goto(base+'animation.html');seek.wait_for_function('typeof window.__seek === "function"')
    for t in [0,1,6,11,18,19.9]:
        seek.evaluate('(t)=>window.__seek(t)',t);seek.wait_for_function('(t)=>Math.abs(Number(document.querySelector("[data-time]").dataset.time)-t)<.01',arg=t)
        check('真实 Stage seek 时间 '+str(t),abs(float(seek.locator('[data-time]').get_attribute('data-time'))-t)<.01)
        seek.screenshot(path=str(BUILD/f'seek-{t}.png'))
    seek.evaluate('window.__seek(6)');seek.wait_for_timeout(100);one=seek.locator('.scene').screenshot()
    seek.evaluate('window.__seek(11)');seek.wait_for_timeout(80);seek.evaluate('window.__seek(6)');seek.wait_for_timeout(100);two=seek.locator('.scene').screenshot()
    check('同一时间重返画面一致',one==two)
    for size in [(1440,1000),(390,844)]:
        page.set_viewport_size({'width':size[0],'height':size[1]});page.goto(base+'index.html')
        check('展厅无横向溢出 '+str(size[0]),page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.screenshot(path=str(CASE/'assets'/f'showcase-{size[0]}.png'),full_page=size[0]==390)
    for name in ['deck','mobile','animation','prototype']:
        page.locator(f'[data-preview={name}]').click()
        check('展厅真实预览切换：'+name,page.locator('#live-preview').get_attribute('src')==name+'.html')
    page.locator('video').evaluate('(v)=>v.load()');page.wait_for_function('document.querySelector("video").readyState>=1')
    check('浏览器识别成片时长',abs(page.locator('video').evaluate('(v)=>v.duration')-20)<.1)
    page.locator('video').evaluate('(v)=>{v.muted=true;return v.play()}');page.wait_for_timeout(500)
    check('MP4 实际可以播放',page.locator('video').evaluate('(v)=>v.currentTime>0 && !v.error'))
    links=page.locator('a[href]').evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("href"))')
    for link in sorted(set(links)):
        u=urlparse(link)
        if not u.scheme and u.path and u.path!='validation.json':
            target=(CASE/unquote(u.path)).resolve();check('展厅链接目标存在：'+u.path,target.is_file())
    check('所有浏览器流程无 JavaScript 异常',not errors)
    browser.close()
server.shutdown()

pdf=PdfReader(str(CASE/'downloads/research-desk.pdf'))
check('PDF 完整六页',len(pdf.pages)==6)
for i,title in enumerate(['研选','研究过程中','项目库','证据页','采用判断','首轮试用范围']):
    check('PDF 第 '+str(i+1)+' 页中文可提取',title in pdf.pages[i].extract_text())
    check('PDF 第 '+str(i+1)+' 页 16:9',abs(float(pdf.pages[i].mediabox.width)/float(pdf.pages[i].mediabox.height)-16/9)<.01)
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with ZipFile(CASE/'downloads/research-desk.pptx') as z:
    slides=[n for n in z.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')]
    notes=[n for n in z.namelist() if n.startswith('ppt/notesSlides/notesSlide') and n.endswith('.xml')]
    native_counts=[sum(1 for s in ET.fromstring(z.read(n)).findall('.//p:sp',ns) if s.find('.//a:t',ns) is not None) for n in sorted(slides)]
    check('PPTX 完整六页',len(slides)==6)
    check('每页有原生可编辑文本',all(n>=5 for n in native_counts))
    check('PPTX 六页讲者备注',len(notes)==6)
    check('备注中包含来源',any(b'github.com' in z.read(n) for n in notes))
    check('所有内容类型声明都有目标',all(e.get('PartName','').lstrip('/') in z.namelist() for e in ET.fromstring(z.read('[Content_Types].xml')) if e.tag.endswith('Override')))
    raw=ZipFile(BUILD/'raw-upstream-export.pptx')
    check('PPT 修复未改变任何页面内容',all(z.read(n)==raw.read(n) for n in slides+notes));raw.close()
receipt=json.loads((BUILD/'pptx.validation.json').read_text(encoding='utf-8'))
check('PPT 结构与几何检查通过',receipt['packageIntegrity']['status']=='pass' and receipt['presentationLayout']['findingCount']==0)
check('PPT 独立导入验证通过',receipt['firstPartyImport']['passed'])
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(CASE/'downloads/research-desk.mp4')],encoding='utf-8'))
video=next(s for s in probe['streams'] if s['codec_type']=='video')
check('MP4 H.264 / 1280×720',video['codec_name']=='h264' and video['width']==1280 and video['height']==720)
check('MP4 30 fps / 600 帧 / 20 秒',video['r_frame_rate']=='30/1' and video['nb_frames']=='600' and abs(float(probe['format']['duration'])-20)<.01)
check('无音轨说明与文件一致',not any(s['codec_type']=='audio' for s in probe['streams']))
decode=subprocess.run(['ffmpeg','-v','error','-i',str(CASE/'downloads/research-desk.mp4'),'-f','null','-'],capture_output=True)
check('完整视频解码无错误',decode.returncode==0 and not decode.stderr)
black=subprocess.run(['ffmpeg','-hide_banner','-i',str(CASE/'downloads/research-desk.mp4'),'-vf','blackdetect=d=0.1:pix_th=0.10','-an','-f','null','-'],capture_output=True)
check('未发现超过 0.1 秒黑屏',b'black_start:' not in black.stderr)
artifacts=[]
for f in sorted((CASE/'downloads').glob('*')):
    artifacts.append({'file':str(f.relative_to(CASE)).replace('\\','/'),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
report={'date':datetime.datetime.now().astimezone().isoformat(),'upstream_commit':'0830494ecb1c117e25b313a8114fe55a6bf2b125','scope':'原创研选场景，真实复用指定上游组件及经显式适配的 PDF/PPTX/MP4 导出脚本；非完整 Skill 或全部后端验收','browser':browser_version,'checks':checks,'errors':errors,'pptx_native_text_objects_per_slide':native_counts,'pdf_pages':6,'mp4':{'width':1280,'height':720,'fps':30,'frames':600,'duration':20,'audio':False},'artifacts':artifacts,'visual_review':'PDF 与重新导入的 PPTX 六页逐页检查；视频四段关键帧检查。未在 Microsoft PowerPoint 实机检查。','package_normalization':json.loads((BUILD/'package-normalization.json').read_text(encoding='utf-8'))}
for target in [ROOT/'notes/real-case-checks.json',CASE/'validation.json']:
    target.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'passed':len(checks),'total':len(checks),'native_text_objects':native_counts,'artifacts':artifacts},ensure_ascii=False,indent=2))
