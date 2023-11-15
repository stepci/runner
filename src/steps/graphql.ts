import Ajv from 'ajv'
import { CapturesStorage } from '../utils/runner'
import { WorkflowConfig, WorkflowOptions } from '..'
import { CookieJar } from 'tough-cookie'
import runHTTPStep, { HTTPStepBase, HTTPStepGraphQL } from './http'

export type GraphQLStep = HTTPStepGraphQL & HTTPStepBase

export default async function (
  params: GraphQLStep,
  captures: CapturesStorage,
  cookies: CookieJar,
  schemaValidator: Ajv,
  options?: WorkflowOptions,
  config?: WorkflowConfig
) {
  return runHTTPStep(
    {
      graphql: {
        query: params.query,
        variables: params.variables,
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
