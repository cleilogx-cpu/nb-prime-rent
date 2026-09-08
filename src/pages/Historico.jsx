import { useEffect, useState } from 'react'
import { Archive } from 'lucide-react'
import { listLocationHistory } from '../services/locationsService.js'
import { listPayments } from '../services/paymentsService.js'
import { listExpenses } from '../services/expensesService.js'
import { formatCurrency, formatDate, computeLocationFinancials } from '../services/locationLogic.js'
import { PERIODICITY_LABELS } from '../lib/constants.js'
import LoadingScreen from '../components/LoadingScreen.jsx'

const FINANCE_LABELS = { partners: 'Sócios', savings: 'Fundo' }

function statusBadgeStyle(status) {
  if (status === 'Cancelada') {
    return 'border-rose-400/20 bg-rose-500/10 text-rose-200'
  }
  return 'border-slate-400/20 bg-slate-500/10 text-slate-200'
}

function ratingBadgeStyle(rating) {
  if (rating === 'Ruim') {
    return 'border-rose-400/20 bg-rose-500/10 text-rose-200'
  }
  if (rating === 'Boa') {
    return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
  }
  return 'border-white/10 bg-slate-900 text-slate-400'
}

function HistoryCard({ location, payments, expenses }) {
  const vehicle = location.vehicles
  const tenant = location.tenants
  const { totalReceived, totalExpenses } = computeLocationFinancials(location, payments, expenses)

  return (
    <article className="rounded-[30px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">{vehicle?.plate || 'Sem placa'}</p>
          <h3 className="mt-3 text-xl font-semibold text-white">{vehicle?.model || 'Modelo não informado'}</h3>
          <p className="mt-1 text-sm text-slate-400">{location.contracts?.contract_number || 'Contrato não informado'}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] ${statusBadgeStyle(location.status)}`}>
            {location.status}
          </span>
          {location.tenant_rating ? (
            <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] ${ratingBadgeStyle(location.tenant_rating)}`}>
              Avaliação: {location.tenant_rating}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Locatário</p>
            <p className="mt-2 text-base font-medium text-white">{tenant?.full_name || 'Sem locatário'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Período</p>
            <p className="mt-2 text-base font-medium text-white">
              {formatDate(location.start_date)} — {formatDate(location.actual_end_date || location.expected_end_date)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Distribuição</p>
            <p className="mt-2 text-base font-medium text-white">{FINANCE_LABELS[location.contracts?.finance_model] || 'Não informado'}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Valor ({PERIODICITY_LABELS[location.periodicity] || 'Semanal'})</p>
            <p className="mt-2 text-base font-medium text-white">{formatCurrency(location.payment_amount)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Km inicial / final</p>
            <p className="mt-2 text-base font-medium text-white">
              {location.initial_km ?? 'Não informado'} / {location.final_km ?? 'Não informado'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">Total recebido</p>
          <p className="mt-2 text-lg font-semibold text-emerald-100">{formatCurrency(totalReceived)}</p>
        </div>
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-rose-300/80">Total de gastos</p>
          <p className="mt-2 text-lg font-semibold text-rose-100">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      {location.closing_notes ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Observação do encerramento</p>
          <p className="mt-2 text-sm text-slate-300">{location.closing_notes}</p>
        </div>
      ) : null}
    </article>
  )
}

export default function Historico() {
  const [locations, setLocations] = useState([])
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data, error: fetchError }, { data: paymentsData }, { data: expensesData }] = await Promise.all([
        listLocationHistory(),
        listPayments(),
        listExpenses(),
      ])

      if (fetchError) {
        setError(fetchError.message || 'Falha ao carregar o histórico.')
      } else {
        setError(null)
        setLocations(data ?? [])
      }
      setPayments(paymentsData ?? [])
      setExpenses(expensesData ?? [])
      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Histórico</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Locações encerradas e canceladas</h2>
          <p className="mt-2 text-sm text-slate-400">
            Aparece aqui automaticamente quando uma locação é encerrada em Locações.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-[28px] border border-rose-500/30 bg-rose-500/10 p-6 text-slate-100">
          <p className="text-lg font-semibold text-rose-100">Falha ao carregar o histórico</p>
          <p className="mt-3 text-sm text-rose-200">{error}</p>
        </div>
      ) : null}

      {!error && locations.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center shadow-lg shadow-black/20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
            <Archive size={20} />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">Nenhum registro no histórico ainda</h3>
          <p className="mt-2 text-sm text-slate-400">Quando você encerrar uma locação em Locações, ela aparece aqui.</p>
        </div>
      ) : null}

      {!error && locations.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {locations.map((location) => (
            <HistoryCard key={location.id} location={location} payments={payments} expenses={expenses} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
