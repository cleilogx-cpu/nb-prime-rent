import { useState } from 'react'
import { createPaymentWithDestinationRules, updatePayment, updateVehicleNextDestination } from '../services/paymentsService.js'
import { calculateNextPartnerBeneficiaryForVehicle, getLastConfirmedPartnerBeneficiary } from '../services/paymentsService.js'

export default function PaymentForm({ open, onClose, locations, vehicles, payment, onSaved, userId }) {
  const [form, setForm] = useState({
    location_id: payment?.location_id || '',
    vehicle_id: payment?.vehicle_id || '',
    payment_date: payment?.payment_date || '',
    amount: payment?.amount || '',
    payment_method: payment?.payment_method || 'PIX',
    finance_model: payment?.finance_model || 'partners',
    destination: payment?.destination || '',
    status: payment?.status || 'Pago',
    notes: payment?.notes || '',
    provisional_receipt: payment?.provisional_receipt || '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (!open) {
    return null
  }

  const selectedLocation = locations.find((location) => location.id === form.location_id)
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === form.vehicle_id)

  const handleSelectLocation = async (locationId) => {
    const location = locations.find((item) => item.id === locationId)
    if (!location) {
      return
    }

    const nextVehicle = vehicles.find((vehicle) => vehicle.id === location.vehicle_id) || null
    const { data: lastBeneficiary } = await getLastConfirmedPartnerBeneficiary(location.vehicle_id)
    const { data: proposedBeneficiary } = await calculateNextPartnerBeneficiaryForVehicle(location.vehicle_id, nextVehicle?.next_destination)

    setForm((current) => ({
      ...current,
      location_id: location.id,
      vehicle_id: location.vehicle_id,
      finance_model: nextVehicle?.finance_model || 'partners',
      destination: nextVehicle?.finance_model === 'savings' ? 'Fundo do veículo' : (proposedBeneficiary || ''),
      amount: location.weekly_rent || current.amount,
      notes: current.notes || `Locação: ${location.id}`,
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
      location_tenant: selectedLocation?.tenant_name || '',
      location_vehicle: selectedLocation?.vehicle_plate || '',
      vehicle_id: form.vehicle_id,
      finance_model: form.finance_model,
      destination: form.destination,
      payment_date: form.payment_date || new Date().toISOString().slice(0, 10),
      amount: form.amount,
      payment_method: form.payment_method,
      status: form.status,
      notes: form.notes,
      provisional_receipt: form.provisional_receipt,
    }

    const action = payment ? updatePayment(payment.id, payload) : createPaymentWithDestinationRules(payload)
    const { data, error } = await action

    if (error) {
      setMessage(error.message || 'Não foi possível salvar o recebimento.')
    } else {
      if (form.finance_model === 'partners' && form.destination) {
        await updateVehicleNextDestination(form.vehicle_id, form.destination)
      }
      setMessage('Recebimento salvo com sucesso.')
      onSaved?.(data)
      onClose()
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6">
      <div className="w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Novo recebimento</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Registrar recebimento</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300">Fechar</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Locação ativa</span>
            <select value={form.location_id} onChange={(event) => handleSelectLocation(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" required>
              <option value="">Selecione uma locação</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>{location.vehicle_plate} — {location.tenant_name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Veículo</span>
            <input value={selectedVehicle?.plate || ''} readOnly className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Locatário</span>
            <input value={selectedLocation?.tenant_name || ''} readOnly className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Data recebida</span>
            <input type="date" value={form.payment_date} onChange={(event) => setForm((current) => ({ ...current, payment_date: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" required />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Valor</span>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" required />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Forma de pagamento</span>
            <select value={form.payment_method} onChange={(event) => setForm((current) => ({ ...current, payment_method: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none">
              <option value="PIX">PIX</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Transferência">Transferência</option>
              <option value="Cartão">Cartão</option>
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-300">Modelo financeiro</span>
            <select value={form.finance_model} onChange={(event) => setForm((current) => ({ ...current, finance_model: event.target.value, destination: event.target.value === 'savings' ? 'Fundo do veículo' : current.destination }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none">
              <option value="partners">Alternância entre sócios</option>
              <option value="savings">Fundo do veículo</option>
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
