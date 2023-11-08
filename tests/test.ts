import { runFromFile } from '../src/index'
import { EventEmitter } from 'node:events'

const ee = new EventEmitter()
runFromFile('./tests/basic.yml').then(({ result }) => console.log(result.tests[0].steps))
