import deepEqual from 'deep-equal'

export type Matcher = {
  eq?: any
  ne?: any
  gt?: number
  gte?: number
  lt?: number
  lte?: number
  in?: object
  nin?: object
  match?: string
  isNumber?: boolean
  isString?: boolean
  isBoolean?: boolean
  isNull?: boolean
  isDefined?: boolean
  isObject?: boolean
  isArray?: boolean
}

export type CheckResult = {
  expected: any
  given: any
  passed: boolean
}

export type CheckResults = {
  [key: string]: CheckResult
}

export function checkResult (given: any, expected: Matcher[] | any) : CheckResult {
  return {
    expected,
    given,
    passed: check(given, expected)
  }
}

function check (given: any, expected: Matcher[] | any) : boolean {
  if (Array.isArray(expected)) {
    return expected.map((test: Matcher) => {
      if ('eq' in test) return deepEqual(given, test.eq, { strict: true })
      if ('ne' in test) return given !== test.ne
      // @ts-ignore is possibly 'undefined'
      if ('gt' in test) return given > test.gt
      // @ts-ignore is possibly 'undefined'
      if ('gte' in test) return given >= test.gte
      // @ts-ignore is possibly 'undefined'
      if ('lt' in test) return given < test.lt
      // @ts-ignore is possibly 'undefined'
      if ('lte' in test) return given <= test.lte
      if ('in' in test) return given.includes(test.in)
      if ('nin' in test) return !given.includes(test.nin)
      // @ts-ignore is possibly 'undefined'
      if ('match' in test) return new RegExp(test.match).test(given)
      if ('isNumber' in test) return test.isNumber ? typeof given === 'number' : typeof given !== 'number'
      if ('isString' in test) return test.isString ? typeof given === 'string' : typeof given !== 'string'
      if ('isBoolean' in test) return test.isBoolean ? typeof given === 'boolean' : typeof given !== 'boolean'
      if ('isNull' in test) return test.isNull ? given === null : given !== null
      if ('isDefined' in test) return test.isDefined ? typeof given !== 'undefined' : typeof given === 'undefined'
      if ('isObject' in test) return test.isObject ? typeof given === 'object' : typeof given !== 'object'
      if ('isArray' in test) return test.isArray ? Array.isArray(given) : !Array.isArray(given)
    })
    .every((test: boolean) => test === true)
  }

  // Check whether the expected value is regex
  if (/^\/.*\/$/.test(expected)) {
    const regex = new RegExp(expected.match(/^\/(.*?)\/$/)[1])
    return regex.test(given)
  }

  return deepEqual(given, expected)
}
