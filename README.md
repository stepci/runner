# Step CI Runner

Step CI Test Runner

## Installation

```
npm install @stepci/runner
```

## Usage

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

run(workflow, {}).then(console.log)
```
