import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'

const initialForm = {
  plate: '',
  model: '',
  color: '',
  tenant_name: '',
  tenant_phone: '',
  weekly_rent: '',
  finance_model: 'partners',
  next_payment: '',
  next_destination: '',
  deposit_expected: '',
  deposit_received: '',
  deposit_expenses: '',
  current_km: '',
  next_review_km: '',
  status: 'Disponível',
}

export default function VehicleForm({ open, onClose, onSubmit, vehicle, loading }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (vehicle) {
      setForm({
        ...initialForm,
        ...vehicle,
        weekly_rent: vehicle.weekly_rent ?? '',
        deposit_expected: vehicle.deposit_expected ?? '',
        deposit_received: vehicle.deposit_received ?? '',
        deposit_expenses: vehicle.deposit_expenses ?? '',
        current_km: vehicle.current_km ?? '',
        next_review_km: vehicle.next_review_km ?? '',
        next_destination: vehicle.finance_model === 'savings' ? 'Poupança' : (vehicle.next_destination ?? ''),
      })
    } else {
      setForm({ ...initialForm, next_destination: '' })
    }
    setErrors({})
  }, [vehicle, open])

  const selectedFinanceModel = form.finance_model

  const financeHint = useMemo(() => {
    if (selectedFinanceModel === 'savings') {
      return 'Os pagamentos entram no fundo do veículo e não são distribuídos imediatamente entre os sócios.'
    }

    return 'A alternância entre sócios define o próximo destinatário do recebimento semanal.'
  }, [selectedFinanceModel])

  if (!open) {
    return null
  }

  const handleChange = (field, value) => {
    if (field === 'plate') {
      value = value.toUpperCase()
    }

    if (field === 'finance_model' && value === 'savings') {
      setForm((current) => ({ ...current, finance_model: value, next_destination: 'Poupança' }))
      return
    }

    if (field === 'finance_model' && value === 'partners') {
      setForm((current) => ({ ...current, finance_model: value, next_destination: current.next_destination === 'Poupança' ? '' : current.next_destination }))
      return
    }

    setForm((current) => ({ ...current, [field]: value }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.plate?.trim()) nextErrors.plate = 'A placa é obrigatória.'
    if (!form.model?.trim()) nextErrors.model = 'O modelo é obrigatório.'
    if (!form.color?.trim()) nextErrors.color = 'A cor é obrigatória.'
    if (!form.tenant_name?.trim()) nextErrors.tenant_name = 'O locatário é obrigatório.'
    if (!form.weekly_rent) nextErrors.weekly_rent = 'O aluguel semanal é obrigatório.'
    if (!form.finance_model) nextErrors.finance_model = 'O modelo financeiro é obrigatório.'
    if (!form.next_payment) nextErrors.next_payment = 'O próximo pagamento é obrigatório.'
    if (!form.status?.trim()) nextErrors.status = 'O status é obrigatório.'

    if (form.finance_model === 'partners' && !form.next_destination?.trim()) {
      nextErrors.next_destination = 'Selecione Clei ou Edson.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submit = (event) => {
    event.preventDefault()

    if (!validate()) {
      return
    }

    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-3 py-6 sm:px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-black/60 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">{vehicle ? 'Editar veículo' : 'Novo veículo'}</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{vehicle ? 'Atualize os dados do veículo' : 'Cadastre um novo veículo'}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-slate-900 p-2 text-slate-200">
            <X size={18} />
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Placa</span>
              <input
                value={form.plate}
                onChange={(event) => handleChange('plate', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="ABC1234"
              />
              {errors.plate ? <span className="text-xs text-rose-300">{errors.plate}</span> : null}
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Modelo</span>
              <input
                value={form.model}
                onChange={(event) => handleChange('model', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="HB20"
              />
              {errors.model ? <span className="text-xs text-rose-300">{errors.model}</span> : null}
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Cor</span>
              <input
                value={form.color}
                onChange={(event) => handleChange('color', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="Prata"
              />
              {errors.color ? <span className="text-xs text-rose-300">{errors.color}</span> : null}
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Locatário</span>
              <input
                value={form.tenant_name}
                onChange={(event) => handleChange('tenant_name', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="Nome do locatário"
              />
              {errors.tenant_name ? <span className="text-xs text-rose-300">{errors.tenant_name}</span> : null}
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Telefone</span>
              <input
                value={form.tenant_phone}
                onChange={(event) => handleChange('tenant_phone', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="(11) 99999-9999"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Aluguel semanal</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.weekly_rent}
                onChange={(event) => handleChange('weekly_rent', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="0"
              />
              {errors.weekly_rent ? <span className="text-xs text-rose-300">{errors.weekly_rent}</span> : null}
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Modelo financeiro</span>
              <select
                value={form.finance_model}
                onChange={(event) => handleChange('finance_model', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                <option value="partners">Alternância entre sócios</option>
                <option value="savings">Fundo do veículo</option>
              </select>
              {errors.finance_model ? <span className="text-xs text-rose-300">{errors.finance_model}</span> : null}
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Próximo pagamento</span>
              <input
                type="date"
                value={form.next_payment}
                onChange={(event) => handleChange('next_payment', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              />
              {errors.next_payment ? <span className="text-xs text-rose-300">{errors.next_payment}</span> : null}
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Próximo destino</span>
              <select
                value={form.next_destination}
                onChange={(event) => handleChange('next_destination', event.target.value)}
                disabled={form.finance_model === 'savings'}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="">Selecione</option>
                <option value="Clei">Clei</option>
                <option value="Edson">Edson</option>
              </select>
              {errors.next_destination ? <span className="text-xs text-rose-300">{errors.next_destination}</span> : null}
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Caução prevista</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.deposit_expected}
                onChange={(event) => handleChange('deposit_expected', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Caução recebida</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.deposit_received}
                onChange={(event) => handleChange('deposit_received', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Despesas da caução</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.deposit_expenses}
                onChange={(event) => handleChange('deposit_expenses', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Quilometragem atual</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.current_km}
                onChange={(event) => handleChange('current_km', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Próxima revisão</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.next_review_km}
                onChange={(event) => handleChange('next_review_km', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) => handleChange('status', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                <option value="Disponível">Disponível</option>
                <option value="Alugado">Alugado</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Inativo">Inativo</option>
              </select>
              {errors.status ? <span className="text-xs text-rose-300">{errors.status}</span> : null}
            </label>
          </div>

          <div className="rounded-3xl border border-amber-300/15 bg-amber-300/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">Fluxo financeiro</p>
            <p className="mt-2 leading-6">{financeHint}</p>
          </div>

          <div className="flex flex-col-reverse justify-end gap-3 border-t border-white/10 pt-4 sm:flex-row">
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 disabled:opacity-60">
              {loading ? 'Salvando...' : vehicle ? 'Salvar alterações' : 'Criar veículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
