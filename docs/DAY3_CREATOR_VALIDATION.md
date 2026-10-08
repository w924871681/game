# Day 3 Creator 实测记录

2026-10-06；项目 D:\game；游戏 0.0.3；实际 Creator / 引擎 3.8.8。

## 场景及背景已保存

已在实际 Creator 中创建 Canvas、装配固定 UI、绑定引用并保存 assets/scenes/Game.scene。场景/脚本 metadata 及 temp/tsconfig.cocos.json 均由 Editor 生成，没有手写序列化或生成配置。

十个 Sprite（背景、三个物品、三个目标、提示、结算面板、按钮）已统一使用内置 default_panel，UUID b730527c-3233-41c2-aaf7-7cdab58f9749@f9941，全部 SLICED；原山景占位图已移除。Canvas 720×1280、UI Camera 绑定、Fit Width/Height 正确。

保存文件的只读审计 **61/61 通过**：[scene-audit.json](validation/day3/scene-audit.json)。场景 SHA-256 为 45d4dd68eece697bdfe1ff206f0560f2bd8425dcad28e04db163b058e87401c1；运行探针后重读仍一致。

## 实际 Preview 验收

通过 http://localhost:7456/ 实际渲染及浏览器原生拖拽/点击操作，没有注入游戏状态或调用完成方法。尺寸使用 DOM Canvas CSS 边界核实。

| 比例 | 实际画布 | 已验证与证据 |
| --- | --- | --- |
| 手机竖屏 | 390×844；预设 390×844，窗口 420×900 | 中文、HUD、目标、物品、提示完整；首关三个拖拽、提示隐藏、结算及按钮。[布局](validation/day3/phone-390x844.jpg)、[结算](validation/day3/phone-result.jpg) |
| 平板 3:4 | 768×1024；Webpage Full Screen | 第二关标签/顺序正确；USB 线错误释放回弹，只记一次错误；正确拖拽、结算、下一关按钮。[布局](validation/day3/tablet-3x4.jpg)、[回弹](validation/day3/tablet-wrong-return.jpg)、[结算](validation/day3/tablet-result.jpg) |
| 横屏 16:9 | 独立新预览 1280×720 | 竖版游戏居中完整，左右留空；连续三关、整轮、重玩。[布局](validation/day3/landscape-16x9.jpg)、[整轮](validation/day3/run-summary.jpg)、[重玩](validation/day3/replay-reset.jpg) |

预览工具的 iPad 菜单和运行中窗口调整曾保留旧 GameDiv 宽度，因此菜单名称不能作为实际比例证据；平板以实际 768×1024 记录，横屏重新创建实际 1280×720 预览。连续运行中窗口尺寸自动适配不记为全面通过。

手机首关 86.5 秒、0 错误、1 星、140 分；平板第二关 23.0 秒、1 错误、2 星、680 分。耗时包含验收停留；显示秒数四舍五入，得分按实际毫秒中的整秒计算。

修正背景后的独立横屏完整一轮：

| 订单 | 显示用时 | 错误 | 星级 | 得分 |
| --- | --- | --- | --- | --- |
| 桌面整理 | 21.3 秒 | 0 | 2 | 790 |
| 线缆急救 | 7.0 秒 | 0 | 3 | 940 |
| 维修订单 | 7.4 秒 | 0 | 3 | 930 |
| 整轮汇总 | 35.7 秒 | 0 | 8/9 | 2660 |

整轮显示 3/3。“重新挑战”实际点击后回到订单 1/3、计时 0.2 秒、错误 0、物品初始位置，教程不再显示；下一关按钮实际点击通过。该预览 warn/error 日志为空。

## 真实引擎的模拟触摸与动画

用户确认只有电脑，先做模拟触摸。在实际 Editor 菜单执行 DeskRescue → 运行引擎验收；报告时间 2026-10-06T12:10:23.455Z，**9/9 PASS**：[engine-probe.json](validation/day3/engine-probe.json)。

探针使用真实 cc.Touch、cc.EventTouch、UITransform、项目组件和 Cocos ActionManager，节点不进入正式场景。Editor 不自然驱动游戏 Tween，故同步隔离作用域中手动推进 delta-time，显式调用临时组件生命周期；结束后恢复原 TweenSystem、清除临时动作、销毁节点，无 snapshot/save。

| 检查 | 实际结果 |
| --- | --- |
| 抓取 0.10 秒 | 中点缩放 1.03、终点 1.06；取消恢复 1.0 |
| 吸附 0.15 秒 | x=60 → 中点 80 → 终点 100；完成后只计一次，期间重复输入无效 |
| 回弹 0.18 秒 | (300,100) → 中点 (100,0) → (-100,-100)；错误只记一次，返回后可再拖动 |
| 多指归属 | ID 0 保持归属；外来 ID 99 的 start/move/end/cancel 均不能接管或完成 |
| 取消 | 近/远目标都立即复位，0 错误、0 完成、0 残留 Tween |
| 重新配置 | 抓取/吸附中 configure 停止旧动画、保留新起点，旧回调不计数，新配置可完成 |
| 禁用/启用 | 吸附中禁用停止 Tween、复位并移除监听；启用后可完成 |
| 变换坐标 | 不同父节点旋转、非均匀缩放下，最终世界坐标吻合 |
| 面板 0.14+0.10 秒 | 0.8 → 1.01 → 1.08 → 1.04 → 1.0，按钮/中文文案正确 |

Preview 已实际观察抓取/移动、吸附锁定、错误回弹、面板自然播放后的终态；精确中间值及动画期间事件由真实引擎隔离探针验证。该探针不验证浏览器触摸适配器 hit test，不等同于物理触屏、手机 WebView 或 Preview 自然时钟的精确计时实测。

## 类型检查与回归

- npm test：退出 0，58 组 mock 行为通过（11+19+28）；[输出](validation/day3/npm-test.log)。行为 harness 使用实际编译后的项目脚本，不能替代渲染或原生输入。
- npm run check:cocos：退出 0，Editor 生成配置、真实 SDK、配套 TypeScript 5.8.2；项目 strict/noUnusedLocals/noUnusedParameters 通过；[输出](validation/day3/check-cocos.log)。
- main.js、scene.js、probe.js 的 node --check 通过。

SDK 自身 102 项声明语义诊断（jsb.d.ts 18、cc.d.ts 84）单独报告并排除；skipLibCheck=false。项目脚本/项目 .d.ts、语法、全局和配置错误仍会失败。完整 SDK 自检查 node tools/verify-day1.cjs --cocos-types --check-sdk-declarations 保留错误并退出 1，因此只称项目基于真实 SDK 的类型检查通过。

## 当前边界

背景已保存；三种实际比例、鼠标三关/错误释放/按钮/整轮/重玩、真实引擎模拟触摸与动画插值已验收。物理触屏、手机 WebView、小游戏打包和连续运行中窗口适配尚未验收。仍限于 Day 3，未自动提交、发布或开始 Day 4。
