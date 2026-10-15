import { _decorator, Component, Node, UITransform } from 'cc';

const { ccclass, property } = _decorator;

/** Irregular overlapping child art follows the unchanged pooled logical cell. */
@ccclass('V2DirtAppearance')
export class V2DirtAppearance extends Component {
    @property(Node) public dust: Node | null = null;
    private last: string = '';
    protected onEnable(): void { this.last = ''; this.refresh(); }
    protected lateUpdate(): void { this.refresh(); }

    public refresh(): void {
        const parent = this.node.getComponent(UITransform);
        const child = this.dust?.getComponent(UITransform);
        if (!parent || !child) return;
        const p = this.node.position;
        const signature = `${parent.width},${parent.height},${p.x},${p.y}`;
        if (signature === this.last) return;
        this.last = signature;
        child.setContentSize(parent.width * 1.6, parent.height * 1.6);
        const parity = Math.abs(Math.round(p.x * 13 + p.y * 7));
        this.dust!.setScale(parity % 2 ? -1 : 1, parity % 3 ? 1 : -1, 1);
        this.dust!.setPosition((parity % 7) - 3, (parity % 5) - 2, 0);
    }
}
