import { _decorator, Color, Graphics, Node } from 'cc';
import type { FaultSpotStageDefinition } from '../data/Day5BStageDefinition';
import type { StageCallbacks } from './StageRuntime';
import { Day5BStageController } from './Day5BStageController';

const { ccclass } = _decorator;

@ccclass('FaultSpotStageController')
export class FaultSpotStageController extends Day5BStageController {
    private definition: FaultSpotStageDefinition | null = null;
    private readonly wrong = new Set<string>();
    private nodes: Node[] = [];
    private demoTime = 0;
    private selectedId: string | null = null;
    private confirm: Node | null = null;
    public get confirmationNode(): Node | null { return this.confirm; }
    public get testedHotspotId(): string | null { return this.selectedId; }
    public get hotspotNodes(): readonly Node[] { return Object.freeze(this.nodes.slice()); }
    public get wrongHotspotIds(): readonly string[] { return Object.freeze([...this.wrong]); }
    public configure(definition: FaultSpotStageDefinition, callbacks: StageCallbacks): void { this.initialize(definition, callbacks); }
    public resetStage(): void { if (this.definition) this.initialize(this.definition, null); }
    public override setInputEnabled(enabled: boolean): void {
        super.setInputEnabled(enabled);
        if (!enabled) this.clearDiagnostic();
    }
    public override deactivateStage(): void { super.deactivateStage(); this.clearDiagnostic(); }
    private initialize(definition: FaultSpotStageDefinition, callbacks: StageCallbacks | null): void {
        const view = this.begin(1, callbacks, definition.device);
        this.definition = definition; this.wrong.clear(); this.demoTime = 0; this.selectedId = null; this.confirm = null;
        view.caption('fault-clue', definition.clueText, 0, 270, 620, 80, 27);
        this.nodes = definition.hotspots.map(h => {
            const node = view.control(h.id, h.position.x, h.position.y, h.size.width, h.size.height, h.label);
            this.tap(node, () => definition.diagnosticMode ? this.testKey(h.id) : this.select(h.id)); return node;
        });
        if (definition.device === 'printer') view.layer('day5b/layers/paper-crumpled', 'jammed-paper', 210, 43, 100, 108);
        if (definition.diagnosticMode) {
            // Decoration only: leave all six input roots at their frozen coordinates.
            view.deviceNode.setPosition(0, 155, 0);
            view.deviceNode.setScale(.88, .88, 1);
            view.caption('fault-clue', definition.clueText, 0, 260, 620, 46, 30);
            this.confirm = view.control('fault-confirm', 0, -330, 360, 88, '确认故障键');
            this.tap(this.confirm, () => this.confirmKey());
            this.showDiagnosticOutput('检测输出：请先试按一个键');
        } else if (definition.device === 'keyboard') view.caption('fault-output', '按下 S → 实际输出 SS', 0, 70, 570, 68, 31);
        if (definition.device === 'headset') {
            this.wave(this.nodes[0], 36); this.wave(this.nodes[1], 9);
            view.caption('fault-output', 'L 左：85   /   R 右：20', 0, -220, 600, 60, 30);
        }
        view.hint(definition.diagnosticMode ? '' : '观察异常线索，点出真正故障位置');
    }
    private showDiagnosticOutput(text: string): void {
        this.view?.caption('fault-output', text, 0, 20, 620, 62, 32);
    }
    private testKey(id: string): void {
        const d = this.definition;
        if (!d || !this.session.canInput) return;
        this.selectedId = id;
        for (const h of d.hotspots) this.view?.setControlState(h.id, h.id === id ? 'active' : 'neutral');
        this.view?.setControlState('fault-confirm', 'neutral');
        this.view?.press(id);
        this.showDiagnosticOutput(`${id} → ${id === d.faultId ? id + id : id}`);
        this.view?.feedback('当前检测结果如上，选好后点击确认');
    }
    private confirmKey(): void {
        if (!this.definition || !this.session.canInput) return;
        const id = this.selectedId;
        if (!id) { this.view?.feedback('请先试按一个候选键'); return; }
        if (id !== this.definition.faultId) {
            this.view?.setControlState('fault-confirm', 'error');
            this.view?.feedback('这个键输出正常，请继续检测', 'error');
            // A repeated confirmation (including another normal candidate) cannot stack penalties.
            if (this.wrong.size === 0) this.session.mistake();
            this.wrong.add(id); return;
        }
        this.select(id);
    }
    private clearDiagnostic(): void {
        if (!this.definition?.diagnosticMode) return;
        this.selectedId = null;
        for (const h of this.definition.hotspots) this.view?.setControlState(h.id, 'neutral');
        if (this.confirm) this.view?.setControlState('fault-confirm', 'neutral');
        this.showDiagnosticOutput('检测输出：请先试按一个键');
        this.view?.feedback('');
    }
    private select(id: string): void {
        const definition = this.definition;
        if (!definition || !this.session.canInput) return;
        const generation = this.session.generation;
        if (id !== definition.faultId) {
            this.view?.press(id, true);
            this.view?.setControlState(id, 'error');
            this.view?.feedback('这里工作正常，请根据线索再找找', 'error');
            if (!this.wrong.has(id)) { this.wrong.add(id); this.session.mistake(); }
            return;
        }
        this.view?.setControlState(id, 'success');
        this.view?.press(id);
        this.view?.feedback('找到问题了！继续下一步维修', 'success');
        if (definition.diagnosticMode) this.showDiagnosticOutput('已确认故障，进入按键复检');
        else if (definition.device === 'keyboard') this.view?.caption('fault-output', '修复后：按下 S → 输出 S', 0, 70, 570, 68, 31);
        this.session.setProgress(1);
        if (generation === this.session.generation) this.session.finish(0.4);
    }
    protected override update(dt: number): void {
        super.update(dt);
        if (!this.session.canInput || !this.definition || !Number.isFinite(dt) || dt < 0) return;
        if (this.definition.device === 'keyboard' && !this.definition.diagnosticMode) {
            this.demoTime = (this.demoTime + dt) % 1.8;
            const on = this.demoTime < 0.17 || (this.demoTime >= 0.34 && this.demoTime < 0.51);
            this.view?.setControlState(this.definition.faultId, on ? 'active' : 'neutral');
        }
    }
    private wave(node: Node | undefined, amplitude: number): void {
        const g = node?.getComponent(Graphics); if (!g) return;
        g.strokeColor = new Color(57, 143, 139, 255); g.lineWidth = 4;
        for (let i = -4; i <= 4; i += 1) {
            const height = Math.max(3, amplitude * (1 - Math.abs(i) / 6));
            g.moveTo(i * 13, 44 - height); g.lineTo(i * 13, 44 + height);
        }
        g.stroke();
    }
}
