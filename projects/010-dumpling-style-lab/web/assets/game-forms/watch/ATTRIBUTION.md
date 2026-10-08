# 夜潮值守美术资源

本目录中 quay、hall、beacon、store 四幅场景和 worker、visitor 两个人物切片由本项目通过内置 ImageGen 生成，专门用于夜潮值守的统一灯光与场景制作。

完整提示词、工具方式、原始生成文件位置、运行资源尺寸与透明通道检查保存在 `assets/game-forms/watch-generation-20261004.json`；项目内保留原始 PNG 于 `assets/game-forms/watch-sources/`。

运行文件只做图像格式压缩与透明角色边界裁切。雨、灯光、移动角色、卷闸、引导光和所有玩法状态由运行模块实时绘制。实际展厅封面由浏览器截图制作，不以生成的概念图充当游戏截图。

雨声与机组低鸣由本项目 Web Audio 实时合成；没有引用第三方录音或歌曲。
