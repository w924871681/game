# DeskRescue V2.2 可试玩视觉冻结基线

记录日期：2026-10-16（Asia/Shanghai）。版本 `0.0.5-alpha.4`，Cocos Creator 3.8.8，TypeScript 5.8.2。

## 冻结决定与授权

用户于2026-10-16明确认可V2.2作为当前可试玩视觉基线，并授权本次普通commit及推送到既有Public仓库的 `feature/day5a-visual-playable`。这不是商业上线版，也不代表终版高保真美术或真机平台验收。

本次不迭代视觉或玩法，不合并main、不强推、不改写历史、不创建PR/Tag/Release、不发布、不开始Day5B/5C。此项新授权取代此前本地V2.2报告中“本轮未授权Git”的阶段性限制；旧报告正文作为历史保留。

## 冻结内容

完整保留V2六页：首页、拖拽、接线、清洁、单单结算、全部结算；Q版维修员、工坊、纸签HUD、金色按钮及已有音效。九张订单、十三个步骤、drag-match/cable-connect/clean-swipe三玩法，以及稳定ID、判定、阈值、计时评分、CANCEL、generation、元素池、生命周期均不更改。最终结算的重新挑战和返回首页保持原实现。Scene/Prefab/meta/Inspector引用及原始素材源稿保留。

## 此前Creator与Preview验收记录

以下为V2.2已有报告的历史结果，本次没有重新操作Creator保存、audit、probe或自然Preview：

| 既有证据 | 已存结果 | 本次处理 |
| --- | --- | --- |
| V2.2行为测试 | 224＝原207＋新增8＋9 | 本次另行实跑，见下一节 |
| [Creator保存资源审计](validation/day5a-plus/v22/creator-audit.json) | 2349/2349，2026-10-15T16:28:06.309Z | 对982份文件SHA作当前核对，隐私例外单列；未重跑编辑器 |
| [真实引擎probe](validation/day5a-plus/v22/engine-probe.json) | 53/53＝原46＋7；51离屏夹具清理，Tween恢复 | 原JSON字节保持，未重跑 |
| [自然Preview](validation/day5a-plus/v22/preview-verification.json) | 390×844与1280×720各完整9单13步及再次开始；768×1024前5单 | 原图及记录保持，未冒称本次重新试玩 |
| [历史保护审计](validation/day5a-plus/v22/preservation.json) | 冻结前2166/2166 | 原报告保留；隐私匿名化后的公开副本不是原字节快照 |

宽屏曾有前三单中断partial，与后来完整轮分开；不拼接成同一轮。合成cc.Touch、mock及桌面鼠标结果不替代物理触屏。

## 本次提交前亲自执行的检查

本次开工实际核实：项目根D:/game，分支feature/day5a-visual-playable，HEAD `ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22`，暂存区空。1129份Git可见文件共93,414,505字节；此前完整交付ZIP的1127份payload全部仍匹配，新增内容仅两个用户截图ZIP。所有未提交成果已记录项目外路径/大小/SHA及Git状态，没有删除任何文件。

实际工具：Node v22.19.0、npm10.9.3、Python3.13.5、Creator内置TypeScript5.8.2。2026-10-15T17:10:25Z开始实际运行：

| 本次命令 | 退出码 | 实际结果 |
| --- | --- | --- |
| `npm test` | 0 | 224/224行为组；原207及新增17均保留 |
| `npm run check:cocos` | 0 | 真实Creator生成配置及SDK，strict/noUnusedLocals/noUnusedParameters；skipLibCheck=false |
| `npm run check:cocos -- --check-sdk-declarations` | 1 | 安装SDK历史102条：jsb.d.ts18、cc.d.ts84；与既有记录相同，不是项目错误或SDK零错误 |
| `node --check`逐项现存31份JS/CJS/MJS | 全0 | 包括verify-day1/day4/day5a和V2/V2.1/V2.2脚本 |
| Python `compile(source, path, "exec")`逐项16份 | 全通过 | 只语法检查，不生成pycache，不执行生成器 |

测试执行期间所有既有项目文件字节不变，tsconfig.json、temp/tsconfig.cocos.json、temp/declarations/cc.d.ts前后SHA相同；未用mock声明替代真实SDK项目检查。测试原始日志和时间/退出码保存在项目外本次审计目录，未覆盖历史V2.2日志：

`D:/game-deliverables/git-v22-prepush-audit/20261015T170833001Z/`

其中 `actual-checks.json`、`npm-test.log`、`cocos-project-types.log`、`sdk-declarations.log`记录本次实际执行。JS/Python语法日志、源文件快照及最终暂存/远端核验回执同目录保全。

素材审计核对175份meta、377个顶层及子资源UUID，无重复、缺meta或孤儿meta（5个.gitkeep不需meta）。三份素材manifest的56＋15＋37条运行图音及所声明源稿SHA均匹配；101运行PNG、7合成WAV、保留prompt的母版及93SVG保留。370份docs图片经全量联系表视觉审查、6份原图追加核查，未发现账号/桌面隐私画面；这不等于逐像素OCR或法律确权。六张设计参考由用户明确提供并要求交付，无实际第三方付费版权警示；不把该出处记录宣称为独占版权证明。

## Public安全处理与完整性桥接

原候选文本审查未发现真实令牌、私钥、认证URL、邮箱、设备标识或认证文件。Creator information配置中的两处相同sid按上下文为表单标识，未发现用户凭据；未将此推断写成厂商确认。普通D:/game、项目外备份和SDK安装路径不等于个人用户目录。

9份历史JSON/log中16处个人用户目录，仅把用户名段替换为 `<USER>`；没有改实验数字、结果、时间、SDK诊断、文件顺序或旧SHA字段。**全部原文件在修改前已按原SHA逐字节备份到项目外 `private-original-evidence/`，原始完整V2.2 ZIP也仍保留。**

下表路径相对于 `docs/validation/day5a-plus/`。每行旧SHA只绑定原始私有字节，新SHA才绑定当前公开匿名化副本：

| 文件 | 替换处数 | 原始SHA-256 | 公开副本SHA-256 |
| --- | --- | --- | --- |
| `v21/baseline.json` | 1 | `9b05be70ef51312b0f74ad9604f8b3ad023a7f104130b9a024b4ce41939ed09e` | `72b0a121754813b0d740ecffb42eb305c6c9bbf51fd66e042b8c1ee61e3a1704` |
| `v21/final-commands.json` | 4 | `0d57dd5c48073cd67e74be9e90615d2ff601982111ad96059a5b14f357433041` | `e5bea3ea227c951c8c612c7ce5278025ec2774a89912a8829c13af465d2a9c9d` |
| `v21/final-syntax-js.command.json` | 1 | `78dcd2c186a5c908baaac8c588df460f9367d80d70580e52cd8b4ca347403cee` | `0479c0982f2727a19c7f87e42064538c39b21323c089410c46e593e39577a13a` |
| `v21/final-syntax-js.log` | 1 | `c7e46204041de66492b49da6307c54030b087ef38c217d8e3b28bf8eebb1e9a3` | `b0130fe216ea61fe84b276a15bfba4f56fef63fad87e6164865990b475615635` |
| `v21/final-syntax-python.command.json` | 2 | `133d215d15bf191593034d851784178673171b05f90bfa5c1aecc0af84249d79` | `2c31937c7bd59c510295a35e11616901a219797adf12047185505aa2c810462b` |
| `v21/final-syntax-python.log` | 2 | `5298a7fe5c2fc570686f8cec7e480d7fbea08749a3a90b4ec7642e13638a7df1` | `037a20bbd5f3b437f76eb4101de00cee9f71830be9d586266866e95aeedba078` |
| `v21/final-syntax-supplement.json` | 2 | `967dd111abc31f71f3b777d18b2a2e2a473f67050851b3e8c3a924a9d01201ea` | `64ae7fe935db4be8ec87d1d31799046ab08af4667baef2e4127fdcb4494e1e94` |
| `v22/checks.json` | 2 | `141c7fe562454f66beec9d07858b4ddb3a8fb2d439e64fce1512d7ee78bfa0cb` | `6a34d4d3fe1f9bcc0e6f7b1f4a4e99dd64615aa75b0ecc65593ccacbf824674c` |
| `v22/final-offline-execution.log` | 1 | `04be37b75cf9a6b8616ad08f221eeceffc49428f2bb6b60a027f450effe81259` | `3aadb1633d7dd4754d89484c6b18654e9298e882b21e9353abf44d07adf2f52b` |

原SHA在23份文件中共有185处历史引用，**不递归重写旧摘要，不把旧ok报告伪装成对当前匿名化字节仍完全相等**。旧报告、原始log命令路径及其摘要保持原实验语义。需要重现原始字节保护时，须在独立副本使用项目外保全原件。

旧 `tools/verify_v21_preservation.py`、`tools/package_v21_delivery.py`硬编码V2.1原baseline摘要；V2.2历史保护/装配审计/交付工具同样绑定旧证据。它们是历史可复现工具，不能在匿名化公开副本上直接宣称原摘要门槛通过；本次没有改这些工具以绕过门槛。此次冻结检查独立核对当前源码、资产与九份显式匿名化例外，其余原文件保持原字节。新gitignore、冻结记录及README/GPT入口提示也单独列为文档/公开范围变更。

五个截图/比较重复ZIP只在本地保留，用增量 `*.zip` 规则排除本次Git；展开的原图和比较图继续纳入，未断开Markdown相对图片链接。本机Creator缓存、依赖、字节码、帮助.url与项目外交付包不上传，也不删除。

## 保留的美术债务与未验证事项

- 水平擦拭仍有带状痕迹，作为本次可试玩冻结的非阻塞美术债务接受；Day7再研究连续遮罩等系统化改善，本次不开V2.3。
- 四物品名称已改善，三/四线交叉和窄屏小字仍有局部密集感，留待Day7润色。
- SHOW_ALL薄荷补边保留，并非全屏连续场景；移动端适配阶段再处理。
- 未验证物理触摸、浏览器原生TOUCH/CANCEL、手机WebView、微信/抖音构建、真机FPS、运行中任意旋转及本轮独立音频听感。
- 安装SDK声明仍102条历史诊断，不报告SDK零错误。

## Git目标与一次提交原则

已通过GitHub查询确认 `w924871681/game` 为Public，当前账号具ADMIN权限，仓库未归档；唯一origin为 `https://github.com/w924871681/game.git`。

本次提交标题固定为 `feat: freeze Day 5A V2.2 playable visual baseline`。只提交并普通推送同名feature分支。推送前读取远端main为 `ffde65700d6fa8c5ddd6daf2ca43e30dbdf3ee22`，当时目标feature分支不存在。提交采用当前GitHub账号的noreply邮箱，避免增加个人邮箱暴露；不改本机全局身份配置。

**本文写入时commit与push尚未执行，因此不虚填本次SHA或“已推送”。** 暂存白名单、内容与工作区字节一致性、秘密/路径/大文件扫描、换行检查、实际commit、LOCAL==REMOTE及main前后SHA等最终结果写到项目外回执，不为回填SHA创建第二次commit。

后续只按另行授权开展Day5B。本次不自动创建后续开发内容。

## 本次暂存格式检查的历史例外

完整命令 `git -c core.whitespace=cr-at-eol diff --cached --check` 实际退出2，产生58条提示、涉及48份历史文档/证据。不是零警告。逐项比对开工SHA后，均为原有Markdown双空格硬换行或log末尾空行；唯一匿名化log的结尾也未改。游戏源码/Scene/Prefab及本次新冻结文档没有新增格式问题。为保留已验证的历史原字节，不批量格式化旧文件。原始检查输出与逐条行号保存在项目外 `staged-whitespace.log` 和 `whitespace-exceptions.json`。

下列具体路径为已核对的历史格式例外；针对其余暂存内容另行执行相同检查，结果写最终外部回执。此例外只适用于所列原有提示，不放宽源码或新内容检查。

| 历史路径 | 行号 | 提示 |
| --- | --- | --- |
| `docs/DESKRESCUE_V22_TASK.md` | 11,12,13 | trailing whitespace |
| `docs/DESKRESCUE_V2_UI_DESIGN.md` | 18,19,20,21,22 | trailing whitespace |
| `docs/design/v2-reference/DeskRescue_V2_Complete_UI_Design_Spec.md` | 3,4,5,6,7 | trailing whitespace |
| `docs/validation/day5a-plus/v21/final-offline.log` | 225 | new blank line at EOF |
| `docs/validation/day5a-plus/v21/phase0-baseline-cocos.log` | 13 | new blank line at EOF |
| `docs/validation/day5a-plus/v21/phase0-baseline-npm.log` | 196 | new blank line at EOF |
| `docs/validation/day5a-plus/v21/phase0-offline-after.log` | 192 | new blank line at EOF |
| `docs/validation/day5a-plus/v21/phase0-offline-before.log` | 23 | new blank line at EOF |
| `docs/validation/day5a-plus/v21/rootvisual-20261015T120646199885Z-cocos.log` | 13 | new blank line at EOF |
| `docs/validation/day5a-plus/v21/rootvisual-20261015T120646199885Z-npm.log` | 229 | new blank line at EOF |
| `docs/validation/day5a-plus/v21/rootvisual-offline-20261015t1207.log` | 225 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/final-cocos-types.log` | 13 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/final-offline-execution.log` | 14 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/final-offline.log` | 242 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/final-sdk-self.log` | 120 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/final-tests.log` | 246 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_day4-appearance_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_day4-audit_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_day4-probe_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_day4-scene_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_day5a-audit_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_day5a-main_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_day5a-probe_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_day5a-scene_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_main_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_probe_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_scene_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_v2-audit_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_v2-main_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_v2-probe_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_v2-scene_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_v21-audit_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_v21-main_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_v21-probe_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_v21-scene_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_v22-audit_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_v22-main_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_v22-probe_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-extensions_deskrescue-editor_v22-scene_js.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-tools_verify-day1_cjs.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-tools_verify-day4_cjs.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-tools_verify-day5a-v21-clean_cjs.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-tools_verify-day5a-v2_cjs.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-tools_verify-day5a_cjs.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-tools_verify-v21-visuals_cjs.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-tools_verify-v22-clean_cjs.log` | 2 | new blank line at EOF |
| `docs/validation/day5a-plus/v22/syntax-tools_verify-v22-readability_cjs.log` | 2 | new blank line at EOF |
| `docs/validation/day5a/git-diff-check.log` | 5 | new blank line at EOF |
