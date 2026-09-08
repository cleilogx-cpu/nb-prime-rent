import { useEffect, useState } from 'react'
import {
  createPaymentWithDestinationRules,
  updatePayment,
  getLastConfirmedPartnerBeneficiary,
} from '../services/paymentsService.js'
import { PERIODICITY_LABELS, RECEIPT_TYPE } from '../lib/constants.js'
import { formatCurrency } from '../lib/format.js'

const todayIso = () => new Date().toISOString().slice(0, 10)

function buildInitialForm(payment, lockedContext) {
  return {
    receipt_type: lockedContext?.receipt_type || payment?.receipt_type || payment?.type || RECEIPT_TYPE.RENT,
    location_id: payment?.location_id || payment?.rental_id || '',
    contract_id: lockedContext?.contract_id || payment?.contract_id || '',
    tenant_id: payment?.tenant_id || lockedContext?.tenant_id || '',
    vehicle_id: payment?.vehicle_id || lockedContext?.vehicle_id || '',
    payment_date: payment?.payment_date || todayIso(),
    amount: payment?.amount || lockedContext?.amount || '',
    payment_method: payment?.payment_method || 'PIX',
    finance_model: payment?.finance_model || lockedContext?.finance_model || 'partners',
    destination: payment?.destination || '',
    periodicity: payment?.periodicity || 'weekly',
    notes: payment?.notes || lockedContext?.notes || '',
    provisional_receipt: payment?.provisional_receipt || '',
  }
}

/**
 * `locations` = locações ativas (pra Aluguel). `deposits` = cauções de
 * todo contrato ainda não Devolvida (pra Caução, que pode ser cobrada
 * antes mesmo da assinatura — não dá pra exigir uma locação ativa nesse
 * caso). `lockedContext`, quando presente (aberto a partir do módulo
 * Caução), pré-preenche e trava tudo, deixando só valor/data editáveis —
 * é a mesma tabela/lógica de Recebimentos, só um atalho de preenchimento.
 */
export default function PaymentForm({ open, onClose, locations = [], vehicles = [], deposits = [], payment, onSaved, userId, lockedContext }) {
  const [form, setForm] = useState(() => buildInitialForm(payment, lockedContext))
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(payment, lockedContext))
      setMessage('')
    }
  }, [open, payment, lockedContext])

  if (!open) {
    return null
  }

  const selectedLocation = locations.find((location) => location.id === form.location_id)
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === form.vehicle_id)
  const availableDeposits = deposits.filter((deposit) => deposit.status !== 'Devolvida')

  const handleReceiptTypeChange = (value) => {
    setForm((current) => ({
      ...buildInitialForm(null, null),
      receipt_type: value,
      payment_date: current.payment_date,
      payment_method: current.payment_method,
    }))
  }

  const handleSelectLocation = async (locationId) => {
    const location = locations.find((item) => item.id === locationId)
    if (!location) {
      return
    }

    const nextVehicle = vehicles.find((vehicle) => vehicle.id === location.vehicle_id) || null
    const { data: lastBeneficiary } = await getLastConfirmedPartnerBeneficiary(location.vehicle_id)

    const proposedBeneficiary =
      lastBeneficiary === 'Clei'
        ? 'Edson'
        : lastBeneficiary === 'Edson'
          ? 'Clei'
          : (nextVehicle?.next_destination || 'Clei')

    const financeModel = location.contracts?.finance_model || 'partners'

    setForm((current) => ({
      ...current,
      location_id: location.id,
      contract_id: location.contract_id || '',
      tenant_id: location.tenant_id,
      vehicle_id: location.vehicle_id,
      finance_model: financeModel,
      periodicity: location.periodicity || 'weekly',
      destination: financeModel === 'savings' ? 'Fundo do veículo' : (proposedBeneficiary || ''),
      amount: location.payment_amount || current.amount,
      notes: `${location.vehicles?.plate || ''} - ${location.tenants?.full_name || ''}`,
    }))
  }

  const handleSelectDeposit = (depositId) => {
    const deposit = deposits.find((item) => item.id === depositId)
    if (!deposit) {
      return
    }

    const balance = Math.max(0, Number(deposit.total_amount || 0) - Number(deposit.received_amount || 0))

    setForm((current) => ({
      ...current,
      contract_id: deposit.contract_id,
      location_id: '',
      vehicle_id: deposit.vehicle_id,
      tenant_id: deposit.tenant_id,
      finance_model: deposit.contracts?.finance_model || 'partners',
      amount: balance > 0 ? balance : current.amount,
      notes: `${deposit.vehicles?.plate || ''} - ${deposit.tenants?.full_name || ''} (Caução)`,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const payload = {
      ...form,
      created_by: userId || 'system',
      location_id: form.location_id,
      rental_id: form.location_id || null,
      contract_id: form.contract_id || null,
      tenant_id: form.tenant_id || selectedLocation?.tenant_id || null,
      vehicle_id: form.vehicle_id,
      finance_model: form.finance_model,
      destination: form.destination,
      payment_date: form.payment_date || todayIso(),
      amount: form.amount,
      receipt_type: form.receipt_type,
      payment_method: form.payment_method,
      notes: form.notes,
      provisional_receipt: form.provisional_receipt,
    }

    const action = payment ? updatePayment(payment.id, payload) : createPaymentWithDestinationRules(payload)
    const { data, error } = await action

    if (error) {
      setMessage(error.message || 'Não foi possível salvar o recebimento.')
    } else {
      setMessage('Recebimento salvo com sucesso.')
      onSaved?.(data)
      onClose()
    }

    setLoading(false)
  }

  const isDeposit = form.receipt_type === RECEIPT_TYPE.DEPOSIT

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">{payment ? 'Editar recebimento' : 'Novo recebimento'}</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Registrar recebimento</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300">Fechar</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-300">Tipo de recebimento</span>
            <select
              value={form.receipt_type}
              onChange={(event) => handleReceiptTypeChange(event.target.value)}
              disabled={Boolean(lockedContext)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none disabled:opacity-60"
            >
              <option value={RECEIPT_TYPE.RENT}>Aluguel</option>
              <option value={RECEIPT_TYPE.DEPOSIT}>Caução</option>
            </select>
          </label>

          {lockedContext ? (
            <div className="space-y-1 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300 md:col-span-2">
              <p><span className="text-slate-500">Veículo:</span> {lockedContext.vehicleLabel}</p>
              <p><span className="text-slate-500">Contrato:</span> {lockedContext.contractLabel}</p>
              <p><span className="text-slate-500">Locatário:</span> {lockedContext.tenantLabel}</p>
              <p><span className="text-slate-500">Saldo pendente da caução:</span> {lockedContext.balanceLabel}</p>
            </div>
          ) : isDeposit ? (
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-300">Contrato (Veículo → Locatário)</span>
              <select
                value={form.contract_id}
                onChange={(event) => handleSelectDeposit(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                required
              >
                <option value="">Selecione um contrato</option>
                {availableDeposits.map((deposit) => (
                  <option key={deposit.id} value={deposit.contract_id}>
                    {deposit.vehicles?.plate} — {deposit.tenants?.full_name} (saldo {formatCurrency(Math.max(0, Number(deposit.total_amount || 0) - Number(deposit.received_amount || 0)))})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Locação ativa</span>
                <select value={form.location_id} onChange={(event) => handleSelectLocation(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" required>
                  <option value="">Selecione uma locação</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.vehicles?.plate} — {location.tenants?.full_name}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Periodicidade (do contrato)</span>
                <input value={PERIODICITY_LABELS[form.periodicity] || 'Semanal'} readOnly className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-400 outline-none" />
              </label>
            </>
          )}

          {!lockedContext ? (
            <>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Veículo</span>
                <input value={selectedVehicle?.plate || ''} readOnly className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Locatário</span>
                <input value={selectedLocation?.tenants?.full_name || ''} readOnly className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
              </label>
            </>
          ) : null}

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Data recebida</span>
            <input
              type="date"
              value={form.payment_date}
              onChange={(event) => setForm((current) => ({ ...current, payment_date: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Valor</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Forma de pagamento</span>
            <select
              value={form.payment_method}
              onChange={(event) => setForm((current) => ({ ...current, payment_method: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="PIX">PIX</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Transferência">Transferência</option>
              <option value="Cartão">Cartão</option>
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-300">Destino</span>
            <input value={form.destination} onChange={(event) => setForm((current) => ({ ...current, destination: event.target.value }))} placeholder="Clei, Edson ou Fundo do veículo" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-300">Observação</span>
            <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows="4" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-300">Comprovante provisório</span>
            <input value={form.provisional_receipt} onChange={(event) => setForm((current) => ({ ...current, provisional_receipt: event.target.value }))} placeholder="Link ou referência provisória" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
          </label>

          {message ? <p className="md:col-span-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{message}</p> : null}

          <div className="md:col-span-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200">Cancelar</button>
            <button type="submit" disabled={loading} className="rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200">
              {loading ? 'Salvando…' : 'Salvar recebimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
