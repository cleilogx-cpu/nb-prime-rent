import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'documents'

/**
 * Fecha a assinatura eletrônica de um contrato (Fase 5 do Contrato
 * Inteligente). Recebe os ids dos documentos já enviados pelo navegador
 * (PDF final + imagem da assinatura) e os dados de quem assinou -- mas o
 * hash do PDF NUNCA vem do cliente: o servidor baixa o arquivo com a chave
 * de serviço e calcula o SHA-256 ele mesmo, e o IP/user-agent vêm do
 * cabeçalho da própria requisição, nunca do corpo. É isso que faz o
 * registro em contract_signatures ser evidência de verdade, não um valor
 * que o navegador poderia forjar.
 *
 * Idempotente: se já existir assinatura pra esse contract_id (clique
 * duplo, rede instável no celular), devolve a que já existe em vez de
 * tentar criar (e falhar) uma segunda, já que a coluna é UNIQUE.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: 'Assinatura eletrônica não configurada no servidor.' })
    return
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!token) {
    res.status(401).json({ error: 'Não autenticado.' })
    return
  }

  const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) {
    res.status(401).json({ error: 'Sessão inválida.' })
    return
  }

  const {
    contract_id: contractId,
    signed_pdf_document_id: signedPdfDocumentId,
    signature_image_document_id: signatureImageDocumentId,
    signer_full_name: signerFullName,
    signer_cpf: signerCpf,
  } = req.body || {}

  if (!contractId || !signedPdfDocumentId || !signatureImageDocumentId || !signerFullName || !signerCpf) {
    res.status(400).json({ error: 'Dados obrigatórios da assinatura ausentes.' })
    return
  }

  const { data: existing } = await supabaseAdmin
    .from('contract_signatures')
    .select('*')
    .eq('contract_id', contractId)
    .maybeSingle()

  if (existing) {
    res.status(200).json({ signature: existing })
    return
  }

  const { data: pdfDocument, error: pdfDocumentError } = await supabaseAdmin
    .from('contract_documents')
    .select('*')
    .eq('id', signedPdfDocumentId)
    .single()

  if (pdfDocumentError || !pdfDocument) {
    res.status(404).json({ error: 'Documento do contrato assinado não encontrado.' })
    return
  }

  try {
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(pdfDocument.storage_path)

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message || 'Falha ao baixar o PDF assinado do Storage.')
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const documentHash = crypto.createHash('sha256').update(Buffer.from(arrayBuffer)).digest('hex')

    const forwardedFor = req.headers['x-forwarded-for'] || ''
    const ipAddress = forwardedFor.split(',')[0].trim() || req.socket?.remoteAddress || null
    const userAgent = req.headers['user-agent'] || null

    const { data: signature, error: insertError } = await supabaseAdmin
      .from('contract_signatures')
      .insert({
        contract_id: contractId,
        signer_full_name: signerFullName,
        signer_cpf: signerCpf,
        signature_image_document_id: signatureImageDocumentId,
        signed_pdf_document_id: signedPdfDocumentId,
        document_hash: documentHash,
        operator_user_id: userData.user.id,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select('*')
      .single()

    if (insertError) {
      // Corrida (clique duplo) -- outra chamada já inseriu entre o select
      // de idempotência e este insert. Devolve a que já existe.
      if (insertError.code === '23505') {
        const { data: raceExisting } = await supabaseAdmin
          .from('contract_signatures')
          .select('*')
          .eq('contract_id', contractId)
          .single()
        res.status(200).json({ signature: raceExisting })
        return
      }
      throw insertError
    }

    res.status(200).json({ signature })
  } catch (error) {
    console.error('Falha ao finalizar assinatura:', error)
    res.status(500).json({ error: error.message || 'Falha ao finalizar a assinatura.' })
  }
}
