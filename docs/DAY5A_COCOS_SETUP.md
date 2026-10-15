# Day 5A Creator 装配与 Inspector 绑定

目标工程：`D:\game`；引擎：Cocos Creator **3.8.8**；设计尺寸：**720 × 1280**。

本页说明 Day 5A 的装配接口、绑定和复验方法。**装配是否实际执行、保存是否成功，以及 Preview 验收结果，以 `docs/validation/day5a/` 的当次报告和 `DAY5A_CREATOR_VALIDATION.md` 为准。** 本页本身不是验收通过证明。

2026-10-15 本地最终保存已完成：full装配第二遍新增节点0，资源审计643/643、真实引擎探针18/18，三比例鼠标操作和完整九单十三步+重玩通过。具体范围见 [当次实测记录](DAY5A_CREATOR_VALIDATION.md)。正常试玩直接打开已有Game.scene，无需再次装配。

## 1. 装配约束

- 先打开已保存的 `assets/scenes/Game.scene`，保留其 Canvas / UI Camera / StageHost。
- 所有 Scene、Prefab 的节点和组件修改由 Creator scene process 中的真实 `cc.Node` / `cc.Component` 完成，再调用实际 Prefab / Scene 保存 API。
- PNG 先经 Creator asset-db 导入。通过 `query-asset-meta` 读取真实 metadata，设置图片资源类型，再通过 `save-asset-meta` 交回 Creator 重新导入。必须等到实际 `.meta` 出现 `sprite-frame` 子资产后才绑定。
- 不通过文件工具拼写 `.scene`、`.prefab`、`.meta`；不重新执行 Day 3 装配或 Day 4 的 `Build Prefabs and Update Scene` 来覆盖 Day 5A。
- 输入根节点的位置、缩放、命中框和核心 Prefab UUID 保留；新增外观放入明确命名的子节点。
- `Day 5A` 菜单的最终名称和执行记录应与当前 `extensions/deskrescue-editor/package.json` 对照。入口完成真实执行后，再据当次结果更新验收文档。

## 2. 两个装配阶段

**切片阶段 (`phase: "slice"`)** 只要求完整展示以下代表性资源：

| Stage | 实际映射 |
| --- | --- |
| `drag-1` | `devices/mouse`、`devices/keyboard`、`devices/headset` |
| `computer-cables` | power、display、network 的 head / port，共 6 个 SpriteFrame |
| `keyboard-clean` | `workbench/keyboard-clean` 底图和 `dirt/dust` |

切片中 `StageHost.slicePreview = true`，未覆盖订单仍保留旧文字外观并发出明确开发提示，用于按顺序到达代表性订单。这一状态不能报告为十九种设备和九单完整视觉覆盖。

**完整阶段 (`phase: "full"`)** 必须设置 `StageHost.slicePreview = false`，不允许缺图静默降级。覆盖全部 19 种设备、四个接线 Stage 中的 9 种接口形状的 head / port、3 个清洁底图，以及首页 / HUD / 结算资源。缺失稳定 ID 映射或 Inspector SpriteFrame 时，开发期报出具体键。

## 3. Scene Inspector 引用

| 组件 / 节点 | 必需属性 | 引用目标 / 值 |
| --- | --- | --- |
| Canvas / `LevelManager` | `autoStartOnSceneLoad` | `false`，首页出现时不自动启动订单 |
| Canvas / `LevelManager` | `runController` / `stageHost` | Canvas 的 `RunController` / `Canvas/PlayArea/StageHost` 的 `StageHost` |
| Canvas / `LevelManager` | `audioFeedback` / `resultStars` | Canvas 的 `AudioFeedback` / 结果面板的 `ResultStars` |
| Canvas / `HomeController` | `levelManager` / `audioFeedback` | 同一个 Canvas 上的对应组件 |
| Canvas / `HomeController` | `overlay` | `Canvas/HomeOverlay`；保存时 active |
| Canvas / `HomeController` | `startButton` | HomeOverlay 内的“开始维修” Button；命中框至少 280 × 84 |
| Canvas / `HomeController` | `soundButton` / `soundStateLabel` | 首页关闭后仍有效的音效 Button 与状态 Label |
| Canvas / `HomeController` | `soundIcon` / `soundOnFrame` / `soundOffFrame` | SoundButton 的子 Sprite 与 ui/sound-on、ui/sound-off 两张真实 SpriteFrame |
| Canvas / `VisualAssetRegistry` | `keys` / `frames` | 长度相同、key 唯一的稳定资源键和真实 SpriteFrame 数组 |
| StageHost / `StageHost` | `dragMatchPrefab` / `cableConnectPrefab` / `cleanSwipePrefab` | 原位更新的三个 Stage Prefab |
| StageHost / `StageHost` | `visualAssets` | Canvas 的唯一 `VisualAssetRegistry` |
| Canvas / `RunController` | `timeLabel` / `mistakeLabel` | `Canvas/Header/Stats` 下原有两个 Label |

原有 LevelManager 的章节、订单、步骤、提示、结算文本和下一单 Button 引用继续有效。`CompletePanel` 保存时 inactive。首页期间 StageHost 不预先保存一个已激活的运行时 Stage。

所有 Button 的 Inspector `Click Events` 留空，监听由组件代码管理。HomeController 在 enable 时绑定，在 disable / destroy 时解绑；`startRepair()` 和 `LevelManager.startFirstOrder()` 防止重复开始。不能同时配置 Inspector 点击回调和代码监听。

## 4. Prefab Inspector 引用

| Prefab | 必需绑定 |
| --- | --- |
| `DragMatchStage` | controller 的 `gameController` 指向本地 GameController，`itemPrefab` / `targetPrefab` 指向原 DragItem / DragTarget |
| `CableConnectStage` | controller 的 `cablePrefab` / `portPrefab` 指向原 Cable / Port |
| `CleanSwipeStage` | `inputSurface` → InputSurface；`dirtLayer` → InputSurface/DirtLayer；`dirtCellPrefab` → DirtCell；`deviceVisual` → CleanDeviceVisual |
| `CleanDeviceVisual` | `device` → InputSurface 下、DirtLayer 之前的设备 Sprite |
| `DragItem` / `DragTarget` / `Port` | 根节点的 ElementVisual：`icon` → 子 Sprite；`caption` → 原 Label；`checkMarker` → 默认隐藏的对勾节点 |
| `Cable` | CableConnector 的 Head / Anchor / Graphics Line 层级保留；ElementVisual 放在 Head，绑定其图标、原 Label、对勾 |
| `DirtCell` | 根 Sprite → `dirt/dust` 的真实 SpriteFrame；保留 UIOpacity，仍由原清洁逻辑淡出 |

InputSurface 必须为 **680 × 560**。设备底图位于 DirtLayer 之下；不在装饰上新增 Button、BlockInputEvents 或自动 Layout。输入装饰遮挡仍须实际 Preview 验证，静态节点检查不能替代鼠标输入。

卡片和主按钮实际使用 `ui/card` / `ui/button` 的192×128原创PNG，Sprite.Type为SLICED。通过Creator资产导入API设置borderLeft/borderRight=32、borderTop/borderBottom=38、trimType=none；不得手写meta。Header/HudCard、HudShadow、TutorialHint、CompletePanel及CardFace/CardShadow、HomeOverlay/HeroDesk、StartButton/NextButton/SoundButton均由最终审计严格检查绑定来源与SLICED类型。主按钮normal tint为白色，避免再次乘青绿使原图过暗。

## 5. 音效与星级

Canvas 的 AudioFeedback 绑定一个 AudioSource。AudioSource `playOnAwake = false`、`loop = false`；AudioFeedback 默认音量 `0.25`。七个 cue 引用实际导入的短音频：

| 属性 | 音频 |
| --- | --- |
| `uiClickClip` | `assets/audio/sfx/ui_click.wav` |
| `successClip` | `assets/audio/sfx/snap_success.wav` |
| `mistakeClip` | `assets/audio/sfx/mistake.wav` |
| `cleanCompleteClip` | `assets/audio/sfx/clean_progress.wav`（作为清洁完成短 cue 使用） |
| `stageCompleteClip` | `assets/audio/sfx/stage_complete.wav` |
| `orderCompleteClip` | `assets/audio/sfx/order_complete.wav` |
| `runCompleteClip` | `assets/audio/sfx/run_complete.wav` |

点击“开始维修”的真实用户手势解锁播放；初始首页不自动播放。音效开关只影响当前 session，重载恢复默认开启。结果面板 ResultStars 的 `starSprites` 必须绑定三个不同的 Sprite，`earnedFrame` / `emptyFrame` 绑定实际 SpriteFrame；星级数值仍来自 RunController。

AudioFeedback观察真实AudioSource的STARTED/ENDED并输出 `[DeskRescue Audio]` 消息，两事件在disable/destroy时严格解绑。所有七类声音的自然事件见 [audio-final-skin.json](validation/day5a/audio-final-skin.json)，该证据与隔离探针的静音/synthetic事件检查分开记录。

## 6. Day 5A 审计入口

`extensions/deskrescue-editor/day5a-audit.js` 导出：

```js
const report = require('./day5a-audit').run(projectRoot, runtimeReport);
```

这是只读审计，返回报告而不写 Scene / Prefab / Meta，也不写 Day 4 报告。main process 负责将当次结果写入 Day 5A 目录。`runtimeReport` 来自实际 Creator scene process，至少含：

```js
{
  ok: true,
  phase: 'slice', // 全量装配改成 'full'
  sceneUuid,
  hostUuid,
  classes, // 注册类名 -> Creator 实际 class ID
  registryKeys,
  nodeCountsBefore,
  nodeCountsAfter,
  addedNodesByResource,
  repeatPass: { ok, addedNodesByResource }, // 第二次真实装配的结果
  cacheInspection: { activeStageCount, countByKind } // 若真实运行时已检查
}
```

不要为了填报告而手工伪造这些字段。缺少 repeat / cache 证据会单列 warning；文件审计不自动宣称这两项运行行为通过。

审计检查九个核心资产 UUID、实际序列化内部索引和外部 UUID、脚本类、组件与父子所有权、所有 PNG / 音频 meta 和子资产、缺失 / 重复 / 孤儿 meta，以及真实保存的 Home / Audio / Registry / Stars 绑定。输入节点使用基线 commit 的原始资源字节进行比较，并先核对基线 SHA-256，严格检查核心资源 UUID、输入节点路径唯一性、父子层级、transform、anchor、layer 和 hitbox。Creator 在增量克隆并重新序列化 Prefab 时重新分配的内部 fileId 单列 before/after，扫描 targetOverrides，不能留下依赖旧 fileId 的外部覆盖。

稳定映射检查使用本机真实 TypeScript 编译器在内存执行纯 OrderCatalog / LevelCatalog / VisualCatalog，不生成替代游戏资产；全量要求 19 种拖拽设备、全部接线映射和 3 个清洁底图。订单数据文件同时与 Day 5A 开始前快照比对，证明坐标、ID、评分和清洁阈值未被视觉工作更改。

实际菜单（扩展重载后生效）：

| 菜单 | 快捷键 | 操作 |
| --- | --- | --- |
| DeskRescue / Day 5A / Apply Visual Skin | Ctrl+Alt+9 | 原创素材导入、增量装配、实际保存、第二遍幂等核对和资源审计 |
| Audit Visual Assets | Ctrl+Alt+0 | 当前已保存资源与真实类绑定审计 |
| Refresh Day 5A Scripts | Ctrl+Alt+R | Creator asset-db 重导入源码 |
| Run Real Engine Probe | Ctrl+Alt+2 | 隔离真实引擎 fixture，正式场景不修改 |

## 7. 保存与复验

1. 通过 Creator 装配并原位保存九个核心资产，等待资源导入完成。
2. 执行只读审计，查看 `ok`、`passed / total`、`errors`、`phase` 和 `coverageClaim`。
3. 再次执行相同阶段的真实装配，再保存并审计；第二次九个资产新增节点数应全部为 0。
4. 运行全量行为测试和 `npm run check:cocos`。SDK 自身声明诊断单列，不能与项目检查合并。
5. 在真实 Preview 观察首页不计时，点击开始后进入第一单；检查三种玩法、音效开关、结算、九单十三步和重新挑战。
6. 保存 390×844、768×1024、1280×720 的实际画面，含清洁前 / 半程 / 完成。将实际执行范围写入 Day 5A 验收文档；未完成项明确标记。

当前任务仅授权本地实施和验证，未授权 commit / push。旧 Day 3 / Day 4 的报告与截图保留原样。
