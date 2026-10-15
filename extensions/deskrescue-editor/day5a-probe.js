'use strict';

/** Actual saved Day 5A assets; isolated fixtures never become the director's Scene. */
exports.run = function (cc) {
    const checks = [], fixtures = [], lifecycle = new Map(), cleanupErrors = [];
    const originalSystem = cc.TweenSystem.instance;
    const system = new cc.TweenSystem(), actions = system.ActionManager, types = {};
    const names = ['LevelManager', 'StageHost', 'RunController', 'GameController', 'DraggableItem', 'CableConnector',
        'DragMatchStageController', 'CableConnectStageController', 'CleanSwipeStageController',
        'HomeController', 'AudioFeedback', 'ResultStars', 'VisualAssetRegistry', 'ElementVisual', 'CleanDeviceVisual'];
    const deviceKeys = ['mouse', 'keyboard', 'headset', 'power', 'network', 'usb', 'router', 'controller', 'speaker',
        'battery', 'wheel', 'microphone', 'camera', 'light', 'soundcard', 'fan', 'memory', 'drive', 'gpu'];
    const audioFields = ['uiClickClip', 'successClip', 'mistakeClip', 'cleanCompleteClip', 'stageCompleteClip', 'orderCompleteClip', 'runCompleteClip'];
    const cableShapes = { 'computer-cables': { power: 'power', display: 'display', network: 'network' },
        'router-cables': { power: 'power', wan: 'network', lan: 'network' },
        'streaming-cables': { microphone: 'audio', camera: 'usb' },
        'case-cables': { motherboard: 'motherboard', cpu: 'cpu', sata: 'sata', fan: 'fan' } };
    const cleanKeys = { 'keyboard-clean': 'workbench/keyboard-clean', 'shell-clean': 'workbench/mouse-clean', 'case-clean': 'workbench/case-clean' };
    let source, homeSource, registry, before;
    const result = {
        ok: false, timestamp: new Date().toISOString(), engineVersion: cc.ENGINE_VERSION || cc.VERSION || 'unknown',
        mode: 'actual registered components and saved Prefabs, off-scene active fixtures, isolated real Cocos ActionManager with manual delta time',
        input: 'synthetic real cc.Touch and cc.EventTouch emitted to fixture nodes; Button clicks emitted to real fixture nodes',
        lifecycle: 'real node activator marks only off-scene fixtures active; explicit component lifecycle because Editor suppresses game lifecycle',
        audio: 'actual AudioSource and seven saved AudioClip references; silent fixture tests for locked/muted behavior and synthetic ENDED event binding only',
        limitations: ['Not Preview natural-clock playback, rendering, clipping or UI hit testing',
            'Not browser native touch adapters, native TOUCH_CANCEL, physical touch, mobile WebView or mini-game platforms',
            'No audible playback or natural AudioSource ENDED is claimed; browser sound and listening require separate Preview checks'],
        checks,
    };
    function assert(value, message) { if (!value) throw new Error(message); }
    function close(a, b, name) { assert(Number.isFinite(a) && Math.abs(a - b) < 0.001, `${name}: ${a} != ${b}`); }
    function walk(node, fn) { fn(node); node.children.slice().forEach(child => walk(child, fn)); }
    function snapshot() {
        const entries = [];
        walk(cc.director.getScene(), n => entries.push([n.uuid, n.parent?.uuid, n.active,
            [n.position.x, n.position.y, n.position.z], [n.scale.x, n.scale.y, n.scale.z],
            n.getComponent(cc.Label)?.string, n.getComponent(cc.Sprite)?.spriteFrame?._uuid]));
        return JSON.stringify(entries);
    }
    function ui(parent, name, width = 720, height = 800) {
        const node = new cc.Node(`__Day5AProbe_${name}`); node.layer = cc.Layers.Enum.UI_2D;
        node.addComponent(cc.UITransform).setContentSize(width, height);
        if (parent) parent.addChild(node); return node;
    }
    function sync(f) {
        if (f.cleaned) return;
        function visit(node, parentActive) {
            const active = parentActive && node.active;
            for (const name of ['DraggableItem', 'CableConnector', 'CleanSwipeStageController', 'ElementVisual']) {
                const component = node.getComponent(types[name]); if (!component) continue;
                const old = lifecycle.get(component) || { loaded: false, active: false };
                if (!old.loaded) { component.onLoad?.(); old.loaded = true; }
                const enabled = active && component.enabled;
                if (old.active !== enabled) { if (enabled) component.onEnable?.(); else component.onDisable?.(); old.active = enabled; }
                lifecycle.set(component, old);
            }
            node.children.slice().forEach(child => visit(child, active));
        }
        visit(f.root, true);
    }
    function tick(seconds) { fixtures.forEach(sync); actions.update(0); actions.update(seconds); fixtures.forEach(sync); }
    function fixture(started = false) {
        const root = ui(null, 'Root'), manager = root.addComponent(types.LevelManager), run = root.addComponent(types.RunController);
        const host = ui(root, 'Host').addComponent(types.StageHost);
        for (const field of ['dragMatchPrefab', 'cableConnectPrefab', 'cleanSwipePrefab']) host[field] = source.stageHost[field];
        host.visualAssets = registry; host.slicePreview = false;
        const label = name => ui(root, name).addComponent(cc.Label);
        run.timeLabel = label('Time'); run.mistakeLabel = label('Mistakes');
        const panel = ui(root, 'CompletePanel'); panel.active = false;
        const stars = panel.addComponent(types.ResultStars);
        stars.earnedFrame = source.resultStars.earnedFrame; stars.emptyFrame = source.resultStars.emptyFrame;
        stars.starSprites = [0, 1, 2].map(i => ui(panel, `Star${i}`, 84, 84).addComponent(cc.Sprite));
        const audio = root.addComponent(types.AudioFeedback); audio.audioSource = root.addComponent(cc.AudioSource);
        audio.audioSource.playOnAwake = false; audio.audioSource.loop = false;
        audioFields.forEach(field => { audio[field] = source.audioFeedback[field]; });
        // No sound is played by this Editor fixture. Preview verifies browser playback separately.
        audio.setSoundEnabled(false);
        Object.assign(manager, { orders: source.orders, autoStartOnSceneLoad: false, audioFeedback: audio, resultStars: stars,
            runController: run, stageHost: host, chapterLabel: label('Chapter'), levelLabel: label('Order'),
            levelTitleLabel: label('Title'), stageLabel: label('Stage'), statusLabel: label('Status'),
            tutorialHint: ui(root, 'Tutorial'), tutorialLabel: label('TutorialText'), completePanel: panel,
            completeLabel: label('Complete'), completeDetailLabel: label('Detail'),
            nextButton: ui(panel, 'Next').addComponent(cc.Button), actionButtonLabel: label('Action') });
        const overlay = ui(root, 'Home'), home = root.addComponent(types.HomeController);
        Object.assign(home, { levelManager: manager, overlay, startButton: ui(overlay, 'Start').addComponent(cc.Button),
            soundButton: ui(root, 'Sound').addComponent(cc.Button), soundStateLabel: label('SoundState'),
            soundIcon: ui(root, 'SoundIcon').addComponent(cc.Sprite), soundOnFrame: homeSource.soundOnFrame,
            soundOffFrame: homeSource.soundOffFrame, audioFeedback: audio });
        const f = { root, manager, run, host, stars, audio, home, cleaned: false }; fixtures.push(f);
        assert(cc.director._nodeActivator?.activateNode, 'Real node activator unavailable');
        cc.director._nodeActivator.activateNode(root, true);
        assert(root.activeInHierarchy && home.enabledInHierarchy, 'Fixture must be active without entering the formal Scene');
        manager.onEnable(); manager.start(); audio.onEnable(); home.onEnable(); home.start();
        if (started) { assert(manager.startFirstOrder(), 'First order did not start'); home.onEnable(); }
        sync(f); return f;
    }
    function definitions(kind) { return source.orders.flatMap(order => order.stages).filter(stage => stage.kind === kind); }
    function current(f) {
        const name = f.host.currentKind === 'drag-match' ? 'DragMatchStageController'
            : f.host.currentKind === 'cable-connect' ? 'CableConnectStageController' : 'CleanSwipeStageController';
        const node = f.host.node.children.find(n => n.active && n.getComponent(types[name]));
        assert(node, `Missing active ${name}`); return node.getComponent(types[name]);
    }
    function records() { const r = { completed: 0, mistakes: 0 }; r.callbacks = { onProgress() {}, onMistake() { r.mistakes++; }, onComplete() { r.completed++; } }; return r; }
    function load(f, definition, r = records()) { f.host.loadStage(definition, r.callbacks); sync(f); return current(f); }
    function emit(node, name, point, id = 0) {
        fixtures.forEach(sync);
        const viewport = cc.view.getViewportRect();
        const touch = new cc.Touch(point.x * cc.view.getScaleX() + viewport.x, point.y * cc.view.getScaleY() + viewport.y, id);
        const type = cc.Node.EventType[name], event = new cc.EventTouch([touch], false, type, [touch]);
        event.touch = touch; event.simulate = true;
        close(event.getUILocation().x, point.x, 'real Touch UI x'); close(event.getUILocation().y, point.y, 'real Touch UI y');
        node.emit(type, event); fixtures.forEach(sync);
    }
    function drop(node, target, id = 0) { emit(node, 'TOUCH_START', node.worldPosition, id); emit(node, 'TOUCH_END', target.worldPosition, id); }
    function clean(stage, cell) { const surface = stage.inputSurface || stage.node; emit(surface, 'TOUCH_START', cell.worldPosition); emit(surface, 'TOUCH_END', cell.worldPosition); }
    function solve(f) {
        const kind = f.host.currentKind, stage = current(f);
        if (kind === 'drag-match') for (const node of stage.itemNodes.filter(n => n.active)) {
            const drag = node.getComponent(types.DraggableItem); if (!drag.isPlaced) { drop(node, drag.target); tick(0.16); }
        }
        else if (kind === 'cable-connect') for (const node of stage.cableNodes.filter(n => n.active)) {
            const cable = node.getComponent(types.CableConnector); if (!cable.isConnected) { drop(cable.head, cable.currentPort); tick(0.16); }
        }
        else for (const cell of stage.cellNodes.filter(n => n.active)) {
            if (stage.progress.completed >= stage.progress.total) break; clean(stage, cell); tick(0.09);
        }
        return kind;
    }
    function cleanup(f) {
        if (f.cleaned) return;
        f.home.onDestroy(); f.audio.onDestroy(); f.manager.onDestroy(); f.stars.onDestroy();
        walk(f.root, node => names.forEach(name => {
            const c = node.getComponent(types[name]);
            if (c && ![f.home, f.audio, f.manager, f.stars].includes(c)) c.onDestroy?.();
            if (c) lifecycle.delete(c);
        }));
        cc.director._nodeActivator.activateNode(f.root, false); f.root.destroy(); f.cleaned = true;
    }
    function check(name, action) {
        const start = fixtures.length;
        try { checks.push({ name, status: 'PASS', evidence: action() }); }
        catch (error) { checks.push({ name, status: 'FAIL', error: error instanceof Error ? error.stack : String(error) }); }
        finally {
            fixtures.slice(start).forEach(f => { try { cleanup(f); } catch (error) { cleanupErrors.push({ check: name, error: String(error) }); } });
            actions.removeAllActions();
        }
    }
    try {
        names.forEach(name => { types[name] = cc.js.getClassByName(name); assert(types[name], `Unregistered real class ${name}`); });
        source = cc.director.getScene().getComponentInChildren(types.LevelManager);
        homeSource = cc.director.getScene().getComponentInChildren(types.HomeController);
        registry = source?.stageHost?.visualAssets;
        assert(source && homeSource && registry && source.audioFeedback && source.resultStars, 'Open saved Day 5A Scene and bind all components');
        before = snapshot(); cc.TweenSystem.instance = system;
        assert(cc.TweenSystem.instance === system, 'Cannot isolate TweenSystem');

        check('formal saved Scene keeps home waiting, complete inspector references and final visual mode', () => {
            assert(source.autoStartOnSceneLoad === false && source.stageHost.slicePreview === false, 'Formal scene must wait for home with final artwork');
            assert(homeSource.levelManager === source && homeSource.audioFeedback === source.audioFeedback, 'Home manager/audio reference mismatch');
            assert(homeSource.overlay.active && homeSource.startButton instanceof cc.Button && homeSource.soundButton instanceof cc.Button, 'Home references missing');
            assert(source.audioFeedback.audioSource instanceof cc.AudioSource && source.resultStars.starSprites.length === 3, 'Audio/stars references missing');
            return { autoStartOnSceneLoad: false, slicePreview: false, overlayActive: true, managerUuid: source.node.uuid };
        });
        check('registry binds all 49 actual SpriteFrames with 19 distinct device assets', () => {
            registry.validateBindings(); assert(registry.keys.length === 49, `Expected 49 artwork bindings, got ${registry.keys.length}`);
            registry.frames.forEach(frame => assert(frame instanceof cc.SpriteFrame && frame._uuid && frame.originalSize.width > 0, 'Invalid imported SpriteFrame'));
            const ids = deviceKeys.map(key => registry.requireFrame(`devices/${key}`)._uuid);
            assert(new Set(ids).size === 19, 'Device artwork aliases a generic placeholder');
            return { boundFrames: registry.keys.length, distinctDevices: 19, deviceUuids: ids };
        });
        check('actual AudioSource binds seven distinct saved AudioClips and has no autoplay or loop', () => {
            const audio = source.audioFeedback, ids = audioFields.map(field => {
                assert(audio[field] instanceof cc.AudioClip && audio[field]._uuid, `Missing actual AudioClip ${field}`); return audio[field]._uuid;
            });
            assert(new Set(ids).size === 7 && audio.audioSource.playOnAwake === false && audio.audioSource.loop === false, 'Invalid audio bindings/options');
            return { clipUuids: Object.fromEntries(audioFields.map((field, i) => [field, ids[i]])), playOnAwake: false, loop: false };
        });
        check('home waiting survives start and update with zero time, results and Stage cache', () => {
            const f = fixture(); f.manager.start(); f.run.update(8); f.run.advanceTime(12);
            assert(!f.manager.hasStarted && !f.run.isLevelRunning && f.run.currentElapsedMs === 0 && f.host.cachedStageCount === 0, 'Home began gameplay/timing');
            assert(f.home.overlay.active && f.home.startButton.interactable && !f.audio.isUnlocked, 'Waiting home state mismatch');
            return { elapsedMs: 0, cachedStages: 0, results: f.run.levelResults.length, audioUnlocked: false };
        });
        check('real start Button rapid clicks enter order 1 once and preserve its generation', () => {
            const f = fixture(); f.home.startButton.node.emit(cc.Button.EventType.CLICK); sync(f);
            const generation = f.host.currentGeneration;
            for (let i = 0; i < 5; i++) f.home.startButton.node.emit(cc.Button.EventType.CLICK);
            assert(f.manager.hasStarted && f.manager.currentOrderIndex === 0 && f.manager.currentStageIndex === 0, 'First order incorrect');
            assert(f.host.currentGeneration === generation && f.host.cachedStageCount === 1 && !f.home.overlay.active, 'Rapid clicks restarted order');
            assert(!f.manager.startFirstOrder() && !f.home.startRepair() && f.audio.isUnlocked, 'Start must be idempotent and unlock gesture');
            return { emittedClicks: 6, startedOrders: 1, generation, cachedStages: 1, unlocked: true };
        });
        check('Home disable, enable and destroy own exactly one real Button listener', () => {
            const f = fixture(); const click = () => f.home.soundButton.node.emit(cc.Button.EventType.CLICK);
            f.home.onEnable(); f.home.onEnable(); click(); assert(f.audio.isSoundEnabled, 'Repeated enable added duplicate toggle listeners');
            f.home.onDisable(); click(); assert(f.audio.isSoundEnabled, 'Disabled listener remained');
            f.home.onEnable(); click(); assert(!f.audio.isSoundEnabled, 'Re-enabled Button must toggle once');
            f.home.onDestroy(); click(); assert(!f.audio.isSoundEnabled, 'Destroyed listener remained');
            assert(!f.home.startButton.node.hasEventListener(cc.Button.EventType.CLICK), 'Start listener remained after destroy');
            return { repeatedEnableToggleCount: 1, disabledToggleCount: 0, restoredToggleCount: 1, destroyDetached: true };
        });
        check('sound toggle on home changes icon/label without entering an order or unlocking audio', () => {
            const f = fixture(); f.home.soundButton.node.emit(cc.Button.EventType.CLICK);
            assert(f.audio.isSoundEnabled && f.home.soundStateLabel.string === '音效：开' && f.home.soundIcon.spriteFrame === homeSource.soundOnFrame, 'Enabled UI mismatch');
            f.home.soundButton.node.emit(cc.Button.EventType.CLICK);
            assert(!f.audio.isSoundEnabled && f.home.soundStateLabel.string === '音效：关' && f.home.soundIcon.spriteFrame === homeSource.soundOffFrame, 'Disabled UI mismatch');
            assert(!f.audio.isUnlocked && !f.manager.hasStarted && f.host.cachedStageCount === 0, 'Home toggle started playback/game');
            return { toggles: 2, started: false, unlocked: false, cachedStages: 0 };
        });
        check('AudioFeedback real ENDED event attaches once, detaches on disable/destroy and stays silent', () => {
            const f = fixture(); f.audio.onDisable(); let ended = 0;
            const original = f.audio.onEnded;
            // Observe delivery on this fixture only; call the real handler while muted/locked.
            f.audio.onEnded = function () { ended++; return original.call(this); };
            f.audio.onEnable(); f.audio.onEnable(); f.audio.audioSource.node.emit(cc.AudioSource.EventType.ENDED);
            assert(ended === 1, 'ENDED attached multiple times');
            assert(!f.audio.play('success', 'locked') && f.audio.queuedSoundCount === 0, 'Muted/locked play admitted');
            f.audio.onDisable(); f.audio.audioSource.node.emit(cc.AudioSource.EventType.ENDED); assert(ended === 1, 'ENDED survived disable');
            f.audio.onEnable(); f.audio.audioSource.node.emit(cc.AudioSource.EventType.ENDED); assert(ended === 2, 'ENDED did not restore exactly once');
            f.audio.onDestroy(); f.audio.audioSource.node.emit(cc.AudioSource.EventType.ENDED); assert(ended === 2, 'ENDED survived destroy');
            return { syntheticEndedDeliveries: 2, duplicateEnableDeliveries: 1, detachedDeliveries: 0, audiblePlaybackTested: false };
        });
        check('three real Stage Prefabs and five element Prefabs instantiate with typed visual references', () => {
            const f = fixture(), ids = {};
            for (const [kind, field, elements] of [['drag-match', 'dragMatchPrefab', ['itemPrefab', 'targetPrefab']],
                ['cable-connect', 'cableConnectPrefab', ['cablePrefab', 'portPrefab']], ['clean-swipe', 'cleanSwipePrefab', ['dirtCellPrefab']]]) {
                assert(f.host[field] instanceof cc.Prefab, `Missing ${field}`); ids[field] = f.host[field]._uuid;
                const stage = load(f, definitions(kind)[0]);
                elements.forEach(key => { assert(stage[key] instanceof cc.Prefab, `Invalid ${key}`); ids[key] = stage[key]._uuid; });
                if (kind === 'clean-swipe') assert(stage.deviceVisual instanceof types.CleanDeviceVisual && stage.deviceVisual.device instanceof cc.Sprite, 'Clean inspector missing');
            }
            assert(Object.keys(ids).length === 8 && f.host.cachedStageCount === 3, 'Prefab/cache count mismatch');
            return { prefabUuids: ids, cachedStages: 3 };
        });
        check('all six drag configurations bind 19 recognizable item frames and matching muted targets', () => {
            const f = fixture(), keys = new Set(), evidence = [];
            for (const definition of definitions('drag-match')) {
                const stage = load(f, definition); const width = definition.pairs.length === 4 ? 140 : 180;
                definition.pairs.forEach((pair, index) => {
                    const item = stage.itemNodes[index], target = stage.targetNodes[index];
                    const iv = item.getComponent(types.ElementVisual), tv = target.getComponent(types.ElementVisual), key = `devices/${pair.id}`;
                    assert(iv.visualKey === key && tv.visualKey === key && iv.icon.spriteFrame === registry.requireFrame(key) && tv.icon.spriteFrame === iv.icon.spriteFrame, `Wrong drag frame ${key}`);
                    assert(tv.icon.color.a < iv.icon.color.a && iv.caption.string === pair.itemLabel, 'Target silhouette/caption mismatch');
                    close(item.getComponent(cc.UITransform).width, width, 'Preserved hitbox width');
                    close(item.position.x, pair.itemStart.x, 'configured input origin'); keys.add(key);
                });
                evidence.push({ stage: definition.id, count: definition.pairs.length });
            }
            assert(keys.size === 19, 'Not all 19 devices covered'); return { configurations: evidence, deviceKeys: [...keys] };
        });
        check('drag pooled nodes change artwork and stop old success decoration on reconfigure', () => {
            const f = fixture(), list = definitions('drag-match'), stage = load(f, list[0]), node = stage.itemNodes[0];
            const visual = node.getComponent(types.ElementVisual); drop(node, node.getComponent(types.DraggableItem).target); tick(0.16);
            assert(visual.isComplete && visual.checkMarker.active, 'Success decoration missing');
            const fresh = load(f, list.find(d => d.id === 'streaming-devices')); tick(0.5);
            assert(fresh.itemNodes[0] === node && visual.visualKey === 'devices/microphone', 'Pool identity/frame mismatch');
            assert(!visual.isComplete && !visual.checkMarker.active && fresh.progress.completed === 0, 'Old success decoration survived');
            close(visual.checkMarker.scale.x, 1, 'Reset marker scale');
            return { reusedNode: node.uuid, newKey: visual.visualKey, markerActive: false, completed: 0 };
        });
        check('all four cable configurations bind shaped head/port frames and reset pooled completion markers', () => {
            const f = fixture(), evidence = []; let first;
            for (const definition of definitions('cable-connect')) {
                const stage = load(f, definition);
                if (first) assert(first === stage.cableNodes[0], 'Cable pool identity changed'); first = stage.cableNodes[0];
                definition.cables.forEach((cable, i) => {
                    const c = stage.cableNodes[i].getComponent(types.CableConnector), hv = c.head.getComponent(types.ElementVisual), pv = stage.portNodes[i].getComponent(types.ElementVisual);
                    const shape = cableShapes[definition.id][cable.id];
                    for (const [visual, role] of [[hv, 'head'], [pv, 'port']]) {
                        const key = `ports/${shape}-${role}`;
                        assert(visual?.visualKey === key && visual.icon.spriteFrame === registry.requireFrame(key), `Wrong cable ${key}`);
                        assert(!visual.isComplete && !visual.checkMarker.active && visual.caption.string.length, 'Cable visual did not reset/label');
                    }
                });
                evidence.push({ stage: definition.id, cables: definition.cables.length });
            }
            return { configurations: evidence, reusedCableUuid: first.uuid };
        });
        check('cable synthetic wrong drop returns once and correct snap displays green completion once', () => {
            const f = fixture(), r = records(), stage = load(f, definitions('cable-connect')[0], r);
            const cable = stage.cableNodes[0].getComponent(types.CableConnector), origin = cable.head.position.clone(), anchor = cable.anchor.position.clone();
            drop(cable.head, stage.portNodes[1]); emit(cable.head, 'TOUCH_END', stage.portNodes[1].worldPosition); tick(0.19);
            assert(r.mistakes === 1 && stage.progress.completed === 0, 'Wrong drop metric mismatch'); close(cable.head.position.x, origin.x, 'return x');
            drop(cable.head, cable.currentPort); tick(0.16); emit(cable.head, 'TOUCH_END', cable.currentPort.worldPosition);
            assert(cable.isConnected && stage.progress.completed === 1, 'Correct cable repeated/lost completion');
            assert(cable.head.getComponent(types.ElementVisual).isComplete && cable.currentPort.getComponent(types.ElementVisual).isComplete, 'Completion markers missing');
            close(cable.anchor.position.x, anchor.x, 'fixed anchor');
            return { mistakes: 1, completedConnections: 1, headMarker: true, portMarker: true, input: 'synthetic real EventTouch' };
        });
        check('all three clean areas bind matching device positions/sizes below restored dirt cells', () => {
            const f = fixture(), evidence = [];
            for (const definition of definitions('clean-swipe')) {
                const stage = load(f, definition), area = definition.areas[0], device = stage.deviceVisual.device;
                assert(device.spriteFrame === registry.requireFrame(cleanKeys[definition.id]), 'Wrong clean device frame');
                close(device.node.position.x, area.position.x, 'clean x'); close(device.node.position.y, area.position.y, 'clean y');
                close(device.node.getComponent(cc.UITransform).width, area.size.width + 32, 'clean width');
                close(device.node.getComponent(cc.UITransform).height, area.size.height + 32, 'clean height');
                assert(device.node.parent === stage.dirtLayer.parent && device.node.getSiblingIndex() < stage.dirtLayer.getSiblingIndex(), 'Clean device must be below DirtLayer');
                const active = stage.cellNodes.filter(n => n.active); assert(active.length === area.columns * area.rows, 'Dirt count mismatch');
                active.forEach(n => { assert(n.getComponent(cc.Sprite)?.spriteFrame instanceof cc.SpriteFrame, 'Dirt texture missing'); close(n.getComponent(cc.UIOpacity).opacity, 255, 'restored dirt'); });
                evidence.push({ stage: definition.id, frame: device.spriteFrame._uuid, dirt: active.length, required: stage.requiredCells });
            }
            return evidence;
        });
        check('real clean fade interpolates then reconfigure restores reused dirt and switches device artwork', () => {
            const f = fixture(), list = definitions('clean-swipe'), stage = load(f, list[0]), cell = stage.cellNodes[0];
            clean(stage, cell); tick(0.04); const opacity = cell.getComponent(cc.UIOpacity).opacity;
            assert(opacity > 0 && opacity < 255, 'Clean fade not interpolating');
            const fresh = load(f, list[1]); tick(0.5);
            assert(fresh.cellNodes[0] === cell && cell.active && fresh.cleanedCells === 0, 'Reused dirt state incorrect');
            close(cell.getComponent(cc.UIOpacity).opacity, 255, 'old fade stopped');
            assert(fresh.deviceVisual.device.spriteFrame === registry.requireFrame(cleanKeys[list[1].id]), 'New clean artwork missing');
            return { midpointOpacity: opacity, fadeSeconds: 0.08, reusedCell: cell.uuid, restoredOpacity: 255, cleanCount: 0 };
        });
        check('ResultStars uses real frames and .24 second tween; reset and stopEffects prevent late mutation', () => {
            const f = fixture(), stars = f.stars; f.manager.completePanel.active = true;
            stars.show(2); tick(0.07); const midpoint = stars.starSprites[0].node.scale.x;
            assert(midpoint > 0.82 && midpoint < 1.08 && stars.displayedStars === 2, 'Stars do not interpolate');
            assert(stars.starSprites[0].spriteFrame === stars.earnedFrame && stars.starSprites[2].spriteFrame === stars.emptyFrame, 'Rating frames incorrect');
            stars.reset(); tick(0.5);
            stars.starSprites.forEach(sprite => { assert(sprite.spriteFrame === stars.emptyFrame, 'Reset frame incorrect'); close(sprite.node.scale.x, 1, 'reset star scale'); });
            stars.show(3); tick(0.05); stars.stopEffects(); tick(0.5);
            assert(stars.displayedStars === 3, 'stopEffects erased earned rating'); stars.starSprites.forEach(sprite => close(sprite.node.scale.x, 1, 'stopped star scale'));
            return { midpointScale: midpoint, animationSeconds: 0.24, resetDisplayed: 0, stoppedRetainedRating: 3 };
        });
        check('late Stage callbacks and old decorative tweens cannot mutate new artwork/generation', () => {
            const f = fixture(), old = records(), stage = load(f, definitions('drag-match')[0], old);
            const node = stage.itemNodes[0], callbacks = stage.callbacks, visual = node.getComponent(types.ElementVisual);
            drop(node, node.getComponent(types.DraggableItem).target); tick(0.16);
            const oldGeneration = f.host.currentGeneration, fresh = records(), next = load(f, definitions('drag-match')[2], fresh);
            callbacks.onProgress({ completed: 3, total: 3 }); callbacks.onMistake(); callbacks.onComplete(); tick(0.6);
            assert(f.host.currentGeneration > oldGeneration && next.progress.completed === 0 && fresh.completed === 0 && old.completed === 0 && old.mistakes === 0, 'Old callbacks escaped generation');
            assert(visual.visualKey === 'devices/router' && !visual.isComplete && !visual.checkMarker.active, 'Old tween altered new artwork');
            return { previousGeneration: oldGeneration, currentGeneration: f.host.currentGeneration, newKey: visual.visualKey, staleCallbackCompletions: 0 };
        });
        check('actual skinned nine orders/thirteen stages preserve continuous time, 27 stars, cache and replay reset', () => {
            const f = fixture(true), sequence = [];
            for (let oi = 0; oi < source.orders.length; oi++) {
                assert(f.manager.currentOrderIndex === oi, 'Wrong order sequence');
                for (let si = 0; si < source.orders[oi].stages.length; si++) {
                    assert(f.manager.currentStageIndex === si, 'Wrong stage sequence'); f.run.advanceTime(1.25);
                    const kind = solve(f); close(f.run.currentElapsedMs, (si + 1) * 1250, 'continuous stage time');
                    sequence.push({ order: oi + 1, stage: si + 1, kind, elapsedMs: f.run.currentElapsedMs });
                }
                assert(f.run.levelResults.length === oi + 1 && f.stars.displayedStars === 3, 'Order result/stars missing');
                if (oi + 1 < source.orders.length) { f.manager.nextButton.node.emit(cc.Button.EventType.CLICK); sync(f); }
            }
            assert(sequence.length === 13 && f.run.summary.completedOrders === 9 && f.run.summary.earnedStars === 27, 'Nine order summary wrong');
            const summary = f.manager.completeDetailLabel.string, cache = f.host.cachedStageCount;
            assert(cache === 3 && summary.includes('完成步骤：13 / 13'), 'Summary/cache missing');
            f.manager.nextButton.node.emit(cc.Button.EventType.CLICK); f.manager.nextButton.node.emit(cc.Button.EventType.CLICK); sync(f); tick(0.5);
            assert(f.manager.currentOrderIndex === 0 && f.run.levelResults.length === 0 && f.run.currentElapsedMs === 0 && f.run.currentMistakes === 0, 'Replay metrics wrong');
            assert(f.host.cachedStageCount === cache && f.stars.displayedStars === 0 && !f.home.overlay.active, 'Replay cache/home/stars wrong');
            current(f).itemNodes.filter(n => n.active).forEach(n => { const v = n.getComponent(types.ElementVisual); assert(!v.isComplete && !v.checkMarker.active, 'Replay decoration remained'); });
            return { sequence, summary, replay: { order: 1, results: 0, elapsedMs: 0, stars: 0, retainedStageRoots: cache, homeVisible: false } };
        });
        result.ok = checks.length === 18 && checks.every(check => check.status === 'PASS');
    } catch (error) { result.error = error instanceof Error ? error.stack : String(error); }
    finally {
        fixtures.forEach(f => { try { cleanup(f); } catch (error) { cleanupErrors.push({ check: 'final cleanup', error: String(error) }); } });
        actions.removeAllActions(); cc.TweenSystem.instance = originalSystem;
        result.cleanup = { originalTweenSystemRestored: cc.TweenSystem.instance === originalSystem,
            offSceneFixtures: fixtures.length, fixtureRootsScheduledForDestroy: fixtures.filter(f => f.cleaned).length,
            formalSceneUnchanged: before != null && before === snapshot(), errors: cleanupErrors };
        if (!result.cleanup.originalTweenSystemRestored || !result.cleanup.formalSceneUnchanged || cleanupErrors.length) result.ok = false;
    }
    result.passedChecks = checks.filter(check => check.status === 'PASS').length;
    result.failedChecks = checks.filter(check => check.status === 'FAIL').length;
    result.counts = { checks: checks.length, passed: result.passedChecks, failed: result.failedChecks,
        catalogOrders: source?.orders.length || 0, catalogStages: source ? source.orders.reduce((n, o) => n + o.stages.length, 0) : 0 };
    return result;
};
