import { CalendarDays, CreditCard, Wallet2 } from 'lucide-react'
import PaymentDestinationBadge from './PaymentDestinationBadge.jsx'
import PaymentStatusBadge from './PaymentStatusBadge.jsx'

function formatCurrency(value) {
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) {
    return 'R$ 0,00'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(numericValue)
}

function getVehiclePlate(payment, metadata) {
  if (payment.vehicle_plate) {
    return payment.vehicle_plate
  }

  if (metadata.locationVehicle) {
    return metadata.locationVehicle
  }

  const observation = metadata.note || payment.notes || ''
  const plate = observation.split(' - ')[0]?.trim()

  return plate || 'Veículo não informado'
}

function formatDate(value) {
  if (!value) {
    return 'Não informado'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleDateString('pt-BR')
}

export default function PaymentCard({ payment, onView, onCancel }) {
  const metadata = payment.notes ? (() => {
    try {
      return JSON.parse(payment.notes)
    } catch (error) {
      return { note: payment.notes }
    }
  })() : {}

  return (
    <article className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">{payment.payment_date ? formatDate(payment.payment_date) : 'Data indisponível'}</p>
         <h3 className="mt-3 text-xl font-semibold text-white">
  {getVehiclePlate(payment, metadata)}
</h3>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <Wallet2 size={16} className="text-amber-300" />
            <span>Valor: {formatCurrency(payment.amount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-amber-300" />
            <span>Forma: {payment.payment_method || 'Não informada'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-amber-300" />
            <span>Modelo: {metadata.financeModel === 'savings' ? 'Fundo do veículo' : 'Alternância entre sócios'}</span>
          </div>
        </div>
        <div className="space-y-3 text-sm text-slate-300">
          <p><span className="text-slate-500">Destino:</span> <PaymentDestinationBadge destination={payment.destination} financeModel={metadata.financeModel} /></p>
          <p><span className="text-slate-500">Usuário:</span> {payment.created_by || 'Não informado'}</p>
          <p><span className="text-slate-500">Observação:</span> {metadata.note || payment.notes || 'Sem observação'}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => onView(payment)} className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-200">
          Visualizar
        </button>
        <button type="button" onClick={() => onCancel(payment)} className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200">
          Cancelar
        </button>
      </div>
    </article>
  )
}
