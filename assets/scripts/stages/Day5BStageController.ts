import { _decorator, Component, EventTouch, Node, UITransform, Vec3 } from 'cc';
import type { Day5BDevice, PointDefinition } from '../data/Day5BStageDefinition';
import { Day5BStageView } from '../visuals/Day5BStageView';
import type { StageCallbacks, StageProgress, StageRuntime } from './StageRuntime';

const { ccclass, property } = _decorator;

/** A stage-local session. No global timers, score or cross-order callbacks. */
export class Day5BSession {
    public callbacks: StageCallbacks | null = null;
    private input = false;
    private done = false;
    private count = 0;
    private total = 0;
    private pending = -1;
    private reported = false;
    private revision = 0;
    public get generation(): number { return this.revision; }
    public get progress(): StageProgress { return Object.freeze({ completed: this.count, total: this.total }); }
    public get canInput(): boolean { return this.input && !this.done && this.callbacks !== null; }
    public configure(total: number, callbacks: StageCallbacks | null): void {
        this.deactivate(); this.count = 0; this.total = total; this.done = false; this.reported = false; this.callbacks = callbacks;
        callbacks?.onProgress(this.progress);
    }
    public setInputEnabled(value: boolean): void { this.input = value && !this.done; }
    public setProgress(value: number): void {
        if (this.done || !this.callbacks) return;
        this.count = Math.max(0, Math.min(this.total, value));
        this.callbacks.onProgress(this.progress);
    }
    public mistake(): void { if (this.canInput) this.callbacks?.onMistake(); }
    public finish(delay: number = 0.4): void {
        if (this.done || !this.callbacks) return;
        this.done = true; this.input = false; this.pending = Math.max(0, delay);
    }
    public advance(dt: number): void {
        if (this.reported || this.pending < 0 || !Number.isFinite(dt) || dt < 0) return;
        this.pending -= dt;
        if (this.pending <= 0) {
            this.pending = -1;
            this.reported = true;
            const callback = this.callbacks;
            // Consume the completion before invoking the manager, which may reconfigure us.
            callback?.onComplete();
        }
    }
    public deactivate(): void { this.revision += 1; this.input = false; this.callbacks = null; this.pending = -1; }
    public resume(callbacks: StageCallbacks): void {
        this.revision += 1;
        this.callbacks = callbacks;
        if (this.done && !this.reported) this.pending = 0.4;
        callbacks.onProgress(this.progress);
    }
}

export interface GestureHooks {
    readonly start: (point: PointDefinition) => boolean;
    readonly move: (point: PointDefinition) => void;
    readonly end: (point: PointDefinition) => void;
    readonly cancel: () => void;
}

/** Touch ownership is local to each real input root; decorative children have no listeners. */
export class StageGesture {
    private owner: number | null = null;
    private parent: Node | null = null;
    private readonly point = new Vec3();
    private listening = false;
    public get active(): boolean { return this.owner !== null; }
    public constructor(private readonly stage: Node, private readonly node: Node,
        private readonly enabled: () => boolean, private readonly hooks: GestureHooks) {}
    public bind(): void {
        if (this.listening) return;
        this.listening = true;
        this.node.on(Node.EventType.TOUCH_START, this.start, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.move, this);
        this.node.on(Node.EventType.TOUCH_END, this.end, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.cancel, this);
    }
    public unbind(): void {
        this.cancelOwned();
        if (!this.listening) return;
        this.listening = false;
        this.node.off(Node.EventType.TOUCH_START, this.start, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.move, this);
        this.node.off(Node.EventType.TOUCH_END, this.end, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.cancel, this);
    }
    public cancelOwned(): void {
        if (this.owner !== null) { this.owner = null; this.parent = null; this.hooks.cancel(); }
    }
    private read(event: EventTouch): boolean {
        const ui = this.stage.getComponent(UITransform);
        if (!ui || !this.stage.activeInHierarchy || !this.enabled()) return false;
        const p = event.getUILocation();
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
        this.point.set(p.x, p.y, 0); ui.convertToNodeSpaceAR(this.point, this.point);
        return Number.isFinite(this.point.x) && Number.isFinite(this.point.y);
    }
    private start = (event: EventTouch): void => {
        const id = event.getID();
        if (this.owner !== null || id == null || !this.read(event)) return;
        if (!this.hooks.start(this.point)) return;
        this.owner = id; this.parent = this.node.parent; event.propagationStopped = true;
    };
    private owns(event: EventTouch): boolean {
        if (this.owner === null || this.owner !== event.getID()) return false;
        if (this.parent !== this.node.parent || !this.read(event)) { this.cancelOwned(); return false; }
        return true;
    }
    private move = (event: EventTouch): void => {
        if (!this.owns(event)) return;
        event.propagationStopped = true; this.hooks.move(this.point);
    };
    private end = (event: EventTouch): void => {
        if (!this.owns(event)) return;
        this.owner = null; this.parent = null; event.propagationStopped = true;
        this.hooks.end(this.point);
    };
    private cancel = (event: EventTouch): void => {
        if (this.owner !== event.getID() || this.owner === null) return;
        event.propagationStopped = true; this.cancelOwned();
    };
}

@ccclass('Day5BStageController')
export abstract class Day5BStageController extends Component implements StageRuntime {
    @property(Day5BStageView)
    public view: Day5BStageView | null = null;
    protected readonly session = new Day5BSession();
    private readonly gestures: StageGesture[] = [];
    public get progress(): StageProgress { return this.session.progress; }
    protected begin(total: number, callbacks: StageCallbacks | null, device: Day5BDevice): Day5BStageView {
        this.deactivateStage();
        this.gestures.length = 0;
        if (!this.view) throw new Error('[Day5BStage] Required StageView Inspector reference is missing.');
        this.view.reset(device);
        this.session.configure(total, callbacks);
        return this.view;
    }
    protected gesture(node: Node, hooks: GestureHooks): StageGesture {
        const gesture = new StageGesture(this.node, node,
            () => this.enabled && this.node.activeInHierarchy && this.session.canInput, hooks);
        this.gestures.push(gesture); gesture.bind(); return gesture;
    }
    protected tap(node: Node, selected: () => void): void {
        let startX = 0, startY = 0, moved = false;
        this.gesture(node, {
            start: point => {
                if (!this.inside(node, point)) return false;
                startX = point.x; startY = point.y; moved = false; return true;
            },
            move: point => { if (Math.hypot(point.x - startX, point.y - startY) > 12) moved = true; },
            end: point => {
                if (!moved && Math.hypot(point.x - startX, point.y - startY) <= 12 && this.inside(node, point)) selected();
            },
            cancel: () => { moved = true; },
        });
    }
    private inside(node: Node, point: PointDefinition): boolean {
        const rootUI = this.node.getComponent(UITransform), ui = node.getComponent(UITransform);
        if (!rootUI || !ui) return false;
        const local = ui.convertToNodeSpaceAR(rootUI.convertToWorldSpaceAR(new Vec3(point.x, point.y, 0)));
        return Math.abs(local.x) <= ui.width / 2 && Math.abs(local.y) <= ui.height / 2;
    }
    public setInputEnabled(enabled: boolean): void {
        this.session.setInputEnabled(enabled);
        if (!enabled) for (const gesture of this.gestures) gesture.cancelOwned();
    }
    public deactivateStage(): void {
        this.session.deactivate();
        for (const gesture of this.gestures) gesture.unbind();
    }
    public resumeStage(callbacks: StageCallbacks): void {
        this.session.resume(callbacks);
        for (const gesture of this.gestures) gesture.bind();
    }
    public abstract resetStage(): void;
    protected update(dt: number): void { this.session.advance(dt); }
    protected onEnable(): void { for (const gesture of this.gestures) gesture.bind(); }
    protected onDisable(): void { this.deactivateStage(); }
    protected onDestroy(): void { this.deactivateStage(); this.gestures.length = 0; }
}
