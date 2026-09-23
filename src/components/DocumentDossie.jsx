import { useEffect, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { uploadDocument, getSignedUrl, listDocumentsForContract, listDocumentsForDraftSession } from '../services/documentsService.js'
import { DOCUMENT_TYPE, DOCUMENT_TYPE_LABELS } from '../lib/constants.js'

// Só estes dois tipos são enviados manualmente pelo operador -- os demais
// (contrato gerado/assinado, imagem da assinatura) são anexados sozinhos
// pelo sistema nas fases seguintes, e só aparecem aqui quando já existirem.
const UPLOADABLE_TYPES = [DOCUMENT_TYPE.CNH, DOCUMENT_TYPE.COMPROVANTE_RESIDENCIA]

/**
 * Seção "Dossiê" reutilizável -- usada tanto no drawer de detalhes de um
 * contrato já existente quanto (Fase 2) na etapa "Documentos" do wizard
 * de novo contrato, antes do contrato existir de verdade (por isso aceita
 * `contractId` OU `draftSessionId`, nunca os dois vazios).
 */
export default function DocumentDossie({ contractId, tenantId, draftSessionId, onUploaded }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingType, setUploadingType] = useState(null)
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

    const { error: uploadError } = await uploadDocument(file, {
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

          return (
            <div key={docType} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm">
              <span className="text-slate-300">{DOCUMENT_TYPE_LABELS[docType]}</span>
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
                    {uploadingType === docType ? 'Enviando...' : doc ? 'Reenviar' : 'Enviar'}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      capture="environment"
                      className="hidden"
                      disabled={uploadingType === docType}
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
