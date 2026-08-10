import { useEffect, useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { listExpenses } from '../services/expensesService.js'
import { listVehicles } from '../services/vehiclesService.js'

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [vehicles, setVehicles] = useState([])

  const loadExpenses = async () => {
    setLoading(true)

    const { data, error } = await listExpenses()

    if (error) {
      console.error('Erro ao carregar despesas:', error)
      setExpenses([])
    } else {
      setExpenses(data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadExpenses()

    const loadVehicles = async () => {
      const { data, error } = await listVehicles()

      if (error) {
        console.error('Erro ao carregar veículos:', error)
        setVehicles([])
      } else {
        setVehicles(data ?? [])
      }
    }

    loadVehicles()
  }, [])

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">
              Despesas
            </p>

            <h2 className="mt-3 text-3xl font-semibold text-white">
              Controle as despesas dos veículos.
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200"
          >
            <PlusCircle size={18} />
            Nova despesa
          </button>
        </div>
      </section>

      {loading ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center text-slate-400">
          Carregando despesas…
        </div>
      ) : null}

      {!loading && expenses.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center text-slate-400">
          Nenhuma despesa cadastrada.
        </div>
      ) : null}

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">
                  Nova despesa
                </p>

                <h3 className="mt-2 text-2xl font-semibold text-white">
                  Registrar despesa
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-300">
                  Veículo
                </span>

                <select className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none">
                  <option value="">Selecione um veículo</option>

                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate} — {vehicle.model}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-300">
                  Data da despesa
                </span>

                <input
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-300">
                  Categoria
                </span>

                <select className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none">
                  <option value="">Selecione uma categoria</option>
                  <option value="maintenance">Manutenção</option>
                  <option value="cleaning">Limpeza</option>
                  <option value="accessories">Acessórios</option>
                  <option value="documentation">Documentação</option>
                  <option value="insurance">Seguro</option>
                  <option value="fine">Multa</option>
                  <option value="transport">Transporte</option>
                  <option value="other">Outros</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}