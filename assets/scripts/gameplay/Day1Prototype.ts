import {
    _decorator, Canvas, Color, Component, Graphics, Label, Layers,
    Node, ResolutionPolicy, UITransform, view,
} from 'cc';
import { GameController } from '../core/GameController';
import { DraggableItem } from './DraggableItem';

const { ccclass, requireComponent } = _decorator;

/** Day 1 development bootstrap / fallback harness; keep disabled in the formal Day 2 scene. */
@ccclass('Day1Prototype')
@requireComponent(Canvas)
export class Day1Prototype extends Component {
    protected onLoad(): void {
        // Prevent a second UI when the Canvas already owns the formal Day 2 controller.
        if (this.node.getChildByName('Header') || this.node.getChildByName('PlayArea')) {
            return;
        }
        view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);

        const statusNode = this.createNode('StatusLabel', this.node, 0, 520, 660, 80);
        const statusLabel = statusNode.addComponent(Label);
        statusLabel.string = '把 A、B、C 拖到对应位置';
        statusLabel.fontSize = 32;
        statusLabel.lineHeight = 44;
        statusLabel.color = new Color(245, 245, 245, 255);
        statusLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        statusLabel.verticalAlign = Label.VerticalAlign.CENTER;
        statusLabel.overflow = Label.Overflow.SHRINK;
        statusLabel.enableWrapText = false;

        const controllerNode = this.createNode('GameController', this.node, 0, 0, 0, 0);
        const controller = controllerNode.addComponent(GameController);
        controller.statusLabel = statusLabel;
        controller.totalItems = 3;
        controller.beginLevel(3, '把 A、B、C 拖到对应位置', '桌面整理完成！');

        const playArea = this.createNode('PlayArea', this.node, 0, 0, 720, 1000);
        const letters: readonly string[] = ['A', 'B', 'C'];
        const colors: readonly Color[] = [
            new Color(74, 144, 226, 255),
            new Color(242, 167, 65, 255),
            new Color(63, 180, 138, 255),
        ];

        // All target nodes are drawn before items, so placed items stay visible on top.
        const targets = letters.map((letter, index) => {
            const target = this.createNode(`Target${letter}`, playArea, (index - 1) * 220, 240, 120, 120);
            this.drawBlock(target, 120, new Color(45, 52, 66, 255), colors[index]);
            this.addLetter(target, letter, 36, colors[index]);
            return target;
        });

        letters.forEach((letter, index) => {
            const item = new Node(`Item${letter}`);
            item.active = false;
            item.layer = Layers.Enum.UI_2D;
            item.setPosition((index - 1) * 220, -260, 0);
            item.addComponent(UITransform).setContentSize(160, 160);
            this.drawBlock(item, 160, colors[index], colors[index]);
            this.addLetter(item, letter, 76, new Color(255, 255, 255, 255));

            const draggable = item.addComponent(DraggableItem);
            draggable.target = targets[index];
            draggable.gameController = controller;
            draggable.snapDistance = 72;
            draggable.animationsEnabled = false;
            // Configure references and position before the component's onLoad / onEnable.
            item.parent = playArea;
            item.active = true;
        });
    }

    private createNode(
        name: string, parent: Node, x: number, y: number, width: number, height: number,
    ): Node {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        node.setPosition(x, y, 0);
        node.addComponent(UITransform).setContentSize(width, height);
        node.parent = parent;
        return node;
    }

    private drawBlock(node: Node, size: number, fill: Color, stroke: Color): void {
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = fill;
        graphics.strokeColor = stroke;
        graphics.lineWidth = 4;
        graphics.rect(-size / 2, -size / 2, size, size);
        graphics.fill();
        graphics.stroke();
    }

    private addLetter(node: Node, letter: string, fontSize: number, color: Color): void {
        const labelNode = this.createNode('Letter', node, 0, 0, 110, 110);
        const label = labelNode.addComponent(Label);
        label.string = letter;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 12;
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        label.enableWrapText = false;
    }
}
