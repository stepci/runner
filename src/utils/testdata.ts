import * as csv from '@fast-csv/parse'
import path from 'path'

export type TestData = {
  content?: string
  file?: string
  options?: TestDataOptions
}

export type TestDataOptions = {
  delimiter?: string
  quote?: string | null
  escape?: string
  headers?: boolean | string[]
  workflowPath?: string
}

// Parse CSV
export function parseCSV (testData: TestData, options?: TestDataOptions): Promise<object[]>{
  return new Promise((resolve, reject) => {
    const defaultOptions = { headers: true }

    let parsedData: object[] = []
    if (testData.file) {
      csv.parseFile(path.join(path.dirname(options?.workflowPath || __dirname), testData.file), { ...defaultOptions, ...options })
      .on('data', data => parsedData.push(data))
      .on('end', () => resolve(parsedData))
    } else {
      csv.parseString((testData.content as string), { ...defaultOptions, ...options })
      .on('data', data => parsedData.push(data))
      .on('end', () => resolve(parsedData))
    }
  })
}
