# V2.2 用户任务原文归档

本文件记录用户明确授权执行的原任务书；以下要求不等于实际验收结果，当前结论见V2.2验证报告。分隔线后保留原文件字节。

---

# DeskRescue /《桌面急救站》Day 5A+ V2.2 最终视觉收口——Codex 实施任务书

> **任务类型：有边界的增量修复，不是新一轮整体 UI 设计。**
>
> 目标目录：`D:\game`；目标开发环境：**Cocos Creator 3.8.8 / TypeScript strict / 720×1280 SHOW_ALL**。  
> 预计现有版本：`0.0.5-alpha.3`；完成后建议版本：`0.0.5-alpha.4`，但必须先核对本地实际状态。  
> **执行授权边界：**只有在用户将本任务书发送给 Codex 并明确要求执行后，才允许本地代码/装饰资源微调、真实 Creator 装配/保存、自动测试、Preview、文档和项目外安全交付包。  
> **即使授权执行，仍没有授权：**`git add/commit/push/tag`、新分支/切换分支、发布、平台 SDK、Day 5B / Day 5C、新订单、经济/存档/广告系统、网络下载素材。不得 `reset --hard`、`clean`、`stash`，或覆盖本地未提交成果。

## 0. 本任务为什么必须是最后一轮小范围收口

用户已经认可六页 V2 的整体 Q 版维修工坊风格，V2.1 的电脑端已达到中保真可试玩程度。此次**不追求逐像素复制高保真设计图**，只关闭实际截图指出的两处高价值问题：

1. **P0：清洁玩法长水平擦拭后，灰尘边界过于整齐、呈机械式带状。**斜/弧擦在 V2.1 已有进步，不能为了消除一条水平分界而破坏自然擦拭、计数、触摸或渲染性能。
2. **P1：390×844 手机上，订单 8 的四件物品、订单 9 的四根线缆/四个接口，以及部分其他多元素步骤的文字偏小、交叉线遮挡辨识。**

**P2 留作正式美术/平台阶段：**首页 Logo、结算人物的进一步精细化、上下/左右薄荷色补边的连续场景延展；不要在本轮改动这些区域。V2.1 目前的金色按钮、工坊角色、纸签 HUD、首页和两种结算都保留。

如果 P0 方案经过受控的一次实现与一次必要修正仍有轻微条带，必须如实留下“已知视觉差距”，不反复重写清洁引擎或新增重型渲染框架。用户最终看新旧原图决定是否接收该差距并进入 Day 5B。

## 1. 开始前只读核验及未提交成果保护

先阅读本机实际文件，不要仅凭文件名或这份任务书假设版本已经一致：

- `README.md`、`docs/GPT_HANDOFF.md`
- `docs/DAY5A_PLUS_V21_REFINEMENT.md`
- `docs/DAY5A_PLUS_V21_CREATOR_VALIDATION.md`
- `docs/validation/day5a-plus/v21/final-offline.json`
- `docs/validation/day5a-plus/v21/audit-current.json`
- `docs/validation/day5a-plus/v21/engine-probe.json`
- `docs/validation/day5a-plus/v21/comparisons/final-clean57-horizontal-v2-to-v21.png`
- `docs/validation/day5a-plus/v21/comparisons/final-clean57-v2-to-v21.png`
- `docs/validation/day5a-plus/v21/comparisons/final-cable1-v2-to-v21.png`
- `docs/validation/day5a-plus/v21/screenshots/`（按实际目录定位）
- `assets/scripts/stages/CleanSwipeStageController.ts`
- `assets/scripts/visuals/V21CleanDustView.ts`（若实际在其他目录，定位正确文件）
- `assets/scripts/visuals/ElementVisual.ts`、`assets/scripts/visuals/V2CableLine.ts`
- `assets/scripts/stages/DragMatchStageController.ts`、`CableConnectStageController.ts`
- `assets/scripts/stages/StageHost.ts`
- `assets/scripts/gameplay/DraggableItem.ts`、`CableConnector.ts`
- `assets/scripts/core/RunController.ts`、`LevelManager.ts`
- `assets/scripts/data/OrderCatalog.ts`、`StageDefinition.ts`
- Creator Editor 扩展 Day5A+/V2/V2.1 入口及现有 tests

在 `D:\game` 执行并保存真实输出：

```powershell
Set-Location D:\game
Get-Location
git status --short --branch
git rev-parse HEAD
git remote -v
node --version
npm test
npm run check:cocos
```

### 已知历史基线（不是跳过实测的理由）

- `feature/day5a-visual-playable`，公共 Day 4 HEAD 仍是 `ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22`，Day 5A/V2/V2.1 的变更此前全部保留在未提交工作区。
- V2.1 报告为 **207/207 行为测试、1319/1319 资源审计、46/46 引擎探针**。
- SDK 安装包自身存在已单列的 **102 条声明诊断**；项目的严格类型检查此前通过。不能用伪造临时声明或降低检查标准掩盖问题。
- 目前没有微信/抖音平台构建、物理触摸或手机 WebView 证据。

必须先对真实未提交文件、Game.scene、8 个核心 Prefab、脚本、资源及文档建立文件清单、大小、SHA-256。若需要备份，仅创建**项目外**独立备份（如 `D:\game-deliverables`），不覆盖过去任何 ZIP/报告，不让备份混入 Git 可见文件。

如果起始测试失败、存在新用户修改、Creator 场景与报告不符：定位原因、记录并保全；不要私自把项目回退到 Day 4 的公共 HEAD。

## 2. P0：最后一轮清洁视觉羽化修复

### 必须保护的逻辑

- 订单 4 仍为 **8×4=32 个不可见逻辑格，清洁至少 28 格完成**。
- 订单 6、9 的 clean 配置、区域位置、画笔大小、完成阈值保持不变。
- `START/MOVE` 路径扫掠、多指 ownership、`CANCEL` 保留已清洁结果、重复命中不重复计数、空白操作不计失误、`generation` 保护、Stage 缓存/池、旧 tween 清理、计时与评分 **不变**。
- 不显示内部方格、网格边框、绿色勾选格子。清洁进度由原真实逻辑计数生成，不由视觉尘点数量反算。
- 不修改 `OrderCatalog`、`RunController`、`DraggableItem`、`CableConnector` 的业务行为。

### 先诊断，再做最小改动

从已存在的 **192 个独立软尘 Sprite** 方案排查水平条带成因：尘团分布是否过于均匀、扫掠是否统一半径做二值清除、边缘 alpha 是否过硬、透明叠加是否形成直线、更新是否受逻辑行同步影响。把定位依据记录在 `docs/DAY5A_PLUS_V22_CLOSEOUT.md`，不能没有诊断就另起一套清洁系统。

**建议优先沿用现有节点数量与架构：**

- 在已被逻辑接受的笔迹附近，让尘粒视觉透明度按到扫掠轨迹的距离**柔和衰减**，而不是同一行齐刷刷地被清空；可采用分层不同尺寸、固定随机种子的微偏移、边缘多尺度 alpha、轻量小尘点和背景颗粒。
- 随机扰动必须按稳定 seed/粒子 ID 决定，**同一轨迹可复现、无逐帧闪烁**，且不得因重玩产生越积越多的新粒子。
- 对同一个灰尘 Sprite 的多次擦拭是可预测的单调减淡（不因局部回扫重新变脏），旧 tween/迟到回调不能影响新订单或新一轮。
- 更新触发以实际输入/已接受扫掠轨迹为主，避免无必要的全屏逐帧计算、每次 MOVE 新建对象/节点、大量图片读回。
- 一条笔直水平扫拭理应留下**一定宽度的清洁带**，无需把自然的擦拭轨迹本身视作错误；验收要消除的是“像按逻辑整行切除”的生硬、贯穿式直边。

不要引入复杂 Shader、RenderTexture 全屏读回或全新重型组件，除非有明确原因及本机实测，且不影响目前 3.8.8 的 Stage/输入兼容性。若轻量方案达不到目标，留证据说明，不伪造“完全无条带”。

### 真实 Preview 的必要画面

在 **390×844** 的真实 Creator Preview，以订单 4 的键盘为主进行至少三种自然输入试验：

1. **长水平擦拭**：记录 `0%`、约 `57%`（16/28）、约 `96%`（27/28）以及真实达到阈值后的结算。重点看边界是否羽化、是否保留少量不规则残尘，而非规则横带。
2. **斜线或弧线擦拭**：记录接近 57% 的真实状态，验证改动没有破坏上轮已改善的表现。
3. **局部回扫/反复擦拭**：同一片区域反复经过，验证视觉稳定、不会重新出现尘粒，逻辑进度不重复计数。

务必通过真实界面交互取得截图，不注入完成状态、篡改成绩、调试设置透明度后冒充游玩结果。若正常输入未恰好达到目标百分比，截图及报告标出**实际值**，不要改名字伪装成 57%/96%。

重复进入订单 4/6/9、重开、跳到后续 Stage、Play Again、Final→Home→Start 后，灰尘要正确重置，不被历史动画影响。检查装饰图层没有捕获或阻挡 `InputSurface` 的 Touch。

## 3. P1：390px 手机下四物品与多线缆标签可读性

### 首先检查的实际关卡

- **订单 8：直播桌急救**，4 件设备：麦克风、摄像头、补光灯、声卡；之后 2 根线。
- **订单 9：电脑综合维修**，四根线（主板电源、CPU 电源、SATA 线、风扇线），以及四部件（风扇、内存、硬盘、显卡）。
- **订单 5** 三线与 **订单 7** 三线，作为回归参考。

### 允许的修改

- 只调整视觉**子层**的图案有效尺寸、裁去透明留白、Label 的字体尺寸/行距/描边/字框、背景反差与对象标签之间的间距；先检查 390 原尺寸截图，再选最小必要改动。
- 对冗长的接口名称，必要时增加**仅用于显示的短名映射**，并用已有稳定的 stage/element ID 作为键；不改业务 ID、`OrderCatalog` 内的原始正式名称或判定映射。例如可用“CPU口”“主板口”“硬盘口”，但需核对对应线缆/端口并让玩家依然看得懂。
- 优先使用 720 设计尺寸下清晰的中文字号（例如 24～28 设计像素，按真实 Preview 结果调整）；必要时允许两行，禁止三四行挤成一团、文字裁切和标签重叠。
- 接线曲线始终在文字和可拖动线头的**视觉层以下**；成功灯反映真实成功状态，不能无条件提前亮起。`0/3` 不能出现固定成功线；`1/3` 恰有一根成功线；3/4 线交叉时仍应能找到正确端口。
- 保持正式六页 V2 的视觉体系：纸签 HUD、木质台面、青绿/奶油/金色按钮等不变。不要因为本轮小字修复重设计全局字体或布局。

### 绝对不许修改

- 所有 Head/Port/Item/Target 的**输入根节点**、父子关系、`UITransform` hitbox、位置、旋转、缩放、anchor、layer、目标吸附坐标、snapDistance。
- `CableConnector` / `DraggableItem` 的 Touch 输入与吸附回弹逻辑，以及多步骤连续计时。
- StageHost、ElementPool 的动态实例缓存与代际保护。

### 必要截图

390×844 自然 Preview 原图：

- `order8-four-items`（文字完整、四个操作物件都可辨认）
- `order9-four-cables-before`、`order9-three-cross`（真实端口标签与交叉线），必要时 `order9-four-items`
- `order5-0of3`、`order5-1of3`（颜色与固定状态正确）

可补充 768×1024、1280×720 检查是否出现过宽空白或剪裁。任何缩略拼图只能用于总览，判定小字请同时提供 390×844 的**原始像素 JPG/PNG**。

## 4. P2 明确不做：整屏背景和六页美术重新设计

目前 `SHOW_ALL` 和 Canvas 输入映射已经稳定：390×844 上下有薄荷补边、宽屏两侧有留边。此轮**不调整**设计分辨率、相机投影、Canvas 几何、相机层/输入映射、Web 适配 CSS。不要宣称“全屏背景已经彻底修复”。

目前已认可的首页、纸签、结算星级和双按钮全部保持。不要下载新字体/外部美术素材、增加商城/签到/金币/排行榜/广告/账号/关卡。

## 5. 代码与资源验收

### 必跑自动检查

```powershell
npm test
npm run check:cocos
node --check tools/verify-day1.cjs
node --check tools/verify-day4.cjs
node --check tools/verify-day5a.cjs
```

实际更多 JS/Python 检查以工程已有脚本为准，调用现有 V2.1 审计与探针，并记录结果（不要只重复历史数字）。

- **必须保留原 207 组行为测试**。新增测试数量以覆盖新视觉接口为准，不为了凑一个更大数字删除或弱化旧断言。
- 离线测试须在**隔离项目副本、无真实 Creator temp/library 配置**的条件下通过；不能删除用户本机的 `temp/`。
- `check:cocos` 必须使用真实 Creator SDK；不能用 `tools/test/cc.d.ts` 冒充真实类型。
- SDK 自身此前 102 条声明诊断，继续单独列出。如果数字变化记录实际变化，不伪称 SDK 无诊断。
- 验证新视觉组件的 reset、disable/enable、旧动画回调、重复擦拭、图片缺失、输入图层不拦截、对四物品/四线没有隐藏原标签或节点复用串图。
- 通过实际 Creator 的 Asset Database、Node/Component、Prefab/Scene 保存 API 保存变化；**禁止直接手写 Scene/Prefab/.meta JSON**。
- 在保存资源审计中比对 9 个核心资产 UUID、输入节点及祖先的真实 geometry、Inspector 引用和无孤儿 meta。V2.1 是 1319/1319；修改后以新审计真实检查数量和结果为准，不强迫结果仍等于 1319。
- 真实引擎 probe V2.1 为 46/46；本轮必须保留原夹具的通过项，并补充必要新的视觉断言；不要把模拟 Touch 称为浏览器自然 Touch/物理触摸。

### 自然 Preview 范围

- 390×844：必须覆盖清洁水平/斜线/回扫、订单 8 四物品、订单 9 四线与四部件，至少一次完整 9 单闭环（最终总结和重玩或返回首页）。
- 768×1024：首页、拖拽、订单 4 清洁、订单 5 接线、单单结算；不需要伪称九单整轮。
- 1280×720：至少一次完整 9 单，检查四物件/多线在宽屏的可视状态；记录结算与重玩入口。
- 如果当前环境无法使用 Creator 或真实 Preview，必须把相应条目标为**未执行**，只汇报实际通过部分，不得用 mock 替代。
- 保存失败/重导入错误与最后成功记录分别存档；不清空历史 Console 来伪造零错误。

## 6. 本轮正式产物和截图路径

本轮新建以下文件，**不要覆盖 V2/V2.1 原证据**：

```text
docs/DAY5A_PLUS_V22_CLOSEOUT.md
docs/DAY5A_PLUS_V22_CREATOR_VALIDATION.md
docs/validation/day5a-plus/v22/
  baseline.json
  checks.json
  preservation.json
  creator-audit.json
  engine-probe.json
  preview-verification.json
  screenshots/
  comparisons/
```

材料必须真实来自本轮执行，而非现在预写成功 JSON。截图至少包括：水平约 57%、斜向约 57%、局部回扫、96%、订单8四物品、订单9四线交叉，以及首页/结算的无意回归确认图。

报告清楚区分：

1. 新旧截图的输入路径和数据可能不同，不把自然图对比写成严格受控实验。
2. 内部清洁进度百分比不等于视觉灰尘精确消失比例；不允许改分数、阈值或计数制造美术成功。
3. 实际项目类型、行为测试、审计与 engine probe、自然 Preview、手机/平台未测是不同证据层。
4. 如果横向条带没有完全消除，要指出剩余可见范围，禁止直接宣布“视觉完美定稿”。

更新 `README.md` 和 `docs/GPT_HANDOFF.md` 的当前状态，保留历史，并视实际成功状态将 `package.json` 更新为 `0.0.5-alpha.4`；更新前后记录改动理由。不要自动提交 Git。

如需制作完整交付包，仅在项目外 `D:\game-deliverables` 创建**新名字** ZIP（不要覆盖已有 V2.1），包含必要源码、Scene、Prefab、meta、素材源稿、项目设置、Editor 扩展、测试、文档及验证证据。排除 `.git/`、`temp/`、`library/`、`profiles/`、`node_modules/`、`build/`、机密信息；实际做逐项 SHA/CRC/解压复核，不能仅声称已打包。

## 7. 最终汇报格式

完成后按以下顺序给出：

1. **实际本地版本/分支/HEAD、未提交状态**，说明没有自动 commit/push。
2. **P0 清洁**：根因、最小变更、同视口水平/斜线/回扫原图，是否仍有可见条带。
3. **P1 小屏可读性**：订单 8/9/5 的原始截图，显示文字、Sprite 与 hitbox 的区别以及映射的短名。
4. **保护**：历史代码/数据/Creator 核心 UUID/meta/input geometry 是否完整、哪些文件确实发生变化。
5. **实际测试表**：npm 行为、离线 mock、真实项目类型、SDK 自检、Scene/Prefab 审计、引擎夹具、Preview 比例覆盖。
6. **缺口**：若真实手机 Touch、平台、小屏运行和 FPS 没有执行，必须继续标注未验证。
7. **交付文件**：新报告、截图/对比及完整 ZIP 的真实保存路径、大小与摘要。
8. **下一步**：只提出“用户审阅 V2.2 原图 → 根据结果决定是否冻结 Day5A+ → 经单独授权再建立 GitHub 基线 → Day5B”，不自动开始新工作。

## 8. 完成条件与止损机制

可标记“V2.2 电脑端工程验收通过”的条件：

- 原207测试全部保留并通过，新增测试全部通过；真实项目类型、Scene/Prefab 资源完整性和相应引擎夹具通过；至少一轮 390×844 桌面 Preview（手机比例模拟视口）九单全流程与宽屏代表性测试通过。
- 清洁截图的内部网格不可见，水平擦拭边缘比 V2.1 更柔和；斜/弧与回扫没有退化或新增残留/闪烁问题；若仍残留轻微条带，明确展示让用户判定是否接受。
- 390×844 的四设备与多线缆中文标签可辨识，插头/接口不被文字遮挡，真实线缆计数与颜色/状态对应正确。
- 操作、计时、结果、重玩和回首页真实有效；UI 改动不改变输入命中框、坐标、逻辑成功判定、奖励/评分。

**美术终审只能由用户依据实际新截图确认。** 用户如果认可轻微剩余条带，也可以把该差距明确列为 Day7 的后续美术债务，结束 Day5A+；不要为追求“完全复刻海报”无限延期 Day5B。
