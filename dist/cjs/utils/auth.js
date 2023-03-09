"use strict";
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
exports.getTLSCertificate = exports.TLSCertificateFromCredential = exports.getClientCertificate = exports.getAuthHeader = exports.getOAuthToken = void 0;
const got_1 = __importDefault(require("got"));
const files_js_1 = require("./files.js");
function getOAuthToken(clientConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield got_1.default.post(clientConfig.endpoint, {
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: clientConfig.client_id,
                client_secret: clientConfig.client_secret,
                audience: clientConfig.audience
            })
        })
            .json();
    });
}
exports.getOAuthToken = getOAuthToken;
function resolveCredential(credential, credentialsStorage) {
    if (credential.$ref) {
        if (!credentialsStorage)
            throw new Error(`No credentials found`);
        const resolvedRef = credential.$ref.match('#\/components\/credentials\/(.*)');
        if (!resolvedRef || !credentialsStorage[resolvedRef[1]])
            throw new Error(`No credential found: ${credential}`);
        return credentialsStorage[resolvedRef[1]];
    }
    else if (typeof credential === 'object') {
        return credential;
    }
}
function authHeaderFromCredential(credential) {
    return __awaiter(this, void 0, void 0, function* () {
        if (credential.basic) {
            return 'Basic ' + Buffer.from(credential.basic.username + ':' + credential.basic.password).toString('base64');
        }
        if (credential.bearer) {
            return 'Bearer ' + credential.bearer.token;
        }
        if (credential.oauth) {
            const { access_token } = yield getOAuthToken(credential.oauth);
            return 'Bearer ' + access_token;
        }
    });
}
function getAuthHeader(credential, credentialsStorage) {
    return __awaiter(this, void 0, void 0, function* () {
        const resolvedCredential = resolveCredential(credential, credentialsStorage);
        if (resolvedCredential) {
            return authHeaderFromCredential(resolvedCredential);
        }
    });
}
exports.getAuthHeader = getAuthHeader;
function clientCertificateFromCredential(certificate, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (certificate) {
            const cert = {};
            if (certificate.cert) {
                cert.certificate = yield (0, files_js_1.tryFile)(certificate.cert, options);
            }
            if (certificate.key) {
                cert.key = yield (0, files_js_1.tryFile)(certificate.key, options);
            }
            if (certificate.ca) {
                cert.certificateAuthority = yield (0, files_js_1.tryFile)(certificate.ca, options);
            }
            if (certificate.passphrase) {
                cert.passphrase = certificate.passphrase;
            }
            return cert;
        }
    });
}
function getClientCertificate(credential, credentialsStorage, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const resolvedCredential = resolveCredential(credential, credentialsStorage);
        if (resolvedCredential) {
            return clientCertificateFromCredential(resolvedCredential.certificate, options);
        }
    });
}
exports.getClientCertificate = getClientCertificate;
function TLSCertificateFromCredential(certificate, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (certificate) {
            const tlsConfig = {};
            if (certificate.rootCerts) {
                tlsConfig.rootCerts = yield (0, files_js_1.tryFile)(certificate.rootCerts, options);
            }
            if (certificate.privateKey) {
                tlsConfig.privateKey = yield (0, files_js_1.tryFile)(certificate.privateKey, options);
            }
            if (certificate.certChain) {
                tlsConfig.certChain = yield (0, files_js_1.tryFile)(certificate.certChain, options);
            }
            return tlsConfig;
        }
    });
}
exports.TLSCertificateFromCredential = TLSCertificateFromCredential;
function getTLSCertificate(credential, credentialsStorage, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const resolvedCredential = resolveCredential(credential, credentialsStorage);
        if (resolvedCredential) {
            return TLSCertificateFromCredential(resolvedCredential.tls, options);
        }
    });
}
exports.getTLSCertificate = getTLSCertificate;
