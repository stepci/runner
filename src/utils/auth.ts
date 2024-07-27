import got from 'got'
import { StepFile, TryFileOptions, tryFile } from './files'

enum OauthContentType {
  JSON = 'application/json',
  FORM = 'application/x-www-form-urlencoded'
}
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
    scope?: string
    contentType?: OauthContentType
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
  scope?: string
  contentType?: OauthContentType
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

export async function getOAuthToken(clientConfig: OAuthClientConfig): Promise<OAuthResponse> {
  let contentType = OauthContentType.JSON
  let body = ''
  let authObject: {[key: string]: any} = {
    grant_type: 'client_credentials',
    client_id: clientConfig.client_id,
    client_secret: clientConfig.client_secret,
    audience: clientConfig.audience,
    scope: clientConfig.scope
  }
  if (clientConfig.contentType === OauthContentType.FORM) {
    contentType = clientConfig.contentType
    let authParams = new URLSearchParams()
    for (const key in authObject) {
      if(authObject[key]){
        authParams.append(key, authObject[key])
      }
    }
    body = authParams.toString()
  } else {
    body = JSON.stringify(authObject)
  }
  return await got.post(clientConfig.endpoint, {
    headers: {
      'Content-Type': contentType
    },
    body: body
  })
    .json() as OAuthResponse
}

export async function getAuthHeader(credential: Credential): Promise<string | undefined> {
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

export async function getClientCertificate(certificate: Credential['certificate'], options?: TryFileOptions): Promise<HTTPCertificate | undefined> {
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

export async function getTLSCertificate(certificate: Credential['tls'], options?: TryFileOptions): Promise<TLSCertificate | undefined> {
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
