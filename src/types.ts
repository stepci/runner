import { EventEmitter } from "node:events"
import { Matcher } from "./matcher"

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

export type WorkflowOptions = {
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

export type TestConditions = {
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
  graphql?: StepGraphQL
  captures?: StepCaptures
  check?: StepCheck
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
    username: string
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

export type CapturesStorage = {
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
  size?: number
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
  contentType?: string
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
  size?: CheckResult
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