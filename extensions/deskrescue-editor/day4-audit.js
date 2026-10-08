'use strict';

// Read-only inspection of resources already saved by Creator. This module never
// constructs, repairs, serializes, or writes a Scene, Prefab, or metadata file.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const WHITE_FRAME = 'b730527c-3233-41c2-aaf7-7cdab58f9749@f9941';
const PREFABS = [
    ['DragMatchStage', 'stages'], ['CableConnectStage', 'stages'], ['CleanSwipeStage', 'stages'],
    ['DragItem', 'elements'], ['DragTarget', 'elements'], ['Cable', 'elements'], ['Port', 'elements'], ['DirtCell', 'elements'],
];

function compressUuid(uuid, headLength = 5) {
    const hex = uuid.replace(/-/g, '');
    if (!/^[a-f\d]{32}$/i.test(hex)) return uuid;
    let result = hex.slice(0, headLength);
    for (let index = headLength; index < hex.length; index += 3) {
        const value = parseInt(hex.slice(index, index + 3), 16);
        result += BASE64[value >> 6] + BASE64[value & 63];
    }
    return result;
}

function listFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    const result = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) result.push(...listFiles(full));
        else if (entry.isFile()) result.push(full);
    }
    return result;
}

exports.run = function run(projectPath, runtime) {
    const checks = [];
    const errors = [];
    const files = [];
    const assets = new Map();
    const scriptIds = new Map();
    const scriptFiles = new Map();
    const resources = new Map();
    const externalReferences = [];
    const root = path.resolve(projectPath);
    const relative = (file) => path.relative(root, file).replace(/\\/g, '/');
    const check = (name, passed, actual, expected) => {
        checks.push({ name, passed: Boolean(passed), actual: actual === undefined ? null : actual, expected });
        if (!passed) errors.push(name);
    };
    function fingerprint(file, buffer) {
        const relativePath = relative(file);
        const previous = files.find(entry => entry.path === relativePath);
        if (previous) return previous;
        const contents = buffer || fs.readFileSync(file);
        const entry = { path: relativePath, bytes: contents.length, sha256: crypto.createHash('sha256').update(contents).digest('hex') };
        files.push(entry);
        return entry;
    }
    function read(file, required = true) {
        try {
            const buffer = fs.readFileSync(file);
            const data = JSON.parse(buffer.toString('utf8').replace(/^\uFEFF/, ''));
            if (required) fingerprint(file, buffer);
            return data;
        } catch (error) {
            if (required) check(`read:${relative(file)}`, false, error.message, 'Readable JSON saved by Creator');
            return null;
        }
    }
    function indexMeta(meta, file, source) {
        if (!meta || typeof meta !== 'object') return;
        if (typeof meta.uuid === 'string') {
            const value = { uuid: meta.uuid, source, path: source === 'project' ? relative(file) : file,
                importer: meta.importer, imported: meta.imported, assetExists: fs.existsSync(file.slice(0, -5)) };
            const previous = assets.get(meta.uuid);
            if (previous && previous.path !== value.path) {
                check(`duplicateAssetUuid:${meta.uuid}`, false, [previous.path, value.path], 'One metadata owner per UUID');
            }
            assets.set(meta.uuid, value);
        }
        for (const child of Object.values(meta.subMetas || {})) indexMeta(child, file, source);
    }
    for (const file of listFiles(path.join(root, 'assets')).filter(value => value.endsWith('.meta'))) {
        const meta = read(file, false);
        if (!meta) {
            check(`parseMetadata:${relative(file)}`, false, null, 'Valid JSON metadata');
            continue;
        }
        indexMeta(meta, file, 'project');
        if (meta.importer === 'typescript' && typeof meta.uuid === 'string') {
            const info = { name: path.basename(file, '.ts.meta'), path: relative(file), uuid: meta.uuid,
                imported: meta.imported, sourceExists: fs.existsSync(file.slice(0, -5)) };
            info.metadataSha256 = fingerprint(file).sha256;
            if (info.sourceExists) info.sourceSha256 = fingerprint(file.slice(0, -5)).sha256;
            scriptFiles.set(info.name, info);
            for (const id of [meta.uuid, compressUuid(meta.uuid), compressUuid(meta.uuid, 2)]) scriptIds.set(id, info);
        }
    }
    let engineAssets = null;
    try {
        const declaration = fs.readFileSync(path.join(root, 'temp', 'declarations', 'cc.d.ts'), 'utf8');
        const reference = declaration.match(/reference\s+path=["']([^"']+)["']/);
        if (reference) {
            const sdkFile = path.resolve(root, 'temp', 'declarations', reference[1]);
            engineAssets = path.resolve(path.dirname(sdkFile), '..', '..', 'editor', 'assets');
        }
        check('installedEngineMetadataAvailable', Boolean(engineAssets && fs.existsSync(engineAssets)), engineAssets, 'Actual Creator engine/editor/assets directory');
        if (engineAssets) for (const file of listFiles(engineAssets).filter(value => value.endsWith('.meta'))) indexMeta(read(file, false), file, 'creator-builtin');
    } catch (error) {
        check('installedEngineMetadataAvailable', false, error.message, 'Actual Creator declarations and builtin metadata');
    }

    check('runtimeInspectionSucceeded', runtime?.ok === true, runtime?.ok, true);
    const classes = runtime?.classes || {};
    for (const name of ['LevelManager', 'StageHost', 'DragMatchStageController', 'CableConnectStageController',
        'CleanSwipeStageController', 'DraggableItem', 'CableConnector', 'RunController', 'GameController', 'Day1Prototype']) {
        const id = classes[name];
        const script = scriptIds.get(id);
        check(`runtimeClass:${name}`, Boolean(script && script.name === name && script.imported && script.sourceExists),
            { classId: id, script: script || null }, 'Registered class resolves to its imported project TypeScript metadata');
    }
    function resolveType(type) { return scriptIds.get(type)?.name || type; }
    function resource(name, relativeFile, importer) {
        const file = path.join(root, relativeFile);
        const data = read(file);
        const meta = read(`${file}.meta`);
        if (!Array.isArray(data)) {
            check(`${name}:serializedArray`, false, typeof data, 'Creator serialized object array');
            return null;
        }
        check(`${name}:metadata`, Boolean(meta?.imported && meta.importer === importer && meta.uuid), meta,
            `Imported ${importer} with UUID`);
        const result = { name, path: relativeFile.replace(/\\/g, '/'), data, meta, nodes: [], components: [], internalReferences: 0, externalReferences: 0 };
        const ref = value => value && Number.isInteger(value.__id__) ? data[value.__id__] : null;
        const index = value => data.indexOf(value);
        const nodePath = value => {
            let node = value?.__type__ === 'cc.Node' || value?.__type__ === 'cc.Scene' ? value : ref(value?.node);
            const names = [];
            const seen = new Set();
            while (node && node.__type__ !== 'cc.Scene' && !seen.has(node)) {
                seen.add(node); names.unshift(node._name); node = ref(node._parent);
            }
            return names.join('/');
        };
        const active = value => {
            let node = value?.__type__ === 'cc.Node' || value?.__type__ === 'cc.Scene' ? value : ref(value?.node);
            if (!node || value?._enabled === false) return false;
            const seen = new Set();
            while (node) {
                if (node._active === false || seen.has(node)) return false;
                seen.add(node); node = ref(node._parent);
            }
            return true;
        };
        const component = (node, type) => (node?._components || []).map(ref).find(value => value && resolveType(value.__type__) === type) || null;
        const find = nodeName => data.filter(value => value?.__type__ === 'cc.Node' && value._name === nodeName);
        const nodeAt = fullPath => data.find(value => value?.__type__ === 'cc.Node' && nodePath(value) === fullPath) || null;
        const invalidIds = [];
        const invalidUuids = [];
        const missingScripts = [];
        function visit(value, location) {
            if (!value || typeof value !== 'object') return;
            if (Object.prototype.hasOwnProperty.call(value, '__id__')) {
                result.internalReferences += 1;
                if (!Number.isInteger(value.__id__) || value.__id__ < 0 || value.__id__ >= data.length || !data[value.__id__]) invalidIds.push({ location, id: value.__id__ });
            }
            if (Object.prototype.hasOwnProperty.call(value, '__uuid__')) {
                result.externalReferences += 1;
                const asset = assets.get(value.__uuid__);
                const entry = { resource: result.path, location, uuid: value.__uuid__, resolved: asset || null };
                externalReferences.push(entry);
                if (!asset || !asset.imported || !asset.assetExists) invalidUuids.push(entry);
            }
            if (typeof value.__type__ === 'string' && !value.__type__.startsWith('cc.')
                && !value.__type__.startsWith('cclegacy.') && !scriptIds.has(value.__type__)) missingScripts.push({ location, type: value.__type__ });
            for (const [key, child] of Object.entries(value)) visit(child, `${location}.${key}`);
        }
        data.forEach((value, objectIndex) => {
            visit(value, `[${objectIndex}]`);
            if (value.__type__ === 'cc.Node') result.nodes.push({ index: objectIndex, name: value._name, path: nodePath(value), active: active(value), uuid: value._id });
            else if (value.node && ref(value.node)?.__type__ === 'cc.Node') result.components.push({ index: objectIndex, type: resolveType(value.__type__), nodePath: nodePath(value), active: active(value) });
        });
        check(`${name}:internalReferences`, invalidIds.length === 0, invalidIds, []);
        check(`${name}:externalAssetReferences`, invalidUuids.length === 0, invalidUuids, []);
        check(`${name}:scriptReferences`, missingScripts.length === 0, missingScripts, []);
        const hierarchyErrors = [];
        for (const node of data.filter(value => value?.__type__ === 'cc.Node' || value?.__type__ === 'cc.Scene')) {
            for (const childRef of node._children || []) {
                const child = ref(childRef);
                if (!child || ref(child._parent) !== node) hierarchyErrors.push({ parent: index(node), child: childRef?.__id__ });
            }
            const references = node._components || [];
            if (new Set(references.map(value => value.__id__)).size !== references.length) hierarchyErrors.push({ duplicateComponents: index(node) });
            for (const componentRef of references) if (ref(ref(componentRef)?.node) !== node) hierarchyErrors.push({ componentOwner: componentRef?.__id__, node: index(node) });
        }
        check(`${name}:hierarchyAndComponentOwnership`, hierarchyErrors.length === 0, hierarchyErrors, []);
        check(`${name}:noAutoLayout`, !data.some(value => value?.__type__ === 'cc.Layout'), data.filter(value => value?.__type__ === 'cc.Layout').length, 0);
        const labels = data.filter(value => value.__type__ === 'cc.Label');
        check(`${name}:labelsShrinkAndWrap`, labels.every(value => value._overflow === 2 && value._enableWrapText === true),
            labels.map(value => ({ path: nodePath(value), overflow: value._overflow, wrap: value._enableWrapText })), 'All Labels SHRINK and wrap');
        const sprites = data.filter(value => value.__type__ === 'cc.Sprite');
        check(`${name}:plainSlicedSprites`, sprites.every(value => value._type === 1 && value._spriteFrame?.__uuid__ === WHITE_FRAME),
            sprites.map(value => ({ path: nodePath(value), type: value._type, frame: value._spriteFrame?.__uuid__ })), 'Creator builtin white SLICED SpriteFrame');
        Object.assign(result, { ref, index, nodePath, active, component, find, nodeAt });
        resources.set(name, result);
        return result;
    }
    const scene = resource('Game', 'assets/scenes/Game.scene', 'scene');
    for (const [name, category] of PREFABS) resource(name, `assets/prefabs/${category}/${name}.prefab`, 'prefab');
    function requiredComponent(asset, node, type, checkName) {
        const found = asset?.component(node, type);
        check(checkName, Boolean(found && found._enabled !== false), found ? { objectIndex: asset.index(found), path: asset.nodePath(found), type, enabled: found._enabled } : null, `Enabled ${type} component on expected node`);
        return found;
    }
    function binding(asset, owner, property, type, expectedPath) {
        const target = asset?.ref(owner?.[property]);
        const actual = target ? { type: resolveType(target.__type__), path: asset.nodePath(target) } : null;
        check(`${asset?.name || 'missing'}:${property}->${expectedPath}`, Boolean(target && actual.type === type && actual.path === expectedPath), actual, { type, path: expectedPath });
        return target;
    }
    function prefabBinding(asset, owner, property, name) {
        const expected = resources.get(name)?.meta?.uuid;
        check(`${asset?.name || 'missing'}:${property}->${name}`, Boolean(expected && owner?.[property]?.__uuid__ === expected), owner?.[property]?.__uuid__, expected || 'Saved Prefab UUID');
    }
    for (const [name] of PREFABS) {
        const asset = resources.get(name);
        if (!asset) continue;
        const container = asset.data.find(value => value.__type__ === 'cc.Prefab');
        const rootNode = asset.ref(container?.data);
        check(`${name}:prefabRoot`, Boolean(rootNode?.__type__ === 'cc.Node' && rootNode._name === name && !rootNode._parent && rootNode._active !== false),
            rootNode ? { name: rootNode._name, type: rootNode.__type__, parent: rootNode._parent, active: rootNode._active } : null, `Active standalone ${name} root Node`);
        requiredComponent(asset, rootNode, 'cc.UITransform', `${name}:rootUITransform`);
        if (name.endsWith('Stage')) {
            const controller = requiredComponent(asset, rootNode, `${name}Controller`, `${name}:rootController`);
            check(`${name}:singleRootController`, asset.components.filter(value => value.type === `${name}Controller`).length === 1,
                asset.components.filter(value => value.type === `${name}Controller`).length, 1);
            if (name === 'DragMatchStage') {
                requiredComponent(asset, rootNode, 'GameController', `${name}:localGameController`);
                binding(asset, controller, 'gameController', 'GameController', name);
                prefabBinding(asset, controller, 'itemPrefab', 'DragItem');
                prefabBinding(asset, controller, 'targetPrefab', 'DragTarget');
            } else if (name === 'CableConnectStage') {
                prefabBinding(asset, controller, 'cablePrefab', 'Cable');
                prefabBinding(asset, controller, 'portPrefab', 'Port');
            } else {
                prefabBinding(asset, controller, 'dirtCellPrefab', 'DirtCell');
                const surface = binding(asset, controller, 'inputSurface', 'cc.Node', `${name}/InputSurface`);
                const layer = binding(asset, controller, 'dirtLayer', 'cc.Node', `${name}/InputSurface/DirtLayer`);
                requiredComponent(asset, surface, 'cc.UITransform', `${name}:inputSurfaceUI`);
                requiredComponent(asset, layer, 'cc.UITransform', `${name}:dirtLayerUI`);
            }
        } else if (name === 'Cable') {
            const controller = requiredComponent(asset, rootNode, 'CableConnector', 'Cable:connector');
            const head = binding(asset, controller, 'head', 'cc.Node', 'Cable/Head');
            const anchor = binding(asset, controller, 'anchor', 'cc.Node', 'Cable/Anchor');
            const line = binding(asset, controller, 'line', 'cc.Graphics', 'Cable/Line');
            for (const [node, label] of [[head, 'Head'], [anchor, 'Anchor'], [asset.ref(line?.node), 'Line']]) requiredComponent(asset, node, 'cc.UITransform', `Cable:${label}UI`);
            requiredComponent(asset, head, 'cc.Sprite', 'Cable:headSprite');
            requiredComponent(asset, asset.nodeAt('Cable/Head/Label'), 'cc.Label', 'Cable:headLabel');
        } else {
            requiredComponent(asset, rootNode, 'cc.Sprite', `${name}:sprite`);
            if (name === 'DirtCell') requiredComponent(asset, rootNode, 'cc.UIOpacity', 'DirtCell:opacity');
            else requiredComponent(asset, asset.nodeAt(`${name}/Label`), 'cc.Label', `${name}:label`);
            if (name === 'DragItem') requiredComponent(asset, rootNode, 'DraggableItem', 'DragItem:draggable');
        }
    }
    if (scene) {
        const sceneObject = scene.data.find(value => value.__type__ === 'cc.Scene');
        check('Game:sceneUuidMatchesSavedMetadataAndRuntime', Boolean(scene.meta?.uuid && sceneObject?._id === scene.meta.uuid && runtime?.sceneUuid === scene.meta.uuid),
            { serialized: sceneObject?._id, metadata: scene.meta?.uuid, runtime: runtime?.sceneUuid }, 'Identical saved Scene UUID');
        const canvasNode = scene.nodeAt('Canvas');
        const canvas = requiredComponent(scene, canvasNode, 'cc.Canvas', 'Game:canvas');
        const canvasUI = requiredComponent(scene, canvasNode, 'cc.UITransform', 'Game:canvasUI');
        check('Game:canvas720x1280', canvasUI?._contentSize?.width === 720 && canvasUI?._contentSize?.height === 1280,
            canvasUI?._contentSize, { width: 720, height: 1280 });
        check('Game:canvasPosition', canvasNode?._lpos?.x === 360 && canvasNode?._lpos?.y === 640, canvasNode?._lpos, { x: 360, y: 640 });
        const camera = binding(scene, canvas, '_cameraComponent', 'cc.Camera', 'Canvas/UI Camera');
        check('Game:orthographicActiveUiCamera', Boolean(camera && scene.active(camera) && camera._projection === 0 && (camera._visibility & (1 << 25)) !== 0 && canvas?._alignCanvasWithScreen === true),
            camera ? { active: scene.active(camera), projection: camera._projection, visibility: camera._visibility, align: canvas?._alignCanvasWithScreen } : null,
            'Active orthographic UI_2D camera with Canvas aligned to screen');
        const manager = requiredComponent(scene, canvasNode, 'LevelManager', 'Game:manager');
        const runController = requiredComponent(scene, canvasNode, 'RunController', 'Game:runController');
        const hostNode = scene.nodeAt('Canvas/PlayArea/StageHost');
        const host = requiredComponent(scene, hostNode, 'StageHost', 'Game:stageHost');
        for (const type of ['LevelManager', 'RunController', 'StageHost']) {
            const matching = scene.components.filter(value => value.type === type);
            check(`Game:oneActive${type}`, matching.length === 1 && matching[0].active, matching, 'Exactly one active component');
        }
        check('Game:runtimeHostMatchesSavedNode', Boolean(hostNode?._id && hostNode._id === runtime?.hostUuid),
            { saved: hostNode?._id, runtime: runtime?.hostUuid }, 'Same StageHost node UUID');
        const hostUI = scene.component(hostNode, 'cc.UITransform');
        check('Game:stageHostBounds', Boolean(hostUI && hostUI._contentSize.width >= 640 && hostUI._contentSize.width <= 720
            && hostUI._contentSize.height >= 650 && hostUI._contentSize.height <= 800), hostUI?._contentSize, '640–720 × 650–800 UI units');
        binding(scene, manager, 'runController', 'RunController', 'Canvas');
        binding(scene, manager, 'stageHost', 'StageHost', 'Canvas/PlayArea/StageHost');
        for (const [property, type, location] of [
            ['chapterLabel', 'cc.Label', 'Canvas/Header/ChapterLabel'], ['levelLabel', 'cc.Label', 'Canvas/Header/LevelLabel'],
            ['levelTitleLabel', 'cc.Label', 'Canvas/Header/LevelTitleLabel'], ['stageLabel', 'cc.Label', 'Canvas/Header/StageLabel'],
            ['statusLabel', 'cc.Label', 'Canvas/Header/StatusLabel'], ['tutorialHint', 'cc.Node', 'Canvas/TutorialHint'],
            ['tutorialLabel', 'cc.Label', 'Canvas/TutorialHint/TutorialLabel'], ['completePanel', 'cc.Node', 'Canvas/CompletePanel'],
            ['completeLabel', 'cc.Label', 'Canvas/CompletePanel/CompleteLabel'], ['completeDetailLabel', 'cc.Label', 'Canvas/CompletePanel/CompleteDetailLabel'],
            ['nextButton', 'cc.Button', 'Canvas/CompletePanel/NextButton'], ['actionButtonLabel', 'cc.Label', 'Canvas/CompletePanel/NextButton/Label'],
        ]) binding(scene, manager, property, type, location);
        binding(scene, runController, 'timeLabel', 'cc.Label', 'Canvas/Header/Stats/TimeLabel');
        binding(scene, runController, 'mistakeLabel', 'cc.Label', 'Canvas/Header/Stats/MistakeLabel');
        for (const [property, name] of [['dragMatchPrefab', 'DragMatchStage'], ['cableConnectPrefab', 'CableConnectStage'], ['cleanSwipePrefab', 'CleanSwipeStage']]) prefabBinding(scene, host, property, name);
        for (const property of ['items', 'targets', 'itemLabels', 'targetLabels']) check(`Game:noFixedManagerArray:${property}`,
            !manager?.[property] || (Array.isArray(manager[property]) && manager[property].length === 0), manager?.[property] || null, 'Absent or empty legacy array');
        check('Game:noFixedGameControllerBinding', manager?.gameController == null, manager?.gameController, null);
        const legacy = scene.nodeAt('Canvas/PlayArea/LegacyDay3');
        check('Game:legacyArchiveInactive', !legacy || !scene.active(legacy), legacy ? { path: scene.nodePath(legacy), active: scene.active(legacy) } : null, 'Absent or inactive archive');
        const legacyElements = scene.nodes.filter(value => /^(Item|Target)[1-3]$/.test(value.name));
        check('Game:legacyElementsDoNotParticipate', legacyElements.every(value => !value.active && value.path.startsWith('Canvas/PlayArea/LegacyDay3/')), legacyElements, 'Every retained fixed item/target is inside inactive LegacyDay3');
        const activeLegacy = scene.components.filter(value => ['DraggableItem', 'GameController', 'Day1Prototype'].includes(value.type) && value.active);
        check('Game:noActiveLegacyGameplayOrBuilder', activeLegacy.length === 0, activeLegacy, []);
        check('Game:noDay1Prototype', !scene.components.some(value => value.type === 'Day1Prototype'), scene.components.filter(value => value.type === 'Day1Prototype'), []);
        const buttons = scene.data.filter(value => value.__type__ === 'cc.Button');
        check('Game:noSerializedButtonHandlers', buttons.every(value => Array.isArray(value.clickEvents) && value.clickEvents.length === 0),
            buttons.map(value => ({ path: scene.nodePath(value), clickEvents: value.clickEvents })), 'All clickEvents empty; listeners owned by code');
        check('Game:completePanelInitiallyHidden', scene.nodeAt('Canvas/CompletePanel')?._active === false, scene.nodeAt('Canvas/CompletePanel')?._active, false);
    }
    const settings = read(path.join(root, 'settings', 'v2', 'packages', 'project.json'));
    const resolution = settings?.general?.designResolution;
    check('projectDesignResolution', resolution?.width === 720 && resolution?.height === 1280 && resolution?.fitWidth === true && resolution?.fitHeight === true,
        resolution, { width: 720, height: 1280, fitWidth: true, fitHeight: true });
    const pkg = read(path.join(root, 'package.json'));
    check('projectVersion', pkg?.version === '0.0.4', pkg?.version, '0.0.4');
    check('creatorVersion', pkg?.creator?.version === '3.8.8', pkg?.creator?.version, '3.8.8');
    const orders = Array.isArray(runtime?.orders) ? runtime.orders : [];
    const stages = orders.flatMap(order => Array.isArray(order.stages) ? order.stages : []);
    check('runtimeCatalogOrderCount', orders.length === 9, orders.length, 9);
    check('runtimeCatalogStageCount', stages.length === 13, stages.length, 13);
    check('runtimeCatalogKinds', new Set(stages.map(stage => stage.kind)).size === 3
        && stages.every(stage => ['drag-match', 'cable-connect', 'clean-swipe'].includes(stage.kind)), [...new Set(stages.map(stage => stage.kind))], ['drag-match', 'cable-connect', 'clean-swipe']);
    check('runtimeCatalogIdentities', new Set(orders.map(order => order.id)).size === orders.length
        && new Set(orders.map(order => order.key)).size === orders.length
        && orders.every(order => Array.isArray(order.stages) && order.stages.length >= 1 && order.stages.length <= 3
            && new Set(order.stages.map(stage => stage.id)).size === order.stages.length), orders, 'Unique orders and per-order stage IDs, 1–3 stages per order');
    const summarizedResources = [...resources.values()].map(asset => ({ name: asset.name, path: asset.path,
        uuid: asset.meta?.uuid, objectCount: asset.data.length, nodeCount: asset.nodes.length,
        componentCount: asset.components.length, internalReferences: asset.internalReferences,
        externalReferences: asset.externalReferences, nodes: asset.nodes, components: asset.components }));
    const sceneFile = files.find(file => file.path === 'assets/scenes/Game.scene');
    return {
        schemaVersion: 1, timestamp: new Date().toISOString(), projectPath: root,
        mode: 'Read-only saved Creator Scene/Prefab/metadata audit plus live Editor inspection',
        ok: errors.length === 0, passed: errors.length === 0, passedChecks: checks.filter(value => value.passed).length,
        totalChecks: checks.length, checks, errors, sceneUuid: scene?.meta?.uuid || null, sceneSha256: sceneFile?.sha256 || null,
        counts: { resources: resources.size, prefabs: [...resources.keys()].filter(name => name !== 'Game').length,
            objects: summarizedResources.reduce((sum, item) => sum + item.objectCount, 0),
            nodes: summarizedResources.reduce((sum, item) => sum + item.nodeCount, 0),
            components: summarizedResources.reduce((sum, item) => sum + item.componentCount, 0),
            scriptMetadata: scriptFiles.size, orders: orders.length, stages: stages.length,
            internalReferences: summarizedResources.reduce((sum, item) => sum + item.internalReferences, 0),
            externalReferences: externalReferences.length },
        files, resources: summarizedResources, scriptMetadata: [...scriptFiles.values()], externalReferences,
        runtime: { sceneUuid: runtime?.sceneUuid, hostUuid: runtime?.hostUuid, classes, orders },
        limitations: ['This audit does not execute gameplay, synthetic touch, Preview, physical touch or a platform build.',
            'Catalog semantic validation occurs when the actual OrderCatalog is imported; this audit additionally checks the runtime catalog identity and shape.',
            'Runtime listener multiplicity is covered by behavior tests and the engine probe; serialized Button events are checked here.'],
    };
};
