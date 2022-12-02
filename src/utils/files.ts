import fs from 'fs'
import path from 'path'

export type StepFile = {
  file: string
}

export type TryFileOptions = {
  workflowPath?: string
}

export async function tryFile (input: string | StepFile, options?: TryFileOptions): Promise<Buffer | string> {
  if ((input as StepFile).file) {
    return await fs.promises.readFile(path.join(path.dirname(options?.workflowPath || __dirname), (input as StepFile).file))
  } else {
    return input as string
  }
}
