import { _decorator, Button, Component, isValid, Label, Node, tween, Tween, Vec3, warn } from 'cc';
import { LEVEL_CATALOG } from '../data/LevelCatalog';
import type { LevelDefinition } from '../data/LevelDefinition';
import { DraggableItem } from '../gameplay/DraggableItem';
import { GameController } from './GameController';
import { formatStars, RunController } from './RunController';
import type { LevelResult, RunSummary } from './RunController';

const { ccclass, property, disallowMultiple } = _decorator;

export enum GameState {
    Playing,
    LevelComplete,
    DemoComplete,
}

@ccclass('LegacyLevelManager')
@disallowMultiple
export class LegacyLevelManager extends Component {
    @property(GameController)
    public gameController: GameController | null = null;

    @property(RunController)
    public runController: RunController | null = null;

    @property(Label)
    public levelLabel: Label | null = null;

    @property(Label)
    public levelTitleLabel: Label | null = null;

    @property([DraggableItem])
    public items: DraggableItem[] = [];

    @property([Label])
    public itemLabels: Label[] = [];

    @property([Node])
    public targets: Node[] = [];

    @property([Label])
    public targetLabels: Label[] = [];

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

    @property(Node)
    public tutorialHint: Node | null = null;

    public readonly levels: readonly LevelDefinition[] = LEVEL_CATALOG;
    private levelIndex: number = 0;
    private gameState: GameState = GameState.Playing;
    private buttonNode: Node | null = null;
    private panelTween: Tween<Node> | null = null;
    private readonly panelScale: Vec3 = new Vec3(1, 1, 1);
    private initialized: boolean = false;
    private tutorialCompleted: boolean = false;
    private readonly completionCallback = (): void => this.onLevelCompleted();
    private readonly mistakeCallback = (): void => {
        if (this.enabled && this.gameState === GameState.Playing) {
            this.runController?.recordMistake();
        }
    };
    private readonly progressCallback = (completedItems: number, _totalItems: number): void => {
        if (this.enabled && this.gameState === GameState.Playing && completedItems > 0) {
            this.tutorialCompleted = true;
            if (this.tutorialHint) this.tutorialHint.active = false;
        }
    };

    public get currentLevelIndex(): number {
        return this.levelIndex;
    }

    public get state(): GameState {
        return this.gameState;
    }

    protected start(): void {
        if (!this.hasBindings()) {
            return;
        }

        this.panelScale.set(this.completePanel!.scale);
        this.initialized = true;
        this.runController!.startNewRun();
        this.loadLevel(0);
    }

    protected onEnable(): void {
        this.bindNextButton();
        if (this.initialized && this.gameState === GameState.Playing) {
            this.installCallbacks();
            this.items.forEach((item) => {
                if (isValid(item)) item.enabled = true;
            });
            this.runController?.resume();
        }
    }

    protected onDisable(): void {
        this.unbindNextButton();
        this.stopPanelAnimation();
        this.clearCallbacks();
        this.items.forEach((item) => { if (isValid(item)) item.enabled = false; });
        this.runController?.pause();
    }

    protected onDestroy(): void {
        this.unbindNextButton();
        this.stopPanelAnimation();
        this.clearCallbacks();
        this.items.forEach((item) => { if (isValid(item)) item.enabled = false; });
        this.runController?.pause();
    }

    public loadLevel(index: number): void {
        if (!Number.isInteger(index) || index < 0 || index >= this.levels.length) {
            warn(`[LevelManager] Invalid level index: ${index}`);
            return;
        }
        if (!this.hasBindings()) {
            return;
        }

        if (!this.initialized) {
            this.panelScale.set(this.completePanel!.scale);
            this.initialized = true;
            this.runController!.startNewRun();
        }
        const level = this.levels[index];
        const controller = this.gameController!;
        const run = this.runController!;
        // History is replaced only through restartCurrentLevel, never by arbitrary navigation.
        if (run.levelResults.some((result) => result.levelId === level.id)) {
            warn('[LevelManager] Restart the current completed order before loading it again.');
            return;
        }
        this.items.forEach((item) => { item.enabled = false; });
        this.stopPanelAnimation();
        this.completePanel!.active = false;
        this.completeLabel!.string = '订单完成';
        this.completeDetailLabel!.string = '';
        this.nextButton!.node.active = false;
        this.nextButton!.interactable = false;
        this.actionButtonLabel!.string = '下一张订单';
        this.levelIndex = index;
        this.gameState = GameState.Playing;
        this.levelLabel!.string = `订单 ${index + 1} / ${this.levels.length}`;
        this.levelTitleLabel!.string = level.title;
        this.tutorialHint!.active = index === 0 && !this.tutorialCompleted;
        controller.beginLevel(level.items.length, level.instruction, '订单完成！');
        run.beginLevel(level.id, level.scoreRule);
        this.installCallbacks();

        level.items.forEach((definition, itemIndex) => {
            const item = this.items[itemIndex];
            const target = this.targets[itemIndex];
            target.setPosition(definition.targetPosition.x, definition.targetPosition.y, 0);
            item.node.setPosition(definition.startPosition.x, definition.startPosition.y, 0);
            this.itemLabels[itemIndex].string = definition.label;
            this.targetLabels[itemIndex].string = definition.targetLabel;
            item.animationsEnabled = true;
            item.configure(target, controller, level.snapDistance);
            item.enabled = true;
        });

        this.bindNextButton();
    }

    public restartCurrentLevel(): void {
        if (!this.initialized) {
            return;
        }
        this.runController!.discardLastResult(this.levels[this.levelIndex].id);
        this.loadLevel(this.levelIndex);
    }

    public onLevelCompleted(): void {
        if (!this.initialized || !this.enabled || this.gameState !== GameState.Playing
            || !this.gameController?.isLevelComplete) {
            return;
        }

        const finalLevel = this.levelIndex === this.levels.length - 1;
        this.gameState = finalLevel ? GameState.DemoComplete : GameState.LevelComplete;
        const result = this.runController!.finishLevel();
        if (!result) {
            warn('[LevelManager] This order has no unfinished run to settle.');
            return;
        }
        this.items.forEach((item) => { item.enabled = false; });
        this.completeLabel!.string = finalLevel ? '本轮维修完成' : '订单完成';
        this.completeDetailLabel!.string = finalLevel
            ? this.formatSummary(this.runController!.summary) : this.formatResult(result);
        this.actionButtonLabel!.string = finalLevel ? '重新挑战' : '下一张订单';
        this.nextButton!.node.active = true;
        this.nextButton!.interactable = true;
        const panel = this.completePanel!;
        this.stopPanelAnimation();
        panel.setScale(this.scaledPanel(0.8));
        panel.active = true;
        this.panelTween = tween(panel)
            .to(0.14, { scale: this.scaledPanel(1.08) }, { easing: 'quadOut' })
            .to(0.1, { scale: this.panelScale.clone() }, { easing: 'quadInOut' })
            .start();
    }

    public nextLevel(): void {
        // A second fast click sees Playing; the final panel never advances out of range.
        if (!this.enabled || this.gameState !== GameState.LevelComplete || this.levelIndex >= this.levels.length - 1) {
            return;
        }
        this.loadLevel(this.levelIndex + 1);
    }

    public playAgain(): void {
        if (!this.initialized || !this.enabled || this.gameState !== GameState.DemoComplete) {
            return;
        }
        this.stopPanelAnimation();
        this.runController!.startNewRun();
        this.loadLevel(0);
    }

    private onActionButtonClicked(): void {
        if (!this.enabled) return;
        if (this.gameState === GameState.LevelComplete) {
            this.nextLevel();
        } else if (this.gameState === GameState.DemoComplete) {
            this.playAgain();
        }
    }

    private formatResult(result: LevelResult): string {
        return `用时：${(result.elapsedMs / 1000).toFixed(1)} 秒\n失误：${result.mistakes} 次`
            + `\n评价：${formatStars(result.stars)}\n得分：${result.score}`;
    }

    private formatSummary(summary: RunSummary): string {
        return `完成订单：${summary.completedOrders} / ${this.levels.length}`
            + `\n总用时：${(summary.totalElapsedMs / 1000).toFixed(1)} 秒\n总失误：${summary.totalMistakes} 次`
            + `\n总评价：${summary.earnedStars} / ${summary.maxStars} 星\n总得分：${summary.totalScore}`;
    }

    private hasBindings(): boolean {
        const valid = isValid(this.gameController) && isValid(this.gameController?.statusLabel)
            && isValid(this.runController) && isValid(this.runController?.timeLabel)
            && isValid(this.runController?.mistakeLabel) && isValid(this.actionButtonLabel)
            && isValid(this.tutorialHint)
            && isValid(this.levelLabel) && isValid(this.levelTitleLabel)
            && isValid(this.completePanel) && isValid(this.completeLabel)
            && isValid(this.completeDetailLabel) && isValid(this.nextButton)
            && this.items.length === 3 && this.items.every((item) => isValid(item))
            && new Set(this.items).size === 3
            && this.targets.length === 3 && this.targets.every((target) => isValid(target))
            && new Set(this.targets).size === 3
            && this.itemLabels.length === 3 && this.itemLabels.every((label) => isValid(label))
            && this.targetLabels.length === 3 && this.targetLabels.every((label) => isValid(label));
        if (!valid) {
            warn('[LevelManager] Bind all UI references and exactly three distinct items / targets in Inspector.');
        }
        return valid;
    }

    private bindNextButton(): void {
        const node = this.nextButton?.node;
        if (!node || this.buttonNode === node) {
            return;
        }
        this.unbindNextButton();
        this.buttonNode = node;
        node.on(Button.EventType.CLICK, this.onActionButtonClicked, this);
    }

    private unbindNextButton(): void {
        this.buttonNode?.off(Button.EventType.CLICK, this.onActionButtonClicked, this);
        this.buttonNode = null;
    }

    private installCallbacks(): void {
        if (this.gameController) {
            this.gameController.onLevelComplete = this.completionCallback;
            this.gameController.onMistake = this.mistakeCallback;
            this.gameController.onProgressChanged = this.progressCallback;
        }
    }

    private clearCallbacks(): void {
        if (this.gameController?.onLevelComplete === this.completionCallback) {
            this.gameController.onLevelComplete = null;
        }
        if (this.gameController?.onMistake === this.mistakeCallback) {
            this.gameController.onMistake = null;
        }
        if (this.gameController?.onProgressChanged === this.progressCallback) {
            this.gameController.onProgressChanged = null;
        }
    }

    private scaledPanel(multiplier: number): Vec3 {
        return new Vec3(this.panelScale.x * multiplier, this.panelScale.y * multiplier, this.panelScale.z);
    }

    private stopPanelAnimation(): void {
        this.panelTween?.stop();
        this.panelTween = null;
        if (this.completePanel && isValid(this.completePanel)) {
            this.completePanel.setScale(this.panelScale);
        }
    }
}

