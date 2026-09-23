import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, PlusCircle, Search, Wallet2 } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import PaymentCard from '../components/PaymentCard.jsx'
import PaymentDetailsDrawer from '../components/PaymentDetailsDrawer.jsx'
import PaymentFilters, { PERIOD_MODE } from '../components/PaymentFilters.jsx'
import PaymentForm from '../components/PaymentForm.jsx'
import CancelPaymentDialog from '../components/CancelPaymentDialog.jsx'
import Toast from '../components/Toast.jsx'
import { cancelPayment, listPayments } from '../services/paymentsService.js'
import { listActiveLocations } from '../services/locationsService.js'
import { listDeposits } from '../services/depositsService.js'
import { listContracts } from '../services/contractsService.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { computePaymentTotals, monthRange, yearRange } from '../lib/paymentAggregation.js'

const now = new Date()

/**
 * Barras horizontais simples (sem lib de chart, seção 18 do pedido) --
 * agrega os recebimentos já filtrados por veículo, respondendo aos mesmos
 * filtros da tela (mesma fonte de dado do Total Recebido, sem estrutura
 * financeira paralela).
 */
function PaymentsByVehicleChart({ payments, vehicles }) {
  const totals = useMemo(() => {
    const byVehicle = new Map()
    payments
      .filter((payment) => !payment.is_cancelled)
      .forEach((payment) => {
        const current = byVehicle.get(payment.vehicle_id) || 0
        byVehicle.set(payment.vehicle_id, current + Number(payment.amount ?? 0))
      })

    return Array.from(byVehicle.entries())
      .map(([vehicleId, total]) => ({
        vehicleId,
        total,
        plate: vehicles.find((vehicle) => vehicle.id === vehicleId)?.plate || 'Sem placa',
      }))
      .sort((a, b) => b.total - a.total)
  }, [payments, vehicles])

  const maxTotal = Math.max(1, ...totals.map((item) => item.total))

  if (totals.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum recebimento no período pra montar o gráfico.</p>
  }

  return (
    <div className="space-y-3">
      {totals.map((item) => (
        <div key={item.vehicleId} className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{item.plate}</span>
            <span>R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-amber-300/70"
              style={{ width: `${(item.total / maxTotal) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Payments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [locations, setLocations] = useState([])
  const [deposits, setDeposits] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [periodMode, setPeriodMode] = useState(PERIOD_MODE.MONTH)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [customStart, setCustomStart] = useState(monthRange(now.getFullYear(), now.getMonth() + 1).periodStart)
  const [customEnd, setCustomEnd] = useState(monthRange(now.getFullYear(), now.getMonth() + 1).periodEnd)
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [financeFilter, setFinanceFilter] = useState('')
  const [destinationFilter, setDestinationFilter] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [contractFilter, setContractFilter] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const loadData = async () => {
    setLoading(true)
    const [{ data: paymentsData, error: paymentsError }, { data: locationsData }, { data: depositsData }, { data: vehiclesData }, { data: contractsData }] = await Promise.all([
      listPayments(),
      listActiveLocations(),
      listDeposits(),
      supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
      listContracts(),
    ])

    if (paymentsError) {
      setToast({ message: paymentsError.message || 'Falha ao carregar recebimentos.', type: 'error' })
    }

    setPayments(paymentsData ?? [])
    setLocations(locationsData ?? [])
    setDeposits(depositsData ?? [])
    setVehicles(vehiclesData ?? [])
    setContracts(contractsData ?? [])
    setLoading(false)
  }

 useEffect(() => {
  loadData()
}, [])

  const { periodStart, periodEnd } = useMemo(() => {
    if (periodMode === PERIOD_MODE.YEAR) {
      return yearRange(year)
    }
    if (periodMode === PERIOD_MODE.CUSTOM) {
      return { periodStart: customStart, periodEnd: customEnd }
    }
    return monthRange(year, month)
  }, [periodMode, year, month, customStart, customEnd])

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const metadata = typeof payment.notes === 'string' ? (() => {
        try {
          return JSON.parse(payment.notes)
        } catch (error) {
          return {}
        }
      })() : {}
      const searchText = `${payment.vehicle_id || ''} ${payment.notes || ''} ${metadata.locationTenant || ''}`.toLowerCase()
      const matchesSearch = !search || searchText.includes(search.toLowerCase())
      const matchesStatus = !statusFilter || payment.status === statusFilter
      const matchesMethod = !paymentMethod || payment.payment_method === paymentMethod
      const matchesFinance = !financeFilter || metadata.financeModel === financeFilter
      const matchesDestination = !destinationFilter || payment.destination === destinationFilter
      const matchesVehicle = !vehicleFilter || payment.vehicle_id === vehicleFilter
      const matchesContract = !contractFilter || payment.contract_id === contractFilter
      const paymentDate = payment.payment_date || ''
      const matchesPeriod = paymentDate >= periodStart && paymentDate <= periodEnd
      return matchesSearch && matchesStatus && matchesMethod && matchesFinance && matchesDestination && matchesVehicle && matchesContract && matchesPeriod
    })
  }, [payments, search, periodStart, periodEnd, statusFilter, paymentMethod, financeFilter, destinationFilter, vehicleFilter, contractFilter])

  const totals = useMemo(
    () => computePaymentTotals({ payments, periodStart, periodEnd }),
    [payments, periodStart, periodEnd],
  )

  const resetToCurrentMonth = () => {
    setPeriodMode(PERIOD_MODE.MONTH)
    setMonth(now.getMonth() + 1)
    setYear(now.getFullYear())
  }

  const openCreate = () => {
    setSelectedPayment(null)
    setShowForm(true)
  }

  const handleSave = async () => {
    await loadData()
  }

  const openDetails = (payment) => {
    setSelectedPayment(payment)
    setShowDetails(true)
  }

  const requestCancel = (payment) => {
    setSelectedPayment(payment)
    setShowCancelDialog(true)
  }

  const handleCancel = async (reason) => {
    if (!selectedPayment) {
      return
    }

    const { error } = await cancelPayment(selectedPayment.id, { cancellation_reason: reason, cancelled_by: user?.id || null })
    if (error) {
      setToast({ message: error.message || 'Não foi possível cancelar o recebimento.', type: 'error' })
    } else {
      setToast({ message: 'Recebimento cancelado com sucesso.', type: 'success' })
      await loadData()
    }

    setShowCancelDialog(false)
    setSelectedPayment(null)
  }

  const { paidTotal, cancelledTotal } = totals

  return (
    <div className="space-y-8">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <section className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Recebimentos</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Registre e acompanhe os valores recebidos das locações.</h2>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/25">
            <PlusCircle size={18} />
            Novo recebimento
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-amber-300/20 bg-amber-300/5 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Total recebido</p>
            <p className="mt-5 text-3xl font-semibold text-white">R$ {paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Total cancelado</p>
            <p className="mt-5 text-3xl font-semibold text-white">R$ {cancelledTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Recebimentos por veículo</p>
        <div className="mt-5">
          <PaymentsByVehicleChart payments={filteredPayments} vehicles={vehicles} />
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
        <PaymentFilters
          search={search} setSearch={setSearch}
          periodMode={periodMode} setPeriodMode={setPeriodMode}
          month={month} setMonth={setMonth}
          year={year} setYear={setYear}
          customStart={customStart} setCustomStart={setCustomStart}
          customEnd={customEnd} setCustomEnd={setCustomEnd}
          onResetToCurrentMonth={resetToCurrentMonth}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
          financeFilter={financeFilter} setFinanceFilter={setFinanceFilter}
          destinationFilter={destinationFilter} setDestinationFilter={setDestinationFilter}
          vehicleFilter={vehicleFilter} setVehicleFilter={setVehicleFilter}
          vehicles={vehicles}
          contractFilter={contractFilter} setContractFilter={setContractFilter}
          contracts={contracts}
        />

        <button
          type="button"
          onClick={() => setHasSearched(true)}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/25"
        >
          <Search size={16} />
          Consultar recebimentos
        </button>
      </section>

      {loading ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center text-slate-400">Carregando recebimentos…</div>
      ) : null}

      {!loading && hasSearched && filteredPayments.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center shadow-lg shadow-black/20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
            <AlertTriangle size={20} />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">Nenhum recebimento encontrado</h3>
          <p className="mt-2 text-sm text-slate-400">Ajuste os filtros ou crie um novo recebimento.</p>
        </div>
      ) : null}

      {!loading && hasSearched && filteredPayments.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredPayments.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} onView={openDetails} onCancel={requestCancel} />
          ))}
        </div>
      ) : null}

      <PaymentForm open={showForm} onClose={() => setShowForm(false)} locations={locations} vehicles={vehicles} deposits={deposits} onSaved={handleSave} userId={user?.id || user?.email} />
      <PaymentDetailsDrawer open={showDetails} payment={selectedPayment} onClose={() => setShowDetails(false)} />
      <CancelPaymentDialog open={showCancelDialog} payment={selectedPayment} onCancel={() => { setShowCancelDialog(false); setSelectedPayment(null) }} onConfirm={handleCancel} />
    </div>
  )
}

