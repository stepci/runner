export declare type TestData = {
    content?: string;
    file?: string;
    options?: TestDataOptions;
};
export declare type TestDataOptions = {
    delimiter?: string;
    quote?: string | null;
    escape?: string;
    headers?: boolean | string[];
    workflowPath?: string;
};
export declare function parseCSV(testData: TestData, options?: TestDataOptions): Promise<object[]>;
