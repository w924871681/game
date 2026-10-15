# DeskRescue V2.2：最终视觉收口记录

本轮只处理 **P0 水平清洁的生硬条带**和 **P1 390×844 桌面 Preview 中多设备、多线缆文字可读性**。保护已认可的六页维修工坊、纸签 HUD、首页、两种结算、金色按钮、人物和 SHOW_ALL 适配；不扩展玩法或重新设计界面。美术终审由用户依据本轮原图决定。

当前本地版本为 `0.0.5-alpha.4`。本轮行为/隔离测试、真实 Creator 保存审计与引擎探针已执行通过；390×844和1280×720各完成九单十三步及实际再次开始入口，768×1024完成前五单的规定范围。最终保护审计已实跑 **2166/2166**；完整工程ZIP在本文冻结后由强制CRC/SHA/全新目录解压检查的工具产出，实际大小与SHA以外部回执为准，避免在包内形成递归自哈希。最终执行明细以 [V2.2 Creator 验证报告](DAY5A_PLUS_V22_CREATOR_VALIDATION.md) 为准。

## 开工基线与授权范围

实际起点为 `D:\game` 的 `0.0.5-alpha.3` 未提交工程。分支 `feature/day5a-visual-playable`，HEAD `ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22`。2026-10-15T15:09:10Z 的 [baseline.json](validation/day5a-plus/v22/baseline.json) 捕获 **972 个文件、830 条 Git 状态**（25个已跟踪修改、805个未跟踪文件），暂存区为空。

基线 SHA-256：`44bc4f1a1d76c6a1978b6a9c4d421bf229b3aa36e7861087c7096c1a7c3002b0`。项目外独立备份 `D:/game-deliverables/V22_before_20261015T150850498865Z.zip`，57,263,875字节，SHA-256 `8c9d6337844b4b52fce375c1f530dce70e2181ac88b10e181154ee5258e5b327`；基线记录的 CRC 与逐项哈希/大小复核通过。现有 V2.1 交付后多出的两个用户 ZIP 一并纳入972文件保护，没有删除或覆盖。

开工真实 `npm test` 为原 **207组通过**，`npm run check:cocos` 退出0；安装 SDK 自身102条历史声明诊断继续单列，不改变 `strict`、`skipLibCheck` 或用户 `temp/`。原输出分别保存为 [baseline-tests.log](validation/day5a-plus/v22/baseline-tests.log)、[baseline-cocos-types.log](validation/day5a-plus/v22/baseline-cocos-types.log)。

用户授权本地源代码、必要装饰配置、真实 Creator 保存、测试、Preview、文档及新项目外 ZIP；未授权 Git add/commit/push/tag、分支切换、发布、平台 SDK、Day5B/5C、经济/广告/存档等新系统。本轮不运行 reset、clean、stash。

## P0：条带成因与最小修复

已逐张读取 V2.1 390×844 原图，而非只看缩略拼图：[水平57%](validation/day5a-plus/v21/screenshots/clean-order4-horizontal57-v21-390x844.jpg)、[斜/弧57%](validation/day5a-plus/v21/screenshots/clean-order4-about57pct-v21-390x844.jpg)、[局部回扫57%](validation/day5a-plus/v21/screenshots/clean-local-repeat-v21-390x844.jpg)、[96%](validation/day5a-plus/v21/screenshots/clean-order4-about96pct-v21-390x844.jpg)。水平图下部清空区有较整齐的贯穿边缘，斜/弧残尘已较自然。

V2.1 已把可见灰尘从逻辑格移到192个独立软尘 Sprite。位置不对齐逻辑行列，控制器只在接受 START/MOVE 后通知路径，逻辑 cell Tween 不控制可见 Sprite。因此本轮没有把根因重新归为“逻辑整行同步删除”。剩余问题来自 **每粒 Sprite 整体 alpha 取决于中心距离，且共用画笔半径和接近的窄羽化区**：同一水平轨迹附近的多粒尘团在相近距离发生透明度转折，叠加后仍像直带。

仅修改 [V21CleanDustView.ts](../assets/scripts/visuals/V21CleanDustView.ts) 中已有视图，不改变192节点、原位置/尺寸/基础 alpha、纹理、父层级或控制器接口。配置时按 stage seed 和粒子ID计算两个稳定标量，扫掠时沿用一次 smoothstep：

```text
m = min(width, height)
edgeShift = (noise(index, seed + 89) - 0.5) * m * 0.56
featherScale = 0.9 + noise(index, seed + 107) * 0.9
feather = max(18, m * featherScale)
inner = max(0, radius + edgeShift - feather * 0.5)
outer = radius + edgeShift + feather * 0.5
t = clamp((distance - inner) / (outer - inner), 0, 1)
alpha = min(previousAlpha, round(baseAlpha * t*t*(3 - 2*t)))
```

旧羽化宽约14–31设计像素；新宽度随原尺寸和稳定ID变化，扩大局部部分透明区，并把边界微移到 `±0.28*m` 以内。相同路径重复或反向幂等，不会越擦越脏；不同路径只单调减淡。随机量只在 configure 计算，MOVE 不创建节点、Color、数组或 Tween，没有每帧全屏处理、新 shader、RenderTexture 或读回。

保留订单4的32逻辑格/28达标、订单6的20/17、订单9的35/32，以及画笔、ownership、CANCEL、generation、缓存、计时和评分。**内部57%是16/28；96%是27/28，并非灰尘像素或质量的消失比例。** 数值夹具的83个部分透明粒子对照旧公式31个，只证明羽化拓宽，不代表自然输入得到57%或手机渲染通过。更细诊断见 [P0记录](validation/day5a-plus/v22/p0-clean-diagnosis.md)。

整体 Sprite alpha 架构仍会形成有宽度的自然擦拭带；本轮目标是柔化“整行切除”式硬边。只做此次受控实现，必要时最多一次修正；最终若仍有轻微条带，必须原图展示，不宣布视觉完美。

## P1：小屏诊断、短名与子层参数

已读取原始390×844图片：订单8四设备、订单9四部件与0/4、3/4接线、订单5的0/3和1/3、订单7的0/3。原 caption 为24设计像素，390视口约13屏幕像素；目标文字压在半透明槽位/设备底边，连接成功后 Head 与 Port 同坐标还会让两条 caption 重叠。V2.1曲线已在所有输入与文字下层，本轮 **V2CableLine.ts 不改**。

[ElementVisual.ts](../assets/scripts/visuals/ElementVisual.ts) 新增序列化选项 `smallScreenLegibility=false`。只有它与既有 `refinedLayout` 同时启用，才改变线缆及宽140设计像素的拥挤元素子层。默认关闭路径与 alpha.3 保持一致，2/3物品宽180的布局不变。

| 子层 | V2.2 参数 | 与输入根的关系 |
| --- | --- | --- |
| 四物品 Icon | 保留原裁边图片、比例和有效尺寸；中心y由12到20 | 只移动 Sprite 子节点；Item/Target仍140×110 |
| 四物品 Caption | font28、lineHeight32、框高34；原y=`-height/2+12` | 原 Label 引用和节点保留，文字不压在图案上 |
| Cable Head/Port Icon | 最大高56、中心y=-10，保持源宽高比 | 只调整 Sprite 子节点；Head/Port仍130×80 |
| Head Caption | font28、lineHeight32、框122×32、中心y36 | 图案上方；订单9首行文字顶约264屏幕像素，避开既有HUD |
| Port Caption | font28、lineHeight32、框122×34、中心y=-58 | 图案下方；与已吸附Head Caption分离，末行文字底约593像素 |
| Caption对比 | 深色字 `(30,54,64,255)`；Creator保存奶油 `#FFF5DB` 描边2 | Label子层装饰，无Button或BlockInputEvents |

可见图案/文字可以位于原命中框的局部边缘之外；这**不代表命中框扩大或挪位**。输入根及祖先的父子关系、UITransform尺寸/anchor、position/rotation/scale/layer、吸附坐标与距离保持冻结；本轮真实保存审计已核对16个输入节点及祖先的几何与绑定，实际引擎夹具另外验证行为。

显示短名只通过已有 VisualCatalog 稳定key映射，不改 `OrderCatalog` 正式名称、业务ID或判定关系：

| 稳定视觉key | 显示短名 |
| --- | --- |
| `devices/microphone,camera,light,soundcard` | 麦克风、摄像头、补光灯、声卡；槽位与物品同短名 |
| `devices/fan,memory,drive,gpu` | 风扇、内存、硬盘、显卡；槽位与物品同短名 |
| `ports/motherboard-head / -port` | 主板线 / 主板口 |
| `ports/cpu-head / -port` | CPU线 / CPU口 |
| `ports/sata-head / -port` | 硬盘线 / 硬盘口 |
| `ports/fan-head / -port` | 风扇线 / 风扇口 |
| `ports/power-head / -port` | 电源线 / 电源口 |
| `ports/display-head / -port` | 显示线 / 显示口 |
| `ports/usb-port` | USB口 |

共享 `ports/network-*` 图片不能区分 WAN/LAN 业务语义，故保留原“入户网线”“电脑网线”“WAN 口”“LAN 口”。未映射key保留原文字，仅沿用既有“接口→口”显示规则。没有隐藏Caption来规避重叠，也没有给线缆提前点亮成功灯。

## 历史保护与测试分层

原五份Day4/Day5A/V2/V2.1测试文件冻结，runner仅追加两份独立suite；原207组总数增加独立断言，不能删除或放宽旧断言。P1的9组新增测试实际执行生产组件与四物品/四线控制器，验证0→3→4真实事件计数、同坐标文字分离、输入根/祖先、网络语义、旧Tween复用、缺图/引用失败、禁用恢复。

当前 [p1-tests.log](validation/day5a-plus/v22/p1-tests.log) 及 [命令/SHA快照](validation/day5a-plus/v22/p1-tests.json) 记录 `npm test` 退出0，**224组＝原207＋P0新增8＋P1新增9**；最终 [checks.json](validation/day5a-plus/v22/checks.json) 再次实际执行224组通过。1060文件的隔离副本不含真实Creator temp/library配置，独立TS5.8.2执行224通过，用户原temp前后SHA未变。31份JS和16份Python语法检查全部通过；真实项目strict检查退出0，安装SDK自检仍退出1、102条安装包声明诊断，不能把记录这项失败称为SDK通过。这些证据与自然Preview、物理触摸分层记录。

新增 [v22-audit.js](../extensions/deskrescue-editor/v22-audit.js) 重跑原V2.1全部合同，仅把alpha.3版本断言显式保留在raw历史结果中，用严格alpha.4版本断言替代。它还核对固定972文件ZIP、954个不可改基线文件、9核心UUID/meta、16输入节点/祖先以及全部172场景节点的语义。实际Creator保存后 [creator-audit.json](validation/day5a-plus/v22/creator-audit.json) 为 **2349/2349**；raw历史为1318/1319，唯一不符是旧alpha.3版本断言，不隐去或谎报旧版本检查通过。[engine-probe.json](validation/day5a-plus/v22/engine-probe.json) 实际 **53/53**，重跑原46并新增7项视觉夹具；模拟cc.Touch及离屏视觉API不冒充浏览器自然输入或物理触屏。

Game.scene的首页、HUD、Result、Canvas、相机和装饰结构均冻结；规范化只去除原生序列化身份，并允许inactive LegacyDay3的ElementVisual出现新增属性默认false，不能放宽其他业务对象。V2.1源码工具、证据、原图/用户ZIP和所有原素材保持原字节。没有新增美术图片或下载字体。

## 已生成的原图对比及视觉结论

10组 [比较清单](validation/day5a-plus/v22/comparisons/comparison-manifest.json) 使用已人工读图的390×844新旧原图：两幅完整视口以1:1放入840×1046 PNG，所有标签、说明和边框在原图矩形之外。生成后重新打开PNG，逐矩形验证与解码源RGB完全相同；当时152份原图前后SHA零变化。没有重绘、裁切、缩放、改分数或进度。

| 对比 | V2.2原图与实际状态 | 新旧对比 |
| --- | --- | --- |
| 长水平 | [57%，16/28](validation/day5a-plus/v22/screenshots/clean-horizontal57-v22-390x844.jpg) | [完整像素对比](validation/day5a-plus/v22/comparisons/clean-horizontal57-v21-to-v22.png) |
| 斜/弧路径 | [57%，16/28](validation/day5a-plus/v22/screenshots/clean-diagonal57-v22-390x844.jpg) | [完整像素对比](validation/day5a-plus/v22/comparisons/clean-diagonal57-v21-to-v22.png) |
| 斜/弧后局部回扫 | [仍57%](validation/day5a-plus/v22/screenshots/clean-diagonal-local-repeat57-v22-390x844.jpg) | [完整像素对比](validation/day5a-plus/v22/comparisons/clean-local-repeat-v21-to-v22.png) |
| 接近阈值 | [96%，27/28](validation/day5a-plus/v22/screenshots/clean-horizontal96-v22-390x844.jpg) | [完整像素对比](validation/day5a-plus/v22/comparisons/clean96-v21-to-v22.png) |
| 订单8四设备 | [0/4](validation/day5a-plus/v22/screenshots/order8-four-items-v22-390x844.jpg) | [完整像素对比](validation/day5a-plus/v22/comparisons/order8-four-items-v21-to-v22.png) |
| 订单9三线交叉 | [真实3/4，风扇未接](validation/day5a-plus/v22/screenshots/order9-three-cross-v22-390x844.jpg) | [完整像素对比](validation/day5a-plus/v22/comparisons/order9-three-cross-v21-to-v22.png) |
| 订单9接线前 | [0/4](validation/day5a-plus/v22/screenshots/order9-four-cables-before-v22-390x844.jpg) | [完整像素对比](validation/day5a-plus/v22/comparisons/order9-four-cables-before-v21-to-v22.png) |
| 订单9四部件 | [0/4](validation/day5a-plus/v22/screenshots/order9-four-items-v22-390x844.jpg) | [完整像素对比](validation/day5a-plus/v22/comparisons/order9-four-items-v21-to-v22.png) |
| 订单5接线前 | [0/3](validation/day5a-plus/v22/screenshots/order5-0of3-v22-390x844.jpg) | [完整像素对比](validation/day5a-plus/v22/comparisons/order5-0of3-v21-to-v22.png) |
| 订单5显示线成功 | [1/3](validation/day5a-plus/v22/screenshots/order5-1of3-v22-390x844.jpg) | [完整像素对比](validation/day5a-plus/v22/comparisons/order5-1of3-v21-to-v22.png) |

原尺寸读图结论：**水平带状轮廓仍可见，边缘改善细微；无内部网格或新增硬切线，不称完全消除。** 斜/弧后的残尘保持局部，未见新闪烁/网格。水平和斜向各自回扫前后，键盘ROI `(57,350,333,490)` 的解码RGB逐像素差异为空，逻辑进度均保持57%；ROI不含计时行，这不是全视口完全相同或FPS证据。本轮依止损要求停止继续调参，剩余带状感交由用户看原图决定是否接收。

P1中四设备/四部件文字更清晰、与图案分离；四线3/4画面可同时读到CPU线/CPU口、主板线/主板口、硬盘线/硬盘口，风扇线仍在左侧且风扇口未亮。订单5的0/3没有预置成功线；1/3恰有蓝色显示线和对应成功灯。画线仍处于文字/可拖线头之下。文字外围奶油描边增强深底对比，不代表正式美术终审或真实手机可读性测试完成。

横57新旧都为长水平输入；斜57走相同四段斜/弧路线，但自然采样、停留时间仍不同；96%的V2.1路径为斜/弧加点擦，V2.2为水平加点擦，残尘位置不能直接归因于算法优劣。局部回扫对比选用两版斜/弧后的原图，另保留 [V2.2水平回扫原图](validation/day5a-plus/v22/screenshots/clean-local-repeat57-v22-390x844.jpg)，不冒充完全受控输入实验。

## 实际验证范围与尚待收尾项

| 验证层 | 当前状态 | 正式证据 |
| --- | --- | --- |
| 原207＋新增17行为 | 实际224通过，原207保留 | `v22/checks.json`及`final-tests.log` |
| 独立无Creator temp/library副本 | 1060文件独立复制，TS5.8.2实际224通过，用户temp未变 | `v22/final-offline.json` |
| 最终真实Creator项目strict / SDK自检 | 项目退出0；SDK安装包自检退出1、102条诊断单列；JS31/Python16语法通过 | `v22/checks.json` |
| 真实保存Scene/Prefab审计 | 实际2349/2349；2026-10-15T16:28:06.309Z最终只读重跑仍通过；核心9UUID/meta、16输入祖先及P2语义保护通过 | `v22/creator-audit.json` |
| 真实引擎夹具 | 实际53/53，原46保留＋新增7 | `v22/engine-probe.json` |
| 390×844自然输入 | 全9单/13步，4210分/17星/613.0秒/0失误；Final→Home→Start成功；第二轮订单4完成斜/弧与局部回扫57 | `v22/preview-verification.json`及原图 |
| 768×1024 | 仅前5单，覆盖首页/拖拽/O4清洁57/单单结算/O5 0→1→3；O5实得810分/19.9秒/0失误 | 同上；不声称完整9单 |
| 1280×720 | 新一轮全9单/13步，7820分/27星/123.5秒/0失误；重新挑战后真实订单1、步骤1/1、0/3、0失误 | [最终总结原图](validation/day5a-plus/v22/screenshots/final-v22-1280x720.jpg)、[重玩原图](validation/day5a-plus/v22/screenshots/replay-start-v22-1280x720.jpg) |
| 当前代码/历史文件保护 | 实际2166/2166；972基线中957字节不变、15项允许修改、0删除；954冻结文件、483历史证据、9核心资源和16输入祖先保护通过 | [preservation.json](validation/day5a-plus/v22/preservation.json) |
| 完整项目外ZIP | 冻结本文后新建；打包工具仅在CRC、逐项SHA/大小、全新目录解压及打包前后源码一致性全部通过后产出正式ZIP和回执，不覆盖旧包 | `D:/game-deliverables/DeskRescue_V22_0.0.5-alpha.4_20261015.zip`及同名`.delivery.json`（UTC日期命名） |

宽屏此前因会话中断只完成前三单，明确作为partial保留；恢复后重新开始的一轮，前三单以文件名包含`resumed`的原图记录，之后衔接完整9单链。原partial截图不能拼作前后不中断的一轮。重玩原图显示自然计时11.2秒，证明进度/失误重置及入口有效，不称瞬时零秒截图。390与宽屏总时长包含不同截屏、工具等待和观察停留，不作为玩法速度、性能或评分优劣基准。宽屏另记录O8四物品、O9四缆0/4、3/4交叉和四部件可视状态，当前页面warn/error保留日志为0，不清空历史Creator Console来推断历史无失败。

所有自然截图须保留失败、超时、错名和吸附未完成的原图，通过旁注更正，不改像素、改进度或迟延结算。新旧图的自然计时、输入轨迹和部分计数可能不同，不能作为相同输入的严格受控对照或速度基准。比较工具只在原图外加标签，390×844全像素保留；原图与哈希仍是判定依据。

结束时已撤销临时viewport覆盖、重新载入并目视确认默认1280×720首页，保存 [最终首页原图](validation/day5a-plus/v22/screenshots/home-default-v22.jpg)，Preview标签保留供查看。本轮63张原图、连同历史共175张图的清单刷新未改变任何源图；十组对比生成时的152图保护快照也保留。

真实手机Touch、手机WebView、微信/抖音平台、独立音频听感和FPS尚无本轮验证结论。用户后续流程为：**审阅V2.2原图 → 决定是否冻结Day5A+及接受明确剩余美术差距 → 单独授权GitHub基线 → Day5B**。本轮不自动开始后续工作。
