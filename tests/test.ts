import { run } from '../src/index'

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
    "name": "Basic Auth",
    "url": "http://httpbin.org/basic-auth/hello/world",
    "method": "GET",
    "auth": {
      "user": "hello",
      "password": "world"
    },
    "check": {
      "status": 200
    }
  },
  {
    "name": "Cookies",
    "url": "https://httpbin.org/cookies",
    "method": "GET",
    "cookies": {
      "wows": "world"
    },
    "check": {
      "status": 200,
      "cookies": {
        "wows": "world"
      }
    },
  },
  {
    "name": "Image",
    "url": "https://httpbin.org/image",
    "headers": {
      "accept": "image/webp"
    },
    "method": "GET",
    "check": {
      "status": 200,
      "sha256": "567cfaf94ebaf279cea4eb0bc05c4655021fb4ee004aca52c096709d3ba87a63"
    }
  },
  {
    "name": "Upload",
    "url": "https://httpbin.org/post",
    "method": "POST",
    "formData": {
      "name": {
        "file": "README.md"
      }
    },
    "check": {
      "ok": true
    }
  },
  {
    "name": "Performance",
    "url": "https://jsonplaceholder.typicode.com/posts/1",
    "method": "GET",
    "check": {
      "performance": {
        "firstByte": [{
          "lte": 20
        }]
      }
    }
  }]
}

run(workflow)
.then(( {result }) => console.log(result))
