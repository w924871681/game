# DeskRescue《桌面急救站》— Day 5B 六张新订单完整设计规范（V1）

**文档性质**：六单产品/操作/场景设计基准；供 Codex 开发使用。**不是**对已实现功能的声明。  
**已确认内容**：用户已认可订单 10—15 的六张单页高保真效果参考图，认可“可玩性优先、不能只是重复拖拽/接线/清洁”的方向。  
**实施基线**：GitHub 公共仓库 `https://github.com/w924871681/game`，**冻结功能分支** `feature/day5a-visual-playable`，commit `63b5e55567546ebcd341d7af65ce4a5bbfec1c43`，游戏 `0.0.5-alpha.4` / Creator `3.8.8` / TypeScript `5.8.2`。  
**建议新开发版本**：`0.0.5-alpha.5`（Day 5B 样板版，仅作为候选版本号，实际版本须由开发报告确认）。  
**本地工程**：`<PROJECT_ROOT>`，以该目录在 Codex 开始时的实际状态为准，先检查工作区。

---

## A. 产品目标与范围

### A1. Day 5B 成功是什么

在保留原有 **9 单、13 步、3 种微玩法**和 V2.2 六页视觉基线的基础上，新增订单 **10—15**，共 **6 单、14 步、5 种新的、真正不同的触摸玩法**：

1. 故障定位 `fault-spot`（观察异样、点出异常部位）
2. 环形旋转 `rotary-control`（指针校准或连续旋松螺丝）
3. 轨迹引导 `guided-trace`（沿轨道经过检查点，不是线头配插口）
4. 仪表调节 `gauge-tune`（滑块调参、显示连续响应、维持安全状态）
5. 顺序测试 `sequence-test`（按明确提示点按功能键，不是反应速度考试）

**最终内容规模**：15 张订单、27 个步骤、8 种 Stage kind、整轮最高 45 星。第 15 单是本阶段综合小高潮。

“真实新玩法”的判据是 **操作手势和规则本身改变**，不能用旧三种 Stage 换文字、换图片来宣称新增玩法。每种新 kind 至少在两个订单中复用，不写只服务单关的专有控制器。

### A2. 保留和暂缓

- 保留 V2.2 的首页、木质工作台、奶油色订单纸签、统计胶囊、Q 版小修理工、金黄按钮、单单结算、最终奖杯和「重新挑战 / 返回首页」。
- 不修改订单 1—9 的 ID、key、顺序、动作判定、评分阈值、素材 UUID、Stage 几何；不重做 V2.2 清洁可视化。
- 不引入新的商店、金币、签到、广告、体力、强制失败倒计时、登录、后端、平台 SDK、存档或 Day 5C 内容。
- 六张已认可的渲染图是**视觉参考**，不是可交互背景，也不是现有工程资产：不可把整张图片直接铺成游戏界面，更不能把图片中的数字、假按钮、错误状态硬编码。

### A3. 六张参考图的权威性和偏差

| 文件 | 对应订单 | 确认重点 |
| --- | --- | --- |
| `references/order10_controller.png` | 10 手柄摇杆漂移 | 大手柄、环形校准、准星指针 |
| `references/order11_printer.png` | 11 打印机卡纸救援 | 立体打印机、纸张、3 个引导点 |
| `references/order12_keyboard.png` | 12 键盘连击故障 | 大键盘、`SS` 对比、异常键高亮 |
| `references/order13_fan.png` | 13 散热风扇异响 | 风扇主视觉、两张实时仪表卡 |
| `references/order14_headset.png` | 14 耳机左右声道失衡 | L/R 耳罩、可视声波、两个滑块 |
| `references/order15_livestream.png` | 15 直播间紧急救场 | 直播冻结预览、走线槽、3 个引导环 |

**必须纠正参考图里的示意值**：

- 参考图使用「剩余时间 01:28」：真实游戏 **延续累计正向计时**，统一显示「用时：xx.x 秒」，**不**凭空加入倒计时/超时失败。
- 参考图使用「已犯错误 0/3」：真实游戏显示「失误：0 次」，**没有** 3 次生命或失败上限。
- 第 11 单沿轨迹拖动时，离轨只反馈和恢复到最近检查点；不以纸张断裂造成强制失败。
- 第 13、14、15 单图中的绿色区、曲线和文字只是目标状态示意；实际读数与提示由当前配置和交互实时计算，绝不可预烘焙成“已经成功”。
- 若参考图的维修员人物与 V2.2 现有角色造型不完全一致，以**现有 Q 版维修员的角色身份和品牌风格**为准，不能突然在不同关卡更换主角。
- 新界面应是原生 Cocos 2D UI、Prefab、Sprite、Graphics、Label 和真实输入节点。精度不要求逐像素重建插画里的 3D 光照，但**主体设备必须清晰可辨、交互目标必须真实响应**。

---

## B. 公共 HUD、布局和状态约束

### B1. 设计画布与坐标系统

- 设计画布 `720×1280`，当前 Creator 使用 `SHOW_ALL`；StageHost 按已冻结设计边界 **Stage 局部坐标 x∈[-360,360]、y∈[-400,400]**。
- 图纸测量使用**屏幕左上角为 (0,0)**；Cocos 的局部节点坐标常用锚点中心/不同 Y 方向。Codex 必须根据现有 Scene/StageHost 实际变换算位置，不能将海报像素直接写成节点 `.position`。
- 原纸签、计时/失误、底部小修理工与音效开关继续复用。新 Stage 的输入热点只在中央 StageHost 可操作区域内，不侵入 HUD、系统顶部安全区或结算按钮。
- 画面背景、台灯、螺丝、贴纸、角色与浮层均为装饰，**不参与 Touch 命中或阻止事件**。
- 输入热点在 720 设计宽度下尽量不小于 **88×88**，对旋转环、滑块拖柄建议 100—130；不能因为角色插画变大而改旧 Stage 根命中区。
- 在 390×844 手机模拟视口里，关键内容需自然缩放仍清楚；768×1024 和 1280×720 验证布局。真实平台安全区和物理触屏仍留待后续。

### B2. 统一页眉和步骤显示

主纸签保持：

```text
进阶维修                      订单 10 / 15
手柄摇杆漂移
步骤 1 / 2 · 旋转校准环，让摇杆回正
● ─ ○
```

阶段进度反映 **当前新 Stage 的真实进度**；不要用参考图里固定的两个/三个圆点掩盖不同步骤数。

各 Stage HUD progress 文案：

| kind | 示例 |
| --- | --- |
| `fault-spot` | `故障定位 0 / 1` → `1 / 1` |
| `rotary-control` align | `校准进度 0 / 1` → `1 / 1` |
| `rotary-control` unscrew | `已旋松 0 / 2` → `1 / 2` → `2 / 2` |
| `guided-trace` | `检查点 0 / 3` → `3 / 3` |
| `gauge-tune` | `安全指标 0 / 2` → `2 / 2`；双绿后仍需稳定保持 |
| `sequence-test` | `功能检测 0 / 4` → `4 / 4` |

原 `RunController` 的**累计用时、失误和得分**是唯一来源；开发者不得另造一套倒计时/生命/奖励数值。Step 完成才自动切下一步；最后一个 Step 完成才做一次订单结算，单单计时跨 Stage 连续。

### B3. 公平性和可玩性统一标准

- 失败必须可理解：故障定位需有肉眼可见异常；旋钮要明确绿色带；路径必须一直显示；滑块安全带明确；序列测试始终提示当前按钮。
- **Touch CANCEL / 外来 touch ID / 多次 END / 拖动途中的意外松手不算失误**，且必须能重新操作。
- 仅对“玩家明确选错故障位置”“明确按错测试按钮”记录一次有效失误；路径轻微离轨、旋钮常规微调、滑块试调不扣分。明确展示错误原因，避免多次扣分。
- 视觉误导禁止：未成功时不能显示已经全部连好/已经清洁好/全绿状态。Stage 回调只在规则达成时触发；成功后禁止重复上报。
- 高速或低帧率触摸移动、父节点变换、按钮的连点必须有处理，不以只跑 mock 表示手机已通过。
- Cocos Component 的 `update(deltaTime)` 可用于稳定计时和局部动画，不用 `Date.now()`/`setTimeout()` 承担 gameplay 判定。
- 增加轻量、非阻塞提示，不用大段剧情遮盖操作台；关掉音效仍要能玩全部六单。

---

## C. 五种新 Stage：完整操作合同

### C1. `fault-spot`｜故障定位

**输入**：点按 2—6 个肉眼可辨候选部件（耳机为 L/R 两侧，打印机 3 处，键盘 6 键）。每次有效点击由同一个 touch ID 的 START+END（允许 ≤12 设计像素小移动）构成；超出视为取消这次 tap，不是错误。

**配置**：候选 `id`、中文短名、位置/点击区域、异常候选 `faultyId`、可见线索 `clueText` 和视觉 cue；单一故障点不随机化。

**可见线索**：11 纸张明显皱于出纸端；12 `S` 键在固定演示中双闪且输出 `SS`；14 R 声道波形比 L 明显低且带 `L/R` 文字。不能只靠颜色微差、听觉或一闪而过的信息。

**进度**：有效发现前 `0/1`，发现后 `1/1`，短暂正确高亮后单次 onComplete。

**错误策略**：每个不同错误候选**首次明确点击**计一次失误，同一个错误候选后续点击只显示提示不再次扣分；短时间误触和 CANCEL 不计分；正确点选不计失误。

**完成表现**：正确部位外发绿色描边/圈定，小修理工用 0.3—0.5 秒非交互动画提示“找到问题了”，然后下一步。**不可将故障直接修好作为本 Stage 的永久结果而跳过后续操作。**

### C2. `rotary-control`｜校准或旋松

**两种模式共用一套 Controller / Prefab，不要写两个类：**

- `align` 校准：半径约 125、可触区域为环周 ±35 设计像素，初始偏角例如 +55°，目标为 0°±12°。玩家抓住圆环沿弧线移动，必须实际改变角度；确认释放时指针仍在绿区后开始 **0.6 秒稳定计时**，持续在安全区便完成。再次拖出区域或禁用时稳定计时归零；移动到绿区但 CANCEL 不直接完成。绿色区可有短字 `对准绿色刻度`，不暗藏目标角度。
- `unscrew` 旋螺丝：两枚大螺丝，顺着明显方向箭头 **各累计有效旋转 270°**；增量通过 `atan2` 展开角差、过滤中心抖动、避免 359°→0° 假跳转。完成的螺丝锁定并轻微抬起；顺时针或逆时针由配置明确说明，不能用单击代替旋转。

**取消与恢复**：CANCEL 不扣错，取消后保留已经真实旋出的角度，但不由迟到回调完成；重开 Stage 所有螺丝归零；仅按当前 Stage 的 generation 允许完成。

**反馈**：刻度走向绿色、旋钮发光或螺丝升起、护盖打开；输入过程中不能突然改变控制点的父坐标造成失控。

### C3. `guided-trace`｜轨迹引导

**输入**：按住可见手柄（纸张边缘或线束端）沿清晰轨道移动。必须依次经过 **3 个检查点**（不是任意一个起点到终点拖放）；宽度/容差建议 48 设计像素、检查点触发半径 48—56，均放配置。

**路径示意（Stage 局部坐标，开发前须验证 Parent / hitbox）**：

- 打印机抽纸：起点 `(-180,150)` → CP1 `(-135,60)` → CP2 `(-15,-40)` → CP3 `(155,-150)`；纸的锚点随路径变化，最终纸张抽出。
- 直播走线槽：起点 `(-265,-185)` → CP1 `(-160,-70)` → CP2 `(15,45)` → CP3 `(230,160)`；引导环逐个点亮，红色禁止区只作为路线障碍和可恢复的警示。

**严谨判定**：检查点有顺序，必须先满足 CPi 才可推进 CPi+1；一次 TELEPORT/单次 START+END 跨过全线不能完成。需检查实际移动沿当前线段的近距连续轨迹，允许合理快扫但不接受直跳终点；每一段都给予可见进度。

**偏离策略**：超过容差时，停在**最近已经经过的检查点**，给轻微晃动/红色线提示；不丢掉已通过的检查点，不计失误、不强制整单失败。CANCEL 暂停操作并保留检查点，可重新抓取。

**特征区分**：这是对**完整轨迹**的操作与检查点引导，绝非旧 `cable-connect` 的线头—端口正确配对。

### C4. `gauge-tune`｜仪表调节

**输入**：最多两个大滑块，值范围 0—100 的连续、可控调节；伴随设备状态、波形或预览屏实时更新。滑块独立 ownership，单指连续调整，CANCEL 不扣错。

**三种 config mode，共享 Controller：**

1. `fan` 风扇散热：控件 `fanSpeed`/`ductOpening`；实时显示 `temperatureIndex = round(96 - .45*fanSpeed - .25*ductOpening)` 与 `noiseIndex = round(20 + .45*fanSpeed - .10*ductOpening)`；成功区 **temperatureIndex∈[40,55] 且 noiseIndex∈[30,48]**。推荐可达验证点 `(65,70)` → `(49,42)`；默认 `(90,20)` 不能成功。
2. `stereo` 声道：控件 `leftVolume`/`rightVolume`；成功条件 **abs(L-R)≤8 且 mean(L,R)∈[45,75]**。防止两条滑块全部拉到 0 的伪解；默认 `(85,20)` 不成功，`(60,58)` 可成功。UI 波形和目标带同步展示，即使关闭音效也可玩。
3. `broadcast` 直播：控件 `videoStability`/`audioLevel`；成功条件 `videoStability∈[65,85]`、`audioLevel∈[50,75]`；默认 `(20,25)` 不成功，`(75,65)` 可成功。UI 使用预览屏清晰度/音量灯条表达，与耳机的左右声道表现有视觉差异。

**稳定判定**：两个指标都有效且指针释放后 **0.7 秒**无输入变化，才允许 onComplete；任意滑块变化中断稳定计时并重新开始。由帧 `deltaTime` 驱动，不用系统时钟。正常滑动或超出安全区不增加失误。

**可玩性保护**：两个滑块不能重叠于小屏，必须用实时数字/图形/颜色三种方式至少其中两种表达；每个 mode 都有确定可达的成功例并在纯函数单元测试中验证。

### C5. `sequence-test`｜设备功能序列

**输入**：当前目标一直以大字/高亮显示，玩家在 4 个足够大的按钮中点击；一按一提示，不做纯记忆考试、速度倒计时或长按猜测。

**可配置序列**：
- 手柄 `↑ → ← → ↓ → →`，四个方向；
- 键盘 `S → A → D → 空格`，展示相应字符灯和键帽回弹；
- 直播 `输入 → 同步 → 检查 → 开播`，四个功能键。

**进度**：每次正确增加 1，`0/4` 到 `4/4`；错误确定为一次有效 Tap 才触发 onMistake，重复 END / CANCEL 不重复；错误后保留已完成步骤，不重新从头。

**反馈**：正确按键下沉/亮一枚指示灯，错误短抖并标明“当前应按 X”。最后四灯全绿，触发 onComplete 一次。

---

## D. 订单 10—15：逐单舞台设计与流程

### D1. 订单 10：手柄摇杆漂移｜难度 ★★☆☆☆

**订单 ID** `10`；建议 key `controller-drift`；章节 `进阶维修`；新 Stage 共 2。

**客户留言**：“我明明没碰手柄，游戏角色却一直自己往右走！”

| Stage id | kind / mode | 设备构图与具体操作 | 成功反馈 |
| --- | --- | --- | --- |
| `controller-align` | `rotary-control / align` | 超大手柄置中，左摇杆偏右；半径125校准环围在左摇杆外、绿色扇形中心区域；初始 +55°，转到0°±12°并在松手后稳定0.6秒 | 准星归中、摇杆停止抖动，校准环亮绿 |
| `controller-input-test` | `sequence-test` | 同一只手柄，方向十字键四个可点击按钮；屏幕始终显示“请按 ↑/←/↓/→” | 四盏测试灯依次亮起，最后手柄测试通过 |

**进度**：阶段 1 的 `0/1`，阶段 2 的 `0/4`；**错误**只来自错误功能按键；旋钮微调不扣分。  
**结算动画**：维修员举起手柄，十字准星稳居中，“手柄终于听话啦！”  
**设计星级初稿**：三星 `≤28s / 0错`；二星 `≤55s / ≤2错`。

### D2. 订单 11：打印机卡纸救援｜难度 ★★★☆☆

**ID** `11`；key `printer-paper-jam`；章节 `进阶维修`；3 Stage。

**客户留言**：“纸卡在里面了，千万别扯破！”

| Stage id | kind / mode | 构图和行为 | 成功反馈 |
| --- | --- | --- | --- |
| `printer-find-jam` | `fault-spot` | 大打印机，三个可点观察窗：进纸口、滚轮区、出纸口；出纸口纸张明显皱起/警示，选中它 | 红色卡纸点被圈定，画面放大纸张 |
| `printer-extract-paper` | `guided-trace` | 纸张拉出手柄沿 S 形**导纸轨道**依次通过 3 个亮圈；错误偏离停最近检查点 | 纸页完整抽出，褶皱消退，不显示“撕破”失败 |
| `printer-align-roller` | `rotary-control / align` | 大滚轮旁的校准环由 +55° 旋到0°±12°并稳定0.6s | 滚轮平稳转动，吐出笑脸测试纸 |

**错误**：点错观察窗每个错误候选最多计1，抽纸偏离和调整角度不扣分。  
**结算动画**：一张测试纸顺滑吐出，“卡纸救出来啦！”  
**星级初稿**：三星 `≤40s / 0错`，二星 `≤80s / ≤2错`。

### D3. 订单 12：键盘连击故障｜难度 ★★☆☆☆

**ID** `12`；key `keyboard-double-press`；章节 `进阶维修`；2 Stage。

**客户留言**：“按一次 S，却连续打出两个 S！”

| Stage id | kind / mode | 构图和行为 | 成功反馈 |
| --- | --- | --- | --- |
| `keyboard-find-key` | `fault-spot` | 大键盘中心靠上，六个候选键 S、A、D、F、J、K；输入框真实展示`按下 S → 输出 SS`，S 键双闪，其余常规一闪；观察后点击 S | S 键显示绿色修复圈，输出从 `SS` 恢复单个 `S` |
| `keyboard-test-keys` | `sequence-test` | 同一键盘，突出四个大可点击键 S、A、D、空格；始终显示当前要按的键 | 键帽有弹性按压和绿色测试灯，全测通过 |

**错误**：点错故障候选或按错测试键计一次，取消、长按误滑不计错。  
**结算动画**：文字由`SS`变`S`，键盘灯光亮起，“打字终于顺畅啦！”  
**星级初稿**：三星 `≤30s / 0错`，二星 `≤60s / ≤2错`。

### D4. 订单 13：散热风扇异响｜难度 ★★★★☆

**ID** `13`；key `cooling-fan-noise`；章节 `进阶维修`；2 Stage。

**客户留言**：“风扇一直响，电脑还越来越热！”

| Stage id | kind / mode | 构图和行为 | 成功反馈 |
| --- | --- | --- | --- |
| `fan-unscrew-cover` | `rotary-control / unscrew` | 正视大风扇，两个大螺丝置于安全位置，按箭头方向各累计 270°；螺丝逐枚抬起 | 护盖轻弹开启，露出风扇 |
| `fan-tune` | `gauge-tune / fan` | 风扇占据上半，底部两条互不遮挡的滑块：转速与风道开度；实时计算温度指数/噪声指数，双绿稳定0.7s | 风扇由抖动变平稳，热气消散，指示灯变绿 |

**必须是“实时时间连续反馈”**，不是拖两个抽象图标到框里。微调不算失误。  
**结算动画**：“凉快又安静，修好啦！”  
**星级初稿**：三星 `≤38s / 0错`，二星 `≤75s / ≤2错`。

### D5. 订单 14：耳机左右声道失衡｜难度 ★★★☆☆

**ID** `14`；key `headphone-channel-balance`；章节 `进阶维修`；2 Stage。

**客户留言**：“左边声音很响，右边却几乎听不到！”

| Stage id | kind / mode | 构图和行为 | 成功反馈 |
| --- | --- | --- | --- |
| `headset-find-channel` | `fault-spot` | 大耳机左右分别标注`L 左`/`R 右`；左侧波形大、右侧波形明显小；点右侧 R | R 耳罩得到绿色定位框 |
| `headset-balance` | `gauge-tune / stereo` | 两条大滑块对应 L/R，波形跟随数值变化；目标`|L-R|≤8`且均值在45—75；稳定0.7s | 左右波形趋于一致、耳罩灯光同步 |

音效关闭时仍要能根据**波形、数字和文字**判断，不能把“真的听出来”作为唯一答案。  
**结算动画**：维修员戴上耳机竖拇指，“两边都清楚啦！”  
**星级初稿**：三星 `≤32s / 0错`，二星 `≤65s / ≤2错`。

### D6. 订单 15：直播间紧急救场｜难度 ★★★★☆

**ID** `15`；key `livestream-rescue`；章节 `进阶维修`；3 Stage。

**客户留言**：“马上要开播了，画面突然卡住，快帮我恢复！”

| Stage id | kind / mode | 构图和行为 | 成功反馈 |
| --- | --- | --- | --- |
| `live-route-signal` | `guided-trace` | 背景显示冻结直播屏、麦克风、摄像机、音控台；信号线沿走线槽穿过3环并避开可见红色障碍；通过检查点顺序识别 | 走线槽逐段发蓝光，三个环变绿，故障警示变弱 |
| `live-tune-stream` | `gauge-tune / broadcast` | 预览屏显示卡顿帧，画面稳定度和音量两个滑块，双绿且稳定0.7秒 | 视频帧恢复流畅、声波同步 |
| `live-final-check` | `sequence-test` | 四个大功能键输入/同步/检查/开播，当前要点的文字始终置顶显示 | 屏幕`直播已恢复`、灯牌亮绿、短时金色彩片 |

这是**路径、仪表和按键功能的组合**，不是旧版直播桌“设备归位→线头连接”换图。  
**结算动画**：画面恢复流畅，维修员欢呼，“直播救援成功！”  
**星级初稿**：三星 `≤60s / ≤1错`，二星 `≤110s / ≤4错`。

---

## E. 数据协议与实现建议（必须根据实际工程接口核对）

### E1. 冻结源码中实际存在的契约

冻结分支原始 `StageDefinition.ts`：

```ts
export type StageKind = 'drag-match' | 'cable-connect' | 'clean-swipe';
export type StageDefinition = DragMatchStageDefinition | CableConnectStageDefinition | CleanSwipeStageDefinition;
```

`StageRuntime.ts` 暴露只读 `progress:{completed,total}`，`setInputEnabled`、`resetStage`、`deactivateStage`、`resumeStage(callbacks)`；`StageCallbacks` 只有 `onProgress/onMistake/onComplete`。`StageHost` 用**实际具体类静态导入 + Prefab Inspector**分支装配，按 kind 缓存，最多一个 active。`OrderCatalog` 现有每张 **1—3 Stage**、校验坐标在 StageHost ±360/±400 内，目录被冻结。`LevelManager` 现有三种 stage 的进度文字、session 教学、每单仅 beginLevel 一次、步骤完成才结算；`HomeController` 负责开始/返回。

### E2. 扩展类型（示意，须编译实际源码）

建议增加五种**判别联合**，不要引入 JSON 泛型 `any` 或字符串反射组件：

```ts
export type NewStageKind = 'fault-spot' | 'rotary-control' | 'guided-trace'
    | 'gauge-tune' | 'sequence-test';

export interface FaultSpotStageDefinition extends StageBaseDefinition {
    readonly kind: 'fault-spot';
    readonly faultId: string;
    readonly hotspots: readonly [HotspotDefinition, ...HotspotDefinition[]];
    readonly clueText: string;
}

export type RotaryMode = 'align' | 'unscrew';
export interface RotaryControlStageDefinition extends StageBaseDefinition {
    readonly kind: 'rotary-control';
    readonly mode: RotaryMode;
    // 对齐时含 initial/target/tolerance/holdSeconds；旋松时含 screws/requiredDegrees/direction
    // 推荐通过 mode 的 discriminated union 严格区分，不要给一个接口堆大量可选字段。
}

export interface GuidedTraceStageDefinition extends StageBaseDefinition {
    readonly kind: 'guided-trace';
    readonly points: readonly [PointDefinition, PointDefinition, PointDefinition, PointDefinition, ...PointDefinition[]];
    readonly tolerance: number;
    readonly checkpointRadius: number;
}

export type GaugeMode = 'fan' | 'stereo' | 'broadcast';
export interface GaugeTuneStageDefinition extends StageBaseDefinition {
    readonly kind: 'gauge-tune';
    readonly mode: GaugeMode;
    readonly initialControls: readonly [number, number];
    readonly holdSeconds: number;
}

export interface SequenceTestStageDefinition extends StageBaseDefinition {
    readonly kind: 'sequence-test';
    readonly choices: readonly [ChoiceDefinition, ...ChoiceDefinition[]];
    readonly sequence: readonly [string, ...string[]];
}
```

以上是**合同草图**，编译时请根据实际源码的 TypeScript 严格规则补齐和修正，禁止用 `as any` 绕过。新 Stage 继承原 `StageBaseDefinition` 的 `id/kind/title/instruction/tutorial`；复用旧 `StageRuntime` 和 `StageCallbacks`，不要新增另一套事件总线。

### E3. 目录校验新增规则

在不改旧三种校验前提下扩展 `validateOrderCatalog`：

- 原 1—9 原配置字节、ID、key、stage 类型、评分保持；新订单 10—15 的 id 正整数唯一、key 唯一、stageId 在每单唯一。
- `fault-spot`: 2—6 个热点、热点ID唯一、正确点存在、区域至少满足目标大小建议、位置有限且在 StageHost 内。
- `rotary align`: initial/target 角度有限，容差 1—30°，目标可到达，holdSeconds >0（初稿0.6）。`unscrew`: 1—3 枚螺丝、每枚90—540°、合法方向，互动区互不重叠。
- `guided-trace`: 四点及以上、检查点恰三、路径连续且局部坐标合法；相邻路径节点距离非零；tolerance 正数，禁止整条路径隐藏在 HUD 下。
- `gauge-tune`: `mode` 为 fan/stereo/broadcast，两个起点在0—100内；holdSeconds >0（初稿0.7）；针对每种 mode 的**成功样例必须有可达解**。
- `sequence-test`: choices 至少4个且 id 不重复，sequence 3—5 步且全部指向实际 choice；当前目标始终能由文字/图标辨认。
- 所有 Stage 的文字非空，严格 readonly，deep-freeze；无效数据应明确抛错，不得静默跳过、默认成功、加载白板。

### E4. 评分与星级

继续使用当前 `RunController`：

```
score = max(100, 1000 - floor(elapsedMs/1000)*10 - mistakes*100)
三星/二星：时间和失误都需满足对应阈值；等于边界也满足。
```

| 订单 | 三星（秒/最大失误） | 二星（秒/最大失误） |
| --- | --- | --- |
| 10 | 28 / 0 | 55 / 2 |
| 11 | 40 / 0 | 80 / 2 |
| 12 | 30 / 0 | 60 / 2 |
| 13 | 38 / 0 | 75 / 2 |
| 14 | 32 / 0 | 65 / 2 |
| 15 | 60 / 1 | 110 / 4 |

这组是**可配置的第一轮试玩阈值**，不是根据普通人实测校准的参数；真实 Playtest 再改，不能通过延长测试脚本或注入时间伪造“易玩”证据。

### E5. 进入游戏和最终结算

- 首页仍先等待真实点击「开始维修」，再进入订单 1，不能因扩到15张自动跳过前9张或开始后台计时。
- 原9张顺序和重玩、返回首页保持；新增订单从9号结算的「下一张订单」进入10号。
- 最后15号完成才显示「全部订单完成」；最终数由目录/运行结果动态产生：**15/15单，27/27步，最多45星**。
- 成绩为实际可变值；新 Stage 只报告正常进度/错误/完成，由原 manager 调用 `RunController.finishLevel()` 一次；不要在 Stage 内自行加分。
- 开发阶段必须能直接跳到 10—15 做真实 Preview，入口 **仅在 Editor/DEBUG** 启用，不能偷偷放进正式首页、正式包或默认编译路径。

---

## F. 素材、UI和性能约束

### F1. 新资产最小需求

| 类型 | 必需独立层（不能只放整张参考图） |
| --- | --- |
| 手柄 | 壳体、左摇杆、环形刻度、准星偏移、高亮指示、方向键、测试灯 |
| 打印机 | 机身、出纸/进纸/滚轮热点、褶皱纸、可移动纸、导纸路径、3 个检查点、笑脸测试纸 |
| 键盘 | 键盘主体、6 个热点键、测试输出卡、动态测试键、修好后的灯效 |
| 风扇 | 扇叶、2 枚可旋螺丝、护盖、温度/噪声刻度与两滑块 |
| 耳机 | 耳罩 L/R、两侧波形、两滑块、安全区和同步状态灯 |
| 直播 | 冻结预览屏、信号线手柄、走线槽/3环、禁止区域、画面和音量滑块、测试键、恢复预览 |
| 公共 | 复用现有纸签/音效/金币未实现按钮不生成、已有 Q 版维修员、软高亮/短错误提示/短庆祝光效 |

资产路径可放 `assets/art/day5b/`（具体按工程原结构调整）；每张 SpriteFrame 与 `.meta` 经 Creator 自动生成。首版尽量复用现有 Q 版风格、可离线重绘的 SVG/PNG 与 Creator Graphics；不能下载未授权版权素材或依赖外网运行。

### F2. 操作视觉与复杂度分层

游戏中的**输入根/触摸热区**与**装饰子层**分开，借鉴 V2.2 原有 ElementVisual 架构：放大可视主体不要意外扩大到遮住其他按钮；装饰层不绑定 Touch。所有 Stage 支持最少视觉反馈：开始、进行中、错误/偏离、达成四态。第一版不要求与参考图逐像素一致，但不接受“纯文字黑框”冒充六张已确认画面。

- `rotary` 每次移动更新角度，不堆无限 tween。
- `guided-trace` Graphics 只更新当前路由，限制重绘开销。
- `gauge-tune` 波形可有限节点/简单插值，不用每帧新建大量对象。
- `sequence` 键帽复用/短动效；禁用时清除所有监听与 tween。
- 设备/贴纸/角色尽量静态 Sprite；不要给所有背景图每帧新建纹理；首发不引入 3D 物理引擎。

### F3. 界面可读性

参考图中 3D 设备可按 V2.2 2D 技术美术进行“适度简化”，但必须满足：关键设备在 390×844 下真实可辨认，热点面积足够，目标字/安全区不小于可辨认标准；耳机 L/R 同时有文字+波形；按键步骤文字始终可见；颜色盲不能仅靠红/绿区分状态。

---

## G. 测试、人工试玩与阶段完成定义

### G1. 自动化验收必须覆盖

| 领域 | 必须覆盖 |
| --- | --- |
| 目录 | 1—9 字节或语义不变；15 unique IDs；新 Stage 为14，总共27；`kind` 8种；score 规则一致 |
| fault | 唯一故障、有线索、正确一次、错误候选按唯一ID计错、tap滑动阈值、CANCEL、重复END |
| rotary align | ±12°边界、角度0/360回绕、0.6s稳定、释放后计时、CANCEL不成功、重复回调 |
| rotary unscrew | 方向、角差展开、两螺丝各270°、不能点按作弊、旧回调失效 |
| trace | 3检查点顺序、直接跳终点失败、正常快速拖动、偏离回最近点、CANCEL保留进度、重启清除 |
| gauge | fan `(65,70)`可达/初始不可达、stereo `(60,58)`可达/两零不可达、broadcast `(75,65)`可达/初始不可达；实时反馈、稳定0.7s |
| sequence | 三种4步、错按钮不推进、错误计一次、CANCEL、正确计数和完成幂等 |
| lifecycle | 禁用、恢复、销毁、touch ownership、callback generation、所有Stage缓存最多8、至多1 active、旧 tween 不进入新单 |
| 结果 | 原9单行为、15单累积45星、总步数27、单单计时跨stage、重玩和返回首页真正清理数据 |
| UI/资源 | 全部新Prefab/inspector引用、中文标签不挡输入、图层无多余 BlockInputEvents、缺素材明确报告 |

**测试层级需分开**：有限 cc.d.ts/mock 只能验证实际编译组件的逻辑；Creator SDK `check:cocos`、已保存 Prefab 的引擎探针、真实鼠标 Preview、触屏与平台分别记录，不能互换。冻结基线原 **224 组**必须保留且继续通过，新增加的测试数量应以实际覆盖为准，不为凑一个漂亮数字删旧断言。

### G2. 人工游玩样板验收（未授权的平台测试不能伪称通过）

- 390×844：六张新订单均能通过真实鼠标操作，至少覆盖每种新 kind 的正确/错误/取消可观测项；4种不同视觉反馈足够清楚。
- 768×1024：至少每类新玩法操作一例，检查滑块标签、路径和热点没有遮挡。
- 1280×720：15 单 27 步全流程 + 最终结算 + Replay + Home→Start 至少一轮；若时间限制未执行，必须明确“未完成”，不得用纯 mock 冒充。
- 推荐另找 2—3 位此前没有接触项目的人，用屏幕录制试玩 10/11/13/15，记录“能否理解下一步、完成时间、误触、主观好玩程度”。这属于人工体验，不应写成统计留存结论。
- 真机Touch/WebView/微信或抖音平台目前无证据，继续作为后续验证债务。

### G3. Day 5B 成功/失败标准

**通过**：五种新玩法真正可操作且被复用，六单各有独特的故障情境和完成动画，原9单稳定，15单/27步/45星动态总结正确；mock、Creator 类型、资源审计、至少一套完整的人工/桌面 Preview 闭环通过。若部分依赖 Creator 无法在 Codex 环境执行，只能宣称“代码已完成、Editor验收待补”，不得宣称完全通过。

**不通过**：旧玩法换皮；新增 Stage 用假进度直接完成；从海报裁一张图铺为全屏响应区域；关键物品无法从手机画面辨识；滑块/路径/旋转输入没有真实移动判定；新故障没有可视线索；重复结算/回调产生两份成绩；删除旧测试来获得绿灯。

---

## H. 本轮决策与后续

六单主题和六张视觉锚点已得到用户认可。该文档现为 **Day 5B 的设计与验收依据**；Codex 的具体执行权限由独立《DAY5B_CODEX_IMPLEMENTATION_PROMPT.md》约束。仅授权本地 Day 5B 开发并不自动授权 commit/push、合并 main、发布、广告、Day5C 或服务器。
