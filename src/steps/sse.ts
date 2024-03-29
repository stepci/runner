import EventSource from 'eventsource'
import { JSONPath } from 'jsonpath-plus'
const { co2 } = require('@tgwf/co2')
import { CapturesStorage } from './../utils/runner'
import { CheckResult, CheckResults, Matcher } from '../matcher'

import Ajv from 'ajv'
import {
  StepCheckJSONPath,
  StepCheckMatcher,
  StepRunResult,
  WorkflowConfig,
  WorkflowOptions,
} from '..'
import { checkResult } from '../matcher'
import { Credential, getAuthHeader } from './../utils/auth'
import { HTTPStepHeaders, HTTPStepParams } from './http'

export type SSEStep = {
  url: string
  headers?: HTTPStepHeaders
  params?: HTTPStepParams
  auth?: Credential
  json?: object
  check?: {
    messages?: SSEStepCheck[]
  }
  timeout?: number
}

export type SSEStepCheck = {
  id: string
  json?: object
  schema?: object
  jsonpath?: StepCheckJSONPath | StepCheckMatcher
  body?: string | Matcher[]
}

export type SSEStepRequest = {
  url?: string
  headers?: HTTPStepHeaders
  size?: number
}

export type SSEStepResponse = {
  contentType?: string
  duration?: number
  body: Buffer
  size?: number
  bodySize?: number
  co2: number
}

export default async function (
  params: SSEStep,
  captures: CapturesStorage,
  schemaValidator: Ajv,
  options?: WorkflowOptions,
  config?: WorkflowConfig
) {
  const stepResult: StepRunResult = {
    type: 'sse',
  }

  const ssw = new co2()

  stepResult.type = 'sse'

  if (params.auth) {
    const authHeader = await getAuthHeader(params.auth)
    if (authHeader) {
      if (!params.headers) params.headers = {}
      params.headers['Authorization'] = authHeader
    }
  }

  await new Promise((resolve, reject) => {
    const ev = new EventSource(params.url || '', {
      headers: params.headers,
      rejectUnauthorized: config?.http?.rejectUnauthorized ?? false,
    })

    const messages: MessageEvent[] = []

    const timeout = setTimeout(() => {
      ev.close()

      const messagesBuffer = Buffer.from(messages.map((m) => m.data).join('\n'))

      stepResult.request = {
        url: params.url,
        headers: params.headers,
        size: 0,
      }

      stepResult.response = {
        contentType: 'text/event-stream',
        body: messagesBuffer,
        size: messagesBuffer.length,
        bodySize: messagesBuffer.length,
        co2: ssw.perByte(messagesBuffer.length),
        duration: params.timeout,
      }

      resolve(true)
    }, params.timeout || 10000)

    ev.onerror = (error) => {
      clearTimeout(timeout)
      ev.close()
      reject(error)
    }

    if (params.check) {
      if (!stepResult.checks) stepResult.checks = {}
      if (!stepResult.checks.messages) stepResult.checks.messages = {}

      params.check.messages?.forEach((check) => {
        ;(stepResult.checks?.messages as any)[check.id] = {
          expected: check.body || check.json || check.jsonpath || check.schema,
          given: undefined,
          passed: false,
        }
      })
    }

    ev.onmessage = (message) => {
      messages.push(message)

      if (params.check) {
        params.check.messages?.forEach((check, id) => {
          if (check.body) {
            const result = checkResult(message.data, check.body)
            if (result.passed && stepResult.checks?.messages)
              (stepResult.checks.messages as CheckResults)[check.id] = result
          }

          if (check.json) {
            try {
              const result = checkResult(JSON.parse(message.data), check.json)
              if (result.passed && stepResult.checks?.messages)
                (stepResult.checks.messages as CheckResults)[check.id] = result
            } catch (e) {
              reject(e)
            }
          }

          if (check.schema) {
            try {
              const sample = JSON.parse(message.data)
              const validate = schemaValidator.compile(check.schema)
              const result = {
                expected: check.schema,
                given: sample,
                passed: validate(sample),
              }

              if (result.passed && stepResult.checks?.messages)
                (stepResult.checks.messages as CheckResults)[check.id] = result
            } catch (e) {
              reject(e)
            }
          }

          if (check.jsonpath) {
            try {
              let jsonpathResult: CheckResults = {}
              const json = JSON.parse(message.data)
              for (const path in check.jsonpath) {
                const result = JSONPath({ path, json })
                jsonpathResult[path] = checkResult(
                  result[0],
                  check.jsonpath[path]
                )
              }

              const passed = Object.values(jsonpathResult)
                .map((c: CheckResult) => c.passed)
                .every((passed) => passed)

              if (passed && stepResult.checks?.messages)
                (stepResult.checks.messages as CheckResults)[check.id] = {
                  expected: check.jsonpath,
                  given: jsonpathResult,
                  passed,
                }
            } catch (e) {
              reject(e)
            }
          }
        })
      }
    }
  })

  return stepResult
}
