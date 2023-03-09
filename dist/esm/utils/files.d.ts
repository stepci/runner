/// <reference types="node" />
export declare type StepFile = {
    file: string;
};
export declare type TryFileOptions = {
    workflowPath?: string;
};
export declare function tryFile(input: string | StepFile, options?: TryFileOptions): Promise<Buffer | string>;
