import type { PointDefinition } from '../data/Day5BStageDefinition';

/** Signed shortest turn, including a continuous 359 -> 0 crossing. */
export function shortestAngleDelta(fromDegrees: number, toDegrees: number): number {
    return ((toDegrees - fromDegrees + 540) % 360 + 360) % 360 - 180;
}

export function normalizedAngle(degrees: number): number {
    return ((degrees + 180) % 360 + 360) % 360 - 180;
}

export interface SegmentProjection {
    readonly ratio: number;
    readonly x: number;
    readonly y: number;
    readonly distance: number;
}

export function projectToSegment(point: PointDefinition, start: PointDefinition, end: PointDefinition): SegmentProjection {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const ratio = lengthSquared > 0 ? Math.max(0, Math.min(1,
        ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0;
    const x = start.x + dx * ratio;
    const y = start.y + dy * ratio;
    return { ratio, x, y, distance: Math.hypot(point.x - x, point.y - y) };
}

/** Validate the whole recorded MOVE, not only a distant endpoint near a ring. */
export function traceMoveInsideSegment(
    from: PointDefinition,
    to: PointDefinition,
    start: PointDefinition,
    end: PointDefinition,
    tolerance: number,
    maxMoveDistance: number,
): boolean {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    if (![from.x, from.y, to.x, to.y, tolerance, maxMoveDistance].every(Number.isFinite)
        || tolerance <= 0 || maxMoveDistance <= 0 || distance > maxMoveDistance) {
        return false;
    }
    const samples = Math.max(1, Math.ceil(distance / Math.min(12, tolerance / 3)));
    for (let index = 0; index <= samples; index += 1) {
        const ratio = index / samples;
        if (projectToSegment({ x: from.x + (to.x - from.x) * ratio,
            y: from.y + (to.y - from.y) * ratio }, start, end).distance > tolerance) {
            return false;
        }
    }
    return true;
}
