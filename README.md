# DeskRescue / 桌面急救站 — Day5B final polish / 0.0.5-alpha.5

2026-10-19：15单、27步、8种微玩法。第12单使用“试按观察→确认故障键→序列复检”；手机标签已精修，QA入口普通Preview默认关闭，BUILD环境强制禁用。

293组回归（原275+新增18）、项目真实Creator strict通过；SDK自身102条声明诊断单列。Creator保存审计23/23、真实引擎探针10/10。1280×720普通Preview自然完成15单27步：41/45星、11320分、373.8秒、0失误。390和768为独立定点实测，不能视为完整轮或物理手机验证。

- [最新交接](docs/GPT_HANDOFF.md)、[最终修复说明](docs/DAY5B_FINAL_POLISH.md)、[Creator与Preview验收](docs/DAY5B_FINAL_CREATOR_VALIDATION.md)。
- [保护审计](docs/validation/day5b/final-polish/preservation.json)、[证据目录](docs/validation/day5b/final-polish/)、[原阶段说明归档](docs/validation/day5b/final-polish/previous-README-alpha5.md)。
- Creator3.8.8打开 `assets/scenes/Game.scene`。不要重建旧场景；视口变更后刷新初始化。QA需显式本地Editor开关，`local/`不进入Git；交付场景qaEnabled=false。
- 目标公开功能分支 `feature/day5b-six-orders`。提交后的实际SHA和远端读回回执保存在项目外与本地ignored收据；提交内文档不提前宣称推送成功。禁止合并main、PR、强推、发布和Day5C。
- 物理手机、原生Touch/CANCEL、微信/抖音与人类试玩尚未验证。

历史Day5A和Day5B说明见归档；其中旧版本结果和授权不代表当前状态。
