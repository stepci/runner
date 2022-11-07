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
        "content": "username,password\nmish,ushakov\nushakov,mish"
      },
      "steps": [
        {
          "name": "GET request",
          "http": {
            "url": "https://httpbin.org/basic-auth/{{testdata.username}}/{{testdata.password}}",
            "method": "GET",
            "auth": {
              "basic": {
                "username": "{{ testdata.username }}",
                "password": "{{ testdata.password }}"
              }
            },
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
run(workflow).then(({ result }) => console.log(result.tests[0].steps[0]))
