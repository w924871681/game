import { _decorator, Color, Graphics, Node } from 'cc';
import type { GaugeMode, GaugeTuneStageDefinition, PointDefinition } from '../data/Day5BStageDefinition';
import type { StageCallbacks } from './StageRuntime';
import { Day5BStageController, StageGesture } from './Day5BStageController';

const { ccclass } = _decorator;
export interface GaugeReading { readonly first: number; readonly second: number; readonly safe: boolean }
export function fanReading(speed: number, duct: number): GaugeReading {
    const first = Math.round(96 - 0.45 * speed - 0.25 * duct), second = Math.round(20 + 0.45 * speed - 0.10 * duct);
    return Object.freeze({ first, second, safe: first >= 40 && first <= 55 && second >= 30 && second <= 48 });
}
export function stereoReading(left: number, right: number): GaugeReading {
    return Object.freeze({ first: left, second: right, safe: Math.abs(left - right) <= 8 && (left + right) / 2 >= 45 && (left + right) / 2 <= 75 });
}
export function broadcastReading(video: number, audio: number): GaugeReading {
    return Object.freeze({ first: video, second: audio, safe: video >= 65 && video <= 85 && audio >= 50 && audio <= 75 });
}

/** Two continuous, independently owned sliders; release and a real dt hold are required. */
@ccclass('GaugeTuneStageController')
export class GaugeTuneStageController extends Day5BStageController {
    private definition: GaugeTuneStageDefinition | null = null;
    private values: [number, number] = [0, 0];
    private readonly sliders: Node[] = [];
    private readonly thumbs: Node[] = [];
    private readonly contacts: StageGesture[] = [];
    private hold = 0;
    private released = false;
    private animationTime = 0;
    private blades: Node | null = null;
    public get controlValues(): readonly [number, number] { return Object.freeze([...this.values] as [number, number]); }
    public get sliderNodes(): readonly Node[] { return Object.freeze([...this.sliders]); }
    public get stableSeconds(): number { return this.hold; }
    public get reading(): GaugeReading { return this.measure(this.definition?.mode ?? 'fan'); }
    public configure(definition: GaugeTuneStageDefinition, callbacks: StageCallbacks): void { this.initialize(definition, callbacks); }
    public resetStage(): void { if (this.definition) this.initialize(this.definition, null); }
    public override setInputEnabled(enabled: boolean): void {
        if (!enabled) { this.hold = 0; this.released = false; }
        super.setInputEnabled(enabled);
    }
    public override deactivateStage(): void { this.hold = 0; this.released = false; super.deactivateStage(); }
    protected override update(dt: number): void {
        super.update(dt);
        if (!Number.isFinite(dt) || dt <= 0 || !this.definition) return;
        this.animationTime += dt;
        if (this.blades) this.blades.angle = (this.blades.angle - dt * (80 + this.values[0] * 4)) % 360;
        this.drawSignal();
        if (!this.session.canInput || !this.released || this.contacts.some(g => g.active) || !this.reading.safe) return;
        this.hold = Math.min(this.definition.holdSeconds, this.hold + dt);
        this.view?.hint(`双项达标 · 松手稳定 ${Math.round(this.hold / this.definition.holdSeconds * 100)}%`);
        if (this.hold + 1e-9 >= this.definition.holdSeconds) {
            const generation = this.session.generation;
            this.session.setProgress(2);
            if (generation !== this.session.generation) return;
            this.view?.feedback(this.definition.mode === 'fan' ? '凉快又安静，风扇恢复平稳！'
                : this.definition.mode === 'stereo' ? '两边都清楚啦！' : '画面流畅，声波同步！', 'success');
            this.session.finish();
        }
    }
    private initialize(definition: GaugeTuneStageDefinition, callbacks: StageCallbacks | null): void {
        const view = this.begin(2, callbacks, definition.device);
        this.definition = definition; this.values = [...definition.initialControls];
        this.sliders.length = 0; this.thumbs.length = 0; this.contacts.length = 0;
        this.hold = 0; this.released = false; this.animationTime = 0; this.blades = null;
        if (definition.mode === 'fan') this.blades = view.layer('day5b/layers/fan-blades', 'fan-moving', 0, 120, 260, 260);
        const names = definition.mode === 'fan' ? ['转速', '风道开度'] : definition.mode === 'stereo' ? ['L 左声道', 'R 右声道'] : ['画面稳定度', '直播音量'];
        names.forEach((name, index) => {
            const y = -130 - index * 140;
            view.caption(`gauge-name-${index}`, name, -210, y + 57, 220, 40, 30);
            const node = view.control(`gauge-${index}`, 0, y, 620, 88, ''); this.sliders.push(node);
            const thumb = view.layer('day5b/layers/slider-thumb', `gauge-thumb-${index}`, 0, y, 88, 88); this.thumbs.push(thumb);
            const gesture = this.gesture(node, {
                start: p => { this.hold = 0; this.released = false; this.change(index, p); return true; },
                move: p => this.change(index, p),
                end: p => { this.change(index, p); this.released = true; this.hold = 0; },
                cancel: () => { this.hold = 0; this.released = false; view.hint('触摸已取消，调整后松手再检测'); },
            });
            this.contacts.push(gesture);
        });
        // The range remains below the sliders; remove the duplicate caption near the HUD.
        view.caption('gauge-target', '', 0, 260, 640, 52, 30);
        this.refresh();
    }
    private change(index: number, point: PointDefinition): void {
        const value = Math.max(0, Math.min(100, (point.x + 260) / 520 * 100));
        if (Math.abs(this.values[index] - value) > 1e-7) { this.values[index] = value; this.hold = 0; this.released = false; }
        this.refresh();
    }
    private measure(mode: GaugeMode): GaugeReading {
        return mode === 'fan' ? fanReading(...this.values) : mode === 'stereo' ? stereoReading(...this.values) : broadcastReading(...this.values);
    }
    private refresh(): void {
        const view = this.view, d = this.definition; if (!view || !d) return;
        const r = this.reading;
        this.sliders.forEach((node, i) => {
            view.setControlState(`gauge-${i}`, r.safe ? 'success' : 'neutral');
            this.thumbs[i].setPosition(-260 + this.values[i] * 5.2, node.position.y, 0);
            view.caption(`gauge-value-${i}`, `${Math.round(this.values[i])}`, 244, node.position.y + 57, 110, 40, 32);
            const g = node.getComponent(Graphics)!;
            g.strokeColor = new Color(99, 125, 107, 255); g.lineWidth = 8;
            g.moveTo(-260, 0); g.lineTo(260, 0); g.stroke();
        });
        view.caption('gauge-reading', d.mode === 'fan' ? `温度指数 ${r.first}   噪声指数 ${r.second}`
            : d.mode === 'stereo' ? `L ${Math.round(r.first)}   R ${Math.round(r.second)}   差 ${Math.round(Math.abs(r.first-r.second))}`
                : `画面 ${Math.round(r.first)}   音量 ${Math.round(r.second)}`, 0, -28, 640, 48, 32);
        view.hint(r.safe ? '双项达标，松手保持 0.7 秒' : d.mode === 'fan' ? '温度40–55｜噪声30–48'
            : d.mode === 'stereo' ? '左右差≤8｜平均45–75' : '画面65–85｜音量50–75');
        this.drawSignal();
        const safeCount = d.mode === 'fan' ? Number(r.first >= 40 && r.first <= 55) + Number(r.second >= 30 && r.second <= 48)
            : d.mode === 'stereo' ? Number(Math.abs(r.first-r.second) <= 8) + Number((r.first+r.second)/2 >= 45 && (r.first+r.second)/2 <= 75)
                : Number(r.first >= 65 && r.first <= 85) + Number(r.second >= 50 && r.second <= 75);
        this.session.setProgress(safeCount);
    }
    private drawSignal(): void {
        const g = this.view?.overlay, d = this.definition; if (!g || !d) return;
        g.clear();
        if (d.mode === 'fan') {
            g.strokeColor = this.reading.safe ? new Color(64, 155, 102, 255) : new Color(221, 129, 73, 255);
            g.lineWidth = 5;
            for (let i=0;i<3;i++) { const x = 170 + i*34; g.moveTo(x,60); g.bezierCurveTo(x+20,110,x-20,150,x,200); } g.stroke();
        } else {
            for (let side=0;side<2;side++) {
                g.strokeColor = this.reading.safe ? new Color(54, 154, 106, 255) : new Color(75, 144, 164, 255); g.lineWidth=8;
                for (let i=0;i<9;i++) {
                    const x = (side ? 110 : -260) + i*18, amplitude = this.values[side] * (.28 + .2*Math.sin(this.animationTime*5+i));
                    g.moveTo(x,125-amplitude); g.lineTo(x,125+amplitude);
                } g.stroke();
            }
            if (d.mode === 'broadcast') {
                const x = this.reading.safe ? 35*Math.sin(this.animationTime*3) : -24;
                g.strokeColor = this.reading.safe ? new Color(68,170,110,255) : new Color(208,112,67,255); g.lineWidth=7;
                g.moveTo(x-25,200); g.lineTo(x+25,200); g.moveTo(x,180); g.lineTo(x,220); g.stroke();
                this.view?.caption('broadcast-status', this.reading.safe ? '画面流畅 · 音画同步' : '画面冻结 · 等待校正', 0, 194, 360, 42, 24);
            }
        }
    }
}
