import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { listVehicles } from '../services/vehiclesService.js'
import { addMonthsToDate, deriveWeeksFromDates } from '../lib/contractLogic.js'
import { PERIODICITY, PERIODICITY_LABELS } from '../lib/constants.js'

const DURATION_PRESETS = [
  { label: '1 mês', months: 1 },
  { label: '2 meses', months: 2 },
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '12 meses', months: 12 },
  { label: 'Personalizado', months: 'custom' },
]

const PAYMENT_AMOUNT_LABEL = {
  [PERIODICITY.DAILY]: 'Valor da diária',
  [PERIODICITY.WEEKLY]: 'Valor semanal',
  [PERIODICITY.BIWEEKLY]: 'Valor da quinzena',
  [PERIODICITY.MONTHLY]: 'Valor mensal',
}

const initialForm = {
  vehicle_id: '',
  finance_model: 'partners',
  tenant: {
    full_name: '',
    cpf: '',
    rg: '',
    phone: '',
    address_street: '',
    address_number: '',
    address_neighborhood: '',
    address_zip: '',
    address_complement: '',
    address_city: '',
    address_state: '',
    cnh_number: '',
    cnh_validity: '',
  },
  start_date: new Date().toISOString().slice(0, 10),
  duration_months: 3,
  end_date: '',
  periodicity: PERIODICITY.WEEKLY,
  payment_amount: '',
  deposit_amount: '',
  initial_km: '',
  observations: '',
}

export default function ContractForm({ open, onClose, onSubmit, loading }) {
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [customMonths, setCustomMonths] = useState('')

  useEffect(() => {
    if (!open) {
      return
    }

    setForm(initialForm)
    setCustomMonths('')
    setErrors({})

    listVehicles({}).then(({ data }) => setVehicles(data ?? []))
  }, [open])

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === form.vehicle_id) || null,
    [vehicles, form.vehicle_id],
  )

  const computedEndDate = useMemo(() => {
    if (form.end_date) {
      return form.end_date
    }
    const months = form.duration_months === 'custom' ? Number(customMonths || 0) : Number(form.duration_months)
    return addMonthsToDate(form.start_date, months)
  }, [form.start_date, form.duration_months, form.end_date, customMonths])

  const computedWeeks = useMemo(
    () => deriveWeeksFromDates(form.start_date, computedEndDate),
    [form.start_date, computedEndDate],
  )

  if (!open) {
    return null
  }

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleTenantChange = (field, value) => {
    setForm((current) => ({ ...current, tenant: { ...current.tenant, [field]: value } }))
  }

  const handleVehicleSelect = (vehicleId) => {
    const vehicle = vehicles.find((item) => item.id === vehicleId)
    setForm((current) => ({
      ...current,
      vehicle_id: vehicleId,
      initial_km: vehicle?.current_km ?? current.initial_km,
    }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.vehicle_id) nextErrors.vehicle_id = 'Selecione um veículo.'
    if (!form.tenant.full_name?.trim()) nextErrors.full_name = 'O nome do locatário é obrigatório.'
    if (!form.tenant.cpf?.trim()) nextErrors.cpf = 'O CPF é obrigatório.'
    if (!form.tenant.address_street?.trim()) nextErrors.address_street = 'O logradouro é obrigatório.'
    if (!form.tenant.address_number?.trim()) nextErrors.address_number = 'O número é obrigatório.'
    if (!form.tenant.address_neighborhood?.trim()) nextErrors.address_neighborhood = 'O bairro é obrigatório.'
    if (!form.tenant.address_zip?.trim()) nextErrors.address_zip = 'O CEP é obrigatório.'
    if (!form.tenant.address_city?.trim()) nextErrors.address_city = 'A cidade é obrigatória.'
    if (!form.tenant.address_state?.trim()) nextErrors.address_state = 'A UF é obrigatória.'
    if (!form.start_date) nextErrors.start_date = 'A data de início é obrigatória.'
    if (!form.payment_amount) nextErrors.payment_amount = 'O valor do pagamento é obrigatório.'
    if (form.duration_months === 'custom' && !customMonths) nextErrors.duration_months = 'Informe quantos meses.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submit = (event) => {
    event.preventDefault()

    if (!validate()) {
      return
    }

    const months = form.duration_months === 'custom' ? Number(customMonths) : Number(form.duration_months)

    onSubmit({
      vehicle_id: form.vehicle_id,
      finance_model: form.finance_model,
      tenant: form.tenant,
      start_date: form.start_date,
      duration_months: form.end_date ? undefined : months,
      end_date: form.end_date || undefined,
      periodicity: form.periodicity,
      payment_amount: form.payment_amount,
      deposit_amount: form.deposit_amount,
      initial_km: form.initial_km,
      observations: form.observations,
    })
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-3 py-6 sm:px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-black/60 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Novo contrato</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Gerar contrato de locação</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-slate-900 p-2 text-slate-200">
            <X size={18} />
          </button>
        </div>

        <form className="mt-6 space-y-6" onSubmit={submit}>
          {/* Passo 1: veículo */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">1. Veículo</p>
            <select
              value={form.vehicle_id}
              onChange={(event) => handleVehicleSelect(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="">Selecione um veículo cadastrado</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} — {vehicle.model} ({vehicle.status})
                </option>
              ))}
            </select>
            {errors.vehicle_id ? <span className="text-xs text-rose-300">{errors.vehicle_id}</span> : null}

            {selectedVehicle ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
                <p>{selectedVehicle.model} · {selectedVehicle.color} · {selectedVehicle.year || 'ano não informado'}</p>
                <p className="mt-1 text-xs text-slate-500">Chassi: {selectedVehicle.chassis || 'não informado'} · Km atual: {selectedVehicle.current_km ?? 'não informado'}</p>
              </div>
            ) : null}
          </div>

          {/* Passo 2: distribuição do dinheiro */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">2. Distribuição do aluguel</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-2xl border p-4 text-sm ${form.finance_model === 'partners' ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-slate-900/60 text-slate-300'}`}>
                <input type="radio" name="finance_model" className="mr-2" checked={form.finance_model === 'partners'} onChange={() => handleChange('finance_model', 'partners')} />
                Divisão entre sócios (Clei/Edson)
              </label>
              <label className={`cursor-pointer rounded-2xl border p-4 text-sm ${form.finance_model === 'savings' ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-slate-900/60 text-slate-300'}`}>
                <input type="radio" name="finance_model" className="mr-2" checked={form.finance_model === 'savings'} onChange={() => handleChange('finance_model', 'savings')} />
                Formação de capital (fundo)
              </label>
            </div>
          </div>

          {/* Passo 3: locatário */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">3. Dados do locatário</p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>Nome completo</span>
                <input value={form.tenant.full_name} onChange={(event) => handleTenantChange('full_name', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                {errors.full_name ? <span className="text-xs text-rose-300">{errors.full_name}</span> : null}
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>CPF</span>
                <input value={form.tenant.cpf} onChange={(event) => handleTenantChange('cpf', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="000.000.000-00" />
                {errors.cpf ? <span className="text-xs text-rose-300">{errors.cpf}</span> : null}
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>RG</span>
                <input value={form.tenant.rg} onChange={(event) => handleTenantChange('rg', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>Telefone / WhatsApp</span>
                <input value={form.tenant.phone} onChange={(event) => handleTenantChange('phone', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-300 md:col-span-2">
                <span>Logradouro (Rua/Avenida)</span>
                <input value={form.tenant.address_street} onChange={(event) => handleTenantChange('address_street', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                {errors.address_street ? <span className="text-xs text-rose-300">{errors.address_street}</span> : null}
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>Número</span>
                <input value={form.tenant.address_number} onChange={(event) => handleTenantChange('address_number', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                {errors.address_number ? <span className="text-xs text-rose-300">{errors.address_number}</span> : null}
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>Bairro</span>
                <input value={form.tenant.address_neighborhood} onChange={(event) => handleTenantChange('address_neighborhood', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                {errors.address_neighborhood ? <span className="text-xs text-rose-300">{errors.address_neighborhood}</span> : null}
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>CEP</span>
                <input value={form.tenant.address_zip} onChange={(event) => handleTenantChange('address_zip', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="00000-000" />
                {errors.address_zip ? <span className="text-xs text-rose-300">{errors.address_zip}</span> : null}
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>Complemento</span>
                <input value={form.tenant.address_complement} onChange={(event) => handleTenantChange('address_complement', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="Opcional" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>Cidade</span>
                <input value={form.tenant.address_city} onChange={(event) => handleTenantChange('address_city', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                {errors.address_city ? <span className="text-xs text-rose-300">{errors.address_city}</span> : null}
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>UF</span>
                <input value={form.tenant.address_state} onChange={(event) => handleTenantChange('address_state', event.target.value.toUpperCase())} maxLength={2} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="RO" />
                {errors.address_state ? <span className="text-xs text-rose-300">{errors.address_state}</span> : null}
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>CNH (número)</span>
                <input value={form.tenant.cnh_number} onChange={(event) => handleTenantChange('cnh_number', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>CNH (validade)</span>
                <input type="date" value={form.tenant.cnh_validity} onChange={(event) => handleTenantChange('cnh_validity', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>
            </div>
          </div>

          {/* Passo 4: prazo e valores */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">4. Prazo, periodicidade e valores</p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>Data de início</span>
                <input type="date" value={form.start_date} onChange={(event) => handleChange('start_date', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                {errors.start_date ? <span className="text-xs text-rose-300">{errors.start_date}</span> : null}
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>Prazo do contrato</span>
                <select
                  value={form.duration_months}
                  onChange={(event) => handleChange('duration_months', event.target.value === 'custom' ? 'custom' : Number(event.target.value))}
                  className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                >
                  {DURATION_PRESETS.map((preset) => (
                    <option key={preset.label} value={preset.months}>{preset.label}</option>
                  ))}
                </select>
                {errors.duration_months ? <span className="text-xs text-rose-300">{errors.duration_months}</span> : null}
              </label>

              {form.duration_months === 'custom' ? (
                <label className="flex flex-col gap-2 text-sm text-slate-300">
                  <span>Quantos meses?</span>
                  <input type="number" min="1" value={customMonths} onChange={(event) => setCustomMonths(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="5" />
                </label>
              ) : null}

              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>Data final (calculada — pode ajustar)</span>
                <input type="date" value={form.end_date || computedEndDate || ''} onChange={(event) => handleChange('end_date', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                <span className="text-xs text-slate-500">{computedWeeks} semana(s) de vigência total</span>
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>Periodicidade do pagamento</span>
                <select
                  value={form.periodicity}
                  onChange={(event) => handleChange('periodicity', event.target.value)}
                  className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                >
                  {Object.entries(PERIODICITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>{PAYMENT_AMOUNT_LABEL[form.periodicity] || 'Valor do pagamento'}</span>
                <input type="number" min="0" step="0.01" value={form.payment_amount} onChange={(event) => handleChange('payment_amount', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
                {errors.payment_amount ? <span className="text-xs text-rose-300">{errors.payment_amount}</span> : null}
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>Caução</span>
                <input type="number" min="0" step="0.01" value={form.deposit_amount} onChange={(event) => handleChange('deposit_amount', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-300">
                <span>Quilometragem inicial</span>
                <input type="number" min="0" value={form.initial_km} onChange={(event) => handleChange('initial_km', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Observações</span>
              <textarea rows="3" value={form.observations} onChange={(event) => handleChange('observations', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
            </label>
          </div>

          <div className="flex flex-col-reverse justify-end gap-3 border-t border-white/10 pt-4 sm:flex-row">
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 disabled:opacity-60">
              {loading ? 'Gerando...' : 'Gerar contrato (Rascunho)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
