import { useState } from 'react'

export default function EndContractDialog({ open, onClose, onConfirm }) {
  const [endDate, setEndDate] = useState('')
  const [observation, setObservation] = useState('')

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Encerrar contrato</p>
        <h3 className="mt-3 text-2xl font-semibold text-white">Confirmar encerramento</h3>
        <div className="mt-6 space-y-4">
          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-300">Data de encerramento</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-300">Observação</span>
            <textarea value={observation} onChange={(event) => setObservation(event.target.value)} rows="4" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
          </label>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200">Cancelar</button>
          <button type="button" onClick={() => onConfirm({ end_date: endDate, observations: observation })} className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">Confirmar encerramento</button>
        </div>
      </div>
    </div>
  )
}
