import { _decorator, Component, Label, Node, Prefab, Sprite, UITransform } from 'cc';
import type { CableConnectStageDefinition } from '../data/StageDefinition';
import { CableConnector, cableStyleColor } from '../gameplay/CableConnector';
import type { CableCallbacks } from '../gameplay/CableConnector';
import { ElementPool } from './ElementPool';
import type { StageCallbacks, StageProgress, StageRuntime } from './StageRuntime';
import { VisualAssetRegistry } from '../visuals/VisualAssetRegistry';
import { ElementVisual } from '../visuals/ElementVisual';
import { cableVisualKey } from '../visuals/VisualCatalog';

const { ccclass, property } = _decorator;

@ccclass('CableConnectStageController')
export class CableConnectStageController extends Component implements StageRuntime {
    @property(Prefab)
    public cablePrefab: Prefab | null = null;

    @property(Prefab)
    public portPrefab: Prefab | null = null;

    private readonly cablePool = new ElementPool();
    private readonly portPool = new ElementPool();
    private connectors: CableConnector[] = [];
    private definition: CableConnectStageDefinition | null = null;
    private callbacks: StageCallbacks | null = null;
    private generation: number = 0;
    private completedCount: number = 0;
    private complete: boolean = false;
    private inputEnabled: boolean = false;
    private visualAssets: VisualAssetRegistry | null = null;

    public bindVisualAssets(assets: VisualAssetRegistry | null): void { this.visualAssets = assets; }

    public get progress(): StageProgress {
        return Object.freeze({ completed: this.completedCount, total: this.definition?.cables.length ?? 0 });
    }

    public get cableNodes(): readonly Node[] { return this.cablePool.snapshot; }
    public get portNodes(): readonly Node[] { return this.portPool.snapshot; }
    public get pooledCableCount(): number { return this.cablePool.count; }
    public get pooledPortCount(): number { return this.portPool.count; }

    public configure(definition: CableConnectStageDefinition, callbacks: StageCallbacks): void {
        this.initialize(definition, callbacks);
    }

    public setInputEnabled(enabled: boolean): void {
        this.inputEnabled = enabled && !this.complete && this.callbacks !== null;
        for (const connector of this.connectors) {
            connector.setInputEnabled(this.inputEnabled);
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
        this.inputEnabled = false;
        for (const connector of this.connectors) {
            connector.deactivateConnector();
        }
    }

    public resumeStage(callbacks: StageCallbacks): void {
        this.generation += 1;
        this.callbacks = callbacks;
        for (const connector of this.connectors) {
            connector.resumeConnector(this.connectorCallbacks(connector.head, connector.currentPort));
        }
        callbacks.onProgress(this.progress);
    }

    protected onDisable(): void {
        this.deactivateStage();
    }

    protected onDestroy(): void {
        this.deactivateStage();
        this.cablePool.release();
        this.portPool.release();
        this.connectors = [];
    }

    private initialize(definition: CableConnectStageDefinition, callbacks: StageCallbacks | null): void {
        this.deactivateStage();
        if (!this.cablePrefab || !this.portPrefab) {
            throw new Error('CableConnectStage requires Cable and Port Prefabs.');
        }
        this.definition = definition;
        this.callbacks = callbacks;
        this.completedCount = 0;
        this.complete = false;
        for (const connector of this.connectors) {
            connector.resetConnector();
        }
        const ports = this.portPool.prepare(this.portPrefab, this.node, definition.cables.length);
        const cables = this.cablePool.prepare(this.cablePrefab, this.node, definition.cables.length);
        this.connectors = [];
        definition.cables.forEach((cable, index) => {
            const port = ports[index];
            const cableNode = cables[index];
            const connector = cableNode.getComponent(CableConnector);
            if (!connector?.head || !connector.anchor) {
                throw new Error('Cable Prefab requires CableConnector with Head and Anchor references.');
            }
            port.setPosition(cable.portPosition.x, cable.portPosition.y, 0);
            cableNode.setPosition(0, 0, 0);
            connector.head.setPosition(cable.cableStart.x, cable.cableStart.y, 0);
            connector.anchor.setPosition(cable.cableStart.x, cable.cableStart.y, 0);
            this.configureVisual(port, cable.portLabel);
            this.configureVisual(connector.head, cable.cableLabel);
            const portSprite = port.getComponent(Sprite);
            if (portSprite) {
                portSprite.color = cableStyleColor(cable.style);
            }
            connector.configure(port, cable.snapDistance, cable.style, this.connectorCallbacks(connector.head, port));
            if (this.visualAssets) {
                const portKey = cableVisualKey(definition.id, cable.id, 'port');
                const headKey = cableVisualKey(definition.id, cable.id, 'head');
                const portVisual = port.getComponent(ElementVisual);
                const headVisual = connector.head.getComponent(ElementVisual);
                if (!portVisual || !headVisual) throw new Error('[CableConnectStage] ElementVisual bindings are missing.');
                portVisual.configure(this.visualAssets.requireFrame(portKey), portKey, cable.portLabel, 130, 80, false);
                headVisual.configure(this.visualAssets.requireFrame(headKey), headKey, cable.cableLabel, 130, 80, false);
            }
            this.connectors.push(connector);
            port.active = true;
            cableNode.active = true;
        });
        this.callbacks?.onProgress(this.progress);
    }

    private configureVisual(node: Node, text: string): void {
        node.getComponent(ElementVisual)?.hideArtwork();
        const transform = node.getComponent(UITransform);
        const label = node.getComponentInChildren(Label);
        if (!transform || !label) {
            throw new Error('Cable Head and Port Prefabs require UITransform and Label.');
        }
        transform.setContentSize(130, 80);
        label.node.getComponent(UITransform)?.setContentSize(120, 70);
        label.string = text;
    }

    private connectorCallbacks(head: Node | null = null, port: Node | null = null): CableCallbacks {
        const generation = this.generation;
        let reported = false;
        return {
            onConnected: () => {
                if (generation !== this.generation || !this.callbacks || this.complete || reported) {
                    return;
                }
                reported = true;
                head?.getComponent(ElementVisual)?.showComplete();
                port?.getComponent(ElementVisual)?.showComplete();
                this.completedCount += 1;
                const complete = this.completedCount === this.definition?.cables.length;
                if (complete) {
                    this.complete = true;
                    this.setInputEnabled(false);
                }
                this.callbacks.onProgress(this.progress);
                if (generation === this.generation && complete) {
                    this.callbacks?.onComplete();
                }
            },
            onMistake: () => {
                if (generation === this.generation && this.inputEnabled && !this.complete) {
                    this.callbacks?.onMistake();
                }
            },
        };
    }
}
