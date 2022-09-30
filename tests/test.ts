import { run } from '../src/index'
import { EventEmitter } from 'node:events'

// Example workflow
const workflow = {
  version: "1.0",
  name: "Status Test",
  env: {
    host: "example.com"
  },
  options: {
    continueOnFail: true
  },
  "steps": [
  {
    "name": "capture",
    "url": "https://jsonplaceholder.typicode.com/posts/1",
    "method": "GET",
    "captures": {
      "id": {
        "jsonpath": "$.id"
      }
    }
  },
  // {
  //   "name": "Redirect",
  //   "url": "https://httpbin.org/redirect-to",
  //   "method": "GET",
  //   "params": {
  //     "url": "https://example.com",
  //   },
  //   "check": {
  //     "redirects": ['https://example.com/']
  //   }
  // },
  // {
  //   "name": "Cookies",
  //   "url": "https://httpbin.org/cookies",
  //   "method": "GET",
  //   "cookies": {
  //     "wows": "world"
  //   },
  //   "check": {
  //     "status": 200,
  //     "cookies": {
  //       "wows": "world",
  //       "kek": "kek"
  //     }
  //   },
  // },
  // {
  //   "name": "Image",
  //   "url": "https://httpbin.org/image",
  //   "headers": {
  //     "accept": "image/webp"
  //   },
  //   "method": "GET",
  //   "check": {
  //     "status": 200,
  //     "sha256": "567cfaf94ebaf279cea4eb0bc05c4655021fb4ee004aca52c096709d3ba87a63"
  //   }
  // },
  // {
  //   "name": "Upload",
  //   "url": "https://httpbin.org/post",
  //   "method": "POST",
  //   "formData": {
  //     "name": {
  //       "file": "README.md"
  //     }
  //   },
  //   "check": {
  //     "ok": true
  //   }
  // },
  // {
  //   "name": "Performance",
  //   "url": "https://jsonplaceholder.typicode.com/posts/1",
  //   "method": "GET",
  //   "check": {
  //     "performance": {
  //       "firstByte": [{
  //         "lte": 20
  //       }]
  //     }
  //   }
  // },
  // {
  //   "name": "SSL",
  //   "method": "GET",
  //   "url": "https://example.com",
  //   "check": {
  //     "ssl": {
  //       "expired": false,
  //       "daysUntilExpiration": [{
  //         "gte": 60
  //       }]
  //     }
  //   }
  // }
  ]
}

const ee = new EventEmitter()
run(workflow, { ee }).then(({ result }) => console.log(result))
