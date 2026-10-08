import { _decorator, Component, Label } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property(Label)
    public statusLabel: Label | null = null;

    @property({ min: 1, step: 1 })
    public totalItems: number = 3;

    private placedCount: number = 0;
    private initialStatus: string = '把设备拖到对应区域';
    private completionStatus: string = '订单完成！';

    public onLevelComplete: (() => void) | null = null;
    public onProgressChanged: ((completedItems: number, totalItems: number) => void) | null = null;
    public onMistake: (() => void) | null = null;

    public get completedItems(): number {
        return this.placedCount;
    }

    public get isLevelComplete(): boolean {
        return this.placedCount >= this.totalItems;
    }

    protected start(): void {
        this.updateStatus();
    }

    public beginLevel(
        totalItems: number,
        instruction: string = '把设备拖到对应区域',
        completionMessage: string = '订单完成！',
    ): void {
        if (!Number.isInteger(totalItems) || totalItems <= 0) {
            throw new RangeError('A level must contain a positive integer number of items.');
        }

        this.placedCount = 0;
        this.totalItems = totalItems;
        this.initialStatus = instruction;
        this.completionStatus = completionMessage;
        this.updateStatus();
    }

    public onItemPlaced(): void {
        // DraggableItem locks itself before notifying us; also cap the total.
        if (this.placedCount >= this.totalItems) {
            return;
        }

        this.placedCount += 1;
        this.updateStatus();
        this.onProgressChanged?.(this.placedCount, this.totalItems);
        if (this.isLevelComplete) {
            this.onLevelComplete?.();
        }
    }

    public reportMistake(): void {
        if (!this.isLevelComplete) {
            this.onMistake?.();
        }
    }

    private updateStatus(): void {
        if (!this.statusLabel) {
            return;
        }

        if (this.placedCount === 0) {
            this.statusLabel.string = this.initialStatus;
        } else if (this.placedCount >= this.totalItems) {
            this.statusLabel.string = this.completionStatus;
        } else {
            this.statusLabel.string = `已完成 ${this.placedCount} / ${this.totalItems}`;
        }
    }
}
