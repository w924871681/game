'use strict';

// Compiled visual behavior only. Sprite alpha is not a rendered-pixel or phone-touch verdict.
const assert = require('node:assert/strict');

function runV22CleanTests(runtime) {
    const { mock, load } = runtime;
    const { Node, Sprite, SpriteFrame, UITransform } = mock.cc;
    const { V21CleanDustView } = load('visuals/V21CleanDustView.ts');
    const { ORDER_CATALOG } = load('data/OrderCatalog.ts');
    const definitions = [ORDER_CATALOG[3].stages[0], ORDER_CATALOG[5].stages[0], ORDER_CATALOG[8].stages[0]];
    const keyboard = definitions[0];
    let groups = 0;
    const test = (name, action) => { action(); groups++; console.log(`PASS V2.2 clean: ${name}`); };
    function fixture(definition = keyboard) {
        const root = new Node('V22DustFixture'); root.addComponent(UITransform);
        const view = root.addComponent(V21CleanDustView);
        view.artworkRoot = new Node('Artwork'); view.artworkRoot.parent = root;
        view.dustFrame = new SpriteFrame('v2/irregular-dust');
        mock.boot(root); view.configure(definition);
        return { root, view };
    }
    const alphas = view => view.particleDiagnostics.map(particle => particle.alpha);
    const horizontal = (view, y = -32.5) => view.sweep(-260, y, 260, y, 46);
    // Exact historical falloff, retained only as a numeric baseline for the same unchanged particles.
    function oldHorizontalAlpha(particle, y, radius) {
        const feather = Math.max(8, Math.min(particle.width, particle.height) * 0.5);
        const inner = Math.max(0, radius - feather * 0.6), outer = radius + feather * 0.4;
        const t = Math.max(0, Math.min(1, (Math.abs(particle.y - y) - inner) / (outer - inner)));
        return Math.round(particle.baseAlpha * t * t * (3 - 2 * t));
    }

    test('one horizontal pass has a broader partial-alpha edge than the frozen V2.1 falloff', () => {
        const { root, view } = fixture(); horizontal(view);
        const data = view.particleDiagnostics;
        const partial = data.filter(p => p.alpha > 0 && p.alpha < p.baseAlpha).length;
        const oldPartial = data.filter(p => {
            const value = oldHorizontalAlpha(p, -32.5, 46); return value > 0 && value < p.baseAlpha;
        }).length;
        assert.ok(partial > oldPartial * 1.8, `${partial} partial particles versus old ${oldPartial}`);
        assert.ok(data.some(p => p.alpha === 0), 'the real wiped core still clears');
        assert.ok(data.some(p => p.alpha === p.baseAlpha), 'far dust stays untouched');
        assert.ok(data.every(p => Number.isInteger(p.alpha) && p.alpha >= 0 && p.alpha <= p.baseAlpha));
        root.destroy();
    });
    test('particles at equal path distance no longer share the same alpha cutoff', () => {
        const { root, view } = fixture(), initial = view.particleDiagnostics, ratios = [];
        for (let index = 0; index < initial.length; index += 11) {
            view.configure(keyboard); horizontal(view, initial[index].y + 46);
            const p = view.particleDiagnostics[index]; ratios.push(p.alpha / p.baseAlpha);
        }
        assert.ok(Math.max(...ratios) - Math.min(...ratios) > 0.25);
        assert.ok(new Set(ratios.map(value => value.toFixed(2))).size >= 9);
        root.destroy();
    });
    test('horizontal reverse and repeated passes are exactly idempotent, while new nearby paths only fade', () => {
        const { root, view } = fixture(); horizontal(view); const first = alphas(view);
        for (let repeat = 0; repeat < 6; repeat++) view.sweep(260, -32.5, -260, -32.5, 46);
        assert.deepEqual(alphas(view), first);
        horizontal(view, -10); const second = alphas(view);
        assert.ok(second.every((value, index) => value <= first[index]));
        assert.ok(second.some((value, index) => value < first[index]));
        root.destroy();
    });
    test('splitting the same horizontal input segment does not change its visual outcome', () => {
        const { root, view } = fixture(); horizontal(view); const direct = alphas(view);
        view.configure(keyboard);
        for (let x = -260; x < 260; x += 26) view.sweep(x, -32.5, x + 26, -32.5, 46);
        assert.deepEqual(alphas(view), direct);
        root.destroy();
    });
    test('stage seeds reset the exact softened result after keyboard, mouse and case reuse', () => {
        const { root, view } = fixture(), nodes = view.artworkRoot.children.slice(), initial = view.particleDiagnostics;
        horizontal(view); const expected = alphas(view);
        for (const definition of [definitions[1], definitions[2], keyboard, definitions[2], keyboard]) {
            view.configure(definition); view.sweep(-220, 20, 220, 20, definition.brushRadius);
            assert.equal(view.particleCount, 192); assert.equal(view.totalCreatedParticles, 192);
        }
        view.configure(keyboard); assert.deepEqual(view.particleDiagnostics, initial);
        horizontal(view); assert.deepEqual(alphas(view), expected);
        assert.deepEqual(view.artworkRoot.children, nodes);
        root.destroy();
    });
    test('non-finite path/radius and disabled view do not corrupt the new falloff state', () => {
        const { root, view } = fixture(); horizontal(view); const expected = alphas(view);
        for (const bad of [NaN, Infinity, -Infinity]) {
            for (let argument = 0; argument < 5; argument++) {
                const args = [-100, 0, 100, 0, 46]; args[argument] = bad; view.sweep(...args);
            }
        }
        view.sweep(-100, 0, 100, 0, 0); view.sweep(-100, 0, 100, 0, -1);
        view.enabled = false; view.sweep(-260, 50, 260, 50, 46); view.enabled = true;
        assert.deepEqual(alphas(view), expected);
        root.destroy();
    });
    test('many input sweeps reuse the same nodes, Sprites and Color objects without adding tweens or listeners', () => {
        const { root, view } = fixture(), nodes = view.artworkRoot.children.slice();
        const sprites = nodes.map(node => node.getComponent(Sprite)), colors = sprites.map(sprite => sprite.color);
        const tweens = mock.tweens.length, instantiations = mock.instantiations.length;
        for (let index = 0; index < 240; index++) {
            const y = -100 + index % 201; view.sweep(-220, y, 220, y + 5, 46);
        }
        assert.deepEqual(view.artworkRoot.children, nodes); assert.equal(view.totalCreatedParticles, 192);
        nodes.forEach((node, index) => {
            assert.equal(node.getComponent(Sprite), sprites[index]); assert.equal(sprites[index].color, colors[index]);
            assert.equal(node.listenerCount(), 0);
        });
        assert.equal(mock.tweens.length, tweens); assert.equal(mock.instantiations.length, instantiations);
        root.destroy();
    });
    test('missing artwork frame disables safely and later configure restores the same complete soft pool', () => {
        const { root, view } = fixture(), initial = view.particleDiagnostics, frame = view.dustFrame;
        horizontal(view); view.dustFrame = null; view.configure(keyboard);
        const disabled = alphas(view); view.sweep(-1000, 0, 1000, 0, 1000);
        assert.deepEqual(alphas(view), disabled); assert.ok(view.artworkRoot.children.every(node => !node.active));
        view.dustFrame = frame; view.configure(keyboard);
        assert.deepEqual(view.particleDiagnostics, initial); assert.equal(view.totalCreatedParticles, 192);
        assert.ok(view.artworkRoot.children.every(node => node.active));
        root.destroy();
    });
    return groups;
}

module.exports = { runV22CleanTests };
