'use strict';

/**
 * Editor-only probe: real cc events, transforms, components and tween interpolation.
 * Editor mode suppresses normal game lifecycle/tween ticks. Off-scene fixtures therefore
 * activate their own lifecycle hooks explicitly and use an isolated real ActionManager.
 * TweenSystem.instance is restored synchronously in finally; the open scene is untouched.
 */
exports.run = function (cc) {
    const checks = [];
    const roots = [];
    const touchedNodes = [];
    const cleanupHooks = [];
    const originalSystem = cc.TweenSystem.instance;
    const isolatedSystem = new cc.TweenSystem();
    const isolatedManager = isolatedSystem.ActionManager;
    const result = {
        ok: false,
        timestamp: new Date().toISOString(),
        engineVersion: cc.ENGINE_VERSION || cc.VERSION || 'unknown',
        mode: 'isolated real Cocos ActionManager with manual delta-time advancement',
        input: 'synthetic cc.Touch and cc.EventTouch emitted to isolated fixture nodes',
        lifecycle: 'explicit onLoad/onEnable/onDisable/onDestroy on off-scene fixture components',
        limitations: ['Not Preview natural-clock playback', 'Not browser UI hit testing', 'Not physical touchscreen input', 'Does not verify visual rendering'],
        checks,
    };
    function assert(condition, message) {
        if (!condition) throw new Error(message);
    }
    function close(actual, expected, message) {
        assert(Math.abs(actual - expected) < 0.0001, `${message}: ${actual} != ${expected}`);
    }
    function vector(value) {
        return { x: value.x, y: value.y, z: value.z };
    }
    function samePosition(node, point, message) {
        for (const axis of ['x', 'y', 'z']) close(node.position[axis], point[axis], `${message}.${axis}`);
    }
    function check(name, action) {
        try {
            checks.push({ name, status: 'PASS', evidence: action() });
        } catch (error) {
            checks.push({ name, status: 'FAIL', error: error instanceof Error ? error.message : String(error) });
        } finally {
            // Only isolated fixture actions live here; never clear the editor's manager.
            for (const cleanup of cleanupHooks.splice(0)) cleanup();
            isolatedManager.removeAllActions();
        }
    }
    function ui(parent, name, x = 0, y = 0) {
        const node = new cc.Node(`__DeskRescueProbe_${name}`);
        node.layer = cc.Layers.Enum.UI_2D;
        node.setPosition(x, y, 0);
        node.addComponent(cc.UITransform).setContentSize(180, 140);
        if (parent) node.parent = parent;
        touchedNodes.push(node);
        return node;
    }
    function component(node, name) {
        const type = cc.js.getClassByName(name);
        assert(type, `${name} is not registered in the real editor engine`);
        return node.addComponent(type);
    }
    function activateDrag(drag) {
        drag.onDisable();
        drag.onLoad();
        drag.onEnable();
        cleanupHooks.push(() => drag.onDestroy());
    }
    function fixture() {
        const root = ui(null, 'Root', 140, 80);
        roots.push(root);
        const controller = component(root, 'GameController');
        controller.beginLevel(3);
        let mistakes = 0;
        controller.onMistake = () => { mistakes += 1; };
        const item = ui(root, 'Item', -100, -100);
        const target = ui(root, 'Target', 100, 100);
        const drag = component(item, 'DraggableItem');
        drag.configure(target, controller, 72);
        activateDrag(drag);
        return { root, item, target, drag, controller, start: item.position.clone(), mistakes: () => mistakes };
    }
    function emit(item, name, world, id = 0) {
        const viewport = cc.view.getViewportRect();
        const rawX = world.x * cc.view.getScaleX() + viewport.x;
        const rawY = world.y * cc.view.getScaleY() + viewport.y;
        const touch = new cc.Touch(rawX, rawY, id);
        const type = cc.Node.EventType[name];
        const event = new cc.EventTouch([touch], false, type, [touch]);
        event.touch = touch;
        event.simulate = true;
        const point = event.getUILocation();
        close(point.x, world.x, 'actual Touch UI conversion x');
        close(point.y, world.y, 'actual Touch UI conversion y');
        item.emit(type, event);
        return event;
    }
    function advance(seconds) {
        // The first action tick primes the real Cocos interval at time zero.
        isolatedManager.update(0);
        isolatedManager.update(seconds);
    }
    function actions(node) {
        return isolatedManager.getNumberOfRunningActionsInTarget(node);
    }
    function offsetWorld(f, x, y) {
        return new cc.Vec3(f.target.worldPosition.x + x, f.target.worldPosition.y + y, f.target.worldPosition.z);
    }
    function begin(f, id = 0) {
        emit(f.item, 'TOUCH_START', f.item.worldPosition, id);
    }
    try {
        // The game tween API routes start/stop to this static instance. Replace only
        // inside this entirely synchronous test call; never advance the original system.
        cc.TweenSystem.instance = isolatedSystem;
        assert(cc.TweenSystem.instance === isolatedSystem, 'TweenSystem.instance cannot be isolated in this Creator version');

        check('pickup uses real .10 s interpolation and restores baseline on cancel', () => {
            const f = fixture();
            begin(f);
            assert(f.drag.isAnimating && actions(f.item) === 1, 'one pickup tween must start');
            advance(0.05);
            const intermediateScale = f.item.scale.x;
            assert(intermediateScale > 1 && intermediateScale < 1.06, 'pickup scale must interpolate');
            advance(0.05);
            close(f.item.scale.x, 1.06, 'pickup final scale');
            assert(!f.drag.isAnimating, 'pickup completion callback must release its tween handle');
            emit(f.item, 'TOUCH_CANCEL', f.item.worldPosition);
            close(f.item.scale.x, 1, 'cancel baseline scale');
            samePosition(f.item, f.start, 'cancel start position');
            assert(f.controller.completedItems === 0 && f.mistakes() === 0, 'cancel cannot count or record a mistake');
            return { durationSeconds: 0.1, intermediateScale, finalPickupScale: 1.06, canceledScale: f.item.scale.x };
        });

        check('correct .15 s snap interpolates, blocks duplicate input, and counts exactly once after completion', () => {
            const f = fixture();
            begin(f);
            advance(0.1);
            const release = offsetWorld(f, -40, 0);
            emit(f.item, 'TOUCH_END', release);
            const releasedPosition = f.item.position.clone();
            assert(f.controller.completedItems === 0 && !f.drag.isPlaced, 'snap must not count before animation');
            emit(f.item, 'TOUCH_START', f.item.worldPosition, 9);
            emit(f.item, 'TOUCH_MOVE', offsetWorld(f, 200, 200), 9);
            emit(f.item, 'TOUCH_END', release, 0);
            assert(actions(f.item) === 1, 'input must not create duplicate snap tweens');
            advance(0.075);
            const intermediatePosition = vector(f.item.position);
            assert(f.item.position.x > releasedPosition.x && f.item.position.x < f.target.position.x, 'snap position must interpolate');
            assert(f.controller.completedItems === 0, 'midpoint cannot count');
            advance(0.08);
            samePosition(f.item, f.target.position, 'snap destination');
            close(f.item.scale.x, 1, 'snap baseline scale');
            assert(f.drag.isPlaced && f.controller.completedItems === 1, 'one completed placement required');
            emit(f.item, 'TOUCH_START', f.item.worldPosition);
            emit(f.item, 'TOUCH_END', release);
            advance(0.3);
            assert(f.controller.completedItems === 1 && f.mistakes() === 0, 'locked item cannot count again');
            return { nominalDurationSeconds: 0.15, releasedPosition: vector(releasedPosition), intermediatePosition, finalPosition: vector(f.item.position), finalCount: 1 };
        });

        check('wrong .18 s return interpolates and records one release mistake despite rapid repeated input', () => {
            const f = fixture();
            begin(f);
            const wrong = offsetWorld(f, 200, 0);
            emit(f.item, 'TOUCH_END', wrong);
            const releasedPosition = f.item.position.clone();
            assert(f.mistakes() === 1 && f.controller.completedItems === 0, 'wrong release must record one mistake only');
            emit(f.item, 'TOUCH_START', f.item.worldPosition, 7);
            emit(f.item, 'TOUCH_END', wrong, 7);
            emit(f.item, 'TOUCH_END', wrong, 0);
            advance(0.09);
            const intermediatePosition = vector(f.item.position);
            assert(f.item.position.x < releasedPosition.x && f.item.position.x > f.start.x, 'wrong return must interpolate');
            advance(0.1);
            samePosition(f.item, f.start, 'return destination');
            assert(!f.drag.isPlaced && !f.drag.isAnimating && f.mistakes() === 1, 'return must unlock without another mistake');
            begin(f, 2);
            assert(actions(f.item) === 1, 'item must accept a new drag after return');
            emit(f.item, 'TOUCH_CANCEL', f.item.worldPosition, 2);
            return { nominalDurationSeconds: 0.18, releasedPosition: vector(releasedPosition), intermediatePosition, finalPosition: vector(f.item.position), mistakes: 1, placed: false };
        });

        check('touch ID zero keeps ownership; foreign start/move/end/cancel cannot affect the drag', () => {
            const f = fixture();
            begin(f, 0);
            for (const name of ['TOUCH_START', 'TOUCH_MOVE', 'TOUCH_END', 'TOUCH_CANCEL']) {
                const event = emit(f.item, name, f.target.worldPosition, 99);
                assert(!event.propagationStopped, `foreign ${name} must remain unconsumed`);
                samePosition(f.item, f.start, 'foreign input leaves item in place');
            }
            emit(f.item, 'TOUCH_END', f.target.worldPosition, 0);
            advance(0.16);
            assert(f.controller.completedItems === 1 && f.mistakes() === 0, 'owner must still complete normally');
            return { ownerTouchId: 0, foreignTouchId: 99, foreignEventsChecked: 4, count: 1, mistakes: 0 };
        });

        check('near and far TOUCH_CANCEL both return immediately without count or mistake', () => {
            const evidence = [];
            for (const near of [false, true]) {
                const f = fixture();
                begin(f);
                const pointer = near ? f.target.worldPosition : offsetWorld(f, 300, 100);
                emit(f.item, 'TOUCH_MOVE', pointer);
                emit(f.item, 'TOUCH_CANCEL', pointer);
                samePosition(f.item, f.start, 'cancel immediate rollback');
                close(f.item.scale.x, 1, 'cancel baseline');
                assert(actions(f.item) === 0 && f.controller.completedItems === 0 && f.mistakes() === 0, 'cancel must clean tween with no metrics');
                advance(0.3);
                evidence.push({ nearTarget: near, count: f.controller.completedItems, mistakes: f.mistakes(), remainingTweens: actions(f.item) });
            }
            return evidence;
        });

        check('configure stops in-flight pickup/snap, keeps fresh position, and prevents old counts or enlarged baseline', () => {
            const evidence = [];
            for (const phase of ['pickup', 'snap']) {
                const f = fixture();
                begin(f);
                if (phase === 'snap') emit(f.item, 'TOUCH_END', offsetWorld(f, -40, 0));
                advance(0.05);
                const newTarget = ui(f.root, 'NewTarget', 160, 80);
                const newStart = new cc.Vec3(-60, -130, 0);
                f.item.setPosition(newStart);
                f.drag.configure(newTarget, f.controller, 32);
                advance(0.4);
                samePosition(f.item, newStart, 'new start preserved');
                close(f.item.scale.x, 1, 'configure restores baseline scale');
                assert(actions(f.item) === 0 && !f.drag.isPlaced && !f.drag.isAnimating && f.controller.completedItems === 0, 'old animation must be canceled');
                assert(f.drag.target === newTarget && f.drag.snapDistance === 32, 'new configuration must apply');
                begin(f);
                emit(f.item, 'TOUCH_END', newTarget.worldPosition);
                advance(0.16);
                assert(f.controller.completedItems === 1, 'reconfigured item must be playable');
                evidence.push({ phase, newStart: vector(newStart), newSnapDistance: 32, finalCount: 1 });
            }
            return evidence;
        });

        check('disable during snap stops real tween, restores start, clears listeners, and remains playable after enable', () => {
            const f = fixture();
            begin(f);
            emit(f.item, 'TOUCH_END', offsetWorld(f, -40, 0));
            advance(0.05);
            f.drag.enabled = false;
            f.drag.onDisable();
            advance(0.4);
            samePosition(f.item, f.start, 'disabled rollback');
            assert(actions(f.item) === 0 && f.controller.completedItems === 0, 'disabled snap cannot count');
            emit(f.item, 'TOUCH_START', f.item.worldPosition);
            assert(actions(f.item) === 0, 'disabled listeners must be removed');
            f.drag.enabled = true;
            f.drag.onEnable();
            begin(f);
            emit(f.item, 'TOUCH_END', f.target.worldPosition);
            advance(0.16);
            assert(f.controller.completedItems === 1, 're-enabled item can complete once');
            return { stoppedTweens: true, countWhileDisabled: 0, countAfterReenable: 1 };
        });

        check('real UITransform conversion supports differently rotated/scaled item and target parents', () => {
            const f = fixture();
            const targetParent = ui(f.root, 'TargetParent', 30, 80);
            targetParent.angle = -25;
            targetParent.setScale(0.75, 1.4, 1);
            f.root.angle = 17;
            f.root.setScale(1.3, 0.8, 1);
            f.target.parent = targetParent;
            begin(f);
            emit(f.item, 'TOUCH_END', f.target.worldPosition);
            advance(0.16);
            const world = f.item.worldPosition;
            close(world.x, f.target.worldPosition.x, 'world snap x');
            close(world.y, f.target.worldPosition.y, 'world snap y');
            assert(f.controller.completedItems === 1, 'transformed drop must count');
            return { itemWorldPosition: vector(world), targetWorldPosition: vector(f.target.worldPosition), count: 1 };
        });

        check('real LevelManager panel tween reaches .8 → 1.08 → 1.0 and activates correct completion controls', () => {
            const root = ui(null, 'LevelFixture');
            roots.push(root);
            const labels = () => ui(root, 'Label').addComponent(cc.Label);
            const controller = component(root, 'GameController');
            controller.statusLabel = labels();
            const run = component(root, 'RunController');
            run.timeLabel = labels();
            run.mistakeLabel = labels();
            const targets = [0, 1, 2].map((index) => ui(root, `Target${index}`, index * 200, 100));
            const items = [0, 1, 2].map((index) => {
                const item = component(ui(root, `Item${index}`, index * 200, -100), 'DraggableItem');
                item.configure(targets[index], controller, 72);
                activateDrag(item);
                return item;
            });
            const manager = component(root, 'LevelManager');
            const panel = ui(root, 'CompletePanel');
            panel.active = false;
            const button = ui(panel, 'Button').addComponent(cc.Button);
            Object.assign(manager, {
                gameController: controller, runController: run,
                levelLabel: labels(), levelTitleLabel: labels(), items,
                itemLabels: [labels(), labels(), labels()], targets,
                targetLabels: [labels(), labels(), labels()], completePanel: panel,
                completeLabel: labels(), completeDetailLabel: labels(), nextButton: button,
                actionButtonLabel: labels(), tutorialHint: ui(root, 'Tutorial'),
            });
            cleanupHooks.push(() => manager.onDestroy());
            manager.loadLevel(0);
            // Direct placement notifications isolate the LevelManager completion/panel contract.
            controller.onItemPlaced(); controller.onItemPlaced(); controller.onItemPlaced();
            assert(panel.active && button.node.active && button.interactable, 'completion panel/button must be available');
            close(panel.scale.x, 0.8, 'panel starts small');
            advance(0.07);
            const firstIntermediate = panel.scale.x;
            assert(firstIntermediate > 0.8 && firstIntermediate < 1.08, 'panel rise must interpolate');
            advance(0.07);
            close(panel.scale.x, 1.08, 'panel overshoot');
            advance(0.05);
            const secondIntermediate = panel.scale.x;
            assert(secondIntermediate > 1 && secondIntermediate < 1.08, 'panel settle must interpolate');
            advance(0.06);
            close(panel.scale.x, 1, 'panel final scale');
            assert(manager.completeLabel.string === '订单完成' && manager.actionButtonLabel.string === '下一张订单', 'completion labels must match');
            return { riseSeconds: 0.14, settleSeconds: 0.1, firstIntermediate, overshoot: 1.08, secondIntermediate, finalScale: panel.scale.x, levelResults: run.levelResults.length };
        });
        result.ok = checks.every((entry) => entry.status === 'PASS');
    } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
    } finally {
        try {
            for (const cleanup of cleanupHooks.splice(0)) cleanup();
            isolatedManager.removeAllActions();
            for (const root of roots) root.destroy();
        } finally {
            cc.TweenSystem.instance = originalSystem;
            result.cleanup = {
                originalTweenSystemRestored: cc.TweenSystem.instance === originalSystem,
                offSceneFixtureRoots: roots.length,
                fixtureNodesScheduledForDestroy: touchedNodes.length,
                formalSceneModified: false,
            };
        }
    }
    result.passedChecks = checks.filter((entry) => entry.status === 'PASS').length;
    result.failedChecks = checks.filter((entry) => entry.status === 'FAIL').length;
    return result;
};
