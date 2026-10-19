import { _decorator, CCString, Color, Component, Graphics, Label, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import type { Day5BDevice } from '../data/Day5BStageDefinition';
import { DAY5B_VISUAL_KEYS, day5BDeviceKey } from './Day5BVisualCatalog';

const { ccclass, property } = _decorator;
export type Day5BControlState = 'neutral' | 'active' | 'error' | 'success';

interface ControlRecord {
    readonly node: Node;
    readonly art: Graphics;
    readonly text: Label;
    width: number;
    height: number;
}

/** Native UI decoration only. Controllers own all input listeners and gameplay state. */
@ccclass('Day5BStageView')
export class Day5BStageView extends Component {
    @property(Sprite) public deviceSprite: Sprite | null = null;
    @property(Node) public controlLayer: Node | null = null;
    @property(Graphics) public overlay: Graphics | null = null;
    @property(Label) public hintLabel: Label | null = null;
    @property(Label) public feedbackLabel: Label | null = null;
    @property([CCString]) public keys: string[] = [];
    @property([SpriteFrame]) public frames: SpriteFrame[] = [];

    private readonly controls = new Map<string, ControlRecord>();
    private readonly captions = new Map<string, Label>();
    private readonly layers = new Map<string, Sprite>();
    private readonly presses = new Map<string, { time: number; error: boolean }>();
    private readonly lifts = new Map<Node, { elapsed: number; x: number; y: number; distance: number }>();

    public get deviceNode(): Node {
        if (!this.deviceSprite) throw new Error('[Day5BStageView] Bind deviceSprite in the saved Prefab.');
        return this.deviceSprite.node;
    }

    public reset(device: Day5BDevice): void {
        this.assertBindings();
        this.presses.clear(); this.lifts.clear();
        for (const item of this.controls.values()) item.node.active = false;
        for (const item of this.captions.values()) item.node.active = false;
        for (const item of this.layers.values()) item.node.active = false;
        this.overlay!.clear();
        this.hintLabel!.string = '';
        this.feedbackLabel!.string = '';
        this.hintLabel!.node.setPosition(0, -330, 0);
        this.feedbackLabel!.node.setPosition(0, -390, 0);
        this.configureLabel(this.hintLabel!, 28, 640, 52);
        this.configureLabel(this.feedbackLabel!, 26, 640, 36);
        const sprite = this.deviceSprite!;
        sprite.node.active = true;
        sprite.node.setPosition(0, 120, 0);
        sprite.node.setScale(1, 1, 1);
        sprite.spriteFrame = this.requireFrame(day5BDeviceKey(device));
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.type = Sprite.Type.SIMPLE;
        sprite.color = new Color(255, 255, 255, 255);
        this.transform(sprite.node).setContentSize(560, 560 * sprite.spriteFrame.originalSize.height / sprite.spriteFrame.originalSize.width);
    }

    public control(id: string, x: number, y: number, width: number, height: number, text: string): Node {
        const parent = this.requireControlLayer();
        let record = this.controls.get(id);
        if (!record) {
            const node = this.child(parent, `Control-${id}`);
            const art = node.addComponent(Graphics);
            const textNode = this.child(node, 'Caption');
            const label = textNode.addComponent(Label);
            record = { node, art, text: label, width, height };
            this.controls.set(id, record);
        }
        record.node.active = true;
        record.node.setPosition(x, y, 0);
        record.node.setScale(1, 1, 1);
        record.width = width;
        record.height = height;
        this.transform(record.node).setContentSize(width, height);
        this.configureLabel(record.text, 32, width - 10, height - 8);
        record.text.string = text;
        record.text.node.setPosition(0, 0, 0);
        this.setControlState(id, 'neutral');
        return record.node;
    }

    public caption(id: string, text: string, x: number, y: number, width: number = 620, height: number = 52, font: number = 28): Label {
        let label = this.captions.get(id);
        if (!label) {
            label = this.child(this.requireControlLayer(), `Text-${id}`).addComponent(Label);
            this.captions.set(id, label);
        }
        label.node.active = true;
        label.node.setPosition(x, y, 0);
        this.configureLabel(label, font, width, height);
        label.string = text;
        return label;
    }

    public layer(key: string, id: string, x: number, y: number, width: number, height: number): Node {
        const frame = this.requireFrame(key);
        let sprite = this.layers.get(id);
        if (!sprite) {
            sprite = this.child(this.requireControlLayer(), `Layer-${id}`).addComponent(Sprite);
            this.layers.set(id, sprite);
        }
        sprite.node.active = true;
        sprite.node.setPosition(x, y, 0);
        sprite.node.setScale(1, 1, 1);
        sprite.spriteFrame = frame;
        sprite.type = Sprite.Type.SIMPLE;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.color = new Color(255, 255, 255, 255);
        this.transform(sprite.node).setContentSize(width, height);
        return sprite.node;
    }

    public setControlState(id: string, state: Day5BControlState): void {
        const record = this.controls.get(id);
        if (!record) throw new Error(`[Day5BStageView] Unknown control ${id}.`);
        const fill = state === 'success' ? new Color(190, 231, 191, 245)
            : state === 'error' ? new Color(255, 207, 181, 245)
                : state === 'active' ? new Color(245, 218, 141, 248) : new Color(255, 243, 214, 242);
        const stroke = state === 'success' ? new Color(49, 122, 82, 255)
            : state === 'error' ? new Color(177, 77, 61, 255)
                : new Color(117, 101, 72, 255);
        const art = record.art;
        art.clear();
        art.fillColor = new Color(75, 64, 43, 42);
        this.roundRect(art, -record.width / 2 + 3, -record.height / 2 - 5, record.width, record.height, 16);
        art.fill();
        art.fillColor = fill;
        art.strokeColor = stroke;
        art.lineWidth = state === 'neutral' ? 3 : 5;
        this.roundRect(art, -record.width / 2, -record.height / 2, record.width, record.height, 16);
        art.fill(); art.stroke();
        record.text.color = new Color(46, 76, 67, 255);
    }

    public hint(text: string): void {
        if (!this.hintLabel) throw new Error('[Day5BStageView] Missing hintLabel.');
        this.hintLabel.string = text;
    }

    public feedback(text: string, state: Day5BControlState = 'neutral'): void {
        if (!this.feedbackLabel) throw new Error('[Day5BStageView] Missing feedbackLabel.');
        this.feedbackLabel.string = text;
        this.feedbackLabel.color = state === 'error' ? new Color(166, 67, 49, 255)
            : state === 'success' ? new Color(40, 117, 75, 255) : new Color(50, 81, 69, 255);
    }

    /** Animate decoration only: hit regions never move or change size. */
    public press(id: string, error: boolean = false): void { this.presses.set(id, { time: 0, error }); }
    public lift(node: Node, distance: number): void {
        this.lifts.set(node, { elapsed: 0, x: node.position.x, y: node.position.y, distance });
    }
    protected update(dt: number): void {
        if (!Number.isFinite(dt) || dt <= 0) return;
        for (const [id, animation] of this.presses) {
            const text = this.controls.get(id)?.text.node;
            animation.time = Math.min(.3, animation.time + dt);
            if (text) text.setPosition(animation.error ? Math.sin(animation.time * 65) * 7 * (1-animation.time/.3) : 0,
                animation.error ? 0 : -7*Math.sin(Math.PI*animation.time/.3), 0);
            if (animation.time >= .3) this.presses.delete(id);
        }
        for (const [node, animation] of this.lifts) {
            animation.elapsed = Math.min(.35, animation.elapsed + dt);
            const t = animation.elapsed/.35;
            node.setPosition(animation.x, animation.y + animation.distance*(1-(1-t)*(1-t)), 0);
            if (t >= 1) this.lifts.delete(node);
        }
    }

    private assertBindings(): void {
        if (!this.deviceSprite || !this.controlLayer || !this.overlay || !this.hintLabel || !this.feedbackLabel) {
            throw new Error('[Day5BStageView] Bind deviceSprite, controlLayer, overlay, hintLabel and feedbackLabel in Creator.');
        }
        if (this.keys.length !== this.frames.length || new Set(this.keys).size !== this.keys.length) {
            throw new Error('[Day5BStageView] Visual keys/frames must be paired and unique.');
        }
        for (const key of DAY5B_VISUAL_KEYS) this.requireFrame(key);
    }

    private requireFrame(key: string): SpriteFrame {
        const index = this.keys.indexOf(key);
        const frame = index < 0 ? null : this.frames[index];
        if (!frame) throw new Error(`[Day5BStageView] Missing saved SpriteFrame for ${key}.`);
        return frame;
    }

    private requireControlLayer(): Node {
        if (!this.controlLayer) throw new Error('[Day5BStageView] Missing controlLayer.');
        return this.controlLayer;
    }

    private child(parent: Node, name: string): Node {
        const child = new Node(name);
        child.layer = parent.layer;
        parent.addChild(child);
        child.addComponent(UITransform);
        return child;
    }

    private transform(node: Node): UITransform {
        return node.getComponent(UITransform) ?? node.addComponent(UITransform);
    }

    private configureLabel(label: Label, font: number, width: number, height: number): void {
        label.fontSize = font;
        label.lineHeight = font + 5;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        label.enableWrapText = true;
        label.color = new Color(46, 76, 67, 255);
        this.transform(label.node).setContentSize(width, height);
    }

    private roundRect(art: Graphics, x: number, y: number, width: number, height: number, radius: number): void {
        const r = Math.min(radius, width / 2, height / 2), k = 0.55228475;
        art.moveTo(x + r, y); art.lineTo(x + width - r, y);
        art.bezierCurveTo(x + width - r + r*k, y, x + width, y + r - r*k, x + width, y + r);
        art.lineTo(x + width, y + height - r);
        art.bezierCurveTo(x + width, y + height - r + r*k, x + width - r + r*k, y + height, x + width - r, y + height);
        art.lineTo(x + r, y + height);
        art.bezierCurveTo(x + r - r*k, y + height, x, y + height - r + r*k, x, y + height - r);
        art.lineTo(x, y + r);
        art.bezierCurveTo(x, y + r - r*k, x + r - r*k, y, x + r, y);
    }
}
