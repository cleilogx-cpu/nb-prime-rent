import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { listVehicles } from '../services/vehiclesService.js'
import { addMonthsToDate, deriveWeeksFromDates } from '../lib/contractLogic.js'
import { PERIODICITY } from '../lib/constants.js'
import VehicleStepFields from './VehicleStepFields.jsx'
import TenantFields from './TenantFields.jsx'
import LeaseTermsStepFields from './LeaseTermsStepFields.jsx'

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
    birth_date: '',
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

/**
 * Monta o form a partir de um contrato existente (modo edição, seção 10 do
 * pedido) -- só usado pra Rascunho. Datas numéricas (payment_amount etc.)
 * viram string porque é o que os `<input>` controlados esperam.
 */
function formFromContract(contract) {
  const tenant = contract.tenants || {}

  return {
    vehicle_id: contract.vehicle_id,
    finance_model: contract.finance_model || 'partners',
    tenant: {
      full_name: tenant.full_name || '',
      cpf: tenant.cpf || '',
      rg: tenant.rg || '',
      phone: tenant.phone || '',
      address_street: tenant.address_street || '',
      address_number: tenant.address_number || '',
      address_neighborhood: tenant.address_neighborhood || '',
      address_zip: tenant.address_zip || '',
      address_complement: tenant.address_complement || '',
      address_city: tenant.address_city || '',
      address_state: tenant.address_state || '',
      cnh_number: tenant.cnh_number || '',
      cnh_validity: tenant.cnh_validity || '',
      birth_date: tenant.birth_date || '',
    },
    start_date: contract.start_date || new Date().toISOString().slice(0, 10),
    duration_months: 'custom',
    end_date: contract.end_date || '',
    periodicity: contract.periodicity || PERIODICITY.WEEKLY,
    payment_amount: contract.payment_amount ?? '',
    deposit_amount: contract.deposit_amount ?? '',
    initial_km: contract.initial_km ?? '',
    observations: contract.observations || '',
  }
}

export default function ContractForm({ open, onClose, onSubmit, loading, contract }) {
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [customMonths, setCustomMonths] = useState('')
  const isEditing = Boolean(contract)

  useEffect(() => {
    if (!open) {
      return
    }

    setForm(contract ? formFromContract(contract) : initialForm)
    setCustomMonths('')
    setErrors({})

    listVehicles({}).then(({ data }) => setVehicles(data ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract])

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
    if (form.duration_months === 'custom' && !customMonths && !form.end_date) nextErrors.duration_months = 'Informe quantos meses.'

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
      tenant_id: contract?.tenant_id,
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
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">{isEditing ? 'Editar contrato' : 'Novo contrato'}</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{isEditing ? `Editar ${contract.contract_number}` : 'Gerar contrato de locação'}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-slate-900 p-2 text-slate-200">
            <X size={18} />
          </button>
        </div>

        <form className="mt-6 space-y-6" onSubmit={submit}>
          <VehicleStepFields
            vehicles={vehicles}
            vehicleId={form.vehicle_id}
            onSelectVehicle={handleVehicleSelect}
            selectedVehicle={selectedVehicle}
            error={errors.vehicle_id}
          />

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Distribuição do aluguel</p>
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

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Dados do locatário</p>
            <TenantFields tenant={form.tenant} onChange={handleTenantChange} errors={errors} />
          </div>

          <LeaseTermsStepFields
            form={form}
            errors={errors}
            customMonths={customMonths}
            setCustomMonths={setCustomMonths}
            computedEndDate={computedEndDate}
            computedWeeks={computedWeeks}
            onChange={handleChange}
          />

          <div className="flex flex-col-reverse justify-end gap-3 border-t border-white/10 pt-4 sm:flex-row">
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 disabled:opacity-60">
              {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Gerar contrato (Rascunho)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
