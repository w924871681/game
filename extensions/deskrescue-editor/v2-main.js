'use strict';

const fs = require('fs');
const path = require('path');
const DIR = 'docs/validation/day5a-plus';
function save(name, result) {
    const file = path.join(Editor.Project.path, DIR, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n', 'utf8');
}
async function scene(method, args = []) {
    return Editor.Message.request('scene', 'execute-scene-script', { name: 'deskrescue-editor', method, args });
}
function audit(runtime) {
    delete require.cache[require.resolve('./v2-audit')];
    return require('./v2-audit').run(Editor.Project.path, runtime);
}
async function prepareAssets() {
    const original = JSON.parse(fs.readFileSync(path.join(Editor.Project.path, 'tools/art/asset-sources.json'), 'utf8'));
    const added = JSON.parse(fs.readFileSync(path.join(Editor.Project.path, 'tools/art/asset-sources-v2.json'), 'utf8'));
    await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets/art/v2');
    const bindings = [];
    for (const item of [...original.runtimeAssets, ...added.runtimeAssets]) {
        if (!item.path.endsWith('.png')) continue;
        const url = `db://${item.path}`;
        const info = await Editor.Message.request('asset-db', 'query-asset-info', url);
        if (!info?.uuid) throw new Error(`Asset not imported: ${url}`);
        let meta = await Editor.Message.request('asset-db', 'query-asset-meta', info.uuid);
        if (item.key.startsWith('v2/') && meta.userData.type !== 'sprite-frame') {
            meta.userData.type = 'sprite-frame';
            await Editor.Message.request('asset-db', 'save-asset-meta', info.uuid, JSON.stringify(meta));
            await Editor.Message.request('asset-db', 'reimport-asset', info.uuid);
        }
        let frame;
        for (let attempt = 0; attempt < 40; attempt++) {
            meta = await Editor.Message.request('asset-db', 'query-asset-meta', info.uuid);
            frame = Object.values(meta.subMetas || {}).find(value => value.importer === 'sprite-frame' && value.imported);
            if (frame?.uuid) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (!frame?.uuid) throw new Error(`Missing SpriteFrame ${url}`);
        if (item.key.startsWith('v2/')) {
            let changed = false;
            const settings = { trimType: 'none' };
            for (const [edge, value] of Object.entries(item.nineSlice || {})) settings[`border${edge[0].toUpperCase()}${edge.slice(1)}`] = value;
            for (const [key, value] of Object.entries(settings)) {
                if (frame.userData[key] !== value) { frame.userData[key] = value; changed = true; }
            }
            for (const texture of Object.values(meta.subMetas || {}).filter(value => value.importer === 'texture')) {
                for (const key of ['wrapModeS', 'wrapModeT']) {
                    if (texture.userData[key] !== 'clamp-to-edge') { texture.userData[key] = 'clamp-to-edge'; changed = true; }
                }
            }
            if (changed) {
                await Editor.Message.request('asset-db', 'save-asset-meta', info.uuid, JSON.stringify(meta));
                await Editor.Message.request('asset-db', 'reimport-asset', info.uuid);
            }
        }
        bindings.push({ key: item.key, url, uuid: frame.uuid, type: 'SpriteFrame' });
    }
    save('v2-imported-assets.json', { timestamp: new Date().toISOString(), method: 'Actual Creator asset-db; original metadata preserved; V2 trim/nine-slice configured', bindings });
    return bindings;
}
exports.refresh = async function () {
    await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets/scripts');
    const folders = ['core', 'ui', 'visuals'];
    for (const folder of folders) {
        for (const name of fs.readdirSync(path.join(Editor.Project.path, 'assets/scripts', folder)).filter(name => name.endsWith('.ts'))) {
            await Editor.Message.request('asset-db', 'reimport-asset', `db://assets/scripts/${folder}/${name}`);
        }
    }
    console.info('[DeskRescue V2] Current project scripts reimported. Wait for compilation before assembly.');
    return { ok: true };
};
exports.apply = async function (phase = 'full') {
    let result;
    try {
        const bindings = await prepareAssets();
        result = await scene('applyV2', [{ phase, bindings }]);
        if (!result?.ok) throw new Error(result?.error || 'V2 assembly did not return success');
        await Editor.Message.request('scene', 'snapshot');
        result.savedSceneUuid = await Editor.Message.request('scene', 'save-scene');
        if (!result.savedSceneUuid) throw new Error('Creator did not confirm saving scene');
        result.repeatPass = await scene('applyV2', [{ phase, bindings }]);
        if (!result.repeatPass?.ok) throw new Error('Repeated V2 assembly failed');
        await Editor.Message.request('scene', 'snapshot');
        if (!await Editor.Message.request('scene', 'save-scene')) throw new Error('Repeat save not confirmed');
        result.idempotent = Object.values(result.repeatPass.addedNodesByResource).every(count => count === 0);
        if (!result.idempotent) throw new Error('Repeated V2 assembly added nodes');
        result.timestamp = new Date().toISOString();
        save(`v2-${phase}-build-report.json`, result);
        save('v2-build-report.json', result);
        const runtime = await scene('inspectV2', [phase]);
        save('v2-runtime-audit.json', runtime);
        const checked = audit({ ...result, ...runtime });
        save(`v2-${phase}-scene-audit.json`, checked);
        save('v2-scene-audit.json', checked);
        console.info(`[DeskRescue V2] Saved ${phase}; idempotent=${result.idempotent}; audit=${checked.passedChecks}/${checked.totalChecks || checked.checks.length}`);
        return { ...result, auditOk: checked.ok };
    } catch (error) {
        const failure = { ...result, ok: false, error: error.message || String(error), timestamp: new Date().toISOString() };
        save('v2-last-operation-error.json', failure);
        console.error('[DeskRescue V2]', failure.error);
        return failure;
    }
};
exports.audit = async function () {
    const file = path.join(Editor.Project.path, DIR, 'v2-build-report.json');
    const built = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    const runtime = await scene('inspectV2', [built.phase || 'full']);
    const result = audit({ ...built, ...runtime });
    save('v2-runtime-audit.json', runtime); save('v2-scene-audit.json', result);
    console.info(`[DeskRescue V2] Audit=${result.passedChecks}/${result.totalChecks || result.checks.length}`);
    return result;
};
exports.probe = async function () {
    let result;
    try { result = await scene('probeV2'); }
    catch (error) { result = { ok: false, error: error.message || String(error) }; }
    result.timestamp = new Date().toISOString(); save('v2-engine-probe.json', result);
    console.info(`[DeskRescue V2] Current real engine probe ${result.passedChecks}/${result.totalChecks || result.checks?.length}, ok=${result.ok}`);
    return result;
};
