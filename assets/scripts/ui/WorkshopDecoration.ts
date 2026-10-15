import { _decorator, Component, isValid, Node, tween, Tween, Vec3 } from 'cc';

const { ccclass, property, disallowMultiple } = _decorator;

/** One bounded, owned decorative entrance/float. It never emits gameplay callbacks. */
@ccclass('WorkshopDecoration')
@disallowMultiple
export class WorkshopDecoration extends Component {
    @property(Node) public visualRoot: Node | null = null;
    @property({}) public floatAmplitude: number = 6;
    @property({}) public enterSeconds: number = 0.35;
    @property({}) public floatSeconds: number = 2.2;

    private target: Node | null = null;
    private basePosition: Vec3 | null = null;
    private baseScale: Vec3 | null = null;
    private animation: Tween<Node> | null = null;

    protected onEnable(): void { this.play(); }
    protected onDisable(): void { this.stopEffects(); }
    protected onDestroy(): void { this.stopEffects(); }

    public play(): void {
        this.stopEffects();
        const target = this.visualRoot;
        if (!this.enabledInHierarchy || !isValid(target) || target === this.node) return;
        if (target !== this.target) {
            this.target = target;
            this.basePosition = target!.position.clone();
            this.baseScale = target!.scale.clone();
        }
        const base = this.baseScale!, position = this.basePosition!;
        target!.setScale(base.x * 0.96, base.y * 0.96, base.z);
        this.animation = tween(target!)
            .to(Math.max(0.01, this.enterSeconds), { scale: base.clone() }, { easing: 'quadOut' })
            .to(Math.max(0.01, this.floatSeconds / 2), { position: new Vec3(position.x, position.y + this.floatAmplitude, position.z) }, { easing: 'sineInOut' })
            .to(Math.max(0.01, this.floatSeconds / 2), { position: position.clone() }, { easing: 'sineInOut' })
            .start();
    }

    public stopEffects(): void {
        this.animation?.stop();
        this.animation = null;
        if (isValid(this.target) && this.basePosition && this.baseScale) {
            this.target!.setPosition(this.basePosition);
            this.target!.setScale(this.baseScale);
        }
    }
}
