import { useState } from 'react'
import { updateAgreedTerms } from '../services/depositsService.js'

export default function DepositTermsDialog({ open, deposit, onClose, onConfirm }) {
  const [agreedTerms, setAgreedTerms] = useState(deposit?.agreed_terms || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!open || !deposit) {
    return null
  }

  const handleConfirm = async () => {
    setLoading(true)
    const { error: submitError } = await updateAgreedTerms(deposit.id, agreedTerms.trim())
    setLoading(false)

    if (submitError) {
      setError(submitError.message || 'Não foi possível salvar a condição combinada.')
      return
    }

    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Condição da caução</p>
        <h3 className="mt-3 text-2xl font-semibold text-white">
          {deposit.vehicles?.plate} — {deposit.tenants?.full_name}
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Só registra como foi combinado o pagamento do saldo (ex: "Entrada R$1.000 + duas parcelas de R$500"). Não
          conta como dinheiro recebido — isso só acontece quando o recebimento é lançado de verdade.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">Condição combinada</span>
            <textarea
              value={agreedTerms}
              onChange={(event) => setAgreedTerms(event.target.value)}
              rows="4"
              placeholder="Ex: Entrada de R$ 1.000,00 + 2 parcelas de R$ 500,00"
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
            className="rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar condição'}
          </button>
        </div>
      </div>
    </div>
  )
}
