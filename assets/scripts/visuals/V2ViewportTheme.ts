import { _decorator, Component } from 'cc';

const { ccclass } = _decorator;

/** Web-only letterbox paint. It never changes canvas size, fit policy or input coordinates. */
@ccclass('V2ViewportTheme')
export class V2ViewportTheme extends Component {
    private canvas: HTMLElement | null = null;
    private observer: ResizeObserver | null = null;
    private originalClip: string = '';

    protected onLoad(): void {
        if (typeof document === 'undefined' || !document.getElementById('GameCanvas')) return;
        for (const element of [document.documentElement, document.body,
            document.getElementById('GameDiv'), document.getElementById('Cocos3dGameContainer')]) {
            if (element) element.style.background = '#C3ECE0';
        }
        this.canvas = document.getElementById('GameCanvas');
        this.originalClip = this.canvas!.style.clipPath;
        this.paintLetterbox();
        if (typeof ResizeObserver !== 'undefined') {
            this.observer = new ResizeObserver(() => this.paintLetterbox());
            this.observer.observe(this.canvas!);
        }
    }

    protected onDestroy(): void {
        this.observer?.disconnect();
        if (this.canvas) this.canvas.style.clipPath = this.originalClip;
    }

    private paintLetterbox(): void {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const scale = Math.min(rect.width / 720, rect.height / 1280);
        const horizontal = Math.max(0, (rect.width - 720 * scale) / 2);
        const vertical = Math.max(0, (rect.height - 1280 * scale) / 2);
        // CSS clipping exposes the mint page behind opaque WebGL letterboxing.
        // It changes neither DOM bounds nor the engine's SHOW_ALL/input transform.
        this.canvas.style.clipPath = `inset(${vertical}px ${horizontal}px)`;
    }
}
