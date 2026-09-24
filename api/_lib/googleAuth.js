import crypto from 'node:crypto'

function base64url(input) {
  return Buffer.from(input).toString('base64url')
}

/**
 * Troca as credenciais da conta de serviço do Google por um access token
 * OAuth2 (fluxo padrão service-account JWT bearer, RFC 7523). Sem
 * dependência nova -- só `crypto` nativo do Node, já disponível nas
 * funções serverless da Vercel.
 */
export async function getGoogleAccessToken(credentialsJson) {
  const credentials = JSON.parse(credentialsJson)
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), credentials.private_key)
  const jwt = `${unsigned}.${signature.toString('base64url')}`

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Falha ao autenticar com o Google: ${text}`)
  }

  const data = await response.json()
  return data.access_token
}
