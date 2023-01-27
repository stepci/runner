import { run } from '../src/index'
import { EventEmitter } from 'node:events'

// Example workflow
const workflow = {
  version: "1.1",
  name: "Status Test",
  include: ['tests/example.json'],
  components: {
    credentials: {
      example: {
        basic: {
          username: "hello",
          password: "world"
        }
      }
    }
  }
}

const ee = new EventEmitter()
run(workflow).then(({ result }) => console.log(result.tests[0]))
