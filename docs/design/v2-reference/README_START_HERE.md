# DeskRescue V2 六页 UI 交付包｜使用说明

## 文件

- `DeskRescue_V2_Complete_UI_Design_Spec.md`：六页统一设计规范、像素目标、主题、交互与冲突修正；**实际业务与实施边界以此为准**。
- `DeskRescue_V2_Codex_Implementation_Prompt.md`：在 `D:\game` 执行本地 Day 5A+ V2 改造的完整 Codex 任务。
- `references/01_home_direction.png`：**早期多屏整体风格参考**；只参考其中首页小修理工和维修工坊，不实施其中的关卡选择/排名等未批准内容。
- `references/02_drag_confirmed.png`：用户明确确认的拖拽整理视觉。
- `references/03_cable_candidate.png`：接线视觉候选，须修正示意图中“3条线已连通却显示1/3”的矛盾。
- `references/04_clean_confirmed.png`：用户确认的清洁高保真视觉；可见方格测试图被明确否决。
- `references/05_order_result_candidate.png`：单张结算视觉候选；图中的示例得分与公式不一致，实际必须用动态真值。
- `references/06_final_confirmed.png`：用户确认的最终总结与两个真实按钮。
- `reference_manifest.json`：各交付文件 SHA-256 与大小，用于文件传递核对。

## 如何给 Codex

1. 在已有工作目录 `D:\game` 的 Codex 会话中上传/解压此 ZIP（不要直接覆盖项目的 `assets` / `docs`）。
2. 发送 `DeskRescue_V2_Codex_Implementation_Prompt.md` 中的任务，要求先通读统一设计规范与六张参考图。
3. Codex 要以 **本地尚未提交的 Day 5A 源码** 为起点；GitHub main 可能只是 Day 4 基线，**不得 checkout/pull 覆盖工作区**。
4. 只授权本地 V2 开发、Editor 保存、测试与回传；**不授权 git add/commit/push 或 Day 5B**。
5. 接收 `docs/GPT_HANDOFF.md`、V2 验证报告、六页真实 Preview 截图与源码/资源 ZIP 后，再交给 ChatGPT 复核。

## 重要真实性边界

- 海报是设计参考，不是 Cocos 运行截图；右侧标注/下方示意卡不是实际游戏页面，也不能把整张海报当作静态背景上传到小游戏中。
- 设计坐标为 720×1280 左上原点的视觉落点，必须与真实 Creator StageHost 的 UITransform/Anchor/触摸区核对。
- 游戏未实现经济、广告、持久化、微信或抖音 SDK；本轮不扩展。
- 单张结算举例：28.7秒 + 1次失误为620分（现有公式）；最终总结里的分数全部动态绑定。
- 第03、05页属于推进中的统一视觉候选，没有单独得到明确“定稿”表态，实施后仍需用户对真实截图复核。
