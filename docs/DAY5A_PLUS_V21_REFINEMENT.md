# Day 5A+ V2.1 定向精修记录

当前版本：`0.0.5-alpha.3`。本轮环境：Windows、Cocos Creator 3.8.8、TypeScript 5.8.2。本地实现及声明范围的验证已完成：390×844、1280×720各两轮九单十三步；768×1024只完成订单1–5及三种玩法。**没有768全九单或用户美术终审通过结论**。交付包及最终保护审计结果由独立交付记录列示，不从图片或脚本存在推断通过。

## 1. 本轮解决什么

在已有 V2 六屏上精修：清洁的横向条带、接头/接口辨识、拖拽物体与标签可读性、单单结算奖励层级，以及首页和最终页少量比例调整。保留维修工坊、绿色防静电垫、纸签 HUD、双统计胶囊和维修小哥，不重做六页、不新增玩法或功能入口。

开始时读取的分支为 `feature/day5a-visual-playable`，HEAD 为 `ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22`。Phase 0 记录 654 个基线文件、512 条开始时 Git 状态，另存项目外安全 ZIP；未执行 add/commit/push、tag、release、reset/clean/stash 或切分支。

[基线](validation/day5a-plus/v21/baseline.json) 的 SHA-256 为 `9b05be70ef51312b0f74ad9604f8b3ad023a7f104130b9a024b4ce41939ed09e`。该数量是开工快照，不能替代随后新增截图与报告后的最终交付数量。保护步骤和备份完整性见 [Phase 0 记录](validation/day5a-plus/v21/phase0-summary.json)。

## 2. Phase 0：修复独立离线测试契约

在无 Creator `temp/` 的项目隔离副本中复现原始 `npm test`：4 条 TS2339 均来自测试声明缺少 `Color.r/g/b/a`。现有 mock 运行时已提供四个数值通道，因此只给 [tools/test/cc.d.ts](../tools/test/cc.d.ts) 补声明，不新增另一套 Color、不修改 SDK 或生产颜色逻辑。

修复前隔离测试退出 1，修复后同类无生成目录副本退出 0、原 174 组行为测试通过。两个隔离副本的源文件差异仅为该有限契约；用户原项目 `temp/` 未被删除、移动或修改。项目真实 Cocos 类型检查和安装 SDK 自身的 102 条历史声明诊断继续分开记录。

证据：[修复前报告](validation/day5a-plus/v21/phase0-offline-before.json)、[修复后报告](validation/day5a-plus/v21/phase0-offline-after.json)、[隔离复验工具](../tools/verify_v21_offline.py)。

## 3. 清洁：独立尘团与已接受路径

旧 `V2DirtAppearance` 把不规则尘图放在每个逻辑 DirtCell 下面。即使放大到格子 1.6 倍，整行逻辑格同时淡出时，仍会形成横贯键盘的透明硬边。V2.1 把可见灰尘移到独立装饰层，保留逻辑格作为不可见判定。

- 新 [V21CleanDustView.ts](../assets/scripts/visuals/V21CleanDustView.ts) 首次配置创建固定 192 个 Sprite，之后只复用与复位。位置采用低差异序列和确定性扰动，不与逻辑行列对齐；设计尺寸 28–62 px，单粒 alpha 60–96，复用 `v2/irregular-dust` 软边纹理。
- 独立 `DirtLayer/V21DustArtwork` 使用单位变换，不属于任何 DirtCell。装饰层没有 Touch、Button、BlockInputEvents、UIOpacity Tween 或每帧全屏处理。
- [CleanSwipeStageController.ts](../assets/scripts/stages/CleanSwipeStageController.ts) 只增加可选 `dustView` 和两处只读委托：建好原格子后 `configure(definition)`；原输入校验与逻辑扫掠结束后、业务进度回调前 `sweep(x0,y0,x1,y1,radius)`。
- 视图按粒子到已接受线段的距离，使用羽化边缘单调降低 Sprite alpha。它不读取或修改业务计数、不调用完成、不持有业务回调，也不独立监听或争夺触摸。
- START/MOVE 仍由原控制器检查输入开关、ownership 和坐标转换；END/CANCEL 只释放所属触摸，不通知新的尾段。已清区域局部回扫保持原逻辑计数。
- 旧 `V2DirtAppearance` 保持启用与 dust 引用，仅通过 Creator 关闭旧 dust 子 Sprite 的 renderer。原 cell root、0.08 秒 UIOpacity 淡出、generation、防旧回调和 ElementPool 不变。
- `configure` 才重置尘团；disable/enable、暂停/恢复保留其 alpha。没有异步尘团回调，销毁时只释放自己的固定节点。冻结的粒子诊断只返回标量快照，供夹具检查。

订单 4 保持 8×4＝32 个不可见逻辑格、28 格达标；订单 6 为 20/17，订单 9 为 35/32。百分比按要求格数计算，**不是灰尘质量或被清除的像素比例**。96% 对应 27/28，不意味着已经清理 32/32。

## 4. 接线：只增强插头与线材

Phase 1 先做电源、显示、网线三个 head/port 共 6 张透明 PNG 和 6 份 SVG；full 已推广到全部 9 类 head/port 的 18 张图，并精修 19 类设备，共 **37 张 PNG、37 份 SVG，运行时新增 590,483 字节**。都放在 V2.1 新目录，增加金属高光、暗边、厚度、针脚或凹槽；仍绑定原 `ports/...`、`devices/...` 稳定 key，不覆盖旧 PNG。源和哈希见 [素材清单](../tools/art/v21/asset-sources.json)、[生成器](../tools/art/v21/generate_v21.py)。清单记录 154 个被保护旧文件零变化。

[ElementVisual.ts](../assets/scripts/visuals/ElementVisual.ts) 的可选 `refinedLayout` 只扩大 Sprite/Label 子层，强化槽位对比并简化接口文字；不改 Head、Port、DragItem、DragTarget 输入根的尺寸、父层级、位置、anchor 或命中半径。

[V2CableLine.ts](../assets/scripts/visuals/V2CableLine.ts) 的可选 `refinedStyle` 增加有限下垂弧度、四层材质和成功灯。端点仍由原 anchor/head 世界坐标换算；灯只跟随真实 `isConnected`。只有自己的 Graphics 可移到 `V21CableArtworkLayer` 下层，输入根和文字节点保持原父层级；禁用/销毁只清理自身画线与灯，不影响其他线。

错误释放、CANCEL、0.15 秒正确吸附、一次失误与连接计数继续由原 CableConnector 管理。最后一根吸附完成后，同一业务帧直接结算；本轮没有为了截图延迟完成。

## 5. 拖拽、HUD 与结算的保守增强

Phase 2 拖拽与单单结算、Phase 3 首页/最终页的小幅调整均已通过 full 增量装配保存，并在 390×844 两轮完整流程中使用：

- 拖拽复用 `refinedLayout`，只调整子设备主体、阴影/轮廓与字号，保留输入几何和吸附/回弹时机。390×844、1280×720已覆盖订单1的3件、订单6的2件及订单8/9的4件；768×1024覆盖前三单拖拽，未延伸到订单6–9。
- 公共纸签仍使用独立订单、章节、标题、提示、步骤与进度 Label；RunController 继续直接更新计时和失误，装饰组件不拥有时钟。
- 单单结算增大金色徽章、标题、星星和主分数，调整角色与统计卡空间。结果仍取真实 LevelResult，下一单仍是唯一主操作。
- [ResultStars.ts](../assets/scripts/ui/ResultStars.ts) 增加默认 0 的可选入场错峰；只影响获得星星的动画，不改变评级或灰星。新旧补间均由原组件清理，禁用后保留已结算星级。
- 首页和最终页已小幅增强角色、Logo、字体比例；最终总结继续独立显示真实累计星级、总分、总用时、失误。390×844及1280×720已操作返回首页再开始及直接重新挑战，最终双按钮保留真实功能；截图证据与抓取误差见后文。
- 保留 SHOW_ALL 和 Web CSS clip 薄荷补边。没有拉伸 Stage、修改 Canvas rect、相机或触摸换算来消除留边，也不宣称跨平台原生背景延展已完成。

## 6. 文件职责与保存方式

| 类别 / 文件 | 本轮目的 |
| --- | --- |
| [CleanSwipeStageController.ts](../assets/scripts/stages/CleanSwipeStageController.ts) | 可选尘团视图引用及两处同步只读通知；保留原业务循环与生命周期。 |
| [V21CleanDustView.ts](../assets/scripts/visuals/V21CleanDustView.ts) | 固定池、散点软尘、局部路径羽化、只读诊断；不接管逻辑。 |
| [ElementVisual.ts](../assets/scripts/visuals/ElementVisual.ts)、[V2CableLine.ts](../assets/scripts/visuals/V2CableLine.ts)、[ResultStars.ts](../assets/scripts/ui/ResultStars.ts) | 默认兼容的可选视觉参数与自有装饰清理。 |
| [V2.1 素材目录与清单](../tools/art/v21/asset-sources.json) | 18张 head/port＋19张设备、可编辑 SVG、离线生成与来源哈希；保护旧图。 |
| [v21-main.js](../extensions/deskrescue-editor/v21-main.js)、[v21-scene.js](../extensions/deskrescue-editor/v21-scene.js) | 通过真实 Creator API 导入、绑定、增量装配、保存并重复检查幂等。 |
| [v21-audit.js](../extensions/deskrescue-editor/v21-audit.js)、[v21-probe.js](../extensions/deskrescue-editor/v21-probe.js) | 核对保存资源、UUID/引用、原输入变换及真实引擎组件行为；独立于像素审美。 |
| [verify-day5a-v21-clean.cjs](../tools/verify-day5a-v21-clean.cjs) | 新 17 组实际编译视图/控制器测试：路径、所有权、阈值、池、复位、清理及只读性。 |
| [verify-v21-visuals.cjs](../tools/verify-v21-visuals.cjs) | 新 16 组装饰几何、线材、灯、颜色缓存、旧/新星级补间与复用测试。 |
| [verify-day1.cjs](../tools/verify-day1.cjs)、[cc.d.ts](../tools/test/cc.d.ts) | 保留旧 174 组并接入新套件；有限测试契约修复，strict/unused 不放宽。 |
| [verify_v21_offline.py](../tools/verify_v21_offline.py)、[verify_v21_preservation.py](../tools/verify_v21_preservation.py) | 无生成目录隔离复验、原文件与受保护算法/证据审计。 |
| [compare_v21_previews.py](../tools/compare_v21_previews.py) | 同视口原像素比较与截图清单；外置标签、SHA 和嵌入像素回读，不伪造游戏画面。 |
| [package_v21_delivery.py](../tools/package_v21_delivery.py) | 项目外完整交付包、清单、CRC/SHA 和独立解包验证；实际产物及校验结论由独立交付记录列示。 |

Scene/Prefab/meta 均通过 Creator 3.8.8 的 Node/Component、Prefab 序列化、Asset Database 与保存场景 API 产生，不手写资源 JSON 或 UUID。full 已保存 8 个核心 Prefab 与 Game.scene；第二遍各资源新增节点均为 0。正式证据见 [full 装配报告](validation/day5a-plus/v21/build-full.json)，旧 sample/refine 报告继续保留阶段来源。

核心资源 UUID、输入节点 parent/anchor/layer/transform/size/hitbox 继续严格比对。Creator 可能重分配内部 fileId，需单列差异并检查 overrides 引用，不能把它混同核心资源 UUID 变化。

## 7. 已有阶段证据

| 阶段 / 层次 | 已实际得到的结果 | 解释 |
| --- | --- | --- |
| Phase 0 无 temp 隔离复现 | 修复前 4 条 TS2339；修复后原 174 组通过 | [phase0-summary.json](validation/day5a-plus/v21/phase0-summary.json)，没有清理用户原 temp。 |
| full 源码 mock 行为回归 | 207＝原 174＋清洁 17＋其他视觉 16 | [命令与退出码](validation/day5a-plus/v21/final-tests.command.json)、[实际日志](validation/day5a-plus/v21/final-tests.log)；不证明渲染。 |
| full 源码独立无 temp 回归 | 207 组，退出 0 | [独立项目报告](validation/day5a-plus/v21/final-offline.json)，使用有限 mock 声明。 |
| 项目真实 Cocos 类型 | full 项目 strict/unused 通过 | [实际类型日志](validation/day5a-plus/v21/final-cocos-types.log)；[SDK 自检](validation/day5a-plus/v21/final-sdk-self.log)自身102条诊断仍单列，不能写成SDK零错误。 |
| Phase 1 保存资源审计 | 1245 / 1245 | [audit-sample.json](validation/day5a-plus/v21/audit-sample.json)；是样板保存状态，不是最终 full 结论。 |
| Phase 1 真实引擎夹具 | 46 / 46 | [phase1-engine-probe.json](validation/day5a-plus/v21/phase1-engine-probe.json)；不等于自然播放、物理触屏或音频听感。 |
| Phase 1 真实 390×844 Preview | 清洁 0/57/96、局部回扫仍57；接线0/1、错误回位及最后结算已观察 | [审阅记录](validation/day5a-plus/v21/phase1-review.json)是当时样板结论；最终覆盖另列。 |
| Phase 2 保存资源审计 | 1248 / 1248，重复装配新增0 | [audit-refine.json](validation/day5a-plus/v21/audit-refine.json)、[build-refine.json](validation/day5a-plus/v21/build-refine.json)，保留为阶段证据。 |
| full 保存资源审计 | 1319 / 1319，重复装配新增0 | [audit-full.json](validation/day5a-plus/v21/audit-full.json)、[build-full.json](validation/day5a-plus/v21/build-full.json)。 |
| full 真实引擎夹具 | 46 / 46 | [engine-probe.json](validation/day5a-plus/v21/engine-probe.json)；仍不替代 Preview 像素与真机输入。 |
| 390×844 完整流程 | 两轮9单/13步，返回首页再开始与直接重玩已操作 | 真实汇总和截图见下表；计时包含工具停留。 |
| 1280×720 完整流程 | 两轮9单/13步，Replay及Final Home→Start实际执行 | 第二轮不是仅打开第一单；已真实完成并保留独立汇总图。 |
| 768×1024 限定覆盖 | 订单1–5完成，三玩法及单单结果 | 含清洁0/57/96、接线0/1及3/3触发结算；未测订单6–9和最终页。 |

### 390×844 两轮实际结果

| 轮次 | 完成订单 / 步骤 | 星级 | 总分 | 总用时 | 失误 | 原图 |
| --- | --- | --- | --- | --- | --- | --- |
| 第一整轮 | 9/9、13/13 | 19/27 | 4290 | 903.9秒 | 3 | [首轮保留图](validation/day5a-plus/v21/screenshots/final-run1-v21-390x844.jpg) |
| 第二整轮 | 9/9、13/13 | 21/27 | 5620 | 686.7秒 | 0 | [第二轮正式图](validation/day5a-plus/v21/screenshots/final-v21-390x844.jpg) |

以上为实际自然计时，包含浏览器工具超时、观察、截图与操作停留，**不是速度、FPS 或性能 benchmark**。第一单正式结算图真实显示 499.2秒、2次失误、100分和1星；该次停留被原计时规则如实计入，未为画面把分数改高。见 [真实单单结果](validation/day5a-plus/v21/screenshots/result-order1-v21-390x844.jpg)。

已实际执行 [整轮后返回首页](validation/day5a-plus/v21/screenshots/return-home-v21-390x844.jpg) → [再开始第一单](validation/day5a-plus/v21/screenshots/start-after-home-v21-390x844.jpg)，并执行 [重新挑战直接进入第一单](validation/day5a-plus/v21/screenshots/replay-direct-v21-390x844.jpg)。这些是390×844验证，不能替代其他尺寸覆盖。

### 1280×720 与768×1024的实际范围

| 宽屏轮次 | 完成订单 / 步骤 | 星级 | 总分 | 总用时 | 失误 | 原图 |
| --- | --- | --- | --- | --- | --- | --- |
| 1280第一整轮 | 9/9、13/13 | 24/27 | 6670 | 296.6秒 | 0 | [第一轮汇总](validation/day5a-plus/v21/screenshots/final-v21-1280x720.jpg) |
| 1280直接Replay后的第二整轮 | 9/9、13/13 | 26/27 | 7160 | 187.8秒 | 0 | [第二轮汇总](validation/day5a-plus/v21/screenshots/final-run2-v21-1280x720.jpg) |

宽屏第二轮还执行了 [Final Home返回首页](validation/day5a-plus/v21/screenshots/home-after-run2-v21-1280x720.jpg) → [再开始](validation/day5a-plus/v21/screenshots/start-after-home-v21-1280x720.jpg)，静音保持。Start保存图实际已计时144.4秒、0/3、零失误，是观察停留后的新一轮状态，**不是0.1秒新鲜启动图**。宽屏Replay后的0.1/0.3秒第一单在工具输出中被实际观察，但误名原图没有保存该时刻；[可靠的第二轮第一单结算](validation/day5a-plus/v21/screenshots/wide-run2-order1-result-stable.jpg)及完整第二轮是后续证据，不虚构缺失截图。

768×1024只完成订单1–5：包含首页、前三单拖拽、[清洁57%](validation/day5a-plus/v21/screenshots/clean-order4-57pct-v21-768x1024.jpg)、[96%](validation/day5a-plus/v21/screenshots/clean-order4-96pct-v21-768x1024.jpg)、接线0/1和[完成第五单的结算](validation/day5a-plus/v21/screenshots/order5-result-v21-768x1024.jpg)。没有768×1024的订单6–9、九单总结或最终双按钮实测结论。

完成后已重新加载390首页并记录 [DOM/INFO](validation/day5a-plus/v21/dom-390.json)，随后重置浏览器viewport覆盖、重新加载并停在 [默认1280×720首页](validation/day5a-plus/v21/screenshots/home-delivery-default-viewport.jpg)。保留的 [末次浏览器warn/error记录](validation/day5a-plus/v21/preview-console-final.json)为空；此范围不是Creator历史控制台或全运行周期从未报错。三尺寸均独立重新加载；不宣称运行中自由旋转已通过。

### 截图误名、超时和pending保留说明

原图不删、不改名、不修像素；[最终截图清单](validation/day5a-plus/v21/comparisons/final-screenshot-inventory.json)逐项标注17张已知特殊证据，同时保留原始ledger note：

- `phase2-drag-wrong-return-390x844.jpg`及`phase2-result-order1-390x844.jpg`实际是旧首页；不能证明回弹或结算，正式对比未采用它们。
- `timeout-order1-not-result-390x844.jpg`实际为订单1的2/3、290.7秒、1次失误，没有结算；实际后续结果为499.2秒、2错、100分、1星。
- `replay-direct-v21-1280x720.jpg`与第一轮宽屏汇总字节相同，实际仍是总结；不能当成Replay后第一单照片。`wide-run2-order1-result.jpg`实际为1/3、4.9秒，结算应采用单独的`-stable`图。
- Phase1的last-snap0/1/2仍是2/3；订单7三线过渡仍2/3、订单9四线过渡仍3/4。对齐、可见曲线数不等于已计入成功数。3/3实际完成图已有结算蒙层，不称无遮挡三成功。
- 文件名中的`four`、`two`可能只指可用线数；清单已把订单9初始图明确为0/4、订单8初始图为0/2。

当前112张原图：390×844为65张、768×1024为12张、1280×720为35张；它们同时含正式、阶段、诊断和误名证据，不把数量当通过数。生成inventory前后比对158张新旧原图，字节均未改变。

## 8. 视觉判断与保留差距

root 与独立代理直接检查了原始截图。技术视觉样板已满足推广条件，**不代表用户最终审美批准**。

- 斜向/弧线清洁57%时，残尘呈局部错落形态，0%键帽更易辨认，96%仍保留少量尘团。第二轮又补了水平两行16/28的57%原图：长直擦拭仍会产生可感知的带状清理边界，边缘来自路径和软尘分布，未显示8×4格子或格子边框。**不能把斜/弧线样板解读成任意长水平输入都不会出现带状边界**；是否足够自然仍交用户审美确认。
- 接头金属形状、针脚/槽口和方向更易辨认，蓝线圆润，1/3只显示一根成功。样板时中央非交互标题跨线的问题，在最终订单5图中已通过把标题放到路线下方改善；没有移动输入坐标。三/四线过渡图已保留，右侧紧凑端口文字和曲线交叉仍需按原尺寸审美评估，不能从缩略总览断言全部文字毫无遮挡。
- 四张末次吸附 raw 图中，0/1/2 都仍是 2/3、第三根 pending；第 3 张达到 3/3 时已有结算面板遮挡。因此没有“无遮挡三根已成功的 3/3 截图”，也没有为拍照添加业务等待。
- 仍有 SHOW_ALL 留边，未声称运行中自由旋转、原生背景延展、手机 WebView 或微信/抖音平台适配通过。
- 390与1280各两轮完整流程，768只订单1–5；未测范围明确保留。物理触摸、原生TOUCH_CANCEL、真机平台、FPS和独立音频听感不在已完成证据中；SDK自身102条诊断仍存在。

对比图：[清洁57%](validation/day5a-plus/v21/comparisons/phase1-clean57-v2-to-v21.png)、[接线1/3](validation/day5a-plus/v21/comparisons/phase1-cable1-v2-to-v21.png)、[末次吸附原图序列](validation/day5a-plus/v21/comparisons/phase1-cable-last-snap-sequence.png)。两张主比较都保留原始 390×844 游戏区域并逐 RGB 像素校验；标签在截图外。清洁的擦拭路径不同，接线旧图连接电源、新图连接显示线，不能把它们描述为相同输入路径或同一根线的受控比较。详见 [比较清单](validation/day5a-plus/v21/comparisons/phase1-comparison-manifest.json)。

最终图另存，不覆盖上述阶段证据：[六屏缩略总览](validation/day5a-plus/v21/comparisons/final-six-screen-contact.png)、[首页](validation/day5a-plus/v21/comparisons/final-home-v2-to-v21.png)、[斜/弧清洁57%](validation/day5a-plus/v21/comparisons/final-clean57-v2-to-v21.png)、[水平清洁57%补充](validation/day5a-plus/v21/comparisons/final-clean57-horizontal-v2-to-v21.png)、[接线1/3](validation/day5a-plus/v21/comparisons/final-cable1-v2-to-v21.png)、[真实单单结算](validation/day5a-plus/v21/comparisons/final-result-v2-to-v21.png)。总览明确缩略，五组并排图保持原始390×844像素；不同自然用时、成绩、擦拭路径和连接根已外置标注，未替换游戏像素。见 [最终比较清单](validation/day5a-plus/v21/comparisons/final-comparison-manifest.json)。

最终主观技术视觉审阅及全部边界另存 [final-visual-review.json](validation/day5a-plus/v21/final-visual-review.json)。没有把代理判断替代用户美术终审，也没有因为误名图或缺失无遮挡帧重写业务流程。

## 9. 继续保护的边界

不修改 `RunController.ts`、`DraggableItem.ts`、`CableConnector.ts`、`OrderCatalog.ts`、`StageDefinition.ts` 的业务规则；保留九单/十三步/三玩法、清洁阈值、评分、星级、ownership、CANCEL、generation、缓存池与阶段切换。没有新增 EventBus、平台 SDK、商业化假按钮或 Day5B/5C。

旧 Day 4、Day 5A、V2 素材与验证文件继续保留；本轮证据写入独立 `v21/`。本文件和最终视觉review明确实际覆盖与差距，项目交付包及最终保护审计采用独立记录；不反向改写旧报告使其看似验证了新版本。
