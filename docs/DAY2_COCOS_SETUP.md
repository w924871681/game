# Day 2 固定场景与 Inspector 绑定

这些步骤尚需在 Creator Editor 执行，不是已完成的 Scene Editor 操作记录。代码已完成；没有手写或伪造 `.scene` / `.prefab`。

## 1. 项目和画布

1. Cocos Dashboard 选择/安装 **Creator 4.0 LTS**，导入 **D:\game**，等待脚本导入完成。
2. 资源面板右键 **assets/scenes → 创建 → 场景**，命名 **Game**，双击打开；有模板时选择 **2D**。
3. 若没有 Canvas，在层级面板通过 **创建 → UI → Canvas** 创建，使用编辑器同时创建的默认 UI 相机。
4. 项目设计分辨率设为 **720 × 1280**，**Fit Width / Fit Height** 均开启。Canvas 的 CameraComponent 引用 UI 相机、AlignCanvasWithScreen 开启，相机 Visibility 包含 **UI_2D**。
5. Canvas 保留 UITransform 和默认适配组件。下面所有 UI 节点都使用 **UI_2D** layer，Z = 0，scale = (1,1,1)，锚点 = (0.5,0.5)。
6. 若 Canvas 已挂 Day1Prototype，取消该组件的 Enabled。不要先运行它来生成 Day 2 节点；正式节点必须保存在本场景中。

## 2. 稳定节点

创建以下节点。Header 和 PlayArea 是带 UITransform 的普通 UI Node；文字使用 Label。Item 和 Target 本身固定尺寸，文字放在 Label 子节点，避免文字长度改变拖拽命中尺寸。

```text
Game
└── Canvas                           [GameController, LevelManager]
    ├── UI 相机                      [编辑器生成]
    ├── Header                       [UITransform]
    │   ├── GameTitle                [Label]
    │   ├── LevelLabel               [Label]
    │   ├── LevelTitleLabel          [Label]
    │   └── StatusLabel              [Label]
    ├── PlayArea                     [UITransform]
    │   ├── Target1                  [UITransform]
    │   │   └── Label                [Label]
    │   ├── Target2                  [UITransform]
    │   │   └── Label                [Label]
    │   ├── Target3                  [UITransform]
    │   │   └── Label                [Label]
    │   ├── Item1                    [UITransform, DraggableItem]
    │   │   └── Label                [Label]
    │   ├── Item2                    [UITransform, DraggableItem]
    │   │   └── Label                [Label]
    │   └── Item3                    [UITransform, DraggableItem]
    │       └── Label                [Label]
    └── CompletePanel                [UITransform，初始 Active 关闭]
        ├── CompleteLabel           [Label]
        ├── CompleteDetailLabel     [Label]
        └── NextButton              [使用 创建 → UI → Button]
            └── Label              [Label，文字 Next Level]
```

使用以下布局，坐标相对于各自父节点；不要给 PlayArea 添加 Layout，它可能覆盖关卡配置的位置。

| 节点 | X, Y | 宽 × 高 | Label 字号 / 初始文字 |
| --- | --- | --- | --- |
| Header | 0, 0 | 720 × 1280 | — |
| Header/GameTitle | 0, 560 | 660 × 64 | 44 / Desk Rescue |
| Header/LevelLabel | 0, 495 | 660 × 48 | 28 / Level 1 / 3 |
| Header/LevelTitleLabel | 0, 435 | 660 × 52 | 32 / Desktop Cleanup |
| Header/StatusLabel | 0, 350 | 660 × 76 | 26 / Put each device in the correct place |
| PlayArea | 0, 0 | 720 × 1000 | — |
| Target1、2、3 | -220,170；0,170；220,170 | 每个 180 × 140 | — |
| 每个 Target/Label | 0, 0 | 170 × 100 | 26 / 对应 Mouse Area、Keyboard Area、Headset Area |
| Item1、2、3 | -220,-300；0,-300；220,-300 | 每个 180 × 140 | — |
| 每个 Item/Label | 0, 0 | 170 × 100 | 34 / 对应 Mouse、Keyboard、Headset |
| CompletePanel | 0, -70 | 660 × 400 | — |
| CompletePanel/CompleteLabel | 0, 90 | 620 × 76 | 38 / ORDER COMPLETE |
| CompletePanel/CompleteDetailLabel | 0, 20 | 620 × 56 | 26 / All items are in place |
| CompletePanel/NextButton | 0, -90 | 300 × 88 | — |
| NextButton/Label | 0, 0 | 280 × 72 | 30 / Next Level |

Label 使用水平/垂直居中、Overflow **SHRINK**；目标、物品和说明文字可开启 Wrap，使用与相机背景有对比的字体颜色。纯文本即可；无需下载图片。目标节点排在物品节点前面，CompletePanel 排在 PlayArea 后面。

NextButton 使用编辑器默认 UI Button（保留 Button、UITransform 和默认 Sprite）。Transition 可设为 NONE，Inspector 的 **Click Events 留空**，不要再手工绑定 nextLevel：LevelManager 会注册/解除一个 CLICK 监听。

## 3. 挂载与引用

Canvas 挂 **GameController** 和 **LevelManager**，Item1/2/3 各挂 **DraggableItem**。不要把 LevelManager 挂在初始 inactive 的 CompletePanel。

GameController Inspector：

| Property | 对象 |
| --- | --- |
| Status Label | Header/StatusLabel 的 Label |
| Total Items | 3（运行时 beginLevel 也会设置） |

LevelManager Inspector：

| Property | 对象 |
| --- | --- |
| Game Controller | Canvas 的 GameController 组件 |
| Level Label | Header/LevelLabel 的 Label |
| Level Title Label | Header/LevelTitleLabel 的 Label |
| Items，长度 3 | 按顺序 Item1/2/3 的 DraggableItem 组件 |
| Item Labels，长度 3 | 按顺序 Item1/2/3/Label 的 Label |
| Targets，长度 3 | 按顺序 Target1/2/3 的 Node |
| Target Labels，长度 3 | 按顺序 Target1/2/3/Label 的 Label |
| Complete Panel | CompletePanel 的 Node |
| Complete Label | CompletePanel/CompleteLabel 的 Label |
| Complete Detail Label | CompletePanel/CompleteDetailLabel 的 Label |
| Next Button | CompletePanel/NextButton 的 Button 组件 |

DraggableItem 的 Target/GameController/Snap Distance 由 LevelManager.start/loadLevel 的 configure 设置，**不需要在 Inspector 再绑定**。保持 Enabled 和 Animations Enabled 开启。每关刷新起点、目标位置及文字，并清除已放置和动画状态。

## 4. 保存和实测

1. `Ctrl+S` 保存为 **assets/scenes/Game.scene**。场景、全部 `.meta` 和需要共享的 settings 一并纳入版本控制；不要提交 temp/library。
2. 点击 Preview，选竖屏；确认 Header 完整、目标在上、物品在下，改变 Preview 比例后仍可操作。
3. 拖起应轻微放大；放错应回弹、不计数；正确应吸附后才计数、锁定。完成三件后状态为 **Order Complete!**，面板弹出。
4. 第一、二关点击 **Next Level**。确认新名称、位置、半径变化，计数从 0 开始，三个物品都能操作。
5. 第三关完成后显示 **Day 2 Demo Complete** / **All 3 orders finished**，Next 隐藏；重复 Next 不会进入第四关。
6. 检查动画期间快速点击、多指干扰、TOUCH_CANCEL、组件禁用/重新启用、重启当前关卡，确认没有旧动画或重复计数。
7. 执行 `npm run check:cocos`。没有生成配置时它会明确失败，不能把 mock 通过视为 Creator 通过。

不需要 Scene 切换、Prefab、物理组件、网络或 SDK。`restartCurrentLevel()` 是代码接口，本阶段没有增加重开按钮。

官方核对：[场景](https://docs.cocos.com/creator/4.0/manual/en/asset/scene.html)、[Canvas](https://docs.cocos.com/creator/4.0/manual/en/ui-system/components/editor/canvas.html)、[Tween](https://docs.cocos.com/creator/4.0/manual/en/tween/tween-interface.html)、[Button](https://docs.cocos.com/creator/4.0/manual/en/ui-system/components/editor/button.html)。
