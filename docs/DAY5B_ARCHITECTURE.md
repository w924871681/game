# Day5B 架构｜0.0.5-alpha.5

统一产品依据：`design/day5b/DAY5B_SIX_ORDERS_FINAL_DESIGN_SPEC.md`。本轮在 V2.2 的真实冻结提交 `63b5e55567546ebcd341d7af65ce4a5bbfec1c43` 上增量开发，本地分支 `feature/day5b-six-orders`。没有提交、推送或进入 Day5C。

## 目录与兼容

- 原 `OrderCatalog.ts`、`StageDefinition.ts`、`OrderDefinition.ts`、`LevelCatalog.ts` 保持原字节。原九单、十三步和评分、坐标不改。
- `Day5BStageDefinition.ts` 扩展严格 readonly 判别联合；旋钮两种 mode 也独立收窄。
- `Day5BOrderCatalog.ts` 导出六单 `DAY5B_ORDERS` 和正式十五单 `PLAYABLE_ORDER_CATALOG`。后者前九项是原目录的同一对象，全部深冻结。
- `Day5BStageValidation.ts` 校验热点数量、ID、边界、88 像素最小区域、区域重叠、角度、路径检查点、滑块和序列。原三种玩法继续使用原校验。
- 正式 Game.scene 的 `LevelManager.useAdvancedOrders=true`。未设置新属性的历史夹具仍使用原九单，保留历史224组断言；正式首页从订单1开始，订单9自然进入10。

## 新机制

| kind | 控制器 | 复用订单 | 真实规则 |
| --- | --- | --- | --- |
| fault-spot | FaultSpotStageController | 11、12、14 | 同ID START/END、移动≤12；错误候选每个只计一次；CANCEL不选择 |
| rotary-control | RotaryControlStageController | 10、11、13 | align旋转后松手，绿区±12°稳定0.6秒；unscrew两枚各270°，反向旋紧，跨角度边界展开 |
| guided-trace | GuidedTraceStageController | 11、15 | 连续MOVE经三个检查点；段采样、离轨返回已确认点；拒绝跨全程瞬移 |
| gauge-tune | GaugeTuneStageController | 13、14、15 | 两条独立滑块实时读数；实际安全指标0/2；双项达标且全部松手稳定0.7秒才完成 |
| sequence-test | SequenceTestStageController | 10、12、15 | 当前目标一直显示；错键保留进度；四步、按压反馈、只完成一次 |

`fanReading`、`stereoReading`、`broadcastReading` 是可独立测试的纯函数。初始失败和可达解均按设计规范保留。风扇指数不代表实际物理测量。

## 输入、生命周期和展示

`Day5BStageController` 复用原 StageRuntime/StageCallbacks。`Day5BSession` 只管理本舞台进度、延迟反馈和回调代际；时间由 update(dt) 推进，没有全局计时器、全局事件总线或自建评分。

`StageGesture` 逐根输入节点持有 touch ID，转换 StageHost 局部坐标。外来ID、重复END、CANCEL、重挂父节点、禁用和销毁均有独立测试。`StageHost` 使用具体类静态导入和 Inspector Prefab 分支，最多八个缓存根、一个活跃根；代际保护阻止旧回调结算新阶段。

`Day5BStageView` 管理设备图、复用控件、文字和装饰动画。按压与抬起只移动装饰子层，输入区域不跟着变形。实际 Preview 修正了反馈文字与HUD重叠、耳机数字被复用按钮遮挡的问题。

原 RunController、三种旧控制器、V2.2清洁/线缆美术组件及旧八个核心Prefab和meta不改。十五单累计27步、最多45星；运行结果由实际完成记录计算。

## 验证边界

`npm test` 为有限mock组件执行，不等于渲染。Creator探针使用真实Prefab、cc.Touch和ActionManager，以可控dt推进，独立于自然浏览器时间。Preview仅通过实际页面点击、拖拽验收，未注入引擎状态或分数。物理触屏、原生浏览器Touch/CANCEL适配器、手机WebView、微信/抖音SDK及人类难度校准不包含在已通过范围。
