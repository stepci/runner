"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkResult = void 0;
const deep_equal_1 = __importDefault(require("deep-equal"));
function checkResult(given, expected) {
    return {
        expected,
        given,
        passed: check(given, expected)
    };
}
exports.checkResult = checkResult;
function check(given, expected) {
    if (Array.isArray(expected)) {
        return expected.map((test) => {
            if (test.eq)
                return (0, deep_equal_1.default)(given, test.eq);
            if (test.ne)
                return given !== test.ne;
            if (test.gt)
                return given > test.gt;
            if (test.gte)
                return given >= test.gte;
            if (test.lt)
                return given < test.lt;
            if (test.lte)
                return given <= test.lte;
            if (test.in)
                return given.includes(test.in);
            if (test.nin)
                return !given.includes(test.nin);
            if (test.match)
                return new RegExp(test.match).test(given);
            if ('isNumber' in test)
                return test.isNumber ? typeof given === 'number' : typeof given !== 'number';
            if ('isString' in test)
                return test.isString ? typeof given === 'string' : typeof given !== 'string';
            if ('isBoolean' in test)
                return test.isBoolean ? typeof given === 'boolean' : typeof given !== 'boolean';
            if ('isNull' in test)
                return test.isNull ? typeof given === null : typeof given !== null;
            if ('isDefined' in test)
                return test.isDefined ? typeof given !== undefined : typeof given === undefined;
            if ('isObject' in test)
                return test.isObject ? typeof given === 'object' : typeof given !== 'object';
            if ('isArray' in test)
                return test.isArray ? Array.isArray(given) : !Array.isArray(given);
        })
            .every((test) => test === true);
    }
    // Check whether the expected value is regex
    if (/^\/.*\/$/.test(expected)) {
        const regex = new RegExp(expected.match(/^\/(.*?)\/$/)[1]);
        return regex.test(given);
    }
    return (0, deep_equal_1.default)(given, expected);
}
