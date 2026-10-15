# Day 5A 素材来源与复现

更新日期：2026-10-15（Asia/Shanghai）。当前阶段：**完整素材已由 Creator 导入、保存并绑定；三比例真实 Preview、九单十三步及重玩回归已完成**。保存结果见 [full-build-report.json](validation/day5a/full-build-report.json)，资源绑定审计 [643/643](validation/day5a/scene-audit.json)，九单与重玩记录见 [preview-run.json](validation/day5a/preview-run.json)。

## 来源与工具

所有新增图形均为本项目原创程序化几何，所有声音均为本项目原创正弦/谐波合成。没有使用下载图片、真实品牌 Logo、emoji 素材、录音样本或第三方商业游戏资产。图形与音频可随 DeskRescue 项目使用、修改、再生成；本说明不替代项目整体许可证，也不对整个代码仓库添加新开源许可。

- 生成器：[generate_day5a.py](../tools/art/generate_day5a.py)。Python 标准库 + 本机已安装 Pillow；无需联网或安装依赖。
- 原始可编辑参数、切片造型和音符表位于生成器；完整扩展造型位于 [full_geometry.py](../tools/art/full_geometry.py)，透明 SVG 矢量导出位于 `tools/art/sources/`。
- 可用 PNG 由同一套原创矢量几何经 Pillow 3× 抗锯齿绘制后缩小输出。**Pillow 不被当成 SVG 导入器**：SVG 与 PNG 是共享几何的双输出。单独手改 SVG 不会自动传回 Python；需要同步源几何再生成。
- 最终运行资源为 `assets/art/**/*.png` 与 `assets/audio/sfx/*.wav`，不是不可渲染的 SVG 占位。
- 逐文件尺寸、大小、SHA-256、来源、特征及音频时长/峰值记录在 [asset-sources.json](../tools/art/asset-sources.json)。生成产物与实际绑定分别由来源清单和 [Creator 资源审计](validation/day5a/scene-audit.json)记录，49 个 SpriteFrame key 已正式绑定。
- `.meta`、SpriteFrame、AudioClip UUID 只由真实 Creator 资产导入产生；生成器不读取或写入 Scene/Prefab/meta。

复现切片或完整资源：

```powershell
Set-Location D:\game
python tools/art/generate_day5a.py --phase slice
python tools/art/generate_day5a.py --phase full
```

命令只更新本生成器拥有的 PNG、WAV、SVG 导出及来源清单，不修改订单或玩法参数。候选输出与现有字节相同时不写入文件。固定灰尘随机种子 `51014`，PNG 不嵌入变化时间，音频是确定性样本；相同 Python/Pillow 环境重复运行得到相同内容。`slice` 只生成原切片，不会删除已有完整资源；`full` 可从无生成产物的目录复现全部资源。不要在常规测试里偷偷调用生成器。使用 Creator 重新导入实际变化资产，保留既有 `.meta`。

## 阶段 B 资源与稳定映射

| 实际路径（相对 assets） | 尺寸/格式 | 稳定标识与造型 |
| --- | --- | --- |
| `art/devices/mouse.png` | 384×256 RGBA | `drag-1:mouse`：卵形壳体、按键分割、条纹滚轮 |
| `art/devices/keyboard.png` | 384×256 RGBA | `drag-1:keyboard`：宽外框、成排键帽、空格键/指示灯 |
| `art/devices/headset.png` | 384×256 RGBA | `drag-1:headset`：软垫头梁、双耳罩、麦克风杆 |
| `art/ports/power-head.png`、`power-port.png` | 各 256×128 RGBA | `computer-cables:power`：削角电源口、三针/三孔 |
| `art/ports/display-head.png`、`display-port.png` | 各 256×128 RGBA | `computer-cables:display`：梯形显示插口、细针脚 |
| `art/ports/network-head.png`、`network-port.png` | 各 256×128 RGBA | `computer-cables:network`：RJ45 接口、卡扣、八触点 |
| `art/workbench/keyboard-clean.png` | 1040×520 RGBA | `keyboard-clean:keyboard`：干净键盘底图，污渍不烘焙在设备图内 |
| `art/dirt/dust.png` | 192×192 RGBA | 清洁格透明叠层：不规则灰尘、颗粒与柔边，无棋盘背景 |
| `art/ui/card.png`、`button.png` | 各 192×128 RGBA | 白卡/青绿按钮，源图圆角24 px、微弱阴影和高光；实际Sprite.Type.SLICED保留角部 |
| `art/ui/check.png` | 128×128 RGBA | 成功对勾，只作视觉，不计数 |
| `art/ui/star.png`、`star-empty.png` | 各 128×128 RGBA | 金色实心所得星、浅青灰描边透明空星，无预设星级数值 |
| `art/ui/sound-on.png`、`sound-off.png` | 各 128×128 RGBA | 音效开关，状态还需用文字说明 |

目标剪影与拖拽物件复用同一个 SpriteFrame key，由运行时低饱和/低 alpha 及槽位描边区分，不用中文显示文本查素材。源物件与目标对应，不能用通用方块兜底。表中的稳定标识是映射依据；实际 Inspector 数组顺序与 UUID 以新 Day 5A 资源审计为准。

`ui/card`、`ui/button` 已通过真实 Creator 绑定到卡片与主 CTA，使用 nine-slice：原图192×128，borderLeft/borderRight各32，borderTop/borderBottom各38，Sprite.Type.SLICED。源图24 px圆角不会随整个节点尺寸等比拉长。主按钮最终颜色为青绿PNG基础像素乘以Button状态tint：normal `#FFFFFF`、hover `#EBFFFF`、pressed `#C9EBEB`、disabled `#B6C7C7`，状态过渡0.08秒。

## 原创声音

全部为 22,050 Hz / mono / PCM16 WAV；无压缩库依赖。峰值幅度控制在 0.7 以下，最终建议 AudioSource 音量 0.25。开头 7 ms 渐入、结尾至少 25 ms 渐出，避免点击杂音。

| 路径（相对 assets/audio/sfx） | 秒 | 意图 |
| --- | --- | --- |
| `ui_click.wav` | 0.09 | 开始/下一张/重玩/音效开关点击 |
| `snap_success.wav` | 0.20 | 正确归位、接线成功 |
| `mistake.wav` | 0.17 | 错误释放，低音下降双音 |
| `clean_progress.wav` | 0.10 | 清洁进展，必须限频 |
| `stage_complete.wav` | 0.31 | 清洁完成/多步骤切换 |
| `order_complete.wav` | 0.47 | 单张订单完成 |
| `run_complete.wav` | 0.60 | 九单总结 |

7 个 AudioClip 的真实 Inspector 绑定已由 [Creator 资源审计](validation/day5a/scene-audit.json)核验；首页打开不自动播音，音效开关仅在 session 内生效。交互回归使用实际鼠标点击与拖拽；资源绑定或画面变化不单独作为音频听感证明。

## 切片制作与验证记录

阶段 B 先生成 18 PNG + 18 同几何 SVG 源 + 7 WAV，运行资源约 0.3 MB。素材联系图确认三设备、三种接头轮廓和透明灰尘后，完成三个玩法的真实 Creator Preview 切片；截图见 [拖拽](validation/day5a/screenshots/slice-drag-390x844.jpg)、[接线成功](validation/day5a/screenshots/slice-cable-connected-390x844.jpg)、[清洁前](validation/day5a/screenshots/slice-clean-dirty-390x844.jpg)、[清洁中](validation/day5a/screenshots/slice-clean-half-390x844.jpg)与[85%进度](validation/day5a/screenshots/slice-clean-nearly-390x844.jpg)。85%截图仍有剩余污渍，不标为100%干净。

## 阶段 C 完整素材覆盖

三个真实 Preview 切片通过后，新增 31 PNG 与同几何 SVG，保持原 18 PNG / 7 WAV 的 SHA-256 一致。完整来源清单为 **49 PNG + 49 SVG 源 + 7 WAV**，其中 **56 个运行素材共 908,479 字节**；准确逐文件字节和哈希见来源清单。没有新增音频或第三方素材。

| 新增类别 | visual key / 文件 | 明确造型特征 |
| --- | --- | --- |
| 基础线缆 | `devices/power`、`network`、`usb` | 双插脚与导线；RJ45 卡扣与八触点；USB-A 锁孔与金属舌 |
| 桌面设备 | `devices/router`、`controller`、`speaker` | 双天线与灯；双握柄、摇杆、方向键；木质箱体和双扬声器 |
| 鼠标部件 | `devices/battery`、`wheel` | 圆柱电池与正极；条纹橡胶轮、侧轴与轮毂 |
| 直播设备 | `devices/microphone`、`camera`、`light`、`soundcard` | 麦克风网罩/支架；镜头/夹座；环灯/三脚架；旋钮/音频孔 |
| 电脑部件 | `devices/fan`、`memory`、`drive`、`gpu` | 弯叶风扇/四螺孔；芯片/金手指/缺口；硬盘壳/接口；双风扇/挡板/金手指 |
| 线头与接口 | `ports/{audio,usb,motherboard,cpu,sata,fan}-{head,port}` | 圆形音频、矩形 USB、24 针主板、8 针 CPU、L 键 SATA、4 针风扇；形状和针脚区分，不只依赖颜色 |
| 鼠标清洁底图 | `workbench/mouse-clean`，664×584 | 平滑外壳、按钮分割和滚轮，匹配原 area+32 的332×292显示比例 |
| 机箱清洁底图 | `workbench/case-clean`，984×744 | 大扇叶、主板槽和散热格，匹配原492×372显示比例 |
| 首页插画 | `workbench/home-hero`，1040×640 | 温暖木桌、工作垫、键盘/鼠标/耳机及工具，未烘焙文字 |

新增普通设备仍为384×256，新增接口为256×128。素材阶段查看170 px设备与接口缩略图及首页、清洁完整PNG；随后十九设备、九类接头和三张清洁底图完成实际 Creator 绑定，并在九单十三步中逐一使用。清洁设备底图均无烘焙污渍，透明灰尘格仍由真实计数和淡出控制。完整截图见 [直播四设备](validation/day5a/screenshots/order8-four-items.jpg)、[机箱内部接线](validation/day5a/screenshots/order9-stage2.jpg)、[鼠标清洁前](validation/day5a/screenshots/order6-clean-dirty.jpg)与[清洁中](validation/day5a/screenshots/order6-clean-half.jpg)、[九单总结](validation/day5a/screenshots/full-summary.jpg)、[重玩复位](validation/day5a/screenshots/replay.jpg)。

正式首页已替换为原创维修桌插画，三比例截图分别为 [390×844](validation/day5a/screenshots/home-390x844.jpg)、[768×1024](validation/day5a/screenshots/home-768x1024.jpg)、[1280×720](validation/day5a/screenshots/home-1280x720.jpg)。这些是实际运行画面；未进行物理触屏或平台测试，也未把制作联系图当成运行验收。
