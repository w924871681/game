import { _decorator, Color, Component, Graphics, isValid, Node, UITransform, Vec3 } from 'cc';
import { CableConnector } from '../gameplay/CableConnector';

const { ccclass, property } = _decorator;

/** Render-only companion. The original connector still owns all coordinates and touch rules. */
@ccclass('V2CableLine')
export class V2CableLine extends Component {
    @property(CableConnector) public connector: CableConnector | null = null;
    @property(Graphics) public artwork: Graphics | null = null;
    @property({}) public refinedStyle: boolean = false;
    @property(Node) public statusLight: Node | null = null;
    private readonly curveStart = new Vec3();
    private readonly curveEnd = new Vec3();
    private last: string = '';

    protected onEnable(): void { this.last = ''; this.refresh(); }
    protected lateUpdate(): void { this.refresh(); }
    protected onDisable(): void { if (isValid(this.artwork)) this.artwork!.clear(); this.last = ''; if (this.statusLight) this.statusLight.active = false; }
    protected onDestroy(): void {
        if (isValid(this.artwork)) {
            this.artwork!.clear();
            // Only our decorative Graphics is moved to the shared underlay.
            if (this.artwork!.node.parent !== this.node) this.artwork!.node.destroy();
        }
        this.artwork = null;
    }

    public refresh(): void {
        const owner = this.connector, art = this.artwork;
        const transform = art?.node.getComponent(UITransform);
        if (!owner?.anchor || !owner.head || !owner.line || !art || !transform) return;
        if (this.refinedStyle) {
            const underlay = this.node.parent?.getChildByName('V21CableArtworkLayer');
            if (underlay && art.node.parent !== underlay) {
                art.node.parent = underlay;
                art.node.setPosition(0, 0, 0);
                this.last = '';
            }
        }
        if (this.statusLight) this.statusLight.active = owner.isConnected;
        transform.convertToNodeSpaceAR(owner.anchor.worldPosition, this.curveStart);
        transform.convertToNodeSpaceAR(owner.head.worldPosition, this.curveEnd);
        // Graphics copies setters into its existing Color. Cache channels, not its mutable identity.
        const color = owner.line.strokeColor;
        const signature = `${this.curveStart.x},${this.curveStart.y},${this.curveEnd.x},${this.curveEnd.y},${color.r},${color.g},${color.b},${color.a}`;
        if (signature === this.last) return;
        this.last = signature;
        art.clear();
        if (this.refinedStyle) {
            this.stroke(art, 21, new Color(54, 36, 26, 38), -4);
            this.stroke(art, 15, new Color(63, 49, 36, 225), 0);
        } else this.stroke(art, 15, new Color(75, 51, 36, 80), -2);
        this.stroke(art, 11, owner.line.strokeColor, 0);
        this.stroke(art, 3, new Color(255, 255, 255, 120), 2);
    }

    private stroke(art: Graphics, width: number, color: Color, offset: number): void {
        const a = this.curveStart, b = this.curveEnd;
        const bend = Math.min(this.refinedStyle ? 150 : 90, Math.abs(b.x - a.x) * (this.refinedStyle ? 0.32 : 0.28));
        const sag = this.refinedStyle ? Math.min(58, Math.hypot(b.x - a.x, b.y - a.y) * 0.085) : 0;
        art.strokeColor = color; art.lineWidth = width;
        art.moveTo(a.x, a.y + offset);
        art.bezierCurveTo(a.x + bend, a.y + offset - sag, b.x - bend, b.y + offset - sag, b.x, b.y + offset);
        art.stroke();
    }
}
