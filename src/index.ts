import fetch from 'node-fetch'
import mustache from 'mustache'
import { JSONPath } from 'jsonpath-plus'
import xpath from 'xpath'
import { DOMParser } from 'xmldom'

type Workflow = {
  version: string
  name: string
  env: any
  steps: WorkflowStep[]
}

type WorkflowStep = {
  id?: string
  name: string
  url: string
  method: string
  headers?: WorkflowStepHeaders
  body?: string
  form?: WorkflowStepForm
  graphql?: WorkflowStepGraphQL
  captures?: WorkflowStepCaptures[]
  check: WorkflowStepCheck
}

type WorkflowStepHeaders = {
  [key: string]: string
}

type WorkflowStepForm = {
  [key: string]: string
}

type WorkflowStepGraphQL = {
  query: string
  variables: any
}

type WorkflowStepCaptures = {
  name: string
  xpath?: string
  jsonpath?: string
  header?: string
}

type WorkflowStepCaptureStorage = {
  [key: string]: any
}

type WorkflowStepCheck = {
  status?: number | string | WorkflowMatcher[]
  statusText?: string | WorkflowMatcher[]
  headers?: WorkflowStepCheckHeaders | WorkflowStepCheckMatcher
  body?: string | WorkflowMatcher[]
  duration?: number | WorkflowMatcher[]
  jsonpath?: WorkflowStepCheckJSONPath | WorkflowStepCheckMatcher
  xpath?: WorkflowStepCheckXPath | WorkflowStepCheckMatcher
}

type WorkflowStepCheckHeaders = {
  [key: string]: string
}

type WorkflowStepCheckJSONPath = {
  [key: string]: any
}

type WorkflowStepCheckXPath = {
  [key: string]: string
}

type WorkflowStepCheckMatcher = {
  [key: string]: WorkflowMatcher[]
}

type WorkflowMatcher = {
  eq?: any
  ne?: any
  gt?: number
  gte?: number
  lt?: number
  lte?: number
  in?: any
  nin?: any
  match?: string
  isNumber?: boolean
  isString?: boolean
  isBoolean?: boolean
  isNull?: boolean
  isDefined?: boolean
  isObject?: boolean
  isArray?: boolean
}

type WorkflowResult = {
  workflow: Workflow
  result: WorkflowStepResult[]
  passed?: boolean
  timestamp: number
  duration?: number
}

type WorkflowStepResult = {
  name: string
  checks: WorkflowResultCheck | any
  failed?: boolean
  failReason?: string
  passed?: boolean
  skipped?: boolean
  timestamp: number
  duration?: number
  response?: WorkflowResultResponse
}

type WorkflowResultResponse = {
  status: number
  statusText: string
  duration: number
}

type WorkflowResultCheck = {
  headers?: WorkflowResultCheckHeaders
  jsonpath?: WorkflowResultCheckJSONPath
  xpath?: WorkflowResultCheckXPath
  status?: WorkflowResultCheckResponse
  statusText?: WorkflowResultCheckResponse
  duration?: WorkflowResultCheckResponse
  body?: WorkflowResultCheckResponse
}

type WorkflowResultCheckHeaders = {
  [key: string]: WorkflowResultCheckResponse
}

type WorkflowResultCheckJSONPath = {
  [key: string]: WorkflowResultCheckResponse
}

type WorkflowResultCheckXPath = {
  [key: string]: WorkflowResultCheckResponse
}

type WorkflowResultCheckResponse = {
  expected: any
  given: any
  passed: boolean
}

// Matchers
function check (given: any, expected: WorkflowMatcher[] | any) : boolean {
  if (typeof expected === 'object') {
    return expected.map((test: WorkflowMatcher) => {
      if (test.eq) return given === test.eq
      if (test.ne) return given !== test.ne
      if (test.gt) return given > test.gt
      if (test.gte) return given >= test.gte
      if (test.lt) return given < test.lt
      if (test.lte) return given <= test.lte
      if (test.in) return given.includes(test.in)
      if (test.nin) return !given.includes(test.nin)
      if (test.match) return new RegExp(test.match).test(given)
      if ('isNumber' in test) return test.isNumber ? typeof given === 'number' : typeof given !== 'number'
      if ('isString' in test) return test.isString ? typeof given === 'string' : typeof given !== 'string'
      if ('isBoolean' in test) return test.isBoolean ? typeof given === 'boolean' : typeof given !== 'boolean'
      if ('isNull' in test) return test.isNull ? typeof given === null : typeof given !== null
      if ('isDefined' in test) return test.isDefined ? typeof given !== undefined : typeof given === undefined
      if ('isObject' in test) return test.isObject ? typeof given === 'object' : typeof given !== 'object'
      if ('isArray' in test) return test.isArray ? Array.isArray(given) : !Array.isArray(given)
    })
    .every((test: boolean) => test === true)
  }

  // Check whether the expected value is regex
  if (/^\/.*\/$/.test(expected)) {
    const regex = new RegExp(expected.match(/\/(.*?)\//)[1])
    return regex.test(given)
  }

  return given === expected
}

export async function run (workflow: Workflow, options: object): Promise<WorkflowResult> {
  let workflowResult: WorkflowResult = {
    workflow,
    result: [],
    timestamp: Date.now(),
  }

  const captures: WorkflowStepCaptureStorage = {}
  let previous: WorkflowStepResult | undefined

  for (let step of workflow.steps) {
    let stepResult: WorkflowStepResult = {
      name: step.name,
      checks: [],
      timestamp: Date.now()
    }

    // Skip current step is the previous one failed
    if (previous && !previous.passed) {
      stepResult.passed = false
      stepResult.passed = false
      stepResult.failReason = 'Step was skipped because previous one failed'
      stepResult.skipped = true
    } else {
      stepResult.passed = true

      // Parse template
      step = JSON.parse(mustache.render(JSON.stringify(step), { captures, env: workflow.env, ...options }))

      // GraphQL
      if (step.graphql) {
        step.body = JSON.stringify(step.graphql)
      }

      // Form Data
      if (step.form) {
        const formData = new URLSearchParams()
        for (const key in step.form) {
          formData.append(key, step.form[key])
        }

        step.body = formData.toString()
      }

      try {
        const res = await fetch(step.url, { method: step.method, headers: step.headers, body: step.body || undefined })
        const body = await res.text()
        const duration = Date.now() - stepResult.timestamp

        stepResult.response = {
          status: res.status,
          statusText: res.statusText,
          duration
        }

        if (step.captures) {
          step.captures.forEach((capture) => {
            if (capture.jsonpath) {
              const json = JSON.parse(body)
              captures[capture.name] = JSONPath({ path: capture.jsonpath, json })[0]
            }

            if (capture.xpath) {
              const dom = new DOMParser().parseFromString(body)
              const result = xpath.select(capture.xpath, dom)
              captures[capture.name] = result.length > 0 ? (result[0] as any).firstChild.data : undefined
            }

            if (capture.header) {
              captures[capture.name] = res.headers.get(capture.header)
            }
          })
        }

        if (step.check) {
          stepResult.checks = {}

          // Check headers
          if (step.check.headers){
            stepResult.checks.headers = {}

            for (const header in step.check.headers){
              stepResult.checks.headers[header] = {
                expected: step.check.headers[header],
                given: res.headers.get(header),
                passed: check(res.headers.get(header), step.check.headers[header])
              }

              if (!stepResult.checks.headers[header].passed){
                workflowResult.passed = false
                stepResult.passed = false
              }
            }
          }
        }

        // Check body
        if (step.check.body) {
          stepResult.checks.body = {
            expected: step.check.body,
            given: body,
            passed: check(body, step.check.body)
          }

          if (!stepResult.checks.body.passed) {
            workflowResult.passed = false
            stepResult.passed = false
          }
        }

        // Check JSONPath
        if (step.check.jsonpath) {
          const json = JSON.parse(body)

          for (const path in step.check.jsonpath) {
            const result = JSONPath({ path, json })
            stepResult.checks.jsonpath[path] = {
              expected: step.check?.jsonpath[path],
              given: result[0],
              passed: check(result[0], step.check?.jsonpath[path])
            }

            if (!stepResult.checks.jsonpath[path].passed) {
              workflowResult.passed = false
              stepResult.passed = false
            }
          }
        }

        // Check XPath
        if (step.check.xpath) {
          for (const path in step.check.xpath) {
            const dom = new DOMParser().parseFromString(body)
            const result = xpath.select(path, dom)

            stepResult.checks.xpath[path] = {
              expected: step.check.xpath[path],
              given: result.length > 0 ? (result[0] as any).firstChild.data : undefined,
              passed: check(result.length > 0 ? (result[0] as any).firstChild.data : undefined, step.check.xpath[path])
            }
            if (!stepResult.checks.xpath[path].passed) {
              workflowResult.passed = false
              stepResult.passed = false
            }
          }
        }

        // Check status
        if (step.check.status) {
          stepResult.checks.status = {
            expected: step.check.status,
            given: res.status,
            passed: check(res.status, step.check.status)
          }

          if (!stepResult.checks.status.passed) {
            workflowResult.passed = false
            stepResult.passed = false
          }
        }

        // Check statusText
        if (step.check.statusText) {
          stepResult.checks.statusText = {
            expected: step.check.statusText,
            given: res.statusText,
            passed: check(res.statusText, step.check.statusText)
          }

          if (!stepResult.checks.statusText.passed) {
            workflowResult.passed = false
            stepResult.passed = false
          }
        }

        // Check duration
        if (step.check.duration) {
          stepResult.checks.duration = {
            expected: step.check.duration,
            given: duration,
            passed: check(duration, step.check.duration)
          }

          if (!stepResult.checks.duration.passed) {
            workflowResult.passed = false
            stepResult.passed = false
          }
        }
      } catch (error) {
        workflowResult.passed = false
        stepResult.failed = true
        stepResult.failReason = (error as Error).message
        stepResult.passed = false
      }
    }

    workflowResult.duration = Date.now() - workflowResult.timestamp
    previous = stepResult
    workflowResult.result.push(stepResult)
  }

 return workflowResult
}