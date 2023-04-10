# Step CI Runner

Step CI Test Runner

## Installation

```
npm install @stepci/runner
```

## Usage

### Run workflow from file

```js
import { runFromFile } from '@stepci/runner'
runFromFile('./examples/status.yml').then(console.log)
```

### Run workflow from config

```js
import { run } from '@stepci/runner'

// Example workflow
const workflow = {
  version: "1.0",
  name: "Status Test",
  env: {
    host: "example.com"
  },
  tests: {
    example: {
      steps: [{
        name: "GET request",
        http: {
          url: "https://${{env.host}}",
          method: "GET",
          check: {
            status: "/^20/"
          }
        }
      }]
    }
  }
}

run(workflow).then(console.log)
```

### Events

If you supply an `EventEmitter` as argument, you can subscribe to following events:

- `step:http_request`, when a http request is made
- `step:http_response`, when a http response is received
- `step:grpc_request`, when a grpc request is made
- `step:grpc_response`, when a grpc is received
- `step:result`, when step finishes
- `step:error`, when step errors
- `test:result`, when test finishes
- `workflow:result`, when workflow finishes
- `loadtest:result`, when loadtest finishes

**Example: Events**

```js
import { run } from '@stepci/runner'
import { EventEmitter } from 'node:events'

// Example workflow
const workflow = {
  version: "1.0",
  name: "Status Test",
  env: {
    host: "example.com"
  },
  tests: {
    example: {
      steps: [{
        name: "GET request",
        http: {
          url: "https://${{env.host}}",
          method: "GET",
          check: {
            status: "/^20/"
          }
        }
      }]
    }
  }
}

const ee = new EventEmitter()
ee.on('done', console.log)
run(workflow, { ee })
```
