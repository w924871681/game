import { _decorator, Node } from 'cc';
import type { SequenceTestStageDefinition } from '../data/Day5BStageDefinition';
import type { StageCallbacks } from './StageRuntime';
import { Day5BStageController } from './Day5BStageController';

const { ccclass } = _decorator;
@ccclass('SequenceTestStageController')
export class SequenceTestStageController extends Day5BStageController {
    private definition: SequenceTestStageDefinition | null = null;
    private completed = 0;
    private nodes: Node[] = [];
    public get choiceNodes(): readonly Node[] { return Object.freeze(this.nodes.slice()); }
    public get currentTargetId(): string | null { return this.definition?.sequence[this.completed] ?? null; }
    public configure(definition: SequenceTestStageDefinition, callbacks: StageCallbacks): void { this.initialize(definition, callbacks); }
    public resetStage(): void { if (this.definition) this.initialize(this.definition, null); }
    private initialize(definition: SequenceTestStageDefinition, callbacks: StageCallbacks | null): void {
        const view = this.begin(definition.sequence.length, callbacks, definition.device);
        this.definition = definition; this.completed = 0;
        this.nodes = definition.choices.map(choice => {
            const node = view.control(choice.id, choice.position.x, choice.position.y, choice.size.width, choice.size.height, choice.label);
            this.tap(node, () => this.select(choice.id)); return node;
        });
        view.hint('按当前文字提示测试，错键不清空已完成步骤'); this.refresh();
    }
    private select(id: string): void {
        const definition = this.definition;
        if (!definition || !this.session.canInput) return;
        if (id !== this.currentTargetId) {
            this.view?.press(id, true);
            this.view?.setControlState(id, 'error');
            const label = definition.choices.find(c => c.id === this.currentTargetId)?.label ?? '';
            this.view?.feedback(`当前应按 ${label}，已完成步骤保留`, 'error');
            this.session.mistake(); return;
        }
        const generation = this.session.generation;
        this.view?.press(id);
        this.completed += 1; this.refresh();
        this.view?.feedback('按键响应正常！', 'success');
        this.session.setProgress(this.completed);
        if (generation !== this.session.generation) return;
        if (this.completed === definition.sequence.length) {
            this.view?.feedback(definition.device === 'livestream' ? '直播已恢复！救援成功' : '功能检测全部通过！', 'success');
            this.session.finish(0.45);
        }
    }
    private refresh(): void {
        const definition = this.definition; if (!definition || !this.view) return;
        const next = definition.choices.find(c => c.id === this.currentTargetId)?.label;
        this.view.hint('');
        this.view.caption('sequence-target', next ? `请按：${next}` : '全部功能正常', 0, -329, 600, 36, 30);
        this.view.caption('sequence-lights', definition.sequence.map((_, i) => i < this.completed ? '●' : '○').join('  '),
            0, -360, 600, 20, 22);
        definition.choices.forEach(choice => this.view!.setControlState(choice.id,
            definition.sequence.slice(0, this.completed).indexOf(choice.id) >= 0 ? 'success'
                : choice.id === this.currentTargetId ? 'active' : 'neutral'));
    }
}
