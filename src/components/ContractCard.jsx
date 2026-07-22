import { CalendarDays, FileText, User2, Wallet2 } from 'lucide-react'
import ContractStatusBadge from './ContractStatusBadge.jsx'

function formatDate(value) {
  if (!value) {
    return 'Não informado'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleDateString('pt-BR')
}

function formatCurrency(value) {
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) {
    return 'R$ 0,00'
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(numericValue)
}

export default function ContractCard({ contract, onView, onRenew, onEnd, onCancel }) {
  return (
    <article className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">{contract.contract_number || 'Sem número'}</p>
          <h3 className="mt-3 text-xl font-semibold text-white">{contract.tenant_name || 'Locatário não informado'}</h3>
        </div>
        <ContractStatusBadge status={contract.status} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-center gap-2"><User2 size={16} className="text-amber-300" /><span>{contract.vehicle_plate || 'Sem placa'}</span></div>
          <div className="flex items-center gap-2"><CalendarDays size={16} className="text-amber-300" /><span>Início: {formatDate(contract.start_date)}</span></div>
          <div className="flex items-center gap-2"><CalendarDays size={16} className="text-amber-300" /><span>Término: {formatDate(contract.end_date)}</span></div>
        </div>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-center gap-2"><Wallet2 size={16} className="text-amber-300" /><span>Semanal: {formatCurrency(contract.weekly_rent)}</span></div>
          <div className="flex items-center gap-2"><Wallet2 size={16} className="text-amber-300" /><span>Caução: {formatCurrency(contract.deposit)}</span></div>
          <div className="flex items-center gap-2"><FileText size={16} className="text-amber-300" /><span>Criado em: {formatDate(contract.created_at)}</span></div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => onView(contract)} className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-200">Visualizar</button>
        <button type="button" onClick={() => onRenew(contract)} className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm font-medium text-amber-200">Renovar</button>
        <button type="button" onClick={() => onEnd(contract)} className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200">Encerrar</button>
        <button type="button" onClick={() => onCancel(contract)} className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200">Cancelar</button>
      </div>
    </article>
  )
}
