# Day5B 最终交互收口（0.0.5-alpha.5）

2026-10-19，按当前未提交 alpha.5 工程实施。15单、27步、8种玩法保持；本次不是重画六页或扩展 Day5C。

## 三项实际修改

1. **第12单诊断**：`Day5BStageDefinition/OrderCatalog/StageValidation` 增加仅该单使用的可选 `diagnosticMode: test-and-confirm`。`FaultSpotStageController` 让六键初始等价、取消自动 S 闪烁；试按只显示 `A → A` 或 `S → SS`，不判错、不加进度。明确点击“确认故障键”才判定。错误确认每次诊断最多记一次，可恢复；disable/deactivate/reset 清理选择和反馈，旧回调由原 generation/session 合同失效。第11、14单保持原直接定位。
2. **文字可读性**：`Day5BStageView` 的提示、反馈、按钮文字增大；`GaugeTuneStageController` 保留温度/噪声、左/右、画面/音量专业区别并缩短范围；`GuidedTraceStageController` 移除冗余顶端说明。第12单仅移动/缩放设备装饰子层，检测回显与确认按钮分离；原六键输入根不动。没有修改滑块、路径、旋转、评分与 ownership/CANCEL 判定。
3. **QA入口**：`Day5BReviewLauncher` 需要显式 `qaEnabled && PREVIEW && !BUILD`，显示与动作两处保护。Editor装配读取 ignored `local/day5b-qa.json`，默认 false。最终原生保存场景 `qaEnabled=false`、ReviewRoot inactive。没有密码、query后门或密钥。

## 与此前未提交 Day5B 成果的边界

从 Git HEAD 看见的 LevelManager、StageHost、PaperOrderHUD、五种新控制器、五个 Prefab、15张分层图及设计文档，是此前 Day5B 整合成果；本次没有再改这些整合类或旧业务架构。完整提交必须包含这批尚未提交成果，不能仅上传三个补丁。

精修文件及公开匿名化的逐项区别见 `validation/day5b/final-polish/change-inventory.json`。新五 Prefab、历史八 Prefab与所有原meta均保持本轮前字节。原 `RunController`、`DraggableItem`、`CableConnector`、旧 OrderCatalog 不变。所有新图像源稿与SHA见 `tools/art/day5b/asset-sources.json`；本轮没有新增或替换PNG/SVG，无外部下载素材。

## 验证与失败历史

293组有限行为测试通过：原275保留，新增18组涵盖初始中性、测试/确认、幂等、cancel/disable/reset、原11/14及QA环境组合。项目真实Creator strict通过；安装SDK自身102条声明错误单列，不修改SDK、不关闭strict。45个JavaScript与22个Python语法检查及原始图像重现校验通过。

Creator真实保存与重复装配复用通过，审计23/23、真实引擎10/10。293组mock不是Creator验收替代品，真实EventTouch夹具也不是物理触摸。完整实测与发布门禁证据见[最终验收报告](DAY5B_FINAL_CREATOR_VALIDATION.md)。

保留了首次裸@property与离线装饰器夹具不兼容的失败日志；改为实际SDK支持的@property配置工厂后通过。保留390初次键盘装饰遮挡截图，随后仅修装饰层并复测。旧缓存的Editor wrapper忽略第二参数，已改为单个请求对象并由真实保存确认。审计曾发现探针绑定旧QA场景，已重跑绑定最终false场景。旧阶段import-map EPERM与热改视口限制仍留在历史报告，不将其伪装成本轮通过。

## Public Git 安全与证据

外部 alpha5 全量备份1357文件、CRC及SHA已核验；0原文件缺失。公开材料的机器路径替换为明确占位符，原件在项目外，`redaction-bridge.json` 记录原/公开字节SHA；旧报告SHA保留其原始语义，不能拿来声称公开替换字节相等。历史报告仅作历史，当前结果以final-polish证据为准。

公开候选文件及最终index均应通过安全扫描，不上传缓存、local、完整ZIP、数据库或凭据。提交使用已验证GitHub公开账号的noreply作者地址，不泄露本机私人邮箱。既有参考图为用户提供设计材料，运行新素材为项目原创几何源稿，仓库许可不扩大；这不构成对第三方商标的法律鉴证。

本提交内的文档在提交前冻结：不预写实际SHA或推送成功。单次提交后，真实commit、push、local==remote、main未变化与GitHub blob读回结果写入项目外/ignored `local/day5b-final-publication.json`，最终用户回执给实际SHA。不得用第二次提交或改写历史凑自引用SHA。

会话模型没有自动切换；没有声称使用任务书偏好的Terra型号。

## 剩余边界

物理手机、浏览器原生Touch/CANCEL、多指、WebView、微信/抖音SDK、平台发布、FPS与真实玩家星级校准未验证。373.8秒包含工具停留，不能作为普通玩家速度结论。固定尺寸刷新初始化后已测；热改比例仍需刷新。未做完整Release包构建，发布保护采用当前安装SDK宏+实际源代码+真实引擎的同级证据，详见报告。
