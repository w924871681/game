# Codex 实施任务书：DeskRescue /《桌面急救站》Day 5B 六张全新玩法订单

> **授权边界**：用户已要求提供 Day 5B 设计和 Codex 开发任务书；交给 Codex 执行时，可在 `<PROJECT_ROOT>` 本地增量修改 Day 5B 所需源码、Creator 资源、测试与文档，并生成项目外验收交付包。**本任务不授权 `git add / commit / push`、合并主分支、重置/清理用户文件、发布、平台 SDK 或 Day 5C。** 允许在工作区完全干净并核对基线后新建**本地开发分支**；如果发现未提交用户文件则保留并报告，不覆盖它们。
>
> **必须同时阅读**：同 ZIP 中 `DAY5B_SIX_ORDERS_FINAL_DESIGN_SPEC.md`（内容和判定的唯一新设计基准）、`references/order10_*.png` ～ `references/order15_*.png`（6 张用户认可的视觉参考）。PNG **仅是参考画面**，不能整页作为交互背景、不能照搬“剩余时间/错误次数上限”等不属于当前游戏的元素。

## 0. 任务目标与最终产物

直接在 Windows 本地真实工程 `<PROJECT_ROOT>` 中实现：

- 当前 **9 单/13 步/3 kind** → **15 单/27 步/8 kind**；旧单 1—9 全保留。
- 新增 5 种可复用 Stage：`fault-spot`、`rotary-control`、`guided-trace`、`gauge-tune`、`sequence-test`，对应真实控制器、Prefab、配置/素材和可操作画面。
- 新增订单 10—15：手柄漂移、打印机卡纸、键盘连击、风扇异响、耳机声道、直播间紧急救场；顺序、每步行为、难度与完成反馈严格按设计规范。
- 延续 V2.2 首页、木工坊、Q 版维修员、纸签 HUD、按钮、9 单老流程和最终双按钮。最终结算显示真实 **15/15 单、27/27 步，最高45星**，可重玩/返回首页/再开始。
- 必须保留已有 224 组历史行为测试，并为五个新 kind、新关卡、运行/生命周期/输入/结算添加有意义的**实际组件**测试；真实 Creator SDK 项目类型检查、保存资源审计、引擎 probe 与浏览器自然 Preview 各自单独记录。
- 推荐版本 `0.0.5-alpha.5`，但以实际提交的本地源码记录为准。

**这是开发任务，不是“只出方案”。** 不得用伪代码、静态海报、看起来有滑块但没有判断逻辑的控件冒充完成品。若不能执行某项真实 Creator 操作，先完成可完成的代码/Mock/文档并明确阻塞，不能手工伪造 Scene/Prefab/meta。

## 1. 初始检查与环境保护（必须先执行）

在 `<PROJECT_ROOT>` 执行并写入实际报告：

```powershell
Set-Location <PROJECT_ROOT>
Get-Location
git status --short --branch
git branch --show-current
git rev-parse HEAD
git remote -v
git fetch origin --prune
git rev-parse origin/feature/day5a-visual-playable
Get-ChildItem -Force
npm test
npm run check:cocos
node --check tools/verify-day1.cjs
```

预期冻结基线：

```text
仓库 https://github.com/w924871681/game
基线分支 feature/day5a-visual-playable
基线 commit 63b5e55567546ebcd341d7af65ce4a5bbfec1c43
Cocos Creator 3.8.8
版本 0.0.5-alpha.4
已有行为 224/224（参考，不替代你实际运行）
```

如果当前本地 HEAD/工作区与上述预期不一致：**不要 reset、clean、stash、覆盖、强制 checkout**。先只读检查并说明差异，可仅在用户变更能够安全保全的情况下继续；若疑似无法确认起点，停在审计阶段而非破坏工作区。

如果工作区干净且 HEAD 符合冻结基线，允许仅在本地新建：

```powershell
git switch -c feature/day5b-six-orders
```

如果本地分支已存在，不能覆盖/force；确认它的实际 HEAD 和未提交文件再选择是否继续。

开始前把本次工作区必要文件制作 SHA-256 只读清单，并在 **<PROJECT_ROOT> 外**保存安全备份；排除 `.git/`、`library/`、`temp/`、`profiles/`、`build/`、`node_modules/` 等缓存目录。实际来源和时间写入 `docs/validation/day5b/baseline.json`；任何旧 Day 4/5A/V2.2 的验证日志、哈希与截图**不回写**。

必读当前真实文件：

```text
README.md
package.json
tsconfig.json
assets/scripts/data/StageDefinition.ts
assets/scripts/data/OrderDefinition.ts
assets/scripts/data/OrderCatalog.ts
assets/scripts/core/LevelManager.ts
assets/scripts/core/RunController.ts
assets/scripts/stages/StageRuntime.ts
assets/scripts/stages/StageHost.ts
assets/scripts/stages/ElementPool.ts
assets/scripts/stages/DragMatchStageController.ts
assets/scripts/stages/CableConnectStageController.ts
assets/scripts/stages/CleanSwipeStageController.ts
assets/scripts/gameplay/DraggableItem.ts
assets/scripts/gameplay/CableConnector.ts
assets/scripts/visuals/VisualAssetRegistry.ts
assets/scripts/visuals/VisualCatalog.ts
assets/scripts/ui/HomeController.ts
extensions/deskrescue-editor/package.json
docs/DAY5A_PLUS_V22_CREATOR_VALIDATION.md
tools/verify-day1.cjs
tools/test/cc.d.ts
```

注意新扩展操作不要运行旧 Day 3/Day 4 重建命令；这些入口可能覆盖已装配的 V2.2 场景。

## 2. 整体工程策略：固定边界、真正新增玩法

### 2.1 需要新建或扩展的源码

以下是**职责示意路径**。如现有目录命名略异，以真实项目为准，说明差异：

```text
assets/scripts/data/StageDefinition.ts               # 扩展8分支判别联合
assets/scripts/data/OrderCatalog.ts                  # 新增10—15并扩展纯校验
assets/scripts/stages/StageHost.ts                   # 5个新Prefab/Controller静态分支
assets/scripts/core/LevelManager.ts                 # 新kind进度文字/教学和15单流转
assets/scripts/stages/FaultSpotStageController.ts   # 新
assets/scripts/stages/RotaryControlStageController.ts
assets/scripts/stages/GuidedTraceStageController.ts
assets/scripts/stages/GaugeTuneStageController.ts
assets/scripts/stages/SequenceTestStageController.ts
assets/scripts/stages/* 相关的轻量纯函数/输入助手     # 仅必要时新建
assets/scripts/visuals/Day5BVisualCatalog.ts        # 新ID与视觉资源映射（或整合现有registry）
assets/prefabs/stages/FaultSpotStage.prefab
assets/prefabs/stages/RotaryControlStage.prefab
assets/prefabs/stages/GuidedTraceStage.prefab
assets/prefabs/stages/GaugeTuneStage.prefab
assets/prefabs/stages/SequenceTestStage.prefab
assets/art/day5b/**                                # 设备与状态分层素材
extensions/deskrescue-editor/day5b-*.js             # 增量装配、审计、engine probe
...
```

**不强制每个控件都做额外Prefab**，只要 5 个新 Stage Prefab 已真实可用，并且交互子节点能按配置复用/池化；避免产生 14 套一次性Prefab。新 kind 的总缓存上限为 **8**，任意时刻仍最多一个 active Stage。

### 2.2 TypeScript / StageRuntime 约束

原项目实际接口：

```ts
interface StageProgress { readonly completed: number; readonly total: number }
interface StageCallbacks {
  readonly onProgress: (progress: StageProgress) => void;
  readonly onMistake: () => void;
  readonly onComplete: () => void;
}
interface StageRuntime {
  readonly progress: StageProgress;
  setInputEnabled(enabled: boolean): void;
  resetStage(): void;
  deactivateStage(): void;
  resumeStage(callbacks: StageCallbacks): void;
}
```

**必须复用这些合同**，保留旧逻辑。新 Stage Controller 通过 `configure(具体判别类型, callbacks)` 与 `StageHost` 静态分支衔接：**禁止 `as any`、动态字符串类加载、全局EventBus、绕开StageHost直接调用LevelManager**。

新 Stage 的 **onProgress/onMistake/onComplete** 要由正常输入和帧更新驱动，并保证取消、disable、reset、配置换关或对象池复用之后旧回调无效。完成幂等，一次 Stage 最多一次 `onComplete`；每张订单 `RunController.beginLevel` 和 `finishLevel` 各只执行一次。

StageHost 的 `visualAssets` 和旧三个 `assetsFor` 分支不要因为五种新 kind 而失配；新资源可采用扩展的稳定 key 映射或新日用 registry。已有 49 个 visual key 的顺序、含义和旧Prefab绑定保持，缺少必要新素材则明确报错，不能静默显示无图白板、也不能 fallback 到原拖拽图标。

### 2.3 目录语义和数量

- `OrderCatalog` 扩充顺序 **10、11、12、13、14、15**；旧 1—9 配置字节或至少行为/字段语义一致。
- 新订单 `chapterTitle = '进阶维修'`，旧订单章节标题不修改。
- 新增阶段数量 `2+3+2+2+2+3 = 14`；目录合计 **15单 / 27步**。
- `validateOrderCatalog` 原严格校验保持；扩展 5 种具体 kind 校验，类型收窄 exhaustive（必要时 `never` 校验）；reject invalid union，而不是落入旧 `clean-swipe` 处理。
- 当前 Stage 坐标约束 `±360×±400`，所有点击区和路径须适配，不用海报屏幕坐标直接填成局部坐标。
- `LevelManager.formatStageProgress()` 扩为 8 kind，`seenTutorials: Set<StageKind>` 自动用于 5 个新 kind 的 session 首次提示；操作阶段与统计/状态保持同步。
- 真实得分仍由 RunController 原公式计算，建议不改它：`max(100,1000-floor(elapsedMs/1000)*10-mistakes*100)`。
- 星级初稿精确按设计文档 10—15 阈值；阈值本轮只供测试，实际玩家试玩后才能校准。
- 只在 **订单15** 完成后显示整轮总结，并能实际操作 `重新挑战` 和 `返回首页 → 开始维修`；订单9完成后应可正常进入订单10。
- 不允许依赖 Dev-only跳关功能完成最终9→10流转测试。

## 3. 新机制实现必须满足的输入规则

### 3.1 FaultSpot（`fault-spot`）

- 2—6 可点击热点（耳机只有L/R两处），明显可见故障证据；正确热点必须唯一，且与配置 `faultId` 一致。
- 每次 valid tap 只在同一 touch ID 的 START+END、移动≤12设计像素时产生选择；触摸流转、foreign ID、CANCEL、重复 END 不生效。
- 每个错误候选 ID **首次点错计一次**，重复点同一错误候选不能反复扣分；正确点击单次完成，并播放正确定位反馈。
- 每次 `configure` 恢复所有热点、证据和已错选集合，按 Stage stable generation 拒绝旧动画回调。
- 若触摸同时撞上多个装饰重叠元素，必须通过真实 Preview 验证 UI hit test，静态审计无法代替。

### 3.2 RotaryControl（`rotary-control`）

- **mode `align`**（订单10和11）：圆环按实际 `atan2` 手指角度变化；半径125附近环带接收输入、绿色中心角度 0°±12°；初始偏角 +55°。只有玩家有效旋转并**释放**、指针保持绿区 0.6s 才完成；过程中的 CANCEL 不可自动成功。禁用后计时停止，恢复后可继续操作。
- **mode `unscrew`**（订单13）：两螺丝各需沿指定方向累计270°有效旋转；处理跨0/360的角度展开、点压不算旋转、反向移动不应正向累计，完成锁定一枚并做提起反馈。
- 一个Controller/Prefab处理两模式；不新增随机目标，测试明确边界和低帧率轨迹。
- CANCEL、disable、destroy 不增加失误也不推进新状态；已真实转过的螺丝角度可按设计保留，但重开当前Stage全部清零。

### 3.3 GuidedTrace（`guided-trace`）

- 按住可见移动手柄沿路径前进，3检查点顺序必须经过；段偏离容差约48、检查点半径48—56（以配置为准）。
- 仅有效连续拖动可推进；瞬间点击终点、跨越所有检查点、直接把 Node position 改到最后点都不能成功。
- 偏离轨道给红/橙安全提示，并重置到最后一个**已确认检查点**；不算失误、不从起点重新扣进度。`TOUCH_CANCEL` 停止当前操作但保留已完成检查点。
- 轨迹的输入坐标必须正确处理父节点变换和 StageHost 坐标。要做对低帧率连续段的容差采样，也要禁止超大位移一帧穿越多个检查点。
- 打印机将纸页图层绑定在路径手柄；直播信号线高亮轨迹与路由检查点绑定；不能复用旧 CableConnector 的端点配对成功判定。

### 3.4 GaugeTune（`gauge-tune`）

- **两根真正可拖动的滑块**，更新实时读数/波形/风扇；每个有输入归属与CANCEL语义。
- 用可单测的**纯函数**实现三种模式：

```text
fan: temperature=round(96 - .45*fanSpeed - .25*ductOpening),
     noise=round(20 + .45*fanSpeed - .10*ductOpening)
     40<=temperature<=55 && 30<=noise<=48
     初始(90,20)失败；(65,70)应通过。

stereo: |L-R|<=8 && 45<=((L+R)/2)<=75
        初始(85,20)失败；(60,58)应通过；(0,0)必须失败。

broadcast: 65<=videoStability<=85 && 50<=audioLevel<=75
           初始(20,25)失败；(75,65)应通过。
```

- 调整中实时更新显示，**两项均安全、放开滑块后稳定0.7秒**才完成；用 `update(dt)` 累计、不借助Date.now/setTimeout；任何后续调整重置稳定保持时长。双绿尚未满时不能提前 onComplete。
- 普通微调、重复触摸、CANCEL 都不增加失误。三个模式视觉必须有区别：风扇温度/噪声、耳机L/R波形、直播画面/音量。

### 3.5 SequenceTest（`sequence-test`）

- 至少4个明显可点击功能键，目标大字始终显示，四步测试不要求记忆，不使用计时失败。
- 手柄：`↑ ← ↓ →`；键盘：`S A D 空格`；直播：`输入 同步 检查 开播`。
- 正确点按高亮进度 +1 并呈现反馈，错误点按每次有效按键最多计一次、保留先前正确进度；CANCEL、移动误触、重复END不扣分。
- 进度满后 lock 输入，单次 `onComplete`；重开清零、旧回调无效。

## 4. 六单内容和实际画面

按同包中的设计规范逐张实现，下面为开发索引，不得自行压缩步骤。

| 订单 | Stage ID → kind | 关键视觉与完成演出 |
| --- | --- | --- |
| 10 手柄摇杆漂移 | `controller-align` rotary/align → `controller-input-test` sequence | 大手柄、环形刻度、准星回中；测试四灯亮起 |
| 11 打印机卡纸救援 | `printer-find-jam` fault → `printer-extract-paper` trace → `printer-align-roller` rotary/align | 明显皱纸的打印机，3个检查点，最后吐测试纸 |
| 12 键盘连击故障 | `keyboard-find-key` fault → `keyboard-test-keys` sequence | 演示`S→SS`、真实异常键高亮；最终恢复正常输出 |
| 13 散热风扇异响 | `fan-unscrew-cover` rotary/unscrew → `fan-tune` gauge/fan | 两螺丝真实绕圈卸下；实时温度噪声变绿 |
| 14 耳机左右声道失衡 | `headset-find-channel` fault → `headset-balance` gauge/stereo | L/R波形差别；调节后两侧同步，静音仍可玩 |
| 15 直播间紧急救场 | `live-route-signal` trace → `live-tune-stream` gauge/broadcast → `live-final-check` sequence | 路线引导3环、预览屏恢复、四步检验、庆祝 |

内容配置使用独立稳定 ID/key，不从显示文字反推 sprite key 或答案，所有场景依 `OrderCatalog` 自动动态加载。

### 4.1 美术素材生成的最小规范

- **六张获认可的 PNG 应作为 reference 放在 `docs/design/day5b/`（或在任务包中供 Codex 读取）**，不要直接裁一整张当背景/交互；不能把图像中的文字抠出后硬编码成游戏UI。
- 依既有 V2.2 插画风格创建**分层**的设备主体、控件和反馈素材：大手柄/环、打印机/纸/检查点、键盘键帽、风扇/螺丝/护盖、耳机/波形、直播预览/线路；必要时用离线SVG/PNG生成器和 Cocos Graphics。保留可重复生成的源稿及命名映射。
- 由于这些参考图属于较复杂的 3D/半写实美术渲染，Codex若无法实现同等资产精度，优先完成**真实可玩的2D Q版分层实现**并明确艺术差距；不能以静态海报蒙混达标。
- 新 SpriteFrame/meta 经真实 Creator导入；不手写 .scene/.prefab/.meta JSON。不要下载受版权限制的网络素材、字体和第三方库。
- 音效仅用现有系统，可合理复用既有 cue；不新增静态假金币、广告按钮或非真实倒计时。
- 屏幕安全区与 HUD / 输入区域不重叠；新装饰节点无 Button/BlockInputEvents/touch listener。

## 5. 分阶段执行：每阶段必须有可运行结果

**Phase 0 — 基线与保护**：完成第1节检查、明确未提交文件、SHA清单、备份位置；执行历史224回归。若基线异常，先报告，不强制继续。

**Phase A — 框架 + 新单10/11（第一轮真实可玩）**：

1. 扩展 Stage union、StageHost、目录校验和HUD状态；按 `rotary-control`、`sequence-test`、`fault-spot`、`guided-trace` 完成 4 个新kind 的可执行 Controller/Prefab。
2. 完成订单10和11的内容配置、最少必要分层素材、真实触摸输入和提示/完成反馈。
3. 先完整运行样板 10/11 的正确+错误/取消流程、测试和真实 Preview，记录阶段性截图。
4. 避免为运行此样板破坏原9单；新增开发者专用 10/11 定位手段，只能 Editor / Debug 使用。样板成功后才扩大。

**Phase B — 单12/13/14（机制复用和仪表）**：

1. 重用 `fault-spot/sequence-test/rotary`，新增 `gauge-tune` Controller/Prefab，并实现 fan/stereo/broadcast 三mode 的纯评估函数与测试。
2. 完成订单12、13、14，检查 12 的 `S→SS`、13 的旋开两螺丝 + 耦合仪表、14 的 R 异常 + 静音状态下仍可完成。
3. 真实 Preview 验证不同输入尺寸和滑块/波形；此前样板及历史回归必须继续通过。

**Phase C — 单15 + 全目录流转**：

1. 新增订单15三个 Stage，复用 **已有** guided/gauge/sequence，不新写专属输入系统。
2. 确认订单9完成进入10，最终15才出现总评：订单15/15、步骤27/27、最高45星；分数/失误和星级来源于 RunController。
3. 完成 `重新挑战`、`返回首页→开始维修`，并验证 `disable/enable/destroy` 和所有Stage缓存释放。
4. 加入详细单元、集成、真实引擎 probe，适配中文换行、390手机热点和标签。

**Phase D — Creator 保存 + 全面验收与交付**：

1. 在 Creator 3.8.8 中真实创建 5个 Stage Prefab、增量装配现有 Game.scene 的 StageHost Inspector，保存并重导入；保存结果、实际资产UUID/meta与 Inspector 引用由只读审计证实。
2. `npm test` 的完整历史回归 + 新测试通过；`npm run check:cocos`项目 strict通过；保留 SDK 自身102项历史诊断单独记录，**不能假装 SDK 零错误**。
3. 引擎 probe 使用真正保存的Prefab和真实 ActionManager/cc.Touch 可控推进，覆盖输入所有权/重置/旧 generation、角度跨界、路线检查点、滑块稳定时间和连环回调；这不等于浏览器或手机原生触摸。
4. 浏览器桌面自然 Preview：390×844新单10—15完整玩法、768×1024每种新kind至少一例、1280×720完整15单/27步/重玩；捕获真实显示、按键、进度、FPS若有单独测量，不把模拟输入当物理手机触屏。
5. 对 `assets/scenes/Game.scene` 和 Prefab 做 UUID/meta/节点输入 hitbox 检查。多次运行 Editor 装配必须不重复创建节点或Prefab，且不破坏旧9单资源。
6. 生成交付说明与项目外ZIP，**不自动git提交/推送**。

如果某Phase真实Creator无法执行（Editor没有可用入口、资源导入失败），不可手写序列化文件绕过；准确分级汇报 `代码完成 / Creator未完成 / Preview未完成`，停止宣称全阶段完成。

## 6. 失败策略、边界、输入与幂等（不可省略）

1. Touch事件所有权：所有新输入组件用明确 `activeTouchId`，`START / MOVE / END / CANCEL` 严格判定；CANCEL 不记录错误、重复 END 不重复扣分，静态UI不冒领拖拽。
2. 生命周期：onEnable 一次监听，onDisable/onDestroy 清除自有 listener、ownedTween、稳定状态和旧回调；StageHost `deactivateStage` 的 generation 保护全链路有效，支持切换 Stage 时 UI 仍active的装饰动画停止。
3. 显示进度由实际引擎状态计算。`fault-spot 0/1`、`align 0/1`、`unscrew 0/2`、`trace 0/3`、`gauge 0/2`、`sequence 0/4`；不能用 100% 假进度先解锁。
4. `returnHomeFromFinal()`、`playAgain()`、`restartCurrentLevel()` 按当前架构真实重置每种 Stage 的正确/失败/进度/设备表现，session音效状态按当前 V2.2 约定保留。
5. 数据快照外部不可改写，订单和 Stage key 不因中文变化而失效；旧 V2.2 框架中所有最后订单的动态计算基于 `orders.length` 而不是9，必须逐项排查硬编码。
6. 确认新界面没有隐藏的广告/奖励、假按钮和不可点击指示图；明确用户触摸区域最小建议88设计像素，并以真实鼠标 Preview 确认无图层拦截。
7. **严禁修改原九单的难度/评分来“提高自动化成功率”**；六单初稿难度来自设计规格，必要的合理改动写日志，不擅自调整时间判断或故意延迟计时。

## 7. 自动测试最低覆盖矩阵

本任务不固定“新测试必须100组”这种为了凑数的指标，但至少要覆盖**以下可证实的独立案例**：

| 类别 | 检验点 |
| --- | --- |
| 目录 | 15单、27步、8 kind；ID10—15唯一，1—9冻结；坏配置拒绝；新数据深冻结 |
| 定位 | 2—6热点、异常线索、正确/错、错热点只计一次、foreign touch、CANCEL、移动阈值 |
| 旋钮 | 两mode、0/360回绕、±12阈值、0.6秒释放稳定、角度累加270、反向/误点、reset |
| 路线 | 三检查点必须按序、合理快拖、一步跳终点拒绝、偏离回最近有效点、CANCEL、恢复 |
| 仪表 | fan/stereo/broadcast的成功样例与初始失败，双绿保持0.7、调节重置计时、静音耳机 |
| 序列 | 3套各4步、目标可见、错误保留进度、单次失误、重复END/CANCEL |
| Manager | step跨阶段时间、初次教学、订单9→10、订单15总结、总星45、总步骤27、两种最终按钮 |
| 生命周期 | 场景禁用、恢复、切关、Cache≤8、最多1Stage活跃、Prefab池复用和旧tween过滤 |
| UI | 资源不丢失、15单与新Stage所有关键 UI 数据真实绑定、不遮挡操作 |

对已有 224 组旧测试不要删除/降级/注释掉。TypeScript 保持 strict/noUnusedLocals/noUnusedParameters；不使用 `any`、`@ts-ignore`、`@ts-nocheck`、跳过SDK项目类型校验；测试 `tools/test/cc.d.ts` 只补最少必要的 Cocos Mock API，不能用它冒充真实 Creator SDK。

## 8. 本次交付文档和截图要求

### 8.1 文档

修改/新增：

```text
README.md                             # 新阶段准确功能及未测状态
package.json                          # 推荐0.0.5-alpha.5
assets/scripts/...                    # 当前可执行新增五kind六单
assets/prefabs/stages/..              # Creator真实保存5个新Prefab + meta
assets/scenes/Game.scene              # Editor增量绑定
extensions/deskrescue-editor/...      # 真实装配/审计/probe
assets/art/day5b/...                  # 可复用真实游戏分层素材与meta
tools/verify-day5b.cjs                # 可作为现有npm test的扩展入口
docs/DAY5B_ARCHITECTURE.md
docs/DAY5B_COCOS_SETUP.md
docs/DAY5B_CREATOR_VALIDATION.md
docs/DAY5B_VISUAL_ASSET_MANIFEST.md
docs/DAY5B_CHANGELOG.md
docs/GPT_HANDOFF.md
docs/validation/day5b/...            # 实际JSON/日志/截图
```

阶段性做的测试可以保留在文件夹，但回执中要标清最终有效审计日期/场景与旧审计哈希失效关系。**不要修改旧 Day 4、Day 5A、V2/V2.1/V2.2 的历史验证资料来冒充当日通过。**

### 8.2 截图

在真实 Preview 下至少记录：

```text
day5b-order10-rotary-390x844.jpg
day5b-order10-sequence-390x844.jpg
day5b-order11-fault-390x844.jpg
day5b-order11-trace-390x844.jpg
day5b-order12-keyboard-390x844.jpg
day5b-order13-unscrew-390x844.jpg
day5b-order13-gauge-390x844.jpg
day5b-order14-stereo-390x844.jpg
day5b-order15-trace-390x844.jpg
day5b-order15-gauge-390x844.jpg
day5b-order15-test-390x844.jpg
day5b-final-15of15-390x844.jpg
```

此外单独拍 390 宽的错误反馈、路线偏离、旋钮绿区、滑块双绿保持前后的画面；可根据真实测试增补，**文件名不能冒充不存在的画面状态**。写 `docs/validation/day5b/screenshot-inventory.json`（尺寸、sha256、视口、实际状态、是否经过真实操作）。若只做 Dev 直达新单，不能冒充从订单1完整跑到15的截图。

### 8.3 交付包

保存**项目外** ZIP 如 `<DELIVERY_ROOT>\DeskRescue-Day5B-alpha5.zip`，包含本次可重建工程所需的源码、素材及meta、场景、Prefab、项目设置、扩展、测试、参考设计和新旧文档证据，排除 `.git/ library/ temp/ profiles/ node_modules/ build/` 等缓存和个人资料；验证 ZIP CRC、逐项 SHA/size 与新目录解压，不能写死预期成功。

## 9. 最终报告（必须客观）

要求 Codex 最终以 Markdown 给出：

1. 实际 `<PROJECT_ROOT>` 工作区、分支、commit、修改起点是否干净；是否创建新本地分支，是否存在未提交修改。
2. 15单/27步/8种Stage是否已经真实达到；6单逐单操作是否可玩，不能只给数组计数。
3. 每个新 Stage 控制器、Prefab、Visual key/资源、配置验证各自路径；是否保留旧9单及原224测试。
4. `npm test`、`npm run check:cocos`、Node/Python语法、Creator审计、真实engine probe、真实Preview的**实际执行命令、时间、退出码、截图链接**；区分有限mock、真实引擎模拟触摸、自然鼠标、物理触屏。
5. 15单完整桌面自然 Preview 覆盖结果与总成绩：星级/分数/总秒数/失误由真实UI读取；禁止凭伪造输入或统计合成数据宣称。
6. 物理触屏、浏览器原生Touch/CANCEL、手机WebView、微信/抖音平台仍未验证时原样列明；SDK自身102诊断继续单列。
7. 已知问题（美术近似度、文字长度、可操作性、耗时阈值偏难、缺人类试玩）与建议后续优先级，不把问题藏在“PASS”。
8. Git状态：明确**没有执行git add/commit/push/tag/merge**；没有重置/清理/覆盖历史；没有商业平台发布、Day5C或广告。
9. 最新交接 `docs/GPT_HANDOFF.md` 和工程包路径、CRC/SHA核对结果。

## 10. 验收停止条件与说明

**Go**：15单、27步、8kind、5种新手势真实可操作；六单的故障故事和反馈不同；旧224断言继续通过；Creator保存、Inspector/Prefab、电脑 Preview、重玩与回首页均与报告一致。  
**Conditional**：逻辑/mock已完成，但真实Creator或Preview未运行；精确标记剩余验证，不得“先全通过”。  
**Stop/Fail**：仅将旧三种玩法换皮、新游戏只有几张静态海报、实际触摸判定不可用、旧9单受损、跳测试掩盖错误、手工伪造Creator资源、隐式commit/push。

**执行顺序不可倒置：先真实工程审核与四类新Stage样板，后仪表和其他订单，最后整轮15单验收与交付。**
