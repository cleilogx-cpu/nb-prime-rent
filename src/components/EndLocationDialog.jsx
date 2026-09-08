import { useState } from 'react'

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function EndLocationDialog({ open, location, onClose, onConfirm, loading }) {
  const [actualEndDate, setActualEndDate] = useState(todayIso())
  const [finalKm, setFinalKm] = useState('')
  const [tenantRating, setTenantRating] = useState('Boa')
  const [closingNotes, setClosingNotes] = useState('')
  const [error, setError] = useState('')

  if (!open || !location) {
    return null
  }

  const handleConfirm = () => {
    if (!actualEndDate) {
      setError('Informe a data real de encerramento.')
      return
    }

    if (finalKm !== '' && Number(finalKm) < Number(location.initial_km ?? 0)) {
      setError('A km final não pode ser menor que a km inicial da locação.')
      return
    }

    setError('')
    onConfirm({
      actual_end_date: actualEndDate,
      final_km: finalKm,
      tenant_rating: tenantRating,
      closing_notes: closingNotes,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Encerrar locação</p>
        <h3 className="mt-3 text-2xl font-semibold text-white">
          {location.vehicles?.plate} — {location.tenants?.full_name}
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Isso libera o veículo (fica "Disponível" de novo) e move o contrato pro Histórico.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">Data real de encerramento</span>
            <input
              type="date"
              value={actualEndDate}
              onChange={(event) => setActualEndDate(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">Km final</span>
            <input
              type="number"
              min={location.initial_km ?? 0}
              step="1"
              value={finalKm}
              onChange={(event) => setFinalKm(event.target.value)}
              placeholder={location.initial_km != null ? `Km inicial: ${location.initial_km}` : ''}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">Avaliação do locatário</span>
            <select
              value={tenantRating}
              onChange={(event) => setTenantRating(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="Boa">Boa</option>
              <option value="Ruim">Ruim</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">Observação</span>
            <textarea
              value={closingNotes}
              onChange={(event) => setClosingNotes(event.target.value)}
              rows="4"
              placeholder="Estado do veículo na devolução, pendências, combinados..."
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 disabled:opacity-60"
          >
            {loading ? 'Encerrando...' : 'Confirmar encerramento'}
          </button>
        </div>
      </div>
    </div>
  )
}
