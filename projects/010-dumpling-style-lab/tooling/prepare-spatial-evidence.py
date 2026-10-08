"""Arrange actual browser screenshots; no replacement or generated scene pixels."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PROJECT = Path(__file__).resolve().parents[1]
ASSETS = PROJECT / "assets" / "spatial-worlds"
REPORT = json.loads((PROJECT / "notes" / "spatial-worlds-check.json").read_text(encoding="utf-8"))
RECTS = {row["name"]: row for row in REPORT["screenshots"]}
FONT = "C:/Windows/Fonts/msyh.ttc"
canvas = Image.new("RGB", (1304, 746), "#192932")
draw = ImageDraw.Draw(canvas)
draw.text((22, 16), "三维世界 · 三种可试玩方向", font=ImageFont.truetype(FONT, 26), fill="#eee2c7")
draw.text((22, 57), "温室与旅店 · 实体模型、可转动镜头、实际游戏状态 · 浏览器运行截图", font=ImageFont.truetype(FONT, 14), fill="#aabfbe")


def scene(name):
    source = Image.open(ASSETS / f"{name}.png").convert("RGB")
    r = RECTS[name]
    sx, sy = source.width / r["viewWidth"], source.height / r["viewHeight"]
    image = source.crop((round(r["x"] * sx), round(r["y"] * sy),
                         round((r["x"] + r["width"]) * sx),
                         round((r["y"] + r["height"]) * sy)))
    return image.resize((412, 258), Image.Resampling.LANCZOS)


for col, (mode, label) in enumerate([
    ("diorama", "微缩场景 · 实体模型与柔光"),
    ("voxel", "体素世界 · 立方体建筑与角色"),
    ("cinematic", "电影光影 · 夜色与冷暖侧光"),
]):
    x = 22 + col * 424
    draw.text((x, 97), label, font=ImageFont.truetype(FONT, 17), fill="#e5c899")
    for row, (game, title) in enumerate([("wasteland", "最后一座温室"), ("inn", "七日小旅店")]):
        y = 132 + row * 294
        draw.text((x, y), title, font=ImageFont.truetype(FONT, 14), fill="#b6ceca")
        canvas.paste(scene(f"{game}-{mode}-clean"), (x, y + 24))
draw.text((22, 721), "关闭场景标记可观察完整画面；打开标记或点击立体物件可继续互动。", font=ImageFont.truetype(FONT, 13), fill="#aabfbe")
canvas.save(ASSETS / "overview.webp", quality=93)
print("Prepared six actual 3D scene screenshots.")
