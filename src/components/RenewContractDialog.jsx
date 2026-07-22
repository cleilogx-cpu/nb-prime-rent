import { useState } from 'react'

export default function RenewContractDialog({ open, contract, onClose, onConfirm }) {
  const [form, setForm] = useState({
    start_date: contract?.start_date || '',
    end_date: contract?.end_date || '',
    weekly_rent: contract?.weekly_rent || '',
    deposit: contract?.deposit || '',
  })

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Renovar contrato</p>
        <h3 className="mt-3 text-2xl font-semibold text-white">Criar renovação</h3>
        <div className="mt-6 space-y-4">
          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-300">Nova data inicial</span>
            <input type="date" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-300">Nova data final</span>
            <input type="date" value={form.end_date} onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-300">Valor semanal</span>
            <input type="number" min="0" step="0.01" value={form.weekly_rent} onChange={(event) => setForm((current) => ({ ...current, weekly_rent: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-300">Caução</span>
            <input type="number" min="0" step="0.01" value={form.deposit} onChange={(event) => setForm((current) => ({ ...current, deposit: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
          </label>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200">Cancelar</button>
          <button type="button" onClick={() => onConfirm(form)} className="rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200">Confirmar renovação</button>
        </div>
      </div>
    </div>
  )
}
