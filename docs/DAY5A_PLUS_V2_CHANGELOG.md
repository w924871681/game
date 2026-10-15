# Day 5A+ V2 变更记录

版本：`0.0.5-alpha.2`。日期：2026-10-15。运行环境：Windows、Cocos Creator 3.8.8、TypeScript 5.8.2。

本轮把 DeskRescue /《桌面急救站》的首页、三种玩法、单单结算与整轮总结六屏接入真实项目。当前记录对应本地开发与 Creator Preview 验证；没有提交、推送或发布。768 × 1024 的后续实测仍在进行，不在本文写成通过。

## 1. 基线与范围

- 在已有 Day 5A 可玩版本上实施 V2；进入本轮前保存了 476 个文件的字节与 SHA-256 基线，以及项目外部备份。
- 保留原有 9 张订单、13 个步骤和拖拽归位、线缆连接、擦拭清洁三种玩法。订单目录、计时计分公式、核心拖拽与连接规则没有因界面重做而改写。
- 六屏使用真实 Node、Sprite、Label、Button、Graphics 与组件引用。工作室背景不包含整张界面，角色、按钮、纸张、设备、数值与游戏输入保持独立。
- 保留原 Day 3、Day 4、Day 5A 文档、截图与日志；旧轮次成绩不作为本轮 V2 成绩。

设计原文及来源 SHA 见 [V2 UI 设计规范](DESKRESCUE_V2_UI_DESIGN.md)。本轮的基线与保护审计见 [V2 基线](validation/day5a-plus/v2-baseline.json)、[保存审计](validation/day5a-plus/v2-preservation-report.json)。该保存审计快照记录旧文件零删除，原 146 组行为测试定义保留，冻结的核心算法文件字节不变；快照文件总数不代表随后追加截图后的最终交付文件数。

## 2. 六屏变化

| 屏幕 | 本轮实现 |
| --- | --- |
| 首页 | 原创维修工作室、同一维修小哥欢迎姿态、独立标题与金色开始按钮；首页等待不计时；音效开关图标和文字同步。 |
| 拖拽归位 | 木质工作台与绿色维修垫、带轮廓和阴影的设备及槽位、独立纸签 HUD；显示当前订单、章节、步骤、操作提示与真实归位数量。 |
| 线缆连接 | 保留原连接头、端口与命中区域；增加曲线、阴影和高光，显示真实连接数量，错误回弹与完成锁定沿用原流程。 |
| 擦拭清洁 | 独立不规则灰尘层、手套/抹布视觉与底部短进度条；百分比使用原关卡要求清理的格数计算，仅在底部显示一次。 |
| 单单结算 | 纸张面板、实际三颗单单星级、大号得分、用时及失误分块、小号完成步骤；保留下一单按钮和结算动画。 |
| 整轮总结 | 独立全屏总结组、奖杯与庆祝角色；显示真实订单数、累计星级、总分、完成步骤、用时和失误；提供直接重玩与返回首页。 |

单单结算与整轮总结互斥显示。整轮总结用累计 `x / y` 星级，隐藏单单三颗星，避免把整轮结果显示成固定满星。六项总结值来自 `RunSummary` 和当前订单目录，没有写死截图成绩。

代表截图：[首页](validation/day5a-plus/screenshots/home-v2-390x844.jpg)、[拖拽](validation/day5a-plus/screenshots/drag-v2-order1-390x844.jpg)、[线缆](validation/day5a-plus/screenshots/cable-v2-order5-1of3-390x844.jpg)、[清洁 96%](validation/day5a-plus/screenshots/clean-v2-order4-96pct-390x844.jpg)、[单单结算](validation/day5a-plus/screenshots/result-v2-390x844.jpg)、[整轮总结](validation/day5a-plus/screenshots/final-v2-390x844.jpg)。

## 3. 素材与显示组件

新增 15 张运行时 PNG，共 **3,269,452 字节**：工作室 1 张、角色姿态 4 张、头像 1 张、奖杯 1 张、手套/抹布 1 张，以及纸张、金色按钮、木工作台、绿色垫、线缆锚点、不规则灰尘、彩纸 7 张。原有 49 张 PNG 和 7 个 WAV 保留；运行时合计 64 张 PNG、7 个 WAV，共 4,177,931 字节，不含 meta、源图与文档。

- 保留内置 imagegen 生成的 4 张原创 master 和 4 份提示词。角色姿态与头像来自同一角色 master。
- 保留 7 份程序几何 SVG 源文件；PNG 由离线生成器复现，纸张和按钮配置独立九宫格边距。
- 素材清单含用途、尺寸、生成方法、源路径、提示词路径和 SHA-256；未下载第三方角色、品牌图标或音频。

来源见 [素材说明](DAY5A_PLUS_V2_ASSET_MANIFEST.md)、[逐项素材清单](../tools/art/asset-sources-v2.json)、[离线生成器](../tools/art/generate_v2_ui.py)。

| 文件 | 职责 |
| --- | --- |
| [PaperOrderHUD.ts](../assets/scripts/ui/PaperOrderHUD.ts) | 显示订单、章节、标题、步骤、提示及实时进度；切换三种玩法装饰组；清洁条随轨道宽度刷新。 |
| [V2ResultView.ts](../assets/scripts/ui/V2ResultView.ts) | 单单/整轮两组互斥显示、真实结果数值、按钮显示位置与装饰动画清理。 |
| [ButtonPressFeedback.ts](../assets/scripts/ui/ButtonPressFeedback.ts) | 只缩放按钮装饰子节点；拥有并清理 TOUCH_START / END / CANCEL 监听与自身 Tween，保持输入根节点尺寸。 |
| [WorkshopDecoration.ts](../assets/scripts/ui/WorkshopDecoration.ts) | 有限的角色入场与浮动效果；停止时清理自身动画。 |
| [V2CableLine.ts](../assets/scripts/visuals/V2CableLine.ts) | 根据原连接头、锚点和线色绘制曲线，保持核心连接逻辑拥有坐标与输入。 |
| [V2DirtAppearance.ts](../assets/scripts/visuals/V2DirtAppearance.ts) | 扩展灰尘视觉子层并确定性变换；原格子仍负责命中、计数与淡出。 |
| [V2ViewportTheme.ts](../assets/scripts/visuals/V2ViewportTheme.ts) | 浏览器信箱区域使用薄荷绿，并通过 CSS clip 显露背景，保持 Canvas DOM 边界与输入换算。 |

## 4. 流程与 Creator 装配

[LevelManager.ts](../assets/scripts/core/LevelManager.ts) 接入可选 HUD 和结果视图，继续保留旧状态/详情字符串供既有测试验证。RunController 仍直接写入正式计时与失误 Label，视图组件不拥有计时、计分或关卡推进。

[HomeController.ts](../assets/scripts/ui/HomeController.ts) 增加整轮结束后返回首页：使旧回调代次失效，停止输入与结果效果，重置整轮状态并暂停计时，再显示首页和恢复一次新的开始入口。音效开关的当前会话状态保留；快速重复开始、重玩与返回操作有幂等保护。重玩继续直接进入第一单，不经过首页。

真实装配通过 [v2-main.js](../extensions/deskrescue-editor/v2-main.js)、[v2-scene.js](../extensions/deskrescue-editor/v2-scene.js) 执行 Creator Node/Component API、`generatePrefabDataFromNode` 和 Asset Database 保存：

- 保存并重新导入 8 个原 Prefab，以及 `assets/scenes/Game.scene`；未通过手写序列化 JSON 代替 Creator 装配。
- 重复执行装配后，9 个资源的新增节点数均为 0，`idempotent: true`；详见 [完整装配报告](validation/day5a-plus/v2-full-build-report.json)。
- 保留 9 个核心资源 UUID。Creator 重序列化引起的内部 fileId 差异单独记录；现有 41 个 targetOverrides 根的检查未发现旧 fileId 悬空引用。输入路径、层级、位置、尺寸、旋转与缩放仍接受严格比对。
- 原 StageHost 设计中心是 `(360, 640)`，参考图假定 `(360, 755)`。为保留实际输入，纸签使用设计坐标 `y=164, h=132`，统计条 `y=304, h=48`，在最上方输入区域 `y=360` 之前结束；没有移动核心玩法来照搬参考图坐标。
- `Canvas/V2ModalShade` 独立于 `CompletePanel`，用 BlockInputEvents 阻挡背景输入，不随结算面板的缩放 Tween 变小；结果隐藏、禁用或销毁时一同关闭。

实际映射与约束见 [场景映射](DAY5A_PLUS_V2_SCENE_MAPPING.md)、[运行时引用记录](validation/day5a-plus/v2-runtime-audit.json)。

## 5. 本轮发现并修复的问题

| 问题 | 修复与影响 |
| --- | --- |
| 曲线组件字段名 `start` 与 Creator 生命周期同名 | 改为独立曲线端点字段，避免引擎把 Vec3 当作 `start()` 调用。 |
| Graphics 的 Color 对象会被原位修改 | 以 RGBA 通道值生成曲线缓存签名，避免错误颜色或成功颜色不触发重绘。 |
| 重复装配会把当前计时 Label 和教程 Label 当成旧节点隐藏 | Label 构建时明确恢复 active，教程仅隐藏不同于当前绑定的旧 Label；重复运行后正式 UI 仍可见。 |
| 旧 NextButton 被新纸张兄弟节点覆盖 | 复用真实 Button，并在装配后明确兄弟顺序，使按钮位于面板内容之上。 |
| WebGL 不透明信箱区域遮住页面背景 | 使用薄荷绿页面及 CSS clip；不调整 Canvas bbox、SHOW_ALL 策略或输入坐标。 |
| Windows Asset Database 保存期间出现短暂文件占用 | 对 UNKNOWN / EBUSY / EPERM 做有限递增等待重试，仍用同一 Creator 序列化与 save-asset API；保留原错误记录和后续成功报告。 |
| 新标题使用旧 LabelOutline 会产生新的弃用警告 | 清除该新标题的旧组件，改用 Label 的 enableOutline / outlineColor / outlineWidth。 |

这些修复属于显示、装配与生命周期处理，没有改变订单数据、核心输入判定或评分公式。[历史保存错误](validation/day5a-plus/v2-last-operation-error.json) 保留用于追溯；当前装配结论以之后生成的成功报告为准。

## 6. 验证结果与证据边界

不同验证层单独列示，不把静态审计、模拟测试与 Preview 操作相加成一个通过数。

| 验证层 | 当前结果 | 证据与范围 |
| --- | --- | --- |
| 保存后的资源/引用审计 | **1081 / 1081** | [v2-scene-audit.json](validation/day5a-plus/v2-scene-audit.json)：资源身份、meta、引用、输入保护与视图绑定；不证明像素、真实命中或音频。 |
| Creator 引擎探针 | **36 / 36** | [v2-engine-probe.json](validation/day5a-plus/v2-engine-probe.json)：实际引擎组件、事件/状态、进度和结果流程；不等同浏览器自然播放或物理输入。 |
| 已编译实际脚本的 mock 行为组 | **原 146 + 新 28 = 174** | [v2-final-tests.log](validation/day5a-plus/v2-final-tests.log)、[新增测试](../tools/verify-day5a-v2.cjs)：包括返回首页、再开始、直接重玩、动态目录、清洁分母、按钮监听和 Tween 清理。 |
| 项目真实 Cocos 类型检查 | **通过** | [v2-final-cocos-types.log](validation/day5a-plus/v2-final-cocos-types.log)：strict / noUnusedLocals / noUnusedParameters；使用 Creator 实际 SDK 引用。 |
| 安装 SDK 声明自检 | **仍有 102 条诊断** | [v2-final-sdk-self.log](validation/day5a-plus/v2-final-sdk-self.log)：jsb.d.ts 18 条、cc.d.ts 84 条；单独命令退出 1，不记为项目类型错误或 SDK 全通过。 |

命令、执行时间与退出码见 [v2-final-commands.json](validation/day5a-plus/v2-final-commands.json)。

### 已完成的真实 Preview 操作

以下数值直接来自本轮 Preview 完成界面；计时自然流逝，包含自动化工具观察、截图与操作停留，**不是性能或完成速度 benchmark**。

| Preview 尺寸与轮次 | 完成订单 | 累计星级 | 总分 | 完成步骤 | 总用时 | 失误 |
| --- | --- | --- | --- | --- | --- | --- |
| 390 × 844，完整一轮 | 9 / 9 | 21 / 27 | 4890 | 13 / 13 | 395.7 秒 | 2 |
| 1280 × 720，第一轮 | 9 / 9 | 26 / 27 | 6970 | 13 / 13 | 208.0 秒 | 0 |
| 1280 × 720，直接重玩后的第二轮 | 9 / 9 | 23 / 27 | 7240 | 13 / 13 | 180.5 秒 | 0 |

390 × 844 已完成三种玩法、9 单 13 步，以及“整轮总结 → 返回首页 → 再开始”；保留了错误拖拽/接线回弹、清洁中间值、结算蒙层阻挡和后续多步骤订单截图。证据：[整轮总结](validation/day5a-plus/screenshots/final-v2-390x844.jpg)、[返回首页](validation/day5a-plus/screenshots/return-home-v2-390x844.jpg)、[再开始](validation/day5a-plus/screenshots/restart-after-home-v2-390x844.jpg)、[蒙层阻挡](validation/day5a-plus/screenshots/result-v2-modal-block-390x844.jpg)。

1280 × 720 已完成第一整轮、直接重玩、第二整轮，以及“返回首页 → 再开始”；关闭音效的状态在返回与再开始后保留。证据：[第一轮总结](validation/day5a-plus/screenshots/final-v2-1280x720.jpg)、[直接重玩](validation/day5a-plus/screenshots/replay-v2-1280x720.jpg)、[第二轮总结](validation/day5a-plus/screenshots/final-replay-run-v2-1280x720.jpg)、[静音返回首页](validation/day5a-plus/screenshots/return-home-muted-v2-1280x720.jpg)、[静音再开始](validation/day5a-plus/screenshots/restart-after-home-muted-v2-1280x720.jpg)。

768 × 1024 已实测首页→订单1→结果→下一单，并继续完成订单2～5，覆盖清洁0/57%及接线0/3、1/3和完成。该比例没有完整九单，不把三比例表述为各自整轮通过。

### 尚未覆盖与已知环境限制

- 当前只有电脑；物理触摸、原生 TOUCH_CANCEL、微信/抖音真机或小程序平台构建未在本轮验证。
- 本轮操作检查了音效开关及其会话保留，但没有进行独立音频听感或录音验收。旧 Day 5A 音频事件日志属于旧轮次，不替代 V2 本轮听感证明。
- Creator Preview 的运行中 live viewport 尺寸切换需要重载；分别以新尺寸重新加载的 390 × 844、1280 × 720 已完成上述操作。该限制不写成动态旋转适配通过。
- 没有 FPS、真机性能、平台包体或外部用户验证结论。

## 7. 交付辅助

[完整项目打包脚本](../tools/package_v2_delivery.py) 收集 Git 可见的正式当前文件，保留 assets/meta、项目设置、扩展、工具、旧新文档证据、素材 master 与提示词，并排除 library、缓存、依赖目录和密钥。脚本在项目外写入 ZIP 内逐文件 SHA-256 清单，执行 CRC、逐条字节校验及新的临时目录解压复核，禁止覆盖已有交付包。本文不把脚本或 plan 结果表述为最终 ZIP 已完成。

本文为本轮新增记录，历史变更记录与历史验收证据继续保留。
