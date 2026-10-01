"""Check the research artifacts and the offline reading page; not upstream GUI tests."""
import json
import os
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT/'web'
NOTES = ROOT/'notes'
ASSETS = ROOT/'assets'
SHA = '77e7a3e21469dcbece2558086c8d91657abeaa40'
checks=[]
errors=[]

def check(name, condition, detail=None):
    checks.append({'name':name,'passed':bool(condition),**({'detail':detail} if detail else {})})
    print(('PASS ' if condition else 'FAIL ')+name,flush=True)

class Links(HTMLParser):
    def __init__(self,text):
        super().__init__();self.links=[];self.ids=set();self.feed(text)
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if attrs.get('id'):self.ids.add(attrs['id'])
        for key in ('href','src'):
            if attrs.get(key):self.links.append(attrs[key])

def main():
    inventory=json.loads((NOTES/'upstream-inventory.json').read_text(encoding='utf-8'))
    paths={x['path'] for x in inventory['files']}
    caps=json.loads((NOTES/'capabilities.json').read_text(encoding='utf-8'))
    check('38 项能力且 ID 唯一',len(caps)==38 and len({x['id'] for x in caps})==38)
    check('全部能力来源存在于固定源码树',all(x['source'] in paths for x in caps))
    check('全量源码 2478 文件且 revision 一致',len(paths)==2478 and inventory['revision']==SHA)
    observations=json.loads((NOTES/'verification-results.json').read_text(encoding='utf-8'))
    check('上游行为 34 项观察均有证据',observations['confirmed']==observations['total']==34)
    with sync_playwright() as p:
        candidates=[os.environ.get('HARNESS_RESEARCH_BROWSER',''),r'C:\Program Files\Google\Chrome\Application\chrome.exe',r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']
        exe=next((x for x in candidates if x and Path(x).is_file()),None)
        browser=p.chromium.launch(headless=True,**({'executable_path':exe} if exe else {}))
        browser_version=browser.version
        context=browser.new_context(viewport={'width':1440,'height':1100},reduced_motion='reduce')
        context.route('https://**/*',lambda route:route.abort())
        context.route('http://**/*',lambda route:route.abort())
        page=context.new_page()
        page.on('pageerror',lambda e:errors.append(str(e)))
        url=(WEB/'index.html').as_uri()
        page.goto(url,wait_until='load')
        check('总览能读取核心定位',page.locator('.hero h1').is_visible() and '课程与实践资料' in page.locator('.hero').inner_text())
        ASSETS.mkdir(exist_ok=True)
        page.screenshot(path=str(ASSETS/'overview.png'))
        for section in ['map','overview','capabilities','learning','mechanism','usage','limits','extensions','verification','sources']:
            page.locator(f'[data-nav="{section}"]').click()
            check(section+' 章节导航',page.locator(f'#{section}').is_visible() and page.locator('.page:not([hidden])').count()==1)
            check(section+' 桌面没有页面横向溢出',page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.locator('[data-nav="map"]').click()
        page.locator('#map .capability-map img').wait_for(state='visible')
        page.wait_for_function("document.querySelector('#map .capability-map img').complete")
        check('能力全景图已加载且 PNG/SVG 均可下载',page.locator('#map .capability-map img').evaluate('(img)=>img.naturalWidth >= 2000 && img.naturalHeight >= 1500') and page.locator('.map-actions a[download][href$=".png"]').count()==1 and page.locator('.map-actions a[download][href$=".svg"]').count()==1)
        page.screenshot(path=str(ASSETS/'map-in-reading-page.png'))
        page.locator('[data-nav="capabilities"]').click()
        check('显示 38 个能力卡片',page.locator('.cap-card:not([hidden])').count()==38)
        page.locator('#cap-search').fill('评分')
        check('能力关键词搜索',0<page.locator('.cap-card:not([hidden])').count()<38)
        score=page.locator('.cap-card').filter(has=page.locator('.cap-title',has_text='五维结构评分'))
        score.locator('summary').click()
        check('展开能力可看到输入产物与边界',score.locator('dl').is_visible() and '不运行目标测试' in score.inner_text())
        page.screenshot(path=str(ASSETS/'capabilities.png'))
        page.locator('#cap-search').fill('unmatched_research_987654')
        check('搜索空态',page.locator('#empty-state').is_visible() and page.locator('.cap-card:not([hidden])').count()==0)
        page.locator('#reset-filters').click()
        page.locator('#cap-category').select_option(label='脚本')
        check('类别筛选',all(x=='脚本' for x in page.locator('.cap-card:not([hidden])').evaluate_all('(es)=>es.map(e=>e.dataset.category)')))
        page.locator('#cap-status').select_option(label='已实测')
        check('类别和程度交叉筛选',0<page.locator('.cap-card:not([hidden])').count()<38 and all(x=='已实测' for x in page.locator('.cap-card:not([hidden])').evaluate_all('(es)=>es.map(e=>e.dataset.status)')))
        page.locator('#reset-filters').click()
        check('筛选重置恢复全部能力',page.locator('.cap-card:not([hidden])').count()==38)
        first=page.locator('.cap-card summary').first
        first.focus();page.keyboard.press('Enter')
        check('键盘可以展开能力',page.locator('.cap-card').first.get_attribute('open') is not None)
        page.reload(wait_until='load')
        check('刷新保留章节深链接',page.locator('#capabilities').is_visible())
        page.evaluate("window.dispatchEvent(new Event('beforeprint'))")
        page.emulate_media(media='print')
        check('打印模式包含全部章节及展开内容',all(page.locator('#'+sid).is_visible() for sid in ['overview','capabilities','limits','verification']) and page.locator('.cap-card[open]').count()==38)
        page.emulate_media(media='screen')
        page.evaluate("window.dispatchEvent(new Event('afterprint'))")
        page.set_viewport_size({'width':390,'height':844})
        for section in ['map','overview','capabilities','learning','mechanism','usage','limits','extensions','verification','sources']:
            page.goto(url+'#'+section,wait_until='load')
            page.wait_for_function('(id)=>!document.getElementById(id).hidden',arg=section)
            check(section+' 手机宽度没有页面横向溢出',page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.goto(url+'#overview',wait_until='load')
        page.screenshot(path=str(ASSETS/'mobile.png'))
        page.goto((WEB/'sources.html').as_uri(),wait_until='load')
        check('完整源码表含 2478 行',page.locator('tbody tr').count()==2478)
        page.locator('#source-search').fill('skills/harness-creator/scripts/')
        check('源码路径搜索命中 5 个文件',page.locator('tbody tr:not([hidden])').count()==5)
        page.locator('#source-search').fill('unmatched_research_987654')
        check('源码搜索空结果计数',page.locator('tbody tr:not([hidden])').count()==0 and page.locator('#source-count').inner_text().startswith('0'))
        browser.close()
    check('浏览器无 JavaScript 异常',not errors,errors or None)

    broken=[];bad_sources=[]
    for file in list(NOTES.glob('*.md'))+[ROOT/'README.md']:
        content=file.read_text(encoding='utf-8')
        for target in re.findall(r'\]\(([^)]+)\)',content):
            parsed=urlsplit(target)
            if parsed.scheme:continue
            if parsed.path and not (file.parent/unquote(parsed.path)).exists():broken.append(f'{file.name}: {target}')
        for p in re.findall(r'https://github.com/walkinglabs/learn-harness-engineering/blob/'+SHA+r'/([^\s)"<>]+)',content):
            if unquote(p.split('#')[0]) not in paths:bad_sources.append(p)
    html_cache={file:Links(file.read_text(encoding='utf-8')) for file in WEB.glob('*.html')}
    for file,parsed in html_cache.items():
        for target in parsed.links:
            urlparts=urlsplit(target)
            if urlparts.scheme:continue
            destination=(file.parent/unquote(urlparts.path)).resolve() if urlparts.path else file
            if not destination.exists():broken.append(f'{file.name}: {target}')
            elif urlparts.fragment and destination.suffix=='.html':
                target_parser=html_cache.get(destination) or Links(destination.read_text(encoding='utf-8'))
                if unquote(urlparts.fragment) not in target_parser.ids:broken.append(f'{file.name}: {target} (missing anchor)')
    check('文档与网页的本地链接/HTML 锚点存在',not broken,broken or None)
    check('Markdown 固定版本来源路径存在',not bad_sources,bad_sources or None)
    report={'generated_at':datetime.now(timezone.utc).isoformat(),'scope':'原创本地研究文档和阅读网页；非上游应用测试','browser':browser_version,'checks':checks,'errors':errors,'passed':sum(x['passed'] for x in checks),'total':len(checks)}
    (NOTES/'reading-page-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f"Passed {report['passed']}/{report['total']} checks")
    return 0 if report['passed']==report['total'] else 1

if __name__=='__main__':
    raise SystemExit(main())
