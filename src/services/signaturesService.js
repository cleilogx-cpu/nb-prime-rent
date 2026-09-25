import { supabase } from '../lib/supabaseClient.js'

/**
 * Chama a função de servidor que fecha a assinatura eletrônica (Fase 5) --
 * mesmo padrão de documentsService.requestOcrExtraction: o hash do PDF e o
 * IP/user-agent nunca são calculados/lidos no navegador, só a função de
 * servidor tem essa responsabilidade (evidência de verdade, não um valor
 * que o cliente poderia forjar).
 */
export async function finalizeSignature({ contractId, signedPdfDocumentId, signatureImageDocumentId, signerFullName, signerCpf }) {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData?.session?.access_token

  if (!accessToken) {
    return { data: null, error: { message: 'Sessão expirada.' } }
  }

  try {
    const response = await fetch('/api/signatures/finalize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contract_id: contractId,
        signed_pdf_document_id: signedPdfDocumentId,
        signature_image_document_id: signatureImageDocumentId,
        signer_full_name: signerFullName,
        signer_cpf: signerCpf,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { data: null, error: { message: data?.error || 'Falha ao finalizar a assinatura.' } }
    }

    return { data: data.signature, error: null }
  } catch (error) {
    return { data: null, error: { message: error.message } }
  }
}
