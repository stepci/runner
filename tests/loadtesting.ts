import { loadTest } from '../src/loadtesting'

// Example workflow
const workflow = {
  version: "1.1",
  name: "Status Test",
  config: {
    loadTesting: {
      phases: [{
        duration: 10,
        arrivalRate: 10
      }]
    }
  },
  tests: {
    example: {
      steps: [
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

loadTest(workflow).then(console.log)
