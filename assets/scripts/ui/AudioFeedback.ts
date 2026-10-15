import { _decorator, AudioClip, AudioSource, Component, isValid, Node, warn } from 'cc';

const { ccclass, property, disallowMultiple } = _decorator;

export type FeedbackCue = 'ui-click' | 'success' | 'mistake' | 'clean-complete'
    | 'stage-complete' | 'order-complete' | 'run-complete';

/** One short, owned audio channel. Audio is optional and never controls gameplay. */
@ccclass('AudioFeedback')
@disallowMultiple
export class AudioFeedback extends Component {
    @property(AudioSource)
    public audioSource: AudioSource | null = null;
    @property(AudioClip)
    public uiClickClip: AudioClip | null = null;
    @property(AudioClip)
    public successClip: AudioClip | null = null;
    @property(AudioClip)
    public mistakeClip: AudioClip | null = null;
    @property(AudioClip)
    public cleanCompleteClip: AudioClip | null = null;
    @property(AudioClip)
    public stageCompleteClip: AudioClip | null = null;
    @property(AudioClip)
    public orderCompleteClip: AudioClip | null = null;
    @property(AudioClip)
    public runCompleteClip: AudioClip | null = null;
    @property({ min: 0, max: 1, step: 0.05 })
    public volume: number = 0.25;

    private soundEnabled: boolean = true;
    private unlocked: boolean = false;
    private playing: boolean = false;
    private endedNode: Node | null = null;
    private mistakeCooldown: number = 0;
    private readonly playedKeys = new Set<string>();
    private readonly pending: AudioClip[] = [];

    public get isSoundEnabled(): boolean { return this.soundEnabled; }
    public get isUnlocked(): boolean { return this.unlocked; }
    public get queuedSoundCount(): number { return this.pending.length; }

    protected onEnable(): void { this.bindEndedEvent(); }

    protected start(): void {
        if (!this.audioSource || !this.uiClickClip || !this.successClip || !this.mistakeClip
            || !this.cleanCompleteClip || !this.orderCompleteClip || !this.runCompleteClip || !this.stageCompleteClip) {
            warn('[AudioFeedback] Bind the AudioSource and all seven feedback AudioClips.');
        }
    }

    protected update(deltaTime: number): void {
        if (Number.isFinite(deltaTime) && deltaTime > 0) {
            this.mistakeCooldown = Math.max(0, this.mistakeCooldown - deltaTime);
        }
    }

    protected onDisable(): void { this.cleanup(); }
    protected onDestroy(): void { this.cleanup(); }

    /** Called synchronously from the real start/toggle click; this alone plays nothing. */
    public unlockFromUserGesture(): void { this.unlocked = true; }

    public setSoundEnabled(enabled: boolean): void {
        this.soundEnabled = enabled;
        if (!enabled) this.stopPlayback();
    }

    public toggleSound(): boolean {
        this.setSoundEnabled(!this.soundEnabled);
        return this.soundEnabled;
    }

    public play(cue: FeedbackCue, eventKey: string): boolean {
        if (!this.enabledInHierarchy || !this.soundEnabled || !this.unlocked || !isValid(this.audioSource)) return false;
        const key = `${cue}:${eventKey}`;
        if (this.playedKeys.has(key)) return false;
        const clip = this.clipFor(cue);
        if (!clip || (cue === 'mistake' && this.mistakeCooldown > 0)) return false;
        // A rapid event burst cannot grow an unbounded audio backlog.
        if (this.pending.length >= 4) return false;
        this.playedKeys.add(key);
        if (cue === 'mistake') this.mistakeCooldown = 0.12;
        this.bindEndedEvent();
        this.pending.push(clip);
        this.playNext();
        return true;
    }

    public resetPlaybackHistory(): void {
        this.stopPlayback();
        this.playedKeys.clear();
        this.mistakeCooldown = 0;
    }

    public stopPlayback(): void {
        this.pending.length = 0;
        this.playing = false;
        if (isValid(this.audioSource)) {
            try { this.audioSource!.stop(); } catch { /* Unsupported audio degrades silently. */ }
        }
    }

    private clipFor(cue: FeedbackCue): AudioClip | null {
        switch (cue) {
            case 'ui-click': return this.uiClickClip;
            case 'success': return this.successClip;
            case 'mistake': return this.mistakeClip;
            case 'clean-complete': return this.cleanCompleteClip;
            case 'stage-complete': return this.stageCompleteClip;
            case 'order-complete': return this.orderCompleteClip;
            case 'run-complete': return this.runCompleteClip;
        }
    }

    private playNext(): void {
        if (this.playing || !this.enabledInHierarchy || !this.unlocked || !this.soundEnabled) return;
        const clip = this.pending.shift();
        const source = this.audioSource;
        if (!clip || !source || !isValid(source)) return;
        this.playing = true;
        try {
            source.playOnAwake = false;
            source.loop = false;
            source.volume = Math.max(0, Math.min(1, this.volume));
            source.clip = clip;
            source.play();
        } catch {
            // Audio failure must not break input, order transitions or scoring.
            this.stopPlayback();
        }
    }

    /** Observe actual engine events; these messages are not playback requests. */
    private onStarted(): void {
        if (!this.enabled) return;
        const clip = this.audioSource?.clip;
        if (clip) console.info('[DeskRescue Audio] started ' + clip.name);
    }

    private onEnded(): void {
        if (!this.enabled) return;
        const clip = this.audioSource?.clip;
        if (clip) console.info('[DeskRescue Audio] ended ' + clip.name);
        this.playing = false;
        this.playNext();
    }

    private bindEndedEvent(): void {
        const node = this.audioSource?.node;
        if (!node || this.endedNode === node) return;
        this.unbindEndedEvent();
        this.endedNode = node;
        node.on(AudioSource.EventType.STARTED, this.onStarted, this);
        node.on(AudioSource.EventType.ENDED, this.onEnded, this);
    }

    private unbindEndedEvent(): void {
        this.endedNode?.off(AudioSource.EventType.STARTED, this.onStarted, this);
        this.endedNode?.off(AudioSource.EventType.ENDED, this.onEnded, this);
        this.endedNode = null;
    }

    private cleanup(): void {
        this.unbindEndedEvent();
        this.stopPlayback();
    }
}
