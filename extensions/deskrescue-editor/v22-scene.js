'use strict';

// Only existing Prefab display components change; serialization stays in Creator.
const PREFABS = ['elements/DragItem', 'elements/DragTarget', 'elements/Port', 'elements/Cable',
    'elements/DirtCell', 'stages/DragMatchStage', 'stages/CableConnectStage', 'stages/CleanSwipeStage'];
function count(node) { return 1 + node.children.reduce((sum, child) => sum + count(child), 0); }
async function load(cc, uuid) {
    let problem;
    for (let attempt = 0; attempt < 20; attempt++) {
        try {
            return await new Promise((resolve, reject) => cc.assetManager.loadAny(uuid, { reloadAsset: true },
                (error, asset) => error ? reject(error) : resolve(asset)));
        } catch (error) {
            problem = error;
            if (attempt < 19) await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    throw problem;
}
exports.inspect = function (cc) { return require('./v21-scene').inspect(cc, 'full'); };
exports.apply = async function (cc) {
    const scene = cc.director.getScene(), canvas = scene?.getChildByName('Canvas');
    const Manager = cc.js.getClassByName('LevelManager'), Visual = cc.js.getClassByName('ElementVisual');
    const Drag = cc.js.getClassByName('DragMatchStageController'), Cable = cc.js.getClassByName('CableConnectStageController');
    const manager = canvas?.getComponent(Manager), api = (globalThis.cce || globalThis.EditorExtends)?.Prefab;
    if (!manager?.stageHost || !Visual || !api?.generatePrefabDataFromNode) throw new Error('Open the existing saved Game.scene and wait for current scripts.');
    const sources = new Map(), uuids = {}, before = {}, after = {}, touched = [];
    for (const relative of PREFABS) {
        const name = `assets/prefabs/${relative}.prefab`;
        const info = await Editor.Message.request('asset-db', 'query-asset-info', `db://${name}`);
        if (!info?.uuid) throw new Error(`Missing existing asset ${name}`);
        const asset = await load(cc, info.uuid);
        if (!(asset instanceof cc.Prefab)) throw new Error(`Not a Prefab: ${name}`);
        sources.set(relative, asset); uuids[name] = info.uuid;
        before[name] = count(asset.data); after[name] = before[name];
    }
    before['assets/scenes/Game.scene'] = count(scene);
    async function edit(relative, modify) {
        const name = `assets/prefabs/${relative}.prefab`, copy = cc.instantiate(sources.get(relative).data);
        try {
            api.removePrefabInfoFromNode(copy, true); modify(copy); after[name] = count(copy);
            const data = api.generatePrefabDataFromNode(copy)?.prefabData;
            if (typeof data !== 'string') throw new Error(`Native serialization missing: ${name}`);
            for (let attempt = 0; ; attempt++) {
                try {
                    const saved = await Editor.Message.request('asset-db', 'save-asset', uuids[name], data);
                    if (saved?.uuid !== uuids[name]) throw new Error(`Unexpected asset identity: ${name}`);
                    break;
                } catch (error) {
                    if (attempt >= 5 || !/UNKNOWN|EBUSY|EPERM/.test(String(error))) throw error;
                    await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
                }
            }
            await Editor.Message.request('asset-db', 'reimport-asset', uuids[name]);
            const current = await load(cc, uuids[name]); sources.set(relative, current); touched.push(name); return current;
        } finally { if (cc.isValid(copy)) copy.destroy(); }
    }
    function captions(node) {
        const visual = node.getComponent(Visual);
        if (!visual?.caption || !visual.icon || visual.refinedLayout !== true
            || !('smallScreenLegibility' in visual)) throw new Error('Current ElementVisual has not imported its V22 property.');
        visual.smallScreenLegibility = true;
        visual.caption.enableOutline = true;
        visual.caption.outlineColor = new cc.Color(255, 245, 219, 255);
        visual.caption.outlineWidth = 2;
    }
    const item = await edit('elements/DragItem', captions), target = await edit('elements/DragTarget', captions);
    const port = await edit('elements/Port', captions);
    const cable = await edit('elements/Cable', node => {
        const connector = node.getComponent(cc.js.getClassByName('CableConnector'));
        if (!connector?.head) throw new Error('Preserved Cable Head binding missing');
        captions(connector.head);
    });
    manager.stageHost.dragMatchPrefab = await edit('stages/DragMatchStage', node => {
        Object.assign(node.getComponent(Drag), { itemPrefab: item, targetPrefab: target });
    });
    manager.stageHost.cableConnectPrefab = await edit('stages/CableConnectStage', node => {
        Object.assign(node.getComponent(Cable), { portPrefab: port, cablePrefab: cable });
    });
    after['assets/scenes/Game.scene'] = count(scene); touched.push('assets/scenes/Game.scene');
    return { ok: true, phase: 'full', scope: 'V22 existing visual-child opt-in and caption outline only; P2 scene composition unchanged',
        coreUuids: uuids, touchedResources: touched, beforeNodes: before, afterNodes: after,
        addedNodesByResource: Object.fromEntries(touched.map(name => [name, after[name] - before[name]])) };
};
