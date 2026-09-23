import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import { listDeposits } from '../services/depositsService.js'
import { DEPOSIT_STATUS } from '../lib/constants.js'
import DepositCard from '../components/DepositCard.jsx'
import DepositRefundDialog from '../components/DepositRefundDialog.jsx'
import DepositTermsDialog from '../components/DepositTermsDialog.jsx'
import Toast from '../components/Toast.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'

const STATUS_FILTER_OPTIONS = [
  { value: DEPOSIT_STATUS.A_DEVOLVER, label: 'A devolver' },
  { value: DEPOSIT_STATUS.PENDENTE, label: 'Pendente' },
  { value: DEPOSIT_STATUS.PARCIAL, label: 'Parcial' },
  { value: DEPOSIT_STATUS.QUITADA, label: 'Quitada' },
  { value: DEPOSIT_STATUS.DEVOLVIDA, label: 'Devolvida' },
  { value: '', label: 'Todas' },
]

export default function Deposits() {
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [selectedDeposit, setSelectedDeposit] = useState(null)
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [showTermsDialog, setShowTermsDialog] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(DEPOSIT_STATUS.A_DEVOLVER)

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

  const openRefund = (deposit) => {
    setSelectedDeposit(deposit)
    setShowRefundDialog(true)
  }

  const openTerms = (deposit) => {
    setSelectedDeposit(deposit)
    setShowTermsDialog(true)
  }

  const handleRefunded = async () => {
    setShowRefundDialog(false)
    setSelectedDeposit(null)
    setToast({ message: 'Devolução registrada com sucesso.', type: 'success' })
    await loadData()
  }

  const handleTermsSaved = async () => {
    setShowTermsDialog(false)
    setSelectedDeposit(null)
    setToast({ message: 'Condição combinada salva com sucesso.', type: 'success' })
    await loadData()
  }

  const filteredDeposits = useMemo(() => {
    return deposits.filter((deposit) => {
      const matchesStatus = !statusFilter || deposit.status === statusFilter
      const haystack = [
        deposit.vehicles?.plate,
        deposit.tenants?.full_name,
        deposit.contracts?.contract_number,
      ].join(' ').toLowerCase()
      const matchesSearch = !search || haystack.includes(search.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [deposits, search, statusFilter])

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

      <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-4 shadow-sm shadow-black/20">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Buscar</span>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Placa, locatário ou contrato"
                className="w-full rounded-2xl border border-white/10 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filteredDeposits.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center shadow-lg shadow-black/20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
            <AlertTriangle size={20} />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">Nenhuma caução encontrada</h3>
          <p className="mt-2 text-sm text-slate-400">
            {deposits.length === 0
              ? 'Cauções são criadas automaticamente ao gerar um contrato.'
              : 'Ajuste os filtros pra ver outras cauções.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredDeposits.map((deposit) => (
            <DepositCard
              key={deposit.id}
              deposit={deposit}
              onRefund={() => openRefund(deposit)}
              onEditTerms={() => openTerms(deposit)}
            />
          ))}
        </div>
      )}

      <DepositRefundDialog
        open={showRefundDialog}
        deposit={selectedDeposit}
        onClose={() => {
          setShowRefundDialog(false)
          setSelectedDeposit(null)
        }}
        onConfirm={handleRefunded}
      />

      <DepositTermsDialog
        open={showTermsDialog}
        deposit={selectedDeposit}
        onClose={() => {
          setShowTermsDialog(false)
          setSelectedDeposit(null)
        }}
        onConfirm={handleTermsSaved}
      />
    </div>
  )
}
