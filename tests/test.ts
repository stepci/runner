import { run } from '../src/index'
import { EventEmitter } from 'node:events'

// Example workflow
const workflow = {
  version: "1.1",
  name: "Status Test",
  env: {
    username: "mish"
  },
  testsFrom: ['tests/example.json']
}

const ee = new EventEmitter()
run(workflow).then(({ result }) => console.log(result.tests[0]))
