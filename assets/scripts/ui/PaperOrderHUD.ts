import { _decorator, Component, Label, Node, UITransform } from 'cc';
import type { OrderDefinition } from '../data/OrderDefinition';
import type { StageKind } from '../data/StageDefinition';
import type { StageProgress } from '../stages/StageRuntime';

const { ccclass, property, disallowMultiple } = _decorator;

/** A view of the current order. It owns no clock, score, input or stage state. */
@ccclass('PaperOrderHUD')
@disallowMultiple
export class PaperOrderHUD extends Component {
    @property(Label) public chapterLabel: Label | null = null;
    @property(Label) public orderLabel: Label | null = null;
    @property(Label) public titleLabel: Label | null = null;
    @property(Label) public stepLabel: Label | null = null;
    @property(Label) public instructionLabel: Label | null = null;
    @property(Label) public progressLabel: Label | null = null;
    @property(Label) public cleanPercentLabel: Label | null = null;
    @property(Node) public dragGroup: Node | null = null;
    @property(Node) public cableGroup: Node | null = null;
    @property(Node) public cleanGroup: Node | null = null;
    @property(UITransform) public cleanTrack: UITransform | null = null;
    @property(UITransform) public cleanFill: UITransform | null = null;

    private kind: StageKind | null = null;
    private cleanRatio: number = 0;
    private trackWidth: number = -1;

    public showStage(order: OrderDefinition, orderIndex: number, orderCount: number, stageIndex: number): void {
        const stage = order.stages[stageIndex];
        if (!stage) return;
        this.kind = stage.kind;
        if (this.chapterLabel) this.chapterLabel.string = order.chapterTitle;
        if (this.orderLabel) this.orderLabel.string = `订单 ${orderIndex + 1} / ${orderCount}`;
        if (this.titleLabel) this.titleLabel.string = order.title;
        if (this.stepLabel) this.stepLabel.string = `步骤 ${stageIndex + 1} / ${order.stages.length}`;
        if (this.instructionLabel) this.instructionLabel.string = stage.instruction;
        if (this.dragGroup) this.dragGroup.active = stage.kind === 'drag-match';
        if (this.cableGroup) this.cableGroup.active = stage.kind === 'cable-connect';
        if (this.cleanGroup) this.cleanGroup.active = stage.kind === 'clean-swipe';
        if (this.progressLabel) this.progressLabel.node.active = stage.kind !== 'clean-swipe';
        if (this.cleanPercentLabel) this.cleanPercentLabel.node.active = stage.kind === 'clean-swipe';
        this.showProgress({ completed: 0, total: 0 });
    }

    public showProgress(progress: StageProgress): void {
        const total = Number.isFinite(progress.total) ? Math.max(0, Math.floor(progress.total)) : 0;
        const completed = Number.isFinite(progress.completed) ? Math.max(0, Math.min(total, Math.floor(progress.completed))) : 0;
        if (this.kind === 'clean-swipe') {
            this.cleanRatio = total > 0 ? completed / total : 0;
            if (this.cleanPercentLabel) this.cleanPercentLabel.string = `清洁进度 ${Math.floor(this.cleanRatio * 100)}%`;
            // No second percentage or stale drag/cable count on the paper card.
            if (this.progressLabel) this.progressLabel.string = '';
            this.refreshLayout();
        } else if (this.progressLabel) {
            this.progressLabel.string = `${this.kind === 'cable-connect' ? '已连接' : '已归位'} ${completed} / ${total}`;
        }
    }

    /** The fill is a left-anchored decoration; its input-independent width follows its track. */
    public refreshLayout(): void {
        if (!this.cleanTrack || !this.cleanFill) return;
        this.trackWidth = Math.max(0, this.cleanTrack.width);
        this.cleanFill.setContentSize(this.trackWidth * this.cleanRatio, this.cleanFill.height);
    }

    public clear(): void {
        this.kind = null;
        this.cleanRatio = 0;
        if (this.dragGroup) this.dragGroup.active = false;
        if (this.cableGroup) this.cableGroup.active = false;
        if (this.cleanGroup) this.cleanGroup.active = false;
        for (const label of [this.progressLabel, this.cleanPercentLabel]) if (label) label.string = '';
        this.refreshLayout();
    }

    protected lateUpdate(): void {
        if (this.kind === 'clean-swipe' && this.cleanTrack && this.cleanTrack.width !== this.trackWidth) this.refreshLayout();
    }
}
