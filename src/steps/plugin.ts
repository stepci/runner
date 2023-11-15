import Ajv from 'ajv'
import { CapturesStorage } from '../utils/runner'
import { WorkflowConfig, WorkflowOptions } from '..'
import { CookieJar } from 'tough-cookie'

export type PluginStep = {
  id: string
  options?: object
  check?: object
}

export default async function (
  params: PluginStep,
  captures: CapturesStorage,
  cookies: CookieJar,
  schemaValidator: Ajv,
  options?: WorkflowOptions,
  config?: WorkflowConfig
) {
  const plugin = require(params.id)
  return plugin.default(
    params.options,
    captures,
    cookies,
    schemaValidator,
    options
  )
}
