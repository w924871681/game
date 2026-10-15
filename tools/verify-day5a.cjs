'use strict';

// Real compiled components and production visual mappings, driven by the same
// finite UI/event mock as Day 1–4. This is not Preview, audio playback or rendering.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function runDay5ATests(runtime) {
    const { mock, load, GameController, DraggableItem, RunController } = runtime;
    const { Node, UITransform, Label, Button, EventTouch, Prefab, Graphics, Sprite, SpriteFrame, UIOpacity, AudioClip, AudioSource } = mock.cc;
    const { ORDER_CATALOG } = load('data/OrderCatalog.ts');
    const { LevelManager, GameState } = load('core/LevelManager.ts');
    const { StageHost } = load('stages/StageHost.ts');
    const { DragMatchStageController } = load('stages/DragMatchStageController.ts');
    const { CableConnectStageController } = load('stages/CableConnectStageController.ts');
    const { CleanSwipeStageController } = load('stages/CleanSwipeStageController.ts');
    const { CableConnector } = load('gameplay/CableConnector.ts');
    const { HomeController } = load('ui/HomeController.ts');
    const { AudioFeedback } = load('ui/AudioFeedback.ts');
    const { ResultStars } = load('ui/ResultStars.ts');
    const { DEVICE_KEYS, dragVisualKey, cableVisualKey, cleanVisualKey } = load('visuals/VisualCatalog.ts');
    const { VisualAssetRegistry } = load('visuals/VisualAssetRegistry.ts');
    const { ElementVisual } = load('visuals/ElementVisual.ts');
    const { CleanDeviceVisual } = load('visuals/CleanDeviceVisual.ts');
    let groups = 0;
    const test = (name, action) => { action(); groups += 1; console.log(`PASS Day 5A: ${name}`); };
    const node = (name, parent = null) => { const value = new Node(name); value.addComponent(UITransform); value.parent = parent; return value; };
    const label = (name, parent) => node(name, parent).addComponent(Label);
    const click = (button) => button.node.emit(Button.EventType.CLICK, {});
    const emit = (target, type, point = target.worldPosition, id = 1) => {
        const event = new EventTouch(id, point); target.emit(Node.EventType[type], event); return event;
    };
    const drop = (target, point) => { emit(target, 'TOUCH_START'); emit(target, 'TOUCH_END', point); };
    const active = (nodes) => nodes.filter((entry) => entry.active);
    function decorate(value) {
        const visual = value.addComponent(ElementVisual); visual.caption = label('Label', value);
        visual.icon = node('Icon', value).addComponent(Sprite); visual.checkMarker = node('Check', value); return visual;
    }
    const visualPrefab = (name, extra) => new Prefab(() => {
        const value = node(name); value.addComponent(Sprite); decorate(value); extra?.(value); return value;
    });
    function dragRoot() {
        const root = node('DragMatchStage'), stage = root.addComponent(DragMatchStageController);
        stage.gameController = root.addComponent(GameController);
        stage.itemPrefab = visualPrefab('DragItem', (value) => value.addComponent(DraggableItem));
        stage.targetPrefab = visualPrefab('DragTarget'); return root;
    }
    function cableRoot() {
        const root = node('CableConnectStage'), stage = root.addComponent(CableConnectStageController);
        stage.cablePrefab = new Prefab(() => {
            const value = node('Cable'), connector = value.addComponent(CableConnector);
            connector.anchor = node('Anchor', value); connector.head = node('Head', value);
            connector.head.addComponent(Sprite); decorate(connector.head);
            connector.line = node('Line', value).addComponent(Graphics); return value;
        });
        stage.portPrefab = visualPrefab('Port'); return root;
    }
    function cleanRoot() {
        const root = node('CleanSwipeStage'), stage = root.addComponent(CleanSwipeStageController);
        stage.deviceVisual = root.addComponent(CleanDeviceVisual); stage.deviceVisual.device = node('Device', root).addComponent(Sprite);
        stage.dirtLayer = node('DirtLayer', root); stage.inputSurface = node('InputSurface', root);
        stage.inputSurface.getComponent(UITransform).setContentSize(680, 560);
        stage.dirtCellPrefab = new Prefab(() => { const value = node('DirtCell'); value.addComponent(Sprite); value.addComponent(UIOpacity); return value; });
        return root;
    }
    function wireAudio(parent) {
        const audioNode = node('AudioFeedback', parent), audio = audioNode.addComponent(AudioFeedback);
        audio.audioSource = audioNode.addComponent(AudioSource);
        for (const name of ['uiClick', 'success', 'mistake', 'cleanComplete', 'stageComplete', 'orderComplete', 'runComplete']) audio[`${name}Clip`] = new AudioClip(name);
        return audio;
    }
    function fixture({ autoStart = false, home = true, boot = true, visuals = false } = {}) {
        const canvas = node('Canvas'), header = node('Header', canvas), hostNode = node('StageHost', canvas);
        const host = hostNode.addComponent(StageHost);
        Object.assign(host, { dragMatchPrefab: new Prefab(dragRoot), cableConnectPrefab: new Prefab(cableRoot), cleanSwipePrefab: new Prefab(cleanRoot) });
        if (visuals) {
            const registry = node('VisualRegistry', canvas).addComponent(VisualAssetRegistry), keys = new Set();
            for (const stage of ORDER_CATALOG.flatMap((order) => order.stages)) {
                if (stage.kind === 'drag-match') stage.pairs.forEach((pair) => keys.add(dragVisualKey(stage.id, pair.id)));
                if (stage.kind === 'cable-connect') stage.cables.forEach((cable) => { keys.add(cableVisualKey(stage.id, cable.id, 'head')); keys.add(cableVisualKey(stage.id, cable.id, 'port')); });
                if (stage.kind === 'clean-swipe') stage.areas.forEach((area) => keys.add(cleanVisualKey(stage.id, area.id)));
            }
            registry.keys = [...keys]; registry.frames = registry.keys.map((key) => new SpriteFrame(key)); host.visualAssets = registry;
        }
        const run = canvas.addComponent(RunController); run.timeLabel = label('Time', header); run.mistakeLabel = label('Mistakes', header);
        const manager = canvas.addComponent(LevelManager); manager.runController = run; manager.stageHost = host;
        if (autoStart !== undefined) manager.autoStartOnSceneLoad = autoStart;
        for (const key of ['chapterLabel', 'levelLabel', 'levelTitleLabel', 'stageLabel', 'statusLabel']) manager[key] = label(key, header);
        manager.tutorialHint = node('TutorialHint', canvas); manager.tutorialLabel = label('TutorialLabel', manager.tutorialHint);
        manager.completePanel = node('CompletePanel', canvas); manager.completeLabel = label('CompleteLabel', manager.completePanel);
        manager.completeDetailLabel = label('CompleteDetail', manager.completePanel);
        manager.nextButton = node('NextButton', manager.completePanel).addComponent(Button);
        manager.actionButtonLabel = label('ActionLabel', manager.nextButton.node);
        const audio = wireAudio(canvas); manager.audioFeedback = audio;
        let homeController = null;
        if (home) {
            const controllerNode = node('HomeController', canvas); homeController = controllerNode.addComponent(HomeController);
            homeController.levelManager = manager; homeController.overlay = node('HomeOverlay', canvas);
            homeController.startButton = node('StartButton', homeController.overlay).addComponent(Button);
            homeController.soundButton = node('SoundButton', homeController.overlay).addComponent(Button);
            homeController.soundStateLabel = label('SoundState', homeController.soundButton.node); homeController.audioFeedback = audio;
        }
        if (boot) mock.boot(canvas);
        return { canvas, manager, host, run, audio, home: homeController };
    }
    const currentStage = (host) => {
        const current = host.node.children.find((entry) => entry.active); assert.ok(current, 'An active Stage is required');
        return current.getComponent(DragMatchStageController) || current.getComponent(CableConnectStageController) || current.getComponent(CleanSwipeStageController);
    };
    function finishStage(stage) {
        if (stage instanceof DragMatchStageController) {
            active(stage.itemNodes).forEach((item) => { drop(item, item.getComponent(DraggableItem).target.worldPosition); mock.flush(item); });
        } else if (stage instanceof CableConnectStageController) {
            active(stage.cableNodes).forEach((cable) => { const connector = cable.getComponent(CableConnector); drop(connector.head, connector.currentPort.worldPosition); mock.flush(connector.head); });
        } else {
            for (const cell of stage.cellNodes) { emit(stage.inputSurface, 'TOUCH_START', cell.worldPosition); emit(stage.inputSurface, 'TOUCH_END', cell.worldPosition); }
            mock.flush();
        }
    }
    const drainAudio = (audio) => { for (let count = 0; count < 100 && audio.queuedSoundCount > 0; count += 1) audio.audioSource.node.emit(AudioSource.EventType.ENDED, {}); };

    test('home idles without a Stage, running clock or background sound', () => {
        const f = fixture(); assert.equal(f.manager.hasStarted, false); assert.equal(f.home.overlay.active, true);
        assert.equal(f.host.cachedStageCount, 0); assert.equal(f.host.currentKind, null); assert.equal(f.run.isLevelRunning, false);
        f.run.update(30); f.run.advanceTime(30); assert.equal(f.run.currentElapsedMs, 0); assert.equal(f.audio.audioSource.plays.length, 0);
    });
    test('one real start click opens first order and its first stage', () => {
        const f = fixture(); click(f.home.startButton); assert.equal(f.manager.hasStarted, true); assert.equal(f.home.overlay.active, false);
        assert.equal(f.manager.currentOrderIndex, 0); assert.equal(f.manager.currentStageIndex, 0); assert.equal(f.host.cachedStageCount, 1);
        assert.equal(f.run.isLevelRunning, true); f.run.advanceTime(0.4); assert.equal(f.run.currentElapsedMs, 400);
    });
    test('rapid repeated starts cannot recreate a stage, reset time or duplicate the start cue', () => {
        const f = fixture(); click(f.home.startButton); f.run.advanceTime(1); const generation = f.host.currentGeneration, sounds = f.audio.audioSource.plays.length;
        for (let index = 0; index < 20; index += 1) { click(f.home.startButton); assert.equal(f.home.startRepair(), false); assert.equal(f.manager.startFirstOrder(), false); }
        assert.equal(f.host.currentGeneration, generation); assert.equal(f.run.currentElapsedMs, 1000); assert.equal(f.audio.audioSource.plays.length, sounds);
    });
    test('Home disable and re-enable binds each button once and never starts the order', () => {
        const f = fixture(); for (let count = 0; count < 3; count += 1) {
            f.home.enabled = false; assert.equal(f.home.startButton.node.listenerCount(), 0); assert.equal(f.home.soundButton.node.listenerCount(), 0);
            f.home.enabled = true; assert.equal(f.home.startButton.node.listenerCount(), 1); assert.equal(f.home.soundButton.node.listenerCount(), 1);
        }
        f.manager.enabled = false; f.manager.enabled = true; assert.equal(f.manager.hasStarted, false); assert.equal(f.run.isLevelRunning, false);
    });
    test('destroyed Home releases exact listeners and cannot start from a stale click', () => {
        const f = fixture(), start = f.home.startButton, sound = f.home.soundButton; f.home.destroy();
        assert.equal(start.node.listenerCount(), 0); assert.equal(sound.node.listenerCount(), 0); click(start); assert.equal(f.manager.hasStarted, false);
    });
    test('legacy LevelManager default autoStart remains true and boots the existing first order', () => {
        const f = fixture({ home: false, boot: false }); assert.equal(new LevelManager().autoStartOnSceneLoad, true);
        f.manager.autoStartOnSceneLoad = true; mock.boot(f.canvas); assert.equal(f.manager.hasStarted, true); assert.equal(f.run.isLevelRunning, true);
    });
    test('sound toggle changes session state without starting an order', () => {
        const f = fixture(); click(f.home.soundButton); assert.equal(f.audio.isSoundEnabled, false); assert.match(f.home.soundStateLabel.string, /关/);
        click(f.home.soundButton); assert.equal(f.audio.isSoundEnabled, true); assert.match(f.home.soundStateLabel.string, /开/);
        assert.equal(f.manager.hasStarted, false); assert.equal(f.host.cachedStageCount, 0); assert.equal(f.run.isLevelRunning, false);
    });
    test('audio stays silent before a gesture and allows a new event after unlocking', () => {
        const f = fixture(); assert.equal(f.audio.isUnlocked, false); assert.equal(f.audio.play('success', 'locked'), false);
        assert.equal(f.audio.audioSource.plays.length, 0); f.audio.unlockFromUserGesture(); assert.equal(f.audio.play('success', 'unlocked'), true);
        assert.equal(f.audio.audioSource.plays.length, 1);
    });
    test('muting prevents playback and re-enabling restores distinct events', () => {
        const f = fixture(); f.audio.unlockFromUserGesture(); f.audio.setSoundEnabled(false);
        assert.equal(f.audio.play('success', 'mute'), false); assert.equal(f.audio.audioSource.plays.length, 0);
        f.audio.setSoundEnabled(true); assert.equal(f.audio.play('success', 'new'), true); assert.equal(f.audio.audioSource.plays.length, 1);
    });
    test('audio deduplicates an event key while preserving different completion events', () => {
        const f = fixture(); f.audio.unlockFromUserGesture(); assert.equal(f.audio.play('order-complete', 'order:1'), true);
        for (let count = 0; count < 5; count += 1) assert.equal(f.audio.play('order-complete', 'order:1'), false);
        assert.equal(f.audio.play('order-complete', 'order:2'), true); drainAudio(f.audio); assert.equal(f.audio.audioSource.plays.length, 2);
    });
    test('queued clean and order completion remain separate clips in the intended order', () => {
        const f = fixture(); f.audio.unlockFromUserGesture(); f.audio.play('clean-complete', 'clean:1'); f.audio.play('order-complete', 'order:1');
        drainAudio(f.audio); assert.deepEqual(f.audio.audioSource.plays.map((call) => call.clip.name), ['cleanComplete', 'orderComplete']);
    });
    test('audio disable/destroy clears queue and detaches exact STARTED/ENDED observers', () => {
        const f = fixture(); f.audio.unlockFromUserGesture(); f.audio.play('success', 'one'); f.audio.play('order-complete', 'two');
        const sourceNode = f.audio.audioSource.node;
        const observerCount = (eventType) => sourceNode.listeners.get(eventType)?.length ?? 0;
        f.audio.enabled = false; assert.equal(f.audio.queuedSoundCount, 0); assert.equal(sourceNode.listenerCount(), 0);
        assert.equal(observerCount(AudioSource.EventType.STARTED), 0); assert.equal(observerCount(AudioSource.EventType.ENDED), 0);
        const before = f.audio.audioSource.plays.length; sourceNode.emit(AudioSource.EventType.ENDED, {}); assert.equal(f.audio.audioSource.plays.length, before);
        f.audio.enabled = true; f.audio.onEnable(); assert.equal(sourceNode.listenerCount(), 2);
        assert.equal(observerCount(AudioSource.EventType.STARTED), 1); assert.equal(observerCount(AudioSource.EventType.ENDED), 1);
        f.audio.destroy(); assert.equal(sourceNode.listenerCount(), 0);
        assert.equal(observerCount(AudioSource.EventType.STARTED), 0); assert.equal(observerCount(AudioSource.EventType.ENDED), 0);
    });
    test('one erroneous input release cannot duplicate mistake audio or score on repeated END', () => {
        const f = fixture(); click(f.home.startButton); f.audio.stopPlayback(); f.audio.audioSource.plays.length = 0;
        const stage = currentStage(f.host), item = stage.itemNodes[0], wrong = stage.targetNodes[1].worldPosition;
        drop(item, wrong); for (let index = 0; index < 4; index += 1) emit(item, 'TOUCH_END', wrong);
        drainAudio(f.audio); assert.equal(f.run.currentMistakes, 1); assert.deepEqual(f.audio.audioSource.plays.map((call) => call.clip.name), ['mistake']);
    });
    test('clean completion emits one clean and one settlement cue despite stale repeated callbacks', () => {
        const f = fixture(); click(f.home.startButton); f.manager.loadOrder(3); const old = f.manager.installedCallbacks;
        f.audio.audioSource.plays.length = 0; finishStage(currentStage(f.host)); old.onComplete(); old.onComplete();
        drainAudio(f.audio); assert.deepEqual(f.audio.audioSource.plays.map((call) => call.clip.name), ['cleanComplete', 'orderComplete']); assert.equal(f.run.levelResults.length, 1);
    });
    test('audio missing clip and playback failure degrade without affecting the run', () => {
        const f = fixture(); f.audio.unlockFromUserGesture(); f.audio.successClip = null; assert.equal(f.audio.play('success', 'missing'), false);
        f.audio.audioSource.play = () => { throw new Error('Unavailable audio device'); }; assert.doesNotThrow(() => f.audio.play('ui-click', 'blocked'));
        assert.equal(f.run.currentElapsedMs, 0); assert.equal(f.run.levelResults.length, 0);
    });
    test('result stars show one, two and three earned frames and reset explicitly', () => {
        const root = node('ResultStars'), stars = root.addComponent(ResultStars); stars.earnedFrame = new SpriteFrame('earned'); stars.emptyFrame = new SpriteFrame('empty');
        stars.starSprites = [0, 1, 2].map((i) => node(`Star${i}`, root).addComponent(Sprite)); mock.boot(root);
        for (const rating of [1, 2, 3]) { stars.show(rating); assert.equal(stars.starSprites.filter((sprite) => sprite.spriteFrame === stars.earnedFrame).length, rating); }
        stars.reset(); assert.equal(stars.starSprites.filter((sprite) => sprite.spriteFrame === stars.earnedFrame).length, 0);
    });
    test('Day 4 immutable order coordinates, identities, thresholds and scoring source remain byte-identical', () => {
        const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/validation/day5a/baseline.json'), 'utf8'));
        for (const filename of ['LevelCatalog.ts', 'OrderCatalog.ts', 'StageDefinition.ts', 'OrderDefinition.ts']) {
            const relative = `assets/scripts/data/${filename}`, expected = baseline.trackedFiles.find((entry) => entry.path === relative);
            assert.ok(expected); const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', relative))).digest('hex'); assert.equal(actual, expected.sha256, relative);
        }
    });
    test('home-started nine-order run executes thirteen stages, settlement and replay without changing totals', () => {
        const f = fixture({ visuals: true }); click(f.home.startButton); let completed = 0;
        for (const [index, order] of ORDER_CATALOG.entries()) {
            for (let step = 0; step < order.stages.length; step += 1) { f.run.advanceTime(1); finishStage(currentStage(f.host)); completed += 1; }
            assert.equal(f.run.levelResults.length, index + 1); if (index < 8) click(f.manager.nextButton);
        }
        assert.equal(completed, 13); assert.equal(f.run.summary.completedOrders, 9); assert.equal(f.run.summary.totalElapsedMs, 13000);
        assert.equal(f.run.summary.earnedStars, 27); assert.equal(f.manager.state, GameState.DemoComplete); assert.equal(f.manager.actionButtonLabel.string, '重新挑战');
        click(f.manager.nextButton); assert.equal(f.manager.currentOrderIndex, 0); assert.equal(f.manager.currentStageIndex, 0); assert.equal(f.run.levelResults.length, 0);
        assert.equal(f.run.currentElapsedMs, 0); assert.equal(currentStage(f.host).progress.completed, 0); assert.equal(f.home.overlay.active, false);
    });

    const definitions = ORDER_CATALOG.flatMap((order) => order.stages);
    test('all nineteen stable device IDs resolve distinctly and do not depend on translated labels', () => {
        const mapped = new Set();
        for (const stage of definitions.filter((entry) => entry.kind === 'drag-match')) {
            for (const pair of stage.pairs) { const expected = `devices/${pair.id}`; assert.equal(dragVisualKey(stage.id, pair.id), expected); mapped.add(pair.id); }
        }
        assert.equal(DEVICE_KEYS.length, 19); assert.deepEqual([...mapped].sort(), [...DEVICE_KEYS].sort());
        assert.throws(() => dragVisualKey('drag-1', '鼠标'), /drag-1\/鼠标/);
        assert.throws(() => dragVisualKey('unknown', 'mouse'), /unknown\/mouse/);
    });
    test('every cable endpoint resolves to an explicit head and matching port shape across four orders', () => {
        const shapes = new Set(); let count = 0;
        for (const stage of definitions.filter((entry) => entry.kind === 'cable-connect')) for (const cable of stage.cables) {
            const head = cableVisualKey(stage.id, cable.id, 'head'), port = cableVisualKey(stage.id, cable.id, 'port');
            assert.match(head, /^ports\/[a-z]+-head$/); assert.equal(head.replace(/-head$/, '-port'), port); shapes.add(head); count += 1;
        }
        assert.equal(count, 12); assert.ok(shapes.size >= 6); assert.throws(() => cableVisualKey('computer-cables', 'unknown', 'head'), /unknown/);
    });
    test('all three cleaning definitions resolve to distinct clean device backgrounds', () => {
        const keys = definitions.filter((entry) => entry.kind === 'clean-swipe').flatMap((stage) => stage.areas.map((area) => cleanVisualKey(stage.id, area.id)));
        assert.deepEqual(keys, ['workbench/keyboard-clean', 'workbench/mouse-clean', 'workbench/case-clean']);
        assert.throws(() => cleanVisualKey('shell-clean', 'keyboard'), /shell-clean\/keyboard/);
    });
    test('real registry validates Inspector arrays and rejects missing, duplicate or misaligned references', () => {
        const registry = node('Registry').addComponent(VisualAssetRegistry), frame = new SpriteFrame('mouse');
        registry.keys = ['devices/mouse']; registry.frames = [frame]; registry.validateBindings(); assert.equal(registry.requireFrame('devices/mouse'), frame);
        assert.throws(() => registry.requireFrame('devices/missing'), /devices\/missing/);
        registry.keys.push('devices/mouse'); registry.frames.push(frame); assert.throws(() => registry.validateBindings(), /unique/);
        registry.keys = ['devices/mouse']; assert.throws(() => registry.validateBindings(), /aligned/);
    });
    function elementFixture() {
        const root = node('InputItem'), visual = root.addComponent(ElementVisual); root.getComponent(UITransform).setContentSize(180, 140);
        root.setPosition(35, -42, 0); root.setScale(0.8, 0.9, 1); visual.icon = node('Icon', root).addComponent(Sprite);
        visual.caption = label('Caption', root); visual.checkMarker = node('Check', root); mock.boot(root); return { root, visual };
    }
    test('ElementVisual keeps root hitbox, position, scale and input listeners intact', () => {
        const { root, visual } = elementFixture(), handler = () => {}; root.on(Node.EventType.TOUCH_START, handler, visual);
        visual.configure(new SpriteFrame('keyboard', 320, 160), 'devices/keyboard', '键盘', 180, 140, false);
        assert.deepEqual([root.getComponent(UITransform).width, root.getComponent(UITransform).height], [180, 140]);
        assert.deepEqual([root.position.x, root.position.y, root.scale.x, root.scale.y], [35, -42, 0.8, 0.9]);
        assert.equal(root.listenerCount(), 1); assert.equal(visual.icon.node.listenerCount(), 0); assert.equal(visual.caption.node.listenerCount(), 0);
        assert.equal(visual.visualKey, 'devices/keyboard'); assert.equal(visual.caption.string, '键盘');
    });
    test('target silhouette keeps the same device frame with a muted color and readable caption', () => {
        const source = elementFixture(), target = elementFixture(), frame = new SpriteFrame('headset');
        source.visual.configure(frame, 'devices/headset', '耳机', 180, 140, false);
        target.visual.configure(frame, 'devices/headset', '耳机位置', 180, 140, true);
        assert.equal(source.visual.icon.spriteFrame, target.visual.icon.spriteFrame); assert.ok(target.visual.icon.color.a < source.visual.icon.color.a);
        assert.notEqual(target.visual.caption.string, source.visual.caption.string); assert.equal(target.visual.visualKey, source.visual.visualKey);
    });
    test('pooled ElementVisual updates its frame and clears completed state and tween when reconfigured', () => {
        const { visual } = elementFixture(), first = new SpriteFrame('mouse'), next = new SpriteFrame('battery');
        visual.configure(first, 'devices/mouse', '鼠标', 180, 140, false); visual.showComplete();
        const old = mock.tweens.at(-1); assert.equal(visual.isComplete, true); assert.equal(visual.checkMarker.active, true);
        visual.configure(next, 'devices/battery', '电池', 180, 140, false); assert.equal(old.stopped, true); old.flush(); old.callCallbacks();
        assert.equal(visual.isComplete, false); assert.equal(visual.checkMarker.active, false); assert.equal(visual.visualKey, 'devices/battery'); assert.equal(visual.icon.spriteFrame, next);
    });
    test('decoration completion is idempotent and disable/destroy stop owned tweens', () => {
        for (const destroy of [false, true]) {
            const { visual } = elementFixture(); visual.configure(new SpriteFrame('usb'), 'devices/usb', 'USB', 180, 140, false);
            visual.showComplete(); const old = mock.tweens.at(-1), count = mock.tweens.length; visual.showComplete(); assert.equal(mock.tweens.length, count);
            if (destroy) visual.destroy(); else visual.enabled = false; assert.equal(old.stopped, true);
        }
    });
    test('missing element Inspector references fail explicitly instead of producing an empty device', () => {
        const visual = node('Unbound').addComponent(ElementVisual);
        assert.throws(() => visual.configure(new SpriteFrame(), 'devices/mouse', '鼠标', 180, 140, false), /Bind icon, caption and checkMarker/);
    });
    test('clean device artwork changes across reused orders without altering InputSurface hitbox or adding listeners', () => {
        const root = node('CleanStage'), input = node('InputSurface', root), visual = root.addComponent(CleanDeviceVisual);
        input.getComponent(UITransform).setContentSize(680, 560); visual.device = node('Device', root).addComponent(Sprite);
        const registry = node('Registry').addComponent(VisualAssetRegistry);
        const clean = definitions.filter((entry) => entry.kind === 'clean-swipe');
        registry.keys = clean.map((stage) => cleanVisualKey(stage.id, stage.areas[0].id)); registry.frames = registry.keys.map((key) => new SpriteFrame(key));
        for (const [index, definition] of clean.entries()) {
            visual.configure(registry, definition); assert.equal(visual.device.spriteFrame, registry.frames[index]);
            assert.deepEqual([input.getComponent(UITransform).width, input.getComponent(UITransform).height], [680, 560]);
            assert.equal(visual.device.node.listenerCount(), 0); assert.equal(visual.device.node.getComponent(Button), null);
        }
    });
    test('StageHost reuses actual drag nodes while updating icons, labels and completed checks for mouse parts', () => {
        const f = fixture({ visuals: true }); click(f.home.startButton); const drag = currentStage(f.host), items = drag.itemNodes.slice();
        drop(items[0], drag.targetNodes[0].worldPosition); mock.flush(items[0]);
        assert.equal(items[0].getComponent(ElementVisual).isComplete, true); assert.equal(drag.targetNodes[0].getComponent(ElementVisual).isComplete, true);
        f.manager.loadOrder(5); assert.equal(f.host.currentKind, 'clean-swipe'); finishStage(currentStage(f.host));
        assert.equal(currentStage(f.host), drag); assert.deepEqual(drag.itemNodes.slice(0, 2), items.slice(0, 2));
        for (const [index, key] of ['battery', 'wheel'].entries()) {
            const item = drag.itemNodes[index], visual = item.getComponent(ElementVisual), target = drag.targetNodes[index].getComponent(ElementVisual);
            assert.equal(visual.visualKey, `devices/${key}`); assert.equal(visual.icon.spriteFrame.name, `devices/${key}`); assert.equal(target.icon.spriteFrame, visual.icon.spriteFrame);
            assert.equal(visual.isComplete, false); assert.equal(target.isComplete, false); assert.equal(item.listenerCount(), 4);
        }
        assert.equal(drag.itemNodes[2].active, false); assert.equal(drag.itemNodes[2].listenerCount(), 0);
    });
    test('reused cleaning Stage changes its device and restores all dirt before stale fade callbacks run', () => {
        const f = fixture({ visuals: true }); click(f.home.startButton); f.manager.loadOrder(3); const stage = currentStage(f.host);
        const cell = stage.cellNodes[0], original = stage.cellNodes.slice(); emit(stage.inputSurface, 'TOUCH_START', cell.worldPosition); emit(stage.inputSurface, 'TOUCH_END', cell.worldPosition);
        const old = mock.tweens.filter((entry) => entry.target === cell.getComponent(UIOpacity)).at(-1); assert.ok(old);
        f.manager.loadOrder(8); assert.equal(currentStage(f.host), stage); assert.equal(stage.deviceVisual.device.spriteFrame.name, 'workbench/case-clean');
        assert.deepEqual(stage.cellNodes.slice(0, original.length), original); assert.equal(stage.cleanedCells, 0); assert.equal(stage.totalCells, 35);
        assert.equal(old.stopped, true); old.flush(); old.callCallbacks();
        for (const entry of stage.cellNodes) { assert.equal(entry.active, true); assert.equal(entry.getComponent(UIOpacity).opacity, 255); }
        assert.equal(stage.inputSurface.listenerCount(), 4); assert.deepEqual([stage.inputSurface.getComponent(UITransform).width, stage.inputSurface.getComponent(UITransform).height], [680, 560]);
    });
    test('disabling Manager stops owned result star animation while preserving the settled rating', () => {
        const f = fixture({ boot: false }), stars = f.manager.completePanel.addComponent(ResultStars);
        stars.starSprites = [0, 1, 2].map((i) => node(`Star${i}`, stars.node).addComponent(Sprite));
        stars.earnedFrame = new SpriteFrame('earned'); stars.emptyFrame = new SpriteFrame('empty'); f.manager.resultStars = stars;
        mock.boot(f.canvas); click(f.home.startButton); finishStage(currentStage(f.host));
        assert.equal(stars.displayedStars, 3); const owned = mock.tweens.filter((entry) => stars.starSprites.some((sprite) => sprite.node === entry.target)); assert.equal(owned.length, 3);
        f.manager.enabled = false; assert.ok(owned.every((entry) => entry.stopped)); assert.equal(stars.displayedStars, 3);
        assert.ok(stars.starSprites.every((sprite) => sprite.spriteFrame === stars.earnedFrame));
    });
    test('Day 3 and Day 4 verification evidence remains byte-identical to the captured baseline', () => {
        const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/validation/day5a/baseline.json'), 'utf8'));
        const historic = baseline.trackedFiles.filter((entry) => /^docs\/validation\/day[34]\//.test(entry.path)); assert.ok(historic.length > 50);
        for (const entry of historic) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', entry.path))).digest('hex'), entry.sha256, entry.path);
    });

    return groups;
}

module.exports = { runDay5ATests };
