import got, { Method, Headers, PlainResponse } from 'got'
import { makeRequest, gRPCRequestMetadata } from 'cool-grpc'
import { CookieJar } from 'tough-cookie'
import { renderObject } from 'liquidless'
import { fake } from 'liquidless-faker'
import { naughtystring } from 'liquidless-naughtystrings'
import xpath from 'xpath'
import FormData from 'form-data'
import * as cheerio from 'cheerio'
import { JSONPath } from 'jsonpath-plus'
import { DOMParser } from '@xmldom/xmldom'
import { EventEmitter } from 'node:events'
import crypto from 'crypto'
import fs from 'fs'
import yaml from 'js-yaml'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import pLimit from 'p-limit';
import { PeerCertificate, TLSSocket } from 'node:tls'
import { Agent } from 'node:https'
import path from 'node:path'
const { co2 } = require('@tgwf/co2')
import { Phase } from 'phasic'
import { Matcher, checkResult, CheckResult, CheckResults } from './matcher'
import { LoadTestCheck } from './loadtesting'
import { parseCSV, TestData } from './utils/testdata'
import { CapturesStorage, checkCondition, getCookie, didChecksPass } from './utils/runner'
import { Credential, CredentialRef, CredentialsStorage, HTTPCertificate, TLSCertificate, getAuthHeader, getClientCertificate, getTLSCertificate } from './utils/auth'
import { tryFile, StepFile } from './utils/files'
import { addCustomSchemas } from './utils/schema'

export type EnvironmentVariables = {
  [key: string]: string;
}

export type Workflow = {
  version: string
  name: string
  env?: EnvironmentVariables
  tests?: Tests
  include?: string[]
  components?: WorkflowComponents
  config?: WorkflowConfig
}

export type WorkflowComponents = {
  schemas?: {
    [key: string]: any
  }
  credentials?: CredentialsStorage
}

export type WorkflowConfig = {
  loadTest?: {
    phases: Phase[]
    check?: LoadTestCheck
  },
  continueOnFail?: boolean,
  http?: {
    baseURL?: string
    rejectUnauthorized?: boolean
    http2?: boolean
  }
  concurrency?: number
}

export type WorkflowOptions = {
  path?: string
  secrets?: WorkflowOptionsSecrets
  ee?: EventEmitter
  env?: EnvironmentVariables
  concurrency?: number
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
    bytesSent: number
    bytesReceived: number
    co2: number
  }
  path?: string
}

export type Test = {
  name?: string
  env?: object
  steps: Step[]
  testdata?: TestData
}

export type Tests = {
  [key: string]: Test
}

export type Step = {
  id?: string
  name?: string
  if?: string
  http?: HTTPStep
  grpc?: gRPCStep
}

export type HTTPStep = {
  url: string
  method: string
  headers?: HTTPStepHeaders
  params?: HTTPStepParams
  cookies?: HTTPStepCookies
  body?: string | StepFile
  form?: HTTPStepForm
  formData?: HTTPStepMultiPartForm
  auth?: CredentialRef | Credential
  json?: object
  graphql?: HTTPStepGraphQL
  trpc?: HTTPStepTRPC
  captures?: HTTPStepCaptures
  check?: HTTPStepCheck
  followRedirects?: boolean
  timeout?: number
  retries?: number
}

export type HTTPStepTRPC = {
  query?: {
    [key: string]: object
  } | {
    [key: string]: object
  }[]
  mutation?: {
    [key: string]: object
  }
}

export type gRPCStep = {
  proto: string | string[]
  host: string
  service: string
  method: string
  data: object
  metadata?: gRPCRequestMetadata
  auth?: CredentialRef | gRPCStepAuth
  captures?: gRPCStepCaptures
  check?: gRPCStepCheck
}

export type gRPCStepAuth = {
  tls?: Credential['tls']
}

export type HTTPStepHeaders = {
  [key: string]: string
}

export type HTTPStepParams = {
  [key: string]: string
}

export type HTTPStepCookies = {
  [key: string]: string
}

export type HTTPStepForm = {
  [key: string]: string
}

export type HTTPStepMultiPartForm = {
  [key: string]: string | StepFile
}

export type HTTPStepGraphQL = {
  query: string
  variables: object
}

export type HTTPStepCaptures = {
  [key: string]: HTTPStepCapture
}

export type gRPCStepCaptures = {
  [key: string]: gRPCStepCapture
}

export type HTTPStepCapture = {
  xpath?: string
  jsonpath?: string
  header?: string
  selector?: string
  cookie?: string
  regex?: string
  body?: boolean
}

export type gRPCStepCapture = {
  jsonpath?: string
}

export type HTTPStepCheck = {
  status?: number | Matcher[]
  statusText?: string | Matcher[]
  redirected?: boolean
  redirects?: string[]
  headers?: StepCheckValue | StepCheckMatcher
  body?: string | Matcher[]
  json?: object
  schema?: object
  jsonpath?: StepCheckJSONPath | StepCheckMatcher
  xpath?: StepCheckValue | StepCheckMatcher
  selectors?: StepCheckValue | StepCheckMatcher
  cookies?: StepCheckValue | StepCheckMatcher
  captures?: StepCheckCaptures
  sha256?: string
  md5?: string
  performance?: StepCheckPerformance | StepCheckMatcher
  ssl?: StepCheckSSL
  size?: number | Matcher[]
  requestSize?: number | Matcher[]
  bodySize?: number | Matcher[]
  co2?: number | Matcher[]
}

export type gRPCStepCheck = {
  json?: object
  schema?: object
  jsonpath?: StepCheckJSONPath | StepCheckMatcher
  captures?: StepCheckCaptures
  performance?: StepCheckPerformance | StepCheckMatcher
  size?: number | Matcher[]
  co2?: number | Matcher[]
}

export type StepCheckValue = {
  [key: string]: string
}

export type StepCheckJSONPath = {
  [key: string]: any
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

export type TestResult = {
  id: string
  name?: string
  steps: StepResult[]
  passed: boolean
  timestamp: Date
  duration: number
  co2: number
  bytesSent: number
  bytesReceived: number
}

export type StepResult = {
  type?: 'http' | 'grpc'
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
  responseTime: number
  co2: number
  request?: HTTPStepRequest | gRPCStepRequest
  response?: HTTPStepResponse | gRPCStepResponse
  bytesSent: number
  bytesReceived: number
}

export type HTTPStepRequest = {
  protocol: string
  url: string
  method: string
  headers?: HTTPStepHeaders
  body?: string | Buffer | FormData
  size?: number
}

export type gRPCStepRequest = {
  proto: string | string[]
  host: string
  service: string
  method: string
  metadata?: gRPCRequestMetadata
  data: object
  tls?: CredentialRef | Credential['tls']
  size?: number
}

export type HTTPStepResponse = {
  protocol: string
  status: number
  statusText?: string
  duration?: number
  contentType?: string
  timings: PlainResponse['timings']
  headers?: Headers
  ssl?: StepResponseSSL
  body: Buffer
  co2: number
  size?: number
  bodySize?: number
}

export type gRPCStepResponse = {
  body: object | object[]
  duration: number
  co2: number
  size: number
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
  schema?: CheckResult
  jsonpath?: CheckResults
  xpath?: CheckResults
  selectors?: CheckResults
  cookies?: CheckResults
  captures?: CheckResults
  status?: CheckResult
  statusText?: CheckResult
  body?: CheckResult
  sha256?: CheckResult
  md5?: CheckResult
  performance?: CheckResults
  ssl?: CheckResultSSL
  size?: CheckResult
  requestSize?: CheckResult
  bodySize?: CheckResult
  co2?: CheckResult
}

export type CheckResultSSL = {
  valid?: CheckResult
  signed?: CheckResult
  daysUntilExpiration?: CheckResult
}

const templateDelimiters = ['${{', '}}']

// Run from YAML string
export function runFromYAML(yamlString: string, options?: WorkflowOptions): Promise<WorkflowResult> {
  return run(yaml.load(yamlString) as Workflow, options)
}

// Run from test file
export async function runFromFile(path: string, options?: WorkflowOptions): Promise<WorkflowResult> {
  const testFile = await fs.promises.readFile(path)
  const config = yaml.load(testFile.toString()) as Workflow
  return run(config, { ...options, path })
}

// Run workflow
export async function run(workflow: Workflow, options?: WorkflowOptions): Promise<WorkflowResult> {
  const timestamp = new Date()
  const schemaValidator = new Ajv({ strictSchema: false })
  addFormats(schemaValidator)

  // Add schemas to schema Validator
  if (workflow.components?.schemas) {
    addCustomSchemas(schemaValidator, workflow.components.schemas)
  }

  const env = { ...workflow.env ?? {}, ...options?.env ?? {} }

  let credentials: CredentialsStorage | undefined
  if (workflow.components?.credentials) {
    credentials = renderObject(workflow.components?.credentials, { env }, { delimiters: templateDelimiters })
  }

  let tests = { ...workflow.tests ?? {} }

  if (workflow.include) {
    for (const workflowPath of workflow.include) {
      const testFile = await fs.promises.readFile(path.join(path.dirname(options?.path || __dirname), workflowPath))
      const test = yaml.load(testFile.toString()) as Workflow
      tests = { ...tests, ...test.tests }
    }
  }

  let concurrency_num = Object.keys(tests).length

  if(workflow.config?.concurrency || workflow.config?.concurrency == 0) {
    concurrency_num = workflow.config?.concurrency
  }
  if(options?.concurrency || options?.concurrency == 0){
    concurrency_num = options.concurrency
  }
  if (concurrency_num <= 0){
    concurrency_num = 1
  }

  let limit = pLimit(concurrency_num)

  let input:Promise<TestResult>[] = [];
  Object.entries(tests).map(([id, test]) => input.push(limit(()=>runTest(id, test, schemaValidator, options, workflow.config, env, credentials))))
  
  const testResults = await Promise.all(input)
  const workflowResult: WorkflowResult = {
    workflow,
    result: {
      tests: testResults,
      timestamp,
      passed: testResults.every(test => test.passed),
      duration: Date.now() - timestamp.valueOf(),
      co2: testResults.map(test => test.co2).reduce((a, b) => a + b),
      bytesSent: testResults.map(test => test.bytesSent).reduce((a, b) => a + b),
      bytesReceived: testResults.map(test => test.bytesSent).reduce((a, b) => a + b),
    },
    path: options?.path
  }

  options?.ee?.emit('workflow:result', workflowResult)
  return workflowResult
}

async function runTest(id: string, test: Test, schemaValidator: Ajv, options?: WorkflowOptions, config?: WorkflowConfig, env?: object, credentials?: CredentialsStorage): Promise<TestResult> {
  const testResult: TestResult = {
    id,
    name: test.name,
    steps: [],
    passed: true,
    timestamp: new Date(),
    duration: 0,
    co2: 0,
    bytesSent: 0,
    bytesReceived: 0
  }

  const captures: CapturesStorage = {}
  const cookies = new CookieJar()
  const ssw = new co2()
  let previous: StepResult | undefined
  let testData: object = {}

  // Load test data
  if (test.testdata) {
    const parsedCSV = await parseCSV(test.testdata, { ...test.testdata.options, workflowPath: options?.path })
    testData = parsedCSV[Math.floor(Math.random() * parsedCSV.length)]
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
      duration: 0,
      responseTime: 0,
      bytesSent: 0,
      bytesReceived: 0,
      co2: 0
    }

    // Skip current step is the previous one failed or condition was unmet
    if (!config?.continueOnFail && (previous && !previous.passed)) {
      stepResult.passed = false
      stepResult.errorMessage = 'Step was skipped because previous one failed'
      stepResult.skipped = true
    } else if (step.if && !checkCondition(step.if, { captures, env: { ...env, ...test.env } })) {
      stepResult.skipped = true
    } else {
      try {
        step = renderObject(step, {
          captures,
          env: { ...env, ...test.env },
          secrets: options?.secrets,
          testdata: testData
        },
        {
          filters: {
            fake,
            naughtystring
          },
          delimiters: templateDelimiters
        })

        if (step.http) {
          stepResult.type = 'http'
          let requestBody: string | FormData | Buffer | undefined

          // Prefix URL
          if (config?.http?.baseURL) {
            try {
              new URL(step.http.url)
            } catch {
              step.http.url = config.http.baseURL + step.http.url
            }
          }

          // Body
          if (step.http.body) {
            requestBody = await tryFile(step.http.body, { workflowPath: options?.path })
          }

          //  JSON
          if (step.http.json) {
            requestBody = JSON.stringify(step.http.json)
          }

          // GraphQL
          if (step.http.graphql) {
            step.http.method = 'POST'
            if (!step.http.headers) step.http.headers = {}
            step.http.headers['Content-Type'] = 'application/json'
            requestBody = JSON.stringify(step.http.graphql)
          }

          // tRPC
          if (step.http.trpc) {
            if (step.http.trpc.query) {
              step.http.method = 'GET'

              // tRPC Batch queries
              if (Array.isArray(step.http.trpc.query)) {
                const payload = step.http.trpc.query.map(e => {
                  return {
                    op: Object.keys(e)[0],
                    data: Object.values(e)[0]
                  }
                })

                const procedures = payload.map(p => p.op).join(',')
                step.http.url = step.http.url + '/' + procedures.replaceAll('/', '.')
                step.http.params = {
                  batch: '1',
                  input: JSON.stringify(Object.assign({}, payload.map(p => p.data)))
                }
              } else {
                const [procedure, data] = Object.entries(step.http.trpc.query)[0]
                step.http.url = step.http.url + '/' + procedure.replaceAll('/', '.')
                step.http.params = {
                  input: JSON.stringify(data)
                }
              }
            }

            if (step.http.trpc.mutation) {
              const [procedure, data] = Object.entries(step.http.trpc.mutation)[0]
              step.http.method = 'POST'
              step.http.url = step.http.url + '/' + procedure
              requestBody = JSON.stringify(data)
            }
          }

          // Form Data
          if (step.http.form) {
            const formData = new URLSearchParams()
            for (const field in step.http.form) {
              formData.append(field, step.http.form[field])
            }

            requestBody = formData.toString()
          }

          // Multipart Form Data
          if (step.http.formData) {
            const formData = new FormData()
            for (const field in step.http.formData) {
              if (typeof step.http.formData[field] === 'string') {
                formData.append(field, step.http.formData[field])
              }

              if ((step.http.formData[field] as StepFile).file) {
                const file = await fs.promises.readFile(path.join(path.dirname(options?.path || __dirname), (step.http.formData[field] as StepFile).file))
                formData.append(field, file)
              }
            }

            requestBody = formData
          }

          // Auth
          let clientCredentials: HTTPCertificate | undefined
          if (step.http.auth) {
            const authHeader = await getAuthHeader(step.http.auth, credentials)
            if (authHeader) {
              if (!step.http.headers) step.http.headers = {}
              step.http.headers['Authorization'] = authHeader
            }

            clientCredentials = await getClientCertificate(step.http.auth, credentials, { workflowPath: options?.path })
          }

          // Set Cookies
          if (step.http.cookies) {
            for (const cookie in step.http.cookies) {
              await cookies.setCookie(cookie + '=' + step.http.cookies[cookie], step.http.url)
            }
          }

          let sslCertificate: PeerCertificate | undefined
          let requestSize: number | undefined = 0
          let responseSize: number | undefined = 0

          // Make a request
          const agent = new Agent({
            maxCachedSessions: 0
          })

          const res = await got(step.http.url, {
            agent: {
              https: agent
            },
            method: step.http.method as Method,
            headers: { ...step.http.headers },
            body: requestBody,
            searchParams: step.http.params ? new URLSearchParams(step.http.params) : undefined,
            throwHttpErrors: false,
            followRedirect: step.http.followRedirects ?? true,
            timeout: step.http.timeout,
            retry: step.http.retries ?? 0,
            cookieJar: cookies,
            http2: config?.http?.http2 ?? false,
            https: {
              ...clientCredentials,
              rejectUnauthorized: config?.http?.rejectUnauthorized ?? true
            }
          })
            .on('request', request => options?.ee?.emit('step:http_request', request))
            .on('request', request => {
              request.once('socket', s => {
                s.once('close', () => {
                  requestSize = request.socket?.bytesWritten
                  responseSize = request.socket?.bytesRead
                })
              })
            })
            .on('response', response => options?.ee?.emit('step:http_response', response))
            .on('response', response => {
              if ((response.socket as TLSSocket).getPeerCertificate) {
                sslCertificate = (response.socket as TLSSocket).getPeerCertificate()
                if (Object.keys(sslCertificate).length === 0) sslCertificate = undefined
              }
            })

          const responseData = res.rawBody
          const body = new TextDecoder().decode(responseData)

          stepResult.request = {
            protocol: 'HTTP/1.1',
            url: res.url,
            method: step.http.method,
            headers: step.http.headers,
            body: requestBody,
            size: requestSize
          }

          stepResult.response = {
            protocol: `HTTP/${res.httpVersion}`,
            status: res.statusCode,
            statusText: res.statusMessage,
            duration: res.timings.phases.total,
            headers: res.headers,
            contentType: res.headers['content-type']?.split(';')[0],
            timings: res.timings,
            body: responseData,
            co2: ssw.perByte(responseData.length),
            size: responseSize,
            bodySize: responseData.length
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
          if (step.http.captures) {
            for (const name in step.http.captures) {
              const capture = step.http.captures[name]

              if (capture.jsonpath) {
                try {
                  const json = JSON.parse(body)
                  captures[name] = JSONPath({ path: capture.jsonpath, json })[0]
                } catch {
                  captures[name] = undefined
                }
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

              if (capture.body) {
                captures[name] = body
              }
            }
          }

          if (step.http.check) {
            stepResult.checks = {}

            // Check headers
            if (step.http.check.headers) {
              stepResult.checks.headers = {}

              for (const header in step.http.check.headers) {
                stepResult.checks.headers[header] = checkResult(res.headers[header.toLowerCase()], step.http.check.headers[header])
              }
            }

            // Check body
            if (step.http.check.body) {
              stepResult.checks.body = checkResult(body.trim(), step.http.check.body)
            }

            // Check JSON
            if (step.http.check.json) {
              try {
                const json = JSON.parse(body)
                stepResult.checks.json = checkResult(json, step.http.check.json)
              } catch {
                stepResult.checks.json = {
                  expected: step.http.check.json,
                  given: body,
                  passed: false
                }
              }
            }

            // Check Schema
            if (step.http.check.schema) {
              let sample = body

              if (res.headers['content-type']?.includes('json')) {
                sample = JSON.parse(body)
              }

              const validate = schemaValidator.compile(step.http.check.schema)
              stepResult.checks.schema = {
                expected: step.http.check.schema,
                given: sample,
                passed: validate(sample)
              }
            }

            // Check JSONPath
            if (step.http.check.jsonpath) {
              stepResult.checks.jsonpath = {}
              try {
                const json = JSON.parse(body)
                for (const path in step.http.check.jsonpath) {
                  const result = JSONPath({ path, json })
                  stepResult.checks.jsonpath[path] = checkResult(result[0], step.http.check.jsonpath[path])
                }
              } catch {
                for (const path in step.http.check.jsonpath) {
                  stepResult.checks.jsonpath[path] = {
                    expected: step.http.check.jsonpath[path],
                    given: body,
                    passed: false
                  }
                }
              }
            }

            // Check XPath
            if (step.http.check.xpath) {
              stepResult.checks.xpath = {}

              for (const path in step.http.check.xpath) {
                const dom = new DOMParser().parseFromString(body)
                const result = xpath.select(path, dom)
                stepResult.checks.xpath[path] = checkResult(result.length > 0 ? (result[0] as any).firstChild.data : undefined, step.http.check.xpath[path])
              }
            }

            // Check HTML5 Selectors
            if (step.http.check.selectors) {
              stepResult.checks.selectors = {}
              const dom = cheerio.load(body)

              for (const selector in step.http.check.selectors) {
                const result = dom(selector).html()
                stepResult.checks.selectors[selector] = checkResult(result, step.http.check.selectors[selector])
              }
            }

            // Check Cookies
            if (step.http.check.cookies) {
              stepResult.checks.cookies = {}

              for (const cookie in step.http.check.cookies) {
                const value = getCookie(cookies, cookie, res.url)
                stepResult.checks.cookies[cookie] = checkResult(value, step.http.check.cookies[cookie])
              }
            }

            // Check captures
            if (step.http.check.captures) {
              stepResult.checks.captures = {}

              for (const capture in step.http.check.captures) {
                stepResult.checks.captures[capture] = checkResult(captures[capture], step.http.check.captures[capture])
              }
            }

            // Check status
            if (step.http.check.status) {
              stepResult.checks.status = checkResult(res.statusCode, step.http.check.status)
            }

            // Check statusText
            if (step.http.check.statusText) {
              stepResult.checks.statusText = checkResult(res.statusMessage, step.http.check.statusText)
            }

            // Check whether request was redirected
            if ('redirected' in step.http.check) {
              stepResult.checks.redirected = checkResult(res.redirectUrls.length > 0, step.http.check.redirected)
            }

            // Check redirects
            if (step.http.check.redirects) {
              stepResult.checks.redirects = checkResult(res.redirectUrls, step.http.check.redirects)
            }

            // Check sha256
            if (step.http.check.sha256) {
              const hash = crypto.createHash('sha256').update(Buffer.from(responseData)).digest('hex')
              stepResult.checks.sha256 = checkResult(hash, step.http.check.sha256)
            }

            // Check md5
            if (step.http.check.md5) {
              const hash = crypto.createHash('md5').update(Buffer.from(responseData)).digest('hex')
              stepResult.checks.md5 = checkResult(hash, step.http.check.md5)
            }

            // Check Performance
            if (step.http.check.performance) {
              stepResult.checks.performance = {}

              for (const metric in step.http.check.performance) {
                stepResult.checks.performance[metric] = checkResult((res.timings.phases as any)[metric], step.http.check.performance[metric])
              }
            }

            // Check SSL certs
            if (step.http.check.ssl && sslCertificate) {
              stepResult.checks.ssl = {}

              if ('valid' in step.http.check.ssl) {
                stepResult.checks.ssl.valid = checkResult(stepResult.response.ssl?.valid, step.http.check.ssl.valid)
              }

              if ('signed' in step.http.check.ssl) {
                stepResult.checks.ssl.signed = checkResult(stepResult.response.ssl?.signed, step.http.check.ssl.signed)
              }

              if (step.http.check.ssl.daysUntilExpiration) {
                stepResult.checks.ssl.daysUntilExpiration = checkResult(stepResult.response.ssl?.daysUntilExpiration, step.http.check.ssl.daysUntilExpiration)
              }
            }

            // Check request/response size
            if (step.http.check.size) {
              stepResult.checks.size = checkResult(responseSize, step.http.check.size)
            }

            if (step.http.check.requestSize) {
              stepResult.checks.requestSize = checkResult(requestSize, step.http.check.requestSize)
            }

            if (step.http.check.bodySize) {
              stepResult.checks.bodySize = checkResult(stepResult.response.bodySize, step.http.check.bodySize)
            }

            // Check co2 emissions
            if (step.http.check.co2) {
              stepResult.checks.co2 = checkResult(stepResult.response.co2, step.http.check.co2)
            }
          }
        }

        if (step.grpc) {
          stepResult.type = 'grpc'

          // Load TLS configuration from file or string
          let tlsConfig: TLSCertificate | undefined
          if (step.grpc.auth) {
            tlsConfig = await getTLSCertificate(step.grpc.auth, credentials, { workflowPath: options?.path })
          }

          const request: gRPCStepRequest = {
            proto: Array.isArray(step.grpc.proto)
              ? step.grpc.proto.map(proto => path.join(path.dirname(options?.path || __dirname), proto))
              : path.join(path.dirname(options?.path || __dirname), step.grpc.proto),
            host: step.grpc.host,
            metadata: step.grpc.metadata,
            service: step.grpc.service,
            method: step.grpc.method,
            data: step.grpc.data
          }

          const { data, size } = await makeRequest(step.grpc.proto, {
            ...request,
            tls: tlsConfig,
            beforeRequest: (req) => {
              stepResult.request = request
              options?.ee?.emit('step:grpc_request', request)
            },
            afterResponse: (res) => {
              stepResult.response = {
                body: res.data,
                duration: Date.now() - stepResult.timestamp.valueOf(),
                co2: ssw.perByte(res.size),
                size: res.size
              }

              options?.ee?.emit('step:grpc_response', res)
            }
          })

          // Captures
          if (step.grpc.captures) {
            for (const name in step.grpc.captures) {
              const capture = step.grpc.captures[name]
              if (capture.jsonpath) {
                captures[name] = JSONPath({ path: capture.jsonpath, json: data })[0]
              }
            }
          }

          if (step.grpc.check) {
            stepResult.checks = {}

            // Check JSON
            if (step.grpc.check.json) {
              stepResult.checks.json = checkResult(data, step.grpc.check.json)
            }

            // Check Schema
            if (step.grpc.check.schema) {
              const validate = schemaValidator.compile(step.grpc.check.schema)
              stepResult.checks.schema = {
                expected: step.grpc.check.schema,
                given: data,
                passed: validate(data)
              }
            }

            // Check JSONPath
            if (step.grpc.check.jsonpath) {
              stepResult.checks.jsonpath = {}

              for (const path in step.grpc.check.jsonpath) {
                const result = JSONPath({ path, json: data })
                stepResult.checks.jsonpath[path] = checkResult(result[0], step.grpc.check.jsonpath[path])
              }
            }

            // Check captures
            if (step.grpc.check.captures) {
              stepResult.checks.captures = {}

              for (const capture in step.grpc.check.captures) {
                stepResult.checks.captures[capture] = checkResult(captures[capture], step.grpc.check.captures[capture])
              }
            }

            // Check performance
            if (step.grpc.check.performance) {
              stepResult.checks.performance = {}

              if (step.grpc.check.performance.total) {
                stepResult.checks.performance.total = checkResult(stepResult.response?.duration, step.grpc.check.performance.total)
              }
            }

            // Check byte size
            if (step.grpc.check.size) {
              stepResult.checks.size = checkResult(size, step.grpc.check.size)
            }

            // Check co2 emissions
            if (step.grpc.check.co2) {
              stepResult.checks.co2 = checkResult(stepResult.response?.co2, step.grpc.check.co2)
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
    stepResult.responseTime = stepResult.response?.duration || 0
    stepResult.co2 = stepResult.response?.co2 || 0
    stepResult.bytesSent = stepResult.request?.size || 0
    stepResult.bytesReceived = stepResult.response?.size || 0
    testResult.steps.push(stepResult)
    previous = stepResult

    options?.ee?.emit('step:result', stepResult)
  }

  testResult.duration = Date.now() - testResult.timestamp.valueOf()
  testResult.co2 = testResult.steps.map(step => step.co2).reduce((a, b) => a + b)
  testResult.bytesSent = testResult.steps.map(step => step.bytesSent).reduce((a, b) => a + b)
  testResult.bytesReceived = testResult.steps.map(step => step.bytesReceived).reduce((a, b) => a + b)
  testResult.passed = testResult.steps.every(step => step.passed)

  options?.ee?.emit('test:result', testResult)
  return testResult
}
