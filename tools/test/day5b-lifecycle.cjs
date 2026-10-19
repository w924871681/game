'use strict';

const assert = require('node:assert/strict');

exports.runLifecycleTests = function runLifecycleTests(runtime) {
    const { Day5BSession, StageGesture } = runtime.load('stages/Day5BStageController.ts');
    const { Node, UITransform, EventTouch, Vec3 } = runtime.mock.cc;
    const { mock } = runtime;
    let groups = 0;
    const test = (name, callback) => { callback(); groups += 1; console.log(`PASS Day 5B lifecycle: ${name}`); };
    const events = () => {
        const value = { progress: [], mistakes: 0, completions: 0 };
        value.callbacks = { onProgress: p => value.progress.push(p), onMistake: () => { value.mistakes += 1; }, onComplete: () => { value.completions += 1; } };
        return value;
    };
    test('stage session exposes immutable progress and begins a fresh count with input disabled', () => {
        const session = new Day5BSession(), out = events(); session.configure(4, out.callbacks);
        assert.deepEqual(session.progress, { completed: 0, total: 4 });
        assert.equal(Object.isFrozen(session.progress), true);
        assert.equal(session.canInput, false);
        assert.throws(() => { session.progress.completed = 99; }, TypeError);
        assert.equal(out.progress.length, 1);
        session.setInputEnabled(true); assert.equal(session.canInput, true);
        session.setProgress(2); assert.deepEqual(session.progress, { completed: 2, total: 4 });
    });
    test('mistakes are gated by active input and never emitted after disable or completed input', () => {
        const session = new Day5BSession(), out = events(); session.configure(1, out.callbacks);
        session.mistake(); assert.equal(out.mistakes, 0);
        session.setInputEnabled(true); session.mistake(); assert.equal(out.mistakes, 1);
        session.setInputEnabled(false); session.mistake(); assert.equal(out.mistakes, 1);
        session.setInputEnabled(true); session.setProgress(1); session.finish(); session.mistake(); assert.equal(out.mistakes, 1);
    });
    test('real delta-time advances the noninteractive success feedback once without wall clocks or duplicate finish reports', () => {
        const session = new Day5BSession(), out = events(); session.configure(1, out.callbacks); session.setInputEnabled(true);
        session.setProgress(1); session.finish(0.4); session.finish(0.4);
        assert.equal(session.canInput, false);
        for (const bad of [NaN, Infinity, -1]) session.advance(bad);
        session.advance(0.39); assert.equal(out.completions, 0);
        session.advance(0.011); assert.equal(out.completions, 1);
        session.advance(10); session.finish(0); session.advance(1); assert.equal(out.completions, 1);
    });
    test('new configuration consumes pending old completion and does not report into either old or new order', () => {
        const session = new Day5BSession(), old = events(), next = events();
        session.configure(1, old.callbacks); session.setInputEnabled(true); session.setProgress(1); session.finish();
        session.configure(4, next.callbacks); session.setInputEnabled(true); session.advance(100);
        assert.equal(old.completions, 0); assert.equal(next.completions, 0);
        assert.deepEqual(session.progress, { completed: 0, total: 4 }); assert.equal(session.canInput, true);
    });
    test('reentrant completion may configure a new stage without the consumed old completion changing it later', () => {
        const session = new Day5BSession(), next = events(); let calls = 0;
        session.configure(1, { onProgress() {}, onMistake() {}, onComplete() { calls += 1; session.configure(4, next.callbacks); session.setInputEnabled(true); } });
        session.setInputEnabled(true); session.setProgress(1); session.finish(0); session.advance(0.1); session.advance(10);
        assert.equal(calls, 1); assert.equal(next.completions, 0); assert.equal(session.canInput, true);
        assert.deepEqual(session.progress, { completed: 0, total: 4 });
    });
    test('deactivate cancels a pending old callback while resume can finish the already-earned stage under fresh callbacks', () => {
        const session = new Day5BSession(), old = events(), resumed = events();
        session.configure(1, old.callbacks); session.setInputEnabled(true); session.setProgress(1); session.finish(0.4);
        session.advance(0.15); session.deactivate(); session.advance(5);
        assert.equal(old.completions, 0); assert.deepEqual(session.progress, { completed: 1, total: 1 });
        session.resume(resumed.callbacks); session.setInputEnabled(true); session.advance(1);
        assert.equal(resumed.completions, 1, 'A pause during celebration must not permanently lock the earned stage');
        session.advance(1); assert.equal(resumed.completions, 1); assert.equal(old.completions, 0);
    });
    function gestureFixture() {
        const root = new Node('GestureStage'); root.addComponent(UITransform);
        const input = new Node('Input'); input.addComponent(UITransform); input.parent = root;
        const other = new Node('Other'); other.addComponent(UITransform); other.parent = root;
        const history = [], state = { enabled: true, accept: true };
        const gesture = new StageGesture(root, input, () => state.enabled, {
            start: p => { history.push(['start', p.x, p.y]); return state.accept; },
            move: p => history.push(['move', p.x, p.y]), end: p => history.push(['end', p.x, p.y]), cancel: () => history.push(['cancel']),
        });
        mock.boot(root); gesture.bind();
        const emit = (type, x, y, id = 1) => { const world = root.getComponent(UITransform).convertToWorldSpaceAR(new Vec3(x, y, 0)); const event = new EventTouch(id, world); input.emit(Node.EventType[type], event); return event; };
        return { root, input, other, history, state, gesture, emit };
    }
    test('the actual gesture helper binds exactly one four-event set and unbind removes only its own input listeners', () => {
        const f = gestureFixture(), outsider = () => {};
        f.input.on(Node.EventType.TOUCH_START, outsider, f.state); f.gesture.bind(); f.gesture.bind();
        assert.equal(f.input.listenerCount(), 5);
        f.gesture.unbind(); assert.equal(f.input.listenerCount(), 1);
        f.gesture.unbind(); assert.equal(f.input.listenerCount(), 1);
        f.gesture.bind(); assert.equal(f.input.listenerCount(), 5);
    });
    test('foreign touches cannot take ownership, cancel another pointer, end it or move its state', () => {
        const f = gestureFixture(); f.emit('TOUCH_START', 0, 0, 11);
        assert.equal(f.gesture.active, true);
        for (const type of ['TOUCH_START', 'TOUCH_MOVE', 'TOUCH_END', 'TOUCH_CANCEL']) f.emit(type, 100, 100, 22);
        assert.deepEqual(f.history, [['start', 0, 0]]);
        f.emit('TOUCH_MOVE', 20, 30, 11); f.emit('TOUCH_END', 40, 50, 11); f.emit('TOUCH_END', 40, 50, 11);
        assert.deepEqual(f.history, [['start', 0, 0], ['move', 20, 30], ['end', 40, 50]]);
        assert.equal(f.gesture.active, false);
    });
    test('CANCEL and explicit unbind consume ownership without invoking END or blocking a fresh gesture', () => {
        const f = gestureFixture(); f.emit('TOUCH_START', 0, 0); f.emit('TOUCH_CANCEL', 50, 50); f.emit('TOUCH_END', 50, 50);
        assert.deepEqual(f.history, [['start', 0, 0], ['cancel']]); assert.equal(f.gesture.active, false);
        f.emit('TOUCH_START', 10, 10, 2); f.gesture.unbind();
        assert.deepEqual(f.history.at(-1), ['cancel']); assert.equal(f.input.listenerCount(), 0);
        f.gesture.bind(); f.emit('TOUCH_START', 30, 30, 3); f.emit('TOUCH_END', 30, 30, 3);
        assert.deepEqual(f.history.at(-1), ['end', 30, 30]);
    });
    test('parent transformation is converted through the actual Stage UITransform before callbacks', () => {
        const f = gestureFixture(); f.root.setPosition(170, -80); f.root.angle = 31; f.root.setScale(1.4, 0.7, 1);
        f.emit('TOUCH_START', 30, -40); f.emit('TOUCH_MOVE', 70, -20); f.emit('TOUCH_END', 60, 25);
        for (const [index, expected] of [[0, [30, -40]], [1, [70, -20]], [2, [60, 25]]]) {
            assert.ok(Math.abs(f.history[index][1] - expected[0]) < 1e-8);
            assert.ok(Math.abs(f.history[index][2] - expected[1]) < 1e-8);
        }
    });
    test('reparenting a held input cancels it and a subsequent END cannot accidentally finish the former stage gesture', () => {
        const f = gestureFixture(); f.emit('TOUCH_START', 0, 0); f.input.parent = f.other;
        f.emit('TOUCH_END', 100, 100);
        assert.deepEqual(f.history, [['start', 0, 0], ['cancel']]); assert.equal(f.gesture.active, false);
    });
    test('disabled, inactive, missing-ID and nonfinite START events never acquire an input', () => {
        const f = gestureFixture(); f.state.enabled = false; f.emit('TOUCH_START', 0, 0);
        f.state.enabled = true; f.input.emit(Node.EventType.TOUCH_START, new EventTouch(null, { x: 0, y: 0 }));
        f.input.emit(Node.EventType.TOUCH_START, new EventTouch(1, { x: NaN, y: 0 }));
        f.root.active = false; f.emit('TOUCH_START', 0, 0);
        assert.equal(f.gesture.active, false); assert.deepEqual(f.history, []);
    });
    return groups;
};
