"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTest = exports.loadTestFromFile = void 0;
const js_yaml_1 = __importDefault(require("js-yaml"));
const phasic_1 = require("phasic");
const fs_1 = __importDefault(require("fs"));
const simple_statistics_1 = require("simple-statistics");
const index_js_1 = require("./index.js");
const matcher_js_1 = require("./matcher.js");
function metricsResult(numbers) {
    return {
        min: (0, simple_statistics_1.min)(numbers),
        max: (0, simple_statistics_1.max)(numbers),
        avg: (0, simple_statistics_1.mean)(numbers),
        med: (0, simple_statistics_1.median)(numbers),
        p95: (0, simple_statistics_1.quantile)(numbers, 0.95),
        p99: (0, simple_statistics_1.quantile)(numbers, 0.99),
    };
}
function loadTestFromFile(path, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const testFile = yield fs_1.default.promises.readFile(path);
        const config = js_yaml_1.default.load(testFile.toString());
        return loadTest(config, Object.assign(Object.assign({}, options), { path }));
    });
}
exports.loadTestFromFile = loadTestFromFile;
// Load-testing functionality
function loadTest(workflow, options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6;
    return __awaiter(this, void 0, void 0, function* () {
        if (!((_b = (_a = workflow.config) === null || _a === void 0 ? void 0 : _a.loadTest) === null || _b === void 0 ? void 0 : _b.phases))
            throw Error('No load test config detected');
        const start = new Date();
        const resultList = yield (0, phasic_1.runPhases)((_d = (_c = workflow.config) === null || _c === void 0 ? void 0 : _c.loadTest) === null || _d === void 0 ? void 0 : _d.phases, () => (0, index_js_1.run)(workflow, options));
        const results = resultList.map(result => result.value.result);
        // Tests metrics
        const testsPassed = results.filter((r) => r.passed === true).length;
        const testsFailed = results.filter((r) => r.passed === false).length;
        // Steps metrics
        const steps = results.map(r => r.tests).map(test => test.map(test => test.steps)).flat(2);
        const stepsPassed = steps.filter(step => step.passed === true).length;
        const stepsFailed = steps.filter(step => step.passed === false).length;
        const stepsSkipped = steps.filter(step => step.skipped === true).length;
        const stepsErrored = steps.filter(step => step.errored === true).length;
        // Response metrics
        const responseTime = (metricsResult(steps.map(step => step.responseTime)));
        // Checks
        let checks;
        if ((_f = (_e = workflow.config) === null || _e === void 0 ? void 0 : _e.loadTest) === null || _f === void 0 ? void 0 : _f.check) {
            checks = {};
            if ((_h = (_g = workflow.config) === null || _g === void 0 ? void 0 : _g.loadTest) === null || _h === void 0 ? void 0 : _h.check.min) {
                checks.min = (0, matcher_js_1.checkResult)(responseTime.min, (_k = (_j = workflow.config) === null || _j === void 0 ? void 0 : _j.loadTest) === null || _k === void 0 ? void 0 : _k.check.min);
            }
            if ((_m = (_l = workflow.config) === null || _l === void 0 ? void 0 : _l.loadTest) === null || _m === void 0 ? void 0 : _m.check.max) {
                checks.max = (0, matcher_js_1.checkResult)(responseTime.max, (_p = (_o = workflow.config) === null || _o === void 0 ? void 0 : _o.loadTest) === null || _p === void 0 ? void 0 : _p.check.max);
            }
            if ((_r = (_q = workflow.config) === null || _q === void 0 ? void 0 : _q.loadTest) === null || _r === void 0 ? void 0 : _r.check.avg) {
                checks.avg = (0, matcher_js_1.checkResult)(responseTime.avg, (_t = (_s = workflow.config) === null || _s === void 0 ? void 0 : _s.loadTest) === null || _t === void 0 ? void 0 : _t.check.avg);
            }
            if ((_v = (_u = workflow.config) === null || _u === void 0 ? void 0 : _u.loadTest) === null || _v === void 0 ? void 0 : _v.check.med) {
                checks.med = (0, matcher_js_1.checkResult)(responseTime.med, (_x = (_w = workflow.config) === null || _w === void 0 ? void 0 : _w.loadTest) === null || _x === void 0 ? void 0 : _x.check.med);
            }
            if ((_z = (_y = workflow.config) === null || _y === void 0 ? void 0 : _y.loadTest) === null || _z === void 0 ? void 0 : _z.check.p95) {
                checks.p95 = (0, matcher_js_1.checkResult)(responseTime.p95, (_1 = (_0 = workflow.config) === null || _0 === void 0 ? void 0 : _0.loadTest) === null || _1 === void 0 ? void 0 : _1.check.p95);
            }
            if ((_3 = (_2 = workflow.config) === null || _2 === void 0 ? void 0 : _2.loadTest) === null || _3 === void 0 ? void 0 : _3.check.p99) {
                checks.p99 = (0, matcher_js_1.checkResult)(responseTime.p99, (_5 = (_4 = workflow.config) === null || _4 === void 0 ? void 0 : _4.loadTest) === null || _5 === void 0 ? void 0 : _5.check.p99);
            }
        }
        const result = {
            workflow,
            result: {
                stats: {
                    steps: {
                        failed: stepsFailed,
                        passed: stepsPassed,
                        skipped: stepsSkipped,
                        errored: stepsErrored,
                        total: steps.length
                    },
                    tests: {
                        failed: testsFailed,
                        passed: testsPassed,
                        total: results.length
                    },
                },
                responseTime,
                rps: steps.length / ((Date.now() - start.valueOf()) / 1000),
                iterations: results.length,
                duration: Date.now() - start.valueOf(),
                checks,
                passed: checks ? Object.entries(checks).map(([i, check]) => check.passed).every(passed => passed) : true
            }
        };
        (_6 = options === null || options === void 0 ? void 0 : options.ee) === null || _6 === void 0 ? void 0 : _6.emit('loadtest:result', result);
        return result;
    });
}
exports.loadTest = loadTest;
