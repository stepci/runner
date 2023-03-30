import { StepResult } from '../index.js'
import { compileExpression } from 'filtrex'
import flatten from 'flat'
import { CookieJar } from 'tough-cookie'

export type CapturesStorage = {
  [key: string]: any
}

export type TestConditions = {
  captures?: CapturesStorage
  env?: object
}

// Check if expression
export function checkCondition (expression: string, data: TestConditions): boolean {
  const filter = compileExpression(expression)
  return filter(flatten(data))
}

// Get cookie
export function getCookie (store: CookieJar, name: string, url: string): string {
  return store.getCookiesSync(url).filter(cookie => cookie.key === name)[0]?.value
}

// Did all checks pass?
export function didChecksPass (stepResult: StepResult) {
  if (!stepResult.checks) return true

  return Object.values(stepResult.checks as object).map(check => {
    return check['passed'] ? check.passed : Object.values(check).map((c: any) => c.passed).every(passed => passed)
  })
  .every(passed => passed)
}
