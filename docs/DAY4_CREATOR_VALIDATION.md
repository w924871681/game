# DeskRescue / 桌面急救站 — Day 4 实测记录

验证日期：2026-10-08（Asia/Shanghai）。项目 `D:\game`，版本 `0.0.4`，实际编辑器 Cocos Creator **3.8.8**，TypeScript **5.8.2**，设计分辨率 **720 × 1280**。

**Day 4 代码、Creator Prefab/Scene、真实类型、引擎 probe 与电脑 Preview 完成；浏览器原生触摸适配器、手机 WebView、物理触屏及小游戏平台仍待验证。** 用户明确只有当前电脑，采用引擎模拟触摸。Preview 的鼠标拖动、引擎 synthetic Touch、mock 测试分别记录，不相互冒充。

## 1. 基线与产物

修改前运行原 58 组测试、真实 SDK 项目检查、语法检查及 Git 状态，并核对 Day 3 保存场景哈希。只读清单保存在 [day3-baseline-manifest.json](validation/day4/day3-baseline-manifest.json)，包含 65 个文件的大小及 SHA-256，版本为 0.0.3；Day 4 验收期间该清单未被改写。2026-10-08 公开准备时，仅将公开版本的 backupDirectory 改为脱敏占位符，原文件大小与 SHA-256 记录保留。修改前的本地临时备份及公开准备前的完整备份保存在工作区外。

Day 4 正式流程读取 OrderCatalog，包含 9 张订单、13 个步骤、3 种玩法；前三单保留 Day 3 内容及难度。原 58 组断言仍保留，原 Day 3 manager 以 LegacyLevelManager 供历史 fixture 使用，Day 4 另测正式 LevelManager。历史 Day 2/3 文档和验证文件的 17 项哈希均与基线相符，见 [final-integrity.json](validation/day4/final-integrity.json)。

## 2. Creator 实际装配和保存

通过本机 Creator 的 DeskRescue 项目扩展，使用实际 Node/Component、Prefab 序列化 API、Asset Database 和 Scene 保存 API 生成资源。没有手写 Scene/Prefab/meta JSON。Creator 登录由用户本人完成。

| 资源 | 路径 / 职责 |
| --- | --- |
| Game.scene | `assets/scenes/Game.scene`，正式订单 HUD、RunController、LevelManager、StageHost |
| DragMatchStage | `assets/prefabs/stages/DragMatchStage.prefab`，动态物品与目标池、局部 GameController |
| CableConnectStage | `assets/prefabs/stages/CableConnectStage.prefab`，线缆与接口池 |
| CleanSwipeStage | `assets/prefabs/stages/CleanSwipeStage.prefab`，InputSurface 与 DirtLayer |
| DragItem / DragTarget | `assets/prefabs/elements/DragItem.prefab`、`DragTarget.prefab` |
| Cable / Port | `assets/prefabs/elements/Cable.prefab`、`Port.prefab`，线头、固定起点、Graphics、Label |
| DirtCell | `assets/prefabs/elements/DirtCell.prefab`，Sprite 与 UIOpacity |

场景 UUID 为 `ef51aae5-f3a0-4ba5-9918-6d84e400d36f`。StageHost Inspector 绑定三个 Stage Prefab，Stage controller 各自绑定元素 Prefab。正式 LevelManager 不再持有固定 Item1～3/Target1～3 数组；旧六个节点保存在 inactive LegacyDay3 下，Canvas 的旧 GameController 已禁用。正式场景没有 Day1Prototype。按钮序列化 Click Events 为空，由代码管理一个稳定监听。

首次构建实际创建八个 Prefab，见 [first-build-report.json](validation/day4/first-build-report.json)。再次执行装配后 `createdAssets=[]`、`reusedAssets=8`，StageHost UUID 保持，场景再次保存，见 [build-report.json](validation/day4/build-report.json)（UTC 04:42:56）。

## 3. 保存的背景外观修正

首次全流程发现 CleanSwipeStage 的 680×650 InputSurface 背景覆盖 Stats 下半部。通过 `Correct Clean Stage Appearance`（Ctrl+Alt+8）加载原 Prefab、克隆实际节点、解除实例关联并由 Creator 重新序列化，将背景缩为 **680×560**。区域网格、位置、颜色、DirtCell 引用和原资源 UUID 均保留；没有修改正式 Scene。

保存结果见 [appearance-report.json](validation/day4/appearance-report.json)（UTC 04:42:15）：`ok=true`、`changed=true`、自引用数为 0。最终已保存资源的实际尺寸与报告一致。后续重复构建复用该资源，未还原外观。390×844 与 1280×720 均重新走到清洁订单，计时、失误、进度、教学和操作区域可见，清洁及结算正常。

- 修正前：[原遮挡画面](validation/day4/preview-clean-before-layout-fix.jpg)。
- 修正后：[390×844 清洁](validation/day4/ratio-390x844-clean-fixed.jpg)、[1280×720 清洁](validation/day4/ratio-1280x720-clean-fixed.jpg)。

## 4. 类型和自动检查

命令、退出码、日志及源码 SHA-256 见 [checks.json](validation/day4/checks.json)。

| 检查 | 实际结果 | 范围 |
| --- | --- | --- |
| `npm test` | **114/114** | Day 1：11，Day 2：19，Day 3：28，Day 4：56 |
| union / readonly / 非空 tuple 负向类型契约 | 9 个预期诊断符合 | 不计入 114 行为组 |
| `node --check tools/verify-day1.cjs` | 通过 | 语法 |
| `node --check tools/verify-day4.cjs` | 通过 | 语法 |
| 扩展 JS `node --check` | 7/7 通过 | 语法 |
| `npm run check:cocos` | 通过 | Creator 生成配置、真实 SDK、strict / unused，skipLibCheck=false |
| `node tools/verify-day1.cjs --cocos-types --check-sdk-declarations` | 退出 1，**102 条诊断** | SDK 自身：jsb.d.ts 18、cc.d.ts 84 |
| UTF-8 / 尾随空格 / 末尾换行 | 源码和文档通过；Creator 原生序列化格式单列 | 109 个文本无非法 UTF-8/尾空格；9 个 Scene/Prefab 和 1 个官方 `.url` 没有末尾换行，保留原输出 |
| `git diff --check` | 退出 0 | Day 4 验收时全为未跟踪文件，此命令本身不能证明其内容合格 |

项目检查只分离已安装 SDK 声明的语义诊断；项目源文件、项目声明及配置/语法诊断仍为失败条件。没有修改 SDK 或 temp 声明来隐藏错误。有限 mock 不能证明真实渲染或浏览器触摸适配器正确。

最终全文扫描及 Markdown 链接检查见 [closing-checks.json](validation/day4/closing-checks.json)。Creator 原生输出的无末尾换行文件已明确记录；为保留引擎实际序列化结果与审计哈希，没有手工改写这些 Scene/Prefab。

## 5. 最终 Scene / Prefab 审计

[scene-audit.json](validation/day4/scene-audit.json)（UTC 04:43:21）来自保存文件的只读审计和实际 Editor 组件检查：**187/187 PASS**。

覆盖 Scene SHA-256/UUID、Canvas/UI Camera/Fit 设置、StageHost 三个引用、Stage controller、五个元素 Prefab、所有脚本/资源 UUID、局部组件引用、Inspector 绑定、无 Day1Prototype、无正式固定三物品依赖、无序列化重复按钮事件，以及实际 9 单 / 13 步目录。Scene 加八个 Prefab 的统计为 9 个资源、53 个节点、110 个组件、446 个内部引用和 28 个外部引用。

最终完整性检查将 **Scene+八个 Prefab 及对应 meta 的 18 个哈希**与审计记录逐项比对，通过。项目 39 个 meta / 39 个 UUID，无重复 UUID、孤儿 meta 或 `.meta.meta`。审计只验证引用和资源结构，运行时监听数量由行为测试及引擎 probe 补充。

## 6. 真实引擎触摸与动画探针

[engine-probe.json](validation/day4/engine-probe.json)（UTC 04:43:45）：**21/21 PASS**，失败 0，清理错误 0，原 TweenSystem 已恢复，正式场景未改变。

此探针在 Creator 场景进程内加载实际保存的八个 Prefab，创建独立离场 fixture，使用真实 `cc.Touch` / `cc.EventTouch` 发送到节点、真实坐标变换和隔离的 Cocos ActionManager。Editor 抑制游戏生命周期，因此明确同步调用输入组件生命周期，并以手动 delta time 推进真实 tween。

覆盖：

- 三种 Stage 实例化、同 kind 缓存复用、仅一个 active；drag/cable 池 2→4→2→4、dirt 池 20→35→32→20。
- drag 拾取 0.10 秒、吸附 0.15 秒、错误回位 0.18 秒及进度在落定后增加；错误精确一次、foreign touch 和 CANCEL 不扣分。
- cable 0.15 秒吸附、错误接口和空白释放各计一次、CANCEL 立即复位、ownership；不同旋转/非等比缩放父节点的世界坐标转换和 Graphics 端点。
- clean 0.08 秒 opacity 插值、START/MOVE 命中、连续线段扫掠、ceil 阈值、重复格不重复计数、CANCEL 保留进度、reset 后旧 fade 不隐藏新格。
- Host generation 过滤过期回调、订单 6/8/9 多步骤保留计时、完整 9 单 / 13 步、受控输入下 27 星和重玩保留缓存但重置结果。
- 三种教学首次有效进度后隐藏、重玩不重显；停用/启用保留进度与暂停计时；结果面板 0.8→1.08→1.0 真实插值。

这 **不是** Preview 自然时钟、浏览器原生触摸适配器、UI 命中测试或物理手指测试。毫秒时长与动画插值结论来自此探针；Preview 另外验证实际渲染和自然播放后的可见状态。

## 7. Preview 实际游玩

通过本机 Creator Preview `http://localhost:7456/`，用浏览器鼠标拖动/点击实际画布，不修改运行时状态或结果。完整第一轮为 1280×720；工具操作和记录证据之间的自然等待计入游戏时钟，因此成绩不作为性能或熟练玩家速度基准。

| 订单 | 已实际完成 | 结算显示时间 / 失误 | 证据 |
| --- | --- | --- | --- |
| 1 桌面整理 | 故意错误一次后完成 3 对 | 51.7 秒 / 1 | `preview-order1-result.jpg`、`preview-drag-wrong.jpg` |
| 2 线缆急救 | 3 对 drag | 11.4 秒 / 0 | `preview-order2-result.jpg` |
| 3 维修订单 | 3 对 drag | 17.2 秒 / 0 | `preview-order3-result.jpg` |
| 4 键盘除尘 | 连续、重复、空白、阈值完成 | 22.3 秒 / 0 | `preview-order4-result.jpg` |
| 5 主机接线 | 错误端口+空白释放，再完成 3 线 | 19.1 秒 / 2 | `preview-order5-result.jpg`、`preview-cable-wrong-blank.jpg` |
| 6 鼠标保养 | clean→drag，2/2 | 203.0 秒 / 0 | `preview-order6-before-transition.jpg`、`preview-order6-stage2.jpg`、`preview-order6-result.jpg` |
| 7 路由器布线 | 3 条交叉线 | 195.2 秒 / 0 | `preview-order7-result.jpg` |
| 8 直播桌急救 | drag 4→cable 2，2/2 | 14.9 秒 / 0 | `preview-order8-stage2.jpg`、`preview-order8-result.jpg` |
| 9 电脑综合维修 | clean→cable 4→drag 4，3/3 | 52.0 秒 / 0 | `preview-order9-stage2.jpg`、`preview-order9-stage3.jpg`、`preview-full-summary.jpg` |

上表图片均在 [validation/day4](validation/day4/) 下。第 6、7 单期间处理记录/修正方案造成较长等待，计时正常继续。第 8 单第二步显示 7.1 秒、第 9 单第二/第三步分别显示 24.6/37.5 秒，跨步骤没有归零。订单结算后时间冻结，下一单清当前失误。

最终总结实际显示：**完成订单 9/9，总用时 586.8 秒，总失误 3，总评价 20/27 星，总得分 5050，完成步骤 13/13**。随后点击“重新挑战”，回订单 1 / 步骤 1，归位 0/3、失误 0、物品恢复起点，计时重新开始，session 教学未重显，见 [总结](validation/day4/preview-full-summary.jpg) 与 [重玩](validation/day4/preview-replay.jpg)。新页面 session 首次教学可重新出现。

Preview 验证了 drag 正确/错误、cable 正确/错误端口/空白，以及 clean 连续/重复覆盖/空白/阈值；正确吸附、错误回位、污渍淡出与面板反馈在自然播放后状态正常。当前浏览器控制接口未提供可靠的按下后注入原生 CANCEL 路径，**Preview 原生 CANCEL 未验证**；drag/cable/clean CANCEL 与多指语义由上述真实引擎模拟触摸和 mock 验证，不把它写成浏览器实测。

首轮浏览器 warn/error 查询为空，见 [preview-console.json](validation/day4/preview-console.json)。Creator 曾因新增文件导入次序出现 StageHost 缺失模块的历史诊断；通过 Asset Database 重导入 StageHost/LevelManager 后已解决，最终审计、probe 与新 Preview 均能正常加载。没有删除历史控制台记录来隐藏诊断。

## 8. 外观修正后的三比例复验

每个比例显式设置浏览器 viewport，重新载入 Preview，再从 DOM 的 clientWidth/clientHeight 和截图核对实际尺寸。这里是桌面浏览器的比例模拟，未开启原生触摸仿真。

| 视口 | 实际操作范围 | 结果 / 证据 |
| --- | --- | --- |
| 390×844 | 完成订单 1～5；三种玩法；结算/下一单；重复覆盖和空白擦拭后保持 28% / 0 失误 | 通过；`ratio-390x844-result.jpg`、`clean-fixed.jpg`、`clean-repeat-blank.jpg`、`clean-result.jpg`、`cable.jpg`、`cable-result.jpg`（后三者等文件均有 `ratio-390x844-` 前缀） |
| 768×1024 | 完成第一单三次拖拽、结果面板、点击下一单进入订单 2 | 通过；`ratio-768x1024-start.jpg`、`ratio-768x1024-result.jpg`、`ratio-768x1024-next.jpg` |
| 1280×720 | 首轮全 9 单/重玩；最终保存资源后重新完成订单 1～4，复验清洁背景与结算 | 通过；`ratio-1280x720-start.jpg`、`ratio-1280x720-result.jpg`、`ratio-1280x720-clean-fixed.jpg`、`ratio-1280x720-clean-result.jpg` |

三个比例的文字、物品、按钮均在画布内；设计画面按比例留黑边，未用拉伸修改关卡坐标。390 与 1280 的清洁区实测不再挡住 Stats。没有宣称三种比例各跑完九单。三次复验查询均无 warn/error，最终日志为 [ratio-console.json](validation/day4/ratio-console.json)。测试结束恢复浏览器默认 viewport，保留一个新载入的可玩 Preview。

## 9. Git、文件保全与剩余边界

Day 4 验收时 Git 为 `master`、无 commit、0 tracked；当时项目文件均未跟踪。该次验收未执行 commit/push 或 reset/clean。`library/`、`temp/`、构建和依赖目录由现有 .gitignore 排除，不作为交付内容。没有下载外部素材、安装第三方依赖、引入存档/经济系统/平台 SDK 或开始 Day 5。

最终哈希和文件检查见 [final-integrity.json](validation/day4/final-integrity.json)。`.creator/asset-template/typescript/Custom Script Template Help Documentation.url` 是 Creator 模板目录下观察到的官方帮助快捷方式，不在原基线中，保留并标记未比对，没有把它伪称为已验证历史文件。

2026-10-08 公开准备：用户已另行明确授权首个 commit 和 push，目标为公开仓库 [w924871681/game](https://github.com/w924871681/game)。本段记录授权和准备，不预先声明执行完成或填写 commit SHA；授权不扩展到 Day 5 或平台发布。114 组行为、187 项审计、21 项引擎探针结论保持为本报告的实际验收记录。用户当前只有电脑，这些不阻塞本轮电脑端 Day 4 交付；SDK 本身 102 条声明诊断继续如实单列，不代表 SDK 零错误。

实现细节见 [DAY4_ARCHITECTURE.md](DAY4_ARCHITECTURE.md)，编辑器装配/复验入口见 [DAY4_COCOS_SETUP.md](DAY4_COCOS_SETUP.md)，后续 GPT 交接见 [GPT_HANDOFF.md](GPT_HANDOFF.md)。
