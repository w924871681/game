# DeskRescue Day 5A 实测记录

更新时间：2026-10-15（Asia/Shanghai）。**Day 5A 本地视觉试玩实施和验收已完成**：正式 Creator 保存、完整素材绑定、真实 SDK 项目类型检查、三比例鼠标 Preview、九单十三步、重新挑战和自然音频事件均有独立证据。

基线为 `ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22`，开始时 `main` 干净，无用户原有未提交修改；167 个 tracked 文件和九核心资源 UUID 已写入 [baseline.json](validation/day5a/baseline.json)。当前本地分支 `feature/day5a-visual-playable`，版本 `0.0.5-alpha.1`，Creator **3.8.8**，真实 TypeScript **5.8.2**。Day 5A 变更尚未提交或推送。

## 分阶段实施

先完成首页、订单 1 / 4 / 5 的视觉切片，再扩展全部素材、严格绑定和九单终验。保留 [slice-build-report.json](validation/day5a/slice-build-report.json)、[切片审计484/484](validation/day5a/slice-scene-audit.json)、[切片试玩](validation/day5a/slice-preview.json)。切片当时订单2/3仅保留旧外观，有两条明确开发提示，不能用该记录证明全量视觉完成。

全量后又发现部分卡片仍用旧矩形 SpriteFrame，已通过 Creator 将原始 `ui/card` / `ui/button` 正式接入 nine-slice，并再次保存、审计、引擎探针及三比例完整实测。最终 `StageHost.slicePreview=false`，不允许缺图静默降级。

## 自动检查与真实引擎

| 层次 | 实际结论与证据 |
| --- | --- |
| npm 行为回归 | **146/146 = 原114 + 新32**；原 Day1/2/3/4 为11+19+28+56，未删除或降低旧断言。实际编译的项目类在有限 mock 环境执行；[npm-test.log](validation/day5a/npm-test.log) |
| 项目真实类型 | Creator3.8.8 SDK、TypeScript5.8.2，strict / noUnusedLocals / noUnusedParameters 通过；[check-cocos.log](validation/day5a/check-cocos.log) |
| SDK 自身声明 | 实际完整自检退出1，**102条 = jsb.d.ts18 + cc.d.ts84**；[sdk-declarations.log](validation/day5a/sdk-declarations.log)。保留原实际执行时间，最终代码后项目类型检查已另行重跑，未修改SDK或伪造temp配置 |
| 语法与文本 | JS/CJS **14/14**，Python AST **2/2**；当前47份源码无UTF-8、尾随空格、冲突或缺EOF问题。文档与所有最终证据的收尾检查另外记录 |
| 保存资源审计 | **643/643**；[scene-audit.json](validation/day5a/scene-audit.json)，读取真实保存资源、真实Editor类和导入metadata |
| 实际装配幂等 | [full-build-report.json](validation/day5a/full-build-report.json)；重复真实装配九资源全部新增节点 **0** |
| 真实引擎探针 | **18/18**；[engine-probe.json](validation/day5a/engine-probe.json)。15个隔离fixture全部清理，正式场景不改变，原TweenSystem恢复 |
| 最终命令与哈希 | [checks.json](validation/day5a/checks.json)记录退出码、源码/日志/Creator报告哈希，含音频观察日志变更后的真实重跑 |

引擎探针使用真实保存的 Prefab、注册组件、`cc.Touch` / `cc.EventTouch` 和实际 ActionManager 手动推进 dt；验证首页等待/幂等、监听清理、图形映射、池复用、清洁复位、星级动画、跨步骤计时、九单总结和重玩。这些是隔离真实引擎事件与动画证据，不能替代浏览器自然输入、自然时钟或物理触屏。探针的音频fixture是锁定/静音及synthetic ENDED契约，实际自然播放由下节的浏览器证据证明。

## 保存资源与外观约束

Game.scene 和八个原 Prefab 均通过 Creator scene/asset-db API 实际修改、保存和重新导入，未手写 Scene / Prefab / meta。九个核心资产 UUID 保持，输入节点的唯一路径、层级、位置、缩放、旋转、anchor、layer 与 hitbox 严格比对基线通过，清洁 InputSurface 仍为 **680×560**。

Creator 克隆再序列化时重新分配了10个输入节点的内部Prefab fileId；报告逐项列 before/after。这些内部标识不等于资源UUID，外部 targetOverrides 为0、旧ID依赖残留为0。未把“所有内部ID完全不变”当作事实。

当前实际导入：**49 PNG / SpriteFrame、7 WAV / AudioClip、49 Registry key、46条稳定映射**；项目 metadata **111**、包含子资产的唯一 UUID **209**。全部19设备、9类线头/接口、3个干净底图、污渍、首页、声音图标和结算星星都已绑定并出现在对应真实订单。逐项 Inspector key/UUID 见 [asset-manifest.json](validation/day5a/asset-manifest.json)，来源、尺寸、特征和SHA见 [asset-sources.json](../tools/art/asset-sources.json)，节点属性见 [DAY5A_COCOS_SETUP.md](DAY5A_COCOS_SETUP.md)。

卡片和按钮源图192×128、圆角24 px；实际Sprite为SLICED，metadata左右边界32、上下38。主按钮以青绿原始PNG乘以状态tint，保留0.08秒颜色过渡。外观不改根输入框；所有Button的Inspector Click Events为空，代码监听没有双重绑定。核心计数仍由原触摸及动画完成回调负责。

## 首页与七类自然音效

正式Scene设置 `LevelManager.autoStartOnSceneLoad=false`。初始仅显示首页，RunController暂停，没有active Stage；点击开始调用幂等 `startFirstOrder()`，只启动订单1/步骤1一次。默认选项仍为true，以兼容旧114组fixture。禁用/启用不自动再次启动；首页overlay关闭后不覆盖输入。开始、下一单、重新挑战和音效开关均实际可点，没有商城/广告/金币/继续游戏假按钮。

实际鼠标关闭/开启音效时图标与开/关文字同步；重新载入恢复默认开启。AudioSource playOnAwake=false、loop=false，用户手势解锁后播放，默认音量0.25。队列有界、事件key防重、错误音节流、disable/destroy双事件解绑并停止自有播放。

[audio-preview.json](validation/day5a/audio-preview.json)记录首次五类自然 STARTED/ENDED：点击4/4、错误1/1、成功9/9、订单完成4/4、清洁完成1/1。[audio-final-skin.json](validation/day5a/audio-final-skin.json)另记录最终圆角版完整九单中的**全部七类**自然事件：ui_click、snap_success、mistake、clean_progress、stage_complete、order_complete、run_complete。清洁完成实际使用 `clean_progress.wav`，不是 `stage_complete.wav`。事件来自真实Cocos播放器，未人工emit自然事件；未做独立听感评价或录音。

## 最终三比例鼠标 Preview

| 实际视口 | 实际覆盖 | 证据 |
| --- | --- | --- |
| **390×844** | 首页等待、音效关/开、开始、完整订单1～5、三种玩法；清洁0/57/85/100%；错误接线一次回位、正确三连接、结算 | [首页](validation/day5a/screenshots/home-390x844.jpg)、[拖拽](validation/day5a/screenshots/drag-390x844.jpg)、[音效关闭](validation/day5a/screenshots/sound-off-390x844.jpg)、[结果](validation/day5a/screenshots/result-390x844.jpg)、[phone-console.json](validation/day5a/phone-console.json) |
| **768×1024** | 首页、开始、首单三个拖拽、结算及点击下一单进入订单2 | [首页](validation/day5a/screenshots/home-768x1024.jpg)、[HUD](validation/day5a/screenshots/drag-768x1024.jpg)、[结算](validation/day5a/screenshots/result-768x1024.jpg)、[下一单](validation/day5a/screenshots/next-768x1024.jpg)、[tablet-console.json](validation/day5a/tablet-console.json) |
| **1280×720** | 完整九单十三步、错误拖拽/接线各一次、6/8/9跨步骤、整轮总结、重新挑战；等比留边 | [首页](validation/day5a/screenshots/home-1280x720.jpg)、[四列直播设备](validation/day5a/screenshots/order8-four-items.jpg)、[总结](validation/day5a/screenshots/full-summary.jpg)、[重玩](validation/day5a/screenshots/replay.jpg)、[landscape-console.json](validation/day5a/landscape-console.json) |

最终三比例的保存 Console **warning/error均为空**。仅对上述最后装配后的实际操作时间段作此结论，没有把Creator历史错误清掉或宣称整个编辑器历史Console从未报错。

最终圆角版成绩：**9/9订单、13/13步骤、24/27星、2次失误、6250分、259.2秒**。逐单观察值与汇总见 [preview-final-skin.json](validation/day5a/preview-final-skin.json)。重玩回到订单1/步骤1、进度0/3、失误0、对勾消失、首页不重新出现；截图时新计时已自然走到5.2秒，不能写成截图显示0秒。

前一次全量运行记录 [preview-run.json](validation/day5a/preview-run.json)仍保留：25/27星、2失误、6390分、243.6秒；对应[首轮总结](validation/day5a/screenshots/first-run-full-summary.jpg)和[首轮重玩](validation/day5a/screenshots/first-run-replay.jpg)。两轮均包含工具和观察等待，不是玩家速度、FPS或性能基准。第9单面板显示整轮结果，单独时间未显示；报告仅从整数累计减去前八单推导其得分/星/失误，单独时间留null。

## 清洁与动画视觉证据

- 键盘：[0%污渍](validation/day5a/screenshots/clean-dirty-390x844.jpg) → [57%](validation/day5a/screenshots/clean-half-390x844.jpg) → [85%](validation/day5a/screenshots/clean-nearly-390x844.jpg) → [100%阈值及结算](validation/day5a/screenshots/clean-done-390x844.jpg)。底层键帽确实露出；85%仍有残余污渍，结果面板出现后设备被遮住，没有把85%或结算图冒充无遮挡全净画面。
- 鼠标壳：[积尘](validation/day5a/screenshots/order6-clean-dirty.jpg)、[58%露出底图](validation/day5a/screenshots/order6-clean-half.jpg)、[装回零件](validation/day5a/screenshots/order6-stage2.jpg)。
- 机箱：[积灰](validation/day5a/screenshots/order9-clean-dirty.jpg)、[43%](validation/day5a/screenshots/order9-clean-half.jpg)、[四线](validation/day5a/screenshots/order9-stage2.jpg)、[四部件](validation/day5a/screenshots/order9-stage3.jpg)。
- 接线：[接前](validation/day5a/screenshots/cable-before-390x844.jpg)、[接错回位](validation/day5a/screenshots/cable-wrong-390x844.jpg)、[动态线和对勾](validation/day5a/screenshots/cable-connected-390x844.jpg)、[结果](validation/day5a/screenshots/cable-result-390x844.jpg)。

已直接查看真实截图，确认可辨认设备/剪影、灰尘淡去露底、动态线端点、四列布局、HUD与清洁输入不遮挡、结算重点与按钮可点。拾取0.10、吸附0.15、回弹0.18、污渍0.08秒的精确动画契约由自动回归/真实ActionManager证据支持；Preview观察自然渲染和结果，不声称由单张截图测出精确时长。

前后联系图仅拼接原始真实Preview截图并添加标题，没有替换设备、UI或成绩像素：[Day4与Day5A对比](validation/day5a/screenshots/before-after-comparison.jpg)、[清洁进度对比](validation/day5a/screenshots/clean-comparison.jpg)。使用本机已有Pillow生成，原始截图保留。

## 历史错误、保存和后续边界

Creator启动有既存cache-null初始化错误；早期素材重导入/加载曾有瞬时import下载失败。[last-operation-error.json](validation/day5a/last-operation-error.json)保留当时失败时间。修复了保存后等待重新导入和加载重试，后续真实保存、643审计、18探针和最终Preview均成功。该早期文件不能当作当前未完成状态，也不能掩盖其发生过。

67份旧Day3/Day4证据和10份订单数据/metadata的基线SHA保持。数据、坐标、吸附半径、requiredCells/阈值、评分、ownership、CANCEL、generation、核心生命周期没有因外观升级改变。未运行git commit/push/staging/tag/reset/clean或平台发布；逐文件变更见 [DAY5A_CHANGELOG.md](DAY5A_CHANGELOG.md)和[changed-files.json](validation/day5a/changed-files.json)。

未验证：物理触屏、手机WebView、浏览器原生TOUCH_CANCEL、微信/抖音构建与真机；未做FPS性能保证或独立音频听感录音。经济、存档、账号、后端、广告、支付、平台SDK仍未实现，Day5B/5C未开始。当前是本地视觉可试玩预览版本，不是已发布商业V1.0。
