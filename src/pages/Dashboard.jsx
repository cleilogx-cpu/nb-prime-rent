import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarClock, ShieldCheck, Truck } from 'lucide-react'
import { fetchOverviewData, fetchFinancialRawData } from '../services/dashboardService.js'
import { listVehicles } from '../services/vehiclesService.js'
import { computePaymentTotals, monthRange, MONTH_LABELS } from '../lib/paymentAggregation.js'
import { getVehicleDisplayStatus } from '../lib/vehicleStatus.js'
import { formatCurrency, formatDate } from '../lib/format.js'
import LoadingScreen from '../components/LoadingScreen.jsx'

function InfoCard({ label, value, icon }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm uppercase tracking-[0.35em] text-slate-500">{label}</p>
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
          {icon}
        </div>
      </div>
      <p className="mt-6 text-3xl font-semibold text-white">{value}</p>
    </div>
  )
}

function ChargeRow({ charge, overdue }) {
  return (
    <Link
      to="/contracts"
      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm transition hover:border-amber-300/30 hover:bg-slate-950"
    >
      <div>
        <p className="font-medium text-white">{charge.vehicles?.plate || 'Veículo'} — {charge.contracts?.contract_number || 'Contrato'}</p>
        <p className="text-xs text-slate-500">Vencimento: {formatDate(charge.due_date)}{overdue ? ` · ${charge.overdue_days} dia(s) atrasado` : ''}</p>
      </div>
      <span className={overdue ? 'font-semibold text-rose-300' : 'font-semibold text-amber-300'}>{formatCurrency(charge.amount)}</span>
    </Link>
  )
}

const now = new Date()

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [vehicleId, setVehicleId] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: overviewData, error: overviewError }, { data: vehiclesData }, { data: financialData, error: financialError }] = await Promise.all([
        fetchOverviewData(),
        listVehicles(),
        fetchFinancialRawData(),
      ])

      if (overviewError) {
        setError(overviewError.message || 'Erro ao carregar dados do Supabase.')
      } else if (financialError) {
        setError(financialError.message || 'Erro ao carregar os dados financeiros.')
      } else {
        setOverview(overviewData)
        setPayments(financialData.payments)
        setExpenses(financialData.expenses)
      }

      setVehicles(vehiclesData ?? [])
      setLoading(false)
    }

    load()
  }, [])

  const { periodStart, periodEnd } = useMemo(() => monthRange(year, month), [year, month])

  const financialTotals = useMemo(
    () => computePaymentTotals({ payments, expenses, periodStart, periodEnd, vehicleId: vehicleId || undefined }),
    [payments, expenses, periodStart, periodEnd, vehicleId],
  )

  const selectedVehicleLabel = useMemo(() => {
    if (!vehicleId) {
      return 'Todos os veículos'
    }
    const vehicle = vehicles.find((item) => item.id === vehicleId)
    return vehicle?.plate || 'Veículo'
  }, [vehicleId, vehicles])

  if (loading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-slate-100">
        <p className="text-lg font-semibold text-rose-100">Falha ao carregar o dashboard</p>
        <p className="mt-3 text-sm text-rose-200">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Visão Geral */}
      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-black/30">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Visão Geral</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Frota e vencimentos</h2>
          </div>
          <p className="text-sm text-slate-400">{MONTH_LABELS[now.getMonth()]} de {now.getFullYear()}</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <InfoCard label="Veículos alugados" value={overview.rentedCount} icon={<Truck size={18} />} />
          <InfoCard label="Veículos disponíveis" value={overview.availableCount} icon={<Truck size={18} />} />
          <InfoCard label="Em manutenção" value={overview.maintenanceCount} icon={<ShieldCheck size={18} />} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
          <div className="flex items-center gap-3">
            <CalendarClock size={18} className="text-amber-300" />
            <h3 className="text-lg font-semibold text-white">Próximos vencimentos</h3>
          </div>
          <div className="mt-5 space-y-3">
            {overview.upcomingCharges.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma cobrança pendente no horizonte.</p>
            ) : (
              overview.upcomingCharges.map((charge) => <ChargeRow key={charge.id} charge={charge} />)
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-rose-300" />
            <h3 className="text-lg font-semibold text-white">Pagamentos atrasados</h3>
          </div>
          <div className="mt-5 space-y-3">
            {overview.overdueCharges.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum pagamento atrasado. 🎉</p>
            ) : (
              overview.overdueCharges.map((charge) => <ChargeRow key={charge.id} charge={charge} overdue />)
            )}
          </div>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Resumo Financeiro</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              {MONTH_LABELS[month - 1]} / {year} — {selectedVehicleLabel}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none">
              {MONTH_LABELS.map((label, index) => (
                <option key={label} value={index + 1}>{label}</option>
              ))}
            </select>
            <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none">
              {[year - 1, year, year + 1].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none">
              <option value="">Todos os veículos</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Recebimentos</p>
            <p className="mt-4 text-2xl font-semibold text-white">{formatCurrency(financialTotals.receivedTotal)}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Despesas</p>
            <p className="mt-4 text-2xl font-semibold text-white">{formatCurrency(financialTotals.expensesTotal)}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Resultado bruto</p>
            <p className="mt-4 text-2xl font-semibold text-white">{formatCurrency(financialTotals.grossResult)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Pago no período</p>
            <p className="mt-4 text-2xl font-semibold text-white">{formatCurrency(financialTotals.paidTotal)}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Cancelado</p>
            <p className="mt-4 text-2xl font-semibold text-white">{formatCurrency(financialTotals.cancelledTotal)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Clei</p>
            <p className="mt-4 text-2xl font-semibold text-white">{formatCurrency(financialTotals.cleiTotal)}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Edson</p>
            <p className="mt-4 text-2xl font-semibold text-white">{formatCurrency(financialTotals.edsonTotal)}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Fundos</p>
            <p className="mt-4 text-2xl font-semibold text-white">{formatCurrency(financialTotals.fundsTotal)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-black/30">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Frota</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Veículos cadastrados</h3>
          </div>
        </div>

        {overview.vehicles.length === 0 ? (
          <p className="mt-6 rounded-3xl border border-white/10 bg-slate-950/50 p-6 text-sm text-slate-400">
            Nenhum veículo encontrado. Verifique a tabela <strong>vehicles</strong> no Supabase.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {overview.vehicles.map((vehicle) => (
              <div key={vehicle.id} className="rounded-[28px] border border-white/10 bg-slate-950/80 p-5 shadow-sm shadow-black/10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-slate-500">{vehicle.model || 'Modelo não informado'}</p>
                    <h4 className="mt-2 text-xl font-semibold text-white">{vehicle.plate}</h4>
                  </div>
                  <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
                    {getVehicleDisplayStatus(vehicle)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl bg-slate-900/90 px-4 py-4 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Cor</p>
                    <p className="mt-2 text-base text-white">{vehicle.color || 'Não informado'}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-900/90 px-4 py-4 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Quilometragem atual</p>
                    <p className="mt-2 text-base text-white">{vehicle.current_km ? `${Number(vehicle.current_km).toLocaleString('pt-BR')} km` : 'Não informado'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
