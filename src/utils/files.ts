import fs from 'fs'
import path from 'path'

export type StepFile = {
  file: string
}

type TryFileOptions = {
  workflowPath?: string
}

export async function tryFile (input: string | StepFile, options?: TryFileOptions): Promise<string> {
  if ((input as StepFile).file) {
    const file = await fs.promises.readFile(path.join(path.dirname(options?.workflowPath || __dirname), (input as StepFile).file))
    return file.toString()
  } else {
    return input as string
  }
}
