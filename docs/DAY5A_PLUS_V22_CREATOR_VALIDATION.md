# DeskRescue V2.2 Creator 与 Preview 验证

更新时间：2026-10-16（Asia/Shanghai）。实际版本 `0.0.5-alpha.4`，Cocos Creator **3.8.8**。本轮从 `D:/game` 未提交的 alpha.3 原位增量实施；只改清洁羽化及拥挤元素的视觉子层。电脑端工程检查通过，**美术终审仍待用户审阅；水平擦拭条带未完全消除**。

## 原生 Creator 保存与资源检查

通过真实 Creator Asset Database、Node/Component、Prefab/Scene 保存 API 保存，未手写 Scene/Prefab/meta JSON。实际保存记录 [build-current.json](validation/day5a-plus/v22/build-current.json) 时间为 `2026-10-15T15:37:27.105Z`。两遍操作均只触及现有7项：DragItem、DragTarget、Cable、Port、DragMatchStage、CableConnectStage、Game.scene；第二遍每项新增节点均0。DirtCell、CleanSwipeStage未保存改写。

最终只读原生审计由 Creator 内 `Ctrl+Alt+Shift+F7` 实际执行，输出 [creator-audit.json](validation/day5a-plus/v22/creator-audit.json)，时间 `2026-10-15T16:28:06.309Z`，**2349/2349，0失败**。9核心资产UUID/meta、175meta、101PNG、7WAV、49资源key、16输入节点及祖先、Game全部172节点/组件/childOrder保持合同。P2首页/HUD/结果/Canvas/相机/CSS冻结；仅规范化原生序列化身份及真实LegacyDay3 ElementVisual新增默认false。

审计实际重跑未修改的V2.1审计，raw结果 **1318/1319**：唯一失败是旧alpha.3专属版本门槛。该原始失败完整保留，V2.2以严格Creator3.8.8＋alpha.4门槛显式替代；其余1318项未弱化。不能称原始V2.1报告1319项在alpha.4全部通过。

4个元素Prefab已保存 `smallScreenLegibility=true`、原绑定caption奶油描边 `#FFF5DBFF`/2。运行时只调整Icon及Label子层的位置、尺寸和字体，caption font28、深字；线缆Icon限高由64降至56设计像素。**输入根的尺寸、anchor、position、scale、rotation、layer、父层级、命中框及吸附关系均未改变**。四设备短名为麦克风、摄像头、补光灯、声卡；四部件为风扇、内存、硬盘、显卡。接口保留主板线/口、CPU线/口、硬盘线/口、风扇线/口等配对，WAN/LAN及入户/电脑网线的业务区别保留。

## 自动检查与真实引擎的证据边界

| 检查 | 本轮实际结果 | 证据 |
| --- | --- | --- |
| `npm test` | **224组通过＝原207＋P0 8＋P1 9**，exit0 | [final-tests.log](validation/day5a-plus/v22/final-tests.log) |
| 无Creator缓存的隔离副本 | 1060文件副本，224组通过；原temp不变 | [final-offline.json](validation/day5a-plus/v22/final-offline.json) |
| `npm run check:cocos` | 真实Creator SDK项目strict/unused，exit0 | [final-cocos-types.log](validation/day5a-plus/v22/final-cocos-types.log) |
| 安装SDK自检 | **exit1，102条历史声明诊断：jsb18＋cc84**；未改SDK或放宽标准 | [final-sdk-self.log](validation/day5a-plus/v22/final-sdk-self.log) |
| 语法检查 | 31个JS/CJS及16个Python文件全部通过 | [checks.json](validation/day5a-plus/v22/checks.json) |
| 源码执行前后 | 94项runtime/tool/config字节不变 | 同上 |
| 真实Creator资源审计 | **2349/2349** | [creator-audit.json](validation/day5a-plus/v22/creator-audit.json) |
| 真实引擎probe | **53/53＝原46＋新7** | [engine-probe.json](validation/day5a-plus/v22/engine-probe.json) |
| 基线保护 | 实际2166/2166；972基线中957字节不变、15项允许修改、0删除；954冻结文件及483历史证据保持 | [preservation.json](validation/day5a-plus/v22/preservation.json) |

引擎probe时间 `2026-10-15T15:38:25.897Z`，晚于最后保存；51个off-scene夹具均安排销毁，TweenSystem恢复，正式场景未改，cleanup errors为空。覆盖真实组件及已保存Prefab、稳定羽化/回扫/复用/缺图、四物品和四线计数及标签；原46项代码不改。它是受控真实引擎夹具，含合成cc.Touch，不能替代浏览器原生Touch、物理触屏或平台实测。

## 自然 Preview 实测

使用实际 `http://localhost:7456/`，Debug INFO，所有玩法输入通过浏览器鼠标按下、拖动、释放及真实按钮完成。未从页面脚本注入分数、清洁进度、计数或关卡状态。DOM读取只记录canvas几何、CSS clip与视口。计时包含工具停留；成绩不构成速度或FPS基准。

| 视口 | 实际覆盖 | 结果 |
| --- | --- | --- |
| **390×844** | 一轮全9订单/13步骤，全部三玩法；水平0→57→回扫57→96→28格达标；再次开始后斜/弧57与局部回扫；O8四物品、O9四线0/4→3/4→四部件、O5 0/3→1/3 | **4210分、17/27星、613.0秒、0失误**；总评→首页→开始通过 |
| **768×1024** | 首页，前3单拖拽，O4水平0→57→结算，O5 0/3→1/3→结算 | **只完成前5单**；O4 120分88.3秒0错，O5 810分19.9秒0错。未称平板全9单 |
| **1280×720** | 恢复后新开完整9订单/13步骤；三玩法、O8四物品/O9四线交叉及四部件、总评、直接重新挑战 | **7820分、27/27星、123.5秒、0失误**；重玩回第1单、step1/1、0/3、失误0 |

宽屏首段前3单因浏览器会话中断而终止，已有原图保留；它不计入上述完整轮。恢复轮前3单文件含 `resumed`，后续接续到final。视口切换曾出现黑色加载和一次截图/DOM超时，重建同浏览器独立Preview会话后恢复，没有为此修改游戏、CSS或核心资源。用户Esc中止期间已停止电脑操作，收到继续后再恢复。

宽屏完整轮的页面warn/error记录为0，见 [preview-wide-console.json](validation/day5a-plus/v22/preview-wide-console.json)。自动化工具本身另有Statsig网络诊断，不归为游戏页面错误，也不代表SDK通过。390/768旧会话的完整console在恢复时不可取回，不宣称全会话零错误。原生Creator保留旧V2.1 Port导入错误历史，未清空Console；本轮最终成功保存、审计、probe分别有独立时间和结果。

三种视口均重新载入验证，不等于运行中任意旋转测试。已有SHOW_ALL薄荷留边保留：390上下、768左右、1280左右，具体DOM见 `dom-390.json`、`dom-768.json`、`dom-1280-resumed.json`。结束恢复默认viewport并保留Preview首页供审阅。

## 原图与新旧对比

完整截图和注释见 [preview-capture-ledger.json](validation/day5a-plus/v22/preview-capture-ledger.json)、[截图尺寸与SHA清单](validation/day5a-plus/v22/comparisons/screenshot-inventory.json)。对比为完整390×844原图1:1并排，标题在画面外，无改色、重绘或裁掉游戏区域；10组已复开逐像素验证。自然输入路径/计时可能不同，不称严格受控视觉实验。

| 内容 | V2.2 原图 | 新旧对比 |
| --- | --- | --- |
| 水平57% | [原图](validation/day5a-plus/v22/screenshots/clean-horizontal57-v22-390x844.jpg) | [比较](validation/day5a-plus/v22/comparisons/clean-horizontal57-v21-to-v22.png) |
| 斜/弧57% | [原图](validation/day5a-plus/v22/screenshots/clean-diagonal57-v22-390x844.jpg) | [比较](validation/day5a-plus/v22/comparisons/clean-diagonal57-v21-to-v22.png) |
| 斜/弧后局部回扫57% | [原图](validation/day5a-plus/v22/screenshots/clean-diagonal-local-repeat57-v22-390x844.jpg)；另保留[水平回扫](validation/day5a-plus/v22/screenshots/clean-local-repeat57-v22-390x844.jpg) | [比较](validation/day5a-plus/v22/comparisons/clean-local-repeat-v21-to-v22.png) |
| 水平96% | [原图](validation/day5a-plus/v22/screenshots/clean-horizontal96-v22-390x844.jpg) | [比较](validation/day5a-plus/v22/comparisons/clean96-v21-to-v22.png) |
| O8四物品 | [原图](validation/day5a-plus/v22/screenshots/order8-four-items-v22-390x844.jpg) | [比较](validation/day5a-plus/v22/comparisons/order8-four-items-v21-to-v22.png) |
| O9三线交叉 | [原图](validation/day5a-plus/v22/screenshots/order9-three-cross-v22-390x844.jpg) | [比较](validation/day5a-plus/v22/comparisons/order9-three-cross-v21-to-v22.png) |
| O9四部件 | [原图](validation/day5a-plus/v22/screenshots/order9-four-items-v22-390x844.jpg) | 对比目录含相应图 |
| O5零/一连接 | [0/3](validation/day5a-plus/v22/screenshots/order5-0of3-v22-390x844.jpg) / [1/3](validation/day5a-plus/v22/screenshots/order5-1of3-v22-390x844.jpg) | 对比目录含两图 |
| 首页/总评 | [首页](validation/day5a-plus/v22/screenshots/home-v22-390x844.jpg) / [390总评](validation/day5a-plus/v22/screenshots/final-v22-390x844.jpg) / [宽屏总评](validation/day5a-plus/v22/screenshots/final-v22-1280x720.jpg) | P2未重新设计 |

P0根因是Sprite中心距离统一窄羽化叠加；本轮只做一次稳定ID/seed边界微扰及宽羽化实现。192软尘与逻辑格分离不变，图中无内部网格；水平边缘更散，但**57%和96%依然可辨清洁带，改善细微，不能宣布完全消除**。斜/弧与回扫无新网格或回脏；两组回扫前后键盘ROI decoded RGB相同，计时区域不参与。内部57%=16/28、96%=27/28，非灰尘像素消失比例。

P1四设备和部件文字更清楚，Icon与Caption分离，成功Head文字在上、Port文字在下；线在文字/输入下层。所选新旧3/4比较图均为三根成功、风扇线仍在左侧未连接；另一历史第四根吸附中的瞬态图单独保留，未选入该对比。是否达到最终美术要求由用户看原尺寸图决定。

## 未验证与交付约束

物理触屏、浏览器原生Touch/CANCEL、手机WebView、微信/抖音真机、运行中任意旋转、FPS基准和本轮独立音频听感均**未验证**。鼠标Preview与合成cc.Touch不代替这些结论。没有改阈值/评分制造视觉成绩；没有开始Day5B或平台接入。

最新交接见 [GPT_HANDOFF.md](GPT_HANDOFF.md)，变更/职责见 [收口记录](DAY5A_PLUS_V22_CLOSEOUT.md)。完整工程包在项目外由 `python tools/package_v22_delivery.py` 新建，CRC、逐项SHA与全新目录解压复核结果以外部 `.delivery.json` 为准，包内含 `DELIVERY_MANIFEST.json`。历史报告、原图与用户ZIP不覆盖。

下一步仅为：**用户审阅V2.2原图 → 决定是否冻结Day5A+ → 经单独授权建立GitHub基线 → Day5B**。本轮没有Git提交、push或发布。
