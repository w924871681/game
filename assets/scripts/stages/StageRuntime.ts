export interface StageProgress {
    readonly completed: number;
    readonly total: number;
}

export interface StageCallbacks {
    readonly onProgress: (progress: StageProgress) => void;
    readonly onMistake: () => void;
    readonly onComplete: () => void;
}

/** Configure stays concrete on each controller so union selection remains type checked. */
export interface StageRuntime {
    readonly progress: StageProgress;
    setInputEnabled(enabled: boolean): void;
    resetStage(): void;
    deactivateStage(): void;
    resumeStage(callbacks: StageCallbacks): void;
}
