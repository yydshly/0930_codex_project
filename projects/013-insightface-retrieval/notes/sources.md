# 来源、核对日期与事实边界

核对日期：2026-10-02（Asia/Shanghai）。阅读当日公开文档与 master 源码，没有固定 commit，没有运行模型。图中的来源编号与下表对应。

| 编号 | 一手来源 | 支持的结论 |
| --- | --- | --- |
| S1 | [AVScan 首页](https://avscan.cc/)、[关于](https://avscan.cc/about)、[条款](https://avscan.cc/terms) | 上传与裁切入口；ViT、向量库和作品时间定位的宣称；不托管视频 |
| S2 | [InsightFace](https://github.com/deepinsight/insightface)、[Python 库](https://github.com/deepinsight/insightface/tree/master/python-package) | 检测、识别、对齐、ONNX Runtime；库代码与模型许可分开 |
| S3 | [官方模型表](https://github.com/deepinsight/insightface/tree/master/model_zoo) | buffalo_l 的检测与识别组合；公开 LFW 99.83%；官方模型非商业研究条件 |
| S4 | [ArcFace](https://arxiv.org/abs/1801.07698)、[训练实现](https://github.com/deepinsight/insightface/tree/master/recognition/arcface_torch) | 角度间隔损失、身份特征训练；算法与网络可分开 |
| S5 | [IResNet](https://github.com/deepinsight/insightface/blob/master/recognition/arcface_torch/backbones/iresnet.py)、[推理示例](https://github.com/deepinsight/insightface/blob/master/recognition/arcface_torch/inference.py)、[ONNX 识别](https://github.com/deepinsight/insightface/blob/master/python-package/insightface/model_zoo/arcface_onnx.py) | 示例 112×112 输入、默认 512 维、norm_crop、ONNX 推理和余弦比较 |
| S6 | [NIST FRTE 1:N](https://pages.nist.gov/frvt/html/frvt1N.html)、[质量与差异说明](https://pages.nist.gov/frvt/html/frvt_demographics.html) | 图库检索的误认与漏认；质量与拍摄条件影响效果 |
| S7 | [SSCD 论文](https://arxiv.org/abs/2202.10261)、[源码](https://github.com/facebookresearch/sscd-copy-detection) | 图片副本检测特征与预训练模型；仓库已归档 |
| S8 | [Faiss](https://github.com/facebookresearch/faiss) | 向量相似度搜索、精确/近似索引及资源权衡 |
| S9 | [trace.moe](https://github.com/soruly/trace.moe) | 动画截图反查作品、集数与时间的现成系统 |
| S10 | [TwelveLabs 当前 API](https://docs.twelvelabs.io/api-reference/any-to-video-search/make-search-request)、[历史图片查询说明](https://docs.twelvelabs.io/v1.2/docs/guides/search/use-single-queries/image-queries) | 图片查询指定视频索引，返回视频 ID 与片段时间；语义检索定位。两份文档版本不同 |
| S11 | [官方评测指南](https://www.insightface.ai/guides/choose-face-recognition-model-and-evaluate) | 1:1 与 1:N 分开评估，图库规模、阈值、质量影响结果；指南属于项目方说明 |
| S12 | [SCRFD](https://arxiv.org/abs/2105.04714)、[RetinaFace](https://arxiv.org/abs/1905.00641) | 检测模型与识别网络是不同环节 |
| S13 | [LoFTR](https://arxiv.org/abs/2104.00680) | 局部对应匹配可作为候选复核的参考方向 |
| S14 | [Torchreid](https://github.com/KaiyangZhou/deep-person-reid) | 全身人物重识别是另一技术方向，不等同于人脸身份识别 |

## 事实、推断、建议与示意

- 上游事实：文档和代码明示的功能、接口、训练方式、模型表、公开成绩与授权。
- AVScan 宣称：最高精度、全球首创、毫秒级、数据覆盖等没有在本项目独立验证。
- 产品推断：预建视频帧索引的内部路线、广告与导流变现；未确认后台实现和收益，更未确认使用 InsightFace。
- 实现建议：离线/在线链路、可选人脸辅助、来源映射、阈值与拒识、候选复核，是通用架构理解，不是后台逆向结果。
- 教学示意：图中的 A/B/C 与二维团簇没有真实人物或模型输出，不提供相似度或性能含义。

## 不应外推

LFW 99.83% 不能外推成自己的 1:N 搜索准确率；NIST 评测不是对本项目或默认模型包的认证；找人不能自动推出姓名、视频作品与时间；动画检索效果不能直接推出真人视频效果；向量不是绝对唯一身份凭证；语义相关不等于原始出处。

未运行上游识别、未下载权重、未处理真人图库、未上传 AVScan 样本、未测速度和收益。所有实际效果需要单独做代表性样本验证。
