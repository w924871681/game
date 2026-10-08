import type { ScoreRule } from './LevelDefinition';
import type { StageDefinition } from './StageDefinition';

export interface OrderDefinition {
    readonly id: number;
    readonly key: string;
    readonly chapterTitle: string;
    readonly title: string;
    readonly scoreRule: ScoreRule;
    readonly stages: readonly [StageDefinition, ...StageDefinition[]];
}
