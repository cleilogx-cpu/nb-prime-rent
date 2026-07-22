import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, FileText, PlusCircle, Search, ShieldCheck } from 'lucide-react'
import ContractCard from '../components/ContractCard.jsx'
import ContractDetailsDrawer from '../components/ContractDetailsDrawer.jsx'
import ContractFilters from '../components/ContractFilters.jsx'
import ContractForm from '../components/ContractForm.jsx'
import ContractPreview from '../components/ContractPreview.jsx'
import EndContractDialog from '../components/EndContractDialog.jsx'
import RenewContractDialog from '../components/RenewContractDialog.jsx'
import Toast from '../components/Toast.jsx'
import { cancelContract, endContract, listContracts, renewContract } from '../services/contractsService.js'
import { listLocations } from '../services/locationsService.js'

export default function Contracts() {
  const navigate = useNavigate()
  const locationState = useLocation()
  const prefilledLocation = locationState.state?.fromLocation || null

  const [contracts, setContracts] = useState([])
  const [locations, setLocations] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [period, setPeriod] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')
  const [formOpen, setFormOpen] = useState(Boolean(prefilledLocation))
  const [selectedContract, setSelectedContract] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [previewContract, setPreviewContract] = useState(null)
  const [renewOpen, setRenewOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    const [contractsData, locationsData] = await Promise.all([listContracts(), listLocations()])
    setContracts(contractsData)
    setLocations(locationsData)
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (prefilledLocation) {
      setFormOpen(true)
    }
  }, [prefilledLocation])

  const vehicles = useMemo(() => {
    return Array.from(
      new Map(
        locations
          .map((location) => ({
            id: location.vehicle_id,
            plate: location.vehicle_plate || location.vehicle_model || 'Veículo',
          }))
          .filter((vehicle) => vehicle.id)
          .map((vehicle) => [vehicle.id, vehicle]),
      ).values(),
    )
  }, [locations])

  const tenants = useMemo(() => {
    return Array.from(new Set(locations.map((location) => location.tenant_name).filter(Boolean))).sort()
  }, [locations])

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return contracts.filter((contract) => {
      const matchesSearch = !query || [contract.contract_number, contract.tenant_name, contract.vehicle_plate, contract.vehicle_model].join(' ').toLowerCase().includes(query)
      const matchesStatus = !statusFilter || contract.status === statusFilter
      const matchesPeriod = !period || ((contract.start_date || '') <= period && (!contract.end_date || (contract.end_date || '') >= period))
      const matchesVehicle = !vehicleFilter || contract.vehicle_id === vehicleFilter || contract.location_id === vehicleFilter
      const matchesTenant = !tenantFilter || contract.tenant_name === tenantFilter

      return matchesSearch && matchesStatus && matchesPeriod && matchesVehicle && matchesTenant
    })
  }, [contracts, period, search, statusFilter, tenantFilter, vehicleFilter])

  const activeCount = contracts.filter((contract) => contract.status === 'Ativo').length
  const overdueCount = contracts.filter((contract) => contract.status === 'Vencido').length
  const draftCount = contracts.filter((contract) => contract.status === 'Rascunho').length

  const openCreate = () => {
    setSelectedContract(null)
    setFormOpen(true)
    navigate('/contracts', { replace: true, state: null })
  }

  const handleSaved = async () => {
    setToast({ message: 'Contrato salvo com sucesso.', type: 'success' })
    await loadData()
  }

  const handleView = (contract) => {
    setSelectedContract(contract)
    setDetailsOpen(true)
  }

  const handlePreview = (contract) => {
    setPreviewContract(contract)
  }

  const handleRenew = (contract) => {
    setSelectedContract(contract)
    setRenewOpen(true)
  }

  const confirmRenew = async (payload) => {
    if (!selectedContract) {
      return
    }

    setSubmitting(true)
    const { error } = await renewContract(selectedContract.id, payload)
    setSubmitting(false)

    if (error) {
      setToast({ message: error.message || 'Não foi possível renovar o contrato.', type: 'error' })
      return
    }

    setToast({ message: 'Contrato renovado com sucesso.', type: 'success' })
    setRenewOpen(false)
    setSelectedContract(null)
    await loadData()
  }

  const handleEnd = (contract) => {
    setSelectedContract(contract)
    setEndOpen(true)
  }

  const confirmEnd = async ({ end_date, observations }) => {
    if (!selectedContract) {
      return
    }

    setSubmitting(true)
    const { error } = await endContract(selectedContract.id, { end_date, observations })
    setSubmitting(false)

    if (error) {
      setToast({ message: error.message || 'Não foi possível encerrar o contrato.', type: 'error' })
      return
    }

    setToast({ message: 'Contrato encerrado com sucesso.', type: 'success' })
    setEndOpen(false)
    setSelectedContract(null)
    await loadData()
  }

  const handleCancel = async (contract) => {
    setSubmitting(true)
    const { error } = await cancelContract(contract.id)
    setSubmitting(false)

    if (error) {
      setToast({ message: error.message || 'Não foi possível cancelar o contrato.', type: 'error' })
      return
    }

    setToast({ message: 'Contrato cancelado com sucesso.', type: 'success' })
    await loadData()
  }

  return (
    <div className="space-y-8">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <section className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Contratos</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Estruture, renove e acompanhe contratos com base nas locações.</h2>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/25">
            <PlusCircle size={18} />
            Novo contrato
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Ativos</p>
              <FileText size={18} className="text-amber-300" />
            </div>
            <p className="mt-5 text-3xl font-semibold text-white">{activeCount}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Vencidos</p>
              <ShieldCheck size={18} className="text-amber-300" />
            </div>
            <p className="mt-5 text-3xl font-semibold text-white">{overdueCount}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Rascunhos</p>
              <FileText size={18} className="text-amber-300" />
            </div>
            <p className="mt-5 text-3xl font-semibold text-white">{draftCount}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
        <ContractFilters
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          period={period}
          setPeriod={setPeriod}
          vehicleFilter={vehicleFilter}
          setVehicleFilter={setVehicleFilter}
          tenantFilter={tenantFilter}
          setTenantFilter={setTenantFilter}
          vehicles={vehicles}
          tenants={tenants}
        />
      </section>

      {previewContract ? <ContractPreview contract={previewContract} onPrint={() => window.print()} /> : null}

      {filteredContracts.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center shadow-lg shadow-black/20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
            <AlertTriangle size={20} />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">Nenhum contrato encontrado</h3>
          <p className="mt-2 text-sm text-slate-400">Ajuste os filtros ou crie um novo contrato a partir de uma locação.</p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredContracts.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onView={handleView}
              onRenew={handleRenew}
              onEnd={handleEnd}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}

      <ContractForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setSelectedContract(null)
          if (prefilledLocation) {
            navigate('/contracts', { replace: true, state: null })
          }
        }}
        location={prefilledLocation}
        contract={selectedContract}
        onSaved={handleSaved}
        locations={locations}
      />

      <ContractDetailsDrawer
        open={detailsOpen}
        contract={selectedContract}
        onClose={() => {
          setDetailsOpen(false)
          setSelectedContract(null)
        }}
        onPreview={handlePreview}
      />

      <RenewContractDialog
        open={renewOpen}
        contract={selectedContract}
        onClose={() => {
          setRenewOpen(false)
          setSelectedContract(null)
        }}
        onConfirm={confirmRenew}
      />

      <EndContractDialog
        open={endOpen}
        onClose={() => {
          setEndOpen(false)
          setSelectedContract(null)
        }}
        onConfirm={confirmEnd}
      />
    </div>
  )
}
