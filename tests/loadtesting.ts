import { loadTest } from '../src/loadtesting'

// Example workflow
const workflow = {
  version: "1.1",
  name: "Status Test",
  config: {
    loadTest: {
      phases: [{
        duration: 2,
        arrivalRate: 1
      }],
      check: {
        p99: [{
          lte: 500
        }],
        p95: [{
          lte: 500
        }]
      }
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
        },
        {
          "name": "GET request",
          "http": {
            "url": "https://example.com",
            "method": "GET",
            "check": {
              "status": 300
            }
          }
        },
      ]
    },
    example2: {
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

loadTest(workflow).then(({ result }) => console.log(result))
