import { _decorator, Component, EventTouch, Node, Prefab, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
import type { CleanSwipeStageDefinition } from '../data/StageDefinition';
import { ElementPool } from './ElementPool';
import type { StageCallbacks, StageProgress, StageRuntime } from './StageRuntime';

const { ccclass, property } = _decorator;

interface DirtCellState {
    readonly node: Node;
    readonly opacity: UIOpacity;
    readonly x: number;
    readonly y: number;
    cleaned: boolean;
    fade: Tween<UIOpacity> | null;
}

@ccclass('CleanSwipeStageController')
export class CleanSwipeStageController extends Component implements StageRuntime {
    @property(Prefab)
    public dirtCellPrefab: Prefab | null = null;

    @property(Node)
    public inputSurface: Node | null = null;

    @property(Node)
    public dirtLayer: Node | null = null;

    private readonly pool = new ElementPool();
    private cells: DirtCellState[] = [];
    private definition: CleanSwipeStageDefinition | null = null;
    private callbacks: StageCallbacks | null = null;
    private listenerNode: Node | null = null;
    private activeTouchId: number | null = null;
    private readonly pointer = new Vec3();
    private readonly previousPointer = new Vec3();
    private generation: number = 0;
    private cleanedCount: number = 0;
    private threshold: number = 0;
    private inputEnabled: boolean = false;
    private complete: boolean = false;

    public get totalCells(): number { return this.cells.length; }
    public get requiredCells(): number { return this.threshold; }
    public get cleanedCells(): number { return this.cleanedCount; }
    public get pooledCellCount(): number { return this.pool.count; }
    public get cellNodes(): readonly Node[] { return this.pool.snapshot; }
    public get progress(): StageProgress {
        return Object.freeze({ completed: Math.min(this.cleanedCount, this.threshold), total: this.threshold });
    }

    public configure(definition: CleanSwipeStageDefinition, callbacks: StageCallbacks): void {
        this.initialize(definition, callbacks);
    }

    public setInputEnabled(enabled: boolean): void {
        this.inputEnabled = enabled && !this.complete && this.callbacks !== null;
        if (!this.inputEnabled) {
            this.activeTouchId = null;
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
        this.removeListeners();
        this.setInputEnabled(false);
        this.stopCellFades();
    }

    public resumeStage(callbacks: StageCallbacks): void {
        this.generation += 1;
        this.callbacks = callbacks;
        this.bindListeners();
        callbacks.onProgress(this.progress);
    }

    protected onEnable(): void {
        this.bindListeners();
    }

    protected onDisable(): void {
        this.removeListeners();
        this.deactivateStage();
    }

    protected onDestroy(): void {
        this.removeListeners();
        this.deactivateStage();
        this.pool.release();
        this.cells = [];
    }

    private initialize(definition: CleanSwipeStageDefinition, callbacks: StageCallbacks | null): void {
        this.deactivateStage();
        if (!this.dirtCellPrefab) {
            throw new Error('CleanSwipeStage requires a Dirt Cell Prefab.');
        }
        for (const area of definition.areas) {
            if (!Number.isInteger(area.columns) || area.columns < 1 || !Number.isInteger(area.rows) || area.rows < 1
                || !Number.isFinite(area.size.width) || area.size.width <= 0
                || !Number.isFinite(area.size.height) || area.size.height <= 0) {
                throw new RangeError('Clean area dimensions and integer grid dimensions must be positive.');
            }
        }
        const total = definition.areas.reduce((sum, area) => sum + area.columns * area.rows, 0);
        if (!Number.isInteger(total) || total < 1 || total > 64 || !Number.isFinite(definition.brushRadius)
            || definition.brushRadius <= 0 || definition.requiredRatio < 0.5 || definition.requiredRatio > 1
            || !Number.isFinite(definition.requiredRatio)) {
            throw new RangeError('CleanSwipeStage requires 1–64 cells, a positive brush and a ratio in [0.5, 1].');
        }
        this.definition = definition;
        this.callbacks = callbacks;
        this.cleanedCount = 0;
        this.threshold = Math.ceil(total * definition.requiredRatio);
        this.complete = false;
        for (const cell of this.cells) {
            cell.opacity.opacity = 255;
            cell.cleaned = false;
            cell.node.active = false;
        }
        this.cells = [];
        const nodes = this.pool.prepare(this.dirtCellPrefab, this.dirtLayer ?? this.node, total);
        let index = 0;
        for (const area of definition.areas) {
            const width = area.size.width / area.columns;
            const height = area.size.height / area.rows;
            for (let row = 0; row < area.rows; row += 1) {
                for (let column = 0; column < area.columns; column += 1) {
                    const node = nodes[index];
                    const opacity = node.getComponent(UIOpacity);
                    const transform = node.getComponent(UITransform);
                    if (!opacity || !transform) {
                        throw new Error('Dirt Cell Prefab requires UIOpacity and UITransform.');
                    }
                    const x = area.position.x - area.size.width / 2 + width * (column + 0.5);
                    const y = area.position.y - area.size.height / 2 + height * (row + 0.5);
                    node.setPosition(x, y, 0);
                    transform.setContentSize(width, height);
                    opacity.opacity = 255;
                    node.active = true;
                    this.cells.push({ node, opacity, x, y, cleaned: false, fade: null });
                    index += 1;
                }
            }
        }
        this.bindListeners();
        this.callbacks?.onProgress(this.progress);
    }

    private bindListeners(): void {
        this.removeListeners();
        if (!this.enabled) {
            return;
        }
        const node = this.inputSurface ?? this.node;
        this.listenerNode = node;
        node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private removeListeners(): void {
        const node = this.listenerNode;
        if (node) {
            node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
            node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
            node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
            node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        }
        this.listenerNode = null;
    }

    private onTouchStart(event: EventTouch): void {
        const id = event.getID();
        if (!this.inputEnabled || this.complete || this.activeTouchId !== null || id == null || !this.readPointer(event)) {
            return;
        }
        this.activeTouchId = id;
        this.previousPointer.set(this.pointer);
        event.propagationStopped = true;
        this.cleanSegment();
    }

    private onTouchMove(event: EventTouch): void {
        if (!this.ownsTouch(event) || !this.readPointer(event)) {
            return;
        }
        event.propagationStopped = true;
        const generation = this.generation;
        this.cleanSegment();
        if (generation === this.generation) {
            this.previousPointer.set(this.pointer);
        }
    }

    private onTouchEnd(event: EventTouch): void {
        if (this.ownsTouch(event)) {
            this.activeTouchId = null;
            event.propagationStopped = true;
        }
    }

    private ownsTouch(event: EventTouch): boolean {
        return this.inputEnabled && this.activeTouchId !== null && this.activeTouchId === event.getID();
    }

    private readPointer(event: EventTouch): boolean {
        const transform = (this.dirtLayer ?? this.node).getComponent(UITransform);
        if (!transform) {
            return false;
        }
        const location = event.getUILocation();
        this.pointer.set(location.x, location.y, 0);
        transform.convertToNodeSpaceAR(this.pointer, this.pointer);
        return true;
    }

    private cleanSegment(): void {
        if (!this.definition || !this.callbacks) {
            return;
        }
        const generation = this.generation;
        const radiusSquared = this.definition.brushRadius * this.definition.brushRadius;
        const dx = this.pointer.x - this.previousPointer.x;
        const dy = this.pointer.y - this.previousPointer.y;
        const lengthSquared = dx * dx + dy * dy;
        let changed = false;
        for (const cell of this.cells) {
            if (cell.cleaned) {
                continue;
            }
            // Sweeping the whole segment also catches cells skipped by a fast pointer move.
            const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
                ((cell.x - this.previousPointer.x) * dx + (cell.y - this.previousPointer.y) * dy) / lengthSquared));
            const x = this.previousPointer.x + projection * dx - cell.x;
            const y = this.previousPointer.y + projection * dy - cell.y;
            if (x * x + y * y > radiusSquared) {
                continue;
            }
            cell.cleaned = true;
            this.cleanedCount += 1;
            changed = true;
            cell.fade = tween(cell.opacity)
                .to(0.08, { opacity: 0 })
                .call(() => {
                    if (generation === this.generation && cell.cleaned) {
                        cell.fade = null;
                        cell.node.active = false;
                    }
                })
                .start();
            if (this.cleanedCount >= this.threshold) {
                this.complete = true;
                this.setInputEnabled(false);
                break;
            }
        }
        if (changed) {
            this.callbacks.onProgress(this.progress);
            if (generation === this.generation && this.complete) {
                this.callbacks?.onComplete();
            }
        }
    }

    private stopCellFades(): void {
        for (const cell of this.cells) {
            cell.fade?.stop();
            cell.fade = null;
            if (cell.cleaned) {
                cell.opacity.opacity = 0;
                cell.node.active = false;
            }
        }
    }
}
