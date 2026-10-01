"""Capture real prototype screens for slides and animation, without remote assets."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
web=Path(__file__).resolve().parents[1]/'web/cases/research-desk'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.getenv('HUASHU_CHROME','C:/Program Files/Google/Chrome/Application/chrome.exe'))
    page=b.new_page(viewport={'width':1280,'height':800},device_scale_factor=1)
    for route in ['library','detail','decision']:
        page.goto((web/'prototype.html').as_uri()+'#'+route)
        if route=='decision':page.locator('#reason').fill('先用真实研究材料制作一份汇报，检查中文排版、PPT 编辑体验与视频交付质量。')
        page.screenshot(path=str(web/'assets'/f'prototype-{route}.png'))
    b.close()
