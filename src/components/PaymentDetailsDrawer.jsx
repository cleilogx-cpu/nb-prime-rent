import { X } from 'lucide-react'
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

export default function PaymentDetailsDrawer({ open, payment, onClose }) {
  if (!open || !payment) {
    return null
  }

  const metadata = payment.notes ? (() => {
    try {
      return JSON.parse(payment.notes)
    } catch (error) {
      return { note: payment.notes }
    }
  })() : {}

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70">
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Detalhes do recebimento</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Recebimento #{payment.id?.slice(0, 8)}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 p-2 text-slate-300">
            <X size={18} />
          </button>
        </div>

        <div className="mt-8 space-y-6">
          <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Resumo</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Locação</p>
                <p className="mt-2 text-base font-medium text-white">{payment.location_id || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Veículo</p>
                <p className="mt-2 text-base font-medium text-white">{payment.vehicle_id || 'Não informado'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Valores e status</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Valor</p>
                <p className="mt-2 text-base font-medium text-white">{formatCurrency(payment.amount)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Data</p>
                <p className="mt-2 text-base font-medium text-white">{formatDate(payment.payment_date)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Forma</p>
                <p className="mt-2 text-base font-medium text-white">{payment.payment_method || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Status</p>
                <p className="mt-2 text-base font-medium text-white"><PaymentStatusBadge status={payment.status} /></p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Modelo e destino</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Modelo financeiro</p>
                <p className="mt-2 text-base font-medium text-white">{metadata.financeModel === 'savings' ? 'Fundo do veículo' : 'Alternância entre sócios'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Destino</p>
                <p className="mt-2 text-base font-medium text-white"><PaymentDestinationBadge destination={payment.destination} financeModel={metadata.financeModel} /></p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Observação</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">{metadata.note || payment.notes || 'Nenhuma observação registrada.'}</p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Metadados</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Usuário responsável</p>
                <p className="mt-2 text-base font-medium text-white">{payment.created_by || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Data de criação</p>
                <p className="mt-2 text-base font-medium text-white">{formatDate(payment.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
