import fetch from 'node-fetch'
import mustache from 'mustache'
import xpath from 'xpath'
import FormData from 'form-data'
import * as cheerio from 'cheerio'
import { JSONPath } from 'jsonpath-plus'
import { DOMParser } from 'xmldom'
import { compileExpression } from 'filtrex'
import { EventEmitter } from 'node:events'

type Workflow = {
  version: string
  name: string
  env: any
  steps: WorkflowStep[]
}

type WorkflowOptions = {
  secrets?: WorkflowOptionsSecrets
  ee?: EventEmitter
}

type WorkflowOptionsSecrets = {
  [key: string]: string
}

type WorkflowStep = {
  id?: string
  name: string
  if?: string
  url: string
  method: string
  headers?: WorkflowStepHeaders
  body?: string
  form?: WorkflowStepForm
  formData?: WorkflowStepForm
  json?: any
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
  selector?: string
}

type WorkflowStepCaptureStorage = {
  [key: string]: any
}

type WorkflowStepCheck = {
  status?: number | WorkflowMatcher[]
  statusText?: string | WorkflowMatcher[]
  headers?: WorkflowStepCheckHeaders | WorkflowStepCheckMatcher
  body?: string | WorkflowMatcher[]
  duration?: number | WorkflowMatcher[]
  jsonpath?: WorkflowStepCheckJSONPath | WorkflowStepCheckMatcher
  xpath?: WorkflowStepCheckXPath | WorkflowStepCheckMatcher
  selector?: WorkflowStepCheckSelector | WorkflowStepCheckMatcher
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

type WorkflowStepCheckSelector = {
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
  passed: boolean
  timestamp: number
  duration: number
}

type WorkflowStepResult = {
  name: string
  checks: WorkflowResultCheck
  failed?: boolean
  failReason?: string
  passed: boolean
  skipped?: boolean
  timestamp: number
  duration: number
  request?: WorkflowResultRequest
  response?: WorkflowResultResponse
}

type WorkflowResultRequest = {
  url: string
  method: string
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
  selector?: WorkflowResultCheckSelector
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

type WorkflowResultCheckSelector = {
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

// Check if expression
function checkCondition (expression: string, captures: WorkflowStepCaptureStorage): boolean {
  const filter = compileExpression(expression)
  return filter({ ...captures })
}

export async function run (workflow: Workflow, options: WorkflowOptions): Promise<WorkflowResult> {
  let workflowResult: WorkflowResult = {
    workflow,
    result: [],
    passed: true,
    timestamp: Date.now(),
    duration: 0
  }

  const captures: WorkflowStepCaptureStorage = {}
  let previous: WorkflowStepResult | undefined

  for (let step of workflow.steps) {
    let stepResult: WorkflowStepResult = {
      name: step.name,
      checks: {},
      timestamp: Date.now(),
      passed: true,
      duration: 0
    }

    // Skip current step is the previous one failed
    if (previous && !previous.passed) {
      stepResult.passed = false
      stepResult.failReason = 'Step was skipped because previous one failed'
      stepResult.skipped = true
    } else if (step.if && !checkCondition(step.if, captures)) {
      stepResult.skipped = true
    } else {
      try {
        // Parse template
        step = JSON.parse(mustache.render(JSON.stringify(step), { captures, env: workflow.env, secrets: options.secrets }))
        let requestBody: string | FormData | undefined = undefined

        // Body
        if (step.body) {
          requestBody = step.body
        }

        //  JSON
        if (step.json) {
          requestBody = JSON.stringify(step.json)
        }

        // GraphQL
        if (step.graphql) {
          requestBody = JSON.stringify(step.graphql)
        }

        // Form Data
        if (step.form) {
          const formData = new URLSearchParams()
          for (const key in step.form) {
            formData.append(key, step.form[key])
          }

          requestBody = formData.toString()
        }

        // Multipart Form Data
        if (step.formData) {
          const formData = new FormData()
          for (const key in step.form) {
            formData.append(key, step.form[key])
          }

          requestBody = formData
        }

        const requestStart = Date.now()
        const res = await fetch(step.url, { method: step.method, headers: step.headers, body: requestBody })
        const body = await res.text()
        const requestDuration = Date.now() - requestStart

        stepResult.request = {
          url: step.url,
          method: step.method
        }

        stepResult.response = {
          status: res.status,
          statusText: res.statusText,
          duration: Date.now() - requestDuration
        }

        // Captures
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

            if (capture.selector) {
              const dom = cheerio.load(body)
              captures[capture.name] = dom(capture.selector).html()
            }
          })
        }

        if (step.check) {
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
            given: body.trim(),
            passed: check(body.trim(), step.check.body)
          }

          if (!stepResult.checks.body.passed) {
            workflowResult.passed = false
            stepResult.passed = false
          }
        }

        // Check JSONPath
        if (step.check.jsonpath) {
          const json = JSON.parse(body)
          stepResult.checks.jsonpath = {}

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
          stepResult.checks.xpath = {}

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

        // Check HTML5 Selector
        if (step.check.selector) {
          stepResult.checks.selector = {}
          const dom = cheerio.load(body)

          for (const selector in step.check.selector) {
            const result = dom(selector).html()

            stepResult.checks.selector[selector] = {
              expected: step.check.selector[selector],
              given: result,
              passed: check(result, step.check.selector[selector])
            }

            if (!stepResult.checks.selector[selector].passed) {
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
            given: requestDuration,
            passed: check(requestDuration, step.check.duration)
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

    stepResult.duration = Date.now() - stepResult.timestamp
    previous = stepResult
    if (options.ee) options.ee.emit('result', stepResult)
    workflowResult.result.push(stepResult)
  }

  workflowResult.duration = Date.now() - workflowResult.timestamp
  if (options.ee) options.ee.emit('done', workflowResult)
  return workflowResult
}
