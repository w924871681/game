# DeskRescue / 桌面急救站 — Day 4 Creator 装配规范 / V0.0.4

更新日期：2026-10-08。目标环境为 **Cocos Creator 3.8.8**，项目根目录 **D:\game**，设计分辨率 **720 × 1280**。

本文件说明实际实现的 Editor 装配入口、Prefab 结构、Inspector 绑定与复验步骤。**代码存在、类型通过不等于 Creator 已执行或 Preview 已通过**。具体操作时间、文件哈希、保存结果、审计、probe 和截图统一记录在 [DAY4_CREATOR_VALIDATION.md](DAY4_CREATOR_VALIDATION.md)。不要据本文件推断未记录的验收已经通过。

## 1. 在现有 Day 3 场景上升级

1. 使用 Creator 3.8.8 打开 `D:\game`，等待新脚本导入及 class 注册完成。
2. 打开既有 `assets/scenes/Game.scene`；保留其 Canvas/UI Camera 和已有 HUD/结果节点。不要用 Day 3“装配场景”菜单覆盖现有内容。
3. 在扩展管理器确认项目扩展 `deskrescue-editor` 已加载最新版；代码变动后若菜单未刷新，重新加载该扩展。
4. 执行 **DeskRescue → Day 4 → Build Prefabs and Update Scene**。
5. 检查 Console 和 `docs/validation/day4/build-report.json`。只有 `ok: true` 且 Creator 返回保存确认，才能记为完成装配保存；失败时读取具体错误并保留现有资产。
6. 执行 **DeskRescue → Day 4 → Audit Scene and Prefabs**，检查 `scene-audit.json` 和 `runtime-audit.json`。随后执行 **Run Engine Probe**，检查 `engine-probe.json`。

Creator 窗口获得焦点时，也可使用扩展注册的 Windows 快捷键；功能与对应菜单相同：

| 快捷键 | Day 4 菜单 | 功能 |
| --- | --- | --- |
| `Ctrl+Alt+4` | Build Prefabs and Update Scene | 生成/复用八个 Prefab，更新绑定并请求 Creator 保存当前场景 |
| `Ctrl+Alt+5` | Audit Scene and Prefabs | 保存运行时检查和 Scene/Prefab 文件审计 |
| `Ctrl+Alt+6` | Run Engine Probe | 执行真实引擎 fixture probe 并保存实际结果 |
| `Ctrl+Alt+7` | Refresh Project Scripts | 通过 asset-db 重新导入 StageHost.ts 和 LevelManager.ts，使 Creator 更新脚本依赖 |
| `Ctrl+Alt+8` | Correct Clean Stage Appearance | 通过 Creator 克隆并序列化现有 CleanSwipeStage Prefab，将 InputSurface 调整为 680 × 560，保留原资产 UUID、污渍布局和组件引用 |

快捷键已在 `extensions/deskrescue-editor/package.json` 的 `contributions.shortcuts` 注册。Refresh 仅刷新上述两个脚本，不会完成场景装配或代替审计；操作后等待导入完成，再根据需要运行 Build/Audit/Probe。

`Ctrl+Alt+8` 对应 `day4-appearance.js`，修正旧 680 × 650 清洁背景可能遮挡 HUD 的范围。它先移除临时克隆的 Prefab 实例关联，再使用 Creator 生成并验证序列化结果，由 asset-db 保存回同一 UUID；不会手改 Prefab JSON，也不改正式场景。修正后重新运行 Audit/Probe 并刷新 Preview；是否已实际保存以 `appearance-report.json` 及 [实测记录](DAY4_CREATOR_VALIDATION.md) 为准。新的 Build 配方也使用 680 × 560 InputSurface。

装配实现位于 `extensions/deskrescue-editor/day4-scene.js`，由 `main.js → scene.js` 在 Creator 场景进程调用。它创建真实 Node/组件，通过 Creator 的 `Prefab.generatePrefabDataFromNode` 生成内容，再由 asset-db 创建和导入资产；场景通过 Creator 的 snapshot / save-scene 保存。`.scene`、`.prefab`、`.meta` 均不由手写 JSON 伪造。

装配需要当前场景具备 Day 3 的 Canvas、绑定的 UI Camera、Header、PlayArea、TutorialHint、CompletePanel。缺少前提或脚本 class 未导入时明确失败。已有同名 Prefab 会检查预期根组件并复用；不盲目覆盖现有资产。完整引用仍需运行审计确认。构造临时 Node 在操作结束后释放。

## 2. 八个 Prefab

装配入口生成或复用以下固定资产，运行时订单变化无需新建 Prefab：

| 路径（相对 assets/prefabs） | 根组件 / 引用 |
| --- | --- |
| `elements/DragItem.prefab` | UITransform、Sprite、DraggableItem；子节点 Label |
| `elements/DragTarget.prefab` | UITransform、Sprite；子节点 Label |
| `elements/Cable.prefab` | UITransform、CableConnector；Line、Anchor、Head/Label |
| `elements/Port.prefab` | UITransform、Sprite；子节点 Label |
| `elements/DirtCell.prefab` | UITransform、Sprite、UIOpacity |
| `stages/DragMatchStage.prefab` | UITransform、局部 GameController、DragMatchStageController |
| `stages/CableConnectStage.prefab` | UITransform、CableConnectStageController |
| `stages/CleanSwipeStage.prefab` | UITransform、CleanSwipeStageController；InputSurface/DirtLayer |

所有 UI 节点使用 UI_2D layer。Sprite 使用 Creator 内置白色面板 SpriteFrame `b730527c-3233-41c2-aaf7-7cdab58f9749@f9941`、SLICED、CUSTOM 尺寸与纯色 tint。没有外部美术下载。

```text
DragMatchStage [UITransform 720×800, GameController, DragMatchStageController]
  运行时池：DragTarget × N、DragItem × N

CableConnectStage [UITransform 720×800, CableConnectStageController]
  运行时池：Port × N、Cable × N
    Cable [UITransform 720×800, CableConnector]
      Line [UITransform, Graphics]
      Anchor [UITransform 22×22, Sprite]
      Head [UITransform 130×80, Sprite]
        Label [Label]

CleanSwipeStage [UITransform 720×800, CleanSwipeStageController]
  InputSurface [UITransform 680×560, Sprite]
    DirtLayer [UITransform 680×650]
      运行时池：DirtCell × N [UITransform, Sprite, UIOpacity]
```

Item/Target 的初始尺寸为 180 × 140；四列 drag 会由 controller 改为 140 × 110，Label 同步适配。Cable Head/Port 使用 130 × 80，字框 120 × 70。DirtCell 最终尺寸由每个区域的尺寸除以网格行列数计算。

Prefab 内不要预放每张订单的固定元素。Stage controller 通过本地池配置 2～4 对 drag、2～4 根 cable 或最多 64 格 dirt；首次不足才 instantiate，切换后复用。

## 3. Scene 的正式层次

```text
Game
└── Canvas [Canvas, RunController, LevelManager]
    ├── UI Camera [Canvas 已绑定的 UI Camera]
    ├── Header
    │   ├── GameTitle
    │   ├── ChapterLabel
    │   ├── LevelLabel
    │   ├── LevelTitleLabel
    │   ├── StageLabel
    │   ├── StatusLabel
    │   └── Stats
    │       ├── TimeLabel
    │       └── MistakeLabel
    ├── PlayArea
    │   ├── LegacyDay3 [inactive，保留旧六个 Item/Target]
    │   └── StageHost [StageHost, UITransform 720×800]
    │       └── 运行时最多三个缓存 Stage root，仅一个 active
    ├── TutorialHint
    │   └── TutorialLabel
    └── CompletePanel [初始 inactive]
        ├── CompleteLabel
        ├── CompleteDetailLabel
        └── NextButton [Button]
            └── Label
```

装配只把六个已知 Day 3 Item/Target 移入 inactive `LegacyDay3`，保留无关节点。Canvas 上原 GameController 若存在则 disabled，`statusLabel` 置空；正式 drag 使用 Stage Prefab 内的局部 GameController。正式流程不挂 `LegacyLevelManager` 或 `Day1Prototype`，也不再绑定固定 Item1～3/Target1～3 数组。

默认 Main Camera/Main Light 保持既有 inactive 状态；使用 UI Camera。保持 Canvas 的 cameraComponent、AlignCanvasWithScreen 以及 UI_2D 相机可见层。设计分辨率 720 × 1280、Fit Width/Fit Height 延续 Day 3 设置。PlayArea/StageHost 不添加自动 Layout，以免覆盖配置坐标。

## 4. Inspector 绑定

### Canvas / RunController

| 属性 | 绑定对象 |
| --- | --- |
| `timeLabel` | Header/Stats/TimeLabel 的 Label |
| `mistakeLabel` | Header/Stats/MistakeLabel 的 Label |

### Canvas / LevelManager

| 属性 | 绑定对象 |
| --- | --- |
| `runController` | Canvas 的 RunController |
| `stageHost` | PlayArea/StageHost 的 StageHost |
| `chapterLabel` | Header/ChapterLabel 的 Label |
| `levelLabel` | Header/LevelLabel 的 Label |
| `levelTitleLabel` | Header/LevelTitleLabel 的 Label |
| `stageLabel` | Header/StageLabel 的 Label |
| `statusLabel` | Header/StatusLabel 的 Label |
| `tutorialHint` | TutorialHint Node |
| `tutorialLabel` | TutorialHint/TutorialLabel 的 Label |
| `completePanel` | CompletePanel Node |
| `completeLabel` | CompletePanel/CompleteLabel 的 Label |
| `completeDetailLabel` | CompletePanel/CompleteDetailLabel 的 Label |
| `nextButton` | CompletePanel/NextButton 的 Button |
| `actionButtonLabel` | NextButton/Label 的 Label |

`orders` 读取 TypeScript `ORDER_CATALOG`，无需逐订单 Inspector 配置。NextButton 的 Inspector **Click Events 留空**；LevelManager 注册唯一 CLICK 分发，根据状态执行下一张或重玩，避免重复调用。按钮初始由 Manager 加载订单时隐藏并禁用。

### PlayArea/StageHost

| 属性 | 绑定资产 |
| --- | --- |
| `dragMatchPrefab` | stages/DragMatchStage.prefab |
| `cableConnectPrefab` | stages/CableConnectStage.prefab |
| `cleanSwipePrefab` | stages/CleanSwipeStage.prefab |

### 各 Stage Prefab

| 组件 | 属性 | 绑定 |
| --- | --- | --- |
| DragMatchStageController | `gameController` | 同 root 的局部 GameController |
| DragMatchStageController | `itemPrefab` / `targetPrefab` | DragItem / DragTarget 资产 |
| 局部 GameController | `statusLabel` | 空，由上层 HUD 统一显示 |
| CableConnectStageController | `cablePrefab` / `portPrefab` | Cable / Port 资产 |
| CleanSwipeStageController | `dirtCellPrefab` | DirtCell 资产 |
| CleanSwipeStageController | `inputSurface` | InputSurface Node |
| CleanSwipeStageController | `dirtLayer` | InputSurface/DirtLayer Node |

Cable Prefab 的 CableConnector：`head → Head Node`，`line → Line 的 Graphics`，`anchor → Anchor Node`。指定 port、吸附半径、颜色及回调由 controller 每次 configure；无需在 Prefab 预绑某张订单端口。

DragItem Prefab 的目标、局部 GameController 和 snapDistance 同样由 configure 指定；保留动画开启。DirtCell 的 UIOpacity 初始为 255；reset 时重新设置 active、opacity 和内部清洁状态。

## 5. HUD 和结果布局

以下坐标与尺寸对应当前 `day4-scene.js`。Header/Stats/PlayArea 延续原点布局，所有位置是父节点局部坐标。

| 节点 | X, Y | 宽 × 高 | 字号 / 初始文字 |
| --- | --- | --- | --- |
| Header/GameTitle | 0,590 | 660 × 55 | 40 / 桌面急救站 |
| Header/ChapterLabel | 0,545 | 660 × 32 | 22 / 基础订单 |
| Header/LevelLabel | 0,505 | 660 × 36 | 25 / 订单 1 / 9 |
| Header/LevelTitleLabel | 0,462 | 660 × 44 | 30 / 桌面整理 |
| Header/StageLabel | 0,418 | 660 × 36 | 22 / 步骤 1 / 1 |
| Header/StatusLabel | 0,372 | 660 × 46 | 23 / 把设备拖到对应区域 |
| Stats/TimeLabel | -170,325 | 300 × 38 | 22 / 用时：0.0 秒 |
| Stats/MistakeLabel | 170,325 | 300 × 38 | 22 / 失误：0 |
| TutorialHint | 0,-510 | 沿用既有容器 | — |
| TutorialLabel | 0,0 | 580 × 60 | 25 / 拖动物品到对应区域 |
| CompletePanel | 0,-20 | 660 × 650 | 初始 inactive |
| CompleteLabel | 0,245 | 620 × 64 | 36 / 订单完成 |
| CompleteDetailLabel | 0,15 | 600 × 340 | 26，lineHeight=43 |
| NextButton | 0,-245 | 沿用 300 × 88 | — |
| NextButton/Label | 0,0 | 280 × 72 | 30 / 下一张订单 |

文字采用 Microsoft YaHei 系统字体、水平/垂直居中、Overflow SHRINK 和自动换行。status 运行时包含说明及进度两行；结果字框容纳单订单五行、最终六行。须在真实 Preview 确认中文、★/☆、长线缆标签及横屏缩放没有裁切。

## 6. 复验顺序与证据

先运行代码检查：

```powershell
npm test
npm run check:cocos
node --check tools/verify-day1.cjs
node --check tools/verify-day4.cjs
node --check extensions/deskrescue-editor/day4-scene.js
```

当前实现检查为原 58 + Day 4 新增 56 = **114 组 mock 行为测试**；原 58 的编排 fixture 使用 `LegacyLevelManager`，新的 56 使用正式 Day 4 组件。另有 9 条预期负向类型诊断和独立质量审计，均不冒充行为组。详情见 [DAY4_ARCHITECTURE.md](DAY4_ARCHITECTURE.md)。

`check:cocos` 使用 Creator 生成的真实配置和声明，保留 strict、noUnusedLocals、noUnusedParameters、skipLibCheck=false。安装的 SDK 自身 102 条声明语义诊断单独报告；完整 SDK 自检可运行以下命令，已知诊断存在时应非零退出：

```powershell
node tools/verify-day1.cjs --cocos-types --check-sdk-declarations
```

Editor 审计应确认 Scene/Prefab 中所有内部与资产 UUID 可解析、三个 Stage Prefab 与五个元素 Prefab 绑定完整、StageHost 位于正式 UI、旧六节点 inactive、Day1Prototype/LegacyLevelManager 不参与正式流程、按钮无重复 Click Events，并在报告保存文件 SHA-256。修改场景或 Prefab 后须重新审计，旧哈希不能证明新文件通过。

Engine Probe 必须在真实 Editor 内执行并保存实际结果。合成 Touch/EventTouch 及手动推进真实 TweenSystem 可验证组件输入和动画规则；它不等同于浏览器原生触摸命中、自然帧播放或物理触屏。

Preview 至少逐项核对：

1. 九张订单按目录顺序运行，前三张文字、位置、半径与 Day 3 一致。
2. 单步骤订单和订单 6/8/9 的连续步骤；中途不弹订单结算，时间与失误不重置。
3. 2/3/4 个 drag 与 cable、20/32/35 格 clean；吸附、错误回位、固定 anchor 连线、清洁淡出。
4. 教学首次出现、第一次有效进度后隐藏，错误/CANCEL 不提前隐藏；同 kind 和重玩不重复教学。
5. 前八张“下一张订单”，第九张“重新挑战”；最终 9 / 9、27 星上限、13 / 13；重玩完整清零并复用节点。
6. 390 × 844 竖屏、3:4 平板和 16:9 横屏，HUD、物品、端口、清洁区、五行/六行面板和按钮可见。
7. Console 错误/警告、截图及操作步骤记入 Day 4 validation；浏览器设备模拟触摸与物理触屏分别记录，未测不得写通过。

Day 3 原文档和 `validation/day3` 证据保持历史记录；Day 4 所有新增证据写入 `docs/validation/day4`。本阶段不自动 commit/push，也不自动开始 Day 5。
