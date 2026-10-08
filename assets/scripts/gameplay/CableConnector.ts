import { _decorator, Color, Component, EventTouch, Graphics, isValid, Node, Sprite, tween, Tween, UITransform, Vec3 } from 'cc';
import type { CableStyle } from '../data/StageDefinition';

const { ccclass, property } = _decorator;

export interface CableCallbacks {
    readonly onConnected: () => void;
    readonly onMistake: () => void;
}

export function cableStyleColor(style: CableStyle): Color {
    switch (style) {
        case 'red': return new Color(237, 104, 110, 255);
        case 'blue': return new Color(99, 175, 242, 255);
        case 'yellow': return new Color(247, 208, 92, 255);
        case 'green': return new Color(101, 211, 155, 255);
        case 'purple': return new Color(187, 142, 235, 255);
        case 'orange': return new Color(242, 165, 88, 255);
    }
}

@ccclass('CableConnector')
export class CableConnector extends Component {
    @property(Node)
    public head: Node | null = null;

    @property(Graphics)
    public line: Graphics | null = null;

    @property(Node)
    public anchor: Node | null = null;

    private port: Node | null = null;
    private callbacks: CableCallbacks | null = null;
    private snapDistance: number = 72;
    private readonly startPosition = new Vec3();
    private readonly pointerPosition = new Vec3();
    private readonly dragOffset = new Vec3();
    private readonly targetPosition = new Vec3();
    private readonly lineStart = new Vec3();
    private readonly lineEnd = new Vec3();
    private dragParent: Node | null = null;
    private parentTransform: UITransform | null = null;
    private listenerNode: Node | null = null;
    private activeTouchId: number | null = null;
    private connected: boolean = false;
    private inputEnabled: boolean = false;
    private inputLocked: boolean = false;
    private ownedTween: Tween<Node> | null = null;
    private generation: number = 0;

    public get isConnected(): boolean { return this.connected; }
    public get isAnimating(): boolean { return this.ownedTween !== null; }
    public get currentPort(): Node | null { return this.port; }

    /** The caller assigns the new head and anchor positions before configure. */
    public configure(port: Node, snapDistance: number, style: CableStyle, callbacks: CableCallbacks): void {
        this.stopOwnedTween();
        this.clearDrag();
        if (!this.head || !this.line || !this.anchor || !this.head.parent?.getComponent(UITransform)) {
            throw new Error('Cable Prefab requires Head, Anchor, Graphics and a UI parent for Head.');
        }
        this.port = port;
        this.snapDistance = snapDistance;
        this.callbacks = callbacks;
        this.connected = false;
        this.inputEnabled = false;
        this.inputLocked = false;
        this.startPosition.set(this.head.position);
        const sprite = this.head.getComponent(Sprite);
        if (sprite) {
            sprite.color = cableStyleColor(style);
        }
        this.line.strokeColor = cableStyleColor(style);
        this.line.lineWidth = 8;
        this.bindListeners();
        this.refreshLine();
    }

    public setInputEnabled(enabled: boolean): void {
        this.inputEnabled = enabled && !this.connected && this.callbacks !== null;
        if (!this.inputEnabled) {
            this.cancelPending();
        }
    }

    public deactivateConnector(): void {
        this.inputEnabled = false;
        this.callbacks = null;
        this.removeListeners();
        this.cancelPending();
    }

    public resetConnector(): void {
        this.deactivateConnector();
        this.connected = false;
        this.head?.setPosition(this.startPosition);
        this.refreshLine();
    }

    public resumeConnector(callbacks: CableCallbacks): void {
        this.callbacks = callbacks;
        this.bindListeners();
        this.refreshLine();
    }

    public refreshLine(): void {
        const line = this.line;
        const transform = line?.node.getComponent(UITransform);
        if (!line || !transform || !this.head || !this.anchor) {
            return;
        }
        transform.convertToNodeSpaceAR(this.anchor.worldPosition, this.lineStart);
        transform.convertToNodeSpaceAR(this.head.worldPosition, this.lineEnd);
        line.clear();
        line.moveTo(this.lineStart.x, this.lineStart.y);
        line.lineTo(this.lineEnd.x, this.lineEnd.y);
        line.stroke();
    }

    protected onEnable(): void {
        this.bindListeners();
    }

    protected onDisable(): void {
        this.removeListeners();
        this.deactivateConnector();
    }

    protected onDestroy(): void {
        this.removeListeners();
        this.deactivateConnector();
    }

    private bindListeners(): void {
        this.removeListeners();
        if (!this.head || !this.enabled) {
            return;
        }
        this.listenerNode = this.head;
        this.head.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.head.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.head.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.head.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    private removeListeners(): void {
        const node = this.listenerNode;
        if (node) {
            node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
            node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
            node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
            node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        }
        this.listenerNode = null;
    }

    private onTouchStart(event: EventTouch): void {
        if (!this.inputEnabled || this.connected || this.inputLocked || this.ownedTween || this.activeTouchId !== null) {
            return;
        }
        const parent = this.head?.parent;
        const transform = parent?.getComponent(UITransform);
        const id = event.getID();
        if (!parent || !transform || !this.head || id == null || !isValid(this.port)) {
            return;
        }
        this.dragParent = parent;
        this.parentTransform = transform;
        this.activeTouchId = id;
        this.readPointer(event);
        Vec3.subtract(this.dragOffset, this.head.position, this.pointerPosition);
        event.propagationStopped = true;
    }

    private onTouchMove(event: EventTouch): void {
        if (this.ownsTouch(event)) {
            this.moveToPointer(event);
            event.propagationStopped = true;
        }
    }

    private onTouchEnd(event: EventTouch): void {
        if (!this.ownsTouch(event)) {
            return;
        }
        this.moveToPointer(event);
        event.propagationStopped = true;
        const head = this.head;
        const port = this.port;
        const transform = this.parentTransform;
        if (this.activeTouchId === null || !head || !port || !transform || !isValid(port)) {
            this.cancelPending();
            return;
        }
        transform.convertToNodeSpaceAR(port.worldPosition, this.targetPosition);
        const correct = Math.hypot(head.position.x - this.targetPosition.x, head.position.y - this.targetPosition.y) <= this.snapDistance;
        // Consume ownership before callbacks; repeated END cannot report a second result.
        this.activeTouchId = null;
        this.inputLocked = true;
        if (correct) {
            this.playSettlement(this.targetPosition, true);
        } else {
            const generation = this.generation;
            this.callbacks?.onMistake();
            if (generation === this.generation && this.inputEnabled && this.enabled) {
                this.playSettlement(this.startPosition, false);
            }
        }
    }

    private onTouchCancel(event: EventTouch): void {
        if (this.ownsTouch(event)) {
            event.propagationStopped = true;
            this.cancelPending();
        }
    }

    private ownsTouch(event: EventTouch): boolean {
        return this.inputEnabled && !this.connected && !this.inputLocked && !this.ownedTween
            && this.activeTouchId !== null && event.getID() === this.activeTouchId;
    }

    private readPointer(event: EventTouch): void {
        const location = event.getUILocation();
        this.pointerPosition.set(location.x, location.y, 0);
        this.parentTransform?.convertToNodeSpaceAR(this.pointerPosition, this.pointerPosition);
    }

    private moveToPointer(event: EventTouch): void {
        if (!this.head || this.head.parent !== this.dragParent || !isValid(this.parentTransform)) {
            this.cancelPending();
            return;
        }
        this.readPointer(event);
        Vec3.add(this.pointerPosition, this.pointerPosition, this.dragOffset);
        this.head.setPosition(this.pointerPosition.x, this.pointerPosition.y, this.startPosition.z);
        this.refreshLine();
    }

    private playSettlement(destination: Vec3, correct: boolean): void {
        const head = this.head;
        if (!head) {
            return;
        }
        this.stopOwnedTween();
        const generation = this.generation;
        const parent = this.dragParent;
        const position = new Vec3(destination.x, destination.y, destination.z);
        this.ownedTween = tween(head)
            .to(correct ? 0.15 : 0.18, { position }, { onUpdate: () => {
                if (generation === this.generation) {
                    this.refreshLine();
                }
            } })
            .call(() => {
                if (generation !== this.generation) {
                    return;
                }
                this.ownedTween = null;
                if (!this.enabled || !isValid(head) || head.parent !== parent || (correct && !isValid(this.port))) {
                    this.cancelPending();
                    return;
                }
                this.inputLocked = false;
                this.clearDrag();
                this.refreshLine();
                if (correct) {
                    this.connected = true;
                    this.inputEnabled = false;
                    this.callbacks?.onConnected();
                }
            })
            .start();
    }

    private cancelPending(): void {
        const pending = this.activeTouchId !== null || this.ownedTween !== null || this.dragParent !== null;
        this.stopOwnedTween();
        if (pending && !this.connected && this.head && this.head.parent === this.dragParent) {
            this.head.setPosition(this.startPosition);
        }
        this.clearDrag();
        this.inputLocked = false;
        this.refreshLine();
    }

    private stopOwnedTween(): void {
        this.generation += 1;
        this.ownedTween?.stop();
        this.ownedTween = null;
    }

    private clearDrag(): void {
        this.activeTouchId = null;
        this.dragParent = null;
        this.parentTransform = null;
    }
}
