import { run } from '../src/index'

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
    "if": `title == "Example Domain"`,
    "method": "GET",
    "check": {
      "status": 200
    }
  }]
}

run(workflow, {}).then(re => console.log(JSON.stringify(re)))
