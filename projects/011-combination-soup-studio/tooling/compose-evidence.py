from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
ROOT = Path(__file__).resolve().parents[1]
QA = ROOT / 'assets' / 'qa'
FONT = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 24)
SMALL = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 17)
BG = '#f3eee6'

def tile(path, size, crop=None):
    im = Image.open(path).convert('RGB')
    if crop: im = im.crop(crop)
    return ImageOps.contain(im, size, Image.Resampling.LANCZOS)

# True browser captures, placed together for assessment; no generated artwork.
out = Image.new('RGB', (1440, 1230), BG)
d = ImageDraw.Draw(out)
d.text((26, 18), '四项效果 · 本地浏览器实拍', fill='#39251a', font=FONT)
cards = [('旋转菜单', QA/'local-menu-1440.png'), ('点云搅汤 · 完整局部构图', QA/'refined-broth-1440.png'), ('可跟踪的外卖盒投送', ROOT/'assets/refined-map-live.png'), ('照片开裂与纸条 · 放大体验', ROOT/'assets/refined-cookie-live.png')]
for i, (title, path) in enumerate(cards):
    x, y = 24+(i%2)*716, 70+(i//2)*576
    d.text((x, y), title, fill='#39251a', font=SMALL)
    im = tile(path, (692, 534));out.paste(im, (x, y+30))
out.save(ROOT/'assets/effects-optimized.png')

compare = Image.new('RGB', (1240, 2390), BG)
cd = ImageDraw.Draw(compare)
cd.text((24, 15), '原站组件 / 本地拆分适配 · 同组截图对照', fill='#39251a', font=FONT)
rows = [
 ('旋转菜单', QA/'source-menu-component.png', (150, 282, 1320, 930), QA/'local-menu-1440.png', (12, 148, 972, 704)),
 ('搅汤完整局部构图', QA/'source-broth-desktop.png', (155, 185, 1275, 880), QA/'refined-broth-1440.png', None),
 ('点阵投送局部构图', QA/'source-delivery-desktop.png', (155, 220, 1275, 835), ROOT/'assets/refined-map-live.png', None),
 ('照片饼干开裂 / 纸条', QA/'source-fortune-open.png', (0, 250, 444, 719), ROOT/'assets/refined-cookie-live.png', (665, 158, 1175, 650)),
]
for i, (title, src, scrop, dst, dcrop) in enumerate(rows):
    y = 68+i*573
    cd.text((24, y), title, fill='#39251a', font=SMALL)
    for x, label, path, crop in [(24, '原站', src, scrop), (640, '本地模块', dst, dcrop)]:
        cd.text((x, y+28), label, fill='#735644', font=SMALL)
        im = tile(path, (576, 490), crop);compare.paste(im, (x+(576-im.width)//2, y+58+(490-im.height)//2))
compare.save(QA/'source-local-comparison.png')
