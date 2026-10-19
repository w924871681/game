'use strict';

const PACKAGE_NAME = 'deskrescue-editor';
const CANVAS_PREFAB_UUID = '4c33600e-9ca9-483b-b734-946008261697';
let building = false;

function nodeName(node) {
    return typeof node.name === 'string' ? node.name : node.name && node.name.value;
}

function findNamedNode(node, name) {
    if (!node) return null;
    if (nodeName(node) === name) return node;
    for (const child of node.children || []) {
        const result = findNamedNode(child, name);
        if (result) return result;
    }
    return null;
}

exports.load = function () {
    console.info('[DeskRescue] 在当前新场景中使用“DeskRescue → 创建默认 UI Canvas”，然后使用“装配 Day 3 场景”。');
};

exports.unload = function () {};

exports.methods = {
    async applyDay5B() { return day5bOperation('apply'); },
    async auditDay5B() { return day5bOperation('audit'); },
    async probeDay5B() { return day5bOperation('probe'); },
    async applyV22() { return v22Operation('apply'); },
    async refreshV22() { return v22Operation('refresh'); },
    async auditV22() { return v22Operation('audit'); },
    async probeV22() { return v22Operation('probe'); },
    async applyV21Sample() { return v21Operation('apply', 'sample'); },
    async applyV21Refine() { return v21Operation('apply', 'refine'); },
    async applyV21Full() { return v21Operation('apply', 'full'); },
    async refreshV21() { return v21Operation('refresh'); },
    async auditV21() { return v21Operation('audit'); },
    async probeV21() { return v21Operation('probe'); },
    async applyV2A() { return v2Operation('apply', 'a'); },
    async applyV2() { return v2Operation('apply', 'full'); },
    async refreshV2() { return v2Operation('refresh'); },
    async auditV2() { return v2Operation('audit'); },
    async probeV2() { return v2Operation('probe'); },
    async applyDay5A() { return day5aOperation('apply'); },
    async auditDay5A() { return day5aOperation('audit'); },
    async refreshDay5A() { return day5aOperation('refresh'); },
    async probeDay5A() { return day5aOperation('probe'); },
    async correctDay4Appearance() {
        return day4Operation('correctDay4Appearance', 'appearance-report.json', false);
    },
    async refreshDay4Scripts() {
        for (const url of ['db://assets/scripts/stages/StageHost.ts', 'db://assets/scripts/core/LevelManager.ts']) {
            await Editor.Message.request('asset-db', 'reimport-asset', url);
        }
        console.info('[DeskRescue Day 4] Project scripts reimported.');
    },
    async buildDay4() {
        return day4Operation('buildDay4', 'build-report.json', true);
    },
    async auditDay4() {
        const runtime = await day4Operation('inspectDay4', 'runtime-audit.json', false);
        const result = require('./day4-audit').run(Editor.Project.path, runtime);
        saveDay4Report('scene-audit.json', result);
        console.info(`[DeskRescue Day 4] Audit: ${result.passedChecks}/${result.checks.length}`);
        return result;
    },
    async probeDay4() {
        return day4Operation('probeDay4', 'engine-probe.json', false);
    },
    async runEngineProbe() {
        if (building) return { ok: false, error: '场景操作正在执行，请等待完成。' };
        building = true;
        let result;
        try {
            result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: PACKAGE_NAME,
                method: 'runEngineProbe',
                args: [],
            });
            if (!result || typeof result !== 'object') throw new Error('引擎验收未返回 JSON 结果。');
        } catch (error) {
            result = { ok: false, error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() };
        } finally {
            building = false;
        }
        // This report is written only after a real Editor invocation, never generated in advance.
        try {
            const { join } = require('path');
            const fs = require('fs');
            if (!Editor.Project.path) throw new Error('Editor.Project.path 不可用，无法保存验收报告。');
            const directory = join(Editor.Project.path, 'docs', 'validation', 'day3');
            fs.mkdirSync(directory, { recursive: true });
            fs.writeFileSync(join(directory, 'engine-probe.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
        } catch (error) {
            console.error(`[DeskRescue] 验收报告保存失败：${error instanceof Error ? error.message : String(error)}`);
        }
        console.info(`[DeskRescue] 引擎验收结果（独立真实 ActionManager 手动推进；模拟触摸事件）：\n${JSON.stringify(result, null, 2)}`);
        // The probe never snapshots or saves the open scene.
        return result;
    },
    async correctAppearance() {
        if (building) return { ok: false, error: '场景操作正在执行，请等待完成。' };
        building = true;
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: PACKAGE_NAME,
                method: 'correctAppearance',
                args: [],
            });
            if (!result || !result.ok) {
                throw new Error(result && result.error ? result.error : '场景校正未返回成功结果。');
            }
            await Editor.Message.request('scene', 'snapshot');
            console.info(`[DeskRescue] ${result.message} 请按 Ctrl+S 保存。`);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[DeskRescue] 外观校正失败：${message}`);
            return { ok: false, error: message };
        } finally {
            building = false;
        }
    },
    async createCanvas() {
        if (building) return { ok: false, error: '场景操作正在执行，请等待完成。' };
        building = true;
        try {
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) throw new Error('没有打开的编辑器场景，请先在编辑器创建新场景。');
            if (findNamedNode(tree, 'Canvas')) {
                throw new Error('当前场景已有 Canvas；为保护现有内容，拒绝重复创建。');
            }
            const uuid = await Editor.Message.request('scene', 'create-node', {
                name: 'Canvas',
                assetUuid: CANVAS_PREFAB_UUID,
                snapshot: true,
                unlinkPrefab: true,
            });
            if (!uuid) throw new Error('Editor 未返回 Canvas UUID，请查看 Creator 控制台。');
            await Editor.Message.request('scene', 'change-is2D', true);
            const result = { ok: true, canvasUuid: uuid, message: '默认 Canvas 与 UI Camera 已通过 Creator 内置模板创建。' };
            console.info(`[DeskRescue] ${result.message} 下一步执行“DeskRescue → 装配 Day 3 场景”。`);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[DeskRescue] 创建 Canvas 失败：${message}`);
            return { ok: false, error: message };
        } finally {
            building = false;
        }
    },
    async buildScene() {
        if (building) return { ok: false, error: '场景正在装配，请等待当前操作完成。' };
        building = true;
        try {
            // Read the open scene first. Never replace it by loading an empty scene.
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            const canvas = findNamedNode(tree, 'Canvas');
            if (!canvas) {
                throw new Error('当前场景没有 Canvas。请先执行“DeskRescue → 创建默认 UI Canvas”，或使用编辑器“创建 → UI → Canvas”。');
            }
            for (const name of ['Header', 'PlayArea', 'TutorialHint', 'CompletePanel']) {
                if ((canvas.children || []).some((child) => nodeName(child) === name)) {
                    throw new Error(`Canvas 已有 ${name}；为保护现有内容，拒绝重复装配。请使用单独的空场景。`);
                }
            }

            for (const [key, value] of [
                ['general.designResolution.width', 720],
                ['general.designResolution.height', 1280],
                ['general.designResolution.fitWidth', true],
                ['general.designResolution.fitHeight', true],
            ]) {
                const saved = await Editor.Message.request('project', 'set-config', 'project', key, value);
                if (saved === false) throw new Error(`项目设置 ${key} 未写入，请检查项目设置权限。`);
            }

            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: PACKAGE_NAME,
                method: 'buildScene',
                args: [],
            });
            if (!result || !result.ok) {
                throw new Error(result && result.error ? result.error : '场景脚本未返回成功结果，请查看 Creator 控制台。');
            }
            // Record the editor change. Scene saving and its .meta belong to Creator's UI.
            await Editor.Message.request('scene', 'snapshot');
            console.info(`[DeskRescue] ${result.message} 请按 Ctrl+S，并在编辑器另存为 assets/scenes/Game.scene。`);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[DeskRescue] 装配失败：${message}`);
            return { ok: false, error: message };
        } finally {
            building = false;
        }
    },
};

async function day5bOperation(method) {
    if (building) return { ok: false, error: 'Another Creator operation is running.' };
    building = true;
    try { delete require.cache[require.resolve('./day5b-main')]; return await require('./day5b-main')[method](); }
    finally { building = false; }
}

function requireFreshDay5A() {
    for (const name of ['./day5a-main', './day5a-audit']) delete require.cache[require.resolve(name)];
    return require('./day5a-main');
}

async function day5aOperation(method) {
    if (method === 'apply' && require('fs').existsSync(require('path').join(Editor.Project.path, 'docs/validation/day5a-plus/v2-build-report.json'))) {
        console.warn('[DeskRescue V2] Existing V2 assembly protected: use DeskRescue/V2 actions.');
        return { ok: false, error: 'Use V2 assembly; old visual skin would overwrite new UI.' };
    }
    if (building) return { ok: false, error: 'Another Creator scene operation is running.' };
    building = true;
    try { return await requireFreshDay5A()[method](); }
    finally { building = false; }
}

async function v2Operation(method, phase) {
    if (building) return { ok: false, error: 'Another Creator operation is running.' };
    building = true;
    try {
        delete require.cache[require.resolve('./v2-main')];
        return await require('./v2-main')[method](phase);
    } finally { building = false; }
}

async function v21Operation(method, phase) {
    if (building) return { ok: false, error: 'Another scene operation is in progress.' };
    building = true;
    try {
        delete require.cache[require.resolve('./v21-main')];
        return await require('./v21-main')[method](phase);
    } finally { building = false; }
}

async function v22Operation(method) {
    if (building) return { ok: false, error: 'Another scene operation is in progress.' };
    building = true;
    try {
        delete require.cache[require.resolve('./v22-main')];
        return await require('./v22-main')[method]();
    } finally { building = false; }
}

function saveDay4Report(name, result) {
    const fs = require('fs');
    const path = require('path');
    const directory = path.join(Editor.Project.path, 'docs', 'validation', 'day4');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, name), JSON.stringify(result, null, 2) + '\n', 'utf8');
}

async function day4Operation(method, report, save) {
    if (building) return { ok: false, error: 'Another scene operation is in progress.' };
    building = true;
    let result;
    try {
        result = await Editor.Message.request('scene', 'execute-scene-script', {
            name: PACKAGE_NAME, method, args: [],
        });
        if (!result?.ok) throw new Error(result?.error || `${method} did not succeed`);
        if (save) {
            await Editor.Message.request('scene', 'snapshot');
            result.savedSceneUuid = await Editor.Message.request('scene', 'save-scene');
            if (!result.savedSceneUuid) throw new Error('Creator did not confirm scene saving. Save Game.scene and rerun audit.');
        }
    } catch (error) {
        result = { ...result, ok: false, error: error.message || String(error) };
    } finally {
        building = false;
    }
    result.timestamp = new Date().toISOString();
    saveDay4Report(report, result);
    console.info(`[DeskRescue Day 4] ${method}: ${JSON.stringify(result, null, 2)}`);
    return result;
}
