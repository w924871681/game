# DeskRescue V2 场景与设计坐标映射（已保存实现）

更新日期：2026-10-15（Asia/Shanghai）。依据当前 [v2-scene.js](../extensions/deskrescue-editor/v2-scene.js)、Day5A 原场景/数据和[统一规范归档](DESKRESCUE_V2_UI_DESIGN.md)。**Creator已实际导入、绑定与保存，完整装配重复新增0；本轮保存文件审计1081/1081、真实引擎探针36/36。** 三比例覆盖及边界见[本轮验证](DAY5A_PLUS_V2_CREATOR_VALIDATION.md)，不能引用旧Day5A成绩代替。

## 坐标约定与保护范围

设计表使用720×1280左上原点，向右/下为正；Cocos UITransform通常以中心锚点、本地坐标表示。当前基线 StageHost 本地位置为(0,0)，在设计画布的中心为 **(360,640)**，不是参考图假定的(360,755)。参考图的玩法区不能直接照抄后再移动输入根去迁就图稿。

在基线无额外旋转/缩放的路径上，Stage本地点映射为：设计X=360+localX，设计Y=640-localY。v2-scene.js的at()并不直接依赖该简式，而是先将设计框中心转换到Canvas世界坐标，再通过目标父节点UITransform转换回本地坐标。这样保留已有父层级变换，避免把左上坐标当作Node.position。

九个核心资产的UUID、StageHost/Stage/元素输入根的父层级、位置、旋转、缩放、anchor、layer、UITransform与判定数据均应保留。新背景、纸签、图标、灰尘外观与线路只放在展示层或输入节点的装饰子节点。Creator再序列化可能改变内部fileId，需另查旧targetOverrides依赖，不能把内部fileId与资产UUID混为一谈。

| 位置 | 原本地值 / 尺寸 | 实际设计画布映射或保护要求 |
| --- | --- | --- |
| Canvas | 720×1280，保留已有Canvas/UI Camera/Fit引用 | 中心(360,640)，不改Touch换算 |
| StageHost | local(0,0) | 中心(360,640)，不移到参考的Y755 |
| 订单1三目标 | X=-220/0/220，Y=170 | 中心(140/360/580,470)，180×140，上边400 |
| 订单1三物品 | X=-220/0/220，Y=-300 | 中心(140/360/580,940)，180×140 |
| 四列目标 | X=-240/-80/80/240，Y=150 | 中心(120/280/440/600,490)，140×110 |
| 四列物品 | 同上X，Y=-230 | 中心(120/280/440/600,870)，140×110 |
| 订单9最高线头/接口 | 本地Y=240，130×80 | 中心Y400，输入上边360 |
| Clean InputSurface | 680×560，中心本地(0,0) | 框(20,360,680,560)，不缩小、不能盖统计 |
| 键盘有效区域 | 本地(0,0)，520×260 | 框(100,510,520,260)，内部32格不可直接画成方阵 |
| 鼠标有效区域 | 本地(0,20)，300×260 | 框(210,490,300,260)，内部20格 |
| 机箱有效区域 | 本地(0,20)，460×340 | 框(130,450,460,340)，内部35格 |

以上是逻辑设计坐标；浏览器像素还要乘实际Canvas缩放并加Canvas rect偏移。桌面Preview的clientWidth/clientHeight、rect、填边与截图时间需要实际采集，本稿不虚构这些数值。

## HUD 让位于既有输入区

原规范的订单纸Y207/H170、统计Y397/H62会与当前最高输入框冲突。当前装配代码将纸签改为 **(38,164,644,132)**，统计改为 **(52,304,282,48)** 和 **(386,304,282,48)**，底边352，在最高输入上边360之前留8个设计像素；核心输入不随之移动。

| 节点（Canvas/Header下） | 设计框x,y,w,h | 字号 / 内容 |
| --- | --- | --- |
| V2PaperHUD/BrandPlaque | 32,112,205,40 | 小牌匾，品牌文字24 |
| OrderPaper | 38,164,644,132 | 奶油纸、九切片 |
| OrderNumber / Chapter | 95,174,245,24 / 350,174,260,24 | 22，动态订单序号/目录总数与章节 |
| TaskTitle | 80,200,560,43 | 40，订单标题；不再把订单+阶段标题拼成一长行 |
| Instruction | 74,244,572,26 | 22，当前stage.instruction |
| Step / Progress | 105,271,230,23 / 360,271,255,23 | 20/21，动态步骤及拖拽/接线n/N |
| TimeCapsule / MistakeCapsule | 52,304,282,48 / 386,304,282,48 | 独立统计胶囊 |
| ElapsedValue / MistakeValue | 66,309,254,34 / 400,309,254,34 | 24，仍由原RunController直接更新 |

普通标签单行、不换行，采用SHRINK作为长标题兜底；真实390×844的字号可读性和长中文仍需Preview确认，不能只根据逻辑字号宣称无挤压。旧多行StatusLabel、旧标题/步骤/统计节点隐藏但保留兼容引用和代码输出，原146组fixture不被改成另一套文案规则。

PaperOrderHUD绑定chapter/order/title/step/instruction/progress等独立Label。showStage读取真实OrderDefinition、orderIndex、orders.length和stageIndex；showProgress读取真实StageProgress。拖拽显示“已归位n/N”，连线显示“已连接n/N”。清洁时纸签progressLabel隐藏，只在底部cleanPercentLabel显示百分比，不能再显示三个圆点或第二条清洁百分比。

## 工坊与三种玩法展示层

| 目标节点 | 当前代码设计框x,y,w,h | 作用与输入边界 |
| --- | --- | --- |
| Canvas/V2RoomBackdrop | -67,0,854,1280 | 独立小屋背景图层，不监听输入 |
| V2Workbench/Timber | 20,363,680,777 | 暖木工作台，位于Stage输入后面 |
| DragDecor/PlacementMat | 36,390,648,365 | 目标承托绿垫，不移动目标根 |
| DragDecor/PlacementTitlePlate | 220,372,280,48 | 非交互放置区小牌 |
| CableDecor/CableTitlePlate | 230,532,260,48 | 非交互接线标题，端口仍按真实配置 |
| CleanDecor/CleaningMat | 36,390,648,510 | 清洁绿垫 |
| CleanDecor/ClothCue | 540,797,120,120 | 蓝布/手套静态提示，不是新擦布玩法或跟手输入 |
| CleanDecor/CleanProgressPaper | 113,922,494,76 | InputSurface底边920之后，承载唯一清洁条 |
| CleanPercentLabel | 140,931,440,27 | 动态清洁进度，25号 |
| CleanTrack | 150,968,420,12 | Fill左中锚点，仅改展示宽度 |
| TutorialHint/V2HintPaper | 135,1161,535,62 | 原session首次教学气泡 |
| TutorialHint/V2TutorAvatar | 22,1120,104,112 | 同一角色master裁切的导师头像 |

DragItem/DragTarget/Port及Cable/Head保留原输入根；ElementVisual连接V2Surface、V2Highlight、V2SlotOutline等子装饰。两个、三个、四个元素仍由原目录与池决定，不用海报坐标替换配置。

V2CableLine读取原CableConnector的anchor/head世界坐标和原Graphics颜色，另用三层Graphics绘制柔和曲线（宽15阴影、11主线、3高光）。原Connector继续维护动态端点、坐标转换、ownership和吸附；旧Graphics仅禁用渲染，不替换它的业务引用。线路不能预画成三条已连接而进度仍1/3。

V2DirtAppearance只把DirtCell中的V2SoftDust子图设为格子尺寸的1.6倍，并按既有格子位置确定性翻转/微偏移；逻辑格的位置和尺寸不变。贴图为不规则透明尘团、外观重叠；这些结构条件不等于已经看不到棋盘接缝，0/57/96%必须用真实Preview检查。键盘16/28=57%、27/28=96%、28/28=100%达标，仍不等于实际擦过32/32格。

## 首页与六页落位

首页目标遵循规范的大Logo/工坊/角色/金色按钮；物品仍为单独Sprite，不将整页参考海报贴成游戏。标题、按钮、音效和所有实时文字保持可编辑。

| 页面 | 主要设计落位 | 状态与数据 |
| --- | --- | --- |
| 01 Home | Logo150,205,420,150；欢迎条110,372,500,44；角色358,555,240,300；前景台50,780,620,185；开始112,1030,496,92 | HomeController开始幂等，Stage未开始、RunController不计时 |
| 02 Drag | 公共纸签/胶囊+目标绿垫；源/目标原坐标 | 2/3/4动态元素、真实吸附后计数 |
| 03 Cable | 公共骨架+真实曲线、固定座与接口 | 0/3未连；1/3只一根接好；完成立即结算 |
| 04 Clean | 既有设备底图+不规则灰尘+底部唯一进度 | 原32/20/35格与28/17/32阈值，不新增擦布判定 |
| 05 Order Result | 奶油卡60,220,600,760；三Sprite星426；大分数160,570,400,78；双统计卡Y675；下一单110,880,500,92 | 仅LevelResult真值；旧文本星评隐藏，不重复评级 |
| 06 Final Summary | 奖杯218,135,284,230；横幅98,350,524,95；总卡58,495,604,325；重玩中心Y1076；返回首页195,1140,330,62 | 六项累计值动态，隐藏单关三满星；两个真实按钮 |

CompletePanel沿用原位置和动画；当前装配将common NextButton的orderButtonY设为 **-266**、finalButtonY设为 **-416**，与保留的结果父节点变换一起计算落位，不能只用640-Y擅改根。按钮背景、文字在V2ButtonVisual子根下，ButtonPressFeedback只缩放子根，不改Button命中尺寸。

音效容器设计框为(596,108,100,88)，可见纸面88×68。保留真实开/关图标与session状态；普通游戏中可用，结算时位于遮罩下。首页与终局不增加假商城/金币/广告入口。

## 遮罩、渲染与回首页

Canvas/V2ModalShade为独立720×1280 sibling，颜色#1F595E99（约60%），仅它增加BlockInputEvents。预期顺序为普通背景/HUD/Stage/音效 < V2ModalShade < CompletePanel。遮罩不能放在会被原0.8→1.08→1结果Tween缩放的CompletePanel下，否则可能在动画时露出可穿透边缘。

V2ResultView挂在CompletePanel本身，showOrder/showRun激活shade，hide/onDisable/onDestroy停用它并停止所属装饰。OrderResultGroup与FinalSummaryGroup互斥，返回首页按钮只属于终局组。共同NextButton仍由LevelManager唯一CLICK监听管理，V2视图只改变它的UI落位。

HomeController的homeButton调用公开returnToHome()，后者调用LevelManager.returnHomeFromFinal()；该业务API只接受DemoComplete，递增generation、停用并resetAll缓存、清空结果/时间/失误、隐藏结算、暂停RunController、重置initialized门禁，再由showHome()显示原HomeOverlay。音效session设置与已看教程集合保持；playAgain()仍直接开第一单，不闪首页。动画、foreign/重复输入及旧回调需用新自动测试和真实浏览器分别验证。

WorkshopDecoration只有一条有限、自有的入场/小幅浮动Tween，没有游戏计数回调；切页、回家、disable/destroy会停止并还原装饰变换。

## 适配与实际核对

V2ViewportTheme在Web GameCanvas存在时设置非交互背景#C3ECE0，并用ResizeObserver计算CSS clipPath以露出不透明WebGL补边背后的主题色；不改Canvas bounds、Fit策略、DPR或触摸坐标。三比例Canvas rect、截图和边缘像素已分别核对，不代表微信/抖音平台结果。Creator Preview运行中改变视口曾保留旧frame宽度，各最终比例使用重载后验证。

已执行15PNG真实导入、原Scene/八Prefab保存、UUID/输入保护、引用与重复装配检查。独立shade和Next高于结果组已审计与点击验证。390完整一轮、1280连续两轮及双终局入口通过；768完成1～5单与三种玩法，不宣称该比例完整九单。灰尘用透明重叠尘团显示，内部32格/28格阈值保留；按整行擦除仍有横向分区，属于视觉近似。

已有场景通常无需再装配。V2快捷键：Ctrl+Alt+A为A样板，Ctrl+Alt+B为完整V2，Ctrl+Alt+I重新导入脚本，Ctrl+Alt+U审计，Ctrl+Alt+P真实引擎夹具。旧Day5A Apply已加入V2保护。
