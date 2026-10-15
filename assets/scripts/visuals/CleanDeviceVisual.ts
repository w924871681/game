import { _decorator, Color, Component, Sprite, UITransform } from 'cc';
import type { CleanSwipeStageDefinition } from '../data/StageDefinition';
import { VisualAssetRegistry } from './VisualAssetRegistry';
import { cleanVisualKey } from './VisualCatalog';

const { ccclass, property } = _decorator;

@ccclass('CleanDeviceVisual')
export class CleanDeviceVisual extends Component {
    @property(Sprite)
    public device: Sprite | null = null;

    public configure(registry: VisualAssetRegistry, definition: CleanSwipeStageDefinition): void {
        if (!this.device) throw new Error('[CleanDeviceVisual] Bind the device Sprite below DirtLayer.');
        const area = definition.areas[0];
        this.device.spriteFrame = registry.requireFrame(cleanVisualKey(definition.id, area.id));
        this.device.sizeMode = Sprite.SizeMode.CUSTOM;
        this.device.type = Sprite.Type.SIMPLE;
        this.device.color = new Color(255, 255, 255, 255);
        this.device.node.setPosition(area.position.x, area.position.y, 0);
        this.device.node.getComponent(UITransform)?.setContentSize(area.size.width + 32, area.size.height + 32);
    }
}
