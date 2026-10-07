import { useState } from 'react'
import { Download, FileText, PenLine, Pencil, RotateCcw, X, XCircle } from 'lucide-react'
import { downloadContractDocx } from '../lib/contractDocx.js'
import { downloadContractPdf } from '../lib/contractPdf.js'
import { getSnapshotForContract } from '../services/contractDocumentService.js'
import { formatCurrency, formatDate, formatTenantAddress } from '../lib/format.js'
import { FINANCE_MODEL_LABELS, PERIODICITY_LABELS } from '../lib/constants.js'
import DocumentDossie from './DocumentDossie.jsx'

export default function ContractDetailsDrawer({ open, contract, onClose, onOpenSign, onCancel, onEdit, onReactivate, reactivating }) {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  if (!open || !contract) {
    return null
  }

  const tenant = contract.tenants
  const vehicle = contract.vehicles
  const isDraft = contract.status === 'Rascunho'
  const isActive = contract.status === 'Ativo'
  const isCancelled = contract.status === 'Cancelado'
  const isEnded = contract.status === 'Encerrado'

  // Baixa sempre a minuta guardada no contrato; contratos antigos (de antes
  // do construtor) são remontados na hora com o primeiro modelo.
  const handleDownload = async (kind) => {
    setDownloading(true)
    setDownloadError('')
    try {
      const { snapshot, error } = await getSnapshotForContract(contract)
      if (error || !snapshot) {
        setDownloadError(error?.message || 'Não foi possível montar o documento.')
        return
      }
      const fileName = `${contract.contract_number || 'contrato'}.${kind}`
      if (kind === 'docx') {
        await downloadContractDocx(snapshot, fileName)
      } else {
        downloadContractPdf(snapshot, fileName)
      }
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadDocx = () => handleDownload('docx')
  const handleDownloadPdf = () => handleDownload('pdf')

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-3 py-6 sm:px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-black/60 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">{contract.contract_number}</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{tenant?.full_name || 'Locatário não informado'}</h3>
            <p className="mt-1 text-sm text-slate-400">{vehicle?.plate} — {vehicle?.model}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-slate-900 p-2 text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Status</p>
            <p className="mt-1 text-white">{contract.status}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Documento</p>
            <p className="mt-1 text-white">{contract.document_status || 'Rascunho'}</p>
            {contract.template_version ? <p className="mt-1 text-xs text-slate-500">Modelo versão {contract.template_version}</p> : null}
          </div>
          {contract.finance_model ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Distribuição</p>
              <p className="mt-1 text-white">{FINANCE_MODEL_LABELS[contract.finance_model] || contract.finance_model}</p>
            </div>
          ) : null}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Período</p>
            <p className="mt-1 text-white">{formatDate(contract.start_date)} — {formatDate(contract.end_date)} ({contract.weeks} semanas)</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Valor ({PERIODICITY_LABELS[contract.periodicity] || 'Semanal'}) / Caução</p>
            <p className="mt-1 text-white">{formatCurrency(contract.payment_amount)} / {formatCurrency(contract.deposit_amount)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300 sm:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Locatário</p>
            <p className="mt-1 text-white">CPF: {tenant?.cpf || 'não informado'}</p>
            <p className="mt-1 text-white">{formatTenantAddress(tenant)}</p>
          </div>
        </div>

        <div className="mt-6">
          <DocumentDossie contractId={contract.id} tenantId={contract.tenant_id} />
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Documento</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 disabled:opacity-60"
            >
              <FileText size={16} />
              {downloading ? 'Gerando...' : 'Baixar Word (editável)'}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200 disabled:opacity-60"
            >
              <Download size={16} />
              Baixar PDF
            </button>
          </div>
          {downloadError ? <p className="text-sm text-rose-300">{downloadError}</p> : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
          {isDraft ? (
            <>
              <button
                type="button"
                onClick={() => onCancel(contract)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
              >
                <XCircle size={16} />
                Cancelar contrato
              </button>
              <button
                type="button"
                onClick={() => onEdit(contract)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200"
              >
                <Pencil size={16} />
                Editar
              </button>
              <button
                type="button"
                onClick={() => onOpenSign(contract)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200"
              >
                <PenLine size={16} />
                Continuar contrato
              </button>
            </>
          ) : null}
          {isActive ? (
            <p className="text-sm text-emerald-300">Contrato ativo — a locação já foi criada e o veículo está marcado como Alugado.</p>
          ) : null}
          {isCancelled ? (
            <button
              type="button"
              onClick={() => onReactivate(contract)}
              disabled={reactivating}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 disabled:opacity-60"
            >
              <RotateCcw size={16} />
              {reactivating ? 'Reativando...' : 'Reativar contrato'}
            </button>
          ) : null}
          {isEnded ? (
            <p className="text-sm text-slate-400">Contrato encerrado — consulte o histórico da locação pra detalhes.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
