# Day5B 分层素材清单

权威逐文件清单：`tools/art/day5b/asset-sources.json`，含每个PNG及SVG源稿的尺寸、字节数、SHA256、稳定key和来源。15张透明PNG共622,792字节，由真实Creator导入并生成meta/SpriteFrame。

| 命名空间 | 数量 | 内容 |
| --- | --- | --- |
| day5b/devices | 6 | controller、printer、keyboard、fan、headset、livestream |
| day5b/layers | 9 | joystick、paper-crumpled、paper-test、keycap、screw、fan-blades、fan-cover、trace-handle、slider-thumb |

运行路径 `assets/art/day5b/`；可编辑源稿 `tools/art/day5b/sources/`；映射 `assets/scripts/visuals/Day5BVisualCatalog.ts`。使用稳定ID，不从中文显示文字反推答案或key。

六张用户参考效果图完整保留于 `docs/design/day5b/`，用于造型、配色与构图参考，没有把整幅参考图或其中的文字裁成可交互界面。原V2.2背景、维修员、HUD、结算和全部旧美术资源保持。

控件、刻度、路径检查点、障碍、波形、数字、进度与成功反馈由Cocos节点/Graphics/Label实时绘制。纸张随手柄移动，螺丝与护盖抬起，风扇叶片旋转；部分细节图层作为可复用备用帧保存，实际命中区域和判定不依赖装饰图片。

这是可玩的原创 **2D Q版分层近似**，未达到参考图的3D/半写实材质精度。没有下载第三方图、字体或音效，不更改项目原许可。

重现：`python tools/art/day5b/generate_day5b.py`；只读校验：追加 `--verify`。校验不修改旧素材、Creator资源或meta。
