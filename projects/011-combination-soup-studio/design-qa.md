# Selected effect components — visual verification

Date: 2026-10-02

final result: passed

The user authorized a separate Playwright browser after the built-in capture tool failed. This report covers the four selected components, their local integration and controls. It does not claim an exact whole-site clone, accessibility certification, hardware performance or measured business outcomes.

## Fresh evidence

Source: https://combinationsoupstudio.com.au/ with #menu, #stir, #delivery and #order. Desktop 1440 × 1040 and mobile 390 × 844 captures are in assets/qa/source-*.png. Fonts were allowed to load. A single cookie was opened; no enquiry, order or coupon was submitted.

Implementation: http://127.0.0.1:8951/projects/011-combination-soup-studio/?effect=menu with broth, delivery and fortune alternatives. Fresh captures at matching viewports plus 768 × 1040 are assets/qa/local-*.png. Mobile menu state images additionally use 390 × 1040 so the full sticky component fits in one capture.

The corresponding source and local regions are presented together in [source-local-comparison.png](assets/qa/source-local-comparison.png). Regions are cropped and proportionally resized to compare component geometry at a common display size; full captures and original dimensions remain available. Outer laboratory layout, Chinese explanations, local controls and tip copy are intentional integration changes.

## Visual findings and resolution

| Finding | Resolution | Evidence |
| --- | --- | --- |
| P1: approximate bowls and cookie lost the source texture | Use selected original menu photographs and transparent cookie texture | Menu and cookie rows of the combined comparison; source asset hashes |
| P1: 768px inspector compressed the turntable into a small thumbnail | Move inspector below the stage at widths up to 1100px | local-menu-768.png; measured turntable width exceeds 300px |
| P2: mobile delivery status covered heading copy | Keep the title on one line and place the status below it | local-delivery-390.png; text-range intersection check |
| P2: expanded cookie paper covered footer controls | Allocate a 620px mobile stage | local-fortune-390.png; paper/footer geometry check |
| P2: mobile heat icons covered the menu list | Return heat icons to normal document flow | Three mobile menu state captures |
| P2: a direct broth entry initially waited for a full bowl | Start with visible broth; retain refilling as an explicit action | Initial bowl and actual refill recording |

Fonts, assets, palette and geometry were compared together. Selected source display, handwritten and mono fonts load locally. The menu retains cream card, lacquer/gold turntable and original images; the engine retains original point geometry, glow sprites, steam and five ingredient shapes; the map retains full source coastline, 50 towns, spring arm, parcels, parachutes and landing waves; the cookie retains source half masks, opening angles and paper motion.

No unresolved P0/P1/P2 findings remain within these tested component states. Animated particle positions, random towns and tip selection differ between captures by design.

## Functional and layout verification

41 effect checks passed in notes/effects-verification.json. Checks include decoded original video, module disposal, scroll synchronization, pointer laps, a measured reduction in broth fill with spill state, actual city arrival, cookie persistence/reset, keyboard tabs, direct routes, no horizontal overflow and reduced motion.

34 layout checks passed in notes/layout-verification.json. They cover all three menu choices at 390/768/1440px, card/turntable separation and bounds, visible tablet turntable scale, actual heading text bounds, map controls, cookie paper bounds and footer separation.

48 existing business prototype checks passed in notes/verification.json. No unhandled runtime errors occurred. Local effect tests requested only the identified source video externally, with no failed requests or source enquiry/statistics submission.

[Actual operation recording](assets/effects-refined.mp4) shows menu switching, circular stirring, ingredient spills, refilling, parcel flights and cookie reveal. [Four current captures](assets/effects-optimized.png) summarize actual browser states. Previous effects-verification-v1.json remains historical.


## Motion and composition review, revision 20261002-2

The user's visual feedback reopened the prior conclusion. Functional counts did not establish the strength of the visual experience. This revision restores complete local compositions and verifies dynamic behavior, rather than comparing isolated drawing crops alone.

Broth and delivery retain selected original Canvas drawing; the cookie retains a static original photograph with CSS half masks. Controllers and module layout are local adaptations. No photorealistic fluid or 3D simulation is implied.

Confirmed and resolved: the 15ms frame threshold could halve rendering on 75Hz displays; remote parcel paths could disappear above the Canvas; mobile labels were too small and HQ text clipped; manually triggered parcels were hard to follow amid automatic traffic; the isolated broth lost its recipe cards and local 8-lap feedback; automatic cookie rejoining interrupted observation.

Current components use time-normalized motion, focused layouts and explicit motion controls. Broth offers a labelled automatic preview that does not count toward the user's challenge, immediate manual takeover, 8-lap feedback and opt-in device tilt. Delivery keeps parcel paths visible, uses minimum label/parcel sizes and prioritizes manual targets. The cookie stays open until the next action. Versioned CSS and module URLs avoid stale resources on a new navigation.

35 refinement checks in notes/refinement-verification.json passed, including real Canvas changes, static/play controls, manual takeover, 8-lap completion, actual parcel arrival, stable cookie inspection and layout separation. The 41 effect and 34 layout suites also passed on this revision. The 48 existing business checks remain regression evidence from the preceding revision; the business implementation was not changed.

Focused final captures are assets/qa/refined-*.png. The combined comparison now includes the original source's complete broth and delivery compositions. assets/effects-refined.mp4 records the current live components.

Additional engineering checks: 50 towns at six map widths, 600,300 sampled parcel positions, no upper-edge clipping of the conservative parcel/parachute bounds; 2,750 text draws for 50 towns at 390px, no horizontal clipping. Broth's 30/60/75/120Hz four-second integration differs by at most 0.31% in rotation and 0.305 percentage points in fill. Device tilt was checked with simulated orientation events, not physical phone hardware.

This is a scoped implementation and visual comparison result. Subjective appeal remains a user assessment; passing these checks does not establish that the user prefers the result.

## Skill and value workbench, revision 20261002-3

The page now routes effects into four business skill directions. It shows the client inputs, implemented interaction, deliverable, user/team value, functional acceptance and outcome measurements. Editing a plan is distinct from building a new customer page or connecting business services.

39 workbench checks passed; actual files in notes/skill-downloads retain customer tasks, brand tea choice, product configuration, region/service results and content reveal state. Tests include 390/768/1440px layouts, no page overflow, keyboard tabs and cross-scene snapshots. The 48 business regression checks passed after adding tea selection. Desktop and mobile captures in assets/qa/skills-*.png were inspected; an independent reviewer confirmed clear structure without overflow or obstructed controls.

Independent review found and resolved two P2 issues: exported product parameters were lost after switching to a different business scene; the brand skill's default task included product selection that its prototype did not yet provide. Per-scene snapshot caching now retains the most recent product result. The brand prototype now implements three explicitly fictional tea choices and records the selected tea in its artwork, facts, Chinese brief and skill plan. Tasks and scope claims match the running behavior.

The project-local SKILL.md and two focused references passed the official skill validator. They guide adaptation and validation, rather than claiming a universal component SDK. Real customer data, backend delivery, reward redemption and commercial gains remain separate adoption work. Outcome metrics are proposed measurements with an unmeasured baseline, not demonstrated conversion claims.

## ARC product explanation and configuration, revision 20261002-4

The product prototype now uses an original ARC desk-lamp concept with actual WebGL rendering from a locally bundled MIT Three.js r160 library. This replaces the prior software-projected product preview. The model uses curved geometry, PBR materials, environment lighting and shadows. Three colors, two finishes, studio/night environments, four preset views and four component hotspots connect visible differences with explanation and configuration records.

Direct entry: http://127.0.0.1:8951/projects/011-combination-soup-studio/?effect=broth&scene=product&revision=20261002-4#product-preview . Implementation is in web/product-renderer.js, web/product-showcase.css and the product portion of web/app.js. The locally provided library and license are web/vendor/three-r160.min.js and web/vendor/THREE-LICENSE.txt. Original ARC geometry is separate from the selected source-site effect assets.

The implementation addresses small-screen framing by reserving space for the editorial heading and bottom view controls, using a single column at widths up to 1000px, adapting close-up framing to horizontal bounds, and placing component explanations outside the Canvas. Current hero, detail and structure captures at 390/768/1440px are assets/qa/product-final-{hero/detail/structure}-{390/768/1440}.png. These fresh post-fix captures match the final implementation. Independent final visual review found no remaining actionable P1/P2 issue in the reviewed scope; evidence is in notes/product-visual-review.md.

50 product checks passed in notes/product-showcase-verification.json. They measure actual WebGL pixel changes for night mode, emission, color, finish and views; structure expansion and component explanations; keyboard/pointer rotation and zoom; reset; actual PNG export; Chinese brief and skill-plan configuration; and layout/hotspot bounds at 390/768/1440px. No unhandled browser errors were recorded. Download evidence is in notes/product-downloads/. The final 39 workbench and 48 business regression checks also passed on this upgrade. Product tests include forced non-WebGL fallback labels, disabled unsupported controls, state reset and actual PNG export.

The current deliverable value is interactive product explanation and configuration retention: visible part/parameter changes and records can be verified directly. Real customer comprehension, selection time, reduced errors and business outcomes require user measurement. The concept is not calibrated to a physical product, industrial tolerances or measured illumination/materials, and uses no physical-product photographs. Actual phone GPU performance has not been established. A labelled two-dimensional fallback retains selection, structural preview and exports without free rotation/zoom; it is a reduced capability rather than a full WebGL substitute.

Final review also resolved the complete-product base overlapping the view toolbar: hero/front retain approximately 14px clearance at 1440 and 22px at 768. Native LatheGeometry seam normals and corrected shade winding remove the central line and false rear rim. assets/product-showcase-refined.mp4 is a 32.32-second recording of the actual local browser, showing rotation, finish, night lighting, structure, part focus and reset; notes/product-recording.json records its states and zero page errors.

## All three business scenes, revision 20261002-5

The user rejected the material quality of the fourth revision. That feedback reopens its visual conclusion. Passing functionality and layout checks did not establish parity with the original site. The fifth revision upgrades all three business scenes, keeping the selected source-effect modules separately attributed.

Brand now uses an original AI-generated tea photograph, live HTML packaging labels and editorial composition. Product adds a walnut display slab, paint microtexture, slim metal details and an AI-generated LDR studio panorama converted to real PMREM reflections. Garden replaces the flat diagram with original parameterized WebGL geometry, selected project 007 original material textures, alpha-tested leaf instances, real scene-reflection water and day/night lighting. Current imagery is in assets/qa/v5/, with an actual-browser gallery and before/after montage in assets/business-scenes-v5-{gallery/comparison}.png.

The review checked 1440/768/390px, long brand text, product views and structure, garden orthographic plan, extreme dimensions and fallback. It resolved paper-label placement, plan/title/dock collisions, comparison copy resizing the Canvas, over-fogged large models and fallback footer overlap. Details, evidence and limits are in notes/scene-visual-review-v5.md. Shared product-final-* paths now contain the latest revision-5 regression captures; before-product.png and the revision-4 product recording preserve earlier evidence.

Final behavior reports cover 41 new three-scene checks, 50 product checks, 48 business regression checks and 39 skills-workbench checks. These verify actual pixels, states, area partitioning and downloads. The current recording is assets/business-scenes-v5.mp4. Assets and final production prompts are recorded in notes/scene-assets-v5.json. Texture appeal remains a user judgment; conceptual rendering is not physical calibration, and the generated studio panorama is not a measured HDR probe.

## Visible material use, revision 20261002-6

The product now defaults to a visible generated interior panorama, with studio/interior switching, a material reflection toggle and source-image disclosure. A first capture showed mostly floor: an independent wide-angle environment lens now shows the window, walls and floor behind the product close-up. Garden adds water and plant cameras over the same parameterized model, curved leaf geometry and the source leaf image. Short mode-specific headings and backed status labels keep close-up controls readable on phones.

Fresh before and final captures are in assets/qa/v6/. The review and limits are recorded in notes/scene-visual-review-v6.md. The new 41-check report tests actual decoded assets, pixels, outputs, 1440/768/390px layouts and failure/compatibility states. Product 50, business scenes 41 and skills 39 checks also passed on revision 6. Current shared product-final-* captures and reports now belong to revision 6; revision-5 imagery and recordings retain the previous evidence.

The current recording is assets/business-scenes-v6.mp4. The gallery uses only actual browser stage screenshots. This revision reuses revision-5 generated assets. A panorama is not navigable room geometry or measured HDR lighting; subjectively preferred rendering and physical fidelity remain separate from the functional checks.

## Model detail and current exports, revision 20261002-7

Product gains actual table aprons and tapered legs, more table space in hero/front views and adjusted matte highlights. Garden replaces spherical crowns with asymmetric leaf clusters along tapered branches and thinner curved grass. Split foundation geometry forms a recessed basin, with submerged gravel and stones; periodic normal detail adds small water waves.

Phone checks exposed a stale-canvas issue when users scroll below the rendering viewport to edit configuration. Both renderers now draw once for explicit configuration and exports even when outside the viewport, while ongoing animation stays visibility-gated. The issue was reproduced before the fix and pixel changes confirmed afterward. Product and garden exported PNGs match their latest offscreen canvas exactly.

47 scene refinement, 41 brand/garden regression and 50 product checks passed after the fix with no unhandled browser errors. Screenshots, before/after comparison, 55.32-second actual browser video and scope limits are in assets/qa/v7/, assets/scene-polish-v7-{gallery/comparison}.png, assets/scene-polish-v7.mp4 and notes/scene-visual-review-v7.md. Assets are reused from earlier production; this remains a concept rendering, not measured photographic or physical fidelity.

## Material layers and decision delivery, revision 20261002-8

Fresh revision-7 screenshots grounded this iteration. Garden now uses a camera-projected planar reflection with oblique clipping, layered ripples, calmer material relief and coherent sun/shadow direction. Tapered twigs and inner/outer leaf clusters replace regular canopy layers; shrubs use distinct small curved leaf geometry. Product matte highlights, direct light and room framing received modest refinement. The combined before/after input was reviewed as assets/scene-polish-v8-comparison.png; current real-browser gallery is assets/scene-polish-v8-gallery.png.

All three scenes expose the current selection and adjacent download actions. Garden preserves both A and current parameters, displays current-minus-A area differences, and exports both scenarios. Explicit A-view labelling avoids exporting a saved view as if it were the current edit. New verification checks actual download contents and state consistency.

Pointer-click regression caught an implicit second Grid column introduced by the result section's row placement on narrow product layouts, plus zoom controls blocking the view dock. The final layout uses one explicit column with distinct rows and moves mobile zoom above the dock. Checks now verify full-stage container width and actual element hit targets across 390/768/1440, in addition to screenshot inspection.

Final reports passed: scene refinement 47, brand/garden 41, product 50, selection/delivery 36; no browser or shader errors. Site tests 6 and registry validation of 15 projects also passed. The real browser recording is 81.12 seconds at 1440×1100, H.264, assets/scene-polish-v8.mp4. Scope and remaining physical/photographic limitations are in notes/scene-visual-review-v8.md. No new bitmap generation, original-site wholesale copy, production business integration or measured commercial claims were introduced.

## FORM 马桶完整产品展示 · V1.2 · revision 20261002-11

日期：2026-10-02。最终结果：**passed**，范围为本次原创概念产品展示、实际选型操作和独立交付。用户对此前简化演示的反馈重新开启了视觉评审；此前功能通过不能证明原站级别的质感。

参考来源为 [Combination Soup Studio](https://combinationsoupstudio.com.au/)，本次重新打开并捕获原站；没有用搜索摘要代替画面。当前产品入口为 [完整马桶产品页](http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/showroom.html?example=toilet&revision=20261002-11)。原站和当前首屏均以 1440 × 820、浏览器缩放 100% 捕获，再按相同缩放组合为 [原站与本页同尺度比较](assets/qa/v11/source-campaign-comparison.png)。该组合已经一起检查，核对的是构图、展示层级、素材和文字密度；它不代表逐像素复制或已证明审美质量相等。

[实时选型前后对照](assets/qa/v11/toilet-live-before-after.png)以相同画面区域和组合比例检查形体、陶瓷明暗、环境与控件。最终截图来自实际解压交付包的浏览器运行：[桌面首屏](assets/qa/v11/final-standalone-hero.png)、[实时模型](assets/qa/v11/final-standalone-live.png)、[开盖](assets/qa/v11/final-standalone-open.png)、[侧面](assets/qa/v11/final-standalone-side.png)、[手机首屏](assets/qa/v11/final-showcase-mobile.png)。桌面捕获为 1440 × 820；手机模拟视口为 390 × 844，首屏证据取 390 × 780。768 像素布局也已检查。主视觉截图是运行页面，未将生成原图当作页面效果截图。

五项表面检查已完成：

| 表面 | 当前结果与证据 |
| --- | --- |
| 字体与排版 | 大字号衬线中文标题、细小系列标识与简洁导航形成层次；修正中文断句导致的标题折行，手机字号与段距单独调整。 |
| 布局与交互位置 | 独立品牌页替代嵌套工作台首屏，故事、选型、空间核对和交付顺序明确；主按钮实际滚动进入选型。手机没有横向溢出或按钮遮挡主体。 |
| 色彩与材质 | 深绿石材、暖洞石与象牙白陶瓷统一；实时模型实际使用贴图、环境反射、接地阴影与相机对应的地面反射。 |
| 图像与形体 | 横版、竖版、材质特写和两项纹理为本项目生成素材，随包交付；选型采用独立连续陶瓷几何，盖板、水箱与后舱由目录参数驱动。 |
| 文案与状态 | 标题围绕日常使用与选择，固定系列意象和当前三维选型区明确区分；尺寸、电源、示例价格、未知测量项与冲突提示随真实状态变化。 |

迭代中发现并解决的问题：旧版首屏被工具界面挤占，基础形体和光照缺少质感；标题断行不协调；智能款斜盖、便圈与外壳衔接不连续；有水箱款完全开盖与水箱相交；侧面观察被场景墙柱遮挡；手机主按钮与主体重叠、底部说明产生孤字。最终改为完整展示页，重建连续外壳与材质，修正衔接、开盖最大角度和侧面场景可见性，并复核最后一版手机留白。最终实际开盖和侧面截图未发现上述穿模或遮挡。

[49 项流程检查](notes/toilet-verification-v11.json)全部通过，无未处理浏览器错误，覆盖真实像素变化、型号/配色/盖板/环境、空间条件、目录编辑、保存/导入、导出与多视口。原桌灯和服务的 44 项共同底座检查、6 项静态站测试、17 项项目清单校验及项目内技能格式校验通过。[最终交付报告](notes/toilet-final-delivery-v11.json)确认实际下载的 [完整案例 ZIP](notes/toilet-downloads-v11/idea-foundry-toilet-showcase-v11.zip)完整并从隔离来源运行；阻断包外资源后，三项实时材质、主视觉与交互仍可加载。最终截图对应默认 S1、卫浴环境与完整案例交付包。

本范围内未发现待处理 P0/P1/P2 问题。产品材质和构图已作实际画面比较，功能数量不用于证明视觉质量。参考站以影片和互动呈现汤碗；本页采用生成的系列影像、指针视差、滚动呈现与实时产品操作，属于围绕马桶业务的原创适配。尚未证明与原站审美质量等同；实时模型也不能等同厂商实拍或 CAD。后续真实产品采用需替换为厂商确认的几何、目录与素材，并做材质和实物核对。未接入正式报价/订单，手机仅完成视口模拟，真机性能与商业效果未测量。


## 产品要求生成与耳机展示 · V1.3 · revision 20261003-12

日期：2026-10-03。范围为目标工作台、耳机原创概念页面、实际操作与交付。复用的是通用质量与交付流程；耳机的构图、部件和任务要求按本次目标制定。来源明确区分预置模型示例、本地规则与可选在线生成。

[同尺度来源比较](assets/qa/v12/source-headphone-comparison.png)使用 2026-10-02 的原站实际截图（1440 × 820）与本次耳机页面截图（1440 × 820），均缩放到 1008 × 574 并组合检查。参考用于素材主导的首屏、阅读层次、留白与交互目的；没有重新抓取最新原站或声称逐像素复制、审美同等。最终证据为运行页面，不把生成原图当页面截图。

| 检查表面 | 当前依据与结果 |
| --- | --- |
| 字体与排版 | [桌面首屏](assets/qa/v12/headphone-hero-desktop.png)的标题断行改为两行；产品选配标题字号和宽度避免孤字。 |
| 布局与动作 | [工作台](assets/qa/v12/studio-desktop.png)显示输入、来源、具体要求和试用入口；[手机首屏](assets/qa/v12/headphone-hero-mobile.png)留出按钮与头梁之间的空间。 |
| 色彩与材质 | [实时选配](assets/qa/v12/headphone-live.png)的金属、皮革与暖背景分别表达；[夜色](assets/qa/v12/headphone-night.png)实际改变模型照明，深色壳与背景仍可区分。 |
| 图像与部件 | 横版、竖版与[材质近景](assets/qa/v12/headphone-details.png)保持系列外观；[部件](assets/qa/v12/headphone-structure.png)与[完全折叠](assets/qa/v12/headphone-fold-100.png)单独核对。 |
| 文案与状态 | 固定影像与实时选配分开说明；未知规格不填假数值。方案编辑后旧结果不可继续导出；不支持的产品明确保留模块缺口。 |

初次截图发现桌面标题多次断行、手机按钮覆盖头梁、耳垫法线导致硬边以及折叠时两耳罩过近。实际修正标题宽度/字号、引导文案均衡断行、手机影像位置、环形几何绕序、头梁曲面与折叠前后错位，然后重新捕获桌面、手机、侧面、部件和 0/50/100% 折叠。当前范围没有发现上述遮挡或明显交叉。初次截图未独立保留，故不提供虚构的前后对照。

43 项耳机流程检查、12 项服务测试、44 项共同底座与49 项马桶回归通过；新主流程及捕获报告无未处理浏览器错误。实际 ZIP 在隔离来源阻断包外资源运行，当前选择和相机能恢复；配置、说明与 PNG 内容经过实际下载核对。[制作记录](notes/headphone-build-v12.md)和[完整报告](notes/headphone-verification-v12.json)保留范围与限制。

本次结果通过概念展示、任务与交付范围的检查。实时模型仍比生成摄影简化，未作厂商几何、材质或声学标定；不据功能数量宣称达到原站同等审美质量。在线模型仅验收模拟传输和错误处理，未配密钥，真实生成质量、费用与响应时间未测。未知产品不能自动生成页面，手机仅模拟视口，商业价值待用户任务测量。

最终默认案例包另经隔离运行：[首屏](assets/qa/v12/final-standalone-hero.png)、[实时区](assets/qa/v12/final-standalone-live.png)、[部件](assets/qa/v12/final-standalone-structure.png)、[折叠](assets/qa/v12/final-standalone-fold.png)、[手机](assets/qa/v12/final-showcase-mobile.png)。捕获对应实际下载包，包含最新文案换行。WebGL 上下文失效后保持重新加载提示，窗口改变不会误报恢复；见 [最终交付报告](notes/headphone-final-delivery-v12.json)。


## V1.4 · 制作方案调整与耳机选配 · revision 20261003-13

日期：2026-10-03。本轮先捕获实际页面 `assets/qa/v13/before/`，发现要求堆叠、字号与对比偏弱、方案不可编辑以及选配缺少即时结果和重置。当前范围是已实现模块的制作方案与消费者选配，沿用既有视觉系列。

最终截图在 `assets/qa/v13/after/`。工作台改为三个内容面板，要求可展开，可选字段收起；编辑标题、要求、验证和范围时停用旧交付。字体、布局、配色、图像和状态分别核对；素材与未知规格保留来源，固定影像与实时模型继续区分。耳机控件加大并加入当前选择与重置，头梁封闭端面，棚拍地面反射减弱。首次修正发现右侧控件比模型区高，随后将桌面模型区随卡片高度伸展并缩减控件间距；最终没有保留卡片底部空白缺口。

26 项新增流程与 43 项耳机回归通过；实际调整案例 ZIP 在阻断包外资源的来源运行，关闭操作与修改文案真实生效。6 项静态站检查通过。没有将列表中的验收任务标为已完成，也没有据检查数量声称达到原站审美水平。

本轮浏览器控制连接启动失败，实际证据通过此前授权的独立本地 Playwright 捕获。手机为 390/768 等模拟视口，未测真机或完整无障碍合规。未新增生成影像、在线模型真实调用、厂商数据、生产业务接入或商业测量。[修改、图片与验证记录](notes/foundry-refinement-v13.md)。

## V1.5 · 工作台内实时预览 · revision 20261003-14

日期：2026-10-03。工作台将实际产品前置，减少从制作要求到效果判断的跳转；文案、操作范围与当前选择分别可验证。默认耳机示例打开即显示预置方案和已有实际三维，来源标识保留。标题、构图、颜色、系列素材与状态均依据运行页面核对，不把预置示例描述成在线生成。

[桌面预览](assets/qa/v14/live-default.png)和[手机预览](assets/qa/v14/live-mobile.png)分别检查。首轮发现模型下缘与按钮区域接近、手机标题尾部过短，随后给视角按钮保留独立区域并均衡断行。最终 1440、768、390 像素尺寸下模型与按钮分开，页面无横向溢出；手机先看画面再操作。实时摘要只在内容改变时更新，避免每帧重复播报相同状态。

23 项新增流程、5 项真实失效/兼容检查、43 项耳机回归通过，6 项静态站检查通过。实际交付包在隔离来源运行，工作台选择、调整文案和关闭操作均保留。WebGL 上下文真实失效后停用模型操作并保留失效提示；禁用 WebGL 时不伪造三维观察结果。最终捕获报告无未处理页面错误。

本轮改善工作台内判断、操作与交付一致性，未新增影像或形体，未声称达到原站同等审美质量。工作台内预览目前接入耳机；未知产品仍需自己的实现。在线传输回归使用模拟，尚无真实生成调用证据；手机为视口模拟，未测真机、商业效果或完整无障碍合规。[本轮记录](notes/foundry-live-workbench-v14.md)。

## V1.6 · 耳机材质与近景 · revision 20261003-15

日期：2026-10-03。本轮先捕获 `assets/qa/v15/before/` 的实际运行页面，发现整机放大的近景不足以检查材质。实现耳罩框取后暴露出外壳的曲面接缝，再检查几何发现部分材质曲面缺少 UV 坐标。修正重合点法线与纹理映射后重新捕获；最终实际铝壳近景没有保留该接缝。

最终证据在 `assets/qa/v15/after/`。工作台与完整产品共用材质与相机实现：铝壳、耳垫分别观察；耳垫缝线、织物与头梁包覆有独立层次，室内环境和受控柔光共同参与金属反射。首次织物只用高度纹理时辨识度偏弱，最后补充色彩纹理并调整重复尺度；最终耳垫截图能区分织物与外围包覆。主视觉照片没有改动，截图均来自运行中的三维页面。

旋转近景时保持耳罩焦点，观察范围随自定义相机保存；放大操作收起旁栏，收起后恢复。21 项新增观察与交付、43 项耳机回归、5 项兼容检查通过，6 项静态站检查通过。实际下载的近景包阻断包外请求运行，焦点和角度恢复；PNG 与当前画布一致。1440、768、390 像素下六个视角与放大操作无横向溢出。

完全折叠截图还暴露了旧实现移动整个连接点、让支架离开头梁的问题。最终改为固定连接点的组合旋转，再捕获半折叠与完全折叠；两个状态均保持连接。回归和实际下载包在该修正后复核并保留日志，未将此前运行报告作为最终版本的证据。归档更正：后续复核误用旧捕获脚本覆盖了 V1.6 的 `before/`，该目录不再支持旧版本前后对照；V1.6 的最终 `after/` 保留，V1.7 改用独立目录。手机仅为视口模拟；尚未证明真机性能、完整无障碍合规、原站同等审美质量或商业效果。三维和材料为概念展示，未按实物标定；在线调用仍未实际验证，未知产品仍需要自己的模块。[制作与证据记录](notes/headphone-material-focus-v15.md)。

## V1.7 · 造型与展示重做 · revision 20261003-16

日期：2026-10-03。基于用户“仍不够精致”的反馈，以已有耳机系列摄影图为目标，先捕获当前运行页面，证据在 `assets/qa/v16/before/`。模型头梁偏大、耳罩偏小、三角叉架与摄影中的单杆不同；银色反射偏棕，高侧栏把主要选配与结构操作放在相同层级。这些是视觉和任务呈现的缺口，与功能检查数量无关。

模型重做比例、包覆、连接、耳垫与壳体细节，并调整中性布光及连续背景。页面改为宽幅产品画面，配色、表面及留下选择前置，结构与换光线默认折起。实际操作仍由真实模型响应；摄影图与当前选择的边界移到简洁说明中。首屏、材质摄影和既有内容节奏继续沿用。

首轮 `after/` 截图发现耳垫近景被另一耳罩遮挡、手机耳罩下缘被工具条遮挡。最终隔离实际观察部件，回完整视角恢复；画布给工具条预留 74 像素，再复核桌面、手机、六视角、放大及半/全折叠。`assets/qa/v16/after/` 保存冻结后的最终实现，捕获报告记录实际 renderer 版本 16。

本轮使用真实截图比较参考、修改前与修改后，再作形体与界面判断；没有用测试数评价审美。冻结后的 38 张捕获、21 项近景与交付、43 项耳机回归无错误；本轮兼容 5 项与静态站 6 项通过。实际包、来源模型和服务模型的 renderer 文件校验相同。仍存在皮革褶皱、软垫受力和复杂微表面差距，不能据此称摄影等价的最终版本。[实际审视与证据](notes/headphone-art-direction-v16.md)。
