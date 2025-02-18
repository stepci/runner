import { runFromFile } from '../src/index'
import { EventEmitter } from 'node:events'

const ee = new EventEmitter()
runFromFile('./tests/basic.yml').then(({ result }) => console.log(result.tests[0].steps))
runFromFile('./tests/filelist.yml').then(({ result }) => console.log(result.tests[0].steps))
runFromFile('./tests/multipart.yml').then(({ result }) => console.log(result.tests[0].steps))
runFromFile('./tests/jsonata.yml').then(({ result }) => console.log(result.tests[0].steps))
