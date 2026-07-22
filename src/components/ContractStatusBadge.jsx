export default function ContractStatusBadge({ status }) {
  const classes = {
    Rascunho: 'border-slate-400/20 bg-slate-500/10 text-slate-200',
    Ativo: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
    Encerrado: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
    Cancelado: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
    Vencido: 'border-rose-400/20 bg-rose-500/10 text-rose-200',
  }

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] ${classes[status] || classes.Rascunho}`}>
      {status || 'Rascunho'}
    </span>
  )
}
