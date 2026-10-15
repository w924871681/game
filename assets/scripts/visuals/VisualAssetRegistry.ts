import { _decorator, CCString, Component, SpriteFrame } from 'cc';

const { ccclass, property } = _decorator;

/** Scene-owned, synchronous local SpriteFrame bindings; no global or remote loader. */
@ccclass('VisualAssetRegistry')
export class VisualAssetRegistry extends Component {
    @property([CCString])
    public keys: string[] = [];

    @property([SpriteFrame])
    public frames: SpriteFrame[] = [];

    public requireFrame(key: string): SpriteFrame {
        const index = this.keys.indexOf(key);
        const frame = index < 0 ? null : this.frames[index];
        if (!frame) throw new Error(`[VisualAssetRegistry] Inspector SpriteFrame is missing: ${key}`);
        return frame;
    }

    public validateBindings(): void {
        if (this.keys.length !== this.frames.length || new Set(this.keys).size !== this.keys.length) {
            throw new Error('[VisualAssetRegistry] Keys and frames must be unique, aligned arrays.');
        }
        this.keys.forEach(key => this.requireFrame(key));
    }
}
