# 原生毛丝与 Cycles 毛料样片

日期：2026-10-02。延续[方法选型](plush-method-selection.md)，已生成四组毛料样片、蓝色星仔正面与 25° 侧面，以及可编辑 Blender 工程。本轮继续新增同条件 A/B/C/D 导向毛束实验、E 弧长归一样片及完整 v4/v5/v6，保留全部历史资产。[打开参考与实际样片对照](../artifacts/cycles-material-study.html)。

当前成果是**离线毛绒资产候选**：细丝、软轮廓、接触阴影和眼睛反射已经由真实三维几何与灯光产生。v5 前额与侧臂已有可辨卷束，末端比 v4 松散；v6 加入弧长归一，表层更紧凑，部分长钩纹收敛，但前额仍偏平、毛束偏细碎。与参考相比，下腹偏暗，帽冠偏宽、规整，眼睛比例也有差距。尚未通过“最好与原图一致”的外观目标。这一状态与网页功能验证分开记录。

## 实际采用的方法

1. **填充形体。** 连续三维网格生成圆肩、侧臂与腹部；眼睛和贝雷帽是独立物体。由截图匹配正面比例，未观察到的侧后面作为设计补全。
2. **真实毛丝。** Blender 原生 `Curves` 存储每条毛丝的控制点和半径，Cycles 作为毛发几何求交。身体分为细密底绒、弯曲外绒和少量飞毛，帽子另有短纤维。没有把粗线管、颜色噪声或二维图像当成毛丝。
3. **毛料生成与导向。** v3 由固定随机种子和分组方向控制长度、卷曲、相位、倾斜与毛根聚拢。A/B/C/D 增加独立隐藏导向曲线与逐毛映射，让外绒沿完整曲线收拢，再比较不同沿长分布。参考成熟 Hair Clump 工具的部分原则，未使用 Houdini。E/v6 加入毛根固定的整根曲线弧长归一，是几何缩放，不是分段保长或动力学求解。这组历史导向是生成时烘焙的记录，修改它不会自动重梳外绒。随后另建 GN 毛料小样，实际连接官方卷曲、结簇、段长恢复和截面节点，修改导向会更新外绒，详见下节；尚未实现表面附着、交互笔刷或物理接触。
4. **纤维散射。** 实际使用 Cycles `Principled Hair BSDF` 的 `CHIANG / COLOR` 模式。选择直接颜色是为了蓝色合成纤维，未以人发黑色素参数替代。粗糙度控制纤维反射和透射的展开，颜色不是画完阴影后的常数 RGB。
5. **路径追踪。** 大面积主光、补光与背光照明；Cycles 求解毛层光影和反射，OpenImageDenoise 降噪，AgX 输出。黑眼的高光来自真实光源。帽底和眼周毛长作几何压缩，未实现受力接触求解。

论文负责散射方法，毛丝形态仍由资产决定。Blender 负责成熟的毛发表示和渲染，Python 负责自动化与参数复现；这两者不能代替对照验收。

## 论文和产品依据如何对应到成果

| 来源 | 本轮使用或理解 | 当前边界 |
| --- | --- | --- |
| [Chiang 等 / Disney，2016](https://www.disneyanimation.com/publications/a-practical-and-controllable-hair-and-fur-model-for-production-path-tracing/) | 通过 Cycles 内置 Chiang 毛发节点，处理纤维内部反射、透射与能量分布；纤维之间的多次散射由路径追踪处理 | 没有自行重写或验证论文 BSDF；论文不会自动生成卷绒、帽子或匹配截图 |
| [Blender 原生 Curves API](https://docs.blender.org/api/5.2/bpy.types.Curves.html) / [Principled Hair 文档](https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/hair_principled.html) | 实际保存原生毛丝、半径属性和 Hair BSDF，可在 Blender 中检查与修改 | Hair BSDF 依赖 Cycles，不能原样导出 GLB 后期待相同的网页画质 |
| [Houdini 泰迪熊制作流程](https://www.sidefx.com/docs/houdini/fur/teddybear.html) | 参考“局部毛料 → 分层毛丝 → 整体角色”的制作顺序 | 未使用 Houdini，也未把本轮自动曲线声称为完整 Guide Groom 系统 |
| [SideFX Hair Clump](https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html) | 参考完整导向形状与沿毛长控制收拢的思路；实际保存导向、成员映射和四组同条件结果 | 自己实现的位移混合只采用部分原则，缺少该产品的完整参数系统与保长处理；C→D 同时改变中段和末端 |
| [Blender 官方 Hair Nodes](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/hair/index.html) | GN 小样实际加载本机官方 Curl、Clump、Restore Curve Segment Length、Set Hair Curve Profile，导向对象参与实时评估 | 节点联动已实际运行；毛料外观仍需验收，没有完整表面附着、梳理工具或网页转换 |
| [3DGS 作者项目](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/) / [LichtFeld Studio](https://github.com/MrNeRF/LichtFeld-Studio) | 后续静态网页候选：已验收资产渲染多视图，再拟合高斯 | 本轮没有训练；单张参考与手工散点不等于多视图优化 |
| [SuperSplat Viewer](https://github.com/playcanvas/supersplat-viewer) | 后续成熟网页查看器候选，用于检查转换后的毛料保留与旋转表现 | 对照页面现在展示 PNG，尚未接入该查看器 |

## 保留的 v3 毛料与角色基线

四组主对照样片均从最终 v3 源版本生成，使用同一曲面、镜头、三个柔光、768 × 768 分辨率、96 样本上限和 177,500 条身体毛丝。A/B/C 使用相同纤维底色；D 同时调整毛料形态与纤维底色，因此 D 是目标候选，四组并非单一变量实验。初期 v1 样片另外保留，主对照使用同源 v3，避免混入网格朝向修正造成的差异。

| 候选 | 外绒基准长度 | 卷曲幅度 | 周期 | 倾斜 | 结簇 | 纤维底色 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| A：细密直短绒 | 0.025 | 0.0018 | 0.7 | 0.35 | 0.15 | `#87a9e6` |
| B：松散微卷绒 | 0.047 | 0.0055 | 1.15 | 0.65 | 0.38 | `#87a9e6` |
| C：较长卷毛束 | 0.065 | 0.010 | 1.6 | 0.75 | 0.60 | `#87a9e6` |
| D：松散短卷绒候选 | 0.046 | 0.009 | 1.0 | 0.50 | 0.60 | `#6b8bd4` |

长度、幅度和半径采用 Blender 场景单位，角色宽约 2.6；没有标定实际厘米或毫米。表中长度是外绒生成参数，底绒、飞毛、随机变化、帽下与眼周压缩会改变实际曲线长度。

完整 v3 使用 D 毛料：340,000 条底绒 + 320,000 条外绒 + 9,000 条飞毛，每条 12 个点；黑帽 90,000 条短纤维，每条 5 个点。蓝色毛根半径采样范围为 0.00024–0.00040，末端渐细；各层另有缩放。蓝毛材质 Roughness 0.48、Radial Roughness 0.55、Random Roughness 0.13、Coat 0。所有细节可在工程内检查，密度数字本身不代表真实度。

| 实际输出 | 文件 | 生成与渲染总耗时 |
| --- | --- | ---: |
| 正面 v3：1536 × 1536、384 样本上限 | [PNG](../artifacts/cycles-study/character-reference-v3.png) / [Blender 工程](../artifacts/cycles-study/character-reference-v3.blend) / [JSON](../artifacts/cycles-study/character-reference-v3.json) | 78.89 秒 |
| 25° 侧面：1024 × 1024、128 样本上限 | [PNG](../artifacts/cycles-study/character-reference-v3-angle25.png) / [Blender 工程](../artifacts/cycles-study/character-reference-v3-angle25.blend) / [JSON](../artifacts/cycles-study/character-reference-v3-angle25.json) | 24.97 秒 |
| D 毛料：768 × 768、96 样本上限 | [PNG](../artifacts/cycles-study/swatch-reference-v3.png) / [Blender 工程](../artifacts/cycles-study/swatch-reference-v3.blend) / [JSON](../artifacts/cycles-study/swatch-reference-v3.json) | 12.02 秒 |

本机为 RTX 4070 Laptop GPU，8188 MiB 显存。v3 实际日志确认 `Use Hair True`、OptiX 路径追踪和 384 样本，渲染阶段 71.07 秒；总耗时还包含几何生成和工程保存。降噪在 CPU 上执行。这是单次本机离线测量，不是网页帧率，也不代表其他设备性能。[实际日志](../artifacts/cycles-study/character-reference-v3.log)。

## 同条件导向实验：A/B/C/D 与完整 v4、v5

这一组 A/B/C/D 是**同一种蓝色短卷绒的导向实验**，与上表四种不同毛料另行编号。使用冻结 v3 生成源，保持随机抽样、毛根、分组、半径、数量、其他毛层、网格、材质、镜头和灯光不变。四张均为 768 × 768、96 样本上限、177,500 条可渲染毛丝、纤维底色 `#6b8bd4`；另保存 2,657 条不参与渲染的导向，每组最多 32 条外绒。

设原始外绒为 `X_i(t)`，毛根为 `p_i`，分组毛根的切向偏移为 `D_i`，代表毛丝的相对曲线为 `U_g(t)`。代表毛丝确定为同组中距导向毛根最近的成员，避免为实验引入新的随机数。

- A 沿用 v3：`X_i + α D_i`，其中 `α = 0.6 t²`，仅向分组毛根方向聚拢。
- B 改为完整导向：`X_i + β (D_i + U_g - (X_i - p_i))`，`β = α`。
- C 使用同一完整导向公式，`β = 0.90 smoothstep(clamp(t / 0.60))`，使中段更早成束。
- D 使用 `β = 0.88 smoothstep(clamp(t / 0.52)) × [1 − 0.30 smoothstep(clamp((t − 0.55) / 0.45))]`，中段强成束、末端放松。

实现 C/D 时先移除基线已经施加的 `α D_i`，再应用新公式，避免将两种聚拢重复叠加。毛根位置保持不变；底绒、飞毛及黑帽的位置和半径保持相同。隐藏导向的 `guide_id` 与 `source_member_index` 记录真实对应关系。

| 导向候选 | 中点收拢 t=0.5 | 末端收拢 t=1 | 相对 A 的弧长绝对相对漂移 P95 | 实际观察 |
| --- | ---: | ---: | ---: | --- |
| A：毛根聚拢 | 15% | 60% | 基线 | 细密，卷束不够明确 |
| B：完整导向、较晚收拢 | 15% | 60% | 19.81% | 整体变化较小，完整导向并不自动解决毛料读感 |
| C：完整导向、提前收拢 | 83.33% | 90% | 65.70% | 卷束清楚，末端较紧，细亮钩纹较多 |
| D：中段成束、末端放松 | 87.62% | 61.6% | 79.50% | 散绒增加，紧钩减弱，仍存在细亮线和重复感 |

弧长采用已保存 float32 控制点，在 Cycles 对应的非闭合 Catmull–Rom 基函数上做 32 阶 Gauss–Legendre 积分估算，端点重复控制；与 16 阶积分抽样比较，误差记录在各实验报告。它是几何数值估算，不是直接读取渲染引擎的长度。依据 [Cycles 曲线导出源码](https://raw.githubusercontent.com/blender/blender/main/intern/cycles/blender/curves.cpp) 和[求交基函数源码](https://raw.githubusercontent.com/blender/blender/main/intern/cycles/kernel/geom/curve_intersect.h)核对基函数。P95 表示 95% 毛丝的绝对相对漂移不超过该值。

生成长度参数固定，**A/B/C/D 的实际曲线长度并未保持**。D 的漂移比 C 更大，完整角色上更明显；不能把这些实验描述为 FTL 或物理约束的毛发模拟。后续 E 专门检查弧长归一的影响，见下节；单纯提高收拢强度或数量不能替代毛束形态的外观验收。

完整角色沿用 v3 同一几何、光照、颜色、毛量和 1536 × 1536 / 384 样本设置，两版各保存 10,000 条隐藏导向：

| 新增完整角色 | 导向分布 | 相对完整 v3 的弧长漂移 P95 | 生成与渲染总耗时 | 资产 |
| --- | --- | ---: | ---: | --- |
| v4 | C / early | 73.45% | 80.40 秒 | [PNG](../artifacts/cycles-study/character-reference-guide-v4.png)、[工程](../artifacts/cycles-study/character-reference-guide-v4.blend)、[实验报告](../artifacts/cycles-study/character-reference-guide-v4.ab-report.json) |
| v5 | D / soft-tip | 97.30% | 97.46 秒 | [PNG](../artifacts/cycles-study/character-reference-guide-v5.png)、[工程](../artifacts/cycles-study/character-reference-guide-v5.blend)、[实验报告](../artifacts/cycles-study/character-reference-guide-v5.ab-report.json) |

v4/v5 保留完整对照；已有 v3 25° 侧面明确标为历史基线，不能用它验证新增角色的侧面。所有文件下载与两种源快照集中在[对照页](../artifacts/cycles-material-study.html)。

## E：毛根固定的弧长归一

同条件新增 `swatch-reference-ab-soft-tip-length-1`：沿用 D 的导向分布、毛根、半径、数量、其他毛层、形体、光源、材质与相机，只在混合完成后对每根外绒作整根缩放：

```text
Y_i = p_i + (L_A_i / L_B_i) × (B_i − p_i)
```

`L_A` 是 v3 毛根聚拢基线的实际样条弧长，`L_B` 是归一前 D 的样条弧长；两者都按相同的 32 阶积分估算。缩放后重新测量，并检查保存的 float32 控制点和毛根。整根曲线的相对根点位置同时缩放，因此卷曲幅度和毛束间距也会改变；这不是只修改“长度滑杆”，也不是 FTL、分段长度约束或物理模拟。

E 样片生成与渲染共 **15.0 秒**，仍为 768 × 768 / 96 样本，177,500 条可渲染毛丝与 2,657 条隐藏导向。生成报告的归一后绝对相对弧长误差 P95 为 **0.0000507684%**，最大 **0.000184364%**，毛根按 float32 逐位保持不变。它与 D 的 79.50% 是归一前后指标，不能把报告保留的旧 `b_positions` 或旧弧长摘要误当成 E 的最终结果；最终位置记录在 `output_positions`，长度记录在 `post_normalization`。

实际看图，E 的表层更紧凑，部分长钩丝减少，但仍呈细碎绒片，尚未得到参考那种厚实、断续的小卷绒。长度误差降低是工程结果，不等于外观质量或相似度提高。保存 [PNG](../artifacts/cycles-study/swatch-reference-ab-soft-tip-length-1.png)、[可编辑工程](../artifacts/cycles-study/swatch-reference-ab-soft-tip-length-1.blend)、[实验报告](../artifacts/cycles-study/swatch-reference-ab-soft-tip-length-1.ab-report.json)和两种源快照，D 与所有旧资产保留。

同方法的完整 **v6** 已实际渲染：1536 × 1536 / 384 样本，669,000 条身体毛丝、90,000 条黑帽短纤维、10,000 条隐藏导向；生成与渲染总耗时 **124.65 秒**。报告记录归一后弧长绝对相对误差 P95 **0.0001123941%**、最大 **0.0009804751%**，毛根逐位不变。当前主图展示这版最新候选，并保留 v5 归一前完整角色供比较；不是将 v6 宣布为视觉母版。实际查看前额、侧臂和腹部，表层较紧凑，但短卷束的厚度、间距、自然变化以及帽冠仍需改善。[v6 PNG](../artifacts/cycles-study/character-reference-guide-v6.png) / [工程](../artifacts/cycles-study/character-reference-guide-v6.blend) / [报告](../artifacts/cycles-study/character-reference-guide-v6.ab-report.json)。

## GN：可编辑的官方毛发节点小样

这一分支将成熟节点用于实际毛丝变形。官方资产来自 Blender 5.2.2 随附的 `procedural_hair_node_assets.blend`，SHA-256 为 `b69d8bd8975b9db7f89693f8f19dd7fcb241f5a3786d2edfb0a243e91c1109bb`。节点依次执行 **Curl Hair Curves → Clump Hair Curves → Restore Curve Segment Length → Set Hair Curve Profile**，删除导向的渲染几何后使用 Catmull–Rom，并将毛根锁回原始位置。导向对象仍通过 Object Info 参与计算。参考[官方卷曲接口](https://docs.blender.org/manual/en/5.1/modeling/geometry_nodes/hair/guides/curl_hair_curves.html)与[结簇接口](https://docs.blender.org/manual/en/5.1/modeling/geometry_nodes/hair/guides/clump_hair_curves.html)，没有自行重写这些工具的内部算法。

每组最多 32 根外绒对应一条导向。自定义 `pile_guide_index` 保存稳定映射，与官方节点会重写的 `guide_curve_index` 分开。加入导向的 Join Geometry 顺序由实际评估检查；导向最终不参与渲染。仅仅节点存在、隐藏导向可见或修改器参数能设置，都不足以证明联动，因此另外扰动导向并检查评估后的外绒，再恢复原数据。

GN1 保存 85,000 根外绒、90,000 根底绒、2,500 根飞毛及 2,657 根 live 导向，768 × 768 / 96 样本，实际生成与渲染 **15.28 秒**。导向为三种浅拱形；Curl Factor 0.55、Radius 0.002、Frequency 1.2；Clump Factor 0.72、Shape 0.35、Tip Spread 0.003；毛尖半径实际为毛根的 55%。修改导向 0 的第 5 个控制点，X 移动 0.002，32 根外绒发生变化，最大位移约 0.00145921；毛根逐位不变，恢复导向后评估结果也逐位恢复。这是实际的 Blender 工程编辑能力，不是网页笔刷。

**GN1 外观未改善到目标。** 实际看图更像均匀短毡，卷束比 E 更弱。节点使用正确与视觉质量是不同结果。此外，沿用的基线曲面在极点附近有非单位法向，导致少量输入毛丝异常缩短：实际 rest 弧长最小约 0.00060114，不能声称每根长度都是基线的 70%。官方 Restore 恢复的是控制点之间的段长，最终 Catmull–Rom 弧长相对 rest 的绝对变化 P95 约 0.85935%、最大 1.30897%，不能与 E/v6 的整根样条弧长归一混用。

GN1 的基础 `.json` 保留冻结 D 生成器输入，其中的 `preset` 不是最终 GN 参数；实际节点输入、导向、半径、评估与源哈希以同名 `.gn-report.json` 为准。复现时保存并使用该候选自己的 `.gn-source.py` 和冻结 `.source.py`，不能用正在迭代的当前脚本冒充旧源。[GN1 实际图片](../artifacts/cycles-study/swatch-reference-gn-pile-live-render-1.png) / [工程](../artifacts/cycles-study/swatch-reference-gn-pile-live-render-1.blend) / [节点与评估报告](../artifacts/cycles-study/swatch-reference-gn-pile-live-render-1.gn-report.json)。

GN2 仅新增一个明确的形态候选：开放 C/C/S 导向，Curl Factor 0.70、Radius 0.006、Frequency 0.85；Clump Factor 0.88、Shape 0.20，Tip Spread 仍为 0.003。依官方 Shape 分布，中点未缩放权重由 0.65 变为 0.80，实际还需乘 Clump Factor。单位化 12 个异常法向后，输入 rest 长度与基线 70% 目标的最大相对误差为 `2.125e-6`；最终评估弧长仍会改变，相对 rest 的绝对漂移 P95 约 **1.03322%**、最大 **1.79817%**。导向经过节点后的控制折线总转角中位数约 238.32°、弦长/样条弧长中位数约 0.515，是回弯程度的几何描述，不是样条曲率积分或视觉质量分数。

GN2 实际生成与渲染 **18.35 秒**，其他毛层、毛量、毛根、随机抽样、半径 profile、材质、灯光和镜头仍保持。它同时改了导向形态、卷曲、结簇和法向修正，不能当作单变量 A/B。实际看图与 GN1 很接近，仍偏均匀短毡；开放卷束的工程变化没有转成参考的断续厚卷绒，未作为视觉母版，也没有继续渲染完整 GN 角色。[实际图片](../artifacts/cycles-study/swatch-reference-gn-pile-open-render-2.png) / [工程](../artifacts/cycles-study/swatch-reference-gn-pile-open-render-2.blend) / [报告](../artifacts/cycles-study/swatch-reference-gn-pile-open-render-2.gn-report.json)。GN2 源快照 SHA-256 为 `94600299d26cfb50c1925d82eaa0e7811d66dcc304ca8d3f70f8dd5c2f88edc1`，基础 JSON 新增 `method_report` 和 `parameter_scope`，明确基础生成输入与最终节点参数的不同含义。

在 Blender 中打开工程，在 Outliner 中取消 `Pile guides · editable live input` 的视口隐藏，再进入曲线编辑模式修改控制点；`Live official hair GN · pile study` 修改器暴露卷曲、结簇和半径参数。导向仍保持渲染隐藏。当前仅验证毛料小样，完整 v6 仍使用历史烘焙导向，尚未升级为 GN 角色。

GN2 复现命令使用已冻结的快照和新 tag。`.gn-source.py` 与同目录冻结基础源、官方资产库一起保留；已有输出会阻止覆盖：

```powershell
& 'D:/codex/home/cache/plush-lab-tools/blender/blender-5.2.2-windows-x64/blender.exe' --factory-startup --disable-autoexec -b --python-exit-code 1 --python 'projects/005-plush-lab/artifacts/cycles-study/swatch-reference-gn-pile-open-render-2.gn-source.py' -- --preset gn2 --tag review-gn2-1 --resolution 768 --samples 96
```

CPU 预检文件 `swatch-reference-gn-pile-live-1` 和 `swatch-reference-gn-pile-open-2` 的 `rendered` 为 false，只有工程与报告，没有对应 PNG；它们不算额外效果图。初次 `gn-pile-1` 失败只留下源快照，仍保留该失败记录。

GN1 与 GN2 各由独立脚本读取已保存工程验证。[GN1 检查](../artifacts/cycles-study/hair-nodes-render-validation-v1.json) **99 / 99 通过**，[GN2 检查](../artifacts/cycles-study/hair-nodes-render-validation-v2.json) **100 / 100 通过**；各自 11 个输入文件 SHA-256 读取前后不变。四个官方组与本机原始资产库内容匹配，11 个保存节点树均为本地 ID，10 条弱来源记录不构成运行时强库依赖。另选导向 1,328 的控制点 6 沿 X 移动 0.002，实际只影响该组 32 根毛丝，组外 0 根，毛根固定、恢复求值逐位一致；GN2 最大毛丝位移为 0.00682805。该探针与生成器内导向 0 的探针不同，两者分别保留，不混用位移值。

GN2 独立积分所有已保存 rest 曲线，70% 输入预算的最大相对误差为 `2.125424973e-6`，偏离预算超过 1% 的曲线为 0；最终节点求值后的样条弧长另行测量，不能把 rest 输入预算称为最终保长。这些工程检查没有渲染、保存或覆盖原工程，也没有给画面相似度打分。

## 毛层结构诊断：卷曲为什么没有显出来

独立读取 E、v3、GN1 和 GN2 已保存的原生 / 节点求值曲线，检查毛层高度、椭球内穿入和毛根分组尺度；四个输入工程与所读取源文件 SHA-256 前后不变。[完整只读诊断](../artifacts/cycles-study/gn-layer-geometry-diagnostic-1.json)保留数据、积分方式、输入哈希和诊断脚本哈希。

GN2 正面外绒的毛冠高度中位数为 0.01135，底绒为 0.01454；77.6% 外绒毛冠低于对应局部底绒毛冠 P95，外绒平均仅 5.15% 弧长高于这个几何包络。51.21% 外绒至少有一个采样点低于解析椭球表面 0.001，平均 13.37% 弧长低于该阈值；E / v3 在同一阈值下为 0。原分组毛根的切向 RMS 中位数 0.03182，大于导向根最近邻间距中位数 0.01720；GN2 中段切向 RMS 为 0.02482，E 为 0.01120。它们共同提示：卷束高度不足，分组跨得过宽，毛丝有贴伏、交叠和穿入的问题。加大 Curl / Clump 参数本身没有产生空间紧束。

以上距离是隐式椭球梯度近似，每个 Catmull–Rom 段用 8 点 Gauss–Legendre 采样；局部包络按毛根单元统计底绒毛冠 P95，不是实体外壳，也不是逐像素可见性或遮挡率。数字用于定位结构原因，最终仍要同条件看图。

下一项 GN3 只改变外绒到导向的映射：以保存的毛根对象坐标选择最近导向根。保留 GN2 的 rest、导向控制点、半径、既有导向长度预算、节点参数、其他毛层、材质、灯光和镜头，先 CPU 预检，再保存新工程并实际渲染。这样才能分别判断分组和毛层高度的问题；未生成的结果不列为样片或通过项。

### GN3：最近毛根映射的同条件结果

该实验已实际完成 CPU 预检与 RTX 4070 Laptop / OptiX 渲染，768 × 768、96 样本，生成与渲染 **17.94 秒**。[GN3 图片](../artifacts/cycles-study/swatch-reference-gn-nearest-render-3.png) / [可编辑工程](../artifacts/cycles-study/swatch-reference-gn-nearest-render-3.blend) / [节点与几何报告](../artifacts/cycles-study/swatch-reference-gn-nearest-render-3.gn-report.json)。它只改变分配，rest / guide 坐标和半径、底绒与飞毛仍与保存 GN2 逐位一致；既有导向预算按原始分组保留，不随新成员平均长度重做导向。

以 float32 保存根的对象坐标计算 3D 欧氏最近邻，距离在 float64 中比较，相等距离取最低导向 ID；这是空间距离，不是曲面测地线或 UV 距离。59,974 根外绒改配到其他导向，2,657 条导向均非空，每条驱动 2–63 根毛丝。根到导向距离 RMS 由 GN2 的 0.03261 降到 0.01746；生成器探针移动导向 0 的控制点 5 沿 X 0.002，仅影响实际成员集合 39 根，集合外、毛根和还原结果逐位不变。

同口径几何近似显示，深于椭球 0.001 的平均弧长比例由 13.37% 降到 7.35%，正面毛冠高度中位数由 0.01135 升到 0.01316；高于局部底绒 P95 的平均弧长比例只从 5.15% 升到 6.39%。因此分组改善了结构，但仍有 75.04% 正面毛冠低于该包络。最终评估样条弧长相对 rest 的绝对漂移 P95 为 1.08363%、最大 1.87497%，没有改成整根弧长归一。

实际看图比 GN2 多一些离散毛束，但仍细薄，未达到参考的厚实断续小卷绒。随后单独检验底绒缩短，实际结果见 GN4；尚未渲染完整 GN 角色。

[GN3 独立保存工程检查](../artifacts/cycles-study/hair-nodes-render-validation-v3.json) **120 / 120 项通过**，14 个输入文件 SHA 前后相同。独立按全部毛根与全部导向的 float64 距离核算最近索引，85,000 个映射均正确；严格比较保存 GN2 的 rest / guide 几何、除两项映射外所有 native 属性、底绒与飞毛、非外绒控制、节点语义和修改器输入。另选导向 1,328 的控制点 6 沿 X 移动 0.002，其实际成员集合 42 根全部变化，最大位移 0.00660835；集合外位置与半径逐位相同，毛根不动、恢复后逐位一致。独立探针与生成器导向 0 的 39 根探针分别记录，不混用。检查未渲染或保存输入工程，不评定视觉相似度。

成功预检 tag 为 `gn-nearest-live-3`，`rendered:false` 且无 PNG；最初 `gn-nearest-3` 读取代码失败只留下源快照，保留失败记录。实际渲染冻结 `.gn-source.py` 的 SHA-256 为 `be7730c0ddba22109ebc31dd44e8660672df7fd2cb8d361093688ce9fcc2c927`，使用自己的冻结基础源与官方资产库复现：

```powershell
& 'D:/codex/home/cache/plush-lab-tools/blender/blender-5.2.2-windows-x64/blender.exe' -b --factory-startup --disable-autoexec --python-exit-code 1 --python 'projects/005-plush-lab/artifacts/cycles-study/swatch-reference-gn-nearest-render-3.gn-source.py' -- --preset gn3 --tag review-gn3-1 --resolution 768 --samples 96
```

### GN4：只缩短底绒，露出不等于厚实卷绒

从实际保存的 GN3 工程载入，只将 90,000 条底绒每个点围绕固定毛根缩至 **0.35 倍**，包含横向展开；毛根逐位恢复，半径与数量不变。外绒的原生与评估后曲线、导向、飞毛、节点、材质、镜头与灯光保持。保存后重新加载检查一致，5 个 GN3 输入文件的 SHA 前后相同。没有重新随机生成整份资产。

[GN4 实际 PNG](../artifacts/cycles-study/swatch-reference-gn-undercoat-short-live-4.png) / [可编辑工程](../artifacts/cycles-study/swatch-reference-gn-undercoat-short-live-4.blend) / [CPU 预检报告](../artifacts/cycles-study/swatch-reference-gn-undercoat-short-live-4.gn-report.json) / [实际 GPU 凭证](../artifacts/cycles-study/swatch-reference-gn-undercoat-short-live-4.render.json)。RTX 4070 Laptop / OptiX 实际渲染 **11.68 秒**，768 × 768、96 样本。CPU 参数 JSON 和预检报告保留 `rendered:false`，渲染完成的事实由独立 `.render.json` 的 `rendered:true`、实际 PNG 与工程 SHA 记录；不回写预检历史。

同口径几何包络测量显示，底绒毛冠中位高度从 0.01455 降到 0.00493；正面外绒高于局部底绒 P95 的平均弧长比例从 6.39% 升到 55.15%，毛冠低于该包络的比例从 75.04% 降到 5.87%。这是椭球梯度距离与曲线采样的近似，**不是逐像素可见率**。外绒坐标未改变，原先深入表面的部分也未修复。[测量范围与输入哈希](../artifacts/cycles-study/swatch-reference-gn-undercoat-short-live-4.prediction.json)。

实际并排看图，小毛束稍更明显，但总体仍是薄碎的短毡；未看到大面积裸露底材，也没有得到参考的厚实、松散小卷绒。因此不能将 55.15% 的几何包络数值当成画质提升幅度。随后逐节点检查卷束的表面下陷，结果见 GN5。参考外观仍未通过验收。

[GN4 独立保存工程检查](../artifacts/cycles-study/hair-nodes-render-validation-v4.json) **147 / 147 项通过**，15 个输入文件 SHA 前后相同。独立从保存 GN3 重算全部 1,080,000 个底绒点，精确符合固定根缩放；半径、根、曲线偏移及其他属性逐位保持。外绒原生与评估数据、导向、飞毛、GN、材质和完整场景控制与 GN3 一致；实际 GPU 凭证的工程 / PNG / 包装源哈希吻合。导向 1,328 / 控制点 6 的独立探针仍只影响对应 42 根，组外、根与恢复结果逐位不变。验证没有渲染或保存输入工程，不替代参考视觉验收。

冻结包装器 `.source.py` SHA-256 为 `5b1d9049cec289828a6e354ce334d37873fa8343c4f5a0aa848315732125609c`，加载的是 GN3 保存工程；GN3 的基础源与节点源分别作为输入保留。初次 `gn-undercoat-short-4` 因把 Blender 加载时自动分配的 `session_uid` 纳入重载比较而停止，留下的工程与源保留，无 PNG。成功 tag 为 `gn-undercoat-short-live-4`，已排除该运行态标识，持久几何与节点比较仍严格执行。

### GN5：长度恢复压低了卷束，关闭后仍需增加体积

从保存 GN4 逐节点读取外绒，分别观察 Curl、Clump 与外接 Restore 的求值位置。官方 [Restore Curve Segment Length 文档](https://docs.blender.org/manual/es/latest/modeling/geometry_nodes/hair/utility/restore_curve_segment_length.html)说明 Factor 为 0 时保留当前段长，为 1 时恢复 Reference Position 定义的参考段长。本机官方资产内部用当前段方向配合参考段长，再累积重建曲线；这里外接节点使用原始直毛 rest，Clump 内部的 Preserve Length 则以卷曲后的输入为参考。两步的参考形态不同，外接恢复会再次改变已经形成的卷束。这是本项目节点组合与参考选择的问题，不能据此说官方保长节点失效，或所有保长方法都会压低毛发。

| 保存 GN4 的逐节点阶段 | 全部外绒毛冠中位高度 | 至少一处低于表面 0.001 的曲线比例 | 低于该阈值的平均弧长比例 |
| --- | ---: | ---: | ---: |
| Curl 输出 | 0.02126 | 0% | 0% |
| Clump 输出（内部 Preserve Length 开启） | 0.01617 | 0.3294% | 0.00930% |
| 外接 Restore 输出（Factor 1） | 0.01317 | 44.5176% | 7.3546% |

上述高度由解析椭球梯度近似，每个 Catmull–Rom 段取 8 点 Gauss–Legendre 样本；0.001 是对象 / 场景单位，不能称毫米。比例不是逐像素穿入率、可见率或视觉分数。[阶段诊断](../artifacts/cycles-study/swatch-reference-gn-restore-off-live-5.stage-diagnostic.json)记录原来真实 CPU 会话的输出；当时没有写入独立原始输出文件，因此后来依据工具 stdout 转录，同时保留[实际测量脚本快照](../artifacts/cycles-study/swatch-reference-gn-restore-off-live-5.stage-source.py)与[转录来源、输入哈希和复测方法](../artifacts/cycles-study/swatch-reference-gn-restore-off-live-5.stage-provenance.json)。没有把转录伪称第二次独立测量。

新增 GN5 从保存 GN4 载入，**只将外接 Restore 的 `Input_3`（Factor）由 1 改为 0**，Clump 内部 Preserve Length 仍为 true。原生外绒、2,657 条导向、0.35 倍底绒、飞毛、所有原生半径和毛根、其余节点与材质、灯光、镜头保持。毛量、768 × 768 分辨率和 96 样本保持，不重新随机生成。RTX 4070 Laptop / OptiX 实际渲染 **10.19 秒**，该时间只包括本次渲染，不含此前 CPU 制作与预检。[GN5 实际 PNG](../artifacts/cycles-study/swatch-reference-gn-restore-off-live-5.png) / [可编辑工程](../artifacts/cycles-study/swatch-reference-gn-restore-off-live-5.blend) / [CPU 预检与实际几何报告](../artifacts/cycles-study/swatch-reference-gn-restore-off-live-5.gn-report.json) / [实际 GPU 凭证](../artifacts/cycles-study/swatch-reference-gn-restore-off-live-5.render.json)。CPU JSON 的 `rendered:false` 原样保留，实际完成由独立 GPU 凭证和 PNG 证实。

未改节点的沿长 Profile 会随曲线变形重新计算，所以**求值后半径并非全部不变**：1,020,000 个外绒点中 869,159 个半径变化，占 85.2117%，最大绝对差约 0.0000721943；全部有限且为正。原生半径与求值毛根半径仍逐位不变。冻结包装器 `.source.py` 的 SHA-256 为 `55bb71225b66485972ecf1fa693ba9d06baff28e827135413fd81549dcc30abf`。初次 `gn-restore-off-5` 因没有允许这种派生半径变化而停止，失败源与日志仍保留；成功候选为 `gn-restore-off-live-5`，没有静默放松原生数据比较。

GN5 全部外绒毛冠中位高度为 0.01617，正面为 0.01617；低于表面 0.001 的曲线比例为 0.3294%，平均弧长比例为 0.00930%。这与原来 Clump 输出一致，表面下陷大幅减少但未完全消失。独立以 32 阶积分重新测量最终样条弧长，相对原直毛 rest 的绝对漂移 P95 为 **41.60948%**、最大 **121.80261%**，不能沿用 GN3/GN4 的 1.08363%，也不能称原 rest 长度保持。Clump 内部保长与原直毛 rest 保长是不同约束；平均弧长接近不意味着逐根保持。

实际并排看 GN4→GN5，表面出现更独立的小卷束和更清楚的束间暗部，薄毡感有所减少；仍像较薄的卷片，厚度、蓬松体积和自然变化尚不足。**参考外观仍未验收通过。** 下一步先比较小样的导向回弯体积与不均匀结簇，再调整光色、应用完整角色；不以结构指标改善代替舒适毛绒的看图判断。[实际前后对照](../artifacts/cycles-material-study.html#restore-study)提供完整 11 份真实产物与诊断来源文件。

[GN5 独立保存工程检查](../artifacts/cycles-study/hair-nodes-render-validation-v5.json) **132 / 132 项通过**，17 个输入文件 SHA 读取前后相同。实际完整节点图仅外接 Factor 默认值变化；原生控制、底绒、导向、飞毛、场景与网格拓扑保持 GN4。求值后的曲线数量、偏移、毛根和除位置 / 半径外属性逐位保持；四个官方节点组内容仍与本机资产库一致。导向 1,328 / 控制点 6 沿 X 移动 0.002 的独立探针，只影响对应 42 根外绒，最大位移约 0.00391885；组外、毛根与恢复结果逐位相同。检查读取实际保存工程和 GPU 凭证，没有渲染、保存或改写输入；这些通过项不代表保长通过或视觉达标。GN4 校验器与所有旧报告保持原字节。

### GN6：末端散开增加了分布厚度，实际外观改善有限

在保存 GN5 上新增 **0.006 / 0.009 两个单变量候选**，只改变 Clump 修改器暴露的 `Socket_8 / Tip Spread`，原值为 0.003。官方 [Clump Hair Curves](https://docs.blender.org/manual/en/5.2/modeling/geometry_nodes/hair/guides/clump_hair_curves.html)将该参数定义为避免毛束尖端完全聚拢的散开变化。本机官方节点内部使用按 Curve ID 产生的随机向量，乘以该标量并转换到导向的 Normal / Binormal / Tangent 坐标系；因此数值是空间位移幅度，不是百分比。没有用很大的无量纲数值去“放大体积”。

| 实际保存与渲染候选 | Tip Spread | GPU 渲染时间 | 看图判断 |
| --- | ---: | ---: | --- |
| GN5 控制 | 0.003 | 10.19 秒 | 可辨 C 形小卷片，仍薄 |
| GN6 小幅散开 | 0.006 | 7.03 秒 | 局部小变化，整体接近 GN5 |
| GN6 较大散开 | 0.009 | 14.24 秒 | 束尖稍松、略散乱，主体仍薄 |

均为同镜头、灯光、材质、768×768 / 96 样本；时间为各次实际渲染，不是性能基准。[三张等尺寸实际图](../artifacts/cycles-material-study.html#bundle-volume-study) / [0.006 工程](../artifacts/cycles-study/swatch-reference-gn-tip-spread-006-live2-6.blend) / [0.009 工程](../artifacts/cycles-study/swatch-reference-gn-tip-spread-009-live2-6.blend)。保留每个候选的 PNG、工程、冻结源、CPU 参数、几何报告、预检日志、GPU 凭证与实际渲染日志。CPU 的 `rendered:false` 不回写，GPU 凭证另存 `rendered:true` 与实际文件 SHA。

全部原生毛丝、原生半径、毛根、导向、最近映射、0.35 倍底绒、飞毛与场景保持。外接 Restore Factor 为 0，Clump 内部 Preserve Length 开启。求值后的外绒位置和沿长 Profile 派生半径允许变化并单独记录，不将派生变化误称原生数据改变，也不新增原 rest 保长结论。成功 tag 为 `gn-tip-spread-006-live2-6`、`gn-tip-spread-009-live2-6`，冻结 `.source.py` SHA 为 `56f0991c6b40aec0efe72065ddc3ebdf9b0030ec189eedc454eee97b56c8f06d`。初次 `live-6` 因报告代码在重载后访问失效的节点对象而停止；其保存文件与源继续保留，无 PNG，修正后用新 tag 重新保存，不将失败产物计入成果。

预实验[机制探针来源](../artifacts/cycles-study/gn-tip-spread-mechanism-1.provenance.json)保留真正源码、同源 CPU 重放的 raw stdout 与结果；它是敏感性测量，不是保存 GN6 的独立验证。GN5 导向中心线的 PCA 最小 / 最大标准差之比中位数为 0.01387，接近平面。末端子毛中心位置云三维 PCA 小 / 大标准差比中位数随 0.003→0.006→0.009 为 0.2706→0.4210→0.5071。这个数只描述中心线分布，**不等于纤维实体体积、遮挡、画质或视觉验收**。保存候选的验证另外在实际导向的法平面上比较横截面，不混用两个口径。[GN6 独立保存文件检查](../artifacts/cycles-study/hair-nodes-render-validation-v6.json)。

同口径椭球梯度距离近似中，至少有一点低于表面 0.001 的曲线比例由控制的 0.3294% 升到约 0.66% / 1.84%。0.001 是对象 / 场景单位，不是毫米；探针历史键名含 `1mm`，其代码阈值实际仍是 0.001 场景单位。增加展开同时增加了下陷，不能只选择分布更饱满的指标。该测量不包含接触求解，也不是逐像素穿入率。

独立校验直接读取三份保存工程，**130 / 130 项通过，22 个输入文件 SHA 前后相同**，没有渲染或保存输入。完整 GN 图及全部原生属性保持，仅 Tip Spread 输入变化；派生位置 / 半径另测，两个实际 GPU 凭证的工程、PNG、冻结源哈希吻合。导向 1,328 的控制点 6 沿 X 移动 0.002，只影响实际对应的 42 根子毛，组外与毛根不变、恢复后逐位一致；两候选最大位移分别为 0.00367626 / 0.00355588。

横截面使用同一导向的实际中央差分切向，在法平面投影成员中心位置并计算两轴标准差；覆盖 2,652 / 2,657 组、84,982 / 85,000 根毛，排除成员少于 6 的 5 组 / 18 根。控制点 9 的短 / 长轴比中位数为 0.5519→0.6707 / 0.7361，短轴标准差中位数为 0.00214678→0.00283832 / 0.00359930 场景单位。全部成对差值、其他控制点及口径记录在验证报告。这与上述三维末端 PCA 是不同测量；两者都只反映中心线分布，不构成实体卷束体积或视觉达标证据。

由于图像接近，额外用只读 CPU RenderEngine 读取真正 `RENDER` 依赖图，并与 `VIEWPORT` 对照。三份工程各自的评估位置与半径逐位相同；三者之间的位置 SHA 不同，可渲染标志与修改器 `show_render` 均正常。006 / 009 相对 GN5 的平均位置变化仅为 0.00112 / 0.00224，卷束中心形态保持。由此排除了“渲染没有用到本轮 GN 修改”的疑点；不能仅据此认定底绒遮挡或具体像素原因。[检查源码与实际输出来源](../artifacts/cycles-study/gn-tip-spread-render-depsgraph-1.provenance.json)。

**这次没有得到足够的舒适毛绒改善。** Tip Spread 可以打散束尖，却没有重塑偏扁的 C/C/S 导向，也未引入自然的不同尺度结簇。下一步以同条件少量小样制作三维回弯导向和束内变化，参考 [Curl 的半径、频率与沿长控制](https://docs.blender.org/manual/id/5.2/modeling/geometry_nodes/hair/guides/curl_hair_curves.html)、[SideFX 泰迪熊制作流程](https://www.sidefx.com/docs/houdini/fur/teddybear.html)与 [Hair Clump 的宽度、沿长松紧和层级结簇](https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html)。这些 Houdini 能力目前是方法参考，没有运行其求解器。先验收厚实小卷、连续毛层和柔软轮廓，再应用完整角色并调整光色。

复现只保存新候选时，使用新的 tag；实际渲染使用该候选冻结源，已有资产拒绝覆盖：

```powershell
& 'D:/codex/home/cache/plush-lab-tools/blender/blender-5.2.2-windows-x64/blender.exe' -b --factory-startup --disable-autoexec --python-exit-code 1 --python 'projects/005-plush-lab/tooling/blender/plush_bundle_volume_study.py' -- --no-render --value 0.006 --tag review-tip-006-1
& 'D:/codex/home/cache/plush-lab-tools/blender/blender-5.2.2-windows-x64/blender.exe' -b --factory-startup --disable-autoexec --python-exit-code 1 --python 'projects/005-plush-lab/artifacts/cycles-study/swatch-reference-review-tip-006-1.source.py' -- --render-saved --tag review-tip-006-1
```

### GN7：用上立回弯导向制作三维小卷束

2026-10-03 新增两个独立候选，从保存 GN5 控制工程读取，不重新随机生成毛根。只替换 **2,657 条可编辑 guide 的非根 position**：沿曲面法向先立起，再向侧后方回弯，第三轴幅度系数分别为 0.08 / 0.16。两幅均使用旧 guide 的实际样条弧长作为造型尺度；没有输出弧长归一。毛根、全部原生半径、曲线数量、ID、最近根映射、历史 rest_position、底绒、飞毛、网格与场景、官方 GN 链及 Tip Spread 0.003 保持。派生外绒位置和沿长 Profile 半径随形态重算，另列测量。

本机官方 Curl / Clump 节点与 Cycles / Chiang 纤维散射实际运行；**上立回弯冠的具体形态是本项目作者的 groom 制作选择**，不是论文算法、官方预设或 Houdini 求解器输出。Blender [Curl 的沿长半径与频率控制](https://docs.blender.org/manual/en/5.2/modeling/geometry_nodes/hair/guides/curl_hair_curves.html)和 SideFX [Hair Clump 的 Profile、宽度与层级结簇](https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html)用于理解制作环节，Houdini 尚未运行。

| 同条件实际图 | 第三轴幅度系数 | GPU 渲染时间 | 目视结论 |
| --- | ---: | ---: | --- |
| GN5 控制 | 旧 C/C/S 导向 | 10.19 秒 | 薄碎卷片较明显 |
| GN7 第一候选 | 0.08 | 15.50 秒 | 小束更立起，边缘小团起伏增多 |
| GN7 第二候选 | 0.16 | 14.89 秒 | 接近第一幅，没有明确额外视觉收益 |

均为原镜头、灯光、材质、768×768 / 96 样本；时间只计本次实际渲染，不能作性能基准。[三张等尺寸真实图](../artifacts/cycles-material-study.html#structural-groom-study) / [0.08 工程](../artifacts/cycles-study/swatch-reference-gn-crown-008-live-7.blend) / [0.16 工程](../artifacts/cycles-study/swatch-reference-gn-crown-016-live-7.blend)。每幅保留 PNG、工程、冻结源、CPU 参数、几何报告、预检日志、GPU 凭证及渲染记录；CPU `rendered:false` 保持原记录，实际完成由单独的 GPU 凭证证明。

冻结制作源码 SHA-256 为 `ce8d69473c06f0365b75fe3c4e3de3b87988720aeacd30757e2a183b10d22a60`。0.08 工程 SHA 为 `8ac53a154987ab41d22fb0058444b902bcdf299f555f4706e360b94609c93354`；0.16 为 `4ca3dea47f61dfbb335100d84e4f1c6b8c11a1fb0b3d2493539ffcbf54bfb93a`。实际源、允许改动、局部坐标系与公式均记录在各候选 `.gn-report.json`。

[GN7 独立保存资产报告](../artifacts/cycles-study/hair-nodes-render-validation-v7.json)实际 **157/157 项通过、26 个输入 SHA 前后一致**。新验证器只读运行 CPU，未渲染或保存输入；重建全部 2,657 条 guide 的造型公式并逐位比较，检查允许改动、固定原生数据与场景、官方节点、二次重载，以及实际 GPU 凭证与工程、PNG、冻结源哈希。导向 1,328 / 控制点 6 的 X+0.002 探针在两候选中均只改变其真实映射的 42 根子毛，组外、毛根与恢复逐位一致。报告 SHA 为 `e38fe3cb0853886808011eca860176d8331d70ac87f4d1e8039ab1abb2e28748`。

独立采样亦记录：相对原生历史 rest 的外绒样条弧长绝对漂移 P95 为 44.01% / 45.08%，不能称原 rest 保长。子毛在法平面内的两个标准差之比没有随导向更非平面而全面改善；0.16 在部分截面反而低于 0.08。因此不能由导向平面残差或冠高，推出更圆的毛束、实体体积、物理接触或参考视觉达标。

生成测量中，导向毛冠中位高度约 0.01862→0.02539 / 0.02540，外绒毛冠中位高度约 0.01617→0.02108 / 0.02068。低于解析椭球表面 −0.001 的外绒曲线比例约 0.3294%→0.0612% / 0.0306%；阈值为场景单位而非毫米。这是样条采样与梯度距离近似，不是逐像素可见率、物理接触或画质评价。导向弧长比旧控制的中位数约 1.05414 / 1.15587，不能称毛丝更短或原 rest 长度保持。中心线对最佳拟合平面的偏离增加也只证明导向更非平面，不能代表实体纤维体积。

**参考外观仍未验收。** 实际图的上立小团与轮廓起伏有改善，薄 C 卷片减少；下半部仍有细长亮丝与密集暗部，局部尺度和方向变化还不自然。两幅之间差异小，暂不以更大的幅度挑选“成功母版”。样片是椭球，与参考星仔的形体、观看角度不同，只用于判断毛料趋势。下一步先制作不均匀、不同尺度与沿长松紧的短卷团，再匹配完整角色与光色；不以工程验证通过替代看图验收。旧 v6、GN1–GN6、全部网页与个人创作继续保留。

**为什么冠高增加约三成，画面改善仍有限？** 冠高只测单条曲线离开解析表面的最大高度，没有测簇的层级、投影厚度或遮挡。导向与子毛数量、最近根分组、三种原型轮换、底绒和飞毛、材质响应保持；从图像推断，重复尺度与长丝尾部使增加的高度仍读作细碎毛簇。这是制作判断，尚未进行逐像素遮挡归因。下一项以 0.08 作为待验收的制作起点，先区分长亮丝属于外绒还是飞毛，再只缩短被证实的那一层；制作主卷冠内含更短子卷、大小与方向不齐的两级卷团。每项单独看真实图，完整角色适配时改用各部位实际表面法向。

复现时使用新 tag，已有产物会阻止覆盖；GPU 阶段直接读取本次冻结源与已保存工程：

```powershell
& 'D:/codex/home/cache/plush-lab-tools/blender/blender-5.2.2-windows-x64/blender.exe' -b --factory-startup --disable-autoexec --python-exit-code 1 --python 'projects/005-plush-lab/tooling/blender/plush_structural_groom_study.py' -- --no-render --amplitude 0.08 --tag review-crown-008-1
& 'D:/codex/home/cache/plush-lab-tools/blender/blender-5.2.2-windows-x64/blender.exe' -b --factory-startup --disable-autoexec --python-exit-code 1 --python 'projects/005-plush-lab/artifacts/cycles-study/swatch-reference-review-crown-008-1.source.py' -- --render-saved --tag review-crown-008-1
```

### GN8：分层实际渲染，定位长亮丝的来源

2026-10-03 从保存的 GN7 0.08 工程新增四组可见性对照，仅改变外绒、底绒、飞毛三个对象的 `hide_render`。承载曲面、地面、灯光和相机始终保留。曲线、根、原生与求值半径、rest、映射、导向、节点和材质固定，仍为 768×768 / 96 样本、Cycles / Chiang、RTX 4070 Laptop OptiX。

| 独占资产名 | 显示毛层 / 可见毛量 | 实际 GPU 渲染 | 实际看图结果 |
| --- | --- | --- | --- |
| `swatch-reference-gn-coat-only-8` | 外绒 / 85,000 | 6.37 秒 | 小尖簇与扁扇状束明显，下方仍有细钩尖，不能靠隐藏飞毛解决全部束形问题 |
| `swatch-reference-gn-undercoat-only-8` | 底绒 / 90,000 | 3.88 秒 | 连续的细密短绒底层，轮廓平滑，没有外绒小团形态 |
| `swatch-reference-gn-flyaway-only-8` | 飞毛 / 2,500 | 3.79 秒 | 顶部与右侧有明显细长亮丝，与先前完整图的突兀轮廓对应 |
| `swatch-reference-gn-no-flyaway-8` | 外绒 + 底绒 / 175,000 | 6.26 秒 | 轮廓更干净，长亮丝明显减少；小束仍密、尖、薄，参考毛料未验收 |

[完整 GN7 与隐藏飞毛的真实前后图，以及单层诊断](../artifacts/cycles-material-study.html#layer-source-study)。这组结果支持先把飞毛层隐藏作制作对照；飞毛曲线没有删除，可以重新启用。单层图毛量不同，且隐藏毛层会改变遮挡和阴影，**不是等密度质量比较，也不是逐像素加法分解**。没有把“长亮丝主要来自飞毛”扩大成“所有细亮尖端都来自飞毛”。

四组均新增 `.blend`、冻结 `.source.py`、CPU `.json` / `.gn-report.json`、预检日志、PNG 与独立实际 `.render.json` / `.render.log`。制作器为 [plush_layer_isolation_study.py](../tooling/blender/plush_layer_isolation_study.py)，冻结源 SHA 为 `0c8c14cc9d13c9d436f00f5b2c0d14b3b8acc800a3ffc007325d22aa4fad3dd0`。CPU 预检仍为 `rendered:false`；`--render-saved` 从已保存工程真实渲染，校验工程、图片与自身冻结源哈希，不重新保存工程。`.render.log` 保存渲染凭证 JSON，不冒充 Blender 的完整控制台日志。

[独立验证器](../tooling/blender/validate_layer_isolation_assets.py)直接读取四份保存工程及 GN7 控制，验证全部原生与求值数组、节点、场景和所有对象 / 修改器可见性，仅放行上述三个 `hide_render`。各工程二次重载一致，PNG 解码与真实 GPU 凭证对应。[新只读报告](../artifacts/cycles-study/hair-layer-validation-v8.json) **132 / 132 项通过，42 个实际输入 SHA 前后一致**；旧报告和工程没有改写。这些检查证明对照可靠，不评定与参考图的相似度。

### GN9：实际接入父导向层，外观变化仍有限

从 GN8 关闭飞毛的保存工程新增两份层级 groom，使用本机 Blender 官方 **Clump Hair Curves** 预处理导向，再由原有外绒节点读取实际求值结果。新的共同方案包括非父导向缩短与父级实时节点，是复合制作候选；两份候选只在父级强度 0.40 / 0.65 上不同。

| 候选 | 父级强度 | 实际 GPU 渲染 | 看图结果 |
| --- | --- | --- | --- |
| `swatch-reference-gn-hierarchy-soft-live-9` | 0.40 | 8.94 秒 | 与 GN8 的总体变化较小，仍密集短尖、小扇簇与短钩 |
| `swatch-reference-gn-hierarchy-firm-live-9` | 0.65 | 8.68 秒 | 与 0.40 难以明显区分，没有清晰更厚、圆润的绒团 |

[三张真实对照图](../artifacts/cycles-material-study.html#short-bundle-study)。两张均为 768×768、96 样本、相同镜头与灯光、相同毛发材质，渲染 85,000 根外绒与 90,000 根底绒。2,500 根飞毛原生数据保留，只隐藏。实际生成 PNG、可编辑 `.blend`、冻结源、CPU 参数与预检、节点报告、GPU 凭证分别独占保存，没有覆盖旧版本。

从 2,657 条既有 guide 的实际毛根中，确定性最远点采样选 900 条父导向；按最近父根建立独立 `hierarchy_parent_index`。每个父导向实际含 1–9 条 fine guide，中位数 3；其下外绒实际为 25–260 根，中位数 88.5。原 85,000 个 child→fine 索引不变，每条 fine guide 的 child 数仍为 2–63、中位数 32。父→fine 与 fine→child 使用两个明确的映射，构成实际层级，而非把同一个索引重复传给两次 Clump。

900 条父导向原形保持；其余导向在自身固定毛根周围，将非根控制点位移缩至 0.72 倍，保留旧 `rest_position`。父级沿长因子为 `s × smoothstep(clamp(t/0.40)) × [1 − 0.25 × smoothstep(clamp((t−0.65)/0.35))]`，`t` 为 Spline Parameter Factor，`s` 为上表强度；父导向自身 Factor 为 0。父级 Shape / Tip Spread / Clump Offset 均为 0，内部 Preserve Length 开启。之后锁定全部毛根和父导向的所有点，并恢复全局 fine 索引；原 coat 的 Curl、末级 Clump、外接 Restore=0 与沿长 Profile 保持。导向、外绒的求值位置和 Profile 派生半径允许随之变化，不能称整套派生数据固定。

两份冻结制作源 SHA-256 均为 `9b2c4fe56ad084de6e4deb138fdfff7b6755e59a6ce0647d5c5f7c69f1e107f7`。CPU 报告继续保留 `rendered:false`；实际 `rendered:true` 凭证核对工程、PNG 与源 SHA，不能用预检代替真实渲染。生产探针编辑父导向 1279 的一个非根点，沿实际映射传播至 4 条 fine guide 下的 125 根外绒；组外与毛根保持，撤回后逐位恢复。该探针证明联动，不评定柔软感。

[独立保存工程复核 v9-r2](../artifacts/cycles-study/hair-hierarchy-validation-v9-r2.json)实际 **141/141 项通过，28 个输入 SHA 前后相同**。独立重建父锚点采样与最近邻映射、逐位复算原生缩短公式，并核对父级图和沿长因子、全部根及父锚点、原生属性、旧外绒链和场景；另选父导向 1780 / 控制点 6 进行临时扰动，2 条 fine guide 下的 78 根子毛全部联动，集合外、根、根半径和恢复结果逐位一致。软、紧两工程仅父级强度 0.40→0.65 不同；实际 GPU 凭证与工程、PNG、冻结源对应，两次重载一致。通过报告 SHA 为 `6a384cd5d7725f75ef368f361b2792bb0686d25b24cc7735bd5d589816b44386`。首轮[失败报告](../artifacts/cycles-study/hair-hierarchy-validation-v9.json)保留，修正验证器的求值属性分支名称，并对新增派生 metadata 作具体类型、数量和值断言；没有修改工程来让检查通过。

[实际只读几何诊断](../artifacts/cycles-study/gn-hierarchy-geometry-9.json)另存冻结源与运行日志，耗时 16.63 秒；三份工程与几何助手共 4 个输入 SHA 前后相同。53,758 / 85,000 根外绒求值控制点发生变化，余下 31,242 根沿固定父锚点保持。导向弧长配对比值中位数为 0.72190 / 0.72260，说明父节点没有抵消共同缩短。末级 Clump 后的近似冠高中位数从 GN8 的 0.0210805 降至 0.0166152 / 0.0159769，约降低 21.2% / 24.2%：整体缩放 XYZ 同时压低了毛冠。弧长采用指定 Catmull–Rom 模型积分，冠高采用解析椭球采样；都不是像素测量或柔软感指标。末段中心线云在末级 Clump 后继续收拢，但不能据此声称它完全消除了束体积。

**GN9 尚未达到参考外观。** 隐藏飞毛和增加父级组织都没有把小尖簇变成圆润的短卷绒；共同缩短也损失了毛冠高度。目前没有宽度感知的束内间距或接触求解。参考 [SideFX Hair Clump](https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html)可分别控制层级、沿长松紧与纤维宽度；本轮只借鉴层级组织思路，没有运行 Houdini，也没有复现其 Fractal 或 Accurate Bundling。具体采样、缩短与因子曲线是本项目的 groom 制作选择。下一主体控制应采用根部局部坐标中的紧凑三维回卷，通过回绕路径和端点回收收拢毛形，同时保留冠高与横向厚度，随后隔离末级收拢。这个方向待制作与看图验证，不继续把整体 XYZ 缩短或扫父级强度当作必然改善。

### GN10：三维回卷更圆，但聚拢仍压低最终毛层

2026-10-03 从保存的 GN8 关闭飞毛工程新增两组实际样片。2,657 条原生导向改为根部局部坐标中的三维回卷，末端向内回收；仅沿法向归一，逐条保留 GN8 的指定采样冠高。两组导向逐位相同，实际链接的末级 **Clump Factor 分别为 0.88 / 0**。这轮没有接入 GN9 的父图，也没有整体 XYZ 缩短；根、原生半径、rest、最近根映射、90,000 条底绒、隐藏飞毛及原镜头、灯光、材质保持。派生外绒位置和沿长 Profile 半径随形态重算。

| 相同条件实际图 | 实际 GPU 渲染 | 外绒冠高代理中位数 | 实际看图结果 |
| --- | ---: | ---: | --- |
| GN8 关闭飞毛控制 | 6.26 秒 | 0.0210805 | 尖簇、小扇束和轮廓锯齿仍明显 |
| GN10 回卷，Clump 0.88 | 7.55 秒 | 0.0167172，较控制 −20.7% | 尖簇减少、小团更圆，毛层也更紧、更平 |
| GN10 同一回卷，Clump 0 | 9.77 秒 | 0.0278719，较控制 +32.2% | 毛层升高，边缘出现较粗的开放钩圈，正面仍有扇簇 |

均为 768×768、96 样本、Cycles / Chiang、RTX 4070 Laptop OptiX，显示 85,000 根外绒与 90,000 根底绒；时间只表示本次渲染。[三张真实同条件对照](../artifacts/cycles-material-study.html#compact-coil-study)。**两组均未达到参考的细密、圆润、柔软卷绒。** 原生导向冠高中位约 0.02539075→0.02539074，最大配对误差约 6.16×10⁻⁸ 场景单位；但最终毛层高度没有随之保持。因此应分别看制作导向和实际求值毛丝，不能把前者的约束当作最终蓬松保证。导向弧长配对比值中位为 1.7288，回卷空间较紧凑并不等于路径更短，也没有历史 rest 保长。

冠高是保存浮点控制点的指定 Catmull–Rom 样条采样到解析椭球的近似离面高度，弧长采用指定积分模型；都不包含纤维实体宽度、接触、逐像素遮挡或柔软感。0.88 与 0 之间只隔离实际 Clump 输入，仍保留 Curl 和 Profile。关闭整个聚拢只能说明这条实际链的影响，不能推出单独 Curl 的画质或参考作者采用的算法。

制作器 [plush_compact_coil_study.py](../tooling/blender/plush_compact_coil_study.py)的冻结源 SHA 为 `b72713f128b68ad2b344216f22c34e3046a61e8f1933ed1909fb49d4cd74f5c8`。成功资产为 `swatch-reference-gn-compact-coil-clumped-live3-10` / `swatch-reference-gn-compact-coil-unclumped-live3-10`，每组新增工程、冻结源、CPU 参数、几何报告、预检日志、PNG、实际 GPU 凭证和渲染记录。CPU `rendered:false` 原样保留，实际完成由独立 `rendered:true` 凭证及工程 / PNG / 源 SHA 对应证明。[工程和来源展开区](../artifacts/cycles-material-study.html#compact-coil-evidence)。初次制作设置了被外部输入覆盖的节点默认值，预检未通过；第二次在保存重开后访问失效的 RNA 引用而停止。失败源、日志及已存文件保留，不将这些资产当作完成渲染。成功版本读取实际链接的 `Socket_6`，并在重开后重新取得场景对象。

[独立只读验证](../artifacts/cycles-study/hair-compact-coil-validation-v10.json)实际 **174 / 174 项通过，32 个输入 SHA 前后一致**，没有渲染或保存输入。独立重建全部回卷公式并逐位对照，验证两组的实际 `Socket_6` 0.88 / 0、原图链接与默认值不变、真正求值外绒差异、场景与原生数据、每组两次磁盘重载及 PNG / GPU 凭证哈希。另选导向 1,328 的控制点 6 沿 X 移动浮点 0.002，42 / 42 根实际映射子毛响应，组外零变化、毛根与根半径逐位保持、恢复后整场景一致。沿长 Profile 派生半径约 85.21% / 85.22% 的控制点随求值形态改变，不误称原生半径变化。报告 SHA 为 `a19cf24a15bf4aeb5362d75d8f886addf6402938782183f4c7c0d485b9cb5bc3`；这些检查证明工程与对照可靠，不替代视觉验收。

具体回卷公式是本项目的 groom 制作选择。本机 Blender 官方节点和 Cycles 纤维散射实际运行；[SideFX Hair Clump](https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html)提供沿长松紧、宽度感知间距与层级结簇的方法参考，Houdini 尚未运行，Accurate Bundling / Fractal 和接触约束尚未实现。下一步应在现有回卷上制作沿长松紧和明确的束内空间分布，避免整条毛丝同时收紧或全部放开；随后再验证更细尺度、不齐的卷团。仅扫全局 Clump 强度不足以解决目前的扇簇与粗钩取舍。先看图验收毛料，再匹配完整浅蓝星仔、黑帽和光色；旧 v6、全部历史工程、网页创作和个人记录保留。

只读复核实际节点进一步发现：当前 Clump 的 Shape=0.20 在中段已经收束，Factor=0.88 同时将冠部拉向共同导向；它按根部偏移、导向坐标架和沿长权重构造中心线，没有读取纤维半径来求束内间距。后置 Set Hair Curve Profile 只改粗细，不能单独消除中心线扇簇。下一项先保持 GN10 导向、Shape=0.20、Tip Spread=0.003 和 0.88 峰值，只引入沿长的有效 Clump Factor 场，试验线性控点 `(0,0), (0.18,0.15), (0.40,0.25), (0.65,0.25), (0.85,0.75), (1,1)`，保留卷冠展开、收回末段。这些是项目试验值，**尚未制作或渲染**；需同时记录它与节点内部 Profile 相乘后的权重，并比较实际子毛冠高、同导向组的中段 / 末端横向展开和真实 PNG，不能只凭高度增加判定成功。Curl Random Offset=0 和三种导向原型可能使方向重复，是待隔离验证的推断。

GN10 接入后的统一复核：[页面报告](../artifacts/cycles-study/page-validation-gn10.json)通过，43 个图片元素、32 张不同图片全部解码且非空；273 个不同本地文件链接返回 200 且非空，16 个锚点和 15 个章节有效。原有 40 个图片引用与 254 个本地链接无缺失，v6 主图保留。1440 / 768 / 390 / 320 像素宽度下，新三图等宽，折叠与展开证据均无整页横向溢出；控制台、页面、请求失败和远程请求均为 0，桌面与手机实际截图已目视复核。最终标题调整后再次等待图片解码并验证四种屏宽、折叠与展开布局，最终 HTML SHA 为 `a2eba24f8fd124f678f3d325e080dc8307a368d4ccd50a87afd5e20e65c53e9e`。首次补充检查未等待解码而提前失败，修正等待后通过；没有据此修改样片或页面。

四个网页入口构建成功，既有记录存储、搜索、备份 **43 项测试通过**。[记录面板复核](../artifacts/cycles-study/journal-validation-gn10.json)在新临时浏览器中检查 `index.html` 与 `splat.html`：共 87 条内置记录，搜索 GN10 找到进展、修改、原理、扩展四类共 4 条，分类、证据链接和清除筛选正常，页面错误为 0。[历史保留报告](../artifacts/cycles-study/journal-preservation-gn10.json)确认原 83 条内容与顺序 SHA 保持 `9536d07a3ed08a41bb98508ad3116681dea23fe978b90604f9f192bb519e5966`。未访问用户浏览器的个人作品存储。这些检查证明工程和展示可复核，**不构成参考毛料的视觉验收**。

### GN11：沿长松紧控制改善轮廓，正面毛束仍偏粗

2026-10-03 在保存的 GN10 三维回卷、Clump 0.88 工程上新增一条沿毛长的外部 Factor 曲线，实际渲染一张 768×768 / 96 样本 Cycles 图，OptiX 耗时 **12.42 秒**。[三张相同条件实图](../artifacts/cycles-material-study.html#clump-profile-study)依次为 GN10 整体聚拢、GN11 沿长控制、GN10 完全放开。新图轮廓稍高，顶部比完全放开的粗钩更收敛；与整体聚拢相比，正面变化有限，较粗的扇状毛束和方向重复仍明显。**尚未达到参考图的细密、圆润、柔软卷绒，不标为已验收母版。**

这轮只新增五个外层节点：从官方 Curl 输出的真实毛丝捕获 POINT 域 Spline Parameter Factor `s`，经过 VECTOR 控点 Float Curve、Clamp，再乘实际链接的 0.88，送入官方 Clump Factor。控点为 `(0,0), (0.18,0.15), (0.40,0.25), (0.65,0.25), (0.85,0.75), (1,1)`，是项目制作试验值。Shape=0.20、Tip Spread=0.003、内部 Preserve Length、后置 Profile 与全部原生数据保持；2,657 条导向、85,000 根外绒、90,000 根底绒、隐藏飞毛、镜头、灯光和 Chiang 材质均沿用 GN10。捕获的是该阶段实际沿长坐标，不是控制点序号；外部 Factor 也不是最终位移混合权重。

| 保存工程的实际求值 | GN10 整体 0.88 | GN11 沿长控制 | GN10 完全放开 |
| --- | ---: | ---: | ---: |
| 外绒冠高代理中位数 | 0.0167172 | 0.0202510 | 0.0278719 |
| 控制点 6 横向展开主轴代理中位数 | 0.0044220 | 0.0035178 | 0.0038440 |
| 控制点 11 横向展开主轴代理中位数 | 0.0044687 | 0.0025006 | 0.0042605 |

冠高比整体聚拢高约 21.1%，末端主轴展开代理下降约 44.0%；但中段同样收窄约 20.4%。因此“降低中段输入强度”不能写成“最终中段更宽”或“保持束体积”。冠高仍是指定 Catmull–Rom 中心线对解析椭球的采样代理；横向展开取至少 8 根子毛的 2,644 个同导向组，在原生控制点 5、6、10、11 上投影到固定导向切向平面，记录协方差特征值平方根。不同形态的控制点不对应相同弧长位置。这些统计不包含实体纤维宽度、接触、逐像素可见率或柔软评分。

实际字段检查覆盖 Curl 后的 87,657 条曲线、每条 12 个原生控制点，沿长坐标单调。VECTOR CurveMapping 引擎查表与理想线性插值的最大差约 0.002343，端点采用单独浮点容差，不宣称任意点严格解析线性。真实乘法字段按 float32 逐位核对；临时旁路到原 `Socket_6` 能逐位重现 GN10 毛丝位置和半径。正确刷新外层节点树后，常量 1 曲线也逐位重现基准，恢复试验曲线后整场景一致。临时移动导向 1,328 的控制点 5，42/42 根映射子毛响应，组外和毛根保持，恢复通过。

成功资产为 `swatch-reference-gn-clump-profile-live7-11`，保存工程、冻结源、CPU 参数与报告、预检日志、实际 PNG、GPU 凭证和渲染日志。[来源与下载展开区](../artifacts/cycles-material-study.html#clump-profile-evidence)。制作器为 [plush_clump_profile_study.py](../tooling/blender/plush_clump_profile_study.py)，冻结源 SHA `145239a928aeb057a7470ddeb81ff04612a2e7b71028e0738854ba471141247a`；工程 SHA `487e857487a6489bfb09371575d29ee6f793af460976ba1af593569f1382c26d`，PNG SHA `c05ca6cad5073b8d16956c2d032787c517b59d980b2846ec907a999f314014f6`。CPU `rendered:false` 保持原样，真实完成由独立 `rendered:true` 凭证证明。live1–live6 的失败源与日志全部保留；前检逐步修正字段端点容差、节点缓存刷新与连接顺序比较，未把失败资产当作渲染成果。

[独立只读验证](../artifacts/cycles-study/hair-clump-profile-validation-v11.json)实际 **134/134 项通过，43 个输入 SHA 前后保持**，未保存或渲染输入。独立核对五个新增节点和实际字段、原生数据与场景、原 Factor 旁路位级重现、完整恢复与两次磁盘重载；85,000/85,000 根外绒实际改变。另临时移动导向 1,328 的控制点 6，42/42 根映射子毛响应，组外零变化、毛根与根半径保持，精确恢复。根半径固定，但 869,031/1,020,000 个派生半径点随形态重算，不能误称求值半径全固定。独立横向代理另取至少 4 根子毛的 2,655 组，使用 n−1 协方差投影 RMS；控制点 5/6 的逐组配对中位比为 0.7563/0.8140，10/11 为 0.6104/0.5770，同样发现中段与末端收窄。此口径与上表的主轴标准差不同，不混用数值。报告 SHA `9b2f6380da8bf33f4b020b8932e993410483fbb5871078b651f7ce94d8baf14d`，验证器为 [validate_clump_profile_assets.py](../tooling/blender/validate_clump_profile_assets.py)。

[SideFX Hair Clump](https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html)说明沿长 Profile 与宽度感知 Accurate Bundling 是不同能力。本轮借鉴前者的制作方法，本机实际运行 Blender 官方节点和 Cycles；**Houdini 未运行，Accurate Bundling、Fractal 和纤维接触约束未实现。** 本轮说明单一沿长因子足以改变轮廓，却没有解决正面扇簇。后续应隔离束内空间分布、子丝相位和卷团尺度，先验证这一结构问题，再调整光色和完整角色；不继续将强度扫描当成参考效果必然达标。全部旧创作、历史工程和记录保留。

### GN12：束内相位确实生效，主要粗扇簇仍未打散

2026-10-03 从冻结 GN11 工程制作两组相位对照，保持三维回卷导向、最近根映射、沿长 Clump 曲线和 0.88 峰值、其他节点、镜头、灯光和 Chiang 材质。A 将官方 Curl 的 `Random Offset`（实际 socket `Input_16`）从 0 改为常量 1；B 只向子毛输入 1，向导向输入 0。相同 768×768、96 样本 Cycles / OptiX，真实渲染分别为 **9.00 / 8.79 秒**。[GN11→A→B 三张实图](../artifacts/cycles-material-study.html#curl-variation-study)中，局部丝纹和边缘有小变化，粗扇簇、横向层纹与开放小钩仍在。**尚未达到参考的细密、圆润、柔软卷绒；两组均未解决主要结构，不选作已验收母版。**

本机官方资产内，导向 ID 经 Sample Index 生成各毛束共享的随机相位，当前曲线 ID 另外生成 `[0,1]` 的随机值，再乘 `Input_16` 添加到共享项。旧值为 0 只关闭额外项，不能说旧版本完全没有随机性。B 新增一枚 SUBTRACT 节点把命名属性 `is_guide` 转为 `1−is_guide`；实际捕获 Curl 后、GN11 POINT 沿长捕获前的 CURVE 域，85,000 根子毛偏移为 1，2,657 条导向为 0，导向求值位置和半径逐位保持 GN11。A 的求值导向位置变化，半径保持。两组的原生导向和外绒数据、毛根、原生半径、rest、90,000 根底绒、隐藏飞毛均保持；后置 Profile 输入固定不等于最终派生半径固定。

[Blender Curl 文档](https://docs.blender.org/manual/en/5.2/modeling/geometry_nodes/hair/guides/curl_hair_curves.html)把 Random Offset 定义为每根曲线的额外卷曲相位。实际资产中的 Frequency 还乘以累计段长和内部系数，再参与角度计算，故不能把 0.85 写成每根固定 0.85 圈，也没有证据把 Random Offset 数值直接称弧度。显式 Guide Index 优先于距离和遮罩；本项目已固定最近根映射，单改 Guide Distance 不会生成更小的空间毛束。

| 实际求值中心线代理 | GN11 | A 全部曲线 | B 仅子毛 |
| --- | ---: | ---: | ---: |
| 外绒冠高采样中位数 | 0.02025096 | 0.02029814 | 0.02031098 |
| 相对 GN11 冠高变化 | — | +0.23% | +0.30% |
| 最终改变的外绒数量 | — | 85,000 | 85,000 |
| Curl 后导向位置逐位保持 GN11 | 基准 | 否 | 是 |

冠高是指定曲线采样相对解析椭球的代理，未计实体宽度、纤维接触或逐像素遮挡，不是柔软评分。束内切向展开统计有所改变，画面主要粗扇却仍明显，不能用统计扩散替代视觉改善。相位扰动无法充分改变当前原生回卷的主体形态，是本轮看图结果支持的制作判断；没有据此宣称唯一原因已经确诊。

成功 stems 为 `swatch-reference-gn-curl-phase-all-live2-12` 与 `swatch-reference-gn-curl-phase-children-live2-12`。[工程、来源与完整证据](../artifacts/cycles-material-study.html#curl-variation-evidence)新增保存八类文件；CPU `rendered:false` 保持，由单独 GPU `rendered:true` 凭证及匹配的工程、源和 PNG 哈希证明实际完成。制作器 [plush_curl_phase_study.py](../tooling/blender/plush_curl_phase_study.py)，冻结源 SHA `000bfcc5cff1c3680e4732d4c05759b50354ca37da59b6d8a9aa068bf72e963d`。A 工程 SHA `4fcd75ced4be561f74d2ee457e7c7d96b805969dcde5172a85f3115c4df28163`，PNG SHA `2588c2c9f6ad70c7e96875a80605233c10cccdabf39b9448348e4c6cd2e1cc69`；B 工程 SHA `2d12288fc6d28f3c891a50db0041ce82b8ed18de7711f0196e71963131d315c7`，PNG SHA `4847729f1d483e5488e00888e3185fdc094f42870997ecc93c8c6656cb11bc34`。首轮 socket 名称读取失败的冻结源与日志保留，不计入渲染成果。

[独立只读复核 r2](../artifacts/cycles-study/hair-curl-phase-scope-validation-v12-r2.json)实际 **138/138 项通过，64 个输入 SHA 保持**，验证器 [validate_curl_phase_scope_assets.py](../tooling/blender/validate_curl_phase_scope_assets.py)。核对两组真实 CURVE 字段、B 的全部导向位置与半径、原生数据和旧节点链、额外偏移临时归零逐位重现 GN11、导向响应探针与恢复、两次磁盘重载及真实渲染凭证。正常最终输出的 85,000 根子毛根和根半径两组均逐位保持；不能扩展成所有中间阶段保持。实际 Curl 中间子毛根两组各有 51,175/85,000 个位级不同，最大欧式位移为 `6.322027276634104e-8` 场景单位；A 导向根有 1,142/2,657 个不同、最大 `1.666000468656264e-8`，B 导向根无变化。这些是实际测量，不默认归因舍入，也不把场景单位换成毫米。

[首次失败复核](../artifacts/cycles-study/hair-curl-phase-scope-validation-v12.json)与[当时验证源码](../artifacts/cycles-study/gn12-independent-validator-first-failed.source.py)保留，两条“中间 Curl 根位级不变”断言失败；r2 单列中间真实偏移，并继续严格要求原生和最终根逐位固定，未改资产以通过检查。实际保存节点链的最终 RootLock 用 Spline Parameter Factor `< 1e-7` 选择根，再经 Set Position 设置为 `rest_position`、Offset 为 0，随后接 Group Output。这个节点锁的是位置，根半径保持由实际半径数组与 Profile 的 `root_radius` 链另证，不能混为一个能力。r2 报告 SHA `cd624cc4750d79d34f4424ed53ab9c8deecc748b173b320456b1cdbcb0636208`，验证器 SHA `c4f374f757ee8417bc6eb57475b1fbe4ef7214319c354bfd674e6a8d1e4a48a6`。这些检查证明改动范围与可复查性，**不代表外观已经达到参考**。

下一轮转向实际结构，先固定导向数量与最近根映射，绕每条根法线旋转整个原生回卷，隔离比较整体方位。刚性旋转保留导向路径的欧式长度与根法线投影高度，但曲面相对冠高和最终子毛长度仍可能改变；不额外归一来掩盖这种变化。随后分别比较更小的空间毛束和错开的长度；细化毛束需要真实更新导向与映射，不只是改距离参数。[SideFX Hair Clump](https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html)的毛束尺度、长度差异与多层组织是成熟制作参考。**Houdini 未运行，Accurate Bundling、Fractal 和宽度接触约束未实现。** 新方案尚未制作或渲染，仍要实际看图验收，之后才匹配完整星仔、黑帽与网页资产。本轮只追加四类 GN12 记录，原 91 条内容与顺序、全部旧工程及创作保留。

### GN13：整束方位改变，宽扇簇和横向层纹仍未解决

2026-10-03 从冻结 GN11 工程只改变整条原生导向的方位，保留 2,657 条导向、85,000 根外绒、90,000 根底绒、隐藏飞毛、原生半径、rest、最近根映射及全部官方节点和沿长 Clump 0.88 控制。768×768、96 样本 Cycles / OptiX，真实 GPU 渲染 **10.35 秒**。[GN11→GN13 等尺寸实图](../artifacts/cycles-material-study.html#coil-orientation-study)显示顶部、边缘和下侧的局部卷向改变，正面宽扇簇与横向层纹仍明显，整体接近旧样片。**尚未达到参考细密、圆润、松厚的柔软卷绒，不选为已验收母版。** 这排除了“没有执行修改”的疑点，不能据此断言所有粗扇的唯一原因。

设毛根为 `r`、相对控制点为 `v = p−r`，解析椭球根法线为 `n = unit(r / [0.64,0.43,0.54]²)`。按照原生导向顺序，用 `numpy.random.default_rng(12013)` 取 `[0,2π)` 的 2,657 个独立方位角，对整条导向统一应用 Rodrigues 旋转：`p′ = r + v cosθ + (n×v) sinθ + n(n·v)(1−cosθ)`。这是绕毛根法线的整束转向，与 GN12 官方 Curl 的额外束内相位偏移不同；不是绕根到物体中心的径向轴，也不是每个控制点单独打散。float64 计算后保存 float32，并恢复原根的位模式，没有二次冠高或弧长归一。

刚性旋转在精确数学中保持控制点间欧式距离、根法向投影与相应 Catmull–Rom 曲线的连续弧长。独立重建验证保存后根法向投影最大误差 `3.2000045849e−8`，GL32 导向弧长最大绝对漂移 `9.8843080429e−8`、最大相对漂移 `1.4060303347e−6`，均符合实际 float32 量化误差界。导向配对弧长比中位数 `1.0000000036`。**这些不变量不包含相对曲面的冠高或最终子毛形态**：椭球切向曲率随方位变化，后续 Curl / Clump / Profile 求值也不是整根子毛的刚性变换。

| 实际中心线代理（场景单位） | GN11 | GN13 |
| --- | ---: | ---: |
| 原生导向曲面冠高分布中位数 | 0.02539074 | 0.02539710 |
| 最终外绒曲面冠高分布中位数 | 0.02025096 | 0.02022876 |
| 最终外绒 GL32 弧长分布中位数 | 0.04232351 | 0.04230940 |
| 最终改变的外绒数量 | 基准 | 85,000 |

最终外绒冠高分布中位数变化约 −0.110%，弧长分布中位数变化约 −0.033%；这是两组分布的摘要，**不等于逐根长度保持**。逐根子毛配对弧长比中位数为 `1.0005891067`，范围 `0.6487673–1.5948863`、P95 `1.2260049`。曲面冠高采用每段八个 GL 采样点的解析椭球高度，弧长用每段 GL32 积分，中心线代理未计实体宽度、接触、像素遮挡或柔软感。物体未标定毫米，不能把这些场景单位直接改写成毫米。

新增成功 stem `swatch-reference-gn-guide-azimuth-live-13`，八类资产及[工程与证据](../artifacts/cycles-material-study.html#coil-orientation-evidence)独立保存。制作器 [plush_guide_azimuth_study.py](../tooling/blender/plush_guide_azimuth_study.py)，冻结源 SHA `94018212d0c0c5cbc063f71158cc92d5a88b59cb6b69ca374ce7cdb7a3296bcb`；工程 SHA `0aa862080ef2d2f4ef07c1eb06c09c1ad6feb7ce96975db45f1a61ed4095d8f4`，PNG SHA `eb19a8dd334886eca3d60c68ba804704a363858a94781dfea519fc00ef623a71`。CPU `rendered:false` 保持，由独立 GPU `rendered:true` 凭证及上述 SHA 证明真实完成。

[独立只读检查](../artifacts/cycles-study/hair-guide-azimuth-validation-v13.json)实际 **119/119 项通过，75 个输入 SHA 前后保持**。验证器 [validate_guide_azimuth_assets.py](../tooling/blender/validate_guide_azimuth_assets.py)独立重建所有导向旋转、量化误差界和弧长；临时恢复原导向逐位重现 GN11 求值，恢复新导向后逐位一致。移动导向 1,328 的控制点 6 的 X 值 0.002，仅 42/42 根映射子毛响应，组外零变化、恢复一致；两次磁盘重载及真实渲染 SHA 复核通过。原生及最终根和根半径严格逐位固定，中间 Curl 实际有一个子毛根位移 `1.8626451492e−9`、导向根零变化，未声称所有阶段固定。派生沿长半径有 `869,596/1,020,000` 个点响应，最大绝对变化 `3.7767982576e−5`；原生半径及最终根半径保持与沿长派生半径固定是不同断言。报告 SHA `40d1857c15ee0ab369925957256d64e0368b13b34c777fda48d2b538b3f62f62`，验证器 SHA `161fc89578434cec56929af6742009ac3de776d5333566154a3ffc0066aab84a`。工程检查证明作用范围，不能替代外观验收。

下一项改变真实空间毛束尺度，导向数量、子毛最近根映射、每束根覆盖范围及导向回卷横向尺度需要一致；仅增加导向数量而保留宽大的旧回卷，也可能继续得到粗扇。先固定毛量、材质、灯光及沿长控制比较这一尺度，再独立验证长度错开。参考 [SideFX Hair Clump](https://www.sidefx.com/docs/houdini/nodes/sop/hairclump.html) 的尺度与长度差异控制；**Houdini 未运行，Accurate Bundling、Fractal 与宽度接触约束未实现。** 本轮转向是项目 groom 制作选择，实际 Blender 官方节点与 Cycles / Chiang 散射提供成熟求值与光照，不能称为论文造型算法复现。下一项尚未制作或渲染，先验收毛料，再匹配完整星仔、黑帽和网页资产。新四类记录追加，原 95 条内容与顺序、全部旧工程和创作保留。

下一次具体对照计划（未实施）：保留原 2,657 个导向根，确定性补到 10,628 个表面根，重建子毛最近根映射及 joined 曲线 Guide Index；保持 85,000 根子毛根、半径与 rest。两组都采用同一套新根、映射及新增导向属性：一组保留原回卷宽度，另一组只把根局部坐标的两个切向分量缩到 0.5，并继承旧原型的法线高度函数。这可区分根分组变密和回卷形态变小的效果。制作前须核对新增导向 rest、ID、root_radius 和 joined 索引契约；制作后再测每束人数、根的切平面跨度与覆盖，不能仅凭 4 倍导向数就声称束径已减半。保留 GN11 作旧基线，固定场景、沿长控制与渲染条件，不额外归一 XYZ 或补偿子毛弧长。毛冠、弧长与根覆盖仍是结构代理，实际细卷团和柔软观感需要看图验收。

## 迭代和视觉差距

初版 v1 保存 B 毛料和完整角色。实际对照发现帽子的白色 sheen 使黑帽偏灰；v2 降低 sheen、改深底色，增加卷曲，但结簇 0.82 使毛层斑块起伏过强。v3 将结簇收回 0.60，帽子显式使用深色 sheen tint 与 Specular IOR Level 0.28，保留毛发节点的折射率。各版工程和图片均保留，不覆盖历史结果。

对照发现三项仍待改善：

- **毛束读感。** v3 前额像细密短毡，完整导向的 v4/v5 已有卷束；v5 末端更松，但细亮线、卷束方向及尺度重复仍明显。参考更像较厚、断续、松散的小卷绒。需要结合分组变化、导向形态与毛长约束改善，不能将其解释为缺少更多毛丝。
- **光色分布。** 当前上亮下暗的棚拍渐变更强，下腹偏深蓝；参考可见毛层更均匀、偏浅紫蓝。参考底部有播放器白色渐变，不能据此整体加曝光或把白渐变写进材质。
- **帽冠与眼睛。** 当前帽冠偏宽、规整，顶部与边缘亮条更明显；参考左冠更鼓、更垂。眼睛大小与位置也还未对齐。需要独立调整形体、毛流与照明，而非整体压暗。

因此尚未启动“母版已验收 → 批量多视图 → 高斯训练”。先解决毛料与帽子差距，再比较静态 3DGS 展示或支持修剪、梳理、换灯的实时毛发资产。原有 Three.js 页面继续用于现有创作和互动。

## 复现与资产检查

2026-10-08 发布说明：下文的磁盘路径是历史实验环境记录。公开网页提供脚本、参数、日志、图片与[原生工程清单](../web/engineering.html)，54 个 `.blend`（约 3.6 GB）完整保留在原本机，未上传为网页下载。清单包含每个工程的大小与 SHA-256；网页中的工程入口会打开清单，而不是下载工程文件。此前阶段“没有本地原作模型”的描述属于当时状态，目前完整 6 块 SOG 已接入工作台，当前能力以[公开理解汇总](public-understanding.md)为准。

在 PowerShell 中先设置你的 Blender 可执行文件，再运行生成脚本（示例在仓库根目录执行）：

```powershell
$env:BLENDER_BIN = 'C:/Program Files/Blender Foundation/Blender/blender.exe'
& $env:BLENDER_BIN -b --python-exit-code 1 --python 'projects/005-plush-lab/tooling/blender/plush_cycles.py' -- --kind swatch --variant reference --resolution 768 --samples 96 --tag my-review-1
```

`BLENDER_BIN` 是这里命令示例使用的路径变量，不代表所有历史 Python 脚本会自动读取它。复现历史实验仍需使用对应冻结源及报告参数，并按本机调整输入输出路径；官方 Hair Nodes 的安装位置、版本与 GPU 要求也需匹配。

官方便携 Blender 5.2.2 LTS 位于 `D:/codex/home/cache/plush-lab-tools/blender/blender-5.2.2-windows-x64/blender.exe`，存放在仓库外，不影响项目网页依赖。安装包来自 [Blender 官方下载目录](https://download.blender.org/release/Blender5.2/)，SHA-256 与官方 `blender-5.2.2.sha256` 一致：

```text
3849d17a682cba006075aaa3f3597ecb5c9c30ec31035b2e092c53e40679b535
```

在仓库根目录运行，使用新 tag 保存新结果；已存在的 PNG 或工程会阻止覆盖：

```powershell
& 'D:/codex/home/cache/plush-lab-tools/blender/blender-5.2.2-windows-x64/blender.exe' -b --python 'projects/005-plush-lab/tooling/blender/plush_cycles.py' -- --kind character --variant reference --resolution 1536 --samples 384 --tag review-1
```

`--kind swatch` 生成样片；`--angle 25` 生成略侧面。当前脚本要求可用 OptiX GPU；`--no-render` 只保存工程，不能视为画面验证。光源功率与颜色在脚本内明示，可在 `.blend` 中修改。原生曲线可在 Blender 编辑模式逐点修改，尚无现成用户梳理 UI。

v3 全部四组样片、正面与侧面均保存 `.source.py` 快照，SHA-256 为 `69df6504ddc4412c1279f7f40f2baa8ae45fbedc6649e64cdc7cb1d175039dc3`；参数、设备与输出文件名记录在 JSON。[原生资产与图片校验结果](../artifacts/cycles-study/validation.json)单独记录实际检查，不用图片文件存在代替原生毛丝验证。v1 没有对应源快照，保留它用于视觉迭代对照，不能宣称可逐字节复现。

导向实验另保存 `.ab-source.py`，是每次生成时的完整实验包装器；`.source.py` 仍是冻结 v3 基础生成源，必须与包装器一起保留。每个 `.ab-report.json` 记录两种源的实际 SHA-256、公式、原生位置与半径摘要、弧长估算。不能只用基础源重现新增导向。当前包装器从已校验的 v3 快照导入基础生成逻辑，后续修改不会静默混入本轮对照。

要生成新的 v5 方法样片，在仓库根目录运行并使用新的 tag；`--mode curve --profile soft-tip` 是导向实验参数，其余参数交给基础生成器：

```powershell
& 'D:/codex/home/cache/plush-lab-tools/blender/blender-5.2.2-windows-x64/blender.exe' -b --python-exit-code 1 --python 'projects/005-plush-lab/tooling/blender/plush_groom_ab.py' -- --mode curve --profile soft-tip --kind swatch --variant reference --resolution 768 --samples 96 --tag review-soft-tip-1
```

E 起的包装器会自动独占创建 `.ab-source.py`，并在 `wrapper_source_snapshot` 记录文件名及实际源哈希；已有输出会阻止覆盖。A/B/C/D 与 v4/v5 使用各自启动前保存的历史包装器快照。历史实验应使用该实验自己的包装器快照及报告参数，不能用当前脚本宣称重现旧版本。

弧长归一样片需要额外传入 `--preserve-arc-length`，例如：

```powershell
& 'D:/codex/home/cache/plush-lab-tools/blender/blender-5.2.2-windows-x64/blender.exe' -b --python-exit-code 1 --python 'projects/005-plush-lab/tooling/blender/plush_groom_ab.py' -- --mode curve --profile soft-tip --preserve-arc-length --kind swatch --variant reference --resolution 768 --samples 96 --tag review-length-1
```

E 的包装器 SHA-256 为 `3f3b56a11c7f616a36140f68aaa45ffb4bf01db32e2225a92a319f88fc145ca3`。基础生成源仍为冻结 v3，两种快照都需保留。

[重复执行的原生工程检查脚本](../tooling/blender/validate_groom_assets.py)直接读取保存的 `.blend` 曲线、映射、毛根与所有非导向控制，比较相应 v3 基线。报告以新文件名独占创建，拒绝覆盖历史报告；读取前后核对文件 SHA-256。它不渲染、不保存工程，也不评价外观相似度。

新增对照页面无外部依赖，不读取或写入作品存储；四个原网页入口与已有资产保留。项目内置记录只追加本轮成果、原理与下一步，个人记录和创作数据不变。

本轮已实际执行的检查：

- v3 基线的 Blender 原生资产校验 **72 项通过**，保留原报告。历史[保存工程检查 v2](../artifacts/cycles-study/groom-assets-validation-v2.json)为 **445 / 445 项通过**，读取两个基线与六个实验工程，44 个输入文件 SHA-256 保持不变。
- 新增[保存工程检查 v3](../artifacts/cycles-study/groom-assets-validation-v3.json)为 **589 / 589 项通过**：读取两个基线与 A/B/C/D/E、完整 v4/v5/v6，共十个工程，58 个输入文件 SHA-256 保持不变，44 个旧输入也与 v2 记录一致。保留原 445 项检查，并从已保存 E 的 85,000 条、v6 的 320,000 条外绒控制点独立积分弧长；与上述生成报告误差一致，所有毛根逐位相同，实际毛根最大误差均为 0，没有曲线超过 `1e-4` 的相对弧长误差。检查同时覆盖导向映射、各层数量与半径、镜头、灯光、材质和源快照；不评定外观相似度。
- 初次[检查 v1](../artifacts/cycles-study/groom-assets-validation-v1.json)为 **443 / 445 项通过、整体失败**，保留失败报告。两项差异是完整角色网格边与面的原生存储顺序；v2 比较相同顶点位置、保持绕序的面拓扑、边、材质和光滑属性，仍保留原始存储哈希。不能把 v1 写成通过。
- v6 对照页 17 个图片元素（15 张不同图片）全部解码且非空，110 个内部链接顺序 HEAD 返回 200 且非空；1440、768、390、320 像素宽度下，常规布局和展开完整角色对照均无横向溢出。浏览器控制台、页面、请求失败及远程资源请求均为 0；桌面、手机、D→E 样片与 v5→v6 完整角色截图已目视复核。
- 四个原网页入口返回 200。已有两个带项目记录面板的入口（`index.html`、`splat.html`）可查看新增的成果、原理与修改记录，共 71 条；其余入口沿用原来的布局。
- 原来的 68 条项目记录内容与顺序校验值保持 `175aea2000ffb8298c20a76b5889f285d39770235c59a670abacb41c548a017f`；记录存储、检索与备份相关 43 项测试通过。

GN5 接入后的统一复核：26 个图片元素、20 张不同图片全部加载、解码且非空；157 个不同本地文件链接 HEAD 返回 200 且非空，11 个页面锚点有效。1440 / 768 / 390 / 320 像素宽度及展开完整角色历史均无横向溢出；控制台与页面错误、请求失败、远程资源请求均为 0。已查看实际 GN4→GN5 桌面与手机截图，图片及说明完整。四个原网页入口继续返回 200；`index.html` 与 `splat.html` 的记录面板能显示 GN5 成果、原因和限制，搜索 GN5 找到三条本轮记录，清除筛选后恢复 71 条。四入口构建与既有 43 项记录测试通过，原 68 条记录内容和顺序哈希仍与上述一致。这些页面与工程检查保证结果可查看、历史保留，不构成参考毛料的视觉验收。

GN6 接入后的统一复核：29 个图片元素、22 张不同图片全部加载、解码且非空；182 个不同本地文件链接 HEAD 全部返回 200 且非空，12 个锚点有效。1440 / 768 / 390 / 320 像素宽度、展开历史和三维中心云指标均无横向溢出；控制台与页面错误、请求失败、远程请求均为 0。三张样片桌面与手机截图已目视复核，原 26 个图片引用与 157 个本地链接无缺失。四入口构建成功，记录相关 43 项测试通过；新临时浏览器中的 `index.html`、`splat.html` 能显示 75 条记录、搜索 GN6 找到四类共 4 条，清除搜索恢复 75 条。原 71 条记录内容与顺序 SHA 保持 `8cea96500c34ffa7f92d5f3172b3e9261edb597c896fe8462c9ffe54993cf597`，个人存储没有读写。初次页面检索因新原理记录标题未标 GN6 只找到 3 条，失败 QA 保留；补齐新标题后以独立新报告重测通过。这些检查不代表参考外观已验收。

GN7 接入后的统一复核：32 个图片元素、24 张不同图片全部加载、解码且非空；199 个不同本地文件链接顺序 HEAD 全部返回 200 且非空，13 个锚点有效。1440 / 768 / 390 / 320 像素宽度下，三张新对照图等宽，常规布局、展开技术依据及完整角色历史均无横向溢出；控制台与页面错误、请求失败、远程请求均为 0。已目视查看新三图的桌面与手机截图，旧 29 个图片引用及 182 个本地链接保留。四入口构建成功，既有记录相关 43 项测试通过。使用新临时浏览器上下文检查 `index.html`、`splat.html`：共 79 条记录，搜索 GN7 找到进展、修改、原理、扩展四类共 4 条，分类与清除筛选正常；实际 GPU 时间、157 项工程检查与 42 根映射探针等内容可检索，新增对照和验证链接返回 200。原 75 条记录内容与顺序 SHA 保持 `c22b89a43763d86080e867e4da52149ae29f0dcad81501d8efb926a49f0be1a3`，这些检查没有访问用户浏览器的个人作品存储。页面检查保证新增内容可用与历史保留，不构成参考外观验收。

GN8 / GN9 接入后的统一复核：[页面报告](../artifacts/cycles-study/page-validation-gn8-gn9.json)实际通过，40 个图片元素、30 张不同图片全部解码且非空；254 个不同本地文件链接顺序 HEAD 全部返回 200 且非空，15 个锚点和 14 个章节有效。1440 / 768 / 390 / 320 像素宽度下，GN8 两图、GN9 三图及旧 GN6 / GN7 对照等宽；折叠和展开新证据、完整角色历史均无横向溢出，控制台与页面错误、请求失败、远程请求均为 0。已目视复核实际分层与层级图的桌面、手机截图。原 32 个图片引用与 199 个本地链接无缺失，v6 主图继续保留。

四个网页入口构建成功，既有记录存储、检索、备份 **43 项测试通过**。[记录页面复核](../artifacts/cycles-study/journal-validation-gn8-gn9.json)使用新临时浏览器上下文检查 `index.html`、`splat.html`：共 83 条内置记录，搜索 GN8 或 GN9 均找到进展、修改、原理、未来方向四类共 4 条；分类、六个实际本地证据链接和清除筛选正常，页面错误为 0。[历史内容与顺序保留检查](../artifacts/cycles-study/journal-preservation-gn8-gn9.json)通过，原 79 条 SHA 保持 `e4c576f7713c71293a852d29eca8532b10e0d480e30a0ddbc6c62751e0ab19f4`。没有访问用户浏览器的个人作品存储。这些检查保证成果可查看和记录完整，**不构成参考毛料的视觉验收**。

GN11 接入后的统一复核：[页面报告](../artifacts/cycles-study/page-validation-gn11.json)通过，46 个图片元素、33 张不同图片全部解码且非空，284 个本地文件链接顺序 HEAD 返回 200 且非空；18 个锚点、16 个章节有效。1440 / 768 / 390 / 320 像素宽度下，新三图等宽，折叠与展开全部证据均无横向溢出，浏览器错误、请求失败和远程请求均为 0。已目视复核桌面与手机截图，原 43 个图片引用、273 个本地链接和 v6 完整角色主图无缺失。检查时页面 SHA-256 为 `47c39c600b414ee9039719ac0fffeada01d8b9151406536ace6a0f36b7fa00db`。

四入口构建成功，既有记录相关 **43 项测试通过**。[记录面板检查](../artifacts/cycles-study/journal-validation-gn11.json)在新临时浏览器上下文中通过：`index.html` 与 `splat.html` 显示 91 条内置记录，搜索 GN11 找到进展、修改、原理、后续方向四类共 4 条，新增本地证据链接及清除筛选正常。[历史记录保留检查](../artifacts/cycles-study/journal-preservation-gn11.json)证明原 87 条内容和顺序完整保留，SHA-256 仍为 `2c9227560ffde80ecac1fe80e0e2e00517c54ffd5fc8c3ed1288a307f05f71e3`。个人作品存储未被访问。这些检查与 134 项原生工程验证保证改动真实、可查看和可追溯，**不代表已达到参考图的外观**。

GN12 接入后的统一复核：[页面报告](../artifacts/cycles-study/page-validation-gn12.json)通过，49 个图片元素、35 张不同图片全部加载、解码且非空，305 个本地文件链接顺序 HEAD 返回 200 且非空，20 个锚点与 17 个章节有效。1440 / 768 / 390 / 320 像素宽度下，GN11 → GN12 A → GN12 B 三图等宽，常规布局与展开全部证据均无横向溢出；控制台、页面、图片及链接错误、请求失败与远程请求均为 0。已目视复核实际桌面与手机截图。旧 46 个图片引用、33 张不同图片、284 个本地链接及 v6 完整角色主图保留；锁定页面 SHA-256 为 `cb1796194375b26270cc6e88e085b4f37c8ddae66c3f29e62c0ef7b2cebe54d5`。

四入口构建成功，既有记录相关 **43 项测试通过**。[记录面板检查](../artifacts/cycles-study/journal-validation-gn12.json)使用新临时浏览器上下文通过：`index.html` 与 `splat.html` 显示 95 条内置记录，搜索 GN12 找到进展、修改、原理、后续方向四类共 4 条，三处新增本地证据链接返回 200，清除筛选恢复 95 条。[历史记录保留检查](../artifacts/cycles-study/journal-preservation-gn12.json)通过，原 91 条内容和顺序 SHA-256 保持 `2e27218d69180ca5b57c401828e03e8a7cb86595a9624b40680378f1bedb9035`。这些检查没有访问用户浏览器的个人作品存储。

本轮页面、记录面板与历史保留报告 SHA-256 分别为 `b7ca46ab8b3865515c51e812a74ce13642ac3cf9304514f572658d89abbbf410`、`e32bdb6ce2d309e01e639e7ea922c22cc10158c87ba3891798c7318744f304e6`、`7df0f07cf46210e32ad4750cee53ae8a612a2704ba4fe97d54c1d7f17ac9f24b`。与 138 项独立原生工程检查一起，它们证明本轮改动真实、可查看且可追溯，**不构成参考毛料的视觉验收：粗扇簇与横向层纹仍然存在**。

GN13 接入后的统一复核：[页面报告](../artifacts/cycles-study/page-validation-gn13.json)通过，51 个图片元素、36 张不同图片全部加载、解码且非空；316 个本地文件链接顺序 HEAD 返回 200 且非空，22 个锚点与 18 个章节有效。1440 / 768 / 390 / 320 像素宽度下，新两张对照等宽，折叠与展开全部证据均无横向溢出；控制台、页面、图片及链接错误、请求失败和远程请求均为 0。实际桌面与手机截图已目视复核，旧 49 个图片引用、35 张不同图片、305 个本地链接及 v6 完整角色主图保留。锁定 HTML SHA-256 为 `9a19c3399065266b6dd13d2b0d914d7b3e2e4e923280fdedd28436f0a83904fd`。

四入口构建成功，全项目现有 **380 项测试通过、0 失败**。[记录面板检查](../artifacts/cycles-study/journal-validation-gn13.json)使用新临时浏览器上下文通过：`index.html` 与 `splat.html` 显示 99 条内置记录，搜索 GN13 找到进展、修改、原理、后续方向四类共 4 条，三处本地证据链接返回 200，清除筛选恢复 99 条。[历史记录保留检查](../artifacts/cycles-study/journal-preservation-gn13.json)证明原 95 条内容和顺序 SHA-256 保持 `4acaee3e79f54113e5ec74cb72f6c40aacd2bdecf2da6bec047fdfd91467107b`，没有访问用户浏览器的个人作品存储。

本轮页面、记录面板与历史保留报告 SHA-256 分别为 `bd552af02dec0fca00fa777a23826fa5f23d5e6824da5356280c091df690b33c`、`1e51c3021b56ddb026c0f08b696827e8ea8f576f08f097f0258fb83679e13505`、`68301e8d5fb06856abaa02710ef40b62b6551f7dc530655e9e81f4d5b2bd1eda`。与 119 项独立工程检查一起证明改动真实且历史保留，**不代表外观达标；整束转向没有解决主要粗扇簇和横向层纹**。本机预览服务只对本项目的展示、资产、记录目录及页面明确引用的证据文件开放，不开放整个工作区。

## GN14：实际空间束细化减少宽扇片

固定 GN11 的总毛量、材质、镜头、灯光及官方沿长控制，保留 2,657 个旧导向根，并从原 85,000 根外绒根确定性补 7,971 个根。真正重算最近根映射及 joined 索引。新增两套工程共享 10,628 个根、rest、ID 和映射；A 搬运原回卷，B 仅把两个切向分量乘 0.5，法线分量保持，不做 XYZ 归一、弧长补偿或物理接触。

每束子毛中位数 7、平均 7.998，0 空组；根部切向跨度中位数 0.0168404、P95 0.0222661，旧 GN11 为 0.0460615 / 0.0681245。原生导向最大切向偏移中位数由 A 的 0.0145664 到 B 的 0.0072832，法向控制点分量中位数约 0.0258781 保持。最终外绒冠高代理中位数为 0.0200459 / 0.0208610，路径弧长中位数为 0.0376178 / 0.0354702。这些是中心线与解析表面代理，没有测实体接触、实际绒层体积或柔软评分。

两张 768×768 / 96 样本真实 GPU 图分别耗时 8.057 / 7.938 秒。[直接三图对照](../artifacts/cycles-material-study.html#bundle-scale-study)中宽扇片明显细化，半宽组相对 A 只略更紧细；仍有横向层纹与顺向压实感，**尚未达到参考的松厚断续卷团**。可见收益来自实际空间束细化，不能把半宽本身标为显著成功。下一项立即用于完整浅蓝星仔，与旧 v6 和参考截图直观比较，保留全部旧作品。

新增资产：`swatch-reference-gn-bundle-scale-wide-live-14` 与 `swatch-reference-gn-bundle-scale-half-live-14`，每组保存 `.blend`、冻结 `.source.py`、CPU `.json` / `.gn-report.json` / `.precheck.log`、真实 `.png` 与独立 `.render.json` / `.render.log`。CPU `rendered:false` 保留，GPU 凭证实际为 true。制作器 SHA-256 为 `fd49cc328e6a43f8af93c3f2cf85f9d3eed479e2bad983d32ee20b36bc49d137`，两工程 SHA 为 `8fe46017a7d34f924dc400693a431fd1182aeb8444bed7bb5105c24a9b28281b` / `62223943752472c6be9bfa92d1f65de557723d7bcddb1d5df33fc819129effed`，真实图 SHA 为 `9c3c062162c7e9b134747bf560a35f2899395b51774a626d6dea1302e90c2167` / `c43a0cee50a3ab40704105fe98064c2696111966787636e8ab87751057dc5c5b`。

[GN14 独立检查](../artifacts/cycles-study/hair-guide-density-width-validation-v14.json)实际通过 140/140 项，75 个历史锁定输入 SHA 保持。两份磁盘工程重载、原生 INT / CURVE 最近根映射及实际渲染凭证通过；报告 SHA 为 `270078f238ff58bad034de341f2869de5a89b413cbefc4efd9e93e99f36961c1`。这些检查确认工程与改动真实，外观结论仍以两张实图为准。

### GN14 完整星仔：两套真实候选，当前选择撑开版展示

新增 `character-reference-fine-bundle-v14` 与 `character-reference-soft-pile-v14`，均实际渲染 1536×1536 / 256 样本 / Cycles OptiX，耗时 47.075 / 60.718 秒。每套另存可编辑 `.blend`、冻结 `.source.py`、CPU `.json` / `.gn-report.json` / `.precheck.log`、最终 `.png` 与实际 `.render.json`、768 预览与对应凭证。CPU 预检保持 `rendered:false`，真实渲染另记录为 true。两制作器为 `tooling/blender/plush_character_fine_bundle.py` 与 `plush_character_soft_pile.py`。

细束版保留 v6 的 320,000 个外绒根，以每八根抽一条共 40,000 条导向真实重建 nearest / joined 映射，所有组非空。将 GN14 半宽回卷按真实星形数值法线搬运，尺度乘 1.55，再继承眼窝、帽檐长度预算；43,923 根受到压缩，最低约 0.12017。底绒长度乘 0.35，飞毛保留但隐藏。它是毛料迁移、角色尺度和覆盖层共同适配，不能作为球形样片单变量试验。

撑开版在细束版上增加真实中心线高度：子毛与导向法向乘 1.65、导向切向乘 1.25，Clump 峰值降到 0.65；新增下前方 260 W / 5 m Area 柔光，其他角色造型、眼睛、帽子与镜头继承。独立原生工程保存，不覆写细束版或 v6。[直接三图](../artifacts/cycles-material-study.html#character-fine-bundle-study)中撑开版的底部更柔和、边缘毛层稍厚，高清图可见细小开放回卷；仍偏细密均一，缺参考松厚、大小方向不规则的卷团。细束版偏贴体短绒，作为本轮独立候选保留在默认折叠对照中。**没有宣称参考效果达标，也没有新的实时或 3DGS 交互资产。**

细束 / 撑开最终 PNG SHA-256 为 `a768b093c8067a2c7f79ec7a6b686f375d515bf4698e718d1a66255c7dbb820e` / `f65194201e710c1b77ecd16fd0a0623e759b0c1ef2b3900ab0bc587250aced18`；撑开工程 SHA 为 `2eecedd9077ae3add11ca4e5b9e6e79872ea7e2c943ada0662a183053e3181cc`。[细束完整工程独立检查](../artifacts/cycles-study/character-fine-bundle-validation-v14.json)通过 18/18，报告 SHA 为 `4ff43a15fd15d3fe509da0bc5d9f7afa5838e42a667e077f2c58a32a8ecd3919`。旧 v6 工程与 PNG SHA 保持 `9d3adeb4bc4e4a85b3ee8b7de282770de09810dc4f52ba0397412b7cbbe1a60f` / `72b81df3009d7396df05d142192641abf458a5527a258703c60838954e3ba228`。

[撑开完整工程独立检查](../artifacts/cycles-study/character-soft-pile-validation-v14.json)也通过 18/18，报告 SHA 为 `598c9dadbbc07bda6c974e51bab515c1a20ecbf5a80d1c30cf9832ec49c94a27`。两套检查实际重新加载磁盘工程，确认 320,000 根最近根映射、40,000 条导向全部非空、真实星形法线与压缩、最终有限位置与正半径、固定毛根以及真实 1536 PNG / 渲染凭证。工程有效不代表参考外观通过。

GN14 展示与记录收尾：[页面检查](../artifacts/cycles-study/page-validation-gn14.json)通过，59 个图片元素 / 40 张不同图均解码且非空，351 个本地文件链接返回 200；1440 / 768 / 390 / 320 宽度下三图等宽，折叠和展开无横向溢出。实际桌面及手机截图已目视复核，旧 51 个图片引用、316 个文件链接和 18 个历史章节保留。[记录按钮检查](../artifacts/cycles-study/journal-validation-gn14.json)在新临时浏览器中确认 `index.html` / `splat.html` 的 103 条内置记录、GN14 四类搜索、链接和清除筛选；页面错误为零。[历史记录检查](../artifacts/cycles-study/journal-preservation-gn14.json)确认原 99 条内容及顺序保留，旧序列 SHA 仍为 `5064ef627711f495086a98fc24e7c88335f4e9bc458c0ee834e85f300389c461`。四入口构建成功，全项目现有 380 项测试通过。检查未访问用户浏览器的个人作品存储，外观目标仍未达标。

## V15：完整厚卷绒成片与可编辑工程

此前的管线、官方毛发节点和球形样片解决了制作和诊断问题，却仍未交付用户要求的完整参考外观。本轮直接重做完整蓝色星仔的 groom，保存 6,400 主卷团首稿后，根据实际预览中的粗颗粒细化到 10,800 主卷团。最终 [V15 高清成片](../artifacts/cycles-study/character-reference-volumetric-fleece-v15-r2.png)已真实渲染，1536×1536 / 256 样本 / Cycles OptiX，耗时 **49.40 秒**；[实际渲染凭证](../artifacts/cycles-study/character-reference-volumetric-fleece-v15-r2.render.json)记录成功输出。[第一屏](../artifacts/cycles-material-study.html#character-v15-delivery)直接并排参考与这张完整图，[制作展开区](../artifacts/cycles-material-study.html#character-v15-making)展示工程和首稿。

完整外绒为 10,800 个主卷团，每团 56 根，共 604,800 根，每根 32 个控制点；短底绒为 185,000 根，散毛为 28,000 根。卷团混合短、中、长高度、不同卷径和方向，束内细卷打散重复排列，中段松聚并在末端释放；底绒填补根部，散毛柔化外轮廓，帽沿和眼窝附近压短绒毛。帽子与眼睛使用真实几何。该工程重新制作三层身体毛丝，属于完整角色造型配方，没有将其中各项独立归因于单变量对照。

最终资产为 `character-reference-volumetric-fleece-v15-r2`，保留 [可编辑 Blender 工程](../artifacts/cycles-study/character-reference-volumetric-fleece-v15-r2.blend)、[冻结制作源](../artifacts/cycles-study/character-reference-volumetric-fleece-v15-r2.source.py)、[毛形与制作报告](../artifacts/cycles-study/character-reference-volumetric-fleece-v15-r2.groom.json)、预览和对应凭证，以及高清 PNG 与实际渲染凭证。制作报告 `rendered:false` 只描述准备阶段，实际高清输出由独立 `rendered:true` 凭证证明。6,400 主卷团首稿 `character-reference-volumetric-fleece-v15` 的工程、源、报告和预览继续保留；旧 v6、GN14 和所有历史作品没有覆写。

原生 Catmull–Rom 毛丝表达真实曲线，Cycles / Chiang 纤维散射负责光与纤维的相互作用。主卷团、束内细卷、长度差异和沿长松紧是 groom 的制作控制，参考成熟毛发流程，但具体路径公式是本项目造型选择，不能称论文复现。Houdini 和新的 Gaussian Splatting 训练没有运行；当前也没有物理接触解算。位置有限与半径为正等工程检查确认资产可用，不能替代参考外观判断。

本轮交付为完整静态成片和可编辑工程，未宣称完全一致或已获用户验收。网页新增成片对照，已有实时角色尚未替换，旧创作、装扮与陪伴功能继续使用原资产。项目记录新增进展、修改、原理与后续方向四条，共 107 条；旧 103 条内容及顺序保持。后续应围绕同一完整形象确认剩余差距，再补多视图与必要动作、选择网页交互资产路线。

记录收尾验证：四个已有网页入口构建成功，原有项目记录存储、搜索与 JSON 备份三组测试共 **43 项通过、0 失败**。独立比较编辑前的 103 条与新增后的尾部，确认旧条目内容和顺序完全相同，新四条分别属于进展、修改、原理和未来方向，总数为 107，ID 无重复。该检查只读取源码与渲染凭证，没有访问用户浏览器中的个人作品存储，也不构成外观验收。

## V16 预览与路线调整：保留实验，接入原作者场景

用户反馈 V15 的完整图仍没有达到参考质感。高拱、较强聚束使表面形成独立球团和羊羔绒颗粒，V15 的成片与工程继续保留，不能把当时的工程完成当成用户外观认可。V16 制作器 `tooling/blender/plush_continuous_pile.py` 转向低矮、细密、连续的短卷绒，独立保存 `character-reference-continuous-pile-v16` 的 [Blender 工程](../artifacts/cycles-study/character-reference-continuous-pile-v16.blend)、[冻结制作源](../artifacts/cycles-study/character-reference-continuous-pile-v16.source.py)、[毛形报告](../artifacts/cycles-study/character-reference-continuous-pile-v16.groom.json)、[实际预览](../artifacts/cycles-study/character-reference-continuous-pile-v16.preview.png)与[预览凭证](../artifacts/cycles-study/character-reference-continuous-pile-v16.preview.render.json)。实际预览为 768×768 / 96 样本 / Cycles OptiX，耗时 **10.24 秒**；准备报告的 `rendered:false` 与预览凭证的 `rendered:true` 分别说明准备和预览阶段。**该版只有工程与预览，没有最终高清 PNG，未获外观认可。**

V16 主绒为 26,000 组×32 根，共 832,000 根，每根 24 控制点。主要高度为 0.025–0.034 场景单位，包含更短、更长的混合；卷半径 0.004–0.0085，沿长聚拢系数为 0.20。底绒为 240,000 根、长度配方 0.024；短散毛为 18,000 根、长度配方 0.038，毛流局部连续下垂。参数余弦采样从 ±0.998 改为 ±0.999999，修复正面极点区域漏采毛根、眼睛之间露出底面的来源；缩小眼周毛形压缩范围，主光降为 380 W，环境强度设为 0.40，并采用较低反差。这是复合完整造型配方，不能独立归因各项视觉变化。仍使用原生毛丝和 Cycles / Chiang 散射，没有新的 Gaussian Splatting 训练、Houdini 或接触求解。

本轮随后找到作者 **abstrakt** 的 [ChatGPT dots - Felipe 原始公开场景](https://superspl.at/scene/ca6a4c9b)。官方页面标示 3,493,379 splats（约 3.5M）/ 113.59 MB 和 CC BY 4.0；在官方浏览器中已直接核对蓝色卷绒星仔、黑贝雷帽、亮黑眼睛，与用户截图展示的角色对应，[来源与实际核验凭证](../artifacts/reference-source-verification.json)记录观察。新增 [web/reference-plush.html 原作展台](../web/reference-plush.html)，使用官方 Embed `https://superspl.at/s?id=ca6a4c9b` 并标注作者、标题、许可和来源。本机内置浏览器已真实渲染原作细卷绒，外层全屏进入与 Escape 退出已验，[本机全屏实图](../artifacts/cycles-study/reference-original-local-fullscreen.jpg)已保存。环绕拖动、滚轮缩放和 R 复位在官方查看器原页已验；本机 iframe 拖动未独立实测，不能将两种验证范围混同。

官方下载入口要求登录，当前交付采用公开远程 iframe 查看，**未保存可离线加载的本地原作模型文件，也不是本项目生成、重建或训练的结果**。展示依赖网络与 SuperSplat 官方服务，尚未连接项目的换装、局部创作或陪伴状态。V16、V15、GN14、旧 v6、全部旧网页与个人创作继续保留。四类新记录说明实际路线、修改、方法边界与未来方向，当前总数为 111，旧 107 条保持原有内容与顺序。

本轮收尾验证：工作室、世界、陪伴工作室、Splat 实验室与原作展台共五个网页入口构建成功；已有项目记录存储、搜索和 JSON 备份三组测试共 **43 项通过、0 失败**。独立比较编辑前的 107 条与新增后的尾部，确认旧条目内容和顺序完全相同，新增四条分类齐全、111 个 ID 无重复；V16 工程、冻结源与实际预览的校验值及原作来源元数据一致。该检查没有访问用户浏览器中的个人作品存储；原作本机显示、外层全屏和官方原页交互的核验范围如上，不构成本项目自行重建或外观验收。
