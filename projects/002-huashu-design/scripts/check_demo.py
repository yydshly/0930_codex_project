"""Render three licensed upstream samples and verify the research site's interactions.

Run from any directory: python projects/002-huashu-design/scripts/check_demo.py
Requires Python Playwright and a Chromium browser; no model/API/network calls.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'
ASSETS = ROOT / 'assets'
ASSETS.mkdir(exist_ok=True)
(WEB / 'images').mkdir(exist_ok=True)
report = {'scope': '本地研究展示与三个上游预制封面；非上游完整生成/导出验收', 'checks': [], 'errors': []}

def check(name, condition):
    report['checks'].append({'name': name, 'passed': bool(condition)})
    if not condition:
        raise AssertionError(name)

def main():
    with sync_playwright() as p:
        candidates = [os.getenv('HUASHU_BROWSER', ''), r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe']
        exe = next((x for x in candidates if x and Path(x).is_file()), None)
        browser = p.chromium.launch(headless=True, **({'executable_path': exe} if exe else {}))
        report['browser'] = browser.version
        report['font_mode'] = '离线字体回退；外部请求均阻止'
        context = browser.new_context(viewport={'width': 1440, 'height': 1100}, reduced_motion='reduce')
        context.route('https://**/*', lambda route: route.abort())
        context.route('http://**/*', lambda route: route.abort())
        page = context.new_page()
        for style in ['pentagram', 'build', 'takram']:
            page.set_viewport_size({'width': 1200, 'height': 510})
            page.goto((WEB / 'upstream' / f'cover-{style}.html').as_uri(), wait_until='load')
            page.screenshot(path=str(WEB / 'images' / f'cover-{style}.png'))
            check(f'上游 {style} HTML 可渲染', bool(page.locator('body').inner_text().strip()))
        page.on('pageerror', lambda error: report['errors'].append(str(error)))
        page.set_viewport_size({'width': 1440, 'height': 1100})
        url = (WEB / 'index.html').as_uri()
        page.goto(url, wait_until='load')
        check('概览有真实内容', page.locator('#overview h1').is_visible())
        page.screenshot(path=str(ASSETS / 'overview.png'))
        for name in ['overview','capabilities','lab','gallery','architecture','exports','extensions','boundaries','sources']:
            page.locator(f'nav a[href="#{name}"]').click()
            check(f'{name} 导航与章节', page.locator(f'#{name}').is_visible())
            check(f'{name} 桌面无页面溢出', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.locator('nav a[href="#capabilities"]').click()
        check('16 项能力', page.locator('[data-cap]').count() == 16)
        page.locator('#cap-search').fill('母版')
        check('能力搜索命中', 0 < page.locator('[data-cap]').count() < 16)
        page.locator('#cap-search').fill('unmatched_keyword_xyz')
        check('搜索空态', page.locator('#cap-grid .empty').is_visible())
        page.locator('#cap-search').fill('')
        page.locator('[data-cap="pptx"]').click()
        check('详情对话框', page.locator('#detail-dialog').is_visible())
        page.keyboard.press('Escape')
        check('Esc 关闭详情', not page.locator('#detail-dialog').is_visible())
        page.locator('nav a[href="#lab"]').click()
        page.locator('[data-book="0"]').click()
        page.locator('#save-book').click()
        page.locator('[data-screen="saved"]').click()
        check('原型收藏状态', page.locator('[data-book]').count() == 1)
        page.locator('[data-tab="slides"]').click()
        check('第一页不能向前', page.locator('#slide-prev').is_disabled())
        page.locator('#slide-next').click()
        check('幻灯片翻页', page.locator('#slide-count').inner_text() == '2 / 3')
        page.locator('#slide-surface').focus()
        page.keyboard.press('ArrowRight')
        check('键盘翻页与尾页边界', page.locator('#slide-count').inner_text() == '3 / 3' and page.locator('#slide-next').is_disabled())
        page.locator('[data-tab="motion"]').click()
        page.locator('#motion-range').fill('3')
        page.locator('#motion-range').dispatch_event('input')
        check('时间轴可定位', '3.00' in page.locator('#motion-time').inner_text())
        page.locator('#motion-play').click()
        page.wait_for_timeout(160)
        page.locator('#motion-play').click()
        check('播放推进时间', float(page.locator('#motion-range').input_value()) > 3)
        page.locator('#motion-reset').click()
        check('时间轴归零', page.locator('#motion-range').input_value() == '0')
        page.locator('[data-tab="tweaks"]').click()
        page.locator('#tweak-density').select_option('compact')
        page.locator('#tweak-size').fill('30')
        page.locator('#tweak-size').dispatch_event('input')
        page.reload(wait_until='load')
        page.locator('[data-tab="tweaks"]').click()
        check('调参刷新持久化', page.locator('#tweak-size').input_value() == '30' and page.locator('#tweak-density').input_value() == 'compact')
        page.locator('#tweak-reset').click()
        check('调参可重置', page.locator('#tweak-size').input_value() == '24')
        page.locator('[data-tab="infographic"]').click()
        page.locator('#data-0').fill('0')
        check('零值图形长度正确', page.locator('.bar-fill').first.evaluate('el => el.getBoundingClientRect().width') == 0)
        page.locator('[data-tab="review"]').click()
        for i in range(1,6):
            page.locator(f'#score-{i}').fill('10')
        page.locator('#score-0').fill('5')
        check('概念不足总评封顶', page.locator('#review-score').inner_text() == '6.0 / 10')
        page.locator('#score-0').fill('8')
        check('概念通过解除封顶', page.locator('#review-score').inner_text() == '10.0 / 10')
        page.locator('[data-tab="motion"]').click()
        page.locator('#motion-range').fill('3')
        page.locator('#motion-range').dispatch_event('input')
        page.screenshot(path=str(ASSETS / 'interactive-lab.png'))
        page.locator('nav a[href="#gallery"]').click()
        check('60 项风格索引', page.locator('.style-row').count() == 60)
        page.locator('#style-filter').select_option('PPT')
        check('按媒介筛选风格', page.locator('.style-row').count() == 20)
        check('三张上游截图加载', page.locator('#upstream-gallery img').evaluate_all('imgs => imgs.every(i=>i.complete && i.naturalWidth > 0)'))
        page.screenshot(path=str(ASSETS / 'gallery.png'))
        page.locator('nav a[href="#exports"]').click()
        page.locator('#route-select').select_option('template')
        check('导出路线选择', 'python-pptx' in page.locator('#route-result').inner_text())
        page.locator('nav a[href="#sources"]').click()
        page.locator('#source-filter').select_option('scripts/')
        check('脚本索引数量', page.locator('.source-row').count() == 20)
        page.set_viewport_size({'width': 390, 'height': 844})
        for name in ['overview','capabilities','lab','gallery','architecture','exports','extensions','boundaries','sources']:
            page.goto(url+'#'+name, wait_until='load')
            check(f'{name} 手机无页面溢出', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        for lab in ['prototype','slides','motion','tweaks','infographic','review']:
            page.goto(url+'#lab', wait_until='load')
            page.locator(f'[data-tab="{lab}"]').click()
            check(f'{lab} 手机实验无页面溢出', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.goto(url+'#overview', wait_until='load')
        page.screenshot(path=str(ASSETS / 'mobile.png'), full_page=True)
        page.set_viewport_size({'width': 1440, 'height': 1100})
        page.evaluate('document.documentElement.style.fontSize="200%"')
        check('200% 基准字体无页面溢出', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        check('无页面 JavaScript 异常', not report['errors'])
        browser.close()

try:
    main()
except Exception as exc:
    report['failure'] = str(exc)
    raise
finally:
    (ROOT / 'notes' / 'demo-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'passed': sum(c['passed'] for c in report['checks']), 'total': len(report['checks']), 'errors': report['errors'], 'failure': report.get('failure')}, ensure_ascii=False))
