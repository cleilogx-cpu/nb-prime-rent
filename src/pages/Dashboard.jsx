import { useEffect, useMemo, useState } from 'react'
import { DollarSign, ShieldCheck, Truck, TrendingUp } from 'lucide-react'
import { fetchDashboardData } from '../services/dashboardService.js'
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

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error: fetchError } = await fetchDashboardData()
      if (fetchError) {
        setError(fetchError.message || 'Erro ao carregar dados do Supabase.')
      } else {
        setDashboard(data)
      }
      setLoading(false)
    }

    load()
  }, [])

  const rentedCount = useMemo(() => dashboard?.rentedCount ?? 0, [dashboard])
  const availableCount = useMemo(() => dashboard?.availableCount ?? 0, [dashboard])
  const partnersCount = useMemo(() => dashboard?.partnersCount ?? 0, [dashboard])
  const savingsCount = useMemo(() => dashboard?.savingsCount ?? 0, [dashboard])

  const grossResult = useMemo(() => {
    if (!dashboard) {
      return 0
    }
    return dashboard.paymentsTotal - dashboard.expensesTotal
  }, [dashboard])

  const paidThisMonth = useMemo(() => dashboard?.totalPaidThisMonth ?? 0, [dashboard])
  const cancelledTotal = useMemo(() => dashboard?.totalCancelled ?? 0, [dashboard])
  const cleiTotal = useMemo(() => dashboard?.totalClei ?? 0, [dashboard])
  const edsonTotal = useMemo(() => dashboard?.totalEdson ?? 0, [dashboard])
  const fundsTotal = useMemo(() => dashboard?.totalFunds ?? 0, [dashboard])
  const nextDueCount = useMemo(() => dashboard?.nextDuePayments ?? 0, [dashboard])
  const lateCount = useMemo(() => dashboard?.latePayments ?? 0, [dashboard])

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
      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-black/30">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Dashboard</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Visão geral da locação</h2>
          </div>
          <p className="text-sm text-slate-400">Painel conectado ao Supabase para análise de frota atual.</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Veículos alugados" value={rentedCount} icon={<Truck size={18} />} />
          <InfoCard label="Veículos disponíveis" value={availableCount} icon={<Truck size={18} />} />
          <InfoCard label="Alternância entre sócios" value={partnersCount} icon={<DollarSign size={18} />} />
          <InfoCard label="Fundo do veículo" value={savingsCount} icon={<ShieldCheck size={18} />} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Recebimentos</p>
          <p className="mt-6 text-3xl font-semibold text-white">R$ {dashboard.paymentsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Despesas</p>
          <p className="mt-6 text-3xl font-semibold text-white">R$ {dashboard.expensesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Resultado bruto</p>
          <p className="mt-6 text-3xl font-semibold text-white">R$ {grossResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Pago no mês</p>
          <p className="mt-5 text-3xl font-semibold text-white">R$ {paidThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Cancelado</p>
          <p className="mt-5 text-3xl font-semibold text-white">R$ {cancelledTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Destinado a Clei</p>
          <p className="mt-5 text-3xl font-semibold text-white">R$ {cleiTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Destinado a Edson</p>
          <p className="mt-5 text-3xl font-semibold text-white">R$ {edsonTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Fundos</p>
          <p className="mt-5 text-3xl font-semibold text-white">R$ {fundsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Próximos vencimentos</p>
          <p className="mt-5 text-3xl font-semibold text-white">{nextDueCount}</p>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Pagamentos atrasados</p>
          <p className="mt-5 text-3xl font-semibold text-white">{lateCount}</p>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6 rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-black/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Frota</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Veículos cadastrados</h3>
            </div>
          </div>

          {dashboard.vehicles.length === 0 ? (
            <p className="rounded-3xl border border-white/10 bg-slate-950/50 p-6 text-sm text-slate-400">
              Nenhum veículo encontrado. Verifique a tabela <strong>vehicles</strong> no Supabase.
            </p>
          ) : (
            <div className="space-y-4">
              {dashboard.vehicles.map((vehicle) => (
                <div key={vehicle.id} className="rounded-[28px] border border-white/10 bg-slate-950/80 p-5 shadow-sm shadow-black/10">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.35em] text-slate-500">{vehicle.model || 'Modelo não informado'}</p>
                      <h4 className="mt-2 text-xl font-semibold text-white">{vehicle.plate}</h4>
                    </div>
                    <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
                      {vehicle.status || 'Status desconhecido'}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-900/90 px-4 py-4 text-sm text-slate-300">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Locatário</p>
                      <p className="mt-2 text-base text-white">{vehicle.tenant_name || 'Sem locatário'}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-900/90 px-4 py-4 text-sm text-slate-300">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Cor</p>
                      <p className="mt-2 text-base text-white">{vehicle.color || 'Não informado'}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-900/90 px-4 py-4 text-sm text-slate-300">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Aluguel semanal</p>
                      <p className="mt-2 text-base text-white">{vehicle.weekly_rent ? `R$ ${Number(vehicle.weekly_rent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-900/90 px-4 py-4 text-sm text-slate-300">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Próximo pagamento</p>
                      <p className="mt-2 text-base text-white">{vehicle.next_payment || 'Não definido'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Resumo rápido</p>
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-5">
              <p className="text-sm text-slate-400">Veículos exibidos</p>
              <p className="mt-3 text-3xl font-semibold text-white">{dashboard.vehicles.length}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-5">
              <p className="text-sm text-slate-400">Total de registros de pagamento</p>
              <p className="mt-3 text-3xl font-semibold text-white">{dashboard.paymentsTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-5">
              <p className="text-sm text-slate-400">Total de despesas</p>
              <p className="mt-3 text-3xl font-semibold text-white">{dashboard.expensesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
