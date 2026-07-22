export default function PaymentDestinationBadge({ destination, financeModel }) {
  const normalized = String(destination || '').trim()
  const label = financeModel === 'savings' || normalized === 'Fundo do veículo' ? 'Fundo do veículo' : normalized || 'Alternância entre sócios'

  return (
    <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">
      {label}
    </span>
  )
}
