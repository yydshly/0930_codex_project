# 耳机材质与近景 · Idea Foundry V1.6

日期：2026-10-03。revision：20261003-15。

[新版目标工作台](http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/studio.html?example=headphones&revision=20261003-15) · [完整产品页](http://127.0.0.1:8951/projects/011-combination-soup-studio/foundry/showroom.html?example=headphones&revision=20261003-15)

本轮聚焦实际三维的质感和观察任务。修改前的“近景”只在整机框取上增加缩放，材质与制作细节不容易判断。修改后的实际证据在 `assets/qa/v15/after/`。归档更正：后续 V1.7 复核时误用了旧捕获脚本，覆盖了 `assets/qa/v15/before/`；该目录现为 V1.6 完成后的画面，不能再作为本轮修改前的对照。V1.7 已改用独立的 `assets/qa/v16/before/` 与 `after/`，其捕获报告记录了实际运行阶段。

## 具体改进

- 为金属外壳、耳垫和头梁补齐 UV 坐标，使此前未正确映射到曲面的纹理实际生效。平滑闭合曲面上的重合顶点法线，修复近景暴露的外壳接缝。
- 区分金属、包覆和织物的表面表现；添加耳垫缝线、头梁内侧软垫层次、织物色彩与高度纹理。纹理由本地代码生成，无新增生成图片请求。
- 暖色棚拍沿用现有室内环境影像，并加入受控柔光反射；夜色使用单独的反射环境。降低直接照明、校准表面粗糙度，并调整地面阴影及接触层次。
- 将“铝壳”和“耳垫”分别对准实际耳罩。近看时旋转、缩放保持耳罩焦点；“完整”、其他整机视角及重置恢复整机范围。部件与折叠仍由原状态控制。
- 工作台增加放大画面操作，暂时收起旁栏以检查细节，收起画面后恢复操作。模型与视角按钮继续分开，六个视角在桌面、平板与手机上可操作。
- 相机记录新增可选的 `focus` 字段，旧记录仍能正常读取。当前焦点和角度进入工作台记录、完整产品、配置文件、可读简报和独立项目包。
- 折叠改为绕固定连接点的组合旋转，取消让整个连接件离开头梁的平移。半折叠和完全折叠均以实际画面复核，支架保持连接。

## 质量要求与验证方法

| 想让用户判断什么 | 本轮采用的约束 | 当前证据 |
| --- | --- | --- |
| 金属与包覆是否有区别 | 使用各自的材质与有效纹理坐标，观察连续高光，避免曲面法线接缝 | 实际铝壳、耳垫近景 |
| 耳垫做工与织物是否可读 | 近景直接框取对应部件，保留缝线、表面和织物层次 | 实际耳垫观察方向 |
| 转动后是否仍能检查细节 | 观察焦点独立于自定义相机角度保存 | 旋转近景、刷新与独立包恢复 |
| 展示与交接是否一致 | 页面、PNG、JSON 和 ZIP 使用当前模型状态 | 实际下载与隔离运行 |
| 小屏能否完成观察 | 六个视角与放大操作无横向溢出，主体与按钮分开 | 1440、768、390 像素布局检查和截图 |

后续产品应围绕自己的判断任务选择部件与观察范围。耳机要看耳垫、外壳和折叠；其他产品采用对应形体与业务模块，再沿用相同的状态、画面与交付验证方法。清单和功能数量不代表审美质量已经达标。

## 实际证据

- [工作台默认效果](../assets/qa/v15/after/studio-live.png)
- [工作台铝壳近景](../assets/qa/v15/after/studio-detail.png)
- [放大查看](../assets/qa/v15/after/studio-expanded.png)
- [完整产品铝壳近景](../assets/qa/v15/after/headphone-detail.png)
- [耳垫与织物](../assets/qa/v15/after/headphone-cushion.png)
- [旋转后保持近景](../assets/qa/v15/after/headphone-detail-rotated.png)
- [夜色](../assets/qa/v15/after/headphone-night.png)
- [半折叠](../assets/qa/v15/after/headphone-fold-half.png)
- [完整折叠](../assets/qa/v15/after/headphone-fold.png)
- [手机](../assets/qa/v15/after/studio-mobile.png)

[21 项新增观察与交付检查](headphone-focus-v15.json)、[43 项耳机回归](headphone-regression-v15.json)、[5 项兼容检查](studio-compatibility-v15.json)通过，均无未处理错误。静态站 6 项检查通过，本地构建包含 17 个演示项目。最后一次材质校准后的回归另有 [运行日志](headphone-regression-v15-run.log)。最终 [截图捕获报告](headphone-capture-v15-after.json)无页面错误。

实际下载的 [近景交付包](focus-downloads-v15/idea-foundry-near-headphones-v15.zip)在隔离来源阻断包外请求后仍可运行，恢复耳罩焦点和自定义角度，并可回到整机继续操作。实际 PNG 内容与当前画布完全相同。耳机完整功能另见 [回归交付包](headphone-downloads-v15/idea-foundry-headphones.zip)。

## 范围

工作台和完整产品页使用同一个渲染器。原有系列主视觉图片保持原样；本轮不是新的摄影图片或在线模型生成。三维、照明与材料仍为原创概念，未按厂商实物、CAD 或声学性能标定；没有声称达到原站同等审美质量。未知产品仍需自己的形体、素材与运行模块。手机采用视口模拟，未测试真机性能、完整无障碍合规或商业效果。

本轮沿用此前授权的本地 Playwright 捕获与验证，没有发布网站或修改真实业务数据。
