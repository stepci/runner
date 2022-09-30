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
  steps: [{
    name: "GET request",
    url: "https://{{env.host}}",
    method: "GET",
    check: {
      status: "/^20/"
    }
  }]
}

run(workflow).then(console.log)
```

### Events

If you supply an `EventEmitter` as argument, you can subscribe to following events:

- `request`, on request
- `response`, on response
- `result`, on a step completion
- `done`, on a workflow completion
- `error`, on workflow error

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
  steps: [{
    name: "GET request",
    url: "https://{{env.host}}",
    method: "GET",
    check: {
      status: "/^20/"
    }
  }]
}

const ee = new EventEmitter()
ee.on('done', console.log)
run(workflow, { ee })
```
