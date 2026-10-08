import { _decorator, Component, EventTouch, isValid, Node, tween, Tween, UITransform, Vec3, warn } from 'cc';
import { GameController } from '../core/GameController';

const { ccclass, property, requireComponent } = _decorator;

@ccclass('DraggableItem')
@requireComponent(UITransform)
export class DraggableItem extends Component {
    @property(Node)
    public target: Node | null = null;

    @property(GameController)
    public gameController: GameController | null = null;

    @property({ min: 0, tooltip: '吸附半径，单位为物品父节点的 UI 本地坐标单位。' })
    public snapDistance: number = 72;

    @property({ tooltip: '启用 Day 2 拖起、吸附和回弹动效；Day 1 测试原型可关闭。' })
    public animationsEnabled: boolean = true;

    private readonly startPosition: Vec3 = new Vec3();
    private readonly baselineScale: Vec3 = new Vec3(1, 1, 1);
    private readonly pointerPosition: Vec3 = new Vec3();
    private readonly dragOffset: Vec3 = new Vec3();
    private readonly targetPosition: Vec3 = new Vec3();
    private placed: boolean = false;
    private activeTouchId: number | null = null;
    private dragParent: Node | null = null;
    private parentTransform: UITransform | null = null;
    private baselineCaptured: boolean = false;
    private inputLocked: boolean = false;
    private ownedTween: Tween<Node> | null = null;
    private animationGeneration: number = 0;

    public get isPlaced(): boolean {
        return this.placed;
    }

    public get isAnimating(): boolean {
        return this.ownedTween !== null;
    }

    /** Call after the level has assigned the item's new position. */
    public configure(target: Node, gameController: GameController, snapDistance: number): void {
        this.captureBaselineScale();
        const restoreScale = this.activeTouchId !== null || this.inputLocked || this.ownedTween !== null;
        this.stopOwnedTween();
        if (restoreScale) {
            // Never save a previous pick-up's enlarged scale as the next level's baseline.
            this.node.setScale(this.baselineScale);
        }
        this.clearDrag();
        this.inputLocked = false;
        this.placed = false;
        this.target = target;
        this.gameController = gameController;
        this.snapDistance = snapDistance;
        this.startPosition.set(this.node.position);
        this.baselineScale.set(this.node.scale);
        this.node.setScale(this.baselineScale);
    }

    protected onLoad(): void {
        this.startPosition.set(this.node.position);
        this.captureBaselineScale();
    }

    protected onEnable(): void {
        // Cocos maps desktop mouse input to these node touch events too.
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    protected onDisable(): void {
        this.removeListeners();
        this.cancelDrag();
    }

    protected onDestroy(): void {
        this.removeListeners();
        this.cancelDrag();
    }

    private removeListeners(): void {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    private onTouchStart(event: EventTouch): void {
        if (this.placed || this.inputLocked || this.activeTouchId !== null) {
            return;
        }

        const parent = this.node.parent;
        const transform = parent?.getComponent(UITransform);
        const touchId = event.getID();
        if (!parent || !transform || touchId == null
            || !isValid(this.target) || !isValid(this.gameController)) {
            warn(`[DraggableItem] ${this.node.name}: bind Target / GameController and use a UI parent.`);
            return;
        }

        this.startPosition.set(this.node.position);
        this.dragParent = parent;
        this.parentTransform = transform;
        this.activeTouchId = touchId;
        this.readPointerPosition(event);
        Vec3.subtract(this.dragOffset, this.startPosition, this.pointerPosition);
        event.propagationStopped = true;
        if (this.animationsEnabled) {
            this.playPickup();
        }
    }

    private onTouchMove(event: EventTouch): void {
        if (!this.ownsTouch(event)) {
            return;
        }

        this.moveToPointer(event);
        event.propagationStopped = true;
    }

    private onTouchEnd(event: EventTouch): void {
        if (!this.ownsTouch(event)) {
            return;
        }

        // Include the final release location even if no final MOVE was sent.
        this.moveToPointer(event);
        event.propagationStopped = true;
        if (this.activeTouchId === null) {
            return;
        }

        const target = this.target;
        const controller = this.gameController;
        const transform = this.parentTransform;
        if (!target || !controller || !transform
            || !isValid(target) || !isValid(controller)) {
            this.cancelDrag();
            return;
        }

        // Target may have an entirely different parent, translation, scale or rotation.
        transform.convertToNodeSpaceAR(target.worldPosition, this.targetPosition);
        const position = this.node.position;
        const distance = Math.hypot(position.x - this.targetPosition.x, position.y - this.targetPosition.y);
        if (distance <= this.snapDistance) {
            if (this.animationsEnabled) {
                this.playSettlement(this.targetPosition, controller);
            } else {
                this.stopOwnedTween();
                this.node.setPosition(this.targetPosition);
                this.node.setScale(this.baselineScale);
                this.placed = true;
                this.clearDrag();
                controller.onItemPlaced();
            }
        } else {
            // Consume the release before the callback, including re-entrant input.
            this.activeTouchId = null;
            this.inputLocked = true;
            const generation = this.animationGeneration;
            controller.reportMistake();
            // The callback may have restarted the order or disabled this component.
            if (generation !== this.animationGeneration || !this.enabled) {
                return;
            }
            if (this.animationsEnabled) {
                this.playSettlement(this.startPosition, null);
            } else {
                this.cancelDrag();
            }
        }
    }

    private onTouchCancel(event: EventTouch): void {
        if (!this.ownsTouch(event)) {
            return;
        }

        // Cancellation always rolls back, including a cancelled touch near its target.
        event.propagationStopped = true;
        this.cancelDrag();
    }

    private ownsTouch(event: EventTouch): boolean {
        return !this.placed && !this.inputLocked && this.activeTouchId !== null && event.getID() === this.activeTouchId;
    }

    private readPointerPosition(event: EventTouch): void {
        const location = event.getUILocation();
        this.pointerPosition.set(location.x, location.y, 0);
        this.parentTransform?.convertToNodeSpaceAR(this.pointerPosition, this.pointerPosition);
    }

    private moveToPointer(event: EventTouch): void {
        if (this.node.parent !== this.dragParent || !isValid(this.parentTransform)) {
            this.cancelDrag();
            return;
        }

        this.readPointerPosition(event);
        Vec3.add(this.pointerPosition, this.pointerPosition, this.dragOffset);
        this.node.setPosition(this.pointerPosition.x, this.pointerPosition.y, this.startPosition.z);
    }

    private cancelDrag(): void {
        const shouldReturn = this.activeTouchId !== null || this.inputLocked;
        this.stopOwnedTween();
        if (shouldReturn && !this.placed && this.node.parent === this.dragParent) {
            this.node.setPosition(this.startPosition);
        }
        if (this.baselineCaptured && isValid(this.node)) {
            this.node.setScale(this.baselineScale);
        }
        this.inputLocked = false;
        this.clearDrag();
    }

    private captureBaselineScale(): void {
        if (!this.baselineCaptured) {
            this.baselineScale.set(this.node.scale);
            this.baselineCaptured = true;
        }
    }

    private playPickup(): void {
        this.stopOwnedTween();
        const generation = this.animationGeneration;
        const scale = new Vec3(this.baselineScale.x * 1.06, this.baselineScale.y * 1.06, this.baselineScale.z * 1.06);
        this.ownedTween = tween(this.node)
            .to(0.1, { scale })
            .call(() => {
                if (generation === this.animationGeneration) {
                    this.ownedTween = null;
                }
            })
            .start();
    }

    private playSettlement(destination: Vec3, controller: GameController | null): void {
        this.stopOwnedTween();
        this.inputLocked = true;
        this.activeTouchId = null;
        const generation = this.animationGeneration;
        const parent = this.dragParent;
        const target = this.target;
        // Copy destinations: configure() may change the reusable vectors for a new level.
        const position = new Vec3(destination.x, destination.y, destination.z);
        const scale = new Vec3(this.baselineScale.x, this.baselineScale.y, this.baselineScale.z);
        this.ownedTween = tween(this.node)
            .to(controller ? 0.15 : 0.18, { position, scale })
            .call(() => {
                if (generation !== this.animationGeneration) {
                    return;
                }
                this.ownedTween = null;
                if (!isValid(this) || !isValid(this.node) || !this.enabled || this.node.parent !== parent
                    || (controller && (!isValid(controller) || !isValid(target)))) {
                    this.cancelDrag();
                    return;
                }
                this.inputLocked = false;
                if (controller) {
                    // Count only after the snap finishes. Input is locked for the entire tween.
                    this.placed = true;
                    this.clearDrag();
                    controller.onItemPlaced();
                } else {
                    this.clearDrag();
                }
            })
            .start();
    }

    private stopOwnedTween(): void {
        this.animationGeneration += 1;
        this.ownedTween?.stop();
        this.ownedTween = null;
    }

    private clearDrag(): void {
        this.activeTouchId = null;
        this.dragParent = null;
        this.parentTransform = null;
    }
}
