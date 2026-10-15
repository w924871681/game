'use strict';

const fs = require('fs');
const path = require('path');
let busy = false;

function save(name, result) {
    const directory = path.join(Editor.Project.path, 'docs/validation/day5a');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, name), JSON.stringify(result, null, 2) + '\n', 'utf8');
}

async function scene(method, args = []) {
    return Editor.Message.request('scene', 'execute-scene-script', { name: 'deskrescue-editor', method, args });
}

function auditResources(runtime) {
    delete require.cache[require.resolve('./day5a-audit')];
    return require('./day5a-audit').run(Editor.Project.path, runtime);
}

async function prepareAssets() {
    const manifest = JSON.parse(fs.readFileSync(path.join(Editor.Project.path, 'tools/art/asset-sources.json'), 'utf8'));
    await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets/art');
    await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets/audio');
    const bindings = [];
    for (const item of manifest.runtimeAssets) {
        const url = `db://${item.path}`;
        let info = await Editor.Message.request('asset-db', 'query-asset-info', url);
        if (!info?.uuid) throw new Error(`Asset not imported: ${url}`);
        if (item.path.endsWith('.png')) {
            let meta = await Editor.Message.request('asset-db', 'query-asset-meta', info.uuid);
            if (!meta) throw new Error(`Missing Editor metadata: ${url}`);
            if (meta.userData.type !== 'sprite-frame') {
                meta.userData.type = 'sprite-frame';
                const saved = await Editor.Message.request('asset-db', 'save-asset-meta', info.uuid, JSON.stringify(meta));
                if (!saved) throw new Error(`Editor did not save SpriteFrame import settings: ${url}`);
                await Editor.Message.request('asset-db', 'reimport-asset', info.uuid);
            }
            let frame;
            for (let attempt = 0; attempt < 40; attempt += 1) {
                meta = await Editor.Message.request('asset-db', 'query-asset-meta', info.uuid);
                frame = Object.values(meta.subMetas || {}).find(value => value.importer === 'sprite-frame' && value.imported);
                if (frame?.uuid) break;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (!frame?.uuid) throw new Error(`Creator has not generated the SpriteFrame: ${url}`);
            // Preserve the original transparent artwork dimensions and smooth clamp borders.
            let changed = false;
            if (frame.userData.trimType !== 'none') { frame.userData.trimType = 'none'; changed = true; }
            if (item.key === 'ui/card' || item.key === 'ui/button') {
                for (const [border, value] of Object.entries({ borderLeft: 32, borderRight: 32, borderTop: 38, borderBottom: 38 })) {
                    if (frame.userData[border] !== value) { frame.userData[border] = value; changed = true; }
                }
            }
            for (const sub of Object.values(meta.subMetas || {})) {
                if (sub.importer === 'texture' && (sub.userData.wrapModeS !== 'clamp-to-edge' || sub.userData.wrapModeT !== 'clamp-to-edge')) {
                    sub.userData.wrapModeS = 'clamp-to-edge'; sub.userData.wrapModeT = 'clamp-to-edge'; changed = true;
                }
            }
            if (changed) {
                await Editor.Message.request('asset-db', 'save-asset-meta', info.uuid, JSON.stringify(meta));
                await Editor.Message.request('asset-db', 'reimport-asset', info.uuid);
            }
            bindings.push({ key: item.key, url, uuid: frame.uuid, type: 'SpriteFrame' });
        } else if (item.path.endsWith('.wav')) {
            bindings.push({ key: item.key, url, uuid: info.uuid, type: 'AudioClip' });
        }
    }
    save('asset-manifest.json', { generatedAtUtc: new Date().toISOString(), phase: manifest.phase,
        method: 'Actual Creator asset-db import and SpriteFrame settings API', bindings });
    return { phase: manifest.phase, bindings };
}

exports.refresh = async function () {
    await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets/scripts');
    for (const url of ['db://assets/scripts/core/LevelManager.ts', 'db://assets/scripts/stages/StageHost.ts',
        'db://assets/scripts/ui/AudioFeedback.ts']) {
        await Editor.Message.request('asset-db', 'reimport-asset', url);
    }
    console.info('[DeskRescue Day 5A] Scripts refreshed; wait for compilation, then Apply Visual Skin.');
};

exports.apply = async function () {
    if (busy) return { ok: false, error: 'Day 5A operation already running.' };
    busy = true;
    let result;
    try {
        const input = await prepareAssets();
        result = await scene('applyDay5A', [input]);
        if (!result?.ok) throw new Error(result?.error || 'Scene script did not confirm visual assembly.');
        await Editor.Message.request('scene', 'snapshot');
        result.savedSceneUuid = await Editor.Message.request('scene', 'save-scene');
        if (!result.savedSceneUuid) throw new Error('Creator did not confirm saving Game.scene.');
        result.repeatPass = await scene('applyDay5A', [input]);
        if (!result.repeatPass?.ok) throw new Error('Repeated visual assembly failed.');
        await Editor.Message.request('scene', 'snapshot');
        if (!await Editor.Message.request('scene', 'save-scene')) throw new Error('Creator did not confirm repeat save.');
        const repeated = Object.values(result.repeatPass.addedNodesByResource || {}).reduce((sum, count) => sum + count, 0);
        result.idempotent = repeated === 0;
        if (!result.idempotent) throw new Error(`Repeated assembly added ${repeated} nodes.`);
        result.timestamp = new Date().toISOString();
        save(`${input.phase}-build-report.json`, result);
        const inspected = await scene('inspectDay5A', [input.phase]);
        save('runtime-audit.json', inspected);
        const audit = auditResources({ ...result, ...inspected, repeatPass: result.repeatPass });
        save(input.phase === 'full' ? 'scene-audit.json' : 'slice-scene-audit.json', audit);
        console.info(`[DeskRescue Day 5A] Saved ${input.phase} assembly; audit ${audit.passedChecks}/${audit.totalChecks || audit.checks?.length}.`);
        return { ...result, auditOk: audit.ok };
    } catch (error) {
        result = { ...result, ok: false, error: error.message || String(error), timestamp: new Date().toISOString() };
        save('last-operation-error.json', result);
        console.error('[DeskRescue Day 5A]', result.error);
        return result;
    } finally { busy = false; }
};

exports.audit = async function () {
    const manifest = JSON.parse(fs.readFileSync(path.join(Editor.Project.path, 'tools/art/asset-sources.json'), 'utf8'));
    const runtime = await scene('inspectDay5A', [manifest.phase]);
    save('runtime-audit.json', runtime);
    const buildPath = path.join(Editor.Project.path, `docs/validation/day5a/${manifest.phase}-build-report.json`);
    const build = fs.existsSync(buildPath) ? JSON.parse(fs.readFileSync(buildPath, 'utf8')) : {};
    const result = auditResources({ ...build, ...runtime });
    save(manifest.phase === 'full' ? 'scene-audit.json' : 'slice-scene-audit.json', result);
    console.info(`[DeskRescue Day 5A] Audit ${result.passedChecks}/${result.totalChecks || result.checks?.length}`);
    return result;
};

exports.probe = async function () {
    if (busy) return { ok: false, error: 'Another Day 5A operation is running.' };
    busy = true;
    let result;
    try {
        result = await scene('probeDay5A');
        if (!result || typeof result !== 'object') throw new Error('Real scene process did not return probe results.');
    } catch (error) { result = { ok: false, error: error.message || String(error) }; }
    finally { busy = false; }
    result.timestamp = new Date().toISOString();
    save('engine-probe.json', result);
    console.info(`[DeskRescue Day 5A] Real engine probe ${result.passedChecks}/${result.totalChecks || result.checks?.length}; ok=${result.ok}`);
    return result;
};
