import parseDuration from 'parse-duration'
import { StepRunResult } from '..'

export default async function (params: string | number) {
  const stepResult: StepRunResult = {
    type: 'delay',
  }

  stepResult.type = 'delay'
  await new Promise((resolve) =>
    setTimeout(resolve, typeof params === 'string' ? parseDuration(params) : params)
  )

  return stepResult
}
