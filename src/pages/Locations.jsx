import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, FileText, PlusCircle, Search, ShieldCheck, Truck, Wallet } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import Toast from '../components/Toast.jsx'
import { createLocation, endLocation, listLocations, updateLocation } from '../services/locationsService.js'
import { formatCurrency, formatDate, normalizeLocationStatus } from '../services/locationLogic.js'
import { supabase } from '../lib/supabaseClient.js'

function LocationCard({ location, onView, onEdit, onEnd, onGenerateContract }) {
  return (
    <article className="rounded-[30px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">{location.vehicle_plate || 'Sem placa'}</p>
          <h3 className="mt-3 text-xl font-semibold text-white">{location.vehicle_model || 'Modelo não informado'}</h3>
        </div>
        <span className="inline-flex w-fit rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">
          {normalizeLocationStatus(location.status)}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Locatário</p>
            <p className="mt-2 text-base font-medium text-white">{location.tenant_name || 'Sem locatário'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Data início</p>
            <p className="mt-2 text-base font-medium text-white">{formatDate(location.start_date)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Valor semanal</p>
            <p className="mt-2 text-base font-medium text-white">{formatCurrency(location.weekly_rent)}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Próximo vencimento</p>
            <p className="mt-2 text-base font-medium text-white">{formatDate(location.next_payment)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Modelo financeiro</p>
            <p className="mt-2 text-base font-medium text-white">{location.finance_model === 'partners' ? 'Alternância entre sócios' : 'Fundo do veículo'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Caução</p>
            <p className="mt-2 text-base font-medium text-white">{formatCurrency(location.deposit)}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => onView(location)} className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-200">
          Visualizar
        </button>
        <button type="button" onClick={() => onEdit(location)} className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm font-medium text-amber-200">
          Editar
        </button>
        <button type="button" onClick={() => onEnd(location)} className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200">
          Encerrar
        </button>
        <button type="button" onClick={() => onGenerateContract(location)} className="rounded-2xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-200">
          Gerar contrato
        </button>
      </div>
    </article>
  )
}

export default function Locations() {
  const navigate = useNavigate()
  const [locations, setLocations] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [tenants, setTenants] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [financeFilter, setFinanceFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [form, setForm] = useState({
    vehicle_id: '',
    vehicle_plate: '',
    vehicle_model: '',
    tenant_name: '',
    start_date: '',
    weekly_rent: '',
    deposit: '',
    weeks: '',
    observations: '',
    finance_model: 'partners',
  })

  const loadData = async () => {
    const [locationsResponse, vehiclesResponse] = await Promise.all([listLocations(), supabase.from('vehicles').select('*').order('created_at', { ascending: false })])

    if (locationsResponse.error) {
      setToast({ message: locationsResponse.error.message || 'Falha ao carregar locações.', type: 'error' })
    }

    const vehiclesData = vehiclesResponse.data ?? []
    setVehicles(vehiclesData)

    const tenantNames = Array.from(new Set(vehiclesData.map((vehicle) => vehicle.tenant_name).filter(Boolean)))
    setTenants(tenantNames)
    setLocations(locationsResponse.data ?? [])
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      const query = search.trim().toLowerCase()
      const matchesSearch = !query || [location.vehicle_plate, location.vehicle_model, location.tenant_name, location.status].join(' ').toLowerCase().includes(query)
      const matchesStatus = !statusFilter || normalizeLocationStatus(location.status) === statusFilter
      const matchesFinance = !financeFilter || location.finance_model === financeFilter
      return matchesSearch && matchesStatus && matchesFinance
    })
  }, [locations, search, statusFilter, financeFilter])

  const openCreate = () => {
    setSelectedLocation(null)
    setForm({
      vehicle_id: '',
      vehicle_plate: '',
      vehicle_model: '',
      tenant_name: '',
      start_date: '',
      weekly_rent: '',
      deposit: '',
      weeks: '',
      observations: '',
      finance_model: 'partners',
    })
    setFormOpen(true)
  }

  const openEdit = (location) => {
    setSelectedLocation(location)
    setForm({
      vehicle_id: location.vehicle_id,
      vehicle_plate: location.vehicle_plate,
      vehicle_model: location.vehicle_model,
      tenant_name: location.tenant_name,
      start_date: location.start_date,
      weekly_rent: location.weekly_rent,
      deposit: location.deposit,
      weeks: location.weeks,
      observations: location.observations,
      finance_model: location.finance_model,
    })
    setFormOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)

    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === form.vehicle_id)
    const payload = {
      vehicle_id: form.vehicle_id,
      vehicle_plate: selectedVehicle?.plate || form.vehicle_plate,
      vehicle_model: selectedVehicle?.model || form.vehicle_model,
      tenant_name: form.tenant_name,
      start_date: form.start_date,
      weekly_rent: form.weekly_rent,
      deposit: form.deposit,
      weeks: form.weeks,
      observations: form.observations,
      finance_model: form.finance_model,
    }

    const { data, error } = selectedLocation
      ? await updateLocation(selectedLocation.id, payload)
      : await createLocation(payload)

    if (error) {
      setToast({ message: error.message || 'Não foi possível salvar a locação.', type: 'error' })
    } else {
      setToast({ message: selectedLocation ? 'Locação atualizada com sucesso.' : 'Locação criada com sucesso.', type: 'success' })
      setFormOpen(false)
      setSelectedLocation(null)
      await loadData()
    }

    setSubmitting(false)
  }

  const requestEnd = (location) => {
    setSelectedLocation(location)
    setConfirmOpen(true)
  }

  const handleEnd = async () => {
    if (!selectedLocation) {
      return
    }

    const { error } = await endLocation(selectedLocation.id)

    if (error) {
      setToast({ message: error.message || 'Não foi possível encerrar a locação.', type: 'error' })
    } else {
      setToast({ message: 'Locação encerrada com sucesso.', type: 'success' })
      await loadData()
    }

    setConfirmOpen(false)
    setSelectedLocation(null)
  }

  const handleGenerateContract = (location) => {
    navigate('/contracts', { state: { fromLocation: location } })
  }

  const activeCount = locations.filter((location) => normalizeLocationStatus(location.status) === 'Ativa').length
  const finishedCount = locations.filter((location) => normalizeLocationStatus(location.status) === 'Finalizada').length
  const cancelledCount = locations.filter((location) => normalizeLocationStatus(location.status) === 'Cancelada').length

  return (
    <div className="space-y-8">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <section className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Locações</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Gerencie todos os contratos ativos da frota.</h2>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/25">
            <PlusCircle size={18} />
            Nova Locação
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Ativas</p>
              <Truck size={18} className="text-amber-300" />
            </div>
            <p className="mt-5 text-3xl font-semibold text-white">{activeCount}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Finalizadas</p>
              <FileText size={18} className="text-amber-300" />
            </div>
            <p className="mt-5 text-3xl font-semibold text-white">{finishedCount}</p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Canceladas</p>
              <ShieldCheck size={18} className="text-amber-300" />
            </div>
            <p className="mt-5 text-3xl font-semibold text-white">{cancelledCount}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="flex-1">
            <span className="mb-2 block text-sm uppercase tracking-[0.35em] text-slate-500">Pesquisar</span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
              <Search size={18} className="text-amber-300" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por placa, modelo ou locatário" className="w-full bg-transparent text-sm text-white outline-none" />
            </div>
          </label>

          <label>
            <span className="mb-2 block text-sm uppercase tracking-[0.35em] text-slate-500">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
              <option value="">Todos</option>
              <option value="Ativa">Ativa</option>
              <option value="Finalizada">Finalizada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm uppercase tracking-[0.35em] text-slate-500">Modelo financeiro</span>
            <select value={financeFilter} onChange={(event) => setFinanceFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
              <option value="">Todos</option>
              <option value="partners">Alternância entre sócios</option>
              <option value="savings">Fundo do veículo</option>
            </select>
          </label>
        </div>
      </section>

      {filteredLocations.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center shadow-lg shadow-black/20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
            <AlertTriangle size={20} />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">Nenhuma locação encontrada</h3>
          <p className="mt-2 text-sm text-slate-400">Ajuste os filtros ou crie uma nova locação para começar.</p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredLocations.map((location) => (
            <LocationCard key={location.id} location={location} onView={(item) => { setSelectedLocation(item); setViewOpen(true) }} onEdit={openEdit} onEnd={requestEnd} onGenerateContract={handleGenerateContract} />
          ))}
        </div>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6">
          <div className="w-full max-w-3xl overflow-y-auto rounded-[32px] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Nova locação</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{selectedLocation ? 'Editar locação' : 'Criar locação'}</h3>
              </div>
              <button type="button" onClick={() => { setFormOpen(false); setSelectedLocation(null) }} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300">Fechar</button>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 grid gap-6 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Veículo</span>
                <select value={form.vehicle_id} onChange={(event) => {
                  const chosenVehicle = vehicles.find((vehicle) => vehicle.id === event.target.value)
                  setForm((current) => ({ ...current, vehicle_id: event.target.value, vehicle_plate: chosenVehicle?.plate || '', vehicle_model: chosenVehicle?.model || '' }))
                }} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" required>
                  <option value="">Selecione um veículo</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} - {vehicle.model}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Locatário</span>
                <input list="tenant-list" value={form.tenant_name} onChange={(event) => setForm((current) => ({ ...current, tenant_name: event.target.value }))} placeholder="Nome do locatário" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" required />
                <datalist id="tenant-list">
                  {tenants.map((tenant) => <option key={tenant} value={tenant} />)}
                </datalist>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Data início</span>
                <input type="date" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" required />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Valor semanal</span>
                <input type="number" min="0" step="0.01" value={form.weekly_rent} onChange={(event) => setForm((current) => ({ ...current, weekly_rent: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" required />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Caução</span>
                <input type="number" min="0" step="0.01" value={form.deposit} onChange={(event) => setForm((current) => ({ ...current, deposit: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Quantidade de semanas</span>
                <input type="number" min="1" value={form.weeks} onChange={(event) => setForm((current) => ({ ...current, weeks: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-300">Modelo financeiro</span>
                <select value={form.finance_model} onChange={(event) => setForm((current) => ({ ...current, finance_model: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none">
                  <option value="partners">Alternância entre sócios</option>
                  <option value="savings">Fundo do veículo</option>
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-300">Observações</span>
                <textarea value={form.observations} onChange={(event) => setForm((current) => ({ ...current, observations: event.target.value }))} rows="4" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none" />
              </label>

              <div className="md:col-span-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => { setFormOpen(false); setSelectedLocation(null) }} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200">Cancelar</button>
                <button type="submit" disabled={submitting} className="rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200">
                  {submitting ? 'Salvando…' : 'Criar locação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {viewOpen && selectedLocation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Detalhes da locação</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{selectedLocation.vehicle_plate || 'Locação'}</h3>
              </div>
              <button type="button" onClick={() => setViewOpen(false)} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300">Fechar</button>
            </div>

            <div className="mt-8 space-y-6">
              <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Dados do veículo</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Placa</p>
                    <p className="mt-2 text-base font-medium text-white">{selectedLocation.vehicle_plate || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Modelo</p>
                    <p className="mt-2 text-base font-medium text-white">{selectedLocation.vehicle_model || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Dados do locatário</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Nome</p>
                    <p className="mt-2 text-base font-medium text-white">{selectedLocation.tenant_name || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Status</p>
                    <p className="mt-2 text-base font-medium text-white">{normalizeLocationStatus(selectedLocation.status)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Valores e datas</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Valor semanal</p>
                    <p className="mt-2 text-base font-medium text-white">{formatCurrency(selectedLocation.weekly_rent)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Valor da caução</p>
                    <p className="mt-2 text-base font-medium text-white">{formatCurrency(selectedLocation.deposit)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Data início</p>
                    <p className="mt-2 text-base font-medium text-white">{formatDate(selectedLocation.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Modelo financeiro</p>
                    <p className="mt-2 text-base font-medium text-white">{selectedLocation.finance_model === 'partners' ? 'Alternância entre sócios' : 'Fundo do veículo'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Observações</p>
                <p className="mt-4 text-sm leading-7 text-slate-300">{selectedLocation.observations || 'Nenhuma observação registrada.'}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Encerrar locação"
        message={`Tem certeza que deseja encerrar ${selectedLocation?.vehicle_plate || 'esta locação'}? O status será atualizado para Finalizada e o veículo ficará disponível.`}
        onCancel={() => { setConfirmOpen(false); setSelectedLocation(null) }}
        onConfirm={handleEnd}
      />
    </div>
  )
}
