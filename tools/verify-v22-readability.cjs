'use strict';

// Compiled production components with the existing finite mock. This verifies
// state, geometry and caption separation, not rendered glyphs or phone touch.
const assert = require('node:assert/strict');

function runV22ReadabilityTests(runtime) {
    const { mock, load, GameController, DraggableItem } = runtime;
    const { Node, UITransform, Label, Sprite, SpriteFrame, Graphics, Prefab, EventTouch } = mock.cc;
    const { ElementVisual } = load('visuals/ElementVisual.ts');
    const { CableConnector } = load('gameplay/CableConnector.ts');
    const { DragMatchStageController } = load('stages/DragMatchStageController.ts');
    const { CableConnectStageController } = load('stages/CableConnectStageController.ts');
    const { VisualAssetRegistry } = load('visuals/VisualAssetRegistry.ts');
    const { dragVisualKey, cableVisualKey } = load('visuals/VisualCatalog.ts');
    const { ORDER_CATALOG } = load('data/OrderCatalog.ts');
    const catalogBefore = JSON.stringify(ORDER_CATALOG);
    let groups = 0;
    const test = (name, run) => { run(); groups++; console.log(`PASS V2.2 readability: ${name}`); };
    const node = (name, parent = null, width = 180, height = 140) => {
        const value = new Node(name); value.parent = parent; value.addComponent(UITransform).setContentSize(width, height); return value;
    };
    const vec = value => [value.x, value.y, value.z];
    const state = value => ({ parent: value.parent, position: vec(value.position), scale: vec(value.scale), angle: value.angle,
        layer: value.layer, width: value.getComponent(UITransform).width, height: value.getComponent(UITransform).height });
    const bands = value => {
        const size = value.getComponent(UITransform); return { bottom: value.position.y - size.height / 2, top: value.position.y + size.height / 2 };
    };
    function decorate(value, enabled = true) {
        value.addComponent(Sprite);
        const visual = value.addComponent(ElementVisual);
        visual.refinedLayout = true; visual.smallScreenLegibility = enabled;
        visual.icon = node('Icon', value).addComponent(Sprite);
        visual.caption = node('Caption', value).addComponent(Label);
        visual.checkMarker = node('Check', value); visual.highlight = node('Highlight', value);
        visual.surface = node('Surface', value).addComponent(Sprite); visual.outline = node('Outline', value).addComponent(Graphics);
        return visual;
    }
    function element(width = 140, height = 110) {
        const owner = node('Owner'); owner.setPosition(90, -30, 0); owner.angle = 17; owner.setScale(1.2, 0.8, 1);
        const root = node('Input', owner, width, height); root.setPosition(35, -40, 0); root.setScale(0.8, 1.1, 1);
        const visual = decorate(root); mock.boot(owner); return { root, owner, visual };
    }
    function registry(parent, definition) {
        const assets = node('VisualAssets', parent).addComponent(VisualAssetRegistry);
        assets.keys = definition.kind === 'drag-match' ? definition.pairs.map(pair => dragVisualKey(definition.id, pair.id))
            : definition.cables.flatMap(cable => ['head', 'port'].map(role => cableVisualKey(definition.id, cable.id, role)));
        assets.keys = [...new Set(assets.keys)];
        assets.frames = assets.keys.map(key => new SpriteFrame(key, key.startsWith('ports/') ? 256 : 180, key.startsWith('ports/') ? 160 : 120));
        assets.validateBindings(); return assets;
    }
    function stageFixture(definition) {
        const root = node('Stage', null, 720, 800), events = { complete: 0, mistake: 0, progress: [] };
        let stage;
        if (definition.kind === 'drag-match') {
            stage = root.addComponent(DragMatchStageController); stage.gameController = root.addComponent(GameController);
            stage.itemPrefab = new Prefab(() => { const value = node('Item'); decorate(value); value.addComponent(DraggableItem); return value; });
            stage.targetPrefab = new Prefab(() => { const value = node('Target'); decorate(value); return value; });
        } else {
            stage = root.addComponent(CableConnectStageController);
            stage.portPrefab = new Prefab(() => { const value = node('Port', null, 130, 80); decorate(value); return value; });
            stage.cablePrefab = new Prefab(() => {
                const value = node('Cable'), connector = value.addComponent(CableConnector);
                connector.head = node('Head', value, 130, 80); decorate(connector.head);
                connector.anchor = node('Anchor', value, 16, 16); connector.line = node('LogicalLine', value).addComponent(Graphics); return value;
            });
        }
        stage.bindVisualAssets(registry(root, definition)); mock.boot(root);
        stage.configure(definition, { onComplete() { events.complete++; }, onMistake() { events.mistake++; }, onProgress(progress) { events.progress.push(progress); } });
        stage.setInputEnabled(true); return { root, stage, events };
    }
    const emit = (target, type, point = target.worldPosition) => target.emit(Node.EventType[type], new EventTouch(1, point));
    const drop = (target, point) => { emit(target, 'TOUCH_START'); emit(target, 'TOUCH_END', point); mock.flush(target); };

    test('the new option defaults off and neither the alpha.3 refined path nor the original layout changes', () => {
        const { visual } = element(130, 80), frame = new SpriteFrame('cpu', 256, 160);
        assert.equal(new ElementVisual().smallScreenLegibility, false);
        visual.smallScreenLegibility = false; visual.configure(frame, 'ports/cpu-head', 'CPU 电源', 130, 80, false);
        assert.equal(visual.caption.string, 'CPU 电源'); assert.equal(visual.caption.fontSize, 24);
        assert.equal(visual.caption.node.position.y, -28); assert.equal(visual.icon.node.position.y, 16);
        visual.refinedLayout = false; visual.smallScreenLegibility = true;
        visual.configure(frame, 'ports/cpu-head', 'CPU 电源', 130, 80, false);
        assert.equal(visual.caption.string, 'CPU 电源'); assert.equal(visual.caption.fontSize, 20); assert.equal(visual.icon.node.position.y, 14);
    });
    test('both real four-item stages retain formal catalog data, all eight input roots and visible original caption components', () => {
        for (const orderId of [8, 9]) {
            const definition = ORDER_CATALOG.find(order => order.id === orderId).stages.find(stage => stage.kind === 'drag-match');
            const f = stageFixture(definition);
            assert.deepEqual(f.stage.progress, { completed: 0, total: 4 });
            definition.pairs.forEach((pair, index) => {
                for (const [value, target] of [[f.stage.itemNodes[index], false], [f.stage.targetNodes[index], true]]) {
                    const visual = value.getComponent(ElementVisual), transform = value.getComponent(UITransform);
                    assert.equal(visual.caption.string, pair.itemLabel); assert.equal(visual.caption.fontSize, 28);
                    assert.equal(visual.caption.node.active, true); assert.equal(visual.caption.enabled, true);
                    assert.equal(visual.caption.node.parent, value); assert.equal(visual.icon.node.parent, value);
                    assert.equal(transform.width, 140); assert.equal(transform.height, 110);
                    assert.deepEqual(vec(value.position), [...Object.values(target ? pair.targetPosition : pair.itemStart), 0]);
                    assert.equal(value.listenerCount(), target ? 0 : 4); assert.equal(visual.caption.node.listenerCount(), 0); assert.equal(visual.icon.node.listenerCount(), 0);
                    assert.ok(bands(visual.caption.node).top < bands(visual.icon.node).bottom, 'device caption is below its cropped icon');
                }
            });
            assert.equal(JSON.stringify(ORDER_CATALOG), catalogBefore);
        }
    });
    test('two- and three-item layouts keep their existing alpha.3 icon and caption measurements', () => {
        for (const [key, text] of [['devices/battery', '电池仓'], ['devices/keyboard', '键盘位']]) {
            const { root, visual } = element(180, 140), before = state(root);
            visual.configure(new SpriteFrame(key, 180, 120), key, text, 180, 140, true);
            assert.equal(visual.caption.string, text); assert.equal(visual.caption.fontSize, 26);
            assert.equal(visual.caption.node.getComponent(UITransform).height, 30); assert.equal(visual.icon.node.position.y, 12);
            assert.deepEqual(state(root), before);
        }
    });
    test('stable internal-cable visual keys supply short aliases while preserving official IDs, labels and target mapping', () => {
        const definition = ORDER_CATALOG.find(order => order.id === 9).stages.find(stage => stage.kind === 'cable-connect');
        const f = stageFixture(definition), aliases = [['主板线', '主板口'], ['CPU线', 'CPU口'], ['硬盘线', '硬盘口'], ['风扇线', '风扇口']];
        definition.cables.forEach((cable, index) => {
            const connector = f.stage.cableNodes[index].getComponent(CableConnector);
            assert.equal(connector.currentPort, f.stage.portNodes[index]);
            for (const [value, role, alias] of [[connector.head, 'head', aliases[index][0]], [connector.currentPort, 'port', aliases[index][1]]]) {
                const visual = value.getComponent(ElementVisual), before = state(value);
                assert.equal(visual.visualKey, cableVisualKey(definition.id, cable.id, role)); assert.equal(visual.caption.string, alias);
                assert.equal(visual.caption.fontSize, 28); assert.equal(visual.caption.lineHeight, 32);
                visual.configure(visual.icon.spriteFrame, visual.visualKey, role === 'head' ? cable.cableLabel : cable.portLabel, 130, 80, false);
                assert.deepEqual(state(value), before); assert.equal(value.getComponent(UITransform).height, 80);
                assert.equal(visual.icon.node.listenerCount(), 0); assert.equal(visual.caption.node.listenerCount(), 0);
            }
        });
        assert.equal(JSON.stringify(ORDER_CATALOG), catalogBefore);
    });
    test('shared network artwork does not erase WAN/LAN or incoming/computer cable distinctions', () => {
        const definition = ORDER_CATALOG.find(order => order.id === 7).stages[0], f = stageFixture(definition);
        assert.deepEqual(f.stage.cableNodes.map(value => value.getComponent(CableConnector).head.getComponent(ElementVisual).caption.string), ['电源线', '入户网线', '电脑网线']);
        assert.deepEqual(f.stage.portNodes.map(value => value.getComponent(ElementVisual).caption.string), ['电源口', 'WAN 口', 'LAN 口']);
        const { visual } = element(130, 80); visual.configure(new SpriteFrame('unknown', 256, 160), 'ports/future-port', '新接口', 130, 80, false);
        assert.equal(visual.caption.string, '新口'); assert.equal(visual.visualKey, 'ports/future-port');
    });
    test('head and port text bands flank the icon with clearance and remain separate at the same real snap coordinate', () => {
        const head = element(130, 80), port = element(130, 80), frame = new SpriteFrame('plug', 256, 160);
        for (const [f, role] of [[head, 'head'], [port, 'port']]) {
            const rootBefore = state(f.root), parentBefore = state(f.owner);
            f.visual.configure(frame, `ports/cpu-${role}`, role === 'head' ? 'CPU 电源' : 'CPU 接口', 130, 80, false);
            const iconBand = bands(f.visual.icon.node), captionBand = bands(f.visual.caption.node);
            if (role === 'head') { assert.ok(captionBand.bottom >= iconBand.top + 2); assert.ok(captionBand.top <= 52, 'top row stays clear of existing HUD'); }
            else assert.ok(captionBand.top <= iconBand.bottom - 2);
            assert.deepEqual(state(f.root), rootBefore); assert.deepEqual(state(f.owner), parentBefore);
            assert.equal(f.visual.icon.spriteFrame, frame); assert.equal(f.visual.icon.node.getComponent(UITransform).width / f.visual.icon.node.getComponent(UITransform).height, 1.6);
        }
        assert.ok(bands(port.visual.caption.node).top < bands(head.visual.caption.node).bottom);
    });
    test('actual four-line stage advances only on settled input and three crossing connections leave both captions intact', () => {
        const definition = ORDER_CATALOG.find(order => order.id === 9).stages.find(stage => stage.kind === 'cable-connect'), f = stageFixture(definition);
        const portsBefore = f.stage.portNodes.map(state);
        assert.deepEqual(f.stage.progress, { completed: 0, total: 4 });
        for (let index = 0; index < 3; index++) {
            const connector = f.stage.cableNodes[index].getComponent(CableConnector), head = connector.head, port = connector.currentPort;
            emit(head, 'TOUCH_START'); emit(head, 'TOUCH_END', port.worldPosition);
            assert.equal(connector.isConnected, false); assert.equal(f.stage.progress.completed, index);
            mock.flush(head); assert.equal(connector.isConnected, true); assert.equal(f.stage.progress.completed, index + 1);
            assert.deepEqual(vec(head.worldPosition), vec(port.worldPosition));
            const headVisual = head.getComponent(ElementVisual), portVisual = port.getComponent(ElementVisual);
            assert.equal(headVisual.caption.node.active, true); assert.equal(portVisual.caption.node.active, true);
            assert.equal(headVisual.isComplete, true); assert.equal(portVisual.isComplete, true);
            assert.ok(bands(portVisual.caption.node).top < bands(headVisual.caption.node).bottom);
        }
        assert.equal(f.events.complete, 0); assert.equal(f.events.mistake, 0);
        assert.deepEqual(f.stage.portNodes.map(state), portsBefore);
        const fourth = f.stage.cableNodes[3].getComponent(CableConnector); drop(fourth.head, fourth.currentPort.worldPosition);
        assert.equal(f.events.complete, 1); assert.equal(f.stage.progress.completed, 4); assert.equal(f.events.mistake, 0);
    });
    test('pooled cable reuse resets completion, old tweens and role text without allocating or hiding caption nodes', () => {
        const { root, visual } = element(130, 80), oldFrame = new SpriteFrame('old', 256, 160), newFrame = new SpriteFrame('new', 256, 160);
        visual.configure(oldFrame, 'ports/cpu-head', 'CPU 电源', 130, 80, false); visual.showComplete();
        const oldTween = mock.tweens.at(-1), caption = visual.caption, icon = visual.icon, children = root.children.slice(), rootBefore = state(root);
        visual.hideArtwork(); visual.configure(newFrame, 'ports/sata-port', '硬盘接口', 130, 80, false);
        oldTween.flush(); oldTween.callCallbacks();
        assert.equal(oldTween.stopped, true); assert.equal(visual.isComplete, false); assert.equal(visual.checkMarker.active, false);
        assert.equal(visual.caption, caption); assert.equal(visual.icon, icon); assert.deepEqual(root.children, children);
        assert.equal(visual.caption.string, '硬盘口'); assert.equal(visual.icon.spriteFrame, newFrame); assert.equal(visual.caption.node.position.y, -58);
        visual.enabled = false; visual.enabled = true;
        assert.equal(visual.caption.node.active, true); assert.equal(visual.icon.node.active, true); assert.equal(visual.visualKey, 'ports/sata-port');
        assert.deepEqual(state(root), rootBefore);
    });
    test('readability keeps missing binding and frame errors visible instead of inventing replacement art or silent success', () => {
        const broken = node('Unbound').addComponent(ElementVisual); broken.refinedLayout = true; broken.smallScreenLegibility = true;
        assert.throws(() => broken.configure(new SpriteFrame('missing'), 'ports/cpu-head', 'CPU 电源', 130, 80, false), /Bind icon, caption and checkMarker/);
        const assets = node('EmptyRegistry').addComponent(VisualAssetRegistry);
        assert.throws(() => assets.requireFrame('ports/cpu-head'), /Inspector SpriteFrame is missing/);
        assert.equal(JSON.stringify(ORDER_CATALOG), catalogBefore);
    });
    return groups;
}

module.exports = { runV22ReadabilityTests };
