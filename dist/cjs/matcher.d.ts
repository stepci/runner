export declare type Matcher = {
    eq?: any;
    ne?: any;
    gt?: number;
    gte?: number;
    lt?: number;
    lte?: number;
    in?: object;
    nin?: object;
    match?: string;
    isNumber?: boolean;
    isString?: boolean;
    isBoolean?: boolean;
    isNull?: boolean;
    isDefined?: boolean;
    isObject?: boolean;
    isArray?: boolean;
};
export declare type CheckResult = {
    expected: any;
    given: any;
    passed: boolean;
};
export declare type CheckResults = {
    [key: string]: CheckResult;
};
export declare function checkResult(given: any, expected: Matcher[] | any): CheckResult;
