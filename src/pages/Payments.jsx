import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, PlusCircle, Search, Wallet2 } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import PaymentCard from '../components/PaymentCard.jsx'
import PaymentDetailsDrawer from '../components/PaymentDetailsDrawer.jsx'
import PaymentFilters from '../components/PaymentFilters.jsx'
import PaymentForm from '../components/PaymentForm.jsx'
import CancelPaymentDialog from '../components/CancelPaymentDialog.jsx'
import Toast from '../components/Toast.jsx'
import { cancelPayment, listPayments } from '../services/paymentsService.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabaseClient.js'

export default function Payments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [locations, setLocations] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [financeFilter, setFinanceFilter] = useState('')
  const [destinationFilter, setDestinationFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const loadData = async () => {
    setLoading(true)
    const [{ data: paymentsData, error: paymentsError }, { data: locationsData }, { data: vehiclesData }] = await Promise.all([
      listPayments(),
      supabase.from('locations').select('*').order('created_at', { ascending: false }),
      supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
    ])

    if (paymentsError) {
      setToast({ message: paymentsError.message || 'Falha ao carregar recebimentos.', type: 'error' })
    }

    setPayments(paymentsData ?? [])
    setLocations(locationsData ?? [])
    setVehicles(vehiclesData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

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
      const paymentDate = payment.payment_date || ''
      const matchesPeriod = !period || paymentDate === period
      return matchesSearch && matchesStatus && matchesMethod && matchesFinance && matchesDestination && matchesPeriod
    })
  }, [payments, search, period, statusFilter, paymentMethod, financeFilter, destinationFilter])

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

    const { error } = await cancelPayment(selectedPayment.id, { cancellation_reason: reason, cancelled_by: user?.email || 'system' })
    if (error) {
      setToast({ message: error.message || 'Não foi possível cancelar o recebimento.', type: 'error' })
    } else {
      setToast({ message: 'Recebimento cancelado com sucesso.', type: 'success' })
      await loadData()
    }

    setShowCancelDialog(false)
    setSelectedPayment(null)
  }

  const paidTotal = payments.filter((payment) => payment.status === 'Pago').reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0)
  const cancelledTotal = payments.filter((payment) => payment.status === 'Cancelado').reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0)

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

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Total pago no mês</p>
            <p className="mt-5 text-3xl font-semibold text-white">R$ {paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Total cancelado</p>
            <p className="mt-5 text-3xl font-semibold text-white">R$ {cancelledTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Clei</p>
            <p className="mt-5 text-3xl font-semibold text-white">R$ 0,00</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Fundos</p>
            <p className="mt-5 text-3xl font-semibold text-white">R$ 0,00</p>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
        <PaymentFilters search={search} setSearch={setSearch} period={period} setPeriod={setPeriod} statusFilter={statusFilter} setStatusFilter={setStatusFilter} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} financeFilter={financeFilter} setFinanceFilter={setFinanceFilter} destinationFilter={destinationFilter} setDestinationFilter={setDestinationFilter} />
      </section>

      {loading ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center text-slate-400">Carregando recebimentos…</div>
      ) : null}

      {!loading && filteredPayments.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center shadow-lg shadow-black/20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
            <AlertTriangle size={20} />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">Nenhum recebimento encontrado</h3>
          <p className="mt-2 text-sm text-slate-400">Crie um novo recebimento para começar a acompanhar os contratos financeiros.</p>
        </div>
      ) : null}

      {!loading && filteredPayments.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredPayments.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} onView={openDetails} onCancel={requestCancel} />
          ))}
        </div>
      ) : null}

      <PaymentForm open={showForm} onClose={() => setShowForm(false)} locations={locations} vehicles={vehicles} onSaved={handleSave} userId={user?.id || user?.email} />
      <PaymentDetailsDrawer open={showDetails} payment={selectedPayment} onClose={() => setShowDetails(false)} />
      <CancelPaymentDialog open={showCancelDialog} payment={selectedPayment} onCancel={() => { setShowCancelDialog(false); setSelectedPayment(null) }} onConfirm={handleCancel} />
    </div>
  )
}
