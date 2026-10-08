#!/usr/bin/env node
'use strict';

// Runs actual project components with a small in-memory Cocos UI/event mock.
// No preview, rendering, engine startup, or platform build occurs in this script.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const contract = path.join(__dirname, 'test', 'cc.d.ts');
const scriptDirectory = path.join(root, 'assets', 'scripts');
const onlyNativeTypes = process.argv.includes('--cocos-types');
const checkSdkDeclarations = process.argv.includes('--check-sdk-declarations');

function editorEnvironment() {
    // Resolve the installed Editor from its own generated SDK reference, never a mock contract.
    const generated = path.join(root, 'temp', 'declarations', 'cc.d.ts');
    if (!fs.existsSync(path.join(root, 'temp', 'tsconfig.cocos.json')) || !fs.existsSync(generated)) return null;
    const text = fs.readFileSync(generated, 'utf8');
    for (const match of text.matchAll(/<reference\s+path=["']([^"']+)["']/g)) {
        const referenced = path.resolve(path.dirname(generated), match[1]);
        if (!/[\\/]bin[\\/]\.declarations[\\/]cc\.d\.ts$/.test(referenced) || !fs.existsSync(referenced)) continue;
        const engineRoot = path.dirname(path.dirname(path.dirname(referenced)));
        const resources = path.resolve(engineRoot, '..', '..', '..');
        return { engineRoot, compilerCandidates: [
            path.join(resources, 'app.asar.unpacked', 'node_modules', 'typescript', 'lib', 'typescript.js'),
            path.join(engineRoot, 'node_modules', 'typescript', 'lib', 'typescript.js'),
        ] };
    }
    return null;
}

function sourceFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const filename = path.join(directory, entry.name);
        return entry.isDirectory() ? sourceFiles(filename) : filename.endsWith('.ts') ? [filename] : [];
    }).sort();
}

function findTypeScript() {
    const candidates = [];
    if (process.env.TYPESCRIPT_PATH) candidates.push(process.env.TYPESCRIPT_PATH);
    const editor = editorEnvironment();
    if (editor) candidates.push(...editor.compilerCandidates);
    candidates.push('typescript', path.join(root, 'node_modules', 'typescript'));
    if (process.env.APPDATA) candidates.push(path.join(process.env.APPDATA, 'npm', 'node_modules', 'typescript'));
    const vscode = path.join(process.env.LOCALAPPDATA || path.join(require('node:os').homedir(), 'AppData', 'Local'), 'Programs', 'Microsoft VS Code');
    if (fs.existsSync(vscode)) {
        for (const base of [vscode, ...fs.readdirSync(vscode, { withFileTypes: true })
            .filter((entry) => entry.isDirectory()).map((entry) => path.join(vscode, entry.name))]) {
            candidates.push(path.join(base, 'resources', 'app', 'extensions', 'node_modules', 'typescript', 'lib', 'typescript.js'));
        }
    }
    for (const candidate of candidates) {
        try {
            const compiler = require(candidate);
            if (typeof compiler.createProgram === 'function') return { compiler, location: require.resolve(candidate) };
        } catch (error) {
            if (candidate === process.env.TYPESCRIPT_PATH) {
                throw new Error(`TYPESCRIPT_PATH could not be loaded: ${candidate}\n${error.message}`);
            }
        }
    }
    throw new Error('No existing TypeScript compiler found. Set TYPESCRIPT_PATH to an existing typescript.js file. This harness does not install dependencies.');
}

function failDiagnostics(ts, diagnostics) {
    if (!diagnostics.length) return;
    const host = { getCanonicalFileName: (name) => name, getCurrentDirectory: () => root, getNewLine: () => '\n' };
    throw new Error(ts.formatDiagnostics(diagnostics, host));
}

function nativeConfiguration(ts, required) {
    const base = path.join(root, 'temp', 'tsconfig.cocos.json');
    if (!fs.existsSync(base)) {
        if (required) throw new Error('Real Cocos typings unavailable: temp/tsconfig.cocos.json is missing. Open/import the project in Cocos Creator first, then rerun --cocos-types.');
        return null;
    }
    const configFile = path.join(root, 'tsconfig.json');
    const result = ts.readConfigFile(configFile, ts.sys.readFile);
    failDiagnostics(ts, result.error ? [result.error] : []);
    const parsed = ts.parseJsonConfigFileContent(result.config, ts.sys, root, undefined, configFile);
    failDiagnostics(ts, parsed.errors);
    // Cocos may provide cc as an ambient module via `types`, rather than a path.
    // Check the complete program below; never fall back to mocks after a native config exists.
    return parsed;
}

function verifyDay4TypeContracts(ts, files, options) {
    // Negative compile cases exercise the actual exported union and readonly types.
    // The virtual file stays in memory: neither assets nor generated SDK files change.
    const filename = path.join(scriptDirectory, 'data', '__day4_contract_probe__.ts');
    const source = [
        "import type { StageDefinition, DragMatchStageDefinition, CableConnectStageDefinition, CleanSwipeStageDefinition } from './StageDefinition';",
        "import type { OrderDefinition } from './OrderDefinition';",
        'declare const stage: StageDefinition;',
        "if (stage.kind === 'drag-match') { stage.pairs; stage.cables; }",
        "if (stage.kind === 'cable-connect') { stage.cables; stage.areas; }",
        "if (stage.kind === 'clean-swipe') { stage.areas; stage.pairs; }",
        "stage.title = 'external mutation';",
        "if (stage.kind === 'drag-match') { stage.pairs.push(stage.pairs[0]); }",
        "declare function pairs(value: DragMatchStageDefinition['pairs']): void; pairs([]);",
        "declare function cables(value: CableConnectStageDefinition['cables']): void; cables([]);",
        "declare function areas(value: CleanSwipeStageDefinition['areas']): void; areas([]);",
        "declare function stages(value: OrderDefinition['stages']): void; stages([]);",
    ].join('\n');
    const host = ts.createCompilerHost(options);
    const original = host.getSourceFile.bind(host);
    host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => path.resolve(name) === filename
        ? ts.createSourceFile(name, source, languageVersion, true)
        : original(name, languageVersion, onError, shouldCreateNewSourceFile);
    const program = ts.createProgram([...files, filename], options, host), unit = program.getSourceFile(filename);
    assert.ok(unit, 'Virtual union test must be compiled');
    const diagnostics = program.getSemanticDiagnostics(unit);
    assert.deepEqual(diagnostics.map((entry) => entry.code).sort(), [2339, 2339, 2339, 2339, 2345, 2345, 2345, 2345, 2540]);
    console.log('PASS Day 4 compile contract (not a mock behavior group): union narrowing, readonly objects/arrays, and nonempty tuples reject invalid inputs.');
}

function compileAndLoad(ts, files, config) {
    const options = config ? { ...config.options, strict: true, noUnusedLocals: true, noUnusedParameters: true, noEmit: true, skipLibCheck: false } : {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.Node16,
        moduleResolution: ts.ModuleResolutionKind.Node16,
        experimentalDecorators: true,
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noEmit: true,
        skipLibCheck: false,
    };
    const checkedFiles = config ? config.fileNames : [...files, contract];
    const program = ts.createProgram(checkedFiles, options);
    if (config) {
        // Keep every project/config/syntax error fatal. Only installed SDK declaration
        // semantic errors are separated; project code still uses those real API types.
        failDiagnostics(ts, [...program.getOptionsDiagnostics(), ...program.getSyntacticDiagnostics(), ...program.getGlobalDiagnostics()]);
        const editor = editorEnvironment(), excluded = [], actionable = [];
        for (const diagnostic of program.getSemanticDiagnostics()) {
            const filename = diagnostic.file?.fileName;
            const relative = editor && filename ? path.relative(editor.engineRoot, filename) : null;
            const projectRelative = filename ? path.relative(root, filename) : null;
            const fromProject = projectRelative !== null && projectRelative !== '..'
                && !projectRelative.startsWith(`..${path.sep}`) && !path.isAbsolute(projectRelative);
            const fromInstalledSdk = diagnostic.file?.isDeclarationFile && relative !== null
                && !fromProject && relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
            if (fromInstalledSdk && !checkSdkDeclarations) excluded.push(diagnostic); else actionable.push(diagnostic);
        }
        if (excluded.length) {
            const sources = new Map();
            for (const diagnostic of excluded) {
                const filename = diagnostic.file.fileName;
                sources.set(filename, (sources.get(filename) || 0) + 1);
            }
            console.warn(`SDK DECLARATION LIMITATION: ${excluded.length} semantic diagnostics in installed Creator SDK .d.ts files are excluded from the project check (skipLibCheck remains false).`);
            for (const [filename, count] of sources) console.warn(`  ${count}: ${filename}`);
            console.warn('Use --cocos-types --check-sdk-declarations to make these SDK diagnostics fatal; no SDK or generated configuration is modified.');
        }
        failDiagnostics(ts, actionable);
        console.log('PASS project strict TypeScript checking against real editor-generated Cocos SDK references (strict/noUnusedLocals/noUnusedParameters enabled; SDK self-validation is separate).');
    } else {
        failDiagnostics(ts, ts.getPreEmitDiagnostics(program));
        console.log('PASS strict TypeScript semantic checking (LIMITED TEST-ONLY tools/test/cc.d.ts contract)');
    }
    if (onlyNativeTypes) return null;
    verifyDay4TypeContracts(ts, checkedFiles, options);

    const emitted = new Map();
    for (const filename of files) {
        const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
            fileName: filename,
            reportDiagnostics: true,
            compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
        });
        failDiagnostics(ts, output.diagnostics || []);
        emitted.set(path.resolve(filename), output.outputText);
    }
    const mock = createMock();
    const loaded = new Map();
    function load(filename) {
        filename = path.resolve(filename);
        if (loaded.has(filename)) return loaded.get(filename).exports;
        const code = emitted.get(filename);
        assert.ok(code, `Module is not an actual emitted project script: ${filename}`);
        const module = { exports: {} };
        loaded.set(filename, module);
        const scopedRequire = (name) => {
            if (name === 'cc') return mock.cc;
            assert.ok(name.startsWith('.'), `Unexpected dependency: ${name}`);
            return load(path.resolve(path.dirname(filename), `${name}.ts`));
        };
        const wrapper = new vm.Script(`(function(require, module, exports) {\n${code}\n})`, { filename }).runInThisContext();
        wrapper(scopedRequire, module, module.exports);
        return module.exports;
    }
    return {
        mock,
        load: (relative) => load(path.join(scriptDirectory, relative)),
        GameController: load(path.join(scriptDirectory, 'core', 'GameController.ts')).GameController,
        DraggableItem: load(path.join(scriptDirectory, 'gameplay', 'DraggableItem.ts')).DraggableItem,
        Day1Prototype: load(path.join(scriptDirectory, 'gameplay', 'Day1Prototype.ts')).Day1Prototype,
        // Day 1–3 regressions run the preserved Day 3 component, with unchanged assertions.
        LevelManager: load(path.join(scriptDirectory, 'core', 'LegacyLevelManager.ts')).LegacyLevelManager,
        GameState: load(path.join(scriptDirectory, 'core', 'LegacyLevelManager.ts')).GameState,
        RunController: load(path.join(scriptDirectory, 'core', 'RunController.ts')).RunController,
        formatStars: load(path.join(scriptDirectory, 'core', 'RunController.ts')).formatStars,
        LEVEL_CATALOG: load(path.join(scriptDirectory, 'data', 'LevelCatalog.ts')).LEVEL_CATALOG,
    };
}

function createMock() {
    const warnings = [];
    const designs = [];
    const tweens = [];
    const instantiations = [];
    class Vec3 {
        constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
        set(x, y, z = 0) {
            if (typeof x === 'object') ({ x, y, z } = x);
            this.x = x; this.y = y; this.z = z;
            return this;
        }
        clone() { return new Vec3(this.x, this.y, this.z); }
        static add(out, a, b) { return out.set(a.x + b.x, a.y + b.y, a.z + b.z); }
        static subtract(out, a, b) { return out.set(a.x - b.x, a.y - b.y, a.z - b.z); }
    }
    // Generic affine transforms model UI ancestors; no gameplay algorithm lives here.
    function multiply(p, q) {
        return [p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1],
            p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3],
            p[0] * q[4] + p[2] * q[5] + p[4], p[1] * q[4] + p[3] * q[5] + p[5]];
    }
    function transform(matrix, vector, out = new Vec3()) {
        return out.set(matrix[0] * vector.x + matrix[2] * vector.y + matrix[4],
            matrix[1] * vector.x + matrix[3] * vector.y + matrix[5], vector.z);
    }
    class Component {
        constructor() { this._enabled = true; this._loaded = false; this._started = false; this._active = false; this._valid = true; }
        get enabled() { return this._enabled; }
        get enabledInHierarchy() { return this._active && this.enabled; }
        set enabled(value) {
            this._enabled = value;
            if (this.node) this._activate(this.node.activeInHierarchy && value);
        }
        _activate(value) {
            if (!this._valid || this._active === value) return;
            if (value && !this._loaded) { this._loaded = true; this.onLoad?.(); }
            this._active = value;
            if (value) this.onEnable?.(); else this.onDisable?.();
        }
        destroy() {
            this._activate(false);
            this.onDestroy?.();
            this._valid = false;
            return true;
        }
    }
    class Node {
        static EventType = { TOUCH_START: 'touch-start', TOUCH_MOVE: 'touch-move', TOUCH_END: 'touch-end', TOUCH_CANCEL: 'touch-cancel' };
        constructor(name = '') {
            this.name = name; this.children = []; this.components = []; this.listeners = new Map();
            this._parent = null; this._active = true; this._ready = false; this._valid = true;
            this.position = new Vec3(); this.scale = new Vec3(1, 1, 1); this.angle = 0; this.layer = 0;
        }
        get parent() { return this._parent; }
        set parent(value) {
            if (this._parent) this._parent.children.splice(this._parent.children.indexOf(this), 1);
            this._parent = value;
            if (value) value.children.push(this);
            this._ready = value?._ready || false;
            this._refresh();
        }
        get active() { return this._active; }
        set active(value) { this._active = value; this._refresh(); }
        get activeInHierarchy() { return this._ready && this._active && (!this.parent || this.parent.activeInHierarchy); }
        _refresh() {
            for (const component of this.components) component._activate(this.activeInHierarchy && component.enabled);
            for (const child of this.children) { child._ready = this._ready; child._refresh(); }
        }
        setPosition(x, y, z = 0) { this.position.set(x, y, z); }
        setScale(x, y, z = 1) { this.scale.set(x, y, z); }
        getComponent(type) { return this.components.find((component) => component instanceof type && component._valid) || null; }
        getChildByName(name) { return this.children.find((child) => child.name === name) || null; }
        addComponent(type) {
            const component = new type(); component.node = this; this.components.push(component);
            component._activate(this.activeInHierarchy && component.enabled);
            return component;
        }
        getComponents(type) { return this.components.filter((component) => component instanceof type && component._valid); }
        getComponentInChildren(type) { return this.getComponent(type) || this.children.map((child) => child.getComponentInChildren(type)).find(Boolean) || null; }
        getComponentsInChildren(type) { return [...this.getComponents(type), ...this.children.flatMap((child) => child.getComponentsInChildren(type))]; }
        addChild(child) { child.parent = this; }
        removeFromParent() { this.parent = null; }
        setSiblingIndex(index) { if (!this.parent) return; const siblings = this.parent.children; siblings.splice(siblings.indexOf(this), 1); siblings.splice(index, 0, this); }
        destroy() {
            if (!this._valid) return false;
            this.active = false;
            [...this.children].forEach((child) => child.destroy());
            this.components.forEach((component) => component.destroy());
            this.parent = null; this._valid = false; this.listeners.clear(); return true;
        }
        on(type, callback, target) {
            if (!this.listeners.has(type)) this.listeners.set(type, []);
            this.listeners.get(type).push({ callback, target });
        }
        off(type, callback, target) {
            this.listeners.set(type, (this.listeners.get(type) || []).filter((listener) => listener.callback !== callback || listener.target !== target));
        }
        emit(type, event) { for (const listener of [...(this.listeners.get(type) || [])]) listener.callback.call(listener.target, event); }
        listenerCount() { return [...this.listeners.values()].reduce((sum, listeners) => sum + listeners.length, 0); }
        get worldMatrix() {
            const radians = this.angle * Math.PI / 180;
            const cos = Math.cos(radians), sin = Math.sin(radians);
            const local = [cos * this.scale.x, sin * this.scale.x, -sin * this.scale.y, cos * this.scale.y, this.position.x, this.position.y];
            return this.parent ? multiply(this.parent.worldMatrix, local) : local;
        }
        get worldScaleZ() { return this.scale.z * (this.parent?.worldScaleZ || 1); }
        get worldPosition() {
            const matrix = this.worldMatrix;
            return new Vec3(matrix[4], matrix[5], this.parent ? this.parent.worldPosition.z + this.position.z * this.parent.worldScaleZ : this.position.z);
        }
    }
    class UITransform extends Component {
        constructor() { super(); this.width = 100; this.height = 100; }
        setContentSize(width, height) { this.width = width; this.height = height; }
        convertToWorldSpaceAR(local, out = new Vec3()) { return transform(this.node.worldMatrix, local, out); }
        convertToNodeSpaceAR(world, out = new Vec3()) {
            const [a, b, c, d, tx, ty] = this.node.worldMatrix;
            const determinant = a * d - b * c;
            assert.ok(Math.abs(determinant) > 1e-12, 'Mock transform must be invertible');
            const x = world.x - tx, y = world.y - ty, z = world.z;
            return out.set((d * x - c * y) / determinant, (-b * x + a * y) / determinant,
                (z - this.node.worldPosition.z) / this.node.worldScaleZ);
        }
    }
    class Label extends Component {
        static HorizontalAlign = { CENTER: 1 }; static VerticalAlign = { CENTER: 1 }; static Overflow = { SHRINK: 2 };
        constructor() { super(); this.string = ''; }
    }
    class Canvas extends Component {}
    class Button extends Component {
        static EventType = { CLICK: 'click' };
        constructor() { super(); this.interactable = true; }
    }
    class Color { constructor(r = 0, g = 0, b = 0, a = 255) { Object.assign(this, { r, g, b, a }); } }
    class Graphics extends Component {
        constructor() { super(); this.commands = []; }
        clear() { this.commands = []; }
        moveTo(x, y) { this.commands.push({ type: 'moveTo', x, y }); }
        lineTo(x, y) { this.commands.push({ type: 'lineTo', x, y }); }
        bezierCurveTo(...coordinates) { this.commands.push({ type: 'bezierCurveTo', coordinates }); }
        rect(x, y, width, height) { this.rectangle = { x, y, width, height }; }
        fill() { this.filled = true; } stroke() { this.stroked = true; }
    }
    class Sprite extends Component { static Type = { SIMPLE: 0, SLICED: 1 }; constructor() { super(); this.color = new Color(255, 255, 255); this.type = 1; } }
    class UIOpacity extends Component { constructor() { super(); this.opacity = 255; } }
    // Factories are test Inspector fixtures that construct actual project components.
    // instantiate itself only creates a node and records allocation identity; no game rules.
    class Prefab { constructor(factory) { this.factory = factory; } }
    function instantiate(prefab) {
        assert.ok(prefab instanceof Prefab && typeof prefab.factory === 'function', 'Prefab fixture factory required');
        const node = prefab.factory(); instantiations.push({ prefab, node }); return node;
    }
    class EventTouch {
        constructor(id, point) { this.id = id; this.point = point; this.propagationStopped = false; }
        getID() { return this.id; } getUILocation() { return { x: this.point.x, y: this.point.y }; }
    }
    // A controllable endpoint/callback queue, deliberately not a Tween engine.
    class Tween {
        constructor(target) { this.target = target; this.steps = []; this.started = false; this.stopped = false; this.finished = false; }
        to(duration, properties, options) {
            const endpoints = Object.fromEntries(Object.entries(properties)
                .map(([key, value]) => [key, value instanceof Vec3 ? value.clone() : value]));
            this.steps.push({ duration, properties: endpoints, options });
            return this;
        }
        call(callback) { this.steps.push({ callback }); return this; }
        start() { this.started = true; tweens.push(this); return this; }
        stop() { this.stopped = true; return this; }
        flush() {
            if (!this.started || this.stopped || this.finished) return;
            this.finished = true;
            for (const step of this.steps) {
                if (step.callback) step.callback();
                else {
                    for (const [key, value] of Object.entries(step.properties)) {
                        if (key === 'position') this.target.setPosition(value);
                        else if (key === 'scale') this.target.setScale(value);
                        else this.target[key] = value;
                    }
                    step.options?.onUpdate?.(this.target, 1);
                }
            }
        }
        callCallbacks() {
            // Inject a queued stale callback despite stop() to exercise revision guards.
            for (const step of this.steps) step.callback?.();
        }
    }
    function boot(node) {
        node._ready = true; node._refresh();
        function start(current) {
            for (const component of current.components) {
                if (component._active && !component._started) { component._started = true; component.start?.(); }
            }
            current.children.forEach(start);
        }
        start(node);
    }
    const cc = {
        _decorator: { ccclass: () => (type) => type, requireComponent: () => (type) => type, property: () => () => {}, disallowMultiple: (type) => type },
        Vec3, Component, Node, UITransform, Label, Canvas, Button, Color, Graphics, EventTouch, Tween, Sprite, UIOpacity, Prefab, instantiate,
        tween: (target) => new Tween(target),
        Layers: { Enum: { UI_2D: 1 << 25 } }, ResolutionPolicy: { SHOW_ALL: 2 },
        view: { setDesignResolutionSize: (...args) => designs.push(args) },
        isValid: (value) => Boolean(value && value._valid !== false && value.node?._valid !== false),
        warn: (message) => warnings.push(message),
    };
    return { cc, boot, transform, warnings, designs, tweens, instantiations,
        flush: (target) => tweens.filter((entry) => !target || entry.target === target).forEach((entry) => entry.flush()),
    };
}

function runTests(runtime) {
    const { mock, GameController, DraggableItem, Day1Prototype } = runtime;
    const { Node, UITransform, Label, Canvas, Graphics, EventTouch, Vec3 } = mock.cc;
    const initial = '把 A、B、C 拖到对应位置';
    const completed = '桌面整理完成！';
    const letters = ['A', 'B', 'C'];
    let groups = 0;
    function test(name, action) { action(); groups += 1; console.log(`PASS ${name}`); }
    function close(actual, expected, message = 'position') {
        for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs(actual[axis] - expected[axis]) < 1e-7, `${message}.${axis}: ${actual[axis]} != ${expected[axis]}`);
    }
    function child(node, name) { const result = node.children.find((entry) => entry.name === name); assert.ok(result, `Missing ${name}`); return result; }
    function fixture() {
        const canvas = new Node('Canvas'); canvas.addComponent(UITransform).setContentSize(720, 1280);
        canvas.addComponent(Canvas); canvas.addComponent(Day1Prototype); mock.boot(canvas);
        const playArea = child(canvas, 'PlayArea');
        return {
            canvas, playArea, label: child(canvas, 'StatusLabel').getComponent(Label),
            controller: child(canvas, 'GameController').getComponent(GameController),
            items: letters.map((letter) => child(playArea, `Item${letter}`)),
            targets: letters.map((letter) => child(playArea, `Target${letter}`)),
        };
    }
    function emit(node, type, point, id = 1) { const event = new EventTouch(id, point); node.emit(Node.EventType[type], event); return event; }
    function drop(item, world, id = 1) { emit(item, 'TOUCH_START', item.worldPosition, id); return emit(item, 'TOUCH_END', world, id); }
    function localWorld(parent, local) { return mock.transform(parent.worldMatrix, local); }

    test('actual Day1Prototype creates portrait UI, A/B/C components and matching bindings', () => {
        const f = fixture(); assert.equal(f.label.string, initial); assert.equal(f.controller.totalItems, 3);
        assert.deepEqual(mock.designs.at(-1), [720, 1280, mock.cc.ResolutionPolicy.SHOW_ALL]);
        assert.deepEqual(f.playArea.children.map((node) => node.name), ['TargetA', 'TargetB', 'TargetC', 'ItemA', 'ItemB', 'ItemC']);
        letters.forEach((letter, index) => {
            const item = f.items[index], target = f.targets[index], draggable = item.getComponent(DraggableItem);
            assert.equal(draggable.target, target); assert.equal(draggable.gameController, f.controller); assert.equal(draggable.snapDistance, 72);
            assert.equal(item.listenerCount(), 4); assert.ok(target.position.y > 0 && item.position.y < 0);
            assert.equal(child(item, 'Letter').getComponent(Label).string, letter);
            assert.equal(child(target, 'Letter').getComponent(Label).string, letter);
            assert.ok(child(item, 'Letter').getComponent(Label).fontSize > child(target, 'Letter').getComponent(Label).fontSize);
            assert.ok(item.getComponent(UITransform).width > target.getComponent(UITransform).width);
            assert.ok(item.getComponent(Graphics).filled && target.getComponent(Graphics).stroked);
        });
    });
    test('all six A/B/C wrong-target combinations roll back without counting', () => {
        for (let itemIndex = 0; itemIndex < 3; itemIndex += 1) {
            for (let targetIndex = 0; targetIndex < 3; targetIndex += 1) {
                if (itemIndex === targetIndex) continue;
                const f = fixture(), item = f.items[itemIndex], before = item.position.clone();
                drop(item, f.targets[targetIndex].worldPosition);
                close(item.position, before); assert.equal(f.label.string, initial);
            }
        }
    });
    test('distance exactly equal to snapDistance snaps; immediately outside rolls back', () => {
        const f = fixture(), item = f.items[0], target = f.targets[0], before = item.position.clone();
        drop(item, localWorld(f.playArea, new Vec3(target.position.x + 72.0001, target.position.y)));
        close(item.position, before); assert.equal(f.label.string, initial);
        drop(item, localWorld(f.playArea, new Vec3(target.position.x + 72, target.position.y)));
        close(item.position, target.position); assert.equal(f.label.string, '已完成 1 / 3');
    });
    test('A/B/C success locks each item, counts once, and displays 1/3, 2/3, then done', () => {
        const f = fixture();
        letters.forEach((letter, index) => {
            const item = f.items[index]; drop(item, f.targets[index].worldPosition);
            close(item.position, f.targets[index].position);
            const expected = index === 2 ? completed : `已完成 ${index + 1} / 3`;
            assert.equal(f.label.string, expected);
            emit(item, 'TOUCH_START', item.worldPosition); emit(item, 'TOUCH_MOVE', new Vec3(300, -300)); emit(item, 'TOUCH_END', new Vec3(300, -300));
            close(item.position, f.targets[index].position); assert.equal(f.label.string, expected);
        });
        f.controller.onItemPlaced(); assert.equal(f.label.string, completed);
    });
    test('TOUCH_CANCEL far from and near the correct target rolls back and never counts', () => {
        for (const nearTarget of [false, true]) {
            const f = fixture(), item = f.items[0], before = item.position.clone();
            emit(item, 'TOUCH_START', item.worldPosition);
            const pointer = nearTarget ? f.targets[0].worldPosition : new Vec3(150, -100);
            emit(item, 'TOUCH_MOVE', pointer); const event = emit(item, 'TOUCH_CANCEL', pointer);
            close(item.position, before); assert.equal(f.label.string, initial); assert.equal(event.propagationStopped, true);
            drop(item, f.targets[0].worldPosition); assert.equal(f.label.string, '已完成 1 / 3');
        }
    });
    test('touch ID 0 owns drag; foreign start/move/end/cancel cannot steal or finish it', () => {
        const f = fixture(), item = f.items[0], before = item.position.clone();
        assert.equal(emit(item, 'TOUCH_START', item.worldPosition, 0).propagationStopped, true);
        for (const type of ['TOUCH_START', 'TOUCH_MOVE', 'TOUCH_END', 'TOUCH_CANCEL']) {
            assert.equal(emit(item, type, f.targets[0].worldPosition, 99).propagationStopped, false);
            close(item.position, before); assert.equal(f.label.string, initial);
        }
        emit(item, 'TOUCH_MOVE', f.targets[0].worldPosition, 0); emit(item, 'TOUCH_END', f.targets[0].worldPosition, 0);
        close(item.position, f.targets[0].position); assert.equal(f.label.string, '已完成 1 / 3');
    });
    test('release uses final pointer position even without a final TOUCH_MOVE', () => {
        const f = fixture(), item = f.items[0];
        emit(item, 'TOUCH_START', item.worldPosition); emit(item, 'TOUCH_MOVE', new Vec3(100, 20));
        emit(item, 'TOUCH_END', f.targets[0].worldPosition);
        close(item.position, f.targets[0].position); assert.equal(f.label.string, '已完成 1 / 3');
        const g = fixture(), other = g.items[0], before = other.position.clone();
        emit(other, 'TOUCH_START', other.worldPosition); emit(other, 'TOUCH_MOVE', g.targets[0].worldPosition);
        emit(other, 'TOUCH_END', new Vec3(100, 20)); close(other.position, before); assert.equal(g.label.string, initial);
    });
    test('drag preserves grab offset and scale under different translated/rotated/nonuniform parents', () => {
        const stage = new Node('Stage'); stage.addComponent(UITransform); stage.setPosition(110, -30); stage.angle = 11; stage.scale.set(1.1, 0.9, 1);
        const itemParent = new Node('ItemParent'); itemParent.addComponent(UITransform); itemParent.setPosition(60, -70); itemParent.angle = 31; itemParent.scale.set(1.6, 0.5, 1); itemParent.parent = stage;
        const targetParent = new Node('TargetParent'); targetParent.addComponent(UITransform); targetParent.setPosition(-150, 240); targetParent.angle = -35; targetParent.scale.set(0.5, 2.2, 1); targetParent.parent = stage;
        const labelNode = new Node('Label'); labelNode.parent = stage; const label = labelNode.addComponent(Label);
        const controllerNode = new Node('Controller'); controllerNode.parent = stage; const controller = controllerNode.addComponent(GameController); controller.statusLabel = label;
        const target = new Node('Target'); target.setPosition(110, 70); target.parent = targetParent;
        const item = new Node('Item'); item.addComponent(UITransform); item.setPosition(-80, -90, 3); item.scale.set(0.8, 1.3, 1); item.parent = itemParent;
        const draggable = item.addComponent(DraggableItem); draggable.target = target; draggable.gameController = controller; draggable.snapDistance = 72; draggable.animationsEnabled = false; mock.boot(stage);
        const scale = item.scale.clone(), before = item.position.clone(), offset = new Vec3(17, -9);
        const grab = localWorld(itemParent, new Vec3(before.x + offset.x, before.y + offset.y)); emit(item, 'TOUCH_START', grab);
        close(item.position, before, 'no start jump');
        const targetLocal = itemParent.getComponent(UITransform).convertToNodeSpaceAR(target.worldPosition);
        const desired = new Vec3(targetLocal.x + 60, targetLocal.y + 30, 3);
        const pointer = localWorld(itemParent, new Vec3(desired.x + offset.x, desired.y + offset.y)); emit(item, 'TOUCH_MOVE', pointer);
        close(item.position, desired, 'offset-adjusted move'); close(item.scale, scale, 'unchanged scale');
        emit(item, 'TOUCH_END', pointer); close(item.position, targetLocal, 'converted target'); close(item.worldPosition, target.worldPosition, 'world snap');
        close(item.scale, scale); assert.equal(label.string, '已完成 1 / 3');
    });
    test('disable cancels active drag; repeated disable/re-enable does not leak listeners', () => {
        const f = fixture(), item = f.items[0], draggable = item.getComponent(DraggableItem), before = item.position.clone();
        emit(item, 'TOUCH_START', item.worldPosition); emit(item, 'TOUCH_MOVE', f.targets[0].worldPosition);
        draggable.enabled = false; close(item.position, before); assert.equal(item.listenerCount(), 0); assert.equal(f.label.string, initial);
        draggable.enabled = false; assert.equal(item.listenerCount(), 0);
        draggable.enabled = true; draggable.enabled = true; assert.equal(item.listenerCount(), 4);
        drop(item, f.targets[0].worldPosition); assert.equal(f.label.string, '已完成 1 / 3');
    });
    test('onDestroy explicitly unsubscribes all four handlers; destroyed component cannot count', () => {
        const f = fixture(), item = f.items[0], draggable = item.getComponent(DraggableItem);
        draggable.onDestroy(); assert.equal(item.listenerCount(), 0); drop(item, f.targets[0].worldPosition); assert.equal(f.label.string, initial);
        const g = fixture(), other = g.items[0]; other.getComponent(DraggableItem).destroy();
        assert.equal(other.listenerCount(), 0); drop(other, g.targets[0].worldPosition); assert.equal(g.label.string, initial);
    });
    test('missing target/controller bindings refuse drag without crashing or counting', () => {
        const f = fixture(), item = f.items[0], draggable = item.getComponent(DraggableItem), before = item.position.clone();
        const warningsBefore = mock.warnings.length; draggable.target = null;
        drop(item, f.targets[0].worldPosition); close(item.position, before); assert.equal(f.label.string, initial);
        assert.equal(mock.warnings.length, warningsBefore + 1);
    });
    return groups;
}

function runDay2Tests(runtime) {
    const { mock, GameController, DraggableItem, Day1Prototype, LevelManager, GameState, RunController, LEVEL_CATALOG } = runtime;
    const { Node, UITransform, Label, Canvas, Button, EventTouch, Vec3 } = mock.cc;
    let groups = 0;
    function test(name, action) { action(); groups += 1; console.log(`PASS Day 2: ${name}`); }
    function close(actual, expected, message = 'position') {
        for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs(actual[axis] - expected[axis]) < 1e-7, `${message}.${axis}: ${actual[axis]} != ${expected[axis]}`);
    }
    function position(value) { return new Vec3(value.x, value.y, 0); }
    function emit(node, type, point, id = 1) { const event = new EventTouch(id, point); node.emit(Node.EventType[type], event); return event; }
    function drop(item, world, id = 1) { emit(item, 'TOUCH_START', item.worldPosition, id); return emit(item, 'TOUCH_END', world, id); }
    function latestTween(node) { const result = mock.tweens.filter((entry) => entry.target === node).at(-1); assert.ok(result, `No tween for ${node.name}`); return result; }
    function toSteps(entry) { return entry.steps.filter((step) => step.properties); }
    function durationWithin(step, min, max) { assert.ok(step.duration >= min && step.duration <= max, `Duration ${step.duration} outside [${min}, ${max}]`); }
    function addNode(name, parent) { const node = new Node(name); node.addComponent(UITransform); node.parent = parent; return node; }
    function addLabel(name, parent) { return addNode(name, parent).addComponent(Label); }
    // Mimics Inspector bindings on stable scene nodes. No Day 2 gameplay exists in this fixture.
    function fixture(withDay1Bootstrap = false) {
        const canvas = addNode('Canvas', null); canvas.addComponent(Canvas);
        const header = addNode('Header', canvas), playArea = addNode('PlayArea', canvas);
        const levelLabel = addLabel('LevelLabel', header), levelTitleLabel = addLabel('LevelTitleLabel', header);
        const statusLabel = addLabel('StatusLabel', header);
        const controller = canvas.addComponent(GameController); controller.statusLabel = statusLabel;
        const stats = addNode('Stats', header), timeLabel = addLabel('TimeLabel', stats), mistakeLabel = addLabel('MistakeLabel', stats);
        const runController = canvas.addComponent(RunController); Object.assign(runController, { timeLabel, mistakeLabel });
        const targets = [0, 1, 2].map((index) => addNode(`Target${index + 1}`, playArea));
        const targetLabels = targets.map((node) => addLabel('TargetLabel', node));
        const itemNodes = [0, 1, 2].map((index) => addNode(`Item${index + 1}`, playArea));
        const itemLabels = itemNodes.map((node) => addLabel('ItemLabel', node));
        const items = itemNodes.map((node) => node.addComponent(DraggableItem));
        const completePanel = addNode('CompletePanel', canvas);
        const completeLabel = addLabel('CompleteLabel', completePanel), completeDetailLabel = addLabel('CompleteDetailLabel', completePanel);
        const buttonNode = addNode('NextButton', completePanel), nextButton = buttonNode.addComponent(Button);
        const actionButtonLabel = addLabel('ButtonLabel', buttonNode);
        const tutorialHint = addNode('TutorialHint', canvas); addLabel('TutorialLabel', tutorialHint).string = '拖动物品到对应区域';
        if (withDay1Bootstrap) canvas.addComponent(Day1Prototype);
        const manager = canvas.addComponent(LevelManager);
        Object.assign(manager, { gameController: controller, levelLabel, levelTitleLabel, completePanel, completeLabel,
            completeDetailLabel, nextButton, items, itemLabels, targets, targetLabels, runController, actionButtonLabel, tutorialHint });
        mock.boot(canvas);
        return { canvas, playArea, controller, manager, statusLabel, levelLabel, levelTitleLabel,
            itemNodes, items, itemLabels, targets, targetLabels, completePanel, completeLabel, completeDetailLabel, nextButton,
            runController, timeLabel, mistakeLabel, actionButtonLabel, tutorialHint };
    }
    function assertLevel(f, index) {
        const definition = LEVEL_CATALOG[index];
        assert.equal(f.manager.currentLevelIndex, index); assert.equal(f.manager.state, GameState.Playing);
        assert.equal(f.levelLabel.string, `订单 ${index + 1} / 3`); assert.equal(f.levelTitleLabel.string, definition.title);
        assert.equal(f.statusLabel.string, definition.instruction); assert.equal(f.controller.completedItems, 0);
        assert.equal(f.controller.isLevelComplete, false); assert.equal(f.completePanel.active, false);
        definition.items.forEach((item, itemIndex) => {
            assert.equal(f.itemLabels[itemIndex].string, item.label); assert.equal(f.targetLabels[itemIndex].string, item.targetLabel);
            close(f.itemNodes[itemIndex].position, position(item.startPosition), 'configured start');
            close(f.targets[itemIndex].position, position(item.targetPosition), 'configured target');
            assert.equal(f.items[itemIndex].target, f.targets[itemIndex]);
            assert.equal(f.items[itemIndex].gameController, f.controller);
            assert.equal(f.items[itemIndex].snapDistance, definition.snapDistance);
            assert.equal(f.items[itemIndex].isPlaced, false); assert.equal(f.items[itemIndex].isAnimating, false);
            close(f.itemNodes[itemIndex].scale, new Vec3(1, 1, 1), 'restored scale');
        });
    }
    function finishLevel(f) {
        f.itemNodes.forEach((node, index) => { drop(node, f.targets[index].worldPosition); mock.flush(node); });
        assert.equal(f.controller.completedItems, 3); assert.equal(f.controller.isLevelComplete, true);
        assert.equal(f.statusLabel.string, '订单完成！'); assert.equal(f.completePanel.active, true);
    }
    function clickNext(f) { f.nextButton.node.emit(Button.EventType.CLICK, f.nextButton); }

    test('typed catalog contains the exact three orders, labels and decreasing snap radius', () => {
        assert.equal(LEVEL_CATALOG.length, 3);
        const expected = [
            ['桌面整理', '把设备拖到对应区域', ['鼠标', '键盘', '耳机'], ['鼠标区域', '键盘区域', '耳机区域']],
            ['线缆急救', '将线缆接回正确接口', ['电源线', '网线', 'USB 线'], ['电源接口', '网络接口', 'USB 接口']],
            ['维修订单', '把设备放回正确维修位', ['路由器', '手柄', '音箱'], ['路由器维修位', '手柄维修位', '音箱维修位']],
        ];
        LEVEL_CATALOG.forEach((level, index) => {
            assert.equal(level.id, index + 1); assert.equal(level.title, expected[index][0]); assert.equal(level.instruction, expected[index][1]);
            assert.equal(level.items.length, 3);
            assert.deepEqual(level.items.map((item) => item.label), expected[index][2]);
            assert.deepEqual(level.items.map((item) => item.targetLabel), expected[index][3]);
            assert.equal(new Set(level.items.map((item) => item.id)).size, 3);
            level.items.forEach((item) => {
                for (const value of [item.startPosition, item.targetPosition]) assert.ok(Number.isFinite(value.x) && Number.isFinite(value.y));
            });
        });
        assert.ok(LEVEL_CATALOG[0].snapDistance > LEVEL_CATALOG[1].snapDistance);
        assert.equal(LEVEL_CATALOG[1].snapDistance, LEVEL_CATALOG[2].snapDistance);
    });
    test('beginLevel resets count and status, then notifies completion only once per level', () => {
        const node = addNode('Controller', null), controller = node.addComponent(GameController);
        controller.statusLabel = addLabel('StatusLabel', node); mock.boot(node);
        let completions = 0; controller.onLevelComplete = () => { completions += 1; };
        controller.beginLevel(3, 'First instruction', 'First done');
        for (let index = 0; index < 6; index += 1) controller.onItemPlaced();
        assert.equal(controller.completedItems, 3); assert.equal(completions, 1); assert.equal(controller.statusLabel.string, 'First done');
        controller.beginLevel(2, 'Second instruction', 'Second done');
        assert.equal(controller.completedItems, 0); assert.equal(controller.totalItems, 2); assert.equal(controller.isLevelComplete, false);
        assert.equal(controller.statusLabel.string, 'Second instruction');
        controller.onItemPlaced(); assert.equal(controller.completedItems, 1); assert.equal(completions, 1);
        controller.onItemPlaced(); assert.equal(completions, 2); assert.equal(controller.statusLabel.string, 'Second done');
        controller.beginLevel(3); assert.equal(controller.statusLabel.string, '把设备拖到对应区域');
    });
    test('stable Inspector-bound scene loads every configured position, label and reference', () => {
        const f = fixture(); assertLevel(f, 0);
        f.manager.loadLevel(1); assertLevel(f, 1);
        f.manager.loadLevel(2); assertLevel(f, 2);
    });
    test('all three levels complete through item events and Next button without replacing nodes', () => {
        const f = fixture(), identities = [...f.playArea.children];
        for (let index = 0; index < 3; index += 1) {
            assertLevel(f, index); finishLevel(f);
            assert.deepEqual(f.playArea.children, identities);
            if (index < 2) {
                assert.equal(f.manager.state, GameState.LevelComplete); assert.equal(f.completeLabel.string, '订单完成');
                assert.equal(f.nextButton.node.active, true); clickNext(f);
            } else {
                assert.equal(f.manager.state, GameState.DemoComplete);
                assert.equal(f.completeLabel.string, '本轮维修完成');
                assert.equal(f.completeDetailLabel.string, '完成订单：3 / 3\n总用时：0.0 秒\n总失误：0 次\n总评价：9 / 9 星\n总得分：3000');
                assert.equal(f.nextButton.node.active, true); assert.equal(f.nextButton.interactable, true);
                assert.equal(f.actionButtonLabel.string, '重新挑战'); f.manager.nextLevel();
                assert.equal(f.manager.currentLevelIndex, 2); assert.equal(f.manager.state, GameState.DemoComplete);
                clickNext(f); assertLevel(f, 0);
            }
        }
    });
    test('each new snap radius applies at its exact boundary; wrong target never counts', () => {
        const f = fixture();
        for (let index = 0; index < 3; index += 1) {
            f.manager.loadLevel(index); const radius = LEVEL_CATALOG[index].snapDistance;
            const item = f.itemNodes[0], target = f.targets[0], origin = item.position.clone();
            drop(item, f.targets[1].worldPosition); mock.flush(item); close(item.position, origin); assert.equal(f.controller.completedItems, 0);
            drop(item, new Vec3(target.worldPosition.x + radius + 0.0001, target.worldPosition.y)); mock.flush(item);
            close(item.position, origin); assert.equal(f.controller.completedItems, 0);
            drop(item, new Vec3(target.worldPosition.x + radius, target.worldPosition.y)); mock.flush(item);
            close(item.position, target.position); assert.equal(f.controller.completedItems, 1);
            drop(item, target.worldPosition); mock.flush(item); assert.equal(f.controller.completedItems, 1);
        }
    });
    test('pickup requests a small 0.08–0.12 second scale tween and permits movement', () => {
        const f = fixture(), node = f.itemNodes[0];
        emit(node, 'TOUCH_START', node.worldPosition);
        const pickup = latestTween(node), step = toSteps(pickup)[0]; durationWithin(step, 0.08, 0.12);
        close(step.properties.scale, new Vec3(1.06, 1.06, 1.06), 'pickup endpoint');
        emit(node, 'TOUCH_MOVE', new Vec3(20, -40)); close(node.position, new Vec3(20, -40));
        mock.flush(node); close(node.scale, new Vec3(1.06, 1.06, 1.06));
        emit(node, 'TOUCH_CANCEL', node.worldPosition); mock.flush(node); assert.equal(f.controller.completedItems, 0);
        close(node.scale, new Vec3(1, 1, 1));
    });
    test('snap delays lock/count until tween completion and blocks repeated input during settlement', () => {
        const f = fixture(), node = f.itemNodes[0], item = f.items[0], target = f.targets[0];
        drop(node, new Vec3(target.worldPosition.x + 20, target.worldPosition.y));
        const snap = latestTween(node), step = toSteps(snap)[0]; durationWithin(step, 0.12, 0.18);
        close(step.properties.position, target.position, 'snap endpoint'); close(step.properties.scale, new Vec3(1, 1, 1));
        assert.equal(f.controller.completedItems, 0); assert.equal(item.isPlaced, false); assert.equal(item.isAnimating, true);
        const during = node.position.clone(), tweenCount = mock.tweens.length;
        emit(node, 'TOUCH_END', target.worldPosition); drop(node, new Vec3(300, -300));
        close(node.position, during); assert.equal(mock.tweens.length, tweenCount); assert.equal(f.controller.completedItems, 0);
        snap.flush(); close(node.position, target.position); assert.equal(item.isPlaced, true); assert.equal(item.isAnimating, false);
        assert.equal(f.controller.completedItems, 1);
        drop(node, new Vec3(300, -300)); close(node.position, target.position); assert.equal(f.controller.completedItems, 1);
    });
    test('wrong return requests 0.15–0.22 seconds, rejects rapid reclicks, then becomes draggable', () => {
        const f = fixture(), node = f.itemNodes[0], origin = node.position.clone();
        drop(node, new Vec3(50, -50)); const bounce = latestTween(node), step = toSteps(bounce)[0];
        durationWithin(step, 0.15, 0.22); close(step.properties.position, origin, 'return endpoint');
        assert.notDeepEqual(node.position, origin); assert.equal(f.items[0].isAnimating, true); assert.equal(f.controller.completedItems, 0);
        const during = node.position.clone(), tweenCount = mock.tweens.length;
        drop(node, f.targets[0].worldPosition); close(node.position, during); assert.equal(mock.tweens.length, tweenCount);
        bounce.flush(); close(node.position, origin); close(node.scale, new Vec3(1, 1, 1));
        assert.equal(f.items[0].isAnimating, false); assert.equal(f.items[0].isPlaced, false);
        drop(node, f.targets[0].worldPosition); mock.flush(node); assert.equal(f.controller.completedItems, 1);
    });
    test('configure stops pickup, snap and return; obsolete callbacks cannot mutate the new level', () => {
        for (const stage of ['pickup', 'snap', 'return']) {
            const f = fixture(), node = f.itemNodes[0];
            emit(node, 'TOUCH_START', node.worldPosition);
            if (stage === 'snap') emit(node, 'TOUCH_END', f.targets[0].worldPosition);
            if (stage === 'return') emit(node, 'TOUCH_END', new Vec3(50, -50));
            const old = latestTween(node); f.manager.loadLevel(1); assertLevel(f, 1);
            assert.equal(old.stopped, true); old.flush(); old.callCallbacks(); assertLevel(f, 1);
            drop(node, new Vec3(50, -50)); mock.flush(node);
            close(node.position, position(LEVEL_CATALOG[1].items[0].startPosition), 'new return origin');
            drop(node, f.targets[0].worldPosition); mock.flush(node); assert.equal(f.controller.completedItems, 1);
        }
    });
    test('direct configure independently replaces target/origin/radius and invalidates all owned callbacks', () => {
        for (const stage of ['pickup', 'snap', 'return']) {
            const f = fixture(), node = f.itemNodes[0], item = f.items[0];
            emit(node, 'TOUCH_START', node.worldPosition);
            if (stage === 'snap') emit(node, 'TOUCH_END', f.targets[0].worldPosition);
            if (stage === 'return') emit(node, 'TOUCH_END', new Vec3(50, -50));
            const old = latestTween(node), origin = new Vec3(-170, -310), target = addNode('ReplacementTarget', f.playArea);
            target.setPosition(170, 310); node.setPosition(origin); item.configure(target, f.controller, 37);
            assert.equal(old.stopped, true); assert.equal(item.isPlaced, false); assert.equal(item.isAnimating, false);
            assert.equal(item.target, target); assert.equal(item.snapDistance, 37); close(node.position, origin); close(node.scale, new Vec3(1, 1, 1));
            old.flush(); old.callCallbacks(); close(node.position, origin); assert.equal(f.controller.completedItems, 0);
            // The touch from the previous configuration no longer owns input.
            emit(node, 'TOUCH_END', target.worldPosition); assert.equal(f.controller.completedItems, 0);
            drop(node, new Vec3(target.worldPosition.x + 37.0001, target.worldPosition.y)); mock.flush(node);
            close(node.position, origin); assert.equal(f.controller.completedItems, 0);
            drop(node, new Vec3(target.worldPosition.x + 37, target.worldPosition.y)); mock.flush(node);
            close(node.position, target.position); assert.equal(item.isPlaced, true); assert.equal(f.controller.completedItems, 1);
            node.setPosition(origin); item.configure(f.targets[0], f.controller, 96);
            assert.equal(item.isPlaced, false); assert.equal(item.target, f.targets[0]); close(node.position, origin);
        }
    });
    test('animated snap keeps grab offset, transformed target coordinates and nonuniform baseline scale', () => {
        const stage = addNode('Stage', null); stage.setPosition(110, -30); stage.angle = 11; stage.setScale(1.1, 0.9, 1);
        const itemParent = addNode('ItemParent', stage); itemParent.setPosition(60, -70); itemParent.angle = 31; itemParent.setScale(1.6, 0.5, 1);
        const targetParent = addNode('TargetParent', stage); targetParent.setPosition(-150, 240); targetParent.angle = -35; targetParent.setScale(0.5, 2.2, 1);
        const controller = stage.addComponent(GameController); controller.statusLabel = addLabel('StatusLabel', stage);
        const target = addNode('Target', targetParent); target.setPosition(110, 70);
        const node = addNode('Item', itemParent); node.setPosition(-80, -90, 3); node.setScale(0.8, 1.3, 1);
        const item = node.addComponent(DraggableItem); item.configure(target, controller, 72); mock.boot(stage);
        const baseline = node.scale.clone(), before = node.position.clone(), offset = new Vec3(17, -9);
        const toWorld = (value) => mock.transform(itemParent.worldMatrix, value);
        emit(node, 'TOUCH_START', toWorld(new Vec3(before.x + offset.x, before.y + offset.y))); mock.flush(node);
        close(node.position, before, 'pickup origin');
        close(node.scale, new Vec3(baseline.x * 1.06, baseline.y * 1.06, baseline.z * 1.06));
        const targetLocal = itemParent.getComponent(UITransform).convertToNodeSpaceAR(target.worldPosition);
        const desired = new Vec3(targetLocal.x + 30, targetLocal.y + 20, 3);
        const pointer = toWorld(new Vec3(desired.x + offset.x, desired.y + offset.y));
        emit(node, 'TOUCH_MOVE', pointer); close(node.position, desired, 'animated grab offset'); emit(node, 'TOUCH_END', pointer);
        const snap = latestTween(node), step = toSteps(snap)[0];
        close(step.properties.position, targetLocal, 'converted tween destination'); close(step.properties.scale, baseline, 'normal tween scale');
        snap.flush(); close(node.position, targetLocal); close(node.worldPosition, target.worldPosition); close(node.scale, baseline);
        assert.equal(controller.completedItems, 1); assert.equal(item.isPlaced, true);
    });
    test('disable/destroy stop owned animations, unsubscribe input and reject stale completion', () => {
        for (const stage of ['pickup', 'snap', 'return']) {
            for (const destroy of [false, true]) {
                const f = fixture(), node = f.itemNodes[0], item = f.items[0], origin = node.position.clone();
                emit(node, 'TOUCH_START', node.worldPosition);
                if (stage === 'snap') emit(node, 'TOUCH_END', f.targets[0].worldPosition);
                if (stage === 'return') emit(node, 'TOUCH_END', new Vec3(50, -50));
                const old = latestTween(node);
                if (destroy) item.destroy(); else item.enabled = false;
                assert.equal(old.stopped, true); assert.equal(node.listenerCount(), 0); assert.equal(f.controller.completedItems, 0);
                old.flush(); old.callCallbacks(); assert.equal(f.controller.completedItems, 0);
                close(node.position, origin); close(node.scale, new Vec3(1, 1, 1));
                if (!destroy) { item.enabled = true; assert.equal(node.listenerCount(), 4); drop(node, f.targets[0].worldPosition); mock.flush(node); assert.equal(f.controller.completedItems, 1); }
            }
        }
    });
    test('completion panel plays the three-scale feedback and blocks all item input', () => {
        const f = fixture();
        // Simulate controller completion while an unplaced item remains, to test the manager gate itself.
        for (let index = 0; index < 3; index += 1) f.controller.onItemPlaced();
        assert.equal(f.manager.state, GameState.LevelComplete); assert.equal(f.completePanel.active, true);
        close(f.completePanel.scale, new Vec3(0.8, 0.8, 1));
        const panelTween = latestTween(f.completePanel), steps = toSteps(panelTween);
        assert.equal(steps.length, 2); close(steps[0].properties.scale, new Vec3(1.08, 1.08, 1)); close(steps[1].properties.scale, new Vec3(1, 1, 1));
        f.itemNodes.forEach((node, index) => {
            const before = node.position.clone(); drop(node, f.targets[index].worldPosition); mock.flush(node); close(node.position, before);
        });
        assert.equal(f.controller.completedItems, 3); panelTween.flush(); close(f.completePanel.scale, new Vec3(1, 1, 1));
    });
    test('restart resets a completed level and cancels the old panel animation', () => {
        const f = fixture(); finishLevel(f); const old = latestTween(f.completePanel);
        f.manager.restartCurrentLevel(); assertLevel(f, 0); assert.equal(old.stopped, true);
        old.flush(); old.callCallbacks(); assertLevel(f, 0); finishLevel(f);
        assert.equal(f.manager.state, GameState.LevelComplete);
    });
    test('premature Next, invalid indices and rapid duplicate Next never skip or exceed the catalog', () => {
        const f = fixture(); clickNext(f); f.manager.nextLevel(); assertLevel(f, 0);
        for (const invalid of [-1, 3, 1.5, NaN, Infinity]) { f.manager.loadLevel(invalid); assertLevel(f, 0); }
        finishLevel(f); clickNext(f); clickNext(f); f.manager.nextLevel(); assertLevel(f, 1);
    });
    test('Day1Prototype guard prevents a second UI when a formal LevelManager scene exists', () => {
        const f = fixture(true); assertLevel(f, 0);
        assert.deepEqual(f.playArea.children.map((node) => node.name), ['Target1', 'Target2', 'Target3', 'Item1', 'Item2', 'Item3']);
        assert.equal(f.canvas.children.filter((node) => node.name === 'PlayArea').length, 1);
        assert.equal(f.canvas.children.some((node) => node.name === 'GameController'), false);
    });
    test('LevelManager unregisters Next and completion callbacks across disable and destroy', () => {
        const f = fixture(); assert.equal(f.nextButton.node.listenerCount(), 1);
        f.manager.enabled = false; assert.equal(f.nextButton.node.listenerCount(), 0);
        f.manager.enabled = true; f.manager.enabled = true; assert.equal(f.nextButton.node.listenerCount(), 1);
        f.items.forEach((item) => assert.equal(item.enabled, true));
        drop(f.itemNodes[0], f.targets[0].worldPosition); mock.flush(f.itemNodes[0]); assert.equal(f.controller.completedItems, 1);
        f.manager.restartCurrentLevel();
        finishLevel(f); const old = latestTween(f.completePanel); f.manager.destroy();
        assert.equal(f.nextButton.node.listenerCount(), 0); assert.equal(old.stopped, true);
        clickNext(f); old.flush(); old.callCallbacks(); assert.equal(f.manager.currentLevelIndex, 0);
    });
    test('re-enabling a completed manager keeps input locked until Next or Restart', () => {
        const f = fixture(); finishLevel(f); f.manager.enabled = false; f.manager.enabled = true;
        f.items.forEach((item) => assert.equal(item.enabled, false));
        f.itemNodes.forEach((node, index) => { const before = node.position.clone(); drop(node, f.targets[index].worldPosition); close(node.position, before); });
        clickNext(f); assertLevel(f, 1); f.items.forEach((item) => assert.equal(item.enabled, true));
    });
    test('GameController never imports LevelManager, avoiding a decorator import cycle', () => {
        const source = fs.readFileSync(path.join(scriptDirectory, 'core', 'GameController.ts'), 'utf8');
        assert.doesNotMatch(source, /(?:from\s*|import\s*\()["'][^"']*LevelManager/);
    });
    return groups;
}

function runDay3Tests(runtime) {
    const { mock, GameController, DraggableItem, LevelManager, GameState, RunController, formatStars, LEVEL_CATALOG } = runtime;
    const { Node, UITransform, Label, Canvas, Button, EventTouch, Vec3 } = mock.cc;
    let groups = 0;
    function test(name, action) { action(); groups += 1; console.log(`PASS Day 3: ${name}`); }
    function close(actual, expected, message = 'position') {
        for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs(actual[axis] - expected[axis]) < 1e-7, `${message}.${axis}: ${actual[axis]} != ${expected[axis]}`);
    }
    function addNode(name, parent) { const node = new Node(name); node.addComponent(UITransform); node.parent = parent; return node; }
    function addLabel(name, parent) { return addNode(name, parent).addComponent(Label); }
    function emit(node, type, point, id = 1) { const event = new EventTouch(id, point); node.emit(Node.EventType[type], event); return event; }
    function drop(node, point, id = 1) { emit(node, 'TOUCH_START', node.worldPosition, id); emit(node, 'TOUCH_END', point, id); }
    function latestTween(node) { const result = mock.tweens.filter((entry) => entry.target === node).at(-1); assert.ok(result, `No tween for ${node.name}`); return result; }
    function click(f) { f.nextButton.node.emit(Button.EventType.CLICK, f.nextButton); }
    // Stable Inspector nodes and actual compiled components; all gameplay remains in project scripts.
    function fixture() {
        const canvas = addNode('Canvas', null); canvas.addComponent(Canvas);
        const header = addNode('Header', canvas), playArea = addNode('PlayArea', canvas);
        const levelLabel = addLabel('LevelLabel', header), levelTitleLabel = addLabel('LevelTitleLabel', header);
        const statusLabel = addLabel('StatusLabel', header), stats = addNode('Stats', header);
        const timeLabel = addLabel('TimeLabel', stats), mistakeLabel = addLabel('MistakeLabel', stats);
        const controller = canvas.addComponent(GameController); controller.statusLabel = statusLabel;
        const runController = canvas.addComponent(RunController); Object.assign(runController, { timeLabel, mistakeLabel });
        const targets = [0, 1, 2].map((index) => addNode(`Target${index + 1}`, playArea));
        const targetLabels = targets.map((node) => addLabel('TargetLabel', node));
        const itemNodes = [0, 1, 2].map((index) => addNode(`Item${index + 1}`, playArea));
        const itemLabels = itemNodes.map((node) => addLabel('ItemLabel', node));
        const items = itemNodes.map((node) => node.addComponent(DraggableItem));
        const tutorialHint = addNode('TutorialHint', canvas); addLabel('TutorialLabel', tutorialHint).string = '拖动物品到对应区域';
        const completePanel = addNode('CompletePanel', canvas);
        const completeLabel = addLabel('CompleteLabel', completePanel), completeDetailLabel = addLabel('CompleteDetailLabel', completePanel);
        const nextButton = addNode('NextButton', completePanel).addComponent(Button), actionButtonLabel = addLabel('Label', nextButton.node);
        const manager = canvas.addComponent(LevelManager);
        Object.assign(manager, { gameController: controller, runController, levelLabel, levelTitleLabel, completePanel, completeLabel,
            completeDetailLabel, nextButton, actionButtonLabel, tutorialHint, items, itemLabels, targets, targetLabels });
        mock.boot(canvas);
        return { canvas, playArea, controller, runController, manager, levelLabel, levelTitleLabel, statusLabel,
            timeLabel, mistakeLabel, targets, targetLabels, itemNodes, itemLabels, items, tutorialHint,
            completePanel, completeLabel, completeDetailLabel, nextButton, actionButtonLabel };
    }
    function runFixture() {
        const node = addNode('Run', null), run = node.addComponent(RunController);
        run.timeLabel = addLabel('TimeLabel', node); run.mistakeLabel = addLabel('MistakeLabel', node); mock.boot(node);
        run.startNewRun(); return run;
    }
    function resultAt(rule, seconds, mistakes = 0, levelId = 1) {
        const run = runFixture(); run.beginLevel(levelId, rule); run.advanceTime(seconds);
        for (let index = 0; index < mistakes; index += 1) run.recordMistake();
        const result = run.finishLevel(); assert.ok(result); return result;
    }
    function finish(f) {
        f.itemNodes.forEach((node, index) => { drop(node, f.targets[index].worldPosition); mock.flush(node); });
        assert.equal(f.controller.completedItems, 3); assert.equal(f.controller.isLevelComplete, true);
    }
    function wrong(f, index = 0) { drop(f.itemNodes[index], new Vec3(50, -50)); }
    function zeroSummary() { return { completedOrders: 0, totalElapsedMs: 0, totalMistakes: 0, totalScore: 0, earnedStars: 0, maxStars: 0 }; }
    function snapshot(f) {
        return { elapsedMs: f.runController.currentElapsedMs, mistakes: f.runController.currentMistakes,
            results: f.runController.levelResults, summary: f.runController.summary,
            completedItems: f.controller.completedItems, state: f.manager.state,
            placed: f.items.map((item) => item.isPlaced), positions: f.itemNodes.map((node) => node.position.clone()),
            scales: f.itemNodes.map((node) => node.scale.clone()) };
    }
    function assertFreshLevel(f, index) {
        const definition = LEVEL_CATALOG[index];
        assert.equal(f.manager.currentLevelIndex, index); assert.equal(f.manager.state, GameState.Playing);
        assert.equal(f.levelLabel.string, `订单 ${index + 1} / 3`); assert.equal(f.statusLabel.string, definition.instruction);
        assert.equal(f.runController.currentElapsedMs, 0); assert.equal(f.runController.currentMistakes, 0);
        assert.equal(f.runController.isLevelRunning, true); assert.equal(f.controller.completedItems, 0);
        assert.equal(f.timeLabel.string, '用时：0.0 秒'); assert.equal(f.mistakeLabel.string, '失误：0');
        assert.equal(f.completePanel.active, false); assert.equal(f.nextButton.node.active, false); assert.equal(f.nextButton.interactable, false);
        f.items.forEach((item, itemIndex) => {
            assert.equal(item.enabled, true); assert.equal(item.isPlaced, false); assert.equal(item.isAnimating, false);
            assert.equal(item.target, f.targets[itemIndex]); assert.equal(item.snapDistance, definition.snapDistance);
            close(f.itemNodes[itemIndex].position, new Vec3(definition.items[itemIndex].startPosition.x, definition.items[itemIndex].startPosition.y));
            close(f.itemNodes[itemIndex].scale, new Vec3(1, 1, 1));
        });
    }
    function attemptMutation(action) { try { action(); } catch (error) { assert.ok(error instanceof TypeError); } }

    test('Chinese catalog preserves every original id, position, radius and exact scoring threshold', () => {
        const expectedIds = [['mouse', 'keyboard', 'headset'], ['power', 'network', 'usb'], ['router', 'controller', 'speaker']];
        const starts = [[-220, 0, 220], [220, -220, 0], [0, 220, -220]], targets = [[-220, 0, 220], [-220, 0, 220], [220, -220, 0]];
        const rules = [[20, 40, 0, 2], [25, 45, 0, 2], [30, 50, 1, 3]];
        LEVEL_CATALOG.forEach((level, index) => {
            assert.equal(level.id, index + 1); assert.equal(level.snapDistance, [96, 64, 64][index]);
            assert.deepEqual(level.items.map((item) => item.id), expectedIds[index]);
            level.items.forEach((item, itemIndex) => {
                assert.deepEqual(item.startPosition, { x: starts[index][itemIndex], y: -300 });
                assert.deepEqual(item.targetPosition, { x: targets[index][itemIndex], y: 170 });
            });
            assert.deepEqual(level.scoreRule, { threeStarMaxTimeSeconds: rules[index][0], twoStarMaxTimeSeconds: rules[index][1],
                threeStarMaxMistakes: rules[index][2], twoStarMaxMistakes: rules[index][3] });
            assert.ok(level.scoreRule.threeStarMaxTimeSeconds <= level.scoreRule.twoStarMaxTimeSeconds);
            assert.ok(level.scoreRule.threeStarMaxMistakes <= level.scoreRule.twoStarMaxMistakes);
        });
        assertFreshLevel(fixture(), 0);
    });
    test('all three star rules include the exact three-star time and mistake boundaries', () => {
        LEVEL_CATALOG.forEach((level) => {
            const rule = level.scoreRule, result = resultAt(rule, rule.threeStarMaxTimeSeconds, rule.threeStarMaxMistakes, level.id);
            assert.equal(result.stars, 3); assert.equal(result.elapsedMs, rule.threeStarMaxTimeSeconds * 1000);
            assert.equal(result.mistakes, rule.threeStarMaxMistakes);
        });
        assert.equal(formatStars(3), '★★★'); assert.equal(formatStars(2), '★★☆'); assert.equal(formatStars(1), '★☆☆');
    });
    test('all two-star rules require both conditions and include both exact upper boundaries', () => {
        LEVEL_CATALOG.forEach((level) => {
            const rule = level.scoreRule;
            assert.equal(resultAt(rule, rule.threeStarMaxTimeSeconds + 0.001, rule.threeStarMaxMistakes).stars, 2);
            assert.equal(resultAt(rule, rule.threeStarMaxTimeSeconds, rule.threeStarMaxMistakes + 1).stars, 2);
            assert.equal(resultAt(rule, rule.twoStarMaxTimeSeconds, rule.twoStarMaxMistakes).stars, 2);
        });
    });
    test('exceeding either two-star boundary yields one star for every order', () => {
        LEVEL_CATALOG.forEach((level) => {
            const rule = level.scoreRule;
            assert.equal(resultAt(rule, rule.twoStarMaxTimeSeconds + 0.001, 0).stars, 1);
            assert.equal(resultAt(rule, 0, rule.twoStarMaxMistakes + 1).stars, 1);
        });
    });
    test('central score formula floors whole seconds, charges mistakes and clamps at 100', () => {
        const rule = LEVEL_CATALOG[0].scoreRule;
        for (const [seconds, mistakes, expected] of [[0.5, 0, 1000], [1.2, 0, 990], [10, 1, 800], [0.999, 0, 1000],
            [90, 0, 100], [0, 9, 100], [1000, 100, 100]]) {
            assert.equal(resultAt(rule, seconds, mistakes).score, expected, `${seconds} seconds, ${mistakes} mistakes`);
        }
    });
    test('component update advances deterministic milliseconds, formats one decimal and freezes after finish', () => {
        const run = runFixture(); run.advanceTime(4); run.recordMistake();
        assert.equal(run.currentElapsedMs, 0); assert.equal(run.currentMistakes, 0); assert.deepEqual(run.summary, zeroSummary());
        run.beginLevel(1, LEVEL_CATALOG[0].scoreRule); run.update(1.2); run.advanceTime(0.0345);
        assert.ok(Math.abs(run.currentElapsedMs - 1234.5) < 1e-7); assert.equal(run.timeLabel.string, '用时：1.2 秒');
        run.recordMistake(); assert.equal(run.mistakeLabel.string, '失误：1');
        const result = run.finishLevel(); assert.equal(result.elapsedMs, 1235); assert.equal(run.currentElapsedMs, 1235);
        run.advanceTime(99); run.update(99); run.recordMistake();
        assert.equal(run.currentElapsedMs, 1235); assert.equal(run.currentMistakes, 1); assert.equal(run.isLevelRunning, false);
    });
    test('pause blocks time and mistakes; resume continues only an unfinished active order', () => {
        const run = runFixture(); run.resume(); run.advanceTime(1); assert.equal(run.isLevelRunning, false);
        run.beginLevel(1, LEVEL_CATALOG[0].scoreRule); run.advanceTime(1.2); run.recordMistake(); run.pause();
        assert.equal(run.isLevelRunning, false); run.advanceTime(7); run.recordMistake();
        assert.equal(run.currentElapsedMs, 1200); assert.equal(run.currentMistakes, 1);
        run.resume(); assert.equal(run.isLevelRunning, true); run.advanceTime(0.3); run.recordMistake();
        assert.equal(run.currentElapsedMs, 1500); assert.equal(run.currentMistakes, 2);
        run.finishLevel(); run.resume(); run.advanceTime(1); run.recordMistake();
        assert.equal(run.isLevelRunning, false); assert.equal(run.currentElapsedMs, 1500); assert.equal(run.currentMistakes, 2);
        run.startNewRun(); run.resume(); run.advanceTime(1); assert.deepEqual(run.summary, zeroSummary()); assert.equal(run.currentElapsedMs, 0);
    });
    test('finishLevel is idempotent and external arrays, results, summaries and input rules cannot mutate run state', () => {
        const run = runFixture(), rule = { ...LEVEL_CATALOG[0].scoreRule };
        run.beginLevel(1, rule); rule.threeStarMaxTimeSeconds = 0;
        run.advanceTime(1.2); const result = run.finishLevel(), expected = { levelId: 1, elapsedMs: 1200, mistakes: 0, score: 990, stars: 3 };
        assert.deepEqual(result, expected); assert.equal(run.finishLevel(), null);
        const results = run.levelResults, summary = run.summary;
        attemptMutation(() => { results.push({ ...expected, levelId: 99 }); });
        attemptMutation(() => { results[0].score = -100; }); attemptMutation(() => { result.stars = 1; });
        attemptMutation(() => { summary.totalScore = -100; });
        assert.deepEqual(run.levelResults, [expected]); assert.deepEqual(run.summary,
            { completedOrders: 1, totalElapsedMs: 1200, totalMistakes: 0, totalScore: 990, earnedStars: 3, maxStars: 3 });
        run.beginLevel(2, LEVEL_CATALOG[1].scoreRule); run.advanceTime(1); run.finishLevel();
        assert.equal(results.length, 1); assert.equal(summary.completedOrders, 1); assert.equal(run.levelResults.length, 2);
    });
    test('discardLastResult only removes the matching tail and preserves earlier immutable history', () => {
        const run = runFixture(); assert.equal(run.discardLastResult(1), false);
        run.beginLevel(1, LEVEL_CATALOG[0].scoreRule); run.advanceTime(1); const first = run.finishLevel();
        run.beginLevel(2, LEVEL_CATALOG[1].scoreRule); run.advanceTime(2); run.recordMistake(); run.finishLevel();
        assert.equal(run.discardLastResult(1), false); assert.equal(run.discardLastResult(99), false); assert.equal(run.levelResults.length, 2);
        assert.equal(run.discardLastResult(2), true); assert.deepEqual(run.levelResults, [first]); assert.equal(run.discardLastResult(2), false);
        run.beginLevel(2, LEVEL_CATALOG[1].scoreRule); assert.equal(run.currentElapsedMs, 0); assert.equal(run.currentMistakes, 0);
        run.advanceTime(3); run.finishLevel(); assert.deepEqual(run.levelResults.map((result) => result.levelId), [1, 2]);
    });
    test('wrong animated release reports immediately once and bounce or duplicate release never repeats it', () => {
        const f = fixture(), node = f.itemNodes[0]; wrong(f); const bounce = latestTween(node);
        assert.equal(f.runController.currentMistakes, 1); assert.equal(f.mistakeLabel.string, '失误：1');
        assert.equal(f.items[0].isAnimating, true); assert.equal(f.controller.completedItems, 0);
        emit(node, 'TOUCH_END', new Vec3(50, -50)); emit(node, 'TOUCH_END', new Vec3(50, -50));
        assert.equal(f.runController.currentMistakes, 1); bounce.flush(); bounce.callCallbacks();
        assert.equal(f.runController.currentMistakes, 1); assert.equal(f.items[0].isPlaced, false);
        wrong(f); assert.equal(f.runController.currentMistakes, 2); mock.flush(node);
    });
    test('wrong release without animations records one mistake and restores position synchronously', () => {
        const f = fixture(), node = f.itemNodes[0], origin = node.position.clone(); f.items[0].animationsEnabled = false;
        wrong(f); assert.equal(f.runController.currentMistakes, 1); assert.equal(f.items[0].isAnimating, false); close(node.position, origin);
        emit(node, 'TOUCH_END', new Vec3(50, -50)); assert.equal(f.runController.currentMistakes, 1);
        drop(node, f.targets[0].worldPosition); assert.equal(f.runController.currentMistakes, 1); assert.equal(f.controller.completedItems, 1);
    });
    test('near-target and distant TOUCH_CANCEL restore origin with zero mistakes and no progress', () => {
        for (const near of [false, true]) {
            const f = fixture(), node = f.itemNodes[0], origin = node.position.clone();
            emit(node, 'TOUCH_START', node.worldPosition); emit(node, 'TOUCH_MOVE', near ? f.targets[0].worldPosition : new Vec3(50, -50));
            emit(node, 'TOUCH_CANCEL', node.worldPosition); mock.flush(node);
            assert.equal(f.runController.currentMistakes, 0); assert.equal(f.controller.completedItems, 0); close(node.position, origin);
            assert.equal(f.tutorialHint.active, true);
        }
    });
    test('foreign ids, invalid bindings, reparent, disable, destroy and configure cancellation never charge a mistake', () => {
        for (const reason of ['foreign', 'missing', 'invalidated', 'reparent', 'disable', 'destroy', 'configure']) {
            const f = fixture(), node = f.itemNodes[0], item = f.items[0];
            if (reason === 'missing') item.target = null;
            emit(node, 'TOUCH_START', node.worldPosition, 11);
            if (reason === 'foreign') {
                emit(node, 'TOUCH_END', new Vec3(50, -50), 12); assert.equal(f.runController.currentMistakes, 0);
                emit(node, 'TOUCH_CANCEL', node.worldPosition, 11);
            } else {
                if (reason === 'invalidated') item.target._valid = false;
                if (reason === 'reparent') node.parent = addNode('ReplacementParent', f.canvas);
                if (reason === 'disable') item.enabled = false;
                if (reason === 'destroy') item.destroy();
                if (reason === 'configure') item.configure(f.targets[0], f.controller, 96);
                emit(node, 'TOUCH_END', new Vec3(50, -50), 11);
            }
            mock.flush(node); assert.equal(f.runController.currentMistakes, 0, reason); assert.equal(f.controller.completedItems, 0, reason);
        }
    });
    test('GameController updates Chinese status before progress and progress before completion exactly once', () => {
        const node = addNode('Controller', null), controller = node.addComponent(GameController); controller.statusLabel = addLabel('StatusLabel', node); mock.boot(node);
        const events = []; let mistakes = 0; controller.beginLevel(3);
        controller.onProgressChanged = (completed, total) => events.push(['progress', completed, total, controller.statusLabel.string]);
        controller.onLevelComplete = () => events.push(['complete', controller.completedItems, controller.statusLabel.string]);
        controller.onMistake = () => { mistakes += 1; };
        controller.reportMistake(); assert.equal(mistakes, 1); assert.equal(controller.completedItems, 0);
        for (let index = 0; index < 6; index += 1) controller.onItemPlaced();
        assert.deepEqual(events, [['progress', 1, 3, '已完成 1 / 3'], ['progress', 2, 3, '已完成 2 / 3'],
            ['progress', 3, 3, '订单完成！'], ['complete', 3, '订单完成！']]);
    });
    test('successful snap finishes progress and stops time only after the last animation callback', () => {
        const f = fixture(); f.runController.advanceTime(1);
        for (let index = 0; index < 2; index += 1) {
            drop(f.itemNodes[index], f.targets[index].worldPosition); assert.equal(f.controller.completedItems, index);
            mock.flush(f.itemNodes[index]); assert.equal(f.controller.completedItems, index + 1);
        }
        drop(f.itemNodes[2], f.targets[2].worldPosition); assert.equal(f.controller.completedItems, 2);
        assert.equal(f.runController.levelResults.length, 0); assert.equal(f.runController.isLevelRunning, true);
        f.runController.advanceTime(0.2); mock.flush(f.itemNodes[2]);
        assert.equal(f.runController.currentMistakes, 0); assert.equal(f.runController.isLevelRunning, false);
        assert.equal(f.runController.levelResults[0].elapsedMs, 1200); f.runController.advanceTime(9);
        assert.equal(f.runController.currentElapsedMs, 1200); assert.equal(f.manager.state, GameState.LevelComplete);
    });
    test('repeated manager completion and finishLevel calls cannot duplicate a result or summary', () => {
        const f = fixture(), callback = f.controller.onLevelComplete; f.runController.advanceTime(2); finish(f);
        const expected = snapshot(f); callback(); callback(); f.controller.onItemPlaced(); assert.equal(f.runController.finishLevel(), null);
        assert.deepEqual(snapshot(f), expected); assert.equal(f.runController.levelResults.length, 1);
    });
    test('single-order result uses four exact lines; Next preserves history and resets all current HUD data', () => {
        const f = fixture(); f.runController.advanceTime(21.4); wrong(f); mock.flush(f.itemNodes[0]); finish(f);
        assert.equal(f.completeLabel.string, '订单完成');
        assert.equal(f.completeDetailLabel.string, '用时：21.4 秒\n失误：1 次\n评价：★★☆\n得分：690');
        assert.equal(f.actionButtonLabel.string, '下一张订单'); assert.equal(f.nextButton.node.active, true); assert.equal(f.nextButton.interactable, true);
        const first = f.runController.levelResults[0]; click(f); click(f); f.manager.nextLevel(); assertFreshLevel(f, 1);
        assert.deepEqual(f.runController.levelResults, [first]);
        assert.deepEqual(f.runController.summary, { completedOrders: 1, totalElapsedMs: 21400, totalMistakes: 1, totalScore: 690, earnedStars: 2, maxStars: 3 });
    });
    test('restart while Playing and after completion resets this order while preserving only earlier results', () => {
        const f = fixture(); f.runController.advanceTime(0.5); finish(f); const first = f.runController.levelResults[0]; click(f);
        f.runController.advanceTime(9); wrong(f); mock.flush(f.itemNodes[0]); drop(f.itemNodes[1], f.targets[1].worldPosition); mock.flush(f.itemNodes[1]);
        f.manager.restartCurrentLevel(); assertFreshLevel(f, 1); assert.deepEqual(f.runController.levelResults, [first]);
        f.runController.advanceTime(12); finish(f); assert.equal(f.runController.levelResults.length, 2);
        f.manager.restartCurrentLevel(); assertFreshLevel(f, 1); assert.deepEqual(f.runController.levelResults, [first]);
        f.runController.advanceTime(3); finish(f); assert.deepEqual(f.runController.levelResults.map((result) => result.levelId), [1, 2]);
        assert.equal(f.runController.levelResults[1].elapsedMs, 3000);
    });
    test('three finished orders produce the exact dynamic summary and five Chinese final-result lines', () => {
        const f = fixture(), steps = [[10, 1], [20, 0], [30, 1]];
        steps.forEach(([seconds, mistakes], index) => {
            f.runController.advanceTime(seconds); for (let mistake = 0; mistake < mistakes; mistake += 1) { wrong(f); mock.flush(f.itemNodes[0]); }
            finish(f); if (index < 2) click(f);
        });
        assert.deepEqual(f.runController.summary, { completedOrders: 3, totalElapsedMs: 60000, totalMistakes: 2, totalScore: 2200, earnedStars: 8, maxStars: 9 });
        assert.deepEqual(f.runController.levelResults.map((result) => [result.levelId, result.elapsedMs, result.mistakes, result.score, result.stars]),
            [[1, 10000, 1, 800, 2], [2, 20000, 0, 800, 3], [3, 30000, 1, 600, 3]]);
        assert.equal(f.manager.state, GameState.DemoComplete); assert.equal(f.completeLabel.string, '本轮维修完成');
        assert.equal(f.completeDetailLabel.string, '完成订单：3 / 3\n总用时：60.0 秒\n总失误：2 次\n总评价：8 / 9 星\n总得分：2200');
        assert.equal(f.actionButtonLabel.string, '重新挑战'); assert.equal(f.nextButton.node.active, true); assert.equal(f.nextButton.interactable, true);
        const expected = snapshot(f); f.manager.nextLevel(); assert.deepEqual(snapshot(f), expected);
    });
    test('replay clears the whole run, resets existing nodes and ignores a second rapid click', () => {
        const f = fixture(), identities = [...f.playArea.children]; f.manager.playAgain(); assertFreshLevel(f, 0);
        for (let index = 0; index < 3; index += 1) { f.runController.advanceTime(index + 1); finish(f); if (index < 2) click(f); }
        let resets = 0; const startNewRun = f.runController.startNewRun.bind(f.runController);
        f.runController.startNewRun = () => { resets += 1; startNewRun(); };
        click(f); assertFreshLevel(f, 0); assert.equal(resets, 1); assert.deepEqual(f.runController.levelResults, []);
        assert.deepEqual(f.runController.summary, zeroSummary()); assert.deepEqual(f.playArea.children, identities);
        f.runController.advanceTime(0.7); click(f); f.manager.playAgain(); assert.equal(resets, 1);
        assert.equal(f.runController.currentElapsedMs, 700); assert.equal(f.manager.currentLevelIndex, 0); assert.equal(f.tutorialHint.active, false);
    });
    test('first successful counted placement hides the session hint; wrong, cancel, pickup and pending snap do not', () => {
        const f = fixture(), node = f.itemNodes[0]; assert.equal(f.tutorialHint.active, true);
        wrong(f); assert.equal(f.tutorialHint.active, true); mock.flush(node); assert.equal(f.tutorialHint.active, true);
        emit(node, 'TOUCH_START', node.worldPosition); emit(node, 'TOUCH_CANCEL', f.targets[0].worldPosition); assert.equal(f.tutorialHint.active, true);
        drop(node, f.targets[0].worldPosition); assert.equal(f.tutorialHint.active, true); assert.equal(f.controller.completedItems, 0);
        mock.flush(node); assert.equal(f.controller.completedItems, 1); assert.equal(f.tutorialHint.active, false);
        f.manager.restartCurrentLevel(); assert.equal(f.tutorialHint.active, false); finish(f); click(f); assert.equal(f.tutorialHint.active, false);
        finish(f); click(f); finish(f); click(f); assertFreshLevel(f, 0); assert.equal(f.tutorialHint.active, false);
        assert.equal(fixture().tutorialHint.active, true);
    });
    test('disabling a Playing manager pauses data and clears input, listeners and all owned callbacks', () => {
        const f = fixture(); f.runController.advanceTime(1); wrong(f); mock.flush(f.itemNodes[0]);
        const installed = [f.controller.onLevelComplete, f.controller.onMistake, f.controller.onProgressChanged];
        f.manager.enabled = false; assert.equal(f.nextButton.node.listenerCount(), 0); assert.equal(f.runController.isLevelRunning, false);
        assert.equal(f.controller.onLevelComplete, null); assert.equal(f.controller.onMistake, null); assert.equal(f.controller.onProgressChanged, null);
        f.items.forEach((item, index) => { assert.equal(item.enabled, false); assert.equal(f.itemNodes[index].listenerCount(), 0); });
        f.runController.advanceTime(20); f.runController.recordMistake(); assert.equal(f.runController.currentElapsedMs, 1000); assert.equal(f.runController.currentMistakes, 1);
        f.manager.enabled = true; f.manager.enabled = true; assert.equal(f.nextButton.node.listenerCount(), 1);
        assert.deepEqual([f.controller.onLevelComplete, f.controller.onMistake, f.controller.onProgressChanged], installed);
        f.items.forEach((item, index) => { assert.equal(item.enabled, true); assert.equal(f.itemNodes[index].listenerCount(), 4); });
        f.runController.advanceTime(0.3); wrong(f); assert.equal(f.runController.currentElapsedMs, 1300); assert.equal(f.runController.currentMistakes, 2);
    });
    test('completed and final managers never resume timer or item input on re-enable; destroy removes owned handlers', () => {
        for (const final of [false, true]) {
            const f = fixture(); finish(f);
            if (final) { click(f); finish(f); click(f); finish(f); }
            const expected = snapshot(f), old = latestTween(f.completePanel); f.manager.enabled = false; f.manager.enabled = true;
            assert.equal(f.nextButton.node.listenerCount(), 1); f.items.forEach((item) => assert.equal(item.enabled, false));
            f.runController.advanceTime(10); f.runController.recordMistake(); assert.deepEqual(snapshot(f), expected);
            assert.equal(f.controller.onLevelComplete, null); assert.equal(f.controller.onMistake, null); assert.equal(f.controller.onProgressChanged, null);
            f.manager.destroy(); assert.equal(f.nextButton.node.listenerCount(), 0); assert.equal(old.stopped, true);
            click(f); old.callCallbacks(); assert.deepEqual(snapshot(f), expected);
        }
    });
    test('stable callbacks survive level loads and cleanup preserves callbacks another owner installed later', () => {
        for (const destroy of [false, true]) {
            const f = fixture(), initial = [f.controller.onLevelComplete, f.controller.onMistake, f.controller.onProgressChanged];
            f.manager.loadLevel(1); assert.deepEqual([f.controller.onLevelComplete, f.controller.onMistake, f.controller.onProgressChanged], initial);
            const complete = () => {}, mistake = () => {}, progress = () => {};
            Object.assign(f.controller, { onLevelComplete: complete, onMistake: mistake, onProgressChanged: progress });
            if (destroy) f.manager.destroy(); else f.manager.enabled = false;
            assert.equal(f.controller.onLevelComplete, complete); assert.equal(f.controller.onMistake, mistake); assert.equal(f.controller.onProgressChanged, progress);
        }
    });
    test('restart from final state discards only the last order and recompletion produces no duplicate ids', () => {
        const f = fixture(); for (let index = 0; index < 3; index += 1) { f.runController.advanceTime(index + 1); finish(f); if (index < 2) click(f); }
        const firstTwo = f.runController.levelResults.slice(0, 2); f.manager.restartCurrentLevel(); assertFreshLevel(f, 2);
        assert.deepEqual(f.runController.levelResults, firstTwo); assert.equal(f.runController.summary.completedOrders, 2);
        f.runController.advanceTime(4); finish(f); assert.equal(f.manager.state, GameState.DemoComplete);
        assert.deepEqual(f.runController.levelResults.map((result) => result.levelId), [1, 2, 3]); assert.equal(f.runController.levelResults[2].elapsedMs, 4000);
    });
    test('stale pickup, snap, return and panel callbacks cannot change data or placement after restart, Next, replay or configure', () => {
        for (const transition of ['restart', 'next', 'replay', 'configure']) {
            for (const stage of ['pickup', 'snap', 'return']) {
                const f = fixture();
                if (transition === 'replay') { finish(f); click(f); finish(f); click(f); }
                const node = f.itemNodes[0]; f.runController.advanceTime(0.5); emit(node, 'TOUCH_START', node.worldPosition);
                if (stage === 'snap') emit(node, 'TOUCH_END', f.targets[0].worldPosition);
                if (stage === 'return') emit(node, 'TOUCH_END', new Vec3(50, -50));
                const old = latestTween(node), stale = [old];
                if (transition === 'restart') f.manager.restartCurrentLevel();
                if (transition === 'configure') f.items[0].configure(f.targets[0], f.controller, LEVEL_CATALOG[0].snapDistance);
                if (transition === 'next' || transition === 'replay') {
                    for (let index = 0; index < 3; index += 1) f.controller.onItemPlaced();
                    stale.push(latestTween(f.completePanel));
                    if (transition === 'next') f.manager.nextLevel(); else f.manager.playAgain();
                }
                assert.equal(old.stopped, true, `${transition}/${stage}`); const expected = snapshot(f);
                stale.forEach((entry) => { entry.flush(); entry.callCallbacks(); }); emit(node, 'TOUCH_END', new Vec3(50, -50));
                assert.deepEqual(snapshot(f), expected, `${transition}/${stage}`);
            }
        }
    });
    test('a re-entrant mistake callback cannot reuse its consumed touch or bounce after a restart', () => {
        const f = fixture(), node = f.itemNodes[0], owned = f.controller.onMistake;
        f.controller.onMistake = () => { owned(); emit(node, 'TOUCH_END', new Vec3(50, -50)); f.manager.restartCurrentLevel(); };
        wrong(f); assertFreshLevel(f, 0); assert.equal(f.runController.currentMistakes, 0);
        mock.flush(node); assertFreshLevel(f, 0);
    });
    test('dependency direction and deterministic component clock remain explicit without a global state framework', () => {
        const controller = fs.readFileSync(path.join(scriptDirectory, 'core', 'GameController.ts'), 'utf8');
        assert.doesNotMatch(controller, /(?:from\s*|import\s*\()["'][^"']*(?:LevelManager|RunController)/);
        const scripts = sourceFiles(scriptDirectory).map((filename) => fs.readFileSync(filename, 'utf8')).join('\n');
        assert.doesNotMatch(scripts, /\b(?:Date\.now|performance\.now|setInterval|setTimeout)\s*\(/);
        assert.doesNotMatch(scripts, /\b(?:EventBus|globalThis|localStorage)\b/);
        const run = runFixture(); let delta = null; run.advanceTime = (value) => { delta = value; }; run.update(0.123);
        assert.equal(delta, 0.123);
    });
    return groups;
}

try {
    const { compiler: ts, location } = findTypeScript();
    console.log(`TypeScript ${ts.version}: ${location}`);
    if (!onlyNativeTypes) console.log('MOCKED HARNESS: no Cocos Preview, native engine build, rendering, or mini-game platform test is performed.');
    const config = nativeConfiguration(ts, onlyNativeTypes);
    const files = sourceFiles(scriptDirectory);
    const runtime = compileAndLoad(ts, files, config);
    if (runtime) {
        const day1 = runTests(runtime), day2 = runDay2Tests(runtime), day3 = runDay3Tests(runtime);
        const day4 = require('./verify-day4.cjs').runDay4Tests(runtime);
        const groups = day1 + day2 + day3 + day4;
        assert.equal(day1, 11, 'All original Day 1 groups must remain');
        assert.equal(day2, 19, 'All original Day 2 groups must remain');
        assert.equal(day3, 28, 'All 28 original Day 3 groups must remain');
        assert.ok(day4 >= 36, 'At least 36 new Day 4 groups are required');
        console.log(`\nDay 1: ${day1}; Day 2: ${day2}; Day 3: ${day3}; Day 4: ${day4}.`);
        console.log(`\n${groups} mock behavior groups passed against the actual compiled project scripts.`);
    }
    else console.log('Project type check uses real Cocos SDK declarations. This does not certify the SDK declarations themselves, start Preview, or build the game.');
} catch (error) {
    console.error(`FAIL ${error.stack || error.message}`);
    process.exitCode = 1;
}
