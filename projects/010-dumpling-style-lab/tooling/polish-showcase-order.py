from pathlib import Path
file=Path(__file__).resolve().parents[1]/'web/showcase-2d.js'
text=file.read_text(encoding='utf-8')
old='matrix:SHAPES[0],over:false}'
assert old in text
text=text.replace(old,'matrix:SHAPES[0],over:false,bag:sevenBag().filter(t=>t!==0&&t!==2)}',1)
text=text.replace('s.next=Math.floor(Math.random()*7);',"if(!s.bag.length)s.bag=sevenBag();s.next=s.bag.pop();",1)
text=text.replace('半透明晶格是当前落点预览。速度会随消行增加。','半透明晶格是落点预览。每组七种形状都会出现一次，速度随消行增加。',1)
file.write_text(text,encoding='utf-8')
file=Path(__file__).resolve().parents[1]/'web/showcase-catalog.js'
text=file.read_text(encoding='utf-8')
text=text.replace('三段连续场景，电池、闸门、巡逻探照灯与两种结局。','三段连续场景、专用道具美术、巡逻锁定预兆、货箱藏身与两种结局。')
text=text.replace('A/D 或左右移动 · 空格跳跃 · E 互动','A/D 或左右移动 · S 蹲下藏身 · 空格跳跃 · E 互动',1)
text=text.replace('三波敌人、三种普通敌人、统领战和每波后的能力选择。','三波十二名守卫、破盾、远程锁定、闪避残影、统领两阶段与能力选择。')
text=text.replace('三间相连实验室，光束转向、搬运电池、信号排序与终点。','三间相连车站机房，光束转向、持物搬运、设备碰撞、信号排序与终点。')
text=text.replace('五轮递增目标，货物/路线/支援组合、弃牌、三选一升级。','五轮委托、货物/路线/支援组合、三条成长路线、进度与交易回顾。')
text=text.replace('可行走的立体地形、角色骨骼动画、三枚灯石、跳跃与归航门。','岩岸、营地、林木与遗址高台，骨骼动画、地图、三枚灯石与营地检查点。')
text=text.replace('体素建造沙盒','立体搭建与修复')
text=text.replace('真实方块拆建、材料库存、可通行桥梁与灯塔修复目标。','网格木桥搭建与回收、连续通路判断、材料库存、地图与灯塔修复。')
text=text.replace('七种方块、旋转与碰撞、落点预览、消行、加速与当前得分。','七种方块按组轮换、旋转与碰撞、落点预览、消行、加速与当前得分。')
file.write_text(text,encoding='utf-8')
