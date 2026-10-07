import { useEffect, useMemo, useState } from 'react'
import { Check, Download, FileText, Share2, X } from 'lucide-react'
import { listVehicles } from '../services/vehiclesService.js'
import { findOrCreateTenant } from '../services/tenantsService.js'
import {
  DOCUMENT_STATUS,
  createContract,
  generateMinuta,
  setDocumentStatus,
  signContract,
  updateContract,
  validateMinuta,
} from '../services/contractsService.js'
import {
  DOCX_MIME,
  backfillContractId,
  backfillTenantId,
  getSignedUrl,
  listDocumentsForContract,
  uploadDocument,
} from '../services/documentsService.js'
import { getContractRules } from '../services/settingsService.js'
import { addMonthsToDate, deriveWeeksFromDates, validateContractDates } from '../lib/contractLogic.js'
import { checkCnhValidity } from '../lib/cnhRule.js'
import { DOCUMENT_TYPE, PERIODICITY } from '../lib/constants.js'
import { downloadContractDocx, generateContractDocxBlob } from '../lib/contractDocx.js'
import { downloadContractPdf, generateContractPdfBlob } from '../lib/contractPdf.js'
import { buildWhatsAppLink, formatCurrency } from '../lib/format.js'
import { useCompany } from '../hooks/useCompany.js'
import VehicleStepFields from './VehicleStepFields.jsx'
import TenantFields from './TenantFields.jsx'
import LeaseTermsStepFields from './LeaseTermsStepFields.jsx'
import DocumentDossie from './DocumentDossie.jsx'
import ContractMinutaView from './ContractMinutaView.jsx'

const SESSION_KEY = 'contractWizardDraftSessionId'

const STEPS = [
  { key: 'documentos', label: 'Documentos' },
  { key: 'conferir', label: 'Conferir dados' },
  { key: 'locacao', label: 'Locação' },
  { key: 'minuta', label: 'Revisar minuta' },
  { key: 'final', label: 'Documento final' },
  { key: 'assinatura', label: 'Assinatura' },
  { key: 'concluido', label: 'Concluído' },
]

const STEP_MINUTA = 3
const STEP_FINAL = 4
const STEP_SIGNATURE = 5
const STEP_DONE = 6

const initialTenant = {
  full_name: '',
  cpf: '',
  rg: '',
  phone: '',
  address_street: '',
  address_number: '',
  address_neighborhood: '',
  address_zip: '',
  address_complement: '',
  address_city: '',
  address_state: '',
  cnh_number: '',
  cnh_validity: '',
  birth_date: '',
}

const initialLease = {
  vehicle_id: '',
  start_date: new Date().toISOString().slice(0, 10),
  duration_months: 3,
  end_date: '',
  periodicity: PERIODICITY.WEEKLY,
  payment_amount: '',
  deposit_amount: '',
  initial_km: '',
  observations: '',
}

const primaryButton = 'rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 disabled:opacity-60'
const secondaryButton = 'rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200 disabled:opacity-60'

function newDraftSessionId() {
  const id = crypto.randomUUID()
  sessionStorage.setItem(SESSION_KEY, id)
  return id
}

// Em que etapa um contrato Rascunho já existente deve ser retomado,
// conforme o andamento do documento (status documental).
function stepForContract(contract) {
  switch (contract.document_status) {
    case DOCUMENT_STATUS.MINUTA_VALIDADA:
    case DOCUMENT_STATUS.CONTRATO_GERADO:
      return STEP_FINAL
    case DOCUMENT_STATUS.AGUARDANDO_ASSINATURA:
      return STEP_SIGNATURE
    default:
      return STEP_MINUTA
  }
}

function latestDocument(documents, docType) {
  return documents
    .filter((doc) => doc.doc_type === docType && !doc.superseded_by)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
}

/**
 * Wizard de "Novo contrato":
 * Documentos → Conferir dados → Locação (gera a minuta) → Revisar minuta
 * (validar) → Documento final (PDF/Word, baixar/enviar) → Assinatura
 * externa (ex.: GOV.BR; aqui só se anexa o contrato assinado) → Concluído.
 *
 * Tudo acontece sobre o MESMO contrato (Rascunho): corrigir um dado volta
 * pro formulário e gera a minuta de novo, sem criar contrato novo. A
 * locação só nasce quando o contrato assinado é anexado (signContract).
 */
export default function ContractWizard({ open, onClose, onCompleted, resumeContract = null }) {
  const { displayName } = useCompany()
  const [step, setStep] = useState(0)
  const [draftSessionId, setDraftSessionId] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [tenant, setTenant] = useState(initialTenant)
  const [tenantErrors, setTenantErrors] = useState({})
  const [tenantId, setTenantId] = useState(null)
  const [lease, setLease] = useState(initialLease)
  const [leaseErrors, setLeaseErrors] = useState({})
  const [customMonths, setCustomMonths] = useState('')
  const [contract, setContract] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [signedFile, setSignedFile] = useState(null)
  const [signedPdfDoc, setSignedPdfDoc] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      return
    }

    // Retomar um contrato Rascunho já existente: pula pra etapa certa
    // conforme o status do documento, sem recriar nada e sem tocar no
    // sessionStorage do wizard de contrato novo (são fluxos independentes).
    if (resumeContract) {
      setDraftSessionId(crypto.randomUUID())
      setStep(stepForContract(resumeContract))
      setVehicles([])
      setTenant({ ...initialTenant, ...(resumeContract.tenants || {}) })
      setTenantErrors({})
      setTenantId(resumeContract.tenant_id)
      setLease({
        vehicle_id: resumeContract.vehicle_id,
        start_date: resumeContract.start_date,
        duration_months: 'custom',
        end_date: resumeContract.end_date,
        periodicity: resumeContract.periodicity,
        payment_amount: resumeContract.payment_amount ?? '',
        deposit_amount: resumeContract.deposit_amount ?? '',
        initial_km: resumeContract.initial_km ?? '',
        observations: resumeContract.observations || '',
      })
      setLeaseErrors({})
      setCustomMonths('')
      setContract(resumeContract)
      setBusy(false)
      setSharing(false)
      setSignedFile(null)
      setSignedPdfDoc(null)
      setError('')

      listVehicles({}).then(({ data }) => setVehicles(data ?? []))
      return
    }

    // Sobrevive a um reload no meio do wizard -- uma sessão de rascunho já
    // em andamento continua de onde parou.
    const existing = sessionStorage.getItem(SESSION_KEY)
    setDraftSessionId(existing || newDraftSessionId())
    setStep(0)
    setVehicles([])
    setTenant(initialTenant)
    setTenantErrors({})
    setTenantId(null)
    setLease(initialLease)
    setLeaseErrors({})
    setCustomMonths('')
    setContract(null)
    setBusy(false)
    setSharing(false)
    setSignedFile(null)
    setSignedPdfDoc(null)
    setError('')

    listVehicles({}).then(({ data }) => setVehicles(data ?? []))
  }, [open, resumeContract])

  // Trava o scroll da página de fundo enquanto o wizard está aberto.
  useEffect(() => {
    if (!open) {
      return
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === lease.vehicle_id) || null,
    [vehicles, lease.vehicle_id],
  )

  const computedEndDate = useMemo(() => {
    if (lease.end_date) {
      return lease.end_date
    }
    const months = lease.duration_months === 'custom' ? Number(customMonths || 0) : Number(lease.duration_months)
    return addMonthsToDate(lease.start_date, months)
  }, [lease.start_date, lease.duration_months, lease.end_date, customMonths])

  const computedWeeks = useMemo(
    () => deriveWeeksFromDates(lease.start_date, computedEndDate),
    [lease.start_date, computedEndDate],
  )

  if (!open) {
    return null
  }

  const snapshot = contract?.contract_snapshot || null
  const documentStatus = contract?.document_status || DOCUMENT_STATUS.RASCUNHO
  const finalGenerated = [DOCUMENT_STATUS.CONTRATO_GERADO, DOCUMENT_STATUS.AGUARDANDO_ASSINATURA].includes(documentStatus)
  const minutaValidated = [
    DOCUMENT_STATUS.MINUTA_VALIDADA,
    DOCUMENT_STATUS.CONTRATO_GERADO,
    DOCUMENT_STATUS.AGUARDANDO_ASSINATURA,
  ].includes(documentStatus)
  const fileBase = contract?.contract_number || 'contrato'

  const handleTenantChange = (field, value) => {
    setTenant((current) => ({ ...current, [field]: value }))
  }

  // Preenche a etapa "Conferir dados" com o que o OCR leu -- só em campos
  // ainda vazios, nunca sobrescrevendo algo que o operador já tenha digitado.
  const handleFieldsExtracted = (docType, fields) => {
    setTenant((current) => {
      const next = { ...current }
      for (const [key, value] of Object.entries(fields)) {
        if (value && !next[key]) {
          next[key] = value
        }
      }
      return next
    })
  }

  const handleLeaseChange = (field, value) => {
    setLease((current) => ({ ...current, [field]: value }))
  }

  const handleVehicleSelect = (vehicleId) => {
    const vehicle = vehicles.find((item) => item.id === vehicleId)
    setLease((current) => ({
      ...current,
      vehicle_id: vehicleId,
      initial_km: vehicle?.current_km ?? current.initial_km,
    }))
  }

  const closeAndReset = () => {
    sessionStorage.removeItem(SESSION_KEY)
    onClose()
  }

  const validateTenant = () => {
    const nextErrors = {}
    if (!tenant.full_name?.trim()) nextErrors.full_name = 'O nome do locatário é obrigatório.'
    if (!tenant.cpf?.trim()) nextErrors.cpf = 'O CPF é obrigatório.'
    if (!tenant.address_street?.trim()) nextErrors.address_street = 'O logradouro é obrigatório.'
    if (!tenant.address_number?.trim()) nextErrors.address_number = 'O número é obrigatório.'
    if (!tenant.address_neighborhood?.trim()) nextErrors.address_neighborhood = 'O bairro é obrigatório.'
    if (!tenant.address_zip?.trim()) nextErrors.address_zip = 'O CEP é obrigatório.'
    if (!tenant.address_city?.trim()) nextErrors.address_city = 'A cidade é obrigatória.'
    if (!tenant.address_state?.trim()) nextErrors.address_state = 'A UF é obrigatória.'
    setTenantErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const validateLease = () => {
    const nextErrors = {}
    if (!lease.vehicle_id) nextErrors.vehicle_id = 'Selecione um veículo.'
    if (!lease.start_date) nextErrors.start_date = 'A data de início é obrigatória.'
    if (!lease.payment_amount) nextErrors.payment_amount = 'O valor do pagamento é obrigatório.'
    if (lease.duration_months === 'custom' && !customMonths && !lease.end_date) nextErrors.duration_months = 'Informe quantos meses.'
    setLeaseErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleContinueFromDocuments = () => {
    setStep(1)
  }

  const handleContinueFromTenant = async () => {
    if (!validateTenant()) {
      return
    }

    // Regra de Configurações → Preferências Operacionais: CNH com validade
    // curta (ou vencida) não pode ser contratada.
    const rules = await getContractRules()
    const cnh = checkCnhValidity(tenant.cnh_validity, rules.minCnhValidityDays)
    if (!cnh.ok) {
      setError(cnh.message)
      return
    }

    setSaving(true)
    setError('')

    const { data, error: tenantError } = await findOrCreateTenant(tenant)

    if (tenantError || !data) {
      setSaving(false)
      setError(tenantError?.message || 'Não foi possível salvar os dados do locatário.')
      return
    }

    setTenantId(data.id)

    const { error: backfillError } = await backfillTenantId(draftSessionId, data.id)
    if (backfillError) {
      console.warn('Falha ao vincular documentos ao locatário:', backfillError.message)
    }

    setSaving(false)
    setStep(2)
  }

  // "Gerar minuta": grava o contrato (Rascunho) -- criando na primeira vez,
  // e atualizando o MESMO registro quando o operador volta pra corrigir --
  // e monta a minuta a partir do modelo ativo.
  const handleGenerateMinutaFromLease = async () => {
    if (!validateLease()) {
      return
    }

    const months = lease.duration_months === 'custom' ? Number(customMonths) : Number(lease.duration_months)
    const { startDate, endDate } = {
      startDate: lease.start_date,
      endDate: lease.end_date || addMonthsToDate(lease.start_date, months),
    }
    const dateError = validateContractDates(startDate, endDate)
    if (dateError) {
      setError(dateError)
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      vehicle_id: lease.vehicle_id,
      tenant,
      tenant_id: tenantId,
      start_date: lease.start_date,
      duration_months: lease.end_date ? undefined : months,
      end_date: lease.end_date || undefined,
      periodicity: lease.periodicity,
      payment_amount: lease.payment_amount,
      deposit_amount: lease.deposit_amount,
      initial_km: lease.initial_km,
      observations: lease.observations,
    }

    const { data, error: submitError } = contract
      ? await updateContract(contract.id, payload)
      : await createContract(payload)

    if (submitError || !data) {
      setSaving(false)
      setError(submitError?.message || 'Não foi possível salvar o contrato.')
      return
    }

    setContract(data)

    const { error: backfillError } = await backfillContractId(draftSessionId, data.id)
    if (backfillError) {
      console.warn('Falha ao vincular documentos ao contrato:', backfillError.message)
    }

    const { data: withMinuta, error: minutaError } = await generateMinuta(data.id)
    setSaving(false)

    if (minutaError || !withMinuta) {
      setError(minutaError?.message || 'Não foi possível gerar a minuta.')
      return
    }

    setContract(withMinuta)
    setStep(STEP_MINUTA)
  }

  // Retomada de um Rascunho sem minuta (ex.: contrato antigo): gera aqui.
  const handleGenerateMinutaNow = async () => {
    setBusy(true)
    setError('')
    const { data, error: minutaError } = await generateMinuta(contract.id)
    setBusy(false)

    if (minutaError || !data) {
      setError(minutaError?.message || 'Não foi possível gerar a minuta.')
      return
    }
    setContract(data)
  }

  const handleValidateMinuta = async () => {
    if (minutaValidated) {
      setStep(STEP_FINAL)
      return
    }

    setBusy(true)
    setError('')
    const { data, error: validateError } = await validateMinuta(contract.id)
    setBusy(false)

    if (validateError || !data) {
      setError(validateError?.message || 'Não foi possível validar o contrato.')
      return
    }

    setContract(data)
    setStep(STEP_FINAL)
  }

  // Documento final: sai SEMPRE da minuta validada (snapshot), idêntico ao
  // que foi revisado. Vai pro dossiê (PDF e Word) -- gerar de novo substitui
  // o anterior sem apagar (superseded_by).
  const handleGenerateFinal = async () => {
    setBusy(true)
    setError('')

    try {
      const { data: existingDocs } = await listDocumentsForContract(contract.id)

      const pdfBlob = generateContractPdfBlob(snapshot)
      const docxBlob = await generateContractDocxBlob(snapshot)

      const { error: pdfError } = await uploadDocument(new File([pdfBlob], `${fileBase}.pdf`, { type: 'application/pdf' }), {
        draftSessionId,
        docType: DOCUMENT_TYPE.CONTRATO_GERADO_PDF,
        tenantId,
        contractId: contract.id,
        supersedesDocumentId: latestDocument(existingDocs, DOCUMENT_TYPE.CONTRATO_GERADO_PDF)?.id,
      })
      if (pdfError) {
        throw new Error(pdfError.message || 'Não foi possível salvar o PDF no dossiê.')
      }

      const { error: docxError } = await uploadDocument(new File([docxBlob], `${fileBase}.docx`, { type: DOCX_MIME }), {
        draftSessionId,
        docType: DOCUMENT_TYPE.CONTRATO_GERADO_DOCX,
        tenantId,
        contractId: contract.id,
        supersedesDocumentId: latestDocument(existingDocs, DOCUMENT_TYPE.CONTRATO_GERADO_DOCX)?.id,
      })
      if (docxError) {
        throw new Error(docxError.message || 'Não foi possível salvar o Word no dossiê.')
      }

      const { data: updated, error: statusError } = await setDocumentStatus(contract.id, DOCUMENT_STATUS.CONTRATO_GERADO)
      if (statusError || !updated) {
        throw new Error(statusError?.message || 'Não foi possível atualizar o status do contrato.')
      }

      setContract(updated)
    } catch (err) {
      setError(err.message || 'Falha ao gerar o documento final.')
    } finally {
      setBusy(false)
    }
  }

  const handleContinueToSignature = async () => {
    setBusy(true)
    setError('')

    if (documentStatus !== DOCUMENT_STATUS.AGUARDANDO_ASSINATURA) {
      const { data, error: statusError } = await setDocumentStatus(contract.id, DOCUMENT_STATUS.AGUARDANDO_ASSINATURA)
      if (statusError || !data) {
        setBusy(false)
        setError(statusError?.message || 'Não foi possível atualizar o status do contrato.')
        return
      }
      setContract(data)
    }

    setBusy(false)
    setStep(STEP_SIGNATURE)
  }

  // Anexa o contrato assinado fora do sistema (ex.: GOV.BR) e só então
  // ativa o contrato (cria a locação e marca o veículo como Alugado).
  const handleAttachSigned = async () => {
    if (!signedFile) {
      setError('Selecione o PDF do contrato assinado.')
      return
    }
    if (signedFile.type !== 'application/pdf') {
      setError('O contrato assinado precisa ser um arquivo PDF.')
      return
    }

    setBusy(true)
    setError('')

    try {
      const { data: existingDocs } = await listDocumentsForContract(contract.id)

      const { data: signedDoc, error: uploadError } = await uploadDocument(signedFile, {
        draftSessionId,
        docType: DOCUMENT_TYPE.CONTRATO_ASSINADO_PDF,
        tenantId,
        contractId: contract.id,
        supersedesDocumentId: latestDocument(existingDocs, DOCUMENT_TYPE.CONTRATO_ASSINADO_PDF)?.id,
      })
      if (uploadError || !signedDoc) {
        throw new Error(uploadError?.message || 'Não foi possível salvar o contrato assinado.')
      }

      setSignedPdfDoc(signedDoc)

      const { data: activated, error: signError } = await signContract(contract.id, {
        signed_document_url: signedDoc.storage_path,
      })
      if (signError || !activated) {
        throw new Error(signError?.message || 'Contrato anexado, mas não foi possível ativá-lo.')
      }

      setContract(activated)
      setStep(STEP_DONE)
    } catch (err) {
      setError(err.message || 'Falha ao anexar o contrato assinado.')
    } finally {
      setBusy(false)
    }
  }

  const handleFinish = (finalContract = contract, options = {}) => {
    sessionStorage.removeItem(SESSION_KEY)
    onCompleted(finalContract, options)
  }

  // Envia o PDF (sem assinatura, ou já o assinado) pelo WhatsApp do
  // locatário -- direto na conversa dele (wa.me) com o link do arquivo no
  // dossiê (válido por 7 dias); só falta o operador tocar em enviar (limite
  // do próprio WhatsApp). Sem telefone válido, cai pro compartilhamento
  // nativo do sistema ou abre o PDF.
  const shareDocument = async (document, intro) => {
    setSharing(true)
    setError('')

    try {
      const { url, error: urlError } = await getSignedUrl(document.storage_path, 60 * 60 * 24 * 7)
      if (urlError || !url) {
        throw new Error('Não foi possível preparar o contrato para envio.')
      }

      const whatsappLink = buildWhatsAppLink(
        tenant.phone,
        `Olá, ${tenant.full_name}! ${intro} ${contract.contract_number} -- ${displayName || 'NB Prime Rent'}.\n${url}`,
      )

      if (whatsappLink) {
        window.open(whatsappLink, '_blank', 'noopener,noreferrer')
        return
      }

      if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
        const response = await fetch(url)
        const blob = await response.blob()
        const file = new File([blob], `${fileBase}.pdf`, { type: 'application/pdf' })

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Contrato ${contract.contract_number}`,
            text: `Contrato de locação -- ${tenant.full_name}`,
          })
          return
        }
      }

      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      // AbortError = usuário fechou a folha de compartilhamento nativa.
      if (err.name !== 'AbortError') {
        setError(err.message || 'Não foi possível enviar o contrato.')
      }
    } finally {
      setSharing(false)
    }
  }

  const handleShareGenerated = async () => {
    const { data: docs } = await listDocumentsForContract(contract.id)
    const pdf = latestDocument(docs, DOCUMENT_TYPE.CONTRATO_GERADO_PDF)
    if (!pdf) {
      setError('Gere o documento final antes de enviar.')
      return
    }
    await shareDocument(pdf, 'Segue o contrato para assinatura:')
  }

  const goBack = () => {
    setError('')
    setStep((current) => Math.max(0, current - 1))
  }

  const downloadButtons = snapshot ? (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => downloadContractDocx(snapshot, `${fileBase}.docx`)}
        className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200"
      >
        <FileText size={16} />
        Baixar Word (editável)
      </button>
      <button
        type="button"
        onClick={() => downloadContractPdf(snapshot, `${fileBase}.pdf`)}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200"
      >
        <Download size={16} />
        Baixar PDF
      </button>
    </div>
  ) : null

  const summary = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Período</p>
        <p className="mt-1 text-white">{lease.start_date} — {computedEndDate} ({computedWeeks} semanas)</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Valor / Caução</p>
        <p className="mt-1 text-white">{formatCurrency(lease.payment_amount)} / {formatCurrency(lease.deposit_amount)}</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-40 bg-black/75 sm:flex sm:items-center sm:justify-center sm:px-4 sm:py-6">
      <div className="flex h-full w-full flex-col bg-slate-950 sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-[32px] sm:border sm:border-white/10 sm:shadow-2xl sm:shadow-black/60">
        <div className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-slate-950 p-4 sm:p-6">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Novo contrato</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {STEPS.map((item, index) => (
                <div key={item.key} className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                      index < step
                        ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                        : index === step
                          ? 'border-amber-300/40 bg-amber-300/10 text-amber-200'
                          : 'border-white/10 text-slate-500'
                    }`}
                  >
                    {index < step ? <Check size={12} /> : index + 1}
                  </span>
                  <span className={`hidden text-xs uppercase tracking-wide lg:inline ${index === step ? 'text-white' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                  {index < STEPS.length - 1 ? <span className="mx-1 h-px w-3 bg-white/10 sm:w-4" /> : null}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-400 lg:hidden">{STEPS[step]?.label}</p>
          </div>
          <button type="button" onClick={closeAndReset} className="shrink-0 rounded-2xl border border-white/10 bg-slate-900 p-2 text-slate-200" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error ? (
            <div role="alert" className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
          ) : null}

          {step === 0 ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Documentos do locatário</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Envie a CNH e o comprovante de residência agora (foto pelo celular ou arquivo) -- o sistema tenta
                  ler os dados automaticamente e pré-preenche a próxima etapa. Confira sempre: nenhum dado lido
                  automaticamente é gravado sem você conferir antes.
                </p>
              </div>
              <DocumentDossie
                draftSessionId={draftSessionId}
                tenantId={tenantId}
                enableOcr
                onFieldsExtracted={handleFieldsExtracted}
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Conferir dados do locatário</h3>
                <p className="mt-2 text-sm text-slate-400">Preencha os dados do locatário. Todos os campos continuam editáveis.</p>
              </div>
              <TenantFields tenant={tenant} onChange={handleTenantChange} errors={tenantErrors} />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white">Dados da locação</h3>
                <p className="mt-2 text-sm text-slate-400">Escolha o veículo e informe o prazo e os valores. Depois, gere a minuta para revisar.</p>
              </div>

              <VehicleStepFields
                vehicles={vehicles}
                vehicleId={lease.vehicle_id}
                onSelectVehicle={handleVehicleSelect}
                selectedVehicle={selectedVehicle}
                error={leaseErrors.vehicle_id}
              />

              <LeaseTermsStepFields
                form={lease}
                errors={leaseErrors}
                customMonths={customMonths}
                setCustomMonths={setCustomMonths}
                computedEndDate={computedEndDate}
                computedWeeks={computedWeeks}
                onChange={handleLeaseChange}
              />
            </div>
          ) : null}

          {step === STEP_MINUTA && contract ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-semibold text-white">Revisar minuta</h3>
                <p className="mt-2 text-sm text-slate-400">
                  {contract.contract_number} — {tenant.full_name} — {selectedVehicle?.plate}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Confira empresa, locador, locatário, veículo, valores, caução, datas e cláusulas. Algo errado? Use
                  “Voltar e corrigir” — o mesmo contrato é atualizado e a minuta é gerada de novo.
                </p>
              </div>

              {snapshot?.missing_contract?.length ? (
                <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
                  Atenção: estes dados estão sem informação e saíram como “não informado”: {snapshot.missing_contract.join(', ')}.
                </div>
              ) : null}

              {snapshot ? (
                <ContractMinutaView sections={snapshot.sections} maxHeightClass="max-h-[55vh]" />
              ) : (
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 text-sm text-slate-300">
                  <p>Este contrato ainda não tem minuta gerada.</p>
                  <button type="button" disabled={busy} onClick={handleGenerateMinutaNow} className={`mt-4 ${primaryButton}`}>
                    {busy ? 'Gerando...' : 'Gerar minuta'}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {step === STEP_FINAL && contract ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white">Documento final</h3>
                <p className="mt-2 text-sm text-slate-400">
                  {contract.contract_number} — {tenant.full_name} — {selectedVehicle?.plate}. A minuta foi validada;
                  o PDF e o Word saem exatamente iguais a ela.
                </p>
              </div>

              {summary}

              {finalGenerated ? (
                <>
                  <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                    Documento final gerado e guardado no dossiê. Ele ainda NÃO está assinado.
                  </p>
                  {downloadButtons}
                  <button
                    type="button"
                    disabled={sharing}
                    onClick={handleShareGenerated}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-4 text-sm font-semibold text-amber-200 disabled:opacity-60"
                  >
                    <Share2 size={16} />
                    {sharing ? 'Preparando...' : 'Enviar ao locatário para assinatura'}
                  </button>
                </>
              ) : (
                <button type="button" disabled={busy} onClick={handleGenerateFinal} className={primaryButton}>
                  {busy ? 'Gerando...' : 'Gerar documento final (PDF e Word)'}
                </button>
              )}

              <DocumentDossie contractId={contract.id} tenantId={tenantId} />
            </div>
          ) : null}

          {step === STEP_SIGNATURE && contract ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white">Assinatura externa</h3>
                <p className="mt-2 text-sm text-slate-400">
                  A assinatura é feita fora do sistema (por exemplo, no GOV.BR). Baixe ou envie o contrato, colete as
                  assinaturas e anexe aqui o PDF assinado. Ao anexar, o sistema ativa o contrato: a locação começa e
                  o veículo passa para Alugado.
                </p>
              </div>

              {downloadButtons}

              <label className="block space-y-2 rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                <span className="text-sm text-slate-300">Contrato assinado (PDF)</span>
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={busy}
                  onChange={(event) => setSignedFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-xl file:border file:border-amber-300/20 file:bg-amber-300/10 file:px-3 file:py-2 file:text-amber-200"
                />
                {signedFile ? <span className="block text-xs text-slate-500">{signedFile.name}</span> : null}
              </label>
            </div>
          ) : null}

          {step === STEP_DONE && contract ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 p-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-300">
                  <Check size={24} />
                </span>
                <h3 className="text-xl font-semibold text-white">Contrato assinado e ativo!</h3>
                <p className="text-sm text-slate-400">O contrato assinado foi anexado ao dossiê, a locação foi criada e o veículo já está marcado como Alugado.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Contrato</p>
                  <p className="mt-1 text-white">{contract.contract_number}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Locatário</p>
                  <p className="mt-1 text-white">{tenant.full_name}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Veículo</p>
                  <p className="mt-1 text-white">{selectedVehicle?.plate} — {selectedVehicle?.model}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Período</p>
                  <p className="mt-1 text-white">{lease.start_date} — {computedEndDate}</p>
                </div>
              </div>

              <div className="space-y-3">
                {signedPdfDoc ? (
                  <button
                    type="button"
                    disabled={sharing}
                    onClick={() => shareDocument(signedPdfDoc, 'Segue o contrato assinado:')}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-4 text-sm font-semibold text-amber-200 disabled:opacity-60"
                  >
                    <Share2 size={16} />
                    {sharing ? 'Preparando...' : 'Enviar contrato assinado ao locatário'}
                  </button>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => handleFinish(contract, { openDetails: true })} className={secondaryButton}>
                    Ver dossiê
                  </button>
                  <button type="button" onClick={() => handleFinish(contract, { openDetails: false })} className={secondaryButton}>
                    Voltar aos contratos
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {step < STEP_DONE ? (
          <div className="sticky bottom-0 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-slate-950 p-4 sm:p-6">
            {step > 0 ? (
              <button type="button" onClick={goBack} disabled={busy || saving} className={secondaryButton}>
                {step === STEP_MINUTA ? 'Voltar e corrigir' : 'Voltar'}
              </button>
            ) : (
              <span />
            )}

            {step === 0 ? (
              <button type="button" onClick={handleContinueFromDocuments} className={primaryButton}>
                Continuar
              </button>
            ) : null}
            {step === 1 ? (
              <button type="button" disabled={saving} onClick={handleContinueFromTenant} className={primaryButton}>
                {saving ? 'Salvando...' : 'Continuar'}
              </button>
            ) : null}
            {step === 2 ? (
              <button type="button" disabled={saving} onClick={handleGenerateMinutaFromLease} className={primaryButton}>
                {saving ? 'Gerando minuta...' : 'Gerar minuta'}
              </button>
            ) : null}
            {step === STEP_MINUTA ? (
              <button type="button" disabled={busy || !snapshot} onClick={handleValidateMinuta} className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 disabled:opacity-60">
                {busy ? 'Validando...' : minutaValidated ? 'Continuar' : 'Validar contrato'}
              </button>
            ) : null}
            {step === STEP_FINAL ? (
              <button type="button" disabled={busy || !finalGenerated} onClick={handleContinueToSignature} className={primaryButton}>
                Continuar para assinatura
              </button>
            ) : null}
            {step === STEP_SIGNATURE ? (
              <button type="button" disabled={busy || !signedFile} onClick={handleAttachSigned} className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 disabled:opacity-60">
                {busy ? 'Anexando...' : 'Anexar contrato assinado e ativar'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
