import { PencilLine, Trash2 } from 'lucide-react'

const financeLabels = {
  partners: 'Alternância entre sócios',
  savings: 'Fundo do veículo',
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return 'Não informado'
  }

  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function formatDate(value) {
  if (!value) {
    return 'Não definido'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('pt-BR')
}

export default function VehicleCard({ vehicle, onEdit, onDelete }) {
  return (
    <article className="rounded-[28px] border border-white/10 bg-slate-950/80 p-5 shadow-lg shadow-black/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{vehicle.model || 'Modelo não informado'}</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{vehicle.plate || 'Placa não informada'}</h3>
          <p className="mt-1 text-sm text-slate-400">{vehicle.color || 'Cor não informada'}</p>
        </div>
        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
          {vehicle.status || 'Sem status'}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Locatário</p>
          <p className="mt-2 text-base text-white">{vehicle.tenant_name || 'Sem locatário'}</p>
          <p className="mt-1 text-sm text-slate-400">{vehicle.tenant_phone || 'Telefone não informado'}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Aluguel semanal</p>
          <p className="mt-2 text-base text-white">{formatCurrency(vehicle.weekly_rent)}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Próximo pagamento</p>
          <p className="mt-2 text-base text-white">{formatDate(vehicle.next_payment)}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Modelo financeiro</p>
          <p className="mt-2 text-base text-white">{financeLabels[vehicle.finance_model] || vehicle.finance_model || 'Não informado'}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-amber-300/15 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
        <span>
          <strong>Próximo destino:</strong> {vehicle.next_destination || 'Não informado'}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(vehicle)}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:border-amber-300/30 hover:bg-amber-300/10"
          >
            <PencilLine size={16} />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onDelete(vehicle)}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 transition hover:border-rose-400 hover:bg-rose-500/20"
          >
            <Trash2 size={16} />
            Excluir
          </button>
        </div>
      </div>
    </article>
  )
}
