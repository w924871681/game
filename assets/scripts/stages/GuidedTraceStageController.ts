import { _decorator, Color, Graphics, Node } from 'cc';
import type { GuidedTraceStageDefinition, PointDefinition } from '../data/Day5BStageDefinition';
import type { StageCallbacks } from './StageRuntime';
import { Day5BStageController } from './Day5BStageController';
import { projectToSegment, traceMoveInsideSegment } from './Day5BMotionMath';

const { ccclass } = _decorator;

/** Continuous ordered path following; this deliberately has no port-pair snap. */
@ccclass('GuidedTraceStageController')
export class GuidedTraceStageController extends Day5BStageController {
    private definition: GuidedTraceStageDefinition | null = null;
    private handle: Node | null = null;
    private paper: Node | null = null;
    private route: Graphics | null = null;
    private checkpoints: Node[] = [];
    private completed: number = 0;
    private dragging: boolean = false;
    private moved: boolean = false;
    private revision: number = 0;
    private position: PointDefinition = { x: 0, y: 0 };
    private previousPointer: PointDefinition = { x: 0, y: 0 };
    private offset: PointDefinition = { x: 0, y: 0 };
    private deviated: boolean = false;

    public get handleNode(): Node | null { return this.handle; }
    public get checkpointNodes(): readonly Node[] { return Object.freeze(this.checkpoints.slice()); }
    public get handlePosition(): PointDefinition { return Object.freeze({ x: this.position.x, y: this.position.y }); }
    public get confirmedCheckpoints(): number { return this.completed; }
    public get isDeviated(): boolean { return this.deviated; }

    public configure(definition: GuidedTraceStageDefinition, callbacks: StageCallbacks): void {
        this.initialize(definition, callbacks);
    }

    public resetStage(): void {
        if (this.definition) this.initialize(this.definition, null);
    }

    public override setInputEnabled(enabled: boolean): void {
        if (!enabled) this.cancelTrace();
        super.setInputEnabled(enabled);
    }

    public override deactivateStage(): void {
        this.revision += 1;
        this.cancelTrace();
        super.deactivateStage();
    }

    private initialize(definition: GuidedTraceStageDefinition, callbacks: StageCallbacks | null): void {
        const view = this.begin(3, callbacks, definition.device);
        this.definition = definition;
        this.completed = 0;
        this.dragging = false;
        this.moved = false;
        this.deviated = false;
        this.position = { x: definition.points[0].x, y: definition.points[0].y };
        this.previousPointer = { ...this.position };
        this.offset = { x: 0, y: 0 };
        this.route = view.control('trace-route', 0, 0, 720, 800, '').getComponent(Graphics);
        this.checkpoints = definition.points.slice(1).map((point, index) =>
            view.control(`trace-checkpoint-${index}`, point.x, point.y,
                definition.checkpointRadius * 2, definition.checkpointRadius * 2, `${index + 1}`));
        this.paper = definition.device === 'printer'
            ? view.layer('day5b/layers/paper-crumpled', 'trace-paper', this.position.x, this.position.y + 58, 112, 140) : null;
        this.handle = view.control('trace-handle', this.position.x, this.position.y, 108, 108,
            definition.device === 'printer' ? '拉纸' : '信号');
        this.gesture(this.handle, {
            start: point => this.startTrace(point),
            move: point => this.moveTrace(point),
            end: () => this.cancelTrace(),
            cancel: () => this.cancelTrace(),
        });
        // HUD and the large lower hint already explain this; avoid a third line over the device.
        view.caption('trace-title', '', 0, 270, 640, 56, 28);
        view.hint('按住手柄，依次经过 1 → 2 → 3');
        this.redraw();
    }

    private startTrace(point: PointDefinition): boolean {
        if (!this.definition || !this.handle || this.completed >= 3 || this.dragging
            || Math.hypot(point.x - this.position.x, point.y - this.position.y) > 54) return false;
        this.offset = { x: this.position.x - point.x, y: this.position.y - point.y };
        this.previousPointer = { x: this.position.x, y: this.position.y };
        this.dragging = true;
        this.moved = false;
        this.deviated = false;
        this.view?.hint(`沿可见轨道前进，下一检查点 ${this.completed + 1}`);
        this.view?.setControlState('trace-handle', 'active');
        this.redraw();
        return true;
    }

    private moveTrace(point: PointDefinition): void {
        const definition = this.definition;
        if (!definition || !this.dragging || this.completed >= 3 || !this.session.canInput) return;
        const candidate = { x: point.x + this.offset.x, y: point.y + this.offset.y };
        const start = definition.points[this.completed];
        const end = definition.points[this.completed + 1];
        if (!traceMoveInsideSegment(this.previousPointer, candidate, start, end,
            definition.tolerance, definition.maxSampleDistance)) {
            this.deviated = true;
            this.cancelTrace();
            this.view?.feedback('稍微偏离了，已回到最近检查点', 'error');
            this.view?.hint(`进度保留，从检查点 ${this.completed} 继续`);
            this.redraw();
            return;
        }
        const distance = Math.hypot(candidate.x - this.previousPointer.x, candidate.y - this.previousPointer.y);
        if (distance > 0.5) this.moved = true;
        this.previousPointer = candidate;
        const projection = projectToSegment(candidate, start, end);
        this.position = { x: projection.x, y: projection.y };
        this.moveHandleVisual();
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        const checkpointRatio = 1 - Math.min(definition.checkpointRadius, length / 2) / length;
        if (this.moved && projection.ratio >= checkpointRatio
            && Math.hypot(candidate.x - end.x, candidate.y - end.y) <= definition.checkpointRadius) {
            // At most one checkpoint is confirmed by a recorded MOVE. A long
            // chord across several rings cannot consume the rest in a loop.
            this.completed += 1;
            this.view?.setControlState(`trace-checkpoint-${this.completed - 1}`, 'success');
            this.redraw();
            const revision = this.revision;
            this.session.setProgress(this.completed);
            if (revision !== this.revision || definition !== this.definition) return;
            if (this.completed === 3) {
                this.dragging = false;
                this.position = { x: end.x, y: end.y };
                this.moveHandleVisual();
                this.view?.feedback(definition.device === 'printer' ? '纸张完整抽出！' : '三个引导环全部通过！', 'success');
                this.redraw();
                this.session.finish();
                return;
            }
            this.view?.hint(`检查点 ${this.completed} 已通过，继续前往 ${this.completed + 1}`);
        }
        this.redraw();
    }

    private cancelTrace(): void {
        this.dragging = false;
        this.moved = false;
        const checkpoint = this.definition?.points[this.completed];
        if (checkpoint) {
            this.position = { x: checkpoint.x, y: checkpoint.y };
            this.previousPointer = { ...this.position };
            this.moveHandleVisual();
        }
        this.redraw();
    }

    private moveHandleVisual(): void {
        this.handle?.setPosition(this.position.x, this.position.y, 0);
        this.paper?.setPosition(this.position.x, this.position.y + 58, 0);
    }

    private redraw(): void {
        const definition = this.definition;
        const graphics = this.route;
        if (!definition || !graphics) return;
        graphics.clear();
        if (definition.device === 'livestream') {
            graphics.fillColor = new Color(195, 79, 61, 225);
            for (const [x,y] of [[-40,-155],[140,-40]]) {
                graphics.moveTo(x-45,y-26); graphics.lineTo(x+45,y-26); graphics.lineTo(x+45,y+26);
                graphics.lineTo(x-45,y+26); graphics.lineTo(x-45,y-26); graphics.fill();
                graphics.strokeColor = new Color(255,227,182,255); graphics.lineWidth=5;
                graphics.moveTo(x-12,y-12); graphics.lineTo(x+12,y+12); graphics.moveTo(x-12,y+12); graphics.lineTo(x+12,y-12); graphics.stroke();
            }
        }
        graphics.strokeColor = new Color(51, 87, 88, 255);
        graphics.lineWidth = 32;
        this.path(graphics, definition.points);
        graphics.stroke();
        graphics.strokeColor = this.deviated ? new Color(227, 148, 78, 255) : new Color(120, 194, 207, 255);
        graphics.lineWidth = 21;
        this.path(graphics, definition.points);
        graphics.stroke();
        graphics.strokeColor = new Color(102, 204, 143, 255); graphics.lineWidth = 16;
        const passed: PointDefinition[] = definition.points.slice(0, this.completed + 1);
        if (this.completed < 3) passed.push(this.position);
        if (passed.length > 1) { this.path(graphics, passed); graphics.stroke(); }
        this.checkpoints.forEach((node, index) => {
            const circle = node.getComponent(Graphics);
            if (!circle) return;
            circle.clear();
            circle.fillColor = index < this.completed ? new Color(110, 198, 133, 255) : new Color(255, 245, 213, 255);
            circle.strokeColor = index < this.completed ? new Color(58, 145, 101, 255) : new Color(201, 161, 78, 255);
            circle.lineWidth = 6;
            const radius = Math.min(45, definition.checkpointRadius - 5);
            for (let step = 0; step <= 32; step += 1) {
                const angle = Math.PI * 2 * step / 32;
                if (step === 0) circle.moveTo(radius, 0);
                else circle.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            }
            circle.fill(); circle.stroke();
        });
    }

    private path(graphics: Graphics, points: readonly PointDefinition[]): void {
        points.forEach((point, index) => {
            if (index === 0) graphics.moveTo(point.x, point.y); else graphics.lineTo(point.x, point.y);
        });
    }
}
