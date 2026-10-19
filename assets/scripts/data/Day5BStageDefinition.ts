import type { StageKind as LegacyStageKind, StageDefinition as LegacyStageDefinition, StageBaseDefinition as LegacyStageBaseDefinition, PointDefinition, SizeDefinition } from './StageDefinition';
import type { OrderDefinition } from './OrderDefinition';
export type { PointDefinition, SizeDefinition, LegacyStageDefinition };
export type StageKind = LegacyStageKind | 'fault-spot' | 'rotary-control' | 'guided-trace' | 'gauge-tune' | 'sequence-test';
interface StageBaseDefinition extends Omit<LegacyStageBaseDefinition, 'kind'> { readonly kind: StageKind }
export type Day5BDevice = 'controller' | 'printer' | 'keyboard' | 'fan' | 'headset' | 'livestream';

export interface HotspotDefinition {
    readonly id: string;
    readonly label: string;
    readonly position: PointDefinition;
    readonly size: SizeDefinition;
}

export interface FaultSpotStageDefinition extends StageBaseDefinition {
    readonly kind: 'fault-spot';
    readonly device: Day5BDevice;
    readonly faultId: string;
    readonly clueText: string;
    /** Opt-in keyboard diagnosis: testing is neutral; only an explicit confirmation judges. */
    readonly diagnosticMode?: 'test-and-confirm';
    readonly hotspots: readonly [HotspotDefinition, ...HotspotDefinition[]];
}

interface RotaryBaseDefinition extends StageBaseDefinition {
    readonly kind: 'rotary-control';
    readonly device: Day5BDevice;
    readonly radius: number;
    readonly ringWidth: number;
}
export interface RotaryAlignStageDefinition extends RotaryBaseDefinition {
    readonly mode: 'align';
    readonly center: PointDefinition;
    readonly initialAngle: number;
    readonly targetAngle: number;
    readonly toleranceDegrees: number;
    readonly holdSeconds: number;
}
export interface RotaryUnscrewStageDefinition extends RotaryBaseDefinition {
    readonly mode: 'unscrew';
    readonly screws: readonly [HotspotDefinition, ...HotspotDefinition[]];
    readonly requiredDegrees: number;
    readonly direction: 'clockwise' | 'counterclockwise';
}
export type RotaryControlStageDefinition = RotaryAlignStageDefinition | RotaryUnscrewStageDefinition;

export interface GuidedTraceStageDefinition extends StageBaseDefinition {
    readonly kind: 'guided-trace';
    readonly device: Day5BDevice;
    readonly points: readonly [PointDefinition, PointDefinition, PointDefinition, PointDefinition];
    readonly tolerance: number;
    readonly checkpointRadius: number;
    readonly maxSampleDistance: number;
}

export type GaugeMode = 'fan' | 'stereo' | 'broadcast';
export interface GaugeTuneStageDefinition extends StageBaseDefinition {
    readonly kind: 'gauge-tune';
    readonly device: Day5BDevice;
    readonly mode: GaugeMode;
    readonly initialControls: readonly [number, number];
    readonly holdSeconds: number;
}
export interface SequenceTestStageDefinition extends StageBaseDefinition {
    readonly kind: 'sequence-test';
    readonly device: Day5BDevice;
    readonly choices: readonly [HotspotDefinition, ...HotspotDefinition[]];
    readonly sequence: readonly [string, ...string[]];
}
export type Day5BStageDefinition = FaultSpotStageDefinition | RotaryControlStageDefinition
    | GuidedTraceStageDefinition | GaugeTuneStageDefinition | SequenceTestStageDefinition;
export type StageDefinition = LegacyStageDefinition | Day5BStageDefinition;

export interface PlayableOrderDefinition extends Omit<OrderDefinition, 'stages'> { readonly stages: readonly [StageDefinition, ...StageDefinition[]] }
