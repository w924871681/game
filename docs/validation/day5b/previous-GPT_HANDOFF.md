# DeskRescue /《桌面急救站》— 当前交接（V2.2 / alpha.4）

> 2026-10-16补充：用户已正式冻结V2.2可试玩视觉基线并授权本次feature提交/推送。先读 [冻结记录](DAY5A_V22_FROZEN_BASELINE.md)，其中列明9份公开证据匿名化及原SHA适用范围；旧报告不代表对匿名化后字节重新通过。此授权不包含main合并、发布或Day5B，以下“未授权Git”为此前实施阶段历史。

更新时间 **2026-10-16（Asia/Shanghai）**。实际目录 `<PROJECT_ROOT>`，Cocos Creator **3.8.8**，TypeScript **5.8.2**，720×1280 SHOW_ALL。当前 `0.0.5-alpha.4` 是从未提交alpha.3增量实施的V2.2：只处理清洁水平条带与小屏多设备/多线缆可读性，未重做六页界面。电脑端工程检查和限定Preview已完成；**水平带状感仍存在、改善细微，用户美术终审尚未确认。**

## 接手先读与操作边界

- [本轮任务原文](DESKRESCUE_V22_TASK.md)、[实施/保护范围与十组对比](DAY5A_PLUS_V22_CLOSEOUT.md)、[真实Creator及Preview验证](DAY5A_PLUS_V22_CREATOR_VALIDATION.md)。以下旧V2.1/V2交接全文是历史，不能把其中成绩当本轮结果。
- 用户只授权本地实施、Creator保存、测试、Preview及新项目外ZIP。**不授权Git add/commit/push/tag、切换分支、reset/clean/stash、发布、Day5B/5C或任何新系统/订单。** 保留全部未提交Day5A成果及用户新增两个V2.1 ZIP。
- 基线分支 `feature/day5a-visual-playable`、HEAD `ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22`、暂存区空。972文件基线及项目外完整备份见 [baseline.json](validation/day5a-plus/v22/baseline.json)；[最终保护审计](validation/day5a-plus/v22/preservation.json) 对照实际未提交alpha.3字节，不能用Git HEAD冒充该基线。

## 本轮改动与冻结合同

仅两份运行时TS改动：`V21CleanDustView.ts` 对原192软尘按稳定ID/seed预计算edgeShift和featherScale，扫掠单次smoothstep、alpha单调下降；`ElementVisual.ts` 新增默认false的smallScreenLegibility，四个元素Prefab显式开启，只改Icon/Label子层及稳定视觉key短名，font28/line32，深字配奶油描边2。Head Caption在上、Port在下，四设备/四部件标签与图案分离，WAN/LAN语义保留。源图和纹理不改，`V2CableLine.ts`不改。

本轮整个`CleanSwipeStageController.ts`、RunController、DraggableItem、CableConnector、OrderCatalog、StageDefinition及玩法控制器冻结。32/28、20/17、35/32阈值、ownership/CANCEL/generation、池、.08淡出、计时评分不改。四设备140×110、线头/接口130×80及输入根/祖先几何、吸附距离冻结。P2 Home/HUD/Result/Final/Canvas/相机/CSS冻结。不要继续调P0参数或扩展到Day5B；本轮只做一次受控实现，剩余带状感须交用户判断。

Scene/Prefab均由真实Creator API保存。7项：DragItem、DragTarget、Cable、Port、DragMatchStage、CableConnectStage、Game.scene；第二遍新增节点0。DirtCell与CleanSwipeStage没有重写。直接打开当前Game.scene后Preview；不要运行旧Day3/Day4重建。V2.2菜单快捷键Ctrl+Alt+Shift+F5应用、F6导入刷新、F7只读审计、F8真实引擎夹具；仅需查看时不要再次应用保存。

## 本轮实际验证与边界

- [checks.json](validation/day5a-plus/v22/checks.json)：224组＝原207＋新增8＋9；原五份历史suite字节保持。1060文件、无Creator temp/library隔离副本在TS5.8.2下224通过，用户temp SHA不变。项目真实SDK strict/unused exit0；SDK安装包自检仍exit1、102条诊断（18jsb＋84cc），不能称SDK通过。31JS/CJS和16Python语法通过，94项运行/工具/配置在执行前后不变。
- [最终Creator审计](validation/day5a-plus/v22/creator-audit.json) **2349/2349**，`2026-10-15T16:28:06.309Z`。实际重跑未修改V2.1 audit，raw1318/1319唯一失败为旧alpha.3版本门槛，保留并由严格alpha.4门槛替代；不是忽略历史失败。9核心UUID/meta、16输入祖先、全部172场景节点/组件语义及954基线冻结文件核验。
- [引擎probe](validation/day5a-plus/v22/engine-probe.json) **53/53＝原46＋7**；51个离屏夹具清理，TweenSystem恢复、正式场景不改。合成cc.Touch与离屏API是引擎夹具，不能代替浏览器原生Touch或物理触屏。
- [实际Preview](validation/day5a-plus/v22/preview-verification.json)：390×844一轮9/9、13/13，4210分、17/27星、613.0秒、0错；Final→Home→Start通过，后续部分轮覆盖斜/弧57及局部回扫。1280×720恢复后的完整一轮9/9、13/13，7820分、27/27星、123.5秒、0错；实际Replay回订单1、0/3、0失误，截图自然计时11.2秒。此前宽屏前三单中断partial另保留，不能拼成同一轮。768×1024仅前5单，O5结算810分/19.9秒/0错。计时含工具观察，不是benchmark。
- [63张本轮原图及历史对比清单](validation/day5a-plus/v22/comparisons/screenshot-inventory.json)、[十组1:1完整视口比较](validation/day5a-plus/v22/comparisons/comparison-manifest.json)。水平57/96仍见带状边缘，无内部网格；水平及斜向重复路径前后键盘ROI RGB相同、逻辑57不变。96新旧路径不同，不能把残尘位置差异全部归因于算法。P1四物品与三线交叉可读性增强；所选新旧3/4图均为前三根成功、风扇仍在左侧未连接，另一历史第四线吸附瞬态图单独保留，不修图。

没有本轮物理触屏、原生Touch/CANCEL、手机WebView、微信/抖音真机、自由旋转、FPS或独立音频听感结果。宽屏本轮页面warn/error保留日志0；390/768旧会话完整日志不可恢复，不宣称全会话零错。Creator旧Port错误和浏览器超时/加载中断历史保留，用户Esc时曾停止，获继续后恢复。

## 交付与唯一下一步

新包由 `tools/package_v22_delivery.py` 在 `<DELIVERY_ROOT>` 新建，含全部源码、源稿、场景/Prefab/meta、设置、扩展、测试、设计及新旧证据，排除.git和可再生缓存；三个历史证据ZIP明确保留。实际路径/大小/SHA/CRC/逐项哈希及新目录解压结果看外部同名 `.delivery.json`，包内含 `DELIVERY_MANIFEST.json`。不声称在第二台电脑完成Creator重新导入。

**下一步：用户审阅原尺寸截图 → 决定是否冻结Day5A+ → 另行授权建立GitHub基线 → Day5B。** 本轮停止在本地V2.2交付，不自动提交、推送、发布或开发后续阶段。

---

# 以下为V2.1及更早历史交接（当前以V2.2报告为准）

# DeskRescue /《桌面急救站》— 当前交接（V2.1 / alpha.3）

更新时间2026-10-15，实际目录 `<PROJECT_ROOT>`，Cocos Creator3.8.8、TypeScript5.8.2、720×1280 SHOW_ALL。用户授权在本地alpha.2未提交成果上执行V2.1任务，本轮本地实施、真实Creator保存、桌面Preview与交付整理已完成；**没有用户美术终审，未授权add/commit/push/tag、发布、Day5B/5C。**

## 接手先读

- [V2.1精修记录/文件职责](DAY5A_PLUS_V21_REFINEMENT.md)、[本轮Creator与Preview实际验证](DAY5A_PLUS_V21_CREATOR_VALIDATION.md)。
- [最终命令](validation/day5a-plus/v21/final-commands.json)、[独立无temp复验](validation/day5a-plus/v21/final-offline.json)、[比较工具后续语法补证](validation/day5a-plus/v21/final-syntax-supplement.json)。207＝原174＋清洁17＋视觉16，项目真实SDK strict/unused通过；SDK自身102条诊断仍exit1，不代表项目类型失败，也不能称SDK通过。
- [最终保存审计](validation/day5a-plus/v21/audit-current.json)1319/1319，686个文件SHA绑定、175meta、101PNG、7WAV、49资源key；[full装配](validation/day5a-plus/v21/build-full.json)第二遍九资源新增节点0；[实际引擎夹具](validation/day5a-plus/v21/engine-probe.json)46/46，44夹具清理、ActionManager恢复、正式场景未改。
- [当前原字节保护](validation/day5a-plus/v21/preservation.json)、[654文件开工快照](validation/day5a-plus/v21/baseline.json)、[项目外备份](validation/day5a-plus/v21/phase0-summary.json)。不能reset/clean/stash或覆盖旧成果。
- [真实Preview范围/成绩](validation/day5a-plus/v21/preview-verification.json)、[逐图尺寸/SHA与误命名更正](validation/day5a-plus/v21/comparisons/final-screenshot-inventory.json)、[六屏缩略图](validation/day5a-plus/v21/comparisons/final-six-screen-contact.png)。

## 本轮实现与保护

V21CleanDustView用固定192独立Sprite按控制器已接受路径羽化，不绑定逻辑格行列。CleanSwipeStageController仅可选引用和configure/sweep同步通知；ownership/CANCEL/阈值/计数/generation/池/.08淡出原样。RunController、DraggableItem、CableConnector、OrderCatalog、StageDefinition及Drag/Cable Stage控制器本轮保持原字节。九单十三步三玩法、旧174断言、原64PNG/7WAV及历史资料保留。

37张新PNG（18head/port＋19设备，590483字节）和37SVG独立目录，不覆盖旧皮肤；原49key顺序不变。ElementVisual.refinedLayout仅改设备/标签子层，V2CableLine.refinedStyle只画有界垂弧/四层材质/真实成功灯，线路装饰放输入/文字下。ResultStars可选错峰默认0兼容旧调用。Home/Final/HUD/Result布局仅视觉小改，不改命中根/评分/时钟。详细每文件目的和资源来源见精修记录、素材manifest和保护报告。

Scene与8核心Prefab由真实Creator API保存，UUID/meta保留；16输入节点及祖先几何严格比对。直接打开 `assets/scenes/Game.scene` 后Preview。可选菜单DeskRescue/V2.1及Ctrl+Alt+S/D/F/J/K/L分别样板/精修/全量/导入/审计/夹具。不要用旧Day3/Day4重建覆盖这些资源。

## 已测范围与剩余事项

390×844两轮9/9、13/13：首轮19/27星4290分903.9秒3错，第二轮21/27星5620分686.7秒0错；Home→Start与直接Replay通过。1280×720两轮9/9、13/13：24/27星6670分296.6秒0错、26/27星7160分187.8秒0错；直接Replay、Home→Start和OFF保留通过。768×1024只完成1～5单及三玩法/结果，不能称平板全九单。计时含工具停留，不是benchmark。三个尺寸都重新载入，未验运行中自由旋转。

清洁0/57/96与局部回扫见原图；斜/弧线57%局部残尘改善，但长水平直擦仍可见带状边界。接头/设备更易辨识、单单结果层级增强；3/4交叉线和小字仍需原尺寸审美评估。**是否达到用户认可的自然擦除及六屏美术效果尚未确认。** 参考图并非像素级复刻，保留SHOW_ALL薄荷留边。

首次Port导入临时失败与Preview超时/自动reload等历史保留；部分raw文件名早于实际画面状态，正式inventory逐项纠正，不能把pending或旧首页当通过证据。最终浏览器捕获warn/error为空仅表示当时保留记录，不代表Creator全会话零错。没有物理触屏、浏览器原生Touch/CANCEL、手机WebView、微信/抖音平台、FPS和本轮独立音频听感验证；synthetic真实cc.Touch和mock结果不可替代。

## 交付与下一步约束

最新包用 `tools/package_v21_delivery.py` 在 `<DELIVERY_ROOT>` 新建，不覆盖旧V2/基线包；包内DELIVERY_MANIFEST逐文件SHA/size，项目外 `.delivery.json` 记录实际ZIP大小/SHA、CRC与新目录解压复核。包含源稿、代码、Scene/Prefab/meta、设置、扩展、测试、设计和全部历史/本轮证据，排除缓存/敏感目录。不声称第二台电脑重新导入或手机发布通过。

分支仍 `feature/day5a-visual-playable`，HEAD仍 `ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22`，暂存区空，全为本地未提交。下一步先让用户看五组真实对比，尤其水平清洁补充；如需进一步调整，继续增量操作并复验相应范围。Git/发布/Day5B另需明确授权。

---

# 以下为V2历史交接（当前以V2.1报告为准）

# DeskRescue /《桌面急救站》— 当前交接（V2 / Day5A+）

更新时间：2026-10-15（Asia/Shanghai）。实际目录<PROJECT_ROOT>，**0.0.5-alpha.2**，Creator **3.8.8**，TypeScript **5.8.2**，2D/720×1280 SHOW_ALL。用户明确要求执行V2设计包，Esc停止后又明确授权继续。本轮已经完成本地实施、Creator真实保存、三比例桌面验证和交付整理；**不授权git add/commit/push/tag、发布、Day5B/5C或新订单/商业化**。

## 当前结果与入口

九单十三步三玩法保持。六屏已改为工坊、统一维修员、纸签HUD、独立统计胶囊、剪影槽位、曲线线路、不规则重叠尘团、金色操作按钮、真实结果与最终奖杯。最终两个入口分别直接重玩、返回首页；返回后再次开始新一轮并保留session音效开关。

直接打开 assets/scenes/Game.scene 后Preview即可；本轮Scene/8个核心Prefab均经真实Creator API保存，核心UUID/meta、输入节点变换和hitbox保持。不要运行旧Day3/4重建。DeskRescue/V2已提供幂等装配：Ctrl+Alt+A样板、B完整、I脚本导入、U审计、P真实引擎夹具；旧Day5A Apply已加V2保护。

## 最新证据

- [Creator/Preview完整验证](DAY5A_PLUS_V2_CREATOR_VALIDATION.md)、[Preview范围与成绩JSON](validation/day5a-plus/v2-preview-verification.json)。
- 当前源码最终 **174组=原146+28**；真实SDK项目strict类型通过；SDK自身**102条**声明问题独立失败保留。命令、时间、exit见[最终命令记录](validation/day5a-plus/v2-final-commands.json)。
- 保存文件审计 **1081/1081**；真实引擎夹具 **36/36**。后者是隔离ActionManager手动dt+cc.Touch emit，不替代浏览器原生触屏。
- 390×844整轮：9/9、13/13、21/27星、4890分、395.7秒、2失误；1280×720首轮26/27星、6970分、208.0秒、0失误；直接重玩第二轮23/27星、7240分、180.5秒、0失误。自然时间包含工具观察停留，不作benchmark。
- 390返回首页→开始通过；1280重玩→第二整轮→静音返回首页→开始通过。768×1024完成1～5单：首页/首单/结果/下一单、清洁/接线，不宣称该比例完整九单。
- [六屏总览](validation/day5a-plus/comparisons/six-screen-contact.png)、[7组同视口前后对比](validation/day5a-plus/comparisons/README.md)、[原截图目录](validation/day5a-plus/screenshots)、[逐截图SHA/尺寸/时间](validation/day5a-plus/v2-screenshot-inventory.json)。
- [V2前476文件基线](validation/day5a-plus/v2-baseline.json)、[当前逐文件保护报告](validation/day5a-plus/v2-preservation-report.json)：无删除，旧295重点保护、186历史证据与原146测试保留。项目外ZIP备份路径在基线中，不能reset/clean。

## 实现与源稿

[统一设计规范](DESKRESCUE_V2_UI_DESIGN.md)、[实际场景映射](DAY5A_PLUS_V2_SCENE_MAPPING.md)、[素材及真实UUID](DAY5A_PLUS_V2_ASSET_MANIFEST.md)、[逐项变更](DAY5A_PLUS_V2_CHANGELOG.md)。原设计包六图及任务书在 docs/design/v2-reference，作为参考，未当运行截图。

新增PaperOrderHUD/V2ResultView只展示真实状态；ButtonPressFeedback/WorkshopDecoration拥有并清理自己的Tween。V2CableLine观察原CableConnector，按端点与颜色通道绘制，不改其触摸逻辑。V2DirtAppearance只扩展装饰子图，不改32格判定。V2ViewportTheme仅Web背景和CSS clip，不改Canvas rect、设计分辨率或input坐标。

LevelManager必要新增returnHomeFromFinal()：仅最终状态接受，generation失效、Stage缓存复位、结果与计时清空后暂停；HomeController显示原首页并允许再次Start。RunController、DraggableItem、CableConnector、OrderCatalog原字节保持。旧CompletePanel动画保留；遮罩独立Canvas子节点，避免跟着缩放漏点。

15新增PNG与4份内置image_gen master/确切prompt、7SVG都保留，生成器离线且重复生成不覆写相同内容。使用同一角色master的四姿势与头像，系统字体未打包。现有Day5A设备/端口/音效继续保留。

## 已知边界与交付

这是已验收的本地alpha：艺术细节仍近似，设备较扁平、整行清洁有横向分区。Page03/Page05仍供用户审阅，不声称高保真像素级终审。Creator Preview运行中改视口需重载，独立三尺寸正常；物理触屏、浏览器原生Touch/TOUCH_CANCEL、微信/抖音真机、WebView、平台构建、FPS与本轮独立听感未测。

18:18 asset-db临时文件锁及资源JSON错误保留在历史失败记录；重试后完整保存/重复零新增及最终审计、探针、实际Preview通过。不能说Console整个会话零错误；本轮浏览器最终warning/error捕获为空。未来普通修复继续在此未提交工作区增量操作，涉及Git/发布/Day5B另需用户明确指示。

完整ZIP由 tools/package_v2_delivery.py 写入 <DELIVERY_ROOT>，内置DELIVERY_MANIFEST.json，逐条SHA/size、CRC和全新临时目录解压复核。项目外同名delivery.json是实际打包结果；打开新目录由Creator重建library/temp，未作第二台电脑或真机复现宣称。

分支feature/day5a-visual-playable，HEAD ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22，暂存区空；所有成果仍是本地未提交。完整未提交路径/数量见保护报告与交付清单。

---

# 以下为V2之前的Day5A历史交接，保留溯源；当前状态以上文和V2报告为准

# DeskRescue /《桌面急救站》— GPT 项目交接（Day 5A）

更新时间：2026-10-15（Asia/Shanghai）。本地目录 <PROJECT_ROOT>；版本 **0.0.5-alpha.1**；Cocos Creator **3.8.8**；TypeScript **5.8.2**；2D / 720×1280。

用户已明确授权“直接按文档开始 Day 5A”，并在中断后要求继续。当前授权为 **Day 5A 本地实施、Creator 装配和验证**，覆盖旧交接“不要自动开始 Day 5”的限制；不包含 commit/push、发布或 Day 5B/5C。保留当前未提交修改，不 reset/clean。

## 当前结论

九张订单、十三个步骤和三种玩法已经接入可操作首页、十九种设备插画、目标剪影、九种线头/接口、三张清洁底图、原创音效及星形结算。Game.scene 和八个核心 Prefab 已通过真实 Creator 保存，核心资产 UUID 保持；正式 StageHost.slicePreview=false，不允许漏图静默降级。

本轮项目类型与 146 组行为回归通过，圆角九切片资源审计 643/643，真实引擎探针 18/18。最终圆角皮肤的三比例真实鼠标 Preview 已完成：窄竖屏订单1～5、平板首单及下一单、横屏完整九单十三步与重玩均通过；七类自然 AudioSource STARTED/ENDED 已记录。实际范围、成绩和证据见[最终皮肤报告](validation/day5a/preview-final-skin.json)。

当前不是可发布商业 V1.0。物理触屏、手机 WebView、浏览器原生 Touch/TOUCH_CANCEL、微信/抖音平台未验证；模拟引擎 Touch 不代表这些输入链路通过。

## 基线与历史

- Day 1～3：拖拽归属、CANCEL、多指、坐标转换、动画、计时、评分、教程、总结和重玩，保留历史回归。
- Day 4：配置驱动九单十三步、Prefab Stage 缓存与动态元素池、接线/清洁、多步骤连续计时。
- Day 4 公共基线 main：[ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22](https://github.com/w924871681/game/commit/ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22)。Day 5A 开始时工作区干净，167 个已跟踪文件。
- Day 5A 当前分支 feature/day5a-visual-playable，尚未 commit/push。起点、工具和文件哈希见[baseline.json](validation/day5a/baseline.json)。

Day 4 的 114 组行为、187 项资源审计、21 项引擎探针及 20/27 星、5050 分那轮 Preview 是历史事实。原验证目录与截图未覆盖；当前视觉资源哈希已经变化，必须使用 Day 5A 证据。Day 4 架构仍说明九单和生命周期基础。

## 架构与关键文件

| 文件或目录 | 当前职责 |
| --- | --- |
| data/StageDefinition.ts、OrderDefinition.ts、OrderCatalog.ts | 只读 union、冻结目录与纯校验；ID、顺序、坐标、尺寸、阈值、评分保持 Day 4 |
| core/LevelManager.ts | 订单/步骤、HUD、教学、结算；新增可控首页启动及装饰反馈回调 |
| core/RunController.ts | 确定性计时、失误、评分、冻结结果与累计；本轮未改 |
| stages/StageHost.ts、ElementPool.ts | 每 kind 一份缓存、一次一个 active、池化及 generation；新增同步视觉绑定 |
| DragMatchStageController / CableConnectStageController / CleanSwipeStageController | 复用原判定，只接入图标、完成标记和设备底图 |
| gameplay/DraggableItem.ts、CableConnector.ts | 原触摸 ownership/CANCEL/吸附/回弹；本轮未改 |
| visuals/VisualCatalog.ts | 按稳定 stage/element ID 映射十九设备、九类接口和三清洁底图 |
| visuals/VisualAssetRegistry.ts | Scene-owned 同步本地 keys/frames；数组对齐与缺图明确报错 |
| visuals/ElementVisual.ts、CleanDeviceVisual.ts | 装饰子节点、目标剪影、完成标记与底图；不改变输入根 |
| ui/HomeController.ts、AudioFeedback.ts、ResultStars.ts | 首页单次进入、session 音效与自然事件、评分星形装饰 |
| assets/scenes/Game.scene、assets/prefabs/ | 正式 Scene、三个 Stage 与五个 Element Prefab |
| assets/art、assets/audio/sfx、tools/art | 运行 PNG/WAV、原创生成器、同几何 SVG 源与来源哈希 |
| extensions/deskrescue-editor/day5a-*.js | 真实 Editor 增量装配、只读审计、隔离引擎探针 |
| tools/verify-day1.cjs、verify-day4.cjs、verify-day5a.cjs | 单一 npm test 运行历史与本轮组件/映射测试 |

正式方向：LevelManager → StageHost → Stage controller → 局部玩法组件，同时使用 RunController。视觉 Registry 属于 Scene，Stage 配置时同步取图；没有远程加载器、EventBus、全局皮肤框架或平台 SDK。旧 LevelCatalog / LegacyLevelManager 仅保留历史 fixture。

## 首页、音效与视觉状态

正式 Scene 的 LevelManager.autoStartOnSceneLoad=false；start() 仅 pause、停用 Stage 和结果，RunController 未 beginLevel，不会偷偷计时。旧 fixture 默认 true，保留 Day 1～4 自动启动行为。

HomeController 位于 Canvas，overlay 指向 HomeOverlay。startRepair() 先防重、禁用按钮，再调用公开 startFirstOrder()；LevelManager.initialized 形成第二层幂等保护。成功才隐藏 overlay 并播点击音。disable/enable 精确解绑/重绑代码监听；Inspector Click Events 为空。

音效按钮位于 HomeOverlay 外，开始后仍可用。soundIcon/soundOnFrame/soundOffFrame 与真实 on/off SpriteFrame 绑定，文字同步。开关仅保存 session 状态；首次真实点击解锁前不播放，重载恢复默认开启。

AudioFeedback 使用单个 AudioSource 与七个原创 AudioClip，默认音量 0.25，禁止 autoplay/loop。以 cue+eventKey 去重、错误节流、队列上限四个待播音；自然 ENDED 后串行播下一条。disable/destroy 解绑 STARTED/ENDED、清空队列并 stop。实际自然事件日志只证明播放生命周期，不是独立听感或录音。

清洁完成实际使用 clean_progress.wav 短 cue，不逐格播放；多步骤切换用 stage_complete，订单和整轮分别用 order_complete/run_complete。完成事件由现有 Manager 回调触发，装饰与声音不额外计数。

ElementVisual.configure() 清除旧 tween/对勾，再换图和小标签；拖拽与线缆配置均先 hideArtwork，避免切片回退串图。完成标记只显示一次；复用/reset/deactivate/destroy 时停止所属动画。ResultStars 只显示 RunController 的星数，不改变评分。

完整素材：**49 PNG + 49 SVG + 7 WAV**，56 个运行资源共 **908,479 字节**，19 种独立设备、9 类 head/port、3 种清洁设备和 UI/首页。图形为原创几何、音频为原创合成；PNG/SVG 共享几何双输出，不能将手改 SVG 当作已同步 PNG。

card/button 真实导入为 192×128 SpriteFrame，trimType=none，borderLeft/Right=32、borderTop/Bottom=38；指定 UI 使用 SLICED。按钮用 ui/button，Sound 用 ui/card；PNG 本色与 Button tint 共同决定 pressed/hover 状态。输入根未因圆角或图像尺寸缩小。

## 数据与评分保持

| id | 订单 | 步骤 | 三星 时间/失误 | 二星 时间/失误 |
| --- | --- | --- | --- | --- |
| 1 | 桌面整理 | drag ×3 | 20秒 / 0 | 40秒 / 2 |
| 2 | 线缆急救 | drag ×3 | 25秒 / 0 | 45秒 / 2 |
| 3 | 维修订单 | drag ×3 | 30秒 / 1 | 50秒 / 3 |
| 4 | 键盘除尘 | clean 32格需28格 | 25秒 / 0 | 50秒 / 1 |
| 5 | 主机接线 | cable ×3 | 35秒 / 0 | 65秒 / 2 |
| 6 | 鼠标保养 | clean 20格需17格 → drag ×2 | 55秒 / 1 | 95秒 / 3 |
| 7 | 路由器布线 | cable ×3 | 40秒 / 0 | 75秒 / 2 |
| 8 | 直播桌急救 | drag ×4 → cable ×2 | 65秒 / 1 | 115秒 / 4 |
| 9 | 电脑综合维修 | clean 35格需32格 → cable ×4 → drag ×4 | 100秒 / 2 | 170秒 / 6 |

原目录及定义文件、RunController、DraggableItem、CableConnector 与基线保持。首三单文字、坐标及 96/64/64 吸附半径未因视觉而改变。三星/二星同时检查时间和失误且含边界；不足二星得一星。

得分为 max(100, 1000 - floor(elapsedMs / 1000) × 10 - mistakes × 100)。finishLevel 冻结整数毫秒结果，重复完成返回 null。多步骤计时连续；配置前 pause，启用输入后 resume，skipNextFrame 保守排除加载所在一帧，不采用系统时钟。

拾取 0.10 秒、吸附 0.15 秒、回弹 0.18 秒、清洁淡出 0.08 秒、结果约 0.24 秒保持。正确吸附结束后计数；错误 END 先消费 ownership，只记一次失误；foreign touch、重复 END、CANCEL 不重复计数或记错。清洁仍使用格子路径覆盖和 ceil 阈值。

## 生命周期与操作约束

- LevelManager：startFirstOrder()/hasStarted 新增；loadOrder/loadStage/nextOrder/restartCurrentLevel/playAgain 保留。
- StageHost：loadStage/setInputEnabled/deactivateStage/resumeStage/resetAll/releaseCache；每 kind 最多一份、一次一个 active。
- Stage controller：configure/reset/deactivate/resume，只读进度及池快照；视觉资源通过 bindVisualAssets 注入。
- RunController：startNewRun/beginLevel/advanceTime/recordMistake/finishLevel/pause/resume/skipNextFrame，结果仍只读。

restartCurrentLevel 重开整单并保留前置结果；playAgain 仅最终态触发，清零本轮指标并复用 Stage 实例，污渍/对勾/物品复位。教程每玩法首次有效进度隐藏，错误/CANCEL 不隐藏，重玩保留已看集合。

onDisable 清监听、自有 tween 和回调、停用 Stage/pause；onEnable 只在已初始化 Playing 恢复进度，结果态不计时。Host 与 Manager generation 隔离迟到回调；onDestroy 释放缓存。不要为视觉重构这些计数与输入语义。

Game.scene UUID 为 ef51aae5-f3a0-4ba5-9918-6d84e400d36f，八个 Prefab UUID 同样保留。Prefab 原生再序列化会重分配内部 fileId；审计记录 before/after，严格检查输入路径唯一性、父层级、transform、anchor、layer、hitbox 和旧 targetOverrides 残留。不要混同内部 fileId 与资产 UUID。

清洁 InputSurface 为 **680×560**，DeviceArtwork 在 DirtLayer 下。所有新增外观均为装饰，不挂输入拦截器；实际事件遮挡还须 Preview，静态审计不能代替。

## 实际验证与证据

| 层次 | 结果和边界 |
| --- | --- |
| 行为 | **146/146** = 11+19+28+56+32；历史 114 全保留，有限 mock 执行实际编译组件 |
| 类型契约 | 9 个预期负例诊断，单列，不算行为组 |
| 项目真实 SDK | TS **5.8.2** strict/unused 通过，真实 Editor 生成引用 |
| SDK 自身声明 | **102** = jsb 18 + cc 84，单独报告、skipLibCheck=false |
| 脚本语法 | 14 JavaScript、2 Python，通过；生成器未在行为测试中偷写资产 |
| 保存资源 | [643/643](validation/day5a/scene-audit.json)，9 核心资源、111 meta、49 PNG、7 Audio、46 稳定映射 |
| 幂等装配 | [full-build-report](validation/day5a/full-build-report.json)，第二遍九资产新增节点均 0 |
| 引擎探针 | [18/18](validation/day5a/engine-probe.json)，真实注册类/Prefab、隔离 fixture、手动 ActionManager dt |
| 最终圆角版 Preview | [preview-final-skin.json](validation/day5a/preview-final-skin.json)：9/9 单、13/13 步、24/27 星、2失误、6250分、259.2秒，重玩回 0/3 |
| 自然音频 | [audio-final-skin.json](validation/day5a/audio-final-skin.json)：七类真实 STARTED/ENDED，无合成事件或运行态修改 |

引擎探针显式同步 Editor 不自动执行的生命周期，并恢复 TweenSystem、清理 off-scene fixture；不等同自然帧、像素、浏览器命中或真实音频。行为/类型总表见[checks.json](validation/day5a/checks.json)，文件审计与真实 Preview 分开报告。

最终 Preview 用时含工具操作与等待，不是玩家表现或性能指标。订单9逐单时间未从最终总面板推测；重玩画面归位0/3、失误0、完成标记消失，截图时计时已自然走到5.2秒，不代表计时清零失败。

最后圆角修改后：390×844 完成订单1～5，涵盖拖拽/清洁/接线与结算、音效开关；768×1024 完成首单及下一单；1280×720 完成全部九单十三步与重玩。三比例最后操作时段的 Console warning/error 均为空，未声称每个比例各跑九单或编辑器历史从未报错。

圆角前首轮 [preview-run.json](validation/day5a/preview-run.json)与[首轮总结截图](validation/day5a/screenshots/first-run-full-summary.jpg)保留25/27星、2失误、6390分、243.6秒；原五类自然播放报告 [audio-preview.json](validation/day5a/audio-preview.json)也保留。这些是先前阶段记录，正式无前缀截图对应最新圆角版，不混用两轮成绩。

清洁 dirty→half→nearly 实际可见灰尘减少并露出底图，nearly 截图为85%；达标后 Stage 自动停用并显示结果。clean-done 截图是结果面板，不能声称它展示无遮挡的100%干净设备。

## 复验入口与交接资料

```powershell
git status --short --branch
npm test
npm run check:cocos
node --check tools/verify-day5a.cjs
node tools/verify-day1.cjs --cocos-types --check-sdk-declarations
```

完整 SDK 自检因102条SDK声明问题退出非零；项目检查缺失真实 Editor 配置时应失败，不能降级到 tools/test/cc.d.ts 冒充SDK。PNG/WAV复现命令为 python tools/art/generate_day5a.py --phase full。

Creator 的 DeskRescue / Day 5A：Apply Visual Skin（Ctrl+Alt+9）、Audit Visual Assets（Ctrl+Alt+0）、Refresh Day 5A Scripts（Ctrl+Alt+R）、Run Real Engine Probe（Ctrl+Alt+2）。不要重跑 Day3 或 Day4 资源构造菜单覆盖当前视觉。

源稿/绑定：[素材](DAY5A_VISUAL_ASSETS.md)、[视觉规范](DAY5A_VISUAL_STYLE_GUIDE.md)、[装配与 Inspector](DAY5A_COCOS_SETUP.md)。当前执行范围与最终三比例截图：[Creator 验收](DAY5A_CREATOR_VALIDATION.md)。逐文件变更：[DAY5A_CHANGELOG.md](DAY5A_CHANGELOG.md)、[changed-files.json](validation/day5a/changed-files.json)。历史基础：[Day 4 架构](DAY4_ARCHITECTURE.md)。

## Git 与剩余边界

公共仓库为 [w924871681/game](https://github.com/w924871681/game)，本地起点为前述 Day 4 main 基线；本轮只修改本地 feature/day5a-visual-playable，未自动 commit/push、打 tag 或发布。工作区含新增脚本/原创资源/meta、九个更新核心资源、Editor扩展、工具与Day5A文档/证据；确切清单以最终变更清单和 git status 为准。

后续提交需新的用户授权，审查真实源码/资产/源稿/必要settings/文档，继续排除 library/temp/build/node_modules/cache 和私人文件。不要把旧上传授权套用到本轮。

仍未验证原生 Touch 适配器、原生 TOUCH_CANCEL、物理手机、手机 WebView、微信/抖音构建；不宣称稳定 FPS、商业留存或独立听感。未实现经济、存档、账号、广告/支付、后端和平台SDK。Day 5B 六个新增样板与 Day 5C 三十单未开始，不自动扩展。
