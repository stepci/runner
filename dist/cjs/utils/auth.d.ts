/// <reference types="node" />
import { StepFile, TryFileOptions } from './files.js';
export declare type Credential = {
    basic?: {
        username: string;
        password: string;
    };
    bearer?: {
        token: string;
    };
    oauth?: {
        endpoint: string;
        client_id: string;
        client_secret: string;
        audience?: string;
    };
    certificate?: {
        ca?: string | StepFile;
        cert?: string | StepFile;
        key?: string | StepFile;
        passphrase?: string;
    };
    tls?: {
        rootCerts?: string | StepFile;
        privateKey?: string | StepFile;
        certChain?: string | StepFile;
    };
};
export declare type CredentialRef = {
    $ref: string;
};
export declare type CredentialsStorage = {
    [key: string]: Credential;
};
declare type OAuthClientConfig = {
    endpoint: string;
    client_id: string;
    client_secret: string;
    audience?: string;
};
export declare type OAuthResponse = {
    access_token: string;
    expires_in: number;
    token_type: string;
};
export declare type HTTPCertificate = {
    certificate?: string | Buffer;
    key?: string | Buffer;
    certificateAuthority?: string | Buffer;
    passphrase?: string;
};
export declare type TLSCertificate = {
    rootCerts?: string | Buffer;
    privateKey?: string | Buffer;
    certChain?: string | Buffer;
};
export declare function getOAuthToken(clientConfig: OAuthClientConfig): Promise<OAuthResponse>;
export declare function getAuthHeader(credential: CredentialRef | Credential, credentialsStorage?: CredentialsStorage): Promise<string | undefined>;
export declare function getClientCertificate(credential: CredentialRef | Credential, credentialsStorage?: CredentialsStorage, options?: TryFileOptions): Promise<HTTPCertificate | undefined>;
export declare function TLSCertificateFromCredential(certificate: Credential['tls'], options?: TryFileOptions): Promise<TLSCertificate | undefined>;
export declare function getTLSCertificate(credential: CredentialRef | Credential, credentialsStorage?: CredentialsStorage, options?: TryFileOptions): Promise<TLSCertificate | undefined>;
export {};
