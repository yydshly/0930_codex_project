# 三个原创小世界 · v8 连续互动

2026-10-03。继续优化既有三个世界，保持纸墨素材、角色身份和32秒四幕。生产渲染器与模拟主组件检查通过；真实网页设计验收 blocked。CUA getState 返回“trusted Node process exited unexpectedly; kernel reset”，无法取得实施页面截图和真实UI证据。MiniMax音乐仍无生成文件。

## 已修复的问题

- P1 拖动会被锁在蓄势：v8阶段函数的动作从.32秒起渐入，原pointerMove把age保持在.35。现拖动维持.7秒，减少动态时.8；主组件模拟覆盖持续拖动、暂停即兴及现场切换减少动态。
- P2 终幕点击被满足脸压住：已收藏的月亮只在普通动作结束后保持满足表情，点击时仍显示打嗝。最终离线探针与动作联系图验证反应。
- P2 收藏星种不够突出：英雄星种从70沿弧线缩至33；普通星种24–38，落地后有短暂亮边。最终手机收藏序列可见托起、飞行和落位。
- P2 前排保存姿态过淡：记录剪影宽度由42+.1×强度改为56+.15×强度，透明度由.48改为.7；保留实际姿态，不用通用剪影替换最近三份。

未解决的验证条件：完整网页字体、DOM对白位置、真实指针/键盘事件、专注退出/焦点、localStorage真实重载与音频尚无浏览器证据。不能据构建或模拟把这些标为通过。

## 本轮实现

三个新角色PNG为园丁捧星、月亮满足、影子旋身，共29PNG（14基础、12动作变体、3收尾环境）。最终生成prompt、参考、alpha框和SHA在 notes/pose-generation-v8.json；框为PIL[left,top,right,bottom]，渲染器使用[x,y,width,height]。所有人物与主要道具采用光栅素材，没有用SVG/CSS/div近似画角色。

普通动作3.5秒：蓄势、动作、回应、平复，再回idle。收藏2.6秒独立：托起、飞行、落位、留下，不重置普通动作或演出时间；星种、补丁与保存纸影在四幕均立即可见。DOM对白按事件阶段回应。暂停时仍可即兴；32秒演完停在谢幕，按重演继续。专注观看扩展舞台，保留退出按钮与Esc。减少动态选择静态动作和收藏结果。

## 比较与视觉证据

源为v7对应t29秒的离线舞台帧，实施为v8对应帧；双方同count1、strength50、pointer(.64,.5)、age100、无活动收藏，1536×1024。归一为768×512后放在同一1536×512输入，左v7/右v8，三个比较图均已打开。舞台构图、纸纹、人物身份延续；月亮新增满足脸，保存标记更早进入场景。此组终幕比较不用于证明互动动态更丰富。

![月亮同刻离线比较](assets/worlds-v8-qa/moon-v7-v8-offline-comparison.jpg)

动态证据为同一渲染器的action/capture联系图：桌面1536×1024，手机390×260；普通动作age .12/.7/1.5/2.8，收藏age .12/.7/1.9/2.8。已打开三场桌面动作/收藏以及手机收藏、影子动作联系图，能看到角色先后行动、独立收藏弧线和结果。没有DOM文字或控件，属于native Canvas输出，不是网页截图。

- 104场景帧、18联系图，含四幕、过渡、动作/收藏序列、最大力度左右边界；抽查帧角色透明包围框没有越界。
- 89行为探针、41检查全部通过：四阶段加idle、延迟接力、四幕即时收藏、收藏进展与落位、新姿态出现、终幕互动、力度/指针/计数改变像素。
- 29素材文件指纹及最终WorldScenes.ts指纹一致。生产源SHA256：2bd18eca5491fa6042c0da5c9f39e9cd4e6e83385add280938f13358f5b60977。
- 三段32秒静音交互预览：640×426、256帧、8fps；预设动作发生在3.5/10.5/18.5/26.5秒，收藏在5/13/21/29秒。模拟输入状态，不是UI事件或浏览器录屏，0音轨。
- 主组件普通/减少动态两模式逻辑模拟通过，使用mocked React、DOM、Image、RAF、localStorage及renderWorld，详细范围见 notes/host-behavior-verification-v8.json。不能证明实际浏览器布局、事件、焦点或保存重载通过。
- 完整帧与行为证据：assets/worlds-v8-qa/offline-render-verification.json；最终文件、媒体SHA与服务检查：notes/worlds-visual-verification.json。

## 五项验收表面

- 字体与文字：保留KaiTi/STKaiti及衬线fallback。中文与事件对白源码已检查；字体实际命中、字重、换行、抗锯齿与UI阅读仍blocked。
- 间距与布局：3:2舞台及独立图层延续；104帧的角色包围框通过。专注模式和手机DOM对白避位仅检查实现与模拟，实际大小、遮挡与退出焦点仍blocked。
- 色彩与token：已打开同刻对照和序列，奶油纸/苔绿、靛蓝/琥珀、炭黑/薰衣草保持；收藏标记更清楚。真实UI对比度与控件状态色仍blocked。
- 图片与素材：三张新增1254×1254真透明PNG，完整肢体和alpha框通过；新表情/姿态与原身份、墨线和水彩质地一致。生成素材和完整舞台离线合成已检视；无程序轮廓代替原素材。
- 文案与内容：对白跟随事件、收藏明确本机、演完停止的控制说明与实现一致；静音/MiniMax待接入明确。实际DOM的换行、段落密度与屏幕阅读仍blocked。

## 验证边界

本轮仅修改016子项目源码、素材、说明与构建输出，不发起研究入册POST。实时回执数量及HTTP结果见最终验证JSON。历史v7记录已归档 notes/worlds-v7-design-qa.md 与 notes/worlds-v7-visual-verification.json；旧浏览器实录不能代替新版验收。

设计QA规则来源：[SKILL.md](D:/codex/home/plugins/cache/openai-curated-remote/product-design/0.1.56/skills/design-qa/SKILL.md)：“If either artifact cannot be opened, captured, or compared, write design-qa.md with final result: blocked and name the blocker.” 当前缺少新版网页实施截图，因此不标完整设计验收通过。

final result: blocked — browser capture/runtime unavailable; implementation, native Canvas checks and mocked host checks passed; MiniMax pending.
