'use strict';

// Incremental decoration only. All serialization is performed by the real Editor.
const PREFABS = ['elements/DragItem', 'elements/DragTarget', 'elements/Port', 'elements/Cable', 'elements/DirtCell',
    'stages/DragMatchStage', 'stages/CableConnectStage', 'stages/CleanSwipeStage'];
const NAMES = ['LevelManager', 'HomeController', 'StageHost', 'RunController', 'VisualAssetRegistry', 'V2ResultView', 'PaperOrderHUD',
    'AudioFeedback', 'ElementVisual', 'CableConnector', 'V2CableLine', 'V2DirtAppearance', 'V21CleanDustView',
    'CleanSwipeStageController', 'CableConnectStageController', 'DragMatchStageController', 'WorkshopDecoration', 'ResultStars'];
function types(cc) {
    return Object.fromEntries(NAMES.map(name => {
        const Type = cc.js.getClassByName(name);
        if (!Type) throw new Error(`Wait for Creator to import ${name}`);
        return [name, Type];
    }));
}
function count(n) { return 1 + n.children.reduce((sum, c) => sum + count(c), 0); }
async function load(cc, id, Type) {
    let problem;
    for (let attempt = 0; attempt < 20; attempt++) {
        try {
            const asset = await new Promise((resolve, reject) => cc.assetManager.loadAny(id, { reloadAsset: true },
                (error, result) => error ? reject(error) : resolve(result)));
            if (!(asset instanceof Type)) throw new Error(`Unexpected asset ${id}`);
            return asset;
        } catch(error) {
            problem = error;
            if (attempt < 19) await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    throw problem;
}
exports.inspect = function(cc, phase) {
    const C = types(cc), scene = cc.director.getScene(), canvas = scene.getChildByName('Canvas');
    const manager = canvas.getComponent(C.LevelManager);
    return { ok: true, phase, sceneUuid: scene.uuid, hostUuid: manager.stageHost.node.uuid,
        classes: Object.fromEntries(Object.entries(C).map(([name, Type]) => [name, cc.js._getClassId(Type)])),
        registryKeys: canvas.getComponent(C.VisualAssetRegistry).keys.slice() };
};
exports.apply = async function(cc, input) {
    const C = types(cc), scene = cc.director.getScene(), canvas = scene?.getChildByName('Canvas');
    const api = (globalThis.cce || globalThis.EditorExtends)?.Prefab;
    const manager = canvas?.getComponent(C.LevelManager), home = canvas?.getComponent(C.HomeController);
    if (!manager?.stageHost || !home || !api?.generatePrefabDataFromNode) throw new Error('Open the existing saved V2 Game.scene.');
    const before = {}, after = {}, coreUuids = {}, touched = [], frames = new Map();
    for (const b of input.bindings) frames.set(b.key, await load(cc, b.uuid, cc.SpriteFrame));
    const registry = canvas.getComponent(C.VisualAssetRegistry);
    const registryFrames = new Map(registry.keys.map((key, i) => [key, registry.frames[i]]));
    const frame = key => frames.get(key) || registryFrames.get(key);
    const color = hex => new cc.Color().fromHEX(hex);
    function ui(parent, name, width, height) {
        const n = parent.getChildByName(name) || new cc.Node(name); n.parent = parent; n.layer = cc.Layers.Enum.UI_2D;
        (n.getComponent(cc.UITransform) || n.addComponent(cc.UITransform)).setContentSize(width, height); return n;
    }
    function sprite(n, key, tint = '#FFFFFF', sliced = false) {
        const s = n.getComponent(cc.Sprite) || n.addComponent(cc.Sprite);
        s.spriteFrame = frame(key); if (!s.spriteFrame) throw new Error(`Missing imported frame ${key}`);
        s.enabled = true; s.sizeMode = cc.Sprite.SizeMode.CUSTOM; s.type = sliced ? cc.Sprite.Type.SLICED : cc.Sprite.Type.SIMPLE;
        s.color = color(tint); return s;
    }
    const canvasTransform = canvas.getComponent(cc.UITransform);
    function at(parent, name, x, y, width, height) {
        const n = ui(parent, name, width, height);
        const world = canvasTransform.convertToWorldSpaceAR(new cc.Vec3(x + width / 2 - 360, 640 - y - height / 2));
        n.setPosition(parent.getComponent(cc.UITransform).convertToNodeSpaceAR(world)); return n;
    }
    function place(parent, name, x, y, w, h) {
        const n = parent.getChildByName(name); if (!n) throw new Error(`Existing V2 decoration absent: ${name}`);
        at(parent, name, x, y, w, h); return n;
    }
    function text(parent, name, size, tint) {
        const label = parent.getChildByName(name)?.getComponent(cc.Label); if (!label) throw new Error(`Missing label ${name}`);
        label.fontSize = size; label.lineHeight = size + 5; if (tint) label.color = color(tint); return label;
    }
    const sources = new Map();
    for (const relative of PREFABS) {
        const path = `assets/prefabs/${relative}.prefab`, info = await Editor.Message.request('asset-db', 'query-asset-info', `db://${path}`);
        if (!info?.uuid) throw new Error(`Missing existing core asset ${path}`);
        coreUuids[path] = info.uuid; sources.set(relative, await load(cc, info.uuid, cc.Prefab));
        before[path] = count(sources.get(relative).data); after[path] = before[path];
    }
    before['assets/scenes/Game.scene'] = count(scene);
    async function edit(relative, modify) {
        const path = `assets/prefabs/${relative}.prefab`, source = sources.get(relative), copy = cc.instantiate(source.data);
        try {
            api.removePrefabInfoFromNode(copy, true); modify(copy);
            after[path] = count(copy);
            const data = api.generatePrefabDataFromNode(copy)?.prefabData;
            if (typeof data !== 'string') throw new Error(`Creator serialization missing ${path}`);
            for (let attempt = 0; ; attempt++) {
                try {
                    const saved = await Editor.Message.request('asset-db', 'save-asset', coreUuids[path], data);
                    if (saved?.uuid !== coreUuids[path]) throw new Error(`Asset UUID changed ${path}`);
                    break;
                } catch(error) {
                    if (attempt >= 5 || !/UNKNOWN|EBUSY|EPERM/.test(String(error))) throw error;
                    await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
                }
            }
            await Editor.Message.request('asset-db', 'reimport-asset', coreUuids[path]);
            const result = await load(cc, coreUuids[path], cc.Prefab); sources.set(relative, result); touched.push(path); return result;
        } finally { if (cc.isValid(copy)) copy.destroy(); }
    }
    // Keep stable keys; skin changes point at newly imported copies, never overwrite old PNGs.
    for (const b of input.bindings.filter(b => b.bindingKey)) {
        const index = registry.keys.indexOf(b.bindingKey);
        if (index < 0) throw new Error(`Stable registry key absent: ${b.bindingKey}`);
        registry.frames[index] = frames.get(b.key);
    }
    const port = await edit('elements/Port', n => { n.getComponent(C.ElementVisual).refinedLayout = true; });
    const cable = await edit('elements/Cable', n => {
        const connector = n.getComponent(C.CableConnector), visual = n.getComponent(C.V2CableLine);
        connector.head.getComponent(C.ElementVisual).refinedLayout = true; visual.refinedStyle = true;
        const lamp = ui(connector.head, 'V21ConnectedLamp', 18, 18); lamp.setPosition(48, 34, 0);
        sprite(lamp, 'v2/cable-anchor', '#83FFD7'); lamp.active = false; visual.statusLight = lamp;
    });
    const dirt = await edit('elements/DirtCell', n => {
        const dust = n.getComponent(C.V2DirtAppearance).dust;
        // Preserve the old cell/fade/pool and its component bindings. Only its renderer is retired.
        dust.getComponent(cc.Sprite).enabled = false;
    });
    manager.stageHost.cableConnectPrefab = await edit('stages/CableConnectStage', n => {
        const stage = n.getComponent(C.CableConnectStageController); Object.assign(stage, { portPrefab: port, cablePrefab: cable });
        const layer = ui(n, 'V21CableArtworkLayer', 720, 800); layer.setPosition(0, 0, 0); layer.setSiblingIndex(0);
    });
    manager.stageHost.cleanSwipePrefab = await edit('stages/CleanSwipeStage', n => {
        const stage = n.getComponent(C.CleanSwipeStageController); stage.dirtCellPrefab = dirt;
        const layer = ui(stage.dirtLayer, 'V21DustArtwork', 680, 560); layer.setPosition(0, 0, 0);
        const view = n.getComponent(C.V21CleanDustView) || n.addComponent(C.V21CleanDustView);
        Object.assign(view, { artworkRoot: layer, dustFrame: frame('v2/irregular-dust') }); stage.dustView = view;
    });
    if (input.phase !== 'sample') {
        const cableDecor = canvas.getChildByName('V2Workbench').getChildByName('CableDecor');
        // Place the decorative caption below the lowest existing cable hitbox, outside all wire paths.
        place(cableDecor, 'CableTitlePlate', 230, 960, 260, 48);
        place(cableDecor, 'CableTitle', 235, 966, 250, 34);
        const refine = n => { n.getComponent(C.ElementVisual).refinedLayout = true; };
        const item = await edit('elements/DragItem', refine), target = await edit('elements/DragTarget', refine);
        manager.stageHost.dragMatchPrefab = await edit('stages/DragMatchStage', n => {
            Object.assign(n.getComponent(C.DragMatchStageController), { itemPrefab: item, targetPrefab: target });
        });
        const group = manager.resultView.orderGroup;
        place(group, 'ResultPaper', 48, 205, 624, 790);
        const badge = at(group, 'V21GoldenBadge', 205, 225, 310, 76); sprite(badge, 'v2/gold-button', '#FFFFFF', true); badge.setSiblingIndex(1);
        place(group, 'OrderBadge', 215, 241, 290, 40); text(group, 'OrderBadge', 30, '#7A4A24');
        place(group, 'CheerTitle', 120, 319, 480, 82); text(group, 'CheerTitle', 62);
        const starRoot = manager.resultView.starContainer;
        [226, 360, 494].forEach((x, i) => {
            const n = place(starRoot, `RewardStar${i + 1}`, x - 54, i === 1 ? 411 : 426, 108, 108);
            n.setScale(1, 1, 1);
        });
        manager.resultStars.staggerSeconds = 0.075;
        place(group, 'ScoreCaption', 220, 548, 280, 34); text(group, 'ScoreCaption', 25);
        place(group, 'ScoreValue', 160, 580, 400, 90); text(group, 'ScoreValue', 82, '#CE792B');
        place(group, 'ThumbsupBoy', 36, 700, 178, 222);
        place(group, 'TimeCard', 225, 690, 190, 108); place(group, 'MistakeCard', 425, 690, 190, 108);
        place(group, 'TimeCaption', 235, 700, 170, 28); place(group, 'MistakeCaption', 435, 700, 170, 28);
        place(group, 'ResultElapsed', 232, 735, 176, 42); place(group, 'ResultMistakes', 432, 735, 176, 42);
        place(group, 'ResultSteps', 228, 811, 370, 30); text(group, 'ResultSteps', 23);
        place(group, 'NextHint', 222, 848, 384, 28); text(group, 'NextHint', 22);
        const decor = group.getComponent(C.WorkshopDecoration); decor.visualRoot = group.getChildByName('ThumbsupBoy'); decor.enterSeconds = 0.34; decor.floatAmplitude = 5;
        const header = canvas.getChildByName('Header').getChildByName('V2PaperHUD');
        text(header, 'Step', 22); text(header, 'Progress', 23);
    }
    if (input.phase === 'full') {
        place(home.overlay, 'V2WelcomeBoy', 345, 532, 260, 325);
        text(home.overlay, 'V2Logo', 68); text(home.overlay, 'V2LogoShadow', 68);
        const final = manager.resultView.finalGroup;
        place(final, 'CheeringBoy', 48, 795, 200, 250);
        for (let i = 0; i < 3; i++) text(final, `MinorValue${i}`, 27);
    }
    after['assets/scenes/Game.scene'] = count(scene); touched.push('assets/scenes/Game.scene');
    return { ...exports.inspect(cc, input.phase), nodeCountsBefore: before, nodeCountsAfter: after,
        addedNodesByResource: Object.fromEntries(Object.keys(before).map(key => [key, after[key] - before[key]])),
        touchedResources: touched, coreUuids, serializer: 'Actual Creator incremental Node/Prefab API + asset-db.save-asset; no input geometry mutations' };
};
