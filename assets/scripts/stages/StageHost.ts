import { _decorator, Component, instantiate, Node, Prefab, warn } from 'cc';
import type { StageDefinition, StageKind } from '../data/StageDefinition';
import { CableConnectStageController } from './CableConnectStageController';
// Keep the three concrete controllers statically imported for Creator Prefab serialization.
import { CleanSwipeStageController } from './CleanSwipeStageController';
import { DragMatchStageController } from './DragMatchStageController';
import type { StageCallbacks, StageRuntime } from './StageRuntime';
import { VisualAssetRegistry } from '../visuals/VisualAssetRegistry';
import { cableVisualKey, cleanVisualKey, dragVisualKey } from '../visuals/VisualCatalog';

const { ccclass, property, disallowMultiple } = _decorator;

interface CachedStage {
    readonly node: Node;
    readonly controller: StageRuntime;
}

@ccclass('StageHost')
@disallowMultiple
export class StageHost extends Component {
    @property(Prefab)
    public dragMatchPrefab: Prefab | null = null;

    @property(Prefab)
    public cableConnectPrefab: Prefab | null = null;

    @property(Prefab)
    public cleanSwipePrefab: Prefab | null = null;

    @property(VisualAssetRegistry)
    public visualAssets: VisualAssetRegistry | null = null;

    @property({ tooltip: 'Temporary slice review only. Final visual assembly always disables this.' })
    public slicePreview: boolean = false;

    private readonly cache = new Map<StageKind, CachedStage>();
    private current: CachedStage | null = null;
    private kind: StageKind | null = null;
    private stageId: string | null = null;
    private generation: number = 0;
    private active: boolean = false;
    private completed: boolean = false;

    public get currentKind(): StageKind | null { return this.kind; }
    public get currentStageId(): string | null { return this.stageId; }
    public get currentGeneration(): number { return this.generation; }
    public get cachedStageCount(): number { return this.cache.size; }

    public loadStage(definition: StageDefinition, callbacks: StageCallbacks): void {
        this.deactivateStage();
        this.generation += 1;
        this.kind = definition.kind;
        this.stageId = definition.id;
        this.completed = false;
        switch (definition.kind) {
            case 'drag-match': {
                const entry = this.obtain(definition.kind, this.dragMatchPrefab, DragMatchStageController);
                this.activate(entry);
                const controller = entry.node.getComponent(DragMatchStageController)!;
                controller.bindVisualAssets(this.assetsFor(definition));
                controller.configure(definition, this.guard(callbacks));
                break;
            }
            case 'cable-connect': {
                const entry = this.obtain(definition.kind, this.cableConnectPrefab, CableConnectStageController);
                this.activate(entry);
                const controller = entry.node.getComponent(CableConnectStageController)!;
                controller.bindVisualAssets(this.assetsFor(definition));
                controller.configure(definition, this.guard(callbacks));
                break;
            }
            case 'clean-swipe': {
                const entry = this.obtain(definition.kind, this.cleanSwipePrefab, CleanSwipeStageController);
                this.activate(entry);
                const controller = entry.node.getComponent(CleanSwipeStageController)!;
                controller.bindVisualAssets(this.assetsFor(definition));
                controller.configure(definition, this.guard(callbacks));
                break;
            }
        }
        this.setInputEnabled(true);
    }

    public setInputEnabled(enabled: boolean): void {
        this.current?.controller.setInputEnabled(enabled && this.active && !this.completed && this.enabled);
    }

    public deactivateStage(): void {
        this.generation += 1;
        this.active = false;
        if (this.current) {
            this.current.controller.setInputEnabled(false);
            this.current.controller.deactivateStage();
            this.current.node.active = false;
        }
    }

    public resumeStage(callbacks: StageCallbacks): void {
        if (!this.current || this.completed) return;
        this.generation += 1;
        this.activate(this.current);
        this.current.controller.resumeStage(this.guard(callbacks));
        this.setInputEnabled(true);
    }

    public resetAll(): void {
        this.deactivateStage();
        for (const entry of this.cache.values()) {
            entry.controller.deactivateStage();
            entry.controller.resetStage();
            entry.node.active = false;
        }
        this.current = null;
        this.kind = null;
        this.stageId = null;
        this.completed = false;
    }

    public releaseCache(): void {
        this.deactivateStage();
        for (const entry of this.cache.values()) {
            entry.controller.deactivateStage();
            entry.node.destroy();
        }
        this.cache.clear();
        this.current = null;
        this.kind = null;
        this.stageId = null;
        this.completed = false;
    }

    protected onDisable(): void { this.deactivateStage(); }
    protected onDestroy(): void { this.releaseCache(); }

    private activate(entry: CachedStage): void {
        this.current = entry;
        this.active = true;
        entry.node.active = true;
    }

    private assetsFor(definition: StageDefinition): VisualAssetRegistry | null {
        if (!this.visualAssets || !this.slicePreview) return this.visualAssets;
        const keys = definition.kind === 'drag-match'
            ? definition.pairs.map(pair => dragVisualKey(definition.id, pair.id))
            : definition.kind === 'cable-connect'
                ? definition.cables.reduce<string[]>((all, cable) => all.concat([
                    cableVisualKey(definition.id, cable.id, 'head'), cableVisualKey(definition.id, cable.id, 'port')]), [])
                : definition.areas.map(area => cleanVisualKey(definition.id, area.id));
        if (keys.every(key => this.visualAssets!.keys.indexOf(key) >= 0)) return this.visualAssets;
        warn(`[StageHost] Slice preview: ${definition.id} retains its Day 4 text appearance pending artwork.`);
        return null;
    }

    private obtain<T extends Component & StageRuntime>(kind: StageKind, prefab: Prefab | null,
        Controller: new () => T): CachedStage {
        const cached = this.cache.get(kind);
        if (cached) return cached;
        if (!prefab) throw new Error(`[StageHost] Missing ${kind} Prefab.`);
        const node = instantiate(prefab);
        node.active = false;
        const controller = node.getComponent(Controller);
        if (!controller) {
            node.destroy();
            throw new Error(`[StageHost] ${kind} Prefab is missing its typed controller.`);
        }
        this.node.addChild(node);
        const entry: CachedStage = { node, controller };
        this.cache.set(kind, entry);
        return entry;
    }

    private guard(callbacks: StageCallbacks): StageCallbacks {
        const generation = this.generation;
        const current = this.current;
        const valid = (): boolean => this.enabled && this.active && !this.completed
            && this.generation === generation && this.current === current;
        return {
            onProgress: (progress): void => { if (valid()) callbacks.onProgress(progress); },
            onMistake: (): void => { if (valid()) callbacks.onMistake(); },
            onComplete: (): void => {
                if (!valid()) return;
                this.completed = true;
                this.setInputEnabled(false);
                callbacks.onComplete();
            },
        };
    }
}
