import { createClient } from '@supabase/supabase-js'
import { processDocument } from '../_lib/documentAi.js'
import { extractCnhFields, extractComprovanteFields } from '../_lib/extractFields.js'

const BUCKET = 'documents'
const OCR_APPLICABLE_TYPES = ['cnh', 'comprovante_residencia']

function isConfigured() {
  return Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.GOOGLE_DOCUMENT_AI_CREDENTIALS &&
    process.env.GOOGLE_DOCUMENT_AI_PROJECT_ID &&
    process.env.GOOGLE_DOCUMENT_AI_LOCATION &&
    process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID,
  )
}

/**
 * Primeira função de servidor do projeto (Fase 4 do Contrato Inteligente).
 * Recebe só o `document_id` de uma linha já existente em
 * contract_documents (o arquivo já foi do navegador direto pro Storage,
 * nunca passa por aqui) -- confirma que quem chamou está logado, baixa o
 * arquivo com a chave de serviço, manda pro Document AI, extrai os campos
 * e grava o resultado na própria linha do documento.
 *
 * Enquanto as variáveis de ambiente do Google não estiverem configuradas,
 * devolve `not_applicable` sem erro -- o wizard continua funcionando 100%
 * manual, exatamente como na Fase 2, até a Fase 4 ser ligada de verdade.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  if (!isConfigured()) {
    res.status(200).json({ ocr_status: 'not_applicable', fields: {} })
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

  const { document_id: documentId } = req.body || {}
  if (!documentId) {
    res.status(400).json({ error: 'document_id é obrigatório.' })
    return
  }

  const { data: document, error: documentError } = await supabaseAdmin
    .from('contract_documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (documentError || !document) {
    res.status(404).json({ error: 'Documento não encontrado.' })
    return
  }

  if (!OCR_APPLICABLE_TYPES.includes(document.doc_type)) {
    res.status(200).json({ ocr_status: 'not_applicable', fields: {} })
    return
  }

  try {
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(document.storage_path)

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message || 'Falha ao baixar o arquivo do Storage.')
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const contentBase64 = Buffer.from(arrayBuffer).toString('base64')

    const rawText = await processDocument({
      credentialsJson: process.env.GOOGLE_DOCUMENT_AI_CREDENTIALS,
      projectId: process.env.GOOGLE_DOCUMENT_AI_PROJECT_ID,
      location: process.env.GOOGLE_DOCUMENT_AI_LOCATION,
      processorId: process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID,
      contentBase64,
      mimeType: document.mime_type,
    })

    const fields = document.doc_type === 'cnh'
      ? extractCnhFields(rawText)
      : await extractComprovanteFields(rawText)

    const hasAnyField = Object.values(fields).some(Boolean)
    const ocrStatus = hasAnyField ? 'success' : 'partial'

    await supabaseAdmin
      .from('contract_documents')
      .update({ ocr_status: ocrStatus, ocr_fields: fields, ocr_raw_response: { text: rawText } })
      .eq('id', documentId)

    res.status(200).json({ ocr_status: ocrStatus, fields })
  } catch (error) {
    console.error('Falha no OCR:', error)

    await supabaseAdmin
      .from('contract_documents')
      .update({ ocr_status: 'failed' })
      .eq('id', documentId)

    res.status(200).json({ ocr_status: 'failed', fields: {}, error: error.message })
  }
}
