'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

exports.runCatalogTests = function runCatalogTests(runtime) {
    const { load, mock, RunController } = runtime;
    const { ORDER_CATALOG } = load('data/OrderCatalog.ts');
    const { validatePlayableOrderCatalog: validateOrderCatalog } = load('data/Day5BOrderCatalog.ts');
    const { DAY5B_ORDERS, PLAYABLE_ORDER_CATALOG } = load('data/Day5BOrderCatalog.ts');
    let groups = 0;
    const test = (name, callback) => { callback(); groups += 1; console.log(`PASS Day 5B catalog: ${name}`); };
    const clone = value => JSON.parse(JSON.stringify(value));
    const advanced = PLAYABLE_ORDER_CATALOG.slice(9);

    test('public legacy catalog remains nine orders and thirteen steps while the playable catalog has fifteen and twenty-seven', () => {
        assert.equal(ORDER_CATALOG.length, 9);
        assert.equal(ORDER_CATALOG.flatMap(order => order.stages).length, 13);
        assert.equal(DAY5B_ORDERS.length, 6);
        assert.equal(PLAYABLE_ORDER_CATALOG.length, 15);
        assert.equal(PLAYABLE_ORDER_CATALOG.flatMap(order => order.stages).length, 27);
        assert.deepEqual(advanced.map(order => order.stages.length), [2, 3, 2, 2, 2, 3]);
    });
    test('all separate historical Day4 through V22 test suites retain the exact frozen alpha4 source hashes', () => {
        const root = path.resolve(__dirname, '../..');
        const baseline = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/day5b/baseline.json'), 'utf8'));
        const captured = new Map(baseline.files.map(file => [file.path, file]));
        for (const name of ['tools/verify-day4.cjs', 'tools/verify-day5a.cjs', 'tools/verify-day5a-v2.cjs',
            'tools/verify-day5a-v21-clean.cjs', 'tools/verify-v21-visuals.cjs', 'tools/verify-v22-clean.cjs', 'tools/verify-v22-readability.cjs']) {
            const expected = captured.get(name), actual = fs.readFileSync(path.join(root, name));
            assert.ok(expected, `Historical suite must exist in the actual Day5B baseline: ${name}`);
            assert.equal(actual.length, expected.bytes);
            assert.equal(crypto.createHash('sha256').update(actual).digest('hex'), expected.sha256);
        }
    });
    test('the playable prefix is the same frozen old orders rather than a rewritten migration', () => {
        ORDER_CATALOG.forEach((order, index) => assert.equal(PLAYABLE_ORDER_CATALOG[index], order));
        DAY5B_ORDERS.forEach((order, index) => assert.equal(PLAYABLE_ORDER_CATALOG[index + 9], order));
        assert.deepEqual(PLAYABLE_ORDER_CATALOG.slice(0, 9), ORDER_CATALOG);
    });
    test('six advanced orders retain the product identities, chapters, kind order and shared mechanism reuse', () => {
        assert.deepEqual(advanced.map(order => order.id), [10, 11, 12, 13, 14, 15]);
        assert.deepEqual(advanced.map(order => order.key), ['controller-drift', 'printer-paper-jam', 'keyboard-double-press', 'cooling-fan-noise', 'headphone-channel-balance', 'livestream-rescue']);
        assert.ok(advanced.every(order => order.chapterTitle === '进阶维修'));
        assert.deepEqual(advanced.map(order => order.stages.map(stage => stage.kind)), [
            ['rotary-control', 'sequence-test'], ['fault-spot', 'guided-trace', 'rotary-control'],
            ['fault-spot', 'sequence-test'], ['rotary-control', 'gauge-tune'],
            ['fault-spot', 'gauge-tune'], ['guided-trace', 'gauge-tune', 'sequence-test'],
        ]);
        const all = PLAYABLE_ORDER_CATALOG.flatMap(order => order.stages);
        assert.equal(new Set(all.map(stage => stage.kind)).size, 8);
        for (const kind of ['fault-spot', 'rotary-control', 'guided-trace', 'gauge-tune', 'sequence-test']) {
            assert.ok(advanced.filter(order => order.stages.some(stage => stage.kind === kind)).length >= 2, `${kind} must be reused across orders`);
        }
    });
    test('all new stage and order identity scopes are unique with nonempty actual instructions and clues', () => {
        assert.equal(new Set(PLAYABLE_ORDER_CATALOG.map(order => order.id)).size, 15);
        assert.equal(new Set(PLAYABLE_ORDER_CATALOG.map(order => order.key)).size, 15);
        for (const order of advanced) {
            assert.equal(new Set(order.stages.map(stage => stage.id)).size, order.stages.length);
            for (const stage of order.stages) {
                for (const key of ['id', 'title', 'instruction', 'tutorial']) assert.ok(typeof stage[key] === 'string' && stage[key].trim());
                if (stage.kind === 'fault-spot') assert.ok(stage.clueText.trim());
            }
        }
        assert.doesNotThrow(() => validateOrderCatalog(PLAYABLE_ORDER_CATALOG));
        assert.doesNotThrow(() => validateOrderCatalog(DAY5B_ORDERS));
    });
    test('all advanced data is deeply frozen and consumers cannot mutate nested points, choices or score rules', () => {
        function frozen(value) {
            if (!value || typeof value !== 'object') return;
            assert.equal(Object.isFrozen(value), true);
            Object.values(value).forEach(frozen);
        }
        frozen(PLAYABLE_ORDER_CATALOG);
        frozen(DAY5B_ORDERS);
        assert.throws(() => PLAYABLE_ORDER_CATALOG.push(ORDER_CATALOG[0]), TypeError);
        assert.throws(() => { advanced[0].scoreRule.threeStarMaxMistakes = 10; }, TypeError);
        assert.throws(() => { advanced[0].stages[0].title = 'forged'; }, TypeError);
    });
    test('new scoring thresholds preserve exact initial product values and use original RunController arithmetic', () => {
        assert.deepEqual(advanced.map(order => [order.scoreRule.threeStarMaxTimeSeconds, order.scoreRule.threeStarMaxMistakes,
            order.scoreRule.twoStarMaxTimeSeconds, order.scoreRule.twoStarMaxMistakes]),
        [[28, 0, 55, 2], [40, 0, 80, 2], [30, 0, 60, 2], [38, 0, 75, 2], [32, 0, 65, 2], [60, 1, 110, 4]]);
        for (const order of advanced) {
            const controller = new mock.cc.Node('Scoring').addComponent(RunController);
            controller.beginLevel(order.id, order.scoreRule);
            controller.advanceTime(order.scoreRule.threeStarMaxTimeSeconds);
            for (let i = 0; i < order.scoreRule.threeStarMaxMistakes; i += 1) controller.recordMistake();
            const result = controller.finishLevel();
            assert.equal(result.stars, 3);
            assert.equal(result.score, Math.max(100, 1000 - order.scoreRule.threeStarMaxTimeSeconds * 10 - order.scoreRule.threeStarMaxMistakes * 100));
            assert.equal(controller.finishLevel(), null);
        }
    });
    test('catalog validation neither mutates nor silently freezes caller data and rejects duplicate advanced identities', () => {
        const plain = clone(PLAYABLE_ORDER_CATALOG), before = JSON.stringify(plain);
        validateOrderCatalog(plain);
        assert.equal(JSON.stringify(plain), before);
        assert.equal(Object.isFrozen(plain), false);
        for (const change of [
            orders => { orders[10].id = orders[9].id; },
            orders => { orders[10].key = orders[9].key; },
            orders => { orders[10].stages[1].id = orders[10].stages[0].id; },
            orders => { orders[14].stages[0].kind = 'unknown'; },
            orders => { orders[14].stages[0].instruction = ''; },
            orders => { orders[14].scoreRule.twoStarMaxTimeSeconds = -1; },
        ]) {
            const invalid = clone(PLAYABLE_ORDER_CATALOG); change(invalid);
            assert.throws(() => validateOrderCatalog(invalid));
        }
    });
    const invalidStages = (kind, mutations, mode) => {
        const original = advanced.flatMap(order => order.stages).find(stage => stage.kind === kind && (mode === undefined || stage.mode === mode));
        assert.ok(original, `Missing actual ${kind}/${mode || ''} catalog fixture`);
        for (const [index, mutate] of mutations.entries()) {
            const stage = clone(original); mutate(stage);
            const order = clone(advanced[0]); order.stages = [stage];
            assert.throws(() => validateOrderCatalog([order]), `${kind}/${mode || ''} invalid mutation${index}`);
        }
    };
    test('fault configuration rejects absent answers, hidden clues, duplicate candidates and invalid bounded hotspots', () => {
        invalidStages('fault-spot', [
            stage => { stage.faultId = 'not-a-candidate'; }, stage => { stage.clueText = ''; },
            stage => { stage.hotspots = stage.hotspots.slice(0, 1); },
            stage => { stage.hotspots = Array.from({ length: 7 }, (_, i) => ({ ...stage.hotspots[0], id: `candidate${i}` })); },
            stage => { stage.hotspots[1].id = stage.hotspots[0].id; },
            stage => { stage.hotspots[0].position.x = Infinity; }, stage => { stage.hotspots[0].position.y = 401; },
            stage => { stage.hotspots[0].size.width = 0; }, stage => { stage.device = 'unknown-device'; },
        ]);
    });
    test('alignment configuration rejects unknown modes, nonfinite angles, invalid ring geometry and unsafe hold/tolerance', () => {
        invalidStages('rotary-control', [
            stage => { stage.mode = 'tap'; }, stage => { stage.initialAngle = NaN; },
            stage => { stage.targetAngle = Infinity; }, stage => { stage.toleranceDegrees = 0; },
            stage => { stage.toleranceDegrees = 31; }, stage => { stage.holdSeconds = 0; },
            stage => { stage.center.x = 361; }, stage => { stage.radius = -1; }, stage => { stage.ringWidth = 0; },
        ], 'align');
    });
    test('unscrew configuration rejects invalid counts, duplicated or overlapping screws, unreachable travel and directions', () => {
        invalidStages('rotary-control', [
            stage => { stage.screws = []; }, stage => { stage.screws = Array(4).fill(stage.screws[0]); },
            stage => { stage.screws[1].id = stage.screws[0].id; },
            stage => { stage.screws[1].position = { ...stage.screws[0].position }; },
            stage => { stage.requiredDegrees = 89; }, stage => { stage.requiredDegrees = 541; },
            stage => { stage.direction = 'both'; }, stage => { stage.screws[0].position.x = -361; },
        ], 'unscrew');
    });
    test('guided paths reject missing checkpoints, repeated points, off-stage routes and nonpositive sampling limits', () => {
        invalidStages('guided-trace', [
            stage => { stage.points.pop(); }, stage => { stage.points.push({ ...stage.points.at(-1) }); },
            stage => { stage.points[1] = { ...stage.points[0] }; }, stage => { stage.points[1].y = -401; },
            stage => { stage.tolerance = 0; }, stage => { stage.checkpointRadius = -1; },
            stage => { stage.maxSampleDistance = 0; }, stage => { stage.points[0].x = NaN; },
        ]);
    });
    test('gauge configurations reject invalid modes, out-of-range pairs and invalid hold time without silently accepting defaults', () => {
        invalidStages('gauge-tune', [
            stage => { stage.mode = 'unknown'; }, stage => { stage.initialControls = [0]; },
            stage => { stage.initialControls = [0, 0, 0]; }, stage => { stage.initialControls[0] = -1; },
            stage => { stage.initialControls[1] = 101; }, stage => { stage.initialControls[0] = Infinity; },
            stage => { stage.holdSeconds = 0; }, stage => { stage.holdSeconds = NaN; },
        ]);
    });
    test('sequence configuration rejects insufficient choices, duplicate IDs, unknown targets and invalid step lengths', () => {
        invalidStages('sequence-test', [
            stage => { stage.choices.pop(); }, stage => { stage.choices[1].id = stage.choices[0].id; },
            stage => { stage.sequence[0] = 'not-a-choice'; }, stage => { stage.sequence = stage.sequence.slice(0, 2); },
            stage => { stage.sequence = Array(6).fill(stage.sequence[0]); },
            stage => { stage.choices[0].label = ''; }, stage => { stage.choices[0].size.height = 0; },
        ]);
    });
    test('actual exported discriminated unions reject cross-kind/mode access, readonly mutation, empty required tuples and unknown kinds', () => {
        const root = path.resolve(__dirname, '../..');
        const known = JSON.parse(fs.readFileSync(path.join(root, 'docs/validation/day5a-plus/v21/final-offline.json'), 'utf8'));
        const compiler = require(process.env.TYPESCRIPT_PATH || known.typescriptPath);
        const filename = path.join(root, 'assets/scripts/data/__day5b_contract_probe__.ts');
        const source = [
            "import type { StageDefinition, StageKind, FaultSpotStageDefinition, RotaryControlStageDefinition, GuidedTraceStageDefinition, SequenceTestStageDefinition } from './Day5BStageDefinition';",
            'declare const stage: StageDefinition;',
            "if (stage.kind === 'fault-spot') { stage.faultId; stage.cables; }",
            "if (stage.kind === 'guided-trace') { stage.points; stage.hotspots; }",
            "if (stage.kind === 'gauge-tune') { stage.initialControls; stage.sequence; }",
            "if (stage.kind === 'sequence-test') { stage.sequence; stage.areas; }",
            'declare const rotary: RotaryControlStageDefinition;',
            "if (rotary.mode === 'align') { rotary.initialAngle; rotary.screws; }",
            "if (rotary.mode === 'unscrew') { rotary.screws; rotary.holdSeconds; }",
            "stage.title = 'external mutation';",
            'declare const fault: FaultSpotStageDefinition; fault.hotspots.push(fault.hotspots[0]);',
            'declare const trace: GuidedTraceStageDefinition; trace.points[0].x = 1;',
            'declare const sequence: SequenceTestStageDefinition; sequence.sequence.push(sequence.sequence[0]);',
            "const empty: FaultSpotStageDefinition['hotspots'] = []; void empty;",
            "const kind: StageKind = 'future-kind'; void kind;",
        ].join('\n');
        const options = { target: compiler.ScriptTarget.ES2020, module: compiler.ModuleKind.Node16, moduleResolution: compiler.ModuleResolutionKind.Node16, strict: true, noEmit: true, skipLibCheck: false };
        const host = compiler.createCompilerHost(options), original = host.getSourceFile.bind(host);
        host.getSourceFile = (name, version, onError, fresh) => path.resolve(name) === filename
            ? compiler.createSourceFile(name, source, version, true) : original(name, version, onError, fresh);
        const program = compiler.createProgram([filename], options, host), unit = program.getSourceFile(filename);
        assert.ok(unit, 'Virtual contract probe must compile against actual StageDefinition.ts');
        const diagnostics = compiler.getPreEmitDiagnostics(program);
        assert.ok(diagnostics.every(item => item.file === unit), 'No actual StageDefinition or library diagnostics are allowed');
        assert.deepEqual(diagnostics.map(item => item.code).sort(), [2322, 2322, 2339, 2339, 2339, 2339, 2339, 2339, 2339, 2339, 2540, 2540]);
        assert.equal(fs.existsSync(filename), false, 'Contract probe must remain in memory');
    });
    return groups;
};
