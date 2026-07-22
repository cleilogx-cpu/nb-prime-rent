export default function PaymentStatusBadge({ status }) {
  const classes = {
    Pago: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
    Parcial: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
    Pendente: 'border-slate-400/20 bg-slate-500/10 text-slate-200',
    Atrasado: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
    Cancelado: 'border-slate-400/20 bg-slate-700/30 text-slate-300',
  }

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] ${classes[status] || classes.Pendente}`}>
      {status || 'Pendente'}
    </span>
  )
}
