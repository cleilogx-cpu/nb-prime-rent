import { useEffect, useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { createExpense, listExpenses } from '../services/expensesService.js'
import { listVehicles } from '../services/vehiclesService.js'

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState({
  vehicle_id: '',
  expense_date: new Date().toISOString().slice(0, 10),
  category: '',
  amount: '',
  description: '',
  payment_source: '',
  payment_method: 'PIX',
})

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

  const handleSubmit = async (event) => {
  event.preventDefault()

  const payload = {
    vehicle_id: form.vehicle_id,
    expense_date: form.expense_date,
    category: form.category,
    amount: form.amount,
    description: form.description,
    source: form.payment_source,
    payment_method: form.payment_method,
  }

  const { error } = await createExpense(payload)

  if (error) {
    console.error('Erro ao salvar despesa:', error)
    return
  }

  setForm({
    vehicle_id: '',
    expense_date: new Date().toISOString().slice(0, 10),
    category: '',
    amount: '',
    description: '',
    payment_source: '',
    payment_method: 'PIX',
  })

  setShowForm(false)
  await loadExpenses()
}
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
{!loading && expenses.length > 0 ? (
  <div className="grid gap-4 md:grid-cols-2">
    {expenses.map((expense) => {
      const vehicle = vehicles.find((item) => item.id === expense.vehicle_id)

      return (
        <div
          key={expense.id}
          className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-lg shadow-black/20"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-amber-300/80">
                {vehicle?.plate || 'Veículo não informado'}
              </p>

              <h3 className="mt-2 text-xl font-semibold text-white">
                {expense.description || 'Despesa sem descrição'}
              </h3>
            </div>

            <p className="text-lg font-semibold text-white">
              R$ {Number(expense.amount || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="mt-5 space-y-2 text-sm text-slate-400">
            <p>
              <span className="text-slate-500">Data:</span>{' '}
              {expense.expense_date
                ? new Date(`${expense.expense_date}T12:00:00`).toLocaleDateString('pt-BR')
                : 'Não informada'}
            </p>

            <p>
              <span className="text-slate-500">Categoria:</span>{' '}
              {{
  maintenance: 'Manutenção',
  cleaning: 'Limpeza',
  accessories: 'Acessórios',
  documentation: 'Documentação',
  insurance: 'Seguro',
  fine: 'Multa',
  transport: 'Transporte',
  other: 'Outros',
}[expense.category] || 'Não informada'}
            </p>

            <p>
              <span className="text-slate-500">Origem:</span>{' '}
              {{
  vehicle_fund: 'Fundo do veículo',
  clei: 'Clei',
  edson: 'Edson',
}[expense.source] || 'Não informada'}
            </p>
            <p>
  <span className="text-slate-500">Forma de pagamento:</span>{' '}
  {expense.payment_method || 'Não informada'}
</p>
          </div>
        </div>
      )
    })}
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
            <form onSubmit={handleSubmit}>

            <div className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-300">
                  Veículo
                </span>

   <select
  value={form.vehicle_id}
  onChange={(event) =>
    setForm((current) => ({
      ...current,
      vehicle_id: event.target.value,
    }))
  }
  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
>
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
                  value={form.expense_date}
onChange={(event) =>
  setForm((current) => ({
    ...current,
    expense_date: event.target.value,
  }))
}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-300">
                  Categoria
                </span>

                <select
  value={form.category}
  onChange={(event) =>
    setForm((current) => ({
      ...current,
      category: event.target.value,
    }))
  }
  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
>
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

            <div className="mt-4">
  <label className="block space-y-2">
    <span className="text-sm font-medium text-slate-300">
      Valor da despesa
    </span>

    <input
      type="number"
      step="0.01"
      min="0"
      placeholder="R$ 0,00"
      value={form.amount}
onChange={(event) =>
  setForm((current) => ({
    ...current,
    amount: event.target.value,
  }))
}
      className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
    />
  </label>
</div>
<div className="mt-4">
  <label className="block space-y-2">
    <span className="text-sm font-medium text-slate-300">
      Descrição
    </span>

    <input
      type="text"
      value={form.description}
onChange={(event) =>
  setForm((current) => ({
    ...current,
    description: event.target.value,
  }))
}
      placeholder="Ex.: troca de óleo, lavagem, película..."
      className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
    />
  </label>
</div>
<div className="mt-4">
  <label className="block space-y-2">
    <span className="text-sm font-medium text-slate-300">
      Origem do recurso
    </span>

  <select
  value={form.payment_source}
  onChange={(event) =>
    setForm((current) => ({
      ...current,
      payment_source: event.target.value,
    }))
  }
  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
>
      <option value="">Selecione a origem</option>
      <option value="vehicle_fund">Fundo do veículo</option>
      <option value="clei">Clei</option>
      <option value="edson">Edson</option>
    </select>
  </label>
</div>
<div className="mt-4">
  <label className="block space-y-2">
    <span className="text-sm font-medium text-slate-300">
      Forma de pagamento
    </span>

    <select
      value={form.payment_method}
      onChange={(event) =>
        setForm((current) => ({
          ...current,
          payment_method: event.target.value,
        }))
      }
      className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
    >
      <option value="PIX">PIX</option>
      <option value="Cartão">Cartão</option>
      <option value="Dinheiro">Dinheiro</option>
      <option value="Boleto">Boleto</option>
    </select>
  </label>
</div>
<div className="mt-6 flex justify-end">
  <button
    type="submit"
    className="rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200"
  >
    Salvar despesa
  </button>
</div>

</form>
          </div>
        </div>
      ) : null}
    </div>
  )     
}