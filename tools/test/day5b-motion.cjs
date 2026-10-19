'use strict';

const assert = require('node:assert/strict');

exports.runMotionTests = function runMotionTests(runtime) {
    const { shortestAngleDelta, normalizedAngle, projectToSegment, traceMoveInsideSegment } = runtime.load('stages/Day5BMotionMath.ts');
    let groups = 0;
    const test = (name, callback) => { callback(); groups += 1; console.log(`PASS Day 5B motion: ${name}`); };
    test('shortest signed turns cross zero in either direction and never convert a small seam move into a full revolution', () => {
        for (const offset of [-720, -360, 0, 360, 720]) {
            assert.equal(shortestAngleDelta(359 + offset, 1 + offset), 2);
            assert.equal(shortestAngleDelta(1 + offset, 359 + offset), -2);
            assert.equal(shortestAngleDelta(350 + offset, 10 + offset), 20);
            assert.equal(shortestAngleDelta(10 + offset, 350 + offset), -20);
        }
        assert.equal(shortestAngleDelta(0, 0), 0);
        assert.equal(shortestAngleDelta(0, 90), 90);
        assert.equal(shortestAngleDelta(90, 0), -90);
    });
    test('angle normalization preserves equivalent orientations over multiple turns', () => {
        for (const angle of [-179, -55, 0, 12, 55, 179]) {
            for (const turns of [-5, -2, -1, 0, 1, 2, 5]) assert.equal(normalizedAngle(angle + turns * 360), angle);
        }
        assert.equal(Math.abs(normalizedAngle(180)), 180);
        assert.equal(normalizedAngle(360), 0);
    });
    test('segment projection clamps before/after endpoints and handles a zero-length defensive segment without NaN', () => {
        assert.deepEqual(projectToSegment({ x: 50, y: 12 }, { x: 0, y: 0 }, { x: 100, y: 0 }), { ratio: 0.5, x: 50, y: 0, distance: 12 });
        assert.deepEqual(projectToSegment({ x: -10, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }), { ratio: 0, x: 0, y: 0, distance: 10 });
        assert.deepEqual(projectToSegment({ x: 110, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }), { ratio: 1, x: 100, y: 0, distance: 10 });
        assert.deepEqual(projectToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 }), { ratio: 0, x: 0, y: 0, distance: 5 });
    });
    test('continuous path validation accepts actual near-segment travel including the tolerance edge and rejects visible excursions', () => {
        const start = { x: -100, y: 0 }, end = { x: 100, y: 0 };
        assert.equal(traceMoveInsideSegment({ x: -50, y: 0 }, { x: 50, y: 0 }, start, end, 48, 120), true);
        assert.equal(traceMoveInsideSegment({ x: -50, y: 48 }, { x: 50, y: 48 }, start, end, 48, 120), true);
        assert.equal(traceMoveInsideSegment({ x: -50, y: 48.001 }, { x: 50, y: 48.001 }, start, end, 48, 120), false);
        assert.equal(traceMoveInsideSegment({ x: -50, y: 0 }, { x: 30, y: 80 }, start, end, 48, 120), false);
    });
    test('path sampling rejects a distant teleport and malformed/zero budgets rather than completing from a convenient endpoint', () => {
        const start = { x: 0, y: 0 }, end = { x: 500, y: 0 };
        assert.equal(traceMoveInsideSegment(start, end, start, end, 48, 120), false);
        assert.equal(traceMoveInsideSegment(start, { x: 110, y: 0 }, start, end, 48, 120), true);
        for (const [from, to, tolerance, budget] of [
            [{ x: NaN, y: 0 }, { x: 20, y: 0 }, 48, 120],
            [start, { x: Infinity, y: 0 }, 48, 120], [start, { x: 20, y: 0 }, 0, 120],
            [start, { x: 20, y: 0 }, 48, 0], [start, { x: 20, y: 0 }, 48, NaN],
        ]) assert.equal(traceMoveInsideSegment(from, to, start, end, tolerance, budget), false);
    });
    return groups;
};
