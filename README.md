# DeskRescue / 桌面急救站 — Day 4 / V0.0.4

Cocos Creator 3.8.8 · TypeScript strict · 2D · 720 × 1280。

配置驱动的桌面维修小游戏：**9 张订单、13 个步骤、3 种微玩法**。每张订单包含 1～3 个拖拽归位、线缆连接或滑动清洁步骤；计时和失误跨步骤累计，完成订单后给出星级、得分，最后显示整轮总结并支持重新挑战。

Day 4 代码、真实 Creator Scene / Prefab、项目真实类型检查、引擎探针和电脑 Preview 九订单闭环已完成，390×844、768×1024、1280×720 三比例操作复验通过。浏览器原生触摸适配器、手机 WebView、物理触屏及小游戏平台尚未验证。

## 从这里开始

- 用 **Creator 3.8.8** 打开 `D:\game`，打开已有 `assets/scenes/Game.scene` 后 Preview。正式场景和八个 Prefab 已保存，通常无需重新装配。
- [Day 4 架构](docs/DAY4_ARCHITECTURE.md)：数据、流程、缓存、对象池和输入规则。
- [Creator 装配与复验](docs/DAY4_COCOS_SETUP.md)：Inspector、Editor 菜单和资源说明。
- [Day 4 实测记录](docs/DAY4_CREATOR_VALIDATION.md)：检查边界、日志和截图。
- [GPT 交接](docs/GPT_HANDOFF.md)：当前进度、关键文件与后续工作边界。

## 订单目录

| 章节 | 订单 | 步骤 |
| --- | --- | --- |
| 基础订单 | 1 桌面整理、2 线缆急救、3 维修订单 | 各一段拖拽；完整保留 Day 3 数据与难度 |
| 维护入门 | 4 键盘除尘 | 清洁 |
| 维护入门 | 5 主机接线 | 连接 |
| 维护入门 | 6 鼠标保养 | 清洁 → 拖拽 |
| 综合维修 | 7 路由器布线 | 连接 |
| 综合维修 | 8 直播桌急救 | 拖拽 → 连接 |
| 综合维修 | 9 电脑综合维修 | 清洁 → 连接 → 拖拽 |

新增内容写入 `assets/scripts/data/OrderCatalog.ts`，无需按订单编辑 Scene。目录为只读、递归冻结的 discriminated union，并在启动和测试中校验。StageHost 每种 Stage Prefab 最多实例化一次；各 Stage 的本地元素池支持 2～4 件物品、2～4 根线缆及最多 64 个污渍格。

LevelManager 编排订单、步骤、HUD、首次教学和结果；RunController 统一计时、失误和评分。拖拽复用 DraggableItem / GameController；线缆使用 CableConnector；清洁使用可池化格子与 0.08 秒淡出。旧 LevelCatalog / LegacyLevelManager 仅保留历史回归，正式流程使用 OrderCatalog / StageHost。

三星、二星均同时检查时间与失误且包含边界；得分为 `max(100, 1000 - floor(elapsedMs / 1000) × 10 - mistakes × 100)`。正确拖拽/连线在 0.15 秒吸附完成后计数；错误释放记一次失误并在 0.18 秒内回位；CANCEL 不计失误。每种玩法的教学首次有效进度后隐藏，重玩保留已看状态。

## 验证状态

| 层次 | 当前证据 |
| --- | --- |
| 自动行为测试 | **114 / 114**：Day 1 / 2 / 3 / 4 = 11 + 19 + 28 + 56；运行实际编译组件的 mock 环境 |
| 项目真实类型 | Creator TypeScript **5.8.2**、真实 SDK；strict / noUnusedLocals / noUnusedParameters 通过 |
| SDK 自身声明 | 仍有 **102** 条语义诊断：jsb.d.ts 18、cc.d.ts 84；单独报告，未修改 SDK，skipLibCheck=false |
| Scene / Prefab | Creator 实际保存 Game.scene 和 8 个 Prefab；[审计 187 / 187](docs/validation/day4/scene-audit.json)；重复构建 created=0 / reused=8 |
| 真实引擎探针 | [21 / 21](docs/validation/day4/engine-probe.json)：真实 Prefab、cc.Touch / cc.EventTouch、独立真实 ActionManager 手动推进时间；正式场景未改变 |
| 电脑 Preview | 完整 1～9 订单、13 步骤及重玩；截图：[总结](docs/validation/day4/preview-full-summary.jpg)、[重玩](docs/validation/day4/preview-replay.jpg) |
| 三比例最终复验 | **通过**：390×844 完成订单1～5、覆盖三玩法；768×1024 完成首单及下一单按钮；1280×720 完成九单及重玩，外观修正后再次完成1～4 |
| 移动端 / 平台 | 浏览器原生 Touch 适配器、手机 WebView、物理触屏、微信/抖音尚未验证 |

完整 Preview 一轮记录：9/9 订单、13/13 步骤、20/27 星、3 次失误、586.8 秒、5050 分。用时包含工具操作和自然等待，**不是性能基准**。Preview 使用浏览器鼠标与真实渲染；CANCEL、多指与精确动画时长的证据来自引擎模拟事件，不能替代物理触屏结论。

清洁 InputSurface 曾遮住 HUD，已通过 Creator 将尺寸从 680×650 改为 **680×560**，保留 Prefab UUID 和原 Scene；见 [外观修正记录](docs/validation/day4/appearance-report.json)。当前审计和探针均在该修正之后重新执行。

三比例均检查实际画布尺寸和截图，操作范围如表，未声称每个比例都完整跑九单。[390×844 清洁](docs/validation/day4/ratio-390x844-clean-fixed.jpg)、[768×1024 结算](docs/validation/day4/ratio-768x1024-result.jpg)、[1280×720 清洁](docs/validation/day4/ratio-1280x720-clean-fixed.jpg)可查看布局；该轮浏览器 [warning/error 日志为空](docs/validation/day4/ratio-console.json)。

在项目根目录运行：

```powershell
npm test
npm run check:cocos
node --check tools/verify-day1.cjs
node --check tools/verify-day4.cjs
node tools/verify-day1.cjs --cocos-types --check-sdk-declarations
```

最后一条是完整 SDK 自检，当前因上述 102 条声明诊断退出非零；项目检查通过不代表 SDK 自身零错误。缺少 Editor 生成的真实类型配置时，`check:cocos` 明确失败，不使用测试声明冒充 SDK。

## 保存与范围

Day 4 验收时 Git 为 `master`，尚无 commit，项目文件仍未跟踪；该次验收未执行提交、推送或发布。修改前的 [Day 3 基线清单](docs/validation/day4/day3-baseline-manifest.json) 保留文件大小与 SHA-256，历史 Day 2 / Day 3 文档和证据保持不变。

用户已明确授权 Day 4，覆盖旧交接中的 Day 3 范围限制。**不自动开始 Day 5。** 当前不包含经济系统、存档、账号、后端、广告/IAP、平台 SDK、远程配置或下载的正式美术。
