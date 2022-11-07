import { run, Workflow, WorkflowOptions, WorkflowResult } from './index'
import { runPhases, Phase } from 'phasic'
import { quantile, mean, min, max, median } from 'simple-statistics'

export type LoadTestResult = {
  workflow: Workflow,
  result: {
    tests: {
      passed: number,
      total: number
    },
    steps: {
      passed: number,
      total: number
    },
    total: LoadTestMetric,
    workflow: LoadTestMetric,
    iterations: number,
    rps: number,
    duration: number
  }
}

type LoadTestMetric = {
  avg: number,
  min: number,
  max: number,
  med: number,
  p95: number,
  p99: number
}

function metricsResult (numbers: number[]): LoadTestMetric {
  return {
    avg: mean(numbers),
    min: min(numbers),
    max: max(numbers),
    med: median(numbers),
    p95: quantile(numbers, 0.95),
    p99: quantile(numbers, 0.99),
  }
}

// Load-testing functionality
export async function loadTest (workflow: Workflow, options?: WorkflowOptions): Promise<LoadTestResult> {
  const start = new Date()
  const resultList = await runPhases<WorkflowResult>(workflow.config?.loadTesting?.phases as Phase[], () => run(workflow, options))
  const results = resultList.map(result => (result as PromiseFulfilledResult<WorkflowResult>).value.result)

  // Response times
  const totalResponseTimes = results.map((r) => r.responseTime)
  const totalPassed = results.filter((r) => r.passed === true)
  const total = metricsResult(totalResponseTimes)

  // Session duration
  const workflowDurationTimes = results.map((r) => r.duration)
  const workflowDuration = metricsResult(workflowDurationTimes)

  // Checks
  const checks = results.map(r => r.tests).map(test => test.map(test => test.steps.map(step => step.passed))).flat(2)
  const checksPassed = checks.filter(check => check)

  return {
    workflow,
    result: {
      steps: {
        passed: checks.length,
        total: checksPassed.length
      },
      tests: {
        passed: totalPassed.length,
        total: results.length
      },
      total,
      workflow: workflowDuration,
      rps: results.length / ((Date.now() - start.valueOf()) / 1000),
      iterations: results.length,
      duration: Date.now() - start.valueOf()
    }
  }
}
