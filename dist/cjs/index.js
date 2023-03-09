"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.runFromFile = exports.runFromYAML = void 0;
const got_1 = __importDefault(require("got"));
const cool_grpc_1 = require("cool-grpc");
const tough_cookie_1 = require("tough-cookie");
const liquidless_1 = require("liquidless");
const liquidless_faker_1 = require("liquidless-faker");
const liquidless_naughtystrings_1 = require("liquidless-naughtystrings");
const xpath_1 = __importDefault(require("xpath"));
const form_data_1 = __importDefault(require("form-data"));
const cheerio = __importStar(require("cheerio"));
const jsonpath_plus_1 = require("jsonpath-plus");
const xmldom_1 = require("@xmldom/xmldom");
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const node_path_1 = __importDefault(require("node:path"));
const co2_1 = require("@tgwf/co2");
const matcher_js_1 = require("./matcher.js");
const testdata_js_1 = require("./utils/testdata.js");
const runner_js_1 = require("./utils/runner.js");
const auth_js_1 = require("./utils/auth.js");
const files_js_1 = require("./utils/files.js");
const schema_js_1 = require("./utils/schema.js");
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
const templateDelimiters = ['${{', '}}'];
// Run from YAML string
function runFromYAML(yamlString, options) {
    return run(js_yaml_1.default.load(yamlString), options);
}
exports.runFromYAML = runFromYAML;
// Run from test file
function runFromFile(path, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const testFile = yield fs_1.default.promises.readFile(path);
        const config = js_yaml_1.default.load(testFile.toString());
        return run(config, Object.assign(Object.assign({}, options), { path }));
    });
}
exports.runFromFile = runFromFile;
// Run workflow
function run(workflow, options) {
    var _a, _b, _c, _d, _e, _f, _g;
    return __awaiter(this, void 0, void 0, function* () {
        const timestamp = new Date();
        const schemaValidator = new ajv_1.default({ strictSchema: false });
        (0, ajv_formats_1.default)(schemaValidator);
        // Add schemas to schema Validator
        if ((_a = workflow.components) === null || _a === void 0 ? void 0 : _a.schemas) {
            (0, schema_js_1.addCustomSchemas)(schemaValidator, workflow.components.schemas);
        }
        const env = Object.assign(Object.assign({}, (_b = workflow.env) !== null && _b !== void 0 ? _b : {}), (_c = options === null || options === void 0 ? void 0 : options.env) !== null && _c !== void 0 ? _c : {});
        let credentials;
        if ((_d = workflow.components) === null || _d === void 0 ? void 0 : _d.credentials) {
            credentials = (0, liquidless_1.renderObject)((_e = workflow.components) === null || _e === void 0 ? void 0 : _e.credentials, { env }, { delimiters: templateDelimiters });
        }
        let tests = Object.assign({}, (_f = workflow.tests) !== null && _f !== void 0 ? _f : {});
        if (workflow.include) {
            for (const workflowPath of workflow.include) {
                const testFile = yield fs_1.default.promises.readFile(node_path_1.default.join(node_path_1.default.dirname((options === null || options === void 0 ? void 0 : options.path) || __dirname), workflowPath));
                const test = js_yaml_1.default.load(testFile.toString());
                tests = Object.assign(Object.assign({}, tests), test.tests);
            }
        }
        const testResults = yield Promise.all(Object.entries(tests).map(([id, test]) => runTest(id, test, schemaValidator, options, workflow.config, env, credentials)));
        const workflowResult = {
            workflow,
            result: {
                tests: testResults,
                timestamp,
                passed: testResults.every(test => test.passed),
                duration: Date.now() - timestamp.valueOf(),
                co2: testResults.map(test => test.co2).reduce((a, b) => a + b)
            },
            path: options === null || options === void 0 ? void 0 : options.path
        };
        (_g = options === null || options === void 0 ? void 0 : options.ee) === null || _g === void 0 ? void 0 : _g.emit('workflow:result', workflowResult);
        return workflowResult;
    });
}
exports.run = run;
function runTest(id, test, schemaValidator, options, config, env, credentials) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
    return __awaiter(this, void 0, void 0, function* () {
        const testResult = {
            id,
            name: test.name,
            steps: [],
            passed: true,
            timestamp: new Date(),
            duration: 0,
            co2: 0
        };
        const captures = {};
        const cookies = new tough_cookie_1.CookieJar();
        const ssw = new co2_1.co2();
        let previous;
        let testData = {};
        // Load test data
        if (test.testdata) {
            const parsedCSV = yield (0, testdata_js_1.parseCSV)(test.testdata, Object.assign(Object.assign({}, test.testdata.options), { workflowPath: options === null || options === void 0 ? void 0 : options.path }));
            testData = parsedCSV[Math.floor(Math.random() * parsedCSV.length)];
        }
        for (let step of test.steps) {
            const stepResult = {
                id: step.id,
                testId: id,
                name: step.name,
                timestamp: new Date(),
                passed: true,
                errored: false,
                skipped: false,
                duration: 0,
                responseTime: 0,
                co2: 0
            };
            // Skip current step is the previous one failed or condition was unmet
            if ((((_b = (_a = test.config) === null || _a === void 0 ? void 0 : _a.continueOnFail) !== null && _b !== void 0 ? _b : true) || ((_c = config === null || config === void 0 ? void 0 : config.continueOnFail) !== null && _c !== void 0 ? _c : true)) && (previous && !previous.passed)) {
                stepResult.passed = false;
                stepResult.errorMessage = 'Step was skipped because previous one failed';
                stepResult.skipped = true;
            }
            else if (step.if && !(0, runner_js_1.checkCondition)(step.if, { captures, env: Object.assign(Object.assign({}, env), test.env) })) {
                stepResult.skipped = true;
            }
            else {
                try {
                    step = (0, liquidless_1.renderObject)(step, {
                        captures,
                        env: Object.assign(Object.assign({}, env), test.env),
                        secrets: options === null || options === void 0 ? void 0 : options.secrets,
                        testdata: testData
                    }, {
                        filters: {
                            fake: liquidless_faker_1.fake,
                            naughtystring: liquidless_naughtystrings_1.naughtystring
                        },
                        delimiters: templateDelimiters
                    });
                    if (step.http) {
                        stepResult.type = 'http';
                        let requestBody;
                        // Prefix URL
                        if ((_d = config === null || config === void 0 ? void 0 : config.http) === null || _d === void 0 ? void 0 : _d.baseURL) {
                            try {
                                new URL(step.http.url);
                            }
                            catch (_z) {
                                step.http.url = config.http.baseURL + step.http.url;
                            }
                        }
                        // Body
                        if (step.http.body) {
                            requestBody = yield (0, files_js_1.tryFile)(step.http.body, { workflowPath: options === null || options === void 0 ? void 0 : options.path });
                        }
                        //  JSON
                        if (step.http.json) {
                            requestBody = JSON.stringify(step.http.json);
                        }
                        // GraphQL
                        if (step.http.graphql) {
                            step.http.method = 'POST';
                            if (!step.http.headers)
                                step.http.headers = {};
                            step.http.headers['Content-Type'] = 'application/json';
                            requestBody = JSON.stringify(step.http.graphql);
                        }
                        // tRPC
                        if (step.http.trpc) {
                            if (step.http.trpc.query) {
                                step.http.method = 'GET';
                                // tRPC Batch queries
                                if (Array.isArray(step.http.trpc.query)) {
                                    const payload = step.http.trpc.query.map(e => {
                                        return {
                                            op: Object.keys(e)[0],
                                            data: Object.values(e)[0]
                                        };
                                    });
                                    const procedures = payload.map(p => p.op).join(',');
                                    step.http.url = step.http.url + '/' + procedures.replaceAll('/', '.');
                                    step.http.params = {
                                        batch: '1',
                                        input: JSON.stringify(Object.assign({}, payload.map(p => p.data)))
                                    };
                                }
                                else {
                                    const [procedure, data] = Object.entries(step.http.trpc.query)[0];
                                    step.http.url = step.http.url + '/' + procedure.replaceAll('/', '.');
                                    step.http.params = {
                                        input: JSON.stringify(data)
                                    };
                                }
                            }
                            if (step.http.trpc.mutation) {
                                const [procedure, data] = Object.entries(step.http.trpc.mutation)[0];
                                step.http.method = 'POST';
                                step.http.url = step.http.url + '/' + procedure;
                                requestBody = JSON.stringify(data);
                            }
                        }
                        // Form Data
                        if (step.http.form) {
                            const formData = new URLSearchParams();
                            for (const field in step.http.form) {
                                formData.append(field, step.http.form[field]);
                            }
                            requestBody = formData.toString();
                        }
                        // Multipart Form Data
                        if (step.http.formData) {
                            const formData = new form_data_1.default();
                            for (const field in step.http.formData) {
                                if (typeof step.http.formData[field] === 'string') {
                                    formData.append(field, step.http.formData[field]);
                                }
                                if (step.http.formData[field].file) {
                                    const file = yield fs_1.default.promises.readFile(node_path_1.default.join(node_path_1.default.dirname((options === null || options === void 0 ? void 0 : options.path) || __dirname), step.http.formData[field].file));
                                    formData.append(field, file);
                                }
                            }
                            requestBody = formData;
                        }
                        // Auth
                        let clientCredentials;
                        if (step.http.auth) {
                            const authHeader = yield (0, auth_js_1.getAuthHeader)(step.http.auth, credentials);
                            if (authHeader) {
                                if (!step.http.headers)
                                    step.http.headers = {};
                                step.http.headers['Authorization'] = authHeader;
                            }
                            clientCredentials = yield (0, auth_js_1.getClientCertificate)(step.http.auth, credentials, { workflowPath: options === null || options === void 0 ? void 0 : options.path });
                        }
                        // Set Cookies
                        if (step.http.cookies) {
                            for (const cookie in step.http.cookies) {
                                yield cookies.setCookie(cookie + '=' + step.http.cookies[cookie], step.http.url);
                            }
                        }
                        // Make a request
                        let sslCertificate;
                        const res = yield (0, got_1.default)(step.http.url, {
                            method: step.http.method,
                            headers: Object.assign({}, step.http.headers),
                            body: requestBody,
                            searchParams: step.http.params ? new URLSearchParams(step.http.params) : undefined,
                            throwHttpErrors: false,
                            followRedirect: (_e = step.http.followRedirects) !== null && _e !== void 0 ? _e : true,
                            timeout: { request: step.http.timeout },
                            retry: { limit: (_f = step.http.retries) !== null && _f !== void 0 ? _f : 0 },
                            cookieJar: cookies,
                            http2: (_h = (_g = config === null || config === void 0 ? void 0 : config.http) === null || _g === void 0 ? void 0 : _g.http2) !== null && _h !== void 0 ? _h : false,
                            https: Object.assign(Object.assign({}, clientCredentials), { rejectUnauthorized: (_k = (_j = config === null || config === void 0 ? void 0 : config.http) === null || _j === void 0 ? void 0 : _j.rejectUnauthorized) !== null && _k !== void 0 ? _k : false })
                        })
                            .on('request', request => { var _a; return (_a = options === null || options === void 0 ? void 0 : options.ee) === null || _a === void 0 ? void 0 : _a.emit('step:http_request', request); })
                            .on('response', response => { var _a; return (_a = options === null || options === void 0 ? void 0 : options.ee) === null || _a === void 0 ? void 0 : _a.emit('step:http_response', response); })
                            .on('response', response => {
                            if (response.socket.getPeerCertificate) {
                                sslCertificate = response.socket.getPeerCertificate();
                                if (Object.keys(sslCertificate).length === 0)
                                    sslCertificate = undefined;
                            }
                        });
                        const responseData = res.rawBody;
                        const body = yield new TextDecoder().decode(responseData);
                        stepResult.request = {
                            protocol: 'HTTP/1.1',
                            url: res.url,
                            method: step.http.method,
                            headers: step.http.headers,
                            body: requestBody
                        };
                        stepResult.response = {
                            protocol: `HTTP/${res.httpVersion}`,
                            status: res.statusCode,
                            statusText: res.statusMessage,
                            duration: res.timings.phases.total,
                            headers: res.headers,
                            contentType: (_l = res.headers['content-type']) === null || _l === void 0 ? void 0 : _l.split(';')[0],
                            timings: res.timings,
                            body: responseData,
                            co2: ssw.perByte(responseData.byteLength)
                        };
                        if (sslCertificate) {
                            stepResult.response.ssl = {
                                valid: new Date(sslCertificate.valid_to) > new Date(),
                                signed: sslCertificate.issuer.CN !== sslCertificate.subject.CN,
                                validUntil: new Date(sslCertificate.valid_to),
                                daysUntilExpiration: Math.round(Math.abs(new Date().valueOf() - new Date(sslCertificate.valid_to).valueOf()) / (24 * 60 * 60 * 1000))
                            };
                        }
                        // Captures
                        if (step.http.captures) {
                            for (const name in step.http.captures) {
                                const capture = step.http.captures[name];
                                if (capture.jsonpath) {
                                    const json = JSON.parse(body);
                                    captures[name] = (0, jsonpath_plus_1.JSONPath)({ path: capture.jsonpath, json })[0];
                                }
                                if (capture.xpath) {
                                    const dom = new xmldom_1.DOMParser().parseFromString(body);
                                    const result = xpath_1.default.select(capture.xpath, dom);
                                    captures[name] = result.length > 0 ? result[0].firstChild.data : undefined;
                                }
                                if (capture.header) {
                                    captures[name] = res.headers[capture.header];
                                }
                                if (capture.selector) {
                                    const dom = cheerio.load(body);
                                    captures[name] = dom(capture.selector).html();
                                }
                                if (capture.cookie) {
                                    captures[name] = (0, runner_js_1.getCookie)(cookies, capture.cookie, res.url);
                                }
                                if (capture.regex) {
                                    captures[name] = (_m = body.match(capture.regex)) === null || _m === void 0 ? void 0 : _m[1];
                                }
                                if (capture.body) {
                                    captures[name] = body;
                                }
                            }
                        }
                        if (step.http.check) {
                            stepResult.checks = {};
                            // Check headers
                            if (step.http.check.headers) {
                                stepResult.checks.headers = {};
                                for (const header in step.http.check.headers) {
                                    stepResult.checks.headers[header] = (0, matcher_js_1.checkResult)(res.headers[header.toLowerCase()], step.http.check.headers[header]);
                                }
                            }
                            // Check body
                            if (step.http.check.body) {
                                stepResult.checks.body = (0, matcher_js_1.checkResult)(body.trim(), step.http.check.body);
                            }
                            // Check JSON
                            if (step.http.check.json) {
                                const json = JSON.parse(body);
                                stepResult.checks.json = (0, matcher_js_1.checkResult)(json, step.http.check.json);
                            }
                            // Check Schema
                            if (step.http.check.schema) {
                                let sample = body;
                                if ((_o = res.headers['content-type']) === null || _o === void 0 ? void 0 : _o.includes('json')) {
                                    sample = JSON.parse(body);
                                }
                                const validate = schemaValidator.compile(step.http.check.schema);
                                stepResult.checks.schema = {
                                    expected: step.http.check.schema,
                                    given: sample,
                                    passed: validate(sample)
                                };
                            }
                            // Check JSONPath
                            if (step.http.check.jsonpath) {
                                const json = JSON.parse(body);
                                stepResult.checks.jsonpath = {};
                                for (const path in step.http.check.jsonpath) {
                                    const result = (0, jsonpath_plus_1.JSONPath)({ path, json });
                                    stepResult.checks.jsonpath[path] = (0, matcher_js_1.checkResult)(result[0], step.http.check.jsonpath[path]);
                                }
                            }
                            // Check XPath
                            if (step.http.check.xpath) {
                                stepResult.checks.xpath = {};
                                for (const path in step.http.check.xpath) {
                                    const dom = new xmldom_1.DOMParser().parseFromString(body);
                                    const result = xpath_1.default.select(path, dom);
                                    stepResult.checks.xpath[path] = (0, matcher_js_1.checkResult)(result.length > 0 ? result[0].firstChild.data : undefined, step.http.check.xpath[path]);
                                }
                            }
                            // Check HTML5 Selectors
                            if (step.http.check.selectors) {
                                stepResult.checks.selectors = {};
                                const dom = cheerio.load(body);
                                for (const selector in step.http.check.selectors) {
                                    const result = dom(selector).html();
                                    stepResult.checks.selectors[selector] = (0, matcher_js_1.checkResult)(result, step.http.check.selectors[selector]);
                                }
                            }
                            // Check Cookies
                            if (step.http.check.cookies) {
                                stepResult.checks.cookies = {};
                                for (const cookie in step.http.check.cookies) {
                                    const value = (0, runner_js_1.getCookie)(cookies, cookie, res.url);
                                    stepResult.checks.cookies[cookie] = (0, matcher_js_1.checkResult)(value, step.http.check.cookies[cookie]);
                                }
                            }
                            // Check captures
                            if (step.http.check.captures) {
                                stepResult.checks.captures = {};
                                for (const capture in step.http.check.captures) {
                                    stepResult.checks.captures[capture] = (0, matcher_js_1.checkResult)(captures[capture], step.http.check.captures[capture]);
                                }
                            }
                            // Check status
                            if (step.http.check.status) {
                                stepResult.checks.status = (0, matcher_js_1.checkResult)(res.statusCode, step.http.check.status);
                            }
                            // Check statusText
                            if (step.http.check.statusText) {
                                stepResult.checks.statusText = (0, matcher_js_1.checkResult)(res.statusMessage, step.http.check.statusText);
                            }
                            // Check whether request was redirected
                            if ('redirected' in step.http.check) {
                                stepResult.checks.redirected = (0, matcher_js_1.checkResult)(res.redirectUrls.length > 0, step.http.check.redirected);
                            }
                            // Check redirects
                            if (step.http.check.redirects) {
                                stepResult.checks.redirects = (0, matcher_js_1.checkResult)(res.redirectUrls, step.http.check.redirects);
                            }
                            // Check sha256
                            if (step.http.check.sha256) {
                                const hash = crypto_1.default.createHash('sha256').update(Buffer.from(responseData)).digest('hex');
                                stepResult.checks.sha256 = (0, matcher_js_1.checkResult)(hash, step.http.check.sha256);
                            }
                            // Check md5
                            if (step.http.check.md5) {
                                const hash = crypto_1.default.createHash('md5').update(Buffer.from(responseData)).digest('hex');
                                stepResult.checks.md5 = (0, matcher_js_1.checkResult)(hash, step.http.check.md5);
                            }
                            // Check Performance
                            if (step.http.check.performance) {
                                stepResult.checks.performance = {};
                                for (const metric in step.http.check.performance) {
                                    stepResult.checks.performance[metric] = (0, matcher_js_1.checkResult)(res.timings.phases[metric], step.http.check.performance[metric]);
                                }
                            }
                            // Check SSL certs
                            if (step.http.check.ssl && sslCertificate) {
                                stepResult.checks.ssl = {};
                                if ('valid' in step.http.check.ssl) {
                                    stepResult.checks.ssl.valid = (0, matcher_js_1.checkResult)((_p = stepResult.response.ssl) === null || _p === void 0 ? void 0 : _p.valid, step.http.check.ssl.valid);
                                }
                                if ('signed' in step.http.check.ssl) {
                                    stepResult.checks.ssl.signed = (0, matcher_js_1.checkResult)((_q = stepResult.response.ssl) === null || _q === void 0 ? void 0 : _q.signed, step.http.check.ssl.signed);
                                }
                                if (step.http.check.ssl.daysUntilExpiration) {
                                    stepResult.checks.ssl.daysUntilExpiration = (0, matcher_js_1.checkResult)((_r = stepResult.response.ssl) === null || _r === void 0 ? void 0 : _r.daysUntilExpiration, step.http.check.ssl.daysUntilExpiration);
                                }
                            }
                            // Check byte size
                            if (step.http.check.size) {
                                stepResult.checks.size = (0, matcher_js_1.checkResult)(responseData.byteLength, step.http.check.size);
                            }
                            // Check co2 emissions
                            if (step.http.check.co2) {
                                stepResult.checks.co2 = (0, matcher_js_1.checkResult)(stepResult.response.co2, step.http.check.co2);
                            }
                        }
                    }
                    if (step.grpc) {
                        stepResult.type = 'grpc';
                        // Load TLS configuration from file or string
                        let tlsConfig;
                        if (step.grpc.auth) {
                            tlsConfig = yield (0, auth_js_1.getTLSCertificate)(step.grpc.auth, credentials, { workflowPath: options === null || options === void 0 ? void 0 : options.path });
                        }
                        const request = {
                            proto: Array.isArray(step.grpc.proto)
                                ? step.grpc.proto.map(proto => node_path_1.default.join(node_path_1.default.dirname((options === null || options === void 0 ? void 0 : options.path) || __dirname), proto))
                                : node_path_1.default.join(node_path_1.default.dirname((options === null || options === void 0 ? void 0 : options.path) || __dirname), step.grpc.proto),
                            host: step.grpc.host,
                            metadata: step.grpc.metadata,
                            service: step.grpc.service,
                            method: step.grpc.method,
                            data: step.grpc.data
                        };
                        const { data, size } = yield (0, cool_grpc_1.makeRequest)(step.grpc.proto, Object.assign(Object.assign({}, request), { tls: tlsConfig, beforeRequest: (req) => {
                                var _a;
                                stepResult.request = request;
                                (_a = options === null || options === void 0 ? void 0 : options.ee) === null || _a === void 0 ? void 0 : _a.emit('step:grpc_request', request);
                            }, afterResponse: (res) => {
                                var _a;
                                stepResult.response = {
                                    body: res.data,
                                    duration: Date.now() - stepResult.timestamp.valueOf(),
                                    co2: ssw.perByte(res.size)
                                };
                                (_a = options === null || options === void 0 ? void 0 : options.ee) === null || _a === void 0 ? void 0 : _a.emit('step:grpc_response', res);
                            } }));
                        // Captures
                        if (step.grpc.captures) {
                            for (const name in step.grpc.captures) {
                                const capture = step.grpc.captures[name];
                                if (capture.jsonpath) {
                                    captures[name] = (0, jsonpath_plus_1.JSONPath)({ path: capture.jsonpath, json: data })[0];
                                }
                            }
                        }
                        if (step.grpc.check) {
                            stepResult.checks = {};
                            // Check JSON
                            if (step.grpc.check.json) {
                                stepResult.checks.json = (0, matcher_js_1.checkResult)(data, step.grpc.check.json);
                            }
                            // Check Schema
                            if (step.grpc.check.schema) {
                                const validate = schemaValidator.compile(step.grpc.check.schema);
                                stepResult.checks.schema = {
                                    expected: step.grpc.check.schema,
                                    given: data,
                                    passed: validate(data)
                                };
                            }
                            // Check JSONPath
                            if (step.grpc.check.jsonpath) {
                                stepResult.checks.jsonpath = {};
                                for (const path in step.grpc.check.jsonpath) {
                                    const result = (0, jsonpath_plus_1.JSONPath)({ path, json: data });
                                    stepResult.checks.jsonpath[path] = (0, matcher_js_1.checkResult)(result[0], step.grpc.check.jsonpath[path]);
                                }
                            }
                            // Check captures
                            if (step.grpc.check.captures) {
                                stepResult.checks.captures = {};
                                for (const capture in step.grpc.check.captures) {
                                    stepResult.checks.captures[capture] = (0, matcher_js_1.checkResult)(captures[capture], step.grpc.check.captures[capture]);
                                }
                            }
                            // Check performance
                            if (step.grpc.check.performance) {
                                stepResult.checks.performance = {};
                                if (step.grpc.check.performance.total) {
                                    stepResult.checks.performance.total = (0, matcher_js_1.checkResult)((_s = stepResult.response) === null || _s === void 0 ? void 0 : _s.duration, step.grpc.check.performance.total);
                                }
                            }
                            // Check byte size
                            if (step.grpc.check.size) {
                                stepResult.checks.size = (0, matcher_js_1.checkResult)(size, step.grpc.check.size);
                            }
                            // Check co2 emissions
                            if (step.grpc.check.co2) {
                                stepResult.checks.co2 = (0, matcher_js_1.checkResult)((_t = stepResult.response) === null || _t === void 0 ? void 0 : _t.co2, step.grpc.check.co2);
                            }
                        }
                    }
                    stepResult.passed = (0, runner_js_1.didChecksPass)(stepResult);
                }
                catch (error) {
                    stepResult.passed = false;
                    stepResult.errored = true;
                    stepResult.errorMessage = error.message;
                    (_u = options === null || options === void 0 ? void 0 : options.ee) === null || _u === void 0 ? void 0 : _u.emit('step:error', error);
                }
            }
            stepResult.duration = Date.now() - stepResult.timestamp.valueOf();
            stepResult.responseTime = ((_v = stepResult.response) === null || _v === void 0 ? void 0 : _v.duration) || 0;
            stepResult.co2 = ((_w = stepResult.response) === null || _w === void 0 ? void 0 : _w.co2) || 0;
            testResult.steps.push(stepResult);
            previous = stepResult;
            (_x = options === null || options === void 0 ? void 0 : options.ee) === null || _x === void 0 ? void 0 : _x.emit('step:result', stepResult);
        }
        testResult.duration = Date.now() - testResult.timestamp.valueOf();
        testResult.co2 = testResult.steps.map(step => step.co2).reduce((a, b) => a + b);
        testResult.passed = testResult.steps.every(step => step.passed);
        (_y = options === null || options === void 0 ? void 0 : options.ee) === null || _y === void 0 ? void 0 : _y.emit('test:result', testResult);
        return testResult;
    });
}
