import { _decorator, Component, Label } from 'cc';
import type { ScoreRule } from '../data/LevelDefinition';

const { ccclass, property } = _decorator;

export type StarRating = 1 | 2 | 3;

export interface LevelResult {
    readonly levelId: number;
    readonly elapsedMs: number;
    readonly mistakes: number;
    readonly score: number;
    readonly stars: StarRating;
}

export interface RunSummary {
    readonly completedOrders: number;
    readonly totalElapsedMs: number;
    readonly totalMistakes: number;
    readonly totalScore: number;
    readonly earnedStars: number;
    readonly maxStars: number;
}

export function formatStars(stars: StarRating): string {
    return stars === 3 ? '★★★' : stars === 2 ? '★★☆' : '★☆☆';
}

@ccclass('RunController')
export class RunController extends Component {
    @property(Label)
    public timeLabel: Label | null = null;

    @property(Label)
    public mistakeLabel: Label | null = null;

    private currentLevelId: number | null = null;
    private currentScoreRule: ScoreRule | null = null;
    private elapsedMs: number = 0;
    private mistakes: number = 0;
    private levelActive: boolean = false;
    private paused: boolean = false;
    private omitNextUpdate: boolean = false;
    private readonly results: LevelResult[] = [];

    public get currentElapsedMs(): number {
        return this.elapsedMs;
    }

    public get currentMistakes(): number {
        return this.mistakes;
    }

    public get isLevelRunning(): boolean {
        return this.levelActive && !this.paused;
    }

    public get levelResults(): readonly LevelResult[] {
        return Object.freeze([...this.results]);
    }

    public get summary(): RunSummary {
        let totalElapsedMs = 0;
        let totalMistakes = 0;
        let totalScore = 0;
        let earnedStars = 0;
        for (const result of this.results) {
            totalElapsedMs += result.elapsedMs;
            totalMistakes += result.mistakes;
            totalScore += result.score;
            earnedStars += result.stars;
        }

        return Object.freeze({
            completedOrders: this.results.length,
            totalElapsedMs,
            totalMistakes,
            totalScore,
            earnedStars,
            maxStars: this.results.length * 3,
        });
    }

    protected update(deltaTime: number): void {
        if (this.omitNextUpdate) {
            this.omitNextUpdate = false;
            return;
        }
        this.advanceTime(deltaTime);
    }

    /** Exclude the frame containing synchronous stage construction; explicit advanceTime is unchanged. */
    public skipNextFrame(): void {
        this.omitNextUpdate = true;
    }

    public startNewRun(): void {
        this.results.length = 0;
        this.currentLevelId = null;
        this.currentScoreRule = null;
        this.elapsedMs = 0;
        this.mistakes = 0;
        this.levelActive = false;
        this.paused = false;
        this.omitNextUpdate = false;
        this.updateHud();
    }

    public beginLevel(levelId: number, scoreRule: ScoreRule): void {
        if (!Number.isInteger(levelId) || levelId <= 0) {
            throw new RangeError('A level ID must be a positive integer.');
        }
        if (this.results.some((result) => result.levelId === levelId)) {
            throw new RangeError('Discard the completed result before restarting this level.');
        }
        this.validateScoreRule(scoreRule);

        // Copy the rule so external configuration edits cannot change an active order.
        this.currentScoreRule = Object.freeze({ ...scoreRule });
        this.currentLevelId = levelId;
        this.elapsedMs = 0;
        this.mistakes = 0;
        this.levelActive = true;
        this.paused = false;
        this.omitNextUpdate = false;
        this.updateHud();
    }

    public advanceTime(deltaSeconds: number): void {
        if (!this.isLevelRunning || !Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
            return;
        }

        const nextElapsedMs = this.elapsedMs + deltaSeconds * 1000;
        if (!Number.isFinite(nextElapsedMs)) {
            return;
        }
        this.elapsedMs = nextElapsedMs;
        this.updateHud();
    }

    public recordMistake(): void {
        if (!this.isLevelRunning) {
            return;
        }

        this.mistakes += 1;
        this.updateHud();
    }

    public finishLevel(): LevelResult | null {
        if (!this.levelActive || this.currentLevelId === null || !this.currentScoreRule) {
            return null;
        }

        const elapsedMs = Math.round(this.elapsedMs);
        const rule = this.currentScoreRule;
        const meetsThreeStars = elapsedMs <= rule.threeStarMaxTimeSeconds * 1000
            && this.mistakes <= rule.threeStarMaxMistakes;
        const meetsTwoStars = elapsedMs <= rule.twoStarMaxTimeSeconds * 1000
            && this.mistakes <= rule.twoStarMaxMistakes;
        const stars: StarRating = meetsThreeStars ? 3 : meetsTwoStars ? 2 : 1;
        const score = Math.max(100, 1000 - Math.floor(elapsedMs / 1000) * 10 - this.mistakes * 100);
        const result: LevelResult = Object.freeze({
            levelId: this.currentLevelId,
            elapsedMs,
            mistakes: this.mistakes,
            score,
            stars,
        });

        this.levelActive = false;
        this.paused = false;
        this.elapsedMs = elapsedMs;
        this.results.push(result);
        this.updateHud();
        return result;
    }

    public discardLastResult(levelId: number): boolean {
        const last = this.results[this.results.length - 1];
        if (!last || last.levelId !== levelId) {
            return false;
        }

        this.results.pop();
        return true;
    }

    public pause(): void {
        this.paused = true;
    }

    public resume(): void {
        if (this.levelActive) {
            this.paused = false;
        }
    }

    private updateHud(): void {
        if (this.timeLabel) {
            this.timeLabel.string = `用时：${(this.elapsedMs / 1000).toFixed(1)} 秒`;
        }
        if (this.mistakeLabel) {
            this.mistakeLabel.string = `失误：${this.mistakes}`;
        }
    }

    private validateScoreRule(rule: ScoreRule): void {
        if (!Number.isFinite(rule.threeStarMaxTimeSeconds)
            || !Number.isFinite(rule.twoStarMaxTimeSeconds)
            || rule.threeStarMaxTimeSeconds < 0
            || rule.twoStarMaxTimeSeconds < rule.threeStarMaxTimeSeconds
            || !Number.isInteger(rule.threeStarMaxMistakes)
            || !Number.isInteger(rule.twoStarMaxMistakes)
            || rule.threeStarMaxMistakes < 0
            || rule.twoStarMaxMistakes < rule.threeStarMaxMistakes) {
            throw new RangeError('Score thresholds must be finite, nonnegative, and ordered from three to two stars.');
        }
    }
}
