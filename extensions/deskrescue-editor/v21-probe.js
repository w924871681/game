'use strict';

/** V2.1 independently re-executes all original 36 fixture contracts and current new visuals. */
exports.run = function (cc) {
    const checks = [], fixtures = [], lifecycle = new Map(), cleanupErrors = [];
    const originalSystem = cc.TweenSystem.instance;
    const system = new cc.TweenSystem(), actions = system.ActionManager, types = {};
    const names = ['LevelManager', 'StageHost', 'RunController', 'GameController', 'DraggableItem', 'CableConnector',
        'DragMatchStageController', 'CableConnectStageController', 'CleanSwipeStageController',
        'HomeController', 'AudioFeedback', 'ResultStars', 'VisualAssetRegistry', 'ElementVisual', 'CleanDeviceVisual',
        'PaperOrderHUD', 'V2ResultView', 'ButtonPressFeedback', 'WorkshopDecoration', 'V2CableLine', 'V2DirtAppearance', 'V21CleanDustView'];
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
        mode: 'newly executed V21 registered components/current saved Prefabs; all original 36 contracts plus new path-local dust/refined cable/stagger fixtures, isolated real Cocos ActionManager with manual delta time',
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
        const node = new cc.Node(`__V21Probe_${name}`); node.layer = cc.Layers.Enum.UI_2D;
        node.addComponent(cc.UITransform).setContentSize(width, height);
        if (parent) parent.addChild(node); return node;
    }
    function sync(f) {
        if (f.cleaned) return;
        function visit(node, parentActive) {
            const active = parentActive && node.active;
            for (const name of ['DraggableItem', 'CableConnector', 'CleanSwipeStageController', 'ElementVisual', 'ButtonPressFeedback', 'WorkshopDecoration', 'V2ResultView', 'V2CableLine', 'V2DirtAppearance', 'V21CleanDustView', 'BlockInputEvents']) {
                const component = node.getComponent(name === 'BlockInputEvents' ? cc.BlockInputEvents : types[name]); if (!component) continue;
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
    function tick(seconds) {
        fixtures.forEach(sync); actions.update(0); actions.update(seconds); fixtures.forEach(sync);
        fixtures.filter(f => !f.cleaned).forEach(f => walk(f.root, node => {
            if (!node.activeInHierarchy) return;
            for (const name of ['PaperOrderHUD', 'V2CableLine', 'V2DirtAppearance']) {
                const component = node.getComponent(types[name]); if (component?.enabled) component.lateUpdate?.(seconds);
            }
        }));
    }
    function fixture(started = false) {
        const root = ui(null, 'Root', 720, 1280), manager = root.addComponent(types.LevelManager), run = root.addComponent(types.RunController);
        const host = ui(root, 'Host').addComponent(types.StageHost);
        for (const field of ['dragMatchPrefab', 'cableConnectPrefab', 'cleanSwipePrefab']) host[field] = source.stageHost[field];
        host.visualAssets = registry; host.slicePreview = false;
        const label = name => ui(root, name).addComponent(cc.Label);
        run.timeLabel = label('Time'); run.mistakeLabel = label('Mistakes');
        const panel = ui(root, 'CompletePanel'); panel.active = false;
        const resultView = panel.addComponent(types.V2ResultView);
        const orderGroup = ui(panel, 'OrderGroup'), finalGroup = ui(panel, 'FinalGroup');
        orderGroup.active = false; finalGroup.active = false;
        const starContainer = ui(orderGroup, 'Stars'), stars = starContainer.addComponent(types.ResultStars);
        stars.earnedFrame = source.resultStars.earnedFrame; stars.emptyFrame = source.resultStars.emptyFrame; stars.staggerSeconds = source.resultStars.staggerSeconds;
        stars.starSprites = [0, 1, 2].map(i => ui(starContainer, `Star${i}`, 84, 84).addComponent(cc.Sprite));
        const shade = ui(root, 'Shade', 720, 1280); shade.addComponent(cc.BlockInputEvents); shade.active = false;
        const localLabel = (parent, name) => ui(parent, name).addComponent(cc.Label);
        Object.assign(resultView, { orderGroup, finalGroup, starContainer, modalShade: shade,
            orderBadgeLabel: localLabel(orderGroup, 'Badge'), scoreLabel: localLabel(orderGroup, 'Score'),
            timeLabel: localLabel(orderGroup, 'Time'), mistakeLabel: localLabel(orderGroup, 'Mistakes'), stepsLabel: localLabel(orderGroup, 'Steps'),
            summaryOrdersLabel: localLabel(finalGroup, 'Orders'), summaryStarsLabel: localLabel(finalGroup, 'Stars'), summaryScoreLabel: localLabel(finalGroup, 'Score'),
            summaryStepsLabel: localLabel(finalGroup, 'Steps'), summaryTimeLabel: localLabel(finalGroup, 'Time'), summaryMistakesLabel: localLabel(finalGroup, 'Mistakes') });
        resultView.orderButtonY = source.resultView.orderButtonY; resultView.finalButtonY = source.resultView.finalButtonY;
        const hud = ui(root, 'Hud').addComponent(types.PaperOrderHUD);
        Object.assign(hud, { chapterLabel: label('HudChapter'), orderLabel: label('HudOrder'), titleLabel: label('HudTitle'),
            stepLabel: label('HudStep'), instructionLabel: label('HudInstruction'), progressLabel: label('HudProgress'), cleanPercentLabel: label('CleanPercent'),
            dragGroup: ui(hud.node, 'Drag'), cableGroup: ui(hud.node, 'Cable'), cleanGroup: ui(hud.node, 'Clean') });
        hud.cleanTrack = ui(hud.cleanGroup, 'Track', 400, 24).getComponent(cc.UITransform);
        hud.cleanFill = ui(hud.cleanGroup, 'Fill', 400, 24).getComponent(cc.UITransform); hud.cleanFill.setAnchorPoint(0, 0.5);
        const audio = root.addComponent(types.AudioFeedback); audio.audioSource = root.addComponent(cc.AudioSource);
        audio.audioSource.playOnAwake = false; audio.audioSource.loop = false;
        audioFields.forEach(field => { audio[field] = source.audioFeedback[field]; });
        // No sound is played by this Editor fixture. Preview verifies browser playback separately.
        audio.setSoundEnabled(false);
        Object.assign(manager, { orders: source.orders, autoStartOnSceneLoad: false, audioFeedback: audio, resultStars: stars, hudView: hud, resultView,
            runController: run, stageHost: host, chapterLabel: label('Chapter'), levelLabel: label('Order'),
            levelTitleLabel: label('Title'), stageLabel: label('Stage'), statusLabel: label('Status'),
            tutorialHint: ui(root, 'Tutorial'), tutorialLabel: label('TutorialText'), completePanel: panel,
            completeLabel: label('Complete'), completeDetailLabel: label('Detail'),
            nextButton: ui(panel, 'Next').addComponent(cc.Button), actionButtonLabel: label('Action') });
        resultView.primaryButtonRoot = manager.nextButton.node;
        const overlay = ui(root, 'Home'), home = root.addComponent(types.HomeController);
        Object.assign(home, { levelManager: manager, overlay, startButton: ui(overlay, 'Start').addComponent(cc.Button),
            soundButton: ui(root, 'Sound').addComponent(cc.Button), soundStateLabel: label('SoundState'),
            soundIcon: ui(root, 'SoundIcon').addComponent(cc.Sprite), soundOnFrame: homeSource.soundOnFrame,
            soundOffFrame: homeSource.soundOffFrame, audioFeedback: audio, homeButton: ui(finalGroup, 'Home').addComponent(cc.Button) });
        const presses = [home.startButton, home.soundButton, home.homeButton, manager.nextButton].map(button => {
            const feedback = button.node.addComponent(types.ButtonPressFeedback);
            feedback.button = button; feedback.visualRoot = ui(button.node, 'Visual', 160, 80); return feedback;
        });
        const homeDecoration = overlay.addComponent(types.WorkshopDecoration); homeDecoration.visualRoot = ui(overlay, 'Hero');
        const f = { root, manager, run, host, stars, audio, home, hud, resultView, shade, presses, homeDecoration, cleaned: false }; fixtures.push(f);
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
        node.emit(type, event); fixtures.forEach(sync); return event;
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
    function finishRun(f) {
        if (!f.manager.hasStarted) { assert(f.manager.startFirstOrder(), 'Fixture start failed'); f.home.onEnable(); sync(f); }
        const sequence = [];
        for (let i = f.manager.currentOrderIndex; i < f.manager.orders.length; i++) {
            for (let j = 0; j < f.manager.orders[i].stages.length; j++) sequence.push({ order: i + 1, stage: j + 1, kind: solve(f) });
            if (i + 1 < f.manager.orders.length) { f.manager.nextButton.node.emit(cc.Button.EventType.CLICK); sync(f); }
        }
        return sequence;
    }
    function cleanup(f) {
        if (f.cleaned) return;
        f.home.onDestroy(); f.audio.onDestroy(); f.manager.onDestroy(); f.stars.onDestroy(); f.resultView.onDestroy();
        walk(f.root, node => names.forEach(name => {
            const c = node.getComponent(types[name]);
            if (c && ![f.home, f.audio, f.manager, f.stars, f.resultView].includes(c)) c.onDestroy?.();
            if (c) lifecycle.delete(c);
        }));
        walk(f.root, node => { const block = node.getComponent(cc.BlockInputEvents); if (block) { block.onDisable(); lifecycle.delete(block); } });
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
        assert(source && homeSource && registry && source.audioFeedback && source.resultStars && source.hudView && source.resultView, 'Open saved V2 Scene and bind current HUD/result components');
        before = snapshot(); cc.TweenSystem.instance = system;
        assert(cc.TweenSystem.instance === system, 'Cannot isolate TweenSystem');

        check('formal saved Scene keeps home waiting, complete inspector references and final visual mode', () => {
            assert(source.autoStartOnSceneLoad === false && source.stageHost.slicePreview === false, 'Formal scene must wait for home with final artwork');
            assert(homeSource.levelManager === source && homeSource.audioFeedback === source.audioFeedback, 'Home manager/audio reference mismatch');
            assert(homeSource.overlay.active && homeSource.startButton instanceof cc.Button && homeSource.soundButton instanceof cc.Button, 'Home references missing');
            assert(source.audioFeedback.audioSource instanceof cc.AudioSource && source.resultStars.starSprites.length === 3, 'Audio/stars references missing');
            return { autoStartOnSceneLoad: false, slicePreview: false, overlayActive: true, managerUuid: source.node.uuid };
        });
        check('current registry retains all original artwork and 19 distinct device assets', () => {
            registry.validateBindings(); assert(registry.keys.length >= 49, `Expected original 49 artwork bindings, got ${registry.keys.length}`);
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
            const f = fixture(), stars = f.stars; f.manager.completePanel.active = true; f.resultView.orderGroup.active = true;
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
        check('V2 PaperOrderHUD derives order/step labels from supplied catalog dimensions', () => {
            const f = fixture(), order = source.orders.find(o => o.stages.length > 1);
            f.hud.showStage(order, 4, 17, 1);
            assert(f.hud.orderLabel.string === '订单 5 / 17' && f.hud.stepLabel.string === `步骤 2 / ${order.stages.length}`, 'HUD hardcodes catalog dimensions');
            assert(f.hud.titleLabel.string === order.title && f.hud.instructionLabel.string === order.stages[1].instruction, 'Task truth differs from actual order');
            assert(!f.manager.hasStarted && f.run.currentElapsedMs === 0, 'A pure HUD call started gameplay');
            return { order: f.hud.orderLabel.string, step: f.hud.stepLabel.string, title: f.hud.titleLabel.string, elapsedMs: 0 };
        });
        check('V2 HUD kind groups are exclusive and clean has one 57/96/100 percent display', () => {
            const f = fixture(), evidence = [];
            for (const kind of ['drag-match', 'cable-connect', 'clean-swipe']) {
                const order = source.orders.find(o => o.stages.some(stage => stage.kind === kind)), index = order.stages.findIndex(stage => stage.kind === kind);
                f.hud.showStage(order, 0, source.orders.length, index);
                const groups = [f.hud.dragGroup, f.hud.cableGroup, f.hud.cleanGroup];
                assert(groups.filter(n => n.active).length === 1, 'HUD exposes multiple kind indicators');
                evidence.push({ kind, active: groups.find(n => n.active).name });
            }
            const percents = [];
            for (const count of [16, 27, 28]) {
                f.hud.showProgress({ completed: count, total: 28 });
                const percent = Math.floor(count / 28 * 100); percents.push(f.hud.cleanPercentLabel.string);
                assert(f.hud.cleanPercentLabel.string === `清洁进度 ${percent}%` && !f.hud.progressLabel.node.active && f.hud.progressLabel.string === '', 'Duplicate/stale cleaning count');
                close(f.hud.cleanFill.width, f.hud.cleanTrack.width * count / 28, 'Clean progress fill');
            }
            f.hud.cleanTrack.setContentSize(320, 24); f.hud.refreshLayout(); close(f.hud.cleanFill.width, 320, 'resized track');
            return { kinds: evidence, percents, resizedFullWidth: 320 };
        });
        check('V2 actual keyboard input uses 32 internal cells, reaches 57 and 96 percent, completes at 28 once', () => {
            const f = fixture(), r = records(), definition = definitions('clean-swipe').find(d => d.id === 'keyboard-clean');
            const order = source.orders.find(o => o.stages.includes(definition)); f.hud.showStage(order, 0, source.orders.length, order.stages.indexOf(definition));
            r.callbacks.onProgress = progress => f.hud.showProgress(progress);
            const stage = load(f, definition, r), snapshots = [];
            assert(stage.totalCells === 32 && stage.requiredCells === 28, 'Keyboard clean rules changed');
            for (let i = 0; i < 28; i++) {
                clean(stage, stage.cellNodes[i]); tick(0.09);
                if ([16, 27, 28].includes(i + 1)) snapshots.push({ cleaned: stage.cleanedCells, progress: f.hud.cleanPercentLabel.string, completions: r.completed });
                assert(stage.cleanedCells === i + 1, 'Synthetic cell-center swipe changed the logical grid');
                assert(r.completed === (i === 27 ? 1 : 0), 'Cleaning completes early or repeatedly');
            }
            clean(stage, stage.cellNodes[31]);
            assert(stage.cleanedCells === 28 && r.completed === 1 && r.mistakes === 0, 'Completed clean still accepts input');
            assert(snapshots[0].progress === '清洁进度 57%' && snapshots[1].progress === '清洁进度 96%' && snapshots[2].progress === '清洁进度 100%', 'Displayed denominator is not 28');
            return { totalLogicalCells: 32, required: 28, unvisitedLogicalCells: 4, snapshots,
                pixelLimitation: 'No assertion that 28/32 physically visits or visibly clears all 32 cells; irregular dust appearance requires Preview.' };
        });
        check('V2 result example uses actual RunController formula: 28.7 seconds plus one mistake is 620 and two stars', () => {
            const f = fixture(), order = source.orders.find(o => o.stages.some(stage => stage.id === 'keyboard-clean'));
            // A controlled RunController fixture, not a claim that clean input charges a mistake.
            f.run.beginLevel(order.id, order.scoreRule); f.run.advanceTime(28.7); f.run.recordMistake();
            const frozen = f.run.finishLevel(); assert(frozen && Object.isFrozen(frozen) && frozen.score === 620 && frozen.stars === 2, 'Reference arithmetic changed');
            f.resultView.showOrder(frozen, 4, order.stages.length);
            assert(f.resultView.scoreLabel.string === '620' && f.resultView.timeLabel.string === '28.7 秒' && f.resultView.mistakeLabel.string === '1 次', 'Result view contradicts actual frozen result');
            assert(frozen.score === 620 && f.run.levelResults.length === 1, 'Presentation mutated business result');
            return { frozen, displayedScore: f.resultView.scoreLabel.string, displayedTime: f.resultView.timeLabel.string, source: 'controlled actual RunController fixture' };
        });
        check('V2 actual order completion activates only order group, true stars, dynamic values and modal shade', () => {
            const f = fixture(true); f.run.advanceTime(1.25); solve(f); sync(f);
            const frozen = f.run.levelResults[0];
            assert(frozen && f.resultView.orderGroup.active && !f.resultView.finalGroup.active && f.resultView.starContainer.active, 'Order and final groups are not exclusive');
            assert(f.resultView.orderBadgeLabel.string === '完成订单 1' && f.resultView.scoreLabel.string === String(frozen.score), 'Order result is not dynamic');
            assert(f.stars.displayedStars === frozen.stars && f.shade.active && !f.home.homeButton.node.activeInHierarchy, 'Single result exposes wrong controls/stars');
            assert(f.manager.nextButton.interactable && f.manager.completePanel.active, 'Next is blocked by decoration');
            return { result: frozen, orderVisible: true, finalVisible: false, shadeVisible: true, homeButtonAvailable: false };
        });
        check('V2 final display derives all six values and star maximum from the supplied summary/catalog', () => {
            const f = fixture(), summary = { completedOrders: 4, totalElapsedMs: 12345, totalMistakes: 6, totalScore: 2468, earnedStars: 7, maxStars: 12 };
            f.resultView.showRun(summary, 17, 8, 31);
            const expected = { summaryOrdersLabel: '4 / 17', summaryStarsLabel: '7 / 51', summaryScoreLabel: '2468',
                summaryStepsLabel: '8 / 31', summaryTimeLabel: '12.3 秒', summaryMistakesLabel: '6 次' };
            Object.entries(expected).forEach(([field, text]) => assert(f.resultView[field].string === text, `Dynamic ${field} mismatch`));
            assert(!f.resultView.orderGroup.active && f.resultView.finalGroup.active && !f.resultView.starContainer.active && f.shade.active, 'Final incorrectly shows three per-order stars');
            return { labels: expected, orderVisible: false, finalVisible: true, ordinaryStarsVisible: false };
        });
        check('V2 real BlockInputEvents stays full screen while the separate result card animates', () => {
            const f = fixture(true); solve(f); sync(f);
            assert(f.shade.parent === f.root && f.manager.completePanel.parent === f.root && f.shade !== f.manager.completePanel, 'Modal shares card transform');
            const initial = f.shade.getComponent(cc.UITransform).getBoundingBoxToWorld();
            assert(initial.width === 720 && initial.height === 1280, 'Fixture shade does not cover logical viewport');
            const block = f.shade.getComponent(cc.BlockInputEvents); assert(block && block.enabled, 'No actual blocking component');
            const event = emit(f.shade, 'TOUCH_START', f.shade.worldPosition); assert(event.propagationStopped, 'Actual BlockInputEvents did not stop synthetic touch propagation');
            tick(0.07); const midpoint = f.manager.completePanel.scale.x;
            const after = f.shade.getComponent(cc.UITransform).getBoundingBoxToWorld();
            close(after.width, initial.width, 'Modal width during card tween'); close(after.height, initial.height, 'Modal height during card tween'); close(f.shade.scale.x, 1, 'Modal scale');
            assert(midpoint > 0.8 && midpoint < 1.08, 'Real card animation not exercised');
            return { bounds: { width: initial.width, height: initial.height }, cardMidpoint: midpoint, syntheticPropagationStopped: true,
                limitation: 'Node emission is not browser native hit testing; real Preview must test blocked screen corners.' };
        });
        check('V2 button pressure owns its child tween, ignores foreign release and preserves input hitbox/transform', () => {
            const f = fixture(), press = f.presses[0], input = press.button.node, visual = press.visualRoot;
            const position = input.position.clone(), scale = input.scale.clone(), uiSize = input.getComponent(cc.UITransform).contentSize.clone();
            emit(input, 'TOUCH_START', input.worldPosition, 1); tick(0.03); const mid = visual.scale.x;
            assert(mid < 1 && mid > 0.97, 'Press child did not interpolate');
            emit(input, 'TOUCH_END', input.worldPosition, 99); tick(0.04); close(visual.scale.x, 0.97, 'foreign release must not restore');
            emit(input, 'TOUCH_CANCEL', input.worldPosition, 1); tick(0.11); close(visual.scale.x, 1, 'owned cancel restored decoration');
            close(input.position.y, position.y, 'button input position'); close(input.scale.x, scale.x, 'button input scale');
            close(input.getComponent(cc.UITransform).width, uiSize.width, 'button input width'); close(input.getComponent(cc.UITransform).height, uiSize.height, 'button input height');
            emit(input, 'TOUCH_START', input.worldPosition, 2); tick(0.03); press.enabled = false; press.onDisable(); tick(0.5); close(visual.scale.x, 1, 'disabled child animation cleanup');
            assert(!f.manager.hasStarted, 'Pressure feedback triggered gameplay');
            return { midpointScale: mid, pressedScale: 0.97, resetScale: 1, inputTransformAndHitboxUnchanged: true, started: false };
        });
        check('V2 Home decorative tween stops when real Home dismisses, without moving its input root', () => {
            const f = fixture(), target = f.homeDecoration.visualRoot, position = target.position.clone(), startInput = f.home.startButton.node.position.clone();
            tick(0.15); assert(target.scale.x > 0.96 && target.scale.x < 1, 'Real owned entrance not interpolating');
            f.home.startRepair(); sync(f); tick(3);
            assert(!f.home.overlay.active && f.manager.hasStarted, 'Home did not dismiss');
            close(target.position.y, position.y, 'hidden hero original position'); close(target.scale.x, 1, 'hidden hero original scale');
            close(f.home.startButton.node.position.y, startInput.y, 'start input did not move');
            return { hiddenHeroTweenStopped: true, scale: target.scale.x, inputPositionPreserved: true };
        });
        check('V2 actual drag preserves foreign-touch ownership, CANCEL and exactly one wrong-release mistake', () => {
            const f = fixture(), r = records(), stage = load(f, definitions('drag-match')[0], r), node = stage.itemNodes[0], origin = node.position.clone();
            const far = node.worldPosition.clone(); far.x += 300; far.y += 250;
            emit(node, 'TOUCH_START', node.worldPosition, 2);
            for (const kind of ['TOUCH_START', 'TOUCH_MOVE', 'TOUCH_END', 'TOUCH_CANCEL']) emit(node, kind, far, 99);
            close(node.position.x, origin.x, 'foreign touch position'); assert(r.mistakes === 0, 'Foreign touch charged mistake');
            emit(node, 'TOUCH_MOVE', far, 2); emit(node, 'TOUCH_CANCEL', far, 2);
            close(node.position.x, origin.x, 'cancel position'); assert(r.mistakes === 0 && stage.progress.completed === 0, 'Cancel changed score/progress');
            emit(node, 'TOUCH_START', node.worldPosition, 3); emit(node, 'TOUCH_END', far, 3); emit(node, 'TOUCH_END', far, 3); tick(0.19);
            assert(r.mistakes === 1 && stage.progress.completed === 0, 'Repeated wrong release charges wrong count'); close(node.position.x, origin.x, 'wrong return endpoint');
            return { foreignEvents: 4, cancelMistakes: 0, wrongReleaseMistakes: 1, completed: 0 };
        });
        check('V2 actual cable preserves ownership/CANCEL and Graphics endpoint through transformed parents', () => {
            const f = fixture(), r = records(), stage = load(f, definitions('cable-connect')[0], r), cable = stage.cableNodes[0].getComponent(types.CableConnector);
            const origin = cable.head.position.clone(), anchor = cable.anchor.position.clone();
            emit(cable.head, 'TOUCH_START', cable.head.worldPosition, 4);
            emit(cable.head, 'TOUCH_MOVE', cable.currentPort.worldPosition, 99); emit(cable.head, 'TOUCH_END', cable.currentPort.worldPosition, 99);
            close(cable.head.position.x, origin.x, 'foreign cable x'); emit(cable.head, 'TOUCH_CANCEL', cable.currentPort.worldPosition, 4);
            close(cable.head.position.x, origin.x, 'cable cancel x'); assert(r.mistakes === 0 && stage.progress.completed === 0, 'Cable cancel/foreign changed metrics');
            const parent = ui(stage.node, 'TransformedPorts'); parent.setPosition(30, 80, 0); parent.angle = -25; parent.setScale(0.75, 1.4, 1); cable.currentPort.parent = parent;
            f.root.setPosition(120, 60, 0); f.root.angle = 17; f.root.setScale(1.3, 0.8, 1);
            drop(cable.head, cable.currentPort); tick(0.16);
            assert(cable.isConnected && stage.progress.completed === 1 && r.mistakes === 0, 'Transformed correct cable failed');
            close(cable.head.worldPosition.x, cable.currentPort.worldPosition.x, 'world endpoint x'); close(cable.head.worldPosition.y, cable.currentPort.worldPosition.y, 'world endpoint y');
            const localEnd = cable.line.node.getComponent(cc.UITransform).convertToNodeSpaceAR(cable.head.worldPosition);
            close(cable.lineEnd.x, localEnd.x, 'actual Graphics endpoint x'); close(cable.lineEnd.y, localEnd.y, 'actual Graphics endpoint y'); close(cable.anchor.position.x, anchor.x, 'anchor unchanged');
            return { foreignAndCancelMistakes: 0, completedConnections: 1, endpoint: { x: cable.lineEnd.x, y: cable.lineEnd.y }, transformValidated: true };
        });
        check('V2 return Home is final-only and rejects waiting/playing/ordinary-order result', () => {
            const f = fixture(); assert(!f.home.returnToHome() && !f.manager.returnHomeFromFinal(), 'Waiting permits final-only transition');
            f.manager.startFirstOrder(); f.home.onEnable(); sync(f);
            assert(!f.home.returnToHome() && !f.manager.returnHomeFromFinal(), 'Playing permits final-only transition');
            solve(f); sync(f);
            assert(!f.home.returnToHome() && !f.manager.returnHomeFromFinal(), 'Ordinary result permits return Home');
            assert(f.manager.hasStarted && f.run.levelResults.length === 1 && f.manager.completePanel.active && f.shade.active, 'Rejected transition changed run');
            return { acceptedOutsideFinal: 0, retainedResults: 1, ordinaryResultStillOpen: true };
        });
        check('V2 full final to Home clears metrics/stages/modal; rapid Start re-enters once and rejects old callbacks', () => {
            const f = fixture(true), oldStage = current(f), oldCallbacks = oldStage.callbacks;
            const sequence = finishRun(f); assert(sequence.length === 13 && f.run.summary.completedOrders === 9, 'Return-Home test did not play full catalog');
            f.home.homeButton.node.emit(cc.Button.EventType.CLICK); f.home.homeButton.node.emit(cc.Button.EventType.CLICK); sync(f); tick(0.5);
            assert(!f.manager.hasStarted && f.home.overlay.active && !f.manager.completePanel.active && !f.shade.active && !f.run.isLevelRunning, 'Final to Home left active gameplay/modal');
            assert(f.run.levelResults.length === 0 && f.run.currentElapsedMs === 0 && f.run.currentMistakes === 0 && f.host.node.children.every(n => !n.active), 'Home did not clear actual run/stages');
            oldCallbacks.onProgress({ completed: 3, total: 3 }); oldCallbacks.onMistake(); oldCallbacks.onComplete(); f.run.update(8);
            assert(f.run.currentElapsedMs === 0 && f.run.levelResults.length === 0, 'Old callback or idle update escaped Home');
            f.home.startButton.node.emit(cc.Button.EventType.CLICK); sync(f); const generation = f.host.currentGeneration;
            f.home.startButton.node.emit(cc.Button.EventType.CLICK); f.home.startButton.node.emit(cc.Button.EventType.CLICK); tick(0.5);
            oldCallbacks.onMistake(); oldCallbacks.onComplete();
            assert(f.manager.hasStarted && f.manager.currentOrderIndex === 0 && f.manager.currentStageIndex === 0 && f.host.currentGeneration === generation, 'Home re-entry failed/idempotence broke');
            assert(f.run.levelResults.length === 0 && f.run.currentElapsedMs === 0 && f.run.currentMistakes === 0 && current(f).progress.completed === 0 && !f.shade.active, 'New round inherited old result/state');
            assert(!f.manager.tutorialHint.active, 'Session tutorial was forgotten on Home return');
            return { completedBeforeHome: 9, stagesBeforeHome: 13, idleElapsedMs: 0, replayOrder: 1, cacheRoots: f.host.cachedStageCount, newGeneration: generation, retainedTutorialSession: true };
        });
        check('V2 Home return retains both sound states without playing audio in the fixture', () => {
            const evidence = [];
            for (const enabled of [false, true]) {
                const f = fixture(true); assert(!f.audio.isUnlocked, 'Fixture unexpectedly unlocked browser audio'); f.audio.setSoundEnabled(enabled);
                finishRun(f); assert(f.home.returnToHome(), 'Final Home transition failed'); sync(f);
                assert(f.audio.isSoundEnabled === enabled && !f.audio.isUnlocked && f.home.overlay.active, 'Home reset sound preference/unlock');
                assert(f.home.soundStateLabel.string === (enabled ? '音效：开' : '音效：关'), 'Home sound UI is stale');
                f.run.advanceTime(7); assert(f.run.currentElapsedMs === 0, 'Sound state started clock');
                evidence.push({ enabled, retained: f.audio.isSoundEnabled, unlocked: f.audio.isUnlocked, idleElapsedMs: 0 });
            }
            return { states: evidence, audiblePlaybackTested: false };
        });
        check('V2 final Replay immediately restarts order 1, hides all result/modal state and never flashes Home', () => {
            const f = fixture(true); finishRun(f);
            assert(f.resultView.finalGroup.active && !f.resultView.starContainer.active, 'Final presentation missing');
            f.manager.nextButton.node.emit(cc.Button.EventType.CLICK); f.manager.nextButton.node.emit(cc.Button.EventType.CLICK); sync(f); tick(0.5);
            assert(f.manager.currentOrderIndex === 0 && f.manager.currentStageIndex === 0 && f.run.levelResults.length === 0 && f.run.currentElapsedMs === 0, 'Direct Replay reset mismatch');
            assert(!f.home.overlay.active && !f.manager.completePanel.active && !f.resultView.orderGroup.activeInHierarchy && !f.resultView.finalGroup.activeInHierarchy && !f.shade.active, 'Replay left old UI or flashed Home');
            assert(f.stars.displayedStars === 0 && current(f).progress.completed === 0 && f.host.cachedStageCount === 3, 'Replay visuals/cache did not reset');
            return { order: 1, stage: 1, results: 0, modalVisible: false, homeVisible: false, preservedCache: 3 };
        });
        check('V2 actual Manager summary derives totals from a smaller real catalog fixture', () => {
            const f = fixture(); f.manager.orders = [source.orders[0], source.orders.find(o => o.stages.some(stage => stage.id === 'keyboard-clean'))];
            const sequence = finishRun(f);
            assert(sequence.length === 2 && f.run.summary.completedOrders === 2, 'Subset fixture did not execute both real orders');
            assert(f.resultView.summaryOrdersLabel.string === '2 / 2' && f.resultView.summaryStarsLabel.string === '6 / 6' && f.resultView.summaryStepsLabel.string === '2 / 2', 'Manager/View hardcodes nine/thirteen totals');
            assert(!f.resultView.starContainer.active && f.resultView.finalGroup.active, 'Subset final uses ordinary stars');
            return { fixtureCatalogOrders: 2, executedSteps: 2, orders: f.resultView.summaryOrdersLabel.string, stars: f.resultView.summaryStarsLabel.string, steps: f.resultView.summaryStepsLabel.string };
        });
        check('V2 actual cable artwork follows transformed endpoints and redraws color at a fixed endpoint', () => {
            const f = fixture(), stage = load(f, definitions('cable-connect')[0]), cable = stage.cableNodes[0].getComponent(types.CableConnector);
            const visual = cable.node.getComponent(types.V2CableLine); assert(visual?.connector === cable && visual.artwork instanceof cc.Graphics, 'Saved V2CableLine bindings missing');
            assert(cable.line.enabled === false && visual.artwork.enabled, 'Original logical Graphics should remain bound while only the new artwork renders');
            f.root.setPosition(120, 60, 0); f.root.angle = 17; f.root.setScale(1.3, 0.8, 1);
            visual.refresh();
            const originalBezier = visual.artwork.bezierCurveTo, originalMove = visual.artwork.moveTo, originalStroke = visual.artwork.stroke;
            const paths = [], strokes = [], starts = [], expectedStrokes = visual.refinedStyle ? 4 : 3, bodyIndex = visual.refinedStyle ? 2 : 1;
            // Observe actual fixture Graphics calls and still execute the real Cocos methods.
            visual.artwork.bezierCurveTo = function (...args) { paths.push(args); return originalBezier.apply(this, args); };
            visual.artwork.moveTo = function (...args) { starts.push(args); return originalMove.apply(this, args); };
            visual.artwork.stroke = function (...args) { strokes.push({ width: this.lineWidth, r: this.strokeColor.r, g: this.strokeColor.g, b: this.strokeColor.b, a: this.strokeColor.a }); return originalStroke.apply(this, args); };
            try {
                cable.line.strokeColor = new cc.Color(12, 144, 166, 255); visual.refresh();
                assert(paths.length === expectedStrokes && strokes.length === expectedStrokes, 'Fixed-endpoint color change was skipped or current exact material layer count differs');
                const artTransform = visual.artwork.node.getComponent(cc.UITransform);
                const anchor = artTransform.convertToNodeSpaceAR(cable.anchor.worldPosition), endpoint = artTransform.convertToNodeSpaceAR(cable.head.worldPosition);
                close(starts[bodyIndex][0], anchor.x, 'actual curve start x'); close(starts[bodyIndex][1], anchor.y, 'actual curve start y');
                close(paths[bodyIndex][4], endpoint.x, 'actual curve endpoint x'); close(paths[bodyIndex][5], endpoint.y, 'actual curve endpoint y');
                assert(strokes[bodyIndex].width === 11 && strokes[bodyIndex].r === 12 && strokes[bodyIndex].g === 144 && strokes[bodyIndex].b === 166, 'Actual curve stroke ignores current connector color');
                paths.length = 0; strokes.length = 0; starts.length = 0;
                const p = cable.head.position.clone(); p.x += 45; p.y += 35; cable.head.setPosition(p); visual.refresh();
                const moved = artTransform.convertToNodeSpaceAR(cable.head.worldPosition);
                assert(paths.length === expectedStrokes, 'Moved endpoint did not redraw actual artwork'); close(paths[bodyIndex][4], moved.x, 'moved art endpoint x'); close(paths[bodyIndex][5], moved.y, 'moved art endpoint y');
                return { realCurveStrokesPerRefresh: expectedStrokes, refinedStyle: visual.refinedStyle, centralStrokeWidth: 11, fixedEndpointColorRedraw: true, transformedEndpoints: true, methodObservation: 'Fixture instance instrumentation delegates to actual Cocos Graphics methods' };
            } finally { visual.artwork.bezierCurveTo = originalBezier; visual.artwork.moveTo = originalMove; visual.artwork.stroke = originalStroke; }
        });
        check('V2 actual dirt child artwork overlaps and resizes without changing logical cell hitbox/position', () => {
            const f = fixture(), list = definitions('clean-swipe'), stage = load(f, list[0]); tick(0);
            const cell = stage.cellNodes[0], logical = cell.getComponent(cc.UITransform), position = cell.position.clone(), width = logical.width, height = logical.height;
            const appearance = cell.getComponent(types.V2DirtAppearance); assert(appearance?.dust && appearance.dust.parent === cell, 'Actual saved irregular dust child missing');
            const child = appearance.dust.getComponent(cc.UITransform); assert(appearance.dust.getComponent(cc.Sprite)?.spriteFrame instanceof cc.SpriteFrame, 'Dust child has no real imported SpriteFrame');
            close(child.width, width * 1.6, 'overlapping dust width'); close(child.height, height * 1.6, 'overlapping dust height');
            close(logical.width, width, 'logical width unchanged'); close(logical.height, height, 'logical height unchanged'); close(cell.position.x, position.x, 'logical x unchanged'); close(cell.position.y, position.y, 'logical y unchanged');
            const next = load(f, list[1]); tick(0); assert(next.cellNodes[0] === cell, 'Irregular dust replaced logical pooled cell');
            close(child.width, logical.width * 1.6, 'reused dust width follows new area'); close(child.height, logical.height * 1.6, 'reused dust height follows new area');
            assert(!appearance.dust.getComponent(cc.Button) && !appearance.dust.getComponent(cc.BlockInputEvents), 'Dust child intercepts gameplay');
            return { reusedCell: cell.uuid, childScaleFactor: 1.6, logicalTransformPreserved: true, runtimeCellCount: stage.totalCells,
                retiredSpriteEnabled: appearance.dust.getComponent(cc.Sprite).enabled, limitation: 'This preserved V2 check verifies only old child transforms/frame/pool. Its per-cell renderer is deliberately retired in V21; current independent particles are checked separately and natural appearance requires Preview.' };
        });
        check('V21 current clean Prefab binds 192 pooled path-local Sprites independently of 32 logical cells', () => {
            const f = fixture(), stage = load(f, definitions('clean-swipe')[0]); tick(0);
            const view = stage.dustView, diagnostics = view?.particleDiagnostics;
            assert(view instanceof types.V21CleanDustView && view.artworkRoot.parent === stage.dirtLayer, 'Current saved independent dust view missing');
            assert(view.dustFrame instanceof cc.SpriteFrame && view.particleCount === 192 && view.totalCreatedParticles === 192, 'Particle pool/frame binding mismatch');
            assert(stage.totalCells === 32 && stage.requiredCells === 28 && diagnostics.length === 192, 'Logical grid and visual pool were coupled');
            assert(Object.isFrozen(diagnostics) && diagnostics.every(d => Object.isFrozen(d) && d.alpha === d.baseAlpha && d.baseAlpha >= 60 && d.baseAlpha <= 96), 'Diagnostics leak mutable state or dust did not reset');
            assert(new Set(diagnostics.map(d => d.x.toFixed(3))).size > 100 && new Set(diagnostics.map(d => d.y.toFixed(3))).size > 100, 'Dust positions collapse onto logical cell rows/columns');
            for (const node of view.artworkRoot.children) {
                const sprite = node.getComponent(cc.Sprite); assert(sprite?.enabled && sprite.spriteFrame === view.dustFrame, 'Actual particle renderer/frame is missing');
                assert(!node.getComponent(cc.Button) && !node.getComponent(cc.BlockInputEvents), 'Particle intercepts input');
                for (const type of ['TOUCH_START', 'TOUCH_MOVE', 'TOUCH_END', 'TOUCH_CANCEL']) assert(!node.hasEventListener(cc.Node.EventType[type]), 'Particle owns a touch listener');
            }
            const oldAppearance = stage.cellNodes[0].getComponent(types.V2DirtAppearance);
            assert(oldAppearance?.dust?.getComponent(cc.Sprite)?.enabled === false, 'Old per-cell renderer was not retired');
            return { logicalCells: 32, requiredCells: 28, visualParticles: 192, totalCreated: view.totalCreatedParticles, diagnosticsDetachedAndFrozen: true, retiredCellRendererEnabled: false,
                limitation: 'Irregular positions and soft-alpha renderer bindings are structural evidence; pixel appearance still requires real Preview.' };
        });
        check('V21 accepted diagonal and curved cleaning paths fade local particles under transformed input ancestors', () => {
            const f = fixture(), r = records(), stage = load(f, definitions('clean-swipe')[0], r); tick(0);
            const view = stage.dustView, before = view.particleDiagnostics;
            f.root.setPosition(100, 65, 0); f.root.angle = 17; f.root.setScale(1.15, 0.85, 1);
            const ui = stage.inputSurface.getComponent(cc.UITransform), world = (x, y) => ui.convertToWorldSpaceAR(new cc.Vec3(x, y));
            emit(stage.inputSurface, 'TOUCH_START', world(-200, -80), 4);
            for (const [x, y] of [[-110, 30], [-30, 85], [60, 100]]) emit(stage.inputSurface, 'TOUCH_MOVE', world(x, y), 4);
            emit(stage.inputSurface, 'TOUCH_END', world(145, 35), 4);
            const after = view.particleDiagnostics, changed = after.filter((d, i) => d.alpha < before[i].alpha), feathered = after.filter(d => d.alpha > 0 && d.alpha < d.baseAlpha);
            assert(changed.length > 0 && changed.length < 192 && feathered.length > 0, 'Accepted path did not produce local feathered fading');
            assert(after.every((d, i) => d.alpha <= before[i].alpha), 'A swipe increased dust opacity');
            assert(stage.cleanedCells > 0 && stage.cleanedCells < 28 && r.completed === 0 && r.mistakes === 0, 'Decoration bypassed logical threshold or changed mistake semantics');
            return { path: [[-200, -80], [-110, 30], [-30, 85], [60, 100], [145, 35]], changedParticles: changed.length, featheredParticles: feathered.length,
                unaffectedParticles: 192 - changed.length, logicalCleaned: stage.cleanedCells, completed: 0, mistakes: 0, transformedInput: true };
        });
        check('V21 dust ignores unowned and foreign events while CANCEL retains only the accepted local erase', () => {
            const f = fixture(), r = records(), stage = load(f, definitions('clean-swipe')[0], r); tick(0);
            const view = stage.dustView, ui = stage.inputSurface.getComponent(cc.UITransform), a = ui.convertToWorldSpaceAR(new cc.Vec3(-180, -70)), b = ui.convertToWorldSpaceAR(new cc.Vec3(200, 90));
            const original = JSON.stringify(view.particleDiagnostics);
            emit(stage.inputSurface, 'TOUCH_MOVE', b, 99); assert(JSON.stringify(view.particleDiagnostics) === original, 'Unowned move erased dust');
            emit(stage.inputSurface, 'TOUCH_START', a, 3);
            const accepted = JSON.stringify(view.particleDiagnostics), count = stage.cleanedCells; assert(accepted !== original, 'Owned START did not erase locally');
            for (const kind of ['TOUCH_START', 'TOUCH_MOVE', 'TOUCH_END', 'TOUCH_CANCEL']) emit(stage.inputSurface, kind, b, 99);
            assert(JSON.stringify(view.particleDiagnostics) === accepted && stage.cleanedCells === count, 'Foreign touch altered visual/logical state');
            emit(stage.inputSurface, 'TOUCH_CANCEL', b, 3); emit(stage.inputSurface, 'TOUCH_MOVE', b, 3);
            assert(JSON.stringify(view.particleDiagnostics) === accepted && stage.cleanedCells === count && r.mistakes === 0, 'CANCEL erased to its release point or lost accepted progress');
            return { foreignEvents: 4, retainedLogicalCount: count, ownedCancelRetainsDustState: true, mistakeCount: 0 };
        });
        check('V21 independent dust keeps the true 16/27/28 logical threshold and ignores all post-completion erasing', () => {
            const f = fixture(), r = records(), stage = load(f, definitions('clean-swipe').find(d => d.id === 'keyboard-clean'), r); tick(0);
            const snapshots = [];
            for (let i = 0; i < 28; i++) {
                clean(stage, stage.cellNodes[i]); tick(0.09);
                if ([16, 27, 28].includes(i + 1)) snapshots.push({ count: stage.cleanedCells, total: stage.totalCells, required: stage.requiredCells, completions: r.completed });
            }
            assert(JSON.stringify(snapshots.map(s => [s.count, s.completions])) === JSON.stringify([[16, 0], [27, 0], [28, 1]]), 'Logical completion changed under particle view');
            const dust = JSON.stringify(stage.dustView.particleDiagnostics); clean(stage, stage.cellNodes[31]);
            assert(JSON.stringify(stage.dustView.particleDiagnostics) === dust && stage.cleanedCells === 28 && r.completed === 1 && r.mistakes === 0, 'Finished stage still erases or settles repeatedly');
            return { snapshots, completions: 1, logicalCellsUnvisited: 4, particlePool: stage.dustView.particleCount,
                limitation: 'Completion at 28 of 32 is not a claim that every logical cell was visited or every remaining particle was physically erased.' };
        });
        check('V21 reused clean stages restore the same 192 particles for each region and disable-enable preserves current erase', () => {
            const f = fixture(), list = definitions('clean-swipe'), stage = load(f, list[0]); tick(0);
            const view = stage.dustView, identities = view.artworkRoot.children.map(n => n.uuid); clean(stage, stage.cellNodes[0]);
            const faded = JSON.stringify(view.particleDiagnostics); view.enabled = false; tick(0.1); view.enabled = true; tick(0.1);
            assert(JSON.stringify(view.particleDiagnostics) === faded, 'Disabling/enabling regenerated current dust');
            const regions = [];
            for (const definition of list.slice(1)) {
                const fresh = load(f, definition); tick(0);
                assert(fresh === stage && fresh.dustView === view && view.totalCreatedParticles === 192, 'Stage or particle pool reallocated across regions');
                assert(JSON.stringify(view.artworkRoot.children.map(n => n.uuid)) === JSON.stringify(identities), 'Particle identities changed');
                assert(view.particleDiagnostics.every(d => d.alpha === d.baseAlpha && d.areaIndex < definition.areas.length) && fresh.cleanedCells === 0, 'Reconfigure retained old dust or counters');
                for (const d of view.particleDiagnostics) {
                    const area = definition.areas[d.areaIndex]; assert(Math.abs(d.x - area.position.x) + d.width / 2 <= area.size.width / 2 + 0.001
                        && Math.abs(d.y - area.position.y) + d.height / 2 <= area.size.height / 2 + 0.001, 'Reused particle left its current area');
                }
                regions.push({ id: definition.id, logicalCells: fresh.totalCells, particles: view.particleCount, totalCreated: view.totalCreatedParticles });
            }
            return { retainedEraseAcrossDisable: true, reusedParticles: 192, regions };
        });
        check('V21 particle destruction schedules only its decorative nodes and leaves logical input/counters intact', () => {
            const f = fixture(), stage = load(f, definitions('clean-swipe')[0]); tick(0);
            const view = stage.dustView, particles = view.artworkRoot.children.slice(), cells = stage.cellNodes.slice(), count = stage.cleanedCells;
            view.onDestroy();
            assert(view.particleCount === 0 && particles.every(n => !cc.isValid(n, true)), 'Owned particles were not scheduled for destruction');
            assert(cells.every(n => cc.isValid(n, true)) && stage.totalCells === 32 && stage.cleanedCells === count && stage.inputSurface.hasEventListener(cc.Node.EventType.TOUCH_START), 'Particle cleanup modified core cells/input');
            return { ownedParticleDestructionScheduled: particles.length, logicalCellsStillValid: cells.length, logicalCountUnchanged: true,
                limitation: 'Actual onDestroy is invoked explicitly because Editor fixtures suppress game lifecycle; deferred native destruction is scheduled, not falsely reported as a rendered-frame flush.' };
        });
        check('V21 saved refined cables share the lower artwork layer and show exactly one success lamp after actual snap', () => {
            const f = fixture(), list = definitions('cable-connect'), stage = load(f, list[0]); tick(0);
            const underlay = stage.node.getChildByName('V21CableArtworkLayer'), cables = stage.cableNodes.filter(n => n.active).map(n => n.getComponent(types.CableConnector));
            const visuals = cables.map(c => c.node.getComponent(types.V2CableLine));
            assert(underlay && underlay.getSiblingIndex() === 0 && visuals.every(v => v.refinedStyle && v.artwork.node.parent === underlay && !v.statusLight.active), 'Current artwork layer/opt-in/initial lamps invalid');
            for (const c of cables) assert(c.head.parent === c.node && c.anchor.parent === c.node && c.line.node.parent === c.node && c.line.enabled === false, 'Input/logical line was reparented instead of decoration');
            const first = cables[0]; drop(first.head, first.currentPort); tick(0.06); assert(!first.isConnected && !visuals[0].statusLight.active, 'Success lamp precedes core settlement');
            tick(0.10); assert(stage.progress.completed === 1 && visuals.filter(v => v.statusLight.active).length === 1 && first.isConnected, 'One actual success did not produce exactly one lamp');
            const fresh = load(f, list[1]); tick(0);
            assert(fresh === stage && fresh.progress.completed === 0 && visuals.every(v => !v.statusLight.active), 'Pooled connector lamps survived new configuration');
            return { configuredCables: cables.length, successLampsBeforeSnap: 0, successLampsAfterFirstSnap: 1, successLampsAfterReuse: 0, sharedArtworkLayer: underlay.name, inputParentsPreserved: true };
        });
        check('V21 real four-layer cable has bounded sag and exact endpoints during accepted drag; CANCEL restores without score', () => {
            const f = fixture(), r = records(), stage = load(f, definitions('cable-connect')[0], r); tick(0);
            const cable = stage.cableNodes[0].getComponent(types.CableConnector), visual = cable.node.getComponent(types.V2CableLine), art = visual.artwork;
            const originalBezier = art.bezierCurveTo, originalMove = art.moveTo, curves = [], starts = [];
            art.bezierCurveTo = function (...args) { curves.push({ width: this.lineWidth, coordinates: args }); return originalBezier.apply(this, args); };
            art.moveTo = function (...args) { starts.push(args); return originalMove.apply(this, args); };
            try {
                emit(cable.head, 'TOUCH_START', cable.head.worldPosition, 8);
                const far = cable.head.worldPosition.clone(); far.x += 1100; far.y -= 900; emit(cable.head, 'TOUCH_MOVE', far, 8); visual.refresh();
                assert(JSON.stringify(curves.map(c => c.width)) === JSON.stringify([21, 15, 11, 3]), 'Current material layers differ');
                const ui = art.node.getComponent(cc.UITransform), anchor = ui.convertToNodeSpaceAR(cable.anchor.worldPosition), end = ui.convertToNodeSpaceAR(cable.head.worldPosition), body = curves[2].coordinates;
                close(starts[2][0], anchor.x, 'refined curve start x'); close(starts[2][1], anchor.y, 'refined curve start y'); close(body[4], end.x, 'refined curve end x'); close(body[5], end.y, 'refined curve end y');
                const sag = anchor.y - body[1]; assert(sag > 0 && sag <= 58.001, 'Sag exceeded bounded range'); close(end.y - body[3], sag, 'equal sag at both controls');
                emit(cable.head, 'TOUCH_CANCEL', far, 8); tick(0);
                assert(r.mistakes === 0 && stage.progress.completed === 0 && !visual.statusLight.active, 'Decorative curve changed CANCEL semantics');
                return { layers: [21, 15, 11, 3], actualSag: sag, exactEndpoints: true, cancelMistakes: 0, completed: 0, methodObservation: 'Instance observers delegate to actual Cocos Graphics methods' };
            } finally { art.bezierCurveTo = originalBezier; art.moveTo = originalMove; }
        });
        check('V21 actual refined plug child layout improves dimensions/font without moving or resizing its real Head input', () => {
            const f = fixture(), stage = load(f, definitions('cable-connect')[0]); tick(0);
            const connector = stage.cableNodes[0].getComponent(types.CableConnector), input = connector.head, visual = input.getComponent(types.ElementVisual), ui = input.getComponent(cc.UITransform);
            assert(visual.refinedLayout === true, 'Current saved Head has not opted into refinement');
            const before = JSON.stringify([input.parent.uuid, input.position, input.scale, ui.width, ui.height]), frame = visual.icon.spriteFrame, key = visual.visualKey, caption = visual.caption.string;
            visual.refinedLayout = false; visual.configure(frame, key, caption, ui.width, ui.height, false);
            const legacy = visual.icon.node.getComponent(cc.UITransform).contentSize.clone();
            visual.refinedLayout = true; visual.configure(frame, key, caption, ui.width, ui.height, false);
            const refined = visual.icon.node.getComponent(cc.UITransform).contentSize;
            assert(refined.width >= legacy.width && refined.height >= legacy.height && (refined.width > legacy.width || refined.height > legacy.height) && visual.caption.fontSize >= 24, 'Refined child/label did not improve readability dimensions');
            assert(JSON.stringify([input.parent.uuid, input.position, input.scale, ui.width, ui.height]) === before && stage.progress.completed === 0, 'Child layout changed actual Head input or progress');
            for (const type of ['TOUCH_START', 'TOUCH_MOVE', 'TOUCH_END', 'TOUCH_CANCEL']) assert(input.hasEventListener(cc.Node.EventType[type]) && !visual.icon.node.hasEventListener(cc.Node.EventType[type]), 'Input ownership moved into artwork');
            return { key, legacyChild: { width: legacy.width, height: legacy.height }, refinedChild: { width: refined.width, height: refined.height }, fontSize: visual.caption.fontSize,
                actualInput: { width: ui.width, height: ui.height }, geometryAndListenersPreserved: true, limitation: 'Dimensions/font are structural; actual label clipping/recognizability require Preview.' };
        });
        check('V21 actual Cocos stagger separates earned star entrances and reset/disable stop later mutation without changing rating', () => {
            const f = fixture(), stars = f.stars; f.manager.completePanel.active = true; f.resultView.orderGroup.active = true; sync(f);
            stars.staggerSeconds = 0.075; stars.show(3); tick(0.04);
            const first = stars.starSprites.map(s => s.node.scale.x);
            assert(first[0] > 0.82 && Math.abs(first[1] - 0.82) < 0.001 && Math.abs(first[2] - 0.82) < 0.001, 'Staggered first entrance is not separate');
            tick(0.07); const second = stars.starSprites.map(s => s.node.scale.x);
            assert(second[1] > 0.82 && Math.abs(second[2] - 0.82) < 0.001 && stars.displayedStars === 3, 'Stagger changed rating or failed second entrance');
            stars.reset(); tick(1); assert(stars.displayedStars === 0 && stars.starSprites.every(s => s.spriteFrame === stars.emptyFrame && Math.abs(s.node.scale.x - 1) < 0.001), 'Late stagger survived reset');
            stars.show(1); tick(0.04); stars.onDisable(); tick(1);
            assert(stars.displayedStars === 1 && stars.starSprites[0].spriteFrame === stars.earnedFrame && stars.starSprites[1].spriteFrame === stars.emptyFrame, 'Disable erased or inflated true rating');
            stars.starSprites.forEach(s => close(s.node.scale.x, 1, 'stopped stagger scale'));
            return { staggerSeconds: 0.075, scalesAt0_04: first, scalesAt0_11: second, resetDisplayed: 0, disableRetainedRating: 1,
                timing: 'Actual Cocos ActionManager advanced with controlled synthetic delta, not natural Preview elapsed time' };
        });
        result.ok = checks.length === 46 && checks.every(check => check.status === 'PASS');
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
    result.failedChecks = checks.filter(check => check.status === 'FAIL').length; result.totalChecks = checks.length;
    result.counts = { checks: checks.length, passed: result.passedChecks, failed: result.failedChecks,
        currentCoreQualityChecksReexecuted: Math.min(18, checks.length), currentV2ViewAndFlowChecksReexecuted: Math.min(18, Math.max(0, checks.length - 18)), newV21VisualChecks: Math.max(0, checks.length - 36),
        catalogOrders: source?.orders.length || 0, catalogStages: source ? source.orders.reduce((n, o) => n + o.stages.length, 0) : 0 };
    return result;
};
