import { run } from '../src/index'
import { EventEmitter } from 'node:events'

// Example workflow
const workflow = {
  version: "1.1",
  name: "Status Test",
  env: {
    host: "example.com"
  },
  components: {
    schemas: {
      "Post": {
        "type": "object",
        "properties": {
          "userId": {
            "type": "integer",
          },
          "id": {
            "type": "integer",
          },
          "title":{
            "type": "string",
          },
          "body": {
            "type": "string",
          }
        },
        "required": ['userId', 'id', 'title', 'body']
      }
    }
  },
  tests: {
    "example": {
      "testdata": {
        "file": "tests/testdata.csv",
      },
      "steps": [
        {
          "name": "GET request",
          "http": {
            "url": "https://mish.co",
            "method": "GET",
            "check": {
              "co2": 400
            }
          }
        }
      ]
    }
  }
}

const ee = new EventEmitter()
run(workflow).then(({ result }) => console.log(result.tests[0].steps[0]))
