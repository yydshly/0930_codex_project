# 三个原创小世界 · Design QA

日期：2026-10-03。验收范围为三个选定创意方向的静音互动演示。MiniMax 音乐未生成，完整音乐演出仍 blocked；视觉通过不等于音乐效果通过。

## 比较目标与证据

源视觉：assets/concepts/gravity.png、moon.png、shadow.png，均1487×1058。实际网页：assets/worlds-qa/{gravity,moon,shadow}-desktop.png，1440×1024 CSS/pixels、密度1。源图与实现图分别等比缩放至约720×512，再放进同一输入，已打开三张并排比较图：

- assets/worlds-qa/gravity-comparison.jpg
- assets/worlds-qa/moon-comparison.jpg
- assets/worlds-qa/shadow-comparison.jpg

以概念关键帧和网页最终幕比较，动作由完整浏览器捕获补充。新增导航与独立控制区是分别演示所需的扩展；参考风格、角色关系与舞台，未宣称逐像素复刻。影子标题移到右侧，为角色放大留空间。

细节证据：同目录三个 *-stage-detail.jpg 保留实际主体、纹理、标题区域。已在全尺寸源图、实际图和并排图中检查身份、材质、轮廓、补丁、颜色与中文文字。手机证据为三个 *-mobile.png，390×844 CSS/pixels、密度1；没有手机源图，作为布局与操作检查。

## Findings 与修复历史

- [P2，已修复] 桌面影子变大时挡标题。标题移到右侧，复查第二幕与最终幕；证据 shadow-desktop.png、shadow-comparison.jpg、assets/shadow-world.gif。
- [P2，已修复] 手机影子遮挡副标题。初版 shadow-mobile-before.png；限制移动端尺寸、下移脚点、去掉小眉题后重新捕获 shadow-mobile.png，文字与高潮角色不重叠。
- [P2，已修复] 手机花园飞行角色靠近文字。手机风人单独缩放、下移，标题上移；gravity-mobile.png 为修正后第二幕，文案完整。
- [P2，已修复] 月亮后两幕变化不足。加入三个依次出现的针脚和最终大补丁；moon-desktop.png 与 assets/moon-world.gif 验证变化。
- [功能，已修复] 花园落地时互动浮力被收尾抵消，现独立抬升。影子收藏原先只计数，现保存x/y、时刻、强度并显示最近三个姿势影印。

## 五项视觉检查

- 字体：本机KaiTi/STKaiti标题、衬线正文，中文完整，层级清楚。没有嵌入字体文件；与生成图粗笔题字仍有差异，为P3美化项。
- 布局：舞台占主视觉，导航与控制分开；手机保持图像3:2比例，控件可用，未出现横向溢出。两种尺寸检查角色/标题、字幕、按钮、进度条。
- 色彩：奶油纸、苔绿、琥珀、淡蓝；修补铺靛蓝/木色；剧场炭黑/薰衣草/暖光。活动状态与焦点可见。
- 图片：14个独立Image Gen光栅背景/角色/道具，保留纸纹、水粉、粗墨轮廓；主体完整，实际纸背景上的透明边缘清楚。没有以SVG、CSS/div画图或emoji替代主体。Canvas仅编排现有图片的位移、缩放、旋转、透明度。
- 文案：四幕标签对应动作；收藏明确为本机小世界，与真实回执分开；始终标明静音动画和MiniMax待接入，没有声称真实频谱或已生成音乐。

## 浏览器互动

实测三个场景切换、暂停/继续、重演、进度Home/End/PageUp、点按、方向键、收藏与刷新后的数量保留。实际拖动风向/拉线/灯光，Canvas的pointer/interactions状态有变化。Tabs左右键切换、Canvas方向键和空格可参与。减少动态偏好有静止分支，未模拟系统偏好实机验证。

每场录制63张实际浏览器帧，约24秒，覆盖四幕；记录 notes/worlds-capture-verification.json。GIF为低帧率采样，网页使用requestAnimationFrame。控制台warn/error为空。真实研究回执前后均6份，本轮未调用入册POST。

## Follow-up Polish 与未完成项

P3：加入逐帧表情和局部肢体动画；当前使用独立图层变换。MiniMax配乐、音频时钟/频谱与真实音画同步尚未完成，不属于此次静音验收。三份提示在notes/world-music-briefs.json；旧API失败证据在notes/music-generation.json。未验证商业留存价值或真实触屏设备。

历史纸墨验收保存于notes/folio-design-qa.md与notes/folio-visual-verification.json。

final result: passed