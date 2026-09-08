import { formatCurrency, formatDate } from '../lib/format.js'
import { DEPOSIT_STATUS } from '../lib/constants.js'

function statusStyle(status) {
  if (status === DEPOSIT_STATUS.QUITADA) return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
  if (status === DEPOSIT_STATUS.PARCIAL) return 'border-amber-300/20 bg-amber-300/10 text-amber-200'
  if (status === DEPOSIT_STATUS.A_DEVOLVER) return 'border-sky-400/20 bg-sky-500/10 text-sky-200'
  if (status === DEPOSIT_STATUS.DEVOLVIDA) return 'border-slate-400/20 bg-slate-500/10 text-slate-300'
  return 'border-rose-400/20 bg-rose-500/10 text-rose-200' // Pendente
}

export default function DepositCard({ deposit, onRegisterReceipt, onRefund }) {
  const totalAmount = Number(deposit.total_amount || 0)
  const receivedAmount = Number(deposit.received_amount || 0)
  const balance = Math.max(0, totalAmount - receivedAmount)
  const vehicle = deposit.vehicles
  const tenant = deposit.tenants

  const canReceive = balance > 0 && deposit.status !== DEPOSIT_STATUS.A_DEVOLVER && deposit.status !== DEPOSIT_STATUS.DEVOLVIDA
  const canRefund = deposit.status === DEPOSIT_STATUS.A_DEVOLVER

  return (
    <article className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-lg shadow-black/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">{vehicle?.plate || 'Sem placa'}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{tenant?.full_name || 'Locatário não informado'}</h3>
          <p className="mt-1 text-sm text-slate-400">{deposit.contracts?.contract_number}</p>
        </div>
        <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${statusStyle(deposit.status)}`}>
          {deposit.status}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Caução</p>
          <p className="mt-1 text-white">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Recebido</p>
          <p className="mt-1 text-white">{formatCurrency(receivedAmount)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Saldo</p>
          <p className="mt-1 text-white">{formatCurrency(balance)}</p>
        </div>
      </div>

      {deposit.agreed_terms ? (
        <p className="mt-4 text-xs text-slate-400"><span className="text-slate-500">Condição combinada:</span> {deposit.agreed_terms}</p>
      ) : null}

      {deposit.status === DEPOSIT_STATUS.DEVOLVIDA ? (
        <p className="mt-4 text-sm text-slate-400">
          Devolvido {formatCurrency(deposit.refund_amount)} em {formatDate(deposit.refund_date)}
          {deposit.refund_notes ? ` — ${deposit.refund_notes}` : ''}
        </p>
      ) : null}

      {(canReceive || canRefund) ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {canReceive ? (
            <button type="button" onClick={onRegisterReceipt} className="rounded-2xl border border-amber-300/20 bg-amber-300/15 px-3 py-2 text-sm font-semibold text-amber-200">
              Registrar recebimento
            </button>
          ) : null}
          {canRefund ? (
            <button type="button" onClick={onRefund} className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-200">
              Registrar devolução
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
