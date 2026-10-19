# Day5B Creator 设置与重建

使用 **Cocos Creator 3.8.8** 打开项目根目录，场景为 `assets/scenes/Game.scene`。先等待资源导入，再打开 Preview。首页等待真实点击「开始维修」，正式流程始终从订单1开始。

## 已保存的资源

`assets/prefabs/stages/` 新增五个真实 Creator 保存的Prefab及meta：

- FaultSpotStage.prefab
- RotaryControlStage.prefab
- GuidedTraceStage.prefab
- GaugeTuneStage.prefab
- SequenceTestStage.prefab

每个Prefab具备实际类型控制器、Day5BStageView、设备Sprite、ControlLayer、Graphics、提示/反馈Label和15个导入SpriteFrame引用。正式StageHost的五个新Prefab字段已绑定。原三个Stage和五个Element Prefab保持原字节。

## 项目扩展

菜单 `DeskRescue → Day 5B` 提供 Apply、Audit、Probe；快捷键依次为 **Ctrl+Alt+Shift+F9/F10/F11**。

1. 修改本轮TS脚本后运行 Apply。若提示 `Scripts reimported`，这次只发起重导入和原生场景重载；等编辑器场景稳定后再次运行 Apply。
2. 第二次 Apply 在稳定场景中装配，保存场景，再重复装配以验证复用、零新增Prefab。不要在重载中反复连按。
3. Audit 读取已保存的实际Prefab及Inspector绑定；Probe用离场夹具和真实输入事件验证，不改正式场景。
4. 查阅 `docs/validation/day5b/build-current.json`、`creator-audit.json`、`engine-probe.json`。历史失败和 prior 回执保留，不应当作最终结果。

重导入前扩展会先保存当前场景变化。不会手写或覆盖Scene/Prefab/meta JSON。增量代码通过Creator AssetDB和原生Prefab序列化生成资源。

## 开发验收入口

Preview底部「测10…测15」仅在 `DEBUG || EDITOR` 条件下启用，用于逐单复验。非调试运行隐藏。该入口清空本次测试成绩后直达目标，**其最终页不能代表完成十五单**；全目录验证必须重新加载首页，从「开始维修」自然跑完。

## 本地检查

```powershell
npm test
npm run check:cocos
python -X utf8 tools/run_day5b_checks.py
python -X utf8 tools/verify_day5b_preservation.py
python -X utf8 tools/art/day5b/generate_day5b.py --verify
python -X utf8 tools/package_day5b_delivery.py --plan
```

`check:cocos` 使用真实编辑器SDK、strict/noUnusedLocals/noUnusedParameters。SDK自身102项声明错误单列于 `final-sdk-self.log`，不改SDK，不宣称SDK零错误。没有安装新依赖。

调整浏览器测试尺寸后应重新加载Preview，使引擎按新视口初始化。保留成绩的热调整只用于检查最终页，不代替重新载入后的比例验证。
