'use strict';

// Actual compiled controller/view behavior with the existing finite mock.
// Sprite placement and alpha are inspected; this is not pixel or touch-device validation.
const assert = require('node:assert/strict');

function runDay5AV21CleanTests(runtime) {
    const { mock, load } = runtime;
    const { Node, Sprite, SpriteFrame, UIOpacity, UITransform, EventTouch, Prefab, Vec3 } = mock.cc;
    const { ORDER_CATALOG } = load('data/OrderCatalog.ts');
    const { CleanSwipeStageController } = load('stages/CleanSwipeStageController.ts');
    const { V21CleanDustView } = load('visuals/V21CleanDustView.ts');
    const keyboard = ORDER_CATALOG[3].stages[0], mouse = ORDER_CATALOG[5].stages[0], caseClean = ORDER_CATALOG[8].stages[0];
    let groups = 0;
    const test = (name, action) => { action(); groups++; console.log(`PASS Day 5A V2.1 clean: ${name}`); };
    const node = (name, parent = null) => {
        const value = new Node(name); value.addComponent(UITransform); value.parent = parent; return value;
    };
    function fixture(definition = keyboard, withFrame = true) {
        const root = node('CleanStage'), stage = root.addComponent(CleanSwipeStageController);
        stage.inputSurface = node('InputSurface', root); stage.inputSurface.getComponent(UITransform).setContentSize(680, 560);
        stage.dirtLayer = node('DirtLayer', stage.inputSurface);
        stage.dirtCellPrefab = new Prefab(() => {
            const cell = node('DirtCell'); cell.addComponent(Sprite); cell.addComponent(UIOpacity); return cell;
        });
        const view = root.addComponent(V21CleanDustView);
        view.artworkRoot = node('V21DustArtwork', stage.dirtLayer);
        if (withFrame) view.dustFrame = new SpriteFrame('v2/irregular-dust');
        stage.dustView = view;
        const log = { progress: [], completions: 0, mistakes: 0, paths: [] };
        const callbacks = { onProgress: value => log.progress.push(value), onComplete: () => log.completions++, onMistake: () => log.mistakes++ };
        const originalSweep = view.sweep.bind(view);
        view.sweep = (...args) => { log.paths.push(args); originalSweep(...args); };
        mock.boot(root); stage.configure(definition, callbacks); stage.setInputEnabled(true);
        return { root, stage, view, log, callbacks, definition };
    }
    function touch(f, type, point = new Vec3(), id = 0) {
        const event = new EventTouch(id, point); f.stage.inputSurface.emit(Node.EventType[type], event); return event;
    }
    const alpha = view => view.particleDiagnostics.map(value => value.alpha);
    const dirty = view => view.particleDiagnostics.every(value => value.alpha === value.baseAlpha);
    const cleanAt = (f, index) => { const p = f.stage.cellNodes[index].worldPosition; touch(f, 'TOUCH_START', p); touch(f, 'TOUCH_END', p); };
    const lastFade = cell => mock.tweens.filter(value => value.target === cell.getComponent(UIOpacity)).at(-1);
    function finish(f) { for (let index = 0; index < f.stage.totalCells; index++) cleanAt(f, index); }

    test('exactly 192 bounded soft Sprites have alpha 60..96 and no input listeners or opacity tweens', () => {
        const f = fixture(), data = f.view.particleDiagnostics, area = keyboard.areas[0];
        assert.equal(f.view.particleCount, 192); assert.equal(f.view.totalCreatedParticles, 192);
        assert.equal(f.view.artworkRoot.children.length, 192); assert.equal(f.view.artworkRoot.listenerCount(), 0);
        assert.equal(new Set(data.map(value => `${value.x},${value.y}`)).size, 192);
        data.forEach(value => {
            assert.ok(value.width >= 28 && value.width <= 62 && value.height >= 28 && value.height <= 62);
            assert.ok(value.alpha >= 60 && value.alpha <= 96);
            assert.ok(Math.abs(value.x) + value.width / 2 <= area.size.width / 2 + 1e-8);
            assert.ok(Math.abs(value.y) + value.height / 2 <= area.size.height / 2 + 1e-8);
        });
        f.view.artworkRoot.children.forEach(value => {
            assert.equal(value.listenerCount(), 0); assert.equal(value.getComponent(UIOpacity), null);
            assert.equal(value.getComponent(Sprite).spriteFrame, f.view.dustFrame);
        });
        assert.equal(f.stage.inputSurface.listenerCount(), 4);
    });
    test('particle positions do not lie on any logical grid rows or columns', () => {
        const f = fixture(), cells = f.stage.cellNodes;
        const xs = new Set(cells.map(value => value.position.x)), ys = new Set(cells.map(value => value.position.y));
        assert.ok(f.view.particleDiagnostics.filter(value => !xs.has(value.x) && !ys.has(value.y)).length >= 188);
        assert.ok(new Set(f.view.particleDiagnostics.map(value => value.y.toFixed(4))).size > 180);
    });
    test('diagnostics are frozen detached scalar snapshots and cannot mutate production particles', () => {
        const f = fixture(), data = f.view.particleDiagnostics;
        assert.ok(Object.isFrozen(data) && Object.isFrozen(data[0]));
        assert.throws(() => { data[0].alpha = 0; }, TypeError);
        assert.ok(dirty(f.view)); assert.equal('node' in data[0], false); assert.equal('sprite' in data[0], false);
    });
    test('diagonal sweep clears its whole segment while distant particles remain dirty and edges feather', () => {
        const f = fixture(); f.view.sweep(-230, -100, 230, 100, 24);
        const data = f.view.particleDiagnostics;
        assert.ok(data.filter(value => value.alpha === 0).length > 10);
        assert.ok(data.some(value => value.x < -100 && value.alpha === 0));
        assert.ok(data.some(value => value.x > 100 && value.alpha === 0));
        assert.ok(data.some(value => value.alpha > 0 && value.alpha < value.baseAlpha));
        assert.ok(data.some(value => value.y > 70 && value.x < -100 && value.alpha === value.baseAlpha));
        assert.equal(f.stage.cleanedCells, 0); assert.equal(f.log.completions, 0);
    });
    test('curved local stroke follows consecutive segments without clearing distant lower dust', () => {
        const f = fixture(); const arc = [[-170, 0], [-130, 60], [-60, 90], [20, 95], [100, 65], [160, 5]];
        for (let index = 1; index < arc.length; index++) f.view.sweep(...arc[index - 1], ...arc[index], 22);
        const data = f.view.particleDiagnostics;
        assert.ok(data.some(value => value.y > 65 && value.alpha === 0));
        assert.ok(data.some(value => value.y < -65 && value.alpha === value.baseAlpha));
        const before = alpha(f.view); for (let index = arc.length - 1; index > 0; index--) f.view.sweep(...arc[index], ...arc[index - 1], 22);
        assert.deepEqual(alpha(f.view), before, 'reversing an already erased path is monotonic/idempotent');
    });
    test('accepted zero-ID START changes dust once and foreign events cannot draw or release ownership', () => {
        const f = fixture(), first = f.stage.cellNodes[0].worldPosition, second = f.stage.cellNodes[1].worldPosition;
        touch(f, 'TOUCH_START', first, 0); const state = alpha(f.view); assert.ok(state.some((value, index) => value < f.view.particleDiagnostics[index].baseAlpha));
        for (const type of ['TOUCH_START', 'TOUCH_MOVE', 'TOUCH_END', 'TOUCH_CANCEL']) touch(f, type, second, 33);
        assert.deepEqual(alpha(f.view), state); assert.equal(f.log.paths.length, 1); assert.equal(f.stage.cleanedCells, 1);
        touch(f, 'TOUCH_MOVE', second, 0); assert.equal(f.log.paths.length, 2); assert.equal(f.stage.cleanedCells, 2);
    });
    test('CANCEL retains already erased dust and cells; END/CANCEL coordinates never draw a tail', () => {
        for (const end of ['TOUCH_END', 'TOUCH_CANCEL']) {
            const f = fixture(); touch(f, 'TOUCH_START', f.stage.cellNodes[0].worldPosition);
            const state = alpha(f.view), progress = f.stage.cleanedCells;
            touch(f, end, f.stage.cellNodes[20].worldPosition); touch(f, 'TOUCH_MOVE', f.stage.cellNodes[21].worldPosition);
            assert.deepEqual(alpha(f.view), state); assert.equal(f.log.paths.length, 1);
            assert.equal(f.stage.cleanedCells, progress); assert.equal(f.log.mistakes, 0);
        }
    });
    test('keyboard still has 32 logical cells, locks at 28, and completes once while dust owns no callbacks', () => {
        const f = fixture(); assert.equal(f.stage.totalCells, 32); assert.equal(f.stage.requiredCells, 28);
        finish(f); assert.equal(f.stage.cleanedCells, 28); assert.deepEqual(f.stage.progress, { completed: 28, total: 28 });
        assert.equal(f.log.completions, 1); assert.equal(f.log.mistakes, 0); assert.equal(f.log.paths.length, 28);
        const state = alpha(f.view); touch(f, 'TOUCH_START', f.stage.cellNodes[31].worldPosition);
        assert.deepEqual(alpha(f.view), state); assert.equal(f.log.completions, 1);
    });
    test('fast accepted MOVE both sweeps original logical intermediate cells and erases intermediate particles', () => {
        const f = fixture(), cells = f.stage.cellNodes;
        touch(f, 'TOUCH_START', cells[0].worldPosition); touch(f, 'TOUCH_MOVE', cells[7].worldPosition);
        assert.equal(f.stage.cleanedCells, 8); assert.equal(f.log.paths.length, 2);
        assert.ok(f.view.particleDiagnostics.some(value => Math.abs(value.x) < 25 && value.y < -60 && value.alpha === 0));
        assert.equal(f.log.completions, 0);
    });
    test('out-of-area and non-finite visual paths do not change dust or logical state', () => {
        const f = fixture(); touch(f, 'TOUCH_START', new Vec3(-300, 340)); touch(f, 'TOUCH_MOVE', new Vec3(300, 340)); touch(f, 'TOUCH_CANCEL');
        f.view.sweep(NaN, 0, 20, 20, 46); f.view.sweep(0, 0, 20, 20, -1);
        assert.ok(dirty(f.view)); assert.equal(f.stage.cleanedCells, 0); assert.equal(f.log.mistakes, 0);
    });
    test('DirtLayer world transforms are converted once by the controller and input bounds remain 680x560', () => {
        const f = fixture(); f.root.setPosition(120, 40); f.root.angle = 13; f.root.setScale(1.2, 0.8, 1);
        f.stage.dirtLayer.setPosition(20, 10); f.stage.dirtLayer.angle = -23; f.stage.dirtLayer.setScale(0.7, 1.4, 1);
        const cell = f.stage.cellNodes[12]; touch(f, 'TOUCH_START', cell.worldPosition);
        const path = f.log.paths[0]; assert.ok(Math.abs(path[0] - cell.position.x) < 1e-7); assert.ok(Math.abs(path[1] - cell.position.y) < 1e-7);
        assert.equal(f.stage.cleanedCells, 1); assert.ok(!dirty(f.view));
        assert.deepEqual([f.stage.inputSurface.getComponent(UITransform).width, f.stage.inputSurface.getComponent(UITransform).height], [680, 560]);
        assert.deepEqual([f.view.artworkRoot.position.x, f.view.artworkRoot.position.y], [0, 0]);
    });
    test('logical cell still owns exactly the original 0.08s fade; view adds no Tween', () => {
        const f = fixture(), cell = f.stage.cellNodes[0], before = mock.tweens.length;
        touch(f, 'TOUCH_START', cell.worldPosition); const fade = lastFade(cell);
        assert.ok(fade); assert.equal(fade.steps[0].duration, 0.08); assert.equal(mock.tweens.length - before, 1);
        assert.equal(cell.active, true); assert.equal(cell.getComponent(UIOpacity).opacity, 255);
        fade.flush(); assert.equal(cell.active, false); assert.equal(cell.getComponent(UIOpacity).opacity, 0);
    });
    test('reset restores exact deterministic dust and logical opacity before stale old fade callbacks execute', () => {
        const f = fixture(), initial = f.view.particleDiagnostics, nodes = f.view.artworkRoot.children.slice(), cell = f.stage.cellNodes[0];
        touch(f, 'TOUCH_START', cell.worldPosition); const fade = lastFade(cell); f.stage.resetStage(); f.stage.setInputEnabled(true);
        assert.equal(fade.stopped, true); fade.flush(); fade.callCallbacks();
        assert.deepEqual(f.view.particleDiagnostics, initial); assert.deepEqual(f.view.artworkRoot.children, nodes);
        f.stage.cellNodes.forEach(value => { assert.equal(value.active, true); assert.equal(value.getComponent(UIOpacity).opacity, 255); });
        assert.equal(f.stage.cleanedCells, 0); assert.equal(f.stage.inputSurface.listenerCount(), 4);
    });
    test('20→35→20→32 configurations reuse all 192 dust nodes and the existing logical pool', () => {
        const f = fixture(mouse), nodes = f.view.artworkRoot.children.slice(), cells = f.stage.cellNodes.slice();
        const instantiations = mock.instantiations.length;
        for (const definition of [caseClean, mouse, keyboard, caseClean]) f.stage.configure(definition, f.callbacks);
        assert.deepEqual(f.view.artworkRoot.children, nodes); assert.equal(f.view.totalCreatedParticles, 192);
        assert.deepEqual(f.stage.cellNodes.slice(0, 20), cells); assert.equal(f.stage.pooledCellCount, 35);
        assert.equal(mock.instantiations.length - instantiations, 15); assert.ok(dirty(f.view));
        assert.equal(f.stage.requiredCells, 32); assert.equal(f.stage.inputSurface.listenerCount(), 4);
    });
    test('deactivate/resume and component disable/enable retain dust progress without a new configure', () => {
        const f = fixture(); cleanAt(f, 0); const state = alpha(f.view), created = f.view.totalCreatedParticles;
        f.stage.deactivateStage(); f.root.active = false; f.root.active = true; f.stage.resumeStage(f.callbacks); f.stage.setInputEnabled(true);
        assert.deepEqual(alpha(f.view), state); assert.equal(f.stage.cleanedCells, 1);
        f.view.enabled = false; f.view.enabled = true; assert.deepEqual(alpha(f.view), state);
        assert.equal(f.view.totalCreatedParticles, created); assert.equal(f.stage.inputSurface.listenerCount(), 4);
        cleanAt(f, 1); assert.equal(f.stage.cleanedCells, 2);
    });
    test('view alpha operations cannot create progress or completion and a missing optional frame does not block logic', () => {
        const f = fixture(); const progressCount = f.log.progress.length;
        f.view.sweep(-1000, 0, 1000, 0, 1000);
        assert.ok(f.view.particleDiagnostics.every(value => value.alpha === 0));
        assert.equal(f.stage.cleanedCells, 0); assert.equal(f.log.progress.length, progressCount); assert.equal(f.log.completions, 0);
        const missing = fixture(keyboard, false); assert.equal(missing.view.particleCount, 0); cleanAt(missing, 0);
        assert.equal(missing.stage.cleanedCells, 1); assert.equal(missing.log.completions, 0);
        missing.stage.dustView = null; cleanAt(missing, 1); assert.equal(missing.stage.cleanedCells, 2);
    });
    test('destroy releases only its own fixed pool and leaves no listeners or live stale fade effects', () => {
        const f = fixture(), particles = f.view.artworkRoot.children.slice(), cell = f.stage.cellNodes[0];
        touch(f, 'TOUCH_START', cell.worldPosition); const fade = lastFade(cell); f.root.destroy(); fade.callCallbacks();
        assert.equal(f.view.particleCount, 0); assert.equal(f.stage.inputSurface.listenerCount(), 0);
        particles.forEach(value => assert.equal(mock.cc.isValid(value), false)); assert.equal(f.log.completions, 0);
        f.view.configure(keyboard); assert.equal(f.view.particleCount, 0, 'destroyed view cannot rebuild through a retained reference');
    });
    return groups;
}

module.exports = { runDay5AV21CleanTests };
