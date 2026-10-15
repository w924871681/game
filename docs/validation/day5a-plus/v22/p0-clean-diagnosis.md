# V2.2 P0 清洁：诊断与一次受控实现

范围：只修改 `assets/scripts/visuals/V21CleanDustView.ts`。不改控制器、订单数据、输入、逻辑阈值、Scene/Prefab 或图片。此记录先描述源码与数值证据；最终视觉结论必须读取本轮真实 Preview 原图。

## 诊断依据

直接检查 V2.1 两份真实比较图 `v21/comparisons/final-clean57-horizontal-v2-to-v21.png` 和 `final-clean57-v2-to-v21.png`。前者的两行水平输入虽然不再显示逻辑格线，但横贯键盘的清洁带边界仍明显；后者斜/弧输入的残尘较自然。不能把不同路径的这两张图当成相同输入的受控实验。

当前视图已经是192个独立 Sprite：低差异序列加 seed 扰动的位置不属于32个逻辑格；controller 只在实际接受的 START/MOVE 后通知路径，逻辑 cell 的 Tween 不控制这些 Sprite。因而 V2.2 不再归因为“逻辑整行同步删除”。

可见边缘仍整齐的原因是 **整个 Sprite 的 alpha 统一按中心到轨迹的距离更新，而所有粒子使用相同画笔半径和较窄、接近的羽化范围**。旧 `feather=max(8,min(width,height)*0.5)`；`inner=max(0,radius-feather*0.6)`、`outer=radius+feather*0.4`。键盘 brushRadius46 时，28–62设计像素的尘团只有约14–31像素过渡宽度，且低差异点整体分布均匀，一条水平笔迹容易形成连续清空区及相近的透明度转折。

## 单次最小实现

保留192节点、原位置/尺寸/基础alpha/纹理/父层级、公开和Inspector接口。仅在 configure 时为各粒子计算两个稳定标量：

```text
m = min(width, height)
edgeShift = (noise(index, seed+89) - 0.5) * m * 0.56
featherScale = 0.9 + noise(index, seed+107) * 0.9
feather = max(18, m * featherScale)
inner = max(0, radius + edgeShift - feather * 0.5)
outer = radius + edgeShift + feather * 0.5
t = clamp((distance - inner) / (outer - inner), 0, 1)
alpha = min(previousAlpha, round(baseAlpha * t*t*(3-2*t)))
```

每粒偏移在 `±0.28*m` 内、范围随尺寸/ID变化；一个更宽的 smoothstep 保留自然擦拭清洁带，同时让边缘更宽、更不齐。没有添加肩部曲线、第二种清洁引擎或累计随机褪色。相同路径重复/反向幂等；不同路径只会单调减淡。

随机值只在 configure 计算；sweep 没有随机调用、新节点、新Color、新数组、计时器、动画或每帧工作。旧 finite guard 的数组字面量改为五个显式 Number.isFinite 检查。192节点只首次创建，后续沿用原配置/池/清理，缺帧和 disable/enable 行为保持。

## 已执行的源码行为检查

通过原有限 mock 的实际 TypeScript 编译加载器，在内存中导出既有 loader，未改原 runner 或历史测试：

- 原 `verify-day5a-v21-clean.cjs` 17组全部通过，断言文件未改。
- 新 `verify-v22-clean.cjs` 导出 `runV22CleanTests(runtime)`，8组通过：水平过渡拓宽、等距alpha不再同值、局部重复/逆向、同路径分段一致、三清洁 seed/复位/192复用、finite/禁用、240次扫掠对象复用、缺图恢复。
- 本次数值样本使用原键盘配置、不经业务输入，轨迹 `(-260,-32.5)→(260,-32.5), radius46`。192个原位置/尺寸粒子中：新方案83个部分alpha，对照旧数学公式31个；新方案41个全清、68个保持原alpha。它证明数值过渡拓宽，**不证明真实57%进度、渲染质量或手机触屏通过**。
- 同一距离46的粒子alpha因稳定ID不同而分散，避免旧公式在共同半径处几乎一致的切换；新用例检查至少9个归一化等级与足够差异。

这8组仅为新增视觉契约；root继续将其接入保留原207组的正式runner，并执行真实SDK类型、Creator审计/引擎探针、自然Preview。没有把上述独立mock运行称为整项目已验收。

## 验收与止损

root将用390×844真实自然输入保存水平0/约57/约96/结算、斜线/弧线和局部回扫。长水平输入本应形成一定宽度的清洁带；判断的是硬直边是否缓和。整个Sprite仍统一alpha，架构没有做像素遮罩，因此不能预先承诺完全无带状感。只允许这一实现加至多一次必要修正，剩余差距如实留给用户原图审阅。
