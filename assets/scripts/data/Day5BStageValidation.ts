import type { Day5BStageDefinition, HotspotDefinition, PointDefinition } from './Day5BStageDefinition';

function check(ok: boolean, message: string): void { if (!ok) throw new RangeError(`[Day5B] ${message}`); }
function finite(n: number): boolean { return Number.isFinite(n); }
function point(p: PointDefinition): void {
    check(Boolean(p) && finite(p.x) && finite(p.y) && Math.abs(p.x) <= 360 && Math.abs(p.y) <= 400, 'Point outside StageHost.');
}
function hotspots(items: readonly HotspotDefinition[], min: number, max: number): void {
    check(items.length >= min && items.length <= max, 'Invalid number of controls.');
    const ids = new Set<string>();
    for (const item of items) {
        check(typeof item.id === 'string' && item.id.trim().length > 0 && !ids.has(item.id), 'Control IDs must be unique.');
        ids.add(item.id); check(typeof item.label === 'string' && item.label.trim().length > 0, 'Missing visible control label.');
        point(item.position);
        check(finite(item.size.width) && finite(item.size.height) && item.size.width >= 88 && item.size.height >= 88
            && Math.abs(item.position.x) + item.size.width / 2 <= 360
            && Math.abs(item.position.y) + item.size.height / 2 <= 400, 'Control bounds/size invalid.');
    }
    for (let i = 0; i < items.length; i += 1) for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i], b = items[j];
        check(Math.abs(a.position.x - b.position.x) >= (a.size.width + b.size.width) / 2
            || Math.abs(a.position.y - b.position.y) >= (a.size.height + b.size.height) / 2, 'Input controls overlap.');
    }
}
export function validateDay5BStage(stage: Day5BStageDefinition): void {
    check(['controller', 'printer', 'keyboard', 'fan', 'headset', 'livestream'].indexOf(stage.device) >= 0, 'Unknown device.');
    switch (stage.kind) {
        case 'fault-spot':
            hotspots(stage.hotspots, 2, 6);
            check(stage.hotspots.some(p => p.id === stage.faultId), 'Missing fault hotspot.');
            check(typeof stage.clueText === 'string' && stage.clueText.trim().length > 0, 'Missing visible clue.');
            check(stage.diagnosticMode === undefined || (stage.diagnosticMode === 'test-and-confirm'
                && stage.device === 'keyboard' && stage.hotspots.length === 6), 'Invalid diagnostic mode.');
            return;
        case 'rotary-control':
            check(finite(stage.radius) && stage.radius >= 40 && stage.radius <= 150
                && finite(stage.ringWidth) && stage.ringWidth >= 20 && stage.ringWidth <= 100, 'Invalid rotary ring.');
            if (stage.mode === 'align') {
                point(stage.center);
                check(Math.abs(stage.center.x) + stage.radius + stage.ringWidth / 2 <= 360
                    && Math.abs(stage.center.y) + stage.radius + stage.ringWidth / 2 <= 400, 'Rotary extends outside StageHost.');
                check(finite(stage.initialAngle) && finite(stage.targetAngle) && finite(stage.toleranceDegrees)
                    && stage.toleranceDegrees >= 1 && stage.toleranceDegrees <= 30
                    && finite(stage.holdSeconds) && stage.holdSeconds > 0, 'Invalid alignment configuration.');
            } else if (stage.mode === 'unscrew') {
                hotspots(stage.screws, 1, 3);
                check(finite(stage.requiredDegrees) && stage.requiredDegrees >= 90 && stage.requiredDegrees <= 540
                    && ['clockwise', 'counterclockwise'].indexOf(stage.direction) >= 0, 'Invalid screw rotation.');
            } else throw new RangeError('[Day5B] Unknown rotary mode.');
            return;
        case 'guided-trace':
            check(stage.points.length === 4, 'Trace requires start and exactly three checkpoints.');
            stage.points.forEach(point);
            check(finite(stage.tolerance) && stage.tolerance > 0 && stage.tolerance <= 80
                && finite(stage.checkpointRadius) && stage.checkpointRadius > 0 && stage.checkpointRadius <= 80
                && finite(stage.maxSampleDistance) && stage.maxSampleDistance >= 60 && stage.maxSampleDistance <= 220, 'Invalid trace tolerance/sample.');
            for (let i = 1; i < stage.points.length; i += 1) check(Math.hypot(stage.points[i].x - stage.points[i - 1].x,
                stage.points[i].y - stage.points[i - 1].y) > stage.checkpointRadius * 2, 'Trace adjacent points must be distinct and separated.');
            return;
        case 'gauge-tune':
            check(['fan', 'stereo', 'broadcast'].indexOf(stage.mode) >= 0, 'Unknown gauge mode.');
            check(stage.initialControls.length === 2 && stage.initialControls.every(v => finite(v) && v >= 0 && v <= 100)
                && finite(stage.holdSeconds) && stage.holdSeconds > 0, 'Invalid gauge controls/hold.');
            return;
        case 'sequence-test':
            hotspots(stage.choices, 4, 6);
            check(stage.sequence.length >= 3 && stage.sequence.length <= 5
                && stage.sequence.every(id => stage.choices.some(c => c.id === id)), 'Invalid test sequence.');
            return;
        default: {
            const unreachable: never = stage;
            throw new RangeError(`[Day5B] Unknown stage kind: ${String(unreachable)}`);
        }
    }
}
