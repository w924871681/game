# DeskRescue / 桌面急救站 — V2.2 / 0.0.5-alpha.4

> 2026-10-16：用户已确认本版本作为可试玩视觉基线，并授权本次功能分支提交。最新授权、遗留美术债务及公开证据匿名化的新旧SHA关系见 [冻结基线记录](docs/DAY5A_V22_FROZEN_BASELINE.md)；下方Git限制是此前本地实施阶段的历史范围。

当前本地 V2.2 从未提交的 alpha.3 增量完成，仅修改清洁软尘的稳定羽化边缘和拥挤设备/线头的视觉子层。九张订单、十三个步骤、三种玩法及评分、输入判定保持。**水平清洁带仍可见，改善细微；美术终审待用户看真实原图决定。**

- [最新 Creator / Preview 验证报告](docs/DAY5A_PLUS_V22_CREATOR_VALIDATION.md)、[V2.2 收口记录及十组对比](docs/DAY5A_PLUS_V22_CLOSEOUT.md)、[当前 GPT 交接](docs/GPT_HANDOFF.md)。
- 实际224组通过（原207＋清洁8＋可读性9）；无Creator缓存的1060文件隔离副本同样224通过。真实SDK项目strict检查通过；安装SDK自身仍有102条历史诊断、exit1，未修改SDK或放宽检查。
- 真实Creator保存7项既有资源，第二遍新增节点0；最终保存审计2349/2349，真实引擎夹具53/53（原46＋新7）。见 [checks.json](docs/validation/day5a-plus/v22/checks.json)、[creator-audit.json](docs/validation/day5a-plus/v22/creator-audit.json)、[engine-probe.json](docs/validation/day5a-plus/v22/engine-probe.json)。
- 桌面鼠标Preview：390×844及1280×720各一轮9单13步、实际再次开始入口通过；768×1024只完成前5单。无物理触屏、手机WebView或微信/抖音平台结论。见 [实际覆盖和截图](docs/validation/day5a-plus/v22/preview-verification.json)。
- 历史源码、测试、图片、meta和用户ZIP由 [972文件基线保护报告](docs/validation/day5a-plus/v22/preservation.json) 逐项核验。完整工程用 `python tools/package_v22_delivery.py` 在 `D:/game-deliverables` 新建；实际ZIP大小、SHA、CRC及新目录解压结果以同名 `.delivery.json` 为准，包内有逐文件 `DELIVERY_MANIFEST.json`。

在 Cocos Creator **3.8.8** 打开 `assets/scenes/Game.scene`，从当前保存场景进入 Preview。不要用旧Day3/Day4装配菜单重建覆盖当前资源。工程保留720×1280 SHOW_ALL及薄荷留边；本轮不重做六页界面。

分支仍 `feature/day5a-visual-playable`，HEAD仍 `ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22`，成果均未提交。未执行Git add/commit/push/tag、发布或Day5B。后续先由用户看图决定是否冻结Day5A+，GitHub基线和Day5B须另行授权。

---

以下保留V2.1及更早历史记录；当前版本与结果以上方V2.2及其报告为准。

# DeskRescue / 桌面急救站 — V2.1 / 0.0.5-alpha.3

当前本地 V2.1 精修已实施并通过 Creator 3.8.8 真实保存和下述桌面验证。新增独立局部软尘、18张接头/接口与19张设备皮肤、四层线材和真实连接灯，增强拖拽/HUD/结算与首页/最终页比例；九单、十三步、三玩法与原评分/输入规则保留。**六屏美术终审待用户看图确认，水平长直擦仍可形成带状边界。**

- [最新Creator/Preview报告与边界](docs/DAY5A_PLUS_V21_CREATOR_VALIDATION.md)、[阶段变更与文件职责](docs/DAY5A_PLUS_V21_REFINEMENT.md)、[最新GPT交接](docs/GPT_HANDOFF.md)。
- 207组＝原174＋17清洁＋16视觉；全新无Creator temp副本同样207组通过。项目真实SDK strict/unused通过；安装SDK自身102条历史诊断仍独立失败，未修改SDK。
- 本轮保存资源审计1319/1319，真实引擎夹具46/46；Scene＋8核心Prefab UUID/meta、16个输入节点及祖先几何保持；全量装配第二遍新增节点0。
- 390×844两轮完整九单十三步；1280×720两轮完整且重玩/回首页/再开始通过；768×1024完成前五单、三玩法及结果。不是三尺寸均全九单；物理触屏、微信/抖音真机、FPS及独立听感未测。
- [六屏真实截图缩略总览](docs/validation/day5a-plus/v21/comparisons/final-six-screen-contact.png)、[首页比较](docs/validation/day5a-plus/v21/comparisons/final-home-v2-to-v21.png)、[清洁57%比较](docs/validation/day5a-plus/v21/comparisons/final-clean57-v2-to-v21.png)、[水平擦拭补充](docs/validation/day5a-plus/v21/comparisons/final-clean57-horizontal-v2-to-v21.png)、[接线1/3比较](docs/validation/day5a-plus/v21/comparisons/final-cable1-v2-to-v21.png)、[真实结算比较](docs/validation/day5a-plus/v21/comparisons/final-result-v2-to-v21.png)。
- 直接用Creator 3.8.8打开 `assets/scenes/Game.scene` 后Preview。V2.1增量菜单/快捷键：Ctrl+Alt+S样板、D精修、F全量、J导入、K审计、L引擎夹具。无需运行旧Day3/Day4重建。
- 最新完整包由 `tools/package_v21_delivery.py` 写到项目外 `D:/game-deliverables`；包内逐文件manifest，外部 `.delivery.json` 提供实际大小/SHA、CRC/每项hash/新目录解压校验。缓存由Creator重建；保留旧包。

基于alpha.2未提交工程原位增量实施，分支 `feature/day5a-visual-playable`，HEAD `ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22`，暂存区空。未执行add/commit/push/tag、发布或Day5B/5C。以下V2及Day5A说明保留历史，**当前结论以上方V2.1报告为准**。

---

# V2 历史说明 / 0.0.5-alpha.2

当前本地版本已完成V2六屏实施与真实Creator 3.8.8保存。九张订单、十三个步骤、三种玩法保留；新增工坊、同一维修员、纸签HUD、金按钮、不规则尘团、曲线线路、结果与最终总览，并接通最终返回首页后再次开始。素材、文案和按钮是独立可编辑节点，未用设计海报替代游戏。

- [本轮Creator/Preview验证与剩余问题](docs/DAY5A_PLUS_V2_CREATOR_VALIDATION.md)：174组行为、项目strict类型、1081项保存文件审计、36项真实引擎夹具；SDK自身102条诊断单列。
- [V2设计依据](docs/DESKRESCUE_V2_UI_DESIGN.md)、[场景映射与装配](docs/DAY5A_PLUS_V2_SCENE_MAPPING.md)、[素材及真实绑定](docs/DAY5A_PLUS_V2_ASSET_MANIFEST.md)、[变更记录](docs/DAY5A_PLUS_V2_CHANGELOG.md)。
- [六屏真实截图](docs/validation/day5a-plus/comparisons/six-screen-contact.png)、[7组同视口前后对比](docs/validation/day5a-plus/comparisons/README.md)、[交接文档](docs/GPT_HANDOFF.md)。
- 390×844完整九单；1280×720连续两轮及重玩/回首页/再开始；768×1024完成前五单与三玩法。不是三比例各自完整九单，亦未验证物理触屏或微信/抖音真机。
- 用Creator 3.8.8打开 assets/scenes/Game.scene 后Preview即可，通常无需重装配。需要时使用DeskRescue/V2；完整装配快捷键Ctrl+Alt+B。旧Day5A Apply受保护。
- 完整本地交付包由 tools/package_v2_delivery.py 生成到 D:/game-deliverables，含源码、完整资产/meta、Scene/Prefab、设置、测试、原创源稿和新旧证据，带逐文件SHA及新目录解压验证。缓存由Creator重新生成。

本轮未执行git add/commit/push/tag、发布或Day5B。当前分支feature/day5a-visual-playable，HEAD ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22。原Day5A未提交成果已备份并保护，以下保留其历史说明；**V2当前状态以上述本轮报告为准**。

---

# Day 5A 历史说明 / 0.0.5-alpha.1

Cocos Creator 3.8.8 · TypeScript 5.8.2 strict · 2D · 720 × 1280。

配置驱动的桌面维修小游戏：**9 张订单、13 个步骤、3 种微玩法**。Day 5A 加入可点击首页、十九种设备插画、对应目标剪影、线头与接口、三种清洁底图、原创音效和星形结算；原订单、坐标、评分与输入语义保留。

正式 Game.scene 和八个核心 Prefab 已通过真实 Creator 原位保存。首页等待时没有运行中的 Stage、计时为零；点击“开始维修”一次进入第一单。最终圆角皮肤已完成三比例鼠标 Preview，横屏完整九单十三步与重玩通过；实际覆盖和截图见验收文档。

## 从这里开始

- 用 **Creator 3.8.8** 打开本地项目，打开 assets/scenes/Game.scene 后 Preview。已有首页、引用和资源通常无需重新装配。
- [Day 5A 验收记录](docs/DAY5A_CREATOR_VALIDATION.md)：实际执行范围、截图、音频证据与未验证事项。
- [视觉规范](docs/DAY5A_VISUAL_STYLE_GUIDE.md)、[素材清单与复现](docs/DAY5A_VISUAL_ASSETS.md)：统一色板、原创源稿、可用 PNG/WAV。
- [Creator 装配与绑定](docs/DAY5A_COCOS_SETUP.md)：增量菜单、Inspector 引用与九切片设置。
- [GPT 交接](docs/GPT_HANDOFF.md)：架构、生命周期、Git 状态和后续范围。
- [Day 5A 变更清单](docs/DAY5A_CHANGELOG.md)、[逐文件 JSON](docs/validation/day5a/changed-files.json)：本轮实际修改/新增文件及受控提交范围。
- [Day 4 架构](docs/DAY4_ARCHITECTURE.md)：当前九单数据和三玩法架构的基础；其历史验收数不代表 Day 5A。

## 可试玩内容

首页显示原创维修桌、游戏标题、开始按钮与音效图标/开关。音效仅在当前 session 保存开关状态，重载恢复默认开启；首页打开不自动播音。开始按钮幂等，隐藏首页后由同一个 LevelManager 管理整轮订单。

维修区采用浅青远景、温暖桌面、工作垫和可辨认设备；拖拽目标显示同设备低饱和剪影。线缆保留 Graphics 动态走线，以接头造型、针脚、文字和原 CableStyle 六色辨认。污渍透明格淡去，露出键盘、鼠标或机箱底图；InputSurface 保持 **680×560**，不遮 Stats。

HUD、教学、按钮、结果卡使用原创九切片图，避免放大后拉伸圆角。结果仍显示真实用时、失误、得分和步骤；三颗星呈现已有评分。第 1～8 单按钮为“下一张订单”，第 9 单显示累计总结并可“重新挑战”。

| 章节 | 订单 | 步骤 |
| --- | --- | --- |
| 基础订单 | 1 桌面整理、2 线缆急救、3 维修订单 | 各一段拖拽 |
| 维护入门 | 4 键盘除尘、5 主机接线 | 清洁；接线 |
| 维护入门 | 6 鼠标保养 | 清洁 → 拖拽 |
| 综合维修 | 7 路由器布线 | 接线 |
| 综合维修 | 8 直播桌急救 | 拖拽 → 接线 |
| 综合维修 | 9 电脑综合维修 | 清洁 → 接线 → 拖拽 |

## 架构与规则

OrderCatalog 为只读递归冻结目录；LevelManager 编排订单、步骤、HUD、教学和结算，RunController 统一计时、失误与评分。StageHost 每种玩法最多缓存一份 Prefab 实例，同时仅当前 Stage active；各 Stage 的本地池复用设备、线缆和灰尘。

HomeController 通过 startFirstOrder() 开始。正式 Scene 的 autoStartOnSceneLoad=false，旧 fixture 的默认 true 保持历史兼容。VisualAssetRegistry 提供本地同步 SpriteFrame；ElementVisual/CleanDeviceVisual 只改变装饰，AudioFeedback/ResultStars 不控制玩法计数。

三星、二星同时检查时间与失误并包含边界。得分为 max(100, 1000 - floor(elapsedMs / 1000) × 10 - mistakes × 100)。多步骤计时连续；正确拖拽/接线在 0.15 秒吸附后计数，错误 END 只记一次并在 0.18 秒内回位，CANCEL 不计失误。清洁淡出为 0.08 秒，仍按原格子和阈值判定。

监听、自有 tween、ownership 和 generation 由各拥有者清理，旧回调不能污染新 Stage。教程在各玩法首次有效进度后隐藏，重玩保留已看状态；旧 LevelCatalog/LegacyLevelManager 仅服务历史回归。

## 验证状态

| 层次 | Day 5A 当前证据 |
| --- | --- |
| 行为回归 | **146/146** = 历史 114 + Day 5A 32；实际编译组件在有限 Cocos mock 中执行 |
| 类型契约 | 9 个预期负例诊断通过，单列，不计入行为组 |
| 真实项目类型 | Creator TypeScript **5.8.2** 与真实 SDK，strict/unused 检查通过 |
| SDK 自身声明 | **102** 条：jsb 18 + cc 84，单独报告；SDK 和生成类型配置未修改 |
| Node / Python 语法 | **14** 个 JavaScript 与 **2** 个 Python 文件通过 |
| Scene / 8 Prefab | [643/643](docs/validation/day5a/scene-audit.json)，9 核心 UUID 保持，重复装配新增节点为 0 |
| 真实引擎探针 | [18/18](docs/validation/day5a/engine-probe.json)，隔离真实引擎 fixture 与手动 dt；不是自然 Preview |
| 电脑完整试玩 | [最终圆角版 9 单/13 步与重玩](docs/validation/day5a/preview-final-skin.json)，真实鼠标输入与渲染 |
| 自然音频 | [七类 STARTED/ENDED](docs/validation/day5a/audio-final-skin.json)：按钮、错误、正确、清洁完成、步骤完成、订单结算、整轮完成 |
| 移动端 / 平台 | 原生触摸适配器、TOUCH_CANCEL、物理触屏、手机 WebView、微信/抖音未验证 |

最终圆角版结果为 **24/27 星、2 次失误、6250 分、259.2 秒**。用时包含工具操作与等待，不能作为玩家表现或 FPS 基准。390×844 完成订单 1～5、768×1024 完成首单及下一单、1280×720 完整九单十三步与重玩均通过；仅对这些实际范围作结论，未声称每个比例各跑九单。

自然音频记录来自实际 AudioSource 事件，不是播放请求或人工发射事件；没有独立听感评价或录音证明。清洁完成使用 clean_progress.wav 短 cue，未按每格播放。脏→净视觉见 dirty/half/nearly 截图；达标后自动进入结算，不能把被弹窗遮住的画面称作无遮挡干净底图。

## 素材与复现

新增 **49 PNG、49 SVG 源稿、7 WAV**。56 个运行素材合计 **908,479 字节**，覆盖十九种设备、九种接口的 head/port、三种清洁底图、首页和 UI。所有图形为原创程序化几何，声音为原创合成；未下载第三方商业素材或品牌 Logo。

生成器与完整造型位于 tools/art；PNG 与 SVG 由同一几何双输出。实际运行使用 PNG 导入的 SpriteFrame 和 WAV AudioClip，不直接使用 SVG。card/button 为 192×128，边界左右 32、上下 38，trimType=none。

```powershell
python tools/art/generate_day5a.py --phase full
```

生成器不写 Scene/Prefab/meta，不应在常规测试中暗中运行。Creator 通过 asset-db 导入并维护 UUID。具体逐文件来源、尺寸、哈希及许可范围见[素材文档](docs/DAY5A_VISUAL_ASSETS.md)。

## 复验与本地范围

```powershell
npm test
npm run check:cocos
node --check tools/verify-day5a.cjs
node tools/verify-day1.cjs --cocos-types --check-sdk-declarations
git status --short --branch
```

完整 SDK 自检因上述 102 条声明诊断退出非零；项目类型通过不代表 SDK 零诊断。缺少 Editor 生成的真实配置时，check:cocos 明确失败，不能用 mock 声明冒充 SDK。

当前分支 feature/day5a-visual-playable，Day 5A 修改尚未提交。起点为干净 main 的 [ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22](https://github.com/w924871681/game/commit/ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22)，当时 167 个已跟踪文件。用户授权本地 Day 5A 开发与验证，**没有授权本轮 commit/push 或发布**。

历史 Day 3/4 文档、报告和截图保留。不要用旧 Day 3/4 构造菜单覆盖新皮肤；后续资源修改使用 Day 5A 增量入口并重新验收。本轮没有开始 Day 5B/5C，也没有新增订单、经济、存档、账号、广告、支付、后端或平台 SDK。
