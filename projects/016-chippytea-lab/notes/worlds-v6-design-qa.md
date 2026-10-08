# 三个原创小世界 · 第二轮完善

2026-10-03。新版为32秒静音演出、四幕各8秒。**构建与共享渲染器离线检查通过；新版完整浏览器验收未完成。** CUA运行时三次启动均被Windows sandbox helper的ACL/setup错误中断，无法获取本轮网页截图与实际操作证据。MiniMax配乐仍未生成。

## 完善内容

1. 引力花园：惊醒接种子的园丁与鼓腮吹风的精灵；星种从旋风、前景掠过转为落地与树苗生长。
2. 月亮修补铺：打嗝表情与奔跑裁缝，追逐会拉长线，漏出的乐句被牵回，补丁沿弧线逐针送达，结尾展示成品。点击结尾仍能触发打嗝。
3. 影子排练场：跃起与鞠躬，第三幕出现镜像搭档，结尾谢幕；保存当前实际动作。
4. 控制：增加分幕按钮，开场大标题收起给表演让空间；保留点按、拖动、键盘、强度、暂停、重演和进度。系统减少动态时冻结时钟，可手动选幕观看静帧。

20张光栅素材中六张为本轮新增动作图。没有手绘SVG/CSS图形替代角色，也没有合成音乐替代MiniMax。

## 本轮证据

离线帧使用网页同一个src/WorldScenes.ts，由@napi-rs/canvas合成；它们不是浏览器截图，不包含网页文字与控件。

- assets/worlds-upgrade-qa/{gravity,moon,shadow}-desktop-four-acts-offline.png：四幕t=2/11/21/29秒，单帧1536×1024。
- 同目录*-mobile-four-acts-offline.png：390×260舞台帧。
- shadow-{desktop,mobile}-high-strength-leap-offline.png：最高强度、左侧灯光与点击跃起叠加。
- 26帧、6张四幕比较条；已打开检查轮廓、紙纹、身份、边界和各幕差异。
- 三个*-32s-offline.mp4：640×426、8fps、256帧、32秒、无音轨，合计约6.6MB。由最终共享渲染器逐帧输出并用FFmpeg导出。
- 源文件与媒体来源SHA256：c082259b57ea6283371dd9c2030882a60d670ec23ee5f84bf37e28348d096f2c。
- 完整媒体、18条行为矩阵与边界记录：assets/worlds-upgrade-qa/offline-render-verification.json。

![影子四幕离线渲染](assets/worlds-upgrade-qa/shadow-desktop-four-acts-offline.png)

## 检查中修复

- 跃起手指碰到上边界：按实际姿态宽高比、跳跃高度限制尺寸并预留上方空间，最高强度桌面与手机主体完整。
- 姿态缓慢交叉淡化造成双脸、双锤：改为明确动作点切换单张画稿，保留很小的弹性变化。
- 花园与修补铺力度未参与新编排：接入风幅度和月亮打嗝幅度。
- 影子开场与谢幕压过点击姿态：点击反应优先于自动剧情。
- 月亮结尾取消互动表情：用户反应优先于收尾。
- 影子收藏可能存错姿态：保存正在渲染的动作枚举，兼容旧记录。
- 月亮按钮写补针但实际触发打嗝：改为“逗月亮打个嗝”。

## 已核对与边界

前端与共享站构建成功，17个项目目录检查通过；新版入口HTTP200，缓存版本worlds6。真实研究回执仍为6份，本轮没有调用入册POST。

18条渲染行为检查：三场力度0/100与左右拖动的像素输出各不相同；月亮31秒点击从笑脸切为打嗝与追逐；影子31秒连续点击三次分别跃起、鞠躬、站姿；明确保存的dancer-leap动作优先于时间推断。抽查帧角色无画幅裁切，前景星种允许进出画幅。强跃起边界桌面[306.8,212.1,732.9,754.4]、手机[79.1,57,188.5,196.2]，为精简标题留出空间。

网页排版、标题遮挡、实际点按/拖动、控制台、localStorage重载与真实触屏仍待复验。源码与离线像素检查不能替代这些证据。减少动态分支已实现，系统偏好实机变化尚未验证。

MiniMax提示已同步32秒，仍为pending、未新请求、无音频文件；真实音频时钟、频谱与音画同步没有通过验收。上一版截图与24秒GIF只代表上一版，记录保存在notes/worlds-v1-design-qa.md、notes/worlds-v1-visual-verification.json。

新增动作的最终提示与透明通道记录：notes/gravity-pose-generation.json、notes/moon-pose-generation.json、notes/shadow-pose-generation.json。均使用内置Image Gen。

final result: partial — offline renderer passed; browser recheck blocked; MiniMax pending.