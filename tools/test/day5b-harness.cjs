'use strict';

// Standalone developer entry for a new suite before its final npm dispatch is
// connected. It executes the existing harness prefix in memory unchanged. It
// never rewrites the old runner, its mock, a source file or a generated config.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function createRuntime() {
    const runner = path.resolve(__dirname, '../verify-day1.cjs');
    const source = fs.readFileSync(runner, 'utf8');
    const marker = '\ntry {\n    const { compiler: ts, location } = findTypeScript();';
    assert.equal(source.split(marker).length, 2, 'The actual original harness entry must be uniquely identified');
    const prefix = source.slice(0, source.indexOf(marker)).replace(/^#![^\r\n]*/, '');
    const exposed = { exports: {} };
    const body = `${prefix}\nmodule.exports.build = function() { const { compiler: ts } = findTypeScript(); return compileAndLoad(ts, sourceFiles(scriptDirectory), nativeConfiguration(ts, false)); };`;
    const wrapper = new vm.Script(`(function(require,module,exports,__filename,__dirname) {\n${body}\n})`, { filename: runner }).runInThisContext();
    wrapper(createRequire(runner), exposed, exposed.exports, runner, path.dirname(runner));
    return exposed.exports.build();
}

exports.createRuntime = createRuntime;
if (require.main === module) {
    const selection = process.argv[2] || 'all';
    const runtime = createRuntime();
    const choices = {
        catalog: () => require('./day5b-catalog.cjs').runCatalogTests(runtime),
        inputs: () => require('./day5b-inputs.cjs').runInputTests(runtime),
        integration: () => require('./day5b-integration.cjs').runIntegrationTests(runtime),
        all: () => require('../verify-day5b.cjs').runDay5BTests(runtime),
    };
    assert.ok(Object.hasOwn(choices, selection), 'Choose catalog, inputs, integration or all');
    const count = choices[selection]();
    console.log(`${count} Day 5B ${selection} groups passed against actual compiled scripts with the unmodified existing mock.`);
}
