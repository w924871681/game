'use strict';

/** Keeps the original46 real-engine checks and adds bounded V2.2 visual fixtures. */
exports.run = function (cc) {
    const legacyResult = require('./v21-probe').run(cc);
    const checks = legacyResult.checks.slice(), fixtures = [], cleanupErrors = [];
    const originalSystem = cc.TweenSystem.instance, system = new cc.TweenSystem();
    const actions = system.ActionManager, scene = cc.director.getScene();
    const types = {}, names = ['LevelManager', 'CleanSwipeStageController', 'V21CleanDustView',
        'DragMatchStageController', 'CableConnectStageController', 'ElementVisual', 'CableConnector'];
    let source, before;
    const result = {
        schemaVersion: 1, ok: false, timestamp: new Date().toISOString(),
        engineVersion: cc.ENGINE_VERSION || cc.VERSION || 'unknown',
        mode: 'V2.2 re-executes unmodified V2.1 probe and appends current saved-Prefab off-scene feathering and caption fixtures; no formal gameplay state is injected',
        input: 'Inherited46 use actual synthetic cc.Touch/EventTouch; added P0 checks call accepted-path visual API on off-scene saved-Prefab instances only',
        lifecycle: 'Real node activator for off-scene fixtures; explicit controller cleanup because Editor suppresses game lifecycle',
        limitations: [...legacyResult.limitations,
            'P0 alpha arithmetic is not rendered-pixel quality, Preview input or user aesthetic approval'],
        legacyResult, checks,
    };
    function assert(value, message) { if (!value) throw new Error(message); }
    function snapshot() {
        const entries = [];
        const visit = node => {
            const transform = node.getComponent(cc.UITransform);
            entries.push([node.uuid, node.parent?.uuid, node.active, node.layer,
                [node.position.x, node.position.y, node.position.z],
                [node.scale.x, node.scale.y, node.scale.z],
                [node.rotation.x, node.rotation.y, node.rotation.z, node.rotation.w],
                transform ? [transform.width, transform.height, transform.anchorX, transform.anchorY] : null,
                node.getComponent(cc.Label)?.string, node.getComponent(cc.Sprite)?.spriteFrame?._uuid]);
            node.children.slice().forEach(visit);
        };
        visit(scene);
        return JSON.stringify({ entries, formalState: source ? {
            hasStarted: source.hasStarted, orderIndex: source.currentOrderIndex,
            elapsedMs: source.runController?.currentElapsedMs,
            mistakes: source.runController?.currentMistakes,
        } : null });
    }
    function fixture(definition) {
        const root = cc.instantiate(source.stageHost.cleanSwipePrefab);
        root.name = '__V22Probe_SavedCleanStage';
        const stage = root.getComponent(types.CleanSwipeStageController), view = stage?.dustView;
        assert(stage && view instanceof types.V21CleanDustView, 'Saved CleanStage/controller/view binding missing');
        const f = { root, stage, view, cleaned: false, callbacks: { onProgress() {}, onComplete() {}, onMistake() {} } };
        fixtures.push(f);
        assert(cc.director._nodeActivator?.activateNode, 'Real node activator unavailable');
        cc.director._nodeActivator.activateNode(root, true);
        assert(root.activeInHierarchy && view.enabledInHierarchy, 'Saved-Prefab fixture must be active off-scene');
        stage.onEnable?.(); stage.bindVisualAssets(source.stageHost.visualAssets);
        stage.configure(definition, f.callbacks); stage.setInputEnabled(true);
        return f;
    }
    function cleanup(f) {
        if (f.cleaned) return;
        f.stage.onDestroy(); f.view?.onDestroy();
        cc.director._nodeActivator.activateNode(f.root, false);
        f.root.destroy(); f.cleaned = true;
    }
    function check(name, action) {
        const start = fixtures.length;
        try { checks.push({ name, status: 'PASS', evidence: action() }); }
        catch (error) { checks.push({ name, status: 'FAIL', error: error instanceof Error ? error.stack : String(error) }); }
        finally {
            fixtures.slice(start).forEach(f => {
                try { cleanup(f); } catch (error) { cleanupErrors.push({ check: name, error: String(error) }); }
            });
            actions.removeAllActions();
        }
    }
    const alphas = view => JSON.stringify(view.particleDiagnostics.map(p => p.alpha));
    function oldAlpha(particle, y, radius) {
        const feather = Math.max(8, Math.min(particle.width, particle.height) * 0.5);
        const inner = Math.max(0, radius - feather * 0.6), outer = radius + feather * 0.4;
        const t = Math.max(0, Math.min(1, (Math.abs(particle.y - y) - inner) / (outer - inner)));
        return Math.round(particle.baseAlpha * t * t * (3 - 2 * t));
    }
    function displayFixture(definition) {
        const drag = definition.kind === 'drag-match';
        const root = cc.instantiate(source.stageHost[drag ? 'dragMatchPrefab' : 'cableConnectPrefab']);
        root.name = '__V22Probe_SavedDisplayStage';
        const stage = root.getComponent(types[drag ? 'DragMatchStageController' : 'CableConnectStageController']);
        assert(stage, 'Current saved display controller missing');
        const f = { root, stage, view: null, cleaned: false, callbacks: { onProgress() {}, onComplete() {}, onMistake() {} } };
        fixtures.push(f); cc.director._nodeActivator.activateNode(root, true); stage.onEnable?.();
        stage.bindVisualAssets(source.stageHost.visualAssets); stage.configure(definition, f.callbacks); stage.setInputEnabled(true);
        return f;
    }
    function band(node) {
        const ui = node.getComponent(cc.UITransform);
        return { bottom: node.position.y - ui.height / 2, top: node.position.y + ui.height / 2 };
    }
    try {
        names.forEach(name => { types[name] = cc.js.getClassByName(name); assert(types[name], `Unregistered real class ${name}`); });
        source = scene.getComponentInChildren(types.LevelManager);
        assert(source?.stageHost?.cleanSwipePrefab instanceof cc.Prefab, 'Open the actual saved Scene with CleanStage Prefab');
        const definitions = source.orders.flatMap(order => order.stages).filter(stage => stage.kind === 'clean-swipe');
        const keyboard = definitions.find(stage => stage.id === 'keyboard-clean');
        assert(keyboard && definitions.length === 3, 'Actual three clean definitions unavailable');
        before = snapshot(); cc.TweenSystem.instance = system;
        assert(cc.TweenSystem.instance === system, 'Cannot isolate supplemental TweenSystem');

        check('V22 saved192-particle horizontal path has a wider irregular partial-alpha edge than historical V21', () => {
            const f = fixture(keyboard), view = f.view;
            const initial = view.particleDiagnostics, ids = view.artworkRoot.children.map(n => n.uuid);
            view.sweep(-260, -32.5, 260, -32.5, 46);
            const data = view.particleDiagnostics;
            const partial = data.filter(p => p.alpha > 0 && p.alpha < p.baseAlpha).length;
            const historicalPartial = initial.filter(p => {
                const alpha = oldAlpha(p, -32.5, 46); return alpha > 0 && alpha < p.baseAlpha;
            }).length;
            assert(partial > historicalPartial * 1.8, `Soft edge did not broaden: ${partial} versus old ${historicalPartial}`);
            assert(data.some(p => p.alpha === 0) && data.some(p => p.alpha === p.baseAlpha), 'Missing wiped core or untouched distant dust');
            assert(data.every((p, index) => p.x === initial[index].x && p.y === initial[index].y
                && p.width === initial[index].width && p.height === initial[index].height && p.baseAlpha === initial[index].baseAlpha
                && p.alpha >= 0 && p.alpha <= p.baseAlpha), 'Sweep changed geometry/base alpha or increased current alpha');
            assert(view.particleCount === 192 && view.totalCreatedParticles === 192
                && JSON.stringify(view.artworkRoot.children.map(n => n.uuid)) === JSON.stringify(ids), 'Visual pool reallocated');
            assert(f.stage.cleanedCells === 0 && f.stage.requiredCells === 28 && f.stage.totalCells === 32, 'Visual-only path changed business progress');
            return { partialParticles: partial, sameParticlesHistoricalPartial: historicalPartial,
                clearedParticles: data.filter(p => p.alpha === 0).length, untouchedParticles: data.filter(p => p.alpha === p.baseAlpha).length,
                realLogicalCells: 32, realRequiredCells: 28, logicalProgressUnchanged: true,
                limitation: 'Same scalar-particle formula comparison; not a screenshot or aesthetic acceptance' };
        });
        check('V22 horizontal repeat reverse and segmentation stay exact without dust regrowth', () => {
            const f = fixture(keyboard), view = f.view;
            view.sweep(-260, -32.5, 260, -32.5, 46); const expected = alphas(view);
            for (let repeat = 0; repeat < 6; repeat++) view.sweep(260, -32.5, -260, -32.5, 46);
            assert(alphas(view) === expected, 'Repeated/reversed path changed its absolute falloff');
            view.configure(keyboard);
            for (let x = -260; x < 260; x += 26) view.sweep(x, -32.5, x + 26, -32.5, 46);
            assert(alphas(view) === expected, 'Same horizontal path depends on MOVE subdivision');
            const beforeNearby = view.particleDiagnostics;
            view.sweep(-260, -10, 260, -10, 46); const after = view.particleDiagnostics;
            assert(after.every((p, index) => p.alpha <= beforeNearby[index].alpha), 'Nearby path regrew dust');
            return { identicalReversePasses: 6, equivalentSegments: 20, monotonicNearbyPath: true, totalCreated: view.totalCreatedParticles };
        });
        check('V22 current savedCleanPrefab reuses exact192 particles through three seeds reset and disable-enable', () => {
            const f = fixture(keyboard), view = f.view;
            const initial = JSON.stringify(view.particleDiagnostics), ids = JSON.stringify(view.artworkRoot.children.map(n => n.uuid));
            view.sweep(-260, -32.5, 260, -32.5, 46); const faded = alphas(view);
            view.enabled = false; view.enabled = true;
            assert(alphas(view) === faded, 'Disable-enable reset the existing accepted erase');
            const regions = [];
            for (const definition of [...definitions.slice(1), keyboard]) {
                f.stage.configure(definition, f.callbacks); f.stage.setInputEnabled(true);
                assert(view.totalCreatedParticles === 192 && view.particleDiagnostics.every(p => p.alpha === p.baseAlpha)
                    && JSON.stringify(view.artworkRoot.children.map(n => n.uuid)) === ids, 'Stage seed reset leaked old alpha or reallocated particles');
                regions.push({ id: definition.id, logicalCells: f.stage.totalCells, requiredCells: f.stage.requiredCells });
            }
            assert(JSON.stringify(view.particleDiagnostics) === initial, 'Keyboard deterministic seed did not restore initial dust');
            view.sweep(-260, -32.5, 260, -32.5, 46); assert(alphas(view) === faded, 'Reset changed the same seed/path result');
            f.stage.resetStage(); assert(JSON.stringify(view.particleDiagnostics) === initial && f.stage.cleanedCells === 0, 'Original resetStage failed');
            return { regions, disableRetainsErase: true, resetRestoresSameSeed: true, totalCreated: view.totalCreatedParticles };
        });
        check('V22 missing frame disables only decorative dust and a restored frame reuses its original pool', () => {
            const f = fixture(keyboard), view = f.view, frame = view.dustFrame;
            const original = JSON.stringify(view.particleDiagnostics), ids = JSON.stringify(view.artworkRoot.children.map(n => n.uuid));
            view.sweep(-260, -32.5, 260, -32.5, 46);
            view.dustFrame = null; view.configure(keyboard); const disabled = alphas(view);
            view.sweep(-1000, 0, 1000, 0, 1000);
            assert(alphas(view) === disabled && view.artworkRoot.children.every(n => !n.active), 'Missing frame kept drawing or erased more dust');
            assert(f.stage.totalCells === 32 && f.stage.cleanedCells === 0
                && f.stage.inputSurface.hasEventListener(cc.Node.EventType.TOUCH_START), 'Optional missing image changed logic/input');
            view.dustFrame = frame; view.configure(keyboard);
            assert(JSON.stringify(view.particleDiagnostics) === original && view.totalCreatedParticles === 192
                && JSON.stringify(view.artworkRoot.children.map(n => n.uuid)) === ids, 'Restored frame failed deterministic reuse');
            assert(view.artworkRoot.children.every(n => n.active && n.getComponent(cc.Sprite)?.spriteFrame === frame), 'Restored renderer/frame missing');
            return { missingFrameSafe: true, restoredOriginalAlpha: true, logicalInputRetained: true, totalCreated: view.totalCreatedParticles };
        });
        check('V22 saved four element Prefabs enable child-only legibility with the original visible outlined captions', () => {
            const drag = source.stageHost.dragMatchPrefab.data.getComponent(types.DragMatchStageController);
            const cable = source.stageHost.cableConnectPrefab.data.getComponent(types.CableConnectStageController);
            const head = cable.cablePrefab.data.getComponent(types.CableConnector).head;
            const nodes = [drag.itemPrefab.data, drag.targetPrefab.data, cable.portPrefab.data, head];
            const evidence = nodes.map(node => {
                const visual = node.getComponent(types.ElementVisual), label = visual?.caption;
                assert(visual?.refinedLayout && visual.smallScreenLegibility && label?.enabled && label.node.active,
                    'Current Prefab must keep its visible original caption and opt in');
                assert(label.enableOutline && label.outlineWidth === 2 && label.outlineColor.r === 255
                    && label.outlineColor.g === 245 && label.outlineColor.b === 219, 'Actual cream Label outline missing');
                assert(label.node.parent === node && visual.icon.node.parent === node
                    && !label.node.getComponent(cc.Button) && !label.node.getComponent(cc.BlockInputEvents), 'Caption/icon moved outside input or intercepts events');
                return { name: node.name, width: node.getComponent(cc.UITransform).width,
                    height: node.getComponent(cc.UITransform).height, outlineWidth: label.outlineWidth };
            });
            return { savedElements: evidence, noAdditionalCaptionNodes: true };
        });
        check('V22 actual order8 and order9 four-item stages show eight complete 28px short captions without moving their 140x110 roots', () => {
            const records = [];
            for (const orderId of [8, 9]) {
                const definition = source.orders.find(order => order.id === orderId).stages.find(stage => stage.kind === 'drag-match');
                const f = displayFixture(definition);
                assert(f.stage.progress.total === 4 && f.stage.progress.completed === 0, 'Actual four-device definition changed');
                definition.pairs.forEach((pair, index) => {
                    for (const [node, position] of [[f.stage.itemNodes[index], pair.itemStart], [f.stage.targetNodes[index], pair.targetPosition]]) {
                        const visual = node.getComponent(types.ElementVisual), ui = node.getComponent(cc.UITransform);
                        assert(ui.width === 140 && ui.height === 110 && node.position.x === position.x && node.position.y === position.y,
                            'Original four-item input geometry changed');
                        assert(visual.caption.string === pair.itemLabel && visual.caption.fontSize === 28
                            && visual.caption.enabled && visual.caption.node.active, 'Four-item original caption is missing or unreadable');
                        assert(band(visual.caption.node).top < band(visual.icon.node).bottom, 'Device label overlaps its cropped artwork');
                    }
                });
                records.push({ orderId, captions: f.stage.itemNodes.filter(node => node.active).map(node => node.getComponent(types.ElementVisual).caption.string), fontSize: 28 });
            }
            return { orders: records, catalogNamesUnchanged: true, itemAndTargetGeometryUnchanged: true };
        });
        check('V22 actual four-cable captions retain distinct short Head and Port labels, readable child bands and false initial success lights', () => {
            const definition = source.orders.find(order => order.id === 9).stages.find(stage => stage.kind === 'cable-connect');
            const f = displayFixture(definition), expected = [['主板线', '主板口'], ['CPU线', 'CPU口'], ['硬盘线', '硬盘口'], ['风扇线', '风扇口']];
            assert(f.stage.progress.total === 4 && f.stage.progress.completed === 0, 'Four-cable counter changed');
            const rows = f.stage.cableNodes.filter(node => node.active).map((node, index) => {
                const connector = node.getComponent(types.CableConnector), head = connector.head;
                const hv = head.getComponent(types.ElementVisual), pv = connector.currentPort.getComponent(types.ElementVisual);
                assert(!connector.isConnected && !node.getComponent(cc.js.getClassByName('V2CableLine')).statusLight.active,
                    'False initial connection or success lamp');
                assert(hv.caption.string === expected[index][0] && pv.caption.string === expected[index][1]
                    && hv.caption.fontSize === 28 && pv.caption.fontSize === 28, 'Stable display aliases changed their cable/port pairing');
                assert(band(hv.caption.node).bottom > band(hv.icon.node).top
                    && band(pv.caption.node).top < band(pv.icon.node).bottom, 'Cable captions cover their plug/socket');
                assert(head.getComponent(cc.UITransform).width === 130 && head.getComponent(cc.UITransform).height === 80
                    && connector.currentPort.getComponent(cc.UITransform).width === 130 && connector.currentPort.getComponent(cc.UITransform).height === 80,
                    'Head or Port hitbox changed');
                return { id: definition.cables[index].id, head: hv.caption.string, port: pv.caption.string,
                    headCaptionY: hv.caption.node.position.y, portCaptionY: pv.caption.node.position.y };
            });
            return { rows, actualInitialCount: f.stage.progress, original46CheckRealSnapsAndLamps: true };
        });
    } catch (error) { result.error = error instanceof Error ? error.stack : String(error); }
    finally {
        fixtures.forEach(f => { try { cleanup(f); } catch (error) { cleanupErrors.push({ check: 'final cleanup', error: String(error) }); } });
        actions.removeAllActions(); cc.TweenSystem.instance = originalSystem;
        const ownCleanup = {
            originalTweenSystemRestored: cc.TweenSystem.instance === originalSystem,
            offSceneFixtures: fixtures.length, fixtureRootsScheduledForDestroy: fixtures.filter(f => f.cleaned).length,
            formalSceneUnchanged: before != null && before === snapshot(), errors: cleanupErrors,
        };
        result.supplementalCleanup = ownCleanup;
        result.cleanup = {
            originalTweenSystemRestored: legacyResult.cleanup.originalTweenSystemRestored && ownCleanup.originalTweenSystemRestored,
            offSceneFixtures: legacyResult.cleanup.offSceneFixtures + ownCleanup.offSceneFixtures,
            fixtureRootsScheduledForDestroy: legacyResult.cleanup.fixtureRootsScheduledForDestroy + ownCleanup.fixtureRootsScheduledForDestroy,
            formalSceneUnchanged: legacyResult.cleanup.formalSceneUnchanged && ownCleanup.formalSceneUnchanged,
            errors: [...legacyResult.cleanup.errors, ...cleanupErrors],
        };
    }
    result.passedChecks = checks.filter(check => check.status === 'PASS').length;
    result.failedChecks = checks.filter(check => check.status === 'FAIL').length;
    result.totalChecks = checks.length;
    result.counts = { ...legacyResult.counts, checks: checks.length, passed: result.passedChecks, failed: result.failedChecks,
        originalV21ChecksReexecuted: legacyResult.totalChecks, newV22VisualChecks: checks.length - legacyResult.totalChecks };
    result.ok = legacyResult.ok && legacyResult.totalChecks === 46 && result.totalChecks === 53 && result.failedChecks === 0
        && !result.error && result.cleanup.originalTweenSystemRestored && result.cleanup.formalSceneUnchanged && result.cleanup.errors.length === 0;
    return result;
};
