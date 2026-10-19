'use strict';
// Executed only by Creator's actual scene contribution, never serialized by shell tools.
const TYPES = [
    ['FaultSpotStage', 'FaultSpotStageController', 'faultSpotPrefab'],
    ['RotaryControlStage', 'RotaryControlStageController', 'rotaryControlPrefab'],
    ['GuidedTraceStage', 'GuidedTraceStageController', 'guidedTracePrefab'],
    ['SequenceTestStage', 'SequenceTestStageController', 'sequenceTestPrefab'],
    ['GaugeTuneStage', 'GaugeTuneStageController', 'gaugeTunePrefab'],
];
function load(cc, uuid) { return new Promise((resolve, reject) => cc.assetManager.loadAny(uuid, { reloadAsset: true }, (e, a) => e ? reject(e) : resolve(a))); }
function context(cc) {
    const scene = cc.director.getScene(), canvas = scene?.getChildByName('Canvas');
    const Manager = cc.js.getClassByName('LevelManager'), View = cc.js.getClassByName('Day5BStageView');
    const manager = Manager && canvas?.getComponent(Manager);
    if (!manager?.stageHost || !View) throw new Error('Open Game.scene and wait for current scripts to compile.');
    return { scene, canvas, manager, View };
}
exports.apply = async function(cc, request) {
    const bindings = Array.isArray(request) ? request : request.bindings;
    const qaEnabled = !Array.isArray(request) && request.qaEnabled === true;
    const { scene, canvas, manager, View } = context(cc);
    const api = (globalThis.cce || globalThis.EditorExtends)?.Prefab;
    if (!api?.generatePrefabDataFromNode) throw new Error('Native Creator Prefab serializer is unavailable.');
    const frames = await Promise.all(bindings.map(b => load(cc, b.uuid))), created = [], reused = [], temporary = [];
    if (frames.some(f => !(f instanceof cc.SpriteFrame))) throw new Error('New asset must be a real SpriteFrame.');
    function ui(parent, name, x, y, w, h) {
        const n = new cc.Node(name); n.layer = cc.Layers.Enum.UI_2D; n.setPosition(x, y, 0);
        n.addComponent(cc.UITransform).setContentSize(w, h); if (parent) n.parent = parent; return n;
    }
    function label(parent, name, x, y, w, h, text = '') {
        const n = ui(parent, name, x, y, w, h), v = n.addComponent(cc.Label);
        Object.assign(v, { string: text, fontFamily: 'Microsoft YaHei', fontSize: 28, lineHeight: 34,
            useSystemFont: true, horizontalAlign: cc.HorizontalTextAlignment.CENTER,
            verticalAlign: cc.VerticalTextAlignment.CENTER, overflow: cc.Label.Overflow.SHRINK, enableWrapText: true,
            color: new cc.Color(46, 76, 67, 255) }); return v;
    }
    try {
        for (const [name, className, property] of TYPES) {
            const Type = cc.js.getClassByName(className); if (!Type) throw new Error(`Class not imported: ${className}`);
            const url = `db://assets/prefabs/stages/${name}.prefab`;
            let info = await Editor.Message.request('asset-db', 'query-asset-info', url);
            if (!info) {
                const root = ui(null, name, 0, 0, 720, 800); temporary.push(root);
                const view = root.addComponent(View);
                view.deviceSprite = ui(root, 'Device', 0, 120, 560, 340).addComponent(cc.Sprite);
                view.deviceSprite.sizeMode = cc.Sprite.SizeMode.CUSTOM; view.deviceSprite.spriteFrame = frames[0];
                view.overlay = ui(root, 'Overlay', 0, 0, 720, 800).addComponent(cc.Graphics);
                view.controlLayer = ui(root, 'Controls', 0, 0, 720, 800);
                view.hintLabel = label(root, 'Hint', 0, -330, 620, 66);
                view.feedbackLabel = label(root, 'Feedback', 0, 326, 620, 60);
                view.keys = bindings.map(b => b.key); view.frames = frames;
                root.addComponent(Type).view = view;
                const serialized = api.generatePrefabDataFromNode(root)?.prefabData;
                if (typeof serialized !== 'string') throw new Error('Creator did not serialize Prefab');
                info = await Editor.Message.request('asset-db', 'create-asset', url, serialized);
                if (!info?.uuid) throw new Error(`Creator did not save ${url}`);
                created.push(url);
            } else reused.push(url);
            const prefab = await load(cc, info.uuid);
            if (!(prefab instanceof cc.Prefab) || !prefab.data.getComponent(Type)?.view) throw new Error(`Missing typed view binding: ${name}`);
            manager.stageHost[property] = prefab;
        }
        manager.useAdvancedOrders = true;
        let debug = canvas.getChildByName('Day5BReview');
        if (!debug) {
            debug = ui(canvas, 'Day5BReview', 0, -595, 650, 60);
            const block = await load(cc, 'b730527c-3233-41c2-aaf7-7cdab58f9749@f9941');
            for (let id = 10; id <= 15; id++) {
                const n = ui(debug, `ReviewOrder${id}`, (id - 12.5) * 100, 0, 88, 56);
                const s = n.addComponent(cc.Sprite); s.spriteFrame = block; s.type = cc.Sprite.Type.SLICED; s.sizeMode = cc.Sprite.SizeMode.CUSTOM;
                s.color = new cc.Color(254, 232, 166, 255);
                n.addComponent(cc.Button); label(n, 'Caption', 0, 0, 84, 50, `测${id}`);
            }
            const Launcher = cc.js.getClassByName('Day5BReviewLauncher');
            if (!Launcher) throw new Error('Debug-only review component not imported');
            Object.assign(canvas.addComponent(Launcher), { manager, home: canvas.getComponent(cc.js.getClassByName('HomeController')), reviewRoot: debug });
        }
        if (!debug.getChildByName('DevelopmentOnly')) label(debug, 'DevelopmentOnly', 0, 42, 620, 26, 'DEV · 仅开发验收入口').fontSize = 18;
        const launcher = canvas.getComponent(cc.js.getClassByName('Day5BReviewLauncher'));
        if (!launcher) throw new Error('Missing saved QA launcher');
        launcher.qaEnabled = qaEnabled === true;
        debug.active = false;
        if (cc.director.getScene() !== scene) throw new Error('Scene changed during asset creation; not saved.');
        return { ok: true, phase: 'final-polish', qaEnabled: launcher.qaEnabled, created, reused, prefabCount: TYPES.length, existingSceneNodeCount: count(scene),
            hostUuid: manager.stageHost.node.uuid, originalPrefabUuids: [manager.stageHost.dragMatchPrefab, manager.stageHost.cableConnectPrefab, manager.stageHost.cleanSwipePrefab].map(p => p.uuid) };
    } finally { for (const n of temporary) if (cc.isValid(n)) n.destroy(); }
};
function count(n) { return 1 + n.children.reduce((s, c) => s + count(c), 0); }
exports.inspect = async function(cc) {
    const { manager, canvas } = context(cc), checks = [];
    const check = (name, passed) => checks.push({ name, passed: Boolean(passed) });
    check('Saved formal manager opts into playable catalog', manager.useAdvancedOrders === true);
    const prefabs = [];
    for (const [name, type, property] of TYPES) {
        const bound = manager.stageHost[property]; check(`${name}:InspectorPrefab`, bound instanceof cc.Prefab);
        if (!bound) continue;
        const p = await load(cc, bound.uuid), c = p.data.getComponent(cc.js.getClassByName(type)), v = c?.view;
        check(`${name}:TypedControllerView`, Boolean(c && v && v.deviceSprite && v.controlLayer && v.overlay && v.hintLabel && v.feedbackLabel));
        check(`${name}:15SpriteFrames`, v?.keys.length === 15 && v.frames.length === 15 && v.frames.every(f => f instanceof cc.SpriteFrame));
        check(`${name}:NoBlockingDecoration`, p.data.getComponentsInChildren(cc.BlockInputEvents).length === 0);
        prefabs.push({ name, uuid: p.uuid, keys: v?.keys, nodeCount: count(p.data) });
    }
    const launcher = canvas.getComponent(cc.js.getClassByName('Day5BReviewLauncher'));
    check('Saved normal scene explicit QA switch defaults off', launcher?.qaEnabled === false);
    check('Saved developer input root inactive', launcher?.reviewRoot?.active === false);
    return { ok: checks.every(c => c.passed), checks, passedChecks: checks.filter(c => c.passed).length, totalChecks: checks.length, prefabs };
};
