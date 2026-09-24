import { getGoogleAccessToken } from './googleAuth.js'

/**
 * Chama o processador de OCR genérico do Google Document AI (Document OCR
 * -- existe em qualquer projeto, ao contrário de um extrator específico de
 * CNH brasileira, que não tem confirmação de existir no catálogo do
 * Google) e devolve o texto extraído. A extração dos campos específicos
 * (nome, CPF, endereço etc.) é feita depois, em cima desse texto --
 * ver extractFields.js.
 */
export async function processDocument({ credentialsJson, projectId, location, processorId, contentBase64, mimeType }) {
  const accessToken = await getGoogleAccessToken(credentialsJson)

  const url = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rawDocument: { content: contentBase64, mimeType },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Document AI retornou erro: ${text}`)
  }

  const data = await response.json()
  return data.document?.text || ''
}
