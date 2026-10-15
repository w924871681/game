import { _decorator, Button, Component, EventTouch, isValid, Node, tween, Tween, Vec3 } from 'cc';

const { ccclass, property, disallowMultiple } = _decorator;

/** Listens on the existing Button; only a non-input child decoration is scaled. */
@ccclass('ButtonPressFeedback')
@disallowMultiple
export class ButtonPressFeedback extends Component {
    @property(Button) public button: Button | null = null;
    @property(Node) public visualRoot: Node | null = null;

    private listenerNode: Node | null = null;
    private visual: Node | null = null;
    private baseScale: Vec3 | null = null;
    private touchId: number | null = null;
    private animation: Tween<Node> | null = null;

    protected onEnable(): void { this.bind(); }
    protected onDisable(): void { this.cleanup(); }
    protected onDestroy(): void { this.cleanup(); }

    private bind(): void {
        const input = this.button?.node, visual = this.visualRoot;
        if (input === this.listenerNode && visual === this.visual) return;
        this.cleanup();
        if (!input || !isValid(visual) || visual === input) return;
        let ancestor = visual!.parent;
        while (ancestor && ancestor !== input) ancestor = ancestor.parent;
        if (!ancestor) return;
        this.listenerNode = input;
        this.visual = visual;
        this.baseScale = visual!.scale.clone();
        input.on(Node.EventType.TOUCH_START, this.onPress, this);
        input.on(Node.EventType.TOUCH_END, this.onRelease, this);
        input.on(Node.EventType.TOUCH_CANCEL, this.onRelease, this);
    }

    private onPress(event: EventTouch): void {
        if (!this.enabledInHierarchy || !this.button?.enabledInHierarchy || !this.button.interactable || this.touchId !== null) return;
        const id = event.getID();
        if (id === null || id === undefined) return;
        this.touchId = id;
        this.animate(0.97, 0.06);
    }

    private onRelease(event: EventTouch): void {
        if (this.touchId === null || event.getID() !== this.touchId) return;
        this.touchId = null;
        this.animate(1, 0.10);
    }

    private animate(factor: number, duration: number): void {
        this.animation?.stop();
        if (!isValid(this.visual) || !this.baseScale) return;
        const base = this.baseScale;
        this.animation = tween(this.visual!).to(duration, { scale: new Vec3(base.x * factor, base.y * factor, base.z) }, { easing: 'quadOut' }).start();
    }

    private cleanup(): void {
        this.listenerNode?.off(Node.EventType.TOUCH_START, this.onPress, this);
        this.listenerNode?.off(Node.EventType.TOUCH_END, this.onRelease, this);
        this.listenerNode?.off(Node.EventType.TOUCH_CANCEL, this.onRelease, this);
        this.listenerNode = null;
        this.touchId = null;
        this.animation?.stop();
        this.animation = null;
        if (isValid(this.visual) && this.baseScale) this.visual!.setScale(this.baseScale);
    }
}
