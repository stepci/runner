import { Workflow, WorkflowOptions } from './index.js';
import { Matcher, CheckResult } from './matcher.js';
export declare type LoadTestResult = {
    workflow: Workflow;
    result: {
        stats: {
            tests: {
                failed: number;
                passed: number;
                total: number;
            };
            steps: {
                failed: number;
                passed: number;
                skipped: number;
                errored: number;
                total: number;
            };
        };
        responseTime: LoadTestMetric;
        iterations: number;
        rps: number;
        duration: number;
        passed: boolean;
        checks?: LoadTestChecksResult;
    };
};
declare type LoadTestMetric = {
    min: number;
    max: number;
    avg: number;
    med: number;
    p95: number;
    p99: number;
};
export declare type LoadTestCheck = {
    min?: number | Matcher[];
    max?: number | Matcher[];
    avg?: number | Matcher[];
    med?: number | Matcher[];
    p95?: number | Matcher[];
    p99?: number | Matcher[];
};
declare type LoadTestChecksResult = {
    min?: CheckResult;
    max?: CheckResult;
    avg?: CheckResult;
    med?: CheckResult;
    p95?: CheckResult;
    p99?: CheckResult;
};
export declare function loadTestFromFile(path: string, options?: WorkflowOptions): Promise<LoadTestResult>;
export declare function loadTest(workflow: Workflow, options?: WorkflowOptions): Promise<LoadTestResult>;
export {};
