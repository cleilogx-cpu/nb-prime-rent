import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { listDeposits } from '../services/depositsService.js'
import DepositCard from '../components/DepositCard.jsx'
import DepositRefundDialog from '../components/DepositRefundDialog.jsx'
import PaymentForm from '../components/PaymentForm.jsx'
import Toast from '../components/Toast.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { RECEIPT_TYPE } from '../lib/constants.js'
import { formatCurrency } from '../lib/format.js'

export default function Deposits() {
  const { user } = useAuth()
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [selectedDeposit, setSelectedDeposit] = useState(null)
  const [showRefundDialog, setShowRefundDialog] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await listDeposits()

    if (error) {
      setToast({ message: error.message || 'Falha ao carregar cauções.', type: 'error' })
    }

    setDeposits(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const openRegisterReceipt = (deposit) => {
    setSelectedDeposit(deposit)
    setShowPaymentForm(true)
  }

  const openRefund = (deposit) => {
    setSelectedDeposit(deposit)
    setShowRefundDialog(true)
  }

  const handleSaved = async () => {
    setShowPaymentForm(false)
    setSelectedDeposit(null)
    setToast({ message: 'Recebimento de caução registrado com sucesso.', type: 'success' })
    await loadData()
  }

  const handleRefunded = async () => {
    setShowRefundDialog(false)
    setSelectedDeposit(null)
    setToast({ message: 'Devolução registrada com sucesso.', type: 'success' })
    await loadData()
  }

  const lockedContext = selectedDeposit
    ? {
        receipt_type: RECEIPT_TYPE.DEPOSIT,
        contract_id: selectedDeposit.contract_id,
        vehicle_id: selectedDeposit.vehicle_id,
        tenant_id: selectedDeposit.tenant_id,
        finance_model: selectedDeposit.contracts?.finance_model || 'partners',
        amount: Math.max(0, Number(selectedDeposit.total_amount || 0) - Number(selectedDeposit.received_amount || 0)),
        notes: `${selectedDeposit.vehicles?.plate || ''} - ${selectedDeposit.tenants?.full_name || ''} (Caução)`,
        vehicleLabel: `${selectedDeposit.vehicles?.plate || ''} — ${selectedDeposit.vehicles?.model || ''}`,
        contractLabel: selectedDeposit.contracts?.contract_number || '',
        tenantLabel: selectedDeposit.tenants?.full_name || '',
        balanceLabel: formatCurrency(Math.max(0, Number(selectedDeposit.total_amount || 0) - Number(selectedDeposit.received_amount || 0))),
      }
    : null

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="space-y-8">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Cauções</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Controle e acompanhamento das garantias</h2>
          <p className="mt-2 text-sm text-slate-400">
            Uma caução é criada automaticamente pra cada contrato. O valor recebido vem dos lançamentos tipo Caução em
            Recebimentos — este módulo não duplica movimentação financeira, só acompanha.
          </p>
        </div>
      </div>

      {deposits.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center shadow-lg shadow-black/20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
            <AlertTriangle size={20} />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">Nenhuma caução ainda</h3>
          <p className="mt-2 text-sm text-slate-400">Cauções são criadas automaticamente ao gerar um contrato.</p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {deposits.map((deposit) => (
            <DepositCard
              key={deposit.id}
              deposit={deposit}
              onRegisterReceipt={() => openRegisterReceipt(deposit)}
              onRefund={() => openRefund(deposit)}
            />
          ))}
        </div>
      )}

      <PaymentForm
        open={showPaymentForm}
        onClose={() => {
          setShowPaymentForm(false)
          setSelectedDeposit(null)
        }}
        locations={[]}
        vehicles={[]}
        deposits={[]}
        lockedContext={lockedContext}
        onSaved={handleSaved}
        userId={user?.id || user?.email}
      />

      <DepositRefundDialog
        open={showRefundDialog}
        deposit={selectedDeposit}
        onClose={() => {
          setShowRefundDialog(false)
          setSelectedDeposit(null)
        }}
        onConfirm={handleRefunded}
      />
    </div>
  )
}
