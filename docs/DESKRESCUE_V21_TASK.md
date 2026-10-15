# V2.1 用户任务书原文归档

本文件归档用户提供并明确授权执行的 V2.1 任务书。实际进展、例外与证据以本轮验证报告为准；原任务中的要求不等于已经通过。以下分隔线后保持原文件字节。

---

# DeskRescue／《桌面急救站》Day 5A+ V2.1 真实截图驱动定向精修 — Codex 完整执行任务书

> **授权范围**：仅在用户本机 `D:\game` 的现有未提交 Day 5A+/V2 工作区内，实施本文明确的视觉修复、最小测试契约修复、Creator 保存与验收。**本次未授权 Git add/commit/push、tag、release、平台构建发布、Day 5B/5C、新关卡或商业化。**不得擅自进行 reset/clean/stash、切换分支或覆盖已有未提交内容。
>
> **目标版本建议**：`0.0.5-alpha.3`（若当前实际版本已变化，先报告并以真实状态为准）。
>
> **实施原则**：对已有 V2 做**局部精修，不重做六页、不改玩法架构、不改变输入坐标**。先做有代表性的画面样板，真正在 Creator Preview 中可视化检查，再推广到对应订单；必要时采用更保守但兼容的实现，不能为了技术炫耀加入复杂着色器或改变原游戏判定。

## 一、开工前：核实真实基线并保护成果

Codex 工作目录已设置为 `D:\game`，但仍必须自行确认 `pwd`、文件树、Git 和 Creator 环境。

先阅读：

- `README.md`
- `docs/GPT_HANDOFF.md`
- `docs/DAY5A_PLUS_V2_CREATOR_VALIDATION.md`
- `docs/DESKRESCUE_V2_UI_DESIGN.md`
- `docs/DAY5A_PLUS_V2_SCENE_MAPPING.md`
- `docs/DAY5A_PLUS_V2_ASSET_MANIFEST.md`
- `docs/DAY5A_PLUS_V2_CHANGELOG.md`
- `docs/validation/day5a-plus/v2-preview-verification.json`
- `docs/validation/day5a-plus/v2-preservation-report.json`
- `docs/validation/day5a-plus/comparisons/six-screen-contact.png`
- `assets/scripts/core/LevelManager.ts`
- `assets/scripts/stages/CleanSwipeStageController.ts`
- `assets/scripts/stages/DragMatchStageController.ts`
- `assets/scripts/stages/CableConnectStageController.ts`
- `assets/scripts/visuals/V2DirtAppearance.ts`
- `assets/scripts/visuals/V2CableLine.ts`
- `assets/scripts/visuals/ElementVisual.ts`
- `assets/scripts/ui/V2ResultView.ts`
- `assets/scripts/ui/ResultStars.ts`
- `assets/scripts/ui/WorkshopDecoration.ts`
- `assets/scripts/ui/HomeController.ts`
- `assets/scripts/gameplay/DraggableItem.ts`
- `assets/scripts/gameplay/CableConnector.ts`
- `assets/scripts/data/OrderCatalog.ts`
- `tools/test/cc.d.ts`
- `tools/verify-day1.cjs` 及其它 Day 5A/V2 验证脚本
- `extensions/deskrescue-editor/v2-main.js`、`v2-scene.js`、`v2-audit.js`、`v2-probe.js` 和扩展配置

先执行并记录：

```powershell
Set-Location D:\game
git status --short --branch
git rev-parse HEAD
git remote -v
npm test
npm run check:cocos
```

**已知历史事实（须复核）：** Day 4 公共基线 `ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22`；Day 5A+ V2 本地工作分支 `feature/day5a-visual-playable`，项目版本 `0.0.5-alpha.2`，当前 V2 未提交。历史报告称实际 Creator 3.8.8 + TS 5.8.2，174/174 mock 行为测试、1081/1081 资源审计、36/36 真实引擎夹具、390×844 和 1280×720 九单完整游玩、768×1024 前五单通过。历史 SDK **自身**的 102 条声明诊断需单列，不能写成项目零错误或偷偷屏蔽。

**保护步骤：** 对当前实际 Git 可见未提交文件及重要 Scene/Prefab/脚本/素材生成文件列表、大小与 SHA-256，存入 `docs/validation/day5a-plus/v21/baseline.json`；如需 ZIP 安全快照请写到 `D:\game-deliverables` 或其他项目外目录，不得覆盖旧备份。检查用户在 V2 后是否又做过修改，并保护全部这些变化。不得改写 Day 4/Day 5A/V2 历史验证 JSON 或覆盖旧截图。

## 二、最小确定性问题：修复离线 mock 编译

我们独立审查用户上传的 V2 ZIP 时，在缺少 Creator 生成 `temp/` 的独立环境执行原始 `npm test`，遇到 4 条 TypeScript TS2339：`V2CableLine.ts` 读取 `Color.r/g/b/a`，但 `tools/test/cc.d.ts` 的 `Color` 未声明这些通道。

**准确修复：** 仅在测试专用的 `tools/test/cc.d.ts` 对 `Color` 补充：

```ts
export class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r?: number, g?: number, b?: number, a?: number);
}
```

检查现有 mock 运行时 Color 对象确实提供这些属性；如果已有就不重复创建替身。不要修改 Cocos SDK，不放宽 TypeScript strict，也不要在正式源码中使用 `any`、`@ts-ignore` 或用造假的 `temp/tsconfig.cocos.json` 绕过检查。

**必须补做复现验收**：在不带 Creator 临时声明文件的**隔离项目副本**内运行 `npm test`，证明纯源码 + 有限 mock 契约可以通过；不可为此删除或移动用户 `D:\game\temp`。历史 174 组用例不能删除、改名掩盖失败或降低断言。

## 三、P1A：清洁视觉「真正自然擦除」

### 当前问题与目标

V2 `clean-v2-order4-partial-390x844.jpg` 显示清洁到 57% 时，污渍在键盘上出现较直的横向分界，看起来像「按行擦除」；用户此前明确否决将清洁网格可视化。

**目标是让灰尘呈不规则、局部渐变、沿玩家擦拭路径消失的效果**。键盘设备仍居中，污渍不应突然以整齐横条或块状网格消失；页面继续保留木质工坊、绿色防静电垫、唯一一条清洁进度和底部角色提示。

### 逻辑不可更改

- 订单 4 仍为 8×4 = 32 个**不可见逻辑格**；达到 28 格完成。
- 订单 6 和 9 的清洁区域、比例、尺寸与阈值保持现状。
- START/MOVE 路径扫掠、触摸 ownership、CANCEL 保留已清理进度、重复擦拭不重复计数、无失误的原语义全部不变。
- 原 `CleanSwipeStageController` 的计数、完成回调、generation、池、淡出与生命周期不能被装饰代码绕开。
- 不显示调试网格、逐格勾选、格子边框或额外进度表。

### 建议实现策略（非强制具体算法）

先检查现有 `V2DirtAppearance`：它目前是随每个逻辑 `DirtCell` 绑定的不规则放大子图，且与 cell 的显隐同步，这正是存在按行边界的可能来源。

优先考虑：**逻辑判定格仍然独立，视觉上采用重叠软边尘团/羽化 alpha 和局部擦除轨迹的组合**。若需要单独的装饰视图，可通过只读的「cell 已清理」通知或局部轨迹更新，不得让视觉组件增加计数或直接完成订单。可尝试分散尘团、半透明颗粒、平滑减淡、小范围扰动、非规则遮罩，使未清区与已清区之间不出现贯穿设备的大直边。

不要直接引入性能不可控的每帧全屏 RenderTexture 读回、频繁创建销毁节点或新的重型 shader 系统。若选择 RenderTexture / Mask 或自定义材质，必须说明为什么普通 Sprite / alpha 方案不足，并在 Creator 3.8.8 预览中证明兼容与性能；缺乏引擎证明时退回可控的 Sprite 方案。

明确测试 0%、约 57%（16/28）、约 96%（27/28）以及清洁完成四个状态。**采样应包括斜向、弧线及局部来回擦拭，不仅仅使用水平整行扫过**。到 28/28 达标后若需要结束闪亮效果，必须在真实清洁判定完成后发生，不得提前清除剩余逻辑格或改变评分。

### 视觉验收标准

- 390×844 下键盘主体比灰尘更易辨认，擦掉的区域明显变干净。
- 57% 阶段不应形成横贯大部分键盘宽度的生硬水平透明分界。
- 视觉上看不出 8×4 方格或规则条带；污渍边缘有自然羽化与错落层次。
- 多次 reset、步骤切换、重玩及 disable/enable 后没有旧灰尘残留或过期 tween 修改下一轮状态。
- 装饰节点不拦截清洁输入面；不改变目前 `InputSurface` 的几何位置/尺寸和触摸边界。

## 四、P1B：接线玩法的「插头质感 + 有弹性的线缆」

### 当前问题

V2 已能正确表现 `0/3`、`1/3`，曲线跟随端点，但在 390×844 下插头/接口偏小且图形像信息图标，中央木板空白偏多。需在不碰玩法的前提下增强视觉层次。

### 必做视觉升级

1. 提升电源线/显示线/网线对应插头图的可辨认程度：保留明显形状、插接方向、浅高光、暗描边与立体厚度；接口要看出不同槽形。
2. 在设计基准 720×1280 下，**优先放大装饰 Sprite 与标签**，但**不得修改** `CableConnector` 拖拽输入根、Head 的真实 hitbox、Anchor、Port 的真实判定坐标、snapDistance 和各自 UITransform 的基线几何。无法增加安全视觉面积时，应通过裁剪、对比度、标签简化解决，不挤到相邻目标。
3. 原 `V2CableLine` 只负责渲染。允许增加线材阴影、柔和弧度、侧边高光与正确连接后的状态灯；曲线端点必须实时由原 `CableConnector` 的 anchor/head 世界坐标换算得出。
4. 线条颜色与 `CableStyle` 和状态一致；不得错误地把所有线同时连好。`0/3` 时 0 条固定成功，`1/3` 时恰好 1 条固定成功，其他线头仍可用。
5. 在 3 根与 4 根线路情况下，避免弧线严重遮挡目标文字；线条图层始终在拖拽 Head 和可读标签下方，不拦截 TOUCH。
6. 正确接线才显示高亮/对勾，错误端口/空白释放保持一次失误与回弹，CANCEL 不扣分。
7. 允许保守减少空白、增加电路台面弱装饰，但不要重排实际线头/端口判定坐标。

### 必须截图

- 订单 5 `0/3`、`1/3`、错误释放后回位、`3/3` 结算前可见状态。
- 订单 7 的三条交叉连线。
- 订单 9 的四条线，确保 390×844 没有严重重叠、不可辨认或触摸遮挡。

## 五、P1C：拖拽设备与公共 HUD 精修

### 当前问题

操作区仍有大面积空白，3/4 个设备在 390×844 的可辨认度不够高，某些中文标签偏小。背景与纸签设计方向正确，不需要再换皮肤。

### 处理办法

- 保留既定木质维修台、绿色防静电垫、纸签订单 HUD、双统计胶囊、小修理工。
- 重新确认 `DragItem`、`DragTarget` Prefab 的 Sprite **子节点**和 Label 尺寸。视觉可适度放大设备主体、增加柔和阴影及目标剪影对比；真实输入根/判定坐标、尺寸、父层级和 anchor 保持不变。
- 加强可读性：任务关键名称、标签在 390 宽竖屏下不允许缩成肉眼难辨的微字；优先减字、增加对比/字号，必要时适当减少次要信息，而不是把所有信息塞在同一区域。
- 避免 4 物件关卡的图标、标签互相压住。订单 1（3 件）、订单 6（2 件）、订单 8/9（4 件）分别验证。
- 拖起 0.10s、正确吸附 0.15s、错误回弹 0.18s 的行为和位置保持；放对目标后才亮起完成效果，不能影响计数时机。
- 不需要改变 `StageDefinition`、`OrderCatalog` 中的坐标、阈值或关卡数量。

## 六、P2A：单张订单结算奖励感

### 当前问题

真实数据和「下一张订单」按钮已经正确，但视觉上仍像一张平面统计卡。与 V2 第五页高保真参考相比，庆祝徽章、角色、星级和分数还不够突出。

### 必做

- 使用现有 `V2ResultView`、`ResultStars`、`WorkshopDecoration` 以及当前真实 `LevelResult`，重点增强金色小徽章、星星、标题「修好啦！」、得分主数字和小修理工庆祝姿态的**大小、空间层级和入场节奏**。
- 保持奶油白卡、工坊暗色蒙层、金黄色立体主按钮，明确只有一个「下一张订单」操作；按钮不能被奖杯、彩带、星光或角色遮挡。
- 数据真实绑定；示例 `28.7 秒、1 次失误` 不能凭图写成 680 分：按照现有规则是 620 分。实际结果必须按当局数据展示；1、2、3 星都能正确点亮，未获得星星为灰色。
- 保留所有面板监听、完成幂等、旧动画失效和返回流程。视觉补间不触发业务事件，不改变分数。
- 单单结算页不要添加金币、激励视频、分享、排行榜、商店等尚未实现的功能。
- 第九单最终结算仍采用独立奖杯 UI，保留**重新挑战**和**返回首页**两个真正可点的按钮；结果统计包括总用时、总失误，不许藏掉。仅做少量字体和角色比例优化，不重新设计最终页。

## 七、P2B：首页及全屏留边的保守优化

- 首页工坊、Q 版维修员、Logo 和金色主按钮已经成立；可小幅提高角色/Logo 的相对存在感，保留用户已确认的首页构图，不另加新的功能入口。
- 当前 `SHOW_ALL` + `V2ViewportTheme` Web 侧 CSS clip 用于薄荷色补边，不等于平台原生支持；不能通过拉伸 Stage、修改 Canvas rect 或触摸映射去消除留边。
- 可做**非交互的场景背景延展层**，使 390 顶底留边、768/1280 两侧不显得是生硬纯色，但前提是 Creator Preview 不裁切核心视区、不改变 UICamera 与 Canvas/Stage 输入坐标。若无可靠 Cocos 跨平台方案，保留现状并记录限制，**宁可不美化也不能破坏真实输入**。
- 不制作假的微信/抖音系统菜单、不增加金币/签到/商城/排行榜等假按钮。

## 八、必须保持的工程边界

以下业务脚本原则上不得修改（除真实测试证明且用户明确额外同意的 bug 修复）：

```text
assets/scripts/core/RunController.ts
assets/scripts/gameplay/DraggableItem.ts
assets/scripts/gameplay/CableConnector.ts
assets/scripts/data/OrderCatalog.ts
assets/scripts/data/StageDefinition.ts
```

不能修改：九单/十三步/三玩法的固定流程、32格/28格清洁逻辑、单关得分与星级、Touch ownership、CANCEL、generation、缓存池与阶段切换。不能用重写 Stage 控制器、修改吸附半径、抹掉错误回调等方式“让画面好看”。

本轮**可修改**：最小 mock `cc.d.ts` 声明、视觉装饰组件、必要 UI Label/布局代码、素材源及生成器、Creator Editor 增量装配和视觉审计/探针。若必须给 Stage controller 增加**只读视觉事件**，需保持原回调语义和 public API，增设明确的测试保护，不得将业务完成由视觉组件接管。

所有 Scene/Prefab/meta 修改必须用真实 Creator 3.8.8 Editor/API 保存；不能直接手写序列化 JSON 或假造 `.meta` UUID。正式 `Game.scene` 与八个 Prefab 的资源 UUID 不变（内部 fileId 可能由 Creator 重新序列化而变化，但必须核对引用完整、无 orphan、无重复 UUID、无丢失 overrides）。旧 Day 3/4 装配菜单不得再次运行；对当前 V2 使用增量、幂等的 V2.1 视觉更新流程。

## 九、分阶段实施与停损规则

### Phase 0：保护现状、mock 类型修复

- 生成 Git/文件 SHA 只读基线，确认工作区不是旧 Day 4。
- 修改 `cc.d.ts` 并在无 `temp` 的干净隔离副本中跑 `npm test`。
- 失败则先处理，不能继续大规模编辑 Scene。

### Phase 1：两张风险最高的样板 —— 清洁与接线

- 仅选订单 4（清洁）和订单 5（接线），完成装饰性方案原型。
- 在 Creator 保存，真实 Preview 390×844 展示 `clean 0/57/96%` 与 `cable 0/1/3`，并提供与 V2 同视口的并排对比图。
- 若出现触摸遮挡、资源丢失、渲染异常、旧回调、性能明显恶化，暂停该方案，优先在当前改动基础上纠错，必要时使用备份**只恢复本轮被明确修改的文件**；严禁全仓 reset/clean。

### Phase 2：拖拽 / HUD / 单张结算

- 只做必要的子图放大、文字/色彩层级、星级庆祝感。
- 在订单 1、6、8/9 及单单结算中复验，不新增关卡。

### Phase 3：首页、最终页轻量收口与全量回归

- 小幅提升首页/最终页角色和品牌识别度，其他稳定部分不动。
- 执行完整九单十三步，并验收最终双按钮。
- 三个独立 Preview 视口：390×844、768×1024、1280×720；必须重新载入各视口后检查，不宣称运行时自由旋转已通过。

## 十、自动化、Creator 和真实 Preview 验收

### A. 命令

至少运行并记录实际 exit code、工具版本、时间戳与日志：

```powershell
npm test
npm run check:cocos
node --check tools/verify-day1.cjs
node --check tools/verify-day4.cjs
node --check tools/verify-day5a.cjs
```

对新增的 V2/V2.1 验证 JS 逐个执行 `node --check`。重新运行独立无 Creator `temp` 的 mock 测试。保留旧**174 组**断言，并适度新增覆盖灰尘装饰复位、线缆端点/状态、三种星级与结算、按钮防重入、元素池切换等用例，不要为了总数而制造只检查字符串的伪测试。

Creator 有真实配置时 `check:cocos` 必须通过项目源码检查。SDK 自身历史 102 条声明诊断单列，不应当成项目代码通过，也不能改 SDK 或关闭 strict/unused 来消除。

### B. Editor 保存资产审计

- 只在 `D:\game` 当前 Editor 项目打开 `assets/scenes/Game.scene`。
- 使用 Creator 真正保存所有受影响的场景/Prefab、生成或正确导入 `.meta`。
- 对比 Scene + 8 个核心 Prefab 的资源 UUID、输入节点 parent/anchor/layer/transform/size/hitbox、Inspector 绑定与悬浮界面的遮挡关系。
- 证明新增装饰节点没有 `BlockInputEvents`、Button、Touch 监听或透明遮挡；合法的全屏结算遮罩仍必须阻止背景点击。
- V2/V2.1 Editor 扩展增量执行至少两遍，第二遍不得重复创建正式节点/Prefab。
- 重新运行真实引擎夹具，清理 off-scene fixture、恢复 ActionManager，不得向正式 Scene 偷写测试状态。
- 原来的 1081 项 / 36 项仅为**历史记录**；本轮以实际最新脚本和资源审计为准，数量变化如实说明。

### C. 真实 Preview 关键用例

**390×844（主验收）：**

- 首页开始、音效开关正常；启动前不计时。
- 订单1：三物品辨识、错误回弹、正确吸附、真实得分结算。
- 订单4：清洁 0% / ~57% / ~96% 自然局部消退；达到实际28/28后正确结算。
- 订单5：三种插头辨识、0/3、1/3、错误连接回位、正确连接亮灯；无伪全连。
- 订单8：四个物品和两根线同时可读、可命中。
- 订单9：四线 + 四件设备，UI 没有被装饰遮挡。
- 最终九单总结、重新挑战、返回首页，再开始一轮；至少本视口完整跑通一次。

**768×1024：** 首页、订单1、清洁、接线和单单结算；按真实完成范围如实报告。

**1280×720：** 首页、拖拽、接线、清洁、结算及最终双按钮，并检查宽屏背景延展；建议完整九单复验一次，若不能完成则写明实际范围。

不宣称上述桌面浏览器鼠标与 `cc.Touch` synthetic event 等于物理触屏、手机 WebView、微信/抖音平台；本轮不新增平台 SDK。

### D. 截图与可对比证据

新旧截图必须**同视口、同订单、相近进度**，保留原始图和生成拼图；不能通过替换游戏画面像素、拼接设计海报来冒充真实 Creator 运行图。

建议保存于 `docs/validation/day5a-plus/v21/screenshots/`：

```text
home-v21-390x844.jpg
drag-order1-v21-390x844.jpg
drag-order8-four-v21-390x844.jpg
cable-order5-0of3-v21-390x844.jpg
cable-order5-1of3-v21-390x844.jpg
cable-order9-four-v21-390x844.jpg
clean-order4-0pct-v21-390x844.jpg
clean-order4-about57pct-v21-390x844.jpg
clean-order4-about96pct-v21-390x844.jpg
result-order1-v21-390x844.jpg
final-v21-390x844.jpg
home-v21-768x1024.jpg
home-v21-1280x720.jpg
```

进度与画面分数必须记录实际读到的值，不得因为文件名写了 57% 就声称截图正好为 57%。输出六页新版本拼图、重点四组前后对比（首页、清洁57%、接线1/3、单单结算），注明基线与当前截图来源。

## 十一、文档、交付和版本

更新或新增：

```text
README.md
package.json                                   # 建议 0.0.5-alpha.3
docs/GPT_HANDOFF.md
docs/DAY5A_PLUS_V21_REFINEMENT.md            # 做了什么、为什么、哪些保留
docs/DAY5A_PLUS_V21_CREATOR_VALIDATION.md    # 实际项目/引擎/Preview 验证与边界
docs/validation/day5a-plus/v21/              # 新的日志、JSON、截图、哈希、对比
```

- 不覆盖 Day 4/Day 5A/V2 历史报告，不把旧哈希改写成新验收。
- 项目中若本来就有不同命名的测试入口，按真实文件更新，不创造不存在的命令然后假称执行成功。
- 如用户原先已批准的 UI 设计图与实际画面仍有不同，请单列保留差距和原因。
- 打包最新项目 ZIP 到 `D:\game-deliverables` 或其它**项目外**目录，保留需要的源码、Scene/Prefab/meta、设置、扩展、素材源、生成脚本、测试、设计/验收文件；排除 `.git`、`library`、`temp`、`profiles`、`node_modules`、`build` 和敏感本机缓存。对 ZIP 做 CRC/SHA/解包验证。
- **本轮不执行** `git add`、`commit`、`push`、`tag`、`reset --hard`、`clean`、新增 Day5B/5C 或任何发布操作。

## 十二、最终回执（必须精确给出）

1. 本次读取的真实 Git 分支、HEAD、开始时未提交状态与基线 SHA。
2. 分阶段变更列表：每个源码/资源/Scene/Prefab/扩展/测试文件的目的；哪些完整原字节保留。
3. 独立无 `temp` 的 `npm test`，实际通过组数与 TS 版本；真实 Creator 项目类型；SDK 自身诊断单列。
4. 最新 Creator 保存资产数量、UUID/元数据、输入 hitbox、Inspector 审计与夹具项目及实际结果。
5. 各真实 Preview 分辨率、覆盖订单、进度截图、控制台 warning/error（含历史问题的恢复过程）。
6. 视觉前后对比：逐页说明提升与仍不足，**特别是清洁自然擦拭是否真正达到用户确认效果**。
7. 打包 ZIP 文件位置、大小、文件哈希和验证结果。
8. 明确「本地实施已完成」或「哪些项目未完成」，未完成不得写成通过。
9. 当前 Git 状态以及没有执行 add/commit/push、没有开始 Day5B 的确认。

**成功的定义**：独立 mock 类型缺口修好，三种玩法保留原规则，清洁擦除自然、线头/接口更易辨识、拖拽文字与设备清晰、单张结算更有奖励感、首页/最终界面保持统一，Creator 真保存与相应测试复验完成；然后将截图交回用户审美确认，**未经用户审查不得声称六屏美术终审通过**。
