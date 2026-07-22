import { useState } from 'react'

export default function CancelPaymentDialog({ open, payment, onCancel, onConfirm }) {
  const [reason, setReason] = useState('')

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Cancelar recebimento</p>
        <h3 className="mt-3 text-2xl font-semibold text-white">{payment?.id ? 'Confirmar cancelamento' : 'Cancelamento'}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-400">Informe o motivo para registrar este cancelamento de forma lógica e preservada.</p>
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows="4" className="mt-5 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" placeholder="Justificativa do cancelamento" />
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200">Voltar</button>
          <button type="button" onClick={() => onConfirm(reason)} className="rounded-2xl border border-rose-400/20 bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-200">Confirmar cancelamento</button>
        </div>
      </div>
    </div>
  )
}
