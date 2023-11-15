import parseDuration from 'parse-duration'
import { StepRunResult } from '..'

export default async function DelayStep(params: string) {
  const stepResult: StepRunResult = {
    type: 'delay',
  }

  stepResult.type = 'delay'
  await new Promise((resolve) =>
    setTimeout(resolve, parseDuration(params || '5000'))
  )

  return stepResult
}
