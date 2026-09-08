import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, FileText, PlusCircle } from 'lucide-react'
import ContractCard from '../components/ContractCard.jsx'
import ContractDetailsDrawer from '../components/ContractDetailsDrawer.jsx'
import ContractFilters from '../components/ContractFilters.jsx'
import ContractForm from '../components/ContractForm.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'
import { cancelContract, createContract, listContracts, signContract } from '../services/contractsService.js'
import LoadingScreen from '../components/LoadingScreen.jsx'

function SummaryCard({ label, value, icon }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm uppercase tracking-[0.35em] text-slate-500">{label}</p>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
          {icon}
        </div>
      </div>
      <p className="mt-5 text-3xl font-semibold text-white">{value}</p>
    </div>
  )
}

export default function Contracts() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [signing, setSigning] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const loadContracts = async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await listContracts({ search, status: statusFilter })

    if (fetchError) {
      setError(fetchError.message || 'Erro ao carregar contratos do Supabase.')
      setContracts([])
    } else {
      setContracts(data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadContracts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter])

  const handleCreate = async (payload) => {
    setCreating(true)

    const { data, error: createError } = await createContract(payload)

    if (createError) {
      setToast({ message: createError.message || 'Não foi possível criar o contrato.', type: 'error' })
    } else {
      setToast({ message: 'Contrato criado como Rascunho. Gere o documento e envie para assinatura.', type: 'success' })
      setFormOpen(false)
      await loadContracts()
      setSelectedContract(data)
      setDetailsOpen(true)
    }

    setCreating(false)
  }

  const handleOpenDetails = (contract) => {
    setSelectedContract(contract)
    setDetailsOpen(true)
  }

  const handleSign = async (contract) => {
    setSigning(true)

    const { data, error: signError } = await signContract(contract.id)

    if (signError) {
      setToast({ message: signError.message || 'Não foi possível marcar o contrato como assinado.', type: 'error' })
    } else {
      setToast({ message: 'Contrato ativo! A locação foi criada e o veículo está marcado como Alugado.', type: 'success' })
      setSelectedContract(data)
      await loadContracts()
    }

    setSigning(false)
  }

  const requestCancel = () => {
    setConfirmCancelOpen(true)
  }

  const handleConfirmCancel = async () => {
    if (!selectedContract) return

    const { error: cancelError } = await cancelContract(selectedContract.id)

    if (cancelError) {
      setToast({ message: cancelError.message || 'Não foi possível cancelar o contrato.', type: 'error' })
    } else {
      setToast({ message: 'Contrato cancelado.', type: 'success' })
      setDetailsOpen(false)
      setSelectedContract(null)
      await loadContracts()
    }

    setConfirmCancelOpen(false)
  }

  const draftCount = useMemo(() => contracts.filter((c) => c.status === 'Rascunho').length, [contracts])
  const activeCount = useMemo(() => contracts.filter((c) => c.status === 'Ativo').length, [contracts])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="space-y-8">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Contratos</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Tudo começa por aqui</h2>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/25"
          >
            <PlusCircle size={18} />
            Novo contrato
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard label="Rascunhos (aguardando assinatura)" value={draftCount} icon={<FileText size={18} />} />
          <SummaryCard label="Ativos" value={activeCount} icon={<FileText size={18} />} />
          <SummaryCard label="Total" value={contracts.length} icon={<FileText size={18} />} />
        </div>
      </div>

      <div className="space-y-6">
        <ContractFilters search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />

        {error ? (
          <div className="rounded-[28px] border border-rose-500/30 bg-rose-500/10 p-6 text-slate-100">
            <p className="text-lg font-semibold text-rose-100">Falha ao carregar os contratos</p>
            <p className="mt-3 text-sm text-rose-200">{error}</p>
          </div>
        ) : null}

        {!error && contracts.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center shadow-lg shadow-black/20">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
              <AlertTriangle size={20} />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Nenhum contrato ainda</h3>
            <p className="mt-2 text-sm text-slate-400">Clique em "Novo contrato" pra começar — escolha o veículo e preencha os dados do locatário.</p>
          </div>
        ) : null}

        {!error && contracts.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {contracts.map((contract) => (
              <ContractCard key={contract.id} contract={contract} onOpenDetails={handleOpenDetails} />
            ))}
          </div>
        ) : null}
      </div>

      <ContractForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        loading={creating}
      />

      <ContractDetailsDrawer
        open={detailsOpen}
        contract={selectedContract}
        onClose={() => {
          setDetailsOpen(false)
          setSelectedContract(null)
        }}
        onSign={handleSign}
        onCancel={requestCancel}
        signing={signing}
      />

      <ConfirmDialog
        open={confirmCancelOpen}
        title="Cancelar contrato"
        message="Tem certeza que deseja cancelar este contrato? Ele continua no histórico como Cancelado."
        onCancel={() => setConfirmCancelOpen(false)}
        onConfirm={handleConfirmCancel}
      />
    </div>
  )
}
