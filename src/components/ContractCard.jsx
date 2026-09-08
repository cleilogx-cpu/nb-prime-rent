import { FileText, ShieldCheck } from 'lucide-react'

function formatDate(value) {
  if (!value) return 'Não definida'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR')
}

function formatBRL(value) {
  if (value === null || value === undefined || value === '') return 'Não informado'
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getStatusStyle(status) {
  const normalized = String(status ?? '').toLowerCase()
  if (normalized === 'ativo') return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
  if (normalized === 'rascunho') return 'border-sky-400/20 bg-sky-500/10 text-sky-300'
  if (normalized === 'encerrado') return 'border-slate-400/20 bg-slate-500/10 text-slate-300'
  if (normalized === 'cancelado') return 'border-rose-400/20 bg-rose-500/10 text-rose-300'
  return 'border-amber-300/20 bg-amber-300/10 text-amber-300'
}

const FINANCE_LABELS = {
  partners: 'Sócios',
  savings: 'Fundo',
}

export default function ContractCard({ contract, onOpenDetails }) {
  const tenant = contract.tenants
  const vehicle = contract.vehicles

  return (
    <article
      onClick={() => onOpenDetails(contract)}
      className="cursor-pointer rounded-[28px] border border-white/10 bg-slate-950/80 p-5 shadow-lg shadow-black/20 transition hover:border-amber-300/20"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{contract.contract_number}</p>
          <h3 className="mt-2 flex items-center gap-2 text-xl font-semibold text-white">
            <FileText size={18} className="text-amber-300" />
            {tenant?.full_name || 'Locatário não informado'}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {vehicle?.plate} — {vehicle?.model}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${getStatusStyle(contract.status)}`}>
          {contract.status}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-sm text-slate-300">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Período</p>
          <p className="mt-1 text-white">{formatDate(contract.start_date)} — {formatDate(contract.end_date)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-sm text-slate-300">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Valor semanal</p>
          <p className="mt-1 text-white">{formatBRL(contract.weekly_rent)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-sm text-slate-300">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500 flex items-center gap-1"><ShieldCheck size={12} /> Distribuição</p>
          <p className="mt-1 text-white">{FINANCE_LABELS[contract.finance_model] || contract.finance_model}</p>
        </div>
      </div>
    </article>
  )
}
