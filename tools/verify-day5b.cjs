'use strict';

// Adds independent Day 5B assertions to the existing strict compiled-component
// harness. No historical suite or mock is replaced. This is finite logic/input
// verification, not Creator rendering, natural Preview or physical Touch.
exports.runDay5BTests = function runDay5BTests(runtime) {
    return require('./test/day5b-catalog.cjs').runCatalogTests(runtime)
        + require('./test/day5b-inputs.cjs').runInputTests(runtime)
        + require('./test/day5b-integration.cjs').runIntegrationTests(runtime)
        + require('./test/day5b-final-polish.cjs').runFinalPolishTests(runtime);
};
