import { _decorator, Color, Graphics, Node } from 'cc';
import type { PointDefinition, RotaryControlStageDefinition } from '../data/Day5BStageDefinition';
import type { StageCallbacks } from './StageRuntime';
import { Day5BStageController } from './Day5BStageController';
import { normalizedAngle, shortestAngleDelta } from './Day5BMotionMath';

const { ccclass } = _decorator;

interface RotaryState {
    readonly node: Node;
    readonly center: PointDefinition;
    readonly labelY: number;
    angle: number;
    degrees: number;
    lastPointerAngle: number | null;
    moved: boolean;
    done: boolean;
    art: Node | null;
}

/** One reusable gesture contract for calibration rings and directional screws. */
@ccclass('RotaryControlStageController')
export class RotaryControlStageController extends Day5BStageController {
    private definition: RotaryControlStageDefinition | null = null;
    private controls: RotaryState[] = [];
    private activeIndex: number = -1;
    private revision: number = 0;
    private releasedInTarget: boolean = false;
    private heldSeconds: number = 0;
    private cover: Node | null = null;

    public get alignmentAngle(): number { return this.controls[0]?.angle ?? 0; }
    public get stableSeconds(): number { return this.heldSeconds; }
    public get screwDegrees(): readonly number[] { return Object.freeze(this.controls.map(control => control.degrees)); }
    public get controlNodes(): readonly Node[] { return Object.freeze(this.controls.map(control => control.node)); }

    public configure(definition: RotaryControlStageDefinition, callbacks: StageCallbacks): void {
        this.initialize(definition, callbacks);
    }

    public resetStage(): void {
        if (this.definition) this.initialize(this.definition, null);
    }

    public override setInputEnabled(enabled: boolean): void {
        if (!enabled) this.cancelRotation();
        super.setInputEnabled(enabled);
    }

    public override deactivateStage(): void {
        this.revision += 1;
        this.cancelRotation();
        super.deactivateStage();
    }

    protected override update(deltaTime: number): void {
        super.update(deltaTime);
        const definition = this.definition;
        if (!definition || definition.mode !== 'align' || !this.session.canInput
            || this.activeIndex !== -1 || !this.releasedInTarget) return;
        if (!this.insideTarget()) {
            this.releasedInTarget = false;
            this.heldSeconds = 0;
            return;
        }
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;
        this.heldSeconds = Math.min(definition.holdSeconds, this.heldSeconds + deltaTime);
        this.view?.hint(`保持对准 ${(this.heldSeconds / definition.holdSeconds * 100).toFixed(0)}%`);
        if (this.heldSeconds + 1e-9 >= definition.holdSeconds) {
            this.releasedInTarget = false;
            if (this.controls[0]) this.controls[0].done = true;
            this.drawControl(0);
            this.view?.feedback('校准完成，指针回正！', 'success');
            if (definition.device === 'printer') {
                const paper = this.view?.layer('day5b/layers/paper-test', 'roller-test-paper', 0, -170, 160, 180);
                if (paper) this.view?.lift(paper, -70);
            }
            const revision = this.revision;
            this.session.setProgress(1);
            if (revision !== this.revision || definition !== this.definition) return;
            this.session.finish();
        }
    }

    private initialize(definition: RotaryControlStageDefinition, callbacks: StageCallbacks | null): void {
        this.cancelRotation();
        const view = this.begin(definition.mode === 'align' ? 1 : definition.screws.length, callbacks, definition.device);
        this.definition = definition;
        this.heldSeconds = 0;
        this.releasedInTarget = false;
        this.controls = [];
        this.cover = definition.mode === 'unscrew' ? view.layer('day5b/layers/fan-cover', 'fan-cover', 0, 120, 320, 320) : null;
        const centers = definition.mode === 'align' ? [definition.center] : definition.screws.map(screw => screw.position);
        centers.forEach((center, index) => {
            const size = definition.mode === 'align' ? 2 * (definition.radius + definition.ringWidth / 2 + 8)
                : Math.max(definition.screws[index].size.width, definition.screws[index].size.height);
            const node = view.control(`rotary-${index}`, center.x, center.y, size, size, '');
            this.controls.push({ node, center, labelY: center.y - size / 2 - 27, angle: definition.mode === 'align' ? definition.initialAngle : 0,
                degrees: 0, lastPointerAngle: null, moved: false, done: false,
                art: definition.mode === 'unscrew' ? view.layer('day5b/layers/screw', `screw-art-${index}`, center.x, center.y, 68, 68) : null });
            this.gesture(node, {
                start: point => this.startRotation(index, point),
                move: point => this.moveRotation(index, point, true),
                end: point => this.endRotation(index, point),
                cancel: () => this.cancelRotation(),
            });
            this.drawControl(index);
            if (definition.mode === 'unscrew') {
                view.caption(`screw-label-${index}`, `${definition.screws[index].label} · 0° / ${definition.requiredDegrees}°`,
                    center.x, center.y - size / 2 - 27, 290, 46, 25);
            }
        });
        if (definition.mode === 'align') {
            view.caption('rotary-target', `绿色刻度 ±${definition.toleranceDegrees}°`, 0, 260, 590, 52, 28);
            view.hint('按住圆环旋转，松手后保持绿色刻度');
        } else {
            view.caption('rotary-target', `每枚旋松 ${definition.requiredDegrees}° · ${definition.direction === 'clockwise' ? '顺时针 ↻' : '逆时针 ↺'}`,
                0, 260, 640, 60, 28);
            view.hint('沿箭头绕圈旋松两枚螺丝');
        }
    }

    private startRotation(index: number, point: PointDefinition): boolean {
        const definition = this.definition;
        const control = this.controls[index];
        if (!definition || !control || control.done || this.activeIndex !== -1) return false;
        const distance = Math.hypot(point.x - control.center.x, point.y - control.center.y);
        if (Math.abs(distance - definition.radius) > definition.ringWidth / 2) return false;
        const angle = this.pointerAngle(control, point);
        if (angle === null) return false;
        this.activeIndex = index;
        control.lastPointerAngle = angle;
        control.moved = false;
        this.releasedInTarget = false;
        this.heldSeconds = 0;
        this.view?.setControlState(`rotary-${index}`, 'active');
        this.drawControl(index);
        return true;
    }

    private moveRotation(index: number, point: PointDefinition, explicitMove: boolean): void {
        const definition = this.definition;
        const control = this.controls[index];
        if (!definition || !control || this.activeIndex !== index || control.done || !this.session.canInput) return;
        const angle = this.pointerAngle(control, point);
        if (angle === null) {
            // Reacquire an angular anchor after passing through the center. A
            // center crossing must never turn into a fabricated half rotation.
            control.lastPointerAngle = null;
            this.releasedInTarget = false;
            this.heldSeconds = 0;
            return;
        }
        const previous = control.lastPointerAngle;
        control.lastPointerAngle = angle;
        if (previous === null) return;
        const delta = shortestAngleDelta(previous, angle);
        if (explicitMove && Math.abs(delta) > 0.05) control.moved = true;
        if (!control.moved) return;
        this.heldSeconds = 0;
        if (definition.mode === 'align') {
            control.angle = normalizedAngle(control.angle + delta);
            this.view?.hint(this.insideTarget() ? '已进入绿色刻度，松手保持' : '沿圆环转动，对准绿色刻度');
        } else {
            const directed = delta * (definition.direction === 'counterclockwise' ? 1 : -1);
            // Reverse turns tighten the same screw again; oscillating a small
            // arc cannot accumulate a fictitious complete revolution.
            control.degrees = Math.max(0, Math.min(definition.requiredDegrees, control.degrees + directed));
            control.angle = normalizedAngle(control.angle + delta);
            this.view?.caption(`screw-label-${index}`, `${definition.screws[index].label} · ${Math.floor(control.degrees)}° / ${definition.requiredDegrees}°`,
                control.center.x, control.labelY,
                290, 46, 25);
            if (control.degrees + 1e-7 >= definition.requiredDegrees) {
                control.degrees = definition.requiredDegrees;
                control.done = true;
                if (control.art) this.view?.lift(control.art, 32);
                this.activeIndex = -1;
                control.lastPointerAngle = null;
                this.drawControl(index);
                this.view?.feedback('螺丝已旋松！', 'success');
                const revision = this.revision;
                this.session.setProgress(this.controls.filter(candidate => candidate.done).length);
                if (revision !== this.revision || definition !== this.definition) return;
                if (this.controls.every(candidate => candidate.done)) {
                    this.view?.feedback('护盖打开，继续调整风扇', 'success');
                    if (this.cover) this.view?.lift(this.cover, 65);
                    this.session.finish();
                }
                return;
            }
        }
        this.drawControl(index);
    }

    private endRotation(index: number, point: PointDefinition): void {
        const control = this.controls[index];
        if (!control || this.activeIndex !== index || !this.session.canInput) return;
        if (control.moved) this.moveRotation(index, point, false);
        if (this.activeIndex !== index) return;
        this.activeIndex = -1;
        control.lastPointerAngle = null;
        this.releasedInTarget = this.definition?.mode === 'align' && control.moved && this.insideTarget();
        this.heldSeconds = 0;
        this.drawControl(index);
    }

    private cancelRotation(): void {
        for (const control of this.controls) {
            control.lastPointerAngle = null;
            control.moved = false;
        }
        this.activeIndex = -1;
        this.releasedInTarget = false;
        this.heldSeconds = 0;
    }

    private pointerAngle(control: RotaryState, point: PointDefinition): number | null {
        const definition = this.definition;
        if (!definition || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
        const dx = point.x - control.center.x;
        const dy = point.y - control.center.y;
        const radius = Math.hypot(dx, dy);
        if (radius < Math.max(14, definition.radius * 0.35) || radius > definition.radius + definition.ringWidth * 2) return null;
        return Math.atan2(dy, dx) * 180 / Math.PI;
    }

    private insideTarget(): boolean {
        const definition = this.definition;
        return definition?.mode === 'align'
            && Math.abs(shortestAngleDelta(definition.targetAngle, this.alignmentAngle)) <= definition.toleranceDegrees + 1e-7;
    }

    private drawControl(index: number): void {
        const definition = this.definition;
        const control = this.controls[index];
        const graphics = control?.node.getComponent(Graphics);
        if (!definition || !control || !graphics) return;
        const radius = definition.radius;
        graphics.clear();
        graphics.fillColor = new Color(255, 247, 221, 255);
        graphics.strokeColor = new Color(90, 100, 84, 255);
        graphics.lineWidth = 6;
        this.drawArc(graphics, radius, 0, 360, 64, true);
        graphics.fill(); graphics.stroke();
        if (definition.mode === 'align') {
            graphics.strokeColor = new Color(94, 185, 123, 255); graphics.lineWidth = definition.ringWidth * 0.68;
            this.drawArc(graphics, radius, definition.targetAngle + 90 - definition.toleranceDegrees,
                definition.targetAngle + 90 + definition.toleranceDegrees, 12, false); graphics.stroke();
            graphics.strokeColor = new Color(85, 101, 80, 255); graphics.lineWidth = 3;
            for (let degrees = 0; degrees < 360; degrees += 15) {
                const radians = degrees * Math.PI / 180;
                graphics.moveTo(Math.cos(radians) * (radius - 14), Math.sin(radians) * (radius - 14));
                graphics.lineTo(Math.cos(radians) * (radius - 4), Math.sin(radians) * (radius - 4));
            }
            graphics.stroke();
        } else {
            graphics.strokeColor = new Color(94, 185, 123, 255); graphics.lineWidth = 12;
            const sign = definition.direction === 'counterclockwise' ? 1 : -1;
            this.drawArc(graphics, radius - 7, 90, 90 + sign * 360 * control.degrees / definition.requiredDegrees, 48, false);
            graphics.stroke();
        }
        graphics.strokeColor = control.done || (definition.mode === 'align' && this.insideTarget())
            ? new Color(54, 156, 105, 255) : new Color(233, 134, 77, 255);
        graphics.lineWidth = definition.mode === 'align' ? 9 : 8;
        const radians = (control.angle + 90) * Math.PI / 180;
        if (control.art && !control.done) control.art.angle = control.angle;
        const reach = definition.mode === 'align' ? radius - 20 : radius * 0.55;
        graphics.moveTo(-Math.cos(radians) * (definition.mode === 'align' ? 13 : reach),
            -Math.sin(radians) * (definition.mode === 'align' ? 13 : reach));
        graphics.lineTo(Math.cos(radians) * reach, Math.sin(radians) * reach);
        graphics.stroke();
        if (control.done) {
            graphics.strokeColor = new Color(55, 157, 99, 255); graphics.lineWidth = 8;
            graphics.moveTo(-radius * 0.25, 0); graphics.lineTo(-radius * 0.05, -radius * 0.2);
            graphics.lineTo(radius * 0.35, radius * 0.25); graphics.stroke();
        }
    }

    private drawArc(graphics: Graphics, radius: number, from: number, to: number, steps: number, close: boolean): void {
        for (let index = 0; index <= steps; index += 1) {
            const radians = (from + (to - from) * index / steps) * Math.PI / 180;
            const x = Math.cos(radians) * radius;
            const y = Math.sin(radians) * radius;
            if (index === 0) graphics.moveTo(x, y); else graphics.lineTo(x, y);
        }
        if (close) {
            const radians = from * Math.PI / 180;
            graphics.lineTo(Math.cos(radians) * radius, Math.sin(radians) * radius);
        }
    }
}
