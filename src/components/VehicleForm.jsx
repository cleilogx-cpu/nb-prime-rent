import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { getVehicleDisplayStatus } from '../lib/vehicleStatus.js'

const initialForm = {
  plate: '',
  model: '',
  color: '',
  year: '',
  chassis: '',
  current_km: '',
  next_review_km: '',
  maintenance: false,
}

export default function VehicleForm({ open, onClose, onSubmit, vehicle, loading }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (vehicle) {
      // `status` do veículo nunca entra no formulário — é controlado só pelo
      // contrato (signContract/endLocation). Só a condição de manutenção é
      // editável aqui, de forma independente.
      const vehicleWithoutStatus = { ...vehicle }
      delete vehicleWithoutStatus.status
      setForm({
        ...initialForm,
        ...vehicleWithoutStatus,
        current_km: vehicle.current_km ?? '',
        next_review_km: vehicle.next_review_km ?? '',
        maintenance: Boolean(vehicle.maintenance),
      })
    } else {
      setForm(initialForm)
    }
    setErrors({})
  }, [vehicle, open])

  if (!open) {
    return null
  }

  const handleChange = (field, value) => {
    if (field === 'plate') {
      value = value.toUpperCase()
    }

    setForm((current) => ({ ...current, [field]: value }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.plate?.trim()) nextErrors.plate = 'A placa é obrigatória.'
    if (!form.model?.trim()) nextErrors.model = 'O modelo é obrigatório.'
    if (!form.color?.trim()) nextErrors.color = 'A cor é obrigatória.'
    if (form.next_review_km === '' || form.next_review_km === null || form.next_review_km === undefined) {
      nextErrors.next_review_km = 'A próxima revisão (km) é obrigatória.'
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
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-black/60 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">{vehicle ? 'Editar veículo' : 'Novo veículo'}</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{vehicle ? 'Atualize os dados do veículo' : 'Cadastre um novo veículo'}</h3>
            <p className="mt-2 text-xs text-slate-500">
              O veículo é só o bem. Locatário, valores e datas de aluguel agora ficam no contrato.
            </p>
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
              <span>Ano/Modelo</span>
              <input
                type="number"
                value={form.year}
                onChange={(event) => handleChange('year', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="2026"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-300">
              <span>Chassi</span>
              <input
                value={form.chassis}
                onChange={(event) => handleChange('chassis', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                placeholder="9BW..."
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
              <span>Próxima revisão (km)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.next_review_km}
                onChange={(event) => handleChange('next_review_km', event.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              />
              {errors.next_review_km ? <span className="text-xs text-rose-300">{errors.next_review_km}</span> : null}
            </label>

            <label className="flex flex-col justify-center gap-2 text-sm text-slate-300">
              <span>Condição operacional</span>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white">
                <input
                  type="checkbox"
                  checked={Boolean(form.maintenance)}
                  onChange={(event) => handleChange('maintenance', event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-slate-800 accent-amber-400"
                />
                Em manutenção?
              </label>
              {vehicle ? (
                <span className="text-xs text-slate-500">
                  Status atual: <span className="text-slate-300">{getVehicleDisplayStatus(vehicle)}</span> — "Alugado" só muda
                  automaticamente pelo contrato, nunca aqui.
                </span>
              ) : (
                <span className="text-xs text-slate-500">Todo veículo novo entra como "Disponível" (ou "Manutenção" se marcar acima).</span>
              )}
            </label>
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
