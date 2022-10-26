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
  flows: {
    "example": {
      "steps": [
        {
          "name": "GET request",
          "http": {
            "url": "https://example.com",
            "method": "GET"
          }
        },
      {
        "name": "GET request",
        "grpc": {
          "proto": ["tests/helloworld.proto"],
          "host": "0.0.0.0:50051",
          "service": "helloworld.Greeter",
          "method": "SayHello",
          "data": {
            "name": "world!"
          },
          "check": {
            "jsonpath": {
              "$.message": "Hello world!"
            }
          }
        }
      }]
    },
  }
}

const ee = new EventEmitter()
run(workflow).then(({ result }) => console.log(result.flows[0].steps[0]))
