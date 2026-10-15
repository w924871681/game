# DeskRescue V2 本地 Creator 与 Preview 验证

日期：2026-10-15（Asia/Shanghai）。版本 **0.0.5-alpha.2**；Creator **3.8.8**；TypeScript **5.8.2**。实际项目 D:/game，正式场景 assets/scenes/Game.scene。

本轮完成六屏的本地实施、真实保存与桌面 Preview。视觉采用独立原创图层及现有设备图标，保留参考的工坊、奶油纸签、金色按钮与同一维修员方向；没有宣称逐像素还原高保真海报，第三/第五页仍供用户最终审阅。物理触屏、平台和听感不在本轮通过范围。

## 1. 保存、绑定与保护

原有未提交 Day5A 先按476个Git可见文件备份到项目外；[V2前基线](validation/day5a-plus/v2-baseline.json)记录每个文件的SHA与备份路径。没有reset/clean或恢复旧提交。

Scene与8个Prefab通过实际Creator Node/Component、Prefab序列化、asset-db保存并由scene.save-scene确认；没有手写Scene/Prefab/meta。[完整装配](validation/day5a-plus/v2-full-build-report.json)记录正式Scene UUID、类ID、资源数量；重复装配各资源新增节点均为0。旧Day5A Apply Visual Skin已加V2保护。

[最终保存文件审计](validation/day5a-plus/v2-scene-audit.json) **1081/1081**，包括九核心资产UUID/meta、16输入及祖先节点的局部/世界变换、parent/anchor/layer/hitbox、Inspector引用、49个旧Registry键、46稳定映射、meta完整性、override引用、独立全屏BlockInputEvents遮罩、结算按钮高于结果组。保存文件审计不代替渲染或鼠标命中实测。

[保护报告](validation/day5a-plus/v2-preservation-report.json)逐文件核对V2前未提交ZIP，零删除。295个重点保护文件、186个旧文档/证据、RunController/DraggableItem/CableConnector/OrderCatalog原字节、原146组测试逻辑保留。最新修改/新增及SHA见报告；其自身由交付包外层清单哈希。

StageHost原设计中心为(360,640)，参考假定(360,755)。保留输入位置后，HUD纸签位于y164/h132，统计胶囊y304/h48，末端352小于最高输入框上边360。具体映射见[场景文档](DAY5A_PLUS_V2_SCENE_MAPPING.md)。

## 2. 当前实际命令

[命令、时间和退出码](validation/day5a-plus/v2-final-commands.json)是最后代码修复后执行的结果。

| 命令 | 实际结果 | 证明边界 |
| --- | --- | --- |
| npm test 对应 node tools/verify-day1.cjs | **174/174**，exit0 | 原146+新增28组，实际编译脚本的mock行为验证 |
| npm run check:cocos 对应 --cocos-types | **项目strict通过**，exit0 | 真实Creator生成配置与SDK；strict/noUnused保持开启 |
| --cocos-types --check-sdk-declarations | exit1，安装SDK自身**102条**诊断 | jsb.d.ts18 + cc.d.ts84；与基线相同，未修改SDK或伪造配置 |
| node --check 原及新增验证/Editor JS | 通过 | 仅语法；详见v2-final-syntax.json |

[测试日志](validation/day5a-plus/v2-final-tests.log)、[项目类型](validation/day5a-plus/v2-final-cocos-types.log)、[SDK自检](validation/day5a-plus/v2-final-sdk-self.log)分别保留。项目类型通过不表述为SDK自身零错误。

## 3. 真实引擎夹具

[本轮真实引擎探针](validation/day5a-plus/v2-engine-probe.json) **36/36**：重新执行18项核心质量检查与18项V2视图/流程检查。使用当前注册组件和已保存Prefab、独立真实ActionManager手动dt，构造真实cc.Touch/EventTouch并向夹具节点emit；不是浏览器原生触摸。

覆盖32格/28格阈值、16/28=57%、27/28=96%、620分2星示例、不同目录长度、两种音效状态、最终回首页/防重入/旧回调隔离、直接Replay、实际曲线终点和固定端点改色、污渍装饰复用、ownership/CANCEL、按钮子节点Tween与全屏遮罩。34个离场夹具清理，原TweenSystem恢复，formalSceneUnchanged=true，cleanup errors=0。

## 4. 三比例自然 Preview

通过本机 http://localhost:7456/ 实际鼠标点击和拖拽；只读DOM记录Canvas rect/style，没有读取隐藏游戏状态或注入页面输入。所有关键截图在[截图目录](validation/day5a-plus/screenshots)，范围见[Preview记录](validation/day5a-plus/v2-preview-verification.json)。用时包含观察/截图停留，不是性能或完成速度benchmark。

| 视口/轮次 | 订单/步骤 | 星级 | 得分 | 用时 | 失误 | 闭环 |
| --- | --- | --- | --- | --- | --- | --- |
| 390×844一轮 | 9/9，13/13 | 21/27 | 4890 | 395.7秒 | 2 | 最终→首页→再次开始 |
| 1280×720首轮 | 9/9，13/13 | 26/27 | 6970 | 208.0秒 | 0 | 最终→直接重新挑战 |
| 1280×720重玩轮 | 9/9，13/13 | 23/27 | 7240 | 180.5秒 | 0 | 静音→最终→首页→再次开始 |
| 768×1024 | 完成1～5单 | 以逐单截图为准 | 不给整轮总分 | 自然时间 | 未做错误专项 | 首页/结果/下一单、清洁/接线 |

768没有完整九单，不宣称每种比例都完整九单。

| 视口 | 实际Canvas DOM rect | 720×1280可见设计区 |
| --- | --- | --- |
| 390×844 | 0,0,390,844 | x0,y75.333,w390,h693.333 |
| 768×1024 | 0,0,768,1024 | x96,y0,w576,h1024 |
| 1280×720 | 0,0,1280,720 | x437.5,y0,w405,h720 |

SHOW_ALL保持，V2ViewportTheme以CSS clip露出薄荷补边，不改变Canvas bounds或输入换算。运行中从390直接改成1280，Creator Preview曾保留旧frame宽度；重新加载后正确。各最终尺寸均重载验证，不能写成实时旋转适配通过。临时viewport最后已reset，Preview恢复首页。

## 5. 六页真实截图与差异

| 页面 | 实图 | 本轮变化与艺术边界 |
| --- | --- | --- |
| 首页 | [390](validation/day5a-plus/screenshots/home-v2-390x844.jpg)、[768](validation/day5a-plus/screenshots/home-v2-768x1024.jpg) | 原创房间/同一维修员、双行标题、金按钮；现有设备图标比海报更扁平 |
| 拖拽/HUD | [订单1](validation/day5a-plus/screenshots/drag-v2-order1-390x844.jpg)、[四设备](validation/day5a-plus/screenshots/order8-four-items-390x844.jpg) | 单纸签任务、独立统计、剪影槽位；为保护实际输入调整参考布局 |
| 接线 | [0/3](validation/day5a-plus/screenshots/cable-v2-order5-0of3-390x844.jpg)、[1/3](validation/day5a-plus/screenshots/cable-v2-order5-1of3-390x844.jpg) | 1/3只有一根接好；错线回弹；独立Graphics曲线跟随原head/anchor |
| 清洁 | [污渍](validation/day5a-plus/screenshots/clean-v2-order4-dirty-390x844.jpg)、[57%](validation/day5a-plus/screenshots/clean-v2-order4-partial-390x844.jpg)、[96%](validation/day5a-plus/screenshots/clean-v2-order4-96pct-390x844.jpg) | 重叠不规则透明尘团，唯一底部百分比；按整行擦除仍有横向分区，艺术细节近似 |
| 单单结果 | [390](validation/day5a-plus/screenshots/result-v2-390x844.jpg)、[768](validation/day5a-plus/screenshots/result-v2-768x1024.jpg) | 真实冻结分数/时间/失误/星级，金色下一单；第三/第五候选页由用户审阅 |
| 最终结果 | [390](validation/day5a-plus/screenshots/final-v2-390x844.jpg)、[1280](validation/day5a-plus/screenshots/final-v2-1280x720.jpg) | 奖杯、六项动态统计、欢呼角色、重玩/回首页双按钮 |

[六屏总览](validation/day5a-plus/comparisons/six-screen-contact.png)由真实六张390截图缩略拼接。[7组前后对比](validation/day5a-plus/comparisons/README.md)保持对应视口、原截图像素；终局对比用两张1280图，不裁横屏伪装竖屏。70张旧截图SHA未变，边缘采样以实际JPG误差说明，不把拼图背景当游戏补边证据。

自然 Preview 已观察错误拖拽/接线回弹、吸附、灰尘淡出、结果放大回落、星级和角色入场；精确时长和disable/destroy清理另由引擎夹具核查。没有逐帧性能或所有浏览器动画兼容性结论。

## 6. 失败与恢复历史

- 最初start字段与Component.start重名，改为curveStart/curveEnd，最终项目类型通过。
- Phase A早期重复装配把当前计时/教程Label隐藏，结果纸也盖住原NextButton。分别修正label激活/只隐藏旧引用、将Next置于两组上方；加入保存文件审计并以真实点击复测。
- 早期WebGL外侧黑边不受DOM背景影响，新增CSS clip；最终390上下、768/1280两侧薄荷色，各尺寸重新加载验证。
- Phase A留存审计1038/1039的唯一失败是尚未升alpha.2；完成样板可玩后升级，完整审计1081/1081。
- 18:18完整装配首次重复保存遇到Windows asset-db暂时UNKNOWN文件锁，随后有资源JSON暂不可读。原[失败记录](validation/day5a-plus/v2-last-operation-error.json)保留。加入同一Creator save的有界重试，18:19完整重跑/保存/重复零新增通过，后续最终审计与探针通过，Preview三比例实际加载无缺图。Creator Console仍保留旧错误，不宣称整个会话从未报错。
- 初期新增LabelOutline产生弃用警告，改用Label原生outline字段并移除本轮旧式组件。旧VisualAssetRegistry的String声明改CCString，原49键/资源不变。

[浏览器最终捕获](validation/day5a-plus/v2-preview-console.json)warning/error为空；Creator历史日志与恢复事实分开记录，不用清空Console掩盖失败。

## 7. 剩余问题及交付边界

1. 原创角色/房间与参考同方向，设备纹理、线缆柔软感、污渍边界仍是近似；不宣称高保真逐像素复刻或用户审美终审。
2. Creator Preview实时切换视口需重载；独立尺寸可用，不宣称动态旋转通过。
3. SDK102条自身声明诊断仍存在；项目代码检查通过。
4. 当前仅电脑。物理触摸、浏览器原生Touch/TOUCH_CANCEL、微信/抖音真机/WebView、平台构建、FPS基准未测。模拟引擎触摸不可替代这些链路。
5. 本轮验证音效开关和状态保留，未做独立听感/录音；旧Day5A音频事件不升级为本轮证明。

未执行git add/commit/push/tag、发布、上传或Day5B。交付包含完整源码/资产/meta/场景/Prefab/项目设置、扩展、测试、原创master/prompt/SVG、原六图设计与新旧证据；排除.git、library、temp、profiles、node_modules、build和敏感缓存。ZIP的CRC/逐文件SHA与全新目录解压复核以实际打包结果为准，见项目外同名delivery.json。
