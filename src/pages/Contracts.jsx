import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, FileText, PlusCircle } from 'lucide-react'
import ContractCard from '../components/ContractCard.jsx'
import ContractDetailsDrawer from '../components/ContractDetailsDrawer.jsx'
import ContractFilters from '../components/ContractFilters.jsx'
import ContractForm from '../components/ContractForm.jsx'
import ContractWizard from '../components/ContractWizard.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'
import { cancelContract, getContractCounts, listContractsPage, reactivateContract, updateContract } from '../services/contractsService.js'
import { PAGE_SIZE, totalPages } from '../lib/chargeDue.js'
import { useDebouncedValue } from '../hooks/useDebouncedValue.js'
import LoadingScreen from '../components/LoadingScreen.jsx'

// Indicador do topo: mostra o número real e, ao clicar, filtra a lista abaixo.
function SummaryCard({ label, value, icon, onClick }) {
  const card = (
    <div className={`rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/20 ${onClick ? 'transition hover:border-amber-300/30' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm uppercase tracking-[0.35em] text-slate-500">{label}</p>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
          {icon}
        </div>
      </div>
      <p className="mt-5 text-3xl font-semibold text-white">{value}</p>
    </div>
  )

  return onClick ? (
    <button type="button" onClick={onClick} className="block w-full text-left" aria-label={`${label}: ${value}. Filtrar a lista`}>
      {card}
    </button>
  ) : (
    card
  )
}

export default function Contracts() {
  const [contracts, setContracts] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [matchCount, setMatchCount] = useState(0)
  const [counts, setCounts] = useState({ drafts: 0, active: 0, total: 0 })
  const debouncedSearch = useDebouncedValue(search, 300)
  const [formOpen, setFormOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [resumeContract, setResumeContract] = useState(null)
  const [editingContract, setEditingContract] = useState(null)
  const [creating, setCreating] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  // Lista: 30 por página, mais recentes primeiro; busca e status consultam
  // TODO o histórico no banco.
  const loadContracts = async () => {
    setError(null)

    const { data, count, error: fetchError } = await listContractsPage({ search: debouncedSearch, status: statusFilter, page })

    if (fetchError) {
      setError(fetchError.message || 'Erro ao carregar contratos do Supabase.')
      setContracts([])
      setMatchCount(0)
    } else {
      setContracts(data ?? [])
      setMatchCount(count)
    }

    setInitialLoading(false)
  }

  // Indicadores do topo: números reais, independentes de busca/filtro/página.
  const loadCounts = async () => {
    const { data } = await getContractCounts()
    setCounts(data)
  }

  // Depois de criar/assinar/cancelar/reativar/editar: atualiza lista e totais.
  const refreshAll = async () => {
    await Promise.all([loadContracts(), loadCounts()])
  }

  useEffect(() => {
    loadContracts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, page])

  useEffect(() => {
    let cancelled = false
    getContractCounts().then(({ data }) => {
      if (!cancelled) {
        setCounts(data)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Mudou busca ou status: volta pra primeira página.
  const handleSearchChange = (value) => {
    setSearch(value)
    setPage(1)
  }

  const handleStatusChange = (value) => {
    setStatusFilter(value)
    setPage(1)
  }

  const pageCount = totalPages(matchCount)

  // ContractForm agora só existe pro modo Editar (Fase 2 do Contrato
  // Inteligente) -- criar contrato novo passou a ser feito pelo
  // ContractWizard, que já cria o contrato ele mesmo (precisa do id antes
  // do fim do fluxo, pra anexar os documentos do dossiê).
  const handleUpdate = async (payload) => {
    if (!editingContract) {
      return
    }

    setCreating(true)

    const { data, error: submitError } = await updateContract(editingContract.id, payload)

    if (submitError) {
      setToast({ message: submitError.message || 'Não foi possível salvar o contrato.', type: 'error' })
    } else {
      setToast({ message: 'Contrato atualizado.', type: 'success' })
      setFormOpen(false)
      setEditingContract(null)
      await refreshAll()
      setSelectedContract(data)
      setDetailsOpen(true)
    }

    setCreating(false)
  }

  // Desde a Fase 5, o wizard já assina e ativa o contrato antes de chamar
  // onCompleted (etapa "Assinatura" com captura de assinatura de verdade)
  // -- não fica mais em Rascunho esperando um passo separado. Desde a
  // Fase 6, a tela de conclusão do próprio wizard decide se abre o drawer
  // de detalhes (botão "Ver dossiê") ou só volta pra lista (botão "Voltar
  // aos contratos") -- daí o `openDetails`.
  const handleWizardCompleted = async (contract, { openDetails = true } = {}) => {
    setWizardOpen(false)
    setResumeContract(null)
    setToast({ message: 'Contrato assinado e ativo! A locação foi criada e o veículo está marcado como Alugado.', type: 'success' })
    await refreshAll()
    if (openDetails) {
      setSelectedContract(contract)
      setDetailsOpen(true)
    }
  }

  const handleCloseWizard = () => {
    setWizardOpen(false)
    setResumeContract(null)
  }

  const handleOpenDetails = (contract) => {
    setSelectedContract(contract)
    setDetailsOpen(true)
  }

  const handleOpenEdit = (contract) => {
    setEditingContract(contract)
    setDetailsOpen(false)
    setFormOpen(true)
  }

  const handleReactivate = async (contract) => {
    setReactivating(true)

    const { data, error: reactivateError } = await reactivateContract(contract.id)

    if (reactivateError) {
      setToast({ message: reactivateError.message || 'Não foi possível reativar o contrato.', type: 'error' })
    } else {
      setToast({ message: 'Contrato reativado como Rascunho.', type: 'success' })
      setSelectedContract(data)
      await refreshAll()
    }

    setReactivating(false)
  }

  // Abre o mesmo ContractWizard, só que pulando direto pra etapa de
  // assinatura, pra um contrato Rascunho que já existe (seção 3/4 do
  // pedido) -- antes disso a única opção aqui era "marcar como assinado"
  // sem coletar assinatura nenhuma, o que não deixava nenhuma evidência
  // registrada.
  const handleOpenSign = (contract) => {
    setDetailsOpen(false)
    setResumeContract(contract)
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
      await refreshAll()
    }

    setConfirmCancelOpen(false)
  }

  if (initialLoading) {
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
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/25"
          >
            <PlusCircle size={18} />
            Novo contrato
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard label="Rascunhos (aguardando assinatura)" value={counts.drafts} icon={<FileText size={18} />} onClick={() => handleStatusChange('Rascunho')} />
          <SummaryCard label="Ativos" value={counts.active} icon={<FileText size={18} />} onClick={() => handleStatusChange('Ativo')} />
          <SummaryCard label="Total" value={counts.total} icon={<FileText size={18} />} onClick={() => { handleStatusChange(''); setSearch('') }} />
        </div>
      </div>

      <div className="space-y-6">
        <ContractFilters search={search} setSearch={handleSearchChange} statusFilter={statusFilter} setStatusFilter={handleStatusChange} />

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
            <h3 className="mt-4 text-xl font-semibold text-white">{search || statusFilter ? 'Nenhum contrato encontrado' : 'Nenhum contrato ainda'}</h3>
            <p className="mt-2 text-sm text-slate-400">
              {search || statusFilter
                ? 'Ajuste a busca ou o filtro de status.'
                : 'Clique em "Novo contrato" pra começar — escolha o veículo e preencha os dados do locatário.'}
            </p>
          </div>
        ) : null}

        {!error && contracts.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {contracts.map((contract) => (
              <ContractCard key={contract.id} contract={contract} onOpenDetails={handleOpenDetails} />
            ))}
          </div>
        ) : null}

        {!error && matchCount > PAGE_SIZE ? (
          <nav aria-label="Paginação de contratos" className="flex flex-col items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-slate-950/70 p-4 sm:flex-row">
            <p className="text-sm text-slate-400">
              Página {page} de {pageCount} · {matchCount} contratos
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex min-h-11 items-center gap-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-200 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                className="inline-flex min-h-11 items-center gap-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-2 text-sm text-slate-200 disabled:opacity-40"
              >
                Próxima
                <ChevronRight size={16} />
              </button>
            </div>
          </nav>
        ) : null}
      </div>

      <ContractForm
        open={formOpen}
        contract={editingContract}
        onClose={() => {
          setFormOpen(false)
          setEditingContract(null)
        }}
        onSubmit={handleUpdate}
        loading={creating}
      />

      <ContractWizard
        open={wizardOpen || !!resumeContract}
        resumeContract={resumeContract}
        onClose={handleCloseWizard}
        onCompleted={handleWizardCompleted}
      />

      <ContractDetailsDrawer
        open={detailsOpen}
        contract={selectedContract}
        onClose={() => {
          setDetailsOpen(false)
          setSelectedContract(null)
        }}
        onOpenSign={handleOpenSign}
        onCancel={requestCancel}
        onEdit={handleOpenEdit}
        onReactivate={handleReactivate}
        reactivating={reactivating}
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
