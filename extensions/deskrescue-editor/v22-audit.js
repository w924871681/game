'use strict';

// Read-only incremental audit. Historical V21 checks are really re-executed;
// only its alpha3 version gate is explicitly replaced by an alpha4 gate.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const legacyAudit = require('./v21-audit');
const BASELINE = 'docs/validation/day5a-plus/v22/baseline.json';
const BASELINE_SHA = '44bc4f1a1d76c6a1978b6a9c4d421bf229b3aa36e7861087c7096c1a7c3002b0';
const CORE = [['Game', 'assets/scenes/Game.scene'],
    ...['DragMatchStage', 'CableConnectStage', 'CleanSwipeStage'].map(name => [name, `assets/prefabs/stages/${name}.prefab`]),
    ...['DragItem', 'DragTarget', 'Cable', 'Port', 'DirtCell'].map(name => [name, `assets/prefabs/elements/${name}.prefab`])];
const INPUT_PATHS = {
    Game: ['Canvas/PlayArea', 'Canvas/PlayArea/StageHost'], DragMatchStage: ['DragMatchStage'], CableConnectStage: ['CableConnectStage'],
    CleanSwipeStage: ['CleanSwipeStage', 'CleanSwipeStage/InputSurface', 'CleanSwipeStage/InputSurface/DirtLayer'],
    DragItem: ['DragItem'], DragTarget: ['DragTarget'], Port: ['Port'], DirtCell: ['DirtCell'],
    Cable: ['Cable', 'Cable/Head', 'Cable/Anchor', 'Cable/Line'],
};
const MODIFIABLE = new Set([...CORE.map(([, file]) => file),
    'assets/scripts/visuals/V21CleanDustView.ts', 'assets/scripts/visuals/ElementVisual.ts',
    'extensions/deskrescue-editor/main.js', 'extensions/deskrescue-editor/scene.js', 'extensions/deskrescue-editor/package.json',
    'tools/verify-day1.cjs', 'package.json', 'README.md', 'docs/GPT_HANDOFF.md']);
const SOURCE_BINDINGS = [
    ...['main', 'scene', 'audit', 'probe'].map(name => `extensions/deskrescue-editor/v22-${name}.js`),
    ...['verify_v22_offline', 'verify_v22_preservation', 'package_v22_delivery', 'run_v22_checks'].map(name => `tools/${name}.py`),
    'tools/verify-v22-clean.cjs', 'tools/verify-v22-readability.cjs', 'tools/verify-day1.cjs',
    'assets/scripts/visuals/V21CleanDustView.ts', 'assets/scripts/visuals/ElementVisual.ts',
    'extensions/deskrescue-editor/main.js', 'extensions/deskrescue-editor/scene.js', 'extensions/deskrescue-editor/package.json', 'package.json',
];
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const parse = bytes => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value);

function compressUuid(uuid, headLength = 5) {
    const hex = uuid.replace(/-/g, ''); if (!/^[a-f\d]{32}$/i.test(hex)) return uuid;
    let result = hex.slice(0, headLength);
    for (let index = headLength; index < hex.length; index += 3) {
        const value = parseInt(hex.slice(index, index + 3), 16); result += BASE64[value >> 6] + BASE64[value & 63];
    }
    return result;
}

// Same bounded ZIP reader as V21; no extraction, subprocess, shell or write.
function zipEntries(bytes) {
    let eocd = -1;
    for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65557); index--) {
        if (bytes.readUInt32LE(index) === 0x06054b50 && index + 22 + bytes.readUInt16LE(index + 20) === bytes.length) { eocd = index; break; }
    }
    if (eocd < 0) throw new Error('Captured V22 ZIP has no valid central directory');
    if (bytes.readUInt16LE(eocd + 4) || bytes.readUInt16LE(eocd + 6)) throw new Error('Multi-disk ZIP is unsupported');
    const count = bytes.readUInt16LE(eocd + 10), entries = new Map(); let offset = bytes.readUInt32LE(eocd + 16);
    for (let index = 0; index < count; index++) {
        if (bytes.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid V22 baseline ZIP directory entry');
        const flags = bytes.readUInt16LE(offset + 8), method = bytes.readUInt16LE(offset + 10);
        const compressed = bytes.readUInt32LE(offset + 20), size = bytes.readUInt32LE(offset + 24);
        const nameLength = bytes.readUInt16LE(offset + 28), extraLength = bytes.readUInt16LE(offset + 30), commentLength = bytes.readUInt16LE(offset + 32);
        const local = bytes.readUInt32LE(offset + 42), name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString('utf8').replace(/\\/g, '/');
        if ((flags & 1) || ![0, 8].includes(method)) throw new Error(`Unsupported captured ZIP encoding: ${name}`);
        if (entries.has(name)) throw new Error(`Duplicate captured ZIP entry: ${name}`);
        entries.set(name, () => {
            if (bytes.readUInt32LE(local) !== 0x04034b50) throw new Error(`Invalid local ZIP record: ${name}`);
            const begin = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
            const packed = bytes.subarray(begin, begin + compressed), output = method === 8 ? zlib.inflateRawSync(packed) : packed;
            if (output.length !== size) throw new Error(`Captured ZIP size mismatch: ${name}`);
            return output;
        });
        offset += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
}

function graph(data) {
    if (!Array.isArray(data)) throw new Error('Creator Scene/Prefab is not a native serialized array');
    const ref = value => value && Number.isInteger(value.__id__) ? data[value.__id__] || null : null;
    function nodePath(value) {
        let node = ['cc.Node', 'cc.Scene'].includes(value?.__type__) ? value : ref(value?.node); const names = [], seen = new Set();
        while (node && node.__type__ !== 'cc.Scene') {
            if (seen.has(node)) throw new Error('Cyclic native node ancestry'); seen.add(node); names.unshift(node._name); node = ref(node._parent);
        }
        return names.join('/');
    }
    const nodes = data.filter(value => value?.__type__ === 'cc.Node');
    function at(name) {
        const matches = nodes.filter(node => nodePath(node) === name);
        if (matches.length !== 1) throw new Error(`Expected one saved node ${name}; found ${matches.length}`);
        return matches[0];
    }
    const component = (node, type) => (node?._components || []).map(ref).find(value => value?.__type__ === type) || null;
    function geometry(name) {
        const node = at(name), ui = component(node, 'cc.UITransform'), prefab = ref(node._prefab);
        return { parent: nodePath(ref(node._parent)), position: node._lpos, rotation: node._lrot, scale: node._lscale, layer: node._layer,
            size: ui?._contentSize ?? null, anchor: ui?._anchorPoint ?? null, validNativeIdentity: Boolean(node._id || prefab?.fileId) };
    }
    return { data, ref, nodes, nodePath, at, component, geometry };
}

// Same reference normalization as verify_v22_preservation.py. Serialized array
// indices and native serializer identities are not UI/component semantics.
function normalizeReference(g, value, seen = new Set()) {
    if (Array.isArray(value)) return value.map(item => normalizeReference(g, item, seen));
    if (!value || typeof value !== 'object') return value;
    if (Object.keys(value).length === 1 && Object.hasOwn(value, '__id__')) {
        const target = g.ref(value);
        if (!target) return { missingReference: value };
        if (['cc.Node', 'cc.Scene'].includes(target.__type__)) return { nodePath: g.nodePath(target) };
        if (Object.hasOwn(target, 'node')) return { componentPath: g.nodePath(target), componentType: target.__type__ };
        if (seen.has(target)) return { cycleType: target.__type__ };
        return normalizeReference(g, target, new Set([...seen, target]));
    }
    return Object.fromEntries(Object.keys(value).sort().filter(key => !['_id', '__prefab', '_prefab', '__editorExtras__'].includes(key))
        .map(key => [key, normalizeReference(g, value[key], seen)]));
}
function protectedScene(g, visualTypes) {
    return Object.fromEntries(g.nodes.map(node => [g.nodePath(node), {
        node: normalizeReference(g, Object.fromEntries(Object.entries(node).filter(([key]) => !['_components', '_children'].includes(key)))),
        childOrder: (node._children || []).map(value => g.nodePath(g.ref(value))),
        components: (node._components || []).map(value => {
            const component = g.ref(value);
            // Native Scene serialization may materialize this new default on
            // the inactive legacy ElementVisual. No other legacy node or
            // component field is exempt from exact semantic preservation.
            const snapshot = g.nodePath(node).includes('/LegacyDay3/') && visualTypes.has(component?.__type__) && component.smallScreenLegibility === false
                ? Object.fromEntries(Object.entries(component).filter(([key]) => key !== 'smallScreenLegibility')) : component;
            return normalizeReference(g, snapshot);
        }),
    }]));
}

exports.run = function run(projectRoot, runtimeReport = {}) {
    const root = path.resolve(projectRoot), runtime = runtimeReport || {};
    const legacy = legacyAudit.run(root, runtime), versionGate = 'Project:Creator388V21Version';
    const superseded = legacy.checks.filter(item => item.name === versionGate);
    const checks = legacy.checks.filter(item => item.name !== versionGate).slice();
    const files = new Map((legacy.files || []).map(item => [item.path, item]));
    const check = (name, passed, actual, expected) => checks.push({ name, passed: Boolean(passed), actual: actual === undefined ? null : actual, expected: expected === undefined ? null : expected });
    function fingerprint(name) {
        const bytes = fs.readFileSync(path.join(root, name)), item = { path: name, bytes: bytes.length, sha256: hash(bytes) };
        files.set(name, item); return item;
    }
    function read(name) { fingerprint(name); return parse(fs.readFileSync(path.join(root, name))); }
    check('V22:ExactlyOneExplicitlySupersededLegacyVersionGate', superseded.length === 1 && legacy.checks.length >= 1319,
        { supersededGates: superseded.map(item => item.name), actualLegacyChecks: legacy.checks.length }, 'All original V21 checks executed; only the alpha3 version gate is replaced');
    const pkg = read('package.json');
    check('Project:Creator388V22Version', pkg?.creator?.version === '3.8.8' && pkg?.version === '0.0.5-alpha.4',
        { creator: pkg?.creator?.version, version: pkg?.version }, { creator: '3.8.8', version: '0.0.5-alpha.4' });
    check('V22:ActualFinalFullInspection', runtime.phase === 'full', runtime.phase, 'full');
    const coreResources = [], inputNodeComparisons = [], baselineFrozenFiles = [], inputBindings = [];
    let baseline, archive, baselineFiles, p2Summary = null;
    try {
        baseline = read(BASELINE); baselineFiles = new Map((baseline.files || []).map(item => [item.path, item]));
        check('V22Baseline:Pinned972Alpha3Snapshot', fingerprint(BASELINE).sha256 === BASELINE_SHA && baseline.version === '0.0.5-alpha.3'
            && baselineFiles.size === 972 && baseline.files.length === 972,
        { sha256: fingerprint(BASELINE).sha256, version: baseline.version, uniqueFiles: baselineFiles.size, entries: baseline.files.length },
        { sha256: BASELINE_SHA, version: '0.0.5-alpha.3', files: 972 });
        const backup = baseline.externalBackup, zip = fs.readFileSync(backup.path), zipHash = hash(zip);
        check('V22Baseline:ExternalZIPBytesAndSha256', zip.length === backup.bytes && zipHash === backup.sha256,
            { bytes: zip.length, sha256: zipHash }, { bytes: backup.bytes, sha256: backup.sha256 });
        archive = zipEntries(zip);
        check('V22Baseline:Exact972PayloadNames', archive.size === 972 && baselineFiles.size === 972 && [...baselineFiles.keys()].every(name => archive.has(name)),
            { entries: archive.size, baselineFiles: baselineFiles.size }, 'Exactly the 972 captured project files');
        const archiveFailures = [];
        for (const [name, expected] of baselineFiles) {
            try { const bytes = archive.get(name)(); if (bytes.length !== expected.bytes || hash(bytes) !== expected.sha256) archiveFailures.push(name); }
            catch (error) { archiveFailures.push({ path: name, error: error.message }); }
        }
        check('V22Baseline:EveryArchivedFileHashAndSize', archiveFailures.length === 0, archiveFailures, []);
        const oldBytes = name => {
            const expected = baselineFiles.get(name), bytes = archive.get(name)?.();
            if (!bytes || !expected || bytes.length !== expected.bytes || hash(bytes) !== expected.sha256) throw new Error(`Unverified captured V22 bytes: ${name}`);
            return bytes;
        };
        const graphs = new Map();
        for (const [name, file] of CORE) {
            try {
                const before = graph(parse(oldBytes(file))), after = graph(read(file)); graphs.set(name, { before, after });
                const oldMeta = parse(oldBytes(`${file}.meta`)), newMeta = read(`${file}.meta`), meta = fingerprint(`${file}.meta`);
                check(`V22Core:${name}:UuidUnchanged`, oldMeta.uuid === newMeta.uuid, newMeta.uuid, oldMeta.uuid);
                check(`V22Core:${name}:MetaByteIdentical`, meta.sha256 === baselineFiles.get(`${file}.meta`).sha256 && meta.bytes === baselineFiles.get(`${file}.meta`).bytes,
                    meta, baselineFiles.get(`${file}.meta`));
                coreResources.push({ name, path: file, before: baselineFiles.get(file), after: fingerprint(file), originalUuid: oldMeta.uuid, currentUuid: newMeta.uuid });
                const paths = new Set(INPUT_PATHS[name]);
                for (const input of INPUT_PATHS[name]) {
                    let ancestor = before.ref(before.at(input)._parent);
                    while (ancestor && ancestor.__type__ !== 'cc.Scene') { paths.add(before.nodePath(ancestor)); ancestor = before.ref(ancestor._parent); }
                }
                for (const input of [...paths].sort()) {
                    const original = before.geometry(input), saved = after.geometry(input), unchanged = canonical(original) === canonical(saved) && original.validNativeIdentity && saved.validNativeIdentity;
                    check(`V22InputAndAncestor:${name}:${input}`, unchanged, saved, original);
                    inputNodeComparisons.push({ resource: file, nodePath: input, unchanged, before: original, after: saved });
                }
            } catch (error) { check(`V22Core:${name}:ReadableVerifiedResources`, false, error.message, 'Captured alpha3 native graph, current saved graph and unchanged input ancestry'); }
        }
        for (const [name, fields] of [['Cable', ['head', 'anchor', 'line']], ['CleanSwipeStage', ['inputSurface', 'dirtLayer', 'dustView']]]) {
            const pair = graphs.get(name);
            if (!pair) { check(`V22InputBinding:${name}:ResourcePresent`, false, null, 'Actual saved core resource'); continue; }
            const original = pair.before.data.find(value => value && fields.every(field => Object.hasOwn(value, field)));
            const current = pair.after.data.find(value => value && value.__type__ === original?.__type__ && fields.every(field => Object.hasOwn(value, field)));
            for (const field of fields) {
                const before = normalizeReference(pair.before, original?.[field]), after = normalizeReference(pair.after, current?.[field]);
                const unchanged = Boolean(before && after) && canonical(before) === canonical(after);
                check(`V22InputBinding:${name}.${field}`, unchanged, after, before);
                inputBindings.push({ resource: CORE.find(([key]) => key === name)[1], field, before, after, unchanged });
            }
        }
        const elementMeta = read('assets/scripts/visuals/ElementVisual.ts.meta'), visualTypes = new Set([elementMeta.uuid, compressUuid(elementMeta.uuid), compressUuid(elementMeta.uuid, 2)]);
        const scenePair = graphs.get('Game');
        if (scenePair) {
            const before = protectedScene(scenePair.before, visualTypes), after = protectedScene(scenePair.after, visualTypes);
            const differences = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().filter(name => canonical(before[name]) !== canonical(after[name]));
            p2Summary = { nodes: Object.keys(before).length, unchanged: !differences.length, differences,
                normalization: 'Every scene node/component/child order is preserved including LegacyDay3. Only serializer identities and the new false default field on inactive LegacyDay3 ElementVisual are normalized.' };
            check('V22P2:HomeHUDResultsCanvasCamerasAndDecorationUnchanged', !differences.length, differences, []);
        } else check('V22P2:CurrentAndBaselineScenePresent', false, null, 'Both actual native Game.scene graphs');
        for (const [name, expected] of baselineFiles) {
            if (MODIFIABLE.has(name)) continue;
            try {
                const actual = fingerprint(name), unchanged = actual.bytes === expected.bytes && actual.sha256 === expected.sha256;
                baselineFrozenFiles.push({ path: name, unchanged, before: expected, after: actual });
                check(`V22Frozen:${name}`, unchanged, actual, expected);
            } catch (error) { baselineFrozenFiles.push({ path: name, unchanged: false, error: error.message }); check(`V22Frozen:${name}`, false, error.message, expected); }
        }
        for (const name of ['DragItem', 'DragTarget', 'Cable', 'Port']) {
            const g = graphs.get(name)?.after, inputPath = name === 'Cable' ? 'Cable/Head' : name;
            if (!g) { check(`V22Element:${name}:SavedResourcePresent`, false, null, 'Saved actual ElementVisual resource'); continue; }
            const input = g.at(inputPath), visuals = (input._components || []).map(g.ref).filter(value => visualTypes.has(value?.__type__)), visual = visuals[0];
            check(`V22Element:${name}:OptionalChildLegibilityEnabled`, visuals.length === 1 && visual?._enabled !== false && visual?.smallScreenLegibility === true && visual?.refinedLayout === true,
                { count: visuals.length, enabled: visual?._enabled, smallScreenLegibility: visual?.smallScreenLegibility, refinedLayout: visual?.refinedLayout }, 'One actual saved opt-in visual; no input root change');
            const caption = g.ref(visual?.caption), captionNode = g.ref(caption?.node), icon = g.ref(visual?.icon), iconNode = g.ref(icon?.node);
            const cream = caption?._outlineColor;
            check(`V22Element:${name}:OriginalCaptionVisibleAndOutlined`, caption?.__type__ === 'cc.Label' && caption._enabled !== false && captionNode?._active !== false
                && g.nodePath(captionNode).startsWith(`${inputPath}/`) && caption._enableOutline === true && caption._outlineWidth === 2
                && cream?.r === 255 && cream?.g === 245 && cream?.b === 219 && cream?.a === 255,
            { path: g.nodePath(captionNode), active: captionNode?._active, enabled: caption?._enabled, outline: caption?._enableOutline, width: caption?._outlineWidth, color: cream },
            'Original bound child Label remains active; real Label cream #FFF5DB outline is 2 design pixels');
            const badInputs = [captionNode, iconNode].filter(node => node && (g.component(node, 'cc.Button') || g.component(node, 'cc.BlockInputEvents'))).map(g.nodePath);
            check(`V22Element:${name}:CaptionAndIconRemainPureChildren`, icon?.__type__ === 'cc.Sprite' && g.nodePath(iconNode).startsWith(`${inputPath}/`) && !badInputs.length,
                { icon: g.nodePath(iconNode), caption: g.nodePath(captionNode), interceptors: badInputs }, 'No Button or BlockInputEvents on icon/caption children');
        }
    } catch (error) { check('V22Baseline:VerifiedCaptureAndSavedNativeGraphsAvailable', false, error.message, 'Actual immutable alpha3 972-file ZIP and current actual Creator saves'); }
    for (const name of SOURCE_BINDINGS) {
        try { fingerprint(name); check(`V22SourceBinding:${name}`, true, files.get(name), 'Current actual source bytes'); }
        catch (error) { check(`V22SourceBinding:${name}`, false, error.message, 'Required separate V22 source exists'); }
    }
    const comparison = 'tools/compare_v22_previews.py';
    if (fs.existsSync(path.join(root, comparison))) fingerprint(comparison);
    const errors = checks.filter(item => !item.passed).map(item => item.name), passed = checks.length - errors.length;
    return { ...legacy, timestamp: new Date().toISOString(), phase: runtime.phase || 'v22',
        mode: 'Read-only actual Creator V22 native saved-resource audit; complete V21 contracts rerun plus captured uncommitted 972-file alpha3 protection',
        coverageClaim: 'Saved references/UUID/meta/input ancestry/P2 semantics and current source hashes only; real engine fixture and natural Preview remain separate evidence',
        ok: !errors.length, passed, total: checks.length, passedChecks: passed, totalChecks: checks.length, checks, errors,
        counts: { ...legacy.counts, baselineV22Files: baselineFiles?.size || 0, v22FrozenBaselineFiles: baselineFrozenFiles.length,
            v22CoreAssets: coreResources.length, v22InputAndAncestorComparisons: inputNodeComparisons.length, checks: checks.length, passed, failed: errors.length },
        files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)),
        legacyAuditSummary: { timestamp: legacy.timestamp, ok: legacy.ok, passed: legacy.passedChecks, total: legacy.totalChecks,
            errors: legacy.errors, rawChecks: legacy.checks, rawVersionGate: superseded,
            retainedEffectiveChecks: legacy.checks.length - superseded.length,
            explanation: 'The historical V21 alpha3 gate is deliberately recorded as failed for alpha4, not claimed passed. Every other legacy check remains unchanged in the effective checks; one strict V22 alpha4 gate replaces this version-specific gate.' },
        supersededVisualContracts: [...(legacy.supersededVisualContracts || []), { historicalCheck: versionGate, replacement: 'Project:Creator388V22Version',
            reason: 'Only the explicitly authorized package version increment changes. The raw historical version assertion and its failure remain visible in legacyAuditSummary.' }],
        v22Baseline: baseline ? { path: BASELINE, sha256: fingerprint(BASELINE).sha256, capturedAtUtc: baseline.capturedAtUtc, files: baselineFiles.size, backup: baseline.externalBackup } : null,
        v22CoreAssetIdentities: coreResources, v22InputNodeComparisons: inputNodeComparisons, v22InputBindings: inputBindings,
        v22FrozenBaselineFiles: baselineFrozenFiles, v22P2SceneSemantics: p2Summary,
        limitations: [...(legacy.limitations || []), 'This function performs no writes. Original-size screenshots and user art approval are not inferred from resource or source checks.'] };
};
