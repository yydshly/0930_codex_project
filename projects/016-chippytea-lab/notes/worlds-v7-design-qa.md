# 三个原创小世界 · v7 伙伴与环境

2026-10-03。本轮继续完善已有三个世界，32秒四幕不变。实现与共享渲染器检查通过，完整浏览器设计验收blocked：CUA内核再次因Windows sandbox helper setup refresh错误启动失败，无法取得新版网页截图和实际控制证据。MiniMax仍无生成音频。

## 改动与修复

1. 花园：风精灵先吹乱星种，园丁稍后接住；接种轨迹改到木锤位置。收尾野花生长，风精灵放下笛子坐下休息。
2. 月亮：打嗝表情保持足够时间，裁缝随后追逐；线连接两位角色的位置，完成后裁缝站直展示补丁，铺子暖灯和成品布展开。
3. 影子：小光团稍后举灯回应舞者，光束围绕灯球定位，剧场收尾出现暖场脚灯。数量对应最多五位小观众，最近三个保存动作准确回显，其余为通用鞠躬剪影。
4. 页面：每场八句双角色对白，标题平滑退场。对白避开影子动作区域；手机影子对白移至右上，left79%、width38%。素材加载/透明边界扫描缓存；失败项移除缓存可重试。拖动进度会暂停，分幕/重演仍播放；后台恢复重置计时，减少动态模式静止。

本轮增加三张伙伴动作与三张同构图收尾环境，素材共26PNG。新素材均内置Image Gen生成并保存在web/worlds；最终提示与alpha/视觉记录在notes/partner-pose-generation-v7.json和notes/environment-generation-v7.json。

## 比较与证据

比较源为上一版v6同一时刻的离线舞台帧assets/worlds-upgrade-qa/*-desktop-act-4-offline.png；新版为assets/worlds-v7-qa对应帧。双方同t29秒、count1、strength50、pointer(.64,.5)，1536×1024。等比归一到768×512，各置同一1536×512比较输入：*-v6-v7-offline-comparison.jpg，左v6/右v7。三个比较图均已打开，舞台构图、角色身份与纸纹保持，伙伴姿态和环境收尾有清楚变化。

![影子同刻新旧离线比较](assets/worlds-v7-qa/shadow-v6-v7-offline-comparison.jpg)

这些是网页共享WorldScenes.ts的真实光栅合成输出，不是浏览器截图，不包含DOM标题、对白和控件。补充证据：

- 44场景帧、6四幕联系图；桌面1536×1024，手机390×260。包含t2/5/11/15/21/26/29及两张最高强度跃起帧，已检查主体与角色边界。
- 30行为探针、18自动核验全部通过；三场力度/指针/收藏均改变像素。t5 age.05→.8时三场伙伴有延迟回答且姿态与像素均不同。月亮收尾点击、影子三动作切换和实际姿势保存通过渲染器检查。
- 26素材SHA256均与最终文件一致；角色抽查帧outsideCharacters为空。
- 三个*-32s-offline.mp4：640×426、256帧、8fps、32.000秒、0音轨，总计约6.7MB。逐帧来自最终渲染器，FFmpeg仅用于格式导出。
- source SHA256：2eb4dad9ad46f3cc48a689a3eb39afb41ffc7d775870dcae17ebd3e36539eb7d。
- asset set SHA256：a545ba31c3fd65ad32b5c047327992acd4ff30c4d51bc00cf45cd309eadb007a。
- 完整记录：assets/worlds-v7-qa/offline-render-verification.json。

## 五项验收表面

- 字体与文字：保留KaiTi/STKaiti与衬线 fallback，新增角色对白不在位图内。源码中文完整；实际字体、换行与字号仍待浏览器检查。
- 间距与布局：舞台3:2、四幕入口与控制保留；手机目标≥44px控件，影子对白放右上避免原中心区与跃起重叠。离线角色边界通过；网页DOM位置与实际遮挡仍未验证。
- 色彩：对照可见奶油纸/苔绿、靛蓝木色/琥珀、炭黑/薰衣草延续，收尾灯光和野花增加层次；实际UI对比度待浏览器验收。
- 图片：26独立背景/角色/道具，新的站姿、坐姿、举灯完整透明，未用SVG/CSS/div近似画角色。无长交叉淡化的双脸。源身份、墨线和水彩纸纹通过离线对照。
- 文案：八句对白/四幕与角色相符；收藏明确本机，音乐明确静音/MiniMax待接入。没有宣称真实频谱或生成配乐。

## 边界与后续检查

前端/共享站构建与17项目目录检查通过。HTTP入口与六张新素材的最终检查写notes/worlds-visual-verification.json。没有调用研究入册POST，真实回执仍6份。

尚需浏览器实测：网页字体/对白换行、实际点击和拖动、进度拖动暂停、标签切换缓存、控制台、localStorage重载、系统减少动态偏好和触屏。离线渲染与源码检查不能证明这些通过。MiniMax配乐、音频时钟、频谱与音画同步仍pending。

设计QA技能要求“If either artifact cannot be opened, captured, or compared, write design-qa.md with final result: blocked and name the blocker.” 规则来源：D:/codex/home/plugins/cache/openai-curated-remote/product-design/0.1.56/skills/design-qa/SKILL.md；本轮缺少网页实施截图，因此不标完整设计验收通过。

历史证据保留：v6在notes/worlds-v6-design-qa.md与notes/worlds-v6-visual-verification.json、assets/worlds-upgrade-qa；v1浏览器实录在notes/worlds-v1-*及原24秒GIF。不能替代本轮网页验收。

final result: blocked — browser capture/runtime unavailable; implementation and offline renderer checks passed; MiniMax pending.