import { run } from '../src/index'
import { EventEmitter } from 'node:events'

// Example workflow
const workflow = {
  version: "1.0",
  name: "Status Test",
  env: {
    host: "example.com"
  },
  "steps": [{
    "name": "GET request",
    "url": "https://{{env.host}}",
    "method": "GET",
    "check": {
      "status": 200
    },
    "captures": [
      { "name": "title",
        "selector": "title"
      }
    ]
  },
  {
    "name": "GET request",
    "url": "https://{{env.host}}",
    "if": `captures.title == "Example Domain"`,
    "method": "GET",
    "check": {
      "status": 200
    }
  }]
}

const ee = new EventEmitter()
ee.on('done', console.log)

run(workflow, { ee })
