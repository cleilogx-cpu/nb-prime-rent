import { X } from 'lucide-react'
import ContractStatusBadge from './ContractStatusBadge.jsx'
import LegalReviewNotice from './LegalReviewNotice.jsx'

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

export default function ContractDetailsDrawer({ open, contract, onClose, onPreview }) {
  if (!open || !contract) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70">
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Detalhes do contrato</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">{contract.contract_number || 'Contrato'}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 p-2 text-slate-300"><X size={18} /></button>
        </div>

        <div className="mt-8 space-y-6">
          <LegalReviewNotice />
          <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Dados principais</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Locatário</p>
                <p className="mt-2 text-base font-medium text-white">{contract.tenant_name || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Status</p>
                <p className="mt-2 text-base font-medium text-white"><ContractStatusBadge status={contract.status} /></p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Veículo</p>
                <p className="mt-2 text-base font-medium text-white">{contract.vehicle_plate || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Placa</p>
                <p className="mt-2 text-base font-medium text-white">{contract.vehicle_model || 'Não informado'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Valores e prazo</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Valor semanal</p>
                <p className="mt-2 text-base font-medium text-white">{formatCurrency(contract.weekly_rent)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Caução</p>
                <p className="mt-2 text-base font-medium text-white">{formatCurrency(contract.deposit)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Início</p>
                <p className="mt-2 text-base font-medium text-white">{formatDate(contract.start_date)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Término</p>
                <p className="mt-2 text-base font-medium text-white">{formatDate(contract.end_date)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Cláusulas e observações</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">{contract.clauses || 'Nenhuma cláusula adicional registrada.'}</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">{contract.observations || 'Nenhuma observação registrada.'}</p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Histórico</p>
            <div className="mt-4 space-y-2">
              {(contract.history || []).map((entry, index) => (
                <div key={`${entry.action}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
                  <p>{entry.action}</p>
                  {entry.note ? <p className="mt-1 text-slate-400">{entry.note}</p> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => onPreview(contract)} className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-200">Visualizar contrato</button>
          </div>
        </div>
      </div>
    </div>
  )
}
