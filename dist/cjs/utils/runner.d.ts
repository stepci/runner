import { StepResult } from '../index.js';
import { CookieJar } from 'tough-cookie';
export declare type CapturesStorage = {
    [key: string]: any;
};
export declare type TestConditions = {
    captures?: CapturesStorage;
    env?: object;
};
export declare function checkCondition(expression: string, data: TestConditions): boolean;
export declare function getCookie(store: CookieJar, name: string, url: string): string;
export declare function didChecksPass(stepResult: StepResult): boolean;
