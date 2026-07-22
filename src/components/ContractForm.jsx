import { useEffect, useState } from 'react'
import { createContract, renewContract, updateContract } from '../services/contractsService.js'
import { calculateContractEndDate, validateContractDates } from '../lib/contractLogic.js'
import LegalReviewNotice from './LegalReviewNotice.jsx'

export default function ContractForm({ open, onClose, location, vehicle, contract, onSaved, locations }) {
  const [form, setForm] = useState({
    location_id: location?.id || contract?.location_id || '',
    vehicle_id: location?.vehicle_id || contract?.vehicle_id || '',
    vehicle_plate: location?.vehicle_plate || contract?.vehicle_plate || '',
    vehicle_model: location?.vehicle_model || contract?.vehicle_model || '',
    vehicle_color: contract?.vehicle_color || '',
    tenant_name: location?.tenant_name || contract?.tenant_name || '',
    start_date: contract?.start_date || '',
    end_date: contract?.end_date || '',
    weekly_rent: contract?.weekly_rent || location?.weekly_rent || '',
    deposit: contract?.deposit || location?.deposit || '',
    weeks: contract?.weeks || '',
    billing_day: contract?.billing_day || '1',
    finance_model: contract?.finance_model || location?.finance_model || 'partners',
    observations: contract?.observations || '',
    clauses: contract?.clauses || '',
    responsible_name: contract?.responsible_name || 'Sistema',
    status: contract?.status || 'Rascunho',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!location && !contract) {
      return
    }

    setForm((current) => ({
      ...current,
      location_id: location?.id || contract?.location_id || current.location_id,
      vehicle_id: location?.vehicle_id || contract?.vehicle_id || current.vehicle_id,
      vehicle_plate: location?.vehicle_plate || contract?.vehicle_plate || current.vehicle_plate,
      vehicle_model: location?.vehicle_model || contract?.vehicle_model || current.vehicle_model,
      tenant_name: location?.tenant_name || contract?.tenant_name || current.tenant_name,
      weekly_rent: contract?.weekly_rent || location?.weekly_rent || current.weekly_rent,
      deposit: contract?.deposit || location?.deposit || current.deposit,
      finance_model: contract?.finance_model || location?.finance_model || current.finance_model,
      start_date: contract?.start_date || current.start_date,
      end_date: contract?.end_date || current.end_date,
    }))
  }, [location, contract])

  if (!open) {
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const validationError = validateContractDates(form.start_date, form.end_date)
    if (validationError) {
      setMessage(validationError)
      setLoading(false)
      return
    }

    const payload = {
      ...form,
      location_id: form.location_id,
      vehicle_id: form.vehicle_id,
      vehicle_plate: form.vehicle_plate,
      vehicle_model: form.vehicle_model,
      tenant_name: form.tenant_name,
      start_date: form.start_date,
      end_date: form.end_date || calculateContractEndDate(form.start_date, form.weeks),
      weekly_rent: form.weekly_rent,
      deposit: form.deposit,
      weeks: form.weeks,
      billing_day: form.billing_day,
      finance_model: form.finance_model,
      observations: form.observations,
      clauses: form.clauses,
      responsible_name: form.responsible_name,
      status: form.status,
    }

    const action = contract ? updateContract(contract.id, payload) : createContract(payload)
    const { data, error } = await action

    if (error) {
      setMessage(error.message || 'Não foi possível salvar o contrato.')
    } else {
      setMessage('Contrato salvo com sucesso.')
      onSaved?.(data)
      onClose()
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6">
      <div className="w-full max-w-4xl overflow-y-auto rounded-[32px] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Novo contrato</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">{contract ? 'Editar contrato' : 'Criar contrato'}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300">Fechar</button>
        </div>

        <div className="mt-8 space-y-6">
          <LegalReviewNotice />
          <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Locação</span>
              <select value={form.location_id} onChange={(event) => setForm((current) => ({ ...current, location_id: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" required>
                <option value="">Selecione uma locação</option>
                {locations.map((item) => <option key={item.id} value={item.id}>{item.vehicle_plate} — {item.tenant_name}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Veículo</span>
              <input value={form.vehicle_plate || ''} readOnly className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Locatário</span>
              <input value={form.tenant_name || ''} readOnly className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Data início</span>
              <input type="date" value={form.start_date || ''} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Data término</span>
              <input type="date" value={form.end_date || ''} onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Valor semanal</span>
              <input type="number" min="0" step="0.01" value={form.weekly_rent || ''} onChange={(event) => setForm((current) => ({ ...current, weekly_rent: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Caução</span>
              <input type="number" min="0" step="0.01" value={form.deposit || ''} onChange={(event) => setForm((current) => ({ ...current, deposit: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" required />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Quantidade de semanas</span>
              <input type="number" min="1" value={form.weeks || ''} onChange={(event) => setForm((current) => ({ ...current, weeks: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Dia da cobrança</span>
              <input type="number" min="1" max="31" value={form.billing_day || ''} onChange={(event) => setForm((current) => ({ ...current, billing_day: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Modelo financeiro</span>
              <select value={form.finance_model || 'partners'} onChange={(event) => setForm((current) => ({ ...current, finance_model: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none">
                <option value="partners">Alternância entre sócios</option>
                <option value="savings">Fundo do veículo</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Responsável</span>
              <input value={form.responsible_name || ''} onChange={(event) => setForm((current) => ({ ...current, responsible_name: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-300">Observações</span>
              <textarea value={form.observations || ''} onChange={(event) => setForm((current) => ({ ...current, observations: event.target.value }))} rows="4" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-300">Cláusulas adicionais</span>
              <textarea value={form.clauses || ''} onChange={(event) => setForm((current) => ({ ...current, clauses: event.target.value }))} rows="6" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
            </label>
            {message ? <p className="md:col-span-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{message}</p> : null}
            <div className="md:col-span-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200">Cancelar</button>
              <button type="submit" disabled={loading} className="rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200">{loading ? 'Salvando…' : 'Salvar contrato'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
