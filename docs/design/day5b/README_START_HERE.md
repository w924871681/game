# DeskRescue Day 5B｜六张新订单设计与 Codex 交付包

**交付状态**：设计已整理完毕，尚未在用户本地执行 Day 5B；代码和 Creator 新 Prefab 是否实现，须以 Codex 实际验收为准。

## 交给 Codex 的材料

1. `DAY5B_SIX_ORDERS_FINAL_DESIGN_SPEC.md`：**产品设计权威来源**，含五种新玩法完整规则、六张订单十四个 Stage 的操作/判定/反馈、评分初稿与统一视觉规范。
2. `DAY5B_CODEX_IMPLEMENTATION_PROMPT.md`：**执行任务书**，规定从当前 V2.2 冻结 GitHub 基线开始分阶段在 `<PROJECT_ROOT>` 实施、测试和交付；本轮不授权 commit/push。
3. `references/order10_controller.png` ～ `references/order15_livestream.png`：**用户确认过的六张高保真视觉参考图**；构图/氛围参考，**不能**用整张图代替可点击可拖动的真实 Cocos Stage。
4. `references/MANIFEST.json`：六图实际尺寸、原文件 SHA-256、大小，便于确认传输一致。

## 六张订单清单

| ID | 名称 | 新 Stage 顺序 |
| --- | --- | --- |
| 10 | 手柄摇杆漂移 | rotary-control / align → sequence-test |
| 11 | 打印机卡纸救援 | fault-spot → guided-trace → rotary-control / align |
| 12 | 键盘连击故障 | fault-spot → sequence-test |
| 13 | 散热风扇异响 | rotary-control / unscrew → gauge-tune / fan |
| 14 | 耳机左右声道失衡 | fault-spot → gauge-tune / stereo |
| 15 | 直播间紧急救场 | guided-trace → gauge-tune / broadcast → sequence-test |

**总目标：** 从9单13步3玩法，升级为15单27步8玩法；旧224行为测试全部保留。

## 在 Codex 中使用

- 当前工程根目录是 `<PROJECT_ROOT>`，先确认 `git status` 和 `HEAD`；目标冻结分支 `feature/day5a-visual-playable`，基线 SHA 为 `63b5e55567546ebcd341d7af65ce4a5bbfec1c43`。
- 上传**整个 ZIP**并让 Codex 先阅读这份 README，再按 Prompt 执行。
- 用户确认六张图的**整体视觉方向**，不表示图片中所有数字和交互都可照搬：游戏原有计时是**正向累计**，没有“3次错误生命上限”；最终UI数值必须由真实 `RunController` 提供。
- 如果 Codex 无法调用 Creator Editor，不能手写 Scene/Prefab/meta；应该如实报告仍待人工Creator装配，保留代码和mock测试进度。
- 提交或推送公开 GitHub、合并 main、进入 Day5C、平台发布、广告与存档系统，都需要另行授权。

## 要求 Codex 回传

`DAY5B_CREATOR_VALIDATION.md`、`docs/GPT_HANDOFF.md`、修改文件清单、测试输出、真实 Preview 截图以及项目外完整 ZIP（含源代码/素材/必要 .meta，不含缓存）。
