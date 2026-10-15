import { _decorator, Color, Component, Graphics, Label, Node, Sprite, SpriteFrame, tween, Tween, UITransform, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

// Display aliases only. VisualCatalog supplies these stable keys; catalog labels and IDs stay intact.
const SMALL_SCREEN_CAPTIONS: Readonly<Record<string, string>> = Object.freeze({
    'devices/microphone': '麦克风', 'devices/camera': '摄像头', 'devices/light': '补光灯', 'devices/soundcard': '声卡',
    'devices/fan': '风扇', 'devices/memory': '内存', 'devices/drive': '硬盘', 'devices/gpu': '显卡',
    'ports/motherboard-head': '主板线', 'ports/motherboard-port': '主板口',
    'ports/cpu-head': 'CPU线', 'ports/cpu-port': 'CPU口',
    'ports/sata-head': '硬盘线', 'ports/sata-port': '硬盘口',
    'ports/fan-head': '风扇线', 'ports/fan-port': '风扇口',
    'ports/power-head': '电源线', 'ports/power-port': '电源口',
    'ports/display-head': '显示线', 'ports/display-port': '显示口',
    'ports/usb-port': 'USB口',
});

/** Only child decoration changes. The owning input node and its transform are untouched. */
@ccclass('ElementVisual')
export class ElementVisual extends Component {
    @property(Sprite)
    public icon: Sprite | null = null;

    @property(Label)
    public caption: Label | null = null;

    @property(Node)
    public checkMarker: Node | null = null;

    @property(Sprite)
    public surface: Sprite | null = null;

    @property(Graphics)
    public outline: Graphics | null = null;

    @property(Node)
    public highlight: Node | null = null;

    @property({ tooltip: 'V2.1 child artwork layout; never resizes the owning hitbox.' })
    public refinedLayout: boolean = false;

    @property({ tooltip: 'V2.2 child captions for crowded devices and cable endpoints; input geometry is unchanged.' })
    public smallScreenLegibility: boolean = false;

    private key: string = '';
    private completed: boolean = false;
    private decoration: Tween<Node> | null = null;

    public get visualKey(): string { return this.key; }
    public get isComplete(): boolean { return this.completed; }

    public configure(frame: SpriteFrame, key: string, text: string, width: number, height: number, muted: boolean): void {
        if (!this.icon || !this.caption || !this.checkMarker) {
            throw new Error('[ElementVisual] Bind icon, caption and checkMarker in the element Prefab.');
        }
        this.resetVisual();
        this.key = key;
        this.icon.node.active = true;
        this.icon.spriteFrame = frame;
        this.icon.sizeMode = Sprite.SizeMode.CUSTOM;
        this.icon.type = Sprite.Type.SIMPLE;
        this.icon.color = muted ? (this.refinedLayout ? new Color(61, 123, 125, 170) : new Color(107, 154, 158, 115)) : new Color(255, 255, 255, 255);
        const cable = key.startsWith('ports/');
        const iconHeight = this.refinedLayout ? height - (cable ? 16 : 32) : height - (height <= 80 ? 34 : 46);
        const iconWidth = width - (this.refinedLayout ? 8 : 16);
        const ratio = frame.originalSize.width / Math.max(1, frame.originalSize.height);
        const h = Math.min(iconHeight, iconWidth / ratio);
        this.icon.node.getComponent(UITransform)?.setContentSize(h * ratio, h);
        this.icon.node.setPosition(0, this.refinedLayout ? (cable ? 16 : 12) : 14, 0);
        this.caption.string = this.refinedLayout && cable ? text.replace('接口', '口') : text;
        this.caption.fontSize = this.refinedLayout ? (width <= 140 ? 24 : 26) : width <= 140 ? 20 : 22;
        this.caption.lineHeight = this.caption.fontSize + 3;
        this.caption.color = new Color(38, 61, 80, 255);
        this.caption.node.setPosition(0, -height / 2 + (this.refinedLayout ? 12 : 16), 0);
        this.caption.node.getComponent(UITransform)?.setContentSize(width - (this.refinedLayout ? 8 : 10), this.refinedLayout ? 30 : 26);
        if (this.refinedLayout && this.smallScreenLegibility && (cable || width <= 140)) {
            this.layoutSmallScreenCaption(key, text, width, height, cable);
        }
        this.checkMarker.setPosition(width / 2 - 8, height / 2 - 4, 0);
        if (this.surface) {
            this.surface.node.getComponent(UITransform)?.setContentSize(width, height);
            this.surface.color = muted ? new Color(185, 227, 209, 230)
                : key.startsWith('ports/') ? this.node.getComponent(Sprite)?.color ?? new Color(255, 255, 255)
                    : new Color(255, 255, 255);
        }
        if (this.highlight) this.highlight.getComponent(UITransform)?.setContentSize(width + 8, height + 8);
        this.drawSlot(width, height, muted);
    }

    public showComplete(): void {
        if (this.completed || !this.checkMarker) return;
        this.completed = true;
        this.stopDecoration();
        if (this.highlight) this.highlight.active = true;
        this.checkMarker.active = true;
        this.checkMarker.setScale(0.7, 0.7, 1);
        this.decoration = tween(this.checkMarker)
            .to(0.12, { scale: new Vec3(1.15, 1.15, 1) })
            .to(0.10, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    public resetVisual(): void {
        this.stopDecoration();
        this.completed = false;
        if (this.highlight) this.highlight.active = false;
        if (this.checkMarker) {
            this.checkMarker.active = false;
            this.checkMarker.setScale(1, 1, 1);
        }
    }

    public hideArtwork(): void {
        this.resetVisual();
        if (this.icon) this.icon.node.active = false;
        this.key = '';
    }

    public stopDecoration(): void {
        this.decoration?.stop();
        this.decoration = null;
    }

    protected onDisable(): void { this.stopDecoration(); }
    protected onDestroy(): void { this.stopDecoration(); }

    private layoutSmallScreenCaption(key: string, text: string, width: number, height: number, cable: boolean): void {
        const icon = this.icon!, caption = this.caption!;
        caption.string = SMALL_SCREEN_CAPTIONS[key] ?? (cable ? text.replace('接口', '口') : text);
        caption.fontSize = 28;
        caption.lineHeight = 32;
        caption.color = new Color(30, 54, 64, 255);
        if (cable) {
            // The two captions remain separate even after the real Head snaps onto its Port.
            // Keep the first four-cable row below the existing HUD without moving an input root.
            const head = key.endsWith('-head');
            const ratio = icon.spriteFrame!.originalSize.width / Math.max(1, icon.spriteFrame!.originalSize.height);
            const h = Math.min(height - 24, (width - 8) / ratio);
            icon.node.getComponent(UITransform)?.setContentSize(h * ratio, h);
            icon.node.setPosition(0, -10, 0);
            caption.node.setPosition(0, head ? 36 : -58, 0);
            caption.node.getComponent(UITransform)?.setContentSize(width - 8, head ? 32 : 34);
        } else {
            // Retain the cropped device size; add separation from the stronger caption below.
            icon.node.setPosition(0, 20, 0);
            caption.node.getComponent(UITransform)?.setContentSize(width - 8, 34);
        }
    }

    private drawSlot(width: number, height: number, muted: boolean): void {
        const art = this.outline;
        if (!art) return;
        art.clear();
        if (!muted) return;
        art.strokeColor = new Color(76, 201, 164, 230);
        art.lineWidth = 2;
        const x = width / 2 - 6, y = height / 2 - 6;
        for (let a = -x + 8; a < x - 8; a += 16) {
            art.moveTo(a, y); art.lineTo(Math.min(a + 9, x - 8), y);
            art.moveTo(a, -y); art.lineTo(Math.min(a + 9, x - 8), -y);
        }
        for (let a = -y + 8; a < y - 8; a += 16) {
            art.moveTo(x, a); art.lineTo(x, Math.min(a + 9, y - 8));
            art.moveTo(-x, a); art.lineTo(-x, Math.min(a + 9, y - 8));
        }
        art.stroke();
    }
}
