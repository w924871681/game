import { _decorator, Component, Label, Node } from 'cc';
import type { LevelResult, RunSummary } from '../core/RunController';
import { WorkshopDecoration } from './WorkshopDecoration';

const { ccclass, property, disallowMultiple } = _decorator;

/** Displays frozen results; the shared action Button remains owned by LevelManager. */
@ccclass('V2ResultView')
@disallowMultiple
export class V2ResultView extends Component {
    @property(Node) public orderGroup: Node | null = null;
    @property(Node) public finalGroup: Node | null = null;
    @property(Node) public starContainer: Node | null = null;
    @property(Node) public modalShade: Node | null = null;
    @property(Node) public primaryButtonRoot: Node | null = null;
    @property(Label) public orderBadgeLabel: Label | null = null;
    @property(Label) public scoreLabel: Label | null = null;
    @property(Label) public timeLabel: Label | null = null;
    @property(Label) public mistakeLabel: Label | null = null;
    @property(Label) public stepsLabel: Label | null = null;
    @property(Label) public summaryOrdersLabel: Label | null = null;
    @property(Label) public summaryStarsLabel: Label | null = null;
    @property(Label) public summaryScoreLabel: Label | null = null;
    @property(Label) public summaryStepsLabel: Label | null = null;
    @property(Label) public summaryTimeLabel: Label | null = null;
    @property(Label) public summaryMistakesLabel: Label | null = null;
    @property(WorkshopDecoration) public orderDecoration: WorkshopDecoration | null = null;
    @property(WorkshopDecoration) public finalDecoration: WorkshopDecoration | null = null;
    @property({}) public orderButtonY: number = -286;
    @property({}) public finalButtonY: number = -436;

    public showOrder(result: LevelResult, orderNumber: number, totalSteps: number): void {
        this.stopEffects();
        if (this.modalShade) this.modalShade.active = true;
        if (this.finalGroup) this.finalGroup.active = false;
        if (this.orderGroup) this.orderGroup.active = true;
        if (this.starContainer) this.starContainer.active = true;
        if (this.orderBadgeLabel) this.orderBadgeLabel.string = `完成订单 ${orderNumber}`;
        if (this.scoreLabel) this.scoreLabel.string = `${result.score}`;
        if (this.timeLabel) this.timeLabel.string = `${(result.elapsedMs / 1000).toFixed(1)} 秒`;
        if (this.mistakeLabel) this.mistakeLabel.string = `${result.mistakes} 次`;
        if (this.stepsLabel) this.stepsLabel.string = `完成步骤 ${totalSteps} / ${totalSteps}`;
        this.positionAction(this.orderButtonY);
        this.orderDecoration?.play();
    }

    public showRun(summary: RunSummary, orderCount: number, completedSteps: number, totalSteps: number): void {
        this.stopEffects();
        if (this.modalShade) this.modalShade.active = true;
        if (this.orderGroup) this.orderGroup.active = false;
        if (this.finalGroup) this.finalGroup.active = true;
        if (this.starContainer) this.starContainer.active = false;
        if (this.summaryOrdersLabel) this.summaryOrdersLabel.string = `${summary.completedOrders} / ${orderCount}`;
        if (this.summaryStarsLabel) this.summaryStarsLabel.string = `${summary.earnedStars} / ${orderCount * 3}`;
        if (this.summaryScoreLabel) this.summaryScoreLabel.string = `${summary.totalScore}`;
        if (this.summaryStepsLabel) this.summaryStepsLabel.string = `${completedSteps} / ${totalSteps}`;
        if (this.summaryTimeLabel) this.summaryTimeLabel.string = `${(summary.totalElapsedMs / 1000).toFixed(1)} 秒`;
        if (this.summaryMistakesLabel) this.summaryMistakesLabel.string = `${summary.totalMistakes} 次`;
        this.positionAction(this.finalButtonY);
        this.finalDecoration?.play();
    }

    public hide(): void {
        this.stopEffects();
        if (this.modalShade) this.modalShade.active = false;
        if (this.orderGroup) this.orderGroup.active = false;
        if (this.finalGroup) this.finalGroup.active = false;
    }

    public stopEffects(): void {
        this.orderDecoration?.stopEffects();
        this.finalDecoration?.stopEffects();
    }

    protected onDisable(): void { this.stopEffects(); if (this.modalShade) this.modalShade.active = false; }
    protected onDestroy(): void { this.stopEffects(); if (this.modalShade) this.modalShade.active = false; }

    private positionAction(y: number): void {
        const node = this.primaryButtonRoot;
        if (node) node.setPosition(node.position.x, y, node.position.z);
    }
}
