import { _decorator, Color, Component, isValid, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import type { CleanSwipeStageDefinition } from '../data/StageDefinition';

const { ccclass, property, disallowMultiple } = _decorator;
const PARTICLE_COUNT = 192;

interface DustParticle {
    readonly node: Node;
    readonly sprite: Sprite;
    readonly color: Color;
    x: number;
    y: number;
    width: number;
    height: number;
    baseAlpha: number;
    alpha: number;
    areaIndex: number;
    edgeShift: number;
    featherScale: number;
}

/** Detached values for engine fixtures; no Node, Sprite or mutable state is exposed. */
export interface CleanDustParticleDiagnostic {
    readonly index: number;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly baseAlpha: number;
    readonly alpha: number;
    readonly areaIndex: number;
}

/** A bounded, synchronous Sprite view. Only accepted controller paths can erase dust. */
@ccclass('V21CleanDustView')
@disallowMultiple
export class V21CleanDustView extends Component {
    @property(SpriteFrame) public dustFrame: SpriteFrame | null = null;
    /** Identity-transform child of the controller's DirtLayer, outside every logical cell. */
    @property(Node) public artworkRoot: Node | null = null;

    private readonly particles: DustParticle[] = [];
    private configured: boolean = false;
    private created: number = 0;

    public get particleCount(): number { return this.particles.length; }
    public get totalCreatedParticles(): number { return this.created; }
    public get particleDiagnostics(): readonly CleanDustParticleDiagnostic[] {
        return Object.freeze(this.particles.map((particle, index) => Object.freeze({
            index, x: particle.x, y: particle.y, width: particle.width, height: particle.height,
            baseAlpha: particle.baseAlpha, alpha: particle.alpha, areaIndex: particle.areaIndex,
        })));
    }

    public configure(definition: CleanSwipeStageDefinition): void {
        if (!isValid(this)) return;
        this.configured = false;
        for (const particle of this.particles) particle.node.active = false;
        const root = this.artworkRoot, frame = this.dustFrame;
        if (!root || !frame || !isValid(root) || !definition.areas.length) return;
        const totalArea = definition.areas.reduce((sum, area) => sum + area.size.width * area.size.height, 0);
        if (!Number.isFinite(totalArea) || totalArea <= 0) return;
        this.prepare(root, frame);
        const seed = this.seed(definition.id);
        let areaIndex = 0, cumulativeArea = definition.areas[0].size.width * definition.areas[0].size.height;
        for (let index = 0; index < this.particles.length; index += 1) {
            const areaSample = (index + 0.5) * totalArea / PARTICLE_COUNT;
            while (areaIndex < definition.areas.length - 1 && areaSample > cumulativeArea) {
                areaIndex += 1;
                cumulativeArea += definition.areas[areaIndex].size.width * definition.areas[areaIndex].size.height;
            }
            const area = definition.areas[areaIndex], particle = this.particles[index];
            const width = Math.min(area.size.width, 28 + this.noise(index, seed + 11) * 34);
            const height = Math.min(area.size.height, 28 + this.noise(index, seed + 29) * 34);
            // Low-discrepancy positions plus bounded deterministic jitter have no cell/row alignment.
            const u = this.unit(this.halton(index + 1, 2) + (this.noise(index, seed + 41) - 0.5) * 0.07);
            const v = this.unit(this.halton(index + 1, 3) + (this.noise(index, seed + 59) - 0.5) * 0.07);
            particle.x = area.position.x + (u - 0.5) * (area.size.width - width);
            particle.y = area.position.y + (v - 0.5) * (area.size.height - height);
            particle.width = width; particle.height = height; particle.areaIndex = areaIndex;
            particle.baseAlpha = 60 + Math.floor(this.noise(index, seed + 73) * 37);
            // Stable per-particle falloff breaks a common straight edge without moving dust or hitboxes.
            particle.edgeShift = (this.noise(index, seed + 89) - 0.5) * Math.min(width, height) * 0.56;
            particle.featherScale = 0.9 + this.noise(index, seed + 107) * 0.9;
            particle.node.setPosition(particle.x, particle.y, 0);
            particle.node.setScale(index % 2 ? -1 : 1, index % 3 ? 1 : -1, 1);
            particle.node.getComponent(UITransform)!.setContentSize(width, height);
            this.setAlpha(particle, particle.baseAlpha);
            particle.node.active = true;
        }
        this.configured = true;
    }

    /** Coordinates and radius are already accepted and converted by the original controller. */
    public sweep(x0: number, y0: number, x1: number, y1: number, radius: number): void {
        if (!this.configured || !this.enabledInHierarchy || radius <= 0
            || !Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1)
            || !Number.isFinite(y1) || !Number.isFinite(radius)) return;
        const dx = x1 - x0, dy = y1 - y0, lengthSquared = dx * dx + dy * dy;
        for (const particle of this.particles) {
            if (!particle.alpha) continue;
            const projection = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
                ((particle.x - x0) * dx + (particle.y - y0) * dy) / lengthSquared));
            const distance = Math.hypot(particle.x - x0 - projection * dx, particle.y - y0 - projection * dy);
            // One broad, seeded smoothstep keeps the real swept band, with irregular soft edges.
            const feather = Math.max(18, Math.min(particle.width, particle.height) * particle.featherScale);
            const inner = Math.max(0, radius + particle.edgeShift - feather * 0.5);
            const outer = radius + particle.edgeShift + feather * 0.5;
            const t = Math.max(0, Math.min(1, (distance - inner) / (outer - inner)));
            const alpha = Math.min(particle.alpha, Math.round(particle.baseAlpha * t * t * (3 - 2 * t)));
            if (alpha !== particle.alpha) this.setAlpha(particle, alpha);
        }
    }

    // Disable/enable intentionally retains every alpha. Reset belongs only to configure().
    protected onDestroy(): void {
        this.configured = false;
        for (const particle of this.particles) if (isValid(particle.node)) particle.node.destroy();
        this.particles.length = 0;
    }

    private prepare(root: Node, frame: SpriteFrame): void {
        while (this.particles.length < PARTICLE_COUNT) {
            const node = new Node(`V21Dust${this.particles.length + 1}`);
            node.layer = root.layer; node.parent = root;
            node.addComponent(UITransform);
            const sprite = node.addComponent(Sprite);
            sprite.type = Sprite.Type.SIMPLE; sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            this.particles.push({ node, sprite, color: new Color(255, 255, 255, 0),
                x: 0, y: 0, width: 0, height: 0, baseAlpha: 0, alpha: 0, areaIndex: 0,
                edgeShift: 0, featherScale: 1 });
            this.created += 1;
        }
        for (const particle of this.particles) {
            particle.node.parent = root; particle.node.layer = root.layer;
            particle.sprite.enabled = true; particle.sprite.spriteFrame = frame;
        }
    }

    private setAlpha(particle: DustParticle, alpha: number): void {
        particle.alpha = alpha; particle.color.a = alpha; particle.sprite.color = particle.color;
    }

    private unit(value: number): number { return Math.max(0, Math.min(1, value)); }
    private halton(index: number, base: number): number {
        let fraction = 1, value = 0;
        while (index > 0) { fraction /= base; value += fraction * (index % base); index = Math.floor(index / base); }
        return value;
    }
    private seed(value: string): number {
        let result = 17;
        for (let index = 0; index < value.length; index += 1) result = Math.imul(result, 31) + value.charCodeAt(index) | 0;
        return result;
    }
    private noise(index: number, seed: number): number {
        let value = Math.imul(index + 1, 374761393) ^ Math.imul(seed, 668265263);
        value = Math.imul(value ^ value >>> 13, 1274126177);
        return ((value ^ value >>> 16) >>> 0) / 4294967296;
    }
}
