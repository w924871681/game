'use strict';

// Actual compiled production visuals/controllers with the unchanged finite mock.
// Geometry, state, ownership and tween endpoints are checked; no rendered pixels,
// real Tween interpolation, native hit testing or browser audio are claimed here.
const assert = require('node:assert/strict');

function runV21VisualTests(runtime) {
    const { mock, load, RunController } = runtime;
    const { Node, UITransform, Label, Sprite, SpriteFrame, Graphics, Color, EventTouch } = mock.cc;
    const { ElementVisual } = load('visuals/ElementVisual.ts');
    const { V2CableLine } = load('visuals/V2CableLine.ts');
    const { CableConnector } = load('gameplay/CableConnector.ts');
    const { ResultStars } = load('ui/ResultStars.ts');
    const { ORDER_CATALOG } = load('data/OrderCatalog.ts');
    let groups = 0;
    const test = (name, action) => { action(); groups++; console.log(`PASS V2.1 visuals: ${name}`); };
    const node = (name, parent = null, w = 180, h = 140) => {
        const n = new Node(name); n.addComponent(UITransform).setContentSize(w, h); n.parent = parent; return n;
    };
    const close = (a, b, name = 'coordinate') => assert.ok(Number.isFinite(a) && Math.abs(a - b) < 1e-7, `${name}: ${a} != ${b}`);
    const vector = v => [v.x, v.y, v.z];
    const inputState = n => ({ parent: n.parent, position: vector(n.position), scale: vector(n.scale), angle: n.angle,
        layer: n.layer, width: n.getComponent(UITransform).width, height: n.getComponent(UITransform).height });
    function element(w = 180, h = 140) {
        const parent = node('TransformedOwner'); parent.setPosition(80, -20, 0); parent.angle = 13; parent.setScale(1.2, 0.8, 1);
        const root = node('Input', parent, w, h); root.setPosition(35, -42, 0); root.setScale(0.9, 1.1, 1); root.addComponent(Sprite);
        const visual = root.addComponent(ElementVisual);
        visual.icon = node('Icon', root).addComponent(Sprite); visual.caption = node('Caption', root).addComponent(Label);
        visual.checkMarker = node('Check', root); visual.highlight = node('Highlight', root);
        visual.surface = node('Surface', root).addComponent(Sprite); visual.outline = node('Outline', root).addComponent(Graphics);
        mock.boot(parent); return { root, visual, parent };
    }
    function observe(art) {
        const strokes = [], originalClear = art.clear, originalStroke = art.stroke;
        art.clear = function () { strokes.length = 0; return originalClear.call(this); };
        art.stroke = function () {
            const move = this.commands.filter(c => c.type === 'moveTo').at(-1);
            const curve = this.commands.filter(c => c.type === 'bezierCurveTo').at(-1);
            strokes.push({ width: this.lineWidth, color: ['r', 'g', 'b', 'a'].map(k => this.strokeColor[k]), move, curve: curve?.coordinates.slice() });
            return originalStroke.call(this);
        };
        return strokes;
    }
    function cableFixture(count = 1, refined = true, withLayer = true) {
        const stage = node('CableStage', null, 720, 800), layer = withLayer ? node('V21CableArtworkLayer', stage) : null;
        const values = [];
        for (let i = 0; i < count; i++) {
            const root = node(`Cable${i}`, stage), connector = root.addComponent(CableConnector);
            const head = node('Head', root, 80, 80), anchor = node('Anchor', root, 16, 16), port = node(`Port${i}`, stage, 140, 100);
            head.addComponent(Sprite); head.setPosition(-240, 180 - i * 180, 0); anchor.setPosition(-290, 180 - i * 180, 0); port.setPosition(240, 180 - i * 180, 0);
            connector.head = head; connector.anchor = anchor; connector.line = node('LogicalLine', root).addComponent(Graphics); connector.line.enabled = false;
            const art = node('Artwork', root).addComponent(Graphics), visual = root.addComponent(V2CableLine);
            const lamp = node('StatusLight', head, 18, 18); lamp.active = false;
            Object.assign(visual, { connector, artwork: art, refinedStyle: refined, statusLight: lamp });
            const record = { connected: 0, mistakes: 0 };
            const callbacks = { onConnected() { record.connected++; }, onMistake() { record.mistakes++; } };
            connector.configure(port, 72, ['red', 'blue', 'yellow', 'green'][i % 4], callbacks); connector.setInputEnabled(true);
            values.push({ root, connector, head, anchor, port, art, visual, lamp, record, callbacks, strokes: observe(art) });
        }
        mock.boot(stage); return { stage, layer, values };
    }
    function emit(target, type, point = target.worldPosition, id = 0) { target.emit(Node.EventType[type], new EventTouch(id, point)); }
    function drop(value, target = value.port) { emit(value.head, 'TOUCH_START'); emit(value.head, 'TOUCH_END', target.worldPosition); }
    function starFixture(stagger = 0) {
        const root = node('Stars'), stars = root.addComponent(ResultStars); stars.staggerSeconds = stagger;
        stars.earnedFrame = new SpriteFrame('earned'); stars.emptyFrame = new SpriteFrame('empty');
        stars.starSprites = [0, 1, 2].map(i => { const n = node(`Star${i}`, root); n.setScale(1 + i * 0.1, 0.9 + i * 0.1, 1); return n.addComponent(Sprite); });
        mock.boot(root); return { root, stars, scales: stars.starSprites.map(s => vector(s.node.scale)) };
    }
    const starTweens = stars => mock.tweens.filter(t => stars.starSprites.some(s => s.node === t.target));

    test('refined drag enlarges only child artwork and caption while preserving transformed input root and its listener', () => {
        const { root, visual } = element(), frame = new SpriteFrame('keyboard', 320, 160), before = inputState(root);
        const owner = () => {}; root.on(Node.EventType.TOUCH_START, owner, root);
        visual.configure(frame, 'devices/keyboard', '键盘', 180, 140, false);
        const oldWidth = visual.icon.node.getComponent(UITransform).width, oldFont = visual.caption.fontSize;
        visual.refinedLayout = true; visual.configure(frame, 'devices/keyboard', '键盘', 180, 140, false);
        assert.ok(visual.icon.node.getComponent(UITransform).width > oldWidth); assert.ok(visual.caption.fontSize > oldFont && visual.caption.fontSize >= 24);
        assert.deepEqual(inputState(root), before); assert.equal(root.listenerCount(), 1); assert.equal(visual.icon.node.listenerCount(), 0); assert.equal(visual.caption.node.listenerCount(), 0);
        assert.equal(visual.icon.spriteFrame, frame); close(visual.icon.node.getComponent(UITransform).width / visual.icon.node.getComponent(UITransform).height, 2, 'aspect ratio');
    });
    test('four-device width uses readable refined labels and independent completion art without increasing the real hitbox', () => {
        const order = ORDER_CATALOG.find(o => o.stages.some(s => s.kind === 'drag-match' && s.pairs.length === 4));
        const stage = order.stages.find(s => s.kind === 'drag-match' && s.pairs.length === 4);
        for (const pair of stage.pairs) {
            const { root, visual } = element(140, 140), before = inputState(root); visual.refinedLayout = true;
            visual.configure(new SpriteFrame(pair.id), `devices/${pair.id}`, pair.itemLabel, 140, 140, false);
            assert.equal(visual.caption.fontSize, 24); assert.equal(visual.caption.string, pair.itemLabel); assert.equal(visual.caption.node.getComponent(UITransform).height, 30);
            assert.deepEqual(inputState(root), before); assert.equal(visual.checkMarker.active, false); assert.equal(visual.highlight.active, false);
        }
    });
    test('refined plug and socket share the real frame, preserve aspect and hitbox, and shorten only the socket wording', () => {
        const head = element(100, 80), target = element(140, 100), frame = new SpriteFrame('display-plug', 240, 160);
        for (const [f, muted] of [[head, false], [target, true]]) {
            const before = inputState(f.root); f.visual.refinedLayout = true;
            f.visual.configure(frame, 'ports/display-port', '显示接口', muted ? 140 : 100, muted ? 100 : 80, muted);
            assert.deepEqual(inputState(f.root), before); assert.equal(f.visual.caption.string, '显示口'); assert.ok(f.visual.caption.fontSize >= 24);
            close(f.visual.icon.node.getComponent(UITransform).width / f.visual.icon.node.getComponent(UITransform).height, 1.5);
        }
        assert.equal(head.visual.icon.spriteFrame, target.visual.icon.spriteFrame); assert.ok(target.visual.icon.color.a < head.visual.icon.color.a);
    });
    test('reusing a refined element stops old completion effects and restores only the new frame/key/label', () => {
        const { root, visual } = element(140, 140); visual.refinedLayout = true;
        visual.configure(new SpriteFrame('memory'), 'devices/memory', '内存', 140, 140, false); visual.showComplete();
        const old = mock.tweens.at(-1), before = inputState(root), next = new SpriteFrame('drive');
        visual.configure(next, 'devices/drive', '硬盘', 140, 140, false); old.flush(); old.callCallbacks();
        assert.equal(old.stopped, true); assert.equal(visual.isComplete, false); assert.equal(visual.checkMarker.active, false); assert.equal(visual.highlight.active, false);
        assert.equal(visual.icon.spriteFrame, next); assert.equal(visual.visualKey, 'devices/drive'); assert.equal(visual.caption.string, '硬盘'); assert.deepEqual(inputState(root), before);
    });
    test('default cable style retains its original three strokes and local artwork ownership', () => {
        const f = cableFixture(1, false), v = f.values[0];
        assert.deepEqual(v.strokes.map(s => s.width), [15, 11, 3]); assert.equal(v.art.node.parent, v.root); assert.equal(v.lamp.active, false);
        assert.equal(v.head.listenerCount(), 4); assert.equal(v.art.node.listenerCount(), 0);
    });
    test('refined cable reparents only decorative graphics under all input nodes and uses four material layers', () => {
        const f = cableFixture(3, false), before = f.values.map(v => [inputState(v.root), inputState(v.head), inputState(v.anchor), inputState(v.port)]);
        f.values.forEach(v => { v.visual.refinedStyle = true; v.visual.refresh(); });
        for (const [i, v] of f.values.entries()) {
            assert.equal(v.art.node.parent, f.layer); assert.deepEqual(v.strokes.map(s => s.width), [21, 15, 11, 3]);
            assert.deepEqual([inputState(v.root), inputState(v.head), inputState(v.anchor), inputState(v.port)], before[i]);
            assert.equal(v.root.parent, f.stage); assert.equal(v.head.parent, v.root); assert.equal(v.art.node.listenerCount(), 0); assert.equal(v.lamp.listenerCount(), 0);
        }
        assert.equal(f.stage.children[0], f.layer); assert.equal(f.layer.children.length, 3);
    });
    test('four-layer cable endpoints follow rotated nonuniform input ancestors and bounded sag does not move anchors', () => {
        const f = cableFixture(), v = f.values[0]; f.stage.setPosition(120, 80, 0); f.stage.angle = 17; f.stage.setScale(1.3, 0.8, 1);
        v.root.setPosition(30, -25, 0); v.root.angle = -12; v.root.setScale(0.8, 1.1, 1);
        const anchorBefore = inputState(v.anchor); v.visual.refresh();
        const artUI = v.art.node.getComponent(UITransform), a = artUI.convertToNodeSpaceAR(v.anchor.worldPosition), b = artUI.convertToNodeSpaceAR(v.head.worldPosition), body = v.strokes.find(s => s.width === 11);
        close(body.move.x, a.x); close(body.move.y, a.y); close(body.curve[4], b.x); close(body.curve[5], b.y);
        const sag = a.y - body.curve[1]; assert.ok(sag > 0 && sag <= 58); close(b.y - body.curve[3], sag); assert.deepEqual(inputState(v.anchor), anchorBefore);
    });
    test('fixed cable endpoints still redraw when current material color changes and unchanged refresh is cached', () => {
        const v = cableFixture().values[0], before = v.art.commands.length;
        v.connector.line.strokeColor = new Color(12, 144, 166, 255); v.visual.refresh();
        assert.deepEqual(v.strokes.find(s => s.width === 11).color, [12, 144, 166, 255]);
        const commands = v.art.commands; v.visual.refresh(); assert.equal(v.art.commands, commands); assert.equal(v.art.commands.length, before);
        v.connector.line.strokeColor.g = 188; v.visual.refresh(); assert.equal(v.strokes.find(s => s.width === 11).color[1], 188);
    });
    test('three real connectors show zero then exactly one successful lamp only after the actual snap settles', () => {
        const f = cableFixture(3), v = f.values[0]; assert.ok(f.values.every(x => !x.connector.isConnected && !x.lamp.active));
        drop(v); v.visual.refresh(); assert.equal(v.connector.isConnected, false); assert.equal(v.lamp.active, false); assert.equal(v.record.connected, 0);
        mock.flush(v.head); f.values.forEach(x => x.visual.refresh());
        assert.deepEqual(f.values.map(x => x.connector.isConnected), [true, false, false]); assert.deepEqual(f.values.map(x => x.lamp.active), [true, false, false]);
        emit(v.head, 'TOUCH_END', v.port.worldPosition); assert.equal(v.record.connected, 1);
        const other = f.values[1], origin = vector(other.head.position); emit(other.head, 'TOUCH_START'); emit(other.head, 'TOUCH_MOVE', other.port.worldPosition);
        assert.notDeepEqual(vector(other.head.position), origin); emit(other.head, 'TOUCH_CANCEL', other.port.worldPosition); assert.equal(other.record.mistakes, 0);
    });
    test('refined artwork keeps wrong-release once, foreign-touch rejection and CANCEL without success or visual input listeners', () => {
        const f = cableFixture(2), v = f.values[0], origin = vector(v.head.position);
        drop(v, f.values[1].port); emit(v.head, 'TOUCH_END', f.values[1].port.worldPosition); mock.flush(v.head); v.visual.refresh();
        assert.equal(v.record.mistakes, 1); assert.equal(v.record.connected, 0); assert.equal(v.lamp.active, false); assert.deepEqual(vector(v.head.position), origin);
        emit(v.head, 'TOUCH_START', v.head.worldPosition, 3); emit(v.head, 'TOUCH_MOVE', v.port.worldPosition, 99); emit(v.head, 'TOUCH_END', v.port.worldPosition, 99);
        assert.deepEqual(vector(v.head.position), origin); emit(v.head, 'TOUCH_CANCEL', v.port.worldPosition, 3); v.visual.refresh();
        assert.equal(v.record.mistakes, 1); assert.equal(v.record.connected, 0); assert.equal(v.lamp.active, false); assert.equal(v.art.node.listenerCount(), 0);
    });
    test('pooled cable reconfigure clears the successful lamp and follows the new style without replacing its input roots', () => {
        const v = cableFixture().values[0], head = v.head, anchor = v.anchor, root = v.root;
        drop(v); mock.flush(v.head); v.visual.refresh(); assert.equal(v.lamp.active, true);
        v.head.setPosition(-180, -70, 0); v.connector.configure(v.port, 72, 'blue', v.callbacks); v.connector.setInputEnabled(true); v.visual.refresh();
        assert.equal(v.lamp.active, false); assert.equal(v.connector.isConnected, false); assert.equal(v.connector.head, head); assert.equal(v.connector.anchor, anchor); assert.equal(v.connector.node, root);
        assert.deepEqual(v.strokes.find(s => s.width === 11).color, [99, 175, 242, 255]); assert.equal(v.art.node.parent.name, 'V21CableArtworkLayer');
    });
    test('disable/re-enable/destroy clean only the owning moved artwork and lamp, leaving the other cable and input intact', () => {
        const f = cableFixture(2), [v, other] = f.values, ownArt = v.art.node, otherArt = other.art.node, before = inputState(v.head);
        v.visual.enabled = false; assert.equal(v.strokes.length, 0); assert.equal(v.lamp.active, false); assert.ok(other.strokes.length > 0);
        v.visual.enabled = true; assert.equal(v.strokes.length, 4); v.visual.destroy();
        assert.equal(ownArt._valid, false); assert.equal(v.visual.artwork, null); assert.equal(otherArt._valid, true); assert.equal(otherArt.parent, f.layer);
        assert.equal(v.head._valid, true); assert.equal(v.head.listenerCount(), 4); assert.deepEqual(inputState(v.head), before); assert.equal(f.layer.children.length, 1);
    });
    test('standalone refined cable safely retains its own artwork when no shared decorative underlay is available', () => {
        const v = cableFixture(1, true, false).values[0]; assert.equal(v.art.node.parent, v.root); assert.equal(v.strokes.length, 4);
        const transform = v.art.node.getComponent(UITransform), end = transform.convertToNodeSpaceAR(v.head.worldPosition), body = v.strokes.find(s => s.width === 11);
        close(body.curve[4], end.x); close(body.curve[5], end.y); assert.equal(v.head.listenerCount(), 4);
    });
    test('default star timing stays unchanged while real one/two/three-star frozen results select the correct grey/earned frames', () => {
        const order = ORDER_CATALOG.find(o => o.id === 4);
        for (const [seconds, mistakes, expected] of [[10, 0, 3], [28.7, 1, 2], [70, 2, 1]]) {
            const { stars } = starFixture(), run = node('Run').addComponent(RunController); run.beginLevel(order.id, order.scoreRule); run.advanceTime(seconds);
            for (let n = 0; n < mistakes; n++) run.recordMistake(); const result = run.finishLevel(); assert.equal(result.stars, expected); assert.ok(Object.isFrozen(result));
            stars.show(result.stars); assert.equal(stars.displayedStars, expected); assert.equal(stars.starSprites.filter(s => s.spriteFrame === stars.earnedFrame).length, expected);
            assert.equal(stars.starSprites.filter(s => s.spriteFrame === stars.emptyFrame).length, 3 - expected);
            assert.ok(starTweens(stars).every(t => t.steps.length === 2 && t.steps[0].duration === 0.14 && t.steps[1].duration === 0.1));
            if (expected === 2) assert.equal(result.score, 620);
        }
    });
    test('optional star staggering affects only earned entrances and restores each original nonuniform scale at its endpoint', () => {
        for (const earned of [1, 2, 3]) {
            const { stars, scales } = starFixture(0.075); stars.show(earned); const tweens = starTweens(stars); assert.equal(tweens.length, earned);
            tweens.forEach((animation, index) => {
                assert.equal(animation.steps.length, index === 0 ? 2 : 3);
                if (index > 0) { close(animation.steps[0].duration, index * 0.075); close(animation.steps[0].properties.scale.x, scales[index][0] * 0.82); }
                animation.flush(); assert.deepEqual(vector(animation.target.scale), scales[index]);
            });
            assert.equal(stars.displayedStars, earned); assert.equal(stars.starSprites.filter(s => s.spriteFrame === stars.emptyFrame).length, 3 - earned);
        }
    });
    test('reset and disable stop every old staggered entrance so late endpoints cannot alter the next rating or retained result', () => {
        const { stars, scales } = starFixture(0.075); stars.show(3); const old = starTweens(stars).slice(); stars.reset();
        assert.ok(old.every(t => t.stopped)); assert.equal(stars.displayedStars, 0); assert.ok(stars.starSprites.every(s => s.spriteFrame === stars.emptyFrame));
        stars.show(1); const pendingScale = vector(stars.starSprites[0].node.scale); old.forEach(t => { t.flush(); t.callCallbacks(); });
        assert.deepEqual(vector(stars.starSprites[0].node.scale), pendingScale); assert.equal(stars.displayedStars, 1);
        stars.enabled = false; assert.ok(starTweens(stars).every(t => t.stopped)); assert.equal(stars.displayedStars, 1);
        stars.starSprites.forEach((s, i) => assert.deepEqual(vector(s.node.scale), scales[i])); stars.destroy();
        assert.equal(stars.starSprites.filter(s => s.spriteFrame === stars.earnedFrame).length, 1);
    });
    return groups;
}

module.exports = { runV21VisualTests };
