import { useState } from 'react'
import { CheckCircle2, Download, FileText, X, XCircle } from 'lucide-react'
import { downloadContractDocx } from '../lib/contractDocx.js'
import { downloadContractPdf } from '../lib/contractPdf.js'
import { formatCurrency, formatDate } from '../lib/format.js'

const FINANCE_LABELS = { partners: 'Sócios', savings: 'Fundo' }

export default function ContractDetailsDrawer({ open, contract, onClose, onSign, onCancel, signing }) {
  const [downloading, setDownloading] = useState(false)

  if (!open || !contract) {
    return null
  }

  const tenant = contract.tenants
  const vehicle = contract.vehicles
  const isDraft = contract.status === 'Rascunho'
  const isActive = contract.status === 'Ativo'

  const handleDownloadDocx = async () => {
    setDownloading(true)
    try {
      await downloadContractDocx(contract)
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadPdf = () => {
    downloadContractPdf(contract)
  }

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
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Distribuição</p>
            <p className="mt-1 text-white">{FINANCE_LABELS[contract.finance_model] || contract.finance_model}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Período</p>
            <p className="mt-1 text-white">{formatDate(contract.start_date)} — {formatDate(contract.end_date)} ({contract.weeks} semanas)</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Valor semanal / Caução</p>
            <p className="mt-1 text-white">{formatCurrency(contract.weekly_rent)} / {formatCurrency(contract.deposit_amount)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300 sm:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Locatário</p>
            <p className="mt-1 text-white">CPF: {tenant?.cpf || 'não informado'}</p>
            <p className="mt-1 text-white">{tenant?.address || 'Endereço não informado'}</p>
          </div>
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
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200"
            >
              <Download size={16} />
              Baixar PDF
            </button>
          </div>
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
                onClick={() => onSign(contract)}
                disabled={signing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 disabled:opacity-60"
              >
                <CheckCircle2 size={16} />
                {signing ? 'Ativando...' : 'Marcar como assinado'}
              </button>
            </>
          ) : null}
          {isActive ? (
            <p className="text-sm text-emerald-300">Contrato ativo — a locação já foi criada e o veículo está marcado como Alugado.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
