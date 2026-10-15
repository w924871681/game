import { _decorator, Component, isValid, Node, Sprite, SpriteFrame, tween, Tween, Vec3, warn } from 'cc';

const { ccclass, property, disallowMultiple } = _decorator;

/** Decorative stars only: rating and score continue to come from RunController. */
@ccclass('ResultStars')
@disallowMultiple
export class ResultStars extends Component {
    @property([Sprite])
    public starSprites: Sprite[] = [];
    @property(SpriteFrame)
    public earnedFrame: SpriteFrame | null = null;
    @property(SpriteFrame)
    public emptyFrame: SpriteFrame | null = null;

    @property({ min: 0, tooltip: 'Visual-only stagger between earned stars; never changes the rating.' })
    public staggerSeconds: number = 0;

    private readonly baseScales = new Map<Node, Vec3>();
    private readonly ownedTweens: Tween<Node>[] = [];
    private displayed: number = 0;

    public get displayedStars(): number { return this.displayed; }

    public show(stars: number): void {
        this.stopAnimations();
        this.displayed = Number.isFinite(stars) ? Math.max(0, Math.min(3, Math.floor(stars))) : 0;
        if (this.starSprites.length !== 3 || !this.earnedFrame || !this.emptyFrame) {
            warn('[ResultStars] Bind three star Sprites and both earned / empty SpriteFrames.');
            return;
        }
        this.starSprites.forEach((sprite, index) => {
            if (!isValid(sprite)) return;
            const node = sprite.node;
            const base = this.baseScales.get(node) ?? node.scale.clone();
            this.baseScales.set(node, base);
            sprite.spriteFrame = index < this.displayed ? this.earnedFrame : this.emptyFrame;
            if (index < this.displayed && this.enabled) {
                node.setScale(new Vec3(base.x * 0.82, base.y * 0.82, base.z));
                const entrance = tween(node);
                if (this.staggerSeconds > 0 && index > 0) entrance.to(index * this.staggerSeconds,
                    { scale: new Vec3(base.x * 0.82, base.y * 0.82, base.z) });
                this.ownedTweens.push(entrance
                    .to(0.14, { scale: new Vec3(base.x * 1.08, base.y * 1.08, base.z) }, { easing: 'quadOut' })
                    .to(0.1, { scale: base.clone() }, { easing: 'quadInOut' }).start());
            }
        });
    }

    public reset(): void {
        this.stopAnimations();
        this.displayed = 0;
        for (const sprite of this.starSprites) if (isValid(sprite)) sprite.spriteFrame = this.emptyFrame;
    }

    /** Pause decoration without changing the earned rating on an already completed panel. */
    public stopEffects(): void { this.stopAnimations(); }

    protected onDisable(): void { this.stopAnimations(); }
    protected onDestroy(): void { this.stopAnimations(); this.baseScales.clear(); }

    private stopAnimations(): void {
        for (const animation of this.ownedTweens) animation.stop();
        this.ownedTweens.length = 0;
        for (const [node, scale] of this.baseScales) if (isValid(node)) node.setScale(scale);
    }
}
