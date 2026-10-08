from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import json
root=Path(__file__).resolve().parents[1];out=root/'web/assets/showcase/previews';out.mkdir(exist_ok=True)
entries=[('afterdark','停电之后 · 2.5D 都市悬疑'),('hunter','灰烬猎手 · 等距暗黑动作'),('station','封闭车站 · 第一人称空间解谜'),('ledger','黑市账本 · 插画卡牌策略'),('order','晶格秩序 · 抽象几何'),('wonder','云端邮路 · 卡通平台'),('range','信号突围 · 第一人称射击'),('expedition','风之遗址 · 第三人称冒险'),('builder','造一座归岛 · 方块建造'),('garden','三日小农场 · 像素经营'),('factory','铜轨工坊 · 工业自动化'),('checkpoint','边境值班室 · 文书抉择')]
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
sheet=Image.new('RGB',(1280,3*208),'#111a24');draw=ImageDraw.Draw(sheet)
for i,(name,label) in enumerate(entries):
    im=Image.open(root/f'assets/showcase/{name}.png').convert('RGB')
    thumb=ImageOps.fit(im,(640,360),Image.Resampling.LANCZOS)
    thumb.save(out/(name+'.webp'),quality=88,method=6)
    x=i%4*320+8;y=i//4*208+8
    sheet.paste(thumb.resize((304,171),Image.Resampling.LANCZOS),(x,y))
    draw.text((x+2,y+179),label,font=font,fill='#e8d7b9')
sheet.save(root/'assets/showcase/overview.png')
print(json.dumps({'previews':len(entries),'source':'Actual local game screenshots, not generated mockups'},ensure_ascii=False))
