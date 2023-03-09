import * as csv from '@fast-csv/parse';
import path from 'path';
// Parse CSV
export function parseCSV(testData, options) {
    return new Promise((resolve, reject) => {
        const defaultOptions = { headers: true };
        let parsedData = [];
        if (testData.file) {
            csv.parseFile(path.join(path.dirname(options?.workflowPath || __dirname), testData.file), { ...defaultOptions, ...options })
                .on('data', data => parsedData.push(data))
                .on('end', () => resolve(parsedData));
        }
        else {
            csv.parseString(testData.content, { ...defaultOptions, ...options })
                .on('data', data => parsedData.push(data))
                .on('end', () => resolve(parsedData));
        }
    });
}
