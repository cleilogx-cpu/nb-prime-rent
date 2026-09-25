import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Download, FileText, Share2, X } from 'lucide-react'
import { listVehicles } from '../services/vehiclesService.js'
import { findOrCreateTenant } from '../services/tenantsService.js'
import { createContract, signContract } from '../services/contractsService.js'
import { backfillContractId, backfillTenantId, getSignedUrl, uploadDocument } from '../services/documentsService.js'
import { finalizeSignature } from '../services/signaturesService.js'
import { addMonthsToDate, deriveWeeksFromDates, validateContractDates } from '../lib/contractLogic.js'
import { DOCUMENT_TYPE, PERIODICITY } from '../lib/constants.js'
import { downloadContractDocx } from '../lib/contractDocx.js'
import { downloadContractPdf, generateContractPdfBlob } from '../lib/contractPdf.js'
import { formatCurrency } from '../lib/format.js'
import VehicleStepFields from './VehicleStepFields.jsx'
import TenantFields from './TenantFields.jsx'
import LeaseTermsStepFields from './LeaseTermsStepFields.jsx'
import DocumentDossie from './DocumentDossie.jsx'
import SignaturePad from './SignaturePad.jsx'

const SESSION_KEY = 'contractWizardDraftSessionId'

const STEPS = [
  { key: 'documentos', label: 'Documentos' },
  { key: 'conferir', label: 'Conferir dados' },
  { key: 'locacao', label: 'Locação' },
  { key: 'contrato', label: 'Contrato' },
  { key: 'assinatura', label: 'Assinatura' },
  { key: 'concluido', label: 'Concluído' },
]

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
  finance_model: 'partners',
  start_date: new Date().toISOString().slice(0, 10),
  duration_months: 3,
  end_date: '',
  periodicity: PERIODICITY.WEEKLY,
  payment_amount: '',
  deposit_amount: '',
  initial_km: '',
  observations: '',
}

function newDraftSessionId() {
  const id = crypto.randomUUID()
  sessionStorage.setItem(SESSION_KEY, id)
  return id
}

/**
 * Wizard de "Novo contrato" em etapas (Fase 2 do Contrato Inteligente):
 * Documentos → Conferir dados → Locação → Contrato. Ainda sem OCR (Fase 4)
 * -- os campos da etapa "Conferir dados" começam vazios, preenchimento é
 * manual por enquanto, mas a etapa "Documentos" já funciona de verdade
 * (mesmo DocumentDossie da Fase 1, só que ainda sem contrato/locatário
 * existirem -- por isso o draft_session_id).
 */
export default function ContractWizard({ open, onClose, onCompleted }) {
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
  const [signing, setSigning] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [signedPdfDoc, setSignedPdfDoc] = useState(null)
  const [error, setError] = useState('')
  const signaturePadRef = useRef(null)

  useEffect(() => {
    if (!open) {
      return
    }

    // Sobrevive a um reload no meio do wizard (seção 2/4 do pedido) --
    // uma sessão de rascunho já em andamento continua de onde parou.
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
    setSigning(false)
    setSharing(false)
    setSignedPdfDoc(null)
    setError('')

    listVehicles({}).then(({ data }) => setVehicles(data ?? []))
  }, [open])

  // Trava o scroll da página de fundo enquanto o wizard está aberto --
  // mesmo ajuste feito no modal de Detalhes da locação.
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

  const handleTenantChange = (field, value) => {
    setTenant((current) => ({ ...current, [field]: value }))
  }

  // Preenche a etapa "Conferir dados" com o que o OCR leu (Fase 4) -- só
  // em campos ainda vazios, nunca sobrescrevendo algo que o operador já
  // tenha digitado. A conferência humana continua obrigatória: nada aqui
  // é salvo de verdade até o operador avançar pra próxima etapa.
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

  const handleContinueFromLease = async () => {
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

    const { data, error: createError } = await createContract({
      vehicle_id: lease.vehicle_id,
      finance_model: lease.finance_model,
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
    })

    if (createError || !data) {
      setSaving(false)
      setError(createError?.message || 'Não foi possível gerar o contrato.')
      return
    }

    setContract(data)

    const { error: backfillError } = await backfillContractId(draftSessionId, data.id)
    if (backfillError) {
      console.warn('Falha ao vincular documentos ao contrato:', backfillError.message)
    }

    setSaving(false)
    setStep(3)
  }

  const handleFinish = (finalContract = contract, options = {}) => {
    sessionStorage.removeItem(SESSION_KEY)
    onCompleted(finalContract, options)
  }

  // Etapa final (Fase 5): gera o PDF de verdade a partir do contrato já
  // criado (generateContractPdfBlob, reaproveitado sem nenhuma mudança --
  // a assinatura não é desenhada dentro do PDF, ela vira um documento
  // separado no dossiê, a evidência de verdade fica no hash calculado pelo
  // servidor + registro em contract_signatures), sobe PDF + imagem da
  // assinatura pro dossiê, fecha a assinatura (finalizeSignature, que
  // calcula o hash e captura IP/user-agent no servidor -- nunca confia em
  // nada vindo do navegador) e só then ativa o contrato (signContract,
  // reaproveitado sem mudança nenhuma nele). Se o finalize falhar, o
  // contrato continua Rascunho de propósito -- nunca ativa sem o registro
  // de evidência gravado.
  const handleSign = async () => {
    if (!contract || !signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      setError('Colete a assinatura do locatário antes de continuar.')
      return
    }

    setSigning(true)
    setError('')

    try {
      // A assinatura do locatário entra desenhada de verdade na linha dela
      // no PDF final (não fica só como um documento separado no dossiê) --
      // a do locador (Edson) é fixa e já vem embutida em buildContractSections,
      // sem precisar passar nada aqui.
      const signatureDataUrl = signaturePadRef.current.getDataUrl()
      const pdfBlob = generateContractPdfBlob(contract, { locatarioSignatureImage: signatureDataUrl })
      const pdfFile = new File([pdfBlob], `${contract.contract_number || 'contrato'}.pdf`, { type: 'application/pdf' })

      const { data: pdfDoc, error: pdfUploadError } = await uploadDocument(pdfFile, {
        draftSessionId,
        docType: DOCUMENT_TYPE.CONTRATO_ASSINADO_PDF,
        tenantId,
        contractId: contract.id,
      })
      if (pdfUploadError || !pdfDoc) {
        throw new Error(pdfUploadError?.message || 'Não foi possível salvar o PDF assinado.')
      }

      setSignedPdfDoc(pdfDoc)

      const signatureBlob = await signaturePadRef.current.getBlob()
      const signatureFile = new File([signatureBlob], 'assinatura.png', { type: 'image/png' })

      const { data: sigDoc, error: sigUploadError } = await uploadDocument(signatureFile, {
        draftSessionId,
        docType: DOCUMENT_TYPE.ASSINATURA_IMAGEM,
        tenantId,
        contractId: contract.id,
      })
      if (sigUploadError || !sigDoc) {
        throw new Error(sigUploadError?.message || 'Não foi possível salvar a imagem da assinatura.')
      }

      const { data: signature, error: finalizeError } = await finalizeSignature({
        contractId: contract.id,
        signedPdfDocumentId: pdfDoc.id,
        signatureImageDocumentId: sigDoc.id,
        signerFullName: tenant.full_name,
        signerCpf: tenant.cpf,
      })
      if (finalizeError || !signature) {
        throw new Error(finalizeError?.message || 'Não foi possível registrar a assinatura.')
      }

      const { data: activatedContract, error: signError } = await signContract(contract.id, {
        signed_document_url: pdfDoc.storage_path,
      })
      if (signError || !activatedContract) {
        throw new Error(signError?.message || 'Assinatura registrada, mas não foi possível ativar o contrato.')
      }

      setContract(activatedContract)
      setSigning(false)
      setStep(5)
    } catch (err) {
      setSigning(false)
      setError(err.message || 'Falha ao assinar o contrato.')
    }
  }

  // Fase 6: compartilha o PDF assinado que JÁ está guardado no dossiê (nunca
  // gera um novo na hora -- é sempre o mesmo arquivo cujo hash foi registrado
  // em contract_signatures). Web Share API com arquivo é o caminho principal
  // (funciona no WhatsApp/celular); quando o navegador não suporta
  // compartilhar arquivo (a maioria dos desktops), cai pra abrir o PDF numa
  // aba nova, que o usuário baixa/envia manualmente.
  const handleShare = async () => {
    if (!signedPdfDoc || !contract) {
      return
    }

    setSharing(true)
    setError('')

    try {
      const { url, error: urlError } = await getSignedUrl(signedPdfDoc.storage_path)
      if (urlError || !url) {
        throw new Error('Não foi possível preparar o contrato para envio.')
      }

      const fileName = `${contract.contract_number || 'contrato'}.pdf`

      if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
        const response = await fetch(url)
        const blob = await response.blob()
        const file = new File([blob], fileName, { type: 'application/pdf' })

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Contrato ${contract.contract_number}`,
            text: `Contrato de locação -- ${tenant.full_name}`,
          })
          setSharing(false)
          return
        }
      }

      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      // AbortError = usuário fechou a folha de compartilhamento nativa sem
      // escolher nada -- não é uma falha real, não precisa virar mensagem de erro.
      if (err.name !== 'AbortError') {
        setError(err.message || 'Não foi possível enviar o contrato.')
      }
    } finally {
      setSharing(false)
    }
  }

  const goBack = () => {
    setError('')
    setStep((current) => Math.max(0, current - 1))
  }

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
                  <span className={`hidden text-xs uppercase tracking-wide sm:inline ${index === step ? 'text-white' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                  {index < STEPS.length - 1 ? <span className="mx-1 h-px w-4 bg-white/10 sm:w-6" /> : null}
                </div>
              ))}
            </div>
          </div>
          <button type="button" onClick={closeAndReset} className="shrink-0 rounded-2xl border border-white/10 bg-slate-900 p-2 text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
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
                <p className="mt-2 text-sm text-slate-400">Escolha o veículo, a distribuição do aluguel e os valores.</p>
              </div>

              <VehicleStepFields
                vehicles={vehicles}
                vehicleId={lease.vehicle_id}
                onSelectVehicle={handleVehicleSelect}
                selectedVehicle={selectedVehicle}
                error={leaseErrors.vehicle_id}
              />

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Distribuição do aluguel</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`cursor-pointer rounded-2xl border p-4 text-sm ${lease.finance_model === 'partners' ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-slate-900/60 text-slate-300'}`}>
                    <input type="radio" name="wizard-finance-model" className="mr-2" checked={lease.finance_model === 'partners'} onChange={() => handleLeaseChange('finance_model', 'partners')} />
                    Divisão entre sócios (Clei/Edson)
                  </label>
                  <label className={`cursor-pointer rounded-2xl border p-4 text-sm ${lease.finance_model === 'savings' ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-slate-900/60 text-slate-300'}`}>
                    <input type="radio" name="wizard-finance-model" className="mr-2" checked={lease.finance_model === 'savings'} onChange={() => handleLeaseChange('finance_model', 'savings')} />
                    Formação de capital (fundo)
                  </label>
                </div>
              </div>

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

          {step === 3 && contract ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white">Contrato gerado</h3>
                <p className="mt-2 text-sm text-slate-400">
                  {contract.contract_number} — {tenant.full_name} — {selectedVehicle?.plate}
                </p>
              </div>

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

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => downloadContractDocx(contract)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200"
                >
                  <FileText size={16} />
                  Baixar Word (editável)
                </button>
                <button
                  type="button"
                  onClick={() => downloadContractPdf(contract)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200"
                >
                  <Download size={16} />
                  Baixar PDF
                </button>
              </div>

              <DocumentDossie contractId={contract.id} tenantId={tenantId} />
            </div>
          ) : null}

          {step === 4 && contract ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white">Assinatura do locatário</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Peça para {tenant.full_name || 'o locatário'} assinar no campo abaixo (no celular ou no
                  computador). Ao confirmar, o sistema gera o PDF final, registra a assinatura com data/hora/
                  hash do documento e ativa o contrato -- a locação começa e o veículo passa para Alugado.
                </p>
              </div>

              <SignaturePad ref={signaturePadRef} />
            </div>
          ) : null}

          {step === 5 && contract ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 p-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-300">
                  <Check size={24} />
                </span>
                <h3 className="text-xl font-semibold text-white">Contrato assinado e ativo!</h3>
                <p className="text-sm text-slate-400">A locação foi criada e o veículo já está marcado como Alugado.</p>
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
                <button
                  type="button"
                  disabled={sharing}
                  onClick={handleShare}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-4 text-sm font-semibold text-amber-200 disabled:opacity-60"
                >
                  <Share2 size={16} />
                  {sharing ? 'Preparando...' : 'Enviar contrato ao locatário'}
                </button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleFinish(contract, { openDetails: true })}
                    className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200"
                  >
                    Ver dossiê
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFinish(contract, { openDetails: false })}
                    className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200"
                  >
                    Voltar aos contratos
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {step < 5 ? (
        <div className="sticky bottom-0 flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-slate-950 p-4 sm:p-6">
          {step > 0 && step < 3 ? (
            <button type="button" onClick={goBack} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200">
              Voltar
            </button>
          ) : (
            <span />
          )}

          {step === 0 ? (
            <button type="button" onClick={handleContinueFromDocuments} className="rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200">
              Continuar
            </button>
          ) : null}
          {step === 1 ? (
            <button type="button" disabled={saving} onClick={handleContinueFromTenant} className="rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 disabled:opacity-60">
              {saving ? 'Salvando...' : 'Continuar'}
            </button>
          ) : null}
          {step === 2 ? (
            <button type="button" disabled={saving} onClick={handleContinueFromLease} className="rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 disabled:opacity-60">
              {saving ? 'Gerando...' : 'Gerar contrato'}
            </button>
          ) : null}
          {step === 3 ? (
            <button type="button" onClick={() => setStep(4)} className="rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200">
              Continuar para assinatura
            </button>
          ) : null}
          {step === 4 ? (
            <button type="button" disabled={signing} onClick={handleSign} className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 disabled:opacity-60">
              {signing ? 'Assinando...' : 'Assinar e ativar contrato'}
            </button>
          ) : null}
        </div>
        ) : null}
      </div>
    </div>
  )
}
