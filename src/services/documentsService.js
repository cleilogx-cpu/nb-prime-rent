import { supabase } from '../lib/supabaseClient.js'
import { DOCUMENT_TYPE, OCR_STATUS } from '../lib/constants.js'

const TABLE = 'contract_documents'
const BUCKET = 'documents'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024 // 8MB, já depois de comprimir imagem

const IMAGE_MAX_DIMENSION = 1600 // px -- preserva legibilidade de texto (CNH/comprovante), corta peso de foto de celular
const IMAGE_QUALITY = 0.82

const OCR_APPLICABLE_TYPES = [DOCUMENT_TYPE.CNH, DOCUMENT_TYPE.COMPROVANTE_RESIDENCIA]

function validateFile(file) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Formato não suportado. Envie PDF, JPG, JPEG ou PNG.'
  }
  return null
}

/**
 * Redimensiona e recomprime a imagem no próprio navegador antes do upload
 * (seção 5 do pedido) -- uma foto de celular de 10-15MB não precisa disso
 * pra continuar legível. PDF passa direto, sem tentar processar.
 */
async function compressImage(file) {
  if (!file.type.startsWith('image/')) {
    return file
  }

  const imageBitmap = await createImageBitmap(file)
  const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(imageBitmap.width, imageBitmap.height))
  const targetWidth = Math.round(imageBitmap.width * scale)
  const targetHeight = Math.round(imageBitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight)
  imageBitmap.close?.()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', IMAGE_QUALITY))

  if (!blob) {
    return file
  }

  const compressedName = file.name.replace(/\.\w+$/, '') + '.jpg'
  return new File([blob], compressedName, { type: 'image/jpeg' })
}

/**
 * Envia um documento (CNH, comprovante, contrato gerado/assinado, imagem
 * de assinatura) pro bucket privado `documents` e registra a linha em
 * `contract_documents`. `contractDocumentId` já sai definido aqui (não
 * deixado pro default do banco) porque o caminho no Storage já embute
 * esse id -- então o caminho nunca precisa ser reconstruído "na mão" em
 * lugar nenhum, é sempre derivado da própria linha.
 *
 * `draftSessionId` é obrigatório mesmo quando `contractId` já existe --
 * é o que faz o dossiê sobreviver a um reload no meio do wizard, antes do
 * contrato existir (ver Fase 2). Quando `supersedesDocumentId` é passado,
 * a linha antiga é marcada como substituída (nunca apagada nem
 * sobrescrita -- seção 4 do pedido, "nunca apagar documentos").
 */
export async function uploadDocument(file, { draftSessionId, docType, tenantId, contractId, supersedesDocumentId }) {
  const validationError = validateFile(file)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  const processedFile = await compressImage(file)

  if (processedFile.size > MAX_FILE_SIZE_BYTES) {
    return { data: null, error: { message: 'Arquivo grande demais, mesmo depois de comprimir. Tente uma foto mais simples ou um PDF menor.' } }
  }

  const { data: userData } = await supabase.auth.getUser()

  const documentId = crypto.randomUUID()
  const extension = processedFile.type === 'application/pdf' ? 'pdf' : 'jpg'
  const folder = contractId ? `contracts/${contractId}` : `drafts/${draftSessionId}`
  const storagePath = `${folder}/${documentId}-${docType}.${extension}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, processedFile, {
    contentType: processedFile.type,
    upsert: false,
  })

  if (uploadError) {
    return { data: null, error: uploadError }
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      id: documentId,
      draft_session_id: draftSessionId,
      tenant_id: tenantId || null,
      contract_id: contractId || null,
      doc_type: docType,
      storage_path: storagePath,
      mime_type: processedFile.type,
      original_filename: file.name,
      file_size_bytes: processedFile.size,
      ocr_status: OCR_APPLICABLE_TYPES.includes(docType) ? OCR_STATUS.PENDING : OCR_STATUS.NOT_APPLICABLE,
      uploaded_by: userData?.user?.id || null,
    })
    .select('*')
    .single()

  if (error) {
    return { data: null, error }
  }

  if (supersedesDocumentId) {
    const { error: supersedeError } = await supabase
      .from(TABLE)
      .update({ superseded_by: data.id })
      .eq('id', supersedesDocumentId)

    if (supersedeError) {
      console.warn('Falha ao marcar documento anterior como substituído:', supersedeError.message)
    }
  }

  return { data, error: null }
}

/**
 * Link temporário e seguro pra ver/baixar um documento -- nunca existe
 * URL pública permanente pro bucket `documents` (privado).
 */
export async function getSignedUrl(storagePath, expiresInSeconds = 300) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSeconds)
  return { url: data?.signedUrl || null, error }
}

export async function listDocumentsForContract(contractId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: true })

  return { data: data ?? [], error }
}

export async function listDocumentsForDraftSession(draftSessionId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('draft_session_id', draftSessionId)
    .order('created_at', { ascending: true })

  return { data: data ?? [], error }
}

/**
 * Preenche tenant_id/contract_id nos documentos enviados antes desses
 * registros existirem (etapas Documentos/Locação do wizard, Fase 2) --
 * filtra por draft_session_id, não por tenant_id, pra nunca cruzar
 * documentos de duas sessões de wizard abertas ao mesmo tempo.
 */
export async function backfillTenantId(draftSessionId, tenantId) {
  const { error } = await supabase.from(TABLE).update({ tenant_id: tenantId }).eq('draft_session_id', draftSessionId)
  return { error }
}

export async function backfillContractId(draftSessionId, contractId) {
  const { error } = await supabase.from(TABLE).update({ contract_id: contractId }).eq('draft_session_id', draftSessionId)
  return { error }
}
