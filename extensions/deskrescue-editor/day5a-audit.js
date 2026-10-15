'use strict';

// Read-only audit of files saved/imported by the real Creator. This module never
// creates or repairs Scene, Prefab, metadata, artwork, or validation-report files.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const childProcess = require('child_process');
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const CORE = [
    ['Game', 'assets/scenes/Game.scene'],
    ...['DragMatchStage', 'CableConnectStage', 'CleanSwipeStage'].map(name => [name, `assets/prefabs/stages/${name}.prefab`]),
    ...['DragItem', 'DragTarget', 'Cable', 'Port', 'DirtCell'].map(name => [name, `assets/prefabs/elements/${name}.prefab`]),
];
const CLASSES = ['LevelManager', 'RunController', 'StageHost', 'DragMatchStageController',
    'CableConnectStageController', 'CleanSwipeStageController', 'DraggableItem', 'CableConnector',
    'HomeController', 'AudioFeedback', 'ResultStars', 'VisualAssetRegistry', 'ElementVisual', 'CleanDeviceVisual'];
const DEVICE_KEYS = ['mouse', 'keyboard', 'headset', 'power', 'network', 'usb', 'router', 'controller',
    'speaker', 'battery', 'wheel', 'microphone', 'camera', 'light', 'soundcard', 'fan', 'memory', 'drive', 'gpu'];

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

function walk(directory, includeDirectories = false) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) return [...(includeDirectories ? [full] : []), ...walk(full, includeDirectories)];
        return entry.isFile() ? [full] : [];
    });
}

exports.run = function run(projectRoot, runtimeReport = {}) {
    const root = path.resolve(projectRoot);
    const runtime = runtimeReport || {};
    const phase = runtime.phase === 'slice' ? 'slice' : 'full';
    const checks = [];
    const warnings = [];
    const files = new Map();
    const assets = new Map();
    const projectMetadata = [];
    const scriptIds = new Map();
    const resources = new Map();
    const externalReferences = [];
    const relative = file => path.relative(root, file).replace(/\\/g, '/');
    const check = (name, passed, actual, expected) => checks.push({ name, passed: Boolean(passed), actual: actual === undefined ? null : actual, expected });
    const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
    function fingerprint(file) {
        const key = relative(file);
        if (!files.has(key)) {
            const buffer = fs.readFileSync(file);
            files.set(key, { path: key, bytes: buffer.length, sha256: hash(buffer) });
        }
        return files.get(key);
    }
    function read(file, record = true) {
        try {
            const data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
            if (record) fingerprint(file);
            return data;
        } catch (error) {
            check(`json:${relative(file)}`, false, error.message, 'Readable Creator/source JSON');
            return null;
        }
    }
    function indexMeta(meta, file, source, location = 'root') {
        if (!meta || typeof meta !== 'object') return;
        if (typeof meta.uuid === 'string') {
            const entry = { uuid: meta.uuid, importer: meta.importer, imported: meta.imported === true,
                path: source === 'project' ? relative(file) : `creator-builtin/${path.basename(file)}`,
                subMeta: location, source, assetExists: fs.existsSync(file.slice(0, -5)) };
            const prior = assets.get(meta.uuid);
            if (prior) check(`uniqueUUID:${meta.uuid}`, false, [prior, entry], 'One metadata object per UUID');
            assets.set(meta.uuid, entry);
        }
        for (const [key, child] of Object.entries(meta.subMetas || {})) indexMeta(child, file, source, `${location}/${key}`);
    }
    const projectEntries = walk(path.join(root, 'assets'), true);
    const metaFiles = projectEntries.filter(file => file.endsWith('.meta'));
    const orphanMetas = metaFiles.filter(file => !fs.existsSync(file.slice(0, -5))).map(relative);
    const doubleMetas = metaFiles.filter(file => file.endsWith('.meta.meta')).map(relative);
    const missingMetas = projectEntries.filter(file => !file.endsWith('.meta') && !path.basename(file).startsWith('.')
        && !fs.existsSync(`${file}.meta`)).map(relative);
    check('metadata:noOrphans', orphanMetas.length === 0, orphanMetas, []);
    check('metadata:noMetaMeta', doubleMetas.length === 0, doubleMetas, []);
    check('metadata:allAssetsAndFoldersImported', missingMetas.length === 0, missingMetas, []);
    for (const file of metaFiles) {
        const meta = read(file);
        if (!meta) continue;
        projectMetadata.push({ path: relative(file), uuid: meta.uuid, importer: meta.importer, imported: meta.imported });
        check(`imported:${relative(file)}`, meta.imported === true && typeof meta.uuid === 'string',
            { imported: meta.imported, uuid: meta.uuid }, 'Imported asset with UUID');
        indexMeta(meta, file, 'project');
        if (meta.importer === 'typescript' && typeof meta.uuid === 'string') {
            const script = { name: path.basename(file, '.ts.meta'), path: relative(file.slice(0, -5)), uuid: meta.uuid };
            for (const id of [meta.uuid, compressUuid(meta.uuid), compressUuid(meta.uuid, 2)]) scriptIds.set(id, script);
            if (fs.existsSync(file.slice(0, -5))) fingerprint(file.slice(0, -5));
        }
    }
    try {
        const declaration = fs.readFileSync(path.join(root, 'temp/declarations/cc.d.ts'), 'utf8');
        const match = declaration.match(/reference\s+path=["']([^"']+)["']/);
        const sdkFile = match && path.resolve(root, 'temp/declarations', match[1]);
        const builtinRoot = sdkFile && path.resolve(path.dirname(sdkFile), '../..', 'editor/assets');
        check('creator:builtinMetadataAvailable', Boolean(builtinRoot && fs.existsSync(builtinRoot)), Boolean(builtinRoot && fs.existsSync(builtinRoot)), true);
        if (builtinRoot) for (const file of walk(builtinRoot).filter(file => file.endsWith('.meta'))) {
            indexMeta(JSON.parse(fs.readFileSync(file, 'utf8')), file, 'creator-builtin');
        }
    } catch (error) {
        check('creator:builtinMetadataAvailable', false, error.message, 'Metadata from the locally installed Creator');
    }
    const resolveType = type => scriptIds.get(type)?.name || type;
    check('runtime:actualEditorInspection', runtime.ok === true, runtime.ok, true);
    check('runtime:explicitPhase', ['slice', 'full'].includes(runtime.phase), runtime.phase, 'slice or full');
    for (const name of CLASSES) {
        const id = runtime.classes?.[name];
        check(`runtime:registeredClass:${name}`, scriptIds.get(id)?.name === name, id, `Imported ${name} class ID`);
    }
    const baseline = read(path.join(root, 'docs/validation/day5a/baseline.json'));
    check('baseline:nineCoreAssets', baseline?.coreAssets?.length === 9, baseline?.coreAssets?.length, 9);
    const baselineAssets = new Map((baseline?.coreAssets || []).map(item => [item.path, item]));

    function graph(data) {
        const ref = value => value && Number.isInteger(value.__id__) ? data[value.__id__] || null : null;
        function nodePath(value) {
            let node = ['cc.Node', 'cc.Scene'].includes(value?.__type__) ? value : ref(value?.node);
            const segments = [];
            const seen = new Set();
            while (node && node.__type__ !== 'cc.Scene' && !seen.has(node)) {
                seen.add(node); segments.unshift(node._name); node = ref(node._parent);
            }
            return segments.join('/');
        }
        const nodes = data.filter(value => value?.__type__ === 'cc.Node');
        const component = (node, type) => (node?._components || []).map(ref).find(value => resolveType(value?.__type__) === type) || null;
        const nodeAt = value => nodes.find(node => nodePath(node) === value) || null;
        const all = type => data.filter(value => resolveType(value?.__type__) === type);
        function active(value) {
            let node = value?.__type__ === 'cc.Node' ? value : ref(value?.node);
            if (!node || value?._enabled === false) return false;
            const seen = new Set();
            while (node) {
                if (node._active === false || seen.has(node)) return false;
                seen.add(node); node = ref(node._parent);
            }
            return true;
        }
        return { data, ref, nodePath, nodes, component, nodeAt, all, active };
    }
    for (const [name, file] of CORE) {
        const data = read(path.join(root, file));
        const meta = read(path.join(root, `${file}.meta`));
        if (!Array.isArray(data)) { check(`${name}:serializedArray`, false, typeof data, 'Creator object array'); continue; }
        const resource = { name, path: file, meta, ...graph(data), internalReferences: 0, externalReferences: 0 };
        resources.set(name, resource);
        check(`${name}:identityPreserved`, Boolean(meta?.uuid && meta.uuid === baselineAssets.get(file)?.uuid),
            meta?.uuid, baselineAssets.get(file)?.uuid);
        check(`${name}:assetImporter`, meta?.importer === (name === 'Game' ? 'scene' : 'prefab'), meta?.importer, name === 'Game' ? 'scene' : 'prefab');
        const badInternal = [], badExternal = [], badScript = [];
        function visit(value, location) {
            if (!value || typeof value !== 'object') return;
            if (Object.prototype.hasOwnProperty.call(value, '__id__')) {
                resource.internalReferences++;
                if (!Number.isInteger(value.__id__) || value.__id__ < 0 || value.__id__ >= data.length || !data[value.__id__]) badInternal.push({ location, id: value.__id__ });
            }
            if (Object.prototype.hasOwnProperty.call(value, '__uuid__')) {
                resource.externalReferences++;
                const asset = assets.get(value.__uuid__);
                const entry = { resource: file, location, uuid: value.__uuid__, resolved: asset || null };
                externalReferences.push(entry);
                if (!asset?.imported || !asset.assetExists) badExternal.push(entry);
            }
            if (typeof value.__type__ === 'string' && !value.__type__.startsWith('cc.')
                && !value.__type__.startsWith('cclegacy.') && !scriptIds.has(value.__type__)) badScript.push({ location, type: value.__type__ });
            for (const [key, child] of Object.entries(value)) visit(child, `${location}.${key}`);
        }
        data.forEach((value, index) => visit(value, `[${index}]`));
        check(`${name}:internalReferences`, badInternal.length === 0, badInternal, []);
        check(`${name}:externalReferences`, badExternal.length === 0, badExternal, []);
        check(`${name}:scriptReferences`, badScript.length === 0, badScript, []);
        const hierarchyErrors = [];
        for (const node of data.filter(value => ['cc.Node', 'cc.Scene'].includes(value?.__type__))) {
            const children = (node._children || []).map(resource.ref);
            if (new Set(children).size !== children.length) hierarchyErrors.push({ node: resource.nodePath(node), reason: 'duplicate child reference' });
            if (new Set(children.map(child => child?._name)).size !== children.length) hierarchyErrors.push({ node: resource.nodePath(node), reason: 'duplicate sibling name' });
            for (const child of children) if (!child || resource.ref(child._parent) !== node) hierarchyErrors.push({ node: resource.nodePath(node), reason: 'parent mismatch' });
            for (const component of (node._components || []).map(resource.ref)) {
                if (!component || resource.ref(component.node) !== node) hierarchyErrors.push({ node: resource.nodePath(node), reason: 'component owner mismatch' });
            }
            const types = (node._components || []).map(resource.ref).map(value => resolveType(value?.__type__));
            if (new Set(types).size !== types.length) hierarchyErrors.push({ node: resource.nodePath(node), reason: 'duplicate component type', types });
        }
        check(`${name}:hierarchyOwnershipAndNoDuplicates`, hierarchyErrors.length === 0, hierarchyErrors, []);
        check(`${name}:noAutomaticLayout`, resource.all('cc.Layout').length === 0, resource.all('cc.Layout').length, 0);
        check(`${name}:codeOwnedButtonEvents`, resource.all('cc.Button').every(value => Array.isArray(value.clickEvents) && value.clickEvents.length === 0),
            resource.all('cc.Button').map(value => ({ node: resource.nodePath(value), clickEvents: value.clickEvents })), 'Empty Inspector clickEvents; listeners owned by code');
        check(`${name}:noInputBlockingDecorations`, resource.all('cc.BlockInputEvents').length === 0, resource.all('cc.BlockInputEvents').map(resource.nodePath), []);
    }
    function required(resource, nodePath, type) {
        const value = resource?.component(resource.nodeAt(nodePath), type);
        check(`${resource?.name || 'missing'}:component:${nodePath}:${type}`, Boolean(value && value._enabled !== false),
            value ? { path: resource.nodePath(value), type: resolveType(value.__type__), enabled: value._enabled } : null, `Enabled ${type}`);
        return value;
    }
    function bind(resource, owner, property, type, expectedPath) {
        const value = resource?.ref(owner?.[property]);
        check(`${resource?.name || 'missing'}:binding:${property}`, Boolean(value && resolveType(value.__type__) === type
            && (!expectedPath || resource.nodePath(value) === expectedPath)),
        value ? { type: resolveType(value.__type__), path: resource.nodePath(value) } : null, { type, path: expectedPath || 'Valid saved component/node' });
        return value;
    }
    function assetBinding(resource, owner, property, importer, expectedName) {
        const uuid = owner?.[property]?.__uuid__;
        const asset = assets.get(uuid);
        check(`${resource?.name || 'missing'}:assetBinding:${property}`, Boolean(asset?.imported && asset.assetExists && asset.importer === importer
            && (!expectedName || uuid === resources.get(expectedName)?.meta?.uuid)), asset || uuid, expectedName || importer);
        return asset;
    }
    const scene = resources.get('Game');
    const canvas = scene?.nodeAt('Canvas');
    const manager = required(scene, 'Canvas', 'LevelManager');
    const run = required(scene, 'Canvas', 'RunController');
    const home = required(scene, 'Canvas', 'HomeController');
    const registry = required(scene, 'Canvas', 'VisualAssetRegistry');
    const audio = required(scene, 'Canvas', 'AudioFeedback');
    const host = required(scene, 'Canvas/PlayArea/StageHost', 'StageHost');
    const canvasComponent = required(scene, 'Canvas', 'cc.Canvas');
    const canvasUI = required(scene, 'Canvas', 'cc.UITransform');
    const camera = bind(scene, canvasComponent, '_cameraComponent', 'cc.Camera', 'Canvas/UI Camera');
    check('Game:canvasSize', canvasUI?._contentSize?.width === 720 && canvasUI?._contentSize?.height === 1280, canvasUI?._contentSize, { width: 720, height: 1280 });
    check('Game:camera', Boolean(camera && scene.active(camera) && camera._projection === 0 && canvasComponent?._alignCanvasWithScreen === true),
        camera ? { projection: camera._projection, active: scene.active(camera), align: canvasComponent?._alignCanvasWithScreen } : null, 'Active orthographic UI camera aligned with Canvas');
    check('Game:sceneUUIDMatchesRuntime', scene?.meta?.uuid === runtime.sceneUuid
        && scene?.all('cc.Scene')[0]?._id === scene?.meta?.uuid, { runtime: runtime.sceneUuid, saved: scene?.meta?.uuid }, 'Actual open scene equals saved Game.scene');
    check('Game:hostUUIDMatchesRuntime', Boolean(runtime.hostUuid && scene?.nodeAt('Canvas/PlayArea/StageHost')?._id === runtime.hostUuid),
        { runtime: runtime.hostUuid, saved: scene?.nodeAt('Canvas/PlayArea/StageHost')?._id }, 'Actual open StageHost equals saved node');
    for (const type of ['LevelManager', 'RunController', 'StageHost', 'HomeController', 'AudioFeedback', 'VisualAssetRegistry']) {
        check(`Game:singleton:${type}`, scene?.all(type).length === 1 && scene.active(scene.all(type)[0]), scene?.all(type).map(scene.nodePath), 'One active component');
    }
    bind(scene, manager, 'runController', 'RunController', 'Canvas');
    bind(scene, manager, 'stageHost', 'StageHost', 'Canvas/PlayArea/StageHost');
    bind(scene, manager, 'audioFeedback', 'AudioFeedback', 'Canvas');
    const stars = bind(scene, manager, 'resultStars', 'ResultStars');
    bind(scene, host, 'visualAssets', 'VisualAssetRegistry', 'Canvas');
    check('StageHost:slicePreviewMatchesPhase', host?.slicePreview === (phase === 'slice'), host?.slicePreview, phase === 'slice');
    for (const [property, type, nodePath] of [
        ['chapterLabel', 'cc.Label', 'Canvas/Header/ChapterLabel'], ['levelLabel', 'cc.Label', 'Canvas/Header/LevelLabel'],
        ['levelTitleLabel', 'cc.Label', 'Canvas/Header/LevelTitleLabel'], ['stageLabel', 'cc.Label', 'Canvas/Header/StageLabel'],
        ['statusLabel', 'cc.Label', 'Canvas/Header/StatusLabel'], ['tutorialHint', 'cc.Node', 'Canvas/TutorialHint'],
        ['tutorialLabel', 'cc.Label', 'Canvas/TutorialHint/TutorialLabel'], ['completePanel', 'cc.Node', 'Canvas/CompletePanel'],
        ['completeLabel', 'cc.Label', 'Canvas/CompletePanel/CompleteLabel'], ['completeDetailLabel', 'cc.Label', 'Canvas/CompletePanel/CompleteDetailLabel'],
        ['nextButton', 'cc.Button', 'Canvas/CompletePanel/NextButton'], ['actionButtonLabel', 'cc.Label', 'Canvas/CompletePanel/NextButton/Label'],
    ]) bind(scene, manager, property, type, nodePath);
    bind(scene, run, 'timeLabel', 'cc.Label', 'Canvas/Header/Stats/TimeLabel');
    bind(scene, run, 'mistakeLabel', 'cc.Label', 'Canvas/Header/Stats/MistakeLabel');
    bind(scene, home, 'levelManager', 'LevelManager', 'Canvas');
    const overlay = bind(scene, home, 'overlay', 'cc.Node', 'Canvas/HomeOverlay');
    const startButton = bind(scene, home, 'startButton', 'cc.Button');
    bind(scene, home, 'soundIcon', 'cc.Sprite');
    assetBinding(scene, home, 'soundOnFrame', 'sprite-frame');
    assetBinding(scene, home, 'soundOffFrame', 'sprite-frame');
    check('Home:distinctSoundStates', Boolean(home?.soundOnFrame?.__uuid__ && home?.soundOffFrame?.__uuid__
        && home.soundOnFrame.__uuid__ !== home.soundOffFrame.__uuid__),
    { on: home?.soundOnFrame?.__uuid__, off: home?.soundOffFrame?.__uuid__ }, 'Different original sound-on/off SpriteFrames');
    const soundButton = bind(scene, home, 'soundButton', 'cc.Button');
    bind(scene, home, 'soundStateLabel', 'cc.Label');
    bind(scene, home, 'audioFeedback', 'AudioFeedback', 'Canvas');
    check('Home:initiallyVisibleWithoutAutostart', overlay?._active === true && manager?.autoStartOnSceneLoad === false,
        { overlayActive: overlay?._active, autoStartOnSceneLoad: manager?.autoStartOnSceneLoad }, { overlayActive: true, autoStartOnSceneLoad: false });
    check('Home:startButtonInsideOverlay', Boolean(startButton && scene.nodePath(startButton).startsWith('Canvas/HomeOverlay/')), startButton && scene.nodePath(startButton), 'Child of HomeOverlay');
    check('Home:soundButtonSurvivesDismissal', Boolean(soundButton && !scene.nodePath(soundButton).startsWith('Canvas/HomeOverlay/')), soundButton && scene.nodePath(soundButton), 'Outside HomeOverlay');
    const startUI = scene?.component(scene?.ref(startButton?.node), 'cc.UITransform');
    check('Home:ctaHitbox', startUI?._contentSize?.width >= 280 && startUI?._contentSize?.height >= 84, startUI?._contentSize, 'At least 280 x 84 design units');
    check('Game:completePanelInitiallyHidden', scene?.nodeAt('Canvas/CompletePanel')?._active === false, scene?.nodeAt('Canvas/CompletePanel')?._active, false);
    check('Game:noSerializedStagesAtStart', scene?.ref(host?.node)?._children?.length === 0, scene?.ref(host?.node)?._children?.length, 0);
    check('Game:noActiveLegacyGameplay', Boolean(scene) && scene.all('DraggableItem').concat(scene.all('GameController'), scene.all('Day1Prototype')).every(value => !scene.active(value)),
        scene ? scene.all('DraggableItem').concat(scene.all('GameController'), scene.all('Day1Prototype')).filter(scene.active).map(scene.nodePath) : null, []);
    for (const [property, name] of [['dragMatchPrefab', 'DragMatchStage'], ['cableConnectPrefab', 'CableConnectStage'], ['cleanSwipePrefab', 'CleanSwipeStage']]) assetBinding(scene, host, property, 'prefab', name);
    const source = bind(scene, audio, 'audioSource', 'cc.AudioSource');
    check('Audio:noAutoplay', source?._playOnAwake === false && source?._loop === false, { playOnAwake: source?._playOnAwake, loop: source?._loop }, { playOnAwake: false, loop: false });
    check('Audio:conservativeVolume', Number.isFinite(audio?.volume) && audio.volume > 0 && audio.volume <= 0.5, audio?.volume, '0 < volume <= 0.5');
    for (const property of ['uiClickClip', 'successClip', 'mistakeClip', 'cleanCompleteClip', 'stageCompleteClip', 'orderCompleteClip', 'runCompleteClip']) assetBinding(scene, audio, property, 'audio-clip');
    assetBinding(scene, stars, 'earnedFrame', 'sprite-frame');
    assetBinding(scene, stars, 'emptyFrame', 'sprite-frame');
    check('Results:distinctEarnedAndEmpty', Boolean(stars?.earnedFrame?.__uuid__ && stars?.emptyFrame?.__uuid__
        && stars.earnedFrame.__uuid__ !== stars.emptyFrame.__uuid__),
    { earned: stars?.earnedFrame?.__uuid__, empty: stars?.emptyFrame?.__uuid__ }, 'Different earned and empty star artwork');
    check('Results:threeDistinctStars', stars?.starSprites?.length === 3 && new Set(stars.starSprites.map(value => value?.__id__)).size === 3
        && stars.starSprites.every(value => scene.ref(value)?.__type__ === 'cc.Sprite'), stars?.starSprites, 'Three distinct bound Sprite components');
    for (const [name] of CORE.slice(1)) {
        const resource = resources.get(name);
        if (!resource) continue;
        const rootNode = resource.ref(resource.all('cc.Prefab')[0]?.data);
        check(`${name}:root`, rootNode?._name === name && !rootNode._parent && rootNode._active === true,
            rootNode && { name: rootNode._name, parent: rootNode._parent, active: rootNode._active }, 'Active standalone root');
        required(resource, name, 'cc.UITransform');
        if (name.endsWith('Stage')) {
            const controller = required(resource, name, `${name}Controller`);
            check(`${name}:singleController`, resource.all(`${name}Controller`).length === 1, resource.all(`${name}Controller`).length, 1);
            if (name === 'DragMatchStage') {
                bind(resource, controller, 'gameController', 'GameController', name);
                assetBinding(resource, controller, 'itemPrefab', 'prefab', 'DragItem');
                assetBinding(resource, controller, 'targetPrefab', 'prefab', 'DragTarget');
            } else if (name === 'CableConnectStage') {
                assetBinding(resource, controller, 'cablePrefab', 'prefab', 'Cable');
                assetBinding(resource, controller, 'portPrefab', 'prefab', 'Port');
            } else {
                assetBinding(resource, controller, 'dirtCellPrefab', 'prefab', 'DirtCell');
                bind(resource, controller, 'inputSurface', 'cc.Node', `${name}/InputSurface`);
                const dirt = bind(resource, controller, 'dirtLayer', 'cc.Node', `${name}/InputSurface/DirtLayer`);
                const clean = bind(resource, controller, 'deviceVisual', 'CleanDeviceVisual');
                const device = bind(resource, clean, 'device', 'cc.Sprite');
                const surface = resource.nodeAt(`${name}/InputSurface`);
                const size = resource.component(surface, 'cc.UITransform')?._contentSize;
                check('Clean:inputSurface680x560', size?.width === 680 && size?.height === 560, size, { width: 680, height: 560 });
                const deviceNode = resource.ref(device?.node);
                const children = (surface?._children || []).map(resource.ref);
                check('Clean:deviceBelowDirtLayer', deviceNode && resource.ref(deviceNode._parent) === surface
                    && children.indexOf(deviceNode) >= 0 && children.indexOf(deviceNode) < children.indexOf(dirt),
                children.map(value => value?._name), 'Device Sprite before DirtLayer under InputSurface');
            }
        } else if (name === 'DirtCell') {
            const sprite = required(resource, name, 'cc.Sprite');
            required(resource, name, 'cc.UIOpacity');
            const spriteAsset = assetBinding(resource, sprite, '_spriteFrame', 'sprite-frame');
            check('Dirt:usesDustArtwork', spriteAsset?.path === 'assets/art/dirt/dust.png.meta', spriteAsset?.path, 'assets/art/dirt/dust.png.meta');
        } else {
            const visualPath = name === 'Cable' ? 'Cable/Head' : name;
            const visual = required(resource, visualPath, 'ElementVisual');
            const icon = bind(resource, visual, 'icon', 'cc.Sprite');
            bind(resource, visual, 'caption', 'cc.Label', `${visualPath}/Label`);
            const marker = bind(resource, visual, 'checkMarker', 'cc.Node');
            check(`${name}:visualChildrenDoNotOwnInput`, icon && marker && resource.nodePath(icon).startsWith(`${visualPath}/`)
                && resource.nodePath(marker).startsWith(`${visualPath}/`), icon && { icon: resource.nodePath(icon), marker: resource.nodePath(marker) }, 'Decoration children of unchanged input root');
            check(`${name}:markerInitiallyHidden`, marker?._active === false, marker?._active, false);
            if (name === 'DragItem') required(resource, name, 'DraggableItem');
            if (name === 'Cable') {
                const connector = required(resource, name, 'CableConnector');
                bind(resource, connector, 'head', 'cc.Node', 'Cable/Head');
                bind(resource, connector, 'anchor', 'cc.Node', 'Cable/Anchor');
                bind(resource, connector, 'line', 'cc.Graphics', 'Cable/Line');
            }
        }
    }
    // Asset UUIDs are checked above. Creator's native Prefab serializer can assign
    // new internal fileIds; compare actual input paths/bindings and transforms,
    // and report those IDs separately rather than treating them as asset UUIDs.
    const inputNodeIdentities = [];
    const prefabSerializationDifferences = [];
    const removedFileIds = new Map();
    const originalResources = new Map();
    for (const [name] of CORE) {
        const resource = resources.get(name);
        if (!resource) continue;
        try {
            const originalBytes = childProcess.execFileSync('git', ['show', `${baseline.git.head}:${resource.path}`], { cwd: root, windowsHide: true });
            check(`${name}:baselineBytesVerified`, hash(originalBytes) === baselineAssets.get(resource.path)?.sha256, hash(originalBytes), baselineAssets.get(resource.path)?.sha256);
            const original = graph(JSON.parse(originalBytes.toString('utf8')));
            originalResources.set(name, original);
            const oldIds = new Set(original.data.filter(value => typeof value?.fileId === 'string' && value.fileId).map(value => value.fileId));
            const currentIds = resource.data.filter(value => typeof value?.fileId === 'string' && value.fileId).map(value => value.fileId);
            const currentIdSet = new Set(currentIds);
            check(`${name}:uniqueInternalFileIds`, currentIds.length === currentIdSet.size, { count: currentIds.length, unique: currentIdSet.size }, 'Distinct internal Prefab fileIds');
            const removed = [...oldIds].filter(value => !currentIdSet.has(value));
            for (const id of removed) removedFileIds.set(id, resource.path);
            if (removed.length) prefabSerializationDifferences.push({ resource: resource.path,
                originalFileIdCount: oldIds.size, currentFileIdCount: currentIdSet.size,
                removedOriginalFileIds: removed, newFileIds: [...currentIdSet].filter(value => !oldIds.has(value)),
                explanation: 'Internal Prefab fileIds differ after native Creator serialization; core resource UUID and input structure are checked separately.' });
        } catch (error) { check(`${name}:baselineInputComparison`, false, error.message, 'Original Git asset bytes match captured baseline'); }
    }
    const inputPaths = { DragItem: ['DragItem'], DragTarget: ['DragTarget'], Cable: ['Cable', 'Cable/Head', 'Cable/Anchor', 'Cable/Line'],
        Port: ['Port'], DirtCell: ['DirtCell'], CleanSwipeStage: ['CleanSwipeStage/InputSurface', 'CleanSwipeStage/InputSurface/DirtLayer'] };
    for (const [name, paths] of Object.entries(inputPaths)) {
        const resource = resources.get(name);
        const original = originalResources.get(name);
        if (!resource || !original) continue;
            for (const nodePath of paths) {
                const before = original.nodeAt(nodePath), after = resource.nodeAt(nodePath);
                const beforeUI = original.component(before, 'cc.UITransform'), afterUI = resource.component(after, 'cc.UITransform');
                const beforeId = before?._id || original.ref(before?._prefab)?.fileId;
                const afterId = after?._id || resource.ref(after?._prefab)?.fileId;
                inputNodeIdentities.push({ resource: resource.path, nodePath, beforeId: beforeId || null, afterId: afterId || null,
                    internalIdChanged: beforeId !== afterId });
                const beforeMatches = original.nodes.filter(value => original.nodePath(value) === nodePath);
                const afterMatches = resource.nodes.filter(value => resource.nodePath(value) === nodePath);
                check(`input:${nodePath}:uniquePath`, beforeMatches.length === 1 && afterMatches.length === 1 && Boolean(beforeId && afterId),
                    { baseline: beforeMatches.length, current: afterMatches.length, currentId: afterId }, 'One original and one saved input node at the same path, with valid internal IDs');
                const beforeParent = original.ref(before?._parent), afterParent = resource.ref(after?._parent);
                const beforeParentPath = beforeParent ? original.nodePath(beforeParent) : null;
                const afterParentPath = afterParent ? resource.nodePath(afterParent) : null;
                check(`input:${nodePath}:parent`, Boolean(before && after) && beforeParentPath === afterParentPath,
                    afterParentPath, beforeParentPath);
                for (const property of ['_lpos', '_lscale', '_lrot']) check(`input:${nodePath}:${property}`,
                    Boolean(before && after) && JSON.stringify(before[property]) === JSON.stringify(after[property]), after?.[property], before?.[property]);
                check(`input:${nodePath}:hitbox`, Boolean(beforeUI && afterUI) && JSON.stringify(beforeUI._contentSize) === JSON.stringify(afterUI._contentSize), afterUI?._contentSize, beforeUI?._contentSize);
                check(`input:${nodePath}:anchorPoint`, Boolean(beforeUI && afterUI) && JSON.stringify(beforeUI._anchorPoint) === JSON.stringify(afterUI._anchorPoint), afterUI?._anchorPoint, beforeUI?._anchorPoint);
                check(`input:${nodePath}:layer`, Boolean(before && after) && before._layer === after._layer, after?._layer, before?._layer);
            }
    }
    const staleTargetOverrides = [];
    let targetOverrideRoots = 0;
    for (const resource of resources.values()) {
        function scanOverride(value, location, seen = new Set()) {
            if (typeof value === 'string') {
                if (removedFileIds.has(value)) staleTargetOverrides.push({ resource: resource.path, location,
                    fileId: value, originalResource: removedFileIds.get(value) });
                return;
            }
            if (!value || typeof value !== 'object' || seen.has(value)) return;
            seen.add(value);
            if (Number.isInteger(value.__id__)) scanOverride(resource.ref(value), `${location}->__id__:${value.__id__}`, seen);
            for (const [key, child] of Object.entries(value)) scanOverride(child, `${location}.${key}`, seen);
        }
        function findOverrides(value, location) {
            if (!value || typeof value !== 'object') return;
            for (const [key, child] of Object.entries(value)) {
                if (key === 'targetOverrides' && child !== null) { targetOverrideRoots++; scanOverride(child, `${location}.${key}`); }
                else findOverrides(child, `${location}.${key}`);
            }
        }
        resource.data.forEach((value, index) => findOverrides(value, `[${index}]`));
    }
    check('Prefab:targetOverridesDoNotReferenceRemovedFileIds', staleTargetOverrides.length === 0,
        { scannedResources: resources.size, targetOverrideRoots, staleReferences: staleTargetOverrides }, 'No overrides referring to removed baseline internal fileIds');
    const imageAssets = [];
    for (const file of projectEntries.filter(file => /\.(png|wav|mp3|ogg)$/i.test(file))) {
        const meta = read(`${file}.meta`);
        fingerprint(file);
        const isImage = /\.png$/i.test(file);
        const subassets = [];
        function collect(value) { if (value?.uuid) subassets.push(value); Object.values(value?.subMetas || {}).forEach(collect); }
        collect(meta);
        if (isImage) {
            const frames = subassets.filter(value => value.importer === 'sprite-frame');
            check(`image:spriteFrame:${relative(file)}`, meta?.importer === 'image' && frames.length === 1 && frames[0].imported === true,
                frames.map(value => ({ uuid: value.uuid, imported: value.imported })), 'Exactly one imported SpriteFrame subasset');
            if (['assets/art/ui/card.png', 'assets/art/ui/button.png'].includes(relative(file))) {
                const data = frames[0]?.userData;
                const borders = { left: data?.borderLeft, right: data?.borderRight,
                    top: data?.borderTop, bottom: data?.borderBottom };
                check(`RoundedUI:nineSliceMetadata:${relative(file)}`, frames.length === 1
                    && data?.trimType === 'none' && data?.width === 192 && data?.height === 128
                    && data?.borderLeft === 32 && data?.borderRight === 32
                    && data?.borderTop === 38 && data?.borderBottom === 38,
                { trimType: data?.trimType, width: data?.width, height: data?.height, borders },
                { trimType: 'none', width: 192, height: 128, borders: { left: 32, right: 32, top: 38, bottom: 38 } });
            }
            imageAssets.push({ path: relative(file), uuid: meta?.uuid, spriteFrames: frames.map(value => value.uuid) });
        } else check(`audio:importedClip:${relative(file)}`, meta?.importer === 'audio-clip' && meta?.imported === true, meta?.importer, 'audio-clip');
    }
    const keys = registry?.keys || [];
    const frames = registry?.frames || [];
    check('Registry:alignedUniqueKeys', Array.isArray(keys) && keys.length > 0 && keys.length === frames.length && new Set(keys).size === keys.length,
        { keys: keys.length, frames: frames.length, uniqueKeys: new Set(keys).size }, 'Nonempty aligned unique arrays');
    const keyFrames = new Map();
    keys.forEach((key, index) => {
        const uuid = frames[index]?.__uuid__;
        const frame = assets.get(uuid);
        keyFrames.set(key, frame);
        check(`Registry:${key}`, Boolean(frame?.imported && frame.assetExists && frame.importer === 'sprite-frame'
            && frame.path === `assets/art/${key}.png.meta`), frame || uuid, `SpriteFrame from assets/art/${key}.png.meta`);
    });
    if (Array.isArray(runtime.registryKeys)) check('Registry:matchesRuntime', JSON.stringify([...keys].sort()) === JSON.stringify([...runtime.registryKeys].sort()), runtime.registryKeys, keys);
    const roundedUiBindings = [];
    for (const [nodePath, key] of [
        ['Canvas/Header/HudCard', 'ui/card'], ['Canvas/Header/HudShadow', 'ui/card'],
        ['Canvas/TutorialHint', 'ui/card'], ['Canvas/CompletePanel', 'ui/card'],
        ['Canvas/CompletePanel/CardFace', 'ui/card'], ['Canvas/CompletePanel/CardShadow', 'ui/card'],
        ['Canvas/HomeOverlay', 'ui/card'], ['Canvas/HomeOverlay/HeroDesk', 'ui/card'],
        ['Canvas/HomeOverlay/StartButton', 'ui/button'], ['Canvas/CompletePanel/NextButton', 'ui/button'],
        ['Canvas/SoundButton', 'ui/card'],
    ]) {
        const sprite = required(scene, nodePath, 'cc.Sprite');
        const frame = assets.get(sprite?._spriteFrame?.__uuid__);
        const expectedFrame = keyFrames.get(key);
        const binding = { nodePath, visualKey: key, spriteType: sprite?._type,
            spriteFrame: sprite?._spriteFrame?.__uuid__, importedPath: frame?.path };
        roundedUiBindings.push(binding);
        check(`RoundedUI:savedSprite:${nodePath}`, sprite?._type === 1
            && Boolean(frame?.imported && frame.assetExists && frame.importer === 'sprite-frame')
            && frame.path === `assets/art/${key}.png.meta` && frame.uuid === expectedFrame?.uuid,
        binding, { spriteType: 'Sprite.Type.SLICED (1)', spriteFrame: expectedFrame?.uuid,
            importedPath: `assets/art/${key}.png.meta` });
    }
    const mappingCoverage = [];
    try {
        const tsPath = baseline?.environment?.typescript?.compilerPath;
        const ts = require(tsPath);
        const modules = new Map();
        function loadPure(relativeFile) {
            const file = path.resolve(root, relativeFile);
            if (modules.has(file)) return modules.get(file);
            if (!['LevelCatalog.ts', 'OrderCatalog.ts', 'VisualCatalog.ts'].includes(path.basename(file))) throw new Error(`Unexpected catalog dependency: ${relativeFile}`);
            const sourceText = fs.readFileSync(file, 'utf8');
            fingerprint(file);
            const output = ts.transpileModule(sourceText, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
            const exports = {};
            modules.set(file, exports);
            const module = { exports };
            const context = { exports, module, require: specifier => {
                if (!specifier.startsWith('.')) throw new Error(`Unexpected nonlocal catalog dependency: ${specifier}`);
                return loadPure(relative(path.resolve(path.dirname(file), `${specifier}.ts`)));
            } };
            vm.runInNewContext(output, context, { filename: relativeFile, timeout: 1000 });
            modules.set(file, module.exports);
            return module.exports;
        }
        const catalog = loadPure('assets/scripts/data/OrderCatalog.ts').ORDER_CATALOG;
        const visuals = loadPure('assets/scripts/visuals/VisualCatalog.ts');
        const stages = catalog.flatMap(order => order.stages);
        check('Catalog:nineOrdersThirteenSteps', catalog.length === 9 && stages.length === 13, { orders: catalog.length, steps: stages.length }, { orders: 9, steps: 13 });
        check('Catalog:threeKinds', new Set(stages.map(stage => stage.kind)).size === 3, [...new Set(stages.map(stage => stage.kind))], ['drag-match', 'cable-connect', 'clean-swipe']);
        check('Catalog:nineteenDeviceKeys', JSON.stringify([...visuals.DEVICE_KEYS].sort()) === JSON.stringify([...DEVICE_KEYS].sort()), visuals.DEVICE_KEYS, DEVICE_KEYS);
        for (const file of ['assets/scripts/data/OrderCatalog.ts', 'assets/scripts/data/LevelCatalog.ts', 'assets/scripts/data/StageDefinition.ts', 'assets/scripts/data/LevelDefinition.ts', 'assets/scripts/data/OrderDefinition.ts']) {
            const expected = baseline?.trackedFiles?.find(value => value.path === file)?.sha256;
            const current = fingerprint(path.join(root, file)).sha256;
            check(`Catalog:baselineUnchanged:${file}`, Boolean(expected && expected === current), current, expected);
        }
        for (const stage of stages) {
            if (phase === 'slice' && !['drag-1', 'computer-cables', 'keyboard-clean'].includes(stage.id)) continue;
            const mapped = stage.kind === 'drag-match' ? stage.pairs.map(pair => ({ id: pair.id, key: visuals.dragVisualKey(stage.id, pair.id) }))
                : stage.kind === 'cable-connect' ? stage.cables.flatMap(cable => ['head', 'port'].map(role => ({ id: cable.id, role, key: visuals.cableVisualKey(stage.id, cable.id, role) })))
                    : stage.areas.map(area => ({ id: area.id, key: visuals.cleanVisualKey(stage.id, area.id) }));
            for (const item of mapped) {
                const frame = keyFrames.get(item.key);
                mappingCoverage.push({ stageId: stage.id, kind: stage.kind, ...item, spriteFrame: frame?.uuid || null });
                check(`Mapping:${stage.id}:${item.id}:${item.role || 'device'}`, Boolean(frame?.imported && frame.importer === 'sprite-frame'), frame?.uuid, `Bound ${item.key} SpriteFrame`);
            }
        }
        const deviceCoverage = [...new Set(mappingCoverage.filter(value => value.kind === 'drag-match').map(value => value.key))];
        const cleanCoverage = [...new Set(mappingCoverage.filter(value => value.kind === 'clean-swipe').map(value => value.key))];
        check(`Mapping:${phase}:deviceCount`, deviceCoverage.length === (phase === 'slice' ? 3 : 19), deviceCoverage.length, phase === 'slice' ? 3 : 19);
        check(`Mapping:${phase}:cleanCount`, cleanCoverage.length === (phase === 'slice' ? 1 : 3), cleanCoverage.length, phase === 'slice' ? 1 : 3);
    } catch (error) { check('Catalog:executeActualPureMappings', false, error.message, 'Actual pure TypeScript catalog and visual mapping execution'); }
    const settings = read(path.join(root, 'settings/v2/packages/project.json'));
    const resolution = settings?.general?.designResolution;
    check('Project:designResolution', resolution?.width === 720 && resolution?.height === 1280 && resolution?.fitWidth === true && resolution?.fitHeight === true,
        resolution, { width: 720, height: 1280, fitWidth: true, fitHeight: true });
    const pkg = read(path.join(root, 'package.json'));
    check('Project:creatorVersion', pkg?.creator?.version === '3.8.8', pkg?.creator?.version, '3.8.8');
    if (phase === 'full') check('Project:previewVersion', pkg?.version === '0.0.5-alpha.1', pkg?.version, '0.0.5-alpha.1');
    if (runtime.repeatPass) {
        const additions = runtime.repeatPass.addedNodesByResource || {};
        check('Assembly:repeatAddsNoNodes', runtime.repeatPass.ok === true && Object.keys(additions).length >= 9
            && Object.values(additions).every(value => value === 0), runtime.repeatPass, 'Repeat pass succeeded and adds zero nodes in all nine core assets');
    } else warnings.push('No repeat-pass evidence supplied: this audit alone does not establish assembly idempotence.');
    if (runtime.cacheInspection) {
        const cache = runtime.cacheInspection;
        check('Runtime:stageCache', cache.activeStageCount <= 1 && Object.values(cache.countByKind || {}).every(value => value <= 1)
            && Object.keys(cache.countByKind || {}).length === 3, cache, 'At most one cached instance per kind and one active Stage');
    } else warnings.push('Stage cache behavior is not exercised by this saved-file audit; use real runtime probe and behavior tests.');
    const summarizedResources = [...resources.values()].map(value => ({ name: value.name, path: value.path, uuid: value.meta?.uuid,
        objects: value.data.length, nodes: value.nodes.length, components: value.data.filter(item => item?.node && value.ref(item.node)?.__type__ === 'cc.Node').length,
        internalReferences: value.internalReferences, externalReferences: value.externalReferences,
        nodePaths: value.nodes.map(value.nodePath) }));
    const errors = checks.filter(value => !value.passed).map(value => value.name);
    const passed = checks.length - errors.length;
    return {
        schemaVersion: 1, timestamp: new Date().toISOString(), projectPath: root.replace(/\\/g, '/'), phase,
        mode: 'Read-only audit of actual saved Creator resources and imported metadata',
        coverageClaim: phase === 'slice' ? 'Three representative stages only; not full Day 5A coverage' : 'All nine orders / thirteen steps asset-binding coverage; gameplay and visual QA require separate Preview evidence',
        ok: errors.length === 0, passed, total: checks.length, passedChecks: passed, totalChecks: checks.length,
        checks, errors, warnings, counts: { coreAssets: resources.size, prefabs: resources.size - (scene ? 1 : 0),
            metadata: projectMetadata.length, uniqueProjectAssetUuids: [...assets.values()].filter(value => value.source === 'project').length,
            png: imageAssets.length, audio: projectMetadata.filter(value => value.importer === 'audio-clip').length,
            registryKeys: keys.length, stableMappings: mappingCoverage.length,
            nodes: summarizedResources.reduce((sum, value) => sum + value.nodes, 0) },
        sceneUuid: scene?.meta?.uuid || null, sceneSha256: files.get('assets/scenes/Game.scene')?.sha256 || null,
        baselineCommit: baseline?.git?.head || null, coreAssetIdentities: CORE.map(([name, file]) => ({ name, path: file,
            baselineUuid: baselineAssets.get(file)?.uuid, currentUuid: resources.get(name)?.meta?.uuid })),
        resources: summarizedResources, files: [...files.values()], imageAssets, mappingCoverage, externalReferences, roundedUiBindings,
        inputNodeIdentities, prefabSerializationDifferences,
        targetOverrideInspection: { scannedResources: resources.size, targetOverrideRoots, staleReferences: staleTargetOverrides },
        runtime: { phase: runtime.phase, sceneUuid: runtime.sceneUuid, hostUuid: runtime.hostUuid, classes: runtime.classes,
            registryKeys: runtime.registryKeys, nodeCountsBefore: runtime.nodeCountsBefore, nodeCountsAfter: runtime.nodeCountsAfter,
            addedNodesByResource: runtime.addedNodesByResource, repeatPass: runtime.repeatPass, cacheInspection: runtime.cacheInspection },
        limitations: ['This audit does not play the game, hear audio, inspect rendered pixels, simulate touch, or validate native/platform input.',
            'A valid SpriteFrame binding proves imported resource availability, not recognizability, contrast, layout quality, or absence of runtime input occlusion.',
            'Serialized Button clickEvents are checked; listener multiplicity and audio deduplication require component tests and actual Preview evidence.',
            'Only explicitly supplied real Editor repeat/cache observations are evaluated; missing observations are reported and never synthesized.'],
    };
};
