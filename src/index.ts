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
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { DetailedPeerCertificate } from 'node:tls'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'

export type Workflow = {
  version: string
  name: string
  env?: object
  tests: Tests
  components?: WorkflowComponents
  config?: WorkflowConfig
}

export type WorkflowComponents = {
  schemas: {
    [key: string]: any
  }
}

export type WorkflowConfig = {
  baseURL?: string
  rejectUnauthorized?: boolean
  continueOnFail?: boolean
}

type WorkflowOptions = {
  path?: string
  secrets?: WorkflowOptionsSecrets
  ee?: EventEmitter
}

type WorkflowOptionsSecrets = {
  [key: string]: string
}

export type WorkflowResult = {
  workflow: Workflow
  result: {
    tests: TestResult[]
    passed: boolean
    timestamp: Date
    duration: number
  }
  path?: string
}

export type Test = {
  name?: string
  env?: object
  steps: Step[]
  config?: TestConfig
}

export type Tests = {
  [key: string]: Test
}

export type TestConfig = {
  continueOnFail?: boolean
}

type TestConditions = {
  captures?: CapturesStorage
  env?: object
}

export type Step = {
  id?: string
  name?: string
  if?: string
  url: string
  method: string
  headers?: StepHeaders
  params?: StepParams
  cookies?: StepCookies
  body?: string | StepFile
  form?: StepForm
  formData?: StepMultiPartForm
  auth?: StepAuth
  json?: object
  xml?: object
  graphql?: StepGraphQL
  captures?: StepCaptures
  config?: StepConfig
  check?: StepCheck
}

export type StepConfig = {
  followRedirects?: boolean
  timeout?: number
}

export type StepHeaders = {
  [key: string]: string
}

export type StepParams = {
  [key: string]: string
}

export type StepCookies = {
  [key: string]: string
}

export type StepForm = {
  [key: string]: string
}

export type StepMultiPartForm = {
  [key: string]: string | StepFile
}

export type StepFile = {
  file: string
}

export type StepAuth = {
  basic?: {
    user: string
    password: string
  }

  bearer?: {
    token: string
  }
}

export type StepGraphQL = {
  query: string
  variables: object
}

export type StepCaptures = {
  [key: string]: StepCapture
}

export type StepCapture = {
  xpath?: string
  jsonpath?: string
  header?: string
  selector?: string
  cookie?: string
  regex?: string
}

type CapturesStorage = {
  [key: string]: any
}

export type StepCheck = {
  status?: number | Matcher[]
  statusText?: string | Matcher[]
  redirected?: boolean
  redirects?: string[]
  headers?: StepCheckValue | StepCheckMatcher
  body?: string | Matcher[]
  json?: object
  xml?: object
  schema?: object
  jsonpath?: StepCheckJSONPath | StepCheckMatcher
  xpath?: StepCheckValue | StepCheckMatcher
  selector?: StepCheckValue | StepCheckMatcher
  cookies?: StepCheckValue | StepCheckMatcher
  captures?: StepCheckCaptures
  sha256?: string
  md5?: string
  performance?: StepCheckPerformance | StepCheckMatcher
  ssl?: StepCheckSSL | StepCheckMatcher
}

export type StepCheckValue = {
  [key: string]: string
}

export type StepCheckJSONPath = {
  [key: string]: object
}

export type StepCheckPerformance = {
  [key: string]: number
}

export type StepCheckCaptures = {
  [key: string]: any
}

export type StepCheckSSL = {
  valid?: boolean
  signed?: boolean
  daysUntilExpiration?: number | Matcher[]
}

export type StepCheckMatcher = {
  [key: string]: Matcher[]
}

export type Matcher = {
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

export type TestResult = {
  id: string
  name?: string
  steps: StepResult[]
  passed: boolean
  timestamp: Date
  duration: number
}

export type StepResult = {
  id?: string
  testId: string
  name?: string
  checks?: StepCheckResult
  errored: boolean
  errorMessage?: string
  passed: boolean
  skipped: boolean
  timestamp: Date
  duration: number
  request?: StepRequest
  response?: StepResponse
}

export type StepRequest = {
  url: string
  method: string
}

export type StepResponse = {
  status: number
  statusText?: string
  duration?: number
  timings: any
  ssl?: StepResponseSSL
}

export type StepResponseSSL = {
  valid: boolean
  signed: boolean
  validUntil: Date
  daysUntilExpiration: number
}

export type StepCheckResult = {
  headers?: CheckResults
  redirected?: CheckResult
  redirects?: CheckResult
  json?: CheckResult
  xml?: CheckResult
  schema?: CheckResult
  jsonpath?: CheckResults
  xpath?: CheckResults
  selector?: CheckResults
  cookies?: CheckResults
  captures?: CheckResults
  status?: CheckResult
  statusText?: CheckResult
  body?: CheckResult
  sha256?: CheckResult
  md5?: CheckResult
  performance?: CheckResults
  ssl?: CheckResultSSL
}

export type CheckResult = {
  expected: any
  given: any
  passed: boolean
}

export type CheckResults = {
  [key: string]: CheckResult
}

export type CheckResultSSL = {
  valid?: CheckResult
  signed?: CheckResult
  daysUntilExpiration?: CheckResult
}

// Matchers
function check (given: any, expected: Matcher[] | any) : boolean {
  if (typeof expected === 'object') {
    return expected.map((test: Matcher) => {
      if (test.eq) return deepEqual(given, test.eq)
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

  return deepEqual(given, expected)
}

// Check if expression
function checkCondition (expression: string, data: TestConditions): boolean {
  const filter = compileExpression(expression)
  return filter(flatten(data))
}

// Get cookie
function getCookie (store: CookieJar, name: string, url: string): string {
  return store.getCookiesSync(url).filter(cookie => cookie.key === name)[0]?.value
}

// Did all checks pass?
function didChecksPass (stepResult: StepResult) {
  if (!stepResult.checks) return true

  return Object.values(stepResult.checks as object).map(check => {
    return check['passed'] ? check.passed : Object.values(check).map((c: any) => c.passed).every(passed => passed)
  })
  .every(passed => passed)
}

// Run from YAML string
export function runFromYAML (yamlString: string, options?: WorkflowOptions): Promise<WorkflowResult> {
  return run(yaml.parse(yamlString), options)
}

// Run from test file
export async function runFromFile (path: string, options?: WorkflowOptions): Promise<WorkflowResult> {
  const testFile = (await fs.promises.readFile(path)).toString()
  const config = yaml.parse(testFile)
  return run({ ...config, path }, options)
}

// Run workflow
export async function run (workflow: Workflow, options?: WorkflowOptions): Promise<WorkflowResult> {
  const timestamp = new Date()
  const tests = await Promise.all(Object.values(workflow.tests).map((test, i) => runTest(Object.keys(workflow.tests)[i], test, options, workflow.config, workflow.env, workflow.components)))

  const workflowResult = {
    workflow,
    result: {
      tests,
      passed: tests.every(test => test.passed),
      timestamp,
      duration: Date.now() - timestamp.valueOf(),
      path: options?.path
    }
  }

  options?.ee?.emit('workflow:result', workflowResult)
  return workflowResult
}

async function runTest (id: string, test: Test, options?: WorkflowOptions, config?: WorkflowConfig, env?: object, components?: Workflow['components']): Promise<TestResult> {
  const testResult: TestResult = {
    id,
    name: test.name,
    steps: [],
    passed: true,
    timestamp: new Date(),
    duration: 0
  }

  const captures: CapturesStorage = {}
  const cookies = new CookieJar()
  const schemaValidator = new Ajv({ strictSchema: false })
  addFormats(schemaValidator)
  let previous: StepResult | undefined

  // Add schemas to schema Validator
  if (components) {
    if (components.schemas) {
      for (const schema in components.schemas) {
        schemaValidator.addSchema(components.schemas[schema], `#/components/schemas/${schema}`)
      }
    }
  }

  for (let step of test.steps) {
    const stepResult: StepResult = {
      id: step.id,
      testId: id,
      name: step.name,
      timestamp: new Date(),
      passed: true,
      errored: false,
      skipped: false,
      duration: 0
    }

    // Skip current step is the previous one failed or condition was unmet
    if ((!test.config?.continueOnFail || !config?.continueOnFail) && (previous && !previous.passed)) {
      stepResult.passed = false
      stepResult.errorMessage = 'Step was skipped because previous one failed'
      stepResult.skipped = true
    } else if (step.if && !checkCondition(step.if, { captures, env: { ...env, ...test.env } })) {
      stepResult.skipped = true
    } else {
      try {
        // This line of code smeels like shit
        step = JSON.parse(mustache.render(JSON.stringify(step), { captures, env: { ...env, ...test.env }, secrets: options?.secrets }))
        let requestBody: string | FormData | Buffer | undefined

        // Prefix URL
        if (config?.baseURL) {
          try {
            new URL(step.url)
          } catch {
            step.url = config.baseURL + step.url
          }
        }

        // Body
        if (step.body) {
          if (typeof step.body === 'string') {
            requestBody = step.body
          }

          if ((step.body as StepFile).file) {
            requestBody = fs.readFileSync((step.body as StepFile).file)
          }
        }

        //  JSON
        if (step.json) {
          requestBody = JSON.stringify(step.json)
        }

        //  XML
        if (step.xml) {
          requestBody = JSON.stringify(new XMLBuilder({}).build(step.xml))
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

            if ((step.formData[field] as StepFile).file) {
              formData.append(field, fs.readFileSync((step.formData[field] as StepFile).file))
            }
          }

          requestBody = formData
        }

        // Basic Auth
        if (step.auth) {
          if (!step.headers) step.headers = {}

          if (step.auth.basic) {
            step.headers['Authorization'] = 'Basic ' + Buffer.from(step.auth.basic.user + ':' + step.auth.basic.password).toString('base64')
          }

          if (step.auth.bearer) {
            step.headers['Authorization'] = 'Bearer ' + step.auth.bearer.token
          }
        }

        // Set Cookies
        if (step.cookies) {
          for (const cookie in step.cookies) {
            await cookies.setCookie(cookie + '=' + step.cookies[cookie], step.url)
          }
        }

        // Make a request
        let sslCertificate: DetailedPeerCertificate | undefined
        const res = await got(step.url, {
          method: step.method as Method,
          headers: { ...step.headers },
          body: requestBody,
          searchParams: step.params ? new URLSearchParams(step.params) : undefined,
          throwHttpErrors: false,
          followRedirect: step.config?.followRedirects !== undefined ? step.config?.followRedirects : true,
          timeout: step.config?.timeout,
          cookieJar: cookies,
          https: {
            rejectUnauthorized: config?.rejectUnauthorized !== undefined ? config?.rejectUnauthorized : false,
            checkServerIdentity(hostname, certificate) {
              sslCertificate = certificate
            }
          }
        })
        .on('request', request => options?.ee?.emit('step:request', request))
        .on('response', response => options?.ee?.emit('step:response', response))

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

        if (sslCertificate) {
          stepResult.response.ssl = {
            valid: new Date(sslCertificate.valid_to) > new Date(),
            signed: sslCertificate.issuer.CN !== sslCertificate.subject.CN,
            validUntil: new Date(sslCertificate.valid_to),
            daysUntilExpiration: Math.round(Math.abs(new Date().valueOf() - new Date(sslCertificate.valid_to).valueOf()) / (24 * 60 * 60 * 1000))
          }
        }

        // Captures
        if (step.captures) {
          for (const name in step.captures) {
            const capture = step.captures[name]

            if (capture.jsonpath) {
              const json = JSON.parse(body)
              captures[name] = JSONPath({ path: capture.jsonpath, json })[0]
            }

            if (capture.xpath) {
              const dom = new DOMParser().parseFromString(body)
              const result = xpath.select(capture.xpath, dom)
              captures[name] = result.length > 0 ? (result[0] as any).firstChild.data : undefined
            }

            if (capture.header) {
              captures[name] = res.headers[capture.header]
            }

            if (capture.selector) {
              const dom = cheerio.load(body)
              captures[name] = dom(capture.selector).html()
            }

            if (capture.cookie) {
              captures[name] = getCookie(cookies, capture.cookie, res.url)
            }

            if (capture.regex) {
              captures[name] = body.match(capture.regex)?.[1]
            }
          }
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
            }
          }

          // Check body
          if (step.check.body) {
            stepResult.checks.body = {
              expected: step.check.body,
              given: body.trim(),
              passed: check(body.trim(), step.check.body)
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
          }

          // Check XML
          if (step.check.xml) {
            const xml = new XMLParser({ ignorePiTags: true }).parse(body)
            stepResult.checks.xml = {
              expected: step.check.xml,
              given: xml,
              passed: deepEqual(xml, step.check.xml)
            }
          }

          // Check Schema
          if (step.check.schema) {
            let sample = body

            if (res.headers['content-type']?.includes('json')) {
              sample = JSON.parse(body)
            }

            // This is a stub
            if (res.headers['content-type']?.includes('xml')) {
              sample = new XMLParser({ ignorePiTags: true }).parse(body)
            }

            const validate = schemaValidator.compile(step.check.schema)
            stepResult.checks.schema = {
              expected: step.check.schema,
              given: sample,
              passed: validate(sample)
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
            }
          }

          // Check captures
          if (step.check.captures) {
            stepResult.checks.captures = {}

            for (const capture in step.check.captures) {
              stepResult.checks.captures[capture] = {
                expected: step.check.captures[capture],
                given: captures[capture],
                passed: check(captures[capture], step.check.captures[capture])
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
          }

          // Check statusText
          if (step.check.statusText) {
            stepResult.checks.statusText = {
              expected: step.check.statusText,
              given: res.statusMessage,
              passed: check(res.statusMessage, step.check.statusText)
            }
          }

          // Check whether request was redirected
          if ('redirected' in step.check) {
            stepResult.checks.redirected = {
              expected: step.check.redirected,
              given: res.redirectUrls.length > 0,
              passed: res.redirectUrls.length > 0 === step.check.redirected
            }
          }

          // Check redirects
          if (step.check.redirects) {
            stepResult.checks.redirects = {
              expected: step.check.redirects,
              given: res.redirectUrls,
              passed: deepEqual(res.redirectUrls, step.check.redirects)
            }
          }

          // Check sha256
          if (step.check.sha256) {
            const hash = crypto.createHash('sha256').update(Buffer.from(responseData)).digest('hex')
            stepResult.checks.sha256 = {
              expected: step.check.sha256,
              given: hash,
              passed: step.check.sha256 === hash
            }
          }

          // Check md5
          if (step.check.md5) {
            const hash = crypto.createHash('md5').update(Buffer.from(responseData)).digest('hex')
            stepResult.checks.md5 = {
              expected: step.check.md5,
              given: hash,
              passed: step.check.md5 === hash
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
            }
          }

          // Check SSL certs
          if (step.check.ssl && sslCertificate) {
            stepResult.checks.ssl = {}
            if ('valid' in step.check.ssl) {
              stepResult.checks.ssl.valid = {
                expected: step.check.ssl.valid,
                given: stepResult.response.ssl?.valid,
                passed: stepResult.response.ssl?.valid === step.check.ssl.valid
              }
            }

            if ('signed' in step.check.ssl) {
              stepResult.checks.ssl.signed = {
                expected: step.check.ssl.signed,
                given: stepResult.response.ssl?.signed,
                passed: stepResult.response.ssl?.signed === step.check.ssl.signed
              }
            }

            if (step.check.ssl.daysUntilExpiration) {
              stepResult.checks.ssl.daysUntilExpiration = {
                expected: step.check.ssl.daysUntilExpiration,
                given: stepResult.response.ssl?.daysUntilExpiration,
                passed: check(stepResult.response.ssl?.daysUntilExpiration, step.check.ssl.daysUntilExpiration)
              }
            }
          }
        }

        stepResult.passed = didChecksPass(stepResult)
      } catch (error) {
        stepResult.passed = false
        stepResult.errored = true
        stepResult.errorMessage = (error as Error).message
        options?.ee?.emit('step:error', error)
      }
    }

    stepResult.duration = Date.now() - stepResult.timestamp.valueOf()
    testResult.steps.push(stepResult)
    previous = stepResult

    options?.ee?.emit('step:result', stepResult)
  }

  testResult.duration = testResult.steps.map(step => step.duration).reduce((a, b) => a + b)
  testResult.passed = testResult.steps.every(step => step.passed)

  options?.ee?.emit('test:result', testResult)
  return testResult
}
