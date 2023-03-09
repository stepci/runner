import yaml from 'js-yaml';
import { runPhases } from 'phasic';
import fs from 'fs';
import { quantile, mean, min, max, median } from 'simple-statistics';
import { run } from './index.js';
import { checkResult } from './matcher.js';
function metricsResult(numbers) {
    return {
        min: min(numbers),
        max: max(numbers),
        avg: mean(numbers),
        med: median(numbers),
        p95: quantile(numbers, 0.95),
        p99: quantile(numbers, 0.99),
    };
}
export async function loadTestFromFile(path, options) {
    const testFile = await fs.promises.readFile(path);
    const config = yaml.load(testFile.toString());
    return loadTest(config, { ...options, path });
}
// Load-testing functionality
export async function loadTest(workflow, options) {
    if (!workflow.config?.loadTest?.phases)
        throw Error('No load test config detected');
    const start = new Date();
    const resultList = await runPhases(workflow.config?.loadTest?.phases, () => run(workflow, options));
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
    if (workflow.config?.loadTest?.check) {
        checks = {};
        if (workflow.config?.loadTest?.check.min) {
            checks.min = checkResult(responseTime.min, workflow.config?.loadTest?.check.min);
        }
        if (workflow.config?.loadTest?.check.max) {
            checks.max = checkResult(responseTime.max, workflow.config?.loadTest?.check.max);
        }
        if (workflow.config?.loadTest?.check.avg) {
            checks.avg = checkResult(responseTime.avg, workflow.config?.loadTest?.check.avg);
        }
        if (workflow.config?.loadTest?.check.med) {
            checks.med = checkResult(responseTime.med, workflow.config?.loadTest?.check.med);
        }
        if (workflow.config?.loadTest?.check.p95) {
            checks.p95 = checkResult(responseTime.p95, workflow.config?.loadTest?.check.p95);
        }
        if (workflow.config?.loadTest?.check.p99) {
            checks.p99 = checkResult(responseTime.p99, workflow.config?.loadTest?.check.p99);
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
    options?.ee?.emit('loadtest:result', result);
    return result;
}
