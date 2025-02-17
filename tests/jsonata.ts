import { runFromFile } from '../src/index'

runFromFile('./tests/jsonata.yml').then(({ result }) => {
  for (const step of result.tests[0].steps) {
    for (const key in step.checks) {
      console.log(JSON.stringify(step.checks[key]))
    }
  }
})
