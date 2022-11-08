import { run } from '../src/index'
import { EventEmitter } from 'node:events'

// Example workflow
const workflow = {
  version: "1.1",
  name: "Status Test",
  env: {
    host: "example.com"
  },
  tests: {
    "example": {
      "steps": [
        {
          "name": "GET request",
          "http": {
            "url": "https://example.com",
            "method": "GET",
            "check": {
              "status": 200
            }
          }
        }
      ]
    }
  }
}

const ee = new EventEmitter()
run(workflow).then(({ result }) => console.log(result.tests[0]))
