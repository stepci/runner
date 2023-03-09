/// <reference types="node" />
/// <reference types="node" />
import { Headers, PlainResponse } from 'got';
import { gRPCRequestMetadata } from 'cool-grpc';
import FormData from 'form-data';
import { EventEmitter } from 'node:events';
import { Phase } from 'phasic';
import { Matcher, CheckResult, CheckResults } from './matcher.js';
import { LoadTestCheck } from './loadtesting.js';
import { TestData } from './utils/testdata.js';
import { Credential, CredentialRef, CredentialsStorage } from './utils/auth.js';
import { StepFile } from './utils/files.js';
export declare type EnvironmentVariables = {
    [key: string]: string;
};
export declare type Workflow = {
    version: string;
    name: string;
    env?: EnvironmentVariables;
    tests?: Tests;
    include?: string[];
    components?: WorkflowComponents;
    config?: WorkflowConfig;
};
export declare type WorkflowComponents = {
    schemas?: {
        [key: string]: any;
    };
    credentials?: CredentialsStorage;
};
export declare type WorkflowConfig = {
    loadTest?: {
        phases: Phase[];
        check?: LoadTestCheck;
    };
    continueOnFail?: boolean;
    http?: {
        baseURL?: string;
        rejectUnauthorized?: boolean;
        http2?: boolean;
    };
};
export declare type WorkflowOptions = {
    path?: string;
    secrets?: WorkflowOptionsSecrets;
    ee?: EventEmitter;
    env?: EnvironmentVariables;
};
declare type WorkflowOptionsSecrets = {
    [key: string]: string;
};
export declare type WorkflowResult = {
    workflow: Workflow;
    result: {
        tests: TestResult[];
        passed: boolean;
        timestamp: Date;
        duration: number;
        co2: number;
    };
    path?: string;
};
export declare type Test = {
    name?: string;
    env?: object;
    steps: Step[];
    config?: TestConfig;
    testdata?: TestData;
};
export declare type Tests = {
    [key: string]: Test;
};
export declare type TestConfig = {
    continueOnFail?: boolean;
};
export declare type Step = {
    id?: string;
    name?: string;
    if?: string;
    http?: HTTPStep;
    grpc?: gRPCStep;
};
export declare type HTTPStep = {
    url: string;
    method: string;
    headers?: HTTPStepHeaders;
    params?: HTTPStepParams;
    cookies?: HTTPStepCookies;
    body?: string | StepFile;
    form?: HTTPStepForm;
    formData?: HTTPStepMultiPartForm;
    auth?: CredentialRef | Credential;
    json?: object;
    graphql?: HTTPStepGraphQL;
    trpc?: HTTPStepTRPC;
    captures?: HTTPStepCaptures;
    check?: HTTPStepCheck;
    followRedirects?: boolean;
    timeout?: number;
    retries?: number;
};
export declare type HTTPStepTRPC = {
    query?: {
        [key: string]: object;
    } | {
        [key: string]: object;
    }[];
    mutation?: {
        [key: string]: object;
    };
};
export declare type gRPCStep = {
    proto: string | string[];
    host: string;
    service: string;
    method: string;
    data: object;
    metadata?: gRPCRequestMetadata;
    auth?: CredentialRef | gRPCStepAuth;
    captures?: gRPCStepCaptures;
    check?: gRPCStepCheck;
};
export declare type gRPCStepAuth = {
    tls?: Credential['tls'];
};
export declare type HTTPStepHeaders = {
    [key: string]: string;
};
export declare type HTTPStepParams = {
    [key: string]: string;
};
export declare type HTTPStepCookies = {
    [key: string]: string;
};
export declare type HTTPStepForm = {
    [key: string]: string;
};
export declare type HTTPStepMultiPartForm = {
    [key: string]: string | StepFile;
};
export declare type HTTPStepGraphQL = {
    query: string;
    variables: object;
};
export declare type HTTPStepCaptures = {
    [key: string]: HTTPStepCapture;
};
export declare type gRPCStepCaptures = {
    [key: string]: gRPCStepCapture;
};
export declare type HTTPStepCapture = {
    xpath?: string;
    jsonpath?: string;
    header?: string;
    selector?: string;
    cookie?: string;
    regex?: string;
    body?: boolean;
};
export declare type gRPCStepCapture = {
    jsonpath?: string;
};
export declare type HTTPStepCheck = {
    status?: number | Matcher[];
    statusText?: string | Matcher[];
    redirected?: boolean;
    redirects?: string[];
    headers?: StepCheckValue | StepCheckMatcher;
    body?: string | Matcher[];
    json?: object;
    schema?: object;
    jsonpath?: StepCheckJSONPath | StepCheckMatcher;
    xpath?: StepCheckValue | StepCheckMatcher;
    selectors?: StepCheckValue | StepCheckMatcher;
    cookies?: StepCheckValue | StepCheckMatcher;
    captures?: StepCheckCaptures;
    sha256?: string;
    md5?: string;
    performance?: StepCheckPerformance | StepCheckMatcher;
    ssl?: StepCheckSSL | StepCheckMatcher;
    size?: number | Matcher[];
    co2?: number | Matcher[];
};
export declare type gRPCStepCheck = {
    json?: object;
    schema?: object;
    jsonpath?: StepCheckJSONPath | StepCheckMatcher;
    captures?: StepCheckCaptures;
    performance?: StepCheckPerformance | StepCheckMatcher;
    size?: number | Matcher[];
    co2?: number | Matcher[];
};
export declare type StepCheckValue = {
    [key: string]: string;
};
export declare type StepCheckJSONPath = {
    [key: string]: any;
};
export declare type StepCheckPerformance = {
    [key: string]: number;
};
export declare type StepCheckCaptures = {
    [key: string]: any;
};
export declare type StepCheckSSL = {
    valid?: boolean;
    signed?: boolean;
    daysUntilExpiration?: number | Matcher[];
};
export declare type StepCheckMatcher = {
    [key: string]: Matcher[];
};
export declare type TestResult = {
    id: string;
    name?: string;
    steps: StepResult[];
    passed: boolean;
    timestamp: Date;
    duration: number;
    co2: number;
};
export declare type StepResult = {
    type?: 'http' | 'grpc';
    id?: string;
    testId: string;
    name?: string;
    checks?: StepCheckResult;
    errored: boolean;
    errorMessage?: string;
    passed: boolean;
    skipped: boolean;
    timestamp: Date;
    duration: number;
    responseTime: number;
    co2: number;
    request?: HTTPStepRequest | gRPCStepRequest;
    response?: HTTPStepResponse | gRPCStepResponse;
};
export declare type HTTPStepRequest = {
    protocol: string;
    url: string;
    method: string;
    headers?: HTTPStepHeaders;
    body?: string | Buffer | FormData;
};
export declare type gRPCStepRequest = {
    proto: string | string[];
    host: string;
    service: string;
    method: string;
    metadata?: gRPCRequestMetadata;
    data: object;
    tls?: CredentialRef | Credential['tls'];
};
export declare type HTTPStepResponse = {
    protocol: string;
    status: number;
    statusText?: string;
    duration?: number;
    contentType?: string;
    timings: PlainResponse['timings'];
    headers?: Headers;
    ssl?: StepResponseSSL;
    body: Buffer;
    co2: number;
};
export declare type gRPCStepResponse = {
    body: object | object[];
    duration: number;
    co2: number;
};
export declare type StepResponseSSL = {
    valid: boolean;
    signed: boolean;
    validUntil: Date;
    daysUntilExpiration: number;
};
export declare type StepCheckResult = {
    headers?: CheckResults;
    redirected?: CheckResult;
    redirects?: CheckResult;
    json?: CheckResult;
    schema?: CheckResult;
    jsonpath?: CheckResults;
    xpath?: CheckResults;
    selectors?: CheckResults;
    cookies?: CheckResults;
    captures?: CheckResults;
    status?: CheckResult;
    statusText?: CheckResult;
    body?: CheckResult;
    sha256?: CheckResult;
    md5?: CheckResult;
    performance?: CheckResults;
    ssl?: CheckResultSSL;
    size?: CheckResult;
    co2?: CheckResult;
};
export declare type CheckResultSSL = {
    valid?: CheckResult;
    signed?: CheckResult;
    daysUntilExpiration?: CheckResult;
};
export declare function runFromYAML(yamlString: string, options?: WorkflowOptions): Promise<WorkflowResult>;
export declare function runFromFile(path: string, options?: WorkflowOptions): Promise<WorkflowResult>;
export declare function run(workflow: Workflow, options?: WorkflowOptions): Promise<WorkflowResult>;
export {};
