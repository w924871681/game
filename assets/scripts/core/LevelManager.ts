import { _decorator, Button, Component, isValid, Label, Node, tween, Tween, Vec3, warn } from 'cc';
import { ORDER_CATALOG, validateOrderCatalog } from '../data/OrderCatalog';
import type { OrderDefinition } from '../data/OrderDefinition';
import type { StageKind } from '../data/StageDefinition';
import { StageHost } from '../stages/StageHost';
import type { StageCallbacks, StageProgress } from '../stages/StageRuntime';
import { formatStars, RunController } from './RunController';
import type { LevelResult, RunSummary } from './RunController';

const { ccclass, property, disallowMultiple } = _decorator;

export enum GameState { Playing, LevelComplete, DemoComplete }

export function formatStageProgress(kind: StageKind, progress: StageProgress): string {
    if (kind === 'drag-match') return `已归位 ${progress.completed} / ${progress.total}`;
    if (kind === 'cable-connect') return `已连接 ${progress.completed} / ${progress.total}`;
    const percent = progress.total > 0 ? Math.floor(progress.completed / progress.total * 100) : 0;
    return `清洁进度 ${Math.max(0, Math.min(100, percent))}%`;
}

@ccclass('LevelManager')
@disallowMultiple
export class LevelManager extends Component {
    @property(RunController)
    public runController: RunController | null = null;
    @property(StageHost)
    public stageHost: StageHost | null = null;
    @property(Label)
    public chapterLabel: Label | null = null;
    @property(Label)
    public levelLabel: Label | null = null;
    @property(Label)
    public levelTitleLabel: Label | null = null;
    @property(Label)
    public stageLabel: Label | null = null;
    @property(Label)
    public statusLabel: Label | null = null;
    @property(Node)
    public tutorialHint: Node | null = null;
    @property(Label)
    public tutorialLabel: Label | null = null;
    @property(Node)
    public completePanel: Node | null = null;
    @property(Label)
    public completeLabel: Label | null = null;
    @property(Label)
    public completeDetailLabel: Label | null = null;
    @property(Button)
    public nextButton: Button | null = null;
    @property(Label)
    public actionButtonLabel: Label | null = null;

    public orders: readonly OrderDefinition[] = ORDER_CATALOG;
    private orderIndex: number = 0;
    private stageIndex: number = 0;
    private orderGeneration: number = 0;
    private stageGeneration: number = 0;
    private gameState: GameState = GameState.Playing;
    private initialized: boolean = false;
    private buttonNode: Node | null = null;
    private panelTween: Tween<Node> | null = null;
    private readonly panelScale: Vec3 = new Vec3(1, 1, 1);
    private readonly seenTutorials = new Set<StageKind>();
    private installedCallbacks: StageCallbacks | null = null;

    public get currentOrderIndex(): number { return this.orderIndex; }
    public get currentLevelIndex(): number { return this.orderIndex; }
    public get currentStageIndex(): number { return this.stageIndex; }
    public get totalOrders(): number { return this.orders.length; }
    public get totalStagesInCurrentOrder(): number { return this.orders[this.orderIndex]?.stages.length ?? 0; }
    public get state(): GameState { return this.gameState; }

    protected start(): void {
        if (!this.hasBindings()) return;
        this.loadOrder(0);
    }

    protected onEnable(): void {
        this.bindNextButton();
        if (this.initialized && this.gameState === GameState.Playing) {
            this.stageGeneration += 1;
            this.installedCallbacks = this.makeCallbacks();
            this.stageHost?.resumeStage(this.installedCallbacks);
            this.runController?.skipNextFrame();
            this.runController?.resume();
        }
    }

    protected onDisable(): void { this.suspend(); }

    protected onDestroy(): void {
        this.suspend();
        this.stageHost?.releaseCache();
    }

    public loadLevel(index: number): void { this.loadOrder(index); }

    public loadOrder(index: number): void {
        if (!Number.isInteger(index) || index < 0 || index >= this.orders.length) {
            warn(`[LevelManager] Invalid order index: ${index}`);
            return;
        }
        validateOrderCatalog(this.orders);
        if (!this.hasBindings()) return;
        const run = this.runController!;
        const order = this.orders[index];
        if (run.levelResults.some((result) => result.levelId === order.id)) {
            warn('[LevelManager] Restart the completed order before loading it again.');
            return;
        }
        if (!this.initialized) {
            this.panelScale.set(this.completePanel!.scale);
            this.initialized = true;
            run.startNewRun();
        }
        this.orderGeneration += 1;
        this.stageGeneration += 1;
        this.installedCallbacks = null;
        this.stageHost!.deactivateStage();
        this.stopPanelAnimation();
        this.completePanel!.active = false;
        this.completeLabel!.string = '订单完成';
        this.completeDetailLabel!.string = '';
        this.nextButton!.node.active = false;
        this.nextButton!.interactable = false;
        this.actionButtonLabel!.string = '下一张订单';
        this.orderIndex = index;
        this.stageIndex = 0;
        this.gameState = GameState.Playing;
        this.chapterLabel!.string = order.chapterTitle;
        this.levelLabel!.string = `订单 ${index + 1} / ${this.orders.length}`;
        this.levelTitleLabel!.string = order.title;
        run.beginLevel(order.id, order.scoreRule);
        this.loadStage(0);
        this.bindNextButton();
    }

    public loadStage(index: number): void {
        const order = this.orders[this.orderIndex];
        if (!this.initialized || this.gameState !== GameState.Playing || !order
            || !Number.isInteger(index) || index < 0 || index >= order.stages.length) return;
        const run = this.runController!;
        const host = this.stageHost!;
        run.pause();
        host.setInputEnabled(false);
        this.stageGeneration += 1;
        this.stageIndex = index;
        const stage = order.stages[index];
        this.stageLabel!.string = `步骤 ${index + 1} / ${order.stages.length}`;
        this.levelTitleLabel!.string = stage.title === order.title ? order.title : `${order.title} · ${stage.title}`;
        this.statusLabel!.string = stage.instruction;
        this.tutorialLabel!.string = stage.tutorial;
        this.tutorialHint!.active = !this.seenTutorials.has(stage.kind);
        this.installedCallbacks = this.makeCallbacks();
        host.loadStage(stage, this.installedCallbacks);
        if (this.enabled) {
            host.setInputEnabled(true);
            // Synchronous configure time occurs inside this frame; conservatively omit that frame.
            run.skipNextFrame();
            run.resume();
        } else {
            host.deactivateStage();
        }
    }

    public restartCurrentLevel(): void {
        if (!this.initialized || !this.enabled) return;
        this.orderGeneration += 1;
        this.installedCallbacks = null;
        this.stageHost!.resetAll();
        this.runController!.discardLastResult(this.orders[this.orderIndex].id);
        this.loadOrder(this.orderIndex);
    }

    public nextLevel(): void { this.nextOrder(); }

    public nextOrder(): void {
        if (!this.enabled || this.gameState !== GameState.LevelComplete || this.orderIndex >= this.orders.length - 1) return;
        this.loadOrder(this.orderIndex + 1);
    }

    public playAgain(): void {
        if (!this.initialized || !this.enabled || this.gameState !== GameState.DemoComplete) return;
        this.orderGeneration += 1;
        this.installedCallbacks = null;
        this.stageHost!.resetAll();
        this.stopPanelAnimation();
        this.runController!.startNewRun();
        this.loadOrder(0);
    }

    private makeCallbacks(): StageCallbacks {
        const orderGeneration = this.orderGeneration;
        const stageGeneration = this.stageGeneration;
        const orderIndex = this.orderIndex;
        const stageIndex = this.stageIndex;
        const stage = this.orders[orderIndex].stages[stageIndex];
        let complete = false;
        const valid = (): boolean => !complete && this.initialized && this.enabled && this.gameState === GameState.Playing
            && this.orderGeneration === orderGeneration && this.stageGeneration === stageGeneration
            && this.orderIndex === orderIndex && this.stageIndex === stageIndex;
        return {
            onProgress: (progress): void => {
                if (!valid()) return;
                this.statusLabel!.string = `${stage.instruction}\n${formatStageProgress(stage.kind, progress)}`;
                if (progress.completed > 0) {
                    this.seenTutorials.add(stage.kind);
                    this.tutorialHint!.active = false;
                }
            },
            onMistake: (): void => {
                if (valid() && stage.kind !== 'clean-swipe') this.runController!.recordMistake();
            },
            onComplete: (): void => {
                if (!valid()) return;
                complete = true;
                this.stageHost!.setInputEnabled(false);
                this.installedCallbacks = null;
                if (stageIndex + 1 < this.orders[orderIndex].stages.length) this.loadStage(stageIndex + 1);
                else this.settleOrder();
            },
        };
    }

    private settleOrder(): void {
        if (this.gameState !== GameState.Playing) return;
        const result = this.runController!.finishLevel();
        if (!result) return;
        const final = this.orderIndex === this.orders.length - 1;
        this.gameState = final ? GameState.DemoComplete : GameState.LevelComplete;
        this.stageGeneration += 1;
        this.stageHost!.deactivateStage();
        this.tutorialHint!.active = false;
        this.completeLabel!.string = final ? '本轮维修完成' : '订单完成';
        this.completeDetailLabel!.string = final ? this.formatSummary(this.runController!.summary) : this.formatResult(result);
        this.actionButtonLabel!.string = final ? '重新挑战' : '下一张订单';
        this.nextButton!.node.active = true;
        this.nextButton!.interactable = true;
        const panel = this.completePanel!;
        this.stopPanelAnimation();
        panel.setScale(this.scaledPanel(0.8));
        panel.active = true;
        this.panelTween = tween(panel)
            .to(0.14, { scale: this.scaledPanel(1.08) }, { easing: 'quadOut' })
            .to(0.1, { scale: this.panelScale.clone() }, { easing: 'quadInOut' }).start();
    }

    private formatResult(result: LevelResult): string {
        return `用时：${(result.elapsedMs / 1000).toFixed(1)} 秒\n失误：${result.mistakes} 次`
            + `\n评价：${formatStars(result.stars)}\n得分：${result.score}`
            + `\n步骤：${this.totalStagesInCurrentOrder} / ${this.totalStagesInCurrentOrder}`;
    }

    private formatSummary(summary: RunSummary): string {
        const results = this.runController!.levelResults;
        const completedStages = this.orders.reduce((sum, order) => sum
            + (results.some((result) => result.levelId === order.id) ? order.stages.length : 0), 0);
        const totalStages = this.orders.reduce((sum, order) => sum + order.stages.length, 0);
        return `完成订单：${summary.completedOrders} / ${this.orders.length}`
            + `\n总用时：${(summary.totalElapsedMs / 1000).toFixed(1)} 秒\n总失误：${summary.totalMistakes} 次`
            + `\n总评价：${summary.earnedStars} / ${this.orders.length * 3} 星\n总得分：${summary.totalScore}`
            + `\n完成步骤：${completedStages} / ${totalStages}`;
    }

    private suspend(): void {
        this.unbindNextButton();
        this.stopPanelAnimation();
        this.stageGeneration += 1;
        this.installedCallbacks = null;
        this.stageHost?.deactivateStage();
        this.runController?.pause();
    }

    private hasBindings(): boolean {
        const valid = isValid(this.runController) && isValid(this.runController?.timeLabel)
            && isValid(this.runController?.mistakeLabel) && isValid(this.stageHost)
            && isValid(this.chapterLabel) && isValid(this.levelLabel) && isValid(this.levelTitleLabel)
            && isValid(this.stageLabel) && isValid(this.statusLabel) && isValid(this.tutorialHint)
            && isValid(this.tutorialLabel) && isValid(this.completePanel) && isValid(this.completeLabel)
            && isValid(this.completeDetailLabel) && isValid(this.nextButton) && isValid(this.actionButtonLabel);
        if (!valid) warn('[LevelManager] Bind the StageHost, RunController and all Day 4 HUD / result references.');
        return valid;
    }

    private onActionButtonClicked(): void {
        if (!this.enabled) return;
        if (this.gameState === GameState.LevelComplete) this.nextOrder();
        else if (this.gameState === GameState.DemoComplete) this.playAgain();
    }

    private bindNextButton(): void {
        const node = this.nextButton?.node;
        if (!node || this.buttonNode === node) return;
        this.unbindNextButton();
        this.buttonNode = node;
        node.on(Button.EventType.CLICK, this.onActionButtonClicked, this);
    }

    private unbindNextButton(): void {
        this.buttonNode?.off(Button.EventType.CLICK, this.onActionButtonClicked, this);
        this.buttonNode = null;
    }

    private scaledPanel(multiplier: number): Vec3 {
        return new Vec3(this.panelScale.x * multiplier, this.panelScale.y * multiplier, this.panelScale.z);
    }

    private stopPanelAnimation(): void {
        this.panelTween?.stop();
        this.panelTween = null;
        if (this.completePanel && isValid(this.completePanel)) this.completePanel.setScale(this.panelScale);
    }
}
