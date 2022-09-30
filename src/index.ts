import got, { Method } from 'got'
import { CookieJar } from 'tough-cookie'
import mustache from 'mustache'
import xpath from 'xpath'
import FormData from 'form-data'
import * as cheerio from 'cheerio'
import { JSONPath } from 'jsonpath-plus'
import { DOMParser } from 'xmldom'
import { compileExpression } from 'filtrex'
import flatten from 'flat'
import { EventEmitter } from 'node:events'
import crypto from 'crypto'
import fs from 'fs'
import yaml from 'yaml'
import deepEqual from 'deep-equal'
import JSONSchema from 'jsonschema'
import toJsonSchema from 'to-json-schema'

type Workflow = {
  version: string
  name: string
  path?: string
  env?: object
  steps: WorkflowStep[]
  options?: WorkflowStepOptions
}

type WorkflowStepOptions = {
  continueOnFail?: boolean
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
  params?: WorkflowStepParams
  cookies?: WorkflowStepCookies
  body?: string | WorkflowStepFile
  form?: WorkflowStepForm
  formData?: WorkflowStepMultiPartForm
  auth?: WorkflowStepAuth
  json?: object
  graphql?: WorkflowStepGraphQL
  captures?: WorkflowStepCaptures[]
  followRedirects?: boolean
  check?: WorkflowStepCheck
  timeout?: number
}

type WorkflowConditions = {
  captures?: WorkflowStepCapturesStorage
}

type WorkflowStepHeaders = {
  [key: string]: string
}

type WorkflowStepParams = {
  [key: string]: string
}

type WorkflowStepCookies = {
  [key: string]: string
}

type WorkflowStepForm = {
  [key: string]: string
}

type WorkflowStepMultiPartForm = {
  [key: string]: string | WorkflowStepFile
}

type WorkflowStepFile = {
  file: string
}

type WorkflowStepAuth = {
  user: string
  password: string
}

type WorkflowStepGraphQL = {
  query: string
  variables: object
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
  redirected?: boolean
  redirects?: string[]
  headers?: WorkflowStepCheckValue | WorkflowStepCheckMatcher
  body?: string | WorkflowMatcher[]
  json?: object
  jsonschema?: object
  jsonexample?: object
  jsonpath?: WorkflowStepCheckJSONPath | WorkflowStepCheckMatcher
  xpath?: WorkflowStepCheckValue | WorkflowStepCheckMatcher
  selector?: WorkflowStepCheckValue | WorkflowStepCheckMatcher
  cookies?: WorkflowStepCheckValue | WorkflowStepCheckMatcher
  sha256?: string
  performance?: WorkflowStepCheckPerformance | WorkflowStepCheckMatcher
}

type WorkflowStepCheckValue = {
  [key: string]: string
}

type WorkflowStepCheckJSONPath = {
  [key: string]: object
}

type WorkflowStepCheckPerformance = {
  [key: string]: number
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
  in?: object
  nin?: object
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
  checks?: WorkflowResultCheck
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
  statusText?: string
  duration?: number
  timings: any
}

type WorkflowResultCheck = {
  headers?: WorkflowResultCheckResults
  redirected?: WorkflowResultCheckResult
  redirects?: WorkflowResultCheckResult
  json?: WorkflowResultCheckResult
  jsonschema?: WorkflowResultCheckResult
  jsonexample?: WorkflowResultCheckResult
  jsonpath?: WorkflowResultCheckResults
  xpath?: WorkflowResultCheckResults
  selector?: WorkflowResultCheckResults
  cookies?: WorkflowResultCheckResults
  status?: WorkflowResultCheckResult
  statusText?: WorkflowResultCheckResult
  body?: WorkflowResultCheckResult
  sha256?: WorkflowResultCheckResult
  performance?: WorkflowResultCheckResults
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

// Get cookie
function getCookie (store: CookieJar, name: string, url: string) {
  return store.getCookiesSync(url).filter(cookie => cookie.key === name)[0].value
}

// Run from workflow file
export function runFromFile (path: string, options?: WorkflowOptions): Promise<WorkflowResult> {
  const workflowFile = fs.readFileSync(path).toString()
  const config = yaml.parse(workflowFile)
  return run({ ...config, path }, options)
}

export async function run (workflow: Workflow, options?: WorkflowOptions): Promise<WorkflowResult> {
  const workflowResult: WorkflowResult = {
    workflow,
    result: [],
    passed: true,
    timestamp: Date.now(),
    duration: 0
  }

  const captures: WorkflowStepCapturesStorage = {}
  const cookies = new CookieJar()
  let previous: WorkflowStepResult | undefined

  for (let step of workflow.steps) {
    const stepResult: WorkflowStepResult = {
      name: step.name,
      timestamp: Date.now(),
      passed: true,
      duration: 0
    }

    // Skip current step is the previous one failed or condition was unmet
    if (!workflow.options?.continueOnFail && (previous && !previous.passed)) {
      stepResult.passed = false
      stepResult.failReason = 'Step was skipped because previous one failed'
      stepResult.skipped = true
    } else if (step.if && !checkCondition(step.if, { captures })) {
      stepResult.skipped = true
    } else {
      try {
        // Parse template
        step = JSON.parse(mustache.render(JSON.stringify(step), { captures, env: workflow.env, secrets: options?.secrets }))
        let requestBody: string | FormData | Buffer | undefined = undefined

        // Body
        if (step.body) {
          if (typeof step.body === 'string') {
            requestBody = step.body
          }

          if ((step.body as WorkflowStepFile).file) {
            requestBody = fs.readFileSync((step.body as WorkflowStepFile).file)
          }
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
          for (const field in step.formData) {
            if (typeof step.formData[field] === 'string') {
              formData.append(field, step.formData[field])
            }

            if ((step.formData[field] as WorkflowStepFile).file) {
              formData.append(field, fs.readFileSync((step.formData[field] as WorkflowStepFile).file))
            }
          }

          requestBody = formData
        }

        // Basic Auth
        if (step.auth) {
          if (!step.headers) step.headers = {}
          step.headers['Authorization'] = 'Basic ' + Buffer.from(step.auth.user + ':' + step.auth.password).toString('base64')
        }

        // Set Cookies
        if (step.cookies) {
          for (const cookie in step.cookies) {
            await cookies.setCookie(cookie + '=' + step.cookies[cookie], step.url)
          }
        }

        // Make a request
        const res = await got(step.url, {
          method: step.method as Method,
          headers: { ...step.headers },
          body: requestBody,
          searchParams: step.params,
          throwHttpErrors: false,
          followRedirect: step.followRedirects !== undefined ? step.followRedirects : true,
          timeout: step.timeout,
          cookieJar: cookies
        })

        const responseData = res.rawBody
        const body = await new TextDecoder().decode(responseData)

        stepResult.request = {
          url: res.url,
          method: step.method
        }

        stepResult.response = {
          status: res.statusCode,
          statusText: res.statusMessage,
          duration: res.timings.phases.total,
          timings: res.timings
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
              captures[capture.name] = res.headers[capture.header]
            }

            if (capture.selector) {
              const dom = cheerio.load(body)
              captures[capture.name] = dom(capture.selector).html()
            }

            if (capture.cookie) {
              captures[capture.name] = getCookie(cookies, capture.cookie, res.url)
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
                given: res.headers[header.toLowerCase()],
                passed: check(res.headers[header.toLowerCase()], step.check.headers[header])
              }

              if (!stepResult.checks.headers[header].passed){
                workflowResult.passed = false
                stepResult.passed = false
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

          // Check JSON
          if (step.check.json) {
            const json = JSON.parse(body)

            stepResult.checks.json = {
              expected: step.check.json,
              given: json,
              passed: deepEqual(json, step.check.json)
            }

            if (!stepResult.checks.json.passed) {
              workflowResult.passed = false
              stepResult.passed = false
            }
          }

          // Check JSONSchema
          if (step.check.jsonschema) {
            const json = JSON.parse(body)

            stepResult.checks.jsonschema = {
              expected: step.check.jsonschema,
              given: json,
              passed: JSONSchema.validate(json, step.check.jsonschema).valid
            }

            if (!stepResult.checks.jsonschema.passed) {
              workflowResult.passed = false
              stepResult.passed = false
            }
          }

          // Check JSON Example
          if (step.check.jsonexample) {
            const json = JSON.parse(body)
            const schema = toJsonSchema(json, { required: true })

            stepResult.checks.jsonexample = {
              expected: schema,
              given: json,
              passed: JSONSchema.validate(step.check.jsonexample, schema).valid
            }

            if (!stepResult.checks.jsonexample.passed) {
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
                expected: step.check.jsonpath[path],
                given: result[0],
                passed: check(result[0], step.check.jsonpath[path])
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
              const value = getCookie(cookies, cookie, res.url)

              stepResult.checks.cookies[cookie] = {
                expected: step.check.cookies[cookie],
                given: value,
                passed: check(value, step.check.cookies[cookie])
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
              given: res.statusCode,
              passed: check(res.statusCode, step.check.status)
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
              given: res.statusMessage,
              passed: check(res.statusMessage, step.check.statusText)
            }

            if (!stepResult.checks.statusText.passed) {
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

          // Check Performance
          if (step.check.performance){
            stepResult.checks.performance = {}

            for (const metric in step.check.performance){
              stepResult.checks.performance[metric] = {
                expected: step.check.performance[metric],
                given: (res.timings.phases as any)[metric],
                passed: check((res.timings.phases as any)[metric], step.check.performance[metric])
              }

              if (!stepResult.checks.performance[metric].passed){
                workflowResult.passed = false
                stepResult.passed = false
              }
            }
          }

          // Check whether request was redirected
          if ('redirected' in step.check) {
            stepResult.checks.redirected = {
              expected: step.check.redirected,
              given: res.redirectUrls.length > 0,
              passed: res.redirectUrls.length > 0 === step.check.redirected
            }

            if (!stepResult.checks.redirected.passed) {
              workflowResult.passed = false
              stepResult.passed = false
            }
          }

          // Check redirects
          if (step.check.redirects) {
            stepResult.checks.redirects = {
              expected: step.check.redirects,
              given: res.redirectUrls,
              passed: deepEqual(res.redirectUrls, step.check.redirects)
            }

            if (!stepResult.checks.redirects.passed) {
              workflowResult.passed = false
              stepResult.passed = false
            }
          }
        }
      } catch (error) {
        workflowResult.passed = false
        stepResult.failed = true
        stepResult.failReason = (error as Error).message
        stepResult.passed = false
        if (options?.ee) options.ee.emit('error', error)
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
