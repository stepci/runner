import fs from 'fs';
import path from 'path';
export async function tryFile(input, options) {
    if (input.file) {
        return await fs.promises.readFile(path.join(path.dirname(options?.workflowPath || __dirname), input.file));
    }
    else {
        return input;
    }
}
