import Ajv from 'ajv'
import { CapturesStorage } from '../utils/runner'
import { WorkflowConfig, WorkflowOptions } from '..'
import { CookieJar } from 'tough-cookie'
import runHTTPStep, { HTTPStepBase, HTTPStepTRPC } from './http'

export type tRPCStep = HTTPStepTRPC & HTTPStepBase

export default async function (
  params: tRPCStep,
  captures: CapturesStorage,
  cookies: CookieJar,
  schemaValidator: Ajv,
  options?: WorkflowOptions,
  config?: WorkflowConfig
) {
  return runHTTPStep(
    {
      trpc: {
        query: params.query,
        mutation: params.mutation,
      },
      ...params,
    },
    captures,
    cookies,
    schemaValidator,
    options,
    config
  )
}
