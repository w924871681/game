'use strict';
const fs = require('fs'), path = require('path');
const DIR = 'docs/validation/day5a-plus/v22';
function save(name, value) {
    const file = path.join(Editor.Project.path, DIR, name); fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
function scene(method) { return Editor.Message.request('scene', 'execute-scene-script', { name: 'deskrescue-editor', method, args: [] }); }
function audit(runtime) {
    delete require.cache[require.resolve('./v22-audit')];
    return require('./v22-audit').run(Editor.Project.path, runtime);
}
exports.refresh = async function () {
    for (const name of ['ElementVisual', 'V21CleanDustView']) {
        await Editor.Message.request('asset-db', 'reimport-asset', `db://assets/scripts/visuals/${name}.ts`);
    }
    console.info('[DeskRescue V2.2] Refreshed only two current visual scripts; wait for compilation.'); return { ok: true };
};
exports.apply = async function () {
    let result;
    try {
        result = await scene('applyV22'); if (!result?.ok) throw new Error(result?.error || 'V22 assembly result missing');
        await Editor.Message.request('scene', 'snapshot'); result.savedSceneUuid = await Editor.Message.request('scene', 'save-scene');
        if (!result.savedSceneUuid) throw new Error('Creator did not confirm Game.scene save');
        result.repeatPass = await scene('applyV22'); if (!result.repeatPass?.ok) throw new Error('V22 repeat pass failed');
        await Editor.Message.request('scene', 'snapshot');
        if (!await Editor.Message.request('scene', 'save-scene')) throw new Error('Repeated Game.scene save unconfirmed');
        result.idempotent = Object.values(result.repeatPass.addedNodesByResource).every(value => value === 0);
        if (!result.idempotent) throw new Error('V22 repeat unexpectedly created nodes');
        result.timestamp = new Date().toISOString(); save('build-current.json', result);
        const runtime = await scene('inspectV22'); save('runtime-current.json', runtime);
        const report = audit({ ...result, ...runtime }); save('creator-audit.json', report);
        console.info(`[DeskRescue V2.2] Saved visual closeout; repeatZero=${result.idempotent}; audit=${report.passedChecks}/${report.totalChecks}`);
        return { ...result, auditOk: report.ok };
    } catch (error) {
        const failure = { ...result, ok: false, timestamp: new Date().toISOString(), error: String(error.stack || error) };
        save(`failure-${Date.now()}.json`, failure); console.error('[DeskRescue V2.2]', failure.error); return failure;
    }
};
exports.audit = async function () {
    const built = JSON.parse(fs.readFileSync(path.join(Editor.Project.path, DIR, 'build-current.json'), 'utf8'));
    const runtime = await scene('inspectV22'); const report = audit({ ...built, ...runtime });
    save('runtime-current.json', runtime); save('creator-audit.json', report);
    console.info(`[DeskRescue V2.2] Audit ${report.passedChecks}/${report.totalChecks}`); return report;
};
exports.probe = async function () {
    const report = await scene('probeV22'); report.timestamp = new Date().toISOString(); save('engine-probe.json', report);
    if (!report.ok) save(`probe-failure-${Date.now()}.json`, report);
    console.info(`[DeskRescue V2.2] Real engine ${report.passedChecks}/${report.totalChecks}; ok=${report.ok}`); return report;
};
