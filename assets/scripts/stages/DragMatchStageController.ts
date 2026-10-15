import { _decorator, Component, Label, Node, Prefab, UITransform } from 'cc';
import { GameController } from '../core/GameController';
import type { DragMatchStageDefinition } from '../data/StageDefinition';
import { DraggableItem } from '../gameplay/DraggableItem';
import { ElementPool } from './ElementPool';
import type { StageCallbacks, StageProgress, StageRuntime } from './StageRuntime';
import { VisualAssetRegistry } from '../visuals/VisualAssetRegistry';
import { ElementVisual } from '../visuals/ElementVisual';
import { dragVisualKey } from '../visuals/VisualCatalog';

const { ccclass, property } = _decorator;

@ccclass('DragMatchStageController')
export class DragMatchStageController extends Component implements StageRuntime {
    @property(Prefab)
    public itemPrefab: Prefab | null = null;

    @property(Prefab)
    public targetPrefab: Prefab | null = null;

    @property(GameController)
    public gameController: GameController | null = null;

    private readonly itemPool = new ElementPool();
    private readonly targetPool = new ElementPool();
    private items: DraggableItem[] = [];
    private definition: DragMatchStageDefinition | null = null;
    private callbacks: StageCallbacks | null = null;
    private generation: number = 0;
    private complete: boolean = false;
    private inputEnabled: boolean = false;
    private visualAssets: VisualAssetRegistry | null = null;

    public bindVisualAssets(assets: VisualAssetRegistry | null): void { this.visualAssets = assets; }

    public get progress(): StageProgress {
        return Object.freeze({ completed: this.gameController?.completedItems ?? 0, total: this.definition?.pairs.length ?? 0 });
    }

    public get itemNodes(): readonly Node[] { return this.itemPool.snapshot; }
    public get targetNodes(): readonly Node[] { return this.targetPool.snapshot; }
    public get pooledItemCount(): number { return this.itemPool.count; }
    public get pooledTargetCount(): number { return this.targetPool.count; }

    public configure(definition: DragMatchStageDefinition, callbacks: StageCallbacks): void {
        this.initialize(definition, callbacks);
    }

    public setInputEnabled(enabled: boolean): void {
        this.inputEnabled = enabled && !this.complete && this.callbacks !== null;
        for (const item of this.items) {
            item.enabled = this.inputEnabled && !item.isPlaced;
        }
    }

    public resetStage(): void {
        if (this.definition) {
            this.initialize(this.definition, this.callbacks);
        }
    }

    public deactivateStage(): void {
        this.generation += 1;
        this.callbacks = null;
        this.setInputEnabled(false);
        this.clearGameCallbacks();
    }

    public resumeStage(callbacks: StageCallbacks): void {
        this.generation += 1;
        this.callbacks = callbacks;
        this.bindGameCallbacks();
        callbacks.onProgress(this.progress);
    }

    protected onDisable(): void {
        this.deactivateStage();
    }

    protected onDestroy(): void {
        this.deactivateStage();
        this.itemPool.release();
        this.targetPool.release();
        this.items = [];
    }

    private initialize(definition: DragMatchStageDefinition, callbacks: StageCallbacks | null): void {
        this.deactivateStage();
        const game = this.gameController;
        if (!game || !this.itemPrefab || !this.targetPrefab) {
            throw new Error('DragMatchStage requires itemPrefab, targetPrefab and a local GameController.');
        }
        this.definition = definition;
        this.complete = false;
        this.callbacks = callbacks;
        for (const item of this.items) {
            if (item.target) {
                item.configure(item.target, game, item.snapDistance);
            }
        }
        game.beginLevel(definition.pairs.length, definition.instruction);
        const targets = this.targetPool.prepare(this.targetPrefab, this.node, definition.pairs.length);
        const items = this.itemPool.prepare(this.itemPrefab, this.node, definition.pairs.length);
        this.items = [];
        const width = definition.pairs.length === 4 ? 140 : 180;
        const height = definition.pairs.length === 4 ? 110 : 140;
        definition.pairs.forEach((pair, index) => {
            const target = targets[index];
            const itemNode = items[index];
            this.configureVisual(target, pair.targetLabel, width, height);
            this.configureVisual(itemNode, pair.itemLabel, width, height);
            if (this.visualAssets) {
                const key = dragVisualKey(definition.id, pair.id);
                const frame = this.visualAssets.requireFrame(key);
                const targetVisual = target.getComponent(ElementVisual);
                const itemVisual = itemNode.getComponent(ElementVisual);
                if (!targetVisual || !itemVisual) throw new Error('[DragMatchStage] ElementVisual bindings are missing.');
                targetVisual.configure(frame, key, pair.targetLabel, width, height, true);
                itemVisual.configure(frame, key, pair.itemLabel, width, height, false);
            }
            target.setPosition(pair.targetPosition.x, pair.targetPosition.y, 0);
            itemNode.setPosition(pair.itemStart.x, pair.itemStart.y, 0);
            const item = itemNode.getComponent(DraggableItem);
            if (!item) {
                throw new Error('Drag Item Prefab must contain DraggableItem.');
            }
            item.enabled = false;
            item.configure(target, game, pair.snapDistance ?? definition.defaultSnapDistance);
            this.items.push(item);
            target.active = true;
            itemNode.active = true;
        });
        this.bindGameCallbacks();
        this.callbacks?.onProgress(this.progress);
    }

    private configureVisual(node: Node, text: string, width: number, height: number): void {
        node.getComponent(ElementVisual)?.hideArtwork();
        const transform = node.getComponent(UITransform);
        const label = node.getComponentInChildren(Label);
        if (!transform || !label) {
            throw new Error('Drag element Prefab must contain UITransform and Label.');
        }
        transform.setContentSize(width, height);
        label.node.getComponent(UITransform)?.setContentSize(width - 10, height - 10);
        label.string = text;
    }

    private clearGameCallbacks(): void {
        if (this.gameController) {
            this.gameController.onProgressChanged = null;
            this.gameController.onMistake = null;
            this.gameController.onLevelComplete = null;
        }
    }

    private bindGameCallbacks(): void {
        const game = this.gameController;
        if (!game || !this.callbacks) {
            return;
        }
        const generation = this.generation;
        game.onProgressChanged = () => {
            if (generation === this.generation && !this.complete) {
                for (const item of this.items) {
                    if (item.isPlaced) {
                        item.node.getComponent(ElementVisual)?.showComplete();
                        item.target?.getComponent(ElementVisual)?.showComplete();
                    }
                }
                this.callbacks?.onProgress(this.progress);
            }
        };
        game.onMistake = () => {
            if (generation === this.generation && this.inputEnabled && !this.complete) {
                this.callbacks?.onMistake();
            }
        };
        game.onLevelComplete = () => {
            if (generation !== this.generation || this.complete || !this.callbacks) {
                return;
            }
            this.complete = true;
            this.setInputEnabled(false);
            this.callbacks.onComplete();
        };
    }
}
