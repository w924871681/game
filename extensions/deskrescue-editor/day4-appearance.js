'use strict';

const URL = 'db://assets/prefabs/stages/CleanSwipeStage.prefab';
const WIDTH = 680;
const HEIGHT = 560;

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function validateGeneratedData(content, sourceUuid, controllerId, dirtUuid) {
    // Inspect the Editor-generated serialization; never create or rewrite it here.
    const data = JSON.parse(content);
    assert(Array.isArray(data), 'Creator did not generate a serialized Prefab array.');
    const prefabs = data.filter(value => value.__type__ === 'cc.Prefab');
    assert(prefabs.length === 1, 'Expected one generated Prefab asset.');
    const rootIndex = prefabs[0].data?.__id__;
    const root = data[rootIndex];
    assert(root?.__type__ === 'cc.Node' && root._name === 'CleanSwipeStage' && !root._parent,
        'Generated Prefab must retain a standalone CleanSwipeStage root.');
    const controller = (root._components || []).map(ref => data[ref.__id__]).find(value => value.__type__ === controllerId);
    assert(controller, 'Generated Prefab lost CleanSwipeStageController.');
    const surfaceIndex = controller.inputSurface?.__id__;
    const surface = data[surfaceIndex];
    const layer = data[controller.dirtLayer?.__id__];
    assert(surface?._name === 'InputSurface' && surface._parent?.__id__ === rootIndex,
        'Generated inputSurface reference does not point at the original child.');
    assert(layer?._name === 'DirtLayer' && layer._parent?.__id__ === surfaceIndex,
        'Generated dirtLayer reference or hierarchy changed.');
    assert(controller.dirtCellPrefab?.__uuid__ === dirtUuid, 'Generated DirtCell Prefab binding changed.');
    const transform = (surface._components || []).map(ref => data[ref.__id__]).find(value => value.__type__ === 'cc.UITransform');
    assert(transform?._contentSize?.width === WIDTH && transform._contentSize.height === HEIGHT,
        'Creator serialization did not include the intended input surface size.');
    const selfReferences = [];
    function visit(value, location) {
        if (!value || typeof value !== 'object') return;
        if (value.__uuid__ === sourceUuid) selfReferences.push(location);
        if (Object.prototype.hasOwnProperty.call(value, '__id__')) {
            assert(Number.isInteger(value.__id__) && value.__id__ >= 0 && value.__id__ < data.length,
                `Invalid generated reference at ${location}`);
        }
        for (const [key, child] of Object.entries(value)) visit(child, `${location}.${key}`);
    }
    data.forEach((value, index) => visit(value, `[${index}]`));
    assert(selfReferences.length === 0, 'Refusing a Prefab containing an external reference to its own UUID.');
    return { objects: data.length, nodes: data.filter(value => value.__type__ === 'cc.Node').length,
        ownUuidReferences: selfReferences.length, width: transform._contentSize.width, height: transform._contentSize.height };
}

exports.run = async function run(cc) {
    const prefabManager = (globalThis.cce || globalThis.EditorExtends)?.Prefab;
    assert(prefabManager?.generatePrefabDataFromNode && prefabManager.removePrefabInfoFromNode,
        'Creator Prefab serialization and unlink APIs are required.');
    const info = await Editor.Message.request('asset-db', 'query-asset-info', URL);
    assert(info?.uuid, 'The saved CleanSwipeStage Prefab is missing.');
    const source = await new Promise((resolve, reject) => cc.assetManager.loadAny(info.uuid,
        { reloadAsset: true }, (error, loaded) => error ? reject(error) : resolve(loaded)));
    assert(source instanceof cc.Prefab && source.data?.name === 'CleanSwipeStage', 'Expected the existing CleanSwipeStage Prefab asset.');
    const Controller = cc.js.getClassByName('CleanSwipeStageController');
    assert(Controller, 'CleanSwipeStageController must be imported before appearance correction.');
    const sourceController = source.data.getComponent(Controller);
    const sourceSurface = source.data.getChildByName('InputSurface');
    const sourceTransform = sourceSurface?.getComponent(cc.UITransform);
    assert(sourceTransform && sourceController?.inputSurface === sourceSurface
        && sourceController.dirtLayer === sourceSurface.getChildByName('DirtLayer')
        && sourceController.dirtCellPrefab instanceof cc.Prefab, 'Existing Prefab bindings do not match the expected clean stage.');
    const before = { width: sourceTransform.width, height: sourceTransform.height };
    if (before.width === WIDTH && before.height === HEIGHT) {
        return { ok: true, changed: false, prefabUuid: info.uuid, url: URL, before, after: before,
            message: 'Clean input surface already leaves the HUD unobstructed.' };
    }
    let temporary = null;
    try {
        // Clone the existing resource data to preserve its children, component values,
        // colors and Inspector references without mutating the loaded asset or scene.
        temporary = cc.instantiate(source.data);
        assert(temporary !== source.data && !temporary.parent, 'The correction requires an isolated Prefab-data clone.');
        // The clone contains source Prefab metadata. Remove the instance association
        // through Creator before serializing so it cannot become a self-nested Prefab.
        prefabManager.removePrefabInfoFromNode(temporary, true);
        const controller = temporary.getComponent(Controller);
        const surface = temporary.getChildByName('InputSurface');
        const transform = surface?.getComponent(cc.UITransform);
        assert(transform && controller?.inputSurface === surface
            && controller.dirtLayer === surface.getChildByName('DirtLayer'), 'Cloning did not preserve internal controller references.');
        transform.setContentSize(WIDTH, HEIGHT);
        const generated = prefabManager.generatePrefabDataFromNode(temporary);
        assert(typeof generated?.prefabData === 'string' && generated.prefabData.length > 0, 'Creator did not generate Prefab data.');
        const validation = validateGeneratedData(generated.prefabData, info.uuid,
            cc.js._getClassId(Controller), sourceController.dirtCellPrefab._uuid);
        const saved = await Editor.Message.request('asset-db', 'save-asset', info.uuid, generated.prefabData);
        assert(saved?.uuid === info.uuid, 'Asset Database did not confirm the original Prefab UUID after saving.');
        return { ok: true, changed: true, prefabUuid: saved.uuid, url: URL, before,
            after: { width: WIDTH, height: HEIGHT }, generatedValidation: validation,
            formalSceneModified: false,
            message: 'Creator saved the clean input surface at 680 × 560; grid, controller references and node positions are retained.' };
    } finally {
        if (temporary && cc.isValid(temporary)) temporary.destroy();
    }
};
