import fs from 'fs'

export type StepFile = {
  file: string
}

export async function tryFile (input: string | StepFile): Promise<string> {
  if ((input as StepFile).file) {
    const file = await fs.promises.readFile((input as StepFile).file)
    return file.toString()
  } else {
    return input as string
  }
}
