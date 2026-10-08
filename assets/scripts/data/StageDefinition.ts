export interface PointDefinition {
    readonly x: number;
    readonly y: number;
}

export interface SizeDefinition {
    readonly width: number;
    readonly height: number;
}

export type StageKind = 'drag-match' | 'cable-connect' | 'clean-swipe';

export interface StageBaseDefinition {
    readonly id: string;
    readonly kind: StageKind;
    readonly title: string;
    readonly instruction: string;
    readonly tutorial: string;
}

export interface DragPairDefinition {
    readonly id: string;
    readonly itemLabel: string;
    readonly targetLabel: string;
    readonly itemStart: PointDefinition;
    readonly targetPosition: PointDefinition;
    readonly snapDistance?: number;
}

export interface DragMatchStageDefinition extends StageBaseDefinition {
    readonly kind: 'drag-match';
    readonly defaultSnapDistance: number;
    readonly pairs: readonly [DragPairDefinition, ...DragPairDefinition[]];
}

export type CableStyle = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'orange';

export interface CableDefinition {
    readonly id: string;
    readonly cableLabel: string;
    readonly portLabel: string;
    readonly cableStart: PointDefinition;
    readonly portPosition: PointDefinition;
    readonly snapDistance: number;
    readonly style: CableStyle;
}

export interface CableConnectStageDefinition extends StageBaseDefinition {
    readonly kind: 'cable-connect';
    readonly cables: readonly [CableDefinition, ...CableDefinition[]];
}

export interface CleanAreaDefinition {
    readonly id: string;
    readonly position: PointDefinition;
    readonly size: SizeDefinition;
    readonly columns: number;
    readonly rows: number;
}

export interface CleanSwipeStageDefinition extends StageBaseDefinition {
    readonly kind: 'clean-swipe';
    readonly brushRadius: number;
    readonly requiredRatio: number;
    readonly areas: readonly [CleanAreaDefinition, ...CleanAreaDefinition[]];
}

export type StageDefinition = DragMatchStageDefinition | CableConnectStageDefinition | CleanSwipeStageDefinition;
