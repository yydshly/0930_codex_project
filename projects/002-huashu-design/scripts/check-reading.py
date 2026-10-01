"""Focused verification for understanding navigation and read-only document viewers."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from urllib.parse import urlsplit,unquote
from html.parser import HTMLParser
import json,hashlib,datetime
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1];web=root/'web';case=web/'cases/research-desk';build=root/'build/reading';build.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(web)));Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
checks=[];errors=[]
def check(name,ok):
    checks.append({'name':name,'passed':bool(ok)});assert ok,name
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe')
    page=b.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
    for mode in ['pdf','pptx']:
        page.goto(base+f'/cases/research-desk/reader.html?format={mode}');page.locator('#page-image').wait_for()
        check(mode+' 首页边界',page.locator('#previous').is_disabled())
        for n in range(1,7):
            page.locator('#page-select').select_option(str(n-1));page.wait_for_function('document.querySelector("#page-image").complete && document.querySelector("#page-image").naturalWidth > 0')
            check(mode+' 第 '+str(n)+' 页实际图像加载',page.locator('#page-image').get_attribute('src')==f'assets/{mode}-{n}.png')
        check(mode+' 尾页边界',page.locator('#next').is_disabled())
        page.locator('#canvas').focus();page.keyboard.press('Home');check(mode+' 键盘首页','page=1' in page.url)
        page.keyboard.press('ArrowRight');check(mode+' 键盘下一页','page=2' in page.url)
        page.reload();check(mode+' 刷新保留页码',page.locator('#page-select').input_value()=='1')
        page.locator('[data-page="3"]').click();check(mode+' 缩略图翻页','page=4' in page.url)
        page.locator('#zoom').click();check(mode+' 放大不造成整页溢出',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        page.locator('#zoom').click();page.screenshot(path=str(build/f'reader-{mode}.png'))
        check(mode+' 原文件入口',page.locator('#download').get_attribute('href')==f'downloads/research-desk.{mode}')
    page.locator('#pdf-mode').click();check('切换格式保留当前页','format=pdf&page=4' in page.url)
    page.goto(base+'/cases/research-desk/reader.html?format=bad&page=999');check('异常参数安全降级',page.locator('#next').is_disabled() and 'PDF' in page.locator('h1').inner_text())
    page.set_viewport_size({'width':390,'height':844});page.goto(base+'/cases/research-desk/reader.html?format=pptx')
    check('手机阅读器无横向溢出',page.evaluate('document.documentElement.scrollWidth<=innerWidth'));page.screenshot(path=str(build/'reader-mobile.png'),full_page=True)
    page.goto(base+'/cases/research-desk/index.html#understanding')
    check('六种交付完成度对照',page.locator('.matrix-scroll tbody tr').count()==6)
    for value in ['prototype','present','pdf','pptx','video','product']:
        page.locator('#goal-select').select_option(value);check('用途选择 '+value,bool(page.locator('#goal-result a').get_attribute('href')))
    for mode in ['pdf','pptx']:
        page.locator(f'[data-preview={mode}]').click();frame=page.frame_locator('#live-preview');check('内嵌 '+mode+' 阅读可用',mode.upper() in frame.locator('h1').inner_text())
    check('手机理解页无横向溢出',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.set_viewport_size({'width':1440,'height':1000});page.goto(base+'/cases/research-desk/index.html#understanding');page.screenshot(path=str(build/'understanding.png'))
    page.goto(base+'/index.html#capabilities');page.locator('[data-cap="pptx"]').click();check('能力详情可直达实测文件','reader.html?format=pptx' in page.locator('#detail-content .notice a').get_attribute('href'))
    page.goto(base+'/reference.html#understanding');check('理解笔记进入完整手册',page.locator('#understanding').is_visible())
    check('页面无 JavaScript 错误',not errors);b.close()
server.shutdown()
class Links(HTMLParser):
    def handle_starttag(self,tag,attrs):
        for k,v in attrs:
            if k in ['href','src','poster'] and v:
                u=urlsplit(v)
                if not u.scheme and u.path:self.links.append(unquote(u.path))
missing=[]
for f in case.glob('*.html'):
    parser=Links();parser.links=[];parser.feed(f.read_text(encoding='utf-8'))
    missing.extend((f.name,l) for l in parser.links if not (f.parent/l).resolve().is_file())
check('所有场景页面本地链接有效',not missing)
original=json.loads((case/'validation.json').read_text(encoding='utf-8'))
check('原 PDF/PPTX/MP4 内容未改变',all(hashlib.sha256((case/a['file']).read_bytes()).hexdigest()==a['sha256'] for a in original['artifacts']))
report={'date':datetime.datetime.now().astimezone().isoformat(),'scope':'理解整理与网页阅读器增量检查；不重新宣称上游导出或文档内容发生变化','checks':checks,'errors':errors}
(root/'notes/reading-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'passed':len(checks),'total':len(checks),'errors':errors},ensure_ascii=False))
