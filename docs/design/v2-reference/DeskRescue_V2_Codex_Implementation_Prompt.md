# DeskRescue《桌面急救站》Day 5A+｜V2 六页面 UI 统一改造 — Codex 完整执行任务书

> **给 Codex 的正式任务书**。用户会将本文件与 `DeskRescue_V2_Complete_UI_Design_Spec.md` 和 `references/01–06` 效果参考图一同提供。**先完整读取设计规范和本地最新源码，再在 `D:\game` 工作**；不得仅提供说明、伪代码或“实现建议”。
>
> **执行授权边界**：只允许在本地增量开发 Day 5A+ V2 UI、在真实 Cocos Creator 3.8.8 中保存并验证、生成完整证据和交接包。**本任务不授权** `git add`、`git commit`、`git push`、创建 PR、tag、release、平台构建/发布，也不授权启动 Day 5B/5C。禁止 reset/clean 和覆盖用户新改动。

---

## 0. 产品目标与完成定义

把现有 `0.0.5-alpha.1` 的**已可玩的 Day5A 卡片式中保真 UI**，在不改变九单十三步三玩法的前提下，升级为 `0.0.5-alpha.2` 的**统一 V2 沉浸式治愈 Q 版维修工坊**，真正落地六个可操作页面/状态：

1. 首页：Q 版小修理工、小屋工作台、品牌 Logo、真实「开始维修」与音效开关。
2. 拖拽整理：羊皮纸订单卡、状态胶囊、暖木桌+绿垫、设备剪影槽位、可拖真实设备、小修理工提示。
3. 接线维修：左侧插头、右侧接口、与真实进度一致的动态彩线、正确亮灯与错误回弹。
4. 清洁维护：键盘为主体、不规则灰尘自然消退、**不可见 8×4 网格**、唯一清洁进度条。
5. 单张订单结算：场景暗化、庆祝纸卡、动态星级/得分/用时/失误、唯一「下一张订单」。
6. 整轮最终结算：大奖杯、动态九单/步骤/总星/总分/时间/失误、真实「重新挑战」「返回首页」。

**质量成功标准**：完成后应提供同一真实 Preview 环境的六页效果截图与基线对比；可用三种玩法玩过九单十三步、两种 final 转移都可用；通过可执行自动测试与 Creator 验证，并清晰陈述尚未验证的真实物理触摸与平台链路。**只跑过 mock 或导出了一张漂亮图片不算完成。**

设计规范位于 `DeskRescue_V2_Complete_UI_Design_Spec.md`，逐页图在 `references/`。如果图中文字、数值或布局与该规范冲突，以**规范明确的真实业务和坐标映射规则**为准；不要照抄图片右侧说明列为 UI。

---

## 1. 开工前读取：实际项目是唯一代码基准

工作根：`D:\game`。先读取/记录：

```text
README.md
package.json
.gitignore
docs/GPT_HANDOFF.md
docs/DAY5A_CREATOR_VALIDATION.md
docs/DAY5A_VISUAL_STYLE_GUIDE.md
docs/DAY5A_VISUAL_ASSETS.md
docs/DAY5A_COCOS_SETUP.md
docs/DAY5A_CHANGELOG.md
assets/scenes/Game.scene                  （只读理解，不手写序列化）
assets/prefabs/stages/*.prefab            （通过 Editor 读/改/保存）
assets/prefabs/elements/*.prefab
assets/scripts/core/LevelManager.ts
assets/scripts/core/RunController.ts
assets/scripts/ui/HomeController.ts
assets/scripts/ui/AudioFeedback.ts
assets/scripts/ui/ResultStars.ts
assets/scripts/stages/StageHost.ts
assets/scripts/stages/DragMatchStageController.ts
assets/scripts/stages/CableConnectStageController.ts
assets/scripts/stages/CleanSwipeStageController.ts
assets/scripts/gameplay/DraggableItem.ts
assets/scripts/gameplay/CableConnector.ts
assets/scripts/visuals/VisualCatalog.ts
assets/scripts/visuals/VisualAssetRegistry.ts
assets/scripts/visuals/ElementVisual.ts
assets/scripts/visuals/CleanDeviceVisual.ts
assets/scripts/data/OrderCatalog.ts
assets/scripts/data/StageDefinition.ts
tools/verify-day1.cjs
tools/verify-day4.cjs
tools/verify-day5a.cjs
tools/art/generate_day5a.py
extensions/deskrescue-editor/
```

目录、大小写或文件名如果与上述报告不同，以**本地实际**为准，做映射而不是新建重复类。注意 GitHub `main` 上可能还只有 Day4 的代码；**不能 checkout main、git pull 覆盖最新 Day5A 的工作区**。

先运行并记载：

```powershell
Set-Location D:\game
git status --short --branch
git rev-parse HEAD
git remote -v
node --version
npm test
npm run check:cocos
node --check tools/verify-day1.cjs
node --check tools/verify-day4.cjs
node --check tools/verify-day5a.cjs
```

预计 Day5A 历史记录：本地 `feature/day5a-visual-playable` 尚未 commit，Day4 基线 HEAD 是 `ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22`，自动行为 146/146；Creator 项目源码真实类型通过，SDK 自身有 102 条单独声明诊断；Scene 审计643/643，引擎 probe18/18。这些**只代表历史记录**，必须重新取得真实输出。如发现用户此后已修改、更新或另开分支，要先保护其修改，再按实际工作树继续，不得强行恢复历史 SHA。

### 1.1 不可变基线与备份

- 在修改任何正式 Scene/Prefab/资产前，保存**当前文件清单、大小和 SHA-256**，包括九个核心场景/Prefab 及对应 meta、脚本、已经存在的 PNG/SVG/WAV、文档。记录 `git status` 与最新 HEAD。
- 由于 Day5A 文件已是**未提交工作**，不要依赖“从 HEAD 还原”当备份；应把本轮将修改的现有文件复制到**项目之外**的安全位置（如用户已有明确的临时备份目录），记录备份路径，不纳入 Git，也不删除缓存。
- 历史 `docs/validation/day3`, `day4`, `day5a` 证据只读保留；不要为 V2 修改旧 JSON 的哈希、截图、日志或得分。
- 为 V2 新建 `docs/validation/day5a-plus/`，所有证据用新路径输出；不要为了跑旧脚本污染已保存的最新 V2 皮肤。
- 若发现本地现有 `V2` 改动，先评估与本任务冲突并保存，绝不直接覆盖。

## 2. 版本、实施限制与不许改的内容

- 目标版本：`0.0.5-alpha.2`，只在功能完成、测试跑通并取得可用场景后更新版本文件及 README；未完成则如实标明当前状态，不要假称 V2 全部完成。
- 必须保留：九张订单、十三个步骤、三个 `StageKind`、正式 `ORDER_CATALOG`、稳定 ID、位置/尺寸、ScoreRule、动态数量 2–4、clean 28/32 规则、现有 Canvas/StageHost/RunController 核心引用、场景与八个核心 Prefab 的资产 UUID。
- 以下文件默认**不修改业务规则**：`OrderCatalog.ts`、`LevelCatalog.ts`、`StageDefinition.ts`、`RunController.ts`、`DraggableItem.ts`、`CableConnector.ts`。仅当真实视觉装配必须兼容一个已确认 API 且不会影响原有行为时，才做最小修改并列出原因/测试；优先将展示逻辑放到 Scene/visuals/ui 新组件。
- 保留：0.10s 拾取、0.15s 正确吸附、0.18s 回弹、0.08s 清洁格淡出、CANCEL 不计失误、正确落定后加进度、跨步骤连续计时、完成幂等、防双击、触摸 ownership 和 generation。
- 不得：下载盗用游戏画面、未授权字体；安装无关依赖；构建商店/货币/签到/广告/内购/后端/平台 SDK；修改评分公式/进度语义；更改 Stage 物品坐标或碰撞命中来匹配图片；把整张设计海报塞进游戏当不可编辑界面。

## 3. 资源规划与设计 Token：先定图再改场景

### 3.1 严格读取统一规范

按 `DeskRescue_V2_Complete_UI_Design_Spec.md` 第 1～13 节执行。设计坐标为左上原点 `(0,0)`、右/下正方向，不是 Creator 节点坐标。先测量真实 StageHost 局部中心、父层级与锚点，再推算当前 Item/Cable/Clean 的世界/UI 视觉落点。将测量写进：

```text
docs/DAY5A_PLUS_V2_SCENE_MAPPING.md
```

文档至少包含：
- 设计参考位置与真实位置的映射、背景填边策略；
- StageHost 的位置/父节点变换前后值；
- 六页纸签/状态/按钮位置；
- 三种 Stage 根节点的真实输入 hot zone；
- UI 渲染顺序和触摸阻挡检查；
- 三比例安全区/缩放策略。

### 3.2 资源制作

在现有 `assets/art` / `tools/art` 原创素材的基础上**增量升级**：

- 首页：工坊后墙、灯光、置物架、台面、Logo、设备、Q 版角色（欢迎）。
- 玩法公共：品牌小木牌、统一羊皮纸订单签、真实两状态音效、计时/失误胶囊、暖木桌、防静电垫、导师气泡/头像（提示）。
- 拖拽：设备本体和带剪影的软槽、成功勾/柔和光、轻阴影。
- 接线：三个线头/端口明确硬件外形、动态 Graphics 线身视觉优化、目标亮灯。
- 清洁：大键盘/机箱/鼠标皮肤、软边不规则污渍；蓝色擦布/白手套仅视觉辅助。
- 结算：奶油结果卡、奖章、3 颗星状态、原创庆祝纸片、得分层级、主按钮。
- 终局：大扳手奖杯、横幅、角色（欢呼）、双按钮。

所有图片请保留可编辑源稿，更新生成/素材清单和 SHA-256；使用资产 ID 而非显示中文映射；不同 SpriteFrame 状态需可检测，避免旧缓存/池节点串图。禁止擅自加入大量外部资源、把没有设计版权的素材混进 Public 仓库。

美术审美和代码验收分开：**程序生成的简陋图标不得冒充高保真定稿素材**。若当前工具能力无法制作与参考接近的 Q 版小修理工/复杂维修场景，优先实现可复用结构与实际绑定，明确列出还需美术精修的资产；不要声称已达到商业美术品质。

### 3.3 复用 UI 组件，避免六页六套重复

- 优先让 `HomeController` 继续负责首页和音效 UI 的实际交互；`LevelManager` 负责订单/结果分支；`RunController` 负责成绩；`StageHost` 继续缓存三种 Stage；`VisualAssetRegistry` 使用场景内稳定资源绑定。
- 允许拆出小而专用的新 UI 展示组件，例如 `PaperOrderHUD`、`V2ResultView`、`V2FinalSummaryView`、`WorkshopDecoration`，但**不引入 EventBus、全局单例、第三方 UI 框架或一套平行的计分系统**。
- Cocos Creator Editor 通过自身 Scene/Prefab/Asset Database API 修改并保存现有资源。**绝不手写 Scene/Prefab/meta 原生 JSON**，也不要重跑旧 Day3/Day4 “Build” 菜单覆盖 V2。
- 优先采用 Idempotent 的 `DeskRescue → V2 → Apply/Check V2 Skin` Editor 扩展方法，检测节点已存在则更新视觉，不重复新增监听和资产。若自动化 Editor 调用受限，留下可执行的 Inspector 手工装配清单，并明确哪部分尚未保存；不能只导出 PNG 假称 Creator Scene 已保存。

## 4. 阶段 A｜先完成可验收的三屏样板

只先做 01 首页、02 订单1拖拽以及 05 单张结算三屏样板，强制保留已经完成的 Day5A 逻辑。

### 4.1 首页 Home

使用当前 HomeOverlay/HomeController，不新建另一套“开始”。
- Logo、Q 版小修理工、暖木小屋、键盘/鼠标/耳机主视觉、金色「开始维修」、右侧音效 ON/OFF；隐藏未实现入口。
- 统一规范里的 720×1280 位置为视觉基准；Logo `x150,y205,w420,h150`，工坊 `x36,y430,w648,h500`，主按钮 `x112,y1030,w496,h92`，其余以 design spec 原值核准。
- 首页不激活 Stage、不调用 `RunController.beginLevel`、不加时间；首次点击同步锁定并触发现有 `startFirstOrder()`，只启动一次。
- HomeOverlay 真正退场后不留触摸遮罩；角色和 Logo Tween 停止，音效开关可在游戏过程中继续使用。

### 4.2 第 1 单拖拽样板

- 羊皮纸订单卡：`(38,207,644,170)`；计时/失误胶囊：`(52,397,282,62)`、`(386,397,282,62)`；木桌 `(20,478,680,675)`；绿垫 `(36,505,648,365)`；提示/头像下方且无碰撞。
- 第 1 单 Stage 目标 local `(-220,+170),(0,+170),(+220,+170)`，物品 local `(-220,-300),(0,-300),(+220,-300)`；**只能布置背景与装饰适配真实位置，不得改正式 OrderCatalog 的坐标、吸附半径96或 hitbox**。
- 保留原设备池与目标池，2/3/4 数量依配置；目标内使用设备半透明剪影，不是整齐的三个无内容方块；成功状态只装饰、进度真正完成回调后更新。

### 4.3 第 1 单真实结算样板（第 05 页）

- 遮罩激活后拦截底层 Stage；结果奶油纸卡 `(60,220,600,760)`，奖章 +「修好啦！」+ 1–3 颗真实 Sprite 星星 + 大号得分 + 两个次级数据卡 + 一个「下一张订单」按钮。
- 仅绑定 `LevelResult`，按钮只调用一次下一单逻辑；成绩如有动画，只是数值展示，冻结结果不被更改。
- 对 Page05 生成图的示例分数作精确纠正：订单4 `28.7s / 1 次失误` 按公式应为 `620分 / 2星`，不允许展示与评分计算矛盾的 680 分。
- 角色庆祝图片不可盖住结果数据和金色主按钮。

### 4.4 阶段 A 首验

- 保存 Creator Scene/相关 Prefab，完成 `npm test` / `npm run check:cocos`，Preview 390×844：**真实点击开始→三件物品的鼠标拖拽→真实单张结算→下一单**。
- 截图和审计放 `docs/validation/day5a-plus/phase-a/`，至少含 `home-390x844.jpg`、`drag-order1-390x844.jpg`、`result-order1-390x844.jpg`。
- 与 Day5A 旧真实截图进行**相同视口对比**，记录“首页主题、HUD 层级、设备外形、结算奖励感”，不靠主观自评硬说商业品质已达标。
- 这时可向用户展示三屏以便及时纠偏；**不要因为用户未提供即时反馈而删除设计约束**。

## 5. 阶段 B｜三种玩法统一视觉

### 5.1 Drag-Match 2/3/4 物品全覆盖

- 将样板主题推广到订单2/3/6/8/9等含拖拽步骤的真实配置；重用相同装饰/资源映射，不按中文字符串选图。
- 数量为2、3、4时不会重叠、文字裁切、误命中；旧 Item/Target hitbox 和对象池可复用；重新挑战后没有旧对勾/发光串页。

### 5.2 Cable-Connect 第5单主机接线样板

真实顺序/位置：

```text
power：左上 (-260,180) ——> 右下 (260,-180) 电源接口，红
显示线：左中 (-260,0) ——> 右上 (260,180) 显示接口，蓝
network：左下 (-260,-180) ——> 右中 (260,0) 网络接口，黄
```

- 初始 `0/3`：三头全未连接；连接 1/3 时**只有一条真实成功的线到达正确端口**，其他线留在左侧。严禁照海报画 3 条已接好线却显示1/3。
- 保留既有 CableConnector/Graphics/端点跟随，所有链接必须实时绘制；若升级为平滑曲线/渐变边框，应保证每帧重画和正确/错误/取消后的端点都准确，不改 event ownership、72 半径或原动画时长。
- 错误端口和空白释放只算一次失误、回位；外来 ID 和 CANCEL 不计分；已连线端口出现单个青绿指示灯和勾，不多次播放音效。
- 订单7、8、9 不同数量、不同连线顺序也能复用，不为第5单特制写死数组。

### 5.3 Clean-Swipe 第4单键盘除尘样板

用户**明确否定**方格测试图。实现必须让玩家看到不规则尘土自然变薄、露出键帽，不允许可见 8×4 彩色块/打钩方阵或“测试棋盘”。

- 真逻辑仍为 8×4 逻辑单元共32格，刷半径46、达标阈值28格，清洁精度/START/MOVE/ownership/CANCEL 不变。
- 优先通过当前 `CleanDeviceVisual` 与 DirtCell 内的可编辑不规则透明贴图、软边/重叠、装饰亮点使棋盘痕迹不可见。不能把脏污永久画到一整张背景上，也不能遮挡 Node 输入。若仍出现明显方格边界，记为**视觉验收未通过**。
- 进度为原 Stage `cleanedCells/requiredCells`，唯一 HUD 百分比条展示 `16/28=57%` 等。图片里手套/擦布仅作视觉/操作引导，不能作为新的必拖工具；不可碰撞原 InputSurface。
- 到 28/28 时显示100%并触发既有完成；不把 28/32伪装成物理擦过32/32，清洁达标的残余灰尘如需全消，只做明确的完成后纯装饰镜头。
- 同样检查订单6/9的鼠标壳/机箱清洁，面积、边缘、UV或 Sprite 尺寸不能映射错误。

### 5.4 阶段 B 证据

`docs/validation/day5a-plus/phase-b/` 至少保存 390×844：

```text
cable-0of3.jpg
cable-1of3.jpg
cable-wrong-return.jpg
clean-0percent.jpg
clean-57percent.jpg
clean-96percent.jpg
clean-result.jpg
four-items-order8.jpg
clean-mouse-order6.jpg
clean-case-order9.jpg
```

其中 `clean-57percent` 必须来自真实输入状态且在 screenshot 中看不到规则方格；0/57/96 的动态进度如受实时游玩影响不能精确停留，可记录实际值并写明截图对应值，不得伪造像素和 UI 状态。

## 6. 阶段 C｜最终结算与「返回首页」真实实现

这是 Day5A+ 除视觉以外唯一必需的新增流程。现有最终重玩功能保留，**不要把不生效的返回首页按钮画出来**。

### 6.1 最终成绩布局

- 终局独有奖杯 `(218,135,284,230)`、大横幅 `(98,350,524,95)`、总成绩卡 `(58,495,604,325)`、小修理工欢呼、金色「重新挑战」 `(110,1030,500,92)`、米白「返回首页」 `(195,1140,330,62)`。
- 主统计：当前实际完成订单 `summary.completedOrders/orders.length`、累计星 `summary.earnedStars/(3×orders.length)`、`summary.totalScore`。
- 次统计：完成步骤/全部步骤、总用时（一位小数）、总失误。所有值真实计算、没有固定 9/9、24/27、8650、6250 的 UI 常量。
- 单张订单 `OrderResultGroup` 与整轮 `FinalSummaryGroup` 互斥，不允许后台叠着两个星星或两个可操作主按钮。关闭单单结果时清空/复用视觉 tween；最终结果按钮不可造成 Stage 再次接收输入。

### 6.2 按钮与状态机安全要求

从最终态点击：

```text
DemoComplete
 ├── 重新挑战：防双击 -> 既有 playAgain() -> 重置成绩与Stage -> 直接Order1/Stage1，无首页闪回
 └── 返回首页：防双击 -> 停结算视觉Tween -> 关闭最终结果
                   -> 停用并重置Stage与回调 -> 暂停/复位RunController
                   -> 显示HomeOverlay并重新开放开始门禁
                   -> 再次点击「开始维修」才启动全新Order1/Stage1
```

当前 Day5A 的 `LevelManager.startFirstOrder()` 和 `HomeController.startRepair()` 有“一次性防重”门禁。**返回首页后不处理门禁将导致无法再次开始游戏，是阻塞问题。**

具体 API 由当前源码决定：可以在 `LevelManager` 添加显式、状态受限的 `returnHomeFromFinal()` / `prepareNewRunFromHome()` 等方法，并由 `HomeController` 提供 `showHome()`/`resetStartGate()`；命名不是必须，但语义必须经测试。**禁止直接靠修改私有字段、重新加载 Scene、再创建一套 Manager 或丢失音效状态来绕过门禁。**

必须满足：
- 首页显示时 RunController 不计时、StageHost 无 active Stage、结果界面 inactive；音效保持玩家该 session 当前开关。
- 多次快速点击 Home、Replay 或 Start 不会重复 beginLevel，不产生两个可听 audio cue / UI listener，不触发旧 tween callbacks。
- 从 Home 再进入第一单，进度、时间、失误、物品位置和污渍全新，教程 session 已看状态保持现有定义，除非重新载入 Scene 才重显。
- 进入最终态之后的结果按钮无需一直等 1 秒庆祝才能点击，或有明确短暂可点击策略；动画进行中点击会同步终止自有动画并安全切换。
- 只在最终态允许返回首页；普通订单结算不偷偷多出返回首页按钮。

### 6.3 新增专项自动测试（不少于所列行为）

1. 终局「返回首页」关闭所有 Stage 和结果，停止计时。
2. 再次点击「开始维修」成功加载第一单，且只加载一次。
3. 连续两次返回首页/开始操作不导致双启动。
4. 返回首页后音效 ON/OFF session 状态不丢失。
5. 最终「重新挑战」仍可直接开始第一单，不打开首页。
6. 新一轮分数/总星/失误/步骤统计全部从零开始。
7. 单单结算和最终结算互斥，按钮/视觉监听无重复。
8. 各类动画迟到回调、组件 disable/enable/destroy 不改变已经切换的状态。
9. 汇总上限由目录长度/总步骤动态派生。
10. 结算示例公式与业务实际结果一致，结果星级图标与真实 stars 对应。

务必在原有测试运行器基础上扩充，使用实际编译的组件，而不是只测一份手写替身。不得删除/弱化历史146组或修改 RunController 计分为适配示例图片。

## 7. 阶段 D｜Creator 真实保存、全九单 Preview 与交付

### 7.1 资源与场景保存

- 使用 Cocos Creator **3.8.8** 真正打开本地项目、当前 `Game.scene`，检查脚本/资产导入完成再操作。
- 修改 Scene/Prefab 通过 Creator Editor / Asset DB / Scene 序列化并取得**真实保存确认**；不手写 `.scene/.prefab/.meta`。
- 如使用 Editor 扩展，确保增量、幂等、第一次失败不损坏已有场景、重跑不会新增第二套 Sprite 或点击监听；可能重分配 Prefab 内部 fileId 时记录变化，不将它冒充资产 UUID 改变。
- 关键绑定/UUID 保护：`Game.scene` + 三个 Stage Prefab + 五个 Element Prefab 的 UUID 保留；脚本 Inspector 仍正确；输入节点的 parent/world/local transform、anchor、layer、UITransform hitbox 对比基线；旧 override、丢失贴图、孤儿 meta、重复监听不得出现。
- 不盲目运行 `DeskRescue → Day3/Day4 → Build` 等可能重建皮肤的旧菜单；如 Day5A 的 Apply Visual Skin 会覆盖本轮 V2 改动，应禁止重复调用或加保护。

### 7.2 测试与记录

实际运行：

```powershell
Set-Location D:\game
npm test
npm run check:cocos
node --check tools/verify-day1.cjs
node --check tools/verify-day4.cjs
node --check tools/verify-day5a.cjs
# 新增V2验证脚本如存在也要运行
```

真实 Creator 场景结构/Prefab 资产引用审计，以及真实引擎 probe 均须针对 **V2 已保存的资源**重新跑；旧报告 643/643 / 18/18 不代表新版本已经通过。Cocos SDK 自身 102 条声明问题单独报告，如果环境变了，以实际结果为准，不修改 SDK 或伪造 `temp/tsconfig.cocos.json`。

自动测试覆盖视觉绑定、多皮肤复用、2/3/4元素、动态 UI 真值、清洁可见效果的结构条件、Home 重入、总结、生命周期与回调安全；**视觉是否真的像设计图必须人工查看 Preview 截图**，不能由纯代码单测替代。

### 7.3 至少三种桌面 Preview 视口

- `390×844`：首页、订单1拖拽→结果、订单4清洁进度、订单5连线进度/错误、订单8四设备、终局（建议完整九单）；是最重要的画面验收。
- `768×1024`：首页→订单1→单单结算→下一单，以及清洁/接线至少各一屏，检查大屏比例。
- `1280×720`：首页和完整九单十三步、终局、重新挑战与最终→首页→再次开始，检查居中竖屏与两侧填边。

以上均是桌面浏览器 Preview/鼠标事件验证；不声称是手机物理触屏或平台 WebView。需记录实际设备视口/Canvas rect、导入资源状态、Warning/Error 统计和截图时间范围；**若没有完整跑过某比例九单，不得写“各比例九单均通过”。**

### 7.4 截图与对比

保存到 `docs/validation/day5a-plus/screenshots/`，至少：

```text
home-v2-390x844.jpg
drag-v2-order1-390x844.jpg
cable-v2-order5-0of3-390x844.jpg
cable-v2-order5-1of3-390x844.jpg
clean-v2-order4-dirty-390x844.jpg
clean-v2-order4-partial-390x844.jpg
result-v2-390x844.jpg
final-v2-390x844.jpg
final-v2-1280x720.jpg
home-after-final-return-v2-390x844.jpg
```

另准备 Day5A → V2 **同视口**前后对比（至少首页、drag、cable、clean、单单结算、最终结算共六类），保留原始截图、不要替换 UI 像素；拼接对比须注明各自版本。对图稿中不可实现的艺术细节要标清“已近似/未完成”。

## 8. 文档与交接

新增/更新以下文件（以真实路径为准）：

```text
docs/DESKRESCUE_V2_UI_DESIGN.md           # 将本设计规范纳入项目，保持来源与版次
docs/DAY5A_PLUS_V2_SCENE_MAPPING.md      # 设计坐标→真实Creator映射/安全区
docs/DAY5A_PLUS_V2_ASSET_MANIFEST.md     # 新旧原创资源、ID/UUID映射、源稿与版权
docs/DAY5A_PLUS_V2_CHANGELOG.md          # 逐文件变更与被保护逻辑SHA
docs/DAY5A_PLUS_V2_CREATOR_VALIDATION.md # 实测与失败历史、截图链接
docs/GPT_HANDOFF.md                      # 当前本地状态、未提交、下一步
docs/validation/day5a-plus/              # 本次新增审计、probe、Preview与日志
README.md                                # 只有真正实现完后升级到0.0.5-alpha.2并更新说明
```

一份可核查的 handoff ZIP（建议名 `DeskRescue_Day5Aplus_V2_Return.zip`），优先包含**更新后的源码、assets/art、Scene/Prefab/.meta、必要settings、Editor扩展、测试、文档及证据**，排除 `.git/`、`library/`、`temp/`、`profiles/`、`node_modules/`、`build/`、本机敏感信息。ZIP 如果体积过大，可额外生成“文档+对比图验收包”，并解释如何取得完整代码；不要只输出一个报告让用户无法验证源码。

### 提交授权范围

本轮**不要执行** `git add`、`git commit`、`git push`、`git tag`、`git branch -D`、`git reset --hard`、`git clean -fd`，不要给 Public 仓库自动上传素材。执行前需知本地 Day5A 是未提交状态，恢复错版本会抹掉现有成果。

## 9. 最终验收清单（缺一项则不能宣称“V2完全通过”）

- [ ] 当前本地 Day5A 实际状态核对、变更备份和哈希清单存在。
- [ ] 六屏视觉与统一规范一致，第三/第五页也有真实截图可由用户最终审阅。
- [ ] 首页真开始，显示期间不计时，音效 on/off 保持。
- [ ] 订单1/其他 2/3/4元素真实拖拽可用，背景与角色不挡输入。
- [ ] Cable 初始0/3、1/3 仅一根接好、错线回弹，未出现海报矛盾。
- [ ] Clean 的真实 8×4 内部判定不直接呈现可见方格，进度只显示一次，28/32 达标。
- [ ] 第5页真实结果：图标星级与冻结 `LevelResult` 一致、分数公式正确、下一单有效。
- [ ] 第6页真实汇总：本轮全部统计动态，Replay 与 Return Home 均可用。
- [ ] Return Home 后可从首页**再次开始全新一轮**，防双击且不会残留计时/Stage/回调。
- [ ] 当前九单十三步、三种玩法以及历史146组回归未受破坏。
- [ ] `npm run check:cocos` 项目实际类型通过，真实 Creator保存与 Inspector/UUID审计通过。
- [ ] 实际 Creator Preview 有三个视口的证据和截图；至少一条完整九单闭环真实玩过。
- [ ] 资源合法、保留 SVG/PNG 或其它可编辑源稿，不含未授权字体/复制贴图。
- [ ] 没有自动提交 GitHub、没有新订单/商业化模块。
- [ ] 未验证的原生 Touch、TOUCH_CANCEL、WebView、物理设备、小游戏平台如实列为待办。

## 10. 给用户的最终回复格式

1. **实现状态**：全部实现 / 部分实现 / 受阻，注明真实 Creator 保存情况。
2. **六页预览**：每页 1～2 张真实截图链接和视觉差异；特别指出真实角色与高保真参考的差距。
3. **架构修改**：新增/修改代码、资源、Scene/Prefab 与 UUID 检查。
4. **玩法回归**：九单十三步、三种玩法、score/星级、重玩/回首页、音乐开关。
5. **命令与结果**：具体测试组数、TS版本、`check:cocos`、Editor Audit、Probe、Preview 视口和异常。
6. **版本与 Git**：实际版本、本地分支、HEAD、未提交文件数，明确未 commit/push。
7. **仍未完成**：图稿与引擎效果差距、真机/平台不足、已知视觉缺陷或性能风险。
8. **交接包**：`docs/GPT_HANDOFF.md`、`DAY5A_PLUS_V2_CREATOR_VALIDATION.md`、V2 截图和完整源码/资源 ZIP。

**开始执行，不要把本任务换成纯设计讨论；遇到普通实现问题自主判断，并以实际源代码和 Creator 证据为准。绝不冒充已通过的视觉与平台测试。**
