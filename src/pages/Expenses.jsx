import { useEffect, useMemo, useState } from 'react'
import { PlusCircle, Search } from 'lucide-react'
import {
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
} from '../services/expensesService.js'
import { listVehicles } from '../services/vehiclesService.js'
import { monthRange, yearRange, MONTH_LABELS } from '../lib/paymentAggregation.js'

const CATEGORY_LABELS = {
  maintenance: 'Manutenção',
  cleaning: 'Limpeza',
  accessories: 'Acessórios',
  documentation: 'Documentação',
  insurance: 'Seguro',
  fine: 'Multa',
  transport: 'Transporte',
  other: 'Outros',
}

const SOURCE_LABELS = {
  vehicle_fund: 'Fundo do veículo',
  clei: 'Clei',
  edson: 'Edson',
}

const PERIOD_MODE = { MONTH: 'month', YEAR: 'year', CUSTOM: 'custom' }
const now = new Date()

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState(null)
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

  const [search, setSearch] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [periodMode, setPeriodMode] = useState(PERIOD_MODE.MONTH)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [customStart, setCustomStart] = useState(monthRange(now.getFullYear(), now.getMonth() + 1).periodStart)
  const [customEnd, setCustomEnd] = useState(monthRange(now.getFullYear(), now.getMonth() + 1).periodEnd)
  const [hasSearched, setHasSearched] = useState(false)

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

  const { error } = editingExpenseId
  ? await updateExpense(editingExpenseId, payload)
  : await createExpense(payload)

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

  setEditingExpenseId(null)
  setShowForm(false)
  await loadExpenses()
}
const handleDelete = async (expense) => {
  const confirmed = window.confirm(
    `Deseja realmente excluir o custo "${expense.description || 'Sem descrição'}"?`
  )

  if (!confirmed) {
    return
  }

  const { error } = await deleteExpense(expense.id)

  if (error) {
    console.error('Erro ao excluir despesa:', error)
    return
  }

  await loadExpenses()
}
const handleEdit = (expense) => {
  setEditingExpenseId(expense.id)

  setForm({
    vehicle_id: expense.vehicle_id || '',
    expense_date: expense.expense_date || new Date().toISOString().slice(0, 10),
    category: expense.category || '',
    amount: expense.amount ?? '',
    description: expense.description || '',
    payment_source: expense.source || '',
    payment_method: expense.payment_method || 'PIX',
  })

  setShowForm(true)
}

  const { periodStart, periodEnd } = useMemo(() => {
    if (periodMode === PERIOD_MODE.YEAR) {
      return yearRange(year)
    }
    if (periodMode === PERIOD_MODE.CUSTOM) {
      return { periodStart: customStart, periodEnd: customEnd }
    }
    return monthRange(year, month)
  }, [periodMode, year, month, customStart, customEnd])

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const vehicle = vehicles.find((item) => item.id === expense.vehicle_id)
      const haystack = [vehicle?.plate, vehicle?.model, expense.description].join(' ').toLowerCase()
      const matchesSearch = !search || haystack.includes(search.toLowerCase())
      const matchesVehicle = !vehicleFilter || expense.vehicle_id === vehicleFilter
      const matchesCategory = !categoryFilter || expense.category === categoryFilter
      const matchesSource = !sourceFilter || expense.source === sourceFilter
      const expenseDate = expense.expense_date || ''
      const matchesPeriod = expenseDate >= periodStart && expenseDate <= periodEnd
      return matchesSearch && matchesVehicle && matchesCategory && matchesSource && matchesPeriod
    })
  }, [expenses, vehicles, search, vehicleFilter, categoryFilter, sourceFilter, periodStart, periodEnd])

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">
              Custos
            </p>

            <h2 className="mt-3 text-3xl font-semibold text-white">
              Controle os custos dos veículos.
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200"
          >
            <PlusCircle size={18} />
            Novo custo
          </button>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Pesquisar</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Placa, modelo ou descrição" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" />
          </label>
          <label className="space-y-2">
            <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Veículo</span>
            <select value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
              <option value="">Todos os veículos</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Categoria</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
              <option value="">Todas</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Origem</span>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
              <option value="">Todas</option>
              {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-1">
            {[
              { value: PERIOD_MODE.MONTH, label: 'Mês' },
              { value: PERIOD_MODE.YEAR, label: 'Ano' },
              { value: PERIOD_MODE.CUSTOM, label: 'Personalizado' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriodMode(option.value)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  periodMode === option.value ? 'bg-amber-300/15 text-amber-200' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {periodMode === PERIOD_MODE.MONTH ? (
            <>
              <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
                {MONTH_LABELS.map((label, index) => (
                  <option key={label} value={index + 1}>{label}</option>
                ))}
              </select>
              <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
                {[year - 1, year, year + 1].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </>
          ) : null}

          {periodMode === PERIOD_MODE.YEAR ? (
            <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
              {[year - 1, year, year + 1].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : null}

          {periodMode === PERIOD_MODE.CUSTOM ? (
            <>
              <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" />
              <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" />
            </>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setHasSearched(true)}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/25"
        >
          <Search size={16} />
          Consultar custos
        </button>
      </section>

      {loading ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center text-slate-400">
          Carregando custos…
        </div>
      ) : null}

      {!loading && hasSearched && filteredExpenses.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center text-slate-400">
          Nenhum custo encontrado. Ajuste os filtros ou registre um novo custo.
        </div>
      ) : null}
{!loading && hasSearched && filteredExpenses.length > 0 ? (
  <div className="grid gap-4 md:grid-cols-2">
    {filteredExpenses.map((expense) => {
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
                {expense.description || 'Custo sem descrição'}
              </h3>
            </div>

            <p className="text-lg font-semibold text-white">
              R$ {Number(expense.amount || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </p>
            <div className="mt-3 flex justify-end gap-2">
  <button
    type="button"
    onClick={() => handleEdit(expense)}
    className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-300"
  >
    Editar
  </button>

  <button
    type="button"
    onClick={() => handleDelete(expense)}
    className="rounded-xl border border-red-400/20 px-3 py-1.5 text-xs text-red-300"
  >
    Excluir
  </button>
</div>
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
              {CATEGORY_LABELS[expense.category] || 'Não informada'}
            </p>

            <p>
              <span className="text-slate-500">Origem:</span>{' '}
              {SOURCE_LABELS[expense.source] || 'Não informada'}
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
                  {editingExpenseId ? 'Editar custo' : 'Novo custo'}
                </p>

                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {editingExpenseId ? 'Atualizar custo' : 'Registrar custo'}
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
                  Data do custo
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
      Valor do custo
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
    {editingExpenseId ? 'Atualizar custo' : 'Salvar custo'}
  </button>
</div>

</form>
          </div>
        </div>
      ) : null}
    </div>
  )     
}