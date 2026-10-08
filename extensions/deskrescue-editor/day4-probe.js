'use strict';

/** Real Creator components and saved Prefabs, isolated from the formal scene. */
exports.run = function (cc) {
    const checks = [], fixtures = [], lifecycle = new Map(), cleanupErrors = [];
    const originalSystem = cc.TweenSystem.instance;
    const system = new cc.TweenSystem(), actions = system.ActionManager;
    const types = {};
    const names = ['LevelManager', 'StageHost', 'RunController', 'GameController', 'DraggableItem',
        'CableConnector', 'DragMatchStageController', 'CableConnectStageController', 'CleanSwipeStageController'];
    let source = null, before = null;
    const result = {
        ok: false, timestamp: new Date().toISOString(), engineVersion: cc.ENGINE_VERSION || cc.VERSION || 'unknown',
        mode: 'actual saved Prefabs, off-scene fixtures, isolated real Cocos ActionManager with manual delta time',
        input: 'real cc.Touch and cc.EventTouch emitted to fixture nodes',
        lifecycle: 'explicit input-component lifecycle synchronization because Editor suppresses game lifecycle',
        limitations: ['Not Preview natural-clock playback', 'Not browser native touch adapters or UI hit testing',
            'Not physical touchscreen, mobile WebView or mini-game platform', 'Rendering and clipping require separate Preview verification'],
        checks,
    };
    function assert(value, message) { if (!value) throw new Error(message); }
    function close(a, b, name) { assert(Number.isFinite(a) && Math.abs(a - b) < 0.001, `${name}: ${a} != ${b}`); }
    function vector(v) { return { x: v.x, y: v.y, z: v.z }; }
    function position(node, p, name) { close(node.position.x, p.x, `${name}.x`); close(node.position.y, p.y, `${name}.y`); }
    function walk(node, fn) { fn(node); for (const child of node.children.slice()) walk(child, fn); }
    function snapshot() {
        const entries = [];
        walk(cc.director.getScene(), n => entries.push([n.uuid, n.parent?.uuid, n.active, vector(n.position),
            vector(n.scale), n.getComponent(cc.Label)?.string]));
        return JSON.stringify(entries);
    }
    function sync(f) {
        if (f.cleaned) return;
        function visit(node, parentActive) {
            const active = parentActive && node.active;
            for (const name of ['DraggableItem', 'CableConnector', 'CleanSwipeStageController']) {
                const c = node.getComponent(types[name]);
                if (!c) continue;
                const old = lifecycle.get(c) || { loaded: false, active: false };
                if (!old.loaded) { c.onLoad?.(); old.loaded = true; }
                const enabled = active && c.enabled;
                if (old.active !== enabled) {
                    if (enabled) c.onEnable?.(); else c.onDisable?.();
                    old.active = enabled;
                }
                lifecycle.set(c, old);
            }
            for (const child of node.children.slice()) visit(child, active);
        }
        visit(f.root, true);
    }
    function syncAll() { fixtures.forEach(sync); }
    function tick(seconds) { syncAll(); actions.update(0); actions.update(seconds); syncAll(); }
    function emit(node, eventName, point, id = 0) {
        syncAll();
        const viewport = cc.view.getViewportRect();
        const touch = new cc.Touch(point.x * cc.view.getScaleX() + viewport.x, point.y * cc.view.getScaleY() + viewport.y, id);
        const type = cc.Node.EventType[eventName];
        const event = new cc.EventTouch([touch], false, type, [touch]);
        event.touch = touch; event.simulate = true;
        close(event.getUILocation().x, point.x, 'real Touch UI x');
        close(event.getUILocation().y, point.y, 'real Touch UI y');
        node.emit(type, event); syncAll();
        return event;
    }
    function ui(parent, name) {
        const node = new cc.Node(`__Day4Probe_${name}`);
        node.layer = cc.Layers.Enum.UI_2D;
        node.addComponent(cc.UITransform).setContentSize(720, 800);
        if (parent) parent.addChild(node);
        return node;
    }
    function fixture(index = 0) {
        const root = ui(null, 'Root'), manager = root.addComponent(types.LevelManager), run = root.addComponent(types.RunController);
        const host = ui(root, 'Host').addComponent(types.StageHost);
        for (const key of ['dragMatchPrefab', 'cableConnectPrefab', 'cleanSwipePrefab']) host[key] = source.stageHost[key];
        const label = name => ui(root, name).addComponent(cc.Label);
        run.timeLabel = label('Time'); run.mistakeLabel = label('Mistakes');
        const panel = ui(root, 'CompletePanel'); panel.active = false;
        Object.assign(manager, {
            orders: source.orders, runController: run, stageHost: host,
            chapterLabel: label('Chapter'), levelLabel: label('Order'), levelTitleLabel: label('Title'), stageLabel: label('Stage'),
            statusLabel: label('Status'), tutorialHint: ui(root, 'Tutorial'), tutorialLabel: label('TutorialText'),
            completePanel: panel, completeLabel: label('Complete'), completeDetailLabel: label('Detail'),
            nextButton: ui(panel, 'Button').addComponent(cc.Button), actionButtonLabel: label('Action'),
        });
        const f = { root, manager, run, host, cleaned: false }; fixtures.push(f);
        manager.loadOrder(index); sync(f); return f;
    }
    function current(f) {
        const type = types[f.host.currentKind === 'drag-match' ? 'DragMatchStageController'
            : f.host.currentKind === 'cable-connect' ? 'CableConnectStageController' : 'CleanSwipeStageController'];
        const node = f.host.node.children.find(n => n.active && n.getComponent(type));
        assert(node, `Missing active ${f.host.currentKind} root`); return node.getComponent(type);
    }
    function records() {
        const r = { completed: 0, mistakes: 0, progress: [] };
        r.callbacks = { onProgress: p => r.progress.push({ ...p }), onMistake: () => { r.mistakes++; }, onComplete: () => { r.completed++; } };
        return r;
    }
    function definition(kind, count) {
        for (const order of source.orders) for (const stage of order.stages) {
            if (stage.kind !== kind) continue;
            const size = kind === 'drag-match' ? stage.pairs.length : kind === 'cable-connect' ? stage.cables.length
                : stage.areas.reduce((sum, a) => sum + a.columns * a.rows, 0);
            if (count === undefined || size === count) return stage;
        }
        throw new Error(`Missing ${kind} / ${count} configuration`);
    }
    function load(f, def, r) { f.host.loadStage(def, r.callbacks); sync(f); return current(f); }
    function drop(node, target, id = 0, offset = 0) {
        emit(node, 'TOUCH_START', node.worldPosition, id);
        const p = target.worldPosition.clone(); p.x += offset;
        emit(node, 'TOUCH_END', p, id);
    }
    function clean(stage, cell, id = 0) {
        const surface = stage.inputSurface || stage.node;
        emit(surface, 'TOUCH_START', cell.worldPosition, id); emit(surface, 'TOUCH_END', cell.worldPosition, id);
    }
    function solve(f) {
        const kind = f.host.currentKind, stage = current(f);
        if (kind === 'drag-match') {
            for (const n of stage.itemNodes.filter(n => n.active)) {
                const c = n.getComponent(types.DraggableItem);
                if (!c.isPlaced) { drop(n, c.target); tick(0.16); }
            }
        } else if (kind === 'cable-connect') {
            for (const n of stage.cableNodes.filter(n => n.active)) {
                const c = n.getComponent(types.CableConnector);
                if (!c.isConnected) { drop(c.head, c.currentPort); tick(0.16); }
            }
        } else for (const cell of stage.cellNodes.filter(n => n.active)) {
            if (stage.progress.completed >= stage.progress.total) break;
            clean(stage, cell); tick(0.09);
        }
        return { kind, progress: stage.progress };
    }
    function cleanup(f) {
        if (f.cleaned) return;
        const components = [];
        walk(f.root, node => { for (const name of names) { const c = node.getComponent(types[name]); if (c) components.push(c); } });
        f.manager.onDestroy();
        for (const c of components.reverse()) { if (c !== f.manager) c.onDestroy?.(); lifecycle.delete(c); }
        f.root.destroy(); f.cleaned = true;
    }
    function check(name, action) {
        const start = fixtures.length;
        try { checks.push({ name, status: 'PASS', evidence: action() }); }
        catch (e) { checks.push({ name, status: 'FAIL', error: e instanceof Error ? e.stack : String(e) }); }
        finally {
            for (const f of fixtures.slice(start)) {
                try { cleanup(f); }
                catch (error) {
                    cleanupErrors.push({ check: name, error: error instanceof Error ? error.message : String(error) });
                }
            }
            actions.removeAllActions();
        }
    }
    try {
        for (const name of names) { types[name] = cc.js.getClassByName(name); assert(types[name], `Unregistered real class ${name}`); }
        source = cc.director.getScene().getComponentInChildren(types.LevelManager);
        assert(source?.stageHost, 'Open saved Day 4 scene must bind LevelManager.stageHost');
        for (const key of ['dragMatchPrefab', 'cableConnectPrefab', 'cleanSwipePrefab']) assert(source.stageHost[key] instanceof cc.Prefab, `Missing real ${key}`);
        before = snapshot(); cc.TweenSystem.instance = system;
        assert(cc.TweenSystem.instance === system, 'Cannot isolate TweenSystem');

        check('three actual Stage and five element Prefabs instantiate with typed references', () => {
            const f = fixture(), ids = {};
            for (const [kind, field, elements] of [['drag-match', 'dragMatchPrefab', ['itemPrefab', 'targetPrefab']],
                ['cable-connect', 'cableConnectPrefab', ['cablePrefab', 'portPrefab']], ['clean-swipe', 'cleanSwipePrefab', ['dirtCellPrefab']]]) {
                const stage = load(f, definition(kind), records()); ids[field] = f.host[field]._uuid;
                for (const key of elements) { assert(stage[key] instanceof cc.Prefab, `Invalid ${key}`); ids[key] = stage[key]._uuid; }
            }
            assert(Object.keys(ids).length === 8 && f.host.cachedStageCount === 3, 'Eight Prefabs and three cached roots required');
            return { prefabUuids: ids, cachedStageRoots: 3 };
        });

        for (const kind of ['drag-match', 'cable-connect']) check(`${kind} real pool preserves identities through 2→4→2→4`, () => {
            // Begin on another kind so this pool really starts empty, rather than with order 1's three items.
            const f = fixture(kind === 'drag-match' ? 3 : 0), evidence = []; let old = [];
            for (const count of [2, 4, 2, 4]) {
                const stage = load(f, definition(kind, count), records());
                const nodes = kind === 'drag-match' ? stage.itemNodes : stage.cableNodes;
                old.forEach((n, i) => assert(nodes[i] === n, 'Existing pooled node was replaced'));
                assert(nodes.filter(n => n.active).length === count, 'Active element count mismatch');
                evidence.push({ count, pool: nodes.length, ids: nodes.map(n => n.uuid) }); old = nodes;
            }
            return evidence;
        });

        check('dirt pool reuses and restores cells through 20→35→32→20', () => {
            const f = fixture(), evidence = []; let old = [];
            for (const count of [20, 35, 32, 20]) {
                const stage = load(f, definition('clean-swipe', count), records()), nodes = stage.cellNodes;
                old.forEach((n, i) => assert(nodes[i] === n, 'Dirt node was replaced'));
                assert(nodes.filter(n => n.active).length === count, 'Active dirt count mismatch');
                nodes.filter(n => n.active).forEach(n => close(n.getComponent(cc.UIOpacity).opacity, 255, 'reset opacity'));
                evidence.push({ count, pooled: stage.pooledCellCount, required: stage.requiredCells });
                clean(stage, nodes[0]); tick(0.09); old = nodes;
            }
            return evidence;
        });

        check('drag pickup / snap interpolate at .10 / .15 seconds and count exactly after settlement', () => {
            const f = fixture(), r = records(), stage = load(f, definition('drag-match', 2), r);
            const node = stage.itemNodes[0], drag = node.getComponent(types.DraggableItem);
            emit(node, 'TOUCH_START', node.worldPosition); tick(0.05); const pickup = node.scale.x;
            assert(pickup > 1 && pickup < 1.06, 'Pickup must interpolate'); tick(0.05); close(node.scale.x, 1.06, 'pickup endpoint');
            const point = drag.target.worldPosition.clone(); point.x -= 40; emit(node, 'TOUCH_END', point);
            tick(0.075); const snap = node.position.x;
            assert(!drag.isPlaced && stage.progress.completed === 0, 'Midpoint cannot count');
            assert(snap > drag.target.position.x - 40 && snap < drag.target.position.x, 'Snap must interpolate');
            tick(0.08); assert(drag.isPlaced && stage.progress.completed === 1, 'One settled placement required');
            emit(node, 'TOUCH_END', point); tick(0.2); assert(stage.progress.completed === 1, 'Duplicate END counted');
            return { pickupMidpoint: pickup, pickupSeconds: 0.1, snapMidpoint: snap, snapSeconds: 0.15, count: 1 };
        });

        check('drag wrong .18 second return charges once; foreign touch and CANCEL charge zero', () => {
            const f = fixture(), r = records(), stage = load(f, definition('drag-match', 2), r), node = stage.itemNodes[0];
            const origin = node.position.clone(), far = node.worldPosition.clone(); far.x += 300; far.y += 300;
            emit(node, 'TOUCH_START', node.worldPosition, 0); emit(node, 'TOUCH_END', far, 7);
            assert(r.mistakes === 0, 'Foreign release must be ignored'); emit(node, 'TOUCH_END', far); emit(node, 'TOUCH_END', far);
            assert(r.mistakes === 1, 'Wrong release charges once'); tick(0.09);
            assert(node.position.x > origin.x && node.position.x < origin.x + 300, 'Return must interpolate');
            tick(0.10); position(node, origin, 'return');
            emit(node, 'TOUCH_START', node.worldPosition); emit(node, 'TOUCH_MOVE', far); emit(node, 'TOUCH_CANCEL', far);
            position(node, origin, 'cancel'); assert(r.mistakes === 1 && stage.progress.completed === 0, 'Cancel altered metrics');
            return { returnSeconds: 0.18, mistakes: 1, canceledMistakes: 0, foreignMistakes: 0 };
        });

        check('cable .15 second real snap interpolates and keeps its Graphics anchor fixed', () => {
            const f = fixture(), r = records(), stage = load(f, definition('cable-connect', 2), r);
            const cable = stage.cableNodes[0].getComponent(types.CableConnector), anchor = cable.anchor.position.clone();
            drop(cable.head, cable.currentPort, 0, -40); assert(stage.progress.completed === 0, 'Cable cannot count early');
            tick(0.075); const mid = cable.head.position.x;
            assert(mid > cable.currentPort.position.x - 40 && mid < cable.currentPort.position.x, 'Cable must interpolate');
            tick(0.08); assert(cable.isConnected && stage.progress.completed === 1, 'Cable must count once');
            position(cable.anchor, anchor, 'fixed anchor'); close(cable.head.worldPosition.x, cable.currentPort.worldPosition.x, 'world endpoint');
            emit(cable.head, 'TOUCH_END', cable.currentPort.worldPosition); assert(stage.progress.completed === 1, 'Cable repeated count');
            return { midpoint: mid, seconds: 0.15, anchor: vector(anchor), endpoint: vector(cable.head.position), count: 1 };
        });

        check('cable wrong-port / blank releases charge once each; CANCEL and foreign ownership are ignored', () => {
            const f = fixture(), r = records(), stage = load(f, definition('cable-connect', 2), r);
            const cable = stage.cableNodes[0].getComponent(types.CableConnector), origin = cable.head.position.clone();
            drop(cable.head, stage.portNodes[1]); emit(cable.head, 'TOUCH_END', stage.portNodes[1].worldPosition);
            assert(r.mistakes === 1, 'Wrong port must charge once'); tick(0.09);
            assert(cable.head.position.x > origin.x && cable.head.position.x < stage.portNodes[1].position.x, 'Return must interpolate');
            tick(0.10); position(cable.head, origin, 'return'); const blank = cable.head.worldPosition.clone(); blank.x += 170;
            emit(cable.head, 'TOUCH_START', cable.head.worldPosition);
            for (const name of ['TOUCH_START', 'TOUCH_MOVE', 'TOUCH_END', 'TOUCH_CANCEL']) emit(cable.head, name, blank, 99);
            position(cable.head, origin, 'foreign input'); emit(cable.head, 'TOUCH_END', blank); tick(0.19);
            assert(r.mistakes === 2, 'Blank release must charge exactly once');
            emit(cable.head, 'TOUCH_START', cable.head.worldPosition); emit(cable.head, 'TOUCH_MOVE', cable.currentPort.worldPosition);
            emit(cable.head, 'TOUCH_CANCEL', cable.currentPort.worldPosition); position(cable.head, origin, 'cancel');
            assert(r.mistakes === 2 && stage.progress.completed === 0, 'Cancel altered cable metrics');
            return { returnSeconds: 0.18, wrongPortMistakes: 1, blankMistakes: 1, cancelMistakes: 0, foreignEvents: 4 };
        });

        check('cable head / port / Graphics use real transforms across rotated and nonuniformly scaled parents', () => {
            const f = fixture(), r = records(), stage = load(f, definition('cable-connect', 2), r);
            const cable = stage.cableNodes[0].getComponent(types.CableConnector);
            const portParent = ui(stage.node, 'TransformedPorts');
            portParent.setPosition(30, 80, 0); portParent.angle = -25; portParent.setScale(0.75, 1.4, 1);
            cable.currentPort.parent = portParent;
            f.root.setPosition(120, 60, 0); f.root.angle = 17; f.root.setScale(1.3, 0.8, 1);
            const anchor = cable.anchor.position.clone();
            drop(cable.head, cable.currentPort); tick(0.16);
            assert(cable.isConnected && stage.progress.completed === 1 && r.mistakes === 0, 'Transformed connection must count once');
            close(cable.head.worldPosition.x, cable.currentPort.worldPosition.x, 'transformed world x');
            close(cable.head.worldPosition.y, cable.currentPort.worldPosition.y, 'transformed world y');
            position(cable.anchor, anchor, 'transformed fixed anchor');
            const expectedLineEnd = cable.line.node.getComponent(cc.UITransform).convertToNodeSpaceAR(cable.head.worldPosition);
            close(cable.lineEnd.x, expectedLineEnd.x, 'Graphics endpoint x');
            close(cable.lineEnd.y, expectedLineEnd.y, 'Graphics endpoint y');
            return { headWorld: vector(cable.head.worldPosition), portWorld: vector(cable.currentPort.worldPosition),
                graphicsEndpoint: vector(cable.lineEnd), rootScale: vector(f.root.scale), rootAngle: f.root.angle, portParentAngle: portParent.angle };
        });

        check('clean .08 second opacity interpolation counts once and CANCEL retains cleaned cells', () => {
            const f = fixture(), r = records(), stage = load(f, definition('clean-swipe', 32), r);
            const surface = stage.inputSurface || stage.node, cell = stage.cellNodes[0];
            emit(surface, 'TOUCH_START', cell.worldPosition); const count = stage.cleanedCells;
            assert(count > 0, 'START must clean'); tick(0.04); const mid = cell.getComponent(cc.UIOpacity).opacity;
            assert(mid > 0 && mid < 255, 'Opacity must interpolate');
            emit(surface, 'TOUCH_MOVE', stage.cellNodes[31].worldPosition, 77); assert(stage.cleanedCells === count, 'Foreign move cleaned');
            emit(surface, 'TOUCH_MOVE', cell.worldPosition); assert(stage.cleanedCells === count, 'Cell counted twice');
            emit(surface, 'TOUCH_CANCEL', cell.worldPosition); tick(0.05);
            assert(!cell.active && stage.cleanedCells === count && r.mistakes === 0, 'Cancel must preserve cleaned cells');
            return { total: 32, required: stage.requiredCells, midpointOpacity: mid, seconds: 0.08, countAfterCancel: count };
        });

        check('fast clean stroke covers the segment and completes at ceil(32 × .85) exactly once', () => {
            const f = fixture(), r = records(), stage = load(f, definition('clean-swipe', 32), r), surface = stage.inputSurface || stage.node;
            emit(surface, 'TOUCH_START', stage.cellNodes[0].worldPosition); emit(surface, 'TOUCH_MOVE', stage.cellNodes[7].worldPosition);
            emit(surface, 'TOUCH_END', stage.cellNodes[7].worldPosition); assert(stage.cleanedCells >= 8, 'Fast stroke skipped centers');
            for (const cell of stage.cellNodes) { if (stage.progress.completed >= stage.progress.total) break; clean(stage, cell); }
            assert(stage.requiredCells === 28 && stage.progress.completed === 28 && r.completed === 1, 'Threshold/completion mismatch');
            clean(stage, stage.cellNodes[31]); assert(r.completed === 1 && r.mistakes === 0, 'Completed stage input remained unlocked');
            return { cells: 32, required: 28, completions: 1, mistakes: 0 };
        });

        check('old drag snap and late Stage callbacks cannot mutate a new Host generation', () => {
            const f = fixture(), old = records(), stage = load(f, definition('drag-match', 2), old);
            const item = stage.itemNodes[0], callbacks = stage.callbacks;
            drop(item, item.getComponent(types.DraggableItem).target); tick(0.05);
            const generation = f.host.currentGeneration, fresh = records(), next = load(f, definition('drag-match', 4), fresh);
            const origin = next.itemNodes[0].position.clone();
            callbacks.onProgress({ completed: 2, total: 2 }); callbacks.onMistake(); callbacks.onComplete(); tick(0.5);
            position(next.itemNodes[0], origin, 'fresh origin');
            assert(f.host.currentGeneration > generation && next.progress.completed === 0, 'Old tween altered new stage');
            assert(old.completed === 0 && old.mistakes === 0 && fresh.completed === 0, 'Late callbacks escaped their generation');
            return { previousGeneration: generation, currentGeneration: f.host.currentGeneration, progress: next.progress };
        });

        check('old clean fade cannot hide a reused cell after configure', () => {
            const f = fixture(), stage = load(f, definition('clean-swipe', 20), records()), cell = stage.cellNodes[0];
            clean(stage, cell); tick(0.04); const fresh = load(f, definition('clean-swipe', 35), records()); tick(0.3);
            assert(fresh.cellNodes[0] === cell && cell.active && cell.getComponent(cc.UIOpacity).opacity === 255 && fresh.cleanedCells === 0,
                'Old fade changed new cell state');
            return { reusedNode: cell.uuid, freshOpacity: 255, freshCleanedCount: 0 };
        });

        check('Host caches one root per kind and enables exactly one across repeated switches', () => {
            const f = fixture(), ids = {};
            for (const kind of ['drag-match', 'cable-connect', 'clean-swipe', 'drag-match', 'clean-swipe', 'cable-connect']) {
                const stage = load(f, definition(kind), records());
                if (ids[kind]) assert(ids[kind] === stage.node.uuid, 'Stage root replaced'); else ids[kind] = stage.node.uuid;
                assert(f.host.node.children.filter(n => n.active).length === 1, 'More than one active stage');
            }
            assert(f.host.cachedStageCount === 3, 'Cache count mismatch'); return { cached: 3, rootIds: ids };
        });

        for (const id of [6, 8, 9]) check(`order ${id} plays its complete stage sequence without resetting time or early settlement`, () => {
            const index = source.orders.findIndex(o => o.id === id), f = fixture(index), sequence = [];
            for (let i = 0; i < source.orders[index].stages.length; i++) {
                assert(f.manager.currentStageIndex === i, 'Stage order mismatch'); f.run.advanceTime(1.25);
                sequence.push({ index: i, ...solve(f), elapsedMs: f.run.currentElapsedMs });
                assert(f.run.levelResults.length === (i === source.orders[index].stages.length - 1 ? 1 : 0), 'Premature or duplicate result');
                close(f.run.currentElapsedMs, (i + 1) * 1250, 'cross-stage time');
            }
            assert(f.run.levelResults[0].levelId === id, 'Incorrect result order id'); return { sequence, result: f.run.levelResults[0] };
        });

        check('9 orders / 13 stages finish via input, total 27 stars, and replay resets metrics while retaining cache', () => {
            const f = fixture(), sequence = [];
            for (let oi = 0; oi < source.orders.length; oi++) {
                assert(f.manager.currentOrderIndex === oi, 'Order sequence mismatch');
                for (let si = 0; si < source.orders[oi].stages.length; si++) sequence.push({ order: oi + 1, stage: si + 1, ...solve(f) });
                assert(f.run.levelResults.length === oi + 1, 'One result per order required');
                if (oi + 1 < source.orders.length) f.manager.nextButton.node.emit(cc.Button.EventType.CLICK); sync(f);
            }
            assert(sequence.length === 13 && f.run.summary.completedOrders === 9 && f.run.summary.earnedStars === 27, 'Final totals mismatch');
            const summary = f.manager.completeDetailLabel.string, cached = f.host.cachedStageCount;
            assert(summary.includes('完成订单：9 / 9') && summary.includes('27 / 27 星') && summary.includes('完成步骤：13 / 13'), 'Summary mismatch');
            f.manager.nextButton.node.emit(cc.Button.EventType.CLICK); f.manager.nextButton.node.emit(cc.Button.EventType.CLICK); sync(f);
            assert(f.manager.currentOrderIndex === 0 && f.manager.currentStageIndex === 0 && f.run.levelResults.length === 0, 'Replay reset mismatch');
            assert(f.run.currentElapsedMs === 0 && f.run.currentMistakes === 0 && f.host.cachedStageCount === cached, 'Replay metrics/cache mismatch');
            return { sequence, summary, replay: { results: 0, retainedStageRoots: cached } };
        });

        check('all three session tutorials wait for valid progress and remain seen after replay', () => {
            const f = fixture(); assert(f.manager.tutorialHint.active, 'First drag tutorial missing');
            const node = current(f).itemNodes[0], wrong = node.worldPosition.clone(); wrong.x += 300;
            emit(node, 'TOUCH_START', node.worldPosition); emit(node, 'TOUCH_END', wrong); tick(0.19);
            assert(f.manager.tutorialHint.active, 'Wrong drop hid tutorial');
            emit(node, 'TOUCH_START', node.worldPosition); emit(node, 'TOUCH_CANCEL', node.worldPosition);
            assert(f.manager.tutorialHint.active, 'Cancel hid tutorial');
            drop(node, node.getComponent(types.DraggableItem).target); tick(0.16); assert(!f.manager.tutorialHint.active, 'Drag progress did not hide tutorial');
            f.manager.loadOrder(3); sync(f); assert(f.manager.tutorialHint.active, 'First clean tutorial missing');
            clean(current(f), current(f).cellNodes[0]); assert(!f.manager.tutorialHint.active, 'Clean progress did not hide tutorial');
            f.manager.loadOrder(4); sync(f); assert(f.manager.tutorialHint.active, 'First cable tutorial missing');
            const cable = current(f).cableNodes[0].getComponent(types.CableConnector);
            drop(cable.head, cable.currentPort); tick(0.16); assert(!f.manager.tutorialHint.active, 'Cable progress did not hide tutorial');
            f.manager.loadOrder(8); sync(f); for (let i = 0; i < 3; i++) solve(f); f.manager.playAgain(); sync(f);
            assert(!f.manager.tutorialHint.active, 'Replay forgot drag tutorial');
            for (const index of [3, 4]) { f.manager.loadOrder(index); sync(f); assert(!f.manager.tutorialHint.active, 'Replay forgot a seen kind'); }
            return { kinds: ['drag-match', 'clean-swipe', 'cable-connect'], preservedThroughReplay: true };
        });

        check('manager disable / enable preserves partial progress, pauses time and rejects detached callbacks', () => {
            const f = fixture(), stage = current(f), first = stage.itemNodes[0];
            drop(first, first.getComponent(types.DraggableItem).target); tick(0.16); f.run.advanceTime(2);
            const old = stage.callbacks; f.manager.enabled = false; f.manager.onDisable(); sync(f);
            f.run.advanceTime(5); old.onMistake(); old.onComplete(); close(f.run.currentElapsedMs, 2000, 'paused time');
            assert(f.run.currentMistakes === 0 && f.run.levelResults.length === 0, 'Detached callback mutated run');
            f.manager.enabled = true; f.manager.onEnable(); sync(f); assert(current(f).progress.completed === 1, 'Resume lost progress');
            f.run.advanceTime(1); solve(f);
            assert(f.run.levelResults.length === 1 && f.run.levelResults[0].elapsedMs === 3000, 'Resumed result mismatch');
            return { resumedProgress: 1, finalMilliseconds: 3000, results: 1 };
        });

        check('result panel plays .8→1.08→1.0 and restart clears the settled result and old feedback', () => {
            const f = fixture(), stage = current(f), items = stage.itemNodes.filter(n => n.active);
            for (let i = 0; i < items.length - 1; i++) { drop(items[i], items[i].getComponent(types.DraggableItem).target); tick(0.16); }
            const last = items[items.length - 1]; drop(last, last.getComponent(types.DraggableItem).target); tick(0.15);
            const panel = f.manager.completePanel;
            assert(panel.active && f.manager.nextButton.interactable, 'Completion UI unavailable'); close(panel.scale.x, 0.8, 'panel initial scale');
            tick(0.07); const rise = panel.scale.x; assert(rise > 0.8 && rise < 1.08, 'Panel rise not interpolating');
            tick(0.07); close(panel.scale.x, 1.08, 'panel overshoot'); tick(0.05); const settle = panel.scale.x;
            assert(settle > 1 && settle < 1.08, 'Panel settle not interpolating'); tick(0.06); close(panel.scale.x, 1, 'panel baseline');
            f.manager.restartCurrentLevel(); sync(f); tick(0.5);
            assert(!panel.active && f.run.levelResults.length === 0 && current(f).progress.completed === 0, 'Restart did not reset');
            return { rise, overshoot: 1.08, settle, baseline: 1, resetResults: 0 };
        });
        result.ok = checks.length >= 12 && checks.every(c => c.status === 'PASS');
    } catch (error) { result.error = error instanceof Error ? error.stack : String(error); }
    finally {
        try {
            for (const f of fixtures) {
                try { cleanup(f); }
                catch (error) { cleanupErrors.push({ check: 'final cleanup', error: error instanceof Error ? error.message : String(error) }); }
            }
            actions.removeAllActions();
        }
        finally {
            cc.TweenSystem.instance = originalSystem;
            result.cleanup = { originalTweenSystemRestored: cc.TweenSystem.instance === originalSystem,
                offSceneFixtures: fixtures.length, fixtureRootsScheduledForDestroy: fixtures.filter(f => f.cleaned).length,
                formalSceneUnchanged: before !== null && before === snapshot(), errors: cleanupErrors };
            if (!result.cleanup.originalTweenSystemRestored || !result.cleanup.formalSceneUnchanged || cleanupErrors.length) result.ok = false;
        }
    }
    result.passedChecks = checks.filter(c => c.status === 'PASS').length;
    result.failedChecks = checks.filter(c => c.status === 'FAIL').length;
    result.counts = { checks: checks.length, passed: result.passedChecks, failed: result.failedChecks,
        catalogOrders: source?.orders.length || 0, catalogStages: source ? source.orders.reduce((n, o) => n + o.stages.length, 0) : 0 };
    return result;
};
