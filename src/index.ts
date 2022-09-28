import fetch from 'node-fetch'
import mustache from 'mustache'
import xpath from 'xpath'
import FormData from 'form-data'
import * as cheerio from 'cheerio'
import { JSONPath } from 'jsonpath-plus'
import { DOMParser } from 'xmldom'
import { compileExpression } from 'filtrex'
import { flatten } from 'flat'
import { EventEmitter } from 'node:events'
import crypto from 'crypto'
import fs from 'fs'
import yaml from 'yaml'

type Workflow = {
  version: string
  name: string
  path?: string
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
  cookies?: WorkflowStepCookies
  body?: string
  form?: WorkflowStepForm
  formData?: WorkflowStepForm
  files?: WorkflowStepForm
  auth?: WorkflowStepAuth
  json?: any
  graphql?: WorkflowStepGraphQL
  captures?: WorkflowStepCaptures[]
  followRedirects?: boolean
  acceptCookies?: boolean
  check: WorkflowStepCheck
}

type WorkflowConditions = {
  captures?: WorkflowStepCapturesStorage
}

type WorkflowStepHeaders = {
  [key: string]: string
}

type WorkflowStepCookies = {
  [key: string]: string
}

type WorkflowStepForm = {
  [key: string]: string
}

type WorkflowStepAuth = {
  user: string
  password: string
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
  cookie?: string
}

type WorkflowStepCapturesStorage = {
  [key: string]: any
}

type WorkflowStepCheck = {
  status?: number | WorkflowMatcher[]
  statusText?: string | WorkflowMatcher[]
  headers?: WorkflowStepCheckValue | WorkflowStepCheckMatcher
  body?: string | WorkflowMatcher[]
  duration?: number | WorkflowMatcher[]
  jsonpath?: WorkflowStepCheckJSONPath | WorkflowStepCheckMatcher
  xpath?: WorkflowStepCheckValue | WorkflowStepCheckMatcher
  selector?: WorkflowStepCheckValue | WorkflowStepCheckMatcher
  cookies?: WorkflowStepCheckValue | WorkflowStepCheckMatcher
  sha256?: string
}

type WorkflowStepCheckValue = {
  [key: string]: string
}

type WorkflowStepCheckJSONPath = {
  [key: string]: any
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
  headers?: WorkflowResultCheckResults
  jsonpath?: WorkflowResultCheckResults
  xpath?: WorkflowResultCheckResults
  selector?: WorkflowResultCheckResults
  cookies?: WorkflowResultCheckResults
  status?: WorkflowResultCheckResult
  statusText?: WorkflowResultCheckResult
  duration?: WorkflowResultCheckResult
  body?: WorkflowResultCheckResult
  sha256?: WorkflowResultCheckResult
}

type WorkflowResultCheckResult = {
  expected: any
  given: any
  passed: boolean
}

type WorkflowResultCheckResults = {
  [key: string]: WorkflowResultCheckResult
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
function checkCondition (expression: string, data: WorkflowConditions): boolean {
  const filter = compileExpression(expression)
  return filter(flatten(data))
}

// Run from workflow file
export function runFromFile (path: string, options?: WorkflowOptions): Promise<WorkflowResult> {
  const workflowFile = fs.readFileSync(path).toString()
  const config = yaml.parse(workflowFile)
  return run({ ...config, path }, options)
}

export async function run (workflow: Workflow, options?: WorkflowOptions): Promise<WorkflowResult> {
  let workflowResult: WorkflowResult = {
    workflow,
    result: [],
    passed: true,
    timestamp: Date.now(),
    duration: 0
  }

  const captures: WorkflowStepCapturesStorage = {}
  const cookies: WorkflowStepCookies = {}
  let previous: WorkflowStepResult | undefined

  for (let step of workflow.steps) {
    let stepResult: WorkflowStepResult = {
      name: step.name,
      checks: {},
      timestamp: Date.now(),
      passed: true,
      duration: 0
    }

    // Skip current step is the previous one failed or condition was unmet
    if (previous && !previous.passed) {
      stepResult.passed = false
      stepResult.failReason = 'Step was skipped because previous one failed'
      stepResult.skipped = true
    } else if (step.if && !checkCondition(step.if, { captures })) {
      stepResult.skipped = true
    } else {
      try {
        // Parse template
        step = JSON.parse(mustache.render(JSON.stringify(step), { captures, env: workflow.env, secrets: options?.secrets }))
        step.followRedirects = step.followRedirects !== undefined ? step.followRedirects : true
        step.acceptCookies = step.acceptCookies !== undefined ? step.acceptCookies : true

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
          for (const field in step.form) {
            formData.append(field, step.form[field])
          }

          requestBody = formData.toString()
        }

        // Multipart Form Data
        if (step.formData) {
          const formData = new FormData()
          for (const field in step.form) {
            formData.append(field, step.form[field])
          }

          requestBody = formData
        }

        // File uploads
        if (step.files) {
          const formData = step.formData ? requestBody as FormData : new FormData()
          for (const field in step.files) {
            formData.append(field, fs.readFileSync(step.files[field]))
          }

          requestBody = formData
        }

        // Basic Auth
        if (step.auth) {
          if (!step.headers) step.headers = {}
          step.headers['Authorization'] = 'Basic ' + Buffer.from(step.auth.user + ':' + step.auth.password).toString('base64')
        }

        // Set Cookies
        if (Object.keys(cookies).length > 0 || step.cookies) {
          Object.assign(cookies, step.cookies)

          if (!step.headers) step.headers = { cookie: '' }
          if (!step.headers.cookie) step.headers.cookie = ''

          for (const cookie in cookies) {
            step.headers.cookie += cookie + '=' + cookies[cookie] + ' '
          }
        }

        // Make a request
        const requestStart = Date.now()
        const res = await fetch(step.url, {
          method: step.method,
          headers: step.headers,
          body: requestBody,
          redirect: step.followRedirects ? 'follow' : 'error'
        })

        const responseData = await res.arrayBuffer()
        const body = await new TextDecoder().decode(responseData)
        const requestDuration = Date.now() - requestStart

        stepResult.request = {
          url: step.url,
          method: step.method
        }

        stepResult.response = {
          status: res.status,
          statusText: res.statusText,
          duration: requestDuration
        }

        // Add response cookies to cookie store
        if (step.acceptCookies && res.headers.has('Set-Cookie')) {
          const responseCookies = res.headers.raw()['set-cookie']
          responseCookies.forEach(cookie => {
            const cookieValue = cookie.split('; ')[0].split('=')
            cookies[cookieValue[0]] = cookieValue[1]
          })
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

            if (capture.cookie) {
              captures[capture.name] = cookies[capture.cookie]
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

        // Check Cookies
        if (step.check.cookies) {
          stepResult.checks.cookies = {}

          for (const cookie in step.check.cookies) {
            stepResult.checks.cookies[cookie] = {
              expected: step.check.cookies[cookie],
              given: cookies[cookie],
              passed: check(cookies[cookie], step.check.cookies[cookie])
            }

            if (!stepResult.checks.cookies[cookie].passed) {
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

        // Check hash (binary blobs)
        if (step.check.sha256) {
          const hash = crypto.createHash('sha256').update(Buffer.from(responseData)).digest('hex')
          stepResult.checks.sha256 = {
            expected: step.check.sha256,
            given: hash,
            passed: step.check.sha256 === hash
          }

          if (!stepResult.checks.sha256.passed) {
            workflowResult.passed = false
            stepResult.passed = false
          }
        }

        // Add check for res.redirected
        // Add check for res.ok
      } catch (error) {
        workflowResult.passed = false
        stepResult.failed = true
        stepResult.failReason = (error as Error).message
        stepResult.passed = false
      }
    }

    stepResult.duration = Date.now() - stepResult.timestamp
    previous = stepResult
    if (options?.ee) options.ee.emit('result', stepResult)
    workflowResult.result.push(stepResult)
  }

  workflowResult.duration = Date.now() - workflowResult.timestamp
  if (options?.ee) options.ee.emit('done', workflowResult)
  return workflowResult
}
