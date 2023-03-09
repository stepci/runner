import got from 'got';
import { tryFile } from './files.js';
export async function getOAuthToken(clientConfig) {
    return await got.post(clientConfig.endpoint, {
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
}
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
async function authHeaderFromCredential(credential) {
    if (credential.basic) {
        return 'Basic ' + Buffer.from(credential.basic.username + ':' + credential.basic.password).toString('base64');
    }
    if (credential.bearer) {
        return 'Bearer ' + credential.bearer.token;
    }
    if (credential.oauth) {
        const { access_token } = await getOAuthToken(credential.oauth);
        return 'Bearer ' + access_token;
    }
}
export async function getAuthHeader(credential, credentialsStorage) {
    const resolvedCredential = resolveCredential(credential, credentialsStorage);
    if (resolvedCredential) {
        return authHeaderFromCredential(resolvedCredential);
    }
}
async function clientCertificateFromCredential(certificate, options) {
    if (certificate) {
        const cert = {};
        if (certificate.cert) {
            cert.certificate = await tryFile(certificate.cert, options);
        }
        if (certificate.key) {
            cert.key = await tryFile(certificate.key, options);
        }
        if (certificate.ca) {
            cert.certificateAuthority = await tryFile(certificate.ca, options);
        }
        if (certificate.passphrase) {
            cert.passphrase = certificate.passphrase;
        }
        return cert;
    }
}
export async function getClientCertificate(credential, credentialsStorage, options) {
    const resolvedCredential = resolveCredential(credential, credentialsStorage);
    if (resolvedCredential) {
        return clientCertificateFromCredential(resolvedCredential.certificate, options);
    }
}
export async function TLSCertificateFromCredential(certificate, options) {
    if (certificate) {
        const tlsConfig = {};
        if (certificate.rootCerts) {
            tlsConfig.rootCerts = await tryFile(certificate.rootCerts, options);
        }
        if (certificate.privateKey) {
            tlsConfig.privateKey = await tryFile(certificate.privateKey, options);
        }
        if (certificate.certChain) {
            tlsConfig.certChain = await tryFile(certificate.certChain, options);
        }
        return tlsConfig;
    }
}
export async function getTLSCertificate(credential, credentialsStorage, options) {
    const resolvedCredential = resolveCredential(credential, credentialsStorage);
    if (resolvedCredential) {
        return TLSCertificateFromCredential(resolvedCredential.tls, options);
    }
}
