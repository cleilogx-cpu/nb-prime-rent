import { useEffect, useState } from 'react'
import { PlusCircle, CarFront, AlertTriangle } from 'lucide-react'
import VehicleCard from '../components/VehicleCard.jsx'
import VehicleFilters from '../components/VehicleFilters.jsx'
import VehicleForm from '../components/VehicleForm.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'
import { createVehicle, deleteVehicle, listVehicles, updateVehicle } from '../services/vehiclesService.js'
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

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [financeFilter, setFinanceFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const loadVehicles = async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await listVehicles({
      search,
      status: statusFilter,
      financeModel: financeFilter,
    })

    if (fetchError) {
      setError(fetchError.message || 'Erro ao carregar veículos do Supabase.')
      setVehicles([])
    } else {
      setVehicles(data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadVehicles()
  }, [search, statusFilter, financeFilter])

  const handleOpenCreate = () => {
    setEditingVehicle(null)
    setFormOpen(true)
  }

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle)
    setFormOpen(true)
  }

  const handleSubmit = async (payload) => {
    setSubmitting(true)

    const action = editingVehicle ? updateVehicle(editingVehicle.id, payload) : createVehicle(payload)
    const { error: submitError } = await action

    if (submitError) {
      setToast({ message: submitError.message || 'Não foi possível salvar o veículo.', type: 'error' })
    } else {
      setToast({ message: editingVehicle ? 'Veículo atualizado com sucesso.' : 'Veículo criado com sucesso.', type: 'success' })
      setFormOpen(false)
      setEditingVehicle(null)
      await loadVehicles()
    }

    setSubmitting(false)
  }

  const requestDelete = (vehicle) => {
    setSelectedVehicle(vehicle)
    setConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedVehicle) {
      return
    }

    const { error: deleteError } = await deleteVehicle(selectedVehicle.id)

    if (deleteError) {
      setToast({ message: deleteError.message || 'Não foi possível excluir o veículo.', type: 'error' })
    } else {
      setToast({ message: 'Veículo excluído com sucesso.', type: 'success' })
      await loadVehicles()
    }

    setConfirmOpen(false)
    setSelectedVehicle(null)
  }

  const rentedCount = vehicles.filter((vehicle) => {
    const status = String(vehicle.status ?? '').toLowerCase()
    return status && status !== 'disponível' && status !== 'available'
  }).length

  const availableCount = vehicles.filter((vehicle) => {
    const status = String(vehicle.status ?? '').toLowerCase()
    return status === 'disponível' || status === 'available'
  }).length

  const partnersCount = vehicles.filter((vehicle) => vehicle.finance_model === 'partners').length
  const savingsCount = vehicles.filter((vehicle) => vehicle.finance_model === 'savings').length

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="space-y-8">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Veículos</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Gestão de frota e contratos</h2>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/25"
          >
            <PlusCircle size={18} />
            Novo veículo
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Veículos alugados" value={rentedCount} icon={<CarFront size={18} />} />
          <SummaryCard label="Veículos disponíveis" value={availableCount} icon={<CarFront size={18} />} />
          <SummaryCard label="Alternância entre sócios" value={partnersCount} icon={<CarFront size={18} />} />
          <SummaryCard label="Fundo do veículo" value={savingsCount} icon={<CarFront size={18} />} />
        </div>
      </div>

      <div className="space-y-6">
        <VehicleFilters
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          financeFilter={financeFilter}
          setFinanceFilter={setFinanceFilter}
        />

        {error ? (
          <div className="rounded-[28px] border border-rose-500/30 bg-rose-500/10 p-6 text-slate-100">
            <p className="text-lg font-semibold text-rose-100">Falha ao carregar os veículos</p>
            <p className="mt-3 text-sm text-rose-200">{error}</p>
          </div>
        ) : null}

        {!error && vehicles.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center shadow-lg shadow-black/20">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
              <AlertTriangle size={20} />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Nenhum veículo encontrado</h3>
            <p className="mt-2 text-sm text-slate-400">Ajuste os filtros ou cadastre um novo veículo para começar.</p>
          </div>
        ) : null}

        {!error && vehicles.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} onEdit={handleEdit} onDelete={requestDelete} />
            ))}
          </div>
        ) : null}
      </div>

      <VehicleForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingVehicle(null)
        }}
        onSubmit={handleSubmit}
        vehicle={editingVehicle}
        loading={submitting}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir veículo"
        message={`Tem certeza que deseja remover ${selectedVehicle?.plate || 'este veículo'}? Esta ação também será registrada na auditoria.`}
        onCancel={() => {
          setConfirmOpen(false)
          setSelectedVehicle(null)
        }}
        onConfirm={handleDelete}
      />
    </div>
  )
}
