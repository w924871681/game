'use strict';

// Compiled production views and controllers, using the existing finite event/UI
// mock. No rendering, native input, Editor serialization or audible playback is claimed.
const assert = require('node:assert/strict');

function runDay5AV2Tests(runtime) {
    const { mock, load, GameController, DraggableItem, RunController } = runtime;
    const { Node, UITransform, Label, Button, EventTouch, Prefab, Graphics, Sprite, SpriteFrame, UIOpacity, AudioSource, AudioClip } = mock.cc;
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
    const { PaperOrderHUD } = load('ui/PaperOrderHUD.ts');
    const { V2ResultView } = load('ui/V2ResultView.ts');
    const { ButtonPressFeedback } = load('ui/ButtonPressFeedback.ts');
    const { WorkshopDecoration } = load('ui/WorkshopDecoration.ts');
    let groups = 0;
    const test = (name, action) => { action(); groups++; console.log(`PASS Day 5A V2: ${name}`); };
    const node = (name, parent = null) => { const n = new Node(name); n.addComponent(UITransform); n.parent = parent; return n; };
    const label = (name, parent) => node(name, parent).addComponent(Label);
    const click = button => button.node.emit(Button.EventType.CLICK, {});
    const touch = (target, type, id = 0, point = target.worldPosition) => {
        const event = new EventTouch(id, point); target.emit(Node.EventType[type], event); return event;
    };
    const lastTween = target => mock.tweens.filter(value => value.target === target).at(-1);
    const scale = n => [n.scale.x, n.scale.y, n.scale.z];
    function hudFixture(parent = null) {
        const root = node('PaperOrderHUD', parent), hud = root.addComponent(PaperOrderHUD);
        for (const key of ['chapterLabel', 'orderLabel', 'titleLabel', 'stepLabel', 'instructionLabel', 'progressLabel', 'cleanPercentLabel']) hud[key] = label(key, root);
        for (const key of ['dragGroup', 'cableGroup', 'cleanGroup']) hud[key] = node(key, root);
        hud.cleanTrack = node('Track', hud.cleanGroup).getComponent(UITransform); hud.cleanTrack.setContentSize(400, 20);
        hud.cleanFill = node('Fill', hud.cleanGroup).getComponent(UITransform); hud.cleanFill.setContentSize(400, 20);
        return hud;
    }
    function resultFixture(parent = null) {
        const root = node('CompletePanel', parent), view = root.addComponent(V2ResultView);
        view.modalShade = node('ModalShade', parent); view.modalShade.active = false;
        view.orderGroup = node('OrderResultGroup', root); view.finalGroup = node('FinalSummaryGroup', root);
        view.starContainer = node('Stars', view.orderGroup); view.primaryButtonRoot = node('NextButton', root);
        for (const key of ['orderBadgeLabel', 'scoreLabel', 'timeLabel', 'mistakeLabel', 'stepsLabel']) view[key] = label(key, view.orderGroup);
        for (const key of ['summaryOrdersLabel', 'summaryStarsLabel', 'summaryScoreLabel', 'summaryStepsLabel', 'summaryTimeLabel', 'summaryMistakesLabel']) view[key] = label(key, view.finalGroup);
        const stars = view.starContainer.addComponent(ResultStars);
        stars.starSprites = [0, 1, 2].map(i => node(`Star${i}`, view.starContainer).addComponent(Sprite));
        stars.earnedFrame = new SpriteFrame('gold'); stars.emptyFrame = new SpriteFrame('empty');
        return { view, stars };
    }
    function pressFixture(parent = null) {
        const root = node('Button', parent), button = root.addComponent(Button), feedback = root.addComponent(ButtonPressFeedback);
        root.getComponent(UITransform).setContentSize(496, 92); root.setPosition(25, -390, 0);
        const visual = node('Visual', root); visual.setScale(1.2, 0.9, 1);
        feedback.button = button; feedback.visualRoot = visual;
        return { root, button, feedback, visual };
    }
    function element(name, extra) {
        return new Prefab(() => { const n = node(name); n.addComponent(Sprite); label('Label', n); extra?.(n); return n; });
    }
    function dragRoot() {
        const n = node('DragMatchStage'), stage = n.addComponent(DragMatchStageController);
        stage.gameController = n.addComponent(GameController);
        stage.itemPrefab = element('DragItem', item => item.addComponent(DraggableItem)); stage.targetPrefab = element('DragTarget'); return n;
    }
    function cableRoot() {
        const n = node('CableConnectStage'), stage = n.addComponent(CableConnectStageController);
        stage.cablePrefab = new Prefab(() => {
            const root = node('Cable'), connector = root.addComponent(CableConnector);
            connector.head = node('Head', root); connector.head.addComponent(Sprite); label('Label', connector.head);
            connector.anchor = node('Anchor', root); connector.line = node('Line', root).addComponent(Graphics); return root;
        }); stage.portPrefab = element('Port'); return n;
    }
    function cleanRoot() {
        const n = node('CleanSwipeStage'), stage = n.addComponent(CleanSwipeStageController);
        stage.inputSurface = node('InputSurface', n); stage.inputSurface.getComponent(UITransform).setContentSize(680, 560);
        stage.dirtLayer = node('DirtLayer', stage.inputSurface);
        stage.dirtCellPrefab = new Prefab(() => { const cell = node('DirtCell'); cell.addComponent(Sprite); cell.addComponent(UIOpacity); return cell; }); return n;
    }
    function fixture(orders = ORDER_CATALOG.slice(0, 2)) {
        const root = node('Canvas'), manager = root.addComponent(LevelManager), run = root.addComponent(RunController);
        const host = node('StageHost', root).addComponent(StageHost);
        Object.assign(host, { dragMatchPrefab: new Prefab(dragRoot), cableConnectPrefab: new Prefab(cableRoot), cleanSwipePrefab: new Prefab(cleanRoot) });
        run.timeLabel = label('Time', root); run.mistakeLabel = label('Mistakes', root);
        Object.assign(manager, { orders, autoStartOnSceneLoad: false, stageHost: host, runController: run });
        for (const key of ['chapterLabel', 'levelLabel', 'levelTitleLabel', 'stageLabel', 'statusLabel']) manager[key] = label(key, root);
        manager.tutorialHint = node('Tutorial', root); manager.tutorialLabel = label('TutorialText', manager.tutorialHint);
        const { view, stars } = resultFixture(root); manager.completePanel = view.node;
        manager.completeLabel = label('LegacyTitle', view.node); manager.completeDetailLabel = label('LegacyDetail', view.node);
        manager.nextButton = view.primaryButtonRoot.addComponent(Button); manager.actionButtonLabel = label('Action', manager.nextButton.node);
        manager.resultStars = stars; manager.resultView = view; manager.hudView = hudFixture(root);
        const audio = root.addComponent(AudioFeedback); audio.audioSource = root.addComponent(AudioSource);
        for (const name of ['uiClick', 'success', 'mistake', 'cleanComplete', 'stageComplete', 'orderComplete', 'runComplete']) audio[`${name}Clip`] = new AudioClip(name);
        manager.audioFeedback = audio;
        const home = root.addComponent(HomeController), start = pressFixture(node('HomeOverlay', root));
        Object.assign(home, { levelManager: manager, audioFeedback: audio, overlay: start.root.parent, startButton: start.button,
            soundButton: node('Sound', root).addComponent(Button), homeButton: node('ReturnHome', view.finalGroup).addComponent(Button) });
        home.soundStateLabel = label('SoundState', home.soundButton.node);
        view.node.active = false; mock.boot(root);
        return { root, manager, run, host, home, audio, view, stars, start };
    }
    function current(f) {
        const n = f.host.node.children.find(value => value.active); assert.ok(n, 'Current Stage required');
        return n.getComponent(DragMatchStageController) || n.getComponent(CableConnectStageController) || n.getComponent(CleanSwipeStageController);
    }
    function solveOrder(f) {
        let stages = 0;
        while (f.manager.hasStarted && f.manager.state === GameState.Playing) {
            const stage = current(f);
            if (stage instanceof DragMatchStageController) for (const item of stage.itemNodes.filter(n => n.active)) {
                touch(item, 'TOUCH_START'); touch(item, 'TOUCH_END', 0, item.getComponent(DraggableItem).target.worldPosition); mock.flush(item);
            } else if (stage instanceof CableConnectStageController) for (const n of stage.cableNodes.filter(value => value.active)) {
                const cable = n.getComponent(CableConnector); touch(cable.head, 'TOUCH_START'); touch(cable.head, 'TOUCH_END', 0, cable.currentPort.worldPosition); mock.flush(cable.head);
            } else for (const cell of stage.cellNodes) {
                touch(stage.inputSurface, 'TOUCH_START', 0, cell.worldPosition); touch(stage.inputSurface, 'TOUCH_END', 0, cell.worldPosition);
            }
            assert.ok(++stages <= 4, 'At most configured Stage count should be solved');
        }
    }
    function finishRun(f) {
        click(f.home.startButton);
        for (let index = 0; index < f.manager.orders.length; index++) {
            f.run.advanceTime(index + 1); solveOrder(f);
            if (index + 1 < f.manager.orders.length) click(f.manager.nextButton);
        }
        assert.equal(f.manager.state, GameState.DemoComplete);
    }
    const goldCount = stars => stars.starSprites.filter(sprite => sprite.spriteFrame === stars.earnedFrame).length;

    test('paper HUD separates dynamic order/chapter/title/step/instruction without mutating the catalog', () => {
        const hud = hudFixture(), order = ORDER_CATALOG[8]; hud.showStage(order, 8, 12, 1);
        assert.equal(hud.chapterLabel.string, order.chapterTitle); assert.equal(hud.orderLabel.string, '订单 9 / 12');
        assert.equal(hud.titleLabel.string, order.title); assert.equal(hud.stepLabel.string, '步骤 2 / 3');
        assert.equal(hud.instructionLabel.string, order.stages[1].instruction); assert.ok(Object.isFrozen(order));
    });
    test('drag and cable show actual n/N while zero/invalid progress remains bounded', () => {
        const hud = hudFixture(); hud.showStage(ORDER_CATALOG[0], 0, 2, 0); hud.showProgress({ completed: 2, total: 3 });
        assert.equal(hud.progressLabel.string, '已归位 2 / 3'); hud.showProgress({ completed: 9, total: 0 }); assert.equal(hud.progressLabel.string, '已归位 0 / 0');
        hud.showStage(ORDER_CATALOG[4], 4, 9, 0); hud.showProgress({ completed: 1, total: 3 }); assert.equal(hud.progressLabel.string, '已连接 1 / 3');
        hud.showProgress({ completed: NaN, total: Infinity }); assert.equal(hud.progressLabel.string, '已连接 0 / 0');
    });
    test('clean progress uses the real required-cell denominator once: 16/28=57, 27/28=96, 28/28=100', () => {
        const hud = hudFixture(); hud.showStage(ORDER_CATALOG[3], 3, 9, 0);
        for (const [completed, expected] of [[16, 57], [27, 96], [28, 100]]) {
            hud.showProgress({ completed, total: 28 }); assert.equal(hud.cleanPercentLabel.string, `清洁进度 ${expected}%`);
            assert.equal(hud.progressLabel.string, ''); assert.equal(hud.progressLabel.node.active, false);
        }
        assert.equal(hud.cleanGroup.active, true); assert.equal(hud.dragGroup.active, false); assert.equal(hud.cableGroup.active, false);
    });
    test('clean bar follows track resize without changing fill height or any input root', () => {
        const hud = hudFixture(); hud.showStage(ORDER_CATALOG[3], 3, 9, 0); hud.showProgress({ completed: 14, total: 28 });
        assert.equal(hud.cleanFill.width, 200); hud.cleanTrack.setContentSize(494, 76); hud.lateUpdate();
        assert.equal(hud.cleanFill.width, 247); assert.equal(hud.cleanFill.height, 20);
        hud.showProgress({ completed: 0, total: 0 }); assert.equal(hud.cleanFill.width, 0);
    });
    test('HUD switching and clear remove old cleaning percentage and decoration state', () => {
        const hud = hudFixture(); hud.showStage(ORDER_CATALOG[3], 3, 9, 0); hud.showProgress({ completed: 16, total: 28 });
        hud.showStage(ORDER_CATALOG[0], 0, 9, 0); assert.equal(hud.cleanGroup.active, false); assert.equal(hud.cleanPercentLabel.node.active, false);
        assert.equal(hud.dragGroup.active, true); assert.equal(hud.progressLabel.node.active, true);
        hud.clear(); assert.equal(hud.cleanFill.width, 0); assert.equal(hud.dragGroup.active, false); assert.equal(hud.progressLabel.string, '');
    });
    test('single-order view displays frozen score/time/mistakes once and shows only its own group', () => {
        const { view } = resultFixture(); const result = Object.freeze({ levelId: 4, elapsedMs: 28700, mistakes: 1, score: 620, stars: 2 });
        view.showOrder(result, 4, 1); assert.equal(view.orderBadgeLabel.string, '完成订单 4'); assert.equal(view.scoreLabel.string, '620');
        assert.equal(view.timeLabel.string, '28.7 秒'); assert.equal(view.mistakeLabel.string, '1 次'); assert.equal(view.stepsLabel.string, '完成步骤 1 / 1');
        assert.equal(view.orderGroup.active, true); assert.equal(view.finalGroup.active, false); assert.equal(view.starContainer.active, true);
        assert.doesNotMatch([view.scoreLabel, view.timeLabel, view.mistakeLabel, view.stepsLabel].map(x => x.string).join(''), /★|☆|评价/);
        assert.ok(Object.isFrozen(result));
    });
    test('document example is actual RunController 28.7s + one mistake = 620 points and two matching Sprite stars', () => {
        const root = node('Run'), run = root.addComponent(RunController), { view, stars } = resultFixture();
        run.startNewRun(); run.beginLevel(4, ORDER_CATALOG[3].scoreRule); run.advanceTime(28.7); run.recordMistake();
        const result = run.finishLevel(); assert.equal(result.score, 620); assert.equal(result.stars, 2);
        view.showOrder(result, 4, 1); stars.show(result.stars); assert.equal(view.scoreLabel.string, '620'); assert.equal(goldCount(stars), 2);
    });
    test('final six values and star upper bound derive from supplied catalog sizes, without three full gold stars', () => {
        const { view } = resultFixture(); view.showRun(Object.freeze({ completedOrders: 4, earnedStars: 10, maxStars: 12, totalScore: 3110, totalElapsedMs: 123400, totalMistakes: 2 }), 4, 7, 7);
        assert.equal(view.summaryOrdersLabel.string, '4 / 4'); assert.equal(view.summaryStarsLabel.string, '10 / 12'); assert.equal(view.summaryScoreLabel.string, '3110');
        assert.equal(view.summaryStepsLabel.string, '7 / 7'); assert.equal(view.summaryTimeLabel.string, '123.4 秒'); assert.equal(view.summaryMistakesLabel.string, '2 次');
        assert.equal(view.starContainer.active, false); assert.equal(view.orderGroup.active, false); assert.equal(view.finalGroup.active, true);
    });
    test('result reuse restores the correct group and moves only the common action Button UI position', () => {
        const { view } = resultFixture(); view.primaryButtonRoot.setPosition(15, 10, 3); const size = view.primaryButtonRoot.getComponent(UITransform);
        view.showRun({ completedOrders: 1, earnedStars: 2, totalScore: 620, totalElapsedMs: 28700, totalMistakes: 1 }, 1, 1, 1);
        assert.equal(view.primaryButtonRoot.position.y, -436); view.showOrder({ score: 620, elapsedMs: 28700, mistakes: 1 }, 1, 1);
        assert.equal(view.primaryButtonRoot.position.y, -286); assert.equal(view.primaryButtonRoot.position.x, 15); assert.equal(view.primaryButtonRoot.position.z, 3);
        assert.equal(size.width, 100); assert.equal(view.starContainer.active, true); assert.equal(view.finalGroup.active, false);
        view.hide(); assert.equal(view.orderGroup.active, false); assert.equal(view.finalGroup.active, false);
    });
    test('modal shade is an independent sibling so the result panel scale never shrinks its full-size coverage', () => {
        const canvas = node('Canvas'), { view } = resultFixture(canvas), shade = view.modalShade;
        shade.getComponent(UITransform).setContentSize(720, 1280); mock.boot(canvas);
        view.showOrder({ score: 620, elapsedMs: 28700, mistakes: 1 }, 4, 1); view.node.setScale(0.8, 0.8, 1);
        assert.equal(shade.parent, canvas); assert.notEqual(shade.parent, view.node); assert.equal(shade.active, true);
        assert.deepEqual(scale(shade), [1, 1, 1]); assert.equal(shade.getComponent(UITransform).width, 720); assert.equal(shade.getComponent(UITransform).height, 1280);
        view.hide(); assert.equal(shade.active, false);
    });
    test('modal shade is cleared on result component disable and destroy, including during final celebration', () => {
        for (const destroy of [false, true]) {
            const canvas = node('Canvas'), { view } = resultFixture(canvas); mock.boot(canvas);
            view.showRun({ completedOrders: 1, earnedStars: 3, totalScore: 1000, totalElapsedMs: 0, totalMistakes: 0 }, 1, 1, 1);
            assert.equal(view.modalShade.active, true); if (destroy) view.destroy(); else view.enabled = false;
            assert.equal(view.modalShade.active, false);
        }
    });
    test('button feedback scales decoration only and preserves root hitbox, position, scale and propagation', () => {
        const f = pressFixture(); mock.boot(f.root); const position = [f.root.position.x, f.root.position.y], initialScale = scale(f.root);
        const event = touch(f.root, 'TOUCH_START'); assert.equal(event.propagationStopped, false); assert.equal(lastTween(f.visual).steps[0].duration, 0.06);
        mock.flush(f.visual); assert.deepEqual(scale(f.visual), [1.2 * 0.97, 0.9 * 0.97, 1]);
        touch(f.root, 'TOUCH_END'); assert.equal(lastTween(f.visual).steps[0].duration, 0.10); mock.flush(f.visual); assert.deepEqual(scale(f.visual), [1.2, 0.9, 1]);
        assert.deepEqual(scale(f.root), initialScale); assert.deepEqual([f.root.position.x, f.root.position.y], position);
        assert.equal(f.root.getComponent(UITransform).width, 496); assert.equal(f.root.getComponent(UITransform).height, 92);
    });
    test('button feedback respects touch ownership and CANCEL without generating clicks', () => {
        const f = pressFixture(); let clicks = 0; f.root.on(Button.EventType.CLICK, () => clicks++, f.feedback); mock.boot(f.root);
        touch(f.root, 'TOUCH_START', 0); const owned = lastTween(f.visual); touch(f.root, 'TOUCH_START', 2); touch(f.root, 'TOUCH_CANCEL', 2);
        assert.equal(lastTween(f.visual), owned); touch(f.root, 'TOUCH_CANCEL', 0); assert.notEqual(lastTween(f.visual), owned); mock.flush(f.visual);
        assert.deepEqual(scale(f.visual), [1.2, 0.9, 1]); assert.equal(clicks, 0);
    });
    test('button disable/destroy stops owned animation, restores decoration and preserves another owner listener', () => {
        for (const destroy of [false, true]) {
            const f = pressFixture(); const clickHandler = () => {}; f.root.on(Button.EventType.CLICK, clickHandler, f.button); mock.boot(f.root);
            touch(f.root, 'TOUCH_START'); const old = lastTween(f.visual); mock.flush(f.visual);
            if (destroy) f.feedback.destroy(); else f.feedback.enabled = false;
            assert.equal(old.stopped, true); old.flush(); old.callCallbacks(); assert.deepEqual(scale(f.visual), [1.2, 0.9, 1]); assert.equal(f.root.listenerCount(), 1);
        }
    });
    test('button repeated onEnable binds exactly three owned listeners; disabled Button cannot begin feedback', () => {
        const f = pressFixture(); mock.boot(f.root); f.feedback.onEnable(); f.feedback.onEnable(); assert.equal(f.root.listenerCount(), 3);
        f.button.interactable = false; const count = mock.tweens.length; touch(f.root, 'TOUCH_START'); assert.equal(mock.tweens.length, count);
        f.feedback.enabled = false; f.feedback.enabled = true; assert.equal(f.root.listenerCount(), 3);
    });
    test('feedback rejects its Button root or unrelated nodes as decoration', () => {
        for (const rootTarget of [true, false]) {
            const f = pressFixture(); f.feedback.visualRoot = rootTarget ? f.root : node('Unrelated'); mock.boot(f.root);
            const count = mock.tweens.length; touch(f.root, 'TOUCH_START'); assert.equal(mock.tweens.length, count); assert.equal(f.root.listenerCount(), 0);
        }
    });
    test('workshop entrance is finite, restart owns one tween, and disable restores both original transforms', () => {
        const root = node('Decoration'), decoration = root.addComponent(WorkshopDecoration), visual = node('Character', root);
        visual.setPosition(10, 15, 0); visual.setScale(0.8, 0.9, 1); decoration.visualRoot = visual; mock.boot(root);
        const old = lastTween(visual); assert.equal(old.steps.length, 3); decoration.play(); assert.equal(old.stopped, true);
        const next = lastTween(visual); decoration.enabled = false; assert.equal(next.stopped, true); old.flush(); next.flush(); old.callCallbacks();
        assert.deepEqual(scale(visual), [0.8, 0.9, 1]); assert.deepEqual([visual.position.x, visual.position.y], [10, 15]);
    });
    test('actual nine-order final Home closes all stages/results and stops time while preserving cache identities', () => {
        const f = fixture(ORDER_CATALOG); finishRun(f); const identities = f.host.node.children.slice(); click(f.home.homeButton);
        assert.equal(f.manager.hasStarted, false); assert.equal(f.home.overlay.active, true); assert.equal(f.manager.completePanel.active, false);
        assert.equal(f.host.currentKind, null); assert.ok(f.host.node.children.every(n => !n.active)); assert.deepEqual(f.host.node.children, identities);
        f.run.update(30); f.run.advanceTime(30); assert.equal(f.run.currentElapsedMs, 0); assert.equal(f.run.isLevelRunning, false);
        assert.equal(f.view.orderGroup.active, false); assert.equal(f.view.finalGroup.active, false); assert.equal(f.manager.nextButton.interactable, false);
    });
    test('Home return then rapid Start starts exactly one fresh order and repeated Home is harmless', () => {
        const f = fixture(); finishRun(f); let begins = 0; const begin = f.run.beginLevel.bind(f.run); f.run.beginLevel = (...args) => { begins++; begin(...args); };
        click(f.home.homeButton); click(f.home.homeButton); assert.equal(f.run.currentElapsedMs, 0);
        for (let i = 0; i < 6; i++) click(f.home.startButton);
        assert.equal(begins, 1); assert.equal(f.manager.currentOrderIndex, 0); assert.equal(f.manager.currentStageIndex, 0);
        assert.equal(f.home.overlay.active, false); assert.equal(f.host.cachedStageCount, 1); assert.equal(f.run.isLevelRunning, true);
        assert.equal(f.audio.audioSource.plays.at(-1).clip.name, 'uiClick');
    });
    test('return Home preserves both muted and enabled audio session settings across another Start', () => {
        for (const enabled of [false, true]) {
            const f = fixture(); finishRun(f); f.audio.setSoundEnabled(enabled); click(f.home.homeButton);
            assert.equal(f.audio.isSoundEnabled, enabled); assert.equal(f.home.soundStateLabel.string, enabled ? '音效：开' : '音效：关');
            click(f.home.startButton); assert.equal(f.audio.isSoundEnabled, enabled);
        }
    });
    test('final Replay remains direct to order one and ignores rapid replay/Home clicks', () => {
        const f = fixture(); finishRun(f); for (let i = 0; i < 5; i++) click(f.manager.nextButton); click(f.home.homeButton);
        assert.equal(f.manager.hasStarted, true); assert.equal(f.home.overlay.active, false); assert.equal(f.manager.currentOrderIndex, 0);
        assert.equal(f.run.levelResults.length, 0); assert.equal(f.host.currentKind, 'drag-match'); assert.equal(f.run.isLevelRunning, true);
    });
    test('new Home-started run clears scores/stars/mistakes/progress and keeps seen tutorial session policy', () => {
        const f = fixture(); finishRun(f); assert.ok(f.run.summary.totalScore > 0); click(f.home.homeButton); click(f.home.startButton);
        assert.equal(f.run.summary.totalScore, 0); assert.equal(f.run.summary.earnedStars, 0); assert.equal(f.run.summary.completedOrders, 0);
        assert.equal(f.run.currentMistakes, 0); assert.equal(f.run.currentElapsedMs, 0); assert.equal(current(f).progress.completed, 0);
        assert.equal(f.manager.tutorialHint.active, false); assert.equal(f.manager.completePanel.active, false);
    });
    test('ordinary order completion never permits Home; final groups and Home-only button stay mutually exclusive', () => {
        const f = fixture(); click(f.home.startButton); assert.equal(f.home.returnToHome(), false); solveOrder(f);
        assert.equal(f.manager.state, GameState.LevelComplete); assert.equal(f.manager.returnHomeFromFinal(), false); assert.equal(f.home.returnToHome(), false);
        assert.equal(f.view.orderGroup.active, true); assert.equal(f.view.finalGroup.active, false); assert.equal(f.home.homeButton.node.activeInHierarchy, false);
        click(f.manager.nextButton); solveOrder(f); assert.equal(f.view.orderGroup.active, false); assert.equal(f.view.finalGroup.active, true);
        assert.equal(f.home.homeButton.node.activeInHierarchy, true); assert.equal(f.view.starContainer.active, false);
    });
    test('late stage callbacks and result animation callbacks after Home cannot restart timing or settle old data', () => {
        const f = fixture(); click(f.home.startButton); const callbacks = f.manager.installedCallbacks; solveOrder(f); click(f.manager.nextButton); solveOrder(f);
        const panelTween = lastTween(f.manager.completePanel); click(f.home.homeButton);
        callbacks.onProgress({ completed: 3, total: 3 }); callbacks.onMistake(); callbacks.onComplete(); panelTween.callCallbacks(); panelTween.flush();
        assert.equal(f.manager.hasStarted, false); assert.equal(f.run.currentElapsedMs, 0); assert.equal(f.run.levelResults.length, 0);
        assert.equal(f.manager.completePanel.active, false); assert.equal(f.home.overlay.active, true); assert.ok(f.host.node.children.every(n => !n.active));
    });
    test('Home disable/enable/destroy owns one Start, Sound and Return listener without orphan callbacks', () => {
        const f = fixture(); f.home.onEnable(); f.home.onEnable(); assert.equal(f.home.homeButton.node.listenerCount(), 1);
        f.home.enabled = false; assert.equal(f.home.homeButton.node.listenerCount(), 0); f.home.enabled = true; assert.equal(f.home.homeButton.node.listenerCount(), 1);
        f.home.destroy(); assert.equal(f.home.homeButton.node.listenerCount(), 0); assert.equal(f.home.soundButton.node.listenerCount(), 0);
        click(f.home.startButton); assert.equal(f.manager.hasStarted, false);
    });
    test('manager re-enable at returned Home remains paused, and next Start still works once', () => {
        const f = fixture(); finishRun(f); click(f.home.homeButton); f.manager.enabled = false; f.manager.enabled = true;
        f.run.update(10); assert.equal(f.manager.hasStarted, false); assert.equal(f.run.currentElapsedMs, 0);
        click(f.home.startButton); const generation = f.host.currentGeneration; click(f.home.startButton);
        assert.equal(f.host.currentGeneration, generation); assert.equal(f.manager.currentOrderIndex, 0);
    });
    test('a second complete run can return Home again without leaving either final button permanently disabled', () => {
        const f = fixture();
        for (let run = 0; run < 2; run++) {
            finishRun(f); assert.equal(f.home.homeButton.interactable, true); assert.equal(f.view.modalShade.active, true);
            click(f.home.homeButton); assert.equal(f.home.overlay.active, true); assert.equal(f.view.modalShade.active, false);
            assert.equal(f.home.startButton.interactable, true); assert.equal(f.run.levelResults.length, 0);
        }
    });
    test('manager result/HUD counts use a different catalog length and a multi-step order without hardcoded 9/13', () => {
        const copy = JSON.parse(JSON.stringify(ORDER_CATALOG.slice(0, 2)));
        copy[1].stages.push({ ...copy[1].stages[0], id: 'test-extra-stage' }); const f = fixture(copy); finishRun(f);
        assert.equal(f.view.summaryOrdersLabel.string, '2 / 2'); assert.equal(f.view.summaryStarsLabel.string, '6 / 6'); assert.equal(f.view.summaryStepsLabel.string, '3 / 3');
        assert.equal(f.manager.hudView.orderLabel.string, '订单 2 / 2'); assert.equal(f.manager.hudView.stepLabel.string, '步骤 2 / 2');
        click(f.home.homeButton); click(f.home.startButton); assert.equal(f.manager.hudView.orderLabel.string, '订单 1 / 2');
        assert.equal(f.manager.statusLabel.string, `${copy[0].stages[0].instruction}\n已归位 0 / 3`);
    });

    return groups;
}

module.exports = { runDay5AV2Tests };
