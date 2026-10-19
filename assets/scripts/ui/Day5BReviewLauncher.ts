import { _decorator, Button, Component, Node } from 'cc';
import { BUILD, PREVIEW } from 'cc/env';
import { LevelManager } from '../core/LevelManager';
import { HomeController } from './HomeController';

const { ccclass, property } = _decorator;
/** Explicit developer review controls, removed from interaction in a non-debug build. */
@ccclass('Day5BReviewLauncher')
export class Day5BReviewLauncher extends Component {
    @property(LevelManager) public manager: LevelManager | null = null;
    @property(HomeController) public home: HomeController | null = null;
    @property(Node) public reviewRoot: Node | null = null;
    /** Set only by the local Creator QA workflow; saved production scene keeps false. */
    @property({ tooltip: 'Local QA only; builds always reject this switch.' }) public qaEnabled = false;
    private readonly bindings: { node: Node; callback: () => void }[] = [];
    protected start(): void { this.bind(); }
    protected onEnable(): void { this.bind(); }
    protected onDisable(): void { this.unbind(); }
    protected onDestroy(): void { this.unbind(); }
    private bind(): void {
        this.unbind();
        if (!this.reviewRoot) return;
        this.reviewRoot.active = PREVIEW && !BUILD && this.qaEnabled;
        if (!this.reviewRoot.active) return;
        for (const node of this.reviewRoot.children) {
            const id = Number(node.name.replace('ReviewOrder', ''));
            if (!Number.isInteger(id) || id < 10 || id > 15 || !node.getComponent(Button)) continue;
            const callback = (): void => this.review(id);
            node.on(Button.EventType.CLICK, callback, this); this.bindings.push({ node, callback });
        }
    }
    private review(id: number): void {
        if (!PREVIEW || BUILD || !this.qaEnabled || !this.manager || !this.home) return;
        if (!this.manager.hasStarted) this.home.startRepair();
        if (id > this.manager.totalOrders) return;
        this.manager.stageHost?.resetAll();
        this.manager.runController?.startNewRun();
        this.manager.loadOrder(id - 1);
        if (this.home.overlay) this.home.overlay.active = false;
    }
    private unbind(): void {
        for (const { node, callback } of this.bindings) node.off(Button.EventType.CLICK, callback, this);
        this.bindings.length = 0;
    }
}
