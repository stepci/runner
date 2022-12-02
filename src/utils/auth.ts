import got from 'got'
import { StepFile, TryFileOptions, tryFile } from './files'

export type Credential = {
  basic?: {
    username: string
    password: string
  }
  bearer?: {
    token: string
  }
  oauth?: {
    endpoint: string
    client_id: string
    client_secret: string
    audience?: string
  }
  certificate?: {
    ca?: string | StepFile
    cert?: string | StepFile
    key?: string | StepFile
    passphrase?: string
  }
  tls?: {
    rootCerts?: string | StepFile
    privateKey?: string | StepFile
    certChain?: string | StepFile
  }
}

export type CredentialsStorage = {
  [key: string]: Credential
}

type OAuthClientConfig = {
  endpoint: string
  client_id: string
  client_secret: string
  audience?: string
}

export type OAuthResponse = {
  access_token: string
  expires_in: number
  token_type: string
}

export type HTTPCertificate = {
  certificate?: string | Buffer
  key?: string | Buffer
  certificateAuthority?: string | Buffer
  passphrase?: string
}

export type TLSCertificate = {
  rootCerts?: string | Buffer
  privateKey?: string | Buffer
  certChain?: string | Buffer
}

export async function getOAuthToken (clientConfig: OAuthClientConfig): Promise<OAuthResponse> {
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
  .json() as OAuthResponse
}

async function authHeaderFromCredential (credential: Credential): Promise<string | undefined> {
  if (credential.basic) {
    return 'Basic ' + Buffer.from(credential.basic.username + ':' + credential.basic.password).toString('base64')
  }

  if (credential.bearer) {
    return 'Bearer ' + credential.bearer.token
  }

  if (credential.oauth) {
    const { access_token } = await getOAuthToken(credential.oauth)
    return 'Bearer ' + access_token
  }
}

export async function getAuthHeader (credential: string | Credential, credentialsStorage?: CredentialsStorage): Promise<string | undefined> {
  if (typeof credential === 'object') {
    return authHeaderFromCredential(credential)
  }

  if (typeof credential === 'string' && credentialsStorage) {
    if (!credentialsStorage[credential]) throw `No such credential: ${credential} found`
    return authHeaderFromCredential(credentialsStorage[credential])
  }
}

async function clientCertificateFromCredential (certificate: Credential['certificate'], options?: TryFileOptions): Promise<HTTPCertificate | undefined> {
  if (certificate) {
    const cert: HTTPCertificate = {}

    if (certificate.cert) {
      cert.certificate = await tryFile(certificate.cert, options)
    }

    if (certificate.key) {
      cert.key = await tryFile(certificate.key, options)
    }

    if (certificate.ca) {
      cert.certificateAuthority = await tryFile(certificate.ca, options)
    }

    if (certificate.passphrase) {
      cert.passphrase = certificate.passphrase
    }

    return cert
  }
}

export async function getClientCertificate (credential: string | Credential, credentialsStorage?: CredentialsStorage, options?: TryFileOptions): Promise<HTTPCertificate | undefined> {
  if (typeof credential === 'object' && credential) {
    return clientCertificateFromCredential(credential.certificate, options)
  }

  if (typeof credential === 'string' && credentialsStorage) {
    if (!credentialsStorage[credential]) throw `No such credential: ${credential} found`
    return clientCertificateFromCredential(credentialsStorage[credential].certificate, options)
  }
}

export async function TLSCertificateFromCredential (certificate: Credential['tls'], options?: TryFileOptions): Promise<TLSCertificate | undefined> {
  if (certificate) {
    const tlsConfig: TLSCertificate = {}

    if (certificate.rootCerts) {
      tlsConfig.rootCerts = await tryFile(certificate.rootCerts, options)
    }

    if (certificate.privateKey) {
      tlsConfig.privateKey = await tryFile(certificate.privateKey, options)
    }

    if (certificate.certChain) {
      tlsConfig.certChain = await tryFile(certificate.certChain, options)
    }

    return tlsConfig
  }
}

export async function getTLSCertificate (credential: string | Credential['tls'], credentialsStorage?: CredentialsStorage, options?: TryFileOptions): Promise<TLSCertificate | undefined> {
  if (typeof credential === 'object' && credential) {
    return TLSCertificateFromCredential(credential, options)
  }

  if (typeof credential === 'string' && credentialsStorage) {
    if (!credentialsStorage[credential]) throw `No such credential: ${credential} found`
    return TLSCertificateFromCredential(credentialsStorage[credential].tls, options)
  }
}
