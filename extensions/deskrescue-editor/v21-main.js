'use strict';
const fs = require('fs'), path = require('path');
const DIR = 'docs/validation/day5a-plus/v21';
function save(name, result) {
    const file = path.join(Editor.Project.path, DIR, name); fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
}
async function scene(method, args = []) {
    return Editor.Message.request('scene', 'execute-scene-script', { name: 'deskrescue-editor', method, args });
}
async function prepare(phase) {
    await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets/art/v21');
    const manifest = JSON.parse(fs.readFileSync(path.join(Editor.Project.path, 'tools/art/v21/asset-sources.json'), 'utf8'));
    const old = JSON.parse(fs.readFileSync(path.join(Editor.Project.path, 'tools/art/asset-sources-v2.json'), 'utf8'));
    const existing = old.runtimeAssets.filter(item => ['v2/irregular-dust', 'v2/cable-anchor', 'v2/gold-button'].includes(item.key));
    const bindings = [];
    for (const item of [...manifest.runtimeAssets.filter(item => phase !== 'sample' || item.phase === 'sample'), ...existing]) {
        const url = `db://${item.path}`, info = await Editor.Message.request('asset-db', 'query-asset-info', url);
        if (!info?.uuid) throw new Error(`Wait for Creator import: ${url}`);
        let meta = await Editor.Message.request('asset-db', 'query-asset-meta', info.uuid);
        if (meta.userData.type !== 'sprite-frame' && !item.key.startsWith('v2/')) {
            meta.userData.type = 'sprite-frame';
            await Editor.Message.request('asset-db', 'save-asset-meta', info.uuid, JSON.stringify(meta));
            await Editor.Message.request('asset-db', 'reimport-asset', info.uuid);
        }
        let frame;
        for (let i = 0; i < 40; i++) {
            meta = await Editor.Message.request('asset-db', 'query-asset-meta', info.uuid);
            frame = Object.values(meta.subMetas || {}).find(v => v.importer === 'sprite-frame' && v.imported);
            if (frame?.uuid) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (!frame?.uuid) throw new Error(`No real SpriteFrame: ${url}`);
        if (frame.userData.trimType !== 'none' && !item.key.startsWith('v2/')) {
            frame.userData.trimType = 'none';
            await Editor.Message.request('asset-db', 'save-asset-meta', info.uuid, JSON.stringify(meta));
            await Editor.Message.request('asset-db', 'reimport-asset', info.uuid);
        }
        bindings.push({ key: item.key, bindingKey: item.bindingKey, url, uuid: frame.uuid, type: 'SpriteFrame' });
    }
    save(`imported-assets-${phase}.json`, { timestamp: new Date().toISOString(), bindings }); return bindings;
}
function audit(runtime) {
    delete require.cache[require.resolve('./v21-audit')]; return require('./v21-audit').run(Editor.Project.path, runtime);
}
exports.refresh = async function() {
    await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets/scripts');
    for (const folder of ['visuals', 'stages', 'ui']) for (const name of fs.readdirSync(path.join(Editor.Project.path, 'assets/scripts', folder)).filter(n => n.endsWith('.ts'))) {
        await Editor.Message.request('asset-db', 'reimport-asset', `db://assets/scripts/${folder}/${name}`);
    }
    console.info('[DeskRescue V2.1] Scripts refreshed; wait for compilation.'); return { ok: true };
};
exports.apply = async function(phase = 'sample') {
    let result;
    try {
        const bindings = await prepare(phase);
        result = await scene('applyV21', [{ phase, bindings }]);
        if (!result?.ok) throw new Error(result?.error || 'No actual assembly result');
        await Editor.Message.request('scene', 'snapshot');
        result.savedSceneUuid = await Editor.Message.request('scene', 'save-scene');
        if (!result.savedSceneUuid) throw new Error('Creator did not confirm saving the scene');
        result.repeatPass = await scene('applyV21', [{ phase, bindings }]);
        if (!result.repeatPass?.ok) throw new Error('Repeated incremental assembly failed');
        await Editor.Message.request('scene', 'snapshot');
        if (!await Editor.Message.request('scene', 'save-scene')) throw new Error('Repeat save missing');
        result.idempotent = Object.values(result.repeatPass.addedNodesByResource).every(n => n === 0);
        if (!result.idempotent) throw new Error('Repeated V2.1 update added duplicate nodes');
        result.timestamp = new Date().toISOString(); save(`build-${phase}.json`, result); save('build-current.json', result);
        const runtime = await scene('inspectV21', [phase]); save('runtime-current.json', runtime);
        const report = audit({ ...result, ...runtime }); save(`audit-${phase}.json`, report); save('audit-current.json', report);
        console.info(`[DeskRescue V2.1] Saved ${phase}; repeatZero=${result.idempotent}; audit=${report.passedChecks}/${report.totalChecks}`);
        return { ...result, auditOk: report.ok };
    } catch(error) {
        const failure = { ...result, ok: false, timestamp: new Date().toISOString(), error: String(error.stack || error) };
        save(`failure-${Date.now()}.json`, failure); console.error('[DeskRescue V2.1]', failure.error); return failure;
    }
};
exports.audit = async function() {
    const built = JSON.parse(fs.readFileSync(path.join(Editor.Project.path, DIR, 'build-current.json'), 'utf8'));
    const runtime = await scene('inspectV21', [built.phase]); const report = audit({ ...built, ...runtime });
    save('runtime-current.json', runtime); save('audit-current.json', report);
    console.info(`[DeskRescue V2.1] Audit ${report.passedChecks}/${report.totalChecks}`); return report;
};
exports.probe = async function() {
    const result = await scene('probeV21'); result.timestamp = new Date().toISOString(); save('engine-probe.json', result);
    console.info(`[DeskRescue V2.1] Real engine ${result.passedChecks}/${result.totalChecks}; ok=${result.ok}`); return result;
};
