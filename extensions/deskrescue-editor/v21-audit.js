'use strict';

// Independent V2.1 copy of the complete V2 saved-file audit, using the new pre-edit ZIP.
// No Scene/Prefab/meta/report writes occur here.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const zlib = require('node:zlib');
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const CORE = [['Game', 'assets/scenes/Game.scene'],
    ...['DragMatchStage', 'CableConnectStage', 'CleanSwipeStage'].map(name => [name, `assets/prefabs/stages/${name}.prefab`]),
    ...['DragItem', 'DragTarget', 'Cable', 'Port', 'DirtCell'].map(name => [name, `assets/prefabs/elements/${name}.prefab`])];
const INPUT_PATHS = {
    Game: ['Canvas/PlayArea', 'Canvas/PlayArea/StageHost'],
    DragMatchStage: ['DragMatchStage'], CableConnectStage: ['CableConnectStage'],
    CleanSwipeStage: ['CleanSwipeStage', 'CleanSwipeStage/InputSurface', 'CleanSwipeStage/InputSurface/DirtLayer'],
    DragItem: ['DragItem'], DragTarget: ['DragTarget'], Port: ['Port'], DirtCell: ['DirtCell'],
    Cable: ['Cable', 'Cable/Head', 'Cable/Anchor', 'Cable/Line'],
};

function walk(directory, includeDirectories = false) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? [...(includeDirectories ? [file] : []), ...walk(file, includeDirectories)] : entry.isFile() ? [file] : [];
    });
}
function compressUuid(uuid, headLength = 5) {
    const hex = uuid.replace(/-/g, ''); if (!/^[a-f\d]{32}$/i.test(hex)) return uuid;
    let result = hex.slice(0, headLength);
    for (let i = headLength; i < hex.length; i += 3) { const value = parseInt(hex.slice(i, i + 3), 16); result += BASE64[value >> 6] + BASE64[value & 63]; }
    return result;
}
/** Read the captured small ZIP directly, without extracting or invoking another runtime. */
function zipEntries(bytes) {
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
        if (bytes.readUInt32LE(i) === 0x06054b50 && i + 22 + bytes.readUInt16LE(i + 20) === bytes.length) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Captured baseline ZIP has no valid central directory');
    if (bytes.readUInt16LE(eocd + 4) || bytes.readUInt16LE(eocd + 6)) throw new Error('Multi-disk ZIP is unsupported');
    const count = bytes.readUInt16LE(eocd + 10), entries = new Map(); let offset = bytes.readUInt32LE(eocd + 16);
    for (let i = 0; i < count; i++) {
        if (bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid baseline ZIP directory entry');
        const flags = bytes.readUInt16LE(offset + 8), method = bytes.readUInt16LE(offset + 10);
        const compressed = bytes.readUInt32LE(offset + 20), size = bytes.readUInt32LE(offset + 24);
        const nameLength = bytes.readUInt16LE(offset + 28), extraLength = bytes.readUInt16LE(offset + 30), commentLength = bytes.readUInt16LE(offset + 32);
        const local = bytes.readUInt32LE(offset + 42), name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString('utf8').replace(/\\/g, '/');
        if ((flags & 1) || ![0, 8].includes(method)) throw new Error(`Unsupported captured ZIP encoding for ${name}`);
        if (entries.has(name)) throw new Error(`Duplicate captured ZIP path ${name}`);
        entries.set(name, () => {
            if (bytes.readUInt32LE(local) !== 0x04034b50) throw new Error(`Invalid local ZIP record ${name}`);
            const begin = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
            const packed = bytes.subarray(begin, begin + compressed), output = method === 8 ? zlib.inflateRawSync(packed) : packed;
            if (output.length !== size) throw new Error(`Captured ZIP size mismatch ${name}`);
            return output;
        });
        offset += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
}

exports.run = function run(projectRoot, runtimeReport = {}) {
    const root = path.resolve(projectRoot), runtime = runtimeReport || {}, checks = [], files = new Map(), warnings = [];
    const assets = new Map(), scriptIds = new Map(), resources = new Map(), baselineResources = new Map(), externalReferences = [];
    const inputNodeIdentities = [], serializationDifferences = [], metadata = [], mappingCoverage = [];
    const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
    const relative = file => path.relative(root, file).replace(/\\/g, '/');
    const check = (name, passed, actual, expected) => checks.push({ name, passed: Boolean(passed), actual: actual === undefined ? null : actual, expected: expected === undefined ? null : expected });
    function fingerprint(file) {
        const p = path.isAbsolute(file) ? file : path.join(root, file), key = relative(p);
        if (!files.has(key)) { const bytes = fs.readFileSync(p); files.set(key, { path: key, bytes: bytes.length, sha256: hash(bytes) }); }
        return files.get(key);
    }
    function read(file, record = true) {
        const p = path.isAbsolute(file) ? file : path.join(root, file);
        try { const data = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')); if (record) fingerprint(p); return data; }
        catch (error) { check(`JSON:${relative(p)}`, false, error.message, 'Readable actual project JSON'); return null; }
    }
    function indexMeta(value, file, source, location = 'root') {
        if (!value || typeof value !== 'object') return;
        if (typeof value.uuid === 'string') {
            const entry = { uuid: value.uuid, importer: value.importer, imported: value.imported === true, source,
                path: source === 'project' ? relative(file) : `creator-builtin/${path.basename(file)}`, subMeta: location,
                assetExists: fs.existsSync(file.slice(0, -5)) };
            if (assets.has(value.uuid)) check(`metadata:uniqueUUID:${value.uuid}`, false, [assets.get(value.uuid), entry], 'One metadata object per UUID');
            assets.set(value.uuid, entry);
        }
        for (const [key, child] of Object.entries(value.subMetas || {})) indexMeta(child, file, source, `${location}/${key}`);
    }
    const entries = walk(path.join(root, 'assets'), true), metaFiles = entries.filter(file => file.endsWith('.meta'));
    check('metadata:noOrphans', !metaFiles.some(file => !fs.existsSync(file.slice(0, -5))), metaFiles.filter(file => !fs.existsSync(file.slice(0, -5))).map(relative), []);
    check('metadata:noMetaMeta', !metaFiles.some(file => file.endsWith('.meta.meta')), metaFiles.filter(file => file.endsWith('.meta.meta')).map(relative), []);
    const missingMeta = entries.filter(file => !file.endsWith('.meta') && !path.basename(file).startsWith('.') && !fs.existsSync(`${file}.meta`));
    check('metadata:allAssetsAndFoldersImported', missingMeta.length === 0, missingMeta.map(relative), []);
    for (const file of metaFiles) {
        const meta = read(file); if (!meta) continue; metadata.push({ path: relative(file), uuid: meta.uuid, importer: meta.importer });
        check(`metadata:imported:${relative(file)}`, meta.imported === true && typeof meta.uuid === 'string', { imported: meta.imported, uuid: meta.uuid }, 'Imported asset with UUID');
        indexMeta(meta, file, 'project');
        if (meta.importer === 'typescript' && typeof meta.uuid === 'string') {
            const script = { name: path.basename(file, '.ts.meta'), path: relative(file.slice(0, -5)), uuid: meta.uuid };
            for (const id of [meta.uuid, compressUuid(meta.uuid), compressUuid(meta.uuid, 2)]) scriptIds.set(id, script);
            if (fs.existsSync(file.slice(0, -5))) fingerprint(file.slice(0, -5));
        }
    }
    try {
        const generated = fs.readFileSync(path.join(root, 'temp/declarations/cc.d.ts'), 'utf8');
        const match = generated.match(/reference\s+path=["']([^"']+)["']/), sdk = match && path.resolve(root, 'temp/declarations', match[1]);
        const builtins = sdk && path.resolve(path.dirname(sdk), '../..', 'editor/assets');
        check('Creator:actualBuiltinMetadataAvailable', builtins && fs.existsSync(builtins), Boolean(builtins && fs.existsSync(builtins)), true);
        if (builtins) walk(builtins).filter(file => file.endsWith('.meta')).forEach(file => indexMeta(JSON.parse(fs.readFileSync(file)), file, 'creator-builtin'));
    } catch (error) { check('Creator:actualBuiltinMetadataAvailable', false, error.message, 'Installed Creator builtin metadata'); }
    const resolveType = type => scriptIds.get(type)?.name || type;
    function graph(data) {
        const ref = value => value && Number.isInteger(value.__id__) ? data[value.__id__] || null : null;
        function nodePath(value) {
            let node = ['cc.Node', 'cc.Scene'].includes(value?.__type__) ? value : ref(value?.node); const names = [], seen = new Set();
            while (node && node.__type__ !== 'cc.Scene' && !seen.has(node)) { seen.add(node); names.unshift(node._name); node = ref(node._parent); }
            return names.join('/');
        }
        const nodes = data.filter(value => value?.__type__ === 'cc.Node');
        const component = (node, type) => (node?._components || []).map(ref).find(value => resolveType(value?.__type__) === type) || null;
        const all = type => data.filter(value => resolveType(value?.__type__) === type);
        const nodeAt = p => nodes.find(node => nodePath(node) === p) || null;
        function active(value) {
            let node = value?.__type__ === 'cc.Node' ? value : ref(value?.node); const seen = new Set();
            if (!node || value?._enabled === false) return false;
            while (node) { if (node._active === false || seen.has(node)) return false; seen.add(node); node = ref(node._parent); }
            return true;
        }
        return { data, ref, nodes, nodePath, component, all, nodeAt, active };
    }
    const baseline = read('docs/validation/day5a-plus/v21/baseline.json'), baselineFiles = new Map((baseline?.files || []).map(entry => [entry.path, entry]));
    let archive = null;
    try {
        const bytes = fs.readFileSync(baseline.backup.path);
        check('baseline:externalZipSha256', hash(bytes) === baseline.backup.sha256 && bytes.length === baseline.backup.bytes,
            { bytes: bytes.length, sha256: hash(bytes) }, { bytes: baseline.backup.bytes, sha256: baseline.backup.sha256 });
        archive = zipEntries(bytes);
        check('baseline:allCapturedFilesInZip', baselineFiles.size > 0 && [...baselineFiles.keys()].every(p => archive.has(p)),
            { captured: baselineFiles.size, archiveEntries: archive.size }, 'Every captured project path present in external ZIP');
    } catch (error) { check('baseline:externalZipAvailable', false, error.message, 'Actual captured pre-V2 ZIP'); }
    function baselineBytes(file) {
        if (!archive?.has(file)) throw new Error(`Missing captured baseline file ${file}`);
        const bytes = archive.get(file)(), expected = baselineFiles.get(file);
        if (!expected || hash(bytes) !== expected.sha256 || bytes.length !== expected.bytes) throw new Error(`Captured baseline SHA/bytes mismatch ${file}`);
        return bytes;
    }
    for (const [name, file] of CORE) {
        const data = read(file), meta = read(`${file}.meta`);
        if (!Array.isArray(data)) { check(`${name}:serializedArray`, false, typeof data, 'Creator native serialized array'); continue; }
        const resource = { name, path: file, meta, ...graph(data) }; resources.set(name, resource);
        try {
            const old = graph(JSON.parse(baselineBytes(file))), oldMeta = JSON.parse(baselineBytes(`${file}.meta`));
            baselineResources.set(name, { ...old, meta: oldMeta });
            check(`${name}:coreAssetUuidUnchanged`, meta?.uuid === oldMeta.uuid, meta?.uuid, oldMeta.uuid);
            check(`${name}:coreMetaBytesUnchanged`, fingerprint(`${file}.meta`).sha256 === baselineFiles.get(`${file}.meta`)?.sha256,
                fingerprint(`${file}.meta`).sha256, baselineFiles.get(`${file}.meta`)?.sha256);
            const beforeIds = new Set(old.data.filter(value => typeof value?.fileId === 'string' && value.fileId).map(value => value.fileId));
            const afterIds = data.filter(value => typeof value?.fileId === 'string' && value.fileId).map(value => value.fileId);
            check(`${name}:uniqueInternalFileIds`, new Set(afterIds).size === afterIds.length, { count: afterIds.length, unique: new Set(afterIds).size }, 'No duplicate serialized fileIds');
            serializationDifferences.push({ resource: file, removedInternalFileIds: [...beforeIds].filter(id => !afterIds.includes(id)),
                addedInternalFileIds: afterIds.filter(id => !beforeIds.has(id)), explanation: 'Native serialization fileIds are internal identities, distinct from protected asset UUIDs.' });
        } catch (error) { check(`${name}:verifiedBaselineInputBytes`, false, error.message, 'Pre-V2 bytes from captured external ZIP'); }
        const internalErrors = [], externalErrors = [], scriptErrors = [];
        function visit(value, location) {
            if (!value || typeof value !== 'object') return;
            if ('__id__' in value && (!Number.isInteger(value.__id__) || value.__id__ < 0 || !data[value.__id__])) internalErrors.push({ location, id: value.__id__ });
            if ('__uuid__' in value) {
                const asset = assets.get(value.__uuid__), entry = { resource: file, location, uuid: value.__uuid__, resolved: asset || null };
                externalReferences.push(entry); if (!asset?.imported || !asset.assetExists) externalErrors.push(entry);
            }
            if (typeof value.__type__ === 'string' && !value.__type__.startsWith('cc.') && !value.__type__.startsWith('cclegacy.') && !scriptIds.has(value.__type__)) scriptErrors.push({ location, type: value.__type__ });
            Object.entries(value).forEach(([key, child]) => visit(child, `${location}.${key}`));
        }
        data.forEach((value, i) => visit(value, `[${i}]`));
        check(`${name}:internalReferences`, !internalErrors.length, internalErrors, []);
        check(`${name}:externalReferences`, !externalErrors.length, externalErrors, []);
        check(`${name}:scriptReferences`, !scriptErrors.length, scriptErrors, []);
        const hierarchyErrors = [];
        for (const node of data.filter(value => ['cc.Node', 'cc.Scene'].includes(value?.__type__))) {
            const children = (node._children || []).map(resource.ref);
            if (new Set(children).size !== children.length || new Set(children.map(child => child?._name)).size !== children.length) hierarchyErrors.push({ node: resource.nodePath(node), issue: 'duplicate child or sibling name' });
            if (children.some(child => !child || resource.ref(child._parent) !== node)) hierarchyErrors.push({ node: resource.nodePath(node), issue: 'parent mismatch' });
            const components = (node._components || []).map(resource.ref), types = components.map(c => resolveType(c?.__type__));
            if (components.some(c => !c || resource.ref(c.node) !== node) || new Set(types).size !== types.length) hierarchyErrors.push({ node: resource.nodePath(node), issue: 'component owner or duplicate type' });
        }
        check(`${name}:hierarchyOwnership`, !hierarchyErrors.length, hierarchyErrors, []);
        check(`${name}:noAutomaticLayout`, resource.all('cc.Layout').length === 0, resource.all('cc.Layout').length, 0);
        check(`${name}:codeOwnedClickEvents`, resource.all('cc.Button').every(button => Array.isArray(button.clickEvents) && button.clickEvents.length === 0), resource.all('cc.Button').map(button => ({ node: resource.nodePath(button), events: button.clickEvents })), 'No Inspector events duplicating code-owned listeners');
    }
    function bind(resource, owner, field, type, expectedPath) {
        const target = resource?.ref(owner?.[field]);
        check(`${resource?.name || 'Missing'}:binding:${resolveType(owner?.__type__)}.${field}`, target && resolveType(target.__type__) === type && (!expectedPath || resource.nodePath(target) === expectedPath),
            target && { type: resolveType(target.__type__), path: resource.nodePath(target) }, { type, path: expectedPath || 'Valid bound object' });
        return target;
    }
    function assetBinding(resource, owner, field, importer, expectedFile) {
        const value = assets.get(owner?.[field]?.__uuid__);
        check(`${resource?.name || 'Missing'}:assetBinding:${resolveType(owner?.__type__)}.${field}`, value?.imported && value.assetExists && value.importer === importer && (!expectedFile || value.path === `${expectedFile}.meta`), value || owner?.[field], { importer, path: expectedFile || 'Imported asset' });
        return value;
    }
    function singleton(resource, type) {
        const all = resource?.all(type) || []; check(`${resource?.name || 'Missing'}:singleton:${type}`, all.length === 1 && all[0]._enabled !== false, all.map(resource.nodePath), 'One enabled component'); return all[0];
    }
    function protectedNode(resource, original, nodePath, relation = 'input') {
        const before = original.nodeAt(nodePath), after = resource.nodeAt(nodePath), beforeUI = original.component(before, 'cc.UITransform'), afterUI = resource.component(after, 'cc.UITransform');
        const matching = resource.nodes.filter(node => resource.nodePath(node) === nodePath);
        check(`${relation}:${resource.name}:${nodePath}:uniquePath`, before && after && matching.length === 1, matching.length, 1);
        const beforeId = before?._id || original.ref(before?._prefab)?.fileId, afterId = after?._id || resource.ref(after?._prefab)?.fileId;
        check(`${relation}:${resource.name}:${nodePath}:validInternalIdentity`, Boolean(beforeId && afterId), { before: beforeId || null, after: afterId || null }, 'Valid native node/file identities; native serializer may change the internal values');
        check(`${relation}:${resource.name}:${nodePath}:parent`, before && after && original.nodePath(original.ref(before._parent)) === resource.nodePath(resource.ref(after._parent)), resource.nodePath(resource.ref(after?._parent)), original.nodePath(original.ref(before?._parent)));
        for (const field of ['_lpos', '_lrot', '_lscale', '_layer']) check(`${relation}:${resource.name}:${nodePath}:${field}`, before && after && JSON.stringify(before[field]) === JSON.stringify(after[field]), after?.[field], before?.[field]);
        for (const field of ['_contentSize', '_anchorPoint']) check(`${relation}:${resource.name}:${nodePath}:${field}`, Boolean(beforeUI) === Boolean(afterUI) && JSON.stringify(beforeUI?.[field]) === JSON.stringify(afterUI?.[field]), afterUI?.[field], beforeUI?.[field]);
        inputNodeIdentities.push({ resource: resource.path, nodePath, baselineInternalId: before?._id || original.ref(before?._prefab)?.fileId || null,
            savedInternalId: after?._id || resource.ref(after?._prefab)?.fileId || null, parent: resource.nodePath(resource.ref(after?._parent)),
            savedTransform: { position: after?._lpos, rotation: after?._lrot, scale: after?._lscale, layer: after?._layer, size: afterUI?._contentSize, anchor: afterUI?._anchorPoint } });
    }
    for (const [name, paths] of Object.entries(INPUT_PATHS)) {
        const resource = resources.get(name), original = baselineResources.get(name); if (!resource || !original) continue;
        const protectedAncestors = new Set();
        for (const p of paths) {
            protectedNode(resource, original, p);
            let node = original.ref(original.nodeAt(p)?._parent);
            while (node && node.__type__ !== 'cc.Scene') { protectedAncestors.add(original.nodePath(node)); node = original.ref(node._parent); }
        }
        for (const p of protectedAncestors) if (!paths.includes(p)) protectedNode(resource, original, p, 'inputAncestor');
    }
    for (const [name, type, fields] of [['Cable', 'CableConnector', ['head', 'anchor', 'line']], ['CleanSwipeStage', 'CleanSwipeStageController', ['inputSurface', 'dirtLayer']]]) {
        const resource = resources.get(name), old = baselineResources.get(name), before = old?.all(type)[0], after = resource?.all(type)[0];
        for (const field of fields) check(`InputBinding:${name}.${field}`, before && after && old.nodePath(old.ref(before[field])) === resource.nodePath(resource.ref(after[field])), resource?.nodePath(resource?.ref(after?.[field])), old?.nodePath(old?.ref(before?.[field])));
    }
    const removedFileIds = new Set(serializationDifferences.flatMap(entry => entry.removedInternalFileIds));
    const currentFileIds = new Set([...resources.values()].flatMap(resource => resource.data.filter(value => typeof value?.fileId === 'string').map(value => value.fileId)));
    const staleTargetOverrides = []; let targetOverrideRoots = 0;
    for (const resource of resources.values()) {
        function scan(value, location, inOverride = false) {
            if (!value || typeof value !== 'object') return;
            for (const [key, child] of Object.entries(value)) {
                const override = inOverride || key === 'targetOverrides';
                if (key === 'targetOverrides') targetOverrideRoots++;
                if (override && typeof child === 'string' && removedFileIds.has(child) && !currentFileIds.has(child)) staleTargetOverrides.push({ resource: resource.path, location: `${location}.${key}`, removedId: child });
                scan(child, `${location}.${key}`, override);
            }
        }
        resource.data.forEach((entry, i) => scan(entry, `[${i}]`));
    }
    check('Prefab:noStaleTargetOverrides', !staleTargetOverrides.length, { targetOverrideRoots, staleReferences: staleTargetOverrides }, 'No overrides referring to removed pre-V2 internal fileIds');
    const scene = resources.get('Game'), manager = singleton(scene, 'LevelManager'), runController = singleton(scene, 'RunController'), host = singleton(scene, 'StageHost');
    const home = singleton(scene, 'HomeController'), registry = singleton(scene, 'VisualAssetRegistry'), audio = singleton(scene, 'AudioFeedback');
    check('Editor:actualSceneInspection', runtime.ok === true && runtime.sceneUuid === scene?.meta?.uuid, { ok: runtime.ok, runtimeScene: runtime.sceneUuid, savedScene: scene?.meta?.uuid }, 'Actual current Editor inspection for saved Game.scene');
    for (const type of ['LevelManager', 'RunController', 'StageHost', 'HomeController', 'AudioFeedback', 'VisualAssetRegistry', 'PaperOrderHUD', 'V2ResultView', 'V21CleanDustView', 'V2CableLine', 'ResultStars']) check(`Editor:actualRegisteredClass:${type}`, scriptIds.get(runtime.classes?.[type])?.name === type, runtime.classes?.[type], `Current imported ${type}`);
    bind(scene, manager, 'runController', 'RunController'); bind(scene, manager, 'stageHost', 'StageHost', 'Canvas/PlayArea/StageHost');
    bind(scene, manager, 'audioFeedback', 'AudioFeedback'); bind(scene, host, 'visualAssets', 'VisualAssetRegistry');
    for (const [field, name] of [['dragMatchPrefab', 'DragMatchStage'], ['cableConnectPrefab', 'CableConnectStage'], ['cleanSwipePrefab', 'CleanSwipeStage']]) assetBinding(scene, host, field, 'prefab', CORE.find(c => c[0] === name)[1]);
    check('Home:formalAutostartFalse', manager?.autoStartOnSceneLoad === false && host?.slicePreview === false, { autoStartOnSceneLoad: manager?.autoStartOnSceneLoad, slicePreview: host?.slicePreview }, { autoStartOnSceneLoad: false, slicePreview: false });
    const overlay = bind(scene, home, 'overlay', 'cc.Node'), startButton = bind(scene, home, 'startButton', 'cc.Button'), soundButton = bind(scene, home, 'soundButton', 'cc.Button');
    bind(scene, home, 'levelManager', 'LevelManager'); bind(scene, home, 'audioFeedback', 'AudioFeedback');
    check('Home:waitingNoSerializedStage', overlay?._active === true && scene.ref(host?.node)?._children?.length === 0, { overlay: overlay?._active, serializedStages: scene.ref(host?.node)?._children?.length }, { overlay: true, serializedStages: 0 });
    check('Home:startInsideOverlaySoundOutside', startButton && soundButton && scene.nodePath(startButton).startsWith(`${scene.nodePath(overlay)}/`) && !scene.nodePath(soundButton).startsWith(`${scene.nodePath(overlay)}/`), { start: scene.nodePath(startButton), sound: scene.nodePath(soundButton), overlay: scene.nodePath(overlay) }, 'Start within Home, sound control survives Home dismissal');
    const soundUI = scene.component(scene.ref(soundButton?.node), 'cc.UITransform');
    check('Home:soundHitboxAtLeast88', soundUI?._contentSize.width >= 88 && soundUI?._contentSize.height >= 88, soundUI?._contentSize, 'At least 88x88 logical units');
    const source = bind(scene, audio, 'audioSource', 'cc.AudioSource');
    check('Audio:noAutoplayOrLoop', source?._playOnAwake === false && source?._loop === false, { playOnAwake: source?._playOnAwake, loop: source?._loop }, false);
    for (const field of ['uiClickClip', 'successClip', 'mistakeClip', 'cleanCompleteClip', 'stageCompleteClip', 'orderCompleteClip', 'runCompleteClip']) assetBinding(scene, audio, field, 'audio-clip');
    for (const [name, type, pairs] of [['DragMatchStage', 'DragMatchStageController', [['itemPrefab', 'DragItem'], ['targetPrefab', 'DragTarget']]],
        ['CableConnectStage', 'CableConnectStageController', [['cablePrefab', 'Cable'], ['portPrefab', 'Port']]], ['CleanSwipeStage', 'CleanSwipeStageController', [['dirtCellPrefab', 'DirtCell']]]]) {
        const resource = resources.get(name), controller = singleton(resource, type);
        for (const [field, target] of pairs) assetBinding(resource, controller, field, 'prefab', CORE.find(c => c[0] === target)[1]);
    }
    const clean = resources.get('CleanSwipeStage'), surface = clean?.nodeAt('CleanSwipeStage/InputSurface'), size = clean?.component(surface, 'cc.UITransform')?._contentSize;
    check('Clean:unchanged680x560Surface', size?.width === 680 && size?.height === 560, size, { width: 680, height: 560 });
    const visualElementNames = ['DragItem', 'DragTarget', 'Port', 'Cable'];
    for (const name of visualElementNames) {
        const resource = resources.get(name), elementPath = name === 'Cable' ? 'Cable/Head' : name;
        const visual = resource?.component(resource.nodeAt(elementPath), 'ElementVisual');
        check(`V2Element:${name}:componentPresent`, Boolean(visual), visual && resource.nodePath(visual), 'Actual saved ElementVisual');
        for (const [field, type] of [['icon', 'cc.Sprite'], ['caption', 'cc.Label'], ['checkMarker', 'cc.Node'], ['surface', 'cc.Sprite'], ['outline', 'cc.Graphics'], ['highlight', 'cc.Node']]) {
            const target = bind(resource, visual, field, type);
            check(`V2Element:${name}:${field}:nonInputDescendant`, target && resource.nodePath(target).startsWith(`${elementPath}/`), target && resource.nodePath(target), 'Pure display descendant of preserved input root');
        }
        const marker = resource.ref(visual?.checkMarker), glow = resource.ref(visual?.highlight);
        check(`V2Element:${name}:completionArtworkReset`, marker?._active === false && glow?._active === false, { markerActive: marker?._active, glowActive: glow?._active }, 'No stale completion marker or highlight saved');
        if (runtime.phase !== 'sample' || ['Port', 'Cable'].includes(name)) check(`V21Element:${name}:refinedChildLayoutEnabled`, visual?.refinedLayout === true,
            visual?.refinedLayout, 'Only the display-child layout is opted into V21; protected root geometry remains exact');
    }
    {
        const cable = resources.get('Cable'), connector = singleton(cable, 'CableConnector'), lineVisual = singleton(cable, 'V2CableLine');
        bind(cable, lineVisual, 'connector', 'CableConnector', 'Cable');
        const artwork = bind(cable, lineVisual, 'artwork', 'cc.Graphics'), logical = cable.ref(connector?.line);
        check('Cable:logicalGraphicsPreservedAndNewArtRenders', logical?.__type__ === 'cc.Graphics' && logical._enabled === false && artwork?._enabled !== false && artwork !== logical,
            { logical: cable.nodePath(logical), logicalEnabled: logical?._enabled, artwork: cable.nodePath(artwork), artworkEnabled: artwork?._enabled }, 'Original Graphics remains bound as transform/logic; separate V2 curve Graphics renders');
        check('V21Cable:refinedStyleEnabled', lineVisual?.refinedStyle === true, lineVisual?.refinedStyle, 'Saved current cables enable the render-only four-layer bounded-sag style');
        const lamp = bind(cable, lineVisual, 'statusLight', 'cc.Node', 'Cable/Head/V21ConnectedLamp');
        check('V21Cable:statusLampInitiallyOffAndNonInput', lamp?._active === false && !cable.component(lamp, 'cc.Button') && !cable.component(lamp, 'cc.BlockInputEvents'),
            { path: cable.nodePath(lamp), active: lamp?._active }, 'A child-only success lamp starts off and cannot intercept touch');
        const cableStage = resources.get('CableConnectStage'), underlay = cableStage.nodeAt('CableConnectStage/V21CableArtworkLayer');
        const stageNode = cableStage.nodeAt('CableConnectStage'), layerUI = cableStage.component(underlay, 'cc.UITransform');
        check('V21Cable:sharedArtworkUnderlayIsFirstPureIdentityChild', underlay && cableStage.ref(underlay._parent) === stageNode
            && cableStage.ref(stageNode._children?.[0]) === underlay && underlay._lpos?.x === 0 && underlay._lpos?.y === 0
            && underlay._lscale?.x === 1 && underlay._lscale?.y === 1 && underlay._layer === stageNode._layer
            && layerUI && !cableStage.component(underlay, 'cc.Button') && !cableStage.component(underlay, 'cc.BlockInputEvents'),
            { path: cableStage.nodePath(underlay), position: underlay?._lpos, scale: underlay?._lscale, layer: underlay?._layer },
            'Artwork can reparent below every subsequently instantiated cable/port/head/label without moving an input root');
        const dirt = resources.get('DirtCell'), appearance = singleton(dirt, 'V2DirtAppearance'), dust = bind(dirt, appearance, 'dust', 'cc.Node');
        const rootNode = dirt.nodeAt('DirtCell'), rootSprite = dirt.component(rootNode, 'cc.Sprite'), dustSprite = dirt.component(dust, 'cc.Sprite');
        check('V21Clean:logicalCellAndOldAppearancePreservedWithBothRenderersRetired', dust && dirt.ref(dust._parent) === rootNode && (!rootSprite || rootSprite._enabled === false) && dustSprite?._enabled === false,
            { child: dirt.nodePath(dust), originalRendererEnabled: rootSprite?._enabled, childRendererEnabled: dustSprite?._enabled }, 'Both old per-cell renderers are disabled; the logical cell/root and old appearance binding remain intact while the independent V21 view renders');
        assetBinding(dirt, dustSprite, '_spriteFrame', 'sprite-frame');
        const dustView = singleton(clean, 'V21CleanDustView'), controller = clean.all('CleanSwipeStageController')[0];
        bind(clean, controller, 'dustView', 'V21CleanDustView');
        const dustArtwork = bind(clean, dustView, 'artworkRoot', 'cc.Node', 'CleanSwipeStage/InputSurface/DirtLayer/V21DustArtwork');
        assetBinding(clean, dustView, 'dustFrame', 'sprite-frame');
        check('V21Clean:particleArtworkOutsideLogicalCellsAndInitiallyEmpty', dustArtwork && clean.ref(dustArtwork._parent) === clean.ref(controller?.dirtLayer)
            && dustArtwork._lpos?.x === 0 && dustArtwork._lpos?.y === 0 && dustArtwork._lscale?.x === 1 && dustArtwork._lscale?.y === 1
            && (dustArtwork._children || []).length === 0 && !clean.component(dustArtwork, 'cc.Button') && !clean.component(dustArtwork, 'cc.BlockInputEvents'),
            { path: clean.nodePath(dustArtwork), position: dustArtwork?._lpos, scale: dustArtwork?._lscale, serializedChildren: dustArtwork?._children?.length },
            'One empty render-only identity child of DirtLayer; bounded particles are runtime pooled independently of logical cells');
    }
    const keys = registry?.keys || [], frames = registry?.frames || [], keyFrames = new Map();
    check('Registry:alignedUniqueBindings', keys.length >= 49 && keys.length === frames.length && new Set(keys).size === keys.length, { keys: keys.length, frames: frames.length }, 'Original artwork plus unique V2 additions');
    keys.forEach((key, i) => { const frame = assets.get(frames[i]?.__uuid__); keyFrames.set(key, frame); check(`Registry:${key}`, frame?.imported && frame.assetExists && frame.importer === 'sprite-frame', frame || frames[i], 'Actual imported SpriteFrame'); });
    const originalRegistry = baselineResources.get('Game')?.all('VisualAssetRegistry')[0];
    const registrySkinChanges = [];
    (originalRegistry?.keys || []).forEach((key, i) => {
        const index = keys.indexOf(key), oldUuid = originalRegistry.frames[i]?.__uuid__, currentUuid = frames[index]?.__uuid__, frame = assets.get(currentUuid);
        check(`Registry:originalStableKeyPreserved:${key}`, index >= 0 && frame?.imported && frame.assetExists && frame.importer === 'sprite-frame', { key, originalUuid: oldUuid, currentUuid }, 'Same stable key with a real imported current skin');
        if (oldUuid !== currentUuid) registrySkinChanges.push({ key, originalUuid: oldUuid, currentUuid, actualPath: frame?.path });
    });
    for (const file of entries.filter(file => /\.(?:png|wav)$/i.test(file))) {
        fingerprint(file); const meta = read(`${file}.meta`);
        if (/\.png$/i.test(file)) {
            const spriteFrames = Object.values(meta?.subMetas || {}).filter(value => value.importer === 'sprite-frame');
            check(`PNG:actualImportedSpriteFrame:${relative(file)}`, meta?.importer === 'image' && spriteFrames.length === 1 && spriteFrames[0].imported === true, spriteFrames.map(f => ({ uuid: f.uuid, imported: f.imported })), 'Exactly one real imported SpriteFrame');
        } else check(`Audio:actualImportedClip:${relative(file)}`, meta?.importer === 'audio-clip' && meta.imported === true, meta?.importer, 'audio-clip');
    }
    const protectedFiles = [...baselineFiles.values()].filter(entry =>
        (entry.path.startsWith('docs/validation/') && !entry.path.startsWith('docs/validation/day5a-plus/v21/'))
        || /\.(?:png|svg|wav)$/i.test(entry.path) || entry.path.startsWith('assets/scripts/data/')
        || ['assets/scripts/core/RunController.ts', 'assets/scripts/gameplay/DraggableItem.ts', 'assets/scripts/gameplay/CableConnector.ts',
            'assets/scripts/visuals/VisualCatalog.ts', 'assets/scripts/visuals/VisualAssetRegistry.ts',
            'tools/verify-day4.cjs', 'tools/verify-day5a.cjs', 'tools/verify-day5a-v2.cjs'].includes(entry.path)
        || /^extensions\/deskrescue-editor\/(?:day5a|v2)-/.test(entry.path));
    for (const entry of protectedFiles) {
        try { const actual = fingerprint(entry.path); check(`ProtectedBaseline:${entry.path}`, actual.bytes === entry.bytes && actual.sha256 === entry.sha256, actual, entry); }
        catch (error) { check(`ProtectedBaseline:${entry.path}`, false, error.message, entry); }
    }
    try {
        const file = 'tools/test/cc.d.ts', original = baselineBytes(file), ending = original.includes(Buffer.from('\r\n')) ? '\r\n' : '\n';
        const beforeText = original.toString('utf8'), anchor = `    export class Color {${ending}`;
        const expected = beforeText.replace(anchor, anchor + ['r', 'g', 'b', 'a'].map(channel => `        ${channel}: number;${ending}`).join(''));
        check('Legacy174:mockContractOnlyFourColorChannelsAdded', beforeText.split(anchor).length === 2 && fs.readFileSync(path.join(root, file), 'utf8') === expected,
            fingerprint(file), 'Exact Phase 0 four-field Color declaration correction; constructor and all other mock declarations unchanged');
        const runner = 'tools/verify-day1.cjs', before = baselineBytes(runner), after = fs.readFileSync(path.join(root, runner));
        const marker = Buffer.from('    const runtime = compileAndLoad(ts, files, config);'), a = before.indexOf(marker), b = after.indexOf(marker);
        check('Legacy174:originalTestAndMockBodiesByteIdentical', a > 0 && b > 0 && before.subarray(0, a).equals(after.subarray(0, b)),
            { originalPrefixBytes: a, currentPrefixBytes: b, current: fingerprint(runner) }, 'Original mock, compiler/strict path, and every original Day1-3 test body retained byte-for-byte; only dispatcher may append V21 suites');
    } catch (error) { check('Legacy174:sourceContractsReadable', false, error.message, 'Captured test/contract sources'); }
    try {
        const declaration = fs.readFileSync(path.join(root, 'temp/declarations/cc.d.ts'), 'utf8'), reference = declaration.match(/reference\s+path=["']([^"']+)["']/)?.[1];
        const sdkFile = reference && path.resolve(root, 'temp/declarations', reference), engine = sdkFile && path.dirname(path.dirname(path.dirname(sdkFile)));
        const compilerPath = engine && path.resolve(engine, '../../../app.asar.unpacked/node_modules/typescript/lib/typescript.js');
        const ts = require(compilerPath), modules = new Map();
        function loadPure(file) {
            const absolute = path.resolve(root, file); if (modules.has(absolute)) return modules.get(absolute);
            if (!['LevelCatalog.ts', 'OrderCatalog.ts', 'VisualCatalog.ts'].includes(path.basename(file))) throw new Error(`Unexpected pure dependency ${file}`);
            const output = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
            const module = { exports: {} }; modules.set(absolute, module.exports);
            vm.runInNewContext(output, { exports: module.exports, module, require: name => { if (!name.startsWith('.')) throw new Error(`Unexpected pure import ${name}`); return loadPure(path.resolve(path.dirname(absolute), `${name}.ts`)); } }, { filename: relative(absolute), timeout: 1000 });
            modules.set(absolute, module.exports); return module.exports;
        }
        const catalog = loadPure('assets/scripts/data/OrderCatalog.ts').ORDER_CATALOG, visual = loadPure('assets/scripts/visuals/VisualCatalog.ts'), stages = catalog.flatMap(order => order.stages);
        check('Catalog:retains9Orders13Stages3Kinds', catalog.length === 9 && stages.length === 13 && new Set(stages.map(stage => stage.kind)).size === 3, { orders: catalog.length, stages: stages.length, kinds: [...new Set(stages.map(stage => stage.kind))] }, { orders: 9, stages: 13, kinds: 3 });
        for (const stage of stages) {
            const mapped = stage.kind === 'drag-match' ? stage.pairs.map(pair => ({ id: pair.id, key: visual.dragVisualKey(stage.id, pair.id) }))
                : stage.kind === 'cable-connect' ? stage.cables.flatMap(cable => ['head', 'port'].map(role => ({ id: cable.id, role, key: visual.cableVisualKey(stage.id, cable.id, role) })))
                    : stage.areas.map(area => ({ id: area.id, key: visual.cleanVisualKey(stage.id, area.id) }));
            mapped.forEach(item => { const frame = keyFrames.get(item.key); mappingCoverage.push({ stageId: stage.id, kind: stage.kind, ...item, uuid: frame?.uuid || null }); check(`Mapping:${stage.id}:${item.id}:${item.role || 'device'}`, frame?.imported && frame.assetExists && frame.importer === 'sprite-frame', frame, item.key); });
        }
        const keyboard = stages.find(stage => stage.id === 'keyboard-clean'), area = keyboard?.areas[0];
        check('Clean:true32Cells28Required46Brush', area?.columns * area?.rows === 32 && Math.ceil(area.columns * area.rows * keyboard.requiredRatio) === 28 && keyboard.brushRadius === 46,
            { cells: area?.columns * area?.rows, requiredRatio: keyboard?.requiredRatio, brushRadius: keyboard?.brushRadius }, { cells: 32, required: 28, brushRadius: 46 });
    } catch (error) { check('Catalog:actualPureMappingExecution', false, error.message, 'Actual imported project catalog/mapping modules'); }
    const view = inspectViews({ scene, manager, runController, home, resources, resolveType, assets, runtime, check, bind, singleton });
    const stars = bind(scene, manager, 'resultStars', 'ResultStars');
    if (runtime.phase !== 'sample') check('V21Results:boundedOptionalStarStagger', typeof stars?.staggerSeconds === 'number' && stars.staggerSeconds > 0 && stars.staggerSeconds <= 0.15,
        stars?.staggerSeconds, 'Actual final Inspector enables bounded decorative staggering without changing earned ratings');
    const pkg = read('package.json'), sample = runtime.phase === 'sample';
    check('Project:Creator388V21Version', pkg?.creator?.version === '3.8.8' && (sample ? ['0.0.5-alpha.2', '0.0.5-alpha.3'].includes(pkg?.version) : pkg?.version === '0.0.5-alpha.3'),
        { creator: pkg?.creator?.version, version: pkg?.version, phase: runtime.phase }, { creator: '3.8.8', version: sample ? 'Actual alpha.2/alpha.3 during representative sample only' : '0.0.5-alpha.3' });
    if (runtime.repeatPass) {
        const additions = runtime.repeatPass.addedNodesByResource || {}, touched = runtime.repeatPass.touchedResources || [], firstTouched = runtime.touchedResources || [];
        const known = new Set(CORE.map(([, file]) => file));
        check('Assembly:actualTouchedResourceSet', touched.length > 0 && new Set(touched).size === touched.length && touched.every(file => known.has(file))
            && JSON.stringify([...touched].sort()) === JSON.stringify([...firstTouched].sort()), { first: firstTouched, repeated: touched }, 'Actual first/repeated Editor passes touch the same explicit existing core resources');
        check('Assembly:actualRepeatZeroNodes', runtime.repeatPass.ok === true && touched.every(file => Object.hasOwn(additions, file) && additions[file] === 0)
            && Object.keys(additions).every(file => known.has(file)) && Object.values(additions).every(value => value === 0),
            { additions, touchedResources: touched, actualTouchedCount: touched.length }, 'Every actually touched resource is represented and repeated additions are zero, including any additionally reported core resources');
    } else check('Assembly:actualRepeatResultPresent', false, null, 'Actual repeat-pass result; no inferred idempotence');
    const errors = checks.filter(entry => !entry.passed).map(entry => entry.name);
    const currentTools = ['extensions/deskrescue-editor/v21-audit.js', 'extensions/deskrescue-editor/v21-probe.js',
        'extensions/deskrescue-editor/v21-main.js', 'extensions/deskrescue-editor/v21-scene.js',
        'tools/verify-v21-visuals.cjs', 'tools/verify-day5a-v21-clean.cjs', 'tools/verify_v21_offline.py',
        'tools/verify_v21_preservation.py', 'tools/package_v21_delivery.py'];
    currentTools.forEach(file => fingerprint(file));
    return { schemaVersion: 1, timestamp: new Date().toISOString(), projectRoot: root.replace(/\\/g, '/'), phase: runtime.phase || 'v21',
        mode: 'Read-only V2.1 actual Creator native file/meta audit against captured pre-V21 uncommitted ZIP, never old Git HEAD',
        coverageClaim: 'All nine current resources and original V2 contracts are inspected in every phase; sample allows alpha.2, final requires alpha.3. Actual play/visual fidelity require new V21 Preview evidence',
        ok: !errors.length, passed: checks.length - errors.length, total: checks.length, passedChecks: checks.length - errors.length, totalChecks: checks.length,
        checks, errors, warnings, sceneUuid: scene?.meta?.uuid, sceneSha256: files.get('assets/scenes/Game.scene')?.sha256,
        counts: { coreAssets: resources.size, metadata: metadata.length, png: entries.filter(file => /\.png$/i.test(file)).length,
            audio: entries.filter(file => /\.wav$/i.test(file)).length, registryKeys: keys.length, stableMappings: mappingCoverage.length, protectedFiles: protectedFiles.length, protectedInputComparisons: inputNodeIdentities.length },
        coreAssetIdentities: CORE.map(([name, file]) => ({ path: file, baselineUuid: baselineResources.get(name)?.meta?.uuid, currentUuid: resources.get(name)?.meta?.uuid })),
        resources: [...resources.values()].map(r => ({ name: r.name, path: r.path, uuid: r.meta?.uuid, nodes: r.nodes.length, nodePaths: r.nodes.map(r.nodePath) })),
        files: [...files.values()], inputNodeIdentities, serializationDifferences, externalReferences, mappingCoverage, registrySkinChanges, views: view,
        supersededVisualContracts: [{ historicalCheck: 'Clean:irregularChildArtReplacesRectangularRootRenderer', replacement: 'V21Clean:logicalCellAndOldAppearancePreservedWithBothRenderersRetired',
            reason: 'V21 deliberately retires the old per-cell Sprite while preserving its logic/component/transform; the separately bound V21CleanDustView now renders path-local particles. This is not a claim that the old enabled-renderer assertion passed.' }],
        targetOverrideInspection: { targetOverrideRoots, staleReferences: staleTargetOverrides },
        limitations: ['No pixel quality, screenshot alignment, native hit testing, physical touch or browser audio is certified by this saved-file audit.',
            'Actual component listeners and runtime timing require a newly executed V2 engine probe; human visual quality requires real Preview screenshots.'] };
};

function inspectViews({ scene, manager, runController, home, resources, resolveType, assets, check, bind, singleton }) {
    if (!scene) { check('V2:actualSavedSceneAvailable', false, null, 'Saved Game.scene'); return null; }
    const hud = singleton(scene, 'PaperOrderHUD'), results = singleton(scene, 'V2ResultView');
    bind(scene, manager, 'hudView', 'PaperOrderHUD'); bind(scene, manager, 'resultView', 'V2ResultView');
    const hudBindings = {};
    for (const field of ['chapterLabel', 'orderLabel', 'titleLabel', 'stepLabel', 'instructionLabel', 'progressLabel', 'cleanPercentLabel']) hudBindings[field] = bind(scene, hud, field, 'cc.Label');
    for (const field of ['dragGroup', 'cableGroup', 'cleanGroup']) hudBindings[field] = bind(scene, hud, field, 'cc.Node');
    for (const field of ['cleanTrack', 'cleanFill']) hudBindings[field] = bind(scene, hud, field, 'cc.UITransform');
    const cleanFill = hudBindings.cleanFill, cleanFillNode = scene.ref(cleanFill?.node), cleanGroupPath = scene.nodePath(hudBindings.cleanGroup);
    check('HUD:cleanFillLeftAnchored', cleanFill?._anchorPoint?.x === 0 && scene.nodePath(cleanFillNode).startsWith(`${cleanGroupPath}/`), { anchor: cleanFill?._anchorPoint, node: scene.nodePath(cleanFillNode) }, 'Left-anchored pure display fill inside clean-only group');
    check('HUD:uniqueDistinctKindGroups', new Set(['dragGroup', 'cableGroup', 'cleanGroup'].map(field => hud?.[field]?.__id__)).size === 3, ['dragGroup', 'cableGroup', 'cleanGroup'].map(field => scene.nodePath(hudBindings[field])), 'Three distinct kind-owned visual groups');
    const time = bind(scene, runController, 'timeLabel', 'cc.Label'), mistakes = bind(scene, runController, 'mistakeLabel', 'cc.Label');
    const timeNode = scene.ref(time?.node), mistakeNode = scene.ref(mistakes?.node), timeParent = scene.ref(timeNode?._parent), mistakeParent = scene.ref(mistakeNode?._parent);
    check('HUD:independentTimeAndMistakeCapsules', timeParent && mistakeParent && timeParent !== mistakeParent && ![time, mistakes].includes(hudBindings.titleLabel),
        { timeParent: scene.nodePath(timeParent), mistakeParent: scene.nodePath(mistakeParent), title: scene.nodePath(hudBindings.titleLabel) }, 'Independent capsule parents with separate task title');
    for (const [field, label] of [['time', time], ['mistakes', mistakes]]) {
        const labelNode = scene.ref(label?.node), ui = scene.component(labelNode, 'cc.UITransform');
        check(`HUD:${field}ReadableDesignSize`, ui?._contentSize.height >= 38 && label?._fontSize >= 26, { size: ui?._contentSize, fontSize: label?._fontSize }, 'At least 38 design-unit label height and 26 font size');
        check(`HUD:${field}LabelLocallyEnabled`, label && label._enabled !== false && labelNode?._active === true && scene.ref(labelNode._parent)?._active === true,
            { node: scene.nodePath(labelNode), nodeActive: labelNode?._active, parentActive: scene.ref(labelNode?._parent)?._active, enabled: label?._enabled },
            'The bound current value and its own capsule stay locally visible after repeated assembly');
    }
    const tutorial = bind(scene, manager, 'tutorialHint', 'cc.Node'), tutorialLabel = bind(scene, manager, 'tutorialLabel', 'cc.Label'), tutorialLabelNode = scene.ref(tutorialLabel?.node);
    check('HUD:currentTutorialLabelLocallyEnabled', tutorialLabel && tutorialLabel._enabled !== false && tutorialLabelNode?._active === true
        && scene.nodePath(tutorialLabelNode).startsWith(`${scene.nodePath(tutorial)}/`),
        { hint: scene.nodePath(tutorial), label: scene.nodePath(tutorialLabelNode), nodeActive: tutorialLabelNode?._active, enabled: tutorialLabel?._enabled },
        'Current tutorial label is an enabled child of the manager-controlled hint; hiding the hint between stages must not hide its text permanently');
    const order = bind(scene, results, 'orderGroup', 'cc.Node'), final = bind(scene, results, 'finalGroup', 'cc.Node');
    const starContainer = bind(scene, results, 'starContainer', 'cc.Node'), primary = bind(scene, results, 'primaryButtonRoot', 'cc.Node');
    const shade = bind(scene, results, 'modalShade', 'cc.Node', 'Canvas/V2ModalShade');
    const panel = bind(scene, manager, 'completePanel', 'cc.Node'), next = bind(scene, manager, 'nextButton', 'cc.Button');
    const nextNode = scene.ref(next?.node), homeButton = bind(scene, home, 'homeButton', 'cc.Button'), homeButtonNode = scene.ref(homeButton?.node);
    check('Results:singleSharedActionButtonRoot', primary === nextNode, { primary: scene.nodePath(primary), next: scene.nodePath(nextNode) }, 'Same original LevelManager-owned main Button input');
    const panelChildren = (panel?._children || []).map(scene.ref), primaryIndex = panelChildren.indexOf(nextNode);
    check('Results:primaryButtonRendersAboveBothResultGroups', primaryIndex >= 0 && panelChildren.indexOf(order) >= 0 && panelChildren.indexOf(final) >= 0
        && primaryIndex > panelChildren.indexOf(order) && primaryIndex > panelChildren.indexOf(final),
        { primaryIndex, orderGroupIndex: panelChildren.indexOf(order), finalGroupIndex: panelChildren.indexOf(final), primaryParent: scene.nodePath(scene.ref(nextNode?._parent)) },
        'The shared action Button is a direct result-panel child above both paper/character groups, so their art cannot cover it');
    check('Results:homeButtonFinalOnly', order && final && order !== final && scene.nodePath(homeButtonNode).startsWith(`${scene.nodePath(final)}/`) && !scene.nodePath(homeButtonNode).startsWith(`${scene.nodePath(order)}/`),
        { order: scene.nodePath(order), final: scene.nodePath(final), homeButton: scene.nodePath(homeButtonNode) }, 'Only final group owns the return-home Button');
    check('Results:starSpritesOnlyUnderOrderGroup', scene.nodePath(starContainer).startsWith(`${scene.nodePath(order)}/`), scene.nodePath(starContainer), 'Three single-order stars inside order-only group, never final summary');
    const resultLabels = {};
    for (const field of ['orderBadgeLabel', 'scoreLabel', 'timeLabel', 'mistakeLabel', 'stepsLabel', 'summaryOrdersLabel', 'summaryStarsLabel', 'summaryScoreLabel', 'summaryStepsLabel', 'summaryTimeLabel', 'summaryMistakesLabel']) resultLabels[field] = bind(scene, results, field, 'cc.Label');
    check('Results:distinctDynamicSummaryLabels', new Set(['summaryOrdersLabel', 'summaryStarsLabel', 'summaryScoreLabel', 'summaryStepsLabel', 'summaryTimeLabel', 'summaryMistakesLabel'].map(field => results?.[field]?.__id__)).size === 6,
        Object.fromEntries(Object.entries(resultLabels).filter(([field]) => field.startsWith('summary')).map(([field, label]) => [field, scene.nodePath(label)])), 'Six distinct runtime-driven final statistic Labels');
    check('Results:scoreVisualPriority', resultLabels.scoreLabel?._fontSize >= 50 && resultLabels.scoreLabel._fontSize > resultLabels.timeLabel?._fontSize,
        { scoreFontSize: resultLabels.scoreLabel?._fontSize, timeFontSize: resultLabels.timeLabel?._fontSize }, 'Emphasized real score (50+ design units), larger than secondary time');
    const legacyDetail = bind(scene, manager, 'completeDetailLabel', 'cc.Label');
    check('Results:legacyReportTextHidden', scene.ref(legacyDetail?.node)?._active === false, { path: scene.nodePath(legacyDetail), nodeActive: scene.ref(legacyDetail?.node)?._active }, 'Legacy text-star/report Label explicitly inactive');
    check('Results:waitingPanelShadeHidden', panel?._active === false && shade?._active === false, { panelActive: panel?._active, shadeActive: shade?._active }, { panelActive: false, shadeActive: false });
    const canvas = scene.nodeAt('Canvas'), shadeUI = scene.component(shade, 'cc.UITransform'), shadeSprite = scene.component(shade, 'cc.Sprite');
    const shadeOpacity = scene.component(shade, 'cc.UIOpacity')?._opacity ?? 255;
    const effectiveAlpha = (shadeSprite?._color?.a ?? 0) / 255 * shadeOpacity / 255;
    const canvasChildren = (canvas?._children || []).map(scene.ref), soundNode = scene.ref(scene.ref(home?.soundButton)?.node);
    check('Modal:independentCanvasSiblingFullScreen', scene.ref(shade?._parent) === canvas && scene.ref(panel?._parent) === canvas
        && shadeUI?._contentSize.width === 720 && shadeUI._contentSize.height === 1280 && shade?._lpos?.x === 0 && shade?._lpos?.y === 0
        && shade?._lscale?.x === 1 && shade?._lscale?.y === 1 && shadeUI?._anchorPoint?.x === 0.5 && shadeUI._anchorPoint.y === 0.5,
    { parent: scene.nodePath(scene.ref(shade?._parent)), position: shade?._lpos, scale: shade?._lscale, size: shadeUI?._contentSize, anchor: shadeUI?._anchorPoint }, 'Independent 720x1280 centered Canvas sibling, unaffected by card tween');
    check('Modal:shadeBetweenSoundAndResult', canvasChildren.indexOf(soundNode) >= 0 && canvasChildren.indexOf(shade) > canvasChildren.indexOf(soundNode) && canvasChildren.indexOf(panel) > canvasChildren.indexOf(shade),
        { soundIndex: canvasChildren.indexOf(soundNode), shadeIndex: canvasChildren.indexOf(shade), panelIndex: canvasChildren.indexOf(panel) }, 'sound < full-screen blocking shade < result panel');
    check('Modal:dimOpacity52to68Percent', effectiveAlpha >= 0.52 && effectiveAlpha <= 0.68, effectiveAlpha, '0.60 +/- 0.08 effective Sprite/UIOpacity alpha');
    const blocks = [...resources.values()].flatMap(resource => resource.all('cc.BlockInputEvents').map(block => ({ resource: resource.path, node: resource.ref(block.node), block, graph: resource })));
    check('Modal:exactlyOneEnabledBlockInputEvents', blocks.length === 1 && blocks[0].node === shade && blocks[0].block._enabled !== false, blocks.map(entry => ({ resource: entry.resource, path: entry.graph.nodePath(entry.node), enabled: entry.block._enabled })), 'Only Canvas/V2ModalShade has enabled BlockInputEvents');
    const allowedButtons = [home?.startButton, home?.soundButton, home?.homeButton, manager?.nextButton].map(value => scene.ref(value)).filter(Boolean);
    const illegalInputs = [];
    for (const resource of resources.values()) for (const value of resource.data) {
        const type = resolveType(value?.__type__);
        if (type === 'cc.Button' && (resource !== scene || !allowedButtons.includes(value))) illegalInputs.push({ resource: resource.path, node: resource.nodePath(value), type });
        if (/Collider/.test(type || '')) illegalInputs.push({ resource: resource.path, node: resource.nodePath(value), type });
    }
    check('Decorations:noButtonsOrColliders', !illegalInputs.length, illegalInputs, 'Only Start/Sound/Next-or-Replay/Home real Buttons; decorative children own no Button/Collider');
    const press = scene.all('ButtonPressFeedback');
    check('Buttons:fourOwnedPressFeedbackBindings', press.length === 4, press.length, 'One feedback component for each real Button');
    for (const feedback of press) {
        const button = bind(scene, feedback, 'button', 'cc.Button'), visual = bind(scene, feedback, 'visualRoot', 'cc.Node'), input = scene.ref(button?.node);
        check(`ButtonFeedback:${scene.nodePath(feedback)}:visualChildOnly`, visual && visual !== input && scene.nodePath(visual).startsWith(`${scene.nodePath(input)}/`)
            && !scene.component(visual, 'cc.Button') && !scene.component(visual, 'cc.BlockInputEvents'), { input: scene.nodePath(input), visual: scene.nodePath(visual) }, 'Only a non-interactive child scales; input root transform is unchanged');
    }
    const decorationBindings = [];
    for (const resource of resources.values()) for (const decoration of resource.all('WorkshopDecoration')) {
        const target = bind(resource, decoration, 'visualRoot', 'cc.Node'), owner = resource.ref(decoration.node);
        const valid = target && target !== owner && resource.nodePath(target).startsWith(`${resource.nodePath(owner)}/`) && !resource.component(target, 'cc.Button') && !resource.component(target, 'cc.BlockInputEvents');
        check(`Decoration:${resource.name}:${resource.nodePath(decoration)}:ownedNonInputChild`, valid, { owner: resource.nodePath(owner), target: resource.nodePath(target) }, 'Owned purely decorative descendant');
        decorationBindings.push({ resource: resource.path, owner: resource.nodePath(owner), target: resource.nodePath(target) });
    }
    const unimportedSprites = [...resources.values()].flatMap(resource => resource.all('cc.Sprite').filter(sprite => sprite._spriteFrame && !assets.get(sprite._spriteFrame.__uuid__)?.imported).map(sprite => ({ resource: resource.path, path: resource.nodePath(sprite), uuid: sprite._spriteFrame?.__uuid__ })));
    check('V2:allVisibleSpriteBindingsImported', !unimportedSprites.length, unimportedSprites, 'All saved SpriteFrame bindings resolve actual imported metadata');
    return { paperHud: scene.nodePath(hud), resultView: scene.nodePath(results),
        hudBindings: Object.fromEntries(Object.entries(hudBindings).map(([field, value]) => [field, scene.nodePath(value)])),
        timeCapsule: scene.nodePath(timeParent), mistakeCapsule: scene.nodePath(mistakeParent), orderGroup: scene.nodePath(order), finalGroup: scene.nodePath(final),
        modalShade: scene.nodePath(shade), effectiveModalAlpha: effectiveAlpha, homeButton: scene.nodePath(homeButtonNode), pressFeedback: press.map(scene.nodePath), decorationBindings,
        listenerLimitation: 'Saved-file inspection cannot see arbitrary code-owned Node listeners; V2 engine fixture lifecycle and real Preview hit testing are separate evidence.' };
}
