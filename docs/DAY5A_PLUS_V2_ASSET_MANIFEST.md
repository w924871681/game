# DeskRescue V2 原创素材与绑定清单（已导入绑定）

更新日期：2026-10-15（Asia/Shanghai）。此页依据[新增素材来源JSON](../tools/art/asset-sources-v2.json)、[离线生成器](../tools/art/generate_v2_ui.py)、[保留源稿说明](../tools/art/v2/SOURCES.md)和[v2-scene.js](../extensions/deskrescue-editor/v2-scene.js)。**15个新增PNG已通过真实Creator导入、配置并绑定到保存的Scene/Prefab；本轮审计1081/1081。** 实际SpriteFrame引用见[导入JSON](validation/day5a-plus/v2-imported-assets.json)，视觉覆盖见[验证报告](DAY5A_PLUS_V2_CREATOR_VALIDATION.md)。

## 数量、体积与历史保护

- 新增运行素材 **15 PNG、3,269,452字节**，目录assets/art/v2；无新增音效。
- 可编辑来源包括 **4份内置image_gen生成的原始master与4份确切prompt、7份程序化SVG**；四角色姿势及导师头像共用同一角色master。
- 沿用Day5A已有49 PNG、7 WAV、稳定设备/端口/清洁映射；既有56个运行素材为908,479字节。连同V2，当前设计运行素材合计64 PNG+7 WAV、4,177,931字节；不含master、SVG、meta、文档和Creator缓存，也不是平台构建包大小。
- 生成器的protectedDay5AFileCount为108、protectedDay5AChanges为空：生成过程检查了旧Day5A运行素材、源SVG、旧来源清单字节，不覆盖它们。历史docs/validation/day3、day4、day5a同样不可为本轮“刷新”旧证据。

PNG/SVG/源master/prompt的完整SHA-256、来源、特征、裁切边界和字节数以asset-sources-v2.json逐项记录为准。本页不复制易漂移的Creator UUID：image导入的root UUID与SpriteFrame子资产必须由真实Editor取得，再写入本轮新的资产绑定/场景审计。尚未导入完成的SpriteFrame不能自行编造UUID。

## 四份原创生成master

| 保留原始文件 | 确切prompt | 下游用途 |
| --- | --- | --- |
| [workshop-room.master.png](../tools/art/v2/sources/workshop-room.master.png) | [workshop-room.prompt.md](../tools/art/v2/sources/workshop-room.prompt.md) | 独立工坊环境图，不含整页UI/成绩/按钮 |
| [repair-boy-poses.master.png](../tools/art/v2/sources/repair-boy-poses.master.png) | [repair-boy-poses.prompt.md](../tools/art/v2/sources/repair-boy-poses.prompt.md) | 同一修理工欢迎、提示、竖拇指、欢呼四姿势；同master裁切头像 |
| [trophy.master.png](../tools/art/v2/sources/trophy.master.png) | [trophy.prompt.md](../tools/art/v2/sources/trophy.prompt.md) | 独立扳手奖杯，不烘焙分数、星级或排名 |
| [cloth-glove.master.png](../tools/art/v2/sources/cloth-glove.master.png) | [cloth-glove.prompt.md](../tools/art/v2/sources/cloth-glove.prompt.md) | 独立蓝色布/白手套提示，不增加可拖工具系统 |

master由项目内置image_gen.imagegen按保留prompt原创生成，原文件保持，运行图通过用户授权的独立图层提取、四象限裁切、alpha包围框裁切和离线重采样获得。四姿势裁切自同一1254×1254 master，象限627×627；头像从欢迎象限裁取帽子/头/肩，不重新生成另一人物。实际裁切坐标与source/prompt/output哈希均在JSON中。

这些AI图层的可编辑来源是原master与prompt、裁切/导出代码，**没有伪造对应SVG**。重新运行离线生成器不会再次调用图像API；重新生成不同master是另一次明确的图像制作操作，不能声称prompt保证重现相同随机像素。没有使用网络下载商业游戏图、商标、未授权字体或音频样本；该来源说明不替整个仓库设定新的开源许可证。

## 十五张实际运行PNG

| Stable key（assets/art/下同名PNG） | 尺寸 | 字节 | 来源与目标用途 |
| --- | --- | ---: | --- |
| v2/workshop-room | 864×1296 | 1,554,539 | room master；首页/玩法/终局的独立环境层 |
| v2/repair-welcome | 512×640 | 291,093 | 角色master左上；HomeOverlay/V2WelcomeBoy |
| v2/repair-pointing | 512×640 | 292,575 | 角色master右上；完整提示姿态保留，当前装配优先头像，必要时为头像缺失fallback |
| v2/repair-thumbsup | 512×640 | 272,364 | 角色master左下；单单结算ThumbsupBoy |
| v2/repair-cheering | 512×640 | 328,762 | 角色master右下；终局CheeringBoy |
| v2/repair-avatar | 256×256 | 93,893 | 同角色master欢迎象限头肩裁切；TutorialHint/V2TutorAvatar |
| v2/trophy | 384×384 | 166,597 | trophy master；FinalSummaryGroup/Trophy |
| v2/cloth-glove | 320×320 | 115,106 | cloth master；CleanDecor/ClothCue，纯装饰 |
| v2/paper | 192×128 | 8,878 | 同几何SVG/PNG；纸签、胶囊、结果卡、次按钮与槽位表面 |
| v2/gold-button | 256×128 | 11,226 | 同几何SVG/PNG；开始、下一单、重玩的金色按钮面 |
| v2/wood-workbench | 720×720 | 62,275 | 同几何SVG/PNG；暖木桌、桌沿/木纹分层 |
| v2/green-mat | 640×480 | 15,601 | 同几何SVG/PNG；防静电绿垫，不烘焙逻辑格或目标 |
| v2/cable-anchor | 128×128 | 9,959 | 同几何SVG/PNG；Cable/Anchor/V2Socket装饰固定座 |
| v2/irregular-dust | 256×256 | 43,772 | 同几何SVG/PNG；DirtCell/V2SoftDust，透明软边不规则尘团 |
| v2/confetti | 128×128 | 2,812 | 同几何SVG/PNG；少量金色纸片，不使用重型粒子系统 |

七份SVG保留在tools/art/v2/sources，对应paper、gold-button、wood-workbench、green-mat、cable-anchor、irregular-dust、confetti。生成器复用项目现有Canvas绘图几何与Pillow的3倍抗锯齿导出，SVG/PNG由同一几何双输出；不是把Pillow冒充通用SVG渲染器。

## 实际装配接口与九切片设置

| 原资源/组件 | 绑定目标 | 必须由真实Creator核验的条件 |
| --- | --- | --- |
| VisualAssetRegistry | 原Day5A keys/frames加v2/*本地SpriteFrame | 数组唯一/对齐，缺图明确报错，不能按中文文本猜图 |
| HomeOverlay | 小屋、欢迎角色、设备独立Sprite及金色按钮 | HomeController引用正确，图层非整屏海报，Stage未开始 |
| PaperOrderHUD | 订单纸签、胶囊与唯一清洁条 | 目录/步骤/进度真值、RunController仍直绑时间/失误 |
| ElementVisual | V2Surface、V2Highlight、V2SlotOutline | 原命中根/配对/坐标保持；2/3/4池复用无串图 |
| CableConnector + V2CableLine | 原head/port/anchor/line保持，新Graphics artwork与固定座子图 | 实时端点、颜色/造型区分；旧线禁用渲染不改业务引用 |
| DirtCell + V2DirtAppearance | 原UIOpacity/逻辑格保留，子尘团1.6倍覆盖 | 不缩放/移动真实格，透明交错不显方格；需Preview实看 |
| V2ResultView | 单单/终局组、真实统计、同一个NextButton | 分支互斥，最终无三满星误导，返回首页是真流程 |
| Canvas/V2ModalShade | 独立全屏Sprite与BlockInputEvents | 位于音效/Stage上、结果下；不随CompletePanel Tween缩放 |

paper的实际SpriteFrame边界为left/right=32、top/bottom=28；gold-button为left/right=64、top/bottom=48。两者trimType=none，使用SLICED；不能把它们误写成旧Day5A card/button的192×128、上下38参数。以上值已通过真实meta、frame和Scene引用审计核对。

ButtonPressFeedback只操作V2ButtonVisual子根；Button和CLICK仍由原HomeController/LevelManager管理。角色入场由WorkshopDecoration持有有限Tween，disable/destroy/切换时清理；装饰节点不挂触摸监听。音效On/Off、金/空星和七WAV仍复用Day5A资产，不创建虚拟新音频。

## 离线复现与核对

```powershell
Set-Location D:\game
python tools/art/generate_v2_ui.py
```

该命令读取保留master和原创几何，输出运行PNG、七SVG与独立asset-sources-v2.json；不联网、不调用image API、不写Scene/Prefab/meta、不安装依赖。相同字节不重写；确定性纹理使用固定随机种子。原AI master和原Day5A资产不由该命令重新生成。

后续必须先让Creator完整导入全部PNG并生成SpriteFrame子资产、通过真实Editor增量装配保存，再运行新的资源/引用/UUID/输入审计与真实Preview。角色身份一致性、图稿接近程度、灰尘是否仍有接缝与布局可读性都是实际画面验收项；本页不宣称高保真或商业美术已达标，也不预填任何PASS或平台测试。

## 本轮真实 SpriteFrame UUID

来自Creator asset-db；完整64项绑定见导入JSON。

| Key | 实际 SpriteFrame UUID |
| --- | --- |
| v2/workshop-room | 3267d8ff-f0e1-4756-8a6c-72968e096ca0@f9941 |
| v2/repair-welcome | 1c085cb7-7441-4acf-950e-dcece079bfa5@f9941 |
| v2/repair-pointing | 66bc468b-a2bf-4f9e-8769-71bb9c8d35a3@f9941 |
| v2/repair-thumbsup | fa64e836-701f-4a2f-b858-7223d7d81760@f9941 |
| v2/repair-cheering | bc6b26b8-ba35-4875-9150-755d44c5c40a@f9941 |
| v2/repair-avatar | ce0e260b-5889-4230-a749-6cce8f9e4681@f9941 |
| v2/trophy | a49d0c96-425f-4b93-8da3-0b7d274b2e42@f9941 |
| v2/cloth-glove | 1e241713-3846-42f6-b076-fcf877d6d3db@f9941 |
| v2/paper | 5228d1bf-93ed-4f7b-87ce-f2b0d5b300c4@f9941 |
| v2/gold-button | 047f7d6d-6382-4611-96ba-6975e0c15fdc@f9941 |
| v2/wood-workbench | 604a98dc-66d7-4af0-b934-dae62e0f34f3@f9941 |
| v2/green-mat | eef914a4-fc96-4308-b255-0111f448fdd4@f9941 |
| v2/cable-anchor | 46dbaa20-7c9e-440f-9b10-b6addc7c0b7f@f9941 |
| v2/irregular-dust | 02f9975e-687e-4474-9c9d-3af8c64ccf7d@f9941 |
| v2/confetti | 0e3cea94-7aa7-4363-89b0-012d3779e3c1@f9941 |
