# Day5B 实际 Creator / Preview 验证报告

验收日期：2026-10-19（Asia/Shanghai）。工程 `<PROJECT_ROOT>`，Cocos Creator 3.8.8，版本 `0.0.5-alpha.5`。本轮电脑端开发与验收完成，范围为15单、27步、8种Stage；物理手机和平台发布不在本次结论内。

## 起点和保护

起点是干净的V2.2冻结提交 `63b5e55567546ebcd341d7af65ce4a5bbfec1c43`。从原 `feature/day5a-visual-playable` 仅新建本地 `feature/day5b-six-orders`。当前成果未提交，暂存区空；没有执行git add/commit/push/tag/merge/reset/clean/stash，没有发布或Day5C。

[baseline.json](validation/day5b/baseline.json)记录1130个原文件及实际检查。开工前备份 `<DELIVERY_ROOT>/day5b-work-20261015T182137644Z/Day5B_before.zip`，72,437,449字节，SHA256 `ea7f483ea6ff71e28f93062ee6e6994e1b23ee4026250651a61ceb0f6cacae68`；CRC及全部文件size/SHA已验证。原九单目录与类型四文件、RunController、旧三种控制器、旧8核心Prefab/meta、全部旧美术与历史证据保留。最终逐文件、旧节点身份和输入几何保护以[preservation.json](validation/day5b/preservation.json)为准。

## 命令与类型检查

实际运行 `python tools/run_day5b_checks.py`，退出0。所有命令、UTC开始时间、退出码、日志SHA及源文件绑定见[checks.json](validation/day5b/checks.json)。

| 检查 | 最新实际执行时间 UTC | 结果 |
| --- | --- | --- |
| `npm test` | 2026-10-18 18:50:13 | exit0，275组＝原224＋新增51，实际组件及集成回归 |
| `npm run check:cocos` | 2026-10-18 18:50:24 | exit0，真实安装SDK的项目strict/unused检查通过 |
| SDK自身声明完整自检 | 2026-10-18 18:50:29 | exit1，102条既有诊断，单列保留 |
| 43份JS/CJS `node --check` | 同轮检查 | 全部exit0 |
| 20份Python语法AST检查 | 同轮检查 | 全部通过 |
| `python tools/art/day5b/generate_day5b.py --verify` | 2026-10-18 18:50:36 | exit0，15张PNG及源稿映射一致 |

项目类型检查没有使用离线mock冒充SDK；没有放宽strict、unused或skipLibCheck配置。安装SDK本身并非零诊断。[final-sdk-self.log](validation/day5b/final-sdk-self.log)保留完整102项；这不被并入项目成功数。

## Creator真实资源保存和审计

通过编辑器扩展增量装配，真实AssetDB创建/导入15张SpriteFrame、原生序列化五个Stage Prefab，并将现有Game.scene的StageHost Inspector绑定五个新Prefab和资源。没有手写scene/prefab/meta序列化JSON。最终构建保存时间 `2026-10-18T18:51:37.627Z`，复用5个新Prefab，再次装配新增节点0。

- [build-current.json](validation/day5b/build-current.json)：实际资源UUID、保存场景UUID、复用与幂等结果。
- [creator-audit.json](validation/day5b/creator-audit.json)：`2026-10-18T18:52:36.607Z`，**21/21通过**，五套Prefab、具体Controller/View、15个必需资源绑定、装饰层不拦截输入；正式Manager启用完整目录。
- [engine-probe.json](validation/day5b/engine-probe.json)：`2026-10-18T18:52:16.358Z`，**8/8通过**；实际保存Prefab与真实cc.Touch、ActionManager推进，覆盖15单27步、缓存8/单活跃、定位错误去重、CANCEL/旧generation、双滑块释放与0.7秒、旋钮角度反向/跨界、轨迹偏离/取消及当前编译UI位置。

审计与探针各绑定201项当前源码/资源SHA。探针是离屏可控夹具，其15000分/45星/0秒来自可控推进，不是自然实玩成绩；正式场景未用夹具状态替换。

此前导入等待、旧编译缓存、热重载场景变化被保护检查拒绝，失败/历史回执保留。现流程先重导入并重载场景，稳定后第二次装配保存。曾出现一次import-map临时文件EPERM重命名失败，随后最新实际编译位置断言及浏览器正常，未删除缓存或关闭防护。

## 真实电脑浏览器实玩

URL `http://localhost:7456/`，真实Creator Preview。通过浏览器正常鼠标点击、拖动操作，没有注入引擎状态、直接调用完成回调或用开发跳关替代自然9→10。完整记录见[preview-verification.json](validation/day5b/preview-verification.json)、[截图尺寸与SHA清单](validation/day5b/screenshot-inventory.json)。

| 比例 | 实际覆盖 | 边界 |
| --- | --- | --- |
| 1280×720 | 首页→订单1至15、全部27步连续完成，旧9→10自然衔接 | 全流程未点击开发按钮；第2单含中断后恢复等待，计时未剔除 |
| 390×844 | 新单10—15全部玩法，错误反馈、轨迹偏离、螺丝、旋钮、仪表、序列；最终目标文字额外复核 | 使用明确Debug定位后真实操作，并非手机上自然完整15单 |
| 768×1024 | 五种新kind各至少一个真实操作样例 | 部分订单/机制覆盖，并非完整15单 |

1280连续流程最终真实UI为：**15/15单、27/27步、39/45星、10980分、510.9秒、0失误**。星级和得分按原RunController实时计算，工具间隔不剔除，不能用于人类难度或性能benchmark。

![真实完整通关](validation/day5b/screenshots/1280-fullrun-final-15of15.jpg)

完成自然全流程后，将同一结果热缩至390宽保存总结果，再实际点击返回首页→开始维修，回订单1、0/3、0错。390重新加载后补齐最终目标截图；独立Debug末单通关用于重玩入口复核，部分轮总评明确为1/15而非伪称全通。重玩清零的实际截图与操作范围见Preview回执。

故障线索、滚轮回中、纸页随手柄、螺丝提起/开盖、风扇叶片与热浪、L/R波形、直播屏恢复、按键反馈都由真实控件/Graphics/分层图片驱动。静态截图只证明所见帧；没有声称测得FPS或独立音频听感。

## 剩余限制

1. 物理触屏、浏览器原生Touch/CANCEL输入适配器、多指实机、手机WebView、微信/抖音平台均未测。mock事件、真实cc.Touch夹具和鼠标Preview分别记录。
2. 固定尺寸刷新后输入正常；390初始化后热切1280会出现留黑和点击坐标不匹配，回原尺寸或刷新恢复。无刷新自由旋转未通过；交付使用固定视口初始化，不将热缩总结果当原生手机全流程。
3. 新美术为原创可再生2D Q版分层实现，未达到参考图3D/半写实精度；个别源帧预留供后续美术迭代，详见[素材清单](DAY5B_VISUAL_ASSET_MANIFEST.md)。V2.2旧清洁带状感仍是既有美术债务。
4. 新六单星级时间阈值严格来自设计稿，缺普通玩家试玩校准。工具操作等待不代表实际玩家速度。
5. SDK自身102条声明诊断仍存在。平台SDK、广告/经济、发布和Day5C未实施。

## 交付复现

Creator3.8.8打开保存的 `assets/scenes/Game.scene`，正常Preview即可。不要运行旧Day3/Day4重建命令。复核命令：`npm test`、`npm run check:cocos`、`python tools/verify_day5b_preservation.py`。如仅查看，无需再次装配。

完整项目外ZIP由 `python tools/package_day5b_delivery.py`创建，包含源码、meta、场景/Prefab、设置、扩展、测试、设计和新旧历史证据，排除Git/缓存/个人配置/旧冗余项目包。包内 `DELIVERY_MANIFEST.json`，包外同名receipt及SHA；CRC、逐文件size/SHA、新目录解压复核实际结果见[delivery-receipt.json](validation/day5b/delivery-receipt.json)。该回执在ZIP完成后写入，最终回执位于包外，不声称ZIP包含自己的最终哈希。
