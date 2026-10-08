export interface PositionDefinition {
    readonly x: number;
    readonly y: number;
}

export interface ItemDefinition {
    readonly id: string;
    readonly label: string;
    readonly targetLabel: string;
    readonly startPosition: PositionDefinition;
    readonly targetPosition: PositionDefinition;
}

export interface ScoreRule {
    readonly threeStarMaxTimeSeconds: number;
    readonly twoStarMaxTimeSeconds: number;
    readonly threeStarMaxMistakes: number;
    readonly twoStarMaxMistakes: number;
}

export interface LevelDefinition {
    readonly id: number;
    readonly title: string;
    readonly instruction: string;
    readonly snapDistance: number;
    readonly scoreRule: ScoreRule;
    readonly items: readonly [ItemDefinition, ItemDefinition, ItemDefinition];
}
