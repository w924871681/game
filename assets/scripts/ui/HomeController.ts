import { _decorator, Button, Component, isValid, Label, Node, Sprite, SpriteFrame, warn } from 'cc';
import { GameState, LevelManager } from '../core/LevelManager';
import { AudioFeedback } from './AudioFeedback';

const { ccclass, property, disallowMultiple } = _decorator;

/** This component lives on Canvas; hiding HomeOverlay does not disable the sound toggle. */
@ccclass('HomeController')
@disallowMultiple
export class HomeController extends Component {
    @property(LevelManager)
    public levelManager: LevelManager | null = null;
    @property(Node)
    public overlay: Node | null = null;
    @property(Button)
    public startButton: Button | null = null;
    @property(Button)
    public soundButton: Button | null = null;
    @property(Button)
    public homeButton: Button | null = null;
    @property(Label)
    public soundStateLabel: Label | null = null;
    @property(Sprite)
    public soundIcon: Sprite | null = null;
    @property(SpriteFrame)
    public soundOnFrame: SpriteFrame | null = null;
    @property(SpriteFrame)
    public soundOffFrame: SpriteFrame | null = null;
    @property(AudioFeedback)
    public audioFeedback: AudioFeedback | null = null;

    private startNode: Node | null = null;
    private soundNode: Node | null = null;
    private homeNode: Node | null = null;
    private requestingStart: boolean = false;
    private requestingHome: boolean = false;
    private toggleSequence: number = 0;

    protected start(): void {
        if (!this.hasBindings()) return;
        this.synchronizeHome();
        this.bindButtons();
    }

    protected onEnable(): void {
        this.synchronizeHome();
        this.bindButtons();
    }

    protected onDisable(): void { this.unbindButtons(); }
    protected onDestroy(): void { this.unbindButtons(); }

    public startRepair(): boolean {
        if (!this.enabledInHierarchy || this.requestingStart || this.levelManager?.hasStarted || !this.hasBindings()) return false;
        this.requestingStart = true;
        this.startButton!.interactable = false;
        this.audioFeedback!.unlockFromUserGesture();
        let started = false;
        try {
            started = this.levelManager!.startFirstOrder();
            if (started) {
                this.overlay!.active = false;
                this.audioFeedback!.play('ui-click', 'home-start');
            }
        } finally {
            this.requestingStart = false;
            this.startButton!.interactable = !this.levelManager!.hasStarted;
        }
        return started;
    }

    public toggleSound(): void {
        if (!this.enabledInHierarchy || !this.audioFeedback || !isValid(this.audioFeedback)) return;
        this.audioFeedback.toggleSound();
        this.updateSoundLabel();
        // No sound on the initial home screen. After starting, this is a fresh user gesture.
        if (this.levelManager?.hasStarted && this.audioFeedback.isSoundEnabled) {
            this.audioFeedback.unlockFromUserGesture();
            this.audioFeedback.play('ui-click', `sound-toggle-${++this.toggleSequence}`);
        }
    }

    public returnToHome(): boolean {
        if (!this.enabledInHierarchy || this.requestingHome || !this.hasBindings()
            || this.levelManager!.state !== GameState.DemoComplete) return false;
        this.requestingHome = true;
        if (this.homeButton) this.homeButton.interactable = false;
        try {
            if (!this.levelManager!.returnHomeFromFinal()) return false;
            this.showHome();
            return true;
        } finally {
            this.requestingHome = false;
            // Its final-only parent is hidden; the next final summary may reuse this Button.
            if (this.homeButton) this.homeButton.interactable = true;
        }
    }

    public showHome(): void {
        if (this.levelManager?.hasStarted) return;
        this.requestingStart = false;
        this.synchronizeHome();
    }

    private synchronizeHome(): void {
        if (this.overlay) this.overlay.active = !this.levelManager?.hasStarted;
        if (this.startButton) this.startButton.interactable = !this.levelManager?.hasStarted;
        this.updateSoundLabel();
    }

    private updateSoundLabel(): void {
        const enabled = this.audioFeedback?.isSoundEnabled ?? false;
        if (this.soundStateLabel) this.soundStateLabel.string = enabled ? '音效：开' : '音效：关';
        const frame = enabled ? this.soundOnFrame : this.soundOffFrame;
        if (this.soundIcon && frame) this.soundIcon.spriteFrame = frame;
    }

    private hasBindings(): boolean {
        const valid = isValid(this.levelManager) && isValid(this.overlay) && isValid(this.startButton)
            && isValid(this.soundButton) && isValid(this.soundStateLabel) && isValid(this.audioFeedback);
        if (!valid) warn('[HomeController] Bind LevelManager, HomeOverlay, both Buttons, sound label and AudioFeedback.');
        return valid;
    }

    private bindButtons(): void {
        const start = this.startButton?.node;
        const sound = this.soundButton?.node;
        const home = this.homeButton?.node ?? null;
        if (start === this.startNode && sound === this.soundNode && home === this.homeNode) return;
        this.unbindButtons();
        this.startNode = start ?? null;
        this.soundNode = sound ?? null;
        this.homeNode = home ?? null;
        this.startNode?.on(Button.EventType.CLICK, this.onStartClicked, this);
        this.soundNode?.on(Button.EventType.CLICK, this.toggleSound, this);
        this.homeNode?.on(Button.EventType.CLICK, this.onHomeClicked, this);
    }

    private onStartClicked(): void { this.startRepair(); }
    private onHomeClicked(): void { this.returnToHome(); }

    private unbindButtons(): void {
        this.startNode?.off(Button.EventType.CLICK, this.onStartClicked, this);
        this.soundNode?.off(Button.EventType.CLICK, this.toggleSound, this);
        this.homeNode?.off(Button.EventType.CLICK, this.onHomeClicked, this);
        this.startNode = null;
        this.soundNode = null;
        this.homeNode = null;
    }
}
