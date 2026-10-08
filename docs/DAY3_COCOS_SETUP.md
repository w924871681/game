# Day 3 Creator 场景装配与实测 — V0.0.3

**当前已由 Creator 3.8.8 完成场景装配和保存，并执行电脑端 Preview 验证。** Game.scene、.meta、真实类型配置和必要项目 settings 已生成；用户已确认采用本机可用的 3.8.8。本文件保留装配规范并用于复验现有场景，实际操作证据见 [DAY3_CREATOR_VALIDATION.md](DAY3_CREATOR_VALIDATION.md)。不要重新覆盖已保存场景。

[场景审计](validation/day3/scene-audit.json) 61/61项通过；[真实引擎 probe](validation/day3/engine-probe.json) 9/9项通过。probe 使用合成 cc.Touch/cc.EventTouch、独立真实 ActionManager 手动推进时间和显式 fixture 生命周期；不代表浏览器触摸命中、自然播放或物理触屏通过。独立 Preview 已完成鼠标操作、自然动画、三关与重玩，以及竖屏预设、平板3:4和横屏16:9布局检查；手机 WebView、浏览器触摸适配器和物理触屏仍未实测。

Day 2 的历史说明保留在 [DAY2_COCOS_SETUP.md](DAY2_COCOS_SETUP.md)。Day 3 正式场景新增 RunController、计时/失误 HUD、教学提示，并把最终操作按钮升级为“重新挑战”。

## 1. 打开项目与基础设置

1. 在 Cocos Dashboard 选择已安装的 **Creator 3.8.8**，打开 **D:\game**，等待脚本导入；项目声明已为3.8.8。
2. 打开现有 **assets/scenes/Game.scene**，先检查并复用保存的节点。以下创建步骤只供缺失节点时参考；不要重建已有正式场景。
3. 没有 Canvas 时，通过层级面板 **创建 → UI → Canvas** 创建，使用编辑器生成的默认 UI Camera；不要仅给普通节点挂 Canvas 然后遗漏相机。
4. 项目设计分辨率设为 **720 × 1280**，**Fit Width** 和 **Fit Height** 均开启。Canvas CameraComponent 绑定 UI Camera，AlignCanvasWithScreen 开启；相机 Visibility 包含 **UI_2D**。
5. UI 节点统一 UI_2D layer、Z = 0、scale = (1,1,1)、锚点 (0.5,0.5)。保留默认 Canvas 适配组件。当前正式场景不挂 Day1Prototype；它保留在代码中作为独立 A/B/C 回归入口。默认 Main Camera 和 Main Light 已设为 inactive，仅启用 Canvas/UI Camera。

## 2. 固定节点层次

只创建一次并保存到场景，切关和重玩复用这些实例。Item/Target 本身使用固定 UITransform；Label 放在子节点，避免文字改变命中区域。

```text
Game
└── Canvas                              [GameController, RunController, LevelManager]
    ├── UI Camera                       [编辑器生成]
    ├── Header                          [UITransform]
    │   ├── GameTitle                   [Label]
    │   ├── LevelLabel                  [Label]
    │   ├── LevelTitleLabel             [Label]
    │   ├── StatusLabel                 [Label]
    │   └── Stats                      [UITransform]
    │       ├── TimeLabel               [Label]
    │       └── MistakeLabel            [Label]
    ├── PlayArea                        [UITransform，无 Layout]
    │   ├── Target1                     [UITransform]
    │   │   └── Label                   [Label]
    │   ├── Target2                     [UITransform]
    │   │   └── Label                   [Label]
    │   ├── Target3                     [UITransform]
    │   │   └── Label                   [Label]
    │   ├── Item1                       [UITransform, DraggableItem]
    │   │   └── Label                   [Label]
    │   ├── Item2                       [UITransform, DraggableItem]
    │   │   └── Label                   [Label]
    │   └── Item3                       [UITransform, DraggableItem]
    │       └── Label                   [Label]
    ├── TutorialHint                    [UITransform]
    │   └── TutorialLabel               [Label]
    └── CompletePanel                   [UITransform，初始 inactive]
        ├── CompleteLabel               [Label]
        ├── CompleteDetailLabel         [Label]
        └── NextButton                  [默认 UI Button]
            └── Label                  [Label，作为 Action Button Label]
```

Canvas 挂 **GameController、RunController、LevelManager**。三个 Item 各挂 **DraggableItem**，保持 Enabled / Animations Enabled 开启。LevelManager 不应挂在初始 inactive 的 CompletePanel。

目标节点排在物品前面；CompletePanel 排在 PlayArea 和 TutorialHint 后面。当前十个背景已在 Editor 修正并保存：内置白色 SpriteFrame **b730527c-3233-41c2-aaf7-7cdab58f9749@f9941**，Type **SLICED**，自定义尺寸。面板使用不透明色块盖住后方物品；不使用旧57520716…默认图标背景，不需要联网素材。

## 3. 布局和中文初始文字

坐标相对于各自父节点。Header、Stats、PlayArea 的位置均为 (0,0)，因此 Stats 子节点 Y = 285 对应画布中心上方 285。

| 节点 | X, Y | 宽 × 高 | 字号 / 初始文字 |
| --- | --- | --- | --- |
| Header | 0, 0 | 720 × 1280 | — |
| Header/GameTitle | 0, 560 | 660 × 64 | 44 / 桌面急救站 |
| Header/LevelLabel | 0, 495 | 660 × 48 | 28 / 订单 1 / 3 |
| Header/LevelTitleLabel | 0, 435 | 660 × 52 | 32 / 桌面整理 |
| Header/StatusLabel | 0, 350 | 660 × 76 | 26 / 把设备拖到对应区域 |
| Header/Stats | 0, 0 | 720 × 640 | — |
| Stats/TimeLabel | -170, 285 | 300 × 44 | 24 / 用时：0.0 秒 |
| Stats/MistakeLabel | 170, 285 | 300 × 44 | 24 / 失误：0 |
| PlayArea | 0, 0 | 720 × 1000 | — |
| Target1、2、3 | -220,170；0,170；220,170 | 每个 180 × 140 | — |
| 每个 Target/Label | 0, 0 | 170 × 100 | 26 / 鼠标区域、键盘区域、耳机区域 |
| Item1、2、3 | -220,-300；0,-300；220,-300 | 每个 180 × 140 | — |
| 每个 Item/Label | 0, 0 | 170 × 100 | 34 / 鼠标、键盘、耳机 |
| TutorialHint | 0, -40 | 600 × 70 | — |
| TutorialHint/TutorialLabel | 0, 0 | 580 × 60 | 26 / 拖动物品到对应区域 |
| CompletePanel | 0, -40 | 660 × 520 | — |
| CompletePanel/CompleteLabel | 0, 180 | 620 × 64 | 38 / 订单完成 |
| CompletePanel/CompleteDetailLabel | 0, 20 | 600 × 260 | 26 / 初始可为空 |
| CompletePanel/NextButton | 0, -190 | 300 × 88 | — |
| NextButton/Label | 0, 0 | 280 × 72 | 30 / 下一张订单 |

Label 使用水平/垂直居中及 **Overflow SHRINK**，说明、物品/目标和结果文字可开启 **Wrap**。CompleteDetailLabel 必须允许换行，建议 Line Height = 40，容纳四行单关和五行整轮结果；使用能显示中文和 ★/☆ 的系统字体并在 Preview 核对。文字与背景保持可辨对比。

不要给 PlayArea 添加自动 Layout，否则它可能覆盖 LevelCatalog 配置的位置。教程提示由 LevelManager 控制 Active；CompletePanel 初始 Active 关闭。

NextButton 从 **创建 → UI → Button** 创建，保留默认 Button、UITransform 和内置 Sprite，Transition 可设 NONE。Inspector **Click Events 必须为空**；代码已注册唯一 CLICK 分发，不要再手工绑定 nextLevel/playAgain。内部属性名仍叫 nextButton，最终会显示“重新挑战”，不得隐藏最终按钮。

## 4. Inspector 精确绑定

GameController：

| Property | 对象 |
| --- | --- |
| Status Label | Header/StatusLabel 的 Label |
| Total Items | 3 |

RunController（新增）：

| Property | 对象 |
| --- | --- |
| Time Label | Header/Stats/TimeLabel 的 Label |
| Mistake Label | Header/Stats/MistakeLabel 的 Label |

LevelManager：

| Property | 对象 |
| --- | --- |
| Game Controller | Canvas 的 GameController |
| Run Controller（新增） | Canvas 的 RunController |
| Level Label | Header/LevelLabel 的 Label |
| Level Title Label | Header/LevelTitleLabel 的 Label |
| Items，长度 3 | 按顺序 Item1/2/3 的 DraggableItem |
| Item Labels，长度 3 | 按顺序 Item1/2/3/Label 的 Label |
| Targets，长度 3 | 按顺序 Target1/2/3 的 Node |
| Target Labels，长度 3 | 按顺序 Target1/2/3/Label 的 Label |
| Complete Panel | CompletePanel 的 Node |
| Complete Label | CompletePanel/CompleteLabel 的 Label |
| Complete Detail Label | CompletePanel/CompleteDetailLabel 的 Label |
| Next Button | CompletePanel/NextButton 的 Button |
| Action Button Label（新增） | CompletePanel/NextButton/Label 的 Label |
| Tutorial Hint（新增） | TutorialHint 的 Node |

DraggableItem 的 Target、GameController、Snap Distance 由 loadLevel/configure 更新，无需在 Inspector 重复绑定。上述四组三元素数组必须按 1–3 对齐，各物品/目标不得重复引用。

## 5. 保存、复验与验证边界

1. 当前 **assets/scenes/Game.scene** 已由 Editor 保存，`.meta`、必要 settings 和 temp/tsconfig.cocos.json 已实际生成。后续修改继续通过 Editor 保存并重新审计；不要手写场景/meta/temp，不提交 temp/library/构建产物。
2. 运行 `npm run check:cocos`，项目使用 Editor 自带 TypeScript 5.8.2 和真实 SDK 的 strict/unused 检查已通过。SDK 自身102条声明语义诊断被单独报告并排除出项目检查，skipLibCheck仍为false；`node tools/verify-day1.cjs --cocos-types --check-sdk-declarations` 保留失败通道。缺少真实配置仍退出1，不能替换成测试用cc.d.ts。
3. Preview 验证订单 1 的全中文 Header/HUD；时间每帧递增，显示一位小数；错误释放立即增加一次失误，回弹结束不再增加。
4. 靠近和远离目标时测试 TOUCH_CANCEL、外来手指、禁用/重启取消：不得记录失误。吸附期间快速点击不能重复计数。
5. 首次提示在第一次真正吸附计数后隐藏；错误和取消不隐藏，后续订单与重新挑战不再次显示；重载场景可重新显示。
6. 前两关完成后核对四行单关结果、星级和得分。完成面板期间时间停止，点击“下一张订单”后本关时间/失误归零，上一关结果保留。
7. 第三关结束后核对五行整轮总结，最终按钮可见、可交互、文字为“重新挑战”。点击后回订单 1，所有累计指标归零、物品复位且可操作；第二次快速点击无效。
8. 调用 restartCurrentLevel 检查进行中重置，以及已完成当前关撤销结果后重做；前置订单结果不得丢失或重复。
9. 禁用/重新启用 LevelManager：Playing 暂停/恢复时间和输入，完成态不得恢复。销毁、切关或重玩后旧 tween 不得影响新状态。
10. 已检查390×844竖屏预设（viewport420×900）、768×1024平板实际3:4画布和1280×720新Preview实际16:9画布，Header、物品、结果和按钮可用，截图位于docs/validation/day3。用户只有电脑，当前先完成真实引擎模拟触摸；浏览器原生触摸适配器、手机WebView和物理触屏另行记录，不能用鼠标或合成事件代替。

本次实际Preview三关整轮为3/3、35.7秒、0失误、8/9星、2660分；重玩显示0.2秒/0失误，物品复位且教程不再显示，warning/error日志为空。平板第二关另实测USB错误放置一次并回弹，得到23.0秒/1失误/2星/680分。具体单关读数及截图见实测记录。

58组mock行为测试、9组真实引擎probe、61项保存场景审计与Preview分别支持不同结论，不能互相代替。当前Day3电脑端场景与游玩验证已完成；下一步仅补充尚未覆盖的浏览器触摸/物理设备验证，不自动开始Day4，不自动提交或发布。
