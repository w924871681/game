'use strict';
const fs = require('fs'), path = require('path');
const DIR = 'docs/validation/day5b/final-polish';
function sourceBindings() {
    const root = Editor.Project.path, files = [];
    function visit(relative) {
        const full = path.join(root, relative);
        if (fs.statSync(full).isDirectory()) for (const name of fs.readdirSync(full)) visit(path.posix.join(relative, name));
        else files.push({ path: relative, bytes: fs.statSync(full).size,
            sha256: require('crypto').createHash('sha256').update(fs.readFileSync(full)).digest('hex') });
    }
    for (const name of ['assets/scripts', 'assets/prefabs', 'assets/scenes', 'assets/art/day5b', 'extensions/deskrescue-editor', 'tools/test', 'tools/verify-day1.cjs', 'tools/verify-day5b.cjs', 'package.json']) visit(name);
    return files.sort((a,b) => a.path.localeCompare(b.path));
}
function save(name, value) {
    const file = path.join(Editor.Project.path, DIR, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file)) fs.copyFileSync(file, file.replace(/\.json$/, `-prior-${Date.now()}.json`));
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
function scene(method, args = []) { return Editor.Message.request('scene', 'execute-scene-script', { name: 'deskrescue-editor', method, args }); }
async function prepare() {
    if (await Editor.Message.request('scene', 'query-dirty')) {
        await Editor.Message.request('scene', 'snapshot');
        if (!await Editor.Message.request('scene', 'save-scene')) throw new Error('Save current scene changes before reimporting scripts.');
    }
    await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets/art/day5b');
    await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets/scripts');
    // Folder refresh discovers additions but can retain an older compiled module.
    // Reimport only this phase's scripts and its three explicit integration files.
    const scripts = [];
    for (const folder of ['data', 'stages', 'visuals', 'ui', 'core']) {
        for (const name of fs.readdirSync(path.join(Editor.Project.path, 'assets/scripts', folder))) {
            if (!name.endsWith('.ts')) continue;
            if (!/^(?:Day5B|FaultSpotStageController|RotaryControlStageController|GuidedTraceStageController|GaugeTuneStageController|SequenceTestStageController|StageHost|PaperOrderHUD|LevelManager)/.test(name)) continue;
            const relative = `assets/scripts/${folder}/${name}`;
            scripts.push({ path: relative, sha256: require('crypto').createHash('sha256').update(fs.readFileSync(path.join(Editor.Project.path, relative))).digest('hex') });
        }
    }
    const receiptPath = path.join(Editor.Project.path, DIR, 'script-import-request.json');
    const previous = fs.existsSync(receiptPath) ? JSON.parse(fs.readFileSync(receiptPath, 'utf8')).scripts : null;
    if (JSON.stringify(previous) !== JSON.stringify(scripts)) {
        for (const script of scripts) await Editor.Message.request('asset-db', 'reimport-asset', `db://${script.path}`);
    // Creator's public reload reconciles the new classes with cached Prefab instances.
    // It reloads the saved scene, so no hand-written serialization is involved.
        await Editor.Message.request('scene', 'soft-reload');
        save('script-import-request.json', { scripts, timestamp: new Date().toISOString(),
            note: 'Import request only. Repeat Apply after the scene reloads; audit/probe still required.' });
        return null;
    }
    let stableReady = 0;
    for (let attempt = 0; attempt < 100 && stableReady < 3; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        stableReady = await Editor.Message.request('scene', 'query-is-ready') ? stableReady + 1 : 0;
    }
    if (stableReady < 3) throw new Error('Creator scene did not become ready after script reload.');
    const manifest = JSON.parse(fs.readFileSync(path.join(Editor.Project.path, 'tools/art/day5b/asset-sources.json'), 'utf8'));
    const bindings = [];
    for (const item of manifest.runtimeAssets) {
        const info = await Editor.Message.request('asset-db', 'query-asset-info', `db://${item.path}`);
        if (!info?.uuid) throw new Error(`Day5B asset not imported: ${item.path}`);
        let meta = await Editor.Message.request('asset-db', 'query-asset-meta', info.uuid);
        if (meta.userData.type !== 'sprite-frame') {
            meta.userData.type = 'sprite-frame';
            await Editor.Message.request('asset-db', 'save-asset-meta', info.uuid, JSON.stringify(meta));
            await Editor.Message.request('asset-db', 'reimport-asset', info.uuid);
        }
        let frame;
        for (let attempt = 0; attempt < 50; attempt++) {
            meta = await Editor.Message.request('asset-db', 'query-asset-meta', info.uuid);
            frame = Object.values(meta.subMetas || {}).find(m => m.importer === 'sprite-frame' && m.imported);
            if (frame?.uuid) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (!frame?.uuid) throw new Error(`Day5B SpriteFrame not imported: ${item.path}`);
        if (frame.userData.trimType !== 'none') {
            frame.userData.trimType = 'none';
            await Editor.Message.request('asset-db', 'save-asset-meta', info.uuid, JSON.stringify(meta));
            await Editor.Message.request('asset-db', 'reimport-asset', info.uuid);
        }
        bindings.push({ key: item.key, path: item.path, uuid: frame.uuid });
    }
    return bindings;
}
exports.apply = async function () {
    try {
        const bindings = await prepare();
        if (!bindings) {
            console.info('[DeskRescue Day5B] Scripts reimported. Wait for scene reload, then repeat Apply to save Prefab bindings.');
            return { ok: false, pendingScriptReload: true };
        }
        const qaPath = path.join(Editor.Project.path, 'local/day5b-qa.json');
        const qaEnabled = fs.existsSync(qaPath) && JSON.parse(fs.readFileSync(qaPath, 'utf8')).enabled === true;
        const first = await scene('applyDay5B', [{ bindings, qaEnabled }]);
        if (!first?.ok) throw new Error(first?.error || 'Day5B assembly failed');
        await Editor.Message.request('scene', 'snapshot');
        const saved = await Editor.Message.request('scene', 'save-scene');
        if (!saved) throw new Error('Creator did not confirm Game.scene save');
        const repeat = await scene('applyDay5B', [{ bindings, qaEnabled }]);
        if (!repeat?.ok || repeat.created.length) throw new Error('Day5B repeat must reuse all saved Prefabs');
        await Editor.Message.request('scene', 'snapshot');
        if (!await Editor.Message.request('scene', 'save-scene')) throw new Error('Creator repeat save not confirmed');
        const result = { ...first, bindings, repeat, savedSceneUuid: saved, timestamp: new Date().toISOString() };
        save('build-current.json', result); console.info('[DeskRescue Day5B] Saved new Stage Prefabs and formal scene; repeat reused all.');
        return result;
    } catch (error) {
        const result = { ok: false, timestamp: new Date().toISOString(), error: String(error.stack || error) };
        save(`build-failure-${Date.now()}.json`, result); console.error('[DeskRescue Day5B]', result.error); return result;
    }
};
exports.audit = async function () {
    const result = await scene('inspectDay5B'); save('editor-audit.json', { ...result, sourceBindings: sourceBindings(), timestamp: new Date().toISOString() }); return result;
};
exports.probe = async function () {
    const result = await scene('probeDay5B'); save('engine-probe.json', { ...result, sourceBindings: sourceBindings(), timestamp: new Date().toISOString() }); return result;
};
