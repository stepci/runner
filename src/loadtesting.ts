import yaml from 'js-yaml'
import { runPhases, Phase } from 'phasic'
import fs from 'fs'
import { quantile, mean, min, max, median } from 'simple-statistics'
import { run, Workflow, WorkflowOptions, WorkflowResult } from './index'
import { Matcher, CheckResult, checkResult } from './matcher'

export type LoadTestResult = {
  workflow: Workflow,
  result: {
    stats: {
      tests: {
        failed: number
        passed: number
        total: number
      },
      steps: {
        failed: number
        passed: number
        skipped: number
        errored: number
        total: number
      }
    }
    bytesSent: number
    bytesReceived: number
    co2: number
    responseTime: LoadTestMetric
    iterations: number
    rps: number
    duration: number
    passed: boolean
    checks?: LoadTestChecksResult
  }
}

type LoadTestMetric = {
  min: number,
  max: number,
  avg: number,
  med: number,
  p95: number,
  p99: number
}

export type LoadTestCheck = {
  min?: number | Matcher[],
  max?: number | Matcher[],
  avg?: number | Matcher[],
  med?: number | Matcher[],
  p95?: number | Matcher[],
  p99?: number | Matcher[],
}

type LoadTestChecksResult = {
  min?: CheckResult,
  max?: CheckResult,
  avg?: CheckResult,
  med?: CheckResult,
  p95?: CheckResult,
  p99?: CheckResult,
}

function metricsResult (numbers: number[]): LoadTestMetric {
  return {
    min: min(numbers),
    max: max(numbers),
    avg: mean(numbers),
    med: median(numbers),
    p95: quantile(numbers, 0.95),
    p99: quantile(numbers, 0.99),
  }
}

export async function loadTestFromFile (path: string, options?: WorkflowOptions): Promise<LoadTestResult> {
  const testFile = await fs.promises.readFile(path)
  const config = yaml.load(testFile.toString()) as Workflow
  return loadTest(config, { ...options, path })
}

// Load-testing functionality
export async function loadTest (workflow: Workflow, options?: WorkflowOptions): Promise<LoadTestResult> {
  if (!workflow.config?.loadTest?.phases) throw Error('No load test config detected')

  const start = new Date()
  const resultList = await runPhases<WorkflowResult>(workflow.config?.loadTest?.phases as Phase[], () => run(workflow, options))
  const results = resultList.map(result => (result as PromiseFulfilledResult<WorkflowResult>).value.result)

  // Tests metrics
  const testsPassed = results.filter((r) => r.passed === true).length
  const testsFailed = results.filter((r) => r.passed === false).length

  // Steps metrics
  const steps = results.map(r => r.tests).map(test => test.map(test => test.steps)).flat(2)
  const stepsPassed = steps.filter(step => step.passed === true).length
  const stepsFailed = steps.filter(step => step.passed === false).length
  const stepsSkipped = steps.filter(step => step.skipped === true).length
  const stepsErrored = steps.filter(step => step.errored === true).length

  // Response metrics
  const responseTime = metricsResult(steps.map(step => step.responseTime))

  // Size Metrics
  const bytesSent = steps.map(step => step.bytesSent).reduce((a, b) => a + b)
  const bytesReceived = steps.map(step => step.bytesReceived).reduce((a, b) => a + b)
  const co2 = steps.map(step => step.co2).reduce((a, b) => a + b)

  // Checks
  let checks: LoadTestChecksResult | undefined
  if (workflow.config?.loadTest?.check) {
    checks = {}

    if (workflow.config?.loadTest?.check.min) {
      checks.min = checkResult(responseTime.min, workflow.config?.loadTest?.check.min)
    }

    if (workflow.config?.loadTest?.check.max) {
      checks.max = checkResult(responseTime.max, workflow.config?.loadTest?.check.max)
    }

    if (workflow.config?.loadTest?.check.avg) {
      checks.avg = checkResult(responseTime.avg, workflow.config?.loadTest?.check.avg)
    }

    if (workflow.config?.loadTest?.check.med) {
      checks.med = checkResult(responseTime.med, workflow.config?.loadTest?.check.med)
    }

    if (workflow.config?.loadTest?.check.p95) {
      checks.p95 = checkResult(responseTime.p95, workflow.config?.loadTest?.check.p95)
    }

    if (workflow.config?.loadTest?.check.p99) {
      checks.p99 = checkResult(responseTime.p99, workflow.config?.loadTest?.check.p99)
    }
  }

  const result: LoadTestResult = {
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
      bytesSent,
      bytesReceived,
      co2,
      rps: steps.length / ((Date.now() - start.valueOf()) / 1000),
      iterations: results.length,
      duration: Date.now() - start.valueOf(),
      checks,
      passed: checks ? Object.entries(checks).map(([i, check]) => check.passed).every(passed => passed) : true
    }
  }

  options?.ee?.emit('loadtest:result', result)
  return result
}
