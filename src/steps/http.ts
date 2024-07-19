import got, { Method, Headers, PlainResponse } from 'got'
import parseDuration from 'parse-duration'
import { ProxyAgent } from 'proxy-agent'
import xpath from 'xpath'
import * as cheerio from 'cheerio'
import { DOMParser } from '@xmldom/xmldom'
import { JSONPath } from 'jsonpath-plus'
const { co2 } = require('@tgwf/co2')
import FormData from 'form-data'
import Ajv from 'ajv'
import { CookieJar } from 'tough-cookie'
import fs from 'fs'
import { PeerCertificate, TLSSocket } from 'node:tls'
import crypto from 'node:crypto'
import { Agent } from 'node:https'
import path from 'node:path'
import { tryFile, StepFile } from './../utils/files'
import { CapturesStorage, getCookie } from './../utils/runner'
import {
  HTTPCertificate,
  getAuthHeader,
  getClientCertificate,
  Credential,
} from './../utils/auth'
import {
  StepCheckCaptures,
  StepCheckJSONPath,
  StepCheckMatcher,
  StepCheckPerformance,
  StepCheckValue,
  StepRunResult,
  WorkflowConfig,
  WorkflowOptions,
} from '..'
import { Matcher, checkResult } from '../matcher'

export type HTTPStepBase = {
  url: string
  method: string
  headers?: HTTPStepHeaders
  params?: HTTPStepParams
  cookies?: HTTPStepCookies
  auth?: Credential
  captures?: HTTPStepCaptures
  check?: HTTPStepCheck
  followRedirects?: boolean
  timeout?: string | number
  retries?: number
}

export type HTTPStep = {
  body?: string | StepFile
  form?: HTTPStepForm
  formData?: HTTPStepMultiPartForm
  json?: object
  graphql?: HTTPStepGraphQL
  trpc?: HTTPStepTRPC
} & HTTPStepBase

export type HTTPStepTRPC = {
  query?:
    | {
        [key: string]: object
      }
    | {
        [key: string]: object
      }[]
  mutation?: {
    [key: string]: object
  }
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

export type HTTPRequestPart = {
  type?: string
  value?: string
  json?: object
}

export type HTTPStepMultiPartForm = {
  [key: string]: string | StepFile | HTTPRequestPart
}

export type HTTPStepGraphQL = {
  query: string
  variables: object
}

export type HTTPStepCaptures = {
  [key: string]: HTTPStepCapture
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

export type HTTPStepCheck = {
  status?: string | number | Matcher[]
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

export type StepCheckSSL = {
  valid?: boolean
  signed?: boolean
  daysUntilExpiration?: number | Matcher[]
}

export type HTTPStepRequest = {
  protocol: string
  url: string
  method?: string
  headers?: HTTPStepHeaders
  body?: string | Buffer | FormData
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

export type StepResponseSSL = {
  valid: boolean
  signed: boolean
  validUntil: Date
  daysUntilExpiration: number
}

export default async function (
  params: HTTPStep,
  captures: CapturesStorage,
  cookies: CookieJar,
  schemaValidator: Ajv,
  options?: WorkflowOptions,
  config?: WorkflowConfig
) {
  const stepResult: StepRunResult = {
    type: 'http',
  }

  const ssw = new co2()

  let requestBody: string | Buffer | FormData | undefined
  let url = params.url || ''

  // Prefix URL
  if (config?.http?.baseURL) {
    try {
      new URL(url)
    } catch {
      url = config.http.baseURL + params.url
    }
  }

  // Body
  if (params.body) {
    requestBody = await tryFile(params.body, {
      workflowPath: options?.path,
    })
  }

  //  JSON
  if (params.json) {
    if (!params.headers) params.headers = {}
    if (!params.headers['Content-Type']) {
      params.headers['Content-Type'] = 'application/json'
    }

    requestBody = JSON.stringify(params.json)
  }

  // GraphQL
  if (params.graphql) {
    params.method = 'POST'
    if (!params.headers) params.headers = {}
    params.headers['Content-Type'] = 'application/json'
    requestBody = JSON.stringify(params.graphql)
  }

  // tRPC
  if (params.trpc) {
    if (params.trpc.query) {
      params.method = 'GET'

      // tRPC Batch queries
      if (Array.isArray(params.trpc.query)) {
        const payload = params.trpc.query.map((e) => {
          return {
            op: Object.keys(e)[0],
            data: Object.values(e)[0],
          }
        })

        const procedures = payload.map((p) => p.op).join(',')
        url = url + '/' + procedures.replaceAll('/', '.')
        params.params = {
          batch: '1',
          input: JSON.stringify(
            Object.assign(
              {},
              payload.map((p) => p.data)
            )
          ),
        }
      } else {
        const [procedure, data] = Object.entries(params.trpc.query)[0]
        url = url + '/' + procedure.replaceAll('/', '.')
        params.params = {
          input: JSON.stringify(data),
        }
      }
    }

    if (params.trpc.mutation) {
      const [procedure, data] = Object.entries(params.trpc.mutation)[0]
      params.method = 'POST'
      url = url + '/' + procedure
      requestBody = JSON.stringify(data)
    }
  }

  // Form Data
  if (params.form) {
    const formData = new URLSearchParams()
    for (const field in params.form) {
      formData.append(field, params.form[field])
    }

    requestBody = formData.toString()
  }

  // Multipart Form Data
  if (params.formData) {
    const formData = new FormData()
    for (const field in params.formData) {
      const appendOptions = {} as FormData.AppendOptions
      if (typeof params.formData[field] != 'object') {
        formData.append(field, params.formData[field])
      } else if (Array.isArray(params.formData[field])) {
        const stepFiles = params.formData[field] as StepFile[];
        for (const stepFile of stepFiles) {
          const filepath = path.join(
            path.dirname(options?.path || __dirname),
            stepFile.file,
          )
          appendOptions.filename = path.parse(filepath).base;
          formData.append(
            field,
            await fs.promises.readFile(filepath),
            appendOptions,
          )
        }
      } else if ((params.formData[field] as StepFile).file) {
        const stepFile = params.formData[field] as StepFile
        const filepath = path.join(
          path.dirname(options?.path || __dirname),
          stepFile.file
        )
        appendOptions.filename = path.parse(filepath).base
        formData.append(field, await fs.promises.readFile(filepath), appendOptions)
      } else {
        const requestPart = params.formData[field] as HTTPRequestPart
        if ('json' in requestPart) {
          appendOptions.contentType = 'application/json'
          formData.append(field, JSON.stringify(requestPart.json), appendOptions)
        } else {
          appendOptions.contentType = requestPart.type
          formData.append(field, requestPart.value, appendOptions)
        }
      }
    }

    requestBody = formData
  }

  // Auth
  let clientCredentials: HTTPCertificate | undefined
  if (params.auth) {
    const authHeader = await getAuthHeader(params.auth)
    if (authHeader) {
      if (!params.headers) params.headers = {}
      params.headers['Authorization'] = authHeader
    }

    clientCredentials = await getClientCertificate(params.auth.certificate, {
      workflowPath: options?.path,
    })
  }

  // Set Cookies
  if (params.cookies) {
    for (const cookie in params.cookies) {
      await cookies.setCookie(cookie + '=' + params.cookies[cookie], url)
    }
  }

  let sslCertificate: PeerCertificate | undefined
  let requestSize: number | undefined = 0
  let responseSize: number | undefined = 0

  // Make a request
  const res = await got(url, {
    agent: {
      http: new ProxyAgent(),
      https: new ProxyAgent(new Agent({ maxCachedSessions: 0 })),
    },
    method: params.method as Method,
    headers: { ...params.headers },
    body: requestBody,
    searchParams: params.params
      ? new URLSearchParams(params.params)
      : undefined,
    throwHttpErrors: false,
    followRedirect: params.followRedirects ?? true,
    timeout:
      typeof params.timeout === 'string'
        ? parseDuration(params.timeout)
        : params.timeout,
    retry: params.retries ?? 0,
    cookieJar: cookies,
    http2: config?.http?.http2 ?? false,
    https: {
      ...clientCredentials,
      rejectUnauthorized: config?.http?.rejectUnauthorized ?? false,
    },
  })
    .on('request', (request) => options?.ee?.emit('step:http_request', request))
    .on('request', (request) => {
      request.once('socket', (s) => {
        s.once('close', () => {
          requestSize = request.socket?.bytesWritten
          responseSize = request.socket?.bytesRead
        })
      })
    })
    .on('response', (response) =>
      options?.ee?.emit('step:http_response', response)
    )
    .on('response', (response) => {
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
    method: params.method,
    headers: params.headers,
    body: requestBody,
    size: requestSize,
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
    size: responseSize,
    bodySize: responseData.length,
    co2: ssw.perByte(responseData.length),
  }

  if (sslCertificate) {
    stepResult.response.ssl = {
      valid: new Date(sslCertificate.valid_to) > new Date(),
      signed: sslCertificate.issuer.CN !== sslCertificate.subject.CN,
      validUntil: new Date(sslCertificate.valid_to),
      daysUntilExpiration: Math.round(
        Math.abs(
          new Date().valueOf() - new Date(sslCertificate.valid_to).valueOf()
        ) /
          (24 * 60 * 60 * 1000)
      ),
    }
  }

  // Captures
  if (params.captures) {
    for (const name in params.captures) {
      const capture = params.captures[name]

      if (capture.jsonpath) {
        try {
          const json = JSON.parse(body)
          captures[name] = JSONPath({ path: capture.jsonpath, json, wrap: false })
        } catch {
          captures[name] = undefined
        }
      }

      if (capture.xpath) {
        const dom = new DOMParser().parseFromString(body)
        const result = xpath.select(capture.xpath, dom)
        captures[name] =
          result.length > 0 ? (result[0] as any).firstChild.data : undefined
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

  if (params.check) {
    stepResult.checks = {}

    // Check headers
    if (params.check.headers) {
      stepResult.checks.headers = {}

      for (const header in params.check.headers) {
        stepResult.checks.headers[header] = checkResult(
          res.headers[header.toLowerCase()],
          params.check.headers[header]
        )
      }
    }

    // Check body
    if (params.check.body) {
      stepResult.checks.body = checkResult(body.trim(), params.check.body)
    }

    // Check JSON
    if (params.check.json) {
      try {
        const json = JSON.parse(body)
        stepResult.checks.json = checkResult(json, params.check.json)
      } catch {
        stepResult.checks.json = {
          expected: params.check.json,
          given: body,
          passed: false,
        }
      }
    }

    // Check Schema
    if (params.check.schema) {
      let sample = body

      if (res.headers['content-type']?.includes('json')) {
        sample = JSON.parse(body)
      }

      const validate = schemaValidator.compile(params.check.schema)
      stepResult.checks.schema = {
        expected: params.check.schema,
        given: sample,
        passed: validate(sample),
      }
    }

    // Check JSONPath
    if (params.check.jsonpath) {
      stepResult.checks.jsonpath = {}
      try {
        const json = JSON.parse(body)
        for (const path in params.check.jsonpath) {
          const result = JSONPath({ path, json, wrap: false })
          stepResult.checks.jsonpath[path] = checkResult(
            result,
            params.check.jsonpath[path]
          )
        }
      } catch {
        for (const path in params.check.jsonpath) {
          stepResult.checks.jsonpath[path] = {
            expected: params.check.jsonpath[path],
            given: body,
            passed: false,
          }
        }
      }
    }

    // Check XPath
    if (params.check.xpath) {
      stepResult.checks.xpath = {}

      for (const path in params.check.xpath) {
        const dom = new DOMParser().parseFromString(body)
        const result = xpath.select(path, dom)
        stepResult.checks.xpath[path] = checkResult(
          result.length > 0 ? (result[0] as any).firstChild.data : undefined,
          params.check.xpath[path]
        )
      }
    }

    // Check HTML5 Selectors
    if (params.check.selectors) {
      stepResult.checks.selectors = {}
      const dom = cheerio.load(body)

      for (const selector in params.check.selectors) {
        const result = dom(selector).html()
        stepResult.checks.selectors[selector] = checkResult(
          result,
          params.check.selectors[selector]
        )
      }
    }

    // Check Cookies
    if (params.check.cookies) {
      stepResult.checks.cookies = {}

      for (const cookie in params.check.cookies) {
        const value = getCookie(cookies, cookie, res.url)
        stepResult.checks.cookies[cookie] = checkResult(
          value,
          params.check.cookies[cookie]
        )
      }
    }

    // Check captures
    if (params.check.captures) {
      stepResult.checks.captures = {}

      for (const capture in params.check.captures) {
        stepResult.checks.captures[capture] = checkResult(
          captures[capture],
          params.check.captures[capture]
        )
      }
    }

    // Check status
    if (params.check.status) {
      stepResult.checks.status = checkResult(
        res.statusCode,
        params.check.status
      )
    }

    // Check statusText
    if (params.check.statusText) {
      stepResult.checks.statusText = checkResult(
        res.statusMessage,
        params.check.statusText
      )
    }

    // Check whether request was redirected
    if ('redirected' in params.check) {
      stepResult.checks.redirected = checkResult(
        res.redirectUrls.length > 0,
        params.check.redirected
      )
    }

    // Check redirects
    if (params.check.redirects) {
      stepResult.checks.redirects = checkResult(
        res.redirectUrls,
        params.check.redirects
      )
    }

    // Check sha256
    if (params.check.sha256) {
      const hash = crypto
        .createHash('sha256')
        .update(Buffer.from(responseData))
        .digest('hex')
      stepResult.checks.sha256 = checkResult(hash, params.check.sha256)
    }

    // Check md5
    if (params.check.md5) {
      const hash = crypto
        .createHash('md5')
        .update(Buffer.from(responseData))
        .digest('hex')
      stepResult.checks.md5 = checkResult(hash, params.check.md5)
    }

    // Check Performance
    if (params.check.performance) {
      stepResult.checks.performance = {}

      for (const metric in params.check.performance) {
        stepResult.checks.performance[metric] = checkResult(
          (res.timings.phases as any)[metric],
          params.check.performance[metric]
        )
      }
    }

    // Check SSL certs
    if (params.check.ssl && sslCertificate) {
      stepResult.checks.ssl = {}

      if ('valid' in params.check.ssl) {
        stepResult.checks.ssl.valid = checkResult(
          stepResult.response?.ssl.valid,
          params.check.ssl.valid
        )
      }

      if ('signed' in params.check.ssl) {
        stepResult.checks.ssl.signed = checkResult(
          stepResult.response?.ssl.signed,
          params.check.ssl.signed
        )
      }

      if (params.check.ssl.daysUntilExpiration) {
        stepResult.checks.ssl.daysUntilExpiration = checkResult(
          stepResult.response?.ssl.daysUntilExpiration,
          params.check.ssl.daysUntilExpiration
        )
      }
    }

    // Check request/response size
    if (params.check.size) {
      stepResult.checks.size = checkResult(responseSize, params.check.size)
    }

    if (params.check.requestSize) {
      stepResult.checks.requestSize = checkResult(
        requestSize,
        params.check.requestSize
      )
    }

    if (params.check.bodySize) {
      stepResult.checks.bodySize = checkResult(
        stepResult.response?.bodySize,
        params.check.bodySize
      )
    }

    if (params.check.co2) {
      stepResult.checks.co2 = checkResult(
        stepResult.response.co2,
        params.check.co2
      )
    }
  }

  return stepResult
}
