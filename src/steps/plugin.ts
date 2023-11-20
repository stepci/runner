import Ajv from 'ajv'
import { CookieJar } from 'tough-cookie'
import { CapturesStorage } from '../utils/runner'
import { WorkflowConfig, WorkflowOptions } from '..'

export type PluginStep = {
  id: string
  params?: object
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
    params,
    captures,
    cookies,
    schemaValidator,
    options,
    config
  )
}
