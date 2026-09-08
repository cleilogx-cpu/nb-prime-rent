import { useState } from 'react'
import { registerRefund } from '../services/depositsService.js'
import { formatCurrency } from '../lib/format.js'

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function DepositRefundDialog({ open, deposit, onClose, onConfirm }) {
  const [refundAmount, setRefundAmount] = useState('')
  const [refundDate, setRefundDate] = useState(todayIso())
  const [refundNotes, setRefundNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open || !deposit) {
    return null
  }

  const receivedAmount = Number(deposit.received_amount || 0)

  const handleConfirm = async () => {
    if (!refundAmount) {
      setError('Informe o valor devolvido.')
      return
    }

    setLoading(true)
    const { error: submitError } = await registerRefund(deposit.id, {
      refund_amount: refundAmount,
      refund_date: refundDate,
      refund_notes: refundNotes,
    })
    setLoading(false)

    if (submitError) {
      setError(submitError.message || 'Não foi possível registrar a devolução.')
      return
    }

    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Devolução de caução</p>
        <h3 className="mt-3 text-2xl font-semibold text-white">
          {deposit.vehicles?.plate} — {deposit.tenants?.full_name}
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Valor recebido: {formatCurrency(receivedAmount)}. Isso é saída de dinheiro — não entra como Recebimento.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">Valor devolvido</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={refundAmount}
              onChange={(event) => setRefundAmount(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">Data da devolução</span>
            <input
              type="date"
              value={refundDate}
              onChange={(event) => setRefundDate(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">Observação</span>
            <textarea
              value={refundNotes}
              onChange={(event) => setRefundNotes(event.target.value)}
              rows="3"
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
            />
          </label>

          {error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-200 disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Confirmar devolução'}
          </button>
        </div>
      </div>
    </div>
  )
}
