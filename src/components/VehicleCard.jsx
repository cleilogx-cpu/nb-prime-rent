import { PencilLine, Trash2 } from 'lucide-react'

function formatKm(value) {
  if (value === null || value === undefined || value === '') {
    return 'Não informado'
  }

  return `${Number(value).toLocaleString('pt-BR')} km`
}

function getStatusStyle(status) {
  const normalizedStatus = String(status ?? '').toLowerCase()

  if (normalizedStatus === 'alugado' || normalizedStatus === 'rented') {
    return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
  }

  if (normalizedStatus === 'disponível' || normalizedStatus === 'available') {
    return 'border-sky-400/20 bg-sky-500/10 text-sky-300'
  }

  if (normalizedStatus === 'manutenção' || normalizedStatus === 'maintenance') {
    return 'border-rose-400/20 bg-rose-500/10 text-rose-300'
  }

  return 'border-amber-300/20 bg-amber-300/10 text-amber-300'
}

export default function VehicleCard({ vehicle, onEdit, onDelete }) {
  return (
    <article className="rounded-[28px] border border-white/10 bg-slate-950/80 p-5 shadow-lg shadow-black/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-2xl font-semibold text-white">
            🚗 {vehicle.model || 'Modelo não informado'}
          </h3>

          <p className="mt-3 text-xl font-bold tracking-wider text-amber-300">
            {vehicle.plate || 'Placa não informada'}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {vehicle.color || 'Cor não informada'}{vehicle.year ? ` · ${vehicle.year}` : ''}
          </p>
          {vehicle.chassis ? <p className="mt-1 text-xs text-slate-500">Chassi: {vehicle.chassis}</p> : null}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${getStatusStyle(vehicle.status)}`}
        >
          {vehicle.status || 'Sem status'}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Quilometragem atual</p>
          <p className="mt-2 text-base text-white">{formatKm(vehicle.current_km)}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Próxima revisão</p>
          <p className="mt-2 text-base text-white">{formatKm(vehicle.next_review_km)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onEdit(vehicle)}
          className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/20"
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
    </article>
  )
}
