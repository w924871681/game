'use strict';

// Invoked by verify-day1 after one strict project compilation. Fixtures wire actual
// project Components to the same generic UI/event mock used by Day 1–3. Tween
// flushes verify endpoints and callback ownership; they do not simulate easing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function runDay4Tests(runtime) {
    const { mock, load, GameController, DraggableItem, RunController, LEVEL_CATALOG } = runtime;
    const { Node, UITransform, Label, Button, EventTouch, Vec3, Prefab, Graphics, Sprite, UIOpacity } = mock.cc;
    const { ORDER_CATALOG, validateOrderCatalog } = load('data/OrderCatalog.ts');
    const { LevelManager, GameState, formatStageProgress } = load('core/LevelManager.ts');
    const { StageHost } = load('stages/StageHost.ts');
    const { DragMatchStageController } = load('stages/DragMatchStageController.ts');
    const { CableConnectStageController } = load('stages/CableConnectStageController.ts');
    const { CleanSwipeStageController } = load('stages/CleanSwipeStageController.ts');
    const { CableConnector } = load('gameplay/CableConnector.ts');
    let groups = 0;
    const test = (name, action) => { action(); groups += 1; console.log(`PASS Day 4: ${name}`); };
    const clone = (value) => JSON.parse(JSON.stringify(value));
    const stages = ORDER_CATALOG.flatMap((order) => order.stages);
    const definitions = (kind, count) => stages.find((stage) => stage.kind === kind
        && (count === undefined || (stage.pairs || stage.cables || []).length === count));
    const node = (name, parent = null) => { const result = new Node(name); result.addComponent(UITransform); result.parent = parent; return result; };
    const label = (name, parent) => node(name, parent).addComponent(Label);
    const close = (actual, expected, context = 'position') => {
        for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs(actual[axis] - (expected[axis] || 0)) < 1e-7, `${context}.${axis}: ${actual[axis]} != ${expected[axis] || 0}`);
    };
    const emit = (target, type, point = target.worldPosition, id = 1) => {
        const event = new EventTouch(id, point); target.emit(Node.EventType[type], event); return event;
    };
    const drop = (target, position, id = 1) => { emit(target, 'TOUCH_START', target.worldPosition, id); emit(target, 'TOUCH_END', position, id); };
    const latestTween = (target) => { const result = mock.tweens.filter((entry) => entry.target === target).at(-1); assert.ok(result, 'Expected owned tween'); return result; };
    const events = () => {
        const value = { progress: [], mistakes: 0, completions: 0 };
        value.callbacks = { onProgress: (progress) => value.progress.push({ ...progress }), onMistake: () => { value.mistakes += 1; }, onComplete: () => { value.completions += 1; } };
        return value;
    };

    test('catalog contains nine orders, thirteen stages and all three discriminants', () => {
        assert.equal(ORDER_CATALOG.length, 9); assert.equal(stages.length, 13);
        assert.deepEqual([...new Set(stages.map((stage) => stage.kind))].sort(), ['cable-connect', 'clean-swipe', 'drag-match']);
        assert.doesNotThrow(() => validateOrderCatalog(ORDER_CATALOG));
    });
    test('orders one to three preserve every Day 3 coordinate, label, radius and score rule', () => {
        LEVEL_CATALOG.forEach((legacy, index) => {
            const order = ORDER_CATALOG[index], stage = order.stages[0];
            assert.equal(order.id, legacy.id); assert.equal(order.title, legacy.title); assert.deepEqual(order.scoreRule, legacy.scoreRule);
            assert.equal(order.stages.length, 1); assert.equal(stage.kind, 'drag-match'); assert.equal(stage.title, legacy.title);
            assert.equal(stage.instruction, legacy.instruction); assert.equal(stage.defaultSnapDistance, legacy.snapDistance);
            assert.deepEqual(stage.pairs.map((pair) => ({ id: pair.id, label: pair.itemLabel, targetLabel: pair.targetLabel,
                startPosition: pair.itemStart, targetPosition: pair.targetPosition })), legacy.items);
        });
    });
    test('catalog identities are unique at each scope and thresholds retain inclusive order', () => {
        assert.equal(new Set(ORDER_CATALOG.map((order) => order.id)).size, 9); assert.equal(new Set(ORDER_CATALOG.map((order) => order.key)).size, 9);
        for (const order of ORDER_CATALOG) {
            assert.equal(new Set(order.stages.map((stage) => stage.id)).size, order.stages.length);
            assert.ok(order.stages.length >= 1 && order.stages.length <= 3);
            assert.ok(order.scoreRule.threeStarMaxTimeSeconds <= order.scoreRule.twoStarMaxTimeSeconds);
            assert.ok(order.scoreRule.threeStarMaxMistakes <= order.scoreRule.twoStarMaxMistakes);
            for (const stage of order.stages) { const elements = stage.pairs || stage.cables || stage.areas; assert.equal(new Set(elements.map((entry) => entry.id)).size, elements.length); }
        }
    });
    test('drag and cable catalogs exercise two, three and four pooled elements', () => {
        for (const [kind, key] of [['drag-match', 'pairs'], ['cable-connect', 'cables']])
            assert.deepEqual([...new Set(stages.filter((stage) => stage.kind === kind).map((stage) => stage[key].length))].sort(), [2, 3, 4]);
    });
    test('clean catalog has the specified 20, 32 and 35 cell geometries and ceil thresholds', () => {
        assert.deepEqual(stages.filter((stage) => stage.kind === 'clean-swipe').map((stage) => {
            const total = stage.areas.reduce((sum, area) => sum + area.columns * area.rows, 0); return [total, Math.ceil(total * stage.requiredRatio)];
        }), [[32, 28], [20, 17], [35, 32]]);
    });
    test('invalid IDs, duplicate identities, stage counts and unsupported kinds throw', () => {
        const mutations = [
            (orders) => { orders[0].id = 0; }, (orders) => { orders[1].id = orders[0].id; },
            (orders) => { orders[1].key = orders[0].key; }, (orders) => { orders[5].stages[1].id = orders[5].stages[0].id; },
            (orders) => { orders[0].stages = []; }, (orders) => { orders[0].stages = Array(4).fill(orders[0].stages[0]); },
            (orders) => { orders[0].stages[0].pairs[1].id = orders[0].stages[0].pairs[0].id; },
            (orders) => { orders[0].stages[0].kind = 'unknown'; },
        ];
        for (const mutate of mutations) { const orders = clone(ORDER_CATALOG); mutate(orders); assert.throws(() => validateOrderCatalog(orders)); }
    });
    test('invalid element sizes, finite coordinates, radii, ratios and grid budgets throw', () => {
        const mutations = [
            (orders) => { orders[0].stages[0].pairs.pop(); orders[0].stages[0].pairs.pop(); },
            (orders) => { orders[0].stages[0].defaultSnapDistance = 0; },
            (orders) => { orders[0].stages[0].pairs[0].itemStart.x = Infinity; },
            (orders) => { orders[0].stages[0].pairs[0].targetPosition.y = 5000; },
            (orders) => { orders[4].stages[0].cables[0].snapDistance = -1; },
            (orders) => { orders[4].stages[0].cables[1].id = orders[4].stages[0].cables[0].id; },
            (orders) => { orders[3].stages[0].brushRadius = 0; },
            (orders) => { orders[3].stages[0].requiredRatio = 0.49; },
            (orders) => { orders[3].stages[0].requiredRatio = 1.01; },
            (orders) => { orders[3].stages[0].areas[0].columns = 1.5; },
            (orders) => { orders[3].stages[0].areas[0].rows = 0; },
            (orders) => { orders[3].stages[0].areas[0].columns = 100; },
            (orders) => { orders[3].stages[0].areas[0].size.width = -1; },
            (orders) => { orders[0].scoreRule.threeStarMaxTimeSeconds = 500; },
            (orders) => { orders[0].scoreRule.threeStarMaxMistakes = 5; },
        ];
        for (const [index, mutate] of mutations.entries()) { const orders = clone(ORDER_CATALOG); mutate(orders); assert.throws(() => validateOrderCatalog(orders), `Invalid mutation ${index}`); }
    });
    test('readonly order graph is deeply frozen and cannot be changed by consumers', () => {
        function frozen(value) { assert.equal(Object.isFrozen(value), true); for (const child of Object.values(value)) if (child && typeof child === 'object') frozen(child); }
        frozen(ORDER_CATALOG); assert.throws(() => ORDER_CATALOG.push(ORDER_CATALOG[0]), TypeError);
        assert.throws(() => { ORDER_CATALOG[0].stages[0].pairs[0].itemStart.x = 1; }, TypeError);
    });

    function visualPrefab(name, extra) {
        return new Prefab(() => { const result = node(name); result.addComponent(Sprite); label('Label', result); extra?.(result); return result; });
    }
    function dragRoot() {
        const root = node('DragMatchStage'), stage = root.addComponent(DragMatchStageController);
        Object.assign(stage, { gameController: root.addComponent(GameController),
            itemPrefab: visualPrefab('DragItem', (item) => item.addComponent(DraggableItem)), targetPrefab: visualPrefab('DragTarget') });
        return root;
    }
    function cableRoot() {
        const root = node('CableConnectStage'), stage = root.addComponent(CableConnectStageController);
        stage.cablePrefab = new Prefab(() => {
            const result = node('Cable'), connector = result.addComponent(CableConnector);
            connector.anchor = node('Anchor', result); connector.head = node('Head', result); connector.head.addComponent(Sprite);
            label('CableLabel', connector.head); connector.line = node('Line', result).addComponent(Graphics); return result;
        });
        stage.portPrefab = visualPrefab('Port'); return root;
    }
    function cleanRoot() {
        const root = node('CleanSwipeStage'), stage = root.addComponent(CleanSwipeStageController);
        stage.dirtLayer = node('DirtLayer', root); stage.inputSurface = root;
        stage.dirtCellPrefab = new Prefab(() => { const cell = node('DirtCell'); cell.addComponent(Sprite); cell.addComponent(UIOpacity); return cell; });
        return root;
    }
    function stageFixture(definition) {
        const factory = definition.kind === 'drag-match' ? dragRoot : definition.kind === 'cable-connect' ? cableRoot : cleanRoot;
        const Type = definition.kind === 'drag-match' ? DragMatchStageController : definition.kind === 'cable-connect' ? CableConnectStageController : CleanSwipeStageController;
        const root = factory(), stage = root.getComponent(Type), log = events();
        mock.boot(root); stage.configure(definition, log.callbacks); stage.setInputEnabled(true);
        return { root, stage, log, definition };
    }
    const active = (nodes) => nodes.filter((entry) => entry.active);
    function finishDrag(stage) {
        active(stage.itemNodes).forEach((item) => { drop(item, item.getComponent(DraggableItem).target.worldPosition); mock.flush(item); });
    }
    function finishCable(stage) {
        active(stage.cableNodes).forEach((cable) => { const connector = cable.getComponent(CableConnector); drop(connector.head, connector.currentPort.worldPosition); mock.flush(connector.head); });
    }
    function finishClean(stage) {
        for (const cell of stage.cellNodes) { emit(stage.inputSurface || stage.node, 'TOUCH_START', cell.worldPosition); emit(stage.inputSurface || stage.node, 'TOUCH_END', cell.worldPosition); }
        mock.flush();
    }
    function finishStage(stage) {
        if (stage instanceof DragMatchStageController) finishDrag(stage);
        else if (stage instanceof CableConnectStageController) finishCable(stage);
        else finishClean(stage);
    }

    test('drag element pool grows 2→4 only by the deficit and reuses identical nodes on 4→2→4', () => {
        const f = stageFixture(definitions('drag-match', 2)), initial = f.stage.itemNodes.slice(), allocations = mock.instantiations.length;
        f.stage.configure(definitions('drag-match', 4), f.log.callbacks);
        assert.equal(mock.instantiations.length - allocations, 4); assert.equal(f.stage.pooledItemCount, 4); assert.equal(f.stage.pooledTargetCount, 4);
        assert.deepEqual(f.stage.itemNodes.slice(0, 2), initial); const all = f.stage.itemNodes.slice();
        f.stage.configure(definitions('drag-match', 2), f.log.callbacks); assert.equal(active(f.stage.itemNodes).length, 2);
        f.stage.itemNodes.slice(2).forEach((item) => assert.equal(item.listenerCount(), 0));
        f.stage.configure(definitions('drag-match', 4), f.log.callbacks); assert.deepEqual(f.stage.itemNodes, all); assert.equal(mock.instantiations.length - allocations, 4);
        assert.ok(Object.isFrozen(f.stage.itemNodes)); assert.throws(() => f.stage.itemNodes.pop(), TypeError);
    });
    test('reused drag nodes update labels, positions, targets, dimensions and progress for the new stage', () => {
        const f = stageFixture(definitions('drag-match', 4)); finishDrag(f.stage); const next = ORDER_CATALOG[1].stages[0];
        f.stage.configure(next, f.log.callbacks); f.stage.setInputEnabled(true);
        next.pairs.forEach((pair, index) => {
            const item = f.stage.itemNodes[index], target = f.stage.targetNodes[index], component = item.getComponent(DraggableItem);
            assert.equal(item.getComponentInChildren(Label).string, pair.itemLabel); assert.equal(target.getComponentInChildren(Label).string, pair.targetLabel);
            close(item.position, pair.itemStart); close(target.position, pair.targetPosition); assert.equal(component.target, target); assert.equal(component.isPlaced, false);
            assert.equal(component.snapDistance, pair.snapDistance ?? next.defaultSnapDistance); assert.equal(item.getComponent(UITransform).width, 180);
        });
        assert.deepEqual(f.stage.progress, { completed: 0, total: 3 });
    });
    for (const count of [2, 3, 4]) test(`actual drag stage completes ${count} items once only after each snap callback`, () => {
        const f = stageFixture(definitions('drag-match', count));
        active(f.stage.itemNodes).forEach((item, index) => {
            drop(item, f.stage.targetNodes[index].worldPosition); assert.equal(f.stage.progress.completed, index); assert.equal(f.log.completions, 0);
            assert.equal(latestTween(item).steps[0].duration, 0.15); mock.flush(item); assert.equal(f.stage.progress.completed, index + 1);
        });
        assert.equal(f.log.completions, 1); assert.equal(f.log.mistakes, 0); finishDrag(f.stage); assert.equal(f.log.completions, 1);
        f.stage.itemNodes.forEach((item) => assert.equal(item.listenerCount(), 0));
    });
    test('wrong drag END reports exactly once, while foreign input and CANCEL keep progress and mistakes unchanged', () => {
        const f = stageFixture(definitions('drag-match', 2)), item = f.stage.itemNodes[0], before = item.position.clone();
        drop(item, f.stage.targetNodes[1].worldPosition); emit(item, 'TOUCH_END', f.stage.targetNodes[1].worldPosition);
        assert.equal(f.log.mistakes, 1); assert.equal(latestTween(item).steps[0].duration, 0.18); mock.flush(item); close(item.position, before);
        emit(item, 'TOUCH_START', item.worldPosition, 0);
        for (const type of ['TOUCH_START', 'TOUCH_MOVE', 'TOUCH_END', 'TOUCH_CANCEL']) emit(item, type, f.stage.targetNodes[0].worldPosition, 2);
        emit(item, 'TOUCH_CANCEL', f.stage.targetNodes[0].worldPosition, 0);
        assert.equal(f.log.mistakes, 1); assert.equal(f.stage.progress.completed, 0); close(item.position, before);
    });
    test('reconfiguring drag invalidates old snap, return, progress and completion callbacks', () => {
        for (const correct of [true, false]) {
            const f = stageFixture(definitions('drag-match', 4)), item = f.stage.itemNodes[0];
            const oldProgress = f.stage.gameController.onProgressChanged, oldComplete = f.stage.gameController.onLevelComplete;
            drop(item, correct ? f.stage.targetNodes[0].worldPosition : new Vec3(0, -100)); const old = latestTween(item);
            const next = events(); f.stage.configure(definitions('drag-match', 2), next.callbacks); f.stage.setInputEnabled(true);
            assert.equal(old.stopped, true); old.flush(); old.callCallbacks(); oldProgress(); oldComplete();
            assert.deepEqual(f.stage.progress, { completed: 0, total: 2 }); assert.equal(next.completions, 0); assert.equal(next.mistakes, 0);
            close(f.stage.itemNodes[0].position, definitions('drag-match', 2).pairs[0].itemStart);
        }
    });
    test('deactivated drag clears listeners and callbacks; destruction releases pooled nodes', () => {
        const f = stageFixture(definitions('drag-match', 4)), items = f.stage.itemNodes.slice();
        f.stage.deactivateStage(); items.forEach((item) => assert.equal(item.listenerCount(), 0));
        assert.equal(f.stage.gameController.onLevelComplete, null); assert.equal(f.stage.gameController.onMistake, null);
        assert.equal(f.stage.gameController.onProgressChanged, null); f.root.destroy(); items.forEach((item) => assert.equal(mock.cc.isValid(item), false));
    });

    const firstCable = (stage) => stage.cableNodes[0].getComponent(CableConnector);
    for (const count of [2, 3, 4]) test(`actual cable stage connects ${count} designated ports once after 0.15-second snaps`, () => {
        const f = stageFixture(definitions('cable-connect', count));
        active(f.stage.cableNodes).forEach((cable, index) => {
            const connector = cable.getComponent(CableConnector); drop(connector.head, connector.currentPort.worldPosition);
            assert.equal(f.stage.progress.completed, index); assert.equal(f.log.completions, 0); assert.equal(connector.isAnimating, true);
            const tween = latestTween(connector.head); assert.equal(tween.steps[0].duration, 0.15);
            emit(connector.head, 'TOUCH_END', connector.currentPort.worldPosition); tween.flush();
            assert.equal(f.stage.progress.completed, index + 1); assert.equal(connector.isConnected, true);
            close(connector.head.worldPosition, connector.currentPort.worldPosition); tween.callCallbacks(); assert.equal(f.stage.progress.completed, index + 1);
        });
        assert.equal(f.log.completions, 1); finishCable(f.stage); assert.equal(f.log.completions, 1); assert.equal(f.log.mistakes, 0);
    });
    for (const location of ['wrong port', 'blank']) test(`cable ${location} release reports once, ignores animation input and returns in 0.18 seconds`, () => {
        const f = stageFixture(definitions('cable-connect', 3)), connector = firstCable(f.stage), head = connector.head, start = head.position.clone();
        const endpoint = location === 'wrong port' ? f.stage.portNodes[1].worldPosition : new Vec3(0, -350);
        drop(head, endpoint); const settling = latestTween(head); assert.equal(settling.steps[0].duration, 0.18);
        assert.equal(f.log.mistakes, 1); assert.equal(f.stage.progress.completed, 0); const during = head.position.clone();
        for (const type of ['TOUCH_START', 'TOUCH_MOVE', 'TOUCH_END']) emit(head, type, connector.currentPort.worldPosition);
        close(head.position, during); assert.equal(f.log.mistakes, 1); settling.flush(); close(head.position, start);
        drop(head, connector.currentPort.worldPosition); mock.flush(head); assert.equal(f.stage.progress.completed, 1);
    });
    test('cable CANCEL near or far returns immediately and foreign touch cannot steal ownership', () => {
        for (const near of [false, true]) {
            const f = stageFixture(definitions('cable-connect', 2)), connector = firstCable(f.stage), head = connector.head, start = head.position.clone();
            emit(head, 'TOUCH_START', head.worldPosition, 0);
            for (const type of ['TOUCH_START', 'TOUCH_MOVE', 'TOUCH_END', 'TOUCH_CANCEL']) {
                assert.equal(emit(head, type, connector.currentPort.worldPosition, 99).propagationStopped, false); close(head.position, start);
            }
            const point = near ? connector.currentPort.worldPosition : new Vec3(0, -300);
            emit(head, 'TOUCH_MOVE', point, 0); emit(head, 'TOUCH_CANCEL', point, 0);
            close(head.position, start); assert.equal(f.log.mistakes, 0); assert.equal(f.stage.progress.completed, 0); assert.equal(connector.isAnimating, false);
        }
    });
    test('cable head, port, anchor and line use translated rotated nonuniform parent coordinates with grab offset', () => {
        const f = stageFixture(definitions('cable-connect', 2)), connector = firstCable(f.stage), head = connector.head;
        f.root.setPosition(120, -20); f.root.angle = 13; f.root.setScale(0.9, 1.2, 1);
        connector.node.setPosition(-20, 35); connector.node.angle = 27; connector.node.setScale(1.3, 0.7, 1);
        const portParent = node('PortParent', f.root); portParent.angle = -17; portParent.setScale(0.7, 1.5, 1); portParent.setPosition(20, 40);
        connector.currentPort.parent = portParent;
        const before = head.position.clone(), offset = new Vec3(12, -7), parent = head.parent;
        const grab = mock.transform(parent.worldMatrix, new Vec3(before.x + offset.x, before.y + offset.y)); emit(head, 'TOUCH_START', grab); close(head.position, before);
        const target = parent.getComponent(UITransform).convertToNodeSpaceAR(connector.currentPort.worldPosition);
        const pointer = mock.transform(parent.worldMatrix, new Vec3(target.x + offset.x, target.y + offset.y));
        emit(head, 'TOUCH_MOVE', pointer); close(head.position, target);
        const end = connector.line.node.getComponent(UITransform).convertToNodeSpaceAR(head.worldPosition);
        assert.deepEqual(connector.line.commands.at(-1), { type: 'lineTo', x: end.x, y: end.y });
        emit(head, 'TOUCH_END', pointer); mock.flush(head); close(head.worldPosition, connector.currentPort.worldPosition);
        assert.equal(f.stage.progress.completed, 1);
    });
    test('cable inclusive snap boundary accepts radius and rejects a point just outside', () => {
        const f = stageFixture(definitions('cable-connect', 2)), connector = firstCable(f.stage), head = connector.head, port = connector.currentPort.worldPosition;
        drop(head, new Vec3(port.x + 72.001, port.y)); assert.equal(f.log.mistakes, 1); mock.flush(head);
        drop(head, new Vec3(port.x + 72, port.y)); mock.flush(head); assert.equal(f.stage.progress.completed, 1); assert.equal(f.log.mistakes, 1);
    });
    test('cable reconfigure and component disable stop old tween and stale callbacks cannot count', () => {
        for (const action of ['configure', 'disable']) {
            const f = stageFixture(definitions('cable-connect', 3)), connector = firstCable(f.stage), head = connector.head;
            drop(head, connector.currentPort.worldPosition); const old = latestTween(head);
            if (action === 'configure') f.stage.configure(definitions('cable-connect', 2), f.log.callbacks); else connector.enabled = false;
            assert.equal(old.stopped, true); old.flush(); old.callCallbacks(); assert.equal(f.stage.progress.completed, 0); assert.equal(f.log.completions, 0);
            if (action === 'disable') assert.equal(head.listenerCount(), 0);
        }
    });
    test('cable pool 2→4→2→4 preserves node identity, clears recycled listeners and updates labels and ports', () => {
        const f = stageFixture(definitions('cable-connect', 2)), start = mock.instantiations.length;
        f.stage.configure(definitions('cable-connect', 4), f.log.callbacks); const cables = f.stage.cableNodes.slice(), ports = f.stage.portNodes.slice();
        assert.equal(mock.instantiations.length - start, 4);
        f.stage.configure(definitions('cable-connect', 2), f.log.callbacks); cables.slice(2).forEach((entry) => { assert.equal(entry.active, false); assert.equal(entry.getComponent(CableConnector).head.listenerCount(), 0); });
        const definition = definitions('cable-connect', 4); f.stage.configure(definition, f.log.callbacks); f.stage.setInputEnabled(true);
        assert.deepEqual(f.stage.cableNodes, cables); assert.deepEqual(f.stage.portNodes, ports); assert.equal(mock.instantiations.length - start, 4);
        definition.cables.forEach((cable, index) => { const component = cables[index].getComponent(CableConnector);
            assert.equal(component.currentPort, ports[index]); assert.equal(component.isConnected, false); close(component.head.position, cable.cableStart);
            assert.equal(component.head.getComponentInChildren(Label).string, cable.cableLabel); assert.equal(ports[index].getComponentInChildren(Label).string, cable.portLabel);
            assert.equal(component.head.listenerCount(), 4);
        });
        finishCable(f.stage); assert.equal(f.log.completions, 1);
    });
    test('cable graphics retain the fixed anchor while every head movement refreshes endpoint and color', () => {
        const f = stageFixture(definitions('cable-connect', 3)), connector = firstCable(f.stage), start = connector.anchor.worldPosition.clone();
        emit(connector.head, 'TOUCH_START'); emit(connector.head, 'TOUCH_MOVE', new Vec3(11, 32));
        close(connector.anchor.worldPosition, start); assert.deepEqual(connector.line.commands, [{ type: 'moveTo', x: start.x, y: start.y }, { type: 'lineTo', x: 11, y: 32 }]);
        assert.deepEqual(connector.head.getComponent(Sprite).color, connector.line.strokeColor); assert.equal(connector.line.lineWidth, 8);
        emit(connector.head, 'TOUCH_CANCEL'); const end = connector.line.commands.at(-1); assert.equal(end.x, start.x); assert.equal(end.y, start.y);
    });

    const simpleClean = () => ({ ...clone(definitions('clean-swipe')), id: 'four-cells', brushRadius: 20, requiredRatio: 0.6,
        areas: [{ id: 'area', position: { x: 0, y: 0 }, size: { width: 400, height: 100 }, columns: 4, rows: 1 }] });
    test('clean TOUCH_START cleans immediately, a cell counts once and fades after exactly 0.08 seconds', () => {
        const f = stageFixture(simpleClean()), cell = f.stage.cellNodes[0], opacity = cell.getComponent(UIOpacity);
        emit(f.root, 'TOUCH_START', cell.worldPosition); assert.equal(f.stage.cleanedCells, 1); assert.equal(f.stage.progress.completed, 1);
        assert.equal(cell.active, true); assert.equal(opacity.opacity, 255); assert.equal(latestTween(opacity).steps[0].duration, 0.08);
        emit(f.root, 'TOUCH_MOVE', cell.worldPosition); emit(f.root, 'TOUCH_END'); emit(f.root, 'TOUCH_START', cell.worldPosition);
        assert.equal(f.stage.cleanedCells, 1); mock.flush(opacity); assert.equal(cell.active, false); assert.equal(opacity.opacity, 0);
    });
    test('clean fast MOVE sweeps intermediate cells along the segment and reaches only the ceil threshold', () => {
        const definition = simpleClean(); definition.requiredRatio = 1;
        const f = stageFixture(definition), cells = f.stage.cellNodes;
        emit(f.root, 'TOUCH_START', cells[0].worldPosition); emit(f.root, 'TOUCH_MOVE', cells[3].worldPosition);
        assert.equal(f.stage.cleanedCells, 4); assert.equal(f.log.completions, 1); assert.deepEqual(f.stage.progress, { completed: 4, total: 4 });
        mock.flush(); assert.equal(active(cells).length, 0);
    });
    test('clean threshold is ceil and completion locks input exactly once at requiredCells', () => {
        const f = stageFixture(simpleClean()); assert.equal(f.stage.totalCells, 4); assert.equal(f.stage.requiredCells, 3);
        for (let index = 0; index < 2; index += 1) { emit(f.root, 'TOUCH_START', f.stage.cellNodes[index].worldPosition); emit(f.root, 'TOUCH_END'); }
        assert.equal(f.log.completions, 0); assert.deepEqual(f.stage.progress, { completed: 2, total: 3 });
        emit(f.root, 'TOUCH_START', f.stage.cellNodes[2].worldPosition); assert.equal(f.log.completions, 1);
        emit(f.root, 'TOUCH_MOVE', f.stage.cellNodes[3].worldPosition); emit(f.root, 'TOUCH_END'); emit(f.root, 'TOUCH_START', f.stage.cellNodes[3].worldPosition);
        assert.equal(f.stage.cleanedCells, 3); assert.deepEqual(f.stage.progress, { completed: 3, total: 3 }); assert.equal(f.log.completions, 1);
        assert.equal(formatStageProgress('clean-swipe', f.stage.progress), '清洁进度 100%');
    });
    test('clean foreign events cannot end or steal a stroke and CANCEL keeps already cleaned cells', () => {
        const f = stageFixture(simpleClean()), cells = f.stage.cellNodes; emit(f.root, 'TOUCH_START', cells[0].worldPosition, 0);
        for (const type of ['TOUCH_START', 'TOUCH_MOVE', 'TOUCH_END', 'TOUCH_CANCEL']) emit(f.root, type, cells[1].worldPosition, 33);
        assert.equal(f.stage.cleanedCells, 1); emit(f.root, 'TOUCH_MOVE', cells[1].worldPosition, 0); assert.equal(f.stage.cleanedCells, 2);
        emit(f.root, 'TOUCH_CANCEL', cells[1].worldPosition, 0); emit(f.root, 'TOUCH_MOVE', cells[2].worldPosition, 0);
        assert.equal(f.stage.cleanedCells, 2); assert.equal(f.log.mistakes, 0); assert.equal(f.log.completions, 0);
    });
    test('empty clean strokes and CANCEL never produce mistakes or progress', () => {
        const f = stageFixture(simpleClean()); emit(f.root, 'TOUCH_START', new Vec3(-330, 300)); emit(f.root, 'TOUCH_MOVE', new Vec3(330, 300)); emit(f.root, 'TOUCH_CANCEL');
        assert.equal(f.stage.cleanedCells, 0); assert.equal(f.log.mistakes, 0); assert.equal(f.log.completions, 0); assert.equal(f.log.progress.length, 1);
    });
    test('clean converts world pointer into a separately transformed dirt layer', () => {
        const f = stageFixture(simpleClean()); f.root.setPosition(200, 40); f.root.angle = 11; f.root.setScale(1.2, 0.8, 1);
        f.stage.dirtLayer.setPosition(20, 10); f.stage.dirtLayer.angle = -23; f.stage.dirtLayer.setScale(0.7, 1.4, 1);
        emit(f.root, 'TOUCH_START', f.stage.cellNodes[0].worldPosition); assert.equal(f.stage.cleanedCells, 1); assert.equal(f.log.mistakes, 0);
    });
    test('clean reset restores every active cell and opacity and invalidates pending old fade callbacks', () => {
        const f = stageFixture(simpleClean()), oldCell = f.stage.cellNodes[0]; emit(f.root, 'TOUCH_START', oldCell.worldPosition);
        const old = latestTween(oldCell.getComponent(UIOpacity)); f.stage.resetStage(); f.stage.setInputEnabled(true);
        assert.equal(old.stopped, true); old.flush(); old.callCallbacks(); assert.equal(f.stage.cleanedCells, 0);
        f.stage.cellNodes.forEach((cell) => { assert.equal(cell.active, true); assert.equal(cell.getComponent(UIOpacity).opacity, 255); });
        emit(f.root, 'TOUCH_START', oldCell.worldPosition); assert.equal(f.stage.cleanedCells, 1); assert.equal(f.root.listenerCount(), 4);
    });
    test('clean pool grows 20→35 by fifteen and reuses all cells after shrinking and resetting', () => {
        const clean20 = ORDER_CATALOG[5].stages[0], clean35 = ORDER_CATALOG[8].stages[0], f = stageFixture(clean20), start = mock.instantiations.length;
        const first = f.stage.cellNodes.slice(); finishClean(f.stage); f.stage.configure(clean35, f.log.callbacks);
        assert.equal(mock.instantiations.length - start, 15); assert.equal(f.stage.pooledCellCount, 35); assert.deepEqual(f.stage.cellNodes.slice(0, 20), first);
        const all = f.stage.cellNodes.slice(); f.stage.configure(clean20, f.log.callbacks); assert.equal(active(f.stage.cellNodes).length, 20);
        f.stage.configure(clean35, f.log.callbacks); assert.deepEqual(f.stage.cellNodes, all); assert.equal(mock.instantiations.length - start, 15);
        assert.equal(f.stage.cleanedCells, 0); assert.equal(f.stage.requiredCells, 32); assert.equal(f.root.listenerCount(), 4);
    });
    test('clean deactivation stops owned fades and onDisable/onDestroy remove all input listeners', () => {
        const f = stageFixture(simpleClean()); emit(f.root, 'TOUCH_START', f.stage.cellNodes[0].worldPosition);
        const old = latestTween(f.stage.cellNodes[0].getComponent(UIOpacity)), saved = f.stage.cellNodes.slice();
        f.stage.enabled = false; assert.equal(old.stopped, true); assert.equal(f.root.listenerCount(), 0);
        old.callCallbacks(); assert.equal(f.log.completions, 0); f.root.destroy(); saved.forEach((cell) => assert.equal(mock.cc.isValid(cell), false));
    });

    function wireHost(parent = null) {
        const root = node('StageHost', parent), host = root.addComponent(StageHost);
        Object.assign(host, { dragMatchPrefab: new Prefab(dragRoot), cableConnectPrefab: new Prefab(cableRoot), cleanSwipePrefab: new Prefab(cleanRoot) });
        return { root, host };
    }
    function currentStage(host) {
        const current = host.node.children.find((entry) => entry.active); assert.ok(current, 'Expected active stage');
        return current.getComponent(DragMatchStageController) || current.getComponent(CableConnectStageController) || current.getComponent(CleanSwipeStageController);
    }
    test('StageHost union selects typed controllers and allocates each of three stage prefabs only once', () => {
        const f = wireHost(); mock.boot(f.root); const log = events(), roots = new Map();
        for (const kind of ['drag-match', 'cable-connect', 'clean-swipe', 'drag-match', 'clean-swipe', 'cable-connect']) {
            const definition = definitions(kind), before = f.host.currentGeneration; f.host.loadStage(definition, log.callbacks);
            assert.ok(f.host.currentGeneration > before); assert.equal(f.host.currentKind, kind); assert.equal(f.host.currentStageId, definition.id);
            const stage = currentStage(f.host); assert.ok(stage instanceof (kind === 'drag-match' ? DragMatchStageController : kind === 'cable-connect' ? CableConnectStageController : CleanSwipeStageController));
            if (roots.has(kind)) assert.equal(stage.node, roots.get(kind)); else roots.set(kind, stage.node);
            assert.equal(f.root.children.filter((entry) => entry.active).length, 1); assert.equal(f.host.cachedStageCount, roots.size);
        }
        for (const prefab of [f.host.dragMatchPrefab, f.host.cableConnectPrefab, f.host.cleanSwipePrefab]) assert.equal(mock.instantiations.filter((entry) => entry.prefab === prefab).length, 1);
    });
    test('StageHost generation rejects old progress, mistake and completion callbacks after switch', () => {
        const f = wireHost(); mock.boot(f.root); const first = events(), second = events(); f.host.loadStage(definitions('drag-match'), first.callbacks);
        const old = currentStage(f.host).callbacks; f.host.loadStage(definitions('cable-connect'), second.callbacks); const count = second.progress.length;
        old.onProgress({ completed: 3, total: 3 }); old.onMistake(); old.onComplete();
        assert.equal(first.completions, 0); assert.equal(first.mistakes, 0); assert.equal(second.progress.length, count); assert.equal(second.completions, 0); assert.equal(second.mistakes, 0);
        finishStage(currentStage(f.host)); assert.equal(second.completions, 1);
    });
    test('StageHost disable invalidates callbacks and resume preserves progress without duplicating input listeners', () => {
        const f = wireHost(); mock.boot(f.root); const log = events(); f.host.loadStage(definitions('drag-match'), log.callbacks); const stage = currentStage(f.host);
        drop(stage.itemNodes[0], stage.targetNodes[0].worldPosition); mock.flush(stage.itemNodes[0]); const old = stage.callbacks;
        f.host.enabled = false; assert.equal(f.root.children.filter((entry) => entry.active).length, 0); old.onComplete(); old.onMistake(); assert.equal(log.completions, 0); assert.equal(log.mistakes, 0);
        f.host.enabled = true; f.host.resumeStage(log.callbacks); assert.equal(stage.progress.completed, 1);
        assert.equal(stage.itemNodes[0].listenerCount(), 0); stage.itemNodes.slice(1).forEach((item) => assert.equal(item.listenerCount(), 4));
        finishStage(stage); assert.equal(log.completions, 1);
    });
    test('StageHost resetAll retains cache identities but clears progress; destroy releases all pooled elements', () => {
        const f = wireHost(); mock.boot(f.root); const log = events();
        for (const kind of ['drag-match', 'cable-connect', 'clean-swipe']) { f.host.loadStage(definitions(kind), log.callbacks); finishStage(currentStage(f.host)); }
        const cached = f.root.children.slice(), descendants = cached.flatMap((entry) => [...entry.children]);
        f.host.resetAll(); assert.equal(f.host.cachedStageCount, 3); assert.equal(f.host.currentKind, null); assert.equal(f.host.currentStageId, null);
        assert.equal(cached.filter((entry) => entry.active).length, 0);
        f.host.loadStage(definitions('drag-match'), log.callbacks); assert.equal(currentStage(f.host).progress.completed, 0);
        assert.equal(currentStage(f.host).node, cached[0]); f.host.destroy(); assert.equal(f.host.cachedStageCount, 0);
        [...cached, ...descendants].forEach((entry) => assert.equal(mock.cc.isValid(entry), false));
    });
    test('StageHost rejects missing Prefabs and wrong controller types with clear runtime errors', () => {
        const f = wireHost(); mock.boot(f.root); f.host.dragMatchPrefab = null; assert.throws(() => f.host.loadStage(definitions('drag-match'), events().callbacks), /Missing/);
        f.host.dragMatchPrefab = new Prefab(() => node('Wrong')); assert.throws(() => f.host.loadStage(definitions('drag-match'), events().callbacks), /controller/);
        assert.equal(f.host.cachedStageCount, 0);
    });

    function managerFixture(orders = ORDER_CATALOG) {
        const canvas = node('Canvas'), header = node('Header', canvas), hostFixture = wireHost(canvas);
        const run = canvas.addComponent(RunController); run.timeLabel = label('TimeLabel', header); run.mistakeLabel = label('MistakeLabel', header);
        const manager = canvas.addComponent(LevelManager); manager.orders = orders; manager.runController = run; manager.stageHost = hostFixture.host;
        for (const key of ['chapterLabel', 'levelLabel', 'levelTitleLabel', 'stageLabel', 'statusLabel']) manager[key] = label(key, header);
        manager.tutorialHint = node('TutorialHint', canvas); manager.tutorialLabel = label('TutorialLabel', manager.tutorialHint);
        manager.completePanel = node('CompletePanel', canvas); manager.completeLabel = label('CompleteLabel', manager.completePanel);
        manager.completeDetailLabel = label('CompleteDetailLabel', manager.completePanel); manager.nextButton = node('NextButton', manager.completePanel).addComponent(Button);
        manager.actionButtonLabel = label('ActionButtonLabel', manager.nextButton.node); mock.boot(canvas);
        return { canvas, manager, run, host: hostFixture.host };
    }
    const click = (f) => f.manager.nextButton.node.emit(Button.EventType.CLICK, {});
    function finishOrder(f, stageSeconds = 0) {
        const order = f.manager.currentOrderIndex;
        let completed = 0;
        while (f.manager.currentOrderIndex === order && f.manager.state === GameState.Playing) {
            assert.ok(completed < 4, 'Order must settle within three stages'); f.run.advanceTime(stageSeconds); finishStage(currentStage(f.host)); completed += 1;
        }
        return completed;
    }
    const managerState = (f) => ({ order: f.manager.currentOrderIndex, stage: f.manager.currentStageIndex, state: f.manager.state,
        elapsed: f.run.currentElapsedMs, mistakes: f.run.currentMistakes, results: f.run.levelResults, summary: f.run.summary,
        status: f.manager.statusLabel.string, panel: f.manager.completePanel.active, detail: f.manager.completeDetailLabel.string });
    test('formal LevelManager boots one-step order with complete HUD and settles through actual drag events', () => {
        const f = managerFixture(); assert.equal(f.manager.totalOrders, 9); assert.equal(f.manager.currentOrderIndex, 0); assert.equal(f.manager.totalStagesInCurrentOrder, 1);
        assert.equal(f.manager.levelLabel.string, '订单 1 / 9'); assert.equal(f.manager.stageLabel.string, '步骤 1 / 1');
        assert.equal(f.manager.chapterLabel.string, '基础订单'); assert.equal(f.manager.levelTitleLabel.string, '桌面整理');
        assert.equal(f.manager.completePanel.active, false); assert.equal(f.manager.nextButton.interactable, false); assert.equal(f.run.isLevelRunning, true);
        assert.equal(f.manager.statusLabel.string, '把设备拖到对应区域\n已归位 0 / 3'); finishOrder(f, 12.3);
        assert.equal(f.manager.state, GameState.LevelComplete); assert.equal(f.run.levelResults.length, 1); assert.equal(f.run.levelResults[0].elapsedMs, 12300);
        assert.equal(f.manager.completeDetailLabel.string, '用时：12.3 秒\n失误：0 次\n评价：★★★\n得分：880\n步骤：1 / 1');
        assert.equal(f.manager.completeLabel.string, '订单完成'); assert.equal(f.manager.actionButtonLabel.string, '下一张订单');
    });
    test('multi-step order preserves elapsed time and mistakes and creates no intermediate result', () => {
        const f = managerFixture(); f.manager.loadOrder(7); assert.equal(f.manager.totalStagesInCurrentOrder, 2);
        const first = currentStage(f.host); drop(first.itemNodes[0], first.targetNodes[1].worldPosition); mock.flush(first.itemNodes[0]);
        f.run.advanceTime(2); assert.equal(f.run.currentMistakes, 1); finishStage(first);
        assert.equal(f.manager.currentStageIndex, 1); assert.equal(f.manager.stageLabel.string, '步骤 2 / 2'); assert.equal(f.host.currentKind, 'cable-connect');
        assert.equal(f.run.levelResults.length, 0); assert.equal(f.run.currentElapsedMs, 2000); assert.equal(f.run.currentMistakes, 1); assert.equal(f.manager.completePanel.active, false);
        f.run.advanceTime(3); finishStage(currentStage(f.host)); assert.equal(f.run.levelResults.length, 1);
        assert.equal(f.run.levelResults[0].elapsedMs, 5000); assert.equal(f.run.levelResults[0].mistakes, 1); assert.equal(f.manager.state, GameState.LevelComplete);
    });
    test('stage configuration pauses the actual RunController, resumes active input, and omits the construction frame', () => {
        const f = managerFixture(), actualLoad = f.host.loadStage.bind(f.host); let observations = 0;
        f.host.loadStage = (definition, callbacks) => {
            const before = f.run.currentElapsedMs; assert.equal(f.run.isLevelRunning, false); f.run.advanceTime(50); assert.equal(f.run.currentElapsedMs, before);
            actualLoad(definition, callbacks); observations += 1;
        };
        f.manager.loadOrder(5); f.run.advanceTime(1); finishStage(currentStage(f.host));
        assert.equal(observations, 2); assert.equal(f.run.isLevelRunning, true); assert.equal(f.run.currentElapsedMs, 1000);
        f.run.update(30); assert.equal(f.run.currentElapsedMs, 1000); f.run.update(0.25); assert.equal(f.run.currentElapsedMs, 1250);
        assert.equal(currentStage(f.host).itemNodes[0].listenerCount(), 4);
    });
    test('old manager stage callbacks cannot skip steps, alter new order, or duplicate finish', () => {
        const f = managerFixture(); f.manager.loadOrder(8); const old = f.manager.installedCallbacks;
        finishStage(currentStage(f.host)); assert.equal(f.manager.currentStageIndex, 1); const snapshot = managerState(f);
        old.onComplete(); old.onComplete(); old.onMistake(); old.onProgress({ completed: 99, total: 99 }); assert.deepEqual(managerState(f), snapshot);
        const second = f.manager.installedCallbacks; finishStage(currentStage(f.host)); assert.equal(f.manager.currentStageIndex, 2);
        const third = f.manager.installedCallbacks; finishStage(currentStage(f.host)); assert.equal(f.run.levelResults.length, 1);
        const final = managerState(f); [old, second, third].forEach((callbacks) => { callbacks.onComplete(); callbacks.onMistake(); }); assert.deepEqual(managerState(f), final);
        click(f); const replay = managerState(f); third.onComplete(); third.onMistake(); old.onProgress({ completed: 100, total: 100 }); assert.deepEqual(managerState(f), replay);
    });
    test('nine-order real input run advances all thirteen stages and produces 9/9 orders and 27-star summary', () => {
        const f = managerFixture(); let totalStages = 0;
        ORDER_CATALOG.forEach((order, index) => {
            assert.equal(f.manager.currentOrderIndex, index); assert.equal(f.manager.levelLabel.string, `订单 ${index + 1} / 9`);
            for (let step = 0; step < order.stages.length; step += 1) {
                assert.equal(f.manager.currentStageIndex, step); assert.equal(f.manager.stageLabel.string, `步骤 ${step + 1} / ${order.stages.length}`);
                f.run.advanceTime(1); finishStage(currentStage(f.host)); totalStages += 1;
                if (step < order.stages.length - 1) assert.equal(f.run.levelResults.length, index);
            }
            assert.equal(f.run.levelResults.length, index + 1); assert.equal(f.manager.completePanel.active, true); assert.equal(f.manager.nextButton.interactable, true);
            assert.equal(f.manager.actionButtonLabel.string, index === 8 ? '重新挑战' : '下一张订单');
            if (index < 8) { assert.equal(f.manager.state, GameState.LevelComplete); click(f); }
        });
        assert.equal(totalStages, 13); assert.equal(f.manager.state, GameState.DemoComplete); assert.equal(f.host.cachedStageCount, 3);
        assert.deepEqual(f.run.summary, { completedOrders: 9, totalElapsedMs: 13000, totalMistakes: 0, totalScore: 8870, earnedStars: 27, maxStars: 27 });
        assert.equal(f.manager.completeDetailLabel.string, '完成订单：9 / 9\n总用时：13.0 秒\n总失误：0 次\n总评价：27 / 27 星\n总得分：8870\n完成步骤：13 / 13');
        assert.equal(f.manager.completeLabel.string, '本轮维修完成');
        const snapshot = managerState(f); f.run.advanceTime(100); f.manager.nextLevel(); assert.deepEqual(managerState(f), snapshot);
    });
    test('restart a partially completed multi-step order returns to stage zero and retains earlier results', () => {
        const f = managerFixture(); for (let index = 0; index < 5; index += 1) { finishOrder(f, 1); click(f); }
        const previous = f.run.levelResults; assert.equal(f.manager.currentOrderIndex, 5); finishStage(currentStage(f.host)); assert.equal(f.manager.currentStageIndex, 1);
        f.run.advanceTime(10); f.manager.restartCurrentLevel(); assert.equal(f.manager.currentOrderIndex, 5); assert.equal(f.manager.currentStageIndex, 0);
        assert.equal(f.host.currentKind, 'clean-swipe'); assert.equal(currentStage(f.host).cleanedCells, 0); assert.equal(f.run.currentElapsedMs, 0); assert.equal(f.run.currentMistakes, 0);
        assert.deepEqual(f.run.levelResults, previous); finishOrder(f, 2); assert.equal(f.run.levelResults.length, 6);
        f.manager.restartCurrentLevel(); assert.deepEqual(f.run.levelResults, previous); assert.equal(f.manager.currentStageIndex, 0);
        finishOrder(f, 3); assert.equal(f.run.levelResults.length, 6); assert.equal(f.run.levelResults.at(-1).elapsedMs, 6000);
    });
    test('playAgain clears every result and step, preserves cached roots and is idempotent under rapid repeat clicks', () => {
        const f = managerFixture(); for (let index = 0; index < 9; index += 1) { finishOrder(f, 1); if (index < 8) click(f); }
        const roots = f.host.node.children.slice(), allocated = mock.instantiations.length, oldPanel = latestTween(f.manager.completePanel);
        click(f); click(f); f.manager.playAgain(); assert.equal(f.manager.currentOrderIndex, 0); assert.equal(f.manager.currentStageIndex, 0);
        assert.equal(f.manager.state, GameState.Playing); assert.deepEqual(f.run.levelResults, []); assert.equal(f.run.currentElapsedMs, 0); assert.equal(f.run.currentMistakes, 0);
        assert.equal(f.run.summary.completedOrders, 0); assert.equal(f.run.summary.totalScore, 0); assert.equal(f.run.summary.earnedStars, 0);
        assert.deepEqual(f.host.node.children, roots); assert.equal(mock.instantiations.length, allocated); assert.equal(oldPanel.stopped, true);
        oldPanel.callCallbacks(); assert.equal(f.manager.completePanel.active, false); assert.equal(currentStage(f.host).progress.completed, 0);
        roots.forEach((root) => { const clean = root.getComponent(CleanSwipeStageController); if (clean) { assert.equal(clean.cleanedCells, 0); clean.cellNodes.forEach((cell) => assert.equal(cell.getComponent(UIOpacity).opacity, 255)); } });
    });
    test('invalid load indices, premature next and rapid repeated next never skip an order', () => {
        const f = managerFixture(), initial = managerState(f); f.manager.nextLevel(); click(f); f.manager.playAgain();
        for (const index of [-1, 9, 1.5, NaN, Infinity]) f.manager.loadLevel(index);
        for (const index of [-1, 1, 1.5, NaN, Infinity]) f.manager.loadStage(index);
        assert.deepEqual(managerState(f), initial); finishOrder(f); click(f); click(f); f.manager.nextLevel();
        assert.equal(f.manager.currentOrderIndex, 1); assert.equal(f.manager.currentStageIndex, 0); assert.equal(f.run.levelResults.length, 1);
    });
    test('manager lifecycle pauses time and clears input; repeated re-enable resumes one set of listeners and existing progress', () => {
        const f = managerFixture(); const stage = currentStage(f.host); drop(stage.itemNodes[0], stage.targetNodes[0].worldPosition); mock.flush(stage.itemNodes[0]);
        f.run.advanceTime(1); const old = f.manager.installedCallbacks; f.manager.enabled = false; f.manager.enabled = false;
        assert.equal(f.manager.nextButton.node.listenerCount(), 0); assert.equal(f.run.isLevelRunning, false); old.onMistake(); old.onComplete(); f.run.advanceTime(100);
        assert.equal(f.run.currentElapsedMs, 1000); assert.equal(f.run.currentMistakes, 0); assert.equal(f.run.levelResults.length, 0);
        f.manager.enabled = true; f.manager.enabled = true; assert.equal(f.manager.nextButton.node.listenerCount(), 1); assert.equal(f.run.isLevelRunning, true);
        assert.equal(currentStage(f.host), stage); assert.equal(stage.progress.completed, 1); assert.equal(stage.itemNodes[0].listenerCount(), 0);
        stage.itemNodes.slice(1).forEach((item) => assert.equal(item.listenerCount(), 4)); finishOrder(f);
        const settled = managerState(f); f.manager.enabled = false; f.manager.enabled = true; f.run.advanceTime(100); assert.deepEqual(managerState(f), settled);
        f.manager.destroy(); assert.equal(f.manager.nextButton.node.listenerCount(), 0); assert.equal(f.host.cachedStageCount, 0);
    });
    test('all three deterministic progress strings use the exact completed/required values', () => {
        assert.equal(formatStageProgress('drag-match', { completed: 1, total: 3 }), '已归位 1 / 3');
        assert.equal(formatStageProgress('cable-connect', { completed: 1, total: 3 }), '已连接 1 / 3');
        assert.equal(formatStageProgress('clean-swipe', { completed: 8, total: 17 }), '清洁进度 47%');
        assert.equal(formatStageProgress('clean-swipe', { completed: 17, total: 17 }), '清洁进度 100%');
        assert.equal(formatStageProgress('clean-swipe', { completed: 0, total: 0 }), '清洁进度 0%');
    });
    for (const [kind, orderIndex, expected] of [['drag-match', 0, '拖动物品到对应区域'], ['cable-connect', 4, '拖动线头连接到对应接口'], ['clean-swipe', 3, '按住并滑动，清除污渍']])
        test(`${kind} first-session tutorial survives mistake/CANCEL and hides only on first effective progress`, () => {
            const f = managerFixture(); if (orderIndex) f.manager.loadOrder(orderIndex);
            const stage = currentStage(f.host); assert.equal(f.manager.tutorialHint.active, true); assert.equal(f.manager.tutorialLabel.string, expected);
            if (kind === 'drag-match') {
                const item = stage.itemNodes[0]; drop(item, stage.targetNodes[1].worldPosition); mock.flush(item); assert.equal(f.manager.tutorialHint.active, true);
                emit(item, 'TOUCH_START'); emit(item, 'TOUCH_CANCEL', stage.targetNodes[0].worldPosition); assert.equal(f.manager.tutorialHint.active, true);
                drop(item, stage.targetNodes[0].worldPosition); assert.equal(f.manager.tutorialHint.active, true); mock.flush(item);
            } else if (kind === 'cable-connect') {
                const connector = firstCable(stage); drop(connector.head, stage.portNodes[1].worldPosition); mock.flush(connector.head); assert.equal(f.manager.tutorialHint.active, true);
                emit(connector.head, 'TOUCH_START'); emit(connector.head, 'TOUCH_CANCEL', connector.currentPort.worldPosition); assert.equal(f.manager.tutorialHint.active, true);
                drop(connector.head, connector.currentPort.worldPosition); assert.equal(f.manager.tutorialHint.active, true); mock.flush(connector.head);
            } else {
                emit(stage.inputSurface, 'TOUCH_START', new Vec3(330, 350)); emit(stage.inputSurface, 'TOUCH_CANCEL'); assert.equal(f.manager.tutorialHint.active, true);
                emit(stage.inputSurface, 'TOUCH_START', stage.cellNodes[0].worldPosition);
            }
            assert.equal(f.manager.tutorialHint.active, false); f.manager.restartCurrentLevel(); assert.equal(f.manager.tutorialHint.active, false);
        });
    test('every kind tutorial stays hidden on subsequent stages and replay, while a fresh Scene session shows it again', () => {
        const f = managerFixture(); for (let index = 0; index < 9; index += 1) {
            while (f.manager.state === GameState.Playing) { const kind = f.host.currentKind; if (index >= 5) assert.equal(f.manager.tutorialHint.active, false, kind); finishStage(currentStage(f.host)); }
            if (index < 8) click(f);
        }
        click(f); assert.equal(f.manager.tutorialHint.active, false); f.manager.loadOrder(3); assert.equal(f.manager.tutorialHint.active, false);
        f.manager.loadOrder(4); assert.equal(f.manager.tutorialHint.active, false);
        const fresh = managerFixture(); assert.equal(fresh.manager.tutorialHint.active, true); fresh.manager.loadOrder(3); assert.equal(fresh.manager.tutorialHint.active, true);
        fresh.manager.loadOrder(4); assert.equal(fresh.manager.tutorialHint.active, true);
    });
    test('clean callbacks cannot charge mistakes even if a stale or erroneous producer invokes them', () => {
        const f = managerFixture(); f.manager.loadOrder(3); const callbacks = f.manager.installedCallbacks;
        callbacks.onMistake(); assert.equal(f.run.currentMistakes, 0); finishOrder(f); callbacks.onMistake(); assert.equal(f.run.currentMistakes, 0);
    });

    // Quality assertions are separate from the runtime behavior-group count.
    const project = path.resolve(__dirname, '..'), scripts = [];
    function readScripts(directory) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const filename = path.join(directory, entry.name); if (entry.isDirectory()) readScripts(filename); else if (entry.name.endsWith('.ts')) scripts.push({ filename, text: fs.readFileSync(filename, 'utf8') });
    } }
    readScripts(path.join(project, 'assets', 'scripts'));
    for (const { filename, text } of scripts) {
        assert.doesNotMatch(text, /\b(?:any|Resources|EventBus|globalThis|fetch|XMLHttpRequest|WebSocket)\b|@ts-ignore|@ts-nocheck/, filename);
        if (filename.includes(`${path.sep}stages${path.sep}`)) assert.doesNotMatch(text, /from\s*['"][^'"]*LevelManager/, filename);
        if (filename.endsWith(`${path.sep}GameController.ts`)) assert.doesNotMatch(text, /from\s*['"][^'"]*LevelManager/, filename);
    }
    const config = JSON.parse(fs.readFileSync(path.join(project, 'tsconfig.json'), 'utf8'));
    for (const name of ['strict', 'noUnusedLocals', 'noUnusedParameters']) assert.equal(config.compilerOptions[name], true);
    assert.notEqual(config.compilerOptions.skipLibCheck, true);
    console.log('PASS Day 4 quality audit (not counted as runtime groups): dependency direction, no untyped bypass/global framework/network loading, strict and unused flags.');

    return groups;
}

module.exports = { runDay4Tests };
