import got from 'got'

type OAuthResponse = {
  access_token: string
  expires_in: number
  token_type: string
}

export async function getOAuthToken (endpoint: string, client_id: string, client_secret: string, audience: string | undefined): Promise<OAuthResponse> {
  return await got.post(endpoint, {
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id,
      client_secret,
      audience
    })
  })
  .json() as OAuthResponse
}
