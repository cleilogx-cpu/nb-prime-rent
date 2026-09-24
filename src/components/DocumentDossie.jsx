import { useEffect, useState } from 'react'
import { Download, Loader2, Upload } from 'lucide-react'
import { uploadDocument, getSignedUrl, listDocumentsForContract, listDocumentsForDraftSession, requestOcrExtraction } from '../services/documentsService.js'
import { DOCUMENT_TYPE, DOCUMENT_TYPE_LABELS, OCR_STATUS } from '../lib/constants.js'

// Só estes dois tipos são enviados manualmente pelo operador -- os demais
// (contrato gerado/assinado, imagem da assinatura) são anexados sozinhos
// pelo sistema nas fases seguintes, e só aparecem aqui quando já existirem.
const UPLOADABLE_TYPES = [DOCUMENT_TYPE.CNH, DOCUMENT_TYPE.COMPROVANTE_RESIDENCIA]
const OCR_APPLICABLE_TYPES = [DOCUMENT_TYPE.CNH, DOCUMENT_TYPE.COMPROVANTE_RESIDENCIA]

/**
 * Seção "Dossiê" reutilizável -- usada tanto no drawer de detalhes de um
 * contrato já existente quanto (Fase 2) na etapa "Documentos" do wizard
 * de novo contrato, antes do contrato existir de verdade (por isso aceita
 * `contractId` OU `draftSessionId`, nunca os dois vazios).
 *
 * `enableOcr` (Fase 4) só é ligado pelo wizard -- reenviar um documento
 * num contrato já existente (uso do Fase 1, via ContractDetailsDrawer) não
 * dispara leitura automática, pra não gastar chamada ao Document AI à toa
 * quando não há formulário nenhum esperando o preenchimento.
 */
export default function DocumentDossie({ contractId, tenantId, draftSessionId, onUploaded, enableOcr = false, onFieldsExtracted }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingType, setUploadingType] = useState(null)
  const [processingType, setProcessingType] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = contractId
      ? await listDocumentsForContract(contractId)
      : await listDocumentsForDraftSession(draftSessionId)
    setDocuments(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (contractId || draftSessionId) {
      load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, draftSessionId])

  const latestByType = (docType) =>
    documents
      .filter((doc) => doc.doc_type === docType && !doc.superseded_by)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]

  const handleView = async (doc) => {
    setError('')
    const { url, error: urlError } = await getSignedUrl(doc.storage_path)
    if (urlError || !url) {
      setError('Não foi possível abrir o documento.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleUpload = async (docType, file) => {
    if (!file) {
      return
    }

    setUploadingType(docType)
    setError('')

    const previousDoc = latestByType(docType)

    const { data: uploaded, error: uploadError } = await uploadDocument(file, {
      draftSessionId: draftSessionId || crypto.randomUUID(),
      docType,
      tenantId,
      contractId,
      supersedesDocumentId: previousDoc?.id,
    })

    setUploadingType(null)

    if (uploadError) {
      setError(uploadError.message || 'Falha ao enviar o documento.')
      return
    }

    await load()
    onUploaded?.()

    if (enableOcr && OCR_APPLICABLE_TYPES.includes(docType)) {
      setProcessingType(docType)
      const { data: ocrResult } = await requestOcrExtraction(uploaded.id)
      setProcessingType(null)
      await load()

      if (ocrResult?.fields) {
        onFieldsExtracted?.(docType, ocrResult.fields)
      }
    }
  }

  const visibleTypes = Object.keys(DOCUMENT_TYPE_LABELS).filter(
    (docType) => latestByType(docType) || UPLOADABLE_TYPES.includes(docType),
  )

  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
      <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Dossiê</p>

      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {visibleTypes.map((docType) => {
          const doc = latestByType(docType)
          const canUpload = UPLOADABLE_TYPES.includes(docType)

          const showOcrBadge = enableOcr && OCR_APPLICABLE_TYPES.includes(docType) && doc
          const isProcessing = processingType === docType

          return (
            <div key={docType} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-300">{DOCUMENT_TYPE_LABELS[docType]}</span>
                {showOcrBadge ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                      isProcessing
                        ? 'border-amber-300/20 bg-amber-300/10 text-amber-200'
                        : doc.ocr_status === OCR_STATUS.SUCCESS
                          ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                          : doc.ocr_status === OCR_STATUS.FAILED
                            ? 'border-rose-400/20 bg-rose-500/10 text-rose-200'
                            : 'border-white/10 text-slate-400'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={10} className="animate-spin" />
                        Processando
                      </>
                    ) : doc.ocr_status === OCR_STATUS.SUCCESS ? (
                      'Processado'
                    ) : doc.ocr_status === OCR_STATUS.PARTIAL ? (
                      'Processado (parcial)'
                    ) : doc.ocr_status === OCR_STATUS.FAILED ? (
                      'Erro na leitura'
                    ) : (
                      'Aguardando leitura'
                    )}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {doc ? (
                  <button
                    type="button"
                    onClick={() => handleView(doc)}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-200"
                  >
                    <Download size={12} />
                    Visualizar
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">Não enviado</span>
                )}
                {canUpload ? (
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs text-amber-200">
                    <Upload size={12} />
                    {uploadingType === docType ? 'Enviando...' : isProcessing ? 'Lendo...' : doc ? 'Reenviar' : 'Enviar'}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      capture="environment"
                      className="hidden"
                      disabled={uploadingType === docType || isProcessing}
                      onChange={(event) => handleUpload(docType, event.target.files?.[0])}
                    />
                  </label>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {loading ? <p className="mt-3 text-xs text-slate-500">Carregando documentos...</p> : null}
    </div>
  )
}
