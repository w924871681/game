# DeskRescue /《桌面急救站》— GPT 项目交接（Day 4）

更新时间：2026-10-08（Asia/Shanghai）。项目目录：`D:\game`；版本：`0.0.4`；实际编辑器：**Cocos Creator 3.8.8**；TypeScript / 2D / 720×1280。

用户明确要求“直接按文档开始 Day 4 开发”，依据 `<USER_DOWNLOADS>/DAY4_CODEX_PROMPT.md`，并授权操作当前电脑完成 Creator 装配和验证。此授权覆盖旧交接的“不要自动开始 Day 4”。用户目前只有电脑，触摸验证使用模拟事件。**不自动开始 Day 5；本次首个 commit / push 已另获明确授权，不扩展到平台发布。**

## 当前结论

Day 4 已从原先固定三个 Item / Target 升级为配置驱动的 **9 订单 / 13 步骤 / 3 微玩法**。代码、Creator 保存的 Scene / 8 个 Prefab、项目真实 SDK 类型检查、187 项资源审计、21 项真实引擎探针，以及电脑 Preview 完整九订单与重玩已经完成。390×844、768×1024、1280×720 三比例最终操作复验也已通过，具体覆盖范围如下，不是每个比例各跑九单。

浏览器原生 Touch 适配器、手机 WebView、物理触屏、微信/抖音仍未验证。引擎 `cc.Touch` / `cc.EventTouch` 模拟事件不等同于物理触屏。不要把这些剩余边界误写成代码未装配，也不要把已经完成的电脑验证写成移动端通过。

## 历史与本次变化

- Day 1：A/B/C 拖拽、匹配、CANCEL、多指归属、坐标转换与监听清理。
- Day 2：三个中文订单、固定节点复用和拖起/吸附/回弹。
- Day 3：订单级计时、失误、星级/得分、三关总结、重玩与首次教学；历史行为测试共 58 组。
- Day 4：discriminated union 数据、Prefab Stage 缓存、动态元素池、线缆连接与滑动清洁、多步骤订单、每玩法 session 教学、9/13 整轮总结。

开始 Day 4 前已建立 [只读 Day 3 基线清单](validation/day4/day3-baseline-manifest.json)，记录当时脚本、场景、Prefab、扩展、README、handoff 和项目配置的相对路径、字节数、SHA-256。它是审计基线，不是 Git commit。Day 2 / Day 3 的装配文档和 validation 证据作为历史事实保留；当前正式入口是 Day 4。

## 架构与关键文件

| 文件或目录 | 当前职责 |
| --- | --- |
| `assets/scripts/data/StageDefinition.ts` | `StageKind` 与 drag-match / cable-connect / clean-swipe union；readonly 非空元组和基础坐标类型 |
| `OrderDefinition.ts` / `OrderCatalog.ts` | 订单结构、冻结目录、纯函数 `validateOrderCatalog`；id、数量、坐标、尺寸、网格、阈值与评分规则校验 |
| `assets/scripts/stages/StageRuntime.ts` | 只读进度与 onProgress / onMistake / onComplete 回调契约 |
| `StageHost.ts` | 类型化 Prefab 选择、每种最多一次实例化、只允许一个 active、generation 过滤、暂停恢复与释放缓存 |
| `ElementPool.ts` | 每个玩法独享数组池；补足缺口、复用旧节点、多余节点 inactive、销毁时释放 |
| `DragMatchStageController.ts` | 动态 2～4 对 Item / Target，复用原 DraggableItem 和局部 GameController |
| `CableConnectStageController.ts` / `gameplay/CableConnector.ts` | 动态 2～4 线缆，固定 anchor、可拖 head、Graphics、指定 port、坐标转换与输入归属 |
| `CleanSwipeStageController.ts` | 最多 64 个 dirt cell；线段覆盖清洁、ceil 阈值、0.08 秒淡出、重置和旧回调隔离 |
| `core/LevelManager.ts` | 正式 Day 4 订单/步骤编排、HUD、教学、结算、重开/重玩、生命周期 |
| `core/RunController.ts` | 确定性帧计时、暂停、失误、星级/得分、只读结果与累计总结 |
| `core/LegacyLevelManager.ts`、旧 `LevelCatalog.ts` | 历史 Day 1～3 回归兼容；不参与 Day 4 正式流程 |
| `gameplay/Day1Prototype.ts` | 独立旧 A/B/C 入口；正式 Scene 无此组件 |
| `assets/scenes/Game.scene` | 当前正式 Day 4 场景，原 Scene UUID 保留 |
| `assets/prefabs/stages/` | DragMatchStage、CableConnectStage、CleanSwipeStage 三个 Prefab |
| `assets/prefabs/elements/` | DragItem、DragTarget、Cable、Port、DirtCell 五个 Prefab |
| `extensions/deskrescue-editor/` | 仅 Editor 使用的装配、外观修正、只读审计与真实引擎探针 |
| `tools/verify-day1.cjs` / `tools/verify-day4.cjs` | 一个 npm test 入口运行全部历史与 Day 4 行为测试及类型契约检查 |

正式依赖方向：LevelManager → StageHost → 各 Stage controller → 局部玩法组件；LevelManager 同时使用 RunController。GameController 只提供局部拖拽进度/失误/完成回调，不反向导入上层。没有 EventBus、全局状态框架、Resources.load、运行时 Scene 拼装或网络目录加载。

详细设计见 [DAY4_ARCHITECTURE.md](DAY4_ARCHITECTURE.md)，完整 Inspector 和 Editor 操作见 [DAY4_COCOS_SETUP.md](DAY4_COCOS_SETUP.md)。

## 数据与规则

| id | 章节 / 订单 | 顺序与规模 | 三星 时间/失误 | 二星 时间/失误 |
| --- | --- | --- | --- | --- |
| 1 | 基础订单 / 桌面整理 | drag ×3 | 20秒 / 0 | 40秒 / 2 |
| 2 | 基础订单 / 线缆急救 | drag ×3 | 25秒 / 0 | 45秒 / 2 |
| 3 | 基础订单 / 维修订单 | drag ×3 | 30秒 / 1 | 50秒 / 3 |
| 4 | 维护入门 / 键盘除尘 | clean 32格，需28格 | 25秒 / 0 | 50秒 / 1 |
| 5 | 维护入门 / 主机接线 | cable ×3 | 35秒 / 0 | 65秒 / 2 |
| 6 | 维护入门 / 鼠标保养 | clean 20格需17格 → drag ×2 | 55秒 / 1 | 95秒 / 3 |
| 7 | 综合维修 / 路由器布线 | cable ×3 | 40秒 / 0 | 75秒 / 2 |
| 8 | 综合维修 / 直播桌急救 | drag ×4 → cable ×2 | 65秒 / 1 | 115秒 / 4 |
| 9 | 综合维修 / 电脑综合维修 | clean 35格需32格 → cable ×4 → drag ×4 | 100秒 / 2 | 170秒 / 6 |

前三订单数字 id、顺序、标题、指令、文字、起点、目标、96/64/64 吸附半径和评分规则完整迁移 Day 3。正式内容只读并递归冻结；外部小目录可通过 `LevelManager.orders` 注入测试，所有订单/步骤/星级总数从目录与结果推导，业务流程不硬编码 9/13。

星级同时满足时间和失误，边界包含在内；未满足二星则一星。得分集中在 RunController：`max(100, 1000 - floor(elapsedMs / 1000) * 10 - mistakes * 100)`。finishLevel 四舍五入为整数毫秒并冻结结果，再次完成返回 null。

计时覆盖整张订单，切步骤不重置。加载前 pause，配置完成且输入启用后 resume；`skipNextFrame()` 保守跳过包含同步加载的一帧，以排除配置开销。这是帧级近似，会同时少计该帧剩余时间；`advanceTime()` 的显式调用不受跳帧影响。没有系统时钟或 setTimeout。

拖拽维持 0.10 秒拾起、0.15 秒吸附、0.18 秒回弹；线缆吸附/回弹为 0.15/0.18 秒。正确吸附动画结束后计数；错误 END 先消费 ownership、精确记一次失误；重复 END、foreign touch、CANCEL 不重复计数或记错。清洁 START/MOVE 对路径覆盖的 cell 标记一次，`ceil(totalCells * requiredRatio)` 达标后锁输入，clean 本身不报失误。

每种 StageKind 首次进入显示教学；第一次有效进度 >0 后隐藏并记入 session 集合，错误/CANCEL 不隐藏；后续同玩法和 playAgain 保留已看状态，不持久化到磁盘。

## 公共接口与生命周期

- LevelManager：`loadOrder(index)`、`loadStage(index)`；兼容 `loadLevel`、`nextLevel`、`restartCurrentLevel`、`playAgain`；只读查询 currentOrderIndex/currentLevelIndex/currentStageIndex/totalOrders/totalStagesInCurrentOrder/state。
- 状态仍为 Playing / LevelComplete / DemoComplete。单一 nextButton CLICK 监听负责下一订单或重玩；Inspector Click Events 为空。
- StageHost：`loadStage(definition, callbacks)`、`setInputEnabled`、`deactivateStage`、`resumeStage`、`resetAll`、`releaseCache`；只读 currentKind/currentStageId/currentGeneration/cachedStageCount。
- Stage controller：具体 union 分支的 configure，setInputEnabled/resetStage/deactivateStage/resumeStage；只读进度和池节点快照。
- RunController：startNewRun/beginLevel/advanceTime/recordMistake/finishLevel/discardLastResult/pause/resume/skipNextFrame；只读当前指标、冻结结果列表和 summary。

`restartCurrentLevel` 重开整张订单，回到步骤 0，只撤销最后匹配订单结果，保留前置结果。`playAgain` 只在最终结果态触发，清零整轮指标、重置缓存内部状态但保留 Stage 实例和教程已看集合；重复点击不跳关。

onDisable 清按钮监听、自有 tween 和回调，停用当前 Stage 并 pause；onEnable 仅在 Playing 恢复原步骤与已有进度，结果态不恢复计时或输入。onDestroy 释放 Stage cache。Host 和 Manager 各自的 generation 拦截迟到回调，防止跳步骤、重复结算和污染新订单。

## Creator 当前资源与操作约束

Game.scene UUID：`ef51aae5-f3a0-4ba5-9918-6d84e400d36f`，原 LevelManager 脚本 UUID 保留。Canvas / UI Camera 已绑定，设计 720×1280，UI_2D，Fit Width/Height。旧固定 Item / Target 已归档到 inactive `LegacyDay3`，正式 LevelManager 不引用固定数组；正式 Scene 不挂 Day1Prototype 或 LegacyLevelManager。

StageHost 引用三个真实 Stage Prefab；Stage 内引用五种 element Prefab。所有 Scene / Prefab / .meta 都由 Creator 生成保存；不要手写这些序列化资源，也不要修改生成的 temp 类型配置或 Cocos SDK。不要在已经装配好的 Day 4 场景执行旧“装配 Day 3 场景”菜单。

清洁 InputSurface 原尺寸 680×650 遮住 HUD，已通过 Creator 修为 **680×560**，网格、节点位置、引用和 Prefab UUID 保留，正式 Scene 无需更换。修正记录：[appearance-report.json](validation/day4/appearance-report.json)，2026-10-08 12:42:15（Asia/Shanghai）。之后再次构建返回 **created=0 / reused=8**，证明重复装配复用资源，见 [build-report.json](validation/day4/build-report.json)。

优先打开现有 Game.scene 复验。仅修改脚本时等待 Creator 导入；必要时使用 `DeskRescue/Day 4/Refresh Project Scripts`。需要更新正式资源时使用 Day 4 菜单，并重新保存、审计；不要根据旧截图推测当前状态。

## 已完成验证与证据

| 验证层 | 实际结论 |
| --- | --- |
| mock 行为 | **114/114**：11 Day1 + 19 Day2 + 28 Day3 + 56 Day4；原 58 组未删除或弱化，通过 Legacy 保留回归 |
| 类型契约 | readonly / union / 非空 tuple 的 9 个预期编译诊断检查通过，不算入行为组数 |
| 项目真实 SDK 类型 | Creator 自带 TypeScript **5.8.2**；strict、noUnusedLocals、noUnusedParameters 开启并通过 |
| SDK 自身声明 | **102** 条仍存在：jsb.d.ts 18、cc.d.ts 84；仅从项目语义结果分开报告，skipLibCheck=false，SDK未修改 |
| 场景与资源审计 | **187/187**，2026-10-08 12:43:21；读取保存文件、SHA-256、UUID及实际 Editor 类/引用 |
| 引擎探针 | **21/21**，2026-10-08 12:43:45；真实 Prefab / Touch / Tween；原 TweenSystem 恢复、正式 Scene 未变化 |
| 电脑 Preview | 实际鼠标完成全部 9 订单 / 13 步骤，包含 6/8/9 连续步骤和重新挑战 |
| 三比例最终复验 | **通过**；实际 DOM 画布尺寸、截图与输入操作均核验，覆盖范围见下表 |
| 未实测 | 浏览器原生 Touch 适配器、手机 WebView、物理触屏、微信/抖音小游戏平台 |

引擎探针从正式场景只读取实际八个 Prefab 引用，创建 off-scene fixture，显式同步 Editor 不会自动执行的生命周期；使用真实 cc.Touch/cc.EventTouch 和独立真实 ActionManager 手动推进 dt。它验证取消、多指、动画插值、跨父节点坐标、池复用、旧回调、多步骤与重玩，不代表浏览器命中测试、自然帧计时或视觉渲染。电脑 Preview 的鼠标与真实渲染记录单独保存。

完整 Preview 一轮结果：**9/9 订单、13/13 步骤、20/27 星、3 次失误、586.8 秒、5050 分**。这轮包括工具操作和自然等待，不能作为玩家体验用时或性能基准。重玩回订单 1 / 步骤 1，已归位 0/3、失误 0，已看的教程不再出现。见 [总结截图](validation/day4/preview-full-summary.jpg)、[重玩截图](validation/day4/preview-replay.jpg)；逐订单结果、错误回弹与 6/8/9 中间步骤截图在同目录。

| 画布比例 | 实际操作覆盖 | 截图 |
| --- | --- | --- |
| 390×844 | 完成订单1～5，覆盖拖拽、清洁、连线；重复/空白清洁不计失误；修正后清洁背景不遮 HUD | [拖拽结算](validation/day4/ratio-390x844-result.jpg)、[清洁布局](validation/day4/ratio-390x844-clean-fixed.jpg)、[重复/空白清洁](validation/day4/ratio-390x844-clean-repeat-blank.jpg)、[清洁结算](validation/day4/ratio-390x844-clean-result.jpg)、[连线](validation/day4/ratio-390x844-cable.jpg)、[连线结算](validation/day4/ratio-390x844-cable-result.jpg) |
| 768×1024 | 第一单三个拖拽、结算及“下一张订单”点击，确认进入订单2 | [开始](validation/day4/ratio-768x1024-start.jpg)、[结算](validation/day4/ratio-768x1024-result.jpg)、[下一单](validation/day4/ratio-768x1024-next.jpg) |
| 1280×720 | 已完整九单与重玩；外观修正后再次完成订单1～4，清洁背景不遮 HUD | [开始](validation/day4/ratio-1280x720-start.jpg)、[结算](validation/day4/ratio-1280x720-result.jpg)、[清洁布局](validation/day4/ratio-1280x720-clean-fixed.jpg)、[清洁结算](validation/day4/ratio-1280x720-clean-result.jpg) |

三比例操作期间浏览器 warning/error 均为空，最新保存为 [ratio-console.json](validation/day4/ratio-console.json)。这些操作使用真实浏览器鼠标与渲染；CANCEL、多指及精确动画时长由引擎探针验证，没有把它们写成浏览器原生 Touch 实测。

主要证据：

- [scene-audit.json](validation/day4/scene-audit.json)、[engine-probe.json](validation/day4/engine-probe.json)。
- [npm-test.log](validation/day4/npm-test.log)、[check-cocos.log](validation/day4/check-cocos.log)、[sdk-declarations.log](validation/day4/sdk-declarations.log)。
- [checks.json](validation/day4/checks.json)、[runtime-audit.json](validation/day4/runtime-audit.json)、[preview-console.json](validation/day4/preview-console.json)。
- [Day 4 实测记录](DAY4_CREATOR_VALIDATION.md) 汇总最终验证步骤和截图。

如果之后保存或修改 Scene / Prefab / 脚本，应按新文件重新生成对应审计和探针，不能把旧 SHA-256 当作当前证据。历史 Day 3 hash 只证明历史状态。

## 复验命令与 Editor 菜单

在 `D:\game` 中执行：

```powershell
git status --short --branch
npm test
node --check tools/verify-day1.cjs
node --check tools/verify-day4.cjs
npm run check:cocos
node tools/verify-day1.cjs --cocos-types --check-sdk-declarations
```

最后一条保留 SDK 自身错误，当前预期退出非零并报告 102 条；不能把这一失败写成项目脚本错误，也不能把项目检查通过写成 SDK 零诊断。缺少 Editor 真实 temp 配置时，check:cocos 明确失败，不回退到 tools/test/cc.d.ts 冒充实际 SDK。

Creator 菜单 `DeskRescue/Day 4`：

- `Build Prefabs and Update Scene`：实际 Editor 资源装配；现已完成，重复执行应复用八个 Prefab。
- `Audit Scene and Prefabs`：读取保存的资源和 Editor 类信息生成审计。
- `Run Engine Probe`：执行隔离真实引擎探针，main.js 保存其返回结果。
- `Refresh Project Scripts`：触发项目脚本导入。
- `Correct Clean Stage Appearance`：已执行的清洁 surface 修正；仅确有需要时再操作。

不要以普通 Node 命令直接执行需要 `cc` 的探针来冒充 Editor 引擎验证；不要重造 Game.scene。

## Git 与后续边界

Day 4 验收时 Git 为 `master`，**No commits yet**，项目文件仍未跟踪；该次验收未执行 commit / push / reset / clean。当时不存在“已提交 Day 3 后的普通 diff”，应结合基线清单和文件哈希审查变更。提交时需要审核源码、真实 Scene / Prefab / .meta、必要 settings 和证据，继续排除 temp / library / build 等生成缓存。

2026-10-08 公开准备：用户已另行明确授权首个 commit 和 push，目标为公开仓库 [w924871681/game](https://github.com/w924871681/game)。提交前已在工作区外备份；本文不预先声明提交或推送已完成，也不记录尚未产生的 commit SHA。此授权不扩展到 Day 5 或平台发布。未来若补移动端验证，应明确新设备、实际输入路径和证据；当前无手机不能据此否定已完成的电脑端工作。新增 Day 5 内容、平台构建发布、经济/存档/广告/登录/后端等需要新的用户任务授权；**不要自动开始 Day 5**。
